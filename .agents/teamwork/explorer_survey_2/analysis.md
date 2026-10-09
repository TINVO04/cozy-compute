# Comprehensive Investigation Report: Vehicle Asset Loader, Texture Pipeline, and 16 Vehicle Asset Packs

**Date**: 2026-10-08  
**Agent**: `explorer_survey_2`  
**Working Directory**: `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_2`  
**Reference Request**: `ORIGINAL_REQUEST.md` (Header `## 2026-10-08T12:29:53Z`)

---

## Executive Summary

This investigation analyzed the complete vehicle asset ecosystem across the web client, game-data packages, and filesystem:
1. **Existing Architecture**: The game currently relies 100% on procedural canvas rendering (`vehicleCanvas` in `apps/web/src/art/vehicle.ts`), creating individual 48×40 px textures registered synchronously in Phaser 3 under keys formatted as `vehicle:${id}:${dir}:${frame}`.
2. **Current Asset State**: 16 vehicle directory slugs exist under `assets/vehicles/` across `bicycles/`, `motorcycles/`, and `cars/`. All 16 directories are currently empty (0 bytes, 0 files). No `/vehicles/` directory exists yet under `apps/web/public/`.
3. **Procedural Fallback Mechanism**: `vehicleCanvas()` is completely robust and error-free: it returns a valid 48×40 canvas for any vehicle ID (falling back to a generic sports car in mint `#69bfa8` for unknown IDs). This guarantees zero crashes and immediate frame-1 rendering.
4. **16 Vehicle Asset Pack Specification**: Each vehicle folder requires 4 standard files: `spritesheet.png` (192×160 px, 4 columns × 4 rows of 48×40 px frames: Down, Left, Right, Up; Idle, Drive 1, Drive 2, Drive 3), `preview.png`, `icon.png`, and `meta.json`. Key geometric invariants: wheel contact line exactly at `y = 37 px`, max body width `≤ 40 px` (to match `TOWN_ROADS` 40 px width), and 2-wheeler saddle at `(x = 24, y = 16..20)` matching character crop `(0, 0, 32, 40)`.
5. **Dynamic Loader Strategy**: A zero-downtime dynamic loader can synchronously register the procedural fallback canvas into Phaser on first demand, concurrently trigger asynchronous loading of `spritesheet.png`, and update the existing `CanvasTexture` in place via `ctx.drawImage()` and `texture.refresh()`. This eliminates pop-in, white screens, and broken references while modernizing rendering to full static pixel art.

---

## 1. Current Vehicle Texture & Sprite Architecture

### 1.1 Touchpoints in `apps/web/src/`

| File | Line(s) | Role & Usage |
|---|---|---|
| `apps/web/src/art/vehicle.ts` | 5–228 | `vehicleCanvas(id, dir, frame)` procedural rasterizer |
| `apps/web/src/art/vehicle.ts` | 229–233 | `ensureVehicleTexture(scene, id, dir, frame)` Phaser texture registration |
| `apps/web/src/art/vehicle.ts` | 235–266 | `paintVehicleDealer()` drawing dealer forecourt with vehicle silhouettes |
| `apps/web/src/game/players.ts` | 794–848 | Player vehicle mounting, sprite updates, animation frame calculations, crop logic |
| `apps/web/src/game/showroom-art.ts` | 636–655 | Showroom display plinths rendering vehicle textures at scale 2x |
| `apps/web/src/screens/panels/VehicleShopPanel.tsx` | 11–28 | `VehiclePreview` component using `vehicleCanvas(id, dir).toDataURL()` |
| `apps/web/src/art/items.ts` | 20–24 | `itemIcon()` generating data URLs for vehicle inventory icons |
| `apps/web/src/game/vehicle-lights.ts` | 39–65 | Dynamic beam raycasting and bulb offsets for headlights & taillights |

### 1.2 Registration & Texture Keys

- **Key Convention**: `vehicle:${id}:${dir}:${frame}`
- **Registration Call**:
  ```ts
  export function ensureVehicleTexture(scene: Phaser.Scene, id: string, dir: number, frame = 0) {
    const key = `vehicle:${id}:${dir}:${frame}`;
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, vehicleCanvas(id, dir, frame));
    return key;
  }
  ```
- **Phaser Object**: Stored as a `Phaser.Textures.CanvasTexture`.
- **Direction Mapping**:
  - `dir = 0`: Facing Down (towards camera / South)
  - `dir = 1`: Facing Left (West)
  - `dir = 2`: Facing Right (East)
  - `dir = 3`: Facing Up (away from camera / North)

### 1.3 Player Entity Update Loop (`apps/web/src/game/players.ts`)

- In `update(dtMs, time)`:
  - Determines driving state:
    ```ts
    const driving = Boolean(this.vehicle) && (this.scene.scene.key === 'town' || this.scene.scene.key === 'farm');
    const kind = vehicleById(this.vehicle)?.kind;
    const riding = driving && (kind === 'bicycle' || kind === 'motorcycle');
    ```
  - **Avatar Cropping & Posture**:
    - If `riding`: sets avatar crop `this.sprite.setCrop(0, 0, 32, 40)` to hide player legs behind the bike frame; sets avatar position `this.sprite.y = this.baseSpriteY - 4` (seated position); locks avatar animation to idle frame `this.sprite.setFrame(this.dir * 3)`.
    - If driving a car (`!riding`): completely hides avatar (`this.sprite.setVisible(false)`).
  - **Vehicle Sprite**:
    - Added to player container at index 1: `this.vehicleSprite = this.scene.add.image(0, -14, key)`.
    - Current frame selection:
      `const frame = riding && this.moving && !useUi.getState().reducedMotion ? Math.floor(time / 160) % 2 : 0;`
      *Note*: Currently cars NEVER animate (frame is always 0), and 2-wheelers only alternate 2 frames (`% 2`).

---

## 2. Inventory of Existing Vehicle Assets

### 2.1 File System Inspection

Inspecting `assets/vehicles/` revealed the following directory hierarchy:

```
assets/vehicles/
├── bicycles/
│   └── trek-marlin-7/                    (Directory exists, EMPTY)
├── motorcycles/
│   ├── bmw-r1250-gs/                     (Directory exists, EMPTY)
│   ├── ducati-panigale-v4/               (Directory exists, EMPTY)
│   ├── harley-davidson-fat-boy/          (Directory exists, EMPTY)
│   ├── honda-super-cub/                  (Directory exists, EMPTY)
│   ├── kawasaki-ninja-h2/                (Directory exists, EMPTY)
│   ├── vespa-primavera-150/              (Directory exists, EMPTY)
│   └── yamaha-yzf-r1/                    (Directory exists, EMPTY)
└── cars/
    ├── ferrari-f40/                      (Directory exists, EMPTY)
    ├── ford-mustang/                     (Directory exists, EMPTY)
    ├── lamborghini-aventador/            (Directory exists, EMPTY)
    ├── mercedes-benz-g63/                (Directory exists, EMPTY)
    ├── porsche-911/                      (Directory exists, EMPTY)
    ├── rolls-royce-phantom/              (Directory exists, EMPTY)
    ├── tesla-model-s/                    (Directory exists, EMPTY)
    └── toyota-supra-mk4/                 (Directory exists, EMPTY)
```

- **File Count in `assets/vehicles/`**: Exactly 0 files across 16 subdirectories.
- **File Count in `apps/web/public/`**: No `vehicles/` directory exists yet under `apps/web/public/`.
- **Existing Graphic Output Files**: Test screenshots (`output/showroom-luxury-vehicles.png`, `output/vehicle-driving-live.png`, `output/vehicle-intersection.png`, `output/vehicle-shop-ui.png`) exist from previous integration tests.

---

## 3. Procedural Canvas Fallback Mechanism Analysis

### 3.1 Implementation in `apps/web/src/art/vehicle.ts`

1. **Resolution & Canvas**: Each frame is rendered onto an isolated `48 × 40 px` canvas.
2. **Deterministic Color Lookup**:
   `const color = vehicleById(id)?.color ?? '#69bfa8';`
3. **Category Differentiation**:
   - `kind === 'bicycle' || kind === 'motorcycle'`:
     - Horizontal (dir 1, 2): Wheels rendered at `x = 10` and `x = 37`. Horizontal flip for dir 1 using `ctx.translate(48, 0); ctx.scale(-1, 1);`.
     - Frame variation: `frame % 2` alternates spoke orientation and pedal crank position.
     - Special styling branches for `isDucati` (`motorcycle_ducati`) vs generic Vespa vs bicycle.
     - Vertical (dir 0, 3): Centered narrow chassis with handlebars and lights.
   - `kind === 'car'`:
     - Checks specific model flags: `isGWagon`, `isLamborghini`, `isAventador`, `isPorsche`, `isMercedesGT`.
     - Horizontal (dir 1, 2): Profile silhouette, roof, glazing, aero wings, wheels at `x = 10` and `x = 33`.
     - Vertical (dir 0, 3): Front/rear view with 4 wheels at the corners and grille/tail lights.
   - **Unknown ID Fallback**: If an uncatalogued ID is supplied, it defaults to the generic sports car branch using `#69bfa8`.
4. **Phaser Texture Manager Interaction**:
   - `scene.textures.exists(key)` check avoids duplicate canvas allocations.
   - Calling `addCanvas(key, canvas)` synchronously returns a `CanvasTexture` immediately.
   - **Advantage**: 100% synchronous, guaranteed zero crashes, zero blank sprites, zero delay.

---

## 4. Specification for All 16 Vehicle Asset Packs

### 4.1 Vehicle Catalog Roster (16 Models + Legacy Aliases)

| Category | Folder Slug | Canonical Game ID | Brand & Model Name | Speed (px/s) | Price (Coin) |
|---|---|---|---|---|---|
| **Bicycle** | `bicycles/trek-marlin-7` | `bicycle_sky` | Trek Marlin 7 Gen 3 | 195 | 200 |
| **Motorcycle** | `motorcycles/vespa-primavera-150` | `motorcycle_coral` | Vespa Primavera 150 | 270 | 700 |
| **Motorcycle** | `motorcycles/ducati-panigale-v4` | `motorcycle_ducati` | Ducati Panigale V4 S | 310 | 2,400 |
| **Motorcycle** | `motorcycles/honda-super-cub` | `motorcycle_cub` | Honda Super Cub C125 | 225 | 450 |
| **Motorcycle** | `motorcycles/harley-davidson-fat-boy` | `motorcycle_fat_boy` | Harley-Davidson Fat Boy 114 | 280 | 1,800 |
| **Motorcycle** | `motorcycles/kawasaki-ninja-h2` | `motorcycle_ninja_h2` | Kawasaki Ninja H2 Carbon | 335 | 3,800 |
| **Motorcycle** | `motorcycles/yamaha-yzf-r1` | `motorcycle_yzf_r1` | Yamaha YZF-R1M | 315 | 2,600 |
| **Motorcycle** | `motorcycles/bmw-r1250-gs` | `motorcycle_r1250_gs` | BMW R 1250 GS Adventure | 290 | 2,100 |
| **Car** | `cars/mercedes-benz-g63` | `car_mint` | Mercedes-Benz G63 AMG | 240 | 1,800 |
| **Car** | `cars/lamborghini-aventador` | `car_lamborghini` | Lamborghini Aventador SVJ | 340 | 4,500 |
| **Car** | `cars/porsche-911` | `car_porsche` | Porsche 911 GT3 RS | 320 | 3,600 |
| **Car** | `cars/toyota-supra-mk4` | `car_supra` | Toyota Supra MK4 Turbo | 295 | 2,200 |
| **Car** | `cars/ferrari-f40` | `car_f40` | Ferrari F40 Competizione | 330 | 4,200 |
| **Car** | `cars/ford-mustang` | `car_mustang` | Ford Mustang Shelby GT500 | 285 | 1,900 |
| **Car** | `cars/rolls-royce-phantom` | `car_phantom` | Rolls-Royce Phantom VIII | 250 | 5,000 |
| **Car** | `cars/tesla-model-s` | `car_model_s` | Tesla Model S Plaid | 325 | 3,400 |
| *Legacy Alias* | `cars/lamborghini-aventador` | `car_sunset` | Lamborghini Huracán Tecnica (Alias) | 300 | 3,200 |
| *Legacy Alias* | `cars/mercedes-benz-g63` | `car_mercedes` | Mercedes-AMG GT Coupe (Alias) | 285 | 2,800 |

### 4.2 Asset Pack Contents & Schema

Every folder in `assets/vehicles/<category>/<slug>/` must contain:

1. `spritesheet.png`:
   - Exact dimensions: `192 × 160 px` (4 columns × 4 rows of 48×40 px frames).
   - Format: 32-bit RGBA PNG, transparent background.
   - Grid layout:
     - **Row 0** (y = 0..39): Facing Down (South)
     - **Row 1** (y = 40..79): Facing Left (West)
     - **Row 2** (y = 80..119): Facing Right (East)
     - **Row 3** (y = 120..159): Facing Up (North)
     - **Col 0** (x = 0..47): Idle (stationary)
     - **Col 1** (x = 48..95): Drive frame 1 (wheel/pedal/suspension phase 1)
     - **Col 2** (x = 96..143): Drive frame 2 (wheel/pedal/suspension phase 2)
     - **Col 3** (x = 144..191): Drive frame 3 (wheel/pedal/suspension phase 3)
   - Frame numbering: `dir * 4 + frame` where `dir ∈ [0..3]` and `frame ∈ [0..3]`.

2. `preview.png`:
   - Clean side profile or showroom angle (48×40 or high-res pixel art).
   - Used for Showroom plinths and `VehicleShopPanel` showcase.

3. `icon.png`:
   - High-contrast inventory/shop icon (32×32 or 48×40 px) with clean transparent alpha.

4. `meta.json`:
   - Standard vehicle metadata file:
   ```json
   {
     "id": "car_mint",
     "slug": "mercedes-benz-g63",
     "category": "car",
     "name": "Mercedes-Benz G63 AMG",
     "brand": "Mercedes-Benz",
     "price": 1800,
     "speed": 240,
     "frameWidth": 48,
     "frameHeight": 40,
     "wheelContactY": 37,
     "maxBodyWidth": 36,
     "seat": { "x": 24, "y": 18 },
     "lights": {
       "front": { "dx": 20, "dy": 18 },
       "rear": { "dx": -18, "dy": -18 }
     },
     "theme": {
       "primary": "#1b4332",
       "underglow": "rgba(46, 204, 113, 0.45)"
     },
     "description": "Vua địa hình SUV Mercedes-AMG G63 hầm hố, động cơ V8 Biturbo mạnh mẽ uy lực."
   }
   ```

### 4.3 Visual & Geometric Constraints

1. **Wheel Contact Line (`y = 37 px`)**:
   - The lowest pixel of the tires must sit at `y = 37` in every 48×40 frame.
   - When positioned at container `(0, -14)`, the tire contact sits at local `y + 3`, perfectly matching player shadow and road elevation.
2. **Body Width (`≤ 40 px`)**:
   - In vertical directions (dir 0 and dir 3), total chassis + tire width must NOT exceed 40 px (ideal: 26..36 px).
   - Road lanes in `TOWN_ROADS` are 40 px wide. If a vehicle exceeds 40 px, normal driving down lanes would cause the vehicle boundary to clip curbs and trigger false `off_road` traffic fines (40 Coin penalty).
3. **2-Wheeler Saddle Geometry**:
   - Saddle center must be at `x = 24, y = 16..20`.
   - Fits the player's cropped torso (`0, 0, 32, 40`) and offset `baseSpriteY - 4` without gap or torso overlap.
4. **4-Wheeler Glazing & Occlusion**:
   - Player avatar is hidden (`setVisible(!driving)`). Windshield glass features subtle cyan/blue tinting and depth reflections.
5. **Lighting Raycast Alignment**:
   - Front headlight originating at `x + dx * 20, y - 10 + dy * 18`.
   - Rear red taillight at `x - dx * 18, y - 10 - dy * 18`.

---

## 5. Dynamic Asset Loader Architecture & Required Changes

### 5.1 Static Asset Serving Pipeline

- In Vite, files placed in `apps/web/public/vehicles/` are served at `/vehicles/...` with native MIME types and browser caching.
- Recommendation:
  - Canonical asset source stored in `assets/vehicles/`.
  - Vite dev server and build configured to expose `/vehicles` either by copying `assets/vehicles/` to `apps/web/public/vehicles/` or using a Vite public dir / static serve rule.

### 5.2 Dynamic Loader Module Design (`apps/web/src/art/vehicle-loader.ts`)

```
   ┌────────────────────────────────────────────────────────┐
   │ ensureVehicleTexture(scene, id, dir, frame)            │
   └──────────────────────────┬─────────────────────────────┘
                              │
                    Exists in scene.textures?
                    ├── YES ──> Return key immediately
                    │
                    └── NO  ──> 1. Register procedural fallback canvas
                                   scene.textures.addCanvas(key, vehicleCanvas(id, dir, frame))
                                2. Return key immediately (Zero-downtime render!)
                                3. Trigger async loadVehicleSheet(id)
                                           │
                                ┌──────────┴──────────┐
                                │ Image.onload fires   │
                                └──────────┬──────────┘
                                           │
                        Update Phaser CanvasTexture in place:
                        tex.getContext().drawImage(sheet, frameX, frameY, 48, 40, 0, 0, 48, 40)
                        tex.refresh()
                        (Seamless upgrade to high-res pixel art!)
```

### 5.3 Step-by-Step Code Changes Required

1. **`apps/web/src/art/vehicle-loader.ts` (New module)**:
   - Maintains `VEHICLE_ASSET_MANIFEST`: maps IDs (`bicycle_sky`, `car_mint`, `car_sunset`, etc.) to paths (`/vehicles/<category>/<slug>/`).
   - Maintains memory cache of loaded `HTMLImageElement`s and active `Promise`s.
   - Handles `loadVehicleSpritesheet(id)`: returns image or null on error.
2. **`apps/web/src/art/vehicle.ts`**:
   - Modify `ensureVehicleTexture(scene, id, dir, frame)`:
     - On first call, if texture doesn't exist: register procedural canvas synchronously, return key, and kick off `loadVehicleSpritesheet(id)`.
     - When spritesheet resolves, slice all 16 frames `(d, f)` onto their respective `CanvasTexture`s and call `refresh()`.
   - Preserve `vehicleCanvas(id, dir, frame)` exactly as is for offline/fallback use.
3. **`apps/web/src/game/players.ts`**:
   - Update driving animation frame calculation:
     ```ts
     const frame = this.moving && !useUi.getState().reducedMotion
       ? 1 + (Math.floor(time / 140) % 3)
       : 0;
     ```
     Enables 4-frame drive cycles (Idle, Drive 1, Drive 2, Drive 3) for both cars and two-wheelers.
4. **`packages/game-data/src/vehicles.ts`**:
   - Add the remaining 8 vehicle models to `VEHICLES`: `motorcycle_cub`, `motorcycle_fat_boy`, `motorcycle_ninja_h2`, `motorcycle_yzf_r1`, `motorcycle_r1250_gs`, `car_supra`, `car_f40`, `car_mustang`, `car_phantom`, `car_model_s`.
   - Provide legacy alias entries or lookups for `car_sunset` and `car_mercedes`.
   - `ITEM_SEEDS` in `packages/game-data/src/items.ts` automatically picks up the full catalog.
5. **`apps/web/src/screens/panels/VehicleShopPanel.tsx` & `apps/web/src/art/items.ts`**:
   - `VehiclePreview`: check if static preview/sheet exists for vehicle; if so, render static image, otherwise fallback to `vehicleCanvas(id, dir)`.
   - `itemIcon`: check if static `icon.png` is available; otherwise fallback to `vehicleCanvas(sprite).toDataURL()`.

---

## 6. Synthesis & Risk Assessment

| Potential Risk | Impact | Mitigation Strategy |
|---|---|---|
| **Network latency / 404 on spritesheet** | High (could show white screen or crash) | Synchronous procedural canvas registration ensures game never renders a missing texture. If image fails, fallback remains active indefinitely. |
| **Texture key collision / cache stale** | Medium (wrong vehicle rendered) | Scoped keys `vehicle:${id}:${dir}:${frame}` guarantee 1:1 mapping per model, direction, and frame. |
| **Off-road fines triggered by wide vehicle** | High (player loses coins unlawfully) | Enforce `maxBodyWidth ≤ 40 px` across all 16 vehicle pixel art sheets. |
| **Misaligned rider pose on 2-wheelers** | Medium (character floating or legs clipping) | Enforce saddle pivot at `(x = 24, y = 16..20)` matching existing crop `(0, 0, 32, 40)` and `baseSpriteY - 4`. |
| **Headlight beam mismatch** | Low (beam originates from wrong point) | Match existing raycast coordinates: front `(dx * 20, dy * 18)` and rear `(-dx * 18, -dy * 18)`. |
| **Test regressions** | High (broken quality gate) | Existing test suites (`vehicles.test.ts`, `showroom.test.ts`) rely on synchronous texture creation; in-place canvas updating preserves 100% test compatibility. |

