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
  | 'fishing_shop'
  | 'vietprodev';

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
    rect: t(4, 3, 7, 5),
    wall: 0xf1dcc0,
    roof: 0xb4553f,
    accent: 0x6b3b2a,
    door: { x: 6, w: 2 },
  },
  {
    id: 'vietprodev',
    label: 'Công Ty Công Nghệ VietProDev',
    rect: t(11, 3, 5, 5),
    wall: 0xf5efe6,
    roof: 0x334155,
    accent: 0xb45309,
    door: { x: 12, w: 2 },
  },
  {
    id: 'fashion',
    label: 'Tiệm Thời Trang Threadbare',
    rect: t(16, 2, 6, 5),
    wall: 0xf4e3ea,
    roof: 0x7a4b8c,
    accent: 0x4a2c5a,
    door: { x: 18, w: 2 },
  },
  {
    id: 'furniture',
    label: 'Nội Thất Sofa So Good',
    rect: t(26, 4, 6, 5),
    wall: 0xe7ecd9,
    roof: 0x3f7a64,
    accent: 0x274a3d,
    door: { x: 28, w: 2 },
  },
  {
    id: 'apartments',
    label: 'Khu Căn Hộ Chung Cư',
    rect: t(37, 3, 8, 7),
    wall: 0xdad7ee,
    roof: 0x3e3b6b,
    accent: 0x2a2847,
    door: { x: 40, w: 2 },
  },
  {
    id: 'delivery',
    label: 'Trạm Giao Hàng Siêu Tốc',
    rect: t(3, 16, 5, 4),
    wall: 0xf3e2b8,
    roof: 0xc98a2b,
    accent: 0x6d4a17,
    door: { x: 5, w: 2 },
  },
  {
    id: 'fishing_shop',
    label: 'Tiệm Ngư Cụ Bác Ba',
    rect: t(29, 22, 5, 3),
    wall: 0xe1d9bc,
    roof: 0x477e83,
    accent: 0x3c6064,
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
    id: 'vietprodev',
    label: 'Công Ty VietProDev',
    prompt: 'Bước vào văn phòng công ty',
    rect: t(11, 8, 5, 2),
  },
  {
    id: 'fashion',
    label: 'Tiệm Thời Trang Threadbare',
    prompt: 'Xem và thử trang phục',
    rect: t(16, 7, 6, 3),
  },
  { id: 'furniture', label: 'Nội Thất Sofa So Good', prompt: 'Xem và mua nội thất', rect: t(26, 9, 6, 1) },
  {
    id: 'apartments',
    label: 'Khu Căn Hộ Chung Cư',
    prompt: 'Bước vào căn hộ của bạn',
    rect: t(38, 10, 6, 2),
  },
  {
    id: 'delivery',
    label: 'Trạm Giao Hàng Siêu Tốc',
    prompt: 'Nhận đơn hàng cần giao',
    rect: t(3, 20, 5, 2),
  },
  { id: 'events', label: 'Bảng Sự Kiện', prompt: 'Xem sự kiện hôm nay', rect: t(30, 12, 5, 5) },
  { id: 'ai_kiosk', label: 'Trạm Thưởng AI', prompt: 'Mở trạm đổi thưởng AI', rect: t(11, 21, 6, 5) },
  { id: 'pier', label: 'Cầu Tàu Lắc Lư', prompt: 'Thả cần câu cá', rect: t(37, 26, 4, 4) },
  {
    id: 'fishing_shop',
    label: 'Tiệm Ngư Cụ Bác Ba',
    prompt: 'Mua & Nâng Cấp Cần Câu',
    rect: t(29, 25, 5, 2),
  },
  { id: 'plaza', label: 'Quảng Trường Trung Tâm', prompt: 'Gặp gỡ bạn bè', rect: t(17, 12, 13, 8) },
];

/** Shared art anchors keep scenery, lighting and server collision aligned. */
export const TOWN_LAMPS = [
  { x: 10, y: 10 },
  { x: 23, y: 10 },
  { x: 35, y: 12 },
  { x: 16, y: 19 },
  { x: 31, y: 19 },
  { x: 10, y: 25 },
  { x: 26, y: 28 },
  { x: 35, y: 20 },
];
export const TOWN_TREES = [
  { x: 2, y: 5 },
  { x: 10, y: 2 },
  { x: 24, y: 4 },
  { x: 34, y: 6 },
  { x: 3, y: 12 },
  { x: 6, y: 26 },
  { x: 3, y: 29 },
  { x: 19, y: 24 },
  { x: 27, y: 24 },
  { x: 28, y: 30 },
  { x: 44, y: 15 },
  { x: 46, y: 18 },
  { x: 14, y: 29 },
];
export const TOWN_FENCES = [
  { x: 2, y: 14, segments: 6 },
  { x: 18, y: 29, segments: 8 },
  { x: 38, y: 14, segments: 7 },
];
export type TownPropKind =
  'fountain' | 'board' | 'kiosk' | 'bench' | 'lamp' | 'planter' | 'crate' | 'table' | 'sign';
export const TOWN_PROPS: { kind: TownPropKind; x: number; y: number }[] = [
  { kind: 'fountain', x: 24, y: 17 },
  { kind: 'board', x: 33, y: 14 },
  { kind: 'kiosk', x: 14, y: 24 },
  { kind: 'bench', x: 19, y: 13 },
  { kind: 'bench', x: 28, y: 13 },
  { kind: 'bench', x: 19, y: 19 },
  { kind: 'bench', x: 28, y: 19 },
  { kind: 'bench', x: 42, y: 18 },
  { kind: 'table', x: 5, y: 9 },
  { kind: 'table', x: 9, y: 9 },
  { kind: 'crate', x: 3, y: 21 },
  { kind: 'crate', x: 8, y: 19 },
  { kind: 'planter', x: 17, y: 8 },
  { kind: 'planter', x: 21, y: 8 },
  { kind: 'planter', x: 38, y: 11 },
  { kind: 'planter', x: 44, y: 11 },
  { kind: 'sign', x: 35, y: 18 },
  ...TOWN_LAMPS.map((p) => ({ kind: 'lamp' as const, ...p })),
];

export const BLOCKERS: Rect[] = [
  ...BUILDINGS.map((b) => b.rect),
  t(23, 15, 2, 2), // fountain
  t(32, 13, 2, 1), // event board
  t(13, 23, 2, 1), // AI kiosk
  ...TOWN_TREES.map((p) => ({ x: p.x * TILE - 5, y: p.y * TILE - 10, w: 10, h: 10 })),
  ...TOWN_FENCES.map((p) => ({ x: p.x * TILE, y: p.y * TILE - 5, w: (p.segments - 1) * 16 + 4, h: 11 })),
  ...TOWN_PROPS.filter((p) => ['bench', 'table', 'crate', 'planter', 'sign'].includes(p.kind)).map((p) => ({
    x: p.x * TILE - 14,
    y: p.y * TILE - 8,
    w: 28,
    h: 8,
  })),
  // Lake collision leaves the two-tile fishing pier open.
  t(35, 20, 3, 12),
  t(40, 20, 8, 12),
  t(38, 30, 2, 2),
  t(0, 0, MAP_COLS, 1),
  t(0, MAP_ROWS - 1, MAP_COLS, 1),
  t(0, 0, 1, MAP_ROWS),
  t(MAP_COLS - 1, 0, 1, MAP_ROWS),
];

export const PIER: Rect = t(38, 20, 2, 10);
export const WATER: Rect[] = [t(35, 20, 13, 12)];

/** A connected promenade, with short spurs to every usable entrance. */
export const PATHS: Rect[] = [
  t(1, 10, 46, 2),
  t(10, 10, 2, 18),
  t(32, 10, 3, 18),
  t(10, 26, 25, 2),
  t(10, 16, 7, 2),
  t(30, 16, 5, 2),
  t(22, 10, 3, 2),
  t(22, 20, 3, 8),
  t(4, 8, 7, 2),
  t(11, 8, 5, 2),
  t(16, 7, 6, 3),
  t(26, 9, 6, 1),
  t(38, 10, 6, 2),
  t(3, 20, 9, 2),
  t(11, 22, 6, 4),
  t(29, 25, 6, 2),
  t(32, 18, 8, 2),
];
export const PLAZA: Rect = t(17, 12, 13, 8);
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

/** Event spawns stay in open spaces and on the connected promenade. */
export const DUCK_SPOTS: { x: number; y: number }[] = [
  { x: 5, y: 11 },
  { x: 12, y: 12 },
  { x: 20, y: 11 },
  { x: 33, y: 11 },
  { x: 44, y: 12 },
  { x: 3, y: 23 },
  { x: 9, y: 28 },
  { x: 18, y: 27 },
  { x: 26, y: 22 },
  { x: 31, y: 29 },
  { x: 38.5, y: 28 },
  { x: 29, y: 17 },
  { x: 20, y: 18 },
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
  'vietprodev',
];

/** VietDevPro office interior grid & constants */
export const COMPANY_COLS = 16;
export const COMPANY_ROWS = 11;
export const COMPANY_SPAWN = { x: 8 * TILE, y: 9.5 * TILE };
export const COMPANY_BLOCKERS: Rect[] = [
  t(0, 0, COMPANY_COLS, 2), // Back wall with whiteboard, monitors, etc.
  t(3, 4, 10, 2), // The long conference table with sleeping employees
  t(1, 1, 2, 2), // Server rack in top-left corner
  t(13, 1, 2, 2), // Coffee & water station in top-right corner
  t(0, 0, 1, COMPANY_ROWS), // Left wall
  t(COMPANY_COLS - 1, 0, 1, COMPANY_ROWS), // Right wall
  t(0, COMPANY_ROWS - 1, 6, 1), // Bottom left wall
  t(10, COMPANY_ROWS - 1, 6, 1), // Bottom right wall
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
