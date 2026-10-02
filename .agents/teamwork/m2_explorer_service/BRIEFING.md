# BRIEFING — 2026-10-02T04:15:30Z

## Mission
Design backend business logic blueprint for Cozy Farm System in `apps/api/src/services/farm.ts`, adhering to strict server-authoritative rules, transactional integrity with `postLedger`, idempotency replay, and zero-dead-ends.

## 🔒 My Identity
- Archetype: explorer
- Roles: M2 Service Explorer, Backend Architect
- Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m2_explorer_service
- Original parent: d39205dd-01db-4096-9bff-542cd3821c40
- Milestone: M2 Cozy Farm System Service Architecture

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in source code
- Server-authoritative game state (no client-trusted rewards/currency/yields)
- Use `postLedger` for all economy movements with idempotency keys
- Row-level locking `FOR UPDATE` on concurrency critical resources
- Warehouse capacity checks before adding items

## Current Parent
- Conversation ID: d39205dd-01db-4096-9bff-542cd3821c40
- Updated: 2026-10-02T04:15:30Z

## Investigation State
- **Explored paths**: None yet
- **Key findings**: Initial dispatch received
- **Unexplored areas**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `packages/game-data/src/farm.ts`, `apps/api/src/db.ts`, `apps/api/src/ledger.ts`, existing schema/migrations and services.

## Key Decisions Made
- Begin systematic code reading and requirement extraction.

## Artifact Index
- DISPATCH.md — Initial dispatch record
- progress.md — Liveness heartbeat and step tracking
- report.md — Comprehensive service blueprint
- handoff.md — 5-component handoff report
