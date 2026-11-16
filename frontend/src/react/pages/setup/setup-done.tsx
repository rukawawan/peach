/* 设置完成：扫描是否已排队、进入 Peach 的入口，运行信息默认折叠。口令不出现在页面上。
 *
 * 独立包的服务端在 `redirect` 里给入口地址，过 `RESTART_REDIRECT_MS` 自己跳过去，与配置页保存后
 * 等托盘换进程的时长是同一个数。 */
import { useEffect, useRef } from 'react';

import { ButtonLink } from '@/components/base/buttons/button';

import { RESTART_REDIRECT_MS } from '../../restart-redirect';
import { Disclosure, ExternalLink, Fact, FactList } from '../../settings/section';
import type { SetupDone } from './setup-api';
import { SetupShell } from './setup-scene';
import { t } from '../../../i18n';

export function SetupDoneView({ done }: { done: SetupDone }) {
  const entry = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    document.title = t('shell:setupDone.documentTitle');
    entry.current?.focus();
  }, []);

  useEffect(() => {
    const target = done.redirect;
    if (!target) return undefined;
    const timer = setTimeout(() => location.assign(target), RESTART_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [done.redirect]);

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
