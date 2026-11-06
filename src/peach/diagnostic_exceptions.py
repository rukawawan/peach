"""只保留代码位置、异常身份与结构化错误码的异常链投影。"""
from pathlib import Path
import re

FRAME_MODULES = {"peach", "asyncio", "anyio", "starlette", "httpx", "sqlite3", "urllib3"}
MEDIA_MARKERS = (("Your platform doesn't support hardware accelerated AV1 decoding", 'av1_decoder_unavailable'),
                 ('Unknown decoder', 'decoder_unavailable'), ('Invalid data found', 'invalid_media'),
                 ('Permission denied', 'permission_denied'), ('No space left', 'disk_full'),
                 ('No such file or directory', 'missing_media'), ('Invalid argument', 'invalid_media'),
                 ('Input/output error', 'io_error'))


def media_details(error, fields, codes):
    """媒体原始错误在脱敏前归类，输出只包含固定类别和退出码。"""
    detail = getattr(error, 'diagnostics', {}) if error is not None else {}
    detail = detail if isinstance(detail, dict) else {}
    if type(detail.get('returncode')) is int:
        codes['returncode'] = detail['returncode']
    known = {category for _, category in MEDIA_MARKERS} | {'ffmpeg_error', 'no_frame'}
    category = detail.get('failure_category')
    if isinstance(category, str) and category in known:
        return category
    raw = '\n'.join(value.decode('utf-8', 'replace') if isinstance(value, bytes) else str(value or '')
                    for value in (fields.get('stderr'), detail.get('stderr'), getattr(error, 'stderr', '')))
    for marker, category in MEDIA_MARKERS:
        if marker in raw:
            return category
    reason = detail.get('reason', fields.get('reason'))
    return reason if isinstance(reason, str) and reason in {'ffmpeg_error', 'no_frame'} else ''


def structured_codes(error):
    """本机与远程共用有限错误码，数据库名称和查询内容不进入类别。"""
    codes = {}
    for key in ('errno', 'winerror', 'returncode', 'sqlite_errorcode'):
        value = getattr(error, key, None)
        if type(value) is int:
            codes[key] = str(value)
    name = getattr(error, 'sqlite_errorname', '')
    if isinstance(name, str) and re.fullmatch(r'SQLITE_[A-Z_]{1,50}', name):
        codes['sqlite_errorname'] = name
        text = str(error).casefold()
        for prefix, category in (('no such table:', 'missing_table'), ('no such column:', 'missing_column'),
                                 ('database is locked', 'locked'), ('database table is locked', 'locked'),
                                 ('attempt to write a readonly database', 'readonly'),
                                 ('database disk image is malformed', 'malformed'),
                                 ('unable to open database file', 'cannot_open')):
            if text.startswith(prefix):
                codes['sqlite_failure'] = category
                break
    return codes


def project(error, http_status):
    values, codes, chain = [], {}, []
    current, visited = error, set()
    remaining = 40
    while current is not None and id(current) not in visited and len(chain) < 8:
        visited.add(id(current))
        name = type(current).__name__
        chain.append(name)
        codes.update(structured_codes(current))
        if (status := http_status(current)) is not None:
            codes["status_code"] = str(status)
        frames = []
        tb = current.__traceback__
        while tb is not None and remaining:
            filename = Path(tb.tb_frame.f_code.co_filename)
            module = tb.tb_frame.f_globals.get("__name__", "")
            own = filename.parent.name == "peach" or module.startswith("peach.")
            if own or module.split(".", 1)[0] in FRAME_MODULES:
                frame = {"filename": filename.name, "lineno": tb.tb_lineno,
                         "function": tb.tb_frame.f_code.co_name}
                if not own:
                    frame["module"] = module
                frames.append(frame)
                remaining -= 1
            tb = tb.tb_next
        values.append({"type": name, "module": type(current).__module__, "value": name,
                       "stacktrace": {"frames": frames}})
        current = current.__cause__ or (None if current.__suppress_context__ else current.__context__)
    return list(reversed(values)), codes, chain
