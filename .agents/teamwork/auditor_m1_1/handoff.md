# Forensic Audit Report: Milestone M1 (Transform Matrix Isolation & Left Drive Orientation)

## Forensic Audit Report

**Work Product**: Milestone M1 Changes
- `apps/web/src/art/vehicle.ts`
- `apps/web/src/art/vehicle-loader.ts`
- `apps/web/src/art/vehicle-loader.challenge.test.ts`
- `apps/web/src/game/vehicles.challenge.test.ts`

**Profile**: General Project (Development Mode per `ORIGINAL_REQUEST.md` ## 2026-10-08T14:57:19Z)
**Verdict**: CLEAN

---

### Phase Results
- **Hardcoded test results check**: PASS — No hardcoded test assertions, dummy outputs, or cheating return values found.
- **Facade implementation check**: PASS — All functions implement genuine logic, full canvas rendering, asset caching, in-flight coalescing, and bounds clamping.
- **Pre-populated artifact detection**: PASS — No fabricated test logs or fake verification outputs exist.
- **Genuine Matrix Isolation (`vehicle.ts`)**: PASS — `ctx.save()` / `ctx.restore()` strictly wrap horizontal transformation (`dir === 1`) for both 2-wheelers and 4-wheelers.
- **Genuine Matrix Reset (`vehicle-loader.ts`)**: PASS — `blitFrame` calls `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` prior to `clearRect` and `drawImage`.
- **Behavioral Test Execution**: PASS — 35/35 challenge tests, 72/72 `@cozy/web` tests, 157/157 `@cozy/game-data` tests, and 74/74 vehicle e2e tests passed.
- **Typecheck & Linting Quality Gate**: PASS — TypeScript 0 errors, ESLint 0 errors, Prettier 100% compliant.

---

## 1. Observation

### Source Code Observations
1. **`apps/web/src/art/vehicle.ts`**:
   - Lines 48-52 (2-wheelers):
     ```ts
     if (dir === 1) {
       ctx.save();
       ctx.translate(48, 0);
       ctx.scale(-1, 1);
     }
     ```
   - Lines 206-208 (2-wheelers):
     ```ts
     if (dir === 1) {
       ctx.restore();
     }
     ```
   - Lines 283-287 (4-wheelers):
     ```ts
     if (dir === 1) {
       ctx.save();
       ctx.translate(48, 0);
       ctx.scale(-1, 1);
     }
     ```
   - Lines 431-433 (4-wheelers):
     ```ts
     if (dir === 1) {
       ctx.restore();
     }
     ```
   - Only 3 return statements exist in the entire file (lines 265, 494, 527), none of which are inside the horizontal drawing blocks. `save()` and `restore()` are strictly balanced 1:1.

2. **`apps/web/src/art/vehicle-loader.ts`**:
   - Lines 230-246 (`blitFrame`):
     ```ts
     function blitFrame(
       ctx: CanvasRenderingContext2D,
       img: HTMLImageElement | CanvasImageSource,
       dir: number,
       frame: number,
     ): void {
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
     ```
   - Lines 258-312 (`ensureVehicleTexture`): Implements synchronous procedural fallback with zero downtime, in-memory cache check (`spritesheetCache`), deduplicated in-flight async image loading, and in-place `blitFrame` + `texture.refresh()`.

3. **`apps/web/src/art/vehicle-loader.challenge.test.ts`**:
   - 14 tests verifying security sanitization against path traversal (`../evil`, `../../etc/passwd`, `..\windows\system32`), in-flight coalescing of 50 concurrent requests, failure cleanup and retry resilience, cache invalidation on `clearVehicleAssetCache`, and call order verification: `setTransform` occurs before `clearRect` and `drawImage`.

4. **`apps/web/src/game/vehicles.challenge.test.ts`**:
   - 21 tests verifying rapid mount/unmount at top speed, headlights adaptation and rotation, reduced motion accessibility freeze to frame 0, 288 procedural rendering permutations across all 18 models (16 canonical + 2 aliases), contact baseline $y = 37$, body width $\le 40$, 2-wheeler saddle center $x = 24, y = 16..20$, and strict transform isolation testing (Section 6: `save`/`restore` balanced across all 18 models at `dir = 1`, and absent on `dir = 0, 2, 3`).

### Empirical Verification Commands & Tool Outputs
- **Challenge Vitest Execution**:
  ```powershell
  pnpm --filter @cozy/web test run src/art/vehicle-loader.challenge.test.ts src/game/vehicles.challenge.test.ts
  ```
  Result: `Test Files 2 passed (2)`, `Tests 35 passed (35)`, duration 1.20s. Exit code: 0.

- **TypeScript Typecheck**:
  ```powershell
  pnpm --filter @cozy/web typecheck
  ```
  Result: `tsc -p tsconfig.json` exited with code 0 (0 errors).

- **ESLint & Prettier**:
  ```powershell
  pnpm exec eslint apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts
  pnpm exec prettier --check apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts
  ```
  Result: 0 errors, 0 warnings; all files formatted.

- **Package Test Suites**:
  ```powershell
  pnpm --filter @cozy/web test
  pnpm --filter @cozy/game-data test
  ```
  Result: 72/72 tests passed in `@cozy/web`, 157/157 tests passed in `@cozy/game-data`. Exit code: 0.

- **Vehicle E2E Suite**:
  ```powershell
  pnpm exec tsx --test tests/e2e/vehicles/tier1-features.test.ts tests/e2e/vehicles/tier2-boundaries.test.ts tests/e2e/vehicles/tier3-combinations.test.ts tests/e2e/vehicles/tier4-scenarios.test.ts
  ```
  Result: 74/74 tests passed. Exit code: 0.

- **Automated Geometry & Asset Audits**:
  ```powershell
  python scripts/audit_vehicle_geometry.py
  node scripts/verify-vehicle-assets.mjs
  ```
  Result: All 16 models 100% compliant with geometric criteria ($192 \times 160$, width $\le 40$, contact $y = 37$, saddle $x = 24, y = 16..20$); 128/128 files verified across canonical storage and public mirror.

---

## 2. Logic Chain

1. **Matrix Isolation in `vehicle.ts`**:
   - Direct observation shows `ctx.save()` called prior to `ctx.translate(48, 0); ctx.scale(-1, 1);` and `ctx.restore()` called after drawing for `dir === 1`.
   - Inspection of control flow confirms no early exits or unhandled exceptions inside the transformed block.
   - Therefore, the canvas rendering context is cleanly restored to the identity matrix upon function return.

2. **Prevention of Double Inversion in `vehicle-loader.ts`**:
   - In `blitFrame()`, `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` explicitly enforce an identity transform matrix on the canvas before any pixel blitting occurs.
   - When spritesheet Row 1 (`sy = 40`), which is already drawn facing left, is copied via `ctx.drawImage()`, it is drawn without horizontal flipping.
   - This eliminates the double-inversion bug $(-1 \times -1 = 1)$ where left-driving vehicles previously faced right.

3. **Authenticity of Challenge Tests**:
   - The challenge tests in `vehicle-loader.challenge.test.ts` and `vehicles.challenge.test.ts` test real invariants against actual code paths (path sanitization, in-flight caching, avatar cropping, headlight beam rotation, call order, matrix balancing).
   - Canvas mocking uses standard spy wrappers on 2D context methods (`save`, `restore`, `setTransform`, `drawImage`, `fillRect`) to assert exact execution order and parameter passing without short-circuiting application logic.
   - All tests execute and pass without dummy assertions or hardcoded mocks.

---

## 3. Caveats

- In `pnpm test` (root suite), `apps/realtime/src/rooms/town-life.test.ts` exhibited two unrelated pre-existing failures regarding vendor and cat actor synchronization. These are in `apps/realtime`, completely outside the M1 scope (`apps/web`), and were unmodified by Milestone M1. All vehicle tests across `@cozy/web`, `@cozy/game-data`, `@cozy/realtime` (`src/rooms/vehicles.test.ts`), and `tests/e2e/vehicles/` passed 100%.

---

## 4. Conclusion

The code modifications for Milestone M1 satisfy all integrity, architectural, and quality standards:
- Real, genuine implementation of `ctx.save()` / `ctx.restore()` in `apps/web/src/art/vehicle.ts`.
- Real, genuine implementation of `ctx.setTransform(1, 0, 0, 1, 0, 0)` in `apps/web/src/art/vehicle-loader.ts`.
- No dummy implementations, facades, hardcoded results, or cheating test mocks.
- Complete test suite and quality gate verification passed.

**Binary Verdict**: **CLEAN**

---

## 5. Verification Method

To independently reproduce this forensic verification:

```powershell
# 1. Run target challenge tests
pnpm --filter @cozy/web test run src/art/vehicle-loader.challenge.test.ts src/game/vehicles.challenge.test.ts

# 2. Run TypeScript typecheck
pnpm --filter @cozy/web typecheck

# 3. Run ESLint and Prettier
pnpm exec eslint apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts
pnpm exec prettier --check apps/web/src/art/vehicle.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle-loader.challenge.test.ts apps/web/src/game/vehicles.challenge.test.ts

# 4. Run vehicle e2e suites
pnpm exec tsx --test tests/e2e/vehicles/tier1-features.test.ts tests/e2e/vehicles/tier2-boundaries.test.ts tests/e2e/vehicles/tier3-combinations.test.ts tests/e2e/vehicles/tier4-scenarios.test.ts

# 5. Run asset and geometry audit scripts
python scripts/audit_vehicle_geometry.py
node scripts/verify-vehicle-assets.mjs
```

### Invalidation Conditions
- Any removal of `ctx.save()` or `ctx.restore()` around `dir === 1` in `apps/web/src/art/vehicle.ts`.
- Any removal of `ctx.setTransform(1, 0, 0, 1, 0, 0)` in `blitFrame` in `apps/web/src/art/vehicle-loader.ts`.
- Any test failure in `apps/web/src/art/vehicle-loader.challenge.test.ts` or `apps/web/src/game/vehicles.challenge.test.ts`.
