import { TOWN_SCENERY, TOWN_TEMPLE_WALLS } from './town-scenery.js';

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
  | 'vietprodev'
  | 'dntu'
  | 'comga'
  | 'cybernet'
  | 'bida'
  | 'farm_gate';

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
    id: 'cybernet',
    label: 'Cyber Game HNT Trảng Dài',
    rect: t(3, 23, 5, 3),
    wall: 0x1e293b,
    roof: 0x0f172a,
    accent: 0x38bdf8,
    door: { x: 4, w: 2 },
  },
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
    rect: t(16, 2, 5, 5),
    wall: 0xf4e3ea,
    roof: 0x7a4b8c,
    accent: 0x4a2c5a,
    door: { x: 17, w: 2 },
  },
  {
    id: 'dntu',
    label: 'Trường Đại Học Công Nghệ Đồng Nai',
    rect: t(21, 3, 11, 5),
    wall: 0xfef3c7,
    roof: 0xc2410c,
    accent: 0x991b1b,
    door: { x: 25, w: 3 },
  },
  {
    id: 'furniture',
    label: 'Nội Thất Sofa So Good',
    rect: t(32, 4, 5, 5),
    wall: 0xe7ecd9,
    roof: 0x3f7a64,
    accent: 0x274a3d,
    door: { x: 33, w: 2 },
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
    id: 'comga',
    label: 'Cơm Gà Xối Mỡ 68 Biên Hòa',
    rect: t(12, 12, 5, 4),
    wall: 0xfef08a,
    roof: 0xd97706,
    accent: 0xb45309,
    door: { x: 13, w: 2 },
  },
  {
    id: 'bida',
    label: 'CLB Bida H2S Trảng Dài Biên Hòa',
    rect: t(12, 18, 5, 4),
    wall: 0x1e293b,
    roof: 0x0f172a,
    accent: 0x10b981,
    door: { x: 13, w: 2 },
  },
  {
    id: 'fishing_shop',
    label: 'Tiệm Ngư Cụ Bác Ba',
    rect: t(27, 22, 5, 3),
    wall: 0xe1d9bc,
    roof: 0x477e83,
    accent: 0x3c6064,
    door: { x: 28, w: 2 },
  },
];

export const ZONES: Zone[] = [
  {
    id: 'farm_gate',
    label: 'Cổng Nông Trại',
    prompt: 'Vào Trang Trại',
    rect: t(0, 10, 2, 2),
  },
  { id: 'cybernet', label: 'Cyber Game HNT Trảng Dài', prompt: 'Vào Cyber Game', rect: t(3, 26, 5, 1.5) },
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
    rect: t(16, 7, 5, 3),
  },
  {
    id: 'dntu',
    label: 'Đại Học Công Nghệ Đồng Nai',
    prompt: 'Bước vào khuôn viên trường',
    rect: t(21, 8, 11, 2),
  },
  { id: 'furniture', label: 'Nội Thất Sofa So Good', prompt: 'Xem và mua nội thất', rect: t(32, 9, 5, 1) },
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
  {
    id: 'comga',
    label: 'Cơm Gà Xối Mỡ 68',
    prompt: 'Bước vào quán cơm gà xối mỡ',
    rect: t(12, 16, 5, 2),
  },
  {
    id: 'bida',
    label: 'CLB Bida H2S Biên Hòa',
    prompt: 'Bước vào quán bida giao lưu thi đấu',
    rect: t(12, 22, 5, 1),
  },
  { id: 'events', label: 'Bảng Sự Kiện', prompt: 'Xem sự kiện hôm nay', rect: t(30, 12, 5, 5) },
  { id: 'ai_kiosk', label: 'Trạm Thưởng AI', prompt: 'Mở trạm đổi thưởng AI', rect: t(19, 15, 3, 2) },
  { id: 'pier', label: 'Cầu Tàu Lắc Lư', prompt: 'Thả cần câu cá', rect: t(37, 26, 4, 4) },
  {
    id: 'fishing_shop',
    label: 'Tiệm Ngư Cụ Bác Ba',
    prompt: 'Mua & Nâng Cấp Cần Câu',
    rect: t(27, 25, 5, 2),
  },
  { id: 'plaza', label: 'Quảng Trường Trung Tâm', prompt: 'Gặp gỡ bạn bè', rect: t(17, 12, 13, 8) },
];

/** Shared art anchors keep scenery, lighting and server collision aligned. */
export const TOWN_LAMPS = [
  { x: 10, y: 10 },
  { x: 21, y: 10 },
  { x: 35, y: 12 },
  { x: 10, y: 19 },
  { x: 31, y: 19 },
  { x: 10, y: 25 },
  { x: 26, y: 28 },
  { x: 35, y: 20 },
];
export const TOWN_TREES = [
  { x: 2, y: 5 },
  { x: 10, y: 2 },
  { x: 21, y: 1 },
  { x: 34, y: 1 },
  { x: 3, y: 12 },
  { x: 2, y: 26 },
  { x: 3, y: 29 },
  { x: 15, y: 2 },
  { x: 28, y: 2 },
  { x: 28, y: 30 },
  { x: 42, y: 17 },
  { x: 46, y: 18 },
  { x: 14, y: 29 },
  { x: 45.625, y: 17.25 }, // small tree inside the temple courtyard
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
  { kind: 'board', x: 31, y: 14 },
  { kind: 'kiosk', x: 20, y: 16 },
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
  { kind: 'planter', x: 22, y: 10 },
  { kind: 'planter', x: 36, y: 10 },
  { kind: 'planter', x: 38, y: 10 },
  { kind: 'planter', x: 44, y: 10 },
  { kind: 'sign', x: 35, y: 18 },
  ...TOWN_LAMPS.map((p) => ({ kind: 'lamp' as const, ...p })),
];

export const BLOCKERS: Rect[] = [
  ...BUILDINGS.map((b) => b.rect),
  ...TOWN_SCENERY.map((s) => s.rect),
  ...TOWN_TEMPLE_WALLS,
  t(23, 15, 2, 2), // fountain
  t(30, 13, 2, 1), // event board
  t(19, 15, 2, 1), // AI kiosk
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
  // Western town border: rows 0-9 and rows 12-31 are blocked, rows 10-11 left open for farm gate portal
  t(0, 0, 1, 10),
  t(0, 12, 1, MAP_ROWS - 12),
  t(MAP_COLS - 1, 0, 1, MAP_ROWS),
];

export const PIER: Rect = t(38, 20, 2, 10);
export const WATER: Rect[] = [t(35, 20, 13, 12)];

/** A connected promenade, with short spurs to every usable entrance. */
export const PATHS: Rect[] = [
  t(0, 10, 2, 2),
  t(1, 10, 46, 2),
  t(10, 10, 2, 18),
  t(32, 10, 3, 18),
  t(10, 26, 25, 2),
  t(3, 26, 9, 2),
  t(10, 16, 7, 2),
  t(30, 16, 5, 2),
  t(22, 10, 3, 2),
  t(22, 20, 3, 8),
  t(4, 8, 7, 2),
  t(11, 8, 5, 2),
  t(16, 7, 5, 3),
  t(21, 8, 11, 2),
  t(32, 9, 5, 1),
  t(38, 10, 6, 2),
  t(3, 20, 9, 2),
  t(11, 22, 6, 4),
  t(27, 25, 8, 2),
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
  { x: 10, y: 12 },
  { x: 20, y: 11 },
  { x: 33, y: 11 },
  { x: 40, y: 12 },
  { x: 10, y: 23 },
  { x: 9, y: 27 },
  { x: 18, y: 27 },
  { x: 26, y: 22 },
  { x: 31, y: 27 },
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
  'dntu',
  'comga',
  'cybernet',
  'bida',
];

/** Cơm Gà Xối Mỡ 68 Biên Hòa interior grid & constants */
export const COMGA_COLS = 14;
export const COMGA_ROWS = 10;
export const COMGA_SPAWN = { x: 7 * TILE, y: 8.5 * TILE };
export const COMGA_BLOCKERS: Rect[] = [
  t(0, 0, COMGA_COLS, 2), // Back kitchen wall with stainless counter & glass chicken warmer
  t(1, 1, 3, 2), // Chicken fryer & boiling soup cauldrons
  t(10, 1, 3, 2), // Sauce, rice & drink prep station
  t(2, 4, 3, 2), // Stainless dining table 1
  t(8, 4, 4, 2), // Stainless dining table 2
  t(0, 0, 1, COMGA_ROWS), // Left wall
  t(COMGA_COLS - 1, 0, 1, COMGA_ROWS), // Right wall
  t(0, COMGA_ROWS - 1, 5, 1), // Bottom left wall
  t(9, COMGA_ROWS - 1, 5, 1), // Bottom right wall
];

/** CLB Bida H2S Trảng Dài (Biên Hòa) interior grid & constants */
export const BIDA_COLS = 16;
export const BIDA_ROWS = 12;
export const BIDA_SPAWN = { x: 8 * TILE, y: 9.6 * TILE };
export const BIDA_BLOCKERS: Rect[] = [
  t(0, 0, BIDA_COLS, 2), // Back wall with cue racks, scoreboard & beverage bar
  t(1, 1, 4, 1.8), // Reception & refreshment bar counter
  t(11, 1, 4, 1.8), // Professional carbon cue locker & trophy display
  t(1.8, 3.8, 4.8, 2.5), // Bida Table 1 (Pool 8-Ball - Left Upper)
  t(9.4, 3.8, 4.8, 2.5), // Bida Table 2 (Carom 3 Băng - Right Upper)
  t(1.8, 7.2, 4.8, 2.5), // Bida Table 3 (VIP Arena Table - Left Lower)
  t(10.2, 7.6, 4.8, 2.0), // Spectator lounge sofas & VIP seating (Right Lower)
  t(0, 0, 1, BIDA_ROWS), // Left wall
  t(BIDA_COLS - 1, 0, 1, BIDA_ROWS), // Right wall
  t(0, BIDA_ROWS - 1, 6.5, 1), // Bottom left wall
  t(9.5, BIDA_ROWS - 1, 6.5, 1), // Bottom right wall
];

/** Backward compatibility aliases for CyberNet */
export const CYBERNET_COLS = BIDA_COLS;
export const CYBERNET_ROWS = BIDA_ROWS;
export const CYBERNET_SPAWN = BIDA_SPAWN;
export const CYBERNET_BLOCKERS: Rect[] = [
  t(0, 0, CYBERNET_COLS, 1.5),
  t(0.5, 1.5, 4, 1.5),
  t(9, 1.4, 4.5, 1.6),
  ...[36, 132, 236, 332].flatMap((x) => [{ x, y: 144, w: 70, h: 56 }]),
  t(0, 0, 0.5, CYBERNET_ROWS),
  t(CYBERNET_COLS - 0.5, 0, 0.5, CYBERNET_ROWS),
  t(0, CYBERNET_ROWS - 1, 6.5, 1),
  t(9.5, CYBERNET_ROWS - 1, 6.5, 1),
];

/** DNTU University campus map grid & constants (48x32 master campus) */
export const DNTU_COLS = 48;
export const DNTU_ROWS = 32;
export const DNTU_SPAWN = { x: 43 * TILE, y: 18.5 * TILE };
export const DNTU_BLOCKERS: Rect[] = [
  // Outer perimeter fence & walls with openings at Cổng 1, Cổng 2, Cổng sau
  t(0, 0, DNTU_COLS, 1), // Top boundary fence
  t(0, DNTU_ROWS - 1, DNTU_COLS, 1), // Bottom boundary wall
  t(0, 0, 1, 7), // West wall (above back gate)
  t(0, 10, 1, DNTU_ROWS - 10), // West wall (below back gate)
  t(DNTU_COLS - 1, 0, 1, 12), // East wall (above Gate 2)
  t(DNTU_COLS - 1, 15, 1, 2), // East wall (between Gate 1 & Gate 2)
  t(DNTU_COLS - 1, 24, 1, DNTU_ROWS - 24), // East wall (below Gate 1)

  // Khu G (Trung Tâm Tích Hợp & Smart Labs & DNTU Gym)
  t(2, 1, 11, 3.2),

  // Khu F (Trung Tâm Thực Hành Kỹ Thuật Ô Tô & Cơ Khí)
  t(2, 5.5, 11, 3.5),

  // Khu C (Trung Tâm Thông Tin - Thư Viện)
  t(14, 9, 9, 6),

  // Khu B (Nguyễn Khuyến - Khoa CNTT & Kinh Tế)
  t(14, 18, 9, 9),

  // Khu A (Hành Chính - U-shaped building wings & Grand Archway Entrance)
  t(25, 10, 13, 3), // Khu A North Wing
  t(25, 23, 13, 3), // Khu A South Wing (Trường Quay)
  t(35, 10, 3, 4), // Khu A East North Wing (Trụ Sở Chính - Tháp Bắc)
  t(35, 21, 3, 3.5), // Khu A East South Wing (Trụ Sở Chính - Tháp Nam)
  t(35, 14, 3.5, 2.2), // Khu A Archway North Pier
  t(35, 19.6, 3.5, 1.4), // Khu A Archway South Pier
  // Rows 16.2..19.6 are open for the Grand Archway (Cổng Vòm Khải Hoàn Trụ Sở Chính)!

  // Cổng 1 Guardhouse & Gate Pylons
  t(43.8, 16, 3.2, 1.8), // Cổng 1 Guardhouse & North Pylon
  t(45, 22.8, 2, 1.2), // Cổng 1 South Pylon

  // Ký Túc Xá & Căng Tin (South-West)
  t(2, 28, 11, 3),

  // Trung Tâm Tuyển Sinh (North-East)
  t(40, 3, 6, 6),

  // Khu Sáng Tạo Khởi Nghiệp (North)
  t(24, 1, 10, 5),
];

/** VietDevPro office interior grid & constants */
export const COMPANY_COLS = 16;
export const COMPANY_ROWS = 11;
export const COMPANY_SPAWN = { x: 8 * TILE, y: 9.5 * TILE };
export const COMPANY_DESKS: Rect[] = [t(3, 4, 4, 2), t(9, 4, 4, 2)];
export const COMPANY_BLOCKERS: Rect[] = [
  t(0, 0, COMPANY_COLS, 2), // Back wall with whiteboard, monitors, etc.
  ...COMPANY_DESKS, // Two workstation islands; center aisle stays open.
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
    id: 'lilac',
    label: 'Lilac Soft Life',
    floor: 0xc9b394,
    floorAlt: 0xc4ad8f,
    wall: 0xe5dce9,
    trim: 0x96879e,
  },
  {
    id: 'matcha',
    label: 'Matcha Chạm Cỏ',
    floor: 0xccb99a,
    floorAlt: 0xc6b292,
    wall: 0xe2e7d5,
    trim: 0x7e947c,
  },
  {
    id: 'cozy',
    label: 'Gỗ Sồi Ấm Cúng',
    floor: 0xcbb08b,
    floorAlt: 0xc5a782,
    wall: 0xf0dfc8,
    trim: 0x8a5a3b,
  },
  {
    id: 'mint',
    label: 'Bạc Hà Tươi Mát',
    floor: 0xb8c6af,
    floorAlt: 0xb0bea8,
    wall: 0xe6f3ee,
    trim: 0x3f7a64,
  },
  {
    id: 'night',
    label: 'Cú Đêm Huyền Bí',
    floor: 0x626278,
    floorAlt: 0x5c5c71,
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

// ============================================================================
// COZY FARM SYSTEM AUTHORITATIVE MAP SPECIFICATIONS & BOUNDARIES
// ============================================================================

/** Master farm grid dimensions (48x32 rural landscape) */
export const FARM_COLS = 48;
export const FARM_ROWS = 32;
export const FARM_WIDTH = FARM_COLS * TILE;
export const FARM_HEIGHT = FARM_ROWS * TILE;

/** Aliases for compatibility */
export const FARM_MAP_COLS = FARM_COLS;
export const FARM_MAP_ROWS = FARM_ROWS;
export const FARM_MAP_WIDTH = FARM_WIDTH;
export const FARM_MAP_HEIGHT = FARM_HEIGHT;

/** Player spawns and portal transition targets */
export const FARM_SPAWN = { x: 5 * TILE, y: 3.5 * TILE };
export const FARM_GATE_EXIT = { x: 1 * TILE, y: 3.5 * TILE };
export const TOWN_FARM_PORTAL_SPAWN = { x: 2 * TILE, y: 11 * TILE };
export const FARM_GATE_PORTAL: Rect = t(0, 2, 2, 3);

export type FarmZoneId =
  | 'farm_gate'
  | 'farm_shop'
  | 'farm_warehouse'
  | 'farm_pond'
  | 'farm_plots'
  | 'barn_poultry'
  | 'barn_cattle'
  | 'barn_pig'
  | 'barn_goat';

export interface FarmZone {
  id: FarmZoneId;
  label: string;
  prompt: string;
  rect: Rect;
}

export const FARM_ZONES: FarmZone[] = [
  {
    id: 'farm_gate',
    label: 'Cổng Về Thị Trấn',
    prompt: 'Trở về thị trấn',
    rect: t(0, 2, 2, 3),
  },
  {
    id: 'farm_shop',
    label: 'Tiệm Nông Nghiệp Bác Sáu',
    prompt: 'Ghé tiệm Bác Sáu',
    rect: t(3, 8, 8, 3),
  },
  {
    id: 'farm_warehouse',
    label: 'Nhà Kho Nông Sản Silo',
    prompt: 'Mở kho Silo',
    rect: t(16, 8, 8, 3),
  },
  {
    id: 'farm_pond',
    label: 'Ao Thủy Sản & Guồng Nước',
    prompt: 'Quản lý ao cá',
    rect: t(30, 5, 16, 8),
  },
  {
    id: 'barn_poultry',
    label: 'Chuồng Gia Cầm (Gà & Vịt)',
    prompt: 'Chăm sóc gia cầm',
    rect: t(3, 18, 9, 5),
  },
  {
    id: 'barn_cattle',
    label: 'Chuồng Bò Sữa',
    prompt: 'Chăm sóc bò sữa',
    rect: t(14, 18, 9, 5),
  },
  {
    id: 'barn_pig',
    label: 'Chuồng Heo Mọi',
    prompt: 'Chăm sóc đàn heo',
    rect: t(3, 25, 9, 5),
  },
  {
    id: 'barn_goat',
    label: 'Chuồng Dê & Cừu',
    prompt: 'Chăm sóc dê cừu',
    rect: t(14, 25, 9, 5),
  },
  {
    id: 'farm_plots',
    label: 'Khu Đất Trồng Trọt',
    prompt: 'Canh tác nông sản',
    rect: t(26, 17, 20, 13),
  },
];

export const FARM_POIS = {
  shop_bac_sau: t(3, 8, 8, 3),
  silo_warehouse: t(16, 8, 8, 3),
  aquaculture_pond: t(30, 5, 16, 8),
  poultry_coop: t(3, 18, 9, 5),
  cattle_pasture: t(14, 18, 9, 5),
  pig_pen: t(3, 25, 9, 5),
  goat_pen: t(14, 25, 9, 5),
  crops_field: t(26, 17, 20, 13),
};

/** 36-plot grid specifications (6x6 layout) */
export const FARM_PLOT_TOTAL = 36;
export const FARM_PLOT_COLS = 6;
export const FARM_PLOT_ROWS = 6;
export const FARM_STARTER_PLOTS = [0, 1, 2, 3] as const;

export function getFarmPlotRect(index: number): Rect {
  if (index < 0 || index >= FARM_PLOT_TOTAL) {
    throw new Error(`Invalid plot index: ${index}. Must be 0..35.`);
  }
  const col = index % FARM_PLOT_COLS;
  const row = Math.floor(index / FARM_PLOT_COLS);
  // Plots start at tile (27, 18), spaced by 3.1 tiles horizontally and 2.1 tiles vertically
  return {
    x: Math.round((27 + col * 3.1) * TILE),
    y: Math.round((18 + row * 2.1) * TILE),
    w: Math.round(2.6 * TILE),
    h: Math.round(1.7 * TILE),
  };
}

export const FARM_BLOCKERS: Rect[] = [
  // Outer perimeter fence & walls
  t(0, 0, FARM_COLS, 1), // Top boundary fence
  t(0, FARM_ROWS - 1, FARM_COLS, 1), // Bottom boundary wall
  t(FARM_COLS - 1, 0, 1, FARM_ROWS), // East boundary canal/fence
  t(0, 0, 1, 2), // West boundary north of gate
  t(0, 5, 1, FARM_ROWS - 5), // West boundary south of gate (rows 2..4 left open for gate exit)
  // Structural building footprints
  t(3, 4, 8, 3.5), // Tiệm Nông Nghiệp Bác Sáu
  t(16, 4, 8, 3.5), // Nhà Kho Silo
  t(31, 5, 15, 7.5), // Ao Thủy Sản deep water basin
  // Livestock barn enclosure perimeter fences
  t(2.5, 17.5, 9.5, 0.8), // Poultry coop north railing
  t(15, 19.2, 7.5, 0.8), // Center park south dividing fence
  t(2.5, 24.5, 9.5, 0.8), // Pig pen north railing
  t(13.5, 24.5, 9.5, 0.8), // Goat pen north railing
];

/** Consolidated Farm Map authoritative metadata */
export const FARM_MAP = {
  cols: FARM_COLS,
  rows: FARM_ROWS,
  width: FARM_WIDTH,
  height: FARM_HEIGHT,
  spawn: FARM_SPAWN,
  gateExit: FARM_GATE_EXIT,
  townSpawn: TOWN_FARM_PORTAL_SPAWN,
  zones: FARM_ZONES,
  blockers: FARM_BLOCKERS,
  pois: FARM_POIS,
  plotTotal: FARM_PLOT_TOTAL,
  plotCols: FARM_PLOT_COLS,
  plotRows: FARM_PLOT_ROWS,
  starterPlots: FARM_STARTER_PLOTS,
  getPlotRect: getFarmPlotRect,
} as const;
