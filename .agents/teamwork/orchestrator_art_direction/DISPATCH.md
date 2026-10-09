# Dispatch Log

## 2026-10-08T14:59:15Z
From: 2f070252-4e49-476f-aa01-bacf79e90607
Priority: High

You are the Project Orchestrator (teamwork_preview_orchestrator) for the Cozy Compute project.

Your mission is to execute the latest requirements specified in:
`c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md` under section `## 2026-10-08T14:57:19Z` ("Master Vehicle Art Direction & Showroom Upgrade").

Working Directory: `c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\orchestrator_art_direction`
Project Root: `c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute`

Key Deliverables:
1. R1: Fix vehicle moving left inverted (Transform Matrix Leakage) in `apps/web/src/art/vehicle.ts` (isolate matrix with `ctx.save()`/`ctx.restore()` on `dir === 1`) and `apps/web/src/art/vehicle-loader.ts` (`blitFrame` explicit `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()`). Verify vehicle and mounted character face left correctly when pressing A.
2. R2: Upgrade Python master generator `scripts/generate_vehicles.py` according to WOW 2.5D Pixel Art standard (4 color depth layers, 2.5D reflective glass with 45° streak and roof shadow, 3D rubber tires/rims/brakes, signature passes for all 16 vehicles, 4 directions x 4 frames).
3. R3: Upgrade Mint Garage Showroom (Showroom Gara Bạc Hà) across 4 pedestals with Interactive Pedestal Cycling (cycling vehicles via E key or [◀] [▶]), upgrade `VehicleShopPanel.tsx` with category filter tabs and 360 preview, and diversify storefront window cars in `paintVehicleDealer`.
4. R4: Synchronize canvas fallback runtime (`vehicleCanvas`) in `apps/web/src/art/vehicle.ts` and asset pipeline in `assets/vehicles/` and `apps/web/public/vehicles/`.
5. Full verification:
   - Run `python scripts/audit_vehicle_geometry.py` (must pass 100% for all 16 vehicles)
   - Run `node scripts/verify-vehicle-assets.mjs`
   - Run test suites: `packages/game-data/src/vehicles.test.ts`, `apps/web/src/art/vehicle-loader.challenge.test.ts`, `apps/web/src/game/vehicles.challenge.test.ts`, `apps/web/src/game/showroom.test.ts`
   - Quality gate: `pnpm --filter @cozy/game-data test`, `pnpm --filter @cozy/web test`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`
   - Visual verification with Playwright / headless browser screenshots

Maintain your `progress.md` and `BRIEFING.md` in your working directory.
When all tasks and quality gates are completely satisfied, report your victory claim with detailed evidence back to the Sentinel.
