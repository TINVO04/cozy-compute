# Forensic Audit Report: Milestone M2

**Work Product**: `scripts/generate_vehicles.py`, `scripts/audit_vehicle_geometry.py`, `assets/vehicles/`, `apps/web/public/vehicles/`  
**Profile**: General Project  
**Integrity Mode**: Development (from `ORIGINAL_REQUEST.md` section `## 2026-10-08T14:57:19Z`)  
**Auditor**: Forensic Auditor M2 (`auditor_m2_1`)  
**Verdict**: **CLEAN**  

---

## 1. Observation

### 1.1 Geometry Audit Tool Integrity (`scripts/audit_vehicle_geometry.py`)
- Direct inspection of `scripts/audit_vehicle_geometry.py` confirmed the verification criteria:
  - Spritesheet dimension validation:
    ```python
    45: if img.size != (192, 160):
    46:     print(f"[FAIL] {model_rel}: Spritesheet size is {img.size}, expected (192, 160)")
    47:     return False
    ```
  - Solid pixel threshold:
    ```python
    62: if a > 128:
    63:     solid_pixels.append((x, y))
    ```
  - Body width constraint:
    ```python
    76: if width > 40:
    77:     print(f"[FAIL] {model_rel} row={row} col={col} body width {width} exceeds 40 px!")
    78:     return False
    ```
  - Ground contact constraint strictly at `y = 37`:
    ```python
    81: if row in (1, 2):
    82:     if max_y != 37:
    83:         print(f"[FAIL] {model_rel} side profile max_y={max_y}, expected wheel contact y=37!")
    84:         return False
    ```
  - Two-wheeler saddle coordinate window:
    ```python
    87: if is_two_wheeler and row in (1, 2):
    88:     saddle_pixel_found = False
    89:     for sy in range(16, 21):
    90:         for sx in range(22, 27):
    91:             r, g, b, a = frame.getpixel((sx, sy))
    92:             if a > 128:
    93:                 saddle_pixel_found = True
    ```
- Cross-referencing against the architectural baseline established prior to Milestone M2 (`explorer_survey_r2/analysis.md` lines 47–50) proves line numbers and conditions (`a > 128`, `width <= 40`, `max_y == 37`, `sy in 16..20, sx in 22..26`) remain exactly identical. No threshold has been weakened, relaxed, or bypassed.

### 1.2 Static Analysis of Procedural Generator (`scripts/generate_vehicles.py`)
1. **4-Tier Color Depth Engine (`get_4tone_palette`)**:
   - Lines 399–412:
     ```python
     def get_4tone_palette(base_hex):
         c_mid = hex_to_rgb(base_hex)
         c_deep = darken(c_mid, 0.45)
         c_light = lighten(c_mid, 1.25)
         c_spec = lighten(c_mid, 1.60)
         return c_deep, c_mid, c_light, c_spec
     ```
   - Color hierarchy check confirmed luminance progression: `c_deep <= c_mid <= c_light <= c_spec` across all models.
   - Spritesheet pixel analysis confirmed between 23 and 40 solid colors per vehicle spritesheet.

2. **2.5D Reflective Glass Engine (`draw_glass_25d`)**:
   - Lines 469–502: Renders dark cabin interior base `(15, 23, 42)`, sky-blue tint blend, roof overhang occlusion shadow at the top (`(10, 15, 28, 240)` and `(12, 18, 34, 180)`), and an animated 45° diagonal reflection streak that translates smoothly across frames via:
     ```python
     493: streak_offset = (frame_idx * 2) % max(1, (w + h))
     ```
   - Applied to windshields and side windows of all 8 car models (including G63 upright windows and Tesla panoramic glass roof).

3. **3D Rubber Tires & 8 Rim Styles (`draw_wheel_3d`)**:
   - Lines 507–676:
     - Ground contact rubber locked at `y = 37` (`cy = 32`, radius = 5, bottom row `cy + 5 = 37`).
     - Inner wheel-arch cavity shadow at `cy - 6`.
     - Steel brake rotor with central cooling vent dot (`(100, 116, 139)`).
     - Red (`(220, 38, 38)`) and gold (`(234, 179, 8)`) Brembo brake calipers.
     - 8 distinct rim styles with active 4-frame rotation:
       1. `lakester`: Harley Fat Boy solid disc with 4-frame rotating rivets (lines 557–573).
       2. `wire`: Wire spokes with 4 rotating angle configurations (lines 574–589).
       3. `star_5`: Ferrari F40 Speedline 5-spoke star (lines 590–600).
       4. `star_dual`: Lamborghini SVJ dual Y-spoke forged carbon (lines 601–611).
       5. `turbine`: Tesla Model S Plaid Arachnid directional turbine blades (lines 612–622).
       6. `pantheon`: Rolls-Royce Phantom multi-spoke chrome with static self-righting RR emblem (lines 623–640).
       7. `center_lock`: Porsche 911 GT3 RS satin black center-lock multi-spoke (lines 641–653).
       8. `alloy_jdm` / `alloy`: Multi-spoke sports alloy (lines 654–676).

4. **16 Model-Specific Signature Passes**:
   - All 16 models have explicit, dedicated geometry blocks:
     - `ferrari-f40` (lines 1186–1195, 1326–1328): Tall rectangular box wing with hollow space, sculpted NACA side ducts, louvered Lexan rear cover slats, triple center round exhausts.
     - `lamborghini-aventador` (lines 1168–1175, 1308–1310): Low wedge nose, ALA carbon wing on dual pylons, triangular flank intake scoops, Y-shaped LED DRLs.
     - `porsche-911` (lines 1177–1183, 1323–1325): Swan-neck top-mount wing, front fender louvers (mang cá), full-width slim LED rear light bar, yellow PCCB calipers.
     - `toyota-supra-mk4` (lines 1198–1203, 1311–1313, 1319–1322): Arched hoop spoiler with hollow center, polished 4-inch cannon exhaust, front FMIC intercooler, 4 round LED taillights per side on black panel.
     - `mercedes-benz-g63` (lines 1104–1129, 1250–1278): Upright boxy body with rain gutters, elevated amber front fender turn indicators, rear external spare tire with chrome star ring, AMG side-exit dual exhaust tips, vertical chrome Panamericana grille.
     - `rolls-royce-phantom` (lines 1213–1220, 1304–1306): Two-tone silver bonnet over midnight navy, towering chrome Pantheon waterfall grille, Spirit of Ecstasy statue, suicide coach door chrome handle, static self-righting RR center caps.
     - `ford-mustang` (lines 1206–1210, 1290–1293): Full-length dual white Le Mans racing stripes, rear decklid spoiler, Cobra grille.
     - `tesla-model-s` (lines 1222–1228): Panoramic tinted glass canopy roof, flush chrome door handles, carbon trunk lip spoiler, directional turbine Arachnid wheels.
     - `ducati-panigale-v4` (lines 875–889, 1034–1036): Rosso Corsa fairings, golden Öhlins inverted forks, biplane carbon winglet, titanium underbelly exhaust.
     - `kawasaki-ninja-h2` (lines 929–944): Mirror-coated dark spark faceted fairings, exposed lime green trellis frame, downforce winglets, ram-air mouth, Akrapovic exhaust.
     - `yamaha-yzf-r1` (lines 947–962): Racing Icon Blue, Deltabox spar, concealed projectors, central M1 MotoGP duct, matte bellypan.
     - `bmw-r1250-gs` (lines 964–983, 1037–1042, 1047–1050): Duck beak, horizontally protruding Boxer cylinder heads with silver covers, tubular crash bars, dual aluminum expedition panniers, touring screen.
     - `vespa-primavera-150` (lines 851–873): Wasp-waist monocoque body, chrome edge piping, floorboard, chrome horncast cover, crystal round headlamp, chrome mirrors, exhaust.
     - `honda-super-cub` (lines 892–907): Classic curved white legshields, blue spine, chrome luggage rack, enclosed chaincase, pea-shooter exhaust, vintage red saddle.
     - `harley-davidson-fat-boy` (lines 910–927): Gloss black, teardrop fuel tank with console, Milwaukee-Eight V-Twin with chrome cooling fins, staggered shotgun dual exhaust, nacelle headlamp, Lakester solid wheels.
     - `trek-marlin-7` (lines 699–749): RockShox fork with golden stanchions, sloping Alpha Silver aluminum frame tubes, Shimano cassette & derailleur cage with chain line, 4-frame rotating crank & pedals, knobby MTB wire wheels.

### 1.3 Asset Binary Authenticity & Synchronization
- All 16 vehicle directories contain `spritesheet.png` (192×160), `preview.png` (144×120), `icon.png` (48×40), and `meta.json`.
- Exact SHA-256 match between `assets/vehicles/` and `apps/web/public/vehicles/` across all 64 file pairs (128 files total, 0 mismatches).
- Frame animation diff analysis:
  - Down (row 0): 72 B to 303 B diff between frames.
  - Left/Right (rows 1 & 2): 475 B to 1159 B diff between frames.
  - Up (row 3): 54 B to 390 B diff between consecutive frames.
  - In `bicycles/trek-marlin-7` Up direction, consecutive frames (0->1, 1->2, 2->3) actively diff (54–57 B) cycling a 3-frame rolling tread pattern, while frames 0 and 3 share State 0 because the red rear reflector at line 778 is rendered beneath the central blue frame tube drawn at line 781. All other 15 models possess 4 distinct unique frames in all 4 directions.

### 1.4 Independent Command Execution Results
1. `python scripts/audit_vehicle_geometry.py`:
   - Command: `python scripts/audit_vehicle_geometry.py`
   - Exit code: `0`
   - Output: `All 16 models 100% COMPLIANT with all geometric and artistic constraints!`
2. `node scripts/verify-vehicle-assets.mjs`:
   - Command: `node scripts/verify-vehicle-assets.mjs`
   - Exit code: `0`
   - Output: `Models verified: 16 | Total files checked: 128 / 128 | Total errors found: 0`
3. Unit test suites:
   - `pnpm --filter @cozy/game-data test`: Exit code `0` (20 files, 157 passed).
   - `pnpm --filter @cozy/web test`: Exit code `0` (14 files, 111 passed).
4. Quality gate:
   - `pnpm typecheck`: Exit code `0` (8 workspace projects clean).
   - `pnpm lint`: Exit code `0` (0 errors).
   - `pnpm format:check`: Exit code `0` (100% Prettier compliant).

---

## 2. Logic Chain

1. **Premise 1 (Tool Integrity)**: Observation 1.1 establishes that `scripts/audit_vehicle_geometry.py` was not modified or relaxed from the baseline specifications established in `ORIGINAL_REQUEST.md`. It enforces exact 192×160 dimensions, width ≤ 40 px, wheel contact strictly at y = 37 px, and saddle pivot at x=24, y=16..20.
2. **Premise 2 (Procedural Authenticity)**: Observation 1.2 demonstrates that `scripts/generate_vehicles.py` rasterizes vehicles procedurally from mathematical pixel drawing functions. It computes genuine 4-tier color shading, 2.5D reflective glass with animated 45° specular streaks, bo-rounded 3D tires with Brembo calipers, 8 unique animated rim types, and detailed model-specific signatures for all 16 models.
3. **Premise 3 (No Dummy/Facade Implementations)**: No functions return hardcoded constants or stubs to deceive tests. Bounding box calculations and contact geometry in the generator are authentic geometric alignments matching the physics and visual requirements.
4. **Premise 4 (Asset Integrity)**: Observation 1.3 proves that all 128 asset files across canonical and public mirror locations are authentic, binary-identical, and actively animated across all 4 directions.
5. **Premise 5 (Empirical Verification)**: Observation 1.4 confirms that independent executions of the geometry auditor, asset verifier, Vitest suites, typechecker, linter, and format checker all pass cleanly with exit code 0.
6. **Deduction**: Therefore, the work product satisfies all forensic integrity requirements under Development Mode with zero integrity violations.

---

## 3. Caveats

- In `bicycles/trek-marlin-7` Up direction (row 3), the red rear safety reflector drawn at line 778 is rendered beneath the central blue frame tube drawn at line 781. The rolling tire tread provides active animation across consecutive frames (0->1, 1->2, 2->3 with 54–57 bytes diff), with frames 0 and 3 sharing the same tread phase (`% 3`). This is a minor rendering order detail, not an integrity violation or facade.
- Pre-existing unrelated test failure in `apps/realtime/src/rooms/town-life.test.ts` exists outside the vehicle subsystem and was not modified by Milestone M2.

---

## 4. Conclusion

**Verdict**: **CLEAN**

The Milestone M2 deliverable in `scripts/generate_vehicles.py` and the newly generated 16-vehicle asset packs represent an authentic, high-quality, procedural pixel-art implementation adhering to all 8 WOW 2.5D quality layers. No facade logic, hardcoded test strings, or tool weakening were detected.

---

## 5. Verification Method

To independently verify this verdict:

```bash
# 1. Verify deep pixel geometry compliance across all 16 models
python scripts/audit_vehicle_geometry.py

# 2. Verify asset binary headers, file structure, and mirror synchronization
node scripts/verify-vehicle-assets.mjs

# 3. Verify Vitest vehicle test suites
pnpm --filter @cozy/game-data test
pnpm --filter @cozy/web test

# 4. Verify workspace Quality Gate
pnpm typecheck
pnpm lint
pnpm format:check
```
