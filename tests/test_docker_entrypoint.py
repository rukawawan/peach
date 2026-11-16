import stat
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from peach import docker_entrypoint


class IdentityParsingTests(unittest.TestCase):
    def test_missing_values_keep_the_existing_default_identity(self):
        self.assertEqual(
            docker_entrypoint.identity_from_environment({}),
            docker_entrypoint.Identity(1000, 1000),
        )

    def test_primary_variables_and_issue_aliases_are_supported(self):
        self.assertEqual(
            docker_entrypoint.identity_from_environment({"PEACH_UID": "1026", "PEACH_GID": "1027"}),
            docker_entrypoint.Identity(1026, 1027),
        )
        self.assertEqual(
            docker_entrypoint.identity_from_environment({"UID": "1001", "GID": "1002"}),
            docker_entrypoint.Identity(1001, 1002),
        )

    def test_equal_primary_and_alias_values_are_allowed(self):
        self.assertEqual(
            docker_entrypoint.identity_from_environment({
                "PEACH_UID": "1026", "UID": "1026",
                "PEACH_GID": "1027", "GID": "1027",
            }),
            docker_entrypoint.Identity(1026, 1027),
        )

    def test_conflicting_primary_and_alias_values_fail_before_startup(self):
        with self.assertRaisesRegex(docker_entrypoint.EntrypointError, "different values"):
            docker_entrypoint.identity_from_environment({"PEACH_UID": "1026", "UID": "1001"})
        with self.assertRaisesRegex(docker_entrypoint.EntrypointError, "different values"):
            docker_entrypoint.identity_from_environment({"PEACH_GID": "1027", "GID": "1000"})

    def test_ids_are_ascii_decimal_and_stay_away_from_root_and_overflow(self):
        invalid = ("", " ", "+1", "-1", "1.0", "0x10", "１２３", "0", "4294967295", "4294967296")
        for value in invalid:
            with self.subTest(value=value):
                with self.assertRaises(docker_entrypoint.EntrypointError):
                    docker_entrypoint.parse_id(value, "PEACH_UID")

    def test_leading_zero_and_id_boundaries_are_accepted(self):
        self.assertEqual(docker_entrypoint.parse_id("001026", "PEACH_UID"), 1026)
        self.assertEqual(docker_entrypoint.parse_id("1", "PEACH_UID"), 1)
        self.assertEqual(docker_entrypoint.parse_id("4294967294", "PEACH_UID"), 4294967294)


class PrivilegeTests(unittest.TestCase):
    def test_group_add_values_survive_without_root_or_primary_group(self):
        self.assertEqual(
            docker_entrypoint.groups_for_drop([0, 44, 44, 1027, 107], 1027),
            [44, 107],
        )

    def test_drop_sets_groups_before_gid_and_uid(self):
        calls = []
        with mock.patch.object(docker_entrypoint.os, "geteuid",
                               side_effect=[0, 1026], create=True), \
                mock.patch.object(docker_entrypoint.os, "getgroups",
                                  side_effect=[[0, 44, 107], [44, 107]], create=True), \
                mock.patch.object(docker_entrypoint.os, "setgroups",
                                  side_effect=lambda groups: calls.append(("groups", groups)),
                                  create=True), \
                mock.patch.object(docker_entrypoint.os, "setresgid",
                                  side_effect=lambda real, effective, saved:
                                  calls.append(("gid", (real, effective, saved))),
                                  create=True), \
                mock.patch.object(docker_entrypoint.os, "setresuid",
                                  side_effect=lambda real, effective, saved:
                                  calls.append(("uid", (real, effective, saved))),
                                  create=True), \
                mock.patch.object(docker_entrypoint.os, "getuid",
                                  return_value=1026, create=True), \
                mock.patch.object(docker_entrypoint.os, "getgid",
                                  return_value=1027, create=True), \
                mock.patch.object(docker_entrypoint.os, "getegid",
                                  return_value=1027, create=True):
            groups = docker_entrypoint.drop_privileges(docker_entrypoint.Identity(1026, 1027))

        self.assertEqual(groups, [44, 107])
        self.assertEqual(calls, [
            ("groups", [44, 107]),
            ("gid", (1027, 1027, 1027)),
            ("uid", (1026, 1026, 1026)),
        ])

    def test_non_root_process_must_already_have_the_requested_identity(self):
        with mock.patch.object(docker_entrypoint.os, "geteuid",
                               return_value=1027, create=True), \
                mock.patch.object(docker_entrypoint.os, "getuid",
                                  return_value=1027, create=True), \
                mock.patch.object(docker_entrypoint.os, "getgid",
                                  return_value=1027, create=True):
            with self.assertRaisesRegex(docker_entrypoint.EntrypointError, "did not start as root"):
                docker_entrypoint.drop_privileges(docker_entrypoint.Identity(1026, 1027))


class DataPreparationTests(unittest.TestCase):
    def test_current_owner_skips_the_recursive_migration(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            current = root.lstat()
            preparation = docker_entrypoint.prepare_data(
                root, docker_entrypoint.Identity(current.st_uid, current.st_gid)
            )
        self.assertFalse(preparation.migrated)
        self.assertEqual(preparation.changed_entries, 0)

    def test_missing_or_non_directory_data_root_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            missing = Path(directory) / "missing"
            with self.assertRaisesRegex(docker_entrypoint.EntrypointError, "cannot read"):
                docker_entrypoint.prepare_data(missing, docker_entrypoint.Identity(1026, 1027))

            file = Path(directory) / "file"
            file.write_text("x", encoding="utf-8")
            with self.assertRaisesRegex(docker_entrypoint.EntrypointError, "not a directory"):
                docker_entrypoint.prepare_data(file, docker_entrypoint.Identity(1026, 1027))

    def test_migration_skips_nested_mounts_and_changes_the_data_root_last(self):
        root = Path("/data")
        root_stat = SimpleNamespace(
            st_uid=1000, st_gid=1000, st_dev=1,
            st_mode=stat.S_IFDIR | 0o755,
        )
        directory = SimpleNamespace(
            st_uid=1000, st_gid=1000, st_dev=1,
            st_mode=stat.S_IFDIR | 0o755,
        )
        regular = SimpleNamespace(
            st_uid=1000, st_gid=1000, st_dev=1,
            st_mode=stat.S_IFREG | 0o600,
        )
        link = SimpleNamespace(
            st_uid=1000, st_gid=1000, st_dev=1,
            st_mode=stat.S_IFLNK | 0o777,
        )
        nested_mount = SimpleNamespace(
            st_uid=1000, st_gid=1000, st_dev=2,
            st_mode=stat.S_IFDIR | 0o755,
        )
        nested_file_mount = SimpleNamespace(
            st_uid=1000, st_gid=1000, st_dev=2,
            st_mode=stat.S_IFREG | 0o600,
        )
        stats = {
            root: root_stat,
            root / "database": directory,
            root / "database" / "ledger.db": regular,
            root / "link": link,
            root / "mounted": nested_mount,
            root / "mounted-file": nested_file_mount,
        }
        changed = []
        with mock.patch.object(docker_entrypoint.os, "lstat",
                               side_effect=lambda path: stats[Path(path)]), \
                mock.patch.object(docker_entrypoint.os, "walk",
                                  return_value=[
                                      (
                                          str(root),
                                          ["database", "link", "mounted"],
                                          ["mounted-file"],
                                      ),
                                      (str(root / "database"), [], ["ledger.db"]),
                                  ]), \
                mock.patch.object(docker_entrypoint.os, "lchown",
                                  side_effect=lambda path, uid, gid:
                                  changed.append((Path(path), uid, gid)), create=True):
            preparation = docker_entrypoint.prepare_data(
                root, docker_entrypoint.Identity(1026, 1027)
            )

        self.assertEqual(preparation.changed_entries, 4)
        self.assertEqual(preparation.skipped_mounts, (
            str(Path("/data/mounted")),
            str(Path("/data/mounted-file")),
        ))
        self.assertEqual([item[0] for item in changed], [
            Path("/data/database"),
            Path("/data/link"),
            Path("/data/database/ledger.db"),
            Path("/data"),
        ])

    def test_mountinfo_skips_same_device_bind_mounts(self):
        root = Path("/data")
        root_stat = SimpleNamespace(
            st_uid=1000, st_gid=1000, st_dev=1,
            st_mode=stat.S_IFDIR | 0o755,
        )
        database = SimpleNamespace(
            st_uid=1000, st_gid=1000, st_dev=1,
            st_mode=stat.S_IFDIR | 0o755,
        )
        regular = SimpleNamespace(
            st_uid=1000, st_gid=1000, st_dev=1,
            st_mode=stat.S_IFREG | 0o600,
        )
        stats = {
            root: root_stat,
            root / "database": database,
            root / "database" / "ledger.db": regular,
        }
        changed = []
        with tempfile.TemporaryDirectory() as directory:
            mountinfo = Path(directory) / "mountinfo"
            mountinfo.write_text(
                "36 1 0:32 / /data/bind\\040mount rw,relatime - xfs /dev/x rw\n",
                encoding="utf-8",
            )
            with mock.patch.object(docker_entrypoint, "MOUNTINFO_PATH", mountinfo), \
                    mock.patch.object(docker_entrypoint.os, "lstat",
                                      side_effect=lambda path: stats[Path(path)]), \
                    mock.patch.object(docker_entrypoint.os, "walk",
                                      return_value=[
                                          (str(root), ["bind mount", "database"], []),
                                          (str(root / "database"), [], ["ledger.db"]),
                                      ]), \
                    mock.patch.object(docker_entrypoint.os, "lchown",
                                      side_effect=lambda path, uid, gid:
                                      changed.append((Path(path), uid, gid)), create=True):
                preparation = docker_entrypoint.prepare_data(
                    root, docker_entrypoint.Identity(1026, 1027)
                )

        self.assertEqual(preparation.changed_entries, 3)
        self.assertEqual(preparation.skipped_mounts, (str(root / "bind mount"),))
        self.assertEqual([item[0] for item in changed], [
            root / "database",
            root / "database" / "ledger.db",
            root,
        ])

    def test_write_probe_uses_the_final_identity_and_removes_its_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            before = set(root.iterdir())
            docker_entrypoint.verify_data_writable(root)
            self.assertEqual(set(root.iterdir()), before)

    def test_write_probe_reports_read_only_data(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with mock.patch.object(
                docker_entrypoint.tempfile,
                "NamedTemporaryFile",
                side_effect=PermissionError("denied"),
            ):
                with self.assertRaisesRegex(docker_entrypoint.EntrypointError, "not writable"):
                    docker_entrypoint.verify_data_writable(root)


class StartupDutiesTests(unittest.TestCase):
    """root 启动时一并准备的其它东西：一键更新令牌卷与可选的核显节点，都在降权之前。"""

    def run_as_root(self, environ):
        order = []
        identity = docker_entrypoint.Identity(1026, 1027)
        with tempfile.TemporaryDirectory() as directory, \
                mock.patch.object(docker_entrypoint.os, "geteuid", return_value=0, create=True), \
                mock.patch.object(docker_entrypoint, "prepare_data",
                                  side_effect=lambda root, who: order.append(("prepare", Path(root).name, who))
                                  or docker_entrypoint.DataPreparation((1000, 1000), 0, ())), \
                mock.patch("peach.docker_vaapi.prepare",
                           side_effect=lambda device, gid: order.append(("render", device, gid))), \
                mock.patch.object(docker_entrypoint, "drop_privileges",
                                  side_effect=lambda who: order.append(("drop", who)) or []), \
                mock.patch.object(docker_entrypoint, "verify_data_writable"), \
                mock.patch.object(docker_entrypoint, "_report"), \
                mock.patch.object(docker_entrypoint.os, "execvpe", create=True):
            update = Path(directory) / "update"
            update.mkdir()
            data = Path(directory) / "data"
            data.mkdir()
            docker_entrypoint._run(["peach"], {"PEACH_UID": "1026", "PEACH_GID": "1027",
                                               "PEACH_UPDATE_DIR": str(update), **environ}, data)
        return identity, order

    def test_the_update_token_volume_follows_the_service_identity(self):
        identity, order = self.run_as_root({})
        self.assertEqual(order, [("prepare", "data", identity), ("prepare", "update", identity),
                                 ("drop", identity)], "换 UID 后 Peach 仍要能写一键更新令牌")

    def test_the_render_node_goes_to_the_service_group_before_dropping_privileges(self):
        identity, order = self.run_as_root({"PEACH_VAAPI_PREPARE": "1", "PEACH_VAAPI_DEVICE": "/dev/dri/renderD129"})
        self.assertEqual(order[-2:], [("render", "/dev/dri/renderD129", 1027), ("drop", identity)])

    def test_a_render_failure_stops_startup_with_a_logged_reason(self):
        with mock.patch("peach.docker_vaapi.prepare", side_effect=PermissionError("bind mount refused")), \
                self.assertRaisesRegex(docker_entrypoint.EntrypointError, "render node: bind mount refused"), \
                mock.patch.object(docker_entrypoint.os, "geteuid", return_value=0, create=True), \
                mock.patch.object(docker_entrypoint, "prepare_data",
                                  return_value=docker_entrypoint.DataPreparation((1000, 1000), 0, ())):
            docker_entrypoint._run(["peach"], {"PEACH_VAAPI_PREPARE": "1"}, Path("/data"))


class CommandLineIdentityTests(unittest.TestCase):
    """`docker compose exec` 以 root 进容器；peach 管理命令换成服务身份，不在 /data 留下 root 的文件。"""

    def test_root_management_commands_run_as_the_service_identity(self):
        with mock.patch.object(docker_entrypoint.os, "geteuid", return_value=0, create=True), \
                mock.patch.object(docker_entrypoint, "drop_privileges") as drop, \
                mock.patch.dict(docker_entrypoint.os.environ, {}, clear=False):
            docker_entrypoint.drop_root_for_cli({"PEACH_DISTRIBUTION": "docker", "PEACH_UID": "1026"})
            self.assertEqual(docker_entrypoint.os.environ["HOME"], str(docker_entrypoint.DATA_ROOT))
        drop.assert_called_once_with(docker_entrypoint.Identity(1026, 1000))

    def test_other_installs_and_non_root_shells_are_left_alone(self):
        for environ, euid in (({"PEACH_DISTRIBUTION": "docker"}, 1000), ({}, 0)):
            with self.subTest(environ=environ, euid=euid), \
                    mock.patch.object(docker_entrypoint.os, "geteuid", return_value=euid, create=True), \
                    mock.patch.object(docker_entrypoint, "drop_privileges") as drop:
                docker_entrypoint.drop_root_for_cli(environ)
            drop.assert_not_called()


if __name__ == "__main__":
    unittest.main()
