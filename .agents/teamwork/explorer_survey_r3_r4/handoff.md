# Handoff Report: Explorer Survey R3 & R4 (Showroom, Shop UI & Fallback Runtime)

> **Agent**: Explorer R3 R4 Showroom & Fallback  
> **Working Directory**: `c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_r3_r4`  
> **Type**: Hard Handoff (Investigation & Survey Complete)  
> **Recipient**: Orchestrator / Worker agents

---

## 1. Observation

1. **Current Showroom Displays**:
   - `packages/game-data/src/vehicles.ts:730-740`:
     ```ts
     export const SHOWROOM_FEATURED_VEHICLES = [
       'motorcycle_ducati',
       'car_mercedes',
       'car_lamborghini',
       'car_mint',
     ] as const;
     export const VEHICLE_DISPLAYS = SHOWROOM_FEATURED_VEHICLES.map((id, index) => ({
       id,
       x: index % 2 === 0 ? 168 : 472,
       y: index < 2 ? 156 : 308,
     }));
     ```
     NW is `motorcycle_ducati`, NE is `car_mercedes`, SW is `car_lamborghini`, SE is `car_mint`. The 4 pedestals are not categorized into the 4 required segments.
   - `apps/web/src/game/showroom-art.ts:640-717`: `populateShowroomElements` renders 4 static images and static text labels. No cycling method or controller exists.
   - `apps/web/src/screens/panels/ShowroomHud.tsx:20`:
     ```tsx
     if (e.key.toLowerCase() === 'e' && id) useUi.getState().setPanel('shop-vehicles');
     ```
     Pressing `'e'` directly opens the shop panel rather than cycling the vehicle on the pedestal.

2. **VehicleShopPanel UI**:
   - `apps/web/src/screens/panels/VehicleShopPanel.tsx:30-46`:
     ```tsx
     function VehiclePreview({ id }: { id: string }) {
       const [dir, setDir] = useState(2);
       const src = useMemo(() => vehicleCanvas(id, dir).toDataURL(), [id, dir]);
       return (
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 144 }}>
           <img src={src} alt="" width={144} height={120} style={{ imageRendering: 'pixelated', objectFit: 'contain', display: 'block' }} />
           <Button variant="secondary" size="sm" onClick={() => setDir((d) => (d + 1) % 4)}>
             Xoay xe
           </Button>
         </div>
       );
     }
     ```
     The preview only toggles `dir = (d + 1) % 4` with a single button. There are no direction indicators, left/right rotate controls, or auto-rotation.
   - `apps/web/src/screens/panels/VehicleShopPanel.tsx:110-119`:
     Only has two filter modes: "Xe đang xem trên bục" and "Tất cả các dòng xe". Missing the 5 mandatory tabs: *Tất cả (16)*, *Siêu xe (4)*, *Xe sang & Cơ bắp (4)*, *Mô tô PKL (4)*, *Xe phố & Xe đạp (4)*.

3. **Storefront Window Display**:
   - `apps/web/src/art/vehicle.ts:515-516`:
     ```ts
     ctx.drawImage(vehicleCanvas('car_mint'), 20, 84);
     ctx.drawImage(vehicleCanvas('car_sunset', 1), 94, 84);
     ```
     The display windows are hardcoded to show only `car_mint` and `car_sunset` facing left.

4. **Transform Matrix Isolation**:
   - `apps/web/src/art/vehicle.ts:48-51` & `279-282`:
     ```ts
     if (dir === 1) {
       ctx.translate(48, 0);
       ctx.scale(-1, 1);
     }
     ```
     Missing `ctx.save()` before and `ctx.restore()` after the flipped rendering block.
   - `apps/web/src/art/vehicle-loader.ts:230-244`:
     `blitFrame` calls `ctx.clearRect` and `ctx.drawImage` without explicitly calling `ctx.setTransform(1, 0, 0, 1, 0, 0)` or `ctx.resetTransform?.()`.

5. **Asset Synchronization & Quality Gate**:
   - Running `node scripts/verify-vehicle-assets.mjs` confirmed:
     - 16 models verified across Canonical Storage (`assets/vehicles/`) and Web Public Mirror (`apps/web/public/vehicles/`).
     - 128 / 128 files verified (0 errors).
     - `python scripts/audit_vehicle_geometry.py` confirmed 100% compliance with dimensions 192x160, body width <= 40 px, wheel contact y = 37, and saddle pivot at x = 24, y = 16..20.
   - `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm --filter @cozy/game-data test` & `pnpm --filter @cozy/web test` all passed with 0 errors.

---

## 2. Logic Chain

1. **Pedestal Categorization (Obs 1 → Requirement R3)**:
   - Observation 1 shows `SHOWROOM_FEATURED_VEHICLES` contains an unsorted list of 4 vehicles.
   - Requirement R3 specifies 4 specialized pedestals corresponding to 4 categories:
     - Pedestal 1 (NW - Supercars): `car_ferrari_f40`, `car_lamborghini`, `car_porsche`, `car_toyota_supra_mk4`.
     - Pedestal 2 (NE - Luxury & Muscle): `car_rolls_royce_phantom`, `car_mint`, `car_ford_mustang`, `car_tesla_model_s`.
     - Pedestal 3 (SW - Sport Superbikes): `motorcycle_ducati`, `motorcycle_kawasaki_ninja_h2`, `motorcycle_yamaha_r1`, `motorcycle_bmw_r1250_gs`.
     - Pedestal 4 (SE - Cruiser, Heritage & Bicycle): `motorcycle_coral`, `motorcycle_honda_super_cub`, `motorcycle_harley_fat_boy`, `bicycle_sky`.
   - Therefore, `SHOWROOM_PEDESTALS` must be declared in `@cozy/game-data` to define these 4 categories with their respective coordinates and 4 vehicle IDs.

2. **Interactive Pedestal Cycling (Obs 1 → Requirement R3)**:
   - In Obs 1, `populateShowroomElements` creates static Phaser GameObjects, and `ShowroomHud` binds `'e'` directly to opening the shop.
   - Requirement R3 states: "Bổ sung cơ chế Bục xoay đổi xe tương tác (Interactive Pedestal Cycling): Khi người chơi lại gần bục, nhấn phím E hoặc nút điều hướng [◀] [▶] để chuyển đổi hiển thị các mẫu xe thuộc phân khúc đó ngay trên bục; thông số tên xe, giá bán, tốc độ cập nhật thời gian thực."
   - Therefore:
     a) Pedestal displays must be managed dynamically so that cycling swaps the texture via `ensureVehicleTexture`, executes a brief scale tween, and updates the title and price text in real time.
     b) `ShowroomHud.tsx` must handle key inputs: `'e'` or `'E'` and `[◀]` `[▶]` (ArrowLeft/ArrowRight) trigger pedestal cycling, while `'Enter'` opens the shop for the active vehicle.

3. **Shop Tabs & 360 Preview (Obs 2 → Requirement R3)**:
   - Observation 2 demonstrates that `VehicleShopPanel.tsx` only offers 2 coarse toggles and a basic direction button.
   - Requirement R3 mandates: "Nâng cấp VehicleShopPanel.tsx: Thêm tabs lọc danh mục (Tất cả (16), Siêu xe (4), Xe sang & Cơ bắp (4), Mô tô PKL (4), Xe phố & Xe đạp (4)), cho phép xem preview xoay 360 độ và mua sắm trực tiếp toàn bộ 16 xe."
   - Therefore:
     a) Implement the 5 category tab filter buttons with count badges.
     b) Upgrade `VehiclePreview` into `Vehicle360Preview` featuring left/right angle controls (`[◀]` `[▶]`), direction compass indicator, and auto-rotation toggle (`[🔄 360°]`).

4. **Storefront Window Display (Obs 3 → Requirements R3 & R4)**:
   - In Obs 3, `paintVehicleDealer` hardcodes `car_mint` and `car_sunset`.
   - To diversify displayed cars, `paintVehicleDealer` should accept vehicle IDs with default prominent supercars (e.g. `car_ferrari_f40` on left, `car_lamborghini` on right) and add specular glass reflections.

5. **Transform Matrix Isolation (Obs 4 → Requirement R4)**:
   - In Obs 4, flipping leftwards (`dir === 1`) in `vehicle.ts` modifies context without `ctx.save()` / `ctx.restore()`.
   - In `vehicle-loader.ts`, `blitFrame` does not reset the matrix before drawing frames.
   - Adding `ctx.save()` / `ctx.restore()` in `vehicle.ts` and `ctx.setTransform(1, 0, 0, 1, 0, 0)` / `ctx.resetTransform?.()` in `blitFrame` ensures zero transform leakage and prevents double-flip artifacts.

---

## 3. Caveats

1. **Default Pedestal Display ID in E2E Scenarios**:
   - `tests/e2e/vehicles/tier4-scenarios.test.ts:47` contains `VEHICLE_DISPLAYS.find((d) => d.id === 'car_lamborghini')!`.
   - If Pedestal 1 (NW) default is `car_ferrari_f40`, `VEHICLE_DISPLAYS` will contain `car_ferrari_f40` instead of `car_lamborghini`.
   - **Recommendation**: Either configure Pedestal 1's initial default in `SHOWROOM_PEDESTALS` to `car_lamborghini`, or update `tier4-scenarios.test.ts` to locate Lamborghini via `SHOWROOM_PEDESTALS.find(p => p.vehicles.includes('car_lamborghini'))`.
2. **Read-Only Investigation**:
   - As an explorer agent, no codebase source files were modified. All proposals are documented in detail in `analysis.md` and this handoff.

---

## 4. Conclusion

Requirements R3 and R4 have clear architectural paths with minimal risk:
1. Declare `SHOWROOM_PEDESTALS` in `@cozy/game-data` mapping the 4 specialized categories to the 4 pedestals (NW, NE, SW, SE).
2. Refactor `apps/web/src/game/showroom-art.ts` and `ShowroomHud.tsx` to support interactive pedestal cycling (`E`, `ArrowLeft`, `ArrowRight`, `Enter`) with real-time sprite and text updates.
3. Enhance `apps/web/src/screens/panels/VehicleShopPanel.tsx` with the 5 category tabs (*Tất cả (16)*, *Siêu xe (4)*, *Xe sang & Cơ bắp (4)*, *Mô tô PKL (4)*, *Xe phố & Xe đạp (4)*) and 360-degree rotation preview controls.
4. Diversify `paintVehicleDealer` in `apps/web/src/art/vehicle.ts` with prominent supercars and showcase glass highlights.
5. Isolate transform matrices with `ctx.save()` / `ctx.restore()` in `vehicle.ts` and `ctx.setTransform(1, 0, 0, 1, 0, 0)` in `vehicle-loader.ts`.

---

## 5. Verification Method

To independently verify the investigation and subsequent worker implementations:

1. **Verify Asset Packs & Geometry**:
   ```powershell
   node scripts/verify-vehicle-assets.mjs
   python scripts/audit_vehicle_geometry.py
   ```
   *Expected*: All 16 models pass 100% with 128 / 128 files, contact y = 37, body width <= 40 px, and saddle x = 24, y = 16..20.

2. **Run Game Data & Web Unit Test Suites**:
   ```powershell
   pnpm --filter @cozy/game-data test
   pnpm --filter @cozy/web test
   ```
   *Expected*: All test suites pass 100%.

3. **Run Code Quality Gate**:
   ```powershell
   pnpm format:check
   pnpm lint
   pnpm typecheck
   ```
   *Expected*: Zero formatting discrepancies, zero ESLint errors, zero TypeScript type errors.

4. **Verify Showroom & Shop UI Integration**:
   - Check `apps/web/src/game/showroom.test.ts` passes.
   - Run `pnpm tsx tests/e2e/vehicles/runner.ts` to verify all 4 tiers of vehicle system tests pass.
