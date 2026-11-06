#!/usr/bin/env python3
"""联网录制来源回放夹具：对一站、一个番号跑一次真实 `query`，把交互存进 `tests/fixtures/source-replay/`。

只读：不写 ledger，不写生产的来源冷却。代理设置与冷却记录从 `--secrets`（默认本机数据根的 secrets）
复制进一个临时根再用：代理按用户现有设置走，冷却期内的站照样停下，录制中撞出的新冷却只落在临时根。
结局是连接失败、冷却、预算、限流、验证页、封禁或地区限制的，不落盘，记为「未取得」。

默认不带这一站的 Cookie：登录态的页面带着账号编号与收藏入口。只有不登录就拿不到作品页的站才加
`--with-credentials`，这时 Cookie 值、CSRF 令牌与 `uid`、`formhash` 一类账号标识都换成固定假值。
落盘前去掉与解析无关的网页区块；脱敏与瘦身各回放一次，解析结局与联网那一次不一致就不采用这一步。
录制格式见 `docs/TESTING.md`「来源录制回放」。

    python scripts/record_source_fixtures.py javbus:SSIS-001 avbase:SSIS-001
    python scripts/record_source_fixtures.py --update javbus:SSIS-001
    python scripts/record_source_fixtures.py --with-credentials javdb:SSIS-001
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import tempfile
import time
from datetime import date
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

import httpx

from peach.config import SECRETS_DIR
from peach.jav_cover_fetch import DeadlineExceeded, HostLimitedTransport
from peach.scraping_access import SourceBudgetExhausted, SourcePaused, SourceTransport
from peach.sources import SITE_SOURCES, FailureReason
from peach.sources.replay import (Cassette, RecordingTransport, ReplayMiss, ReplayTransport,
                                  minimize, outcome_of, redact, rewrite_texts, secret_pieces)

FIXTURES = PROJECT_ROOT / "tests" / "fixtures" / "source-replay"
REPORT = PROJECT_ROOT / "build" / "source-replay" / "record-report.json"
#: 与作品有关的结局才落盘；其余是这台机器此刻的网络状况，换个出口、等一会儿结果就变。
RECORDABLE = {"ok", FailureReason.NOT_FOUND.value, FailureReason.GONE.value, FailureReason.PARSE_ERROR.value,
              FailureReason.NO_USABLE_METADATA.value, FailureReason.AUTH_REQUIRED.value}
#: 一次录制最多发几条请求：javdb 搜索加详情两条，DMM 猜 cid、搜索再试几个 cid 也不过十条。
MAX_REQUESTS = 12
WINDOWS_PATH = re.compile(r"[A-Za-z]:\\\\(?:Users|Desktop)", re.I)


def fixture_path(source: str, code: str) -> Path:
    return FIXTURES / source / f"{code}.json"


def scratch_secrets(secrets: Path, source: str, *, credentials: bool) -> tuple[Path, list[str]]:
    """把代理设置、这一站的连接设置与冷却记录复制进临时根，交回临时根与要替换的凭据片段。

    不带凭据时这一站的设置只留 `network`（直连还是走代理），Cookie 那几栏不进临时根。
    """
    root = Path(tempfile.mkdtemp(prefix="peach-record-"))
    (root / "follow").mkdir()
    proxy = secrets / "follow" / "peach-proxy.json"
    if proxy.is_file():
        shutil.copy2(proxy, root / "follow" / proxy.name)
    values: list[str] = []
    site = secrets / "follow" / f"scraping-{source}.json"
    if site.is_file():
        payload = json.loads(site.read_text(encoding="utf-8"))
        kept = payload if credentials else {key: payload[key] for key in ("network",) if key in payload}
        values = [str(value) for key, value in kept.items() if key != "network" and isinstance(value, str)]
        (root / "follow" / site.name).write_text(json.dumps(kept, ensure_ascii=False), encoding="utf-8")
    cooldown = secrets / f"scraping-{source}.cooldown.json"
    if cooldown.is_file():
        shutil.copy2(cooldown, root / cooldown.name)
    return root, secret_pieces(values)


def replays_same(cassette: Cassette, expected: tuple) -> bool:
    try:
        return outcome_of(cassette.source, cassette.code, ReplayTransport(cassette)) == expected
    except ReplayMiss:
        return False


def record(source: str, code: str, *, secrets: Path, credentials: bool, note: str) -> dict:
    root, pieces = scratch_secrets(secrets, source, credentials=credentials)
    cassette = Cassette(source=source, code=code, recorded=date.today().isoformat(), note=note)
    inner = SourceTransport(root, max_requests=MAX_REQUESTS)
    transport = HostLimitedTransport(RecordingTransport(inner, cassette), SITE_SOURCES[source].DEFAULT.interval)
    started = time.monotonic()
    try:
        live = outcome_of(source, code, transport)
    except (SourcePaused, SourceBudgetExhausted, DeadlineExceeded, httpx.TransportError) as error:
        return {"status": "未取得", "reason": type(error).__name__, "message": str(error)}
    finally:
        inner.close()
        shutil.rmtree(root, ignore_errors=True)
    outcome = live[0]
    if outcome not in RECORDABLE:
        return {"status": "未取得", "reason": outcome, "message": (live[2] or {}).get("message", "")}
    cassette.outcome, cassette.payload, cassette.failure = live
    if any(piece in row["url"] for row in cassette.interactions for piece in pieces):
        return {"status": "拒绝", "reason": "凭据出现在请求地址里", "message": ""}
    safe = rewrite_texts(cassette, lambda text: redact(text, pieces), urls=True)
    if not replays_same(safe, live):
        return {"status": "拒绝", "reason": "替换凭据后解析结局变了，凭据值进了解析字段", "message": ""}
    small = rewrite_texts(safe, minimize)
    trimmed = replays_same(small, live)
    final = small if trimmed else safe
    text = final.dump()
    if any(piece in text for piece in pieces) or WINDOWS_PATH.search(text):
        return {"status": "拒绝", "reason": "录制里仍有凭据或本机路径", "message": ""}
    path = fixture_path(source, code)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode("utf-8"))
    return {"status": "已录制", "outcome": outcome, "path": path.relative_to(PROJECT_ROOT).as_posix(),
            "bytes": len(text.encode("utf-8")), "raw_bytes": len(cassette.dump().encode("utf-8")),
            "trimmed": trimmed, "requests": len(cassette.interactions),
            "seconds": round(time.monotonic() - started, 1)}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n", 1)[0])
    parser.add_argument("samples", nargs="+", metavar="来源:番号")
    parser.add_argument("--secrets", type=Path, default=SECRETS_DIR, help="凭据与代理设置所在的 secrets 根，只读")
    parser.add_argument("--update", action="store_true", help="已有录制也重录")
    parser.add_argument("--with-credentials", action="store_true", help="带上这一站的 Cookie；不登录拿不到作品页时才用")
    parser.add_argument("--note", default="", help="写进录制的场景说明")
    args = parser.parse_args(argv)
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):
        print("CI 里只回放，不录制", file=sys.stderr)
        return 2
    results = []
    for sample in args.samples:
        source, _, code = sample.partition(":")
        if source not in SITE_SOURCES or not code:
            print(f"无法识别 {sample}：写成「来源:番号」，来源取 {', '.join(SITE_SOURCES)}", file=sys.stderr)
            return 2
        if fixture_path(source, code).exists() and not args.update:
            result = {"status": "已有录制"}
        else:
            result = record(source, code, secrets=args.secrets, credentials=args.with_credentials,
                            note=args.note)
        result = {"source": source, "code": code, **result}
        results.append(result)
        print(json.dumps(result, ensure_ascii=False))
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(results, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return 0 if all(row["status"] in {"已录制", "已有录制", "未取得"} for row in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
