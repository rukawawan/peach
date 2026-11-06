"""采集设置与有界来源连接检查；凭据只写本机。"""
import hashlib
import json
import time
import httpx

from PIL import Image

from .scraping_access import SOURCES, SourcePaused, SourceTransport, describe, save

from .source_checks import MOBILE_BROADBAND_HINT, check_source


def _kept_cover_size(target, incoming, incoming_size, installed, previous):
    """本机封面不比来源这张差时回它的尺寸；该换、或本机还没有封面时回 `None`。

    本机那张的图片角色按装它时的来源认：边车记着来源地址就按它，否则按采集日志里
    上一次成功的那条。比较口径与批处理脚本同一个 `candidate_improves`。
    """
    from .jav_cover_fetch import candidate_for, candidate_improves, candidate_quality
    if not target.is_file():
        return None
    if isinstance(installed, dict) and installed.get("source_url"):
        current = candidate_for(str(installed["source_url"]))
    else:
        current = previous[0] if previous is not None else None
    with Image.open(target) as image:
        current_size = image.size
    if candidate_improves(
            incoming, incoming_size[0] * incoming_size[1],
            candidate_quality(current), current_size[0] * current_size[1]):
        return None
    return current_size


def w_scraping_cover(contract, body):
    """仅处理用户指定且馆藏命中的番号；完整解码后才允许升级封面。"""
    from .catalog_rules import is_korean_mib_code
    from .jav_cover_fetch import MIB_NOT_JAV
    from .metadata import validate_provider_code
    code = validate_provider_code(str(body.get("code", "")))
    if is_korean_mib_code(code):
        raise ValueError(MIB_NOT_JAV)
    with contract.database.read_connection() as connection:
        if not connection.execute("SELECT 1 FROM asset WHERE code=? LIMIT 1", (code,)).fetchone():
            raise ValueError("馆藏未找到这个番号")
    return contract.scraping_cover_job.start_result(lambda: _fetch_cover(contract, code), recovery={'code': code})


def _unavailable_reason(exc, network_failed: bool, statuses: set[int]) -> tuple[str, str]:
    """一次封面比较没取到图时，页面上那一格的原因键与说法：先看线路，再看来源回了什么。"""
    from .jav_cover_fetch import (CoverConnectError, HOSTS_UNREACHABLE, NO_USABLE_OFFICIAL,
                                 OFFICIAL_PLACEHOLDER_ONLY)
    if isinstance(exc, CoverConnectError):
        return "network", f"{HOSTS_UNREACHABLE}，未能完成封面比较；{MOBILE_BROADBAND_HINT}"
    if network_failed:
        return "network", "来源连接失败，未能完成封面比较；请检查来源连接设置。"
    if statuses & {401, 403}:
        codes = "/".join(str(s) for s in sorted(statuses & {401, 403}))
        return "access_denied", f"来源拒绝访问（HTTP {codes}），请检查登录或来源验证状态。"
    if any(s >= 500 for s in statuses):
        return "source_error", "来源服务异常（HTTP 5xx），请稍后重试。"
    if str(exc) == "所有渠道都没有候选":
        return "no_candidate", "来源没有返回这个番号的封面候选，无法判断是否有高清版。"
    return {
        OFFICIAL_PLACEHOLDER_ONLY: ("placeholder_only", f"{OFFICIAL_PLACEHOLDER_ONLY}。"),
        **dict.fromkeys(NO_USABLE_OFFICIAL, (
            "unusable_candidate", "候选封面未通过检查：图片未取得、无法解码或宽度不足 700px。")),
    }.get(str(exc), ("download_failed", "候选封面完整下载或图片校验失败，未取得可保存的图片。"))


def _fetch_cover(contract, code):
    from .cover_artwork import install_cover
    from .jav_cover_fetch import (best_cover, HostLimitedTransport, Unavailable,
                                 fc2_cover_candidates, logged_success_evidence)
    from .review_csv import read_rows
    target = contract.cover_root / (code + ".jpg")
    sidecar = target.with_suffix(".scraping.json")
    try:
        installed = json.loads(sidecar.read_text(encoding="utf-8"))
        if (time.time() - float(installed["checked_at"]) < 86400 and target.is_file()
                and hashlib.sha256(target.read_bytes()).hexdigest() == installed["raw_sha256"]):
            return {"ok": True, "code": code, "result": f"复用 24 小时内核验过的本机封面（{installed['width']} × {installed['height']}），没有再向来源请求。", **{
                key: installed[key] for key in ("width", "height", "raw_sha256")}}
    except (OSError, ValueError, KeyError, TypeError):
        installed = None
    raw = SourceTransport(contract.follow_secrets_root, max_requests=80,
                          max_bytes=32 * 1024 * 1024, max_seconds=180)
    transport = HostLimitedTransport(raw, 1.5)
    statuses = set()
    diagnostics = {}
    network_failed = False

    def observed(request, timeout, limit):
        nonlocal network_failed
        try:
            response = transport(request, timeout, limit)
        except httpx.TransportError:
            network_failed = True
            raise
        statuses.add(response.status)
        return response

    try:
        fc2 = fc2_cover_candidates(contract.candidate_root / "fc2-candidate-log.csv").get(code)
        log = contract.candidate_root / "cover-fetch-log.csv"
        previous = logged_success_evidence(read_rows(log), code) if log.is_file() else None
        prior = tuple(item for item in (fc2, previous[0] if previous else None) if item)
        candidate, size, data = best_cover(observed, code, 0, diagnostics=diagnostics,
                                          prior_candidates=prior,
                                          metadata_root=contract.follow_sources_root / "metadata" / "javinizer-go")
        kept_size = _kept_cover_size(target, candidate, size, installed, previous)
        if kept_size is not None:
            suffix = "部分来源连接失败，未能完成全部来源比较。" if network_failed or any(s >= 400 and s != 404 for s in statuses) else "没有找到更大或更合适的封面。"
            return {"ok": True, "code": code, "reason": "kept_existing",
                    "result": f"本机封面 {kept_size[0]} × {kept_size[1]}，来源可用封面 {size[0]} × {size[1]}；保留本机封面。{suffix}"}
        evidence = {"code": code, "width": size[0], "height": size[1],
                    "source": candidate.source, "source_url": candidate.url,
                    "raw_sha256": hashlib.sha256(data).hexdigest(),
                    "installed_sha256": hashlib.sha256(data).hexdigest(),
                    "checked_at": time.time(), "resolver": "peach-jav-cover-v1"}
        install_cover(target, code, data, size, evidence=evidence)
        return {"ok": True, "code": code, "result": "高清封面已保存", "width": size[0],
                "height": size[1], "requests": raw.requests, "bytes": raw.bytes}
    except Unavailable as exc:
        reason, message = _unavailable_reason(exc, network_failed, statuses)
        labels = {"placeholder": "「准备中」占位图", "probe_failed": "图片头请求失败", "invalid_image": "图片无法解码",
                  "too_small": "图片宽度不足 700px", "download_failed": "完整下载失败",
                  "dimension_mismatch": "完整图片尺寸与探测结果不一致"}
        details = "；".join(f"{label} {diagnostics[key]} 张" for key, label in labels.items() if diagnostics.get(key))
        if details:
            message = ("候选封面未通过检查。" if reason == "unusable_candidate" else message) + details + "。"
        return {"ok": False, "code": code, "reason": reason, "error": message + "已有图片保留。"}
    except SourcePaused as exc:
        return {"ok": False, "code": code, "reason": "paused", "error": str(exc)}
    except httpx.TransportError:
        return {"ok": False, "code": code, "reason": "network", "error": "来源连接失败，请检查来源连接设置；已有图片保留。"}
    except OSError:
        return {"ok": False, "code": code, "reason": "local_file", "error": "本机封面读取或保存失败，请检查封面目录权限与磁盘空间。"}
    except Exception as exc:
        return {"ok": False, "code": code, "reason": "processing_error", "error": f"封面处理失败（{type(exc).__name__}），未能完成比较；请查看服务日志。",
                "error_type": type(exc).__name__}
    finally:
        transport.close()


def q_scraping(contract, _args):
    return {"sources": [describe(contract.follow_secrets_root, source) for source in SOURCES
                        if source != "instagram"],
            "instagram_status": "Instagram 自动头像定位尚待独立登录会话验证"}


def w_scraping_settings(contract, body):
    return {"ok": True, "saved": save(contract.follow_secrets_root, str(body.get("source", "")), body)}


def w_scraping_check(contract, body):
    return check_source(contract.follow_secrets_root, str(body.get("source", "")))


def w_scraping_check_all(contract, _body):
    """全部来源跑一趟 `peach check-sources` 的同一检查。冷却中的来源在传输层直接判冷却，
    不发请求；不登记续跑：服务重启后不该自己再打一轮来源。"""
    from .source_preflight import check_sources, default_sources
    job = contract.source_check_job
    sources = default_sources()

    def work(job_id):
        def done(row):
            with job.editing(job_id) as state:
                if state is not None:
                    state["results"].append(row)
                    state["checked"] += 1
                    state["current"] = {"label": row["label"]}
        result = check_sources(contract.follow_secrets_root, sources, on_result=done)
        targets = [target for row in result["sources"] for target in row["results"]]
        job.update(job_id, status="complete", ok=result["ok"], results=result["sources"],
                   failed=sum(target["outcome"] not in ("ok", "skipped") for target in targets),
                   elapsed_s=result["elapsed_s"], completed_at=time.time())
    return job.start(work, initial={"checked": 0, "total": len(sources), "results": []}, restart=True)


def q_scraping_amane_bridge(contract, args):
    """amane 桥那张卡：钉的 sha、锁里的版本、venv 建没建、开了哪几站，外加重建任务的快照。"""
    from . import metadata_amane
    return {**metadata_amane.describe(contract.tools_root),
            "job": contract.amane_bridge_job.snapshot() or {"status": "idle"}}


def w_scraping_amane_check(contract, body):
    """只读 GitHub API 问上游最新 release。取不到就是「未取得」；升不升级由人读 diff 决定。"""
    from . import metadata_amane, peach_proxy
    latest = metadata_amane.latest_upstream_tag(peach_proxy.client_options(contract.follow_secrets_root))
    return {"ok": True, "latest": latest, "checked_at": time.time()}


def w_scraping_amane_rebuild(contract, body):
    """按锁重建桥的 venv。首次要下载约 98 MB，放后台跑，页面轮询 `q_scraping_amane_bridge` 那条读接口。"""
    from . import metadata_amane
    return contract.amane_bridge_job.start_result(lambda: metadata_amane.rebuild(contract.tools_root), recovery={})
