"""校验固定源码，生成 FFmpeg Windows 发行目录与完整对应源码包。"""
from __future__ import annotations

import argparse
import hashlib
import http.client
import itertools
import json
import os
from pathlib import Path
import shutil
import sys
import tarfile
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit
import zipfile

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR.parent / "src"))

SOURCE_USER_AGENT = "peach-source-fetch/1.0"
try:
    import httpx
    from peach.peach_proxy import http_client
    HTTP_ERRORS = (httpx.HTTPError,)
except ImportError:
    # 对应源码归档不含 Peach 代理配置，发布流程的系统 python3 也没有 httpx，都用标准库下载。
    http_client = None
    HTTP_ERRORS = ()

LOCK_PATH = SCRIPT_DIR / "ffmpeg-sources.json"
SOURCE_NAMES = {"ffmpeg", "x264", "nv-codec-headers", "dav1d", "amf-headers", "libvpl"}


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def download_source(source: dict, archive: Path) -> None:
    """限次重试源码传输，完整校验后才登记缓存。"""
    temporary = archive.with_suffix(archive.suffix + ".part")
    # 源码站（VideoLAN 的 GitLab 等）对带 Mozilla 的浏览器 UA 先返回人机校验页，校验和必然对不上；
    # 下载固定源码用不冒充浏览器的工具 UA。
    request = urllib.request.Request(source["url"], headers={"User-Agent": SOURCE_USER_AGENT})
    for attempt in range(3):
        try:
            print(f"下载固定源码：{source['name']}，第 {attempt + 1}/3 次", flush=True)
            if http_client is None:
                with urllib.request.urlopen(request, timeout=60) as response, temporary.open("wb") as stream:
                    shutil.copyfileobj(response, stream)
            else:
                with http_client(follow_redirects=True, timeout=60) as client, client.stream(
                        "GET", request.full_url, headers=dict(request.header_items())) as response, temporary.open("wb") as stream:
                    response.raise_for_status()
                    for chunk in response.iter_bytes(256 * 1024):
                        stream.write(chunk)
            if digest(temporary) != source["sha256"]:
                raise ValueError(f"源码 SHA256 不匹配: {source['name']}")
            temporary.replace(archive)
            return
        except (TimeoutError, ConnectionError, http.client.IncompleteRead, urllib.error.URLError, *HTTP_ERRORS) as error:
            status = getattr(getattr(error, "response", None), "status_code", getattr(error, "code", None))
            retryable = status is None or status in {408, 429, 500, 502, 503, 504}
            if not retryable or attempt == 2:
                raise
            time.sleep(2 ** (attempt + 1))
        finally:
            temporary.unlink(missing_ok=True)


def obtain_source(source: dict, archive: Path) -> None:
    """从可选源码缓存或固定上游获取同一份已锁定字节。"""
    base = os.environ.get("PEACH_SOURCE_CACHE_BASE", "").rstrip("/")
    if base:
        parsed = urlsplit(base)
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
                or parsed.query or parsed.fragment):
            raise ValueError("源码缓存须为无凭据的 HTTPS 地址")
        cached = {**source, "url": f"{base}/{source['sha256']}/{source['archive']}"}
        try:
            download_source(cached, archive)
            return
        except (TimeoutError, ConnectionError, http.client.IncompleteRead, urllib.error.URLError, *HTTP_ERRORS):
            print(f"源码缓存未取得，尝试固定上游：{source['name']}", flush=True)
    download_source(source, archive)


def load_sources(path: Path = LOCK_PATH) -> dict:
    lock = json.loads(path.read_text(encoding="utf-8"))
    if {source["name"] for source in lock["sources"]} != SOURCE_NAMES:
        raise ValueError("源码清单必须恰好包含全部链接依赖：" + "、".join(sorted(SOURCE_NAMES)))
    for source in lock["sources"]:
        if len(source["sha256"]) != 64 or any(c not in "0123456789abcdef" for c in source["sha256"]):
            raise ValueError(f"无效源码 SHA256: {source['name']}")
        if not source["url"].startswith("https://") or Path(source["archive"]).name != source["archive"]:
            raise ValueError("源码必须使用 HTTPS 与单个归档文件名")
    return lock


def prepare(output: Path, lock: dict) -> None:
    sources = output / "sources"
    work = output / "work"
    sources.mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)
    for source in lock["sources"]:
        archive = sources / source["archive"]
        if not archive.exists():
            obtain_source(source, archive)
        if digest(archive) != source["sha256"]:
            raise ValueError(f"源码 SHA256 不匹配: {source['name']}")
        destination = work / source["name"]
        if destination.exists():
            raise FileExistsError(f"构建目录已存在，请使用新的输出目录: {destination}")
        with tarfile.open(archive) as package:
            members = package.getmembers()
            roots = {m.name.split("/", 1)[0] for m in members}
            if len(roots) != 1 or next(iter(roots)) in ("", ".", ".."):
                raise ValueError(f"源码归档根目录无效: {source['name']}")
            package.extractall(work, filter="data")
        (work / next(iter(roots))).rename(destination)


def finish(output: Path, lock: dict) -> dict:
    bundle = output / "ffmpeg"
    work = output / "work"
    shutil.copyfile(work / "ffmpeg/COPYING.GPLv3", bundle / "LICENSE.txt")
    for source, license_name in (("ffmpeg", "COPYING.LGPLv2.1"), ("ffmpeg", "COPYING.LGPLv3"),
                                 ("x264", "COPYING"), ("dav1d", "COPYING"), ("libvpl", "LICENSE")):
        shutil.copyfile(work / source / license_name, bundle / f"LICENSE-{source}-{license_name}.txt")
    shutil.copyfile(work / "libvpl/third-party-programs.txt", bundle / "LICENSE-libvpl-third-party-programs.txt")
    amf_notices = []
    for header in sorted((work / "amf-headers/AMF").rglob("*.h")):
        lines = header.read_text(encoding="utf-8").lstrip("﻿").splitlines()
        notice = "\n".join(line.rstrip() for line in itertools.takewhile(lambda line: line.startswith("//"), lines))
        if "MIT" not in notice:
            raise ValueError(f"未取得 AMF 头文件许可证: {header.name}")
        if notice not in amf_notices:
            amf_notices.append(notice)
    if not amf_notices:
        raise ValueError("未取得 AMF 头文件许可证")
    (bundle / "LICENSE-amf-headers.txt").write_text("\n\n".join(amf_notices) + "\n", encoding="utf-8")
    header_notices = []
    for header in sorted((work / "nv-codec-headers/include/ffnvcodec").glob("*.h")):
        text = header.read_text(encoding="utf-8")
        header_notices.append(f"{header.name}\n{text.split('*/', 1)[0]}*/\n")
    if not header_notices:
        raise ValueError("未取得 NVIDIA 头文件许可证")
    (bundle / "LICENSE-nv-codec-headers.txt").write_text("\n".join(header_notices), encoding="utf-8")
    notice = (
        "# FFmpeg Windows x64\n\n"
        "FFmpeg 9.0.2 与 libx264 按 GPL-3.0-or-later 分发。\n"
        "版权与完整许可证见本目录 LICENSE 文件及对应源码归档。\n"
        "编解码使用 FFmpeg 内置实现、静态 libx264 与 BSD-2-Clause 许可的 dav1d AV1 软件解码器；NVIDIA 接口使用 nv-codec-headers。\n"
        "AMD AMF 接口使用 MIT 许可的 AMF 头文件；Intel QSV 接口静态链接 MIT 许可的 libvpl 调度器。\n"
        "Windows 系统库由操作系统提供；NVIDIA、AMD 与 Intel 驱动及其运行时由用户环境提供。\n"
        "支持 NVENC、CUVID、NVDEC、AMF、QSV、D3D11VA、DXVA2 与 Schannel HTTPS。\n"
        "包含 CUDA LLVM 与 scale_cuda；NVENC、AMF 与 QSV 可用性取决于本机显卡与驱动。\n"
        "完整对应源码、固定 revision、SHA256 与构建步骤见同版本 ffmpeg-corresponding-source.zip。\n"
        "本目录的 manifest.json 记录二进制、许可证、构建配置及源码归档的 SHA256。\n"
    )
    (bundle / "NOTICE.md").write_text(notice, encoding="utf-8")
    shutil.copyfile(output / "buildconf.mak", bundle / "buildconf.txt")
    archive = output / "ffmpeg-corresponding-source.zip"
    instructions = (
        "# Windows x64 FFmpeg 对应源码\n\n"
        f"包含 {len(lock['sources'])} 份未经修改的上游源码归档和构建脚本。\n"
        "Linux/Ubuntu 安装：sudo apt-get install build-essential gcc-mingw-w64-x86-64-posix "
        "g++-mingw-w64-x86-64-posix mingw-w64-x86-64-dev nasm pkg-config python3 clang meson "
        "ninja-build cmake ca-certificates xz-utils\n\n"
        '在此目录执行：bash scripts/build_ffmpeg_windows.sh "$PWD/rebuilt"\n'
        "离线重建：先建立 rebuilt/sources，再将 sources/ 内全部归档复制进去，再执行上述命令。\n"
        "产物为 rebuilt/ffmpeg 与 rebuilt/ffmpeg-corresponding-source.zip。\n"
        "工具链属于系统编译环境；各版本记录在 build-environment.txt。\n"
    )
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as package:
        for source in lock["sources"]:
            path = output / "sources" / source["archive"]
            if digest(path) != source["sha256"]:
                raise ValueError(f"源码 SHA256 不匹配: {source['name']}")
            package.write(path, f"sources/{path.name}")
        for name in ("build_ffmpeg_windows.sh", "fetch_ffmpeg_sources.py", "ffmpeg-sources.json", "dav1d-mingw64.ini"):
            package.write(SCRIPT_DIR / name, f"scripts/{name}")
        for name in ("__init__.py", "user_agent.py"):
            package.write(SCRIPT_DIR.parent / "src/peach" / name, f"src/peach/{name}")
        package.write(SCRIPT_DIR.parent / "LICENSE", "licenses/Peach-LICENSE.txt")
        for license_file in sorted(bundle.glob("LICENSE*")):
            package.write(license_file, f"licenses/{license_file.name}")
        package.writestr("README.md", instructions)
        package.write(output / "buildconf.mak", "buildconf.txt")
        if (output / "build-environment.txt").exists():
            package.write(output / "build-environment.txt", "build-environment.txt")
    manifest = {
        "version": lock["version"], "license": lock["license"],
        "files": {p.relative_to(bundle).as_posix(): digest(p) for p in sorted(bundle.rglob("*"))
                  if p.is_file() and p.name != "manifest.json"},
        "sources": lock["sources"],
        "source_archive": {"name": archive.name, "sha256": digest(archive)},
    }
    (bundle / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("prepare", "finish"))
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    lock = load_sources()
    if args.action == "prepare":
        prepare(args.output.resolve(), lock)
    else:
        finish(args.output.resolve(), lock)


if __name__ == "__main__":
    main()
