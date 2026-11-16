"""旧记录里的界面文字一次性转成 code（ADR-0159 第五条）。

升级前写下的任务行（`task_run` 的进度说明、结束原因、结果摘要里的结论与来源）与后继的补全记录
（`followup-attempts/*.json`）只有中文原文。这里拿模板反推：一条模板变成一个正则，参数位置按类型
匹配数字或文字，再把整句切成依次对得上的几段。对上了就改存 code 与参数，原文清空；对不上的
（文件名、异常原文、更早版本的措辞）原样保留，界面照原文显示。

代码里不写中文。进度说明与结束原因按 zh-CN 语言资源认；结论段落的正式文字会改写，按旧版本写进库里的
措辞认，那份措辞存在 `resources/upgrade/interface-text-legacy.json`，只供这一步读。判断只看 code，
对不上的旧句子不影响任何判断。

由 `upgrade_repairs` 在服务启动前执行一次，改动前的原值逐条记进回执（`ledger_upgrade_repair`），
补全记录的原值随同一份回执保存。
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from . import interface_text, task_outcomes, task_runs, task_stages, upgrade_rules

RECEIPT_KEY = f"interface-text-codes-{upgrade_rules.INTERFACE_TEXT_CODES}"
#: 这些参数在库里是整数。
NUMERIC = frozenset({"count", "landed", "images", "run"})
#: 模板里的 `{{参数}}` 占位。
_PARAM = re.compile(r"\{\{(\w+)\}\}")
#: 中日文汉字：只有带汉字的旧原文才值得转。
_HAN = re.compile(f"[{chr(0x3400)}-{chr(0x9FFF)}]")


def _pattern(template: str, fixed: dict[str, str] | None = None) -> re.Pattern:
    """模板变成整句正则。`fixed` 里的参数换成给定的文字（任务名）或备选（阶段名、触发方式）。"""
    out, position = [], 0
    for match in _PARAM.finditer(template):
        out.append(re.escape(template[position:match.start()]))
        name = match.group(1)
        if fixed and name in fixed:
            out.append(f"(?P<{name}>{fixed[name]})")
        elif name in NUMERIC:
            out.append(f"(?P<{name}>\\d+)")
        else:
            out.append(f"(?P<{name}>.+?)")
        position = match.end()
    out.append(re.escape(template[position:]))
    return re.compile("".join(out), re.S)


def _template(key: str) -> str:
    return interface_text.template(f"server:{key}")


#: 旧版本写进库里的结论措辞（zh-CN）。结论的正式文字之后可以改写，这份只供转换认旧记录，不随界面改。
LEGACY_OUTCOMES = interface_text.LOCALES.parent / "upgrade" / "interface-text-legacy.json"


@lru_cache(maxsize=1)
def _legacy() -> dict[str, str]:
    return json.loads(LEGACY_OUTCOMES.read_text(encoding="utf-8"))["outcome"]


@lru_cache(maxsize=1)
def _outcome_grammar() -> tuple[list[tuple[str, str]], list[tuple[str, re.Pattern]]]:
    """结论段落：纯文字的段按长短排（长的先比），带参数的段编成正则。"""
    literals, patterns = [], []
    for code in task_outcomes.CODES:
        template = _legacy().get(code)
        if template is None:
            continue
        if _PARAM.search(template):
            patterns.append((code, _pattern(template)))
        else:
            literals.append((code, template))
    literals.sort(key=lambda item: -len(item[1]))
    return literals, patterns


def _params(match: re.Match) -> dict:
    return {name: int(value) if name in NUMERIC else value for name, value in match.groupdict().items()}


def outcome_parts(text: str) -> list[dict] | None:
    """一句旧结论切成段落；整句对不上就是 None。"""
    if not text:
        return None
    literals, patterns = _outcome_grammar()
    separators = {_legacy()[code] for code in ("semicolon", "comma", "listComma")}
    ends = sorted({len(text)} | {index for index, char in enumerate(text) if char in separators})
    memo: dict[int, list[dict] | None] = {}

    def at(start: int) -> list[dict] | None:
        if start == len(text):
            return []
        if start in memo:
            return memo[start]
        found = None
        for code, literal in literals:
            if text.startswith(literal, start) and (rest := at(start + len(literal))) is not None:
                found = [task_outcomes.part(code)] + rest
                break
        if found is None:
            # 分界从近到远试：参数是任意文字，先认最短的一段，免得一个站名把后面几段都吞进去。
            for end in (index for index in ends if index > start):
                for code, pattern in patterns:
                    match = pattern.fullmatch(text, start, end)
                    if match is None or (rest := at(end)) is None:
                        continue
                    params = _params(match)
                    if code == "deferredBy" and (nested := outcome_parts(str(params.get("reason", "")))):
                        params["reason"] = nested
                    found = [task_outcomes.part(code, **params)] + rest
                    break
                if found is not None:
                    break
        memo[start] = found
        return found

    return at(0)


@lru_cache(maxsize=None)
def _row_grammar(group: str, task_key: str) -> list[tuple[str, re.Pattern]]:
    """一行的进度说明或结束原因可能是哪一句：`taskRun.<group>.*` 各模板，任务名换成这一行的任务名。"""
    keys = task_runs.PROGRESS_KEYS if group == "progress" else task_runs.ERROR_KEYS
    stages = "|".join(re.escape(task_stages.text(code)) for code in
                      sorted(task_stages.STAGE_CODES, key=lambda code: -len(task_stages.text(code))))
    triggers = "|".join(re.escape(task_runs.trigger_label(trigger)) for trigger in task_runs.TRIGGERS)
    fixed = {"task": re.escape(task_runs.task_label(task_key)), "stage": stages, "trigger": triggers}
    return [(f"taskRun.{group}.{key}", _pattern(_template(f"taskRun.{group}.{key}"), fixed)) for key in keys]


@lru_cache(maxsize=1)
def _names() -> dict[str, dict[str, str]]:
    """阶段名、触发方式名 → id，参数里存的是 id。"""
    return {"stage": {task_stages.text(code): code for code in task_stages.STAGE_CODES},
            "trigger": {task_runs.trigger_label(trigger): trigger for trigger in task_runs.TRIGGERS}}


def row_code(group: str, text: str, task_key: str) -> tuple[str, dict] | None:
    """一句旧的进度说明（`progress`）或结束原因（`error`）对应的 code 与参数。"""
    if not text:
        return None
    if group == "progress":
        stage = _names()["stage"].get(text)
        if stage:
            return f"stage.{stage}", {}
        if task_key in task_runs.TASK_KEYS and text == task_runs.task_label(task_key):
            return "taskRun.progress.item", {"name": ""}
    for code, pattern in _row_grammar(group, task_key):
        match = pattern.fullmatch(text)
        if match is None:
            continue
        params = {name: value for name, value in _params(match).items() if name != "task"}
        for name in ("stage", "trigger"):
            if name in params:
                params[name] = _names()[name][params[name]]
        return code, params
    return None


def _summary(summary: dict) -> dict | None:
    """结果摘要里的结论、来源（以及厂牌后继嵌在 `site` 里的那一句）改存段落；没变化是 None。"""
    changed = dict(summary)
    for field in task_outcomes.FIELDS:
        text = changed.get(field)
        if isinstance(text, str) and _HAN.search(text) and f"{field}_parts" not in changed:
            parts = outcome_parts(text)
            if parts is not None:
                changed.pop(field)
                changed[f"{field}_parts"] = parts
    site = changed.get("site")
    if isinstance(site, dict) and (inner := _summary(site)) is not None:
        changed["site"] = inner
    return changed if changed != summary else None


def convert_task_runs(connection) -> dict:
    """转换全部旧任务行，返回改了几行与每行的原值（id → 改动前的列）。"""
    originals: dict[str, dict] = {}
    rows = connection.execute(
        "SELECT id,task_key,progress_label,progress_code,error,error_code,result_summary FROM task_run").fetchall()
    for row_id, task_key, label, label_code, error, error_code, summary_json in rows:
        before, assignments, values = {}, [], []
        for group, column, text, code in (("progress", "progress_label", label, label_code),
                                          ("error", "error", error, error_code)):
            if code or not text or not _HAN.search(text):
                continue
            found = row_code(group, text, task_key)
            if found is None:
                continue
            prefix = "progress" if group == "progress" else "error"
            assignments += [f"{column}=NULL", f"{prefix}_code=?", f"{prefix}_params=?"]
            values += [found[0], json.dumps(found[1], ensure_ascii=False)]
            before[column] = text
        try:
            summary = json.loads(summary_json or "{}")
        except ValueError:
            summary = None
        if isinstance(summary, dict) and (converted := _summary(summary)) is not None:
            assignments.append("result_summary=?")
            values.append(json.dumps(converted, ensure_ascii=False))
            before["result_summary"] = summary_json
        if assignments:
            connection.execute(f"UPDATE task_run SET {','.join(assignments)} WHERE id=?", (*values, row_id))
            originals[str(row_id)] = before
    return {"rows": len(originals), "originals": originals}


def plan_attempts(root: Path) -> dict[str, tuple[str, list[dict]]]:
    """补全记录里对得上的那些：文件名 → (原文, 段落)。只读，写回交给 `apply_attempts`。"""
    planned = {}
    for path in sorted(Path(root).glob("*.json")):
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        text = record.get("outcome") if isinstance(record, dict) else None
        if isinstance(text, str) and "outcome_parts" not in record and (parts := outcome_parts(text)) is not None:
            planned[path.name] = (text, parts)
    return planned


def apply_attempts(root: Path, planned: dict[str, tuple[str, list[dict]]]) -> int:
    """按计划把补全记录的 `outcome` 原文换成 `outcome_parts`；文件在这期间又被改写过的跳过。"""
    changed = 0
    for name, (text, parts) in planned.items():
        path = Path(root) / name
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if not isinstance(record, dict) or record.get("outcome") != text:
            continue
        record.pop("outcome")
        record["outcome_parts"] = parts
        path.write_bytes(json.dumps(record, ensure_ascii=False).encode("utf-8"))
        changed += 1
    return changed
