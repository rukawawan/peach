-- 后处理的重试计数独立于网盘进度查询；下一次领取时间沿用 next_check_at。
ALTER TABLE download_task ADD COLUMN postprocess_retries INTEGER NOT NULL DEFAULT 0;
