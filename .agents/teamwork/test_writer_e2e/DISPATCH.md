## 2026-10-08T12:46:21Z
You are test_writer_e2e, the test engineer for the E2E Testing Track.
Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\test_writer_e2e

## Mandatory First Step
Read the authoritative user request at:
`C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically under header `## 2026-10-08T12:29:53Z`).

Also read the project architecture document at:
`C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\PROJECT.md`.

## Objective
Design and implement a comprehensive, opaque-box, requirement-driven E2E test suite for the Cozy Compute vehicle asset pack and runtime system.
Your test suite must be derived directly from user requirements (NOT implementation internals) and follow the 4-tier methodology:
1. **Tier 1 - Feature Coverage (>=5 test cases per feature)**:
   - Happy-path tests for each of the 16 vehicle models in isolation (existence, valid specs, dimensions <=40px, contact y=37, speed, brand, price).
   - Dynamic asset loader fallback test (missing asset returns valid fallback without crash).
   - Mounting mechanisms (2-wheel crop & seat, 4-wheel avatar hiding).
   - Night lights coordinates (dx*20, dy*18).
   - Showroom pedestal (136x66 scale 2x) and Shop panel (144x120 scale 3x 4-way rotation).
2. **Tier 2 - Boundary & Corner Cases (>=5 test cases per feature where boundaries exist)**:
   - Max speed limits, zero/negative inputs, empty asset folders, unknown vehicle IDs, road width boundary constraints (40px TOWN_ROADS), rapid mount/dismount toggling.
3. **Tier 3 - Cross-Feature Combinations (pairwise coverage)**:
   - Vehicle purchase in shop -> equipping -> mounting -> driving on roads.
   - 2-wheel mounting + night lighting raytracing beam.
   - Showroom preview 4-directional rotation + inventory icon consistency.
   - Off-road driving triggers fine vs on-road driving zero fine.
4. **Tier 4 - Real-World Application Scenarios (>=5 scenarios)**:
   - End-to-end player journeys exercising the entire vehicle ecosystem.

## Output Requirements
1. Create `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\TEST_INFRA.md` outlining the test philosophy, feature inventory, test runner invocation, and coverage thresholds.
2. Implement the executable test suite in `tests/e2e/vehicles/` (e.g. `tests/e2e/vehicles/vehicles.e2e.test.ts` or a runnable test script using Vitest / Node test runner).
3. Execute the tests to verify the test runner runs and document initial results.
4. When test cases are fully created, create `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\TEST_READY.md` containing the runner command and coverage summary table.
5. Write your comprehensive report in `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\test_writer_e2e\handoff.md` and send a message back to the orchestrator.

## Exclusively Owned Files
- `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\TEST_INFRA.md`
- `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\TEST_READY.md`
- `tests/e2e/vehicles/*`
- Your working directory `.agents/teamwork/test_writer_e2e/*`
DO NOT modify implementation files in `packages/game-data` or `apps/web`.


## 2026-10-08T12:59:00Z
**Context**: E2E Testing Track
**Content**: Great work creating the 4-tier E2E test suite and publishing TEST_INFRA.md and TEST_READY.md! Please ensure ESLint passes cleanly on tests/e2e/vehicles/ (`pnpm eslint tests/e2e/vehicles/`), and finalize your handoff.md.
**Action**: Clean up any lint errors in tests/e2e/vehicles/, deliver handoff.md, and send completion message.
