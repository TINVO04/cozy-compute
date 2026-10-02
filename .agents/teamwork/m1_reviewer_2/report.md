# Milestone 1 Review & Adversarial Challenge Report: Cozy Farm System

- **Reviewer**: M1 Reviewer 2 (Roles: Reviewer, Critic)
- **Target Milestone**: M1 (Data Models & Database Foundation)
- **Targets Reviewed**:
  - `apps/api/migrations/0005_cozy_farm_system.sql`
  - `packages/game-data/src/farm.ts`
  - `packages/game-data/src/map.ts`
  - `packages/game-data/src/farm.test.ts`
  - `packages/game-data/src/town-layout.test.ts`
- **Verdict**: **`APPROVE`**

---

## 1. Executive Summary

Milestone 1 introduces the complete data modeling, PostgreSQL schema migrations, authoritative game specifications, and town map portal geometry for the **Cozy Farm System (Hệ Thống Trang Trại Cá Nhân)**.

An exhaustive line-by-line inspection and independent adversarial evaluation confirm that:
1. **Integrity Violations**: Zero detected. No hardcoded test shortcuts, no mock facades, and no self-certifying fabrications exist in the implementation.
2. **Database Foundation**: 5 relational tables (`farms`, `farm_plots`, `farm_animals`, `farm_warehouse_items`, `farm_pond_fishes`), cascading foreign keys, robust unique/check constraints, a reusable PL/pgSQL provisioning function `provision_farm_plots()`, and forward-compatible updates to `item_definitions` are implemented cleanly.
3. **Game Data**: Authoritative catalogs for 5 crops, 6 livestock animals, 5 aquaculture freshwater fish, 8 silo upgrade tiers, 4 smart warehouse tabs, 21 Bác Sáu shop items, and 6 daily supply contracts with +25% bonus math are fully typed. Pure simulation functions (`getCropGrowthStage`, `isPlotMoist`, `calculatePondFishWeight`, `getPondFishStage`, `getPlotState`, `getPlotUnlockPrice`) are rigorously tested.
4. **Town West Gate Portal & Navigation**: Blocker `t(0, 0, 1, MAP_ROWS)` was accurately partitioned into `t(0, 0, 1, 10)` and `t(0, 12, 1, MAP_ROWS - 12)` to open rows 10–11. Paved path `t(0, 10, 2, 2)` was connected to town paths. Ingress/egress portal geometry incorporates proper hysteresis to prevent infinite transition loops. All 58 unit tests in `@cozy/game-data` pass (100%).

---

## 2. Integrity Evaluation

Under strict reviewer and adversarial critic guidelines, the codebase was inspected for integrity violations:

| Check Category | Evidence / Finding | Status |
|----------------|--------------------|--------|
| **Hardcoded Test Results** | Verified all helper formulas (`getCropGrowthStage`, `calculatePondFishWeight`, `getPlotUnlockPrice`, `getWarehouseTabForItem`). Formulas compute results dynamically and continuously using real mathematical equations rather than hardcoded equality checks. | **PASS** |
| **Facade Implementations** | The 5 SQL tables, stored procedure, map geometry, and data catalogs are fully fleshed out with complete production schemas and interfaces matching `PROJECT.md`. | **PASS** |
| **Task Shortcuts / Bypasses** | Full 36-plot grid with tiered prices, complete livestock coops, fish species growth curves, and town map collision geometry implemented from scratch. | **PASS** |
| **Fabricated Verification** | All test suites and typechecks independently executed in this session via terminal commands and verified against raw process stdout. | **PASS** |
| **Self-Certifying Claims** | Verified town reachability using `town-layout.test.ts` movement simulator and coordinate mathematics independently. | **PASS** |

---

## 3. Findings

### [Minor] Finding 1: `getPlotUnlockPrice` Lacks Boundary and Negative Index Validation
- **What**: `getPlotUnlockPrice(index: number)` in `packages/game-data/src/farm.ts` does not validate that `index` is within `0..35`.
- **Where**: `packages/game-data/src/farm.ts:143-153`
- **Why**:
  ```ts
  export function getPlotUnlockPrice(index: number): number {
    if (index < 4) return 0;
    // ...
    return 7500;
  }
  ```
  Calling `getPlotUnlockPrice(-1)` returns `0`. Calling `getPlotUnlockPrice(100)` returns `7500`. In contrast, `getFarmPlotRect(index)` validates `0 <= index < 36` and throws an explicit `Error`.
- **Impact**: In Milestone 2 API routes, if the caller relies solely on `getPlotUnlockPrice` without prior bounds checking, invalid indices could return valid prices (though SQL `CHECK (plot_index >= 0 AND plot_index < 36)` acts as a secondary defense).
- **Suggestion**: Add `if (index < 0 || index >= TOTAL_FARM_PLOTS) throw new Error(...)` to `getPlotUnlockPrice` in M2.

### [Minor] Finding 2: `farm_pond_fishes.growth_stage` Default Mismatch with Fingerling Weight
- **What**: In `0005_cozy_farm_system.sql`, `growth_stage` defaults to `'juvenile'` instead of `'fingerling'`.
- **Where**: `apps/api/migrations/0005_cozy_farm_system.sql:118`
- **Why**:
  Newly stocked fish start at `current_weight_kg = 0.10` (`FINGERLING_INITIAL_WEIGHT_KG`). In `farm.ts`, 4 of the 5 species (`tra`, `basa`, `loc`, `bong_tuong`) have `juvenileWeightKg` between 0.3kg and 0.8kg. At 0.10kg, `getPondFishStage(0.10, ...)` evaluates to `'fingerling'`.
  However, the DB column definition specifies:
  `growth_stage text NOT NULL DEFAULT 'juvenile'`
- **Impact**: If an INSERT in M2 omits `growth_stage` and relies on database default, newly stocked fingerlings will be recorded as `'juvenile'`.
- **Suggestion**: Ensure M2 `stockPond` service explicitly provides `growth_stage: 'fingerling'` (or `getPondFishStage(...)`) during insertion.

### [Informational] Finding 3: Redundant Indexes on Unique Columns
- **What**: Several tables declare redundant btree indexes on columns already covered by UNIQUE constraints.
- **Where**:
  - `farms`: `user_id` has inline `UNIQUE`, plus `CREATE UNIQUE INDEX farms_user_id_uq ON farms (user_id)` (line 35).
  - `farm_plots`: `UNIQUE (farm_id, plot_index)` already indexes `farm_id` as the leading column, but `CREATE INDEX farm_plots_farm_id_idx ON farm_plots (farm_id)` is also defined (line 61).
  - `farm_warehouse_items`: `UNIQUE (farm_id, item_id)` already indexes `farm_id` as leading column, but `CREATE INDEX farm_warehouse_farm_id_idx` is also created (line 103).
- **Why**: PostgreSQL already creates btree indexes for all UNIQUE constraints. A composite index on `(farm_id, plot_index)` automatically services `WHERE farm_id = $1`.
- **Impact**: Harmless to functionality; slight redundant write overhead during inserts/updates. No action required for M1.

### [Informational] Finding 4: Clock Skew Edge Case in `isPlotMoist`
- **What**: `isPlotMoist(wateredAt, now)` calculates `now - timeMs < SOIL_MOISTURE_DURATION_SEC * 1000`.
- **Where**: `packages/game-data/src/farm.ts:836-840`
- **Why**: If a future timestamp is passed (e.g., due to unsynchronized client clock or NTP jump where `timeMs > now`), `now - timeMs` is negative, which is `< 1800000`, returning `true`.
- **Impact**: Server-authoritative timestamps in M2 will prevent client timestamp spoofing, but adding `now >= timeMs` is a good defensive measure.

---

## 4. Adversarial Challenges & Stress-Testing

### Challenge 1: Western Border Portal Geometry & Transition Re-triggering
- **Assumption Challenged**: Player transitions between Town and Farm do not trigger infinite transition ping-pong or get trapped in collision blockers.
- **Attack Scenario**:
  1. Town gate interaction zone is `t(0, 10, 2, 2)` = `[0..64, 320..384]`.
  2. When returning from FarmScene to TownScene, the player spawns at `TOWN_FARM_PORTAL_SPAWN = { x: 2 * TILE, y: 11 * TILE } = (64, 352)`.
  3. Could the player spawn inside the portal trigger, causing an immediate bounce back to the farm?
- **Analysis & Verification**:
  - `pointInRect(64, 352, { x: 0, y: 320, w: 64, h: 64 })`:
    - `x >= 0 && x < 64 && y >= 320 && y < 384`
    - Since `64 < 64` is `false`, the spawn point is **strictly outside** the trigger rectangle.
  - Movement feet box check at `(64, 352)`:
    - `left = 54, right = 74, top = 346, bottom = 356`.
    - Border blockers `t(0, 0, 1, 10)` (y: 0..320) and `t(0, 12, 1, 20)` (y: 384..1024) do not intersect `[346..356]`.
    - `isWalkable(64, 352)` = `true`.
  - Walking 1 pixel west (`x = 63`) immediately triggers `farm_gate`.
- **Verdict**: **PASS**. Portal placement exhibits clean hysteresis and collision-free egress.

### Challenge 2: Paved Route Reachability across Monorepo Movement Mechanics
- **Assumption Challenged**: Prepending `t(0, 10, 2, 2)` to `PATHS` provides unbroken connectivity from the central town spawn to `farm_gate` across actual avatar bounding boxes (`PLAYER_RADIUS = 10`, `step = 16`).
- **Verification**:
  - `town-layout.test.ts` executes BFS reachability with `pavedOnly = true`:
    ```ts
    const accessible = reachable(true);
    // ...
    for (const zone of ZONES) expect(zones.has(zone.id)).toBe(true);
    ```
  - Output: `✓ src/town-layout.test.ts (4 tests) 74ms`.
- **Verdict**: **PASS**. Continuous paved path confirmed.

### Challenge 3: Economic Progression Consistency Across SQL & TypeScript
- **Assumption Challenged**: Tiered unlock pricing and warehouse capacities in SQL migration match TypeScript authoritative constants.
- **Verification**:
  - Plot pricing across all 36 plots:
    - Plots 0..3: 0 (free starter)
    - Plots 4..7: 250
    - Plots 8..11: 500
    - Plots 12..15: 1,000
    - Plots 16..19: 1,500
    - Plots 20..23: 2,500
    - Plots 24..27: 3,500
    - Plots 28..31: 5,000
    - Plots 32..35: 7,500
  - SQL `provision_farm_plots` CASE matches `getPlotUnlockPrice(index)` in `farm.ts` across all 36 plots.
  - Warehouse capacities:
    - Base: 100
    - 8 tiers: 150, 200, 250, 300, 350, 400, 450, 500 (+50 step).
    - Max: 500.
- **Verdict**: **PASS**. 100% numerical and structural alignment.

---

## 5. Verified Claims Matrix

| Claim from Worker Handoff | Verification Method | Result |
|---------------------------|---------------------|--------|
| `0005_cozy_farm_system.sql` creates 5 tables with cascade deletes | Inspected lines 25, 44, 71, 92, 111 | Confirmed: all child tables specify `ON DELETE CASCADE` referencing `farms(id)`. |
| Starter plots 0..3 unlocked with 0 cost | Inspected SQL lines 158-160 & `farm.ts` lines 144, 158 | Confirmed: plots 0..3 unlocked and cost 0 in both SQL and TS. |
| Item categories expansion in `item_definitions` | Inspected SQL lines 131-138 | Confirmed: `type IN ('clothing', 'furniture', 'rod', 'seed', 'crop', 'animal_product', 'farm_supply')`. |
| Split `BLOCKERS` opens rows 10-11 at west border | Inspected `map.ts` lines 309-310 | Confirmed: `t(0, 0, 1, 10)` and `t(0, 12, 1, MAP_ROWS - 12)`. |
| Paved path prepended to `PATHS` | Inspected `map.ts` line 319 | Confirmed: `t(0, 10, 2, 2)` added at index 0. |
| `pnpm --filter @cozy/game-data test` passes 100% | Executed via terminal | Confirmed: 8/8 test files passed (58/58 tests). |
| `pnpm --filter @cozy/game-data typecheck` passes | Executed via terminal | Confirmed: 0 errors. |
| `pnpm --filter @cozy/api typecheck` passes | Executed via terminal | Confirmed: 0 errors. |
| `pnpm lint` passes across repo | Executed via terminal | Confirmed: 0 errors, 0 warnings. |

---

## 6. Coverage Gaps & Monorepo Coherence

- **Live PostgreSQL Execution**: Migration `0005_cozy_farm_system.sql` is syntactically sound and conforms with migrations 0001–0004. Live execution against PostgreSQL occurs in Milestone 2 when API routes connect to the database.
- **E2E Test Suites**: The E2E tests in `apps/api/test/e2e/farm.e2e.test.ts` (Tiers 1–4) expect REST endpoints (`/api/farm/*`) that are scheduled for Milestone 2. Their presence as failing tests confirms correct TDD preparation for M2.
- **Pure Canvas Art Visuals**: Visual rendering of the rustic bamboo gate arch and Nam Bo scenery is scheduled for Milestone 4; collision geometry and interaction zones are active and verified now.

---

## 7. Recommendation & Conclusion

Milestone 1 satisfies all required acceptance criteria, design contracts, and architectural guidelines. The non-blocking findings identified above have been documented as implementation notes for Milestone 2.

**Verdict**: **`APPROVE`**
