import { describe, expect, it } from 'vitest';
import { fishNibblePose, fishStrikePose } from './fishing-motion';

describe('fish nibble movement (retreat & dash behavior)', () => {
  it('darts rapidly from retreat distance towards bobber and recoils back to retreat position', () => {
    const startAngle = 0.5;
    const retreatDist = 80;

    // 1. At start of strike: fish is at retreat distance
    const start = fishNibblePose(0, 2000, startAngle, { retreatDistancePx: retreatDist });
    expect(Math.hypot(start.x, start.y)).toBeCloseTo(retreatDist);
    expect(start.isRecoil).toBe(false);

    // 2. Mid dash: fish approaches bait closely (< 20px)
    const midDash = fishNibblePose(140, 2000, startAngle, {
      retreatDistancePx: retreatDist,
      dashSpeedFactor: 1.4,
    });
    expect(Math.hypot(midDash.x, midDash.y)).toBeLessThan(35);

    // 3. Recoil phase: isRecoil is true as fish backs away
    const recoil = fishNibblePose(220, 2000, startAngle, {
      retreatDistancePx: retreatDist,
      dashSpeedFactor: 1.4,
    });
    expect(recoil.isRecoil).toBe(true);

    // 4. Stalking phase at distance: stays around retreat distance (+/- sway), facing the float
    const stalk = fishNibblePose(600, 2000, startAngle, {
      retreatDistancePx: retreatDist,
      dashSpeedFactor: 1.4,
    });
    expect(stalk.isRecoil).toBe(false);
    expect(Math.hypot(stalk.x, stalk.y)).toBeGreaterThan(retreatDist - 4);
    expect(Math.hypot(stalk.x, stalk.y)).toBeLessThan(retreatDist + 4);
    // Head points towards float (0, 0)
    expect(Math.cos(stalk.angle)).toBeCloseTo(Math.cos(startAngle + Math.PI));
    expect(Math.sin(stalk.angle)).toBeCloseTo(Math.sin(startAngle + Math.PI));
  });

  it('fishStrikePose smoothly plunges into the bobber center from retreat distance', () => {
    const startAngle = 1.2;
    const retreatDist = 90;
    const start = fishStrikePose(0, 500, startAngle, retreatDist);
    expect(Math.hypot(start.x, start.y)).toBeCloseTo(retreatDist);

    const finish = fishStrikePose(500, 500, startAngle, retreatDist);
    expect(Math.hypot(finish.x, finish.y)).toBeCloseTo(0);
  });
});
