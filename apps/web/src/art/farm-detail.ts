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
  box(ctx, '#667953', r.x - 2, r.y, r.w + 4, r.h + 4);
  box(ctx, '#d4c2a0', r.x - 2, r.y - 2, r.w + 4, r.h + 3);
  box(ctx, '#68844f', r.x, r.y, r.w, r.h);
  for (let y = r.y + 4; y < r.y + r.h - 2; y += 7) {
    for (let x = r.x + 4; x < r.x + r.w - 2; x += 8) {
      const col = ['#f4deb2', '#dd9b99', '#e8bd6c', '#b4a4c9'][Math.floor(rng() * 4)]!;
      box(ctx, '#a2bc79', x - 3, y + 1, 6, 3);
      box(ctx, col, x - 2, y, 5, 2);
      box(ctx, col, x, y - 2, 2, 5);
      box(ctx, '#fff1cd', x, y, 1, 1);
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
