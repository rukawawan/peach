import {
  RiArrowGoBackLine, RiArrowRightUpLine, RiCropLine, RiEyeOffLine, RiPencilLine, RiRectangleLine,
} from '@remixicon/react';
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { Radio } from 'react-aria-components';
import { Button } from '@/components/base/buttons/button';
import { t } from '../../i18n';
import { SEGMENT, SEGMENTED_TRACK, SegmentedRadioGroup } from '../components/segmented';
import type { CropBox } from '../../crop-geometry';
import { CropFrame } from '../crop/crop-frame';
import { encodeCanvas, type FeedbackImage } from './capture';
import { editBounds, paintImage, type ImageMark, type MarkTool } from './image-edit';

const tools = [
  ['crop', RiCropLine],
  ['arrow', RiArrowRightUpLine],
  ['rectangle', RiRectangleLine],
  ['pen', RiPencilLine],
  ['redact', RiEyeOffLine],
] as const;
type Tool = 'crop' | MarkTool;

const message = (key: string) => t(`shell:feedback.editor.${key}`);
const copy = (key: string) => <span data-copy-key={`feedback.editor.${key}`}>{message(key)}</span>;

export function FeedbackImageEditor({ item, label, saving, onSavingChange, onCancel, onSave }: {
  item: FeedbackImage; label: string; saving: boolean; onSavingChange(saving: boolean): void;
  onCancel(): void; onSave(image: FeedbackImage): void;
}) {
  const [source, setSource] = useState<HTMLImageElement>();
  const [tool, setTool] = useState<Tool>('arrow');
  const [crop, setCrop] = useState<CropBox | null>(null);
  const [marks, setMarks] = useState<ImageMark[]>([]);
  const [draft, setDraft] = useState<ImageMark>();
  const [error, setError] = useState('');
  const editor = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<{ id: number; mark: ImageMark } | null>(null);
  const mounted = useRef(false);
  const bounds = editBounds(crop, item);
  const width = bounds.x1 - bounds.x0;
  const height = bounds.y1 - bounds.y0;
  const changed = !!crop || marks.length > 0;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      editor.current?.querySelector<HTMLInputElement>('input[type=radio]:checked')?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const url = URL.createObjectURL(item.blob);
    const image = new Image();
    image.src = url;
    void image.decode().then(() => {
      if (mounted.current) setSource(image);
    }, () => {
      if (mounted.current) setError('unreadable');
    });
    return () => {
      mounted.current = false;
      URL.revokeObjectURL(url);
    };
  }, [item.blob]);

  useLayoutEffect(() => {
    if (source && canvas.current) paintImage(canvas.current, source, bounds, draft ? [...marks, draft] : marks);
  });

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: bounds.x0 + Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * width,
      y: bounds.y0 + Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) * height,
    };
  }

  function begin(event: PointerEvent<HTMLCanvasElement>) {
    if (tool === 'crop' || !source || saving || event.button !== 0 || !event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const mark = { tool, points: [point(event)] };
    active.current = { id: event.pointerId, mark };
    setDraft(mark);
  }

  function update(event: PointerEvent<HTMLCanvasElement>) {
    const gesture = active.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    const { mark } = gesture;
    const next = point(event);
    gesture.mark = { tool: mark.tool, points: mark.tool === 'pen' ? [...mark.points, next] : [mark.points[0], next] };
    setDraft(gesture.mark);
  }

  function cancelStroke() {
    active.current = null;
    setDraft(undefined);
  }

  function finish(event: PointerEvent<HTMLCanvasElement>) {
    if (active.current?.id !== event.pointerId) return;
    update(event);
    const mark = active.current.mark;
    const start = mark.points[0];
    const end = mark.points[mark.points.length - 1];
    const region = mark.tool === 'rectangle' || mark.tool === 'redact';
    const visible = region ? Math.abs(end.x - start.x) >= 2 && Math.abs(end.y - start.y) >= 2
      : mark.points.some(p => Math.hypot(p.x - start.x, p.y - start.y) >= 2);
    if (visible) setMarks(current => [...current, mark]);
    cancelStroke();
  }

  async function save() {
    if (!source || saving || active.current || !changed) return;
    onSavingChange(true);
    setError('');
    try {
      const output = document.createElement('canvas');
      output.width = width;
      output.height = height;
      paintImage(output, source, bounds, marks);
      const result = await encodeCanvas(output, true);
      if (mounted.current) onSave(result);
    } catch {
      if (mounted.current) setError('failed');
    } finally {
      if (mounted.current) onSavingChange(false);
    }
  }

  return <section ref={editor} className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-6" data-feedback-image-editor="">
    <header className="flex min-w-0 items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-title-2-medium text-text-primary">{copy('title')}</h2>
        <p className="truncate text-caption-1-regular text-text-secondary" title={label}>{label}</p>
      </div>
      <span className="mt-1 whitespace-nowrap text-caption-1-regular tabular-nums text-text-secondary"
        aria-live="polite">{width} × {height}</span>
    </header>
    <SegmentedRadioGroup className={SEGMENTED_TRACK} orientation="horizontal" aria-label={message('tools')}
      value={tool} isDisabled={saving} onChange={value => {
        cancelStroke();
        setTool(value as Tool);
      }}>
      {tools.map(([id, Icon]) => <Radio key={id} value={id} className={SEGMENT}>
        <Icon aria-hidden className="size-4 shrink-0" />{copy(id)}
      </Radio>)}
    </SegmentedRadioGroup>
    <div data-feedback-editor-stage="" className="flex min-h-24 items-center justify-center overflow-hidden rounded-xl border border-separator-border bg-background-secondary-default">
      {source && (tool === 'crop'
        ? <CropFrame src={source.src} drawSelection size={item} box={crop} aspect={null} label={message('crop')}
            onSize={() => {}} onBox={setCrop} />
        : <canvas ref={canvas} width={width} height={height} aria-label={label}
            className="block max-w-full cursor-crosshair touch-none"
            onPointerDown={begin} onPointerMove={update} onPointerUp={finish}
            onLostPointerCapture={cancelStroke} />)}
    </div>
    <p className="text-caption-1-regular text-text-secondary">{copy(
      tool === 'crop' ? 'cropHelp' : tool === 'redact' ? 'redactHelp' : 'markHelp',
    )}</p>
    {error && <p role="alert" className="text-caption-1-regular text-text-error-primary">{copy(error)}</p>}
    <footer className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <Button type="button" size="small" variant="secondary" data-feedback-action="" leadingIcon={RiArrowGoBackLine}
          disabled={saving || !marks.length} onClick={() => setMarks(current => current.slice(0, -1))}>{copy('undo')}</Button>
        <Button type="button" size="small" variant="secondary" data-feedback-action="" disabled={saving || !changed}
          onClick={() => { setCrop(null); setMarks([]) }}>{copy('reset')}</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="small" variant="secondary" data-feedback-action="" onClick={onCancel} disabled={saving}>{copy('cancel')}</Button>
        <Button type="button" size="small" onClick={() => { void save() }}
          disabled={!source || !changed} aria-disabled={saving} aria-busy={saving}>{copy(saving ? 'saving' : 'save')}</Button>
      </div>
    </footer>
  </section>;
}
