"""正式测试的单项覆盖与恢复计划；用例文件是最小复用边界。"""
from __future__ import annotations

import ast
from contextlib import contextmanager
import json
import os
from itertools import combinations
from pathlib import Path
import sys
import re
import time

if str(Path(__file__).resolve().parents[1] / "src") not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from peach.interface_text import dev as t  # noqa: E402

from . import change_impact

EXTERNAL = {'frontend/e2e/': 'test_web_e2e.py', 'frontend/test/': 'test_frontend_build.py'}
CONTAINERS = {
    'test_web_e2e.WebE2ESmokeTests.test_every_route_holds_the_layout_and_runtime_invariants': 'frontend/e2e/',
    'test_web_e2e.SetupE2ETests.test_the_first_run_page_writes_errors_back_and_finishes': 'frontend/e2e/setup.test.ts',
    'test_frontend_build.VitestTests.test_the_island_suite_passes': 'frontend/test/',
}
OUTCOMES = frozenset({'pass', 'fail', 'unknown'})
SETUP_PREFIXES = ('frontend/src/react/pages/setup/', 'resources/setup/')
PAGE_BUNDLES = frozenset({'web/dist/peach-pages.js', 'web/dist/peach-pages.css'})


def external_files(root: Path, module: str) -> set[str]:
    prefixes = [prefix for prefix, parent in EXTERNAL.items() if parent == module]
    return {path.relative_to(root).as_posix() for prefix in prefixes
            for path in (root / prefix).rglob('*')
            if path.is_file() and path.name.endswith(('.test.ts', '.test.tsx')
                                                     if prefix == 'frontend/test/' else '.test.ts')}


def owner(unit: str) -> str:
    if unit.startswith('case:'):
        return unit.removeprefix('case:').split('.', 1)[0] + '.py'
    return next((module for prefix, module in EXTERNAL.items() if unit.startswith(prefix)), unit)


def container_files(root: Path, case: str) -> set[str]:
    prefix = CONTAINERS[case]
    names = {name for name in external_files(root, owner('case:' + case)) if name.startswith(prefix)}
    if case.endswith('test_every_route_holds_the_layout_and_runtime_invariants'):
        names.discard('frontend/e2e/setup.test.ts')
    return names


def scope_units(root: Path, scope: str, select, supplements=None) -> set[str]:
    modules = {path.name for path in select(scope)}
    units = modules | {name for module in modules for name in external_files(root, module)}
    units.update('case:' + case for case in CONTAINERS if owner('case:' + case) in modules)
    for test_id in (supplements or {}).get(scope, ()):
        module = test_id.split('.', 1)[0] + '.py'
        if module not in modules:
            units.add('case:' + test_id)
    return units


def import_graph(root: Path) -> dict[str, set[str]]:
    graph = {}
    for path in (root / 'tests').glob('test_*.py'):
        try:
            tree = ast.parse(path.read_text(encoding='utf8'))
        except (OSError, SyntaxError, UnicodeError):
            continue
        imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.update(alias.name.removeprefix('tests.').split('.')[0] for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                imports.add((node.module or '').removeprefix('tests.').split('.')[0])
                if node.module in (None, 'tests'):
                    imports.update(alias.name for alias in node.names)
        graph[path.name] = {name + '.py' for name in imports if name.startswith('test_')}
    return graph


def test_importers(root: Path, module: str, graph=None) -> set[str]:
    graph = import_graph(root) if graph is None else graph
    found = {module}
    while additions := {name for name, imports in graph.items() if imports & found} - found:
        found.update(additions)
    return found


class ImpactPlan:
    """一次输入快照内复用域、测试依赖和路径影响；跨快照重新规划。"""

    def __init__(self, root, all_units, resolve, select):
        self.root, self.all_units, self.resolve, self.select = root, all_units, resolve, select
        self.scopes, self.paths = {}, {}
        self.graph = None

    def scope(self, name):
        if name not in self.scopes:
            self.scopes[name] = scope_units(self.root, name, self.select)
        return self.scopes[name]

    def path(self, path, kind):
        key = (path, kind)
        if key not in self.paths:
            invalid = self.calculate(path, kind)
            invalid.update(name for name in self.all_units if name.startswith('case:') and owner(name) in invalid)
            if kind != 'unsafe' and (path.startswith(SETUP_PREFIXES) or path in PAGE_BUNDLES):
                # 独立页面不加载主应用；Python 契约、打包、组件与 setup 浏览器检查仍执行。
                invalid.difference_update(name for name in self.all_units
                                          if name.startswith('frontend/e2e/') and name != 'frontend/e2e/setup.test.ts')
                invalid.discard('case:test_web_e2e.WebE2ESmokeTests.test_every_route_holds_the_layout_and_runtime_invariants')
            self.paths[key] = invalid
        return self.paths[key]

    def calculate(self, path, kind):
        if kind not in {'unsafe', 'prose'} and path.startswith('tests/test_') and path.endswith('.py'):
            if self.graph is None:
                self.graph = import_graph(self.root)
            modules = test_importers(self.root, Path(path).name, self.graph)
            return {unit for unit in self.all_units if owner(unit) in modules} | self.scope('checks')
        if kind != 'unsafe' and path.startswith(tuple(EXTERNAL)) and path.endswith(('.test.ts', '.test.tsx')):
            return ({path, owner(path), 'test_frontend_build.py'} | self.scope('checks')
                    | {'case:' + case for case in CONTAINERS if path in container_files(self.root, case)})
        scopes, _ = self.resolve([path], kinds={path: kind} if kind else {})
        return set().union(*(self.scope(scope) for scope in scopes))


def affected(root: Path, record: dict, context: dict, all_units: set[str], resolve, select, *, plan=None) -> set[str]:
    if record.get('environment') != context['environment']:
        return set(all_units)
    paths, kinds = change_impact.delta(record['manifest'], context['manifest'])
    plan = plan or ImpactPlan(root, all_units, resolve, select)
    invalid = set()
    for path in paths:
        invalid.update(plan.path(path, kinds.get(path)))
    return invalid & all_units


def eligible(root: Path, record: dict, context: dict, all_units: set[str], resolve, select, *, plan=None) -> dict:
    invalid = affected(root, record, context, all_units, resolve, select, plan=plan)
    units = dict(record.get('units', {}))
    if not units:
        cohort = record.get('cohort')
        if cohort:
            units.update({name: {'outcome': 'pass', 'at': stamp, 'cohort': cohort}
                          for name, stamp in record.get('coverage', {}).items()})
        for scope in record.get('passed', ()):
            stamp = record['validated'][scope]
            cohort = record.get('cohort') or (record.get('state') if scope == 'full' else None)
            units.update({name: {'outcome': 'pass', 'at': stamp, 'cohort': cohort}
                          for name in recorded_scope(root, scope, select)})
        for scope in record.get('failed_scopes', ()):
            units.update({name: {'outcome': 'fail', 'at': record.get('finished', 0)}
                          for name in recorded_scope(root, scope, select)})
    for name in all_units:
        if name.startswith('case:') and name not in units and owner(name) in units:
            units[name] = units[owner(name)]
    return {name: row for name, row in units.items() if name in all_units and name not in invalid}


def recorded_scope(root, scope, select):
    try:
        return scope_units(root, scope, select)
    except (KeyError, ValueError):
        return set()


def combine(root: Path, records, context: dict, all_units: set[str], resolve, select) -> dict:
    merged = {}
    plan = ImpactPlan(root, all_units, resolve, select)
    for record in records:
        for name, row in eligible(root, record, context, all_units, resolve, select, plan=plan).items():
            previous = merged.get(name)
            rank = (row['at'], row['outcome'] != 'pass')
            if previous is None or rank > (previous['at'], previous['outcome'] != 'pass'):
                merged[name] = row
    return merged


def passed_units(units: dict) -> set[str]:
    return {name for name, row in units.items() if row.get('outcome') == 'pass'}


def without_requested(units: dict, required: set[str]) -> dict:
    modules = {name for name in required if name.endswith('.py')}
    return {name: row for name, row in units.items() if name not in required and owner(name) not in modules}


def validated(units: dict, requirements: dict[str, set[str]], *, allow_full=False) -> dict:
    successful = passed_units(units)
    return {scope: min(units[name]['at'] for name in names)
            for scope, names in requirements.items()
            if names and names <= successful and (scope != 'full' or allow_full)}


def row_unit(test_id: str, assigned: set[str]) -> str | None:
    for prefix in ('e2e:', 'vitest:'):
        if test_id.startswith(prefix):
            return 'frontend/' + test_id.removeprefix(prefix).split(' > ', 1)[0].replace('\\', '/')
    match = re.search(r'\btest_\w+', test_id)
    module = match.group(0) + '.py' if match else None
    return module if module in assigned else None


def result_cases(identity: str, cases):
    if identity in cases:
        return (identity,)
    if identity.startswith(('setUpClass ', 'tearDownClass ', 'setUpModule ', 'tearDownModule ')):
        holder = re.search(r'\((test_\w+(?:\.\w+)?)\)', identity)
        if holder:
            return tuple(case for case in cases if case.startswith(holder.group(1) + '.'))
    return ()


def unattributed_failure(assigned, report, cases):
    return any(row.get('outcome') in {'fail', 'error'} and row_unit(str(row.get('id', '')), assigned) is None
               and not result_cases(str(row.get('id', '')), cases) for row in report.get('results', ()))


def grouped_results(assigned, report, cases):
    """归集叶子结果、补充用例和外部文件终态。"""
    grouped = {}
    completed_files = set()
    for row in report.get('results', ()):
        identity = str(row.get('id', ''))
        for case in result_cases(identity, cases):
            grouped.setdefault('case:' + case, []).append(row.get('outcome'))
        unit = row_unit(identity, assigned)
        if unit is not None:
            grouped.setdefault(unit, []).append(row.get('outcome'))
            if row.get('file_complete') is True and row.get('outcome') == 'pass':
                completed_files.add(unit)
    return grouped, completed_files


def report_units(assigned, report: dict, *, clean_exit: bool, external=None, cases=(), stamp=None) -> dict:
    """分片完整报告中有明确结果的文件；缺失或异常报告不产生成功证明。"""
    stamp = time.time() if stamp is None else stamp
    assigned = {Path(item).name for item in assigned}
    grouped, completed_files = grouped_results(assigned, report, cases)
    result = {}
    for unit, outcomes in grouped.items():
        failed = any(outcome in {'fail', 'error'} for outcome in outcomes)
        outcome = 'pass' if set(outcomes) <= {'pass', 'skip'} else 'fail' if failed else 'unknown'
        if unit.startswith('frontend/') and outcome == 'pass' and unit not in completed_files:
            outcome = 'unknown'
        result[unit] = {'outcome': outcome, 'at': stamp}
    for module in assigned:
        measured = module.removesuffix('.py') in report.get('files', {}) or module in grouped
        if (clean_exit and report.get('success') and report.get('count', 0) > 0 and measured
                and result.get(module, {}).get('outcome') != 'fail'):
            result[module] = {'outcome': 'pass', 'at': stamp}
            for unit in (external or {}).get(module, ()):
                if result.get(unit, {}).get('outcome') != 'fail':
                    result[unit] = {'outcome': 'pass', 'at': stamp}
        elif module not in grouped:
            result[module] = {'outcome': 'unknown', 'at': stamp}
    if (not clean_exit or report.get('count', 0) <= 0
            or unattributed_failure(assigned, report, cases)):
        result = {name: {**row, 'outcome': 'unknown'} if row['outcome'] == 'pass' else row
                  for name, row in result.items()}
    return result


def pending_modules(required: set[str], units: dict) -> set[str]:
    return {owner(unit) for unit in required - passed_units(units)}


def choose_scopes(pending: set[str], requirements: dict[str, set[str]], candidates) -> tuple[str, ...]:
    if not pending:
        return ()
    best = None
    for size in range(1, len(candidates) + 1):
        for chosen in combinations(candidates, size):
            covered = set().union(*(requirements[name] for name in chosen))
            missing = {name for name in pending if name not in covered
                       and not (name.startswith('case:') and owner(name) in covered)}
            if not missing:
                cost = (len(covered), size, chosen)
                if best is None or cost < best:
                    best = cost
    return best[2] if best is not None else ('full',)


def external_plan(root: Path, modules, units: dict) -> dict:
    successful = passed_units(units)
    return {module: sorted(external_files(root, module) - successful)
            for module in modules if module in EXTERNAL.values()}


def validate_cached_results(rows: dict, valid_seconds: float):
    now = time.time()
    for row in rows.values():
        if (not isinstance(row, dict) or row.get('outcome') != 'pass'
                or type(row.get('at')) not in (int, float) or not 0 <= now - row['at'] < valid_seconds):
            raise ValueError(t("test_resume.cachedProofUnusable"))


def validate_child_plan(root: Path, data: dict, *, state: str, valid_seconds: float) -> dict:
    if not isinstance(data, dict) or data.get('state') != state:
        raise ValueError(t("test_resume.otherSnapshot"))
    expected, selected, cached = data.get('expected'), data.get('external'), data.get('cached')
    if not all(isinstance(value, dict) for value in (expected, selected, cached)):
        raise ValueError(t("test_resume.badFormat"))
    if expected.keys() != selected.keys() or not set(expected) <= set(EXTERNAL.values()):
        raise ValueError(t("test_resume.badContainers"))
    universe = set()
    for module, names in expected.items():
        actual = external_files(root, module)
        if not isinstance(names, list) or set(names) != actual or not isinstance(selected[module], list):
            raise ValueError(t("test_resume.fileSetMismatch"))
        active = set(selected[module])
        if not active <= actual or active & cached.keys() or actual - active != actual & cached.keys():
            raise ValueError(t("test_resume.missingFileProof"))
        universe.update(actual)
    if not set(cached) <= universe:
        raise ValueError(t("test_resume.proofOutsideContainers"))
    validate_cached_results(cached, valid_seconds)
    containers = data.get('containers', {})
    if not isinstance(containers, dict) or not set(containers) <= set(CONTAINERS):
        raise ValueError(t("test_resume.badContainerProof"))
    validate_cached_results(containers, valid_seconds)
    universe, active_cases = data.get('case_universe', ()), data.get('cases', ())
    case_cached = data.get('case_cached', {})
    if (not isinstance(case_cached, dict) or not set(active_cases) <= set(universe)
            or set(case_cached) != set(universe) - set(active_cases)):
        raise ValueError(t("test_resume.missingCaseProof"))
    validate_cached_results(case_cached, valid_seconds)
    active = set().union(*map(set, selected.values())) if selected else set()
    allowed = {case for case in containers if container_files(root, case)
               and container_files(root, case) <= cached.keys() and not container_files(root, case) & active}
    if set(data.get('skip_cases', ())) != allowed:
        raise ValueError(t("test_resume.unverifiedPythonSkipped"))
    return data


@contextmanager
def selection_environment(plan, active_module=None):
    changed = {}
    for module, variable in (('test_web_e2e.py', 'PEACH_E2E_FILES'),
                              ('test_frontend_build.py', 'PEACH_VITEST_FILES')):
        if module in plan.get('external', {}) and (active_module is None or active_module == module):
            changed[variable] = os.environ.get(variable)
            os.environ[variable] = json.dumps([name.removeprefix('frontend/') for name in plan['external'][module]])
    if plan.get('focus'):
        changed['PEACH_TEST_FOCUS'] = os.environ.get('PEACH_TEST_FOCUS')
        os.environ['PEACH_TEST_FOCUS'] = '1'
    try:
        yield
    finally:
        for key, value in changed.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def filter_suite(suite, plan, assigned, suite_type):
    selected = suite_type()
    skipped = set(plan.get('skip_cases', ()))
    for test in suite:
        if isinstance(test, suite_type):
            selected.addTests(filter_suite(test, plan, assigned, suite_type))
        elif test.id() not in skipped and not (
                test.id() in plan.get('case_universe', ()) and test.id() not in plan.get('cases', ())
                and test.id().split('.', 1)[0] + '.py' not in assigned):
            selected.addTest(test)
    return selected
