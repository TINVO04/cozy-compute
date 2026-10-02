# Handoff Report: M1 GameData Cozy Farm System

**Type**: Hard Handoff  
**Agent**: M1 GameData Explorer (`m1_explorer_gamedata`)  
**Recipient**: Parent Orchestrator (`d39205dd-01db-4096-9bff-542cd3821c40`)  
**Date**: 2026-10-02T03:57:00Z  

---

## 1. Observation

1. **Monorepo Package Structure & Exports**:
   - `packages/game-data/package.json` specifies `"type": "module"`, `"main": "./src/index.ts"`, `"exports": { ".": "./src/index.ts" }`.
   - `packages/game-data/src/index.ts` lines 1-9 currently re-exports eight modules (`./map.js`, `./town-scenery.js`, `./movement.js`, `./items.js`, `./appearance.js`, `./activities.js`, `./fishing.js`, `./billiards.js`) using `.js` ESM relative imports. `farm.ts` does not yet exist.
2. **Existing Game Data and Movement Tests**:
   - Running `pnpm --filter @cozy/game-data test` passed all 7 test files and 40 tests.
   - `packages/game-data/src/town-layout.test.ts` line 56 enforces:
     ```typescript
     for (const zone of ZONES) expect(zones.has(zone.id), `${zone.id} needs a paved route`).toBe(true);
     ```
     Every zone registered in `ZONES` must be connected to `SPAWN` via paved paths (`PATHS`, `PLAZA`, `PIER`).
   - `packages/game-data/src/map.ts` line 301 contains `t(0, 0, 1, MAP_ROWS)`, which blocks the entirety of column 0 along the western border.
   - `packages/game-data/src/map.ts` line 310 contains `t(1, 10, 46, 2)`, stopping at column 1.
3. **Database & API Contracts**:
   - `PROJECT.md` lines 68-73 specifies authoritative types:
     ```typescript
     CropDef: { id, name, seedItemId, seedPrice, sellPrice, growthDurationSec, baseYieldMin, baseYieldMax }
     AnimalDef: { type, name, stockPrice, yieldItem, yieldPrice, feedIntervalSec, happinessBoost }
     PondFishDef: { species, name, fingerlingPrice, marketWeightMinKg, marketWeightMaxKg, pricePerKg }
     ShopItemDef: { id, name, category, coinPrice, description }
     MarketContractDef: { id, title, requiredItemId, requiredQuantity, rewardCoin, rewardFame }
     ```
   - `PROJECT.md` line 26 dictates hoe tilling and watering with 30m moisture decay (`SOIL_MOISTURE_DURATION_SEC = 1800`).
   - `PROJECT.md` line 29 states organic bio-fertilizer halves crop growth time (`FERTILIZER_GROWTH_MULTIPLIER = 0.5`).
   - `docs/farm_system_plan.pdf` pages 5-10 detail:
     - 5 crops (`crop_rice`, `crop_corn`, `crop_watermelon`, `crop_tomato`, `crop_chili`) and seed prices (30c, 50c, 120c, 45c, 60c).
     - 5 animal types (`chicken`, `duck`, `cow`, `pig`, `goat`) across 4 barn types.
     - 4 pond fish species (`tra`, `basa`, `loc`, `tom_cang`).
     - 100 base Silo warehouse capacity with +50 upgrade increments.
     - Daily market contracts with +25% coin bonus and farmer fame.

---

## 2. Logic Chain

1. **Step 1 (Architecture & Extensibility)**: Because all downstream packages (`apps/api`, `apps/realtime`, `apps/web`) import `@cozy/game-data`, establishing `packages/game-data/src/farm.ts` with explicit type definitions, constants, catalogs, and pure calculation helpers provides the foundation for M1 migrations (`0005_cozy_farm_system.sql`), M2 API routes (`/api/farm/*`), M3 realtime rooms (`FarmRoom`), and M4/M5 scene rendering and UI panels without schema divergence (Observation 1, 3).
2. **Step 2 (Map Integration & Boundary Safety)**: The requirement for the Town West Gate portal (`farm_gate`) requires adjusting the western boundary in `packages/game-data/src/map.ts`. Specifically, `t(0, 0, 1, MAP_ROWS)` must be split into `t(0, 0, 1, 10)` and `t(0, 12, 1, MAP_ROWS - 12)` so rows 10..11 are open, and `PATHS` must extend from column 1 to column 0 (`t(0, 10, 47, 2)`). This ensures `town-layout.test.ts` passes without breaking existing collision tests (Observation 2).
3. **Step 3 (Authoritative Economy & Growth Simulation)**: To ensure server-authoritative integrity, `farm.ts` must export pure simulation functions (`getCropGrowthStage`, `isPlotMoist`, `calculatePondFishWeight`, `getWarehouseTabForItem`) so that `apps/api/src/services/farm.ts` and `apps/realtime/src/rooms/farm.ts` compute growth and states deterministically using the exact server timestamps (Observation 3).

---

## 3. Caveats

- **Backpack vs Silo Item Independence**: While Silo items are tracked in `farm_warehouse_items`, seeds and fertilizers can be held in either the player's personal inventory or the farm Silo. The item IDs defined (`seed_*`, `fertilizer_*`, etc.) are designed to be globally valid item IDs. If the API seeds `item_definitions` in PostgreSQL, `item_definitions_type_check` in migration `0005_cozy_farm_system.sql` may need to include farm item types if they are inserted into `item_definitions`.
- **Town West Gate Scenery**: Pure Canvas art rendering for the bamboo gate structure in `apps/web/src/art` is planned for M4, but the coordinate definitions (`farm_gate` at `t(0, 10, 2, 2)`) in `map.ts` are ready now.

---

## 4. Conclusion

The complete game-data specification for the Cozy Farm System has been created in `.agents/teamwork/m1_explorer_gamedata/report.md`. It provides:
1. Full TypeScript types for crops, soil plots, livestock, aquaculture, warehouse silo, shop items, and market contracts.
2. Complete catalogs: 5 crops, 5 livestock species, 4 aquaculture pond species, 19 Bác Sáu shop items, 6 market contracts with +25% bonus math.
3. Complete 36-plot unlock schedule (plots 0..3 starter free, scaling to 5,000c) and 8-tier Silo upgrade table (100 -> 500 capacity).
4. Deterministic pure simulation helper functions (`getCropGrowthStage`, `isPlotMoist`, `calculatePondFishWeight`, `getWarehouseTabForItem`).
5. Town map West Gate portal coordinates and Farm map POI and collision blocker geometry.
6. Vitest test suite outline for `packages/game-data/src/farm.test.ts`.

---

## 5. Verification Method

To independently verify the game-data blueprint:
1. **Inspect Blueprint**: Review `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_explorer_gamedata\report.md`.
2. **Implementation Verification**:
   - Create `packages/game-data/src/farm.ts` matching the blueprint.
   - Re-export `farm.js` in `packages/game-data/src/index.ts`.
   - Update `packages/game-data/src/map.ts` (add `farm_gate` zone, split col 0 blocker, extend row 10 path).
   - Run `pnpm --filter @cozy/game-data test` to verify zero regression on all existing tests.
   - Run `pnpm typecheck` to verify workspace-wide TypeScript compliance.
