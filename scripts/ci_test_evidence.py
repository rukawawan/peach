"""以 GitHub 的运行、作业和摘要验证相同内容的跨平台测试证明。"""
from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import zipfile

if not __package__:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    __package__ = 'scripts'
from peach.interface_text import dev as t

from . import change_impact, ci_plan, test_evidence, test_runner


WORKFLOW = '.github/workflows/test.yml'
# 改动证明生成、选测和执行协议时，先经本机验证，再成为主线信任的协议。
POLICY = (WORKFLOW, '.github/actions', 'scripts/ci_test_evidence.py', 'scripts/ci_plan.py',
          ':(glob)scripts/test*', 'scripts/ci_scope.py',
          'scripts/change_impact.py', 'scripts/agent_worktree.py')


def api(root: Path, endpoint: str, *, binary: bool = False):
    result = subprocess.run(['gh', 'api', endpoint], cwd=root, capture_output=True, check=True)
    return result.stdout if binary else json.loads(result.stdout)


def repository(root: Path) -> str:
    result = subprocess.run(['gh', 'repo', 'view', '--json', 'nameWithOwner'], cwd=root,
                            capture_output=True, text=True, encoding='utf8', check=True)
    return json.loads(result.stdout)['nameWithOwner']


def selected_plan(root: Path, event: str, base: str, *, full: bool = False) -> tuple[dict, tuple[str, ...]]:
    if full:
        return ci_plan.plan('workflow_dispatch', [], root=root), ('full',)
    paths = test_runner.changed_files(root, base)
    contents = test_runner.changed_contents(root, base, paths)
    scopes, _ = test_runner.scopes_for_changes(paths, contents=contents, root=root)
    plan = ci_plan.plan(event, paths, contents, root=root)
    return plan, ('full',) if plan['wide'] else scopes


def expected_jobs(plan: dict) -> set[str]:
    names = {'Actions 工作流静态检查', 'plan', '前端检查结果', '完整验证结果'}
    names.update(f"{row['os']} / Python {row['python']} / {row['scope']} / {row['shard_index']}"
                 for row in plan['matrix']['include'])
    if plan['frontend']:
        names.add('island 产物与前端测试')
    if plan['vendor']:
        names.add('固定前端依赖')
    if plan['wheel']:
        names.add('wheel-build')
        names.update(f"wheel 最小安装 / {row['os']} / {row['python']}"
                     for row in plan['wheel_matrix']['include'])
    if plan['browser']:
        names.update(f"浏览器回归 / {row['index']}" for row in plan['browser_matrix']['include'])
    return names


def export(root: Path, base: str, destination: Path, *, full: bool = False) -> dict:
    if os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('GITHUB_JOB') != 'plan':
        raise ValueError(t("ci_test_evidence.planJobOnly"))
    event = os.environ['GITHUB_EVENT_NAME']
    if full:
        # 全量不依赖差异；首次推送没有已验证祖先时仍能证明完整覆盖。
        base = test_evidence.git(root, 'rev-parse', 'HEAD')
    plan, scopes = selected_plan(root, event, base, full=full)
    proof = {'schema': 1, 'repository': os.environ['GITHUB_REPOSITORY'],
             'run_id': int(os.environ['GITHUB_RUN_ID']),
             'attempt': int(os.environ['GITHUB_RUN_ATTEMPT']), 'event': event,
             'checkout': test_evidence.git(root, 'rev-parse', 'HEAD'),
             'tree': test_evidence.git(root, 'rev-parse', 'HEAD^{tree}'),
             'base': base, 'scopes': list(scopes), 'plan': plan}
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    return proof


def read_artifact(root: Path, repo: str, run_id: int, attempt: int) -> dict:
    payload = api(root, f'repos/{repo}/actions/runs/{run_id}/artifacts?per_page=100')
    matches = [row for row in payload['artifacts'] if re.fullmatch(r'test-proof-[1-9]\d*', row['name'])
               and int(row['name'].removeprefix('test-proof-')) <= attempt]
    if not matches:
        raise ValueError(t("ci_test_evidence.noFreshProof"))
    artifact = max(matches, key=lambda row: int(row['name'].removeprefix('test-proof-')))
    if artifact['expired']:
        raise ValueError(t("ci_test_evidence.proofExpired"))
    data = api(root, f"repos/{repo}/actions/artifacts/{artifact['id']}/zip", binary=True)
    if artifact.get('digest') != 'sha256:' + hashlib.sha256(data).hexdigest():
        raise ValueError(t("ci_test_evidence.digestMismatch"))
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if archive.namelist() != ['ci-proof.json'] or archive.getinfo('ci-proof.json').file_size > 1_048_576:
            raise ValueError(t("ci_test_evidence.proofInvalid"))
        proof = json.loads(archive.read('ci-proof.json'))
        if not isinstance(proof, dict) or proof.get('attempt') != int(artifact['name'].removeprefix('test-proof-')):
            raise ValueError(t("ci_test_evidence.attemptMismatch"))
        return proof


def validate_run(root: Path, repo: str, run: dict) -> str:
    head = test_evidence.git(root, 'rev-parse', 'HEAD')
    if (run.get('path') != WORKFLOW or run.get('event') not in {'push', 'pull_request', 'workflow_dispatch'}
            or run.get('status') != 'completed' or run.get('conclusion') != 'success'
            or run.get('head_sha') != head
            or run.get('repository', {}).get('full_name') != repo
            or run.get('head_repository', {}).get('full_name') != repo):
        raise ValueError(t("ci_test_evidence.runMismatch"))
    finished = datetime.fromisoformat(run['updated_at'].replace('Z', '+00:00')).timestamp()
    if not 0 <= time.time() - finished < test_evidence.VALID_SECONDS:
        raise ValueError(t("ci_test_evidence.ciProofExpired"))
    return head


def validate(root: Path, repo: str, run: dict, proof: dict, jobs: list[dict],
             scopes: tuple[str, ...], target: str) -> dict:
    head = validate_run(root, repo, run)
    changes = test_evidence.git(root, 'diff', '--name-only', target, 'HEAD', '--', *POLICY).splitlines()
    contents = test_runner.changed_contents(root, target, changes)
    if any(path not in contents or change_impact.kind(path, *contents[path]) != 'prose' for path in changes):
        raise ValueError(t("ci_test_evidence.protocolChanged"))
    if (not isinstance(proof, dict) or proof.get('schema') != 1
            or proof.get('repository') != repo or proof.get('run_id') != run['id']
            or type(proof.get('attempt')) is not int or not 1 <= proof['attempt'] <= run['run_attempt']
            or proof.get('event') != run['event']
            or proof.get('tree') != test_evidence.git(root, 'rev-parse', 'HEAD^{tree}')
            or not isinstance(proof.get('plan'), dict)
            or not isinstance(proof.get('checkout'), str)
            or not re.fullmatch('[0-9a-f]{40}', proof['checkout'])
            or not isinstance(proof.get('base'), str)
            or not re.fullmatch('[0-9a-f]{40}', proof['base'])):
        raise ValueError(t("ci_test_evidence.identityMismatch"))
    full = proof['plan'].get('wide') is True
    if not full:
        subprocess.run(['git', '-C', str(root), 'merge-base', '--is-ancestor', proof['base'], head],
                       check=True, capture_output=True)
    plan, tested_scopes = selected_plan(root, run['event'], proof['base'], full=full)
    if proof.get('plan') != plan or proof.get('scopes') != list(tested_scopes):
        raise ValueError(t("ci_test_evidence.planMismatch"))
    if 'full' not in tested_scopes and not set(scopes) <= set(tested_scopes):
        raise ValueError(t("ci_test_evidence.scopeNotCovered"))
    required = expected_jobs(plan)
    found = {row['name']: row for row in jobs}
    if len(found) != len(jobs) or any(found.get(name, {}).get('conclusion') != 'success'
                                       or found[name].get('status') != 'completed' for name in required):
        raise ValueError(t("ci_test_evidence.missingJobs"))
    if any(row.get('conclusion') not in {'success', 'skipped'} for row in jobs):
        raise ValueError(t("ci_test_evidence.unfinishedJobs"))
    return {'source': 'github', 'repository': repo, 'run_id': run['id'], 'attempt': run['run_attempt'],
            'head': head, 'tree': proof['tree'], 'base': proof['base'], 'scopes': list(tested_scopes),
            'jobs': sorted(required), 'url': run['html_url']}


def verify(root: Path, run_id: int, scopes: tuple[str, ...], target: str) -> dict:
    if type(run_id) is not int or run_id <= 0:
        raise ValueError(t("ci_test_evidence.runIdPositive"))
    repo = repository(root)
    run = api(root, f'repos/{repo}/actions/runs/{run_id}')
    validate_run(root, repo, run)
    # 只重跑失败任务时，计划和已成功任务沿用原尝试；latest 取每个任务最后一次结果。
    payload = api(root, f'repos/{repo}/actions/runs/{run_id}/jobs?filter=latest&per_page=100')
    if payload['total_count'] != len(payload['jobs']):
        raise ValueError(t("ci_test_evidence.jobListIncomplete"))
    proof = read_artifact(root, repo, run_id, run['run_attempt'])
    return validate(root, repo, run, proof, payload['jobs'], scopes, target)


def receipt_path(root: Path) -> Path:
    return test_evidence.evidence_dir(root) / 'github' / (test_evidence.git(root, 'rev-parse', 'HEAD') + '.json')


def remember(root: Path, receipt: dict) -> None:
    path = receipt_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f'.{os.getpid()}.tmp')
    temporary.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    temporary.replace(path)


def remembered(root: Path) -> int | None:
    path = receipt_path(root)
    if not path.exists():
        return None
    value = json.loads(path.read_text(encoding='utf8'))['run_id']
    if type(value) is not int or value <= 0:
        raise ValueError(t("ci_test_evidence.receiptRunIdInvalid"))
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=t("ci_test_evidence.description"))
    parser.add_argument('--base', required=True)
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--wide', choices=('true', 'false'), required=True)
    args = parser.parse_args()
    export(Path(__file__).resolve().parents[1], args.base, args.destination, full=args.wide == 'true')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
