"""开发工具旧版产物里的中文取值到英文 id 的对照，只放数据（ADR-0159 第三条）。

复核 CSV、续跑日志与输出 JSON 里会被代码读回比对的取值现在写英文 id；数据根里还留着旧版脚本写下的
中文值，读入时先按这里的表归一再比较。键是旧值，值是现在的 id，id 由写入方的脚本定义。
西方身份候选（`babepedia-candidates.csv`）的取值复核页也要读，对照在 `peach.catalog_vocabulary`。
"""
from __future__ import annotations

#: `harvest_directory_links.py` 的 `*-portraits.csv` `verdict`，`harvest_social_avatars.py` 读。
JAE_PORTRAIT_VERDICTS = {"命中": "matched"}
#: `fetch_fc2_metadata.py` 候选日志 `fc2-candidate-log.csv` 的 `result`。
FC2_LOG_RESULTS = {"取得": "found", "未取得": "missed"}
#: `backfill_rule34_details.py` 复核 CSV 的 `written`，续跑按它跳过已写入的条目。
RULE34_WRITTEN = {"是": "yes", "否": "no"}
#: `backfill_rule34video_characters.py` 复核 CSV 的 `written` 与 `result`，续跑按它们跳过问定的条目。
RULE34VIDEO_WRITTEN = {"是": "yes", "否": "no"}
RULE34VIDEO_RESULTS = {"取得": "found", "未取得": "missed", "跳过": "skipped", "无需改动": "unchanged"}
#: `find_studio_socials.py` 旧版进度文件没有 `result` 列，没取到的行说明以它开头，`--resume` 按它重查。
STUDIO_SOCIALS_MISSED_NOTE = "未取得"
#: `harvest_company_profiles.py` 输出 JSON 的 `status`，续跑按它跳过核查过的厂牌。
COMPANY_PROFILE_STATUSES = {"已核查": "checked", "未取得": "missed"}
#: `localize_studio_names.py` 复核件的 `verdict`，`apply_studio_name_localization.py` 只认改名那一种。
STUDIO_LOCALIZATION_VERDICTS = {
    "改名": "rename", "保留（片假名外来语）": "keep-katakana", "保留（来源也是拉丁）": "keep-latin",
    "保留（已是日文）": "keep-japanese", "不一致": "makers-differ", "未取得": "missed",
    "不适用（非番号体系）": "not-applicable",
}
#: `harvest_javdb_cn_names.py` 两份复核 CSV 的 `verdict`，`localize_performer_names.py --accept` 与
#: `apply_alias_candidates.py --accept` 读；命令行里照抄旧判定词也按它归一。
JAVDB_NAME_VERDICTS = {
    "旧名": "former-name", "多义": "ambiguous", "同形（站上只有日文名）": "japanese-only", "要登录": "login-required",
    "未取得": "missed", "取页失败": "fetch-failed", "改艺名（现名栏是另一个艺名）": "renamed",
    "不同名（两栏姓氏对不上）": "unrelated-names", "多页（同名两位，分不清是哪一页）": "several-pages",
    "占用（另一条实体已有这个名字）": "taken", "无新写法": "nothing-new",
}
#: `apply_alias_candidates.py` 读的候选 `verdict`：javdb 那一份的判定词，加上人手填的「删除」。
ALIAS_CANDIDATE_VERDICTS = {**JAVDB_NAME_VERDICTS, "删除": "remove"}
