import { describe, expect, it } from 'vitest';
import { bridgeTravellers, RIVER_BRIDGE } from './river-bridge.js';
import { OCEAN_BLOCKERS } from './map.js';

describe('river bridge', () => {
  it('shares random-looking traffic across clients with stable lanes and offscreen departures', () => {
    const now = 1800000000000;
    const first = bridgeTravellers(now);
    expect(first).toEqual(bridgeTravellers(now));
    expect(first.some((a) => a.kind === 'person')).toBe(true);
    expect(first.some((a) => a.kind !== 'person')).toBe(true);
    expect(new Set(first.map((a) => a.dir)).size).toBe(2);
    const next = bridgeTravellers(now + 1000);
    for (const a of first) {
      const b = next.find((b) => b.id === a.id);
      if (!b) {
        expect(a.x < 30 || a.x > RIVER_BRIDGE.width - 30).toBe(true);
        continue;
      }
      expect((b.x - a.x) * a.dir).toBeGreaterThan(0);
      expect(b.y).toBe(a.y);
      expect(b.y).toBeGreaterThan(RIVER_BRIDGE.top);
      expect(b.y).toBeLessThan(RIVER_BRIDGE.bottom);
    }
    expect(bridgeTravellers(now + 120000).every((a) => !first.some((b) => b.id === a.id))).toBe(true);
  });
  it('keeps physical piers aligned to the widened deck and the center boat channel open', () => {
    for (const x of RIVER_BRIDGE.pierXs)
      expect(OCEAN_BLOCKERS).toContainEqual({
        x,
        y: RIVER_BRIDGE.top - 6,
        w: 32,
        h: RIVER_BRIDGE.bottom - RIVER_BRIDGE.top + 18,
      });
    expect(OCEAN_BLOCKERS.some((r) => 768 >= r.x && 768 <= r.x + r.w && 500 >= r.y && 500 <= r.y + r.h)).toBe(
      false,
    );
  });
});
