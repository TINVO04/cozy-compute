import { describe, expect, it } from 'vitest';
import { TownLifeSimulation, lifeGroundClear, MAX_PASSING_VENDORS } from './town-life.js';
import { MAP_WIDTH } from './map.js';
import { onRoad } from './vehicles.js';

function simulation() {
  let seed = 42;
  return new TownLifeSimulation(() => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const advance = (sim: TownLifeSimulation, seconds: number, players: { x: number; y: number }[] = []) => {
  for (let i = 0; i < seconds * 20; i++) sim.update(50, i * 50, players);
};
describe('living town simulation', () => {
  it('keeps vendors on the road and ground animals outside solid scenery over ten minutes', () => {
    const sim = simulation();
    const start = new Map(
      sim.actors.filter((a) => a.kind !== 'vendor').map((a) => [a.id, { x: a.x, y: a.y }]),
    );
    const moved = new Set<string>();
    for (let i = 0; i < 12000; i++) {
      sim.update(50, i * 50, []);
      for (const a of sim.actors) {
        const initial = start.get(a.id);
        if (initial && Math.hypot(a.x - initial.x, a.y - initial.y) > 1) moved.add(a.id);
      }
      if (i % 20) continue;
      for (const a of sim.actors)
        expect(
          a.kind === 'vendor'
            ? a.x < 32 || a.x > MAP_WIDTH - 32 || onRoad(a.x, a.y)
            : lifeGroundClear(a.x, a.y),
        ).toBe(true);
    }
    for (const a of sim.actors.filter((a) => a.kind !== 'vendor')) expect(moved.has(a.id)).toBe(true);
  });
  it('brings distinct visits in from both gates and removes them only after exiting the opposite edge', () => {
    const sim = simulation();
    const seen = new Map<string, { fromLeft: boolean; variant: number; x: number }>();
    const departed = new Set<string>();
    let previous = new Set<string>();
    for (let i = 0; i < 12000; i++) {
      const vendors = sim.actors.filter((a) => a.kind === 'vendor');
      expect(vendors.length).toBeLessThanOrEqual(MAX_PASSING_VENDORS);
      expect(new Set(vendors.map((a) => a.variant)).size).toBe(vendors.length);
      const active = new Set(vendors.map((a) => a.id));
      for (const a of vendors) {
        expect(departed.has(a.id)).toBe(false);
        if (!seen.has(a.id)) {
          expect(a.x < -100 || a.x > MAP_WIDTH + 100).toBe(true);
          seen.set(a.id, { fromLeft: a.x < 0, variant: a.variant, x: a.x });
        }
        const visit = seen.get(a.id)!;
        expect(visit.fromLeft ? a.x >= visit.x : a.x <= visit.x).toBe(true);
        visit.x = a.x;
      }
      for (const id of previous)
        if (!active.has(id)) {
          const visit = seen.get(id)!;
          expect(visit.fromLeft ? visit.x > MAP_WIDTH + 100 : visit.x < -100).toBe(true);
          departed.add(id);
          expect(sim.talk(id, { x: visit.x, y: 352 })).toBeNull();
        }
      previous = active;
      sim.update(50, i * 50, []);
    }
    expect(departed.size).toBeGreaterThan(10);
    expect(new Set([...seen.values()].map((v) => v.fromLeft)).size).toBe(2);
    expect(new Set([...seen.values()].map((v) => v.variant)).size).toBe(6);
  }, 20000);
  it('validates talk proximity, throttles repeats, pauses and resumes the vendor', () => {
    const sim = simulation();
    advance(sim, 10);
    const vendor = sim.actors.find((a) => a.kind === 'vendor')!;
    expect(sim.talk(vendor.id, { x: 0, y: 0 })).toBeNull();
    expect(sim.talk({}, vendor)).toBeNull();
    const first = sim.talk(vendor.id, vendor);
    expect(first?.text).toBeTruthy();
    expect(sim.talk(vendor.id, vendor)).toBeNull();
    const x = vendor.x;
    advance(sim, 3);
    expect(vendor.x).toBe(x);
    expect(sim.talk(vendor.id, vendor)?.text).not.toBe(first?.text);
    advance(sim, 8);
    expect(vendor.x).not.toBe(x);
  });
  it('scatters an entire nearby flock, gains height, lands and can be startled again', () => {
    const sim = simulation();
    const flock = sim.actors.filter((a) => a.kind === 'pigeon' && a.variant === 0);
    const position = { x: flock[0]!.x, y: flock[0]!.y };
    advance(sim, 0.5, [position]);
    expect(flock.every((a) => a.mode === 'flying' && a.altitude > 0)).toBe(true);
    expect(
      sim.actors.filter((a) => a.kind === 'pigeon' && a.variant === 2).every((a) => a.mode === 'feeding'),
    ).toBe(true);
    advance(sim, 8);
    expect(flock.every((a) => a.mode === 'feeding' && a.altitude === 0)).toBe(true);
    advance(sim, 0.1, [{ x: flock[0]!.x, y: flock[0]!.y }]);
    expect(flock.every((a) => a.mode === 'flying')).toBe(true);
  });
  it('makes kittens flee nearby players and return to ordinary behavior', () => {
    const sim = simulation();
    const cat = sim.actors.find((a) => a.kind === 'cat')!;
    const before = { x: cat.x, y: cat.y };
    advance(sim, 0.5, [{ x: cat.x - 15, y: cat.y }]);
    expect(cat.mode).toBe('scampering');
    expect(cat.speech).toBe('Meo!');
    expect(Math.hypot(cat.x - before.x, cat.y - before.y)).toBeGreaterThan(10);
    advance(sim, 8);
    expect(cat.mode).not.toBe('scampering');
  });
});
