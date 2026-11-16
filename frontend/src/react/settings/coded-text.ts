/* 配置页、首启页与维护页共用的运行信息一行（ADR-0159）；通用的取文字函数在 `core/server-text`。 */
import { codedText } from '../../core/server-text';

/** 运行信息的一行：项名、取值与下载链接文字按 code 取译文。 */
export function localizedFact<T extends { term: string; value: string; download_label?: string }>(fact: T): T {
  return {
    ...fact, term: codedText(fact, 'term'), value: codedText(fact, 'value'),
    ...(fact.download_label !== undefined ? { download_label: codedText(fact, 'download_label') } : {}),
  };
}
