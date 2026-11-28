# AI 接入参考

核对日期为 2026-11-26。本记录是参考取证笔记，汇集多个来源与界面实测，无法用单一上游文档重抓，因此未登记进 docs/reference-sources.json。

AI Chat 公开预览读取到样式资源 `0o8mi3708b7l1.css`、`1tlrftqureo1z.css` 和 `435hwkkns-skq.css`。搜索页取自公开 `globals` 注册表的动效规则，JSON SHA-256 为 `c751eda008e5180257a80b23625296323c7a0e3d2b8f25f6a425fdab60ee59c0`。组件源码对应的摘要登记在 `frontend/src/react/boardui/ORIGIN.md`。

AI Chat 的 Composer 在输入框两侧提供菜单。实测公开模板左侧圆形按钮为 36px，菜单为 361px 宽，普通行高 32px；右侧模型菜单宽 266px，模型行高 32px，刻度轨道高 27px、滑块宽 21px。Peach 使用圆形加号与图标列表、右侧单选列表与分档滑杆，菜单宽度按馆藏字段和服务切换入口调整。轨道按服务给出的档位绘制，最高可用档复用 [Peach 的流光适配](processing-task-controls.md#peach-适配)。[Composer 公开文档](https://www.boardui.com/components/composer)

| 来源 | 证据与适用方式 |
| --- | --- |
| Open WebUI | 官方配置说明将服务商连接放在独立 Connections 页面，连接中包含服务地址、API Key 与模型配置。官方兼容服务说明使用模型目录请求验证连接。Peach 采用独立页面和主动验证，为三家服务预先提供官方地址。[配置说明](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai/) · [配置页面图](https://docs.openwebui.com/assets/images/manage-openai-e56ceeb637bb0fe62a1ab42c8541a135.png) |
| Magpie | 官方集成契约给出默认回环端口 3425、OpenAI Chat Completions 和模型目录。Peach 在 OpenAI API Key 连接提供可改端口的 Magpie 预设，并保留目录返回的模型 ID。[固定版本集成说明](https://github.com/yetone/magpie/blob/3d0911e8fb3931de1eee635750c170835e487374/docs/integrating.md) |
| CC Switch | 官方手册的表单先选预设或自定义配置，再填写 URL 和 Key，模型字段旁可主动读取目录。Peach 在现有连接卡中先选接入点，自定义地址和端口随选择显示，读取按钮放在模型字段旁。[固定版本操作说明](https://github.com/farion1231/cc-switch/blob/d07f86ef32ffe3cf739efad4e99570f59f9cc4c0/docs/user-manual/en/2-providers/2.1-add.md) |
| OpenAver | 官方发布说明展示自配服务、相似作品、封面自动标签和多站资料聚合。封面标签使用固定词表，每部片只分析一次，可撤回；资料聚合先核对番号并保留未返回的字段。Peach 的样张和帧也使用现有词表，视觉候选经复核后写入。[OpenAver 发布记录](https://github.com/slive777/OpenAver/releases) |
| BoardUI | Settings Modal 提供分区式设置参考。Peach 复用已安装的设置卡、输入框、状态标签、按钮和导航，在自己的配置页内展示。[BoardUI 设置组件](https://www.boardui.com/components/settings-modal) |
| BoardUI Chat Starter | 实测：公开模板与组件源码展示左侧应用导航、居中的起始区与独立示例按钮、底部胶囊输入框和右侧浏览器历史。Peach 的 AI 助手在欢迎文案下使用独立的点播按钮，演示过程和查询结果显示在会话区。最近对话遵循 Peach 的搜索记录偏好。[Chat Starter](https://www.boardui.com/templates/chat-starter) · [AgentChat 源码](https://github.com/BoardUI/boardui/blob/main/components/application/agent-chat/agent-chat.tsx) |
| 圆球机器人 | 2026-11-26 查看 page-mascot 项目说明与 Rive 官方演示。page-mascot 根据指针方向切换视线，点击后播放表情。Rive 演示将位置输入用于眼睛跟随。Peach 用 SVG 连续移动双眼，欢迎区出现时轻弹，静置时眨眼和微微摇头，点击时轮换四种动作。[page-mascot 固定版本](https://github.com/nilbuild/page-mascot/tree/76a44ed9180063bf4852b9dd724b656f4a828ac7) · [Rive 演示](https://www.youtube.com/watch?v=f15J-IMphZ8) |
| BoardUI AI Chat | 实测：公开模板在中央会话区显示处理过程。发送后输入框描边使用 `bui-composer-loader-dash`，每圈 4.5 秒。公开 Composer 文档给出等待期间的玻璃控件过渡。Peach 将 Thinking 放在会话内各自的步骤行，解析使用波点，查馆藏使用旋转点，查库外使用环形光迹。输入框的流光与控件表面随查询状态切换，作品卡在对应结果返回后出现。[AI Chat](https://www.boardui.com/templates/ai-chat) · [Agent Thinking](https://www.boardui.com/components/agent-thinking) · [Composer Loader](https://www.boardui.com/components/composer-loader) |
| Beautiful UI | 实测：公开组件页的 Loading State 和 Task Rows 区分进行中和阶段完成。Peach 演示使用分阶段动画，完成查询后呈现随应用提供的公开厂牌作品。[Beautiful UI 组件页](https://www.beautifului.dev/) |
| BoardUI Agent Limits Card | 2026-11-26 查看公开预览与用法。实测：组件按 Token 类别分段显示上下文占用，详情列出各类别的用量和占比。Peach 在对话小窗采用分段条和图例，以本对话已取得的 Token 总量为分母，呈现输入和输出的构成。[Agent Limits Card](https://www.boardui.com/components/agent-limits-card) |
| EvilCharts 柱状图 | 2026-11-26 查看官方文档。实测：支持堆叠和横向布局，坐标轴、图例和提示由调用方组合。Peach 用堆叠柱显示每日输入和输出 Token，用同刻度横条显示本实例和服务商组织的用量。[EvilCharts Bar Chart](https://evilcharts.com/docs/recharts/bar-chart/static) |
| Amane | 官方文档列出刮削时的标题与剧情翻译，并按原文、目标语言、字段和提示词缓存。馆藏智能体将自然语言查询交付为查询预设，刮削及整理等操作由任务队列执行。剧照属于单独的刮削输入。查阅的官方文档未列出正片视觉自动标签。[刮削](https://sqzw-x.github.io/amane/user/scraping/) · [智能体](https://sqzw-x.github.io/amane/user/agent/) |
| Stash AI | 社区插件源码可用秒数和标签创建场景标记。Peach 为自动帧候选保留位置证据，用户可回到播放器查看。[插件源码](https://github.com/stashapp/CommunityScripts/blob/main/plugins/stashAI/stashai.js) |
| stash-ai-organizer | README 描述缩略帧、本机 Whisper 转写、既有标签词表和固定结构的模型输出。Peach 本次采用既有词表与结构化证据，字幕或转写属于后续输入。[项目说明](https://github.com/xoorgz/stash-ai-organizer#readme) |
| Immich | 智能搜索按自然语言与图像的匹配程度排序。可借鉴缩略图索引与现有筛选条件结合的检索方式。[搜索说明](https://docs.immich.app/features/searching/) |
