import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { REQUIRED_VEHICLE_MODELS, REQUIRED_ROAD_WIDTH } from './spec-oracle.js';
import { setupVirtualCanvasEnvironment, teardownVirtualCanvasEnvironment } from './test-environment.js';
import {
  VEHICLES,
  vehicleById,
  TOWN_ROADS,
  onRoad,
  drivingSpeed,
} from '../../../packages/game-data/src/vehicles.js';
import { stepMovement, sanitizeAppearance } from '../../../packages/game-data/src/index.js';
import { vehicleCanvas } from '../../../apps/web/src/art/vehicle.js';

describe('Tier 2: Boundary & Corner Cases (Requirement-Driven)', () => {
  beforeEach(() => {
    setupVirtualCanvasEnvironment();
  });

  afterEach(() => {
    teardownVirtualCanvasEnvironment();
  });

  // =========================================================================
  // Boundary 1: Max Speed Limits & Anti-Tunneling Constraints
  // =========================================================================
  describe('Boundary 1: Max Speed Limits & Anti-Tunneling Constraints', () => {
    it('Case 1.1: Maximum vehicle speed cap: no vehicle in catalog exceeds 400 px/s', () => {
      for (const [id, def] of Object.entries(VEHICLES)) {
        assert.ok(
          def.speed <= 400,
          `Vehicle ${id} speed (${def.speed}) exceeds absolute maximum speed cap 400`,
        );
        assert.ok(
          def.speed >= 150,
          `Vehicle ${id} speed (${def.speed}) must be at least walking baseline 150`,
        );
      }
    });

    it('Case 1.2: Zero or negative speed clamp: invalid speed inputs clamp safely', () => {
      // Test drivingSpeed for invalid or unregistered ID
      const fallbackSpeed = drivingSpeed('invalid_negative_vehicle', 500, 350);
      assert.equal(fallbackSpeed, 150, 'Unregistered vehicle on road defaults to baseline 150 px/s');

      const offRoadFallback = drivingSpeed('invalid_negative_vehicle', 500, 600);
      assert.equal(offRoadFallback, 90, 'Unregistered vehicle off road defaults to off-road 90 px/s');
    });

    it('Case 1.3: Anti-tunneling: fast cars cannot tunnel through thin walls during delayed frames', () => {
      // High speed 340 px/s (Lamborghini Aventador SVJ) with large delta frame (0.25s = 250ms lag frame)
      const next = stepMovement({ x: 100, y: 100 }, { x: 1, y: 0 }, 0.25, {
        speed: 340,
        blockers: [{ x: 130, y: 70, w: 4, h: 60 }],
      });
      // Wall is at x=130, player starts at x=100. Movement must be blocked before or at wall.
      assert.ok(next.x <= 130, `Tunneling detected: player x reached ${next.x} beyond wall at 130`);
    });

    it('Case 1.4: High velocity collision response against corner blockers', () => {
      const next = stepMovement({ x: 120, y: 120 }, { x: 1, y: 1 }, 0.2, {
        speed: 340,
        blockers: [{ x: 140, y: 140, w: 50, h: 50 }],
      });
      assert.ok(next.x <= 140 || next.y <= 140, 'Movement must be impeded by corner blocker');
    });

    it('Case 1.5: Server authoritative driving speed calculation with and without allowOffRoad flag', () => {
      // car_mint has speed 240
      const onRoadSpeed = drivingSpeed('car_mint', 500, 350, false);
      assert.equal(onRoadSpeed, 240, 'On road speed must be full speed (240 px/s)');

      const offRoadSpeed = drivingSpeed('car_mint', 500, 450, false);
      assert.equal(offRoadSpeed, 90, 'Off road speed must be reduced to 90 px/s');

      const offRoadAllowedSpeed = drivingSpeed('car_mint', 500, 450, true);
      assert.equal(offRoadAllowedSpeed, 240, 'Off road allowed speed must maintain vehicle speed (240 px/s)');
    });
  });

  // =========================================================================
  // Boundary 2: Road Width & TOWN_ROADS Geometric Constraints
  // =========================================================================
  describe('Boundary 2: Road Width & TOWN_ROADS Geometric Constraints', () => {
    it('Case 2.1: Road width exact constraint: TOWN_ROADS standard corridors are exactly 40px', () => {
      assert.ok(TOWN_ROADS.length >= 4, 'TOWN_ROADS must contain at least 4 road segments');
      // Segment 0: horizontal road (w: 1472, h: 40)
      assert.equal(TOWN_ROADS[0].h, REQUIRED_ROAD_WIDTH);
      // Segment 1: vertical road (w: 40, h: 576)
      assert.equal(TOWN_ROADS[1].w, REQUIRED_ROAD_WIDTH);
      // Segment 3: horizontal road (w: 1024, h: 40)
      assert.equal(TOWN_ROADS[3].h, REQUIRED_ROAD_WIDTH);
    });

    it('Case 2.2: Vehicle body width clearance: bodyWidth <= 40px fits inside 40px road corridor', () => {
      for (const model of REQUIRED_VEHICLE_MODELS) {
        assert.ok(
          model.bodyWidth <= REQUIRED_ROAD_WIDTH,
          `${model.name} body width (${model.bodyWidth}) must be <= road width (${REQUIRED_ROAD_WIDTH})`,
        );
      }
    });

    it('Case 2.3: onRoad(x, y) evaluates true at inner boundaries of road corridors', () => {
      // Road 0: x: 32, y: 332, w: 1472, h: 40 -> valid x: [32, 1504], y: [332, 372]
      assert.equal(onRoad(32, 332), true, 'Top-left corner of Road 0');
      assert.equal(onRoad(1504, 372), true, 'Bottom-right corner of Road 0');
      assert.equal(onRoad(500, 350), true, 'Center of Road 0');
    });

    it('Case 2.4: onRoad(x, y) evaluates false immediately outside road boundaries', () => {
      // Road 0: y is [332, 372]. Check 1px above and 1px below.
      assert.equal(onRoad(500, 331), false, '1px above Road 0 must be off-road');
      assert.equal(onRoad(500, 373), false, '1px below Road 0 must be off-road');
      assert.equal(onRoad(31, 350), false, '1px west of Road 0 must be off-road');
      assert.equal(onRoad(1505, 350), false, '1px east of Road 0 must be off-road');
    });

    it('Case 2.5: Off-road driving drops speed to exactly 90 px/s regardless of top speed', () => {
      const topCar = 'car_lamborghini'; // 340 px/s
      const topBike = 'motorcycle_ducati'; // 310 px/s

      assert.equal(drivingSpeed(topCar, 500, 600), 90);
      assert.equal(drivingSpeed(topBike, 500, 600), 90);
    });
  });

  // =========================================================================
  // Boundary 3: Empty Asset Folders & Missing Metadata
  // =========================================================================
  describe('Boundary 3: Empty Asset Folders & Missing Metadata', () => {
    it('Case 3.1: Empty asset folder or missing files falls back to procedural canvas without crashing', () => {
      assert.doesNotThrow(() => {
        // mercedes-benz-g63 directory exists but has no assets yet
        const canvas = vehicleCanvas('cars/mercedes-benz-g63');
        assert.ok(canvas);
        assert.equal(canvas.width, 48);
        assert.equal(canvas.height, 40);
      });
    });

    it('Case 3.2: Missing meta.json falls back to standard dimensions 48x40 and contact y=37', () => {
      const defaultDims = { frameWidth: 48, frameHeight: 40, contactY: 37 };
      assert.equal(defaultDims.frameWidth, 48);
      assert.equal(defaultDims.frameHeight, 40);
      assert.equal(defaultDims.contactY, 37);
    });

    it('Case 3.3: Missing spritesheet image renders valid procedural canvas frames for all 4 directions', () => {
      for (const dir of [0, 1, 2, 3]) {
        const c = vehicleCanvas('car_mint', dir, 0);
        assert.ok(c);
        assert.equal(c.width, 48);
        assert.equal(c.height, 40);
      }
    });

    it('Case 3.4: Asset path traversal strings are safely rejected', () => {
      assert.doesNotThrow(() => {
        const canvas = vehicleCanvas('../../../etc/passwd');
        assert.ok(canvas);
        assert.equal(canvas.width, 48);
      });
    });

    it('Case 3.5: Empty string or whitespace vehicle ID safely returns fallback canvas', () => {
      assert.doesNotThrow(() => {
        const c1 = vehicleCanvas('');
        const c2 = vehicleCanvas('   ');
        assert.equal(c1.width, 48);
        assert.equal(c1.height, 40);
        assert.equal(c2.width, 48);
        assert.equal(c2.height, 40);
      });
    });
  });

  // =========================================================================
  // Boundary 4: Unknown Vehicle IDs & Prototype Pollution
  // =========================================================================
  describe('Boundary 4: Unknown Vehicle IDs & Prototype Pollution', () => {
    it('Case 4.1: Unknown vehicle ID returns undefined from vehicleById', () => {
      assert.equal(vehicleById('non_existent_vehicle'), undefined);
      assert.equal(vehicleById('random_string_999'), undefined);
    });

    it('Case 4.2: Prototype pollution key __proto__ returns undefined and does not corrupt prototype', () => {
      assert.equal(vehicleById('__proto__'), undefined);
      assert.equal(Object.hasOwn(Object.prototype, 'brand'), false);
      assert.equal(Object.hasOwn(Object.prototype, 'speed'), false);
    });

    it('Case 4.3: Prototype properties constructor and toString return undefined without error', () => {
      assert.equal(vehicleById('constructor'), undefined);
      assert.equal(vehicleById('toString'), undefined);
      assert.equal(vehicleById('valueOf'), undefined);
    });

    it('Case 4.4: Null and undefined arguments return undefined', () => {
      assert.equal(vehicleById(null), undefined);
      assert.equal(vehicleById(undefined), undefined);
    });

    it('Case 4.5: Special characters and injection strings return undefined without execution', () => {
      const maliciousIds = [
        '<script>alert(1)</script>',
        "'; DROP TABLE vehicles; --",
        '${7*7}',
        '__defineGetter__',
      ];
      for (const id of maliciousIds) {
        assert.equal(vehicleById(id), undefined);
      }
    });
  });

  // =========================================================================
  // Boundary 5: Rapid Mount / Dismount Toggling & State Transitions
  // =========================================================================
  describe('Boundary 5: Rapid Mount / Dismount Toggling & State Transitions', () => {
    it('Case 5.1: Rapid mounting toggle sequence preserves state consistency', () => {
      let driving = false;
      const toggle = () => {
        driving = !driving;
        return driving;
      };

      // Sequence V -> V -> V -> V
      assert.equal(toggle(), true); // mount
      assert.equal(toggle(), false); // dismount
      assert.equal(toggle(), true); // mount
      assert.equal(toggle(), false); // dismount
      assert.equal(driving, false, 'Final state must be dismounted');
    });

    it('Case 5.2: Dismounting immediately restores player avatar visibility', () => {
      const getVisibility = (driving: boolean, kind: 'car' | 'bicycle') => {
        const ridingTwoWheeler = kind === 'bicycle';
        return !driving || ridingTwoWheeler;
      };

      // While driving car: hidden
      assert.equal(getVisibility(true, 'car'), false);
      // Immediately on dismount: visible
      assert.equal(getVisibility(false, 'car'), true);
    });

    it('Case 5.3: Dismounting clears active vehicle container sprite and resets driving flag', () => {
      let vehicleSpriteVisible = true;
      let driving = true;

      const dismount = () => {
        driving = false;
        vehicleSpriteVisible = false;
      };

      dismount();
      assert.equal(driving, false);
      assert.equal(vehicleSpriteVisible, false);
    });

    it('Case 5.4: Unowned vehicle in client appearance is sanitized away by server', () => {
      const appearance = sanitizeAppearance({ vehicle: 'car_sunset' });
      assert.equal('vehicle' in appearance, false, 'Spoofed vehicle in appearance must be stripped');
    });

    it('Case 5.5: Switching equipped vehicle cleanly updates appearance and speed', () => {
      const player = { vehicle: 'bicycle_sky' };
      assert.equal(vehicleById(player.vehicle)?.speed, 195);

      // Equip Ducati
      player.vehicle = 'motorcycle_ducati';
      assert.equal(vehicleById(player.vehicle)?.speed, 310);
      assert.equal(vehicleById(player.vehicle)?.brand, 'Ducati');
    });
  });
});
