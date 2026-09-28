export const TILE = 32;
export const MAP_COLS = 48;
export const MAP_ROWS = 32;
export const MAP_WIDTH = MAP_COLS * TILE;
export const MAP_HEIGHT = MAP_ROWS * TILE;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Rect expressed in tiles, converted to pixels. */
export const t = (x: number, y: number, w: number, h: number): Rect => ({
  x: x * TILE,
  y: y * TILE,
  w: w * TILE,
  h: h * TILE,
});

export type ZoneId =
  | 'plaza'
  | 'cafe'
  | 'fashion'
  | 'furniture'
  | 'apartments'
  | 'delivery'
  | 'events'
  | 'ai_kiosk'
  | 'pier'
  | 'fishing_shop';

export interface Zone {
  id: ZoneId;
  label: string;
  /** Short line shown in the interaction prompt. */
  prompt: string;
  rect: Rect;
}

export interface Building {
  id: string;
  label: string;
  rect: Rect;
  wall: number;
  roof: number;
  accent: number;
  door: { x: number; w: number };
}

export const BUILDINGS: Building[] = [
  {
    id: 'cafe',
    label: 'Tiệm Cà Phê Bean There',
    rect: t(3, 2, 8, 6),
    wall: 0xf1dcc0,
    roof: 0xb4553f,
    accent: 0x6b3b2a,
    door: { x: 6, w: 2 },
  },
  {
    id: 'fashion',
    label: 'Tiệm Thời Trang Threadbare',
    rect: t(14, 2, 7, 6),
    wall: 0xf4e3ea,
    roof: 0x7a4b8c,
    accent: 0x4a2c5a,
    door: { x: 16, w: 2 },
  },
  {
    id: 'furniture',
    label: 'Nội Thất Sofa So Good',
    rect: t(24, 2, 7, 6),
    wall: 0xe7ecd9,
    roof: 0x3f7a64,
    accent: 0x274a3d,
    door: { x: 26, w: 2 },
  },
  {
    id: 'apartments',
    label: 'Khu Căn Hộ Chung Cư',
    rect: t(35, 1, 10, 8),
    wall: 0xdad7ee,
    roof: 0x3e3b6b,
    accent: 0x2a2847,
    door: { x: 39, w: 2 },
  },
  {
    id: 'delivery',
    label: 'Trạm Giao Hàng Siêu Tốc',
    rect: t(2, 14, 6, 5),
    wall: 0xf3e2b8,
    roof: 0xc98a2b,
    accent: 0x6d4a17,
    door: { x: 7, w: 1 },
  },
  {
    id: 'fishing_shop',
    label: 'Tiệm Ngư Cụ Bác Ba',
    rect: t(28, 20, 5, 4),
    wall: 0x386b7c,
    roof: 0x163445,
    accent: 0xf59e0b,
    door: { x: 30, w: 2 },
  },
];

export const ZONES: Zone[] = [
  {
    id: 'cafe',
    label: 'Tiệm Cà Phê Bean There',
    prompt: 'Bắt đầu ca làm tại quán cà phê',
    rect: t(4, 8, 6, 2),
  },
  {
    id: 'fashion',
    label: 'Tiệm Thời Trang Threadbare',
    prompt: 'Xem và thử trang phục',
    rect: t(14, 8, 7, 2),
  },
  { id: 'furniture', label: 'Nội Thất Sofa So Good', prompt: 'Xem và mua nội thất', rect: t(24, 8, 7, 2) },
  {
    id: 'apartments',
    label: 'Khu Căn Hộ Chung Cư',
    prompt: 'Bước vào căn hộ của bạn',
    rect: t(37, 9, 6, 2),
  },
  {
    id: 'delivery',
    label: 'Trạm Giao Hàng Siêu Tốc',
    prompt: 'Nhận đơn hàng cần giao',
    rect: t(8, 14, 3, 5),
  },
  { id: 'events', label: 'Bảng Sự Kiện', prompt: 'Xem sự kiện hôm nay', rect: t(30, 12, 5, 5) },
  { id: 'ai_kiosk', label: 'Trạm Thưởng AI', prompt: 'Mở trạm đổi thưởng AI', rect: t(11, 21, 6, 5) },
  { id: 'pier', label: 'Cầu Tàu Lắc Lư', prompt: 'Thả cần câu cá', rect: t(37, 26, 4, 4) },
  {
    id: 'fishing_shop',
    label: 'Tiệm Ngư Cụ Bác Ba',
    prompt: 'Mua & Nâng Cấp Cần Câu',
    rect: t(29, 24, 3, 2),
  },
  { id: 'plaza', label: 'Quảng Trường Trung Tâm', prompt: 'Gặp gỡ bạn bè', rect: t(18, 12, 12, 8) },
];

export const BLOCKERS: Rect[] = [
  ...BUILDINGS.map((b) => b.rect),
  // fountain
  t(23, 15, 2, 2),
  // event board
  t(32, 13, 2, 1),
  // AI kiosk
  t(13, 23, 2, 1),
  // lake around the pier (pier walkway x 38..39 stays open)
  t(35, 20, 3, 12),
  t(40, 20, 8, 12),
  t(38, 30, 2, 2),
  // map edges are trees
  t(0, 0, MAP_COLS, 1),
  t(0, MAP_ROWS - 1, MAP_COLS, 1),
  t(0, 0, 1, MAP_ROWS),
  t(MAP_COLS - 1, 0, 1, MAP_ROWS),
];

/** Pier planks: walkable tiles inside the water. */
export const PIER: Rect = t(38, 20, 2, 10);
export const WATER: Rect[] = [t(35, 20, 13, 12)];

/** Paved ground drawn by the client. Purely visual. */
export const PATHS: Rect[] = [
  t(1, 10, 46, 2),
  t(8, 12, 3, 8),
  t(11, 20, 7, 6),
  t(30, 12, 5, 6),
  t(30, 18, 10, 2),
  t(4, 8, 6, 2),
  t(14, 8, 7, 2),
  t(24, 8, 7, 2),
  t(37, 9, 6, 1),
  t(29, 24, 3, 1),
];
export const PLAZA: Rect = t(18, 12, 12, 8);
export const SPAWN = { x: 24 * TILE, y: 19 * TILE };

export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export function zoneAt(x: number, y: number): ZoneId | null {
  for (const z of ZONES) if (pointInRect(x, y, z.rect)) return z.id;
  return null;
}

export function zoneCenter(id: ZoneId): { x: number; y: number } {
  const z = ZONES.find((zone) => zone.id === id);
  if (!z) throw new Error(`Unknown zone ${id}`);
  return { x: z.rect.x + z.rect.w / 2, y: z.rect.y + z.rect.h / 2 };
}

/** Places a duck can hide during the Find the Duck event. All are walkable. */
export const DUCK_SPOTS: { x: number; y: number }[] = [
  { x: 5, y: 11 },
  { x: 12, y: 12 },
  { x: 20, y: 11 },
  { x: 33, y: 11 },
  { x: 44, y: 12 },
  { x: 3, y: 23 },
  { x: 9, y: 28 },
  { x: 18, y: 27 },
  { x: 27, y: 24 },
  { x: 31, y: 29 },
  { x: 38.5, y: 28 },
  { x: 29, y: 17 },
  { x: 19, y: 18 },
  { x: 13, y: 17 },
].map((p) => ({ x: p.x * TILE + TILE / 2, y: p.y * TILE + TILE / 2 }));

export const DELIVERY_DESTINATIONS: ZoneId[] = [
  'cafe',
  'fashion',
  'furniture',
  'apartments',
  'events',
  'ai_kiosk',
  'pier',
  'fishing_shop',
];

/** Apartment interior grid. */
export const APARTMENT_COLS = 12;
export const APARTMENT_ROWS = 9;
export const APARTMENT_THEMES = [
  {
    id: 'cozy',
    label: 'Gỗ Sồi Ấm Cúng',
    floor: 0xc8966a,
    floorAlt: 0xbd8a5f,
    wall: 0xf0dfc8,
    trim: 0x8a5a3b,
  },
  {
    id: 'mint',
    label: 'Bạc Hà Tươi Mát',
    floor: 0x9fcfbf,
    floorAlt: 0x93c4b3,
    wall: 0xe6f3ee,
    trim: 0x3f7a64,
  },
  {
    id: 'night',
    label: 'Cú Đêm Huyền Bí',
    floor: 0x4b4a78,
    floorAlt: 0x444370,
    wall: 0x2e2c52,
    trim: 0xe0b44c,
  },
  {
    id: 'peach',
    label: 'Hồng Đào Dịu Ngọt',
    floor: 0xefb9a0,
    floorAlt: 0xe6ad94,
    wall: 0xfff0e6,
    trim: 0xc0604a,
  },
] as const;
export type ApartmentThemeId = (typeof APARTMENT_THEMES)[number]['id'];
