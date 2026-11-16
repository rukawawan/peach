/** 请求失败时给人看的一句原因，不初始化界面或路由状态。
 *
 *  同一个错误常被处理两次：取数入口先换成人话，页面显示时又经过这里。取数入口换好的错误用 `markResolved`
 *  记下，再经过这里原样返回；否则服务端译好的原因会被按状态码换成通用句。 */
import { t } from '../i18n';

const resolved = new WeakSet<object>();

/** 记下这个错误的 message 已经是给人看的话（服务端原因或按状态码给的通用句）。 */
export function markResolved<T extends object>(error: T): T {
  resolved.add(error);
  return error;
}

export function requestErrorMessage(cause:any,status=0):string{
  const text=String(cause?.message??cause??'');
  if(cause&&typeof cause==='object'&&resolved.has(cause))return text;
  const code=Number(status||cause?.status||text.match(/\b(400|401|403|404|408|409|413|429|500|502|503|504)\b/)?.[1]);
  const messages:Record<number,string>={400:t('shell:requestError.badRequest'),401:t('shell:requestError.sessionExpired'),403:t('shell:requestError.forbidden'),404:t('shell:requestError.notFound'),408:t('shell:requestError.timeout'),409:t('shell:requestError.conflict'),413:t('shell:requestError.tooLarge'),429:t('shell:requestError.rateLimited'),500:t('shell:requestError.serverError'),502:t('shell:requestError.badGateway'),503:t('shell:requestError.unavailable'),504:t('shell:requestError.gatewayTimeout')};
  if(/Failed to fetch|fetch failed|NetworkError|Load failed|network request failed|ERR_CONNECTION/i.test(text))return t('shell:requestError.unreachable');
  /* 正文里的 timeout 字样只在没有状态码时才算超时：500 的堆栈里常带着某个库的 timeout 参数名。 */
  if(cause?.name==='TimeoutError'||(!code&&/timed? ?out|timeout/i.test(text)))return t('shell:requestError.clientTimeout');
  /* 没经过取数入口的中文是服务端原话（落库的旧文字、还没迁移的接口），照原样显示。 */
  if(/[㐀-鿿]/.test(text)&&!/^请求失败[（(]/.test(text))return text;
  if(messages[code])return messages[code];
  /* 页面按界面语言取好的一句话没有状态码，原样显示；运行时抛的异常（类型不是 Error）、堆栈和空话换成通用句。 */
  const thrownByRuntime=cause instanceof Error&&cause.name!=='Error';
  if(text&&!thrownByRuntime&&!/^\s*(?:[\w.]*(?:Error|Exception)\b|Traceback\b)/.test(text))return text;
  return t('shell:requestError.fallback');
}
