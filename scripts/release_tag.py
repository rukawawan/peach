"""版本号推进与版本标签：发布的唯一入口。

一次发布走两条命令，中间夹一次人的确认：

    python scripts/release_tag.py --bump auto --apply   # 推版本号、起草那一节
    #  → 人看一眼 `CHANGELOG.md` 新那一节的措辞，这是使用者唯一读到的说明
    python scripts/release_tag.py --ship --apply        # 提交、推送、等 CI、打标签，
                                                        # 制品齐了再把 README 直链换到新版本

确认点只有一个，剩下的判据都由脚本挡：`--ship` 拒绝夹带别的改动，拒绝在 Test 转绿前
打标签，中途停下再跑一次就接着走。人要决定的只是措辞对不对，不是流程走到哪一步了。

版本号只在这里动：每个 `X.Y.Z` 都对应一份可下载的制品，日常集成的提交由 commit
标识（ADR-0012）。
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
import time

if not __package__:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    __package__ = "scripts"
from . import changelog, github_release_candidate, version_bump

ROOT = Path(__file__).resolve().parents[1]
GITLAB = None

#: 主检出的 master 上该落提交的只有本脚本与 `agent_worktree.py integrate`。它们调用 git 时
#: 带上这个配置，`scripts/githooks/pre-commit` 据此放行，别的提交与手工 merge 一律拒收。
#: 它住在这里而不是 `agent_worktree`：`--verify-sha` 跟着 Release 工作流跑，那一步只有裸
#: Python，依赖要到后面的构建步骤才装；反过来引用就把 `test_evidence` 那条链（filelock）拘进来，
#: 标签推上去也发不出东西。
MASTER_WRITER = "peach.masterWriter"

#: 定版只该改这两份：版本号一行，变更日志一节。`--ship` 拒绝夹带别的文件。
#: README 下载直链不在其中：制品上传完之前换过去就是 404，它们等 Release 齐了单独提交。
RELEASE_FILES = (version_bump.VERSION_FILE, changelog.CHANGELOG)
README_SUBJECT = "docs(readme): 下载直链指向 {tag}"

#: `--ship` 等 Test 工作流的默认秒数上限，以及两次查询之间的间隔。版本提交的流水线里还有发布
#: 演练（macOS 两个架构从源码编译，作业时限 2 小时），所以按整条演练定。
TEST_TIMEOUT = 4 * 3600.0
TEST_POLL = 30.0
#: 任务排队多久仍没开始就判定等不到。空闲 runner 几秒内轮询接单，GitLab Runner 默认
#: 3 秒一轮，平台创建流水线也只要几秒；五分钟还没动静就不是正常排队，而是 runner
#: 不在线或一直被占着，继续等只会把总超时耗完。推送后迟迟没有 Test 记录也按这个数判。
STALL_SECONDS = 300.0


def command(*args: str, strip: bool = True) -> str:
    """`strip=False` 给首列本身就是空格的输出用：`git status --porcelain` 的第一行是
    ` M CHANGELOG.md`，整体 strip 会连状态列的空格一起吃掉，按列取路径就少一个字。"""
    output = subprocess.run(args, cwd=ROOT, check=True, capture_output=True,
                            text=True, encoding="utf-8").stdout
    return output.strip() if strip else output


def api(repo: str, endpoint: str):
    return json.loads(command("gh", "api", f"repos/{repo}/{endpoint}"))


def master_sha(repo: str) -> str:
    return GITLAB.master_sha(repo) if GITLAB else api(repo, "git/ref/heads/master")["object"]["sha"]


def remote_url(repo: str) -> str:
    return GITLAB.remote_url(repo) if GITLAB else f"https://github.com/{repo}.git"


def release_url(repo: str, tag: str) -> str:
    return GITLAB.release_url(repo, tag) if GITLAB else f"https://github.com/{repo}/releases/tag/{tag}"


def latest_run(runs: list[dict], sha: str) -> dict | None:
    """这个提交在 master 上最新的一次 Test；没有记录时是 None。"""
    matching = [run for run in runs if run.get("head_sha") == sha
                and run.get("head_branch") == "master" and run.get("event") == "push"]
    if not matching:
        return None
    return max(matching, key=lambda run: (run["id"], run.get("run_attempt", 1)))


def require_success(runs: list[dict], sha: str) -> dict:
    latest = latest_run(runs, sha)
    if latest is None:
        raise ValueError("此提交没有 master 的 Test 工作流记录")
    if latest.get("status") != "completed" or latest.get("conclusion") != "success":
        raise ValueError(f"此提交最新 Test 尚未通过：{latest.get('html_url', '')}")
    return latest


def test_runs(repo: str, sha: str) -> list[dict]:
    if GITLAB:
        return GITLAB.test_runs(repo, sha)
    endpoint = f"actions/workflows/test.yml/runs?head_sha={sha}&event=push&per_page=100"
    runs = api(repo, endpoint)["workflow_runs"]
    latest = latest_run(runs, sha)
    if latest is not None and latest.get("status") != "completed":
        latest["queued_jobs"] = github_queued_jobs(repo, latest["id"])
    return runs


def github_queued_jobs(repo: str, run_id: int) -> list[dict]:
    """GitHub 上排着队、没有 runner 接走的自建 runner 任务，字段与 GitLab 一侧一致。

    只看 `queued` 且没有 `runner_id` 的；`waiting` 是在等环境审批。托管 runner
    （`ubuntu-latest`、`macos-15` 这类）排队是平台容量问题，迟早会接，不在这里下结论。
    """
    jobs = api(repo, f"actions/runs/{run_id}/jobs?per_page=100")["jobs"]
    waiting = [job for job in jobs if job.get("status") == "queued" and not job.get("runner_id")
               and "self-hosted" in {label.lower() for label in job.get("labels") or ()}]
    if not waiting:
        return []
    try:
        # 列 runner 要仓库管理员权限；读不到就只按排队时长判断。
        runners = api(repo, "actions/runners?per_page=100")["runners"]
    except (subprocess.CalledProcessError, OSError, ValueError, KeyError):
        runners = None
    result = []
    for job in waiting:
        labels = {label.lower() for label in job["labels"]}
        matching = [runner for runner in runners or ()
                    if labels <= {item["name"].lower() for item in runner.get("labels") or ()}]
        if any(runner.get("status") == "online" for runner in matching):
            continue
        result.append({"id": job["id"], "name": job["name"], "tags": sorted(job["labels"]),
                       "queued": None, "runners": "offline" if matching else "unknown"})
    return result


def _stalled(queued: list[dict], first_seen: dict, now: float) -> list[str]:
    """排队任务里已经可以判定等不到的，每项一句说明。"""
    lines = []
    for job in queued:
        seen = first_seen.setdefault(job["id"], now)
        waited = max(job.get("queued") or 0.0, now - seen)
        tags = "、".join(job["tags"]) or "无"
        if job["runners"] == "offline":
            lines.append(f"{job['name']}（tags：{tags}）排队 {waited / 60:.0f} 分钟未开始，"
                         "带这些 tags 的 runner 都不在线或已暂停")
        elif waited >= STALL_SECONDS:
            lines.append(f"{job['name']}（tags：{tags}）排队 {waited / 60:.0f} 分钟未开始；"
                         "确认不了有没有带这些 tags 的在线 runner（列表要维护者权限，"
                         "共享 runner 也未必列出），runner 不在线或一直被占着都会这样")
    return lines


def await_test(repo: str, sha: str, *, timeout: float = TEST_TIMEOUT, poll: float = TEST_POLL,
               sleep=time.sleep, clock=time.monotonic) -> dict:
    """等这个提交的 Test 出结果。

    能确定等不到结果的立刻抛，不耗到超时：跑完了但不是绿的、必需任务已经失败的、
    任务排着队却没有 runner 能接的、推送后迟迟没有 Test 记录的。正常运行中的继续等，
    超时也抛。无论哪种，版本提交都已经在 master 上，处理好之后再跑一次
    `--ship --apply` 就接着走。
    """
    start = clock()
    deadline = start + timeout
    first_seen: dict = {}
    while True:
        runs = test_runs(repo, sha)
        latest = latest_run(runs, sha)
        now = clock()
        if latest is None:
            if now - start >= STALL_SECONDS:
                raise ValueError(
                    f"推送后 {(now - start) / 60:.0f} 分钟仍没有 {sha[:8]} 的 master Test 记录，"
                    "CI 没有被触发；检查流水线触发规则与项目的 CI 开关，"
                    "Test 跑起来后再跑一次 --ship --apply")
        elif latest.get("status") == "completed":
            return require_success(runs, sha)
        else:
            url = latest.get("html_url", "")
            if latest.get("failed_jobs"):
                raise ValueError(
                    f"{sha[:8]} 的 Test 必需任务已失败：{'、'.join(latest['failed_jobs'])}，"
                    f"整条流水线不会转绿：{url}；版本提交已在 master 上，"
                    "修好或重试这些任务、Test 转绿后再跑一次 --ship --apply")
            stalled = _stalled(latest.get("queued_jobs") or [], first_seen, now)
            if stalled:
                raise ValueError(
                    f"已等 {(now - start) / 60:.0f} 分钟，{sha[:8]} 的 Test 等不到结果：{'；'.join(stalled)}。"
                    f"{url}\n版本提交已在 master 上：启动对应 runner（或等它空出来）、"
                    "这些任务开始运行后，再跑一次 --ship --apply")
        if now >= deadline:
            raise ValueError(
                f"等了 {timeout / 60:.0f} 分钟，{sha[:8]} 的 Test 还没有结果；"
                "版本提交已在 master 上，等它跑完再跑一次 --ship --apply")
        sleep(poll)


def require_rehearsal(repo: str, sha: str, checked: dict, *, timeout: float = TEST_TIMEOUT,
                      poll: float = TEST_POLL, sleep=time.sleep, clock=time.monotonic) -> None:
    """版本提交的发布演练全部通过才打标签（ADR-0121）。

    GitGud 上演练就在版本提交自己的主线流水线里，Test 绿了以后再核对演练作业都在、都成功；
    GitHub 上演练是同一提交推送触发的 Release 工作流（不带标签时只构建、验收不发布），等它跑完。
    """
    if GITLAB:
        GITLAB.require_rehearsal(repo, checked["id"])
        return
    start = clock()
    while True:
        runs = api(repo, f"actions/workflows/release.yml/runs?head_sha={sha}&event=push&per_page=100")["workflow_runs"]
        latest = latest_run(runs, sha)
        now = clock()
        if latest is not None and latest.get("status") == "completed":
            if latest.get("conclusion") != "success":
                raise ValueError(f"版本提交的发布演练没有通过，不打标签：{latest.get('html_url', '')}")
            return
        if latest is None and now - start >= STALL_SECONDS:
            raise ValueError(f"推送后 {(now - start) / 60:.0f} 分钟仍没有 {sha[:8]} 的 Release 演练记录；"
                             "检查 release.yml 的触发条件，演练跑起来后再跑一次 --ship --apply")
        if now - start >= timeout:
            raise ValueError(f"等了 {timeout / 60:.0f} 分钟，{sha[:8]} 的发布演练还没有结果；"
                             "版本提交已在 master 上，演练跑完后再跑一次 --ship --apply")
        sleep(poll)


def verify(repo: str, sha: str) -> dict:
    if GITLAB:
        GITLAB.require_ancestor(repo, sha)
    else:
        comparison = api(repo, f"compare/master...{sha}")
        if comparison["status"] not in {"identical", "behind"}:
            raise ValueError("发布提交不属于远端 master 历史")
    checked = require_success(test_runs(repo, sha), sha)
    return {"sha": sha, "test": checked["html_url"]}


def _require_clean_master() -> None:
    if command("git", "status", "--porcelain"):
        raise ValueError("工作区不干净")
    if command("git", "branch", "--show-current") != "master":
        raise ValueError("请从 master 主检出执行")


def _require_free_tag(repo: str, tag: str) -> None:
    if GITLAB:
        GITLAB.require_free_tag(repo, tag)
        return
    # matching-refs 返回空列表代表不存在；网络或权限错误不能被当成空列表。
    if any(ref["ref"] == f"refs/tags/{tag}" for ref in api(repo, f"git/matching-refs/tags/{tag}")):
        raise ValueError(f"{tag} 已存在，不覆盖；发布新版本请先推进 __version__")


def require_clean_dependencies(root: Path = None) -> None:
    """标签前复核依赖审计：标签流水线第一件事就是同一套 npm 审计，新公布的高危漏洞
    会让已经打出去的标签什么也发不出。在打标签之前先查，有漏洞就不定版、不打标签。"""
    from . import npm_audit
    root = root or ROOT
    failed = [str(project.relative_to(root)) or "." for project in (root, root / "frontend")
              if npm_audit.audit(project) != 0]
    if failed:
        raise ValueError("依赖审计发现高危漏洞（" + "、".join(failed) + "）；先升级依赖再发布")


def require_release_notice(root: Path, version: str, part: str) -> None:
    """minor 及以上的版本必须先写好更新公告（`src/peach/release_notices.py`），升级后的弹窗靠它。

    补丁版可以不写：没有公告就不弹，只在设置页留记录。"""
    if part not in ("minor", "major"):
        return
    import ast
    tree = ast.parse((root / "src/peach/release_notices.py").read_text(encoding="utf-8"))
    notices = next(ast.literal_eval(node.value) for node in tree.body
                   if isinstance(node, ast.AnnAssign) and getattr(node.target, "id", "") == "NOTICES")
    if version not in notices:
        raise version_bump.VersionError(
            f"{version} 还没有更新公告：先在 src/peach/release_notices.py 写好这一版的新入口与自动进行的事")


def prepare(repo: str, part: str, *, apply: bool,
            reference_evidence: dict[str, Path] | None = None) -> dict:
    """为下一次发布推进版本号并起草变更日志。

    只写文件，不提交：变更日志的措辞要人过一遍，脚本自己提交等于鼓励不看。
    """
    _require_clean_master()
    planned = version_bump.plan_bump(ROOT, part)
    version = str(planned["version"])
    tag = f"v{version}"
    _require_free_tag(repo, tag)
    require_release_notice(ROOT, version, str(planned["bump"]))
    result = {**planned, "tag": tag, "repo": repo, "applied": apply}
    if not apply:
        return result
    require_clean_dependencies()
    from .release_review import review
    options = {"public_github": True} if GITLAB else {}
    if reference_evidence:
        options["reference_evidence"] = reference_evidence
    result["upstream_review"] = review(ROOT, repo, **options)
    version_bump.write_version(ROOT, str(planned["bump"]))
    changelog.release(ROOT, version, repo=repo, spec=str(planned["range"]))
    # 那一节原样带在输出里：确认措辞的人不该再去翻文件才知道自己在确认什么。
    result["section"] = changelog.section_of(
        (ROOT / changelog.CHANGELOG).read_text(encoding="utf-8"), version)
    result["next"] = [
        f"核对上面 {version} 那一节的措辞，它是使用者唯一读到的说明",
        "确认后跑 --ship --apply：提交、推送、等 Test 转绿、打标签一次做完",
    ]
    return result


def _require_master() -> None:
    if command("git", "branch", "--show-current") != "master":
        raise ValueError("请从 master 主检出执行")


def _pending_files() -> list[str]:
    """工作区里有改动的文件名，按 `git status --porcelain` 的第三列取。"""
    return sorted(line[3:].strip().strip('"')
                  for line in command("git", "status", "--porcelain", strip=False).splitlines()
                  if line.strip())


def _staged_release(repo: str) -> tuple[str, str, list[str]]:
    """定版是否成立：版本号、标签，以及等着提交的文件。

    四道判据一起看：在 master 上、变更日志有这一节、标签本地远端都空着、工作区除了
    那两份定版文件没有别的。最后一条是为了不把顺手改的东西夹进发布提交——发布提交
    是标签指向的那一个，夹带什么就等于发出去什么。
    """
    _require_master()
    version = version_bump.read_version(ROOT)
    tag = "v" + version
    document = (ROOT / changelog.CHANGELOG).read_text(encoding="utf-8")
    if not changelog.has_section(document, version):
        raise ValueError(f"{changelog.CHANGELOG} 缺少 {version} 一节；先用 --bump 起草再润色")
    changelog.require_labeled_entries(document, version)
    _require_free_tag(repo, tag)
    if command("git", "tag", "--list", tag):
        raise ValueError(f"本地 {tag} 已存在，请先检查它的归属")
    pending = _pending_files()
    if pending and pending != sorted(RELEASE_FILES):
        raise ValueError("工作区除了版本号与变更日志还有别的改动：" + "、".join(pending))
    return version, tag, pending


def ship(repo: str, *, apply: bool, timeout: float = TEST_TIMEOUT) -> dict:
    """把定好版的工作区一路送到标签：提交、推送、等 Test 转绿、打标签。

    每一步先看当下的状态再决定做不做，所以中途停下（网络断、CI 还在跑、超时）再跑一次
    就接着走：已提交的不重提，已推送的不重推，Test 没绿绝不打标签。
    """
    version, tag, pending = _staged_release(repo)
    head = command("git", "rev-parse", "HEAD")
    remote = master_sha(repo)
    result = {"version": version, "tag": tag, "repo": repo, "applied": apply,
              "commit": bool(pending), "push": bool(pending) or remote != head}
    if not apply:
        return result
    if pending:
        command("git", "add", *RELEASE_FILES)
        command("git", "-c", f"{MASTER_WRITER}=release", "commit",
                "-m", f"chore(release): 版本 {version}")
    sha = command("git", "rev-parse", "HEAD")
    if master_sha(repo) != sha:
        command("git", "push", remote_url(repo), "refs/heads/master")
    checked = await_test(repo, sha, timeout=timeout)
    require_rehearsal(repo, sha, checked, timeout=timeout)
    require_clean_dependencies()
    command("git", "tag", "-a", tag, sha, "-m", f"Peach {tag} Windows 测试版")
    command("git", "push", remote_url(repo), f"refs/tags/{tag}")
    readme = point_readme(repo, apply=True, timeout=timeout)
    return {**result, "sha": sha, "test": checked["html_url"],
            "release": release_url(repo, tag), "readme": readme["readme"]}


def release_assets(repo: str, tag: str) -> set[str]:
    """这个标签的 GitHub Release 已上传完的制品名；Release 还没建或仍是草稿时为空。"""
    try:
        release = api(repo, f"releases/tags/{tag}")
    except subprocess.CalledProcessError:
        return set()
    if release.get("draft"):
        return set()
    return {asset["name"] for asset in release.get("assets") or ()
            if asset.get("state") == "uploaded"}


def point_readme(repo: str, *, apply: bool, timeout: float = TEST_TIMEOUT, poll: float = TEST_POLL,
                 sleep=time.sleep, clock=time.monotonic) -> dict:
    """等这一版 README 直链要下载的制品都上传完，再把直链换过去、提交并推送 master。

    `--ship` 打完标签后接着跑；中途停下就单独跑 `--point-readme --apply`，已换的不重换，
    已提交未推送的只补推送。等待期间 README 仍指向上一版，读者拿到的始终是能下载的链接。
    """
    _require_master()
    version = version_bump.read_version(ROOT)
    tag = "v" + version
    pending = _pending_files()
    if not set(pending) <= set(version_bump.README_FILES):
        raise ValueError("工作区除了 README 还有别的改动：" + "、".join(pending))
    names = version_bump.readme_assets(ROOT, version)
    if not names:
        raise ValueError("README 里没有 Release 下载直链")
    result = {"version": version, "tag": tag, "assets": names, "applied": apply, "readme": []}
    if not apply:
        return result
    start = clock()
    while missing := sorted(set(names) - release_assets(repo, tag)):
        if clock() - start >= timeout:
            raise ValueError(f"等了 {timeout / 60:.0f} 分钟，{tag} 的 Release 仍缺 {'、'.join(missing)}；"
                             "README 仍指向上一版，制品齐了以后跑 --point-readme --apply")
        sleep(poll)
    changed = version_bump.point_readmes(ROOT, version)
    subject = README_SUBJECT.format(tag=tag)
    if changed or pending:
        command("git", "add", *version_bump.README_FILES)
        command("git", "-c", f"{MASTER_WRITER}=release", "commit", "-m", subject)
    head = command("git", "rev-parse", "HEAD")
    # HEAD 是这次的 README 提交才推送；中断后 master 上又落了别的提交，就交给集成方推送。
    if command("git", "log", "-1", "--format=%s", head) == subject and master_sha(repo) != head:
        command("git", "push", remote_url(repo), "refs/heads/master")
    return {**result, "readme": changed}


def plan(repo: str) -> dict:
    _require_clean_master()
    sha = command("git", "rev-parse", "HEAD")
    if master_sha(repo) != sha:
        raise ValueError("本地 HEAD 与发布平台 master 不一致，请先完成同步")
    version = version_bump.read_version(ROOT)
    tag = "v" + version
    document = (ROOT / changelog.CHANGELOG).read_text(encoding="utf-8")
    if not changelog.has_section(document, version):
        raise ValueError(f"{changelog.CHANGELOG} 缺少 {version} 一节；先用 --bump 起草再润色")
    _require_free_tag(repo, tag)
    if command("git", "tag", "--list", tag):
        raise ValueError(f"本地 {tag} 已存在，请先检查它的归属")
    return {**verify(repo, sha), "tag": tag, "repo": repo}


def plan_commit(repo: str, sha: str) -> dict:
    """发布明确选定的主线提交，版本与说明均取自这个提交。"""
    _require_clean_master()
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("--release-sha 必须是完整的 40 位提交 SHA")
    if command("git", "rev-parse", f"{sha}^{{commit}}") != sha:
        raise ValueError("--release-sha 必须指向提交对象")
    text = command("git", "show", f"{sha}:{version_bump.VERSION_FILE}")
    match = version_bump.VERSION_PATTERN.search(text)
    if match is None:
        raise ValueError("选定提交没有有效的 __version__")
    version = ".".join(match.group(index) for index in (2, 3, 4))
    document = command("git", "show", f"{sha}:{changelog.CHANGELOG}")
    if not changelog.has_section(document, version):
        raise ValueError(f"选定提交的 {changelog.CHANGELOG} 缺少 {version} 一节")
    changelog.require_labeled_entries(document, version)
    tag = f"v{version}"
    _require_free_tag(repo, tag)
    if command("git", "tag", "--list", tag):
        raise ValueError(f"本地 {tag} 已存在，请先检查它的归属")
    return {**verify(repo, sha), **require_candidate(repo, sha), "tag": tag, "version": version,
            "repo": repo, "section": changelog.section_of(document, version)}


def require_candidate(repo: str, sha: str) -> dict:
    """补打标签沿用标签工作流的晋级判据，取不到演练产物时不留下无法发布的标签。"""
    if GITLAB:
        return {}
    run = github_release_candidate.select(repo, sha)
    return {"rehearsal": f"https://github.com/{repo}/actions/runs/{run['run_id']}"}


def main(argv=None) -> int:
    global GITLAB
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default="peach-mitao/peach")
    parser.add_argument("--gitlab-host", help="使用此 GitLab 主机发布，例如 gitgud.io；默认使用 GitHub")
    parser.add_argument("--reference-evidence", action="append", default=[], metavar="SOURCE=FILE",
                        help="为 --bump 明确提供本次参考正文，报告保留用户取证渠道")
    parser.add_argument("--apply", action="store_true",
                        help="真的动手：带 --bump 时写版本号与变更日志，带 --ship 时走完发布，"
                             "都不带时创建并推送标签")
    parser.add_argument("--timeout", type=float, default=TEST_TIMEOUT,
                        help=f"--ship 等 Test 工作流的秒数上限，默认 {TEST_TIMEOUT:.0f}")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--bump", choices=("auto", "patch", "minor", "major"),
                      help="推进 __version__ 并起草变更日志，为下一次发布做准备")
    mode.add_argument("--ship", action="store_true",
                      help="把定好版的工作区送到标签：提交、推送、等 Test 转绿、打标签")
    mode.add_argument("--point-readme", action="store_true",
                      help="当前版本的 Release 制品齐了以后，把 README 下载直链换过去并推送 master")
    mode.add_argument("--verify-sha", help="仅核对指定提交的主线归属与 CI，供 Release 工作流使用")
    mode.add_argument("--release-sha", help="为完整 SHA 指定的已通过 CI 的主线提交补打标签")
    args = parser.parse_args(argv)
    try:
        from .release_forge import GitLabForge
        GITLAB = GitLabForge(args.gitlab_host, command) if args.gitlab_host else None
        if args.reference_evidence and not args.bump:
            raise ValueError("--reference-evidence 仅用于 --bump 的参考检查")
        if args.verify_sha:
            print(json.dumps(verify(args.repo, args.verify_sha), ensure_ascii=False, indent=2))
            return 0
        if args.bump:
            from .release_review import local_reference_files
            options = ({"reference_evidence": local_reference_files(args.reference_evidence)}
                       if args.reference_evidence else {})
            print(json.dumps(prepare(args.repo, args.bump, apply=args.apply, **options),
                             ensure_ascii=False, indent=2))
            return 0
        if args.ship:
            print(json.dumps(ship(args.repo, apply=args.apply, timeout=args.timeout),
                             ensure_ascii=False, indent=2))
            return 0
        if args.point_readme:
            print(json.dumps(point_readme(args.repo, apply=args.apply, timeout=args.timeout),
                             ensure_ascii=False, indent=2))
            return 0
        result = (plan_commit(args.repo, args.release_sha)
                  if args.release_sha is not None else plan(args.repo))
        if args.apply:
            # 固定提交在动手前复核归属、CI、版本说明与标签占用。
            if args.release_sha is not None:
                result = plan_commit(args.repo, args.release_sha)
            elif master_sha(args.repo) != result["sha"]:
                raise ValueError("检查期间 master 已更新，请重新执行")
            command("git", "tag", "-a", result["tag"], result["sha"],
                    "-m", f"Peach {result['tag']} Windows 测试版")
            command("git", "push", remote_url(args.repo),
                    f"refs/tags/{result['tag']}")
            result["next"] = "Release 制品上传完以后跑 --point-readme --apply，把 README 下载直链换到这一版"
        print(json.dumps({**result, "applied": args.apply}, ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError, version_bump.VersionError, subprocess.CalledProcessError) as exc:
        detail = exc.stderr if isinstance(exc, subprocess.CalledProcessError) else str(exc)
        print(f"发布检查未通过：{detail}")
        return 1
    finally:
        GITLAB = None


if __name__ == "__main__":
    raise SystemExit(main())
