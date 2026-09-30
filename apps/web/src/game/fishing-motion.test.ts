import { describe, expect, it } from 'vitest';
import { FISHING_NIBBLE_DURATION_MS } from '@cozy/game-data';
import { fishNibblePose } from './fishing-motion';

describe('fish nibble movement', () => {
  it('darts to the bait and recoils before starting a lap without a position jump', () => {
    const startAngle = 0.7;
    const start = fishNibblePose(0, 2000, startAngle, 1.4);
    const strike = fishNibblePose(FISHING_NIBBLE_DURATION_MS * 0.38, 2000, startAngle, 1.4);
    expect(Math.hypot(start.x, start.y)).toBeCloseTo(22);
    expect(Math.hypot(strike.x, strike.y)).toBeCloseTo(4);
    expect(fishNibblePose(220, 2000, startAngle, 1.4).isRecoil).toBe(true);
    const before = fishNibblePose(FISHING_NIBBLE_DURATION_MS - 0.01, 2000, startAngle, 1.4);
    const after = fishNibblePose(FISHING_NIBBLE_DURATION_MS, 2000, startAngle, 1.4);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(after.angle).toBeCloseTo(before.angle);
  });

  it.each([2000, 5000])('swims a full lap, then waits facing the bait during a %s ms pause', (pauseMs) => {
    for (const turns of [-1.3, 1.7]) {
      const startAngle = 0.7;
      let previousAngle = startAngle;
      let travelled = 0;
      for (let elapsedMs = 420; elapsedMs < 420 + pauseMs; elapsedMs += 10) {
        const pose = fishNibblePose(elapsedMs, pauseMs, startAngle, turns);
        expect(Math.hypot(pose.x, pose.y)).toBeCloseTo(22);
        const angle = Math.atan2(pose.y, pose.x);
        travelled += Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle));
        previousAngle = angle;
      }
      expect(travelled / (Math.PI * 2)).toBeCloseTo(turns);
      const resting = fishNibblePose(420 + pauseMs - 500, pauseMs, startAngle, turns);
      const end = fishNibblePose(420 + pauseMs, pauseMs, startAngle, turns);
      expect(end.x).toBeCloseTo(resting.x);
      expect(end.y).toBeCloseTo(resting.y);
      expect(Math.cos(end.angle)).toBeCloseTo(-end.x / 22);
      expect(Math.sin(end.angle)).toBeCloseTo(-end.y / 22);
      const next = fishNibblePose(0, 2000, startAngle + turns * Math.PI * 2, -1.2);
      expect(next.x).toBeCloseTo(end.x);
      expect(next.y).toBeCloseTo(end.y);
    }
  });
});
