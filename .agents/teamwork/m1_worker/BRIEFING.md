# BRIEFING — 2026-10-02T04:07:00Z

## Mission
Implement Milestone 1 (M1) of the Cozy Farm System: Database Migration (`0005_cozy_farm_system.sql`), Game Data schemas & constants (`farm.ts`, `index.ts`), and Map Farm Boundary/Layout updates (`map.ts`), verified with comprehensive unit tests.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_worker
- Original parent: d39205dd-01db-4096-9bff-542cd3821c40
- Milestone: M1 — Database Schema, Game Data, and Farm Map Setup

## 🔒 Key Constraints
- Server-Authoritative Game State: Real validation, schemas, and coordinates.
- Zero-Dead-Ends: Fully genuine types, schemas, and map bounds without mock facades.
- Minimal change principle: Modify only target files (`0005_cozy_farm_system.sql`, `packages/game-data/src/farm.ts`, `packages/game-data/src/index.ts`, `packages/game-data/src/map.ts`, test files).
- Quality Gate: `pnpm --filter @cozy/game-data test`, `pnpm --filter @cozy/game-data typecheck`, `pnpm --filter @cozy/api typecheck` must pass.
- DO NOT CHEAT: Genuine logic, real state transitions and bounds calculation.

## Current Parent
- Conversation ID: d39205dd-01db-4096-9bff-542cd3821c40
- Updated: 2026-10-02T04:07:00Z

## Task Summary
- **What to build**:
  - `apps/api/migrations/0005_cozy_farm_system.sql`
  - `packages/game-data/src/farm.ts`
  - `packages/game-data/src/index.ts`
  - `packages/game-data/src/map.ts`
  - Unit tests for farm game data
- **Success criteria**:
  - Clean migration SQL compatible with SQLite / D1 / PostgreSQL
  - Zod / TypeScript schemas and constants for seeds, crops, plots, animal pens, farm animals
  - Map boundary & farm zone definitions in `map.ts`
  - All existing and new tests pass cleanly
- **Interface contracts**: PROJECT.md, ORIGINAL_REQUEST.md
- **Code layout**: packages/game-data and apps/api

## Change Tracker
- **Files modified**:
  - `apps/api/migrations/0005_cozy_farm_system.sql`: 5 farm tables, constraints, initial provisioning queries, and stored procedure
  - `packages/game-data/src/farm.ts`: Full authoritative game definitions, catalogs, and pure calculation helpers
  - `packages/game-data/src/index.ts`: Re-export farm.js
  - `packages/game-data/src/map.ts`: Opened west border, added farm_gate zone, and appended 48x32 FARM_MAP specifications
  - `packages/game-data/src/farm.test.ts`: 18 comprehensive unit tests
- **Build status**: PASS (all tests pass, typechecks pass, lint passes with 0 errors)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (58/58 tests in game-data pass)
- **Lint status**: 0 errors, 0 warnings
- **Tests added/modified**: 18 unit tests in `farm.test.ts`

## Loaded Skills
- **Source**: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\skills\game-crafting\SKILL.md
- **Local copy**: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\m1_worker\game-crafting-skill.md
- **Core methodology**: Server-authoritative state, zero-dead-ends, game balance, clean modular data.
