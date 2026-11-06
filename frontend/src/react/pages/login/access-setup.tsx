/* Docker 访问设置：已经配置过、还没有访问策略的部署，登录页换成这一张卡（ADR-0149）。全新部署走首次设置页。
 *
 * 和桌面首次设置的访问部分同一套控件：「访问密码」开关、两框密码与一句说明。开着时设访问密码，
 * 关掉就是明确选了免登录，按钮跟着写清楚是哪一种。提交走 `POST /api/configuration/access/first`，
 * 成功后浏览器带着服务端签发的会话（免登录时不需要）去 `next`。字段错误写回各自框下；来源不对、
 * 别人已经设过这类整页的原因放在按钮上方。 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/base/buttons/button';
import { Label } from '@/components/base/input/label';
import { Switch } from '@/components/base/switch/switch';

import { Note } from '../../components/note';
import { PasswordPair } from '../../settings/password-pair';
import { busyProps } from '../../settings/busy-props';
import { Help } from '../../settings/section';
import { AuthCard, CardGroup } from '../auth-card';
import type { PageData } from '../page-data';

export const FIRST_ACCESS_URL = '/api/configuration/access/first';

type Errors = Partial<Record<'password' | 'confirmation', string>>;

const go = (url: string) => window.location.assign(url);

export function AccessSetup({ data, navigate = go }: { data: PageData; navigate?: (url: string) => void }) {
  const [passwordOn, setPasswordOn] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure('');
    setErrors({});
    const body = passwordOn
      ? { mode: 'password', password, confirmation, next: data.next || '/' }
      : { mode: 'open', next: data.next || '/' };
    try {
      const response = await fetch(FIRST_ACCESS_URL, {
        method: 'POST', credentials: 'same-origin', body: JSON.stringify(body),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      });
      const answer = await response.json().catch(() => null) as { url?: string; error?: string; errors?: Errors } | null;
      if (response.ok) {
        navigate(answer?.url || '/');
        return;
      }
      if (answer?.errors && Object.keys(answer.errors).length) setErrors(answer.errors);
      else setFailure(answer?.error || '没能保存访问设置，请重试');
    } catch {
      setFailure('连接不到 Peach，请确认它仍在运行后重试');
    }
    setBusy(false);
  };

  return (
    <AuthCard title="访问设置" lede="这台 Peach 还没有访问设置，先决定打开时要不要登录。">
      <form aria-labelledby="auth-card-title" className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
        <CardGroup first>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Label id="access-setup-title" elementType="span">访问密码</Label>
              <p id="access-setup-description" className="text-body-2-regular text-text-secondary">开启后，访问 Peach 需要先登录。</p>
            </div>
            <Switch aria-labelledby="access-setup-title" aria-describedby="access-setup-description"
              isSelected={passwordOn} onChange={(on) => { setPasswordOn(on); setErrors({}); }} />
          </div>
          <Help>局域网访问推荐设置密码。未设置时，同一网络中能连接 Peach 的设备可直接进入。</Help>
          {passwordOn
            ? <PasswordPair label="访问密码" password={password} confirmation={confirmation}
                onPassword={(value) => { setPassword(value); setErrors({}); }}
                onConfirmation={(value) => { setConfirmation(value); setErrors({}); }}
                passwordError={errors.password ? <span role="alert">{errors.password}</span> : undefined}
                passwordHint="请输入 8–256 个字符。"
                confirmationError={errors.confirmation ? <span role="alert">{errors.confirmation}</span> : undefined} />
            : null}
        </CardGroup>
        {failure ? <Note tone="error">{failure}</Note> : null}
        <Button type="submit" className="w-full" {...busyProps(busy)}>
          {passwordOn ? '设置密码并进入' : '免登录进入'}
        </Button>
      </form>
    </AuthCard>
  );
}
