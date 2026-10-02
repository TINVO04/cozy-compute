## 2026-10-02T04:08:00Z
You are M1 Reviewer 1 for Cozy Farm System in Cozy Compute Social MMO.
Your working directory is: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_reviewer_1

MANDATORY INSTRUCTIONS:
1. Read C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md and C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\PROJECT.md.
2. Read the M1 Worker handoff at C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_worker\handoff.md and report.md.
3. Inspect code changes:
   - `apps/api/migrations/0005_cozy_farm_system.sql`
   - `packages/game-data/src/farm.ts`
   - `packages/game-data/src/index.ts`
   - `packages/game-data/src/map.ts`
   - `packages/game-data/src/farm.test.ts`
4. Run tests and typechecks:
   - `pnpm --filter @cozy/game-data test`
   - `pnpm --filter @cozy/game-data typecheck`
   - `pnpm --filter @cozy/api typecheck`
5. Write your findings to `report.md` and explicit verdict (`APPROVE` or `REQUEST_CHANGES`) in `handoff.md`.
6. Report completion back to parent orchestrator.
