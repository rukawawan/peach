"""AI work suggestions use local evidence and write only after review."""
import json
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from PIL import Image, ImageDraw

from peach import web_ai_custom_tasks, web_ai_library, ai_prompts, web_ai_search, web_ai_timeline, ai_usage, personal_records, sample_images, web_catalog
from peach.ai_inference import InferenceError, InferenceResult
from peach.user_messages import UserValueError
from peach.web_contract import WebContract
from support.ledger import fresh_ledger


class AILibraryTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name).resolve()
        self.contract = WebContract(
            fresh_ledger(self.root), cover_root=self.root / "covers", follow_sources_root=self.root / "sources",
            follow_state_root=self.root / "state", follow_secrets_root=self.root / "secrets",
            follow_shared_root=self.root / "shared",
        )
        self.addCleanup(self.contract.stop_background_jobs)
        self.state = SimpleNamespace(
            settings=SimpleNamespace(secrets_root=self.root / "secrets"),
            web_contract=self.contract, http_transport=SimpleNamespace(client=object()),
        )
        with self.contract.write_transaction() as conn:
            conn.execute(
                "INSERT INTO asset(id, location, path, name, medium, code, original_title, catalog_title) "
                "VALUES(1, 'local', 'D:/demo/fixture.mp4', 'fixture.mp4', 'video', 'DEMO-001', ?, ?)",
                ("眼鏡の人", "Source title"),
            )
            conn.execute("INSERT INTO asset(id, location, path, name, medium) "
                         "VALUES(2, 'local', 'D:/demo/other.mp4', 'other.mp4', 'video')")
        metadata = self.root / "sources" / "library-metadata"
        metadata.mkdir(parents=True)
        (metadata / "DEMO-001-dmm.json").write_text(
            json.dumps({"description": "青い服を着た人が本を読む。"}), encoding="utf-8",
        )
        web_ai_library.configure(self.state, {"provider": "deepseek", "model": "deepseek-flash", "api_key": "fixture-key"})

    def test_custom_task_uses_its_saved_model_and_returns_only_a_text_answer(self):
        saved = web_ai_custom_tasks.configure(self.state, {
            "name": "Summarize",
            "prompt": "Summarize the supplied note in one line.",
            "connection": {"provider": "deepseek", "model": "deepseek-flash", "effort": "none"},
        }, allow_oauth=False)
        task_id = saved["id"]
        self.assertEqual(web_ai_custom_tasks.list_tasks(self.state)["tasks"], [
            {"id": task_id, "name": "Summarize", "provider": "deepseek"},
        ])
        self.assertEqual(saved["tasks"][0]["effort"], "none")
        with patch.object(web_ai_library, "infer", return_value=InferenceResult(
            "deepseek-flash", {"answer": "The list is ready."}
        )) as infer:
            result = web_ai_custom_tasks.run(self.state, {"id": task_id, "text": "I finished the list."},
                                         allow_oauth=False, on_usage=None, prompt_language="en")
        self.assertEqual(result["answer"], "The list is ready.")
        self.assertEqual(infer.call_args.args[1:3], ("deepseek", "deepseek-flash"))
        self.assertEqual(infer.call_args.kwargs["effort"], "none")
        self.assertEqual(json.loads(infer.call_args.kwargs["text"]), {"text": "I finished the list."})
        self.assertIn("Summarize the supplied note in one line.", infer.call_args.kwargs["system"])
        web_ai_custom_tasks.configure(self.state, {"id": task_id, "remove": True}, allow_oauth=False)
        self.assertEqual(web_ai_custom_tasks.list_tasks(self.state)["tasks"], [])

    def test_timeline_selects_different_periods_and_uses_adjacent_evidence(self):
        frames = []
        for index in range(60):
            image = Image.new("RGB", (96, 64), "#1b2534")
            draw = ImageDraw.Draw(image)
            x, y = index * 17 % 79, index * 7 % 44
            draw.rectangle((x, y, x + 16, y + 19), fill=(190 + index, 202 - index, 22 + index))
            frames.append(web_ai_timeline._frame(index, index * 10, image))
        original = frames[0]
        frames[1] = web_ai_timeline.Frame(2, 10, original.jpeg, original.signature, original.quality)
        selected = web_ai_timeline.select(frames)
        self.assertLessEqual(len(selected), web_ai_timeline.INITIAL_FRAMES)
        self.assertTrue({1, 2} - {frame.number for frame in selected})
        self.assertLess(selected[0].seconds, 100)
        self.assertGreater(selected[-1].seconds, 500)

        def inference(*args, **kwargs):
            prompt = kwargs["text"]
            groups = json.loads(prompt.split("Frame groups: ", 1)[1].split(". Allowed tags: ", 1)[0])
            first = groups[0][0]
            if len(groups[0]) <= 3:
                evidence = [{"tag": "接吻", "evidence": "two adjacent frames", "frames": groups[0][:2]}]
            else:
                evidence = [{"tag": "眼镜", "evidence": "visible", "frames": [first]},
                            {"tag": "接吻", "evidence": "single frame", "frames": [first]},
                            {"tag": "黑发", "evidence": "outside input", "frames": [900]}]
            return InferenceResult("served-model", {"tags": evidence, "poses": [],
                                                    "needs_context": [first]})

        timeline = web_ai_timeline.Timeline("peach", len(frames), frames)
        with patch.object(web_ai_timeline, "read", return_value=timeline), patch.object(web_ai_library, "infer", side_effect=inference):
            result = web_ai_library.suggest(self.state, 1, {"provider": "deepseek", "task": "vision", "image": "timeline"})
        self.assertEqual([row["tag"] for row in result["tags"]], ["眼镜", "接吻"])
        self.assertGreater(result["coverage"]["sent"], len(selected))
        self.assertLessEqual(result["coverage"]["sent"], web_ai_timeline.MAX_FRAMES)
        first, second = result["tags"][1]["frames"]
        self.assertLessEqual(second["seconds"] - first["seconds"], 45)
        with self.contract.read_connection() as conn:
            self.assertIsNone(conn.execute("SELECT 1 FROM asset_tag WHERE asset_id=1").fetchone())
        web_ai_library.approve(self.contract, 1, {"token": result["token"], "tags": ["接吻"]})
        with self.contract.read_connection() as conn:
            metadata = conn.execute("SELECT metadata_json FROM asset_entity WHERE asset_id=1").fetchone()[0]
        self.assertEqual(json.loads(metadata)["ai_review"]["frames"], [first, second])

    def test_timeline_retains_completed_batches_when_provider_limits_a_later_batch(self):
        frames = []
        for index in range(7):
            image = Image.new("RGB", (96, 64), "#1b2534")
            draw = ImageDraw.Draw(image)
            draw.rectangle((10 * index, 10, 10 * index + 20, 36), fill="#ffbf41")
            frames.append(web_ai_timeline._frame(index, None, image))
        timeline = web_ai_timeline.Timeline("snapshot", 9, frames)
        good = InferenceResult("model", {"tags": [], "poses": [], "needs_context": []})
        with patch.object(web_ai_timeline, "select", return_value=frames):
            _, result = web_ai_timeline.analyze(timeline, set(), unittest.mock.Mock(side_effect=[good, InferenceError("quota")]))
        self.assertEqual(result["coverage"]["analyzed"], 6)
        self.assertEqual(result["coverage"]["sent"], 7)
        self.assertEqual(result["coverage"]["error"], "quota")

    def test_official_stills_keep_photo_number_and_do_not_claim_temporal_action(self):
        cache = sample_images.SampleCache(self.root / "sample-cache")
        self.state.sample_cache = cache
        with self.contract.write_transaction() as conn:
            sample_images.land(conn, "DEMO-001", "dmm", [
                "https://pics.dmm.co.jp/digital/video/demo001/demo001jp-1.jpg",
                "https://javdb.com/sample.jpg",
            ], source="sample-test")
        folder = cache.root / "DEMO-001"
        folder.mkdir(parents=True)
        image = Image.new("RGB", (96, 64), "#19233b")
        ImageDraw.Draw(image).rectangle((5, 9, 65, 49), fill="#f7c745")
        image.save(folder / "1.thumb.jpg")
        self.assertEqual(web_ai_library.detail(self.contract, 1)["official_samples"], 1)
        reply = {"tags": [{"tag": tag, "evidence": "sample", "frames": [1]} for tag in ("眼镜", "接吻")],
                 "poses": [], "needs_context": [1]}
        with patch.object(web_ai_library, "infer", return_value=InferenceResult("served-model", reply)):
            result = web_ai_library.suggest(self.state, 1, {"provider": "deepseek", "task": "vision", "image": "official"})
        self.assertEqual(result["coverage"]["source"], "official")
        self.assertEqual(result["tags"], [{"tag": "眼镜", "evidence": "sample",
                                           "frames": [{"frame": 1, "seconds": None}]}])

    def test_usage_counts_provider_output_that_cannot_be_used_and_keeps_oauth_local(self):
        root = self.contract.follow_state_root
        self.assertEqual(ai_usage.summary(root, include_oauth=True)["rows"], [])
        self.assertFalse((root / "ai-usage.db").exists())
        replies = [
            {"model": "served-model", "usage": {"prompt_tokens": 90, "completion_tokens": 5},
             "choices": [{"finish_reason": "length"}]},
            {"model": "served-model", "choices": [{"finish_reason": "stop", "message": {"content": '{"tags":[]}'}}]},
        ]
        with httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(200, json=replies.pop(0)))) as client:
            self.state.http_transport.client = client
            body = {"provider": "deepseek", "task": "tags"}
            with self.assertRaises(UserValueError):
                web_ai_library.suggest(self.state, 1, body)
            web_ai_library.suggest(self.state, 1, body)
        ai_usage.record(root, "openai-oauth", "some-model", "vision", None)
        local_report = ai_usage.summary(root, include_oauth=True, days=7)
        remote_report = ai_usage.summary(root, include_oauth=False, days=7)
        local = local_report["rows"]
        remote = remote_report["rows"]
        self.assertEqual(local_report["days"], 7)
        self.assertEqual(remote_report["daily"], [{
            "day": remote_report["end"], "provider": "deepseek", "requests": 2, "measured": 1,
            "input_tokens": 90, "output_tokens": 5,
        }])
        self.assertEqual(local_report["daily"][1]["provider"], "openai-oauth")
        self.assertIsNone(local_report["daily"][1]["input_tokens"])
        self.assertEqual(remote, [{"provider": "deepseek", "model": "served-model", "task": "tags",
                                   "requests": 2, "measured": 1, "input_tokens": 90, "output_tokens": 5}])
        self.assertEqual(local[0], remote[0])
        self.assertEqual(local[1]["requests"], 1)
        self.assertIsNone(local[1]["input_tokens"])

    def test_organization_usage_aggregates_pages_and_cached_tokens(self):
        replies = [
            {"data": [{"results": [{"input_tokens": 100, "input_cached_tokens": 20, "output_tokens": 12}]}],
             "has_more": True, "next_page": "more"},
            {"data": [{"results": [{"input_tokens": 9, "output_tokens": 1}]}], "has_more": False},
            {"data": [{"results": [{"uncached_input_tokens": 7, "output_tokens": 3, "cache_read_input_tokens": 110,
                                    "cache_creation": {"ephemeral_1h_input_tokens": 5, "ephemeral_5m_input_tokens": 10}}]}],
             "has_more": False},
        ]
        requests = []

        def report(request):
            requests.append(request)
            return httpx.Response(200, json=replies.pop(0))

        with (patch.dict(os.environ, OPENAI_ADMIN_KEY="openai-fixture", ANTHROPIC_ADMIN_KEY="claude-fixture"),
              httpx.Client(transport=httpx.MockTransport(report)) as client):
            self.state.http_transport.client = client
            self.assertEqual(ai_usage.account_usage(self.state, "openai", 30), {"kind": "organization", "tokens": 122})
            self.assertEqual(ai_usage.account_usage(self.state, "anthropic", 7), {"kind": "organization", "tokens": 135})
        self.assertEqual(requests[0].headers["Authorization"], "Bearer openai-fixture")
        self.assertEqual(requests[1].url.params["page"], "more")
        self.assertEqual(requests[2].headers["x-api-key"], "claude-fixture")

    def test_account_usage_keeps_balance_and_subscription_separate_from_tokens(self):
        def balance(request):
            self.assertEqual(request.url.path, "/user/balance")
            self.assertEqual(request.headers["Authorization"], "Bearer fixture-key")
            return httpx.Response(200, json={"balance_infos": [{"currency": "CNY", "total_balance": "24.50"}]})

        with (patch.dict(os.environ, OPENAI_ADMIN_KEY=""), httpx.Client(transport=httpx.MockTransport(balance)) as client):
            self.state.http_transport.client = client
            self.assertEqual(ai_usage.account_usage(self.state, "deepseek", 30),
                             {"kind": "balance", "balances": [{"currency": "CNY", "amount": "24.50"}]})
            self.assertEqual(ai_usage.account_usage(self.state, "openai-oauth", 30), {"kind": "subscription"})
            self.assertEqual(ai_usage.account_usage(self.state, "openai", 30), {"kind": "admin_required"})

    def suggest(self, task, value):
        with patch.object(web_ai_library, "infer", return_value=InferenceResult("fixture-model", value)) as infer:
            result = web_ai_library.suggest(self.state, 1, {"provider": "deepseek", "task": task, "language": "zh-TW"})
        return result, infer.call_args.kwargs["text"]

    def test_translation_is_separate_and_requires_matching_review(self):
        result, text = self.suggest("translate", {"title": "戴眼鏡的人", "summary": "穿藍衣的人正在看書。"})
        self.assertIn("青い服を着た人が本を読む。", text)
        self.assertNotIn("D:/demo", text)
        self.assertEqual(web_ai_library.detail(self.contract, 1)["translations"], [])
        with self.assertRaises(UserValueError):
            web_ai_library.approve(self.contract, 2, {"token": result["token"]})
        web_ai_library.approve(self.contract, 1, {
            "token": result["token"], "translation": {"title": "眼鏡讀者", "summary": result["summary"]},
        })
        row, = web_ai_library.detail(self.contract, 1)["translations"]
        self.assertEqual((row["title"], row["quality"], row["model"]), ("眼鏡讀者", "human", "fixture-model"))
        with self.assertRaises(UserValueError):
            web_ai_library.approve(self.contract, 1, {"token": result["token"]})
        with self.contract.write_transaction() as conn:
            title = conn.execute("SELECT original_title FROM asset WHERE id=1").fetchone()[0]
            self.assertEqual(title, "眼鏡の人")
            personal_records.delete_asset_rows(conn, [1])
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM asset_content_translation").fetchone()[0], 0)

    def test_english_translation_uses_task_model_and_effort_without_changing_tagging(self):
        web_ai_library.configure(self.state, {"provider": "openai", "model": "gpt-5.4-mini", "api_key": "fixture-key"})
        web_ai_library.configure_task(self.state, {"task": "translate", "provider": "openai", "model": "gpt-6-luna",
                                               "effort": "none"}, allow_oauth=False)
        with patch.object(web_ai_library, "infer", return_value=InferenceResult(
                "gpt-6-luna", {"title": "A reader with glasses", "summary": "A person in blue reads a book."})) as infer:
            suggestion = web_ai_library.suggest(self.state, 1, {"task": "translate", "language": "en"})
            self.assertEqual(infer.call_args.args[1], "openai")
            self.assertEqual(infer.call_args.args[2], "gpt-6-luna")
            self.assertEqual(infer.call_args.kwargs["effort"], "none")
            self.assertIn("summary to English", infer.call_args.kwargs["system"])
        self.assertEqual(web_ai_library.detail(self.contract, 1)["translations"], [])
        web_ai_library.approve(self.contract, 1, {"token": suggestion["token"]})
        saved, = web_ai_library.detail(self.contract, 1)["translations"]
        self.assertEqual((saved["language"], saved["title"]), ("en", "A reader with glasses"))
        missing = web_catalog.q_items(self.contract, {"translation_missing": "en"})
        self.assertEqual([row["id"] for row in missing["items"]], [2])
        with patch.object(web_ai_library, "infer", return_value=InferenceResult("gpt-5.4-mini", {"tags": []})) as infer:
            web_ai_library.suggest(self.state, 1, {"provider": "openai", "task": "tags"})
            self.assertEqual(infer.call_args.args[2], "gpt-5.4-mini")
            self.assertEqual(infer.call_args.kwargs["effort"], "low")

    def test_saved_prompts_apply_only_to_the_matching_model_operation(self):
        ai_prompts.configure(self.state, {"scope": "system", "text": "Use short explanations."})
        ai_prompts.configure(self.state, {"scope": "translate", "text": "Choose plain language."})
        ai_prompts.configure(self.state, {"scope": "metadata", "text": "Preserve the studio's official case."})
        with patch.object(web_ai_library, "infer", return_value=InferenceResult(
                "fixture-model", {"title": "A reader", "summary": "A person reads."})) as infer:
            web_ai_library.suggest(self.state, 1, {"task": "translate", "language": "en"})
        call = infer.call_args.kwargs
        self.assertIn("Use short explanations.", call["system"])
        self.assertIn("Choose plain language.", call["system"])
        self.assertNotIn("official case", call["system"])
        self.assertNotIn("fixture-key", call["system"] + call["text"])
        self.assertEqual(json.loads(call["text"])["title"], "眼鏡の人")
        planning = ai_prompts.instructions(self.state, "search", "Keep the schema.")
        self.assertIn("official case", planning)
        self.assertNotIn("Choose plain language.", planning)
        self.assertTrue(planning.endswith("Keep the schema."))
        with self.assertRaises(UserValueError):
            ai_prompts.configure(self.state, {"scope": "translate", "text": "x" * (ai_prompts.LIMIT + 1)})
        restored = ai_prompts.configure(self.state, {"scope": "translate", "text": ""})
        self.assertNotIn("translate", restored["overrides"])
        self.assertIn(json.dumps(restored["defaults"]["translate"], ensure_ascii=False),
                      ai_prompts.instructions(self.state, "translate", ""))

    def test_default_prompts_follow_interface_language_and_overrides_are_verbatim(self):
        chinese = ai_prompts.settings(self.state, "zh-CN")["defaults"]
        english = ai_prompts.settings(self.state, "en")["defaults"]
        self.assertEqual(tuple(chinese), tuple(english))
        for scope in chinese:
            self.assertNotEqual(chinese[scope], english[scope])
        with patch.object(web_ai_library, "infer", return_value=InferenceResult(
                "fixture-model", {"title": "讀者", "summary": "日誌"})) as infer:
            web_ai_library.suggest(self.state, 1, {"task": "translate", "language": "zh-TW"}, prompt_language="en")
        self.assertIn(json.dumps(english["translate"], ensure_ascii=False), infer.call_args.kwargs["system"])
        self.assertIn("Traditional Chinese (Taiwan)", infer.call_args.kwargs["system"])
        ai_prompts.configure(self.state, {"scope": "translate", "text": "保留作品番号"}, "zh-CN")
        self.assertIn("保留作品番号", ai_prompts.instructions(self.state, "translate", "", "en"))
        restored = ai_prompts.configure(self.state, {"scope": "translate", "text": ""}, "en")
        self.assertEqual(restored["defaults"]["translate"], english["translate"])

    def test_public_routes_cannot_use_saved_connections_with_a_valid_session(self):
        from fastapi import HTTPException, Request, Response
        from peach import routes_api

        def request(host, peer, extra=()):
            headers = [("host", host), ("sec-fetch-site", "same-origin"), *extra]
            return Request({"type": "http", "method": "GET", "scheme": "https", "path": "/",
                            "headers": [(key.encode(), value.encode()) for key, value in headers],
                            "client": (peer, 12345), "app": SimpleNamespace(state=self.state)})

        from ipaddress import IPv4Address

        private_host = str(IPv4Address(bytes((192, 168, 0, 2))))
        private_peer = str(IPv4Address(bytes((192, 168, 0, 3))))
        public_requests = (
            request("peach.example.test", "127.0.0.1"),
            request(private_host, "8.8.8.8"),
            request("127.0.0.1", "127.0.0.1", [("cf-ray", "example")]),
            request(private_host, private_peer, [("x-forwarded-host", "peach.example.test")]),
            request("127.0.0.1", "127.0.0.1", [("origin", "https://peach.example.test")]),
        )
        with patch.object(routes_api, "authenticated_client", return_value=True):
            for public in public_requests:
                for call in (
                    lambda public=public: routes_api.ai_connections(public, Response()),
                    lambda public=public: routes_api.ai_account_usage(public, "deepseek", 30),
                    lambda public=public: routes_api.ai_search_models(public, "openai"),
                    lambda public=public: routes_api.ai_search_plan(public, {"query": "sample", "scope": "library"}),
                    lambda public=public: routes_api.ai_asset_suggest(public, 1, {"task": "translate"}),
                ):
                    with self.assertRaises(HTTPException) as denied:
                        call()
                    self.assertEqual(denied.exception.status_code, 403)
                    self.assertEqual(denied.exception.detail["message_code"], "api.aiLibrary.privateAccess")
            private = request(private_host, f"::ffff:{private_peer}")
            self.assertTrue(routes_api.ai_connections(private, Response())["providers"])

    def test_search_plan_keeps_supported_filters_and_ignores_model_supplied_results(self):
        proposal = InferenceResult("served-model", {"tag": "眼镜,unknown,眼镜", "year": "2024",
                                    "state": "fresh", "translation_missing": "en", "outside": "DEMO-001",
                                    "items": [{"id": 99}], "sql": "DROP TABLE asset"})
        with patch.object(web_ai_library, "infer", return_value=proposal) as infer:
            result = web_ai_search.plan(self.state, {"query": "Glasses\nwithout English translations", "scope": "library"},
                                    allow_oauth=False)
        self.assertEqual(result, {"filters": {"tag": "眼镜", "year": "2024", "state": "fresh", "translation_missing": "en"},
                                  "provider": "deepseek", "model": "served-model"})
        self.assertIn("Glasses without English translations", infer.call_args.kwargs["text"])

    def test_search_follow_up_sends_only_supported_previous_filters(self):
        proposal = InferenceResult("served-model", {"q": "DEMO-001", "state": "fresh"})
        with patch.object(web_ai_library, "infer", return_value=proposal) as infer:
            result = web_ai_search.plan(self.state, {
                "query": "Only unwatched", "scope": "library",
                "previous_filters": {"q": "DEMO-001", "releaseFrom": "2024-01-31", "releaseTo": "2024-02-31", "items": [41]},
            }, allow_oauth=False)
        self.assertIn('Previous filters: {"q": "DEMO-001", "releaseFrom": "2024-01-31"}', infer.call_args.kwargs["text"])
        self.assertEqual(result["filters"], {"q": "DEMO-001", "state": "fresh"})

    def test_work_plan_returns_a_bounded_metadata_draft(self):
        proposal = InferenceResult("served-model", {
            "task": "metadata", "target": "DEMO-001",
            "metadata": {"title": "Edited title", "release_date": "2024-02-31", "asset_id": 99},
        })
        with patch.object(web_ai_library, "infer", return_value=proposal):
            result = web_ai_search.plan(self.state, {"query": "Give DEMO-001 the title Edited title", "scope": "library"},
                                    allow_oauth=False)
        self.assertEqual(result["filters"], {})
        self.assertEqual(result["work"], {"kind": "metadata", "target": "DEMO-001", "metadata": {"title": "Edited title"}})

    def test_external_search_uses_source_rows_and_excludes_owned_codes(self):
        source_rows = [{"number": "DEMO-001"}, {"number": "TEST-002", "title": "Discovery"},
                       {"number": "TEST-002"}, {"number": "../invalid"}]
        with patch.object(web_ai_search.javdb_public.PUBLIC_API, "search_movies", return_value=source_rows) as search:
            result = web_ai_search.external(self.contract, "keyword")
        search.assert_called_once_with("keyword")
        self.assertEqual(result, {"items": [{"code": "TEST-002", "title": "Discovery"}], "source": "javdb"})

    def test_external_search_projects_verified_cover_and_cast_metadata(self):
        public = web_ai_search.javdb_public.PUBLIC_API
        row = {"number": "TEST-008", "id": "catalog8", "title": "Search title"}
        movie = {"id": "catalog8", "number": "TEST-008", "origin_title": "Source title",
                 "cover_url": "https://pics.dmm.co.jp/digital/video/test008/test008pl.jpg",
                 "actors": [{"id": "actor8", "name": "Performer", "gender": "female"}],
                 "tags": [{"name": "眼镜"}]}
        with patch.object(public, "search_movies", return_value=[row]), patch.object(public, "movie", return_value=movie) as fetch:
            result = web_ai_search.external(self.contract, "title")
        fetch.assert_called_once_with("TEST-008", source_id="catalog8")
        item, = result["items"]
        self.assertEqual(item["title"], "Source title")
        self.assertTrue(item["has_remote_cover"])
        self.assertEqual(item["performer_refs"][0]["name"], "Performer")
        self.assertEqual(item["tags"], ["眼镜"])

    def test_cost_effective_openai_recommendations_cover_both_connection_methods(self):
        for provider in ("openai", "openai-oauth"):
            with self.subTest(provider=provider):
                text = web_ai_library.connection_choices(provider, "gpt-6-luna")
                vision = web_ai_library.connection_choices(provider, "gpt-6.1-terra")
                self.assertEqual(text["suggested_models"]["translate"][0], "gpt-6-luna")
                self.assertEqual(text["suggested_models"]["tags"][0], "gpt-6-luna")
                self.assertEqual(vision["suggested_models"]["vision"][0], "gpt-6.1-terra")
                self.assertEqual(text["default_efforts"]["translate"], "none")
                self.assertEqual(vision["default_efforts"]["vision"], "medium")

    def test_effort_recommendations_follow_the_selected_model_and_task(self):
        cases = [
            ("openai", "gpt-6-luna", "search", "low"),
            ("openai-oauth", "gpt-6.2-astra-2026-10-01", "vision", "high"),
            ("openai", "gpt-6.1-terra", "vision", "medium"),
            ("anthropic", "claude-sonnet-5-5", "tags", "low"),
            ("anthropic", "claude-opus-5-5", "tags", "medium"),
            ("anthropic", "claude-fable-5-2", "vision", "high"),
            ("deepseek", "deepseek-flash", "search", "low"),
            ("deepseek", "deepseek-v4-pro", "search", "high"),
        ]
        for provider, model, task, expected in cases:
            with self.subTest(provider=provider, model=model, task=task):
                result = web_ai_library.model_choices(provider, model)
                self.assertEqual(result["default_efforts"][task], expected)
                self.assertIn(expected, result["efforts"])

    def test_gateway_effort_recommendations_use_only_reported_choices(self):
        model = "vendor/gpt-6.2-astra"
        result = web_ai_library.model_choices("custom", model, protocol="openai", reported=["low", "medium"])
        self.assertEqual(result["default_efforts"]["vision"], "medium")
        self.assertNotIn("high", result["efforts"])
        unknown = web_ai_library.model_choices("custom", model, protocol="openai")
        self.assertEqual(unknown["default_efforts"]["vision"], "default")

    def test_official_connection_precedes_an_override_when_the_task_has_no_profile(self):
        web_ai_library.configure(self.state, {"provider": "anthropic", "model": "relay-model", "api_key": "relay-test-key",
                                         "base_url": "https://gateway.example/v1"})
        provider, _ = web_ai_library.task_request(self.state, "translate", allow_oauth=False)
        self.assertEqual(provider, "deepseek")
        web_ai_library.configure_task(self.state, {"task": "translate", "provider": "anthropic", "model": "relay-model",
                                  "effort": "default"}, allow_oauth=False)
        provider, _ = web_ai_library.task_request(self.state, "translate", allow_oauth=False)
        self.assertEqual(provider, "anthropic")

    def test_text_tag_requires_literal_evidence_and_canonical_tag(self):
        result, _ = self.suggest("tags", {"tags": [
            {"tag": "眼镜", "evidence": "眼鏡"},
            {"tag": "双马尾", "evidence": "fabricated"},
            {"tag": "unknown label", "evidence": "眼鏡"},
        ]})
        self.assertEqual(result["tags"], [{"tag": "眼镜", "evidence": "眼鏡"}])
        with self.contract.read_connection() as conn:
            self.assertIsNone(conn.execute("SELECT 1 FROM asset_tag WHERE asset_id=1").fetchone())
        with self.assertRaises(UserValueError):
            web_ai_library.approve(self.contract, 1, {"token": result["token"], "tags": ["双马尾"]})
        web_ai_library.approve(self.contract, 1, {"token": result["token"], "tags": ["眼镜"]})
        with self.contract.read_connection() as conn:
            self.assertEqual(conn.execute("SELECT tag FROM asset_tag WHERE asset_id=1").fetchone()[0], "眼镜")

    def test_changed_origin_invalidates_pending_translation(self):
        result, _ = self.suggest("translate", {"title": "戴眼鏡的人", "summary": "穿藍衣的人正在看書。"})
        with self.contract.write_transaction() as conn:
            conn.execute("UPDATE asset SET original_title='New source' WHERE id=1")
        with self.assertRaises(UserValueError) as raised:
            web_ai_library.approve(self.contract, 1, {"token": result["token"]})
        self.assertEqual(raised.exception.status_code, 409)

    def test_connection_status_never_returns_key(self):
        result = web_ai_library.connections(self.state)
        row = next(row for row in result["providers"] if row["id"] == "deepseek")
        self.assertTrue(row["configured"])
        self.assertNotIn("fixture-key", json.dumps(result))
        web_ai_library.configure(self.state, {"provider": "deepseek", "remove": True})
        self.assertFalse(next(row for row in web_ai_library.connections(self.state)["providers"]
                              if row["id"] == "deepseek")["configured"])

    def test_verification_does_not_replace_saved_credentials(self):
        with patch.object(web_ai_library, "verify_model", return_value="verified-model") as request:
            result = web_ai_library.verify_connection(self.state, {
                "provider": "deepseek", "model": "tested-model", "api_key": "temporary-key",
            })
            request.assert_called_once_with(self.state.http_transport.client, "deepseek", "tested-model", "temporary-key")
        self.assertEqual(result, {"model": "verified-model"})
        configured = next(row for row in web_ai_library.connections(self.state)["providers"] if row["id"] == "deepseek")
        self.assertEqual(configured["model"], "deepseek-flash")

    def test_switching_api_base_requires_a_fresh_key_for_catalog_verify_and_save(self):
        draft = {"provider": "deepseek", "model": "gateway-model", "base_url": "http://localhost/v1", "port": "11434"}
        for operation in (web_ai_library.connection_models, web_ai_library.verify_connection, web_ai_library.configure):
            with self.subTest(operation=operation.__name__), patch.object(web_ai_library, "_saved_key") as read_key:
                with self.assertRaises(UserValueError) as raised:
                    operation(self.state, draft)
                self.assertEqual(raised.exception.code, "api.aiLibrary.endpointKey")
                read_key.assert_not_called()
        result = web_ai_library.configure(self.state, {**draft, "api_key": "gateway-test-key"})
        row = next(row for row in result["providers"] if row["id"] == "deepseek")
        base = "http://localhost:11434/v1"
        self.assertEqual(row["base_url"], base)
        self.assertNotIn("gateway-test-key", json.dumps(result))
        with patch.object(web_ai_library, "list_models", return_value=[]) as catalog:
            web_ai_library.connection_models(self.state, {"provider": "deepseek"})
            catalog.assert_called_once_with(self.state.http_transport.client, "deepseek", "gateway-test-key", base_url=base)
        with patch.object(web_ai_library, "infer", return_value=InferenceResult("gateway-model", {})) as infer:
            _, request = web_ai_library.task_request(self.state, "translate", "deepseek")
            request("catalog example", None, None, instructions="Translate")
            self.assertEqual(infer.call_args.kwargs["base_url"], base)
        with patch.object(ai_usage, "_deepseek_balance") as balance:
            self.assertEqual(ai_usage.account_usage(self.state, "deepseek", 30), {"kind": "unavailable"})
            balance.assert_not_called()
        with self.assertRaises(UserValueError) as raised:
            web_ai_library.configure(self.state, {"provider": "deepseek", "model": "deepseek-flash", "base_url": ""})
        self.assertEqual(raised.exception.code, "api.aiLibrary.endpointKey")

    def test_standalone_providers_keep_their_own_catalogs_models_and_usage(self):
        base = {"provider": "custom", "protocol": "anthropic", "base_url": "https://gateway.example/v1",
                "port": "9443", "api_key": "example-gateway-key", "model": "gateway/compact"}
        found = [{"id": base["model"], "label": "Compact", "reasoning_levels": ["none", "low", "high"], "vision": True}]
        with patch.object(web_ai_library, "list_models", return_value=found) as listing:
            result = web_ai_library.connection_models(self.state, base)
        self.assertEqual(result["models"][0]["efforts"], ("default", "low", "high"))
        self.assertTrue(result["models"][0]["vision"])
        listing.assert_called_once_with(self.state.http_transport.client, "anthropic", "example-gateway-key",
                                        base_url="https://gateway.example:9443/v1", external=True)
        web_ai_library.configure(self.state, {**base, "label": "Example gateway"})
        result = web_ai_library.configure(self.state, {**base, "label": "Local models", "protocol": "openai",
            "base_url": "http://localhost:3425/v1", "port": "", "model": "local/model", "manual_model": True})
        gateway, local = [row for row in result["providers"] if row.get("custom")]
        self.assertNotEqual(gateway["id"], local["id"])
        self.assertNotIn("example-gateway-key", json.dumps(result))
        self.assertEqual(gateway["base_url"], "https://gateway.example:9443/v1")
        with patch.object(web_ai_library, "list_models") as listing:
            result = web_ai_library.connection_models(self.state, {"provider": local["id"]})
        self.assertEqual(result["models"][0]["id"], local["model"])
        self.assertEqual(result["models"][0]["default_efforts"]["translate"], "default")
        self.assertFalse(result["models"][0]["effort_reported"])
        listing.assert_not_called()
        web_ai_library.configure_task(self.state, {"task": "translate", "provider": gateway["id"],
                                  "model": gateway["model"], "effort": "high"}, allow_oauth=True)
        def inference(*args, **options):
            options["on_usage"](gateway["model"], ai_usage.TokenUsage(4, 1))
            return InferenceResult(gateway["model"], {})

        with patch.object(web_ai_library, "infer", side_effect=inference) as infer:
            provider, request = web_ai_library.task_request(self.state, "translate")
            request("catalog example", None, None, instructions="Translate")
        self.assertEqual(provider, gateway["id"])
        self.assertEqual(infer.call_args.args[1:4], ("anthropic", gateway["model"], "example-gateway-key"))
        self.assertEqual(infer.call_args.kwargs["base_url"], gateway["base_url"])
        self.assertEqual(infer.call_args.kwargs["effort"], "high")
        row, = ai_usage.summary(self.contract.follow_state_root, include_oauth=True)["rows"]
        self.assertEqual((row["provider"], row["input_tokens"], row["output_tokens"]), (gateway["id"], 4, 1))
        self.assertEqual(ai_usage.account_usage(self.state, gateway["id"], 30), {"kind": "custom"})
        with self.assertRaises(UserValueError) as raised:
            web_ai_library.connection_models(self.state, {"provider": gateway["id"], "protocol": "openai"})
        self.assertEqual(raised.exception.code, "api.aiLibrary.endpointKey")
        result = web_ai_library.configure(self.state, {"provider": gateway["id"], "remove": True})
        self.assertEqual([row["id"] for row in result["providers"] if row.get("custom")], [local["id"]])
        self.assertEqual(result["task_profiles"]["translate"], {})
