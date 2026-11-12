"""采集资料与本地预览产物的额外磁盘占用预估。"""
from __future__ import annotations

from pathlib import Path
import shutil
import tempfile

from .processing_traffic_plan import MIB, typical_size


def volume_space(path):
    """按实际所在文件系统分账；未创建的目录沿父目录取可用空间。"""
    target = Path(path).resolve()
    while not target.exists() and target != target.parent:
        target = target.parent
    try:
        usage = shutil.disk_usage(target)
        return target.stat().st_dev, usage.free, str(target.anchor), usage.total
    except OSError:
        return str(target), None, str(target.anchor or target), None


class ProcessingStorage:
    def __init__(self, config):
        self.config = config
        self.generated = config.directory('generated')
        self.sources = config.directory('sources') / 'library-metadata'
        self.temporary = Path(tempfile.gettempdir())
        self.cover = typical_size(self.generated / 'covers', '*.jpg', MIB // 2)
        self.snapshot_bytes = typical_size(self.generated / 'snapshots', '**/*.jpg', MIB)
        self.document = typical_size(self.sources, '*.json', 32 * 1024)
        self.nfo = typical_size(self.sources, '*.nfo', 32 * 1024)

    def _pending_outputs(self, plan):
        """按待执行的资料与画面任务估算各类新增文件。"""
        covers, documents = set(), 0
        for token, profile in plan.profiles.items():
            if token not in plan.units:
                continue
            sources, _, cover = profile.removeprefix('jav:').partition(':cover=')
            documents += len([name for name in sources.split(',') if name])
            if cover == 'True':
                covers.add(token.removeprefix('metadata:'))
        local_documents = set()
        previews = set()
        from .media_processing_policy import metadata_only
        from .strm import skip_background_read
        enabled = not metadata_only(plan.config.directory('state'))
        for row in plan.assets:
            path = str(row['path'])
            if 'local:' + path in plan.units:
                local_documents.add(path)
            if (enabled and plan.stage in ('all', 'collect', 'previews')
                    and row['location'] == 'local' and not row.get('snapshot_path')
                    and not skip_background_read(path) and 'media:' + path in plan.units):
                previews.add(path)
        generated = len(covers) * (self.cover + 64 * 1024) + len(previews) * (self.snapshot_bytes + 256 * 1024)
        source_bytes = documents * self.document + len(local_documents) * self.nfo
        # 采集流水线逐个生成九宫格，临时目录保留当前影片的九张 480px 帧。
        temporary = 9 * 128 * 1024 if previews else 0
        return generated, source_bytes, temporary

    def snapshot(self, plan, rows, *, finished=False):
        """只按待执行工作计新增产物，已完成和命中缓存的部分不重复累加。"""
        generated, source_bytes, temporary = self._pending_outputs(plan)
        if finished:
            generated = source_bytes = temporary = 0
        volumes = {}
        from .storage_budget import load_policy, reserve_bytes
        policy = load_policy(self.config)
        for path, label, retained, transient in (
                (self.generated, '预览与封面', generated, 0),
                (self.sources, '影片资料', source_bytes, 0),
                (self.temporary, '临时文件', 0, temporary)):
            key, free, mount, total = volume_space(path)
            volume = volumes.setdefault(key, dict(path=mount, labels=[], free_bytes=free,
                estimated_bytes=0, temporary_bytes=0,
                reserve_bytes=reserve_bytes(policy, total) if total is not None else None))
            volume['labels'].append(label)
            volume['estimated_bytes'] += retained
            volume['temporary_bytes'] += transient
        for volume in volumes.values():
            reserve = volume['reserve_bytes']
            volume['required_bytes'] = volume['estimated_bytes'] + volume['temporary_bytes'] + reserve if reserve is not None else None
            free = volume['free_bytes']
            volume['shortfall_bytes'] = max(0, volume['required_bytes'] - free) if free is not None and reserve is not None else None
            volume['can_fit'] = volume['shortfall_bytes'] == 0 if volume['shortfall_bytes'] is not None else None
        cache_unknown = not finished and any(amount and rows[key]['root'] and rows[key]['network']
            for unit in plan.units.values() for key, amount in unit.items())
        return dict(estimated_bytes=generated + source_bytes, temporary_bytes=temporary,
                    cache_unknown=cache_unknown, volumes=list(volumes.values()),
                    can_fit=False if any(v['can_fit'] is False for v in volumes.values()) else
                            True if all(v['can_fit'] is True for v in volumes.values()) else None)
