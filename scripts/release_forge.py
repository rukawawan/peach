"""GitLab 发布的主线与流水线判据；认证和 HTTP 传输复用 glab。"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote, urlencode
from urllib.request import Request

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from peach.interface_text import dev as t
from peach.user_agent import USER_AGENT
from peach.peach_proxy import read_url


REQUIRED_TEST_JOBS = frozenset({"verify-linux", "verify-windows", "verify-macos", "wheel-smoke"})
#: 版本提交的主线流水线里演练的标签作业（ADR-0121）：全部成功才打标签。规则没匹配上、演练没跑，
#: 也不能当作通过。三平台验收是必需任务，演练规则在版本提交上把它们改成全量。
REHEARSAL_JOBS = frozenset({"windows-media", "build-windows", "build-macos", "smoke-windows", "docker-build", "seal-release"})
TERMINAL_STATUSES = frozenset({"success", "failed", "canceled", "skipped"})
#: 必需任务落在这些状态时，整条流水线等多久都不会转绿；重试会生成同名的新任务。
RED_JOB_STATUSES = frozenset({"failed", "canceled"})


class GitLabForge:
    def __init__(self, host: str, command):
        if not re.fullmatch(r"[a-zA-Z0-9.-]+(?::[0-9]+)?", host):
            raise ValueError(t("release_forge.badHost"))
        self.host = host
        self.command = command

    def api(self, repo: str, endpoint: str, *, public: bool = True):
        """`public=False` 给只有维护者凭据才读得到的端点：匿名重试注定再被拒，直接抛出。"""
        executable = os.environ.get("PEACH_GLAB") or shutil.which("glab")
        if not executable:
            raise ValueError(t("release_forge.glabRequired"))
        path = f"projects/{quote(repo, safe='')}/{endpoint}"
        try:
            return json.loads(self.command(executable, "api", "--hostname", self.host,
                                           "--method", "GET", path))
        except subprocess.CalledProcessError as error:
            if not public or not any(status in (error.stderr or "") for status in ("401", "403")):
                raise
            # 公开项目的只读元数据可匿名取得，不扩大本机细粒度凭据权限。
            request = Request(f"https://{self.host}/api/v4/{path}",
                              headers={"Accept": "application/json", "User-Agent": USER_AGENT})
            return json.loads(read_url(request.full_url, headers=dict(request.header_items()), timeout=60))

    def remote_url(self, repo: str) -> str:
        # 使用已配置的 Git 认证；PAT 和 Runner token 不进入命令参数。
        return f"https://{self.host}/{repo}.git"

    def release_url(self, repo: str, tag: str) -> str:
        return f"https://{self.host}/{repo}/-/releases/{quote(tag, safe='')}"

    def master_sha(self, repo: str) -> str:
        return self.api(repo, "repository/branches/master")["commit"]["id"]

    def require_free_tag(self, repo: str, tag: str) -> None:
        query = urlencode({"search": f"^{re.escape(tag)}$", "per_page": 100})
        if any(item["name"] == tag for item in self.api(repo, f"repository/tags?{query}")):
            raise ValueError(t("release_forge.tagExists", tag=tag))

    def require_ancestor(self, repo: str, sha: str) -> None:
        remote = self.master_sha(repo)
        # Git 对提交图作精确判定；比较文件差异不能证明祖先关系。
        self.command("git", "fetch", "--no-tags", self.remote_url(repo), "refs/heads/master")
        fetched = self.command("git", "rev-parse", "FETCH_HEAD")
        if fetched != remote:
            raise ValueError(t("release_forge.masterMoved"))
        if self.command("git", "merge-base", remote, sha) != sha:
            raise ValueError(t("release_forge.notOnMaster"))

    def test_runs(self, repo: str, sha: str) -> list[dict]:
        query = urlencode({"sha": sha, "ref": "master", "source": "push", "per_page": 100})
        pipelines = self.api(repo, f"pipelines?{query}")
        matching = [item for item in pipelines if item["sha"] == sha
                    and item["ref"] == "master" and item["source"] == "push"]
        if not matching:
            return []
        pipeline = max(matching, key=lambda item: item["id"])
        status = pipeline["status"]
        if status == "success":
            self.require_test_jobs(repo, pipeline["id"], sha)
        # 统一 CI 结果字段供唯一发布入口消费，保留真实流水线 ID 与链接。
        run = {"id": pipeline["id"], "head_sha": sha, "head_branch": "master", "event": "push",
               "status": "completed" if status in TERMINAL_STATUSES else "in_progress",
               "conclusion": "success" if status == "success" else status,
               "html_url": pipeline["web_url"]}
        if status not in TERMINAL_STATUSES:
            # 流水线整体是 running 时也可能有任务排着没人接，所以只要没结束就看任务。
            jobs = self.jobs(repo, pipeline["id"])
            # 任何一个不许失败的任务红了，整条就不会转绿：不只看必需的四个，演练里的构建也算。
            run["failed_jobs"] = sorted(
                name for name, job in jobs.items()
                if job["status"] in RED_JOB_STATUSES and not job.get("allow_failure"))
            run["queued_jobs"] = self.queued_jobs(repo, jobs.values())
        return [run]

    def jobs(self, repo: str, pipeline: int) -> dict[str, dict]:
        """流水线里每个任务名最新的一次；重试过的任务以最后一次为准。"""
        jobs = []
        for page in range(1, 11):
            batch = self.api(repo, f"pipelines/{pipeline}/jobs?per_page=100&page={page}")
            jobs.extend(batch)
            if len(batch) < 100:
                break
        else:
            raise ValueError(t("release_forge.tooManyJobs"))
        selected = {}
        for job in jobs:
            if job["name"] not in selected or job["id"] > selected[job["name"]]["id"]:
                selected[job["name"]] = job
        return selected

    def queued_jobs(self, repo: str, jobs) -> list[dict]:
        """排着队、还没有 runner 接走的任务，附带 runner 侧能确定的事实。

        只看 `pending`：`created` 在等前一阶段，`manual`、`scheduled`、`waiting_for_resource`
        都在等人或等别的条件，不是没人接。确有在线 runner 带齐这些 tags 的任务不列出，
        它只是在排队，交给总超时。`runners` 是 `offline`（带这些 tags 的 runner 都已登记但
        不在线）或 `unknown`（runner 列表读不到，或一个带这些 tags 的都查不到——项目接口
        未必列出共享 runner，查不到不能当成没有）。
        """
        result = []
        states: dict[tuple[str, ...], str] = {}
        for job in jobs:
            if job.get("status") != "pending" or job.get("started_at") or job.get("runner"):
                continue
            tags = tuple(sorted(job.get("tag_list") or ()))
            if tags not in states:
                states[tags] = self.runner_state(repo, tags)
            if states[tags] == "online":
                continue
            queued = job.get("queued_duration")
            result.append({"id": job["id"], "name": job["name"], "tags": list(tags),
                           "queued": float(queued) if isinstance(queued, (int, float)) else None,
                           "runners": states[tags]})
        return result

    def runner_state(self, repo: str, tags: tuple[str, ...]) -> str:
        """`online`、`offline` 或 `unknown`；读 runner 要维护者权限，读不到就不下结论。"""
        if not tags:
            return "unknown"
        query = urlencode({"tag_list": ",".join(tags), "per_page": 100})
        try:
            runners = self.api(repo, f"runners?{query}", public=False)
        except (subprocess.CalledProcessError, OSError, ValueError):
            return "unknown"
        if not isinstance(runners, list) or not runners:
            return "unknown"
        if any(runner.get("status") == "online" and not runner.get("paused")
               and runner.get("active", True) for runner in runners):
            return "online"
        return "offline"

    def require_test_jobs(self, repo: str, pipeline: int, sha: str) -> None:
        selected = self.jobs(repo, pipeline)
        bad = [name for name in sorted(REQUIRED_TEST_JOBS)
               if name not in selected or selected[name]["status"] != "success"
               or selected[name].get("allow_failure")
               or selected[name].get("commit", {}).get("id") != sha]
        if bad:
            raise ValueError(t("release_forge.missingTestJobs", jobs=list(bad)))

    def require_rehearsal(self, repo: str, pipeline: int) -> None:
        """版本提交的流水线里，演练的标签作业必须都在且成功；缺一个都不打标签。"""
        selected = self.jobs(repo, pipeline)
        bad = [name for name in sorted(REHEARSAL_JOBS)
               if name not in selected or selected[name]["status"] != "success"]
        if bad:
            raise ValueError(t("release_forge.rehearsalFailed", jobs=list(bad)))
