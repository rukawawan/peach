"""qBittorrent 本地下载：通过 Web API v2 提交并跟踪磁力任务。

Peach 与 qBittorrent 可以在不同机器。这里只负责提交与查询，文件落在下载器那台
机器上；下载完成后由下载对账的落地流程按「下载器保存目录 → 媒体库目录」的映射
登记进账本。凭据只存本机 `CredentialStore`，不进 URL、日志与 ledger。

状态口径与云端 provider 一致：在跑、完成、失败、列表里找不到。qB 的完成态包括
`uploading`、`stalledUP` 等做种状态；`moving` 仍算在跑，等文件真正落到保存目录。
"""
from __future__ import annotations

from pathlib import PurePosixPath

import httpx

from . import interface_text
from .downloads import (
    DONE, ERROR, MISSING, RUNNING, DownloadError, DownloadTask, Magnet, Problem, RemoteStatus,
    clean_address, normalise_local_target, problem_codes,
)
from .user_messages import UserFacingError

#: 单次 HTTP 调用的上限。qB 在局域网内通常几十毫秒返回。
CALL_TIMEOUT = 15.0
#: 文件已就位的做种状态；移动、校验和恢复检查仍需等待。
COMPLETED_STATES = frozenset({
    "uploading", "stalledUP", "queuedUP", "pausedUP", "stoppedUP", "forcedUP",
})
#: 失败态：qB 自己报告的错误。
FAILED_STATES = frozenset({"error", "missingFiles"})
#: 调用动作 id：失败句子里的 `{{action}}` 按 `labels.downloadsQbittorrent.action.<id>` 取显示名。
CALL_ACTIONS = frozenset({
    "login", "readVersion", "readWebapiVersion", "readPreferences", "readTorrents",
    "addTorrent", "deleteTorrent",
})


def _action_label(action: str) -> dict | str:
    return {"code": f"labels.downloadsQbittorrent.action.{action}"} if action in CALL_ACTIONS else action


def _add_problem(report: dict, problem: Problem) -> None:
    report["problems"].append(problem)
    report.setdefault("problem_codes", []).extend(problem_codes([problem]))


def _content_name(item: dict) -> str:
    """按真实内容路径定位文件；qB 的显示名称可以单独改名。"""
    target = str(item.get("save_path") or "")
    content = str(item.get("content_path") or "")
    if not content:
        return str(item.get("name") or "")
    try:
        root = PurePosixPath(normalise_local_target(target))
        path = PurePosixPath(normalise_local_target(content))
        relative = path.relative_to(root)
        if not relative.parts:
            raise ValueError("content is the download root")
    except ValueError:
        raise DownloadError("mismatch", "errors.downloads.localTargetMismatch",
                            {"target": content, "root": target}) from None
    return str(relative)


def _status(item: dict | None) -> RemoteStatus:
    """把 `torrents/info` 的一行翻成统一状态。"""
    if not item:
        return RemoteStatus(MISSING)
    info_hash = str(item.get("hash") or "").lower()
    state = str(item.get("state") or "")
    name = _content_name(item) if state in COMPLETED_STATES else str(item.get("name") or "")
    target = str(item.get("save_path") or "")
    try:
        progress = max(0.0, min(float(item.get("progress") or 0.0), 1.0))
    except (TypeError, ValueError):
        progress = 0.0
    if state in FAILED_STATES:
        code = "errors.downloadsQbittorrent.taskFailed"
        return RemoteStatus(ERROR, info_hash, name, progress,
                            interface_text.text(f"server:{code}", {"state": state}),
                            message_code=code, message_params={"state": state})
    if state in COMPLETED_STATES:
        return RemoteStatus(DONE, info_hash, name, 1.0, target=target)
    return RemoteStatus(RUNNING, info_hash, name, progress, target=target)


class QbittorrentClient:
    """带登录 Cookie 的 qB Web API v2 客户端。每次操作新建连接，用完就关。"""

    def __init__(self, address: str, username: str, password: str, *,
                 transport: httpx.BaseTransport | None = None,
                 timeout: float = CALL_TIMEOUT):
        try:
            self.address = clean_address(address, "qBittorrent")
        except UserFacingError as error:
            raise DownloadError("config", error.code, error.params) from None
        if not self.address:
            raise DownloadError("config", "errors.downloadsQbittorrent.addressMissing")
        if not username or not password:
            raise DownloadError("config", "errors.downloadsQbittorrent.credentialsMissing")
        self.username, self.password = username, password
        self.transport, self.timeout = transport, timeout
        self._http: httpx.Client | None = None

    def __enter__(self) -> "QbittorrentClient":
        # qBittorrent 是本机或局域网里的下载器，直连它，不读系统代理。
        self._http = httpx.Client(
            base_url=self.address, transport=self.transport, timeout=self.timeout,
            follow_redirects=False, trust_env=False,
            headers={"Referer": self.address, "Origin": self.address})
        try:
            self._login()
        except BaseException:
            self._http.close()
            self._http = None
            raise
        return self

    def __exit__(self, *_exc) -> None:
        if self._http is not None:
            self._http.close()
            self._http = None

    @property
    def http(self) -> httpx.Client:
        if self._http is None:
            raise RuntimeError("qBittorrent client is not open")
        return self._http

    def _request(self, method: str, path: str, *, action: str, **kwargs) -> httpx.Response:
        try:
            response = self.http.request(method, path, **kwargs)
        except httpx.HTTPError as error:
            raise DownloadError("network", "errors.downloadsQbittorrent.unreachable",
                                {"action": _action_label(action), "details": str(error)}) from None
        if response.status_code == 403:
            raise DownloadError("config", "errors.downloadsQbittorrent.forbidden",
                                {"action": _action_label(action)})
        if response.status_code == 404:
            raise DownloadError("config", "errors.downloadsQbittorrent.apiNotFound",
                                {"action": _action_label(action)})
        if response.status_code >= 500:
            raise DownloadError("network", "errors.downloadsQbittorrent.serverError",
                                {"action": _action_label(action), "status": response.status_code})
        if response.status_code >= 400:
            detail = response.text.strip()[:200]
            raise DownloadError("rejected", "errors.downloadsQbittorrent.rejected",
                                {"action": _action_label(action), "status": response.status_code,
                                 "details": detail})
        return response

    def _json(self, response: httpx.Response, action: str):
        try:
            return response.json()
        except ValueError:
            raise DownloadError("config", "errors.downloadsQbittorrent.badJson",
                                {"action": _action_label(action)}) from None

    def _login(self) -> None:
        response = self._request(
            "POST", "/api/v2/auth/login", action="login",
            data={"username": self.username, "password": self.password})
        if response.text.strip().casefold().rstrip(".") != "ok":
            raise DownloadError("config", "errors.downloadsQbittorrent.loginFailed")

    def version(self) -> str:
        response = self._request("GET", "/api/v2/app/version", action="readVersion")
        return response.text.strip()

    def webapi_version(self) -> str:
        response = self._request(
            "GET", "/api/v2/app/webapiVersion", action="readWebapiVersion")
        return response.text.strip()

    def preferences(self) -> dict:
        response = self._request("GET", "/api/v2/app/preferences", action="readPreferences")
        data = self._json(response, "readPreferences")
        return data if isinstance(data, dict) else {}

    def torrent(self, info_hash: str) -> dict | None:
        response = self._request(
            "GET", "/api/v2/torrents/info", action="readTorrents",
            params={"hashes": info_hash})
        rows = self._json(response, "readTorrents")
        return rows[0] if isinstance(rows, list) and rows else None

    def add(self, magnet: Magnet, target: str) -> None:
        response = self._request(
            "POST", "/api/v2/torrents/add", action="addTorrent",
            data={
                "urls": magnet.uri, "savepath": target, "autoTMM": "false",
                "tags": "peach", "paused": "false", "stopped": "false",
                "contentLayout": "Original",
            })
        body = response.text.strip()
        if body.casefold().startswith("fails"):
            raise DownloadError("rejected", "errors.downloadsQbittorrent.addRejected")

    def delete(self, info_hash: str) -> None:
        self._request(
            "POST", "/api/v2/torrents/delete", action="deleteTorrent",
            data={"hashes": info_hash, "deleteFiles": "false"})


class QbittorrentProvider:
    """`downloads.OfflineProvider` 的 qBittorrent 实现。"""

    key = "qbittorrent"

    def __init__(self, address: str, username: str, password: str, *,
                 transport: httpx.BaseTransport | None = None):
        self.address, self.username, self.password = address, username, password
        self.transport = transport

    def client(self) -> QbittorrentClient:
        return QbittorrentClient(self.address, self.username, self.password,
                                 transport=self.transport)

    def submit(self, magnet: Magnet, target: str) -> RemoteStatus:
        try:
            target = normalise_local_target(target)
        except UserFacingError as error:
            raise DownloadError("config", error.code, error.params) from None
        with self.client() as client:
            existing = client.torrent(magnet.info_hash)
            if existing is not None:
                status = _status(existing)
                if status.state != ERROR:
                    return RemoteStatus(status.state, status.remote_id, status.name,
                                        status.progress, adopted=True,
                                        target=str(existing.get("save_path") or ""))
                # qB 会保留失败任务；同一个 infohash 再提交前先清掉旧行。
                client.delete(magnet.info_hash)
            client.add(magnet, target)
        return RemoteStatus(RUNNING, name=magnet.name)

    def status(self, task: DownloadTask) -> RemoteStatus:
        info_hash = task.info_hash or task.remote_id or ""
        if not info_hash:
            return RemoteStatus(MISSING)
        with self.client() as client:
            return _status(client.torrent(info_hash))

    def landed(self, task: DownloadTask) -> bool:
        return self.status(task).state == DONE

    def cancel(self, task: DownloadTask) -> None:
        info_hash = task.info_hash or task.remote_id or ""
        if not info_hash:
            raise DownloadError("config", "errors.downloadsQbittorrent.cancelNoInfohash")
        with self.client() as client:
            client.delete(info_hash)


def check(address: str, username: str, password: str, *,
          transport: httpx.BaseTransport | None = None) -> dict:
    """设置页「检查」：登录、读版本和默认保存目录，不提交任务。"""
    report = {"ok": False, "address": str(address or "").strip(), "version": "",
              "webapi_version": "", "save_path": "", "problems": [], "problem_codes": []}
    if not report["address"]:
        _add_problem(report, Problem("labels.downloadsQbittorrent.addressMissing"))
        return report
    if not username or not password:
        _add_problem(report, Problem("labels.downloadsQbittorrent.credentialsMissing"))
        return report
    try:
        with QbittorrentClient(address, username, password, transport=transport) as client:
            report["address"] = client.address
            report["version"] = client.version()
            report["webapi_version"] = client.webapi_version()
            try:
                report["save_path"] = str(client.preferences().get("save_path") or "")
            except DownloadError as error:
                _add_problem(report, Problem("labels.downloadsQbittorrent.savePathUnavailable",
                                             {"details": {"code": error.code, "params": error.params}}))
            report["ok"] = True
    except DownloadError as error:
        _add_problem(report, Problem.of(error))
    return report
