"""使用独立容器与临时卷验收镜像的首次设置、鉴权、配置重载和持久化。"""
from __future__ import annotations

import argparse
import json
import subprocess
import time
import uuid


def docker(*arguments: str, check: bool = True) -> str:
    result = subprocess.run(["docker", *arguments], capture_output=True, text=True,
                            encoding="utf-8", check=check, timeout=180)
    return (result.stdout + (result.stderr if arguments[0] == "logs" else "")).strip()


def request(name: str, path: str, *, authenticated: bool = True, body: dict | None = None,
            headers: dict | None = None):
    script = (
        "import json,urllib.request,urllib.error; from pathlib import Path; "
        "body=json.loads(__import__('sys').argv[1]); "
        "headers={'X-Token':Path('/data/secrets/auth-token').read_text().strip()} if body['auth'] else {}; "
        "headers=headers | (body['headers'] or {}); "
        "headers['Content-Type']='application/json'; "
        "req=urllib.request.Request('http://127.0.0.1:8900'+body['path'],"
        "data=json.dumps(body['body']).encode() if body['body'] is not None else None,headers=headers); "
        "\ntry:\n"
        " response=urllib.request.urlopen(req,timeout=15)\n"
        " data=response.read()\n"
        " print(data.decode() if 'application/json' in response.headers.get('Content-Type','') "
        "else json.dumps({'status':response.status,'size':len(data)}))\n"
        "except urllib.error.HTTPError as error:\n"
        " print(json.dumps({'status':error.code}))\n"
    )
    return docker("exec", name, "python", "-c", script,
                  json.dumps({"auth": authenticated, "path": path, "body": body, "headers": headers}))


def ready(name: str, *, setup: bool = False) -> None:
    """等到服务就绪；`setup` 为真时等的是全新数据卷上的首次设置服务（ADR-0149）。"""
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            response = json.loads(request(name, "/healthz?ready=1", authenticated=False))
            if "status" not in response and response.get("setup", False) == setup:
                return
            time.sleep(1)
        except subprocess.CalledProcessError:
            if docker("inspect", "-f", "{{.State.Running}}", name) != "true":
                raise RuntimeError(docker("logs", name)) from None
            time.sleep(1)
    raise RuntimeError("容器未就绪：" + docker("logs", name))


def transcode_checks(name: str) -> None:
    """无 GPU 的容器核对 VAAPI 软件栈与应用的整片、分片软件回退。"""
    assert "vaapi" in docker("exec", name, "ffmpeg", "-hide_banner", "-hwaccels")
    assert "h264_vaapi" in docker("exec", name, "ffmpeg", "-hide_banner", "-encoders")
    assert "scale_vaapi" in docker("exec", name, "ffmpeg", "-hide_banner", "-filters")
    assert "vaapi" in docker("exec", name, "ffmpeg", "-hide_banner", "-h", "decoder=h264")
    docker("exec", name, "python", "-c",
           "import ctypes; from pathlib import Path; "
           "drivers=list(Path('/usr/lib').glob('*/dri/radeonsi_drv_video.so')); "
           "assert drivers, '缺少 AMD VAAPI 驱动'; ctypes.CDLL(str(drivers[0]))")
    docker("exec", name, "ffmpeg", "-v", "error", "-i", "/data/smoke-media/fixture.mp4",
           "-c:v", "mpeg4", "/data/smoke-media/transcode.mkv")
    docker("exec", name, "python", "-c",
           "import asyncio; from pathlib import Path; from peach.ffmpeg import FFmpegResolver; "
           "from peach.transcodes import TranscodeService; from peach.segments import HlsSegmentService; "
           "from peach.streaming import StreamSessionRegistry; "
           "root=Path('/data/smoke-media'); resolver=FFmpegResolver(root/'tools'); "
           "whole=TranscodeService(resolver,root/'mp4-cache'); "
           "assert not whole.hardware.encoders(resolver.ffmpeg().path), '验收容器应未透传 GPU'; "
           "source=root/'transcode.mkv'; target,converted=whole.browser_path(95,source); "
           "assert converted and target.stat().st_size; target.rename(root/'converted.mp4'); "
           "hls=HlsSegmentService(resolver,root/'hls-cache',hardware=whole.hardware); "
           "segment=asyncio.run(hls.generate(source,0,1,asset_id=95,index=0,session='smoke',"
           "registry=StreamSessionRegistry(),transcode=True)); "
           "assert segment.stat().st_size; segment.rename(root/'converted.ts')")
    for filename in ("converted.mp4", "converted.ts"):
        report = json.loads(docker("exec", name, "ffprobe", "-v", "error", "-select_streams", "v:0",
                                   "-show_entries", "stream=codec_name,pix_fmt", "-of", "json",
                                   "/data/smoke-media/" + filename))
        assert report["streams"][0] == {"codec_name": "h264", "pix_fmt": "yuv420p"}, report


def amane_checks(name: str) -> None:
    """断网容器直接载入随镜像分发的独立环境与全部站点类。"""
    runtime = "/app/amane-runtime"
    manifest = json.loads(docker("exec", name, "python", "-c",
        f"from pathlib import Path; print(Path('{runtime}/manifest.json').read_text())"))
    executable = runtime + "/" + manifest["executable"]
    report = json.loads(docker("exec", name, executable, "-X", "utf8",
                              "/app/tools/amane-bridge/bridge.py", "--self-check"))
    assert report["ok"] and report["amane"]["version"] == manifest["version"], report
    assert len(report["sites"]) == 20, report
    bridge = json.loads(request(name, "/api/scraping/amane-bridge"))
    assert bridge["python"] == executable, bridge
    assert bridge["installed"] is True and bridge["revision"] == manifest["revision"], bridge


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    args = parser.parse_args()
    name = "peach-smoke-" + uuid.uuid4().hex[:12]
    volume = name + "-data"
    try:
        docker("volume", "create", volume)
        docker("run", "-d", "--name", name, "--network", "none",
               "--mount", f"type=volume,source={volume},target=/data", args.image)
        ready(name, setup=True)
        # 全新数据卷不再自动初始化：先答首次设置，设访问密码，后面的未登录请求才是 401。
        assert docker("exec", name, "python", "-c",
                      "from pathlib import Path; print(Path('/data/config.toml').exists())") == "False"
        done = json.loads(request(name, "/api/setup", authenticated=False, body={
            "media_dir": [], "skip_media": True, "scan_now": False, "access_enabled": True,
            "access_password": "smoke-password", "access_confirm": "smoke-password"}))
        assert done.get("url") == "/?onboarding=1", done
        time.sleep(2)
        ready(name)
        assert docker("exec", name, "id", "-u") == "1000"
        assert json.loads(request(name, "/api/items")) is not None
        assert json.loads(request(name, "/api/items", authenticated=False)) == {"status": 401}
        docker("exec", name, "mkdir", "/data/smoke-media")
        docker("exec", name, "ffmpeg", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=64x64:r=1",
               "-t", "2", "-c:v", "libx264", "/data/smoke-media/fixture.mp4")
        configuration = json.loads(request(name, "/api/configuration"))
        assert configuration['media_sources'] == [], configuration['media_sources']
        saved = json.loads(request(name, "/api/configuration", body={
            "revision": configuration["revision"], "port": configuration["port"], "scan_now": True,
            "media_sources": [{"location": "local", "path": "/data/smoke-media"}],
        }))
        assert saved.get("saved"), saved
        time.sleep(2)
        ready(name)
        deadline = time.monotonic() + 60
        asset = None
        while time.monotonic() < deadline:
            raw = docker("exec", name, "python", "-c",
                         "import sqlite3; print(sqlite3.connect('/data/database/ledger.db').execute("
                         "\"SELECT id FROM asset WHERE path LIKE '%fixture.mp4'\").fetchone())")
            if raw != "None":
                asset = int(raw.strip("(), "))
                break
            time.sleep(1)
        assert asset is not None, "资料处理请求未登记测试视频"
        media = json.loads(request(name, f"/stream?id={asset}", headers={"Range": "bytes=0-63"}))
        assert media == {"status": 206, "size": 64}, media
        transcode_checks(name)
        amane_checks(name)
        config_path = "/data/config.toml"
        original = docker("exec", name, "cat", config_path)
        docker("exec", name, "python", "-c",
               "from pathlib import Path; Path('/data/state/configuration-reload.request').write_text('reload')")
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            marker = docker("exec", name, "python", "-c",
                            "from pathlib import Path; print(Path('/data/state/configuration-reload.request').exists())")
            if marker == "False":
                break
            time.sleep(0.5)
        assert marker == "False", "配置重载请求未消费"
        ready(name)
        docker("restart", "--time", "75", name)
        ready(name)
        assert docker("exec", name, "cat", config_path) == original
        print(json.dumps({"image": args.image, "checks": ["first-setup", "non-root", "ready", "auth", "configuration",
                                                         "scan", "range", "vaapi-stack", "transcode-fallback",
                                                         "amane-prerequisites", "reload", "restart", "persistence"]}))
    finally:
        docker("rm", "--force", name, check=False)
        docker("volume", "rm", volume, check=False)


if __name__ == "__main__":
    main()
