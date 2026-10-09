# BRIEFING — 2026-10-08T15:53:00Z

## Mission
Master Vehicle Art Direction: Upgrade `scripts/generate_vehicles.py` with 8 WOW 2.5D Pixel Art quality layers, active 4-frame animation in all directions, strict geometric invariant compliance, and 16 vehicle asset pack regeneration.

## 🔒 My Identity
- Archetype: worker_m2
- Roles: implementer, qa, specialist
- Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\worker_m2
- Original parent: cd331520-04d7-4f2f-a8b7-81e43bf66f35
- Milestone: Milestone 2: Dynamic Asset Loader & Texture Fallback
- Round 2 Assignment: Worker M2 WOW 2.5D Generator
- Current Parent: 593b4217-f7c5-4fd0-87d3-8ef1b166fb4a

## 🔒 Key Constraints
- Exclusively owned files: apps/web/src/art/vehicle-loader.ts, apps/web/src/art/vehicle.ts, .agents/teamwork/worker_m2/*
- Do not edit files outside this set (Round 1)
- Round 2 scope: scripts/generate_vehicles.py, assets/vehicles/*, apps/web/public/vehicles/*, .agents/teamwork/worker_m2/*
- Genuine implementation only, no mock/dummy facades
- Zero dead ends, full backwards compatibility for vehicleCanvas and ensureVehicleTexture
- Spritesheet 192x160 px (4 cols x 4 rows of 48x40 px)
- Maximum body width <= 40 px in all frames
- Wheel contact baseline strictly at y = 37 px in rows 1 and 2
- Two-wheeler saddle center strictly at x = 24, y in 16..20

## Current Parent
- Conversation ID: 593b4217-f7c5-4fd0-87d3-8ef1b166fb4a
- Updated: 2026-10-08T15:53:00Z

## Task Summary
- **What to build**: Comprehensive upgrade of `scripts/generate_vehicles.py` implementing 8 WOW 2.5D layers: 4 color depth tiers, 2.5D reflective glass with animated streak & roof overhang shadow, 3D rubber tires with 8 distinct rim types & Brembo calipers, 16 model-specific sculpted silhouettes & signature passes, active 4-frame animation in Down & Up (tread roll, suspension bounce, light glimmer), and enriched horizontal animations (rotating spokes, calipers, suspension bob).
- **Success criteria**:
  - `python scripts/generate_vehicles.py` generates all 16 vehicle packs (128 files across assets/vehicles and apps/web/public/vehicles).
  - `python scripts/audit_vehicle_geometry.py` passes 100% for all 16 models.
  - `node scripts/verify-vehicle-assets.mjs` verifies 128/128 files with 0 errors.
  - Active animation diff > 0 bytes in Down and Up views across all 16 models.
  - Tests pass: `pnpm --filter @cozy/web test` and `pnpm --filter @cozy/game-data test`.
  - Quality Gate clean: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`.

## Key Decisions Made
- Designed and integrated `get_4tone_palette()` computing deep underbody shadow, base midtone, reflection contour, and specular catchlights for all 16 models.
- Built `draw_glass_25d()` with cabin occlusion shadow, cyan sky reflection, and sliding 45° specular streaks animated across drive frames.
- Built `draw_wheel_3d()` with 8 distinct animated rim types (`star_5`, `star_dual`, `center_lock`, `turbine`, `pantheon`, `lakester`, `wire`, `alloy_jdm`) with Brembo calipers and contact rubber firmly locked at y=37.
- Implemented vertical animation (Down & Up) with rolling tire tread grooves (`(y ± frame_idx) % 3`), body suspension compression, and headlight/taillight luminous pulses.
- Implemented horizontal suspension bounce (`dy = 1` on drive 1, `dy = -1` on drive 3, `dy = 0` on idle/drive 2) while maintaining wheel contact at y=37 and 2-wheeler saddle at y in 16..20.
- Synchronized all 16 prices and speeds with `@cozy/game-data`.
- Formatted `meta.json` with trailing newline for 100% Prettier compliance.

## Artifact Index
- `DISPATCH.md` — Assignment instructions
- `BRIEFING.md` — Persistent state
- `progress.md` — Heartbeat
- `handoff.md` — 5-component completion handoff

## Change Tracker
- **Files modified**:
  - `scripts/generate_vehicles.py`: Master upgrade with 8 WOW 2.5D layers and 4-frame animation system
  - `assets/vehicles/*`: Regenerated 16 vehicle packs (64 files)
  - `apps/web/public/vehicles/*`: Mirrored 16 vehicle packs (64 files)
- **Build status**: PASS (Exit code 0 across all verification scripts and test suites)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (Game-data tests: 157/157, Web tests: 111/111)
- **Lint status**: 0 violations (`eslint .` clean)
- **Format status**: Prettier formatted cleanly on all files (`prettier --check .` 100% clean)
- **Typecheck status**: 0 TypeScript errors across 8 workspace projects
- **Geometry Audit**: 16/16 models 100% compliant (`audit_vehicle_geometry.py`)
- **Asset Verification**: 128/128 files verified (`verify-vehicle-assets.mjs`)
- **Animation Diffs**: Active diffs (> 0 bytes) confirmed in all 4 directions for all 16 models
