"""FFmpeg 对应源码归档与发行清单的行为验证。"""
from __future__ import annotations

import importlib.util
import io
import json
import os
from pathlib import Path
import tarfile
import tempfile
import subprocess
import sys
import unittest
from unittest import mock
import urllib.error
import zipfile
from contextlib import nullcontext
import httpx


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/fetch_ffmpeg_sources.py"
SPEC = importlib.util.spec_from_file_location("ffmpeg_source_build", SCRIPT)
assert SPEC and SPEC.loader
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class FFmpegSourceBuildTests(unittest.TestCase):
    def setUp(self):
        self.opened = mock.Mock()
        client = mock.MagicMock()
        client.__enter__.return_value = client
        def stream(method, url, **kwargs):
            result = self.opened(method, url, **kwargs)
            return nullcontext(httpx.Response(200, content=result.read(), request=httpx.Request(method, url)))
        client.stream.side_effect = stream
        self.enterContext(mock.patch.object(builder, "http_client", return_value=client))

    def test_source_cache_falls_back_to_pinned_upstream_on_transport_failure(self):
        import hashlib
        data = b"pinned source bytes"
        source = {"name": "ffmpeg", "url": "https://upstream.example/source.tar.xz", "archive": "source.tar.xz",
                  "sha256": hashlib.sha256(data).hexdigest()}
        with tempfile.TemporaryDirectory() as temporary, mock.patch.dict(os.environ, {"PEACH_SOURCE_CACHE_BASE": "https://cache.example/_sources"}), \
                mock.patch.object(self, "opened", side_effect=[
                    urllib.error.HTTPError("https://cache.example", 404, "missing", {}, None), io.BytesIO(data)]) as opened:
            archive = Path(temporary).resolve() / "source.tar.xz"
            builder.obtain_source(source, archive)
            self.assertEqual(archive.read_bytes(), data)
            self.assertEqual([call.args[1] for call in opened.call_args_list],
                             [f"https://cache.example/_sources/{source['sha256']}/source.tar.xz", source["url"]])

    def test_source_cache_hash_mismatch_is_fatal(self):
        with tempfile.TemporaryDirectory() as temporary, mock.patch.dict(os.environ, {"PEACH_SOURCE_CACHE_BASE": "https://cache.example/_sources"}), \
                mock.patch.object(self, "opened", return_value=io.BytesIO(b"corrupt")) as opened:
            archive = Path(temporary).resolve() / "source.tar.xz"
            with self.assertRaisesRegex(ValueError, "SHA256"):
                builder.obtain_source({"name": "ffmpeg", "url": "https://upstream.example/source.tar.xz",
                                       "archive": "source.tar.xz", "sha256": "a" * 64}, archive)
            self.assertEqual(opened.call_count, 1)
            self.assertFalse(archive.exists())

    def test_download_retries_transport_failure_and_keeps_only_verified_archive(self):
        data = b"fixed upstream source"
        import hashlib
        source = {"name": "ffmpeg", "url": "https://upstream.example/source.tar.xz",
                  "sha256": hashlib.sha256(data).hexdigest()}
        with tempfile.TemporaryDirectory() as temporary:
            archive = Path(temporary).resolve() / "source.tar.xz"
            with mock.patch.object(self, "opened", side_effect=[TimeoutError(), io.BytesIO(data)]) as opened, \
                    mock.patch.object(builder.time, "sleep") as sleep:
                builder.download_source(source, archive)
            self.assertEqual(archive.read_bytes(), data)
            self.assertEqual(opened.call_count, 2)
            sleep.assert_called_once_with(2)
            self.assertFalse(archive.with_suffix(".xz.part").exists())

    def test_download_integrity_or_permanent_http_error_is_not_retried(self):
        for failure in (None, urllib.error.HTTPError("https://upstream.example", 403, "Forbidden", {}, None)):
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as temporary:
                archive = Path(temporary).resolve() / "source.tar.xz"
                with mock.patch.object(self, "opened", side_effect=failure,
                                       return_value=io.BytesIO(b"corrupt")) as opened, \
                        mock.patch.object(builder.time, "sleep") as sleep:
                    with self.assertRaises((ValueError, urllib.error.HTTPError)):
                        builder.download_source({"name": "ffmpeg", "url": "https://upstream.example/source.tar.xz",
                                                 "sha256": "a" * 64}, archive)
                self.assertEqual(opened.call_count, 1)
                sleep.assert_not_called()
                self.assertFalse(archive.exists())
                self.assertFalse(archive.with_suffix(".xz.part").exists())

    def test_download_stops_after_three_transport_attempts(self):
        with tempfile.TemporaryDirectory() as temporary:
            archive = Path(temporary).resolve() / "source.tar.xz"
            with mock.patch.object(self, "opened", side_effect=TimeoutError()) as opened, \
                    mock.patch.object(builder.time, "sleep") as sleep:
                with self.assertRaises(TimeoutError):
                    builder.download_source({"name": "ffmpeg", "url": "https://upstream.example/source.tar.xz",
                                             "sha256": "a" * 64}, archive)
            self.assertEqual(opened.call_count, 3)
            self.assertEqual(sleep.call_args_list, [mock.call(2), mock.call(4)])
            self.assertFalse(archive.exists())

    def test_source_lock_pins_all_linked_external_dependencies(self):
        lock = builder.load_sources()
        self.assertEqual(lock["version"], "9.1")
        self.assertEqual(lock["license"], "GPL-3.0-or-later")
        self.assertEqual({source["name"] for source in lock["sources"]},
                         {"ffmpeg", "x264", "nv-codec-headers", "dav1d", "amf-headers", "libvpl"})

    def make_sources(self, output):
        lock = builder.load_sources()
        directory = output / "sources"
        directory.mkdir()
        for source in lock["sources"]:
            archive = directory / source["archive"]
            with tarfile.open(archive, "w:gz") as package:
                data = b"upstream source and license\n"
                entry = tarfile.TarInfo(f"{source['name']}-revision/README")
                entry.size = len(data)
                package.addfile(entry, io.BytesIO(data))
            source["sha256"] = builder.digest(archive)
        return lock

    def test_prepare_verifies_archives_before_extracting(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary).resolve()
            lock = self.make_sources(output)
            builder.prepare(output, lock)
            for source in lock["sources"]:
                self.assertTrue((output / "work" / source["name"] / "README").is_file())
            with self.assertRaises(FileExistsError):
                builder.prepare(output, lock)

    def test_prepare_rejects_source_archive_tampering(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary).resolve()
            lock = self.make_sources(output)
            (output / "sources" / lock["sources"][0]["archive"]).write_bytes(b"corrupt")
            with self.assertRaisesRegex(ValueError, "SHA256"):
                builder.prepare(output, lock)
            self.assertFalse((output / "work/ffmpeg").exists())

    def test_finish_includes_sources_scripts_licenses_and_matching_hashes(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary).resolve()
            lock = self.make_sources(output)
            builder.prepare(output, lock)
            for path in ("ffmpeg/COPYING.GPLv3", "ffmpeg/COPYING.LGPLv2.1",
                         "ffmpeg/COPYING.LGPLv3", "x264/COPYING", "dav1d/COPYING",
                         "libvpl/LICENSE", "libvpl/third-party-programs.txt"):
                (output / "work" / path).write_text("license", encoding="utf-8")
            headers = output / "work/nv-codec-headers/include/ffnvcodec"
            headers.mkdir(parents=True)
            (headers / "test.h").write_text("/* MIT license */\ncode", encoding="utf-8")
            amf = output / "work/amf-headers/AMF/core"
            amf.mkdir(parents=True)
            for name in ("Version.h", "Platform.h"):
                (amf / name).write_text("// MIT license\n// Copyright AMD\n#pragma once\n", encoding="utf-8")
            (output / "ffmpeg/bin").mkdir(parents=True)
            for name in ("ffmpeg", "ffprobe"):
                (output / f"ffmpeg/bin/{name}.exe").write_bytes(b"MZ fixture")
            (output / "buildconf.mak").write_text("CONFIG_GPL=yes\n", encoding="utf-8")
            manifest = builder.finish(output, lock)
            source_zip = output / manifest["source_archive"]["name"]
            self.assertEqual(builder.digest(source_zip), manifest["source_archive"]["sha256"])
            for path, expected in manifest["files"].items():
                self.assertEqual(builder.digest(output / "ffmpeg" / path), expected)
            self.assertEqual((output / "ffmpeg/LICENSE-amf-headers.txt").read_text(encoding="utf-8"),
                             "// MIT license\n// Copyright AMD\n")
            self.assertTrue({"LICENSE-libvpl-LICENSE.txt", "LICENSE-libvpl-third-party-programs.txt"}
                            <= set(manifest["files"]))
            with zipfile.ZipFile(source_zip) as package:
                names = set(package.namelist())
                self.assertTrue({f"sources/{s['archive']}" for s in lock["sources"]} <= names)
                self.assertTrue({"scripts/build_ffmpeg_windows.sh", "scripts/fetch_ffmpeg_sources.py",
                                 "scripts/ffmpeg-sources.json", "README.md", "buildconf.txt"} <= names)
                self.assertFalse(any("manifest.json" in name for name in names))
                independent = output / "independent-source"
                package.extractall(independent)
            help_result = subprocess.run([sys.executable, "-S", str(independent / "scripts/fetch_ffmpeg_sources.py"), "--help"],
                                         cwd=independent, env={**os.environ, "PYTHONPATH": ""},
                                         capture_output=True, text=True, encoding="utf-8", check=True)
            self.assertIn("prepare", help_result.stdout)
            stored = json.loads((output / "ffmpeg/manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(stored, manifest)


if __name__ == "__main__":
    unittest.main()
