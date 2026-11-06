import { useState, type ReactNode } from 'react';
import { Button } from '@/components/base/buttons/button';
import { CloudDownloadDialog, type DownloadPrefill } from '../activity/cloud-download-dialog';
import { JAV_TABS, javPath } from './jav';
import { BoardTabs } from '../components/board-tabs';

/** 页头一行：标题、分区自己的筛选框（同名册页的 `IndexSearch`，靠右）、查找资源。馆藏用目录顶栏的搜索，不传。 */
export function JavHeader({ tab, navigate, find, search }: {
  tab: string; navigate(path: string): void; find(): void; search?: ReactNode;
}) {
  return <div className="flex w-full flex-col gap-4">
    <div className="flex min-w-0 flex-wrap items-center gap-3 max-board-narrow:gap-x-2">
      <h2 data-page-title="" className="text-display-4-medium text-text-primary max-board-narrow:text-title-1-medium">JAV</h2>
      {search}
      <Button variant="primary" className={search ? 'flex-none' : 'ml-auto flex-none'} onClick={find}>查找资源</Button>
    </div>
    <BoardTabs tabs={JAV_TABS.map(([value, label]) => ({ value, label }))} value={tab}
      label="JAV 分区" className="" onChange={key => navigate(javPath(key))} />
  </div>;
}

/** 馆藏沿用目录的网格、筛选和搜索，分区导航与资源查找放在目录页头。 */
export function JavLibraryHeader({ navigate, receipt }: { navigate(path: string): void; receipt(message: string): void }) {
  const [download, setDownload] = useState<DownloadPrefill | null>(null);
  return <>
    <JavHeader tab="library" navigate={navigate} find={() => setDownload({})} />
    <CloudDownloadDialog prefill={download} close={() => setDownload(null)} receipt={receipt} />
  </>;
}
