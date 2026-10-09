# Forensic Integrity Audit Report: Vehicle Asset Packs & Runtime System

## Forensic Audit Report

**Work Product**: Vehicle Asset Packs (`assets/vehicles/`, `apps/web/public/vehicles/`), Game Data (`packages/game-data/src/vehicles.ts`, `items.ts`), Runtime Pipeline (`apps/web/src/art/vehicle-loader.ts`, `vehicle.ts`, `players.ts`, `vehicle-lights.ts`), Showroom & Shop (`showroom-art.ts`, `showroom.test.ts`, `VehicleShopPanel.tsx`), and E2E Test Suite (`tests/e2e/vehicles/`)
**Profile**: General Project (Integrity Mode: `development` per `ORIGINAL_REQUEST.md` 2026-10-08T12:29:53Z)
**Verdict**: CLEAN

---

### Phase Results

- **Static Analysis (Hardcoded Test Results & Output Mocks)**: **PASS** — No hardcoded test passes, fake assertion mocks, or test-cheating string literals detected in implementation code.
- **Facade Detection**: **PASS** — `vehicleCanvas()` contains 521 lines of genuine procedural pixel-art rasterization routines covering all 16 vehicle models, 4 directions, and driving animation frames. No empty stubs, constant returns, or fake functions found.
- **Asset Integrity & Completeness**: **PASS** — All 16 vehicle asset packs across both `assets/vehicles/` and `apps/web/public/vehicles/` (128 files total) verified. Every `spritesheet.png` is 192x160 px with valid PNG IHDR chunks, distinct file sizes (1651–2359 bytes), and 16 distinct SHA-256 hashes. Previews (144x120 px) and icons (48x40 px) are 100% unique. All 16 `meta.json` files contain required specs with `contactY = 37`.
- **Mirroring Verification**: **PASS** — 100% bit-for-bit SHA-256 identity between `assets/vehicles/` (64 files) and `apps/web/public/vehicles/` (64 files).
- **Geometric & Anti-Tunneling Constraints**: **PASS** — All vehicle body widths <= 40 px, wheel contact baselines at y=37 px, 2-wheeler saddles at x=24, y=16..20. Fits within `TOWN_ROADS` 40 px corridors without triggering spurious off-road fines.
- **Dynamic Asset Loader & In-Place Refresh**: **PASS** — `vehicle-loader.ts` implements async `HTMLImageElement` loading, deduplication of in-flight promises, path-traversal sanitization, and seamless in-place `CanvasTexture` blitting with zero-downtime procedural canvas fallback.
- **Pre-populated Artifact Detection**: **PASS** — No pre-populated test output logs, fake attestation files, or pre-computed results exist in the codebase.
- **Runtime Test Execution**: **PASS** — All test suites executed directly and passed 100%:
  - `pnpm --filter @cozy/game-data test`: 19 files, 147 tests passed (including `vehicles.test.ts`).
  - `pnpm --filter @cozy/web test`: 10 files, 37 tests passed (including `showroom.test.ts`).
  - `pnpm tsx tests/e2e/vehicles/runner.ts`: 74 test cases (92 passed events) across 4 Tiers.
  - `node scripts/verify-vehicle-assets.mjs`: 128 files verified, 0 errors.
  - `python scripts/audit_vehicle_geometry.py`: 16/16 models geometrically compliant.
- **Workspace Typecheck**: **PASS** — `pnpm typecheck` passed with code 0 across all 8 workspace packages.

---

## 1. Observation

### Exact File Paths & Code Additions
1. **Catalog & Geometry Data** (`packages/game-data/src/vehicles.ts` lines 1–805):
   - Defines all 16 canonical vehicles + backward-compatibility aliases (`car_sunset` -> `cars/lamborghini-aventador`, `car_mercedes` -> `cars/mercedes-benz-g63`).
   - Dimension specifications (`bodyWidth <= 40`, `contactY: 37`, `seat: { x: 24, y: 16..20 }`).
   - Secure lookups via `Object.hasOwn` preventing prototype pollution (`__proto__`, `constructor`, `toString` return `undefined`).
2. **Item Seed Mapping** (`packages/game-data/src/items.ts` line 333):
   - Mapped all `VEHICLES` entries into `ITEM_SEEDS` with `type: 'vehicle'`.
3. **Procedural Fallback Canvas** (`apps/web/src/art/vehicle.ts` lines 1–521):
   - Handcrafted procedural rendering for each vehicle type:
     - Bicycle (`bicycle_sky` / Trek Marlin 7): Diamond frame, forks, saddle, pedals, reflectors.
     - Motorcycles (Vespa, Ducati Panigale V4 S, Honda Super Cub, Harley Fat Boy 114, Kawasaki Ninja H2, Yamaha YZF-R1, BMW R1250 GS): Custom fairings, golden Öhlins forks, exposed trellis frames, chrome shotgun exhausts, ivory leg shields, side luggage panniers.
     - Cars (Mercedes G63 AMG boxy SUV, Rolls-Royce Phantom VIII limousine with Pantheon grille, Ferrari F40 wedge with box wing & louvers, Tesla Model S with panoramic glass roof, Mustang GT500 power dome, Toyota Supra MK4 hoop spoiler, Porsche 911 swan-neck wing, Lamborghini Aventador SVJ ALA wing).
4. **Dynamic Texture Loader** (`apps/web/src/art/vehicle-loader.ts` lines 1–311):
   - Asynchronous Image loader with in-flight deduplication (`inFlightSpritesheets`).
   - Path-traversal protection (`trimmed.includes('..') || trimmed.includes('\\') || trimmed.startsWith('/')`).
   - Blits frame into canvas context (`sx = safeFrame * 48; sy = safeDir * 40; ctx.drawImage(...)`) and calls `texture.refresh()`.
5. **Avatar Mounting & Lighting** (`apps/web/src/game/players.ts` & `apps/web/src/game/vehicle-lights.ts`):
   - 2-wheelers: avatar cropped to `(0, 0, 32, 40)`, avatar Y positioned at `baseSpriteY - 4`, seat centered at x=24.
   - 4-wheelers: avatar hidden (`setVisible(!driving)`), vehicle container centered with ground shadow.
   - Headlight emitter positioned at `(x + dx * 20, y - 10 + dy * 18)` and taillights at `(x - dx * 18, y - 10 - dy * 18)`.
   - Motion animation frame calculation: `1 + (Math.floor(time / 140) % 3) : 0` (frames 1..3 moving, frame 0 idle).
6. **Showroom & Shop UI** (`apps/web/src/game/showroom-art.ts`, `VehicleShopPanel.tsx`, `apps/web/src/art/items.ts`):
   - Showroom pedestals defined at `136 × 66 px` with scale factor 2x and pixel-perfect nearest neighbor filtering (`setFilter(0)`).
   - Shop panel preview at `144 × 120 px` (3x integer scale) with 4-directional rotation button (`Xoay xe`).
7. **Asset File Verification** (`assets/vehicles/` and `apps/web/public/vehicles/`):
   - Total 128 files across 16 vehicle directories (64 files per tree).
   - Min size: 411 bytes (`meta.json`), Max size: 2359 bytes (`spritesheet.png`).
   - 16/16 unique spritesheet SHA-256 hashes.
   - 16/16 unique preview SHA-256 hashes.
   - 16/16 unique icon SHA-256 hashes.
   - 0 hash mismatches between canonical storage and web public mirror.

---

## 2. Logic Chain

1. **Premise 1 (Anti-Cheating & Facade Analysis)**: If code were cheating or using facades, we would find dummy stubs returning constant mock values, hardcoded test passes, or empty procedural drawing routines.
   - *Observation*: Static inspection of `apps/web/src/art/vehicle.ts` revealed 521 lines of authentic, highly granular pixel rasterization routines with distinct geometric calculations for all 16 vehicle models.
   - *Observation*: `vehicle-loader.ts` contains real browser Image loading, promise deduplication, and frame blitting into canvas textures.
   - *Deduction*: No facades or dummy implementations exist in the vehicle codebase.

2. **Premise 2 (Asset Authenticity & Mirroring)**: If assets were placeholders, they would have zero bytes, duplicate hashes across models, or corrupted PNG headers.
   - *Observation*: Empirical SHA-256 hash checks and IHDR chunk inspection confirmed that all 16 spritesheets are 192x160 px PNGs, with 16 distinct SHA-256 hashes and non-zero sizes (1.6 KB to 2.4 KB).
   - *Observation*: All 64 canonical asset files match their corresponding public mirror files bit-for-bit (0 mismatches out of 64).
   - *Deduction*: Asset packs are complete, authentic, and correctly mirrored.

3. **Premise 3 (Specification Adherence & Geometry)**: If vehicle models violated game constraints, body widths would exceed 40 px (violating road bounds and triggering off-road penalties), contact Y would deviate from 37, or mounting geometry would misalign avatar waist.
   - *Observation*: Execution of `scripts/audit_vehicle_geometry.py` and Node E2E Tier 1 & 2 tests confirmed bodyWidth <= 40 px, wheel contact max_y == 37 px, and saddle presence at x=24, y=16..20 across all models.
   - *Deduction*: Geometry strictly adheres to `ORIGINAL_REQUEST.md` (R2, R3) and `PROJECT.md`.

4. **Premise 4 (Runtime Verification)**: If the implementation were broken or non-functional, unit, integration, and E2E test suites would fail.
   - *Observation*: `pnpm --filter @cozy/game-data test` (147 tests), `pnpm --filter @cozy/web test` (37 tests), `pnpm tsx tests/e2e/vehicles/runner.ts` (92 passed events, 74 cases), and `node scripts/verify-vehicle-assets.mjs` all passed with exit code 0.
   - *Observation*: `pnpm typecheck` passed across all 8 workspace packages.
   - *Deduction*: Runtime execution is fully functional and regression-free.

---

## 3. Caveats

1. **Pre-existing Repository-Wide Lint Issue**:
   Running repository-wide `pnpm lint` failed with:
   `apps/web/src/art/farm-scenery.ts:5:50 error 'flowerBed' is defined but never used. Allowed unused vars must match /^_/u @typescript-eslint/no-unused-vars`
   This is an unused import in a legacy file from the prior farm milestone.
   All vehicle subsystem files (`packages/game-data/src/vehicles.ts`, `vehicles.test.ts`, `apps/web/src/art/vehicle-loader.ts`, `apps/web/src/art/vehicle.ts`, `apps/web/src/game/players.ts`, `apps/web/src/game/vehicle-lights.ts`, `apps/web/src/game/showroom-art.ts`, `apps/web/src/game/showroom.test.ts`, `apps/web/src/screens/panels/VehicleShopPanel.tsx`, `apps/web/src/art/items.ts`, `scripts/verify-vehicle-assets.mjs`) passed ESLint with **0 errors and 0 warnings**.
   Per auditor constraints, this auditor did NOT modify `farm-scenery.ts`.
2. **Browser Canvas Emulation in Node**:
   Node test environments lack a native HTML5 Canvas context. Tests use `test-environment.ts` virtual canvas mock for unit and headless testing; visual inspection scripts (`scripts/verify-vehicle-assets.mjs`, `scripts/audit_vehicle_geometry.py`) verify the actual binary PNG files directly.

---

## 4. Conclusion

The vehicle asset packs and runtime integration represent an **authentic, complete, and robust implementation**. No cheating, no facades, no hardcoded test shortcuts, and no placeholder assets were found. All geometric, lighting, procedural fallback, and async loading specifications are fully met.

**Forensic Verdict**: **CLEAN**

---

## 5. Verification Method

To independently reproduce the forensic verification results, run:

```bash
# 1. Verify 128 asset pack files across canonical and public mirror
node scripts/verify-vehicle-assets.mjs

# 2. Run Deep Pixel Geometry verification
python scripts/audit_vehicle_geometry.py

# 3. Verify SHA-256 mirror identity
node -e "const fs=require('fs'),path=require('path'),crypto=require('crypto');function walk(d){let r=[];for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())r=r.concat(walk(p));else r.push(p);}return r;}const src=walk('assets/vehicles');let diffs=0;for(const s of src){const rel=path.relative('assets/vehicles',s);const t=path.join('apps/web/public/vehicles',rel);if(!fs.existsSync(t)||crypto.createHash('sha256').update(fs.readFileSync(s)).digest('hex')!==crypto.createHash('sha256').update(fs.readFileSync(t)).digest('hex'))diffs++;}console.log('Mismatches:',diffs);"

# 4. Run Package Unit Test Suites
pnpm --filter @cozy/game-data test
pnpm --filter @cozy/web test

# 5. Run E2E Test Suite (74 tests across 4 Tiers)
pnpm tsx tests/e2e/vehicles/runner.ts

# 6. Verify Workspace Typecheck
pnpm typecheck

# 7. Verify Vehicle Files ESLint Cleanliness
pnpm eslint packages/game-data/src/vehicles.ts packages/game-data/src/vehicles.test.ts packages/game-data/src/items.ts apps/web/src/art/vehicle-loader.ts apps/web/src/art/vehicle.ts apps/web/src/game/players.ts apps/web/src/game/vehicle-lights.ts apps/web/src/game/showroom-art.ts apps/web/src/game/showroom.test.ts apps/web/src/screens/panels/VehicleShopPanel.tsx apps/web/src/art/items.ts scripts/verify-vehicle-assets.mjs
```

### Invalidation Conditions
- Any file in `assets/vehicles/` or `apps/web/public/vehicles/` is empty or modified to dimensions other than 192x160 px (spritesheet), 144x120 px (preview), or 48x40 px (icon).
- `vehicleCanvas()` is replaced with a constant or hardcoded stub.
- Any test in `packages/game-data/src/vehicles.test.ts`, `apps/web/src/game/showroom.test.ts`, or `tests/e2e/vehicles/` fails.
