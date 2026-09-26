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

  toCanvas(scale: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w * scale;
    c.height = this.h * scale;
    this.drawTo(c.getContext('2d')!, 0, 0, scale);
    return c;
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
