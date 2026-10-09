# BRIEFING — 2026-10-08T12:41:00Z

## Mission
Survey and analyze vehicle mounting geometry, lighting/raytracing, showroom/shop UI integration, and existing test/verification scripts.

## 🔒 My Identity
- Archetype: explorer
- Roles: explorer, survey, synthesis
- Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_3
- Original parent: cd331520-04d7-4f2f-a8b7-81e43bf66f35
- Milestone: vehicle asset pack and integration survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Working directory confined to C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_3
- Focus: mounting geometry, vehicle lighting, UI integration, verification scripts

## Current Parent
- Conversation ID: cd331520-04d7-4f2f-a8b7-81e43bf66f35
- Updated: 2026-10-08T12:41:00Z

## Investigation State
- **Explored paths**:
  - `apps/web/src/game/players.ts` (Avatar class, vehicle mounting, cropping, layer depth)
  - `apps/web/src/game/vehicle-lights.ts` (VehicleLights class, beam & bulb calculations)
  - `apps/web/src/screens/panels/VehicleControls.tsx` (V key listener, HUD mount controls)
  - `apps/web/src/screens/panels/VehicleShopPanel.tsx` (Shop preview 3x, 4-directional rotation)
  - `apps/web/src/game/showroom-art.ts` & `showroom-scene.ts` (136x66 plinth, 2x scale display)
  - `apps/web/src/game/showroom.test.ts` (Showroom interior test suite)
  - `apps/web/src/art/vehicle.ts` (Procedural canvas, texture registration)
  - `apps/web/src/art/items.ts` (Item icon resolution for vehicles)
  - `packages/game-data/src/vehicles.ts` & `vehicles.test.ts` (TOWN_ROADS, speed, signal enforcement)
  - `packages/game-data/src/items.ts` (ITEM_SEEDS vehicle definitions)
  - `apps/realtime/src/rooms/town.ts` & `vehicles.test.ts` (vehicle:toggle, off_road penalty)
  - `apps/web/e2e/showroom.spec.ts`, `output/vehicle-preview.mjs`, `output/vehicle-ui-check.mjs`, `output/showroom-ui-check.mjs`
- **Key findings**:
  - All mathematical and geometric coordinates for 2-wheel mounting (seat center x=24, y=16..20, crop 0,0,32,40, avatar drop -4px) and 4-wheel mounting (avatar hidden, contact shadow, y=37 ground line) verified in code.
  - Lighting vector formula `dx * 20, dy * 18` for headlights and `-dx * 18, -dy * 18` for taillights perfectly matches frame aspect ratio (48x40).
  - Showroom pedestal is precisely `136 × 66 px`, scaling displayed vehicle by 2x.
  - Shop preview is `144 × 120 px`, exactly 3x scale with full 4-direction cycling.
  - Full test automation pipeline exists with Vitest unit tests and Playwright browser verification scripts.
- **Unexplored areas**:
  - None within the assigned survey scope.

## Key Decisions Made
- Confirmed full alignment between design specifications and existing codebase implementation hooks.
- Documented key implementation gaps for the coding agents: currently only 8 vehicles are defined in `packages/game-data/src/vehicles.ts` (needs expansion to 16), driving frames in `players.ts` currently only cycle 2 frames for 2-wheelers and 0 for cars (needs 4-frame drive animation support), and dynamic asset loader module needs to bridge `assets/vehicles` to `ensureVehicleTexture`.

## Artifact Index
- `DISPATCH.md` — incoming prompt message log
- `BRIEFING.md` — persistent memory
- `progress.md` — heartbeat and progress tracker
- `analysis.md` — in-depth technical analysis
- `handoff.md` — self-contained handoff report
