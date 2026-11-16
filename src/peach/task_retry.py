"""搜索和入库后处理的有限重试策略，不重新提交已接受的云下载。"""
from __future__ import annotations

import errno
import math
import sqlite3
import ssl
import time
from email.utils import parsedate_to_datetime

import httpx

from .user_messages import UserFacingError

RETRY_DELAYS = (60.0, 300.0, 1800.0)
TRANSIENT_STATUS = frozenset({408, 425, 429, 500, 502, 503, 504})


#: 转述别处已经写好的一句话（采集状态里的报错、下载渠道的原因）时用的 code，模板只有 `{{message}}`。
RELAYED = "errors.taskRetry.relayed"


class RetryableTaskError(UserFacingError, RuntimeError):
    """底层已经确认属于暂时故障，保留来源要求的最早重试间隔。"""

    def __init__(self, code: str, params=None, *, after: float = 0):
        super().__init__(code, params)
        self.after = after


class RetryableIOError(UserFacingError, OSError):
    """文件服务已确认的暂时故障，仍沿用整理器的 OSError 契约。"""

    def __init__(self, code: str, params=None, *, after: float = 0):
        super().__init__(code, params)
        self.after = after


def transient_delay(error: BaseException) -> float | None:
    """返回来源要求的间隔；None 表示同样的输入不应自动重试。"""
    from .sources.base import FailureReason, SourceFailure
    from .metadata import MetadataProviderError
    cause = error
    for _ in range(8):
        if isinstance(cause, ssl.SSLCertVerificationError):
            return None
        cause = cause.__cause__
        if cause is None:
            break
    if isinstance(error, (RetryableTaskError, RetryableIOError)):
        return error.after
    if isinstance(error, SourceFailure):
        if error.reason == FailureReason.RATE_LIMITED:
            return 900.0
        return 0.0 if error.reason in {
            FailureReason.NETWORK, FailureReason.TIMEOUT, FailureReason.SERVER_ERROR} else None
    if isinstance(error, MetadataProviderError):
        return (900.0 if error.detail == 'rate_limited' else 0.0) if error.retryable else None
    if isinstance(error, httpx.HTTPStatusError):
        if error.response.status_code not in TRANSIENT_STATUS:
            return None
        raw = error.response.headers.get('Retry-After', '')
        try:
            delay = float(raw) if raw.isdecimal() else parsedate_to_datetime(raw).timestamp() - time.time()
            if math.isfinite(delay):
                return max(0.0, delay)
        except (TypeError, ValueError, OverflowError):
            pass
        return 900.0 if error.response.status_code == 429 else 0.0
    if isinstance(error, httpx.TransportError):
        return 0.0
    if isinstance(error, sqlite3.OperationalError):
        code = getattr(error, 'sqlite_errorcode', 0)
        return 0.0 if code & 255 in {sqlite3.SQLITE_BUSY, sqlite3.SQLITE_LOCKED} else None
    if isinstance(error, (ConnectionError, TimeoutError)):
        return 0.0
    if isinstance(error, OSError):
        return 0.0 if error.errno in {
            errno.EAGAIN, errno.EBUSY, errno.ETIMEDOUT, errno.ECONNRESET, errno.ECONNREFUSED,
            errno.ENETDOWN, errno.ENETUNREACH, errno.EHOSTUNREACH,
        } or getattr(error, 'winerror', None) in {21, 32, 33, 53, 64, 121, 1231, 1232} else None
    return None


def retry_delay(error: BaseException, completed_retries: int) -> float | None:
    delay = transient_delay(error)
    return max(RETRY_DELAYS[completed_retries], delay) if delay is not None and completed_retries < len(RETRY_DELAYS) else None
