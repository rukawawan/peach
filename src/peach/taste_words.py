"""口味分析认的原词：维度匹配词、停用词、馆藏规范标签名与成人站标题记号（ADR-0159 第四条，内容数据）。

这里的中文是要在浏览历史的网址与标题、馆藏标签里**认出来**的原词，以及馆藏里本来就叫这个名字的标签；
维度与分档给人看的名字在 `taste.*` 资源里，不在这里。整份列入 `scripts/check_backend_copy.py` 的
`CONTENT_FILES`，判据逻辑留在 `taste_history.py`、`taste_sites.py`。
"""
from __future__ import annotations

import re

STOPWORDS = {
    "and", "com", "download", "for", "from", "html", "http", "https", "in", "index", "is",
    "login", "of", "one", "page", "search", "the", "this", "to", "video", "watch", "www",
    "图片", "搜索", "视频",
}

#: 口味维度：键是维度 id，显示名在 `taste.category.<id>`；值是识别网址与标题用的匹配词（内容数据）。
CATEGORY_TERMS: dict[str, set[str]] = {
    "feet": {"feet", "foot", "footjob", "soles", "toes", "足", "足交", "脚", "脚交"},
    "animation": {"3d", "animation", "blender", "daz", "sfm", "动画"},
    "cosplay": {"cosplay", "jk", "maid", "schoolgirl", "uniform", "制服", "女仆", "角色扮演"},
    "breasts": {"bigbreasts", "bigboobs", "boobs", "breasts", "tits", "巨乳", "乳"},
    "oral": {"blowjob", "deepthroat", "oral", "口交", "深喉"},
    "glans": {"glans", "glansjob", "sounding", "urethra", "尿道", "马眼", "龟头"},
    "asmr": {"asmr", "audio", "音声"},
    "gameDoujin": {"detroit", "detroitbecomehuman", "game", "gamecg", "hgame", "游戏", "同人"},
    "leaks": {"leak", "leaked", "private", "反差", "探花", "泄密", "流出"},
}

#: 每个维度在馆藏里对应的规范标签名（内容数据），口味总结据此给出可以点进去的标签。
TASTE_CATEGORY_TAGS: dict[str, tuple[str, ...]] = {
    "animation": ("3D动画", "游戏同人", "动漫同人"),
    "oral": ("口交", "打扫口交", "深喉"),
    "cosplay": ("制服", "角色扮演", "JK制服", "女仆"),
    "feet": ("足交", "恋足", "裸足"),
    "gameDoujin": ("游戏同人", "动漫同人", "日系同人"),
    "breasts": ("巨乳", "美乳"),
    "glans": ("马眼", "龟头责"),
    "asmr": ("ASMR", "淫语"),
    "leaks": ("反差", "泄密流出", "探花"),
}

#: 不进口味总结的字幕与修复标签（馆藏规范标签名），与 `catalog_rules` 的技术、时长标签一起排除。
SUBTITLE_AND_RESTORE_TAGS = frozenset({"中文字幕", "内嵌字幕", "外挂字幕", "AI修复", "AI去码", "60fps"})
#: 标题匹配内容词表时排除的省写与单字：离开来源语境就认不准。
TITLE_AMBIGUOUS_TERMS = frozenset({"お掃除", "掃除", "仁王立ち", "ノーハンド", "swallow", "oral", "private", "生"})
#: 网页标题里自报是成人站的写法（`taste_sites.adult_title`）。
ADULT_TITLE = re.compile(r"\b(?:nsfw|r[- ]?18|onlyfans|fansly|pornstar|porn|hentai|jav|javdb|javbus|fanza|rule34|erotica|adult creator)\b|18\+|成人向|成人創作者|成人创作者|AV女優", re.I)
