# ADR-0147：镜像同时发布到 ghcr.io

- 状态：已采纳
- 日期：2026-11-05
- 关系：扩展 [ADR-0105](0105-linux-headless-container.md) 的镜像仓库；发布顺序沿用 [ADR-0121](0121-release-rehearsal-and-atomic-publication.md)

## 背景

镜像只推 Docker Hub 的 `longmeidao/peach`，仓库页侧栏的 Packages 是空的，从 GitHub 找不到镜像。Docker Hub 对匿名拉取限频，NAS 与 VPS 用户偶尔撞上。`Dockerfile` 已带 `org.opencontainers.image.source` 指向本仓库，推到组织的 ghcr 后 GitHub 会把包挂到仓库上。

## 决策

**一、发布作业把同一个已验收镜像推到 `ghcr.io/peach-mitao/peach`。** 版本号与 `edge` 两个标签与 Docker Hub 一致，先推 Docker Hub，再推 ghcr。登录用作业自带的 `GITHUB_TOKEN`（`packages: write`），不新增凭据。

**二、漏推的版本用「补发 ghcr 镜像」工作流按摘要复制。** 手动触发、填版本号，把 Docker Hub 上已发布的同一份镜像原样复制到 ghcr，复制后核对两边摘要一致，不重新构建。本 ADR 之前的版本（0.55.1 起）用它补发。

**三、Docker Hub 仍是主来源。** 配置页检查更新（`docker_update.py`）与 Watchtower 一键更新照旧按 Docker Hub 判断新版本；ghcr 只是多一个拉取地址。

## 代价

- 组织下新建的包默认私有，首次发布后要由维护者在包设置里改成公开，匿名才能拉取。
- ghcr 推送失败时，Docker Hub 已经推完；重试发布作业即可，两边标签都会补齐。
