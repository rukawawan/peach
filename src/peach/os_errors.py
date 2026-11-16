"""带 code 的系统错误：仍是原来的内置类型，并保留 `errno`、`strerror`、`filename`。

`user_messages.UserOSError` 只收一句文字，`errno` 是 None；按 `errno` 区分断线、超时与路径错误的
调用方（`task_retry.transient_delay`、SMB 传输的 `PATH_ERRNOS`）需要原样的错误号，就用这里的类型。
`strerror` 与 `.message` 都是按 zh-CN 渲染的原句，`str()` 与内置类型的写法一致。
"""
from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from .user_messages import UserFacingError, UserOSError, UserPermissionError, UserTimeoutError


class _WithErrno:
    """先按 code 渲染原句，再把错误号、原句与文件名交给 `OSError` 重新初始化。"""

    def __init__(self, number: int, code: str, params: Mapping[str, Any] | None = None,
                 filename: str | None = None) -> None:
        super().__init__(code, params)
        OSError.__init__(self, number, self.message, *(() if filename is None else (filename,)))


class CodedOSError(_WithErrno, UserOSError):
    """带错误号的 `OSError`。错误号要选内置类型不会自动映射到子类的那些（如 `EIO`、`ENETDOWN`）。"""


class CodedPermissionError(_WithErrno, UserPermissionError):
    """带错误号的 `PermissionError`。"""


class CodedTimeoutError(_WithErrno, UserTimeoutError):
    """带错误号的 `TimeoutError`。"""


class UserFileNotFoundError(UserFacingError, FileNotFoundError):
    """给人看的「没找到」；仍是 `FileNotFoundError`，按它接住回 404 的调用方照旧。"""


class UserFileExistsError(UserFacingError, FileExistsError):
    """给人看的「已存在」；仍是 `FileExistsError`。"""
