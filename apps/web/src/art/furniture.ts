import { PixelGrid, shade } from './pixel';

const INK = '#4a434a';
const WOOD = '#b68b63';
const CREAM = '#f3e9d3';

/** All catalogue furniture uses a shared light source and a clean 16px logical tile. */
export function drawFurniture(sprite: string, size: { w: number; h: number }): PixelGrid {
  const [kind, color = '#b7a2bc'] = sprite.split(':');
  const W = size.w * 16,
    H = size.h * 16 + 8;
  const g = new PixelGrid(W, H);
  const cx = Math.floor(W / 2),
    cy = Math.floor(H / 2);
  const c = color,
    d = shade(c, -0.22),
    l = shade(c, 0.25);
  const box = (x: number, y: number, w: number, h: number, col: string) => g.rect(x, y, w, h, col);
  const oval = (x: number, y: number, rx: number, ry: number, col: string) => g.ellipse(x, y, rx, ry, col);
  const face = (x: number, y: number, spacing = 4) => {
    box(x - spacing, y, 1, 2, INK);
    box(x + spacing, y, 1, 2, INK);
    g.line(x - 2, y + 3, x, y + 4, INK);
    g.line(x, y + 4, x + 2, y + 3, INK);
  };
  const feet = () => {
    box(3, H - 4, 2, 3, '#756451');
    box(W - 5, H - 4, 2, 3, '#756451');
  };
  const mug = (x: number, y: number) => {
    box(x, y, 4, 4, CREAM);
    box(x + 1, y, 2, 1, '#805d45');
    box(x + 4, y + 1, 1, 2, CREAM);
  };

  switch (kind) {
    case 'chair':
      box(3, 3, 10, 12, WOOD);
      box(4, 4, 8, 8, c);
      box(4, 4, 8, 2, l);
      box(2, 14, 12, 6, c);
      box(3, 14, 10, 2, l);
      box(2, 19, 12, 1, d);
      feet();
      break;
    case 'table':
      box(2, 10, W - 4, 9, WOOD);
      box(3, 10, W - 6, 2, '#dfba87');
      box(3, 19, 2, 4, '#86654a');
      box(W - 5, 19, 2, 4, '#86654a');
      mug(6, 7);
      box(W - 12, 6, 7, 5, '#d5b5a4');
      box(W - 11, 6, 5, 1, CREAM);
      break;
    case 'plant':
      box(4, 15, 8, 7, '#c28e75');
      box(3, 14, 10, 2, '#e1b59b');
      g.line(8, 15, 8, 6, '#67805b');
      oval(4, 8, 3, 4, d);
      oval(11, 5, 3, 4, c);
      oval(7, 4, 3, 3, l);
      oval(12, 11, 3, 2, c);
      box(5, 18, 2, 3, '#dab092');
      break;
    case 'rug':
    case 'rug_checker':
      box(1, 9, W - 2, H - 11, c);
      box(2, 10, W - 4, H - 13, l);
      for (let y = 11; y < H - 3; y += 5) {
        for (let x = 3; x < W - 3; x += 5) {
          if (((x - 3) / 5 + (y - 11) / 5) % 2 === 0)
            box(x, y, Math.min(5, W - 3 - x), Math.min(5, H - 3 - y), c);
        }
      }
      for (let x = 3; x < W - 2; x += 3) {
        g.set(x, 8, CREAM);
        g.set(x, H - 2, CREAM);
      }
      break;
    case 'rug_smile':
      oval(cx, cy + 4, W / 2 - 2, (H - 12) / 2, c);
      oval(cx - 2, cy + 3, W / 2 - 5, (H - 15) / 2, l);
      box(cx - 7, cy, 2, 4, INK);
      box(cx + 5, cy, 2, 4, INK);
      g.line(cx - 7, cy + 7, cx - 3, cy + 11, INK);
      g.line(cx - 3, cy + 11, cx + 3, cy + 11, INK);
      g.line(cx + 3, cy + 11, cx + 7, cy + 7, INK);
      break;
    case 'lamp':
      box(7, 8, 2, 13, '#8e8067');
      oval(8, 21, 5, 1, WOOD);
      box(4, 2, 8, 3, c);
      box(2, 5, 12, 5, c);
      box(3, 5, 10, 1, l);
      box(6, 10, 4, 1, '#f9e7af');
      break;
    case 'bed':
      box(1, 3, W - 2, 10, WOOD);
      box(2, 4, W - 4, 1, '#dcc19a');
      box(2, 11, W - 4, H - 14, CREAM);
      for (const x of [4, W - 13]) {
        box(x, 8, 9, 7, '#f9f1e1');
        box(x + 1, 9, 7, 1, '#ffffff');
      }
      box(2, 17, W - 4, H - 20, c);
      box(3, 18, W - 6, 2, l);
      for (let x = 5; x < W - 4; x += 6) box(x, 21, 2, Math.max(0, H - 25), shade(c, 0.13));
      box(2, H - 9, W - 4, 5, '#d6b792');
      box(3, H - 9, W - 6, 1, CREAM);
      box(2, H - 4, W - 4, 2, '#967354');
      break;
    case 'sofa':
      box(1, 5, W - 2, 9, d);
      box(3, 5, W - 6, 2, l);
      box(3, 13, W - 6, 7, c);
      box(4, 13, W - 8, 2, l);
      box(cx, 14, 1, 6, d);
      box(1, 10, 3, 11, c);
      box(W - 4, 10, 3, 11, c);
      box(5, 9, 6, 6, '#d9d1aa');
      box(W - 12, 9, 6, 6, '#c6b2d3');
      feet();
      break;
    case 'bookshelf':
      box(1, 2, W - 2, H - 3, WOOD);
      box(3, 3, W - 6, H - 6, '#826951');
      for (const y of [4, 12]) {
        for (let x = 4; x < W - 12; x += 4) {
          const col = ['#b9c4a4', '#d7a693', '#b3a6c2', '#e0c897'][(x / 4) % 4]!;
          box(x, y, 3, 6, col);
          box(x, y, 2, 1, shade(col, 0.2));
        }
        box(2, y + 7, W - 4, 2, '#d2b18b');
      }
      box(W - 10, 5, 5, 5, '#d7b799');
      oval(W - 8, 3, 3, 2, '#88a17c');
      box(W - 10, 14, 5, 4, '#efe0bd');
      break;
    case 'tv':
      box(2, 3, W - 4, 13, '#535461');
      box(3, 4, W - 6, 10, '#a3c5bd');
      box(4, 5, W - 8, 4, '#c9e0d4');
      box(4, 10, W - 8, 3, '#89ab8e');
      oval(cx, 10, 5, 3, '#ddc191');
      box(cx + 3, 7, 4, 3, '#ddc191');
      g.set(cx + 5, 7, INK);
      box(cx - 1, 15, 2, 3, INK);
      box(1, 18, W - 2, 4, WOOD);
      box(3, 22, 2, 1, '#826951');
      box(W - 5, 22, 2, 1, '#826951');
      break;
    case 'aquarium':
      box(1, 3, W - 2, 14, '#94c4c3');
      box(2, 5, W - 4, 10, '#679ca6');
      box(2, 14, W - 4, 2, '#e1d3ac');
      box(3, 4, W - 6, 1, '#d7e9dd');
      g.line(5, 14, 6, 7, '#83ac8b');
      g.line(W - 7, 14, W - 5, 8, '#83ac8b');
      box(cx - 2, 9, 5, 3, '#dba888');
      g.set(cx + 2, 9, INK);
      g.set(cx - 3, 10, '#e2c79d');
      box(1, 17, W - 2, 6, WOOD);
      box(cx, 18, 1, 4, '#826951');
      g.set(4, 7, '#e5f3e8');
      g.set(W - 5, 6, '#e5f3e8');
      break;
    case 'duckstatue':
      box(3, 18, 10, 5, '#d8cbbb');
      box(2, 17, 12, 2, CREAM);
      oval(7, 13, 5, 4, c);
      oval(10, 7, 3, 4, c);
      box(12, 8, 3, 2, '#c78851');
      g.set(11, 6, INK);
      box(8, 2, 5, 2, '#e6c17a');
      g.set(8, 1, '#e6c17a');
      g.set(12, 1, '#e6c17a');
      g.set(5, 11, l);
      box(5, 20, 6, 1, '#c4a561');
      break;
    case 'gamingchair':
      box(3, 2, 10, 14, '#59606d');
      box(4, 3, 8, 12, c);
      box(5, 4, 6, 3, '#657080');
      box(6, 9, 4, 2, '#657080');
      box(2, 15, 12, 4, c);
      box(1, 12, 2, 5, '#59606d');
      box(13, 12, 2, 5, '#59606d');
      box(7, 19, 2, 3, '#7e8587');
      box(2, 22, 12, 1, '#59606d');
      break;
    case 'arcade':
      box(2, 2, W - 4, H - 3, d);
      box(3, 3, W - 6, H - 6, c);
      box(3, 3, W - 6, 5, '#e2c783');
      box(5, 5, 6, 1, INK);
      box(3, 10, W - 6, 11, '#536076');
      box(4, 11, W - 8, 8, '#91b6ba');
      box(6, 15, 4, 3, '#e9c891');
      g.set(7, 14, CREAM);
      box(2, 22, W - 4, 4, '#675c78');
      box(4, 21, 2, 2, '#d697a0');
      g.set(10, 23, '#e5cb8a');
      box(5, 29, W - 10, 6, d);
      box(7, 30, 2, 1, '#e5cb8a');
      break;
    case 'cattree':
      box(1, H - 5, W - 2, 4, '#ba9475');
      box(3, H - 16, W - 6, 11, '#d6b899');
      oval(cx, H - 11, 4, 4, '#816853');
      box(cx - 2, H - 12, 4, 2, '#cab493');
      box(6, 12, 3, H - 28, CREAM);
      box(1, 13, 10, 3, '#d6b899');
      box(10, 4, 2, 10, CREAM);
      box(6, 2, 9, 3, '#d6b899');
      break;
    case 'capybara':
      oval(cx, H - 10, W / 2 - 2, 8, c);
      oval(cx - 3, H - 12, W / 2 - 6, 6, l);
      oval(cx + 5, H - 17, 7, 6, c);
      oval(cx + 2, H - 23, 2, 2, d);
      box(cx + 6, H - 18, 1, 2, INK);
      box(cx + 7, H - 14, 4, 1, d);
      box(5, H - 5, 5, 2, d);
      box(W - 10, H - 5, 5, 2, d);
      oval(cx + 5, H - 25, 3, 2, '#de9b63');
      g.set(cx + 5, H - 28, '#91a078');
      break;
    case 'mushroom':
      box(6, 12, 4, 10, CREAM);
      oval(8, 21, 5, 1, '#deceb0');
      oval(8, 10, 6, 6, c);
      box(2, 10, 12, 4, c);
      box(3, 13, 10, 1, d);
      box(4, 7, 3, 2, '#f9edd7');
      box(10, 9, 2, 2, '#f9edd7');
      face(8, 17, 2);
      break;
    case 'boba':
      box(7, 1, 2, 6, '#b695be');
      box(6, 2, 1, 5, '#ddcbe0');
      oval(8, 8, 6, 2, '#b49276');
      box(3, 9, 10, 12, c);
      box(4, 10, 8, 8, '#dec8a6');
      box(2, 7, 12, 2, '#eee0c4');
      for (const [x, y] of [
        [5, 18],
        [9, 18],
        [7, 20],
        [11, 20],
      ])
        oval(x!, y!, 1, 1, '#755342');
      face(8, 12, 3);
      box(4, 10, 1, 6, '#f0e2cd');
      break;
    case 'mirror':
      for (let y = 2; y < H - 3; y++) {
        const offset = Math.round(Math.sin(y * 0.4) * 1.5);
        box(3 + offset, y, W - 6, 1, c);
        box(5 + offset, y, W - 10, 1, '#a4c3ca');
        if (y % 6 < 3) box(6 + offset, y, 2, 1, '#d9e8e2');
      }
      box(3, H - 4, W - 6, 2, d);
      break;
    case 'duckplush':
      oval(8, 16, 6, 6, c);
      oval(9, 8, 4, 5, l);
      box(12, 9, 3, 2, '#c58e5e');
      box(10, 7, 1, 2, INK);
      oval(5, 16, 3, 3, d);
      box(4, 21, 3, 1, '#c58e5e');
      box(10, 21, 3, 1, '#c58e5e');
      box(6, 7, 7, 2, '#596674');
      box(7, 7, 2, 1, '#a9babe');
      break;
    case 'cloud':
      oval(cx, 16, W / 2 - 3, 5, c);
      oval(cx - 7, 12, 5, 5, c);
      oval(cx, 10, 6, 6, l);
      oval(cx + 7, 12, 5, 5, c);
      face(cx, 15, 5);
      break;
    case 'desk':
      box(2, 15, W - 4, 5, WOOD);
      box(3, 15, W - 6, 1, '#debc93');
      box(3, 20, 3, H - 22, '#947f6d');
      box(W - 6, 20, 3, H - 22, '#947f6d');
      box(5, 2, W - 14, 11, '#5f6071');
      box(6, 3, W - 16, 8, '#a5b8bc');
      box(8, 5, W - 20, 2, '#d5c3dc');
      box(8, 8, 7, 1, CREAM);
      box(cx - 1, 13, 3, 2, '#5f6071');
      box(6, 17, W - 17, 2, '#ded2d9');
      mug(W - 9, 12);
      break;
    case 'sign_touchgrass':
      box(2, 6, W - 4, 14, '#b78aa5');
      box(3, 7, W - 6, 12, '#e6d4c1');
      box(5, 10, 3, 7, '#82a481');
      box(4, 9, 5, 3, '#9ab38c');
      // A readable 3×5 pixel word mark: GRASS.
      ['111100101101111', '110101110101101', '010101111101101', '111100111001111', '111100111001111'].forEach(
        (glyph, i) => {
          for (let p = 0; p < glyph.length; p++) {
            if (glyph[p] === '1') g.set(11 + i * 4 + (p % 3), 11 + Math.floor(p / 3), '#766579');
          }
        },
      );
      box(4, 20, 2, 3, '#8c7082');
      box(W - 6, 20, 2, 3, '#8c7082');
      break;
    case 'snackcart':
      box(2, 8, W - 4, 2, c);
      box(2, 18, W - 4, 2, c);
      box(2, H - 5, W - 4, 2, c);
      box(2, 8, 2, H - 11, d);
      box(W - 4, 8, 2, H - 11, d);
      for (const y of [4, 14, H - 11]) {
        box(5, y, 5, 4, '#dac391');
        box(11, y + 1, 3, 3, '#bd8d92');
      }
      box(3, H - 2, 2, 1, INK);
      box(W - 5, H - 2, 2, 1, INK);
      break;
    default:
      // Visible fallback only for unknown admin-defined sprites.
      box(2, 7, W - 4, H - 9, c);
      box(3, 8, W - 6, 2, l);
  }
  g.outline(INK);
  return g;
}

/** Rotate the original artwork, then fit its overhang into the rotated tile footprint. */
export function drawRotatedFurniture(
  sprite: string,
  size: { w: number; h: number },
  rotation: 0 | 90 | 180 | 270,
): PixelGrid {
  const original = drawFurniture(sprite, size);
  if (rotation === 0) return original;
  const sideways = rotation === 90 || rotation === 270;
  const rotated = new PixelGrid(sideways ? original.h : original.w, sideways ? original.w : original.h);
  for (let y = 0; y < original.h; y++) {
    for (let x = 0; x < original.w; x++) {
      const color = original.get(x, y);
      if (rotation === 90) rotated.set(original.h - 1 - y, x, color);
      else if (rotation === 180) rotated.set(original.w - 1 - x, original.h - 1 - y, color);
      else rotated.set(y, original.w - 1 - x, color);
    }
  }
  const fitted = new PixelGrid((sideways ? size.h : size.w) * 16, (sideways ? size.w : size.h) * 16 + 8);
  for (let y = 0; y < fitted.h; y++) {
    for (let x = 0; x < fitted.w; x++) {
      fitted.set(
        x,
        y,
        rotated.get(Math.floor((x * rotated.w) / fitted.w), Math.floor((y * rotated.h) / fitted.h)),
      );
    }
  }
  return fitted;
}
