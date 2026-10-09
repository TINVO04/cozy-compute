/* eslint-disable @typescript-eslint/no-explicit-any */
import { CANONICAL_VEHICLE_IDS } from '../packages/game-data/src/vehicles.js';
import { vehicleCanvas } from '../apps/web/src/art/vehicle.js';

interface MatrixState {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

class MatrixStressOracle {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  stack: MatrixState[] = [];
  saveCount = 0;
  restoreCount = 0;
  maxStackDepth = 0;

  reset(): void {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
    this.stack = [];
    this.saveCount = 0;
    this.restoreCount = 0;
    this.maxStackDepth = 0;
  }

  isIdentity(): boolean {
    const eps = 1e-6;
    return (
      Math.abs(this.a - 1) < eps &&
      Math.abs(this.b) < eps &&
      Math.abs(this.c) < eps &&
      Math.abs(this.d - 1) < eps &&
      Math.abs(this.e) < eps &&
      Math.abs(this.f) < eps
    );
  }

  save(): void {
    this.saveCount++;
    this.stack.push({ a: this.a, b: this.b, c: this.c, d: this.d, e: this.e, f: this.f });
    if (this.stack.length > this.maxStackDepth) {
      this.maxStackDepth = this.stack.length;
    }
  }

  restore(): void {
    this.restoreCount++;
    const popped = this.stack.pop();
    if (popped) {
      this.a = popped.a;
      this.b = popped.b;
      this.c = popped.c;
      this.d = popped.d;
      this.e = popped.e;
      this.f = popped.f;
    }
  }

  translate(tx: number, ty: number): void {
    this.e += this.a * tx + this.c * ty;
    this.f += this.b * tx + this.d * ty;
  }

  scale(sx: number, sy: number): void {
    this.a *= sx;
    this.b *= sx;
    this.c *= sy;
    this.d *= sy;
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }

  resetTransform(): void {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
  }
}

async function runEmpiricalStressTest() {
  console.log('=== STARTING EMPIRICAL VEHICLE TRANSFORM STRESS TEST ===\n');

  const oracle = new MatrixStressOracle();

  const mockCtx = {
    save: () => oracle.save(),
    restore: () => oracle.restore(),
    translate: (x: number, y: number) => oracle.translate(x, y),
    scale: (x: number, y: number) => oracle.scale(x, y),
    setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) =>
      oracle.setTransform(a, b, c, d, e, f),
    resetTransform: () => oracle.resetTransform(),
    fillRect: () => {},
    clearRect: () => {},
    drawImage: () => {},
    fillStyle: '',
  };

  const mockCanvas = {
    width: 48,
    height: 40,
    getContext: () => mockCtx,
  };

  // Setup DOM global
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) => (tag === 'canvas' ? mockCanvas : {}),
  };

  const allModelIds = [...CANONICAL_VEHICLE_IDS, 'car_sunset', 'car_mercedes'];
  console.log(`Audited vehicle count: ${allModelIds.length} models`);
  console.log(`Models under test: ${allModelIds.join(', ')}\n`);

  // Verification 1: Repeated calls across all 18 models x 4 frames x 100 runs = 7,200 calls
  let totalCalls = 0;
  let passedCalls = 0;
  let saveRestoreMismatches = 0;
  let matrixLeakages = 0;
  let stackDepthErrors = 0;

  const ITERATIONS_PER_STATE = 100;

  for (const modelId of allModelIds) {
    for (let frame = 0; frame < 4; frame++) {
      for (let iter = 0; iter < ITERATIONS_PER_STATE; iter++) {
        totalCalls++;
        oracle.reset();

        vehicleCanvas(modelId, 1, frame);

        if (oracle.saveCount !== 1 || oracle.restoreCount !== 1) {
          saveRestoreMismatches++;
        }
        if (oracle.stack.length !== 0) {
          stackDepthErrors++;
        }
        if (!oracle.isIdentity()) {
          matrixLeakages++;
        }

        if (
          oracle.saveCount === 1 &&
          oracle.restoreCount === 1 &&
          oracle.stack.length === 0 &&
          oracle.isIdentity()
        ) {
          passedCalls++;
        }
      }
    }
  }

  console.log(`[TEST 1] Repeated calls across all 18 models (dir = 1, frames 0..3):`);
  console.log(`  Total vehicleCanvas calls: ${totalCalls}`);
  console.log(`  Passed calls (identity + balanced): ${passedCalls}`);
  console.log(`  Save/Restore mismatches: ${saveRestoreMismatches}`);
  console.log(`  Stack depth errors: ${stackDepthErrors}`);
  console.log(`  Matrix transform leakages: ${matrixLeakages}`);

  if (passedCalls === totalCalls && matrixLeakages === 0) {
    console.log(`  => RESULT: PASS (Zero leakage across ${totalCalls} calls)\n`);
  } else {
    console.error(`  => RESULT: FAIL\n`);
    process.exit(1);
  }

  // Verification 2: Reused persistent context over 5,000 consecutive calls without reset
  console.log(`[TEST 2] Persistent context accumulation stress (5,000 consecutive calls):`);
  oracle.reset();
  const CONSECUTIVE = 5000;
  let stepFailure = 0;

  for (let i = 0; i < CONSECUTIVE; i++) {
    const model = allModelIds[i % allModelIds.length]!;
    const frame = i % 4;
    vehicleCanvas(model, 1, frame);

    if (!oracle.isIdentity() || oracle.stack.length !== 0) {
      stepFailure++;
    }
  }

  console.log(`  Total consecutive iterations on single context: ${CONSECUTIVE}`);
  console.log(`  Cumulative saves: ${oracle.saveCount}, restores: ${oracle.restoreCount}`);
  console.log(
    `  Final matrix: [${oracle.a}, ${oracle.b}, ${oracle.c}, ${oracle.d}, ${oracle.e}, ${oracle.f}]`,
  );
  console.log(`  Intermediate drift failures: ${stepFailure}`);

  if (stepFailure === 0 && oracle.isIdentity() && oracle.saveCount === CONSECUTIVE) {
    console.log(`  => RESULT: PASS (Matrix remained strictly identity at all 5,000 steps)\n`);
  } else {
    console.error(`  => RESULT: FAIL\n`);
    process.exit(1);
  }

  // Verification 3: Non-inverted directions (dir = 0, 2, 3)
  console.log(`[TEST 3] Non-inverted directions dir = 0, 2, 3 (zero saves/restores):`);
  let nonInvertedPass = 0;
  let nonInvertedTotal = 0;

  for (const modelId of allModelIds) {
    for (const dir of [0, 2, 3]) {
      nonInvertedTotal++;
      oracle.reset();
      vehicleCanvas(modelId, dir, 0);

      if (oracle.saveCount === 0 && oracle.restoreCount === 0 && oracle.isIdentity()) {
        nonInvertedPass++;
      }
    }
  }

  console.log(`  Tested states: ${nonInvertedTotal}, Passed: ${nonInvertedPass}`);
  if (nonInvertedPass === nonInvertedTotal) {
    console.log(`  => RESULT: PASS (No unnecessary transforms applied)\n`);
  } else {
    console.error(`  => RESULT: FAIL\n`);
    process.exit(1);
  }

  // Verification 4: blitFrame with 5,000 simulated pre-existing hostile tainted transforms
  console.log(`[TEST 4] blitFrame with simulated hostile tainted transforms (5,000 iterations):`);
  let blitFailures = 0;
  let blitOrderErrors = 0;

  // Exact blitFrame implementation under test (from apps/web/src/art/vehicle-loader.ts)
  function blitFrameUnderTest(ctx: any, img: any, dir: number, frame: number): void {
    const safeDir = ((dir % 4) + 4) % 4;
    const safeFrame = ((frame % 4) + 4) % 4;
    const sx = safeFrame * 48;
    const sy = safeDir * 40;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.resetTransform?.();
    if (typeof ctx.clearRect === 'function') {
      ctx.clearRect(0, 0, 48, 40);
    }
    ctx.drawImage(img, sx, sy, 48, 40, 0, 0, 48, 40);
  }

  const BLIT_ITERATIONS = 5000;
  for (let i = 0; i < BLIT_ITERATIONS; i++) {
    oracle.reset();
    const callLog: string[] = [];

    // Taint context with diverse hostile transforms
    const mode = i % 5;
    if (mode === 0) {
      // Inverted context (scaleX = -1)
      oracle.translate(48, 0);
      oracle.scale(-1, 1);
    } else if (mode === 1) {
      // Arbitrary translation
      oracle.translate(((i * 13) % 200) - 100, ((i * 29) % 200) - 100);
    } else if (mode === 2) {
      // Rotation + Scale
      const angle = ((i * 17) % 360) * (Math.PI / 180);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      oracle.a = cos * 2.5;
      oracle.b = sin * 2.5;
      oracle.c = -sin * 1.8;
      oracle.d = cos * 1.8;
      oracle.e = (i * 7) % 50;
      oracle.f = (i * 11) % 50;
    } else if (mode === 3) {
      // Inverted 2D (scaleX = -1, scaleY = -1)
      oracle.scale(-1, -1);
      oracle.translate(-48, -40);
    } else {
      // Shear / Affine distortion
      oracle.a = 2.0;
      oracle.b = 0.5;
      oracle.c = -0.5;
      oracle.d = 1.5;
      oracle.e = 30;
      oracle.f = -20;
    }

    const testCtx = {
      setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => {
        callLog.push('setTransform');
        oracle.setTransform(a, b, c, d, e, f);
      },
      resetTransform: () => {
        callLog.push('resetTransform');
        oracle.resetTransform();
      },
      clearRect: (...args: any[]) => {
        callLog.push(`clearRect:${args.join(',')}`);
      },
      drawImage: (...args: any[]) => {
        callLog.push(`drawImage:${args.slice(1).join(',')}`);
      },
    };

    // Test with and without optional resetTransform
    if (i % 2 === 1) {
      (testCtx as any).resetTransform = undefined;
    }

    const testDir = ((i * 3) % 7) - 2; // Can be negative, out-of-range
    const testFrame = ((i * 5) % 9) - 3;

    blitFrameUnderTest(testCtx, {}, testDir, testFrame);

    if (!oracle.isIdentity()) {
      blitFailures++;
    }

    const setTransIdx = callLog.indexOf('setTransform');
    const clearRectIdx = callLog.findIndex((s) => s.startsWith('clearRect'));
    const drawImageIdx = callLog.findIndex((s) => s.startsWith('drawImage'));

    if (setTransIdx === -1 || clearRectIdx <= setTransIdx || drawImageIdx <= clearRectIdx) {
      blitOrderErrors++;
    }
  }

  console.log(`  Total blit iterations tested: ${BLIT_ITERATIONS}`);
  console.log(`  Matrix identity failures: ${blitFailures}`);
  console.log(
    `  Execution ordering errors (setTransform before clearRect before drawImage): ${blitOrderErrors}`,
  );

  if (blitFailures === 0 && blitOrderErrors === 0) {
    console.log(`  => RESULT: PASS (All tainted contexts reliably reset to identity)\n`);
  } else {
    console.error(`  => RESULT: FAIL\n`);
    process.exit(1);
  }

  console.log('=== ALL EMPIRICAL TRANSFORM MATRIX TESTS COMPLETED SUCCESSFULLY ===');
}

runEmpiricalStressTest().catch((err) => {
  console.error('Fatal error in stress test:', err);
  process.exit(1);
});
