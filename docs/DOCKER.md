# Docker 部署

Peach 的 Docker 镜像用于单人 VPS 与 NAS，通过浏览器管理，镜像仓库为 [longmeidao/peach](https://hub.docker.com/r/longmeidao/peach)，同一镜像也发布到 [ghcr.io/peach-mitao/peach](https://github.com/peach-mitao/peach/pkgs/container/peach)，拉取受 Docker Hub 频率限制时可以改用后者；配置页的检查更新与 Watchtower 一键更新仍以 Docker Hub 为准。每次发布推送版本号标签，并把 `edge` 更新为同一镜像；版本号标签对应发布提交。当前镜像目标为 `linux/amd64`；ARM NAS 尚未验收。2026-10-15 在 WSL 的独立 Docker Engine 中，用正式锁定依赖通过空数据卷初始化、非 root、鉴权、配置保存、合成视频扫描、HTTP Range、配置重载与重启持久化验收。

Docker 不使用桌面托盘。在网页配置中添加媒体目录时，只需填写容器内实际目录，例如 `/media`；Peach 自动保存所需的路径配置。Windows 安装包、macOS 源码运行和 Docker 的入口分别见 [README](../README.md#下载与使用)。

## 数据与媒体

NAS 的 SMB 共享也可作为[SMB 媒体来源](SMB.md)直接连接，按账号权限读写，无需挂入媒体目录；Peach 数据卷仍单独保留。

`/data` 保存配置、SQLite 数据库、凭据和图片缓存，必须使用数据卷保存，重建容器时保留该卷。媒体目录单独挂到 `/media`；默认只读，扫描和播放不需要媒体写权限。整理、移动与删除需要使用者明确提供可写挂载。

CloudDrive2 与 Peach 分别运行。NAS 已有 CloudDrive2 时直接复用；全新机器按 [CloudDrive2 官方 Docker 指南](https://www.clouddrive2.com/docker.html) 安装并绑定网盘。让 Peach 容器也能读取 CloudDrive2 后续挂上的网盘目录，需要 Linux 宿主机支持 FUSE，并将 CloudDrive2 的挂载目录配置为可共享挂载变化；Compose 中的 `rslave` 用于让这些变化进入 Peach 容器。此机制不适用于 Docker Desktop，详见 [Docker 挂载传播说明](https://docs.docker.com/engine/storage/bind-mounts/#configure-bind-propagation)。Peach 容器不需要 FUSE 或特权模式。目录权限必须允许容器用户 UID 1000 读取。

需要云下载或推送发现时，Peach 配置中的 CloudDrive2 API 地址使用同一容器网络的服务名或可达的宿主机地址；容器里的 `127.0.0.1` 只指向 Peach 自己。

仓库根的 `compose.yaml` 使用 `PEACH_MEDIA_ROOT` 指定宿主机已有媒体根；容器中固定为 `/media`。先完成 CloudDrive2 挂载，再启动 Peach。命名卷 `peach-data` 保存 `/data`，不要执行删除该卷的操作。需要绑定现有数据目录时，先做完整备份并确保 UID 1000 可写；不要让另一台 Peach 同时写这份 Peach 数据库。

### 迁移数据目录

`/data` 的位置由宿主机上的挂载决定，容器里改不了，所以配置页「存储空间」不提供「更改位置」，改为列出下面几步。在宿主机上执行：

1. 查出数据卷的名字，以 `_peach-data` 结尾：`docker volume ls`。
2. 在 `compose.yaml` 所在目录停止 Peach：`docker compose down`。
3. 把数据卷复制到新文件夹，新文件夹要让 UID 1000 可写：`docker run --rm -v <数据卷名>:/from -v <新文件夹>:/to alpine cp -a /from/. /to/`。
4. 把 `compose.yaml` 里的 `peach-data:/data` 改成 `<新文件夹>:/data`，再启动：`docker compose up -d`。

确认新位置一切正常之前，不要删除旧数据卷。

## 首次运行与访问

### 飞牛、其他 NAS 与局域网访问

浏览器在另一台电脑上时，访问地址使用 NAS 的局域网 IP。Compose 默认的 `127.0.0.1` 只允许宿主机访问；容器显示运行成功不代表局域网端口已开放。

在 `compose.yaml` 同目录创建 `.env`，将下面的示例 IP 和目录换成 NAS 的实际值。`PEACH_PORT` 是浏览器使用的宿主机端口，可自行选择：

```dotenv
PEACH_BIND=192.0.2.10
PEACH_PORT=8900
PEACH_MEDIA_ROOT=/srv/videos
```

`192.0.2.10` 是文档示例地址，不能直接用于部署。NAS 管理界面支持 Compose 环境变量时，也可在那里填写这三个值。应用配置并重新创建容器后，打开 `http://<NAS 局域网 IP>:<PEACH_PORT>`。不要在另一台电脑上用 `127.0.0.1` 访问 NAS。

全新数据卷首次打开时，Peach 进入和 Windows、macOS 相同的首次设置：确认媒体目录（默认 `/media`），设访问密码或关掉开关选择免登录，选代理与是否立即扫描。数据目录固定为 `/data`，端口与访问地址由 Compose 决定，不在页面上出题。完成后服务自动切换到正常模式，页面稍后回到首页；设了密码时用它登录。

首次设置只接受宿主机或同一局域网设备打开的页面；经反向代理或公网打开时，页面会提示改从这些地址打开。局域网里第一个打开的人就能完成设置，介意时用下面的 `PEACH_ACCESS_PASSWORD` 预设密码。

### 初始化与管理

全新数据卷在首次设置完成前没有配置和数据库，服务以未配置状态运行；提交首次设置后，Peach 创建配置、数据库和随机访问口令。已有配置保持原值；如果已有数据库但缺少配置文件，服务拒绝启动，需要恢复配置文件。

已经配置过、但从没设过访问密码的部署，未登录的浏览器打开时会看到访问设置：设访问密码或选择免登录，来源要求与首次设置相同。

也可以在 `.env` 里写 `PEACH_ACCESS_PASSWORD=<8–256 个字符的密码>`，并取消 `compose.yaml` 中对应行的注释。还没有访问设置时，容器启动就用它设访问密码，首次设置页里访问那一项显示为已设置，日志不显示密码；已有访问设置时忽略它，改密码请到配置页。

访问口令仍会自动生成，供用户脚本和 API 使用，容器终端运行 `peach token`、宿主机运行 `docker compose exec peach peach token` 查看。配置页要求登录，并且连接必须来自容器本机或私有网络；携带代理转发头的管理请求会被拒绝。通过配置页保存后，服务自动读取配置；勾选扫描时会启动资料处理。

容器内 HTTP 端口固定为 8900，访问端口在 Compose 设置。默认只发布到宿主机 `127.0.0.1`，远程访问使用私有 VPN 或 SSH 隧道。需要局域网访问时，通过 `PEACH_BIND` 绑定宿主机的局域网地址，并设置访问密码。公网托管边界见 [安全说明](../SECURITY.md)。Docker 镜像不提供多人账号或租户隔离。

## 配置文件与路径

配置文件位于数据卷内的 `/data/config.toml`。在浏览器配置页的「媒体目录」中添加目录：填写 `/media` 或 `/media/115` 等容器内目录，选择媒体来源和读取策略，再保存。已有目录改了位置时，修改这一行的媒体目录；数据库路径的对应关系由 Peach 管理。

手动编辑配置文件前先备份，编辑后重启容器。更新镜像保留这个文件，因此已有文件的注释也保持原样。查看配置说明不需要重新初始化数据卷。

容器已更新并重新启动后，在 `compose.yaml` 所在目录运行以下命令，可查看新版注释与当前配置值；命令只显示内容，不改写 `/data/config.toml`：

```sh
docker compose exec peach python -c "from peach import settings_file as s; print(s.render(s.active()), end='')"
```

默认模板只包含初始值，不包含已有部署的媒体目录和自定义设置。用默认模板整份替换会同时替换这些值，可能使已有影片无法读取。只更新说明时可以替换注释，保留配置值；需要替换整个文件时，先备份并逐项核对差异。

以下说明供手动编辑配置或在多台 Peach 之间对应已有媒体目录时参考。网页保存时会处理 `[media.locations]` 和 `[media.mounts]`：前者保存数据库中的路径前缀，后者保存实际读取文件的目录。Peach 数据库在所有系统上都使用 Windows 格式保存影片路径；Linux 无需创建相同的盘符或目录。

全新配置不预设媒体目录。盘符不决定来源，115 与 PikPak 均可选择任意已挂载目录；容器内填写实际路径即可。文档中的盘符只是数据库路径示例。

以下三个路径各有用途。假设宿主机媒体目录为 `/srv/videos`，Compose 将它挂到容器 `/media`：

| 位置 | 示例 | 用途 |
| --- | --- | --- |
| 宿主机目录 | `/srv/videos` | 填在 Compose 的 `PEACH_MEDIA_ROOT`，目录必须已存在 |
| 容器内目录 | `/media` | 填在配置页的媒体目录或 `[media.mounts]`，Peach 实际读取这里 |
| 数据库中的目录前缀 | `R:\media` | `[media.locations]` 的示例值，对应数据库影片路径的开头；通常由 Peach 管理 |

手动配置全新本地馆藏时，可使用以下对应关系。网页自动生成的前缀可能不同，使用时无需改成示例值。将两个表中的条目合入已有配置，不要重复添加同名表：

```toml
[media.locations]
local = 'R:\media'

[media.mounts]
local = '/media'
```

扫描 `/media/a.mp4` 后，Peach 在数据库的影片 `path` 字段中保存 `R:\media\a.mp4`；播放时再把 `R:\media` 替换为 `/media`，读取容器中的 `/media/a.mp4`。数据库中的这段 Windows 路径是字符串，不是 Linux 上实际存在的文件名。

已有影片时，`[media.locations]` 必须继续匹配数据库中的路径前缀。把它改成 `/media` 不会同步修改已有影片记录，反而会使路径无法对应。只搬动实际媒体目录时，保留 `[media.locations]`，调整 `[media.mounts]` 和 Compose 的目录挂载。一个来源有多个目录时，两张表均使用数组，数量和顺序一一对应。

需要复用另一台 Peach 的数据库时，在配置文件的 `[media.locations]` 中填写与该数据库影片路径匹配的目录前缀，在 `[media.mounts]` 中填写这台容器能读取的目录，例如 `/media/115`；已有部署保留自身的对应关系。Compose 必须已挂入这些目录。CloudDrive2 是媒体来源之一，本地目录也可直接挂入 Peach。

容器中的服务固定监听 `0.0.0.0:8900`，宿主机访问地址和端口使用 Compose 的 `PEACH_BIND`、`PEACH_PORT`；`[server]` 的 `host`、`port` 用于直接运行 `peach serve`。独立 Docker 部署保持 `[replication] enabled = false`，无需配置桌面托盘或 SMB 复制。

## 硬件转码（AMD / Intel VAAPI）

Linux 首次重编码时会探测实际可用的硬件编码器，整片 MP4 与 HLS 分片共享探测结果。AMD / Intel 使用 VAAPI；存在 NVIDIA 设备时探测 NVENC。探测失败的后端在当前服务进程内不再尝试，重启服务后重新探测。封装复制不需要硬件探测。

封面、九宫格与时间轴抽帧也使用同一渲染节点做 VAAPI 解码，范围限 H.264、HEVC、VP9、AV1；节点建不出 VAAPI 设备、编码不在范围内或本帧解码失败时改用软件解码。「抽帧解码方式」选软件时不探测。

镜像自带 OpenCV（`vision` 依赖组）和头像取景与比对用的人脸模型（YuNet 为 MIT，SFace 为 Apache-2.0，许可证在同一目录），位于 `/app/tools/face-models`，由 `PEACH_FACE_MODELS` 指向，容器不联网也能用。构建镜像时按固定地址下载并校验 SHA-256。

镜像包含 Debian FFmpeg、Mesa VAAPI 驱动与 `vainfo`。AMD 宿主机需加载 `amdgpu` 和对应固件，并提供 `/dev/dri/renderD*`。Intel 需在自定义镜像内安装适配设备的 VAAPI 驱动；Mesa 驱动不代表已覆盖全部 Intel GPU。将下面的条目合入 Compose 的 `services.peach`，设备路径按宿主机调整：

```yaml
    devices:
      - /dev/dri/renderD128:/dev/dri/renderD128
    group_add:
      - "${PEACH_RENDER_GID}"
    environment:
      PEACH_TRANSCODE_BACKEND: auto
      PEACH_VAAPI_DEVICE: /dev/dri/renderD128
```

`PEACH_RENDER_GID` 填宿主机渲染节点所属组的数字 GID。容器以 UID 1000 运行，需要该节点的读写权限；只透传设备但没有组权限仍会初始化失败。Unraid 在容器设置中添加同样的设备映射、环境变量和额外组，无需开启特权模式。默认 Compose 不挂设备，无 GPU 的机器可直接运行。

| 环境变量 | 值与用途 |
| --- | --- |
| `PEACH_TRANSCODE_BACKEND` | 默认 `auto`；可设为 `vaapi`、`nvenc` 或 `software`。指定硬件后端仍会验证能否编码，失败回退软件。 |
| `PEACH_VAAPI_DEVICE` | 指定容器内渲染节点；留空时按名称依次探测 `/dev/dri/renderD*`，使用第一个可用节点。 |

VAAPI 尝试顺序为硬件解码加 `scale_vaapi` / `h264_vaapi`、软件解码加 `hwupload` / `h264_vaapi`、`libx264`。解码能力还受 GPU 型号、片源编码与位深限制；硬件编码可用不能证明每个片源都能硬件解码。NVIDIA 透传还需宿主机驱动及 NVIDIA Container Toolkit，Mesa 不提供 CUDA / NVENC。

出现 CPU 高占用时，先查看日志中的「转码硬件后端」和「转码硬件探测失败」。完成日志「整片转码完成」或「HLS 分片完成」后的 `vaapi` 表示使用硬件解码和编码，`vaapi-encode` 表示软件解码加硬件编码，`libx264` 表示软件转码。再在同一容器、同一用户下检查设备权限与 `vainfo --display drm --device /dev/dri/renderD128` 的结果。`No VA display found` 需结合驱动和设备权限排查，不能仅凭节点存在排除权限问题。

`ffmpeg -hwaccels` 列出构建支持的硬件加速方式，`ffmpeg -h decoder=h264` 等列出对应解码器支持的硬件设备。VAAPI 解码通过普通解码器的硬件加速接口启用，`ffmpeg -decoders` 中没有名为 `vaapi` 的解码器不代表缺少 VAAPI 解码支持。参数含义见 [FFmpeg 官方文档](https://ffmpeg.org/ffmpeg.html#Advanced-Video-options)。目标 GPU 的实际解码、GPU 占用与播放效果需要在部署机器上验证。

## amane 刮削站点

镜像随附按 `tools/amane-bridge/uv.lock` 构建的 amane `0.20.0` 独立环境，位于 `/app/amane-runtime`，通过 `PEACH_AMANE_RUNTIME` 定位。全新 `/data` 卷可直接调用刮削站点，无需在首次运行时安装依赖。桥通过独立子进程调用，站点请求仍使用所选连接方式。

运行环境与镜像一起更新，`manifest.json` 记录固定 revision、版本和解释器相对路径。镜像构建阶段与最终运行阶段都会执行 `bridge.py --self-check`，离线载入运行时与全部 Peach 开放站点类。此检查不发站点请求；来源网络是否可达需在部署环境验证。环境损坏时重新拉取并创建对应镜像，保留 `/data` 卷。

`/app/amane-runtime` 同时包含 GPL-3.0 许可证、来源说明和 `amane-corresponding-source.zip`；归档包含固定 revision 的完整 amane 源码、Peach 桥、锁文件、构建入口，以及 zhconv 和 certifi 的固定源码。依赖许可证保留在独立环境内。

## 导出诊断报告

Docker 部署使用网页「Peach 配置 → 系统诊断 → 下载诊断报告」，无需桌面托盘。已登录的私有网络客户端可以下载；通过反向代理或公网访问时，改用容器内导出。

网页不可用时，在 Compose 文件所在目录执行下面的命令，在正在运行的 `peach` 服务容器中生成脱敏 ZIP。目标文件已存在会拒绝覆盖；再次导出时同时更换两条命令中的文件名。

```text
docker compose exec peach python -m peach.support_bundle /tmp/peach-support.zip
```

将 ZIP 复制到当前目录：

```text
docker compose cp peach:/tmp/peach-support.zip ./peach-support.zip
```

报告包含版本、运行日志和任务状态，不包含数据库、媒体或配置原文。发送前检查内容，脱敏范围见 [日志与诊断](DIAGNOSTICS.md)。容器不连接宿主机桌面托盘；管理与诊断入口均在网页和 CLI 中提供。

## 更新与范围

配置页「检查更新」在容器里显示安装方式「Docker 镜像」。容器里的「有新版本」以 Docker Hub 为准：版本号标签已推送、`edge` 指向同一镜像才算；发布页已有新版而镜像还没推送时显示「镜像尚未发布」。检查只读镜像清单的摘要，不下载镜像。

没有启用下文的一键更新时，有新版本会列出宿主机上的两步：`docker compose pull` 拉取新镜像，`docker compose up -d` 重建容器。`.env` 把 `PEACH_VERSION` 固定成版本号的，先改成新版本再拉取。

更新镜像并重建容器时保留 `/data`。新容器启动时，已有数据库有待执行的迁移就先在 `/data/database/` 备份成 `ledger.pre-migrate-<时间>.db`，再执行迁移，完成后才启动服务；手动更新和一键更新都这样处理。迁移最多等 180 秒，失败或超时时容器退出，`restart: unless-stopped` 会反复重启，每次重启都会再备份一份，先用 `docker compose logs peach` 查原因，必要时 `docker compose stop peach` 停下。健康检查使用 `/healthz?ready=1`。

### 一键更新（可选 Watchtower）

容器换不掉自己。`compose.yaml` 的 `watchtower` profile 提供一个可选的 [Watchtower](https://github.com/nicholas-fedor/watchtower) 容器（`nickfedor/watchtower`，原 `containrrr/watchtower` 已停止维护）：配置页点「一键更新」后，Peach 请它拉取新镜像并按原配置重建 Peach 容器，`/data` 卷保留。它只管带 `com.centurylinklabs.watchtower.enable=true` 标签的 Peach 容器，只在收到请求时更新，不定时轮询，也不对宿主机发布端口。

Watchtower 挂着宿主机的 Docker socket，能创建、停止任何容器，等于宿主机 root 权限。只在信任这台宿主机上的 compose 配置时启用。Peach 容器本身不挂 socket，只持有 Watchtower 更新接口的令牌。

启用只需一步，不用在配置页填写任何内容：在 `compose.yaml` 所在目录运行 `docker compose --profile watchtower up -d`。之后的 `docker compose` 命令都带上 `--profile watchtower`，或在 `.env` 写 `COMPOSE_PROFILES=watchtower`。`.env` 不要把 `PEACH_VERSION` 固定成版本号：Watchtower 只会换同一标签的新镜像，标签是版本号时配置页会改为列出两步命令。

令牌由 Peach 首次启动时生成，放在 `peach-update` 卷里，之后不再更换。Watchtower 等 Peach 健康后才启动，只读挂这个卷，读不到 `/data`。`/data` 改成宿主机目录时不用改 Watchtower 的配置。不启用 profile 的部署只多一个装着令牌文件的小卷。点「一键更新」提示令牌不一致时，运行 `docker compose restart watchtower` 让它重新读取。

检查更新发现新镜像后，「一键更新」替代两步命令。点击并确认后，Peach 会断开一会儿；新版本启动后页面提示刷新。15 分钟内没有看到新版本时，用 `docker compose logs watchtower` 和 `docker compose logs peach` 查看原因。已经在宿主机上 `docker compose pull` 过新镜像、还没 `up -d` 时，旧容器的镜像可能已失去标签，Watchtower 日志显示 `Failed to retrieve image info` 并跳过；这时直接运行 `docker compose up -d`。

Watchtower 不在新容器起不来时自动回退。换上新镜像后它删除被替下的旧镜像，免得每次更新在 NAS 上多留一份；指向同一镜像的其他本地标签也一起删除。Docker Hub 保留每个版本号标签，回滚时重新拉取。回滚到旧版本前，先停下 Peach，用升级时生成的 `ledger.pre-migrate-<时间>.db` 替换 `ledger.db`，再把 `.env` 的 `PEACH_VERSION` 设为旧版本号并 `docker compose up -d`；旧版本不会写入它不认识的数据库结构。方案取舍见 [ADR-0140](adr/0140-docker-one-click-update-via-watchtower.md)。

2026-11-04 在 Windows 的 Docker Desktop（Engine 29.9.2，containerd 镜像库）上，运行中容器的镜像只有 `edge` 一个本机标签，把本地 registry 的 `edge` 换成版本号更高、多一个空表迁移的测试镜像，经配置页触发后通过验收：Watchtower 自己拉取新镜像，按 75 秒停止超时停下旧容器，11 秒内起了新容器；`/data` 里的标记文件保留，启动前生成 `ledger.pre-migrate-*.db` 并执行了新迁移，`/healthz?ready=1` 通过，旧镜像已清理。全新启动时 Watchtower 在 Peach 首次健康的同一秒启动，令牌文件属主为 `peach`、权限 600；两个容器同时重启后令牌仍然一致；改掉卷里的令牌后点「一键更新」得到要求重启 Watchtower 的提示，`docker compose restart watchtower` 后恢复。不带 profile 时 `docker compose up -d` 照常启动。Docker Hub 的真实拉取、ARM NAS 与 Docker Desktop 以外的 Linux 宿主机未取得。

Linux 容器不读取用户电脑上的浏览历史，也不包含交互式浏览器；需要本机浏览器完成验证的来源在此环境不可用。CloudDrive2 的真实账号登录、网盘流量与 NAS 实机挂载需在目标机器验证。

## 镜像发布

构建使用官方 Python `3.14.8-slim-trixie` 与 uv `0.13.1`，应用依赖与 amane 独立依赖分别由各自的 `uv.lock` 锁定。应用以非 editable 包安装，包含 Web 与迁移资源。镜像以 UID/GID 1000 运行，内置 FFmpeg、FFprobe、OpenSSL 和 amane 独立环境。uv 与 Git 只用于构建阶段。构建上下文只允许代码与资源，不包含工作树、媒体、真实 Peach 数据库或凭据。

GitHub Actions 的 `Docker` 工作流先构建并运行临时卷验收，通过后发布。仓库变量 `DOCKERHUB_USERNAME` 和机密 `DOCKERHUB_TOKEN` 用于 Docker Hub 发布；机密只保存在 GitHub，不进入项目文件。未配置发布身份时仍执行构建验收。ARM 镜像需通过同等运行验收后再加入发布。

Docker Hub 页面以英文为主，概览正文取自 [docs/dockerhub/README.md](dockerhub/README.md)，链接回 GitHub 的源码、本文和中文 README。简介填写 `Local-first video metadata scraper and media manager. Self-hosted web UI for VPS and NAS.`。发布流水线只推送镜像，概览与简介需要在 Docker Hub 仓库设置中手动更新；镜像、端口、目录或 Compose 示例变化时同批修改该文件。

## 安装后检查资料源与封面连接

完成首次设置、保存代理或来源 Cookie 后，打开「数据管理 → 来源和凭证」，在「连接检查」里点「全部检查」。检查在后台进行，页面显示已检查的来源数；离开页面不中断，回来仍能看到上一次的结果，任务中心也会留下这一轮记录。

只想重查几个来源，或需要机器可读的结果时，在容器管理器的终端执行同一检查：

```bash
python -m peach check-sources
python -m peach check-sources --source dmm --source javdb --json
```

检查在 NAS 容器内发起，使用该实例已有的来源网络设置、Cookie 与冷却记录。最多四个来源并发，每个来源限制请求次数、读取量与时间预算；只读取来源页面和 DMM 图片 CDN 样本，不读取影片、不启动桌面浏览器。结果保留到现有采集设置的来源连接记录；限流或拒绝访问沿用现有冷却机制，不自动关闭来源或修改代理。

网页与命令行的报告使用同一口径，逐项区分可连接、登录或人机验证、HTTP 错误、冷却与网络失败。正在冷却的来源直接报冷却，不再发请求。页面能连接仅说明检查地址可达，不代表全部作品资料、封面或登录会话可用；片商官网需要番号时标记为未检查，不计为连接失败。命令行在其余目标未通过时退出码为 1。更换 NAS 出口或代理后可再次检查；`--source` 可重复指定，仅重查关心的来源。
