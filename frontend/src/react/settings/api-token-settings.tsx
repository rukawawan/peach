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
  const scripts = '用旧口令的脚本和 API 调用会立即失效。';
  const sentence = mode === 'legacy'
    ? `其他浏览器现在用这串口令登录，会全部退出，需要输入新口令重新登录；本机保持登录。${scripts}`
    : mode === 'open'
      ? `浏览器不需要登录，不受影响。${scripts}`
      : `用访问密码登录的浏览器不受影响。${scripts}`;
  return paired ? `${sentence}另一台电脑要换成同一份口令文件，两台之间才能继续互取复核结果。` : sentence;
}

export function ApiTokenSettings({ initial, mode, receipt }: {
  initial: ApiTokenState; mode: AccessState['mode']; receipt(message: string): void;
}) {
  const [state, setState] = useState(initial);
  const [rotated, setRotated] = useState<Rotated | null>(null);
  const copy = useAction();
  const queries = useQueryClient();

  const rotate = () => void confirmModal({
    title: '更换访问口令',
    body: rotationEffect(mode, state.paired),
    confirmLabel: '更换口令',
    onConfirm: async () => {
      const next = await apiSend<Rotated>(URL, {});
      setState(next); setRotated(next);
      // 口令即登录凭据时设备记录整份清空，列表要重取。
      if (next.mode === 'legacy') void queries.invalidateQueries({ queryKey: ['access-sessions'] });
      receipt(next.signed_out ? `已更换访问口令，${next.signed_out} 台设备需要重新登录` : '已更换访问口令');
    },
  });

  return (
    <Section title="访问口令">
      <Stack>
        <Help>脚本和 API 调用在 X-Token 请求头里携带访问口令。口令只存在这台电脑上，页面不显示。</Help>
        {rotated ? (
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 flex-wrap items-end gap-2">
              <Input className="min-w-0 flex-1" label="新访问口令" value={rotated.token} isReadOnly autoComplete="off" />
              <Button variant="secondary" aria-label="复制新访问口令"
                onClick={() => void copy.run('copy', () => navigator.clipboard.writeText(rotated.token), () => receipt('已复制口令'))}>
                复制口令
              </Button>
            </div>
            {copy.error ? <Help role="status">复制失败，请选中口令复制。</Help> : null}
            <Note tone="info" title="新口令只显示这一次">
              已经生效，不用重启。离开本页后不再显示，之后在终端运行 peach token 查看。
            </Note>
          </div>
        ) : null}
        {rotated?.relogin ? <Note tone="warning" title="本机需要重新登录">刷新页面后用新口令登录。</Note> : null}
        {state.rotatable ? null : <Help>{state.reason}</Help>}
      </Stack>
      {state.rotatable
        ? <Footer status="更换后立即生效。">
            <Button variant="secondary" onClick={rotate}>更换口令</Button>
          </Footer>
        : null}
    </Section>
  );
}
