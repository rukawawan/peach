from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile

from scripts import agent_worktree, ci_test_evidence as evidence
from support.gitrepo import seed_repository


class GitHubTestEvidenceTests(unittest.TestCase):
    def setUp(self):
        folder = self.enterContext(tempfile.TemporaryDirectory())
        self.root = seed_repository(Path(folder).resolve() / 'repo',
                                    {name: '# policy\n' for name in evidence.POLICY
                                     if name != '.github/actions' and not name.startswith(':')}
                                    | {'.gitignore': 'build/\n', 'scripts/test_focus.py': '# policy\n',
                                       'scripts/test_environment.py': '# policy\n'},
                                    'fixture policy')
        self.base = self.git('rev-parse', 'HEAD')
        self.git('checkout', '-b', 'agent/codex/proof')
        (self.root / 'README.md').write_text('fixture\n', encoding='utf8')
        self.git('add', '--', 'README.md')
        self.git('commit', '-m', 'docs: fixture')
        self.head = self.git('rev-parse', 'HEAD')
        self.tree = self.git('rev-parse', 'HEAD^{tree}')
        self.repo = 'example/peach'
        self.plan = {'wide': False, 'frontend': False, 'vendor': False, 'wheel': False, 'browser': False,
                     'matrix': {'include': [{'os': os, 'python': '3.14', 'scope': 'auto', 'shard_index': 0}
                                            for os in ('windows-latest', 'macos-latest')]}}
        self.enterContext(patch.object(evidence, 'selected_plan', return_value=(self.plan, ('checks',))))
        self.run = {'id': 123, 'run_attempt': 1, 'head_sha': self.head, 'path': evidence.WORKFLOW,
                    'event': 'pull_request', 'status': 'completed', 'conclusion': 'success',
                    'repository': {'full_name': self.repo}, 'head_repository': {'full_name': self.repo},
                    'updated_at': datetime.now(timezone.utc).isoformat(), 'html_url': 'https://github.com/example/peach/actions/runs/123'}
        self.proof = {'schema': 1, 'repository': self.repo, 'run_id': 123, 'attempt': 1,
                      'event': 'pull_request', 'checkout': self.head, 'tree': self.tree, 'base': self.base,
                      'plan': self.plan, 'scopes': ['checks']}
        self.jobs = [{'name': name, 'status': 'completed', 'conclusion': 'success'}
                     for name in evidence.expected_jobs(self.plan)]

    def git(self, *args):
        return evidence.test_evidence.git(self.root, *args)

    def validate(self, **overrides):
        values = {'root': self.root, 'repo': self.repo, 'run': self.run, 'proof': self.proof,
                  'jobs': self.jobs, 'scopes': ('checks',), 'target': 'master'}
        return evidence.validate(**(values | overrides))

    def test_same_content_and_complete_platform_results_are_accepted(self):
        receipt = self.validate()
        self.assertEqual(receipt['head'], self.head)
        self.assertEqual(receipt['source'], 'github')
        self.assertEqual(len(receipt['jobs']), 6)

    def test_another_commit_fork_workflow_or_incomplete_run_is_rejected(self):
        invalid = [{'head_sha': self.base}, {'head_repository': {'full_name': 'fork/peach'}},
                   {'repository': {'full_name': 'other/peach'}}, {'path': '.github/workflows/release.yml'},
                   {'event': 'pull_request_target'}, {'status': 'in_progress'}, {'conclusion': 'failure'},
                   {'conclusion': 'cancelled'}, {'updated_at': '2000-01-01T00:00:00Z'}]
        for change in invalid:
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.validate(run=self.run | change)

    def test_wrong_tree_attempt_plan_and_insufficient_scope_are_rejected(self):
        invalid = [{'tree': '0' * 40}, {'run_id': 124}, {'attempt': 2}, {'attempt': 0},
                   {'repository': 'other/peach'}, {'scopes': ['full']}, {'plan': self.plan | {'browser': True}}]
        for change in invalid:
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.validate(proof=self.proof | change)
        with self.assertRaisesRegex(ValueError, '未覆盖'):
            self.validate(scopes=('web',))

    def test_a_missing_or_skipped_platform_or_shard_is_rejected(self):
        for index in range(len(self.jobs)):
            with self.subTest(index=index), self.assertRaisesRegex(ValueError, '必需'):
                self.validate(jobs=self.jobs[:index] + self.jobs[index + 1:])
        for conclusion in ('skipped', 'cancelled', 'failure'):
            with self.subTest(conclusion=conclusion), self.assertRaises(ValueError):
                self.validate(jobs=[self.jobs[0] | {'conclusion': conclusion}, *self.jobs[1:]])
        with self.assertRaises(ValueError):
            self.validate(jobs=[*self.jobs, self.jobs[0]])

    def test_protocol_changes_require_local_bootstrap(self):
        for name in ('scripts/ci_test_evidence.py', 'scripts/test_focus.py', 'scripts/test_environment.py'):
            with self.subTest(name=name):
                path = self.root / name
                path.write_text('print("changed execution")\n', encoding='utf8')
                self.git('add', '--', name)
                self.git('commit', '-m', 'test: protocol')
                run = self.run | {'head_sha': self.git('rev-parse', 'HEAD')}
                with self.assertRaisesRegex(ValueError, '本机正式验证'):
                    self.validate(run=run)
                self.git('reset', '--hard', self.head)

    def test_python_policy_comments_keep_the_same_executable_contract(self):
        path = self.root / 'scripts/ci_test_evidence.py'
        path.write_text('# policy explanation\n', encoding='utf8')
        self.git('add', '--', 'scripts/ci_test_evidence.py')
        self.git('commit', '-m', 'test: policy comment')
        run = self.run | {'head_sha': self.git('rev-parse', 'HEAD')}
        proof = self.proof | {'tree': self.git('rev-parse', 'HEAD^{tree}')}
        self.assertEqual(self.validate(run=run, proof=proof)['source'], 'github')

    def test_failed_job_only_rerun_keeps_the_original_bound_plan(self):
        receipt = self.validate(run=self.run | {'run_attempt': 2})
        self.assertEqual(receipt['attempt'], 2)
        with self.assertRaises(ValueError):
            self.validate(run=self.run | {'run_attempt': 2}, jobs=[self.jobs[0] | {'conclusion': 'failure'}, *self.jobs[1:]])

    def test_full_coverage_accepts_the_matching_pr_merge_tree_without_its_synthetic_commit(self):
        plan = self.plan | {'wide': True, 'matrix': {'include': [row | {'scope': 'full'}
                                                                for row in self.plan['matrix']['include']]}}
        proof = self.proof | {'checkout': 'f' * 40, 'base': 'f' * 40, 'plan': plan, 'scopes': ['full']}
        jobs = [{'name': name, 'status': 'completed', 'conclusion': 'success'} for name in evidence.expected_jobs(plan)]
        with patch.object(evidence, 'selected_plan', return_value=(plan, ('full',))):
            self.assertEqual(self.validate(proof=proof, jobs=jobs, scopes=('web',))['scopes'], ['full'])

    def test_proof_archive_digest_and_attempt_are_verified(self):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w') as archive:
            archive.writestr('ci-proof.json', json.dumps(self.proof))
        data = stream.getvalue()
        artifact = {'id': 3, 'name': 'test-proof-1', 'expired': False,
                    'digest': 'sha256:' + hashlib.sha256(data).hexdigest()}
        with patch.object(evidence, 'api', side_effect=[{'artifacts': [artifact]}, data]):
            self.assertEqual(evidence.read_artifact(self.root, self.repo, 123, 2), self.proof)
        for change in ({'digest': 'sha256:bad'}, {'name': 'test-proof-2'}, {'expired': True}):
            with self.subTest(change=change), patch.object(evidence, 'api', side_effect=[{'artifacts': [artifact | change]}, data]), \
                    self.assertRaises(ValueError):
                evidence.read_artifact(self.root, self.repo, 123, 2)

    def test_job_plan_requires_every_selected_frontend_wheel_and_browser_job(self):
        plan = self.plan | {'frontend': True, 'vendor': True, 'wheel': True, 'browser': True,
                            'wheel_matrix': {'include': [{'os': 'windows-latest', 'python': '3.14'}]},
                            'browser_matrix': {'include': [{'index': 0}, {'index': 1}]}}
        self.assertTrue({'island 产物与前端测试', '固定前端依赖', 'wheel-build',
                         'wheel 最小安装 / windows-latest / 3.14', '浏览器回归 / 0',
                         '浏览器回归 / 1'} <= evidence.expected_jobs(plan))

    def test_export_binds_the_checkout_tree_and_full_suite_without_an_old_baseline(self):
        destination = self.root / 'build/ci-proof.json'
        env = {'GITHUB_ACTIONS': 'true', 'GITHUB_JOB': 'plan', 'GITHUB_EVENT_NAME': 'push',
               'GITHUB_REPOSITORY': self.repo, 'GITHUB_RUN_ID': '123', 'GITHUB_RUN_ATTEMPT': '1'}
        with patch.dict(evidence.os.environ, env), patch.object(evidence, 'selected_plan', return_value=(self.plan, ('full',))):
            proof = evidence.export(self.root, '0' * 40, destination, full=True)
        self.assertEqual(proof['base'], self.head)
        self.assertEqual(proof['tree'], self.tree)
        self.assertEqual(json.loads(destination.read_text(encoding='utf8')), proof)

    def test_ready_and_integration_recheck_the_remote_receipt_without_signing_local_results(self):
        receipt = self.validate()
        with patch.object(agent_worktree, 'require_metadata', return_value=self.head), \
                patch.object(agent_worktree.test_runner, 'scopes_for_changes', return_value=(('checks',), [])), \
                patch.object(agent_worktree.test_runner, 'changed_contents', return_value={}), \
                patch.object(evidence, 'verify', return_value=receipt) as remote, \
                patch.object(agent_worktree.test_evidence, 'key', side_effect=AssertionError('local proof is separate')):
            first = agent_worktree.require_verified(self.root, 'master', {'README.md'}, ci_run=123)
            second = agent_worktree.require_verified(self.root, 'master', {'README.md'})
        self.assertEqual(first, second)
        self.assertEqual(remote.call_count, 2)
        self.assertFalse(list(evidence.test_evidence.evidence_dir(self.root).glob('*.json')))

    def test_network_failure_or_changed_results_cannot_reuse_the_cached_green_status(self):
        evidence.remember(self.root, self.validate())
        for error in (ValueError('cancelled'), subprocess.CalledProcessError(1, 'gh')):
            with self.subTest(error=error), patch.object(agent_worktree, 'require_metadata', return_value=self.head), \
                    patch.object(agent_worktree.test_runner, 'scopes_for_changes', return_value=(('checks',), [])), \
                    patch.object(agent_worktree.test_runner, 'changed_contents', return_value={}), \
                    patch.object(evidence, 'verify', side_effect=error), \
                    self.assertRaises(agent_worktree.WorkspaceError):
                agent_worktree.require_verified(self.root, 'master', {'README.md'}, ci_run=123)

    def test_an_expired_ci_receipt_does_not_block_a_valid_local_record(self):
        evidence.remember(self.root, self.validate())
        with patch.object(agent_worktree, 'require_metadata', return_value=self.head), \
                patch.object(agent_worktree.test_runner, 'scopes_for_changes', return_value=(('checks',), [])), \
                patch.object(agent_worktree.test_runner, 'changed_contents', return_value={}), \
                patch.object(evidence, 'verify', side_effect=ValueError('expired')), \
                patch.object(agent_worktree.test_evidence, 'key', return_value='local-state'), \
                patch.object(agent_worktree.test_evidence, 'read', return_value={'passed': ['checks']}):
            receipt = agent_worktree.require_verified(self.root, 'master', {'README.md'})
        self.assertEqual(receipt['source'], 'local')


class WorktreePlanEvidenceTests(unittest.TestCase):
    def setUp(self):
        folder = self.enterContext(tempfile.TemporaryDirectory())
        self.root = seed_repository(Path(folder).resolve() / 'worker', {
            '.gitignore': 'build/\n',
            'frontend/e2e/old.test.ts': '// fixture\n',
            'scripts/ci-browser-timings.json': json.dumps({'seconds': {'frontend/e2e/old.test.ts': 7}}),
            'tests/test_follow.py': 'import peach.ci_scope_fixture\n',
            'src/peach/ci_scope_fixture.py': 'VALUE = 1\n',
        }, 'fixture worker')
        self.base = evidence.test_evidence.git(self.root, 'rev-parse', 'HEAD')
        evidence.test_evidence.git(self.root, 'checkout', '-b', 'agent/codex/worker')

    def commit(self, name, content):
        (self.root / name).write_text(content, encoding='utf8')
        evidence.test_evidence.git(self.root, 'add', '--', name)
        evidence.test_evidence.git(self.root, 'commit', '-m', 'test: worker content')

    def test_main_imported_planner_uses_the_worker_browser_files_for_auto_and_full(self):
        self.commit('frontend/e2e/new.test.ts', '// worker fixture\n')
        for full in (False, True):
            with self.subTest(full=full):
                plan, scopes = evidence.selected_plan(self.root, 'pull_request', self.base, full=full)
                files = {name for row in plan['browser_matrix']['include'] for name in json.loads(row['files'])}
                self.assertEqual(files, {'frontend/e2e/old.test.ts', 'frontend/e2e/new.test.ts'})
                if full:
                    self.assertEqual(scopes, ('full',))
                else:
                    self.assertEqual(len(plan['matrix']['include']), 2)

    def test_main_imported_coordinator_requires_the_worker_consumer_scope(self):
        self.commit('src/peach/ci_scope_fixture.py', 'VALUE = 2\n')
        head = evidence.test_evidence.git(self.root, 'rev-parse', 'HEAD')
        observed = []
        def verified(root, run_id, scopes, target):
            observed.append(scopes)
            return {'source': 'github', 'run_id': run_id, 'head': head}
        with patch.object(agent_worktree, 'require_metadata', return_value=head), \
                patch.object(evidence, 'verify', side_effect=verified):
            agent_worktree.require_verified(self.root, 'master', ['src/peach/ci_scope_fixture.py'], ci_run=123)
        self.assertEqual(observed, [('follow',)])
