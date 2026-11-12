"""馆藏任务按目录的连接分账，代理保护决定自动读取范围。"""
import gzip
import json
import sqlite3
import subprocess
import tempfile
import unittest
from contextlib import closing
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from peach import artifact_rules, upgrade_rules

from peach.http import HttpRequest, HttpxTransport
from peach.processing_traffic import ProcessingTraffic, download_route, media_statistics, record_download, record_media_read
from peach.settings_file import PeachConfig
from support.ledger import fresh_ledger


class ProcessingTrafficTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.config = PeachConfig(self.root, self.root / 'config.toml', present=True,
            locations={'mounted': ('A:\\Cloud', 'B:\\Cloud'), 'local': ('R:\\Media',)},
            media_costs={'A:\\Cloud': 'metered', 'B:\\Cloud': 'free'})
        self.db = fresh_ledger(self.root)
        routes = patch('peach.clouddrive_proxy.connections', return_value={
            'a:\\cloud': 'proxy', 'b:\\cloud': 'direct'})
        routes.start()
        self.addCleanup(routes.stop)

    def test_unknown_routes_are_separate_from_confirmed_proxy_bytes(self):
        with patch('peach.clouddrive_proxy.connections', return_value={'a:\\cloud': 'system'}):
            traffic = ProcessingTraffic(self.config, self.db, 'metadata')
        with traffic.bind():
            record_media_read('A:\\Cloud\\a.nfo', 100)
        result = traffic.snapshot()
        self.assertEqual(result['metered_used_bytes'], 0)
        self.assertEqual(result['unknown_route_used_bytes'], 100)
        self.assertEqual(result['sources'][0]['connection'], 'system')

    def test_media_reads_follow_each_root_and_totals_conserve_bytes(self):
        traffic = ProcessingTraffic(self.config, self.db, 'metadata')
        with traffic.bind():
            record_media_read('A:\\Cloud\\a.nfo', 100)
            record_media_read('B:\\Cloud\\b.jpg', 200)
            record_media_read('R:\\Media\\c.jpg', 300)
            record_download(50)
        result = traffic.snapshot()
        drives = {row['root']: row for row in result['sources'] if row.get('root')}
        self.assertEqual(drives['A:\\Cloud']['used_bytes'], 100)
        self.assertTrue(drives['A:\\Cloud']['metered'])
        self.assertEqual(drives['B:\\Cloud']['used_bytes'], 200)
        self.assertFalse(drives['B:\\Cloud']['metered'])
        self.assertEqual(drives['R:\\Media']['used_bytes'], 0)
        self.assertEqual(result['used_bytes'], 350)
        self.assertEqual(result['used_bytes'], sum(row['used_bytes'] for row in result['sources']))
        self.assertEqual(result['metered_used_bytes'], sum(row['used_bytes'] for row in result['sources'] if row['metered']))

    def test_http_counts_compressed_download_and_failed_partial_stream(self):
        packed = gzip.compress(b'a' * 10000)
        class Broken(httpx.SyncByteStream):
            def __iter__(self):
                yield b'abcd'
                raise httpx.ReadError('断开')
        replies = iter([httpx.Response(200, headers={'content-encoding': 'gzip'}, stream=httpx.ByteStream(packed)),
                        httpx.Response(200, stream=Broken())])
        client = httpx.Client(transport=httpx.MockTransport(lambda request: next(replies)))
        self.addCleanup(client.close)
        transport = HttpxTransport(client)
        traffic = ProcessingTraffic(self.config, self.db, 'metadata')
        with traffic.bind():
            self.assertEqual(len(transport(HttpRequest('GET', 'https://example.com/a', {}), 1, 20000).body), 10000)
            with self.assertRaises(httpx.ReadError):
                transport(HttpRequest('GET', 'https://example.com/b', {}), 1, 20000)
        self.assertEqual(traffic.snapshot()['used_bytes'], len(packed) + 4)

    def test_resume_keeps_counts_and_fresh_task_starts_at_zero(self):
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        with traffic.bind():
            record_media_read('A:\\Cloud\\a.nfo', 100)
        restored = ProcessingTraffic(self.config, self.db, 'collect', resume_state={'traffic': traffic.snapshot()})
        with restored.bind():
            record_media_read('A:\\Cloud\\a.nfo', 25)
        self.assertEqual(restored.snapshot()['used_bytes'], 125)
        self.assertEqual(ProcessingTraffic(self.config, self.db, 'collect').snapshot()['used_bytes'], 0)

    def test_same_provider_roots_have_independent_proxy_estimates_and_selection(self):
        with closing(sqlite3.connect(self.db)) as connection, connection:
            for path in ('A:\\Cloud\\a.mp4', 'B:\\Cloud\\b.mp4'):
                connection.execute('INSERT INTO asset(location,path,name,medium,size) VALUES(?,?,?,?,?)',
                                   ('mounted', path, 'video.mp4', 'video', 1024**3))
        scan = ProcessingTraffic(self.config, self.db, 'scan').snapshot()
        drives = {row['root']: row for row in scan['sources']}
        self.assertEqual(drives['A:\\Cloud']['estimated_max_bytes'], 0)
        self.assertGreater(drives['B:\\Cloud']['estimated_max_bytes'], 0)
        self.assertEqual(scan['metered_estimated_max_bytes'], 0)
        self.assertEqual(scan['estimated_max_bytes'], sum(row['estimated_max_bytes'] for row in scan['sources']))
        selected = ProcessingTraffic(self.config, self.db, 'scan', [1]).snapshot()
        self.assertFalse(selected['unknown_files'])
        self.assertEqual(selected['estimated_max_bytes'], 0)

    def test_http_route_and_media_statistics_accumulate_without_cross_task_leak(self):
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        with traffic.bind():
            with download_route(False):
                record_download(50)
            with download_route(True):
                record_download(30)
            media_statistics('A:\\Cloud\\a.mp4', b'Statistics: 100 bytes read, 1 seeks\n')
            media_statistics('B:\\Cloud\\b.mp4', b'ffmpeg timeout')
        record_download(500)
        result = traffic.snapshot()
        self.assertEqual(result['used_bytes'], 180)
        self.assertEqual(result['metered_used_bytes'], 130)
        self.assertTrue(result['partial'])

    def test_read_only_estimate_uses_requested_stage_without_starting_a_job(self):
        from peach.web_library_processing import q_library_processing
        database_root = self.config.directory('database')
        database_root.mkdir(parents=True)
        db = fresh_ledger(database_root)
        contract = SimpleNamespace(db_path=db)
        before = set(self.root.rglob('*'))
        with patch('peach.web_library_processing.settings_file.active', return_value=self.config):
            response = q_library_processing(contract, {'estimate': '1', 'stage': 'scan'})
            with self.assertRaises(ValueError):
                q_library_processing(contract, {'estimate': '1', 'stage': 'invalid'})
        self.assertTrue(response['traffic']['unknown_files'])
        self.assertEqual(response['traffic']['used_bytes'], 0)
        self.assertEqual(set(self.root.rglob('*')), before)

    def test_mount_alias_and_longest_root_own_the_read(self):
        config = replace(self.config, locations={'mounted': ('A:\\Cloud', 'A:\\Cloud\\Direct')},
            mounts={'mounted': ('/mnt/cloud', '/mnt/direct')},
            media_costs={'A:\\Cloud': 'metered', 'A:\\Cloud\\Direct': 'free'})
        traffic = ProcessingTraffic(config, self.db, 'metadata')
        with traffic.bind():
            record_media_read('a:\\cloud\\DIRECT\\a.nfo', 100)
            record_media_read('/mnt/cloud/b.nfo', 50)
            record_media_read('/mnt/direct/c.nfo', 25)
        result = traffic.snapshot()
        self.assertEqual(result['used_bytes'], 175)
        self.assertEqual(result['metered_used_bytes'], 50)

    def test_plan_uses_scanned_workload_without_an_asset_id_parameter_list(self):
        traffic = ProcessingTraffic(self.config, self.db, 'scan')
        rows = [dict(location='mounted', path='B:\\Cloud\\a.mp4', size=1024**3,
                     duration=None, snapshot_path=None)]
        with patch('peach.processing_traffic_plan.sqlite3.connect', side_effect=AssertionError('重复查询')):
            traffic.refresh_plan(rows)
        self.assertGreater(traffic.snapshot()['estimated_max_bytes'], 0)
        self.assertEqual(traffic.snapshot()['metered_estimated_max_bytes'], 0)

    def _video(self, **values):
        return dict(id=1, location='mounted', path='A:\\Cloud\\ABW-001.mp4', name='ABW-001.mp4',
                    code='ABW-001', size=1024**3, duration=3600, snapshot_path=None, **values)

    def test_download_plan_deduplicates_releases_and_ignores_creator_files(self):
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        with patch.object(traffic.plan, '_ready', return_value=False):
            traffic.refresh_plan([self._video()])
            single = sum(row['estimated_bytes'] for row in traffic.snapshot()['sources'] if not row['root'])
            rows = [{**self._video(), 'id': index, 'path': f'A:\\Cloud\\copy{index}.mp4'} for index in range(20)]
            traffic.refresh_plan(rows)
            repeated = sum(row['estimated_bytes'] for row in traffic.snapshot()['sources'] if not row['root'])
        self.assertGreater(single, 0)
        self.assertEqual(single, repeated)
        traffic.refresh_plan([{**self._video(), 'code': None, 'name': '创作者作品.mp4'}])
        self.assertEqual(sum(row['estimated_bytes'] for row in traffic.snapshot()['sources'] if not row['root']), 0)

    def test_disk_forecast_deduplicates_cover_and_releases_completed_work(self):
        traffic = ProcessingTraffic(self.config, self.db, 'metadata')
        with patch.object(traffic.plan, '_ready', return_value=False):
            traffic.refresh_plan([self._video()])
            traffic.finish_work('local')
            first = traffic.snapshot()['disk']['estimated_bytes']
            traffic.refresh_plan([{**self._video(), 'path': f'A:\\Cloud\\copy{index}.mp4'} for index in range(3)])
            deduplicated = traffic.snapshot()['disk']['estimated_bytes']
        self.assertGreater(first, 0)
        self.assertEqual(deduplicated, first)
        traffic.finish_work('metadata', self._video()['code'])
        self.assertEqual(traffic.snapshot()['disk']['estimated_bytes'], 0)
        self.assertEqual(traffic.snapshot(finished=True)['disk']['temporary_bytes'], 0)

    def test_disk_forecast_combines_one_volume_and_reports_shortfall(self):
        traffic = ProcessingTraffic(self.config, self.db, 'previews')
        traffic.refresh_plan([{**self._video(), 'location':'local', 'path':'R:\\Media\\a.mp4'}])
        with patch('peach.processing_storage.volume_space', return_value=(1, 1024, 'R:\\', 10 * 1024**3)):
            result = traffic.snapshot()['disk']
        self.assertEqual(len(result['volumes']), 1)
        volume = result['volumes'][0]
        self.assertGreater(result['estimated_bytes'], 0)
        self.assertGreater(result['temporary_bytes'], 0)
        self.assertEqual(volume['reserve_bytes'], 1024**3)
        self.assertEqual(volume['shortfall_bytes'], result['estimated_bytes'] + result['temporary_bytes'] + 1024**3 - 1024)
        self.assertFalse(result['can_fit'])

    def test_disk_forecast_uses_each_output_volume_and_keeps_unknown_capacity(self):
        traffic = ProcessingTraffic(self.config, self.db, 'metadata')
        traffic.refresh_plan([self._video()])
        def space(path):
            return (1, None, 'X:\\', None) if path == traffic.storage.generated else (2, 10 * 1024**3, 'Y:\\', 20 * 1024**3)
        with patch('peach.processing_storage.volume_space', side_effect=space):
            result = traffic.snapshot()['disk']
        self.assertEqual(len(result['volumes']), 2)
        self.assertIsNone(result['can_fit'])
        self.assertTrue(result['cache_unknown'])

    def test_disk_forecast_uses_the_saved_capacity_reserve(self):
        from peach.storage_budget import save_policy
        save_policy(self.config, {'minimum_free_gib': 7})
        traffic = ProcessingTraffic(self.config, self.db, 'metadata')
        traffic.refresh_plan([self._video()])
        with patch('peach.processing_storage.volume_space', return_value=(1, 20 * 1024**3, 'R:\\', 40 * 1024**3)):
            disk = traffic.snapshot()['disk']
        self.assertEqual(disk['volumes'][0]['reserve_bytes'], 7 * 1024**3)

    def test_complete_fields_and_local_cover_have_no_download_work(self):
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        row = self._video(catalog_title='影片', performers='演员', studio='厂牌', release_date='2026-01-01', tags='类别')
        with patch.object(traffic.plan, '_ready', return_value=True):
            traffic.refresh_plan([row])
        self.assertEqual(sum(source['estimated_bytes'] for source in traffic.snapshot()['sources'] if not source['root']), 0)

    def test_local_evidence_recalculates_actual_metadata_verification_work(self):
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        row = self._video()
        fields = dict(title='影片', performers='演员', studio='厂牌', release_date='2026-01-01', tags='类别')
        with patch.object(traffic.plan, '_ready', return_value=True):
            traffic.prepare_metadata([(row, 'ABW-001', False, fields, [], True)])
            self.assertEqual(sum(source['estimated_bytes'] for source in traffic.snapshot()['sources'] if not source['root']), 0)
            traffic.prepare_metadata([(row, 'ABW-001', True, fields, [], True)])
            self.assertGreater(sum(source['estimated_bytes'] for source in traffic.snapshot()['sources'] if not source['root']), 0)

    def test_fresh_source_cache_and_misses_do_not_plan_network_requests(self):
        directory = self.config.directory('sources') / 'library-metadata'
        directory.mkdir(parents=True)
        for source in ('r18dev', 'javdb'):
            path = directory / f'ABW-001-{source}.json'
            payload = {'title': '影片', **({'javdb_rule': 2, 'source_id': 'VerifiedWork'} if source == 'javdb' else {})}
            path.write_text(json.dumps(payload), encoding='utf-8')
            artifact_rules.remember(path, str(upgrade_rules.PROVIDER_EVIDENCE))
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        with patch.object(traffic.plan.remote, '_chain', return_value=('r18dev', 'javdb')), patch.object(traffic.plan, '_ready', return_value=True):
            traffic.refresh_plan([self._video()])
            self.assertEqual(sum(row['estimated_bytes'] for row in traffic.snapshot()['sources'] if not row['root']), 0)
        traffic.plan.evidence_names.clear()
        with patch.object(traffic.plan.remote, '_chain', return_value=('r18dev', 'javdb')), patch.object(traffic.plan.remote.misses, 'fresh', return_value=True), patch.object(traffic.plan, '_ready', return_value=True):
            traffic.refresh_plan([self._video()])
            self.assertEqual(sum(row['estimated_bytes'] for row in traffic.snapshot()['sources'] if not row['root']), 0)

    def test_download_budget_is_shared_and_finished_work_leaves_used_bytes(self):
        from peach.library_processing import MAX_SOURCE_BYTES
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        traffic.plan.units = {'metadata:ABW-001': {'metadata-proxy': MAX_SOURCE_BYTES * 3, 'metadata-direct': MAX_SOURCE_BYTES * 2}}
        result = traffic.snapshot()
        self.assertLessEqual(result['estimated_bytes'], MAX_SOURCE_BYTES)
        self.assertEqual(result['estimated_bytes'], sum(row['estimated_bytes'] for row in result['sources']))
        self.assertEqual(result['metered_estimated_bytes'], sum(row['estimated_bytes'] for row in result['sources'] if row['metered']))
        with traffic.bind(), download_route(True):
            record_download(100)
        traffic.finish_work('metadata', 'ABW-001')
        self.assertEqual(traffic.snapshot()['estimated_bytes'], 100)
        restored = ProcessingTraffic(self.config, self.db, 'collect', resume_state={'traffic': traffic.snapshot()})
        restored.refresh_plan([self._video()])
        self.assertEqual(sum(row['estimated_bytes'] for row in restored.snapshot()['sources'] if not row['root']), 100)

    def test_old_javdb_snapshot_plans_its_request_and_preserves_other_current_cache(self):
        directory = self.config.directory('sources') / 'library-metadata'
        directory.mkdir(parents=True)
        for source in ('r18dev', 'javdb'):
            path = directory / f'ABW-001-{source}.json'
            path.write_text(json.dumps({'title': '影片'}), encoding='utf-8')
            artifact_rules.remember(path, str(upgrade_rules.PROVIDER_EVIDENCE))
        old_path = directory / 'ABW-001-javdb.json'
        before = old_path.read_bytes()
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        with patch.object(traffic.plan.remote, '_chain', return_value=('r18dev', 'javdb')), \
                patch.object(traffic.plan, '_ready', return_value=True):
            traffic.refresh_plan([self._video()])
        self.assertEqual(sum(row['estimated_bytes'] for row in traffic.snapshot()['sources'] if not row['root']),
                         500 * 1024)
        self.assertEqual(old_path.read_bytes(), before)

    def test_source_network_choice_splits_pending_downloads(self):
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        with patch.object(traffic.plan.remote, '_chain', return_value=('r18dev', 'javdb')), patch.object(traffic.plan, '_ready', return_value=True), patch('peach.scraping_access.values_for', side_effect=lambda root, source: {'network': 'direct' if source == 'javdb' else 'peach'}), patch('peach.peach_proxy.client_options', return_value={'proxy': 'http://example.invalid', 'trust_env': False}):
            traffic.refresh_plan([self._video()])
        sources = {row['key']: row for row in traffic.snapshot()['sources']}
        self.assertEqual(sources['metadata-direct']['estimated_bytes'], 500 * 1024)
        self.assertEqual(sources['metadata-proxy']['estimated_bytes'], 500 * 1024)

    def test_external_collector_plan_is_separate_from_http_download_budget(self):
        from peach.library_processing import MAX_SOURCE_BYTES
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        traffic.plan._add('metadata:ABW-001', 'metadata-proxy', MAX_SOURCE_BYTES * 2)
        traffic.plan._add('metadata:ABW-001', 'metadata-proxy', 1000, budgeted=False)
        self.assertEqual(traffic.snapshot()['estimated_bytes'], MAX_SOURCE_BYTES + 1000)

    def test_non_release_metadata_completion_leaves_other_releases_pending(self):
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        traffic.plan._add('metadata:ABW-001', 'metadata-proxy', 1000)
        traffic.finish_work('metadata', None)
        self.assertEqual(traffic.snapshot()['estimated_bytes'], 1000)

    def test_local_cache_file_sizes_inform_sidecar_plan_and_local_stage_settles(self):
        evidence = self.config.directory('sources') / 'library-metadata'
        evidence.mkdir(parents=True)
        (evidence / 'sample.nfo').write_bytes(b'x' * 1234)
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        with patch.object(traffic.plan, '_ready', return_value=True):
            traffic.refresh_plan([self._video()])
            root = next(row for row in traffic.snapshot()['sources'] if row['root'] == 'A:\\Cloud')
            self.assertEqual(root['estimated_bytes'], 1234)
            traffic.finish_work('local')
            root = next(row for row in traffic.snapshot()['sources'] if row['root'] == 'A:\\Cloud')
            self.assertEqual(root['estimated_bytes'], 0)
            self.assertEqual(traffic.snapshot()['completed_work'], ['local:*'])

    def test_real_ffmpeg_probe_and_frame_report_input_reads(self):
        from peach.ffmpeg import FFmpegResolver
        from peach.frame_capture import capture_frame
        from peach.media_probe import probe_file
        from support.conditions import missing_prerequisite
        resolver = FFmpegResolver(self.root)
        ffmpeg, ffprobe = resolver.ffmpeg(), resolver.ffprobe()
        if ffmpeg is None or ffprobe is None:
            missing_prerequisite('媒体流量实证需要 FFmpeg 与 ffprobe')
        source = self.root / '示例.mp4'
        subprocess.run([str(ffmpeg.path), '-y', '-v', 'error', '-f', 'lavfi', '-i',
                        'color=c=black:s=320x180:r=5:d=1', '-c:v', 'mpeg4', str(source)],
                       capture_output=True, check=True, timeout=20)
        config = replace(self.config, locations={'mounted': ('A:\\Cloud',)},
                         mounts={'mounted': (str(self.root),)})
        traffic = ProcessingTraffic(config, self.db, 'collect')
        with traffic.bind():
            self.assertGreater(probe_file(str(ffprobe.path), str(source))[0], 0)
            probed = traffic.snapshot()['used_bytes']
            self.assertGreater(probed, 0)
            success, _ = capture_frame(str(ffmpeg.path), str(source), 0.1, self.root / 'frame.jpg')
            self.assertTrue(success)
            self.assertGreater(traffic.snapshot()['used_bytes'], probed)

    def test_workload_counts_files_and_distinct_eligible_releases_per_drive(self):
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        traffic.refresh_plan([self._video(), {**self._video(), 'path': 'B:\\Cloud\\ABW-001.mp4'},
            {**self._video(), 'path': 'A:\\Cloud\\ABW-002.mp4', 'code': 'ABW-002'},
            {**self._video(), 'path': 'A:\\Cloud\\creator.mp4', 'name': '日常.mp4', 'code': None}])
        result = traffic.snapshot()
        self.assertEqual({key: result['workload'][key] for key in ('video_files', 'jav_files', 'jav_titles')},
                         dict(video_files=4, jav_files=3, jav_titles=2))
        drives = {row['root']: row['workload'] for row in result['sources'] if row['root']}
        self.assertEqual(drives['A:\\Cloud'], dict(video_files=3, jav_files=2, jav_titles=2))
        self.assertEqual(drives['B:\\Cloud'], dict(video_files=1, jav_files=1, jav_titles=1))

    def test_successful_jav_samples_calibrate_matching_work_and_persist(self):
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        with patch.object(traffic.plan.remote, '_chain', return_value=('r18dev',)), patch.object(traffic.plan, '_ready', return_value=True):
            traffic.refresh_plan([{**self._video(), 'code': f'ABW-{number:03}'} for number in range(1, 5)])
            for number, amount in ((1, 1000), (2, 2000), (3, 3000)):
                code = f'ABW-{number:03}'
                traffic.start_metadata(code)
                with traffic.bind(), download_route(True):
                    record_download(amount)
                traffic.finish_work('metadata', code)
            self.assertEqual(traffic.plan.units['metadata:ABW-004']['metadata-proxy'], 2000)
            traffic.snapshot(finished=True)
        restored = ProcessingTraffic(self.config, self.db, 'collect')
        with patch.object(restored.plan.remote, '_chain', return_value=('r18dev',)), patch.object(restored.plan, '_ready', return_value=True):
            restored.refresh_plan([self._video()])
            self.assertEqual(restored.plan.units['metadata:ABW-001']['metadata-proxy'], 2000)
        with patch.object(restored.plan.remote, '_chain', return_value=('r18dev', 'javdb')), patch.object(restored.plan, '_ready', return_value=True):
            restored.refresh_plan([self._video()])
            self.assertEqual(restored.plan.units['metadata:ABW-001']['metadata-proxy'], 1000 * 1024)

    def test_failed_incomplete_and_cached_metadata_are_not_average_samples(self):
        traffic = ProcessingTraffic(self.config, self.db, 'collect')
        with patch.object(traffic.plan.remote, '_chain', return_value=('r18dev',)), patch.object(traffic.plan, '_ready', return_value=True):
            for number in range(4):
                code = f'ABW-{number:03}'
                traffic.refresh_plan([{**self._video(), 'code': code}])
                traffic.start_metadata(code)
                if number != 0:
                    with traffic.bind(), download_route(True):
                        record_download(1000)
                if number >= 2:
                    traffic.mark('metadata-proxy', '外部采集器流量未取得')
                traffic.finish_work('metadata', code, successful=number != 1)
        self.assertEqual(traffic.plan.history.samples, {})

    def test_successful_probe_average_is_separate_for_each_drive_and_frame(self):
        traffic = ProcessingTraffic(self.config, self.db, 'scan')
        with traffic.bind():
            for _ in range(3):
                media_statistics('B:\\Cloud\\a.mp4', 'Statistics: 1024 bytes read', kind='probe', successful=True)
                media_statistics('B:\\Cloud\\a.mp4', 'Statistics: 9000 bytes read', kind='frame', successful=True)
                media_statistics('B:\\Cloud\\a.mp4', 'Statistics: 999999 bytes read', kind='probe')
        row = {**self._video(), 'path': 'B:\\Cloud\\a.mp4', 'duration': None}
        traffic.refresh_plan([row])
        key = traffic._media_key(row['path'])
        self.assertEqual(traffic.plan.units['media:' + row['path']][key], 1024)
        traffic.snapshot(finished=True)
        restored = ProcessingTraffic(self.config, self.db, 'scan')
        restored.refresh_plan([row])
        self.assertEqual(restored.plan.units['media:' + row['path']][key], 1024)
        self.assertEqual(restored.plan.history.average(key + ':frame', 0), 9000)
        self.assertEqual(restored.plan.history.average(traffic._media_key('A:\\Cloud\\a.mp4') + ':probe', 8), 8)
