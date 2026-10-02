# Cozy Farm System: Test Infrastructure & Methodology Specification (TEST_INFRA.md)

## 1. Architectural Overview & Test Philosophy

The Cozy Farm System within the Cozy Compute Social MMO operates under strict **Server-Authoritative Game State** and **Zero-Trust Client** principles. Every economic mutation (plot unlocking, seed purchase, produce sale, warehouse expansion), crop growth stage transition, and visitor authorization is validated and computed exclusively on the server.

The End-to-End (E2E) testing framework exercises the system as a black box (opaque-box testing) across the Fastify REST API, internal Colyseus auth bridges, PostgreSQL relational schemas, and Redis cache.

### Core Testing Pillars:

1. **Server Authority**: Client claims regarding Coin amounts, inventory quantities, crop maturation, or visitor permissions are never trusted. All state transitions must reflect database ledger invariants (`ledger_entries`, `balances`).
2. **Deterministic Time Simulation**: Real-world timers for crop growth (e.g., 300s, 600s) and soil moisture decay (30 minutes) are controlled deterministically via the test harness virtual clock (`h.clock.now`).
3. **Ledger Integrity & Idempotency**: All mutation endpoints requiring currency deduction enforce unique `Idempotency-Key` headers to guarantee zero double-spend or duplicate allocations under network retry or concurrent burst conditions.
4. **Strict Isolation**: Each test case creates independent players (`register`), sets up its own state, and verifies results without inter-test dependencies.

---

## 2. Category-Partition Method (Ostrand & Balcer)

The functional surface is decomposed into functional units (FUs), identifying categories (parameters, environment conditions, database states) and partitioning them into disjoint equivalence classes with formal constraints.

### FU1: Farm Profile & Visitor Authentication

- **Category 1: Requester Identity**
  - [C1.1] Authenticated Farm Owner `[property IsOwner]`
  - [C1.2] Authenticated Other Player (Visitor) `[property IsVisitor]`
  - [C1.3] Unauthenticated Client (Missing / Expired Bearer Token) `[error]`
- **Category 2: Farm Privacy Mode**
  - [C2.1] Public (is_public = true, password = null) `[property FarmPublic]`
  - [C2.2] Private with Password (is_public = false, password_hash set) `[property FarmPrivate]`
- **Category 3: Supplied Password in Visitor Auth (`POST /api/farm/auth`)**
  - [C3.1] Correct password matching Argon2id hash `[if FarmPrivate]`
  - [C3.2] Incorrect password `[if FarmPrivate] [error]`
  - [C3.3] Empty / null password on private farm `[if FarmPrivate] [error]`
- **Category 4: Internal Bridge Secret (`POST /internal/farm-access`)**
  - [C4.1] Valid `x-internal-secret` header matching server configuration `[property InternalAuthValid]`
  - [C4.2] Missing or invalid `x-internal-secret` header `[error]`

### FU2: Plot Grid & Soil Management

- **Category 1: Plot Index (`0..35`)**
  - [C1.1] Starter plots (`0..3`) `[property StarterPlot]`
  - [C1.2] Valid locked plots (`4..35`) `[property ExpandablePlot]`
  - [C1.3] Negative plot index (`< 0`, e.g., `-1`) `[error]`
  - [C1.4] Out-of-bounds upper index (`>= 36`, e.g., `36`, `999`) `[error]`
  - [C1.5] Non-integer / malformed index (`"abc"`, `3.14`) `[error]`
- **Category 2: Current Plot Unlock State**
  - [C2.1] Currently locked `[property PlotLocked]`
  - [C2.2] Already unlocked `[property PlotUnlocked]`
- **Category 3: Coin Balance for Plot Unlock**
  - [C3.1] Balance >= Plot unlock price `[property CanAffordPlot]`
  - [C3.2] Balance < Plot unlock price `[error]`
- **Category 4: Idempotency Key in Plot Unlock**
  - [C4.1] Fresh unique key
  - [C4.2] Replayed key with identical payload (idempotent cache return)
  - [C4.3] Replayed key with conflicting payload `[error]`

### FU3: Crop Cultivation Lifecycle

- **Category 1: Plot Tilling / Preparation**
  - [C1.1] Unlocked plot, empty, ready for planting
  - [C1.2] Locked plot `[error]`
  - [C1.3] Already occupied plot with active crop `[error]`
- **Category 2: Seed Sourcing in Warehouse Silo**
  - [C2.1] Seed exists in Silo with quantity >= 1
  - [C2.2] Seed exists but quantity = 0 `[error]`
  - [C2.3] Invalid / non-existent seed item ID `[error]`
- **Category 3: Soil Moisture State**
  - [C3.1] Freshly watered (`now - watered_at < 30 minutes`) `[property SoilMoist]`
  - [C3.2] Moisture expired (`now - watered_at >= 30 minutes`) `[property SoilDry]`
  - [C3.3] Never watered (`watered_at = null`) `[property SoilDry]`
- **Category 4: Bio-Fertilizer Application**
  - [C4.1] Unfertilized (`is_fertilized = false`, 100% normal duration)
  - [C4.2] Fertilized (`is_fertilized = true`, 50% accelerated duration)
- **Category 5: Crop Growth Stage at Harvest (`POST /api/farm/plots/harvest`)**
  - [C5.1] Seed stage (`elapsed < 0.25 * duration`) `[error]`
  - [C5.2] Sprout stage (`0.25 * duration <= elapsed < 0.65 * duration`) `[error]`
  - [C5.3] Blooming stage (`0.65 * duration <= elapsed < duration`) `[error]`
  - [C5.4] Mature stage (`elapsed >= duration`) `[property CropMature]`
- **Category 6: Harvester Authorization**
  - [C6.1] Farm Owner `[if CropMature]`
  - [C6.2] Visitor / Guest Player `[error: 403 Forbidden]`

### FU4: Bác Sáu Supplies Store & Wholesale Commerce

- **Category 1: Shop Purchase Items**
  - [C1.1] Seeds catalog (Lúa, Dưa hấu, Bắp, Cà chua)
  - [C1.2] Animal Feed catalog (Thóc gia cầm, Cỏ khô bò, Cám heo)
  - [C1.3] Bio-Fertilizer (Phân bón hữu cơ vi sinh)
  - [C1.4] Fingerling fish stock (Cá tra, Cá basa, Cá lóc, Tôm càng xanh)
  - [C1.5] Invalid / unknown item ID `[error]`
- **Category 2: Purchase Quantity**
  - [C2.1] Positive integer (`1..max_stack`)
  - [C2.2] Zero (`0`) `[error]`
  - [C2.3] Negative integer (`-1`, `-50`) `[error]`
  - [C2.4] Non-integer float (`2.5`) `[error]`
- **Category 3: Warehouse Silo Space for Purchases/Harvests**
  - [C3.1] Silo current items + quantity <= Silo capacity
  - [C3.2] Silo current items + quantity > Silo capacity `[error: WAREHOUSE_FULL]`
- **Category 4: Wholesale Sell & Contract Fulfillment**
  - [C4.1] Standard wholesale produce sell (item exists in silo, quantity valid)
  - [C4.2] Sell with today's contract ID (exact matching item & quantity satisfied) -> +25% Coin bonus & Fame points
  - [C4.3] Sell with contract ID but wrong item or insufficient quantity `[error]`
  - [C4.4] Sell with expired or non-existent contract ID `[error]`

### FU5: Livestock & Pond Aquaculture

- **Category 1: Livestock Management (`POST /api/farm/animals/feed`)**
  - [C1.1] Appropriate feed matching animal type (e.g. grain for chicken, hay for cow)
  - [C1.2] Mismatched feed item `[error]`
  - [C1.3] Feed item not available in Silo `[error]`
  - [C1.4] Feeding interval respected (`now - fed_at >= feedIntervalSec`)
  - [C1.5] Premature feeding attempt (`now - fed_at < feedIntervalSec`) `[error]`
- **Category 2: Pond Fish Stocking (`POST /api/farm/pond/stock`)**
  - [C2.1] Valid fingerling species within pond capacity
  - [C2.2] Exceeding max pond biomass/capacity limit `[error]`
  - [C2.3] Invalid fish species `[error]`

### FU6: Silo Warehouse Storage & Expansion

- **Category 1: Capacity Expansion (`POST /api/farm/warehouse/upgrade`)**
  - [C1.1] Tier 1 upgrade (Base 100 -> 150 slots) with sufficient coin balance
  - [C1.2] Upgrade attempt with insufficient coin balance `[error]`
  - [C1.3] Repeated upgrade with identical `Idempotency-Key` (safe replay)

---

## 3. Boundary Value Analysis (BVA)

| Parameter / Dimension     | Minimum Valid          | Nominal               | Maximum Valid    | Off-by-One Below                    | Off-by-One Above                  | Error / Extreme                 |
| ------------------------- | ---------------------- | --------------------- | ---------------- | ----------------------------------- | --------------------------------- | ------------------------------- |
| **Plot Index**            | `0`                    | `1..34`               | `35`             | `-1`                                | `36`                              | `-999`, `999`, `"zero"`, `null` |
| **Starter Plots**         | `0`                    | `1..2`                | `3`              | N/A                                 | `4` (requires unlock)             | N/A                             |
| **Silo Capacity**         | `100` (Base)           | `150, 200`            | `500` (Tier Max) | `99` (invalid base)                 | `501` (beyond max tier)           | `0`, `-50`                      |
| **Silo Items Fill**       | `0`                    | `50`                  | `100`            | N/A                                 | `101` (overflow rejected)         | `-1`                            |
| **Shop Buy Quantity**     | `1`                    | `10`                  | `100`            | `0` (rejected)                      | `999999` (capped by funds/silo)   | `-1`, `-10`, `1.5`              |
| **Shop Sell Quantity**    | `1`                    | Current inventory     | All in silo      | `0` (rejected)                      | Inventory + 1 (insufficient item) | `-1`, `null`                    |
| **Soil Moisture Decay**   | `0s`                   | `15m`                 | `29m 59s`        | N/A                                 | `30m 00s` (expired/dry)           | `24h`                           |
| **Crop Maturation**       | `growthDurationSec`    | `> growthDurationSec` | Mature state     | `growthDurationSec - 1s` (blooming) | Normal mature                     | Negative elapsed time           |
| **Bio-Fertilizer Growth** | `0.5 * growthDuration` | `> 0.5 * duration`    | Mature state     | `(0.5 * duration) - 1s` (immature)  | Normal mature                     | Double fertilization            |
| **Animal Happiness**      | `0`                    | `50`                  | `100`            | `< 0` (clamped to 0)                | `> 100` (clamped to 100)          | `NaN`                           |
| **Coin Balances**         | `0`                    | Normal balance        | Ledger max       | `-1` (unsupported by ledger)        | N/A                               | Non-numeric                     |

---

## 4. Pairwise Combinatorial Testing (CIT)

A 4-factor combinatorial orthogonal matrix tests interactions between security, ownership, plot readiness, and storage constraints:

- **Factor A (Caller Role)**: `[Owner, VisitorWithAuthToken, VisitorWithoutToken, Unauthenticated]`
- **Factor B (Target Farm Privacy)**: `[Public, PrivateWithPassword]`
- **Factor C (Target Plot State)**: `[Locked, EmptyUnlocked, PlantedImmature, PlantedMature]`
- **Factor D (Silo Capacity State)**: `[AvailableSpace, CompletelyFull]`

### Pairwise Combinations Matrix (Sample Representative Test Cases)

| Test ID    | Caller Role         | Farm Privacy | Plot State      | Silo State     | Planned Operation     | Expected Result                                         |
| ---------- | ------------------- | ------------ | --------------- | -------------- | --------------------- | ------------------------------------------------------- |
| **CIT-01** | Owner               | Private      | PlantedMature   | AvailableSpace | `POST /plots/harvest` | `200 OK` (Harvested produce added to Silo)              |
| **CIT-02** | Owner               | Private      | PlantedMature   | CompletelyFull | `POST /plots/harvest` | `400 Bad Request` (`WAREHOUSE_FULL`)                    |
| **CIT-03** | VisitorWithToken    | Private      | PlantedMature   | AvailableSpace | `POST /plots/harvest` | `403 Forbidden` (`FORBIDDEN_VISITOR_HARVEST`)           |
| **CIT-04** | VisitorWithToken    | Private      | PlantedImmature | AvailableSpace | `POST /plots/water`   | `200 OK` (Watered, `isGuestHelper: true`, Fame awarded) |
| **CIT-05** | VisitorWithoutToken | Private      | PlantedImmature | AvailableSpace | `POST /plots/water`   | `401 Unauthorized`                                      |
| **CIT-06** | VisitorWithoutToken | Public       | PlantedImmature | AvailableSpace | `POST /plots/water`   | `200 OK` (Public farm allows guest watering)            |
| **CIT-07** | Owner               | Public       | Locked          | AvailableSpace | `POST /plots/plant`   | `400 Bad Request` (Cannot plant on locked plot)         |
| **CIT-08** | Owner               | Public       | EmptyUnlocked   | CompletelyFull | `POST /shop/buy`      | `400 Bad Request` (`WAREHOUSE_FULL`)                    |
| **CIT-09** | VisitorWithToken    | Public       | EmptyUnlocked   | AvailableSpace | `POST /plots/plant`   | `403 Forbidden` (Visitors cannot sow host plots)        |
| **CIT-10** | Unauthenticated     | Public       | Any             | Any            | Any `/api/farm/*`     | `401 Unauthorized`                                      |

---

## 5. Real-World Workload Profiles

### Profile A: Full Farming Season & Crop Rotation

Simulates an active farmer's daily gameplay loop:

1. Initialize farm profile (`GET /api/farm/me`).
2. Purchase 4 seed varieties (Lúa thơm, Dưa hấu, Bắp, Cà chua) and Bio-Fertilizer at Bác Sáu Shop (`POST /api/farm/shop/buy`).
3. Unlock expansion plots `4..7` (`POST /api/farm/plots/unlock`).
4. Sow seeds across plots `0..7` (`POST /api/farm/plots/plant`).
5. Water all plots (`POST /api/farm/plots/water`).
6. Advance time past maturation durations using the virtual clock.
7. Harvest all 8 plots to Silo (`POST /api/farm/plots/harvest`).
8. Sell yields wholesale and verify coin ledger balances (`POST /api/farm/shop/sell`).

### Profile B: Daily Market Contract Fulfillment Rush

Simulates meeting today's urgent agricultural supply orders:

1. Query active contracts (`GET /api/farm/me -> todayContracts`).
2. Produce required crops/animal yields to satisfy contract specifications.
3. Submit contract fulfillment (`POST /api/farm/shop/sell` with `contractId`).
4. Validate that Coin reward includes the +25% contract bonus and profile receives Farmer Fame.
5. Attempt duplicate submission of already fulfilled contract (rejected).

### Profile C: Multi-Player Co-op Community Gathering

Simulates a collaborative social session on a host's farm:

1. Host configures farm privacy and sets a farm password (`PUT /api/farm/settings`).
2. Three independent visitor players authenticate using the password (`POST /api/farm/auth`).
3. Each visitor verifies admission through the internal Colyseus bridge (`POST /internal/farm-access`).
4. All three visitors concurrently water the host's dry crops (`POST /api/farm/plots/water`).
5. Validate each visitor receives reputation Fame points (`fameAwarded > 0`).
6. Each visitor attempts to harvest the host's ripe crops; verify all attempts are rejected with `403 Forbidden`.
7. Host enters and successfully harvests their own crops.

### Profile D: Silo Storage Bottleneck & Expansion Under High Inflow

Simulates storage exhaustion and resolution:

1. Fill Silo to initial 100 capacity.
2. Attempt further shop purchases and crop harvests (verify `400 WAREHOUSE_FULL`).
3. Execute warehouse capacity upgrade (`POST /api/farm/warehouse/upgrade`).
4. Verify capacity expands to 150 slots and Coin cost is accurately deducted.
5. Resume pending harvests and verify storage succeeds.

### Profile E: High-Concurrency Replay & Idempotency Stress

Simulates network retries and duplicate HTTP packets:

1. Dispatch 10 parallel requests to unlock plot `4` using identical `Idempotency-Key`.
2. Verify exactly one ledger deduction occurs and 9 requests receive the cached success response.
3. Dispatch 10 parallel requests to upgrade warehouse using identical `Idempotency-Key`.
4. Verify warehouse capacity increases by exactly 50 slots once, and coin balance decrements only once.

---

## 6. Execution & Quality Automation

- **Test Suite Location**: `apps/api/test/e2e/farm.e2e.test.ts`
- **Runner**: Vitest (integrated with Fastify app injection & real PostgreSQL/Redis instances)
- **Execution Command**:
  ```bash
  cmd /c "set TEST_DATABASE_URL=postgres://cozy:cozy_dev_password@127.0.0.1:5432/cozy_test&& pnpm --filter @cozy/api test test/e2e/farm.e2e.test.ts"
  ```
- **Monorepo Quality Gate**:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm format:check`
