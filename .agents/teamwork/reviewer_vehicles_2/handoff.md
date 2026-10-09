# Handoff Report — reviewer_vehicles_2 (Visual & Asset Verification)

## Review Summary
**Verdict**: APPROVE  
**Adversarial Risk Assessment**: LOW  
**Integrity Audit**: PASS (Zero integrity violations; genuine procedural art generator, exhaustive pixel geometry tests, real live browser test artifacts)

---

## 1. Observation

### 1.1 Asset Pack Structure & Physical Files
- **Locations inspected**:
  - Canonical Storage: `assets/vehicles/`
  - Web Public Mirror: `apps/web/public/vehicles/`
- **Models confirmed (16 total)**:
  - 1 Bicycle: `bicycles/trek-marlin-7`
  - 7 Motorcycles: `motorcycles/vespa-primavera-150`, `motorcycles/ducati-panigale-v4`, `motorcycles/honda-super-cub`, `motorcycles/harley-davidson-fat-boy`, `motorcycles/kawasaki-ninja-h2`, `motorcycles/yamaha-yzf-r1`, `motorcycles/bmw-r1250-gs`
  - 8 Cars: `cars/mercedes-benz-g63`, `cars/lamborghini-aventador`, `cars/porsche-911`, `cars/toyota-supra-mk4`, `cars/ferrari-f40`, `cars/ford-mustang`, `cars/rolls-royce-phantom`, `cars/tesla-model-s`
- **File completeness**:
  - All 16 model directories contain exactly 4 files: `spritesheet.png`, `preview.png`, `icon.png`, and `meta.json`.
  - Exactly 64 files in `assets/vehicles/` and 64 files in `apps/web/public/vehicles/` (total 128 files).
  - Independent SHA256 checksum audit executed via Node.js:
    ```
    SHA256 comparison completed. Differences: 0
    ```
    All 128 files are 100% byte-for-byte identical between canonical and public mirrors.

### 1.2 Asset Verification & Deep Pixel Geometry Auditor Execution
- Command executed: `node scripts/verify-vehicle-assets.mjs`
- Output:
  ```
  ====================================================
  VEHICLE ASSET PACK VERIFICATION REPORT
  ====================================================
  Checking location: Canonical Storage (C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\assets\vehicles)
  Checking location: Web Public Mirror (C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\apps\web\public\vehicles)
  ----------------------------------------------------
  Models verified: 16
  Total files checked across both locations: 128 / 128
  Total errors found: 0
  ----------------------------------------------------
  All 16 vehicle asset packs VERIFIED SUCCESSFULLY in both locations!

  ====================================================
  RUNNING DEEP PIXEL GEOMETRY AUDITOR
  ====================================================
  Running Deep Pixel Geometry Audit on all 16 vehicle models...
    [OK] bicycles/trek-marlin-7 passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] motorcycles/vespa-primavera-150 passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] motorcycles/ducati-panigale-v4 passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] motorcycles/honda-super-cub passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] motorcycles/harley-davidson-fat-boy passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] motorcycles/kawasaki-ninja-h2 passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] motorcycles/yamaha-yzf-r1 passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] motorcycles/bmw-r1250-gs passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] cars/mercedes-benz-g63 passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] cars/lamborghini-aventador passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] cars/porsche-911 passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] cars/toyota-supra-mk4 passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] cars/ferrari-f40 passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] cars/ford-mustang passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] cars/rolls-royce-phantom passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
    [OK] cars/tesla-model-s passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)

  All 16 models 100% COMPLIANT with all geometric and artistic constraints!
  >>> COMPLETE ASSET VERIFICATION & GEOMETRY AUDIT PASSED 100% <<<
  ```
- Independent Python audit verifying the public mirror:
  ```
  Independent public mirror pixel check completed. Errors: 0
  ```

### 1.3 Source Code Geometry & Implementation Audits
- **Wheel contact baseline (`y = 37 px`)**:
  - `packages/game-data/src/vehicles.ts`: lines 99, 134, 167, 200, 233, 266, 299, 333, 368, 399, 430, 461, 492, 523, 554, 585, 618, 649 specify `contactY: 37`.
  - Spritesheets: All side profile frames (rows 1 and 2) have bottom-most solid pixel at `y = 37`.
- **Road Width and Body Width (`width <= 40 px`)**:
  - `packages/game-data/src/vehicles.ts`: `TOWN_ROADS` roads have width 40 px (line 723-726).
  - Every vehicle definition has `bodyWidth <= 40`:
    - 2-wheelers: 16 to 22 px.
    - 4-wheelers: 36 to 38 px.
  - Pixel bounding box audit verified that no frame exceeds 40 px width (maximum width found is 38 px).
- **2-Wheel Saddle Pivot & Avatar Crop**:
  - `packages/game-data/src/vehicles.ts`:
    - `seat: { x: 24, y: 16..20 }`, `hideAvatar: false`, `cropAvatar: { x: 0, y: 0, width: 32, height: 40 }`, `avatarOffsetY: -4`.
  - `apps/web/src/game/players.ts` (lines 801-811, 849-854):
    ```ts
    const crop = def?.mounting?.cropAvatar ?? { x: 0, y: 0, width: 32, height: 40 };
    this.sprite.setCrop(crop.x, crop.y, crop.width, crop.height);
    this.sprite.stop();
    this.sprite.setFrame(this.dir * 3);
    const offsetY = def?.mounting?.avatarOffsetY ?? -4;
    this.sprite.y = this.baseSpriteY + offsetY;
    ```
- **4-Wheel Avatar Concealment**:
  - `apps/web/src/game/players.ts` (line 811):
    ```ts
    this.sprite.setVisible(!driving || riding);
    ```
    When `driving` is true and `riding` is false (4-wheeler), `!driving || riding` evaluates to `false`, concealing the avatar cleanly.
- **4-Frame Drive Animation Cycling**:
  - `apps/web/src/game/players.ts` (line 816):
    ```ts
    const frame = this.moving && !useUi.getState().reducedMotion ? 1 + (Math.floor(time / 140) % 3) : 0;
    ```
    Frame 0 is idle; frames 1..3 cycle every 140ms when moving. Respects `reducedMotion`.
- **Lighting Raytracing Offsets**:
  - `apps/web/src/game/vehicle-lights.ts` (lines 50-57):
    ```ts
    const hdx = vehicle.lighting?.headlight?.dx ?? 20;
    const hdy = vehicle.lighting?.headlight?.dy ?? 18;
    const tdx = vehicle.lighting?.taillight?.dx ?? 18;
    const tdy = vehicle.lighting?.taillight?.dy ?? 18;
    const frontX = x + dx * hdx;
    const frontY = y - 10 + dy * hdy;
    const rearX = x - dx * tdx;
    const rearY = y - 10 - dy * tdy;
    ```
    Headlight offset `(dx * 20, dy * 18)` and taillight offset `(-dx * 18, -dy * 18)` match specification exactly.

### 1.4 Showroom & Shop UI Implementation
- **Showroom Pedestals**:
  - `apps/web/src/game/showroom-art.ts`:
    - `export const SHOWROOM_PEDESTAL_WIDTH = 136;`
    - `export const SHOWROOM_PEDESTAL_HEIGHT = 66;`
    - `export const SHOWROOM_VEHICLE_SCALE = 2;`
    - Line 650: `vehicleImg.texture?.setFilter?.(0);` (Phaser nearest neighbor filtering).
  - Verified visual output: `output/showroom-luxury-vehicles.png` shows all 4 display plinths with neon underglow rings and sharp 2x pixel art.
- **VehicleShopPanel UI**:
  - `apps/web/src/screens/panels/VehicleShopPanel.tsx` (lines 30-46):
    - Image dimension: `width={144} height={120}` (3x scale of 48x40).
    - Style: `imageRendering: 'pixelated'`, `objectFit: 'contain'`.
    - 4-directional rotation: `setDir((d) => (d + 1) % 4)` on "Xoay xe" button click.
  - Verified visual output: `output/vehicle-shop-ui.png` shows preview rendering, rotation button, price/speed stats, and buy buttons.

### 1.5 Test Suites & Quality Gate
- `pnpm --filter @cozy/game-data test`: 19 passed files, 147 passed tests (including 10 vehicle tests).
- `pnpm --filter @cozy/web test`: 10 passed files, 37 passed tests (including 5 showroom tests).
- `pnpm typecheck`: Passed with exit code 0 across all 8 TypeScript packages.
- `pnpm lint`: Passed with exit code 0 on `eslint .`.
- Prettier check on all vehicle-related source and script files: 100% matched.

---

## 2. Logic Chain

1. **Asset Completeness (Obs 1.1, 1.2)**:
   All 16 vehicle models are present in both canonical storage and web public mirror. Each model has 4 valid files (`spritesheet.png`, `preview.png`, `icon.png`, `meta.json`). Byte-for-byte SHA256 equality guarantees that Vite dev and production builds serve identical assets as canonical source.
2. **Visual Geometry Compliance (Obs 1.2, 1.3)**:
   Direct PIL pixel examination and automated test suites confirm that every frame has wheel contact baseline at `y = 37 px`, body width `<= 40 px`, and saddle pivot at `x = 24, y = 16..20`. This ensures that vehicles fit inside 40 px roads without triggering off-road penalties, and avatars mount without geometric misalignment.
3. **Mounting, Concealment, & Animation (Obs 1.3)**:
   In `players.ts`, 2-wheelers apply crop `(0, 0, 32, 40)` and `-4 px` Y offset, ensuring driver legs do not clip through engine cases or pedals. 4-wheelers hide the driver sprite via `setVisible(!driving || riding)`. Drive animation cleanly oscillates between frames 1..3 when moving and frame 0 when idle.
4. **Lighting & UI Systems (Obs 1.3, 1.4)**:
   Vehicle lighting offsets mathematically match `(dx * 20, dy * 18)` and `(-dx * 18, -dy * 18)` with additive blending and time-of-day brightness scaling. Showroom plinths are exactly 136x66 px with 2x nearest-neighbor scaling, and shop panel renders 3x integer upscaled previews with 4-way rotation.
5. **Quality Gates & Integrity (Obs 1.5)**:
   TypeScript typechecking, ESLint syntax checking, and unit test suites pass completely. No hardcoded facades, fake mock shortcuts, or bypassed verifications were found. Real Playwright screenshots demonstrate authentic in-game rendering.

---

## 3. Caveats
- `pnpm --filter @cozy/api test` failed due to local PostgreSQL test database (port 55432) not being running in this development environment; this is an environment database connectivity constraint, not a code defect in vehicle logic.
- `pnpm format:check` flagged 4 pre-existing non-vehicle files (`farm-detail.ts`, `farm-landscape.ts`, `town-landscape.ts`, `PROJECT.md`). All vehicle code files are 100% formatted.

---

## 4. Conclusion
All 16 vehicle models, their dynamic loader, visual geometry, mounting mechanics, drive animations, lighting alignment, showroom pedestals, and shop UI meet 100% of the requirements set forth in `ORIGINAL_REQUEST.md` (header `2026-10-08T12:29:53Z`) and `PROJECT.md`.

**Final Verdict**: **APPROVE**.

---

## 5. Verification Method

To independently reproduce and verify this assessment, execute the following commands in the workspace root:

1. **Verify Asset Packs & Pixel Geometry**:
   ```powershell
   node scripts/verify-vehicle-assets.mjs
   ```
   *Expected output*: 128 / 128 files checked, 0 errors, deep geometry audit passed 100%.

2. **Verify Data Layer & Showroom Unit Tests**:
   ```powershell
   pnpm --filter @cozy/game-data test
   pnpm --filter @cozy/web test
   ```
   *Expected output*: 100% passed vitest runs.

3. **Verify Static Analysis & Formatting**:
   ```powershell
   pnpm typecheck
   pnpm lint
   npx prettier --check "packages/game-data/src/vehicles.ts" "apps/web/src/art/vehicle-loader.ts" "apps/web/src/art/vehicle.ts" "apps/web/src/game/showroom-art.ts" "apps/web/src/screens/panels/VehicleShopPanel.tsx"
   ```
   *Expected output*: All exit with code 0.

4. **Inspect Generated Playwright Screenshots**:
   Inspect visual artifacts in `output/`:
   - `output/showroom-luxury-vehicles.png` (pedestals 136x66, scale 2x, nearest filtering)
   - `output/vehicle-shop-ui.png` (preview 144x120, scale 3x, rotation)
   - `output/vehicle-driving-live.png` (avatar concealed, car mounted on street)
   - `output/vehicle-intersection.png` (road junction and traffic lights)
