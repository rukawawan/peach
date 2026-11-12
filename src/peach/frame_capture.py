"""按时间点抽单帧、把若干帧拼成一张接触印相。

九宫格（`scripts/sheets.py`）和时间轴预览（`timeline_sheets`）要的是同一件事：在给定
时间点取一帧、缩到固定宽度、若干帧拼成一张图。两处各写一份的代价不是重复，而是分叉
——网盘上那批坏色彩元数据的片子只在其中一份里被认出来并重试，另一份就永远少一批图，
而失败形态是「这些片子没有预览」，看不出是哪一份的判据少了一条。
"""
from __future__ import annotations

import os
import re
import subprocess
import time
from pathlib import Path
from .processing_control import checkpoint, deadline_after, ffmpeg_options
from .task_control import run as run_task_process

from PIL import Image


def _readable_image(path: Path) -> bool:
    """图片须完整可解码；纯色 JPEG 也算有效画面。"""
    try:
        with Image.open(path) as image:
            image.load()
            return image.width > 0 and image.height > 0
    except (OSError, ValueError, Image.DecompressionBombError):
        return False

#: 部分网盘视频把色彩原色写成 reserved（非法值），swscale 会拒绝缩放；声明为 bt709
#: 只是覆盖坏的元数据，不改动像素。
COLOR_OVERRIDE = ["-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]

#: 只有坏色彩元数据才值得用 bt709 覆盖重试。无条件重试会让网盘超时这类必然失败的文件
#: 每帧都白跑第二次：单帧最坏耗时从 45 秒翻到 90 秒，9 帧就是 13.5 分钟。
COLOR_METADATA_ERROR = re.compile(
    r"(reserved|unsupported|invalid)[^\n]{0,60}(color|primaries|trc|space)"
    r"|(color|primaries|trc|space)[^\n]{0,60}(reserved|unsupported|invalid)",
    re.IGNORECASE,
)


def capture_frame(ffmpeg: str, path: str, timestamp: float, destination: Path, *,
                  width: int = 480, color_override: bool = False,
                  timeout: float = 45, diagnostics: dict | None = None,
                  input_options: tuple[str, ...] = ()) -> tuple[bool, str]:
    """抽一帧，返回（是否成功, stderr）。stderr 用于判断值不值得重试。

    `-ss` 在 `-i` 之前：那是输入端 seek，只解目标附近的帧。放到后面就是从头解码到
    那个时间点，两小时的片子抽最后一帧要几分钟。
    """
    destination.unlink(missing_ok=True)
    from .task_resources import media_input
    media_input(path)
    from .smb_media import input_url
    path = input_url(path)
    from .processing_traffic import CURRENT as TRAFFIC, media_statistics
    command = [ffmpeg, "-y", "-v", "verbose" if TRAFFIC.get() is not None else "error", "-rw_timeout", "8000000"]
    checkpoint('frame')
    command += ffmpeg_options(filter_option='-filter_threads')
    if color_override:
        command += COLOR_OVERRIDE
    command += input_options
    command += [
        "-ss", f"{timestamp:.2f}", "-i", path, "-frames:v", "1",
        "-vf", f"scale={int(width)}:'max(1,round(ow/dar))',setsar=1", "-q:v", "4",
        *ffmpeg_options(), str(destination),
    ]
    try:
        completed = run_task_process(command, capture_output=True, timeout=timeout,
                                   creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    except subprocess.TimeoutExpired as error:
        media_statistics(path, error.stderr)
        if diagnostics is not None:
            diagnostics.update(reason='timeout', returncode=None,
                               stderr=(error.stderr or b'').decode('utf-8', 'replace'))
        destination.unlink(missing_ok=True)
        return False, "ffmpeg timeout"
    stderr = (completed.stderr or b'').decode('utf-8', 'replace')
    ok = completed.returncode == 0 and _readable_image(destination)
    media_statistics(path, stderr, kind='frame', successful=ok)
    if diagnostics is not None:
        diagnostics.update(reason='success' if ok else
                           'ffmpeg_error' if completed.returncode else 'no_frame',
                           returncode=completed.returncode, stderr=stderr)
    if not ok:
        destination.unlink(missing_ok=True)
    return ok, stderr


def capture_with_retry(ffmpeg: str, path: str, timestamp: float, destination: Path,
                       *, width: int = 480, timeout: float = 45,
                       diagnostics: dict | None = None,
                       decode_options: tuple[str, ...] | None = None) -> bool:
    """抽一帧；坏色彩元数据可重试一次，同部多帧可复用 decode_options。

    None 表示现场探测，空元组表示软件解码；硬件失败仍在本帧内回退。
    """
    from .smb_media import input_url
    path = input_url(path)
    from .hardware_transcode import frame_decode_options
    deadline = deadline_after(timeout)
    hardware = frame_decode_options(ffmpeg, path) if decode_options is None else decode_options
    attempts, detail, ok = [], {}, False
    for options in ((hardware, ()) if hardware else ((),)):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        detail = {}
        ok, stderr = capture_frame(ffmpeg, path, timestamp, destination, width=width,
                                   timeout=min(10, remaining) if options else remaining,
                                   diagnostics=detail, input_options=options)
        attempts.append(dict(detail, color_override=False, hardware_decode=bool(options)))
        if not ok and COLOR_METADATA_ERROR.search(stderr) and deadline > time.monotonic():
            detail = {}
            ok, _ = capture_frame(ffmpeg, path, timestamp, destination, width=width, color_override=True,
                                  timeout=deadline - time.monotonic(), diagnostics=detail, input_options=options)
            attempts.append(dict(detail, color_override=True, hardware_decode=bool(options)))
        if ok:
            break
    if diagnostics is not None:
        diagnostics.update(detail, timestamp_seconds=timestamp, timeout_seconds=timeout,
                           attempts=attempts)
    elif not ok:
        from .error_reporting import subprocess_failure
        subprocess_failure('frame-capture', tool=ffmpeg, stderr=detail.get('stderr', ''),
                           returncode=detail.get('returncode'), timestamp_seconds=timestamp,
                           timeout_seconds=timeout, reason=detail.get('reason'),
                           attempts=[dict(attempt, stderr=attempt.get('stderr', '')[-4000:]) for attempt in attempts])
    return ok


def tile_frames(ffmpeg: str, pattern: str, columns: int, rows: int, destination: Path,
                *, timeout: float = 60) -> bool:
    """把 `pattern`（形如 `dir/s%02d.jpg`）指的那串帧拼成 columns×rows 一张。

    帧要先按连续序号改好名再进来：`image2` 读的是序号序列，中间缺一个号它就在那里停下，
    于是拼出来的图少了后半段，而命令本身照样退出 0。
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    checkpoint('frame')
    options = ffmpeg_options(filter_option='-filter_complex_threads')
    destination.unlink(missing_ok=True)
    from .error_reporting import subprocess_failure
    try:
        completed = run_task_process(
            [ffmpeg, "-y", "-v", "error", *options, "-i", pattern,
             "-filter_complex", f"tile={int(columns)}x{int(rows)}", "-q:v", "4",
             *ffmpeg_options(), str(destination)],
            capture_output=True, timeout=timeout,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        destination.unlink(missing_ok=True)
        subprocess_failure('frame-tile', tool=ffmpeg, error=error, timeout_seconds=timeout)
        raise
    ok = completed.returncode == 0 and _readable_image(destination)
    if not ok:
        destination.unlink(missing_ok=True)
        subprocess_failure('frame-tile', tool=ffmpeg, stderr=completed.stderr,
                           returncode=completed.returncode, reason='tile_unavailable')
    return ok
