"""下载后处理在独立账本和临时媒体上的失败与重试。"""
import os
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from peach import download_postprocess as post
from peach import ledger_backups
from peach.downloads import DownloadStore, DownloadTask, INGESTED, POSTPROCESS_PENDING
from peach.ingest_notices import IngestNotices
from peach.jobs import JobDeferred
from peach.repository import LedgerDatabase
from support.ledger import fresh_ledger


class DownloadPostprocessTests(unittest.TestCase):
    def test_isolated_ads_record_the_junk_reason(self):
        with self.database.write_transaction() as connection:
            connection.execute("UPDATE asset SET medium='other',name='推广.url',path=? WHERE id=?",
                               (str(self.root / '推广.url'), self.asset_id))
        self.assertEqual(post._isolate_ads(self.contract, -1, [self.asset_id]), 1)
        with self.database.read_connection() as connection:
            self.assertEqual(tuple(connection.execute("SELECT disposal,disposal_reason FROM asset WHERE id=?",
                                                      (self.asset_id,)).fetchone()), ("trash", "junk"))

    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.database = LedgerDatabase(fresh_ledger(self.root))
        self.source = self.root / 'incoming' / 'ABC-123.mp4'
        self.target = self.root / 'organized' / self.source.name
        self.source.parent.mkdir()
        self.source.write_bytes(b'main video')
        with self.database.write_transaction() as connection:
            self.asset_id = connection.execute(
                'INSERT INTO asset(location,path,name,medium,size,code) VALUES(?,?,?,?,?,?)',
                ('115', str(self.source), self.source.name, 'video', 10, 'ABC-123')).lastrowid
        self.store = DownloadStore(self.database)
        self.task = self.store.save(DownloadTask(
            id=0, info_hash='a' * 40, provider='115', source_uri='', display_name='ABC-123',
            target='/115/incoming', state=INGESTED, code='ABC-123',
            ledger_path=str(self.source.parent), asset_id=self.asset_id,
            postprocess_state=POSTPROCESS_PENDING))
        self.contract = SimpleNamespace(
            database=self.database, db_path=self.database.db_path,
            candidate_root=self.root / 'generated',
            download_organize_templates=lambda: {'115': {'file': '{code}'}}, cache_bust=lambda: None)
        self.handle = SimpleNamespace(progress=lambda **_: None)
        plan = {'rows': [{'asset_id': self.asset_id, 'action': 'move',
                         'current_path': str(self.source), 'target_path': str(self.target)}], 'reasons': {}}
        self.plan = patch.object(post.organize, 'build_plan', return_value=plan)
        self.plan.start()
        self.addCleanup(self.plan.stop)
        self.collect_source = post._collect
        collect = patch.object(post, '_collect', return_value={'candidates': 0})
        collect.start()
        self.addCleanup(collect.stop)
        probe = patch.object(post, '_probe_folder', return_value=0)
        probe.start()
        self.addCleanup(probe.stop)

    def run_task(self):
        return post.run(self.contract, post.followup_key(self.task.id), self.handle)

    def test_existing_unrelated_foreign_key_violation_is_reported_without_failing_the_move(self):
        with self.database.write_transaction() as connection:
            connection.execute("INSERT INTO media_binding(asset_id,backend,external_id) VALUES(99999,'test','x')")
        result = self.run_task()
        self.assertEqual((result['moved'], result['existing_foreign_keys']), (1, 1))
        self.assertEqual(self.store.get(self.task.id).postprocess_state, 'complete')
        self.assertTrue(self.target.exists())

    def test_organize_backup_lands_in_the_organize_folder_and_old_ones_are_pruned(self):
        folder = ledger_backups.organize_dir(self.contract.candidate_root)
        folder.mkdir(parents=True)
        old = []
        for index in range(ledger_backups.ORGANIZE_KEEP_RECENT + 2):
            path = folder / f'ledger.pre-download-{index}-20260801-000000.db'
            path.write_bytes(b'backup')
            moment = time.time() - 30 * 86400 + index
            os.utime(path, (moment, moment))
            old.append(path)
        result = post._organize(self.contract, self.task, self.asset_id)
        backup = Path(result['backup'])
        self.assertEqual(backup.parent, folder)
        self.assertEqual(ledger_backups.list_backups(folder, ledger_backups.ORGANIZE_PATTERN),
                         [*old[3:], backup])

    def test_retry_uses_the_bound_asset_after_a_move(self):
        post._organize(self.contract, self.task, self.asset_id)
        main, path, _ = post._bind_main(self.contract, self.store.get(self.task.id))
        self.assertEqual((main, path), (self.asset_id, str(self.target)))

    def test_cloud_library_channel_binds_assets_by_media_source(self):
        self.task.provider = 'clouddrive:guangya:test-library'
        with self.database.write_transaction() as connection:
            connection.execute("UPDATE asset SET location='guangya' WHERE id=?", (self.asset_id,))
        main, path, ids = post._bind_main(self.contract, self.task)
        self.assertEqual((main, path, ids), (self.asset_id, str(self.source), [self.asset_id]))
        self.assertEqual(self.task.payload()['provider_label'], '光鸭云盘')

    def test_occupied_target_is_a_retryable_failure(self):
        self.target.parent.mkdir()
        self.target.write_bytes(b'existing file')
        with self.assertRaisesRegex(RuntimeError, '整理'):
            self.run_task()
        self.assertEqual(self.store.get(self.task.id).postprocess_state, 'failed')
        self.assertTrue(self.source.exists())
        self.assertEqual(self.target.read_bytes(), b'existing file')

    def test_new_foreign_key_violation_is_rejected(self):
        original = post.organize.apply_plan
        def corrupt(connection, rows, **options):
            result = original(connection, rows, **options)
            connection.execute("INSERT INTO media_binding(asset_id,backend,external_id) VALUES(99999,'test','x')")
            connection.commit()
            return result
        with patch.object(post.organize, 'apply_plan', side_effect=corrupt), \
                self.assertRaisesRegex(RuntimeError, '校验'):
            self.run_task()
        self.assertEqual(self.store.get(self.task.id).postprocess_state, 'failed')

    def test_a_collision_found_in_the_plan_is_a_failure(self):
        with patch.object(post.organize, 'build_plan', return_value={
                'rows': [{'action': 'skip', 'reason': post.organize.SKIP_TARGET_EXISTS}],
                'reasons': {post.organize.SKIP_TARGET_EXISTS: 1}}), \
                self.assertRaisesRegex(RuntimeError, '整理'):
            self.run_task()
        self.assertTrue(self.source.exists())

    def test_followups_are_declared_only_after_successful_organization(self):
        events = []
        self.handle.run_id = 123
        self.contract.task_runs = Mock()
        rows = [{'task_key': 'avatar', 'followup_key': 'asset:1'}]
        self.contract.task_runs.enqueue_followups.side_effect = lambda *_: events.append('followup')
        original = post._organize
        def organize(*args):
            events.append('organize')
            return original(*args)
        notices = IngestNotices()
        with patch.object(post, '_isolate_ads', side_effect=lambda *_: events.append('check') or 0), \
                patch.object(post, '_probe_folder', side_effect=lambda *_, **options: events.append('probe') or 1), \
                patch.object(post, '_collect', side_effect=lambda *_: events.append('collect') or {'followups': rows}), \
                patch.object(post, '_organize', side_effect=organize), \
                patch.object(post, 'declared_rows', return_value=rows), patch.object(post, 'NOTICES', notices):
            result = self.run_task()
            self.assertEqual(self.run_task(), {'task_id': self.task.id, 'already_complete': True})
        self.assertEqual(events, ['check', 'probe', 'check', 'collect', 'check', 'organize', 'followup'])
        self.assertEqual(result['probed'], 1)
        self.contract.task_runs.enqueue_followups.assert_called_once()
        # 整理完成记一条入库通知，页面据此弹 toast；已完成的再跑一次不重复记。
        [notice] = notices.snapshot()['items']
        self.assertEqual((notice['kind'], notice['asset_id']), ('download', result['asset_id']))

    def test_collection_that_steps_aside_stays_queued_instead_of_failed(self):
        self.handle.run_id = 123
        self.contract.task_runs = Mock()
        with patch.object(post, '_collect', side_effect=JobDeferred('等待扫描与采集完成后继续')):
            with self.assertRaises(JobDeferred):
                self.run_task()
        task = self.store.get(self.task.id)
        self.assertEqual((task.postprocess_state, task.postprocess_detail), ('queued', '等待扫描与采集完成后继续'))
        self.contract.task_runs.enqueue_followups.assert_not_called()

    def test_collection_held_only_by_paused_sources_still_organizes_the_file(self):
        """MIAB-086：其余资料已落库，只差一站拒绝访问；文件照常整理，详情写明哪项等来源恢复。"""
        held = {'status': 'failed', 'error': '1 项都卡在来源限流上，等一会儿再跑一次。',
                'issue_count': 1, 'paused_count': 1,
                'issue_preview': [{'message': 'JavDB 标签未取得：来源拒绝访问'}]}
        # 账本就在临时根下，配置的各目录都指回它。
        config = SimpleNamespace(configured=True, directory=lambda name: self.root)
        self.contract.cover_root = self.root / 'covers'
        with patch.object(post.settings_file, 'active', return_value=config), \
                patch.object(post, 'process_library', return_value=held):
            state = self.collect_source(self.contract, self.asset_id, self.handle)
        self.assertEqual(state['paused_pending'], ['JavDB 标签未取得：来源拒绝访问'])
        with patch.object(post, '_collect', return_value=state):
            result = self.run_task()
        self.assertEqual(result['moved'], 1)
        task = self.store.get(self.task.id)
        self.assertEqual(task.postprocess_state, 'complete')
        self.assertIn('JavDB 标签未取得：来源拒绝访问', task.postprocess_detail)
        # 混有来源限流以外的问题时照旧失败，等人处理。
        with patch.object(post.settings_file, 'active', return_value=config), \
                patch.object(post, 'process_library', return_value={**held, 'issue_count': 2}):
            with self.assertRaisesRegex(RuntimeError, '来源限流'):
                self.collect_source(self.contract, self.asset_id, self.handle)

    def test_metadata_or_organization_failure_never_dispatches_followups(self):
        self.handle.run_id = 123
        self.contract.task_runs = Mock()
        notices = IngestNotices()
        for failed_stage in ('_collect', '_organize'):
            with self.subTest(stage=failed_stage), patch.object(post, failed_stage, side_effect=RuntimeError('模拟阶段失败')), \
                    patch.object(post, 'NOTICES', notices):
                with self.assertRaisesRegex(RuntimeError, '模拟阶段失败'):
                    self.run_task()
                self.assertEqual(self.store.get(self.task.id).postprocess_state, 'failed')
                self.contract.task_runs.enqueue_followups.assert_not_called()
        self.assertEqual(notices.snapshot()['items'], [])
