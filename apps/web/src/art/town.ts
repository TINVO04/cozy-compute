import {
  APARTMENT_COLS,
  APARTMENT_ROWS,
  APARTMENT_THEMES,
  MAP_COLS,
  MAP_ROWS,
  PATHS,
  PIER,
  PLAZA,
  TILE,
  WATER,
  type Building,
} from '@cozy/game-data';
import { hex, INK, mulberry, shade } from './pixel';

const inRect = (x: number, y: number, r: { x: number; y: number; w: number; h: number }) =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** Paints the whole town ground layer (grass, paths, plaza, water, pier, trees) into one canvas. */
export function paintTown(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = MAP_COLS * TILE;
  c.height = MAP_ROWS * TILE;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const rng = mulberry(7);
  const grass = ['#8cc47a', '#86be74', '#91c97f'];
  for (let ty = 0; ty < MAP_ROWS; ty++)
    for (let tx = 0; tx < MAP_COLS; tx++) {
      ctx.fillStyle = grass[(tx * 7 + ty * 13) % 3]!;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = rng() > 0.5 ? '#79b268' : '#a2d48d';
        ctx.fillRect(tx * TILE + Math.floor(rng() * 30), ty * TILE + Math.floor(rng() * 30), 2, 2);
      }
      if (rng() < 0.05) {
        const fx = tx * TILE + 6 + Math.floor(rng() * 20);
        const fy = ty * TILE + 6 + Math.floor(rng() * 20);
        ctx.fillStyle = ['#f2efe7', '#e6b84a', '#d2556a', '#9c8ade'][Math.floor(rng() * 4)]!;
        ctx.fillRect(fx, fy, 2, 2);
        ctx.fillRect(fx + 3, fy + 1, 2, 2);
      }
    }

  // paths
  for (const r of PATHS) {
    ctx.fillStyle = '#e7d6b4';
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  for (const r of PATHS) {
    for (let x = r.x; x < r.x + r.w; x += 8)
      for (let y = r.y; y < r.y + r.h; y += 8) {
        if (rng() < 0.18) {
          ctx.fillStyle = '#d9c59f';
          ctx.fillRect(x + Math.floor(rng() * 6), y + Math.floor(rng() * 6), 2, 2);
        }
      }
  }

  // plaza tiles
  for (let x = PLAZA.x; x < PLAZA.x + PLAZA.w; x += 16)
    for (let y = PLAZA.y; y < PLAZA.y + PLAZA.h; y += 16) {
      ctx.fillStyle = ((x + y) / 16) % 2 === 0 ? '#e9dcc4' : '#e0d0b3';
      ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = '#cdb994';
      ctx.fillRect(x, y + 15, 16, 1);
      ctx.fillRect(x + 15, y, 1, 16);
    }
  ctx.strokeStyle = '#c4ae86';
  ctx.lineWidth = 2;
  ctx.strokeRect(PLAZA.x + 1, PLAZA.y + 1, PLAZA.w - 2, PLAZA.h - 2);

  // water
  for (const w of WATER) {
    ctx.fillStyle = '#6fb6d6';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#e7d6b4';
    ctx.fillRect(w.x, w.y - 4, w.w, 4);
    ctx.fillStyle = '#5aa3c6';
    ctx.fillRect(w.x, w.y, w.w, 3);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rng() > 0.5 ? '#8fd0e8' : '#5fa6c9';
      const x = w.x + Math.floor(rng() * (w.w - 8));
      const y = w.y + 6 + Math.floor(rng() * (w.h - 10));
      ctx.fillRect(x, y, 6, 1);
    }
  }
  // pier
  ctx.fillStyle = '#9c6b45';
  ctx.fillRect(PIER.x, PIER.y, PIER.w, PIER.h);
  for (let y = PIER.y; y < PIER.y + PIER.h; y += 8) {
    ctx.fillStyle = '#b07d54';
    ctx.fillRect(PIER.x, y, PIER.w, 6);
    ctx.fillStyle = '#7a5134';
    ctx.fillRect(PIER.x, y + 6, PIER.w, 2);
  }
  ctx.fillStyle = '#5c3b25';
  [PIER.y + 10, PIER.y + PIER.h - 12].forEach((y) => {
    ctx.fillRect(PIER.x - 3, y, 4, 8);
    ctx.fillRect(PIER.x + PIER.w - 1, y, 4, 8);
  });

  // tree border
  for (let tx = 0; tx < MAP_COLS; tx++)
    for (let ty = 0; ty < MAP_ROWS; ty++) {
      const edge = tx === 0 || ty === 0 || tx === MAP_COLS - 1 || ty === MAP_ROWS - 1;
      if (!edge) continue;
      if (WATER.some((w) => inRect(tx * TILE + 1, ty * TILE + 1, w)) && ty === MAP_ROWS - 1) continue;
      drawTree(ctx, tx * TILE + TILE / 2, ty * TILE + TILE - 2, 0.9 + ((tx * 3 + ty) % 3) * 0.08);
    }
  return c;
}

export function drawTree(ctx: CanvasRenderingContext2D, cx: number, by: number, s = 1) {
  ctx.fillStyle = 'rgba(42,36,56,0.18)';
  ctx.fillRect(cx - 12 * s, by - 3, 24 * s, 4);
  ctx.fillStyle = '#7a5134';
  ctx.fillRect(cx - 3, by - 12 * s, 6, 12 * s);
  const blob = (x: number, y: number, r: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x - r, y - r + 2, r * 2, r * 2 - 4);
    ctx.fillRect(x - r + 2, y - r, r * 2 - 4, r * 2);
  };
  blob(cx, by - 22 * s, 14 * s, INK);
  blob(cx, by - 22 * s, 13 * s, '#3f8a5a');
  blob(cx - 3, by - 25 * s, 9 * s, '#56a36e');
  blob(cx - 5, by - 28 * s, 4 * s, '#79c08a');
}

/** A building sprite with roof, sign, windows and door. Drawn on its own canvas for y-sorting. */
export function paintBuilding(b: Building): HTMLCanvasElement {
  const roofH = 30;
  const c = document.createElement('canvas');
  c.width = b.rect.w + 8;
  c.height = b.rect.h + roofH;
  const ctx = c.getContext('2d')!;
  const ox = 4;
  const top = roofH;
  const wall = hex(b.wall);
  const roof = hex(b.roof);
  const accent = hex(b.accent);
  // shadow
  ctx.fillStyle = 'rgba(42,36,56,0.2)';
  ctx.fillRect(ox + 4, top + b.rect.h - 4, b.rect.w, 6);
  // wall
  ctx.fillStyle = INK;
  ctx.fillRect(ox - 1, top - 1, b.rect.w + 2, b.rect.h + 1);
  ctx.fillStyle = wall;
  ctx.fillRect(ox, top, b.rect.w, b.rect.h - 1);
  ctx.fillStyle = shade(wall, -0.08);
  for (let y = top + 8; y < top + b.rect.h; y += 8) ctx.fillRect(ox, y, b.rect.w, 1);
  ctx.fillStyle = shade(wall, -0.18);
  ctx.fillRect(ox, top + b.rect.h - 6, b.rect.w, 5);
  // roof
  ctx.fillStyle = INK;
  ctx.fillRect(ox - 6, 2, b.rect.w + 12, roofH + 6);
  ctx.fillStyle = roof;
  ctx.fillRect(ox - 5, 3, b.rect.w + 10, roofH + 4);
  for (let y = 7; y < roofH + 6; y += 6) {
    ctx.fillStyle = shade(roof, -0.15);
    ctx.fillRect(ox - 5, y, b.rect.w + 10, 2);
  }
  ctx.fillStyle = shade(roof, 0.2);
  ctx.fillRect(ox - 5, 3, b.rect.w + 10, 2);
  // windows
  const doorX = ox + (b.door.x * TILE - b.rect.x);
  const doorW = b.door.w * TILE;
  for (let x = ox + 10; x + 22 < ox + b.rect.w; x += 36) {
    if (x + 22 > doorX - 4 && x < doorX + doorW + 4) continue;
    ctx.fillStyle = INK;
    ctx.fillRect(x - 1, top + 34, 24, 22);
    ctx.fillStyle = '#bfe3ef';
    ctx.fillRect(x, top + 35, 22, 20);
    ctx.fillStyle = '#e8f6fa';
    ctx.fillRect(x + 2, top + 37, 6, 6);
    ctx.fillStyle = accent;
    ctx.fillRect(x + 10, top + 35, 2, 20);
    ctx.fillRect(x, top + 44, 22, 2);
    ctx.fillRect(x - 2, top + 55, 26, 3);
  }
  // door
  const dy = top + b.rect.h - 44;
  ctx.fillStyle = INK;
  ctx.fillRect(doorX + 7, dy - 1, doorW - 14 + 2, 44);
  ctx.fillStyle = accent;
  ctx.fillRect(doorX + 8, dy, doorW - 14, 43);
  ctx.fillStyle = shade(accent, 0.25);
  ctx.fillRect(doorX + 11, dy + 4, doorW - 20, 14);
  ctx.fillStyle = '#e6b84a';
  ctx.fillRect(doorX + doorW - 13, dy + 22, 3, 3);
  // sign board
  ctx.font = '600 11px "Pixelify Sans", monospace';
  const w = Math.min(b.rect.w - 12, ctx.measureText(b.label).width + 16);
  const sx = ox + (b.rect.w - w) / 2;
  ctx.fillStyle = INK;
  ctx.fillRect(sx - 1, top + 7, w + 2, 20);
  ctx.fillStyle = '#f7f3ec';
  ctx.fillRect(sx, top + 8, w, 18);
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, sx + w / 2, top + 17.5, w - 8);
  return c;
}

export const BUILDING_ROOF = 30;

export function paintProp(kind: 'fountain' | 'board' | 'kiosk' | 'bench' | 'lamp'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  if (kind === 'fountain') {
    c.width = 72;
    c.height = 72;
    ctx.fillStyle = INK;
    ctx.fillRect(3, 23, 66, 42);
    ctx.fillStyle = '#c9c1b4';
    ctx.fillRect(4, 24, 64, 40);
    ctx.fillStyle = '#6fb6d6';
    ctx.fillRect(10, 30, 52, 26);
    ctx.fillStyle = '#8fd0e8';
    ctx.fillRect(14, 34, 16, 2);
    ctx.fillRect(38, 46, 18, 2);
    ctx.fillStyle = '#a79e90';
    ctx.fillRect(4, 58, 64, 6);
    ctx.fillStyle = INK;
    ctx.fillRect(30, 6, 12, 34);
    ctx.fillStyle = '#d9d2c6';
    ctx.fillRect(31, 7, 10, 32);
    ctx.fillStyle = '#8fd0e8';
    ctx.fillRect(33, 0, 6, 8);
    ctx.fillRect(28, 2, 3, 6);
    ctx.fillRect(41, 2, 3, 6);
  } else if (kind === 'board') {
    c.width = 72;
    c.height = 64;
    ctx.fillStyle = '#5c3b25';
    ctx.fillRect(10, 30, 6, 34);
    ctx.fillRect(56, 30, 6, 34);
    ctx.fillStyle = INK;
    ctx.fillRect(1, 1, 70, 44);
    ctx.fillStyle = '#9c6b45';
    ctx.fillRect(2, 2, 68, 42);
    ctx.fillStyle = '#f2e6cc';
    ctx.fillRect(6, 6, 26, 18);
    ctx.fillStyle = '#fbd6c8';
    ctx.fillRect(36, 8, 28, 14);
    ctx.fillStyle = '#d7ecd9';
    ctx.fillRect(10, 26, 22, 14);
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(40, 26, 12, 12);
    ctx.fillStyle = '#ef7a3a';
    ctx.fillRect(52, 30, 3, 2);
    ctx.fillStyle = INK;
    ctx.fillRect(48, 29, 1, 1);
    ctx.fillStyle = '#d2556a';
    [8, 38, 12].forEach((x, i) => ctx.fillRect(x + 8, [7, 9, 27][i]!, 3, 3));
  } else if (kind === 'kiosk') {
    c.width = 80;
    c.height = 76;
    ctx.fillStyle = INK;
    ctx.fillRect(7, 11, 66, 64);
    ctx.fillStyle = '#4b3f8f';
    ctx.fillRect(8, 12, 64, 62);
    ctx.fillStyle = '#f7f3ec';
    ctx.fillRect(14, 20, 52, 30);
    ctx.fillStyle = '#3e9b7a';
    ctx.fillRect(18, 24, 10, 2);
    ctx.fillRect(18, 30, 26, 2);
    ctx.fillRect(18, 36, 18, 2);
    ctx.fillStyle = '#e6b84a';
    ctx.fillRect(18, 42, 30, 3);
    ctx.fillStyle = '#6a5fc0';
    ctx.fillRect(8, 56, 64, 18);
    ctx.fillStyle = INK;
    ctx.fillRect(2, 2, 76, 12);
    ctx.fillStyle = '#e6b84a';
    ctx.fillRect(3, 3, 74, 10);
    ctx.fillStyle = INK;
    ctx.font = '700 9px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AI REWARDS', 40, 11);
  } else if (kind === 'bench') {
    c.width = 48;
    c.height = 24;
    ctx.fillStyle = INK;
    ctx.fillRect(1, 3, 46, 16);
    ctx.fillStyle = '#b07d54';
    ctx.fillRect(2, 4, 44, 5);
    ctx.fillRect(2, 11, 44, 5);
    ctx.fillStyle = '#3a3f58';
    ctx.fillRect(4, 16, 3, 8);
    ctx.fillRect(41, 16, 3, 8);
  } else {
    c.width = 16;
    c.height = 56;
    ctx.fillStyle = INK;
    ctx.fillRect(6, 10, 4, 46);
    ctx.fillStyle = '#3a3f58';
    ctx.fillRect(7, 10, 2, 45);
    ctx.fillStyle = INK;
    ctx.fillRect(2, 0, 12, 12);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(3, 1, 10, 10);
  }
  return c;
}

export const APT_TILE = 32;

/** Apartment interior floor + back wall. */
export function paintApartment(themeId: string): HTMLCanvasElement {
  const theme = APARTMENT_THEMES.find((t) => t.id === themeId) ?? APARTMENT_THEMES[0];
  const c = document.createElement('canvas');
  c.width = APARTMENT_COLS * APT_TILE;
  c.height = APARTMENT_ROWS * APT_TILE;
  const ctx = c.getContext('2d')!;
  for (let y = 1; y < APARTMENT_ROWS; y++)
    for (let x = 0; x < APARTMENT_COLS; x++) {
      ctx.fillStyle = hex((x + y) % 2 ? theme.floor : theme.floorAlt);
      ctx.fillRect(x * APT_TILE, y * APT_TILE, APT_TILE, APT_TILE);
      ctx.fillStyle = shade(hex(theme.floor), -0.1);
      ctx.fillRect(x * APT_TILE, y * APT_TILE + APT_TILE - 1, APT_TILE, 1);
    }
  ctx.fillStyle = hex(theme.wall);
  ctx.fillRect(0, 0, c.width, APT_TILE);
  ctx.fillStyle = shade(hex(theme.wall), -0.08);
  for (let x = 0; x < c.width; x += 12) ctx.fillRect(x, 0, 1, APT_TILE - 6);
  ctx.fillStyle = hex(theme.trim);
  ctx.fillRect(0, APT_TILE - 6, c.width, 6);
  // window
  ctx.fillStyle = INK;
  ctx.fillRect(c.width / 2 - 33, 3, 66, 20);
  ctx.fillStyle = '#bfe3ef';
  ctx.fillRect(c.width / 2 - 32, 4, 64, 18);
  ctx.fillStyle = hex(theme.trim);
  ctx.fillRect(c.width / 2 - 1, 4, 2, 18);
  return c;
}
