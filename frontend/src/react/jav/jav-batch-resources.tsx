import { Heading } from 'react-aria-components';
import { useQuery } from '@tanstack/react-query';
import { RiCloseLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { apiGet, errorMessage } from '../../api';
import { ModalFrame } from '../components/modal-frame';
import { Note } from '../components/note';
import { WantMagnets } from '../wants/want-magnets';
import { DOWNLOADS_KEY, DOWNLOADS_URL } from '../activity/downloads-panel';
import type { DownloadsSnapshot } from '../bundle';
import type { Discovery } from './jav';

export function JavBatchResources({ items, close, readOnly, receipt }: {
  items: Discovery[] | null; close(): void; readOnly: boolean; receipt(message: string): void;
}) {
  const downloads = useQuery({ queryKey: DOWNLOADS_KEY,
    queryFn: ({ signal }) => apiGet<DownloadsSnapshot>(`${DOWNLOADS_URL}?limit=50`, signal), enabled: Boolean(items) });
  const provider = downloads.data?.providers.find(row => row.configured)?.key || '';
  return <ModalFrame isOpen={Boolean(items)} onOpenChange={open => { if (!open) close() }} width="collections">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-separator-border bg-background-full px-5 py-4">
      <Heading slot="title" className="text-title-2-medium text-text-primary"><span data-copy-key="jav.resources.title">查找所选资源</span> · {items?.length || 0} 部</Heading>
      <Button iconOnly variant="ghost" leadingIcon={RiCloseLine} aria-label="关闭批量资源查找" onClick={close} />
    </div>
    <div className="flex min-w-0 flex-col gap-6 p-5">
      {downloads.error ? <Note tone="error">下载配置未取得：{errorMessage(downloads.error)}</Note> : null}
      {items?.map(item => <section key={item.code} aria-label={item.code} className="flex min-w-0 flex-col gap-2">
        <h3 className="text-headline-medium text-text-primary">{item.code}</h3>
        {item.title ? <p className="text-body-2-regular text-text-secondary">{item.title}</p> : null}
        <WantMagnets want={{ id: item.id, code: item.code, title: item.title, release_date: item.release_date || null }}
          queryUrl={`/api/jav/resources?code=${encodeURIComponent(item.code)}`} eager
          readOnly={readOnly} downloads={downloads.data} provider={provider} toast={receipt} />
      </section>)}
    </div>
  </ModalFrame>;
}
