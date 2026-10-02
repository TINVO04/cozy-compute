# M1 Worker Implementation Report: Cozy Farm System Foundation

**Author**: M1 Worker  
**Date**: 2026-10-02  
**Milestone**: M1 (Data Models, Database Migration & Map Layout Foundation)  
**Status**: COMPLETE (100% Quality Gate Passed)  

---

## 1. Scope of Work Completed

As tasked in the M1 assignment, the foundation for the Cozy Farm System has been implemented across database schemas, game data models, map boundaries, and unit tests:

1. **PostgreSQL Migration**: `apps/api/migrations/0005_cozy_farm_system.sql`
   - Schema for `farms`, `farm_plots`, `farm_animals`, `farm_warehouse_items`, and `farm_pond_fishes`.
   - Forward-compatibility update on `item_definitions_type_check` adding `'seed'`, `'crop'`, `'animal_product'`, and `'farm_supply'`.
   - Stored procedure `provision_farm_plots(target_farm_id uuid)` generating 36 discrete plots (0..35) with 4 starter plots (0..3) unlocked at 0 cost and tiered unlock pricing up to 7,500 coins.
   - Initial idempotent provisioning queries for existing users and farms (`ON CONFLICT DO NOTHING`).

2. **Game Data Schemas & Catalogs**: `packages/game-data/src/farm.ts`
   - Authoritative constants: `TOTAL_FARM_PLOTS = 36`, `STARTER_UNLOCKED_PLOT_INDICES = [0, 1, 2, 3]`, `SOIL_MOISTURE_DURATION_SEC = 1800` (30 min), `FERTILIZER_GROWTH_MULTIPLIER = 0.5` (-50% growth time), `FINGERLING_INITIAL_WEIGHT_KG = 0.10`.
   - Full 5-crop catalog (`CROPS`): Lúa Nàng Thơm (`crop_rice`), Bắp Ngô Ngọt (`crop_corn`), Dưa Hấu Long An (`crop_watermelon`), Cà Chua Bi (`crop_tomato`), Ớt Hiểm (`crop_chili`).
   - Full 6-livestock catalog (`ANIMALS`): Gà Ri (`chicken`), Vịt Xiêm (`duck`), Bò Sữa (`cow`), Heo Mọi (`pig`), Dê Bách Thảo (`goat`), Cừu Phan Rang (`sheep`).
   - Full 5-pond fish catalog (`POND_FISHES`): Cá Tra (`tra`), Cá Basa (`basa`), Cá Lóc (`loc`), Tôm Càng Xanh (`tom_cang`), Cá Bống Tượng (`bong_tuong`).
   - Silo warehouse storage: Base capacity 100 slots, max 500 slots, 8 upgrade tiers (+50 slots each), `getWarehouseTabForItem` smart mapping into 4 UI tabs (`crops`, `animal_products`, `seeds_stocks`, `supplies`).
   - Tiệm Bác Sáu: 21 authoritative store items covering seeds, livestock stock, aquaculture fingerlings, feed bags, bio-fertilizers, and tools.
   - 6 Daily Market Supply Contracts with +25% bonus coins and Fame rewards.
   - Pure server-authoritative simulation functions: `getCropGrowthStage()`, `isPlotMoist()`, `calculatePondFishWeight()`, `getPondFishStage()`, `getPlotState()`, `getPlotUnlockPrice()`.

3. **Re-export Protocol**: `packages/game-data/src/index.ts`
   - Cleanly re-exports `* from './farm.js'` for monorepo-wide zero-drift consumption.

4. **Map Layout & Western Town Portal**: `packages/game-data/src/map.ts`
   - Opened western town boundary wall: Split `t(0, 0, 1, MAP_ROWS)` into `t(0, 0, 1, 10)` (northern) and `t(0, 12, 1, MAP_ROWS - 12)` (southern), leaving rows 10–11 open.
   - Continuous paved path: Prepend `t(0, 10, 2, 2)` to `PATHS` connecting the central promenade to column 0.
   - Added `'farm_gate'` to `ZoneId` and registered interaction prompt zone `t(0, 10, 2, 2)` in `ZONES`.
   - Exported authoritative 48x32 Farm Map specifications: `FARM_COLS = 48`, `FARM_ROWS = 32`, `FARM_WIDTH`, `FARM_HEIGHT`, `FARM_SPAWN`, `FARM_GATE_EXIT`, `TOWN_FARM_PORTAL_SPAWN`, `FARM_ZONES` (9 POI zones), `FARM_POIS`, `FARM_BLOCKERS`, `getFarmPlotRect(index)`, and master `FARM_MAP` object.

5. **Exhaustive Unit Test Suite**: `packages/game-data/src/farm.test.ts`
   - 18 test cases thoroughly verifying crops, livestock, pond fish, plot geometries, silo tabs and upgrade tiers, shop inventory, contracts, pure simulation helpers, moisture decay, and farm map coordinates.

---

## 2. Verification Command Results

1. **Unit Test Suite**:
   ```bash
   pnpm --filter @cozy/game-data test
   ```
   **Result**: PASS (8/8 test files passed, 58/58 tests passed 100%, including `town-layout.test.ts` and `farm.test.ts`).

2. **Game-Data Package Typecheck**:
   ```bash
   pnpm --filter @cozy/game-data typecheck
   ```
   **Result**: PASS (0 errors, exit code 0).

3. **API Package Typecheck**:
   ```bash
   pnpm --filter @cozy/api typecheck
   ```
   **Result**: PASS (0 errors, exit code 0).

4. **Monorepo-Wide Linter**:
   ```bash
   pnpm lint
   ```
   **Result**: PASS (0 errors, 0 warnings across the entire repository).

5. **Downstream Package Compatibility**:
   - `pnpm --filter @cozy/realtime typecheck`: PASS (0 errors).
   - `pnpm --filter @cozy/web typecheck`: PASS (0 errors).
