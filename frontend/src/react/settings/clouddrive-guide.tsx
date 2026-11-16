/* 媒体来源选了网盘时的 CloudDrive 起步配置。
 *
 * 页内只留填哪里、填多少、怎么确认；三处缓存的分工、换算与起步值的来源在
 * `docs/CLOUDDRIVE.md`，这里链过去，同一段话不在两处维护。 */
import { Disclosure, ExternalLink, Help } from './section';
import { t } from '../../i18n';

export const CLOUDDRIVE_PROFILES = [
  { name: t('settings:cloudDriveGuide.tierHdd'), cache: '10–20 GiB', read: '256 / 128 KB', task: t('settings:cloudDriveGuide.tasksOne') },
  { name: t('settings:cloudDriveGuide.tierSata'), cache: '20–50 GiB', read: '256 / 128 KB', task: t('settings:cloudDriveGuide.tasksOneToTwo') },
  { name: t('settings:cloudDriveGuide.tierNvme'), cache: '50–100 GiB', read: '256 / 128 KB', task: t('settings:cloudDriveGuide.tasksTwoPlus') },
] as const;

const READINGS = [['cache', t('settings:cloudDriveGuide.cacheLimit')], ['read', t('settings:cloudDriveGuide.readLength')], ['task', t('settings:cloudDriveGuide.concurrentVideos')]] as const;

export function CloudDriveGuide() {
  return (
    <div className="@container flex flex-col gap-3">
      <Disclosure summary={t('settings:cloudDriveGuide.title')}>
        <Help>
          {t('settings:cloudDriveGuide.mountFirst')}
          <ExternalLink href="https://www.clouddrive2.com/help.html">{t('settings:cloudDriveGuide.mountHelp')}</ExternalLink>
        </Help>
        <Help>{t('settings:cloudDriveGuide.cacheHelp')}</Help>
        <Help>{t('settings:cloudDriveGuide.writeAccess')}</Help>
        {/* 三档同形、跨档比较：窄处每档一块纵排，宽处三项读数排成三列对齐。 */}
        <ul aria-label={t('settings:cloudDriveGuide.tiersLabel')} className="flex flex-col gap-2">
          {CLOUDDRIVE_PROFILES.map((profile) => (
            <li key={profile.name} className="flex flex-col gap-2 rounded-2lg border border-separator-border bg-background-primary-default p-3">
              <p className="text-body-medium text-text-primary">{profile.name}</p>
              <dl className="inline-grid grid-cols-1 gap-2 @md:grid-cols-3">
                {READINGS.map(([key, term]) => (
                  <div key={key} className="flex flex-col">
                    <dt className="text-caption-1-regular text-text-secondary">{term}</dt>
                    <dd className="text-body-regular text-text-primary">{profile[key]}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body-2-regular text-text-secondary">
          <li>{t('settings:cloudDriveGuide.cacheSettingsTip')}</li>
          <li>{t('settings:cloudDriveGuide.readLengthTip')}</li>
          <li>{t('settings:cloudDriveGuide.cacheTypesTip')}</li>
        </ul>
        <Help>
          <ExternalLink href="https://github.com/peach-mitao/peach/blob/master/docs/CLOUDDRIVE.md">{t('settings:cloudDriveGuide.fullGuide')}</ExternalLink>
        </Help>
      </Disclosure>
    </div>
  );
}
