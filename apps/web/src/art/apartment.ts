import { APARTMENT_COLS, APARTMENT_ROWS, APARTMENT_THEMES, TILE } from '@cozy/game-data';
import { hex, PixelGrid, shade } from './pixel';

export const APT_TILE = TILE;
export const APT_ART_TOP = 48;
export const APT_ART_SIDE = 12;

/** Walls extend outside the placement grid; saved furniture coordinates stay unchanged. */
export function paintApartment(themeId: string): HTMLCanvasElement {
  const theme = APARTMENT_THEMES.find((t) => t.id === themeId) ?? APARTMENT_THEMES[0]!;
  const w = APARTMENT_COLS * 16,
    h = APARTMENT_ROWS * 16;
  const g = new PixelGrid(w + 12, h + 32);
  const x0 = 6,
    floorY = 40;
  const wall = hex(theme.wall),
    trim = hex(theme.trim),
    floor = hex(theme.floor);
  const dark = theme.id === 'night';
  // A cutaway room with a thick shell, rather than a strip of wallpaper.
  g.rect(x0 + 3, 25, w, h + 2, '#252836');
  g.rect(x0 - 3, 0, w + 6, 41, shade(trim, -0.25));
  g.rect(x0 - 2, 2, w + 4, 37, wall);
  g.rect(x0 - 3, 0, w + 6, 3, shade(trim, 0.35));
  g.rect(x0, 4, w, 2, shade(wall, 0.3));
  // Wainscot, subtle panel lines and a clean skirting board.
  g.rect(x0, 28, w, 10, shade(wall, -0.08));
  for (let x = x0 + 10; x < x0 + w; x += 20) {
    g.rect(x, 30, 1, 7, shade(wall, -0.14));
  }
  g.rect(x0, 27, w, 2, shade(trim, 0.28));
  g.rect(x0, 38, w, 2, trim);

  // Long offset oak planks, low contrast so the furniture remains the focus.
  g.rect(x0, floorY, w, h - 16, shade(floor, -0.15));
  for (let y = floorY; y < h + 24; y += 8) {
    const row = (y - floorY) / 8;
    for (let x = x0 - (row % 3) * 16; x < x0 + w; x += 48) {
      const start = Math.max(x0, x),
        end = Math.min(x0 + w, x + 48);
      const color = row % 3 === 1 ? hex(theme.floorAlt) : floor;
      g.rect(start, y, end - start - 1, 7, color);
      g.rect(start + 1, y, end - start - 2, 1, shade(color, 0.12));
      g.rect(start + 4, y + 4, Math.max(0, end - start - 12), 1, shade(color, -0.04));
    }
  }
  // Window alcove, split glazing, linen curtains, sunlight or a quiet night view.
  const wx = x0 + Math.floor(w / 2) - 30;
  g.rect(wx - 2, 7, 64, 26, trim);
  g.rect(wx, 9, 60, 22, dark ? '#464e72' : '#b7d8ce');
  g.rect(wx + 1, 10, 58, 12, dark ? '#555c85' : '#cfe5db');
  g.rect(wx + 1, 23, 58, 7, dark ? '#39435f' : '#8dac8a');
  g.rect(wx + 5, 18, 13, 3, dark ? '#bfc6e2' : '#f5f1df');
  g.rect(wx + 9, 16, 8, 3, dark ? '#bfc6e2' : '#f5f1df');
  g.rect(wx + 29, 9, 2, 22, trim);
  g.rect(wx, 20, 60, 2, shade(trim, 0.32));
  g.rect(wx - 6, 5, 72, 2, shade(trim, -0.12));
  const curtain = dark ? '#8d82a8' : '#dcccae';
  for (const x of [wx - 4, wx + 53]) {
    g.rect(x, 7, 11, 22, curtain);
    g.rect(x + 2, 7, 2, 21, shade(curtain, 0.2));
    g.rect(x + 7, 7, 1, 21, shade(curtain, -0.15));
    g.rect(x + 1, 22, 8, 2, trim);
  }
  g.rect(wx - 3, 31, 66, 3, shade(trim, 0.3));
  // Small framed prints and a wall sconce sit above the usable floor.
  g.rect(x0 + 15, 10, 18, 15, trim);
  g.rect(x0 + 17, 12, 14, 11, '#f1dec0');
  g.circle(x0 + 23, 16, 3, '#cfa76f');
  g.rect(x0 + 18, 20, 12, 2, '#94ab82');
  g.rect(x0 + w - 32, 12, 15, 12, trim);
  g.rect(x0 + w - 30, 14, 11, 8, '#d4dfd0');
  g.rect(x0 + w - 27, 16, 5, 4, '#8da08e');
  g.rect(x0 + 46, 12, 3, 11, trim);
  g.rect(x0 + 42, 11, 11, 6, dark ? '#e7bd88' : '#f3ddb2');
  // Narrow side walls remain outside the furniture footprint.
  for (const x of [x0 - 3, x0 + w]) {
    g.rect(x, 39, 3, h - 13, shade(wall, -0.12));
    g.rect(x, 39, 1, h - 13, shade(trim, 0.18));
  }
  g.rect(x0 - 3, h + 24, w + 6, 3, shade(trim, -0.08));
  g.rect(x0 - 2, h + 24, w + 4, 1, shade(trim, 0.35));
  // Visual entrance threshold stays at the existing server spawn.
  g.rect(x0 + w / 2 - 12, h + 24, 24, 3, shade(floor, 0.18));
  if (!dark) {
    for (let y = 0; y < 30; y++) {
      for (let x = wx + 7 - Math.floor(y / 3); x < wx + 47 - Math.floor(y / 3); x++) {
        // Blend into the existing plank; a translucent pixel would erase the floor beneath it.
        g.set(x, floorY + y, shade(g.get(x, floorY + y) ?? floor, 0.09));
      }
    }
  }
  return g.toCanvas(2);
}
