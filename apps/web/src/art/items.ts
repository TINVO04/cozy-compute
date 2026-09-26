import { INK, PixelGrid, shade } from './pixel';
import { drawAvatar } from './avatar';
import { DEFAULT_APPEARANCE } from '@cozy/game-data';

/** Furniture sprite drawn on a (w*16) x (h*16 + 8) grid so tall pieces overlap the tile above. */
export function drawFurniture(sprite: string, size: { w: number; h: number }): PixelGrid {
  const [kind, color = '#888888'] = sprite.split(':');
  const W = size.w * 16;
  const H = size.h * 16 + 8;
  const g = new PixelGrid(W, H);
  const c = color;
  const d = shade(c, -0.25);
  const l = shade(c, 0.25);
  const wood = '#8a5a3b';
  const woodD = shade(wood, -0.25);
  switch (kind) {
    case 'chair':
      g.rect(3, 4, 10, 10, c);
      g.rect(3, 4, 10, 2, l);
      g.rect(3, 14, 10, 4, d);
      g.rect(3, 18, 2, 4, woodD);
      g.rect(11, 18, 2, 4, woodD);
      g.rect(12, 20, 1, 3, woodD);
      break;
    case 'table':
      g.rect(1, 10, W - 2, 6, c);
      g.rect(1, 10, W - 2, 1, l);
      g.rect(1, 16, W - 2, 2, d);
      g.rect(3, 18, 2, 5, d);
      g.rect(W - 5, 18, 2, 5, d);
      g.rect(8, 7, 5, 3, '#e6b84a');
      g.rect(9, 6, 3, 1, '#f7f4ee');
      g.rect(W - 12, 8, 4, 2, '#e0735b');
      break;
    case 'plant':
      g.rect(4, 16, 8, 7, '#c0604a');
      g.rect(4, 16, 8, 1, shade('#c0604a', 0.2));
      g.rect(3, 6, 4, 6, c);
      g.rect(9, 4, 4, 8, c);
      g.rect(6, 1, 4, 11, l);
      g.rect(5, 11, 6, 5, d);
      break;
    case 'rug':
      g.rect(1, 9, W - 2, H - 11, c);
      g.rect(3, 11, W - 6, H - 15, l);
      g.rect(5, 13, W - 10, H - 19, c);
      for (let x = 2; x < W - 2; x += 3) {
        g.set(x, 8, d);
        g.set(x, H - 2, d);
      }
      break;
    case 'lamp':
      g.rect(7, 10, 2, 11, '#3a3f58');
      g.rect(5, 21, 6, 2, '#3a3f58');
      g.rect(3, 2, 10, 8, c);
      g.rect(3, 2, 10, 2, l);
      g.rect(4, 9, 8, 1, d);
      break;
    case 'bed':
      g.rect(1, 6, W - 2, 6, wood);
      g.rect(1, 12, W - 2, H - 14, '#f7f4ee');
      g.rect(1, 18, W - 2, H - 20, c);
      g.rect(1, 18, W - 2, 2, l);
      g.rect(4, 12, 10, 5, '#ffffff');
      g.rect(W - 14, 12, 10, 5, '#ffffff');
      g.rect(1, H - 3, W - 2, 2, woodD);
      break;
    case 'sofa':
      g.rect(1, 6, W - 2, 8, d);
      g.rect(1, 12, W - 2, 8, c);
      g.rect(1, 12, W - 2, 2, l);
      g.rect(0, 9, 3, 12, d);
      g.rect(W - 3, 9, 3, 12, d);
      g.rect(W / 2, 13, 1, 6, d);
      g.rect(2, 21, 2, 2, woodD);
      g.rect(W - 4, 21, 2, 2, woodD);
      break;
    case 'bookshelf':
      g.rect(1, 0, W - 2, H - 1, wood);
      g.rect(3, 2, W - 6, H - 5, woodD);
      [2, 10, 18].forEach((y) => g.rect(3, y + 6, W - 6, 1, wood));
      {
        const cols = ['#e0735b', '#5b57a6', '#3e9b7a', '#e6b84a', '#6f9fe0', '#d2556a'];
        let i = 0;
        for (const shelfY of [3, 11, 19])
          for (let x = 4; x < W - 4; x += 3) {
            const h = 4 + ((i * 7) % 3);
            g.rect(x, shelfY + 5 - h + 1, 2, h, cols[i++ % cols.length]!);
          }
      }
      break;
    case 'tv':
      g.rect(2, 3, W - 4, 13, INK);
      g.rect(4, 5, W - 8, 9, '#4f6fd1');
      g.rect(5, 6, 6, 2, '#9fc2ff');
      g.rect(8, 16, W - 16, 2, INK);
      g.rect(3, 18, W - 6, 5, wood);
      g.rect(3, 18, W - 6, 1, shade(wood, 0.2));
      break;
    case 'aquarium':
      g.rect(1, 4, W - 2, 13, '#bfe8f2');
      g.rect(2, 5, W - 4, 11, c);
      g.rect(2, 13, W - 4, 3, '#e6d3a3');
      g.rect(8, 8, 4, 2, '#ef7a3a');
      g.set(7, 9, '#ef7a3a');
      g.rect(20, 10, 3, 2, '#e6c63a');
      g.rect(14, 9, 1, 4, '#3e9b7a');
      g.rect(1, 17, W - 2, 6, '#3a3f58');
      break;
    case 'duckstatue':
      g.rect(4, 18, 8, 5, '#b8b3ad');
      g.rect(4, 18, 8, 1, '#d8d4cf');
      g.rect(3, 10, 9, 7, c);
      g.rect(8, 4, 5, 6, c);
      g.rect(13, 7, 2, 2, '#ef7a3a');
      g.set(11, 6, INK);
      g.rect(4, 11, 4, 2, l);
      break;
    default:
      g.rect(2, 8, W - 4, H - 10, c);
  }
  g.outline(INK);
  return g;
}

/** 24x24 icon for any catalogue item, used in shop cards and inventory. */
export function itemIcon(
  sprite: string,
  type: 'clothing' | 'furniture',
  size = { w: 1, h: 1 },
  scale = 3,
): string {
  const key = `${sprite}|${type}|${size.w}x${size.h}|${scale}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  let canvas: HTMLCanvasElement;
  if (type === 'furniture') {
    canvas = drawFurniture(sprite, size).toCanvas(size.w > 1 || size.h > 1 ? Math.max(1, scale - 1) : scale);
  } else {
    const [kind] = sprite.split(':');
    const slot = ['beanie', 'cap', 'chef', 'cone', 'crown'].includes(kind!)
      ? 'hat'
      : ['glasses', 'shades', 'mustache'].includes(kind!)
        ? 'face'
        : 'top';
    const a = { ...DEFAULT_APPEARANCE, hairStyle: 'bald' as const, [slot]: sprite };
    const full = drawAvatar(a, 0, 0);
    // crop to the relevant region
    const crop = slot === 'top' ? { y: 12, h: 12 } : { y: 0, h: 15 };
    const g = new PixelGrid(16, crop.h);
    for (let y = 0; y < crop.h; y++) for (let x = 0; x < 16; x++) g.set(x, y, full.get(x, y + crop.y));
    canvas = g.toCanvas(scale);
  }
  const url = canvas.toDataURL();
  iconCache.set(key, url);
  return url;
}
const iconCache = new Map<string, string>();

export function duckGrid(): PixelGrid {
  const g = new PixelGrid(12, 11);
  const y = '#f2c230';
  g.rect(1, 5, 9, 5, y);
  g.rect(5, 1, 5, 5, y);
  g.rect(10, 3, 2, 2, '#ef7a3a');
  g.set(8, 2, INK);
  g.rect(2, 6, 3, 1, shade(y, 0.35));
  g.rect(1, 9, 9, 1, shade(y, -0.2));
  g.outline(INK);
  return g;
}
