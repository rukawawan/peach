"""后端读界面文字（ADR-0159）：唯一来源是 `resources/locales/<语言>/<命名空间>.json`。

后端只写 code 和参数，需要一句完整的话时（接口里给旧前端兜底的 `message`、托盘、通知）由这里渲染。
渲染只支持 i18next 写法的一个子集：`{{name}}` 插值与点号分隔的嵌套键；`server` 命名空间不用复数后缀
与格式选项，测试核对。语言缺这一条时回落到 zh-CN；两边都没有时抛 `KeyError`，不拿键名冒充文字。
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from .project_root import PROJECT_ROOT

SOURCE_LANGUAGE = "zh-CN"
LOCALES = PROJECT_ROOT / "resources" / "locales"
_PLACEHOLDER = re.compile(r"\{\{\s*([A-Za-z_][\w-]*)\s*\}\}")


class InterfaceTextMissing(RuntimeError):
    """语言资源目录不在：安装包缺了 `resources/locales/`。"""


@lru_cache(maxsize=None)
def _namespace(root: Path, language: str, namespace: str) -> dict:
    path = root / language / f"{namespace}.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}


def _lookup(tree: dict, key: str):
    node = tree
    for part in key.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node if isinstance(node, str) else None


def template(key: str, language: str = SOURCE_LANGUAGE, *, root: Path = LOCALES) -> str:
    """`<命名空间>:<键>` 对应的原始模板。"""
    namespace, _, name = key.partition(":")
    if not name:
        raise KeyError(f"interface text keys look like <namespace>:<key>: {key}")
    for candidate in dict.fromkeys((language, SOURCE_LANGUAGE)):
        found = _lookup(_namespace(root, candidate, namespace), name)
        if found is not None:
            return found
    raise KeyError(key)


def has(key: str, language: str = SOURCE_LANGUAGE, *, root: Path = LOCALES) -> bool:
    try:
        template(key, language, root=root)
    except KeyError:
        return False
    return True


def nested(value) -> bool:
    """参数值是不是另一句带 code 的话：`{"code": "<server 键>", "params": {...}}`，`params` 可省。"""
    return (isinstance(value, dict) and isinstance(value.get("code"), str) and set(value) <= {"code", "params"}
            and isinstance(value.get("params", {}), dict))


def text(key: str, params: dict | None = None, language: str = SOURCE_LANGUAGE, *, root: Path = LOCALES) -> str:
    """渲染一句界面文字。模板里用到、参数里没给的占位符原样留着，便于在界面上一眼看出漏传。
    参数值是 `nested` 那种形状且资源里有那一句时，先按同一语言渲染那一句再填进去；列表与元组逐项这样渲染，
    再按同一语言的 `labels.listSeparator` 连起来（前端 `serverLabel` 的 `joinList` 同样处理）；别的值照旧 `str()`。"""
    values = params or {}

    def item(value) -> str:
        if nested(value) and has(f"server:{value['code']}", language, root=root):
            return text(f"server:{value['code']}", value.get("params"), language, root=root)
        return str(value)

    def fill(match: re.Match) -> str:
        if match[1] not in values:
            return match[0]
        value = values[match[1]]
        if isinstance(value, (list, tuple)):
            return list_separator(language, root=root).join(map(item, value))
        return item(value)

    return _PLACEHOLDER.sub(fill, template(key, language, root=root))


def list_separator(language: str = SOURCE_LANGUAGE, *, root: Path = LOCALES) -> str:
    """并列几项之间的分隔符（`labels.listSeparator`）；`root` 里没有这一条（开发工具的 `scripts/locales`）时
    用产品资源里的同一条，都没有时用英文逗号。"""
    key = "server:labels.listSeparator"
    for candidate in dict.fromkeys((root, LOCALES)):
        if has(key, language, root=candidate):
            return template(key, language, root=candidate)
    return ", "


def ensure_available(root: Path = LOCALES) -> None:
    """启动与健康检查用：源语言的 `server` 命名空间必须读得到。"""
    if not (root / SOURCE_LANGUAGE / "server.json").is_file():
        raise InterfaceTextMissing(f"interface text resources are missing: {root}")


def label(key: str, fallback: str, params: dict | None = None, language: str = SOURCE_LANGUAGE) -> str:
    """有这一条就渲染，没有就用 `fallback`：登记表之外的 id（如别处新加的任务种类）照原样显示。"""
    return text(key, params, language) if has(key, language) else fallback


def local_language(environ=None) -> str:
    """在这台电脑上直接给人看的文字用哪种语言：命令行（ADR-0159 第三条）与托盘。
    `PEACH_LANGUAGE` 优先，否则跟系统显示语言（与设置页「自动」的兜底同一个判断），没有译文的语言用英文。"""
    import os
    from .system_language import interface_language, system_language
    environ = os.environ if environ is None else environ
    return interface_language(environ.get("PEACH_LANGUAGE")) or system_language() or "en"


def request_language(accept_language: str | None) -> str:
    """服务端直接出的页面（首次运行、登录、用户脚本连接页）用哪种语言：与前端界面语言选「自动」时一样，
    先按浏览器的 `Accept-Language` 依权重取第一个有译文的，没有再跟系统显示语言，都没有用英文。"""
    from .system_language import interface_language, system_language
    ranked = []
    for index, item in enumerate(str(accept_language or "").split(",")):
        tag, _, rest = item.strip().partition(";")
        weight = 1.0
        if rest.strip().startswith("q="):
            try:
                weight = float(rest.strip()[2:])
            except ValueError:
                weight = 0.0
        if tag and weight > 0:
            ranked.append((-weight, index, tag))
    for _weight, _index, tag in sorted(ranked):
        if match := interface_language(tag):
            return match
    return system_language() or "en"


def cli(key: str, params: dict | None = None, /, **values) -> str:
    """命令行的一句话：`cli` 命名空间，按 `local_language` 选语言。"""
    return text(f"cli:{key}", {**(params or {}), **values}, local_language())


#: 仓库 `scripts/` 下开发工具的文字。只在源码检出里有，不随安装包发布。
DEV_LOCALES = PROJECT_ROOT / "scripts" / "locales"


def dev(key: str, params: dict | None = None, /, **values) -> str:
    """开发工具的一句话：`scripts/locales/<语言>/dev.json`，键写成 `<脚本名>.<名字>`，按 `local_language` 选语言。"""
    return text(f"dev:{key}", {**(params or {}), **values}, local_language(), root=DEV_LOCALES)


def dev_log(key: str, params: dict | None = None, /, **values) -> str:
    """`dev` 同一个键写进日志文件的那一行：日志固定英文（ADR-0159 第三条），与控制台那一行逐句对应。"""
    return text(f"dev:{key}", {**(params or {}), **values}, "en", root=DEV_LOCALES)


def subtree(key: str, language: str = SOURCE_LANGUAGE, *, root: Path = LOCALES) -> dict:
    """`<命名空间>:<键>` 下面那一层的原始内容，键不存在时是空字典。"""
    namespace, _, name = key.partition(":")
    node = _namespace(root, language, namespace)
    for part in filter(None, name.split(".")):
        node = node.get(part, {}) if isinstance(node, dict) else {}
    return node if isinstance(node, dict) else {}
