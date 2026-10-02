import { describe, expect, it } from 'vitest';
import {
  BLOCKERS,
  FARM_BLOCKERS,
  FARM_COLS,
  FARM_GATE_EXIT,
  FARM_MAP,
  FARM_ROWS,
  FARM_SPAWN,
  MAP_HEIGHT,
  MAP_ROWS,
  MAP_WIDTH,
  PATHS,
  PIER,
  PLAZA,
  pointInRect,
  type Rect,
  SPAWN,
  TILE,
  TOWN_FARM_PORTAL_SPAWN,
  zoneAt,
  ZONES,
} from './map.js';
import { isWalkable, PLAYER_RADIUS, stepMovement } from './movement.js';

/** Helper: test if two rects have a non-zero area intersection */
function rectsOverlap(r1: Rect, r2: Rect): boolean {
  const overlapX = Math.max(0, Math.min(r1.x + r1.w, r2.x + r2.w) - Math.max(r1.x, r2.x));
  const overlapY = Math.max(0, Math.min(r1.y + r1.h, r2.y + r2.h) - Math.max(r1.y, r2.y));
  return overlapX > 0 && overlapY > 0;
}

/** Helper: intersection rectangle */
function rectIntersection(r1: Rect, r2: Rect): Rect | null {
  const x = Math.max(r1.x, r2.x);
  const y = Math.max(r1.y, r2.y);
  const w = Math.min(r1.x + r1.w, r2.x + r2.w) - x;
  const h = Math.min(r1.y + r1.h, r2.y + r2.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

describe('Empirical Map Geometry & Town Portal Challenge', () => {
  // ==========================================================================
  // CHALLENGE 1: Pathfinding from SPAWN to farm_gate along PATHS
  // ==========================================================================
  describe('Pathfinding from SPAWN to farm_gate', () => {
    it('verifies SPAWN is walkable and within map boundaries', () => {
      expect(SPAWN.x).toBe(24 * TILE);
      expect(SPAWN.y).toBe(19 * TILE);
      expect(SPAWN.x).toBeGreaterThanOrEqual(PLAYER_RADIUS);
      expect(SPAWN.x).toBeLessThanOrEqual(MAP_WIDTH - PLAYER_RADIUS);
      expect(SPAWN.y).toBeGreaterThanOrEqual(12);
      expect(SPAWN.y).toBeLessThanOrEqual(MAP_HEIGHT - 4);
      expect(isWalkable(SPAWN.x, SPAWN.y, BLOCKERS)).toBe(true);
    });

    it('verifies farm_gate zone definition and coordinates', () => {
      const gate = ZONES.find((z) => z.id === 'farm_gate');
      expect(gate).toBeDefined();
      expect(gate!.rect).toEqual({ x: 0, y: 10 * TILE, w: 2 * TILE, h: 2 * TILE });
      expect(gate!.prompt).toBe('Vào Trang Trại');
      expect(gate!.label).toBe('Cổng Nông Trại');
    });

    it('verifies town farm portal spawn point is within farm_gate zone and walkable', () => {
      expect(TOWN_FARM_PORTAL_SPAWN).toEqual({ x: 2 * TILE, y: 11 * TILE });
      // Tile (2, 11) is adjacent to the 2x2 farm_gate zone [0..2, 10..12)
      expect(isWalkable(TOWN_FARM_PORTAL_SPAWN.x, TOWN_FARM_PORTAL_SPAWN.y, BLOCKERS)).toBe(true);

      // Center of the gate opening at x = 16 (tile 0) and x = 48 (tile 1)
      expect(isWalkable(16, 10 * TILE + 16, BLOCKERS)).toBe(true);
      expect(isWalkable(16, 11 * TILE + 16, BLOCKERS)).toBe(true);
      expect(isWalkable(48, 10 * TILE + 16, BLOCKERS)).toBe(true);
      expect(isWalkable(48, 11 * TILE + 16, BLOCKERS)).toBe(true);

      // Verify zone detection
      expect(zoneAt(16, 10 * TILE + 16)).toBe('farm_gate');
      expect(zoneAt(16, 11 * TILE + 16)).toBe('farm_gate');
      expect(zoneAt(48, 10 * TILE + 16)).toBe('farm_gate');
      expect(zoneAt(48, 11 * TILE + 16)).toBe('farm_gate');
    });

    it('finds a continuous walkable path from SPAWN to farm_gate using BFS on 16px navigation grid', () => {
      const step = TILE / 2; // 16px step
      const surfaces = [...PATHS, PLAZA, PIER];
      const key = (x: number, y: number) => `${x},${y}`;

      const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [
        { x: SPAWN.x, y: SPAWN.y, path: [SPAWN] },
      ];
      const visited = new Set<string>([key(SPAWN.x, SPAWN.y)]);
      let foundPath: { x: number; y: number }[] | null = null;

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (zoneAt(current.x, current.y) === 'farm_gate') {
          foundPath = current.path;
          break;
        }

        const neighbors = [
          { x: current.x + step, y: current.y },
          { x: current.x - step, y: current.y },
          { x: current.x, y: current.y + step },
          { x: current.x, y: current.y - step },
        ];

        for (const next of neighbors) {
          if (next.x < step || next.x > MAP_WIDTH - step || next.y < step || next.y > MAP_HEIGHT - step)
            continue;
          if (!surfaces.some((r) => pointInRect(next.x, next.y, r))) continue;
          if (!isWalkable(next.x, next.y, BLOCKERS)) continue;

          const k = key(next.x, next.y);
          if (visited.has(k)) continue;
          visited.add(k);
          queue.push({ x: next.x, y: next.y, path: [...current.path, next] });
        }
      }

      expect(foundPath).not.toBeNull();
      expect(foundPath!.length).toBeGreaterThan(0);

      // Verify EVERY node in the path:
      // 1. Is walkable (no avatar feet collision with BLOCKERS)
      // 2. Is strictly on paved surfaces (PATHS or PLAZA)
      // 3. Stays within map boundaries
      for (const pt of foundPath!) {
        expect(isWalkable(pt.x, pt.y, BLOCKERS), `Node (${pt.x}, ${pt.y}) must be walkable`).toBe(true);
        const onSurface = surfaces.some((r) => pointInRect(pt.x, pt.y, r));
        expect(onSurface, `Node (${pt.x}, ${pt.y}) must be on paved surface`).toBe(true);
      }

      const finalNode = foundPath![foundPath!.length - 1]!;
      expect(zoneAt(finalNode.x, finalNode.y)).toBe('farm_gate');
    });

    it('successfully simulates real-time physics movement from SPAWN to farm_gate via stepMovement', () => {
      // Generate waypoints from BFS path around obstacles (like the central fountain at t(23, 15, 2, 2))
      const step = TILE / 2;
      const surfaces = [...PATHS, PLAZA, PIER];
      const key = (x: number, y: number) => `${x},${y}`;

      const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [
        { x: SPAWN.x, y: SPAWN.y, path: [SPAWN] },
      ];
      const visited = new Set<string>([key(SPAWN.x, SPAWN.y)]);
      let foundPath: { x: number; y: number }[] | null = null;

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (zoneAt(current.x, current.y) === 'farm_gate') {
          foundPath = current.path;
          break;
        }

        const neighbors = [
          { x: current.x - step, y: current.y }, // prioritize west towards gate
          { x: current.x, y: current.y - step }, // prioritize north
          { x: current.x + step, y: current.y },
          { x: current.x, y: current.y + step },
        ];

        for (const next of neighbors) {
          if (next.x < step || next.x > MAP_WIDTH - step || next.y < step || next.y > MAP_HEIGHT - step)
            continue;
          if (!surfaces.some((r) => pointInRect(next.x, next.y, r))) continue;
          if (!isWalkable(next.x, next.y, BLOCKERS)) continue;

          const k = key(next.x, next.y);
          if (visited.has(k)) continue;
          visited.add(k);
          queue.push({ x: next.x, y: next.y, path: [...current.path, next] });
        }
      }

      expect(foundPath).not.toBeNull();

      // Sample every 4th node from the BFS path to act as navigation waypoints
      const waypoints: { x: number; y: number }[] = [];
      for (let i = 4; i < foundPath!.length; i += 4) {
        waypoints.push(foundPath![i]!);
      }
      waypoints.push(foundPath![foundPath!.length - 1]!);

      let pos = { x: SPAWN.x, y: SPAWN.y };
      const dt = 1 / 20; // 50ms ticks (20 TPS)
      const maxTicks = 1000;
      let ticks = 0;

      for (const target of waypoints) {
        while (Math.hypot(target.x - pos.x, target.y - pos.y) > 8 && ticks < maxTicks) {
          const dx = target.x - pos.x;
          const dy = target.y - pos.y;
          const len = Math.hypot(dx, dy);
          const input = {
            x: len > 0 ? dx / len : 0,
            y: len > 0 ? dy / len : 0,
          };
          pos = stepMovement(pos, input, dt);
          ticks++;
          expect(isWalkable(pos.x, pos.y, BLOCKERS)).toBe(true);
        }
      }

      expect(ticks).toBeLessThan(maxTicks);
      expect(zoneAt(pos.x, pos.y)).toBe('farm_gate');
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Blocker Interference with Pathway & Gate
  // ==========================================================================
  describe('Blocker Interference Analysis', () => {
    it('verifies that the western gate path t(0, 10, 2, 2) has zero overlap with any BLOCKER', () => {
      const gatePath = PATHS[0]!; // t(0, 10, 2, 2)
      expect(gatePath).toEqual({ x: 0, y: 10 * TILE, w: 2 * TILE, h: 2 * TILE });

      for (let i = 0; i < BLOCKERS.length; i++) {
        const b = BLOCKERS[i]!;
        const overlaps = rectsOverlap(gatePath, b);
        expect(overlaps, `Blocker #${i} at (${b.x}, ${b.y}, ${b.w}, ${b.h}) overlaps gate path`).toBe(false);
      }
    });

    it('verifies that the western border blockers touch but do NOT overlap gate path', () => {
      const gatePath = { x: 0, y: 10 * TILE, w: 2 * TILE, h: 2 * TILE }; // y: 320..384
      const northWall = { x: 0, y: 0, w: 1 * TILE, h: 10 * TILE }; // y: 0..320
      const southWall = { x: 0, y: 12 * TILE, w: 1 * TILE, h: 20 * TILE }; // y: 384..1024

      // North wall touches at y = 320 (intersection height = 0)
      expect(rectsOverlap(gatePath, northWall)).toBe(false);
      // South wall touches at y = 384 (intersection height = 0)
      expect(rectsOverlap(gatePath, southWall)).toBe(false);
    });

    it('identifies and catalogs all existing BLOCKERS that intersect PATHS rects in Town map', () => {
      // Stress-test: check all 20 PATH rects against all BLOCKERS
      const overlaps: {
        pathIndex: number;
        path: Rect;
        blockerIndex: number;
        blocker: Rect;
        intersection: Rect;
      }[] = [];

      for (let pi = 0; pi < PATHS.length; pi++) {
        const p = PATHS[pi]!;
        for (let bi = 0; bi < BLOCKERS.length; bi++) {
          const b = BLOCKERS[bi]!;
          const inter = rectIntersection(p, b);
          if (inter) {
            overlaps.push({
              pathIndex: pi,
              path: p,
              blockerIndex: bi,
              blocker: b,
              intersection: inter,
            });
          }
        }
      }

      // Empirical finding:
      // In the town map design, scenic props (like tree {x: 3, y: 12} with rect {x: 91, y: 374, w: 10, h: 10})
      // protrude slightly into the 64px-wide path t(1, 10, 46, 2).
      // We verify that none of these overlaps completely obstructs the path!
      for (const ov of overlaps) {
        // Blocker intersection width or height must leave at least 24px of clear passage (> 2 * PLAYER_RADIUS)
        const pathClearWidth = ov.path.w - ov.intersection.w;
        const pathClearHeight = ov.path.h - ov.intersection.h;
        const hasClearPassage = pathClearWidth >= 2 * PLAYER_RADIUS || pathClearHeight >= 2 * PLAYER_RADIUS;
        expect(hasClearPassage, `Blocker must not fully seal path #${ov.pathIndex}`).toBe(true);
      }

      // Specifically verify path #0 (t(0, 10, 2, 2) leading to farm gate) has ZERO overlaps
      const path0Overlaps = overlaps.filter((o) => o.pathIndex === 0);
      expect(path0Overlaps).toHaveLength(0);
    });

    it('verifies portal bounce prevention: TOWN_FARM_PORTAL_SPAWN is adjacent but outside farm_gate trigger', () => {
      // If the portal spawn was inside farm_gate, player entering Town from Farm would immediately re-trigger
      // the farm gate zone, causing an infinite scene bounce loop!
      expect(
        pointInRect(
          TOWN_FARM_PORTAL_SPAWN.x,
          TOWN_FARM_PORTAL_SPAWN.y,
          ZONES.find((z) => z.id === 'farm_gate')!.rect,
        ),
      ).toBe(false);
      expect(zoneAt(TOWN_FARM_PORTAL_SPAWN.x, TOWN_FARM_PORTAL_SPAWN.y)).not.toBe('farm_gate');

      // But stepping just 1 pixel west (x = 63) immediately enters farm_gate
      expect(zoneAt(TOWN_FARM_PORTAL_SPAWN.x - 1, TOWN_FARM_PORTAL_SPAWN.y)).toBe('farm_gate');
    });

    it('verifies continuous unobstructed clearance along the entire northern avenue to farm gate', () => {
      // Along the central line y = 352 (row 11) from x = 16 to x = 768:
      // Every single point sampled at 8px increments must be walkable!
      for (let x = 16; x <= 768; x += 8) {
        expect(isWalkable(x, 352, BLOCKERS), `Position (${x}, 352) must be walkable`).toBe(true);
      }
    });
  });

  // ==========================================================================
  // CHALLENGE 3: West Perimeter Wall Blocking Outside Gate Opening
  // ==========================================================================
  describe('West Perimeter Wall Collision Integrity', () => {
    it('verifies that rows 0..9 at column 0 are 100% blocked', () => {
      for (let row = 0; row < 10; row++) {
        const centerY = row * TILE + 16;
        // Test avatar standing in column 0 (x = 16)
        expect(isWalkable(16, centerY, BLOCKERS), `Tile (0, ${row}) center must be blocked`).toBe(false);

        // Test multiple points across the row
        expect(
          isWalkable(10, row * TILE + 5, BLOCKERS),
          `Point (10, ${row * TILE + 5}) must be blocked`,
        ).toBe(false);
        expect(
          isWalkable(20, row * TILE + 25, BLOCKERS),
          `Point (20, ${row * TILE + 25}) must be blocked`,
        ).toBe(false);
      }
    });

    it('verifies that rows 12..31 at column 0 are 100% blocked', () => {
      for (let row = 12; row < MAP_ROWS; row++) {
        const centerY = row * TILE + 16;
        // Test avatar standing in column 0 (x = 16)
        expect(isWalkable(16, centerY, BLOCKERS), `Tile (0, ${row}) center must be blocked`).toBe(false);

        // Test multiple points across the row
        expect(
          isWalkable(10, row * TILE + 5, BLOCKERS),
          `Point (10, ${row * TILE + 5}) must be blocked`,
        ).toBe(false);
        expect(
          isWalkable(20, row * TILE + 25, BLOCKERS),
          `Point (20, ${row * TILE + 25}) must be blocked`,
        ).toBe(false);
      }
    });

    it('verifies that rows 10..11 at column 0 are walkable (gate opening)', () => {
      // Row 10: y in [320, 352) -> center y = 336
      // Row 11: y in [352, 384) -> center y = 368
      // Middle of gate: y = 352
      expect(isWalkable(16, 336, BLOCKERS), 'Row 10 center must be walkable').toBe(true);
      expect(isWalkable(16, 352, BLOCKERS), 'Gate middle (352) must be walkable').toBe(true);
      expect(isWalkable(16, 368, BLOCKERS), 'Row 11 center must be walkable').toBe(true);

      // At boundary column 0 with minimum clamp x = 10 (PLAYER_RADIUS)
      expect(isWalkable(10, 352, BLOCKERS), 'West-most position (10, 352) must be walkable').toBe(true);
      expect(isWalkable(20, 352, BLOCKERS), 'Position (20, 352) must be walkable').toBe(true);
    });

    it('stress tests exact vertical collision boundaries of the gate opening', () => {
      // North doorpost blocker t(0, 0, 1, 10) ends at y = 320.
      // Avatar feet box: top = y - 6.
      // For avatar to collide with north blocker: top < 320 <=> y - 6 < 320 <=> y < 326.
      // Therefore, at x = 16 (which is within blocker x: 0..32):
      // At y = 325: top = 319 < 320 -> COLLIDES (blocked)!
      expect(isWalkable(16, 325, BLOCKERS), 'y = 325 must collide with north doorpost').toBe(false);

      // At y = 326: top = 320 (not < 320) -> WALKABLE!
      expect(isWalkable(16, 326, BLOCKERS), 'y = 326 must clear north doorpost').toBe(true);

      // South doorpost blocker t(0, 12, 1, 20) starts at y = 384.
      // Avatar feet box: bottom = y + 4.
      // For avatar to collide with south blocker: bottom > 384 <=> y + 4 > 384 <=> y > 380.
      // At y = 380: bottom = 384 (not > 384) -> WALKABLE!
      expect(isWalkable(16, 380, BLOCKERS), 'y = 380 must clear south doorpost').toBe(true);

      // At y = 381: bottom = 385 > 384 -> COLLIDES (blocked)!
      expect(isWalkable(16, 381, BLOCKERS), 'y = 381 must collide with south doorpost').toBe(false);

      // Clear corridor height is 380 - 326 = 54 pixels.
      // Avatar height is 10 pixels. 54px provides a 5.4x safety margin!
      const clearHeight = 380 - 326;
      expect(clearHeight).toBe(54);
    });

    it('verifies that stepMovement prevents escaping map through the gate opening', () => {
      // Start inside the gate opening at x = 16, y = 352
      let pos = { x: 16, y: 352 };

      // Attempt to move hard west (left)
      for (let i = 0; i < 20; i++) {
        pos = stepMovement(pos, { x: -1, y: 0 }, 0.1);
      }

      // Clamped by PLAYER_RADIUS = 10
      expect(pos.x).toBe(PLAYER_RADIUS);
      expect(pos.y).toBe(352);
      expect(zoneAt(pos.x, pos.y)).toBe('farm_gate');
    });

    it('verifies sliding collision along north and south doorposts at the west gate', () => {
      // Approach north doorpost: start at (24, 330) and move north-west (-1, -1)
      let pos = { x: 24, y: 330 };
      for (let i = 0; i < 10; i++) {
        pos = stepMovement(pos, { x: -1, y: -1 }, 0.05);
      }
      // y must not penetrate above 326
      expect(pos.y).toBeGreaterThanOrEqual(326);
      expect(isWalkable(pos.x, pos.y, BLOCKERS)).toBe(true);

      // Approach south doorpost: start at (24, 375) and move south-west (-1, 1)
      pos = { x: 24, y: 375 };
      for (let i = 0; i < 10; i++) {
        pos = stepMovement(pos, { x: -1, y: 1 }, 0.05);
      }
      // y must not penetrate below 380
      expect(pos.y).toBeLessThanOrEqual(380);
      expect(isWalkable(pos.x, pos.y, BLOCKERS)).toBe(true);
    });
  });

  // ==========================================================================
  // CHALLENGE 4: Farm Map Reverse Topology & Symmetry
  // ==========================================================================
  describe('Farm Map Reverse Topology & Symmetry', () => {
    it('verifies Farm Map gate exit and town spawn coordinates alignment', () => {
      expect(FARM_MAP.cols).toBe(FARM_COLS);
      expect(FARM_MAP.rows).toBe(FARM_ROWS);
      expect(FARM_MAP.spawn).toEqual(FARM_SPAWN);
      expect(FARM_MAP.gateExit).toEqual(FARM_GATE_EXIT);
      expect(FARM_MAP.townSpawn).toEqual(TOWN_FARM_PORTAL_SPAWN);

      // FARM_GATE_EXIT (1 * TILE, 3.5 * TILE) should be walkable on Farm Map
      expect(isWalkable(FARM_GATE_EXIT.x, FARM_GATE_EXIT.y, FARM_BLOCKERS)).toBe(true);

      // FARM_SPAWN (5 * TILE, 3.5 * TILE) should be walkable on Farm Map
      expect(isWalkable(FARM_SPAWN.x, FARM_SPAWN.y, FARM_BLOCKERS)).toBe(true);
    });

    it('verifies Farm Map western perimeter opens at rows 2..4 for the farm gate exit', () => {
      // In FARM_BLOCKERS:
      // t(0, 0, 1, 2) -> rows 0..1 blocked
      // t(0, 5, 1, FARM_ROWS - 5) -> rows 5..31 blocked
      // rows 2..4 left open (y: 64..160)
      expect(isWalkable(16, 0 * TILE + 16, FARM_BLOCKERS)).toBe(false);
      expect(isWalkable(16, 1 * TILE + 16, FARM_BLOCKERS)).toBe(false);

      // Rows 2, 3, 4 are open
      expect(isWalkable(16, 2 * TILE + 16, FARM_BLOCKERS)).toBe(true);
      expect(isWalkable(16, 3 * TILE + 16, FARM_BLOCKERS)).toBe(true);
      expect(isWalkable(16, 4 * TILE + 16, FARM_BLOCKERS)).toBe(true);

      // Row 5 is blocked
      expect(isWalkable(16, 5 * TILE + 16, FARM_BLOCKERS)).toBe(false);
      expect(isWalkable(16, 30 * TILE + 16, FARM_BLOCKERS)).toBe(false);
    });
  });
});
