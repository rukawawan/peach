"""从固定源码编译 macOS 自包含媒体工具，保存完整对应源码。"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import zipfile

if str(Path(__file__).resolve().parents[1] / "src") not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from peach.interface_text import dev as t  # noqa: E402
from fetch_ffmpeg_sources import digest, load_sources, prepare
from fetch_untrunc_sources import load_sources as untrunc_sources

SCRIPTS = Path(__file__).resolve().parent


def run(args, cwd, env):
    subprocess.run([str(arg) for arg in args], cwd=cwd, env=env, check=True)


def audit_binary(path: Path, architecture: str) -> None:
    """拒绝其他架构及开发机动态库，系统库由 macOS 提供。"""
    # Xcode 16 的 lipo 要求输入文件写在操作之前，旧版两种顺序都接受。
    subprocess.run(["lipo", str(path), "-verify_arch", architecture], check=True)
    output = subprocess.check_output(["otool", "-L", str(path)], text=True, encoding="utf-8")
    for line in output.splitlines()[1:]:
        dependency = line.strip().split(" (", 1)[0]
        if not dependency.startswith(("/usr/lib/", "/System/Library/")):
            raise ValueError(t("build_macos_media.nonSystemLibrary", library=dependency))
    subprocess.run(["codesign", "--verify", "--strict", str(path)], check=True)


def finish(output: Path, lock: dict, tool: str, architecture: str) -> dict:
    bundle, work = output / tool, output / "work"
    licenses = [("ffmpeg/COPYING.GPLv3", "LICENSE.txt"),
                ("x264/COPYING", "LICENSE-x264.txt"),
                ("dav1d/COPYING", "LICENSE-dav1d.txt")] if tool == "ffmpeg" else [
                    ("untrunc/COPYING", "LICENSE.txt"),
                    ("ffmpeg/COPYING.LGPLv2.1", "LICENSE-FFmpeg.txt")]
    for source, target in licenses:
        shutil.copyfile(work / source, bundle / target)
    shutil.copyfile(output / "buildconf.txt", bundle / "buildconf.txt")
    notice = (f"# {tool} macOS {architecture}\n\n"
              f"按 {lock['license']} 分发；固定来源及 SHA-256 见 manifest.json。\n"
              "FFmpeg、x264 与 dav1d 使用静态库，系统框架和 C/C++ 运行库由 macOS 提供。\n"
              if tool == "ffmpeg" else
              f"# untrunc macOS {architecture}\n\n"
              "untrunc 按 GPL-2.0-or-later 分发，静态链接固定 FFmpeg 8.1.3 内置库。\n"
              "C++ 运行库由 macOS 提供；不包含 GUI 或外部编解码库。\n")
    (bundle / "NOTICE.md").write_text(notice + "完整许可证与可离线重建的对应源码随同版本制品提供。\n", encoding="utf-8")
    archive = output / f"{tool}-macos-{architecture}-corresponding-source.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as package:
        for source in lock["sources"]:
            path = output / "sources" / source["archive"]
            if digest(path) != source["sha256"]:
                raise ValueError(t("build_macos_media.sourceMismatch", name=path.name))
            package.write(path, f"sources/{path.name}")
        for name in ("build_macos_media.py", "fetch_ffmpeg_sources.py", "fetch_untrunc_sources.py",
                     "setup_macos_media_tools.py", "ffmpeg-sources.json", "untrunc-sources.json"):
            package.write(SCRIPTS / name, f"scripts/{name}")
        for name in ("__init__.py", "user_agent.py"):
            package.write(SCRIPTS.parent / "src/peach" / name, f"src/peach/{name}")
        package.write(SCRIPTS.parent / "LICENSE", "licenses/Peach-LICENSE.txt")
        for path in bundle.glob("LICENSE*"):
            package.write(path, f"licenses/{path.name}")
        for name in ("buildconf.txt", "build-environment.txt"):
            package.write(output / name, name)
        package.writestr("README.md", f"# macOS {architecture} 对应源码\n\n"
                         "安装 Xcode Command Line Tools、Python 3.14、Meson、Ninja、NASM、pkgconf。\n"
                         "工具链版本见 build-environment.txt。macOS 系统框架由 SDK 提供。\n"
                         "先建立 rebuilt/sources 并复制本包 sources/ 中的全部归档，再执行：\n\n"
                         f"`python3 scripts/build_macos_media.py --tool {tool} --arch {architecture} --output rebuilt`\n\n"
                         "每种架构分别编译；x86_64 可在 Apple Silicon 的 Rosetta 环境执行。\n"
                         "FFmpeg 源码锁与 Windows 共用；nv-codec-headers、AMF 头文件与 libvpl 仅存档，"
                         "macOS 不编入 NVIDIA、AMD 与 Intel 接口。\n")
    manifest = {"version": lock["version"], "license": lock["license"],
                "platform": "darwin", "architecture": architecture,
                "files": {path.relative_to(bundle).as_posix(): digest(path)
                          for path in sorted(bundle.rglob("*")) if path.is_file() and path.name != "manifest.json"},
                "sources": lock["sources"],
                "source_archive": {"name": archive.name, "sha256": digest(archive)}}
    (bundle / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def build(output: Path, tool: str, architecture: str) -> None:
    if sys.platform != "darwin":
        raise ValueError(t("build_macos_media.macosOnly"))
    output = output.resolve()
    lock = load_sources() if tool == "ffmpeg" else untrunc_sources()
    if not (output / "work").exists():
        prepare(output, lock)
    else:
        for source in lock["sources"]:
            if digest(output / "sources" / source["archive"]) != source["sha256"]:
                raise ValueError(t("build_macos_media.cachedSourceMismatch"))
    prefix, work = output / "prefix", output / "work"
    prefix.mkdir(exist_ok=True)
    env = {**os.environ, "MACOSX_DEPLOYMENT_TARGET": "11.0", "PKG_CONFIG_PATH": "",
           "PKG_CONFIG_LIBDIR": str(prefix / "lib/pkgconfig"),
           "CC": f"clang -arch {architecture}", "CXX": f"clang++ -arch {architecture}"}
    with (output / "build-environment.txt").open("w") as stream:
        for args in (["clang", "--version"], ["xcrun", "--show-sdk-version"], ["make", "--version"],
                     ["meson", "--version"], ["ninja", "--version"], ["nasm", "-v"], ["pkg-config", "--version"]):
            subprocess.run(args, stdout=stream, stderr=stream, check=True)
        stream.write(f"Python={sys.version}\nBuildHost={platform.machine()}\nTarget={architecture}\n")
    jobs = str(os.cpu_count() or 2)
    flags = f"-arch {architecture} -mmacosx-version-min=11.0"
    if tool == "ffmpeg":
        cross = output / "dav1d-cross.ini"
        cpu = "aarch64" if architecture == "arm64" else "x86_64"
        cross.write_text(f"[binaries]\nc = ['clang', '-arch', '{architecture}']\nar = 'ar'\nstrip = 'strip'\n"
                         f"[host_machine]\nsystem = 'darwin'\ncpu_family = '{cpu}'\ncpu = '{cpu}'\nendian = 'little'\n"
                         "[built-in options]\nc_args = ['-mmacosx-version-min=11.0']\n"
                         "c_link_args = ['-mmacosx-version-min=11.0']\n", encoding="utf-8")
        if not (work / "dav1d-build").exists():
            run(["meson", "setup", work / "dav1d-build", work / "dav1d", "--cross-file", cross,
                 "--prefix", prefix, "--libdir", "lib", "--buildtype", "release", "--default-library", "static",
                 "-Denable_tools=false", "-Denable_tests=false"], output, env)
        run(["meson", "compile", "-C", work / "dav1d-build"], output, env)
        run(["meson", "install", "-C", work / "dav1d-build"], output, env)
        run(["./configure", f"--prefix={prefix}", f"--host={cpu}-apple-darwin", "--enable-static", "--disable-cli",
             "--disable-opencl", "--disable-avs", "--disable-swscale", "--disable-lavf", "--disable-ffms",
             "--disable-gpac", "--disable-lsmash", f"--extra-cflags={flags}", f"--extra-ldflags={flags}"], work / "x264", env)
        run(["make", f"-j{jobs}"], work / "x264", env)
        run(["make", "install"], work / "x264", env)
    config = ["./configure", "--target-os=darwin", f"--arch={'aarch64' if architecture == 'arm64' else architecture}",
              "--enable-cross-compile", f"--cc=clang -arch {architecture}", f"--cxx=clang++ -arch {architecture}",
              "--disable-autodetect", "--disable-shared", "--enable-static", "--disable-debug", "--disable-doc",
              f"--extra-cflags={flags} -I{prefix}/include", f"--extra-ldflags={flags} -L{prefix}/lib"]
    if tool == "ffmpeg":
        config += ["--disable-ffplay", "--enable-gpl", "--enable-version3", "--disable-nonfree", "--enable-libx264",
                   "--enable-libdav1d", "--enable-videotoolbox", "--enable-audiotoolbox", "--enable-securetransport",
                   "--pkg-config=pkg-config", "--pkg-config-flags=--static"]
    else:
        config += ["--disable-everything", "--disable-programs", "--disable-network", "--disable-avdevice",
                   "--disable-avfilter", "--disable-swscale", "--disable-swresample", "--enable-protocol=file",
                   "--enable-demuxer=mov", "--enable-decoder=h264,hevc,mpeg4,aac,mp3,alac,amrnb,amrwb,pcm_s16le,pcm_s16be,pcm_s24le,pcm_s24be,mjpeg,prores",
                   "--enable-parser=h264,hevc,aac,mpegaudio"]
    run(config, work / "ffmpeg", env)
    run(["make", f"-j{jobs}"], work / "ffmpeg", env)
    (output / "buildconf.txt").write_text(subprocess.list2cmdline(config) + "\n" +
                                         (work / "ffmpeg/ffbuild/config.mak").read_text(), encoding="utf-8")
    bundle = output / tool
    bundle.mkdir(exist_ok=True)
    if tool == "ffmpeg":
        (bundle / "bin").mkdir(exist_ok=True)
        for name in ("ffmpeg", "ffprobe"):
            shutil.copyfile(work / "ffmpeg" / name, bundle / "bin" / name)
        binaries = list((bundle / "bin").iterdir())
    else:
        cxxflags = f"-O3 -std=c++17 -D_FILE_OFFSET_BITS=64 {flags} -idirafter {work}/ffmpeg"
        ldflags = f"{flags} -L{work}/ffmpeg/libavformat -lavformat -L{work}/ffmpeg/libavcodec -lavcodec -L{work}/ffmpeg/libavutil -lavutil -lz -lbz2 -liconv -lm -framework CoreFoundation -framework Security -framework VideoToolbox -framework CoreMedia -framework CoreVideo"
        command = ["make", f"-j{jobs}", "FF_VER=shared", "IS_RELEASE=1", "EXE=untrunc", "CXX=clang++",
                   f"CXXFLAGS={cxxflags}", f"VER={lock['version']}", f"LDFLAGS={ldflags}"]
        run(command, work / "untrunc", env)
        with (output / "buildconf.txt").open("a") as stream:
            stream.write(subprocess.list2cmdline(command) + "\n")
        shutil.copyfile(work / "untrunc/untrunc", bundle / "untrunc")
        binaries = [bundle / "untrunc"]
    for path in binaries:
        path.chmod(0o755)
        run(["strip", "-x", path], output, env)
        run(["codesign", "--force", "--sign", "-", path], output, env)
        audit_binary(path, architecture)
    finish(output, lock, tool, architecture)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=t("build_macos_media.description"))
    parser.add_argument("--tool", choices=("ffmpeg", "untrunc"), required=True)
    parser.add_argument("--arch", choices=("arm64", "x86_64"), required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build(args.output, args.tool, args.arch)
