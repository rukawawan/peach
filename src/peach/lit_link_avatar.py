"""lit.link 本人资料头像：区分 profile icon、链接配图与分享海报。"""
from __future__ import annotations

import html
import re
from urllib.parse import parse_qs, urlsplit

from bs4 import BeautifulSoup


_ICON_URL = re.compile(
    r"https://prd\.storage\.lit\.link/images/creators/[^/\s\"'<>\\]+/icons/[^\s\"'<>\\]+",
    re.I)


def parse_avatar_url(body: str) -> str:
    """仅认本人头像节点；原图须同时出现在页面声明中。"""
    decoded = html.unescape(body).replace(r"\/", "/")
    profile = BeautifulSoup(body, "html.parser").find("img", alt="profile icon")
    icon = str(profile.get("src") or "") if profile is not None else ""
    if icon:
        parsed = urlsplit(icon)
        if parsed.scheme != "https":
            return ""
        if (parsed.hostname == "prd.resource-api.lit.link"
                and parsed.path == "/v1/images/resized"):
            original_path = parse_qs(parsed.query).get("image_url", [""])[0]
            if (not original_path.startswith(("images/creator/", "images/creators/"))
                    or "/ogp/" in original_path):
                return ""
            original = "https://prd.storage.lit.link/" + original_path
            if original_path and original in decoded:
                return original
            return icon
        if (parsed.hostname == "prd.storage.lit.link"
                and parsed.path.startswith(("/images/creator/", "/images/creators/"))
                and "/ogp/" not in parsed.path):
            return icon
        return ""
    found = _ICON_URL.search(decoded)
    return found.group(0) if found else ""
