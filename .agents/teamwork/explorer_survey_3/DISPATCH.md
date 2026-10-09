## 2026-10-08T12:32:55Z
You are explorer_survey_3, an exploration agent.
Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_3

## Mandatory First Step
Read the authoritative user request at:
`C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically under header `## 2026-10-08T12:29:53Z`).

## Objective
Investigate mounting geometry, vehicle lighting, UI integration, and verification scripts:
1. Mounting & Visual Geometry:
   - Search how vehicle mounting (`V` key) is handled in `apps/web/src/game/` (e.g. player sprite, vehicle container/depth, avatar hiding for 4-wheel vs avatar riding for 2-wheel).
   - Check 2-wheel mounting: seat center `x = 24, y = 16..20`, leg cropping `(0, 0, 32, 40)`, footpeg/pedal alignment.
   - Check 4-wheel mounting: avatar hiding, cabin glass reflection depth, contact shadows.
   - Check wheel contact point `y = 37`, vehicle body width <= 40px, and town roads `off_road` penalty logic (`TOWN_ROADS`).
2. Vehicle Lighting & Raytracing:
   - Check `VehicleLights` implementation: headlight beam and taillight coordinates (`dx * 20, dy * 18` and `-dx * 18, -dy * 18`), night mode rendering, raytracing/shader alignment.
3. Showroom & Shop UI Integration:
   - Inspect Showroom pedestal (`136 × 66 px`, scale 2x) in `apps/web/src/game/showroom.ts` / `apps/web/src/game/showroom.test.ts`.
   - Inspect `VehicleShopPanel` (scale 3x with 4-directional rotation).
   - Check item definition inventory icons.
4. Existing Verification Resources:
   - Inspect `output/vehicle-preview.mjs`, `output/vehicle-ui-check.mjs`, Playwright test setup, and all vehicle-related tests in `packages/game-data` and `apps/web`.

## Scope Boundaries
- Read-only exploration. DO NOT write or modify any source code or package files.
- You may only write your reports (`analysis.md`, `handoff.md`, `progress.md`) in your working directory `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_3`.

## Output Requirements
Write a comprehensive report to `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_3\analysis.md` and `handoff.md`.
When finished, send a message to the caller (orchestrator) with a summary and reference to your handoff file.
