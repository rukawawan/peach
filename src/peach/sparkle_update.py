"""macOS 独立包经 Sparkle 2 在应用内更新（ADR-0130）。

Sparkle 在菜单栏进程的主线程里运行：检查、下载、EdDSA 校验与替换都由它完成，Peach 只在
安装前做两件 Windows 更新器也做的事——读取端不装需要迁移账本的版本，装之前让任务保存
进度并停掉自己拉起的服务。

`PUBLIC_ED_KEY` 为 None 时整套不启用：构建不写 `SUPublicEDKey`，菜单栏沿用版本检查加
DMG 下载。ad-hoc 签名下这把公钥无法轮换（ADR-0130），设置或更换都要先改 ADR。
"""
from __future__ import annotations

import logging
import plistlib
import sqlite3
import sys
from pathlib import Path
from typing import Callable

from . import distribution, interface_text


def _text(key: str, **params) -> str:
    """macOS 菜单栏的通知，跟本机语言（`tray.sparkle.<名字>` 与托盘共用的标题）。"""
    return interface_text.text(f"server:{key}", params, interface_text.local_language())

LOGGER = logging.getLogger(__name__)

FEED_URL = "https://downloads.peach.video/sparkle/macos-{architecture}.xml"
#: EdDSA 公钥（base64，32 字节），2026-11-02 生成；私钥在 GitHub `release` 环境的 secret 与维护者的离线备份里。
PUBLIC_ED_KEY: str | None = "iSagMtxBRMOuBVruHAWuSkhh/zwz+k5GC0p497nbMsM="
#: appcast 条目里新版本最高迁移号的元素名；Sparkle 以限定名为键放进 `propertiesDictionary`。
MIGRATION_HEAD = "peach:migrationHead"
MIGRATION_NAMESPACE = "https://peach.video/xml-namespaces/sparkle"


def info_plist_keys(architecture: str) -> dict:
    """构建写进 `Info.plist` 的 Sparkle 键；没有公钥时一个都不写。"""
    if PUBLIC_ED_KEY is None:
        return {}
    return {
        "SUFeedURL": FEED_URL.format(architecture=architecture),
        "SUPublicEDKey": PUBLIC_ED_KEY,
        "SUVerifyUpdateBeforeExtraction": True,
        # 显式写值，Sparkle 不再在第二次启动时弹窗询问；实际开关由设置页的自动更新映射。
        "SUEnableAutomaticChecks": True,
        # 自动下载后在退出时安装绕开了安装前的任务保护，第一版只做手动确认安装。
        "SUAllowsAutomaticUpdates": False,
    }


def framework_path() -> Path:
    return Path(getattr(sys, "_MEIPASS", "")) / "Sparkle.framework"


def available() -> bool:
    """独立包带着框架、`Info.plist` 也写了公钥时才启用。"""
    if sys.platform != "darwin" or not distribution.standalone():
        return False
    info = Path(sys.executable).resolve().parents[1] / "Info.plist"
    try:
        keys = plistlib.loads(info.read_bytes())
    except (OSError, plistlib.InvalidFileException):
        return False
    return bool(keys.get("SUPublicEDKey")) and (framework_path() / "Versions/B/Sparkle").is_file()


def migration_head(directory: Path) -> int:
    from .migrations import discover
    return max(int(migration.version) for migration in discover(directory))


def install_blocker(heads: list[str | None], config) -> str | None:
    """读取端不装需要迁移账本的版本；返回原因，可以装时返回 None。

    `heads` 是 appcast 各条目的 `peach:migrationHead`；取最大值，宁可多拦一次也不让读取端
    装上一个启动就要迁移的版本。
    """
    from .runtime_prepare import configured_ledger_writer
    database = config.directory("database") / "ledger.db"
    writer, reason = configured_ledger_writer(config, language=interface_text.local_language())
    if writer or not database.is_file():
        return None
    numbers = [int(head) for head in heads if isinstance(head, str) and head.isdigit()]
    if not numbers:
        return _text("tray.sparkle.noMigrationHead", reason=reason)
    connection = sqlite3.connect(database.resolve().as_uri() + "?mode=ro", uri=True)
    try:
        from .migrations import applied
        done = [int(version) for version in applied(connection)]
    finally:
        connection.close()
    if max(numbers) > max(done, default=0):
        return _text("tray.sparkle.needsMigration", reason=reason)
    return None


def prepare_install(database: Path, stop_services: Callable[[], None]) -> None:
    """让任务保存进度、释放端口。预约绑定本进程，菜单栏退出后自动失效，新版本启动后任务继续。"""
    from . import update_tasks
    if database.is_file():
        update_tasks.reserve(database)
        update_tasks.wait_quiescent(database)
    stop_services()


def scheduled_settings(preferences: dict) -> tuple[bool, float]:
    """设置页的自动更新偏好换成 Sparkle 的定时检查开关与间隔（秒）。"""
    return preferences.get("mode") != "off", float(preferences.get("interval_hours", 24)) * 3600


class Updater:
    """菜单栏持有的 Sparkle 更新器。委托必须由这里强引用：Sparkle 只弱引用委托。"""

    def __init__(self, controller, delegate):
        self.controller = controller
        self.delegate = delegate

    def check(self) -> None:
        self.controller.checkForUpdates_(None)

    def apply(self, preferences: dict) -> None:
        enabled, interval = scheduled_settings(preferences)
        updater = self.controller.updater()
        if bool(updater.automaticallyChecksForUpdates()) != enabled:
            updater.setAutomaticallyChecksForUpdates_(enabled)
        if updater.updateCheckInterval() != interval:
            updater.setUpdateCheckInterval_(interval)

    def follow(self, state_dir: Path) -> None:
        """从任意线程读设置页的自动更新偏好，回主线程交给 Sparkle；失败只记日志，不打断调用方的轮询。"""
        try:
            from Foundation import NSOperationQueue
            from .automatic_updates import AutomaticUpdates
            preferences = AutomaticUpdates(state_dir, available=True).read()
        except Exception:
            LOGGER.exception("Failed to read the automatic update preference")
            return

        def apply() -> None:
            # 主线程回调里的 Python 异常会变成 ObjC 异常，在这里收住。
            try:
                self.apply(preferences)
            except Exception:
                LOGGER.exception("Failed to sync the automatic update preference to Sparkle")

        NSOperationQueue.mainQueue().addOperationWithBlock_(apply)


def start(*, config: Callable[[], object], stop_services: Callable[[], None],
          notify: Callable[[str, str], None]) -> Updater | None:
    """在主线程创建更新器；不可用或初始化失败时返回 None，菜单栏沿用版本检查。"""
    if not available():
        return None
    try:
        import objc
        objc.loadBundle("Sparkle", {}, bundle_path=str(framework_path()))
        delegate = _delegate_class()(config, stop_services, notify)
        controller = objc.lookUpClass("SPUStandardUpdaterController").alloc() \
            .initWithStartingUpdater_updaterDelegate_userDriverDelegate_(True, delegate, delegate)
        return Updater(controller, delegate)
    except Exception:
        LOGGER.exception("Sparkle updater failed to initialize; the menu bar falls back to version checks")
        return None


def _delegate_class():
    """返回委托的构造函数。委托只在 macOS 上定义，避免其他平台导入 AppKit。

    方法签名不依赖协议元数据：返回对象或无返回值的方法用 pyobjc 默认签名，返回 BOOL 的
    方法逐个声明。拒绝安装走 `bestValidUpdateInAppcast:forUpdater:` 返回空条目，不用带
    `NSError **` 出参的方法。
    """
    import objc
    from Foundation import NSObject

    class SparkleDelegate(NSObject):
        # 回调里的 Python 异常会变成 ObjC 异常打断 Sparkle，每个回调都在这里收住并记日志。
        def bestValidUpdateInAppcast_forUpdater_(self, appcast, _updater):
            try:
                heads = [item.propertiesDictionary().get(MIGRATION_HEAD) for item in appcast.items()]
                reason = install_blocker(heads, self._config())
            except Exception as exc:
                LOGGER.exception("Ledger migration check for the update failed")
                reason = _text("tray.sparkle.checkFailed", error=exc)
            if reason is None:
                return None
            # 空条目让 Sparkle 按「没有可用更新」收尾，原因另用通知说明。
            self._notify(reason, _text("tray.title.versions"))
            return objc.lookUpClass("SUAppcastItem").emptyAppcastItem()

        def updater_willInstallUpdate_(self, _updater, _item):
            try:
                prepare_install(self._config().directory("database") / "ledger.db", self._stop)
            except Exception:
                # 预约失败（例如另一个安装在进行）时任务来不及保存进度；服务仍要停，否则新版本抢不到端口。
                LOGGER.exception("Failed to save task progress before installing")
                self._stop()

        def updaterWillRelaunchApplication_(self, _updater):
            try:
                self._stop()
            except Exception:
                LOGGER.exception("Failed to stop services before relaunching")

        @objc.typedSelector(b"Z@:")
        def supportsGentleScheduledUpdateReminders(self):
            return True

        @objc.typedSelector(b"v@:Z@@")
        def standardUserDriverWillHandleShowingUpdate_forUpdate_state_(self, handle, item, state):
            # 附件应用没有窗口可前置；定时检查到的更新用系统通知提醒一次。
            if not state.userInitiated():
                self._notify(_text("tray.sparkle.available", version=item.displayVersionString()),
                             _text("tray.title.versions"))

    def create(config, stop_services, notify):
        delegate = SparkleDelegate.alloc().init()
        delegate._config, delegate._stop, delegate._notify = config, stop_services, notify
        return delegate

    return create
