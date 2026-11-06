"""给官方 generate_appcast 生成的 appcast 补写迁移号，上传前核对本版本条目，再发布到 R2（ADR-0130）。

签名由 generate_appcast 完成，签名是否有效由发布作业用官方 sign_update --verify 核对；这里只管
Sparkle 工具不知道的 Peach 约束：本版本是最高版本，下载地址与大小对得上实际 DMG，迁移号齐全。
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peach.sparkle_update import MIGRATION_HEAD, MIGRATION_NAMESPACE, migration_head

SPARKLE = "http://www.andymatuschak.org/xml-namespaces/sparkle"
ET.register_namespace("sparkle", SPARKLE)
ET.register_namespace("peach", MIGRATION_NAMESPACE)
HEAD_TAG = f"{{{MIGRATION_NAMESPACE}}}{MIGRATION_HEAD.split(':', 1)[1]}"


def _version(text: str | None) -> tuple[int, ...]:
    if not text or not re.fullmatch(r"\d+(\.\d+){0,3}", text.strip()):
        raise ValueError(f"appcast 版本号无效：{text}")
    return tuple(int(part) for part in text.strip().split("."))


def _items(tree: ET.ElementTree) -> list[ET.Element]:
    channel = tree.getroot().find("channel")
    if channel is None:
        raise ValueError("appcast 缺少 channel")
    return channel.findall("item")


def _item(tree: ET.ElementTree, version: str) -> ET.Element:
    matches = [item for item in _items(tree) if item.findtext(f"{{{SPARKLE}}}version") == version]
    if len(matches) != 1:
        raise ValueError(f"appcast 里版本 {version} 的条目有 {len(matches)} 个")
    return matches[0]


def annotate(path: Path, version: str, head: int) -> None:
    tree = ET.parse(path)
    item = _item(tree, version)
    element = item.find(HEAD_TAG)
    if element is None:
        element = ET.SubElement(item, HEAD_TAG)
    element.text = str(head)
    tree.write(path, encoding="utf-8", xml_declaration=True)


def verify(path: Path, *, version: str, dmg: Path, url_prefix: str, head: int) -> dict:
    """返回本版本条目的签名，供 sign_update --verify 使用。"""
    tree = ET.parse(path)
    item = _item(tree, version)
    for other in _items(tree):
        if other is not item and _version(other.findtext(f"{{{SPARKLE}}}version")) >= _version(version):
            raise ValueError("appcast 里有不低于本版本的条目")
    enclosure = item.find("enclosure")
    if enclosure is None:
        raise ValueError("本版本条目缺少 enclosure")
    if enclosure.get("url") != url_prefix + dmg.name:
        raise ValueError(f"下载地址不符：{enclosure.get('url')}")
    if enclosure.get("length") != str(dmg.stat().st_size):
        raise ValueError("enclosure 大小与 DMG 不符")
    signature = enclosure.get(f"{{{SPARKLE}}}edSignature")
    if not signature:
        raise ValueError("本版本条目缺少 EdDSA 签名")
    if item.findtext(HEAD_TAG) != str(head):
        raise ValueError("本版本条目的迁移号缺失或不符")
    if not item.findtext(f"{{{SPARKLE}}}minimumSystemVersion"):
        raise ValueError("本版本条目缺少最低系统版本")
    return {"version": version, "signature": signature}


def publish(feeds: list[Path]) -> list[dict]:
    """appcast 按 releases.json 的方式短缓存覆盖上传，再从公开入口完整下载核对。"""
    from release_r2 import rclone_environment, verify_download
    environment = rclone_environment()
    executable = environment.get("PEACH_RCLONE") or shutil.which("rclone")
    if not executable:
        raise ValueError("发布需要官方 rclone")
    base = environment["PEACH_R2_PUBLIC_BASE"].rstrip("/")
    published = []
    with tempfile.TemporaryDirectory(prefix="peach-sparkle-") as directory:
        configuration = Path(directory) / "rclone.conf"
        configuration.touch()
        for feed in feeds:
            target = f"peach:{environment['PEACH_R2_BUCKET']}/sparkle/{feed.name}"
            subprocess.run([executable, "copyto", str(feed), target, "--checksum", "--config", str(configuration),
                            "--header-upload", "Cache-Control: public, max-age=60"], env=environment, check=True)
            item = {"name": feed.name, "size": feed.stat().st_size,
                    "sha256": hashlib.sha256(feed.read_bytes()).hexdigest()}
            # 公开入口缓存一分钟，裸地址可能还是上传前的旧文件或 404：带上本次摘要，取回刚写进 R2 的那份。
            verify_download(f"{base}/sparkle/{feed.name}?sha256={item['sha256']}", item)
            published.append(item)
    return published


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("annotate", "verify"):
        command = commands.add_parser(name)
        command.add_argument("--appcast", type=Path, required=True)
        command.add_argument("--version", required=True)
        if name == "verify":
            command.add_argument("--dmg", type=Path, required=True)
            command.add_argument("--url-prefix", required=True)
    commands.add_parser("publish").add_argument("feeds", type=Path, nargs="+")
    args = parser.parse_args(argv)
    head = migration_head(Path(__file__).resolve().parents[1] / "migrations")
    try:
        if args.command == "annotate":
            annotate(args.appcast, args.version, head)
            result = {"version": args.version, "migration_head": head}
        elif args.command == "verify":
            result = verify(args.appcast, version=args.version, dmg=args.dmg, url_prefix=args.url_prefix, head=head)
        else:
            result = publish(args.feeds)
    except (OSError, ValueError, ET.ParseError, subprocess.CalledProcessError) as error:
        print(f"Sparkle appcast 未通过：{error}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
