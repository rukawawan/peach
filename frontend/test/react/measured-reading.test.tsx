import { expect, it } from 'vitest';

import { MeasuredReading } from '../../src/react/follow-manage/measured-reading';
import { mountRoot } from './render';

it('未取得的读数保持不可交互骨架，已取得的相邻读数先显示', async () => {
  const { host, rerender } = await mountRoot(<>
    <MeasuredReading field="creators" figure={26} />
    <MeasuredReading field="subscriptions" figure={undefined} />
  </>);
  const ready = host.querySelector('[data-measured-reading="creators"]')!;
  const waiting = host.querySelector('[data-measured-reading="subscriptions"]')!;
  expect(ready.textContent).toContain('26');
  expect(ready.querySelector('[aria-busy="true"]')).toBeNull();
  expect(waiting.querySelector('[aria-busy="true"]')).not.toBeNull();
  expect(waiting.querySelector('[skullet-loading]')?.getAttribute('aria-hidden')).toBe('true');
  expect(waiting.querySelector('[skullet-loading]')?.hasAttribute('inert')).toBe(true);
  expect(waiting.querySelector('button, input, img, video')).toBeNull();
  await rerender(<>
    <MeasuredReading field="creators" figure={26} />
    <MeasuredReading field="subscriptions" figure={0} />
  </>);
  expect(host.querySelector('[aria-busy="true"]')).toBeNull();
  expect(host.querySelector('[data-measured-reading="subscriptions"] [data-follow-reading]')?.textContent).toBe('0 位');
});

it('首次读取失败显示未取得，后台重读失败保留已有数值', async () => {
  const { host, rerender } = await mountRoot(<MeasuredReading field="updates" figure={undefined} failed />);
  expect(host.textContent).toContain('未取得');
  expect(host.querySelector('[aria-busy="true"]')).toBeNull();
  await rerender(<MeasuredReading field="updates" figure={1250} failed />);
  expect(host.textContent).toContain((1250).toLocaleString());
  expect(host.textContent).not.toContain('未取得');
  expect(host.querySelector('[aria-busy="true"]')).toBeNull();
});
