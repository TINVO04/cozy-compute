/** Tiny pixel canvas: draw on a logical grid, add an outline, render crisp at any integer scale. */
export class PixelGrid {
  readonly px: (string | null)[];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.px = new Array(w * h).fill(null);
  }

  set(x: number, y: number, c: string | null) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }

  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x] ?? null;
  }

  rect(x: number, y: number, w: number, h: number, c: string | null) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  /** Adds a 1px outline around every filled region. */
  outline(color: string) {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1))
          add.push([x, y]);
      }
    for (const [x, y] of add) this.set(x, y, color);
  }

  mirror(): PixelGrid {
    const g = new PixelGrid(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) g.set(this.w - 1 - x, y, this.get(x, y));
    return g;
  }

  drawTo(ctx: CanvasRenderingContext2D, ox: number, oy: number, scale: number) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string | null) {
    const minX = Math.max(0, Math.floor(cx - rx));
    const maxX = Math.min(this.w - 1, Math.ceil(cx + rx));
    const minY = Math.max(0, Math.floor(cy - ry));
    const maxY = Math.min(this.h - 1, Math.ceil(cy + ry));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          this.set(x, y, c);
        }
      }
    }
  }

  circle(cx: number, cy: number, r: number, c: string | null) {
    this.ellipse(cx, cy, r, r, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string | null) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  dither(x: number, y: number, w: number, h: number, c1: string | null, c2: string | null) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        this.set(x + i, y + j, (i + j) % 2 === 0 ? c1 : c2);
      }
    }
  }

  toCanvas(scale: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w * scale;
    c.height = this.h * scale;
    this.drawTo(c.getContext('2d')!, 0, 0, scale);
    return c;
  }

  toDataURL(scale: number): string {
    if (typeof document === 'undefined') return '';
    return this.toCanvas(scale).toDataURL();
  }
}

export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (v: number) =>
    Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** Deterministic PRNG for stable decorative noise. */
export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const INK = '#2a2438';
