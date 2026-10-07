// ============================================================================
// File: apps/web/src/art/farm-landscape.ts
// Master Procedural Farm Landscape Canvas & Native Tiled Mapping
// Features rectangular grid dirt paths (FARM_PATHS), center circle plaza,
// lush trees, bushes, flowers, and natural curved pond.
// ============================================================================

import {
  FARM_BLOCKERS,
  FARM_COLS,
  FARM_HEIGHT,
  FARM_PATHS,
  FARM_POIS,
  FARM_ROWS,
  FARM_WIDTH,
  TILE,
  type Rect,
} from '@cozy/game-data';
import { mulberry } from './pixel';

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function oval(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number) {
  for (let dy = -Math.floor(ry); dy <= ry; dy++) {
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    rect(ctx, color, x - dx, y + dy, dx * 2 + 1, 1);
  }
}

/**
 * Draws a leafy bush with optional berries or flowers.
 */
function drawBush(ctx: CanvasRenderingContext2D, bx: number, by: number, w = 20, h = 14) {
  oval(ctx, 'rgba(20, 50, 15, 0.3)', bx, by + 4, w / 2 + 2, h / 2);
  oval(ctx, '#14532d', bx, by, w / 2, h / 2);
  oval(ctx, '#15803d', bx, by - 1, w / 2 - 2, h / 2 - 2);
  oval(ctx, '#22c55e', bx - 1, by - 2, w / 2 - 4, h / 2 - 4);
  // Red berries
  rect(ctx, '#ef4444', bx - 3, by - 2, 2, 2);
  rect(ctx, '#ef4444', bx + 3, by - 1, 2, 2);
}

/**
 * Renders the full 1536x1024 artistic master farm landscape.
 */
export function drawMasterFarmLandscape(ctx: CanvasRenderingContext2D): void {
  const rng = mulberry(20261006);

  // =========================================================================
  // 1. BASE MEADOW GRASS & LUSH NATURAL TOPOGRAPHY
  // =========================================================================
  // Warm, vibrant rural pasture green
  rect(ctx, '#5ca83c', 0, 0, FARM_WIDTH, FARM_HEIGHT);

  // Soft rolling hill hues and sunlit knolls
  for (let i = 0; i < 220; i++) {
    const gx = rng() * FARM_WIDTH;
    const gy = rng() * FARM_HEIGHT;
    const rx = 40 + rng() * 90;
    const ry = 30 + rng() * 60;
    oval(ctx, i % 3 === 0 ? '#6ebd45' : i % 3 === 1 ? '#529b35' : '#76c450', gx, gy, rx, ry);
  }

  // Top Cliff Ridge / Terrace framing northern enclosures
  rect(ctx, '#382517', 0, 0, FARM_WIDTH, 1.2 * TILE);
  rect(ctx, '#523720', 0, 0.2 * TILE, FARM_WIDTH, 0.8 * TILE);
  rect(ctx, '#6e4b2c', 0, 0.4 * TILE, FARM_WIDTH, 0.4 * TILE);
  rect(ctx, '#478c2e', 0, 1.1 * TILE, FARM_WIDTH, 4);
  rect(ctx, '#6dbd47', 0, 1.2 * TILE, FARM_WIDTH, 2);

  // South-West stepped grassy hill ledges
  const drawHillLedge = (x: number, y: number, w: number, h: number) => {
    oval(ctx, '#382517', x, y + h, w / 2, 10);
    oval(ctx, '#523720', x, y + h - 4, w / 2 - 2, 8);
    oval(ctx, '#529b35', x, y + h / 2, w / 2, h / 2);
    oval(ctx, '#6dbd47', x, y + h / 2 - 4, w / 2 - 6, h / 2 - 6);
  };
  drawHillLedge(3 * TILE, 22 * TILE, 7 * TILE, 4 * TILE);
  drawHillLedge(2 * TILE, 28 * TILE, 8 * TILE, 5 * TILE);

  // Pixel grass blades & clover tufts
  for (let i = 0; i < 2200; i++) {
    const x = Math.floor(rng() * FARM_WIDTH);
    const y = Math.floor(rng() * FARM_HEIGHT);
    rect(ctx, '#478c2e', x, y, 3, 2);
    rect(ctx, '#76c450', x, y - 1, 2, 1);
  }

  // Wildflower Blooms (Chamomile daisies, pink bells, yellow marigolds)
  for (let i = 0; i < 450; i++) {
    const fx = Math.floor(rng() * (FARM_WIDTH - 60)) + 30;
    const fy = Math.floor(rng() * (FARM_HEIGHT - 60)) + 30;
    const flowerType = i % 3;
    if (flowerType === 0) {
      rect(ctx, '#ffffff', fx - 2, fy - 1, 5, 3);
      rect(ctx, '#ffffff', fx - 1, fy - 2, 3, 5);
      rect(ctx, '#fde047', fx, fy, 1, 1);
    } else if (flowerType === 1) {
      oval(ctx, '#f472b6', fx, fy, 3, 3);
      rect(ctx, '#fbcfe8', fx - 1, fy - 1, 2, 2);
    } else {
      oval(ctx, '#facc15', fx, fy, 3, 3);
      rect(ctx, '#fef08a', fx, fy, 1, 1);
    }
  }

  // =========================================================================
  // 2. UNIFIED SEAMLESS RECTANGULAR DIRT PATHS (Đường Đất Liền Mạch, Không Vết Chèn)
  // =========================================================================
  // Build road mask grid so intersecting rectangles merge into one seamless road network
  const roadSet = new Uint8Array(FARM_ROWS * FARM_COLS);
  const isRoad = (c: number, r: number): boolean =>
    c >= 0 && c < FARM_COLS && r >= 0 && r < FARM_ROWS && roadSet[r * FARM_COLS + c] === 1;

  for (const p of FARM_PATHS) {
    const c0 = Math.floor(p.x / TILE);
    const r0 = Math.floor(p.y / TILE);
    const c1 = Math.floor((p.x + p.w) / TILE);
    const r1 = Math.floor((p.y + p.h) / TILE);
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        if (r >= 0 && r < FARM_ROWS && c >= 0 && c < FARM_COLS) {
          roadSet[r * FARM_COLS + c] = 1;
        }
      }
    }
  }

  // Pass 1: Solid unified road surface across all road tiles (zero internal seams!)
  for (let r = 0; r < FARM_ROWS; r++) {
    for (let c = 0; c < FARM_COLS; c++) {
      if (!isRoad(c, r)) continue;
      const x = c * TILE;
      const y = r * TILE;
      // Completely uniform warm sandy-clay dirt road base (no per-tile dividing borders)
      rect(ctx, '#cca05b', x, y, TILE, TILE);

      // Subtle natural soil grain scattered across surface
      if ((c + r) % 3 === 0) {
        rect(ctx, '#baa06b', x + 6, y + 8, 2, 1);
        rect(ctx, '#e5c486', x + 18, y + 14, 2, 1);
      } else if ((c + r) % 3 === 1) {
        rect(ctx, '#e5c486', x + 10, y + 6, 2, 1);
        rect(ctx, '#baa06b', x + 14, y + 20, 2, 1);
      }
    }
  }

  // Pass 2: Outer borders ONLY where neighbor is grass (strictly no lines inside intersections!)
  for (let r = 0; r < FARM_ROWS; r++) {
    for (let c = 0; c < FARM_COLS; c++) {
      if (!isRoad(c, r)) continue;
      const x = c * TILE;
      const y = r * TILE;

      // Top outer edge
      if (!isRoad(c, r - 1)) {
        rect(ctx, '#8c6f43', x, y, TILE, 3);
        rect(ctx, '#543f22', x, y, TILE, 1);
      }
      // Bottom outer edge
      if (!isRoad(c, r + 1)) {
        rect(ctx, '#8c6f43', x, y + TILE - 3, TILE, 3);
        rect(ctx, '#543f22', x, y + TILE - 1, TILE, 1);
      }
      // Left outer edge
      if (!isRoad(c - 1, r)) {
        rect(ctx, '#8c6f43', x, y, 3, TILE);
        rect(ctx, '#543f22', x, y, 1, TILE);
      }
      // Right outer edge
      if (!isRoad(c + 1, r)) {
        rect(ctx, '#8c6f43', x + TILE - 3, y, 3, TILE);
        rect(ctx, '#543f22', x + TILE - 1, y, 1, TILE);
      }
    }
  }

  // =========================================================================
  // 3. AQUACULTURE POND (Natural Curved Basin with Shoreline Boulders, Dời Lên Trên)
  // =========================================================================
  const pond = FARM_POIS.aquaculture_pond;
  const pcx = pond.x + pond.w / 2;
  // Shift visual pond basin center up by 36px towards the top edge
  const pcy = pond.y + pond.h / 2 - 36;

  // Pond drop shadow
  oval(ctx, 'rgba(40, 70, 20, 0.4)', pcx + 4, pcy + 8, pond.w / 2 + 16, pond.h / 2 + 12);

  // Natural organic curved water basin
  oval(ctx, '#1e293b', pcx, pcy, pond.w / 2 + 4, pond.h / 2 + 4);
  oval(ctx, '#1e40af', pcx - 12, pcy, pond.w / 2 - 18, pond.h / 2 - 10);
  oval(ctx, '#2596be', pcx - 12, pcy, pond.w / 2 - 16, pond.h / 2 - 8);
  oval(ctx, '#3898cb', pcx - 16, pcy - 4, pond.w / 2 - 24, pond.h / 2 - 14);
  oval(ctx, '#48b3e8', pcx - 18, pcy - 8, pond.w / 2 - 34, pond.h / 2 - 20);

  // Shoreline river boulders
  for (let a = 0; a < Math.PI * 2; a += 0.14) {
    const radiusNoise = Math.sin(a * 4) * 8 + Math.cos(a * 7) * 6;
    const stoneDistX = (pond.w / 2 - 5 + radiusNoise) * Math.cos(a);
    const stoneDistY = (pond.h / 2 - 4 + radiusNoise * 0.6) * Math.sin(a);
    const bx = pcx + stoneDistX;
    const by = pcy + stoneDistY;
    const sR = 6 + (Math.sin(a * 8) > 0 ? 3 : 0) + (Math.cos(a * 5) > 0.5 ? 2 : 0);

    oval(ctx, '#0f172a', bx + 1, by + 1, sR + 1, sR);
    oval(ctx, '#334155', bx, by, sR, sR - 1);
    oval(ctx, '#64748b', bx - 1, by - 1, sR - 2, sR - 2);
    oval(ctx, '#94a3b8', bx - 2, by - 2, sR - 4, sR - 4);
    if (Math.sin(a * 11) > 0.4) {
      rect(ctx, '#478c2e', bx - 1, by - sR, 3, 2);
      rect(ctx, '#6dbd47', bx, by - sR - 1, 2, 1);
    }
  }

  // Sparkling wave reflections
  const pondRipples: [number, number, number][] = [
    [pcx - 55, pcy - 16, 22],
    [pcx + 20, pcy - 28, 28],
    [pcx - 30, pcy + 18, 32],
    [pcx + 40, pcy + 10, 20],
    [pcx - 5, pcy - 6, 36],
  ];
  for (const [rx, ry, rw] of pondRipples) {
    rect(ctx, '#bae6fd', rx - rw / 2, ry, rw, 1);
    rect(ctx, '#ffffff', rx - rw / 4, ry, rw / 2, 1);
  }

  // Floating green lily pads with pink & white lotus blossoms
  const lilyPads: [number, number, boolean][] = [
    [pcx - 65, pcy + 8, true],
    [pcx - 48, pcy - 22, false],
    [pcx - 22, pcy - 32, true],
    [pcx + 18, pcy - 30, false],
    [pcx + 50, pcy - 14, true],
    [pcx - 70, pcy - 8, false],
    [pcx - 15, pcy + 22, true],
    [pcx + 30, pcy + 18, false],
  ];
  for (const [lx, ly, hasFlower] of lilyPads) {
    oval(ctx, '#15803d', lx, ly, 10, 7);
    oval(ctx, '#22c55e', lx - 1, ly - 1, 8, 5);
    rect(ctx, '#3898cb', lx + 4, ly, 4, 2);
    if (hasFlower) {
      oval(ctx, '#f472b6', lx - 1, ly - 3, 5, 5);
      oval(ctx, '#ffffff', lx - 1, ly - 4, 3, 3);
      rect(ctx, '#fbbf24', lx - 1, ly - 4, 2, 2);
    }
  }

  // =========================================================================
  // 5. CROPS FIELD BASE
  // =========================================================================
  const crops = FARM_POIS.crops_field;
  rect(ctx, 'rgba(40, 70, 20, 0.35)', crops.x - 4, crops.y - 4, crops.w + 8, crops.h + 8);
  rect(ctx, '#451a03', crops.x - 2, crops.y - 2, crops.w + 4, crops.h + 4);
  rect(ctx, '#8b5028', crops.x - 1, crops.y - 1, crops.w + 2, crops.h + 2);
  rect(ctx, '#543217', crops.x, crops.y, crops.w, crops.h);
  for (let fy = crops.y + 6; fy < crops.y + crops.h - 6; fy += 8) {
    rect(ctx, '#3f210d', crops.x + 4, fy, crops.w - 8, 3);
    rect(ctx, '#73461e', crops.x + 4, fy + 3, crops.w - 8, 1);
  }

  // =========================================================================
  // 6. LUSH GROUND VEGETATION & BUSHES (Cây lớn được render dạng Phaser Sprites động để có depth-sort & đung đưa gió)
  // =========================================================================
  // Dense green shrubbery and berry bushes bordering paths and fences
  const bushLocations = [
    [6 * TILE, 1.8 * TILE],
    [16 * TILE, 1.8 * TILE],
    [24 * TILE, 1.8 * TILE],
    [3 * TILE, 9.5 * TILE],
    [8 * TILE, 13.5 * TILE],
    [13 * TILE, 13.5 * TILE],
    [25 * TILE, 13.5 * TILE],
    [28 * TILE, 13.5 * TILE],
    [42 * TILE, 13.5 * TILE],
    [3 * TILE, 16.5 * TILE],
    [3 * TILE, 25.5 * TILE],
    [13.5 * TILE, 23.5 * TILE],
    [16.5 * TILE, 23.5 * TILE],
    [25.5 * TILE, 23.5 * TILE],
    [27 * TILE, 29.5 * TILE],
    [44 * TILE, 16 * TILE],
    [44 * TILE, 23.5 * TILE],
  ] as const;

  for (const [bx, by] of bushLocations) {
    drawBush(ctx, bx, by);
  }
}

/**
 * Builds the tileset canvas containing the full 1536x1024 master artwork.
 */
export function paintFarmTileset(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = FARM_WIDTH;
  c.height = FARM_HEIGHT;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  drawMasterFarmLandscape(ctx);
  return c;
}

/**
 * Authoritative Tiled JSON map linking the master artwork to a 48x32 tilemap.
 */
export function farmTiledData() {
  const objects = (entries: [string, Rect][], offset: number) =>
    entries.map(([name, r], i) => ({
      id: offset + i,
      name,
      type: name,
      ...r,
      width: r.w,
      height: r.h,
      rotation: 0,
      visible: true,
    }));

  return {
    type: 'map',
    version: 1.1,
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    width: FARM_COLS,
    height: FARM_ROWS,
    tilewidth: TILE,
    tileheight: TILE,
    infinite: false,
    tilesets: [
      {
        firstgid: 1,
        name: 'farm-town',
        tilewidth: TILE,
        tileheight: TILE,
        tilecount: FARM_COLS * FARM_ROWS,
        columns: FARM_COLS,
        image: 'farm-town.png',
        imagewidth: FARM_WIDTH,
        imageheight: FARM_HEIGHT,
        margin: 0,
        spacing: 0,
      },
    ],
    layers: [
      {
        id: 1,
        name: 'Ground',
        type: 'tilelayer',
        width: FARM_COLS,
        height: FARM_ROWS,
        x: 0,
        y: 0,
        opacity: 1,
        visible: true,
        // Each tile (c, r) indexes its exact 32x32 block in the 1536x1024 master canvas
        data: Array.from({ length: FARM_COLS * FARM_ROWS }, (_, i) => i + 1),
      },
      {
        id: 2,
        name: 'Collisions',
        type: 'objectgroup',
        x: 0,
        y: 0,
        opacity: 1,
        visible: false,
        objects: objects(
          FARM_BLOCKERS.map((r, i) => [`blocker-${i}`, r]),
          1,
        ),
      },
      {
        id: 3,
        name: 'POIs',
        type: 'objectgroup',
        x: 0,
        y: 0,
        opacity: 1,
        visible: false,
        objects: objects(Object.entries(FARM_POIS), 1000),
      },
    ],
  };
}
