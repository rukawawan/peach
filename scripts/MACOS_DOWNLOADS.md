---
kind: howto
---

### macOS 首次安装

不确定选哪个 DMG，在「关于本机」看芯片：Apple M 系列选 Apple Silicon，Intel 处理器选 Intel。打开 DMG，把 Peach 拖进「应用程序」，再打开应用完成首次设置。

安装包使用 ad-hoc 签名，还没有完成 Apple 公证。提示「已损坏，无法打开」时，在终端执行 `sudo /usr/bin/xattr -rd com.apple.quarantine "/Applications/Peach.app"` 后重新打开；要求输入的是这台 Mac 的登录密码，输入时屏幕不显示字符。这条命令只移除 Peach 的隔离标记。手动拖入新版本后要再执行一次，经应用内更新安装的不需要。

系统版本下限以包内 `LSMinimumSystemVersion` 为准。来源挂载与双机复制见 [macOS 使用说明](https://github.com/peach-mitao/peach/blob/master/docs/OPERATIONS.md#macos-独立测试包)。
