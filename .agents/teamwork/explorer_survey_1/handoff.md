# Handoff Report: Vehicle Data Layer, 16-Model Catalog & Compatibility Survey

**Date**: 2026-10-08  
**Agent**: `explorer_survey_1`  
**Working Directory**: `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_1`  
**Parent Orchestrator ID**: `cd331520-04d7-4f2f-a8b7-81e43bf66f35`  
**Handoff Type**: Hard (Data Layer Survey Complete)

---

## 1. Observation

1. **Current Game Data Definitions in `@cozy/game-data`**:
   - In `packages/game-data/src/vehicles.ts` (lines 3–96):
     - `VEHICLES` is exported as an untyped inline object `Record<string, { id: string; kind: 'car' | 'motorcycle' | 'bicycle'; name: string; brand: string; price: number; speed: number; color: string; description?: string }>` containing exactly **8 vehicle models**:
       - `bicycle_sky` ('Trek Marlin 7 Gen 3', Trek, price 200, speed 195, color '#0284c7')
       - `motorcycle_coral` ('Vespa Primavera 150', Vespa, price 700, speed 270, color '#f43f5e')
       - `motorcycle_ducati` ('Ducati Panigale V4 S', Ducati, price 2400, speed 310, color '#dc2626')
       - `car_mint` ('Mercedes-Benz G63 AMG', Mercedes-Benz, price 1800, speed 240, color '#1b4332')
       - `car_mercedes` ('Mercedes-AMG GT Coupe', Mercedes-Benz, price 2800, speed 285, color '#334155')
       - `car_sunset` ('Lamborghini Huracán Tecnica', Lamborghini, price 3200, speed 300, color '#ea580c')
       - `car_lamborghini` ('Lamborghini Aventador SVJ', Lamborghini, price 4500, speed 340, color '#eab308')
       - `car_porsche` ('Porsche 911 GT3 RS', Porsche, price 3600, speed 320, color '#0284c7')
     - Line 97–98: `export const vehicleById = (id: string | null | undefined) => id && Object.hasOwn(VEHICLES, id) ? VEHICLES[id] : undefined;`
     - Lines 101–106: `TOWN_ROADS` defines road bounds with width `40 px` (`{ x: 32, y: 332, w: 1472, h: 40 }`, `{ x: 332, y: 320, w: 40, h: 576 }`, `{ x: 96, y: 844, w: 1024, h: 40 }`).
     - Line 109: `export const SHOWROOM_FEATURED_VEHICLES = ['motorcycle_ducati', 'car_mercedes', 'car_lamborghini', 'car_mint'] as const;`
     - Line 136–137: `drivingSpeed(id, x, y, allowOffRoad = false) => allowOffRoad || onRoad(x, y) ? (vehicleById(id)?.speed ?? 150) : 90;`
     - Line 152: `TRAFFIC_FINES = { red_light: 80, off_road: 40 };`

2. **Catalog Mapping into Server Items and Database Seeding**:
   - In `packages/game-data/src/items.ts` (lines 334–345):
     - `...Object.values(VEHICLES).map((v) => ({ id: v.id, type: 'vehicle' as const, slot: 'vehicle' as const, name: v.name, description: ..., rarity: 'common' as const, coinPrice: v.price, sprite: v.id }))`
     - Automatically generates items in `ITEM_SEEDS`.
   - In `apps/api/src/migrate.ts` (lines 43–64):
     - `seedReferenceData(db)` executes `INSERT INTO item_definitions (...) VALUES (...) ON CONFLICT (id) DO UPDATE SET ...` for every entry in `ITEM_SEEDS`.
     - When `VEHICLES` is updated, running `pnpm migrate` or starting the API server upserts the vehicle entries into PostgreSQL.

3. **Active Usages of Legacy Vehicle IDs Across the Workspace**:
   - `car_sunset`:
     - `packages/game-data/src/vehicles.test.ts:33–37`: asserts `drivingSpeed('car_sunset', 500, 350) === 300` and `drivingSpeed('car_sunset', 500, 450) === 90`.
     - `apps/api/test/vehicles.test.ts:60`: tests concurrent purchase idempotency using `car_sunset`.
     - `apps/realtime/src/rooms/vehicles.test.ts:70,76`: tests mounting and dismounting `car_sunset`.
     - `apps/web/src/art/vehicle.ts:262`: `paintVehicleDealer` renders `vehicleCanvas('car_sunset', 1)`.
   - `car_mercedes`:
     - `packages/game-data/src/vehicles.test.ts:39`: asserts `vehicleById('car_mercedes')?.brand === 'Mercedes-Benz'`.
     - `apps/realtime/src/rooms/vehicles.test.ts:135`: tests server speed assertion `['car_mercedes', 285]`.
   - `car_mint`:
     - `apps/api/test/vehicles.test.ts:22,29,38,47,51`: primary test vehicle for purchase, equipment, and profile persistence.
     - `apps/realtime/src/rooms/vehicles.test.ts:54,71,118,162,182,194,222`: primary test vehicle in town and farm rooms.
     - `apps/web/src/art/vehicle.ts:261`: `paintVehicleDealer` renders `vehicleCanvas('car_mint')`.
   - `bicycle_sky`, `motorcycle_coral`, `motorcycle_ducati`, `car_lamborghini`, `car_porsche`:
     - Extensively tested across `vehicles.test.ts` in `@cozy/game-data`, `@cozy/api`, and `@cozy/realtime`.

4. **16 Target Vehicle Folders in `assets/vehicles/`**:
   - Directory scan confirmed 16 vehicle directories already exist, but are completely empty:
     - 1 Bicycle: `bicycles/trek-marlin-7`
     - 7 Motorcycles: `motorcycles/bmw-r1250-gs`, `motorcycles/ducati-panigale-v4`, `motorcycles/harley-davidson-fat-boy`, `motorcycles/honda-super-cub`, `motorcycles/kawasaki-ninja-h2`, `motorcycles/vespa-primavera-150`, `motorcycles/yamaha-yzf-r1`
     - 8 Cars: `cars/ferrari-f40`, `cars/ford-mustang`, `cars/lamborghini-aventador`, `cars/mercedes-benz-g63`, `cars/porsche-911`, `cars/rolls-royce-phantom`, `cars/tesla-model-s`, `cars/toyota-supra-mk4`
   - **10 models are currently missing** from `packages/game-data/src/vehicles.ts`:
     - Motorcycles (5 missing): `honda-super-cub`, `harley-davidson-fat-boy`, `kawasaki-ninja-h2`, `yamaha-yzf-r1`, `bmw-r1250-gs`.
     - Cars (5 missing): `toyota-supra-mk4`, `ferrari-f40`, `ford-mustang`, `rolls-royce-phantom`, `tesla-model-s`.

5. **Test & Codebase Verification Baseline**:
   - `pnpm --filter @cozy/game-data test`: 19 passed, 141 tests passed.
   - `pnpm --filter @cozy/web test`: 10 passed, 35 tests passed.
   - `pnpm --filter @cozy/realtime test -- src/rooms/vehicles.test.ts`: 1 passed, 13 tests passed.
   - `pnpm typecheck`: Passed with exit code 0 across all 8 TypeScript packages.
   - `pnpm lint`: Clean with 0 errors.

---

## 2. Logic Chain

1. **Catalog Deficit**:
   - From Observation 1, `VEHICLES` contains 8 records.
   - From Observation 4, the target requirements specify 16 models across 3 categories (1 bicycle, 7 motorcycles, 8 cars).
   - Therefore, exactly 10 new vehicle definitions must be added to the data catalog to reach the target 16 models.
2. **Backward Compatibility Guarantee**:
   - From Observation 3, `car_sunset` and `car_mercedes` are actively referenced by test assertions, profile appearances, and dealership canvas art.
   - If either ID is deleted or modified to produce an unexpected speed or brand, existing unit/integration tests in `game-data`, `api`, and `realtime` will fail.
   - Therefore, `car_sunset` and `car_mercedes` must remain valid keys in `VEHICLES` and `vehicleById()`. An alias mapping table (`VEHICLE_ALIASES`) must map `car_sunset` -> `cars/lamborghini-aventador` and `car_mercedes` -> `cars/mercedes-benz-g63` for assets, while maintaining their exact catalog speeds (300 px/s and 285 px/s).
3. **Database Migration Safety**:
   - From Observation 2, `ITEM_SEEDS` maps all entries in `VEHICLES` into item definitions, and `migrate.ts` automatically executes `ON CONFLICT (id) DO UPDATE`.
   - By retaining unique `id` values for all 16 canonical models plus the 2 compatibility models, no database constraints are violated and no custom manual SQL migration script is required; `pnpm migrate` or server launch will cleanly upsert all items.
4. **Strong Typing & Rigging Contract**:
   - Observation 1 shows that `VEHICLES` currently lacks schema typing for geometry, mounting coordinates, and light coordinates.
   - Exporting `VehicleDef`, `VehicleDimensions`, `VehicleMountingGeometry`, `VehicleLightingGeometry`, and `VehicleShowroomTheme` establishes a single source of truth across all packages, preventing desync between client rendering (`players.ts`, `vehicle-lights.ts`), showroom art (`showroom-art.ts`), and game physics.
5. **Geometry Conformance**:
   - Standard road width on `TOWN_ROADS` is 40 px. All 16 models must enforce `bodyWidth <= 40 px` to prevent false-positive `off_road` fines.
   - Wheel contact baseline at `y = 37 px` within the 48×40 frame aligns perfectly with the player container avatar ground level ($y = 0$).
   - Saddle pivot at `x = 24, y = 16..20` aligns with the cropped rider avatar ($y = -20$ px relative to container origin).

---

## 3. Caveats

1. **Asset Generation Prerequisite**: `assets/vehicles/` subdirectories are currently empty. The data layer can define all 16 vehicles and aliases, but the visual rendering and Playwright verification require the asset generation agents to populate `spritesheet.png` (192×160), `preview.png`, `icon.png`, and `meta.json`.
2. **Procedural Fallback Coverage**: The procedural canvas engine in `apps/web/src/art/vehicle.ts` must provide a generic procedural fallback for any of the 10 new vehicle IDs so that games do not crash or show blank sprites if assets are still loading.
3. **Unique IDs in `ITEM_SEEDS`**: `packages/game-data/src/game-data.test.ts` line 104 asserts that every item in `ITEM_SEEDS` has a unique ID. Any alias in `VEHICLES` must either have its own unique entry ID or aliases must be stored in a separate `VEHICLE_ALIASES` dictionary.

---

## 4. Conclusion

1. **Catalog Specification**:
   - 1 Bicycle: `bicycle_sky` (`bicycles/trek-marlin-7`), 195 px/s, 200 Coin.
   - 7 Motorcycles:
     - `motorcycle_coral` (`motorcycles/vespa-primavera-150`), 270 px/s, 700 Coin.
     - `motorcycle_ducati` (`motorcycles/ducati-panigale-v4`), 310 px/s, 2,400 Coin.
     - `motorcycle_honda_super_cub` (`motorcycles/honda-super-cub`), 220 px/s, 500 Coin.
     - `motorcycle_harley_fat_boy` (`motorcycles/harley-davidson-fat-boy`), 250 px/s, 1,600 Coin.
     - `motorcycle_kawasaki_ninja_h2` (`motorcycles/kawasaki-ninja-h2`), 330 px/s, 3,000 Coin.
     - `motorcycle_yamaha_r1` (`motorcycles/yamaha-yzf-r1`), 315 px/s, 2,600 Coin.
     - `motorcycle_bmw_r1250_gs` (`motorcycles/bmw-r1250-gs`), 260 px/s, 2,200 Coin.
   - 8 Cars:
     - `car_mint` (`cars/mercedes-benz-g63`), 240 px/s, 1,800 Coin.
     - `car_lamborghini` (`cars/lamborghini-aventador`), 340 px/s, 4,500 Coin.
     - `car_porsche` (`cars/porsche-911`), 320 px/s, 3,600 Coin.
     - `car_toyota_supra_mk4` (`cars/toyota-supra-mk4`), 290 px/s, 2,500 Coin.
     - `car_ferrari_f40` (`cars/ferrari-f40`), 335 px/s, 4,200 Coin.
     - `car_ford_mustang` (`cars/ford-mustang`), 275 px/s, 2,000 Coin.
     - `car_rolls_royce_phantom` (`cars/rolls-royce-phantom`), 250 px/s, 5,000 Coin.
     - `car_tesla_model_s` (`cars/tesla-model-s`), 325 px/s, 3,100 Coin.
   - Compatibility models preserved: `car_sunset` (300 px/s, 3,200 Coin) and `car_mercedes` (285 px/s, 2,800 Coin).
2. **Schema Enhancements**:
   - Export `VehicleDef`, `VehicleKind`, `VehicleDimensions`, `VehicleMountingGeometry`, `VehicleLightingGeometry`, and `VehicleShowroomTheme` from `packages/game-data/src/vehicles.ts`.
   - Export `VEHICLE_ALIASES` mapping all folder paths and legacy IDs to canonical records.
3. **Shop & Showroom UI Updates**:
   - Update `VehicleShopPanel.tsx` fallback count to `?? 16` models.
   - Maintain the 4 featured display plinths in `SHOWROOM_FEATURED_VEHICLES`.

---

## 5. Verification Method

1. **Game Data Suite**:
   ```powershell
   pnpm --filter @cozy/game-data test
   ```
   *Expected outcome*: Passes all test files, confirming unique item IDs in `ITEM_SEEDS`, correct traffic lights, and speeds.
2. **Web Suite**:
   ```powershell
   pnpm --filter @cozy/web test
   ```
   *Expected outcome*: Passes all test files, confirming showroom bounds, display plinths, and vehicle textures.
3. **Realtime Vehicle Suite**:
   ```powershell
   pnpm --filter @cozy/realtime test -- src/rooms/vehicles.test.ts
   ```
   *Expected outcome*: Passes all 13 tests, verifying mounting, speeds, red lights, and dismounting for legacy and canonical vehicles.
4. **Full Workspace Typecheck & Lint**:
   ```powershell
   pnpm typecheck
   pnpm lint
   ```
   *Expected outcome*: 0 TypeScript errors and 0 ESLint warnings.
5. **Invalidation Conditions**:
   - If `vehicleById('car_sunset')` returns `undefined` or a speed other than 300, invalidation triggers (breaks existing realtime and API tests).
   - If `vehicleById('car_mercedes')` returns `undefined` or a speed other than 285, invalidation triggers.
   - If any vehicle has `dimensions.bodyWidth > 40`, invalidation triggers (risks triggering `off_road` fines on 40 px streets).
