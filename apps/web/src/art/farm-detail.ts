import type { Rect } from '@cozy/game-data';
import { mulberry, shade } from './pixel';
import { TOWN_PALETTE } from './town-landscape';

// The farm uses the town's materials, pixel grid and upper-left daylight.
export const FARM_PALETTE = {
  ...TOWN_PALETTE,
  cream: '#f2e5c5',
  timber: '#8b6647',
  timberLight: '#c9a67a',
  terracotta: '#af7057',
  soil: '#927354',
};

export function box(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function ellipse(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  rx: number,
  ry: number,
) {
  for (let dy = -Math.floor(ry); dy <= ry; dy++) {
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    box(ctx, color, x - dx, y + dy, dx * 2 + 1, 1);
  }
}

export function flowerBed(ctx: CanvasRenderingContext2D, r: Rect, seed = 1) {
  const rng = mulberry(seed);

  // 1. Terracotta brick / river-stone garden bed border edging
  box(ctx, '#26180f', r.x - 2, r.y - 1, r.w + 4, r.h + 5);
  box(ctx, '#60422b', r.x - 2, r.y - 2, r.w + 4, 3);
  box(ctx, '#8d6342', r.x - 2, r.y - 3, r.w + 4, 2);
  box(ctx, '#b58359', r.x - 1, r.y - 3, r.w + 2, 1); // stone rim highlight

  // Vertical mortar lines between border stones
  for (let sx = r.x; sx < r.x + r.w; sx += 8) {
    box(ctx, '#332014', sx, r.y - 3, 1, 3);
  }

  // 2. Rich dark fertile humus garden soil
  box(ctx, '#27170e', r.x, r.y, r.w, r.h);
  box(ctx, '#3b2416', r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  // Soil texture flecks
  for (let i = 0; i < Math.floor((r.w * r.h) / 28); i++) {
    const fx = r.x + 2 + Math.floor(rng() * (r.w - 4));
    const fy = r.y + 2 + Math.floor(rng() * (r.h - 4));
    box(ctx, rng() > 0.5 ? '#1f130b' : '#4d301e', fx, fy, 2, 1);
  }

  // 3. Dense clusters of lush garden foliage & vibrant floral blossoms
  const flowerPalettes = [
    { main: '#f43f5e', light: '#fda4af', center: '#fef08a' }, // Hồng nhung
    { main: '#f59e0b', light: '#fde047', center: '#78350f' }, // Cúc vạn thọ vàng cam
    { main: '#a855f7', light: '#d8b4fe', center: '#fef08a' }, // Dạ yến thảo tím
    { main: '#ffffff', light: '#f1f5f9', center: '#eab308' }, // Hoa lài trắng
    { main: '#ef4444', light: '#fca5a5', center: '#fef08a' }, // Mẫu đơn đỏ
  ];

  for (let y = r.y + 3; y < r.y + r.h - 2; y += 6) {
    for (let x = r.x + 3; x < r.x + r.w - 2; x += 7) {
      const jx = x + Math.floor((rng() - 0.5) * 3);
      const jy = y + Math.floor((rng() - 0.5) * 2);

      // Lush green leaf rosette
      box(ctx, '#143818', jx - 3, jy + 1, 7, 3);
      box(ctx, '#225d28', jx - 2, jy, 5, 3);
      box(ctx, '#3ea247', jx - 2, jy - 1, 4, 2);
      box(ctx, '#6ee7b7', jx - 1, jy - 1, 2, 1);

      // Blossom
      const pal = flowerPalettes[Math.floor(rng() * flowerPalettes.length)]!;
      box(ctx, pal.main, jx - 2, jy - 1, 5, 3);
      box(ctx, pal.main, jx - 1, jy - 2, 3, 5);
      box(ctx, pal.light, jx - 1, jy - 1, 3, 2);
      box(ctx, pal.center, jx, jy, 1, 1); // center pistil
    }
  }
}

export function paving(ctx: CanvasRenderingContext2D, r: Rect) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  box(ctx, '#b9ad91', r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += 12) {
    const offset = ((y - r.y) / 12) % 2 ? 12 : 0;
    for (let x = r.x - offset; x < r.x + r.w; x += 24) {
      box(ctx, '#e4d7b9', x + 1, y + 1, 23, 11);
      box(ctx, '#f2e8d1', x + 2, y + 1, 21, 1);
      box(ctx, '#cdbd9d', x + 3, y + 10, 19, 1);
    }
  }
  ctx.restore();
}

export function tiledRoof(ctx: CanvasRenderingContext2D, r: Rect, color: string) {
  box(ctx, '#51483b', r.x - 2, r.y - 2, r.w + 4, r.h + 6);
  box(ctx, color, r.x, r.y, r.w, r.h);
  for (let y = r.y; y < r.y + r.h; y += 6) {
    box(ctx, shade(color, 0.22), r.x, y, r.w, 1);
    box(ctx, shade(color, -0.22), r.x, y + 4, r.w, 2);
    for (let x = r.x + (((y - r.y) / 6) % 2 ? 5 : 0); x < r.x + r.w; x += 10) {
      box(ctx, shade(color, -0.28), x, y + 1, 1, 3);
    }
  }
  box(ctx, shade(color, 0.4), r.x, r.y - 1, r.w, 2);
  box(ctx, '#6d5140', r.x - 2, r.y + r.h, r.w + 4, 3);
}

export function fence(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  box(ctx, '#52664530', x + 3, y + 5, width, 5);
  for (const dy of [-7, -1]) {
    box(ctx, '#826348', x, y + dy, width, 3);
    box(ctx, '#dec7a0', x, y + dy, width, 1);
  }
  for (let px = x; px <= x + width - 4; px += 24) {
    box(ctx, '#795c42', px, y - 11, 5, 17);
    box(ctx, '#c6a579', px, y - 11, 3, 15);
    box(ctx, '#f0d9b1', px, y - 12, 5, 2);
    box(ctx, '#66523e', px + 2, y - 5, 1, 1);
  }
}
