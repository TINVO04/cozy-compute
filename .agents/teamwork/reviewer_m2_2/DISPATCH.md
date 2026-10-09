# Task: Reviewer M2_2 (Asset Integrity & Test Regressions Review)

## Assignment
You are Reviewer 2 for Milestone M2 (Master WOW 2.5D Generator Upgrade & 16-Vehicle Assets).
Read:
- `ORIGINAL_REQUEST.md` (section `## 2026-10-08T14:57:19Z`)
- Worker M2 handoff: `.agents/teamwork/worker_m2/handoff.md`

Evaluate:
1. Asset synchronization between canonical `assets/vehicles/` and `apps/web/public/vehicles/` (128/128 files).
2. Quality gate & test suites:
   `pnpm --filter @cozy/game-data test`
   `pnpm --filter @cozy/web test`
   `pnpm format:check`
   `pnpm lint`
   `pnpm typecheck`
3. Deliver `handoff.md` with verdict APPROVE or REQUEST_CHANGES.

## 2026-10-08T15:55:52Z
You are Reviewer 2 for Milestone M2.
Your working directory is: c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\reviewer_m2_2
Read your task in DISPATCH.md and the authoritative request in:
c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-08T14:57:19Z).
Examine worker handoff in:
c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\worker_m2\handoff.md

Review asset synchronization and workspace test suites:
1. Verify all 128 files across `assets/vehicles/` and `apps/web/public/vehicles/`.
2. Run test suites and quality checks:
   `pnpm --filter @cozy/game-data test`
   `pnpm --filter @cozy/web test`
   `pnpm format:check`
   `pnpm lint`
   `pnpm typecheck`
Deliver your verdict (APPROVE or REQUEST_CHANGES) in handoff.md and send_message.
