"""从官方发行站下载固定版本 CLI，校验 SHA-256 后提取指定二进制。"""
from __future__ import annotations

import argparse
import hashlib
import io
from pathlib import Path
import re
import platform
import sys
import tarfile
import urllib.request
from urllib.parse import urlsplit
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from peach.user_agent import USER_AGENT
from peach.interface_text import dev as t
from peach.peach_proxy import client_options, read_url
try:
    import httpx
except ImportError:
    # 发布 runner 用系统 Python 取工具，那里没有 httpx：改用标准库下载，代理仍按 Peach 代理设置。
    httpx = None


TOOLS = (
    ("glab", "glab_1.124.0_linux_amd64.tar.gz", "https://gitlab.com/gitlab-org/cli/-/releases/v1.124.0/downloads", "checksums.txt", "bin/glab"),
    ("rclone", "rclone-v1.75.2-linux-amd64.zip", "https://downloads.rclone.org/v1.75.2", "SHA256SUMS", "rclone-v1.75.2-linux-amd64/rclone"),
)


def standard_opener(options: dict) -> urllib.request.OpenerDirector:
    """按 `peach_proxy.client_options` 的结果建标准库打开器：环境代理、直连或指定的 HTTP 代理。"""
    if options.get("trust_env"):
        return urllib.request.build_opener()
    proxy = options.get("proxy", "")
    if proxy and urlsplit(proxy).scheme not in {"http", "https"}:
        raise ValueError(t("fetch_release_tools.socksUnsupported"))
    return urllib.request.build_opener(urllib.request.ProxyHandler({"http": proxy, "https": proxy} if proxy else {}))


def download(url: str) -> bytes:
    headers = {"User-Agent": USER_AGENT}
    if httpx is not None:
        return read_url(url, headers=headers, timeout=120)
    request = urllib.request.Request(url, headers=headers)
    with standard_opener(client_options()).open(request, timeout=120) as response:
        return response.read()


def tool_specs(*, rclone_only: bool = False, system: str | None = None,
               machine: str | None = None) -> tuple:
    system = system or platform.system()
    machine = (machine or platform.machine()).lower()
    arch = {"amd64": "amd64", "x86_64": "amd64", "arm64": "arm64", "aarch64": "arm64"}.get(machine)
    operating = {"Linux": "linux", "Darwin": "osx", "Windows": "windows"}.get(system)
    if not arch or not operating or (not rclone_only and system != "Linux"):
        raise ValueError(t("fetch_release_tools.platformUnsupported"))
    suffix = ".exe" if system == "Windows" else ""
    stem = f"rclone-v1.75.2-{operating}-{arch}"
    rclone = ("rclone" + suffix, stem + ".zip", TOOLS[1][2], "SHA256SUMS", stem + "/rclone" + suffix)
    glab = TOOLS[0]
    if arch == "arm64":
        glab = tuple(value.replace("amd64", "arm64") for value in glab)
    return (rclone,) if rclone_only else (glab, rclone)


def install(destination: Path, *, rclone_only: bool = False) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for name, archive, base, checksums, member in tool_specs(rclone_only=rclone_only):
        document = download(f"{base}/{checksums}").decode("utf-8")
        expected = re.search(rf"^([0-9a-fA-F]{{64}})\s+\*?{re.escape(archive)}$", document, re.MULTILINE)
        content = download(f"{base}/{archive}")
        if expected is None or hashlib.sha256(content).hexdigest() != expected[1].lower():
            raise ValueError(t("fetch_release_tools.shaMismatch", name=name))
        if archive.endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(content)) as package:
                binary = package.read(member)
        else:
            with tarfile.open(fileobj=io.BytesIO(content), mode="r:gz") as package:
                source = package.extractfile(member)
                if source is None:
                    raise ValueError(t("fetch_release_tools.binaryMissing", name=name))
                binary = source.read()
        target = destination / name
        target.write_bytes(binary)
        target.chmod(0o755)
        print(t("fetch_release_tools.verified", name=name))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=t("fetch_release_tools.description"))
    parser.add_argument("--rclone-only", action="store_true")
    args = parser.parse_args()
    install(Path("build/release-tools").resolve(), rclone_only=args.rclone_only)
