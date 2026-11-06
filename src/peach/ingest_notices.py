"""入库通知：一部作品到了馆藏，页面弹一条 toast，点「打开」直达它。

只记两类逐部到来的事件：云下载入库并整理完成，以及推送发现（网盘通知、本机监视）登记了一个
新文件。扫描、「同步新增文件」、批量补全登记或改写的作品都不记：那是用户自己发起的批处理，
任务中心已有进度和结果，再逐部弹出来只会刷屏。云下载落地时的定向登记也不记，整理完成时那
一条才算到了。

通知只存在服务进程的内存里，最多留最近 `LIMIT` 条，页面随任务列表轮询读取。重启后序号从头
开始、`epoch` 换新，页面看到 `epoch` 变了就把这一批当作基线，不补弹。
"""
from __future__ import annotations

import secrets
import threading
import time
from collections import deque

LIMIT = 50
KINDS = frozenset({"download", "discovered"})


class IngestNotices:
    def __init__(self, limit: int = LIMIT):
        self._lock = threading.Lock()
        self._items: deque[dict] = deque(maxlen=limit)
        self._next = 1
        self.epoch = secrets.token_hex(4)

    def add(self, kind: str, asset_id: int, label: str) -> None:
        if kind not in KINDS or not isinstance(asset_id, int) or asset_id <= 0:
            return
        with self._lock:
            self._items.append({"id": self._next, "kind": kind, "asset_id": asset_id,
                                "label": str(label or "").strip()[:120], "at": int(time.time())})
            self._next += 1

    def snapshot(self) -> dict:
        with self._lock:
            return {"epoch": self.epoch, "items": list(self._items)}


#: 服务进程里只有一份：云下载整理与推送发现都在这个进程里跑，任务接口从这里读。
NOTICES = IngestNotices()
