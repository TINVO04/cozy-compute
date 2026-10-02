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
  grass: '#85b876',
  grassLight: '#a2c58a',
  grassDark: '#7da266',
  ink: '#3d4b3c',
  stone: '#d6d6cd',
  mortar: '#b9bcb1',
  wood: '#79533b',
  water: '#4bc0d2',
  waterDark: '#369fb5',
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

  // Continuous concrete sidewalks serve entrances. Asphalt is a separate
  // connected street surface; only the central square has stone tile joints.
  for (const path of PATHS) rect(ctx, '#d8d8cf', path.x, path.y, path.w, path.h);
  const streets = [
    { x: 32, y: 332, w: 1472, h: 40 },
    { x: 332, y: 320, w: 40, h: 576 },
    { x: 1036, y: 320, w: 72, h: 576 },
    { x: 96, y: 844, w: 1024, h: 40 },
  ];
  const onStreet = (x: number, y: number) => streets.some((r) => pointInRect(x, y, r));
  for (let y = 320; y < 896; y += 2) {
    for (let x = 32; x < 1504; x += 2) {
      if (!onStreet(x, y)) continue;
      rect(ctx, '#999e9b', x, y, 2, 2);
      if (!onStreet(x - 2, y) || !onStreet(x + 2, y) || !onStreet(x, y - 2) || !onStreet(x, y + 2))
        rect(ctx, '#7c8580', x, y, 2, 2);
    }
  }
  for (let i = 0; i < 3600; i++) {
    const x = 32 + Math.floor(rng() * 1472),
      y = 320 + Math.floor(rng() * 576);
    if (onStreet(x, y)) rect(ctx, i % 2 ? '#a5aaa5' : '#8f9691', x, y, 1, 1);
  }
  // Sparse sidewalk expansion seams, without repeating brick grids.
  for (const path of PATHS) {
    if (path.w > path.h) {
      for (let x = path.x + 48; x < path.x + path.w; x += 64) {
        for (let y = path.y; y < path.y + path.h; y++) if (!onStreet(x, y)) rect(ctx, '#c4c8bc', x, y, 1, 1);
      }
    } else {
      for (let y = path.y + 48; y < path.y + path.h; y += 64) {
        for (let x = path.x; x < path.x + path.w; x++) if (!onStreet(x, y)) rect(ctx, '#c4c8bc', x, y, 1, 1);
      }
    }
  }
  // Modest crossing stripes where the main street meets the plaza promenade.
  for (const x of [618, 810]) for (let y = 337; y < 369; y += 7) rect(ctx, '#e3e3d7', x, y, 20, 3);

  // DNTU front courtyard paving with authentic stone grid tiles and central driveway
  rect(ctx, '#ded7b2', 21 * TILE, 8 * TILE, 11 * TILE, 2 * TILE + 8);
  for (let y = 8 * TILE; y <= 10 * TILE + 8; y += 8) {
    rect(ctx, '#c8be98', 21 * TILE, y, 11 * TILE, 1);
  }
  for (let x = 21 * TILE; x <= 32 * TILE; x += 8) {
    rect(ctx, '#c8be98', x, 8 * TILE, 1, 2 * TILE + 8);
  }
  // Central driveway connecting the main street directly to DNTU grand entrance
  rect(ctx, '#7c8580', 25 * TILE - 2, 8 * TILE, 3 * TILE + 4, 2 * TILE + 12);
  rect(ctx, '#999e9b', 25 * TILE, 8 * TILE, 3 * TILE, 2 * TILE + 12);
  for (let i = 0; i < 60; i++) {
    const sx = 25 * TILE + Math.floor(rng() * (3 * TILE));
    const sy = 8 * TILE + Math.floor(rng() * (2 * TILE + 12));
    rect(ctx, i % 2 ? '#a5aaa5' : '#8f9691', sx, sy, 1, 1);
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
  // Small eastern temple garden and its stone approach. Walls and gate are
  // independent depth-sorted objects rendered by the town component builder.
  rect(ctx, '#c4bea4', 1312, 400, 182, 182);
  rect(ctx, '#92b77b', 1316, 404, 174, 174);
  rect(ctx, '#d9ceb1', 1378, 510, 38, 72);
  for (let y = 514; y < 580; y += 12) rect(ctx, '#b8af93', 1378, y, 38, 1);

  flowers(ctx, { x: 17 * TILE + 8, y: 14 * TILE, w: 18, h: 54 }, 2);
  flowers(ctx, { x: 30 * TILE - 26, y: 14 * TILE, w: 18, h: 54 }, 3);
  flowers(ctx, { x: 18 * TILE, y: 20 * TILE + 12, w: 92, h: 20 }, 4);
  flowers(ctx, { x: 26 * TILE, y: 20 * TILE + 12, w: 92, h: 20 }, 5);
  flowers(ctx, { x: 39 * TILE, y: 12 * TILE + 12, w: 126, h: 24 }, 6);
  flowers(ctx, { x: 4 * TILE, y: 23 * TILE, w: 94, h: 24 }, 7);
  flowers(ctx, { x: 25 * TILE + 2, y: 23 * TILE, w: 56, h: 13 }, 8);
  // Southern lanes, small fenced gardens and individual hedges connect the houses.
  for (let i = 0; i < 7; i++) {
    const x = (3 + i * 3.4) * TILE;
    rect(ctx, '#c0bba3', x + 38, 28 * TILE, 18, 30);
    for (let y = 28 * TILE; y < 28 * TILE + 30; y += 6) rect(ctx, '#e1dbc1', x + 39, y + 1, 16, 4);
    for (let j = 0; j < 4; j++) {
      oval(ctx, '#376c36', x + 5 + j * 6, 28 * TILE + 10, 5, 5);
      oval(ctx, '#78a85a', x + 4 + j * 6, 28 * TILE + 8, 4, 3);
    }
  }
  // A planted stone plinth beneath the little temple in the southwestern garden.
  rect(ctx, '#998d70', 17.5 * TILE - 10, 24.5 * TILE - 14, 4 * TILE + 20, 36);
  rect(ctx, '#d8ceb0', 17.5 * TILE - 8, 24.5 * TILE - 12, 4 * TILE + 16, 32);

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
    rect(ctx, '#76d7e5', w.x + 4, w.y + 5, w.w - 4, 4);
    rect(ctx, '#76d7e5', w.x + 4, w.y + 5, 4, w.h - 5);
    for (let i = 0; i < 210; i++) {
      const x = w.x + 12 + rng() * (w.w - 24),
        y = w.y + 12 + rng() * (w.h - 24);
      rect(ctx, i % 3 ? '#76d7e5' : '#38adc2', x, y, 4 + rng() * 12, 1);
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

  // Crosspiece on the shore joins the playable pier into a T shaped timber dock.
  for (let y = PIER.y - 23; y < PIER.y; y += 6) {
    rect(ctx, '#705137', PIER.x - 70, y, PIER.w + 140, 6);
    rect(ctx, '#bb9867', PIER.x - 69, y, PIER.w + 138, 4);
    rect(ctx, '#ddbf89', PIER.x - 69, y, PIER.w + 138, 1);
    for (let x = PIER.x - 64; x < PIER.x + PIER.w + 65; x += 24) rect(ctx, '#73523a', x, y + 2, 2, 1);
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
    oval(ctx, '#2d5a2b', x, y, rx! * s + 1, ry! * s + 1);
    oval(ctx, '#4a9347', x, y - 1, rx! * s, ry! * s - 1);
    oval(ctx, '#6eaa55', x - 2 * s, y - 3 * s, rx! * s * 0.78, ry! * s * 0.65);
    oval(ctx, '#96bd6c', x - 3 * s, y - 5 * s, rx! * s * 0.5, ry! * s * 0.35);
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
  comga: 'CƠM GÀ 68',
  bida: 'BIDA H2S',
  cybernet: 'CYBER GAME HNT',
};

/**
 * Paints the authentic VietProDev modern 3-story townhouse headquarters,
 * matching real-world architectural facade:
 * - Warm sand-beige / cream columns & walls
 * - 3rd floor / attic horizontal slate louvers & rooftop greens
 * - 2nd floor modern glass window, chrome/glass balcony railing
 * - Characteristic terracotta / warm wood louvers directly under the 2nd floor balcony
 * - Vietnamese national red flag with yellow star mounted on balcony
 * - Large white signboard: "CÔNG TY TNHH PHẦN MỀM" + tree logo + "Viet" (charcoal) "Pro" (green) "Dev" (blue)
 * - 3 service pillars: "DỰ ÁN PHẦN MỀM · ĐÀO TẠO · CLOUD & AI"
 * - Deep navy blue info strip at the bottom of the sign
 * - Dark scalloped / ripple awning canopy over the entrance
 * - Ground floor modern glass sliding doors with chrome handles and entrance step
 */
function paintVietProDevTownhouse(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 168
  canvas.height = b.rect.h + BUILDING_ROOF; // 192
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const w = b.rect.w; // 160
  const bottom = canvas.height - 2; // 190

  // 0. Base ground shadow
  rect(ctx, 'rgba(54, 48, 36, 0.25)', 4, bottom - 6, w + 4, 8);

  // 1. Structural Townhouse Backdrop (Beige cream center with slate grey flanking columns)
  rect(ctx, '#64748b', 4, 12, 18, bottom - 12);
  rect(ctx, '#475569', 20, 12, 2, bottom - 12);
  rect(ctx, '#64748b', w - 14, 12, 18, bottom - 12);
  rect(ctx, '#334155', w - 16, 12, 2, bottom - 12);

  // Main townhouse body (Warm beige / sand cream)
  rect(ctx, '#f5efe6', 22, 10, w - 38, bottom - 10);
  rect(ctx, '#ede5d8', 22, 10, 4, bottom - 10);
  rect(ctx, '#e4dcd0', w - 26, 10, 4, bottom - 10);

  // 2. FLOOR 3 / ATTIC & ROOF TERRACE (y: 10 to 60)
  for (let px = 28; px < w - 24; px += 14) {
    oval(ctx, '#15803d', px + 2, 8, 5, 5);
    oval(ctx, '#22c55e', px + 5, 6, 4, 4);
    rect(ctx, '#a15238', px + 1, 10, 7, 4);
  }

  // Attic center block with modern horizontal slate louvers
  const atticX = 46;
  const atticW = w - 84; // 76px
  const atticY = 14;
  const atticH = 46;
  rect(ctx, '#e8dfd5', atticX - 3, atticY - 2, atticW + 6, atticH + 4);
  rect(ctx, '#334155', atticX, atticY, atticW, atticH);
  for (let ly = atticY + 4; ly < atticY + atticH - 2; ly += 5) {
    rect(ctx, '#1e293b', atticX + 2, ly, atticW - 4, 2);
    rect(ctx, '#475569', atticX + 2, ly + 2, atticW - 4, 1);
  }
  rect(ctx, '#d6cbbe', atticX - 4, atticY - 3, atticW + 8, 3);

  // Side balconies / window cutouts on Floor 3
  rect(ctx, '#94a3b8', 26, 26, 16, 28);
  rect(ctx, '#ffffff', 28, 28, 12, 24);
  rect(ctx, '#e2e8f0', 29, 29, 10, 22);
  rect(ctx, '#cbd5e1', 26, 48, 16, 6);

  rect(ctx, '#94a3b8', w - 42, 26, 16, 28);
  rect(ctx, '#ffffff', w - 40, 28, 12, 24);
  rect(ctx, '#e2e8f0', w - 39, 29, 10, 22);
  rect(ctx, '#cbd5e1', w - 42, 48, 16, 6);

  // 3. FLOOR 2 (y: 60 to 118)
  rect(ctx, '#dfd5c6', 22, 60, w - 38, 4);

  const f2WinX = 38;
  const f2WinW = w - 68; // 92px
  const f2WinY = 64;
  const f2WinH = 34;

  rect(ctx, '#cbd5e1', f2WinX, f2WinY, f2WinW, f2WinH);
  rect(ctx, '#ffffff', f2WinX + 2, f2WinY + 2, f2WinW - 4, f2WinH - 4);
  rect(ctx, '#f1f5f9', f2WinX + 4, f2WinY + 4, f2WinW - 8, f2WinH - 8);
  for (let bx = f2WinX + 8; bx < f2WinX + f2WinW - 8; bx += 14) {
    rect(ctx, '#e2e8f0', bx, f2WinY + 4, 10, f2WinH - 8);
    rect(ctx, '#ffffff', bx + 2, f2WinY + 5, 6, 4);
  }
  rect(ctx, '#cbd5e1', f2WinX + Math.floor(f2WinW / 3), f2WinY + 2, 2, f2WinH - 4);
  rect(ctx, '#cbd5e1', f2WinX + Math.floor((f2WinW * 2) / 3), f2WinY + 2, 2, f2WinH - 4);

  // Modern glass & stainless steel balcony railing
  const railX = f2WinX - 2;
  const railW = f2WinW + 4;
  const railY = f2WinY + 22;
  const railH = 14;
  rect(ctx, 'rgba(224, 242, 254, 0.75)', railX, railY, railW, railH);
  rect(ctx, '#e2e8f0', railX - 1, railY, railW + 2, 2);
  rect(ctx, '#94a3b8', railX, railY + railH - 2, railW, 2);
  for (let rx = railX + 4; rx <= railX + railW - 4; rx += 20) {
    rect(ctx, '#cbd5e1', rx, railY, 2, railH);
  }

  // --- KEY ARCHITECTURAL FEATURE: TERRACOTTA / WOODEN SLATS (Lam gỗ đỏ) ---
  const slatX = f2WinX - 1;
  const slatW = f2WinW + 2;
  const slatY = railY + railH + 2;
  const slatH = 16;
  rect(ctx, '#7c2d12', slatX - 1, slatY - 1, slatW + 2, slatH + 2);
  rect(ctx, '#431407', slatX, slatY, slatW, slatH);
  for (let lx = slatX + 2; lx < slatX + slatW - 2; lx += 4) {
    rect(ctx, '#b45309', lx, slatY, 2, slatH);
    rect(ctx, '#d97706', lx, slatY, 1, slatH);
  }

  // --- VIETNAM NATIONAL FLAG (Cờ đỏ sao vàng) on Floor 2 ---
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(slatX + 8, slatY + 12);
  ctx.lineTo(slatX - 4, slatY - 4);
  ctx.stroke();
  const flagX = slatX - 16;
  const flagY = slatY - 10;
  rect(ctx, '#dc2626', flagX, flagY, 13, 9);
  rect(ctx, '#b91c1c', flagX, flagY + 8, 13, 1);
  rect(ctx, '#facc15', flagX + 4, flagY + 2, 5, 5);
  rect(ctx, '#fde047', flagX + 5, flagY + 3, 3, 3);

  // 4. SIGNBOARD (Biển hiệu VietProDev Nền Trắng Sáng Chuẩn 100% Theo Ảnh Thực Tế)
  const signX = 8;
  const signW = w - 8; // 152px
  const signY = 118;
  const signH = 34;

  rect(ctx, 'rgba(0, 0, 0, 0.25)', signX - 1, signY - 1, signW + 2, signH + 4);
  rect(ctx, '#cbd5e1', signX - 1, signY - 1, signW + 2, signH + 2);
  rect(ctx, '#ffffff', signX, signY, signW, signH);

  // 4.1 Top line: "CÔNG TY TNHH PHẦN MỀM"
  ctx.font = '700 6px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#1e3a8a';
  ctx.fillText('CÔNG TY TNHH PHẦN MỀM', signX + signW / 2 + 10, signY + 3);

  // 4.2 Tree logo on the left of "VietProDev"
  const logoPx = signX + 12;
  const logoPy = signY + 14;
  rect(ctx, '#16a34a', logoPx + 4, logoPy + 2, 2, 8);
  rect(ctx, '#22c55e', logoPx + 2, logoPy + 1, 6, 2);
  rect(ctx, '#16a34a', logoPx, logoPy + 3, 10, 2);
  rect(ctx, '#15803d', logoPx + 2, logoPy + 5, 6, 2);

  // 4.3 MAIN LOGO: "Viet" (Charcoal), "Pro" (Green), "Dev" (Blue)
  const brandY = signY + 11;
  const centerX = signX + signW / 2 + 8;
  ctx.font = '800 13px "Inter", "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Viet', centerX - 8, brandY);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#16a34a';
  ctx.fillText('Pro', centerX + 4, brandY);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1d4ed8';
  ctx.fillText('Dev', centerX + 16, brandY);

  // 4.4 3 Pillars underneath
  ctx.font = '600 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.fillText('DỰ ÁN PHẦN MỀM  ·  ĐÀO TẠO  ·  CLOUD & AI', signX + signW / 2, signY + 23);

  // 4.5 Bottom blue band: info & website
  rect(ctx, '#1e40af', signX, signY + signH - 5, signW, 5);
  ctx.font = '700 4px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BIÊN HÒA, ĐỒNG NAI  ·  VIETPRODEV.VN', signX + signW / 2, signY + signH - 4.5);

  // 5. GROUND FLOOR AWNING (Mái hiên di động lượn sóng màu than đen)
  const awnX = signX - 2;
  const awnW = signW + 4;
  const awnY = signY + signH;
  const awnH = 12;

  // Additional red flag at ground floor entrance
  rect(ctx, '#dc2626', 14, awnY + 8, 8, 6);
  rect(ctx, '#facc15', 16, awnY + 10, 3, 2);

  // 6. GROUND FLOOR ENTRANCE & GLASS DOORS (y: 160 to bottom)
  const gy = awnY + awnH - 2;
  const gh = bottom - gy;
  rect(ctx, '#f1ede4', 22, gy, w - 38, gh);
  rect(ctx, '#e4dcd0', 22, gy, 4, gh);
  rect(ctx, '#e4dcd0', w - 26, gy, 4, gh);

  const doorX = 4 + b.door.x * TILE - b.rect.x; // 36
  const doorW = b.door.w * TILE; // 64
  const dy = bottom - 34;

  rect(ctx, '#cbd5e1', doorX + 4, dy - 2, doorW - 8, 36);
  rect(ctx, '#94a3b8', doorX + 6, dy, doorW - 12, 34);

  const halfW = (doorW - 16) / 2;
  rect(ctx, '#e0f2fe', doorX + 7, dy + 1, halfW, 32);
  rect(ctx, '#bae6fd', doorX + 9, dy + 3, halfW - 4, 16);
  rect(ctx, 'rgba(255, 255, 255, 0.7)', doorX + 11, dy + 4, 4, 26);
  rect(ctx, '#e2e8f0', doorX + 7 + halfW - 3, dy + 10, 2, 14);

  rect(ctx, '#e0f2fe', doorX + 9 + halfW, dy + 1, halfW, 32);
  rect(ctx, '#bae6fd', doorX + 11 + halfW, dy + 3, halfW - 4, 16);
  rect(ctx, 'rgba(255, 255, 255, 0.7)', doorX + 13 + halfW, dy + 4, 4, 26);
  rect(ctx, '#e2e8f0', doorX + 9 + halfW + 1, dy + 10, 2, 14);

  rect(ctx, '#cbd5e1', doorX + 2, bottom - 4, doorW - 4, 4);
  rect(ctx, '#f8fafc', doorX + 4, bottom - 4, doorW - 8, 1);

  // The canopy sits in front of the glass doors, not behind them.
  rect(ctx, '#0f172a', awnX, awnY, awnW, 3);
  rect(ctx, '#1e293b', awnX, awnY + 2, awnW, awnH - 4);
  for (let wx = awnX; wx < awnX + awnW; wx += 6) {
    rect(ctx, '#334155', wx, awnY + 2, 4, awnH - 4);
    rect(ctx, '#0f172a', wx + 4, awnY + 2, 2, awnH - 4);
    rect(ctx, '#1e293b', wx, awnY + awnH - 2, 5, 2);
  }
  rect(ctx, 'rgba(0, 0, 0, 0.35)', awnX, awnY + awnH, awnW, 3);

  return canvas;
}

/**
 * Paints Dong Nai Technology University (DNTU) grand Indochine campus building,
 * matching real-world architectural facade:
 * - Traditional Vietnamese multi-tiered terracotta red tile roof with central triangular dormer pediment
 * - Flanking roof gables with round attic arched windows
 * - Upper floors in warm French Indochine cream yellow with dark brown multi-pane windows and white balustrades
 * - Ground floor in bold terracotta-red with 5 monumental Roman/Indochine arched entrance gates
 * - 3 Flagpoles in front of central arch: Vietnam National Flag flanked by DNTU flags
 * - Grand polished granite campus monument engraved: "ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI"
 * - Manicured conical topiaries and palm greenery flanking the colonnade
 */
function paintDntuBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 200
  canvas.height = b.rect.h + BUILDING_ROOF; // 192
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const w = b.rect.w; // 192
  const bottom = canvas.height - 2; // 190

  // 0. Base ground shadow
  rect(ctx, 'rgba(54, 48, 36, 0.28)', 4, bottom - 6, w + 4, 8);

  // 1. Structural Backdrop & Wall Base (French Indochine Cream Yellow upper body)
  rect(ctx, '#fef3c7', 6, 44, w - 8, bottom - 44);
  rect(ctx, '#fde68a', 6, 44, 6, bottom - 44);
  rect(ctx, '#fde68a', w - 12, 44, 6, bottom - 44);

  // 2. ROOF (Terracotta Red Multi-tiered Hip & Gable Roof - y: 8..54)
  rect(ctx, '#7f1d1d', 2, 28, w, 24);
  rect(ctx, '#c2410c', 4, 30, w - 4, 20);
  for (let ry = 32; ry < 50; ry += 4) {
    rect(ctx, '#9a3412', 4, ry, w - 4, 2);
    rect(ctx, '#ea580c', 4, ry + 2, w - 4, 1);
  }
  rect(ctx, '#431407', 0, 50, w + 4, 4);
  rect(ctx, '#fffbeb', 2, 53, w, 2);

  // Dormers with round attic windows across the wide roof
  function drawDormer(dx: number) {
    rect(ctx, '#7f1d1d', dx, 20, 24, 28);
    rect(ctx, '#c2410c', dx + 2, 22, 20, 24);
    rect(ctx, '#fef3c7', dx + 4, 32, 16, 14);
    oval(ctx, '#1c1917', dx + 12, 38, 5, 5);
    oval(ctx, '#e0f2fe', dx + 12, 38, 4, 4);
    rect(ctx, '#1c1917', dx + 11, 34, 2, 8);
    rect(ctx, '#1c1917', dx + 8, 37, 8, 2);
  }
  // Symmetrical dormers on left and right wings
  drawDormer(28);
  drawDormer(92);
  drawDormer(w - 116);
  drawDormer(w - 52);

  // Central Grand Triangular Pediment Dormer (Mái dốc tam giác trung tâm - y: 8..36)
  const pedX = w / 2; // 176
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(pedX, 6);
  ctx.lineTo(pedX - 44, 38);
  ctx.lineTo(pedX + 44, 38);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#c2410c';
  ctx.beginPath();
  ctx.moveTo(pedX, 9);
  ctx.lineTo(pedX - 40, 36);
  ctx.lineTo(pedX + 40, 36);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.moveTo(pedX, 16);
  ctx.lineTo(pedX - 26, 35);
  ctx.lineTo(pedX + 26, 35);
  ctx.closePath();
  ctx.fill();

  rect(ctx, '#7c2d12', pedX - 16, 26, 32, 8);
  for (let vx = pedX - 14; vx <= pedX + 14; vx += 4) {
    rect(ctx, '#fef3c7', vx, 27, 2, 6);
  }

  // 3. UPPER FLOORS: TẦNG 2 & 3 (y: 54..112)
  const colXs = [12, 44, 76, 108, 140, 172, 204, 236, 268, 300, w - 12];
  for (const cx of colXs) {
    rect(ctx, '#b91c1c', cx - 2, 54, 4, 58);
    rect(ctx, '#991b1b', cx - 2, 54, 1, 58);
  }

  for (let bay = 0; bay < colXs.length - 1; bay++) {
    const c1 = colXs[bay] ?? 12;
    const c2 = colXs[bay + 1] ?? 44;
    const wx = c1 + 5;
    const ww = c2 - c1 - 10;

    // Floor 3 Window
    rect(ctx, '#1c1917', wx, 58, ww, 18);
    rect(ctx, '#e0f2fe', wx + 1, 59, ww - 2, 16);
    for (let wy = 61; wy < 74; wy += 4) {
      rect(ctx, '#1c1917', wx + 1, wy, ww - 2, 1);
    }

    // Floor 2 Window with white balustrade
    rect(ctx, '#1c1917', wx, 82, ww, 22);
    rect(ctx, '#e0f2fe', wx + 1, 83, ww - 2, 20);
    for (let wy = 85; wy < 100; wy += 4) {
      rect(ctx, '#1c1917', wx + 1, wy, ww - 2, 1);
    }
    rect(ctx, '#ffffff', wx - 1, 98, ww + 2, 6);
    for (let bx = wx + 1; bx < wx + ww; bx += 3) {
      rect(ctx, '#cbd5e1', bx, 99, 1, 5);
    }
  }

  rect(ctx, '#ffffff', 6, 110, w - 8, 4);
  rect(ctx, '#fef3c7', 6, 113, w - 8, 2);

  // 4. GROUND FLOOR: MONUMENTAL RED ARCHED COLONNADE (y: 114..186)
  rect(ctx, '#b91c1c', 6, 114, w - 8, bottom - 116);
  rect(ctx, '#991b1b', 6, 114, 4, bottom - 116);
  rect(ctx, '#7f1d1d', w - 10, 114, 4, bottom - 116);

  const arches = [
    { x: pedX - 150, w: 32, h: 48, topH: 12 },
    { x: pedX - 110, w: 32, h: 48, topH: 12 },
    { x: pedX - 70, w: 32, h: 48, topH: 12 },
    { x: pedX - 30, w: 60, h: 58, topH: 16 }, // Grand central entrance
    { x: pedX + 38, w: 32, h: 48, topH: 12 },
    { x: pedX + 78, w: 32, h: 48, topH: 12 },
    { x: pedX + 118, w: 32, h: 48, topH: 12 },
  ];

  for (const a of arches) {
    const ay = bottom - a.h - 6;

    rect(ctx, '#450a0a', a.x, ay, a.w, a.h);

    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(a.x + a.w / 2, ay + a.topH, a.w / 2, Math.PI, 0);
    ctx.fill();

    rect(ctx, 'rgba(254, 240, 138, 0.45)', a.x + 3, ay + a.topH, a.w - 6, a.h - a.topH - 4);
    rect(ctx, '#e0f2fe', a.x + 4, ay + a.topH + 4, a.w - 8, a.h - a.topH - 12);
    rect(ctx, 'rgba(255, 255, 255, 0.6)', a.x + 6, ay + a.topH + 6, 3, a.h - a.topH - 16);

    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x + a.w / 2, ay + a.topH, a.w / 2, Math.PI, 0);
    ctx.stroke();
    rect(ctx, '#fef3c7', a.x - 1, ay + a.topH, 2, a.h - a.topH);
    rect(ctx, '#fef3c7', a.x + a.w - 1, ay + a.topH, 2, a.h - a.topH);
    rect(ctx, '#ffffff', a.x + a.w / 2 - 2, ay - 2, 4, 4);
  }

  // Central Entrance Double Doors inside Central Arch
  const cDoorX = pedX - 16;
  const cDoorW = 32;
  const cDoorY = bottom - 36;
  rect(ctx, '#1c1917', cDoorX, cDoorY, cDoorW, 30);
  rect(ctx, '#e0f2fe', cDoorX + 2, cDoorY + 2, cDoorW / 2 - 3, 26);
  rect(ctx, '#e0f2fe', cDoorX + cDoorW / 2 + 1, cDoorY + 2, cDoorW / 2 - 3, 26);
  rect(ctx, '#e2e8f0', cDoorX + cDoorW / 2 - 2, cDoorY + 10, 1, 10);
  rect(ctx, '#e2e8f0', cDoorX + cDoorW / 2 + 1, cDoorY + 10, 1, 10);

  // Grand Entrance Steps (Polished stone stairs)
  rect(ctx, '#d4af37', pedX - 38, bottom - 6, 76, 4);
  rect(ctx, '#fef08a', pedX - 36, bottom - 4, 72, 2);

  // 5. 3 FLAGPOLES IN FRONT OF MAIN ARCH (y: 90..130)
  // Left Flag: DNTU Flag
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pedX - 16, 126);
  ctx.lineTo(pedX - 16, 96);
  ctx.stroke();
  rect(ctx, '#ffffff', pedX - 27, 98, 11, 7);
  rect(ctx, '#b91c1c', pedX - 23, 100, 3, 4);

  // Center Flag: Vietnam National Flag
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pedX, 126);
  ctx.lineTo(pedX, 90);
  ctx.stroke();
  rect(ctx, '#dc2626', pedX + 1, 91, 14, 9);
  rect(ctx, '#b91c1c', pedX + 1, 99, 14, 1);
  rect(ctx, '#facc15', pedX + 5, 93, 5, 5);
  rect(ctx, '#fde047', pedX + 6, 94, 3, 3);

  // Right Flag: DNTU Flag
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pedX + 16, 126);
  ctx.lineTo(pedX + 16, 96);
  ctx.stroke();
  rect(ctx, '#ffffff', pedX + 16, 98, 11, 7);
  rect(ctx, '#b91c1c', pedX + 20, 100, 3, 4);

  // 6. TOP UNIVERSITY TITLE ON ARCH LEVEL
  const signW = 160;
  const signX = pedX - signW / 2;
  rect(ctx, '#991b1b', signX, 118, signW, 14);
  rect(ctx, '#7f1d1d', signX, 118, signW, 1);
  rect(ctx, '#fef08a', signX + 1, 119, signW - 2, 12);
  ctx.font = '800 7px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b91c1c';
  ctx.fillText('TRƯỜNG ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI', pedX, 125, signW - 8);

  // 7. GOLD ARCH ENTRANCE TRANSOM (y: 136..144)
  rect(ctx, '#7f1d1d', pedX - 28, bottom - 46, 56, 10);
  rect(ctx, '#fef08a', pedX - 26, bottom - 45, 52, 8);
  ctx.font = '800 5.5px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#991b1b';
  ctx.fillText('ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI', pedX, bottom - 41, 48);

  // 8. MANICURED CONICAL TOPIARIES & PALM GREENERY
  function drawCampusTopiary(tx: number, ty: number) {
    rect(ctx, '#7f1d1d', tx + 2, ty + 10, 8, 8);
    rect(ctx, '#b91c1c', tx + 3, ty + 11, 6, 6);
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.moveTo(tx + 6, ty);
    ctx.lineTo(tx, ty + 11);
    ctx.lineTo(tx + 12, ty + 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(tx + 6, ty + 2);
    ctx.lineTo(tx + 2, ty + 10);
    ctx.lineTo(tx + 10, ty + 10);
    ctx.closePath();
    ctx.fill();
  }
  drawCampusTopiary(pedX - 52, bottom - 24);
  drawCampusTopiary(pedX + 42, bottom - 24);
  drawCampusTopiary(50, bottom - 24);
  drawCampusTopiary(w - 60, bottom - 24);

  return canvas;
}

/**
 * Paints authentic Cơm Gà Xối Mỡ 68 Biên Hòa restaurant facade:
 * - Proportional 2-story Vietnamese shophouse (canvas: 160x156):
 * - Roof (y: 4..24, sleek 20px): Terracotta tiled hip roof, stainless kitchen exhaust chimney venting steam
 * - Floor 2 (y: 26..68, 42px): Indochine yellow stucco, 3 green louver shutter windows with cascading bougainvillea, outdoor AC compressor
 * - Signboard (y: 68..94, 26px): Full-width red Alu panel with 3D embossed gold letters ("CƠM GÀ 68", "ĐẶC SẢN BIÊN HÒA", "XỐI MỠ DA GIÒN")
 * - Awning (y: 93..104, 11px): Red & yellow scalloped retractable awning ("mái hiên di động")
 * - Ground Floor (y: 104..156, 52px):
 *   - Left: Tall stainless & glass chicken cart with hanging crispy whole fried chicken, drumsticks, chopping block, cleaver, cucumbers & bubbling xối mỡ station
 *   - Center: Open dining entrance (doorX=36, doorW=64), checkered floor, golden fried rice warmer, bone broth cauldron & red "XIN CHÀO" mat
 *   - Right: Stainless dining table, red & blue stools, Chinsu chili sauce, iced tea with green straw & customer Honda Wave parked on sidewalk
 */
function paintComGaBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 168
  canvas.height = b.rect.h + BUILDING_ROOF; // 158
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const w = b.rect.w; // 160
  const bottom = canvas.height - 2; // 156
  const doorX = 4 + b.door.x * TILE - b.rect.x; // 36
  const doorW = b.door.w * TILE; // 64

  // 0. Base ground shadow
  rect(ctx, 'rgba(54, 48, 36, 0.35)', 4, bottom - 4, w + 4, 6);

  // 1. Solid Building Structure (Warm Saigon/Biên Hòa shophouse wall)
  rect(ctx, '#78350f', 4, 16, w, bottom - 16); // Structural dark timber framing
  rect(ctx, '#fef08a', 6, 18, w - 4, bottom - 18); // Indochine warm cream-yellow stucco
  rect(ctx, '#fef9c3', 6, 26, w - 4, 42); // Stucco highlight on Floor 2

  // Corner wood pillars
  rect(ctx, '#78350f', 4, 16, 4, bottom - 16);
  rect(ctx, '#92400e', 5, 17, 2, bottom - 17);
  rect(ctx, '#78350f', w, 16, 4, bottom - 16);
  rect(ctx, '#92400e', w + 1, 17, 2, bottom - 17);

  // 2. Terracotta Tiled Roof (y: 4..24) - Compact, sleek, proportional!
  rect(ctx, '#7f1d1d', 4, 20, w, 4); // Roof overhang shadow
  rect(ctx, '#991b1b', 2, 6, w + 4, 16);
  rect(ctx, '#b91c1c', 3, 7, w + 2, 14);
  // Slanted clay roof tile ridges (ngói móc đỏ cam)
  for (let rx = 5; rx < w + 4; rx += 4) {
    rect(ctx, '#ea580c', rx, 7, 2, 13);
    rect(ctx, '#7f1d1d', rx + 2, 7, 1, 13);
  }
  // Roof ridge cap & decorative golden finials
  rect(ctx, '#7c2d12', 1, 4, w + 6, 3);
  rect(ctx, '#c2410c', 2, 3, w + 4, 2);
  rect(ctx, '#fbbf24', 2, 2, 3, 3); // Left finial
  rect(ctx, '#fbbf24', w + 3, 2, 3, 3); // Right finial

  // Stainless kitchen exhaust chimney duct on right side of roof
  const chimX = w - 24;
  rect(ctx, '#475569', chimX - 1, 0, 11, 18);
  rect(ctx, '#cbd5e1', chimX, 0, 9, 17);
  rect(ctx, '#f8fafc', chimX + 1, 0, 3, 17); // Chrome reflection
  rect(ctx, '#64748b', chimX - 2, 0, 15, 4); // Rain cap
  rect(ctx, '#94a3b8', chimX - 1, 0, 13, 2);
  // Billowing fragrant steam puffs wafting out
  rect(ctx, 'rgba(255, 255, 255, 0.75)', chimX + 3, -4, 4, 3);
  rect(ctx, 'rgba(255, 255, 255, 0.55)', chimX + 6, -7, 5, 3);
  rect(ctx, 'rgba(255, 255, 255, 0.35)', chimX + 9, -10, 6, 3);

  // 3. Second Floor Windows & Shophouse Architecture (y: 26..68, height = 42px)
  // Horizontal dividing beam
  rect(ctx, '#78350f', 4, 24, w, 2);

  // Window helper
  const drawWindow = (wx: number, wy: number, ww: number, wh: number) => {
    rect(ctx, '#14532d', wx - 1, wy - 1, ww + 2, wh + 2);
    rect(ctx, '#166534', wx, wy, ww, wh);
    // Green wooden louver slats (cửa chớp lá sách)
    const mid = wx + Math.floor(ww / 2);
    for (let ly = wy + 3; ly < wy + wh - 4; ly += 4) {
      rect(ctx, '#15803d', wx + 2, ly, mid - wx - 3, 2);
      rect(ctx, '#15803d', mid + 1, ly, wx + ww - mid - 3, 2);
    }
    rect(ctx, '#14532d', mid - 1, wy, 2, wh); // Center frame

    // Planter box with blooming red/magenta bougainvillea (hoa giấy nở rộ)
    rect(ctx, '#78350f', wx - 2, wy + wh - 2, ww + 4, 6);
    rect(ctx, '#92400e', wx - 1, wy + wh - 1, ww + 2, 4);
    for (let fx = wx - 1; fx < wx + ww + 1; fx += 3) {
      rect(ctx, '#16a34a', fx, wy + wh - 4, 3, 4);
      rect(ctx, fx % 2 === 0 ? '#e11d48' : '#f43f5e', fx + 1, wy + wh - 5, 2, 3);
    }
  };

  // 3 Green Shutter Windows across 2nd floor:
  drawWindow(14, 28, 28, 30); // Window 1 (left)
  drawWindow(92, 28, 26, 30); // Window 2 (center-right)
  drawWindow(124, 28, 26, 30); // Window 3 (far-right)

  // Wall-mounted outdoor AC compressor unit (cục nóng máy lạnh)
  const acX = 50;
  const acY = 34;
  rect(ctx, '#64748b', acX - 1, acY - 1, 32, 22);
  rect(ctx, '#f1f5f9', acX, acY, 30, 20);
  rect(ctx, '#334155', acX + 16, acY + 4, 10, 10); // Fan circular grille
  rect(ctx, '#94a3b8', acX + 18, acY + 6, 6, 6);
  rect(ctx, '#0284c7', acX + 4, acY + 5, 8, 3); // Panasonic blue logo badge
  rect(ctx, '#cbd5e1', acX + 4, acY + 11, 8, 4); // Vent slats

  // Wall sconce lanterns
  for (const lx of [8, 46, 88, 154]) {
    rect(ctx, '#475569', lx, 32, 2, 6);
    rect(ctx, '#fef08a', lx - 1, 30, 4, 3);
  }

  // 4. Grand Red & Gold Signboard ("CƠM GÀ 68 - BIÊN HÒA") (y: 68..94, height = 26px)
  const signX = 6;
  const signW = w - 4; // 156
  const signY = 68;
  const signH = 26;

  // Drop shadow & golden frame
  rect(ctx, 'rgba(0, 0, 0, 0.45)', signX - 1, signY - 1, signW + 2, signH + 3);
  rect(ctx, '#ca8a04', signX - 1, signY - 1, signW + 2, signH + 2);
  rect(ctx, '#facc15', signX, signY, signW, signH);
  rect(ctx, '#991b1b', signX + 1, signY + 1, signW - 2, signH - 2);
  rect(ctx, '#b91c1c', signX + 2, signY + 2, signW - 4, signH - 4);
  rect(ctx, '#dc2626', signX + 2, signY + 2, signW - 4, 4); // Gloss highlight

  // Golden inner border
  rect(ctx, '#fef08a', signX + 3, signY + 2, signW - 6, 1);
  rect(ctx, '#fef08a', signX + 3, signY + signH - 3, signW - 6, 1);
  rect(ctx, '#fef08a', signX + 3, signY + 2, 1, signH - 4);
  rect(ctx, '#fef08a', signX + signW - 4, signY + 2, 1, signH - 4);

  // Spotlights above sign
  for (const lx of [signX + 16, signX + signW / 2 - 30, signX + signW / 2 + 30, signX + signW - 16]) {
    rect(ctx, '#334155', lx - 2, signY - 3, 5, 3);
    rect(ctx, '#fef08a', lx - 1, signY - 1, 3, 1);
  }

  // Text
  ctx.font = '700 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('⭐ ĐẶC SẢN BIÊN HÒA · GIA TRUYỀN ⭐', signX + signW / 2, signY + 3);

  // Main 3D Bold Title
  ctx.font = '900 12.5px "Inter", sans-serif';
  ctx.fillStyle = '#450a0a';
  ctx.fillText('CƠM GÀ 68', signX + signW / 2 + 1, signY + 9);
  ctx.fillStyle = '#fef08a';
  ctx.fillText('CƠM GÀ 68', signX + signW / 2, signY + 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CƠM GÀ 68', signX + signW / 2 - 0.5, signY + 7.6);

  ctx.font = '700 4.5px sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('XỐI MỠ DA GIÒN · GÀ TA THẢ VƯỜN · GỎI GÀ XÉ PHAY', signX + signW / 2, signY + 19);

  // 5. Scalloped Red-Yellow Retractable Awning ("Mái hiên di động") (y: 92..104, height = 12px)
  const awnY = 93;
  const awnH = 11;
  rect(ctx, 'rgba(0, 0, 0, 0.3)', 4, awnY + awnH, w, 4); // Shadow under awning
  for (let ax = 4; ax < 4 + w; ax += 10) {
    const isYellow = Math.floor((ax - 4) / 10) % 2 === 0;
    rect(ctx, isYellow ? '#facc15' : '#dc2626', ax, awnY, 10, awnH);
    rect(ctx, isYellow ? '#ca8a04' : '#991b1b', ax, awnY + awnH - 2, 10, 2);
  }
  // Scalloped bottom wavy fringe
  for (let ax = 4; ax < 4 + w; ax += 5) {
    rect(ctx, '#ffffff', ax + 1, awnY + awnH, 3, 2);
  }

  // 6. Ground Floor Restaurant Facade (y: 104..156, height = 52px!) - NO GAPS!
  // Stainless / granite kickplate at ground
  rect(ctx, '#94a3b8', 4, bottom - 8, w, 8);
  rect(ctx, '#cbd5e1', 5, bottom - 8, w - 2, 2);

  // Left: Stainless Steel Chicken Showcase (Tủ cơm gà kính inox xối mỡ cao ráo)
  const cartX = 6;
  const cartW = 28;
  const cartY = 106;
  const cartH = 46;
  // Glass cabinet frame
  rect(ctx, '#475569', cartX - 1, cartY - 1, cartW + 2, cartH + 2);
  rect(ctx, '#cbd5e1', cartX, cartY, cartW, cartH);
  rect(ctx, 'rgba(254, 243, 199, 0.92)', cartX + 2, cartY + 2, cartW - 4, cartH - 16); // Lit glass showcase
  // Hanging golden fried chicken thighs & whole crispy chickens
  for (const cx of [cartX + 4, cartX + 11, cartX + 18]) {
    rect(ctx, '#78350f', cx + 2, cartY + 3, 1, 3); // Hanging hook
    rect(ctx, '#b45309', cx, cartY + 5, 5, 12);
    rect(ctx, '#f59e0b', cx + 1, cartY + 6, 4, 9);
    rect(ctx, '#d97706', cx + 1, cartY + 12, 3, 4);
  }
  // Wooden chopping block (thớt gỗ me tròn) & cleaver (dao chặt gà inox)
  rect(ctx, '#78350f', cartX + 3, cartY + 20, 10, 6);
  rect(ctx, '#92400e', cartX + 4, cartY + 20, 8, 2);
  rect(ctx, '#cbd5e1', cartX + 7, cartY + 17, 5, 4); // Inox cleaver
  // Trays of sliced cucumber, red tomatoes, shredded pickled carrots
  rect(ctx, '#cbd5e1', cartX + 15, cartY + 21, 10, 5);
  rect(ctx, '#22c55e', cartX + 16, cartY + 21, 4, 3); // Cucumber
  rect(ctx, '#ef4444', cartX + 20, cartY + 21, 4, 3); // Tomato
  // Stainless lower cart with hot oil xối mỡ station
  rect(ctx, '#64748b', cartX, cartY + cartH - 14, cartW, 14);
  rect(ctx, '#cbd5e1', cartX + 2, cartY + cartH - 13, cartW - 4, 4);
  rect(ctx, '#f59e0b', cartX + 4, cartY + cartH - 11, 8, 3); // Bubbling hot oil
  // Rising aroma steam puff
  rect(ctx, 'rgba(255, 255, 255, 0.75)', cartX + 6, cartY - 4, 3, 3);
  rect(ctx, 'rgba(255, 255, 255, 0.5)', cartX + 9, cartY - 7, 4, 3);

  // Center: Entrance Doorway (Lối vào quán rộng rãi)
  const dy = 106;
  const doorH = 48;
  rect(ctx, '#78350f', doorX - 1, dy - 1, doorW + 2, doorH + 2);
  rect(ctx, '#fef3c7', doorX, dy, doorW, doorH); // Warm glowing interior
  // Inside checkered floor tiles
  for (let iy = dy + 10; iy < bottom - 4; iy += 8) {
    for (let ix = doorX; ix < doorX + doorW; ix += 8) {
      if ((Math.floor((ix - doorX) / 8) + Math.floor((iy - dy) / 8)) % 2 === 0) {
        rect(ctx, '#fed7aa', ix, iy, 8, 8);
      }
    }
  }
  // Inside: Fragrant yellow chicken rice warmer & bone broth cauldron
  rect(ctx, '#cbd5e1', doorX + 4, dy + 12, 12, 12);
  rect(ctx, '#facc15', doorX + 6, dy + 14, 8, 6); // Golden fried rice
  rect(ctx, '#64748b', doorX + 20, dy + 10, 14, 14); // Large cauldron
  rect(ctx, '#f59e0b', doorX + 22, dy + 12, 10, 4); // Broth surface
  rect(ctx, 'rgba(255, 255, 255, 0.6)', doorX + 24, dy + 6, 6, 4); // Steam
  // Cashier counter
  rect(ctx, '#78350f', doorX + 40, dy + 12, 18, 14);
  rect(ctx, '#94a3b8', doorX + 44, dy + 8, 6, 5); // POS monitor
  // Open glass folding door panels at sides
  rect(ctx, 'rgba(224, 242, 254, 0.8)', doorX, dy, 6, doorH - 4);
  rect(ctx, '#94a3b8', doorX + 5, dy, 1, doorH - 4);
  rect(ctx, 'rgba(224, 242, 254, 0.8)', doorX + doorW - 6, dy, 6, doorH - 4);
  rect(ctx, '#94a3b8', doorX + doorW - 6, dy, 1, doorH - 4);

  // "XIN CHÀO" Red Welcome Mat
  const matX = doorX + 8;
  const matW = doorW - 16;
  const matY = bottom - 8;
  rect(ctx, '#991b1b', matX, matY, matW, 7);
  rect(ctx, '#dc2626', matX + 1, matY + 1, matW - 2, 5);
  rect(ctx, '#fef08a', matX + 4, matY + 2, matW - 8, 2);

  // Right: Stainless Dining Table, Stools & Parked Honda Wave
  const winX = doorX + doorW + 2;
  const winW = w - winX - 2; // 56px
  const winY = 106;
  const winH = 46;

  // Window showing dining room
  rect(ctx, '#78350f', winX - 1, winY - 1, winW + 2, winH + 2);
  rect(ctx, 'rgba(254, 249, 195, 0.9)', winX, winY, winW, winH);

  // Stainless dining table inside
  rect(ctx, '#cbd5e1', winX + 4, winY + 10, winW - 16, 6);
  rect(ctx, '#f8fafc', winX + 5, winY + 10, winW - 18, 2);
  rect(ctx, '#64748b', winX + 8, winY + 16, 3, 14);
  rect(ctx, '#64748b', winX + winW - 18, winY + 16, 3, 14);
  // Red & blue plastic dining stools
  rect(ctx, '#dc2626', winX + 2, winY + 18, 6, 12);
  rect(ctx, '#2563eb', winX + winW - 15, winY + 18, 6, 12);
  // Table condiments: Red Chinsu bottle, soy sauce, iced tea (Trà đá) with green straw
  rect(ctx, '#dc2626', winX + 8, winY + 4, 3, 6); // Chinsu tương ớt
  rect(ctx, '#1e293b', winX + 13, winY + 4, 3, 6); // Xì dầu Maggi
  rect(ctx, '#d97706', winX + 18, winY + 5, 4, 5); // Ly trà đá
  rect(ctx, '#22c55e', winX + 20, winY + 2, 1, 5); // Ống hút xanh

  // Customer Motorbike (Honda Wave đỏ đen) parked on sidewalk in front
  const bikeX = winX + 12;
  const bikeY = bottom - 18;
  // Wheels
  rect(ctx, '#0f172a', bikeX, bikeY + 7, 7, 9);
  rect(ctx, '#0f172a', bikeX + 22, bikeY + 7, 7, 9);
  rect(ctx, '#94a3b8', bikeX + 2, bikeY + 9, 3, 5);
  rect(ctx, '#94a3b8', bikeX + 24, bikeY + 9, 3, 5);
  // Red Wave body frame & black seat
  rect(ctx, '#dc2626', bikeX + 6, bikeY + 4, 12, 6);
  rect(ctx, '#b91c1c', bikeX + 3, bikeY + 5, 5, 5);
  rect(ctx, '#1e293b', bikeX + 10, bikeY + 1, 10, 5); // Black seat
  rect(ctx, '#cbd5e1', bikeX + 16, bikeY + 9, 7, 3); // Exhaust pipe (ống pô)
  rect(ctx, '#64748b', bikeX + 3, bikeY - 2, 2, 5); // Handlebar mirror

  // Sidewalk standing A-frame menu sign (Biển hiệu chữ A)
  rect(ctx, '#ca8a04', winX - 2, bottom - 18, 5, 17);
  rect(ctx, '#fef08a', winX - 1, bottom - 17, 3, 15);
  rect(ctx, '#dc2626', winX - 1, bottom - 14, 3, 4); // "68"

  return canvas;
}

/**
 * Paints authentic CLB Bida H2S Trảng Dài (Biên Hòa) building facade:
 * - Solid 2-story building filling full 160x156 canvas with zero gaps.
 * - Roof & Parapet (y: 4..24): Charcoal parapet with gold / emerald LED crown rim, HVAC chillers & illuminated 8-ball + crossed cues crest.
 * - 2nd Floor (y: 26..68): Panoramic tinted observation glass showing 3 illuminated tournament billiard tables with emerald and royal blue felt, suspended LED canopies, and players aiming shots.
 * - Grand Bida Neon Signboard (y: 68..94): Full-width composite panel with gold & emerald borders, "CLB BIDA H2S", "TRẢNG DÀI · BIÊN HÒA", "BÀN THI ĐẤU QUỐC TẾ · MỞ 24/7".
 * - Ground Floor (y: 92..156):
 *   - Left: Showcase glass cabinet displaying Predator carbon cues & Bien Hoa Open trophy.
 *   - Center: Automatic sliding glass doors with brass trim, welcoming red carpet runner.
 *   - Right: Sidewalk parking with cuesmith's Honda SH scooter & standing illuminated totem sign.
 */
function paintBidaBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 168
  canvas.height = b.rect.h + BUILDING_ROOF; // 158
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const w = b.rect.w; // 160
  const bottom = canvas.height - 2; // 156
  const doorX = 4 + b.door.x * TILE - b.rect.x; // 36
  const doorW = b.door.w * TILE; // 64

  // 0. Base ground shadow
  rect(ctx, 'rgba(15, 23, 42, 0.45)', 4, bottom - 4, w + 4, 6);

  // 1. FULL SOLID 2-STORY BUILDING STRUCTURE (y: 4..156)
  rect(ctx, '#030712', 4, 4, w, bottom - 4); // Dark foundation
  rect(ctx, '#0f172a', 5, 5, w - 2, bottom - 5); // Charcoal paneling
  // Architectural horizontal grooved seams
  for (let y = 18; y < bottom - 4; y += 10) {
    rect(ctx, '#090d16', 5, y, w - 2, 1);
    rect(ctx, '#1e293b', 5, y + 1, w - 2, 1);
  }

  // Emerald & Gold vertical channel pilasters flanking the building
  rect(ctx, '#047857', 4, 4, 3, bottom - 4);
  rect(ctx, '#10b981', 5, 4, 1.5, bottom - 4); // Bright emerald tube
  rect(ctx, '#b45309', w + 1, 4, 3, bottom - 4);
  rect(ctx, '#facc15', w + 2, 4, 1.5, bottom - 4); // Gold tube

  // 2. Rooftop & Parapet with Industrial AC Chillers (y: 4..24)
  rect(ctx, '#090d16', 2, 4, w + 4, 8);
  rect(ctx, '#1e293b', 3, 5, w + 2, 6);
  rect(ctx, '#10b981', 4, 11, w, 2); // Glowing emerald crown rim
  rect(ctx, '#facc15', 6, 11, w - 4, 1);

  // Dual industrial rooftop cooling units (Hệ thống điều hòa phòng lạnh 100% cho CLB Bida)
  for (const cx of [14, w - 38]) {
    rect(ctx, '#090d16', cx - 1, 6, 22, 16);
    rect(ctx, '#1e293b', cx, 7, 20, 14);
    rect(ctx, '#334155', cx + 2, 8, 16, 12);
    oval(ctx, '#0f172a', cx + 10, 14, 6, 4);
    rect(ctx, '#94a3b8', cx + 7, 14, 7, 1);
    rect(ctx, '#94a3b8', cx + 10, 11, 1, 7);
  }

  // Central 8-Ball & Crossed Cues Crest on Roof Parapet
  const crestX = w / 2 + 4;
  rect(ctx, '#090d16', crestX - 12, 5, 24, 18);
  rect(ctx, '#d4af37', crestX - 10, 6, 20, 16);
  rect(ctx, '#0f172a', crestX - 8, 7, 16, 14);
  // Gold 8-ball
  oval(ctx, '#facc15', crestX, 14, 6, 6);
  oval(ctx, '#09090b', crestX, 14, 5, 5);
  oval(ctx, '#ffffff', crestX, 14, 2.5, 2.5);
  ctx.font = '800 4.5px sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText('8', crestX, 15.5);

  // 3. Second Floor Billiards Arena Panoramic Window (y: 26..68)
  const f2X = 8;
  const f2W = w - 8; // 152
  const f2Y = 26;
  const f2H = 40;

  rect(ctx, '#090d16', f2X - 1, f2Y - 1, f2W + 2, f2H + 2);
  rect(ctx, '#030712', f2X, f2Y, f2W, f2H); // Dark interior
  rect(ctx, 'rgba(16, 185, 129, 0.08)', f2X, f2Y, f2W, f2H); // Emerald sheen

  // Draw 3 mini tournament tables visible through the glass on 2nd floor
  const drawMiniTable = (tx: number, feltColor: string, _label: string) => {
    // Overhead light
    rect(ctx, '#09090b', tx + 2, f2Y + 4, 38, 3);
    rect(ctx, '#facc15', tx + 4, f2Y + 7, 34, 1);
    // Table frame
    rect(ctx, '#451a03', tx, f2Y + 12, 42, 22);
    rect(ctx, '#78350f', tx + 1, f2Y + 13, 40, 2);
    // Felt surface
    rect(ctx, feltColor, tx + 3, f2Y + 15, 36, 16);
    // Balls on felt
    oval(ctx, '#ffffff', tx + 8, f2Y + 23, 1.5, 1.5);
    oval(ctx, '#facc15', tx + 26, f2Y + 23, 1.5, 1.5);
    oval(ctx, '#ef4444', tx + 30, f2Y + 21, 1.5, 1.5);
    oval(ctx, '#09090b', tx + 32, f2Y + 23, 1.5, 1.5);
    // Player silhouette holding cue stick
    rect(ctx, '#090d16', tx + 2, f2Y + 20, 4, 10);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx + 4, f2Y + 22);
    ctx.lineTo(tx + 7, f2Y + 23);
    ctx.stroke();
  };

  drawMiniTable(f2X + 6, '#047857', 'B1'); // Table 1: Pool Emerald Green
  drawMiniTable(f2X + 54, '#1d4ed8', 'B2'); // Table 2: Carom Royal Blue
  drawMiniTable(f2X + 102, '#065f46', 'B3'); // Table 3: VIP Tournament

  // 4. Grand Bida Signboard ("CLB BIDA H2S · BIÊN HÒA") (y: 68..94)
  const signX = 6;
  const signW = w - 4; // 156
  const signY = 68;
  const signH = 26;

  rect(ctx, 'rgba(0, 0, 0, 0.65)', signX - 1, signY - 1, signW + 2, signH + 3);
  rect(ctx, '#d4af37', signX - 1, signY - 1, signW + 2, 2); // Gold neon top border
  rect(ctx, '#10b981', signX - 1, signY + signH - 1, signW + 2, 2); // Emerald neon bottom border
  rect(ctx, '#09090b', signX, signY, signW, signH);

  // Corner accents
  rect(ctx, '#facc15', signX, signY, 6, 3);
  rect(ctx, '#facc15', signX, signY, 3, 6);
  rect(ctx, '#34d399', signX + signW - 6, signY + signH - 3, 6, 3);
  rect(ctx, '#34d399', signX + signW - 3, signY + signH - 6, 3, 6);

  // Left 8-Ball badge
  oval(ctx, '#facc15', signX + 13, signY + 13, 7, 7);
  oval(ctx, '#09090b', signX + 13, signY + 13, 5.5, 5.5);
  oval(ctx, '#ffffff', signX + 13, signY + 13, 3, 3);
  ctx.font = '800 4.5px sans-serif';
  ctx.fillStyle = '#09090b';
  ctx.textAlign = 'center';
  ctx.fillText('8', signX + 13, signY + 14.5);

  // Sign text
  ctx.font = '700 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#34d399';
  ctx.fillText('⚡ TRẢNG DÀI · BIÊN HÒA ⚡', signX + signW / 2 + 4, signY + 3);

  // Main bold typography
  ctx.font = '900 13px "Inter", sans-serif';
  ctx.fillStyle = '#b45309';
  ctx.fillText('CLB BIDA H2S', signX + signW / 2 + 5, signY + 9);
  ctx.fillStyle = '#facc15';
  ctx.fillText('CLB BIDA H2S', signX + signW / 2 + 4, signY + 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CLB BIDA H2S', signX + signW / 2 + 3.5, signY + 7.6);

  ctx.font = '700 4.5px sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.fillText('BÀN THI ĐẤU QUỐC TẾ · GIAO LƯU 1V1 · MỞ 24/7', signX + signW / 2 + 4, signY + 19);

  // 5. Ground Floor Entrance & Lobby (y: 92..156, height = 64px)
  // Left: Showcase Cue Cabinet & Trophy Showcase
  const cartX = 6;
  const cartW = 28;
  const cartY = 104;
  const cartH = 48;
  rect(ctx, '#78350f', cartX - 1, cartY - 1, cartW + 2, cartH + 2);
  rect(ctx, '#451a03', cartX, cartY, cartW, cartH);
  rect(ctx, 'rgba(254, 240, 138, 0.2)', cartX + 2, cartY + 2, cartW - 4, cartH - 4); // Illuminated glass
  // Cues inside cabinet
  for (let cx = cartX + 5; cx < cartX + cartW - 4; cx += 4) {
    rect(ctx, '#0f172a', cx, cartY + 6, 2, 34); // Carbon cue
    rect(ctx, '#38bdf8', cx, cartY + 6, 2, 3); // Chalk tip
    rect(ctx, '#facc15', cx, cartY + 28, 2, 8); // Gold wrap
  }
  // Gold Trophy cup on bottom shelf
  rect(ctx, '#facc15', cartX + 8, cartY + cartH - 10, 12, 6);
  rect(ctx, '#eab308', cartX + 11, cartY + cartH - 4, 6, 3);

  // Center: Automatic Glass Entrance with Red Carpet Runner
  const dy = 104;
  const doorH = 48;
  rect(ctx, '#030712', doorX - 1, dy - 1, doorW + 2, doorH + 2);
  rect(ctx, '#020617', doorX, dy, doorW, doorH); // Dark lobby
  // Gold LED sensor bar above doors
  rect(ctx, '#facc15', doorX + 6, dy + 2, doorW - 12, 3);
  rect(ctx, '#fef08a', doorX + 8, dy + 2, doorW - 16, 1);

  // Inside view: Reception desk & drink cooler
  rect(ctx, '#1e293b', doorX + 8, dy + 14, 24, 14); // Reception counter
  rect(ctx, '#10b981', doorX + 12, dy + 16, 8, 6); // POS billing screen
  rect(ctx, '#0284c7', doorX + 36, dy + 10, 20, 24); // Cooler
  rect(ctx, '#ef4444', doorX + 38, dy + 12, 4, 6); // Redbull / Sting

  // Automatic glass sliding doors with gold handles
  rect(ctx, 'rgba(16, 185, 129, 0.2)', doorX, dy + 6, 8, doorH - 10);
  rect(ctx, '#d4af37', doorX + 7, dy + 6, 1, doorH - 10);
  rect(ctx, 'rgba(16, 185, 129, 0.2)', doorX + doorW - 8, dy + 6, 8, doorH - 10);
  rect(ctx, '#d4af37', doorX + doorW - 8, dy + 6, 1, doorH - 10);

  // Red Welcome Carpet Runner
  const matX = doorX + 4;
  const matW = doorW - 8;
  const matY = bottom - 6;
  rect(ctx, '#dc2626', matX, matY, matW, 5);
  rect(ctx, '#facc15', matX + 1, matY + 1, matW - 2, 2);

  // Right: Sidewalk Parking with Customer's Honda SH Scooter & Standing LED Totem
  const winX = doorX + doorW + 2;
  const winW = w - winX - 2; // 56px
  const winY = 104;
  const winH = 48;

  rect(ctx, '#090d16', winX - 1, winY - 1, winW + 2, winH + 2);
  rect(ctx, '#020617', winX, winY, winW, winH);
  rect(ctx, 'rgba(15, 23, 42, 0.85)', winX, winY, winW, winH);
  // Interior warm LED strips visible through glass
  rect(ctx, '#facc15', winX + 4, winY + 8, winW - 14, 2);
  rect(ctx, '#10b981', winX + 8, winY + 16, winW - 20, 2);

  // Premium Honda SH 160i parked on sidewalk
  const bikeX = winX + 6;
  const bikeY = bottom - 19;
  // Wheels
  rect(ctx, '#020617', bikeX, bikeY + 7, 7, 10);
  rect(ctx, '#020617', bikeX + 22, bikeY + 7, 7, 10);
  rect(ctx, '#cbd5e1', bikeX + 2, bikeY + 9, 3, 6);
  rect(ctx, '#cbd5e1', bikeX + 24, bikeY + 9, 3, 6);
  // White & Chrome luxury SH body
  rect(ctx, '#f8fafc', bikeX + 5, bikeY + 2, 16, 9);
  rect(ctx, '#94a3b8', bikeX + 8, bikeY + 4, 8, 3);
  rect(ctx, '#451a03', bikeX + 10, bikeY - 1, 12, 5); // Brown leather seat
  rect(ctx, '#38bdf8', bikeX + 4, bikeY + 1, 4, 3); // LED Headlight
  rect(ctx, '#64748b', bikeX + 18, bikeY + 8, 7, 3); // Exhaust

  // Standing LED Totem ("BIDA 1V1 · TẠO PHÒNG")
  rect(ctx, '#d4af37', winX + winW - 6, bottom - 30, 5, 28);
  rect(ctx, '#030712', winX + winW - 5, bottom - 29, 3, 26);
  rect(ctx, '#10b981', winX + winW - 5, bottom - 27, 3, 6);
  rect(ctx, '#facc15', winX + winW - 5, bottom - 18, 3, 6);

  return canvas;
}

function paintCyberNetBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8;
  canvas.height = b.rect.h + BUILDING_ROOF;
  const ctx = canvas.getContext('2d')!;
  const w = b.rect.w;
  const bottom = canvas.height - 2;
  rect(ctx, '#020617', 0, 8, w + 8, bottom - 8);
  rect(ctx, '#1e293b', 4, 12, w, bottom - 12);
  for (let y = 16; y < bottom - 80; y += 9) rect(ctx, '#334155', 7, y, w - 6, 2);
  rect(ctx, '#38bdf8', 4, bottom - 78, w, 3);
  rect(ctx, '#0f172a', 8, bottom - 74, w - 8, 22);
  ctx.font = '800 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('CYBER GAME HNT', canvas.width / 2, bottom - 58);
  rect(ctx, '#a855f7', 4, bottom - 49, w, 2);
  const dx = 4 + b.door.x * TILE - b.rect.x;
  rect(ctx, '#0284c7', dx + 8, bottom - 43, b.door.w * TILE - 16, 43);
  rect(ctx, '#0c4a6e', dx + 11, bottom - 40, b.door.w * TILE - 22, 39);
  rect(ctx, '#38bdf8', dx + (b.door.w * TILE) / 2, bottom - 40, 2, 39);
  for (const x of [12, w - 28]) {
    rect(ctx, '#020617', x, bottom - 40, 24, 24);
    rect(ctx, '#2563eb', x + 3, bottom - 37, 18, 15);
    rect(ctx, '#ec4899', x + 3, bottom - 21, 18, 2);
  }
  return canvas;
}

export function paintBuilding(b: Building): HTMLCanvasElement {
  if (b.id === 'vietprodev') {
    return paintVietProDevTownhouse(b);
  }
  if (b.id === 'dntu') {
    return paintDntuBuilding(b);
  }
  if (b.id === 'comga') {
    return paintComGaBuilding(b);
  }
  if (b.id === 'cybernet') return paintCyberNetBuilding(b);
  if (b.id === 'bida') {
    return paintBidaBuilding(b);
  }
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
  rect(ctx, '#6e5842', sx - 1, sy - 1, sw + 2, 18);
  rect(ctx, '#f2e5c5', sx, sy, sw, 16);
  ctx.font = '700 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4d5140';
  ctx.fillText(sign, sx + sw / 2, sy + 8);
  rect(ctx, '#4c5142', doorX + 2, dy + 7, 4, 9);
  rect(ctx, '#edcb87', doorX + 3, dy + 8, 2, 6);
  if (b.id === 'delivery') {
    rect(ctx, '#667b76', 15, bottom - 22, 18, 15);
    rect(ctx, '#d7c49b', 17, bottom - 20, 14, 3);
    rect(ctx, '#435953', 20, bottom - 17, 8, 2);
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
