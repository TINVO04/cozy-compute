import { describe, expect, it } from 'vitest';
import { drivingSpeed, redLightCrossing, trafficSignal, vehicleById, INTERSECTIONS } from './vehicles.js';
import { stepMovement, sanitizeAppearance } from './index.js';

describe('vehicles and traffic', () => {
  it('never has opposing green signals and provides yellow and all-red clearance', () => {
    for (let t = 0; t < 56000; t += 100) {
      expect(
        [trafficSignal(t, 'horizontal'), trafficSignal(t, 'vertical')].filter((s) => s === 'green'),
      ).toHaveLength(t % 14000 < 10000 ? 1 : 0);
    }
    expect(trafficSignal(10500, 'horizontal')).toBe('yellow');
    expect(trafficSignal(12500, 'vertical')).toBe('red');
  });
  it('tickets entry on red in all four directions, never exit or stationary vehicles', () => {
    for (const j of INTERSECTIONS) {
      for (const side of [-1, 1]) {
        const from = { x: j.x + side * (j.halfW + 10), y: j.y };
        const to = { x: j.x + side * j.halfW, y: j.y };
        expect(redLightCrossing(from, to, 15000)).toBe(j.id);
        expect(redLightCrossing(from, to, 5000)).toBeNull();
        expect(redLightCrossing(to, from, 15000)).toBeNull();
        expect(redLightCrossing(from, from, 15000)).toBeNull();
        const north = { x: j.x, y: j.y + side * (j.halfH + 10) };
        const inner = { x: j.x, y: j.y + side * j.halfH };
        expect(redLightCrossing(north, inner, 5000)).toBe(j.id);
        expect(redLightCrossing(north, inner, 15000)).toBeNull();
      }
    }
  });
  it('rejects spoofed ownership and slows down outside the road', () => {
    expect(vehicleById('__proto__')).toBeUndefined();
    expect(sanitizeAppearance({ vehicle: 'car_sunset' })).not.toHaveProperty('vehicle');
    expect(drivingSpeed('car_mint', 500, 350)).toBe(240);
    expect(drivingSpeed('car_sunset', 500, 350)).toBe(300);
    expect(drivingSpeed('car_sunset', 500, 450)).toBe(90);
  });
  it('fast cars cannot tunnel through thin walls during delayed frames', () => {
    const next = stepMovement({ x: 100, y: 100 }, { x: 1, y: 0 }, 0.25, {
      speed: 300,
      blockers: [{ x: 130, y: 70, w: 4, h: 60 }],
    });
    expect(next.x).toBeLessThanOrEqual(120);
  });
});
