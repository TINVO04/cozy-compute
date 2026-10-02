# Cozy Farm System: Backend & Colyseus Architectural Exploration & Integration Blueprint

**Author**: Teamwork Backend & Colyseus Explorer  
**Date**: 2026-10-02  
**Target System**: Cozy Compute Social MMO (Monorepo)  
**Reference Document**: `docs/farm_system_plan.pdf` & `AGENTS.md`  

---

## 1. Executive Summary

This report establishes the complete backend and realtime architecture for the **Cozy Farm System (Hệ Thống Trang Trại Cá Nhân)** in the Cozy Compute Social MMO. 

The architecture strictly adheres to:
1. **Server-Authoritative Game State**: All economic transactions (purchases, sales, plot unlocking, capacity upgrades) and simulation timers (crop growth, soil hydration decay, animal yield readiness, fish weight gain) are calculated deterministically on the server based on authoritative PostgreSQL timestamps and server ledger updates.
2. **Zero-Dead-Ends**: Every API endpoint, shop contract, plot interaction, and warehouse tab is fully implemented with robust error reporting and validation.
3. **Idempotency & Concurrency Safety**: All coin mutations utilize row-level locking (`SELECT ... FOR UPDATE`), transaction boundaries (`withTx`), and unique idempotency keys in `ledger_entries` with automatic replay protection.
4. **Colyseus Room Security & Co-op Enforcement**: `FarmRoom` instances are partitioned per farm owner (`farm:${ownerId}`), allowing instant owner access while enforcing credential/token checks on visitors, allowing cooperative watering while strictly forbidding unauthorized harvesting.

---

## 2. Codebase Architecture & Technology Stack Analysis

### 2.1 Database & Persistence Architecture
- **Database Engine**: PostgreSQL 16+ (pgcrypto extension enabled for `gen_random_uuid()`).
- **ORM / Query Layer**: Raw `pg` (Node Postgres `Pool` and `PoolClient`) with strict typing. No Prisma, Kysely, or Drizzle is used in this repository.
  - Core database utilities in `apps/api/src/db.ts`:
    - `createPool(connectionString, max)`
    - `withTx<T>(db, fn: (tx: Tx) => Promise<T>)`: Manages `BEGIN`, `COMMIT`, `ROLLBACK`, and connection release.
    - `one<T>(q, sql, params)` and `many<T>(q, sql, params)`.
  - Type parsers configured:
    - OID 20 (`bigint`): Parsed as JavaScript `number` via `Number.parseInt(v, 10)` (values well below $2^{53}$).
    - OID 1700 (`numeric`): Parsed as JavaScript `number` via `Number.parseFloat(v)`.
- **Migration System**:
  - Located in `apps/api/migrations/`.
  - Managed by `apps/api/src/migrate.ts` and CLI `apps/api/src/migrate-cli.ts`.
  - Migrations are sequential SQL files (`0001_init.sql`, `0002_fish_journal.sql`, `0003_fish_inventory.sql`, `0004_fishing_rods.sql`).
  - Next sequential migration is **`0005_cozy_farm_system.sql`**.
  - `migrate()` automatically tracks applied migrations in the `schema_migrations` table and runs missing scripts within isolated transactions.

### 2.2 Ledger, Balances & Idempotency Engine
- **Source**: `apps/api/src/ledger.ts`.
- **Function**: `postLedger(tx: Tx, input: LedgerInput): Promise<LedgerResult>`
  - Row locking: `SELECT coin AS value FROM balances WHERE user_id = $1 FOR UPDATE`.
  - Balance safety: Throws `AppError(409, 'insufficient_balance')` if `current.value + amount < 0`.
  - Mutation & Ledger recording:
    ```sql
    UPDATE balances SET coin = $2, updated_at = now() WHERE user_id = $1;
    INSERT INTO ledger_entries (user_id, currency, amount, balance_after, reason_type, reference_id, metadata, idempotency_key)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;
    ```
  - Replay Pattern (e.g. `apps/api/src/services/shop.ts`):
    - Unique idempotency key formatted as `${action}:${userId}:${clientKey}`.
    - Check existing ledger row with `SELECT balance_after FROM ledger_entries WHERE idempotency_key = $1 AND user_id = $2`.
    - If found, return cached balance immediately (`{ replayed: true, ... }`).
    - In case of concurrent race condition, handle Postgres error code `23505` (unique constraint violation) by querying and returning the existing ledger entry.

### 2.3 Web Framework & REST Routing
- **Framework**: Fastify 5.x (`fastify`).
- **Plugins**: `@fastify/cors`, `@fastify/cookie`, `@fastify/rate-limit`.
- **Validation**: Zod 4.x (`zod`). Schema validation errors are mapped cleanly to 400 Bad Request via `app.setErrorHandler`.
- **Auth Middleware**:
  - `authHook(db)` runs on `onRequest`, extracts Bearer token, and populates `req.user: AuthUser`.
  - `requireUser(req)` ensures valid active session, throws 401 Unauthorized or 403 Suspended.
  - Password hashing: `@node-rs/argon2` with OWASP-recommended parameters (19 MiB memory, 2 iterations, 1 parallelism).
- **Internal Service Protection**:
  - Header `x-internal-secret` verified with timing-safe comparison (`timingSafeEqual`) in `apps/api/src/routes/internal.ts`.

### 2.4 Colyseus Realtime Server (`apps/realtime`)
- **Core Packages**: `@colyseus/core`, `@colyseus/ws-transport`, `@colyseus/schema`.
- **Entrypoint**: `apps/realtime/src/index.ts`.
- **Base Architecture**:
  - `BaseRoom` (`apps/realtime/src/rooms/base.ts`) provides authoritative 20 Hz movement simulation, client input rate limiting, chat censorship & flood protection, emote handling, player presence sync in Redis (`presence:online` and `positions`).
  - Rooms defined with `gameServer.define(name, RoomClass).filterBy(keys)`.
  - Cross-service pubsub: Redis pub/sub (`sub.subscribe(...)`) coordinates state changes across processes (`player:appearance`, `apartment:updated`, `farm:updated`).
- **Internal API Bridge**: `ApiClient` (`apps/realtime/src/api.ts`) communicates with Fastify's `/internal/*` routes using `INTERNAL_SECRET`.

---

## 3. Database Schema Design: Migration `0005_cozy_farm_system.sql`

Here is the exact production-ready PostgreSQL migration to create all 5 required tables along with appropriate indices, constraints, and cascade policies.

```sql
-- Migration: 0005_cozy_farm_system.sql
-- Description: Schema for Cozy Farm System (Farms, Plots, Animals, Warehouse Silo, Fish Pond)

-- 1. Farms Table (1-to-1 with users)
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  password_hash text,
  is_public boolean NOT NULL DEFAULT false,
  warehouse_capacity integer NOT NULL DEFAULT 100 CHECK (warehouse_capacity >= 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS farms_user_idx ON farms (user_id);

-- 2. Farm Plots Table (0..35 plots per farm, 6x6 grid)
CREATE TABLE IF NOT EXISTS farm_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  plot_index integer NOT NULL CHECK (plot_index >= 0 AND plot_index < 36),
  is_unlocked boolean NOT NULL DEFAULT false,
  unlock_price integer NOT NULL DEFAULT 0 CHECK (unlock_price >= 0),
  crop_id text,
  planted_at timestamptz,
  watered_at timestamptz,
  is_fertilized boolean NOT NULL DEFAULT false,
  growth_stage text NOT NULL DEFAULT 'seed' CHECK (growth_stage IN ('seed', 'sprout', 'blooming', 'mature', 'withered')),
  UNIQUE (farm_id, plot_index)
);
CREATE INDEX IF NOT EXISTS farm_plots_farm_idx ON farm_plots (farm_id);

-- 3. Farm Animals Table (Coops & Barns)
CREATE TABLE IF NOT EXISTS farm_animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  animal_type text NOT NULL CHECK (animal_type IN ('chicken', 'duck', 'cow', 'pig', 'goat')),
  name text NOT NULL,
  fed_at timestamptz,
  happiness integer NOT NULL DEFAULT 100 CHECK (happiness BETWEEN 0 AND 100),
  last_yield_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS farm_animals_farm_idx ON farm_animals (farm_id);

-- 4. Farm Warehouse Silo Items Table (Isolated from player backpack)
CREATE TABLE IF NOT EXISTS farm_warehouse_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('crop', 'livestock', 'seed', 'supply')),
  item_id text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, item_id)
);
CREATE INDEX IF NOT EXISTS farm_warehouse_farm_idx ON farm_warehouse_items (farm_id);

-- 5. Farm Aquaculture Pond Fishes Table
CREATE TABLE IF NOT EXISTS farm_pond_fishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  fish_species text NOT NULL CHECK (fish_species IN ('tra', 'basa', 'loc', 'tom_cang')),
  stocked_at timestamptz NOT NULL DEFAULT now(),
  current_weight_kg numeric(6,2) NOT NULL DEFAULT 0.10 CHECK (current_weight_kg >= 0),
  fed_at timestamptz
);
CREATE INDEX IF NOT EXISTS farm_pond_fishes_farm_idx ON farm_pond_fishes (farm_id);
```

### Initial Farm Provisioning Strategy
When a player queries `/api/farm/me` or triggers farm creation:
- Create `farms` record with default `warehouse_capacity = 100`, `is_public = false`, `password_hash = null`.
- Automatically populate 36 `farm_plots` rows:
  - Plots 0 to 5: `is_unlocked = true`, `unlock_price = 0` (Starter plots).
  - Plots 6 to 11: `is_unlocked = false`, `unlock_price = 500`.
  - Plots 12 to 17: `is_unlocked = false`, `unlock_price = 1500`.
  - Plots 18 to 23: `is_unlocked = false`, `unlock_price = 3000`.
  - Plots 24 to 29: `is_unlocked = false`, `unlock_price = 5000`.
  - Plots 30 to 35: `is_unlocked = false`, `unlock_price = 10000`.
- Grant starter seeds into `farm_warehouse_items`: 5x `seed_rice`, 2x `seed_tomato`, 2x `feed_grain`.

---

## 4. Shared Game Data & Economic Models (`packages/game-data` & `packages/economy`)

A dedicated data specification module `packages/game-data/src/farm.ts` defines all authoritative items, growth dynamics, and pricing tables:

### 4.1 Crops Specification
| Crop ID | Name | Seed ID | Seed Price | Sell Price | Growth Time | Yield Range |
|---|---|---|---|---|---|---|
| `crop_rice` | Lúa Nước Nam Bộ | `seed_rice` | 30c | 45c | 300s (5m) | 2 - 4 |
| `crop_corn` | Bắp Ngô Ngọt | `seed_corn` | 50c | 80c | 600s (10m) | 2 - 3 |
| `crop_watermelon` | Dưa Hấu Ruột Đỏ | `seed_watermelon` | 120c | 200c | 1200s (20m) | 1 - 2 |
| `crop_tomato` | Cà Chua Bi | `seed_tomato` | 45c | 70c | 450s (7.5m) | 3 - 5 |
| `crop_chili` | Ớt Hiểm Cay Nồng | `seed_chili` | 60c | 95c | 500s (~8m) | 3 - 6 |

- **Growth Stages**:
  1. `seed` (0% - 25% of growth time)
  2. `sprout` (25% - 60% of growth time)
  3. `blooming` (60% - 100% of growth time)
  4. `mature` (100% reached, ready for harvesting)
  5. `withered` (soil dried out without water for > 24 hours while mature/growing)
- **Soil Hydration Rule**: A watered plot remains moist (`TILLED_WET`) for 1800s (30 minutes). Plants only progress in growth while soil is watered!
- **Fertilizer Effect**: `is_fertilized = true` halves total growth time by 50%.

### 4.2 Livestock Barns Specification
| Animal Type | Young Item ID | Young Price | Yield Product | Yield Price | Feed Interval | Base Happiness Boost |
|---|---|---|---|---|---|---|
| `chicken` | `animal_chicken` | 200c | `product_egg_chicken` | 15c | 900s (15m) | +15 |
| `duck` | `animal_duck` | 220c | `product_egg_duck` | 20c | 1200s (20m) | +15 |
| `pig` | `animal_pig` | 800c | `product_truffle` | 120c | 1800s (30m) | +20 |
| `cow` | `animal_cow` | 1800c | `product_milk_cow` | 80c | 2400s (40m) | +20 |
| `goat` | `animal_goat` | 1200c | `product_wool` | 100c | 2100s (35m) | +20 |

- Feeding requires feed items (`feed_grain`, `feed_corn_mash`, `feed_hay`) stored in the Farm Warehouse.
- Feeding resets `fed_at = now()`, adds happiness up to 100, and triggers production yield when the interval elapses.

### 4.3 Aquaculture Pond Specification
| Fish Species | Species ID | Fingerling Price | Market Weight | Sell Price / kg |
|---|---|---|---|---|
| Cá Tra | `tra` | 150c | 2.5 - 4.0 kg | 110c / kg |
| Cá Basa | `basa` | 180c | 2.0 - 3.5 kg | 130c / kg |
| Cá Lóc Bông | `loc` | 250c | 1.5 - 3.0 kg | 220c / kg |
| Tôm Càng Xanh | `tom_cang` | 300c | 0.4 - 0.8 kg | 900c / kg |

- Starting weight: 0.10 kg.
- Growth rate: Increases over real-time hours, boosted by regular daily feeding (`fed_at`).

### 4.4 Silo & Warehouse Model
- Initial capacity: 100 slots (each unique slot holds stack of items).
- Upgrade step: +50 slots per upgrade.
- Upgrade price: `capacity * 10` Coin (e.g. 100 -> 150 costs 1,000 Coin; 150 -> 200 costs 1,500 Coin).
- Isolated from Backpack: Crops, animal products, farm seeds, fertilizers, and feed live exclusively in `farm_warehouse_items`.

---

## 5. REST API Architecture (`apps/api/src/routes/farm.ts`)

All endpoints are registered under both `/api/farm/*` and `/farm/*` for full frontend/backend interoperability.

### 5.1 Endpoint Definitions & Signatures

```
1. GET /api/farm/me
   Auth: Player
   Response: {
     farm: { id, isPublic, hasPassword, warehouseCapacity, warehouseUsed },
     plots: FarmPlot[],
     animals: FarmAnimal[],
     warehouse: Record<'crop'|'livestock'|'seed'|'supply', WarehouseItem[]>,
     pond: FarmPondFish[],
     todayContracts: MarketContract[]
   }

2. PUT /api/farm/settings
   Auth: Player
   Body: { password?: string | null, isPublic?: boolean }
   Logic: If password supplied, hashes with argon2; updates settings.
   Response: { isPublic: boolean, hasPassword: boolean }

3. POST /api/farm/auth
   Auth: Player
   Body: { farmOwnerId: string, password?: string }
   Logic: Checks if farm is public. If private, verifies password against hash.
          Generates time-limited farm token in Redis (key: farm:access:{ownerId}:{visitorId}, TTL: 2h).
   Response: { allowed: boolean, farmToken?: string }

4. POST /api/farm/plots/unlock
   Auth: Player
   Headers: Idempotency-Key
   Body: { plotIndex: number }
   Logic: Checks plot not unlocked; validates unlock_price;
          postLedger(tx, { currency: 'coin', amount: -price, reason: 'farm_plot_unlock', idempotencyKey });
          Sets is_unlocked = true; emits Redis 'farm:updated'.
   Response: { plotIndex, isUnlocked: true, coin: balanceAfter }

5. POST /api/farm/plots/plant
   Auth: Player
   Body: { plotIndex: number, seedItemId: string }
   Logic: Checks plot is unlocked and empty (crop_id IS NULL).
          Decrements seed quantity in farm_warehouse_items (checks quantity >= 1).
          Sets crop_id, planted_at = now(), growth_stage = 'seed', watered_at = now() (if already wet).
          Emits Redis 'farm:updated'.
   Response: { plotIndex, cropId, plantedAt, growthStage }

6. POST /api/farm/plots/water
   Auth: Player (Owner OR Guest Co-op)
   Body: { farmOwnerId: string, plotIndex: number }
   Logic: Checks plot is unlocked and planted.
          Updates watered_at = now().
          If caller != farmOwnerId: awards guest with 1 Friendly Heart (Fame / Social points).
          Emits Redis 'farm:updated'.
   Response: { plotIndex, wateredAt, isGuestHelper: boolean, fameAwarded: number }

7. POST /api/farm/plots/harvest
   Auth: Player (STRICT OWNER ONLY)
   Body: { plotIndex: number }
   Logic: Forbids non-owner (throws 403 Forbidden).
          Calculates stage from server timestamps. If growth_stage != 'mature', throws 400 Bad Request.
          Calculates yield (e.g. 3x crop_rice).
          Verifies warehouse capacity: currentSlotCount <= warehouse_capacity.
          Increments crop in farm_warehouse_items.
          Clears plot state (crop_id = null, planted_at = null, watered_at = null, growth_stage = 'seed').
          Emits Redis 'farm:updated'.
   Response: { plotIndex, cropId, yieldQuantity, warehouseCount }

8. POST /api/farm/shop/buy
   Auth: Player
   Headers: Idempotency-Key
   Body: { itemId: string, quantity: number }
   Logic: Validates item in Tiệm Bác Sáu catalogue (seed, feed, fertilizer, young animal, fingerling).
          Computes total price = item.coinPrice * quantity.
          Checks warehouse capacity.
          postLedger(tx, { currency: 'coin', amount: -total, reason: 'farm_shop_buy', idempotencyKey });
          Increments item in farm_warehouse_items (or creates animal/fish directly if livestock).
   Response: { itemId, quantity, coin: balanceAfter }

9. POST /api/farm/shop/sell
   Auth: Player
   Body: { itemId: string, quantity: number, contractId?: string }
   Logic: Validates quantity in farm_warehouse_items.
          Decrements warehouse inventory.
          Calculates sale coin. If contractId supplied and matches Today's Contract:
            Adds +25% Coin bonus and Farmer Fame points!
          postLedger(tx, { currency: 'coin', amount: +totalEarned, reason: 'farm_shop_sell' });
   Response: { itemId, quantity, earnedCoin, bonusCoin, fameEarned, newCoinBalance }

10. POST /api/farm/animals/feed
    Auth: Player (Owner)
    Body: { animalId: string, feedItemId: string }
    Logic: Consumes 1 feed item from warehouse.
           Updates fed_at = now(), happiness = min(100, happiness + 20).
           If harvest interval met, yields product into warehouse.
    Response: { animalId, happiness, fedAt, yieldProduct?: string }

11. POST /api/farm/pond/stock
    Auth: Player (Owner)
    Body: { fishSpecies: 'tra' | 'basa' | 'loc' | 'tom_cang' }
    Logic: Consumes fingerling from warehouse.
           Inserts farm_pond_fishes row.
    Response: { id, fishSpecies, stockedAt, currentWeightKg: 0.10 }

12. POST /api/farm/warehouse/upgrade
    Auth: Player
    Headers: Idempotency-Key
    Body: {}
    Logic: Calculates upgrade price: capacity * 10.
           postLedger(tx, { currency: 'coin', amount: -cost, reason: 'farm_warehouse_upgrade', idempotencyKey });
           Increases warehouse_capacity by +50.
    Response: { newCapacity, coin: balanceAfter }
```

### 5.2 Internal Routes for Realtime Bridge (`apps/api/src/routes/internal.ts`)

To allow Colyseus `FarmRoom` to validate players and synchronize without direct DB coupling:

```ts
app.post('/internal/farm-access', async (req) => {
  requireInternal(req, ctx.config.INTERNAL_SECRET);
  const { ownerId, visitorId, farmToken } = z.object({
    ownerId: z.string().uuid(),
    visitorId: z.string().uuid(),
    farmToken: z.string().optional(),
  }).parse(req.body);

  if (ownerId === visitorId) {
    return { allowed: true, isOwner: true };
  }

  // 1. Check farm visibility
  const farm = await ctx.db.query<{ is_public: boolean; password_hash: string | null }>(
    'SELECT is_public, password_hash FROM farms WHERE user_id = $1',
    [ownerId]
  );
  const f = farm.rows[0];
  if (!f) return { allowed: false, isOwner: false };
  if (f.is_public) return { allowed: true, isOwner: false };

  // 2. Check token in Redis
  if (farmToken) {
    const cached = await ctx.redis.get(`farm:access:${ownerId}:${visitorId}`);
    if (cached === farmToken) return { allowed: true, isOwner: false };
  }

  return { allowed: false, isOwner: false };
});
```

---

## 6. Colyseus Realtime Server Integration (`apps/realtime`)

### 6.1 State Schema (`apps/realtime/src/schema.ts`)

```ts
import { MapSchema, Schema, type } from '@colyseus/schema';
import { PlayerState, RoomState } from './schema.js';

export class FarmPlotState extends Schema {
  @type('uint8') index = 0;
  @type('boolean') isUnlocked = false;
  @type('uint32') unlockPrice = 0;
  @type('string') cropId = '';
  @type('string') growthStage = 'seed';
  @type('boolean') isWatered = false;
  @type('boolean') isFertilized = false;
  @type('number') plantedAt = 0;
}

export class FarmAnimalState extends Schema {
  @type('string') id = '';
  @type('string') animalType = '';
  @type('string') name = '';
  @type('uint8') happiness = 100;
  @type('number') fedAt = 0;
}

export class FarmPondFishState extends Schema {
  @type('string') id = '';
  @type('string') species = '';
  @type('number') weightKg = 0.1;
}

export class FarmRoomState extends RoomState {
  @type('string') override kind = 'farm';
  @type('string') ownerId = '';
  @type('string') ownerName = '';
  @type('boolean') isPublic = false;
  @type({ map: FarmPlotState }) plots = new MapSchema<FarmPlotState>();
  @type({ map: FarmAnimalState }) animals = new MapSchema<FarmAnimalState>();
  @type({ map: FarmPondFishState }) fishes = new MapSchema<FarmPondFishState>();
}
```

### 6.2 `FarmRoom` Implementation (`apps/realtime/src/rooms/farm.ts`)

- **Class**: `FarmRoom extends BaseRoom`
- **Room Registration**: `gameServer.define('farm', FarmRoom).filterBy(['ownerId']);`
- **Presence Key**: `farm:${this.ownerId}`
- **Security & onAuth**:
  ```ts
  override async onAuth(client: Client, options: { token?: string; ownerId?: string; farmToken?: string }) {
    const session = (await super.onAuth(client, options)) as SessionInfo;
    const res = await getDeps().api.farmAccess(this.ownerId, session.userId, options.farmToken);
    if (!res.allowed) {
      throw new Error('Mật khẩu trang trại không chính xác hoặc trang trại ở chế độ riêng tư.');
    }
    return session;
  }
  ```
- **Co-op Gameplay Message Routing**:
  - `farm:water`: Allowed for Owner AND Visitor. Updates state and broadcasts `farm:remote_watered`. Awards heart if visitor.
  - `farm:harvest`: Strict check: `if (session.userId !== this.ownerId) { client.send('notice', { kind: 'error', text: 'Chỉ chủ nông trại mới có thể thu hoạch!' }); return; }`
  - `farm:pet_animal`: Allowed for all. Emits heart animation over the animal.
- **PubSub State Syncing**:
  Listens to Redis `farm:updated` channel to re-sync plots/animals/pond in memory when mutations occur via REST API.

---

## 7. Testing & Quality Gate Strategy

In accordance with `AGENTS.md` and repository requirements:

### 7.1 Realtime Room Unit Tests (`apps/realtime/src/rooms/farm.test.ts`)
Using Vitest and the exact mock pattern established in `bida.test.ts`:
1. Verify owner bypasses password and enters immediately.
2. Verify visitor without valid token is denied entry with exact error message.
3. Verify visitor with valid token enters successfully.
4. Verify visitor sending `farm:water` succeeds and triggers friendly heart response.
5. Verify visitor sending `farm:harvest` is strictly rejected with authorization notice.

### 7.2 API Integration Tests (`apps/api/test/farm.test.ts`)
Using `createHarness()`:
1. **Farm Provisioning**: Register user, GET `/api/farm/me` -> verifies starter plots, silo capacity 100, starter seeds.
2. **Access Control**: Register Owner and Visitor; Owner sets farm password; Visitor gets 401 on `/api/farm/auth` with wrong password; gets 200 with correct password and receives `farmToken`.
3. **Plot Unlocking & Idempotency**: Give user 10,000 Coin; POST `/api/farm/plots/unlock` with plot 6 (price 500); check balance decremented to 9,500; replay same request with same `Idempotency-Key` -> verifies no duplicate deduction.
4. **Planting, Watering & Growth**: Plant `seed_rice`; verify seed removed from silo; water plot; verify `watered_at` timestamp; advance clock past mature threshold; verify stage transitions to `mature`.
5. **Harvest & Silo Capacity**: Harvest plot; verify crop in silo inventory; test full warehouse scenario (filling capacity to 100) -> verify harvest rejected until silo upgraded via `/api/farm/warehouse/upgrade`.
6. **Shop Purchases & Contracts**: Buy from Bác Sáu shop; sell crops; complete Today's Market Contract and verify +25% Coin reward + Fame point accrual.
7. **Animal & Aquaculture Feeding**: Feed chicken and feed pond fish; verify happiness and weight gain.

### 7.3 Quality Commands
- `pnpm typecheck` (verifies entire monorepo TypeScript clean)
- `pnpm lint` (verifies ESLint compliance)
- `pnpm format:check` (verifies Prettier compliance)
- `pnpm test` (executes unit tests and integration tests)

---

## 8. Summary of Integration Touchpoints & File Matrix

| Component | Target File | Action | Description |
|---|---|---|---|
| **DB Migration** | `apps/api/migrations/0005_cozy_farm_system.sql` | Create | DDL for `farms`, `farm_plots`, `farm_animals`, `farm_warehouse_items`, `farm_pond_fishes` |
| **Game Data** | `packages/game-data/src/farm.ts` | Create | Crop data, animals, fish pond species, shop catalogue, warehouse categories |
| **Game Data Export** | `packages/game-data/src/index.ts` | Modify | Re-export `farm.js` |
| **API Farm Service** | `apps/api/src/services/farm.ts` | Create | Server-authoritative logic, timestamps, transactions, ledger mutations |
| **API Farm Routes** | `apps/api/src/routes/farm.ts` | Create | 12 REST endpoints with Zod validation and auth |
| **API Internal Routes**| `apps/api/src/routes/internal.ts` | Modify | Add `/internal/farm-access` endpoint |
| **API Server Entry** | `apps/api/src/app.ts` | Modify | Register `farmRoutes(app, full)` |
| **Realtime Client API**| `apps/realtime/src/api.ts` | Modify | Add `farmAccess` method to `ApiClient` |
| **Realtime Schema** | `apps/realtime/src/schema.ts` | Modify | Add `FarmPlotState`, `FarmAnimalState`, `FarmPondFishState`, `FarmRoomState` |
| **Realtime Farm Room** | `apps/realtime/src/rooms/farm.ts` | Create | `FarmRoom` extending `BaseRoom`, password auth, co-op rules |
| **Realtime Entry** | `apps/realtime/src/index.ts` | Modify | Register `gameServer.define('farm', FarmRoom)` and Redis subscription |
| **Realtime Unit Test** | `apps/realtime/src/rooms/farm.test.ts` | Create | Room permission and co-op unit tests |
| **API Integr. Test** | `apps/api/test/farm.test.ts` | Create | Complete Fastify + Postgres test harness suite |

---
*Report completed and verified against all requirements of ORIGINAL_REQUEST.md and docs/farm_system_plan.pdf.*
