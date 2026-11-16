"""诊断 ZIP 的后台生成、进度与取消；产物只写本机缓存目录。"""
from __future__ import annotations

import re
import threading

from .jobs import BackgroundJob
from .scraping_diagnostics import ExportCancelled, selected_codes
from .task_stages import stage as stage_fields
from .os_errors import UserFileNotFoundError
from .user_messages import UserValueError


class DiagnosticExports:
    def __init__(self, config, *, runs=None):
        self.config = config
        self.root = config.directory('generated') / 'diagnostic-exports'
        self.job = BackgroundJob('PeachDiagnosticExport', task_key='diagnostic-export', runs=runs)
        self.lock = threading.Lock()
        self.cancelled = threading.Event()

    def snapshot(self):
        return self.job.snapshot() or {'status': 'idle'}

    def start(self, kind, codes='', *, report=None, browser=None):
        if kind not in ('support', 'scraping'):
            raise UserValueError('errors.diagnosticExports.chooseKind')
        selected_codes(codes)
        with self.lock:
            if self.snapshot()['status'] in ('running', 'cancelling'):
                raise UserValueError('errors.diagnosticExports.alreadyRunning')
            self.cancelled = threading.Event()
            cancelled = self.cancelled
            previous = self.snapshot().get('job_id', '')
            if re.fullmatch(r'[a-f0-9]{32}', previous):
                try:
                    (self.root / f'{previous}.zip').unlink(missing_ok=True)
                except OSError:
                    pass

            def work(identity):
                self.root.mkdir(parents=True, exist_ok=True)
                pending = self.root / f'{identity}.part'
                final = self.root / f'{identity}.zip'
                def progress(**values):
                    if cancelled.is_set():
                        raise ExportCancelled()
                    self.job.update(identity, **values)
                try:
                    if kind == 'scraping':
                        from .scraping_diagnostics import bundle_to
                        bundle_to(self.config, pending, codes=codes, progress=progress, cancelled=cancelled.is_set)
                    else:
                        from .support_bundle import bundle_to
                        progress(**stage_fields('diagnostics.readSystem'), done=0, total=0)
                        try:
                            facts = report() if callable(report) else report
                        except Exception:
                            facts = None
                        bundle_to(pending, config=self.config, report=facts, browser=browser,
                                  progress=progress, cancelled=cancelled.is_set)
                    with self.job.editing(identity) as state:
                        if state is None or cancelled.is_set():
                            raise ExportCancelled()
                        pending.replace(final)
                        state.update(status='complete', **stage_fields('diagnostics.done'), bytes=final.stat().st_size,
                                     download_url=f'/api/diagnostics/exports/{identity}/download')
                except ExportCancelled:
                    self.job.update(identity, status='cancelled', **stage_fields('diagnostics.cancelled'), error='')
                finally:
                    pending.unlink(missing_ok=True)

            return self.job.start(work, restart=True, initial={'kind': kind, **stage_fields('diagnostics.prepare'),
                                                              'done': 0, 'total': 0, 'files': 0, 'rows': 0})

    def cancel(self, identity):
        with self.job.editing(identity) as state:
            if state is None:
                raise UserValueError('errors.diagnosticExports.jobChanged')
            if state['status'] in ('running', 'cancelling'):
                self.cancelled.set()
                state.update(status='cancelling', **stage_fields('diagnostics.cancelling'))
        if self.job.runs is not None:
            self.job.stop(resume=False)
        return self.snapshot()

    def download(self, identity):
        if not re.fullmatch(r'[a-f0-9]{32}', identity):
            raise UserFileNotFoundError('errors.diagnosticExports.jobNotFound')
        state = self.snapshot()
        path = self.root / f'{identity}.zip'
        if state.get('job_id') != identity or state.get('status') != 'complete' or not path.is_file():
            raise UserFileNotFoundError('errors.diagnosticExports.fileNotReady')
        return path, 'peach-scraping.zip' if state['kind'] == 'scraping' else 'peach-support.zip'


_MANAGER_LOCK = threading.Lock()


def manager(request):
    from . import settings_file
    with _MANAGER_LOCK:
        state = request.app.state
        if not hasattr(state, 'diagnostic_exports'):
            state.diagnostic_exports = DiagnosticExports(settings_file.load_config(),
                                                         runs=state.web_contract.task_runs)
        return state.diagnostic_exports
