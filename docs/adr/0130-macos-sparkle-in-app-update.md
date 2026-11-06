# ADR-0130：macOS 独立包用 Sparkle 2 做应用内更新

- 状态：已采纳；代码已实施，2026-11-02 设置签名公钥，之后构建的 macOS 包启用
- 日期：2026-11-01（2026-11-02 按实施结果修订）
- 关系：补充 [ADR-0012](0012-version-and-update-boundary.md) 的更新边界与 [ADR-0120](0120-standalone-update-client-compatibility.md) 的旧客户端兼容门槛；appcast 作业排在 [ADR-0127](0127-verified-release-artifact-promotion.md) 晋级发布的 GitHub Release 之后

## 背景

Windows 独立包由 `standalone_update` 在应用内下载、替换并重启。macOS 独立包是 PyInstaller 打的 `Peach.app`，ad-hoc 签名、未公证，按 arm64 与 x86_64 分别出 DMG。此前 macOS 只认本机架构的 `Peach-<版本>-macos-<架构>.dmg`，设置页给出下载键，由用户拖入「应用程序」替换，每次替换后还要按 `scripts/MACOS_DOWNLOADS.md` 再跑一次移除隔离标记的命令。

macOS 应用的成熟更新方案是 [Sparkle](https://sparkle-project.org/)：appcast 列出版本，EdDSA 签名校验下载内容，独立的 `Autoupdate` 在应用退出后替换并重开。本文把 Sparkle 2 接进现有 `Peach.app`，不照搬 Windows 的自写流程。

结论依据 Sparkle 2.10.1（2026-10-25 发布）的源码与官方发布包。发布包在 Windows 上离线解包并解析 Mach-O 头，没有在 macOS 上运行；未在真机验证的项列在「未取得的证据」。

## 可行性结论

可行，前提是接受三条约束：EdDSA 私钥是 ad-hoc 签名下唯一的信任锚，丢失或更换后已装客户端只能手动重装；第一个带公钥的版本仍需手动安装一次；macOS 13 起的「应用管理」保护对 ad-hoc 包的实际行为未取得，必须在真机验收后才能启用。

| 问题 | 结论 | 依据 |
| --- | --- | --- |
| ad-hoc 新包能否通过校验 | 能。旧包与新包的 ad-hoc 签名都算「已签名」；新包满足不了旧包的 designated requirement（ad-hoc 的要求是 cdhash，每版都不同），但 EdDSA 校验通过、且新包自身签名有效时接受 | `SUUpdateValidator.m` 第 334–373 行：`passedDSACheck \|\| passedCodeSigning`；`SUCodeSigningVerifier.m` 的 `bundleAtURLIsCodeSigned:` 以能否取得 designated requirement 判断是否签名，ad-hoc 包能取得隐含的 cdhash 要求 |
| 隔离标记 | Sparkle 在安装前对新包整树移除 `com.apple.quarantine`，失败只记日志不中止 | `SUPlainInstaller.m` 第 46–53 行 |
| Gatekeeper | 新包没有隔离标记，不触发首次打开的评估。新包无 Team ID 时 Sparkle 做原子交换，并在 macOS 14.4 起调用 `gktool scan` 预热，扫描失败不影响安装 | `SUPlainInstaller.m` 第 94–120、347–383 行。真机行为未取得 |
| 应用管理（macOS 13 起） | 未取得。Apple 只说明同一开发团队签名的应用可以互相更新，否则拦截并通知用户；ad-hoc 签名没有 Team ID，文档未说明这类包是否受保护 | WWDC22「What's new in privacy」 |
| 能否轮换 EdDSA 私钥 | 不能。Sparkle 的轮换兜底要求新包满足旧包的 designated requirement，ad-hoc 永远满足不了 | `SUUpdateValidator.m` 第 351 行起 |
| 以后改用 Developer ID | 兼容。Sparkle 只拒绝「已签名改为不签名」，ad-hoc 改为 Developer ID 时只要 EdDSA 私钥不变即可通过 | `SUUpdateValidator.m` 第 282 行 |
| 没有公钥时启动 | 失败。设置了 `SUVerifyUpdateBeforeExtraction` 却没有 EdDSA 公钥时 `startUpdater:` 返回错误，所以 Peach 自己判断启用条件，不创建更新器 | `SPUUpdater.m` 第 317–365 行 |
| 系统版本下限 | 不变。Sparkle 2.10.0 起要求 macOS 12.0（包内二进制 `minos` 为 12.0）；Peach 最近一次成功的发布演练中，两个架构的 `minimum_macos` 已是 15.0 | Sparkle `CHANGELOG` 2.10.0 节；`release.yml` 运行 41107363667（`agent/codex/release-bottlenecks` 分支上的演练，不是标签运行）的构建输出 |

## 决策

### 一、总闸：`PUBLIC_ED_KEY`

`src/peach/sparkle_update.py` 的 `PUBLIC_ED_KEY` 为 None 时整套不启用：构建不写任何 Sparkle 键，菜单栏「检查更新」沿用版本检查与 DMG 下载。运行时 `available()` 要求 macOS 独立包、框架存在、包内 `Info.plist` 有 `SUPublicEDKey`，三者缺一就不创建更新器。框架照常随包，版本提交的发布演练因此在真机 runner 上验证打包与签名，运行时保持不动。

### 二、框架放在 `Contents/Frameworks`

1. 官方发布包 `Sparkle-2.10.1.tar.xz` 的地址与 SHA-256 固定在 `scripts/sparkle-macos.json`，由 `scripts/fetch_sparkle_macos.py` 下载、校验并取出框架与许可证。
2. 取件时删除 `XPCServices/` 及顶层指向它的符号链接：两个服务只供沙盒应用使用，官方文档说明非沙盒应用可以移除。随后按 `Autoupdate`、`Updater.app`、框架的顺序用 ad-hoc 重签；删了嵌套代码就必须重签框架，否则资源清单对不上。不开 Hardened Runtime：开启后库验证会拒绝加载 ad-hoc 签名的框架（官方文档的 Library Validation 说明）。
3. `scripts/build_macos_standalone.py` 在复制 cloudflared 之后，把框架按保留符号链接的方式复制到 `Peach.app/Contents/Frameworks/`，许可证放 `Contents/Resources/LICENSE-Sparkle.txt`，再走原有的整包签名与 `codesign --verify --deep --strict`。PyInstaller 的 `sys._MEIPASS` 就是这个目录，现有 `amane-runtime` 落在 `Contents/Frameworks/tools/amane-runtime` 可以印证。发布演练的仅下载验收另外核对框架存在、XPC 服务已去掉。

### 三、`Info.plist` 增加的键

构建脚本在写 `LSMinimumSystemVersion` 时一并写入 `sparkle_update.info_plist_keys(<架构>)`；公钥为 None 时为空：

| 键 | 值 | 说明 |
| --- | --- | --- |
| `SUFeedURL` | `https://downloads.peach.video/sparkle/macos-<架构>.xml` | 每个架构一份 appcast。地址一旦随带公钥的版本发出就要长期可用 |
| `SUPublicEDKey` | `PUBLIC_ED_KEY` | 仓库里只有一处常量，测试核对格式；更换需要新的 ADR |
| `SUVerifyUpdateBeforeExtraction` | YES | 2.7.3 起，解包前先验 EdDSA 签名 |
| `SUEnableAutomaticChecks` | YES | 显式写值，Sparkle 不再在第二次启动时弹窗询问；实际开关由设置页映射 |
| `SUAllowsAutomaticUpdates` | NO | 自动下载后在退出时安装会绕开安装前的任务保护，第一版只做手动确认安装 |

不设置 XPC 相关的开关。`SURequireSignedFeed`（2.9 起）不开：appcast 走 HTTPS，被篡改也只能指向仍须通过 EdDSA 校验的包，且安装器拒绝降级（`SUPlainInstaller.m` 第 325 行起）。之后需要签名 feed 时，新版本加上这个键即可，旧客户端不受影响。`CFBundleVersion` 已等于三段式版本号，Sparkle 的标准比较器可以直接比较。

### 四、菜单栏进程持有更新器

`peach serve` 是子进程，Sparkle 跑在菜单栏进程的主线程运行循环里。`tray.run_macos_menu_bar` 建好菜单后调用 `sparkle_update.start()`：`objc.loadBundle` 加载框架，创建 `SPUStandardUpdaterController`，委托由 `Updater` 强引用（Sparkle 只弱引用委托）。初始化失败只记日志，菜单栏改用版本检查。

菜单「版本与更新」>「检查更新」在启用时调用 `checkForUpdates:`。健康轮询线程每五秒读一次设置页的自动更新偏好，回主线程映射到 `automaticallyChecksForUpdates` 与 `updateCheckInterval`；关闭自动更新即关闭 Sparkle 的定时检查。

委托只用不需要 pyobjc 协议元数据的方法：返回对象或无返回值的方法用默认签名，返回 BOOL 的方法逐个声明类型。每个回调都收住 Python 异常，避免变成 ObjC 异常打断 Sparkle。

| 委托方法 | 职责 |
| --- | --- |
| `bestValidUpdateInAppcast:forUpdater:` | 本机是 ledger 读取端，且 appcast 里的最高迁移号高于本机账本已应用的迁移时，返回空条目让 Sparkle 按「没有可用更新」收尾，并用通知说明要先在写入端更新（对应 `standalone_update._update_writer`）；可以安装时返回 nil，交给 Sparkle 选择 |
| `updater:willInstallUpdate:` | 按 `update_tasks.reserve` 让任务保存进度、`wait_quiescent` 等在途步骤，再 `manager.stop_owned()` 释放端口。预约绑定菜单栏进程，它退出后自动失效，新版本启动后任务继续；预约失败时仍停服务 |
| `updaterWillRelaunchApplication:` | 兜底再停一次自有服务 |
| `supportsGentleScheduledUpdateReminders` 与 `standardUserDriverWillHandleShowingUpdate:forUpdate:state:` | 返回 YES；定时检查到更新时用系统通知提醒一次，附件应用没有窗口可前置 |

不用带 `NSError **` 出参的 `updater:shouldProceedWithUpdate:updateCheck:error:`，也不用带 block 参数的 `updater:shouldPostponeRelaunchForUpdate:untilInvokingBlock:`：两者都要 pyobjc 的签名元数据，在 Windows 上无法核对，失败的后果是端口没释放、新实例起不来。

新版本的迁移号写进 appcast 条目的 `peach:migrationHead`。Sparkle 解析条目时，非 Sparkle 命名空间的子元素以限定名为键、文本为值存入 `propertiesDictionary`（`SUAppcast.m` 第 60–71、205–211 行）。Sparkle 只在 `Autoupdate` 里解包，宿主拿不到解包目录，所以不能像 Windows 那样直接读暂存目录。

Sparkle 由 `Autoupdate` 经 LaunchServices 重开应用，不带 LaunchAgent 的 `--data-root` 参数和环境变量。独立包无参数启动时从默认数据目录读 `state/data-root.txt` 找到首次设置选定的数据根（`settings_file._selected_data_root`）。重开的进程不归 launchd 管理，直到下次登录。更新触发的退出码为 0，菜单栏的 LaunchAgent 写的是 `KeepAlive = {SuccessfulExit = false}`，不会在安装期间拉起旧包。

### 五、appcast 的生成与位置

1. **作业。** `release.yml` 的 `sparkle-appcast` 作业只在版本标签上、仓库变量 `SPARKLE_APPCAST_ENABLED` 为 `true` 时运行，排在 GitHub Release 公开之后，使用 `release` environment。
2. **生成。** 每个架构下载本版本的 DMG 与线上现有 appcast（404 视为首次，其他错误中止），用官方 `generate_appcast --ed-key-file - --download-url-prefix <Release 下载地址> --maximum-versions 5` 从标准输入读私钥并追加本版本条目。工具挂载 DMG 读取包内 `Info.plist`，写出 `sparkle:version`、`sparkle:minimumSystemVersion`、`length` 与 `sparkle:edSignature`。
3. **门槛。** `scripts/sparkle_appcast.py annotate` 补写迁移号，`verify` 核对本版本条目唯一且高于所有旧条目、下载地址与大小对得上实际 DMG、有签名、有最低系统版本、迁移号等于本提交的最高迁移号。签名由官方 `sign_update --verify` 用同一私钥核对。任何一项不过就不上传。
4. **下载地址。** enclosure 指向同一 GitHub Release 的 DMG，与 `release_updates` 同版本优先 GitHub 的做法一致，也不依赖 R2 是否同步了 DMG。Sparkle 每个条目只有一个下载地址，没有备用源。
5. **托管。** appcast 上传到 R2 的 `sparkle/macos-<架构>.xml`，经 `https://downloads.peach.video` 公开，缓存一分钟，上传后从公开入口完整下载核对。feed 放在自有域名，以后换存储后端不必改已装客户端。撰写时 `downloads.peach.video/releases.json` 最新为 v0.50.0，GitHub 发版流程不更新 R2 上的 DMG 与版本索引；appcast 作业只上传 appcast，需要的 R2 凭据要配进 GitHub 的 `release` environment。
6. **架构分开。** 在 Apple 芯片上经 Rosetta 运行 x86_64 包时，继续拿到 x86_64 的更新，与 `release_updates.check` 用 `platform.machine()` 选 DMG 的行为一致。不用 2.9 起的 `sparkle:hardwareRequirements`：它只能声明「需要 arm64」，表达不了「只给 x86_64」。

### 六、EdDSA 私钥的保管与注入

1. 维护者用 Sparkle 发布包里的 `generate_keys` 生成密钥对，公钥写进 `PUBLIC_ED_KEY`。
2. `generate_keys -x <文件>` 导出私钥（内容是 32 字节 seed 的 base64），存入 GitHub 仓库 `release` environment 的 secret `SPARKLE_ED_PRIVATE_KEY`，该 environment 只允许 `v*` 标签部署；另在密码管理器里离线备份一份，然后删除导出文件。
3. 只有 `sparkle-appcast` 作业引用这个 secret，经标准输入交给官方工具，不落盘、不进日志。版本提交的演练和 GitGud 流水线都不持有私钥。
4. 私钥丢失意味着所有已装的 Sparkle 客户端都要手动重装 DMG，因此备份是硬要求，不是建议。

### 七、与现有逻辑的衔接

| 位置 | 现状 |
| --- | --- |
| 菜单栏「检查更新」 | 启用时交给 Sparkle，否则沿用版本检查与系统通知 |
| 设置页「检查更新」 | 不改：继续显示本机架构 DMG 的下载键。改为触发菜单栏 Sparkle 需要服务进程与菜单栏进程之间的请求通道和页面预览，留待启用之后单独交付 |
| `release_updates.check`、`distribution.in_app_update()` | 不改：前者继续供设置页与接入前的客户端使用，后者继续只管 Windows 的 `standalone_update` |
| `automatic_updates` | 不改：服务进程照常定期检查并刷新设置页状态，不发通知；菜单栏把同一份偏好映射给 Sparkle |
| `scripts/MACOS_DOWNLOADS.md` | 启用前不改。启用后改为移除隔离标记的命令只在首次安装时需要 |
| `docs/OPERATIONS.md`、`docs/REUSE.md` | 登记随包框架、启用步骤与选用理由 |

### 八、旧客户端兼容门槛

参照 ADR-0120，这里有两类已装客户端：

1. **接入前的客户端**只读 `releases.json` 与 GitHub API 里的 `Peach-<版本>-macos-<架构>.dmg`，给出下载键。DMG 文件名和 `releases.json` 字段保持不变；第一个带公钥的版本由用户手动安装一次。
2. **接入后的客户端**把 feed 地址和公钥写死在包里。第五节的门槛保证 appcast 只在签名、版本、下载地址与迁移号都核对过之后上传；单元测试用合成的 appcast 与 DMG 覆盖同一套判据。
3. 需要放弃一批 Sparkle 客户端时，用 appcast 的 `sparkle:minimumAutoupdateVersion` 或 `sparkle:minimumUpdateVersion` 显式声明，并在变更日志写明手动升级方法，与 `OLDEST_CLIENT` 的作用相同。

## 需要用户授权或决定的步骤

维护者 2026-11-02 授权并完成：

1. 生成 EdDSA 密钥对。官方 `generate_keys` 把私钥存进登录钥匙串，经 SSH 无法解锁，所以用 `cryptography` 按同一格式（32 字节 seed 的 base64）生成；私钥经标准输入写入 GitHub `release` environment 的 secret，另一份放维护者 Mac 的文件里供导入钥匙串与离线备份。官方 `sign_update` 用这把私钥签出的签名能用公钥验过，格式一致。
2. 新建 GitHub `release` environment，只允许 `v*` 标签部署；写入变量 `PEACH_R2_BUCKET`。
3. 公钥写入 `PUBLIC_ED_KEY`。

尚待完成：

1. R2 的三项凭据。GitGud 上的同名变量是隐藏变量，读不回值，需要维护者在 Cloudflare 新建或取得后写入 `release` environment。
2. 凭据就位后把仓库变量 `SPARKLE_APPCAST_ENABLED` 设为 `true`。没有 appcast 时，启用了 Sparkle 的客户端检查更新会报更新源不可用。
3. 用第一个带公钥的版本在真机完成下节的验收。

## 未取得的证据

以下各项只有源码阅读或文档依据，须在真机验收：

- **应用管理保护。** ad-hoc 签名、没有 Team ID 的 `Autoupdate` 替换同为 ad-hoc 的 `Peach.app` 时，macOS 13、14、15、26 是否拦截或弹出「想要管理其他应用」的通知：未取得。如果拦截，用户须在「系统设置 > 隐私与安全性 > 应用管理」放行一次，并确认放行能否跨版本保留。
- **Gatekeeper 与 `gktool scan`。** 未隔离的 ad-hoc 包在 macOS 15 与 26 上替换后能否直接启动，`gktool scan` 对 ad-hoc 包的返回值：未取得。
- **pyobjc 委托的实际调用。** 默认签名的委托方法被 Sparkle 调用时参数与返回值是否正确编组，`bestValidUpdateInAppcast:forUpdater:` 返回空条目后 Sparkle 的界面表现：未取得。macOS CI 只核对 BOOL 方法的类型声明。
- **`generate_appcast` 保留旧条目。** 更新目录里只放本版本 DMG 时，旧条目及其中补写的 `peach:migrationHead` 是否原样保留：未取得。旧条目丢失不影响更新，只影响版本历史。
- **安装位置权限。** 应用不在当前用户可写的位置（例如由另一个管理员拖入「应用程序」）时 Sparkle 的授权流程：未取得。

## 已拒绝方案

- **照搬 Windows：自写 DMG 下载、挂载、替换与重启。** 与「各平台采用最成熟方案」的前提相悖。Sparkle 已经处理了替换时机、原子交换、隔离标记、降级保护和签名校验，自写只会重复这些边界。
- **先做 Developer ID 签名与公证，再接 Sparkle。** 能消除应用管理与隔离标记两项未知，但需要付费开发者账号与公证流程。它与 Sparkle 不互斥：只要 EdDSA 私钥不变，以后从 ad-hoc 改为 Developer ID 不影响已装客户端，所以不作为前置条件。
- **在 ubuntu 上用 Python 计算 EdDSA 签名、自己拼 appcast。** 能沿用现有的 Linux 发布作业，但要重新实现官方工具已有的读取包信息与签名，还要为直接导入 `cryptography` 声明新依赖。官方工具只需要一个仅在标签上运行的 macOS 作业，因此选用官方工具，Python 只做 Peach 自己的约束。
- **两个架构合并成一份 appcast，用 `sparkle:hardwareRequirements` 区分。** 该元素只能要求 arm64，表达不了「只给 x86_64」；分开两份更直接，也与按架构命名的 DMG 一致。
- **另出 ZIP 作为更新包。** Sparkle 支持 DMG，复用现有 DMG 不增加制品与发布桶占用。增量包需要在 macOS 上用 `BinaryDelta` 生成，体积收益留待以后评估。
- **开启自动下载、退出时安装。** 下载好的版本在用户退出 Peach 时静默安装，没有确认环节，任务保护与停服务都挤在退出路径上，真机行为也未取得；第一版只做手动确认安装。

## 后果

- 启用后，macOS 用户在菜单栏即可完成更新，只在首次安装时执行一次移除隔离标记的命令；设置页仍给出 DMG 下载键，直到页面接入另行交付。
- 发布流程多一个仅在标签上运行的 macOS 作业和一份长期有效的 feed 地址；R2 凭据要配进 GitHub。
- EdDSA 私钥成为不可替换的资产。更换要新的 ADR，并接受已装客户端全部手动重装。
- 应用管理保护的真机结果可能改变上线方式：若 macOS 拦截 ad-hoc 包的自更新，要么在文档中说明放行步骤，要么先完成 Developer ID 签名再启用 Sparkle。
