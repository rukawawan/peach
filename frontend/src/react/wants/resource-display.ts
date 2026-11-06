import { fmtSize } from '@peach/legacy/core';

/** 来源的字节数按馆藏容量口径展示，其他来源单位保留；来源没给大小时显示未知。 */
export function resourceSize(value: string | null | undefined): string {
  const text = (value ?? '').trim();
  const bytes = /^([\d,]+)\s*B$/i.exec(text);
  if (/^[\d,.]+$/.test(text)) return '大小未知';
  return bytes ? fmtSize(Number(bytes[1].replaceAll(',', ''))) : value || '大小未知';
}

/** 缓存中的来源限制只表述本次取得范围，不推断账号权限。 */
export function resourceNotice(value: string): string {
  return /^更多评论.*(?:VIP|官方 App)/.test(value)
    ? '来源只返回了部分评论，资源链接可能不完整。'
    : value;
}
