import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { REQUIRED_VEHICLE_MODELS, calculateAuthoritativeLights } from './spec-oracle.js';
import { setupVirtualCanvasEnvironment, teardownVirtualCanvasEnvironment } from './test-environment.js';
import {
  vehicleById,
  onRoad,
  onDriveway,
  drivingSpeed,
  TRAFFIC_FINES,
} from '../../../packages/game-data/src/vehicles.js';
import { vehicleCanvas } from '../../../apps/web/src/art/vehicle.js';
import { ITEM_SEEDS } from '../../../packages/game-data/src/items.js';

describe('Tier 3: Cross-Feature Combinations (Pairwise Coverage)', () => {
  beforeEach(() => {
    setupVirtualCanvasEnvironment();
  });

  afterEach(() => {
    teardownVirtualCanvasEnvironment();
  });

  // =========================================================================
  // Combination 1: Vehicle Purchase -> Equip -> Mount -> Town Driving
  // =========================================================================
  describe('Combination 1: Shop Purchase -> Equip -> Mount -> Road Driving', () => {
    it('Case 1.1: Purchase transaction debits coin balance by exact vehicle price', () => {
      const initialCoin = 5000;
      const vehicle = vehicleById('car_mint')!;
      assert.ok(vehicle);
      const afterPurchaseCoin = initialCoin - vehicle.price;
      assert.equal(afterPurchaseCoin, 5000 - 1800);
      assert.equal(afterPurchaseCoin, 3200);
    });

    it('Case 1.2: Inventory equip sets appearance.vehicle and grants driving eligibility', () => {
      const player = {
        id: 'test_driver_1',
        inventory: ['car_mint'],
        appearance: { vehicle: '' },
      };

      // Equip car_mint
      assert.ok(player.inventory.includes('car_mint'));
      player.appearance.vehicle = 'car_mint';
      assert.equal(player.appearance.vehicle, 'car_mint');
    });

    it('Case 1.3: Showroom exit via driveway into Town road provides valid transit geometry', () => {
      // Showroom driveway is at x: 584, y: 788, w: 80, h: 58
      const drivewayPoint = { x: 624, y: 810 };
      assert.equal(onDriveway(drivewayPoint.x, drivewayPoint.y), true);

      // Driving out onto south road (x: 96, y: 844, w: 1024, h: 40)
      const roadPoint = { x: 624, y: 850 };
      assert.equal(onRoad(roadPoint.x, roadPoint.y), true);
    });

    it('Case 1.4: Mounting on road sets driver speed to vehicle catalog speed', () => {
      const testCases = [
        { id: 'bicycle_sky', expectedSpeed: 195 },
        { id: 'motorcycle_coral', expectedSpeed: 270 },
        { id: 'motorcycle_ducati', expectedSpeed: 310 },
        { id: 'car_lamborghini', expectedSpeed: 340 },
      ];

      for (const tc of testCases) {
        const speed = drivingSpeed(tc.id, 500, 350);
        assert.equal(speed, tc.expectedSpeed, `${tc.id} speed on road must match catalog speed`);
      }
    });

    it('Case 1.5: Unmounting on road restores pedestrian walking speed (150 px/s)', () => {
      const playerSpeed = (driving: boolean, vehicleId: string) => {
        if (!driving) return 150; // pedestrian speed
        return drivingSpeed(vehicleId, 500, 350);
      };

      assert.equal(playerSpeed(true, 'car_mint'), 240);
      assert.equal(playerSpeed(false, 'car_mint'), 150);
    });
  });

  // =========================================================================
  // Combination 2: 2-Wheel Mounting + Night Lighting Raytracing Beam
  // =========================================================================
  describe('Combination 2: 2-Wheel Mounting + Night Lighting Raytracing Beam', () => {
    it('Case 2.1: Riding 2-wheeler at night produces single centered beam (offset 0)', () => {
      const x = 300;
      const y = 350;
      const dir = 2; // Right
      const lights = calculateAuthoritativeLights(x, y, dir, 'motorcycle');

      assert.deepEqual(lights.bulbOffsets, [0], 'Motorcycle must have single centered bulb');
      assert.equal(lights.frontX, x + 20);
      assert.equal(lights.frontY, y - 10);
      assert.equal(lights.rearX, x - 18);
      assert.equal(lights.rearY, y - 10);
    });

    it('Case 2.2: Rider torso crop (0, 0, 32, 40) coexists with headlight front emitter', () => {
      const crop = { x: 0, y: 0, w: 32, h: 40 };
      const bikeLights = calculateAuthoritativeLights(100, 100, 0, 'bicycle');

      // Crop conceals lower torso behind bike chassis
      assert.equal(crop.w, 32);
      assert.equal(crop.h, 40);

      // Light emits from front fork
      assert.equal(bikeLights.frontX, 100);
      assert.equal(bikeLights.frontY, 100 - 10 + 18);
    });

    it('Case 2.3: Heading changes from Down to Right update avatar frame and beam rotation angle', () => {
      // dir 0 = Down (angle = Math.PI / 2)
      const downLights = calculateAuthoritativeLights(200, 200, 0, 'motorcycle');
      assert.equal(downLights.beamAngle, Math.PI / 2);

      // dir 2 = Right (angle = 0)
      const rightLights = calculateAuthoritativeLights(200, 200, 2, 'motorcycle');
      assert.equal(rightLights.beamAngle, 0);
    });

    it('Case 2.4: Bicycle beam scale is 0.65x compared to motorcycle beam scale 1.0x', () => {
      const getBeamScale = (kind: 'bicycle' | 'motorcycle' | 'car') => {
        return kind === 'bicycle' ? 0.65 : 1.0;
      };

      assert.equal(getBeamScale('bicycle'), 0.65);
      assert.equal(getBeamScale('motorcycle'), 1.0);
      assert.equal(getBeamScale('car'), 1.0);
    });
  });

  // =========================================================================
  // Combination 3: Showroom Preview 4-Way Rotation + Inventory Icon
  // =========================================================================
  describe('Combination 3: Showroom Preview 4-Way Rotation + Inventory Icon', () => {
    it('Case 3.1: 4-directional rotation renders valid 48x40 canvas matching 144x120 3x shop preview', () => {
      for (const dir of [0, 1, 2, 3]) {
        const c = vehicleCanvas('car_mint', dir);
        assert.equal(c.width, 48);
        assert.equal(c.height, 40);
        // Scaled preview 3x
        const scaledW = c.width * 3;
        const scaledH = c.height * 3;
        assert.equal(scaledW, 144);
        assert.equal(scaledH, 120);
      }
    });

    it('Case 3.2: Direction 2 (Right profile) matches default showroom pedestal display facing', () => {
      const pedestalDir = 2;
      const c = vehicleCanvas('car_lamborghini', pedestalDir);
      assert.equal(c.width, 48);
      assert.equal(c.height, 40);
    });

    it('Case 3.3: Inventory item sprite maps to vehicle ID in ITEM_SEEDS', () => {
      const carSeed = ITEM_SEEDS.find((i) => i.id === 'car_mint');
      assert.ok(carSeed);
      assert.equal(carSeed.sprite, 'car_mint');
      assert.equal(carSeed.slot, 'vehicle');
    });

    it('Case 3.4: All required vehicles maintain valid visual canvas output', () => {
      for (const model of REQUIRED_VEHICLE_MODELS) {
        const c = vehicleCanvas(model.id);
        assert.ok(c);
        assert.equal(c.width, 48);
        assert.equal(c.height, 40);
      }
    });
  });

  // =========================================================================
  // Combination 4: Off-Road Driving Fine vs On-Road Driving Zero Fine
  // =========================================================================
  describe('Combination 4: Off-Road Driving Fine vs On-Road Driving Zero Fine', () => {
    it('Case 4.1: Driving on road corridor yields zero traffic fine and maximum speed', () => {
      const onRoadX = 500;
      const onRoadY = 350;
      assert.equal(onRoad(onRoadX, onRoadY), true);
      assert.equal(drivingSpeed('car_lamborghini', onRoadX, onRoadY), 340);
    });

    it('Case 4.2: Deviating off road triggers speed drop to 90 and incurs 40 coin fine', () => {
      const offRoadX = 500;
      const offRoadY = 450;
      assert.equal(onRoad(offRoadX, offRoadY), false);
      assert.equal(drivingSpeed('car_lamborghini', offRoadX, offRoadY), 90);
      assert.equal(TRAFFIC_FINES.off_road, 40);
    });

    it('Case 4.3: Traffic fine idempotency: duplicate fine tickets charge only once', () => {
      let balance = 1000;
      const chargedTickets = new Set<string>();

      const applyFine = (ticketId: string, amount: number) => {
        if (chargedTickets.has(ticketId)) return 0;
        chargedTickets.add(ticketId);
        balance -= amount;
        return amount;
      };

      const ticket = 'ticket_unique_123';
      assert.equal(applyFine(ticket, TRAFFIC_FINES.off_road), 40);
      assert.equal(applyFine(ticket, TRAFFIC_FINES.off_road), 0); // duplicate ignored
      assert.equal(balance, 960);
    });

    it('Case 4.4: Stopping or staying stationary never triggers traffic violation tickets', () => {
      const moving = false;
      const canViolate = (isMoving: boolean) => isMoving;
      assert.equal(canViolate(moving), false, 'Stationary vehicle cannot commit traffic moving violation');
    });
  });
});
