/* 访问口令：脚本和 API 调用放在 `X-Token` 请求头里的那串，和访问密码是两套凭据。
 *
 * 口令平时不回给页面；换的那一次响应带新值，这里只显示到离开本页为止（ADR-0142）。
 * 换之前用 `confirmModal()` 说清谁要重新登录：用访问密码登录的浏览器不受影响；还没设
 * 访问密码的部署拿口令当登录凭据，其他浏览器全部退出，本机由服务端当场补签。
 * 新口令用 BoardUI 只读 `Input` 加复制键，形状同端口分区的地址行。 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { confirmModal } from '@peach/legacy/ui';

import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';

import { apiSend } from '../../api';
import type { AccessState } from '../bundle';
import { Note } from '../components/note';
import { Footer, Help, Section, Stack } from './section';
import { useAction } from './use-action';
import { t } from '../../i18n';

export interface ApiTokenState {
  /** 这次启动的口令取自口令文件才能在这里换；被启动参数覆盖或没有口令时为 false。 */
  rotatable: boolean;
  /** 不能换时的原因，能换时为空。 */
  reason: string;
  /** 开着双机复制或复核镜像：两台要用同一份口令文件。 */
  paired: boolean;
}

interface Rotated extends ApiTokenState {
  token: string;
  mode: AccessState['mode'];
  /** 口令即登录凭据的部署里，这次被登出的其他设备数。 */
  signed_out: number;
  /** 本机的登录没能续上，要用新口令重新登录。 */
  relogin?: boolean;
}

const URL = '/api/configuration/access/token/rotate';

/** 确认框里那句后果：按这台的访问方式说清哪些设备要重新登录。 */
export function rotationEffect(mode: AccessState['mode'], paired: boolean): string {
  const scripts = t('settings:accessToken.scriptsInvalidated');
  const sentence = mode === 'legacy'
    ? t('settings:accessToken.rotateEffectLegacy', { scripts })
    : mode === 'open'
      ? t('settings:accessToken.rotateEffectOpen', { scripts })
      : t('settings:accessToken.rotateEffectPassword', { scripts });
  return paired ? t('settings:accessToken.rotateEffectPaired', { sentence }) : sentence;
}

export function ApiTokenSettings({ initial, mode, receipt }: {
  initial: ApiTokenState; mode: AccessState['mode']; receipt(message: string): void;
}) {
  const [state, setState] = useState(initial);
  const [rotated, setRotated] = useState<Rotated | null>(null);
  const copy = useAction();
  const queries = useQueryClient();

  const rotate = () => void confirmModal({
    title: t('settings:accessToken.rotateTitle'),
    body: rotationEffect(mode, state.paired),
    confirmLabel: t('settings:accessToken.rotate'),
    onConfirm: async () => {
      const next = await apiSend<Rotated>(URL, {});
      setState(next); setRotated(next);
      // 口令即登录凭据时设备记录整份清空，列表要重取。
      if (next.mode === 'legacy') void queries.invalidateQueries({ queryKey: ['access-sessions'] });
      receipt(next.signed_out ? t('settings:accessToken.rotatedSignedOut', { count: next.signed_out }) : t('settings:accessToken.rotated'));
    },
  });

  return (
    <Section title={t('settings:accessToken.title')}>
      <Stack>
        <Help>{t('settings:accessToken.help')}</Help>
        {rotated ? (
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 flex-wrap items-end gap-2">
              <Input className="min-w-0 flex-1" label={t('settings:accessToken.newToken')} value={rotated.token} isReadOnly autoComplete="off" />
              <Button variant="secondary" aria-label={t('settings:accessToken.copyNew')}
                onClick={() => void copy.run('copy', () => navigator.clipboard.writeText(rotated.token), () => receipt(t('settings:accessToken.copied')))}>
                {t('settings:accessToken.copy')}
              </Button>
            </div>
            {copy.error ? <Help role="status">{t('settings:accessToken.copyFailed')}</Help> : null}
            <Note tone="info" title={t('settings:accessToken.shownOnce')}>
              {t('settings:accessToken.shownOnceHelp')}
            </Note>
          </div>
        ) : null}
        {rotated?.relogin ? <Note tone="warning" title={t('settings:accessToken.reloginTitle')}>{t('settings:accessToken.reloginHelp')}</Note> : null}
        {state.rotatable ? null : <Help>{state.reason}</Help>}
      </Stack>
      {state.rotatable
        ? <Footer status={t('settings:accessToken.immediate')}>
            <Button variant="secondary" onClick={rotate}>{t('settings:accessToken.rotate')}</Button>
          </Footer>
        : null}
    </Section>
  );
}
