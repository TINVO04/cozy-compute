# Technical Blueprint & Database Migration: Cozy Farm System (M1)

**Agent**: `m1_explorer_db`  
**Date**: 2026-10-02  
**Target Migration**: `apps/api/migrations/0005_cozy_farm_system.sql`  
**Proposed Artifact**: `.agents/teamwork/m1_explorer_db/proposed_0005_cozy_farm_system.sql`  
**Reference Docs**: `docs/farm_system_plan.pdf`, `PROJECT.md`, `AGENTS.md`

---

## 1. Executive Summary

This report establishes the complete PostgreSQL database architecture for the **Cozy Farm System** (Hệ Thống Trang Trại Cá Nhân) in the Cozy Compute Social MMO. 

The system implements five core authoritative tables:
1. `farms`: Root farm record per player (1-to-1 with `users`), security controls (password hashing, privacy toggle), and warehouse capacity.
2. `farm_plots`: 36-plot cultivation grid (indices 0..35), starter plots (0..3 unlocked), tiered unlock pricing, tilling state, crop lifecycle states, moisture decay timestamp, and organic bio-fertilizer status.
3. `farm_animals`: Livestock and poultry records (poultry coops, cattle pastures, pig pens, goat/sheep pens), pet names, happiness (0..100), feeding schedules, and yield tracking.
4. `farm_warehouse_items`: Dedicated Silo inventory separated from personal backpacks, supporting 4 smart categorization tabs (`crop`, `animal_product`, `seed`, `supply`) with strict non-negative quantity guarantees.
5. `farm_pond_fishes`: Aquaculture pond system tracking Mekong / Nam Bo freshwater fish species, fingerling stocking, weight growth curves, and feeding history.

All tables utilize UUID primary keys via PostgreSQL's `gen_random_uuid()`, enforce cascading deletions upon user deletion (`ON DELETE CASCADE`), maintain strict integrity checks, and include composite indexes optimized for high-frequency game loop queries.

---

## 2. Codebase Investigation Findings

### 2.1 Existing Migration Architecture
An inspection of `apps/api/src/migrate.ts` confirms:
- Migrations reside in `apps/api/migrations/` and are sorted alphabetically by filename.
- Execution is tracked in the table `schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`.
- Each migration is executed inside a transaction (`BEGIN ... COMMIT`) via a dedicated PostgreSQL client connection.
- Prior migrations are:
  - `0001_init.sql`: Core tables (`users`, `sessions`, `profiles`, `balances`, `ledger_entries`, `item_definitions`, `inventory_items`, `apartments`, `apartment_objects`, etc.).
  - `0002_fish_journal.sql`: Natural fishing journal table.
  - `0003_fish_inventory.sql`: Held fish and inventory table.
  - `0004_fishing_rods.sql`: Rod item type constraint alteration.

### 2.2 Compatibility & Design Decisions
- **UUID & Cryptography**: `CREATE EXTENSION IF NOT EXISTS pgcrypto;` was initiated in `0001_init.sql`, allowing default `gen_random_uuid()` without requiring external UUID generators.
- **Timestamps**: All tables use `timestamptz NOT NULL DEFAULT now()` to preserve millisecond-precision timestamps across timezones.
- **Ledger & Balances**: In accordance with `AGENTS.md` and `apps/api/src/ledger.ts`, coin deductions (unlocking plots, buying seeds, purchasing animals, upgrading warehouse capacity) do **not** directly update coin balances in the database tables; they run through `postLedger()` with `FOR UPDATE` row locking and `idempotency_key`. The `farm_plots.unlock_price` column serves as the authoritative reference cost.
- **Item Definitions Constraint**: In `0004_fishing_rods.sql`, `item_definitions` was altered to allow `CHECK (type IN ('clothing', 'furniture', 'rod'))`. To prevent future constraint collisions when farm items are seeded or referenced, migration `0005` safely extends this constraint to include `'seed'`, `'crop'`, `'animal_product'`, and `'farm_supply'`.

---

## 3. Data Model & Entity Specifications

```
                       +-------------------------+
                       |          USERS          |
                       +-------------------------+
                                    | 1
                                    | owns (CASCADE)
                                    v 1
                       +-------------------------+
                       |          FARMS          |
                       +-------------------------+
                         |      |       |      |
             +-----------+      |       |      +-----------+
             | 1..36            | 0..*  | 0..*             | 0..*
             v                  v       v                  v
     +--------------+   +-------------+ +----------------+ +------------------+
     |  FARM_PLOTS  |   | FARM_ANIMALS| | FARM_WAREHOUSE | | FARM_POND_FISHES |
     +--------------+   +-------------+ +----------------+ +------------------+
```

### 3.1 `farms`
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id`: `uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE`
  - 1-to-1 relationship between user and farm.
- `password_hash`: `text DEFAULT NULL`
  - Argon2id hash for private access verification. Nullable when public or unconfigured.
- `is_public`: `boolean NOT NULL DEFAULT true`
  - If `true`, visitors enter freely without password prompt. If `false`, visitors must supply password.
- `warehouse_capacity`: `integer NOT NULL DEFAULT 100 CHECK (warehouse_capacity >= 100)`
  - Base silo capacity is 100 slots. Upgraded via `POST /api/farm/warehouse/upgrade` by +50 slots per tier.
- `created_at`, `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Indexes**:
  - `farms_user_id_uq` on `user_id` (Unique).
  - `farms_is_public_idx` on `is_public`.

### 3.2 `farm_plots`
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `farm_id`: `uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE`
- `plot_index`: `smallint NOT NULL CHECK (plot_index >= 0 AND plot_index < 36)`
  - 6x6 agricultural grid representing 36 discrete plots (0..35).
- `is_unlocked`: `boolean NOT NULL DEFAULT false`
  - Plots 0..3 are unlocked by default for new farms. Plots 4..35 require coin unlocking.
- `unlock_price`: `integer NOT NULL DEFAULT 0 CHECK (unlock_price >= 0)`
  - Tiered progression matching economy specifications:
    - Plots 0..3: 0 Coin (Free starter plots)
    - Plots 4..7: 250 Coin
    - Plots 8..11: 500 Coin
    - Plots 12..15: 1,000 Coin
    - Plots 16..19: 1,500 Coin
    - Plots 20..23: 2,500 Coin
    - Plots 24..27: 3,500 Coin
    - Plots 28..31: 5,000 Coin
    - Plots 32..35: 7,500 Coin
- `crop_id`: `text DEFAULT NULL`
  - Identifier matching `@cozy/game-data` crop catalog (`rice`, `corn`, `watermelon`, `tomato`, `chili`).
- `planted_at`: `timestamptz DEFAULT NULL`
  - Base timestamp used for server-authoritative crop growth computation.
- `watered_at`: `timestamptz DEFAULT NULL`
  - Moisture timestamp. Soil remains wet for 30 minutes (`30m moisture decay`).
- `is_fertilized`: `boolean NOT NULL DEFAULT false`
  - When true, crop growth time is halved (-50%).
- `growth_stage`: `text NOT NULL DEFAULT 'empty' CHECK (growth_stage IN ('empty', 'seed', 'sprout', 'blooming', 'mature', 'withered'))`
- `is_tilled`: `boolean NOT NULL DEFAULT false`
  - Tracks whether soil has been hoed (untilled -> tilled) before seed sowing.
- `created_at`, `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Constraints & Indexes**:
  - `UNIQUE (farm_id, plot_index)`: Guarantees no duplicate plots within the same farm.
  - `farm_plots_farm_id_idx` on `farm_id`.
  - `farm_plots_farm_crop_idx` on `(farm_id, crop_id) WHERE crop_id IS NOT NULL`.
  - `farm_plots_growth_idx` on `(farm_id, growth_stage)`.
  - `farm_plots_watered_idx` on `(farm_id, watered_at)`.

### 3.3 `farm_animals`
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `farm_id`: `uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE`
- `animal_type`: `text NOT NULL CHECK (animal_type IN ('chicken', 'duck', 'cow', 'pig', 'goat', 'sheep'))`
- `name`: `text NOT NULL DEFAULT ''` (Player-assigned pet name).
- `fed_at`: `timestamptz DEFAULT NULL` (Last fed timestamp).
- `happiness`: `integer NOT NULL DEFAULT 50 CHECK (happiness BETWEEN 0 AND 100)`
- `last_yield_at`: `timestamptz DEFAULT NULL` (Timestamp of last harvested yield, e.g. eggs, milk, wool).
- `created_at`, `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Indexes**:
  - `farm_animals_farm_id_idx` on `farm_id`.
  - `farm_animals_type_idx` on `(farm_id, animal_type)`.
  - `farm_animals_fed_idx` on `(farm_id, fed_at)`.

### 3.4 `farm_warehouse_items`
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `farm_id`: `uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE`
- `item_id`: `text NOT NULL` (Catalog item identifier).
- `category`: `text NOT NULL CHECK (category IN ('crop', 'animal_product', 'seed', 'supply'))`
  - Maps to the 4 Silo UI tabs.
- `quantity`: `integer NOT NULL DEFAULT 0 CHECK (quantity >= 0)`
  - Check constraint prevents negative inventory values during concurrent transactions.
- `created_at`, `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Constraints & Indexes**:
  - `UNIQUE (farm_id, item_id)`: Item stacking within a farm's warehouse.
  - `farm_warehouse_farm_id_idx` on `farm_id`.
  - `farm_warehouse_category_idx` on `(farm_id, category)`.

### 3.5 `farm_pond_fishes`
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `farm_id`: `uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE`
- `fish_species`: `text NOT NULL CHECK (fish_species IN ('tra', 'basa', 'loc', 'tom_cang', 'bong_tuong'))`
- `stocked_at`: `timestamptz NOT NULL DEFAULT now()`
- `current_weight_kg`: `numeric(6,2) NOT NULL DEFAULT 0.10 CHECK (current_weight_kg >= 0)`
- `fed_at`: `timestamptz DEFAULT NULL`
- `growth_stage`: `text NOT NULL DEFAULT 'juvenile' CHECK (growth_stage IN ('fingerling', 'juvenile', 'adult', 'specialty'))`
- `created_at`, `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Indexes**:
  - `farm_pond_fishes_farm_id_idx` on `farm_id`.
  - `farm_pond_fishes_species_idx` on `(farm_id, fish_species)`.
  - `farm_pond_fishes_fed_idx` on `(farm_id, fed_at)`.

---

## 4. Provisioning & Data Lifecycle Strategy

### 4.1 Migration-Time Initial Provisioning
To avoid leaving existing player accounts in an uninitialized state when applying migration `0005`, the migration includes deterministic, idempotent seed queries:
1. `INSERT INTO farms (user_id, is_public, warehouse_capacity) SELECT id, true, 100 FROM users ON CONFLICT (user_id) DO NOTHING;`
2. `INSERT INTO farm_plots (...) SELECT ... FROM farms CROSS JOIN generate_series(0, 35) ON CONFLICT (farm_id, plot_index) DO NOTHING;`

### 4.2 Reusable Stored Procedure: `provision_farm_plots`
To allow backend application services (`apps/api/src/services/farm.ts` or `apps/api/src/services/players.ts`) to initialize new farms created in the future with a single database roundtrip, the migration provides:
```sql
CREATE OR REPLACE FUNCTION provision_farm_plots(target_farm_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO farm_plots (
    farm_id, plot_index, is_unlocked, unlock_price, growth_stage, is_tilled
  )
  SELECT
    target_farm_id,
    s.idx,
    CASE WHEN s.idx < 4 THEN true ELSE false END,
    CASE
      WHEN s.idx < 4 THEN 0
      WHEN s.idx BETWEEN 4 AND 7 THEN 250
      WHEN s.idx BETWEEN 8 AND 11 THEN 500
      WHEN s.idx BETWEEN 12 AND 15 THEN 1000
      WHEN s.idx BETWEEN 16 AND 19 THEN 1500
      WHEN s.idx BETWEEN 20 AND 23 THEN 2500
      WHEN s.idx BETWEEN 24 AND 27 THEN 3500
      WHEN s.idx BETWEEN 28 AND 31 THEN 5000
      ELSE 7500
    END,
    'empty',
    false
  FROM generate_series(0, 35) AS s(idx)
  ON CONFLICT (farm_id, plot_index) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Complete SQL Migration Code

```sql
-- ============================================================================
-- Migration: 0005_cozy_farm_system.sql
-- Description: Cozy Farm System database schema for Cozy Compute Social MMO.
-- Tables created:
--   1. farms
--   2. farm_plots
--   3. farm_animals
--   4. farm_warehouse_items
--   5. farm_pond_fishes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. FARMS TABLE
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  password_hash text DEFAULT NULL,
  is_public boolean NOT NULL DEFAULT true,
  warehouse_capacity integer NOT NULL DEFAULT 100 CHECK (warehouse_capacity >= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS farms_user_id_uq ON farms (user_id);
CREATE INDEX IF NOT EXISTS farms_is_public_idx ON farms (is_public);

-- 2. FARM_PLOTS TABLE
CREATE TABLE IF NOT EXISTS farm_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  plot_index smallint NOT NULL CHECK (plot_index >= 0 AND plot_index < 36),
  is_unlocked boolean NOT NULL DEFAULT false,
  unlock_price integer NOT NULL DEFAULT 0 CHECK (unlock_price >= 0),
  crop_id text DEFAULT NULL,
  planted_at timestamptz DEFAULT NULL,
  watered_at timestamptz DEFAULT NULL,
  is_fertilized boolean NOT NULL DEFAULT false,
  growth_stage text NOT NULL DEFAULT 'empty' CHECK (growth_stage IN ('empty', 'seed', 'sprout', 'blooming', 'mature', 'withered')),
  is_tilled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, plot_index)
);

CREATE INDEX IF NOT EXISTS farm_plots_farm_id_idx ON farm_plots (farm_id);
CREATE INDEX IF NOT EXISTS farm_plots_farm_crop_idx ON farm_plots (farm_id, crop_id) WHERE crop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS farm_plots_growth_idx ON farm_plots (farm_id, growth_stage);
CREATE INDEX IF NOT EXISTS farm_plots_watered_idx ON farm_plots (farm_id, watered_at);

-- 3. FARM_ANIMALS TABLE
CREATE TABLE IF NOT EXISTS farm_animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  animal_type text NOT NULL CHECK (animal_type IN ('chicken', 'duck', 'cow', 'pig', 'goat', 'sheep')),
  name text NOT NULL DEFAULT '',
  fed_at timestamptz DEFAULT NULL,
  happiness integer NOT NULL DEFAULT 50 CHECK (happiness BETWEEN 0 AND 100),
  last_yield_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farm_animals_farm_id_idx ON farm_animals (farm_id);
CREATE INDEX IF NOT EXISTS farm_animals_type_idx ON farm_animals (farm_id, animal_type);
CREATE INDEX IF NOT EXISTS farm_animals_fed_idx ON farm_animals (farm_id, fed_at);

-- 4. FARM_WAREHOUSE_ITEMS TABLE
CREATE TABLE IF NOT EXISTS farm_warehouse_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  category text NOT NULL CHECK (category IN ('crop', 'animal_product', 'seed', 'supply')),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, item_id)
);

CREATE INDEX IF NOT EXISTS farm_warehouse_farm_id_idx ON farm_warehouse_items (farm_id);
CREATE INDEX IF NOT EXISTS farm_warehouse_category_idx ON farm_warehouse_items (farm_id, category);

-- 5. FARM_POND_FISHES TABLE
CREATE TABLE IF NOT EXISTS farm_pond_fishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  fish_species text NOT NULL CHECK (fish_species IN ('tra', 'basa', 'loc', 'tom_cang', 'bong_tuong')),
  stocked_at timestamptz NOT NULL DEFAULT now(),
  current_weight_kg numeric(6,2) NOT NULL DEFAULT 0.10 CHECK (current_weight_kg >= 0),
  fed_at timestamptz DEFAULT NULL,
  growth_stage text NOT NULL DEFAULT 'juvenile' CHECK (growth_stage IN ('fingerling', 'juvenile', 'adult', 'specialty')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farm_pond_fishes_farm_id_idx ON farm_pond_fishes (farm_id);
CREATE INDEX IF NOT EXISTS farm_pond_fishes_species_idx ON farm_pond_fishes (farm_id, fish_species);
CREATE INDEX IF NOT EXISTS farm_pond_fishes_fed_idx ON farm_pond_fishes (farm_id, fed_at);

-- 6. ITEM_DEFINITIONS CONSTRAINT EXPANSION
DO $$
BEGIN
  ALTER TABLE item_definitions DROP CONSTRAINT IF EXISTS item_definitions_type_check;
  ALTER TABLE item_definitions ADD CONSTRAINT item_definitions_type_check
    CHECK (type IN ('clothing', 'furniture', 'rod', 'seed', 'crop', 'animal_product', 'farm_supply'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 7. REUSABLE PROVISIONING FUNCTION
CREATE OR REPLACE FUNCTION provision_farm_plots(target_farm_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO farm_plots (
    farm_id,
    plot_index,
    is_unlocked,
    unlock_price,
    growth_stage,
    is_tilled
  )
  SELECT
    target_farm_id,
    s.idx,
    CASE WHEN s.idx < 4 THEN true ELSE false END,
    CASE
      WHEN s.idx < 4 THEN 0
      WHEN s.idx BETWEEN 4 AND 7 THEN 250
      WHEN s.idx BETWEEN 8 AND 11 THEN 500
      WHEN s.idx BETWEEN 12 AND 15 THEN 1000
      WHEN s.idx BETWEEN 16 AND 19 THEN 1500
      WHEN s.idx BETWEEN 20 AND 23 THEN 2500
      WHEN s.idx BETWEEN 24 AND 27 THEN 3500
      WHEN s.idx BETWEEN 28 AND 31 THEN 5000
      ELSE 7500
    END,
    'empty',
    false
  FROM generate_series(0, 35) AS s(idx)
  ON CONFLICT (farm_id, plot_index) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 8. INITIAL PROVISIONING QUERIES FOR EXISTING DATA
INSERT INTO farms (user_id, is_public, warehouse_capacity)
SELECT id, true, 100
FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO farm_plots (
  farm_id,
  plot_index,
  is_unlocked,
  unlock_price,
  growth_stage,
  is_tilled
)
SELECT
  f.id,
  s.idx,
  CASE WHEN s.idx < 4 THEN true ELSE false END,
  CASE
    WHEN s.idx < 4 THEN 0
    WHEN s.idx BETWEEN 4 AND 7 THEN 250
    WHEN s.idx BETWEEN 8 AND 11 THEN 500
    WHEN s.idx BETWEEN 12 AND 15 THEN 1000
    WHEN s.idx BETWEEN 16 AND 19 THEN 1500
    WHEN s.idx BETWEEN 20 AND 23 THEN 2500
    WHEN s.idx BETWEEN 24 AND 27 THEN 3500
    WHEN s.idx BETWEEN 28 AND 31 THEN 5000
    ELSE 7500
  END,
  'empty',
  false
FROM farms f
CROSS JOIN generate_series(0, 35) AS s(idx)
ON CONFLICT (farm_id, plot_index) DO NOTHING;
```

---

## 6. Downstream Integration Guide for M2 (API & Backend Services)

When building `apps/api/src/services/farm.ts` and `apps/api/src/routes/farm.ts`:
1. **Farm Initialization for New Players**:
   When a user signs up or first hits `GET /api/farm/me`:
   ```ts
   const farm = await tx.query<{ id: string }>(
     `INSERT INTO farms (user_id, is_public, warehouse_capacity)
      VALUES ($1, true, 100)
      ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
      RETURNING id`,
     [userId]
   );
   await tx.query(`SELECT provision_farm_plots($1)`, [farm.rows[0].id]);
   ```
2. **Authoritative Plot Growth Validation**:
   Calculate stages deterministically using:
   - `duration = cropDef.growthDurationSec * (plot.is_fertilized ? 0.5 : 1.0)`
   - Elapsed seconds since `planted_at`.
   - Ensure soil moisture (`watered_at`) requirement is satisfied during growth ticks.
3. **Idempotent Unlocking & Purchasing**:
   - Call `postLedger(tx, { userId, currency: 'coin', amount: -plot.unlock_price, reason: 'plot_unlock', idempotencyKey })`.
   - Update `is_unlocked = true` where `farm_id = $1 AND plot_index = $2 AND is_unlocked = false`.
