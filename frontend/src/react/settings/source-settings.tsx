/* 来源与订阅按凭据、采集、作品资料站点和资源搜索的顺序排列。 */
import { useQuery } from '@tanstack/react-query';
import { ButtonLink } from '@/components/base/buttons/button';
import type { ConfigurationGroupProps } from '../bundle';
import { Credentials } from '../follow-manage/credentials';
import { fetchCredentials, FOLLOW_CREDENTIALS_KEY } from '../follow-manage/follow-manage';
import { Note } from '../components/note';
import { errorMessage } from '../../api';
import { credentialsSkeleton } from '../../configuration-skeleton';
import { ConfigurationContents } from './configuration-contents';
import { EntryLinksForm } from './entry-links-settings';
import { IndexerSettings } from './indexer-settings';
import { ScrapingBrowserSettings } from './scraping-browser-settings';
import { SectionSkeleton } from './section';
import { FollowPreferenceRows } from './service-preferences';
import { WantSearchSettings } from './want-search-settings';
import { CoverFallbackSettings } from './cover-fallback-settings';
import { t } from '../../i18n';

export function SourceSettings({ data, receipt, active, issues }: ConfigurationGroupProps & { active: boolean }) {
  const credentials = useQuery({ queryKey: FOLLOW_CREDENTIALS_KEY,
    queryFn: ({ signal }) => fetchCredentials(signal), enabled: active, refetchOnMount: 'always' });
  return <>
    {issues}
    <ConfigurationContents entries={[
      { id: 'sources-credentials', label: t('follow:sourceCredentials.sectionTitle'), content: <>
        <div data-guide-target="sources"><ButtonLink href="/sources" variant="secondary">{t('settings:sourceSettings.sourcesLink')}</ButtonLink></div>
        {credentials.data
          ? <Credentials data={credentials.data} readOnly={Boolean(data.ledger_read_only)} toast={receipt} embedded />
          : credentials.error
            ? <Note tone="error" title={t('settings:sourceSettings.credentialsFailed')}>{errorMessage(credentials.error)}</Note>
            : active ? <SectionSkeleton label={t('settings:sourceSettings.loadingCredentials')} html={credentialsSkeleton} /> : null}
      </> },
      { id: 'sources-follow-fetch', label: t('settings:followFetch.title'), content: <FollowPreferenceRows receipt={receipt} /> },
      { id: 'sources-scraping-browser', label: t('settings:scrapingBrowser.title'), content: <ScrapingBrowserSettings receipt={receipt} /> },
      { id: 'sources-covers', label: t('settings:coverFallback.title'), content: <CoverFallbackSettings receipt={receipt} /> },
      data.entry_links && { id: 'sources-entry-links', label: t('settings:entryLinks.title'),
        content: <EntryLinksForm initial={data.entry_links} receipt={receipt} /> },
      { id: 'sources-indexers', label: t('settings:indexers.title'), content: <IndexerSettings receipt={receipt} /> },
      { id: 'sources-want-search', label: t('settings:wantSearch.title'), content: <WantSearchSettings receipt={receipt} /> },
    ]} />
  </>;
}
