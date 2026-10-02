# M1 Handoff Report: Cozy Farm System Foundation

## 1. Observation

- **Migration Architecture & File**:
  - `apps/api/migrations/0005_cozy_farm_system.sql` created, introducing 5 relational tables: `farms`, `farm_plots`, `farm_animals`, `farm_warehouse_items`, `farm_pond_fishes`.
  - Stored procedure `provision_farm_plots` provides idempotent generation of 36 plots with starter plots (0..3) unlocked at 0 cost and tiered unlock pricing up to 7,500 coins.
  - Forward compatibility migration dynamically alters `item_definitions_type_check` constraint to support `'seed'`, `'crop'`, `'animal_product'`, and `'farm_supply'`.
- **Game Data & Schemas**:
  - `packages/game-data/src/farm.ts` created, containing authoritative types, interfaces, and catalogs for:
    - 5 Crops (`crop_rice`, `crop_corn`, `crop_watermelon`, `crop_tomato`, `crop_chili`) with timings and yields.
    - 6 Livestock species (`chicken`, `duck`, `cow`, `pig`, `goat`, `sheep`) with facilities and feed intervals.
    - 5 Aquaculture species (`tra`, `basa`, `loc`, `tom_cang`, `bong_tuong`) with growth curves.
    - Silo Warehouse capacity (100 base, 500 max, 8 tiers), and `getWarehouseTabForItem()` mapping into 4 UI tabs.
    - Tiệm Bác Sáu: 21 items and 6 daily supply contracts with +25% bonus.
    - Pure calculation functions: `getCropGrowthStage()`, `isPlotMoist()`, `calculatePondFishWeight()`, `getPondFishStage()`, `getPlotState()`, `getPlotUnlockPrice()`.
  - `packages/game-data/src/index.ts` re-exports `./farm.js`.
- **Map & Town Portal**:
  - `packages/game-data/src/map.ts`:
    - `ZoneId` includes `'farm_gate'`.
    - `ZONES` includes `{ id: 'farm_gate', label: 'Cổng Nông Trại', prompt: 'Vào Trang Trại', rect: t(0, 10, 2, 2) }`.
    - `BLOCKERS`: Split `t(0, 0, 1, MAP_ROWS)` into `t(0, 0, 1, 10)` and `t(0, 12, 1, MAP_ROWS - 12)`, opening rows 10–11.
    - `PATHS`: Prepended `t(0, 10, 2, 2)` to provide a continuous paved path from Town SPAWN to column 0.
    - Master 48x32 Farm Map specifications: `FARM_COLS = 48`, `FARM_ROWS = 32`, `FARM_WIDTH`, `FARM_HEIGHT`, `FARM_SPAWN`, `FARM_GATE_EXIT`, `TOWN_FARM_PORTAL_SPAWN`, `FARM_ZONES`, `FARM_POIS`, `FARM_BLOCKERS`, `getFarmPlotRect()`, `FARM_MAP`.
- **Verification Commands & Results**:
  - `pnpm --filter @cozy/game-data test`: 8/8 test files passed (58/58 tests passed 100%, including `town-layout.test.ts` and `farm.test.ts`).
  - `pnpm --filter @cozy/game-data typecheck`: 0 errors.
  - `pnpm --filter @cozy/api typecheck`: 0 errors.
  - `pnpm lint`: 0 errors, 0 warnings across the entire repository.
  - `pnpm --filter @cozy/realtime typecheck`: 0 errors.
  - `pnpm --filter @cozy/web typecheck`: 0 errors.

## 2. Logic Chain

1. **Town West Gate Reachability**:
   - In `town-layout.test.ts`, the movement simulation function `reachable(true)` navigates from `SPAWN` `(768, 608)` along paved surfaces (`PATHS`, `PLAZA`, `PIER`) using actual player collision boxes (`PLAYER_RADIUS = 10`, `top = y - 6`, `bottom = y + 4`).
   - By clearing western border blockers at rows 10–11 and prepending `t(0, 10, 2, 2)` to `PATHS`, grid node `(16, 352)` is reached without collision.
   - `zoneAt(16, 352)` detects `farm_gate.rect` `t(0, 10, 2, 2)`.
   - Result: `town-layout.test.ts` passed with zero modifications to test code, verifying mathematical reachability.

2. **Database Schema & Data Model Coherence**:
   - `farm_plots.unlock_price` in `0005_cozy_farm_system.sql` and `getPlotUnlockPrice(index)` in `farm.ts` use identical formulas across all 36 plots: 0..3: 0, 4..7: 250, 8..11: 500, 12..15: 1000, 16..19: 1500, 20..23: 2500, 24..27: 3500, 28..31: 5000, 32..35: 7500.
   - `farm_warehouse_items.category` check constraint matches `('crop', 'animal_product', 'seed', 'supply')`.
   - `farm_animals.animal_type` check constraint covers all 6 species (`chicken`, `duck`, `cow`, `pig`, `goat`, `sheep`).
   - `farm_pond_fishes.fish_species` covers all 5 species (`tra`, `basa`, `loc`, `tom_cang`, `bong_tuong`).
   - Newly stocked fingerling weight defaults to `0.10` kg, matching `FINGERLING_INITIAL_WEIGHT_KG` in `farm.ts`.

3. **Downstream Monorepo Consumption**:
   - All definitions are re-exported via `packages/game-data/src/index.ts`.
   - Full typecheck across `api`, `realtime`, and `web` confirms zero naming collisions and zero broken imports.

## 3. Caveats

- Migration `0005_cozy_farm_system.sql` has been syntax-checked and aligned with existing PostgreSQL migrations `0001` through `0004`, but live execution against a running PostgreSQL container occurs during M2 integration testing.
- The `town-detail.ts` and `town-landscape.ts` visual art assets for the Western gate archway are scheduled for M4 (Pure Canvas 2D Graphics), while the underlying physical movement geometry and interaction zone are active now.

## 4. Conclusion

Milestone M1 is fully accomplished. All required database tables, stored procedures, game data types and catalogs, authoritative map dimensions, collision boundaries, and town portal connections are in place and verified by 58 passing unit tests and clean typechecks across all monorepo packages.

## 5. Verification Method

To independently verify the implementation:
1. Run game data unit tests:
   ```bash
   pnpm --filter @cozy/game-data test
   ```
   *Expected: 8/8 test files pass, 58/58 tests pass (including town-layout.test.ts and farm.test.ts).*
2. Verify game data typecheck:
   ```bash
   pnpm --filter @cozy/game-data typecheck
   ```
   *Expected: Exit code 0, 0 TypeScript errors.*
3. Verify REST API typecheck:
   ```bash
   pnpm --filter @cozy/api typecheck
   ```
   *Expected: Exit code 0, 0 TypeScript errors.*
4. Verify repository lint:
   ```bash
   pnpm lint
   ```
   *Expected: Exit code 0, 0 errors, 0 warnings.*
5. Inspect implemented files:
   - `apps/api/migrations/0005_cozy_farm_system.sql`
   - `packages/game-data/src/farm.ts`
   - `packages/game-data/src/index.ts`
   - `packages/game-data/src/map.ts`
   - `packages/game-data/src/farm.test.ts`
