"""资料源页面与封面 CDN 的有界连接检查；Web 与安装诊断共用。"""
import io
import time
import httpx
from PIL import Image
from .http import HttpRequest
from .scraping_access import SOURCES, SourcePaused, SourceRefused, SourceTransport, record_source_check

MOBILE_BROADBAND_HINT = "中国移动宽带直连 DMM 图片主机常在握手后被断开，请把 DMM / FANZA 的连接方式设成 Peach 代理。"


def _connection_failure(exc, label):
    """来源连接异常对应可操作的诊断说明。"""
    if isinstance(exc, SourceRefused):
        # 地区限制与出口封禁：原话里写着要换出口，不只是「稍后重试」。
        return {"ok": False, "kind": "auth", "reason": exc.reason,
                "message": f"{exc}。", "error_type": type(exc).__name__}
    if isinstance(exc, SourcePaused):
        detail, message = "cooldown", "来源正在冷却，请稍后重试。"
    elif isinstance(exc, httpx.ProxyError):
        detail, message = "proxy", "代理连接失败，请检查 Peach 代理。"
    elif isinstance(exc, httpx.TimeoutException):
        detail, message = "timeout", "来源连接超时，请稍后重试或检查连接方式。"
    else:
        detail = "network"
        message = (f"连接未取得；{MOBILE_BROADBAND_HINT}" if label == "高清图片 CDN"
                   else "连接未取得；此来源可能需要代理，请检查来源连接方式。")
    return {"ok": False, "kind": "unavailable", "reason": detail,
            "message": message, "error_type": type(exc).__name__}


def _connection_message(detail, reason):
    """来源响应的失败原因决定用户下一步操作。"""
    from .metadata import reason_blames_credentials

    if detail == "cloudflare_challenge":
        return "来源返回人机验证页，请检查来源验证状态或更换出口。"
    if detail == "rate_limited":
        return "来源正在限流，请稍后重试。"
    if detail == "not_found":
        return "来源检查地址不存在，请核对站点地址。"
    if reason_blames_credentials(reason):
        return "来源要求登录或验证，请在官网完成登录后重试。"
    return f"{reason}。" if reason else "来源暂不可用，请稍后重试。"


def check_source(secrets_root, source, *, preflight=False):
    """复用来源连接与图片 CDN 判据；安装检查只使用有界 HTTP 请求。"""
    from .metadata import auth_wall_reason
    if source not in SOURCES:
        raise ValueError("未知采集来源")
    if not SOURCES[source]["login"]:
        return {"ok": True, "results": [{"label": "来源页面", "ok": False, "kind": "unavailable",
                "reason": "needs_code", "message": "片商官网按番号选择，请输入馆藏番号检查高清封面。"}],
                "session_verified": False}
    targets = [("来源页面", SOURCES[source]["login"])]
    if source == "dmm":
        targets.append(("高清图片 CDN", "https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/gyan00017/gyan00017pl.jpg"))
    results = []
    transport = (SourceTransport(secrets_root, max_requests=12, max_bytes=12 * 65536,
                                 max_seconds=15, allow_browser=False)
                 if preflight else SourceTransport(secrets_root))
    try:
        for label, url in targets:
            result = {"label": label, "ok": False}
            started = time.monotonic()
            try:
                response = transport(HttpRequest("GET", url, {"Range": "bytes=0-65535"}), 10, 65536)
                # 鉴权失败与「站点挂了」是两件事，页面上要分得开：前者要人去官网登录
                # 或换一份 Cookie，后者只要等。判据和元数据来源共用一份；重定向终点
                # 只在真的跳转过时才算数，否则配置里本身就指向登录页的来源会自判失败。
                reason = auth_wall_reason(
                    status_code=response.status, body=response.body,
                    final_url=response.url if response.url and response.url != url else "")
                result.update(status=response.status, bytes=len(response.body),
                              ok=response.status in {200, 206} and not reason,
                              kind="ok" if response.status in {200, 206} and not reason
                              else "auth" if reason else "unavailable")
                from .browser_transport import CHALLENGE_MARKS
                challenge = any(mark.lower() in response.body.decode("utf-8", errors="replace").lower()
                                for mark in CHALLENGE_MARKS)
                detail = ("cloudflare_challenge" if challenge else "auth_required" if reason
                          else "ok" if result["ok"] else "rate_limited" if response.status == 429
                          else "server_error" if response.status >= 500
                          else "not_found" if response.status == 404 else "http_error")
                result["reason"] = detail
                if challenge:
                    result.update(ok=False, kind="auth")
                if label == "高清图片 CDN" and result["ok"]:
                    with Image.open(io.BytesIO(response.body)) as image:
                        result["width"], result["height"] = image.size
                if not result["ok"]:
                    # 成因锁死在凭据上才让人去登录。只剩状态码可看的 403 直接把
                    # `auth_wall_reason` 那句原样给用户：出口 IP 被封时登录是白做，
                    # 页面上再手写一份「请去登录」等于把人引去做错事。
                    result["message"] = _connection_message(detail, reason)
            except Exception as exc:
                result.update(_connection_failure(exc, label))
            result.update(checked_at=time.time(), elapsed_s=round(time.monotonic() - started, 2))
            if label == "来源页面":
                record_source_check(secrets_root, source, "connection", result)
            results.append(result)
    finally:
        transport.close()
    return {"ok": True, "results": results, "session_verified": False}


