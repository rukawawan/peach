#!/usr/bin/env bash
# macOS CI：原生架构依赖、回归验证与独立安装镜像验收。
# verify 默认全量；第三个参数 changed 只跑改动域与平台敏感用例，供主线推送使用。
set -euo pipefail

usage() {
    printf '%s\n' '用法：bash scripts/ci_macos.sh <verify|build> <arm64|x86_64> [full|changed]'
}

if [[ "${1:-}" == --help ]]; then
    usage
    exit 0
fi
if [[ $# -lt 2 || $# -gt 3 ]]; then
    usage >&2
    exit 2
fi
mode="$1"
architecture="$2"
coverage="${3:-full}"
case "$mode" in verify|build) ;; *) usage >&2; exit 2 ;; esac
case "$architecture" in arm64|x86_64) ;; *) usage >&2; exit 2 ;; esac
case "$coverage" in full|changed) ;; *) usage >&2; exit 2 ;; esac
if [[ "$(uname -s)" != Darwin ]]; then
    printf '%s\n' 'macOS 验证与构建必须在 Mac 上运行。' >&2
    exit 1
fi
host_architecture="$(uname -m)"
if [[ "$architecture" == arm64 && "$host_architecture" != arm64 ]]; then
    printf '%s\n' 'arm64 构建需要 Apple Silicon Mac。' >&2
    exit 1
fi
if [[ "$architecture" == x86_64 && "$host_architecture" == arm64 ]]; then
    /usr/bin/arch -x86_64 /usr/bin/true
    printf '%s\n' 'Intel 包由 x86_64 Python 在 Rosetta 下构建与运行；这不是 Intel 真机验收。'
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$root"
if [[ -L .venv ]]; then
    printf '%s\n' '工作树的 .venv 不得指向外部环境。' >&2
    exit 1
fi
if [[ "$mode" == build && -n "$(git status --porcelain)" ]]; then
    printf '%s\n' '发行构建需要干净的固定提交。' >&2
    exit 1
fi
for tool in uv node npm git ffmpeg ffprobe xcrun; do
    if ! command -v "$tool" >/dev/null; then
        printf '缺少构建工具：%s\n' "$tool" >&2
        exit 1
    fi
done
node -e 'if (!process.release.lts || Number(process.versions.node.split(".")[0]) < 24) {console.error("需要 Node.js 24 或更高版本的 LTS。"); process.exit(1)}'
xcrun --find clang >/dev/null

runtime="${PEACH_CI_RUNTIME_ROOT:-$root/build/ci-macos/runtime}"
export UV_PYTHON_INSTALL_DIR="$runtime/python"
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8
export MACOSX_DEPLOYMENT_TARGET="${MACOSX_DEPLOYMENT_TARGET:-11.0}"
export ARCHFLAGS="-arch $architecture"
unset VIRTUAL_ENV UV_PROJECT_ENVIRONMENT PEACH_DATA_ROOT PEACH_MEDIA_MOUNTS
python_architecture="$architecture"
if [[ "$architecture" == arm64 ]]; then
    python_architecture=aarch64
fi
python_spec="cpython-${PEACH_CI_PYTHON_VERSION:-3.14.7}-macos-$python_architecture-none"
uv python install --no-bin "$python_spec"
python="$(uv python find --managed-python --no-project "$python_spec")"
"$python" -c 'import platform,sys; assert platform.machine() == sys.argv[1], (platform.machine(),sys.argv[1])' "$architecture"
uv sync --locked --all-extras --python "$python"
python="$root/.venv/bin/python"
"$python" -c 'import platform,sys; assert platform.machine() == sys.argv[1], (platform.machine(),sys.argv[1])' "$architecture"
uv pip check --python "$python"
"$python" -X utf8 scripts/npm_ci.py --ignore-scripts
"$python" -X utf8 scripts/npm_ci.py --prefix frontend

if [[ "$mode" == verify ]]; then
    npm run build --prefix frontend
    bash scripts/ci_verify.sh macos "$coverage"
    exit 0
fi

# 固定部署目标下重编本机扩展，避免复用要求较新 macOS 的构建缓存。
uv sync --locked --all-extras --python "$python" --no-cache \
    --reinstall-package watchdog --no-binary-package watchdog \
    --reinstall-package zeroconf --no-binary-package zeroconf
uv pip check --python "$python"
output="${PEACH_MACOS_OUTPUT_DIR:-$root/dist/macos.noindex/$architecture}"
# 媒体工具编译耗时长；缺 Sentry DSN 的发行构建在此之前失败。
"$python" scripts/write_reporting_config.py --require --output "$root/build/macos-standalone/$architecture/sentry.json"
"$python" scripts/setup_macos_media_tools.py --root "$root/build/macos-media-toolchain"
export PATH="$root/build/macos-media-toolchain/env/bin:$PATH"
for tool in ffmpeg untrunc; do
    "$python" scripts/media_build_cache.py macos --tool "$tool" --arch "$architecture"
done
"$python" scripts/fetch_cloudflared_macos.py --arch "$architecture" \
    --destination "$root/build/media-macos/$architecture/cloudflared"
"$python" scripts/fetch_sparkle_macos.py --destination "$root/build/media-macos/$architecture/sparkle"
"$python" scripts/build_macos_standalone.py --target-arch "$architecture" --destination "$output" --require-reporting
"$python" -c 'import json,subprocess,sys; from pathlib import Path; info=json.loads(Path("build/macos-standalone",sys.argv[1],"build-info.json").read_text()); head=subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip(); assert info["commit"]==head and not info["dirty"], info' "$architecture"
cp "build/macos-standalone/$architecture/build-info.json" "$output/build-info.json"
version="$("$python" -c 'from peach import __version__; print(__version__)')"
image="$output/Peach-$version-macos-$architecture.dmg"
hdiutil verify "$image"
mountpoint="$(mktemp -d "${TMPDIR:-/tmp}/peach-ci-dmg.XXXXXX")"
mounted=0
cleanup() {
    result=$?
    if [[ "$mounted" == 1 ]]; then
        hdiutil detach "$mountpoint" || result=1
    fi
    rmdir "$mountpoint" || result=1
    exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
hdiutil attach "$image" -readonly -nobrowse -mountpoint "$mountpoint"
mounted=1
test "$(readlink "$mountpoint/Applications")" = /Applications
test -s "$mountpoint/Peach.app/Contents/Resources/LICENSE"
"$python" -c 'import json,sys; config=json.load(open(sys.argv[1],encoding="utf-8")); assert config["dsn"] and config["library_dsn"], "包内 sentry.json 缺 DSN"' \
    "$mountpoint/Peach.app/Contents/Resources/sentry.json"
codesign --verify --deep --strict "$mountpoint/Peach.app"
lipo "$mountpoint/Peach.app/Contents/MacOS/Peach" -verify_arch "$architecture"
"$python" scripts/smoke_macos.py "$mountpoint/Peach.app"
"$python" scripts/smoke_macos_media.py "$mountpoint/Peach.app" --arch "$architecture"
(cd "$output"; shasum -a 256 "${image##*/}" *-corresponding-source.zip > SHA256SUMS.txt)
printf 'macOS %s 安装镜像验收通过：%s\n' "$architecture" "$image"
