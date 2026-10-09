# Handoff Report — reviewer_vehicles_1

## 1. Observation

### Codebase & Modified Files Inspected
1. `packages/game-data/src/vehicles.ts`:
   - Defines all 16 canonical vehicles in `CANONICAL_VEHICLE_IDS` (1 bicycle, 7 motorcycles, 8 cars) plus 2 legacy backward-compatibility vehicles (`car_sunset` at speed 300, price 3200 and `car_mercedes` at speed 285, price 2800).
   - All body widths adhere strictly to `bodyWidth <= 40` (bicycles 16px, motorcycles 18–22px, cars 36–38px) and `contactY = 37`.
   - `vehicleById(id)` lines 709–719 uses `Object.hasOwn(VEHICLES, id)` and `Object.hasOwn(VEHICLE_ALIASES, id)`, providing prototype pollution immunity (`__proto__`, `constructor`, `toString` safely return `undefined`).
   - `drivingSpeed(id, x, y, allowOffRoad)` lines 757–759 returns vehicle speed on road, or drops to 90 px/s when off-road.

2. `packages/game-data/src/items.ts`:
   - Lines 334–345: Maps all `VEHICLES` entries into `ITEM_SEEDS` with `type: 'vehicle'`, `slot: 'vehicle'`, `sprite: v.id`, and `coinPrice: v.price`.

3. `apps/web/src/art/vehicle-loader.ts`:
   - `resolveVehicleAssetPath` lines 45–81 implements strict path traversal sanitization:
     ```ts
     if (trimmed.includes('..') || trimmed.includes('\\') || trimmed.startsWith('/')) {
       return null;
     }
     ```
     and slug regex validation `/^[a-z0-9_-]+\/[a-z0-9_-]+$/i`.
   - `ensureVehicleTexture` lines 256–310 provides zero-downtime texture registration: creates immediate canvas fallback via `vehicleCanvas(id, dir, frame)`, triggers asynchronous PNG spritesheet fetch, and updates texture canvas in-place via `texture.refresh()`.

4. `apps/web/src/art/vehicle.ts`:
   - Implements full procedural pixel art for all vehicle classes across directions (0=Down, 1=Left, 2=Right, 3=Up).
   - Baseline contact at `y=37`, animated wheel spokes / pedal rotations on moving frames.

5. `apps/web/src/game/players.ts`:
   - Avatar mounting lines 795–854:
     - 2-wheelers: `sprite.setCrop(0, 0, 32, 40)`, `sprite.y = baseSpriteY + (def?.mounting?.avatarOffsetY ?? -4)`.
     - 4-wheelers: `sprite.setVisible(!driving)` hides the avatar cleanly inside the vehicle.
     - Drive animation loop line 816: `const frame = this.moving && !useUi.getState().reducedMotion ? 1 + (Math.floor(time / 140) % 3) : 0;` (cycles frames 1..3 during movement, frame 0 at idle).
     - Dust particles suppressed while driving line 839: `if (!driving) spawnFootstepDust(...)`.

6. `apps/web/src/game/vehicle-lights.ts`:
   - Headlight front emitter positioned at `x + dx * 20, y - 10 + dy * 18` and taillight at `x - dx * 18, y - 10 - dy * 18`.
   - Dual headlight offsets `[-8, 8]` for cars vs centered `[0]` for 2-wheelers.
   - Activates conditionally when solar lighting `lampBrightness > 0.05`.

7. `apps/web/src/game/showroom-art.ts` & `apps/web/src/screens/panels/VehicleShopPanel.tsx`:
   - Showroom interior features 4 featured pedestals (`136 × 66 px`, scale 2x) with nearest-neighbor crisp filtering (`texture.setFilter(0)`).
   - Shop panel provides 3x scale preview (`144 × 120 px`), 4-way rotation button ("Xoay xe"), and server-backed buy/equip mutations with idempotency keys.

8. Asset Pack Validation:
   - All 16 models present in both `assets/vehicles/` and `apps/web/public/vehicles/` with all 4 files: `spritesheet.png`, `preview.png`, `icon.png`, `meta.json` (128 files total).
   - Spritesheets are exact `192 × 160 px` PNGs with 4x4 frames of `48 × 40 px`.

### Test Execution Commands & Outputs
1. `pnpm --filter @cozy/game-data test`:
   - Result: 19 test files passed, 147 tests passed (duration 2.09s).
2. `pnpm --filter @cozy/web test`:
   - Result: 10 test files passed, 37 tests passed (duration 1.08s).
3. `pnpm --filter @cozy/realtime test -- src/rooms/vehicles.test.ts`:
   - Result: 1 test file passed, 13 tests passed (duration 666ms).
4. `pnpm tsx tests/e2e/vehicles/runner.ts`:
   - Result: 4 tiers passed, 92 tests passed (Tier 1: 27, Tier 2: 25, Tier 3: 17, Tier 4: 5).
5. `pnpm typecheck`:
   - Result: 8 of 8 workspace packages passed with 0 TypeScript errors.
6. `pnpm lint`:
   - Result: 0 ESLint errors.
7. `node scripts/verify-vehicle-assets.mjs` & `python scripts/audit_vehicle_geometry.py`:
   - Result: 16 of 16 models passed 100% geometric and file integrity checks.

---

## 2. Logic Chain

1. **Integrity Audit**:
   - Inspected source code for hardcoded test flags, facade bypasses, or shortcuts. All components contain genuine, operational logic: procedural canvas rasterization, real math for lighting geometry and collision bounding boxes, and authentic asset files.
   - Vitest test suites and the E2E test runner were run directly and executed genuine assertions against live modules.
   - Conclusion: **NO INTEGRITY VIOLATION DETECTED**.

2. **Backward Compatibility**:
   - `car_sunset` and `car_mercedes` were queried through `vehicleById`, `VEHICLES`, `VEHICLE_ALIASES`, and `drivingSpeed`.
   - `car_sunset`: speed 300 px/s, price 3200, Lamborghini brand.
   - `car_mercedes`: speed 285 px/s, price 2800, Mercedes-Benz brand.
   - Speed drops to 90 px/s off-road and returns full speed when `allowOffRoad` is true.
   - Conclusion: **BACKWARD COMPATIBILITY 100% PRESERVED**.

3. **Security (Path Traversal & Prototype Pollution)**:
   - `resolveVehicleAssetPath` rejects strings containing `..`, `\`, leading `/`, or non-slug characters.
   - `vehicleById` rejects `__proto__`, `constructor`, and `toString` without throwing or polluting prototypes via `Object.hasOwn`.
   - Server-side realtime tests verify that clients cannot spoof vehicles or speeds they do not own.
   - Conclusion: **SECURITY VERIFIED**.

4. **Geometric and Runtime Contracts**:
   - Bicycles and motorcycles correctly position avatar seat at `(24, 16..20)` and apply crop `(0, 0, 32, 40)`.
   - Cars hide avatar visibility while driving.
   - Contact Y is 37 across all models; body width is <= 40 px, fitting within the 40 px `TOWN_ROADS` without triggering accidental `off_road` fines.
   - Conclusion: **GEOMETRIC CONTRACTS SATISFIED**.

---

## 3. Caveats

- `pnpm format:check` reported 3 files with style issues (`apps/web/src/art/farm-detail.ts`, `apps/web/src/art/town-landscape.ts`, and `PROJECT.md`). None of these belong to vehicle runtime or asset pack code; per review-only constraints, no implementation files were altered.
- WebGL rendering in headless test environments uses canvas mocks; end-user visual rasterization on live browser displays was validated via asset geometry audits and Playwright-compatible headless canvas suites.

---

## 4. Conclusion

**Verdict**: **APPROVE**

The vehicle asset pack, dynamic loader pipeline, procedural fallback system, avatar mounting geometry, lighting raytracing coordinates, showroom pedestals, shop UI, and server-authoritative enforcement across all 16 vehicle models plus 2 legacy models meet all specifications without regression or integrity violations.

---

## 5. Verification Method

To independently reproduce and verify this review, execute the following commands in powershell from the project root:

```powershell
# 1. Unit & Data Layer Test Suites
pnpm --filter @cozy/game-data test
pnpm --filter @cozy/web test
pnpm --filter @cozy/realtime test -- src/rooms/vehicles.test.ts

# 2. E2E Opaque-Box Test Suite
pnpm tsx tests/e2e/vehicles/runner.ts

# 3. Static Analysis
pnpm typecheck
pnpm lint

# 4. Asset Integrity & Deep Pixel Geometry Audits
node scripts/verify-vehicle-assets.mjs
python scripts/audit_vehicle_geometry.py
```

### Invalidation Conditions
- Any test failure in the commands above.
- Body width of any vehicle exceeding 40 px (which would fail `audit_vehicle_geometry.py`).
- Alteration of `car_sunset` speed from 300 or `car_mercedes` speed from 285.
