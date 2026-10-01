import { describe, expect, it } from 'vitest';
import { DNTU_BLOCKERS, DNTU_COLS, DNTU_ROWS, DNTU_SPAWN, TILE } from './map.js';
import { isWalkable, PLAYER_SPEED, stepMovement } from './movement.js';

function campusRoutes() {
  const queue = [DNTU_SPAWN];
  const visited = new Set([DNTU_SPAWN.x + ',' + DNTU_SPAWN.y]);
  const step = TILE / 2;
  for (let i = 0; i < queue.length; i++) {
    for (const input of [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      const next = stepMovement(queue[i]!, input, step / PLAYER_SPEED, {
        blockers: DNTU_BLOCKERS,
        width: DNTU_COLS * TILE,
        height: DNTU_ROWS * TILE,
      });
      const key = next.x + ',' + next.y;
      if (next.x % step || next.y % step || visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return queue;
}

describe('restored PR #2 DNTU campus', () => {
  it('uses the full campus and a walkable main-gate spawn', () => {
    expect([DNTU_COLS, DNTU_ROWS]).toEqual([48, 32]);
    expect(isWalkable(DNTU_SPAWN.x, DNTU_SPAWN.y, DNTU_BLOCKERS)).toBe(true);
  });

  it('connects the main gate, archway, sports grounds and all keyboard interactions', () => {
    const routes = campusRoutes();
    for (const [x, y] of [
      [47, 20],
      [47, 13.5],
      [35, 18.5],
      [29.5, 17.5],
      [18.5, 16.5],
      [24, 22.5],
      [24, 15],
      [43.2, 17.5],
      [7.5, 15],
      [18.5, 15.5],
      [7.2, 16],
      [10, 24],
      [31, 22.5],
      [29, 6.5],
      [7, 27.5],
      [8, 4.6],
      [4.5, 4.6],
      [4.5, 9.5],
      [9.5, 9.5],
    ]) {
      expect(
        routes.some((p) => Math.hypot(p.x - x! * TILE, p.y - y! * TILE) <= TILE),
        'reachable campus point ' + x + ',' + y,
      ).toBe(true);
    }
  });

  it('blocks building interiors while keeping the archway passage open', () => {
    for (const [x, y] of [
      [7, 2],
      [7, 7],
      [18, 11],
      [18, 21],
      [30, 11],
      [30, 24],
    ])
      expect(isWalkable(x! * TILE, y! * TILE, DNTU_BLOCKERS)).toBe(false);
    for (let x = 34; x <= 40; x += 0.5) expect(isWalkable(x * TILE, 18 * TILE, DNTU_BLOCKERS)).toBe(true);
  });
});
