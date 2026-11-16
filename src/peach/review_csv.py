"""复核产物 CSV 的读写口径。

AGENTS.md 把 CSV 定为「复核产物」：可机读、可重放，结论必须落在这里而不是只存在于
对话。既然要被反复读写，它的编码就不是风格问题：

- `utf-8-sig` 的 BOM 决定 Excel 打开时中文是不是乱码；少了它，一份复核表在 Excel
  里就是一屏问号，而写它的脚本一切正常。
- `newline=""` 决定 Windows 下每条记录之间会不会多出一个空行；漏了它，csv 模块写的
  `\\r\\n` 会再被文本层翻译一次。

这两条此前在 46 个读写点各写一遍。新脚本照抄时漏掉任一条，都要等到有人真的用 Excel
打开那份表才会发现——而那通常是几天以后，脚本早就跑完了。

「哪几份文件是这一类的候选、它们的稳定主键是哪一列」同样是这份口径的一部分：读候选
的不只有复核页，命令行首扫与处理任务的自动落库读的必须是同一批文件、同一个主键。
"""
from __future__ import annotations

import csv
import os
import threading
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path

from .config import GENERATED_DIR
from .fsutil import atomic_path
from .user_messages import UserFacingError

class ReviewCsvError(UserFacingError, csv.Error):
    """复核 CSV 读不下去；仍是 `csv.Error`，按它捕获的调用方照旧接得住。"""


#: 复核 CSV 的编码。改它等于改所有复核产物的可读性，不要在调用处覆盖。
ENCODING = "utf-8-sig"
#: 候选的 JSON 证据可包含多行原始资料；单字段最多读取 16 Mi 个字符。
MAX_FIELD_CHARS = 16 * 1024 * 1024


def read_rows(path: Path | str, *, missing_ok: bool = False) -> list[dict[str, str]]:
    """读一份复核 CSV。

    默认在文件缺失时抛 `FileNotFoundError`，和直接 `open()` 一样——这不是多余的严格。
    脚本分两种：一种自己先判 `is_file()` 再读（续跑文件不存在是正常起点），另一种就指望这个
    异常把「输入没给全」变成一次带健康报告的失败退出。把「缺文件返回空表」设成默认，
    等于让第二种脚本安静地拿一张空表跑完并返回成功——错误被吞掉，而且没有任何提示。

    想要容错的调用方显式写 `missing_ok=True`。
    """
    target = Path(path)
    if missing_ok and not target.is_file():
        return []
    # csv 的限制属于进程全局，只增不减，避免并发读者互相恢复成较小限制。
    csv.field_size_limit(max(csv.field_size_limit(), MAX_FIELD_CHARS))
    with target.open(encoding=ENCODING, newline="") as handle:
        reader = csv.DictReader(handle, strict=True)
        try:
            return list(reader)
        except csv.Error as exc:
            raise ReviewCsvError('errors.reviewCsv.readFailed', {
                'path': str(target), 'line': reader.reader.line_num, 'error': str(exc)}) from exc


def write_rows(
    path: Path | str,
    fieldnames: Sequence[str],
    rows: Iterable[Mapping[str, object]],
    *,
    atomic: bool = False,
    fill_missing: bool = False,
) -> None:
    """写一份复核 CSV，并按需保证原子替换。

    `atomic` 走 `fsutil.atomic_path`：长跑任务被打断时，读的人拿到的要么是替换前
    那份完整文件、要么是替换后那份，不会是写了一半的。复核页正开着这份表时替换会等它
    放手，不让一次读取打死整个处理任务。异常路径删掉临时文件再原样抛出，不把中断伪装成成功。

    `fill_missing` 用空串补齐缺的列。默认关掉是有意的：`DictWriter` 遇到多余的键会抛
    `ValueError`，那几乎总是字段名真的写错了；无条件补齐会把这个错误变成一列静默的
    空值，等到复核的人对着空列发呆时已经查不回来了。
    """
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    fields = list(fieldnames)

    def dump(handle) -> None:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        if fill_missing:
            writer.writerows({field: row.get(field, "") for field in fields}
                             for row in rows)
        else:
            writer.writerows(rows)

    # 这份文件已有人按缓存读（`_parsed_rows`）时，写下的内容顺手记成它的解析结果：
    # 处理任务每处理一部片就整份重写一次七十多 MB 的候选表，下一个读的人不必再整份重解析。
    remember = atomic and str(target) in _PARSED
    if remember:
        rows = [_as_read_back(row, fields, fill_missing) for row in rows]

    if not atomic:
        with target.open("w", encoding=ENCODING, newline="") as handle:
            dump(handle)
        with _PARSED_LOCK:
            _PARSED.pop(str(target), None)
        return

    with atomic_path(target) as temporary:
        with temporary.open("w", encoding=ENCODING, newline="") as handle:
            dump(handle)
        # 替换保留临时文件的 inode 与修改时间：在替换前取标识，替换后若又被别人换掉，标识对不上就重读。
        written = temporary.stat() if remember else None
    if written is not None:
        _remember(target, written, rows)


def _as_read_back(row: Mapping[str, object], fields: list[str], fill_missing: bool) -> dict[str, str]:
    """这一行写进 CSV 再读回来的样子：只剩表头那几列，`None` 成空串，其余转成字符串。

    多出的列照旧交给 `DictWriter` 去拒绝，这里不替它吞掉。
    """
    if not fill_missing and any(key not in fields for key in row):
        return dict(row)  # 原样交下去，让写入照常抛错
    return {field: "" if (value := row.get(field, "")) is None
            else value if isinstance(value, str) else str(value) for field in fields}


# 候选文件名带批次日期，代码里只认前缀并永远取目录里实际最后写完的一份；
# 文件名允许附加主机/用途，不能用字典序冒充时间顺序。2026-08-30 的
# `...japanese-official-tags-20260827...` 就曾被更旧的 `...windows-p0-proof-20260822...`
# 盖住，导致新官方标签在复核页完全不可见。
CANDIDATE_PREFIX = {
    "metadata_fields": "metadata-field-candidates-",
    "creator_tags": "creator-tags-candidate-",
    "studio_logos": "studio-logo-candidate-",
    "performer_avatars": "performer-avatar-candidate-",
    # 这三类此前只落在 CSV 里没有界面入口，复核负担等于被丢回给用户去翻文件。
    "western_identity": "babepedia-candidates",
    "cover_sources": "cover-fetch-log",
    "fc2_markings": "fc2-candidate-log",
    "fc2_similarity": "fc2-similarity-candidate-",
    "video_endcards": "video-endcard-candidate-",
}
ADDITIONAL_CANDIDATE_FILES = {
    # 分区文件先于通用批次读取；同一个 item_key 出现时，窄范围的刷新证据应覆盖
    # 通用批次里的旧候选，而不是被 seen 去重静默吞掉。
    "metadata_fields": ("library-metadata-field-candidates.csv", "japanese-title-candidates.csv", "fc2-metadata-field-candidates.csv", "fc2-cast-candidates.csv", "kmib-metadata-field-candidates.csv"),
}
# 每类候选的稳定主键列。缺这一列的行直接跳过并计数，绝不退化成行号——
# 行号会在 CSV 重排后把历史决定悄悄挪到别的条目上。
CANDIDATE_KEY = {
    "metadata_fields": "item_key",
    "creator_tags": "board",
    "studio_logos": "studio",
    "performer_avatars": "entity_id",
    "western_identity": "entity_id",
    "cover_sources": "code",
    "fc2_markings": "code",
    "fc2_similarity": "pair_key",
    "video_endcards": "candidate_key",
}


def _batch_files(base: Path, prefix: str) -> list[Path]:
    """某一类的候选批次文件，不含抓取脚本顺手写在旁边的健康报告。

    `fetch_studio_avatar_candidates.py` 默认把报告写成 `<输出名>-health.csv`，和候选
    同一个前缀、同一秒落盘。按修改时间挑最新一份时挑中的是报告，它没有 `studio` 列，
    整个「厂牌 Logo」队列就空了。
    """
    return [path for path in base.glob(f"{prefix}*.csv")
            if path.is_file() and not path.stem.endswith("-health")]


def latest_candidate_file(category: str, root: Path | None = None) -> Path | None:
    prefix = CANDIDATE_PREFIX.get(category)
    if not prefix:
        return None
    matches = _batch_files(root or GENERATED_DIR, prefix)
    if not matches:
        return None
    return max(matches, key=lambda path: (path.stat().st_mtime_ns, path.name))


#: 按番号分批跑、每批只覆盖自己那批番号的类别。这些类别读全部批次，别的只读最新一份。
#: 差别在于批次之间是不是同一批对象：元数据字段候选每批问的是不同的番号，上一批未复核
#: 的行在下一批里根本不会出现；封面日志、创作者标签那些每批重跑同一批对象，旧批次是
#: 过时快照，读进来只会把已经作废的证据摆回台面。
MULTI_BATCH_CATEGORIES = frozenset({"metadata_fields"})


def candidate_root_version(root: Path | None = None) -> int | None:
    """候选目录的版本，复核缓存拿它当键的一部分：目录与这一层 CSV 的最大修改时间。

    候选文件都直接放在这一层。新增批次、改名替换与删除改的是目录时间，同名批次原地
    重写只改文件时间，两样都算进来，复核页才能一直缓存到候选真的变了为止。
    """
    base = root or GENERATED_DIR
    try:
        with os.scandir(base) as entries:
            stamps = [entry.stat().st_mtime_ns for entry in entries
                      if entry.name.endswith(".csv") and entry.is_file()]
        return max([base.stat().st_mtime_ns, *stamps])
    except OSError:
        return None


def candidate_files(category: str, root: Path | None = None) -> list[Path]:
    """这一类的候选文件，按证据优先级排列：先读的那份说了算。

    分区文件最优先，批次文件按写入时间从新到旧。分批类别的**旧批次不能因为跑了新批次
    就消失**：只读最新一份实测让 9 月 1 日那批 128 条可落库的行在复核页上完全不可见
    ——它们既没被判过，也再没机会被判。
    """
    base = root or GENERATED_DIR
    partitions = [
        base / name for name in ADDITIONAL_CANDIDATE_FILES.get(category, ())
        if (base / name).is_file()
    ]
    if category in MULTI_BATCH_CATEGORIES:
        prefix = CANDIDATE_PREFIX.get(category)
        batches = sorted(
            _batch_files(base, prefix),
            key=lambda path: (path.stat().st_mtime_ns, path.name), reverse=True,
        ) if prefix else []
    else:
        latest = latest_candidate_file(category, root)
        batches = [latest] if latest is not None and latest.is_file() else []
    ordered, seen = [], set()
    for path in partitions + batches:
        if path not in seen:
            seen.add(path)
            ordered.append(path)
    return ordered


def _candidate_source_label(paths: list[Path]) -> str:
    """复核页要看得出证据来自哪；十几份批次名字全列出来会把那一行撑爆。"""
    names = [path.name for path in paths]
    if len(names) <= 3:
        return "; ".join(names)
    from . import interface_text
    return interface_text.text("server:labels.reviewCsv.moreFiles", {"names": "; ".join(names[:3]), "count": len(names)})


def read_candidates(category: str, root: Path | None = None) -> tuple[list[dict], str | None, int]:
    """读取全部批次的候选，返回（有稳定主键的行, 来源说明, 被跳过的行数）。"""
    paths = candidate_files(category, root)
    if not paths:
        return [], None, 0
    key_column = CANDIDATE_KEY[category]
    rows, skipped, seen = [], 0, set()
    for candidate_path in paths:
        for row in _parsed_rows(candidate_path):
            key = str(row.get(key_column) or "").strip()
            if not key:
                skipped += 1
                continue
            if key in seen:
                continue
            seen.add(key)
            # 缓存里那一份是共用的：交出去的每一行都是副本，调用方往里添字段不会串到下一次。
            rows.append({**row, "item_key": key})
    return rows, _candidate_source_label(paths), skipped


#: 每份候选文件最近一次解析的结果，键是路径，值是（文件标识, 行）。元数据候选有七十多 MB、
#: 三万多行，复核页每次重算都整份重解析要好几秒；文件只在处理任务写完一批时才换。
_PARSED: dict[str, tuple[tuple[int, int, int], tuple[dict[str, str], ...]]] = {}
_PARSED_LOCK = threading.Lock()


def _parsed_rows(path: Path) -> tuple[dict[str, str], ...]:
    """按文件标识（修改时间、大小、inode）缓存的 `read_rows`；文件一换就重读。"""
    stat = path.stat()
    stamp = (stat.st_mtime_ns, stat.st_size, stat.st_ino)
    key = str(path)
    with _PARSED_LOCK:
        cached = _PARSED.get(key)
    if cached is not None and cached[0] == stamp:
        return cached[1]
    rows = tuple(read_rows(path))
    with _PARSED_LOCK:
        _PARSED[key] = (stamp, rows)
    return rows


def _remember(path: Path, stat: os.stat_result, rows: list[dict[str, str]]) -> None:
    with _PARSED_LOCK:
        _PARSED[str(path)] = ((stat.st_mtime_ns, stat.st_size, stat.st_ino), tuple(rows))


def read_rows_shared(path: Path | str, *, missing_ok: bool = False) -> list[dict[str, str]]:
    """同 `read_rows`，文件没换时复用上一次的解析结果；每行都是副本，调用方可以原地改。"""
    target = Path(path)
    if missing_ok and not target.is_file():
        return []
    return [dict(row) for row in _parsed_rows(target)]
