# Project: Master Vehicle Art Direction & Showroom Upgrade

## Architecture
- **Data & Schema Layer (`packages/game-data`)**:
  - `src/vehicles.ts`: Canonical registry of 16 vehicles, stats, brands, dimensions, bounding rules (`bodyWidth <= 40`, `contactY = 37`, seat `(24, 16..20)`).
  - Add `SHOWROOM_PEDESTALS` grouping 16 vehicles into 4 specialized categories (Supercars, Luxury & Muscle, Superbikes, Heritage & Bicycle).
- **Vehicle Rendering & Transform Pipeline (`apps/web/src/art`)**:
  - `vehicle.ts`: Procedural canvas generator and fallback renderer `vehicleCanvas()`. Matrix isolation with `ctx.save()` / `ctx.restore()` on `dir === 1`.
  - `vehicle-loader.ts`: Dynamic texture loader caching spritesheets into Phaser `CanvasTexture` with `blitFrame()`. Explicit `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` to prevent double-inversion.
- **Vehicle Driving & Mounting Systems (`apps/web/src/game`)**:
  - `players.ts`: Vehicle driving logic, direction state (`dir === 1` for left), character mounting avatar alignment, headlight direction.
  - `vehicle-lights.ts`: Directional headlight and taillight offsets.
- **Showroom & Shop UI (`apps/web/src/game` & `apps/web/src/screens/panels`)**:
  - `showroom-art.ts`: Showroom Gara Bạc Hà interior layout, 4 category pedestals, dynamic vehicle cycling state, interaction triggers.
  - `ShowroomHud.tsx`: Keyboard listeners for 'E' / [◀] [▶] (cycling active pedestal) and 'Enter' (opening shop).
  - `VehicleShopPanel.tsx`: Vehicle purchase interface with 5 category filter tabs and 360-degree rotation view.
  - `vehicle.ts`: `paintVehicleDealer` storefront window vehicle displays.
- **Master Asset Generation & Verification Pipeline (`scripts/`)**:
  - `scripts/generate_vehicles.py`: Master Python generator producing 192x160 spritesheet, 144x120 preview, 48x40 icon, and meta.json.
  - 8 WOW 2.5D quality layers: 4 color depth layers, 2.5D reflective glass with 45° streak and roof shadow, 3D rubber tires/rims/brakes, 16 signature passes, 4 directions x 4 frames with active suspension bounce.
  - `scripts/audit_vehicle_geometry.py`: Geometric validation for dimensions, bounds, contact points, and seat positions.
  - `scripts/verify-vehicle-assets.mjs`: Node.js integrity validator for image buffers and JSON metadata.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Transform Matrix Isolation in `vehicle.ts` | Wrap `dir === 1` with `ctx.save()` and `ctx.restore()` preventing `scaleX = -1` context bleed | M1 | Req R1 |
| 2 | Explicit Transform Reset in `vehicle-loader.ts` | Explicit `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` in `blitFrame` | M1 | Req R1 |
| 3 | Left-Facing Alignment Verification | Vehicle and mounted avatar face left properly without backward flip or double inversion | M1 | Req R1 |
| 4 | WOW 2.5D Depth & Materials (4 color layers) | 4-layer depth: underbody shadow, mid-tone, reflection contour, sharp specular | M2 | Req R2 |
| 5 | WOW 2.5D Reflective Glass & Shadows | Tinted glass, 45° diagonal reflection streak, roof overhang shadow | M2 | Req R2 |
| 6 | WOW 2.5D Wheels, Rims & Calipers | 3D rubber tires with treads, recessed wheel arches, alloy rims, Brembo calipers | M2 | Req R2 |
| 7 | Signature Details for all 16 Vehicles | Unique aerodynamic, mechanical, and styling signatures for all 16 target vehicles | M2 | Req R2 |
| 8 | 4-Direction x 4-Frame Active Animations | Unfreeze vertical frames, smooth wheel spin, suspension bounce (±0.5px), animated reflection glints | M2 | Req R2 |
| 9 | Showroom 4-Pedestal Categorization | NW: Supercars, NE: Luxury/Muscle, SW: Superbikes, SE: Heritage/Cruiser/Bicycle | M3 | Req R3 |
| 10 | Interactive Pedestal Cycling | E key or [◀] [▶] cycling through vehicles on active pedestal with real-time HUD stats | M3 | Req R3 |
| 11 | VehicleShopPanel Category Tabs & 360 View | Tabs (Tất cả (16), Siêu xe (4), Xe sang & Cơ bắp (4), Mô tô PKL (4), Xe phố & Xe đạp (4)), 360-degree rotation | M3 | Req R3 |
| 12 | Diversified Dealer Window Cars | Varied models and colors displayed in `paintVehicleDealer` storefront | M3 | Req R3 |
| 13 | Canvas Fallback Synchronization | Synchronize `vehicleCanvas` in `vehicle.ts` with updated 16 vehicle silhouettes & materials | M4 | Req R4 |
| 14 | Asset Mirroring Pipeline Sync | Full synchronization between `assets/vehicles/` and `apps/web/public/vehicles/` | M4 | Req R4 |
| 15 | Geometric & Integrity Audits | 100% pass on `audit_vehicle_geometry.py` and `verify-vehicle-assets.mjs` | M5 | Req R5 / AC |
| 16 | Comprehensive Test Suite & Quality Gate | 100% pass on game-data test, web test, format, lint, typecheck | M5 | Req R5 / AC |
| 17 | Headless Visual Verification | Playwright screenshots confirming left-drive and showroom displays | M5 | Req R5 / AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Survey & Architecture Assessment | Survey codebase across R1, R2, R3, R4 | none | DONE |
| M1 | Fix Left Inversion (Transform Leak) | Fix `vehicle.ts` & `vehicle-loader.ts` matrix resets, unit/challenge tests | M0 | DONE |
| M2 | Master WOW 2.5D Generator Upgrade | Update `scripts/generate_vehicles.py`, regenerate 16 vehicles, geometry audit | M0, M1 | IN_PROGRESS |
| M3 | Showroom Pedestals, Cycling & Shop UI | 4 pedestals, cycling mechanism, shop tabs, dealer display | M0, M1 | PLANNED |
| M4 | Canvas Fallback & Pipeline Sync | Update `vehicle.ts` fallback & sync public assets | M1, M2 | PLANNED |
| M5 | Verification Suites & Quality Gate | Geometry audit, asset verify, unit/challenge tests, quality gate, screenshots | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### Matrix Transform Contract
- In `apps/web/src/art/vehicle.ts`:
  ```ts
  if (dir === 1 || dir === 2) {
    if (dir === 1) {
      ctx.save();
      ctx.translate(48, 0);
      ctx.scale(-1, 1);
    }
    // draw vehicle body...
    if (dir === 1) {
      ctx.restore();
    }
  }
  ```
- In `apps/web/src/art/vehicle-loader.ts` (`blitFrame`):
  ```ts
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.resetTransform?.();
  if (typeof ctx.clearRect === 'function') {
    ctx.clearRect(0, 0, 48, 40);
  }
  ctx.drawImage(img, sx, sy, 48, 40, 0, 0, 48, 40);
  ```

### Pedestal Category Mapping Contract (`packages/game-data/src/vehicles.ts`)
```ts
export interface ShowroomPedestalDef {
  index: number;
  name: string;
  category: string;
  x: number;
  y: number;
  vehicles: readonly string[];
}

export const SHOWROOM_PEDESTALS: readonly ShowroomPedestalDef[] = [
  { index: 0, name: 'Bục Tây Bắc', category: 'Siêu xe', x: 168, y: 156, vehicles: ['car_ferrari_f40', 'car_lamborghini', 'car_porsche', 'car_toyota_supra_mk4'] },
  { index: 1, name: 'Bục Đông Bắc', category: 'Xe sang & Cơ bắp', x: 472, y: 156, vehicles: ['car_rolls_royce_phantom', 'car_mint', 'car_ford_mustang', 'car_tesla_model_s'] },
  { index: 2, name: 'Bục Tây Nam', category: 'Mô tô PKL', x: 168, y: 308, vehicles: ['motorcycle_ducati', 'motorcycle_kawasaki_ninja_h2', 'motorcycle_yamaha_r1', 'motorcycle_bmw_r1250_gs'] },
  { index: 3, name: 'Bục Đông Nam', category: 'Xe phố & Xe đạp', x: 472, y: 308, vehicles: ['motorcycle_coral', 'motorcycle_honda_super_cub', 'motorcycle_harley_fat_boy', 'bicycle_sky'] },
];
```

## Code Layout
- `packages/game-data/src/vehicles.ts`: Data definitions, `SHOWROOM_PEDESTALS`. Owned by M3.
- `apps/web/src/art/vehicle.ts`: Transform isolation (M1), canvas fallback & dealer window (M4).
- `apps/web/src/art/vehicle-loader.ts`: Transform reset in `blitFrame`. Owned by M1.
- `scripts/generate_vehicles.py`: Master WOW 2.5D Generator. Owned by M2.
- `assets/vehicles/` and `apps/web/public/vehicles/`: Asset packs. Owned by M2 / M4.
- `apps/web/src/game/showroom-art.ts`: Pedestal cycling controller & render. Owned by M3.
- `apps/web/src/screens/panels/ShowroomHud.tsx`: Interaction key listeners. Owned by M3.
- `apps/web/src/screens/panels/VehicleShopPanel.tsx`: Category tabs & 360 preview. Owned by M3.
