import type { CaveWeapon } from './cave.js';
import type { Rect } from './map.js';
import { isWalkable } from './movement.js';

export const MARTIAL_WIDTH = 960;
export const MARTIAL_HEIGHT = 720;
export const MARTIAL_SPAWN = { x: 480, y: 628 };
export const MARTIAL_MASTER = { x: 168, y: 300 };
export const MARTIAL_DUMMY = { x: 784, y: 360 };
export const MARTIAL_RING = { x: 480, y: 360, radius: 196 };
export const MARTIAL_DOOR = { x: 1398, y: 558 };
export const MARTIAL_DASH_DISTANCE = 132;
export const MARTIAL_DASH_MS = 240;
export const MARTIAL_BLOCKERS: Rect[] = [
  { x: 0, y: 0, w: 960, h: 112 },
  { x: 0, y: 0, w: 40, h: 720 },
  { x: 920, y: 0, w: 40, h: 720 },
  { x: 0, y: 688, w: 960, h: 32 },
  { x: 140, y: 268, w: 56, h: 20 },
  { x: 772, y: 328, w: 24, h: 20 },
  { x: 92, y: 432, w: 98, h: 24 },
  { x: 786, y: 432, w: 98, h: 24 },
  { x: 102, y: 500, w: 100, h: 28 },
  { x: 774, y: 500, w: 100, h: 28 },
];
export const MARTIAL_SKILLS = [
  {
    id: 'slash',
    key: '1',
    name: 'Trảm phong',
    description: 'Chém hình quạt phía trước.',
    range: 86,
    damage: 1,
    cooldown: 650,
    windup: 180,
    energy: 0,
    color: 0xffdd91,
  },
  {
    id: 'wave',
    key: '2',
    name: 'Kiếm khí',
    description: 'Triệu hồi phi kiếm, lướt nhanh theo hướng nhìn và chém dọc đường.',
    range: 210,
    damage: 1.4,
    cooldown: 2600,
    windup: 520,
    energy: 28,
    color: 0x86efdc,
  },
  {
    id: 'spin',
    key: '3',
    name: 'Liên hoa kiếm',
    description: 'Triệu hồi sáu phi kiếm, xoay thành liên hoa chém quanh người.',
    range: 112,
    damage: 1.25,
    cooldown: 3400,
    windup: 480,
    energy: 32,
    color: 0xf5a1c8,
  },
  {
    id: 'guard',
    key: '4',
    name: 'Kim chung tráo',
    description: 'Dựng kiếm trận hộ thân, giảm 75% sát thương trong 1 giây.',
    range: 0,
    damage: 0,
    cooldown: 4500,
    windup: 0,
    energy: 24,
    color: 0xf9d477,
  },
  {
    id: 'bolt',
    key: '5',
    name: 'Tam kiếm quyết',
    description: 'Tụ ba phi kiếm rồi phóng thẳng về phía trước.',
    range: 250,
    damage: 1.3,
    cooldown: 3000,
    windup: 620,
    energy: 26,
    color: 0x8ccfff,
  },
  {
    id: 'rain',
    key: '6',
    name: 'Vạn kiếm trận',
    description: 'Gọi kiếm từ trên cao xuống vùng tròn phía trước. Đối thủ có thể né vùng báo chiêu.',
    range: 150,
    damage: 1.8,
    cooldown: 6500,
    windup: 950,
    energy: 44,
    color: 0xc3a3ff,
  },
  {
    id: 'step',
    key: '7',
    name: 'Ảnh bộ',
    description: 'Lướt theo hướng nhìn, để lại tàn ảnh. Không gây sát thương.',
    range: 0,
    damage: 0,
    cooldown: 2300,
    windup: 100,
    energy: 18,
    color: 0x9fe9eb,
  },
  {
    id: 'heal',
    key: '8',
    name: 'Hồi nguyên',
    description: 'Tụ linh khí hồi 24 thể lực. Cần đứng lại vận công trong thoáng chốc.',
    range: 0,
    damage: 0,
    cooldown: 10000,
    windup: 800,
    energy: 40,
    color: 0xa5ecb0,
  },
] as const;
export type MartialSkillId = (typeof MARTIAL_SKILLS)[number]['id'];
export interface MartialFighter {
  sid: string;
  userId: string;
  name: string;
  weapon: CaveWeapon;
  learned: MartialSkillId[];
  hp: number;
  energy: number;
  cooldowns: Partial<Record<MartialSkillId, number>>;
  guardUntil: number;
}
export interface MartialMatch {
  id: string;
  a: string;
  b: string;
  startsAt: number;
  endsAt: number;
}
export interface MartialInvite {
  from: string;
  to: string;
  expiresAt: number;
}
export interface MartialRank {
  userId: string;
  name: string;
  rating: number;
  wins: number;
}
export interface MartialSnapshot {
  now: number;
  fighters: MartialFighter[];
  match: MartialMatch | null;
  invites: MartialInvite[];
  rankings: MartialRank[];
  result: string;
}
export interface MartialEffect {
  skill: MartialSkillId;
  phase: 'windup' | 'cast' | 'hit' | 'dash';
  sid?: string;
  targetSid?: string;
  duration?: number;
  endX?: number;
  endY?: number;
  x: number;
  y: number;
  angle: number;
  amount?: number;
}

/** Sweep in small steps so a dash can never cross scenery or the tournament boundary. */
export function martialDashEnd(origin: { x: number; y: number }, angle: number, inRing: boolean) {
  let end = { ...origin };
  for (let distance = 2; distance <= MARTIAL_DASH_DISTANCE; distance += 2) {
    const x = origin.x + Math.cos(angle) * distance,
      y = origin.y + Math.sin(angle) * distance;
    if (x < 50 || x > MARTIAL_WIDTH - 50 || y < 118 || y > 684 || !isWalkable(x, y, MARTIAL_BLOCKERS)) break;
    if (inRing && Math.hypot(x - MARTIAL_RING.x, y - MARTIAL_RING.y) > MARTIAL_RING.radius) break;
    end = { x, y };
  }
  return end;
}

export function martialDashHits(
  from: { x: number; y: number },
  to: { x: number; y: number },
  target: { x: number; y: number },
) {
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq
    ? Math.max(0, Math.min(1, ((target.x - from.x) * dx + (target.y - from.y) * dy) / lengthSq))
    : 0;
  return Math.hypot(target.x - from.x - t * dx, target.y - from.y - t * dy) <= 30;
}
export function martialDamage(weapon: CaveWeapon, skill: MartialSkillId, guarded: boolean) {
  const base = { training: 12, iron: 16, crystal: 20 }[weapon];
  const move = MARTIAL_SKILLS.find((s) => s.id === skill)!;
  return Math.max(0, Math.round(base * move.damage * (guarded ? 0.25 : 1)));
}
export function martialHits(
  skill: MartialSkillId,
  origin: { x: number; y: number },
  target: { x: number; y: number },
  angle: number,
) {
  const move = MARTIAL_SKILLS.find((s) => s.id === skill)!;
  const dx = target.x - origin.x,
    dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (skill === 'heal' || skill === 'step') return false;
  if (skill === 'rain') return Math.hypot(dx - Math.cos(angle) * 116, dy - Math.sin(angle) * 116) <= 66;
  if (distance > move.range || skill === 'guard') return false;
  if (skill === 'spin' || distance < 18) return true;
  const diff = Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle));
  return Math.abs(diff) <= (skill === 'wave' || skill === 'bolt' ? 0.28 : 1.05);
}
