# Task: Worker M1 - Fix Transform Matrix Leakage & Left Drive Inversion

## Objective
Implement Requirement R1 per `ORIGINAL_REQUEST.md` (section `## 2026-10-08T14:57:19Z`) and findings from Explorer 1 (`.agents/teamwork/explorer_survey_r1/analysis.md`):

1. In `apps/web/src/art/vehicle.ts`:
   - Isolate transform matrix with `ctx.save()` before and `ctx.restore()` after `dir === 1` blocks:
     * 2-wheeler branch (around lines 47-51)
     * 4-wheeler branch (around lines 278-282)
   - Ensure the canvas returned never leaks `scaleX = -1` or any translation to subsequent draw operations.

2. In `apps/web/src/art/vehicle-loader.ts`:
   - In `blitFrame()` (lines 230-244), explicitly call:
     ```ts
     ctx.setTransform(1, 0, 0, 1, 0, 0);
     ctx.resetTransform?.();
     ```
     before `ctx.clearRect` and `ctx.drawImage`.

3. Tests & Hardening:
   - Update / add test assertions in `apps/web/src/art/vehicle-loader.challenge.test.ts` verifying that `blitFrame` resets transforms prior to drawing.
   - Update / add test assertions in `apps/web/src/game/vehicles.challenge.test.ts` verifying that `vehicleCanvas` for `dir === 1` isolates transforms and left-facing vehicles render facing left without double inversion.
   - Run tests:
     `pnpm --filter @cozy/web test run src/art/vehicle-loader.challenge.test.ts src/game/vehicles.challenge.test.ts`
   - Run typecheck & lint:
     `pnpm --filter @cozy/web typecheck`
     `pnpm --filter @cozy/web lint`

4. MANDATORY INTEGRITY WARNING:
   DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

5. Report all changes, commands run, test outputs, and write `handoff.md` in your working directory.


## 2026-10-08T15:14:36Z
You are Worker M1 Left Inversion.
Your working directory is: c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\worker_m1
Read your task assignment in your working directory DISPATCH.md and the authoritative request in:
c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-08T14:57:19Z).
Also consult the explorer analysis in:
c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\explorer_survey_r1\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your assignments:
1. In `apps/web/src/art/vehicle.ts`:
   - Isolate matrix transform when `dir === 1` using `ctx.save()` before and `ctx.restore()` after in both 2-wheeler and 4-wheeler rendering blocks.
2. In `apps/web/src/art/vehicle-loader.ts`:
   - In `blitFrame()`, explicitly call `ctx.setTransform(1, 0, 0, 1, 0, 0)` and `ctx.resetTransform?.()` before `ctx.clearRect` and `ctx.drawImage`.
3. Harden test suites:
   - `apps/web/src/art/vehicle-loader.challenge.test.ts`
   - `apps/web/src/game/vehicles.challenge.test.ts`
   Ensure they test `dir = 1` transform isolation, `blitFrame` transform reset, and drive orientation.
4. Run verification commands:
   `pnpm --filter @cozy/web test run src/art/vehicle-loader.challenge.test.ts src/game/vehicles.challenge.test.ts`
   `pnpm --filter @cozy/web typecheck`
   `pnpm --filter @cozy/web lint`
5. Write your detailed handoff report in `handoff.md` and use send_message to report completion.
