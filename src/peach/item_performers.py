"""在作品详情里手动指定或移除艺人：刮削没认出、文件夹和文件名规则也够不着的那几部，用户自己挑。

填的名字先落到库里已有的那位艺人（规范名或别名，大小写与写法不计）；同名的有好几位就报出
候选让用户填完整名字；库里还没有就按填的名字新建。关联来源记为 `SOURCE`，置信度 1.0，
和其他来源的关联互不覆盖；移除只删这部作品与这位艺人的关联，不动艺人本身。
"""
from __future__ import annotations

from datetime import datetime, timezone

SOURCE = "user:item-performer"
MAX_NAME = 80


def _resolve(connection, name: str) -> str:
    """库里那位艺人的规范名；没有就用填的名字；同名多位时报错列出候选。"""
    from .entities import normalize_entity_name
    key = normalize_entity_name(name)
    if not key:
        raise ValueError("请填艺人名字")
    rows = connection.execute(
        "SELECT DISTINCT e.id, e.canonical_name FROM entity e LEFT JOIN entity_alias al ON al.entity_id=e.id "
        "WHERE e.kind='performer' AND (e.normalized_name=? OR al.normalized_alias=?) ORDER BY e.id",
        (key, key)).fetchall()
    exact = [str(canonical) for _, canonical in rows if normalize_entity_name(str(canonical)) == key]
    if len(exact) == 1:
        return exact[0]
    if len(rows) == 1:
        return str(rows[0][1])
    if rows:
        raise ValueError("有 " + str(len(rows)) + " 位同名艺人（" + "、".join(str(r[1]) for r in rows)
                         + "），请填其中一位的完整名字")
    return name


def assign(contract, asset_id: int, operation: str, name: str) -> dict:
    """给作品加上或移除一位艺人；返回落上的规范名。"""
    name = " ".join(str(name or "").split())
    if operation not in {"add", "remove"}:
        raise ValueError("operation must be add or remove")
    if not name or len(name) > MAX_NAME:
        raise ValueError("艺人名字要 1 到 80 个字")
    from .entities import normalize_entity_name, upsert_asset_entity
    contract.cache_bust()
    with contract.write_transaction() as connection:
        if not connection.execute("SELECT 1 FROM asset WHERE id=?", (asset_id,)).fetchone():
            raise ValueError("asset not found")
        if operation == "add":
            canonical = _resolve(connection, name)
            connection.execute(
                "INSERT OR IGNORE INTO asset_tag(asset_id,tag,confidence,source) VALUES(?,?,1.0,?)",
                (asset_id, "演员:" + canonical, SOURCE))
            upsert_asset_entity(connection, kind="performer", name=canonical, asset_id=asset_id,
                                role="performer", source=SOURCE, confidence=1.0,
                                now=datetime.now(timezone.utc).isoformat())
            return {"ok": True, "name": canonical}
        key = normalize_entity_name(name)
        ids = [int(row[0]) for row in connection.execute(
            "SELECT DISTINCT e.id FROM entity e JOIN asset_entity ae ON ae.entity_id=e.id "
            "LEFT JOIN entity_alias al ON al.entity_id=e.id WHERE ae.asset_id=? AND e.kind='performer' "
            "AND (e.normalized_name=? OR al.normalized_alias=?)", (asset_id, key, key)).fetchall()]
        names = [str(row[0]) for row in connection.execute(
            f"SELECT canonical_name FROM entity WHERE id IN ({','.join('?' for _ in ids)})", ids).fetchall()] if ids else []
        for entity_id in ids:
            connection.execute("DELETE FROM asset_entity WHERE asset_id=? AND entity_id=?", (asset_id, entity_id))
        for canonical in names + [name]:
            connection.execute("DELETE FROM asset_tag WHERE asset_id=? AND tag=?", (asset_id, "演员:" + canonical))
        return {"ok": bool(ids), "name": names[0] if names else name}
