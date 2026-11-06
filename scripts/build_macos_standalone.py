#!/usr/bin/env python3
"""构建包含 Python 运行时的 macOS 应用与拖放安装镜像。"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import platform
import plistlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from peach import __version__, sparkle_update


def minimum_system_version(app: Path) -> str:
    """以随包 Mach-O 的实际最低系统版本填写应用声明。"""
    magic = {b"\xcf\xfa\xed\xfe", b"\xce\xfa\xed\xfe", b"\xca\xfe\xba\xbe", b"\xca\xfe\xba\xbf"}
    binaries = []
    for path in app.rglob("*"):
        if path.is_symlink() or not path.is_file():
            continue
        with path.open("rb") as stream:
            if stream.read(4) in magic:
                binaries.append(str(path))
    if not binaries:
        raise ValueError("应用内没有 Mach-O 可执行文件")
    result = subprocess.run(["otool", "-l", *binaries], capture_output=True,
                            text=True, encoding="utf-8", check=True)
    versions = re.findall(r"cmd LC_(?:BUILD_VERSION|VERSION_MIN_MACOSX)\s+cmdsize \d+\s+"
                          r"(?:platform \d+\s+)?(?:minos|version) ([\d.]+)", result.stdout)
    if not versions:
        raise ValueError("未取得随包二进制的 macOS 版本下限")
    return max(versions, key=lambda value: tuple(int(part) for part in value.split(".")))


def package_dmg(app: Path, destination: Path) -> Path:
    """以固定拖放布局分发应用，许可证随应用资源保留。"""
    if not (app / "Contents" / "MacOS" / "Peach").is_file():
        raise FileNotFoundError(f"找不到应用可执行文件：{app}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    from dmgbuild import build_dmg
    from resvg_py import svg_to_bytes

    with tempfile.TemporaryDirectory(prefix="peach-dmg-") as directory:
        staging = Path(directory)
        source = str(ROOT / "resources" / "dmg-background.svg")
        background = staging / "background.png"
        for scale in (1, 2):
            path = background if scale == 1 else staging / "background@2x.png"
            path.write_bytes(svg_to_bytes(svg_path=source, zoom=scale))
        build_dmg(str(destination), "Peach", settings={
            "format": "UDZO", "filesystem": "APFS", "files": [str(app)],
            "symlinks": {"Applications": "/Applications"},
            "background": str(background), "window_rect": ((160, 160), (640, 420)),
            "icon_locations": {"Peach.app": (174, 220), "Applications": (466, 220)},
            "icon_size": 128, "text_size": 13,
            "default_view": "icon-view", "arrange_by": None,
            "show_toolbar": False, "show_sidebar": False, "show_status_bar": False,
            "show_tab_view": False, "show_pathbar": False,
        })
    return destination


def install_sparkle(app: Path, source: Path) -> None:
    """框架放在 `Contents/Frameworks`，即 PyInstaller 的 `_MEIPASS`；保留符号链接，签名由取件时完成。"""
    shutil.copytree(source / "Sparkle.framework", app / "Contents/Frameworks/Sparkle.framework", symlinks=True)
    shutil.copyfile(source / "LICENSE-Sparkle.txt", app / "Contents/Resources/LICENSE-Sparkle.txt")


def build(destination: Path, *, dmg: bool = True, target_arch: str | None = None,
          require_reporting: bool = False) -> dict[str, str]:
    if sys.platform != "darwin":
        raise SystemExit("macOS 应用必须在 macOS 上构建")
    from peach import seed_pack
    seed_pack.load(ROOT / "resources/seed/entities.json")
    architecture = target_arch or platform.machine()
    if architecture not in {"arm64", "x86_64"} or architecture != platform.machine():
        raise SystemExit("目标架构必须与当前 Python 一致；请使用 arm64 或 x86_64 Python 及对应依赖构建")
    from write_reporting_config import reporting_config, write as write_reporting_config
    reporting_config(require=require_reporting)
    from build_macos_app import build_frontend_bundles
    from media_tool_bundle import validate
    from build_macos_media import audit_binary
    from fetch_cloudflared_macos import validate as validate_cloudflared
    from fetch_sparkle_macos import validate as validate_sparkle
    from fetch_face_models import install as install_face_models
    from build_amane_runtime import build as build_amane_runtime, verify as verify_amane_runtime

    media_root = ROOT / "build/media-macos" / architecture
    sources = []
    for tool in ("ffmpeg", "untrunc"):
        _manifest, archive = validate(media_root / tool / tool, tool, architecture=architecture)
        sources.append(archive)
        for name in (("bin/ffmpeg", "bin/ffprobe") if tool == "ffmpeg" else ("untrunc",)):
            audit_binary(media_root / tool / tool / name, architecture)
    cloudflared = media_root / "cloudflared"
    validate_cloudflared(cloudflared, architecture)
    sparkle = media_root / "sparkle"
    validate_sparkle(sparkle)
    work = ROOT / "build" / "macos-standalone" / architecture
    amane_runtime = work / "amane-runtime"
    build_amane_runtime(amane_runtime, work=work / "amane-build")
    # 人脸模型在 PyInstaller 之前取齐并校验，网络不通时尽早失败。
    face_models = work / "face-models"
    shutil.rmtree(face_models, ignore_errors=True)
    install_face_models(face_models)

    build_frontend_bundles()
    destination = destination.resolve()
    work.mkdir(parents=True, exist_ok=True)
    commit = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "HEAD"],
                            capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()
    identity = {
        "commit": commit, "version": __version__,
        "built_at": datetime.now(timezone.utc).isoformat(), "architecture": architecture,
        "dirty": bool(subprocess.run(
            ["git", "-C", str(ROOT), "status", "--porcelain"],
            capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()),
    }
    (work / "build-info.json").write_text(json.dumps(identity), encoding="utf-8")
    reporting = write_reporting_config(work / "sentry.json", require=require_reporting)
    subprocess.run([
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean",
        "--distpath", str(destination), "--workpath", str(work / "app"),
        str(ROOT / "scripts" / "peach_macos.spec"),
    ], check=True, cwd=ROOT, env={**os.environ, "PEACH_MACOS_BUILD_INFO": str(work / "build-info.json"),
                                "PEACH_MACOS_REPORTING_CONFIG": str(reporting),
                                "PEACH_MACOS_AMANE_RUNTIME": str(amane_runtime),
                                "PEACH_MACOS_TARGET_ARCH": architecture})
    app = destination / "Peach.app"
    verify_amane_runtime(app / "Contents/Frameworks/tools/amane-runtime")
    tools = app / "Contents/Resources/tools"
    tools.mkdir(exist_ok=True)
    for tool in ("ffmpeg", "untrunc"):
        shutil.copytree(media_root / tool / tool, tools / tool)
    shutil.copytree(face_models, tools / "face-models")
    shutil.copyfile(cloudflared / "cloudflared", app / "Contents/MacOS/cloudflared")
    (app / "Contents/MacOS/cloudflared").chmod(0o755)
    for name in ("LICENSE-cloudflared.txt", "NOTICE-cloudflared.md"):
        shutil.copyfile(cloudflared / name, app / "Contents/Resources" / name)
    shutil.copyfile(cloudflared / "manifest.json", app / "Contents/Resources/cloudflared-manifest.json")
    install_sparkle(app, sparkle)
    for archive in sources:
        shutil.copyfile(archive, destination / archive.name)
    minimum = minimum_system_version(app)
    info_path = app / "Contents" / "Info.plist"
    info = plistlib.loads(info_path.read_bytes())
    info["LSMinimumSystemVersion"] = minimum
    info.update(sparkle_update.info_plist_keys(architecture))
    info_path.write_bytes(plistlib.dumps(info))
    subprocess.run(["codesign", "--force", "--sign", "-", str(app)], check=True)
    subprocess.run(["codesign", "--verify", "--deep", "--strict", str(app)], check=True)
    result = {"app": str(app), "version": __version__, "commit": commit,
              "architecture": architecture, "minimum_macos": minimum}
    if dmg:
        image = destination / f"Peach-{__version__}-macos-{architecture}.dmg"
        result["dmg"] = str(package_dmg(app, image))
    # COLLECT 是 BUNDLE 的中间目录；只留下可分发的应用，避免重复占用与系统索引。
    shutil.rmtree(destination / "Peach")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", type=Path)
    parser.add_argument("--target-arch", choices=("arm64", "x86_64"), default=platform.machine())
    parser.add_argument("--no-dmg", action="store_true", help="只生成独立应用")
    parser.add_argument("--require-reporting", action="store_true", help="发行构建：缺 Sentry DSN 时失败")
    args = parser.parse_args()
    destination = args.destination or ROOT / "dist" / "macos.noindex" / args.target_arch
    print(json.dumps(build(destination, dmg=not args.no_dmg, target_arch=args.target_arch,
                           require_reporting=args.require_reporting), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
