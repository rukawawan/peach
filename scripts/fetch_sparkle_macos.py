"""获取固定的官方 Sparkle 2，去掉非沙盒应用用不到的 XPC 服务，按 ad-hoc 由内向外重签。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fetch_ffmpeg_sources import digest, download_source
from peach.interface_text import dev as t
from media_tool_bundle import checked_file

LOCK = Path(__file__).with_name("sparkle-macos.json")
FRAMEWORK = "Sparkle.framework"
#: 发布作业用来生成与核对 appcast 的官方工具；打包只取框架。
TOOLS = ("bin/generate_appcast", "bin/sign_update")
#: 框架里自带签名的嵌套代码，按由内向外的顺序重签；最后签框架本身封住资源清单。
NESTED_CODE = ("Versions/B/Autoupdate", "Versions/B/Updater.app")


def _members(package: tarfile.TarFile, tools: bool) -> list[tarfile.TarInfo]:
    wanted = []
    for member in package:
        name = member.name.removeprefix("./")
        if (name == "LICENSE" or name == FRAMEWORK or name.startswith(FRAMEWORK + "/")
                or (tools and name in TOOLS)):
            wanted.append(member)
    if not any(m.name.removeprefix("./") == "LICENSE" for m in wanted) or not any(
            m.name.removeprefix("./") == f"{FRAMEWORK}/Versions/B/Sparkle" for m in wanted):
        raise ValueError(t("fetch_sparkle_macos.archiveMismatch"))
    return wanted


def strip_xpc_services(framework: Path) -> None:
    """XPC 服务只给沙盒应用用；删目录的同时删掉顶层那条指向它的符号链接。"""
    shutil.rmtree(framework / "Versions/B/XPCServices")
    (framework / "XPCServices").unlink()


def sign(framework: Path, run=subprocess.run) -> None:
    for relative in (*NESTED_CODE, ""):
        run(["codesign", "--force", "--sign", "-", str(framework / relative) if relative else str(framework)],
            check=True)


def fetch(destination: Path, *, tools: bool = False) -> Path:
    lock = json.loads(LOCK.read_text(encoding="utf-8"))
    destination.mkdir(parents=True, exist_ok=True)
    archive = destination / "Sparkle.tar.xz"
    download_source({**lock["asset"], "name": "Sparkle"}, archive)
    framework = destination / FRAMEWORK
    shutil.rmtree(framework, ignore_errors=True)
    with tarfile.open(archive, "r:xz") as package:
        package.extractall(destination, members=_members(package, tools), filter="data")
    strip_xpc_services(framework)
    sign(framework)
    (destination / "LICENSE").replace(destination / "LICENSE-Sparkle.txt")
    (destination / "manifest.json").write_text(json.dumps({
        "version": lock["version"], "source": lock["asset"],
        "license": digest(destination / "LICENSE-Sparkle.txt")}, indent=2) + "\n", encoding="utf-8")
    return framework


def validate(destination: Path) -> dict:
    """打包前核对：清单与固定版本一致，归档与许可证未变，XPC 服务已去掉。"""
    lock = json.loads(LOCK.read_text(encoding="utf-8"))
    manifest = json.loads((destination / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("version") != lock["version"] or manifest.get("source") != lock["asset"]:
        raise ValueError(t("fetch_sparkle_macos.manifestMismatch"))
    checked_file(destination, "Sparkle.tar.xz", lock["asset"]["sha256"])
    checked_file(destination, "LICENSE-Sparkle.txt", manifest["license"])
    framework = destination / FRAMEWORK
    if not (framework / "Versions/B/Sparkle").is_file() or (framework / "Versions/B/XPCServices").exists():
        raise ValueError(t("fetch_sparkle_macos.frameworkInvalid"))
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=t("fetch_sparkle_macos.description"))
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--tools", action="store_true", help=t("fetch_sparkle_macos.toolsHelp"))
    args = parser.parse_args()
    fetch(args.destination.resolve(), tools=args.tools)
