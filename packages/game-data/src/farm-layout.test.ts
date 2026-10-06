import { describe, expect, it } from 'vitest';
import { FARM_BLOCKERS, FARM_POIS, FARM_SPAWN, FARM_WIDTH, FARM_HEIGHT, getFarmPlotRect } from './map.js';
import { stepMovement } from './movement.js';

describe('restored farm routes', () => {
  it('keeps the pond, buildings, pens and crop field separate', () => {
    const areas = Object.values(FARM_POIS);
    for (let i = 0; i < areas.length; i++)
      for (let j = i + 1; j < areas.length; j++) {
        const a = areas[i]!,
          b = areas[j]!;
        expect(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y).toBe(false);
      }
  });

  it('lets an avatar walk from the gate to every pen, shop, warehouse and plot', () => {
    const opts = { blockers: FARM_BLOCKERS, width: FARM_WIDTH, height: FARM_HEIGHT, speed: 32 };
    const queue = [FARM_SPAWN];
    const visited = new Set([`${FARM_SPAWN.x},${FARM_SPAWN.y}`]);
    for (let head = 0; head < queue.length; head++) {
      const p = queue[head]!;
      for (const [x, y] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const next = stepMovement(p, { x, y }, 1, opts);
        // Only admit full grid steps; collision resolution must not bypass rail corners.
        if (next.x !== p.x + x * 8 || next.y !== p.y + y * 8) continue;
        const key = `${next.x},${next.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(next);
        }
      }
    }
    const goals = [
      ...[FARM_POIS.shop_bac_sau, FARM_POIS.silo_warehouse].map((p) => ({
        x: p.x + p.w / 2,
        y: p.y + p.h + 16,
      })),
      ...[FARM_POIS.poultry_coop, FARM_POIS.pig_pen, FARM_POIS.goat_pen, FARM_POIS.cattle_pasture].map(
        (p) => ({ x: p.x + p.w / 2, y: p.y + p.h - 32 }),
      ),
      ...Array.from({ length: 36 }, (_, i) => {
        const r = getFarmPlotRect(i);
        return { x: r.x + 24, y: r.y + 24 };
      }),
    ];
    for (const g of goals) expect(visited.has(`${g.x},${g.y}`), `unreachable ${g.x},${g.y}`).toBe(true);
  });
});
