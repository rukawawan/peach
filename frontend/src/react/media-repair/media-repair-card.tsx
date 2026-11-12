/* 数据管理页上的「媒体修复」卡片：选一个媒体库，把里面播不了或播不顺的 MP4 批量修好。
 *
 * 卡片和「扫描与采集」同一副形状：左边讲这件事和此刻的进度，页脚放媒体库与起停键；
 * 这一趟的下场挂在卡片外面。跑动时两秒问一次，空闲时不问。 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { confirmModal, MEDIA_SOURCE_ICONS } from '@peach/legacy/ui';

import { Button } from '@/components/base/buttons/button';
import { Select, SelectItem } from '../components/select';

import { apiSend } from '../../api';
import { REPAIR_CARD_TEXT } from '../../management';
import { useBackgroundJob } from '../background-job';
import { Fieldset, FieldsetTitle } from '../components/fieldset';
import { Note } from '../components/note';
import { useOrderedLibraries } from '../components/library-order';
import { Progress } from '../components/progress';
import { queryClient } from '../query';
import { SourceMark } from '../settings/section';
import { busyProps, useAction } from '../settings/use-action';
import {
  fetchMediaRepair, fetchRepairLibraries, IDLE_REPAIR, MEDIA_REPAIR_KEY, MEDIA_REPAIR_URL,
  missingToolText, REPAIR_LIBRARIES_KEY, statusLine, type MediaRepairState,
} from './media-repair';
import { t } from '../../i18n';

const libraryMark = (icon: string) => MEDIA_SOURCE_ICONS[icon] || icon;
const replace = (next: MediaRepairState) => queryClient.setQueryData(MEDIA_REPAIR_KEY, next);

export function MediaRepairCard({ toast = () => {} }: { toast?(message: string): void }) {
  const repair = useBackgroundJob<MediaRepairState, string>({
    queryKey: MEDIA_REPAIR_KEY, queryFn: ({ signal }) => fetchMediaRepair(signal),
    start: (library) => apiSend<MediaRepairState>(MEDIA_REPAIR_URL, { library, restart: true }),
    onFinish: (result) => {
      if (result.status === 'complete' && !result.failed && !result.missing_tool) {
        toast(result.repaired ? t('cleanup:mediaRepair.repaired', { count: result.repaired }) : t('cleanup:mediaRepair.nothingToRepair'));
      }
    },
  });
  const choices = useQuery({
    queryKey: REPAIR_LIBRARIES_KEY, queryFn: ({ signal }) => fetchRepairLibraries(signal),
  });
  const [chosen, setChosen] = useState('');
  const action = useAction();
  const state = repair.job ?? IDLE_REPAIR;
  const libraries = useOrderedLibraries(choices.data ?? [], row => row.id);
  const running = state.status === 'running';

  // 跑着的那一轮握着下拉框；空闲时是人选的那个，没选过就是上一轮修的库，再没有就是第一个。
  const selected = libraries.find((row) => row.id === (running ? state.library : chosen))
    ?? libraries.find((row) => row.id === state.library) ?? libraries[0];

  const start = () => {
    if (!selected) return;
    void confirmModal({
      title: t('cleanup:mediaRepair.confirmTitle', { name: selected.name }),
      body: [t('cleanup:mediaRepair.body'), ...(selected.metered ? [t('cleanup:mediaRepair.meteredWarning')] : [])]
        .join(t('cleanup:shared.sentenceGap')),
      confirmLabel: t('cleanup:mediaRepair.confirm'),
      onConfirm: async () => { await repair.start.mutateAsync(selected.id) },
    });
  };
  const stop = () => void action.run('stop',
    (signal) => apiSend<MediaRepairState>(MEDIA_REPAIR_URL, { stop: true }, 'POST', signal), replace);

  const outcome = repair.outcome;
  const line = statusLine(running ? state : outcome ?? IDLE_REPAIR);
  const problem = action.error || outcome?.error || (repair.query.error ? t('cleanup:mediaRepair.statusUnavailable') : '');
  return (
    <div className="flex flex-col gap-4">
      <Fieldset layout="split" label={t('cleanup:tools.mediaRepair')} footer={
        <>
          <Select aria-label={t('cleanup:mediaRepair.library')} prefix={t('cleanup:mediaRepair.library')} className="w-48" selectedKey={selected?.id ?? null}
            isDisabled={running || !libraries.length} aria-busy={choices.isPending || undefined}
            onSelectionChange={(key) => { if (key !== null) setChosen(String(key)); }}>
            {libraries.map((row) => (
              <SelectItem key={row.id} id={row.id} textValue={row.name}>
                <SourceMark mark={libraryMark(row.icon)} />{row.name}
              </SelectItem>
            ))}
          </Select>
          {running
            ? <Button onClick={stop} {...busyProps(action.busy === 'stop')}>{t('cleanup:shared.stop')}</Button>
            : <Button onClick={start} disabled={!selected}>{t('cleanup:mediaRepair.start')}</Button>}
        </>
      }>
        <div className="flex flex-col gap-2">
          <FieldsetTitle>{t('cleanup:tools.mediaRepair')}</FieldsetTitle>
          <p className="text-body-2-regular text-text-secondary">{REPAIR_CARD_TEXT}</p>
          {running && state.total
            ? <Progress label={t('cleanup:mediaRepair.progress')} value={state.checked} max={state.total} />
            : null}
          {line ? <p role="status" className="text-caption-1-regular text-text-secondary">{line}</p> : null}
        </div>
      </Fieldset>
      <div aria-live="polite" className="flex flex-col gap-4 empty:hidden">
        {outcome?.status === 'complete' && outcome.missing_tool
          ? <Note tone="warning" title={t('cleanup:mediaRepair.missingTool')} action={<Button variant="ghost" size="small" onClick={repair.dismiss}>{t('cleanup:mediaRepair.dismiss')}</Button>}>{missingToolText(outcome)}</Note>
          : null}
        {choices.isError ? <Note tone="error">{t('cleanup:mediaRepair.librariesUnavailable')}</Note> : null}
        {problem ? <Note tone="error">{problem}</Note> : null}
      </div>
    </div>
  );
}
