# BRIEFING — 2026-10-08T13:17:00Z

## Mission
Adversarial test coverage hardening for vehicles system (Tier 5): probe unmounting at speed, headlights switching, reduced motion, 16-vehicle animations, and image cache GC.

## 🔒 My Identity
- Archetype: EMPIRICAL CHALLENGER
- Roles: critic, specialist
- Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\challenger_vehicles_2
- Original parent: cd331520-04d7-4f2f-a8b7-81e43bf66f35
- Milestone: Vehicles System Hardening (Tier 5)
- Instance: 2 of 2

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code (only add tests/verification harnesses)
- Empirical verification mandatory — must write and run tests, reproducing bugs directly
- .agents/teamwork/ holds metadata only — tests co-located in project test suites

## Current Parent
- Conversation ID: cd331520-04d7-4f2f-a8b7-81e43bf66f35
- Updated: not yet

## Review Scope
- **Files to review**:
  - `packages/game-data/src/vehicles.ts`
  - `apps/web/src/art/vehicle-loader.ts`
  - `apps/web/src/art/vehicle.ts`
  - `apps/web/src/game/players.ts`
  - `apps/web/src/game/vehicle-lights.ts`
  - `apps/web/src/game/showroom-art.ts`
  - `apps/web/src/screens/panels/VehicleShopPanel.tsx`
- **Interface contracts**: `PROJECT.md`, `AGENTS.md`
- **Review criteria**: Adversarial stress testing, edge cases, accessibility, cache lifecycle, invariants

## Key Decisions Made
- Initializing briefing and investigation plan.

## Artifact Index
- `handoff.md` — Final adversarial evaluation report and verdict.
- `progress.md` — Liveness heartbeat and step tracking.

## Attack Surface
- **Hypotheses tested**: TBD
- **Vulnerabilities found**: TBD
- **Untested angles**: Unmounting at top speed, switching active headlights, reduced motion mode, 16-vehicle frame cycles, cache deduplication & GC.

## Loaded Skills
- None requested in dispatch.
