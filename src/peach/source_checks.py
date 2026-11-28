"""资料源连接、样本查询与登录会话检查。"""
import io
import time
from urllib.parse import urlsplit
import httpx
from PIL import Image
from . import interface_text
from .coded_text import Said, coded
from .http import HttpRequest, body_text
from .javdb import PROFILE_PATH, PROFILE_URL, profile_signed_in
from .catalog_rules import same_release_code
from .jav_cover_fetch import DeadlineExceeded
from .scraping_access import (
    JAVDB_WEB_HOSTS, KEY_SOURCES, SOURCES, SourcePaused, SourceRefused, SourceTransport,
    record_source_check, values_for, with_account,
)
from .sources.base import FailureReason, Session, SourceFailure
from .sources.dmm import DmmSource
from .sources.javbus import JavBusSource
from . import western_catalog
from .user_messages import UserValueError

MOBILE_BROADBAND_HINT_CODE = "labels.sourceChecks.mobileBroadbandHint"
#: 那句提示按 zh-CN 渲染的原文，封面比较的报错与测试按它核对。
MOBILE_BROADBAND_HINT = interface_text.text(f"server:{MOBILE_BROADBAND_HINT_CODE}")
#: 一次检查查哪几跳：来源页面本身，以及来源取图的那台图片主机。`label` 由 `target` 取说法。
PAGE, CDN, LOOKUP, ACCOUNT_SESSION = "page", "cdn", "lookup", "session"
#: 各来源实际取图的那台主机上一张长期在的图（2026-11-16 实测都能取到）。只取前 64 KB，看通不通、是不是图，
#: 不下载整张。请求按地址归属走那个来源的连接方式与冷却（`scraping_access.source_for`）：r18.dev 的封面
#: 本来就在 DMM 的图片主机上，取图时用的也是 DMM 那一份设置。没列在这里的来源没有固定的图片主机
#: （FC2 的 `storage*` 按商品换，片商官网与综合索引的图在别家主机上），图片那一跳标「未检查」。
IMAGE_PROBES = {
    "dmm": "https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/gyan00017/gyan00017pl.jpg",
    "r18dev": "https://pics.dmm.co.jp/mono/movie/adult/118abw350/118abw350pl.jpg",
    "javdb": "https://c0.jdbstatic.com/covers/wk/wKGkQD.jpg",
    "javbus": "https://www.javbus.com/pics/cover/9paa_b.jpg",
    "mgstage": "https://image.mgstage.com/images/prestige/sp/abw/196/pake-03_sp-abw-196.jpg",
}
#: 图片主机属于 DMM 的来源：中国移动宽带直连常在握手后被断开，连不上时附那一句提示。
DMM_IMAGE_SOURCES = frozenset({"dmm", "r18dev"})
TARGET_LABELS = {PAGE: "labels.sourceChecks.target.page", CDN: "labels.sourceChecks.target.cdn",
                 LOOKUP: "labels.sourceChecks.target.lookup", ACCOUNT_SESSION: "labels.sourceChecks.target.session"}
LOOKUP_PROBES = {"dmm": (DmmSource, "SSIS-001"), "javbus": (JavBusSource, "ABP-984")}


def _connection_failure(exc, target, source=""):
    """来源连接异常对应可操作的诊断说明。"""
    if isinstance(exc, SourceRefused):
        # 地区限制与出口封禁：原话里写着要换出口，不只是「稍后重试」。`message` 是给不认 code 的
        # 调用方的 zh-CN 兜底句，界面按 `message_code` 与参数取当前语言的那一句。
        return {"ok": False, "kind": "auth", "reason": exc.reason,
                "message": f"{exc.message}。", "message_code": exc.code, "message_params": dict(exc.params),
                "error_type": type(exc).__name__}
    if isinstance(exc, SourcePaused):
        detail, message = "cooldown", Said("labels.sourceChecks.cooldown")
    elif isinstance(exc, httpx.ProxyError):
        detail, message = "proxy", Said("labels.sourceChecks.proxy")
    elif isinstance(exc, (httpx.TimeoutException, DeadlineExceeded)):
        detail, message = "timeout", Said("labels.sourceChecks.timeout")
    else:
        detail = "network"
        message = (Said("labels.sourceChecks.cdnUnreachable", hint=Said(MOBILE_BROADBAND_HINT_CODE))
                   if target == CDN and source in DMM_IMAGE_SOURCES else Said("labels.sourceChecks.unreachable"))
    return {"ok": False, "kind": "unavailable", "reason": detail,
            **coded("message", message), "error_type": type(exc).__name__}


def _connection_message(detail, reason):
    """来源响应的失败原因决定用户下一步操作。`reason` 是 `metadata.auth_wall` 那一句或 `None`。"""
    from .metadata import reason_blames_credentials

    if detail == "cloudflare_challenge":
        return Said("labels.sourceChecks.challenge")
    if detail == "rate_limited":
        return Said("labels.sourceChecks.rateLimited")
    if detail == "not_found":
        return Said("labels.sourceChecks.notFound")
    if reason_blames_credentials(reason):
        return Said("labels.sourceChecks.signIn")
    return Said("labels.sourceChecks.reason", reason=reason) if reason else Said("labels.sourceChecks.unavailable")


#: 页面那一跳不按「打开首页」查的来源：首页之后的路与采集用的那条不是一回事。DMM 首页现在 301 到
#: fanza.jp、再落到年龄确认页，没贴年龄 Cookie 的人永远查出「要登录」（#144）；采集走的是不设年龄门的
#: GraphQL 接口（`sources.dmm`），只收 POST，问一句 `{__typename}` 就知道通不通。
PAGE_PROBES = {"dmm": lambda: HttpRequest("POST", "https://api.video.dmm.co.jp/graphql",
                                         {"Content-Type": "application/json"}, b'{"query":"{__typename}"}')}


def _target(target):
    """检查目标与其显示名称。"""
    return {"target": target, **coded("label", Said(TARGET_LABELS[target]))}


def _image_unchecked():
    """没有固定图片主机的来源，图片那一跳不发请求，标明未检查。"""
    return {**_target(CDN), "ok": False, "kind": "unchecked", "reason": "no_image_host",
            **coded("message", Said("labels.sourceChecks.noImageHost"))}


def _check_key_source(root, source):
    module = KEY_SOURCES[source]
    key = values_for(root, source).get('api_key')
    result = {**_target(PAGE), 'ok': False}
    if not key:
        result.update(kind='unchecked', reason='not_configured',
                      **coded('message', Said('errors.westernCatalog.keyMissing', source=module.LABEL)))
        return {'ok': True, 'results': [result, _image_unchecked()], 'session_verified': False}
    transport = SourceTransport(root, max_requests=1, max_seconds=10, allow_browser=False)
    try:
        verified = module.authenticated(transport, key)
    except UserValueError as error:
        status = error.params.get('status')
        if isinstance(error, western_catalog.CredentialsRejected):
            result.update(kind='auth', reason='auth_required',
                          **coded('message', Said('errors.westernCatalog.keyRejected', source=module.LABEL)))
        elif error.code == 'errors.westernCatalog.http':
            result.update(kind='unavailable', reason='http_error', status=status,
                          **coded('message', Said(error.code, **error.params)))
        else:
            result.update(_connection_failure(error, PAGE, source))
    except (SourcePaused, httpx.HTTPError) as error:
        result.update(_connection_failure(error, PAGE, source))
    else:
        if verified:
            result.update(ok=True, kind='ok', reason='ok')
        else:
            result.update(kind='auth', reason='auth_required',
                          **coded('message', Said('errors.westernCatalog.keyRejected', source=module.LABEL)))
    finally:
        transport.close()
    result['checked_at'] = time.time()
    record_source_check(root, source, 'connection', result)
    return {'ok': result['ok'], 'results': [result, _image_unchecked()], 'session_verified': result['ok']}


def _check_targets(source):
    targets = [(PAGE, SOURCES[source]["login"])]
    if source in IMAGE_PROBES:
        targets.append((CDN, IMAGE_PROBES[source]))
    return targets


def _check_lookup(root, source):
    parser, code = LOOKUP_PROBES[source]
    started = time.monotonic()
    transport = SourceTransport(root, max_requests=6, max_bytes=8 * 1024 * 1024,
                                max_seconds=15, allow_browser=False)
    result = {**_target(LOOKUP), "ok": False}
    try:
        record = parser().query(code, session=Session(transport, deadline=started + 15))
        if not same_release_code(code, record.code) or not record.title:
            raise SourceFailure(FailureReason.PARSE_ERROR, "labels.sourceChecks.sampleIncomplete", {"code": code})
    except SourceFailure as error:
        failure = (Said("labels.sourceChecks.sampleMissing", code=code)
                   if error.reason == FailureReason.NOT_FOUND else Said(error.code, **error.params))
        result.update(kind=error.kind, reason=error.reason.value, **coded("message", failure))
    except (SourcePaused, httpx.HTTPError, DeadlineExceeded) as error:
        result.update(_connection_failure(error, LOOKUP, source))
    else:
        result.update(ok=True, kind="ok", reason="ok",
                      **coded("message", Said("labels.sourceChecks.sampleMatched", code=code)))
    finally:
        transport.close()
    result.update(checked_at=time.time(), elapsed_s=round(time.monotonic() - started, 2))
    return result


def _javdb_profile_verdict(response):
    from .browser_transport import CHALLENGE_MARKS
    from .metadata import auth_wall, reason_blames_credentials

    text = body_text(response.body, response.headers)
    url = urlsplit(response.url)
    lowered = text.lower()
    if any(mark.lower() in lowered for mark in CHALLENGE_MARKS):
        return "auth", "cloudflare_challenge", Said("labels.sourceChecks.challenge")
    if url.scheme != "https" or url.netloc.lower() not in JAVDB_WEB_HOSTS:
        return "unavailable", "unexpected_page", Said("labels.sourceChecks.sessionUnconfirmed")
    reason = auth_wall(status_code=response.status, final_url=response.url, body=text)
    if reason_blames_credentials(reason):
        return "auth", "auth_required", Said("labels.sourceChecks.sessionRejected")
    if response.status == 200 and url.path.rstrip("/") == PROFILE_PATH and profile_signed_in(text):
        return "ok", "ok", Said("labels.sourceChecks.sessionVerified")
    return "unavailable", "unexpected_page", Said("labels.sourceChecks.sessionUnconfirmed")


def check_javdb_session(root):
    """显式手动检查，复用用户打开作品和资源时读的那份 JavDB Cookie。"""
    values = values_for(root, "javdb")
    result = {**_target(ACCOUNT_SESSION), "ok": False}
    if not (values.get("cookie") or values.get("cookies_text")):
        result.update(kind="unchecked", reason="not_configured",
                      **coded("message", Said("labels.sourceChecks.sessionMissing")))
        return {"ok": True, "results": [result], "session_verified": False}

    started = time.monotonic()
    page_limit = 512 * 1024
    transport = SourceTransport(root, max_requests=3, max_bytes=page_limit * 3,
                                max_seconds=10, allow_browser=False, redirect_hosts=JAVDB_WEB_HOSTS)
    try:
        with with_account():
            response = transport(HttpRequest("GET", PROFILE_URL, {}), 10, page_limit)
        kind, reason, message = _javdb_profile_verdict(response)
        result.update(ok=kind == "ok", kind=kind, reason=reason, status=response.status, **coded("message", message))
    except SourceRefused as error:
        result.update(_connection_failure(error, ACCOUNT_SESSION, "javdb"))
    except SourcePaused as error:
        result.update(kind="unavailable", reason="cooldown", **coded("message", Said(error.code, **error.params)))
    except httpx.HTTPError as error:
        result.update(_connection_failure(error, ACCOUNT_SESSION, "javdb"))
    except UserValueError:
        result.update(kind="unavailable", reason="unexpected_page",
                      **coded("message", Said("labels.sourceChecks.sessionUnconfirmed")))
    finally:
        transport.close()
    result.update(checked_at=time.time(), elapsed_s=round(time.monotonic() - started, 2))
    return {"ok": True, "results": [result], "session_verified": result["ok"]}


def _source_response(result, response, url, target):
    from .browser_transport import CHALLENGE_MARKS
    from .metadata import auth_wall

    # 鉴权失败与「站点挂了」是两件事，页面上要分得开：前者要人去官网登录
    # 或换一份 Cookie，后者只要等。判据和元数据来源共用一份；重定向终点
    # 只在真的跳转过时才算数，否则配置里本身就指向登录页的来源会自判失败。
    reason = auth_wall(
        status_code=response.status, body=response.body,
        final_url=response.url if response.url and response.url != url else "")
    result.update(status=response.status, bytes=len(response.body),
                  ok=response.status in {200, 206} and not reason,
                  kind="ok" if response.status in {200, 206} and not reason
                  else "auth" if reason else "unavailable")
    challenge = any(mark.lower() in response.body.decode("utf-8", errors="replace").lower()
                    for mark in CHALLENGE_MARKS)
    detail = ("cloudflare_challenge" if challenge else "auth_required" if reason
              else "ok" if result["ok"] else "rate_limited" if response.status == 429
              else "server_error" if response.status >= 500
              else "not_found" if response.status == 404 else "http_error")
    result["reason"] = detail
    if challenge:
        result.update(ok=False, kind="auth")
    if target == CDN and result["ok"]:
        with Image.open(io.BytesIO(response.body)) as image:
            result["width"], result["height"] = image.size
    if not result["ok"]:
        # 成因锁死在凭据上才让人去登录。只剩状态码可看的 403 直接把
        # `auth_wall_reason` 那句原样给用户：出口 IP 被封时登录是白做，
        # 页面上再手写一份「请去登录」等于把人引去做错事。
        result.update(coded("message", _connection_message(detail, reason)))


def check_source(secrets_root, source, *, preflight=False, lookup=False):
    """复用来源连接与图片 CDN 判据；安装检查只使用有界 HTTP 请求。"""
    if source not in SOURCES:
        raise ValueError("unknown scraping source")
    if source in KEY_SOURCES:
        return _check_key_source(secrets_root, source)
    if not SOURCES[source]["login"]:
        return {"ok": True, "results": [{**_target(PAGE), "ok": False, "kind": "unavailable",
                "reason": "needs_code", **coded("message", Said("labels.sourceChecks.needsCode"))},
                _image_unchecked()], "session_verified": False}
    results = []
    transport = (SourceTransport(secrets_root, max_requests=12, max_bytes=12 * 65536,
                                 max_seconds=15, allow_browser=False)
                 if preflight else SourceTransport(secrets_root))
    try:
        for target, url in _check_targets(source):
            result = {**_target(target), "ok": False}
            started = time.monotonic()
            try:
                probe = PAGE_PROBES.get(source) if target == PAGE else None
                request = probe() if probe else HttpRequest("GET", url, {"Range": "bytes=0-65535"})
                url = request.url
                response = transport(request, 10, 65536)
                _source_response(result, response, url, target)
            except Exception as exc:
                result.update(_connection_failure(exc, target, source))
            result.update(checked_at=time.time(), elapsed_s=round(time.monotonic() - started, 2))
            if target == PAGE:
                record_source_check(secrets_root, source, "connection", result)
            results.append(result)
    finally:
        transport.close()
    if source not in IMAGE_PROBES:
        results.append(_image_unchecked())
    if lookup and source in LOOKUP_PROBES:
        results.append(_check_lookup(secrets_root, source))
    return {"ok": True, "results": results, "session_verified": False}


