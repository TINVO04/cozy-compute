# Cozy Farm System: Test Suite Readiness & Coverage Report (TEST_READY.md)

## Status: READY (E2E Test Track Complete)

The opaque-box End-to-End test suite for the Cozy Farm System in Cozy Compute Social MMO has been authored, verified against the project test harness, and integrated into the Vitest execution pipeline.

---

## 1. Test Suite Deliverables

| File                                 | Purpose                                                                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TEST_INFRA.md` (Project root)       | Test specification defining Category-Partition equivalence classes, Boundary Value Analysis matrices, Pairwise Combinatorial interaction matrices, and Real-World Workload operational profiles. |
| `apps/api/test/e2e/farm.e2e.test.ts` | Vitest opaque-box E2E test suite implementing 65 comprehensive test cases across Tiers 1–4.                                                                                                      |
| `TEST_READY.md` (Project root)       | Published readiness report, runner commands, interface contract mapping, and execution results.                                                                                                  |

---

## 2. Test Execution Command

To run the Cozy Farm E2E test suite against the local development environment:

```bash
# In Windows cmd:
cmd /c "set TEST_DATABASE_URL=postgres://cozy:cozy_dev_password@127.0.0.1:5432/cozy_test&& pnpm --filter @cozy/api test test/e2e/farm.e2e.test.ts"

# In PowerShell:
$env:TEST_DATABASE_URL="postgres://cozy:cozy_dev_password@127.0.0.1:5432/cozy_test"; pnpm --filter @cozy/api test test/e2e/farm.e2e.test.ts
```

Note: The test file automatically defaults `process.env.TEST_DATABASE_URL` to `postgres://cozy:cozy_dev_password@127.0.0.1:5432/cozy_test` when unset, ensuring seamless local runs.

---

## 3. Coverage Summary Across Tiers

### Tier 1: Feature Coverage (Core Functional Paths) — 36 Tests

- **Core Feature 1: Farm State, Settings & Access Control (6 tests)**
  - `F1.1`: Personal farm state initialization on demand (36-plot grid, starter plots 0..3, 100-slot warehouse, 4 livestock pens, pond, today contracts).
  - `F1.2`: Privacy configuration with Argon2id farm password hashing (`PUT /api/farm/settings`).
  - `F1.3`: Switch back to public mode and clear password (`PUT /api/farm/settings`).
  - `F1.4`: Visitor authentication with password issuing visitor session token (`POST /api/farm/auth`).
  - `F1.5`: Colyseus internal access bridge verification for owner and authorized guest (`POST /internal/farm-access`).
  - `F1.6`: Unauthenticated request rejection (`401 Unauthorized`).
- **Core Feature 2: Plot Unlock & Soil Management (5 tests)**
  - `F2.1`: Starter plots 0..3 unlocked by default without coin charge.
  - `F2.2`: Expansion plot 4 unlock with coin deduction and `Idempotency-Key` validation (`POST /api/farm/plots/unlock`).
  - `F2.3`: Replayed unlock with identical `Idempotency-Key` returns cached success without duplicate coin charge.
  - `F2.4`: Successive plot unlocks (plots 5 and 6) with accurate ledger accounting.
  - `F2.5`: Soil watering recording moisture timestamp (`POST /api/farm/plots/water`).
- **Core Feature 3: Crop Cultivation Lifecycle (5 tests)**
  - `F3.1`: Seed sowing from warehouse into empty unlocked plot (`POST /api/farm/plots/plant`).
  - `F3.2`: Soil watering and progressive growth stage transitions over virtual clock time.
  - `F3.3`: Fully mature crop harvest to silo warehouse and plot state reset (`POST /api/farm/plots/harvest`).
  - `F3.4`: Organic bio-fertilizer application cutting growth duration by 50%.
  - `F3.5`: Soil moisture decay calculation past the 30-minute threshold.
- **Core Feature 4: Co-op Visitor Interactions & Anti-Theft Security (5 tests)**
  - `F4.1`: Visitor crop watering under Helping Hand mechanic (`POST /api/farm/plots/water`).
  - `F4.2`: Helping Hand reputation Fame points awarded to the visitor.
  - `F4.3`: Anti-Theft enforcement: visitor crop harvest strictly denied (`403 Forbidden`).
  - `F4.4`: Anti-Tamper enforcement: visitor planting strictly denied (`403 Forbidden`).
  - `F4.5`: Farm owner legitimate harvest of crops watered by visitor.
- **Core Feature 5: Bác Sáu Shop, Wholesale & Daily Contracts (5 tests)**
  - `F5.1`: Agricultural supply purchases (seeds, feed, fertilizer) with ledger deduction (`POST /api/farm/shop/buy`).
  - `F5.2`: Idempotent shop purchase preventing duplicate charges on replay.
  - `F5.3`: Wholesale produce sales crediting coins to ledger (`POST /api/farm/shop/sell`).
  - `F5.4`: Today's market contract fulfillment granting +25% Coin bonus and Farmer Fame.
  - `F5.5`: Today's contract catalog schema and payload verification.
- **Core Feature 6: Livestock Husbandry & Pond Aquaculture (5 tests)**
  - `F6.1`: 4 distinct animal enclosures initialization (poultry coop, cattle pasture, pig pen, goat/sheep pen).
  - `F6.2`: Dairy cow feeding with hay boosting happiness score (`POST /api/farm/animals/feed`).
  - `F6.3`: Poultry coop feeding with grain consuming feed item from warehouse.
  - `F6.4`: Fish pond stocking with fingerling species (`POST /api/farm/pond/stock`).
  - `F6.5`: Simulated pond fish biomass weight growth over time.
- **Core Feature 7: Silo Warehouse Storage & Expansion (5 tests)**
  - `F7.1`: Silo base 100 capacity verified independent from player backpack.
  - `F7.2`: Multi-category inventory grouping (Crops, Animal Products, Seeds, Supplies).
  - `F7.3`: Capacity expansion (+50 slots) with coin ledger deduction (`POST /api/farm/warehouse/upgrade`).
  - `F7.4`: Successive tier upgrades (150 -> 200 slots).
  - `F7.5`: Idempotent upgrade replay preventing double charges.

### Tier 2: Boundary & Corner Cases — 20 Tests

- `B2.1`: Negative plot index (`-1`) rejected with 400.
- `B2.2`: Upper boundary off-by-one plot index (`36`) rejected with 400.
- `B2.3`: Extreme out-of-bounds plot index (`999`) rejected with 400.
- `B2.4`: Non-integer float plot index (`2.5`) rejected with 400.
- `B2.5`: Double-unlocking already unlocked starter plot rejected with 400.
- `B2.6`: Plot unlock with insufficient coin balance rejected with 400.
- `B2.7`: Sowing seed on locked plot rejected with 400.
- `B2.8`: Double-sowing on already occupied plot rejected with 400.
- `B2.9`: Sowing seed not in player warehouse rejected with 400.
- `B2.10`: Harvesting empty plot rejected with 400.
- `B2.11`: Premature crop harvest rejected with 400 (`CROP_NOT_MATURE`).
- `B2.12`: Shop purchase with quantity 0 rejected with 400.
- `B2.13`: Shop purchase with negative quantity (`-5`) rejected with 400.
- `B2.14`: Shop purchase exceeding coin balance rejected with 400.
- `B2.15`: Wholesale sell with quantity 0 or negative rejected with 400.
- `B2.16`: Wholesale sell exceeding available silo inventory rejected with 400.
- `B2.17`: Replaying `Idempotency-Key` with conflicting payload rejected with 400/409.
- `B2.18`: Visitor authentication with wrong password rejected with 401 (`INVALID_PASSWORD`).
- `B2.19`: Colyseus bridge access without `x-internal-secret` rejected with 403.
- `B2.20`: Silo warehouse addition at maximum capacity (100/100) rejected with 400 (`WAREHOUSE_FULL`).

### Tier 3: Cross-Feature Combinations (Pairwise & Multi-Feature) — 5 Tests

- `CIT-01`: End-to-end economic cycle: Buy Seed -> Sow -> Water -> Grow -> Harvest -> Wholesale Sell -> Net Coin Ledger Check.
- `CIT-02`: Co-op visitor lifecycle: Host Password -> Visitor Auth -> Internal Bridge Check -> Visitor Waters -> Visitor Theft Denied (403) -> Host Harvests.
- `CIT-03`: Storage bottleneck & resolution: Silo filled to 100 -> Harvest blocked (`WAREHOUSE_FULL`) -> Silo upgraded to 150 -> Harvest succeeds.
- `CIT-04`: Livestock husbandry cycle: Buy feed -> Feed cow -> Time advances -> Milk yield produced -> Sell produce.
- `CIT-05`: Daily market contract precision fulfillment: Inspect requirements -> Acquire item -> Submit fulfillment -> Verify +25% bonus and Fame points.

### Tier 4: Real-World Application Scenarios — 4 Tests

- `S4.1`: Multi-crop 4-plot agricultural season with staggered schedules (Lúa thơm, Dưa hấu) and bulk wholesale delivery.
- `S4.2`: Collaborative community farming event (Host and 3 concurrent visitors co-watering, fame distributed, zero guest theft).
- `S4.3`: High-concurrency burst and replay resilience (10 parallel identical requests for unlock and upgrade, verifying exactly-once state mutation).
- `S4.4`: Storage inflow saturation & multi-tier expansion (successive harvests exhausting 100 slots, upgrading to 150 and 200 slots without loss of items).

---

## 4. Quality Gate Verification

| Check                      | Tool / Command                                  | Result                                                 |
| -------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| **TypeScript Compilation** | `pnpm typecheck` (`tsc -p tsconfig.json`)       | **PASS** (0 errors)                                    |
| **Linting & Code Style**   | `pnpm lint` (`eslint .`)                        | **PASS** (0 warnings, 0 errors)                        |
| **Code Formatting**        | `npx prettier --check`                          | **PASS** (100% compliant)                              |
| **Harness Compatibility**  | Vitest (`vitest run test/e2e/farm.e2e.test.ts`) | **PASS** (Harness boot and Fastify injection verified) |

All 65 test cases serve as the executable contract for Milestone M1 (Database Schemas) and Milestone M2 (Server-Authoritative REST API).
