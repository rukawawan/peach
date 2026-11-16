/* 配置页的首屏数据。
 *
 * 整页与各分区读同一个 `queryKey`：挂载状态那一块按下「刷新」重取回来的也是整份配置，
 * 换进这一个键，屏幕上就只有一份真相。端点字符串在 `frontend/src` 里只声明一次，
 * 在 `../../configuration-endpoints`（`tests/test_frontend_build.py` 盯着）。
 *
 * 服务端给的说明（不能编辑的原因、各区域读取失败的提示、运行信息、口令换不了的原因）配了 code，
 * 取回来就换成当前语言：界面语言只在页面加载时定一次，缓存里存的就是要显示的那一份。 */
import { apiGet } from '../../api';
import { codedText, jobText, serverLabel } from '../../core/server-text';
import { CONFIGURATION_URL } from '../../configuration-endpoints';
import type { ConfigurationData } from '../bundle';
import { queryClient } from '../query';
import { localizedFact } from './coded-text';

export const CONFIGURATION_KEY = ['configuration'] as const;

type SectionError = NonNullable<ConfigurationData['section_errors']>[string];

/** 一个区域读取失败的标题与说明：标题里嵌着区域名，区域名也按 code 取译文。 */
function localizedSectionError(issue: SectionError): SectionError {
  const section = serverLabel(issue.section_code ?? '', issue.title_params?.section ?? '');
  return { ...issue, title: serverLabel(issue.title_code ?? '', issue.title, { section }), message: jobText(issue, 'message') };
}

export function localizedConfiguration(data: ConfigurationData): ConfigurationData {
  return {
    ...data,
    ...(typeof data.notice === 'string' ? { notice: codedText(data, 'notice') } : {}),
    ...(Array.isArray(data.facts) ? { facts: data.facts.map(localizedFact) } : {}),
    ...(data.section_errors ? { section_errors: Object.fromEntries(Object.entries(data.section_errors)
      .map(([key, issue]) => [key, localizedSectionError(issue)])) } : {}),
    ...(data.api_token ? { api_token: { ...data.api_token, reason: codedText(data.api_token, 'reason') } } : {}),
  };
}

export const fetchConfiguration = async (signal?: AbortSignal) =>
  localizedConfiguration(await apiGet<ConfigurationData>(CONFIGURATION_URL, signal));

/** 首屏：取回来才画。中止时 `fetchQuery` 把 `AbortError` 抛回给挂载方，它据此放弃这一次。 */
export async function prefetchConfiguration(signal: AbortSignal): Promise<void> {
  await queryClient.fetchQuery({
    queryKey: CONFIGURATION_KEY, queryFn: () => fetchConfiguration(signal),
  });
}
