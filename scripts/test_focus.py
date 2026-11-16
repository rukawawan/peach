"""统一测试入口的定向调试；不签发正式验收记录。"""
from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path
from functools import partial

VITEST_SUITE = "test_frontend_build.VitestTests.test_the_island_suite_passes"


def _dev(key: str, **values) -> str:
    from peach.interface_text import dev
    return dev(key, **values)


def selection(root: Path, selectors: list[str], t=_dev) -> tuple[unittest.TestSuite, tuple[str, ...], tuple[str, ...]]:
    """定向选择器对应的用例；另返回要跑的浏览器文件与 vitest 文件（相对 `frontend/`）。
    `t` 渲染报错文字；运行器传自己的，好让输出跟本机语言而不是测试固定的源语言。"""
    suite = unittest.TestSuite()
    browsers = []
    islands = []
    names = []
    # pwsh -File 将 -Focus a,b 作为一个参数传入；交互式数组和重复 --focus 共用边界。
    for selector in dict.fromkeys(part.strip() for value in selectors for part in value.split(',')):
        if selector.startswith("frontend/e2e/") and selector.endswith(".test.ts"):
            path = (root / selector).resolve()
            if not path.is_relative_to((root / "frontend/e2e").resolve()) or not path.is_file():
                raise ValueError(t("test_focus.browserOutside", selector=selector))
            browsers.append(path.relative_to(root / "frontend").as_posix())
        elif selector.startswith("frontend/test/") and selector.endswith((".test.ts", ".test.tsx")):
            path = (root / selector).resolve()
            if not path.is_relative_to((root / "frontend/test").resolve()) or not path.is_file():
                raise ValueError(t("test_focus.vitestOutside", selector=selector))
            islands.append(path.relative_to(root / "frontend").as_posix())
        else:
            name = selector.removeprefix("tests/").removesuffix(".py")
            if not re.fullmatch(r"test_\w+(?:\.\w+)*", name, flags=re.ASCII) \
                    or not (root / "tests" / (name.split(".")[0] + ".py")).is_file():
                raise ValueError(t("test_focus.badSelector", selector=selector))
            names.append(name)
    if "e2e/setup.test.ts" in browsers:
        names.append("test_web_e2e.SetupE2ETests")
    if any(name != "e2e/setup.test.ts" for name in browsers):
        names.append("test_web_e2e.WebE2ESmokeTests")
    if islands:
        names.append(VITEST_SUITE)
    sys.path[:0] = [str(root), str(root / "tests")]
    try:
        for name in dict.fromkeys(names):
            suite.addTests(unittest.defaultTestLoader.loadTestsFromName(name))
    finally:
        del sys.path[:2]
    return suite, tuple(browsers), tuple(islands)


def run(runner, args) -> int:
    try:
        suite, browsers, islands = selection(runner.ROOT, args.focus, runner.t)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 2
    print(runner.t("test_focus.focusOnly"), flush=True)
    external = {}
    if browsers:
        external['test_web_e2e.py'] = ['frontend/' + name for name in browsers]
    if islands:
        external['test_frontend_build.py'] = ['frontend/' + name for name in islands]
    plan = {'external': external, 'focus': True}
    with runner.test_history.running():
        result = unittest.TextTestRunner(verbosity=2,
            resultclass=partial(runner.TimedResult, selection=plan)).run(suite)
    rows = result.results + runner.test_history.take_external()
    runner.test_history.append(runner.ROOT, scope="focus:" + " ".join(args.focus),
                               rows=rows, files=sorted(result.files))
    passed = result.wasSuccessful() and result.testsRun > 0
    if not passed and rows and getattr(args, "rerun_failures", False):
        passed = runner.rerun_failures(rows)
    return 0 if passed else 1
