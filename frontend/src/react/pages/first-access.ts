/* Docker 首次设置与访问设置共用的那句拒绝说明：来源不是本机或局域网，或带了代理转发头（ADR-0149）。
 * 服务端 403 正文里是同一句（`routes_auth.FIRST_ACCESS_DENIED`）。 */
export const FIRST_ACCESS_DENIED = '请从部署 Peach 的机器或同一局域网打开 Peach 完成设置，或在启动容器时设置 PEACH_ACCESS_PASSWORD。';
