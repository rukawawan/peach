import { ComparisonText } from '../review/comparison-text';

/** 文件名按可用宽度折行，保留路径比较所需的名称差异。 */
export function FilenameComparison({ value, reference, onOpen }: {
  value: string; reference?: string; onOpen(): void;
}) {
  return <button type="button" onClick={onOpen} title={value} aria-label={value}
    data-duplicate-filename=""
    onCopy={event => { event.clipboardData.setData('text/plain', value); event.preventDefault() }}
    className="min-w-0 cursor-pointer wrap-anywhere text-left text-body-regular hover:text-text-secondary">
    <ComparisonText value={value} reference={reference} />
  </button>;
}
