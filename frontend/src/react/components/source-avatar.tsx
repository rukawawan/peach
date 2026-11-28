import { useEffect, useRef, useState } from 'react';
import { firstGrapheme } from '@peach/legacy/core';
import { javImageUrl } from './source-picture';
import { entityDisplayName } from '../../core/entity-names';
import { useEntityNames } from '../use-entity-names';

/** 来源头像经 `/jav-image` 取，浏览器缓存复用；进入视口才取，取图失败时保留首字。 */
export function SourceAvatar({ code, person, detail = false }: {
  code: string; person: { name: string; source_actor_id?: string }; detail?: boolean;
}) {
  useEntityNames();
  const node = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(detail || typeof IntersectionObserver === 'undefined');
  const [failedSource, setFailedSource] = useState<string>();
  useEffect(() => {
    if (!node.current || visible) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '100px' });
    observer.observe(node.current);
    return () => observer.disconnect();
  }, [visible]);
  const source = visible && person.source_actor_id ? javImageUrl(code, `actor:${person.source_actor_id}`) : undefined;
  const face = <><span ref={node} data-source-initial="">{firstGrapheme(entityDisplayName('performer', person.name))}</span>
    {source && source !== failedSource ? <img src={source} alt="" onError={() => setFailedSource(source)} /> : null}</>;
  return detail ? <span data-id-face="">{face}</span> : face;
}
