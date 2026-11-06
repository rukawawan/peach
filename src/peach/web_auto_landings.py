"""复核页的「自动写入的资料」：逐条列出核查结算自动写下的资料，勾选后预览、撤回（ADR-0141）。

一行是一条决定：哪部作品的哪一格写成了什么、原来是什么，或补上了哪些标签。规则与时间是
次要的列，勾选可以是一条、几条或某次结算的全部。

只放行 ADR-0139 的两条规则：官方一致的标题、日期覆盖与标签并集。它们只改账本、不删盘上
文件，决定里存着撤回要用的全部依据。别的自动落库来源（种子、别名、样张、封面……）仍只在
`scripts/revert_auto_landing.py` 撤；接口只认列表里有的决定，查不到就拒绝。

预览与撤回调同一个 `auto_landing_revert.plan`，撤回再调同一个 `apply`，和命令行一字不差：
被人改过的资产照旧不动、单独报出。预览给出计划摘要的 `token`；撤回在写锁里重算计划，
对不上就拒绝，确认的就是将要写的。写入前按账本备份的命名留一份，回执写出文件名。
"""
from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime, timezone
from urllib.parse import quote
from uuid import uuid4

from . import auto_landing_revert
from .catalog_rules import normalise_code_key
from .library_processing import LABELS
from .metadata_auto_apply import VERIFIED_REPLACE_RULE, VERIFIED_UNION_RULE
from .migrations import sqlite_backup
from .web_state import WebContract

#: 网页能撤的规则与它们写给人看的名字。
RULES = {VERIFIED_REPLACE_RULE: "官方来源一致，覆盖原值", VERIFIED_UNION_RULE: "补上来源多给的标签"}
#: 撤回前那份账本备份的用途名，「账本备份」列表里显示 `ledger_backups.PURPOSE_LABELS` 的写法。
BACKUP_PURPOSE = "auto-landing-revert"


def batch_time(batch: str) -> float | None:
    """批次号里的时刻：覆盖早先记 UTC `2026-11-04T06:10:56Z`，并集与此后的覆盖记本机时间 `20261104T141053`。"""
    stamp = batch.rpartition("@")[2]
    try:
        if stamp.endswith("Z"):
            return datetime.strptime(stamp, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp()
        return time.mktime(time.strptime(stamp, "%Y%m%dT%H%M%S"))
    except ValueError:
        return None


def _decisions(connection) -> list[tuple[str, str, dict]]:
    """两条规则写下、仍在的决定：（规则，item_key，note）。"""
    found = []
    for row in connection.execute(
            "SELECT item_key,note FROM review_decision WHERE category='metadata_fields'"
            " AND status='approved' AND note LIKE '%adr-0139-%' ORDER BY item_key"):
        try:
            note = json.loads(row["note"] or "{}")
        except ValueError:
            continue
        if isinstance(note, dict) and note.get("rule") in RULES:
            found.append((note["rule"], row["item_key"], note))
    return found


def _batches_of(note: dict) -> list[str]:
    return [batch for batch in (note.get("batches") or [note.get("batch", "")]) if batch]


def _tagged_assets(connection, batches: set[str]) -> dict[str, list[int]]:
    """并集补标签写下的行按决定归到作品上：item_key → 资产编号。"""
    found: dict[str, list[int]] = {}
    for batch in sorted(batches):
        for key, asset_id in connection.execute(
                "SELECT json_extract(metadata_json,'$.review_item'),asset_id FROM asset_entity"
                " WHERE role='tag' AND source=? ORDER BY asset_id", (batch,)):
            found.setdefault(str(key or ""), [])
            if asset_id not in found[str(key or "")]:
                found[str(key or "")].append(asset_id)
    return found


def _works(contract: WebContract, connection, ids: set[int], codes: set[str]) -> tuple[dict, dict]:
    """作品的显示名、番号与封面地址：按编号一份，按归一番号一份；作品已删的不出现。"""
    by_id, by_code = {}, {}
    clauses, values = [], []
    if ids:
        clauses.append(f"id IN ({','.join('?' * len(ids))})")
        values += sorted(ids)
    if codes:
        clauses.append(f"code IN ({','.join('?' * len(codes))})")
        values += sorted(codes)
    if not clauses:
        return by_id, by_code
    for row in connection.execute(
            "SELECT id,name,code,catalog_title,snapshot_path FROM asset WHERE (" + " OR ".join(clauses)
            + ") ORDER BY (snapshot_path IS NULL),id", values):
        code = row["code"] or ""
        # 与复核卡片同一种取图：有封面缓存走 /cover，没有就用快照。
        preview = (f"/cover?code={quote(code)}" if code and contract.cover_path(code) is not None
                   else f"/poster?id={row['id']}&c=4" if row["snapshot_path"] else "")
        work = {"asset_id": row["id"], "name": row["catalog_title"] or row["name"] or "", "code": code,
                "preview_url": preview}
        by_id[row["id"]] = work
        by_code.setdefault(normalise_code_key(code), work)
    return by_id, by_code


def _assets_of(connection, decisions: list[tuple[str, str, dict]]) -> tuple[dict[str, list[int]], set[str]]:
    """每条决定写到了哪几部作品，以及只能按番号找作品的那几条的番号。

    覆盖按 note 的 `previous`，并集按标签行留痕里的 `review_item`；都没有（标签已被人删光）时，
    按文件出的行取 `asset:<编号>`，其余按番号回查。
    """
    union_batches = {batch for rule, _key, note in decisions if rule == VERIFIED_UNION_RULE
                     for batch in _batches_of(note)}
    tagged = _tagged_assets(connection, union_batches)
    assets_of: dict[str, list[int]] = {}
    codes = set()
    for rule, item_key, note in decisions:
        head = item_key.rpartition(":")[0]
        ids = ([int(before["asset_id"]) for before in note.get("previous") or []]
               if rule == VERIFIED_REPLACE_RULE else tagged.get(item_key, []))
        if not ids and head.startswith("asset:") and head[6:].isdigit():
            ids = [int(head[6:])]
        elif not ids:
            codes.add(head)
        assets_of[item_key] = ids
    return assets_of, codes


def _write_row(rule: str, item_key: str, note: dict, ids: list[int], work: dict | None) -> dict:
    """一条写入在列表里的样子；作品已不在账本里时标 `gone`。"""
    head, _, field = item_key.rpartition(":")
    batches = _batches_of(note)
    union = rule == VERIFIED_UNION_RULE
    return {
        "item_key": item_key, "rule": rule, "label": RULES[rule], "batch": batches[-1] if batches else "",
        "at": max((batch_time(batch) or 0 for batch in batches), default=0) or None,
        "field": "标签" if union else LABELS.get(field, field),
        "value": str(note.get("value") or ""),
        "previous": list(dict.fromkeys(str(before.get("value") or "") for before in note.get("previous") or [])),
        "tags": list(note.get("added_tags") or []) if union else [],
        "assets": len(ids) or 1,
        **(work or {"asset_id": ids[0] if ids else None, "name": "",
                    "code": "" if head.startswith("asset:") else head, "preview_url": "", "gone": True}),
    }


def list_writes(contract: WebContract, connection) -> list[dict]:
    """每条仍在的自动写入：作品、写了什么、原来是什么，以及规则与时间。新的在前。"""
    decisions = _decisions(connection)
    assets_of, codes = _assets_of(connection, decisions)
    by_id, by_code = _works(contract, connection, {i for ids in assets_of.values() for i in ids}, codes)
    listed = []
    for rule, item_key, note in decisions:
        ids = assets_of[item_key]
        work = (next((by_id[i] for i in ids if i in by_id), None)
                or by_code.get(normalise_code_key(item_key.rpartition(":")[0])))
        listed.append(_write_row(rule, item_key, note, ids, work))
    return sorted(listed, key=lambda item: (-(item["at"] or 0), item["code"], item["item_key"]))


def _plans(contract: WebContract, connection, keys: list[str]) -> list[dict]:
    """勾选那几行决定的撤回计划，每条规则一份。"""
    if not keys:
        raise ValueError("请选择要撤回的资料")
    rules = {item_key: rule for rule, item_key, _note in _decisions(connection)}
    unknown = [key for key in keys if key not in rules]
    if unknown:
        raise ValueError(f"这条自动写入已不在，请刷新后重试：{unknown[0]}")
    plans = []
    for rule in RULES:
        chosen = {key for key in keys if rules[key] == rule}
        if chosen:
            plans.append(auto_landing_revert.plan(
                connection, rule, logo_root=contract.logo_root, cover_root=contract.cover_root,
                files=False, item_keys=chosen))
    return plans


def _token(plans: list[dict]) -> str:
    entries = [entry for planned in plans for entry in planned["verified"]]
    return hashlib.sha256(json.dumps(entries, ensure_ascii=False, sort_keys=True, default=str)
                          .encode("utf-8")).hexdigest()[:24]


def _summary(contract: WebContract, connection, plans: list[dict]) -> dict:
    """计划里每条要改的：还原哪部作品的哪一格、改回什么，已被改过或作品已删而不动的，删哪些标签。"""
    restores, changed, tags = [], [], []
    for planned in plans:
        for entry in planned["verified"]:
            field = entry["item_key"].rpartition(":")[2]
            label = LABELS.get(field, field)
            restores += [{"asset_id": int(before["asset_id"]), "field": label, "current": entry["value"],
                          "previous": before.get("value") or ""} for before in entry.get("restores") or []]
            changed += [{"asset_id": int(asset_id), "field": label, "written": entry["value"]}
                        for asset_id in entry.get("changed") or []]
            tags += [{"asset_id": tag["asset_id"], "tag": tag["tag"], "batch": tag["batch"]}
                     for tag in entry.get("tags") or []]
    names, _ = _works(contract, connection, {row["asset_id"] for row in [*restores, *changed, *tags]}, set())
    for row in [*restores, *changed, *tags]:
        work = names.get(row["asset_id"])
        row.update({"name": work["name"], "code": work["code"]} if work
                   else {"name": "", "code": "", "gone": True})
    return {"decisions": sum(len(planned["verified"]) for planned in plans),
            "restores": restores, "changed": changed, "tags": tags}


def _requested(args) -> list[str]:
    raw = args.get("items") if isinstance(args, dict) else None
    if isinstance(raw, list):
        keys = [str(key).strip() for key in raw]
    else:
        keys = str(raw or "").split("\n")
    return list(dict.fromkeys(key.strip() for key in keys if key.strip()))


def q_auto_landings(contract: WebContract, args=None):
    """`GET /api/review/auto-landings`：逐条列出自动写入；带 `items`（换行分隔）时返回这几条的撤回预览与 token。"""
    keys = _requested(args or {})
    with contract.read_connection() as connection:
        if not keys:
            return {"items": list_writes(contract, connection)}
        plans = _plans(contract, connection, keys)
        return {"items": keys, "token": _token(plans), **_summary(contract, connection, plans)}


def w_auto_landing_revert(contract: WebContract, body):
    """`POST /api/review/auto-landings/revert`：在写锁里重算计划，token 对上才备份并撤回。"""
    keys = _requested(body or {})
    with contract.write_transaction() as connection:
        connection.execute("BEGIN IMMEDIATE")
        plans = _plans(contract, connection, keys)
        if _token(plans) != str((body or {}).get("token") or ""):
            raise ValueError("这几条自动写入已有变化，请重新预览")
        summary = _summary(contract, connection, plans)
        # 与标签管理同一个做法：写锁里只复制一份，完整性检查与清退留给账本备份那一轮，
        # 不让任务中心的心跳在这里多等几十秒。
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = contract.db_path.with_name(f"ledger.pre-{BACKUP_PURPOSE}-{stamp}-{uuid4().hex[:8]}.db")
        sqlite_backup(contract.db_path, backup)
        results = [auto_landing_revert.apply(connection, planned) for planned in plans]
    contract.cache_bust()
    return {"ok": True, "items": keys,
            "restored": sum(result["还原核查覆盖"] for result in results),
            "removed_tags": sum(result["删除核查并集标签"] for result in results),
            "decisions": sum(result["删除核查决定"] for result in results),
            "changed": summary["changed"], "backup": backup.name}
