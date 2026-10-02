# Handoff Report: Backend & Colyseus Exploration for Cozy Farm System

**Handoff Type**: Hard (Task Complete)  
**Agent**: survey_backend_explorer  
**Parent Orchestrator ID**: `d39205dd-01db-4096-9bff-542cd3821c40`  
**Report File**: `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\survey_backend_explorer\report.md`  

---

## 1. Observation

1. **Database & Migration Architecture**:
   - Database connection is managed via raw `pg.Pool` in `apps/api/src/db.ts:12-14` (`export function createPool(connectionString: string, max = 10): Db`).
   - Transactions are executed via `apps/api/src/db.ts:16-29` (`export async function withTx<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T>`).
   - Migrations are run automatically by `apps/api/src/migrate.ts:14-37`, which scans `apps/api/migrations/*.sql` and checks against table `schema_migrations`.
   - Existing migrations in `apps/api/migrations/`:
     - `0001_init.sql` (line 1-311: users, sessions, profiles, balances, ledger_entries, apartments, etc.)
     - `0002_fish_journal.sql`
     - `0003_fish_inventory.sql`
     - `0004_fishing_rods.sql`
     - Sequential next migration is `0005_cozy_farm_system.sql`.
   - Economic transactions and idempotency are enforced by `postLedger` in `apps/api/src/ledger.ts:33-72`. It locks the balance row (`SELECT coin AS value FROM balances WHERE user_id = $1 FOR UPDATE`), checks `next < 0`, and inserts into `ledger_entries` with `idempotency_key UNIQUE`. Duplicate submissions violate `ledger_entries_idempotency_key_key` (Postgres error `23505`) which services replay (e.g. `apps/api/src/services/shop.ts:67-85`).

2. **Web Framework & REST Routing**:
   - `apps/api/src/app.ts:4` initializes Fastify (`Fastify(...)`).
   - Authentication is mounted as an `onRequest` hook `authHook(ctx.db)` (`apps/api/src/app.ts:79`), which populates `req.user: AuthUser` (`apps/api/src/auth.ts:7-13, 85-90`).
   - Error handler in `apps/api/src/app.ts:92-119` catches `AppError` and Zod's `ZodError`, returning formatted JSON `{ error: { code, message, details } }`.
   - Existing route registration in `apps/api/src/app.ts:153-155`:
     ```ts
     playerRoutes(app, full);
     adminRoutes(app, full);
     internalRoutes(app, full);
     ```
   - Password hashing uses Argon2id (`@node-rs/argon2`) in `apps/api/src/auth.ts:24-26`.

3. **Colyseus Realtime Server**:
   - Server entrypoint is `apps/realtime/src/index.ts:62-73`:
     ```ts
     const gameServer = new Server({ ... });
     gameServer.define('town', TownRoom);
     gameServer.define('apartment', ApartmentRoom).filterBy(['ownerId']);
     ...
     ```
   - Rooms extend `BaseRoom` (`apps/realtime/src/rooms/base.ts:38-248`), which handles 20 Hz authoritative movement, chat flood control, player presence in Redis (`presence:online`), and base `onAuth` session resolution.
   - Private rooms like `ApartmentRoom` (`apps/realtime/src/rooms/apartment.ts:35-47`) check permissions during `onAuth` by querying the API via `getDeps().api.apartment(...)`.
   - Redis PubSub (`apps/realtime/src/index.ts:74-97`) listens to `player:appearance`, `player:kick`, `apartment:updated`, `events`.

4. **Testing Infrastructure**:
   - Root test script: `"test": "node --test infra/deploy/deploy.test.mjs infra/deploy/windows-common.test.mjs && pnpm -r --workspace-concurrency=1 test"` in `package.json:19`.
   - In-memory unit tests in `@cozy/realtime` and `@cozy/game-data` and `@cozy/economy` pass instantly (e.g. `pnpm --filter @cozy/realtime test` executed 12 tests in 507ms with Vitest).
   - `apps/realtime/src/rooms/bida.test.ts:10-100` establishes the unit test pattern for Colyseus rooms by mocking `BaseRoom.prototype.setup` and `tick`, spying on `room.onMessage`, and validating server-authoritative message handlers and permissions.
   - API tests in `apps/api/test/` use `createHarness()` (`apps/api/test/harness.ts:81-127`) with `Fastify.inject`. They run against the local test database `cozy_test` (port 55432).

---

## 2. Logic Chain

1. **Step 1: Database Schema Strategy**:
   - *From Observation 1*: The database uses plain Postgres migrations tracked in `schema_migrations`.
   - *Deduction*: To implement the Cozy Farm System tables (`farms`, `farm_plots`, `farm_animals`, `farm_warehouse_items`, `farm_pond_fishes`), a new migration `apps/api/migrations/0005_cozy_farm_system.sql` must be created.
   - *Deduction*: Auto-provisioning the default farm (36 plots, starter plots unlocked, initial seeds in warehouse) must occur idempotently on first player access to `GET /api/farm/me`.

2. **Step 2: Server-Authoritative Economic Mutations**:
   - *From Observation 1 & 2*: All coin balances must be modified strictly via `postLedger(tx, { currency: 'coin', amount: -cost, reason, idempotencyKey })` with row locks.
   - *Deduction*: Plot unlocking (`POST /api/farm/plots/unlock`), Bác Sáu shop purchases (`POST /api/farm/shop/buy`), and Silo warehouse upgrades (`POST /api/farm/warehouse/upgrade`) must accept an `Idempotency-Key` header and follow the replay pattern in `apps/api/src/services/shop.ts`.

3. **Step 3: Farm Access Control & Co-op Rules**:
   - *From Observation 2 & 3*: `FarmRoom` will be registered as `gameServer.define('farm', FarmRoom).filterBy(['ownerId'])`.
   - *Deduction*: In `FarmRoom.onAuth`, the owner (`session.userId === this.ownerId`) is admitted unconditionally. Visitors (`session.userId !== this.ownerId`) require either `is_public = true` or a valid `farmToken` verified via `/internal/farm-access` or Redis `farm:access:${ownerId}:${visitorId}`.
   - *Deduction*: In `FarmRoom.onMessage('farm:water')`, guests are allowed to water plots (and earn friendly hearts/Fame), but in `farm:harvest`, non-owners are strictly rejected server-side to prevent crop theft.

4. **Step 4: Realtime State Synchronization**:
   - *From Observation 3*: State changes initiated from REST endpoints (e.g. planting seeds or harvesting) must immediately reflect in active `FarmRoom` instances.
   - *Deduction*: The REST API will publish an event on the Redis channel `farm:updated` with `{ ownerId }`, causing `apps/realtime/src/index.ts` to reload the memory state of the relevant `FarmRoom`.

---

## 3. Caveats

- **Docker Environment for Full API Tests**: Running `apps/api/test` requires running Postgres (`127.0.0.1:55432`) and Redis (`127.0.0.1:56379`) via `pnpm deps:up`. When testing without Docker, unit tests should be isolated to `@cozy/realtime` and `@cozy/game-data`.
- **Canvas Art Decoupling**: Frontend Phaser rendering in `FarmScene` and canvas art generation in `apps/web/src/art/farm-*.ts` are purely visual consumers of the server-authoritative data models and schemas documented here.

---

## 4. Conclusion

The backend and realtime architecture for the Cozy Farm System is completely specified and fully aligned with existing project conventions. 
- Migration: `apps/api/migrations/0005_cozy_farm_system.sql`.
- REST Endpoints: 12 server-authoritative endpoints under `apps/api/src/routes/farm.ts` with business logic in `apps/api/src/services/farm.ts`.
- Colyseus Room: `FarmRoom` in `apps/realtime/src/rooms/farm.ts` with schema in `apps/realtime/src/schema.ts` and entrypoint registration in `apps/realtime/src/index.ts`.
- Testing: Comprehensive test matrices designed for Vitest in `apps/realtime/src/rooms/farm.test.ts` and `apps/api/test/farm.test.ts`.

Detailed blueprints and code listings are published in `report.md`.

---

## 5. Verification Method

1. **Verify Report Files**:
   - Inspect `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\survey_backend_explorer\report.md`.
2. **Typecheck Integrity**:
   - Run `pnpm typecheck` to verify monorepo compilation status.
3. **Existing Realtime Test Suite**:
   - Run `pnpm --filter @cozy/realtime test` to verify Vitest room test execution.
