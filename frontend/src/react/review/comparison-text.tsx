import { useMemo } from 'react';
import { diffChars } from 'diff';

/** 差异只影响展示；保留来源文字、空白和 Unicode 字符，不参与采用资料的请求。 */
export function ComparisonText({ value, reference }: { value: string; reference?: string }) {
  const parts = useMemo(() => reference
    ? diffChars(reference, value).filter(part => !part.removed)
    : [{ value, added: false }], [value, reference]);
  return <>{parts.map((part, index) => part.added
    ? <mark key={index} data-review-difference=""
        className="rounded-sm bg-status-yellow-background text-status-yellow-text">{part.value}</mark>
    : <span key={index}>{part.value}</span>)}</>;
}
