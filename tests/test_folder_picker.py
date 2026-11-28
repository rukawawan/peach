"""`peach.folder_picker`：由运行 Peach 的这台电脑弹系统文件夹对话框，替浏览器拿到绝对路径。

对话框本身没法在测试里弹，这里钉住的是命令行的形状、取消与失败的区分，以及一次只开一个。
"""
from __future__ import annotations

import base64
import ntpath
import os
import plistlib
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from peach import folder_picker


class HeadlessPickerTests(unittest.TestCase):
    def test_headless_service_never_launches_a_native_dialog(self):
        from unittest.mock import patch
        with patch.dict('os.environ', {'PEACH_HEADLESS_MANAGED': '1'}), \
                patch('peach.folder_picker.command') as command:
            with self.assertRaises(folder_picker.PickerUnsupported):
                folder_picker.pick_folder(platform='darwin')
            command.assert_not_called()


class FakeRun:
    def __init__(self, stdout: bytes = b"", returncode: int = 0, stderr: bytes = b""):
        self.stdout, self.returncode, self.stderr = stdout, returncode, stderr
        self.calls: list[tuple[list[str], dict]] = []

    def __call__(self, argv, **kwargs):
        self.calls.append((list(argv), kwargs))
        return subprocess.CompletedProcess(argv, self.returncode, self.stdout, self.stderr)


class FakeMacRun:
    def __init__(self, outcome):
        self.outcome = outcome
        self.info = None
        self.env = None
        self.steps = []

    def __call__(self, argv, **kwargs):
        executable = Path(argv[0]).name
        self.steps.append(executable)
        if executable == "osacompile":
            bundle = Path(argv[2])
            contents = bundle / "Contents"
            contents.mkdir(parents=True)
            (contents / "Info.plist").write_bytes(plistlib.dumps({"CFBundleExecutable": "applet"}))
        elif executable == "codesign":
            self.info = plistlib.loads((Path(argv[-1]) / "Contents" / "Info.plist").read_bytes())
        else:
            self.env = kwargs["env"]
            if self.outcome is not None:
                Path(self.env["PEACH_PICK_OUTPUT"]).write_bytes(self.outcome.encode("utf-8"))
        return subprocess.CompletedProcess(argv, 0, b"", b"")


class CommandTests(unittest.TestCase):
    def test_windows_uses_the_modern_folder_picker_through_the_built_in_powershell(self):
        """`powershell.exe` 每台 Windows 都有，pwsh 7 是另装的；脚本以 -EncodedCommand 传，不碰引号转义。

        对话框是 Shell 的 `IFileOpenDialog`（带地址栏），不是 Windows Forms 那块树形面板。
        """
        argv, env = folder_picker.command(r"D:\Media", platform="win32")
        self.assertEqual(ntpath.basename(argv[0]).casefold(), "powershell.exe")
        self.assertIn("-STA", argv, "COM 对话框要求单线程套间")
        self.assertEqual(argv[-2], "-EncodedCommand")
        script = base64.b64decode(argv[-1]).decode("utf-16-le")
        self.assertLess(script.index('SetThreadDpiAwarenessContext(new IntPtr(-4))'),
                        script.index('new FileOpenDialogRCW()'))
        self.assertIn('SetThreadDpiAwarenessContext(previousDpi)', script)
        self.assertIn('Guid("42f85136-db7e-439c-85f1-e4075d135fc8")', script, "IFileOpenDialog 的接口 ID")
        self.assertIn("dialog.SetOptions(0x8 | 0x20 | 0x40)", script, "FOS_NOCHANGEDIR、FOS_PICKFOLDERS、FOS_FORCEFILESYSTEM")
        self.assertNotIn("FolderBrowserDialog", script)
        self.assertIn("$env:PEACH_PICK_INITIAL", script)
        self.assertIn("dialog.Show(IntPtr.Zero)", script, "不挂所有者窗口：透明置顶的 Form 会把对话框一起藏起来")
        self.assertIn("SetWindowPos(window, new IntPtr(-1)", script, "后台服务进程没有前台权，对话框要自己置顶")
        self.assertNotIn("System.Windows.Forms", script)
        self.assertIn(f"Pick('{folder_picker.prompt()}', $env:PEACH_PICK_INITIAL, $false)", script)
        self.assertEqual(env, {"PEACH_PICK_INITIAL": r"D:\Media"})

    def test_windows_powershell_is_found_under_the_system_root_not_through_path(self):
        """服务进程的 PATH 可能被安装器或用户改坏；`powershell.exe` 固定装在系统目录里。"""
        with mock.patch.dict(os.environ, {"SystemRoot": r"C:\Windows"}):
            argv, _ = folder_picker.command(None, platform="win32")
        self.assertEqual(argv[0], r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe")
        with mock.patch.dict(os.environ):
            os.environ.pop("SystemRoot", None)
            argv, _ = folder_picker.command(None, platform="win32")
        self.assertEqual(argv[0], "powershell.exe", "取不到系统目录时退回按名字查找")

    def test_other_platforms_say_so(self):
        with self.assertRaises(folder_picker.PickerUnavailable):
            folder_picker.command(None, platform="linux")


class PickTests(unittest.TestCase):
    def test_the_chosen_path_comes_back_stripped_and_the_initial_path_travels_by_environment(self):
        run = FakeRun(b"E:\\Movies\r\n")
        chosen = folder_picker.pick_folder(r"D:\Media", platform="win32", run=run)
        self.assertEqual(chosen, r"E:\Movies")
        (argv, kwargs), = run.calls
        self.assertEqual(ntpath.basename(argv[0]).casefold(), "powershell.exe")
        self.assertEqual(kwargs["env"]["PEACH_PICK_INITIAL"], r"D:\Media")
        self.assertTrue(kwargs["capture_output"])

    def test_cancelling_yields_none_on_both_platforms(self):
        self.assertIsNone(folder_picker.pick_folder(platform="win32", run=FakeRun(b"")))
        self.assertIsNone(folder_picker.pick_folder(platform="darwin", run=FakeMacRun("cancelled")))

    def test_macos_launches_a_signed_localized_bundle_for_the_folder_picker(self):
        with tempfile.TemporaryDirectory(prefix="peach media ") as initial:
            run = FakeMacRun("path:/Volumes/媒体/")
            self.assertEqual(folder_picker.pick_folder(initial, platform="darwin", run=run), "/Volumes/媒体")
            self.assertEqual(run.steps, ["osacompile", "codesign", "applet"])
            self.assertEqual(run.info["CFBundleLocalizations"], ["en", "zh-Hans"])
            self.assertTrue(run.info["CFBundleAllowMixedLocalizations"])
            self.assertEqual(run.env["PEACH_PICK_INITIAL"], initial)
            self.assertEqual(run.env["PEACH_PICK_APPLICATION"], "0")
            self.assertFalse(Path(run.env["PEACH_PICK_OUTPUT"]).parent.exists())

    def test_macos_player_picker_uses_application_mode_and_accepts_an_app_path(self):
        run = FakeMacRun("path:/Applications/我的播放器.app/")
        with mock.patch.object(folder_picker.sys, "platform", "darwin"), \
                mock.patch.object(folder_picker.subprocess, "run", run):
            self.assertEqual(folder_picker.pick_application(), "/Applications/我的播放器.app")
        self.assertEqual(run.env["PEACH_PICK_APPLICATION"], "1")

    def test_macos_a_missing_result_is_a_failure(self):
        with self.assertRaises(folder_picker.PickerUnavailable):
            folder_picker.pick_folder(platform="darwin", run=FakeMacRun(None))

    def test_macos_preserves_the_root_path_and_ignores_a_missing_initial_folder(self):
        with tempfile.TemporaryDirectory() as directory:
            run = FakeMacRun("path:/")
            self.assertEqual(folder_picker.pick_folder(str(Path(directory) / "gone"), platform="darwin", run=run),
                             "/")
            self.assertEqual(run.env["PEACH_PICK_INITIAL"], "")

    def test_a_dialog_that_fails_to_open_is_reported_not_swallowed(self):
        with self.assertRaises(folder_picker.PickerUnavailable):
            folder_picker.pick_folder(platform="win32", run=FakeRun(b"", returncode=1, stderr=b"boom"))

    def test_a_dialog_program_that_cannot_start_means_no_picker_here(self):
        """找不到或起不来对话框程序是这台机器不提供，不是服务故障；锁照样放开。"""
        def missing(argv, **kwargs):
            raise FileNotFoundError(2, "No such file", argv[0])
        with self.assertRaises(folder_picker.PickerUnsupported):
            folder_picker.pick_folder(platform="win32", run=missing)
        self.assertFalse(folder_picker._LOCK.locked())

    def test_a_forgotten_dialog_does_not_hold_the_worker_forever(self):
        def hang(argv, **kwargs):
            raise subprocess.TimeoutExpired(argv, kwargs["timeout"])
        self.assertIsNone(folder_picker.pick_folder(platform="win32", run=hang))

    def test_only_one_dialog_opens_at_a_time(self):
        """系统对话框是模态的，第二个只会藏在第一个后面。"""
        with folder_picker._LOCK:
            with self.assertRaises(folder_picker.PickerBusy):
                folder_picker.pick_folder(platform="win32", run=FakeRun(b""))


if __name__ == "__main__":
    unittest.main()
