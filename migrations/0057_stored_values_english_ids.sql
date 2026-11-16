-- 账本里会被代码读回比对的中文取值改成英文稳定 id（ADR-0162），界面按语言显示。
--
-- 画幅 `asset.ctx_orient`：竖屏 → portrait，横屏 → landscape。
-- 时长档 `asset.ctx_length`：速食 → quick，短 → short，中 → medium，长 → long。
-- 画质档 `asset.ctx_quality`：低画质 → low；4K、2K、1080P、720P 本身就是通用写法，不改。
-- 通用链接名 `entity_link.label`：官方网站、官网、K-MIB 官网 → official-site，博客 → blog；
-- 平台名、公司名这类专名不改。
-- 出演者标记 `asset_tag.tag`：前缀 `演员:` → `performer:`。撤回用的行快照（换版搬迁的
-- `record_rehome`、升级补修回执）里存着原样的标签行，撤回时按原样插回，所以一并改写：JSON 里以
-- `"演员:` 开头的字符串只会是这种标签。
--
-- 每条 UPDATE 只改带旧值的行，重复执行不再改动任何一行。

UPDATE asset SET ctx_orient = CASE ctx_orient WHEN '竖屏' THEN 'portrait' ELSE 'landscape' END
WHERE ctx_orient IN ('竖屏', '横屏');

UPDATE asset SET ctx_length = CASE ctx_length
  WHEN '速食' THEN 'quick' WHEN '短' THEN 'short' WHEN '中' THEN 'medium' ELSE 'long' END
WHERE ctx_length IN ('速食', '短', '中', '长');

UPDATE asset SET ctx_quality = 'low' WHERE ctx_quality = '低画质';

UPDATE entity_link SET label = CASE label WHEN '博客' THEN 'blog' ELSE 'official-site' END
WHERE label IN ('官方网站', '官网', 'K-MIB 官网', '博客');

-- 同一作品上新旧两种写法都在时（UNIQUE(asset_id,tag)），留下新写法那一行，旧行删掉。
UPDATE OR IGNORE asset_tag SET tag = 'performer:' || substr(tag, 4) WHERE tag LIKE '演员:%';
DELETE FROM asset_tag WHERE tag LIKE '演员:%';

UPDATE record_rehome SET snapshot_json = replace(snapshot_json, '"演员:', '"performer:')
WHERE instr(snapshot_json, '"演员:') > 0;
UPDATE record_rehome SET moved_json = replace(moved_json, '"演员:', '"performer:')
WHERE instr(moved_json, '"演员:') > 0;
UPDATE ledger_upgrade_repair SET result_json = replace(result_json, '"演员:', '"performer:')
WHERE instr(result_json, '"演员:') > 0;
UPDATE ledger_upgrade_item SET result_json = replace(result_json, '"演员:', '"performer:')
WHERE instr(result_json, '"演员:') > 0;
