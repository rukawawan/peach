"""把复核过的实体链接装进 ledger 的 `entity_link`。

这个脚本补的是一条断掉的链路，不是新功能。`entity_link` 表、`q_entity` 的 `links` 契约、
资料页的 favicon 渲染和敏感来源不可点，全都在 2026-08 就写好了；缺的只有「已复核的结果
怎么进库」。结果是 8178 个实体里只有 5 条链接，而 `studio-x-handles.csv` 里 14 个人工
看图确认过的 handle 一条都没生效——采了、复核了、没有安装路径。这是本仓库出现过第四次
的同一个形态（`creator_tags`、`studio_logos`、`performer_avatars` 各犯过一次）。

默认 dry-run，只打印计划。`--apply` 必须同时给 `--backup`：这是真实账本写入。
写入是幂等的（`UNIQUE(entity_id,url)`），重跑不会产生重复行。
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peach import link_status   # noqa: E402
from peach.interface_text import dev as t   # noqa: E402
from peach.review_csv import read_rows   # noqa: E402
from peach.social_links import canonical_url   # noqa: E402
from peach.studio_sites import (   # noqa: E402
    PARKED_NOTE,
    parked_after_certificate_error,
    response_parked_reason,
)
from peach.scripting import (   # noqa: E402
    BACKUP_REQUIRED,
    USER_AGENT,
    add_ledger_write_args,
    open_for_write,
    verify_after_write,
)

LINK_KINDS = {"official", "social", "catalog", "source_reference"}
FIELDS = ("entity_id", "kind", "name", "link_kind", "label", "url", "evidence")
#: 计划清单每行开头那一格：`+` 新写入，`~` 改 label，空格是跳过。
ACTION_MARKS = {"insert": "+", "relabel": "~"}


def normalise_url(url: str) -> str:
    """补上 scheme、去掉空白，改过名的站点收成现主机。

    复核表是人和脚本混写的，`moodyz.com` 和 `https://moodyz.com/` 都会出现。不统一的话
    同一个站会因为写法不同绕过 `UNIQUE(entity_id,url)` 建出两行。

    主机别名要在这里收，不能只靠采集器各自记得。`UNIQUE(entity_id,url)` 和下面那句
    「已存在，跳过」都只认字面，`twitter.com/kouzaisaki` 和 `x.com/kouzaisaki` 在它们眼里
    是两条不同的链接——目录型来源抄的是 2023 年改名前的写法，一批就能建出几百条重复。
    `normalize_link_hosts.py` 正是为清这个而写的；写入端不收，清完下一批又长回来。
    """
    url = url.strip()
    if not url:
        return ""
    if not urlsplit(url).scheme:
        url = "https://" + url
    return canonical_url(url)


def resolve_entity(connection: sqlite3.Connection, row: dict) -> tuple[int | None, str]:
    """返回 (entity_id, 说明)。按 id 优先，其次 kind+规范名，最后 kind+别名。"""
    raw = str(row.get("entity_id") or "").strip()
    if raw:
        found = connection.execute("SELECT id FROM entity WHERE id=?", (int(raw),)).fetchone()
        return (found[0], t("install_entity_links.byEntityId")) if found else (None, t("install_entity_links.entityMissing", raw=raw))
    kind, name = str(row.get("kind") or "").strip(), str(row.get("name") or "").strip()
    if not kind or not name:
        return None, t("install_entity_links.noEntityKey")
    found = connection.execute(
        "SELECT id FROM entity WHERE kind=? AND canonical_name=?", (kind, name)).fetchone()
    if found:
        return found[0], t("install_entity_links.byCanonicalName")
    found = connection.execute(
        "SELECT e.id FROM entity e JOIN entity_alias a ON a.entity_id=e.id "
        "WHERE e.kind=? AND a.alias=?", (kind, name)).fetchone()
    if found:
        return found[0], t("install_entity_links.byAlias")
    return None, t("install_entity_links.nameNotFound", kind=kind, name=name)


def plan(connection: sqlite3.Connection, rows: list[dict]) -> list[dict]:
    """把复核表变成逐行的写入计划，每行都带上为什么。

    不合法的行不会被悄悄跳过——它们照样出现在计划里，动作写成 skip 并说明原因。
    静默丢行会让「装了 40 条」和「表里有 40 条」这两个数字对不上，而没人知道差在哪。

    已在库里的链接按复核表的 label 对齐（`relabel`）：label 是资料页上的链接文字，
    复核表是它唯一的出处，表里改了字重跑就该生效，而不是报「已存在」后原样留着。
    """
    planned: list[dict] = []
    for row in rows:
        item = {"studio": row.get("name") or "", "action": "skip", "reason": "",
                "entity_id": None, "link_kind": "", "label": "", "url": "",
                "evidence": (row.get("evidence") or "").strip()}
        url = normalise_url(str(row.get("url") or ""))
        link_kind = str(row.get("link_kind") or "").strip()
        entity_id, note = resolve_entity(connection, row)
        item.update(entity_id=entity_id, link_kind=link_kind, url=url,
                    label=str(row.get("label") or "").strip())
        invalid = row_problem(entity_id, note, link_kind, url, item["label"])
        stored = None if invalid else connection.execute(
            "SELECT label FROM entity_link WHERE entity_id=? AND url=?",
            (entity_id, url)).fetchone()
        if invalid:
            item["reason"] = invalid
        elif stored is None:
            item.update(action="insert", reason=note)
        elif stored[0] != item["label"]:
            item.update(action="relabel", reason=t("install_entity_links.relabel", label=stored[0]))
        else:
            item["reason"] = t("install_entity_links.existsSkipped")
        planned.append(item)
    return planned


def row_problem(entity_id: int | None, note: str, link_kind: str, url: str,
                label: str) -> str:
    """这一行写不进库的原因；能写就是空串。"""
    if entity_id is None:
        return note
    if link_kind not in LINK_KINDS:
        return t("install_entity_links.badLinkKind", linkKind=link_kind, kinds=str(sorted(LINK_KINDS)))
    if not url or urlsplit(url).scheme not in {"http", "https"}:
        return t("install_entity_links.badUrl", url=url or t("install_entity_links.emptyUrl"))
    if not label:
        return t("install_entity_links.noLabel")
    return ""


#: 「这个页面没了」——上游明确这么说了，才算确证。
GONE_STATUSES = {404, 410}


def resolves(url: str, timeout: float = 12.0,
             tries: int = 3, pause: float = 3.0) -> tuple[bool, str]:
    """这个地址现在还能打开吗。返回（能不能, 说明）。

    每个请求新建 client 并立刻关掉：这批地址分布在上百个互不相同的主机上，其中不少
    连不上，而失败的连接会在共享池里漏掉槽位，几十个请求之后一切都变成 PoolTimeout。

    传输层异常重试，状态码不重试。这条出口的 TLS 大约三次断一次
    （`[SSL: UNEXPECTED_EOF_WHILE_READING]`），一次失败就记「打不开」是把抖动写成结论：
    eltra.jp 2026-09-05 连着两趟这样被判死，而每次重试一下就 200。404 重试三次还是 404。
    """
    def get(target: str) -> httpx.Response:
        from peach.peach_proxy import http_client
        with http_client(follow_redirects=True, timeout=timeout,
                          limits=httpx.Limits(max_connections=4,
                                              max_keepalive_connections=0)) as client:
            return client.get(target, headers={"User-Agent": USER_AGENT})

    note = t("install_entity_links.unreachable")
    for attempt in range(tries):
        try:
            response = get(url)
        except Exception as exc:
            parked = parked_after_certificate_error(url, exc, get)
            if parked:
                return False, parked
            note = t("install_entity_links.unreachableError", error=type(exc).__name__)
            if attempt + 1 < tries:
                time.sleep(pause)
            continue
        if response.status_code != 200:
            return False, f"HTTP {response.status_code}"
        # 停放页也回 200，判据见 `studio_sites.PARKING_HOSTS`。
        parked = response_parked_reason(response)
        if parked:
            return False, parked
        return True, t("install_entity_links.reachable")
    return False, note


def is_gone(note: str) -> bool:
    """这条「打不开」是不是「页面没了」的确证。

    取不到不等于没了，这两件事只有 404／410 能划清。5xx、403 和
    超时要留着下次复查，不是删除的理由——这和取证失败时写 `未取得` 而不是写结论是同一条。

    停放页是另一种确证：域名已经换了主人，页面打得开，内容却不再是这个人或这家公司。
    """
    if note.startswith(PARKED_NOTE):
        return True
    match = re.match(r"HTTP (\d+)$", note)
    return bool(match) and int(match.group(1)) in GONE_STATUSES


def check_links(planned: list[dict], interval: float = 0.4, probe=None) -> None:
    """把打不开的地址从写入计划里剔除，就地改写 `planned`。

    这一步是补上一次真实事故的：首批 703 条链接一条都没验就装进了账本，事后逐条测
    发现 289 条 official 里有 107 条打不开（84 个 404、18 个 502），37% 是死的。
    上游给什么就存什么，等于把 minnano-av 几年前的快照当成现在的事实——T-POWERS 改过
    站，`/official/talent/X` 早已 404，而资料页上它看起来和好链接一模一样。

    门槛放在安装器而不是各个采集器里：这里是所有来源进入账本的唯一入口，一道门管住
    全部，好过给每个采集器各打一个补丁、再漏掉下一个。社媒同样验——实测 X 对真 handle
    回 200、对不存在的回 404，livedoor 上也确实有已经删掉的博客。
    """
    probe = probe or resolves
    for item in planned:
        if item["action"] != "insert":
            continue
        ok, note = probe(item["url"])
        if not ok:
            item.update(action="skip", reason=t("install_entity_links.deadSkipped", note=note))
        if probe is resolves:
            time.sleep(interval)


def on_host(url: str, host: str) -> bool:
    """`url` 的主机是 `host` 本身或它的子域。"""
    name = (urlsplit(url).hostname or "").lower()
    host = host.lower()
    return name == host or name.endswith("." + host)


def dead_links(connection: sqlite3.Connection, interval: float = 0.4, probe=None,
               host: str = "", retired: bool = False) -> list[dict]:
    """已经在库里、但现在打不开的链接；给了 `host` 就只查这个站和它的子域。
    链接还会随时间烂掉——事务所改版、艺人解约、博客注销——所以这条路要留着复用，
    不是一次性的清理脚本。

    `retired` 只查已隐退女优的官网链接：退所后页面下架是常态，这一批最容易烂。
    """
    probe = probe or resolves
    out = []
    # 已标记失效的结论已经落账，不再去敲它的地址。
    where = link_status.live_clause()
    if retired:
        where += (" AND l.link_kind='official' AND l.entity_id IN "
                  "(SELECT entity_id FROM performer_profile WHERE active_until IS NOT NULL)")
    for link_id, entity, kind, label, url in connection.execute(
            "SELECT l.id, e.canonical_name, l.link_kind, l.label, l.url "
            "FROM entity_link l JOIN entity e ON e.id=l.entity_id "
            f"WHERE {where} ORDER BY l.id"):
        if host and not on_host(url, host):
            continue
        ok, note = probe(url)
        if not ok:
            out.append({"id": link_id, "entity": entity, "link_kind": kind,
                        "label": label, "url": url, "note": note})
        if probe is resolves:
            time.sleep(interval)
    return out


def install(connection: sqlite3.Connection, planned: list[dict], source: str, *, batch: str = '') -> int:
    now = datetime.now(timezone.utc).isoformat()
    written = 0
    for item in planned:
        if item["action"] != "insert":
            continue
        metadata = {"source": source, "installed_at": now}
        if batch:
            metadata['batch'] = batch
        if item["evidence"]:
            metadata["evidence"] = item["evidence"]
        connection.execute(
            "INSERT OR IGNORE INTO entity_link"
            "(entity_id,link_kind,label,url,hostname,is_sensitive,metadata_json,"
            " created_at,updated_at) VALUES(?,?,?,?,?,0,?,?,?)",
            (item["entity_id"], item["link_kind"], item["label"], item["url"],
             urlsplit(item["url"]).hostname or "", json.dumps(metadata, ensure_ascii=False),
             now, now))
        written += connection.execute("SELECT changes()").fetchone()[0]
    return written


def relabel(connection: sqlite3.Connection, planned: list[dict]) -> int:
    """把 `relabel` 那几行的链接文字写成复核表里的 label，返回改了几条。"""
    now = datetime.now(timezone.utc).isoformat()
    changed = 0
    for item in planned:
        if item["action"] != "relabel":
            continue
        connection.execute(
            "UPDATE entity_link SET label=?,updated_at=? WHERE entity_id=? AND url=?",
            (item["label"], now, item["entity_id"], item["url"]))
        changed += connection.execute("SELECT changes()").fetchone()[0]
    return changed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=t("install_entity_links.description"))
    add_ledger_write_args(parser)
    parser.add_argument("--input", type=Path,
                        help=t("install_entity_links.inputHelp", fields=','.join(FIELDS)))
    parser.add_argument("--prune-dead", action="store_true",
                        help=t("install_entity_links.pruneDeadHelp"))
    parser.add_argument("--host", default="",
                        help=t("install_entity_links.hostHelp"))
    parser.add_argument("--retired", action="store_true",
                        help=t("install_entity_links.retiredHelp"))
    parser.add_argument("--no-check", action="store_true",
                        help=t("install_entity_links.noCheckHelp"))
    return parser


def prune(connection: sqlite3.Connection, args) -> int:
    """列出并（在 --apply 时）处置库里打不开的链接：已隐退女优的打失效标记，其余删除。"""
    before = connection.execute("SELECT count(*) FROM entity_link").fetchone()[0]
    unreachable = dead_links(connection, host=args.host, retired=args.retired)
    gone = [item for item in unreachable if is_gone(item["note"])]
    unclear = [item for item in unreachable if not is_gone(item["note"])]
    for item in gone:
        print(f" - {item['entity'][:14]:<14} {item['link_kind']:<8} "
              f"{item['label'][:18]:<18} {item['note']:<14} {item['url'][:52]}")
    for item in unclear:
        # 留着不删，但必须看得见——静默保留和静默删除一样，都会让人以为库是干净的。
        print(f" ? {item['entity'][:14]:<14} {item['link_kind']:<8} "
              f"{item['label'][:18]:<18} {item['note']:<14} {item['url'][:52]}")
    print({t("install_entity_links.linksInDatabase"): before, t("install_entity_links.unreachableCount"): len(unreachable),
           t("install_entity_links.confirmedGone"): len(gone), t("install_entity_links.inconclusive"): len(unclear)})
    if not args.apply:
        print(t("install_entity_links.dryRun"))
        return 0

    # 已隐退女优的留成失效标记，其余删除，取舍见 `link_status`。
    with connection:
        removed, marked = link_status.settle_gone(connection, gone)
    after = connection.execute("SELECT count(*) FROM entity_link").fetchone()[0]
    integrity, orphans = verify_after_write(connection)
    print({t("install_entity_links.beforeDelete"): before, t("install_entity_links.afterDelete"): after, t("install_entity_links.deleted"): removed, t("install_entity_links.markedGone"): marked,
           "integrity_check": integrity, "foreign_key_check": orphans})
    if (before - after != removed or removed + marked != len(gone)
            or integrity != "ok" or orphans):
        print(t("install_entity_links.checkMismatch"))
        return 1
    return 0


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.apply and not args.backup:
        print(f"[stop] {BACKUP_REQUIRED}")
        return 2

    if not args.prune_dead and not args.input:
        print(t("install_entity_links.needInput"))
        return 2

    # dry-run 拿到的是 `mode=ro` 连接，`--apply` 拿到的是「备份已经落好」的可写连接。
    # 备份先于任何写入完成，所以不必再推断「这份备份是写之前还是写之后的」。
    connection = open_for_write(args)
    if args.apply:
        print(t("install_entity_links.backedUp", backup=args.backup))
    connection.execute("PRAGMA foreign_keys=ON")
    if args.prune_dead:
        try:
            return prune(connection, args)
        finally:
            connection.close()

    rows = read_rows(args.input)
    try:
        before = connection.execute("SELECT count(*) FROM entity_link").fetchone()[0]
        planned = plan(connection, rows)
        if args.no_check:
            print(t("install_entity_links.checkSkipped"))
        else:
            check_links(planned)
        for item in planned:
            mark = ACTION_MARKS.get(item["action"], " ")
            print(f" {mark} {str(item['studio'])[:18]:<18} {item['link_kind']:<8} "
                  f"{str(item['url'])[:44]:<44} {item['reason']}")
        inserts = [item for item in planned if item["action"] == "insert"]
        relabels = [item for item in planned if item["action"] == "relabel"]
        print({t("install_entity_links.inputRows"): len(rows), t("install_entity_links.toWrite"): len(inserts), t("install_entity_links.toRelabel"): len(relabels),
               t("install_entity_links.skipped"): len(planned) - len(inserts) - len(relabels),
               t("install_entity_links.linksBefore"): before})
        if not args.apply:
            print(t("install_entity_links.dryRun"))
            return 0

        with connection:
            written = install(connection, planned, source=args.input.name)
            renamed = relabel(connection, planned)
        after = connection.execute("SELECT count(*) FROM entity_link").fetchone()[0]
        integrity, orphans = verify_after_write(connection)
        print({t("install_entity_links.written"): written, t("install_entity_links.relabeled"): renamed, t("install_entity_links.linksAfter"): after,
               t("install_entity_links.delta"): after - before, "integrity_check": integrity,
               "foreign_key_check": orphans})
        if after - before != written or renamed != len(relabels) or integrity != "ok" or orphans:
            print(t("install_entity_links.checkMismatch"))
            return 1
    finally:
        connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
