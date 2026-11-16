"""发给界面的一句话：稳定的 `message_code` 与插值参数 `message_params`（ADR-0156 第三条、ADR-0159）。

文字只在 `resources/locales/<语言>/server.json` 的 `<message_code>`。前端按它取当前界面语言的译文；
同一层的 `message`（成功）或 `error`（失败）是按 zh-CN 渲染的一句，给还不认 code 的调用方兜底。
不用 `code` 这个名字：响应里的 `code` 已普遍表示番号。
"""
from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from . import interface_text


class UserFacingError(Exception):
    """给人看的错误。`api.py` 统一转成 `{"error", "message_code", "message_params"}`。

    `code` 是 `server` 命名空间里的键，写进去就不再改；`params` 填进文字里的 `{{名字}}`。
    领域异常可以继承它，同时继承原来的 `ValueError` 等基类，让还按旧基类捕获的调用方不受影响。
    """

    status_code = 400

    def __init__(self, code: str, params: Mapping[str, Any] | None = None, *,
                 status_code: int | None = None) -> None:
        self.code = code
        self.params = dict(params or {})
        self.message = interface_text.text(f"server:{code}", self.params)
        super().__init__(self.message)
        if status_code is not None:
            self.status_code = status_code

    def __reduce__(self):
        # pickle 与 copy 按状态复制：默认写法拿 `args`（渲染好的原句）重新构造，会把原句当成 code 去查。
        state = self.__dict__.copy()
        if isinstance(self, OSError):
            # errno 一组字段存在异常对象的 C 结构里，不在 `__dict__`。
            state["__oserror__"] = (self.errno, self.strerror, self.filename)
        return _restore, (type(self), state, self.args)


def _restore(cls, state, args):
    error = cls.__new__(cls)
    oserror = state.pop("__oserror__", None)
    error.__dict__.update(state)
    error.args = args
    if oserror is not None:
        error.errno, error.strerror, error.filename = oserror
    return error


class UserValueError(UserFacingError, ValueError):
    """输入或状态不对、要告诉用户的错误。仍是 `ValueError`：按 `except ValueError` 捕获的调用方照旧接得住，
    再用 `error_fields` 或 `error_detail` 把 code 带进响应。"""


class UserRuntimeError(UserFacingError, RuntimeError):
    """运行到一半做不下去、要告诉用户原因的错误；仍是 `RuntimeError`。"""


class UserPermissionError(UserFacingError, PermissionError):
    """权限或身份不对；仍是 `PermissionError`。"""


class UserOSError(UserFacingError, OSError):
    """文件、目录或挂载读写不了；仍是 `OSError`。"""


class UserTimeoutError(UserFacingError, TimeoutError):
    """等太久没有结果；仍是 `TimeoutError`。"""


class UserInterruptedError(UserFacingError, InterruptedError):
    """任务被停下时给人看的原因；仍是 `InterruptedError`，按停止信号捕获的地方照旧。"""


def message_fields(code: str, params: Mapping[str, Any] | None = None, *, key: str = "message") -> dict[str, Any]:
    """一句界面文字的响应字段。`key` 是兜底原文所在的键：成功用 `message`，失败用 `error`。"""
    values = dict(params or {})
    return {key: interface_text.text(f"server:{code}", values), "message_code": code, "message_params": values}


def error_fields(error: BaseException) -> dict[str, Any]:
    """把异常写成失败响应的字段：`UserFacingError` 带上 code，别的异常照旧只给原文。"""
    if isinstance(error, UserFacingError):
        return message_fields(error.code, error.params, key="error")
    return {"error": str(error)}


def nested_message(error: BaseException) -> dict[str, Any] | str:
    """把异常当作另一句的参数：带 code 的写成嵌套参数 `{"code", "params"}`，后端 `interface_text.text`
    与前端 `serverLabel` 按外面那句的语言一起渲染；别的异常照旧是原文。"""
    if isinstance(error, UserFacingError):
        return {"code": error.code, "params": dict(error.params)}
    return str(error)


def response_status(error: UserFacingError) -> int:
    """带 code 的报错漏到接口层时回的 HTTP 状态。

    有的异常类的 `status_code` 记的是上游网站的状态（资料来源抓取，常为 0），那种类用 `response_status`
    声明自己在接口层的状态；超出 400–599 的一律按 500 处理。"""
    status = getattr(error, "response_status", None) or getattr(error, "status_code", 400)
    return status if isinstance(status, int) and 400 <= status < 600 else 500


def failure_fields(error: BaseException) -> dict[str, Any]:
    """任务失败时写进任务行的报错：带 code 的写原句与 `error_code`／`error_params`，
    别的异常照旧写「类名: 原文」，排查时看得出是哪一类故障。展开给 `finish(...)`。"""
    if isinstance(error, UserFacingError):
        return {"error": error.message, "error_code": error.code, "error_params": dict(error.params)}
    return {"error": f"{type(error).__name__}: {error}"}


def error_detail(error: BaseException) -> str | dict[str, Any]:
    """`HTTPException(status, error_detail(error))`：带 code 的异常写成 `api.py` 认得的字典明细
    （`message` 是兜底原文，code 与参数原样带给页面），别的异常照旧只给原文。"""
    if isinstance(error, UserFacingError):
        return message_fields(error.code, error.params)
    return str(error)
