"""按 zh-CN 渲染好、身上带着 code 与参数的一句话（ADR-0159）。

来源与采集链上有不少「给人看的一句」夹在字符串列表与字典里往下传：候选的 `warnings`、
资源搜索的提醒、来源检查的说明。`Said` 照旧是那一句 zh-CN 原文（`str`），旧调用方拿它
拼接、比较、写盘都不受影响；需要交给界面的地方再把 code 与参数取出来。

**何时用哪个。** 三样东西说的是同一种「code + 参数 + zh-CN 兜底原文」，区别在这句话怎么走到界面：

- `user_messages.message_fields(code, params, key=...)`：在出口当场写一层响应或任务状态的那一句，
  字段是 `<key>`、`message_code`、`message_params`，前端 `serverText`／`jobText` 读。报错走
  `UserFacingError`，出口用 `error_fields`、`failure_fields`，当作别句的参数用 `nested_message`。
- `Said`：这句话生成的地方离出口远，中间按 `str` 传、进列表、进数据类字段、被比较或写盘。到了出口用
  `coded(key, value)` 摆成 `<key>`、`<key>_code`、`<key>_params`（前端 `codedText(body, key)` 读），
  或用 `parallel(name, items)` 摆成与原句列表并行的 `<name>_codes`、`<name>_params`（前端
  `serverLabelList` 读）；当作另一句的参数时传 `.phrase`。能在出口直接写 code 的，不必先造 `Said`。

**它只在原样传递时带着 code。** `Said` 是 `str` 的子类，`str` 的方法都返回普通 `str`：拼接、切片、
`strip`、`format`、f-string 之后 code 就没了，得到的是那句 zh-CN 原文。`pickle`、`copy`、`deepcopy`
按 `__reduce__` 原样带着 code 与参数；`json.dumps` 只写原文（JSON 没有地方放 code），要交给界面的
先经 `coded`／`parallel` 摆成字段再序列化。

**落库。** 账本里只有一列原句的字段，旁边另有 `<列>_code`、`<列>_params` 两列：写入时用 `columns`
取出这两列的值，读出时用 `restored` 把三列还原成 `Said`，之后照样经 `coded` 交给界面。
"""
from __future__ import annotations

import json
from collections.abc import Iterable, Mapping
from typing import Any

from . import interface_text
from .user_messages import UserFacingError


class Said(str):
    """一句界面文字：值是 zh-CN 渲染的原句，`code`、`params` 给界面按当前语言重渲染。

    参数可以是另一句 `Said`（存成嵌套的 `{"code", "params"}`，前后端都按同一语言递归渲染），
    也可以是列表（`interface_text.text` 按资源里的列表分隔符连起来）。"""

    code: str
    params: dict[str, Any]

    def __new__(cls, code: str, params: Mapping[str, Any] | None = None, /, **values: Any) -> "Said":
        given = {**(params or {}), **values}
        text = super().__new__(cls, interface_text.text(f"server:{code}", given))
        text.code = code
        text.params = {name: value.phrase if isinstance(value, Said) else
                       [item.phrase if isinstance(item, Said) else item for item in value]
                       if isinstance(value, (list, tuple)) else value
                       for name, value in given.items()}
        return text

    @property
    def phrase(self) -> dict[str, Any]:
        """当作另一句的参数时的写法。"""
        return {"code": self.code, "params": dict(self.params)}

    def __reduce__(self):
        return _restore, (str(self), self.code, self.params)


def _restore(text: str, code: str, params: dict) -> Said:
    said = str.__new__(Said, text)
    said.code, said.params = code, params
    return said


def parallel(name: str, items: Iterable[object]) -> dict[str, list]:
    """与原句列表并行的 `<name>_codes`、`<name>_params`；列表里不是 `Said` 的项 code 为 `None`，
    界面照原句显示。一条带 code 的都没有时返回空字典，不往结果里加两列空值。"""
    rows = list(items)
    if not any(isinstance(item, Said) for item in rows):
        return {}
    return {f"{name}_codes": [item.code if isinstance(item, Said) else None for item in rows],
            f"{name}_params": [dict(item.params) if isinstance(item, Said) else None for item in rows]}


def coded(key: str, value: object) -> dict[str, Any]:
    """一项文字 `<key>` 与同层的 `<key>_code`、`<key>_params`（前端 `codedText` 读的写法）。"""
    if isinstance(value, Said):
        return {key: str(value), f"{key}_code": value.code, f"{key}_params": dict(value.params)}
    return {key: value}


def columns(value: object) -> tuple[str | None, str | None]:
    """落库时原句旁的两列：`Said` 写 code 与 JSON 参数，原文或 `None` 两列都是 `None`。"""
    if isinstance(value, Said):
        return value.code, json.dumps(value.params, ensure_ascii=False, default=str)
    return None, None


def restored(text: str | None, code: str | None, params: str | None) -> str | None:
    """从库里读回的一句：有 code 的还原成 `Said`（值用库里存的原句，不重渲染），没有的原样返回。
    参数列读不出来时按没有参数处理。"""
    if text is None or not code:
        return text
    try:
        values = json.loads(params) if params else {}
    except ValueError:
        values = {}
    return _restore(text, code, values if isinstance(values, dict) else {})


def from_error(error: BaseException, fallback: str | None = None) -> str:
    """把异常写成一句：带 code 的是 `Said`（值是异常的原句），别的给 `fallback`，没给就是 `str(error)`。"""
    if isinstance(error, UserFacingError):
        return _restore(error.message, error.code, dict(error.params))
    return str(error) if fallback is None else fallback
