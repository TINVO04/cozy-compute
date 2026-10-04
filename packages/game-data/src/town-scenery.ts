import type { Rect } from './map.js';
const t = (x: number, y: number, w: number, h: number): Rect => ({
  x: x * 32,
  y: y * 32,
  w: w * 32,
  h: h * 32,
});

/** Landmarks in the reference town share footprints with authoritative movement. */
export type TownSceneryKind = 'house' | 'pagoda' | 'shrine' | 'cart' | 'scooter' | 'palm' | 'monument';
export const TOWN_SCENERY: {
  id: string;
  kind: TownSceneryKind;
  rect: Rect;
  color: string;
  label?: string;
}[] = [
  { id: 'west-house', kind: 'house', rect: t(3, 12.5, 5, 2.5), color: '#777d78' },
  { id: 'west-blue-house', kind: 'house', rect: t(8, 23, 1.7, 3), color: '#5289ad' },
  { id: 'east-house', kind: 'house', rect: t(35, 12.5, 3, 3), color: '#876c4e' },
  { id: 'buu-long', kind: 'pagoda', rect: t(43, 12, 3, 4), color: '#bc583d', label: 'CẦU HÓA AN' },
  { id: 'plaza-shrine', kind: 'shrine', rect: t(17.5, 23, 4, 1.5), color: '#b65036' },
  { id: 'dntu-monument', kind: 'monument', rect: t(28.3, 9.2, 3.5, 0.8), color: '#b91c1c', label: 'DNTU' },
  ...['#568caf', '#bf674b', '#848b8a', '#bfa575', '#c9704e', '#668c9f', '#dfd4b2'].map((color, i) => ({
    id: 'south-house-' + i,
    kind: 'house' as const,
    rect: t(
      3 + i * 3.4,
      [28.5, 28.8, 28.4, 28.7, 28.5, 28.9, 28.6][i]!,
      [3, 2.8, 3.1, 2.9, 3, 2.7, 3][i]!,
      2,
    ),
    color,
  })),
  { id: 'bun-rieu', kind: 'cart', rect: t(17.5, 17, 1, 0.6), color: '#a77848', label: 'BÚN RIÊU' },
  { id: 'nuoc-mia', kind: 'cart', rect: t(26, 17, 1, 0.6), color: '#80a79b', label: 'NƯỚC MÍA' },
  ...[14, 15, 16].map((x, i) => ({
    id: 'north-bike-' + i,
    kind: 'scooter' as const,
    rect: t(x, 9 + [0.1, -0.1, 0.2][i]!, 0.6, 0.5),
    color: ['#be493a', '#424957', '#f0eee3'][i]!,
  })),
  ...[13, 14.5, 16].map((x, i) => ({
    id: 'bida-bike-' + i,
    kind: 'scooter' as const,
    rect: t(x, 24 + [0.1, 0.3, -0.1][i]!, 0.6, 0.5),
    color: ['#be493a', '#424957', '#f0eee3'][i]!,
  })),
  { id: 'garden-palm', kind: 'palm', rect: t(25.4, 24.5, 0.3, 0.3), color: '#4b9a51' },
  { id: 'garden-palm-east', kind: 'palm', rect: t(26.2, 23.6, 0.3, 0.3), color: '#4b9a51' },
  { id: 'west-palm', kind: 'palm', rect: t(1.7, 4, 0.3, 0.3), color: '#4b9a51' },
];

/** Low temple walls leave a clear entrance beneath the independent gate. */
export const TOWN_TEMPLE_WALLS: Rect[] = [
  { x: 1312, y: 400, w: 4, h: 178 },
  { x: 1490, y: 400, w: 4, h: 178 },
  { x: 1312, y: 400, w: 182, h: 4 },
  { x: 1312, y: 578, w: 62, h: 4 },
  { x: 1422, y: 578, w: 72, h: 4 },
];
