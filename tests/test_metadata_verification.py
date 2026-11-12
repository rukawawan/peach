"""核查差异按确定判据结算（ADR-0139）：保留现值、并集补标签、官方一致覆盖与撤回、交人。

样例取自 2026-11-04 复核页快照里的真实行，每条规则一类正例，外加「看起来像但必须交人」
的反例。
"""
import contextlib
import csv
import importlib.util
import io
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from peach import ledger_backups, web_auto_landings
from peach import metadata_auto_apply as rm_auto
from peach import web_contract as rm_web
from peach import web_review as rm_review
from peach.entities import upsert_asset_entity
from peach.field_owners import USER_MANUAL, auto_owner, owner_of, write_owned_fields

from support.ledger import fresh_ledger

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ["item_key", "code", "query", "asset_id", "asset_path", "field", "field_label",
          "current_value", "candidates_json", "source_count", "source_profile", "status",
          "size_gb", "videos", "fetched_at"]
COLUMNS = {"title": "catalog_title", "release_date": "release_date", "studio": "studio",
           "series": "series"}


def _revert_script():
    spec = importlib.util.spec_from_file_location(
        "revert_auto_landing_verification", ROOT / "scripts" / "revert_auto_landing.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class VerificationSettlementTests(unittest.TestCase):
    def setUp(self):
        holder = tempfile.TemporaryDirectory()
        self.addCleanup(holder.cleanup)
        root = Path(holder.name)
        self.candidates = root / "generated"
        self.candidates.mkdir()
        self.db_path = fresh_ledger(root)
        self.contract = rm_web.WebContract(
            Path(self.db_path), candidate_root=self.candidates, logo_root=root / "logos",
            avatar_root=root / "avatars")
        self.rows = []
        self.next_id = 100

    # ---- 夹具 ----

    def asset(self, code, *, owner=None, tags=(), **values):
        """一部文件名带番号的片；`values` 按复核字段名给现值，`owner` 是这些字段的归属。"""
        asset_id = self.next_id
        self.next_id += 1
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection, connection:
            connection.execute("INSERT INTO asset(id,location,path,name,medium,code) "
                               "VALUES(?,'local',?,?,'video',?)",
                               (asset_id, f"/x/{code}.mp4", f"{code}.mp4", code))
            columns = {COLUMNS[field]: value for field, value in values.items()}
            if columns and owner:
                write_owned_fields(connection, [asset_id], columns, owner)
            elif columns:
                connection.execute(
                    f"UPDATE asset SET {','.join(f'{name}=?' for name in columns)} WHERE id=?",
                    (*columns.values(), asset_id))
            for tag in tags:
                upsert_asset_entity(connection, kind="tag", name=tag, asset_id=asset_id, role="tag",
                                    source="javinizer:dmm:tag", confidence=0.75, now="now")
                connection.execute("INSERT INTO asset_tag(asset_id,tag,confidence,source) "
                                   "VALUES(?,?,0.75,'javinizer:dmm:tag')", (asset_id, tag))
        return asset_id

    def row(self, code, field, current, *candidates, pinned=None):
        """一行核查候选。`candidates` 是 `(来源, 取值)`，第三项给 False 表示不带核查标记；
        `pinned` 给 `(资产编号, 路径)` 就是处理任务按文件出的那种行。"""
        key = f"asset:{pinned[0]}:{field}" if pinned else f"{code}:{field}"
        built = []
        for index, (source, value, *flag) in enumerate(candidates):
            shown = ("、".join(item["name"] if isinstance(item, dict) else item for item in value)
                     if isinstance(value, list) else value)
            built.append({
                "candidate_key": f"{key}:{index}", "source": source, "value": value,
                "display_value": shown, "confidence": 0.75, "provider_id": code,
                "source_url": "", "raw_snapshot": "",
                **({"javdb_rule": 2, "source_id": "FixtureWork"} if source == "javdb" else {}),
                **({"requires_review": True} if not flag or flag[0] else {})})
        self.rows.append({"item_key": key, "code": code, "query": code, "field": field,
                          **({"asset_id": str(pinned[0]), "asset_path": pinned[1]} if pinned else {}),
                          "field_label": field, "current_value": current,
                          "candidates_json": json.dumps(built, ensure_ascii=False),
                          "source_count": str(len(built)), "source_profile": "library",
                          "status": "candidate", "size_gb": "", "videos": "1", "fetched_at": ""})
        with (self.candidates / "library-metadata-field-candidates.csv").open(
                "w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(self.rows)
        return key

    def queue(self):
        rows, _source, _skipped = rm_review._review_rows(self.contract, "metadata_fields")
        return [row["item_key"] for row in rows]

    def settle(self):
        return rm_auto.auto_apply_metadata(self.contract.database, self.candidates)

    def outcome(self, key):
        row = next(dict(row) for row in self.rows if row["item_key"] == key)
        row["candidates"] = rm_auto._row_candidates(row, {})
        with self.contract.read_connection() as connection:
            rm_auto.refresh_current_values(connection, [row])
            return rm_auto.verification_outcome(connection, row)

    def value(self, asset_id, field):
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection:
            column = COLUMNS[field]
            value, owners = connection.execute(
                f"SELECT {column},field_owners FROM asset WHERE id=?", (asset_id,)).fetchone()
            return value, owner_of(owners, column)

    def tags(self, asset_id):
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection:
            return {row[0] for row in connection.execute(
                "SELECT e.canonical_name FROM asset_entity ae JOIN entity e ON e.id=ae.entity_id"
                " WHERE ae.asset_id=? AND ae.role='tag'", (asset_id,))}

    def decisions(self):
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection:
            return {key: json.loads(note) for key, note in connection.execute(
                "SELECT item_key,note FROM review_decision WHERE category='metadata_fields'")}

    def assertKept(self, key, rule, asset_id, field, current):
        self.assertEqual(self.outcome(key).rule, rule)
        self.assertNotIn(key, self.queue())
        self.settle()
        self.assertEqual(self.value(asset_id, field)[0], current)
        self.assertNotIn(key, self.decisions())

    # ---- 保留现值：不入队、不写 ----

    def test_title_that_only_differs_in_width_or_is_shorter_keeps_the_current_value(self):
        current = ("「いますぐ精子たくさん飲ませて…」フェラテクィーン夢実かなえのごっくんしまくり逆ナンパ"
                   " チ○ポ5本×ホンモノザーメン11射精ぜ〜んぶごっくん大満足！！")
        asset_id = self.asset("MEYD-911", owner=auto_owner("r18dev"), title=current)
        key = self.row("MEYD-911", "title", current,
                       ("r18dev", current, False),
                       ("javdb", current.replace("〜", "～").replace("！！", "!!")),
                       ("makers", "「いますぐ精子たくさん飲ませて…」フェラテクィーン夢実かなえの"
                                  "ごっくんしまくり逆ナンパ"))
        self.assertKept(key, "adr-0139-no-new-information", asset_id, "title", current)

    def test_official_masked_title_does_not_replace_the_original_wording(self):
        current = "身動き出来ない私は何度も凌辱されー、早漏メイドに改造された 七沢みあ"
        asset_id = self.asset("MIDE-633", title=current)
        key = self.row("MIDE-633", "title", current,
                       ("makers", "身動き出来ない私は何度も凌●されー、早漏メイドに改造された"))
        self.assertKept(key, "adr-0139-no-new-information", asset_id, "title", current)

    def test_store_decoration_on_the_candidate_keeps_the_current_title(self):
        current = "女優のたまご。ハロウィン前…クンニで切ないアヘ顔に膣中大量射精"
        asset_id = self.asset("FC2-PPV-3977699", title=current)
        key = self.row("FC2-PPV-3977699", "title", current,
                       ("fc2", "【限定顔出し15000→5000】" + current))
        self.assertKept(key, "adr-0139-no-new-information", asset_id, "title", current)

    def test_community_only_dissent_keeps_the_current_value(self):
        asset_id = self.asset("STH-123", release_date="2025-10-24")
        key = self.row("STH-123", "release_date", "2025-10-24", ("javdb", "2025-10-16"))
        self.assertKept(key, "adr-0139-community-dissent", asset_id, "release_date", "2025-10-24")

    def test_official_source_backing_the_current_value_outweighs_another_official(self):
        asset_id = self.asset("HUNTC-592", release_date="2026-10-13")
        key = self.row("HUNTC-592", "release_date", "2026-10-13",
                       ("dmm", "2026-10-13", False), ("r18dev", "2026-10-09"), ("avbase", "2026-10-09"))
        self.assertKept(key, "adr-0139-official-backs-current", asset_id, "release_date", "2026-10-13")

    def test_value_written_by_a_higher_ranked_official_source_stays(self):
        asset_id = self.asset("ROYD-083", owner=auto_owner("makers"), studio="HHH")
        key = self.row("ROYD-083", "studio", "HHH",
                       ("dmm", "ロイヤル", False), ("r18dev", "Royal"), ("javdb", "ROYAL"))
        self.assertKept(key, "adr-0139-chain-keeps-current", asset_id, "studio", "HHH")

    def test_r18dev_english_studio_name_is_a_translation_not_a_dissent(self):
        asset_id = self.asset("SIMM-876", owner=auto_owner("dmm"), studio="しろうとまんまん")
        key = self.row("SIMM-876", "studio", "しろうとまんまん",
                       ("r18dev", "Amateur Pussies"), ("javbus", "DOC"), ("javdb", "DOC"))
        self.assertKept(key, "adr-0139-community-dissent", asset_id, "studio", "しろうとまんまん")

    def test_studio_with_a_reading_or_parent_note_adds_nothing(self):
        asset_id = self.asset("EBOD-531", owner=auto_owner("r18dev"), studio="E-BODY")
        key = self.row("EBOD-531", "studio", "E-BODY", ("makers", "E-BODY（イーボディ）"))
        self.assertKept(key, "adr-0139-no-new-information", asset_id, "studio", "E-BODY")

    def test_user_owned_value_is_never_challenged(self):
        asset_id = self.asset("ACC-006", owner=USER_MANUAL, release_date="2016-05-29")
        key = self.row("ACC-006", "release_date", "2016-05-29", ("r18dev", "2009-01-08"))
        self.assertKept(key, "adr-0139-user-owned", asset_id, "release_date", "2016-05-29")

    def test_tag_candidates_that_are_a_subset_keep_the_current_tags(self):
        asset_id = self.asset("DASS-468", tags=("中出内射", "巨乳", "母子设定", "痴女"))
        key = self.row("DASS-468", "tags", "中出内射、巨乳、母子设定、痴女",
                       ("javdb", ["痴女", "巨乳", "中出内射"]))
        self.assertEqual(self.outcome(key).rule, "adr-0139-no-new-information")
        self.assertNotIn(key, self.queue())
        self.settle()
        self.assertEqual(self.tags(asset_id), {"中出内射", "巨乳", "母子设定", "痴女"})
        self.assertEqual(self.decisions(), {})

    def test_row_pinned_to_an_id_now_holding_another_code_is_kept(self):
        """按文件出的行，那个编号已经是别的片：谁批准都写不进去，不摆给人，也不写。"""
        asset_id = self.asset("ABP-602", release_date="2017-08-01")
        key = self.row("ABP-601", "release_date", "2017-08-01", ("makers", "2017-08-05"),
                       pinned=(asset_id, r"B:\云下载\ABP-601A-C.mp4"))
        self.asset("ABP-601", release_date="2017-08-01")
        self.assertKept(key, "adr-0139-asset-gone", asset_id, "release_date", "2017-08-01")

    def test_row_pinned_to_a_relocated_file_still_lands_on_the_same_asset(self):
        """扫描按番号改指挪过的文件，编号不变（ADR-0131）；候选件里的旧路径不挡落库。"""
        asset_id = self.asset("ABP-601", release_date="2017-08-01")
        key = self.row("ABP-601", "release_date", "2017-08-01", ("makers", "2017-08-05"),
                       pinned=(asset_id, r"B:\云下载\ABP-601A-C.mp4"))
        self.assertNotIn(key, self.queue())
        self.settle()
        self.assertEqual(self.value(asset_id, "release_date"), ("2017-08-05", "auto:makers"))

    def test_human_approved_tags_grow_and_keep_the_human_record(self):
        asset_id = self.asset("ROYD-083", tags=("中出内射", "辣妹"))
        key = self.row("ROYD-083", "tags", "中出内射、辣妹",
                       ("makers", ["中出内射", "辣妹", "痴女"]))
        human = {"candidate_key": "earlier", "source": "dmm", "user_note": "批量复核"}
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection, connection:
            connection.execute("INSERT INTO review_decision(category,item_key,status,note,updated_at)"
                               " VALUES('metadata_fields',?,'approved',?,'2026-10-01')",
                               (key, json.dumps(human, ensure_ascii=False)))
        self.settle()
        self.assertEqual(self.tags(asset_id), {"中出内射", "辣妹", "痴女"})
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection:
            status, note, updated = connection.execute(
                "SELECT status,note,updated_at FROM review_decision WHERE item_key=?", (key,)).fetchone()
        note = json.loads(note)
        self.assertEqual((status, updated), ("approved", "2026-10-01"))
        self.assertEqual({name: note[name] for name in human}, human)
        self.assertEqual(note["added_tags"], ["痴女"])
        self.assertNotIn(key, self.queue())

    # ---- 可撤写入 ----

    def test_tag_union_adds_only_missing_tags_and_reverts_by_rule(self):
        asset_id = self.asset("ROYD-083", tags=("中出内射", "御姐", "辣妹"))
        key = self.row("ROYD-083", "tags", "中出内射、御姐、辣妹",
                       ("dmm", ["辣妹", "痴女", "中出内射", "姐弟"], False),
                       ("makers", ["中出内射", "姐弟", "辣妹", "痴女"]),
                       ("r18dev", ["辣妹", "痴女", "姐弟", "中出内射"]))
        self.assertEqual(self.outcome(key).kind, rm_auto.VERIFY_UNION)
        self.assertNotIn(key, self.queue())
        self.assertEqual(self.settle()["applied"], 1)
        self.assertEqual(self.tags(asset_id), {"中出内射", "御姐", "辣妹", "痴女", "姐弟"})
        note = self.decisions()[key]
        self.assertEqual(note["rule"], rm_auto.VERIFIED_UNION_RULE)
        self.assertEqual(set(note["added_tags"]), {"痴女", "姐弟"})
        self.assertEqual(self.settle()["applied"], 0)
        self.assertNotIn(key, self.queue())

        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            _revert_script().main(["--db", str(self.db_path), "--source", rm_auto.VERIFIED_UNION_RULE,
                                   "--apply", "--backup", str(Path(self.db_path).with_suffix(".bak"))])
        self.assertEqual(self.tags(asset_id), {"中出内射", "御姐", "辣妹"})
        self.assertEqual(self.decisions(), {})

    def test_official_date_replaces_an_unowned_value_and_reverts_to_it(self):
        asset_id = self.asset("DASS-468", release_date="2024-09-06")
        key = self.row("DASS-468", "release_date", "2024-09-06",
                       ("javdb", "2024-09-10"), ("makers", "2024-09-10"))
        self.assertNotIn(key, self.queue())
        self.assertEqual(self.settle()["applied"], 1)
        self.assertEqual(self.value(asset_id, "release_date"), ("2024-09-10", "auto:makers"))
        note = self.decisions()[key]
        self.assertEqual(note["rule"], rm_auto.VERIFIED_REPLACE_RULE)
        self.assertEqual(note["previous"], [{"asset_id": asset_id, "value": "2024-09-06", "owner": ""}])
        self.assertNotIn(key, self.queue())

        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            _revert_script().main(["--db", str(self.db_path), "--source", rm_auto.VERIFIED_REPLACE_RULE,
                                   "--apply", "--backup", str(Path(self.db_path).with_suffix(".bak"))])
        self.assertEqual(self.value(asset_id, "release_date"), ("2024-09-06", ""))
        self.assertEqual(self.decisions(), {})

    def test_official_unmasked_title_replaces_a_masked_auto_value(self):
        current = "身動き出来ない私は何度も凌●されー、早漏メイドに改造された 七沢みあ"
        asset_id = self.asset("MIDE-633", owner=auto_owner("javdb"), title=current)
        self.row("MIDE-633", "title", current,
                 ("makers", "身動き出来ない私は何度も凌辱されー、早漏メイドに改造された"))
        self.settle()
        self.assertEqual(self.value(asset_id, "title"),
                         ("身動き出来ない私は何度も凌辱されー、早漏メイドに改造された", "auto:makers"))

    def test_revert_leaves_a_value_someone_changed_afterwards(self):
        asset_id = self.asset("DASS-468", release_date="2024-09-06")
        self.row("DASS-468", "release_date", "2024-09-06", ("makers", "2024-09-10"))
        self.settle()
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection, connection:
            write_owned_fields(connection, [asset_id], {"release_date": "2024-09-11"}, USER_MANUAL)
        with self.contract.read_connection() as connection:
            plan = rm_auto.planned_verified_revert(connection, rm_auto.VERIFIED_REPLACE_RULE)
        self.assertEqual([entry["changed"] for entry in plan], [[asset_id]])
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection, connection:
            rm_auto.revert_verified(connection, plan)
        self.assertEqual(self.value(asset_id, "release_date"), ("2024-09-11", USER_MANUAL))

    # ---- 复核页撤回（ADR-0141） ----

    def auto_landings(self, **args):
        return rm_web.dispatch_api_get(self.contract, "/api/review/auto-landings", args)

    def revert(self, items, token):
        return rm_web.dispatch_api_post(self.contract, "/api/review/auto-landings/revert",
                                        {"items": items, "token": token})

    def test_review_page_lists_each_write_by_work_and_reverts_the_chosen_ones(self):
        replaced = self.asset("DASS-468", release_date="2024-09-06")
        edited = self.asset("DASS-469", release_date="2024-09-07")
        tagged = self.asset("ROYD-083", tags=("中出内射",))
        first = self.row("DASS-468", "release_date", "2024-09-06", ("makers", "2024-09-10"))
        second = self.row("DASS-469", "release_date", "2024-09-07", ("makers", "2024-09-12"))
        union = self.row("ROYD-083", "tags", "中出内射", ("makers", ["中出内射", "痴女"]))
        self.settle()
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection, connection:
            write_owned_fields(connection, [edited], {"release_date": "2024-09-13"}, USER_MANUAL)

        listed = {item["item_key"]: item for item in self.auto_landings()["items"]}
        self.assertEqual(set(listed), {first, second, union})
        self.assertEqual({key: (item["asset_id"], item["code"], item["field"], item["value"], item["previous"])
                          for key, item in listed.items() if key != union},
                         {first: (replaced, "DASS-468", "发行日期", "2024-09-10", ["2024-09-06"]),
                          second: (edited, "DASS-469", "发行日期", "2024-09-12", ["2024-09-07"])})
        self.assertEqual((listed[union]["asset_id"], listed[union]["tags"]), (tagged, ["痴女"]))
        # 一次结算一个运行时刻：覆盖与并集的批次号带同一个时刻。
        self.assertEqual(len({item["batch"].rpartition("@")[2] for item in listed.values()}), 1)
        self.assertIsNotNone(listed[first]["at"])

        preview = self.auto_landings(items="\n".join([first, second]))
        self.assertEqual([(row["asset_id"], row["code"], row["current"], row["previous"])
                          for row in preview["restores"]], [(replaced, "DASS-468", "2024-09-10", "2024-09-06")])
        self.assertEqual([row["asset_id"] for row in preview["changed"]], [edited])
        self.assertEqual((preview["decisions"], preview["tags"]), (2, []))

        with self.assertRaisesRegex(ValueError, "重新预览"):
            self.revert([first, second], "stale")
        self.assertEqual(self.value(replaced, "release_date"), ("2024-09-10", "auto:makers"))

        result = self.revert([first, second], preview["token"])
        self.assertEqual((result["restored"], result["decisions"]), (1, 2))
        self.assertEqual([row["asset_id"] for row in result["changed"]], [edited])
        self.assertEqual(self.value(replaced, "release_date"), ("2024-09-06", ""))
        self.assertEqual(self.value(edited, "release_date"), ("2024-09-13", USER_MANUAL))
        self.assertIn("痴女", self.tags(tagged))
        backup = Path(self.db_path).with_name(result["backup"])
        self.assertTrue(backup.is_file())
        self.assertEqual(ledger_backups.describe(backup, "database")["purpose"], "撤回自动写入前")
        self.assertEqual([item["item_key"] for item in self.auto_landings()["items"]], [union])

    def test_review_page_reverts_union_tags_like_the_script(self):
        tagged = self.asset("ROYD-083", tags=("中出内射",))
        key = self.row("ROYD-083", "tags", "中出内射", ("makers", ["中出内射", "痴女"]))
        self.settle()
        preview = self.auto_landings(items=key)
        self.assertEqual([(row["code"], row["tag"]) for row in preview["tags"]], [("ROYD-083", "痴女")])
        result = self.revert([key], preview["token"])
        self.assertEqual((result["removed_tags"], result["decisions"]), (1, 1))
        self.assertEqual(self.tags(tagged), {"中出内射"})
        self.assertEqual(self.decisions(), {})

    def test_review_page_refuses_writes_it_does_not_list(self):
        for items in ([], ["ROYD-083:tags"]):
            with self.subTest(items=items), self.assertRaises(ValueError):
                self.revert(items, "")

    def test_batch_time_reads_both_stamp_formats(self):
        self.assertEqual(web_auto_landings.batch_time(f"{rm_auto.VERIFIED_REPLACE_RULE}@2026-11-04T06:10:56Z"),
                         1793772656.0)
        self.assertIsNotNone(web_auto_landings.batch_time(f"{rm_auto.UNION_TAGS_SOURCE}@20261104T141053"))
        self.assertIsNone(web_auto_landings.batch_time("adr-0139-official-replaces-verified@now"))

    # ---- 看起来像但必须交人 ----

    def assertForHuman(self, key, rule):
        self.assertEqual(self.outcome(key).rule, rule)
        self.assertIn(key, self.queue())
        self.settle()
        self.assertIn(key, self.queue())
        self.assertNotIn(key, self.decisions())

    def test_three_sources_naming_three_different_performers_go_to_a_human(self):
        self.asset("ACC-006")
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection, connection:
            upsert_asset_entity(connection, kind="performer", name="永沢咲良", asset_id=100,
                                role="performer", source="javinizer:dmm:performer", now="now")
        key = self.row("ACC-006", "performers", "永沢咲良",
                       ("javdb", [{"name": "有栖七菜"}]), ("r18dev", [{"name": "三浦沙綾"}]))
        self.assertForHuman(key, "adr-0139-official-performers")

    def test_maker_and_label_mixed_in_the_studio_field_go_to_a_human(self):
        self.asset("HOISW-002", owner=auto_owner("r18dev"), studio="素人ホイホイsweet！")
        key = self.row("HOISW-002", "studio", "素人ホイホイsweet！",
                       ("javdb", "素人ホイホイsweet！/妄想族"), ("r18dev", "Fresh Gordon/Daydream Tribe"),
                       ("dmm", "フレッシュ・ゴードン/妄想族"), ("avbase", "フレッシュ・ゴードン/妄想族"),
                       ("javbus", "素人ホイホイsweet！/妄想族"))
        self.assertForHuman(key, "adr-0139-official-entity")

    def test_official_sources_naming_different_dates_go_to_a_human(self):
        self.asset("SSIS-776", release_date="2023-01-20")
        key = self.row("SSIS-776", "release_date", "2023-01-20",
                       ("dmm", "2023-01-24"), ("r18dev", "2023-01-27"))
        self.assertForHuman(key, "adr-0139-official-disagree")

    def test_a_local_nfo_disagreeing_with_the_ledger_goes_to_a_human(self):
        self.asset("FSDSS-275", title="腰が砕けても逃がさない！")
        key = self.row("FSDSS-275", "title", "腰が砕けても逃がさない！",
                       ("local_nfo", "ひたすら膣奥を貫く強制立ちバックハンドル"))
        self.assertForHuman(key, "adr-0139-nfo-dissent")

    def test_official_masked_studio_in_unknown_series_still_needs_a_human(self):
        self.asset("CAWD-241", owner=auto_owner("r18dev"), series="社内研修相部屋NTR")
        key = self.row("CAWD-241", "series", "社内研修相部屋NTR",
                       ("makers", "童貞陰キャ男とプライド高い絶倫彼女"))
        self.assertForHuman(key, "adr-0139-official-entity")


class CodeMatchingScanTests(unittest.TestCase):
    """整队列查番号走整表单遍，收下哪些行、先后顺序都与逐段 SQL 相同。"""

    def setUp(self):
        holder = tempfile.TemporaryDirectory()
        self.addCleanup(holder.cleanup)
        self.db_path = fresh_ledger(Path(holder.name))
        self.next_id = 100

    def assets(self, *codes, medium="video", disposal=None):
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection, connection:
            for code in codes:
                connection.execute(
                    "INSERT INTO asset(id,location,path,name,medium,code,disposal) "
                    "VALUES(?,'local',?,?,?,?,?)",
                    (self.next_id, f"/x/{self.next_id}.mp4", f"{self.next_id}.mp4", medium, code,
                     disposal))
                self.next_id += 1

    def both_paths(self, codes, columns="id,code"):
        with contextlib.closing(sqlite3.connect(self.db_path)) as connection:
            connection.row_factory = sqlite3.Row
            scan = [tuple(row) for row in rm_auto._codes_matching(connection, codes, columns)]
            original = rm_auto._BULK_CODE_KEYS
            rm_auto._BULK_CODE_KEYS = 10 ** 9
            try:
                sql = [tuple(row) for row in rm_auto._codes_matching(connection, codes, columns)]
            finally:
                rm_auto._BULK_CODE_KEYS = original
        return scan, sql

    def test_scan_matches_chunked_sql_across_chunks_and_code_spellings(self):
        # 同号异写、Tokyo-Hot 账本写法、日期式番号里 `_` 在 LIKE 里是通配符、首尾空格、
        # 只靠精确写法命中（`ABC-1` 归一化成 `ABC-001`，宽查找不到它）、全角写法，以及
        # 回收站与非视频的同号资产。填充番号把宽查键撑过两段。
        self.assets("SSIS-308", "ssis308", "SSIS308", "TOKYO-HOT-N0762", "092415_001",
                    "092415-001", " SSIS-401 ", "ABC-1", "ｓｓｉｓ-500", "FC2PPV1234567",
                    "FC2-PPV-1234567", None, "")
        self.assets("SSIS-308", disposal="trash")
        self.assets("SSIS-308", medium="image")
        filler = [f"FILL-{index:03d}" for index in range(1, 260)]
        self.assets(*filler[::7])
        codes = ["SSIS-308", "n0762", "092415_001", "SSIS-401", "ABC-1", "SSIS-500",
                 "FC2-PPV-1234567", "", "  ", *filler]
        self.assertGreater(len(filler), rm_auto._LIKE_CHUNK)

        scan, sql = self.both_paths(codes)

        self.assertEqual(scan, sql)
        found = [code for _asset_id, code in scan]
        self.assertIn("TOKYO-HOT-N0762", found)
        self.assertIn("ABC-1", found)
        self.assertNotIn("092415-001", found)
        self.assertEqual(found.count("SSIS-308"), 1)
        self.assertIn("FILL-253", found)

    def test_scan_matches_sql_with_extra_columns(self):
        self.assets("SSIS-308", "SSNI-001", "IPX-100")
        codes = ["SSIS-308", "ssni001", *[f"MISS-{index:03d}" for index in range(30)]]

        scan, sql = self.both_paths(codes, "id,code,name,path,field_owners")

        self.assertEqual(scan, sql)
        self.assertEqual([row[1] for row in scan], ["SSIS-308", "SSNI-001"])


if __name__ == "__main__":
    unittest.main()
