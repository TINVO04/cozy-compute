# Handoff Report: Vehicle Dynamic Asset Loader, Texture Pipeline & Asset Packs

**Date**: 2026-10-08  
**Agent**: `explorer_survey_2`  
**Working Directory**: `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_2`  
**Parent Orchestrator ID**: `cd331520-04d7-4f2f-a8b7-81e43bf66f35`  
**Handoff Type**: Hard (Investigation & Survey Complete)

---

## 1. Observation

1. **Procedural Vehicle Canvas Implementation**:
   - In `apps/web/src/art/vehicle.ts`:
     - Line 5: `export function vehicleCanvas(id: string, dir = 2, frame = 0): HTMLCanvasElement` creates a 48×40 canvas.
     - Line 10: `const color = vehicleById(id)?.color ?? '#69bfa8';`
     - Line 15: `const kind = vehicleById(id)?.kind;`
     - Line 229: `export function ensureVehicleTexture(scene: Phaser.Scene, id: string, dir: number, frame = 0)`
     - Line 230–232:
       ```ts
       const key = `vehicle:${id}:${dir}:${frame}`;
       if (!scene.textures.exists(key)) scene.textures.addCanvas(key, vehicleCanvas(id, dir, frame));
       return key;
       ```
2. **Player Vehicle Rendering & Animation**:
   - In `apps/web/src/game/players.ts`:
     - Line 795–800:
       ```ts
       const driving = Boolean(this.vehicle) && (this.scene.scene.key === 'town' || this.scene.scene.key === 'farm');
       if (driving && !this.vehicleLights) this.vehicleLights = new VehicleLights(this.scene);
       this.vehicleLights?.update(driving ? this.vehicle : '', this.container.x, this.container.y, this.dir);
       const kind = vehicleById(this.vehicle)?.kind;
       const riding = driving && (kind === 'bicycle' || kind === 'motorcycle');
       ```
     - Line 801–806: If `riding`, sets `this.sprite.setCrop(0, 0, 32, 40)`, otherwise `this.sprite.setCrop()`; avatar visible only if `!driving || riding`.
     - Line 811–818:
       ```ts
       const frame = riding && this.moving && !useUi.getState().reducedMotion ? Math.floor(time / 160) % 2 : 0;
       const key = ensureVehicleTexture(this.scene, this.vehicle, this.dir, frame);
       if (!this.vehicleSprite) {
         this.vehicleSprite = this.scene.add.image(0, -14, key);
         this.container.addAt(this.vehicleSprite, 1);
       }
       this.vehicleSprite.setTexture(key).setVisible(true);
       ```
3. **Showroom and Shop UI Usages**:
   - In `apps/web/src/game/showroom-art.ts`:
     - Line 642: `ensureVehicleTexture(scene, display.id, 2)` renders vehicle at showroom display plinths with scale 2x.
   - In `apps/web/src/screens/panels/VehicleShopPanel.tsx`:
     - Line 13: `const src = useMemo(() => vehicleCanvas(id, dir).toDataURL(), [id, dir]);`
   - In `apps/web/src/art/items.ts`:
     - Line 20–24:
       ```ts
       if (type === 'vehicle') {
         const url = vehicleCanvas(sprite).toDataURL();
         iconCache.set(key, url);
         return url;
       }
       ```
4. **Existing Asset Files in Workspace**:
   - Executing `find_by_name` on `assets/vehicles/` located 19 path results:
     - Categories: `bicycles/`, `motorcycles/`, `cars/`
     - 16 vehicle folders:
       - `bicycles/trek-marlin-7`
       - `motorcycles/bmw-r1250-gs`, `ducati-panigale-v4`, `harley-davidson-fat-boy`, `honda-super-cub`, `kawasaki-ninja-h2`, `vespa-primavera-150`, `yamaha-yzf-r1`
       - `cars/ferrari-f40`, `ford-mustang`, `lamborghini-aventador`, `mercedes-benz-g63`, `porsche-911`, `rolls-royce-phantom`, `tesla-model-s`, `toyota-supra-mk4`
     - Executing `list_dir` on `assets/vehicles/bicycles/trek-marlin-7` returned: `Empty directory`. All 16 directories contain 0 files.
   - Executing `list_dir` on `apps/web/public`:
     - Subdirectories: `farm`, `fish`, `maps`. No `vehicles` directory exists yet.
5. **Vehicle Definitions in Game Data**:
   - In `packages/game-data/src/vehicles.ts`:
     - Currently only 8 vehicles are defined: `bicycle_sky`, `motorcycle_coral`, `motorcycle_ducati`, `car_mint`, `car_mercedes`, `car_sunset`, `car_lamborghini`, `car_porsche`.
     - `TOWN_ROADS` defines road bounds with width `40 px`:
       Line 101–106: `{ x: 32, y: 332, w: 1472, h: 40 }`, `{ x: 332, y: 320, w: 40, h: 576 }`, `{ x: 96, y: 844, w: 1024, h: 40 }`.
     - `TRAFFIC_FINES.off_road = 40` (fines for driving off the 40 px road).
6. **Workspace Test & Quality Status**:
   - Command: `pnpm --filter @cozy/game-data test` -> 19 test files passed (141 tests).
   - Command: `pnpm --filter @cozy/web test` -> 10 test files passed (35 tests).
   - Command: `pnpm typecheck` -> Exited code 0 across all 8 TypeScript projects.

---

## 2. Logic Chain

1. **Zero-Downtime Fallback Requirement**:
   - From Observation 1, `ensureVehicleTexture` synchronously registers `vehicleCanvas()` onto `scene.textures` using key `vehicle:${id}:${dir}:${frame}`.
   - From Observation 2, `players.ts` immediately expects `key` to resolve to a valid texture in `this.vehicleSprite.setTexture(key)`.
   - Therefore, the dynamic loader cannot block the render loop while fetching static PNG assets over HTTP. Instead, it must synchronously register the procedural canvas texture on first access, while asynchronously initiating the image load.
2. **In-Place Seamless Upgrade**:
   - When an asynchronous `Image.onload` event fires for `spritesheet.png`, Phaser 3's `CanvasTexture` supports in-place manipulation via `tex.getContext().drawImage(img, sx, sy, 48, 40, 0, 0, 48, 40)` followed by `tex.refresh()`.
   - Because all sprites (`this.vehicleSprite`, showroom images) already point to this texture key, calling `refresh()` immediately updates the on-screen graphics to the pixel-art asset without recreating sprites or causing visible screen flicker.
3. **Asset Pack Grid & Coordinate System**:
   - Requirement specifies `192 × 160 px` spritesheet consisting of 4 columns × 4 rows of `48 × 40 px` frames.
   - Rows (height = 4 × 40 = 160 px) correspond to 4 directions:
     - Row 0 (y: 0..39): Down (dir = 0)
     - Row 1 (y: 40..79): Left (dir = 1)
     - Row 2 (y: 80..119): Right (dir = 2)
     - Row 3 (y: 120..159): Up (dir = 3)
   - Columns (width = 4 × 48 = 192 px) correspond to 4 frames:
     - Col 0 (x: 0..47): Idle (stopped)
     - Col 1 (x: 48..95): Drive 1
     - Col 2 (x: 96..143): Drive 2
     - Col 3 (x: 144..191): Drive 3
   - Frame indexing follows `dir * 4 + frame`.
4. **Collision and Off-Road Prevention**:
   - From Observation 5, road segments have a strict width of 40 px.
   - Any vehicle frame whose visual body exceeds 40 px in width will extend past the road boundary when centered in a lane, which triggers `off_road` violation events (`TRAFFIC_FINES.off_road = 40 Coin`).
   - Therefore, max body width must remain `≤ 40 px` (ideally 26..36 px).
5. **Mounting Geometry Alignment**:
   - From Observation 2, two-wheeler avatars are cropped to `(0, 0, 32, 40)` and raised by `baseSpriteY - 4`. The vehicle sprite sits at `(0, -14)` relative to the container.
   - For character hips to sit accurately on the saddle, the two-wheeler seat must be centered at `x = 24, y = 16..20` within the 48×40 frame.
   - For cars, avatar is hidden (`setVisible(!driving)`), cabin windshield has blue reflection depth, and wheel bottom sits firmly at `y = 37 px`.
6. **Backward Compatibility & Alias Mapping**:
   - Legacy vehicle IDs `car_sunset` and `car_mercedes` are used in existing database rows and tests (`apps/api/test/vehicles.test.ts:60`).
   - The loader and game-data catalog must map `car_sunset` -> `cars/lamborghini-aventador` and `car_mercedes` -> `cars/mercedes-benz-g63` (or dedicated aliases) so existing players retain full functionality.

---

## 3. Caveats

1. **Empty Asset Directories**: The 16 vehicle directories in `assets/vehicles/` are currently empty. They need to be populated with `spritesheet.png`, `preview.png`, `icon.png`, and `meta.json` generated to pixel-art standards.
2. **Web Public Mirroring**: Vite serves files from `apps/web/public/`. The asset pipeline must either copy `assets/vehicles/` to `apps/web/public/vehicles/` during build/dev or serve them directly via Vite configuration.
3. **Database Migration for New IDs**: While `ITEM_SEEDS` automatically incorporates all entries from `VEHICLES`, the PostgreSQL database in production needs to run `seedReferenceData()` (via `pnpm migrate` or startup) to persist the new 8 vehicles into `item_definitions`.
4. **No Third-Party Asset Dependencies**: As mandated by `AGENTS.md` and project history, all vehicle pixel art must follow Cozy Compute's native 2D aesthetic without uncurated third-party artifacts.

---

## 4. Conclusion

1. **Feasibility**: Integrating static 16-pack vehicle assets with zero-downtime procedural fallback is 100% achievable without any breaking changes to existing architecture or tests.
2. **Loader Mechanism**:
   - Create `apps/web/src/art/vehicle-loader.ts` to manage asset manifests and async fetching.
   - Update `ensureVehicleTexture()` to return procedural canvas immediately on cache miss, launch async fetch, and update the `CanvasTexture` in place upon load.
3. **Catalog Expansion**:
   - Expand `packages/game-data/src/vehicles.ts` to catalogue all 16 models with price, speed, brand, and descriptions.
   - Retain aliases for `car_sunset` and `car_mercedes`.
4. **Animation Enhancement**:
   - Update `apps/web/src/game/players.ts` to cycle frames 1..3 during movement for both cars and two-wheelers, stopping at frame 0 when idle.
5. **Quality Preservation**:
   - Wheel contact baseline `y = 37 px`, max body width `≤ 40 px`, and saddle pivot `(24, 16..20)` are mandatory geometric constraints for zero-error driving and mounting.

---

## 5. Verification Method

To independently verify the architecture and changes:

1. **Verify Unit & Geometry Tests**:
   ```powershell
   pnpm --filter @cozy/game-data test
   ```
   Ensures road coordinates, speeds, intersection red lights, and vehicle configs pass.
2. **Verify Web Client Tests**:
   ```powershell
   pnpm --filter @cozy/web test
   ```
   Ensures showroom plinth generation and canvas textures pass.
3. **Verify Type Integrity & Linting**:
   ```powershell
   pnpm typecheck
   pnpm lint
   ```
4. **Verify Procedural Fallback (Zero-Downtime Invalidation Condition)**:
   - Request an invalid or ungenerated vehicle ID, e.g. `ensureVehicleTexture(scene, 'non_existent_vehicle', 2, 0)`.
   - Invalidation condition: If Phaser throws an uncaught error or displays a black/white crash screen, fallback is broken.
   - Expected behavior: Returns a valid texture key rendering a fallback mint-colored vehicle silhouette.
5. **Verify Visual Mounting & Lights via Playwright**:
   - Run `node output/vehicle-preview.mjs` and inspect `output/vehicle-showroom.png` and `output/vehicle-intersection.png`.
   - Run `node output/vehicle-ui-check.mjs` to test live mounting (`V`), road driving without off-road fines, and showroom rotation.
