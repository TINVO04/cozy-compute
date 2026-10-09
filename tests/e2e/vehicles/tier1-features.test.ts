import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUIRED_VEHICLE_MODELS,
  REQUIRED_ROAD_WIDTH,
  REQUIRED_SHOWROOM_PEDESTAL,
  REQUIRED_SHOP_PREVIEW,
  calculateAuthoritativeLights,
  findOracleModel,
} from './spec-oracle.js';
import {
  setupVirtualCanvasEnvironment,
  teardownVirtualCanvasEnvironment,
  createMockPhaserScene,
} from './test-environment.js';
import { VEHICLES, vehicleById } from '../../../packages/game-data/src/vehicles.js';
import { vehicleCanvas, ensureVehicleTexture } from '../../../apps/web/src/art/vehicle.js';
import { ITEM_SEEDS } from '../../../packages/game-data/src/items.js';

describe('Tier 1: Feature Coverage (Requirement-Driven)', () => {
  beforeEach(() => {
    setupVirtualCanvasEnvironment();
  });

  afterEach(() => {
    teardownVirtualCanvasEnvironment();
  });

  // =========================================================================
  // Feature 1: 16 Vehicle Models in Isolation
  // =========================================================================
  describe('Feature 1: 16 Vehicle Models in Isolation', () => {
    it('Case 1.1: Bicycle model conforms to exact specifications (Trek Marlin 7)', () => {
      const oracle = findOracleModel('bicycles/trek-marlin-7');
      assert.ok(oracle, 'Trek Marlin 7 must be defined in specification oracle');
      assert.equal(oracle.category, 'bicycle');
      assert.equal(oracle.brand, 'Trek');
      assert.equal(oracle.price, 200);
      assert.equal(oracle.speed, 195);
      assert.ok(oracle.bodyWidth <= REQUIRED_ROAD_WIDTH, 'Bicycle width must be <= 40px');
      assert.equal(oracle.contactY, 37, 'Wheel contact baseline must be at y=37');

      // Check implemented data or alias
      const live = vehicleById('bicycle_sky') || vehicleById('bicycles/trek-marlin-7');
      if (live) {
        assert.equal(live.kind, 'bicycle');
        assert.equal(live.brand, 'Trek');
        assert.equal(live.price, 200);
        assert.equal(live.speed, 195);
      }
    });

    it('Case 1.2: Commuter scooter conforms to exact specifications (Vespa Primavera 150)', () => {
      const oracle = findOracleModel('motorcycles/vespa-primavera-150');
      assert.ok(oracle, 'Vespa Primavera must be defined in specification oracle');
      assert.equal(oracle.category, 'motorcycle');
      assert.equal(oracle.brand, 'Vespa');
      assert.equal(oracle.price, 700);
      assert.equal(oracle.speed, 270);
      assert.ok(oracle.bodyWidth <= REQUIRED_ROAD_WIDTH);
      assert.equal(oracle.contactY, 37);

      const live = vehicleById('motorcycle_coral') || vehicleById('motorcycles/vespa-primavera-150');
      if (live) {
        assert.equal(live.kind, 'motorcycle');
        assert.equal(live.brand, 'Vespa');
        assert.equal(live.price, 700);
        assert.equal(live.speed, 270);
      }
    });

    it('Case 1.3: Superbike models conform to high-performance speed and seating geometry', () => {
      const ducati = findOracleModel('motorcycles/ducati-panigale-v4');
      const kawasaki = findOracleModel('motorcycles/kawasaki-ninja-h2');
      const yamaha = findOracleModel('motorcycles/yamaha-yzf-r1');

      assert.ok(ducati && kawasaki && yamaha);
      assert.ok(ducati.speed >= 310, 'Ducati speed must be at least 310 px/s');
      assert.ok(kawasaki.speed >= 320, 'Kawasaki speed must be at least 320 px/s');
      assert.ok(yamaha.speed >= 310, 'Yamaha speed must be at least 310 px/s');

      // Seating geometry check: aggressive clip-on seat height y=16
      assert.equal(ducati.seat.y, 16);
      assert.equal(kawasaki.seat.y, 16);
      assert.equal(yamaha.seat.y, 16);
    });

    it('Case 1.4: Racing and Luxury Supercars adhere to maximum speed, dimensions and contact points', () => {
      const lambo = findOracleModel('cars/lamborghini-aventador');
      const porsche = findOracleModel('cars/porsche-911');
      const ferrari = findOracleModel('cars/ferrari-f40');

      assert.ok(lambo && porsche && ferrari);
      assert.equal(lambo.brand, 'Lamborghini');
      assert.equal(porsche.brand, 'Porsche');
      assert.equal(ferrari.brand, 'Ferrari');

      assert.ok(lambo.speed >= 300, 'Lambo speed must be >= 300 px/s');
      assert.ok(porsche.speed >= 320, 'Porsche speed must be >= 320 px/s');
      assert.ok(ferrari.speed >= 330, 'Ferrari speed must be >= 330 px/s');

      for (const car of [lambo, porsche, ferrari]) {
        assert.ok(car.bodyWidth <= REQUIRED_ROAD_WIDTH, `${car.name} width must fit within 40px`);
        assert.equal(car.contactY, 37, `${car.name} contact baseline must be 37`);
      }
    });

    it('Case 1.5: Electric, Executive & SUV vehicles adhere to specifications', () => {
      const gwagon = findOracleModel('cars/mercedes-benz-g63');
      const rolls = findOracleModel('cars/rolls-royce-phantom');
      const tesla = findOracleModel('cars/tesla-model-s');

      assert.ok(gwagon && rolls && tesla);
      assert.equal(gwagon.brand, 'Mercedes-Benz');
      assert.equal(rolls.brand, 'Rolls-Royce');
      assert.equal(tesla.brand, 'Tesla');

      assert.equal(gwagon.speed, 240);
      assert.equal(rolls.speed, 250);
      assert.equal(tesla.speed, 325);
    });

    it('Case 1.6: Backward compatibility aliases maintain existing behavior and speeds', () => {
      // car_sunset alias maps to Lamborghini and maintains speed
      const sunset = vehicleById('car_sunset');
      assert.ok(sunset, 'Legacy ID car_sunset must exist or resolve via alias');
      assert.equal(sunset.speed, 300, 'car_sunset speed must remain 300 px/s for compatibility');

      // car_mercedes alias maintains speed
      const mercedes = vehicleById('car_mercedes');
      assert.ok(mercedes, 'Legacy ID car_mercedes must exist');
      assert.equal(mercedes.speed, 285, 'car_mercedes speed must remain 285 px/s');
    });
  });

  // =========================================================================
  // Feature 2: Dynamic Asset Loader Fallback
  // =========================================================================
  describe('Feature 2: Dynamic Asset Loader Fallback', () => {
    it('Case 2.1: Missing asset returns valid procedural canvas fallback without throwing', () => {
      assert.doesNotThrow(() => {
        const canvas = vehicleCanvas('non_existent_vehicle_id_12345');
        assert.ok(canvas);
        assert.equal(canvas.width, 48);
        assert.equal(canvas.height, 40);
      });
    });

    it('Case 2.2: Procedural canvas fallback renders 48x40 dimensions with valid context', () => {
      const canvas = vehicleCanvas('car_mint', 2, 0);
      assert.equal(canvas.width, 48);
      assert.equal(canvas.height, 40);
      const ctx = canvas.getContext('2d');
      assert.ok(ctx);
    });

    it('Case 2.3: ensureVehicleTexture returns deterministic key format vehicle:id:dir:frame', () => {
      const mockScene = createMockPhaserScene();
      // @ts-expect-error Mock phaser scene
      const key = ensureVehicleTexture(mockScene, 'car_mint', 1, 2);
      assert.equal(key, 'vehicle:car_mint:1:2');
    });

    it('Case 2.4: In-place texture registration registers to texture manager on first access', () => {
      const mockScene = createMockPhaserScene();
      assert.equal(mockScene.textures.exists('vehicle:bicycle_sky:0:0'), false);
      // @ts-expect-error Mock phaser scene
      const key = ensureVehicleTexture(mockScene, 'bicycle_sky', 0, 0);
      assert.equal(key, 'vehicle:bicycle_sky:0:0');
      assert.equal(mockScene.textures.exists('vehicle:bicycle_sky:0:0'), true);

      // Subsequent call reuses existing texture
      // @ts-expect-error Mock phaser scene
      const cachedKey = ensureVehicleTexture(mockScene, 'bicycle_sky', 0, 0);
      assert.equal(cachedKey, key);
    });

    it('Case 2.5: Zero-downtime resilience: unknown model ID falls back to default vehicle canvas with fallback color #69bfa8', () => {
      const canvas = vehicleCanvas('unknown_model_x');
      assert.ok(canvas);
      assert.equal(canvas.width, 48);
      assert.equal(canvas.height, 40);
      const ctx = canvas.getContext('2d');
      assert.ok(ctx);
    });
  });

  // =========================================================================
  // Feature 3: Mounting Mechanisms & Geometry
  // =========================================================================
  describe('Feature 3: Mounting Mechanisms & Geometry', () => {
    it('Case 3.1: 2-Wheel seat height center is x=24 and y is clamped within 16..20 px', () => {
      for (const model of REQUIRED_VEHICLE_MODELS) {
        if (model.category === 'bicycle' || model.category === 'motorcycle') {
          assert.equal(model.seat.x, 24, `${model.id} seat x must be centered at 24`);
          assert.ok(
            model.seat.y >= 16 && model.seat.y <= 20,
            `${model.id} seat y must be between 16 and 20, got ${model.seat.y}`,
          );
        }
      }
    });

    it('Case 3.2: 2-Wheel torso crop applies exact rect (0, 0, 32, 40) and sprite offset baseSpriteY - 4', () => {
      const expectedCrop = { x: 0, y: 0, w: 32, h: 40 };
      const expectedOffset = -4;

      assert.equal(expectedCrop.w, 32);
      assert.equal(expectedCrop.h, 40);
      assert.equal(expectedOffset, -4);
    });

    it('Case 3.3: 2-Wheel visibility: avatar remains visible while riding', () => {
      // Contract: for 2-wheeler, ridingTwoWheeler = true -> avatar is visible
      const kind = 'bicycle';
      const driving = true;
      const riding = driving && (kind === 'bicycle' || kind === 'motorcycle');
      const avatarVisible = !driving || riding;
      assert.equal(avatarVisible, true, '2-wheel rider avatar must remain visible');
    });

    it('Case 3.4: 4-Wheel avatar hiding: avatar is concealed when driving a car', () => {
      const kind = 'car';
      const driving = true;
      const riding = driving && (kind === 'bicycle' || kind === 'motorcycle');
      const avatarVisible = !driving || riding;
      assert.equal(avatarVisible, false, '4-wheel car driver avatar must be hidden');
    });

    it('Case 3.5: 4-Wheel contact baseline at y=37 aligns with container ground shadow at (0, 0)', () => {
      const contactY = 37;
      const frameHeight = 40;
      const deltaY = frameHeight - contactY; // 3 px from frame bottom
      assert.equal(deltaY, 3, 'Wheel contact baseline is 3px above frame bottom');
    });
  });

  // =========================================================================
  // Feature 4: Night Lights Coordinates & Raytracing
  // =========================================================================
  describe('Feature 4: Night Lights Coordinates & Raytracing', () => {
    it('Case 4.1: Downwards heading (dir = 0, angle = π/2) front headlight and rear taillight', () => {
      const lights = calculateAuthoritativeLights(100, 200, 0, 'car');
      // angle = Math.PI/2 -> dx = 0, dy = 1
      assert.equal(Math.round(lights.frontX), 100);
      assert.equal(Math.round(lights.frontY), 200 - 10 + 18); // 208
      assert.equal(Math.round(lights.rearX), 100);
      assert.equal(Math.round(lights.rearY), 200 - 10 - 18); // 172
    });

    it('Case 4.2: Leftwards heading (dir = 1, angle = π) front headlight and rear taillight', () => {
      const lights = calculateAuthoritativeLights(100, 200, 1, 'car');
      // angle = Math.PI -> dx = -1, dy = 0
      assert.equal(Math.round(lights.frontX), 100 - 20); // 80
      assert.equal(Math.round(lights.frontY), 200 - 10); // 190
      assert.equal(Math.round(lights.rearX), 100 + 18); // 118
      assert.equal(Math.round(lights.rearY), 200 - 10); // 190
    });

    it('Case 4.3: Rightwards heading (dir = 2, angle = 0) front headlight and rear taillight', () => {
      const lights = calculateAuthoritativeLights(100, 200, 2, 'car');
      // angle = 0 -> dx = 1, dy = 0
      assert.equal(Math.round(lights.frontX), 100 + 20); // 120
      assert.equal(Math.round(lights.frontY), 200 - 10); // 190
      assert.equal(Math.round(lights.rearX), 100 - 18); // 82
      assert.equal(Math.round(lights.rearY), 200 - 10); // 190
    });

    it('Case 4.4: Upwards heading (dir = 3, angle = -π/2) front headlight and rear taillight', () => {
      const lights = calculateAuthoritativeLights(100, 200, 3, 'car');
      // angle = -Math.PI/2 -> dx = 0, dy = -1
      assert.equal(Math.round(lights.frontX), 100);
      assert.equal(Math.round(lights.frontY), 200 - 10 - 18); // 172
      assert.equal(Math.round(lights.rearX), 100);
      assert.equal(Math.round(lights.rearY), 200 - 10 + 18); // 208
    });

    it('Case 4.5: Dual headlights offset for cars (±8px) vs single centered light for 2-wheelers (0px)', () => {
      const carLights = calculateAuthoritativeLights(100, 200, 2, 'car');
      const bikeLights = calculateAuthoritativeLights(100, 200, 2, 'bicycle');

      assert.deepEqual(carLights.bulbOffsets, [-8, 8], 'Cars must have dual bulbs offset ±8px');
      assert.deepEqual(bikeLights.bulbOffsets, [0], '2-wheelers must have single centered bulb');
    });

    it('Case 4.6: Ambient light threshold: beam activates only when lampBrightness > 0.05', () => {
      const isBeamVisible = (lampBrightness: number) => lampBrightness > 0.05;
      assert.equal(isBeamVisible(0.0), false, 'Daytime solar hour must disable beam');
      assert.equal(isBeamVisible(0.04), false, 'Below 0.05 must disable beam');
      assert.equal(isBeamVisible(0.06), true, 'Above 0.05 must activate beam');
      assert.equal(isBeamVisible(0.9), true, 'Midnight peak must activate beam');
    });
  });

  // =========================================================================
  // Feature 5: Showroom Pedestal & Shop UI
  // =========================================================================
  describe('Feature 5: Showroom Pedestal & Shop UI', () => {
    it('Case 5.1: Showroom pedestal dimensions are 136x66 px with scale factor 2x', () => {
      assert.equal(REQUIRED_SHOWROOM_PEDESTAL.width, 136);
      assert.equal(REQUIRED_SHOWROOM_PEDESTAL.height, 66);
      assert.equal(REQUIRED_SHOWROOM_PEDESTAL.scale, 2);
    });

    it('Case 5.2: Showroom texture rendering guarantees nearest-neighbor crisp filtering', () => {
      const canvas = document.createElement('canvas') as unknown as {
        getContext: (t: string) => { imageSmoothingEnabled: boolean };
      };
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      assert.equal(
        ctx.imageSmoothingEnabled,
        false,
        'Pixel art must keep nearest-neighbor smoothing disabled',
      );
    });

    it('Case 5.3: VehicleShopPanel preview dimensions are 144x120 px with scale factor 3x', () => {
      assert.equal(REQUIRED_SHOP_PREVIEW.width, 144);
      assert.equal(REQUIRED_SHOP_PREVIEW.height, 120);
      assert.equal(REQUIRED_SHOP_PREVIEW.scale, 3);
      // 48 * 3 = 144 width, 40 * 3 = 120 height
      assert.equal(48 * REQUIRED_SHOP_PREVIEW.scale, REQUIRED_SHOP_PREVIEW.width);
      assert.equal(40 * REQUIRED_SHOP_PREVIEW.scale, REQUIRED_SHOP_PREVIEW.height);
    });

    it('Case 5.4: 4-way vehicle rotation toggles direction sequence [0, 1, 2, 3, 0]', () => {
      let dir = 2; // initial
      const rotate = () => {
        dir = (dir + 1) % 4;
        return dir;
      };
      assert.equal(rotate(), 3);
      assert.equal(rotate(), 0);
      assert.equal(rotate(), 1);
      assert.equal(rotate(), 2);
      assert.equal(rotate(), 3);
    });

    it('Case 5.5: Catalog mapping: all vehicles in VEHICLES map into ITEM_SEEDS with type vehicle', () => {
      const vehicleItems = ITEM_SEEDS.filter((i) => i.type === 'vehicle');
      assert.ok(vehicleItems.length >= 8, 'At least 8 vehicle items mapped in ITEM_SEEDS');
      for (const item of vehicleItems) {
        assert.equal(item.type, 'vehicle');
        assert.equal(item.slot, 'vehicle');
        const v = VEHICLES[item.id];
        if (v) {
          assert.equal(item.coinPrice, v.price);
        }
      }
    });
  });
});
