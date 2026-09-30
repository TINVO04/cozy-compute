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
  dntu: 'ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI',
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

  rect(ctx, '#0f172a', awnX, awnY, awnW, 3);
  rect(ctx, '#1e293b', awnX, awnY + 2, awnW, awnH - 4);
  for (let wx = awnX; wx < awnX + awnW; wx += 6) {
    rect(ctx, '#334155', wx, awnY + 2, 4, awnH - 4);
    rect(ctx, '#0f172a', wx + 4, awnY + 2, 2, awnH - 4);
    rect(ctx, '#1e293b', wx, awnY + awnH - 2, 5, 2);
  }
  rect(ctx, 'rgba(0, 0, 0, 0.35)', awnX, awnY + awnH, awnW, 3);

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

  // Flanking left & right gable dormers with round attic windows (y: 18..44)
  // Left dormer
  rect(ctx, '#7f1d1d', 16, 20, 24, 28);
  rect(ctx, '#c2410c', 18, 22, 20, 24);
  rect(ctx, '#fef3c7', 20, 32, 16, 14);
  oval(ctx, '#1c1917', 28, 38, 5, 5);
  oval(ctx, '#e0f2fe', 28, 38, 4, 4);
  rect(ctx, '#1c1917', 27, 34, 2, 8);
  rect(ctx, '#1c1917', 24, 37, 8, 2);

  // Right dormer
  rect(ctx, '#7f1d1d', w - 40, 20, 24, 28);
  rect(ctx, '#c2410c', w - 38, 22, 20, 24);
  rect(ctx, '#fef3c7', w - 36, 32, 16, 14);
  oval(ctx, '#1c1917', w - 28, 38, 5, 5);
  oval(ctx, '#e0f2fe', w - 28, 38, 4, 4);
  rect(ctx, '#1c1917', w - 29, 34, 2, 8);
  rect(ctx, '#1c1917', w - 32, 37, 8, 2);

  // Central Grand Triangular Pediment Dormer (Mái dốc tam giác trung tâm - y: 8..34)
  const pedX = w / 2; // 96
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(pedX, 8);
  ctx.lineTo(pedX - 32, 36);
  ctx.lineTo(pedX + 32, 36);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#c2410c';
  ctx.beginPath();
  ctx.moveTo(pedX, 11);
  ctx.lineTo(pedX - 28, 34);
  ctx.lineTo(pedX + 28, 34);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.moveTo(pedX, 18);
  ctx.lineTo(pedX - 18, 33);
  ctx.lineTo(pedX + 18, 33);
  ctx.closePath();
  ctx.fill();
  rect(ctx, '#7c2d12', pedX - 10, 26, 20, 6);
  for (let vx = pedX - 8; vx <= pedX + 8; vx += 4) {
    rect(ctx, '#fef3c7', vx, 27, 2, 4);
  }

  // 3. UPPER FLOORS: TẦNG 2 & 3 (y: 54..112)
  const colXs = [10, 40, 70, w / 2 - 2, 122, 152, w - 10];
  for (const cx of colXs) {
    rect(ctx, '#b91c1c', cx - 2, 54, 4, 58);
    rect(ctx, '#991b1b', cx - 2, 54, 1, 58);
  }

  for (let bay = 0; bay < 6; bay++) {
    const c1 = colXs[bay] ?? 10;
    const c2 = colXs[bay + 1] ?? 40;
    const wx = c1 + 6;
    const ww = c2 - c1 - 12;

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
    { x: 14, w: 22, h: 48, topH: 12 },
    { x: 44, w: 22, h: 48, topH: 12 },
    { x: 74, w: 48, h: 56, topH: 16 }, // Grand central entrance
    { x: 130, w: 22, h: 48, topH: 12 },
    { x: 160, w: 22, h: 48, topH: 12 },
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

  // Central Entrance Double Doors inside Arch 3 (x: 74..122)
  const cDoorX = 82;
  const cDoorW = 32;
  const cDoorY = bottom - 36;
  rect(ctx, '#1c1917', cDoorX, cDoorY, cDoorW, 30);
  rect(ctx, '#e0f2fe', cDoorX + 2, cDoorY + 2, cDoorW / 2 - 3, 26);
  rect(ctx, '#e0f2fe', cDoorX + cDoorW / 2 + 1, cDoorY + 2, cDoorW / 2 - 3, 26);
  rect(ctx, '#e2e8f0', cDoorX + cDoorW / 2 - 2, cDoorY + 10, 1, 10);
  rect(ctx, '#e2e8f0', cDoorX + cDoorW / 2 + 1, cDoorY + 10, 1, 10);

  // Grand Entrance Steps (Polished stone stairs)
  rect(ctx, '#d4af37', 70, bottom - 6, 56, 4);
  rect(ctx, '#fef08a', 72, bottom - 4, 52, 2);

  // 5. 3 FLAGPOLES IN FRONT OF MAIN ARCH (y: 90..130)
  // Left Flag: DNTU Flag
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(86, 126);
  ctx.lineTo(86, 96);
  ctx.stroke();
  rect(ctx, '#ffffff', 75, 98, 11, 7);
  rect(ctx, '#b91c1c', 79, 100, 3, 4);

  // Center Flag: Vietnam National Flag
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(98, 126);
  ctx.lineTo(98, 90);
  ctx.stroke();
  rect(ctx, '#dc2626', 99, 91, 14, 9);
  rect(ctx, '#b91c1c', 99, 99, 14, 1);
  rect(ctx, '#facc15', 103, 93, 5, 5);
  rect(ctx, '#fde047', 104, 94, 3, 3);

  // Right Flag: DNTU Flag
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(110, 126);
  ctx.lineTo(110, 96);
  ctx.stroke();
  rect(ctx, '#ffffff', 110, 98, 11, 7);
  rect(ctx, '#b91c1c', 114, 100, 3, 4);

  // 6. TOP UNIVERSITY TITLE ON ARCH LEVEL
  rect(ctx, '#991b1b', 62, 118, 72, 14);
  rect(ctx, '#7f1d1d', 62, 118, 72, 1);
  rect(ctx, '#fef08a', 63, 119, 70, 12);
  ctx.font = '800 6.5px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b91c1c';
  ctx.fillText('ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI', w / 2, 125);

  // 7. GRAND CAMPUS STONE MONUMENT (Bia Đá Cổng Trường - y: 168..188)
  const monX = w / 2 - 40;
  const monW = 80;
  const monY = bottom - 20;
  const monH = 18;

  rect(ctx, 'rgba(0, 0, 0, 0.25)', monX - 2, monY - 1, monW + 4, monH + 3);
  rect(ctx, '#d4af37', monX - 1, monY - 1, monW + 2, monH + 2);
  rect(ctx, '#fef08a', monX, monY, monW, monH);

  ctx.font = '800 5.5px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#991b1b';
  ctx.fillText('ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI', monX + monW / 2, monY + 2.5);

  ctx.font = '600 4px sans-serif';
  ctx.fillStyle = '#78350f';
  ctx.fillText('DONG NAI TECHNOLOGY UNIVERSITY', monX + monW / 2, monY + 9);

  rect(ctx, '#991b1b', monX + 2, monY + monH - 4, monW - 4, 3);
  ctx.font = '700 3px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TRUNG THÀNH · TRÁCH NHIỆM · SÁNG TẠO', monX + monW / 2, monY + monH - 3.5);

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
  drawCampusTopiary(38, bottom - 24);
  drawCampusTopiary(68, bottom - 24);
  drawCampusTopiary(118, bottom - 24);
  drawCampusTopiary(148, bottom - 24);

  return canvas;
}

export function paintBuilding(b: Building): HTMLCanvasElement {
  if (b.id === 'vietprodev') {
    return paintVietProDevTownhouse(b);
  }
  if (b.id === 'dntu') {
    return paintDntuBuilding(b);
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
