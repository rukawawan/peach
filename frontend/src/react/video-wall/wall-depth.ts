import type { WallSize } from './wall-layout';

const FOCAL_DISTANCE = 980;
const CENTER_RECESS = .68;
const HORIZONTAL_CURVE = .55;
const VERTICAL_CURVE = .45;
const wallDepth = ({ width, height }: WallSize) => Math.min(width, height) * .26 * Math.min(1, width / 540);
const clampOffscreen = (value: number) => Math.max(-1.35, Math.min(1.35, value));

/** 每张封面作为一块刚性平面，沿凹面的切面转动，使用同一个屏幕中心投影。 */
export function wallDepthTransform(x: number, y: number, size: WallSize, zoom: number): string {
  const centerX = size.width / 2, centerY = size.height / 2;
  const u = clampOffscreen(x / centerX - 1), v = clampOffscreen(y / centerY - 1);
  const depth = wallDepth(size);
  const z = depth * (HORIZONTAL_CURVE * u ** 2 + VERTICAL_CURVE * v ** 2 - CENTER_RECESS);
  const tiltX = Math.atan(2 * depth * VERTICAL_CURVE * v / centerY);
  const tiltY = -Math.atan(2 * depth * HORIZONTAL_CURVE * u / centerX);
  const eyeX = (centerX - x) / zoom, eyeY = (centerY - y) / zoom;
  return `translate(${eyeX.toFixed(2)}px, ${eyeY.toFixed(2)}px) perspective(${FOCAL_DISTANCE / zoom}px) translate3d(${(-eyeX).toFixed(2)}px, ${(-eyeY).toFixed(2)}px, ${(z / zoom).toFixed(2)}px) rotateX(${tiltX.toFixed(5)}rad) rotateY(${tiltY.toFixed(5)}rad)`;
}

/** 用曲面投影的逆向径向比例把屏幕上的手势落点映回镜头坐标。 */
export function wallDepthAnchor(x: number, y: number, size: WallSize) {
  const centerX = size.width / 2, centerY = size.height / 2;
  const u = (x - centerX) / centerX, v = (y - centerY) / centerY;
  const depth = wallDepth(size) / FOCAL_DISTANCE;
  const middle = 1 + depth * CENTER_RECESS;
  const bend = depth * (HORIZONTAL_CURVE * u ** 2 + VERTICAL_CURVE * v ** 2);
  const scale = 2 * middle / (1 + Math.sqrt(1 + 4 * bend * middle));
  return { x: centerX + (x - centerX) * scale, y: centerY + (y - centerY) * scale };
}
