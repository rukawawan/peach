"""正式前端包的异常类型、帧与构建映射白名单。"""
import re
import uuid

NAMES = frozenset({"Error", "TypeError", "ReferenceError", "SyntaxError", "RangeError", "URIError",
    "EvalError", "AggregateError", "DOMException", "SecurityError", "NotAllowedError", "InvalidStateError",
    "QuotaExceededError", "NotSupportedError", "TimeoutError", "NetworkError", "DataError", "OperationError"})
#: 主包按页拆出的 chunk（ADR-0118）：`peach-app.<名字>-<内容哈希>.js`，由
#: `frontend/scripts/sentry-build.ts` 的 `chunkPattern` 产出。名字里只有字母、数字、`_` 与 `-`，
#: 不含路径分隔符与 `..`；是否存在以 `web/dist/` 里的实际文件为准。服务端放行、开发文案热替换
#: 与构建检查都按它认 chunk。
BUNDLE_CHUNK_NAME = re.compile(r"peach-app\.[A-Za-z0-9_-]+\.js")
#: 正式包的文件名：主包入口、页面包，以及主包按页拆出的 chunk（形态同 `BUNDLE_CHUNK_NAME`）。
SHIPPED = r"peach-pages\.js|peach-app(?:\.[A-Za-z0-9_-]+)?\.js"
_SHIPPED = re.compile(SHIPPED)
_FRAME = re.compile(rf"(?<![\w.-])({SHIPPED})(?:\?[^\s):]*)?:(\d+):(\d+)")
#: 一个事件最多带的帧数，也是映射条目的上限。
MAX_FRAMES = 20


def environment(fields):
    """从本机已取得的 User-Agent 提取有限客户端类别，原文留在本机。"""
    browser = fields.get('browser')
    browser = browser if isinstance(browser, dict) else {}
    agent = browser.get('user_agent', fields.get('user_agent', ''))
    if not isinstance(agent, str):
        return {}
    result = {}
    for name, pattern in (('Edge', r'Edg(?:A|iOS)?/(\d{1,4})\.'),
                          ('Opera', r'OPR/(\d{1,4})\.'),
                          ('Firefox', r'(?:Firefox|FxiOS)/(\d{1,4})\.'),
                          ('Chrome', r'(?:Chrome|CriOS)/(\d{1,4})\.'),
                          ('Safari', r'Version/(\d{1,4})\..*Safari/')):
        match = re.search(pattern, agent[:512])
        if match:
            result.update(client_browser=name, client_browser_major=match[1])
            break
    for system, marker in (('Android', 'Android'), ('iOS', 'iPhone'), ('iOS', 'iPad'),
                           ('Windows', 'Windows'), ('macOS', 'Macintosh'), ('Linux', 'Linux')):
        if marker in agent[:512]:
            result['client_os'] = system
            break
    return result


def shipped(name) -> bool:
    """是不是正式包里的一份 JavaScript。"""
    return isinstance(name, str) and _SHIPPED.fullmatch(name) is not None


def project(fields):
    frames = []
    for line in str(fields.get("stack", "")).splitlines()[:80]:
        if "chrome-extension://" in line or "moz-extension://" in line:
            continue
        for name, row, column in _FRAME.findall(line):
            frames.append({"filename": name, "abs_path": "app:///" + name,
                           "lineno": int(row), "colno": int(column)})
    frames = list(reversed(frames[:MAX_FRAMES]))
    if not frames and shipped(fields.get("source_file")):
        row, column = fields.get("line"), fields.get("column")
        if type(row) is int and type(column) is int and row > 0 and column > 0:
            bundle = fields["source_file"]
            frames = [{"filename": bundle, "abs_path": "app:///" + bundle, "lineno": row, "colno": column}]
    name = fields.get("error_name")
    name = name if name in NAMES else "BrowserError"
    value = {"type": name, "value": name, "stacktrace": {"frames": frames}}
    images = []
    identities = fields.get("bundle_debug_ids", {})
    if isinstance(identities, dict):
        for bundle in sorted({frame["filename"] for frame in frames}):
            candidate = identities.get(bundle)
            if not isinstance(candidate, str) or len(candidate) != 36:
                continue
            try:
                identity = uuid.UUID(candidate)
                if identity.int and str(identity) == candidate.lower():
                    images.append({"type": "sourcemap", "code_file": "app:///" + bundle, "debug_id": str(identity)})
            except ValueError:
                continue
    return value, {"images": images} if images else None


def clean_debug_meta(value):
    """SDK scope 不能往受限事件中加入任意映射元数据。"""
    if not isinstance(value, dict) or not isinstance(value.get("images"), list):
        return None
    identities = {}
    for image in value["images"][:MAX_FRAMES]:
        if isinstance(image, dict) and image.get("type") == "sourcemap":
            code = image.get("code_file")
            if isinstance(code, str) and code.startswith("app:///") and shipped(code[len("app:///"):]):
                identities[code[len("app:///"):]] = image.get("debug_id")
    fields = {"stack": "\n".join(bundle + ":1:1" for bundle in sorted(identities)), "bundle_debug_ids": identities}
    return project(fields)[1]
