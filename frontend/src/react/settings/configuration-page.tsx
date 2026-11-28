/* 配置页（`/settings/library`）：这台运行 Peach 的电脑上那些要「保存配置」的多字段表单。
 * 每个分区各占一格页签，一次只摆一组；本机配置权限与数据库写入权限由服务端分别判定。
 * 设置弹层里的「Peach 配置」入口指到这里。
 *
 * 每个分区的页签面板共用页头。页签条第一帧就在，和整页同一次提交画出来。 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { CONFIGURATION_SECTIONS, configurationDescriptionKey, peachHistory, sectionTitle, shellNavigate, settingsPath } from '@peach/history';

import { errorMessage } from '../../api';
import { Button } from '@/components/base/buttons/button';
import type { ConfigurationData, ConfigurationPanel, ConfigurationProps } from '../bundle';
import { Note } from '../components/note';
import { SortableBoardTabs } from '../components/navigation-order';
import { CONFIGURATION_KEY, fetchConfiguration } from './configuration';
import { DownloadGroup } from './download-settings';
import { MaintenanceSettings } from './maintenance-settings';
import { MediaSettings } from './media-settings';
import { NetworkSettings } from './network-settings';
import { SourceSettings } from './source-settings';
import { AILibrarySettings } from './ai-library-settings';
import { groupRoot } from './configuration-panel';
import { downloadsShape, maintenanceShape, networkShape } from './configuration-shape';
import { rememberShape } from '../../configuration-skeleton';
import { busyProps } from './use-action';
import { t } from '../../i18n';

export function ConfigurationPage({ receipt, reopenTutorial, section = '', diagnostics }: ConfigurationProps & { diagnostics?: ReactElement }) {
  const config = useQuery({
    queryKey: CONFIGURATION_KEY, queryFn: ({ signal }) => fetchConfiguration(signal),
  });
  const data = config.data;
  if (!data) {
    return (
      <div className="ui-configpage">
        <Note tone="error" title={t('settings:configurationPage.loadFailedTitle')}>
          {config.error ? errorMessage(config.error) : t('settings:configurationPage.loadFailed')}
        </Note>
      </div>
    );
  }
  return <ConfigurationGroups data={data} receipt={receipt} reopenTutorial={reopenTutorial} section={section} diagnostics={diagnostics}
    refreshing={config.isFetching} reload={() => { void config.refetch({ cancelRefetch: false }); }} />;
}

function ConfigurationIssues({ data, sections, reload, refreshing }: {
  data: ConfigurationData; sections: string[]; reload(): void; refreshing: boolean;
}) {
  return <>{sections.map(key => {
    const issue = data.section_errors?.[key];
    return issue ? <Note key={key} tone="error" title={issue.title}
      action={<Button variant="secondary" size="small" onClick={reload} {...busyProps(refreshing)}>{t('settings:shared.reload')}</Button>}>{issue.message}</Note> : null;
  })}</>;
}

interface Group { id: string; title: string; body(active: boolean): ReactElement | undefined }

const COMPACT_CONFIGURATION = '(max-width:1100px)';

/* 页签与面板的 id 前缀按页签条计数：每画出一条新的页签条领一个号。 */
let tabSequence = 0;

/* 页签条是一个 tablist，方向键在整排里走、首尾相接，Home／End 到两头，挪到哪一格就选中哪一格、焦点跟过去。
   分区地址与选中项同步，表单保持挂载。 */
function ConfigurationGroups(
  { data, receipt, reopenTutorial, section, diagnostics, reload, refreshing }: Required<ConfigurationProps> & {
    data: ConfigurationData; diagnostics?: ReactElement; reload(): void; refreshing: boolean;
  },
) {
  const [prefix] = useState(() => `board-tabs-${++tabSequence}`);
  const [chosen, setChosen] = useState(section);
  const workspace = useRef<HTMLDivElement>(null);
  const primaryNav = useRef<HTMLDivElement>(null);
  const previous = useRef(chosen);
  useEffect(() => { setChosen(section) }, [section]);
  /* 下载渠道、网络与访问、应用与维护随这份配置一次画齐：记下结构，下次整页骨架照它排。 */
  useEffect(() => {
    const downloads = downloadsShape(data);
    if (downloads) rememberShape('downloads', downloads);
    rememberShape('network', networkShape(data));
    rememberShape('maintenance', maintenanceShape(data));
  }, [data]);
  useLayoutEffect(() => {
    const nav = primaryNav.current!;
    const root = workspace.current!;
    const measure = () => root.style.setProperty('--settings-nav-height', `${nav.offsetHeight}px`);
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(nav);
    return () => resize.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (previous.current === chosen) return;
    previous.current = chosen;
    const nav = workspace.current?.querySelector<HTMLElement>('.ui-board-local-nav');
    const panel = workspace.current?.querySelector<HTMLElement>('.ui-board-group-active');
    if (!nav || !panel) return;
    const boundary = parseFloat(getComputedStyle(nav).top);
    if (!Number.isFinite(boundary) || nav.getBoundingClientRect().top > boundary + 1) return;
    const top = matchMedia(COMPACT_CONFIGURATION).matches ? nav.getBoundingClientRect().bottom + 8 : boundary;
    window.scrollTo(0, Math.max(0, window.scrollY + panel.getBoundingClientRect().top - top));
  }, [chosen]);
  const choose = (title: string) => {
    setChosen(title);
    shellNavigate(settingsPath(title), { replace: true, state: peachHistory.navigation.location.state });
  };
  const [narrow, setNarrow] = useState(() => matchMedia(COMPACT_CONFIGURATION).matches);
  useEffect(() => {
    const media = matchMedia(COMPACT_CONFIGURATION);
    const changed = () => setNarrow(media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  const group = { data, receipt };
  const issues = (sections: string[]) => <ConfigurationIssues data={data} sections={sections} reload={reload} refreshing={refreshing} />;
  const networkKeys = ['peach_proxy', 'access', 'tunnel', 'push_discovery',
    ...(data.editable && data.port_editable !== false ? ['media_sources'] : [])];
  const network = Boolean(data.peach_proxy || data.access || data.tunnel || (data.editable && data.port_editable !== false)
    || networkKeys.some(key => data.section_errors?.[key]));
  const downloads = data.downloads;
  const groups: Group[] = [
    { id: 'library', title: CONFIGURATION_SECTIONS.library, body: () => <>
      {issues(['media_sources', 'library_count', 'mount_dependencies'])}
      <MediaSettings {...group} />
    </> },
    { id: 'sources', title: CONFIGURATION_SECTIONS.subscriptions, body: active => <SourceSettings {...group} active={active} issues={issues(['entry_links'])} /> },
    { id: 'ai', title: CONFIGURATION_SECTIONS.ai, body: active => <AILibrarySettings active={active} receipt={receipt} /> },
    ...(downloads || data.section_errors?.downloads ? [{
      id: 'downloads', title: CONFIGURATION_SECTIONS.downloads,
      body: (active: boolean) => <DownloadGroup initial={downloads} receipt={receipt} active={active} issues={issues(['downloads'])} />,
    }] : []),
    ...(network ? [{ id: 'network', title: CONFIGURATION_SECTIONS.network, body: () => <NetworkSettings {...group} issues={issues(networkKeys)} /> }] : []),
    {
      id: 'maintenance', title: CONFIGURATION_SECTIONS.maintenance,
      body: (active) => <>
        {issues(['startup', 'uninstall', 'storage', 'remote_reporting', 'library_sharing', 'updates', 'update_job', 'automatic_updates', 'facts'])}
        <MaintenanceSettings {...group} active={active} reopenTutorial={reopenTutorial} />
      </>,
    },
    { id: 'diagnostics', title: CONFIGURATION_SECTIONS.diagnostics, body: active => active ? diagnostics : undefined },
  ];
  const at = Math.max(0, groups.findIndex((item) => item.title === sectionTitle(chosen)));
  return (
    <div ref={workspace} className="ui-configpage">
      <div ref={primaryNav} className="ui-board-local-nav" data-section-nav="">
        <SortableBoardTabs group="configuration" label={t('settings:configurationPage.sectionsLabel')} value={groups[at].id}
          tabs={groups.map(({ id, title }) => ({ value: id, label: title }))} sectionItems panelPrefix={prefix}
          orientation={narrow ? 'horizontal' : 'vertical'} className=""
          onChange={id => choose(groups.find(group => group.id === id)!.title)} />
      </div>
      {groups.map(({ id, title, body }, i) => {
        const panel: ConfigurationPanel = { index: i, id: `${prefix}-panel-${id}`, labelledBy: `${prefix}-tab-${id}`, active: i === at };
        const description = configurationDescriptionKey(id);
        return <div key={id} {...groupRoot(panel)}>
          <header className="flex min-w-0 flex-col gap-1">
            <h2 className="text-title-2-medium text-text-primary" data-copy-key={`navigation.configurationSections.${id === 'sources' ? 'feeds' : id}`}>{title}</h2>
            <p className="text-body-2-regular text-text-secondary select-text" data-copy-key={'settings.' + description}>
              {t('settings:' + description)}
            </p>
          </header>
          {body(panel.active)}
        </div>;
      })}
    </div>
  );
}
