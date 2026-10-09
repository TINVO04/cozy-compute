## 2026-10-08T12:59:56Z
You are worker_m4, assigned to Milestone 4: Mounting Geometry, Visual Handling & Lighting Alignment.
Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\worker_m4

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
- `apps/web/src/game/players.ts`
- `apps/web/src/game/vehicle-lights.ts`
- Your working directory `.agents/teamwork/worker_m4/*`
DO NOT edit files outside this set.

## Objective & Requirements
1. Mounting & Visual Geometry in `apps/web/src/game/players.ts`:
   - 2-wheel mounting: Seat center `x = 24, y = 16..20`, avatar crop `(0, 0, 32, 40)` and `baseSpriteY - 4` ensures waist aligns seamlessly with seat, footpeg/pedal alignment without clipping or floating.
   - 4-wheel mounting: avatar concealed cleanly (`setVisible(!driving)`), vehicle sprite at `(0, -14)` above contact shadow at `(0, 0)`.
   - Wheel ground contact at `y = 37` in vehicle frame corresponds to ground baseline `y = +3` above shadow.
   - 4-Frame Drive Animation: currently `frame = riding && this.moving ? Math.floor(time / 160) % 2 : 0;` (only 2 frames for 2-wheelers, 0 frames for cars).
     Update driving animation so that when `this.moving && !useUi.getState().reducedMotion`:
     - Cycle through frames 1..3 (`1 + (Math.floor(time / 140) % 3)`) during movement for ALL vehicle types (both 2-wheelers and 4-wheelers!).
     - When stationary (`!this.moving`), frame = 0 (idle).
2. Vehicle Lighting & Raytracing in `apps/web/src/game/vehicle-lights.ts`:
   - Verify and ensure headlight emitter vectors: `frontX = x + dx * 20`, `frontY = y - 10 + dy * 18`.
   - Taillight coordinates: `rearX = x - dx * 18`, `rearY = y - 10 - dy * 18`.
   - Dual beams for cars (`[-8, 8]` lateral offset), single beam for bicycle/motorcycle (`offset = 0`), beam scale `0.65` for bicycle.
   - Additive blending (`ADD`, depth 2601/2602) matching `calculateBienHoaLighting`.
3. Verify:
   - `pnpm --filter @cozy/web test`
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm tsx tests/e2e/vehicles/runner.ts`
4. Document results in `handoff.md` and send completion message.
