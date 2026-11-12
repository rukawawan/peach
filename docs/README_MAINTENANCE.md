# README 维护

默认入口 `README.md` 使用英文，简体中文版为 `README.zh-CN.md`。README 展示项目定位、核心能力、安装入口与必要限制。具体功能、参数和交互更新进入变更日志或专题文档。

维护范围依据 2026-11-06 用户确认的取舍。只有现有核心能力概括、安装入口、平台支持或必要限制需要修正时，才修改 README，并核对对应的中英文说明。

1. 先判断本次改动是否影响 README 的核心介绍；需要修改时，再按下表核对事实。
2. 修改需要调整的中英文说明，保留使用入口和安全说明。
3. 用 documd 提供当前稿的可视化预览，取得用户明确确认后才能推送 README；继续修改时确认对应的新稿。
4. 按 [文档与界面文案](WRITING.md#检查与复核) 检查，再运行 [正式测试入口](TESTING.md#正式入口)。

README 面向初次访问项目的人，依次讲它是什么、界面导览与截图、能做什么、怎么装、常见问题、
问题反馈和文档入口。用使用者的话写：说能做什么、会不会动文件，不写账本、候选、实体这类内部
概念，内部机制与开发流程只留链接。中英文同批维护，平台支持、安装方式和能力限制保持一致。主线能力、已安装运行态和发行制品分别
以实现、本机健康检查和 Releases 为准，README 不填写本机 IP、端口归属、真实馆藏数字或动态版本号；下载直链的版本号由 `scripts/release_tag.py --ship` 在 Release 制品上传完后改写并单独提交，中断时用 `--point-readme --apply` 补做；`tests/test_readme_contracts.py` 核对直链指向当前版本或上一版。

| 内容 | 核验入口 |
| --- | --- |
| Python 与桌面命令 | `pyproject.toml`、`src/peach/cli.py`、`src/peach/tray.py` |
| 前端工具与产物 | `frontend/package.json`、[docs/FRONTEND.md](FRONTEND.md) |
| 桌面包与平台范围 | [docs/TESTING_DESKTOP.md](TESTING_DESKTOP.md)、`.github/workflows/release.yml` |
| 当前行为与已部署范围 | 实现与测试、[运行与配置](OPERATIONS.md)、[公开路线图](https://github.com/orgs/peach-mitao/projects/7) |
| 来源、配置与数据边界 | [docs/SOURCING.md](SOURCING.md)、[docs/OPERATIONS.md](OPERATIONS.md)、[docs/CLOUDDRIVE.md](CLOUDDRIVE.md) |

README 改动沿用项目工作树、PR 与验证流程。修改内容时核对中英文的项目定位、核心能力和安装事实，需要修正的部分随改动更新。README 的 Python 下限、语言入口、链接和文案由现有检查验证。

结构或品牌调整时重读已登记的参考快照，上游变化作为参考，能力说明以实际实现为准。

## 演示数据集

README、教程与网站的截图默认取自演示库。用分类模型从真实馆藏里筛「看起来无害」的帧不算
替代方案：筛出来的多是黑场与标题卡，卡片上的番号、姓名与厂牌照样泄露来源。

公开 README 复用官网已发布的电影演示库截图，展示馆藏、人物、关注、统计与播放器；界面导览链接到官网 `#live`，仅嵌入已核对内容、来源和许可的视频。截图与文案明确区分演示数据、实际功能和影片访问权，保留来源的年龄、地区和访问限制，不把外部来源的访问权说成 Peach 提供的能力。展示素材的来源、署名与许可链接到官网[素材来源与许可](https://peach.video/credits/)，软件许可不替代第三方素材许可。项目定位与公开附件边界见[文档规范](WRITING.md#公开与私有记录)。

公开画面不得出现访问凭据、局域网地址、隧道地址、文件系统完整路径或个人馆藏。截图由官网静态资源提供 WebP 展示图与无损 PNG 原图，README 的图片链接指向 PNG，避免 Release 附件的下载响应。WebP 展示图须小于 4 MB，并核验 GitHub 图片代理返回图片且浏览器完整解码；原图保持 3840×2160。更新链接时核对官网实际发布范围，不能只因本地文件存在就认为线上可用。截图不进仓库：`resources/` 会被整个打进安装包。仓库里确需
留存的少量演示媒体放 `docs/assets/`，单个文件压到 8 MB 以内（`tests/test_repo_hygiene.py`）。

本地测试另有生成器 `scripts/demo_dataset.py`，只写目标目录，不碰任何账本；以下人像生成模式不作为当前公开 README 的素材来源：

```powershell
& .\.venv\Scripts\python.exe -X utf8 scripts\demo_dataset.py --output <目录> --count 24
```

封面由 `--art` 决定。默认 `portrait`：人像取自 Gfriends 图库，封面与图集由这张人像排版
而成，出演者用清单里的规范艺名，界面因此有真实馆藏的样子。`synthetic` 是 Pillow 几何
海报，不联网，规模基准与测试走它。两种模式的短片都是 FFmpeg lavfi 的渐变、测试图与分形，
只占位，不拿去当演示视频。
两种模式下作品、厂牌、系列与标签一律虚构：真实艺名配虚构作品，演示素材因此不会断言
「某人演过某片」这种它没有资格断言的事。

`tests/test_demo_dataset.py` 把守作品词表与 `catalog_rules` 成人词表不相交、目录布局
符合 `library_nfo` 的边车规则、`process_library` 跑完没有发过外部请求，以及人像清单的
形状与「卡片上的名字就是封面上那位」。`--seed` 固定内容，`--video stub` 用占位字节代替
编码，给性能基准的规模档用。

### 人像清单

清单是 `scripts/demo-portraits.json`：去哪取、取到的该是什么哈希。图片字节不进仓库
（ADR-0026），生成器运行时取一次，缓存在输出目录的 `.portrait-cache/`；字节与清单的
SHA-256 对不上是硬错误，不降级放行。

**清单只能人工逐张看过后更新，不许按图库顺序自动取。** 图库把目录前缀当来源优先级排序，
排第一的答的是「先试哪一张」，不是「哪一张能放进公开文档」：实测排在前面的大图多是片商
宣传素材，内衣、泳装乃至露点都在里面，`8-GRAPHIS` 这种看着像写真机构的档位同样混着
半裸。清单须人工复核，公开图片不得露点。2026-09-16 的复核覆盖 42 位；实际名单见 [人像清单](../scripts/demo-portraits.json)。

换图或加人时：取回候选、拼联系表一次看完、剔掉出界的，再按名字对应的**文件名**（不是
索引里的键名，那可能是别名或简称）与字节哈希写进清单，最后按内容哈希去重，因为一个人在
图库里常有好几个键指向同一个文件。

三种形状对应三条产品路径：番号型（`<番号>/<番号>.mp4` 配 NFO 与 `-poster.jpg`，部分带
`P/` 图集）走本地资料入库；创作者型（`<创作者>/<标题>.mp4` 配 PNG 与无番号 NFO）走
`posters/<id>_4.jpg` 本地海报；裸文件演示没有番号也没有边车的条目，只登记、不报问题。让 Peach 看见它：`peach init`
建演示 Peach 数据目录，在设置文件 `[media.locations]` 声明这个目录，`peach scan local`、
`peach process local`，候选在复核页全选通过或用 `scripts/apply_metadata_tags.py --source local_nfo`
按字段落地；要九宫格再跑 `scripts/probe.py` 与 `scripts/sheets.py`。生成器结束时会把这几步连同
当前平台的设置行一起打印出来。

新库的实体只来自复核落地，扫描本身不派生创作者，也不把图片挂到实体上，因此演示库的
创作者页与实体图集为空；这是产品现状，不是数据集缺项。

## 参考依据

- **README 结构（2026-09-06）**：取 Immich、Bruno、Hoppscotch 当时的 README 原文作参照，
  URL、日期与 SHA-256 见 `docs/reference-sources.json` 的 `readme-*` 条目。
  采用短定位、小尺寸具象 Logo、集中下载导航和精简能力分组；仅沿用 Peach 自有图标，
  不复制外部商标、截图、功能承诺或宣传内容。上游快照仅为取证，保留原文及上游许可入口。
- **同类项目的 README（2026-09-26）**：映库、OpenAver、amane、Stash、MetaTube、MDCx，
  登记同在 `docs/reference-sources.json`。借的是信息顺序：页头链接行、
  视频与截图靠前、功能一行一条、下载三步走、常见问题、反馈要附什么。不借文案、截图和附加
  使用条款，Peach 的边界以 AGPL 与 `SECURITY.md` 为准。
- **演示素材**：README 里任何截图或视频都按上面「演示数据集」一节的边界取图，换素材时重新核对
  那几条边界。
- **篇幅取舍（2026-10-27）**：参考 amane 的一行一功能与安装入口，以及 SakuraMedia 的主图与折叠截图。README 保留六条特色、安装表、文档导航和必要限制；参数、缓存、任务恢复、诊断与升级细节由专题文档承载。当前原文版本见 `docs/reference-sources.json`，不复制外部文案或使用条款。
- **截图与 Star 历史（2026-10-27）**：五张电影演示库截图保留，首页主图直接展示，其余四张折叠；WebP 均链接 PNG 原图。Star History 由 `scripts/render_star_history.py` 按逐日记录生成，横轴从第一个 Star 开始，采用蜜桃色霓虹描边、线性绝对值坐标和深浅主题（2026-10-28 起取代 Star Chart 的周粒度图）。独立 GitHub Actions 每日生成 SVG，仅写入 `star-history` 分支，README 不承诺即时刷新；取数与取舍见 [复用记录](REUSE.md)。
