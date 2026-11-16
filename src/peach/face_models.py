"""人脸模型在任务中心的记录、当前状态与「立即重试」。

任务卡只记历史：取不到时留一条失败记录和原因。此刻是否可用由 `status` 回答，活动中心页顶
「需要处理」那一行读它，「立即重试」调 `RETRY_URL`。

YuNet 与 SFace 两个模型是全进程共用的一次性能力：完整安装包、macOS 应用与 Docker 镜像随包
带着；没带或那份对不上时，第一次用到时联网取一次，之后一直用本地那份。取不到不让任何一轮任务停下（`avatar_face.FaceProbe`、`face_match.FaceMatcher` 都退回
不看脸的旧判据），代价是这件事在界面上没有位置——补头像的后继照样显示跑完了。

这里补的就是那个位置。回报点只有一个：`face_detect.fetch_model` 每次联网取模型的结果经
`face_detect.observer` 报到 `Reporter`，它把「从能用变成取不到」和「从取不到变回能用」两次
转变各写成一条 `face-models` 终态记录。同一次失败反复撞上不再写：断网时每条补头像后继都会
试一次，逐条记下来就是满屏同一张卡。

立即重试是一轮普通的 `BackgroundJob`（`WebContract.face_models_job`），它自己开的那一行
就是记录；它在跑时回报一律跳过，免得同一件事写两行。
"""
from __future__ import annotations

import logging
import threading

from . import face_detect
from .task_outcomes import said

LOGGER = logging.getLogger(__name__)

TASK_KEY = "face-models"


class Reporter:
    """`face_detect.observer` 的服务端实现：按转变写 `task_run`，不按次数写。"""

    def __init__(self, runs):
        self.runs = runs
        #: 查最新一条与写下一条之间不许插进别的线程：两条后继同时取不到模型，只该留一行。
        self._lock = threading.Lock()

    def __call__(self, label: str, error: Exception | None) -> None:
        try:
            self._record(label, error)
        except Exception:                       # 记录失败不能拖垮取模型的那一方
            LOGGER.warning("Failed to record the face model task", exc_info=True)

    def _record(self, label: str, error: Exception | None) -> None:
        if not self.runs.enabled:
            return
        with self._lock:
            latest = self.runs.query(task_key=TASK_KEY, limit=1)
            last = latest[0] if latest else None
            if last is not None and last.active:
                return                          # 立即重试那一轮自己会结算
            if error is None:
                if last is None or last.status != "failed":
                    return
                from . import face_match
                fetched = "matchModelFetched" if label == face_match.MODEL_LABEL else "faceModelFetched"
                status, summary, message = "succeeded", said(fetched), ""
            else:
                if last is not None and last.status == "failed":
                    return
                status, summary, message = "failed", {}, str(error)
            run = self.runs.start(TASK_KEY, trigger="scheduled")
            if run is None:
                return
            self.runs.finish(run.id, status, summary=summary, error=message)
            self.runs.prune(TASK_KEY)


def attach(runs) -> None:
    """把这个进程里联网取模型的结果接进任务中心。服务装配时调一次。"""
    face_detect.observer = Reporter(runs)


def detach(runs) -> None:
    """服务关停后释放属于这份账本的模型任务记录器。"""
    observer = face_detect.observer
    if isinstance(observer, Reporter) and observer.runs is runs:
        face_detect.observer = None


#: 「立即重试」的地址：活动中心页顶「需要处理」那一行调它，请求体 `{}`。
RETRY_URL = "/api/face-models"


def status(runs) -> dict:
    """人脸模型此刻的状态，给活动中心页顶「需要处理」那一行读。不联网，读一次就是一条查询。

    判据和任务卡同一个来源：最新那条 `face-models` 记录。`state` 取四个值：

    - `downloading`：立即重试那一轮在跑。
    - `failed`：最新一条是失败，`failed_at`／`error`／`run_id` 指向那张卡。
    - `ready`：两个模型都在本机，随包那份或数据目录里那份。随包那份按 `bundled_model`
      核对哈希，进程里只算一次；数据目录那份的哈希留到用的时候由 `fetch_model` 核对。
    - `missing`：还没取过，下次用到时自动去取；这不是问题，不必提示。

    详细原因只在任务卡上写，这里的 `error` 供「需要处理」判断与排查，不另起一套说法。
    """
    from . import face_match

    latest = runs.query(task_key=TASK_KEY, limit=1)
    last = latest[0] if latest else None
    present = all(face_detect.bundled_model(module.MODEL_PATH.name, module.MODEL_SHA256) is not None
                  or module.MODEL_PATH.is_file() for module in (face_detect, face_match))
    if last is not None and last.active:
        state = "downloading"
    elif last is not None and last.status == "failed":
        state = "failed"
    else:
        state = "ready" if present else "missing"
    failed = state == "failed"
    return {
        "task_key": TASK_KEY,
        "state": state,
        "available": state == "ready",
        "failed_at": last.finished_at if failed else None,
        "error": last.error if failed else "",
        "run_id": last.id if last is not None and state in ("failed", "downloading") else None,
        "retry_url": RETRY_URL,
    }


def download_all() -> dict:
    """立即重试那一轮：两个模型各取一次，本地已有且校验对得上的直接算取到。

    一个取不到不挡另一个：检出模型取到了，题材圆标的取景就能先恢复。
    """
    from . import face_match

    failures = []
    for ensure in (face_detect.ensure_model, face_match.ensure_model):
        try:
            ensure()
        except face_detect.FaceModelUnavailable as error:
            failures.append(str(error))
    if failures:
        return {"ok": False, "error": "；".join(failures)}
    return {"ok": True, **said("faceModelsReady")}
