# Task Assignment: M1 Challenger 1 — Cozy Farm System

- Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_challenger_1
- Archetype: teamwork_preview_challenger
- Mission: Empirically stress-test M1 simulation functions and formulas (`farm.ts`).

MANDATORY INSTRUCTIONS:
1. Read `ORIGINAL_REQUEST.md` and `PROJECT.md`.
2. Write and execute adversarial test scripts to stress-test:
   - `getCropGrowthStage` with negative, future, exact boundary, and extreme past timestamps.
   - `isPlotMoist` with exact 1800s boundaries.
   - `calculatePondFishWeight` with high feeding counts, 0 feeding, long delays.
   - `getPlotUnlockPrice` across 0..35 and out-of-bound indices.
3. Write `report.md` and `handoff.md` with explicit verdict: `APPROVE` or `REJECT`.
4. Report completion back to parent orchestrator.

## 2026-10-02T04:08:00Z
You are M1 Challenger 1 for Cozy Farm System in Cozy Compute Social MMO.
Your working directory is: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_challenger_1

MANDATORY INSTRUCTIONS:
1. Read C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md and C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\PROJECT.md.
2. Empirically challenge the pure simulation logic in `packages/game-data/src/farm.ts`:
   - Write and run empirical stress tests for `getCropGrowthStage`, `isPlotMoist`, `calculatePondFishWeight`, `getPlotUnlockPrice`, `getWarehouseTabForItem`.
   - Test boundary values, negative numbers, extreme future timestamps, and invalid indices.
3. Write your findings to `report.md` and explicit verdict (`APPROVE` or `REJECT`) in `handoff.md`.
4. Report completion back to parent orchestrator.
