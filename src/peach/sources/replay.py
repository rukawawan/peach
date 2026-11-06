"""来源录制回放：把一次真实查询的请求与响应存成一份录制（cassette），测试离线回放同一次查询。

两个部件都实现 `HttpTransport` 的调用形状，套在 `Session` 里用，站的 `fetch` / `parse` 与 `_fetch` 的
分档一行不改：

- `ReplayTransport`：按「方法 + 规范化 URL + 请求体哈希」查表交回录下的响应，不比请求头。查不到就抛
  `ReplayMiss`，测试据此失败；它不持有任何网络客户端，测试只构造它，所以回放绝不联网。
- `RecordingTransport`：包住真实传输（`scraping_access.SourceTransport`），原样转交请求并把响应记下。
  只由 `scripts/record_source_fixtures.py` 构造；库代码里没有按环境变量切到录制的开关。

录制只存回放需要的东西：响应只留状态、最终地址与 `content-type`，不存 `Set-Cookie`；请求只存匹配键，
请求头（含 Cookie）不进文件。图片只存尺寸与哈希，回放时生成同尺寸的灰图；视频只存字节数。
网页正文由录制脚本按 `minimize` 去掉与解析无关的区块、按 `redact` 换掉凭据值，再核对去前去后
解析结果一致才落盘。录制格式见 `docs/TESTING.md`「来源录制回放」。
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from ..http import HttpRequest, HttpResponse

#: 录制格式的版本。字段含义变了才升。
FORMAT = 1
#: 凭据值、CSRF 令牌换成的固定假值。
REDACTED = "PEACH-REDACTED"
#: 短于这个长度的凭据片段不替换：`1`、`ja` 这类值会把正文里无关的字一并换掉。
MIN_SECRET = 8

_TEXT_TYPES = ("text/", "application/json", "application/javascript", "application/xml",
               "application/xhtml+xml", "application/graphql-response+json")


class ReplayMiss(AssertionError):
    """回放时遇到录制里没有的请求：解析器改了取页方式，或录制已过期，要重新录。"""


def normalize_url(url: str) -> str:
    """规范化 URL：scheme 与主机小写、查询参数排序、去掉 fragment；路径原样保留。"""
    parts = urlsplit(url)
    query = urlencode(sorted(parse_qsl(parts.query, keep_blank_values=True)))
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path or "/", query, ""))


def request_key(method: str, url: str, body: bytes | None) -> tuple[str, str, str]:
    """一条请求的匹配键。请求头不进键：Cookie、User-Agent、Accept-Language 变了不该让回放失配。"""
    digest = hashlib.sha256(body).hexdigest() if body else ""
    return method.upper(), normalize_url(url), digest


def _content_type(headers: Mapping[str, str]) -> str:
    for key, value in headers.items():
        if key.lower() == "content-type":
            return str(value)
    return ""


def _is_text(content_type: str) -> bool:
    kind = content_type.split(";", 1)[0].strip().lower()
    return any(kind.startswith(prefix) for prefix in _TEXT_TYPES) or kind.endswith("+json")


def _image_shape(body: bytes) -> dict[str, Any]:
    from PIL import Image, UnidentifiedImageError
    shape: dict[str, Any] = {"bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()}
    try:
        with Image.open(io.BytesIO(body)) as image:
            shape.update(width=image.width, height=image.height, format=image.format or "")
    except (UnidentifiedImageError, OSError):
        pass
    return shape


def _stand_in_image(shape: Mapping[str, Any]) -> bytes:
    """同尺寸、同格式的灰图。量尺寸的代码看到的宽高与录制时一致，像素不是原图。"""
    from PIL import Image
    width, height = int(shape.get("width") or 0), int(shape.get("height") or 0)
    if not width or not height:
        return b""
    kind = str(shape.get("format") or "JPEG").upper()
    image = Image.new("RGB", (width, height), (128, 128, 128))
    out = io.BytesIO()
    image.save(out, format=kind if kind in {"JPEG", "PNG", "WEBP", "GIF"} else "JPEG")
    return out.getvalue()


def encode_response(response: HttpResponse) -> dict[str, Any]:
    """一条响应进录制的样子：文本存正文，图片只存尺寸与哈希，视频只存字节数，其余按 base64。"""
    content_type = _content_type(response.headers)
    out: dict[str, Any] = {"status": response.status, "url": response.url or ""}
    if content_type:
        out["content_type"] = content_type
    location = next((value for key, value in response.headers.items() if key.lower() == "location"), "")
    if location:
        out["location"] = location
    kind = content_type.split(";", 1)[0].strip().lower()
    if kind.startswith("image/"):
        out["image"] = _image_shape(response.body)
    elif kind.startswith("video/"):
        out["video"] = {"bytes": len(response.body)}
    elif _is_text(content_type) or not content_type:
        try:
            out["text"] = response.body.decode("utf-8")
        except UnicodeDecodeError:
            out["base64"] = base64.b64encode(response.body).decode("ascii")
    else:
        out["base64"] = base64.b64encode(response.body).decode("ascii")
    return out


def decode_response(row: Mapping[str, Any]) -> HttpResponse:
    headers: dict[str, str] = {}
    if row.get("content_type"):
        headers["content-type"] = str(row["content_type"])
    if row.get("location"):
        headers["location"] = str(row["location"])
    if "text" in row:
        body = str(row["text"]).encode("utf-8")
    elif "base64" in row:
        body = base64.b64decode(row["base64"])
    elif "image" in row:
        body = _stand_in_image(row["image"])
    else:
        body = b""
    return HttpResponse(int(row["status"]), headers, body, str(row.get("url") or ""))


@dataclass
class Cassette:
    """一份录制：一站、一个番号、一次 `query` 的全部交互，以及录制当日的结局。

    `outcome` 是 `ok` 或 `FailureReason` 的值；`ok` 时 `payload` 是 `SiteRecord.payload()` 经 JSON 往返后的样子，
    失败时 `failure` 记细档与措辞。回放测试把同一次查询的结局与它逐项比对。
    """

    source: str
    code: str
    recorded: str = ""
    note: str = ""
    outcome: str = ""
    payload: dict[str, Any] | None = None
    failure: dict[str, str] | None = None
    interactions: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def load(cls, path: Path) -> Cassette:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        if raw.get("format") != FORMAT:
            raise ValueError(f"{path} 的录制格式是 {raw.get('format')!r}，当前只认 {FORMAT}")
        return cls(source=raw["source"], code=raw["code"], recorded=raw.get("recorded", ""),
                   note=raw.get("note", ""), outcome=raw["outcome"], payload=raw.get("payload"),
                   failure=raw.get("failure"), interactions=list(raw.get("interactions") or []))

    def dump(self) -> str:
        data: dict[str, Any] = {"format": FORMAT, "source": self.source, "code": self.code,
                                "recorded": self.recorded}
        if self.note:
            data["note"] = self.note
        data["outcome"] = self.outcome
        if self.payload is not None:
            data["payload"] = self.payload
        if self.failure is not None:
            data["failure"] = self.failure
        data["interactions"] = self.interactions
        return json.dumps(data, ensure_ascii=False, indent=1) + "\n"

    def add(self, request: HttpRequest, response: HttpResponse) -> None:
        method, url, digest = request_key(request.method, request.url, request.body)
        if any(_key(row) == (method, url, digest) for row in self.interactions):
            return
        row: dict[str, Any] = {"method": method, "url": url}
        if digest:
            row["body_sha256"] = digest
        row["response"] = encode_response(response)
        self.interactions.append(row)


def _key(row: Mapping[str, Any]) -> tuple[str, str, str]:
    return str(row["method"]), str(row["url"]), str(row.get("body_sha256") or "")


class ReplayTransport:
    """按录制回放。同一条请求可以命中多次（`_fetch` 重试、两步查询重复取同一页）。

    `misses` 记下全部失配的键；`unused()` 交回录了却没被问到的交互，测试据此判录制是否过期。
    """

    def __init__(self, cassette: Cassette) -> None:
        self.cassette = cassette
        self.table = {_key(row): row for row in cassette.interactions}
        self.used: set[tuple[str, str, str]] = set()
        self.misses: list[tuple[str, str, str]] = []

    def __call__(self, request: HttpRequest, timeout: float, max_bytes: int) -> HttpResponse:
        key = request_key(request.method, request.url, request.body)
        row = self.table.get(key)
        if row is None:
            self.misses.append(key)
            raise ReplayMiss(f"{self.cassette.source} {self.cassette.code} 的录制里没有 {key[0]} {key[1]}"
                             + (f"（请求体 {key[2][:12]}…）" if key[2] else "")
                             + "：解析器的取页方式变了，用 scripts/record_source_fixtures.py --update 重录")
        self.used.add(key)
        response = decode_response(row["response"])
        if max_bytes and len(response.body) > max_bytes:
            return HttpResponse(response.status, response.headers, response.body[:max_bytes], response.url)
        return response

    def unused(self) -> list[tuple[str, str, str]]:
        return [key for key in self.table if key not in self.used]


class RecordingTransport:
    """把请求原样交给 `inner`，响应记进 `cassette`。传输层的异常（连接失败、冷却、预算）原样抛出，不记。

    暴露 `inner`：`sources.base._hold` 沿这条链找 `SourceTransport.hold` 写冷却。
    """

    def __init__(self, inner: Any, cassette: Cassette) -> None:
        self.inner = inner
        self.cassette = cassette

    def __call__(self, request: HttpRequest, timeout: float, max_bytes: int) -> HttpResponse:
        response = self.inner(request, timeout, max_bytes)
        self.cassette.add(request, response)
        return response

    def close(self) -> None:
        if callable(getattr(self.inner, "close", None)):
            self.inner.close()


#: 与解析无关、体积大的区块。`<script>` 只去掉外链与普通内联脚本，带 `id` 或 JSON 类型的保留：
#: AVBase 的数据在 `<script id="__NEXT_DATA__" type="application/json">` 里。
_DROP_BLOCKS = (
    re.compile(r"<!--.*?-->", re.S),
    re.compile(r"<style\b[^>]*>.*?</style\s*>", re.S | re.I),
    re.compile(r"<svg\b[^>]*>.*?</svg\s*>", re.S | re.I),
    re.compile(r"<noscript\b[^>]*>.*?</noscript\s*>", re.S | re.I),
    re.compile(r"<script\b(?![^>]*\bid=)(?![^>]*json)[^>]*>.*?</script\s*>", re.S | re.I),
    re.compile(r"<link\b[^>]*>", re.I),
    re.compile(r"<iframe\b[^>]*>.*?</iframe\s*>", re.S | re.I),
)
_BLANK_LINES = re.compile(r"\n[ \t\r\n]*\n")
_CSRF = re.compile(r'(<meta\b[^>]*\bname="(?:csrf-token|csrf-param)"[^>]*\bcontent=")[^"]*(")', re.I)
_HIDDEN_TOKEN = re.compile(
    r'(<input\b[^>]*\bname="(?:authenticity_token|_token|csrf_token)"[^>]*\bvalue=")[^"]*(")', re.I)


def minimize(text: str) -> str:
    """去掉网页里与解析无关的区块，压掉连续空行。只是候选：录制脚本核对解析结果不变才采用。"""
    for pattern in _DROP_BLOCKS:
        text = pattern.sub("", text)
    return _BLANK_LINES.sub("\n", text)


def secret_pieces(values: Iterable[str]) -> list[str]:
    """凭据值里要替换的片段：单个令牌整串，Cookie 头 `a=b; c=d` 与 Netscape cookie 文件里的每个值。

    Netscape 那种一行七栏、制表符分隔，只取最后一栏的值：前几栏是域名与路径，换掉会把正文里的
    站内链接一并改坏。短于 `MIN_SECRET` 的不要。
    """
    pieces: set[str] = set()
    for value in values:
        value = str(value or "").strip()
        if len(value) >= MIN_SECRET and not re.search(r"[\s;=]", value):
            pieces.add(value)
        for line in value.splitlines():
            fields = line.split("\t")
            if len(fields) >= 7:
                candidates = [fields[6]]
            elif line.lstrip().startswith("#"):
                continue
            else:
                candidates = [part.partition("=")[2] for part in line.split(";")]
            pieces.update(piece.strip() for piece in candidates if len(piece.strip()) >= MIN_SECRET)
    return sorted(pieces, key=len, reverse=True)


#: 登录态页面里的账号标识：Discuz 系（JavBus 的会员区）的 `uid=` 与 `formhash=`。
_ACCOUNT = re.compile(r"\b(uid|formhash)=([0-9A-Za-z]+)")


def redact(text: str, secrets: Iterable[str]) -> str:
    """把凭据片段、CSRF 令牌与账号标识换成 `REDACTED`（数字编号换成 `0`）。"""
    for piece in secrets:
        text = text.replace(piece, REDACTED)
    text = _CSRF.sub(rf"\g<1>{REDACTED}\g<2>", text)
    text = _HIDDEN_TOKEN.sub(rf"\g<1>{REDACTED}\g<2>", text)
    return _ACCOUNT.sub(lambda found: f"{found.group(1)}={'0' if found.group(2).isdigit() else REDACTED}", text)


def rewrite_texts(cassette: Cassette, change, *, urls: bool = False) -> Cassette:
    """交回一份副本：每条文本响应的正文经 `change` 改写，`urls` 时响应的最终地址也改。

    请求那一侧的地址是匹配键，不改：凭据出现在请求地址里时录制脚本直接拒绝落盘。
    """
    rows = []
    for row in cassette.interactions:
        response = dict(row["response"])
        if "text" in response:
            response["text"] = change(response["text"])
        if urls and response.get("url"):
            response["url"] = change(response["url"])
        rows.append({**row, "response": response})
    return Cassette(source=cassette.source, code=cassette.code, recorded=cassette.recorded, note=cassette.note,
                    outcome=cassette.outcome, payload=cassette.payload, failure=cassette.failure,
                    interactions=rows)


def outcome_of(source: str, code: str, transport: Any) -> tuple[str, dict | None, dict | None]:
    """用 `transport` 跑一次 `SITE_SOURCES[source]().query(code)`，交回（结局、payload、失败）。

    payload 经 JSON 往返，元组成了列表，与录制文件里的样子可以直接比。传输层的异常（`ReplayMiss`、
    连接失败、冷却、预算）不在这里接，原样抛给调用方。
    """
    from . import SITE_SOURCES
    from .base import Session, SourceFailure
    try:
        record = SITE_SOURCES[source]().query(code, session=Session(transport))
    except SourceFailure as failure:
        return failure.reason.value, None, {"reason": failure.reason.value, "message": failure.message}
    return "ok", json.loads(json.dumps(record.payload(), ensure_ascii=False)), None
