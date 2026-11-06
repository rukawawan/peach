"""本机访问密码与浏览器会话；内部 API 凭据由 auth 管理。

浏览器会话是签名令牌，同时在访问策略旁的 `browser-sessions.json` 里每台设备记一行：
只存令牌摘要、设备简称、来源网段与时间，不存令牌本身。签名管伪造，这份记录管撤销。
"""
from __future__ import annotations

import hashlib
import hmac
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import tempfile
import threading
import time

from filelock import FileLock
from itsdangerous import BadData, URLSafeSerializer

from .fsutil import atomic_write_text

COOKIE = "peach_session"
SESSIONS = "browser-sessions.json"
#: 最近活动只为人看，按分钟落盘就够；每个请求都写会让媒体分段请求排队等文件锁。
ACTIVITY_INTERVAL = 60


def load(path: Path | None) -> dict:
    """缺少策略的已有部署继续要求原访问口令，损坏的策略拒绝访问。"""
    if path is None:
        return {"mode": "legacy", "revision": "legacy"}
    try:
        policy = json.loads(path.read_text(encoding="utf-8"))
        if (policy["mode"] not in {"open", "password"}
                or not isinstance(policy["revision"], str)
                or not isinstance(policy["key"], str)):
            raise ValueError("invalid access policy")
        if policy["mode"] == "password" and not all(isinstance(policy[k], str) for k in ("salt", "hash")):
            raise ValueError("invalid password hash")
        return policy
    except FileNotFoundError:
        return {"mode": "legacy", "revision": "legacy"}
    except (OSError, ValueError, KeyError, TypeError):
        return {"mode": "locked", "revision": "locked"}


def validate_password(password: str, confirmation: str) -> None:
    if password != confirmation:
        raise ValueError("两次输入的密码不一致")
    if password and not 8 <= len(password) <= 256:
        raise ValueError("访问密码需为 8–256 个字符")


def _digest(password: str, salt: str) -> str:
    return hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt),
                          n=32768, r=8, p=1, maxmem=67108864, dklen=32).hex()


def verify(policy: dict, password: str, legacy_token: str = "") -> bool:
    if len(password) > 256:
        return False
    if policy["mode"] == "legacy":
        return bool(legacy_token) and hmac.compare_digest(password.encode(), legacy_token.encode())
    if policy["mode"] != "password":
        return False
    try:
        return hmac.compare_digest(_digest(password, policy["salt"]), policy["hash"])
    except (ValueError, KeyError):
        return False


def save(path: Path, password: str) -> dict:
    """原子替换策略。每次更改都会撤销已签发的浏览器会话，设备记录随之清空。"""
    validate_password(password, password)
    policy = {"mode": "password" if password else "open",
              "revision": secrets.token_hex(16), "key": secrets.token_urlsafe(32)}
    if password:
        policy["salt"] = secrets.token_hex(16)
        policy["hash"] = _digest(password, policy["salt"])
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(dir=path.parent, prefix=".access-", suffix=".json")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(policy, stream)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)
    try:
        Sessions(sessions_path(path)).reset(policy["revision"])
    except OSError:
        pass  # 清不掉也无妨：记录的代次已与新策略不符，旧行一概不认。
    return policy


def public(policy: dict) -> dict:
    return {"mode": policy["mode"], "revision": policy["revision"]}


def _signer(policy: dict) -> URLSafeSerializer:
    return URLSafeSerializer(policy["key"], salt="peach-browser-access")


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def issue(policy: dict, days: int, sessions: Sessions | None = None, *,
          device: str = "", network: str = "", remote: bool = False) -> tuple[str, int | None]:
    """签发令牌并登记这台设备；记录写不进去时抛 OSError，不发一个校验不过的令牌。"""
    if type(days) is not int or not 0 <= days <= 365:
        raise ValueError("请选择有效的保持登录时间")
    seconds = days * 86400 if days else 43200
    expires = int(time.time()) + seconds
    # 随机 `id` 让同一秒、同一时长的两次登录也各得一个令牌，记录里才是两行。
    value = _signer(policy).dumps({"revision": policy["revision"], "expires": expires,
                                   "id": secrets.token_urlsafe(16)})
    if sessions is not None:
        sessions.add(policy["revision"], digest(value), expires=expires,
                     device=device, network=network, remote=remote)
    return value, seconds if days else None


def valid_session(policy: dict, value: str, sessions: Sessions | None = None, *,
                  device: str = "", network: str = "", remote: bool = False) -> bool:
    """核签名、代次与期限；给了设备记录时还要求记录里有这一行。

    升级前签发的令牌载荷里没有 `id`，记录里也没有它：头一次见到时补登一行，不让已登录
    的设备在升级后被一起登出；撤销后留墓碑到它原本的到期时间，不会被再次补登。
    """
    if policy["mode"] not in {"password", "legacy"} or len(value) > 2048:
        return False
    try:
        payload = _signer(policy).loads(value)
        if (payload["revision"] != policy["revision"]
                or type(payload["expires"]) is not int or payload["expires"] <= time.time()):
            return False
    except (BadData, KeyError, TypeError):
        return False
    if sessions is None:
        return True
    return sessions.check(policy["revision"], digest(value), expires=payload["expires"],
                          legacy="id" not in payload, device=device, network=network, remote=remote)


def sessions_path(policy_path: Path) -> Path:
    return policy_path.with_name(SESSIONS)


_SYSTEMS = (("iPhone", "iPhone"), ("iPad", "iPad"), ("Android", "Android"), ("CrOS", "ChromeOS"),
            ("Windows", "Windows"), ("Macintosh", "macOS"), ("Linux", "Linux"))
_BROWSERS = (("EdgiOS/", "Edge"), ("EdgA/", "Edge"), ("Edg/", "Edge"), ("OPR/", "Opera"),
             ("FxiOS/", "Firefox"), ("Firefox/", "Firefox"), ("SamsungBrowser/", "Samsung Internet"),
             ("CriOS/", "Chrome"), ("Chrome/", "Chrome"), ("Safari/", "Safari"))


def device_name(user_agent: str) -> str:
    """User-Agent 只取浏览器与系统两个词，原文不落盘；认不出时留空，由页面写「未识别」。"""
    browser = next((name for mark, name in _BROWSERS if mark in user_agent), "")
    system = next((name for mark, name in _SYSTEMS if mark in user_agent), "")
    if system == "Android" and "Mobile" not in user_agent:
        system = "Android 平板"  # Android 平板的 User-Agent 不带 Mobile；页面据此换平板图标
    return " · ".join(part for part in (browser, system) if part)


def network_of(address: str) -> str:
    """来源只记网段（IPv4 /24、IPv6 /64），够认出是哪个网络，不留完整地址。"""
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return ""
    if ip.version == 6 and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    if ip.is_loopback:
        return "loopback"
    return str(ipaddress.ip_network(f"{ip}/{24 if ip.version == 4 else 64}", strict=False))


_CACHE: dict[Path, tuple[tuple[int, int, int], dict]] = {}
_CACHE_LOCK = threading.Lock()
_LIMIT = 200
_ID = re.compile(r"[0-9a-f]{16}")
_FIELDS = frozenset({"id", "device", "network", "remote", "created_at", "last_seen", "expires", "legacy"})


def _empty(revision: str) -> dict:
    return {"revision": revision, "sessions": {}, "revoked": {}}


class Sessions:
    """访问策略旁的设备记录。

    每个请求都要读，按文件身份缓存解析结果；写入走文件锁加原子替换。记录与策略代次不符
    时整份作废：改密码由 `save` 清空，漏清的旧文件也不会放行旧行。
    """

    def __init__(self, path: Path):
        self.path = path

    def _read(self) -> dict:
        try:
            stat = self.path.stat()
        except FileNotFoundError:
            return _empty("")
        signature = (stat.st_mtime_ns, stat.st_size, stat.st_ino)
        with _CACHE_LOCK:
            cached = _CACHE.get(self.path)
        if cached and cached[0] == signature:
            return cached[1]
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            if (not isinstance(data.get("revision"), str) or not isinstance(data.get("sessions"), dict)
                    or not isinstance(data.get("revoked"), dict)):
                raise ValueError("invalid sessions")
            data["sessions"] = {key: row for key, row in data["sessions"].items()
                                if isinstance(row, dict) and _FIELDS <= row.keys()
                                and all(type(row[field]) is int for field in ("created_at", "last_seen", "expires"))}
            data["revoked"] = {key: expires for key, expires in data["revoked"].items() if type(expires) is int}
        except (OSError, ValueError, AttributeError):
            # 读不出来就当作没有记录：新令牌一律不认，宁可重新登录也不放过已撤销的设备。
            data = _empty("")
        with _CACHE_LOCK:
            _CACHE[self.path] = (signature, data)
        return data

    def _update(self, revision: str, change, *, authoritative: bool, timeout: float = 5) -> bool:
        """在锁内重读、清掉过期行再改。非权威写入（补登、最近活动）遇到别的代次就放弃，
        免得一个读到旧策略的请求把改密码后的新记录冲掉。"""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with FileLock(str(self.path.with_suffix(".lock")), timeout=timeout):
            data = self._read()
            if data["revision"] != revision:
                if data["revision"] and not authoritative:
                    return False
                data = _empty(revision)
            now = time.time()
            data = {"revision": revision,
                    "sessions": {key: dict(row) for key, row in data["sessions"].items() if row["expires"] > now},
                    "revoked": {key: expires for key, expires in data["revoked"].items() if expires > now}}
            if change(data, now) is False:
                return False
            if len(data["sessions"]) > _LIMIT:
                keep = sorted(data["sessions"].items(), key=lambda item: item[1]["last_seen"])[-_LIMIT:]
                data["sessions"] = dict(keep)
            atomic_write_text(self.path, json.dumps(data, ensure_ascii=False, indent=1) + "\n", mode=0o600)
        with _CACHE_LOCK:
            _CACHE.pop(self.path, None)
        return True

    @staticmethod
    def _row(now: float, expires: int, device: str, network: str, remote: bool, legacy: bool) -> dict:
        return {"id": secrets.token_hex(8), "device": device, "network": network, "remote": remote,
                "created_at": int(now), "last_seen": int(now), "expires": expires, "legacy": legacy}

    def add(self, revision: str, key: str, *, expires: int, device: str, network: str, remote: bool) -> None:
        def change(data, now):
            data["sessions"][key] = self._row(now, expires, device, network, remote, legacy=False)
        self._update(revision, change, authoritative=True)

    def check(self, revision: str, key: str, *, expires: int, legacy: bool,
              device: str, network: str, remote: bool) -> bool:
        data = self._read()
        current = data["revision"] == revision
        row = data["sessions"].get(key) if current else None
        if row is None:
            if not legacy or (current and key in data["revoked"]):
                return False

            def register(data, now):
                if key in data["revoked"]:
                    return False
                data["sessions"].setdefault(key, self._row(now, expires, device, network, remote, legacy=True))
            # 补登失败照旧放行：它在升级前本来就有效，下一个请求会再试着登记。
            try:
                self._update(revision, register, authoritative=False, timeout=0)
            except OSError:
                pass
            return True
        if time.time() - row["last_seen"] >= ACTIVITY_INTERVAL:
            def touch(data, now):
                if key not in data["sessions"]:
                    return False
                data["sessions"][key].update(last_seen=int(now), device=device or data["sessions"][key]["device"],
                                             network=network, remote=remote)
            try:
                self._update(revision, touch, authoritative=False, timeout=0)
            except OSError:
                pass
        return True

    def rows(self, revision: str, current: str = "") -> list[dict]:
        data = self._read()
        if data["revision"] != revision:
            return []
        now = time.time()
        rows = [{"id": row["id"], "device": row["device"], "network": row["network"], "remote": row["remote"],
                 "created_at": row["created_at"], "last_seen": row["last_seen"], "expires": row["expires"],
                 "legacy": row["legacy"], "current": key == current}
                for key, row in data["sessions"].items() if row["expires"] > now]
        return sorted(rows, key=lambda row: (not row["current"], -row["last_seen"]))

    def revoke(self, revision: str, *, session_id: str = "", keep: str = "") -> int:
        """撤销一行（`session_id`）或除 `keep` 以外的全部；返回撤销了几台。"""
        if session_id and not _ID.fullmatch(session_id):
            return 0
        removed = []

        def change(data, now):
            for key, row in list(data["sessions"].items()):
                if (row["id"] == session_id) if session_id else key != keep:
                    del data["sessions"][key]
                    removed.append(key)
                    if row["legacy"]:
                        data["revoked"][key] = row["expires"]
            return bool(removed)
        self._update(revision, change, authoritative=False)
        return len(removed)

    def reset(self, revision: str) -> None:
        self._update(revision, lambda data, now: data.update(_empty(revision)), authoritative=True)
