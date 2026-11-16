"""Docker 启动时准备数据目录，并降权到配置的数值 UID/GID。

日志写到容器标准错误，固定英文（ADR-0159）。
"""
from __future__ import annotations

import glob
import os
import re
import stat
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Sequence


DEFAULT_UID = 1000
DEFAULT_GID = 1000
MAX_ID = 2**32 - 2
DATA_ROOT = Path("/data")
#: 一键更新令牌卷（ADR-0140），镜像里原本交给 UID 1000；换身份后 Peach 要能写令牌。
UPDATE_DIR_ENV = "PEACH_UPDATE_DIR"
#: nas_setup --prepare-render 写入；降权前把透传的渲染节点交给目标组（docker_vaapi）。
VAAPI_PREPARE_ENV = "PEACH_VAAPI_PREPARE"
VAAPI_DEVICE_ENV = "PEACH_VAAPI_DEVICE"
MOUNTINFO_PATH = Path("/proc/self/mountinfo")

EX_CONFIG = 64
EX_DATA = 73
EX_IDENTITY = 77
EX_COMMAND = 127

_DECIMAL = re.compile(r"[0-9]+")


class EntrypointError(RuntimeError):
    """入口无法安全继续时使用的可预期错误。"""

    def __init__(self, message: str, code: int) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class Identity:
    uid: int
    gid: int


@dataclass(frozen=True)
class DataPreparation:
    old_owner: tuple[int, int]
    changed_entries: int
    skipped_mounts: tuple[str, ...]

    @property
    def migrated(self) -> bool:
        return self.changed_entries > 0


def parse_id(value: str, name: str) -> int:
    """只接受容器 ID 可用的 ASCII 十进制数，拒绝 root 与 -1 哨兵值。"""
    if _DECIMAL.fullmatch(value) is None:
        raise EntrypointError(f"{name} must be a decimal integer in 1..{MAX_ID}, got {value!r}", EX_CONFIG)
    number = int(value, 10)
    if not 1 <= number <= MAX_ID:
        raise EntrypointError(f"{name} must be a decimal integer in 1..{MAX_ID}, got {value!r}", EX_CONFIG)
    return number


def _identity_value(
    environ: Mapping[str, str], primary: str, alias: str, default: int,
) -> int:
    primary_set = primary in environ
    alias_set = alias in environ
    if not primary_set and not alias_set:
        return default

    selected = parse_id(environ[primary], primary) if primary_set else None
    compatible = parse_id(environ[alias], alias) if alias_set else None
    if selected is not None and compatible is not None and selected != compatible:
        raise EntrypointError(
            f"{primary} and {alias} are both set to different values: {selected} != {compatible}", EX_CONFIG)
    if selected is not None:
        return selected
    assert compatible is not None
    return compatible


def identity_from_environment(environ: Mapping[str, str]) -> Identity:
    """读取主变量；兼容 issue 原文的 UID/GID 别名，但不静默解决冲突。"""
    return Identity(
        uid=_identity_value(environ, "PEACH_UID", "UID", DEFAULT_UID),
        gid=_identity_value(environ, "PEACH_GID", "GID", DEFAULT_GID),
    )


def groups_for_drop(groups: Sequence[int], primary_gid: int) -> list[int]:
    """保留 Docker group_add 的补充组，但不把 root 组带过降权边界。"""
    return sorted({gid for gid in groups if gid not in {0, primary_gid}})


def _log(message: str) -> None:
    print(f"[docker] {message}", file=sys.stderr, flush=True)


def _lchown_changed(
    path: Path, current: os.stat_result, identity: Identity,
) -> bool:
    if (current.st_uid, current.st_gid) == (identity.uid, identity.gid):
        return False
    try:
        os.lchown(path, identity.uid, identity.gid)
    except OSError as exc:
        raise EntrypointError(f"cannot change the owner of {path}: {exc}", EX_DATA) from exc
    return True


def _raise_walk_error(error: OSError) -> None:
    raise error


def _mountinfo_field(value: str) -> str:
    """解码 mountinfo 中空白字符和反斜杠的八进制转义。"""
    return re.sub(r"\\([0-7]{3})", lambda match: chr(int(match.group(1), 8)), value)


def _nested_mounts(root: Path) -> set[Path]:
    """读取 Linux 挂载表；同一文件系统上的 bind mount 也必须在迁移时跳过。"""
    try:
        lines = MOUNTINFO_PATH.read_text(
            encoding="utf-8", errors="surrogateescape"
        ).splitlines()
    except OSError:
        return set()

    root = Path(root)
    nested: set[Path] = set()
    for line in lines:
        before, separator, _after = line.partition(" - ")
        if not separator:
            continue
        fields = before.split()
        if len(fields) < 5:
            continue
        mountpoint = Path(_mountinfo_field(fields[4]))
        if mountpoint != root:
            try:
                mountpoint.relative_to(root)
            except ValueError:
                continue
            nested.add(mountpoint)
    return nested


def prepare_data(root: Path, identity: Identity) -> DataPreparation:
    """仅在数据根仍属于旧身份时迁移整棵树，成功后最后再改数据根。"""
    try:
        root_stat = os.lstat(root)
    except OSError as exc:
        raise EntrypointError(f"cannot read the data directory {root}: {exc}", EX_DATA) from exc
    if not stat.S_ISDIR(root_stat.st_mode):
        raise EntrypointError(f"the data directory is not a directory: {root}", EX_DATA)

    old_owner = (root_stat.st_uid, root_stat.st_gid)
    if old_owner == (identity.uid, identity.gid):
        return DataPreparation(old_owner, 0, ())

    changed = 0
    skipped_mounts: list[str] = []
    nested_mounts = _nested_mounts(root)
    try:
        walker = os.walk(root, topdown=True, onerror=_raise_walk_error, followlinks=False)
        for current_root, directories, files in walker:
            current_path = Path(current_root)
            for name in list(directories):
                path = current_path / name
                if path in nested_mounts:
                    skipped_mounts.append(str(path))
                    directories.remove(name)
                    continue
                child = os.lstat(path)
                if stat.S_ISLNK(child.st_mode):
                    changed += _lchown_changed(path, child, identity)
                    directories.remove(name)
                    continue
                if child.st_dev != root_stat.st_dev:
                    skipped_mounts.append(str(path))
                    directories.remove(name)
                    continue
                changed += _lchown_changed(path, child, identity)
            for name in files:
                path = current_path / name
                if path in nested_mounts:
                    skipped_mounts.append(str(path))
                    continue
                child = os.lstat(path)
                if child.st_dev != root_stat.st_dev:
                    skipped_mounts.append(str(path))
                    continue
                changed += _lchown_changed(path, child, identity)
        changed += _lchown_changed(root, root_stat, identity)
    except EntrypointError:
        raise
    except OSError as exc:
        raise EntrypointError(f"cannot change the owner of {root}: {exc}", EX_DATA) from exc
    return DataPreparation(old_owner, changed, tuple(skipped_mounts))


def drop_privileges(identity: Identity) -> list[int]:
    """先固定补充组，再同时替换 gid/uid；不允许保留可回提权的身份。"""
    if os.geteuid() != 0:
        effective = Identity(os.getuid(), os.getgid())
        if effective != identity:
            raise EntrypointError(_identity_mismatch(effective, identity), EX_IDENTITY)
        return os.getgroups()

    groups = groups_for_drop(os.getgroups(), identity.gid)
    try:
        os.setgroups(groups)
        if hasattr(os, "setresgid"):
            os.setresgid(identity.gid, identity.gid, identity.gid)
        else:
            os.setgid(identity.gid)
        if hasattr(os, "setresuid"):
            os.setresuid(identity.uid, identity.uid, identity.uid)
        else:
            os.setuid(identity.uid)
    except OSError as exc:
        raise EntrypointError(f"cannot drop privileges to {identity.uid}:{identity.gid}: {exc}", EX_IDENTITY) from exc

    effective = Identity(os.getuid(), os.getgid())
    if effective != identity or os.geteuid() != identity.uid or os.getegid() != identity.gid:
        raise EntrypointError(
            f"identity after dropping privileges is {effective.uid}:{effective.gid}, "
            f"expected {identity.uid}:{identity.gid}", EX_IDENTITY)
    return os.getgroups()


def _identity_mismatch(actual: Identity, identity: Identity) -> str:
    return (f"the container did not start as root and runs as {actual.uid}:{actual.gid}, "
            f"not the requested {identity.uid}:{identity.gid}")


def prepare_update_dir(environ: Mapping[str, str], identity: Identity) -> None:
    """令牌卷只有一个文件，与 /data 一样只在属主不对时迁移；compose 没挂这个卷时跳过。"""
    directory = environ.get(UPDATE_DIR_ENV, "").strip()
    if directory and Path(directory).is_dir():
        prepare_data(Path(directory), identity)


def verify_data_writable(root: Path) -> None:
    """用最终身份实际创建文件；os.access 无法覆盖 ACL 和全部挂载实现。"""
    try:
        with tempfile.NamedTemporaryFile(prefix=".peach-write-", dir=root):
            pass
    except OSError as exc:
        raise EntrypointError(f"{root} is not writable for the service identity: {exc}", EX_DATA) from exc

    database = root / "database" / "ledger.db"
    try:
        database_stat = os.stat(database)
    except FileNotFoundError:
        return
    except OSError as exc:
        raise EntrypointError(f"cannot check the existing ledger {database}: {exc}", EX_DATA) from exc
    if not stat.S_ISREG(database_stat.st_mode):
        raise EntrypointError(f"the existing ledger is not a regular file: {database}", EX_DATA)
    try:
        descriptor = os.open(database, os.O_RDWR)
        os.close(descriptor)
    except OSError as exc:
        raise EntrypointError(
            f"the existing ledger {database} is not writable for the service identity: {exc}", EX_DATA) from exc


def _media_status(path: Path) -> str:
    if not path.exists():
        return "missing"
    return "readable" if os.access(path, os.R_OK | os.X_OK) else "permission_denied"


def _render_status() -> str:
    nodes = sorted(glob.glob("/dev/dri/renderD*"))
    if not nodes:
        return "not-present"
    return ",".join(
        f"{node}:{'rw' if os.access(node, os.R_OK | os.W_OK) else 'denied'}"
        for node in nodes
    )


def _report(
    data_root: Path, identity: Identity, groups: Sequence[int], preparation: DataPreparation,
) -> None:
    root_stat = os.lstat(data_root)
    owner = f"{root_stat.st_uid}:{root_stat.st_gid}"
    mode = stat.filemode(root_stat.st_mode)
    if preparation.migrated:
        _log(
            f"/data owner {preparation.old_owner[0]}:{preparation.old_owner[1]} "
            f"-> {identity.uid}:{identity.gid}; changed={preparation.changed_entries}"
        )
    for path in preparation.skipped_mounts:
        _log(f"skipped a nested mount inside /data: {path}")
    _log(
        f"effective uid={os.getuid()} gid={os.getgid()} groups={','.join(map(str, groups)) or '-'}; "
        f"/data owner={owner} mode={mode} writable=yes; "
        f"/media={_media_status(Path('/media'))}; render={_render_status()}"
    )


def _run(
    command: Sequence[str], environ: Mapping[str, str], data_root: Path,
) -> None:
    if not command:
        raise EntrypointError("no command to run; the image provides the Peach command through CMD", EX_CONFIG)

    identity = identity_from_environment(environ)
    if os.geteuid() == 0:
        preparation = prepare_data(data_root, identity)
        prepare_update_dir(environ, identity)
        if environ.get(VAAPI_PREPARE_ENV) == "1":
            from .docker_vaapi import prepare
            try:
                prepare(environ.get(VAAPI_DEVICE_ENV) or "/dev/dri/renderD128", identity.gid)
            except (ValueError, OSError) as exc:
                raise EntrypointError(f"cannot prepare the render node: {exc}", EX_CONFIG) from exc
    else:
        actual = Identity(os.getuid(), os.getgid())
        if actual != identity:
            raise EntrypointError(_identity_mismatch(actual, identity), EX_IDENTITY)
        if environ.get(VAAPI_PREPARE_ENV) == "1":
            raise EntrypointError(f"{VAAPI_PREPARE_ENV}=1 needs the container to start as root", EX_IDENTITY)
        preparation = DataPreparation((actual.uid, actual.gid), 0, ())

    groups = drop_privileges(identity)
    verify_data_writable(data_root)
    child_environment = dict(environ)
    child_environment["HOME"] = str(data_root)
    _report(data_root, identity, groups, preparation)
    try:
        os.execvpe(command[0], list(command), child_environment)
    except OSError as exc:
        raise EntrypointError(f"cannot run {command[0]!r}: {exc}", EX_COMMAND) from exc


def main(
    argv: Sequence[str] | None = None,
    *,
    environ: Mapping[str, str] | None = None,
    data_root: Path = DATA_ROOT,
) -> int:
    command = tuple(sys.argv[1:] if argv is None else argv)
    environment = os.environ if environ is None else environ
    try:
        _run(command, environment, data_root)
    except EntrypointError as exc:
        _log(str(exc))
        return exc.code
    except OSError as exc:
        _log(f"entrypoint failed: {exc}")
        return EX_DATA
    return 0


def drop_root_for_cli(environ: Mapping[str, str] | None = None) -> None:
    """`docker compose exec` 默认以 root 进容器；管理命令先换成服务身份，免得在 /data 留下 root 的文件。"""
    environment = os.environ if environ is None else environ
    if environment.get("PEACH_DISTRIBUTION") != "docker" or not hasattr(os, "geteuid") or os.geteuid() != 0:
        return
    try:
        drop_privileges(identity_from_environment(environment))
    except EntrypointError as exc:
        _log(str(exc))
        raise SystemExit(exc.code) from None
    os.environ["HOME"] = str(DATA_ROOT)


if __name__ == "__main__":
    raise SystemExit(main())
