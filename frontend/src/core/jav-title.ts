/* JAV 标题：从 item 计算番号、版本徽章与标题。
 * 纯字符串逻辑，只依赖 core 的 esc、语言标记与服务端文字的显示名，不碰 DOM、不读 state。
 * Application 与 React 页面直接引用本模块，标题规则只有一份。
 * 后缀只对 is_jav 剥离；官方标题优先取含日文的一条，再按字段顺序回落。 */

import { esc } from './index';
import { langAttr } from './text-lang';
import { serverLabel } from './server-text';

/** 算标题要读的那几个字段。 */
export interface JavTitleSource {
  name?: string | null;
  code?: string | null;
  display_code?: string | null;
  is_jav?: boolean | number | null;
  catalog_title?: string | null;
  original_title?: string | null;
  display_title?: string | null;
  edition_badges?: string[] | null;
  width?: number | null;
  height?: number | null;
}
type Item = JavTitleSource | null | undefined;

/** 版次 id（服务端 `catalog_vocabulary`）到徽章配色。卡片标题上只标前四种：没有角标就是正片；队列里
 *  两条并排时正片也要写出来，所以多一个 `censored`。 */
export const EDITION_TONE: Readonly<Record<string, string>> = {
  'chinese-subtitles': 'subtitle', uncensored: 'uncensored', 'uncensored-leak': 'leaked', 'uncensored-crack': 'cracked',
  'ai-restored': 'cracked', censored: 'censored',
};
const TITLE_EDITIONS = ['chinese-subtitles', 'uncensored', 'uncensored-leak', 'uncensored-crack', 'ai-restored'];

/** 版次 id 的显示名，按界面语言取；不认识的 id 原样显示。 */
export const editionName = (edition: string) => serverLabel(`labels.catalogEdition.${edition}`, edition);
/** 徽章或资源属性的文字：版次 id 按语言显示，`4K` 这类记号与来源原样给的属性照原样。 */
export const editionText = (value: string) => (Object.hasOwn(EDITION_TONE, value) ? editionName(value) : value);

const JAV_MEDIA_SUFFIX=/\.(?:mp4|mkv|avi|wmv|mov|m4v|webm|ts|m2ts|mts|mpg|mpeg|flv|rm|rmvb|iso)$/i;

export const javFileDisplayName=(it:Item,value=it?.name)=>{
  const name=String(value||'').trim();
  return it?.is_jav?name.replace(JAV_MEDIA_SUFFIX,''):name;
};

export const hasJapaneseText=(value:unknown)=>/[぀-ヿ㐀-鿿]/.test(String(value||''));

export const javPreferredTitle=(it:Item)=>{
  const titles=[it?.catalog_title,it?.original_title].map(value=>String(value||'').trim()).filter(Boolean);
  return titles.find(hasJapaneseText)||titles[0]||'';
};

export function javTitleParts(it:Item,value=it?.name):{code:string;title:string;badges?:string[]}{
  const name=javFileDisplayName(it,value),code=String(it?.code||'').trim().toUpperCase();
  if(!it?.is_jav||!code)return {code:'',title:name};
  const displayCode=String(it?.display_code||code).trim().toUpperCase();
  const upper=name.toUpperCase(),hasPrefix=upper===code||upper===displayCode
    ||(upper.startsWith(code)&&/^[\s._\-[\]]/.test(name.slice(code.length)))
    ||(upper.startsWith(displayCode)&&/^[\s._\-[\]]/.test(name.slice(displayCode.length)));
  const prefixLength=upper.startsWith(displayCode)?displayCode.length:code.length;
  const filenameTitle=(hasPrefix?name.slice(prefixLength):name).replace(/^[\s._-]+/,'').trim();
  const officialTitle=javPreferredTitle(it);
  // API 显式返回空 display_title 也是有意义的“清洁后无标题”，不能再回退到脏文件名。
  const cleanFallback=Object.prototype.hasOwnProperty.call(it||{},'display_title')
    ?String(it.display_title||'').trim():filenameTitle;
  const title=officialTitle||cleanFallback;
  const badges=Array.isArray(it?.edition_badges)?it.edition_badges.filter(label=>TITLE_EDITIONS.includes(label)):[];
  const dimensions=[Number(it?.width)||0,Number(it?.height)||0];
  if(Math.min(...dimensions)>=2160&&Math.max(...dimensions)>=3840)badges.push('4K');
  return {code:displayCode,title,badges};
}

/** 同一条目的纯文本形态，用于无障碍名称。 */
export const javDisplayName=(it:Item,value=it?.name)=>{
  const {code,title,badges=[]}=javTitleParts(it,value);
  return code?[code,...badges.map(editionText),title].filter(Boolean).join(' '):title;
};

/** 番号 + 版次徽章 + 标题的 HTML。非 JAV 条目退化成转义后的文件名。 */
export function javTitleHtml(it:Item,value=it?.name){
  const {code,title,badges=[]}=javTitleParts(it,value);
  if(!code)return esc(title);
  const edition=badges.map(label=>`<small class="javedition ${EDITION_TONE[label]||'quality'}">${esc(editionText(label))}</small>`).join('');
  return `<span class="ui-javidentity"><strong class="ui-javcode">${esc(code)}</strong>${edition}</span>${title?` <span class="ui-javtitle"${langAttr(title)}>${esc(title)}</span>`:''}`;
}
