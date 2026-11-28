/* 设置完成：扫描是否已排队、进入 Peach 的入口，运行信息默认折叠。口令不出现在页面上。
 *
 * 独立包和容器换成常规服务后自动进入同源入口。改端口时沿用跨源跳转等待。 */
import { useEffect, useRef } from 'react';

import { ButtonLink } from '@/components/base/buttons/button';

import { Note } from '../../components/note';
import { RESTART_REDIRECT_MS } from '../../restart-redirect';
import { Disclosure, ExternalLink, Fact, FactList } from '../../settings/section';
import type { SetupDone } from './setup-api';
import { SetupShell } from './setup-scene';
import { t } from '../../../i18n';
import { pollUntil } from '../../../polling';

const READY_POLL_MS = 500;
const READY_WAIT_MS = 30_000;

export function SetupDoneView({ done }: { done: SetupDone }) {
  const entry = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    document.title = t('shell:setupDone.documentTitle');
    entry.current?.focus();
  }, []);

  useEffect(() => {
    const target = done.redirect;
    if (!target || done.sharing_save_failed) return undefined;
    const destination = new URL(target, location.href);
    if (destination.origin !== location.origin) {
      const timer = setTimeout(() => location.assign(target), RESTART_REDIRECT_MS);
      return () => clearTimeout(timer);
    }
    const controller = new AbortController();
    void pollUntil({
      read: async signal => {
        try {
          const response = await fetch('/healthz', {
            cache: 'no-store',
            signal: AbortSignal.any([signal, AbortSignal.timeout(2000)]),
          });
          if (!response.ok) return false;
          const health = await response.json();
          return health.service === 'peach-api' && health.configured === true && health.db === 'available';
        } catch {
          // 托盘切换时原端口会短暂离线，仍按同一节律确认就绪。
          return false;
        }
      },
      apply: ready => { if (ready) location.assign(target) },
      done: ready => ready,
      signal: controller.signal,
      everyMs: READY_POLL_MS,
      limitMs: READY_WAIT_MS,
    });
    return () => controller.abort();
  }, [done.redirect, done.sharing_save_failed]);

  return (
    <SetupShell step="done">
    <section data-setup-form-panel="" aria-labelledby="auth-card-title">
      <div data-setup-top=""><span className="text-body-2-regular text-text-secondary">{t('shell:setupDone.eyebrow')}</span></div>
      <div data-setup-step-scroll=""><div data-setup-step-content="">
      <header data-setup-step-heading="">
        <h1 id="auth-card-title" className="text-title-1-semibold text-text-primary">{t('shell:setupDone.title')}</h1>
        <p className="text-body-regular text-text-secondary">{t('shell:setupDone.ready')}</p>
      </header>
      <div>
      <p className="text-body-regular text-text-primary">
        {done.restored ? t('shell:setupDone.restored') : done.skip_media
          ? t('shell:setupDone.addMediaLater') : done.scan_requested
          ? t('shell:setupDone.scanQueued')
          : t('shell:setupDone.scanLater')}
      </p>
      {done.sharing_save_failed ? <Note tone="warning">{t('shell:setupDone.librarySharingSaveFailed')}</Note> : null}
      <Disclosure summary={t('shell:setupDone.runtime')}>
        <FactList>
          {done.facts.map((fact) => (
            <Fact key={fact.term} term={fact.term}>
              {fact.value}
              {fact.install_tool
                ? <span className="text-text-secondary">{t('shell:setupDone.installInSettings')}</span>
                : fact.download_url
                ? <ExternalLink href={fact.download_url}>{fact.download_label ?? fact.download_url}</ExternalLink>
                : null}
            </Fact>
          ))}
        </FactList>
      </Disclosure>
      </div></div></div>
      <footer data-setup-footer="" data-setup-footer-end="" data-copy-interact>
        <ButtonLink ref={entry} href={done.url}>{done.history_guide ? t('shell:setupDone.importHistory') : t('shell:setupDone.enter')}</ButtonLink>
      </footer>
    </section>
    </SetupShell>
  );
}
