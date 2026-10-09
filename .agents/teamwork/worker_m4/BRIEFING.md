# BRIEFING — 2026-10-08T13:10:15Z

## Mission
Implement Milestone 4: Mounting Geometry, Visual Handling & Lighting Alignment in `apps/web/src/game/players.ts` and `apps/web/src/game/vehicle-lights.ts`.

## 🔒 My Identity
- Archetype: worker_m4
- Roles: implementer, qa, specialist
- Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\worker_m4
- Original parent: cd331520-04d7-4f2f-a8b7-81e43bf66f35
- Milestone: Milestone 4: Mounting Geometry, Visual Handling & Lighting Alignment

## 🔒 Key Constraints
- Exclusively owned files:
  - `apps/web/src/game/players.ts`
  - `apps/web/src/game/vehicle-lights.ts`
  - `.agents/teamwork/worker_m4/*`
- DO NOT edit files outside this set.
- DO NOT CHEAT. All implementations must be genuine.
- Server-authoritative game state, zero-dead-ends, accessibility.
- Pass `pnpm --filter @cozy/web test`, `pnpm typecheck`, `pnpm lint`, and `pnpm tsx tests/e2e/vehicles/runner.ts`.

## Current Parent
- Conversation ID: cd331520-04d7-4f2f-a8b7-81e43bf66f35
- Updated: 2026-10-08T12:59:56Z

## Task Summary
- **What to build**:
  - Mounting & Visual Geometry in `apps/web/src/game/players.ts`:
    - 2-wheel mounting: Seat center `x = 24, y = 16..20`, avatar crop `(0, 0, 32, 40)` and `baseSpriteY - 4` ensures waist aligns seamlessly with seat, footpeg/pedal alignment without clipping or floating.
    - 4-wheel mounting: avatar concealed cleanly (`setVisible(!driving)`), vehicle sprite at `(0, -14)` above contact shadow at `(0, 0)`.
    - Wheel ground contact at `y = 37` in vehicle frame corresponds to ground baseline `y = +3` above shadow.
    - 4-Frame Drive Animation: Cycle through frames 1..3 (`1 + (Math.floor(time / 140) % 3)`) when `this.moving && !useUi.getState().reducedMotion` for ALL vehicle types (both 2-wheelers and 4-wheelers); frame = 0 (idle) when stationary.
  - Vehicle Lighting & Raytracing in `apps/web/src/game/vehicle-lights.ts`:
    - Emitter vectors: `frontX = x + dx * 20`, `frontY = y - 10 + dy * 18`.
    - Taillight coordinates: `rearX = x - dx * 18`, `rearY = y - 10 - dy * 18`.
    - Dual beams for cars (`[-8, 8]` lateral offset), single beam for bicycle/motorcycle (`offset = 0`), beam scale `0.65` for bicycle.
    - Additive blending (`ADD`, depth 2601/2602) matching `calculateBienHoaLighting`.
- **Success criteria**: Tests, typecheck, lint, and e2e runner pass.

## Key Decisions Made
- Driving animation formula: `this.moving && !useUi.getState().reducedMotion ? 1 + (Math.floor(time / 140) % 3) : 0` to support 4-frame asset sheets across all vehicles (cars, motorcycles, bicycles).
- Integrated `mounting` metadata (`cropAvatar`, `avatarOffsetY`) from `vehicleById()` with standard fallbacks `{ x: 0, y: 0, width: 32, height: 40 }` and `-4`.
- Explicitly extracted `rearX` and `rearY` in `VehicleLights`, supporting `vehicle.lighting` schema offsets with standard `20, 18, 18, 18` fallbacks.
- Disabled `spawnFootstepDust` while driving to avoid walking dust during driving motion.

## Artifact Index
- DISPATCH.md — Task assignment from parent
- progress.md — Liveness heartbeat and milestone tracker
- BRIEFING.md — Working memory and status
- handoff.md — 5-Component handoff report

## Change Tracker
- **Files modified**:
  - `apps/web/src/game/players.ts`: Updated drive animation loop to 1..3 and mounting crop/offset.
  - `apps/web/src/game/vehicle-lights.ts`: Explicit headlight/taillight vector bindings and metadata schema integration.
- **Build status**: PASS (`pnpm --filter @cozy/web test`: 37/37, `tests/e2e/vehicles/runner.ts`: 92/92, `pnpm lint`: 0 errors).
- **Pending issues**: None in owned scope.

## Quality Status
- **Build/test result**: All relevant tests passing.
- **Lint status**: 0 errors.
- **Tests added/modified**: Verified against comprehensive e2e vehicle test suite (Tiers 1-4).

## Loaded Skills
- **Source**: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\skills\game-crafting\SKILL.md
- **Core methodology**: Multiplayer game design, visual fidelity, zero-artifacts, server authority, Phaser 3 rendering.
