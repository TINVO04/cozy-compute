# Empirical Challenge Report: Map Geometry & Town Portal (`packages/game-data/src/map.ts`)

**Author**: M1 Challenger 2 (`teamwork_preview_challenger` — Empirical Challenger)  
**Target Milestone**: M1 — Data Models & Database Foundation  
**Target Code**: `packages/game-data/src/map.ts`  
**Test Suite**: `packages/game-data/src/map-geometry.challenge.test.ts` (18 automated tests)

---

## 1. Challenge Summary

**Overall risk assessment**: **LOW** (Robust with zero blocking defects).

The map geometry, collision boundaries, and western town portal in `packages/game-data/src/map.ts` are mathematically sound, physically traversable, and free of blockers that could trap or obstruct players. The portal design elegantly avoids infinite scene-transition loops while maintaining strict containment along the western border.

| Dimension | Verification Target | Empirical Status | Risk |
|-----------|---------------------|------------------|------|
| **Pathfinding** | Navigation from `SPAWN` to `farm_gate` along paved routes | **VERIFIED** (BFS on 16px navmesh & 20 TPS physics simulation) | LOW |
| **Blocker Collision** | Obstruction-free pathway and zero overlaps on gate path `t(0, 10, 2, 2)` | **VERIFIED** (0 overlaps on gate path; 54px clear corridor on avenue) | LOW |
| **Perimeter Integrity** | West border blocked at rows 0..9 and rows 12..31, open at rows 10..11 | **VERIFIED** (100% blocked outside gate; 54px vertical opening) | LOW |
| **Portal Safety** | Spawn re-trigger prevention and boundary clamping | **VERIFIED** (`TOWN_FARM_PORTAL_SPAWN` placed outside trigger zone) | LOW |
| **Reverse Topology** | Farm Map western gate exit symmetry (`FARM_BLOCKERS`) | **VERIFIED** (Rows 2..4 open, rows 0..1 and 5..31 blocked) | LOW |

---

## 2. Adversarial Challenges & Findings

### [Low Risk] Challenge 1: Architectural Relationship Between `SPAWN`, `PATHS`, and `PLAZA`
- **Assumption challenged**: *"Pathfinding from `SPAWN` to `farm_gate` traverses strictly along `PATHS`."*
- **Attack scenario**: If navigation or validation logic naively treats `PATHS` as the sole paved surface, `SPAWN` `(768, 608)` immediately fails because `(768, 608)` is located at tile `(24, 19)`, which is outside every rect in `PATHS`.
- **Empirical Observation**:
  - `SPAWN` resides inside `PLAZA = t(17, 12, 13, 8)` (pixel bounds `x: [544, 960), y: [384, 640)`).
  - `PLAZA` is the paved central town square. It seamlessly touches `PATHS` at 4 distinct junctions:
    - North: `t(22, 10, 3, 2)` touches `PLAZA` at `y = 12 * TILE` (`x: 704..800`).
    - South: `t(22, 20, 3, 8)` touches `PLAZA` at `y = 20 * TILE` (`x: 704..800`).
    - West: `t(10, 16, 7, 2)` touches `PLAZA` at `x = 17 * TILE` (`y: 512..576`).
    - East: `t(30, 16, 5, 2)` touches `PLAZA` at `x = 30 * TILE` (`y: 512..576`).
  - From `PLAZA`, players walk across paved tiles directly onto the main northern promenade `t(1, 10, 46, 2)` and into `farm_gate` via `t(0, 10, 2, 2)`.
- **Blast radius**: None in runtime, but tooling/validation scripts must evaluate paved surfaces as `[...PATHS, PLAZA, PIER]`, matching `town-layout.test.ts:21`.
- **Mitigation / Verification**: BFS and physics tests confirm 100% of path nodes are on paved surfaces (`PATHS` or `PLAZA`).

### [Low Risk] Challenge 2: Central Plaza Obstacle Navigation (Fountain Collision)
- **Assumption challenged**: *"Players can navigate on a straight diagonal or direct north vector from `SPAWN` to the northern promenade."*
- **Attack scenario**: Moving straight north from `SPAWN.x = 768` (column 24/23) directly strikes the town fountain at `t(23, 15, 2, 2)` (hitbox `x: 736..800, y: 480..544`).
- **Empirical Observation**:
  - When simulating real-time physics via `stepMovement`, an avatar attempting to move directly north at `x = 736` collides with the southern rim of the fountain at `y = 550` (`top = 544`).
  - However, the plaza is 13 tiles wide (`x: 544..960`). The western aisle between the fountain and the plaza border is 6 tiles wide (192px), and the eastern aisle is 5 tiles wide (160px).
  - An avatar using BFS-directed waypoints smoothly circumvents the fountain to the west (around `x = 688..704`) and connects to `t(22, 10, 3, 2)` and `t(1, 10, 46, 2)`.
- **Blast radius**: Zero for intelligent/pathfinding navigation; manual players simply walk around the fountain.
- **Verification**: `stepMovement` simulation completed in 294 ticks (under 15 seconds of simulated walking) without sticking.

### [Low Risk] Challenge 3: Blocker / Path Overlaps in Town Map vs Western Farm Corridor
- **Assumption challenged**: *"No path tile overlaps any element in `BLOCKERS`."*
- **Attack scenario**: If a blocker occupies a path tile, movement along the path could be severed or pinched below avatar width.
- **Empirical Observation**:
  - **Western Gate Path (`t(0, 10, 2, 2)`)**: Evaluated against all 48 elements in `BLOCKERS`. Exactly **0 overlaps** found.
  - **Doorposts Contact**: The northern border wall `t(0, 0, 1, 10)` ends at `y = 320`. The gate path begins at `y = 320`. Intersection height is exactly 0. The southern border wall `t(0, 12, 1, 20)` begins at `y = 384`. The gate path ends at `y = 384`. Intersection height is exactly 0.
  - **Northern Avenue Corridor**: Every 8px along `y = 352` (center of row 11) from `x = 16` to `x = 768` was tested with `isWalkable(x, 352, BLOCKERS)`. 100% of sampled points returned `true`.
  - **Global Town Scenic Encroachment**: An exhaustive scan of all 20 `PATHS` rects against `BLOCKERS` identified that small scenic decorative props (e.g. tree at `{x: 3, y: 12}` with hitbox `x: [91, 101], y: [374, 384]`) encroach on the southernmost 10px of the 64px-wide path `t(1, 10, 46, 2)`. The remaining clear passage is 54px wide, easily accommodating the 20px avatar collision box.
- **Blast radius**: Zero blockage. The promenade remains wide open.

### [Medium Risk] Challenge 4: Portal Loop Prevention & Boundary Clamping
- **Assumption challenged**: *"Spawning a player at the portal could trigger an immediate reverse transition."*
- **Attack scenario**: When returning from `FarmScene` to `TownScene`, if `TOWN_FARM_PORTAL_SPAWN` is placed within `farm_gate.rect`, the client would enter an infinite bouncing loop between scenes.
- **Empirical Observation**:
  - `farm_gate.rect` is defined as `t(0, 10, 2, 2)`, spanning `x: [0, 64), y: [320, 384)`.
  - `TOWN_FARM_PORTAL_SPAWN` is `{ x: 2 * TILE, y: 11 * TILE } = { x: 64, y: 352 }`.
  - `pointInRect(64, 352, farm_gate.rect)` evaluates to `false` because `64 < 64` is false. `zoneAt(64, 352)` returns `null`.
  - Stepping just 1 pixel west to `x = 63` evaluates `pointInRect(63, 352, farm_gate.rect)` as `true`, returning `'farm_gate'`.
  - Hard boundary: `stepMovement` clamps `nx >= PLAYER_RADIUS = 10`. When moving hard left at the gate, the avatar rests at `x = 10, y = 352`, which is inside `farm_gate` and completely inside map boundaries.
- **Blast radius**: Critical if broken; here it is **perfectly engineered**.
- **Verdict**: Elegant anti-bounce design confirmed.

### [Low Risk] Challenge 5: Vertical Doorpost Clearance Analysis
- **Assumption challenged**: *"Avatar collision box fits through rows 10..11 without clipping doorposts."*
- **Attack scenario**: Avatar feet collision box spans `top = y - 6, bottom = y + 4`. If the vertical opening is too tight, the avatar might get wedged.
- **Empirical Observation**:
  - Blocker `t(0, 0, 1, 10)` ends at `y = 320`. Collision occurs when `y - 6 < 320` <=> `y < 326`.
    - Tested `isWalkable(16, 325)` -> `false` (collides).
    - Tested `isWalkable(16, 326)` -> `true` (walkable).
  - Blocker `t(0, 12, 1, 20)` begins at `y = 384`. Collision occurs when `y + 4 > 384` <=> `y > 380`.
    - Tested `isWalkable(16, 380)` -> `true` (walkable).
    - Tested `isWalkable(16, 381)` -> `false` (collides).
  - The clear vertical opening is `[326, 380]`, which is **54 pixels**.
  - Avatar feet height is `4 - (-6) = 10 pixels`.
  - Safety ratio: 54px / 10px = **5.4x avatar clearance**.
- **Blast radius**: Zero.

---

## 3. Stress Test Results Matrix

All 18 empirical stress tests executed via `vitest` in `packages/game-data/src/map-geometry.challenge.test.ts`:

| # | Test Case Scenario | Expected Behavior | Actual Behavior | Result |
|---|--------------------|-------------------|-----------------|:------:|
| 1 | `SPAWN` boundary and walkability check | Walkable and within map limits | Walkable at (768, 608) | **PASS** |
| 2 | `farm_gate` zone definition and prompt | Rect `[0, 320, 64, 64]`, prompt `'Vào Trang Trại'` | Matches exactly | **PASS** |
| 3 | `TOWN_FARM_PORTAL_SPAWN` walkability & coordinates | (64, 352) walkable and row 10..11 centers walkable | Walkable, zone `'farm_gate'` inside gate | **PASS** |
| 4 | BFS pathfinder from `SPAWN` to `farm_gate` (16px grid) | Discovers 100% walkable path on paved surfaces | Found valid path, all nodes on paved surface | **PASS** |
| 5 | Physics simulation via `stepMovement` (20 TPS) | Drives avatar around fountain to `farm_gate` | Reached `farm_gate` without collision | **PASS** |
| 6 | Gate path `t(0, 10, 2, 2)` vs all `BLOCKERS` | Exactly 0 overlapping blockers | 0 overlaps across all blockers | **PASS** |
| 7 | North/South wall contact with gate path | Touch at y=320 and y=384 with 0 overlap area | Area overlap = 0 | **PASS** |
| 8 | Global `PATHS` vs `BLOCKERS` overlap audit | No blocker completely seals any path rect | Clear passage >= 54px on all paths | **PASS** |
| 9 | Portal bounce prevention (`TOWN_FARM_PORTAL_SPAWN`) | Outside trigger at x=64, triggers at x=63 | Correctly prevents bounce loop | **PASS** |
| 10 | Continuous clearance along y=352 northern avenue | Sampled every 8px from x=16 to 768: all walkable | 100% walkable (95/95 points) | **PASS** |
| 11 | West perimeter rows 0..9 at column 0 (north wall) | 100% blocked (`isWalkable === false`) | 100% blocked (30/30 sample points) | **PASS** |
| 12 | West perimeter rows 12..31 at column 0 (south wall) | 100% blocked (`isWalkable === false`) | 100% blocked (60/60 sample points) | **PASS** |
| 13 | West perimeter rows 10..11 at column 0 (gate opening) | Walkable at y=336, 352, 368 | Walkable across all 3 sample heights | **PASS** |
| 14 | Exact vertical collision boundaries at doorposts | y=325 blocked, y=326 open; y=380 open, y=381 blocked | Verified at 1px resolution | **PASS** |
| 15 | Hard map boundary clamping at gate (`x < 10`) | Clamped to `nx = PLAYER_RADIUS = 10` | Clamped to x=10, inside `farm_gate` | **PASS** |
| 16 | Sliding collision along north/south doorposts | Glides along doorposts without getting stuck | Glides at y=326 and y=380 | **PASS** |
| 17 | Farm Map (`FARM_MAP`) metadata symmetry | `FARM_SPAWN` and `FARM_GATE_EXIT` walkable | Walkable on `FARM_BLOCKERS` | **PASS** |
| 18 | Farm Map western perimeter gate exit (rows 2..4) | Rows 2..4 open, rows 0..1 & 5..31 blocked | Verified open at rows 2..4 | **PASS** |

---

## 4. Unchallenged Areas

- **Pure Canvas Procedural Rendering** (`apps/web/src/art/town-detail.ts`, `farm-landscape.ts`): Visual asset rendering is in M4 scope and scheduled for downstream visual review.
- **Colyseus Realtime Room Routing** (`apps/realtime/src/rooms/farm.ts`): Scene transition packet handling and server authorization are M3 scope.
- **Database Migrations Execution against PostgreSQL container**: M2 scope.

---

## 5. Verdict

### **APPROVE**

The map geometry, blocker partitioning, and western town portal implementation in `packages/game-data/src/map.ts` are robust, mathematically verified, fully compliant with project standards, and ready for integration into M2-M6.
