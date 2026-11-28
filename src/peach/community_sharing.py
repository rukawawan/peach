"""一次预览和确认，分别保存两类共建数据的授权与回执。"""
from __future__ import annotations

import logging

from filelock import Timeout

from . import library_sharing
from .user_messages import UserValueError

_LOG = logging.getLogger(__name__)


def snapshot(library, seed):
    return {"library": library_sharing.snapshot(library.config), "metadata": seed.snapshot()}


def save(library, seed, body):
    enabled = body.get("enabled")
    if type(enabled) is not bool:
        raise UserValueError("errors.seedSharing.invalidChoice")
    failed = []
    # 两份预览要在任何写入前一起校验，期间不能被其他预览或设置请求替换。
    with library._lock, seed._mutex:
        services = (("library", library), ("metadata", seed))
        for key, service in services:
            preview = body.get(key)
            draft = {"enabled": enabled, "consent": body.get("consent")}
            if isinstance(preview, dict):
                draft.update(preview_token=preview.get("token"), schema=preview.get("schema"))
            service.validate_choice(draft)

        current = snapshot(library, seed)
        for key, service in services:
            if enabled and current[key]["enabled"]:
                continue
            if not enabled and not current[key]["enabled"] and (key != "library"
                    or current[key].get("consent_state") != "needs-consent"):
                continue
            try:
                service._save_valid_choice(enabled)
            except (OSError, Timeout):
                _LOG.exception("Could not save community sharing choice for %s", key)
                failed.append(key)
        return {**snapshot(library, seed), "failed": failed}
