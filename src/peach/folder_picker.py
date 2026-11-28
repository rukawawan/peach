"""让运行 Peach 的电脑弹出系统对话框，选取媒体目录或本机播放器。

浏览器自己拿不到本机绝对路径：`webkitdirectory` 只给相对名，File System Access API 只给
句柄。首启页和配置页要写的偏偏就是绝对路径。Peach 与浏览器在同一台机器上，所以由服务
进程代为弹窗：Windows 走 Shell 的 `IFileOpenDialog`（带地址栏、能直接粘路径的那种
选择框，`FOS_PICKFOLDERS`），macOS 从带本地化声明的应用包打开 AppKit 系统选择器。
两者均使用系统自带的工具。

调用方只在回环地址上开放这条路：否则局域网里任何人都能让这台电脑弹窗。

Windows 这里刻意用 `powershell.exe`（Windows PowerShell 5.1）：它在每台 Windows 上都有，
pwsh 7 是另装的。它按 `%SystemRoot%` 下的绝对路径启动，不依赖服务进程的 PATH。它自带的 `FolderBrowserDialog` 是 XP 时代的树形面板、没有地址栏，所以
用 `Add-Type` 编一段 COM 互操作直接调 `IFileOpenDialog`。脚本以 `-EncodedCommand` 传入，
避开引号与中文的转义。
"""
from __future__ import annotations

import base64
import ntpath
import os
import plistlib
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

from .appid import BUNDLE_PREFIX
from .user_messages import UserFacingError

__all__ = ["PickerBusy", "PickerUnavailable", "command", "pick_application", "pick_folder"]


class PickerUnavailable(UserFacingError, RuntimeError):
    """这台机器上没有可用的选择对话框，或者对话框没能打开。"""


class PickerUnsupported(PickerUnavailable):
    """当前平台不提供系统选择对话框。"""


class PickerBusy(UserFacingError, RuntimeError):
    """已经有一个对话框开着：系统对话框是模态的，第二个只会藏在第一个后面。"""


#: 一个用户一次只会看一个对话框；第二个请求直接拒绝，不排队。
_LOCK = threading.Lock()

#: 用户在对话框里翻多久都行，但进程不能被一个忘了关的窗口永久占住。
DIALOG_TIMEOUT_SECONDS = 15 * 60

#: 对话框标题的 code（ADR-0159）：对话框开在这台电脑上，跟本机语言。
PROMPT_CODE = "labels.folderPicker.prompt"


def prompt(code: str = PROMPT_CODE) -> str:
    from . import interface_text
    return interface_text.text(f"server:{code}", None, interface_text.local_language())

_MACOS_SCRIPT = """
ObjC.import("AppKit");

function run() {
    const env = $.NSProcessInfo.processInfo.environment;
    const value = key => ObjC.unwrap(env.objectForKey(key));
    const application = value("PEACH_PICK_APPLICATION") === "1";
    const initial = value("PEACH_PICK_INITIAL");
    const app = $.NSApplication.sharedApplication;
    app.setActivationPolicy($.NSApplicationActivationPolicyAccessory);

    const panel = $.NSOpenPanel.openPanel;
    panel.setMessage(value("PEACH_PICK_PROMPT"));
    panel.setCanChooseFiles(application);
    panel.setCanChooseDirectories(!application);
    if (application) {
        panel.setAllowedFileTypes(["app"]);
        panel.setDirectoryURL($.NSURL.fileURLWithPathIsDirectory("/Applications", true));
    } else if (initial) {
        panel.setDirectoryURL($.NSURL.fileURLWithPathIsDirectory(initial, true));
    }

    app.activateIgnoringOtherApps(true);
    const outcome = panel.runModal === $.NSModalResponseOK
        ? "path:" + ObjC.unwrap(panel.URL.path)
        : "cancelled";
    const saved = $.NSString.stringWithString(outcome).writeToFileAtomicallyEncodingError(
        value("PEACH_PICK_OUTPUT"), true, $.NSUTF8StringEncoding, null);
    if (!saved) throw Error("Could not save the picker result");
}
"""

#: `IFileOpenDialog` 的最小互操作：vtable 顺序必须与 shobjidl 一致，一个都不能少。
#: FOS_NOCHANGEDIR 0x8 不改进程工作目录，FOS_PICKFOLDERS 0x20 选文件夹，
#: FOS_FORCEFILESYSTEM 0x40 只允许真实路径（库、此电脑这类虚拟节点不能当结果）。
_WINDOWS_INTEROP = r"""
using System;
using System.Runtime.InteropServices;
namespace PeachPick {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct FileTypeFilter {
    public string Name;
    public string Pattern;
  }
  [ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"),
   InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IFileOpenDialog {
    [PreserveSig] int Show(IntPtr parent);
    void SetFileTypes(uint count, ref FileTypeFilter filterSpec);
    void SetFileTypeIndex(uint index);
    void GetFileTypeIndex(out uint index);
    void Advise(IntPtr events, out uint cookie);
    void Unadvise(uint cookie);
    void SetOptions(uint options);
    void GetOptions(out uint options);
    void SetDefaultFolder(IShellItem item);
    void SetFolder(IShellItem item);
    void GetFolder(out IShellItem item);
    void GetCurrentSelection(out IShellItem item);
    void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string name);
    void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string name);
    void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string title);
    void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string text);
    void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
    void GetResult(out IShellItem item);
    void AddPlace(IShellItem item, int placement);
    void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string extension);
    void Close(int hr);
    void SetClientGuid(ref Guid guid);
    void ClearClientData();
    void SetFilter(IntPtr filter);
    void GetResults(out IntPtr items);
    void GetSelectedItems(out IntPtr items);
  }
  [ComImport, Guid("43826d1e-e718-42ee-bc55-a1e261c37bfe"),
   InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IShellItem {
    void BindToHandler(IntPtr bindContext, ref Guid handlerId, ref Guid interfaceId, out IntPtr result);
    void GetParent(out IShellItem parent);
    void GetDisplayName(uint form, [MarshalAs(UnmanagedType.LPWStr)] out string name);
    void GetAttributes(uint mask, out uint attributes);
    void Compare(IShellItem other, uint hint, out int order);
  }
  [ComImport, Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")]
  public class FileOpenDialogRCW { }
  public static class Picker {
    [DllImport("user32.dll")]
    static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
    static extern IShellItem SHCreateItemFromParsingName(string path, IntPtr bindContext, ref Guid interfaceId);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr FindWindow(string className, string title);
    [DllImport("user32.dll")]
    static extern bool SetWindowPos(IntPtr window, IntPtr insertAfter, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr window);
    // The server runs in the background and Windows won't give it the foreground, so the dialog
    // would open behind the browser. Once its window appears, make it topmost (SetWindowPos to
    // HWND_TOPMOST needs no foreground rights); it goes away when the modal dialog closes.
    static void Raise(string title) {
      for (int attempt = 0; attempt < 200; attempt++) {
        var window = FindWindow("#32770", title);
        if (window != IntPtr.Zero) {
          SetWindowPos(window, new IntPtr(-1), 0, 0, 0, 0, 0x1 | 0x2 | 0x40);
          SetForegroundWindow(window);
          return;
        }
        System.Threading.Thread.Sleep(50);
      }
    }
    public static string Pick(string title, string initial, bool application) {
      var previousDpi = SetThreadDpiAwarenessContext(new IntPtr(-4));
      try {
      var dialog = (IFileOpenDialog)new FileOpenDialogRCW();
      if (application) {
        dialog.SetOptions(0x8 | 0x40 | 0x800 | 0x1000);
        var filter = new FileTypeFilter { Name = "*.exe", Pattern = "*.exe" };
        dialog.SetFileTypes(1, ref filter);
      } else {
        dialog.SetOptions(0x8 | 0x20 | 0x40);
      }
      dialog.SetTitle(title);
      if (!string.IsNullOrEmpty(initial) && System.IO.Directory.Exists(initial)) {
        var shellItem = typeof(IShellItem).GUID;
        try { dialog.SetFolder(SHCreateItemFromParsingName(initial, IntPtr.Zero, ref shellItem)); }
        catch (Exception) { }
      }
      new System.Threading.Thread(() => Raise(title)) { IsBackground = true }.Start();
      int outcome = dialog.Show(IntPtr.Zero);
      if (outcome == unchecked((int)0x800704C7)) return null;
      Marshal.ThrowExceptionForHR(outcome);
      IShellItem picked;
      dialog.GetResult(out picked);
      string path;
      picked.GetDisplayName(0x80058000, out path);
      return path;
      } finally {
        if (previousDpi != IntPtr.Zero) SetThreadDpiAwarenessContext(previousDpi);
      }
    }
  }
}
"""

#: 所有者窗口留空：Shell 自己会把新对话框放到前台；挂在一个透明置顶 Form 上的对话框
#: 反而跟着所有者一起不可见，进程就卡在 Show 里。
_WINDOWS_SCRIPT = """
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type -TypeDefinition @'
@INTEROP@
'@
$picked = [PeachPick.Picker]::Pick('@PROMPT@', $env:PEACH_PICK_INITIAL, @APPLICATION@)
if ($picked) { [Console]::Out.Write($picked) }
""".replace("@INTEROP@", _WINDOWS_INTEROP.strip())


def _windows_powershell() -> str:
    """系统目录里的 Windows PowerShell；服务进程的 PATH 可能缺了它，按名字查找会找不到。"""
    root = os.environ.get("SystemRoot")
    if not root:
        return "powershell.exe"
    return ntpath.join(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")


def command(initial: str | None, platform: str = sys.platform, *,
            application: bool = False) -> tuple[list[str], dict[str, str]]:
    """这个平台弹对话框的命令行，以及要附加的环境变量。"""
    title = prompt("labels.routesMedia.choosePlayer" if application else PROMPT_CODE)
    if platform == "win32":
        # 标题放进 PowerShell 单引号字符串：单引号写两次。
        script = _WINDOWS_SCRIPT.replace("@PROMPT@", title.replace("'", "''")).replace(
            "@APPLICATION@", "$true" if application else "$false")
        if application:
            initial = os.environ.get("ProgramFiles")
        encoded = base64.b64encode(script.encode("utf-16-le")).decode("ascii")
        argv = [_windows_powershell(), "-NoProfile", "-NonInteractive", "-STA", "-EncodedCommand", encoded]
        return argv, {"PEACH_PICK_INITIAL": initial or ""}
    errors = "errors.applicationPicker" if application else "errors.folderPicker"
    raise PickerUnsupported(f"{errors}.unsupportedSystem")


def pick_folder(initial: str | None = None, *, platform: str = sys.platform,
                run=subprocess.run) -> str | None:
    """弹对话框，返回选中的绝对路径；用户取消返回 None。"""
    return _pick(initial, platform, run, application=False)


def pick_application() -> str | None:
    """从系统文件选择器取得应用路径，取消时返回 None。"""
    return _pick(None, sys.platform, subprocess.run, application=True)


def _pick_macos(initial: str | None, application: bool, errors: str, run) -> str | None:
    title = prompt("labels.routesMedia.choosePlayer" if application else PROMPT_CODE)
    with tempfile.TemporaryDirectory(prefix="peach-picker-") as directory:
        root = Path(directory)
        bundle = root / "Peach Picker.app"
        output = root / "selection"
        # 裸 osascript 的主 bundle 只有英文，系统面板的侧栏和按钮会沿用英文。
        run(["/usr/bin/osacompile", "-o", str(bundle), "-l", "JavaScript", "-e", _MACOS_SCRIPT],
            capture_output=True, check=True, timeout=15)
        plist = bundle / "Contents" / "Info.plist"
        info = plistlib.loads(plist.read_bytes())
        info.update(CFBundleIdentifier=f"{BUNDLE_PREFIX}.picker", CFBundleDevelopmentRegion="en",
                    CFBundleLocalizations=["en", "zh-Hans"], CFBundleAllowMixedLocalizations=True,
                    LSUIElement=True)
        plist.write_bytes(plistlib.dumps(info))
        run(["/usr/bin/codesign", "--force", "--sign", "-", str(bundle)],
            capture_output=True, check=True, timeout=15)
        executable = bundle / "Contents" / "MacOS" / info["CFBundleExecutable"]
        env = {
            **os.environ,
            "PEACH_PICK_PROMPT": title,
            "PEACH_PICK_APPLICATION": "1" if application else "0",
            "PEACH_PICK_INITIAL": initial if initial and os.path.isdir(initial) else "",
            "PEACH_PICK_OUTPUT": str(output),
        }
        try:
            run([str(executable)], capture_output=True, check=True, env=env, timeout=DIALOG_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            return None
        if not output.is_file():
            raise PickerUnavailable(f"{errors}.failed")
        outcome = output.read_bytes().decode("utf-8")
    if outcome == "cancelled":
        return None
    if outcome.startswith("path:/"):
        return outcome.removeprefix("path:").rstrip("/") or "/"
    raise PickerUnavailable(f"{errors}.failed")


def _pick(initial: str | None, platform: str, run, *, application: bool) -> str | None:
    errors = "errors.applicationPicker" if application else "errors.folderPicker"
    if os.environ.get('PEACH_HEADLESS_MANAGED') == '1':
        raise PickerUnsupported(f"{errors}.headless")
    if not _LOCK.acquire(blocking=False):
        raise PickerBusy(f"{errors}.busy")
    try:
        if platform == "darwin":
            try:
                return _pick_macos(initial, application, errors, run)
            except (subprocess.SubprocessError, ValueError, plistlib.InvalidFileException) as exc:
                raise PickerUnavailable(f"{errors}.failed") from exc
        argv, extra = command(initial, platform, application=application)
        try:
            result = run(argv, capture_output=True, env={**os.environ, **extra}, timeout=DIALOG_TIMEOUT_SECONDS,
                         creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        except subprocess.TimeoutExpired:
            return None
        if result.returncode != 0:
            raise PickerUnavailable(f"{errors}.failed")
        return (result.stdout or b"").decode("utf-8", "replace").strip() or None
    except OSError as exc:
        raise PickerUnsupported(f"{errors}.cannotOpen") from exc
    finally:
        _LOCK.release()
