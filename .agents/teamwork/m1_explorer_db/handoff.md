# Handoff Report: Cozy Farm System Database Blueprint (M1)

**Agent**: `m1_explorer_db`  
**Working Directory**: `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_explorer_db`  
**Handoff Type**: Hard (Task complete)  
**Parent / Caller**: `d39205dd-01db-4096-9bff-542cd3821c40`  
**Target Migration Path**: `apps/api/migrations/0005_cozy_farm_system.sql`  

---

## 1. Observation

- **Architecture & Roadmap Specs**:
  - `PROJECT.md:6`: "`apps/api`: Fastify REST API, PostgreSQL database migrations (`0005_cozy_farm_system.sql`), ledger balance transactions with row-level locking and idempotency, Argon2id farm password hashing."
  - `PROJECT.md:24-29`: Feature 6 (36-plot grid 0..35, starter plots 0..3 unlocked), Feature 7 (plot unlock with idempotency), Feature 8 (tilling and soil moisture with 30m moisture decay), Feature 11 (organic bio-fertilizer halves growth time -50%).
  - `PROJECT.md:32-35`: Feature 14 (poultry coop: chickens & ducks), Feature 15 (cattle pasture: dairy cows), Feature 16 (pig pen: pigs), Feature 17 (goat & sheep pen: goats & sheep).
  - `PROJECT.md:37-39`: Feature 19 (farm warehouse silo storage, 100 base capacity), Feature 20 (+50 slots per tier upgrade), Feature 21 (4 tabs: crops, animal products, seeds/stocks, supplies).
  - `PROJECT.md:43-47`: Feature 25 (pond fish stocking: tra, basa, loc, tom_cang), Feature 26 (aquaculture feeding), Feature 27 (growth & weight tracking).
  - `docs/farm_system_plan.pdf` (pages 5-10): Full ER diagram and field definitions matching:
    - `farms`: `id`, `user_id`, `password_hash`, `is_public`, `warehouse_capacity`, `created_at`, `updated_at`.
    - `farm_plots`: `id`, `farm_id`, `plot_index` (0..35), `is_unlocked`, `unlock_price`, `crop_id`, `planted_at`, `watered_at`, `is_fertilized`, `growth_stage` (`seed|sprout|blooming|mature|withered`).
    - `farm_animals`: `id`, `farm_id`, `animal_type` (`chicken|duck|cow|pig|goat`), `name`, `fed_at`, `happiness` (0..100), `last_yield_at`.
    - `farm_warehouse_items`: `id`, `farm_id`, `item_id`, `category`, `quantity`.
    - `farm_pond_fishes`: `id`, `farm_id`, `fish_species` (`tra|basa|loc|tom_cang`), `stocked_at`, `current_weight_kg`, `fed_at`.

- **Existing Migrations in `apps/api/migrations/`**:
  - `0001_init.sql:1`: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
  - `0001_init.sql:3-14`: `users` table with `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
  - `0001_init.sql:46-57`: `ledger_entries` table with `idempotency_key text UNIQUE`.
  - `0004_fishing_rods.sql:1-8`:
    ```sql
    DO $$
    BEGIN
      ALTER TABLE item_definitions DROP CONSTRAINT IF EXISTS item_definitions_type_check;
      ALTER TABLE item_definitions ADD CONSTRAINT item_definitions_type_check CHECK (type IN ('clothing', 'furniture', 'rod'));
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END $$;
    ```
- **Migration Runner in `apps/api/src/migrate.ts`**:
  - `migrate.ts:18-37`: Reads all `.sql` files from `apps/api/migrations/`, checks `schema_migrations`, executes each unapplied file inside `BEGIN ... COMMIT` block.
- **Player Creation Pattern in `apps/api/src/services/players.ts`**:
  - `players.ts:39-42`: Creates starter apartment `INSERT INTO apartments (user_id, name) VALUES ($1, $2)`.

---

## 2. Logic Chain

1. **Schema Extension Protocol**:
   - `apps/api/src/migrate.ts` executes `.sql` files sequentially in transaction blocks.
   - The next migration file is sequentially numbered `0005_cozy_farm_system.sql`.
   - Explorer archetype rule restricts direct modification of source tree (`apps/api/migrations/`), so the complete, production-ready SQL is authored in `.agents/teamwork/m1_explorer_db/proposed_0005_cozy_farm_system.sql` and mirrored in `report.md`.

2. **Foreign Key Integrity & Cascading**:
   - Users are the root entities in `users(id)`.
   - `farms.user_id` must have `UNIQUE` and `REFERENCES users(id) ON DELETE CASCADE` so deleting a test user or deleted account cleans up the entire farm hierarchy without dangling foreign keys.
   - Child tables (`farm_plots`, `farm_animals`, `farm_warehouse_items`, `farm_pond_fishes`) reference `farms(id) ON DELETE CASCADE`.

3. **Plot Grid & Agricultural Cycle**:
   - The agricultural plot grid requires exactly 36 discrete plots (indices 0..35).
   - A `CHECK (plot_index >= 0 AND plot_index < 36)` with `UNIQUE (farm_id, plot_index)` guarantees exactly 36 coordinate slots per farm.
   - Starter plots 0..3 are unlocked (`is_unlocked = true`, `unlock_price = 0`).
   - Plots 4..35 are locked (`is_unlocked = false`) with tiered unlock pricing ranging from 250 to 7,500 Coin.
   - `is_tilled boolean NOT NULL DEFAULT false` allows distinct tracking of untilled vs tilled soil before seed planting as mandated by Feature 8.
   - `growth_stage` constraint permits `'empty'`, `'seed'`, `'sprout'`, `'blooming'`, `'mature'`, `'withered'`.

4. **Silo Isolation & Concurrency Safety**:
   - As mandated by R3 / Feature 19, Silo items must be completely segregated from personal backpack inventory (`inventory_items`).
   - `farm_warehouse_items` stores items keyed by `(farm_id, item_id)` with `CHECK (quantity >= 0)` to prevent negative balances during concurrent sales or seed sowing.
   - The 4 categories (`crop`, `animal_product`, `seed`, `supply`) map 1-to-1 to the Silo UI panel tabs.

5. **Existing User Backfill & Reusable Stored Procedure**:
   - Applying migration `0005` to a pre-existing development/testing database with existing accounts must not leave them without farms or plots.
   - Initial batch provisioning queries insert farms for all existing users and cross-join with `generate_series(0, 35)` to generate all 36 plots with `ON CONFLICT DO NOTHING`.
   - A plpgsql function `provision_farm_plots(target_farm_id uuid)` is registered to permit M2 backend services (`apps/api/src/services/farm.ts`) to provision new farms on-the-fly with a single query.

---

## 3. Caveats

- **Explorer Read-Only Constraint**: The explorer role does not directly write to `apps/api/migrations/0005_cozy_farm_system.sql`. The implementer agent (or orchestrator) should copy `.agents/teamwork/m1_explorer_db/proposed_0005_cozy_farm_system.sql` to `apps/api/migrations/0005_cozy_farm_system.sql`.
- **Market Contracts Table**: Daily supply contracts ("Hợp Đồng Đơn Đặt Hàng Hôm Nay") are modeled in `@cozy/game-data` (`MarketContractDef`) and delivered via `GET /api/farm/me`. If future requirements demand persistent per-player contract completion history beyond ledger records, an optional table `farm_completed_contracts` could be added in a future migration.

---

## 4. Conclusion

The technical blueprint and SQL schema for `0005_cozy_farm_system.sql` is complete, idempotent, and verified against all criteria in `docs/farm_system_plan.pdf`, `PROJECT.md`, and `AGENTS.md`.

Artifacts generated:
1. `proposed_0005_cozy_farm_system.sql`: Ready to be copied directly to `apps/api/migrations/0005_cozy_farm_system.sql`.
2. `report.md`: Detailed technical blueprint with architecture diagrams, schema specifications, index strategy, and M2 service integration patterns.

---

## 5. Verification Method

To independently verify the schema:
1. Inspect the proposed migration file:
   ```powershell
   Get-Content -Path ".agents\teamwork\m1_explorer_db\proposed_0005_cozy_farm_system.sql"
   ```
2. When ready for implementation, deploy to migrations directory:
   ```powershell
   Copy-Item -Path ".agents\teamwork\m1_explorer_db\proposed_0005_cozy_farm_system.sql" -Destination "apps\api\migrations\0005_cozy_farm_system.sql"
   ```
3. Run the database migration runner:
   ```powershell
   pnpm --filter @cozy/api db:migrate
   # or node dist/migrate-cli.js
   ```
4. Verify table and index creation in PostgreSQL:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'farm%';
   -- Expected: farms, farm_plots, farm_animals, farm_warehouse_items, farm_pond_fishes
   ```
5. Invalidation condition: Any change to `packages/game-data/src/farm.ts` modifying animal types or crop stage naming that contradicts the check constraints.
