---
kind: reference
---

# 已有时间轴预览

播放器进度条优先读取与视频准确配对的已有预览，其次使用 Peach 的时间轴缓存，再退回九宫格。读取已有预览只访问索引和图片，不启动 FFmpeg。时间轴采集遇到可用的已有预览时计为跳过，不重复抽帧。

详情、小窗和沉浸模式的进度条共用同一块预览（`frontend/src/player/seek-preview.ts`）：鼠标悬停时显示，触屏按住拖动时显示、抬手收起。九宫格只从已有快照裁格，快照也取不到时只显示时间。Peach 自有缓存在指针第一次碰到进度条时按页预取一次，不超过 12 张；外部来源按需读取。

## 格式与配对

以 `movie.mp4` 为例，配对保留完整文件主名，包括版本和分卷后缀，不按番号合并不同视频。

| 格式 | 视频旁的入口 | 读取范围 |
| --- | --- | --- |
| WebVTT 图片索引 | `movie.vtt`、`movie.mp4.vtt`、`movie.thumbnails.vtt`、`movie-thumbs.vtt`、`movie.storyboard.vtt` | cue 时间范围与独立图片，或带 `#xywh=x,y,w,h` 的 JPEG、PNG、WebP 拼图；支持不等间隔和时间空隙 |
| HLS 图片播放列表 | 同一组主名的 `.m3u8` 文件 | VOD 的 `EXT-X-IMAGES-ONLY`、`EXT-X-TILES` 与独立图片分段；主列表通过 `EXT-X-IMAGE-STREAM-INF` 指向图片列表 |
| DASH 图片轨 | 同一组主名的 `.mpd` 文件 | 静态 MPD 的图片 AdaptationSet、`thumbnail_tile`、`SegmentTemplate`、`SegmentTimeline`、时间尺度、起始编号、时间偏移与多 Period；模板支持 `$Number$`、`$Time$`、`$RepresentationID$`、`$Bandwidth$` 与数字补零 |
| BIF v0 | `movie.bif`、`movie-320-10.bif`、`movie-sd.bif`、`movie-hd.bif`、`movie-fhd.bif` | 读取文件内的真实时间戳、时间乘数和 JPEG 偏移；Emby、Roku 及从 Plex 导出的 BIF 共用此读取器 |
| Jellyfin Trickplay | `movie.trickplay/320 - 10x10/0.jpg`、`1.jpg`… | 从目录读取网格，数字序号须从 0 连续；末张维持完整网格，按有效帧数限制选择范围 |

同一视频有多个可用格式时按表格顺序选择，缺失或损坏的候选跳过。索引引用的图片和子播放列表须留在视频所在目录及其子目录中。绝对路径、远端 URL、越目录引用、加密或字节范围 HLS、直播清单不参与本地读取。DASH 的 SegmentList、SegmentBase 和动态清单不在读取范围内。

Plex 的内部 `index-sd.bif` 需要先导出并按视频主名配对。Peach 不自动扫描 Plex 的内部元数据目录，也不凭同目录唯一视频猜测 BIF 归属。Kodi 的 `.tbn` 是单张 artwork，不带时间索引，不作为时间轴预览。

## Jellyfin 的时间信息

`320 - 10x10` 只表达单帧宽度和网格，无法记录采样间隔和末张有效帧数。Jellyfin 数据库与 API 的 TrickplayInfo 才包含 `Interval`、`ThumbnailCount` 等字段。

从 Jellyfin 导出的 TrickplayInfo 可保存在分辨率目录的 `trickplay.json` 中，供 Peach 精确读取。这是 Peach 接受的导出边车，不是 Jellyfin 原生生成的文件。字段为 `Width`、`TileWidth`、`TileHeight`、`Interval`（毫秒）与 `ThumbnailCount`，须与目录尺寸和拼图数量一致。

只有 JPG 时，Peach 在时长、拼图数量与默认 10 秒间隔一致的条件下提供估算预览，接口标记 `estimated: true`。自定义间隔无法从目录名可靠还原；数量不一致时不采用默认值。黑色画面可以是真实内容，不用黑色比例猜测有效帧数。

## 接口与缓存

`GET /api/timeline?id=<资产 ID>` 对已有预览返回 `source`、`frames`、`estimated`、`cues`。`cues` 中每项为 `[开始秒数, 结束秒数]`，`interval` 为 0，`columns` 和 `rows` 为 1。Peach 自有缓存继续返回固定间隔和拼图尺寸。

已有预览的 `GET /timeline?id=<资产 ID>&s=<帧号>&source=<来源>` 返回裁切后的 JPEG；自有缓存的 `source` 为 `peach`，`s` 表示拼图编号。前端按索引确定编号含义。有自有缓存时，已有预览的索引还包含 `fallback`；目标时刻未覆盖或图片未取得时先读取自有缓存，再退回九宫格。图片支持 HEAD、ETag 与私有缓存复验。

索引与裁切结果使用应用内有界短时缓存，不写账本，不在磁盘展开全部 BIF 或复制拼图，原索引与图片保持只读。格式取证和依赖选择见[预览格式取证](reference-snapshots/video-preview-formats.md)。
