import { apiGet } from '../../api';
import type { LibraryProcessingData, LibraryProcessingIssue } from './library-processing';
import { t } from '../../i18n';

interface IssuePage {
  job_id: string; revision: string; total: number; offset: number; rows: LibraryProcessingIssue[];
}

/** 任务号和内容版本同时固定；失败或取消不交付半份文件。 */
export async function exportProcessingIssues(state: LibraryProcessingData, signal: AbortSignal): Promise<string> {
  if (!state.job_id) throw new Error(t('manage:issueExport.noTask'));
  const rows: LibraryProcessingIssue[] = [];
  let total = 1, revision = '';
  for (let offset = 0; offset < total; offset += 200) {
    const params = new URLSearchParams({job_id:state.job_id, offset:String(offset), limit:'200'});
    if (revision) params.set('revision',revision);
    const page = await apiGet<IssuePage>(`/api/library-processing/issues?${params}`,signal);
    signal.throwIfAborted();
    if (page.job_id !== state.job_id || page.offset !== offset
      || (revision && (page.revision !== revision || page.total !== total))) {
      throw new Error(t('manage:issueExport.changed'));
    }
    if (offset === 0) { total = page.total; revision = page.revision }
    if (page.rows.length !== Math.min(200,total-offset)) throw new Error(t('manage:issueExport.incomplete'));
    rows.push(...page.rows);
  }
  return JSON.stringify({job_id:state.job_id, revision, exported_at:new Date().toISOString(), total:rows.length, rows},null,2);
}

export function downloadIssueList(jobId: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents],{type:'application/json;charset=utf-8'}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `peach-issues-${jobId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
