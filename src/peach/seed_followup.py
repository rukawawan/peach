"""导入实体种子后继：扫描结算后把私有种子包补进账本（ADR-0075、ADR-0111）。

种子包位于应用资源的 `resources/seed/entities.json`（`seed_pack.DEFAULT_PACK`），导入只给本机已有实体填空、换掉种子
自己写过的旧行（`seed_pack.land`）。这条后继由扫描与采集在结算时声明（ADR-0040 第一条），
派的条件是两个里有一个：这一轮登记了新的女优、厂牌或事务所，或这个版本的包还没有成功导入过。
同一版本因此会跑多次；`land` 幂等，多跑一次只是没有东西可补。

与本机不一致的事实、对上本机两位实体的包项写进 `candidate_root` 下的 `seed-landing.csv`，
活动页只给条数。
"""
from __future__ import annotations

import hashlib
import sqlite3
import time
from pathlib import Path

from . import interface_text, seed_pack, seed_corrections, seed_validation
from .followups import Followup, FollowupType, register
from .task_outcomes import joined, part, said
from .task_runs import item_progress, task_label
from .user_messages import UserValueError

TASK_KEY = "seed-import"
TASK_LABEL = task_label(TASK_KEY)
REVIEW_FILE = "seed-landing.csv"
FIELDS = ("kind", "entity", "field", "ours", "source", "theirs", "detail", "batch", "withdrawal_id", "evidence")
#: 活动页摘要里的计数键与它们在结论里的 code（`task_outcomes`），按这个顺序拼结论。
SUMMARY_LABELS = (("aliases", "seedAliases"), ("refs", "seedRefs"), ("links", "seedLinks"),
                  ("profiles", "seedProfiles"), ("memberships", "seedMemberships"), ("makers", "seedMakers"),
                  ("refreshed", "seedRefreshed"), ("withdrawn", "seedWithdrawn"), ("names", "seedNames"))


def followup_key(version: str, content_hash: str = "") -> str:
    return f"{TASK_KEY}:{version}" + (f":{content_hash}:names1" if content_hash else "")


def pack_version(path: Path | None = None) -> str | None:
    """私有种子包版本；缺包时返回 None，包损坏时报告校验错误。"""
    path = Path(path) if path is not None else seed_pack.DEFAULT_PACK
    if not path.is_file():
        return None
    return str(seed_pack.load(path)["version"])


def landed(connection: sqlite3.Connection, key: str) -> bool:
    """这个版本有没有成功导入过：看任务记录里同 key 的后继有没有走到成功。"""
    return connection.execute(
        "SELECT 1 FROM task_run WHERE followup_key=? AND status='succeeded' LIMIT 1", (key,)).fetchone() is not None


def _new_entities(connection: sqlite3.Connection, since_entity_id: int) -> bool:
    marks = ",".join("?" * len(seed_pack.KINDS))
    return connection.execute(
        f"SELECT 1 FROM entity WHERE id>? AND kind IN ({marks}) LIMIT 1",
        (int(since_entity_id), *seed_pack.KINDS)).fetchone() is not None


#: 解析并校验过的种子包：路径 → (文件字节的 SHA-256, 包, 摘要)。升级补修每分钟问一次「该不该派」，
#: 2 MB 的包每次整包解析、校验再算两遍摘要要 0.1 秒，而包只随应用版本变。按字节判同而不按修改时间：
#: 同样大小的改写落在同一个时间戳里也认得出来，读一遍、算一次哈希只要几毫秒。
_LOADED: dict[str, tuple[bytes, dict, str]] = {}


def _load(path: Path) -> tuple[dict, str]:
    """种子包与它的摘要；文件字节没变就用上次解析、校验的结果。"""
    raw = path.read_bytes()
    signature = hashlib.sha256(raw).digest()
    cached = _LOADED.get(str(path))
    if cached is not None and cached[0] == signature:
        return cached[1], cached[2]
    pack = seed_pack.parse(raw.decode("utf-8"))
    digest = seed_validation.digest(pack)
    _LOADED[str(path)] = (signature, pack, digest)
    return pack, digest


def plan(connection: sqlite3.Connection, *, since_entity_id: int, pack_path: Path | None = None) -> list[Followup]:
    """这一轮该不该派：包的版本没成功导过，或这一轮登记了包里那三类的新实体。"""
    path = Path(pack_path) if pack_path is not None else seed_pack.DEFAULT_PACK
    if not path.is_file():
        return []
    pack, digest = _load(path)
    seed_corrections.check_history(connection, pack, content_digest=digest)
    version = pack["version"]
    key = followup_key(version, digest)
    if landed(connection, key) and not _new_entities(connection, since_entity_id):
        return []
    return [Followup.item(key, TASK_KEY, version)]


def _said(name: str, /, **params) -> str:
    """复核产物 `seed-landing.csv` 的说明列，按 zh-CN 资源渲染（`server:labels.seedFollowup.<名字>`）。"""
    return interface_text.text(f"server:labels.seedFollowup.{name}", params)


def _rows(report: dict) -> list[dict]:
    rows = [{"kind": item["kind"], "entity": item["entity"], "field": item["field"], "ours": item["ours"],
             "source": item["source"], "theirs": item["theirs"], "batch": report["batch"],
             "detail": _said("conflict")}
            for item in report["conflicts"]]
    rows += [{"kind": item["kind"], "entity": "、".join(item["entities"]), "field": "identity", "ours": "",
              "source": "", "theirs": item["name"], "batch": report["batch"],
              "detail": _said("duplicate")}
             for item in report["duplicates"]]
    rows += [{"kind": item["kind"], "entity": item["entity"], "field": item["field"], "source": item["source"],
              "detail": _said("withdrawalConflict", detail=item["detail"], reason=item["reason"]),
              "withdrawal_id": item["id"],
              "evidence": item["evidence"], "batch": report["batch"]}
             for item in report.get("withdrawal_conflicts", [])]
    return rows


def record_review(root: Path, report: dict) -> Path:
    """复核产物整份换成这一轮的：种子导入每次都是全量，上一轮留下的项这一轮要么还在、要么已解决。"""
    from .review_csv import write_rows
    path = Path(root) / REVIEW_FILE
    write_rows(path, FIELDS, _rows(report), atomic=True, fill_missing=True)
    return path


def outcome(report: dict) -> list[dict]:
    """活动页上那一行的段落（`task_outcomes`）：各类补了几条，以及要人看的几类。"""
    counts = [part(code, count=report[key]) for key, code in SUMMARY_LABELS if report.get(key)]
    for key, code in (("conflicts", "seedConflicts"), ("duplicates", "seedDuplicates"),
                      ("withdrawal_conflicts", "seedWithdrawalConflicts")):
        if report.get(key):
            counts.append(part(code, count=len(report[key])))
    return joined(counts, "listComma") if counts else [part("seedNothing", count=report["matched"])]


def run(contract, key: str, handle) -> dict:
    """将随应用分发的种子包补进账本；测试使用临时种子包。"""
    pack = seed_pack.load(seed_pack.DEFAULT_PACK)
    if key != followup_key(pack["version"], seed_validation.digest(pack)):
        raise UserValueError("errors.seedFollowup.digestMismatch")
    if handle is not None:
        handle.progress(**item_progress(TASK_KEY, pack['version']), throttle=0)
    with contract.database.read_connection() as connection:
        rename = bool(seed_pack.plan(connection, pack).get("names"))
    if rename:
        from .migrations import sqlite_backup
        db_path = Path(contract.database.db_path)
        backup = db_path.with_name(f"ledger.pre-seed-names-{time.time_ns()}.db")
        sqlite_backup(db_path, backup)
    with contract.database.write_transaction() as connection:
        report = seed_pack.land(connection, pack)
    if seed_pack.written(report):
        contract.cache_bust()
    record_review(contract.candidate_root, report)
    return {**said(outcome(report)), "version": report["version"], "matched": report["matched"],
            "unmatched": report["unmatched"], **{key: report.get(key, 0) for key, _label in SUMMARY_LABELS},
            "conflicts": len(report["conflicts"]), "duplicates": len(report["duplicates"]),
            "withdrawal_conflicts": len(report.get("withdrawal_conflicts", []))}


#: 写账本：别名、编号、链接、资料、归属与片商都进账本，走写账本那一条串行通道（ADR-0040 第三条）。
TYPE = register(FollowupType(task_key=TASK_KEY, label=TASK_LABEL, writes_ledger=True, run=run))
