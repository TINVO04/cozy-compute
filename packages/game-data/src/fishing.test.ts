import { describe, expect, it } from 'vitest';
import { FISHING_NIBBLE_DURATION_MS, rollFishingSequence } from './fishing.js';

describe('fishing sequence', () => {
  it.each([0, 0.5, 0.999999])('keeps every pause within 2–5 seconds for roll %s', (roll) => {
    const sequence = rollFishingSequence(() => roll, 12000, 8);
    expect(sequence.nibbleOffsetsMs).toHaveLength(8);
    expect(sequence.nibbleOrbitTurns).toHaveLength(8);
    expect(sequence.nibbleOffsetsMs[0]).toBe(14200);
    const strikeTimes = [...sequence.nibbleOffsetsMs, sequence.biteInMs];
    for (let i = 1; i < strikeTimes.length; i++) {
      const pauseMs = strikeTimes[i]! - strikeTimes[i - 1]! - FISHING_NIBBLE_DURATION_MS;
      expect(pauseMs).toBeGreaterThanOrEqual(2000);
      expect(pauseMs).toBeLessThanOrEqual(5000);
      expect(Math.abs(sequence.nibbleOrbitTurns[i - 1]!)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(sequence.nibbleOrbitTurns[i - 1]!)).toBeLessThan(2);
    }
  });

  it('rolls independent pauses, stopping angles and swimming directions', () => {
    const rolls = [0, 0.25, 0, 0.999999, 0.75, 0.9, 0.5, 0.1, 0.2, 0.2, 0.6, 0.8];
    const sequence = rollFishingSequence(() => rolls.shift()!, 7000, 4);
    expect(sequence.nibbleOffsetsMs).toEqual([9200, 11620, 17040, 20960]);
    expect(sequence.nibbleOrbitTurns).toEqual([-1.25, 1.75, -1.1, 1.6]);
    expect(sequence.biteInMs).toBe(23980);
  });
});
