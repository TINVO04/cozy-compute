import { expect, it } from 'vitest';
import { boatPose } from './river-motion';

it('keeps boats stable in storms, with heavier boats responding less', () => {
  for (let time = 0; time < 20000; time += 37) {
    const small = boatPose(time, 650, 800, 'boat_coracle', 1, true, 60);
    const large = boatPose(time, 650, 800, 'boat_trawler', 1, true, 60);
    expect(Math.abs(small.roll)).toBeLessThanOrEqual(0.065);
    expect(Math.abs(small.heave)).toBeLessThan(4.5);
    expect(Math.abs(large.heave)).toBeLessThanOrEqual(Math.abs(small.heave));
    expect(Math.abs(large.roll)).toBeLessThanOrEqual(Math.abs(small.roll));
  }
});

it('honors reduced motion and stays continuous between frames', () => {
  expect(boatPose(5000, 650, 800, 'boat_coracle', 1, true, 60, true)).toEqual({ heave: 0, roll: 0 });
  const a = boatPose(5000, 650, 800, 'boat_coracle', 1);
  const b = boatPose(5016, 650, 800, 'boat_coracle', 1);
  expect(Math.abs(a.heave - b.heave)).toBeLessThan(0.1);
  expect(Math.abs(a.roll - b.roll)).toBeLessThan(0.005);
});
