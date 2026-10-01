import { describe, expect, it } from 'vitest';
import {
  COMPANY_BLOCKERS,
  COMPANY_DESKS,
  COMPANY_SPAWN,
  DNTU_BLOCKERS,
  DNTU_DESKS,
  DNTU_SPAWN,
  TILE,
  type Rect,
} from './map.js';
import { isWalkable, PLAYER_SPEED, stepMovement } from './movement.js';

function reachable(spawn: { x: number; y: number }, blockers: Rect[]) {
  const queue = [spawn];
  const visited = new Set<string>([spawn.x + ',' + spawn.y]);
  const step = TILE / 2;
  for (let i = 0; i < queue.length; i++) {
    for (const input of [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      const next = stepMovement(queue[i]!, input, step / PLAYER_SPEED, {
        width: 16 * TILE,
        height: 11 * TILE,
        blockers,
      });
      if (next.x < step || next.x > 15 * TILE || next.y < step || next.y > 10 * TILE) continue;
      if (next.x % step || next.y % step) continue;
      const key = next.x + ',' + next.y;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return queue;
}

for (const room of [
  {
    name: 'company',
    blockers: COMPANY_BLOCKERS,
    spawn: COMPANY_SPAWN,
    desks: COMPANY_DESKS,
    interactions: [[144, 90], [448, 115], [58, 115], ...[128, 192, 320, 384].map((x) => [x, 208])],
  },
  {
    name: 'university',
    blockers: DNTU_BLOCKERS,
    spawn: DNTU_SPAWN,
    desks: DNTU_DESKS,
    interactions: [
      [256, 102],
      [70, 144],
      [442, 144],
      [256, 90],
      [160, 240],
      [352, 240],
      [384, 96],
    ],
  },
]) {
  describe(room.name + ' interior layout', () => {
    it('keeps the center aisle, spawn and exit walkable', () => {
      expect(isWalkable(room.spawn.x, room.spawn.y, room.blockers)).toBe(true);
      for (let y = 3 * TILE; y <= 10 * TILE; y += 8) {
        expect(isWalkable(8 * TILE, y, room.blockers), 'center aisle at ' + y).toBe(true);
      }
      const accessible = reachable(room.spawn, room.blockers);
      expect(accessible.some((p) => p.x === 256 && p.y === 96)).toBe(true);
      expect(accessible.some((p) => p.x === 256 && p.y === 320)).toBe(true);
    });

    it('blocks both desk footprints using the shared movement resolver', () => {
      for (const desk of room.desks) {
        expect(isWalkable(desk.x + desk.w / 2, desk.y + desk.h / 2, room.blockers)).toBe(false);
        const start = { x: desk.x + desk.w / 2, y: desk.y + desk.h + 6 };
        expect(stepMovement(start, { x: 0, y: -1 }, 0.05, { blockers: room.blockers })).toEqual(start);
      }
    });

    it('lets keyboard players reach every fixture and NPC interaction', () => {
      const accessible = reachable(room.spawn, room.blockers);
      for (const [x, y] of room.interactions) {
        expect(
          accessible.some((p) => Math.hypot(p.x - x!, p.y - y!) <= 2 * TILE),
          'interaction ' + x + ',' + y,
        ).toBe(true);
      }
    });
  });
}
