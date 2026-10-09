# Progress — Milestone 4: Mounting Geometry, Visual Handling & Lighting Alignment

Last visited: 2026-10-08T13:10:00Z

## Status
Completed implementation and full verification.

## Accomplishments
1. Updated `apps/web/src/game/players.ts`:
   - Implemented 4-frame driving animation cycle: `1 + (Math.floor(time / 140) % 3)` during movement for all vehicle types (both 2-wheelers and 4-wheelers), and frame 0 (idle) when stationary or reduced motion.
   - Connected 2-wheel mounting avatar crop (`cropAvatar` defaulting to `(0, 0, 32, 40)`) and avatar Y offset (`avatarOffsetY` defaulting to `-4`) directly with vehicle mounting metadata.
   - Ensured footstep dust is suppressed while driving.
   - Maintained 4-wheeler avatar conceal (`setVisible(!driving)`), vehicle sprite placement at `(0, -14)` above contact shadow at `(0, 0)`.
2. Updated `apps/web/src/game/vehicle-lights.ts`:
   - Explicitly defined headlight emitter vectors `frontX = x + dx * 20`, `frontY = y - 10 + dy * 18` with metadata schema support.
   - Explicitly defined taillight coordinates `rearX = x - dx * 18`, `rearY = y - 10 - dy * 18` with metadata schema support.
   - Preserved dual beam offset `[-8, 8]` for cars, centered `0` for 2-wheelers, 0.65 scale for bicycle, and additive blending at depths 2601/2602.
3. Verified Quality Gates:
   - `pnpm --filter @cozy/web test`: 37/37 tests passed (10 files).
   - `pnpm lint`: 0 errors.
   - `npx prettier --check`: Both owned files formatted perfectly.
   - `pnpm tsx tests/e2e/vehicles/runner.ts`: 92/92 tests passed across Tiers 1-4.
