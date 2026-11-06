"""给发布目录的 `SHA256SUMS.txt` 写 Ed25519 签名，并用客户端的校验代码核对（ADR-0137）。

私钥从标准输入读，一行一把（32 字节 seed 的 base64）；轮换期同时给新旧两把，签名文件各写一行。
源码的 `PUBLIC_KEYS` 为空且没给私钥时跳过签名；公钥已随源码发出却没给私钥时拒绝发布，
否则这一版起的客户端再也装不上新版本。`--generate-key` 供维护者生成正式密钥对。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peach import release_signing  # noqa: E402


def sign(sums: Path, private_keys: list[str], trusted: tuple[str, ...] | None = None) -> dict:
    trusted = release_signing.PUBLIC_KEYS if trusted is None else trusted
    target = sums.with_name(release_signing.SIGNATURE)
    if not private_keys:
        if trusted:
            raise ValueError("源码已带发布公钥，缺少签名私钥时不能发布")
        return {"signed": False, "reason": "源码没有发布公钥，也没有签名私钥"}
    content = sums.read_bytes()
    release_signing.parse(content)
    public = [release_signing.public_key(key) for key in private_keys]
    unknown = [key for key in public if trusted and key not in trusted]
    if unknown:
        raise ValueError("签名私钥对应的公钥不在源码的 PUBLIC_KEYS 里：" + "、".join(unknown))
    target.write_bytes("".join(release_signing.sign(content, key) for key in private_keys).encode("ascii"))
    # 源码还没有公钥时用这次的公钥自验，至少证明签名文件本身读得回来。
    release_signing.verify(content, target.read_bytes(), trusted or tuple(public))
    return {"signed": True, "signature": str(target), "public_keys": public, "trusted_by_source": bool(trusted)}


def generate_key(path: Path) -> dict:
    """维护者生成正式密钥对：私钥只写进指定文件（已存在就拒绝覆盖），输出里只有公钥。"""
    import base64
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat
    seed = Ed25519PrivateKey.generate().private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    private = base64.b64encode(seed).decode("ascii")
    try:
        with path.open("x", encoding="ascii", newline="\n") as output:
            output.write(private + "\n")
    except FileExistsError:
        raise ValueError(f"{path} 已存在，不覆盖已有私钥") from None
    return {"private_key_file": str(path), "public_key": release_signing.public_key(private)}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--sums", type=Path, help="发布目录里的 SHA256SUMS.txt；私钥从标准输入读")
    action.add_argument("--generate-key", type=Path, metavar="PATH", help="生成新密钥对，私钥写进 PATH")
    args = parser.parse_args(argv)
    try:
        result = generate_key(args.generate_key) if args.generate_key else sign(args.sums, sys.stdin.read().split())
        print(json.dumps(result, ensure_ascii=False))
    except ValueError as error:
        print(f"发布签名未完成：{error}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
