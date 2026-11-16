/* 用户脚本通过同源桥接页回报版本与当前地址的配对状态。 */
import { Button } from '@/components/base/buttons/button';
import { cardClass } from '../components/card';
import { ConnectionStatus } from '../components/connection-status';
import { StatusLabel } from '../components/status-label';
import { ExternalLink } from './section';
import { busyProps } from './busy-props';
import { useUserscriptProbe } from './userscript-probe';
import { t } from '../../i18n';

export function userscriptVersionSupported(version: string, minimumVersion: string) {
  const current = version.split('.').map(Number);
  const minimum = minimumVersion.split('.').map(Number);
  for (let index = 0; index < 3; index++) {
    if (current[index] !== minimum[index]) return current[index]! > minimum[index]!;
  }
  return true;
}

export function UserscriptStatus({ enabled, release }: {
  enabled: boolean; release: { version: string; minimum_version: string; install_url: string };
}) {
  const { frame, attempt, status, retry } = useUserscriptProbe();
  const installed = typeof status === 'object';
  const required = installed && !userscriptVersionSupported(status.version, release.minimum_version);
  const update = installed && !userscriptVersionSupported(status.version, release.version);
  const tone = status === 'checking' ? 'progress' : status === 'missing' ? 'neutral'
    : required || update || !status.paired ? 'warning' : 'success';
  const label = status === 'checking' ? t('settings:userscriptStatus.checking') : status === 'missing' ? t('settings:mediaLibraries.dependencyMissing')
    : required ? t('settings:userscriptStatus.updateRequired') : update ? t('settings:userscriptStatus.updateAvailable') : status.paired ? t('settings:userscriptStatus.connected') : t('settings:userscriptStatus.unpaired');
  const copyState = status === 'checking' ? 'checking' : status === 'missing' ? 'missing'
    : required ? 'required' : update ? 'available' : status.paired ? enabled ? 'enabled' : 'disabled' : 'unpaired';
  return <>
    <iframe ref={frame} key={attempt} title={t('settings:userscriptStatus.probeFrame')} hidden src="/integrations/peach-userscript-bridge" />
    <div aria-live="polite" data-userscript-status="" className={cardClass({ variant: 'raised', bordered: 'line', className: 'flex flex-col gap-3' })}>
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-body-medium text-text-primary">{t('settings:userscriptStatus.title')}</span>
        <ConnectionStatus tone={tone}><span data-copy-key={`userscript.${copyState}.status`}>{label}</span></ConnectionStatus></div>
      {installed ? <p data-copy-key="userscript.installed.version" className="text-body-regular text-text-secondary">{t('settings:userscriptStatus.installedVersion')}{status.version}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-body-regular text-text-secondary">{t('settings:userscriptStatus.addFromBrowser')}</span>
        <StatusLabel tone={enabled ? 'success' : 'neutral'}><span data-copy-key={`userscript.adding.${enabled ? 'enabled' : 'disabled'}`}>{enabled ? t('settings:shared.enabled') : t('settings:shared.notEnabled')}</span></StatusLabel></div>
      <p data-copy-key={`userscript.${copyState}.message`} className="text-caption-1-regular text-text-secondary">{status === 'checking' ? t('settings:userscriptStatus.checkingHelp') : status === 'missing'
        ? t('settings:userscriptStatus.missingHelp')
        : required ? t('settings:userscriptStatus.updateRequiredHelp', { version: release.minimum_version })
        : update ? t('settings:userscriptStatus.updateAvailableHelp', { version: release.version })
        : status.paired ? enabled ? t('settings:userscriptStatus.readyHelp') : t('settings:userscriptStatus.addingDisabledHelp')
        : t('settings:userscriptStatus.pairHelp')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {status === 'missing' || required || update ? <ExternalLink href={release.install_url}><span data-copy-key={`userscript.${status === 'missing' ? 'install' : 'update'}.action`}>{required || update ? t('settings:userscriptStatus.update') : t('settings:userscriptStatus.install')}</span></ExternalLink> : null}
        {status === 'missing' ? <ExternalLink href="https://www.tampermonkey.net/faq.php#Q209">{t('settings:userscriptStatus.permissionGuide')}</ExternalLink> : null}
        <Button variant="secondary" type="button" {...busyProps(status === 'checking')}
          onClick={retry}>{t('settings:userscriptStatus.checkAgain')}</Button>
      </div>
    </div>
  </>;
}
