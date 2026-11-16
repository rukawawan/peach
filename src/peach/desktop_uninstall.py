"""独立 Windows 安装的卸载计划与托盘退出后的系统清理助手。"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

from filelock import FileLock

from . import desktop_installer, desktop_startup, distribution, settings_file, standalone_update
from .fsutil import atomic_write_text
from .user_messages import UserFacingError, UserValueError, message_fields


#: Peach 生成的设置备份：`config.toml.<说明>-YYYYMMDD-HHMMSS`，时间戳跟着
#: `scripts` 与 `cli.py` 里同一个 `%Y%m%d-%H%M%S`。
_GENERATED_BACKUP = re.compile(r"config\.toml\.[A-Za-z0-9._-]*?-\d{8}-\d{6}")


def _generated_backups(root: Path) -> list[Path]:
    """Peach 数据目录里由 Peach 自己写下的设置备份。

    `config.toml.bak` 是 `docs/OPERATIONS.md` 教用户在升级前自己复制的一份，删掉它
    等于把回退的路一起删了；只认带时间戳的那种形态，其它未列名文件同样保留。
    """
    return [path.resolve() for path in root.glob("config.toml.*")
            if _GENERATED_BACKUP.fullmatch(path.name)
            and (path.is_file() or path.is_symlink())]


def plan(config, *, delete_data: bool, program: Path | None = None) -> dict:
    if type(delete_data) is not bool:
        raise UserValueError("errors.desktopUninstall.deleteDataChoiceRequired")
    target = (program or Path(sys.executable).parent).resolve()
    root = config.data_root.resolve()
    if not (target / "_internal/standalone.txt").is_file() or not (target / "Peach.exe").is_file():
        raise UserValueError("errors.desktopUninstall.sourceInstall")
    if len(target.parts) < 3 or target == Path.home().resolve() or (target / ".git").exists():
        raise UserValueError("errors.desktopUninstall.programDirectoryUnsuitable")
    if root.is_relative_to(target) or target.is_relative_to(root):
        raise UserValueError("errors.desktopUninstall.programDataOverlap")
    directories = [config.directory(key).resolve() for key in settings_file.DIRECTORY_KEYS] if delete_data else []
    if any(path.parent != root or path.is_symlink() or path.is_junction() for path in directories):
        raise UserValueError("errors.desktopUninstall.externalDataDirectories")
    media = [Path(value).resolve() for group in (config.locations, config.mounts) for rows in group.values() for value in rows]
    for path in [target, *directories]:
        if any(item.is_relative_to(path) or path.is_relative_to(item) for item in media):
            raise UserValueError("errors.desktopUninstall.mediaOverlap")
    files: list[Path] = []
    if delete_data:
        generated = [config.path.resolve(), root / "config.previous.toml", root / "config.pending.toml",
                     root / "config.pre-media-identity.toml"]
        generated.extend(_generated_backups(root))
        files = sorted(set(generated), key=lambda path: os.path.normcase(str(path)))
    return {"program": str(target), "data_root": str(root), "directories": [str(p) for p in directories],
            "files": [str(p) for p in files], "delete_data": delete_data}


def snapshot(config) -> dict:
    result = {"available": False, **message_fields("labels.desktopUninstall.manual"), "data_root": str(config.data_root),
              "directories": [str(config.directory(key)) for key in settings_file.DIRECTORY_KEYS], "full_available": False}
    if sys.platform == "darwin" and distribution.standalone():
        # macOS 应用按系统惯例拖进废纸篓卸载，不另做卸载器；LaunchAgent 不随应用删除，要先关掉。
        result.update(message_fields("labels.desktopUninstall.macos"))
    if sys.platform != "win32":
        return result
    try:
        if not distribution.standalone():
            raise UserValueError("errors.desktopUninstall.sourceInstallStartup")
        plan(config, delete_data=False)
        result.update(available=True, message="", message_code="", message_params={})
        try:
            plan(config, delete_data=True)
            result["full_available"] = True
        except ValueError as exc:
            result.update(_reason(exc))
    except ValueError as exc:
        result.update(_reason(exc))
    return result


def _reason(error: ValueError) -> dict:
    """卸载不可用的原因：带 code 的照搬，别的照原文。"""
    if isinstance(error, UserFacingError):
        return message_fields(error.code, error.params)
    return {"message": str(error), "message_code": "", "message_params": {}}


def request(config, delete_data: bool) -> dict:
    if not distribution.standalone() or sys.platform != "win32":
        current = snapshot(config)
        if current.get("message_code"):
            raise UserValueError(current["message_code"], current.get("message_params"))
        raise ValueError(current["message"])
    if standalone_update.public().get("state") in standalone_update.ACTIVE | {"ready"}:
        raise UserValueError("errors.desktopUninstall.updateRunning")
    data = plan(config, delete_data=delete_data)
    path = config.directory("state") / "uninstall-request.json"
    with FileLock(str(path) + ".lock", timeout=0):
        atomic_write_text(path, json.dumps(dict(data, requested_at=time.time())), mode=0o600)
    return {"accepted": True, **message_fields("labels.desktopUninstall.accepted")}


# 系统助手从 stdin 接受数据，路径不拼进脚本文本；只清理计划中的目录。
# `quiet` 只在测试里置真：跳过弹窗，错误改走日志文件。`log` 同样只在测试里给，
# 把失败日志引到用例自己的临时目录：写死临时目录那一个名字的话，并发的两个用例会
# 读到对方的行，清理还会动到这台机器上真卸载留下的那一份。
_SCRIPT = r"""
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
$peachJob = [Console]::In.ReadToEnd() | ConvertFrom-Json
$peachProgram = [IO.Path]::GetFullPath($peachJob.program)
$peachData = [IO.Path]::GetFullPath($peachJob.data_root)
if (-not (Test-Path -LiteralPath (Join-Path $peachProgram '_internal/standalone.txt'))) { exit 2 }
if ($peachProgram.Length -lt 4 -or $peachProgram -eq $env:USERPROFILE) { exit 2 }
$peachProcess = if ($peachJob.pid) { Get-Process -Id $peachJob.pid -ErrorAction SilentlyContinue }
if ($peachProcess -and -not $peachProcess.WaitForExit(90000)) { exit 3 }
foreach ($peachPath in @($peachJob.directories) + @($peachJob.files)) {
  if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($peachPath)) -ne $peachData) { exit 2 }
}
if ($peachJob.installer_key -and $peachJob.installer_key -notmatch '^Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\\{[0-9A-F-]{36}\}_is1$') { exit 2 }
if ($peachJob.installer_menu -and [IO.Path]::GetFileName($peachJob.installer_menu) -ne 'Peach.lnk') { exit 2 }
function Stop-PeachProgramProcesses {
  # A server killed when the tray quits leaves its child processes behind; scanning and
  # transcoding executables may live under `_internal`. Clear them by image path, matching only
  # the program directory prefix plus a separator so similarly named folders are untouched.
  # Reading `Path` opens the process and enumerates all its modules; doing that for 700+
  # processes takes over seven seconds, and deletion retries clear again. The process name is
  # the image name without `.exe`, so first keep only processes named like an `.exe` in the
  # program directory (`$peachImageNames`) and read just their paths.
  # Each `Path` read queries the process again: reading it twice (null check, prefix check)
  # can see Null if the process exits in between. Read it once.
  $peachStrays = @(Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $peachImageNames.Contains($_.ProcessName)
  } | Where-Object {
    $peachImage = $_.Path
    $peachImage -and $peachImage.StartsWith($peachProgram + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
  })
  foreach ($peachStray in $peachStrays) {
    Stop-Process -Id $peachStray.Id -Force -ErrorAction SilentlyContinue
  }
  foreach ($peachStray in $peachStrays) {
    Wait-Process -Id $peachStray.Id -Timeout 10 -ErrorAction SilentlyContinue
  }
}
try {
  function Test-PeachTree($peachNode) {
    $peachItem = Get-Item -LiteralPath $peachNode -Force
    if ($peachItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw ($peachJob.text.linkInside + $peachNode) }
    if ($peachItem.PSIsContainer) {
      foreach ($peachChild in Get-ChildItem -LiteralPath $peachNode -Force) { Test-PeachTree $peachChild.FullName }
    }
  }
  foreach ($peachPath in @($peachJob.directories) + @($peachJob.files) + @($peachProgram)) {
    if (Test-Path -LiteralPath $peachPath) { Test-PeachTree $peachPath }
  }
  # Collect names after the link check: a link in the program tree has already thrown, so the
  # recursion can't leave the program directory.
  $peachImageNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($peachExecutable in Get-ChildItem -LiteralPath $peachProgram -Recurse -Force -File -Filter '*.exe') {
    [void]$peachImageNames.Add($peachExecutable.BaseName)
  }
  Stop-PeachProgramProcesses
  foreach ($peachPath in @($peachJob.directories) + @($peachJob.files) + @($peachProgram)) {
    for ($peachAttempt = 3; $peachAttempt -gt 0; $peachAttempt--) {
      if (-not (Test-Path -LiteralPath $peachPath)) { break }
      try {
        $peachItem = Get-Item -LiteralPath $peachPath -Force
        if ($peachItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw ($peachJob.text.isLink + $peachPath) }
        Remove-Item -LiteralPath $peachPath -Recurse -Force
        break
      } catch {
        if ($peachAttempt -le 1) { throw ($peachJob.text.deleteFailed + $peachPath + $peachJob.text.separator + $_.Exception.Message) }
        Stop-PeachProgramProcesses
        Start-Sleep -Seconds 2
      }
    }
  }
  if ($peachJob.delete_data -and (Test-Path -LiteralPath $peachData) -and -not (Get-ChildItem -LiteralPath $peachData -Force | Select-Object -First 1)) {
    Remove-Item -LiteralPath $peachData
  }
  # An installer-installed program also has an Apps & features entry and a Start menu item, both
  # pointing at nothing once the program directory is gone. Remove the Start menu item only while
  # it still points at this program directory: one with the same name may belong to another install.
  if ($peachJob.installer_key) {
    Remove-Item -LiteralPath ('HKCU:\' + $peachJob.installer_key) -Recurse -Force -ErrorAction SilentlyContinue
  }
  if ($peachJob.installer_menu -and (Test-Path -LiteralPath $peachJob.installer_menu)) {
    $peachMenuTarget = (New-Object -ComObject WScript.Shell).CreateShortcut($peachJob.installer_menu).TargetPath
    if ($peachMenuTarget -and $peachMenuTarget.StartsWith($peachProgram + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
      Remove-Item -LiteralPath $peachJob.installer_menu -Force
    }
  }
} catch {
  $peachReason = $_.Exception.Message
  # The dialog shows only the reason; the log also records the failing line, because a bare
  # "cannot call a method on a null-valued expression" doesn't say which step failed.
  $peachWhere = $_.InvocationInfo.PositionMessage
  $peachLog = if ($peachJob.log) { $peachJob.log } else { Join-Path ([IO.Path]::GetTempPath()) 'peach-uninstall.log' }
  $peachDetail = $peachJob.text.reason + $peachReason
  try {
    Add-Content -LiteralPath $peachLog -Value ((Get-Date -Format s) + '  ' + $peachReason + [Environment]::NewLine + $peachWhere) -Encoding UTF8
    $peachDetail += [Environment]::NewLine + $peachJob.text.logged + $peachLog
  } catch { }
  if (-not $peachJob.quiet) {
    [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
    [System.Windows.Forms.MessageBox]::Show($peachJob.text.incomplete + [Environment]::NewLine + $peachProgram + [Environment]::NewLine + $peachData + [Environment]::NewLine + $peachDetail, 'Peach') | Out-Null
  }
  exit 1
}
"""


def script_text() -> dict[str, str]:
    """卸载脚本的报错与弹窗文字（`tray.uninstallScript.<名字>`），跟本机语言，经 stdin 交给脚本。"""
    from . import interface_text
    language = interface_text.local_language()
    return {name: interface_text.text(f"server:tray.uninstallScript.{name}", None, language)
            for name in ("linkInside", "isLink", "deleteFailed", "separator", "reason", "logged", "incomplete")}


def poll(tray) -> None:
    if not distribution.standalone() or sys.platform != "win32":
        return
    config = settings_file.load_config()
    path = config.directory("state") / "uninstall-request.json"
    if not path.is_file() or not tray._action_lock.acquire(blocking=False):
        return
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if time.time() - data["requested_at"] > 120:
            path.unlink()
            return
        checked = plan(config, delete_data=data["delete_data"])
        if any(data.get(key) != value for key, value in checked.items()):
            raise UserValueError("errors.desktopUninstall.configChanged")
        shell = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32/WindowsPowerShell/v1.0/powershell.exe"
        # 桌面图标和启动项都在 Peach 数据目录之外，`_SCRIPT` 的路径校验只认 Peach 数据目录里的东西，
        # 列进 `files` 会被它 `exit 2`。卸载前先由这一步把两个 `.lnk` 都撤掉。
        desktop_startup.save(config, enabled=False, silent=True, desktop=False)
        process = subprocess.Popen([str(shell), "-NoProfile", "-NonInteractive", "-EncodedCommand",
                                    base64.b64encode(_SCRIPT.encode("utf-16-le")).decode("ascii")],
                                   stdin=subprocess.PIPE, creationflags=subprocess.CREATE_NO_WINDOW)
        job = dict(checked, pid=os.getpid(), text=script_text())
        if desktop_installer.installed(Path(checked["program"])):
            job.update(installer_key=desktop_installer.UNINSTALL_KEY,
                       installer_menu=str(desktop_installer.menu_shortcut()))
        process.stdin.write(json.dumps(job).encode("utf-8"))
        process.stdin.close()
        path.unlink()
        tray.exit(reason="uninstall")
    except Exception as exc:
        path.unlink(missing_ok=True)
        from . import interface_text
        from .user_messages import nested_message
        tray.icon.notify(interface_text.text("server:tray.uninstallFailed", {"error": nested_message(exc)},
                                             interface_text.local_language()), "Peach")
    finally:
        tray._action_lock.release()
