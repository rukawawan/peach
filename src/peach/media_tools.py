"""源码运行时从配置页安装 FFmpeg 与 untrunc 到数据目录的 `tools/`。

装的是独立包发布的同一份工具包 `Peach-<版本>-windows-x64-tools-<tool>.zip`，下载、两源回退、
Peach 代理、体积与 SHA-256 校验都走应用更新器那一套（`standalone_update.download`、
`signed_release`），解压沿用它的路径检查。源码运行没有更新包里的 `update-manifest.json`，
逐文件摘要取工具包自带的 `manifest.json`：整包摘要来自发布记录，包内清单随之可信。

发布只有 Windows x64 工具包：macOS 发 DMG，工具在应用包里；Linux 走 Docker 镜像，镜像自带。
这两个平台的源码运行没有可装的制品，配置页保留官方下载外链。
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import platform
import re
import shutil
import uuid
import zipfile

from filelock import FileLock, Timeout
import httpx

from . import release_updates, standalone_update, update_packages

LABELS = {"ffmpeg": "FFmpeg", "untrunc": "untrunc"}


def supported() -> bool:
    """本机能不能装发布的工具包：只有 Windows x64。"""
    return os.name == "nt" and platform.machine().lower() in {"amd64", "x86_64"}


def installed_version(tools_root: Path, tool: str) -> str | None:
    """数据目录里那份工具包自带的版本；不是从工具包装的（没有清单）时为 None。只读清单，不算摘要。"""
    try:
        manifest = json.loads((Path(tools_root) / tool / "manifest.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    version = manifest.get("version") if isinstance(manifest, dict) else None
    return version if isinstance(version, str) and version else None


def _verified(folder: Path, tool: str) -> str | None:
    """`folder` 是一份完整、逐文件校验通过的工具包时返回它的版本。"""
    files = _manifest_files(folder / "manifest.json", tool, prefix="")
    if files is None or not update_packages.matches(folder, files):
        return None
    return installed_version(folder.parent, folder.name) or "未知版本"


def _manifest_files(source, tool: str, *, prefix: str) -> dict[str, str] | None:
    """工具包清单里的逐文件摘要，键加上 `prefix`；清单缺失、格式不对或少了必需文件时为 None。"""
    try:
        text = source.read_text(encoding="utf-8") if isinstance(source, Path) else source()
        files = json.loads(text).get("files")
    except (OSError, KeyError, ValueError, AttributeError):
        return None
    if not isinstance(files, dict) or not all(
            isinstance(name, str) and isinstance(value, str) and re.fullmatch(r"[0-9a-f]{64}", value)
            for name, value in files.items()):
        return None
    required = update_packages.TOOL_PATHS[tool][1] - {"manifest.json"}
    if not required.issubset(files):
        return None
    return {prefix + name: value for name, value in files.items()}


def install(tools_root: Path, tool: str, *, locate=release_updates.tool_package,
            fetch=standalone_update.download) -> str:
    """下载、校验并换入 `tools_root/<tool>`，返回回执。已装好且校验通过时不下载。

    下载和解压都在 `tools_root` 下的事务目录里做，校验全过才整目录换入；中途失败只留下
    事务目录，下次安装开头清掉，已有的那份不动。同一工具同时只装一次。
    """
    if tool not in LABELS:
        raise ValueError("未知的媒体工具")
    label = LABELS[tool]
    if not supported():
        raise ValueError(f"发布只提供 Windows x64 的 {label} 工具包，请从官方下载并加入 PATH")
    tools_root = Path(tools_root)
    tools_root.mkdir(parents=True, exist_ok=True)
    target = tools_root / tool
    lock = FileLock(str(tools_root / f".install-{tool}.lock"), thread_local=False)
    try:
        lock.acquire(timeout=0)
    except Timeout:
        raise ValueError(f"{label} 正在安装，请稍候") from None
    try:
        version = _verified(target, tool) if target.is_dir() else None
        if version is not None:
            return f"{label} 已安装（{version}），无需重新下载"
        for leftover in tools_root.glob(f".install-{tool}-*"):
            shutil.rmtree(leftover, ignore_errors=True)
        work = tools_root / f".install-{tool}-{uuid.uuid4().hex[:12]}"
        work.mkdir()
        try:
            package = locate(tool)
            release = standalone_update.signed_release({"asset_url": package["url"], "asset_digest": package["digest"]})
            digest, size = standalone_update.checked_asset(release["asset_digest"], package["size"], "工具包")
            archive = work / "package.zip"
            try:
                fetch(package["url"], archive, size, digest, lambda _count: None)
            except httpx.HTTPError as exc:
                raise ValueError(f"{label} 工具包下载失败：{exc}") from exc
            except ValueError as exc:
                raise ValueError(f"{label} 工具包与发布摘要不符，已丢弃这次下载，请重试") from exc
            prefix = update_packages.TOOL_PATHS[tool][0] + "/"
            with zipfile.ZipFile(archive) as bundle:
                files = _manifest_files(lambda: bundle.read(f"Peach/{prefix}manifest.json").decode("utf-8"),
                                        tool, prefix=prefix)
            if files is None:
                raise ValueError(f"{label} 工具包缺少有效的文件清单")
            stage = standalone_update.extract(archive, work / "stage", lambda *_: None,
                                              tool_files=set(files) | {prefix + "manifest.json"})
            if not update_packages.matches(stage, files):
                raise ValueError(f"{label} 工具包文件校验失败")
            previous = work / "previous"
            if target.exists():
                os.replace(target, previous)
            try:
                os.replace(stage.joinpath(*prefix.strip("/").split("/")), target)
            except OSError:
                if previous.exists():
                    os.replace(previous, target)
                raise
        finally:
            shutil.rmtree(work, ignore_errors=True)
        return f"已安装 {label}（{installed_version(tools_root, tool) or package['version']}）"
    finally:
        lock.release()
