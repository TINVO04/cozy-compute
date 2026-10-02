# Task Assignment: M1 Challenger 2 — Cozy Farm System

- Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_challenger_2
- Archetype: teamwork_preview_challenger
- Mission: Empirically verify town map topology and collision boundary at the western portal (`farm_gate`).

MANDATORY INSTRUCTIONS:
1. Read `ORIGINAL_REQUEST.md` and `PROJECT.md`.
2. Inspect `packages/game-data/src/map.ts`.
3. Write and execute an empirical test script verifying:
   - Pathfinding from `SPAWN` to `farm_gate` traverses strictly paved paths.
   - No path tile overlaps any element in `BLOCKERS`.
   - The west wall correctly blocks (x=0, y=0..9) and (x=0, y=12..31) while leaving y=10..11 open.
4. Write `report.md` and `handoff.md` with explicit verdict: `APPROVE` or `REJECT`.
5. Report completion back to parent orchestrator.


## 2026-10-02T04:08:00Z
You are M1 Challenger 2 for Cozy Farm System in Cozy Compute Social MMO.
Your working directory is: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_challenger_2

MANDATORY INSTRUCTIONS:
1. Read C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md and C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\PROJECT.md.
2. Empirically verify the map geometry and town portal in `packages/game-data/src/map.ts`:
   - Write an automated script to test pathfinding from `SPAWN` to `farm_gate` along `PATHS`.
   - Verify that no blocker in `BLOCKERS` obstructs the pathway.
   - Verify that the west perimeter correctly blocks outside the gate opening.
3. Write your findings to `report.md` and explicit verdict (`APPROVE` or `REJECT`) in `handoff.md`.
4. Report completion back to parent orchestrator.
