# ADR-0121：版本提交先演练，标签只负责发布且全有或全无

- 状态：已采纳
- 后续决策：产物晋级、传输续跑与回收方式见 [ADR-0127](0127-verified-release-artifact-promotion.md)。
- 修订：2026-11-14 起发布同时推送 `latest`，镜像改为 amd64 与 arm64 两个架构，见文末「修订：latest 标签与 arm64 镜像」。
- 日期：2026-10-24
- 关系：修订 [ADR-0119](0119-mainline-changed-scope-release-full-suite.md) 第四条「版本标签流水线：三平台全量是发布门槛」；补充 [ADR-0012](0012-version-and-update-boundary.md) 的发布边界

## 背景

0.47.1 到 0.48.1 有四个版本标签没有发出完整制品，版本号作废了四个。失败点都在只有标签流水线才执行的地方：

- macOS 产物清点没跟上新增的源码包；
- 打标签之后才做的依赖审计；
- 标签流水线里三平台全量的一次负载偶发。

主线流水线不跑这些作业，所以主线绿了也说明不了「能发」。另外，`publish-docker` 只等 `validate-release` 与 Linux 全量：0.48.0 的 `build-macos` 失败了，`0.48.0` 镜像却已经推到 Docker Hub，`edge` 也指过去约 5 小时。标签流水线没通过，东西却发出去了一部分。

## 决策

**一、版本提交的主线流水线就是发布演练。** `release_tag.py --ship` 推上 master 的提交主题是 `chore(release): 版本 X`。`.gitlab-ci.yml` 的 `.release-rehearsal` 规则匹配这类提交，给作业设置 `PEACH_RELEASE_REHEARSAL=1`，并用规则变量 `PEACH_CI_COVERAGE=full` 把主线的 `verify-linux`、`verify-windows`、`verify-macos` 改成全量。之后跑完标签上除发布以外的全部作业：`windows-media`、`build-windows`、`build-macos`、`smoke-windows` 和 `docker-build`。最后由 `release-rehearsal-cleanup` 回收 R2 上的暂存产物。

需要「标签」的脚本，在演练里改用提交里的版本号：

- `ci_r2_artifacts.identity`；
- `ci_windows.ps1` 的 `Assert-ReleaseRef`；
- `smoke_update_tasks` 的安装验收主机核对。

**二、演练全部通过才打标签。** `--ship` 等版本提交的流水线转绿。等待中任一作业失败（不限于原来的四个必需作业），就立即报错。打标签前，`GitLabForge.require_rehearsal` 核对 `REHEARSAL_JOBS` 每一项都在、都成功：规则没匹配上导致演练没跑，也不打标签。默认等待上限改为 4 小时，因为 macOS 的两个架构要从源码编译。

**三、标签流水线只构建和发布，不再重跑全量。** `validate-release` 核对同一提交的主线流水线（含演练）已经成功，所以标签上不重跑三平台全量，构建、冒烟后直接发布。

**四、发布全有或全无。** 镜像拆成两步：

- `docker-build` 构建、冒烟，镜像留在这台 runner 上；
- `publish-docker` 只负责推送，而且排在 `publish-release` 成功之后。

`publish-release` 等 `validate-release`、两个平台的构建、Windows 冒烟和 `docker-build` 全部通过才运行。任何一步没过，安装包、R2、GitGud Release、Docker Hub 的版本号与 `edge` 一个都不动。`publish-release` 与 `publish-docker` 自身失败时，重试同一个作业即可，标签不用动。

## 迁回 GitHub

同一套判据在两个平台各有实现，迁回 GitHub 时不用重新设计：

| 机制 | GitGud（`.gitlab-ci.yml`） | GitHub（`.github/workflows`） |
| --- | --- | --- |
| 演练触发 | `.release-rehearsal` 规则匹配版本提交主题，设置 `PEACH_RELEASE_REHEARSAL=1` | `release.yml` 也在 master 推送时触发；`validate` 只放行标签、手动运行与 `chore(release): 版本 ` 开头的提交，其余作业都依赖它 |
| 打标签前核对 | `release_tag.require_rehearsal` 调 `GitLabForge.require_rehearsal`，核对同一条主线流水线里的演练作业 | `release_tag.require_rehearsal` 等同一提交推送触发的 Release 工作流跑完，结论必须是成功 |
| 标签只发布 | `validate-release` 核对演练已通过，标签上不重跑全量 | 发布作业 `release`、`docker-publish` 只在标签上运行 |
| 发布顺序 | `docker-build` 先验收；`publish-docker` 依赖 `publish-release` | `docker` 先验收；`docker-publish` 依赖 `release` |
| `edge` 与 `latest` 的语义 | 只由 `publish-docker` 推送，指向最新发布的版本 | `docker.yml` 只验收不推送；`edge` 与 `latest` 只由 `docker-publish` 推送，指向同一个多架构 index |

本机测试设施（快速门槛、隔离重跑、整机重负载锁）与平台无关。GitHub 托管 runner 每个作业一台独立机器，整机锁在那里不会产生等待；迁回后如果仍用自托管 Windows runner，用同一个 `scripts/machine_lock.py` 包住构建与冒烟。

## 后果

- 每次发版每个平台只跑一次全量。原来版本提交改了 `src/peach/__init__.py`，主线选测已经退成全量，标签上又跑一遍；现在只在演练里跑一次。媒体、构建与冒烟在演练和标签上各跑一次，多出来的是构建时间（Windows 构建加冒烟约 30 分钟，macOS 两个架构的构建作业时限 2 小时）。代价换来的是失败挡在打标签之前，不再作废版本号：上一轮四个作废的标签，每个都要重新定版、改变更日志，再走一遍整条流水线。
- 演练要用 `release` 环境的变量。master 是受保护分支，与版本标签同样能取得这些变量；如果项目把环境限制成只允许标签，演练的构建作业会在取凭据时失败，`--ship` 不会打标签，改环境设置后重跑即可。
- 演练与标签各构建一次，产物不共用。两次构建来自同一个提交，标签流水线的构建失败只可能来自基础设施，重试作业即可。

## 修订：latest 标签与 arm64 镜像

2026-11-14 维护者同意按 issue #586 与 #152 修订第四条的标签与架构：

- **同时推送 `latest`。** NAS 容器面板（飞牛实测）判断有无更新时只查 `latest`，不写标签的 `docker pull longmeidao/peach` 也解析成 `latest`。原来只推版本号与 `edge`，`latest` 在仓库里不存在，面板永远不提示更新。现在 `latest` 与 `edge` 在同一步推送、指向同一镜像，语义都是「最新完整发布」，不另设预发布通道。应用内一键更新把两者都当作滚动标签。
- **镜像同时提供 linux/arm64。** 锁定依赖在 aarch64 上都有 manylinux 轮子；只能源码构建的几个包与 amd64 相同，构建阶段本来就带编译器。人脸模型是 ONNX 文件，与架构无关。演练里两个架构各在原生 runner（`ubuntu-latest`、`ubuntu-24.04-arm`）上构建、冒烟、记录 image ID，不用 QEMU。标签流水线核对两份候选后，先推 `<版本>-amd64` 和 `<版本>-arm64`，再用 `docker buildx imagetools create` 合成一个 index。版本号、`edge`、`latest` 都指向这个 index，应用内「版本号与 `edge` 摘要相同才算已发布」的判据不变。
- **全有或全无不变。** 任一架构的演练没通过，`select` 就找不到完整候选，标签流水线不推送任何镜像。推送中途失败时重试 `docker-publish`；已推的 `<版本>-<架构>` 会被同一镜像覆盖。

## 已拒绝方案

- **在标签流水线里重用演练的产物**：可以省一次构建，但 R2 暂存按流水线编号核对身份，跨流水线取产物要另建一套身份校验。等构建时间成为瓶颈时再做。
- **手动触发的候选流水线**：要多一个人工步骤，还得把候选结果和版本提交对上号。直接在版本提交的流水线里演练，`--ship` 等的本来就是它。
- **标签失败后删标签、用同一版本号重打**：删远端标签不可逆，而且每次都要单独授权；演练把失败挡在打标签之前。
