import { Button } from '@/components/base/buttons/button';
import { resetSidebarOrder } from '../../sidebar';
import { t } from '../../i18n';
import { restoreNavigationOrder } from '../components/navigation-order';
import { OrderedPreferenceList } from '../components/ordered-preference-list';
import { useCommitNavigationOrder } from '../sidebar/sidebar-order';
import { Icon } from './icon';
import type { SettingsPanelHost } from './settings-panel-api';

export function SidebarOrder({ host }: { host: SettingsPanelHost }) {
  const commit = useCommitNavigationOrder(host.store);
  const order = host.store.value.sidebarOrder;
  const defaults = resetSidebarOrder(order);
  const items = host.navCatalog.map(([key, label, glyph]) => ({ key, label, icon: <Icon name={glyph ?? ''} /> }));
  return <OrderedPreferenceList id="sidebarOrderSetting" items={items} order={order} onChange={commit}
    chooseLabel={t('settings:sidebarOrder.pickPage')} allShown={t('settings:sidebarOrder.allShown')}
    footer={order.join(',') !== defaults.join(',') ? <div className="peach-react"><Button variant="secondary" size="small"
      onClick={() => restoreNavigationOrder({ label: t('settings:sidebarOrder.groupLabel'), keys: order, defaults, commit })}>
      {t('settings:sidebarOrder.reset')}
    </Button></div> : null} />;
}
