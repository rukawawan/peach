"""独立 macOS 制品的分发边界。"""
from __future__ import annotations

import importlib.util
import plistlib
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
from pathlib import Path
from unittest import TestCase, mock, skipUnless
from dataclasses import dataclass


@dataclass
class FakeSubmenu:
    items: object

class MacStandaloneDistributionTests(TestCase):
    def setUp(self):
        path = Path(__file__).resolve().parents[1] / "scripts" / "build_macos_standalone.py"
        spec = importlib.util.spec_from_file_location("macos_standalone_builder", path)
        self.builder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.builder)
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name).resolve()

    def bundle(self, *, links=False):
        app = self.root / "Peach.app"
        executable = app / "Contents" / "MacOS" / "Peach"
        executable.parent.mkdir(parents=True)
        executable.write_bytes(b"native executable")
        resource = app / "Contents" / "Resources"
        resource.mkdir()
        if links:
            (resource / "runtime").symlink_to("../MacOS/Peach")
        else:
            (resource / "runtime").write_bytes(b"native executable")
        return app, resource

    def test_disk_image_provides_the_bundle_and_install_destination(self):
        app, resource = self.bundle()
        destination = self.root / "release" / "Peach.dmg"

        def create_image(filename, volume_name, *, settings):
            from PIL import Image

            self.assertEqual(filename, str(destination))
            self.assertEqual(volume_name, "Peach")
            self.assertEqual(settings["filesystem"], "APFS")
            self.assertNotIn("Peach.app", settings.get("hide_extensions", []))
            self.assertEqual(settings["files"], [str(app)])
            self.assertEqual(settings["symlinks"], {"Applications": "/Applications"})
            self.assertEqual((resource / "runtime").read_bytes(), b"native executable")
            self.assertEqual(settings["icon_locations"],
                             {"Peach.app": (174, 220), "Applications": (466, 220)})
            background = Path(settings["background"])
            for path, dimensions in ((background, (640, 420)),
                    (background.with_name("background@2x.png"), (1280, 840))):
                with Image.open(path) as image:
                    self.assertEqual(image.size, dimensions)
            self.assertFalse(settings["show_toolbar"])
            self.assertFalse(settings["show_sidebar"])
            destination.write_bytes(b"disk image")

        with mock.patch.dict(sys.modules, {"dmgbuild": SimpleNamespace(build_dmg=create_image)}):
            result = self.builder.package_dmg(app, destination)
        self.assertEqual(result.read_bytes(), b"disk image")

    @skipUnless(sys.platform != "win32", "应用内符号链接在 POSIX 文件系统验证")
    def test_disk_image_preserves_posix_bundle_links(self):
        app, resource = self.bundle(links=True)
        destination = self.root / "release" / "Peach.dmg"

        def create_image(filename, volume_name, *, settings):
            self.assertEqual(settings["files"], [str(app)])
            self.assertTrue((resource / "runtime").is_symlink())
            self.assertEqual((resource / "runtime").read_bytes(), b"native executable")
            Path(filename).write_bytes(b"disk image")

        with mock.patch.dict(sys.modules, {"dmgbuild": SimpleNamespace(build_dmg=create_image)}):
            self.builder.package_dmg(app, destination)
        self.assertTrue((resource / "runtime").is_symlink())
        self.assertEqual((resource / "runtime").read_bytes(), b"native executable")

    def test_incomplete_bundle_is_rejected_before_creating_an_image(self):
        destination = self.root / "release" / "Peach.dmg"
        with self.assertRaises(FileNotFoundError):
            self.builder.package_dmg(self.root / "Peach.app", destination)
        self.assertFalse(destination.parent.exists())

    @skipUnless(sys.platform == "darwin", "磁盘镜像与代码签名需要 macOS")
    def test_signed_unicode_resources_survive_the_disk_image(self):
        app, resource = self.bundle(links=True)
        executable = app / "Contents/MacOS/Peach"
        shutil.copyfile("/usr/bin/true", executable)
        executable.chmod(0o755)
        (app / "Contents/Info.plist").write_bytes(plistlib.dumps({
            "CFBundleExecutable": "Peach", "CFBundleIdentifier": "video.peach.signature-test",
            "CFBundlePackageType": "APPL", "CFBundleVersion": "1",
        }))
        name = "カリビアンコム.png"
        (resource / name).write_bytes(b"signed unicode resource")
        subprocess.run(["codesign", "--force", "--sign", "-", str(app)], check=True,
                       capture_output=True, text=True, encoding="utf-8")
        subprocess.run(["codesign", "--verify", "--deep", "--strict", str(app)], check=True,
                       capture_output=True, text=True, encoding="utf-8")
        image = self.builder.package_dmg(app, self.root / "Peach.dmg")
        mount = self.root / "mounted"
        mount.mkdir()
        subprocess.run(["hdiutil", "attach", str(image), "-readonly", "-nobrowse",
                        "-mountpoint", str(mount)], check=True,
                       capture_output=True, text=True, encoding="utf-8")
        try:
            copied = mount / "Peach.app"
            verification = subprocess.run(
                ["codesign", "--verify", "--deep", "--strict", "--verbose=4", str(copied)],
                capture_output=True, text=True, encoding="utf-8")
            self.assertEqual(verification.returncode, 0, verification.stderr)
            resources = copied / "Contents/Resources"
            self.assertIn(name, [path.name for path in resources.iterdir()])
            self.assertEqual((resources / name).read_bytes(), b"signed unicode resource")
            self.assertTrue((resources / "runtime").is_symlink())
            self.assertEqual((resources / "runtime").readlink(), Path("../MacOS/Peach"))
        finally:
            subprocess.run(["hdiutil", "detach", str(mount)], check=True,
                           capture_output=True, text=True, encoding="utf-8")

    def test_non_macos_build_is_rejected_before_running_tools(self):
        with mock.patch.object(self.builder.sys, "platform", "win32"), \
                mock.patch.object(self.builder.subprocess, "run") as run:
            with self.assertRaises(SystemExit):
                self.builder.build(self.root)
        run.assert_not_called()

    def test_mismatched_python_architecture_is_rejected_before_building(self):
        with mock.patch.object(self.builder.sys, "platform", "darwin"), \
                mock.patch.object(self.builder.platform, "machine", return_value="arm64"), \
                mock.patch.object(self.builder.subprocess, "run") as run:
            with self.assertRaises(SystemExit):
                self.builder.build(self.root, target_arch="x86_64")
        run.assert_not_called()

    def test_minimum_system_uses_dependency_requirements_and_ignores_the_sdk_version(self):
        app = self.root / "Peach.app"
        app.mkdir()
        (app / "native").write_bytes(b"\xcf\xfa\xed\xfe")
        commands = "cmd LC_BUILD_VERSION\n cmdsize 32\n platform 1\n minos 11.0\n sdk 26.5\n"
        commands += "cmd LC_VERSION_MIN_MACOSX\n cmdsize 16\n version 14.0\n sdk 26.5\n"
        with mock.patch.object(self.builder.subprocess, "run", return_value=mock.Mock(stdout=commands)):
            self.assertEqual(self.builder.minimum_system_version(app), "14.0")

    def test_menu_actions_and_certificate_lifecycle_follow_the_distribution(self):
        from peach import tray

        for independent in (True, False):
            with self.subTest(standalone=independent):
                gate = mock.Mock()
                gate.config.directory.return_value = self.root
                gate.waiting = False
                menu = mock.Mock()
                menu_type = mock.Mock(return_value=menu)
                with mock.patch.dict(sys.modules, {"peach.menubar": SimpleNamespace(
                        MenuBarApp=menu_type, Submenu=FakeSubmenu)}), \
                        mock.patch.object(tray, "standalone", return_value=independent), \
                        mock.patch.object(tray, "VersionManager"), \
                        mock.patch.object(tray, "create_icon"), \
                        mock.patch.object(tray, "lan_ipv4", return_value="192.0.2.1"), \
                        mock.patch.object(tray, "ensure_certificate", return_value=None) as certificate, \
                        mock.patch.object(tray, "NetworkChangeWatcher") as watcher:
                    tray.run_macos_menu_bar(mock.Mock(specs=()), gate, silent=True)
                labels = [title for title, _ in menu_type.call_args.args[2]]
                self.assertEqual("同步开发进度" in labels, not independent)
                if independent:
                    certificate.assert_not_called()
                    watcher.assert_not_called()
                else:
                    certificate.assert_called_once()
                    watcher.return_value.start.assert_called_once()
                    watcher.return_value.stop.assert_called_once()
                    self.assertLess(labels.index("同步开发进度"), labels.index("重启服务"))
                menu.run.assert_called_once()

    @skipUnless(sys.platform == "darwin", "AppKit 是 macOS 专属")
    def test_native_submenu_updates_rows_and_routes_nested_actions(self):
        from peach import menubar

        class Menu:
            def __init__(self):
                self.rows = []

            def setAutoenablesItems_(self, value):
                pass

            def addItem_(self, item):
                self.rows.append(item)

        menu_type = mock.Mock()
        menu_type.alloc.return_value.init.side_effect = Menu
        item_type = mock.Mock()
        item_type.alloc.return_value.initWithTitle_action_keyEquivalent_.side_effect = (
            lambda title, *_: mock.Mock(title=title))
        app = object.__new__(menubar.MenuBarApp)
        app.item, app._target = mock.Mock(), mock.Mock()
        action = mock.Mock()
        rows = [("目录不可用", None), ("打开配置", action)]
        app._items = [("状态", menubar.Submenu(lambda: rows)), ("退出", action)]
        app._handlers, app._rendered = {}, None
        with mock.patch.object(menubar.AppKit, "NSMenu", menu_type), \
                mock.patch.object(menubar.AppKit, "NSMenuItem", item_type):
            app.refresh_titles()
            parent = app.menu.rows[0]
            nested = parent.setSubmenu_.call_args.args[0]
            self.assertEqual([row.title for row in nested.rows], ["目录不可用", "打开配置"])
            nested.rows[0].setEnabled_.assert_called_once_with(False)
            self.assertEqual(len(app._handlers), 2)
            app._handlers[0]()
            action.assert_called_once()
            original = app.menu
            app.refresh_titles()
            self.assertIs(app.menu, original)
            rows[:] = [("HTTP 正常", None)]
            app.refresh_titles()
            nested = app.menu.rows[0].setSubmenu_.call_args.args[0]
            self.assertEqual([row.title for row in nested.rows], ["HTTP 正常"])
            self.assertEqual(len(app._handlers), 1)


def load_script(name: str):
    path = Path(__file__).resolve().parents[1] / "scripts" / f"{name}.py"
    sys.path.insert(0, str(path.parent))
    try:
        spec = importlib.util.spec_from_file_location(f"sparkle_{name}", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    finally:
        sys.path.remove(str(path.parent))
    return module


APPCAST = """<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
    <title>Peach</title>
    <item>
      <title>0.53.0</title>
      <sparkle:version>0.53.0</sparkle:version>
      <sparkle:minimumSystemVersion>15.0</sparkle:minimumSystemVersion>
      <enclosure url="https://example.test/v0.53.0/Peach-0.53.0-macos-arm64.dmg" length="{length}"
                 type="application/octet-stream" sparkle:edSignature="c2lnbmF0dXJl"/>
    </item>
    <item>
      <title>0.52.0</title>
      <sparkle:version>0.52.0</sparkle:version>
      <sparkle:minimumSystemVersion>15.0</sparkle:minimumSystemVersion>
      <enclosure url="https://example.test/v0.52.0/Peach-0.52.0-macos-arm64.dmg" length="7"
                 type="application/octet-stream" sparkle:edSignature="b2xk"/>
    </item>
  </channel>
</rss>
"""


class SparkleUpdateTests(TestCase):
    """Sparkle 2 的打包、发布门槛与安装前保护（ADR-0130）。"""

    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name).resolve()

    def test_info_plist_carries_sparkle_keys_only_once_a_public_key_is_set(self):
        from peach import sparkle_update

        with mock.patch.object(sparkle_update, "PUBLIC_ED_KEY", None):
            self.assertEqual(sparkle_update.info_plist_keys("arm64"), {})
        with mock.patch.object(sparkle_update, "PUBLIC_ED_KEY", "cHVibGlj"):
            keys = sparkle_update.info_plist_keys("x86_64")
        self.assertEqual(keys["SUFeedURL"], "https://downloads.peach.video/sparkle/macos-x86_64.xml")
        self.assertEqual(keys["SUPublicEDKey"], "cHVibGlj")
        self.assertIs(keys["SUVerifyUpdateBeforeExtraction"], True)
        self.assertIs(keys["SUAllowsAutomaticUpdates"], False)

    def test_public_key_once_set_is_a_32_byte_ed25519_key(self):
        import base64
        from peach import sparkle_update

        if sparkle_update.PUBLIC_ED_KEY is not None:
            self.assertEqual(len(base64.b64decode(sparkle_update.PUBLIC_ED_KEY, validate=True)), 32)

    def test_updater_is_unavailable_outside_the_macos_standalone_bundle(self):
        from peach import sparkle_update

        with mock.patch.object(sparkle_update.sys, "platform", "win32"):
            self.assertFalse(sparkle_update.available())
            self.assertIsNone(sparkle_update.start(config=mock.Mock(), stop_services=mock.Mock(), notify=mock.Mock()))

    def test_framework_is_fetched_without_xpc_services_and_signed_inside_out(self):
        fetcher = load_script("fetch_sparkle_macos")
        framework = self.root / "Sparkle.framework"
        (framework / "Versions/B/XPCServices/Installer.xpc").mkdir(parents=True)
        (framework / "XPCServices").write_text("指向 Versions/Current/XPCServices 的链接", encoding="utf-8")
        fetcher.strip_xpc_services(framework)
        self.assertFalse((framework / "Versions/B/XPCServices").exists())
        self.assertFalse((framework / "XPCServices").exists())
        run = mock.Mock()
        fetcher.sign(framework, run=run)
        signed = [call.args[0][-1] for call in run.call_args_list]
        self.assertEqual(signed, [str(framework / "Versions/B/Autoupdate"),
                                  str(framework / "Versions/B/Updater.app"), str(framework)])
        self.assertTrue(all(call.args[0][:4] == ["codesign", "--force", "--sign", "-"] for call in run.call_args_list))

    def test_framework_validation_rejects_a_changed_lock_or_leftover_xpc_services(self):
        import hashlib
        import json

        fetcher = load_script("fetch_sparkle_macos")
        archive = self.root / "Sparkle.tar.xz"
        archive.write_bytes(b"archive")
        (self.root / "LICENSE-Sparkle.txt").write_text("MIT", encoding="utf-8")
        binary = self.root / "Sparkle.framework/Versions/B/Sparkle"
        binary.parent.mkdir(parents=True)
        binary.write_bytes(b"framework")
        asset = {"url": "https://example.test/Sparkle.tar.xz", "sha256": hashlib.sha256(b"archive").hexdigest()}
        lock = self.root / "sparkle-macos.json"
        lock.write_text(json.dumps({"version": "2.10.1", "asset": asset}), encoding="utf-8")
        manifest = {"version": "2.10.1", "source": asset,
                    "license": hashlib.sha256(b"MIT").hexdigest()}
        (self.root / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        with mock.patch.object(fetcher, "LOCK", lock):
            self.assertEqual(fetcher.validate(self.root), manifest)
            (self.root / "Sparkle.framework/Versions/B/XPCServices").mkdir()
            with self.assertRaisesRegex(ValueError, "XPC"):
                fetcher.validate(self.root)
            lock.write_text(json.dumps({"version": "2.10.2", "asset": asset}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "固定发行"):
                fetcher.validate(self.root)

    def test_build_places_the_framework_in_the_bundle_frameworks_directory(self):
        builder = load_script("build_macos_standalone")
        source = self.root / "sparkle"
        (source / "Sparkle.framework/Versions/B").mkdir(parents=True)
        (source / "Sparkle.framework/Versions/B/Sparkle").write_bytes(b"framework")
        (source / "LICENSE-Sparkle.txt").write_text("MIT", encoding="utf-8")
        app = self.root / "Peach.app"
        (app / "Contents/Frameworks").mkdir(parents=True)
        (app / "Contents/Resources").mkdir()
        builder.install_sparkle(app, source)
        self.assertEqual((app / "Contents/Frameworks/Sparkle.framework/Versions/B/Sparkle").read_bytes(), b"framework")
        self.assertEqual((app / "Contents/Resources/LICENSE-Sparkle.txt").read_text(encoding="utf-8"), "MIT")

    def database(self, *versions: str) -> Path:
        import sqlite3

        path = self.root / "database" / "ledger.db"
        path.parent.mkdir(parents=True)
        with sqlite3.connect(path) as connection:
            connection.execute("CREATE TABLE schema_migration(version TEXT PRIMARY KEY, name TEXT NOT NULL,"
                               " checksum TEXT NOT NULL, applied_at TEXT NOT NULL)")
            connection.executemany("INSERT INTO schema_migration VALUES (?, 'm', 'c', 'now')",
                                   [(version,) for version in versions])
        connection.close()
        return path

    def test_reader_refuses_a_release_whose_migrations_its_ledger_has_not_applied(self):
        from peach import sparkle_update

        self.database("0049", "0050")
        config = SimpleNamespace(directory=lambda name: self.root / name)
        with mock.patch("peach.runtime_prepare.configured_ledger_writer", return_value=(False, "共享账本由另一台机器写入")):
            self.assertIsNone(sparkle_update.install_blocker(["50", None], config))
            self.assertIn("写入端", sparkle_update.install_blocker(["51"], config))
            self.assertIn("迁移号", sparkle_update.install_blocker([None], config))
        with mock.patch("peach.runtime_prepare.configured_ledger_writer", return_value=(True, "")):
            self.assertIsNone(sparkle_update.install_blocker(["51"], config))

    def test_install_saves_task_progress_before_releasing_the_ports(self):
        from peach import sparkle_update

        database = self.database("0050")
        order = []
        with mock.patch("peach.update_tasks.reserve", side_effect=lambda db: order.append(("reserve", db))), \
                mock.patch("peach.update_tasks.wait_quiescent", side_effect=lambda db: order.append(("wait", db))):
            sparkle_update.prepare_install(database, lambda: order.append(("stop",)))
        self.assertEqual(order, [("reserve", database), ("wait", database), ("stop",)])
        order.clear()
        sparkle_update.prepare_install(self.root / "missing.db", lambda: order.append(("stop",)))
        self.assertEqual(order, [("stop",)])

    def test_settings_page_preferences_drive_sparkle_scheduled_checks(self):
        from peach import sparkle_update

        self.assertEqual(sparkle_update.scheduled_settings({"mode": "off", "interval_hours": 24}), (False, 86400.0))
        self.assertEqual(sparkle_update.scheduled_settings({"mode": "check", "interval_hours": 6}), (True, 21600.0))
        updater = mock.Mock()
        updater.automaticallyChecksForUpdates.return_value = True
        updater.updateCheckInterval.return_value = 86400.0
        controller = mock.Mock()
        controller.updater.return_value = updater
        wrapper = sparkle_update.Updater(controller, object())
        wrapper.apply({"mode": "check", "interval_hours": 24})
        updater.setAutomaticallyChecksForUpdates_.assert_not_called()
        updater.setUpdateCheckInterval_.assert_not_called()
        wrapper.apply({"mode": "off", "interval_hours": 168})
        updater.setAutomaticallyChecksForUpdates_.assert_called_once_with(False)
        updater.setUpdateCheckInterval_.assert_called_once_with(604800.0)
        wrapper.check()
        controller.checkForUpdates_.assert_called_once_with(None)

    def test_menu_bar_check_hands_over_to_sparkle_when_enabled(self):
        from peach import tray

        sparkle = mock.Mock()
        menu_type = mock.Mock()
        with mock.patch.dict(sys.modules, {"peach.menubar": SimpleNamespace(MenuBarApp=menu_type, Submenu=FakeSubmenu)}), \
                mock.patch.object(tray, "standalone", return_value=True), \
                mock.patch.object(tray, "VersionManager") as versions, \
                mock.patch.object(tray, "create_icon"), \
                mock.patch.object(tray.sparkle_update, "start", return_value=sparkle):
            tray.run_macos_menu_bar(mock.Mock(specs=()), mock.Mock(waiting=False), silent=True)
        submenu = dict(menu_type.call_args.args[2])["版本与更新"]
        dict(row for row in submenu.items() if row[0])["检查更新"]()
        sparkle.check.assert_called_once()
        versions.return_value.check.assert_not_called()

    def appcast(self, version="0.53.0"):
        dmg = self.root / f"Peach-{version}-macos-arm64.dmg"
        dmg.write_bytes(b"disk image")
        feed = self.root / "macos-arm64.xml"
        feed.write_text(APPCAST.format(length=dmg.stat().st_size), encoding="utf-8")
        return feed, dmg

    def test_appcast_gate_accepts_the_newest_signed_item_with_its_migration_head(self):
        tool = load_script("sparkle_appcast")
        feed, dmg = self.appcast()
        tool.annotate(feed, "0.53.0", 50)
        self.assertIn("peach:migrationHead", feed.read_text(encoding="utf-8"))
        result = tool.verify(feed, version="0.53.0", dmg=dmg, url_prefix="https://example.test/v0.53.0/", head=50)
        self.assertEqual(result["signature"], "c2lnbmF0dXJl")
        with self.assertRaisesRegex(ValueError, "迁移号"):
            tool.verify(feed, version="0.53.0", dmg=dmg, url_prefix="https://example.test/v0.53.0/", head=51)

    def test_appcast_gate_rejects_a_stale_item_or_a_mismatched_download(self):
        tool = load_script("sparkle_appcast")
        feed, dmg = self.appcast()
        tool.annotate(feed, "0.53.0", 50)
        with self.assertRaisesRegex(ValueError, "不低于本版本"):
            tool.verify(feed, version="0.52.0", dmg=dmg, url_prefix="https://example.test/v0.52.0/", head=50)
        with self.assertRaisesRegex(ValueError, "下载地址"):
            tool.verify(feed, version="0.53.0", dmg=dmg, url_prefix="https://mirror.example.test/", head=50)
        dmg.write_bytes(b"different size")
        with self.assertRaisesRegex(ValueError, "大小"):
            tool.verify(feed, version="0.53.0", dmg=dmg, url_prefix="https://example.test/v0.53.0/", head=50)

    def test_publish_checks_the_uploaded_feed_past_the_public_cache(self):
        """公开入口缓存一分钟：核对要取回刚上传的那份，不能读到裸地址上缓存的旧文件或首发前的 404。"""
        tool = load_script("sparkle_appcast")
        feeds = []
        for arch in ("arm64", "x86_64"):
            feed = self.root / f"macos-{arch}.xml"
            feed.write_text(f"<rss>{arch}</rss>", encoding="utf-8")
            feeds.append(feed)
        release_r2 = SimpleNamespace(verify_download=mock.Mock(), rclone_environment=lambda: {
            "PEACH_RCLONE": "rclone", "PEACH_R2_BUCKET": "bucket", "PEACH_R2_PUBLIC_BASE": "https://downloads.example.test/"})
        with mock.patch.dict(sys.modules, {"release_r2": release_r2}), mock.patch.object(tool.subprocess, "run"):
            published = tool.publish(feeds)
        self.assertEqual([item["name"] for item in published], ["macos-arm64.xml", "macos-x86_64.xml"])
        urls = [call.args[0] for call in release_r2.verify_download.call_args_list]
        self.assertEqual(urls, [f"https://downloads.example.test/sparkle/{item['name']}?sha256={item['sha256']}"
                                for item in published])

    @skipUnless(sys.platform == "darwin", "pyobjc 是 macOS 专属")
    def test_delegate_declares_bool_returns_and_lets_sparkle_choose_when_nothing_blocks(self):
        from peach import sparkle_update

        delegate = sparkle_update._delegate_class()(mock.Mock(), mock.Mock(), mock.Mock())
        methods = type(delegate).pyobjc_instanceMethods
        self.assertTrue(methods.supportsGentleScheduledUpdateReminders.signature.startswith(b"Z"))
        self.assertTrue(delegate.supportsGentleScheduledUpdateReminders())
        appcast = mock.Mock()
        appcast.items.return_value = []
        with mock.patch.object(sparkle_update, "install_blocker", return_value=None):
            self.assertIsNone(delegate.bestValidUpdateInAppcast_forUpdater_(appcast, None))
