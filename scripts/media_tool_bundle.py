"""校验并复制 Windows 媒体工具及其对应源码制品。"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.interface_text import dev as t  # noqa: E402

REQUIRED_FILES = {"bin/ffmpeg.exe", "bin/ffprobe.exe", "LICENSE.txt", "NOTICE.md", "buildconf.txt"}
POLICIES = {
    "ffmpeg": (REQUIRED_FILES, {"ffmpeg", "x264", "nv-codec-headers", "dav1d", "amf-headers", "libvpl"},
               "GPL-3.0-or-later"),
    "untrunc": ({"untrunc.exe", "LICENSE.txt", "NOTICE.md", "buildconf.txt"},
                {"untrunc", "ffmpeg"}, "GPL-2.0-or-later"),
}


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def checked_file(root: Path, name: str, expected: str) -> Path:
    relative = PurePosixPath(name)
    if not name or "\\" in name or relative.is_absolute() or ".." in relative.parts or ":" in name:
        raise ValueError(t("media_tool_bundle.invalidPath", name=name))
    target = root.joinpath(*relative.parts)
    if not target.resolve().is_relative_to(root.resolve()) or target.is_symlink() or not target.is_file():
        raise ValueError(t("media_tool_bundle.fileMissing", name=name))
    if not re.fullmatch(r"[0-9a-f]{64}", expected) or digest(target) != expected:
        raise ValueError(f"FFmpeg SHA-256 mismatch: {name}")
    return target


def validate(root: Path, tool: str = "ffmpeg", *, architecture: str | None = None) -> tuple[dict, Path]:
    """构建和制品验收共用；哈希不匹配时不复制任何文件。"""
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    required, source_names, license_name = POLICIES[tool]
    archive_name = f"{tool}-corresponding-source.zip"
    if architecture is not None:
        if architecture not in {"arm64", "x86_64"} or manifest.get("platform") != "darwin" or manifest.get("architecture") != architecture:
            raise ValueError(t("media_tool_bundle.platformMismatch"))
        required = {name.removesuffix(".exe") for name in required}
        archive_name = f"{tool}-macos-{architecture}-corresponding-source.zip"
    if manifest.get("license") != license_name or not manifest.get("version"):
        raise ValueError(t("media_tool_bundle.licenseMissing"))
    files = manifest.get("files", {})
    if not required.issubset(files):
        raise ValueError(t("media_tool_bundle.toolsMissing"))
    actual = {path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file()}
    if actual != set(files) | {"manifest.json"}:
        raise ValueError(t("media_tool_bundle.filesMismatch"))
    for name, expected in files.items():
        checked_file(root, name, expected)
    sources = manifest.get("sources", [])
    if {source.get("name") for source in sources} != source_names:
        raise ValueError(t("media_tool_bundle.sourcesMissing"))
    for source in sources:
        if (not source.get("revision") or not source.get("url", "").startswith("https://")
                or not re.fullmatch(r"[0-9a-f]{64}", source.get("sha256", ""))):
            raise ValueError(t("media_tool_bundle.sourceUnpinned"))
    archive = manifest["source_archive"]
    if archive["name"] != archive_name:
        raise ValueError(t("media_tool_bundle.archiveNameMismatch"))
    source_path = checked_file(root.parent, archive["name"], archive["sha256"])
    return manifest, source_path


def package(root: Path, destination: Path, tool: str = "ffmpeg") -> dict:
    manifest, source_path = validate(root, tool)
    if destination.exists():
        raise ValueError(t("media_tool_bundle.destinationExists", path=destination))
    shutil.copytree(root, destination)
    output = destination.parents[2] / source_path.name
    if output.resolve() != source_path.resolve():
        shutil.copyfile(source_path, output)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=t("media_tool_bundle.description"))
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--destination", type=Path)
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--tool", choices=tuple(POLICIES), default="ffmpeg")
    args = parser.parse_args()
    if args.validate_only:
        manifest, _source = validate(args.source.resolve(), args.tool)
        print(json.dumps({"version": manifest["version"], "verified": True}))
        return 0
    if args.destination is None:
        parser.error("--destination is required unless --validate-only is set")
    manifest = package(args.source.resolve(), args.destination.resolve(), args.tool)
    print(json.dumps({"version": manifest["version"], "destination": str(args.destination)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
