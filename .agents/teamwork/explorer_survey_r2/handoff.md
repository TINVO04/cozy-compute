# Handoff Report: Requirement R2 WOW Pixel Art Vehicle Investigation

**Agent**: Explorer R2 WOW Pixel Art  
**Working Directory**: `c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_r2`  
**Target Milestone**: Master Vehicle Art Direction & Showroom Upgrade (Requirement R2)  
**Recipient**: Parent Orchestrator (`593b4217-f7c5-4fd0-87d3-8ef1b166fb4a`)

---

## 1. Observation

1. **Geometry Auditor & Asset Verifier Status**:
   - Command `python scripts/audit_vehicle_geometry.py` executed cleanly with exit code 0:
     > `All 16 models 100% COMPLIANT with all geometric and artistic constraints!`
     Verifies spritesheet size (192x160), max body width <= 40 px in all frames, wheel contact at `y=37` in rows 1 and 2, and two-wheeler saddle in `x=22..26, y=16..20`.
   - Command `node scripts/verify-vehicle-assets.mjs` executed cleanly with exit code 0:
     > `Models verified: 16 | Total files checked across both locations: 128 / 128 | Total errors found: 0`
   - Test suites `pnpm --filter @cozy/game-data test` (157 tests), `pnpm --filter @cozy/web test vehicle` (28 tests), and `pnpm --filter @cozy/web test showroom` (5 tests) all pass 100%.

2. **Frozen Vertical Animation Across All 16 Vehicles**:
   - In `scripts/generate_vehicles.py` lines 1001–1085:
     ```python
     else:  # Vertical (0=Down, 3=Up)
         is_down = (dir_idx == 0)
         draw_shadow(img, 10, 38, y=37)
         # ...
     ```
     Notice that `frame_idx` is completely ignored in this branch!
   - Byte-diff analysis of `assets/vehicles/*/spritesheet.png` between frame 0 and frame 1 in row 0 (Down) and row 3 (Up):
     ```python
     diff = sum(1 for a, b in zip(f0, f1) if a != b)
     ```
     Result: **diff bytes = 0** for all 16 models without exception. Vertical animation is 100% frozen.

3. **Minimal Side Profile Animation**:
   - In Left (row 1) and Right (row 2) frames, byte diffs between frame 0 and frame 1 revealed:
     * `bicycles/trek-marlin-7`: 28 diff pixels (crank + pedal rotation)
     * `motorcycles/vespa-primavera-150`, `ducati-panigale-v4`, `kawasaki-ninja-h2`, `yamaha-yzf-r1`: 9 diff pixels only
     * `motorcycles/harley-davidson-fat-boy`: 3 diff pixels only
     * All 8 cars (`cars/*`): exactly 12 diff pixels only (4 spoke pixels per wheel × 2 wheels)
   - Zero suspension bounce (no vertical displacement of body relative to wheels), zero body vibration, zero moving specular gleam.

4. **Generic Rectangular Blockout in Generator**:
   - In `scripts/generate_vehicles.py` line 914:
     `draw_rect(img, 5, 19, 36, 9, c_pri)`
     Line 920:
     `draw_rect(img, 13, roof_y, 22, roof_h, (15, 23, 42, 255))`
     Line 1042:
     `draw_rect(img, 11, 4, 26, 34, (30, 41, 59, 255))`
     Almost all supercars and sedans (Lamborghini, Porsche, Ferrari, Supra, Mustang, Phantom, Tesla) share the exact same rectangular body block and flat greenhouse box, violating Section 0 of `MASTER_VEHICLE_ART_DIRECTION_PLAN.docx`.

5. **Discrepancy in Vehicle Metadata**:
   - `scripts/generate_vehicles.py` lines 98–140 has slight pricing/speed discrepancies vs `packages/game-data/src/vehicles.ts`:
     * Honda Super Cub: price 450 in generator vs 500 in `vehicles.ts` line 190.
     * Harley Fat Boy: price 2100, speed 260 in generator vs price 1600, speed 250 in `vehicles.ts` line 223.
     * BMW GS: price 2600, speed 275 in generator vs price 2200, speed 260 in `vehicles.ts` line 322.
     * Yamaha R1: price 2300, speed 305 in generator vs price 2600, speed 315 in `vehicles.ts` line 289.

---

## 2. Logic Chain

1. **Premise 1**: Section 10 of `MASTER_VEHICLE_ART_DIRECTION_PLAN.docx` mandates:
   "Animation – 4 frames mỗi hướng: Frame 0 idle; Frame 1 chuyển động nhẹ; Frame 2 chuyển động đối xứng/tiếp nối; Frame 3 quay về chu kỳ. Bánh xe phải thay đổi rotation/position hợp lý... Idle vibration chỉ khoảng ±0.5–1 px, không làm thân xe méo."
2. **Premise 2**: Observation 2 proves that `scripts/generate_vehicles.py` currently drops `frame_idx` in rows 0 and 3, causing 0 diff bytes across all 4 frames in vertical directions. Observation 3 proves that side directions only change 3–12 pixels in wheel spoke positions.
3. **Premise 3**: Section 0 and Section 2 of `MASTER_VEHICLE_ART_DIRECTION_PLAN.docx` mandate that each vehicle must be sculpted with individual silhouettes, 4-tier color depth (`deep_shadow`, `mid`, `light_plane`, `specular`), 2.5D reflective glass with roof overhang shadows, distinct rims, and at least 3 signature features.
4. **Premise 4**: Observation 4 proves that cars currently share generic rectangular body blocks (`draw_rect(img, 5, 19, 36, 9)`) and identical greenhouse boxes without model-specific contours.
5. **Premise 5**: Geometric tests (`audit_vehicle_geometry.py`) strictly require `max_y == 37` in rows 1 and 2, body width <= 40 px, and two-wheeler saddle at `x=24, y=16..20`. Therefore, suspension bounce must be implemented by shifting the vehicle body/cabin by ±0.5px / 1px while keeping the lowest tire contact pixel permanently at `y=37` across all 4 frames.
6. **Inference**: To satisfy Requirement R2 and pass the visual and geometric quality gates, `scripts/generate_vehicles.py` must be upgraded to replace the generic rectangular blockouts with 16 dedicated sculpting renderers, implement the 4-tier color engine, add 2.5D glass with roof overhang shadows, introduce 8 distinct wheel styles, and implement active 4-frame animations (suspension bounce, rotating wheels, and rolling vertical treads).

---

## 3. Caveats

- **Runtime Matrix Leak (Requirement R1)**: While investigating the generator, we noted that `apps/web/src/art/vehicle.ts` lines 48–51 lacks `ctx.save()`/`ctx.restore()` and `apps/web/src/art/vehicle-loader.ts` lines 230–244 lacks `ctx.setTransform(1, 0, 0, 1, 0, 0)`. This belongs to Requirement R1 and must be resolved alongside R2 to ensure the generated left-facing sprites display correctly in game.
- **Showroom UI Integration (Requirement R3)**: Pedestal cycling and shop category filters live in `apps/web/src/game/showroom.ts` and `VehicleShopPanel.tsx`, which consume the generated assets.
- **Read-Only Scope**: This agent is strictly an explorer and did not modify any source code or assets. All findings and proposals are documented in `analysis.md` and this handoff.

---

## 4. Conclusion

Requirement R2 is fully scoped and ready for implementation.
1. The generator pipeline structure and geometric contracts (`192x160`, `contactY=37`, `width<=40`, `saddle x=24 y=16..20`) are well-defined and enforceable via automated scripts.
2. The root cause of subpar visual quality and animation stagnation in `scripts/generate_vehicles.py` is the over-reliance on generic rectangular templates and the omission of `frame_idx` in vertical rendering branches.
3. The comprehensive implementation blueprint in `.agents/teamwork/explorer_survey_r2/analysis.md` provides exact specifications for all 8 quality layers, 16 model-specific sculpting passes, 4-frame suspension bounce mechanics, and metadata synchronization with `@cozy/game-data`.

---

## 5. Verification Method

To independently verify the survey findings and validate future implementation:

1. **Verify Geometric & Asset Integrity**:
   ```bash
   python scripts/audit_vehicle_geometry.py
   node scripts/verify-vehicle-assets.mjs
   ```
2. **Verify Game Data & Web Test Suites**:
   ```bash
   pnpm --filter @cozy/game-data test
   pnpm --filter @cozy/web test vehicle
   pnpm --filter @cozy/web test showroom
   ```
3. **Verify Frame Animation Activity**:
   ```bash
   python -c "
   from PIL import Image
   img = Image.open('assets/vehicles/cars/ferrari-f40/spritesheet.png')
   f0 = img.crop((0, 0, 48, 40)).tobytes()
   f1 = img.crop((48, 0, 96, 40)).tobytes()
   diff = sum(1 for a, b in zip(f0, f1) if a != b)
   print('Down f0 vs f1 diff bytes:', diff)
   "
   ```
   * *Invalidation condition*: If diff bytes is 0, the vertical animation is frozen.

4. **Detailed Analysis Reference**:
   Inspect `.agents/teamwork/explorer_survey_r2/analysis.md` for full vehicle-by-vehicle design specifications and architectural guidelines.
