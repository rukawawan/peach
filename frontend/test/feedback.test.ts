import {describe,expect,it} from 'vitest';
import {requestErrorMessage} from '../src/core';
import {noteHtml,configurationSkeletonHtml} from '../src/ui-kit';

describe('中文错误反馈',()=>{
  it.each(['Failed to fetch','NetworkError when attempting to fetch resource.','Load failed'])('网络异常 %s 给出连接检查方法',message=>{
    expect(requestErrorMessage(new TypeError(message))).toBe('无法连接到 Peach 服务，请确认网络连接正常、Peach 正在运行。');
  });
  it.each([[401,'登录已失效'],[403,'没有执行此操作的权限'],[404,'已不存在'],[429,'过于频繁'],[503,'暂时不可用'],[504,'超时']])('HTTP %s 使用明确原因', (code,reason)=>{
    expect(requestErrorMessage('request failed',code)).toContain(reason);
  });
  it('正文里的 timeout 字样不把 500 读成超时',()=>{
    expect(requestErrorMessage('Traceback: httpx.ReadTimeout raised in handler (timeout=30)',500))
      .toBe('Peach 服务处理失败，请重试；持续失败时查看 Peach 运行日志。');
    expect(requestErrorMessage('read timed out')).toContain('超时');
  });
  it('本机接口的 502 说的是 Peach 服务，不提代理',()=>{
    const text=requestErrorMessage('Bad Gateway',502);
    expect(text).toContain('Peach 服务');
    expect(text).not.toContain('代理');
  });
  it('保留服务端明确的中文原因',()=>{
    expect(requestErrorMessage('媒体盘没有挂载，请先连接媒体盘。',409)).toBe('媒体盘没有挂载，请先连接媒体盘。');
  });
});
describe('持久提示控件',()=>{
  it('配置骨架标题和卡片共用真实页面网格与正文底栏',()=>{
    const host=document.createElement('div');host.innerHTML=configurationSkeletonHtml();
    const page=host.querySelector('.ui-configpage')!;
    expect(page.querySelectorAll(':scope > .ui-configgroup')).toHaveLength(5);
    expect(page.querySelectorAll(':scope > .configfieldset')).toHaveLength(12);
    for(const card of page.querySelectorAll('.configfieldset')){
      expect(card.querySelector(':scope > .geist-fieldset-content')).not.toBeNull();
      expect(card.querySelector(':scope > .geist-fieldset-footer')).not.toBeNull();
    }
    expect(host.children).toHaveLength(1);
  });
  it('失败提示包含一个次要样式的内部操作按钮',()=>{
    const host=document.createElement('div');host.innerHTML=noteHtml('来源离线',{variant:'error',filled:true,actionLabel:'立即重试'});
    const buttons=host.querySelectorAll('[role=alert] button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.classList.contains('primary')).toBe(false);
  });
  it('Note 错误不会直接输出英文网络异常',()=>{
    const host=document.createElement('div');host.innerHTML=noteHtml('Failed to fetch',{variant:'error',size:'small',filled:true});
    expect(host.querySelector('[role=alert]')?.textContent).toContain('无法连接到 Peach');
    expect(host.querySelector('.geist-note-small.geist-note-filled')).not.toBeNull();
    expect(host.querySelector('button')).toBeNull();
  });
});
