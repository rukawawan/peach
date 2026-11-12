"""口径变了、或者指的资产已删掉之后，已经过期的资料候选。

候选文件是抓取那一刻的产物。抓取口径改了——genre 现在取 r18 combined 页的日文原词，
不再取它译过一层的英文——之前写下的那些候选不会自己跟上，它们记的仍是英文词。表里
补词也救不了：`Sex Toy`、`Ahegao` 这些词根本不在任何一张表里，要日文只能重抓一次。

判据只认一件事：这条候选的未收录 genre 里有没有整串 ASCII 且带字母的词。日文原词是
假名或汉字，所以这一条既认得出「英文那层留下的」，又不会误伤「日文里确实还没收录的」。
字母是判据的一半：`69` 这类纯数字的 genre 两边写法一样，重抓拿回的还是它，按它摘行
就成了每跑一次摘一次、永远收敛不了。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

#: 会给出英文 genre 的来源。别的来源（javbus、dmm、mgstage）本来就返回日文。
ENGLISH_GENRE_SOURCES = frozenset({"r18dev"})


def is_english(word: str) -> bool:
    """这个词是英文那一层留下的写法。"""
    return bool(word) and word.isascii() and any(character.isalpha() for character in word)


def stale_genre_rows(rows: Iterable[dict]) -> list[dict]:
    """这些候选行的 genre 还停在英文那一层，重抓一次才会变成日文原词。"""
    stale = []
    for row in rows:
        if row.get("field") != "tags":
            continue
        try:
            candidates = json.loads(row.get("candidates_json") or "[]")
        except ValueError:
            continue
        if any(candidate.get("source") in ENGLISH_GENRE_SOURCES
               and any(is_english(word) for word in candidate.get("unmapped_genres") or [])
               for candidate in candidates):
            stale.append(row)
    return stale


def without(rows: Iterable[dict], dropped: Iterable[dict]) -> list[dict]:
    """去掉这些行之后的候选表。按 `item_key` 认，CSV 里它就是这一行的身份。"""
    keys = {row["item_key"] for row in dropped}
    return [row for row in rows if row["item_key"] not in keys]


# 资产已删除的候选（#486）
#
# 按文件出的行（带 `asset_path`）钉着 `asset_id`。永久删除把那一行从账本删掉之后，候选件不会
# 自己跟着撤；同一个文件之后被扫描重新登记，拿到的是新编号，旧行就悬在一个不存在的编号上。


def metadata_candidate_files(candidate_root) -> list[tuple[Path, list[str], list[dict]]]:
    """元数据字段的每一份候选件：路径、表头与行。读的是复核页同一批文件。"""
    from .review_csv import candidate_files, read_rows_shared
    found = []
    for path in candidate_files("metadata_fields", Path(candidate_root)):
        rows = read_rows_shared(path)
        if rows:
            found.append((path, list(rows[0]), rows))
    return found


def pinned_id(row: dict) -> int | None:
    """按文件出的行钉住的编号；按番号出的行返回 None。"""
    raw = str(row.get("asset_id") or "").strip()
    return int(raw) if row.get("asset_path") and raw.isdigit() else None


def withdraw_purged_rows(candidate_root, asset_ids) -> int:
    """永久删除的这些资产：把钉着它们的候选行从各份候选件里撤下，返回撤下几行。"""
    from .review_csv import write_rows
    ids = set(asset_ids)
    removed = 0
    for path, header, rows in metadata_candidate_files(candidate_root):
        kept = [row for row in rows if pinned_id(row) not in ids]
        if len(kept) < len(rows):
            write_rows(path, header, kept, atomic=True)
            removed += len(rows) - len(kept)
    return removed


def settle_dangling_rows(connection, files) -> dict:
    """钉着已不存在编号的行：按路径改挂到那个文件现在的编号，对不上的撤下。只读，不写文件。

    只看 `asset` 表里已经没有这个编号的行；编号还在（回收站里、已消失）的不动，还原后它照旧成立。
    路径恰好对上一条在库视频才改挂，`asset_id` 与 `item_key` 一起换成新编号：处理任务按
    `asset:<编号>:<字段>` 找这一行，只换编号会让下一趟为新编号另起一行。新编号已有同字段的
    候选或决定时，旧行让位撤下，新的那行是更近的证据。

    返回 `files`（改过的文件 → 表头与新行）、`repinned`、`withdrawn`，后两样原样进回执。
    """
    from .metadata_auto_apply import pinned_asset_ids
    existing = {row[0] for row in connection.execute("SELECT id FROM asset")}
    taken = {row["item_key"] for _path, _header, rows in files for row in rows
             if pinned_id(row) is None or pinned_id(row) in existing}
    taken |= {row[0] for row in connection.execute(
        "SELECT item_key FROM review_decision WHERE category='metadata_fields'")}
    dangling = [row for _path, _header, rows in files for row in rows
                if pinned_id(row) is not None and pinned_id(row) not in existing]
    # 编号已不在表里，`pinned_asset_ids` 给的就是路径恰好对上的那一条。
    targets = dict(zip(map(id, dangling), pinned_asset_ids(connection, dangling)))
    changed, repinned, withdrawn = {}, [], []
    for path, header, rows in files:
        kept, touched = [], False
        for row in rows:
            old = pinned_id(row)
            if old is None or old in existing:
                kept.append(row)
                continue
            touched = True
            field = str(row.get("field") or "").strip()
            target = targets[id(row)]
            key = (f"asset:{target}:{field}" if row["item_key"] == f"asset:{old}:{field}"
                   else row["item_key"])
            if target is not None and (key == row["item_key"] or key not in taken):
                taken.add(key)
                kept.append({**row, "asset_id": str(target), "item_key": key})
                repinned.append({"file": path.name, "item_key": row["item_key"], "asset_id": old,
                                 "new_item_key": key, "new_asset_id": target})
            else:
                withdrawn.append({"file": path.name, "row": row})
        if touched:
            changed[path] = (header, kept)
    return {"files": changed, "repinned": repinned, "withdrawn": withdrawn}
