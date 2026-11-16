"""DMM 同号特典版：商品号判定，以及通常版页面问一次 DMM 有没有对应的特典版。

SOD 的特典版在通常版商品号后加 `v`（`1sdjs00304v`，官方番号 SDJS-304-V），内容是通常版正片加特典映像，
番号归到通常版（`sources.dmm.code_from_cid`）。浏览器入库时用户可以指定要哪一版，挑种子按它优先。
"""
from __future__ import annotations

import re
import threading
import time
from collections import OrderedDict
from pathlib import Path

#: 特典版商品号：通常版商品号（数字或 `h_数字` 目录头、字母段、序号）后紧跟一个 `v`。
_BONUS_CID = re.compile(r"(?:h_\d+|\d+)?[a-z]+\d+v")
#: 能有特典版的通常版商品号：序号后没有尾字母。`1dandy00851c` 这类带尾字母的是另一部作品，不问。
_REGULAR_CID = re.compile(r"(?:h_\d+|\d+)?[a-z]+\d+")
EXISTS_QUERY = "query PeachEdition($id: ID!) { ppvContent(id: $id) { id } }"
#: 每个商品号的答案留在进程里；同一部作品的页面反复打开不再问 DMM。
CACHE_LIMIT = 4096
#: 问不到（地区限制、超时、限流）时这段时间内不再问，识别照常只给一个添加按钮。
FAILURE_PAUSE = 600.0
TIMEOUT = 5.0


def bonus_cid(cid: str) -> bool:
    return bool(_BONUS_CID.fullmatch(str(cid or "").lower()))


class EditionProbe:
    """问 DMM 通常版商品号有没有对应的特典版；任何失败都按「没有」答，不影响识别。"""

    def __init__(self, secrets_root: Path, *, transport_factory=None, clock=time.monotonic):
        self.secrets_root = Path(secrets_root)
        self.transport_factory = transport_factory
        self.clock = clock
        self.lock = threading.Lock()
        self.answers: OrderedDict[str, bool] = OrderedDict()
        self.paused_until = 0.0

    def __call__(self, cid: str) -> bool:
        cid = str(cid or "").lower()
        if not _REGULAR_CID.fullmatch(cid):
            return False
        with self.lock:
            if cid in self.answers:
                self.answers.move_to_end(cid)
                return self.answers[cid]
            if self.clock() < self.paused_until:
                return False
        try:
            exists = self._ask(cid + "v")
        except Exception:  # noqa: BLE001 - 探测只决定多不多一个按钮，失败一律按没有特典版处理。
            with self.lock:
                self.paused_until = self.clock() + FAILURE_PAUSE
            return False
        with self.lock:
            self.answers[cid] = exists
            while len(self.answers) > CACHE_LIMIT:
                self.answers.popitem(last=False)
        return exists

    def _ask(self, cid: str) -> bool:
        from .scraping_access import SourceTransport
        from .sources.base import Session
        from .sources.dmm import DmmSource

        transport = (self.transport_factory() if self.transport_factory else SourceTransport(
            self.secrets_root, max_requests=1, max_bytes=64 * 1024, max_seconds=TIMEOUT, allow_browser=False))
        source = DmmSource()
        session = Session(transport, deadline=time.monotonic() + TIMEOUT)
        try:
            with source.holding(session):
                data = source.graphql(EXISTS_QUERY, {"id": cid}, session=session)
        finally:
            close = getattr(transport, "close", None)
            if callable(close):
                close()
        item = data.get("ppvContent")
        return isinstance(item, dict) and item.get("id") == cid
