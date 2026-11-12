"""Web 组合入口为可恢复任务装配领域处理器。"""
import sys
import threading
import time
import traceback
from datetime import timezone
from pathlib import Path

from .job_recovery import resume
from .web_library_processing import w_library_processing
from .web_scraping import w_scraping_cover, w_scraping_amane_rebuild
from .web_timeline_thumbnails import w_thumbnail_jobs
from .web_follow import w_follow_check, w_follow_resolve
from .web_feeds import w_feed_check
from .web_wants import start_scrape
from .web_links import w_links_check, w_links_prune
from .web_resource_sync import w_resource_sync_scan, w_resource_sync_apply
from .web_stats import w_taste_refresh
from .web_media_repair import w_media_repair
from .web_organize import w_organize_apply, w_organize_rollback
from apscheduler.schedulers.background import BackgroundScheduler

#: 一次接回超过这么久就记下卡在哪个任务、各线程停在哪一行；每次卡住只记一次。
STUCK_SECONDS = 30


def restore(contract, track=lambda key, handler: handler):
    from .jav_discovery_metadata import discovery_metadata
    from .job_recovery import read
    handlers = {
        "library-processing": lambda body: w_library_processing(contract, body, resume=True),
        "timeline-thumbnails": lambda body: w_thumbnail_jobs(contract, body),
        "scraping-cover": lambda body: w_scraping_cover(contract, body),
        "follow-check": lambda body: w_follow_check(contract, body),
        "feed-check": lambda body: w_feed_check(contract, body),
        "want-scrape": lambda _body: start_scrape(contract),
        "link-check": lambda body: w_links_check(contract, {**body, 'restart': True}),
        "resource-scan": lambda body: w_resource_sync_scan(contract, {**body, 'background': True}),
        "resource-apply": lambda body: w_resource_sync_apply(contract, body),
        "link-prune": lambda body: w_links_prune(contract, body),
        "follow-resolve": lambda body: w_follow_resolve(contract, body),
        "taste-refresh": lambda body: w_taste_refresh(contract, body),
        "media-repair": lambda body: w_media_repair(contract, body),
        "amane-bridge": lambda body: w_scraping_amane_rebuild(contract, body),
        'jav-discovery-metadata': lambda body: discovery_metadata(contract).ensure(
            body['codes'], refresh=body.get('refresh', False),
            _resume=read(contract.db_path, 'jav-discovery-metadata').get('checkpoint')),
        "organize": lambda body: (w_organize_rollback(contract, body) if body.get('action') == 'rollback'
                                    else w_organize_apply(contract, body)),
    }
    return resume(contract.db_path, {key: track(key, handler) for key, handler in handlers.items()})


def thread_stacks() -> dict[str, list[str]]:
    """各线程当前的调用栈，只留文件名、行号与函数名：完整路径会被本机日志脱敏成 `<path>`。"""
    names = {thread.ident: thread.name for thread in threading.enumerate()}
    return {f'{names.get(ident, "thread")}-{ident}': [
                f'{Path(frame.filename).name}:{frame.lineno} {frame.name}'
                for frame in traceback.extract_stack(stack)[-40:]]
            for ident, stack in sys._current_frames().items()}


class RecoveryService:
    """安装取消或完成后，现有服务也会接回等待中的任务。"""

    def __init__(self, contract, *, available):
        self.contract = contract
        self.available = available
        self.scheduler = BackgroundScheduler(timezone=timezone.utc)
        self._running_since = None
        self._step = None
        self._reported = False

    def start(self):
        if self.available and not self.scheduler.running:
            self.scheduler.add_job(self.tick, 'interval', seconds=1,
                                   max_instances=1, coalesce=True)
            self.scheduler.add_job(self.watch, 'interval', seconds=10,
                                   max_instances=1, coalesce=True)
            self.scheduler.start()

    def stop(self):
        if self.scheduler.running:
            self.scheduler.shutdown(wait=True)

    def _track(self, key, handler):
        def tracked(body):
            self._step = key
            return handler(body)
        return tracked

    def tick(self):
        from .update_tasks import is_pausing
        self._running_since, self._step, self._reported = time.monotonic(), 'update-pause-check', False
        try:
            if not is_pausing(self.contract.db_path):
                self._step = 'job-recovery'
                restore(self.contract, track=self._track)
                self._step = 'followups'
                self.contract.followups.resume_after_update()
        finally:
            self._running_since = self._step = None

    def watch(self, now=None):
        """接回卡住时只记一次：卡在哪一步、多久了、各线程停在哪一行（quan he，11-08）。

        卡住期间每秒的 tick 都被调度器跳过，日志里只剩「上一次还没执行完」，看不出卡在哪。"""
        started = self._running_since
        if started is None or self._reported:
            return
        elapsed = (time.monotonic() if now is None else now) - started
        if elapsed < STUCK_SECONDS:
            return
        self._reported = True
        from . import error_reporting
        error_reporting.local_event('job-recovery-stuck', step=self._step or 'unknown',
                                    seconds=round(elapsed), stacks=thread_stacks())
