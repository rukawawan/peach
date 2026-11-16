"""测试结果历史：逐条结果怎么记、写到哪、写不进去时不影响判定。"""
from __future__ import annotations

import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from scripts import test_history as history
from scripts import test_runner as runner

TAP = """TAP version 13
# Subtest: 跨页锚点定位
    # Subtest: desktop：内容就绪后定位
    ok 1 - desktop：内容就绪后定位
      ---
      duration_ms: 5528.0377
      type: 'test'
      ...
    # Subtest: mobile：内容就绪后定位
    not ok 2 - mobile：内容就绪后定位
      ---
      duration_ms: 2387.5
      type: 'test'
      error: |-
        locator.click: Timeout 15000ms exceeded.
      ...
    # Subtest: narrow 暂不支持
    ok 3 - narrow 暂不支持 # SKIP 没有窄屏夹具
      ---
      duration_ms: 0.1
      type: 'test'
      ...
    1..3
not ok 1 - 跨页锚点定位
  ---
  duration_ms: 7916.0
  type: 'suite'
  ...
"""


class ResultCollectionTests(unittest.TestCase):
    def run_cases(self, cases: dict) -> runner.TimedResult:
        case_class = type('Sample', (unittest.TestCase,), {'__module__': 'test_sample', **cases})
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(case_class)
        with contextlib.redirect_stderr(io.StringIO()):
            return unittest.TextTestRunner(stream=io.StringIO(), verbosity=0,
                                           resultclass=runner.TimedResult).run(suite)

    def test_every_case_gets_one_row_with_its_outcome_and_a_failure_summary(self):
        def failing_subtest(self):
            for value in (1, 2):
                with self.subTest(value=value):
                    self.assertEqual(value, 1)

        result = self.run_cases({
            'test_a_pass': lambda self: None,
            'test_b_fail': lambda self: self.assertEqual(1, 2, 'token=abc123 不该出现'),
            'test_c_error': lambda self: {}['missing'],
            'test_d_skip': unittest.skip('没有夹具')(lambda self: None),
            'test_e_subtest': failing_subtest,
        })
        rows = {row['id'].rsplit('.', 1)[-1]: row for row in result.results}
        self.assertEqual({name: row['outcome'] for name, row in rows.items()},
                         {'test_a_pass': 'pass', 'test_b_fail': 'fail', 'test_c_error': 'error',
                          'test_d_skip': 'skip', 'test_e_subtest': 'fail'})
        self.assertTrue(rows['test_b_fail']['message'].startswith('AssertionError: 1 != 2'))
        self.assertNotIn('abc123', rows['test_b_fail']['message'])
        self.assertEqual(rows['test_c_error']['message'], "KeyError: 'missing'")
        self.assertNotIn('message', rows['test_a_pass'])

    def test_a_class_setup_failure_is_recorded_once_as_an_error(self):
        def broken(cls):
            raise RuntimeError('建库失败')
        result = self.run_cases({'setUpClass': classmethod(broken), 'test_x': lambda self: None})
        self.assertEqual([row['outcome'] for row in result.results], ['error'])
        self.assertIn('建库失败', result.results[0]['message'])


class HistoryFileTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.folder = Path(folder.name).resolve()

    def test_a_run_appends_its_header_and_only_failures_skips_and_slow_passes(self):
        rows = [history.result('test_a.T.test_fast', 'pass', 0.01),
                history.result('test_a.T.test_slow', 'pass', history.SLOW_SECONDS + 0.5),
                history.result('test_a.T.test_red', 'fail', 0.2, 'AssertionError: 1 != 2'),
                history.result('test_a.T.test_off', 'skip', 0.0)]
        path = history.append(runner.ROOT, scope='auto:catalog', files=['test_a'], rows=rows,
                              folder=self.folder)
        history.append(runner.ROOT, scope='full:full', files=['test_a'], rows=rows[:1], folder=self.folder)
        self.assertRegex(path.name, r'^\d{4}-\d{2}\.jsonl$')
        lines = [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines()]
        headers = [line for line in lines if line['type'] == 'run']
        self.assertEqual([header['scope'] for header in headers], ['auto:catalog', 'full:full'])
        first = headers[0]
        for field in ('time', 'platform', 'head', 'branch', 'worktree', 'ci', 'files', 'count'):
            self.assertIn(field, first)
        self.assertEqual(first['count'], 4)
        self.assertEqual(len(first['head']), 40)
        kept = [line['id'].rsplit('.', 1)[-1] for line in lines if line['type'] == 'test']
        self.assertEqual(kept, ['test_slow', 'test_red', 'test_off'])
        self.assertTrue(all(line['run'] == first['run'] for line in lines[1:4]))

    def test_flaky_passes_are_recorded_and_ranked_by_how_often_they_recur(self):
        history.append_flaky(runner.ROOT, ['frontend/e2e/search.test.ts', 'test_a'], folder=self.folder)
        history.append_flaky(runner.ROOT, ['frontend/e2e/search.test.ts'], folder=self.folder)
        history.append(runner.ROOT, scope='full:full', files=[], rows=[], folder=self.folder)
        records = list(history.read_records([self.folder]))
        flaky = [record for record in records if record['type'] == 'flaky']
        self.assertEqual(len(flaky), 2)
        for field in ('time', 'head', 'branch', 'ci', 'selectors'):
            self.assertIn(field, flaky[0])
        ranking = history.flaky_ranking(records)
        self.assertEqual([(row['selector'], row['count']) for row in ranking],
                         [('frontend/e2e/search.test.ts', 2), ('test_a', 1)])
        self.assertEqual(history.flaky_ranking(records, since='9999'), [], '统计窗口之外的不算')
        with contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(history.main(['flaky', '--folder', str(self.folder)]), 0)
        self.assertIn('frontend/e2e/search.test.ts', output.getvalue())
        with history.running():
            self.assertIsNone(history.append_flaky(runner.ROOT, ['x']), '用例里调运行器不写真实历史')

    def test_a_history_that_cannot_be_written_only_warns(self):
        blocked = self.folder / 'not-a-directory'
        blocked.write_text('', encoding='utf-8')
        errors = io.StringIO()
        with contextlib.redirect_stderr(errors):
            self.assertIsNone(history.append(runner.ROOT, scope='full:full', files=[], rows=[],
                                             folder=blocked))
        self.assertIn('不影响本次判定', errors.getvalue())

    def test_runs_started_by_a_test_do_not_write_the_real_history_or_take_outer_rows(self):
        saved = list(history._external)
        self.addCleanup(history._external.__setitem__, slice(None), saved)
        outer = history.result('vitest:x.test.ts > a', 'pass', 2.0)
        history._external[:] = [outer]
        with history.running(), mock.patch.object(history, 'history_dir',
                                                  side_effect=AssertionError('不该写真实历史')):
            self.assertTrue(history.nested())
            self.assertIsNone(history.append(runner.ROOT, scope='full:full', files=[], rows=[]))
            self.assertEqual(history.take_external(), [])
            history.record_external([history.result('vitest:fixture > failure', 'fail', 0.0)])
        self.assertEqual(history._external, [outer], '外层运行收集到一半的结果原样留着')

    def test_the_parent_collects_every_shards_rows(self):
        class Done:
            returncode = 0

            def poll(self):
                return 0

        def spawn(command, *, stdout, stderr, cwd):
            index = int(command[command.index('--shard-index') + 1])
            Path(command[command.index('--timings') + 1]).write_text(json.dumps({
                'complete': True, 'success': False, 'count': 1, 'timings': [],
                'results': [history.result(f'test_{index}.T.test_x', 'fail', 0.1, 'boom')]}), encoding='utf-8')
            return Done()

        rows = []
        with contextlib.redirect_stdout(io.StringIO()):
            runner.run_shards(('checks',), jobs=2, shard_count=2, spawn=spawn, outcomes=rows,
                              plan=[['test_a.py'], ['test_b.py']])
        self.assertCountEqual([row['id'] for row in rows], ['test_0.T.test_x', 'test_1.T.test_x'])


class ExternalRowsTests(unittest.TestCase):
    def test_file_completion_preserves_process_and_suite_failures(self):
        frontend = Path(tempfile.gettempdir()).resolve() / 'frontend'
        report = {'testResults': [{'name': str(frontend / 'test/a.test.ts'), 'status': 'passed'},
                                  {'name': str(frontend / 'test/b.test.ts'), 'status': 'failed'}]}
        rows = history.vitest_files(report, frontend)
        self.assertEqual([row['outcome'] for row in rows], ['pass', 'fail'])
        self.assertTrue(all(row['file_complete'] for row in rows))
        self.assertEqual(history.file_result('e2e', 'e2e/a.test.ts', False)['outcome'], 'fail')

    def test_tap_leaves_become_rows_with_their_suite_path(self):
        rows = history.tap_rows('e2e/anchor-navigation.test.ts', TAP)
        self.assertEqual([(row['id'], row['outcome']) for row in rows], [
            ('e2e:e2e/anchor-navigation.test.ts > 跨页锚点定位 > desktop：内容就绪后定位', 'pass'),
            ('e2e:e2e/anchor-navigation.test.ts > 跨页锚点定位 > mobile：内容就绪后定位', 'fail'),
            ('e2e:e2e/anchor-navigation.test.ts > 跨页锚点定位 > narrow 暂不支持', 'skip'),
        ])
        self.assertAlmostEqual(rows[0]['seconds'], 5.528, places=3)
        self.assertEqual(rows[1]['message'], 'locator.click: Timeout 15000ms exceeded.')

    def test_vitest_json_rows_name_the_file_and_describe_path(self):
        frontend = Path(tempfile.gettempdir()).resolve() / 'frontend'
        report = {'testResults': [{'name': str(frontend / 'test' / 'card.test.tsx'), 'assertionResults': [
            {'ancestorTitles': ['卡片'], 'title': '显示标题', 'status': 'passed', 'duration': 1500},
            {'ancestorTitles': [], 'title': '空态', 'status': 'failed', 'duration': 3,
             'failureMessages': ['AssertionError: expected 1 to be 2\n    at card.test.tsx:4']},
            {'ancestorTitles': [], 'title': '待写', 'status': 'todo', 'duration': None}]}]}
        rows = history.vitest_rows(report, frontend)
        self.assertEqual([(row['id'], row['outcome']) for row in rows], [
            ('vitest:test/card.test.tsx > 卡片 > 显示标题', 'pass'),
            ('vitest:test/card.test.tsx > 空态', 'fail'),
            ('vitest:test/card.test.tsx > 待写', 'skip')])
        self.assertEqual(rows[0]['seconds'], 1.5)
        self.assertEqual(rows[1]['message'], 'AssertionError: expected 1 to be 2')

    def test_summaries_hide_credentials_and_stay_short(self):
        line = history.summary('Traceback\n  File x\nValueError: password=hunter2 ' + 'x' * 400)
        self.assertNotIn('hunter2', line)
        self.assertLessEqual(len(line), history.SUMMARY_CHARS)
        self.assertTrue(line.startswith('ValueError: password=***'))


if __name__ == '__main__':
    unittest.main()
