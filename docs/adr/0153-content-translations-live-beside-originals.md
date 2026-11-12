# ADR-0153：内容译文与原文并存，界面翻译不改内容

- 状态：已采纳，待实施
- 日期：2026-11-08
- 关系：配合界面 i18n 方案（zh-CN 源文、稳定语义 ID、i18next、Hosted Weblate，另立 ADR）；沿用 ADR-0018、ADR-0025、ADR-0052 的归属、落库与撤回契约，ADR-0091 的托盘迁移；ADR-0073、ADR-0117 的种子包留作以后的译文分发渠道。

## 背景

界面翻译只翻 Peach 自己写的文案，作品标题、人名、厂牌名、标签值和路径都不碰。这些内容要怎么按语言显示，单独由本 ADR 决定。四类内容现在的状态如下：

- **标题**：`asset` 有 `catalog_title` 和 `original_title` 两列，都是真相字段，只经 `field_owners.write_owned_fields` 写。`catalog_title` 实际存的是发行地的原题，JAV 多为日文，欧美与部分素人作品是英文。`original_title` 只在来源同时给出译题与原题时才有值，例如 NFO 的 `<originaltitle>`，几乎都是空的。前端 `javPreferredTitle` 在两列里取含日文的那一条。两列都没有语言维度。
- **r18.dev 英文标题**：`dvd_id` 那一页的标题和系列多是机翻（`title_en_is_machine_translation`）。`sources/r18dev.py` 与 `metadata.original_wording` 只取 combined 页的日文，英文写法留在快照里，不进账本。ABW-358 的系列实体曾因英文页落库而以英文为规范名，所以这条边界要继续守住。
- **标签**：中文规范名同时是 `asset_tag.tag`、`genre_decision.peach_tag`、`entity(kind='tag').canonical_name` 和 `catalog_rules` 八组词表的身份。词表随代码发版，`genre_taxonomy` 把来源 genre（包括 r18 的英文分类名）投影成中文规范名。账本里还有词表外的自由标签，来自文件夹、创作者署名和平台名，占用量的一成左右。
- **系列**：`entity(kind='series')` 的规范名取来源原文，是开放集合，每个部署各不相同。
- **人名**：`performerNameLanguage` 在 `zh-CN` 与 `ja` 之间切换，由 `performer_name_display` 只读投影，不改规范名与作品署名。

PR #443 把 `catalog_rules` 与 `genre_taxonomy` 里的中文规范名就地换成英文。这样会改掉身份键：账本存量、`genre_decision` 与新词表对不上，再加一门语言又要改一遍代码。本 ADR 不采用这种做法，只参考它的英文措辞。

## 决策

### 一、三个显示开关，各管一层

| 开关 | 管什么 | 取值与默认 | 存放 |
| --- | --- | --- | --- |
| 界面语言 | 界面文案、标签词表译名 | 由界面 i18n ADR 决定，默认 `zh-CN` | 界面 i18n ADR 决定 |
| 标题语言 `contentTitleLanguage` | 作品标题、系列名 | `original`（默认）、`interface`、`interface-machine` | `profile.settings_json` |
| 名称语言 `performerNameLanguage` | 女优与创作者名 | `zh-CN`（默认）、`ja` | `profile.settings_json`，不变 |

标题语言默认 `original`，升级后现有用户看到的标题不变。`interface` 表示按界面语言挑选人工或来源译文；`interface-machine` 在此基础上允许显示机翻并标注。三者互不推导：切到英文界面不会自动改标题语言或名称语言。

### 二、`catalog_title` 是原题，译文另存一张表

`catalog_title` 定义为作品在发行地的原题，语言不限，不改名、不迁移。整理、改名、NFO 导出、番号匹配与去重只读它。

译文存入新表 `asset_title_translation`：

| 列 | 含义 |
| --- | --- |
| `asset_id` | 外键，随作品级联删除 |
| `language` | BCP 47 语言代码，如 `en`、`zh-CN`、`zh-Hant` |
| `title` | 译题 |
| `quality` | `human`（用户填写或确认）、`source`（来源声明语言的非机翻译名）、`machine`（来源标明机翻，或由 MT、LLM 生成） |
| `owner`、`batch` | 与 `field_owners` 同一套归属串和批次，供 `revert_auto_landing.py` 整批撤回 |
| `evidence`、`updated_at` | 来源快照或地址、写入时间 |

主键是 `(asset_id, language)`，每种语言只存一条胜出的译文，其余写法留在快照与复核记录里。

- 写入只有一个入口 `peach.content_translations.write_title()`。它不经 `write_owned_fields`，也不加 `mutation_revision`，因为译文不是真相字段；保护判定复用 `field_owners.is_protected`：`user:manual` 不被自动写入覆盖，自动写入只填空或替换同来源、不高于自身档位的旧值。
- 来源声明了语言和机翻标记时，译文直接落库，不进复核：r18.dev 英文页标题按 `en`、`auto:r18dev` 写入，档位读来源自己的 `title_en_is_machine_translation`：为真记 `machine`，为假记 `source`。它只影响显示，可整批撤回，满足 ADR-0052 的落库条件。
- MT 与 LLM 的产出只能写 `machine`，升到 `human` 必须经用户确认，与「LLM 输出只产生候选」一致。
- `original_title` 退出：迁移把非空行处理成「原题 + 译文」。`original_title` 与 `catalog_title` 不同且含假名时，前者成为 `catalog_title`，后者按下一条的判据写入译文表；判据给不出语言的，整行留作复核候选。随后删掉该列并移出 `FIELD_SOURCE_ORDER`，NFO 的 `<originaltitle>` 改映射到 `catalog_title`，`<title>` 与之不同时进译文表。
- 语言判据只在来源没有声明语言时使用：含假名为 `ja`；纯 ASCII 为 `en`；不含假名、含汉字且与原题不同为中文，`simplify_kanji` 不改变字形记作 `zh-CN`，否则记作 `zh-Hant`。

### 三、显示时按语言挑选，缺译回退原题

挑选在服务端 `content_translations.pick()` 一处完成，列表、详情、搜索结果和用户脚本接口共用。请求带上界面语言 L，接口返回选中的标题、语言和档位，前端 `javTitleParts` 只接收结果。

| 标题语言 | 依次尝试 |
| --- | --- |
| `original` | `catalog_title` → 清洗后的文件名 |
| `interface` | L 的 `human` → L 的 `source` → `catalog_title` → 清洗后的文件名 |
| `interface-machine` | L 的 `human` → L 的 `source` → L 的 `machine` → `catalog_title` → 清洗后的文件名 |

- 语言匹配先精确比较，再比较主语言子标签，例如 `zh-CN` 可以用 `zh-Hant`。原题本身就是 L 时直接显示原题。
- 显示译文时，详情页在标题下保留原题；机翻带 Board UI 徽章「机翻」。卡片只显示选中的一条。
- `asset_search_source` 视图并入全部语言的译题，搜索不受标题语言设置影响。按标题排序仍按原题，作为已知限制。

### 四、系列名用同一机制，不进翻译平台

系列译名存入 `entity_name_translation(entity_id, language, name, quality, owner, batch, evidence, updated_at)`，结构与写入规则同第二条，首批只写 `kind='series'`。显示跟随标题语言。

- `entity.canonical_name` 不被译名替换。
- 不进翻译平台，也不进仓库：系列是开放集合，每个部署不同；把它推到公开平台等于公开用户的馆藏，译者也跟不上新增。
- 来源：r18.dev 英文页的系列名和用户编辑。档位读 `series_name_en_is_machine_translation`，规则同标题。公开作品的人工译名以后可以随种子包分发，本 ADR 不设计。
- 厂牌与 label 用品牌名，不翻译；`tag` 实体走第五条；女优与创作者走名称语言。
- `merge_entity` 迁移译名行，冲突时保留档位高的一条；外键关闭时子表行显式删除。

### 五、标签词表作为独立翻译组件，在仓库内经 PR 翻译

标签身份不变，仍是中文规范名。译名只用于显示，不参与 `canonical_tag_name`、`resolve_genre` 或 `genre_decision` 的匹配：英文译名一旦与某个英文来源 genre 同形，就会悄悄改变投影结果。

- **导出**：`scripts/export_tag_vocabulary.py` 从 `catalog_rules` 的分组词表生成 `frontend/src/locales/zh-CN/tags.json`，每条带分组和代码注释作为译者上下文。测试核对生成文件与导出结果一致，词表改了但没重新导出时拒绝通过。
- **键**：直接用中文规范名，不另造语义 ID。规范名已经是账本里的身份，另造 ID 要多维护一张映射。改名经 `RETIRED_TAGS` 登记时，导出脚本在同一提交里把各语言的旧键译文移到新键（新键已有译文时不覆盖）。规范名可能含 `.` 或 `:`，`tagLabel()` 调用 `t()` 时传 `keySeparator: false` 与 `nsSeparator: false`，不按分隔符拆键。
- **托管**：不放 Hosted Weblate。其服务条款（2024-11-01 生效）的禁止行为包括传播色情、淫秽或粗俗内容，服务方还可以不说明理由终止协议；免费开源方案又要人工审批。标签词表的主体就是性行为与成人题材用语，属于这一条的直接对象。Crowdin 的条款同样禁止上传粗俗、淫秽内容。
- **回流**：译者直接修改 `frontend/src/locales/<lang>/tags.json` 并提 PR，按正常审查合入，随前端构建发布，不写账本。文件保持 i18next 单语 JSON，以后改用自托管 Weblate 或其他平台时不需要转换格式。同类先例是 EhTagTranslation：E-Hentai 标签的中文译名库就是一个 GitHub 仓库，社区经网页编辑器以各自的 GitHub 身份提交。词表规模变大、直接改 JSON 门槛过高时，可以照此加编辑器，后端仍写 GitHub。
- **显示**：`tagLabel(name)` 查 `tags` 命名空间，查不到显示原值。词表外的自由标签和 `genre_decision` 里词表外的 `peach_tag` 原样显示。复核页的「收录为」选择器显示译名，提交仍是规范名。
- **英文初稿**：导出脚本另出一份建议文件，来自 `genre_taxonomy` 反查的英文来源 genre（r18 的 DMM 分类译名）和 PR #443 的英文措辞。它只是首个英文 PR 的起点，逐条人工改定后才合入，来源译名不直接当作译文。
- **术语**：`AGENTS.md` 列出的剧情设定类标签，英文同样写成设定或角色说法。拼写与大小写沿用界面术语表。
- **不在本轮**：英文输入搜索标签、NFO 导出写译名。NFO 照旧写规范名。

### 六、人名只划边界

名称语言保留 `zh-CN` 与 `ja` 两档，独立于界面语言和标题语言，人名不进译文表。英文界面要显示罗马字时，扩展名称语言的取值并复用 r18.dev 的 `name_romaji`，另行决定。

### 七、与界面翻译的分工

| 层 | 源 | 存放 | 翻译渠道 | 进入方式 |
| --- | --- | --- | --- | --- |
| 界面文案 | 代码里的 zh-CN 源文 | `locales/<lang>/<命名空间>.json` | Weblate 界面组件 | PR |
| 标签词表 | `catalog_rules` 导出 | `locales/<lang>/tags.json` | 仓库内直接编辑 | PR |
| 标题、系列 | 来源与用户 | 账本两张译文表 | 刮削、用户编辑，以后加种子包 | 自动落库或用户编辑 |
| 人名 | 资料页原文 | 只读投影 | 名称语言设置 | 无 |

界面命名空间不收内容值；`tags` 命名空间不收界面文案。Hosted Weblate 只承载界面组件；受控内容词表（现在只有标签）一律在 GitHub 上经 PR 翻译，不进任何托管翻译平台。

界面组件的平台选择（2026-11-08 核对）：

- 首选 Hosted Weblate 免费开源方案。LANraragi 的界面翻译在这里，说明成人相关项目的界面能通过审批。
- 审批被拒或被终止时，先退到 POEditor 的开源免费方案：它面向 OSI 认可许可证的项目，条款没有成人内容限制。再退到自托管 Weblate，不受托管条款约束，代价是自己运维一台公开服务。几家都支持 i18next JSON，切换不转换格式。
- 不用 Codeberg Translate：它的条款禁止分享主要由生成式 AI 写代码的项目，Peach 的提交记录正好命中。

### 八、账本影响与迁移

- 一个新迁移：建两张译文表与索引；重建 `asset_search_source` 视图及触发器，并在译文表上加刷新 FTS 的触发器；按第二条处理 `original_title` 后删列。`catalog_title`、`asset_tag`、`genre_decision` 与实体规范名都不改写。
- 托盘按 ADR-0091 在启动时迁移并先备份。
- 升级补修从磁盘上已有的 r18.dev 快照回填英文标题与系列名，档位复用 `r18_legacy_repair._english_machine_translation` 读出的机翻标记，归属 `auto:r18dev`、批次 `content-translation-backfill-<日期>`，可用 `revert_auto_landing.py` 撤回。没有快照的作品等下次刮削。默认标题语言是 `original`，回填不改变任何人当前看到的内容。
- `asset_title_translation` 加入 `ASSET_REFERENCE_TABLES`，`purge_assets` 一并清理。

## 不采用

- **就地替换规范名**（PR #443 的做法）：改身份键，账本与复核决定全部失配。
- **每种语言加一列**（`title_en`、`title_zh`）：每加一门语言都要迁移，也没地方记档位与归属。
- **`asset` 上加 JSON 列**：FTS 视图、逐条归属与整批撤回都要解析 JSON。
- **系列进翻译平台**：理由见第四条。
- **标签组件放 Hosted Weblate 或 Crowdin**：两家条款都禁止淫秽、粗俗内容，理由见第五条。
- **英文界面默认显示机翻**：机翻只在用户选 `interface-machine` 后出现。
- **按语言探测决定一切**：来源声明优先，探测只用于没有声明的 NFO 与旧数据。

## 评审结论

用户 2026-11-08 确认：

1. 标签组件的键用中文规范名，不另造语义 ID。
2. 机翻默认不显示，只在标题语言选 `interface-machine` 后出现。
3. `original_title` 迁入译文表后删列，不保留为 NFO 专用列。
4. Hosted Weblate 条款已于 2026-11-08 核对：禁止色情、淫秽或粗俗内容，标签组件因此改为仓库内经 PR 翻译（第五条），本 ADR 其余决定不受影响。
5. Hosted Weblate 只做界面多语言；标签等内容词表单独在 GitHub 上翻译。
6. 界面平台的备选顺序为 Hosted Weblate、POEditor 开源方案、自托管 Weblate，不用 Codeberg Translate（第七条）。

## 验证

实施时只用临时数据库与临时媒体：

- 迁移前后 `catalog_title`、`asset_tag`、`genre_decision`、实体规范名逐行不变；`original_title` 的三类旧样本（含假名的原题、中文译题、判据给不出语言）分别落到原题、译文表和复核候选。
- 回填行可按批次整批撤回；`user:manual` 译文不被自动写入覆盖。
- 挑选覆盖三种标题语言、缺译、主语言子标签匹配和原题即为 L 的情况。
- 导出文件过期时测试拒绝通过；改名后旧键译文随之迁移；词表外标签原样显示；英文译名不影响 `resolve_genre`。
- 实体合并后译名行迁移，`PRAGMA foreign_key_check` 为 0；删除作品后无孤儿译文行。
