"""正式父运行的覆盖检查点，继承原时间并保留已完成单项。"""
from __future__ import annotations

import time
from contextlib import contextmanager
from pathlib import Path

from . import test_evidence as evidence, test_resume as resume


@contextmanager
def phase(timings, name):
    started = time.monotonic()
    try:
        yield
    finally:
        timings[name] = timings.get(name, 0) + time.monotonic() - started


class RunProgress:
    def __init__(self, root, context, scopes, select, resolve, scope_names, *, supplements=None,
                 force=False, records=(), previous=None, cohort=None):
        self.root, self.context, self.scopes = root, context, scopes
        self.phases = {}
        self.select, self.resolve = select, resolve
        self.scope_names, self.supplements = tuple(scope_names), supplements or {}
        records = list(records)
        self.sources = [record.get('state') for record in records if record.get('state')]
        known_scopes = dict.fromkeys(('full', *self.scope_names, *scopes))
        self.requirements = {scope: resume.scope_units(root, scope, select, supplements)
                             for scope in known_scopes}
        self.all_units = set().union(*self.requirements.values())
        self.required = set().union(*(self.requirements[scope] for scope in scopes))
        self.units = resume.combine(root, records, context, self.all_units, resolve, select)
        self.previous = previous or {}
        inherited = next((record.get('cohort') or record.get('state') for record in records
                          if record.get('cohort') or 'full' in record.get('passed', ())), None)
        self.cohort = context['state'] if force and 'full' in scopes else cohort or inherited
        if self.cohort is None and 'full' in scopes:
            self.cohort = context['state']
        if 'full' in scopes:
            self.units = {name: row for name, row in self.units.items()
                          if row.get('cohort') == self.cohort or row.get('outcome') != 'pass'}
        self.observed = 0
        if force:
            self.units = resume.without_requested(self.units, self.required)
        for case in resume.CONTAINERS:
            if resume.container_files(root, case) - resume.passed_units(self.units):
                self.units.pop('case:' + case, None)
        self.pending = self.required - resume.passed_units(self.units)
        self.modules = resume.pending_modules(self.required, self.units)
        self.external = resume.external_plan(root, self.modules, self.units)
        self.cases = {name.removeprefix('case:') for name in self.all_units if name.startswith('case:')}

    def start(self):
        stamp = time.time()
        self.units.update({name: {'outcome': 'unknown', 'at': stamp, 'cohort': self.cohort}
                           for name in self.pending})
        self.persist()

    def checkpoint(self, assigned, report, clean_exit):
        self.observed += 1
        assigned = {Path(name).name for name in assigned}
        if report.get('complete') is not True:
            return False
        completed = resume.report_units(assigned, report, clean_exit=clean_exit, external=self.external,
                                        cases=self.cases)
        current = evidence.inputs(self.root)
        invalid = resume.affected(self.root, self.context, current, self.all_units, self.resolve, self.select)
        self.units.update({name: {**row, 'cohort': self.cohort}
                           for name, row in completed.items() if name in self.all_units and name not in invalid})
        self.persist()
        return all(self.units.get(name, {}).get('outcome') == 'pass' for name in assigned)

    def accept_success(self, reruns=()):
        if not self.observed:
            names = self.pending
        else:
            names = set()
            for selector in reruns:
                name = selector if selector.startswith('frontend/') else selector.split('.', 1)[0] + '.py'
                if '.' not in selector and not selector.startswith('frontend/'):
                    names.update(unit for unit in self.all_units if resume.owner(unit) == name)
                else:
                    names.add('case:' + selector)
                    if selector.startswith('frontend/'):
                        names.add(name)
                        names.update('case:' + case for case in resume.CONTAINERS
                                     if name in resume.container_files(self.root, case))
                    if resume.owner(name) in self.required:
                        names.add(resume.owner(name))
        stamp = time.time()
        self.units.update({name: {'outcome': 'pass', 'at': stamp, 'cohort': self.cohort}
                           for name in names if name in self.all_units})

    def complete(self):
        return self.required <= resume.passed_units(evidence.live_units(self.units) or {})

    def full_coverage(self):
        if not self.cohort:
            return {}
        successful = {name for name, row in self.units.items()
                      if row['outcome'] == 'pass' and row.get('cohort') == self.cohort}
        return {module: min(self.units[name]['at'] for name in {module, *resume.external_files(self.root, module)})
                for module in self.requirements['full'] if module.endswith('.py')
                and {module, *resume.external_files(self.root, module)} <= successful}

    def persist(self, *, final=False, success=False, elapsed=0, slowest=None, count=0, flaky=None):
        coverage = self.full_coverage()
        full = bool(self.cohort) and bool(self.requirements['full']) and self.requirements['full'] <= {
            name for name, row in self.units.items()
            if row['outcome'] == 'pass' and row.get('cohort') == self.cohort}
        validated = resume.validated(self.units, self.requirements, allow_full=final and success and full)
        failed = {scope for scope, names in self.requirements.items()
                  if any(self.units.get(name, {}).get('outcome') == 'fail' for name in names)}
        prior = {**self.previous, 'validated': validated, 'failed_scopes': sorted(failed)}
        evidence.write(self.root, self.context['state'], (), success=final and success, previous=prior,
                       context=self.context, cohort=self.cohort, coverage=coverage, units=self.units,
                       elapsed=elapsed, slowest=slowest or [], count=count, flaky=flaky, phases=self.phases,
                       baseline={'state': self.sources[0], 'validated': {}} if self.sources else None)

    def child_plan(self, scopes=None):
        scopes = self.scopes if scopes is None else scopes
        modules = {path.name for scope in scopes for path in self.select(scope)}
        supplements = {case for scope in scopes for case in self.supplements.get(scope, ())}
        cases = {case for case in self.cases if case in supplements or resume.owner('case:' + case) in modules}
        case_cached = {}
        for case in cases:
            proof = self.units.get('case:' + case, self.units.get(resume.owner('case:' + case), {}))
            if proof.get('outcome') == 'pass':
                case_cached[case] = proof
        external = resume.external_plan(self.root, self.external, self.units)
        expected = {module: sorted(resume.external_files(self.root, module)) for module in external}
        cached = {name: self.units[name] for names in expected.values() for name in names
                  if name in resume.passed_units(self.units)}
        containers = {case: proof for case, proof in case_cached.items() if case in resume.CONTAINERS}
        active = set().union(*map(set, external.values())) if external else set()
        skipped = [case for case in containers if resume.container_files(self.root, case)
                   and resume.container_files(self.root, case) <= cached.keys()
                   and not resume.container_files(self.root, case) & active]
        return {'state': self.context['state'], 'external': external, 'expected': expected,
                'cached': cached, 'containers': containers, 'skip_cases': skipped, 'case_universe': sorted(cases),
                'case_cached': case_cached, 'cases': sorted(cases - case_cached.keys())}

    def retain_current(self):
        current = evidence.inputs(self.root)
        source = {**self.context, 'units': self.units, 'cohort': self.cohort}
        retained = RunProgress(self.root, current, self.scopes, self.select, self.resolve, self.scope_names,
                               supplements=self.supplements, records=[source], cohort=self.cohort)
        retained.persist()
        return len(resume.passed_units(retained.units))
