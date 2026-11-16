import { STAGES } from '../../settings/library-policy-settings';
import type { SetupFolder } from './setup-api';
import { joinList, t } from '../../../i18n';

export function libraryFields(row?: SetupFolder): Partial<SetupFolder> {
  return row ? {
    library_id: row.library_id, library: row.library, library_icon: row.library_icon, library_color: row.library_color,
    library_policy: row.library_policy, library_stages: row.library_stages,
  } : {};
}

export function processingSummary(row: SetupFolder): string {
  if (row.library_policy === 'local') return t('shell:setupProcessing.localOnly');
  if (row.library_policy !== 'custom') return t('shell:setupProcessing.auto');
  const stages = STAGES.filter(([key]) => row.library_stages?.split(',').includes(key)).map(([, label]) => label);
  return stages.length ? t('shell:setupProcessing.custom', { stages: joinList(stages) }) : t('shell:setupProcessing.customLocalOnly');
}
