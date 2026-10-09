import {
  FARM_BLOCKERS,
  FARM_COLS,
  FARM_GARDEN,
  FARM_HEIGHT,
  FARM_PATHS,
  FARM_POIS,
  FARM_ROWS,
  FARM_WIDTH,
  TILE,
  pointInRect,
  type Rect,
} from '@cozy/game-data';
import { mulberry } from './pixel';
import { FARM_PALETTE as C, box, ellipse, flowerBed, paving, fence } from './farm-detail';
import { foliage } from './farm-estate';

/** A town-palette farmstead, baked once into native 32px terrain tiles. */
export function drawMasterFarmLandscape(ctx: CanvasRenderingContext2D): void {
  const rng = mulberry(20261008);
  box(ctx, '#83ae68', 0, 0, FARM_WIDTH, FARM_HEIGHT);
  // Low-contrast meadow patches keep buildings and crops as the focal points.
  for (let i = 0; i < 180; i++) {
    ellipse(
      ctx,
      i % 2 ? '#7da660' : '#8fb973',
      rng() * FARM_WIDTH,
      rng() * FARM_HEIGHT,
      20 + rng() * 48,
      10 + rng() * 24,
    );
  }
  for (let i = 0; i < 6500; i++) {
    const x = Math.floor(rng() * FARM_WIDTH),
      y = Math.floor(rng() * FARM_HEIGHT);
    box(ctx, i % 3 ? C.grassLight : C.grassDark, x, y, 1, 2);
    if (i % 4 === 0) box(ctx, C.grassLight, x + 2, y + 1, 1, 2);
  }

  // Continuous sandy lanes with individually laid limestone edging.
  const lanes = FARM_PATHS.map((p) => {
    // Reduce oversized sandy areas to garden lanes while retaining the route network.
    const inset = p.w > p.h ? Math.min(14, p.h / 5) : Math.min(10, p.w / 6);
    return p.w > p.h
      ? { x: p.x, y: p.y + inset, w: p.w, h: p.h - inset * 2 }
      : { x: p.x + inset, y: p.y, w: p.w - inset * 2, h: p.h };
  });
  const road = (x: number, y: number) => lanes.some((p) => pointInRect(x, y, p));
  for (let y = 0; y < FARM_HEIGHT; y += 2) {
    for (let x = 0; x < FARM_WIDTH; x += 2) {
      if (!road(x, y)) continue;
      const edge = !road(x - 4, y) || !road(x + 4, y) || !road(x, y - 4) || !road(x, y + 4);
      const joint = x % 12 < 2 || y % 12 < 2;
      box(ctx, edge ? (joint ? '#acaa89' : '#dcd4b4') : '#d4bc8e', x, y, 2, 2);
    }
  }
  for (let i = 0; i < 4800; i++) {
    const x = Math.floor(rng() * FARM_WIDTH),
      y = Math.floor(rng() * FARM_HEIGHT);
    if (road(x, y) && road(x - 6, y - 6) && road(x + 6, y + 6)) {
      box(ctx, i % 2 ? '#e5d2aa' : '#c5ab7e', x, y, i % 3 ? 1 : 3, 1);
    }
  }
  // Entry, shop terrace and a small social courtyard around the existing well.
  paving(ctx, { x: 32, y: 78, w: 176, h: 65 });
  paving(ctx, { x: 196, y: 310, w: 216, h: 40 });
  paving(ctx, { x: 548, y: 285, w: 216, h: 62 });
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(676, 405, 128, 43, 0, 0, Math.PI * 2);
  ctx.clip();
  paving(ctx, { x: 548, y: 362, w: 256, h: 86 });
  ctx.restore();
  // Terracotta inlays tie the farm square to the town plaza.
  for (const x of [566, 780]) {
    box(ctx, '#b98c6a', x, 395, 9, 9);
    box(ctx, '#f4e3c1', x + 2, 397, 5, 5);
  }
  paving(ctx, { x: 600, y: 448, w: 192, h: 70 });
  flowerBed(ctx, { x: 611, y: 466, w: 101, h: 29 }, 13);
  flowerBed(ctx, { x: 232, y: 330, w: 52, h: 12 }, 4);
  flowerBed(ctx, { x: 348, y: 330, w: 48, h: 12 }, 5);
  flowerBed(ctx, { x: 558, y: 324, w: 59, h: 14 }, 6);
  flowerBed(ctx, { x: 697, y: 324, w: 55, h: 14 }, 7);

  // Crop beds sit in a gravel kitchen garden, with narrow accessible aisles.
  const crops = FARM_POIS.crops_field;
  box(ctx, '#6b8059', crops.x - 8, crops.y - 8, crops.w + 16, crops.h + 16);
  box(ctx, '#d6c6a1', crops.x - 5, crops.y - 5, crops.w + 10, crops.h + 10);
  box(ctx, '#c6b48f', crops.x, crops.y, crops.w, crops.h);
  for (let i = 0; i < 1000; i++) {
    const x = crops.x + Math.floor(rng() * crops.w),
      y = crops.y + Math.floor(rng() * crops.h);
    box(ctx, i % 2 ? '#e0d1ad' : '#b3a580', x, y, 2, 1);
  }
  flowerBed(ctx, { x: crops.x, y: crops.y - 23, w: 144, h: 11 }, 20);
  flowerBed(ctx, { x: crops.x + 216, y: crops.y - 23, w: 164, h: 11 }, 21);
  flowerBed(ctx, { x: crops.x, y: crops.y + crops.h + 16, w: crops.w - 4, h: 17 }, 22);

  drawPond(ctx);

  for (const p of [FARM_POIS.shop_bac_sau, FARM_POIS.silo_warehouse, FARM_GARDEN.greenhouse]) {
    ctx.fillStyle = 'rgba(66, 74, 42, 0.16)';
    ctx.beginPath();
    ctx.moveTo(p.x + 5, p.y + p.h - 5);
    ctx.lineTo(p.x + p.w, p.y + p.h - 5);
    ctx.lineTo(p.x + p.w + 19, p.y + p.h + 12);
    ctx.lineTo(p.x + 24, p.y + p.h + 12);
    ctx.closePath();
    ctx.fill();
  }

  // Informal planted islands soften the road grid and connect the landmark clusters.
  const keepClear = [
    ...Object.values(FARM_POIS),
    FARM_GARDEN.tractor,
    FARM_GARDEN.greenhouse,
    FARM_GARDEN.windmill,
    { x: 184, y: 300, w: 265, h: 106 },
    { x: 535, y: 274, w: 266, h: 244 },
    { x: 0, y: 62, w: 225, h: 102 },
  ];
  for (let i = 0; i < 420; i++) {
    const x = 28 + Math.floor(rng() * (FARM_WIDTH - 56));
    const y = 44 + Math.floor(rng() * (FARM_HEIGHT - 76));
    if (
      road(x, y) ||
      keepClear.some((p) => pointInRect(x, y, { x: p.x - 16, y: p.y - 10, w: p.w + 32, h: p.h + 26 }))
    )
      continue;
    foliage(ctx, x, y, 10 + rng() * 13, i, i % 3 === 0);
  }
  // Sunflower and lavender ribbons frame the animal yards and crop garden.
  for (const [x, y, count, lavender] of [
    [209, 457, 18, 0],
    [110, 738, 24, 1],
    [556, 732, 20, 0],
    [1059, 523, 12, 0],
    [1275, 523, 13, 0],
    [1066, 966, 31, 1],
    [1449, 557, 27, 2],
  ]) {
    for (let i = 0; i < count!; i++) {
      const px = x! + (lavender === 2 ? 0 : i * 11),
        py = y! + (lavender === 2 ? i * 13 : Math.sin(i * 2) * 3);
      box(ctx, '#497847', px, py - 10, 2, 13);
      ellipse(ctx, '#729d50', px - 3, py - 3, 4, 2);
      ellipse(ctx, '#a2be6e', px + 3, py - 5, 4, 2);
      if (lavender === 1) {
        box(ctx, '#8b78ab', px - 1, py - 18, 3, 10);
        box(ctx, '#c7b0d5', px - 2, py - 16, 2, 5);
      } else {
        ellipse(ctx, '#e7b657', px, py - 13, 6, 5);
        ellipse(ctx, '#f6d786', px - 1, py - 15, 4, 3);
        ellipse(ctx, '#8e633f', px, py - 13, 2, 2);
      }
    }
  }

  // A shallow irrigation rill leads from the mill to the pond.
  box(ctx, '#788b65', 880, 266, 57, 19);
  box(ctx, '#b9b996', 881, 267, 55, 15);
  box(ctx, '#41969c', 883, 269, 53, 11);
  box(ctx, '#86c9be', 885, 270, 48, 2);
  for (let x = 884; x < 936; x += 10) box(ctx, '#d2e6ca', x, 276, 5, 1);

  // Planted borders sit away from travel lanes and all interaction footprints.
  for (const r of [
    { x: 238, y: 450, w: 190, h: 14 },
    { x: 113, y: 652, w: 294, h: 13 },
    { x: 104, y: 744, w: 292, h: 12 },
    { x: 555, y: 744, w: 230, h: 12 },
    { x: 554, y: 688, w: 230, h: 12 },
    { x: 106, y: 942, w: 284, h: 13 },
    { x: 568, y: 940, w: 202, h: 13 },
    { x: 1436, y: 556, w: 16, h: 346 },
  ])
    flowerBed(ctx, r, r.x);

  // A shallow boundary hedge and split-rail fence frame the playable map.
  for (let x = 12; x < FARM_WIDTH; x += 22) {
    for (const y of [24, FARM_HEIGHT - 5]) {
      ellipse(ctx, '#53794e', x, y, 17, 12);
      ellipse(ctx, '#6e985c', x - 2, y - 3, 15, 9);
      ellipse(ctx, '#a0bb77', x - 5, y - 6, 7, 3);
    }
  }
  fence(ctx, 8, 31, FARM_WIDTH - 16);
  for (const x of [14, FARM_WIDTH - 14]) {
    for (let y = 50; y < FARM_HEIGHT - 25; y += 24) {
      if (x < 32 && y < 170) continue;
      ellipse(ctx, '#567d4e', x, y, 11, 17);
      ellipse(ctx, '#81a76b', x - 2, y - 4, 8, 11);
    }
  }
  // Meadow flowers in small clusters instead of uniformly scattered confetti.
  for (let i = 0; i < 160; i++) {
    const x = 40 + Math.floor(rng() * (FARM_WIDTH - 80));
    const y = 45 + Math.floor(rng() * (FARM_HEIGHT - 90));
    if (
      road(x, y) ||
      Object.values(FARM_POIS).some((p) =>
        pointInRect(x, y, { x: p.x - 20, y: p.y - 45, w: p.w + 40, h: p.h + 75 }),
      )
    )
      continue;
    box(ctx, '#628d54', x, y, 1, 5);
    box(ctx, i % 3 ? '#f0dcaf' : '#dba2a0', x - 1, y - 1, 3, 3);
    box(ctx, '#fff0cf', x, y, 1, 1);
  }
}

function drawPond(ctx: CanvasRenderingContext2D) {
  const p = FARM_POIS.aquaculture_pond;
  const cx = p.x + p.w / 2,
    cy = p.y + p.h / 2;
  // Organic scanline shoreline, contained inside the authoritative pond footprint.
  const basin = (color: string, inset: number) => {
    const ry = p.h / 2 - inset;
    for (let dy = -Math.floor(ry); dy <= ry; dy++) {
      const wave = 0.92 + Math.sin(dy * 0.037) * 0.045 + Math.cos(dy * 0.077) * 0.025;
      const radius = (p.w / 2 - inset) * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)) * wave;
      box(ctx, color, cx - radius + Math.sin(dy * 0.031) * 5, cy + dy, radius * 2, 1);
    }
  };
  basin('#657e54', 2);
  basin('#a9a27d', 6);
  basin('#d5c69e', 11);
  basin('#608a73', 17);
  basin('#369397', 21);
  basin(C.waterDark, 26);
  basin('#59b8b5', 32);
  basin('#69c4ba', 45);
  for (let a = 0; a < Math.PI * 2; a += 0.21) {
    const dy = Math.sin(a) * (p.h / 2 - 10);
    const wave = 0.92 + Math.sin(dy * 0.037) * 0.045 + Math.cos(dy * 0.077) * 0.025;
    const x = cx + Math.cos(a) * (p.w / 2 - 10) * wave,
      y = cy + dy;
    ellipse(ctx, '#7e8e78', x + 1, y + 2, 8, 5);
    ellipse(ctx, '#c0bea1', x, y, 8, 5);
    ellipse(ctx, '#e4ddbd', x - 2, y - 2, 5, 2);
    if (Math.sin(a * 7) > 0.3) box(ctx, '#7f9e66', x - 4, y + 1, 5, 2);
    if (Math.sin(a * 11) > 0.1 && Math.cos(a) > -0.85) {
      foliage(ctx, x, y - 1, 11 + Math.sin(a * 8) * 4, Math.floor(a * 40), true);
    }
  }
  for (let i = 0; i < 19; i++) {
    const a = i * 2.4,
      x = cx + Math.cos(a) * (128 + (i % 3) * 13),
      y = cy + Math.sin(a) * 65;
    ellipse(ctx, '#317f69', x, y + 2, 10, 5);
    ellipse(ctx, '#7ba965', x, y, 9, 4);
    box(ctx, '#c2d796', x - 5, y - 2, 7, 1);
    box(ctx, '#59b8b5', x + 3, y, 7, 1);
    if (i % 3 === 0) {
      ellipse(ctx, '#c77f99', x, y - 4, 5, 4);
      ellipse(ctx, '#f1c3d0', x - 2, y - 6, 3, 4);
      ellipse(ctx, '#fff0e1', x + 1, y - 7, 2, 3);
      box(ctx, '#eaca7d', x, y - 5, 2, 2);
    }
  }
  for (let i = 0; i < 30; i++) {
    const x = cx + Math.sin(i * 2.7) * 144,
      y = cy + Math.cos(i * 1.7) * 67;
    box(ctx, i % 3 ? '#8dd9d4' : '#d0eee1', x, y, 7 + (i % 4) * 4, 1);
  }
  // Small timber landing: entirely inside the already blocked pond area.
  box(ctx, '#3b7977', p.x + 5, cy - 13, 72, 38);
  for (let y = cy - 18; y < cy + 16; y += 6) {
    box(ctx, '#795b41', p.x + 2, y, 68, 6);
    box(ctx, '#c7a477', p.x + 2, y, 68, 4);
    box(ctx, '#e6c394', p.x + 3, y, 66, 1);
    for (const x of [p.x + 8, p.x + 59]) box(ctx, '#73553c', x, y + 2, 1, 1);
  }
  for (const x of [p.x + 5, p.x + 61]) {
    for (const y of [cy - 19, cy + 15]) {
      box(ctx, '#765a40', x, y - 10, 5, 16);
      box(ctx, '#e2c69a', x, y - 11, 5, 3);
    }
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
