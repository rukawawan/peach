-- 播放心跳不推 asset 的版本号。
--
-- 详情页播放时每十秒一次 `/api/activity`，改的是 play_seconds、leave_ratio、max_reached、
-- seek_count 与 last_played。0038 的 rev_asset_update 不分列，于是每次心跳都推高 asset 版本：
-- 服务端按版本缓存的分组快照、首页与统计整份重算，前端结果版本跟着变，背景网格把已经加载的
-- 每一页重取一遍。这几列是观看进度，不是编目内容，详情页自己画进度，不需要别的页面跟着刷新。
--
-- SQLite 只有 `UPDATE OF <列>` 白名单，没有「除这几列以外」，所以这里列出其余全部列。
-- 以后给 asset 加列要同步改这份触发器，`tests/test_ledger_revision.py` 按 `PRAGMA table_info`
-- 核对覆盖。
--
-- play_count 留在名单里：它只由起播（`/api/play`）写，一次播放一次；「未看」筛选、按播放次数
-- 排序、首页与统计都按版本缓存读它，排除之后看过的片会一直留在「未看」里。起播那条 UPDATE
-- 同时写 last_played，所以「最近播放」的次序也随起播刷新。
DROP TRIGGER rev_asset_update;
CREATE TRIGGER rev_asset_update AFTER UPDATE OF
  id, location, path, name, medium, size, mtime, hash_kind, hash, creator, studio, series, code,
  duration, width, height, vcodec, fps, has_audio, ctx_length, ctx_orient, ctx_quality, ctx_pace,
  ctx_people, play_count, rating, o_count, watch_ratio, source_id, stash_scene_id, snapshot_path,
  first_seen, last_seen, feedback, disposal, feedback_at, release_date, catalog_title,
  original_title, field_owners, mutation_revision, region, disposal_reason
ON asset BEGIN
  UPDATE ledger_revision SET n=n+1 WHERE tbl='asset';
END;
