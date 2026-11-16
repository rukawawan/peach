"""无 Homebrew 路径下验收包内媒体探测、抽帧、转码与缺索引修复。"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from unittest.mock import patch

from build_macos_media import audit_binary
from smoke_desktop import assert_av1_decoder

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from peach.ffmpeg import FFmpegResolver
from peach.interface_text import dev as t
from peach.mp4recover import untrunc_path
from peach.tunnel import resolve_binary
from peach.hardware_transcode import HardwareTranscoder
from peach.media_processing_policy import save_preferences
from peach.frame_capture import capture_with_retry
from peach.transcodes import TranscodeService


def verified_tools(executable: Path, root: Path, architecture: str):
    """核对应用资源、解析器和媒体清单，返回实际包内工具。"""
    from media_tool_bundle import checked_file
    resolver = FFmpegResolver(root / "tools/ffmpeg")
    ffmpeg, ffprobe = resolver.ffmpeg(), resolver.ffprobe()
    repair, tunnel = untrunc_path(root / "tools"), resolve_binary()
    assert ffmpeg and ffprobe and repair and tunnel, t("smoke_macos_media.toolsMissing")
    assert ffmpeg.source == ffprobe.source == "peach-bundled"
    for path in (ffmpeg.path, ffprobe.path, repair, tunnel):
        assert path.is_relative_to(executable.parent.parent), path
        audit_binary(path, architecture)
    for tool in ("ffmpeg", "untrunc"):
        bundle = executable.parent.parent / "Resources/tools" / tool
        manifest = json.loads((bundle / "manifest.json").read_text())
        assert manifest["platform"] == "darwin" and manifest["architecture"] == architecture
        for name, digest in manifest["files"].items():
            checked_file(bundle, name, digest)
    return resolver, ffmpeg, ffprobe, repair, tunnel


def smoke(app: Path, architecture: str) -> dict:
    executable = app.resolve() / "Contents/MacOS/Peach"
    env = {key: value for key, value in os.environ.items() if not key.startswith(("PEACH_", "DYLD_"))}
    env["PATH"] = "/usr/bin:/bin:/usr/sbin:/sbin"
    with tempfile.TemporaryDirectory(prefix="peach-macos-media-") as directory, \
            patch.dict(os.environ, env, clear=True), patch.object(sys, "executable", str(executable)), \
            patch.object(sys, "frozen", True, create=True):
        root = Path(directory).resolve()
        resolver, ffmpeg, ffprobe, repair, tunnel = verified_tools(executable, root, architecture)
        def run(args):
            return subprocess.run([str(arg) for arg in args], cwd=root, env=env, capture_output=True,
                                  text=True, encoding="utf-8", timeout=60, check=True)
        video, converted, image = root / "sample.mp4", root / "converted.mp4", root / "frame.jpg"
        run([ffmpeg.path, "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=640x360:r=25",
             "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "2",
             "-c:v", "libx264", "-bf", "0", "-pix_fmt", "yuv420p", "-c:a", "aac", video])
        run([ffmpeg.path, "-v", "error", "-i", video, "-vf", "scale=320:-2", "-c:v", "libx264", "-c:a", "aac", converted])
        run([ffmpeg.path, "-v", "error", "-i", video, "-frames:v", "1", image])
        assert image.stat().st_size > 1000
        def probe(path):
            result = json.loads(run([ffprobe.path, "-v", "error", "-show_streams", "-show_format", "-of", "json", path]).stdout)
            assert {stream["codec_name"] for stream in result["streams"]} == {"h264", "aac"}
            assert 1.8 < float(result["format"]["duration"]) < 2.3
            return result
        probe(video)
        probe(converted)
        assert_av1_decoder(ffmpeg.path, root)
        state = root / "state"
        hardware = HardwareTranscoder(state_root=state)
        encoders = hardware.encoders(ffmpeg.path)
        hardware_checks = []
        if encoders:
            attempt = encoders[0].attempts("h264")[0]
            hardware_output = root / "hardware.mp4"
            run([ffmpeg.path, "-v", "error", *attempt.before_input, "-i", video,
                 *attempt.output, "-c:a", "aac", hardware_output])
            probe(hardware_output)
            hardware_checks.append("h264-hardware-decode-encode")
        save_preferences(state, {"playback_acceleration": "software"})
        assert hardware.encoders(ffmpeg.path) == ()
        save_preferences(state, {"playback_acceleration": "auto"})
        assert hardware.encoders(ffmpeg.path) == encoders
        service = TranscodeService(resolver, root / "transcodes", state_root=state)
        labels = []
        execute = service._execute
        def tracked(*args, **kwargs):
            labels.append(kwargs["label"])
            return execute(*args, **kwargs)
        with patch.object(service, "_execute", side_effect=tracked):
            converted_av1, changed = service.browser_path(1, root / "av1.ivf")
        assert changed and converted_av1.is_file()
        decoded_av1 = json.loads(run([ffprobe.path, "-v", "error", "-show_streams", "-of", "json", converted_av1]).stdout)
        assert decoded_av1["streams"][0]["codec_name"] == "h264"
        from types import SimpleNamespace
        frame_receipt = {}
        with patch("peach.settings_file.active", return_value=SimpleNamespace(directory=lambda name: state)):
            assert capture_with_retry(str(ffmpeg.path), str(root / "av1.ivf"), 0,
                                      root / "av1-auto.jpg", diagnostics=frame_receipt)
        assert frame_receipt["attempts"]
        payload, offset = video.read_bytes(), 0
        while offset + 8 <= len(payload):
            size = int.from_bytes(payload[offset:offset + 4], "big")
            assert size >= 8
            if payload[offset + 4:offset + 8] == b"moov":
                break
            offset += size
        assert offset < len(payload)
        broken, repaired = root / "broken.mp4", root / "repaired.mp4"
        broken.write_bytes(payload[:offset])
        run([repair, "-n", "-s", "-dst", repaired, video, broken])
        probe(repaired)
        decoded = run([ffmpeg.path, "-v", "error", "-i", repaired, "-f", "null", "-"])
        assert not decoded.stderr.strip(), decoded.stderr
        version = run([tunnel, "--version"]).stdout.strip()
        return {"architecture": architecture, "ok": True, "cloudflared": version,
                "hardware_available": [encoder.backend for encoder in encoders],
                "hardware_checks": hardware_checks, "av1_transcode_attempts": labels,
                "av1_frame_attempts": frame_receipt["attempts"],
                "checks": ["bundled-resolvers", "manifest-hashes", "architecture", "system-libraries-only",
                           "ad-hoc-signatures", "h264-aac-probe", "jpeg-frame", "software-transcode",
                           "av1-software-decode", "av1-auto-transcode", "av1-auto-frame", "live-software-switch",
                           "missing-moov-repair", "repaired-full-decode", "no-homebrew-path"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=t("smoke_macos_media.description"))
    parser.add_argument("app", type=Path)
    parser.add_argument("--arch", choices=("arm64", "x86_64"), required=True)
    args = parser.parse_args()
    print(json.dumps(smoke(args.app, args.arch)))
