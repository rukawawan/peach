"""外网连通的周期快照：探测按 Peach 代理设置出网，接口只读最近一次结论。

节律与复查沿用 `mount_reachability`：正常十分钟、异常一分钟，一次否定隔一秒复查后才确认。
探测目标是操作系统自己的联网检测地址，国内外都能直连，响应正文固定，被认证页劫持时对不上。
"""
from __future__ import annotations

import threading
import time

import httpx

from . import peach_proxy

HEALTHY_INTERVAL = 600.0
DEGRADED_INTERVAL = 60.0
PROBE_TIMEOUT = 5.0
#: (地址, 正文必须包含的字节)。任一个对上就算联网。
TARGETS = (
    ("http://www.msftconnecttest.com/connecttest.txt", b"Microsoft Connect Test"),
    ("http://captive.apple.com/hotspot-detect.html", b"Success"),
)


def probe(timeout: float = PROBE_TIMEOUT) -> bool | None:
    """联网回 True，连不上回 False；Peach 代理设置本身待选时回 None。"""
    try:
        client = peach_proxy.http_client(timeout=timeout, follow_redirects=False)
    except ValueError:
        return None
    with client:
        for url, marker in TARGETS:
            try:
                response = client.get(url)
            except httpx.HTTPError:
                continue
            if response.status_code == 200 and marker in response.content[:4096]:
                return True
    return False


class NetworkReachability:
    """后台线程按节律探测；`refresh()` 让下一轮立即开始，用于代理设置刚保存时。

    `on_recovered` 在判过 `offline` 之后第一次判回 `online` 时调一次，在探测所在的线程里跑；
    中间夹着的 `unknown` 不算恢复也不算断开。它回 `False` 时这次恢复不算用掉。
    """

    def __init__(self, *, check=probe, wall_clock=time.time, retry_delay=1.0, on_recovered=None):
        self.check, self.wall_clock, self.retry_delay = check, wall_clock, retry_delay
        self.on_recovered = on_recovered
        self._state, self._checked_at = "checking", None
        self._down = False
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._wake = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        with self._lock:
            if self._thread is not None or self._stop.is_set():
                return
            self._thread = threading.Thread(target=self._loop, name="PeachNetworkStatus", daemon=True)
            self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._wake.set()
        thread = self._thread
        if thread is not None:
            thread.join(timeout=2)

    def refresh(self) -> None:
        self._wake.set()

    def _loop(self) -> None:
        while not self._stop.is_set():
            self._wake.clear()
            state = self.tick()
            self._wake.wait(HEALTHY_INTERVAL if state == "online" else DEGRADED_INTERVAL)

    def tick(self) -> str:
        try:
            result = self.check()
            if result is False and not self._stop.wait(self.retry_delay):
                result = self.check()
        except Exception:
            # 未知异常不能当作两次连不上的证据。
            result = None
        state = {True: "online", False: "offline"}.get(result, "unknown")
        with self._lock:
            self._state, self._checked_at = state, self.wall_clock()
            recovered = self._down and state == "online"
            if state != "unknown":
                self._down = state == "offline"
        # 回调在锁外：它多半要回头读 `summary()`。回 False 表示现在接不了，下次判回联网再通知。
        if recovered and self.on_recovered is not None and self.on_recovered() is False:
            with self._lock:
                self._down = True
        return state

    def summary(self) -> dict:
        with self._lock:
            return {"state": self._state, "checked_at": self._checked_at}
