import {
  MAP_HEIGHT,
  MAP_WIDTH,
  PATHS,
  PIER,
  PLAZA,
  TILE,
  TOWN_FENCES,
  WATER,
  pointInRect,
  type Building,
  type Rect,
} from '@cozy/game-data';
import { hex, mulberry, shade } from './pixel';

export const BUILDING_ROOF = 30;
const C = {
  grass: '#92b879',
  grassLight: '#a2c58a',
  grassDark: '#7da266',
  ink: '#3d4b3c',
  stone: '#e6d8b7',
  mortar: '#c5b38e',
  wood: '#79533b',
  water: '#589fa5',
  waterDark: '#397f8b',
};

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Raster scanlines keep organic shapes on the same pixel grid as roofs and avatars. */
function oval(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number) {
  for (let dy = -Math.floor(ry); dy <= ry; dy++) {
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    rect(ctx, color, x - dx, y + dy, dx * 2 + 1, 1);
  }
}

function flowers(ctx: CanvasRenderingContext2D, area: Rect, seed: number) {
  const rng = mulberry(seed);
  rect(ctx, '#728e5c', area.x - 3, area.y - 3, area.w + 6, area.h + 6);
  rect(ctx, '#b5bb86', area.x - 2, area.y - 2, area.w + 4, area.h + 4);
  rect(ctx, '#678851', area.x, area.y, area.w, area.h);
  for (let y = area.y + 4; y < area.y + area.h - 2; y += 8) {
    for (let x = area.x + 4; x < area.x + area.w - 2; x += 9) {
      rect(ctx, '#a2bc79', x - 2, y + 2, 5, 3);
      const color = ['#f4deb2', '#dd9b99', '#e8bd6c', '#b4a4c9'][Math.floor(rng() * 4)]!;
      rect(ctx, color, x - 2, y, 5, 2);
      rect(ctx, color, x, y - 2, 2, 5);
      rect(ctx, '#f9efcd', x, y, 1, 1);
    }
  }
}

export function paintTown(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const rng = mulberry(42);
  rect(ctx, C.grass, 0, 0, MAP_WIDTH, MAP_HEIGHT);
  // Broad tonal patches, with sparse tufts: ground stays quieter than landmarks.
  for (let i = 0; i < 100; i++) {
    oval(
      ctx,
      i % 2 ? '#96bc7c' : '#8bb173',
      rng() * MAP_WIDTH,
      rng() * MAP_HEIGHT,
      28 + rng() * 55,
      14 + rng() * 30,
    );
  }
  for (let i = 0; i < 6400; i++) {
    const x = Math.floor(rng() * MAP_WIDTH),
      y = Math.floor(rng() * MAP_HEIGHT);
    rect(ctx, rng() > 0.5 ? C.grassLight : C.grassDark, x, y, 1, 2);
    if (i % 4 === 0) rect(ctx, C.grassLight, x + 2, y + 1, 1, 2);
  }

  const paved = [...PATHS, PLAZA];
  const onPath = (x: number, y: number) => paved.some((r) => pointInRect(x, y, r));
  // Paint the union once, so intersections have no artificial seams or kerbs.
  for (let y = TILE; y < MAP_HEIGHT - TILE; y += 8) {
    for (let x = TILE; x < MAP_WIDTH - TILE; x += 8) {
      if (!onPath(x + 4, y + 4)) continue;
      rect(ctx, C.mortar, x, y, 8, 8);
      rect(ctx, rng() > 0.4 ? C.stone : '#ded0ae', x + 1, y + 1, 7, 7);
      rect(ctx, '#f0e5cb', x + 1, y + 1, 6, 1);
      if (!onPath(x - 4, y + 4)) rect(ctx, '#a79872', x, y, 2, 8);
      if (!onPath(x + 12, y + 4)) rect(ctx, '#a79872', x + 6, y, 2, 8);
      if (!onPath(x + 4, y - 4)) rect(ctx, '#f2e8ce', x, y, 8, 2);
      if (!onPath(x + 4, y + 12)) rect(ctx, '#a79872', x, y + 6, 8, 2);
    }
  }

  // Limestone square, with an understated terracotta inlay around the fountain.
  ctx.save();
  ctx.beginPath();
  ctx.rect(PLAZA.x, PLAZA.y, PLAZA.w, PLAZA.h);
  ctx.clip();
  for (let y = PLAZA.y; y < PLAZA.y + PLAZA.h; y += 16) {
    for (let x = PLAZA.x; x < PLAZA.x + PLAZA.w; x += 32) {
      const offset = ((y - PLAZA.y) / 16) % 2 ? 16 : 0;
      rect(ctx, '#c7b99a', x - offset, y, 32, 16);
      rect(ctx, '#eee3ca', x - offset + 1, y + 1, 30, 14);
      rect(ctx, '#f7eedb', x - offset + 2, y + 2, 28, 1);
    }
  }
  oval(ctx, '#c39a77', 24 * TILE, 16 * TILE, 82, 66);
  oval(ctx, '#f2e5c9', 24 * TILE, 16 * TILE, 77, 61);
  oval(ctx, '#d1bea0', 24 * TILE, 16 * TILE, 59, 45);
  oval(ctx, '#e9dbbd', 24 * TILE, 16 * TILE, 56, 42);
  for (const [dx, dy] of [
    [0, -54],
    [0, 54],
    [-70, 0],
    [70, 0],
  ]) {
    rect(ctx, '#b78666', 24 * TILE + dx! - 3, 16 * TILE + dy! - 3, 6, 6);
  }
  ctx.restore();

  flowers(ctx, { x: 17 * TILE + 8, y: 14 * TILE, w: 18, h: 54 }, 2);
  flowers(ctx, { x: 30 * TILE - 26, y: 14 * TILE, w: 18, h: 54 }, 3);
  flowers(ctx, { x: 18 * TILE, y: 20 * TILE + 12, w: 92, h: 20 }, 4);
  flowers(ctx, { x: 26 * TILE, y: 20 * TILE + 12, w: 92, h: 20 }, 5);
  flowers(ctx, { x: 39 * TILE, y: 12 * TILE + 12, w: 126, h: 24 }, 6);
  flowers(ctx, { x: 4 * TILE, y: 23 * TILE, w: 94, h: 24 }, 7);

  // Café terrace and residential garden read as distinct little destinations.
  rect(ctx, '#b7ad89', 4 * TILE, 8 * TILE, 7 * TILE, 2 * TILE);
  for (let y = 8 * TILE; y < 10 * TILE; y += 8) {
    rect(ctx, '#d3c39e', 4 * TILE + 1, y + 1, 7 * TILE - 2, 6);
  }
  // Short fence segments frame lawns, leaving all paths open.
  for (const fence of TOWN_FENCES) {
    for (let i = 0; i < fence.segments; i++) {
      const x = fence.x * TILE + i * 16,
        y = fence.y * TILE;
      rect(ctx, '#775e43', x, y - 8, 4, 14);
      rect(ctx, '#c6ae7b', x, y - 8, 3, 12);
      if (i < fence.segments - 1) {
        rect(ctx, '#b89c70', x + 4, y - 5, 12, 3);
        rect(ctx, '#9d805b', x + 4, y + 1, 12, 3);
      }
    }
  }

  for (const w of WATER) {
    rect(ctx, '#c7bc8b', w.x - 5, w.y - 5, w.w + 5, w.h + 5);
    rect(ctx, C.waterDark, w.x, w.y, w.w, w.h);
    rect(ctx, C.water, w.x + 4, w.y + 5, w.w - 4, w.h - 5);
    rect(ctx, '#7cb8b2', w.x + 4, w.y + 5, w.w - 4, 4);
    rect(ctx, '#7cb8b2', w.x + 4, w.y + 5, 4, w.h - 5);
    for (let i = 0; i < 210; i++) {
      const x = w.x + 12 + rng() * (w.w - 24),
        y = w.y + 12 + rng() * (w.h - 24);
      rect(ctx, i % 3 ? '#70adb2' : '#468f98', x, y, 4 + rng() * 12, 1);
    }
    for (const [dx, dy] of [
      [22, 40],
      [42, 128],
      [300, 66],
      [340, 246],
      [86, 278],
    ]) {
      const x = w.x + dx!,
        y = w.y + dy!;
      oval(ctx, '#447e59', x, y, 7, 4);
      oval(ctx, '#75a16a', x - 1, y - 1, 5, 3);
      rect(ctx, C.water, x + 1, y, 6, 1);
      rect(ctx, '#e4b0b0', x - 2, y - 3, 3, 3);
      rect(ctx, '#f8ddce', x - 1, y - 3, 1, 1);
    }
    // Reeds stay entirely inside blocked water.
    for (let i = 0; i < 12; i++) {
      const x = w.x + 12 + i * 30;
      if (x > PIER.x - 8 && x < PIER.x + PIER.w + 8) continue;
      rect(ctx, '#52734d', x, w.y + 10, 2, 12);
      rect(ctx, '#7e9259', x + 3, w.y + 14, 2, 9);
      rect(ctx, '#9c7950', x, w.y + 9, 2, 5);
    }
  }
  rect(ctx, '#3c7280', PIER.x - 3, PIER.y + 4, PIER.w + 6, PIER.h);
  rect(ctx, '#71523a', PIER.x, PIER.y, PIER.w, PIER.h);
  for (let y = PIER.y; y < PIER.y + PIER.h; y += 8) {
    rect(ctx, '#b39062', PIER.x + 1, y, PIER.w - 2, 6);
    rect(ctx, '#d2b27d', PIER.x + 1, y, PIER.w - 2, 1);
    rect(ctx, '#866344', PIER.x + 18, y + 3, 12, 1);
    rect(ctx, '#584638', PIER.x + 4, y + 3, 2, 2);
    rect(ctx, '#584638', PIER.x + PIER.w - 6, y + 3, 2, 2);
  }
  for (const y of [PIER.y + 12, PIER.y + PIER.h - 16]) {
    for (const x of [PIER.x - 3, PIER.x + PIER.w - 2]) {
      rect(ctx, '#6b513e', x, y, 5, 12);
      rect(ctx, '#e1c79a', x, y + 2, 5, 3);
    }
  }

  // A varied woodland edge replaces the repeated circular canopy pattern.
  for (let x = 16; x < MAP_WIDTH; x += 28) {
    drawTree(ctx, x, 30, 0.9 + (x % 3) * 0.06);
    if (x < WATER[0]!.x) drawTree(ctx, x, MAP_HEIGHT - 3, 1);
  }
  for (let y = 60; y < MAP_HEIGHT - 20; y += 32) {
    drawTree(ctx, 16, y, 1);
    if (y < WATER[0]!.y) drawTree(ctx, MAP_WIDTH - 15, y, 1);
  }
  return canvas;
}

export function drawTree(ctx: CanvasRenderingContext2D, cx: number, by: number, s = 1) {
  const rng = mulberry(Math.floor(cx + by * 7));
  oval(ctx, 'rgba(48,64,43,0.2)', cx + 2, by - 1, 18 * s, 5 * s);
  rect(ctx, '#694c38', cx - 4 * s, by - 18 * s, 8 * s, 18 * s);
  rect(ctx, '#a18054', cx - 3 * s, by - 16 * s, 3 * s, 14 * s);
  rect(ctx, '#5b4432', cx - 6 * s, by - 2 * s, 12 * s, 3 * s);
  const clusters = [
    [-9, -24, 12, 11],
    [9, -24, 12, 11],
    [-6, -34, 13, 12],
    [7, -34, 12, 11],
    [0, -42, 11, 10],
  ];
  for (const [dx, dy, rx, ry] of clusters) {
    const x = cx + dx! * s,
      y = by + dy! * s;
    oval(ctx, '#35583f', x, y, rx! * s + 1, ry! * s + 1);
    oval(ctx, '#50764b', x, y - 1, rx! * s, ry! * s - 1);
    oval(ctx, '#739557', x - 2 * s, y - 3 * s, rx! * s * 0.78, ry! * s * 0.65);
    oval(ctx, '#9ab775', x - 3 * s, y - 5 * s, rx! * s * 0.5, ry! * s * 0.35);
    for (let i = 0; i < 7; i++) {
      rect(
        ctx,
        i % 2 ? '#a7c180' : '#557e4b',
        x - 7 * s + rng() * 14 * s,
        y - 6 * s + rng() * 10 * s,
        2 * s,
        s,
      );
    }
  }
}

const SIGNS: Record<string, string> = {
  cafe: 'BEAN THERE',
  fashion: 'THREADBARE',
  furniture: 'SOFA SO GOOD',
  apartments: 'CHUNG CƯ',
  delivery: 'BƯU TRẠM',
  fishing_shop: 'NGƯ CỤ BÁC BA',
  vietprodev: 'VIETPRODEV',
};

export function paintBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8;
  canvas.height = b.rect.h + BUILDING_ROOF;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const w = b.rect.w,
    bottom = canvas.height - 2;
  const facadeH = b.id === 'apartments' ? 106 : 76;
  const eave = bottom - facadeH;
  const wall = hex(b.wall),
    roof = hex(b.roof),
    accent = hex(b.accent);
  const doorX = 4 + b.door.x * TILE - b.rect.x,
    doorW = b.door.w * TILE;
  rect(ctx, 'rgba(54,48,36,0.22)', 6, bottom - 8, w, 10);
  rect(ctx, '#514b3b', 3, eave, w + 2, facadeH);
  rect(ctx, wall, 4, eave + 1, w, facadeH - 1);
  rect(ctx, shade(wall, -0.1), w - 10, eave + 1, 14, facadeH - 1);
  for (let y = eave + 5; y < bottom - 8; y += 9) {
    rect(ctx, shade(wall, -0.06), 5, y, w - 2, 1);
  }
  rect(ctx, '#99917a', 4, bottom - 8, w, 8);
  for (let x = 5; x < w; x += 12) rect(ctx, '#c1b69a', x, bottom - 7, 10, 4);
  rect(ctx, accent, 4, eave + 1, 4, facadeH - 8);
  rect(ctx, accent, w, eave + 1, 4, facadeH - 8);

  // A tall tiled roof reads from above; the compact façade reads from the front.
  rect(ctx, '#51483b', 0, 8, w + 8, eave - 5);
  rect(ctx, roof, 1, 9, w + 6, eave - 10);
  for (let y = 12; y < eave - 1; y += 8) {
    const offset = ((y - 12) / 8) % 2 ? 8 : 0;
    rect(ctx, shade(roof, -0.19), 1, y + 6, w + 6, 2);
    rect(ctx, shade(roof, 0.2), 2, y, w + 4, 1);
    for (let x = 2 + offset; x < w + 5; x += 16) {
      rect(ctx, shade(roof, -0.24), x, y + 1, 1, 5);
      rect(ctx, shade(roof, 0.1), x + 2, y + 5, Math.min(10, w + 5 - x), 1);
    }
  }
  rect(ctx, shade(roof, 0.3), 1, 8, w + 6, 3);
  rect(ctx, shade(roof, -0.35), 0, eave - 1, w + 8, 5);
  rect(ctx, '#bca184', 3, eave + 4, w + 2, 2);

  // Dormer, with a stepped gable silhouette rather than another flat rectangle.
  const dormerX = Math.floor(w / 2) - 17,
    dormerY = Math.max(18, eave - 47);
  for (let row = 0; row < 17; row++) {
    rect(ctx, '#51483b', dormerX + 17 - row, dormerY + row, row * 2 + 2, 1);
    if (row > 2) rect(ctx, shade(roof, 0.18), dormerX + 19 - row, dormerY + row, row * 2 - 2, 1);
  }
  rect(ctx, shade(wall, -0.08), dormerX + 3, dormerY + 17, 29, 22);
  rect(ctx, accent, dormerX + 10, dormerY + 19, 16, 17);
  rect(ctx, '#d5e7dc', dormerX + 12, dormerY + 21, 12, 12);
  rect(ctx, '#fbefd0', dormerX + 12, dormerY + 21, 5, 5);
  rect(ctx, accent, dormerX + 17, dormerY + 21, 2, 13);
  rect(ctx, accent, dormerX + 12, dormerY + 26, 12, 2);
  rect(ctx, shade(roof, -0.3), dormerX, dormerY + 38, 35, 3);

  const chimX = w - 15;
  rect(ctx, '#655346', chimX - 1, 0, 13, 22);
  rect(ctx, '#b67d62', chimX, 2, 11, 18);
  for (let y = 5; y < 20; y += 5) rect(ctx, '#d6a185', chimX + (y % 2 ? 1 : 5), y, 5, 2);
  rect(ctx, '#e0ccb0', chimX - 2, 0, 15, 4);

  const window = (x: number, y: number) => {
    rect(ctx, accent, x - 2, y - 2, 26, 25);
    rect(ctx, '#a1beb3', x, y, 22, 20);
    rect(ctx, '#ecdfb2', x + 1, y + 1, 9, 8);
    rect(ctx, '#d4e1cf', x + 12, y + 1, 9, 8);
    rect(ctx, accent, x + 10, y, 2, 20);
    rect(ctx, accent, x, y + 9, 22, 2);
    rect(ctx, shade(accent, 0.2), x - 6, y - 1, 3, 23);
    rect(ctx, shade(accent, 0.2), x + 25, y - 1, 3, 23);
    rect(ctx, '#8b6647', x - 3, y + 23, 28, 5);
    for (let i = 0; i < 5; i++) {
      rect(ctx, '#678153', x + i * 5, y + 21, 4, 3);
      rect(ctx, i % 2 ? '#e6b39b' : '#f4deac', x + i * 5 + 1, y + 20, 2, 2);
    }
  };
  for (let x = 18; x < w - 26; x += 42) {
    if (x + 26 > doorX && x < doorX + doorW) continue;
    window(x, bottom - 43);
  }
  if (b.id === 'apartments') {
    for (let x = 18; x < w - 26; x += 42) window(x, eave + 13);
    rect(ctx, '#7d7183', 8, eave + 49, w - 8, 4);
  }
  const dy = bottom - 42;
  rect(ctx, '#4a4336', doorX + 10, dy - 2, doorW - 20, 42);
  rect(ctx, shade(accent, 0.16), doorX + 12, dy, doorW - 24, 40);
  rect(ctx, '#d5e2cd', doorX + 16, dy + 4, doorW - 32, 12);
  rect(ctx, accent, doorX + doorW / 2 - 1, dy + 4, 2, 12);
  rect(ctx, '#dab87a', doorX + doorW - 20, dy + 24, 3, 3);
  rect(ctx, '#cfc1a3', doorX + 7, bottom - 3, doorW - 14, 3);

  // Different silhouettes and awning treatments make each business recognizable.
  const awning =
    b.id === 'cafe'
      ? '#a8664b'
      : b.id === 'fashion'
        ? '#a17f9a'
        : b.id === 'delivery'
          ? '#ba9454'
          : b.id === 'vietprodev'
            ? '#0284c7'
            : '#648578';
  if (b.id !== 'apartments') {
    const aw = Math.min(w - 20, doorW + 36),
      ax = doorX + doorW / 2 - aw / 2;
    rect(ctx, '#635441', ax - 1, dy - 12, aw + 2, 13);
    for (let x = 0; x < aw; x += 9) {
      rect(ctx, (x / 9) % 2 ? '#f0dfbd' : awning, ax + x, dy - 11, Math.min(9, aw - x), 12);
    }
    rect(ctx, shade(awning, -0.2), ax, dy + 1, aw, 2);
  }
  const sign = SIGNS[b.id] ?? b.label;
  const sw = Math.min(w - 20, sign.length * 7 + 20),
    sx = 4 + (w - sw) / 2,
    sy = eave + 5;
  if (b.id === 'vietprodev') {
    rect(ctx, '#0f172a', sx - 2, sy - 2, sw + 4, 20);
    rect(ctx, '#1e293b', sx - 1, sy - 1, sw + 2, 18);
    rect(ctx, '#0f172a', sx, sy, sw, 16);
    ctx.font = '800 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(sign, sx + sw / 2, sy + 8);
  } else {
    rect(ctx, '#6e5842', sx - 1, sy - 1, sw + 2, 18);
    rect(ctx, '#f2e5c5', sx, sy, sw, 16);
    ctx.font = '700 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4d5140';
    ctx.fillText(sign, sx + sw / 2, sy + 8);
  }
  rect(ctx, '#4c5142', doorX + 2, dy + 7, 4, 9);
  rect(ctx, '#edcb87', doorX + 3, dy + 8, 2, 6);
  if (b.id === 'delivery') {
    rect(ctx, '#667b76', 15, bottom - 22, 18, 15);
    rect(ctx, '#d7c49b', 17, bottom - 20, 14, 3);
    rect(ctx, '#435953', 20, bottom - 17, 8, 2);
  }
  if (b.id === 'vietprodev') {
    // Tech building LED indicator box & mini terminal
    rect(ctx, '#0f172a', 14, bottom - 34, 20, 26);
    rect(ctx, '#1e293b', 15, bottom - 33, 18, 24);
    rect(ctx, '#0369a1', 17, bottom - 31, 14, 10);
    rect(ctx, '#38bdf8', 18, bottom - 29, 6, 2);
    rect(ctx, '#38bdf8', 18, bottom - 25, 10, 2);
    rect(ctx, '#22c55e', 17, bottom - 16, 3, 3);
    rect(ctx, '#0ea5e9', 22, bottom - 16, 3, 3);
    rect(ctx, '#f59e0b', 27, bottom - 16, 3, 3);
  }
  if (b.id === 'fishing_shop') {
    oval(ctx, '#eee1bb', 17, bottom - 33, 8, 8);
    oval(ctx, '#b86d59', 17, bottom - 33, 6, 6);
    oval(ctx, wall, 17, bottom - 33, 3, 3);
    rect(ctx, '#eee1bb', 16, bottom - 41, 2, 5);
    rect(ctx, '#eee1bb', 16, bottom - 29, 2, 5);
    for (let i = 0; i < 2; i++) rect(ctx, '#8b6647', w - 16 + i * 5, bottom - 38, 2, 32);
  }
  return canvas;
}
