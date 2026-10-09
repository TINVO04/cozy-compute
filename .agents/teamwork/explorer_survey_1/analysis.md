# Detailed Vehicle Data Layer & Catalog Survey Report

**Project**: Cozy Compute Social MMO — Vehicle Asset Pack & Integration  
**Date**: 2026-10-08  
**Investigator**: `explorer_survey_1`  
**Working Directory**: `.agents/teamwork/explorer_survey_1/`  
**Target Milestone**: Survey & Scope Mapping (Data Layer, Catalog Definitions, Compatibility)

---

## 1. Executive Summary

This investigation analyzed the data layer, schemas, database models, test assertions, and backward-compatibility mechanisms for vehicles across the Cozy Compute Social MMO workspace (`@cozy/game-data`, `@cozy/api`, `@cozy/realtime`, and `@cozy/web`).

### Key Findings:
1. **Current Catalog Size**: `packages/game-data/src/vehicles.ts` currently defines **8 vehicles** (`bicycle_sky`, `motorcycle_coral`, `motorcycle_ducati`, `car_mint`, `car_mercedes`, `car_sunset`, `car_lamborghini`, `car_porsche`).
2. **Missing Definitions**: To meet the authoritative requirements for **16 distinct models** (1 bicycle, 7 motorcycles, 8 cars), **10 brand-new vehicle definitions** must be added to the data catalog.
3. **Empty Asset Directories**: The 16 target directory paths already exist in `assets/vehicles/`, but are currently empty:
   - 1 Bicycle: `bicycles/trek-marlin-7`
   - 7 Motorcycles: `motorcycles/vespa-primavera-150`, `motorcycles/ducati-panigale-v4`, `motorcycles/honda-super-cub`, `motorcycles/harley-davidson-fat-boy`, `motorcycles/kawasaki-ninja-h2`, `motorcycles/yamaha-yzf-r1`, `motorcycles/bmw-r1250-gs`
   - 8 Cars: `cars/mercedes-benz-g63`, `cars/lamborghini-aventador`, `cars/porsche-911`, `cars/toyota-supra-mk4`, `cars/ferrari-f40`, `cars/ford-mustang`, `cars/rolls-royce-phantom`, `cars/tesla-model-s`
4. **Backward Compatibility Criticality**: `car_sunset` and `car_mercedes` are actively referenced in database profiles, integration tests (`apps/api/test/vehicles.test.ts`, `apps/realtime/src/rooms/vehicles.test.ts`, `packages/game-data/src/vehicles.test.ts`), and client dealer art (`apps/web/src/art/vehicle.ts`). They **must not be removed or broken**. A dedicated alias mapping mechanism (`VEHICLE_ALIASES`) is required so legacy IDs seamlessly resolve to canonical models.
5. **Schema Gaps**: Currently, `VEHICLES` is typed only as an ad-hoc inline type (`{ id, kind, name, brand, price, speed, color, description }`). It lacks exported strongly-typed interfaces for mounting seat coordinates (`x = 24, y = 16..20`), light raytracing anchors (`dx * 20, dy * 18`), body width tolerance (`<= 40 px`), wheel contact point (`y = 37 px`), and asset folder references.
6. **Automated Seeding Ready**: `apps/api/src/migrate.ts` automatically maps `ITEM_SEEDS` (which directly consumes `VEHICLES`) into PostgreSQL `item_definitions` via `ON CONFLICT (id) DO UPDATE`. Expanding `VEHICLES` cleanly propagates all 16 vehicles into the server economy.

---

## 2. Current State Audit

### 2.1 File Map & Responsibilities

| File Path | Role in Vehicle System | Current State |
|---|---|---|
| `packages/game-data/src/vehicles.ts` | Authoritative vehicle catalog, road geometry, showroom bounds, traffic lights, and fines | Defines 8 vehicles, 4 showroom featured displays, 4 road segments, 4 intersections |
| `packages/game-data/src/items.ts` | Item seed generation from `VEHICLES` | Maps `Object.values(VEHICLES)` into `ITEM_SEEDS` with `type: 'vehicle'`, `slot: 'vehicle'` |
| `packages/game-data/src/appearance.ts` | Player avatar appearance sanitization | Sanitizes `appearance.vehicle` (ensures clients cannot self-assert vehicle ownership) |
| `packages/game-data/src/vehicles.test.ts` | Unit tests for traffic signals, red-light crossing, off-road slowdown, brand checks | Asserts signals, red lights, and speeds/brands for `car_mint`, `car_sunset`, `car_mercedes`, `car_lamborghini`, `car_porsche`, `motorcycle_ducati` |
| `apps/api/src/services/shop.ts` | Server-authoritative purchase and equip logic | Enforces physical showroom presence (`position.room === 'showroom'`) for vehicle purchases; handles `/inventory/equip` |
| `apps/api/src/migrate.ts` | PostgreSQL reference data seeder | Upserts `ITEM_SEEDS` into `item_definitions` on migration/startup |
| `apps/api/test/vehicles.test.ts` | API integration test suite | Tests purchase idempotency, unowned equipment rejection, showroom presence requirement for `car_mint`, `car_sunset`, `bicycle_sky`, `motorcycle_coral` |
| `apps/realtime/src/rooms/town.ts` | Authoritative physics, speed enforcement, and traffic ticketing | Applies `drivingSpeed(p.vehicle, p.x, p.y, !this.trafficEnforcementEnabled)`, dismounts on tickets |
| `apps/realtime/src/rooms/vehicles.test.ts` | Realtime Colyseus vehicle test suite | Tests vehicle mounting, dismounting, off-road checks, red lights for `bicycle_sky`, `motorcycle_coral`, `motorcycle_ducati`, `car_mercedes`, `car_lamborghini` |
| `apps/web/src/art/vehicle.ts` | Fallback procedural canvas renderer (`vehicleCanvas`, `ensureVehicleTexture`) | Canvas rendering for 8 vehicles; includes `paintVehicleDealer` rendering `car_mint` and `car_sunset` |
| `apps/web/src/game/players.ts` | Client avatar mounting & animation controller | Sets crop `(0, 0, 32, 40)` and `sprite.y = baseSpriteY - 4` for 2-wheelers; hides avatar for 4-wheelers |
| `apps/web/src/game/vehicle-lights.ts` | Replicated headlight & taillight beam rendering | Renders dual headlights for cars, single beam for 2-wheelers, red taillights at rear |
| `apps/web/src/screens/panels/VehicleShopPanel.tsx` | In-game vehicle shop & rotation modal | Renders vehicle preview (scale 3x), rotation controls (4 directions), buy/equip buttons |
| `apps/web/src/game/showroom-art.ts` | Showroom interior rendering & plinth themes | Defines `platformThemes` for 8 vehicles (`underglow`, `rim`, `deck`) |

---

## 3. The 16 Target Vehicles Catalog Specification

The authoritative user request specifies **16 vehicle models** divided into 3 categories:
- **1 Bicycle**
- **7 Motorcycles**
- **8 Cars**
Plus explicit backward-compatibility support for `car_sunset` and `car_mercedes`.

### Comprehensive 16-Vehicle Matrix

| Category | Asset Folder Slug | Recommended Canonical ID | Legacy Alias | Brand | Real-World Model Name | Base Speed (px/s) | Speed Ratio (vs Walk 150) | Price (Coin) | Theme Color | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **Bicycle** | `bicycles/trek-marlin-7` | `bicycle_sky` | `bicycle_trek_marlin_7` | Trek | Trek Marlin 7 Gen 3 | 195 | 1.30× | 200 | `#0284c7` | Exists |
| **Motorcycle** | `motorcycles/vespa-primavera-150` | `motorcycle_coral` | `motorcycle_vespa_primavera_150` | Vespa | Vespa Primavera 150 | 270 | 1.80× | 700 | `#f43f5e` | Exists |
| **Motorcycle** | `motorcycles/ducati-panigale-v4` | `motorcycle_ducati` | `motorcycle_ducati_panigale_v4` | Ducati | Ducati Panigale V4 S | 310 | 2.07× | 2,400 | `#dc2626` | Exists |
| **Motorcycle** | `motorcycles/honda-super-cub` | `motorcycle_honda_super_cub` | — | Honda | Honda Super Cub C125 | 220 | 1.47× | 500 | `#1e3a8a` | **NEW** |
| **Motorcycle** | `motorcycles/harley-davidson-fat-boy` | `motorcycle_harley_fat_boy` | — | Harley-Davidson | Harley-Davidson Fat Boy 114 | 250 | 1.67× | 1,600 | `#18181b` | **NEW** |
| **Motorcycle** | `motorcycles/kawasaki-ninja-h2` | `motorcycle_kawasaki_ninja_h2` | — | Kawasaki | Kawasaki Ninja H2 Carbon | 330 | 2.20× | 3,000 | `#16a34a` | **NEW** |
| **Motorcycle** | `motorcycles/yamaha-yzf-r1` | `motorcycle_yamaha_r1` | — | Yamaha | Yamaha YZF-R1M | 315 | 2.10× | 2,600 | `#2563eb` | **NEW** |
| **Motorcycle** | `motorcycles/bmw-r1250-gs` | `motorcycle_bmw_r1250_gs` | — | BMW | BMW R 1250 GS Adventure | 260 | 1.73× | 2,200 | `#0284c7` | **NEW** |
| **Car** | `cars/mercedes-benz-g63` | `car_mint` | `cars/mercedes-benz-g63`, `car_mercedes_benz_g63` | Mercedes-Benz | Mercedes-Benz G63 AMG | 240 | 1.60× | 1,800 | `#1b4332` | Exists |
| **Car** | `cars/lamborghini-aventador` | `car_lamborghini` | `cars/lamborghini-aventador`, `car_lamborghini_aventador` | Lamborghini | Lamborghini Aventador SVJ | 340 | 2.27× | 4,500 | `#eab308` | Exists |
| **Car** | `cars/porsche-911` | `car_porsche` | `cars/porsche-911`, `car_porsche_911` | Porsche | Porsche 911 GT3 RS | 320 | 2.13× | 3,600 | `#0284c7` | Exists |
| **Car** | `cars/toyota-supra-mk4` | `car_toyota_supra_mk4` | — | Toyota | Toyota Supra MK4 (A80) | 290 | 1.93× | 2,500 | `#ea580c` | **NEW** |
| **Car** | `cars/ferrari-f40` | `car_ferrari_f40` | — | Ferrari | Ferrari F40 | 335 | 2.23× | 4,200 | `#dc2626` | **NEW** |
| **Car** | `cars/ford-mustang` | `car_ford_mustang` | — | Ford | Ford Mustang GT | 275 | 1.83× | 2,000 | `#2563eb` | **NEW** |
| **Car** | `cars/rolls-royce-phantom` | `car_rolls_royce_phantom` | — | Rolls-Royce | Rolls-Royce Phantom VIII | 250 | 1.67× | 5,000 | `#0f172a` | **NEW** |
| **Car** | `cars/tesla-model-s` | `car_tesla_model_s` | — | Tesla | Tesla Model S Plaid | 325 | 2.17× | 3,100 | `#b91c1c` | **NEW** |
| *(Compat Car)* | `cars/lamborghini-aventador` | `car_sunset` | *(legacy alias to Aventador asset)* | Lamborghini | Lamborghini Huracán Tecnica | 300 | 2.00× | 3,200 | `#ea580c` | Compat |
| *(Compat Car)* | `cars/mercedes-benz-g63` | `car_mercedes` | *(legacy alias to G63 asset)* | Mercedes-Benz | Mercedes-AMG GT Coupe | 285 | 1.90× | 2,800 | `#334155` | Compat |

---

## 4. Schema & Type System Definition

Currently, `@cozy/game-data` has no exported interface for vehicle definitions. A strongly-typed schema must be defined in `packages/game-data/src/vehicles.ts` and exported in `packages/game-data/src/index.ts`.

### 4.1 Recommended TypeScript Interfaces

```typescript
export type VehicleKind = 'bicycle' | 'motorcycle' | 'car';

export interface VehicleDimensions {
  /** Canvas frame pixel dimensions (always 48 × 40 px) */
  frameWidth: 48;
  frameHeight: 40;
  /** Physical collision body width (must be <= 40 px to fit in 40 px TOWN_ROADS) */
  bodyWidth: number;
  /** Y-coordinate of tire ground contact plane (standard: 37 px) */
  contactY: 37;
}

export interface VehicleMountingGeometry {
  /** Hip center attachment coordinate for 2-wheelers (x = 24, y = 16..20) */
  seat: { x: number; y: number };
  /** Lower body crop rectangle for rider avatar (0, 0, 32, 40) */
  crop: { x: number; y: number; w: number; h: number };
  /** Whether driver avatar is completely hidden inside cabin (true for 4-wheelers) */
  hideAvatar: boolean;
}

export interface VehicleLightingGeometry {
  /** Front headlight beam origin vector relative to vehicle center */
  front: { dx: number; dy: number; lateralOffsets: number[] };
  /** Rear taillight origin vector relative to vehicle center */
  rear: { dx: number; dy: number };
  /** Beam cone scaling multiplier */
  beamScale: { length: number; width: number };
}

export interface VehicleShowroomTheme {
  underglow: string;
  rim: string;
  deck: string;
}

export interface VehicleDef {
  id: string;
  assetPath: string; // Relative path to assets/vehicles/, e.g. 'bicycles/trek-marlin-7'
  kind: VehicleKind;
  name: string;
  brand: string;
  price: number;
  speed: number;
  color: string;
  description: string;
  dimensions: VehicleDimensions;
  mounting: VehicleMountingGeometry;
  lighting: VehicleLightingGeometry;
  showroom: VehicleShowroomTheme;
}
```

### 4.2 Standard Geometry Values

- **Frame Bounds**: `48 × 40 px` per direction/frame.
- **Spritesheet Grid**: `192 × 160 px` (4 directions: Down [0], Left [1], Right [2], Up [3] × 4 frames: Idle [0], Drive 1 [1], Drive 2 [2], Drive 3 [3]).
- **Contact Plane**: `y = 37 px`.
  - In `apps/web/src/game/players.ts`, the vehicle sprite is placed at `y = -14` inside the player container.
  - Image center is at `y = 20`.
  - Tire ground contact is at `37 px` (which is `+17 px` below center), so `-14 + 17 = +3 px` relative to avatar foot plane `y = 0`.
- **Road Width Tolerance**:
  - `TOWN_ROADS` segments have width/height of `40 px` (or `72 px` on main avenue).
  - All 16 vehicles have `bodyWidth <= 40 px` (typically 26–36 px for cars, 12–16 px for motorcycles, 6–8 px for bicycle).
  - This ensures that moving down the centerline never triggers the `off_road` 40-coin penalty.
- **Seat Coordinates (2-Wheelers)**:
  - Hip pivot: `x = 24, y = 18` (middle of the 48px frame).
  - Crop: `(0, 0, 32, 40)` strips lower legs so they do not protrude under the exhaust or chain guard.
- **Lighting Anchors (`VehicleLights`)**:
  - Front beam: `dx * 20, dy * 18` from avatar center `(x, y - 10)`.
  - Car lateral offsets: `[-8, +8]` (dual beams).
  - Two-wheeler lateral offsets: `[0]` (single central headlight).
  - Rear taillight: `-dx * 18, -dy * 18`.
  - Bicycle beam scale: `length: 0.65, width: 0.7`.
  - Motorcycle beam scale: `length: 1.0, width: 0.7`.
  - Car beam scale: `length: 1.0, width: 1.0`.

---

## 5. Backward Compatibility & Migration Strategy

### 5.1 Legacy IDs in Active Use

| Legacy ID | Found In | Reason It Must Be Preserved |
|---|---|---|
| `car_sunset` | `packages/game-data/src/vehicles.test.ts`, `apps/api/test/vehicles.test.ts`, `apps/realtime/src/rooms/vehicles.test.ts`, `apps/web/src/art/vehicle.ts` | Vitest suites verify `drivingSpeed('car_sunset', ...) === 300` and purchase flows; `paintVehicleDealer` draws `car_sunset` in dealership forecourt canvas. |
| `car_mercedes` | `packages/game-data/src/vehicles.test.ts`, `apps/realtime/src/rooms/vehicles.test.ts`, `packages/game-data/src/vehicles.ts` | Tested in `SHOWROOM_FEATURED_VEHICLES` and realtime speed assertion `['car_mercedes', 285]`. |
| `car_mint` | `apps/api/test/vehicles.test.ts`, `apps/realtime/src/rooms/vehicles.test.ts`, `apps/web/src/art/vehicle.ts` | Primary starter car used across all test harnesses; `paintVehicleDealer` renders `car_mint`. |
| `bicycle_sky` | `apps/api/test/vehicles.test.ts`, `apps/realtime/src/rooms/vehicles.test.ts` | First bicycle tested in economy and mounting. |
| `motorcycle_coral` | `apps/api/test/vehicles.test.ts`, `apps/realtime/src/rooms/vehicles.test.ts` | First motorcycle tested in economy and mounting. |
| `motorcycle_ducati` | `packages/game-data/src/vehicles.test.ts`, `apps/realtime/src/rooms/vehicles.test.ts` | Tested in showroom and high-speed driving. |
| `car_lamborghini` | `packages/game-data/src/vehicles.test.ts`, `apps/realtime/src/rooms/vehicles.test.ts` | Tested in showroom and high-speed driving (`340 px/s`). |
| `car_porsche` | `packages/game-data/src/vehicles.test.ts` | Brand and speed verified in unit tests. |

### 5.2 Resolution Architecture

To achieve 100% backward compatibility without code breakages or schema collisions:

1. **`VEHICLES` Record**:
   Maintain entries for all 16 canonical vehicles + explicit entries for `car_sunset` and `car_mercedes` (giving 18 entries total).
   Each entry has its own unique `id` so that `ITEM_SEEDS` unique ID assertions (`game-data.test.ts`) continue to pass.
2. **`VEHICLE_ALIASES` Lookup Map**:
   Define an alias dictionary mapping folder paths, alternative slugs, and legacy names:
   ```typescript
   export const VEHICLE_ALIASES: Record<string, string> = {
     // Asset path aliases
     'bicycles/trek-marlin-7': 'bicycle_sky',
     'motorcycles/vespa-primavera-150': 'motorcycle_coral',
     'motorcycles/ducati-panigale-v4': 'motorcycle_ducati',
     'motorcycles/honda-super-cub': 'motorcycle_honda_super_cub',
     'motorcycles/harley-davidson-fat-boy': 'motorcycle_harley_fat_boy',
     'motorcycles/kawasaki-ninja-h2': 'motorcycle_kawasaki_ninja_h2',
     'motorcycles/yamaha-yzf-r1': 'motorcycle_yamaha_r1',
     'motorcycles/bmw-r1250-gs': 'motorcycle_bmw_r1250_gs',
     'cars/mercedes-benz-g63': 'car_mint',
     'cars/lamborghini-aventador': 'car_lamborghini',
     'cars/porsche-911': 'car_porsche',
     'cars/toyota-supra-mk4': 'car_toyota_supra_mk4',
     'cars/ferrari-f40': 'car_ferrari_f40',
     'cars/ford-mustang': 'car_ford_mustang',
     'cars/rolls-royce-phantom': 'car_rolls_royce_phantom',
     'cars/tesla-model-s': 'car_tesla_model_s',
     // Backward compatibility aliases
     'car_sunset': 'car_sunset',
     'car_mercedes': 'car_mercedes',
   };
   ```
3. **`vehicleById(id)`**:
   Enhanced to resolve both direct keys and alias targets:
   ```typescript
   export function vehicleById(id: string | null | undefined): VehicleDef | undefined {
     if (!id) return undefined;
     if (Object.hasOwn(VEHICLES, id)) return VEHICLES[id];
     const aliasTarget = VEHICLE_ALIASES[id];
     if (aliasTarget && Object.hasOwn(VEHICLES, aliasTarget)) return VEHICLES[aliasTarget];
     return undefined;
   }
   ```
4. **Database Seeding (`pnpm migrate`)**:
   No new DDL table migration is necessary because `item_definitions` already supports `type = 'vehicle'` (via `0007_vehicles.sql`).
   Running `apps/api/src/migrate.ts` automatically executes `seedReferenceData`, which upserts all 16+ entries into `item_definitions`.

---

## 6. Showroom, Shop UI & Procedural Art Fallback Integration

### 6.1 Showroom Plinths (`SHOWROOM_FEATURED_VEHICLES`)
- Showroom bounds: `640 × 480 px`.
- The 4 featured plinths are stationed at:
  - Display 0: `(168, 156)`
  - Display 1: `(472, 156)`
  - Display 2: `(168, 308)`
  - Display 3: `(472, 308)`
- Current featured vehicle IDs: `['motorcycle_ducati', 'car_mercedes', 'car_lamborghini', 'car_mint']`.
- Can be retained as-is or configured with 4 flagship showcase vehicles (e.g. Ducati Panigale, Rolls-Royce Phantom, Lamborghini Aventador, Mercedes G63).

### 6.2 Shop UI (`VehicleShopPanel.tsx`)
- In `VehicleShopPanel.tsx`, line 97 currently has a fallback placeholder:
  `Tất cả các dòng xe ({shop.data?.filter((i) => i.type === 'vehicle').length ?? 8} mẫu)`
  This should be updated to `?? 16` (or dynamically computed).
- Scale: 3x rendering inside `VehiclePreview` with 4-direction rotation button (`setDir((dir + 1) % 4)`).

### 6.3 Procedural Fallback Engine (`apps/web/src/art/vehicle.ts`)
- Requirement R1 mandates: "Tự động fallback về procedural canvas nếu asset chưa nạp xong, đảm bảo zero-downtime, không bị crash hay màn hình trắng."
- `vehicleCanvas(id, dir, frame)` currently implements canvas rendering for the 8 original vehicles.
- For new vehicles, `vehicleCanvas` must either:
  1. Render a clean fallback silhouette using the vehicle's `color` and `kind` (bicycle, motorcycle, or car outline).
  2. Map unrendered models to their closest existing procedural template.
- This guarantees `ensureVehicleTexture()` never returns an empty or invalid texture even before PNG assets load.

---

## 7. Verification Method & Test Suite Baseline

### 7.1 Existing Baseline Status
All existing test suites pass with 100% success rate:
- `@cozy/game-data`: 19 passed, 141 tests
- `@cozy/web`: 10 passed, 35 tests
- `@cozy/realtime` vehicle suite: 13 passed
- `pnpm typecheck`: Clean (0 errors across 8 packages)
- `pnpm lint`: Clean (0 errors)

### 7.2 Required Unit Test Additions in `@cozy/game-data`
When the implementation milestone adds the vehicle catalog:
1. `packages/game-data/src/vehicles.test.ts`:
   - Assert all 16 vehicle IDs exist in `VEHICLES` or via `vehicleById()`.
   - Assert all 16 asset paths exist and map to valid definitions.
   - Assert `car_sunset` and `car_mercedes` resolve with valid speeds and brands.
   - Assert all 16 vehicles have `bodyWidth <= 40` and `contactY === 37`.
   - Assert all 2-wheelers have valid seat coordinates `(x = 24, y in [16..20])`.
   - Assert `ITEM_SEEDS` contains unique IDs and positive coin prices for all vehicles.

---

## 8. Summary Table of Mismatches & Action Items for Implementation

| Scope Item | Current Status | Required Action for Implementer |
|---|---|---|
| Vehicle count in `VEHICLES` | 8 vehicles | Add 10 new vehicle definitions to complete the 16 model requirement |
| `meta.json` files | 0 files | Generate `meta.json` in all 16 directories under `assets/vehicles/` with geometry & rigging specs |
| Spritesheet & previews | 0 files in `assets/vehicles/` | Generate `spritesheet.png` (192×160), `preview.png`, `icon.png` for all 16 models |
| TypeScript Types | Untyped inline object | Export `VehicleDef`, `VehicleKind`, `VehicleGeometry`, `VehicleMounting`, `VehicleLighting` |
| Alias Mapping | Missing | Export `VEHICLE_ALIASES` mapping paths and legacy IDs to canonical records |
| Fallback Canvas | Supports 8 models | Support generic procedural fallback for any vehicle ID in `vehicleCanvas()` |
| Shop UI count | Hardcoded fallback `?? 8` | Update fallback in `VehicleShopPanel.tsx` to `?? 16` |
