# Requirement R2 Analysis: WOW 2.5D Pixel Art Vehicle Asset Generation & Geometry Pipeline

**Author**: Explorer R2 WOW Pixel Art  
**Date**: 2026-10-08  
**Working Directory**: `c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_r2`  
**Reference Directives**: `ORIGINAL_REQUEST.md` (section `## 2026-10-08T14:57:19Z`), `MASTER_VEHICLE_ART_DIRECTION_PLAN.docx`, `AGENTS.md`

---

## 1. Executive Summary

Requirement R2 mandates upgrading the master vehicle generator (`scripts/generate_vehicles.py`) to generate true **WOW 2.5D Pixel Art** for all **16 canonical vehicles** across **4 directions** (Down, Left, Right, Up) and **4 animation frames** per direction (Idle + 3 drive frames), strictly conforming to the 8 quality layers of `MASTER_VEHICLE_ART_DIRECTION_PLAN.docx` and the geometric contracts enforced by `scripts/audit_vehicle_geometry.py` and `@cozy/game-data`.

Our deep investigation revealed:
1. **Geometric Compliance Baseline**: Currently, `python scripts/audit_vehicle_geometry.py` and `node scripts/verify-vehicle-assets.mjs` pass 100% on the existing files. `pnpm --filter @cozy/game-data test` passes 157/157 tests.
2. **Critical Quality & Animation Deficiencies**:
   - **Frozen Vertical Animations**: In Down (row 0) and Up (row 3) directions, frames 0, 1, 2, and 3 are **100% byte-for-byte identical (0 diff bytes)** across all 16 models!
   - **Minimal Side Animation**: In Left (row 1) and Right (row 2) directions, only 3 to 12 pixels differ between frames (spoke pixel toggles only). There is zero suspension bounce, zero body vibration, and zero reflection shimmer.
   - **Template Copy-Paste Silhouettes**: Supercars and sports sedans currently share a generic rectangular blockout (`draw_rect(img, 5, 19, 36, 9)`) and identical greenhouse boxes, lacking model-specific silhouettes.
   - **Flat 2D Materials**: Missing the 4 color depth layers (deep underbody occlusion, authentic mid-tone, reflection contour, sharp specular catchlights), 2.5D glass with roof overhang shadows, and distinct rim types.
   - **Metadata Discrepancies**: Minor price and speed mismatches exist between `generate_vehicles.py` and canonical `packages/game-data/src/vehicles.ts`.

This document synthesizes our empirical findings and outlines the complete architectural upgrade plan for `scripts/generate_vehicles.py`.

---

## 2. Codebase & Pipeline Architecture Survey

### 2.1 File Map & Responsibilities

| File Path | Role & Scope |
|---|---|
| `scripts/generate_vehicles.py` | Master procedural Python generator. Generates `spritesheet.png` (192x160), `preview.png` (144x120), `icon.png` (48x40), and `meta.json` for 16 models in `assets/vehicles/` and mirrors them to `apps/web/public/vehicles/`. |
| `scripts/audit_vehicle_geometry.py` | Strict pixel geometry auditor: verifies spritesheet dimensions (192x160), solid body width <= 40 px in all 16 frames, wheel ground contact `max_y == 37` in rows 1 and 2, and two-wheeler saddle at `x=24, y=16..20`. |
| `scripts/verify-vehicle-assets.mjs` | File system and header integrity auditor: verifies PNG magic headers, IHDR chunk dimensions, non-zero file sizes, and `meta.json` schema across both canonical and public directories. |
| `packages/game-data/src/vehicles.ts` | Server-authoritative vehicle definitions, speed caps, pricing, collision dimensions, mounting anchor points, and lighting vectors. |
| `packages/game-data/src/vehicles.test.ts` | Vitest test suite enforcing canonical IDs, aliases, mounting geometry, speeds, and showroom setups. |
| `apps/web/src/art/vehicle.ts` | Procedural HTML Canvas fallback renderer (`vehicleCanvas`). |
| `apps/web/src/art/vehicle-loader.ts` | Dynamic asset loader with zero-downtime canvas texture cache, async PNG enhancement, and texture refresh. |

### 2.2 Geometric Constraints Matrix

| Parameter | Constraint | Enforcing Test / Script | Rationale |
|---|---|---|---|
| Frame Width & Height | `48 × 40 px` | `audit_vehicle_geometry.py`, `vehicles.test.ts` | Standard Phaser frame tile in Cozy Compute MMO. |
| Spritesheet Dimensions | `192 × 160 px` (4x4) | `audit_vehicle_geometry.py`, `verify-vehicle-assets.mjs` | 4 directions (Down=0, Left=1, Right=2, Up=3) × 4 frames (Idle=0, Drive1=1, Drive2=2, Drive3=3). |
| Maximum Body Width | `width <= 40 px` | `audit_vehicle_geometry.py` line 76 | Fits `40 px` road width (`TOWN_ROADS`) without triggering `off_road` traffic fine. |
| Wheel Ground Contact | `max_y == 37 px` (rows 1 & 2) | `audit_vehicle_geometry.py` line 82 | Baseline road alignment across all vehicles and avatar containers. |
| Two-Wheeler Saddle Pivot | `x=24, y=16..20` (rows 1 & 2) | `audit_vehicle_geometry.py` line 88, `vehicles.ts` | Perfect mount alignment with player torso crop `(0, 0, 32, 40)` and avatar container offset `y = -4`. |
| Ambient Shadow Alpha | `alpha <= 128` below y=37 | `audit_vehicle_geometry.py` line 62 (`a > 128`) | Prevents soft ground drop shadows at y=38, 39 from failing the `max_y == 37` test. |

---

## 3. Empirical Audit Results & Verification Baseline

We executed the audit scripts directly against the current repository state:

### 3.1 `python scripts/audit_vehicle_geometry.py`
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

### 3.2 `node scripts/verify-vehicle-assets.mjs`
```
Models verified: 16
Total files checked across both locations: 128 / 128
Total errors found: 0
>>> COMPLETE ASSET VERIFICATION & GEOMETRY AUDIT PASSED 100% <<<
```

### 3.3 Vitest Test Suites
- `pnpm --filter @cozy/game-data test`: **20 passed (20 test files, 157 tests)**
- `pnpm --filter @cozy/web test vehicle`: **2 passed (28 tests)**
- `pnpm --filter @cozy/web test showroom`: **1 passed (5 tests)**

---

## 4. Gap Analysis: Current Generator vs 8 WOW 2.5D Quality Layers

While the current files pass the geometric bounding-box test, an inspection of the spritesheet pixel bytes revealed severe shortcomings against the artistic directives in `MASTER_VEHICLE_ART_DIRECTION_PLAN.docx`.

### 4.1 Frame-by-Frame Diff Evidence: Frozen Vertical Frames

We ran an automated byte-level diff analysis across all 16 models comparing frame 0 vs frame 1 for Down (row 0), Up (row 3), and Right (row 2):

| Vehicle Model | Down Diff (bytes) | Up Diff (bytes) | Right Diff (pixels) | Status |
|---|---|---|---|---|
| `bicycles/trek-marlin-7` | **0** | **0** | 28 px | Vertical completely frozen |
| `motorcycles/vespa-primavera-150` | **0** | **0** | 9 px | Vertical frozen, side 9 px only |
| `motorcycles/ducati-panigale-v4` | **0** | **0** | 9 px | Vertical frozen, side 9 px only |
| `motorcycles/honda-super-cub` | **0** | **0** | 18 px | Vertical frozen |
| `motorcycles/harley-davidson-fat-boy` | **0** | **0** | **3 px** | Vertical frozen, side only 3 px! |
| `motorcycles/kawasaki-ninja-h2` | **0** | **0** | 9 px | Vertical frozen |
| `motorcycles/yamaha-yzf-r1` | **0** | **0** | 9 px | Vertical frozen |
| `motorcycles/bmw-r1250-gs` | **0** | **0** | 24 px | Vertical frozen |
| `cars/mercedes-benz-g63` | **0** | **0** | 12 px | Vertical frozen, side 12 px only |
| `cars/lamborghini-aventador` | **0** | **0** | 12 px | Vertical frozen, side 12 px only |
| `cars/porsche-911` | **0** | **0** | 12 px | Vertical frozen, side 12 px only |
| `cars/toyota-supra-mk4` | **0** | **0** | 12 px | Vertical frozen, side 12 px only |
| `cars/ferrari-f40` | **0** | **0** | 12 px | Vertical frozen, side 12 px only |
| `cars/ford-mustang` | **0** | **0** | 12 px | Vertical frozen, side 12 px only |
| `cars/rolls-royce-phantom` | **0** | **0** | 12 px | Vertical frozen, side 12 px only |
| `cars/tesla-model-s` | **0** | **0** | 12 px | Vertical frozen, side 12 px only |

**Observation**:
- In Down and Up views, `frame_idx` was completely discarded in `scripts/generate_vehicles.py`. All 4 frames are identical duplicates.
- In side views, the only animated pixels were 3-12 spoke pixels in the wheels.
- The suspension bounce (±0.5px / 1px), body vibration, moving specular reflections, and rolling tire treads required by Section 10 of the master plan are **completely missing**.

---

### 4.2 Detailed Layer-by-Layer Evaluation

| Master Plan Layer | Current State in `generate_vehicles.py` | Required WOW 2.5D Standard | Gap Severity |
|---|---|---|---|
| **Layer 1: Silhouette** | Cars share generic body rectangle `draw_rect(img, 5, 19, 36, 9)` and identical roof boxes. In vertical views, cars share a 26x34 rectangle. | Unique, sculpted profile paths for each vehicle: low wedge (Aventador), flyline fastback (Porsche 911), boxy G-Wagon (G63), formal architectural notch (Phantom), hoop-winged bio-taper (Supra), brutalist box wing (F40). | **CRITICAL** |
| **Layer 2: Proportion** | Wheelbase is fixed at x=11 and x=34 for all cars, regardless of real-world overhangs (e.g., F40 has long rear overhang, Phantom has long hood). | Authentic wheelbases, overhang ratios, hood lengths, and roof heights tailored per model while respecting `contactY=37` and `width<=40`. | **HIGH** |
| **Layer 3: Structure** | Flat chassis rails, simple rectangular engine blocks for motorcycles. | Multi-part structural division: chassis subframe, wheel arches with inner shadow, separate fender panels, A/B/C pillars, diffusers, and aerodynamic splitters. | **HIGH** |
| **Layer 4: Material (4 Tones)** | Single base tone + 1-pixel highlight line + 1-pixel shadow line. | **4 distinct color depth layers**: 1) Dark underbody shadow / panel occlusion, 2) Authentic base mid-tone, 3) Reflection contour / light plane, 4) Sharp specular pixel catchlights. | **CRITICAL** |
| **Layer 5: Lighting & Glass** | Flat cyan glass with one diagonal line; no roof shadow; no ambient occlusion. | **2.5D Reflective Glass**: dark interior base + roof overhang occlusion shadow + 45° diagonal reflection streak + sky tint. Realistic ground contact shadow beneath wheels. | **CRITICAL** |
| **Layer 6: Micro-detail** | Single-pixel dots for lights, flat exhaust rectangles. | Perforated brake rotors, Brembo calipers (red/yellow), distinct headlights with housing + reflector core + lens gleam, panel seams, door handles, fuel caps. | **HIGH** |
| **Layer 7: Signature Pass** | Minimal superficial lines (e.g. 2 lines for Mustang stripes, 1 rect for F40 wing). | Minimum 3-7 authentic signature elements per vehicle (e.g., F40 Lexan slats & NACA ducts & triple exhaust; G63 Panamericana grille & spare tire & top turn signals & side exhaust; etc.). | **CRITICAL** |
| **Layer 8: Animation Pass** | 0 diff in vertical views; only 3-12 spoke pixels in side views. | **4 frames per direction**: wheel rotation (alloy, star, wire, turbine, solid disc) + suspension bounce (±0.5px / 1px vertical body bob) + specular gleam shift + rolling tread in vertical views. | **CRITICAL** |

---

### 4.3 16-Vehicle Signature Details Specification Audit

The master plan (`MASTER_VEHICLE_ART_DIRECTION_PLAN.docx` section 8) explicitly requires the following signature features for all 16 models:

| Vehicle Model | Mandatory Signature Features | Current Deficit |
|---|---|---|
| **1. Ferrari F40** | Cánh gió hộp vuông nguyên khối, nắp máy kính rãnh Lexan, hốc NACA nắp capo & hông, 3 ống xả tròn giữa, pop-up headlight seam. | Wing has no hollow gap; Lexan cover is a single line; NACA ducts are single pixels; exhaust is flat block. |
| **2. Lamborghini Aventador SVJ** | Dáng nêm siêu thấp, cánh gió ALA carbon trên 2 pylon, hốc hút gió sườn lớn tam giác, đèn LED chữ Y trước & sau, ống xả kép đặt cao giữa đèn hậu. | Nose is not sufficiently low/wedged; Y-LED DRLs only 2 pixels; high-mount exhaust missing in side view. |
| **3. Porsche 911 GT3 RS** | Cánh gió cao cổ thiên nga (swan-neck), hông nở rộng, mang cá tản nhiệt vè trước (louvers), dải LED đuôi kéo dài, mâm center-lock cùm vàng PCCB. | Roofline is square instead of fastback flyline; swan-neck mount is crude; rear wide hips not pronounced. |
| **4. Toyota Supra MK4** | Cánh gió cong cao vút (hoop spoiler), 4 vòng đèn tròn LED mỗi bên trên nền đen, body tròn cơ bắp JDM, pô đại 4-inch đánh bóng, hốc tản nhiệt intercooler. | Spoiler lacks hollow arch; 4-lamp pods not visible in side view; body is boxy instead of bulbous/curved. |
| **5. Mercedes G63 AMG** | Body vuông cơ bắp, lưới tản nhiệt Panamericana, bánh sơ-cua bọc inox, xi-nhan vè trước nhô cao, pô kép hông xe dưới bậc lên xuống. | Body is good start but needs sharper rain gutters, Panamericana chrome slats, and prominent side exhaust tips. |
| **6. Rolls-Royce Phantom VIII** | Grille đền Pantheon mạ crôm, tượng Spirit of Ecstasy, hai tông màu (nắp capo bạc), cửa mở ngược suicide doors với tay nắm đôi chrome, mâm logo RR đứng yên. | Two-tone silver hood needs crisper contrast; Pantheon grille needs vertical slats; coach door handle needs polish. |
| **7. Ford Mustang Shelby GT500** | Sọc đua Le Mans kép trắng chạy dài mũi đến đuôi, hốc gió lồi cơ bắp trên nắp máy (heat extractor), lưới tản nhiệt Cobra, đèn hậu 3 dải dọc (tri-bar LED). | Le Mans stripes only in 2 views; hood scoop missing; tri-bar vertical taillights missing in side/rear. |
| **8. Tesla Model S Plaid** | Nóc kính panorama toàn cảnh trong suốt vuốt dài, tay nắm cửa phẳng chìm, đuôi gió carbon, mâm turbine Arachnid, mũi khí động học không lưới. | Panoramic glass needs cyan/sky reflection arc; nose needs clean aero curve; turbine wheels need angled blades. |
| **9. Ducati Panigale V4 S** | Cánh gió carbon biplane, phuộc Öhlins vàng, gắp đơn sau lộ mâm (single-sided swingarm), sắc đỏ Rosso Corsa 4 tầng màu. | Winglets are single block; swingarm doesn't expose rear wheel; red paint lacks 4-tier depth. |
| **10. Kawasaki Ninja H2** | Khung mắt cáo xanh lá Lime Green, đầu xe ram-air sắc nhọn khí động học, sơn đen bóng kim loại, cánh gió carbon, pô Akrapovic. | Trellis frame lines are sparse; ram-air intake needs distinct duct; origami fairing needs sharp facets. |
| **11. Yamaha YZF-R1M** | Đèn projector đôi giấu dưới mũi, hốc gió mũi xe phong cách M1 MotoGP, khung nhôm Deltabox xám bạc, màu Icon Blue racing. | Nose lacks M1 air duct; projector lamps need distinct recessed housing; Deltabox frame needs definition. |
| **12. BMW R1250 GS Adventure** | Đầu mỏ vịt (beak), 2 đầu xi-lanh Boxer chìa sang bên, khung chống đổ thép, 2 thùng nhôm phượt (panniers), kính chắn gió touring cao. | Beak is flat block; Boxer heads need horizontal extrusion in top/front; aluminum panniers need riveted look. |
| **13. Vespa Primavera 150** | Thân ong bo tròn mềm mại (wasp waist), viền crôm quanh yếm, yếm cong và yên da nâu/kem thanh lịch, gắp đơn kiểu càng máy bay, đèn tròn retro. | Wasp-waist curve needs rounder pixel steps; single-sided front trailing link suspension arm missing. |
| **14. Honda Super Cub C125** | Yếm trắng uốn cong kinh điển, gác baga inox, đèn tròn retro gắn tay lái, hộp xích kín, yên đỏ vintage, bánh căm nan hoa. | White legshields need organic curve; chaincase needs enclosed cover; vintage red seat needs piping. |
| **15. Harley-Davidson Fat Boy** | Mâm nhôm đúc đặc Lakester (solid disc), pô kép vát xéo shotgun, bình xăng giọt nước, đèn pha to bản khổng lồ, lốp béo 240mm. | Lakester wheels need machined perimeter lip; shotgun pipes need staggered bevel; fat tires need visual weight. |
| **16. Trek Marlin 7 Gen 3** | Khung nhôm Alpha Silver cong thể thao, căm nan hoa xoay khi đạp, đĩa líp nhiều tầng & củ đề Shimano, phuộc dầu RockShox vàng, giò đĩa quay. | Frame tubes need hydroformed slope; rear cassette & chain need 4-frame animation; wire spokes need cross-lacing. |

---

## 5. Architectural Upgrade Plan for `scripts/generate_vehicles.py`

To solve all quality gaps while strictly complying with the geometry auditor, `scripts/generate_vehicles.py` must be comprehensively restructured:

### 5.1 Architecture Overview

```
scripts/generate_vehicles.py
├── Data & Canonical Synchronization
│   └── VEHICLE_SPECS (synchronized prices, speeds, colors with @cozy/game-data)
├── Core Shading & Color Engine (4 Tones)
│   ├── darken(), lighten(), blend()
│   ├── get_4tone_palette(base_hex) -> [deep_shadow, mid, light_plane, specular]
│   └── get_material_palette(kind) -> rubber, chrome, glass, carbon, steel, gold
├── Advanced 2.5D Primitives
│   ├── draw_pixel_aa() (controlled opacity blending)
│   ├── draw_shadow_25d() (contact at y=37, drop shadow alpha <= 128 at y=38..39)
│   ├── draw_glass_25d(x, y, w, h, overhang_shadow=True, reflection_angle=45)
│   └── draw_wheel_3d(cx, cy=32, frame, rim_type, caliper_color, rim_color)
├── Specialized Sculpting Engines (16 Unique Models)
│   ├── render_bicycle_trek_marlin()
│   ├── render_motorcycle_vespa()
│   ├── render_motorcycle_ducati()
│   ├── render_motorcycle_super_cub()
│   ├── render_motorcycle_harley()
│   ├── render_motorcycle_ninja_h2()
│   ├── render_motorcycle_yamaha_r1()
│   ├── render_motorcycle_bmw_gs()
│   ├── render_car_g63()
│   ├── render_car_aventador()
│   ├── render_car_porsche_gt3()
│   ├── render_car_supra_mk4()
│   ├── render_car_f40()
│   ├── render_car_mustang_gt500()
│   ├── render_car_phantom()
│   └── render_car_tesla_plaid()
├── 4-Direction & 4-Frame Animation Dispatcher
│   ├── dir 0 (Down / Front): Front view with animated scrolling treads & light pulse
│   ├── dir 1 (Left): True left-facing profile with suspension bounce
│   ├── dir 2 (Right): True right-facing profile with suspension bounce & rotating wheels
│   └── dir 3 (Up / Rear): Rear view with animated scrolling treads & exhaust heat shimmer
└── Asset Pack Exporter & Mirror
    ├── Spritesheet (192x160)
    ├── Preview (144x120, 3x nearest-neighbor)
    ├── Icon (48x40)
    ├── Meta JSON (synchronized fields)
    └── Public Mirror to apps/web/public/vehicles/
```

---

### 5.2 Implementation Specifications

#### 1. Color Depth Engine (4 Tone Tiers)
Each vehicle will compute a 4-tone palette dynamically from its primary and accent colors:
- `c_deep_shadow`: `darken(color, 0.45)` — Used for underbody chassis, panel gaps, door creases, wheel arch cavities.
- `c_mid`: Authentic base vehicle paint color.
- `c_light`: `lighten(color, 1.25)` — Upper shoulder lines, hood surfaces, fender peaks.
- `c_specular`: `lighten(color, 1.60)` or `(255, 255, 255, 220)` — Sharp pixel highlights along ridge lines and lighting glints.

#### 2. 2.5D Reflective Glass Engine
`draw_glass_25d(img, x, y, w, h, col, overhang=True, frame_offset=0)`:
- Base: Dark cabin interior `(15, 23, 42, 255)`.
- Overhang Shadow: Top 1-2 pixels darkened to `(10, 15, 30, 240)` representing roof occlusion.
- Sky Reflection: Mid-band tinted with cyan/sky blue `blend(col, (15, 23, 42), 0.40)`.
- 45° Specular Streak: 2-pixel wide diagonal lines `(255, 255, 255, 220)` and `(224, 242, 254, 140)` that slide smoothly by `frame_offset` during driving frames.

#### 3. 3D Wheels & Calipers Engine
`draw_wheel_3d(img, cx, cy=32, frame=0, rim_type='alloy', caliper_col=(220, 38, 38, 255), rim_col=...)`:
- Tire Rubber: Bo rounded octagonal contour (radius 5: cx-3..cx+3 at cy-5 and cy+5, cx-5..cx+5 at cy-3..cy+3). Ground contact firmly anchored at `y=37` across all frames.
- Fender Inner Arch Shadow: `(10, 14, 22, 190)` above tire at `cy-6`.
- Rim Outer Lip: Highlighted metallic rim line at `cy-3` and shadowed bottom at `cy+3`.
- Brake Rotor: Silver disc `(148, 163, 184, 255)` with dark center hub.
- Brembo Calipers: High-contrast red `(220, 38, 38)` or gold `(234, 179, 8)` caliper at `cx+2, cy-1..cy`.
- 8 Distinct Rim Types with 4-Frame Spoke Rotation:
  1. `star_5`: Ferrari F40 Speedline 5-spoke star.
  2. `star_dual`: Lamborghini SVJ dual-spoke forged carbon.
  3. `center_lock`: Porsche GT3 RS multi-spoke satin black with yellow caliper.
  4. `turbine`: Tesla Model S Plaid directional turbine blades.
  5. `pantheon`: Rolls-Royce Phantom multi-spoke chrome with static upright RR emblem.
  6. `lakester`: Harley Fat Boy solid disc with perimeter machined lip and rotating rivets.
  7. `wire`: Trek Marlin, Honda Super Cub, BMW GS rotating cross-laced wire spokes.
  8. `alloy_jdm`: Toyota Supra, Mustang GT500, G63 sports alloys.

#### 4. Suspension Bounce & 4-Frame Animation System
To ensure smooth animation without violating `audit_vehicle_geometry.py` (`max_y == 37` in rows 1 & 2):
- **Tires**: Bottom contact rubber pixel strictly remains at `y=37` on all frames (col 0, 1, 2, 3).
- **Body & Cabin Suspension Bounce**:
  - `Frame 0 (Idle)`: Suspension offset `dy = 0`.
  - `Frame 1 (Drive 1)`: Suspension compression `dy = 1` (body lowers by 1px toward wheels, spoke angle 30°).
  - `Frame 2 (Drive 2)`: Suspension neutral `dy = 0` (spoke angle 60°).
  - `Frame 3 (Drive 3)`: Suspension rebound `dy = -1` (body raises by 1px, spoke angle 90°).
  - For 2-wheelers: Since saddle must remain in `y=16..20`, base saddle at `y=17` or `y=18` fluctuates between `16` and `19`, strictly within bounds!
- **Vertical Animation (Down & Up)**:
  - Scrolling tire tread grooves: Tire tread pixels roll downward (Down) or upward (Up) by 1px per frame.
  - Headlight / taillight luminous pulse: Core pixel brightness shifts subtly between idle and drive.
  - Subtle body suspension vibration: Body shifts by ±1px on drive frames, eliminating the frozen 0-diff bug completely!

---

## 6. Verification Method & Success Criteria

### 6.1 Independent Verification Commands
```bash
# 1. Regenerate all 16 vehicle asset packs
python scripts/generate_vehicles.py

# 2. Verify pixel geometry (192x160, width<=40, contactY=37, saddle x=24 y=16..20)
python scripts/audit_vehicle_geometry.py

# 3. Verify asset integrity and meta.json across both directories
node scripts/verify-vehicle-assets.mjs

# 4. Verify game data and web unit tests
pnpm --filter @cozy/game-data test
pnpm --filter @cozy/web test vehicle
pnpm --filter @cozy/web test showroom

# 5. Full workspace typecheck, lint, and format
pnpm typecheck
pnpm lint
pnpm format:check

# 6. Verify non-zero animation frame differences in vertical views
python -c "
from PIL import Image
import os
for m in ['cars/ferrari-f40', 'cars/mercedes-benz-g63', 'motorcycles/vespa-primavera-150', 'bicycles/trek-marlin-7']:
    img = Image.open(f'assets/vehicles/{m}/spritesheet.png')
    f0 = img.crop((0, 0, 48, 40)).tobytes()
    f1 = img.crop((48, 0, 96, 40)).tobytes()
    diff = sum(1 for a, b in zip(f0, f1) if a != b)
    print(f'{m} Down f0 vs f1 diff bytes: {diff} (MUST BE > 0)')
"
```

### 6.2 Acceptance Criteria
1. `audit_vehicle_geometry.py` passes 16/16 vehicles (100%).
2. `verify-vehicle-assets.mjs` passes 128/128 files across canonical and public mirror (100%).
3. Down and Up views have non-zero diff bytes (> 0) demonstrating active rolling tread and body animation.
4. Left and Right views have rich animation (> 50 diff pixels) demonstrating rotating spokes, suspension bounce, and reflection gleam.
5. All 16 models exhibit distinct, recognizable silhouettes and at least 3 signature styling features matching the master plan specifications.
6. All tests pass with zero errors.

---

## 7. Next Steps for Implementation

1. Update `scripts/generate_vehicles.py` with the complete 8-layer generator architecture and model-specific renderers.
2. Run generator and execute `audit_vehicle_geometry.py` and `verify-vehicle-assets.mjs`.
3. Validate visual output and inspect pixel clusters.
4. Ensure synchronization with runtime loader (`vehicle-loader.ts`) and fallback canvas (`vehicle.ts`).
