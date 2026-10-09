# Handoff Report — Milestone 5: Showroom & Shop UI Integration & Item Definitions

## 1. Observation

1. **Showroom Pedestal Dimensions & Vehicle Rendering**:
   - In `apps/web/src/game/showroom-art.ts`:
     - Pedestal constants were exported: `SHOWROOM_PEDESTAL_WIDTH = 136`, `SHOWROOM_PEDESTAL_HEIGHT = 66`, and `SHOWROOM_VEHICLE_SCALE = 2`.
     - In `buildShowroomTexture(scene)`:
       ```ts
       const pw = SHOWROOM_PEDESTAL_WIDTH;
       const ph = SHOWROOM_PEDESTAL_HEIGHT;
       ...
       const texture = scene.textures.addCanvas(SHOWROOM_TEXTURE_KEY, canvas);
       texture?.setFilter?.(0);
       ```
     - In `populateShowroomElements(scene)`:
       ```ts
       const texKey = ensureVehicleTexture(scene, display.id, 2);
       const vehicleImg = scene.add
         .image(display.x, display.y - 6, texKey)
         .setScale(SHOWROOM_VEHICLE_SCALE)
         .setDepth(display.y);
       vehicleImg.texture?.setFilter?.(0);
       ```
   - In `apps/web/src/game/showroom.test.ts`:
     - Two new tests were added: `confirms showroom pedestals are 136x66 px with scale factor 2x` and `populates display vehicles on pedestals at scale 2x with pixel-perfect nearest filtering`.
     - Output of `pnpm --filter @cozy/web test src/game/showroom.test.ts`:
       ```
       ✓ src/game/showroom.test.ts (5 tests) 52ms
       Test Files  1 passed (1)
       Tests       5 passed (5)
       ```

2. **Vehicle Shop Panel Preview & 4-Way Rotation**:
   - In `apps/web/src/screens/panels/VehicleShopPanel.tsx`:
     - Preview dimensions are set to `width={144}` and `height={120}` (`144 × 120 px`, 3x integer scale of the 48 × 40 px frame), wrapped in a column container:
       ```tsx
       function VehiclePreview({ id }: { id: string }) {
         const [dir, setDir] = useState(2);
         const src = useMemo(() => vehicleCanvas(id, dir).toDataURL(), [id, dir]);
         return (
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 144 }}>
             <img
               src={src}
               alt=""
               width={144}
               height={120}
               style={{ imageRendering: 'pixelated', objectFit: 'contain', display: 'block' }}
             />
             <Button variant="secondary" size="sm" onClick={() => setDir((d) => (d + 1) % 4)}>
               Xoay xe
             </Button>
           </div>
         );
       }
       ```
     - 4-direction rotation button cycles smoothly via `setDir((d) => (d + 1) % 4)`, traversing `[2 -> 3 -> 0 -> 1 -> 2]`.
     - Catalog fallback counter was updated to 16 models:
       ```tsx
       Tất cả các dòng xe ({shop.data?.filter((i) => i.type === 'vehicle').length ?? 16} mẫu)
       ```
     - Added comprehensive `BRAND_COLORS` styling for all 16 vehicle brands (`Ducati`, `Ferrari`, `Lamborghini`, `Mercedes-Benz`, `Porsche`, `Kawasaki`, `Yamaha`, `BMW`, `Toyota`, `Ford`, `Trek`, `Vespa`, `Honda`, `Harley-Davidson`, `Rolls-Royce`, `Tesla`), rendering distinct branded tags.

3. **Item Definitions & Icon Resolution**:
   - In `packages/game-data/src/items.ts`:
     - Verified `ITEM_SEEDS` includes all 16 canonical vehicles from `CANONICAL_VEHICLE_IDS`.
     - Execution of programmatic verification:
       ```
       CANONICAL_VEHICLE_IDS count: 16
       vehicle items in ITEM_SEEDS: 18
       All 16 canonical in seeds: true
       Unique IDs: true Unique names: true Unique prices: true Unique sprites: true
       ```
   - In `apps/web/src/art/items.ts`:
     - Exported `vehicleIcon(id: string)` and updated `itemIcon`:
       ```ts
       export function vehicleIcon(id: string): string {
         const v = vehicleById(id);
         if (v?.assetPath) {
           return `/vehicles/${v.assetPath}/icon.png`;
         }
         return vehicleCanvas(id).toDataURL();
       }
       ...
       if (type === 'vehicle') {
         const url = vehicleIcon(sprite);
         iconCache.set(key, url);
         return url;
       }
       ```

4. **Verification Suites Results**:
   - `pnpm --filter @cozy/game-data test`: 19 test files passed, 147 tests passed.
   - `pnpm --filter @cozy/web test`: 10 test files passed, 37 tests passed.
   - `pnpm tsx tests/e2e/vehicles/runner.ts`: 92/92 tests passed (Tier 1: 27, Tier 2: 25, Tier 3: 17, Tier 4: 5).
   - `pnpm typecheck`: Exit code 0 across all workspace projects.
   - `pnpm eslint <exclusively_owned_files>`: 0 errors, 0 warnings.
   - `pnpm prettier --check <exclusively_owned_files>`: 100% compliant.

---

## 2. Logic Chain

1. **Showroom Pedestals (136x66 px, 2x Scale, Nearest Filtering)**:
   - From Observation 1, the plinths in `apps/web/src/game/showroom-art.ts` use `pw = SHOWROOM_PEDESTAL_WIDTH` (136) and `ph = SHOWROOM_PEDESTAL_HEIGHT` (66).
   - Display vehicles are added with `.setScale(SHOWROOM_VEHICLE_SCALE)` (2x) at coordinates `(display.x, display.y - 6)` matching the showroom layout.
   - `vehicleImg.texture?.setFilter?.(0)` sets point/nearest-neighbor sampling in Phaser (filter mode 0), guaranteeing crisp pixel-art edges without blurry interpolation.
   - The showroom interior texture registration also invokes `texture?.setFilter?.(0)`.
   - Unit tests in `showroom.test.ts` verify both the numerical constants and the exact invocation sequence on the scene and vehicle images.

2. **Vehicle Shop Panel (144x120 px Preview, 4-Way Rotation, 16 Models)**:
   - From Observation 2, native vehicle frames are 48 × 40 px. An integer scale of 3x yields $48 \times 3 = 144\text{ px}$ width and $40 \times 3 = 120\text{ px}$ height.
   - The `img` element in `VehiclePreview` enforces `width={144}` and `height={120}` with `imageRendering: 'pixelated'` and `objectFit: 'contain'`.
   - Clicking "Xoay xe" executes `setDir((d) => (d + 1) % 4)`, advancing the heading state through all 4 cardinal directions without bounds overflow or glitching.
   - The catalog lists all vehicle models with brand pills mapped from `BRAND_COLORS`, speed multipliers, prices, descriptions, and dynamic button states ("Mua", "Chưa đủ Coin", "Chọn xe", "Đang chọn").

3. **Item Definitions & Icon Pipeline**:
   - From Observation 3, mapping `VEHICLES` into `ITEM_SEEDS` populates every canonical vehicle with its unique ID, name, coin price, and sprite identifier.
   - In `apps/web/src/art/items.ts`, `vehicleIcon()` first inspects `vehicleById(id)?.assetPath`. If defined, it returns `/vehicles/${assetPath}/icon.png` (matching the static asset structure in `public/vehicles/`).
   - If `assetPath` is missing or the ID is unrecognized, `vehicleCanvas(id).toDataURL()` serves as a reliable synchronous procedural fallback, ensuring zero crashes or broken images.

---

## 3. Caveats

- `apps/web/src/art/vehicle.ts` has two pre-existing unused variable warnings (`Phaser`, `isVespa`) from another concurrent worker branch. This file was deliberately not edited to respect the Exclusively Owned Files restriction.
- All modifications were strictly limited to the five assigned files: `apps/web/src/game/showroom-art.ts`, `apps/web/src/game/showroom.test.ts`, `apps/web/src/screens/panels/VehicleShopPanel.tsx`, `apps/web/src/art/items.ts`, and `packages/game-data/src/items.ts`.

---

## 4. Conclusion

- Milestone 5 requirements are completely satisfied:
  1. Showroom pedestals confirmed at 136 × 66 px with scale 2x and nearest filtering (`setFilter(0)`).
  2. Vehicle Shop Panel renders previews at 144 × 120 px (3x integer scale), smoothly rotates across 4 directions, and displays the 16-model vehicle catalog cleanly.
  3. `ITEM_SEEDS` includes all 16 canonical vehicles with unique IDs, names, prices, and sprites.
  4. `itemIcon(..., 'vehicle')` resolves to `/vehicles/${assetPath}/icon.png` with procedural canvas fallback.
  5. 100% pass on all unit tests, e2e vehicle tests, typecheck, and formatting.

---

## 5. Verification Method

To independently verify these results:

1. **Showroom Unit Tests**:
   ```bash
   pnpm --filter @cozy/web test src/game/showroom.test.ts
   ```
   *Expected*: 5/5 tests pass.

2. **Game-Data Unit Tests**:
   ```bash
   pnpm --filter @cozy/game-data test
   ```
   *Expected*: 19/19 files pass (147 tests).

3. **Opaque-Box E2E Vehicle Test Suite**:
   ```bash
   pnpm tsx tests/e2e/vehicles/runner.ts
   ```
   *Expected*: 92/92 tests pass across Tiers 1-4.

4. **Static Analysis & Formatting**:
   ```bash
   pnpm typecheck
   pnpm eslint apps/web/src/game/showroom-art.ts apps/web/src/game/showroom.test.ts apps/web/src/screens/panels/VehicleShopPanel.tsx apps/web/src/art/items.ts packages/game-data/src/items.ts
   pnpm prettier --check apps/web/src/game/showroom-art.ts apps/web/src/game/showroom.test.ts apps/web/src/screens/panels/VehicleShopPanel.tsx apps/web/src/art/items.ts packages/game-data/src/items.ts
   ```
   *Expected*: All commands exit with code 0 without errors or warnings.
