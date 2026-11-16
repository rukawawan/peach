"""在可终止的子进程中读取配套图片，主任务只消费本机临时产物。"""
from __future__ import annotations

import argparse
import io
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from PIL import Image
from .task_control import run as run_task_process
from .user_messages import UserValueError

TIMEOUT_SECONDS = 20.0
MAX_BYTES = 32 * 1024 * 1024


def read_jpeg(source: Path, *, isolated=True) -> tuple[bytes, tuple[int, int]]:
    from .smb_media import SmbResource
    if not isolated or isinstance(source, SmbResource):
        return _decode(source)
    from .images import measure_image_size
    from .processing_traffic import CURRENT, record_media_read

    command = ([sys.executable, 'local-image'] if getattr(sys, 'frozen', False)
               else [sys.executable, '-m', 'peach.local_poster'])
    with tempfile.TemporaryDirectory(prefix='peach-local-poster-') as temporary:
        output = Path(temporary).resolve() / 'poster.jpg'
        result = run_task_process([*command, str(source), str(output)], stdin=subprocess.DEVNULL,
                                stdout=subprocess.PIPE if CURRENT.get() is not None else subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL, timeout=TIMEOUT_SECONDS,
                                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        if CURRENT.get() is not None:
            for line in (getattr(result, 'stdout', None) or b'').splitlines():
                if line.isdigit():
                    record_media_read(source, int(line))
        if result.returncode:
            raise UserValueError('errors.localPoster.unreadable')
        data = output.read_bytes()
    size = measure_image_size(data)
    if size is None:
        raise UserValueError('errors.localPoster.unreadable')
    return data, size


def _decode(source, *, report=None):
    try:
        if source.stat().st_size > MAX_BYTES:
            raise UserValueError('errors.localPoster.tooLarge')
        with source.open('rb') as handle:
            raw = handle.read(MAX_BYTES + 1)
        from .processing_traffic import record_media_read
        (report or (lambda size: record_media_read(source, size)))(len(raw))
        if len(raw) > MAX_BYTES:
            raise UserValueError('errors.localPoster.tooLarge')
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            output = io.BytesIO()
            image.convert('RGB').save(output, format='JPEG', quality=95)
            return output.getvalue(), image.size
    except (OSError, ValueError, Image.DecompressionBombError) as error:
        raise UserValueError('errors.localPoster.unreadable') from error


def main(argv=None):
    parser = argparse.ArgumentParser(description='Read one companion image')
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args(argv)
    try:
        data, _ = _decode(args.source, report=lambda size: print(size, flush=True))
        args.output.write_bytes(data)
        return 0
    except (OSError, ValueError, Image.DecompressionBombError):
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
