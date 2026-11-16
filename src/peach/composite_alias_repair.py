"""可由启动补修与维护命令复用的已验证存量修复。"""
from __future__ import annotations
import sqlite3
from .entities import normalize_entity_name, split_composite_person_name


PERSON_KINDS = ("performer", "creator")

FIELDS = ("verdict", "kind", "entity_id", "canonical_name", "field",
          "value", "source", "parts", "target", "note")

#: 人工判定改写规范名时，换下来的旧名记在这个来源下。它不是哪个站给的，是用户定的。
CLEANUP_SOURCE = "user:name-cleanup"

EXTRA_COUNTS = {
    "composite_alias": (
        "SELECT count(*) FROM entity_alias WHERE alias LIKE '%(%' OR alias LIKE '%（%'"),
}


def _collision(connection: sqlite3.Connection, entity_id: int, part: str) -> str:
    """这一段是不是别的实体的规范名。是的话整行不拆，交人工。

    拆出来的名字撞上另一条实体的规范名，意味着两条实体可能是同一个人——那是合并要
    回答的问题，不是拆别名顺手能定的。悄悄插进去只会让两边都持有对方的名字。
    """
    row = connection.execute(
        "SELECT id, kind, canonical_name FROM entity "
        "WHERE normalized_name=? AND id<>?",
        (normalize_entity_name(part), entity_id)).fetchone()
    return "" if row is None else _said("collision", entity=row[0], kind=row[1], name=row[2])


def _said(name: str, /, **params) -> str:
    """判定说明，写进拆分复核 CSV 的 `note` 列；按 zh-CN 资源渲染（`server:labels.compositeAliasRepair.<名字>`）。"""
    from . import interface_text
    return interface_text.text(f"server:labels.compositeAliasRepair.{name}", params)


def collect(connection: sqlite3.Connection) -> list[dict[str, object]]:
    """账本里所有带括号的实体名与别名，标好判定。"""
    rows: list[dict[str, object]] = []
    scans = (
        ("alias", "SELECT a.entity_id, e.kind, e.canonical_name, a.alias, a.source "
                  "FROM entity_alias a JOIN entity e ON e.id=a.entity_id "
                  "WHERE a.alias LIKE '%(%' OR a.alias LIKE '%（%'"),
        ("canonical", "SELECT id, kind, canonical_name, canonical_name, '' FROM entity "
                      "WHERE canonical_name LIKE '%(%' OR canonical_name LIKE '%（%'"),
    )
    for field, sql in scans:
        for entity_id, kind, canonical, value, source in connection.execute(sql):
            parts = split_composite_person_name(value)
            note, verdict = "", "review"
            # 判据是「签名匹配上了」，不是「拆出几段」。`Rei Mizuna (Rei Mizuna)` 去重后
            # 只剩一段，但它照样是那个打包字段，照样得换成干净的一行。
            if parts == [value.strip()]:
                note = _said("notComposite")
            elif kind not in PERSON_KINDS:
                note = _said("notStageName", kind=kind)
            elif field == "canonical":
                note = _said("canonicalNeedsReview")
            else:
                collisions = [c for c in (_collision(connection, int(entity_id), part)
                                          for part in parts) if c]
                if collisions:
                    note = "；".join(collisions)
                else:
                    verdict = "auto"
            rows.append({
                "verdict": verdict, "kind": kind, "entity_id": int(entity_id),
                "canonical_name": canonical, "field": field, "value": value,
                "source": source or "", "parts": " | ".join(parts),
                "target": " | ".join(parts) if verdict == "auto" else "", "note": note,
            })
    rows.sort(key=lambda row: (row["verdict"] != "auto", str(row["kind"]),
                               int(row["entity_id"])))
    return rows


def apply_rows(connection: sqlite3.Connection,
               rows: list[dict[str, object]]) -> dict[str, int]:
    """把 `auto` 行拆开：先补上各段，再删掉那条复合别名。

    每一段都记在提供它的那个来源名下。它们确实是它给的，只是被打包在一个字段里；改写成
    「本脚本」会让下一个人查不到这几个罗马字是谁提供的。
    """
    added = removed = 0
    for row in rows:
        if row["verdict"] != "auto":
            continue
        entity_id, source = int(row["entity_id"]), str(row["source"])
        for part in str(row["parts"]).split(" | "):
            connection.execute(
                "INSERT OR IGNORE INTO entity_alias"
                "(entity_id,alias,normalized_alias,source) VALUES(?,?,?,?)",
                (entity_id, part, normalize_entity_name(part), source))
            added += connection.execute("SELECT changes()").fetchone()[0]
        connection.execute(
            "DELETE FROM entity_alias WHERE entity_id=? AND alias=? AND source=?",
            (entity_id, row["value"], source))
        removed += connection.execute("SELECT changes()").fetchone()[0]
    return {"added": added, "removed": removed}


def _blocked(connection: sqlite3.Connection, entity_id: int,
             names: list[str]) -> str:
    """人工判定也过一遍碰撞：撞上另一条实体的规范名要走合并，不是改个名了事。"""
    return "；".join(hit for hit in (_collision(connection, entity_id, name)
                                     for name in names) if hit)
