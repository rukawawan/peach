-- 升级补修每部片一行的状态：补测的完成结果、队列结算与重派时间。
-- 原先整份记在 ledger_upgrade_repair 的回执 JSON 里，每完成一部就在写锁里整份解析重写。
-- rule 是补修规则（如 display:<规则>、library:<规则>），generation 是这一行状态所对应的文件世代。
CREATE TABLE ledger_upgrade_item(
  rule TEXT NOT NULL,
  asset_id INTEGER NOT NULL,
  generation TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL CHECK(state IN ('pending','queued','done','cancelled','deferred','failed')),
  run_id INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  retry_at REAL,
  result_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  PRIMARY KEY(rule, asset_id)
) WITHOUT ROWID;

INSERT INTO ledger_revision(tbl) VALUES('ledger_upgrade_item');
CREATE TRIGGER rev_ledger_upgrade_item_insert AFTER INSERT ON ledger_upgrade_item BEGIN
    UPDATE ledger_revision SET n=n+1 WHERE tbl='ledger_upgrade_item';
END;
CREATE TRIGGER rev_ledger_upgrade_item_update AFTER UPDATE ON ledger_upgrade_item BEGIN
    UPDATE ledger_revision SET n=n+1 WHERE tbl='ledger_upgrade_item';
END;
CREATE TRIGGER rev_ledger_upgrade_item_delete AFTER DELETE ON ledger_upgrade_item BEGIN
    UPDATE ledger_revision SET n=n+1 WHERE tbl='ledger_upgrade_item';
END;
