"""从媒体库路径与网盘能力生成可提交云下载的渠道。"""
from __future__ import annotations

import hashlib
import threading
import time
from pathlib import PureWindowsPath

from google.protobuf.empty_pb2 import Empty

from .downloads import (
    CLOUDDRIVE_CREDENTIAL, PIKPAK_CREDENTIAL, QBITTORRENT_CREDENTIAL, DownloadError, Problem,
)
from .downloads_clouddrive import CloudDriveClient, PROBE_TIMEOUT, legacy_cloud_path, token_path, within_token_root
from .media_sources import SOURCES
from .clouddrive_proxy import media_remote_path
from .push_discovery import normalise_prefix
from .follow_secrets import CredentialError
from .error_reporting import local_event, redact
from .user_messages import nested_message


def root_key(value):
    return str(PureWindowsPath(value)).rstrip("\\").casefold()


def _probe_failure(error: DownloadError, token: str) -> DownloadError:
    """保存探测原因前先清理远端返回的细节，令牌仅用于 RPC。"""
    params = dict(error.params)
    if isinstance(details := params.get("details"), str):
        params["details"] = redact(details.replace(token, "<credential>"))
    return DownloadError(error.failure, error.code, params, channel_down=error.channel_down)


class LibraryChannels:
    """能力只读探测，缓存随媒体路径、下载设置和凭据变化失效。"""

    def __init__(self, service, names, *, client=CloudDriveClient, clock=time.monotonic):
        self.service, self.names, self.client, self.clock = service, names, client, clock
        self._lock = threading.Lock()
        self._cached = None

    def __call__(self):
        service = self.service
        config = service.config
        roots = {root_key(root): (location, root)
                 for location, values in service.landing.declared_roots.items() for root in values
                 if location in SOURCES and SOURCES[location].cloud}
        prefixes = tuple(getattr(getattr(service.landing.push_discovery, "config", None), "prefixes", ()))
        names = {root_key(root): name for root, name in self.names().items()}
        problems = []
        try:
            cloud = service.credentials.load(CLOUDDRIVE_CREDENTIAL)
        except CredentialError:
            cloud = None
            problems.append(Problem("labels.downloadsChannels.clouddriveTokenUnreadable"))
        token = str(cloud.values.get("token", "")) if cloud else ""
        try:
            pikpak = service.credentials.describe(PIKPAK_CREDENTIAL)
        except CredentialError:
            pikpak = {"fields": []}
            problems.append(Problem("labels.downloadsChannels.pikpakSignInUnreadable"))
        logged_in = "refresh_token" in pikpak["fields"]
        try:
            qb = service.credentials.load(QBITTORRENT_CREDENTIAL)
        except CredentialError:
            qb = None
        qb_values = dict(qb.values) if qb else {}
        qb_secret = (str(qb_values.get("username", "")) + "\0" + str(qb_values.get("password", ""))).encode()
        fingerprint = (repr(config.payload()), repr(roots), repr(prefixes), repr(names),
                       repr(getattr(service.landing, "mounts", {})), logged_in,
                       hashlib.sha256(token.encode()).digest(),
                       hashlib.sha256(qb_secret).digest(), tuple(problems))
        with self._lock:
            now = self.clock()
            if self._cached and self._cached[0] == fingerprint and now - self._cached[1] < 30:
                return self._cached[2]
            result = self._discover(config, roots, prefixes, names, token, logged_in)
            result["problems"] = list(dict.fromkeys((*problems, *result["problems"])))
            self._cached = fingerprint, now, result
            return result

    def _discover(self, config, roots, prefixes, names, token, logged_in):
        rows, problems = [], []
        channel_errors = {}
        direct_root = roots.get(root_key(config.pikpak_root)) if config.pikpak_root else None
        if logged_in and direct_root and direct_root[0] == "pikpak" and config.targets.get("pikpak"):
            rows.append(self._row("pikpak", "pikpak", direct_root[1], config.targets["pikpak"], names))
        if roots and config.clouddrive_address and token:
            phase = 'connect'
            try:
                with self.client(config.clouddrive_address, token, timeout=PROBE_TIMEOUT) as client:
                    phase = 'token_permissions'
                    info = client.token_info()
                    permissions = info.permissions
                    if not (permissions.allow_add_offline_download and permissions.allow_list_offline_downloads):
                        error = DownloadError("config", "labels.downloadsChannels.tokenNeedsOffline")
                        channel_errors["clouddrive"] = error
                        problems.append(Problem.of(error))
                    else:
                        mounts = []
                        if getattr(permissions, "allow_get_mounts", False):
                            try:
                                mounts = client.call("GetMountPoints", Empty(), "readLibraryMounts").mountPoints
                            except DownloadError as error:
                                local_event('download-channel-probe', error, operation='mount_points',
                                            source='clouddrive', failure=error.failure)
                        phase = 'library_mapping'
                        token_root = getattr(info, "rootDir", "") or "/"
                        candidates = self._candidates(config, token_root, roots, prefixes, mounts,
                                                      rows, names, problems)
                        seen = set()
                        upgrades = {}
                        for key, mapping_key, source, root, target, prefix, confirm_saved in candidates:
                            if key in seen:
                                continue
                            seen.add(key)
                            try:
                                folder = client.folder(target)
                                if folder.can_offline:
                                    row = self._row(key, source, root, target, names, cloud_root=prefix,
                                                    can_cancel=folder.can_manage and bool(
                                                        permissions.allow_modify_offline_downloads))
                                    if key != mapping_key:
                                        row["legacy_key"] = mapping_key
                                    rows.append(row)
                                    if confirm_saved:
                                        upgrades[source] = target
                                else:
                                    channel_errors[key] = DownloadError(
                                        "config", "errors.downloadsClouddrive.offlineUnsupported", {"target": target})
                            except DownloadError as error:
                                safe_error = _probe_failure(error, token)
                                channel_errors[key] = safe_error
                                local_event('download-channel-probe', error, operation='folder_capabilities',
                                            source=source, failure=error.failure)
                                name = names.get(root_key(root)) or SOURCES[source].name
                                problems.append(Problem("labels.downloadsChannels.libraryCapabilityCheckFailed",
                                                        {"name": name, "reason": nested_message(safe_error)}))
                        if upgrades:
                            try:
                                self.service.upgrade_cloud_targets(config, upgrades)
                            except OSError as error:
                                local_event('download-channel-probe', error, operation='upgrade_targets',
                                            source='clouddrive')
            except DownloadError as error:
                safe_error = _probe_failure(error, token)
                channel_errors["clouddrive"] = safe_error
                local_event('download-channel-probe', error, operation=phase,
                            source='clouddrive', failure=error.failure)
                problems.append(Problem.of(safe_error))
        qb = self._qbittorrent(config, problems)
        if qb is not None:
            rows.append(self._row(
                "qbittorrent", "local", config.qbittorrent_media_root,
                config.qbittorrent_save_path, names, kind="local",
                local_root=config.qbittorrent_save_path))
        return {"providers": rows, "problems": list(dict.fromkeys(problems)), "channel_errors": channel_errors}

    def _qbittorrent(self, config, problems):
        """配置和凭据齐全就给出渠道；不在每次列表轮询里登录。

        qB 对连续失败登录会封禁来源，活动页每几秒取一次任务列表，渠道探测不能拿
        用户填错的密码反复试。实际连通性由设置页的「检查」按用户动作验证一次。
        """
        if not (config.qbittorrent_address and config.qbittorrent_save_path
                and config.qbittorrent_media_root):
            return None
        try:
            values = self.service.credentials.load(QBITTORRENT_CREDENTIAL)
        except CredentialError:
            problems.append(Problem("labels.downloadsChannels.qbittorrentCredentialsUnreadable"))
            return None
        values = dict(values.values) if values else {}
        if not str(values.get("username", "")) or not str(values.get("password", "")):
            problems.append(Problem("labels.downloadsChannels.qbittorrentCredentialsMissing"))
            return None
        return True

    def _candidates(self, config, token_root, roots, prefixes, mounts, direct, names, problems):
        candidates = []
        landing = self.service.landing
        for source, root in roots.values():
            if any(root_key(row["root"]) == root_key(root) for row in direct):
                continue
            index = list(landing.declared_roots[source]).index(root)
            mapped = getattr(landing, "mounts", {}).get(source, ())
            mount = mapped[index] if index < len(mapped) else root
            remote = media_remote_path(root, mount, prefixes, mounts)
            if not remote:
                problems.append(Problem("labels.downloadsChannels.libraryNotMapped",
                                         {"name": names.get(root_key(root)) or SOURCES[source].name}))
                continue
            raw_prefix = prefix = normalise_prefix(remote)
            saved = config.targets.get(source, "")
            old_target = (legacy_cloud_path(token_root, saved)
                          if source in config.legacy_cloud_targets and within_token_root(token_root, saved) == saved
                          else None)
            relative_prefix = legacy_cloud_path(token_root, prefix)
            if relative_prefix and within_token_root(token_root, prefix) == prefix and (
                    (saved and token_path(token_root, saved) is not None
                     and token_path(relative_prefix, saved) is not None)
                    or (old_target and token_path(prefix, saved) is not None)):
                prefix = relative_prefix
            upgrade = bool(old_target and token_path(prefix, old_target) is not None)
            target = old_target if upgrade else saved
            use_saved = bool(target and token_path(prefix, target) is not None)
            target = target if use_saved else prefix
            verified_setting = use_saved and source in config.legacy_cloud_targets and (
                token_path(token_root, target) is not None)
            digest = hashlib.sha256((raw_prefix + "\0" + root_key(root)).encode()).hexdigest()[:16]
            mapping_key = f"clouddrive:{source}:{digest}"
            key = "115" if source == "115" and use_saved else mapping_key
            candidates.append((key, mapping_key, source, root, within_token_root(token_root, target), prefix,
                               verified_setting))
        return candidates

    @staticmethod
    def _row(key, source, root, target, names, *, cloud_root="", can_cancel=True,
             kind="cloud", local_root=""):
        from . import media_identity, settings_file
        name = names.get(root_key(root)) or PureWindowsPath(root).name or root
        if key == "qbittorrent":
            label = f"{name} · qBittorrent"
        else:
            label = name if name == SOURCES[source].name else f"{name} · {SOURCES[source].name}"
        return {"key": key, "source": source, "label": label, "configured": True,
                "target": target, "root": root, "cloud_root": cloud_root,
                "kind": kind, "local_root": local_root, "can_cancel": can_cancel,
                **media_identity.ownership(settings_file.active(), root)}
