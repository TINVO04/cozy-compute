import type Phaser from 'phaser';
import { FARM_GARDEN, FARM_POIS, FARM_SHELTER_WIDTH, TILE, type Rect } from '@cozy/game-data';
import { drawTree, paintBuilding, paintProp } from './town';
import { mulberry } from './pixel';
import { box as rect, ellipse, tiledRoof, fence, flowerBed } from './farm-detail';
import { decorateFarmEstate } from './farm-estate';

export function farmBuilding(p: Rect, label: string, roof: number, warehouse = false) {
  const c = paintBuilding({
    id: 'farm-building',
    label,
    rect: p,
    wall: 0xe9d8b2,
    roof,
    accent: 0x6d7351,
    door: { x: (p.x + p.w / 2) / TILE - 1, w: 2 },
  });
  const ctx = c.getContext('2d')!;
  const bottom = c.height - 2;
  if (warehouse) {
    // A real grain silo gives the warehouse its own agricultural silhouette.
    const sx = 17,
      sw = 44;
    rect(ctx, '#626f65', sx, 31, sw, bottom - 36);
    rect(ctx, '#a4b3a2', sx + 2, 31, sw - 4, bottom - 38);
    rect(ctx, '#d5dcc4', sx + 5, 31, 10, bottom - 38);
    rect(ctx, '#becbb3', sx + 15, 31, 13, bottom - 38);
    for (let y = 39; y < bottom - 12; y += 13) {
      rect(ctx, '#788c7a', sx + 1, y, sw - 2, 2);
      rect(ctx, '#e2e3cb', sx + 3, y - 1, sw - 7, 1);
      rect(ctx, '#5f7768', sx + sw - 9, y + 4, 2, 2);
    }
    for (let y = 0; y < 24; y++) {
      const half = Math.round(y * 1.05);
      rect(ctx, '#647b6c', sx + sw / 2 - half, 9 + y, half * 2, 1);
      rect(ctx, '#92a891', sx + sw / 2 - half, 9 + y, half, 1);
    }
    rect(ctx, '#dfddbc', sx - 2, 32, sw + 4, 3);
    // Timber loading doors with diagonal braces and brass hinges.
    const dx = p.w / 2 - 27;
    rect(ctx, '#554938', dx, bottom - 45, 58, 40);
    rect(ctx, '#9d7952', dx + 2, bottom - 43, 54, 36);
    for (let x = dx + 4; x < dx + 56; x += 6) rect(ctx, '#ba9567', x, bottom - 42, 1, 34);
    for (let i = 0; i < 25; i++) {
      rect(ctx, '#e2c398', dx + 3 + i, bottom - 40 + i, 3, 3);
      rect(ctx, '#e2c398', dx + 29 + i, bottom - 16 - i, 3, 3);
    }
    rect(ctx, '#69523b', dx + 28, bottom - 43, 2, 37);
    for (const x of [dx + 4, dx + 45])
      for (const y of [bottom - 36, bottom - 15]) rect(ctx, '#4e594c', x, y, 9, 2);
  } else {
    // Deep striped veranda, warm canvas valance and flowering climbing vines.
    const awY = bottom - 56;
    rect(ctx, '#78634b', 10, awY - 1, p.w - 12, 17);
    for (let x = 11; x < p.w - 3; x += 10) {
      rect(ctx, Math.floor((x - 11) / 10) % 2 ? '#f2e5c5' : '#7b9470', x, awY, Math.min(10, p.w - 3 - x), 12);
      rect(ctx, '#ddcdab', x, awY + 12, Math.min(9, p.w - 3 - x), 3);
    }
    for (const x of [12, p.w - 9]) {
      rect(ctx, '#826548', x, awY + 15, 4, 37);
      rect(ctx, '#e0c49a', x, awY + 15, 1, 37);
    }
    flowerBed(ctx, { x: 23, y: bottom - 14, w: 37, h: 6 }, 9);
    flowerBed(ctx, { x: p.w - 56, y: bottom - 14, w: 37, h: 6 }, 10);
  }
  for (const x of [5, p.w - 3]) {
    for (let y = bottom - 78; y < bottom - 16; y += 7) {
      ellipse(ctx, '#567c4e', x + Math.sin(y) * 3, y, 4, 3);
      rect(ctx, '#9db777', x - 2, y - 2, 3, 2);
      if (y % 3 === 0) rect(ctx, '#e9b9b0', x, y, 2, 2);
    }
  }
  return c;
}

type PenKind = 'poultry' | 'pig' | 'goat' | 'cattle';

export function paintFarmPen(p: Rect, roof: string, kindOrPasture: PenKind | boolean = false) {
  const kind: PenKind =
    typeof kindOrPasture === 'string' ? kindOrPasture : kindOrPasture ? 'cattle' : 'poultry';
  const c = document.createElement('canvas');
  c.width = p.w;
  c.height = p.h + 32;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(0, 32);
  const rng = mulberry(p.w + p.h * 7);
  const meadow = kind === 'cattle' || kind === 'goat';
  rect(ctx, '#7c8a60', 0, 0, p.w, p.h);
  rect(ctx, meadow ? '#93b47b' : '#c4ae83', 4, 4, p.w - 8, p.h - 8);
  // Soft worn patches and hundreds of tiny straw/clover marks add material at native scale.
  for (let i = 0; i < 14; i++) {
    ellipse(
      ctx,
      meadow ? '#9dbb84' : '#ccb78f',
      20 + rng() * (p.w - 40),
      24 + rng() * (p.h - 48),
      14 + rng() * 20,
      6 + rng() * 10,
    );
  }
  for (let i = 0; i < (p.w * p.h) / 90; i++) {
    const x = 10 + rng() * (p.w - 20),
      y = 14 + rng() * (p.h - 24);
    rect(
      ctx,
      meadow ? (i % 2 ? '#749863' : '#bdd19a') : i % 2 ? '#e6ce99' : '#ad966e',
      x,
      y,
      i % 3 ? 2 : 4,
      1,
    );
    if (meadow && i % 8 === 0) rect(ctx, '#f3e6bd', x + 1, y - 1, 2, 2);
  }
  // The doorway path leads to the actual open southern gate.
  for (let i = 0; i < 4; i++) {
    const x = 68 + ((p.w / 2 - 68) * i) / 3,
      y = 71 + ((p.h - 87) * i) / 3;
    ellipse(ctx, '#b3a887', x, y + 2, 12, 5);
    ellipse(ctx, '#ded0ac', x, y, 11, 4);
    rect(ctx, '#eee0bf', x - 6, y - 2, 8, 1);
  }
  if (kind === 'pig') {
    const x = p.w * 0.53,
      y = p.h * 0.6;
    ellipse(ctx, '#af936d', x, y, 48, 23);
    ellipse(ctx, '#896a52', x, y, 42, 19);
    ellipse(ctx, '#765d4d', x + 5, y + 2, 30, 13);
    for (let i = 0; i < 7; i++) rect(ctx, '#b49a7b', x - 25 + i * 8, y + Math.sin(i * 3) * 10, 7, 1);
  }
  if (kind === 'goat') {
    for (const [x, y, r] of [
      [126, 54, 17],
      [147, 64, 12],
      [120, 71, 10],
    ]) {
      ellipse(ctx, '#7b8876', x!, y! + 3, r!, 8);
      ellipse(ctx, '#b7b7a1', x!, y!, r!, 8);
      ellipse(ctx, '#dbd5b9', x! - 3, y! - 3, r! - 4, 3);
    }
  }
  fence(ctx, 0, 13, p.w);
  // Taller farmhouses read at the same architectural scale as the town buildings.
  const sw = FARM_SHELTER_WIDTH[kind];
  const door = 16 + sw / 2 - 16;
  rect(ctx, '#614c38', 16, 12, sw, 48);
  rect(ctx, kind === 'cattle' ? '#bd7860' : '#e0c89e', 19, 20, sw - 6, 36);
  for (let x = 21; x < 14 + sw; x += 8) {
    rect(ctx, kind === 'cattle' ? '#945b48' : '#bca078', x, 22, 1, 33);
    rect(ctx, kind === 'cattle' ? '#d49475' : '#f0d9b0', x + 1, 22, 1, 32);
  }
  tiledRoof(ctx, { x: 12, y: -24, w: sw + 8, h: 43 }, roof);
  // Small gabled dormer, ridge cap and cream bargeboards.
  for (let row = 0; row < 15; row++) {
    rect(ctx, '#66513e', 16 + sw / 2 - row, -25 + row, row * 2 + 1, 1);
    if (row > 2) rect(ctx, '#f0dcad', 18 + sw / 2 - row, -25 + row, row * 2 - 3, 1);
  }
  rect(ctx, '#f0dcad', 16 + sw / 2 - 12, -10, 25, 17);
  rect(ctx, '#6c7960', 16 + sw / 2 - 6, -9, 13, 12);
  rect(ctx, '#d2dcc0', 16 + sw / 2 - 4, -7, 9, 8);
  rect(ctx, '#6c7960', 16 + sw / 2, -7, 1, 8);
  rect(ctx, '#6c7960', 16 + sw / 2 - 4, -3, 9, 1);
  rect(ctx, '#605443', door, 31, 32, 29);
  rect(ctx, '#473f35', door + 3, 34, 26, 23);
  rect(ctx, '#c7a574', door - 1, 56, 34, 4);
  rect(ctx, '#f0d49a', door + 3, 56, 26, 2);
  for (const x of [25, sw - 10]) {
    rect(ctx, '#6c7860', x, 31, 16, 17);
    rect(ctx, '#b7d5c3', x + 2, 33, 12, 13);
    rect(ctx, '#f3e4b9', x + 2, 33, 5, 6);
    rect(ctx, '#6c7860', x + 8, 33, 1, 13);
    rect(ctx, '#6c7860', x + 2, 39, 12, 1);
    rect(ctx, '#8b6647', x - 2, 49, 20, 5);
    for (let fx = x; fx < x + 17; fx += 4) {
      rect(ctx, '#6d954d', fx, 46, 4, 4);
      rect(ctx, '#eed397', fx + 1, 46, 2, 2);
    }
  }
  rect(ctx, '#7d6549', 18, 57, sw - 4, 3);
  // Hay rack, water trough and a little feed label belong to every working pen.
  rect(ctx, '#82765c', p.w - 72, 26, 52, 25);
  rect(ctx, '#cbb27b', p.w - 70, 28, 48, 20);
  for (let x = p.w - 68; x < p.w - 24; x += 5) {
    rect(ctx, '#efda98', x, 29, 3, 15);
    rect(ctx, '#9a7e4f', x + 1, 27, 1, 23);
  }
  rect(ctx, '#6b7c71', p.w - 59, 63, 39, 17);
  rect(ctx, '#b6beb0', p.w - 57, 64, 35, 12);
  rect(ctx, '#489fa9', p.w - 55, 66, 31, 7);
  rect(ctx, '#a8dcce', p.w - 52, 67, 21, 1);
  if (kind === 'poultry') {
    for (let x = 173; x < 231; x += 20) {
      ellipse(ctx, '#9c8053', x, 30, 10, 6);
      ellipse(ctx, '#e0c68e', x, 28, 9, 5);
      ellipse(ctx, '#fff0d1', x - 3, 27, 2, 3);
      ellipse(ctx, '#f5e2ba', x + 3, 28, 2, 3);
    }
  }
  // Slim rails, capped posts and visible gaps replace the previous solid border.
  fence(ctx, 0, p.h - 6, p.w / 2 - TILE);
  fence(ctx, p.w / 2 + TILE, p.h - 6, p.w / 2 - TILE);
  for (const x of [1, p.w - 7]) {
    rect(ctx, '#826348', x, 10, 5, p.h - 15);
    rect(ctx, '#d7bd91', x, 10, 2, p.h - 15);
    for (let y = 22; y < p.h - 8; y += 25) {
      rect(ctx, '#896c4c', x - 1, y, 7, 10);
      rect(ctx, '#ecd4aa', x - 1, y, 7, 2);
    }
  }
  for (const x of [p.w / 2 - TILE - 3, p.w / 2 + TILE]) {
    rect(ctx, '#75583e', x, p.h - 20, 6, 20);
    rect(ctx, '#cfaf80', x, p.h - 20, 3, 19);
    rect(ctx, '#f1d9b0', x - 1, p.h - 21, 8, 3);
  }
  // Small cream plaque, attached to the rear fence rather than floating UI.
  const label = { poultry: 'GIA CẦM', pig: 'HEO VƯỜN', goat: 'DÊ & CỪU', cattle: 'BÒ SỮA' }[kind];
  rect(ctx, '#786148', 16 + sw / 2 - 37, 17, 74, 13);
  rect(ctx, '#f0dfbb', 16 + sw / 2 - 35, 18, 70, 10);
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#565d46';
  ctx.fillText(label, 16 + sw / 2, 26);
  return c;
}

/**
 * Produce Crates Sprite (Tiệm Bác Sáu: ripe tomatoes, sweet corn, watermelons)
 */
export function paintProduceCrates(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 54;
  c.height = 36;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.22)', 2, 28, 50, 6);

  // Left Crate: Sweet Corn (Ngô ngọt)
  box('#79533b', 2, 14, 22, 16);
  box('#ac7950', 4, 16, 18, 12);
  for (let i = 0; i < 3; i++) {
    box('#527c4e', 6 + i * 5, 10, 4, 8); // green husks
    box('#ebce85', 7 + i * 5, 8, 3, 7); // yellow kernels
    box('#c8a25b', 7 + i * 5, 9, 2, 5);
  }
  // Front crate slats
  box('#8b6647', 2, 20, 22, 2);
  box('#8b6647', 2, 26, 22, 2);

  // Center/Right Crate: Red Tomatoes (Cà chua bi)
  box('#79533b', 26, 12, 24, 18);
  box('#ac7950', 28, 14, 20, 14);
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < 3; col++) {
      box('#bb6651', 30 + col * 6, 11 + r * 6, 5, 5);
      box('#d98568', 31 + col * 6, 10 + r * 6, 3, 3);
      box('#679657', 32 + col * 6, 9 + r * 6, 2, 2); // green calyx
    }
  }
  box('#8b6647', 26, 19, 24, 2);
  box('#8b6647', 26, 25, 24, 2);

  return c;
}

/**
 * Burlap Rice Sacks (Bao tải gạo Nàng Thơm)
 */
export function paintRiceSacks(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 44;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.22)', 2, 24, 40, 6);

  // Bottom sack
  box('#92754d', 2, 12, 24, 16);
  box('#d4b886', 4, 13, 20, 13);
  box('#fef08a', 8, 16, 12, 4); // rice label
  box('#bb6651', 11, 17, 6, 2); // red vintage stamp

  // Right sack
  box('#92754d', 18, 10, 24, 18);
  box('#d4b886', 20, 11, 20, 15);
  box('#785d39', 30, 8, 6, 4); // tied rope neck
  box('#e2c99a', 31, 6, 4, 3);

  // Top sack resting across
  box('#806540', 8, 2, 22, 13);
  box('#e2c99a', 10, 3, 18, 10);
  box('#785d39', 8, 4, 3, 5);

  return c;
}

/**
 * Leaning Farm Tools (Cuốc, cào tre, bình tưới nước)
 */
export function paintLeaningFarmTools(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 28;
  c.height = 42;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.2)', 2, 36, 24, 4);

  // Leaning hoe (Cây cuốc cán tre)
  box('#8b6647', 6, 2, 2, 34); // long handle
  box('#475569', 3, 2, 8, 3); // iron blade
  box('#64748b', 4, 1, 6, 2);

  // Bamboo rake (Cào lúa cán dài)
  box('#a9824b', 14, 4, 2, 34);
  box('#a16207', 10, 4, 10, 2);
  for (let px = 10; px <= 20; px += 3) box('#79533b', px, 2, 1, 3);

  // Galvanized watering can (Bình tưới thiếc)
  box('#64748b', 16, 22, 10, 14);
  box('#94a3b8', 17, 23, 8, 12);
  box('#475569', 19, 18, 6, 4); // handle
  box('#64748b', 12, 26, 5, 2); // spout
  box('#cbd5e1', 11, 25, 2, 4); // rose head

  return c;
}

/**
 * Stacked Golden Hay Bales (Kiện rơm khô buộc dây thừng)
 */
export function paintHayBales(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 36;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.22)', 2, 28, 44, 6);

  const drawBale = (bx: number, by: number) => {
    box('#89653e', bx, by, 22, 14);
    box('#a9824b', bx + 1, by + 1, 20, 12);
    box('#ebce85', bx + 2, by + 2, 18, 9);
    // Hemp twine strings
    box('#79533b', bx + 6, by + 1, 2, 12);
    box('#79533b', bx + 14, by + 1, 2, 12);
  };

  // Bottom two bales
  drawBale(2, 18);
  drawBale(24, 18);
  // Top bale
  drawBale(13, 6);

  return c;
}

/**
 * Floating Water Lilies with Lotus Bloom (Ao Thủy Sản)
 */
export function paintWaterLilies(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 36;
  c.height = 24;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Green Lily Pad 1
  box('#166534', 4, 8, 14, 10);
  box('#82b477', 5, 9, 12, 8);
  box('#527c4e', 11, 10, 2, 4); // notch

  // Green Lily Pad 2
  box('#166534', 18, 10, 16, 11);
  box('#82b477', 19, 11, 14, 9);

  // Blooming Pink Lotus Flower on top of Pad 1
  box('#c97f93', 8, 4, 6, 6);
  box('#dfa7b0', 9, 3, 4, 6);
  box('#ffffff', 10, 2, 2, 4);
  box('#ebce85', 10, 5, 2, 2); // yellow stamen center

  return c;
}

/**
 * Shoreline Cattails / Bulrushes (Lác lau ven ao)
 */
export function paintPondReeds(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 24;
  c.height = 36;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Green reed stems
  box('#527c4e', 4, 6, 2, 28);
  box('#679657', 11, 2, 2, 32);
  box('#527c4e', 18, 8, 2, 26);

  // Brown velvet cattail heads
  box('#79533b', 3, 8, 4, 10);
  box('#51483b', 4, 9, 2, 8);

  box('#79533b', 10, 4, 4, 12);
  box('#51483b', 11, 5, 2, 10);

  box('#79533b', 17, 10, 4, 9);
  box('#51483b', 18, 11, 2, 7);

  return c;
}

/**
 * Hand-Crafted Ancient Stone Well (Giếng Nước Cổ - Kích thước to đẹp, vững chãi)
 */
export function paintAncientWell(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 70;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Drop shadow
  box('rgba(0,0,0,0.28)', 6, 58, 52, 10);

  // Timber Canopy Gabled Roof
  box('#51483b', 4, 4, 56, 8);
  box('#79533b', 6, 6, 52, 10);
  box('#ac7950', 8, 8, 48, 8);
  box('#c89a65', 10, 8, 44, 4);
  for (let r = 8; r < 56; r += 6) box('#8b6647', r, 6, 2, 10);

  // Sturdy Upright Wooden Support Beams
  box('#51483b', 8, 16, 6, 34);
  box('#79533b', 10, 16, 3, 34);
  box('#51483b', 50, 16, 6, 34);
  box('#79533b', 51, 16, 3, 34);

  // Cross Axle & Winding Rope Spool
  box('#79533b', 14, 22, 36, 5);
  box('#a9824b', 26, 20, 12, 9); // thick hemp rope coil
  box('#c8a25b', 27, 21, 10, 7);
  box('#a9824b', 30, 29, 2, 14); // hanging rope

  // Hanging Oak Water Bucket
  box('#51483b', 26, 40, 12, 10);
  box('#89653e', 27, 41, 10, 8);
  box('#399eaf', 29, 43, 6, 3); // cool water glint

  // Heavy Masonry Stone Basin
  box('#7b806c', 6, 48, 52, 20);
  box('#969b83', 8, 50, 48, 17);
  box('#c7c4a6', 10, 51, 44, 15);

  // Stone brick pattern with mortar
  for (let y = 52; y <= 64; y += 4) {
    box('#696e5e', 10, y, 44, 1);
    for (let x = 12; x <= 50; x += 10) {
      box('#696e5e', x + (y % 8 === 0 ? 0 : 5), y, 1, 4);
    }
  }

  // Green moss lichen on aged stone
  box('#708753', 10, 56, 8, 5);
  box('#93a76c', 11, 57, 5, 3);
  box('#708753', 44, 60, 8, 4);

  // Dark reflective deep well water inside
  box('#696e5e', 14, 48, 36, 5);
  box('#399eaf', 18, 49, 28, 3);
  box('#8ed2d1', 22, 50, 16, 1);

  return c;
}

/**
 * Static Prop: Xe Máy Cày Nông Trại (Classic Red Farm Tractor)
 */
export function paintTractor(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 36;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.25)', 4, 30, 42, 6);

  // Large Rear Tread Tire (Bánh xe sau lớn)
  box('#0f172a', 4, 14, 16, 18);
  box('#334155', 6, 16, 12, 14);
  box('#a9824b', 9, 19, 6, 8); // yellow rim
  box('#ebce85', 10, 20, 4, 6);

  // Smaller Front Tire (Bánh xe trước nhỏ)
  box('#0f172a', 36, 22, 10, 11);
  box('#334155', 38, 23, 6, 9);
  box('#a9824b', 40, 25, 3, 5);

  // Chassis & Red Engine Hood (Thân xe đỏ)
  box('#7f1d1d', 16, 18, 26, 10);
  box('#a65746', 17, 16, 24, 10);
  box('#bb6651', 18, 15, 22, 8);
  box('#d98568', 20, 15, 18, 3); // hood highlight

  // Black Engine Front Grille
  box('#0f172a', 40, 18, 3, 8);
  box('#475569', 41, 19, 1, 6);

  // Vertical Exhaust Stack Pipe (Ống xả khói cao)
  box('#0f172a', 34, 4, 3, 12);
  box('#475569', 35, 4, 1, 12);
  box('#0f172a', 33, 3, 5, 2);

  // Driver Seat & Steering Wheel (Ghế ngồi & vô lăng)
  box('#1e293b', 12, 11, 7, 6); // padded seat
  box('#0f172a', 14, 9, 2, 7);
  box('#475569', 24, 10, 2, 7); // steering column
  box('#0f172a', 23, 8, 5, 2); // steering wheel

  return c;
}

/**
 * Static Prop: Kho Thóc / Vựa Ngô Gỗ (Rustic Slatted Granary / Corn Crib)
 */
export function paintGranary(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 52;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.25)', 4, 42, 44, 6);

  // Elevated Stone Footing Stems (Chân cột đá nâng sàn chống ẩm)
  box('#334155', 8, 36, 6, 8);
  box('#64748b', 9, 36, 4, 7);
  box('#334155', 38, 36, 6, 8);
  box('#64748b', 39, 36, 4, 7);

  // Main Slatted Wooden Barn Body (Thân kho gỗ nan)
  box('#51483b', 6, 16, 40, 22);
  box('#79533b', 8, 17, 36, 20);

  // Slat vents showing golden grain/corn inside
  for (let y = 20; y <= 33; y += 4) {
    box('#51483b', 10, y, 32, 2);
    // Golden corn cobs visible through slats
    for (let x = 12; x <= 38; x += 6) {
      box('#ebce85', x, y - 2, 4, 2);
      box('#c8a25b', x + 1, y - 2, 2, 2);
    }
  }

  // Timber Framework Beams
  box('#51483b', 6, 16, 3, 22);
  box('#51483b', 43, 16, 3, 22);
  box('#51483b', 24, 16, 3, 22);

  // Pitched Cedar Shingle Roof (Mái ngói gỗ dốc)
  box('#7f1d1d', 2, 6, 48, 11);
  box('#991b1b', 4, 8, 44, 8);
  box('#a65746', 6, 9, 40, 6);
  for (let r = 5; r <= 45; r += 6) box('#bb6651', r, 7, 2, 9);

  return c;
}

/**
 * Static Prop: Cuộn Rơm Tròn Lớn (Large Cylindrical Round Hay Roll)
 */
export function paintRoundHayRoll(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 36;
  c.height = 30;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Ground shadow
  box('rgba(0,0,0,0.22)', 3, 23, 30, 6);

  // Cylinder Hay Body
  box('#89653e', 4, 4, 28, 22);
  box('#a9824b', 5, 5, 26, 20);
  box('#c8a25b', 6, 6, 24, 18);
  box('#ebce85', 8, 7, 20, 16);

  // Concentric Radial Straw Spiral & Twine Bindings
  box('#89653e', 11, 7, 2, 16); // left twine wrap
  box('#89653e', 23, 7, 2, 16); // right twine wrap

  // Straw fiber texture flecks
  box('#a9824b', 14, 10, 6, 2);
  box('#fef08a', 15, 12, 5, 1);
  box('#a9824b', 16, 17, 5, 2);

  return c;
}

export function decorateFarm(scene: Phaser.Scene) {
  decorateFarmEstate(scene);
  // 1. Trees
  if (!scene.textures.exists('farm:tree')) {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 112;
    drawTree(c.getContext('2d')!, 48, 108, 2);
    scene.textures.addCanvas('farm:tree', c);
  }
  if (!scene.textures.exists('farm:orchard')) {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 112;
    const ctx = c.getContext('2d')!;
    drawTree(ctx, 48, 108, 2);
    for (const [x, y] of [
      [30, 43],
      [59, 32],
      [44, 24],
      [69, 58],
      [25, 64],
      [47, 72],
    ]) {
      ellipse(ctx, '#8f713e', x!, y! + 1, 5, 5);
      ellipse(ctx, '#dcaa5e', x!, y!, 4, 4);
      rect(ctx, '#f6d78c', x! - 2, y! - 2, 2, 2);
      rect(ctx, '#4f7946', x!, y! - 5, 3, 2);
    }
    scene.textures.addCanvas('farm:orchard', c);
  }
  if (!scene.textures.exists('farm:blossom')) {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 112;
    const ctx = c.getContext('2d')!;
    drawTree(ctx, 48, 108, 2, ['#796957', '#ba8c87', '#dda9a0', '#efc9b4', '#f5dcc1', '#b48380']);
    const rng = mulberry(812);
    for (let i = 0; i < 34; i++) {
      const x = 23 + rng() * 47,
        y = 24 + rng() * 48;
      rect(ctx, i % 2 ? '#f8dfc5' : '#f0c1b6', x, y, 3, 2);
      rect(ctx, '#b98078', x + 1, y + 1, 1, 1);
    }
    scene.textures.addCanvas('farm:blossom', c);
  }
  const trees = FARM_GARDEN.trees.map(([x, y], i) =>
    scene.add
      .sprite(
        x * TILE,
        y * TILE,
        i % 9 === 4 ? 'farm:blossom' : i >= 9 && y <= 3 ? 'farm:orchard' : 'farm:tree',
      )
      .setOrigin(0.5, 1)
      .setDepth(y * TILE),
  );

  // 2. Bench
  if (!scene.textures.exists('farm:bench')) scene.textures.addCanvas('farm:bench', paintProp('bench'));
  const b = FARM_GARDEN.bench;
  scene.add
    .image(b.x + b.w / 2, b.y + b.h, 'farm:bench')
    .setOrigin(0.5, 1)
    .setDisplaySize(b.w, b.h + 16)
    .setDepth(b.y + b.h);

  // 3. Ancient Stone Well (To Lớn, Bề Thế)
  if (!scene.textures.exists('farm:ancient_well')) {
    scene.textures.addCanvas('farm:ancient_well', paintAncientWell());
  }
  const well = FARM_GARDEN.well;
  scene.add
    .image(well.x + 16, well.y + 28, 'farm:ancient_well')
    .setOrigin(0.5, 1)
    .setDisplaySize(64, 70)
    .setDepth(well.y + well.h + 10);

  // 4. Produce Crates & Burlap Sacks at Tiệm Bác Sáu
  if (!scene.textures.exists('farm:produce_crates')) {
    scene.textures.addCanvas('farm:produce_crates', paintProduceCrates());
  }
  if (!scene.textures.exists('farm:rice_sacks')) {
    scene.textures.addCanvas('farm:rice_sacks', paintRiceSacks());
  }
  if (!scene.textures.exists('farm:farm_tools')) {
    scene.textures.addCanvas('farm:farm_tools', paintLeaningFarmTools());
  }
  const shopP = FARM_POIS.shop_bac_sau;
  scene.add
    .image(shopP.x - 14, shopP.y + shopP.h, 'farm:produce_crates')
    .setOrigin(0.5, 1)
    .setDepth(shopP.y + shopP.h);
  scene.add
    .image(shopP.x + shopP.w + 14, shopP.y + shopP.h, 'farm:rice_sacks')
    .setOrigin(0.5, 1)
    .setDepth(shopP.y + shopP.h);
  scene.add
    .image(shopP.x + 6, shopP.y + shopP.h, 'farm:farm_tools')
    .setOrigin(0.5, 1)
    .setDepth(shopP.y + shopP.h + 1);

  // 5. Static Props: Xe Máy Cày, Kho Thóc, Kiện Rơm & Cuộn Rơm Tròn
  if (!scene.textures.exists('farm:tractor')) {
    scene.textures.addCanvas('farm:tractor', paintTractor());
  }
  if (!scene.textures.exists('farm:granary')) {
    scene.textures.addCanvas('farm:granary', paintGranary());
  }
  if (!scene.textures.exists('farm:round_hay')) {
    scene.textures.addCanvas('farm:round_hay', paintRoundHayRoll());
  }
  if (!scene.textures.exists('farm:hay_bales')) {
    scene.textures.addCanvas('farm:hay_bales', paintHayBales());
  }

  const siloP = FARM_POIS.silo_warehouse;
  // Xe máy cày đậu tại sân kho Silo
  scene.add
    .image(
      FARM_GARDEN.tractor.x + FARM_GARDEN.tractor.w / 2,
      FARM_GARDEN.tractor.y + FARM_GARDEN.tractor.h,
      'farm:tractor',
    )
    .setOrigin(0.5, 1)
    .setScale(2)
    .setDepth(FARM_GARDEN.tractor.y + FARM_GARDEN.tractor.h);

  // Kho thóc phụ bên cạnh Silo
  scene.add
    .image(siloP.x - 48, siloP.y + siloP.h - 6, 'farm:granary')
    .setOrigin(0.5, 1)
    .setDepth(siloP.y + siloP.h);

  // Cuộn rơm tròn rải rác tạo điểm nhấn đồng quê
  const cattleP = FARM_POIS.cattle_pasture;
  scene.add
    .image(cattleP.x + cattleP.w + 28, cattleP.y + 24, 'farm:round_hay')
    .setOrigin(0.5, 1)
    .setDepth(cattleP.y + 25);
  scene.add
    .image(10 * TILE, 26 * TILE, 'farm:round_hay')
    .setOrigin(0.5, 1)
    .setDepth(26 * TILE);

  // Kiện rơm vuông xếp chồng
  scene.add
    .image(siloP.x - 18, siloP.y + siloP.h, 'farm:hay_bales')
    .setOrigin(0.5, 1)
    .setDepth(siloP.y + siloP.h);
  scene.add
    .image(siloP.x + siloP.w + 16, siloP.y + siloP.h, 'farm:hay_bales')
    .setOrigin(0.5, 1)
    .setDepth(siloP.y + siloP.h);

  // 6. Water Lilies and Reeds in Aquaculture Pond (Ao Thủy Sản Dời Lên Trên)
  if (!scene.textures.exists('farm:water_lilies')) {
    scene.textures.addCanvas('farm:water_lilies', paintWaterLilies());
  }
  if (!scene.textures.exists('farm:pond_reeds')) {
    scene.textures.addCanvas('farm:pond_reeds', paintPondReeds());
  }
  const pond = FARM_POIS.aquaculture_pond;
  // Floating lilies stay inside the shoreline at its authoritative position.
  scene.add
    .image(pond.x + 95, pond.y + 76, 'farm:water_lilies')
    .setOrigin(0.5)
    .setDepth(-5);
  scene.add
    .image(pond.x + 205, pond.y + 175, 'farm:water_lilies')
    .setOrigin(0.5)
    .setDepth(-5);
  scene.add
    .image(pond.x + 315, pond.y + 80, 'farm:water_lilies')
    .setOrigin(0.5)
    .setDepth(-5);
  // Shoreline reeds
  scene.add
    .image(pond.x + 51, pond.y + 57, 'farm:pond_reeds')
    .setOrigin(0.5, 1)
    .setDepth(pond.y + 58);
  scene.add
    .image(pond.x + 22, pond.y + 175, 'farm:pond_reeds')
    .setOrigin(0.5, 1)
    .setDepth(pond.y + 176);
  scene.add
    .image(pond.x + 385, pond.y + 185, 'farm:pond_reeds')
    .setOrigin(0.5, 1)
    .setDepth(pond.y + 186);

  return trees;
}
