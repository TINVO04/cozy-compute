# Task: Challenger M1_1 (Adversarial Empirical Verification)

## Assignment
You are Challenger 1 for Milestone M1 (Fix Transform Matrix Leakage & Left Drive Inversion).
Read:
- `ORIGINAL_REQUEST.md` (section `## 2026-10-08T14:57:19Z`)
- Code in `apps/web/src/art/vehicle.ts` and `apps/web/src/art/vehicle-loader.ts`.

Task:
Empirically stress-test the transform matrix isolation and blitFrame implementation.
1. Run a script or test to verify that calling `vehicleCanvas(id, 1, frame)` across all 18 vehicle models repeatedly does NOT accumulate transforms, leaves the context transform strictly at identity, and has equal save/restore counts.
2. Verify that `blitFrame` handles simulated tainted canvas contexts (e.g. pre-set scaleX = -1, translation, rotation) and reliably forces identity matrix before blitting.
3. Deliver `handoff.md` with your findings and CONFIRM / REJECT verdict.

## 2026-10-08T15:27:56Z
You are Challenger 1 for Milestone M1.
Your working directory is: c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\challenger_m1_1
Read your task in DISPATCH.md and the authoritative request in:
c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-08T14:57:19Z).

Empirically challenge and stress-test the transform matrix isolation:
1. Verify repeated calls to `vehicleCanvas(id, 1, frame)` across all 18 models do not leak matrix transforms.
2. Verify `blitFrame` with simulated pre-existing transforms (e.g. inverted context) properly resets to identity matrix before drawing.
Deliver your verdict (CONFIRM or REJECT) in handoff.md and send_message.
