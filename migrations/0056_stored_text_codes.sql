-- 落库只存一句中文的说明字段，旁边加上语义 code 与 JSON 参数（ADR-0159）。
--
-- 原文列照旧存按 zh-CN 渲染的原句；新写入的行在旁边存 code 与参数，界面按当前语言取译文。
-- 旧行不回填：没有 code 的照原文显示。
ALTER TABLE download_task ADD COLUMN failure_detail_code TEXT;
ALTER TABLE download_task ADD COLUMN failure_detail_params TEXT;
ALTER TABLE download_task ADD COLUMN postprocess_detail_code TEXT;
ALTER TABLE download_task ADD COLUMN postprocess_detail_params TEXT;
ALTER TABLE download_submission ADD COLUMN detail_code TEXT;
ALTER TABLE download_submission ADD COLUMN detail_params TEXT;
ALTER TABLE feed_source ADD COLUMN last_error_code TEXT;
ALTER TABLE feed_source ADD COLUMN last_error_params TEXT;
ALTER TABLE follow_source ADD COLUMN last_error_code TEXT;
ALTER TABLE follow_source ADD COLUMN last_error_params TEXT;
