import type { Rect } from './map.js';
import type { MartialSkillId } from './martial.js';

export const CAVE_WIDTH = 960;
export const CAVE_HEIGHT = 640;
export const CAVE_SPAWN = { x: 120, y: 336 };
export const CAVE_GATE = { x: 800, y: 304 };
export const CAVE_SHOP = { x: 400, y: 280 };
export const CAVE_STAIRS = { x: 832, y: 320 };
export const CAVE_MAX_FLOOR = 18;

export const CAVE_BLOCKERS: Rect[] = [
  { x: 0, y: 0, w: 960, h: 64 },
  { x: 0, y: 576, w: 960, h: 64 },
  { x: 0, y: 0, w: 48, h: 640 },
  { x: 912, y: 0, w: 48, h: 640 },
];

export const CAVE_WEAPONS = [
  { id: 'training', name: 'Kiếm tập sự', damage: 12, price: 0, color: 0xd9bea2 },
  { id: 'iron', name: 'Kiếm sắt', damage: 22, price: 180, color: 0xc3dfed },
  { id: 'crystal', name: 'Kiếm tinh thể', damage: 36, price: 650, color: 0x8af5de },
] as const;
export type CaveWeapon = (typeof CAVE_WEAPONS)[number]['id'];

export const CAVE_RESOURCES = [
  { id: 'stone', name: 'Đá', price: 3, color: 0xa6b3ca },
  { id: 'iron', name: 'Quặng sắt', price: 9, color: 0xe3ad7d },
  { id: 'crystal', name: 'Tinh thể', price: 24, color: 0x7eeed5 },
] as const;
export type CaveResource = (typeof CAVE_RESOURCES)[number]['id'];

export interface CaveAccount {
  weapon: CaveWeapon;
  resources: Record<CaveResource, number>;
  coin: number;
}

export type CaveEnemyKind = 'slime' | 'bat' | 'scorpion' | 'serpent' | 'golem' | 'colossus';

export type CaveAttackKind = 'melee' | 'cone_slam' | 'radial_burst' | 'poison_spray' | 'meteor' | 'laser';

export interface CaveEnemy {
  id: string;
  kind: CaveEnemyKind;
  name?: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  nextAttack: number;
  windup: number;
  attackKind?: CaveAttackKind;
  speed?: number;
  damage?: number;
  enraged?: boolean;
}

export interface CaveOre {
  id: string;
  resource: CaveResource;
  x: number;
  y: number;
  hp: number;
}

export interface CaveSnapshot {
  combat?: {
    now: number;
    learned: MartialSkillId[];
    energy: number;
    cooldowns: Partial<Record<MartialSkillId, number>>;
    casting: MartialSkillId | null;
    guardUntil: number;
  };
  floor: number;
  hp: number;
  account: CaveAccount;
  enemies: CaveEnemy[];
  ores: CaveOre[];
  cleared: boolean;
  clearedToday?: boolean;
  dailyDateKey?: string;
  clearedFloorsToday?: number[];
}

export type CaveEffectKind =
  | 'slash'
  | 'hit'
  | 'hurt'
  | 'defeat'
  | 'loot'
  | 'mine'
  | 'portal'
  | 'cone_slam'
  | 'radial_burst'
  | 'poison_spray'
  | 'meteor'
  | 'laser';

export interface CaveEffect {
  kind: CaveEffectKind;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  angle?: number;
  amount?: number;
  label?: string;
  color?: number;
}

/** Returns date key (YYYY-MM-DD) in Asia/Ho_Chi_Minh (UTC+7) timezone. */
export function getBienHoaDateKey(timestamp = Date.now()): string {
  const d = new Date(timestamp + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

/** Generates monsters and ores for any of the 18 cave tiers. If cleared today or previously defeated/mined today, excludes them to prevent money farming exploits. */
export function caveFloor(
  floor: number,
  clearedToday = false,
  defeatedIds?: Set<string>,
  minedOreIds?: Set<string>,
): { enemies: CaveEnemy[]; ores: CaveOre[] } {
  if (!Number.isInteger(floor) || floor < 1 || floor > CAVE_MAX_FLOOR)
    throw new Error('Tầng hang không hợp lệ.');

  if (clearedToday) {
    return { enemies: [], ores: [] };
  }

  // Count scaling: 3 + floor for floors 1..5; 8..10 for higher floors
  const enemyCount = floor <= 5 ? 3 + floor : Math.min(10, 6 + Math.floor(floor / 3));

  const enemies: CaveEnemy[] = Array.from({ length: enemyCount }, (_, i) => {
    let kind: CaveEnemyKind = 'slime';
    let attackKind: CaveAttackKind = 'radial_burst';
    let name = 'Slime Tinh Thể';
    let hp = 30 + floor * 12;
    let speed = 46;
    let damage = 6 + floor * 3;

    if (floor === 18) {
      if (i === 0) {
        kind = 'colossus';
        attackKind = 'meteor';
        name = 'Chúa Tể Hư Không Cổ Đại';
        hp = 1800;
        speed = 36;
        damage = 65;
      } else {
        kind = 'golem';
        attackKind = 'cone_slam';
        name = 'Hộ Vệ Hắc Diện';
        hp = 650;
        speed = 40;
        damage = 38;
      }
    } else if (floor >= 16) {
      if (i === 0) {
        kind = 'colossus';
        attackKind = 'laser';
        name = 'Cự Nhân Hư Không';
        hp = 850 + (floor - 16) * 300;
        speed = 35;
        damage = 48;
      } else if (i % 2 === 0) {
        kind = 'golem';
        attackKind = 'cone_slam';
        name = 'Người Đá Hắc Diện';
        hp = 420;
        speed = 38;
        damage = 34;
      } else {
        kind = 'serpent';
        attackKind = 'melee';
        name = 'Mãng Xà Hư Không';
        hp = 340;
        speed = 65;
        damage = 30;
      }
    } else if (floor >= 13) {
      if (i % 2 === 0) {
        kind = 'golem';
        attackKind = 'cone_slam';
        name = 'Người Đá Hỏa Diệm';
        hp = 360 + floor * 15;
        speed = 36;
        damage = 28 + floor;
      } else {
        kind = 'serpent';
        attackKind = 'melee';
        name = 'Rắn Lửa Dung Nham';
        hp = 280 + floor * 10;
        speed = 64;
        damage = 24 + floor;
      }
    } else if (floor >= 10) {
      if (i % 3 === 0) {
        kind = 'golem';
        attackKind = 'cone_slam';
        name = 'Người Đá Thạch Anh';
        hp = 280 + floor * 10;
        speed = 35;
        damage = 22 + floor;
      } else if (i % 3 === 1) {
        kind = 'serpent';
        attackKind = 'melee';
        name = 'Rắn Ngọc Bích';
        hp = 200 + floor * 8;
        speed = 62;
        damage = 18 + floor;
      } else {
        kind = 'scorpion';
        attackKind = 'poison_spray';
        name = 'Bọ Cạp Tử Tinh';
        hp = 180 + floor * 8;
        speed = 52;
        damage = 17 + floor;
      }
    } else if (floor >= 7) {
      if (i % 2 === 0) {
        kind = 'serpent';
        attackKind = 'melee';
        name = 'Rắn Ngọc Bích';
        hp = 160 + floor * 8;
        speed = 60;
        damage = 16 + floor;
      } else {
        kind = 'scorpion';
        attackKind = 'poison_spray';
        name = 'Bọ Cạp Thạch Anh';
        hp = 140 + floor * 6;
        speed = 50;
        damage = 14 + floor;
      }
    } else if (floor >= 4) {
      if (floor === 5 && i === 0) {
        kind = 'golem';
        attackKind = 'cone_slam';
        name = 'Người Đá Cổ';
        hp = 180;
        speed = 32;
        damage = 24;
      } else if (i % 2 === 0) {
        kind = 'scorpion';
        attackKind = 'poison_spray';
        name = 'Bọ Cạp Thạch Anh';
        hp = 90 + floor * 8;
        speed = 48;
        damage = 10 + floor * 2;
      } else {
        kind = 'bat';
        attackKind = 'melee';
        name = 'Dơi Hang Lam';
        hp = 70 + floor * 6;
        speed = 72;
        damage = 8 + floor * 2;
      }
    } else {
      // Floors 1..3
      if (floor === 5 && i === 0) {
        kind = 'golem';
        attackKind = 'cone_slam';
        name = 'Người Đá Cổ';
        hp = 180;
        speed = 32;
        damage = 24;
      } else if (i % 2) {
        kind = 'bat';
        attackKind = 'melee';
        name = 'Dơi Hang Lam';
        hp = 20 + floor * 8;
        speed = 70;
        damage = 6 + floor * 2;
      } else {
        kind = 'slime';
        attackKind = 'radial_burst';
        name = 'Slime Tinh Thể';
        hp = 20 + floor * 8;
        speed = 46;
        damage = 4 + floor * 2;
      }
    }

    // Spread across the cavern interior avoiding walls
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 390 + col * 160;
    const y = 180 + row * 115;

    return {
      id: `enemy-${i}`,
      kind,
      name,
      x,
      y,
      hp,
      maxHp: hp,
      nextAttack: 0,
      windup: 0,
      attackKind,
      speed,
      damage,
    };
  });

  const ores: CaveOre[] = Array.from({ length: 5 }, (_, i) => ({
    id: `ore-${i}`,
    resource: floor >= 3 && i > 1 ? 'crystal' : i % 2 ? 'iron' : 'stone',
    x: 240 + i * 136,
    y: i % 2 ? 500 : 104,
    hp: 3,
  }));

  const activeEnemies = defeatedIds ? enemies.filter((e) => !defeatedIds.has(e.id)) : enemies;
  const activeOres = minedOreIds ? ores.filter((o) => !minedOreIds.has(o.id)) : ores;
  return { enemies: activeEnemies, ores: activeOres };
}

export function caveNear(a: { x: number; y: number }, b: { x: number; y: number }, range = 76) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= range;
}

export function caveSaleValue(resources: CaveAccount['resources']) {
  return CAVE_RESOURCES.reduce((total, r) => total + resources[r.id] * r.price, 0);
}
