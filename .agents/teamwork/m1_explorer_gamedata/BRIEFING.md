# BRIEFING — 2026-10-02T03:57:00Z

## Mission
Investigate packages/game-data and design complete TypeScript definitions, constants, item IDs, crop growth configs, livestock specs, pond fish specs, Bác Sáu shop items, and daily contracts for the Cozy Farm System.

## 🔒 My Identity
- Archetype: explorer
- Roles: GameData Explorer, System Analyst
- Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_explorer_gamedata
- Original parent: d39205dd-01db-4096-9bff-542cd3821c40
- Milestone: M1 Cozy Farm System - GameData

## 🔒 Key Constraints
- Read-only investigation — do NOT implement source code
- Detail exact TypeScript definitions, constants, item IDs, crop growth configs, livestock specs, pond fish specs, Bác Sáu shop items, and daily contracts for packages/game-data/src/farm.ts and re-export in packages/game-data/src/index.ts
- Server-authoritative game state (AGENTS.md)
- Zero dead-ends
- Output report.md and handoff.md in working directory
- Send message back to parent when complete

## Current Parent
- Conversation ID: d39205dd-01db-4096-9bff-542cd3821c40
- Updated: 2026-10-02T03:52:33Z

## Investigation State
- **Explored paths**: `docs/farm_system_plan.pdf`, `PROJECT.md`, `ORIGINAL_REQUEST.md`, `packages/game-data/src/`, `apps/realtime/src/`, `apps/api/migrations/`, `apps/api/src/`
- **Key findings**:
  - `packages/game-data/src/farm.ts` needs to be created and re-exported in `src/index.ts` via `./farm.js`.
  - Defined 5 crops, 5 livestock, 4 aquaculture pond fish species, 19 Bác Sáu shop items, 6 market contracts (+25% bonus).
  - Defined 36-plot unlock schedule (plots 0..3 starter free, scaling to 5,000c) and 8-tier Silo upgrade structure (100 to 500 capacity).
  - Identified requirement for Town West Gate: split blocker `t(0, 0, 1, MAP_ROWS)` in `map.ts` at rows 10..11 and extend `PATHS` from col 1 to col 0 to ensure `town-layout.test.ts` reachability.
- **Unexplored areas**: None for M1 GameData scope.

## Key Decisions Made
- All item IDs follow unified namespacing (`crop_*`, `seed_*`, `stock_*`, `yield_*`, `feed_*`, `fertilizer_*`, `fish_pond_*`).
- Growth stage calculation and moisture decay formulas encapsulated in pure helper functions for deterministic server validation.
- Output comprehensive blueprint to `report.md` and complete hard handoff to `handoff.md`.

## Artifact Index
- DISPATCH.md — Log of dispatch messages
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat and progress tracking
- report.md — Comprehensive M1 GameData blueprint and specification
- handoff.md — Standard 5-component hard handoff report
