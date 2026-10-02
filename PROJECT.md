# Project: Cozy Farm System (Hệ Thống Trang Trại Cá Nhân)

## Architecture
- **Monorepo Structure**:
  - `packages/game-data`: Authoritative game definitions, crop catalogs, livestock specs, pond species, shop inventories, town map layout and farm map coordinates.
  - `apps/api`: Fastify REST API, PostgreSQL database migrations (`0005_cozy_farm_system.sql`), ledger balance transactions with row-level locking and idempotency, Argon2id farm password hashing.
  - `apps/realtime`: Colyseus 0.15 WebSocket server, `FarmRoom` (`farm:${ownerId}`), state synchronization schemas, access control via `/internal/farm-access`, and co-op gameplay messaging.
  - `apps/web`: Phaser 3 game client, Pure Canvas 2D procedural rendering (scanline rasterization, pixel snap), React 19 UI modals and panels (`FarmPasswordModal`, `FarmPlotModal`, `FarmSiloPanel`, `FarmShopPanel`), Zustand store, Web Audio synthesizer effects.
- **Data Flow**:
  1. Client navigates to Western Town Gate (`farm_gate` zone) -> triggers scene transition.
  2. If visiting a private farm -> opens `FarmPasswordModal` -> calls `POST /api/farm/auth` -> receives session token.
  3. Client connects to Colyseus `FarmRoom` (`farm:${ownerId}`) with auth token -> `onAuth` validates credentials via internal API -> establishes realtime presence.
  4. Economic transactions (unlock plots, buy seeds, sell crops, feed animals, upgrade silo) execute via REST API with `Idempotency-Key` and ledger locks.
  5. API publishes `farm:updated` events to Redis -> `FarmRoom` broadcasts changes to connected room clients.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Town West Gate Portal | Western boundary opened, rustic bamboo gate, road sign, transition trigger | M1, M4 | survey |
| 2 | Colyseus FarmRoom Instance | Isolated room instance per owner (`farm:${ownerId}`) with onAuth | M3 | survey |
| 3 | Farm Password & Privacy Settings | Configure password hash or public access via PUT /api/farm/settings | M2 | survey |
| 4 | Farm Visitor Authentication | Visitor token verification via POST /api/farm/auth | M2 | survey |
| 5 | FarmPasswordModal UI | Natural wood modal, numeric virtual keypad, keyboard support, Esc dismiss | M5 | survey |
| 6 | Grid Plot Management | 36-plot grid (0..35), starter plots 0..3 unlocked, state tracking | M1, M2 | survey |
| 7 | Plot Unlock with Idempotency | Unlock plots via POST /api/farm/plots/unlock with coin deduction & replay safety | M2 | survey |
| 8 | Tilling & Soil Moisture | Hoe tilling and watering with 30m moisture decay | M1, M2 | survey |
| 9 | Seed Sowing (Gieo Hạt) | Plant seeds from silo via POST /api/farm/plots/plant | M2 | survey |
| 10 | Real-time Crop Growth | Seed -> Sprout -> Blooming -> Mature stages calculated server-side | M1, M2 | survey |
| 11 | Organic Bio-Fertilizer | Halves crop growth time (-50%) via is_fertilized flag | M1, M2 | survey |
| 12 | Crop Harvesting | Harvest mature crops to silo via POST /api/farm/plots/harvest (owner only) | M2 | survey |
| 13 | Helping Hand (Tưới Nước Hộ) | Visitors water friend's crops via POST /api/farm/plots/water for Fame/Hearts | M2, M3 | survey |
| 14 | Poultry Coop (Chuồng Gia Cầm) | Chickens & ducks, straw nests, feeding grain, egg yields, 2-frame anims | M1, M2, M4 | survey |
| 15 | Cattle Pasture (Chuồng Bò) | Dairy cows, wooden manger, hay feeding, milk yield, 2-frame anims | M1, M2, M4 | survey |
| 16 | Pig Pen (Chuồng Heo Mọi) | Pigs in mud pit, corn mash feeding, truffle/meat yield, 2-frame anims | M1, M2, M4 | survey |
| 17 | Goat & Sheep Pen (Chuồng Dê & Cừu) | Goats & sheep on elevated ramps, wool/goat milk yield, 2-frame anims | M1, M2, M4 | survey |
| 18 | Animal Feeding & Happiness | POST /api/farm/animals/feed, happiness score (0..100), yield triggers | M2 | survey |
| 19 | Farm Warehouse Silo Storage | Independent storage from Backpack, 100 base capacity | M1, M2, M5 | survey |
| 20 | Warehouse Capacity Upgrades | POST /api/farm/warehouse/upgrade, +50 slots per tier with coin deduction | M2, M5 | survey |
| 21 | 4-Tab Categorization | Silo tabs: Crops, Animal Products, Seeds/Stocks, Supplies | M5 | survey |
| 22 | Bác Sáu Supplies Store | POST /api/farm/shop/buy, seeds, feed, young stock, fertilizer | M2, M5 | survey |
| 23 | Wholesale Produce Sell | POST /api/farm/shop/sell, wholesale sell of crops and animal products | M2, M5 | survey |
| 24 | Daily Market Contracts | Today's supply contracts giving +25% Coin bonus and Farmer Fame | M1, M2, M5 | survey |
| 25 | Fish Pond Stocking | POST /api/farm/pond/stock, fingerlings (tra, basa, loc, tom_cang) | M1, M2 | survey |
| 26 | Aquaculture Daily Feeding | Feed pond fish for biomass weight increase | M2 | survey |
| 27 | Fish Growth & Weight Tracking | Server-authoritative growth curve from juvenile to specialty | M1, M2 | survey |
| 28 | Dragnet & Hand Rod Harvest | Bulk harvest to silo and angling interactions | M2, M4 | survey |
| 29 | Waterwheel Aerator | Spinning paddlewheel with bubble foam, -15% rearing time | M4 | survey |
| 30 | 2.5D Rural Pure Canvas Art | Scanline rasterization, pixel snap, Nam Bo color palette, zero image files | M4 | survey |
| 31 | FarmScene Phaser Scene | 48x32 map, camera clamping, collision blockers, E prompts, audio synth | M4 | survey |
| 32 | Plot Detail & Farming HUD | Interactive plot control modal / HUD panel for planting/watering/harvesting | M5 | survey |
| 33 | Farm Warehouse Panel | Interactive 4-tab Silo modal with capacity progress bar & upgrade button | M5 | survey |
| 34 | Bác Sáu Shop Panel | Interactive trade modal with buy supplies tab and sell/contracts tab | M5 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Requirement-driven opaque-box E2E test harness & suites (Tiers 1-4) -> TEST_READY.md | none | DONE (65 tests ready) |
| M1 | Data Models & Database Foundation | PostgreSQL migration `0005_cozy_farm_system.sql`, `@cozy/game-data` farm specifications & town map portal | none | DONE (Passed Gate: 58 tests + 47 challenge tests, clean audit) |
| M2 | Server-Authoritative API & Economic Ledger | Fastify REST endpoints under `/api/farm/*`, internal auth route, ledger transactions, idempotency replay, tests | M1 | IN_PROGRESS |
| M3 | Realtime Colyseus FarmRoom & Co-op Security | Colyseus `FarmRoom`, state schemas, `onAuth` access check, co-op watering and anti-theft rules, room unit tests | M1, M2 | PLANNED |
| M4 | Pure Canvas 2D Graphics & FarmScene | Procedural pixel art (`farm-landscape.ts`, `farm-props.ts`), town gate visuals, `FarmScene.ts`, sound synth | M1 | PLANNED |
| M5 | Farm UI Panels, Modals & Client Integration | React modals (`FarmPasswordModal`, `FarmPlotModal`, `FarmSiloPanel`, `FarmShopPanel`), Game.tsx wiring, A11y controls | M2, M3, M4 | PLANNED |
| M6 | Final Integration & Adversarial Hardening | Pass 100% E2E test suite (Tiers 1-4) followed by Tier 5 Adversarial Hardening and Full Quality Gate | E2E, M1-M5 | PLANNED |

## Interface Contracts

### 1. Database & Game Data (`packages/game-data` ↔ `apps/api`)
- Types in `packages/game-data/src/farm.ts`:
  - `CropDef`: `{ id, name, seedItemId, seedPrice, sellPrice, growthDurationSec, baseYieldMin, baseYieldMax }`
  - `AnimalDef`: `{ type, name, stockPrice, yieldItem, yieldPrice, feedIntervalSec, happinessBoost }`
  - `PondFishDef`: `{ species, name, fingerlingPrice, marketWeightMinKg, marketWeightMaxKg, pricePerKg }`
  - `ShopItemDef`: `{ id, name, category, coinPrice, description }`
  - `MarketContractDef`: `{ id, title, requiredItemId, requiredQuantity, rewardCoin, rewardFame }`

### 2. Fastify REST API (`apps/api/src/routes/farm.ts`)
- All endpoints accept/return JSON. Errors throw `AppError(status, code, message)`:
  - `GET /api/farm/me`: returns `{ farm, plots, animals, warehouse, pondFishes, todayContracts }`
  - `PUT /api/farm/settings`: body `{ isPublic?: boolean, password?: string | null }` -> `{ ok: true, isPublic, hasPassword }`
  - `POST /api/farm/auth`: body `{ farmOwnerId, password }` -> `{ ok: true, farmAuthToken }` (401 if wrong password)
  - `POST /api/farm/plots/unlock`: header `Idempotency-Key`, body `{ plotIndex }` -> `{ ok: true, plotIndex, coinBalance }`
  - `POST /api/farm/plots/plant`: body `{ plotIndex, seedItemId }` -> `{ ok: true, plot }`
  - `POST /api/farm/plots/water`: body `{ farmOwnerId, plotIndex }` -> `{ ok: true, wateredAt, isGuestHelper, fameAwarded }`
  - `POST /api/farm/plots/harvest`: body `{ plotIndex }` -> `{ ok: true, harvestedItem, quantity }` (403 if caller != owner)
  - `POST /api/farm/shop/buy`: header `Idempotency-Key`, body `{ itemId, quantity }` -> `{ ok: true, coinBalance, purchased }`
  - `POST /api/farm/shop/sell`: body `{ itemId, quantity, contractId? }` -> `{ ok: true, coinEarned, bonusPercent, fameEarned }`
  - `POST /api/farm/animals/feed`: body `{ animalId, feedItemId }` -> `{ ok: true, fedAt, happiness }`
  - `POST /api/farm/pond/stock`: body `{ fishSpecies }` -> `{ ok: true, fish }`
  - `POST /api/farm/warehouse/upgrade`: header `Idempotency-Key` -> `{ ok: true, newCapacity, coinBalance }`

### 3. API ↔ Colyseus Internal Bridge (`apps/api/src/routes/internal.ts`)
- `POST /internal/farm-access`:
  - Headers: `x-internal-secret`
  - Body: `{ ownerId: string, visitorId: string, farmToken?: string }`
  - Response: `{ allowed: boolean, isOwner: boolean }`

### 4. Colyseus Realtime Room (`apps/realtime/src/rooms/farm.ts`)
- Room definition: `gameServer.define('farm', FarmRoom).filterBy(['ownerId'])`
- Client messages:
  - `farm:water`: `{ plotIndex: number }` -> validates & broadcasts `farm:plot_watered`
  - `farm:harvest`: `{ plotIndex: number }` -> verifies owner only; rejects visitor with error notice
  - `farm:pet`: `{ animalId: string }` -> emits heart emote above animal

### 5. Client Navigation & Networking (`apps/web/src/game/net.ts`)
- `Net.goFarm(ownerId: string, label?: string, passwordToken?: string)`
- Zustand `useUi.getState().setRoom({ kind: 'farm', ownerId, label })`

## Code Layout
- `apps/api/migrations/0005_cozy_farm_system.sql`: DB schema for farms, plots, animals, warehouse, pond
- `packages/game-data/src/farm.ts`: Authoritative farm catalog, growth curves, prices, contracts
- `packages/game-data/src/map.ts`: Town map portal at west border (`farm_gate` zone) & farm map constants
- `apps/api/src/services/farm.ts`: Core farm simulation & transaction business logic
- `apps/api/src/routes/farm.ts`: Fastify route handlers
- `apps/api/src/routes/internal.ts`: Fastify internal bridge
- `apps/realtime/src/schema.ts`: Colyseus state schemas
- `apps/realtime/src/rooms/farm.ts`: Colyseus FarmRoom implementation
- `apps/web/src/art/farm-landscape.ts`: Pure Canvas ground, canals, fences
- `apps/web/src/art/farm-props.ts`: Pure Canvas procedural assets (plots, barns, animals, silo, shop, pond)
- `apps/web/src/game/scenes.ts`: Phaser `FarmScene` class
- `apps/web/src/screens/FarmPasswordModal.tsx`: Password auth modal
- `apps/web/src/screens/FarmPlotModal.tsx`: Plot interaction modal
- `apps/web/src/screens/FarmSiloPanel.tsx`: Warehouse silo panel
- `apps/web/src/screens/FarmShopPanel.tsx`: Bác Sáu shop & contracts panel
