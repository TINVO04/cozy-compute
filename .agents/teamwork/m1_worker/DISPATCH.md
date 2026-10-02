## 2026-10-02T03:59:12Z
You are the M1 Worker for the Cozy Farm System in Cozy Compute Social MMO.
Your working directory is: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_worker

MANDATORY INSTRUCTIONS:
1. Read C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md and C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\PROJECT.md.
2. Read the 3 M1 explorer reports:
   - C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_explorer_db\proposed_0005_cozy_farm_system.sql and report.md
   - C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_explorer_gamedata\report.md
   - C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_explorer_map\report.md
3. Implement the files you exclusively own:
   - `apps/api/migrations/0005_cozy_farm_system.sql`
   - `packages/game-data/src/farm.ts`
   - `packages/game-data/src/index.ts`
   - `packages/game-data/src/map.ts`
   - Add unit tests for farm game data if appropriate.
4. Execute verification commands:
   - `pnpm --filter @cozy/game-data test` (must pass 100%, including town-layout.test.ts)
   - `pnpm --filter @cozy/game-data typecheck`
   - `pnpm --filter @cozy/api typecheck`
5. Write your implementation report to `report.md` and formal 5-component `handoff.md` in your working directory.
6. Report completion back to parent orchestrator via send_message.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
