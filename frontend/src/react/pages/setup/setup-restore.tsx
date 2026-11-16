import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';

import { busyProps } from '../../settings/busy-props';
import { describeFailure, restoreSetup, SetupRequestError, type SetupDone } from './setup-api';
import { SetupShell } from './setup-scene';
import { t } from '../../../i18n';

export function SetupRestore({ onDone, onBack }: { onDone: (done: SetupDone) => void; onBack: () => void }) {
  const [path, setPath] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      onDone(await restoreSetup(path));
    } catch (cause) {
      const detail = cause instanceof SetupRequestError ? cause.errors?.data_root : undefined;
      setError(typeof detail === 'string' ? detail : describeFailure(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <SetupShell step="restore">
    <form data-setup-form-panel="" onSubmit={submit} noValidate aria-labelledby="auth-card-title">
      <div data-setup-top=""><span className="text-body-2-regular text-text-secondary">{t('shell:setupRestore.eyebrow')}</span></div>
      <div data-setup-step-scroll=""><div data-setup-step-content="">
      <header data-setup-step-heading="">
        <h1 id="auth-card-title" ref={heading} tabIndex={-1} className="text-title-1-semibold text-text-primary">{t('shell:setupForm.useExistingData')}</h1>
        <p className="text-body-regular text-text-secondary">{t('shell:setupRestore.lede')}</p>
      </header>
      <div><Input label={t('shell:setupRestore.dataDirectory')} value={path} onChange={setPath} isRequired autoComplete="off" spellCheck="false"
        validationBehavior="aria" isInvalid={Boolean(error)}
        hint={error ? <span role="alert">{error}</span> : t('shell:setupRestore.dataDirectoryHint')} /></div>
      </div></div>
      <footer data-setup-footer="" data-copy-interact>
        <Button variant="ghost" onClick={() => { if (!busy) onBack(); }} aria-disabled={busy || undefined}>{t('shell:setupRestore.backToSetup')}</Button>
        <Button type="submit" {...busyProps(busy)}>{busy ? t('shell:setupRestore.connecting') : t('shell:setupRestore.useDirectory')}</Button>
      </footer>
    </form>
    </SetupShell>
  );
}
