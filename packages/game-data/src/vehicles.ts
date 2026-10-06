import type { Rect } from './map.js';

export const VEHICLES: Record<
  string,
  {
    id: string;
    kind: 'car' | 'motorcycle' | 'bicycle';
    name: string;
    price: number;
    speed: number;
    color: string;
  }
> = {
  bicycle_sky: {
    id: 'bicycle_sky',
    kind: 'bicycle',
    name: 'Xe đạp Mây Xanh',
    price: 200,
    speed: 195,
    color: '#79b8d2',
  },
  motorcycle_coral: {
    id: 'motorcycle_coral',
    kind: 'motorcycle',
    name: 'Xe máy San Hô',
    price: 700,
    speed: 270,
    color: '#de816b',
  },
  car_mint: {
    id: 'car_mint',
    kind: 'car',
    name: 'Ô tô Mini Bạc Hà',
    price: 1200,
    speed: 240,
    color: '#69bfa8',
  },
  car_sunset: {
    id: 'car_sunset',
    kind: 'car',
    name: 'Ô tô Hoàng Hôn',
    price: 3200,
    speed: 300,
    color: '#df8861',
  },
};
export const vehicleById = (id: string | null | undefined) =>
  id && Object.hasOwn(VEHICLES, id) ? VEHICLES[id] : undefined;

/** Shared by road art, prediction and authoritative traffic enforcement. */
export const TOWN_ROADS: Rect[] = [
  { x: 32, y: 332, w: 1472, h: 40 },
  { x: 332, y: 320, w: 40, h: 576 },
  { x: 1036, y: 320, w: 72, h: 576 },
  { x: 96, y: 844, w: 1024, h: 40 },
];
export const DEALER_DRIVEWAY: Rect = { x: 584, y: 788, w: 80, h: 58 };
export const SHOWROOM = { width: 640, height: 480, spawn: { x: 320, y: 416 } };
export const VEHICLE_DISPLAYS = Object.values(VEHICLES).map((vehicle, index) => ({
  id: vehicle.id,
  x: index % 2 === 0 ? 168 : 472,
  y: index < 2 ? 156 : 308,
}));
export const SHOWROOM_BLOCKERS: Rect[] = [
  { x: 0, y: 0, w: 640, h: 72 },
  { x: 0, y: 0, w: 24, h: 480 },
  { x: 616, y: 0, w: 24, h: 480 },
  { x: 0, y: 456, w: 640, h: 24 },
  ...VEHICLE_DISPLAYS.map(({ x, y }) => ({ x: x - 56, y: y - 26, w: 112, h: 52 })),
];
export const showroomDisplayAt = (x: number, y: number) =>
  VEHICLE_DISPLAYS.find((display) => Math.hypot(x - display.x, y - display.y) <= 100)?.id ?? null;
export const onRoad = (x: number, y: number) =>
  TOWN_ROADS.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
export const onDriveway = (x: number, y: number) =>
  x >= DEALER_DRIVEWAY.x &&
  x <= DEALER_DRIVEWAY.x + DEALER_DRIVEWAY.w &&
  y >= DEALER_DRIVEWAY.y &&
  y <= DEALER_DRIVEWAY.y + DEALER_DRIVEWAY.h;
export const drivingSpeed = (id: string, x: number, y: number) =>
  onRoad(x, y) ? (vehicleById(id)?.speed ?? 150) : 90;

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
export type TrafficViolation = 'red_light' | 'off_road';
export const TRAFFIC_FINES: Record<TrafficViolation, number> = { red_light: 80, off_road: 40 };
export const TRAFFIC_LABELS: Record<TrafficViolation, string> = {
  red_light: 'Vượt đèn đỏ',
  off_road: 'Lái xe ngoài lòng đường',
};

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
