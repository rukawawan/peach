/* 「番号识别规则」：内置规则认不出的命名，由使用者写正则补上。
 *
 * 一行一条，对完整文件名搜索，不分大小写；番号取命名组 `code`，没有就取第一个括号，
 * 再没有就取整段匹配。取出来的那段仍要是番号的样子（`catalog_rules.compile_code_patterns`）。
 * 规则跟着账本走（`/api/settings` 的 `codePatterns`），下一次「处理」时对还没有番号的视频生效。
 * 校验只在服务端：写错的那一条在保存时报回来，前端不复制一份正则判定。 */
import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/base/buttons/button';
import { Textarea } from '@/components/base/textarea/textarea';

import { apiSend, errorMessage } from '../../api';
import { queryClient } from '../query';
import { SETTINGS_KEY, SETTINGS_URL, fetchSettings, type SyncedSettings } from '../settings-panel/settings-data';
import { Footer, Help, Section, Stack } from './section';
import { busyProps, useAction } from './use-action';
import { t } from '../../i18n';

const PLACEHOLDER = '^\\+{3}\\s*(?<code>FC2-PPV-\\d+)\n\\[(?<code>[A-Z]+-\\d+)\\]';

export function CodePatternSettings({ receipt }: { receipt(message: string): void }) {
  const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: ({ signal }) => fetchSettings(signal) });
  /* 没动过时显示账本里那一份；改过就是本地草稿，保存成功后丢掉草稿、回到账本那一份。 */
  const [draft, setDraft] = useState<string | null>(null);
  const action = useAction();
  const value = draft ?? (settings.data?.codePatterns ?? []).join('\n');
  const failure = action.error || (settings.error ? errorMessage(settings.error) : '');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const codePatterns = value.split('\n').map((rule) => rule.trim()).filter(Boolean);
    void action.run('save', (signal) =>
      apiSend<SyncedSettings>(SETTINGS_URL, { codePatterns }, 'POST', signal),
      (saved) => {
        queryClient.setQueryData(SETTINGS_KEY, saved);
        setDraft(null);
        receipt(t('settings:shared.settingsSaved'));
      });
  };

  return (
    <Section guide="codes" title={t('settings:codePatterns.title')} onSubmit={submit}>
      <Stack>
        <Help>{t('settings:codePatterns.help')}</Help>
        <Textarea id="codePatternSetting" aria-label={t('settings:codePatterns.title')} rows={3} autoResize maxRows={12}
          spellCheck="false" autoComplete="off" placeholder={PLACEHOLDER} value={value}
          isDisabled={!settings.data} isInvalid={!!failure} hint={failure || undefined}
          onChange={setDraft} />
      </Stack>
      <Footer>
        <Button type="submit" {...busyProps(action.busy === 'save')}>{t('settings:shared.saveSettings')}</Button>
      </Footer>
    </Section>
  );
}
