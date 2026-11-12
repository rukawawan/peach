"""Peach 的唯一 Media Engine：按 asset id 解析本机与挂载来源的文件。"""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path, PureWindowsPath
from stat import S_ISREG
from time import monotonic
from typing import Sequence

from .platform import (
    is_unmapped,
    is_windows_path,
    root_online,
    translate_ledger_path,
    within_root,
)
from .repository import LedgerRepository, MediaAsset
from .segments import HLS_SEGMENT_SECONDS


def normalized_path(path: Path | str) -> Path:
    """账本路径翻译成本机可开的绝对路径，越界判断以它为准。

    Windows 只做 `abspath`，不做 `resolve()`：PikPak 的 A: 是 WinFsp 映射的网络驱动器，
    `resolve()` 会逐级向重定向器问最终路径，一条文件路径要 7 秒，得到的还是
    `\\\\CloudDrive-…\\Pikpak\\…` 这种 UNC 形态，之后每次 stat 或 open 再各花 7 到 14 秒，
    而同一个文件走盘符只要 1 毫秒。盘符路径本身就是绝对路径，`..` 由 `abspath` 折掉。
    macOS 仍要 `resolve()`：`/var` 是 `/private/var` 的软链，挂载点的大小写也靠它对齐。
    """
    from .smb_media import resolve
    remote = resolve(path)
    if remote is not None:
        return remote
    candidate = translate_ledger_path(path)
    if os.name == "nt":
        return Path(os.path.abspath(os.fspath(candidate)))
    try:
        return candidate.resolve()
    except OSError:
        return Path(os.path.abspath(os.fspath(candidate)))


CASE_MATCH_TTL_SECONDS = 5.0


@lru_cache(maxsize=512)
def _cached_case_insensitive_match(
    parent_key: str, name_key: str, _ttl_bucket: int,
) -> str | None:
    """同目录大小写不敏感匹配；只为大小写敏感的挂载层（CloudDrive/APFS）兜底。

    NTFS 上 `Path.is_file()` 已不区分大小写，正常情况不会走到这里。
    结果按 (parent, name) 缓存，避免同一目录反复 scandir。
    """
    target = name_key.casefold()
    try:
        with os.scandir(parent_key) as entries:
            for entry in entries:
                if entry.is_file() and entry.name.casefold() == target:
                    return entry.name
    except OSError:
        return None
    return None


def _case_insensitive_match(parent_key: str, name_key: str) -> str | None:
    """Cache scans briefly without pinning misses or stale names forever."""
    bucket = int(monotonic() // CASE_MATCH_TTL_SECONDS)
    return _cached_case_insensitive_match(parent_key, name_key, bucket)


def resolve_case_insensitive(path: Path | str) -> str:
    """返回可直接打开的实际路径：原路径不存在时按大小写不敏感匹配同目录文件。"""
    # 批处理脚本直接调用本函数，不经过 FilesystemBackend；因此这里也必须先把账本的
    # Windows 盘符翻译成本机挂载点，否则 macOS 会把 `A:\\...` 当成相对文件名。
    from .smb_media import resolve, input_url
    remote = resolve(path)
    if remote is not None:
        return input_url(remote)
    candidate = normalized_path(path)
    if candidate.is_file():
        return str(candidate)
    matched = _case_insensitive_match(str(candidate.parent), candidate.name)
    if matched is not None:
        return str(candidate.parent / matched)
    return str(candidate)


@dataclass(frozen=True)
class StreamPlan:
    """协议层播放计划；来源层决定是否值得切到短分片。"""

    protocol: str
    mime_type: str
    segment_seconds: int | None = None
    reason: str = ""


class MediaNotFound(RuntimeError):
    pass


class MediaUnavailable(RuntimeError):
    pass


class MediaOffline(MediaUnavailable):
    """来源盘整体不可达（脱盘），不是这一个文件缺失。

    脱盘只影响挂在该盘上的资产：本地硬盘拔掉时，115/PikPak 的云端资产照常可播。
    """

    def __init__(self, asset_id: int, source: str):
        super().__init__(asset_id)
        self.asset_id = asset_id
        self.source = source
        self.root_id = ""


class FilesystemBackend:
    """原生文件 backend；路径授权和存在性检查集中在这里。"""

    name = "filesystem"

    def __init__(
        self,
        allowed_roots: Sequence[Path],
        snapshot_root: Path,
    ):
        self.allowed_roots = tuple(normalized_path(root) for root in allowed_roots)
        self.snapshot_root = normalized_path(snapshot_root)

    def file_for(self, asset: MediaAsset, thumbnail: bool = False) -> Path:
        return self.located(asset, thumbnail=thumbnail)[0]

    def located(self, asset: MediaAsset, thumbnail: bool = False) -> tuple[Path, os.stat_result | None]:
        """`file_for` 外加确认存在时那一次 stat 的结果，供送流一路往下传。

        片源在网盘上时每次 stat 都是一趟网络往返；一个 Range 请求原先在这里、头修复查询、
        ffprobe 画像缓存和 `FileResponse` 各 stat 一次。SMB 资源与大小写兜底匹配到的路径给 None。
        """
        raw = asset.snapshot_path if thumbnail else asset.path
        if not raw:
            raise MediaUnavailable(asset.id)
        from .smb_media import resolve
        remote = resolve(raw) if not thumbnail else None
        if remote is not None:
            if not any(within_root(remote, root) for root in self.allowed_roots):
                raise MediaUnavailable(asset.id)
            try:
                if remote.is_file():
                    return remote, None
            except OSError:
                raise MediaOffline(asset.id, remote.root_id) from None
            raise MediaUnavailable(asset.id)
        path = normalized_path(raw)
        roots = (self.snapshot_root,) if thumbnail else self.allowed_roots
        if not any(within_root(path, root) for root in roots):
            self._raise_unavailable(asset.id, raw, thumbnail)
        try:
            found = os.stat(path)
        except (OSError, ValueError):
            found = None
        if found is not None and S_ISREG(found.st_mode):
            return path, found
        matched = _case_insensitive_match(str(path.parent), path.name)
        if matched is not None:
            return path.parent / matched, None
        self._raise_unavailable(asset.id, raw, thumbnail)

    def _raise_unavailable(self, asset_id: int, raw: str, thumbnail: bool) -> None:
        """来源盘整体不可达时报 MediaOffline，单个文件缺失仍报 MediaUnavailable。"""
        if not thumbnail and is_windows_path(raw):
            translated = translate_ledger_path(raw)
            source = PureWindowsPath(raw).drive
            from . import media_identity, settings_file
            root_id = media_identity.ownership(settings_file.active(), raw).get("root_id", "")
            def offline():
                error = MediaOffline(asset_id, source)
                error.root_id = root_id
                return error
            if is_unmapped(translated):
                raise offline()
            candidate = normalized_path(raw)
            for root in self.allowed_roots:
                if within_root(candidate, root):
                    if not root_online(root):
                        raise offline()
                    break
        raise MediaUnavailable(asset_id)

    def source_status(self) -> tuple[dict[str, object], ...]:
        """当前授权根的在线状态；脱盘模式的判据只有这一份。"""
        return tuple(
            {"root": str(root), "online": root_online(root)} for root in self.allowed_roots
        )


class MediaEngine:
    """按 asset id 解析媒体文件。

    媒体根目录决定本机文件或 SMB 资源；工具输入使用受控的回环读取入口。
    """

    def __init__(self, repository: LedgerRepository, filesystem: FilesystemBackend):
        self.repository = repository
        self.filesystem = filesystem

    def asset(self, asset_id: int) -> MediaAsset:
        asset = self.repository.media_asset(asset_id)
        if asset is None:
            raise MediaNotFound(asset_id)
        return asset

    def file_for(self, asset_id: int, thumbnail: bool = False) -> Path:
        return self.filesystem.file_for(self.asset(asset_id), thumbnail=thumbnail)

    def stream_plan(self, asset_id: int, *, mode: str = "auto") -> StreamPlan:
        """远端挂载的 MP4 默认走标准 Range；HLS 只在显式要求时给出。见 ADR-0016。

        默认 HLS 会把 HEVC 用 `-c copy` 原样装进 MPEG-TS，而 Chromium 的 MSE 不支持
        TS 里的 HEVC（实测 `isTypeSupported('video/mp2t; codecs="hvc1…"')` 为 false）。
        数据能进缓冲、时间轴照走，却一帧都解不出来，于是是静默黑屏而不是报错。
        同一浏览器直接 Range 播放同一个文件可正常出帧。
        """
        asset = self.asset(asset_id)
        suffix = Path(asset.path or asset.name or "").suffix.lower()
        if (
            mode == "hls"
            and asset.location in {"115", "pikpak"}
            and suffix in {".mp4", ".m4v"}
            and asset.duration is not None
            and asset.duration > 0
        ):
            return StreamPlan(
                "hls",
                "application/vnd.apple.mpegurl",
                HLS_SEGMENT_SECONDS,
                "remote-mounted-file",
            )
        return StreamPlan("range", "video/mp4", reason="standard-http-range")
