import { describe, expect, it } from 'vitest';
import {
  TownLifeSimulation,
  lifeGroundClear,
  MAX_PASSING_VENDORS,
  isRainyOrStormy,
  isNightTime,
  shouldHideTownLife,
} from './town-life.js';
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
  it('allows cats to occasionally lie down and sleep', () => {
    const sim = simulation();
    let sawSleeping = false;
    for (let i = 0; i < 400; i++) {
      sim.update(50, i * 50, []);
      const cats = sim.actors.filter((a) => a.kind === 'cat');
      if (cats.some((c) => c.mode === 'sleeping')) {
        sawSleeping = true;
        const sleeper = cats.find((c) => c.mode === 'sleeping')!;
        expect(sleeper.moving).toBe(false);
        break;
      }
    }
    expect(sawSleeping).toBe(true);
  });
  it('startles sleeping cat when a player gets close', () => {
    const sim = simulation();
    let sleeper = sim.actors.find((a) => a.kind === 'cat' && a.mode === 'sleeping');
    let t = 0;
    while (!sleeper && t < 400) {
      sim.update(50, t * 50, []);
      sleeper = sim.actors.find((a) => a.kind === 'cat' && a.mode === 'sleeping');
      t++;
    }
    expect(sleeper).toBeDefined();
    if (sleeper) {
      sim.update(50, t * 50, [{ x: sleeper.x - 10, y: sleeper.y }]);
      expect(sleeper.mode).toBe('scampering');
      expect(sleeper.speech).toBe('Meo!');
    }
  });
  it('hides birds, cats, and vendors during rain or storms', () => {
    const sim = simulation();
    expect(sim.actors.length).toBeGreaterThanOrEqual(15);
    sim.update(50, 1000, [], { condition: 'rain' });
    expect(sim.actors.length).toBe(0);
    expect(sim.talk('vendor-0', { x: 300, y: 350 })).toBeNull();

    // thunderstorm
    sim.update(50, 2000, [], { condition: 'thunderstorm' });
    expect(sim.actors.length).toBe(0);

    // heavy rain
    sim.update(50, 3000, [], { condition: 'heavy_rain' });
    expect(sim.actors.length).toBe(0);

    // precipitation > 0
    sim.update(50, 4000, [], { precipitationMm: 5 });
    expect(sim.actors.length).toBe(0);

    // Returning to clear daytime restores residents
    sim.update(50, 5000, [], { condition: 'clear', timePhase: 'morning' });
    expect(sim.actors.length).toBe(14); // 5 cats + 9 pigeons
    expect(sim.actors.filter((a) => a.kind === 'cat').length).toBe(5);
    expect(sim.actors.filter((a) => a.kind === 'pigeon').length).toBe(9);
  });
  it('hides birds, cats, and vendors at night', () => {
    const sim = simulation();
    expect(sim.actors.length).toBeGreaterThanOrEqual(15);
    sim.update(50, 1000, [], { timePhase: 'night' });
    expect(sim.actors.length).toBe(0);

    // Night by solarHour
    sim.update(50, 2000, [], { solarHour: 22.0 });
    expect(sim.actors.length).toBe(0);

    // Night by solarHour early morning (3 AM)
    sim.update(50, 3000, [], { solarHour: 3.5 });
    expect(sim.actors.length).toBe(0);

    // Returning to morning restores residents
    sim.update(50, 4000, [], { timePhase: 'morning' });
    expect(sim.actors.length).toBe(14);
    expect(sim.actors.filter((a) => a.kind === 'cat').length).toBe(5);
    expect(sim.actors.filter((a) => a.kind === 'pigeon').length).toBe(9);
  });
  it('correctly determines rain/storm and night helpers', () => {
    expect(isRainyOrStormy('rain')).toBe(true);
    expect(isRainyOrStormy('thunderstorm')).toBe(true);
    expect(isRainyOrStormy('heavy_rain')).toBe(true);
    expect(isRainyOrStormy('drizzle')).toBe(true);
    expect(isRainyOrStormy('clear', 1.5)).toBe(true);
    expect(isRainyOrStormy('clear', 0)).toBe(false);
    expect(isRainyOrStormy('cloudy')).toBe(false);

    expect(isNightTime('night')).toBe(true);
    expect(isNightTime('morning')).toBe(false);
    expect(isNightTime(null, 21.0)).toBe(true);
    expect(isNightTime(null, 12.0)).toBe(false);

    expect(shouldHideTownLife({ condition: 'rain' })).toBe(true);
    expect(shouldHideTownLife({ timePhase: 'night' })).toBe(true);
    expect(shouldHideTownLife({ isRaining: true })).toBe(true);
    expect(shouldHideTownLife({ isNight: true })).toBe(true);
    expect(shouldHideTownLife({ condition: 'clear', timePhase: 'noon' })).toBe(false);
  });
});
