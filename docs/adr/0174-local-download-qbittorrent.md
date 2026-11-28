# ADR-0174：本地下载接入 qBittorrent Web API

- 状态：Accepted；社区报告 qB 4.6.4 与 fnOS 已验证；qB 5.1.0 已完成隔离 Docker 下载、入库与播放验收
- 日期：2026-10-29
- 关系：补充 ADR-0089、ADR-0123；界面文字按 ADR-0156、ADR-0159 走语言资源

## 背景

ADR-0089 把云下载定义为「把磁力交给 115 或 PikPak 离线下载」，并说明 `download_task` 状态机同时服务本地下载；当时只实现了云端 provider。NAS 用户常把下载器放在另一台机器上，希望 Peach 搜索到的磁力直接交给本机或局域网里的 qBittorrent，而不是必须走网盘离线。

飞牛 fnOS 应用中心提供 qBittorrent，标准 Web API v2 可提交、查询和取消磁力任务。飞牛系统自带的「下载」应用没有公开稳定的 REST API；官方 2026-09 的 CLI 走 OAuth/CLI，适合智能体调用，不适合作为 Peach 的通用 provider。因此第一版只接 qBittorrent Web API。

## 决策

1. 新增 `peach.downloads_qbittorrent`，实现现有 `OfflineProvider` 协议。沿用 `DownloadService` 的提交幂等、状态机、退避、取消与后处理，不另建下载队列。
2. qBittorrent 是本地下载器，`download_task.provider` 记 `qbittorrent`，`DownloadTask.location` 投影为 `local`；账本仍只由 `asset` 回答作品是否存在。
3. 提交参数显式写 `savepath`、`autoTMM=false`、`contentLayout=Original`、`tags=peach`，避免 qB 的自动种子管理或分类规则改变落地目录。添加前按 infohash 查任务，已有就接管；失败任务先删再交，不重复扣配额。
4. 跨机路径用两项显式映射：下载器保存目录 `local_root` 与 Peach 媒体库根目录 `root`。落地时把 实际内容路径相对保存目录的部分接到账本根目录；Peach 通过本地挂载或 SMB 读取同一个目录。第一版要求保存目录本身对应一个已声明媒体根，不做子目录猜测。
5. qB 完成后可能自动清理种子。Peach 确认完成后仍可按文件落地；确认前任务消失则按宽限期报告未接受或已删除。文件存在不能证明下载完整，不根据残留分片猜测完成。移动、校验和恢复检查期间继续等待。
6. 地址、保存目录、媒体目录存 `state/downloads.json`；用户名与密码存本机 CredentialStore 的 `download-qbittorrent`，不声明同步字段。响应只报 `username` 与 `password_set`，不回密码。
7. 设置页只放本机或私有网络入口，qB 地址沿用 `clean_address` 的协议/主机/端口校验。检查只登录、读版本和默认保存目录，不提交任务。
8. 界面文字不写死在源码：错误与提示是 `resources/locales/<语言>/server.json` 的 code（`errors.downloadsQbittorrent.*`、`labels.downloadsQbittorrent.*`），设置卡文案在 `settings` 命名空间；本地任务的状态名用 `download.state.local.*`，不带「网盘」字样。

## 取舍

- 不直接接飞牛自带「下载」应用：它没有公开稳定的 REST API，逆向内部接口会把上游 PR 绑在未公开协议上。应用中心的 qBittorrent 是标准 Web API，其他 NAS 和 Docker 也能复用。
- 不引入 `qbittorrent-api` 等第三方 SDK：现有 `httpx` 足够，依赖策略要求精确固定版本；HTTP API 的字段和错误分类由 Peach 自己掌握。
- 跨机必须显式映射，不能从 qB 路径猜 Peach 挂载点。Peach 与 qB 在同一台机器、Docker 或不同机器时，三套路径关系由用户声明一次。
- 入库后跳过 qB 文件的自动改名与移动，保持做种路径；取消只删 qB 任务，不删文件；未完成的分片文件需要用户自行清理，和 115 取消不删云端文件的语义一致。
- 第一版只处理磁力。种子上传、HTTP/FTP 直链和飞牛原生下载留到后续；`download_task.info_hash` 为空的行已由现有 schema 预留。

## 后果

- 资源搜索、JAV 浏览器添加、想要清单和作品详情的「搜索资源」自动复用 qBittorrent 渠道，不需要新入口。
- 跨机部署必须先把下载目录声明为 Peach 的本地或 SMB 媒体根，并让 qB 对该目录有写权限；否则任务能提交，但落地时会报「目标目录中未找到下载文件」。
- qB 的自动删除完成种子、自动种子管理、分类保存路径可能影响对账；提交时固定保存目录和目录结构，读取实际内容路径，保存目录变化时重新核对映射。种子至少保留到 Peach 确认下载完成。
- 真实 qB 版本差异（4.6 与 5.x 的 `paused`/`stopped` 参数）由同时发送两个字段兼容；仍需在目标 NAS 上验收。
