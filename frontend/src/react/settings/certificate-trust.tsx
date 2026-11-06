/* 让其他设备信任本机 HTTPS 证书：下载本机 CA、核对 SHA-256 指纹、手机扫码下载。
 *
 * 下发的只有 CA 的公开证书，服务端重新编码后给出，私钥不经过这里。二维码里的链接带一个
 * 十分钟有效的签名，手机不用先登录（ADR-0142）；页面开着时在过期前重取一次。
 * 指纹与到期日用配置页共用的 `FactList`，各平台的安装步骤是 BoardUI `SettingsRow`，下载键是 `ButtonLink`。 */
import { useQuery } from '@tanstack/react-query';
import { RiDownloadLine } from '@remixicon/react';

import { SettingsRow } from '@/components/application/settings/settings-rows';
import { ButtonLink } from '@/components/base/buttons/button';

import { apiGet } from '../../api';
import { Fact, FactList, Footer, Help, Rows, Section, Stack } from './section';

export interface CertificateState {
  /** openssl `-fingerprint -sha256` 的写法：冒号分隔的大写十六进制。 */
  fingerprint: string;
  /** CA 到期日，`YYYY-MM-DD`。 */
  not_after: string;
  /** 已登录浏览器的下载地址，站内相对路径。 */
  download: string;
  /** 二维码里的完整地址，带限时签名。 */
  phone_url: string;
  /** 签名还剩多少秒有效。 */
  expires_in: number;
  /** 二维码模块矩阵，一行一个字符串，`1` 是深色模块。 */
  qr: string[];
}

/** 二维码按模块画成一条路径，四周留 4 个模块的静区。
 *  扫码要的是固定的深浅反差，所以不跟主题换色：白底黑块，暗色主题下也一样。 */
export function QrCode({ rows, label }: { rows: string[]; label: string }) {
  const size = rows.length + 8;
  const path = rows.flatMap((row, y) => [...row].flatMap((cell, x) => (cell === '1' ? [`M${x + 4} ${y + 4}h1v1h-1z`] : []))).join('');
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges"
      className="size-40 shrink-0 rounded-lg bg-white text-black">
      <path d={path} fill="currentColor" />
    </svg>
  );
}

const STEPS: readonly [string, string][] = [
  ['iPhone／iPad', '用相机扫码，在 Safari 中允许下载描述文件；到「设置 → 通用 → VPN 与设备管理」安装它，再到「设置 → 通用 → 关于本机 → 证书信任设置」打开这张证书的完全信任。'],
  ['Android', '扫码下载后，到「设置 → 安全 → 加密与凭据 → 安装证书 → CA 证书」选择下载的文件。菜单名称因厂商而异。'],
  ['电脑', '点「下载证书」。Windows 双击文件，安装到「受信任的根证书颁发机构」；macOS 在「钥匙串访问」里把它设为「始终信任」。'],
];

export function CertificateTrust({ initial }: { initial: CertificateState }) {
  const query = useQuery({
    queryKey: ['ca-certificate'], initialData: initial,
    queryFn: ({ signal }) => apiGet<CertificateState>('/api/configuration/certificate', signal),
    // 提前一分钟换新签名，扫码那一刻二维码总是有效的。
    staleTime: Infinity, refetchInterval: Math.max(60, initial.expires_in - 60) * 1000,
  });
  const ca = query.data;
  // 32 组十六进制每 8 组一段，宽处两段一行、窄处一段一行，不会只剩一两组折到下一行。
  const groups = ca.fingerprint.split(':');
  const quarters = [0, 8, 16, 24].map(start => groups.slice(start, start + 8).join(':'));
  return (
    <Section title="其他设备信任 HTTPS 证书">
      <Stack>
        <Help>手机、平板和其他电脑第一次打开 HTTPS 地址时会提示证书不受信任。在那台设备上安装并信任本机 CA 证书后不再提示。证书只含公开部分，不含私钥。</Help>
        <div className="flex min-w-0 flex-wrap items-start gap-4">
          <QrCode rows={ca.qr} label="手机扫码下载本机 CA 证书" />
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2">
            <FactList>
              <Fact term="SHA-256 指纹">
                <span className="flex max-w-sm flex-wrap justify-end gap-x-2 font-mono text-caption-1-regular">
                  {quarters.map((quarter, index) => <span key={index} className="whitespace-nowrap">{quarter}</span>)}
                </span>
              </Fact>
              <Fact term="有效期至">{ca.not_after}</Fact>
            </FactList>
            <Help>二维码 10 分钟内有效，页面开着时会自动更新。Android 打不开 .local 地址时，在这台电脑上改用局域网 IP 打开本页再扫码。</Help>
          </div>
        </div>
      </Stack>
      <Rows>
        {STEPS.map(([label, text]) => <SettingsRow key={label} label={label} description={text} />)}
      </Rows>
      <Stack divided>
        <Help>装好后在设备的证书详情里核对 SHA-256 指纹，与上面一致才算装对。</Help>
      </Stack>
      <Footer>
        <ButtonLink href={ca.download} download="peach-local-ca.crt" leadingIcon={RiDownloadLine}>下载证书</ButtonLink>
      </Footer>
    </Section>
  );
}
