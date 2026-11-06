/* 设置完成：扫描是否已排队、进入 Peach 的入口，运行信息默认折叠。口令不出现在页面上。
 *
 * 独立包的服务端在 `redirect` 里给入口地址，过 `RESTART_REDIRECT_MS` 自己跳过去，与配置页保存后
 * 等托盘换进程的时长是同一个数。 */
import { useEffect, useRef } from 'react';

import { ButtonLink } from '@/components/base/buttons/button';

import { RESTART_REDIRECT_MS } from '../../restart-redirect';
import { Disclosure, ExternalLink, Fact, FactList } from '../../settings/section';
import type { SetupDone } from './setup-api';
import { SetupShell } from './setup-scene';

export function SetupDoneView({ done }: { done: SetupDone }) {
  const entry = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    document.title = 'Peach · 设置完成';
    entry.current?.focus();
  }, []);

  useEffect(() => {
    const target = done.redirect;
    if (!target) return undefined;
    const timer = setTimeout(() => location.assign(target), RESTART_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [done.redirect]);

  return (
    <SetupShell step="done">
    <section data-setup-form-panel="" aria-labelledby="auth-card-title">
      <div data-setup-top=""><span className="text-body-2-regular text-text-secondary">设置完成</span></div>
      <div data-setup-step-scroll=""><div data-setup-step-content="">
      <header data-setup-step-heading="">
        <h1 id="auth-card-title" className="text-title-1-semibold text-text-primary">可以开始使用了</h1>
        <p className="text-body-regular text-text-secondary">你的 Peach 已准备就绪。</p>
      </header>
      <div>
      <p className="text-body-regular text-text-primary">
        {done.restored ? '已连接已有数据目录。' : done.skip_media
          ? '可在「媒体库与入库」添加媒体目录并开始扫描。' : done.scan_requested
          ? '首次扫描已排队，在后台整理媒体库，期间可以照常使用 Peach。'
          : '稍后在配置页开始扫描媒体库。'}
      </p>
      <Disclosure summary="运行信息">
        <FactList>
          {done.facts.map((fact) => (
            <Fact key={fact.term} term={fact.term}>
              {fact.value}
              {fact.install_tool
                ? <span className="text-text-secondary">可在配置页「应用与维护」里安装。</span>
                : fact.download_url
                ? <ExternalLink href={fact.download_url}>{fact.download_label ?? fact.download_url}</ExternalLink>
                : null}
            </Fact>
          ))}
        </FactList>
      </Disclosure>
      </div></div></div>
      <footer data-setup-footer="" data-setup-footer-end="" data-copy-interact>
        <ButtonLink ref={entry} href={done.url}>{done.history_guide ? '导入浏览器历史记录' : '进入 Peach'}</ButtonLink>
      </footer>
    </section>
    </SetupShell>
  );
}
