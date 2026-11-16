"""取 YuNet 与 SFace 两个人脸模型及其许可证，逐个校验 SHA-256 后放进发行包的模型目录。

Windows 构建放进程序目录的 `tools/face-models`，macOS 放 `Peach.app/Contents/Resources/tools/face-models`，
运行时由 `peach.face_detect.bundled_model` 认这一份；Docker 镜像在 Dockerfile 里按同一组地址与哈希取。
下载先落到缓存目录，缓存里哈希对得上的文件不再联网。
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from peach import face_detect, face_match
from peach.interface_text import dev as t
from peach.peach_proxy import read_url
from peach.user_agent import USER_AGENT

CACHE = ROOT / "build" / "face-models"
SOURCE = "https://github.com/opencv/opencv_zoo"
LICENSE_BASE = f"https://raw.githubusercontent.com/opencv/opencv_zoo/{face_detect.ZOO_COMMIT}/models/"
#: (随包文件名, 地址, SHA-256)。许可证按 opencv_zoo 各模型目录的 LICENSE 与 README 核实：
#: `face_detection_yunet` 为 MIT（Copyright (c) 2020 Shiqi Yu），`face_recognition_sface` 为
#: Apache-2.0；两个目录都没有 NOTICE 文件。
FILES = (
    (face_detect.MODEL_PATH.name, face_detect.MODEL_URL, face_detect.MODEL_SHA256),
    (face_match.MODEL_PATH.name, face_match.MODEL_URL, face_match.MODEL_SHA256),
    ("LICENSE-yunet.txt", LICENSE_BASE + "face_detection_yunet/LICENSE",
     "c83b8120c50ccbd4c4f96edf53141bdd566ebb8f8e9227e415326aa1b1aba958"),
    ("LICENSE-sface.txt", LICENSE_BASE + "face_recognition_sface/LICENSE",
     "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30"),
)
#: 模型文件名 → (许可证, 许可文件)。
LICENSES = {
    face_detect.MODEL_PATH.name: ("MIT", "LICENSE-yunet.txt"),
    face_match.MODEL_PATH.name: ("Apache-2.0", "LICENSE-sface.txt"),
}


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def download(url: str) -> bytes:
    return read_url(url, headers={"User-Agent": USER_AGENT}, timeout=300)


def manifest() -> str:
    """模型目录里的 `manifest.json`：来源提交、地址、哈希与许可证。内容固定，工具包哈希可复现。"""
    models = [{"file": name, "url": url, "sha256": sha256,
               "license": LICENSES[name][0], "license_file": LICENSES[name][1]}
              for name, url, sha256 in FILES if name in LICENSES]
    return json.dumps({"source": SOURCE, "commit": face_detect.ZOO_COMMIT, "models": models},
                      ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def install(destination: Path, *, cache: Path = CACHE, fetch=download) -> list[Path]:
    """把四个文件与清单写进 `destination`；任何一个哈希对不上都不落盘并报错。"""
    cache.mkdir(parents=True, exist_ok=True)
    destination.mkdir(parents=True, exist_ok=True)
    written = []
    for name, url, sha256 in FILES:
        cached = cache / name
        if not (cached.is_file() and digest(cached) == sha256):
            payload = fetch(url)
            actual = hashlib.sha256(payload).hexdigest()
            if actual != sha256:
                raise ValueError(t("fetch_face_models.shaMismatch", name=name, sha256=sha256, actual=actual))
            temporary = cached.with_name(cached.name + ".part")
            temporary.write_bytes(payload)
            temporary.replace(cached)
        shutil.copyfile(cached, destination / name)
        written.append(destination / name)
    (destination / "manifest.json").write_bytes(manifest().encode("utf-8"))
    written.append(destination / "manifest.json")
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=t("fetch_face_models.description"))
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--cache", type=Path, default=CACHE)
    args = parser.parse_args()
    written = install(args.destination.resolve(), cache=args.cache.resolve())
    print(json.dumps({"destination": str(args.destination.resolve()), "files": [path.name for path in written]},
                     ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
