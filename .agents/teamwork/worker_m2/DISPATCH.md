# Task: Worker M2 - Master Python Generator Upgrade & 16 Vehicles WOW 2.5D Regeneration

## Objective
Upgrade `scripts/generate_vehicles.py` according to WOW 2.5D Pixel Art standards per `ORIGINAL_REQUEST.md` (section `## 2026-10-08T14:57:19Z`) and the blueprint from Explorer 2 (`.agents/teamwork/explorer_survey_r2/analysis.md`).

Key Deliverables:
1. Unfreeze vertical frames:
   - In `scripts/generate_vehicles.py` vertical branches (Down `dir_idx = 0`, Up `dir_idx = 3`), currently `frame_idx` is ignored resulting in 0 diff bytes. Implement active 4-frame animation: tire tread rolling, suspension idle bounce (±0.5px / 1px body shift while keeping lowest contact pixel within bounds), headlight/taillight specular shimmer.
2. Unfreeze & enrich horizontal frames:
   - Implement active 4-frame animation for Left (`dir_idx = 1`) and Right (`dir_idx = 2`): rotating alloy wheel spokes / brake calipers, crank/pedal rotation for bicycles, suspension bounce.
   - Crucial constraint: lowest tire contact pixel MUST be exactly at `y = 37` in rows 1 and 2 across ALL frames.
3. 8 WOW 2.5D Quality Layers:
   - 4 color depth layers: deep underbody shadow, body mid-tone, reflection contour, sharp specular highlight.
   - 2.5D reflective glass: tinted windshield + 45° diagonal reflection streak + roof overhang shadow.
   - 3D rubber tires, alloy rims, brake discs, red/yellow calipers.
   - Signature passes for all 16 vehicles (Ferrari F40, Lamborghini Aventador, Porsche 911 GT3 RS, Toyota Supra MK4, Mercedes G63 AMG, Rolls-Royce Phantom VIII, Ford Mustang Shelby GT500, Tesla Model S Plaid, Ducati Panigale V4 S, Kawasaki Ninja H2, Yamaha YZF-R1, BMW R1250 GS, Vespa Primavera 150, Honda Super Cub C125, Harley-Davidson Fat Boy, Trek Marlin 7).
4. Run generator & sync assets:
   - `python scripts/generate_vehicles.py`
   - Regenerate all 16 vehicle packs (`spritesheet.png`, `preview.png`, `icon.png`, `meta.json`) into `assets/vehicles/` and copy/sync to `apps/web/public/vehicles/`.
5. Run audits and verifications:
   - `python scripts/audit_vehicle_geometry.py` (MUST pass 100% for all 16 models: 192x160, body width <= 40, contact y=37, saddle x=24 y=16..20).
   - `node scripts/verify-vehicle-assets.mjs` (MUST verify all 128/128 files).
   - Verify non-zero byte diff across frames in all 4 directions:
     `python -c "from PIL import Image; ..."`
6. MANDATORY INTEGRITY WARNING:
   DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

7. Write comprehensive handoff report in `.agents/teamwork/worker_m2/handoff.md`.


## 2026-10-08T15:40:05Z
You are Worker M2 WOW 2.5D Generator.
Your working directory is: c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\worker_m2
Read your task in DISPATCH.md and the authoritative request in:
c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-08T14:57:19Z).
Consult the detailed blueprint and analysis in:
c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_r2\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your assignments:
1. Upgrade `scripts/generate_vehicles.py`:
   - Implement the 8 WOW 2.5D Pixel Art quality layers:
     * Material & 4 color depth layers (deep underbody shadow, body mid-tone, reflection contour, sharp specular highlight).
     * 2.5D reflective glass (dark tinted windshield + 45° diagonal reflection streak + roof overhang shadow).
     * 3D rubber tires, alloy rims, brake discs, red/yellow Brembo calipers.
     * Signature styling passes for all 16 vehicles (Ferrari F40, Lamborghini Aventador, Porsche 911 GT3 RS, Toyota Supra MK4, Mercedes G63 AMG, Rolls-Royce Phantom VIII, Ford Mustang Shelby GT500, Tesla Model S Plaid, Ducati Panigale V4 S, Kawasaki Ninja H2, Yamaha YZF-R1, BMW R1250 GS, Vespa Primavera 150, Honda Super Cub C125, Harley-Davidson Fat Boy, Trek Marlin 7).
   - Unfreeze vertical frames: In Down (dir 0) and Up (dir 3), actively use `frame_idx` for animated tread roll, suspension bounce, and light glimmer.
   - Enrich horizontal frames: In Left (dir 1) and Right (dir 2), animate wheel spin/spokes, brake calipers, and suspension bounce.
   - STRICT GEOMETRIC INVARIANTS:
     * Spritesheet 192x160 px (4 columns x 4 rows of 48x40 px).
     * Maximum body width <= 40 px in all frames.
     * Wheel contact baseline strictly at y = 37 px in rows 1 and 2.
     * Two-wheeler saddle center strictly at x = 24, y in 16..20.
   - Synchronize vehicle speeds and prices in `generate_vehicles.py` metadata with `packages/game-data/src/vehicles.ts`.
2. Execute the generator:
   - Run `python scripts/generate_vehicles.py`.
   - Ensure all 16 vehicle directories in `assets/vehicles/` and `apps/web/public/vehicles/` contain valid `spritesheet.png`, `preview.png`, `icon.png`, and `meta.json`.
3. Run audits & verifications:
   - `python scripts/audit_vehicle_geometry.py` (MUST be 100% compliant for all 16 vehicles).
   - `node scripts/verify-vehicle-assets.mjs` (MUST pass 128/128 files).
   - Verify active animation diffs across frames in vertical and horizontal directions.
   - Run Vitest suites: `pnpm --filter @cozy/web test` and `pnpm --filter @cozy/game-data test`.
4. Deliver your comprehensive handoff report in `handoff.md` and use send_message when complete.
