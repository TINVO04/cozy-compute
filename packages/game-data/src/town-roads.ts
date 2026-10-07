import type { Rect } from './map.js';

/** Shared by road art, prediction and authoritative traffic enforcement. */
export const TOWN_ROADS: Rect[] = [
  { x: 32, y: 332, w: 1472, h: 40 },
  { x: 332, y: 320, w: 40, h: 576 },
  { x: 1036, y: 320, w: 72, h: 576 },
  { x: 96, y: 844, w: 1024, h: 40 },
];
export const onRoad = (x: number, y: number) =>
  TOWN_ROADS.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
export const INTERSECTIONS = [
  { id: 'west', x: 352, y: 352, halfW: 20, halfH: 20 },
  { id: 'east', x: 1072, y: 352, halfW: 36, halfH: 20 },
  { id: 'south-west', x: 352, y: 864, halfW: 20, halfH: 20 },
  { id: 'south-east', x: 1072, y: 864, halfW: 36, halfH: 20 },
] as const;
export type Signal = 'red' | 'yellow' | 'green';
export function trafficSignal(now: number, axis: 'horizontal' | 'vertical'): Signal {
  const phase = ((now % 28000) + 28000) % 28000;
  const local = axis === 'horizontal' ? phase : (phase + 14000) % 28000;
  return local < 10000 ? 'green' : local < 12000 ? 'yellow' : 'red';
}
/** Entry across a stop line, with interpolation to reject unrelated diagonal crossings. */
export function redLightCrossing(
  from: { x: number; y: number },
  to: { x: number; y: number },
  now: number,
): string | null {
  for (const junction of INTERSECTIONS) {
    for (const axis of ['horizontal', 'vertical'] as const) {
      if (trafficSignal(now, axis) !== 'red') continue;
      const horizontal = axis === 'horizontal';
      const a = horizontal ? from.x : from.y;
      const b = horizontal ? to.x : to.y;
      const center = horizontal ? junction.x : junction.y;
      const half = horizontal ? junction.halfW : junction.halfH;
      const otherCenter = horizontal ? junction.y : junction.x;
      const otherHalf = horizontal ? junction.halfH : junction.halfW;
      const line = b > a ? center - half - 6 : center + half + 6;
      if (!((a < line && b >= line) || (a > line && b <= line))) continue;
      if ((b > a && a > center) || (b < a && a < center)) continue;
      const ratio = (line - a) / (b - a);
      const lateral = horizontal ? from.y + (to.y - from.y) * ratio : from.x + (to.x - from.x) * ratio;
      if (Math.abs(lateral - otherCenter) <= otherHalf) return junction.id;
    }
  }
  return null;
}
