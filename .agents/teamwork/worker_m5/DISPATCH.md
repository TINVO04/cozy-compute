## 2026-10-08T13:00:44Z
You are worker_m5, assigned to Milestone 5: Showroom & Shop UI Integration & Item Definitions.
Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\worker_m5

## Mandatory First Step
Read the authoritative user request at:
`C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically under header `## 2026-10-08T12:29:53Z`).

Also read:
- `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\PROJECT.md`
- `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_3\handoff.md`
- `packages/game-data/src/vehicles.ts`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusively Owned Files
- `apps/web/src/game/showroom-art.ts`
- `apps/web/src/game/showroom.test.ts`
- `apps/web/src/screens/panels/VehicleShopPanel.tsx`
- `apps/web/src/art/items.ts`
- `packages/game-data/src/items.ts`
- Your working directory `.agents/teamwork/worker_m5/*`
DO NOT edit files outside this set.

## Objective & Requirements
1. Showroom Pedestal Integration (`apps/web/src/game/showroom-art.ts` & `showroom.test.ts`):
   - Confirm pedestals are `136 × 66 px`.
   - Ensure display vehicles on pedestals are rendered at scale 2x with pixel-perfect nearest filtering.
   - Ensure `apps/web/src/game/showroom.test.ts` passes 100%.
2. Vehicle Shop Panel (`apps/web/src/screens/panels/VehicleShopPanel.tsx`):
   - Render preview at `144 × 120 px` (exactly 3x integer scale of the 48 × 40 px frame).
   - Ensure 4-directional rotation button ("Xoay xe") cycles through directions `[0, 1, 2, 3]` smoothly.
   - Ensure the catalog displays all 16 vehicle models cleanly.
3. Item Definitions & Icons (`packages/game-data/src/items.ts` & `apps/web/src/art/items.ts`):
   - Ensure `ITEM_SEEDS` includes all 16 canonical vehicles with unique IDs, names, prices, and sprites.
   - In `apps/web/src/art/items.ts`, ensure `type === 'vehicle'` resolves to the vehicle's icon (or `vehicleCanvas()` fallback).
4. Verification:
   - `pnpm --filter @cozy/game-data test`
   - `pnpm --filter @cozy/web test`
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm tsx tests/e2e/vehicles/runner.ts`
5. Document results in `handoff.md` and send completion message.
