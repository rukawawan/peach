-- 任务历史按根读取及删除时的关联清理共享这些索引。
CREATE INDEX IF NOT EXISTS idx_task_run_root ON task_run(root_run_id, id);
CREATE INDEX IF NOT EXISTS idx_follow_item_asset ON follow_item(asset_id) WHERE asset_id IS NOT NULL;

-- 分别使用两列索引，避免 OR 条件在部分统计分布下退回全表扫描。
DROP TRIGGER task_run_clear_deleted_references;
CREATE TRIGGER task_run_clear_deleted_references
BEFORE DELETE ON task_run
BEGIN
  UPDATE task_run SET parent_run_id=NULL WHERE parent_run_id=OLD.id;
  UPDATE task_run SET root_run_id=NULL WHERE root_run_id=OLD.id;
END;

-- 旧安装遗留的同列非唯一索引由 0000 的 idx_* 完整覆盖。
DROP INDEX IF EXISTS ix_asset_name;
DROP INDEX IF EXISTS ix_asset_loc;
DROP INDEX IF EXISTS ix_asset_size;
DROP INDEX IF EXISTS ix_asset_hash;
