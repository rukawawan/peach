"""每个发布版本给使用者看的更新公告；不是变更日志的副本。

一版一条，只写使用者需要知道的：新入口、更新后自动进行的事、需要自己动手的事。每条说明一句短话；
修复与完整清单留给 Release 页的变更日志。

条目字段：
- `id`：条目在这一版里的稳定 id。这一版的总标题和每条的标题、说明只写在 `resources/locales/<语言>/server.json` 的
  `releaseNotes.v<版本，点换成连字符>`（`headline`、`items.<id>.title`、`items.<id>.body`，ADR-0159）；
  `tests/test_user_messages.py` 核对每条都有中英文。
- `platforms`：只对这些平台或安装方式显示，取值见 `release_notice.PLATFORM_TOKENS`，`+` 连接表示同时满足（如 `macos+standalone`）；省略表示全部。
- `when`：只在这台机器的数据满足条件时显示，取值见 `release_notice.FACTS`；省略表示总是显示。
- `route`：「查看」跳转的应用内路径。
- `icon`：前端 `release-notice.tsx` 的 `ICONS` 里的键。

`level` 为 `quiet` 的版本不弹窗，只在设置页留记录。只写有制品的版本；minor 版本没有公告时
`scripts/release_tag.py --bump` 拒绝定版。
"""
from __future__ import annotations

NOTICES: dict[str, dict] = {
    "0.58.0": {
        "level": "notice",
        "features": [
            {"id": "english-interface", "icon": "switch"},
            {"id": "browser-intake", "icon": "sparkle"},
            {"id": "docker-arm64", "icon": "stack", "platforms": ["docker"]},
            {"id": "docker-nas-setup", "icon": "server", "platforms": ["docker"]},
        ],
    },
    "0.57.0": {
        "level": "notice",
        "features": [
            {"id": "storage-budget", "icon": "storage",
             "route": "/settings/maintenance#storageBudgetSettings"},
            {"id": "reorder", "icon": "reorder"},
            {"id": "library-sync", "icon": "library", "route": "/data-cleanup"},
            {"id": "new-releases-multiselect", "icon": "select", "route": "/jav"},
            {"id": "repair-center", "icon": "refresh",
             "route": "/settings/maintenance/repairs"},
        ],
        "automatic": [
            {"id": "display-dimensions", "icon": "resize", "when": "display_reprobe"},
            {"id": "system-files", "icon": "server", "when": "system_files"},
            {"id": "garbled-performers", "icon": "person", "when": "garbled_performers"},
            {"id": "javdb-entries", "icon": "switch", "when": "javdb_entries"},
        ],
        "attention": [
            {"id": "cloud-display-repair", "when": "display_cloud_pending",
             "route": "/settings/maintenance/repairs"},
        ],
    },
    "0.56.0": {
        "level": "notice",
        "features": [
            {"id": "docker-first-setup", "icon": "shield", "platforms": ["docker"]},
            {"id": "ghcr-image", "icon": "stack", "platforms": ["docker"]},
            {"id": "javdb-host-rotation", "icon": "switch"},
            {"id": "faster-pages", "icon": "speed"},
        ],
    },
    "0.55.1": {"level": "quiet"},
    "0.55.0": {
        "level": "notice",
        "features": [
            {"id": "docker-one-click", "icon": "stack", "platforms": ["docker"]},
            {"id": "ledger-backup", "icon": "database"},
        ],
    },
    "0.54.0": {
        "level": "notice",
        "features": [
            {"id": "new-releases", "icon": "sparkle"},
            {"id": "macos-in-app-update", "icon": "refresh", "platforms": ["macos+standalone"]},
            {"id": "smb-faster-scan", "icon": "speed"},
        ],
    },
}
