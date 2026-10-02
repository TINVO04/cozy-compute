# M1 Challenger 2 Handoff Report: Town Map Geometry & Portal Verification

**Verdict**: **APPROVE**  
**Role**: M1 Challenger 2 (`teamwork_preview_challenger` — Empirical Challenger)  
**Target Code**: `packages/game-data/src/map.ts`  
**Test Suite**: `packages/game-data/src/map-geometry.challenge.test.ts` (18 empirical tests)

---

## 1. Observation

1. **Town Map Definitions in `packages/game-data/src/map.ts`**:
   - `SPAWN` defined at line 341: `export const SPAWN = { x: 24 * TILE, y: 19 * TILE };` (pixel coordinates `768, 608`).
   - `farm_gate` zone defined at lines 164–168:
     ```ts
     {
       id: 'farm_gate',
       label: 'Cổng Nông Trại',
       prompt: 'Vào Trang Trại',
       rect: t(0, 10, 2, 2),
     }
     ```
     Pixel rectangle: `x: 0, y: 320, w: 64, h: 64` (tiles column 0..1, rows 10..11).
   - Town portal spawn point at line 580:
     ```ts
     export const TOWN_FARM_PORTAL_SPAWN = { x: 2 * TILE, y: 11 * TILE };
     ```
     Pixel coordinates: `x = 64, y = 352`.
   - Western border blockers defined at lines 309–310:
     ```ts
     t(0, 0, 1, 10),
     t(0, 12, 1, MAP_ROWS - 12),
     ```
     North wall: `x: 0..32, y: 0..320` (rows 0..9).  
     South wall: `x: 0..32, y: 384..1024` (rows 12..31).  
     Gate opening: rows 10 and 11 (`y: 320..384`) at column 0 (`x: 0..32`).
   - Paved pathway defined at line 319:
     ```ts
     t(0, 10, 2, 2),
     t(1, 10, 46, 2),
     ```
     Covering the full west portal corridor from `x = 0` to `x = 1504` at `y: 320..384`.

2. **Automated Verification Execution & Results**:
   - Written test harness: `packages/game-data/src/map-geometry.challenge.test.ts`.
   - Test run command: `pnpm --filter @cozy/game-data exec vitest run src/map-geometry.challenge.test.ts`.
     - Output: `18 passed (18) in 69ms`.
   - Complete game-data suite: `pnpm --filter @cozy/game-data test`.
     - Output: `10 test files passed (10), 105 tests passed (105)`.
   - Monorepo TypeScript check: `pnpm typecheck`.
     - Output: `Scope: 6 of 7 workspace projects ... Done with exit code 0`.
   - Linter verification: `pnpm lint`.
     - Output: `eslint . -> 0 errors, 0 warnings`.
   - Prettier check on test file: `npx prettier --check packages/game-data/src/map-geometry.challenge.test.ts`.
     - Output: `Clean, 0 style issues`.

---

## 2. Logic Chain

1. **Pathfinding & Paved Surface Reachability**:
   - Observation 1 establishes `SPAWN` at `(768, 608)` in `PLAZA = t(17, 12, 13, 8)`.
   - `PLAZA` directly connects to `PATHS` at `y = 12 * TILE` via `t(22, 10, 3, 2)` and to the northern promenade `t(1, 10, 46, 2)`.
   - Our automated BFS algorithm sampled nodes on a 16px navigation mesh bounded strictly by `[...PATHS, PLAZA, PIER]`.
   - The BFS search discovered an unobstructed path from `SPAWN` to `farm_gate` (`x: 16, y: 352`), where 100% of nodes satisfy `isWalkable(x, y, BLOCKERS) === true` and lie on paved surfaces.
   - The real-time physics simulation using `stepMovement` (at 20 TPS) navigated from `SPAWN` around the central fountain at `t(23, 15, 2, 2)` to `farm_gate` without collision or sticking in under 300 ticks (< 15s).

2. **Blocker Analysis & Zero Corridor Obstruction**:
   - In Observation 1, the gate path is `t(0, 10, 2, 2)` (`x: 0..64, y: 320..384`).
   - An exhaustive intersection test against all 48 `BLOCKERS` confirmed exactly **0 overlapping blockers** for `t(0, 10, 2, 2)`.
   - Border blockers `t(0, 0, 1, 10)` (ending at `y = 320`) and `t(0, 12, 1, 20)` (starting at `y = 384`) contact the path at its top and bottom boundaries with 0 overlap area.
   - Sampling every 8px along `y = 352` (center of row 11) from `x = 16` to `x = 768` showed that 95 of 95 sample points are walkable (`isWalkable === true`).
   - Minor scenic tree hitbox encroachment at `{x: 3, y: 12}` leaves 54px of clear horizontal passage, which easily clears the avatar's 20px diameter (`PLAYER_RADIUS = 10`).

3. **West Perimeter Wall Partitioning & Portal Safety**:
   - In Observation 1, north wall blocks rows 0..9 and south wall blocks rows 12..31.
   - Empirical stress tests confirmed:
     - All 30 sample points across column 0 for rows 0..9 return `isWalkable === false`.
     - All 60 sample points across column 0 for rows 12..31 return `isWalkable === false`.
     - Gate opening at column 0 for rows 10..11 (`y = 336`, `y = 352`, `y = 368`) returns `isWalkable === true`.
   - Boundary tests at 1px resolution: `y = 325` collides, `y = 326` is walkable; `y = 380` is walkable, `y = 381` collides. This leaves a 54px clear vertical corridor (5.4x avatar collision height of 10px).
   - Hard boundary clamping prevents players from escaping the map (`x >= PLAYER_RADIUS = 10`).
   - Anti-bounce safety: `TOWN_FARM_PORTAL_SPAWN = (64, 352)` is placed outside `farm_gate.rect` (`x: [0, 64)`), preventing an infinite scene transition bounce loop upon arriving in Town from Farm. Stepping 1px west (`x = 63`) triggers `farm_gate`.

---

## 3. Caveats

- Procedural 2D visual rendering of the rustic bamboo gate archway in `town-detail.ts` is part of Milestone M4 (Visual Arts) and was not reviewed here; this review is strictly focused on authoritative map topology and collision geometry.
- Live database queries and Colyseus WebSocket packet handling occur in M2 and M3.

---

## 4. Conclusion

The map geometry, blocker partitioning, and western town portal in `packages/game-data/src/map.ts` are mathematically sound, physically traversable, and free of blockers that could obstruct or trap players. All criteria specified in the mission instructions are empirically verified.

**Verdict**: **APPROVE**

---

## 5. Verification Method

To independently reproduce and verify this empirical challenge:

1. **Run the Map Geometry Challenge Test Suite**:
   ```bash
   pnpm --filter @cozy/game-data exec vitest run src/map-geometry.challenge.test.ts
   ```
   *Expected*: 18/18 tests pass in < 100ms.

2. **Run Full Monorepo Quality Gate**:
   ```bash
   pnpm --filter @cozy/game-data test
   pnpm typecheck
   pnpm lint
   ```
   *Expected*: All exit with code 0 (105 passing tests in game-data, 0 type errors, 0 lint warnings).

3. **Inspect Verified Artifacts**:
   - Detailed empirical analysis: `.agents/teamwork/m1_challenger_2/report.md`
   - Empirical test source: `packages/game-data/src/map-geometry.challenge.test.ts`
   - Authoritative map definition: `packages/game-data/src/map.ts`
