"""无桌面服务入口：维护 Web 进程，消费配置重载与资料处理请求。"""
from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import threading

from . import access, distribution, interface_text, onboarding, settings_file
from .user_messages import UserFacingError, UserRuntimeError

#: 容器首次启动时直接设好的访问密码（ADR-0149）；读过就从环境里删掉，不传给子进程。
ACCESS_PASSWORD_ENV = "PEACH_ACCESS_PASSWORD"
#: 看守循环多久看一次服务进程、重载与迁移请求。每轮要读两遍设置文件；重载、迁移本来就要重启
#: 服务，多等一秒看不出来。
SUPERVISE_SECONDS = 2


def _said(error: BaseException) -> str:
    """终端里的一句报错：带 code 的按命令行语言渲染，别的照旧给原文。"""
    if isinstance(error, UserFacingError):
        return interface_text.text(f"server:{error.code}", error.params, interface_text.local_language())
    return str(error)


def launch(*arguments: str) -> subprocess.Popen:
    environment = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUTF8="1", PEACH_HEADLESS_MANAGED="1")
    return subprocess.Popen(
        [sys.executable, "-m", "peach", *arguments],
        stdin=subprocess.DEVNULL, env=environment,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )


def stop_process(process: subprocess.Popen | None) -> None:
    if process is None or process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=30)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=10)


def initialize() -> None:
    config = settings_file.load_config()
    if config.present:
        if not (config.directory('database') / 'ledger.db').is_file():
            raise UserRuntimeError('errors.server.databaseMissing')
        from .runtime_prepare import configured_ledger_writer
        writer, _reason = configured_ledger_writer(config)
        if not writer:
            return
        migrate = launch("migrate", "upgrade", "--yes", "--db",
                         str(config.directory("database") / "ledger.db"))
        try:
            code = migrate.wait(timeout=180)
            if code:
                raise UserRuntimeError("errors.server.migrateFailed", {"code": code})
        finally:
            stop_process(migrate)
        return
    if config.directory("database").joinpath("ledger.db").exists():
        raise UserRuntimeError("errors.server.settingsMissing")
    if distribution.docker():
        # 全新数据卷不替用户答题：服务以未配置状态起来，浏览器打开就是首次设置页（ADR-0149）。
        return
    process = launch("init", "--no-input")
    try:
        code = process.wait(timeout=120)
        if code:
            raise UserRuntimeError("errors.server.initFailed", {"code": code})
    finally:
        stop_process(process)


def seed_access_password(config) -> str:
    """还没有访问策略时，用 `PEACH_ACCESS_PASSWORD` 写下 password 策略；返回给日志的一行，不含明文。

    已有策略时忽略它：改密码走配置页，环境变量不能在每次重启时把它改回去。值不合规时只报原因、
    照常启动，浏览器打开后仍可在首次设置或访问设置里设密码；拒绝启动会让容器反复重启。
    还没有设置文件时也照写：首次设置会沿用这份策略，访问那一项标成已设置。
    """
    password = os.environ.pop(ACCESS_PASSWORD_ENV, "")
    if not password:
        return ""
    path = config.directory("secrets") / "access.json"
    if path.exists():
        return interface_text.cli("server.accessIgnored", env=ACCESS_PASSWORD_ENV)
    try:
        access.save(path, password)
    except ValueError as error:
        return interface_text.cli("server.accessRejected", env=ACCESS_PASSWORD_ENV, error=_said(error))
    except OSError as error:
        return interface_text.cli("server.accessWriteFailed", env=ACCESS_PASSWORD_ENV,
                                  error=error.strerror or type(error).__name__)
    return interface_text.cli("server.accessSet", env=ACCESS_PASSWORD_ENV)


def supervise(host: str, port: int, stopping: threading.Event) -> int:
    service = scanner = None
    serving_configured = False

    def serve() -> subprocess.Popen:
        # 还没有设置文件时起的是首次设置服务，与托盘首启同一个 `--setup`；设置一提交、设置文件
        # 出现，下面的循环就把它换成正常服务。
        nonlocal serving_configured
        serving_configured = settings_file.load_config().present
        setup = () if serving_configured else ("--setup",)
        return launch("serve", *setup, "--host", host, "--port", str(port), "--no-mdns", "--no-ledger-sync")

    def stop_all() -> None:
        nonlocal service, scanner
        stop_process(scanner)
        stop_process(service)
        service = scanner = None

    def restart(environment: dict[str, str]) -> None:
        # 看守进程之后读设置、拉起服务都按迁移后的位置；原位置留下的位置记录让以后的启动也跟过去。
        nonlocal service
        os.environ[settings_file.DATA_ROOT_ENV] = environment[settings_file.DATA_ROOT_ENV]
        service = serve()

    try:
        while not stopping.is_set():
            # 设置页「更改位置」写下的迁移请求：停服务、搬家、在新位置重新拉起，都在这一轮里做完。
            from .data_storage import poll_headless
            if poll_headless(stop_all, restart):
                continue
            config = settings_file.load_config()
            reload_path = config.directory("state") / onboarding.RELOAD_NAME
            if service is None or reload_path.exists() or config.present != serving_configured:
                stop_process(service)
                service = serve()
                reload_path.unlink(missing_ok=True)
            code = service.poll()
            if code is not None:
                return code or 1
            if scanner is not None and scanner.poll() is not None:
                if scanner.returncode:
                    print(interface_text.cli("server.processFailed", code=scanner.returncode),
                          file=sys.stderr, flush=True)
                scanner = None
            if scanner is None:
                location = onboarding.take_first_scan_request(config)
                if location is not None:
                    scanner = launch("process", location)
            stopping.wait(SUPERVISE_SECONDS)
        return 0
    finally:
        stop_process(scanner)
        stop_process(service)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=interface_text.cli("server.description"))
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8900)
    args = parser.parse_args(argv)
    stopping = threading.Event()
    for signum in (signal.SIGTERM, signal.SIGINT):
        signal.signal(signum, lambda *_: stopping.set())
    initialize()
    if os.environ.get('PEACH_DISTRIBUTION') == 'docker':
        # 起服务前写好：watchtower profile 等 Peach 就绪才启动，启动时读这份令牌（ADR-0140）。
        from .docker_update import ensure_token
        try:
            ensure_token()
        except OSError as error:
            print(interface_text.cli("server.updateTokenFailed", error=error), file=sys.stderr, flush=True)
    config = settings_file.load_config()
    seeded = seed_access_password(config)
    if seeded:
        print(seeded, flush=True)
    print(interface_text.cli("server.listening", host=args.host, port=args.port), flush=True)
    if distribution.docker() and not config.present:
        print(interface_text.cli("server.firstSetup"), flush=True)
    elif access.load(config.directory("secrets") / "access.json")["mode"] == "legacy":
        print(interface_text.cli("server.firstOpen" if distribution.docker() else "server.firstSignIn"), flush=True)
    if os.environ.get('PEACH_DISTRIBUTION') == 'docker':
        print(interface_text.cli("server.lanAccess"), flush=True)
    return supervise(args.host, args.port, stopping)


if __name__ == "__main__":
    raise SystemExit(main())
