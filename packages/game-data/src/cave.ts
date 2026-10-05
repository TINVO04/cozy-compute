import type { Rect } from './map.js';
import type { MartialSkillId } from './martial.js';

export const CAVE_WIDTH = 960;
export const CAVE_HEIGHT = 640;
export const CAVE_SPAWN = { x: 120, y: 336 };
export const CAVE_GATE = { x: 800, y: 304 };
export const CAVE_SHOP = { x: 400, y: 280 };
export const CAVE_STAIRS = { x: 832, y: 320 };
export const CAVE_MAX_FLOOR = 5;
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
export interface CaveEnemy {
  id: string;
  kind: 'slime' | 'bat' | 'golem';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  nextAttack: number;
  windup: number;
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
}
export interface CaveEffect {
  kind: 'slash' | 'hit' | 'hurt' | 'defeat' | 'loot' | 'mine' | 'portal';
  x: number;
  y: number;
  angle?: number;
  amount?: number;
  label?: string;
  color?: number;
}
export function caveFloor(floor: number): { enemies: CaveEnemy[]; ores: CaveOre[] } {
  if (!Number.isInteger(floor) || floor < 1 || floor > CAVE_MAX_FLOOR)
    throw new Error('Tầng hang không hợp lệ.');
  const enemies: CaveEnemy[] = Array.from({ length: 3 + floor }, (_, i) => {
    const kind = floor === 5 && i === 0 ? 'golem' : i % 2 ? 'bat' : 'slime';
    const hp = kind === 'golem' ? 180 : 20 + floor * 8;
    return {
      id: `enemy-${i}`,
      kind,
      x: 390 + (i % 3) * 160,
      y: 180 + Math.floor(i / 3) * 138,
      hp,
      maxHp: hp,
      nextAttack: 0,
      windup: 0,
    };
  });
  const ores: CaveOre[] = Array.from({ length: 5 }, (_, i) => ({
    id: `ore-${i}`,
    resource: floor >= 3 && i > 2 ? 'crystal' : i % 2 ? 'iron' : 'stone',
    x: 240 + i * 136,
    y: i % 2 ? 500 : 104,
    hp: 3,
  }));
  return { enemies, ores };
}
export function caveNear(a: { x: number; y: number }, b: { x: number; y: number }, range = 76) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= range;
}
export function caveSaleValue(resources: CaveAccount['resources']) {
  return CAVE_RESOURCES.reduce((total, r) => total + resources[r.id] * r.price, 0);
}
