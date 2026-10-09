import { describe, expect, it } from 'vitest';
import {
  CANONICAL_VEHICLE_IDS,
  INTERSECTIONS,
  PLAYER_SPEED,
  TOWN_ROADS,
  TRAFFIC_FINES,
  drivingSpeed,
  onRoad,
  redLightCrossing,
  stepMovement,
  trafficSignal,
  vehicleById,
} from './index.js';

describe('Adversarial Vehicle System Hardening (Tier 5)', () => {
  describe('High-Speed Movement & Unmounting Invariants', () => {
    it('prevents thin wall tunneling at maximum vehicle speed (340 px/s)', () => {
      const topSpeedVehicle = vehicleById('car_lamborghini')!;
      expect(topSpeedVehicle.speed).toBe(340);

      const wall = [{ x: 200, y: 0, w: 6, h: 500 }];
      const world = { width: 1000, height: 1000, blockers: wall, speed: topSpeedVehicle.speed };

      // Simulate vehicle racing towards wall at top speed with large frame time (e.g. 100ms)
      let pos = { x: 150, y: 100 };
      for (let frame = 0; frame < 10; frame++) {
        pos = stepMovement(pos, { x: 1, y: 0 }, 0.1, world);
      }

      // Avatar radius is 10, wall is at x=200, so avatar x cannot exceed 190
      expect(pos.x).toBeLessThanOrEqual(190);
      expect(pos.x).toBeGreaterThan(180);
    });

    it('transitions smoothly from top speed (340 px/s) to pedestrian speed (150 px/s) upon unmounting', () => {
      const topSpeed = vehicleById('car_lamborghini')!.speed;
      let pos = { x: 100, y: 100 };
      const right = { x: 1, y: 0 };
      const worldMoving = { speed: topSpeed, blockers: [] };

      // Step 1: 500ms moving at top speed (two 0.25s clamped steps)
      pos = stepMovement(pos, right, 0.25, worldMoving);
      pos = stepMovement(pos, right, 0.25, worldMoving);
      expect(pos.x).toBeCloseTo(100 + 340 * 0.25 * 2, 1); // 100 + 85 + 85 = 270px

      // Step 2: Instant unmount to walking speed
      const unmountedWorld = { speed: PLAYER_SPEED, blockers: [] };
      const unmountedPos = stepMovement(pos, right, 0.1, unmountedWorld);
      // Next 100ms should only advance 15px (150 * 0.1) instead of 34px (340 * 0.1)
      expect(unmountedPos.x - pos.x).toBeCloseTo(15, 1);
    });

    it('survives rapid 100-cycle mount/unmount jitter attacks without position explosion or NaN', () => {
      let pos = { x: 200, y: 350 };
      const input = { x: 1, y: 0 };

      for (let i = 0; i < 100; i++) {
        const isMounted = i % 2 === 0;
        const currentSpeed = isMounted ? drivingSpeed('car_lamborghini', pos.x, pos.y) : PLAYER_SPEED;
        const world = { speed: currentSpeed, blockers: [] };
        pos = stepMovement(pos, input, 0.016, world);

        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
      }
    });
  });

  describe('Road Geometry & Fit Across All 16 Vehicles', () => {
    it('confirms every vehicle body width (<= 40 px) fits within narrowest town roads (40 px)', () => {
      for (const id of CANONICAL_VEHICLE_IDS) {
        const def = vehicleById(id)!;
        expect(def.dimensions.bodyWidth).toBeLessThanOrEqual(40);

        // When centered on a 40px wide horizontal road segment (y: 332 to 372, center = 352)
        const road = TOWN_ROADS[0]!;
        expect(road.h).toBe(40);
        const roadCenterY = road.y + road.h / 2;

        const halfBody = def.dimensions.bodyWidth / 2;
        const topEdge = roadCenterY - halfBody;
        const bottomEdge = roadCenterY + halfBody;

        expect(topEdge).toBeGreaterThanOrEqual(road.y);
        expect(bottomEdge).toBeLessThanOrEqual(road.y + road.h);
        expect(onRoad(road.x + 100, roadCenterY)).toBe(true);
      }
    });

    it('correctly reports onRoad and offRoad driving speed across vehicle types', () => {
      const roadX = 500;
      const roadY = 352; // Inside TOWN_ROADS[0]
      const offRoadY = 450; // Outside road

      for (const id of CANONICAL_VEHICLE_IDS) {
        const def = vehicleById(id)!;
        expect(drivingSpeed(id, roadX, roadY)).toBe(def.speed);
        expect(drivingSpeed(id, roadX, offRoadY)).toBe(90);
        expect(drivingSpeed(id, roadX, offRoadY, true)).toBe(def.speed);
      }
    });
  });

  describe('Red Light Crossing Under High Speed Penetration', () => {
    it('detects red light entry even at maximum speed (340 px/s)', () => {
      const west = INTERSECTIONS[0]!; // x: 352, y: 352
      const stopLineBefore = west.x - west.halfW - 20; // x: 312
      const entryInside = west.x - west.halfW + 5; // x: 337

      // At 15000ms, horizontal is red
      expect(trafficSignal(15000, 'horizontal')).toBe('red');

      // High-speed leap across stop line
      const ticket = redLightCrossing({ x: stopLineBefore, y: west.y }, { x: entryInside, y: west.y }, 15000);
      expect(ticket).toBe(west.id);

      // On green signal (5000ms), crossing is permitted
      expect(trafficSignal(5000, 'horizontal')).toBe('green');
      const pass = redLightCrossing({ x: stopLineBefore, y: west.y }, { x: entryInside, y: west.y }, 5000);
      expect(pass).toBeNull();
    });

    it('rejects red light false tickets for reverse exit or stationary waiting at stop line', () => {
      const west = INTERSECTIONS[0]!;
      const atStopLine = { x: west.x - west.halfW - 8, y: west.y };

      // Stationary waiting
      expect(redLightCrossing(atStopLine, atStopLine, 15000)).toBeNull();

      // Backing away from junction
      const backingAway = { x: atStopLine.x - 10, y: west.y };
      expect(redLightCrossing(atStopLine, backingAway, 15000)).toBeNull();
    });
  });

  describe('Alias Resolution & Prototype Pollution Hardening', () => {
    it('resolves all canonical IDs, category paths, and slug aliases to exact models', () => {
      for (const id of CANONICAL_VEHICLE_IDS) {
        const def = vehicleById(id)!;
        expect(def).toBeDefined();

        // Asset path resolution
        const byPath = vehicleById(def.assetPath);
        expect(byPath).toBeDefined();
        expect(byPath?.id).toBe(id);

        // Slug resolution (without category prefix)
        const slug = def.assetPath.split('/')[1]!;
        const bySlug = vehicleById(slug);
        expect(bySlug).toBeDefined();
        expect(bySlug?.id).toBe(id);
      }
    });

    it('safely handles malicious prototype pollution, numeric overflows, and empty inputs', () => {
      const malicious = [
        '__proto__',
        'constructor',
        'prototype',
        'toString',
        'valueOf',
        'hasOwnProperty',
        '..',
        '../cars/mercedes-benz-g63',
        '',
        '   ',
        'null',
        'undefined',
        String.fromCharCode(0),
      ];

      for (const m of malicious) {
        expect(vehicleById(m)).toBeUndefined();
        expect(drivingSpeed(m, 500, 350)).toBe(150); // Fallback to 150
      }

      expect(vehicleById(null)).toBeUndefined();
      expect(vehicleById(undefined)).toBeUndefined();
    });

    it('confirms fine amounts and labels meet traffic compliance specifications', () => {
      expect(TRAFFIC_FINES.red_light).toBe(80);
      expect(TRAFFIC_FINES.off_road).toBe(40);
      expect(Object.keys(TRAFFIC_FINES)).toEqual(['red_light', 'off_road']);
    });
  });
});
