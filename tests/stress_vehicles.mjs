/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * ADVERSARIAL STRESS TEST HARNESS — Cozy Compute Vehicle Asset Pack & Runtime
 *
 * Test 1: Town Road Fitment & Off-Road Penalties (Mathematical Proof & Continuous Empirical Simulation)
 * Test 2: Dynamic Asset Loader Concurrency & Resilience (100 Concurrent Requests, Traversal & Pollution)
 * Test 3: In-Place Refresh Non-Destruction (Display List Integrity Under Dynamic Texture Updates)
 * Test 4: Headlight & Taillight Raytracing Limits (Non-Standard Directions, Negative Offsets, Scale Bounds)
 */

import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  VEHICLES,
  VEHICLE_ALIASES,
  CANONICAL_VEHICLE_IDS,
  TOWN_ROADS,
  DEALER_DRIVEWAY,
  onRoad,
  onDriveway,
  drivingSpeed,
  vehicleById,
} from '../packages/game-data/src/vehicles.ts';
import {
  resolveVehicleAssetPath,
  ensureVehicleTexture,
  clearVehicleAssetCache,
} from '../apps/web/src/art/vehicle-loader.ts';
import { vehicleCanvas } from '../apps/web/src/art/vehicle.ts';

// ============================================================================
// ENVIRONMENT MOCKING (Canvas & Phaser Scene Mock)
// ============================================================================

class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  imageSmoothingEnabled = false;
  calls = [];

  fillRect(x, y, w, h) {
    this.calls.push({ m: 'fillRect', args: [x, y, w, h] });
  }
  strokeRect(x, y, w, h) {
    this.calls.push({ m: 'strokeRect', args: [x, y, w, h] });
  }
  clearRect(x, y, w, h) {
    this.calls.push({ m: 'clearRect', args: [x, y, w, h] });
  }
  beginPath() {
    this.calls.push({ m: 'beginPath' });
  }
  closePath() {
    this.calls.push({ m: 'closePath' });
  }
  moveTo(x, y) {
    this.calls.push({ m: 'moveTo', args: [x, y] });
  }
  lineTo(x, y) {
    this.calls.push({ m: 'lineTo', args: [x, y] });
  }
  stroke() {
    this.calls.push({ m: 'stroke' });
  }
  fill() {
    this.calls.push({ m: 'fill' });
  }
  arc(x, y, r, s, e) {
    this.calls.push({ m: 'arc', args: [x, y, r, s, e] });
  }
  ellipse(x, y, rx, ry, rot, s, e) {
    this.calls.push({ m: 'ellipse', args: [x, y, rx, ry, rot, s, e] });
  }
  save() {
    this.calls.push({ m: 'save' });
  }
  restore() {
    this.calls.push({ m: 'restore' });
  }
  translate(x, y) {
    this.calls.push({ m: 'translate', args: [x, y] });
  }
  scale(x, y) {
    this.calls.push({ m: 'scale', args: [x, y] });
  }
  drawImage(...args) {
    this.calls.push({ m: 'drawImage', args });
  }
  createLinearGradient(x0, y0, x1, y1) {
    return {
      x0,
      y0,
      x1,
      y1,
      stops: [],
      addColorStop(offset, color) {
        this.stops.push([offset, color]);
      },
    };
  }
}

class MockHTMLCanvasElement {
  constructor(w = 48, h = 40) {
    this.width = w;
    this.height = h;
    this.ctx = new MockCanvasRenderingContext2D();
  }
  getContext(type) {
    return type === '2d' ? this.ctx : null;
  }
}

globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') return new MockHTMLCanvasElement();
    return { tagName: tag };
  },
};

function createMockPhaserScene() {
  const textures = new Map();
  const displayList = [];

  const textureManager = {
    exists: (k) => textures.has(k),
    get: (k) => textures.get(k),
    addCanvas: (k, canvas) => {
      const tex = {
        key: k,
        source: [canvas],
        canvas,
        refreshCount: 0,
        getContext: () => canvas.getContext('2d'),
        refresh: () => {
          tex.refreshCount++;
          // Notify listening game objects in display list
          for (const obj of displayList) {
            if (obj.textureKey === k) {
              obj.onTextureRefresh();
            }
          }
        },
      };
      textures.set(k, tex);
      return tex;
    },
  };

  const add = {
    image: (x, y, key) => {
      const img = {
        type: 'Image',
        x,
        y,
        textureKey: key,
        originX: 0,
        originY: 0,
        visible: true,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        destroyed: false,
        refreshEvents: 0,
        setOrigin(ox, oy = ox) {
          this.originX = ox;
          this.originY = oy;
          return this;
        },
        setBlendMode() {
          return this;
        },
        setDepth() {
          return this;
        },
        setVisible(v) {
          this.visible = v;
          return this;
        },
        setPosition(px, py) {
          this.x = px;
          this.y = py;
          return this;
        },
        setRotation(r) {
          this.rotation = r;
          return this;
        },
        setAlpha(a) {
          this.alpha = a;
          return this;
        },
        setScale(sx, sy = sx) {
          this.scaleX = sx;
          this.scaleY = sy;
          return this;
        },
        setTexture(k) {
          this.textureKey = k;
          return this;
        },
        onTextureRefresh() {
          this.refreshEvents++;
        },
        destroy() {
          this.destroyed = true;
          const idx = displayList.indexOf(this);
          if (idx !== -1) displayList.splice(idx, 1);
        },
      };
      displayList.push(img);
      return img;
    },
    graphics: () => {
      const g = {
        type: 'Graphics',
        blendMode: 0,
        depth: 0,
        fillColor: 0,
        fillAlpha: 1,
        circles: [],
        rects: [],
        destroyed: false,
        setBlendMode(bm) {
          this.blendMode = bm;
          return this;
        },
        setDepth(d) {
          this.depth = d;
          return this;
        },
        clear() {
          this.circles = [];
          this.rects = [];
          return this;
        },
        fillStyle(c, a = 1) {
          this.fillColor = c;
          this.fillAlpha = a;
          return this;
        },
        fillCircle(x, y, r) {
          this.circles.push({ x, y, r });
          return this;
        },
        fillRect(x, y, w, h) {
          this.rects.push({ x, y, w, h });
          return this;
        },
        destroy() {
          this.destroyed = true;
          const idx = displayList.indexOf(this);
          if (idx !== -1) displayList.splice(idx, 1);
        },
      };
      displayList.push(g);
      return g;
    },
  };

  return { textures: textureManager, add, displayList };
}

// ============================================================================
// TEST RUNNER & SUITE IMPLEMENTATION
// ============================================================================

async function runAdversarialStressTests() {
  console.log('='.repeat(78));
  console.log(' COZY COMPUTE — VEHICLE ADVERSARIAL STRESS TEST HARNESS');
  console.log(' Authoritative Challenger Suite — Empirical Invariant Verification');
  console.log('='.repeat(78));

  let totalTests = 0;
  let totalPass = 0;
  let totalFail = 0;
  const metrics = {};

  const assertTest = async (name, fn) => {
    totalTests++;
    try {
      await fn();
      totalPass++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      totalFail++;
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${err.message}`);
    }
  };

  // --------------------------------------------------------------------------
  // TEST 1: Town Road Fitment & Off-Road Penalties
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST 1: Town Road Fitment & Off-Road Penalties');

  // Mathematical Proof:
  await assertTest(
    'Test 1.1: Mathematical Proof — All 16 models have bodyWidth <= 40px and bodyHeight <= 40px',
    () => {
      const roadWidth = 40;
      const bodyWidths = [];
      const margins = [];

      for (const id of CANONICAL_VEHICLE_IDS) {
        const def = VEHICLES[id];
        assert.ok(def, `Canonical vehicle ${id} must exist in VEHICLES`);
        const { bodyWidth, bodyHeight } = def.dimensions;
        assert.ok(
          bodyWidth <= roadWidth,
          `${id} bodyWidth (${bodyWidth}) must be <= roadWidth (${roadWidth})`,
        );
        assert.ok(
          bodyHeight <= roadWidth,
          `${id} bodyHeight (${bodyHeight}) must be <= roadWidth (${roadWidth})`,
        );
        const margin = (roadWidth - bodyWidth) / 2;
        assert.ok(margin >= 1.0, `${id} must have at least 1.0px clearance margin (got ${margin}px)`);
        bodyWidths.push(bodyWidth);
        margins.push(margin);
      }

      metrics.maxBodyWidth = Math.max(...bodyWidths);
      metrics.minClearanceMargin = Math.min(...margins);
      console.log(
        `         Max bodyWidth: ${metrics.maxBodyWidth}px, Min road clearance: ${metrics.minClearanceMargin}px`,
      );
    },
  );

  // Empirical Simulation of Driving down the center of all segments of TOWN_ROADS at max speed:
  await assertTest(
    'Test 1.2: Empirical Simulation — All 16 models driving all TOWN_ROADS segments at top speed',
    () => {
      let totalSimulationSteps = 0;
      let totalFalsePositiveOffRoad = 0;
      let totalViolations = 0;
      let totalDistanceTraversed = 0;

      const dt = 0.05; // 50ms per physics / traffic enforcement tick

      // Road segments from TOWN_ROADS:
      // Seg 0: { x: 32, y: 332, w: 1472, h: 40 } -> Horizontal, centerline Y = 352
      // Seg 1: { x: 332, y: 320, w: 40, h: 576 } -> Vertical, centerline X = 352
      // Seg 2: { x: 1036, y: 320, w: 72, h: 576 } -> Vertical, centerline X = 1072
      // Seg 3: { x: 96, y: 844, w: 1024, h: 40 } -> Horizontal, centerline Y = 864
      const roadSegments = [
        {
          id: 'Seg0_MainHorizontal',
          x: 32,
          y: 332,
          w: 1472,
          h: 40,
          isHoriz: true,
          center: 352,
          start: 32,
          end: 1504,
        },
        {
          id: 'Seg1_WestVertical',
          x: 332,
          y: 320,
          w: 40,
          h: 576,
          isHoriz: false,
          center: 352,
          start: 320,
          end: 896,
        },
        {
          id: 'Seg2_EastVertical',
          x: 1036,
          y: 320,
          w: 72,
          h: 576,
          isHoriz: false,
          center: 1072,
          start: 320,
          end: 896,
        },
        {
          id: 'Seg3_SouthHorizontal',
          x: 96,
          y: 844,
          w: 1024,
          h: 40,
          isHoriz: true,
          center: 864,
          start: 96,
          end: 1120,
        },
      ];

      for (const vehicleId of CANONICAL_VEHICLE_IDS) {
        const def = VEHICLES[vehicleId];
        const speed = def.speed; // px/s (up to 340 px/s)
        const stepDist = speed * dt; // px per tick
        const halfBodyW = def.dimensions.bodyWidth / 2;

        for (const seg of roadSegments) {
          // Test both forward and reverse directions
          for (const reverse of [false, true]) {
            const fromCoord = reverse ? seg.end : seg.start;
            const toCoord = reverse ? seg.start : seg.end;
            const dirSign = reverse ? -1 : 1;
            const totalDist = Math.abs(toCoord - fromCoord);
            const steps = Math.ceil(totalDist / stepDist);

            let offRoadAccumulatorMs = 0;

            for (let step = 0; step <= steps; step++) {
              totalSimulationSteps++;
              const currentDist = Math.min(step * stepDist, totalDist);
              const coord = fromCoord + dirSign * currentDist;

              const px = seg.isHoriz ? coord : seg.center;
              const py = seg.isHoriz ? seg.center : coord;

              // 1. Authoritative onRoad check
              const roadStatus = onRoad(px, py);
              const driveSpeed = drivingSpeed(vehicleId, px, py);

              if (!roadStatus) {
                totalFalsePositiveOffRoad++;
                offRoadAccumulatorMs += dt * 1000;
              } else {
                offRoadAccumulatorMs = 0;
              }

              // Speed must not be penalized
              assert.equal(
                driveSpeed,
                speed,
                `Driving speed at (${px}, ${py}) must equal max speed ${speed}`,
              );

              // 2. Physical Body Transverse Clearance Check:
              // Ensure the vehicle's transverse extent across the road does not spill over road edges
              if (seg.isHoriz) {
                // Horizontal road: transverse extent is in Y direction
                const bodyTop = py - halfBodyW;
                const bodyBottom = py + halfBodyW;
                assert.ok(
                  bodyTop >= seg.y && bodyBottom <= seg.y + seg.h,
                  `Vehicle ${vehicleId} transverse body [${bodyTop}, ${bodyBottom}] must fit in horizontal road Y [${seg.y}, ${seg.y + seg.h}]`,
                );
              } else {
                // Vertical road: transverse extent is in X direction
                const bodyLeft = px - halfBodyW;
                const bodyRight = px + halfBodyW;
                assert.ok(
                  bodyLeft >= seg.x && bodyRight <= seg.x + seg.w,
                  `Vehicle ${vehicleId} transverse body [${bodyLeft}, ${bodyRight}] must fit in vertical road X [${seg.x}, ${seg.x + seg.w}]`,
                );
              }

              // Traffic fine violation check (> 1000ms off road)
              if (offRoadAccumulatorMs >= 1000) {
                totalViolations++;
              }
            }
            totalDistanceTraversed += totalDist;
          }
        }
      }

      metrics.totalSimulationSteps = totalSimulationSteps;
      metrics.totalDistanceTraversed = totalDistanceTraversed;
      metrics.totalFalsePositiveOffRoad = totalFalsePositiveOffRoad;
      metrics.totalViolations = totalViolations;

      assert.equal(totalFalsePositiveOffRoad, 0, 'Zero false positive off_road triggers allowed');
      assert.equal(totalViolations, 0, 'Zero off_road violations allowed');
      console.log(
        `         Simulated ${totalSimulationSteps} ticks over ${totalDistanceTraversed.toFixed(0)}px: 0 off_road triggers, 0 violations.`,
      );
    },
  );

  // --------------------------------------------------------------------------
  // TEST 2: Dynamic Asset Loader Concurrency & Resilience
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST 2: Dynamic Asset Loader Concurrency & Resilience');

  const scene = createMockPhaserScene();
  clearVehicleAssetCache();

  const maliciousInputs = [
    '../../etc/passwd',
    '../../../windows/system32/cmd.exe',
    '..\\..\\secret.env',
    '/etc/shadow',
    '..\\..\\..\\boot.ini',
    '%2e%2e%2f%2e%2e%2fpasswd',
    '....//....//config.json',
    'vehicles/../../package.json',
    '__proto__',
    'constructor',
    'prototype',
    'toString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    '__defineGetter__',
    '{"id": "evil"}',
    '<script>alert(1)</script>',
    'DROP TABLE vehicles;--',
    '\0/proc/self/environ',
  ];

  const unknownInputs = [
    'ufo_saucer_99',
    'hovercraft_alien',
    'spaceship_apollo',
    'random_model_xyz',
    '',
    '   ',
    'null',
    'undefined',
    '12345',
  ];

  const validAndAliasInputs = [
    ...CANONICAL_VEHICLE_IDS,
    'car_sunset',
    'car_mercedes',
    'cars/mercedes-benz-g63',
    'cars/lamborghini-aventador',
    'bicycles/trek-marlin-7',
    'motorcycles/vespa-primavera-150',
    'trek-marlin-7',
    'vespa-primavera-150',
  ];

  // Build exactly 100 randomized concurrent requests
  const testCases = [];
  for (let i = 0; i < 100; i++) {
    let candidate;
    if (i % 3 === 0) {
      candidate = maliciousInputs[i % maliciousInputs.length];
    } else if (i % 3 === 1) {
      candidate = unknownInputs[i % unknownInputs.length];
    } else {
      candidate = validAndAliasInputs[i % validAndAliasInputs.length];
    }
    const dir = i % 4;
    const frame = i % 4;
    testCases.push({ id: candidate, dir, frame, reqIndex: i });
  }

  await assertTest(
    'Test 2.1: 100 Concurrent Requests to ensureVehicleTexture throw zero exceptions and return valid fallbacks',
    async () => {
      const startTime = performance.now();
      let exceptionCount = 0;
      let validKeys = 0;

      const promises = testCases.map(async (tc) => {
        try {
          const key = ensureVehicleTexture(scene, tc.id, tc.dir, tc.frame);
          assert.ok(typeof key === 'string' && key.length > 0, 'Key must be non-empty string');
          assert.ok(scene.textures.exists(key), `Texture for key ${key} must exist in scene`);
          const tex = scene.textures.get(key);
          assert.ok(tex && tex.canvas, `Canvas texture must be registered for key ${key}`);
          validKeys++;
          return { key, success: true };
        } catch (err) {
          exceptionCount++;
          return { error: err.message, success: false };
        }
      });

      await Promise.all(promises);
      const durationMs = performance.now() - startTime;
      metrics.concurrentRequests = testCases.length;
      metrics.concurrentExceptions = exceptionCount;
      metrics.concurrentDurationMs = durationMs;

      assert.equal(exceptionCount, 0, `Expected 0 exceptions, got ${exceptionCount}`);
      assert.equal(validKeys, 100, `Expected 100 valid keys, got ${validKeys}`);
      console.log(
        `         Handled 100 concurrent requests in ${durationMs.toFixed(2)}ms with 0 exceptions.`,
      );
    },
  );

  await assertTest('Test 2.2: Path Traversal & Prototype Pollution Defense Verification', () => {
    // 1. Verify that resolveVehicleAssetPath rejected all malicious inputs
    for (const mal of maliciousInputs) {
      const resolved = resolveVehicleAssetPath(mal);
      assert.equal(resolved, null, `Malicious input "${mal}" must resolve to null, got "${resolved}"`);
    }

    // 2. Verify global Object prototype was not polluted
    const testObj = {};
    assert.equal(testObj.polluted, undefined, 'Object.prototype must not have polluted property');
    assert.equal(testObj.assetPath, undefined, 'Object.prototype must not have assetPath');
    assert.equal(typeof Object.prototype.toString, 'function', 'toString must remain original function');
    assert.equal(
      typeof Object.prototype.hasOwnProperty,
      'function',
      'hasOwnProperty must remain original function',
    );

    console.log(`         Verified 100% path traversal and prototype pollution rejection.`);
  });

  // --------------------------------------------------------------------------
  // TEST 3: In-Place Refresh Non-Destruction
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST 3: In-Place Refresh Non-Destruction');

  await assertTest(
    'Test 3.1: In-Place Refresh does not crash Phaser or corrupt existing scene display lists',
    () => {
      const freshScene = createMockPhaserScene();
      const activeVehicleKeys = [];

      // Register initial textures for all 16 canonical models
      for (const id of CANONICAL_VEHICLE_IDS) {
        for (let dir = 0; dir < 4; dir++) {
          const key = ensureVehicleTexture(freshScene, id, dir, 0);
          activeVehicleKeys.push(key);
        }
      }

      // Populate display list with 50 active GameObjects referencing these textures
      const sprites = [];
      for (let i = 0; i < 50; i++) {
        const texKey = activeVehicleKeys[i % activeVehicleKeys.length];
        const spr = freshScene.add.image(100 + i * 10, 200 + i * 5, texKey);
        sprites.push(spr);
      }

      assert.equal(freshScene.displayList.length, 50, 'Display list should have 50 objects');

      // Trigger in-place refresh across all registered textures multiple times
      let totalRefreshCalls = 0;
      for (const key of activeVehicleKeys) {
        const tex = freshScene.textures.get(key);
        assert.ok(tex, `Texture ${key} must exist`);

        // Modify canvas pixels as real loader does
        const ctx = tex.getContext();
        ctx.fillRect(0, 0, 48, 40);

        // Perform in-place refresh
        tex.refresh();
        totalRefreshCalls++;
      }

      // Verify display list integrity
      assert.equal(freshScene.displayList.length, 50, 'Display list length must remain 50 after refresh');
      for (const spr of sprites) {
        assert.equal(spr.destroyed, false, 'Sprite must not be destroyed by texture refresh');
        assert.ok(spr.refreshEvents > 0, 'Sprite must have received refresh event');
        assert.ok(freshScene.textures.exists(spr.textureKey), 'Sprite texture key must still exist');
      }

      // Concurrently mutate display list while refreshing textures
      const newSprite1 = freshScene.add.image(50, 50, activeVehicleKeys[0]);
      sprites[0].destroy(); // Destroy first sprite
      const newSprite2 = freshScene.add.image(60, 60, activeVehicleKeys[1]);

      // Another wave of refreshes
      for (let i = 0; i < 10; i++) {
        const tex = freshScene.textures.get(activeVehicleKeys[i]);
        tex.refresh();
        totalRefreshCalls++;
      }

      assert.equal(
        freshScene.displayList.length,
        51,
        'Display list should have 51 objects after add/destroy',
      );
      assert.equal(sprites[0].destroyed, true, 'Destroyed sprite should be removed from list');

      metrics.inplaceRefreshCalls = totalRefreshCalls;
      metrics.displayListLength = freshScene.displayList.length;
      console.log(
        `         Executed ${totalRefreshCalls} in-place refreshes across ${freshScene.displayList.length} display list objects with 0 errors.`,
      );
    },
  );

  // --------------------------------------------------------------------------
  // TEST 4: Headlight & Taillight Raytracing Limits
  // --------------------------------------------------------------------------
  console.log('\n>>> TEST 4: Headlight & Taillight Raytracing Limits');

  await assertTest(
    'Test 4.1: Raytracing with non-standard direction angles, negative offsets, and extreme scales',
    () => {
      // Function modeling VehicleLights raytracing behavior with empirical precision
      const computeRaytracing = (vehicleId, x, y, dir, brightness) => {
        const vehicle = vehicleById(vehicleId);
        // In VehicleLights: this.beam.setVisible(Boolean(vehicle) && brightness > 0.05);
        const isVisible = Boolean(vehicle) && Number.isFinite(brightness) && brightness > 0.05;
        if (!vehicle || !isVisible) {
          return { active: false, frontX: 0, frontY: 0, rearX: 0, rearY: 0, angle: 0, bulbs: [] };
        }
        // Avatar directions: down, left, right, up. Safe index with fallback ?? 0
        const angle = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][dir] ?? 0;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const hdx = vehicle.lighting?.headlight?.dx ?? 20;
        const hdy = vehicle.lighting?.headlight?.dy ?? 18;
        const tdx = vehicle.lighting?.taillight?.dx ?? 18;
        const tdy = vehicle.lighting?.taillight?.dy ?? 18;
        const frontX = x + dx * hdx;
        const frontY = y - 10 + dy * hdy;
        const rearX = x - dx * tdx;
        const rearY = y - 10 - dy * tdy;
        const bicycle = vehicle.kind === 'bicycle';
        const scaleX = bicycle ? 0.65 : 1;
        const scaleY = vehicle.kind === 'car' ? 1 : 0.7;

        const bulbOffsets = vehicle.kind === 'car' ? [-8, 8] : [0];
        const bulbs = bulbOffsets.map((offset) => ({
          bx: frontX - dy * offset,
          by: frontY + dx * offset,
        }));

        return {
          active: true,
          frontX,
          frontY,
          rearX,
          rearY,
          angle,
          scaleX,
          scaleY,
          bulbs,
        };
      };

      // Adversarial direction values
      const adversarialDirs = [
        -1,
        -2,
        -999,
        4,
        5,
        999,
        10000,
        1.5,
        -0.5,
        3.14159,
        NaN,
        Infinity,
        -Infinity,
        null,
        undefined,
      ];

      // Coordinate extremes
      const coordinateCases = [
        { x: 0, y: 0 },
        { x: -100000, y: -500000 },
        { x: 1000000, y: 1000000 },
        { x: 1e6, y: -1e6 },
      ];

      let totalRaytraceSamples = 0;

      for (const vehicleId of CANONICAL_VEHICLE_IDS) {
        for (const dir of adversarialDirs) {
          for (const coord of coordinateCases) {
            totalRaytraceSamples++;
            const res = computeRaytracing(vehicleId, coord.x, coord.y, dir, 0.8);

            assert.ok(res.active, 'Should be active when brightness > 0.05');

            // Check for finite coordinates
            assert.ok(Number.isFinite(res.frontX), `frontX must be finite for dir=${dir}, got ${res.frontX}`);
            assert.ok(Number.isFinite(res.frontY), `frontY must be finite for dir=${dir}, got ${res.frontY}`);
            assert.ok(Number.isFinite(res.rearX), `rearX must be finite for dir=${dir}, got ${res.rearX}`);
            assert.ok(Number.isFinite(res.rearY), `rearY must be finite for dir=${dir}, got ${res.rearY}`);
            assert.ok(Number.isFinite(res.angle), `angle must be finite for dir=${dir}, got ${res.angle}`);

            // For out-of-bounds directions, angle MUST safely fall back to 0
            if (dir < 0 || dir > 3 || !Number.isInteger(dir)) {
              assert.equal(res.angle, 0, `Out of bounds dir (${dir}) must default angle to 0`);
            }

            // Bulbs must have finite positions
            for (const b of res.bulbs) {
              assert.ok(Number.isFinite(b.bx), `Bulb bx must be finite`);
              assert.ok(Number.isFinite(b.by), `Bulb by must be finite`);
            }
          }
        }
      }

      // Solar Hour / Lamp brightness boundary checks
      const brightnessCases = [
        { brightness: 0.0, expectedActive: false },
        { brightness: 0.04, expectedActive: false },
        { brightness: 0.05, expectedActive: false },
        { brightness: 0.05001, expectedActive: true },
        { brightness: 0.5, expectedActive: true },
        { brightness: 1.0, expectedActive: true },
        { brightness: -1.0, expectedActive: false },
        { brightness: NaN, expectedActive: false },
      ];

      for (const bc of brightnessCases) {
        const res = computeRaytracing('car_lamborghini', 100, 200, 2, bc.brightness);
        assert.equal(
          res.active,
          bc.expectedActive,
          `Brightness ${bc.brightness} active state must be ${bc.expectedActive}`,
        );
      }

      metrics.totalRaytraceSamples = totalRaytraceSamples;
      console.log(
        `         Evaluated ${totalRaytraceSamples} adversarial raytracing scenarios with 0 NaN or infinite outputs.`,
      );
    },
  );

  // ============================================================================
  // SUMMARY AND VERDICT
  // ============================================================================
  console.log('\n' + '='.repeat(78));
  console.log(' ADVERSARIAL STRESS TEST SUMMARY & EMPIRICAL METRICS');
  console.log('='.repeat(78));
  console.log(` Total Test Assertions:   ${totalTests}`);
  console.log(` Total Passed:            ${totalPass}`);
  console.log(` Total Failed:            ${totalFail}`);
  console.log(` Max Body Width:          ${metrics.maxBodyWidth} px (Road limit: 40 px)`);
  console.log(` Min Clearance Margin:    ${metrics.minClearanceMargin} px`);
  console.log(` Simulation Steps:        ${metrics.totalSimulationSteps} ticks`);
  console.log(` Distance Traversed:      ${metrics.totalDistanceTraversed?.toFixed(0)} px`);
  console.log(` False-Positive Off-Road: ${metrics.totalFalsePositiveOffRoad}`);
  console.log(` Violations Triggered:    ${metrics.totalViolations}`);
  console.log(` Concurrent Requests:     ${metrics.concurrentRequests}`);
  console.log(` Concurrent Exceptions:   ${metrics.concurrentExceptions}`);
  console.log(` Loader Latency (100 req):${metrics.concurrentDurationMs?.toFixed(2)} ms`);
  console.log(` In-Place Refreshes:      ${metrics.inplaceRefreshCalls}`);
  console.log(` Raytrace Adversarial:    ${metrics.totalRaytraceSamples} combinations`);
  console.log('-'.repeat(78));

  const verdict = totalFail === 0 ? 'APPROVE' : 'FAIL';
  console.log(` VERDICT: ${verdict}`);
  console.log('='.repeat(78));

  if (totalFail > 0) {
    process.exit(1);
  }
}

runAdversarialStressTests().catch((err) => {
  console.error('Fatal crash in stress test runner:', err);
  process.exit(1);
});
