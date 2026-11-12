/* 「修复与迁移」的数据契约与首屏预取。和页面分开放：路由切换时先取数，页面那一块按需加载，
 * 两路并行，页面挂上去读的是 Query 缓存里已经取好的这一份，路由骨架直接换成内容。 */
import { apiGet } from '../../api';
import { queryClient } from '../query';

export interface RepairItem {
  id: string; title: string; summary: string; mode: 'auto' | 'confirm';
  state: string; changed?: number; done?: number; total?: number; pending?: number;
  /** 删除类确认项：能回收的文件数与字节数；`estimating` 为还在后台统计。 */
  files?: number; bytes?: number; estimating?: boolean; error?: string;
}
export interface RepairHistory { id: string; title: string; at: number; changed: number; backups: { name: string; exists: boolean }[] }
export interface RepairCenterData { available: boolean; items: RepairItem[]; history: RepairHistory[] }

export const REPAIRS_URL = '/api/configuration/repairs';
export const REPAIRS_KEY = ['configuration', 'repairs'] as const;

export const fetchRepairs = (signal?: AbortSignal) => apiGet<RepairCenterData>(REPAIRS_URL, signal);

export async function prefetchRepairs(signal: AbortSignal): Promise<void> {
  await queryClient.fetchQuery({ queryKey: REPAIRS_KEY, queryFn: () => fetchRepairs(signal) });
}
