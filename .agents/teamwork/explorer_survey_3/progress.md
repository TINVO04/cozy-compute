# Progress Tracker — Explorer Survey 3

Last visited: 2026-10-08T12:39:50Z

- [x] Read ORIGINAL_REQUEST.md
- [x] Setup BRIEFING.md, DISPATCH.md, progress.md
- [x] Task 1: Investigate mounting geometry & visual handling in `apps/web/src/game/`
  - [x] 'V' key handling & `vehicle:toggle` message flow analyzed
  - [x] 2-wheel mounting (seat center x=24, y=16..20, crop 0,0,32,40, pedal/footpeg alignment) verified
  - [x] 4-wheel mounting (avatar hiding, container hierarchy, glass reflection, contact shadows) verified
  - [x] Wheel contact point y=37, vehicle body width <= 40px, and `TOWN_ROADS` off_road penalty logic verified
- [x] Task 2: Investigate vehicle lighting & raytracing
  - [x] `VehicleLights` implementation analyzed
  - [x] Headlight & taillight coordinates (`dx * 20, dy * 18` / `-dx * 18, -dy * 18`) verified
  - [x] Night mode rendering via `calculateBienHoaLighting` & additive blend simulated raytracing verified
- [x] Task 3: Investigate Showroom & Shop UI integration
  - [x] Showroom pedestal (`136 × 66 px`, scale 2x) in `apps/web/src/game/showroom-art.ts` & `showroom.test.ts` inspected
  - [x] `VehicleShopPanel` (scale 3x with 4-directional rotation) inspected
  - [x] Item definition inventory icons in `items.ts` and `art/items.ts` inspected
- [x] Task 4: Inspect existing verification resources
  - [x] `output/vehicle-preview.mjs` analyzed
  - [x] `output/vehicle-ui-check.mjs` analyzed
  - [x] `output/showroom-ui-check.mjs` analyzed
  - [x] Playwright test setup in `apps/web/e2e/showroom.spec.ts` inspected
  - [x] Test suites in `packages/game-data`, `apps/web`, `apps/realtime`, and `apps/api` tested and verified
- [ ] Synthesize findings into `analysis.md` and `handoff.md`
- [ ] Send message to orchestrator
