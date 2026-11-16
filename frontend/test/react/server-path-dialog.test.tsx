import { act } from 'react';
import { expect, it, vi } from 'vitest';
import { completeReveal, pickServerFolder, showServerPath } from '../../src/react/components/server-path-dialog';
import { buttonNamed, click, settle, type } from './render';

it('桌面选择直接沿用系统结果，服务端选择支持取消与只读浏览', async () => {
  expect(await pickServerFolder('', vi.fn().mockResolvedValue({ path: '/desktop' }))).toBe('/desktop');
  const request = vi.fn().mockResolvedValueOnce({ mode: 'server', path: null, roots: ['/media'], directories: [] })
    .mockResolvedValue({ mode: 'server', path: '/media', roots: ['/media'], directories: [] });
  let selected!: Promise<string | null>;
  await act(async () => { selected = pickServerFolder('', request) });
  await settle();
  expect(buttonNamed('选择此目录')?.disabled).toBe(true);
  await click(buttonNamed('/media'));
  await type(document.querySelector<HTMLInputElement>('input[aria-label="服务端目录路径"]'), '/media/unread');
  expect(buttonNamed('选择此目录')?.disabled).toBe(true);
  await type(document.querySelector<HTMLInputElement>('input[aria-label="服务端目录路径"]'), '/media');
  expect(request).toHaveBeenLastCalledWith({ initial: '/media', purpose: 'media', offset: 0 });
  await click(buttonNamed('选择此目录'));
  expect(await selected).toBe('/media');
  await act(async () => { selected = pickServerFolder('', request) });
  await click(buttonNamed('取消'));
  expect(await selected).toBeNull();
});

it('初始路径失效时仍可从挂载根重新选择', async () => {
  const request = vi.fn().mockResolvedValueOnce({ mode: 'server', path: null, roots: ['/media'], directories: [] })
    .mockRejectedValueOnce(new Error('媒体目录不可读取'))
    .mockResolvedValue({ mode: 'server', path: '/media', roots: ['/media'], directories: [], next_offset: null });
  let selected!: Promise<string | null>;
  await act(async () => { selected = pickServerFolder('/missing', request) });
  await settle();
  expect(request).toHaveBeenNthCalledWith(1, { initial: '/missing', purpose: 'media', start: true });
  expect(document.body.textContent).toContain('媒体目录不可读取');
  expect(buttonNamed('选择此目录')?.disabled).toBe(true);
  await click(buttonNamed('/media'));
  await click(buttonNamed('选择此目录'));
  expect(await selected).toBe('/media');
});

it('文件占满前一批时可以继续读取后面的文件夹', async () => {
  const request = vi.fn().mockResolvedValueOnce({ mode: 'server', path: null, roots: ['/media'], directories: [] })
    .mockResolvedValueOnce({ mode: 'server', path: '/media', roots: ['/media'], directories: [], next_offset: 500 })
    .mockResolvedValue({ mode: 'server', path: '/media', roots: ['/media'], directories: [{ name: '后面的目录', path: '/media/later' }], next_offset: null });
  let selected!: Promise<string | null>;
  await act(async () => { selected = pickServerFolder('', request) });
  await click(buttonNamed('/media'));
  await click(buttonNamed('继续读取'));
  expect(request).toHaveBeenLastCalledWith({ initial: '/media', purpose: 'media', offset: 500 });
  expect(buttonNamed('后面的目录')).not.toBeNull();
  expect(buttonNamed('继续读取')).toBeNull();
  await click(buttonNamed('取消'));
  await selected;
});

it('无桌面的数据目录可手填，容器数据卷只提供配置说明', async () => {
  const request = vi.fn().mockResolvedValue({ mode: 'manual', path: '/data', editable: true, container: false });
  let selected!: Promise<string | null>;
  await act(async () => { selected = pickServerFolder('/data', request, 'data') });
  await type(document.querySelector<HTMLInputElement>('input[aria-label="服务端数据目录"]'), '/srv/peach-data');
  await click(buttonNamed('使用此目录'));
  expect(await selected).toBe('/srv/peach-data');
  expect(request).toHaveBeenCalledWith({ initial: '/data', purpose: 'data', start: true });
  request.mockResolvedValue({ mode: 'manual', path: '/data', editable: false, container: true });
  await act(async () => { selected = pickServerFolder('/data', request, 'data') });
  expect(buttonNamed('使用此目录')).toBeNull();
  expect(document.querySelector<HTMLInputElement>('input')?.readOnly).toBe(true);
  await click(buttonNamed('关闭'));
  expect(await selected).toBeNull();
});

it('服务端位置提供可选中的路径，不声称已打开桌面', async () => {
  let done!: Promise<void>;
  await act(async () => { done = showServerPath({ path: '/media/影片.mp4', container: true, media_root: '/media', relative_path: '影片.mp4' }) });
  const input = document.querySelector<HTMLInputElement>('input[aria-label="服务端文件位置"]')!;
  expect(input.value).toBe('/media/影片.mp4');
  expect(input.readOnly).toBe(true);
  await click(buttonNamed('关闭'));
  await done;
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it('位置回执共用服务端弹层，不误报桌面成功', async () => {
  const success = vi.fn();
  let done!: Promise<void>;
  await act(async () => { done = completeReveal({ mode: 'server', path: '/media/影片.mp4' }, success) });
  expect(success).not.toHaveBeenCalled();
  await click(buttonNamed('关闭'));
  await done;
  await completeReveal({ ok: true }, success);
  expect(success).toHaveBeenCalledOnce();
});
