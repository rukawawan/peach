CREATE TABLE asset_content_translation (
    asset_id INTEGER NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    source_digest TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    quality TEXT NOT NULL CHECK (quality IN ('human', 'machine')),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (asset_id, language)
) WITHOUT ROWID;

INSERT INTO ledger_revision(tbl, n) VALUES('asset_content_translation', 0);
CREATE TRIGGER rev_asset_content_translation_insert AFTER INSERT ON asset_content_translation BEGIN
    UPDATE ledger_revision SET n=n+1 WHERE tbl='asset_content_translation';
END;
CREATE TRIGGER rev_asset_content_translation_update AFTER UPDATE ON asset_content_translation BEGIN
    UPDATE ledger_revision SET n=n+1 WHERE tbl='asset_content_translation';
END;
CREATE TRIGGER rev_asset_content_translation_delete AFTER DELETE ON asset_content_translation BEGIN
    UPDATE ledger_revision SET n=n+1 WHERE tbl='asset_content_translation';
END;
