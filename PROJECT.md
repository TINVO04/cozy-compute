# Project: Cozy Compute Vehicle Asset Pack & Runtime System

## Architecture

- **Data & Schema Layer (`packages/game-data`)**:
  - `src/vehicles.ts`: Single source of truth for all 16 vehicle definitions, stats (speed, price, brand, color), geometry specs (bodyWidth <= 40, contactY = 37, seat x=24 y=16..20, lights dx*20 dy*18), aliases (`car_sunset` -> `cars/lamborghini-aventador`, `car_mercedes` -> `cars/mercedes-benz-g63`), and town road limits (`TOWN_ROADS`).
  - `src/items.ts`: Auto-maps `VEHICLES` into `ITEM_SEEDS` for item definitions and inventory.
- **Client Asset & Texture Pipeline (`apps/web`)**:
  - `src/art/vehicle-loader.ts`: Dynamic async asset loader fetching static PNG packs (`spritesheet.png`, `preview.png`, `icon.png`, `meta.json`) from `public/vehicles/` and updating Phaser `CanvasTexture` in-place with zero downtime.
  - `src/art/vehicle.ts`: Procedural canvas fallback rendering 48x40 px vehicle frames synchronously on initial access, guaranteeing zero crash/blank screen.
- **Player & Physics Runtime (`apps/web` & `apps/realtime`)**:
  - `src/game/players.ts`: Vehicle mounting/dismounting (`V` key), 2-wheeler torso crop `(0, 0, 32, 40)` with waist at seat `(24, 16..20)`, 4-wheeler avatar hiding, contact shadow, and 4-frame drive animation loop (frames 1..3 moving, frame 0 idle).
  - `src/game/vehicle-lights.ts`: Raytracing/shader lighting alignment with headlights `(frontX = x + dx * 20, frontY = y - 10 + dy * 18)` and taillights `(x - dx * 18, y - 10 - dy * 18)`.
- **Showroom & UI Panels (`apps/web`)**:
  - `src/game/showroom-art.ts`: 4 featured pedestals `136 × 66 px`, vehicles scaled 2x with crisp pixel-art filtering.
  - `src/screens/panels/VehicleShopPanel.tsx`: Vehicle catalog preview `144 × 120 px` (3x integer scale) with 4-directional rotation ("Xoay xe").
  - `src/art/items.ts`: Inventory item icons resolving to vehicle preview/icon.
- **Asset Storage (`assets/vehicles/` & `apps/web/public/vehicles/`)**:
  - Standardized directory layout for 16 models across `bicycles/`, `motorcycles/`, and `cars/`.

## Feature Inventory

| #   | Feature                                | Description                                                                                                                       | Milestone | Source              |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------- |
| 1   | 16-Model Vehicle Catalog & Schema      | Expand `VEHICLES` to all 16 target models with speeds, prices, brands, dimensions, and type definitions                           | M1        | Survey / Req R2     |
| 2   | Backward Compatibility Mapping         | Maintain `car_sunset` and `car_mercedes` aliases and existing speeds (300, 285 px/s) to prevent breaking existing tests/db        | M1        | Survey / Req R1, R2 |
| 3   | Dynamic Asset Loader Module            | Create `vehicle-loader.ts` for async PNG asset loading with in-place Phaser `CanvasTexture` refresh                               | M2        | Survey / Req R1     |
| 4   | Procedural Canvas Fallback             | Preserve synchronous `vehicleCanvas()` fallback for missing/loading assets with zero downtime                                     | M2        | Survey / Req R1     |
| 5   | Bicycle Asset Pack (1 model)           | `bicycles/trek-marlin-7`: spritesheet 192x160 (4x4 48x40), preview.png, icon.png, meta.json                                       | M3        | Survey / Req R2     |
| 6   | Motorcycle Asset Packs (7 models)      | Vespa Primavera 150, Ducati Panigale V4, Honda Super Cub, Harley Fat Boy, Kawasaki Ninja H2, Yamaha R1, BMW R1250 GS              | M3        | Survey / Req R2     |
| 7   | Car Asset Packs (8 models)             | Mercedes G63, Lamborghini Aventador, Porsche 911, Toyota Supra MK4, Ferrari F40, Ford Mustang, Rolls-Royce Phantom, Tesla Model S | M3        | Survey / Req R2     |
| 8   | Asset Grid & Geometry Standard         | 192x160 spritesheet, 48x40 frames, contact y=37, body width <= 40px (prevents TOWN_ROADS off_road fine)                           | M3        | Survey / Req R2     |
| 9   | Public Asset Mirroring                 | Ensure `apps/web/public/vehicles/` has identical assets accessible to Vite dev and production build                               | M3        | Survey / Req R1     |
| 10  | 2-Wheel Mounting Geometry              | Seat center x=24, y=16..20; avatar crop (0,0,32,40); baseSpriteY-4; footpeg/pedal alignment                                       | M4        | Survey / Req R3     |
| 11  | 4-Wheel Mounting & Shadow              | Avatar hidden (`setVisible(!driving)`), cabin windshield depth, contact ground shadow at y=0                                      | M4        | Survey / Req R3     |
| 12  | 4-Frame Drive Animation                | Drive animation cycling frames 1..3 when moving, frame 0 when idle for all vehicle classes                                        | M4        | Survey / Req R3     |
| 13  | Headlight & Taillight Raytracing       | Beam emitter at `(dx*20, dy*18)` and taillights at `(-dx*18, -dy*18)` with additive blending                                      | M4        | Survey / Req R3     |
| 14  | Showroom Pedestal Integration          | 136x66 px pedestal, scale 2x, pixel-perfect nearest filtering                                                                     | M5        | Survey / Req R4     |
| 15  | VehicleShopPanel 3x Preview & Rotation | 144x120 px preview (3x scale), 4-directional rotation button ("Xoay xe")                                                          | M5        | Survey / Req R4     |
| 16  | Inventory Item Definitions & Icons     | Sync vehicle icons to `item_definitions` and `art/items.ts`                                                                       | M5        | Survey / Req R4     |
| 17  | Opaque-Box E2E Test Suite              | Requirement-driven test harness and test cases covering Tiers 1-4                                                                 | E2E Track | Survey / Req AC     |
| 18  | Quality Gate & Playwright Verification | 100% pass on game-data test, web test, typecheck, lint, and Playwright verification scripts                                       | M6        | Survey / Req AC     |

## Milestones

| #   | Name                           | Scope                                                                                                                             | Dependencies | Status      |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| E2E | E2E Testing Track              | Independent requirement-driven test suite (Tiers 1-4) creating `TEST_INFRA.md` & `TEST_READY.md`                                  | none         | IN_PROGRESS |
| M1  | Data Layer & Compatibility     | Expand `packages/game-data/src/vehicles.ts`, types, `VEHICLE_ALIASES`, road width bounds                                          | none         | READY       |
| M2  | Dynamic Asset Loader           | `apps/web/src/art/vehicle-loader.ts`, in-place Phaser texture refresh, procedural fallback                                        | M1           | PLANNED     |
| M3  | 16 Vehicle Asset Packs         | Generate pixel-art spritesheets (192x160), preview.png, icon.png, meta.json in `assets/vehicles/` and `apps/web/public/vehicles/` | M1           | PLANNED     |
| M4  | Mounting Geometry & Lighting   | `apps/web/src/game/players.ts` 2-wheel crop/seat alignment, 4-wheel hide, 4-frame drive animation, `VehicleLights` raytracing     | M2, M3       | PLANNED     |
| M5  | Showroom & Shop UI Integration | Showroom 136x66 2x pedestal, VehicleShopPanel 3x 4-way rotation, item definitions icons                                           | M3, M4       | PLANNED     |
| M6  | Final E2E Pass & Hardening     | Phase 1: Pass 100% E2E tests (Tiers 1-4); Phase 2: Adversarial Tier 5 hardening loop, audit, and quality gate check               | E2E, M1-M5   | PLANNED     |

## Interface Contracts

### `packages/game-data` ↔ `apps/web` (Vehicle Data Contract)

- `VEHICLES`: `Record<string, VehicleDef>` with:
  ```ts
  export interface VehicleDef {
    id: string;
    kind: 'car' | 'motorcycle' | 'bicycle';
    name: string;
    brand: string;
    price: number;
    speed: number;
    color: string;
    assetPath?: string;
    description?: string;
  }
  ```
- `VEHICLE_ALIASES`: `Record<string, string>` mapping `car_sunset` -> `cars/lamborghini-aventador`, `car_mercedes` -> `cars/mercedes-benz-g63`, and path aliases to canonical IDs.
- `vehicleById(id)`: Resolves canonical ID or alias to `VehicleDef`.

### Dynamic Loader ↔ Phaser Texture Cache (`apps/web`)

- `ensureVehicleTexture(scene: Phaser.Scene, id: string, dir: number, frame = 0): string`
  - Returns synchronous key `vehicle:${id}:${dir}:${frame}`.
  - If texture missing, immediately creates CanvasTexture with `vehicleCanvas(id, dir, frame)` fallback.
  - Asynchronously requests PNG asset and upon load, writes onto canvas via `drawImage()` and calls `texture.refresh()`.
- Spritesheet Layout:
  - Total Dimensions: `192 × 160 px` (4 columns × 4 rows of `48 × 40 px` frames).
  - Row 0: Down (dir 0). Row 1: Left (dir 1). Row 2: Right (dir 2). Row 3: Up (dir 3).
  - Col 0: Idle (frame 0). Col 1: Drive 1 (frame 1). Col 2: Drive 2 (frame 2). Col 3: Drive 3 (frame 3).

### Avatar Mounting Contract (`apps/web/src/game/players.ts`)

- 2-wheel: `seat.x = 24`, `seat.y = 16..20`, `sprite.setCrop(0, 0, 32, 40)`, `sprite.y = baseSpriteY - 4`.
- 4-wheel: `sprite.setVisible(!driving)`.
- Ground contact baseline: `wheelBottomY = 37` in frame -> `+3 px` container coordinate, flush with ground shadow at `(0, 0)`.
- Max body width: `bodyWidth <= 40 px`.

### Lighting Raytracing Contract (`apps/web/src/game/vehicle-lights.ts`)

- `frontX = x + dx * 20`, `frontY = y - 10 + dy * 18`.
- `rearX = x - dx * 18`, `rearY = y - 10 - dy * 18`.

## Code Layout

- `packages/game-data/src/vehicles.ts`: Data definitions, dimensions, constants. Owned by M1.
- `packages/game-data/src/vehicles.test.ts`: Data tests. Owned by M1 / E2E.
- `apps/web/src/art/vehicle-loader.ts`: Dynamic texture loader. Owned by M2.
- `apps/web/src/art/vehicle.ts`: Procedural canvas fallback. Owned by M2.
- `assets/vehicles/` and `apps/web/public/vehicles/`: Asset packs (16 folders). Owned by M3.
- `apps/web/src/game/players.ts`: Avatar mounting, drive animation. Owned by M4.
- `apps/web/src/game/vehicle-lights.ts`: Raytracing lights alignment. Owned by M4.
- `apps/web/src/game/showroom-art.ts`: Showroom pedestal rendering. Owned by M5.
- `apps/web/src/screens/panels/VehicleShopPanel.tsx`: Shop preview & rotation. Owned by M5.
- `apps/web/src/art/items.ts`: Inventory icons. Owned by M5.
- `tests/e2e/vehicles/`: E2E opaque-box test suite. Owned by E2E Testing Track.
