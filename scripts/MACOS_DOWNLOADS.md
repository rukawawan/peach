---
kind: howto
---

### macOS 测试包

Apple Silicon 下载文件名含 `macos-arm64.dmg` 的安装镜像；Intel 下载含 `macos-x86_64.dmg` 的安装镜像。在「关于本机」中查看芯片或处理器。打开镜像，将 Peach 拖入「应用程序」，再打开应用完成首次设置。提示「已损坏，无法打开」时，在终端执行 `sudo /usr/bin/xattr -rd com.apple.quarantine "/Applications/Peach.app"` 后重新打开。提示输入密码时，输入这台 Mac 的登录密码；输入过程中屏幕不显示字符。这条命令只移除 Peach 的隔离标记；手动拖入新版本后需要再运行一次，经应用内更新安装的新版本不需要。

应用内置 Python，可独立运行；单机使用不依赖 Windows。测试包使用 ad-hoc 签名，尚未完成 Developer ID 签名与 Apple 公证。媒体工具需另行准备。菜单栏「版本与更新」>「检查更新」经 Sparkle 下载、校验并安装本机架构的新版本；还在用 0.53.0 及更早版本的，先手动安装一次带应用内更新的版本。配置页「检查更新」仍给出新版 DMG 的下载键。系统版本下限以包内 `LSMinimumSystemVersion` 为准。

安装、来源挂载与双机复制见 [macOS 使用说明](https://github.com/peach-mitao/peach/blob/master/docs/OPERATIONS.md#macos-独立测试包)。各架构的原生构建、镜像挂载与独立运行通过后，两个 DMG 才会随同一 Release 上传；哈希包含在 `SHA256SUMS.txt`。
