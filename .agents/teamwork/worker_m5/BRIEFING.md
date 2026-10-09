# BRIEFING — 2026-10-08T13:12:45Z

## Mission
Milestone 5: Showroom & Shop UI Integration & Item Definitions (Showroom pedestals 136x66, VehicleShopPanel 3x preview & 4-dir rotation, 16 canonical vehicle items & art resolution)

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\worker_m5
- Original parent: cd331520-04d7-4f2f-a8b7-81e43bf66f35
- Milestone: Milestone 5 (Showroom & Shop UI Integration & Item Definitions)

## 🔒 Key Constraints
- Exclusively Owned Files:
  - `apps/web/src/game/showroom-art.ts`
  - `apps/web/src/game/showroom.test.ts`
  - `apps/web/src/screens/panels/VehicleShopPanel.tsx`
  - `apps/web/src/art/items.ts`
  - `packages/game-data/src/items.ts`
  - `.agents/teamwork/worker_m5/*`
- DO NOT edit files outside this set.
- DO NOT CHEAT. All implementations must be genuine.
- Quality Gate: pnpm --filter @cozy/game-data test, pnpm --filter @cozy/web test, pnpm typecheck, pnpm lint, pnpm tsx tests/e2e/vehicles/runner.ts

## Current Parent
- Conversation ID: cd331520-04d7-4f2f-a8b7-81e43bf66f35
- Updated: not yet

## Task Summary
- **What to build**: Showroom pedestal integration (136x66, scale 2x nearest), VehicleShopPanel (144x120 preview 3x, 4-directional rotation [0,1,2,3], 16 vehicle catalog), Item Definitions (16 canonical vehicles in ITEM_SEEDS), Vehicle art resolution in art/items.ts.
- **Success criteria**: All showroom tests pass, web & game-data tests pass, typecheck & lint pass, e2e vehicle runner passes.
- **Interface contracts**: PROJECT.md, packages/game-data/src/vehicles.ts
- **Code layout**: packages/game-data/src, apps/web/src

## Key Decisions Made
- Exported SHOWROOM_PEDESTAL_WIDTH (136), SHOWROOM_PEDESTAL_HEIGHT (66), and SHOWROOM_VEHICLE_SCALE (2) from apps/web/src/game/showroom-art.ts.
- Configured nearest-neighbor pixel-perfect filtering (`.setFilter(0)`) on both the interior canvas texture and the 4 featured display vehicles.
- Enhanced VehicleShopPanel: 144x120 px preview container, cyclic direction transition `setDir((d) => (d + 1) % 4)`, updated fallback count to 16 models, and added full BRAND_COLORS luxury styling for all 16 vehicle brands.
- Exported `vehicleIcon()` in apps/web/src/art/items.ts resolving to `/vehicles/${assetPath}/icon.png` with graceful `vehicleCanvas()` fallback, integrated directly into `itemIcon(sprite, 'vehicle')`.
- Cleaned section comments in packages/game-data/src/items.ts confirming all 16 canonical vehicles are in `ITEM_SEEDS` with unique IDs, names, prices, and sprites.

## Artifact Index
- DISPATCH.md — assignment details
- BRIEFING.md — situational awareness
- progress.md — liveness heartbeat
- handoff.md — final handoff report

## Change Tracker
- **Files modified**:
  - `apps/web/src/game/showroom-art.ts`: Exported pedestal dimensions & scale constants, applied nearest filtering to texture and vehicle sprites.
  - `apps/web/src/game/showroom.test.ts`: Added unit tests for pedestal dimensions 136x66 and 4 featured vehicles scale 2x nearest filter.
  - `apps/web/src/screens/panels/VehicleShopPanel.tsx`: 144x120 3x preview, 4-way rotation [0,1,2,3], 16 models catalog, BRAND_COLORS styling.
  - `apps/web/src/art/items.ts`: Added vehicleIcon and updated itemIcon for vehicle type with assetPath / vehicleCanvas fallback.
  - `packages/game-data/src/items.ts`: Verified 16 canonical vehicle items in ITEM_SEEDS with unique attributes.
- **Build status**: All tests and typecheck pass (PASS)
- **Pending issues**: None

## Quality Status
- **Build/test result**:
  - `pnpm --filter @cozy/game-data test`: 19 files passed (147 tests)
  - `pnpm --filter @cozy/web test`: 10 files passed (37 tests)
  - `pnpm tsx tests/e2e/vehicles/runner.ts`: 92 tests passed (0 failed)
  - `pnpm typecheck`: 0 errors
- **Lint status**: 0 violations across exclusively owned files; formatted with Prettier
- **Tests added/modified**: `apps/web/src/game/showroom.test.ts` expanded with pedestal dimensions and 2x nearest filter vehicle population tests.

## Loaded Skills
- None explicitly requested via skill path in dispatch prompt
