import type { ReactElement } from 'react';
import { t } from '../../i18n';
import { SectionToc, type TocEntry } from '../components/section-toc';

type ConfigurationEntry = TocEntry & { content: ReactElement };

export function ConfigurationContents({ entries }: { entries: (ConfigurationEntry | false | null | undefined)[] }) {
  const sections = entries.filter((entry): entry is ConfigurationEntry => Boolean(entry));
  if (!sections.length) return null;
  return <SectionToc inline label={t('settings:configurationPage.contents')} entries={sections}>
    {sections.map(({ id, content }) => <div key={id} id={id} className="flex min-w-0 flex-col gap-6">{content}</div>)}
  </SectionToc>;
}
