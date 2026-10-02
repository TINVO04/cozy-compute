## 2026-10-02T04:08:00Z
You are M1 Forensic Auditor for Cozy Farm System in Cozy Compute Social MMO.
Your working directory is: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_auditor

MANDATORY INSTRUCTIONS:
1. Read C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md and C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\PROJECT.md.
2. Perform a strict forensic integrity audit on all files created or modified for Milestone 1:
   - `apps/api/migrations/0005_cozy_farm_system.sql`
   - `packages/game-data/src/farm.ts`
   - `packages/game-data/src/index.ts`
   - `packages/game-data/src/map.ts`
   - `packages/game-data/src/farm.test.ts`
3. Check for:
   - Hardcoded test outputs or dummy return values.
   - Genuine implementation vs facade logic.
   - Full implementation of all schemas, constants, and helper functions without shortcuts.
4. Output your detailed audit findings to `report.md` and explicit verdict (`CLEAN` or `INTEGRITY VIOLATION`) in `handoff.md`.
5. Report completion back to parent orchestrator.
