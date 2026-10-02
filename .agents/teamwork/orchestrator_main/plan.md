# Project Plan — Cozy Farm System

## 1. Objectives & Quality Standards
- Deliver a complete, server-authoritative Cozy Farm System for Cozy Compute Social MMO.
- Zero-Dead-Ends: fully functional UI, modals, crops, animals, pond, warehouse, store.
- Pure Canvas 2D Southern Vietnamese countryside aesthetic.
- Accessibility standards (WASD/Arrows, E, Esc).
- Pass all quality gates (`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`).

## 2. Execution Phases
### Phase 0: Scope Survey
- Spawn 3 parallel exploratory agents:
  1. `teamwork_preview_spec_miner` (or explorer) on `docs/farm_system_plan.pdf` and technical specifications.
  2. `teamwork_preview_explorer` on backend (API routes, PostgreSQL schema, migrations, Colyseus room architecture, session auth).
  3. `teamwork_preview_explorer` on frontend (Phaser town scene, scene switching, pure canvas rendering patterns, HUD components, modals).

### Phase 1: Synthesis & PROJECT.md
- Merge feature inventories, constraints, architecture, interfaces, and code layouts.
- Define precise milestone boundaries and interface contracts.
- Ensure every inventoried feature is assigned to a milestone.

### Phase 2: Dual Track Execution
- Track A: Implementation Track decomposed into milestones delegated to sub-orchestrators.
- Track B: E2E Testing Track (opaque-box, requirement-driven, Tiers 1-4) producing `TEST_INFRA.md` and `TEST_READY.md`.

### Phase 3: Integration & Final Milestone
- Sub-orchestrators pass milestone gates (Explorer -> Worker -> Reviewers -> Challengers -> Auditor).
- Implementation Track resolves 100% of E2E tests in sequential tiers.
- Adversarial hardening (Tier 5).

### Phase 4: Quality Gate & Human Reporting
- Full repo verification (`format:check`, `lint`, `typecheck`, `test`).
- Victory report with complete change log and test results.
