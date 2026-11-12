import { useQuery } from '@tanstack/react-query';
import { errorMessage } from '../../api';
import type { CleanupToolKey } from '../../cleanup-tools';
import type { DataCleanupProps } from '../bundle';
import { Page } from '../components/page';
import { Fieldset, FieldsetTitle } from '../components/fieldset';
import { Note } from '../components/note';
import { MediaRepairCard } from '../media-repair/media-repair-card';
import { fetchMediaSources, MEDIA_SOURCES_KEY } from '../media-sources';
import { LinkManager } from './link-manager';
import { OrganizeCard } from './organize-card';
import { OrphanRecordsCard } from './orphan-records-card';
import { PerformerDeleteCard } from './performer-delete-card';
import { hasResourceRoots } from './resource-sync';
import { ResourceSyncCard } from './resource-sync-card';
import { t } from '../../i18n';
import { WesternScrapeCard } from './western-scrape-card';
import { JasnaCard } from './jasna-card';
import { AiSubtitlesCard } from './ai-subtitles-card';
import { ShortAdsCard } from './short-ads-card';
import { FolderPerformersCard } from './folder-performers-card';

function ResourceSyncPage({ toast }: Pick<DataCleanupProps, 'toast'>) {
  const sources = useQuery({ queryKey: MEDIA_SOURCES_KEY, queryFn: ({ signal }) => fetchMediaSources(signal) });
  if (sources.isError) return <Note tone="error" title={t('cleanup:resourceSync.storageLoadFailed')}>{errorMessage(sources.error)}</Note>;
  if (sources.isPending) return <p role="status">{t('cleanup:resourceSync.storageLoading')}</p>;
  return hasResourceRoots(sources.data) ? <ResourceSyncCard toast={toast} />
    : <Fieldset layout="stack" label={t('cleanup:tools.resourceSync')}><FieldsetTitle>{t('cleanup:tools.resourceSync')}</FieldsetTitle>
        <p className="text-body-regular text-text-secondary">{t('cleanup:resourceSync.noDirectories')}</p>
        <a href="/settings/library" className="text-body-medium text-accent-600 underline">{t('cleanup:resourceSync.setUpLibrary')}</a>
      </Fieldset>;
}

export function DataCleanupToolPage({ tool, toast, failure }: {
  tool: CleanupToolKey;
} & Pick<DataCleanupProps, 'toast' | 'failure'>) {
  const notify = (message: string) => toast(message);
  let content;
  switch (tool) {
    case 'organize': content = <OrganizeCard toast={notify} failure={failure} />; break;
    case 'resource-sync': content = <ResourceSyncPage toast={toast} />; break;
    case 'orphan-records': content = <OrphanRecordsCard toast={notify} />; break;
    case 'media-repair': content = <MediaRepairCard toast={notify} />; break;
    case 'links': content = <LinkManager />; break;
    case 'batch-delete': content = <PerformerDeleteCard toast={notify} />; break;
    case 'western-scrape': content = <WesternScrapeCard toast={notify} />; break;
    case 'jasna': content = <JasnaCard toast={notify} />; break;
    case 'ai-subtitles': content = <AiSubtitlesCard toast={notify} />; break;
    case 'short-ads': content = <ShortAdsCard toast={notify} />; break;
    case 'folder-performers': content = <FolderPerformersCard toast={notify} />; break;
  }
  return <Page>{content}</Page>;
}
