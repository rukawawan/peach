/* 用访问密码登录过的浏览器，逐台撤销。
 *
 * 列表单独取：服务端要拿这次请求的 cookie 认出哪一行是本机。撤销与改密码同一条边界，
 * 只在运行 Peach 的电脑上做，别处打开只能看。行照 BoardUI `SettingsRow` 的版式，多一个行首终端图标，
 * 标签里浏览器名前是浏览器标志（`BrowserIcon`），系统词前是品牌原色的平台标志（Remix Icon）；
 * `SettingsRow` 的标签只收文字、BoardUI 源码只加不改，所以这一行在这里自己画。本机标记是 `Chip`，
 * 撤销键是 BoardUI `Button`，确认走 `confirmModal()`。 */
import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RiAndroidFill, RiAppleFill, RiComputerLine, RiDeviceLine, RiSmartphoneLine, RiTabletLine, RiWindowsFill,
} from '@remixicon/react';
import { confirmModal } from '@peach/legacy/ui';

import { Chip } from '@/components/base/badges/chip';
import { Button } from '@/components/base/buttons/button';

import { apiGet, apiSend, errorMessage } from '../../api';
import { BrowserIcon, browserIconId } from '../components/browser-icon';
import { devicesSkeleton, rememberShape } from '../../configuration-skeleton';
import { ErrorText, Footer, Help, Rows, Section, SectionSkeleton, Stack } from './section';
import { interfaceLanguage, t } from '../../i18n';
import './device-sessions.css';

const URL = '/api/configuration/access/sessions';

export interface DeviceSession {
  id: string; device: string; network: string; remote: boolean;
  created_at: number; last_seen: number; expires: number; legacy: boolean; current: boolean;
}
export interface DeviceSessionList { revision: string; sessions: DeviceSession[]; manageable: boolean }

const deviceName = (row: DeviceSession) => row.device || t('settings:deviceSessions.unknownBrowser');

type Glyph = typeof RiComputerLine;
/* 平台标志与旁边的浏览器标志一样用品牌原色（色值在 device-sessions.css）；Apple 官方标志是单色，用正文色实心；
 * ChromeOS 直接用 Chrome 的彩色标志。行首终端图标是界面字形，保持灰色。 */
const apple = { glyph: RiAppleFill, brand: 'apple' };
const android = { glyph: RiAndroidFill, brand: 'android' };
type Platform = { glyph: Glyph; brand: string } | { browser: string };

/** 服务端 `device_name()` 写出的系统词 → 平台标志与终端形态；不是专名的系统词（安卓平板）按界面语言写。
 *  没有 Linux 通用标志，只给终端图标。 */
const SYSTEMS: Record<string, { platform?: Platform; terminal: Glyph; label?: () => string }> = {
  iPhone: { platform: apple, terminal: RiSmartphoneLine },
  iPad: { platform: apple, terminal: RiTabletLine },
  Android: { platform: android, terminal: RiSmartphoneLine },
  'Android tablet': { platform: android, terminal: RiTabletLine, label: () => t('settings:deviceSessions.androidTablet') },
  ChromeOS: { platform: { browser: 'chrome' }, terminal: RiComputerLine },
  Windows: { platform: { glyph: RiWindowsFill, brand: 'windows' }, terminal: RiComputerLine },
  macOS: { platform: apple, terminal: RiComputerLine },
  Linux: { terminal: RiComputerLine },
};

const MARK = 'inline size-4 -mt-0.5 mr-1 align-middle';

function PlatformMark({ platform }: { platform: Platform }) {
  if ('browser' in platform) return <BrowserIcon name={platform.browser} className={MARK} />;
  const { glyph: Glyph, brand } = platform;
  return <Glyph aria-hidden data-platform-mark={brand} className={MARK} />;
}

/** 设备名是「浏览器 · 系统」：浏览器名前放浏览器标志，系统词前放平台标志；认不出的词照原文、不配图。 */
function DeviceLabel({ row }: { row: DeviceSession }) {
  if (!row.device) return deviceName(row);
  const parts = row.device.split(' · ');
  const system = SYSTEMS[parts.at(-1) ?? ''] ? parts.pop()! : '';
  const browser = parts.join(' · ');
  const platform = system ? SYSTEMS[system]!.platform : undefined;
  return (
    <>
      {browser ? <>{browserIconId(browser) ? <BrowserIcon name={browser} className={MARK} /> : null}{browser}</> : null}
      {browser && system ? ' · ' : null}
      {system ? <>{platform ? <PlatformMark platform={platform} /> : null}{SYSTEMS[system]!.label?.() ?? system}</> : null}
    </>
  );
}

function TerminalIcon({ row }: { row: DeviceSession }) {
  const Terminal = SYSTEMS[row.device.split(' · ').at(-1) ?? '']?.terminal ?? RiDeviceLine;
  return <Terminal aria-hidden className="size-5 shrink-0 text-foreground-icon-secondary" />;
}

/** 与 BoardUI `SettingsRow` 同一套行距、分隔线与字级，左侧多一个终端图标，标签可带标志。 */
function DeviceRow({ row, children }: { row: DeviceSession; children?: ReactNode }) {
  return (
    <div className="flex min-h-13 w-full items-center justify-between gap-4 border-b border-separator-border py-2.5 pr-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <TerminalIcon row={row} />
        <div className="flex min-w-0 flex-col">
          <p className="text-body-regular text-text-primary"><DeviceLabel row={row} /></p>
          <p className="text-body-2-regular text-text-secondary">{describe(row)}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** 最近活动按分钟落盘，所以一分钟以内都写「刚刚」。 */
export function lastSeen(seconds: number, now = Date.now() / 1000): string {
  const elapsed = Math.max(0, now - seconds);
  if (elapsed < 60) return t('settings:deviceSessions.justNow');
  if (elapsed < 3600) return t('settings:deviceSessions.minutesAgo', { count: Math.floor(elapsed / 60) });
  if (elapsed < 86400) return t('settings:deviceSessions.hoursAgo', { count: Math.floor(elapsed / 3600) });
  if (elapsed < 86400 * 30) return t('settings:deviceSessions.daysAgo', { count: Math.floor(elapsed / 86400) });
  return new Date(seconds * 1000).toLocaleDateString(interfaceLanguage);
}

function origin(row: DeviceSession): string {
  if (row.network === 'loopback') return t('settings:deviceSessions.loopback');
  if (!row.network) return '';
  return row.remote ? t('settings:deviceSessions.viaRemoteAccess', { network: row.network }) : row.network;
}

const describe = (row: DeviceSession) => [t('settings:deviceSessions.lastActive', { time: lastSeen(row.last_seen) }), origin(row)].filter(Boolean).join(' · ');

/** 访问密码改了（`revision` 变了）就重新取：旧行已经全部作废。 */
export function DeviceSessions({ revision, receipt }: { revision: string; receipt(message: string): void }) {
  const query = useQuery({
    queryKey: ['access-sessions', revision], refetchOnMount: 'always',
    queryFn: ({ signal }) => apiGet<DeviceSessionList>(URL, signal),
  });
  if (query.error) {
    return <Section title={t('settings:signedInDevices.title')}><Stack><ErrorText>{errorMessage(query.error)}</ErrorText></Stack></Section>;
  }
  if (query.isFetching || !query.data) return <SectionSkeleton label={t('settings:deviceSessions.loading')} html={devicesSkeleton} />;
  return <DeviceList initial={query.data} receipt={receipt} />;
}

function DeviceList({ initial, receipt }: { initial: DeviceSessionList; receipt(message: string): void }) {
  const [list, setList] = useState(initial);
  useEffect(() => setList(initial), [initial]);
  const others = list.sessions.filter(row => !row.current);
  useEffect(() => {
    rememberShape('devices', { rows: Math.min(list.sessions.length, 8), manageable: list.manageable && others.length > 0 });
  }, [list, others.length]);

  const revoke = (row: DeviceSession) => void confirmModal({
    title: t('settings:deviceSessions.revokeTitle'),
    body: t('settings:deviceSessions.revokeBody', { device: deviceName(row), details: describe(row) }),
    confirmLabel: t('settings:deviceSessions.revokeConfirm'),
    onConfirm: async () => {
      setList(await apiSend<DeviceSessionList>(`${URL}/revoke`, { revision: list.revision, id: row.id }));
      receipt(t('settings:deviceSessions.revoked'));
    },
  });
  const revokeOthers = () => void confirmModal({
    title: t('settings:deviceSessions.revokeOthersTitle'),
    body: t('settings:deviceSessions.revokeOthersBody', { count: others.length }),
    confirmLabel: t('settings:deviceSessions.revokeConfirm'),
    onConfirm: async () => {
      const next = await apiSend<DeviceSessionList & { removed: number }>(`${URL}/revoke`, { revision: list.revision, scope: 'others' });
      setList(next);
      receipt(t('settings:deviceSessions.revokedCount', { count: next.removed }));
    },
  });

  return (
    <Section title={t('settings:signedInDevices.title')}>
      {list.sessions.length
        ? <Rows>
            {list.sessions.map(row => (
              <DeviceRow key={row.id} row={row}>
                {row.current
                  ? <Chip color="blue" variant="caption">{t('settings:deviceSessions.thisDevice')}</Chip>
                  : list.manageable
                    ? <Button size="small" variant="secondary" aria-label={t('settings:deviceSessions.revokeDevice', { device: deviceName(row) })}
                        onClick={() => revoke(row)}>{t('settings:deviceSessions.revoke')}</Button>
                    : null}
              </DeviceRow>
            ))}
          </Rows>
        : <Stack><Help>{t('settings:deviceSessions.empty')}</Help></Stack>}
      {!list.manageable && others.length
        ? <Stack divided><Help>{t('settings:deviceSessions.serverOnly')}</Help></Stack>
        : null}
      {list.manageable && others.length
        ? <Footer status={t('settings:signedInDevices.passwordChangeNotice')}>
            <Button variant="secondary" onClick={revokeOthers}>{t('settings:signedInDevices.revokeOthers')}</Button>
          </Footer>
        : null}
    </Section>
  );
}
