-- 任务中心落库的说明句带上 code（ADR-0156 第三条）。
--
-- `progress_label` 与 `error` 照旧存中文原文；新写入的行在旁边存语义 code 和 JSON 参数，
-- 前端按界面语言取译文，没有 code 的旧行显示原文。旧行不回填：task_run 只留最近的运行记录。
ALTER TABLE task_run ADD COLUMN progress_code TEXT;
ALTER TABLE task_run ADD COLUMN progress_params TEXT;
ALTER TABLE task_run ADD COLUMN error_code TEXT;
ALTER TABLE task_run ADD COLUMN error_params TEXT;
