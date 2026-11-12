"""分片生成与文件响应的取消边界，以及头像确认的线程归属。"""
from __future__ import annotations

import asyncio
import hashlib
import io
import json
import sqlite3
import sys
import tempfile
import threading
import unittest
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from PIL import Image
from starlette.responses import FileResponse

from peach import avatar_provider, routes_media
from peach.api import create_app
from peach.config import PeachSettings
from peach.segments import HlsSegmentService, SegmentUnavailable
from peach.streaming import (
    BufferedFileResponse, CancellableFileResponse, SplicedMp4Response, StreamSessionRegistry,
)
from support.ledger import fresh_ledger


class SegmentGenerationLifecycleTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.source = self.root / "source.mp4"
        self.source.write_bytes(b"temporary source")
        self.registry = StreamSessionRegistry()
        self.service = HlsSegmentService(
            SimpleNamespace(ffmpeg=lambda: SimpleNamespace(path=sys.executable)),
            self.root / "segments", max_concurrent=1)

    def generate(self, session):
        return self.service.generate(self.source, 0, 6, asset_id=1, index=0,
                                     session=session, registry=self.registry)

    async def test_target_has_one_generator_through_failure_and_cancellation(self):
        for cancelled in (False, True):
            with self.subTest(cancelled=cancelled):
                first_started, release_first = asyncio.Event(), asyncio.Event()
                finish = asyncio.Event()
                calls = active = peak = 0

                async def generate(source, start, duration, target, *, first_started=first_started,
                                   release_first=release_first, finish=finish, **kwargs):
                    nonlocal calls, active, peak
                    calls += 1
                    active += 1
                    peak = max(peak, active)
                    try:
                        if calls == 1:
                            first_started.set()
                            await release_first.wait()
                            raise SegmentUnavailable("controlled failure")
                        await finish.wait()
                        target.parent.mkdir(parents=True, exist_ok=True)
                        target.write_bytes(b"segment")
                        return target
                    finally:
                        active -= 1

                tasks = []
                with mock.patch.object(self.service, "_generate_uncached", generate):
                    try:
                        tasks.append(asyncio.create_task(self.generate("first")))
                        await asyncio.wait_for(first_started.wait(), 1)
                        tasks.append(asyncio.create_task(self.generate("waiting")))
                        await asyncio.sleep(0)
                        if cancelled:
                            tasks[0].cancel()
                        else:
                            release_first.set()
                        await asyncio.gather(tasks[0], return_exceptions=True)
                        tasks.append(asyncio.create_task(self.generate("new")))
                        tasks.append(asyncio.create_task(self.generate("last")))
                        for _ in range(5):
                            await asyncio.sleep(0)
                        self.assertEqual(peak, 1)
                        self.assertTrue(self.service._generation_locks)
                    finally:
                        release_first.set()
                        finish.set()
                        await asyncio.gather(*tasks, return_exceptions=True)
                        self.service.cached_path(self.source, 1, 0).unlink(missing_ok=True)
                self.assertEqual(self.service._generation_locks, {})

    async def test_arrivals_share_the_target_while_its_cancelled_generator_is_reaped(self):
        started, reaping, reaped, finish = (asyncio.Event() for _ in range(4))
        calls = active = peak = 0

        async def generate(source, start, duration, target, **kwargs):
            nonlocal calls, active, peak
            calls += 1
            active += 1
            peak = max(peak, active)
            try:
                if calls == 1:
                    started.set()
                    try:
                        await asyncio.Event().wait()
                    finally:
                        reaping.set()
                        while not reaped.is_set():
                            try:
                                await reaped.wait()
                            except asyncio.CancelledError:
                                pass
                await finish.wait()
                return target
            finally:
                active -= 1

        tasks = []
        with mock.patch.object(self.service, "_generate_uncached", generate):
            try:
                tasks.append(asyncio.create_task(self.generate("first")))
                await asyncio.wait_for(started.wait(), 1)
                tasks[0].cancel()
                await asyncio.wait_for(reaping.wait(), 1)
                tasks.append(asyncio.create_task(self.generate("second")))
                await asyncio.sleep(0)
                tasks[1].cancel()
                for _ in range(8):
                    await asyncio.sleep(0)
                tasks.append(asyncio.create_task(self.generate("third")))
                for _ in range(8):
                    await asyncio.sleep(0)
                self.assertEqual(peak, 1)
                self.assertTrue(self.service._generation_locks)
            finally:
                reaped.set()
                finish.set()
                await asyncio.gather(*tasks, return_exceptions=True)
        self.assertEqual(self.service._generation_locks, {})

    async def test_generation_deadline_reaps_the_child_and_releases_the_slot(self):
        children = []
        started = asyncio.Event()
        deadline = asyncio.Timeout(None)
        spawn = asyncio.create_subprocess_exec

        async def owned_spawn(*args, **kwargs):
            child = await spawn(*args, **kwargs)
            children.append(child)
            started.set()
            return child

        attempts = [("owned wait", lambda out: [
            getattr(sys, '_base_executable', sys.executable), "-c", "import time; time.sleep(60)"])]
        observed = None
        generation = None
        try:
            with mock.patch.object(self.service, "_attempts", return_value=attempts), \
                    mock.patch("peach.segments.GENERATION_TIMEOUT_SECONDS", 0.2, create=True), \
                    mock.patch("peach.segments.asyncio.create_subprocess_exec", owned_spawn), \
                    mock.patch("peach.segments.asyncio.timeout", return_value=deadline) as timeout:
                generation = asyncio.create_task(self.generate("deadline"))
                await asyncio.wait_for(started.wait(), 10)
                deadline.reschedule(asyncio.get_running_loop().time())
                try:
                    await asyncio.wait_for(generation, 10)
                except Exception as error:
                    observed = error
                timeout.assert_called_once_with(0.2)
            self.assertIsInstance(observed, SegmentUnavailable)
            self.assertIn("timed out", str(observed))
            self.assertTrue(children)
            self.assertTrue(all(child.returncode is not None for child in children))
            self.assertFalse(self.registry._processes)
            self.assertEqual(self.service._gate()._value, 1)
            self.assertEqual(self.service._generation_locks, {})
            self.assertEqual(list((self.root / "segments").rglob("*.tmp.ts")), [])
        finally:
            if generation is not None:
                generation.cancel()
                await asyncio.gather(generation, return_exceptions=True)
            for child in children:
                if child.returncode is None:
                    child.kill()
                await child.wait()


class MediaResponseLifecycleTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.app = create_app(PeachSettings(
            configured=True, token="secret", db_path=fresh_ledger(self.root),
            candidate_root=self.root / "generated", cover_root=self.root / "covers",
            avatar_root=self.root / "avatars", transcode_root=self.root / "transcodes"))
        self.addCleanup(self.app.state.hls_plan_executor.shutdown, wait=True, cancel_futures=True)
        self.source = self.root / "source.mp4"
        self.source.write_bytes(b"temporary source")
        self.service = HlsSegmentService(
            SimpleNamespace(ffmpeg=lambda: SimpleNamespace(path=sys.executable)),
            self.root / "segments", max_concurrent=1)
        self.app.state.hls_service = self.service
        self.children = []
        self.tasks = []
        self.ready = asyncio.Event()
        self.original_spawn = asyncio.create_subprocess_exec
        self.addAsyncCleanup(self.stop_owned_work)

    async def stop_owned_work(self):
        for task in self.tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)
        for child in self.children:
            if child.returncode is None:
                child.kill()
            await child.wait()
        await asyncio.sleep(0)
        self.assertEqual([task for task in asyncio.all_tasks()
                          if task is not asyncio.current_task() and not task.done()], [])

    async def owned_spawn(self, *args, **kwargs):
        child = await self.original_spawn(*args, **kwargs)
        self.children.append(child)
        self.assertEqual((await child.stderr.readline()).rstrip(b'\r\n'), b'ready')
        self.ready.set()
        return child

    def attempts(self, delay):
        return [("owned output", lambda out: [getattr(sys, '_base_executable', sys.executable), "-c",
            "import sys,time; from pathlib import Path; print('ready',file=sys.stderr,flush=True); "
            "time.sleep(float(sys.argv[1])); "
            "Path(sys.argv[2]).write_bytes(b'segment')", str(delay), str(out)])]

    def request(self, path, query=b""):
        messages, sent = asyncio.Queue(), []
        messages.put_nowait({"type": "http.request", "body": b"", "more_body": False})

        async def receive():
            message = await messages.get()
            if isinstance(message, BaseException):
                raise message
            return message

        async def send(message):
            sent.append(message)

        scope = {"type": "http", "asgi": {"version": "3.0", "spec_version": "2.3"},
                 "http_version": "1.1", "method": "GET", "scheme": "http", "root_path": "",
                 "path": path, "raw_path": path.encode(), "query_string": query,
                 "headers": [], "server": ("127.0.0.1", 0), "client": ("127.0.0.1", 0)}
        task = asyncio.create_task(self.app(scope, receive, send))
        self.tasks.append(task)
        return task, messages, sent

    async def finished(self, task):
        try:
            await asyncio.wait_for(asyncio.shield(task), 0.3)
            return True
        except TimeoutError:
            return False

    async def test_last_hls_disconnect_reaps_its_generator(self):
        with mock.patch.object(routes_media, "_hls_plan", return_value=(
                None, self.source, [(0, 6)], False)), \
                mock.patch.object(self.service, "_attempts", return_value=self.attempts(60)), \
                mock.patch("peach.segments.asyncio.create_subprocess_exec", self.owned_spawn):
            task, messages, sent = self.request("/stream/hls/1/0.ts", b"session=one&t=secret")
            await asyncio.wait_for(self.ready.wait(), 10)
            messages.put_nowait({"type": "http.disconnect"})
            self.assertTrue(await self.finished(task), "断连请求仍占着生成槽")
        self.assertIsNotNone(self.children[0].returncode)
        self.assertFalse(self.app.state.stream_sessions._processes)
        self.assertEqual(self.app.state.stream_sessions.active_count("one"), 0)
        self.assertEqual(self.service._gate()._value, 1)
        self.assertEqual(self.service._generation_locks, {})
        self.assertNotIn(500, [one["status"] for one in sent if one["type"] == "http.response.start"])

    async def test_one_hls_disconnect_preserves_the_other_clients_generator(self):
        await self.shared_client_leaves(explicit=False)

    async def test_one_session_cancel_preserves_the_other_clients_generator(self):
        await self.shared_client_leaves(explicit=True)

    async def shared_client_leaves(self, *, explicit):
        joined = asyncio.Event()
        sessions = self.app.state.stream_sessions
        register = sessions.register
        release = self.root / "release-segment"
        attempts = [("controlled output", lambda out: [
            getattr(sys, '_base_executable', sys.executable), "-c",
            "import sys,time\nfrom pathlib import Path\n"
            "print('ready',file=sys.stderr,flush=True)\n"
            "while not Path(sys.argv[1]).exists(): time.sleep(0.01)\n"
            "Path(sys.argv[2]).write_bytes(b'segment')",
            str(release), str(out)])]

        # 第二个客户端登记后、下一次让出之前就挂到了共享生成上；刚进 generate 时还没有。
        def observed(session, task):
            registered = register(session, task)
            if session == "two":
                joined.set()
            return registered

        with mock.patch.object(routes_media, "_hls_plan", return_value=(
                None, self.source, [(0, 6)], False)), \
                mock.patch.object(self.service, "_attempts", return_value=attempts), \
                mock.patch.object(sessions, "register", observed), \
                mock.patch("peach.segments.asyncio.create_subprocess_exec", self.owned_spawn):
            first, messages, _ = self.request("/stream/hls/1/0.ts", b"session=one&t=secret")
            await asyncio.wait_for(self.ready.wait(), 10)
            second, _, sent = self.request("/stream/hls/1/0.ts", b"session=two&t=secret")
            await asyncio.wait_for(joined.wait(), 1)
            if explicit:
                self.app.state.stream_sessions.cancel("one")
            else:
                messages.put_nowait({"type": "http.disconnect"})
            self.assertTrue(await self.finished(first), "离开的请求仍在等待共享生成")
            self.assertIsNone(self.children[0].returncode, "另一个客户端仍在使用该生成者")
            release.touch()
            await asyncio.wait_for(second, 2)
        self.assertEqual(len(self.children), 1)
        self.assertEqual([one["status"] for one in sent if one["type"] == "http.response.start"], [200])
        self.assertEqual(b"".join(one.get("body", b"") for one in sent), b"segment")
        self.assertFalse(self.app.state.stream_sessions._processes)
        self.assertEqual(self.service._generation_locks, {})

    async def test_early_file_disconnect_completes_the_application_middleware_stack(self):
        stopped = asyncio.Event()

        @self.app.get("/owned-stream")
        async def stream():
            return BufferedFileResponse(self.source)

        async def slow_headers(response, scope, receive, send):
            try:
                await asyncio.Event().wait()
            finally:
                stopped.set()

        observed = None
        with mock.patch.object(FileResponse, "__call__", slow_headers), \
                mock.patch("peach.api._server_error_headers", return_value={"X-Peach-Error-ID": "test"}) as errors:
            task, messages, sent = self.request("/owned-stream")
            messages.put_nowait({"type": "http.disconnect"})
            try:
                await asyncio.wait_for(task, 1)
            except RuntimeError as error:
                observed = error
            self.assertIsNone(observed)
            errors.assert_not_called()
        self.assertTrue(stopped.is_set())
        self.assertEqual([one["status"] for one in sent if one["type"] == "http.response.start"], [204])

    async def test_file_session_cancel_before_headers_completes_the_application_stack(self):
        await self.session_cancel_before_headers(CancellableFileResponse(
            self.source, session="owned", registry=self.app.state.stream_sessions))

    async def test_file_session_cancel_after_headers_keeps_one_response_start(self):
        await self.session_cancel_before_headers(CancellableFileResponse(
            self.source, session="owned", registry=self.app.state.stream_sessions), after_headers=True)

    async def test_spliced_session_cancel_before_headers_completes_the_application_stack(self):
        await self.session_cancel_before_headers(SplicedMp4Response(
            self.source, None, session="owned", registry=self.app.state.stream_sessions))

    async def test_spliced_session_cancel_after_headers_keeps_one_response_start(self):
        await self.session_cancel_before_headers(SplicedMp4Response(
            self.source, None, session="owned", registry=self.app.state.stream_sessions), after_headers=True)

    async def session_cancel_before_headers(self, response, *, after_headers=False):
        entered, stopped = asyncio.Event(), asyncio.Event()

        @self.app.get("/owned-session")
        async def stream():
            return response

        async def slow_headers(response, scope, receive, send):
            if after_headers:
                await send({"type": "http.response.start", "status": 200,
                            "headers": [(b'content-type',b'video/mp4')]})
            entered.set()
            try:
                await asyncio.Event().wait()
            finally:
                stopped.set()

        with mock.patch.object(FileResponse, "__call__", slow_headers), \
                mock.patch.object(SplicedMp4Response, "_respond", slow_headers), \
                mock.patch("peach.api._server_error_headers", return_value={"X-Peach-Error-ID": "test"}) as errors:
            task, _, sent = self.request("/owned-session")
            # 首次请求还包含应用路由准备；取消完成的时限从响应进入后单独计算。
            await asyncio.wait_for(entered.wait(), 10)
            self.assertEqual(self.app.state.stream_sessions.cancel("owned"), 1)
            observed = None
            try:
                await asyncio.wait_for(task, 1)
            except BaseException as error:
                observed = error
            self.assertIsNone(observed)
            errors.assert_not_called()
        self.assertTrue(stopped.is_set())
        self.assertEqual(self.app.state.stream_sessions.active_count("owned"), 0)
        self.assertEqual([one["status"] for one in sent if one["type"] == "http.response.start"],
                         [200] if after_headers else [204])

    async def test_external_file_cancellation_propagates_without_a_replacement_response(self):
        entered, stopped = asyncio.Event(), asyncio.Event()
        response = CancellableFileResponse(
            self.source, session="owned", registry=self.app.state.stream_sessions)
        sent = []

        async def slow_headers(response, scope, receive, send):
            entered.set()
            try:
                await asyncio.Event().wait()
            finally:
                stopped.set()

        async def receive():
            await asyncio.Event().wait()

        async def send(message):
            sent.append(message)

        with mock.patch.object(FileResponse, "__call__", slow_headers):
            task = asyncio.create_task(response({"type": "http", "method": "GET"}, receive, send))
            self.tasks.append(task)
            await asyncio.wait_for(entered.wait(), 1)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
        self.assertTrue(stopped.is_set())
        self.assertEqual(sent, [])
        self.assertEqual(self.app.state.stream_sessions.active_count("owned"), 0)

    async def test_file_runtime_errors_reach_the_application_error_handler(self):
        entered, fail = asyncio.Event(), asyncio.Event()

        @self.app.get("/owned-stream")
        async def stream():
            return BufferedFileResponse(self.source)

        async def broken_headers(response, scope, receive, send):
            entered.set()
            await fail.wait()
            raise RuntimeError("owned response failure")

        with mock.patch.object(FileResponse, "__call__", broken_headers), \
                mock.patch("peach.api._server_error_headers", return_value={"X-Peach-Error-ID": "test"}) as errors:
            task, _, sent = self.request("/owned-stream")
            await asyncio.wait_for(entered.wait(), 10)
            fail.set()
            observed = None
            try:
                await asyncio.wait_for(task, 1)
            except Exception as error:
                observed = error
            self.assertIsInstance(observed, RuntimeError)
            self.assertEqual(str(observed), "owned response failure")
            errors.assert_called_once()
        self.assertEqual([one["status"] for one in sent if one["type"] == "http.response.start"], [500])

    async def test_receive_runtime_errors_reach_the_application_error_handler(self):
        @self.app.get("/owned-stream")
        async def stream():
            return BufferedFileResponse(self.source)

        async def waiting_headers(response, scope, receive, send):
            await asyncio.Event().wait()

        with mock.patch.object(FileResponse, "__call__", waiting_headers), \
                mock.patch("peach.api._server_error_headers", return_value={"X-Peach-Error-ID": "test"}) as errors:
            task, messages, sent = self.request("/owned-stream")
            messages.put_nowait(RuntimeError('owned receive failed'))
            observed = None
            try:
                await asyncio.wait_for(task, 1)
            except Exception as error:
                observed = error
            while isinstance(observed, BaseExceptionGroup) and len(observed.exceptions) == 1:
                observed = observed.exceptions[0]
            self.assertIsInstance(observed, RuntimeError)
            self.assertIn('owned receive failed', str(observed))
            errors.assert_called_once()
        self.assertEqual([one["status"] for one in sent if one["type"] == "http.response.start"], [500])


class AvatarPickThreadTests(unittest.IsolatedAsyncioTestCase):
    async def test_concurrent_confirmations_keep_each_installed_file_in_one_image_transaction(self):
        images = []
        for color, image_format in (("red", "PNG"), ("blue", "JPEG")):
            output = io.BytesIO()
            Image.new("RGB", (8, 8), color).save(output, format=image_format)
            images.append(output.getvalue())
        entered, release, second_probe = (threading.Event() for _ in range(3))
        first_digest = hashlib.sha256(images[0]).hexdigest()

        def probe(destination):
            digest = hashlib.sha256(destination.read_bytes()).hexdigest()
            if digest == first_digest:
                entered.set()
                if not release.wait(3):
                    raise TimeoutError("controlled avatar transaction")
            else:
                second_probe.set()
            return {"sha256": digest, "px": [8, 8], "face": None}

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            state = SimpleNamespace(candidate_root=root / "generated", avatar_root=root / "avatars",
                                    cache_bust=mock.Mock())
            requests = [SimpleNamespace(
                headers={"content-type": mime}, query_params={"id": "1", "name": f"image-{index}"},
                body=mock.AsyncMock(return_value=body),
                app=SimpleNamespace(state=SimpleNamespace(web_contract=state)))
                for index, (body, mime) in enumerate(zip(images, ("image/png", "image/jpeg")))]
            tasks = []
            with mock.patch.object(routes_media, "_picker_entity", return_value=1), \
                    mock.patch.object(avatar_provider, "FaceProbe", return_value=probe):
                try:
                    tasks.append(asyncio.create_task(routes_media.avatar_pick(requests[0])))
                    self.assertTrue(await asyncio.to_thread(entered.wait, 1))
                    # 其它实体的共享安装入口可以独立完成，不等待这一张图的取景。
                    await asyncio.wait_for(asyncio.to_thread(
                        avatar_provider.install_entity_avatar, state.avatar_root, "performer", 2,
                        images[1], "image/jpeg", {}, probe_face=False), 1)
                    tasks.append(asyncio.create_task(routes_media.avatar_pick(requests[1])))
                    overlapped = await asyncio.to_thread(second_probe.wait, 0.3)
                finally:
                    release.set()
                    responses = await asyncio.gather(*tasks, return_exceptions=True)
            self.assertEqual([response.status_code for response in responses], [200, 200])
            destination = state.avatar_root / "performer-1.img"
            installed = destination.read_bytes()
            digest = hashlib.sha256(installed).hexdigest()
            provenance = json.loads(Path(f"{destination}.provenance.json").read_text(encoding="utf-8"))
            face = json.loads(destination.with_suffix(".face.json").read_text(encoding="utf-8"))
            self.assertEqual(installed, images[1])
            self.assertEqual(provenance["sha256"], digest)
            self.assertEqual(face["sha256"], digest)
            self.assertEqual(Path(f"{destination}.ct").read_text(encoding="utf-8"), "image/jpeg")
            self.assertFalse(overlapped)

    async def test_confirmation_work_and_connection_share_one_worker_thread(self):
        loop_thread = threading.get_ident()
        threads, progress = [], threading.Event()
        progressed = []

        def record():
            threads.append(threading.get_ident())

        @contextmanager
        def connection():
            record()
            database = sqlite3.connect(":memory:")
            try:
                yield database
            finally:
                record()
                database.close()

        def resolve(ref, database, *args, **kwargs):
            record()
            database.execute("SELECT 1").fetchone()
            progressed.append(progress.wait(0.2))
            return b"source", {"provider": "library"}

        def crop(body, box):
            record()
            return b"cropped", {"crop": box}

        def install(*args):
            record()
            self.assertEqual(args[-2], b"cropped")
            self.assertTrue(args[-1]["user_selected"])
            return {"sha256": "test"}

        async def tick():
            await asyncio.sleep(0.01)
            progress.set()

        state = SimpleNamespace(read_connection=connection, cache_bust=mock.Mock())
        request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(
            web_contract=state, http_transport=None)))
        payload = {"id": 1, "ref": "gfriends:test.jpg", "version": "v1",
                   "crop": {"x0": 0, "y0": 0, "x1": 1, "y1": 1}}
        timer = asyncio.create_task(tick())
        with tempfile.TemporaryDirectory() as tmp, \
                mock.patch.object(routes_media, "_picker_roots", return_value=(Path(tmp).resolve(), Path(tmp).resolve())), \
                mock.patch.object(routes_media, "_picker_request", new=mock.AsyncMock(return_value=(payload, b""))), \
                mock.patch.object(routes_media, "_picker_entity", side_effect=lambda *_: (record(), 1)[1]), \
                mock.patch.object(routes_media, "_picker_artwork", return_value=None), \
                mock.patch.object(routes_media, "_picker_online", return_value=None), \
                mock.patch.object(routes_media, "_remember_library"), \
                mock.patch.object(routes_media.avatar_picker, "accept_image"), \
                mock.patch.object(routes_media.avatar_picker, "prepare_image", side_effect=lambda body:body), \
                mock.patch.object(routes_media.avatar_picker, "resolve", side_effect=resolve) as resolved, \
                mock.patch.object(routes_media.avatar_picker, "crop", side_effect=crop), \
                mock.patch.object(routes_media.avatar_picker, "install", side_effect=install):
            response = await routes_media.avatar_pick(request)
            await asyncio.wait_for(timer, 1)
            self.assertEqual(resolved.call_args.kwargs["version"], "v1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(progressed, [True], "图片处理占用了事件循环")
        self.assertEqual(len(set(threads)), 1)
        self.assertNotEqual(threads[0], loop_thread)
        state.cache_bust.assert_called_once()
