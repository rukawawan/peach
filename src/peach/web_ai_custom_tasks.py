"""Reusable user-defined AI tasks with a text input and a read-only answer."""
from __future__ import annotations

import json
import re
from secrets import token_hex

from . import web_ai_library, ai_prompts
from .ai_inference import InferenceError
from .follow_secrets import CredentialStore
from .user_messages import UserValueError

_ID = re.compile(r"fixed-[0-9a-f]{32}")
_SCHEMA = {"type": "object", "properties": {"answer": {"type": "string"}},
           "required": ["answer"], "additionalProperties": False}


def _store(state):
    return CredentialStore(state.web_contract.follow_state_root / "ai-custom-tasks")


def _text(value, limit, *, required=True):
    if (not isinstance(value, str) or len(value) > limit
            or re.search(r"[\x00\ud800-\udfff]", value) or (required and not value.strip())):
        raise UserValueError("api.aiLibrary.invalidCustomTask")
    return value.strip()


def _task(store, task_id):
    if not isinstance(task_id, str) or not _ID.fullmatch(task_id):
        raise UserValueError("api.aiLibrary.invalidCustomTask")
    result = store.load(task_id)
    if not result:
        raise UserValueError("api.aiLibrary.customTaskMissing", status_code=404)
    return result.values


def list_tasks(state, *, edit=False, allow_oauth=False):
    store = _store(state)
    rows = []
    for path in store.root.glob("fixed-*.json"):
        if not _ID.fullmatch(path.stem) or not (item := store.load(path.stem)):
            continue
        values = item.values
        if not allow_oauth and values.get("provider") == "openai-oauth" and not edit:
            continue
        row = {"id": item.provider, "name": values["name"], "provider": values.get("provider")}
        if edit:
            row.update(prompt=values["prompt"], model=values.get("model"), effort=values.get("effort"))
        rows.append(row)
    return {"tasks": sorted(rows, key=lambda row: (row["name"].casefold(), row["id"]))}


def configure(state, body, *, allow_oauth):
    store = _store(state)
    task_id = body.get("id")
    revision = None
    if task_id is not None:
        if not isinstance(task_id, str) or not _ID.fullmatch(task_id):
            raise UserValueError("api.aiLibrary.invalidCustomTask")
        revision = store.revision(task_id)
        if revision is None:
            raise UserValueError("api.aiLibrary.customTaskMissing", status_code=404)
    if body.get("remove") is True:
        if task_id is None:
            raise UserValueError("api.aiLibrary.invalidCustomTask")
        store.clear(task_id)
    else:
        task_id = task_id or "fixed-" + token_hex(16)
        name = _text(body.get("name"), 80)
        if len(name.splitlines()) != 1:
            raise UserValueError("api.aiLibrary.invalidCustomTask")
        values = {"name": name, "prompt": _text(body.get("prompt"), ai_prompts.LIMIT)}
        if body.get("connection") is not None:
            if not isinstance(body["connection"], dict):
                raise UserValueError("api.aiLibrary.invalidCustomTask")
            values.update(web_ai_library.validate_task_selection(state, body["connection"], allow_oauth=allow_oauth))
        if not store.save_if_unchanged(task_id, values, revision):
            raise UserValueError("api.aiLibrary.customTaskChanged", status_code=409)
    return {"id": task_id, **list_tasks(state, edit=True, allow_oauth=allow_oauth)}


def run(state, body, *, allow_oauth, on_usage, prompt_language):
    item = _task(_store(state), body.get("id"))
    text = _text(body.get("text", ""), 500, required=False)
    selection = {field: item[field] for field in ("provider", "model", "effort")} if item.get("provider") else None
    provider, request = web_ai_library.task_request(
        state, "custom", selection=selection, selection_target=item if selection else None,
        allow_oauth=allow_oauth, on_usage=on_usage, prompt_scope="system", prompt_language=prompt_language,
    )
    instructions = (
        "Run this user's saved text task. Return an object with an answer string. Use the supplied text if present. "
        "No tools, files, catalog data or web access are available. Do not claim to have accessed them or performed changes. "
        "If the task needs missing data, say which input is needed. Write the answer in the requested language. "
        "Saved task instructions: " + json.dumps(item["prompt"], ensure_ascii=False)
    )
    try:
        result = request(json.dumps({"text": text}, ensure_ascii=False), None, _SCHEMA, instructions=instructions)
    except InferenceError as exc:
        raise UserValueError("api.aiLibrary." + exc.code, status_code=502) from None
    answer = result.data.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        raise UserValueError("api.aiLibrary.invalid_output", status_code=502)
    return {"answer": answer.strip()[:16000], "name": item["name"], "provider": provider, "model": result.model}
