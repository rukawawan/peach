# ADR-0140：Docker 部署经可选 Watchtower 在页面里一键更新

- 状态：已采纳
- 日期：2026-11-04
- 关系：沿用 [ADR-0121](0121-release-rehearsal-and-atomic-publication.md) 的「`edge` 只指向已完整发布的版本」与 [ADR-0126](0126-upgrade-effective-repairs.md) 的启动时备份并迁移；Windows 独立包的应用内更新不变

## 背景

配置页「检查更新」在容器里只列出宿主机上的 `docker compose pull`、`docker compose up -d` 两步。用户问能不能在 Peach 里直接一键更新。

容器换不掉自己：拉镜像、停旧容器、按原配置建新容器，都要 Docker Engine 的 API。容器里的 Peach 要么自己拿到这套 API，要么请一个拿着它的旁挂容器代办。

开工前要查清的一点：`docs/DOCKER.md` 写着「Docker 启动入口不会自动迁移已有数据库」。这句已经过期。`peach.server.initialize()` 自 ADR-0126 起，已配置的写入端在起服务前运行 `peach migrate upgrade --yes`：有待执行迁移时先把账本备份成同目录的 `ledger.pre-migrate-<时间>.db`，再逐个迁移，每个迁移在自己的事务里提交；失败时进程以非零退出，服务不启动。手动两步更新和一键更新走的是同一个启动入口，一键更新不需要另设迁移入口。

## 候选

| 路线 | 做法 | 结论 |
| --- | --- | --- |
| 可选 Watchtower 旁挂 | `compose.yaml` 的 `watchtower` profile 起 [`nickfedor/watchtower:1.23.2`](https://github.com/nicholas-fedor/watchtower)（Apache-2.0，原 `containrrr/watchtower` 已于 2025-12 归档）；Peach 调它的 HTTP API | 采纳 |
| Peach 容器挂 `/var/run/docker.sock` | Peach 自己调 Docker API 拉镜像、重建自己 | 拒绝 |
| 自写更新旁挂 | 写一个小容器专做拉取与重建 | 拒绝，与 Watchtower 重复，还要自己维护容器重建的全部细节 |

拒绝挂 Docker socket 的理由：能访问 socket 就能以宿主 root 起任意容器、挂任意目录，等于把宿主机交给 Peach 进程。Peach 跑着刮削、浏览器页面解析与第三方站点内容，是整个部署里暴露面最大的进程；一次远程代码执行就会升级成宿主机沦陷。Watchtower 同样拿着 socket，但它不碰外部内容，只开一个要令牌的更新接口，也不对宿主机发布端口。

## 决策

**一、Watchtower 只管 Peach，只在请求时更新。** profile 里的 Watchtower 设：

- `WATCHTOWER_HTTP_API_ENDPOINTS=update`：只开 `POST /v1/update`。开了 HTTP API 后默认不再定时轮询，更新只在用户点击时发生。旧的 `--http-api-update` 在 1.23 已标为弃用。
- `WATCHTOWER_LABEL_ENABLE=true`，Peach 服务带 `com.centurylinklabs.watchtower.enable=true` 标签：同一台宿主机上的其他容器不受影响。
- `WATCHTOWER_HTTP_API_TOKEN=/peach-update/watchtower-token`：令牌文件来自 `peach-update` 卷（见决策五），Watchtower 启动时发现这是已存在的文件就读其内容（`internal/flags/flags.go` 的 `getSecretFromFile`）。
- 不发布端口。Peach 在同一 compose 网络里经 `http://watchtower:8080` 访问。
- `depends_on` 等 Peach 健康后才启动，保证读令牌时文件已经写好。
- `WATCHTOWER_CLEANUP=true`：换下的旧镜像随 `edge` 移走变成无标签镜像，留着只占 NAS 磁盘，改回旧标签也用不上它。回滚按版本号标签从 Docker Hub 重新拉取。

停 Peach 容器时 Watchtower 用容器自己的停止超时（`pkg/container/container_source.go` 读 `Config.StopTimeout`），即 compose 的 `stop_grace_period: 75s`，与手动 `docker compose up -d` 一致。

**二、一键更新的开放条件。** 「一键更新」主按钮同时满足以下条件才出现，否则保留两步命令：

1. 运行在官方镜像里（`PEACH_DISTRIBUTION=docker`）；
2. 镜像标签是 `edge`。compose 把 `PEACH_IMAGE_TAG: ${PEACH_VERSION:-edge}` 传进容器。Watchtower 只会把容器换到同一标签的新镜像；`.env` 把 `PEACH_VERSION` 固定成版本号时，一键更新拉回来的还是那个版本，所以这时给两步命令，并提示先改 `.env`。容器里没有这个变量多半是旧 compose，提示换 compose 文件；
3. 令牌文件已生成；
4. 同一网络里探测得到 `http://watchtower:8080`（任何 HTTP 响应都算，探测不带令牌）；解析不出来就是没启用 profile，照常给两步命令，并说明怎样启用；
5. 镜像仓库已有新版镜像（见决策三）。

用户不填任何设置，配置页也没有相应的表单。

有待执行迁移不作为关闭条件：容器起来时启动入口会先备份再迁移，与手动更新相同。

**三、容器里的「有新版」以镜像仓库为准。** 版本号仍取 GitHub Release 与下载镜像站，取最高版本后再匿名读 Docker Hub `longmeidao/peach`：向 `auth.docker.io` 取 `repository:longmeidao/peach:pull` 的匿名令牌，`HEAD` 版本号标签与 `edge` 的 manifest，两者的 `Docker-Content-Digest` 一致才算有新版。Release 已建、镜像还没推送的空窗里报「镜像尚未发布」，不给更新入口。做法参照 [JavBoss `internal/update/container.go`](https://github.com/Solr159/JavBoss/blob/main/internal/update/container.go)（GPL-3.0，只参照协议用法，未复制代码）：不跟随重定向，令牌不发往别的主机；`Accept` 同时列出 OCI 与 Docker 的 index、manifest 类型，两个标签用同一组协商；只读 manifest 摘要，不下载镜像层。Peach 已从 Release 得到目标版本，不需要 JavBoss 那样分页读 `tags/list`。2026-11-04 实测 `HEAD` 响应带 `ratelimit-remaining` 但不扣匿名拉取额度。

**四、触发走异步。** Peach 调 `POST /v1/update?async=true`，带 `Authorization: Bearer <令牌>`，收到 202 即返回。同步调用时 Watchtower 会在请求中途停掉 Peach 容器，响应回不来。之后配置页轮询 `/api/client-updates`，运行版本变化后提示刷新页面；15 分钟内没有变化就报告未完成，并给出查看 Watchtower 日志的命令。Watchtower 正在执行另一次更新时回 429，页面照原文提示稍后重试。

**五、令牌由 Peach 生成，放在单独的卷里，接口不回传。** 官方镜像里有交给 UID 1000 的 `/update` 目录（`PEACH_UPDATE_DIR`），compose 在这里挂 `peach-update` 命名卷；空卷首次挂载时 Docker 照搬目录属主。`peach.server` 起服务前在里面生成 `watchtower-token`（32 字节随机，权限 600），已有就不动，之后不轮换。Watchtower 只读挂同一个卷，看不到 `/data`；用户把 `/data` 改成宿主机目录也不影响它。

不用 compose secrets 文件在两个容器间共享：2026-11-04 实测，服务引用的 secrets 文件不存在时 `docker compose up` 不报错，而是把该路径建成目录。给 Peach 也挂这个 secret，没启用 Watchtower 的部署会多出一个目录，日后再生成令牌文件就会失败。

Watchtower 只在启动时读令牌。宿主机重启后两个容器同时拉起，文件早已在卷里；万一对不上（例如有人删了卷里的文件），Peach 调更新接口会收到 401，页面提示运行 `docker compose restart watchtower`。

## 后果

- 启用一键更新要多跑一个拿着 Docker socket 的容器。默认 compose 不起它，`docs/DOCKER.md` 写清启用步骤与这项风险。没启用的部署只多一个装着令牌文件的小卷。
- 迁移失败沿用启动入口的已知边界：迁移进程限时 180 秒，超时或失败时容器退出，`restart: unless-stopped` 会反复重启，每次重启都会再备份一份账本。回滚旧版镜像前必须先用迁移前的备份替换账本，旧版本拒绝写入它不认识的结构。这两点写进文档，本 ADR 不改启动入口。
- Watchtower 不做健康检查回退。新容器起不来时，用户在宿主机上看 `docker compose logs`，按文档回滚。
- 只核对 `linux/amd64` 单架构镜像的摘要；以后发布多架构 index 时，两个标签仍指向同一个 index，判据不变。
- 2026-11-04 起的实测范围与结果记在 `docs/DOCKER.md`「更新与范围」。
