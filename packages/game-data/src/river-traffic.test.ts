import { describe, expect, it } from 'vitest';
import { oceanRiverVessels } from './river-traffic.js';

describe('river-traffic', () => {
  it('generates peaceful, sparse east-west passing vessels for grand ocean river', () => {
    const now = 1800000000000;
    const v1 = oceanRiverVessels(now);
    const v2 = oceanRiverVessels(now);
    expect(v1).toEqual(v2);

    expect(v1.every((v) => v.scene === 'ocean')).toBe(true);
    expect(v1.every((v) => v.dirX !== 0)).toBe(true);

    // Kept sparse (at most 2 vessels at a time across the vast river)
    expect(v1.length).toBeLessThanOrEqual(2);

    const next = oceanRiverVessels(now + 1000);
    for (const a of v1) {
      const b = next.find((x) => x.id === a.id);
      if (b) {
        expect((b.x - a.x) * a.dirX).toBeGreaterThan(0);
      }
    }
  });
});
