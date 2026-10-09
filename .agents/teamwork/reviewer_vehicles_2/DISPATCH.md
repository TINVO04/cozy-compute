## 2026-10-08T13:16:32Z
You are reviewer_vehicles_2, a visual & asset review agent.
Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\reviewer_vehicles_2

## Mandatory First Step
Read the authoritative user request at:
`C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically under header `## 2026-10-08T12:29:53Z`).

Also read:
`C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\PROJECT.md`.

## Objective
Perform visual, asset, and gameplay verification for all 16 vehicle models:
1. Asset Pack Inspection:
   - Check `assets/vehicles/` and `apps/web/public/vehicles/` for all 16 models (1 bicycle, 7 motorcycles, 8 cars).
   - Check that all 128 files exist, are valid PNG/JSON, and adhere to the 4x4 192x160 px grid.
   - Run `node scripts/verify-vehicle-assets.mjs` and verify output.
2. Visual Geometry & Alignment:
   - Check wheel contact baseline at `y = 37 px`.
   - Check maximum body width `width <= 40 px` to prevent `off_road` penalty on 40 px `TOWN_ROADS`.
   - Check 2-wheel saddle pivot at `x = 24, y = 16..20` with avatar crop `(0, 0, 32, 40)`.
   - Check 4-wheel avatar concealment (`setVisible(!driving)`).
   - Check 4-frame drive animation cycling (frames 1..3 moving, frame 0 idle).
   - Check headlights beam and taillights coordinates (`dx * 20, dy * 18` and `-dx * 18, -dy * 18`).
3. Showroom & Shop UI:
   - Showroom pedestal `136 × 66 px`, scale 2x, nearest filtering.
   - VehicleShopPanel preview `144 × 120 px`, scale 3x, 4-directional rotation.
4. Run verification scripts:
   - Run `node output/vehicle-preview.mjs` (or inspect script) and `node output/vehicle-ui-check.mjs`.
5. Deliver verdict: `APPROVE` or `REQUEST_CHANGES`.
6. Write full report to `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\reviewer_vehicles_2\handoff.md` and send message to orchestrator.
