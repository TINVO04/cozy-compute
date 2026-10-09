# Handoff Report: Worker M2 WOW 2.5D Generator & 16-Vehicle Regeneration

**Author**: Worker M2 (`worker_m2`)  
**Role**: implementer, qa, specialist  
**Date**: 2026-10-08T15:54:00Z  
**Parent Agent**: `593b4217-f7c5-4fd0-87d3-8ef1b166fb4a`  
**Directives**: `ORIGINAL_REQUEST.md` (section `## 2026-10-08T14:57:19Z`), `MASTER_VEHICLE_ART_DIRECTION_PLAN.docx`, `AGENTS.md`

---

## 1. Observation

1. **Initial Codebase Deficits**:
   - `scripts/generate_vehicles.py`: In Down (`dir_idx = 0`) and Up (`dir_idx = 3`) branches, `frame_idx` was completely ignored, producing 0 diff bytes between frames 0, 1, 2, and 3 across all 16 models.
   - Side views (Left `dir_idx = 1` and Right `dir_idx = 2`) previously contained only 3 to 28 differing spoke pixels without suspension bounce, body vibration, or moving specular reflection streaks.
   - Cars previously shared generic rectangular body cutouts (`draw_rect(img, 5, 19, 36, 9)`) and identical greenhouse boxes without genuine model-specific sculptural silhouettes.
   - Missing 4 color depth layers (deep underbody occlusion, authentic mid-tone, reflection contour, sharp specular catchlights) and 2.5D reflective glass with overhang shadow.
   - Discrepancies in `generate_vehicles.py` metadata vs `packages/game-data/src/vehicles.ts`:
     - Honda Super Cub price: was 450 -> canonical is 500.
     - Harley-Davidson Fat Boy: was price 2100, speed 260 -> canonical is price 1600, speed 250.
     - Kawasaki Ninja H2: was price 3100 -> canonical is price 3000.
     - Yamaha YZF-R1: was price 2300, speed 305 -> canonical is price 2600, speed 315.
     - BMW R1250 GS: was price 2600, speed 275 -> canonical is price 2200, speed 260.
     - Ford Mustang: was price 2700, speed 295 -> canonical is price 2000, speed 275.
     - Tesla Model S: was price 3000 -> canonical is price 3100.

2. **Execution & Audit Results**:
   - `python scripts/generate_vehicles.py`: Generated all 16 vehicle models into `assets/vehicles/` and mirrored to `apps/web/public/vehicles/` (128 files total).
   - `python scripts/audit_vehicle_geometry.py`:
     ```
     Running Deep Pixel Geometry Audit on all 16 vehicle models...
       [OK] bicycles/trek-marlin-7 passed all geometric criteria (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
       [OK] motorcycles/vespa-primavera-150 passed all geometric criteria
       [OK] motorcycles/ducati-panigale-v4 passed all geometric criteria
       [OK] motorcycles/honda-super-cub passed all geometric criteria
       [OK] motorcycles/harley-davidson-fat-boy passed all geometric criteria
       [OK] motorcycles/kawasaki-ninja-h2 passed all geometric criteria
       [OK] motorcycles/yamaha-yzf-r1 passed all geometric criteria
       [OK] motorcycles/bmw-r1250-gs passed all geometric criteria
       [OK] cars/mercedes-benz-g63 passed all geometric criteria
       [OK] cars/lamborghini-aventador passed all geometric criteria
       [OK] cars/porsche-911 passed all geometric criteria
       [OK] cars/toyota-supra-mk4 passed all geometric criteria
       [OK] cars/ferrari-f40 passed all geometric criteria
       [OK] cars/ford-mustang passed all geometric criteria
       [OK] cars/rolls-royce-phantom passed all geometric criteria
       [OK] cars/tesla-model-s passed all geometric criteria
     All 16 models 100% COMPLIANT with all geometric and artistic constraints!
     ```
   - `node scripts/verify-vehicle-assets.mjs`:
     ```
     Models verified: 16
     Total files checked across both locations: 128 / 128
     Total errors found: 0
     >>> COMPLETE ASSET VERIFICATION & GEOMETRY AUDIT PASSED 100% <<<
     ```
   - Active Frame Animation Diff Analysis across all 16 models:
     ```
     bicycles/trek-marlin-7              Down:   72 B | Up:   57 B | Right:  475 B | [OK]
     motorcycles/vespa-primavera-150     Down:   99 B | Up:   75 B | Right:  667 B | [OK]
     motorcycles/ducati-panigale-v4      Down:   99 B | Up:   75 B | Right:  522 B | [OK]
     motorcycles/honda-super-cub         Down:   99 B | Up:   75 B | Right:  633 B | [OK]
     motorcycles/harley-davidson-fat-boy Down:   99 B | Up:   75 B | Right:  642 B | [OK]
     motorcycles/kawasaki-ninja-h2       Down:   99 B | Up:   75 B | Right:  563 B | [OK]
     motorcycles/yamaha-yzf-r1           Down:   99 B | Up:   75 B | Right:  583 B | [OK]
     motorcycles/bmw-r1250-gs            Down:   99 B | Up:   75 B | Right:  669 B | [OK]
     cars/mercedes-benz-g63              Down:  303 B | Up:  369 B | Right: 1159 B | [OK]
     cars/lamborghini-aventador          Down:  291 B | Up:  348 B | Right: 1068 B | [OK]
     cars/porsche-911                    Down:  294 B | Up:  390 B | Right: 1047 B | [OK]
     cars/toyota-supra-mk4               Down:  294 B | Up:  336 B | Right: 1050 B | [OK]
     cars/ferrari-f40                    Down:  294 B | Up:  348 B | Right: 1069 B | [OK]
     cars/ford-mustang                   Down:  276 B | Up:  342 B | Right: 1156 B | [OK]
     cars/rolls-royce-phantom            Down:  294 B | Up:  360 B | Right:  972 B | [OK]
     cars/tesla-model-s                  Down:  294 B | Up:  360 B | Right:  984 B | [OK]
     ALL 16 MODELS HAVE ACTIVE ANIMATIONS IN ALL DIRECTIONS!
     ```
   - Test suites:
     - `pnpm --filter @cozy/game-data test`: 20 test files, 157 passed (100%).
     - `pnpm --filter @cozy/web test`: 14 test files, 111 passed (100%).
     - `pnpm typecheck`: 8 workspace projects clean.
     - `pnpm lint`: clean (0 violations).
     - `pnpm format:check`: 100% Prettier compliant.

---

## 2. Logic Chain

1. **Root Cause of Deficits**:
   - In `scripts/generate_vehicles.py`, vertical drawing branches (`dir_idx in (0, 3)`) had zero logic conditional on `frame_idx`. Frame 0 through 3 were exact duplicates.
   - Side drawing branches did not implement body bobbing or sliding reflections, and wheel spoke animations were rudimentary.
   - Vehicles were drawn using generic rectangular boxes rather than distinct brand silhouettes and multi-tier shading.

2. **Architectural Solution Implemented**:
   - **4-Tier Color Shading Engine (`get_4tone_palette`)**: Computes `c_deep` (underbody shadow / panel crease `darken(color, 0.45)`), `c_mid` (authentic paint), `c_light` (reflection contour `lighten(color, 1.25)`), and `c_spec` (sharp specular highlight `lighten(color, 1.60)`).
   - **2.5D Reflective Glass Engine (`draw_glass_25d`)**: Renders dark cabin interior, top roof overhang occlusion shadow (`10, 15, 28, 240`), semi-transparent sky blue tint, and a 45° diagonal reflection streak that slides smoothly by `(frame_idx * 2) % (w + h)` during driving frames.
   - **3D Rubber Tires & 8 Rim Types Engine (`draw_wheel_3d`)**:
     * Octagonal bo-rounded rubber tire with grip catchlights.
     * Inner wheel-well cavity shadow at `cy - 6`.
     * Disc brake steel rotor with cooling vent dot.
     * Red / yellow Brembo calipers visible behind spokes.
     * 8 distinct rim types with 4-frame rotation animation: `star_5` (F40 Speedline), `star_dual` (Aventador SVJ forged carbon), `center_lock` (Porsche GT3 RS satin black + yellow PCCB caliper), `turbine` (Tesla Plaid Arachnid), `pantheon` (Rolls-Royce Phantom multi-spoke with static upright RR emblem), `lakester` (Harley Fat Boy solid disc with rotating perimeter rivets), `wire` (Trek Marlin, Super Cub, BMW GS rotating wire spokes), and `alloy_jdm` (Toyota Supra, Mustang, G63 sports alloys).
   - **Suspension Bounce System**:
     * In horizontal views: frame 1 compresses body by 1px downward (`dy = 1`), frame 3 rebounds by 1px upward (`dy = -1`), frame 0/2 neutral (`dy = 0`).
     * Invariant guarantee: The bottom contact rubber of the wheels is strictly locked at `y = 37` across ALL frames.
     * Invariant guarantee: For 2-wheelers, saddle with base `y = 17..18` bobs to `16..19`, strictly within `y in 16..20` and `x in 22..26`.
   - **Vertical Animation (Down & Up)**:
     * Rolling tire treads: Grooves roll with `(y + frame_idx) % 3` (Down) and `(y - frame_idx) % 3` (Up).
     * Headlight & taillight luminous pulse: Core pixel brightness shifts between drive frames.
     * This guarantees 57-390 diff bytes between frames in Down and Up directions.
   - **16 Authentic Signature Passes**:
     * Ferrari F40: Tall box wing with hollow opening, louvered Lexan slats, hood NACA ducts, triple center round exhaust.
     * Lamborghini Aventador SVJ: Ultra-low wedge nose, ALA carbon wing on dual pylons, massive triangular flank intakes, Y-signature LED DRLs, high-mount dual exhaust.
     * Porsche 911 GT3 RS: Continuous flyline fastback, towering swan-neck wing, front fender louvers (mang cá), slim LED light bar, black center-lock wheels with yellow ceramic calipers.
     * Toyota Supra MK4: Smooth curved bulbous curves, tall arched hoop spoiler with hollow center, polished 4-inch cannon exhaust, front FMIC intercooler, 4 circular taillights per side on black panel.
     * Mercedes G63 AMG: Upright boxy body with rain gutters, vertical chrome Panamericana grille, rear external spare tire with chrome star ring, elevated front fender turn signals, side-exit dual exhaust tips.
     * Rolls-Royce Phantom VIII: Towering chrome Pantheon waterfall grille, Spirit of Ecstasy statue, two-tone satin silver bonnet over midnight navy, suicide coach doors with double chrome handles, floating upright RR center caps.
     * Ford Mustang Shelby GT500: Full-length dual white Le Mans racing stripes, hood heat extractor scoop, Cobra grille, vertical tri-bar rear taillights.
     * Tesla Model S Plaid: Panoramic continuous tinted glass canopy, flush door handles, carbon trunk lip spoiler, directional turbine Arachnid wheels, smooth grille-less aero nose.
     * Ducati Panigale V4 S: Biplane carbon winglets, golden Öhlins inverted forks, single-sided swingarm exposing rear alloy wheel, Rosso Corsa 4-tier paint, titanium underbelly exhaust.
     * Kawasaki Ninja H2: Sharp origami faceted fairings, exposed lime green trellis frame, ram-air front duct, carbon winglets, mirror-coated dark spark paint.
     * Yamaha YZF-R1M: Dual projector lights recessed under nose, central M1 MotoGP duct, silver Deltabox frame, Icon Blue racing paint.
     * BMW R 1250 GS Adventure: Iconic duck beak, horizontally opposed Boxer cylinder heads with silver covers, tubular crash bars, dual aluminum expedition panniers, tall touring screen.
     * Vespa Primavera 150: Wasp-waist monocoque body, chrome edge bead piping, curved front apron, cream/tan leather saddle, single-sided front trailing link suspension.
     * Honda Super Cub C125: Classic curved white legshields, vintage red stitched saddle, enclosed chaincase guard, chrome rear luggage rack, wire spoke wheels, retro round headlight.
     * Harley-Davidson Fat Boy 114: Solid Lakester aluminum wheels with machined rivets, staggered shotgun dual chrome exhaust, teardrop fuel tank with chrome console, massive chrome headlight nacelle, fat tires.
     * Trek Marlin 7 Gen 3: Hydroformed sloping Alpha Silver aluminum frame, RockShox fork with golden stanchions, multi-cog cassette & Shimano derailleur cage with chain line, 4-frame rotating crank and pedals, wire spokes.

---

## 3. Caveats

- No caveats. All 16 models satisfy all geometric, aesthetic, and metadata requirements, verified by automated test suites and auditors.

---

## 4. Conclusion

- `scripts/generate_vehicles.py` is upgraded to full WOW 2.5D Pixel Art standards, implementing all 8 quality layers from `MASTER_VEHICLE_ART_DIRECTION_PLAN.docx`.
- All 16 vehicle asset packs are fully generated in both canonical (`assets/vehicles/`) and public mirror (`apps/web/public/vehicles/`) locations (128/128 files).
- All 16 models pass `scripts/audit_vehicle_geometry.py` with 100% compliance:
  * Frame size: 48x40 px, Spritesheet: 192x160 px.
  * Maximum body width <= 40 px across all 16 frames.
  * Lowest wheel contact rubber strictly at `y = 37 px` in rows 1 and 2.
  * Two-wheeler saddle center strictly at `x = 24, y in 16..20` in rows 1 and 2.
- The frozen vertical frame bug is completely resolved: Down and Up directions have active 4-frame animation (57 - 390 diff bytes).
- Horizontal directions have rich animations (475 - 1159 diff bytes) with rotating wheels, calipers, and suspension bounce.
- All test suites (`@cozy/game-data` 157/157 tests, `@cozy/web` 111/111 tests), `pnpm typecheck`, `pnpm lint`, and `pnpm format:check` pass cleanly with zero errors.

---

## 5. Verification Method

To independently verify this implementation:

```bash
# 1. Regenerate all 16 vehicle asset packs (128 files)
python scripts/generate_vehicles.py

# 2. Run deep pixel geometry auditor (100% compliant)
python scripts/audit_vehicle_geometry.py

# 3. Run asset integrity and meta.json auditor (128/128 files verified)
node scripts/verify-vehicle-assets.mjs

# 4. Verify active animation frame diffs (> 0 B) across all directions
python -c "
from PIL import Image
import os
for m in ['cars/ferrari-f40', 'cars/mercedes-benz-g63', 'motorcycles/vespa-primavera-150', 'bicycles/trek-marlin-7']:
    img = Image.open(f'assets/vehicles/{m}/spritesheet.png')
    f0 = img.crop((0, 0, 48, 40)).tobytes()
    f1 = img.crop((48, 0, 96, 40)).tobytes()
    diff = sum(1 for a, b in zip(f0, f1) if a != b)
    print(f'{m} Down diff bytes: {diff} (MUST BE > 0)')
"

# 5. Run Vitest test suites
pnpm --filter @cozy/game-data test
pnpm --filter @cozy/web test

# 6. Run Quality Gate checks
pnpm typecheck
pnpm lint
pnpm format:check
```
