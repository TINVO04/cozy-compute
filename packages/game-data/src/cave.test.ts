import { describe, expect, it } from 'vitest';
import { CAVE_BLOCKERS, CAVE_SPAWN, CAVE_STAIRS, caveFloor, caveSaleValue } from './cave.js';
import { getTownReturnSpawn, MAP_HEIGHT, MAP_WIDTH, SPAWN } from './map.js';
import { isWalkable } from './movement.js';

describe('cave maps and economy', () => {
  it('connects town spawn to the east road exit and returns outside its trigger', () => {
    const queue = [{ x: Math.round(SPAWN.x / 16), y: Math.round(SPAWN.y / 16) }];
    const seen = new Set<string>();
    let found = false;
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i]!;
      const key = p.x + ',' + p.y;
      if (seen.has(key)) continue;
      seen.add(key);
      if (p.x * 16 >= 1488 && p.y * 16 >= 330 && p.y * 16 <= 374) {
        found = true;
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const x = p.x + dx!,
          y = p.y + dy!;
        if (x > 0 && y > 0 && x * 16 < MAP_WIDTH && y * 16 < MAP_HEIGHT && isWalkable(x * 16, y * 16))
          queue.push({ x, y });
      }
    }
    expect(found).toBe(true);
    const back = getTownReturnSpawn('cave');
    expect(isWalkable(back.x, back.y)).toBe(true);
    expect(back.x).toBeLessThan(1488);
  });
  it('keeps all encounters reachable and increases difficulty through 18 tiers with daily lockout', () => {
    expect(isWalkable(CAVE_SPAWN.x, CAVE_SPAWN.y, CAVE_BLOCKERS)).toBe(true);
    expect(isWalkable(CAVE_STAIRS.x, CAVE_STAIRS.y, CAVE_BLOCKERS)).toBe(true);
    for (let floor = 1; floor <= 18; floor++) {
      const contents = caveFloor(floor);
      for (const entity of [...contents.enemies, ...contents.ores])
        expect(isWalkable(entity.x, entity.y, CAVE_BLOCKERS)).toBe(true);
      if (floor <= 5) expect(contents.enemies.length).toBe(3 + floor);
      else expect(contents.enemies.length).toBeGreaterThanOrEqual(6);
    }
    // Floor 5 features golem
    expect(caveFloor(5).enemies.some((e) => e.kind === 'golem')).toBe(true);
    // Floor 18 features the ancient boss Colossus
    expect(caveFloor(18).enemies.some((e) => e.kind === 'colossus')).toBe(true);
    // Daily lockout clears monsters when already cleared today
    const lockedToday = caveFloor(10, true);
    expect(lockedToday.enemies.length).toBe(0);
    expect(lockedToday.ores.length).toBe(0);
    // Defeated enemies and mined nodes remain dead within the day
    const partiallyDefeated = caveFloor(1, false, new Set(['enemy-0', 'enemy-2']), new Set(['ore-1']));
    expect(partiallyDefeated.enemies.some((e) => e.id === 'enemy-0')).toBe(false);
    expect(partiallyDefeated.enemies.some((e) => e.id === 'enemy-2')).toBe(false);
    expect(partiallyDefeated.enemies.some((e) => e.id === 'enemy-1')).toBe(true);
    expect(partiallyDefeated.ores.some((o) => o.id === 'ore-1')).toBe(false);
    expect(partiallyDefeated.ores.some((o) => o.id === 'ore-0')).toBe(true);
    // Floors beyond 18 throw
    expect(() => caveFloor(19)).toThrow();
    expect(caveSaleValue({ stone: 3, iron: 2, crystal: 4 })).toBe(123);
  });
});
