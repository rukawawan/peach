"""人脸模型在任务中心的那张卡：按转变留记录、当前状态与立即重试。"""
import hashlib
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from support.ledger import fresh_ledger

from peach import face_detect, face_match, face_models, web_router
from peach.jobs import BackgroundJob
from peach.repository import LedgerDatabase
from peach.task_runs import DEFAULT_KEEP, TaskRunStore, task_label
from support.outcomes import told

TASK = face_models.TASK_KEY
DOWN = face_detect.FaceModelUnavailable("errors.faceDetect.faceModelFetchFailed", {"error": "getaddrinfo failed"})


class FaceModelsCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.store = TaskRunStore(LedgerDatabase(fresh_ledger(self.root)), host="test-host")
        self.addCleanup(setattr, face_detect, "observer", None)

    def rows(self):
        return self.store.query(task_key=TASK)


class ReporterTests(FaceModelsCase):
    def test_detach_releases_only_the_owning_ledgers_reporter(self):
        face_models.attach(self.store)
        attached = face_detect.observer
        face_models.detach(object())
        self.assertIs(face_detect.observer, attached)
        face_models.detach(self.store)
        self.assertIsNone(face_detect.observer)

    def setUp(self):
        super().setUp()
        self.report = face_models.Reporter(self.store)

    def test_a_failure_leaves_one_failed_row_with_the_reason(self):
        self.report("人脸模型", DOWN)
        [run] = self.rows()
        self.assertEqual((run.status, run.trigger), ("failed", "scheduled"))
        self.assertEqual(run.error, str(DOWN))

    def test_the_same_failure_again_does_not_add_a_row(self):
        """断网时每条补头像后继都会试一次，逐条记下来就是满屏同一张卡。"""
        for _ in range(5):
            self.report("人脸模型", DOWN)
            self.report("人脸比对模型", DOWN)
        self.assertEqual(len(self.rows()), 1)

    def test_a_download_after_a_failure_closes_it_with_a_succeeded_row(self):
        self.report("人脸模型", DOWN)
        self.report("人脸模型", None)
        latest, failed = self.rows()
        self.assertEqual((latest.status, failed.status), ("succeeded", "failed"))
        self.assertEqual(told(latest.result_summary)["outcome"], "已取得人脸模型")
        # 恢复之后再断，是新的一次失败。
        self.report("人脸模型", DOWN)
        self.assertEqual([run.status for run in self.rows()], ["failed", "succeeded", "failed"])

    def test_a_download_with_nothing_to_close_leaves_no_row(self):
        self.report("人脸模型", None)
        self.assertEqual(self.rows(), [])

    def test_a_retry_in_progress_settles_its_own_row(self):
        self.store.start(TASK, trigger="manual", mutex_key=TASK)
        self.report("人脸模型", DOWN)
        self.report("人脸模型", None)
        self.assertEqual([run.status for run in self.rows()], ["running"])

    def test_history_is_kept_to_the_usual_number_of_rows(self):
        for _ in range(DEFAULT_KEEP + 3):
            self.report("人脸模型", DOWN)
            self.report("人脸模型", None)
        self.assertEqual(len(self.store.query(task_key=TASK, limit=100)), DEFAULT_KEEP)

    def test_a_read_only_ledger_gets_no_rows(self):
        self.store.enabled = False
        self.report("人脸模型", DOWN)
        self.store.enabled = True
        self.assertEqual(self.rows(), [])

    def test_a_broken_task_table_does_not_reach_the_model_caller(self):
        broken = face_models.Reporter(SimpleNamespace(
            enabled=True, query=mock.Mock(side_effect=RuntimeError("database disk image is malformed"))))
        with self.assertLogs("peach.face_models", "WARNING"):
            broken("人脸模型", DOWN)


class FetchObserverTests(FaceModelsCase):
    def setUp(self):
        super().setUp()
        self.seen = []
        face_detect.observer = lambda label, error: self.seen.append((label, error))
        self.target = self.root / "tools" / "model.onnx"

    def fetch(self, sha256: str):
        return face_detect.fetch_model(self.target, "https://example.invalid/m.onnx", sha256,
                                       allow_download=True, label="人脸模型")

    def test_a_network_failure_is_reported_and_still_raised(self):
        with mock.patch.object(face_detect, "read_url", side_effect=OSError("Network is unreachable")), \
                self.assertRaises(face_detect.FaceModelUnavailable) as caught:
            self.fetch("0" * 64)
        self.assertEqual(self.seen, [("人脸模型", caught.exception)])

    def test_a_checksum_mismatch_is_reported(self):
        with mock.patch.object(face_detect, "read_url", return_value=b"half"), \
                self.assertRaises(face_detect.FaceModelUnavailable):
            self.fetch("0" * 64)
        self.assertIn("校验不符", str(self.seen[0][1]))

    def test_a_download_is_reported_and_counted_and_a_local_hit_is_not(self):
        payload = b"onnx"
        digest = hashlib.sha256(payload).hexdigest()
        before = face_detect.downloads
        with mock.patch.object(face_detect, "read_url", return_value=payload) as read:
            self.fetch(digest)
            self.fetch(digest)
        self.assertEqual(read.call_count, 1)
        self.assertEqual(self.seen, [("人脸模型", None)])
        self.assertEqual(face_detect.downloads, before + 1)


class ModelFilesCase(FaceModelsCase):
    """两个模型落在临时目录，立即重试走真实路由与后台任务，只有取字节那一步换掉。"""

    def setUp(self):
        super().setUp()
        face_models.attach(self.store)
        self.payload = b"onnx"
        digest = hashlib.sha256(self.payload).hexdigest()
        for module, name in ((face_detect, "yunet.onnx"), (face_match, "sface.onnx")):
            for attribute, value in (("MODEL_PATH", self.root / "tools" / name),
                                     ("MODEL_SHA256", digest)):
                patcher = mock.patch.object(module, attribute, value)
                patcher.start()
                self.addCleanup(patcher.stop)
        self.contract = SimpleNamespace(face_models_job=BackgroundJob(
            "PeachFaceModelsJob", task_key=TASK, runs=self.store))

    def retry(self, **read):
        with mock.patch.object(face_detect, "read_url", **read):
            web_router.dispatch_api_post(self.contract, "/api/face-models", {})
            self.contract.face_models_job.thread.join(5)


class RetryEndpointTests(ModelFilesCase):
    """「立即重试」：一轮普通的后台任务，记录只有它自己那一行。"""

    def test_a_failed_retry_is_one_failed_manual_row(self):
        self.retry(side_effect=OSError("Network is unreachable"))
        [run] = self.rows()
        self.assertEqual((run.status, run.trigger), ("failed", "manual"))
        self.assertIn("取人脸模型失败", run.error)
        self.assertIn("取人脸比对模型失败", run.error)

    def test_a_successful_retry_is_one_succeeded_row(self):
        self.retry(side_effect=OSError("Network is unreachable"))
        self.retry(return_value=self.payload)
        self.assertEqual([run.status for run in self.rows()], ["succeeded", "failed"])
        self.assertTrue((self.root / "tools" / "sface.onnx").is_file())

    def test_the_route_is_open_on_a_read_only_machine(self):
        self.assertIn("/api/face-models", web_router.READ_ONLY_POST_ROUTES)


class StatusTests(ModelFilesCase):
    """活动中心「需要处理」读的那一份：和任务卡同一个来源，读的时候不联网。"""

    def status(self):
        with mock.patch.object(face_detect, "read_url",
                               side_effect=AssertionError("读状态不该联网")):
            return face_models.status(self.store)

    def test_never_fetched_is_missing_not_a_problem(self):
        self.assertEqual(self.status(), {
            "task_key": TASK, "state": "missing", "available": False, "failed_at": None,
            "error": "", "run_id": None, "retry_url": face_models.RETRY_URL})

    def test_the_latest_failure_is_reported_with_its_card(self):
        self.retry(side_effect=OSError("Network is unreachable"))
        [run] = self.rows()
        current = self.status()
        self.assertEqual((current["state"], current["available"]), ("failed", False))
        self.assertEqual((current["failed_at"], current["error"], current["run_id"]),
                         (run.finished_at, run.error, run.id))
        self.assertEqual(current["retry_url"], "/api/face-models")

    def test_a_retry_in_progress_is_downloading(self):
        run = self.store.start(TASK, trigger="manual", mutex_key=TASK)
        self.assertEqual((self.status()["state"], self.status()["run_id"]), ("downloading", run.id))

    def test_both_models_on_disk_after_a_recovery_is_ready(self):
        self.retry(side_effect=OSError("Network is unreachable"))
        self.retry(return_value=self.payload)
        current = self.status()
        self.assertEqual((current["state"], current["available"], current["error"]),
                         ("ready", True, ""))

    def test_models_shipped_with_the_package_are_ready_without_any_download(self):
        bundle = self.root / "program" / "tools" / "face-models"
        bundle.mkdir(parents=True)
        for module in (face_detect, face_match):
            (bundle / module.MODEL_PATH.name).write_bytes(self.payload)
        with mock.patch.dict(face_detect.os.environ, {face_detect.BUNDLE_ENV: str(bundle)}), \
                mock.patch.object(face_detect, "_verified", {}):
            self.assertEqual(self.status()["state"], "ready")
            self.retry(side_effect=AssertionError("随包有模型时立即重试也不联网"))
        self.assertEqual([run.status for run in self.rows()], ["succeeded"])
        self.assertFalse((self.root / "tools").exists(), "随包那份不往数据根复制")


class LabelTests(unittest.TestCase):
    def test_every_task_written_by_the_service_has_a_chinese_name(self):
        self.assertEqual(task_label("face-models"), "人脸模型下载")
        self.assertEqual(task_label("amane-bridge"), "amane 桥重建")
        self.assertEqual(task_label("follow-creator"), "关注作者建档")


if __name__ == "__main__":
    unittest.main()
