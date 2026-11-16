"""按源码、构建脚本、平台和工具链核对媒体工具缓存，包含对应源码包。"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import shutil
import subprocess
import sys

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.interface_text import dev as t  # noqa: E402

INPUTS = ("scripts/ffmpeg-sources.json", "scripts/untrunc-sources.json", "scripts/build_ffmpeg_windows.sh",
    "scripts/build_untrunc_windows.sh", "scripts/dav1d-mingw64.ini", "scripts/build_macos_media.py",
    "scripts/fetch_ffmpeg_sources.py", "scripts/fetch_untrunc_sources.py", "scripts/setup_macos_media_tools.py",
    "scripts/media_build_cache.py", "src/peach/user_agent.py", "LICENSE")


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def input_identity(root: Path, target: str, arch: str, *, toolchain: dict | None = None) -> dict:
    if toolchain is None:
        commands = {"compiler": ["x86_64-w64-mingw32-gcc", "--version"], "cxx": ["x86_64-w64-mingw32-g++", "--version"]} if target == "windows" else {
            "compiler": ["clang", "--version"], "sdk": ["xcrun", "--show-sdk-version"]}
        commands.update({name: [name, "--version"] for name in ("meson", "ninja", "make", "pkg-config")})
        if target == "windows":
            commands["cmake"] = ["cmake", "--version"]
        commands["nasm"] = ["nasm", "-v"]
        commands["clang"] = ["clang", "--version"]
        toolchain = {name: subprocess.check_output(command, text=True, encoding="utf-8").strip()
                     for name, command in commands.items()}
    return {"format": 1, "target": target, "arch": arch, "host": platform.system(),
            "deployment_target": os.environ.get("MACOSX_DEPLOYMENT_TARGET", "11.0") if target == "macos" else "",
            "toolchain": toolchain, "inputs": {name: digest(root / name) for name in INPUTS}}


def github_cache_key(identity: dict) -> str:
    """Actions 外层缓存与包内回执采用同一构建身份。"""
    encoded = json.dumps(identity, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return f"{identity['target']}-media-v2-{identity['arch']}-{hashlib.sha256(encoded).hexdigest()}"


def remove_owned(root: Path, path: Path) -> None:
    base = (root / "build").resolve()
    if not base.is_relative_to(root.resolve()) or path.is_symlink() or not path.resolve().is_relative_to(base) or path.resolve() == base:
        raise ValueError(t("media_build_cache.cleanupOutsideBuild"))
    for parent in path.parents:
        if parent == root:
            break
        if parent.is_symlink():
            raise ValueError(t("media_build_cache.pathHasSymlink"))
    if path.exists():
        shutil.rmtree(path)


def valid(cache: Path, identity: dict, tool: str, archive: str) -> bool:
    receipt = cache / "cache.json"
    if not receipt.is_file() or receipt.is_symlink():
        return False
    try:
        data = json.loads(receipt.read_text(encoding="utf-8"))
        if data.get("identity") != identity or not isinstance(data.get("files"), dict):
            return False
        files = data["files"]
        if archive not in files or f"{tool}/manifest.json" not in files:
            return False
        actual = {path.relative_to(cache).as_posix() for path in cache.rglob("*") if path.is_file() and path != receipt}
        if actual != set(files):
            return False
        for name, checksum in files.items():
            parts = PurePosixPath(name).parts
            if (not parts or name != archive and parts[0] != tool or ".." in parts or "\\" in name
                    or PurePosixPath(name).is_absolute()):
                return False
            path = cache / name
            if path.is_symlink() or any(parent.is_symlink() for parent in path.parents if parent != cache and parent.is_relative_to(cache)):
                raise ValueError(t("media_build_cache.cacheHasSymlink"))
            if digest(path) != checksum:
                return False
        return True
    except (OSError, ValueError, TypeError):
        return False


def build(root: Path, target: str, arch: str = "x86_64", tool: str | None = None) -> dict:
    root = root.resolve(strict=True)
    identity = input_identity(root, target, arch)
    tools = ("ffmpeg", "untrunc") if tool is None else (tool,)
    hits = []
    for item in tools:
        output = root / "build" / (f"{item}-windows" if target == "windows" else f"media-macos/{arch}/{item}")
        archive = f"{item}-corresponding-source.zip" if target == "windows" else f"{item}-macos-{arch}-corresponding-source.zip"
        cache = root / f"build/media-cache/{target}-{arch}/{item}"
        if cache.is_symlink() or not cache.resolve().is_relative_to((root / "build").resolve()):
            raise ValueError(t("media_build_cache.cacheOutsideBuild"))
        if valid(cache, identity, item, archive):
            remove_owned(root, output)
            output.mkdir(parents=True)
            shutil.copytree(cache / item, output / item)
            shutil.copyfile(cache / archive, output / archive)
            hits.append(item)
            continue
        remove_owned(root, output)
        if target == "windows":
            command = ["bash", str(root / f"scripts/build_{item}_windows.sh"), str(output)]
        else:
            command = [sys.executable, str(root / "scripts/build_macos_media.py"), "--tool", item,
                       "--arch", arch, "--output", str(output)]
        subprocess.run(command, cwd=root, check=True)
        if not (output / item / "manifest.json").is_file() or not (output / archive).is_file():
            raise ValueError(t("media_build_cache.missingTools"))
        remove_owned(root, cache)
        cache.mkdir(parents=True)
        shutil.copytree(output / item, cache / item)
        shutil.copyfile(output / archive, cache / archive)
        files = {path.relative_to(cache).as_posix(): digest(path) for path in cache.rglob("*") if path.is_file()}
        (cache / "cache.json").write_text(json.dumps({"identity": identity, "files": files}, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return {"target": target, "arch": arch, "cache_hits": hits, "tools": list(tools)}


def main() -> None:
    parser = argparse.ArgumentParser(description=t("media_build_cache.description"))
    parser.add_argument("target", choices=("windows", "macos"))
    parser.add_argument("--arch", choices=("arm64", "x86_64"), default="x86_64")
    parser.add_argument("--tool", choices=("ffmpeg", "untrunc"))
    parser.add_argument("--github-key", action="store_true", help=t("media_build_cache.githubKeyHelp"))
    args = parser.parse_args()
    if args.target == "windows" and args.arch != "x86_64":
        parser.error(t("media_build_cache.windowsArch"))
    if args.github_key:
        print(github_cache_key(input_identity(Path.cwd(), args.target, args.arch)))
    else:
        print(json.dumps(build(Path.cwd(), args.target, args.arch, args.tool)))


if __name__ == "__main__":
    main()
