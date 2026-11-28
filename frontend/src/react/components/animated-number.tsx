import { useState } from 'react';
import './animated-number.css';

const digit = /^\p{Nd}$/u;
const formatInteger = (value: number) => Math.round(value).toLocaleString();

/** 最新读数随快照直接更新，格式相同才在原位淡换有变化的数字。 */
export function AnimatedNumber({ value, format = formatInteger, className }: {
  value: number | string; format?: (value: number) => string; className?: string;
}) {
  const text = typeof value === 'number' ? format(value) : value;
  const [reading, setReading] = useState({ current: text, previous: text });
  if (reading.current !== text) setReading({ current: text, previous: reading.current });

  const current = [...text];
  const previous = [...reading.previous];
  const sameFormat = current.length === previous.length
    && current.every((character, index) => character === previous[index]
      || (digit.test(character) && digit.test(previous[index]!)));

  return <span data-animated-number="" className={className ? `tabular-nums ${className}` : 'tabular-nums'}>
    {sameFormat && reading.previous !== text ? <span key={text}>
      {current.map((character, index) => character === previous[index] ? character
        : <span data-live-number-digit="" key={index}>
            <span aria-hidden="true" data-live-number-previous="" data-digit={previous[index]} />
            <span data-live-number-current="">{character}</span>
          </span>)}
    </span> : text}
  </span>;
}
