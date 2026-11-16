/* Docker 首次设置与访问设置共用的那句拒绝说明：来源不是本机或局域网，或带了代理转发头（ADR-0149）。
 * 服务端 403 正文里是同一句（`routes_auth.FIRST_ACCESS_DENIED`）。 */
import { t } from '../../i18n';
export const FIRST_ACCESS_DENIED = t('shell:firstAccess.denied');
