"""每个发布版本给使用者看的更新公告；不是变更日志的副本。

一版一条，只写使用者需要知道的：新入口、更新后自动进行的事、需要自己动手的事。每条说明一句短话；
修复与完整清单留给 Release 页的变更日志。

条目字段：
- `platforms`：只对这些平台或安装方式显示，取值见 `release_notice.PLATFORM_TOKENS`，`+` 连接表示同时满足（如 `macos+standalone`）；省略表示全部。
- `when`：只在这台机器的数据满足条件时显示，取值见 `release_notice.FACTS`；省略表示总是显示。
- `route`：「查看」跳转的应用内路径。
- `icon`：前端 `release-notice.tsx` 的 `ICONS` 里的键。

`level` 为 `quiet` 的版本不弹窗，只在设置页留记录。只写有制品的版本；minor 版本没有公告时
`scripts/release_tag.py --bump` 拒绝定版。
"""
from __future__ import annotations

NOTICES: dict[str, dict] = {
    "0.57.0": {
        "level": "notice",
        "headline": "更稳、更快，新增容量保护",
        "features": [
            {"title": "容量保护", "icon": "storage", "body": "给数据和缓存设上限",
             "route": "/settings/maintenance#storageBudgetSettings"},
            {"title": "拖动排序", "icon": "reorder", "body": "侧栏和各类菜单都能拖动排序"},
            {"title": "按媒体库同步", "icon": "library", "body": "扫描和采集可以只选一个库", "route": "/data-cleanup"},
            {"title": "新作多选", "icon": "select", "body": "批量加入想要或查找资源", "route": "/jav"},
            {"title": "修复与迁移", "icon": "refresh", "body": "查看升级修复的进度，确认清理关注旧快照",
             "route": "/settings/maintenance/repairs"},
        ],
        "automatic": [
            {"id": "display-dimensions", "icon": "resize", "when": "display_reprobe",
             "title": "补测视频尺寸", "body": "后台修正横竖屏判断"},
            {"id": "system-files", "icon": "server", "when": "system_files",
             "title": "移出系统附属文件", "body": "NAS 缩略图、macOS 的 ._ 文件不再算作视频"},
            {"id": "garbled-performers", "icon": "person", "when": "garbled_performers",
             "title": "清理乱码人物", "body": "重新补采演员"},
            {"id": "javdb-entries", "icon": "switch", "when": "javdb_entries",
             "title": "收起错配的 JavDB 入口", "body": "人物页不再给出同名旧艺名的空页"},
        ],
        "attention": [
            {"title": "网盘视频可以手动补测尺寸", "when": "display_cloud_pending",
             "route": "/settings/maintenance/repairs",
             "body": "为免撑大网盘缓存，网盘里的视频没有自动补测"},
        ],
    },
    "0.56.0": {
        "level": "notice",
        "headline": "JavDB 主机轮换与页面提速",
        "features": [
            {"title": "Docker 首次设置", "icon": "shield", "platforms": ["docker"], "body": "可设密码或免登录"},
            {"title": "ghcr.io 镜像", "icon": "stack", "platforms": ["docker"], "body": "Docker Hub 受限时可改用"},
            {"title": "JavDB 主机轮换", "icon": "switch", "body": "一个主机不通自动换下一个"},
            {"title": "页面提速", "icon": "speed", "body": "任务中心和统计页打开更快"},
        ],
    },
    "0.55.1": {"level": "quiet", "headline": "统计与作品列表首次打开更快"},
    "0.55.0": {
        "level": "notice",
        "headline": "重新抓取资料与账本备份",
        "features": [
            {"title": "重新抓取资料", "icon": "refresh", "body": "在影片详情逐字段选用"},
            {"title": "Docker 一键更新", "icon": "stack", "platforms": ["docker"], "body": "启用 Watchtower 后可用"},
            {"title": "账本备份", "icon": "database", "body": "随时备份或恢复"},
        ],
    },
    "0.54.0": {
        "level": "notice",
        "headline": "JAV 新作分区与 SMB 扫描提速",
        "features": [
            {"title": "JAV 新作", "icon": "sparkle", "body": "列出订阅到、还没入库的新作"},
            {"title": "macOS 应用内更新", "icon": "refresh", "platforms": ["macos+standalone"], "body": "在检查更新里直接替换"},
            {"title": "SMB 扫描提速", "icon": "speed", "body": "整趟共用一条连接"},
        ],
    },
}
