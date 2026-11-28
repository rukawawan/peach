import { t } from '../../i18n';
import idpc032 from '../../../../resources/assistant-demo-covers/idpc032.webp?inline';
import ipzz690 from '../../../../resources/assistant-demo-covers/ipzz690.webp?inline';
import ipzz893 from '../../../../resources/assistant-demo-covers/ipzz893.webp?inline';
import type { SearchWork } from './assistant-results';

const publisher = 'IDEA POCKET';
const catalogue = 'https://ideapocket.com';
export const demoSearchListing = catalogue + '/search/list?countup=0&keyword=IPZZ690';
export const demoDebutTag = t('catalog:libraryAssistant.demoDebutTag');

function release(code: string, title: string, performer: string, releaseDate: string, cover: string) {
  return {
    code, title, performers: [performer], release_date: releaseDate, studio: publisher,
    demoCover: cover, demoSource: catalogue + '/works/detail/' + code.replace('-', ''),
    tags: ['FIRST IMPRESSION', demoDebutTag],
  } satisfies SearchWork;
}

export const demoCatalogue = {
  'IPZZ-690': release('IPZZ-690',
    // i18n-exempt: 发行方公开标题，保留日文原文。
    'FIRST IMPRESSION 184 178cm脚長色白の本物海外モデルボディ 世界で活躍した北欧ハーフ美女 天音ミシェル 来日AVデビュー！！',
    // i18n-exempt: 发行方公开署名，保留原名。
    '天音ミシェル', '2025-08-12', ipzz690),
  'IPZZ-893': release('IPZZ-893',
    // i18n-exempt: 发行方公开标题，保留日文原文。
    'FIRST IMPRESSION 193 天性の愛らしさと洗練された気品 元芸能人お姉さん AV DEBUT',
    // i18n-exempt: 发行方公开署名，保留原名。
    '白石るな', '2026-07-14', ipzz893),
  'IDPC-032': release('IDPC-032',
    // i18n-exempt: 发行方公开标题，保留日文原文。
    'FIRST IMPRESSION 197 ライヴとグラビアに青春を捧げてきた正統派アイドル 元芸能人が大大大緊張、決意のAV出演ソロデビュー',
    // i18n-exempt: 发行方公开署名，保留原名。
    '橘春花', '2026-11-10', idpc032),
};

// i18n-exempt: 发行方公开简介，作为翻译演示的原文。
export const demoSynopsis = '北欧ノルウェー生まれ・178㎝脚長色白の本物海外モデルが衝撃の来日AVデビュー！';

// Playback supplies its own collection state. Catalogue entries contain only publisher data.
export const demoCollection = [
  { work: demoCatalogue['IPZZ-893'], unwatched: true, marked: false, translated: ['en'] },
  { work: demoCatalogue['IPZZ-690'], unwatched: false, marked: true, translated: ['zh-CN'] },
];
