"""独立 Windows 包的持久更新事务：下载准备、用户重启、目录切换与回滚。"""
from __future__ import annotations

from contextlib import closing
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import sqlite3
import subprocess
import sys
import threading
import time
import uuid
import zipfile

import httpx
from filelock import FileLock, Timeout

from . import __version__, desktop_installer, distribution, release_signing, release_updates, settings_file, update_packages
from .fsutil import atomic_write_text
from .windows_update import replace_with_retry
from . import update_tasks

ACTIVE = {"downloading", "verifying", "extracting", "preparing", "restarting", "installing"}
MAX_ARCHIVE = 512 * 1024 * 1024
MAX_EXPANDED = 2 * 1024 * 1024 * 1024


def state_path() -> Path:
    return settings_file.load_config().directory("state") / "standalone-update.json"


def remember_installation_data_root(config) -> bool:
    """在线安装启动时，将已知的数据目录记入空的默认启动落点。"""
    if not distribution.standalone() or not config.present:
        return False
    data = read()
    target = data.get("target")
    if (data.get("state") != "installing" or data.get("version") != __version__
            or not isinstance(target, str) or not Path(target).is_absolute()
            or Path(target).resolve() != Path(sys.executable).resolve().parent):
        return False
    bootstrap = distribution.user_data_root(os.environ)
    if (bootstrap.resolve() == config.data_root.resolve()
            or any((bootstrap / name).exists() for name in (
                settings_file.SETTINGS_FILENAME, "state/data-root.txt", "database/ledger.db"))):
        return False
    settings_file.remember_data_root(settings_file.load_config(
        environ=dict(os.environ, PEACH_DATA_ROOT=str(bootstrap))), config)
    return True


def read() -> dict:
    try:
        return json.loads(state_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"state": "idle", "progress": 0}


def write(data: dict, **changes) -> dict:
    data.update(changes, updated_at=time.time())
    atomic_write_text(state_path(), json.dumps(data, ensure_ascii=False))
    return data


def public() -> dict:
    data = read()
    if data.get("state") in ACTIVE and time.time() - data.get("updated_at", 0) > 180:
        data = dict(data, state="error", message="更新任务已中断，请重试。")
    return {key: value for key, value in data.items() if key in {
        "state", "progress", "message", "downloaded", "total", "version", "updated_at"}}


def installation_pending() -> bool:
    """当前独立包仍在安装确认期；兼容未保留任务预约的更新助手。"""
    if not distribution.standalone():
        return False
    data = read()
    return (public().get('state') == 'installing' and data.get('version') == __version__
            and isinstance(data.get('target'), str)
            and Path(data['target']).resolve() == Path(sys.executable).resolve().parent)


def extract(archive: Path, destination: Path, progress, *, tool_files: set[str] | None = None) -> Path:
    destination = destination.resolve()
    with zipfile.ZipFile(archive) as package:
        entries = package.infolist()
        if sum(item.file_size for item in entries) > MAX_EXPANDED or len(entries) > 20000:
            raise ValueError("更新包展开体积超限")
        seen = set()
        for index, item in enumerate(entries):
            name = item.filename
            parts = PurePosixPath(name).parts
            if (not parts or parts[0] != "Peach" or "\\" in name or ":" in name
                    or ".." in parts or name.startswith("/") or (item.external_attr >> 16) & 0o170000 == 0o120000):
                raise ValueError("更新包含无效路径")
            if tool_files is not None and (item.is_dir() or "/".join(parts[1:]) not in tool_files):
                raise ValueError("工具包包含清单外的文件")
            target = destination.joinpath(*parts).resolve()
            key = str(target).casefold()
            if not target.is_relative_to(destination) or key in seen:
                raise ValueError("更新包路径重复或越界")
            seen.add(key)
            package.extract(item, destination)
            progress(index + 1, len(entries))
    root = destination / "Peach"
    if tool_files is None and (not (root / "Peach.exe").is_file() or not (root / "_internal" / "standalone.txt").is_file()):
        raise ValueError("更新包不是独立 Windows 版本")
    return root


def download(url: str, archive: Path, size: int, digest: str, progress) -> None:
    failures = []
    for source in release_updates.download_sources(url):
        try:
            _download_once(source, archive, size, digest, progress)
            return
        except (httpx.HTTPError, ValueError) as exc:
            failures.append(exc)
    # 镜像常落后几个版本：备用源的 404 不能盖住主源的校验失败，没有校验失败时报主源的原因。
    raise next((exc for exc in failures if isinstance(exc, ValueError)), failures[0])


def _download_once(url: str, archive: Path, size: int, digest: str, progress) -> None:
    from .peach_proxy import http_client
    checksum = hashlib.sha256()
    received = 0
    with http_client(follow_redirects=True, timeout=30) as client, client.stream("GET", url) as response:
        response.raise_for_status()
        with archive.open("wb") as output:
            for chunk in response.iter_bytes(256 * 1024):
                received += len(chunk)
                if received > size:
                    raise ValueError("下载体积与发布记录不符")
                output.write(chunk)
                checksum.update(chunk)
                progress(received)
    if received != size or checksum.hexdigest() != digest:
        raise ValueError("更新包校验失败，请重新下载")


def prepare_tools(stage: Path, target: Path, transaction: Path, release: dict, data: dict,
                  *, report=None, fetch=None) -> None:
    report, fetch = report or write, fetch or download
    manifest = update_packages.read_manifest(stage, release["latest_version"])
    missing = []
    for tool, bundle in manifest["tools"].items():
        if update_packages.matches(stage, bundle["files"]):
            continue
        if update_packages.matches(target, bundle["files"]):
            for name in bundle["files"]:
                destination = update_packages.checked_path(stage, name)
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(update_packages.checked_path(target, name), destination)
        else:
            missing.append((tool, bundle))
    total = data["total"] + sum(bundle["asset"]["size"] for _, bundle in missing)
    report(data, total=total)
    for index, (tool, bundle) in enumerate(missing):
        asset = bundle["asset"]
        archive = transaction / f"tools-{tool}.zip"
        received = data["downloaded"]
        report(data, state="downloading", message=f"正在下载 {tool} 工具包")
        fetch(release["asset_url"].rsplit("/", 1)[0] + "/" + asset["name"], archive,
                 asset["size"], asset["sha256"],
                 lambda count, start=received, step=index, size=asset["size"]: report(
                     data, downloaded=start + count, progress=75 + round((step + count / size) / len(missing) * 13)))
        report(data, state="verifying", message=f"正在校验 {tool} 工具包")
        extracted = extract(archive, transaction / f"tool-{tool}", lambda *_: None, tool_files=set(bundle["files"]))
        if not update_packages.matches(extracted, bundle["files"]):
            raise ValueError(f"{tool} 工具包文件校验失败")
        for name in bundle["files"]:
            destination = update_packages.checked_path(stage, name)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(update_packages.checked_path(extracted, name), destination)
    for tool, bundle in manifest["tools"].items():
        if not update_packages.matches(stage, bundle["files"]):
            raise ValueError(f"{tool} 工具复用校验失败")


def _fetch_small(client, url: str) -> bytes:
    body = bytearray()
    with client.stream("GET", url) as response:
        response.raise_for_status()
        for chunk in response.iter_bytes(64 * 1024):
            body += chunk
            if len(body) > release_signing.MAX_BYTES:
                raise ValueError("发布签名文件过大")
    return bytes(body)


def signed_release(release: dict) -> dict:
    """源码带发布公钥时，更新包与完整包的摘要只取签名验过的 `SHA256SUMS.txt`（ADR-0137）。

    两个公开源依次尝试；都验不过就不升级，已装版本原样保留。
    """
    if not release_signing.PUBLIC_KEYS:
        return release
    from .peach_proxy import http_client
    directory, name = release["asset_url"].rsplit("/", 1)
    digests = {}
    for url in release_updates.download_sources(f"{directory}/{release_signing.SUMS}"):
        try:
            with http_client(follow_redirects=True, timeout=30) as client:
                sums = _fetch_small(client, url)
                signature = _fetch_small(client, url + ".sig")
            digests = release_signing.verify(sums, signature)
            break
        except (httpx.HTTPError, ValueError):
            continue
    if name not in digests:
        raise ValueError("发布签名校验未通过，已停止更新；请到发布页手动下载新版本")
    full = release.get("full_url")
    full = digests.get(full.rsplit("/", 1)[1]) if isinstance(full, str) else None
    return dict(release, asset_digest="sha256:" + digests[name], full_digest=full and "sha256:" + full)


def checked_asset(digest: object, size: object, label: str) -> tuple[str, int]:
    if not isinstance(digest, str) or not digest.startswith("sha256:") or len(digest) != 71:
        raise ValueError(f"{label}缺少 SHA-256 校验信息")
    if not isinstance(size, int) or not 0 < size <= MAX_ARCHIVE:
        raise ValueError(f"{label}大小无效")
    return digest[7:], size


def fetch_package(url: str, size: int, digest: str, transaction: Path, name: str, version: str, data: dict) -> Path:
    """下载、校验程序包并解压到 `stage/Peach`（`apply` 只认这一处）；进度接在已下载的字节数后面。"""
    archive, start = transaction / f"{name}.zip", data.get("downloaded", 0)
    download(url, archive, size, digest,
             lambda count: write(data, downloaded=start + count, progress=round((start + count) / data["total"] * 65, 1)))
    write(data, state="verifying", progress=66, message="正在校验")
    write(data, state="extracting", message="正在解压")
    shutil.rmtree(transaction / "stage", ignore_errors=True)
    stage = extract(archive, transaction / "stage", lambda done, count: write(data, progress=67 + round(done / count * 8)))
    from .buildinfo import read_build_info
    info = read_build_info(stage / "_internal")
    if not info or info.version != version:
        raise ValueError("包内版本与发布版本不符")
    return stage


def prepare(data: dict, lock: FileLock) -> None:
    try:
        release = release_updates.check()
        if release["state"] != "available":
            raise ValueError(release["message"])
        release = signed_release(release)
        digest, total = checked_asset(release.get("asset_digest"), release.get("asset_size", 0), "更新包")
        target = Path(sys.executable).resolve().parent
        if state_path().resolve().is_relative_to(target):
            raise ValueError("数据目录位于程序目录内，不能自动替换")
        transaction = target.parent / f".{target.name}-update-{data['id']}"
        transaction.mkdir()
        version = release["latest_version"]
        write(data, transaction=str(transaction), target=str(target), version=version,
              total=total, downloaded=0, message="正在下载", state="downloading")
        stage = fetch_package(release["asset_url"], total, digest, transaction, "package", version, data)
        if release.get("package_kind") == "update":
            write(data, state="preparing", message="正在复用和校验已安装工具")
            try:
                prepare_tools(stage, target, transaction, release, data)
            except (ValueError, KeyError, TypeError, FileNotFoundError) as exc:
                # 清单格式、工具集合或工具包与本版更新器对不上：完整包自带全部工具，不经清单。
                try:
                    full_digest, full_size = checked_asset(release.get("full_digest"), release.get("full_size", 0), "完整包")
                except ValueError:
                    raise exc from None
                write(data, state="downloading", total=data["downloaded"] + full_size,
                      message=f"应用更新包无法使用（{exc}），改为下载完整包")
                stage = fetch_package(release["full_url"], full_size, full_digest, transaction, "full", version, data)
        write(data, state="preparing", progress=90, message="正在准备安装")
        desktop_installer.carry_uninstaller(target, stage)
        # 助手从自己的目录运行，正式目录与暂存目录都不会被它的 DLL 句柄占用。
        helper = transaction / "helper"
        shutil.copytree(target, helper, ignore=shutil.ignore_patterns("*.log"))
        write(data, stage=str(stage), helper=str(helper), state="ready", progress=100,
              message="更新已准备好，重启后安装。")
    except Exception as exc:
        write(data, state="error", message=str(exc), progress=0)
    finally:
        lock.release()


def start() -> dict:
    if not distribution.in_app_update():
        raise ValueError("此安装方式不支持应用内更新，请从发布页下载新版本")
    lock = FileLock(str(state_path()) + ".lock", thread_local=False)
    try:
        lock.acquire(timeout=0)
    except Timeout:
        return public()
    if public().get("state") in ACTIVE | {"ready"}:
        lock.release()
        return public()
    data = write({"id": uuid.uuid4().hex}, state="downloading", progress=0, message="正在连接发布源")
    threading.Thread(target=prepare, args=(data, lock), daemon=True, name="PeachPackageUpdate").start()
    return public()


def _update_writer(stage: Path) -> bool:
    """读取端只替换兼容程序；待迁移结构必须先由写入端同步。"""
    from .migrations import plan
    from .runtime_prepare import configured_ledger_writer
    config = settings_file.load_config()
    writer, reason = configured_ledger_writer(config)
    database = config.directory('database') / 'ledger.db'
    if not writer and database.is_file() and plan(database, stage / '_internal' / 'migrations')[1]:
        raise ValueError(f'本机不能迁移账本：{reason}；请先在写入端迁移并同步')
    return writer


def request_restart() -> dict:
    if not distribution.in_app_update():
        raise ValueError("此安装方式不支持应用内更新，请从发布页下载新版本")
    with FileLock(str(state_path()) + ".lock", timeout=0):
        data = read()
        if data.get("state") != "ready":
            raise ValueError("更新尚未准备完成")
        writer = _update_writer(Path(data.get('stage', '')))
        db = settings_file.load_config().directory("database") / "ledger.db"
        token = update_tasks.reserve(db) if writer else None
        try:
            write(data, state="restarting", task_token=token, progress=0, message="正在保存任务进度，随后重启安装")
        except Exception:
            if token:
                update_tasks.release(db, token)
            raise
    return public()


def poll(tray) -> None:
    if not distribution.standalone() or read().get("state") != "restarting":
        return
    if not tray._action_lock.acquire(blocking=False):
        return
    try:
        data = read()
        writer = _update_writer(Path(data.get('stage', '')))
        db = settings_file.load_config().directory("database") / "ledger.db"
        token = (data.get("task_token") or update_tasks.reserve(db)) if writer else None
        if not data.get("task_token"):
            write(data, task_token=token)
        if token:
            update_tasks.wait_quiescent(db)
        helper = Path(data["helper"]) / "Peach.exe"
        environment = os.environ.copy()
        environment["PYINSTALLER_RESET_ENVIRONMENT"] = "1"
        environment[settings_file.DATA_ROOT_ENV] = str(settings_file.load_config().data_root.resolve())
        process = subprocess.Popen([str(helper), "--apply-standalone-update", str(state_path()), str(os.getpid())],
                         cwd=str(helper.parent), env=environment, creationflags=subprocess.CREATE_NO_WINDOW)
        if token:
            update_tasks.transfer(db, token, process.pid)
        tray.exit(reason="standalone-update")
    except Exception as exc:
        if locals().get('token'):
            update_tasks.release(db, token)
        write(read(), state="error", message=f"未能重启：{exc}")
    finally:
        tray._action_lock.release()


def migrate_database(stage: Path, data: dict) -> Path | None:
    from .migrations import plan, sqlite_backup
    config = settings_file.load_config()
    database = config.directory("database") / "ledger.db"
    if not database.is_file():
        return None
    _, pending = plan(database, stage / "_internal" / "migrations")
    if not pending:
        return None
    if not _update_writer(stage):
        raise ValueError('读取端不能迁移账本')
    backup = config.directory("state") / "update-backups" / data["id"] / "ledger.db"
    if not backup.is_file():
        sqlite_backup(database, backup)
    write(data, database_backup=str(backup), state="installing", progress=10, message="正在更新本地数据库")
    environment = dict(os.environ, PYINSTALLER_RESET_ENVIRONMENT="1", PEACH_DATA_ROOT=str(config.data_root.resolve()))
    with (backup.parent / "migration.log").open("wb") as log:
        result = subprocess.run([str(stage / "Peach.exe"), "migrate", "upgrade", "--yes", "--db", str(database)],
                                cwd=str(stage), env=environment, stdout=log, stderr=log, stdin=subprocess.DEVNULL,
                                timeout=180, check=False, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    if result.returncode:
        raise RuntimeError("数据库更新失败")
    return backup


def restore_database(data: dict) -> None:
    config = settings_file.load_config()
    database = config.directory("database") / "ledger.db"
    backup = config.directory("state") / "update-backups" / data["id"] / "ledger.db"
    if not backup.is_file():
        return
    with closing(sqlite3.connect(backup.as_uri() + "?mode=ro", uri=True)) as source, closing(sqlite3.connect(database)) as destination:
        source.backup(destination)
        if destination.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("数据库恢复检查失败")


def preserve_local_state(data: dict, *, include_database: bool = True) -> None:
    """安装前保存配置与可恢复任务状态；日志、凭据和更新预约独立保留。"""
    from .migrations import sqlite_backup
    config = settings_file.load_config()
    root = config.directory('state') / 'update-backups' / data['id']
    root.mkdir(parents=True, exist_ok=True)
    db = config.directory('database') / 'ledger.db'
    if include_database and db.is_file():
        sqlite_backup(db, root / 'ledger.db')
    paths = {'config': config.path, **{name: config.directory('state') / name for name in (
        'job-recovery', 'library-processing.json', 'upgrade-repairs')}}
    present = []
    for name, path in paths.items():
        if path.is_dir():
            shutil.copytree(path, root / name)
            present.append(name)
        elif path.is_file():
            shutil.copy2(path, root / name)
            present.append(name)
    atomic_write_text(root / 'state.json', json.dumps(present))


def restore_local_state(data: dict) -> None:
    """只恢复本事务显式保存的配置和任务路径。"""
    config = settings_file.load_config()
    root = config.directory('state') / 'update-backups' / data['id']
    manifest = root / 'state.json'
    if not manifest.is_file():
        return
    present = json.loads(manifest.read_text(encoding='utf-8'))
    paths = {'config': config.path, **{name: config.directory('state') / name for name in (
        'job-recovery', 'library-processing.json', 'upgrade-repairs')}}
    for name, path in paths.items():
        resolved = path.resolve()
        if name != 'config' and not resolved.is_relative_to(config.directory('state').resolve()):
            raise ValueError('任务恢复路径越界')
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink(missing_ok=True)
        if name in present:
            if (root / name).is_dir():
                shutil.copytree(root / name, path)
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(root / name, path)


def _transaction_paths(manifest: Path):
    """只接受本机状态文件与同卷暂存目录，安装目标须为完整独立包。"""
    if manifest.resolve() != state_path().resolve():
        raise ValueError('更新状态文件不匹配')
    data = read()
    target = Path(data["target"]).resolve()
    transaction = Path(data["transaction"]).resolve()
    stage = Path(data["stage"]).resolve()
    if (transaction.parent != target.parent or transaction.name != f".{target.name}-update-{data['id']}"
            or stage != transaction / "stage" / "Peach" or state_path().resolve().is_relative_to(target)
            or not (target / "_internal" / "standalone.txt").is_file()):
        raise ValueError('更新目录无效')
    return data, target, transaction, stage


def _rollback_installation(data, target, transaction, *, installed, writer, token):
    """停止本次新程序，恢复原程序和写入端的事务备份，再启动托盘。"""
    from .windows_restart import find_tray_windows, post_stop, start_tray
    if installed:
        for window in find_tray_windows(target / 'Peach.exe'):
            post_stop(window.handle)
        replace_with_retry(target, transaction / 'failed')
    replace_with_retry(transaction / 'backup', target)
    if writer:
        restore_database(data)
    restore_local_state(data)
    if token:
        db = settings_file.load_config().directory('database') / 'ledger.db'
        update_tasks.release(db, token)
    start_tray(target / 'Peach.exe')


def apply(manifest: Path, wait_pid: int) -> int:
    """复制出来的助手等待原托盘正常退出，再在同一卷上切换两个目录。"""
    from .windows_restart import process_alive, start_tray, find_tray_windows
    from .tray import configured_service_specs
    from .settings_file import load_config
    from . import job_recovery
    try:
        data, target, transaction, stage = _transaction_paths(manifest)
    except ValueError:
        return 2
    backup = transaction / "backup"
    moved = False
    installed = False
    db = load_config().directory("database") / "ledger.db"
    token = data.get("task_token")
    try:
        writer = _update_writer(stage)
        if token and writer:
            update_tasks.transfer(db, token, os.getpid())
        elif writer:
            token = update_tasks.reserve(db)
        else:
            token = None
    except Exception as exc:
        write(data, state="error", progress=0, message=f"安装预检未通过，程序与数据库未更改：{exc}")
        return 1
    try:
        deadline = time.monotonic() + 90
        while process_alive(wait_pid):
            if time.monotonic() > deadline:
                raise TimeoutError("托盘尚未退出，安装已取消")
            time.sleep(.25)
        previous = job_recovery.legacy_library_request(db) if writer else None
        preserve_local_state(data, include_database=writer)
        if writer:
            job_recovery.import_legacy_library(db, previous)
        migrate_database(stage, data)
        write(data, state="installing", progress=20, message="正在保留旧版本")
        replace_with_retry(target, backup)
        moved = True
        write(data, progress=50, message="正在安装新版本")
        replace_with_retry(stage, target)
        installed = True
        write(data, progress=80, message="正在启动新版本")
        start_tray(target / "Peach.exe")
        deadline = time.monotonic() + 90
        specs = configured_service_specs(load_config())
        spec = next((s for s in specs if s.name == "https"), specs[0])
        while time.monotonic() < deadline:
            try:
                health = httpx.get(spec.health_url, verify=spec.verify, trust_env=False, timeout=3)
                ready = httpx.get(spec.health_url + "?ready=1", verify=spec.verify, trust_env=False, timeout=3)
                if (health.status_code == ready.status_code == 200 and health.json().get("version") == data["version"]
                        and ready.json().get("ready") and find_tray_windows(target / "Peach.exe")):
                    if desktop_installer.installed(target):
                        try:
                            desktop_installer.record_version(data["version"])
                        except OSError:
                            pass
                    write(data, state="complete", progress=100, message=f"已更新至 {data['version']}")
                    if token:
                        update_tasks.release(db, token)
                    return 0
            except (httpx.HTTPError, ValueError):
                pass
            time.sleep(1)
        raise TimeoutError("新版本未能就绪")
    except Exception as exc:
        if moved:
            from .error_reporting import event
            event('standalone-update-install', exc)
            try:
                _rollback_installation(data, target, transaction, installed=installed, writer=writer, token=token)
                message = f"更新失败，已恢复旧版本：{exc}"
            except Exception as rollback:
                event('standalone-update-rollback', rollback)
                message = f"更新失败，回滚未完成：{rollback}"
        else:
            from .error_reporting import event
            event('standalone-update-install', exc)
            message = f"更新未安装：{exc}"
            try:
                if writer:
                    restore_database(data)
                restore_local_state(data)
                if token:
                    update_tasks.release(db, token)
                if not process_alive(wait_pid):
                    start_tray(target / "Peach.exe")
            except Exception as rollback:
                event('standalone-update-rollback', rollback)
                message = f"更新失败，数据库恢复未完成：{rollback}"
        write(data, state="error", progress=0, message=message)
        return 1
    finally:
        if token:
            update_tasks.release(db, token)
