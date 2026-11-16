# 页面路由

`GET /api/items?summary_only=1` 按相同筛选只返回 `total`、`bytes` 和 `work_total`。馆藏网格先读取 `count=0` 的首屏条目，再独立取得统计和后续条目；既有调用不带该参数时行为不变。

「应用与维护」的存储状态使用 `GET /api/configuration/storage`；`POST /api/configuration/storage/measure` 启动统计，`POST /api/configuration/storage/clean` 按所选类别清理，`POST /api/configuration/storage/policy` 保存本机容量保护（`enabled` 总开关默认开启）并返回同一状态形状。`GET /api/configuration/storage/external-cache` 只读本机 CloudDrive 缓存目录，不自动保存；需要登录与本机管理，未配置、远程地址、权限不足或路径不可读取返回 400。容量数值为整数 `GiB`，`0` 表示自动磁盘保留值或不设对应总量上限；外部缓存目录不会由 Peach 删除。写请求需要登录、本机管理与同源检查，字段或目录无效返回 400，跨站请求返回 403；统计或清理已在运行时返回 409。规则与清理边界见[容量保护](OPERATIONS.md#容量保护与显示尺寸补测)。

`GET /api/result-updates` 是每个页面常驻的那一处轻量检查：返回结果版本 `result_versions`、入库通知 `ingest_notices`、有没有任务在排或在跑 `busy`，以及在排在跑的任务 `running_tasks`。`running_tasks` 每个 `task_key` 一项 `{task_key, run_id, status}`，按 `task_key` 排序；有一轮在跑时 `status` 为 `running`、`run_id` 是在跑的最新一轮，只在排队时为 `pending` 与最新排进来的那一轮，没有任务时是空数组。页面有任务时每 5 秒、闲着每 10 秒读一次，读失败按 4、8、16、30 秒退避；其余页面只读这份缓存决定要不要开始读自己的任务进度，闲着时不各自轮询。

馆藏处理的 `POST /api/library-processing` 支持按 `job_id` 暂停、继续、取消及归档结束提示；`stopping` 仍占用当前范围，`cancelled` 不自动恢复。`scope=new` 在启动时解析成固定资产集合，不与 `asset_ids` 或失败重试混用。状态只返回新入库数量，不下发内部处理路径。

`GET /api/library-processing/issues` 返回任务号、内容摘要 `revision`、总数、偏移和记录。导出后续页传入首份摘要；同任务追加、恢复或记录替换时拒绝混合读取。旧完整问题数组可分页读取，原始记录缺失或损坏作为失败返回。

列表使用一层路径，详情使用两层路径。查询参数表达筛选、排序与播放上下文；名称只用于展示和检索。

## 详情对象

| 对象 | 规范地址 | 身份 |
| --- | --- | --- |
| 资产 | `/assets/:id` | ledger 中的一条媒体记录；不同文件版本有各自 ID |
| 作品 | `/works/:code` | 规范番号；一个作品可对应多个馆藏资产 |
| 关注条目 | `/posts/:id` | 关注来源的一条帖子，包含视频或图片 |
| 艺人 | `/performers/:id` | `performer` 实体，含女优等艺人 |
| 厂牌、片商 | `/studios/:id` | `studio` 实体；资料按厂牌与上级片商关系展示 |
| 创作者 | `/creators/:id` | `creator` 实体，含 FC2 卖家与动画作者 |
| 事务所 | `/agencies/:id` | `agency` 实体 |
| 系列 | `/series/:id` | `series` 实体 |
| 本地标签 | `/tags/:id` | `tag` 实体；聚合相关资产与图片 |

数字 ID 不包含名字。实体改名沿用同一地址；合并 ID 跳到最终身份。来源中的人物或厂牌没有本地身份时只显示名称。

作品路径的番号使用规范形式，例如 `/works/ABP-968`。资产和帖子使用正整数 ID。不存在或种类不匹配的实体 ID 返回 404。

站内详情链接在当前页面上打开覆盖层；关闭时返回来源地址，保留查询参数与页内锚点。未被控件接管的普通详情链接也使用这一入口，修饰键、新窗口与下载链接沿用浏览器行为。

播放器字幕记忆通过 `/api/subtitles/memory?video=` 读取（GET）与保存（PUT），沿用站内授权。`video` 使用 `item:<资产 ID>` 或 `follow:<帖子 ID>:<main 或媒体序号>`。PUT 的 `selected` 为轨道键或表示关闭的 `null`；可附 `track: {key, name, text}` 保存转换后的 WebVTT。读取返回 `selected` 和 `tracks: [{key, name, src}]`；字幕内容通过返回的 `src` 读取。无效视频标识返回 400，不存在的视频或字幕返回 404。加载的字幕和选择状态保存在服务端，再次播放时恢复。

`GET /api/assets/:id/subtitles` 合并已登记字幕与视频同目录即时发现的配对字幕，按路径去重，不进入子目录、不写账本。返回的 `id` 按文件名保持稳定，`legacy_id` 用于恢复已保存的登记轨道选择。字幕内容使用返回的 `src`：`track` 参数绑定文件身份，目录列表变化不改变所取字幕；文件消失或身份无效返回 404。SRT、ASS、SSA、VTT 复用现有 WebVTT 转换与 4 MiB 读取上限；未获授权的媒体目录不参与发现。

管理区锚点链接复用站内导航，等待目标页内容与字体就绪后平滑滚动；启用减少动态效果时直接定位。关闭详情保留背景页面的滚动位置。

## 浏览入口

馆藏查询的 `library` 参数使用持久 `library_id`。`GET /api/libraries` 返回 `id`、`name`、`icon`、`folders`、`metered` 与根目录身份列表；名称只用于展示。未知 ID 筛选为空集。`GET /api/items` 和 `/api/item` 的可归属资产附带 `root_id`、`library_id`，版本和分卷仍使用各自资产 ID。

`GET /api/sources` 在来源行的 `roots` 中提供 `root_id`、`library_id`、根目录状态和检测时间；`offline_roots` 列出确认离线的根目录 ID，`offline` 保留全部根目录离线的来源摘要。媒体访问失败的 `offline` 响应同时包含对应 `root_id`。

配置和首次设置的媒体行接受 `root_id`、`library_id`；新增媒体库使用独立 ID，同名不合并。既有根目录更改实际位置必须附 `change_mode: "relocate"`，保留 `root` 账本前缀；添加另一目录省略根目录身份。名称与图标在同一 `library_id` 的行间必须一致。非法路径、归属或身份通过原字段错误契约返回，不写配置。详见 [媒体库与存储根目录](OPERATIONS.md#媒体库与存储根目录)。

`GET /api/configuration` 的可选区域独立读取。区域失败时省略该字段，在 `section_errors[区域键]` 提供 `title`、`message`、`error_id`；其余成功字段继续返回。页面按分区显示提示并支持重新读取，依赖未取得媒体来源的配置表单暂停显示。`downloads.problems` 列出地址、凭据及渠道探测的问题，`downloads.config` 保留可修正的已保存地址及有效偏好；下载配置写入对地址严格校验，非法端口返回 400，并保留设置文件与凭据。

| 地址 | 用途 |
| --- | --- |
| `/` | 全部馆藏，含本地硬盘与已挂载网盘；新作行使用作品详情地址 |
| `/?browse=folders` | 按原目录浏览；`folder` 指定目录，`folder_recursive=0` 只看当前层 |
| `/?jav=1` | JAV 馆藏 |
| `/jav?tab=discover` | JAV 探索；`scope=library` 看馆藏，`scope=external` 看外部发现 |
| `/jav?tab=wants` | 想要的作品 |
| `/follow` | 关注更新；作者、来源、标签和观看状态使用查询参数 |
| `/wall` | 视频播放墙 |
| `/immerse` | 沉浸浏览；`id` 指定起始资产 |
| `/performers` | 艺人名册；动画作者通过 `category=animation` 浏览 |
| `/studios` | 厂牌、片商名册 |
| `/creators` | FC2 卖家名册；资料对象属于创作者 |
| `/agencies` | 事务所名册 |
| `/series` | 系列总览；与厂牌、事务所共用资料类型切换 |
| `/tags` | 本地或在线标签；在线标签通过关注页筛选 |
| `/playlists` | 播放列表 |
| `/unseen` | 没看过 |
| `/watch-later` | 稍后看 |
| `/flagged` | 已标记 |
| `/junk-files` | 垃圾文件 |
| `/trash` | 回收站 |

探索页将搜索词 `q`、标签 `tag`、排序 `sort`、方向 `dir` 与范围 `scope` 保存在地址中。点开详情和退出沿用原列表、滚动与筛选状态。

馆藏支持 `year=2024,2023` 多选发行年份，`year=none` 筛选未知年份。年份按发行日期而非入库日期计算，与来源、实体、观看状态等条件共同生效；地址、保存筛选和侧栏使用同一口径。侧栏年份数量遵循其余筛选范围，保留其它年份以便继续多选。

## 播放上下文

| 地址示例 | 上下文 |
| --- | --- |
| `/assets/30741?playlist=7` | 播放列表 7 |
| `/assets/30741?mix=30740` | 以资产 30740 为起点的 Mix |
| `/assets/30741?parts=30740` | 资产 30740 所在分卷组 |
| `/assets/30741?editions=30740` | 资产 30740 所在版本组 |

路径始终标识当前资产。换条更新 ID，队列键标识来源。复制播放地址时保留当前时间与队列上下文。

## 设置与管理

| 地址 | 用途 |
| --- | --- |
| `/settings`、`/settings/appearance` | 外观与导航 |
| `/settings/playback` | 浏览与播放 |
| `/settings/jav` | JAV 与新作 |
| `/settings/search` | 搜索与推荐 |
| `/settings/content` | 内容显示 |
| `/settings/library` | 媒体库与入库 |
| `/settings/subscriptions` | 来源与订阅参数 |
| `/settings/downloads` | 下载渠道 |
| `/settings/network` | 网络与访问 |
| `/settings/maintenance` | 应用与维护 |
| `/settings/diagnostics` | 系统诊断：系统检查、库健康、来源会话与后台诊断、刮削记录导出 |
| `/subscriptions` | 关注管理：关注列表统一管理创作者来源与 JAV 订阅；添加关注提供创作者、女优入口和别名管理，标签管理支持在线标签分页与批量操作 |
| `/sources` | 来源和凭证：采集来源、访问方式与凭据状态，全部来源的连接检查 |
| `/tasks` | 任务中心与云下载进度 |
| `/stats` | 统计 |
| `/taste` | 口味分析 |
| `/review` | 人工复核；元数据字段下逐条列出核查结算自动写入的资料，可勾选后预览并撤回 |
| `/data-cleanup` | 数据管理概览；日常扫描、待处理摘要、维护与清理入口 |
| `/data-cleanup/organize` | 文件整理与批次历史 |
| `/data-cleanup/resource-sync` | 核对文件与馆藏记录，清理失效条目、空目录与缓存 |
| `/data-cleanup/orphan-records` | 处理文件已丢失但仍保留个人记录的作品 |
| `/data-cleanup/media-repair` | 媒体修复 |
| `/data-cleanup/links` | 链接检查与失效地址复核 |
| `/data-cleanup/batch-delete` | 按女优批量永久删除关联影片 |
| `/duplicates` | 重复文件 |
| `/quality-goals` | 高清版目标 |
| `/login` | 登录 |

设置分区可直接打开、刷新和用浏览器前进后退。偏好面板从当前页面打开时保留背景；配置分区复用配置页及其权限检查。配置分类导航停在搜索栏下方，切换分类时显示所选分区的开头。

用户脚本通过专用令牌调用 `POST /api/jav-browser/errors`，仅接收白名单错误字段并写入本机日志；批次、体积、限频与诊断包范围见 [浏览器添加 JAV](JAV_BROWSER.md)。状态接口 `GET /api/jav-browser` 同时投影真实下载与整理进度，`GET /api/jav-browser/active` 以同一结构列出进行中与最近结束的任务，均不授予配置、账号或账本写入权限。`POST /api/jav-browser/postprocess` 只能重试该番号已失败的整理，走任务中心同一入口。`POST /api/jav-browser/dismiss` 只记下脚本确认过哪些已结束的任务，不改任务与账本。`GET`/`POST /api/jav-browser/performer` 认出女优页是哪位并开关她的「订阅新作」，与人物页开关同一套订阅；编号没人持有时会新建女优并绑上编号，规则见 ADR-0143。

`GET /api/review/auto-landings` 逐条列出 ADR-0139 两条规则仍在的自动写入：作品、封面地址、写入的字段与值、写入前的值或补上的标签、规则与时间；带 `items=<决定键>`（换行分隔）时只读返回这几条要改回的值、要删的标签、写入后被改过或已删除而不动的作品，以及计划摘要 `token`。`POST /api/review/auto-landings/revert` 接收 `items` 与 `token`，在写锁里重算计划，对不上返回 400 要求重新预览；对上后先备份账本再撤回，回执带备份文件名与未改动的作品。列表里没有的决定键一律拒绝，其余自动落库来源仍由 `scripts/revert_auto_landing.py` 撤回；只读端拒绝撤回（ADR-0141）。

`GET /api/client-updates` 要求应用鉴权，返回运行版本与构建标记、发行版检查结果、安装状态、用户脚本版本、自动补修状态和启动迁移状态（进行中带阶段 `stage`，备份阶段另带百分比 `progress`），不触发外部检查。服务启动时迁移数据库期间，它与 `/healthz` 照常回应且不读数据库，其余 `/api/` 与媒体路由回 503，`message_code` 为 `api.ledger.migrating`。`GET /api/jav-browser/updates` 使用用户脚本专用令牌，无需番号，返回运行与发行版、脚本版本快照，不暴露补修明细。`POST /api/configuration/upgrade-repairs/retry` 限本机同源请求，重试失败项；`GET /api/configuration/upgrade-repairs/review` 限本机管理权限，下载 JSON 复核记录，无记录时返回 404。

Docker 镜像的一键更新（[ADR-0140](adr/0140-docker-one-click-update-via-watchtower.md)）：容器里的 `GET /api/configuration/updates` 在 Docker Hub 的版本号标签与 `edge` 指向同一镜像前返回 `state: pending`；有新镜像时多一个 `one_click`，`available` 表示镜像标签是 `edge`、令牌已生成且探测得到 Watchtower，不能时 `reason` 说明原因，没启用 Watchtower 时为空。`POST /api/configuration/docker-update` 请 Watchtower 异步拉取并重建容器，收到 202 后返回 `state: updating`；条件不满足、Watchtower 拒绝令牌或正忙返回 409。接口限本机同源请求，非 Docker 部署返回 404，从不回传令牌。

`GET /api/configuration/cloud-proxies` 返回已添加媒体库对应的 CloudDrive 账号及 API／数据代理、未匹配媒体库和账号修订号，不回显代理密码；尚未填写 CloudDrive2 地址时返回空列表与 `configured: false`。`POST` 接受账号 `id`、`revision` 和本次修改的 `api`／`data`，写回 CloudDrive 后返回该账号当前状态；配置冲突返回 409。这两条接口均限本机管理权限，写入还要求同源请求。

`POST /api/configuration/smb/test` 接受共享地址及连接字段，验证只读目录访问，返回 `readable` 和最多 500 个可进入子目录名。接口要求本机管理权限与同源请求；地址无效返回 400，无读取权限返回 403，共享不可达返回 502，不回显密码。配置读取只返回账号、加密要求与密码是否已保存。

`POST /api/configuration/access/first` 是已配置、还没有访问策略的 Docker 部署的访问设置提交（[ADR-0149](adr/0149-docker-first-access-setup.md)），不要求登录。正文 `{mode, password, confirmation, next}`，`mode` 为 `password` 或 `open`；成功写入访问策略，返回站内地址 `url`，设了密码时同时设下会话 cookie。只在 Docker 且还没有访问策略时可用：非 Docker 返回 404，已有策略返回 409，来源不是本机或私有网络、带代理转发头或不同源时返回 403，密码错误按 `errors.password`、`errors.confirmation` 返回 400。

`POST /api/configuration/access/token/rotate` 更换访问口令，运行中的服务立即改用新口令。接口要求本机管理权限与同源请求；口令由 `--token`、`PEACH_TOKEN` 指定或这次启动没有口令时返回 409，访问设置读不出时也返回 409。响应只在这一次带回新口令 `token`（`Cache-Control: no-store`），另有访问方式 `mode` 和被登出的其他设备数 `signed_out`。配置读取的 `api_token` 只给出 `rotatable`、`reason`、`paired`，不回显口令。

`GET /api/configuration/certificate` 限本机管理权限，返回本机 CA 的 SHA-256 `fingerprint`、到期日 `not_after`、下载路径和二维码：`phone_url` 是带 10 分钟签名的下载地址，`qr` 是模块矩阵。没有 HTTPS 服务或没有 CA 时返回 404，配置读取的 `certificate` 为 null。`GET /api/configuration/certificate/peach-local-ca.crt` 只下发 CA 的公开证书（`application/x-x509-ca-cert`），任何私钥都不经过它；带有效签名 `k` 时不需要登录，签名无效或过期返回 403；不带签名时要求应用鉴权。

## 兼容地址与服务接口

| 兼容地址 | 规范去处 |
| --- | --- |
| `/item/:id` | `/assets/:id` |
| `/jav/movie/:code` | `/works/:code` |
| `/follow/item/:id` | `/posts/:id` |
| `/mix/:seed/:item`、`/parts/:seed/:item`、`/editions/:seed/:item` | `/assets/:item` 加相应队列参数 |
| `/playlists/:playlist/:item` | `/assets/:item?playlist=:playlist` |
| 实体的姓名、别名路径 | 对应数字 ID 地址 |
| `/activity` | `/tasks` |
| `/scraping` | `/sources` |
| `/follow-manage` | `/subscriptions` |
| `/configuration` | `/settings/library` |
| `/diagnostics` | `/settings/diagnostics` |
| `/resource-sync` | `/data-cleanup/resource-sync` |

兼容跳转保留查询参数；后退前进的背景信息留在历史条目中。索引尾斜杠跳到无尾斜杠路径。

`/api/*`、`/stream`、`/follow-stream`、封面、图片及其他媒体端点使用各自的服务契约。实体只读接口 `/api/entity`、`/api/photos` 支持 `kind` 加 `id`，也接受 `kind` 加 `name`。鉴权与本机写入权限由服务端检查。

启用接口文档时，`/docs`、`/docs/oauth2-redirect` 和 `/openapi.json` 是服务文档入口；首次运行表单由未配置状态下的首页展示。

远程媒体代理拒绝 HTML、SVG、XML 和未声明类型的内容；普通媒体和 HLS 清单使用被动响应策略。旧磁盘缓存同样校验类型，缓存字节可复用，浏览器须回源复验。图像响应及其 304 回执携带 CSP `sandbox` 和 `nosniff`。

浏览器首次取得当前媒体策略的 HTML 页面时收到仅清理缓存的 `Clear-Site-Data`，策略 Cookie 避免反复清理，登录和偏好不清除。不支持该响应头的浏览器需手动清理旧站点缓存。
