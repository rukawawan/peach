"""Local daily usage totals for library AI requests."""
from __future__ import annotations

import os
import re
import sqlite3
from contextlib import closing
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

import httpx

from . import ai_credentials
from .follow_secrets import CredentialError

_DAYS = 30
_REPORTS = {
    "openai": ("OPENAI_ADMIN_KEY", "https://api.openai.com/v1/organization/usage/completions"),
    "anthropic": ("ANTHROPIC_ADMIN_KEY", "https://api.anthropic.com/v1/organizations/usage_report/messages"),
}
_SCHEMA = """
CREATE TABLE IF NOT EXISTS ai_usage (
    day TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    task TEXT NOT NULL,
    requests INTEGER NOT NULL,
    measured INTEGER NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    PRIMARY KEY (day, provider, model, task)
)
"""


@dataclass(frozen=True)
class TokenUsage:
    input_tokens: int
    output_tokens: int


def response_usage(provider: str, response: dict) -> TokenUsage | None:
    raw = response.get("usage")
    if not isinstance(raw, dict):
        return None
    if provider in ("openai", "deepseek"):
        inputs = [raw.get("prompt_tokens")]
        output = raw.get("completion_tokens")
    else:
        inputs = [raw.get("input_tokens")]
        output = raw.get("output_tokens")
        if provider == "anthropic":
            # Claude reports cached input separately. OpenAI and DeepSeek include it in the input total.
            inputs.extend(raw[key] for key in ("cache_creation_input_tokens", "cache_read_input_tokens")
                          if raw.get(key) is not None)
    if any(type(value) is not int or not 0 <= value <= 2**31 - 1 for value in (*inputs, output)):
        return None
    return TokenUsage(sum(inputs), output)


def record(state_root: Path, provider: str, model: str, task: str, usage: TokenUsage | None) -> None:
    state_root.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(state_root / "ai-usage.db")) as conn, conn:
        conn.execute(_SCHEMA)
        conn.execute("""
            INSERT INTO ai_usage VALUES (?, ?, ?, ?, 1, ?, ?, ?)
            ON CONFLICT(day, provider, model, task) DO UPDATE SET
                requests = requests + 1,
                measured = measured + excluded.measured,
                input_tokens = input_tokens + excluded.input_tokens,
                output_tokens = output_tokens + excluded.output_tokens
        """, (date.today().isoformat(), provider, model, task, int(usage is not None),
              usage.input_tokens if usage else 0, usage.output_tokens if usage else 0))


def summary(state_root: Path, *, include_oauth: bool, days: int = _DAYS) -> dict:
    path = state_root / "ai-usage.db"
    rows = []
    daily = []
    today = date.today()
    end = today.isoformat()
    start = (today - timedelta(days=days - 1)).isoformat()
    if path.exists():
        with closing(sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)) as conn:
            conn.row_factory = sqlite3.Row
            params = (start, end, include_oauth)
            rows = [dict(row) for row in conn.execute("""
                SELECT provider, model, task, SUM(requests) AS requests, SUM(measured) AS measured,
                       CASE WHEN SUM(measured)>0 THEN SUM(input_tokens) END AS input_tokens,
                       CASE WHEN SUM(measured)>0 THEN SUM(output_tokens) END AS output_tokens
                FROM ai_usage WHERE day BETWEEN ? AND ? AND (? OR provider <> 'openai-oauth')
                GROUP BY provider, model, task ORDER BY provider, SUM(requests) DESC, model, task
            """, params)]
            daily = [dict(row) for row in conn.execute("""
                SELECT day, provider, SUM(requests) AS requests, SUM(measured) AS measured,
                       CASE WHEN SUM(measured)>0 THEN SUM(input_tokens) END AS input_tokens,
                       CASE WHEN SUM(measured)>0 THEN SUM(output_tokens) END AS output_tokens
                FROM ai_usage WHERE day BETWEEN ? AND ? AND (? OR provider <> 'openai-oauth')
                GROUP BY day, provider ORDER BY day, provider
            """, params)]
    return {"days": days, "start": start, "end": end, "rows": rows, "daily": daily}


def _token_total(provider, row):
    if provider == "openai":
        fields = (row["input_tokens"], row["output_tokens"])
    else:
        cache = row["cache_creation"]
        fields = (row["uncached_input_tokens"], row["output_tokens"], row["cache_read_input_tokens"],
                  cache["ephemeral_1h_input_tokens"], cache["ephemeral_5m_input_tokens"])
    if any(type(value) is not int or value < 0 for value in fields):
        raise ValueError("Invalid organization token count")
    return sum(fields)


def _organization_usage(client, provider, url, key, days):
    end = datetime.now(timezone.utc)
    start_date = end.astimezone().date() - timedelta(days=days - 1)
    start = datetime.combine(start_date, time.min).astimezone(timezone.utc)
    params = {"bucket_width": "1d", "limit": 31}
    if provider == "openai":
        headers = {"Authorization": f"Bearer {key}"}
        params.update(start_time=int(start.timestamp()), end_time=int(end.timestamp()))
    else:
        headers = {"x-api-key": key, "anthropic-version": "2026-10-21"}
        params.update(starting_at=start.isoformat(timespec="seconds"), ending_at=end.isoformat(timespec="seconds"))

    total = 0
    for _ in range(4):
        response = client.get(url, params=params, headers=headers, timeout=6, follow_redirects=False)
        if response.status_code in (401, 403):
            return {"kind": "denied"}
        response.raise_for_status()
        page = response.json()
        for bucket in page["data"]:
            total += sum(_token_total(provider, row) for row in bucket["results"])
        if page["has_more"] is False:
            return {"kind": "organization", "tokens": total}
        cursor = page.get("next_page")
        if not isinstance(cursor, str) or not cursor or params.get("page") == cursor:
            break
        params["page"] = cursor
    return {"kind": "unavailable"}


def _deepseek_balance(state, record):
    key = ai_credentials.read_key(record.values) if record else ""
    if not key:
        return {"kind": "unconfigured"}
    response = state.http_transport.client.get("https://api.deepseek.com/user/balance",
                                               headers={"Authorization": f"Bearer {key}"},
                                               timeout=6, follow_redirects=False)
    if response.status_code in (401, 403):
        return {"kind": "denied"}
    response.raise_for_status()
    rows = response.json()["balance_infos"]
    balances = [{"currency": row["currency"], "amount": row["total_balance"]} for row in rows
                if row["currency"] in ("CNY", "USD") and isinstance(row["total_balance"], str)
                and re.fullmatch(r"-?\d{1,16}(?:\.\d{1,8})?", row["total_balance"])]
    return {"kind": "balance", "balances": balances} if balances else {"kind": "unavailable"}


def account_usage(state, provider, days):
    if provider == "openai-oauth":
        return {"kind": "subscription"}
    try:
        if ai_credentials.is_custom(provider):
            record = ai_credentials.store_for(state).load(provider)
            return {"kind": "custom" if record else "unconfigured"}
        if provider != "deepseek" and provider not in _REPORTS:
            return {"kind": "unavailable"}
        record = ai_credentials.store_for(state).load(provider)
        if record and record.values.get("base_url"):
            return {"kind": "unavailable"}
        if provider == "deepseek":
            return _deepseek_balance(state, record)
        variable, url = _REPORTS[provider]
        key = os.environ.get(variable, "").strip()
        if not key:
            return {"kind": "admin_required"}
        return _organization_usage(state.http_transport.client, provider, url, key, days)
    except (httpx.HTTPError, CredentialError, OSError, KeyError, TypeError, ValueError):
        return {"kind": "unavailable"}
