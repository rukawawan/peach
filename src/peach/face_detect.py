r"""人脸检出：OpenCV 的 YuNet，取代已经跑不起来的 Haar 级联。

**先说清一件常被混淆的事：YuNet 不是 OpenCV 的替代品，它就是 OpenCV 的一部分。**
`cv2.FaceDetectorYN` 是 OpenCV 的 API，YuNet 是它跑的那个模型。解码、色彩转换、
缩放仍然要 OpenCV。这里换掉的只是「检出器」这一层：

- Haar 级联：2001 年的算法，模型是随 wheel 分发的 XML。
- YuNet：2021 年的小型 CNN，模型是一个 232 KB 的 ONNX，走 OpenCV 的 DNN 模块。

换的直接原因是旧路径已经跑不起来。`pyproject.toml` 钉的是
`opencv-python-headless==5.0.0.93`，而 OpenCV 5 把 Haar 级联移出了 Python wheel：
`cv2.CascadeClassifier` 不存在，`cv2/data/` 只剩 `__init__.py`。两个取景脚本因此
直接抛 `AttributeError`，954 张封面一个 sidecar 都没有，「人脸取景」从来没生效过。

换的第二个原因是召回。`docs/REUSE.md` 记过一次实测：512 张头像 Haar 检出 313；
封面脚本自己的注释也写着 46 张检出 24。也就是漏掉三分之一以上，还得靠额外规则
丢掉假阳性（`278GYAN-017` 检到画面最左的剧照拼贴，`KAVR-428` 一张图检出 7 个框）。
YuNet 给的是框 + 5 个关键点 + 置信度，可以按分数卡，不必靠位置猜。

模型不进 Git：它是二进制资产，和 ffmpeg 一样随安装包分发（`bundled_model`），取用前
校验 sha256——版本要能复现，不能「取到什么算什么」。随包那份不在或对不上时，退回
`peach-data/tools/` 里联网取过的那份，再退回按固定 URL 联网取一次。
"""
from __future__ import annotations

import hashlib
import logging
import os
import sys
import httpx
from .peach_proxy import read_url
from dataclasses import dataclass, replace
from pathlib import Path

from .config import TOOLS_DIR
from .user_messages import UserFacingError

LOGGER = logging.getLogger(__name__)

#: opencv_zoo 的定版提交。模型与许可证都按这个提交取，内容不随 main 分支变化。
ZOO_COMMIT = "48b10fa505aeb51fbd127fc60a5c660040e823b7"
#: 走 media. 域名是因为仓库用 Git LFS，raw. 域名只会回一个 131 字节的指针文件。
ZOO_MEDIA = f"https://media.githubusercontent.com/media/opencv/opencv_zoo/{ZOO_COMMIT}/models/"

#: opencv_zoo 的 YuNet 定版模型。
MODEL_URL = ZOO_MEDIA + "face_detection_yunet/face_detection_yunet_2023mar.onnx"
MODEL_SHA256 = "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4"
#: 回报给 `observer` 的模型标识；任务中心按它认是哪一个模型。
MODEL_LABEL = "face-detection"
MODEL_PATH = TOOLS_DIR / "yunet" / "face_detection_yunet_2023mar.onnx"

#: 随包模型目录的环境变量。Docker 镜像经它指到镜像里那份；桌面包不设，读程序目录。
BUNDLE_ENV = "PEACH_FACE_MODELS"
#: 桌面包里随包模型所在的工具目录名，与 `update_packages.TOOL_PATHS` 的 `face-models` 同名。
BUNDLE_TOOL = "face-models"

#: 低于这个分数的检出不算数。YuNet 会给出置信度，不必再靠「落在左半边就是假阳性」
#: 这类位置规则去猜——那条规则只在长封套上成立，换个版式就不成立。
DEFAULT_SCORE = 0.6
#: NMS 阈值沿用 opencv_zoo 示例的默认值。
DEFAULT_NMS = 0.3
#: 送进网络的几个长边，坐标按各自的缩放比还原回原图。
#:
#: 只检一个尺度不够：YuNet 是定尺寸输入，同一张脸在不同尺度上的分数能差出一倍还多。
#: 实测题材 `xenoblade` 那张竖图里的正脸——长边 320 得 0.63、640 得 0.70，到 1280 只
#: 剩 0.27；同一张图上罩在躯干的误检反过来，320 上根本没有，1280 上涨到 0.65。于是
#: 「只在最大那一档检一次」把这张图判成了「脸在躯干上」。分数在这里不是脸的属性，
#: 是「这张脸在这个尺度上有多像脸」的一次读数，几次读数合起来才是它的分（见 `detect`）。
#:
#: 只往下缩不往上放：放大不会凭空多出细节，却会让暗部噪点和布料褶皱变成够大的「脸」。
DETECT_SIDES = (320, 640, 1280)
#: 两个框重叠到这个程度，就当成同一张脸在两个尺度上的两次读数，而不是两张脸。
SAME_FACE_IOU = 0.35
#: 单次读数低于这个分数不算「在这个尺度上认得出」。收读数的门比留脸的门低一截：
#: 一张脸在三个尺度上读 0.9、0.85、0.3，中位数是 0.85，那个 0.3 也是一次读数。
READ_FLOOR = 0.2
#: 挑主角时，分数落后最好那张这么多的框不参与「取最大」。
SCORE_MARGIN = 0.1
#: 送检前的最小长边。图标常常只有 32×32、64×64，YuNet 在这个尺寸上几乎检不出东西——
#: 它的输入是定尺寸的，脸在原图里只占十几个像素时进网络已经糊成一团。放大到这个数
#: 再检，问的才是「这张图里是不是一张脸」，而不是「这张图够不够大」。
MIN_DETECT_SIDE = 320


class FaceModelUnavailable(UserFacingError, RuntimeError):
    """模型取不到。调用方据此决定是跳过还是整轮停下，不要静默当成「没有脸」。"""


#: `fetch_model` 按模型种类报错：缺文件、下载失败、校验不符三句各一个 code。
_FETCH_CODES = {
    "face": ("errors.faceDetect.faceModelMissing", "errors.faceDetect.faceModelFetchFailed",
             "errors.faceDetect.faceModelChecksum"),
    "match": ("errors.faceDetect.matchModelMissing", "errors.faceDetect.matchModelFetchFailed",
              "errors.faceDetect.matchModelChecksum"),
}


@dataclass(frozen=True)
class Face:
    """一张脸在原图里的归一化位置。`score` 是模型给的置信度。

    `landmarks` 是 YuNet 给的五个关键点（右眼、左眼、鼻尖、右嘴角、左嘴角），按
    `(x, y)` 交替、同样归一化。比对要先按这五个点把脸摆正（`face_match`），取景用不上它。
    """

    cx: float
    cy: float
    width: float
    height: float
    score: float
    landmarks: tuple[float, ...] = ()

    @property
    def area(self) -> float:
        return self.width * self.height


def main_face(faces: list[Face], margin: float = SCORE_MARGIN) -> Face | None:
    """主角那张脸：先按分数筛掉明显不如最好那张的框，再在剩下的里取最大。

    只按面积挑会被「大而勉强」的误检抢走。实测 `performer-8218`（jae 名录的
    600×1000 人像）：YuNet 给了两个框，脸是 0.202×0.170 分 0.928，另一个大一倍多、
    罩在胸口，分 0.798——圆头像于是取景在胸口。只按分数挑则会被背景里那张小而清晰的
    脸抢走。两个都用一次，各挡住对方的失败例。

    这道 margin 挡不住「大而勉强」里分数够近的那一类：封面 `200GANA-2156` 上罩在胯
    下的框 0.80、脸 0.89，差不到 0.1，面积大七成。那一类由 `detect` 的中位数挡——
    它们在别的尺度上读数塌下来，根本进不到这里。
    """
    if not faces:
        return None
    best_score = max(face.score for face in faces)
    strong = [face for face in faces if face.score >= best_score - margin]
    return max(strong, key=lambda face: face.area)


def decode(payload: bytes):
    """图片字节 → OpenCV 的 BGR 数组；解不开返回 None。

    调用方手里常常只有字节（刚从站上取回来的一枚图标），不必先绕一趟 PIL 再转格式。
    """
    import cv2
    import numpy

    if not payload:
        return None
    image = cv2.imdecode(numpy.frombuffer(payload, numpy.uint8), cv2.IMREAD_COLOR)
    if image is None or not image.size:
        return None
    return image


def shows_a_face(payload: bytes, detector: "FaceDetector") -> Face | None:
    """这几个字节画的是一张脸吗；是就返回那张脸，用来当「这不是标识」的证据。

    小图先按长边放大到 `MIN_DETECT_SIDE`：一枚 64×64 的头像照原样送进去检不出任何东西，
    于是「没检到脸」会同时意味着「这是标识」和「这张图太小」，两件事分不开。
    """
    image = decode(payload)
    if image is None:
        return None
    return main_face(detector.detect(_upscale(image)))


def _upscale(image, side: int = MIN_DETECT_SIDE):
    import cv2

    height, width = image.shape[:2]
    longest = max(height, width)
    if not longest or longest >= side:
        return image
    scale = side / longest
    return cv2.resize(image, (max(1, round(width * scale)), max(1, round(height * scale))),
                      interpolation=cv2.INTER_CUBIC)


def ensure_model(path: Path | None = None, *, allow_download: bool = True) -> Path:
    """返回可用的模型路径；本地没有且允许联网时取一次。

    校验 sha256 而不是只看文件在不在：半个下载同样留下一个文件，而它会让
    `FaceDetectorYN_create` 抛一个和网络毫无关系的错。没指定 `path` 时先认随包那份。
    """
    if path is None and (bundled := bundled_model(MODEL_PATH.name, MODEL_SHA256)) is not None:
        return bundled
    target = Path(path) if path is not None else MODEL_PATH
    return fetch_model(target, MODEL_URL, MODEL_SHA256,
                       allow_download=allow_download, label=MODEL_LABEL)


def bundled_dir() -> Path | None:
    """随包模型所在的目录：环境变量优先，其次是冻结桌面包的程序目录；源码运行没有。"""
    configured = os.environ.get(BUNDLE_ENV)
    if configured:
        return Path(configured).expanduser()
    if getattr(sys, "frozen", False):
        from .ffmpeg import bundled_tools_root
        return bundled_tools_root() / BUNDLE_TOOL
    return None


#: 已核对过的随包模型：路径 → ((期望哈希, 大小, 修改时间), 是否对得上)。活动中心按轮询读
#: `face_models.status`，37 MB 的 SFace 每次都算一遍哈希太贵；文件没变就沿用这个进程里第一次
#: 核对的结论，对不上的那份也只警告一次。重装后大小或修改时间变了，结论随之作废。
_verified: dict[Path, tuple[tuple[str, int, int], bool]] = {}


def bundled_model(name: str, sha256: str) -> Path | None:
    """随包那份模型：在且哈希对得上就返回它，否则返回 None。

    对不上不删：程序目录常常只读，而且那份文件归安装包管，不归这里。也不往数据根复制，
    不碰 `downloads` 与 `observer`——这不是联网取到的。
    """
    root = bundled_dir()
    if root is None:
        return None
    path = root / name
    try:
        stat = path.stat()
    except OSError:
        return None
    key = (sha256, stat.st_size, stat.st_mtime_ns)
    cached = _verified.get(path)
    if cached is not None and cached[0] == key:
        return path if cached[1] else None
    try:
        actual = _digest(path)
    except OSError:
        return None
    _verified[path] = (key, actual == sha256)
    if actual != sha256:
        LOGGER.warning("Bundled face model checksum mismatch, falling back to the data directory or a download: %s (expected %s, got %s)",
                       path, sha256, actual)
        return None
    return path


#: 每联网取到一份模型加一。进程里活得久的探针按它判断「失败之后有没有人把模型取回来了」，
#: 不必等满自己的重试窗口（`avatar_face.FaceProbe`）。
downloads = 0

#: 联网取模型的结果回报给谁：`observer(label, error)`，取到时 `error` 为 None。服务装配时
#: 由 `face_models.attach` 接上，把失败写进任务中心；命令行里没人接，就是空操作。
#: 本地已有、`allow_download=False` 两条路不算联网，不回报。
observer = None


def _observe(label: str, error: Exception | None) -> None:
    if observer is not None:
        observer(label, error)


def fetch_model(target: Path, url: str, sha256: str, *, allow_download: bool,
                label: str, timeout: float = 60, kind: str = "face") -> Path:
    """按固定地址与 sha256 取一个 opencv_zoo 模型，检出与比对两个模型共用这一条。

    本地那份哈希对得上就直接用；对不上先删掉，再按 `allow_download` 决定取不取。
    取不到、校验不符一律抛 `FaceModelUnavailable`，由调用方决定跳过还是停下。
    `label` 是报给 `observer` 的模型名，`kind`（`face` 或 `match`）决定报错用哪组 code。
    """
    global downloads
    missing, fetch_failed, mismatch = _FETCH_CODES[kind]
    target = Path(target)
    if target.is_file() and _digest(target) == sha256:
        return target
    if target.is_file():
        target.unlink()
    if not allow_download:
        raise FaceModelUnavailable(missing, {"path": str(target)})
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".part")
    try:
        payload = read_url(url, timeout=timeout)
    except (OSError, httpx.HTTPError) as error:
        failure = FaceModelUnavailable(fetch_failed, {"error": str(error)})
        _observe(label, failure)
        raise failure from error
    digest = hashlib.sha256(payload).hexdigest()
    if digest != sha256:
        failure = FaceModelUnavailable(mismatch, {"expected": sha256, "actual": digest})
        _observe(label, failure)
        raise failure
    temporary.write_bytes(payload)
    temporary.replace(target)
    downloads += 1
    _observe(label, None)
    return target


def _digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class FaceDetector:
    """YuNet 检出器。一次构造反复使用，输入尺寸每张图现设。"""

    def __init__(self, model: Path | None = None, *, score: float = DEFAULT_SCORE,
                 nms: float = DEFAULT_NMS, allow_download: bool = True) -> None:
        import cv2
        import numpy

        self._cv2 = cv2
        self.score = score
        self.model_path = ensure_model(model, allow_download=allow_download)
        create = getattr(cv2, "FaceDetectorYN_create", None)
        if create is None:                       # pragma: no cover - 依赖版本兜底
            raise FaceModelUnavailable("errors.faceDetect.detectorUnsupported")
        # 模型那道门只管「算不算一次读数」，留不留这张脸由 `detect` 按中位数判。
        # Python 读取支持中文路径；原生文件接口不参与模型路径解码。
        model_bytes = numpy.frombuffer(self.model_path.read_bytes(), dtype=numpy.uint8)
        self._detector = create("ONNX", model_bytes, numpy.empty(0, dtype=numpy.uint8),
                                (320, 320), min(score, READ_FLOOR), nms, 5000)

    def detect(self, image) -> list[Face]:
        """返回归一化坐标的人脸，按面积从大到小。

        `DETECT_SIDES` 里的每一档各检一次，重叠到 `SAME_FACE_IOU` 的框算同一张脸在
        几个尺度上的几次读数。框取读数最高的那一次——坐标不去平均，平均出来的框哪一
        次都不是。分数取几次读数的中位数，某一档上认不出就记 0，所以一张脸要被算数，
        得在过半的尺度上都认得出。

        取中位数而不是最高分：误检的框往往只在一个尺度上高。实测封面 `SRN-104`，
        罩住整个身体的那个框在长边 320 上得 0.85，到 640、1280 只剩 0.31 和 0.49；
        同一张图上真正的脸是 0.66、0.89、0.88。取最高分两个框打平，取中位数差出一倍。

        同一张图在几个档上可能缩成同一个尺寸（原图比某一档还小时按原样送检），
        那种重复只检一次，缺的那次不算漏检——补 0 会把小图上的脸全判掉。
        """
        height, width = image.shape[:2]
        if not height or not width:
            return []
        groups: list[list[Face]] = []
        seen: set[tuple[int, int]] = set()
        for side in DETECT_SIDES:
            for face in self._detect_at(image, side, seen):
                for group in groups:
                    if _overlap(group[0], face) >= SAME_FACE_IOU:
                        group.append(face)
                        break
                else:
                    groups.append([face])
        faces = []
        for group in groups:
            best = max(group, key=lambda face: face.score)
            reads = sorted((face.score for face in group), reverse=True)
            reads += [0.0] * (len(seen) - len(reads))
            score = reads[len(reads) // 2]
            if score >= self.score:
                faces.append(replace(best, score=round(score, 3)))
        faces.sort(key=lambda face: face.area, reverse=True)
        return faces

    def _detect_at(self, image, side: int, seen: set[tuple[int, int]]) -> list[Face]:
        """把图缩到这一档的长边再检一次；坐标按缩放比还原回原图。

        归一化之后缩放比自然抵消，所以只要保证宽高用的是同一张图的。只往下缩：
        原图比这一档还小时按原样送检。
        """
        cv2 = self._cv2
        height, width = image.shape[:2]
        scale = min(1.0, side / max(height, width))
        source = (cv2.resize(image, (max(1, int(width * scale)),
                                     max(1, int(height * scale))))
                  if scale < 1.0 else image)
        rows, cols = source.shape[:2]
        if (cols, rows) in seen:
            return []
        seen.add((cols, rows))
        self._detector.setInputSize((cols, rows))
        _, raw = self._detector.detect(source)
        if raw is None:
            return []
        faces = []
        for row in raw:
            x, y, w, h, *_rest = row.tolist()
            confidence = float(row[-1])
            if confidence < min(self.score, READ_FLOOR) or w <= 0 or h <= 0:
                continue
            points = _rest[:10]
            faces.append(Face(
                cx=round(min(1.0, max(0.0, (x + w / 2) / cols)), 3),
                cy=round(min(1.0, max(0.0, (y + h / 2) / rows)), 3),
                width=round(min(1.0, w / cols), 3),
                height=round(min(1.0, h / rows), 3),
                score=round(confidence, 3),
                landmarks=tuple(round(value / (cols if index % 2 == 0 else rows), 4)
                                for index, value in enumerate(points))
                if len(points) == 10 else (),
            ))
        return faces


def _overlap(one: Face, other: Face) -> float:
    """两个框的交并比。判的是「这是不是同一张脸的两次读数」。"""
    left = max(one.cx - one.width / 2, other.cx - other.width / 2)
    right = min(one.cx + one.width / 2, other.cx + other.width / 2)
    top = max(one.cy - one.height / 2, other.cy - other.height / 2)
    bottom = min(one.cy + one.height / 2, other.cy + other.height / 2)
    inner = max(0.0, right - left) * max(0.0, bottom - top)
    union = one.area + other.area - inner
    return inner / union if union > 0 else 0.0
