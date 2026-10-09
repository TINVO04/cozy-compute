## 2026-10-08T12:46:21Z
You are worker_m3, assigned to Milestone 3: 16 Vehicle Pixel-Art Asset Packs Generation.
Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\worker_m3

## Mandatory First Step
Read the authoritative user request at:
`C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically under header `## 2026-10-08T12:29:53Z`).

Also read:
- `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\PROJECT.md`
- `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_2\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusively Owned Files
- `assets/vehicles/*`
- `apps/web/public/vehicles/*`
- Any helper script you create to generate and verify assets (e.g. `scripts/generate-vehicles.mjs`)
- Your working directory `.agents/teamwork/worker_m3/*`
DO NOT edit code files outside this set.

## Objective & Requirements
Generate standard pixel-art asset packs for all 16 vehicle models of Cozy Compute Social MMO:
- **1 Bicycle**: `bicycles/trek-marlin-7`
- **7 Motorcycles**: `motorcycles/vespa-primavera-150`, `motorcycles/ducati-panigale-v4`, `motorcycles/honda-super-cub`, `motorcycles/harley-davidson-fat-boy`, `motorcycles/kawasaki-ninja-h2`, `motorcycles/yamaha-yzf-r1`, `motorcycles/bmw-r1250-gs`
- **8 Cars**: `cars/mercedes-benz-g63`, `cars/lamborghini-aventador`, `cars/porsche-911`, `cars/toyota-supra-mk4`, `cars/ferrari-f40`, `cars/ford-mustang`, `cars/rolls-royce-phantom`, `cars/tesla-model-s`

For EACH vehicle model, create 4 files:
1. `spritesheet.png`: Exactly `192 × 160 px` PNG.
   - 4 columns × 4 rows of `48 × 40 px` frames.
   - Rows: 0=Down (dir 0), 1=Left (dir 1), 2=Right (dir 2), 3=Up (dir 3).
   - Columns: 0=Idle (frame 0), 1=Drive 1 (frame 1), 2=Drive 2 (frame 2), 3=Drive 3 (frame 3).
   - Wheel ground contact at `y = 37 px`.
   - Max body width `≤ 40 px` (fits within 40px `TOWN_ROADS`).
   - Two-wheelers: saddle pivot centered at `x = 24, y = 16..20` matching avatar crop `(0, 0, 32, 40)`.
   - Cars: cabin windshield with glass depth reflection, solid contact ground shadow at bottom.
   - Distinctive colors, shapes, and silhouettes matching brand identity (e.g. Red Ferrari F40 with rear wing, Yellow Lamborghini Aventador angular wedge, Green/Mint G63 boxy SUV, Red Ducati superbike, Sky Blue Super Cub classic retro scooter).
2. `preview.png`: High-quality preview image (e.g. 144 × 120 px or 96 × 80 px side-profile preview) for showroom and web shop.
3. `icon.png`: 48 × 40 px or 32 × 32 px inventory item icon with transparent background.
4. `meta.json`: JSON metadata with model name, brand, category, dimensions, anchor points, lights coordinates, colors.

## Storage and Mirroring
- Write all files to `assets/vehicles/<category>/<model>/`.
- Mirror all identical files to `apps/web/public/vehicles/<category>/<model>/` (create directories if needed) so Vite can serve them directly via `/vehicles/<category>/<model>/spritesheet.png`.

## Verification
- Write an automated script (e.g. `scripts/verify-vehicle-assets.mjs` or similar) to check:
  - All 16 folders exist in both locations.
  - All 16 * 4 = 64 files exist.
  - Every `spritesheet.png` is a valid PNG with dimensions exactly 192 × 160.
  - Every `preview.png` and `icon.png` is a valid PNG.
  - Every `meta.json` is valid parseable JSON.
- Execute this verification script and report the output.
- Document full evidence in `handoff.md` and send a message back to the orchestrator.
