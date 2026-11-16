#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""115 SHA1 对账：读取服务端文件清单，按文件名和大小写入 ledger。

安装 maintenance-115 可选依赖后运行；首次登录使用 115 手机 App 扫码。
Cookie 默认存入配置 Peach 数据目录的 secrets/115-cookies.txt，重复报告存入 review/。
--cookie-file / PEACH_115_COOKIE_FILE 可指定已有 Cookie 文件；
--dupes-out / PEACH_115_DUPES_OUT 可指定重复报告位置，需同时启用 --dupes。
重复项默认按目录深度与 Provider 自动目录排序；--deprioritize-dir 可重复指定
优先删除的目录名，只生成复核报告，不删除文件。
"""
import argparse
import csv
import os
import sqlite3
import sys
import time
from collections import defaultdict
from contextlib import closing
from pathlib import Path, PureWindowsPath

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from peach.review_csv import ENCODING
from peach.config import DATABASE_PATH, LOG_DIR, REVIEW_DIR, SECRETS_DIR
from peach.interface_text import dev as t, dev_log


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=t("sync_sha1_115.description"))
    parser.add_argument("--cookie-file", type=Path,
                        default=Path(os.environ.get("PEACH_115_COOKIE_FILE")
                                     or SECRETS_DIR / "115-cookies.txt"),
                        help=t("sync_sha1_115.cookieFileHelp"))
    parser.add_argument("--dupes", action="store_true", help=t("sync_sha1_115.dupesHelp"))
    parser.add_argument("--dupes-out", type=Path,
                        default=Path(os.environ.get("PEACH_115_DUPES_OUT")
                                     or REVIEW_DIR / "115-sha1-duplicates.csv"),
                        help=t("sync_sha1_115.dupesOutHelp"))
    parser.add_argument("--deprioritize-dir", action="append", default=[],
                        help=t("sync_sha1_115.deprioritizeDirHelp"))
    args = parser.parse_args(argv)
    args.cookie_file = args.cookie_file.expanduser()
    args.dupes_out = args.dupes_out.expanduser()
    return args


def duplicate_score(path, deprioritize_dirs=()):
    parts = PureWindowsPath(path).parts
    lowered = {part.casefold() for part in parts[:-1]}
    score = -len(parts[:-1]) * 2
    if lowered.intersection(name.casefold() for name in deprioritize_dirs):
        score -= 50
    if "auto_create@" in path.lower():
        score -= 40
    return score


#: 重复报告 `action` 列：每组留一份，其余建议删除（只是报告，不删文件）。
KEEP, DELETE = "keep", "delete"


def write_duplicate_report(conn, output, deprioritize_dirs=()):
    groups = defaultdict(list)
    for aid, path, size, sha in conn.execute(
            "SELECT id,path,size,hash FROM asset WHERE location='115' AND hash IS NOT NULL"):
        groups[sha].append((aid, path, size))
    duplicates = {sha: items for sha, items in groups.items() if len(items) > 1}
    waste = sum(items[0][2] * (len(items) - 1) for items in duplicates.values())
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding=ENCODING) as stream:
        writer = csv.writer(stream)
        writer.writerow(["group", "action", "size_gb", "path", "sha1"])
        ordered = sorted(duplicates.items(), key=lambda item: -item[1][0][2] * (len(item[1]) - 1))
        for index, (sha, items) in enumerate(ordered, 1):
            items = sorted(items, key=lambda item: -duplicate_score(item[1], deprioritize_dirs))
            for position, (_aid, path, size) in enumerate(items):
                writer.writerow([index, KEEP if position == 0 else DELETE,
                                 round(size / 1024**3, 3), path, sha])
    return len(duplicates), waste


def main(argv=None):
    args = parse_args(argv)
    try:
        from p115client import P115Client
        from p115client.tool.iterdir import iter_files
    except ImportError:
        print(t("sync_sha1_115.missingDependency"), file=sys.stderr)
        return 1

    if not DATABASE_PATH.is_file():
        print(t("sync_sha1_115.databaseMissing", path=DATABASE_PATH), file=sys.stderr)
        return 1
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_path = LOG_DIR / "sha1-{}.log".format(time.strftime("%Y%m%d-%H%M%S"))
    with log_path.open("w", encoding="utf-8", buffering=1) as log_stream:
        def log(key: str, **params) -> None:
            """控制台一行跟本机语言，日志文件一行固定英文。"""
            print(t(key, **params), flush=True)
            log_stream.write(dev_log(key, **params) + "\n")

        if args.cookie_file.is_file():
            client = P115Client(str(args.cookie_file))
            log("sync_sha1_115.logSavedCookie", path=args.cookie_file)
        else:
            log("sync_sha1_115.logScanQr")
            client = P115Client(console_qrcode=True)
            args.cookie_file.parent.mkdir(parents=True, exist_ok=True)
            args.cookie_file.write_text(client.cookies_str, encoding="utf-8")
            log("sync_sha1_115.logCookieSaved", path=args.cookie_file)

        log("sync_sha1_115.logFetching")
        rows = []
        started = time.time()
        for index, item in enumerate(iter_files(client, 0, type=99, with_path=True), 1):
            sha = item.get("sha1") or item.get("sha")
            if not sha:
                continue
            rows.append((sha, item.get("name") or "", int(item.get("size") or 0)))
            if index % 5000 == 0:
                log("sync_sha1_115.logFetchProgress", count=f"{index:,}", seconds=f"{time.time()-started:.0f}")
        log("sync_sha1_115.logFetched", count=f"{len(rows):,}", seconds=f"{time.time()-started:.0f}")

        # 云端与 ledger 的路径口径不同，使用文件名和大小匹配。
        with closing(sqlite3.connect(str(DATABASE_PATH), timeout=120)) as conn:
            have = defaultdict(list)
            for aid, name, size in conn.execute("SELECT id,name,size FROM asset WHERE location='115'"):
                have[(name, size)].append(aid)
            log("sync_sha1_115.logLedgerRecords", count=f"{sum(len(ids) for ids in have.values()):,}")
            updates, missed = [], 0
            for sha, name, size in rows:
                ids = have.get((name, size))
                if ids:
                    updates.extend(("sha1", sha, aid) for aid in ids)
                else:
                    missed += 1
            conn.executemany("UPDATE asset SET hash_kind=?, hash=? WHERE id=?", updates)
            conn.commit()
            log("sync_sha1_115.logWritten", written=f"{len(updates):,}", missed=f"{missed:,}")
            if args.dupes:
                count, waste = write_duplicate_report(conn, args.dupes_out, args.deprioritize_dir)
                log("sync_sha1_115.logDuplicates", count=f"{count:,}", size=f"{waste/1024**3:.1f}")
                log("sync_sha1_115.logReportPath", path=args.dupes_out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
