import type { CropBox, CropSize } from '../../crop-geometry';

export type MarkTool = 'pen' | 'arrow' | 'rectangle' | 'redact';
export type PixelPoint = { x: number; y: number };
export type ImageMark = { tool: MarkTool; points: PixelPoint[] };

export function editBounds(box: CropBox | null, size: CropSize): CropBox {
  return box ? {
    x0: Math.floor(box.x0), y0: Math.floor(box.y0), x1: Math.ceil(box.x1), y1: Math.ceil(box.y1),
  } : { x0: 0, y0: 0, x1: size.width, y1: size.height };
}

function drawMark(context: CanvasRenderingContext2D, { tool, points }: ImageMark) {
  const first = points[0];
  const last = points[points.length - 1];
  const left = Math.min(first.x, last.x);
  const top = Math.min(first.y, last.y);
  const width = Math.abs(last.x - first.x);
  const height = Math.abs(last.y - first.y);
  if (tool === 'redact') {
    context.fillStyle = '#000';
    const x = Math.floor(left) - 1;
    const y = Math.floor(top) - 1;
    context.fillRect(x, y, Math.ceil(left + width) + 1 - x, Math.ceil(top + height) + 1 - y);
    return;
  }
  if (tool === 'rectangle') {
    context.strokeRect(left, top, width, height);
    return;
  }
  context.beginPath();
  context.moveTo(first.x, first.y);
  if (tool === 'pen') {
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  } else {
    const angle = Math.atan2(last.y - first.y, last.x - first.x);
    const span = Math.min(Math.hypot(width, height) * 0.4, context.lineWidth * 4.5);
    context.lineTo(last.x, last.y);
    for (const offset of [-Math.PI / 6, Math.PI / 6]) {
      context.moveTo(last.x, last.y);
      context.lineTo(last.x - span * Math.cos(angle + offset), last.y - span * Math.sin(angle + offset));
    }
  }
  context.stroke();
}

export function paintImage(canvas: HTMLCanvasElement, image: HTMLImageElement, bounds: CropBox, marks: ImageMark[]) {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas context unavailable');
  const { x0, y0 } = bounds;
  const width = bounds.x1 - x0;
  const height = bounds.y1 - y0;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, x0, y0, width, height, 0, 0, width, height);
  context.translate(-x0, -y0);
  context.lineWidth = Math.max(3, Math.min(image.naturalWidth, image.naturalHeight) / 150);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = '#f03828';
  // Cover pixels after drawing every mark so no annotation can reveal the original underneath.
  for (const mark of marks) if (mark.tool !== 'redact') drawMark(context, mark);
  for (const mark of marks) if (mark.tool === 'redact') drawMark(context, mark);
}
