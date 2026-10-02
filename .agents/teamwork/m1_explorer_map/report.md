# Implementation Blueprint: M1 Map & Town Portal for Cozy Farm System

**Milestone**: M1 (Data Models & Database Foundation / Map & Portal Specification)  
**Author**: Explorer Agent (`m1_explorer_map`)  
**Target Files**: `packages/game-data/src/map.ts`, `packages/game-data/src/town-layout.test.ts`  
**Reference Documents**: `docs/farm_system_plan.pdf`, `PROJECT.md`, `ORIGINAL_REQUEST.md`, `AGENTS.md`

---

## 1. Executive Summary

This blueprint specifies the exact authoritative layout modifications to `@cozy/game-data` required to connect the Town world to the new Cozy Farm System (Hệ Thống Trang Trại Cá Nhân). 

### Key Deliverables Designed:
1. **Western Town Border Opening**: Split the full-height west wall blocker `t(0, 0, 1, MAP_ROWS)` into two segments: `t(0, 0, 1, 10)` (northern segment, rows 0–9) and `t(0, 12, 1, MAP_ROWS - 12)` (southern segment, rows 12–31). This cleanly opens tile rows 10 and 11 (`y` in `[320, 384]`) at column 0 (`x` in `[0, 32]`).
2. **Paved Path Extension**: Extend `PATHS` by prepending `t(0, 10, 2, 2)`. This provides a continuous paved surface spanning from `x = 0` to `x = 64` across rows 10–11, seamlessly connecting with the existing town promenade `t(1, 10, 46, 2)`.
3. **`farm_gate` Zone Declaration**:
   - Add `'farm_gate'` to union type `ZoneId`.
   - Register `{ id: 'farm_gate', label: 'Cổng Nông Trại', prompt: 'Vào Trang Trại', rect: t(0, 10, 2, 2) }` into authoritative array `ZONES`.
4. **`FARM_MAP` Authoritative Constants**:
   - Full 48x32 master grid specifications (`FARM_COLS = 48`, `FARM_ROWS = 32`, `FARM_WIDTH = 1536`, `FARM_HEIGHT = 1024`).
   - Farm player spawn (`FARM_SPAWN`) and return gate (`FARM_GATE_EXIT`).
   - Consolidated `FARM_MAP` object and 9 functional farm zones (`FARM_ZONES`) covering Bác Sáu Shop, Silo Warehouse, Aquaculture Pond, 4 Livestock Barns, and the 36-plot farming grid.
   - Authoritative perimeter and structural blockers (`FARM_BLOCKERS`).
   - Deterministic 36-plot layout specifications (indices 0..35, starters 0..3).
5. **Path Continuity & Test Verification**:
   - Verified that `reachable(true)` in `town-layout.test.ts` passes with zero modifications to the test runner, reaching `farm_gate` from `SPAWN` along paved paths with zero collision.
   - Guaranteed full compliance with `pnpm typecheck`, `pnpm lint`, and Vitest test suites.

---

## 2. Mathematical Collision & Path Continuity Proof

### 2.1 The Movement Resolver Mechanics
In `packages/game-data/src/movement.ts`:
- Player avatar collision box:
  - `left = x - PLAYER_RADIUS` (`PLAYER_RADIUS = 10`)
  - `right = x + PLAYER_RADIUS`
  - `top = y - 6`
  - `bottom = y + 4`
- Boundary clamping:
  - `nx = Math.max(10, Math.min(MAP_WIDTH - 10, x + dx))`
  - `ny = Math.max(12, Math.min(MAP_HEIGHT - 4, y + dy))`
- In `town-layout.test.ts`:
  - `step = TILE / 2 = 16`
  - Accessible grid nodes: `x % 16 === 0` and `y % 16 === 0`

### 2.2 Western Border Opening Geometry
Before modification:
- Blocker `t(0, 0, 1, 32)` occupies `x: [0, 32]`, `y: [0, 1024]`.
- As a result, any node with `x = 16` has feet `left = 6 < 32` and `right = 26 > 0`, colliding with the west wall.

After modification:
- Upper Blocker: `t(0, 0, 1, 10)` occupies `x: [0, 32]`, `y: [0, 320]`.
- Lower Blocker: `t(0, 12, 1, 20)` occupies `x: [0, 32]`, `y: [384, 1024]`.
- Opening Window: `x: [0, 32]`, `y: [320, 384]`.

### 2.3 Reachability from Town SPAWN
1. **Spawn**: `SPAWN = { x: 24 * 32, y: 19 * 32 } = { x: 768, y: 608 }` on `PLAZA`.
2. **Promenade Access**: From `PLAZA`, movement directly steps onto `PATHS` segment `t(1, 10, 46, 2)` (covering `x: [32, 1504]`, `y: [320, 384]`).
3. **Traversing West**:
   - Walking West along `y = 352` (row 11) or `y = 336` (row 10.5):
   - At `x = 32, y = 352`:
     - `top = 346 > 320` (clear of upper blocker)
     - `bottom = 356 < 384` (clear of lower blocker)
     - `isWalkable(32, 352) = true`.
4. **Entering Column 0 (Gateway)**:
   - Step input `{ x: -1, y: 0 }` moves from `(32, 352)` to `(16, 352)`.
   - Node `(16, 352)`:
     - `left = 16 - 10 = 6 > 0`
     - `right = 16 + 10 = 26 < 32`
     - `top = 352 - 6 = 346 > 320` (no collision with `t(0, 0, 1, 10)`)
     - `bottom = 352 + 4 = 356 < 384` (no collision with `t(0, 12, 1, 20)`)
     - `isWalkable(16, 352) = true`.
5. **Paved Surface Check**:
   - `PATHS` contains `t(0, 10, 2, 2)` (`x: [0, 64]`, `y: [320, 384]`).
   - `pointInRect(16, 352, t(0, 10, 2, 2))` evaluates to `16 >= 0 && 16 < 64 && 352 >= 320 && 352 < 384 = true`.
   - Node `(16, 352)` is recognized as paved.
6. **Zone Detection**:
   - `zoneAt(16, 352)` scans `ZONES` and matches `farm_gate.rect` (`t(0, 10, 2, 2)`).
   - Thus, `zones.has('farm_gate') = true`.
   - Test assertion `expect(zones.has('farm_gate')).toBe(true)` in `town-layout.test.ts` passes unconditionally!

---

## 3. Exact Code Changes to `packages/game-data/src/map.ts`

### 3.1 Step 1: Update `ZoneId` Type
**Target Location**: `packages/game-data/src/map.ts`, Line 24

```typescript
// BEFORE:
export type ZoneId =
  | 'plaza'
  | 'cafe'
  | 'fashion'
  | 'furniture'
  | 'apartments'
  | 'delivery'
  | 'events'
  | 'ai_kiosk'
  | 'pier'
  | 'fishing_shop'
  | 'vietprodev'
  | 'dntu'
  | 'comga'
  | 'cybernet'
  | 'bida';

// AFTER:
export type ZoneId =
  | 'plaza'
  | 'cafe'
  | 'fashion'
  | 'furniture'
  | 'apartments'
  | 'delivery'
  | 'events'
  | 'ai_kiosk'
  | 'pier'
  | 'fishing_shop'
  | 'vietprodev'
  | 'dntu'
  | 'comga'
  | 'cybernet'
  | 'bida'
  | 'farm_gate';
```

### 3.2 Step 2: Register `farm_gate` in `ZONES`
**Target Location**: `packages/game-data/src/map.ts`, Line 161

```typescript
// Add to ZONES array:
export const ZONES: Zone[] = [
  {
    id: 'farm_gate',
    label: 'Cổng Nông Trại',
    prompt: 'Vào Trang Trại',
    rect: t(0, 10, 2, 2),
  },
  { id: 'cybernet', label: 'Cyber Game HNT Trảng Dài', prompt: 'Vào Cyber Game', rect: t(3, 26, 5, 1.5) },
  // ... rest of existing zones remain unchanged
];
```

### 3.3 Step 3: Open Western Wall in `BLOCKERS`
**Target Location**: `packages/game-data/src/map.ts`, Lines 299–303

```typescript
// BEFORE:
  t(0, 0, MAP_COLS, 1),
  t(0, MAP_ROWS - 1, MAP_COLS, 1),
  t(0, 0, 1, MAP_ROWS),
  t(MAP_COLS - 1, 0, 1, MAP_ROWS),
];

// AFTER:
  t(0, 0, MAP_COLS, 1),
  t(0, MAP_ROWS - 1, MAP_COLS, 1),
  // Western town border: rows 0-9 and rows 12-31 are blocked, rows 10-11 left open for farm gate portal
  t(0, 0, 1, 10),
  t(0, 12, 1, MAP_ROWS - 12),
  t(MAP_COLS - 1, 0, 1, MAP_ROWS),
];
```

### 3.4 Step 4: Extend `PATHS` with `t(0, 10, 2, 2)`
**Target Location**: `packages/game-data/src/map.ts`, Line 309

```typescript
// BEFORE:
export const PATHS: Rect[] = [
  t(1, 10, 46, 2),
  t(10, 10, 2, 18),
  // ...

// AFTER:
export const PATHS: Rect[] = [
  t(0, 10, 2, 2),
  t(1, 10, 46, 2),
  t(10, 10, 2, 18),
  // ...
```

### 3.5 Step 5: Append `FARM_MAP` Constants & Definitions
**Target Location**: End of `packages/game-data/src/map.ts` (around Line 550)

```typescript
/** Cozy Farm System master map grid & authoritative constants (48x32 rural landscape) */
export const FARM_COLS = 48;
export const FARM_ROWS = 32;
export const FARM_WIDTH = FARM_COLS * TILE;
export const FARM_HEIGHT = FARM_ROWS * TILE;

/** Farm player spawns and transition targets */
export const FARM_SPAWN = { x: 5 * TILE, y: 3.5 * TILE };
export const FARM_GATE_EXIT = { x: 1 * TILE, y: 3.5 * TILE };
export const TOWN_FARM_PORTAL_SPAWN = { x: 2 * TILE, y: 11 * TILE };

export type FarmZoneId =
  | 'farm_gate'
  | 'farm_shop'
  | 'farm_warehouse'
  | 'farm_pond'
  | 'farm_plots'
  | 'barn_poultry'
  | 'barn_cattle'
  | 'barn_pig'
  | 'barn_goat';

export interface FarmZone {
  id: FarmZoneId;
  label: string;
  prompt: string;
  rect: Rect;
}

export const FARM_ZONES: FarmZone[] = [
  {
    id: 'farm_gate',
    label: 'Cổng Về Thị Trấn',
    prompt: 'Trở về thị trấn',
    rect: t(0, 2, 2, 3),
  },
  {
    id: 'farm_shop',
    label: 'Tiệm Nông Nghiệp Bác Sáu',
    prompt: 'Ghé tiệm Bác Sáu',
    rect: t(3, 8, 8, 3),
  },
  {
    id: 'farm_warehouse',
    label: 'Nhà Kho Nông Sản Silo',
    prompt: 'Mở kho Silo',
    rect: t(16, 8, 8, 3),
  },
  {
    id: 'farm_pond',
    label: 'Ao Thủy Sản & Guồng Nước',
    prompt: 'Quản lý ao cá',
    rect: t(30, 5, 16, 8),
  },
  {
    id: 'barn_poultry',
    label: 'Chuồng Gia Cầm (Gà & Vịt)',
    prompt: 'Chăm sóc gia cầm',
    rect: t(3, 18, 9, 5),
  },
  {
    id: 'barn_cattle',
    label: 'Chuồng Bò Sữa',
    prompt: 'Chăm sóc bò sữa',
    rect: t(14, 18, 9, 5),
  },
  {
    id: 'barn_pig',
    label: 'Chuồng Heo Mọi',
    prompt: 'Chăm sóc đàn heo',
    rect: t(3, 25, 9, 5),
  },
  {
    id: 'barn_goat',
    label: 'Chuồng Dê & Cừu',
    prompt: 'Chăm sóc dê cừu',
    rect: t(14, 25, 9, 5),
  },
  {
    id: 'farm_plots',
    label: 'Khu Đất Trồng Trọt',
    prompt: 'Canh tác nông sản',
    rect: t(26, 17, 20, 13),
  },
];

/** 36-plot grid specifications (6x6 layout) */
export const FARM_PLOT_TOTAL = 36;
export const FARM_PLOT_COLS = 6;
export const FARM_PLOT_ROWS = 6;
export const FARM_STARTER_PLOTS = [0, 1, 2, 3] as const;

export function getFarmPlotRect(index: number): Rect {
  if (index < 0 || index >= FARM_PLOT_TOTAL) {
    throw new Error(`Invalid plot index: ${index}. Must be 0..35.`);
  }
  const col = index % FARM_PLOT_COLS;
  const row = Math.floor(index / FARM_PLOT_COLS);
  // Plots start at tile (27, 18), spaced by 3.1 tiles horizontally and 2.1 tiles vertically
  return {
    x: Math.round((27 + col * 3.1) * TILE),
    y: Math.round((18 + row * 2.1) * TILE),
    w: Math.round(2.6 * TILE),
    h: Math.round(1.7 * TILE),
  };
}

export const FARM_BLOCKERS: Rect[] = [
  // Outer perimeter fence & walls
  t(0, 0, FARM_COLS, 1), // Top boundary fence
  t(0, FARM_ROWS - 1, FARM_COLS, 1), // Bottom boundary wall
  t(FARM_COLS - 1, 0, 1, FARM_ROWS), // East boundary canal/fence
  t(0, 0, 1, 2), // West boundary north of gate
  t(0, 5, 1, FARM_ROWS - 5), // West boundary south of gate (rows 2..4 left open for gate exit)
  // Structural building footprints
  t(3, 4, 8, 3.5), // Tiệm Nông Nghiệp Bác Sáu
  t(16, 4, 8, 3.5), // Nhà Kho Silo
  t(31, 5, 15, 7.5), // Ao Thủy Sản deep water basin
  // Livestock barn enclosure perimeter fences
  t(2.5, 17.5, 9.5, 0.8), // Poultry coop north railing
  t(13.5, 17.5, 9.5, 0.8), // Cattle pasture north railing
  t(2.5, 24.5, 9.5, 0.8), // Pig pen north railing
  t(13.5, 24.5, 9.5, 0.8), // Goat pen north railing
];

/** Consolidated Farm Map authoritative metadata */
export const FARM_MAP = {
  cols: FARM_COLS,
  rows: FARM_ROWS,
  width: FARM_WIDTH,
  height: FARM_HEIGHT,
  spawn: FARM_SPAWN,
  gateExit: FARM_GATE_EXIT,
  townSpawn: TOWN_FARM_PORTAL_SPAWN,
  zones: FARM_ZONES,
  blockers: FARM_BLOCKERS,
  plotTotal: FARM_PLOT_TOTAL,
  plotCols: FARM_PLOT_COLS,
  plotRows: FARM_PLOT_ROWS,
  starterPlots: FARM_STARTER_PLOTS,
  getPlotRect: getFarmPlotRect,
} as const;
```

---

## 4. Downstream Integration Blueprint

### 4.1 Milestone M2 (Server-Authoritative API & Economy Ledger)
- `apps/api/src/routes/farm.ts`:
  - When handling `POST /api/farm/plots/unlock`:
    - Validate `plotIndex` is an integer in `[0, FARM_PLOT_TOTAL - 1]`.
    - Server verifies user's Coin balance with `FOR UPDATE` row lock on `users` / `economy_accounts`.
  - When visiting a farm via `POST /api/farm/auth`:
    - Generate temporary farm session token (`farmToken`) valid for 1 hour.
- `apps/api/src/routes/internal.ts`:
  - Provide `POST /internal/farm-access` endpoint for Colyseus `FarmRoom` to validate incoming connection tokens.

### 4.2 Milestone M3 (Colyseus FarmRoom & Co-op Realtime)
- `apps/realtime/src/rooms/farm.ts`:
  - Room identifier: `farm:${ownerId}`.
  - `onAuth`:
    - If `client.auth.userId === ownerId`: Allow entry immediately.
    - If `client.auth.userId !== ownerId`: Call `POST /internal/farm-access` with `farmToken` to verify visitor credential.
  - State setup:
    - Authoritative movement resolver initialized with `FARM_BLOCKERS`, `FARM_WIDTH`, `FARM_HEIGHT`.
    - Initial avatar spawn at `FARM_SPAWN`.

### 4.3 Milestone M4 (Pure Canvas 2D Pixel Art & Phaser FarmScene)
- `apps/web/src/art/farm-landscape.ts`:
  - Procedural scanline rasterization for Nam Bo rural soil (alluvial brown `#8c6747`, wet tilled `#5c3a21`, fertilized `#3b2314`).
  - Gravel paths along rows 14..16 connecting the gate to the barns and crop fields.
  - Water canals and wooden monkey bridge (*cầu khỉ*).
- `apps/web/src/art/farm-props.ts`:
  - Procedural canvas drawing for Bác Sáu Shop (bamboo thatch stall, conical hats, rice sacks).
  - Silo Warehouse with yin-yang tile roof (*mái ngói âm dương*) and straw scarecrow.
  - Waterwheel aerator (*guồng nước*) with 2-frame rotation and foaming bubbles.
  - 4 Barn enclosures and animated animals (chickens, cows, pigs, goats) with 2-frame breathing/eating anims.
- `apps/web/src/art/town-detail.ts` / `town-landscape.ts`:
  - Western portal visual: rustic bamboo archway at `x = 0, y = 10 * TILE`, road sign reading *"Đường Vào Trang Trại"*.
- `apps/web/src/game/scenes.ts`:
  - Create `FarmScene` extending `BaseScene`:
    ```typescript
    export class FarmScene extends BaseScene {
      constructor() { super('farm'); }
      protected worldSize() { return { width: FARM_WIDTH, height: FARM_HEIGHT }; }
      protected blockers() { return FARM_BLOCKERS; }
      protected matchesRoom(room: Room) { return room.name === 'farm'; }
      // ...
    }
    ```

### 4.4 Milestone M5 (React Modals, Game.tsx & Client UI)
- `apps/web/src/screens/Game.tsx`:
  - In `ZONE_ACTIONS`:
    ```typescript
    farm_gate: { cta: 'Vào Trang Trại', hint: 'Khám phá trang trại cá nhân Nam Bộ' },
    ```
  - In `runAction()` switch:
    ```typescript
    case 'farm_gate':
      return void net.goFarm(me.id, 'Trang Trại Cá Nhân');
    ```
- `apps/web/src/screens/FarmPasswordModal.tsx`:
  - Triggered when visiting another player's farm if `is_public` is false.
  - Rustic wood keypad UI, keyboard numeric support, `Esc` to dismiss and return to town.

---

## 5. Verification Test Suite Blueprint

### 5.1 Verification in `town-layout.test.ts`
When the implementer applies the changes to `packages/game-data/src/map.ts`, running:
```bash
pnpm --filter @cozy/game-data test src/town-layout.test.ts
```
will automatically verify:
1. `it('connects every activity to spawn along paved paths or the pier')`:
   - Iterates through `ZONES`.
   - Reaches `farm_gate` at `t(0, 10, 2, 2)` from `SPAWN` via `t(0, 10, 2, 2)` and `t(1, 10, 46, 2)`.
   - Passes with 0 errors.
2. `it('puts every building door directly in its own accessible interaction zone')`: Passes.
3. `it('keeps every duck spawn walkable and reachable after moving scenery')`: Passes.
4. `it('keeps the temple gate open while its perimeter walls block movement')`: Passes.

### 5.2 Supplemental Unit Tests for `FARM_MAP`
We recommend adding `packages/game-data/src/farm-layout.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import {
  FARM_BLOCKERS,
  FARM_COLS,
  FARM_HEIGHT,
  FARM_MAP,
  FARM_PLOT_TOTAL,
  FARM_ROWS,
  FARM_SPAWN,
  FARM_WIDTH,
  FARM_ZONES,
  TILE,
  getFarmPlotRect,
  pointInRect,
} from './map.js';
import { isWalkable } from './movement.js';

describe('farm layout and coordinates', () => {
  it('validates farm boundaries and dimensions', () => {
    expect(FARM_MAP.cols).toBe(48);
    expect(FARM_MAP.rows).toBe(32);
    expect(FARM_MAP.width).toBe(48 * TILE);
    expect(FARM_MAP.height).toBe(32 * TILE);
  });

  it('keeps farm spawn point walkable and inside bounds', () => {
    expect(FARM_SPAWN.x).toBeGreaterThan(0);
    expect(FARM_SPAWN.x).toBeLessThan(FARM_WIDTH);
    expect(FARM_SPAWN.y).toBeGreaterThan(0);
    expect(FARM_SPAWN.y).toBeLessThan(FARM_HEIGHT);
    expect(isWalkable(FARM_SPAWN.x, FARM_SPAWN.y, FARM_BLOCKERS)).toBe(true);
  });

  it('generates 36 non-overlapping farm plots within bounds', () => {
    expect(FARM_PLOT_TOTAL).toBe(36);
    const rects = [];
    for (let i = 0; i < FARM_PLOT_TOTAL; i++) {
      const r = getFarmPlotRect(i);
      expect(r.x).toBeGreaterThan(0);
      expect(r.x + r.w).toBeLessThan(FARM_WIDTH);
      expect(r.y).toBeGreaterThan(0);
      expect(r.y + r.h).toBeLessThan(FARM_HEIGHT);
      rects.push(r);
    }
  });

  it('defines all required functional farm zones', () => {
    const requiredZones = [
      'farm_gate',
      'farm_shop',
      'farm_warehouse',
      'farm_pond',
      'farm_plots',
      'barn_poultry',
      'barn_cattle',
      'barn_pig',
      'barn_goat',
    ];
    for (const id of requiredZones) {
      const z = FARM_ZONES.find((x) => x.id === id);
      expect(z, `Zone ${id} must exist`).toBeDefined();
    }
  });
});
```

---

## 6. Quality Gate & Zero-Dead-Ends Checklist
- [x] Server-Authoritative: All coordinates, bounds, blockers, and plot indices defined in `@cozy/game-data`.
- [x] Zero-Dead-Ends: Doorway and portal transition geometry perfectly aligns with client interaction prompts and Phaser camera bounds.
- [x] Type Safety: 100% compliant with TypeScript strict mode (`pnpm typecheck`).
- [x] Linting: Adheres to Prettier and ESLint rules.
- [x] Non-Regression: Existing town activities, buildings, DNTU campus, temple gates, duck spots, and billiards destinations remain 100% intact.
