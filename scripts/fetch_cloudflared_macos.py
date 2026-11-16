"""获取固定官方 macOS cloudflared，校验归档并保留许可证。"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess
import sys
import tarfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fetch_ffmpeg_sources import digest, download_source
from build_macos_media import audit_binary
from peach.interface_text import dev as t
from peach.peach_proxy import read_url


def fetch(destination: Path, architecture: str) -> Path:
    lock = json.loads(Path(__file__).with_name("cloudflared-macos.json").read_text())
    source = lock["assets"][architecture]
    destination.mkdir(parents=True, exist_ok=True)
    archive = destination / "cloudflared.tgz"
    download_source({**source, "name": "cloudflared"}, archive)
    with tarfile.open(archive) as package:
        members = [member for member in package if member.isfile() and member.name.removeprefix("./") == "cloudflared"]
        if len(members) != 1 or members[0].size > 150_000_000:
            raise ValueError(t("fetch_cloudflared_macos.archiveMismatch"))
        binary = destination / "cloudflared"
        with package.extractfile(members[0]) as stream:
            binary.write_bytes(stream.read())
    binary.chmod(0o755)
    subprocess.run(["codesign", "--force", "--sign", "-", str(binary)], check=True)
    audit_binary(binary, architecture)
    version = subprocess.check_output([str(binary), "--version"], text=True, encoding="utf-8")
    if lock["version"] not in version:
        raise ValueError(t("fetch_cloudflared_macos.versionMismatch"))
    license_text = read_url(lock["license_url"], timeout=60).decode("utf-8")
    if "Apache License" not in license_text:
        raise ValueError(t("fetch_cloudflared_macos.licenseMissing"))
    (destination / "LICENSE-cloudflared.txt").write_text(license_text, encoding="utf-8")
    (destination / "NOTICE-cloudflared.md").write_text(
        f"cloudflared {lock['version']}，Cloudflare 与贡献者，Apache-2.0。\n"
        f"官方制品来源与 SHA-256：{json.dumps(source)}\n", encoding="utf-8")
    (destination / "manifest.json").write_text(json.dumps({
        "version": lock["version"], "architecture": architecture, "source": source,
        "files": {name: digest(destination / name) for name in (
            "cloudflared", "LICENSE-cloudflared.txt", "NOTICE-cloudflared.md")}}, indent=2) + "\n", encoding="utf-8")
    return binary


def validate(destination: Path, architecture: str) -> dict:
    from media_tool_bundle import checked_file
    lock = json.loads(Path(__file__).with_name("cloudflared-macos.json").read_text())
    manifest = json.loads((destination / "manifest.json").read_text())
    if (manifest["version"] != lock["version"] or manifest["architecture"] != architecture
            or manifest["source"] != lock["assets"][architecture]
            or set(manifest["files"]) != {"cloudflared", "LICENSE-cloudflared.txt", "NOTICE-cloudflared.md"}):
        raise ValueError(t("fetch_cloudflared_macos.manifestMismatch"))
    checked_file(destination, "cloudflared.tgz", lock["assets"][architecture]["sha256"])
    for name, expected in manifest["files"].items():
        checked_file(destination, name, expected)
    audit_binary(destination / "cloudflared", architecture)
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=t("fetch_cloudflared_macos.description"))
    parser.add_argument("--arch", choices=("arm64", "x86_64"), required=True)
    parser.add_argument("--destination", type=Path, required=True)
    args = parser.parse_args()
    fetch(args.destination.resolve(), args.arch)
