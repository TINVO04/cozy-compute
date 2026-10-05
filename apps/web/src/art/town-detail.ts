import type Phaser from 'phaser';
import { paintVehicleDealer } from './vehicle';
import {
  BUILDINGS,
  MAP_HEIGHT,
  MAP_WIDTH,
  TILE,
  TOWN_PROPS,
  TOWN_SCENERY,
  TOWN_TEMPLE_WALLS,
  TOWN_TREES,
  type Building,
} from '@cozy/game-data';
import { BUILDING_ROOF, drawTree, paintBuilding, paintProp, paintTown } from './town';
import { mulberry, shade } from './pixel';

type Scenery = (typeof TOWN_SCENERY)[number];
function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  c.getContext('2d')!.imageSmoothingEnabled = false;
  return c;
}
function box(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function oval(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number) {
  for (let dy = -Math.floor(ry); dy <= ry; dy++) {
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    box(ctx, color, x - dx, y + dy, 2 * dx + 1, 1);
  }
}
function line(
  ctx: CanvasRenderingContext2D,
  color: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness = 1,
) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i++)
    box(ctx, color, x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps, thickness, thickness);
}
function shape(ctx: CanvasRenderingContext2D, color: string, points: number[][]) {
  // Scanline fill maintains sharp pixels on every curved fender and roof edge.
  const min = Math.ceil(Math.min(...points.map((p) => p[1]!))),
    max = Math.floor(Math.max(...points.map((p) => p[1]!)));
  for (let y = min; y <= max; y++) {
    const intersections: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!,
        b = points[(i + 1) % points.length]!;
      if ((a[1]! <= y && b[1]! > y) || (b[1]! <= y && a[1]! > y))
        intersections.push(a[0]! + ((y - a[1]!) * (b[0]! - a[0]!)) / (b[1]! - a[1]!));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2)
      box(
        ctx,
        color,
        Math.ceil(intersections[i]!),
        y,
        Math.floor(intersections[i + 1]!) - Math.ceil(intersections[i]!) + 1,
        1,
      );
  }
}
function windowPane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  trim = '#eee6cd',
) {
  box(ctx, '#434d4e', x - 2, y - 2, w + 4, h + 4);
  box(ctx, '#658d98', x, y, w, h);
  box(ctx, '#b4d4d4', x + 1, y + 1, w - 3, 3);
  box(ctx, '#9dbbbc', x + 2, y + 5, Math.max(3, w / 3), h - 7);
  box(ctx, trim, x + w / 2 - 1, y, 2, h);
  box(ctx, trim, x, y + h / 2, w, 2);
  box(ctx, trim, x - 3, y + h, w + 6, 3);
}
function tiles(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  box(ctx, '#493f36', x - 1, y - 1, w + 2, h + 3);
  box(ctx, color, x, y, w, h);
  for (let row = 0; row < h; row += 6) {
    box(ctx, shade(color, -0.25), x, y + row + 5, w, 1);
    box(ctx, shade(color, 0.23), x, y + row, w, 1);
    for (let col = row % 12 ? 5 : 0; col < w; col += 10) {
      box(ctx, shade(color, -0.16), x + col, y + row + 1, 1, 4);
      box(ctx, shade(color, 0.12), x + col + 2, y + row + 2, Math.min(5, w - col - 2), 1);
    }
  }
}
function dormer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  const h = Math.round(w * 0.5);
  for (let row = 0; row < h; row++) {
    const half = Math.round(((row + 1) * w) / (h * 2));
    box(ctx, '#564c3a', x + w / 2 - half - 1, y + row, half * 2 + 2, 1);
    box(ctx, color, x + w / 2 - half, y + row + 1, half * 2, 1);
  }
  box(ctx, '#dcd9bd', x + 3, y + h, w - 6, 19);
  windowPane(ctx, x + 8, y + h + 3, w - 16, 13, '#f0e7cb');
  box(ctx, '#6c6349', x + 2, y + h + 18, w - 4, 3);
}
function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  color = '#f4d79a',
  size = 9,
) {
  ctx.font = `700 ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y, width);
}

/** Independent roof, facade, shutters and garden details, never sampled from a photo. */
function paintSouthHouse(s: Scenery) {
  const index = Number(s.id.split('-').at(-1));
  const heights = [118, 128, 102, 139, 124, 158, 117];
  const c = canvas(s.rect.w + 12, heights[index]!),
    ctx = c.getContext('2d')!;
  const w = c.width,
    base = c.height - 6;
  const facade = [64, 52, 64, 66, 50, 108, 70][index]!,
    eave = base - facade;
  const wall = ['#dbe2d5', '#e3c5a3', '#c9ceca', '#e7d6ae', '#eccfb4', '#c9d9d8', '#ece6cf'][index]!;
  oval(ctx, 'rgba(35,52,35,0.27)', w / 2, base + 1, w / 2 - 2, 4);
  box(ctx, '#5b5e4e', 4, eave, w - 8, facade);
  box(ctx, wall, 6, eave + 2, w - 12, facade - 3);
  box(ctx, shade(wall, -0.18), w - 18, eave + 2, 12, facade - 3);
  if (index === 2 || index === 6) {
    // Low concrete terrace roofs with parapets, rather than tiled gables.
    box(ctx, '#707e79', 1, 10, w - 2, eave - 5);
    box(ctx, index === 2 ? '#a3ada2' : '#b7b6a0', 4, 13, w - 8, eave - 12);
    box(ctx, '#d9dcca', 1, 8, w - 2, 4);
    box(ctx, '#646f68', 0, eave - 3, w, 5);
    for (let x = 10; x < w - 8; x += 17) box(ctx, '#8b958c', x, 15, 1, eave - 18);
    if (index === 2) {
      box(ctx, '#6b7d79', w - 31, 17, 22, 14);
      for (let y = 20; y < 29; y += 3) box(ctx, '#bac6b6', w - 29, y, 18, 1);
      box(ctx, '#50615b', w - 29, 31, 3, 4);
    } else {
      box(ctx, '#865e45', 13, 18, 20, 6);
      oval(ctx, '#4c7e45', 23, 16, 14, 7);
      oval(ctx, '#8da662', 20, 13, 10, 5);
    }
  } else if (index === 1) {
    // Full triangular gable with stepped tiled slopes and a round attic light.
    const roofH = eave - 9;
    for (let y = 0; y < roofH; y++) {
      const half = Math.round(((w / 2 - 1) * (y + 5)) / (roofH + 5));
      box(ctx, y % 5 === 0 ? '#d39464' : y % 5 === 4 ? '#864830' : s.color, w / 2 - half, 8 + y, half * 2, 1);
      if (y % 5 < 4)
        for (let x = w / 2 - half + 4; x < w / 2 + half; x += 9) box(ctx, '#a7593b', x, 8 + y, 1, 1);
    }
    oval(ctx, '#e7d2a2', w / 2, eave - 14, 8, 8);
    oval(ctx, '#507583', w / 2, eave - 14, 5, 5);
    box(ctx, '#e7d2a2', w / 2 - 1, eave - 19, 2, 10);
  } else {
    tiles(ctx, 1, 14, w - 2, eave - 15, s.color);
    for (let y = 0; y < 13; y++) {
      const inset = (index === 5 ? 5 : 13) - Math.floor(y * (index === 5 ? 0.3 : 0.9));
      box(ctx, shade(s.color, 0.12), inset, 1 + y, w - inset * 2, 1);
    }
    box(ctx, shade(s.color, -0.3), 0, eave - 3, w, 5);
  }
  for (let y = eave + 7; y < base; y += 9) box(ctx, shade(wall, -0.07), 7, y, w - 25, 1);
  if (index === 0 || index === 3 || index === 5) {
    for (const x of [16, w - 37]) windowPane(ctx, x, eave + 11, 21, 24, '#e1d6b7');
    box(ctx, '#727763', 8, eave + 41, w - 16, 4);
    for (let x = 10; x < w - 9; x += 7) box(ctx, '#ded8bc', x, eave + 34, 2, 10);
    if (index === 5) for (const x of [16, w - 37]) windowPane(ctx, x, eave + 52, 21, 20);
  }
  const doorX = index === 2 ? 12 : index === 6 ? w - 34 : w / 2 - 11;
  box(ctx, '#4a493d', doorX - 2, base - 33, 24, 33);
  box(ctx, index === 6 ? '#6d8a89' : '#a17b52', doorX, base - 31, 20, 30);
  box(ctx, '#b8cfc2', doorX + 3, base - 28, 14, 10);
  box(ctx, '#e4c787', doorX + 15, base - 13, 2, 2);
  box(ctx, '#c3b597', doorX - 5, base - 1, 30, 3);
  if (index === 2) {
    box(ctx, '#52635b', 42, base - 35, w - 51, 33);
    for (let y = base - 32; y < base - 3; y += 4) box(ctx, '#889990', 43, y, w - 53, 1);
    tiles(ctx, 39, base - 44, w - 43, 11, '#768d94');
  } else if (index === 6) {
    windowPane(ctx, 14, base - 37, 35, 28, '#b0ac8c');
    box(ctx, '#7a8d76', 11, base - 7, 41, 5);
    box(ctx, '#75664c', 10, base - 44, w - 20, 7);
    label(ctx, 'TẠP HÓA', w / 2, base - 40, w - 25, '#f0dbaf', 7);
  } else if (index === 4) {
    // Broad veranda and striped shade canopy define the coral bungalow.
    for (let x = 4; x < w - 4; x += 8)
      box(ctx, (x / 8) % 2 ? '#e2c99a' : '#ad7150', x, base - 43, Math.min(8, w - 4 - x), 11);
    for (const x of [9, w - 12]) box(ctx, '#947350', x, base - 30, 3, 30);
    windowPane(ctx, 14, base - 27, 18, 18);
    windowPane(ctx, w - 34, base - 27, 18, 18);
  } else if (index === 1) {
    for (const x of [14, w - 32]) windowPane(ctx, x, base - 29, 16, 19, '#b8ae8b');
  }
  return c;
}

function paintHouse(s: Scenery) {
  if (s.id.startsWith('south-house')) return paintSouthHouse(s);
  const index = Number(s.id.split('-').at(-1)) || 0;
  const h = s.id === 'west-blue-house' ? 166 : 130;
  const c = canvas(s.rect.w + 12, h);
  const ctx = c.getContext('2d')!;
  const w = c.width,
    base = h - 5,
    eave = base - 54;
  const wall = ['#eee6cf', '#d9d6b9', '#c5ccc5', '#ebd8b1'][index % 4]!;
  oval(ctx, 'rgba(40,58,35,0.22)', w / 2, base, w / 2 - 3, 4);
  box(ctx, '#485044', 5, eave, w - 10, base - eave);
  box(ctx, wall, 6, eave + 2, w - 12, base - eave - 3);
  box(ctx, shade(wall, -0.16), w - 17, eave + 2, 11, base - eave - 3);
  for (let y = eave + 8; y < base; y += 8) box(ctx, shade(wall, -0.07), 7, y, w - 24, 1);
  tiles(ctx, 2, 15, w - 4, eave - 15, s.color);
  // A stepped hip gives the roof a real silhouette and a visible side plane.
  for (let y = 0; y < 15; y++) {
    const inset = 15 - y;
    box(ctx, '#455049', inset, y, w - inset * 2, 1);
    box(ctx, shade(s.color, 0.12), inset + 2, y + 1, w - inset * 2 - 4, 1);
  }
  box(ctx, shade(s.color, -0.3), 0, eave - 3, w, 6);
  box(ctx, '#e5d3b0', 3, eave + 3, w - 6, 2);
  if (index % 2 === 0 && w > 75) {
    box(ctx, '#e9dcc5', w / 2 - 15, 29, 30, 24);
    for (let y = 0; y < 12; y++) box(ctx, shade(s.color, -0.15), w / 2 - y - 3, 17 + y, 6 + 2 * y, 1);
    windowPane(ctx, w / 2 - 8, 34, 16, 15, '#dec99b');
  }
  const door = w / 2 - 10;
  box(ctx, '#554731', door - 2, base - 35, 24, 35);
  box(ctx, '#977354', door, base - 33, 20, 32);
  box(ctx, '#b5c4b8', door + 3, base - 30, 14, 10);
  box(ctx, '#e6cb80', door + 15, base - 15, 2, 2);
  box(ctx, '#c2b594', door - 5, base - 2, 30, 4);
  if (w > 80) {
    for (const x of [15, w - 35]) {
      windowPane(ctx, x, base - 31, 18, 21, '#c5c6ad');
      box(ctx, '#5c7661', x - 5, base - 32, 3, 24);
      box(ctx, '#5c7661', x + 22, base - 32, 3, 24);
      for (let y = base - 30; y < base - 10; y += 4) {
        box(ctx, '#8aa080', x - 5, y, 3, 1);
        box(ctx, '#8aa080', x + 22, y, 3, 1);
      }
    }
  }
  if (index % 3 === 1) {
    box(ctx, '#6d6250', w - 23, 5, 12, 21);
    box(ctx, '#c2b89d', w - 22, 6, 9, 19);
    box(ctx, '#e5dcc6', w - 25, 4, 16, 4);
  }
  if (s.id === 'west-house') {
    tiles(ctx, 1, eave - 17, 46, 24, '#577e95');
    box(ctx, '#b6baa6', 3, eave + 9, 41, 36);
    box(ctx, '#3e4945', 8, eave + 16, 29, 22);
    for (let y = eave + 18; y < eave + 35; y += 4) box(ctx, '#7c8580', 9, y, 27, 1);
  }
  return c;
}

/** Curved, tiled eaves made of horizontal pixel rows, with raised tips. */
function templeRoof(ctx: CanvasRenderingContext2D, cx: number, top: number, width: number, height: number) {
  for (let y = 0; y < height; y++) {
    const spread = Math.round(width * 0.23 + (width * 0.27 * y) / height);
    box(ctx, '#6c332b', cx - spread - 2, top + y, spread * 2 + 4, 1);
    box(
      ctx,
      y % 6 === 5 ? '#8c3c2e' : y % 6 === 0 ? '#df8b54' : '#bd593e',
      cx - spread,
      top + y,
      spread * 2,
      1,
    );
    if (y % 6 < 5)
      for (let x = cx - spread + 4; x < cx + spread; x += 9) box(ctx, '#d57a48', x, top + y, 1, 1);
  }
  for (let i = 0; i < 10; i++) {
    const dy = Math.floor((i * i) / 18);
    box(ctx, '#67352b', cx - width / 2 + i, top + height - 8 + dy, 3, 5);
    box(ctx, '#67352b', cx + width / 2 - i - 3, top + height - 8 + dy, 3, 5);
    box(ctx, '#e4a15e', cx - width / 2 + i, top + height - 8 + dy, 2, 1);
    box(ctx, '#e4a15e', cx + width / 2 - i - 2, top + height - 8 + dy, 2, 1);
  }
  box(ctx, '#4e3226', cx - width / 2 + 6, top + height, width - 12, 4);
  box(ctx, '#e0ad71', cx - width / 2 + 8, top + height + 1, width - 16, 1);
}
function paintTemple(s: Scenery) {
  if (s.kind === 'pagoda') return paintPagoda();
  const w = s.rect.w + 34,
    h = 142;
  const c = canvas(w, h),
    ctx = c.getContext('2d')!,
    cx = w / 2,
    base = h - 5;
  oval(ctx, 'rgba(35,57,35,0.25)', cx, base, w / 2 - 5, 5);
  box(ctx, '#897c60', 8, base - 10, w - 16, 10);
  box(ctx, '#ddd0aa', 10, base - 10, w - 20, 3);
  box(ctx, '#b6a789', 16, base - 17, w - 32, 7);
  for (let row = 0; row < 3; row++) {
    box(ctx, '#8b8068', cx - 25 - row * 5, base - 8 + row * 3, 50 + row * 10, 3);
    box(ctx, '#e1d7ba', cx - 25 - row * 5, base - 8 + row * 3, 50 + row * 10, 1);
  }
  const levels = 2,
    step = 43;
  for (let level = 0; level < levels; level++) {
    const y = base - 18 - level * step,
      fw = w - 40 - level * 13;
    box(ctx, '#6f392b', cx - fw / 2, y - 36, fw, 36);
    box(ctx, '#d3a465', cx - fw / 2 + 3, y - 34, fw - 6, 34);
    for (let x = cx - fw / 2 + 7; x < cx + fw / 2 - 6; x += 18) {
      box(ctx, '#513b2b', x, y - 28, 12, 24);
      for (let dy = 0; dy < 23; dy += 5) box(ctx, '#b68955', x + 1, y - 27 + dy, 10, 1);
      for (let dx = 3; dx < 12; dx += 4) box(ctx, '#b68955', x + dx, y - 27, 1, 22);
      box(ctx, '#f0cb84', x - 3, y - 35, 3, 35);
    }
    box(ctx, '#86422e', cx - fw / 2 - 2, y - 2, fw + 4, 5);
    templeRoof(ctx, cx, y - 61, fw + 30, 24);
  }
  return c;
}

/** Four compact, tapered wooden tiers reproduce the reference's proportions. */
function paintPagoda() {
  const c = canvas(126, 174),
    ctx = c.getContext('2d')!,
    cx = 63;
  oval(ctx, 'rgba(44,48,31,0.24)', cx, 169, 58, 4);
  box(ctx, '#817152', 14, 156, 98, 11);
  box(ctx, '#bdad85', 15, 157, 96, 7);
  box(ctx, '#dccaa0', 12, 155, 102, 3);
  const tiers = [
    { y: 117, roofW: 120, roofH: 23, bodyW: 91, bodyH: 29 },
    { y: 87, roofW: 107, roofH: 18, bodyW: 83, bodyH: 15 },
    { y: 55, roofW: 90, roofH: 18, bodyW: 65, bodyH: 20 },
    { y: 26, roofW: 72, roofH: 19, bodyW: 49, bodyH: 13 },
  ];
  for (const tier of tiers) {
    const by = tier.y + tier.roofH,
      left = cx - tier.bodyW / 2;
    box(ctx, '#603d29', left - 2, by, tier.bodyW + 4, tier.bodyH);
    box(ctx, '#ae8050', left, by + 2, tier.bodyW, tier.bodyH - 2);
    box(ctx, '#c69b62', left, by + 2, 3, tier.bodyH - 2);
    box(ctx, '#805636', left + tier.bodyW - 5, by + 2, 5, tier.bodyH - 2);
    const columns = tier.bodyW > 80 ? 5 : tier.bodyW > 50 ? 3 : 2;
    const pitch = (tier.bodyW - 12) / columns;
    for (let i = 0; i < columns; i++) {
      const x = left + 7 + i * pitch,
        ww = pitch - 5;
      box(ctx, '#553d2b', x, by + 5, ww, tier.bodyH - 7);
      box(ctx, '#cc9c5c', x + ww / 2, by + 5, 1, tier.bodyH - 7);
      for (let yy = by + 7; yy < by + tier.bodyH - 3; yy += 5) box(ctx, '#987043', x + 1, yy, ww - 2, 1);
      box(ctx, '#d5aa6d', x - 3, by + 2, 2, tier.bodyH - 2);
    }
    box(ctx, '#6b412a', left - 3, by + tier.bodyH - 2, tier.bodyW + 6, 3);
    // Broad sloping tile planes with modest upturned tips.
    for (let row = 0; row < tier.roofH; row++) {
      const half = Math.round(tier.roofW * (0.28 + (0.22 * row) / tier.roofH));
      box(ctx, '#603b2b', cx - half - 1, tier.y + row, half * 2 + 2, 1);
      box(
        ctx,
        row % 5 === 0 ? '#d38a55' : row % 5 === 4 ? '#9b5033' : '#b76b40',
        cx - half,
        tier.y + row,
        half * 2,
        1,
      );
      for (let x = cx - half + 3; x < cx + half; x += 7)
        if (row % 5 < 4) box(ctx, '#d4965c', x, tier.y + row, 1, 1);
    }
    for (let j = 0; j < 8; j++) {
      const y = tier.y + tier.roofH - 4 + Math.floor(j / 3);
      box(ctx, '#61452f', cx - tier.roofW / 2 + j, y, 2, 3);
      box(ctx, '#61452f', cx + tier.roofW / 2 - j - 2, y, 2, 3);
      box(ctx, '#e0a76b', cx - tier.roofW / 2 + j, y, 1, 1);
      box(ctx, '#e0a76b', cx + tier.roofW / 2 - j - 1, y, 1, 1);
    }
    box(ctx, '#533928', cx - tier.roofW / 2 + 5, tier.y + tier.roofH, tier.roofW - 10, 3);
    box(ctx, '#d0a26c', cx - tier.roofW / 2 + 6, tier.y + tier.roofH, tier.roofW - 12, 1);
  }
  // Small bronze finial on the top roof; no extra roof tier.
  box(ctx, '#795630', cx - 2, 8, 4, 18);
  for (const y of [9, 14, 20]) {
    oval(ctx, '#c49c59', cx, y, 4, 2);
    box(ctx, '#e8c27b', cx - 2, y - 1, 4, 1);
  }
  box(ctx, '#d6b575', cx, 3, 1, 8);
  box(ctx, '#4f3627', cx - 12, 141, 24, 15);
  box(ctx, '#9c7548', cx - 10, 141, 20, 15);
  box(ctx, '#c6a16b', cx, 142, 1, 14);
  for (let row = 0; row < 3; row++) {
    box(ctx, '#7d7256', cx - 21 - row * 6, 158 + row * 4, 42 + row * 12, 4);
    box(ctx, '#d6c6a1', cx - 21 - row * 6, 158 + row * 4, 42 + row * 12, 1);
  }
  return c;
}
function paintCart(s: Scenery) {
  const c = canvas(60, 70),
    ctx = c.getContext('2d')!;
  oval(ctx, 'rgba(40,55,35,0.2)', 30, 66, 26, 3);
  for (const x of [13, 47]) {
    oval(ctx, '#33403a', x, 62, 5, 6);
    oval(ctx, '#a7ada5', x, 62, 2, 3);
  }
  box(ctx, '#515c53', 7, 38, 46, 22);
  box(ctx, s.color, 8, 39, 44, 18);
  for (let x = 9; x < 50; x += 7) box(ctx, shade(s.color, 0.15), x, 40, 1, 16);
  box(ctx, '#cad5c9', 6, 36, 48, 4);
  for (const x of [8, 50]) {
    box(ctx, '#5f6657', x, 10, 2, 29);
    box(ctx, '#dad7b8', x, 11, 1, 26);
  }
  tiles(ctx, 3, 3, 54, 13, '#8b5940');
  box(ctx, '#efe0b9', 6, 18, 48, 12);
  label(ctx, s.label!, 30, 24, 44, '#6f4730', 8);
  if (s.id === 'bun-rieu') {
    oval(ctx, '#677b77', 24, 34, 11, 4);
    box(ctx, '#96aaa2', 14, 30, 20, 5);
    oval(ctx, '#d8e4d7', 24, 30, 10, 3);
    oval(ctx, '#c56b40', 24, 30, 7, 2);
    box(ctx, '#babfa9', 22, 23, 3, 6);
    for (let x = 39; x < 50; x += 5) {
      box(ctx, '#e5e6ca', x, 30, 4, 6);
      box(ctx, '#ddbd75', x + 1, 31, 2, 2);
    }
  } else {
    box(ctx, '#dae1cb', 15, 27, 16, 10);
    box(ctx, '#536b63', 18, 28, 9, 5);
    oval(ctx, '#889389', 32, 31, 4, 4);
    oval(ctx, '#dbe3d0', 32, 31, 2, 2);
    for (let x = 38; x < 50; x += 4) {
      box(ctx, '#b4b974', x, 27, 2, 10);
      box(ctx, '#e3d593', x, 29, 2, 1);
    }
  }
  return c;
}
function paintScooter(color: string) {
  const c = canvas(46, 48),
    ctx = c.getContext('2d')!;
  oval(ctx, 'rgba(34,45,33,0.26)', 23, 44, 21, 3);
  const wheel = (x: number, y: number) => {
    oval(ctx, '#263632', x, y, 6, 7);
    oval(ctx, '#172622', x, y, 4, 5);
    oval(ctx, '#8a9690', x, y, 3, 4);
    oval(ctx, '#d1d8c8', x - 1, y - 1, 2, 2);
    box(ctx, '#4c635b', x, y, 1, 6);
  };
  wheel(10, 37);
  wheel(35, 35);
  line(ctx, '#a0a89b', 25, 29, 35, 35, 2);
  // Rear body, stepped footwell and front legshield form a scooter silhouette.
  shape(ctx, '#3b4a41', [
    [3, 26],
    [7, 22],
    [21, 23],
    [24, 28],
    [31, 28],
    [31, 22],
    [28, 15],
    [34, 13],
    [39, 17],
    [39, 30],
    [34, 34],
    [21, 35],
    [18, 29],
    [4, 32],
  ]);
  shape(ctx, color, [
    [4, 26],
    [9, 23],
    [19, 24],
    [23, 30],
    [29, 30],
    [33, 25],
    [30, 17],
    [34, 15],
    [37, 18],
    [37, 29],
    [32, 32],
    [20, 33],
    [17, 28],
    [5, 30],
  ]);
  line(ctx, shade(color, 0.34), 7, 25, 19, 25);
  line(ctx, shade(color, -0.26), 5, 29, 17, 29);
  line(ctx, shade(color, 0.2), 34, 18, 36, 26, 2);
  box(ctx, '#2c3932', 22, 31, 9, 2);
  box(ctx, '#b2b6a7', 22, 31, 7, 1);
  shape(ctx, '#20302d', [
    [5, 22],
    [8, 18],
    [18, 18],
    [24, 22],
    [21, 25],
    [7, 24],
  ]);
  line(ctx, '#536359', 8, 19, 18, 19, 2);
  line(ctx, '#84917f', 7, 23, 20, 24);
  shape(ctx, shade(color, -0.12), [
    [28, 32],
    [31, 28],
    [37, 28],
    [41, 32],
    [40, 34],
    [37, 31],
    [31, 31],
    [30, 34],
  ]);
  line(ctx, shade(color, 0.38), 31, 29, 37, 29);
  line(ctx, '#718579', 33, 25, 35, 34, 2);
  shape(ctx, color, [
    [29, 15],
    [29, 11],
    [32, 9],
    [38, 11],
    [40, 14],
    [37, 17],
    [32, 17],
  ]);
  oval(ctx, '#d5d6b9', 37, 13, 3, 2);
  box(ctx, '#f0eed6', 37, 12, 2, 1);
  line(ctx, '#364940', 29, 10, 25, 8);
  line(ctx, '#91a494', 25, 8, 31, 10);
  line(ctx, '#506a5e', 30, 10, 27, 4);
  line(ctx, '#506a5e', 35, 10, 39, 5);
  oval(ctx, '#354e44', 26, 3, 3, 2);
  oval(ctx, '#bad1c0', 26, 2, 2, 1);
  oval(ctx, '#354e44', 40, 4, 3, 2);
  oval(ctx, '#bad1c0', 40, 3, 2, 1);
  box(ctx, '#d76744', 4, 27, 2, 3);
  box(ctx, '#f2d589', 4, 27, 1, 1);
  line(ctx, '#a8b4a6', 5, 35, 18, 35, 2);
  box(ctx, '#5d7568', 4, 36, 8, 2);
  line(ctx, '#516854', 24, 34, 22, 43);
  // Expose the saddle and footboard from the reference's oblique overhead view.
  const projected = canvas(38, 48),
    p = projected.getContext('2d')!;
  p.setTransform(0.75, -0.2, 0, 0.78, 2, 12);
  p.drawImage(c, 0, 0);
  return projected;
}

function paintTempleGate() {
  const c = canvas(110, 68),
    ctx = c.getContext('2d')!;
  oval(ctx, 'rgba(39,53,34,0.25)', 55, 62, 52, 5);

  // 1. Stone plinth footings for 4 gate pillars
  for (const x of [10, 32, 74, 96]) {
    box(ctx, '#475569', x - 2, 56, 12, 8);
    box(ctx, '#94a3b8', x - 1, 57, 10, 6);
  }

  // 2. Red lacquer timber pillars
  for (const x of [10, 32, 74, 96]) {
    box(ctx, '#7f1d1d', x, 18, 8, 40);
    box(ctx, '#991b1b', x + 1, 18, 6, 39);
    box(ctx, '#b91c1c', x + 2, 18, 2, 39);
  }

  // 3. Central & flanking crossbeams (Xà ngang)
  box(ctx, '#7f1d1d', 6, 22, 98, 6);
  box(ctx, '#991b1b', 8, 23, 94, 4);

  // 4. Central Signboard: "CHÙA BỬU LONG" (Hoành phi nền đỏ chữ vàng)
  box(ctx, '#450a0a', 36, 28, 38, 14);
  box(ctx, '#ca8a04', 37, 29, 36, 12);
  box(ctx, '#991b1b', 38, 30, 34, 10);
  label(ctx, 'VÕ ĐƯỜNG', 55, 38, 32, '#fef08a', 5.5);

  // 5. Multi-tiered curved terracotta tiled roofs (Mái ngói cong cổ kính)
  // Left & right flanking lower roofs
  for (const rx of [4, 70]) {
    box(ctx, '#7f1d1d', rx, 16, 36, 7);
    box(ctx, '#c2410c', rx + 1, 14, 34, 5);
    box(ctx, '#ea580c', rx + 2, 13, 32, 3);
    // Upturned roof eaves
    box(ctx, '#facc15', rx - 1, 12, 3, 3);
    box(ctx, '#facc15', rx + 34, 12, 3, 3);
  }

  // Central higher grand roof tier
  box(ctx, '#7f1d1d', 26, 10, 58, 8);
  box(ctx, '#c2410c', 28, 7, 54, 7);
  box(ctx, '#ea580c', 30, 5, 50, 4);
  // Roof ridges & gold finials
  box(ctx, '#facc15', 25, 4, 4, 4);
  box(ctx, '#facc15', 81, 4, 4, 4);
  box(ctx, '#facc15', 53, 2, 4, 4);

  return c;
}
function paintTempleWall(w: number, h: number) {
  const c = canvas(w + 8, h + 20),
    ctx = c.getContext('2d')!;
  if (w > h) {
    box(ctx, '#776443', 4, 8, w, 12);
    box(ctx, '#b39e72', 4, 9, w, 9);
    box(ctx, '#d9c191', 3, 6, w + 2, 3);
    box(ctx, '#765a3d', 4, 17, w, 3);
    for (let x = 4; x < w + 4; x += 50) {
      box(ctx, '#8a7148', x, 2, 5, 18);
      box(ctx, '#e0ca96', x - 1, 1, 7, 3);
    }
  } else {
    box(ctx, '#745d3d', 3, 5, w + 2, h + 10);
    box(ctx, '#ad986b', 4, 5, w, h + 8);
    box(ctx, '#d5bc87', 3, 3, w + 3, h + 6);
    box(ctx, '#9c855a', 6, 5, 2, h + 9);
    for (let y = 4; y < h + 5; y += 50) {
      box(ctx, '#775e3e', 2, y, w + 5, 10);
      box(ctx, '#dec89a', 1, y, w + 7, 3);
    }
  }
  return c;
}
function paintPalm() {
  const c = canvas(96, 128),
    ctx = c.getContext('2d')!;
  oval(ctx, 'rgba(38,65,35,0.19)', 48, 124, 28, 4);
  for (let y = 47; y < 124; y++) {
    const x = 47 + Math.floor((y - 47) / 20);
    box(ctx, y % 7 < 2 ? '#675b37' : '#a5975c', x, y, 7, 1);
    box(ctx, '#c3b779', x, y, 2, 1);
  }
  for (let branch = 0; branch < 9; branch++) {
    const angle = (branch * Math.PI * 2) / 9;
    for (let i = 0; i < 36; i++) {
      const x = 48 + Math.cos(angle) * i,
        y = 42 + Math.sin(angle) * i * 0.55 + (i * i) / 65;
      box(ctx, '#2d633b', x - 2, y - 2, 5, 5);
      box(ctx, '#56924d', x - 2, y - 2, 3, 3);
      if (i > 9 && i % 3 === 0) {
        const dx = -Math.sin(angle) * 6,
          dy = Math.cos(angle) * 5;
        box(ctx, '#3c7c40', x + dx, y + dy, 5, 3);
        box(ctx, '#6aa44e', x - dx, y - dy, 5, 2);
      }
    }
  }
  for (const x of [43, 49, 54]) oval(ctx, '#746a39', x, 47, 3, 4);
  return c;
}
function paintBoat(color: string) {
  const c = canvas(48, 98),
    ctx = c.getContext('2d')!;
  oval(ctx, '#6ed1da', 25, 55, 22, 39);
  for (let y = 4; y < 91; y++) {
    const rw = Math.floor(17 * Math.sin(((y - 4) / 87) * Math.PI) ** 0.5);
    box(ctx, '#5d5038', 24 - rw, y, rw * 2 + 1, 1);
    if (rw > 3) box(ctx, color, 26 - rw, y, rw * 2 - 3, 1);
  }
  oval(ctx, '#4d625a', 24, 50, 10, 28);
  oval(ctx, '#c6ac78', 24, 50, 8, 26);
  for (const y of [32, 54, 71]) {
    box(ctx, '#68533b', 14, y, 20, 5);
    box(ctx, '#e2c899', 14, y, 20, 2);
  }
  box(ctx, '#94733f', 34, 20, 2, 64);
  box(ctx, '#c9a85b', 35, 20, 1, 64);
  box(ctx, '#77613d', 32, 73, 6, 14);
  return c;
}

/** 3D Embossed DNTU Campus Monument with dimensional flame emblem and bold crimson letters. */
function paintDntuMonument() {
  const w = 118,
    h = 56;
  const c = canvas(w, h),
    ctx = c.getContext('2d')!;

  const base = h - 3;
  // 1. Ground contact shadow
  oval(ctx, 'rgba(30, 25, 20, 0.32)', w / 2, base + 1, w / 2 - 4, 3);

  // 2. Multi-tiered Polished Granite Pedestal (Bệ đá cẩm thạch trắng)
  const pedW = 112;
  const pedX = (w - pedW) / 2; // 3
  const pedH = 8;
  const pedY = base - pedH; // 45

  // Bottom stone plinth
  box(ctx, '#71717a', pedX - 1, pedY + 3, pedW + 2, 5);
  box(ctx, '#e4e4e7', pedX, pedY + 3, pedW, 4);
  box(ctx, '#a1a1aa', pedX + pedW - 2, pedY + 3, 2, 4);

  // Upper beveled stone slab
  box(ctx, '#52525b', pedX, pedY, pedW, 4);
  box(ctx, '#f4f4f5', pedX + 1, pedY, pedW - 2, 3);
  box(ctx, '#ffffff', pedX + 2, pedY, pedW - 4, 1);
  box(ctx, '#d4af37', pedX + 4, pedY + 3, pedW - 8, 1); // Gold brass inlay strip

  // 3. OFFICIAL DNTU LOGO EMBLEM (Graduation cap, 1 red head, 2 blue heads, 3 ascending red swooshes)
  const drawEmblemPath = (
    pathFn: (c: CanvasRenderingContext2D, ox: number, oy: number) => void,
    fillColor: string,
    shadowColor: string,
    hiColor?: string,
  ) => {
    // 3D Shadow / extrusion layer
    ctx.save();
    pathFn(ctx, 1.2, 1.2);
    ctx.fillStyle = shadowColor;
    ctx.fill();
    ctx.restore();

    // Main Face layer
    ctx.save();
    pathFn(ctx, 0, 0);
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (hiColor) {
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = hiColor;
      ctx.stroke();
    }
    ctx.restore();
  };

  // 3.1 Graduation Cap on top of the red head (Mũ cử nhân DNTU)
  drawEmblemPath(
    (c, ox, oy) => {
      c.beginPath();
      // Tilted mortarboard diamond plate sloping upwards to the right
      c.moveTo(15.5 + ox, 7.5 + oy);
      c.lineTo(20.5 + ox, 4.2 + oy);
      c.lineTo(26.5 + ox, 3.2 + oy);
      c.lineTo(21.5 + ox, 6.5 + oy);
      c.closePath();
      // Skullcap base resting on the head
      c.moveTo(18.5 + ox, 6.2 + oy);
      c.lineTo(23.2 + ox, 5.8 + oy);
      c.lineTo(22.0 + ox, 8.2 + oy);
      c.lineTo(19.2 + ox, 8.4 + oy);
      c.closePath();
    },
    '#b91c1c',
    '#450a0a',
    '#f87171',
  );

  // Circle renderer with 3D drop shadow and specular highlight
  const drawEmblemCircle = (cx: number, cy: number, r: number, fill: string, shadow: string, hi: string) => {
    // Shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + 1.2, cy + 1.2, r, 0, Math.PI * 2);
    ctx.fillStyle = shadow;
    ctx.fill();
    // Face
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    // Highlight glint
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = hi;
    ctx.fill();
    ctx.restore();
  };

  // 3.2 Top Head (Red circle)
  drawEmblemCircle(20.5, 11.5, 3.3, '#dc2626', '#450a0a', '#fca5a5');

  // 3.3 Middle Head (Cyan/Blue circle)
  drawEmblemCircle(16.8, 18.0, 2.6, '#0284c7', '#082f49', '#7dd3fc');

  // 3.4 Lowest Head (Cyan/Blue circle)
  drawEmblemCircle(13.5, 24.5, 2.4, '#0284c7', '#082f49', '#7dd3fc');

  // 3.5 Top Figure Swoosh (Rightmost & largest curved red arc)
  drawEmblemPath(
    (c, ox, oy) => {
      c.beginPath();
      // Starts under red head
      c.moveTo(20.5 + ox, 15.2 + oy);
      // Outer convex curve bellying generously to the right
      c.bezierCurveTo(27.5 + ox, 19.5 + oy, 30.5 + ox, 31.0 + oy, 28.5 + ox, 45.0 + oy);
      // Flat base resting on pedestal
      c.lineTo(24.2 + ox, 45.0 + oy);
      // Inner curve going back up
      c.bezierCurveTo(25.8 + ox, 33.0 + oy, 22.8 + ox, 22.0 + oy, 19.5 + ox, 15.2 + oy);
      c.closePath();
    },
    '#b91c1c',
    '#450a0a',
    '#f87171',
  );

  // 3.6 Middle Figure Swoosh (Red arc under middle head)
  drawEmblemPath(
    (c, ox, oy) => {
      c.beginPath();
      // Starts under middle head
      c.moveTo(17.2 + ox, 21.0 + oy);
      // Outer curve following gap with top figure
      c.bezierCurveTo(20.8 + ox, 27.0 + oy, 22.5 + ox, 35.0 + oy, 22.6 + ox, 45.0 + oy);
      // Flat base
      c.lineTo(19.2 + ox, 45.0 + oy);
      // Inner curve going back up
      c.bezierCurveTo(18.8 + ox, 35.5 + oy, 17.5 + ox, 27.5 + oy, 15.8 + ox, 21.0 + oy);
      c.closePath();
    },
    '#dc2626',
    '#450a0a',
    '#fca5a5',
  );

  // 3.7 Lowest Figure Swoosh (Red arc under lowest head with flared tail)
  drawEmblemPath(
    (c, ox, oy) => {
      c.beginPath();
      // Starts under lowest head
      c.moveTo(13.8 + ox, 27.2 + oy);
      // Outer curve following gap with middle figure
      c.bezierCurveTo(15.5 + ox, 32.0 + oy, 16.8 + ox, 38.0 + oy, 17.5 + ox, 45.0 + oy);
      // Flat baseline extending out to flared foot
      c.lineTo(9.5 + ox, 45.0 + oy);
      // Left concave curve creating the iconic flared sail
      c.bezierCurveTo(11.8 + ox, 38.5 + oy, 12.8 + ox, 32.5 + oy, 12.5 + ox, 27.2 + oy);
      c.closePath();
    },
    '#b91c1c',
    '#450a0a',
    '#f87171',
  );

  // 4. 3D EMBOSSED "DNTU" LETTERS WITH AUTHENTIC SERIF FLAIR (Right side: x = 36..110, y = 19..45)
  const letterY = 19;
  const letterH = 26;

  const drawBlock = (bx: number, by: number, bw: number, bh: number, skipTop = false, skipLeft = false) => {
    box(ctx, '#450a0a', bx + 2, by + 2, bw, bh);
    box(ctx, '#7f1d1d', bx + 1, by + 1, bw, bh);
    box(ctx, '#b91c1c', bx, by, bw, bh);
    if (!skipTop) box(ctx, '#f87171', bx, by, bw, 1);
    if (!skipLeft) box(ctx, '#fca5a5', bx, by, 1, bh);
  };

  // LETTER D (x = 36, w = 15) with flared serifs
  const dX = 36;
  drawBlock(dX, letterY, 4, letterH);
  // Serifs on vertical stem
  drawBlock(dX - 2, letterY, 2, 2);
  drawBlock(dX - 2, letterY + letterH - 2, 2, 2);
  // Upper & lower horizontal bars
  drawBlock(dX + 4, letterY, 7, 4, false, true);
  drawBlock(dX + 4, letterY + letterH - 4, 7, 4, true, true);
  // Curved bowl
  drawBlock(dX + 10, letterY + 2, 3, 3, false, true);
  drawBlock(dX + 12, letterY + 4, 3, letterH - 8, false, true);
  drawBlock(dX + 10, letterY + letterH - 5, 3, 3, true, true);

  // LETTER N (x = 55, w = 15) with top/bottom serifs
  const nX = 55;
  drawBlock(nX, letterY, 4, letterH);
  drawBlock(nX - 2, letterY, 2, 2);
  drawBlock(nX - 2, letterY + letterH - 2, 2, 2);
  drawBlock(nX + 11, letterY, 4, letterH);
  drawBlock(nX + 11, letterY, 4, 2);
  drawBlock(nX + 13, letterY + letterH - 2, 2, 2);
  for (let dy = 0; dy < letterH; dy++) {
    const rx = Math.floor(nX + 3 + (dy * 7) / letterH);
    box(ctx, '#450a0a', rx + 2, letterY + dy + 2, 3, 1);
    box(ctx, '#7f1d1d', rx + 1, letterY + dy + 1, 3, 1);
    box(ctx, '#b91c1c', rx, letterY + dy, 3, 1);
    if (dy < 4) box(ctx, '#fca5a5', rx, letterY + dy, 1, 1);
  }

  // LETTER T (x = 74, w = 16) with flared downward serifs on top bar and base bracket
  const tX = 74;
  drawBlock(tX, letterY, 16, 4);
  // Downward serifs at ends of T bar
  drawBlock(tX, letterY + 4, 2, 2, true, false);
  drawBlock(tX + 14, letterY + 4, 2, 2, true, false);
  // Center stem
  drawBlock(tX + 6, letterY + 4, 4, letterH - 4, true, false);
  // Foot serifs
  drawBlock(tX + 4, letterY + letterH - 2, 2, 2, false, false);
  drawBlock(tX + 10, letterY + letterH - 2, 2, 2, false, true);

  // LETTER U (x = 94, w = 15) with top serifs
  const uX = 94;
  drawBlock(uX, letterY, 4, letterH - 2);
  drawBlock(uX - 2, letterY, 2, 2);
  drawBlock(uX + 11, letterY, 4, letterH - 2);
  drawBlock(uX + 13, letterY, 2, 2);
  drawBlock(uX + 2, letterY + letterH - 4, 11, 4, true, true);
  drawBlock(uX + 1, letterY + letterH - 5, 3, 3, true, true);
  drawBlock(uX + 10, letterY + letterH - 5, 3, 3, true, true);

  // Glistening corner glints on letters
  for (const lx of [dX, nX, tX, uX]) {
    box(ctx, '#ffffff', lx, letterY, 2, 2);
  }

  return c;
}

export function paintScenery(s: Scenery) {
  if (s.kind === 'house') return paintHouse(s);
  if (s.kind === 'dealer') return paintVehicleDealer();
  if (s.kind === 'pagoda' || s.kind === 'shrine') return paintTemple(s);
  if (s.kind === 'cart') return paintCart(s);
  if (s.kind === 'scooter') return paintScooter(s.color);
  if (s.kind === 'monument') return paintDntuMonument();
  return paintPalm();
}

/**
 * Real-world Bcons Apartment Building ("Chung Cư Bcons Plaza / Bcons City Biên Hòa"):
 * - Signature Bcons Contemporary Architecture:
 *   - Rooftop: Modern flat architectural parapet, sky garden pergola & blue "BCONS" skyline sign (y: 6..42)
 *   - Facade: Pearl-white base stucco accented with Bcons signature vertical terracotta-orange (#ea580c)
 *     and deep navy (#1e3a8a) architectural color blocks running up the building (y: 42..196)
 *   - Individual Residential Balconies with glass balustrades & charcoal AC compressor louver grilles
 *   - Ground Floor Commercial Shophouse Podium: Grand glass lobby, Bcons Plaza 3D acrylic sign,
 *     24/7 convenience store (WinMart/GS25 style) & resident cafe lounge (y: 196..253)
 * - Zero window collision with entrance doors!
 */
function paintApartmentBuilding(b: Building): HTMLCanvasElement {
  const c = canvas(b.rect.w + 8, b.rect.h + BUILDING_ROOF);
  const ctx = c.getContext('2d')!;
  const w = c.width; // 264
  const base = c.height - 3; // 253
  const eave = 42;

  // 0. Base ground shadow
  oval(ctx, 'rgba(15, 23, 42, 0.35)', w / 2, base + 1, w / 2 - 4, 5);

  // 1. ROOFTOP PARAPET & SKYLINE CROWN (y: 6..42, 36px)
  // Deep navy modern parapet crown rim
  box(ctx, '#0f172a', 4, 10, w - 8, eave - 10);
  box(ctx, '#1e293b', 6, 12, w - 12, eave - 12);
  box(ctx, '#0284c7', 4, 10, w - 8, 2); // Bcons blue neon top rim

  // Rooftop Sky Garden Pergola (left side: x: 18..88)
  box(ctx, '#78350f', 18, 14, 70, 3);
  for (let px = 22; px < 86; px += 8) {
    box(ctx, '#92400e', px, 14, 2, 16);
    box(ctx, '#15803d', px - 1, 12, 4, 3); // Rooftop climbing vines
  }

  // Rooftop Telecom Antennas & Solar Panels (right side: x: 174..246)
  box(ctx, '#1e293b', 178, 16, 56, 14);
  box(ctx, '#0284c7', 180, 18, 52, 10); // Blue solar panels
  box(ctx, '#475569', 242, 8, 2, 22); // Lightning rod / antenna spire
  box(ctx, '#ef4444', 241, 6, 4, 2); // Red aviation warning beacon

  // BCONS Rooftop Skyline Logo Sign (center: x = 96..168, y: 12..36)
  const logoBoxW = 72;
  const logoBoxX = (w - logoBoxW) / 2;
  box(ctx, '#0f172a', logoBoxX, 14, logoBoxW, 20);
  box(ctx, '#0284c7', logoBoxX + 1, 15, logoBoxW - 2, 18);
  box(ctx, '#0369a1', logoBoxX + 2, 16, logoBoxW - 4, 16);

  // Bcons Logo: Orange & Blue diamond crest + "BCONS"
  box(ctx, '#ea580c', logoBoxX + 6, 20, 8, 8); // Orange diamond
  box(ctx, '#38bdf8', logoBoxX + 10, 20, 4, 8);
  ctx.font = '900 9px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BCONS', logoBoxX + 44, 25);

  // 2. MAIN RESIDENTIAL FACADE (y: 42..196, 154px tall)
  // Base Pearl-White Stucco
  box(ctx, '#1e293b', 4, eave, w - 8, 154);
  box(ctx, '#f8fafc', 6, eave + 1, w - 12, 152);

  // Signature Bcons Vertical Terracotta-Orange & Navy Accent Bands running up the facade
  // Orange accent vertical column 1 (x: 54..66)
  box(ctx, '#ea580c', 54, eave + 1, 12, 150);
  box(ctx, '#f97316', 56, eave + 1, 8, 150);
  // Orange accent vertical column 2 (x: 198..210)
  box(ctx, '#ea580c', 198, eave + 1, 12, 150);
  box(ctx, '#f97316', 200, eave + 1, 8, 150);
  // Deep navy central framing vertical columns (x: 104..112 and x: 152..160)
  box(ctx, '#1e3a8a', 104, eave + 1, 8, 150);
  box(ctx, '#0f172a', 152, eave + 1, 8, 150);

  // 5 Residential Apartment Balcony Suites (Bay Xs)
  const bayXs = [14, 68, 114, 162, 214];

  // Helper to draw modern Bcons apartment balcony suite with AC compressor louver
  const drawBconsBalconySuite = (wx: number, wy: number) => {
    const ww = 38;
    const wh = 36;

    // Outer structural window recess
    box(ctx, '#334155', wx - 1, wy - 1, ww + 2, wh + 2);
    box(ctx, '#ffffff', wx, wy, ww, wh);

    // Sliding glass balcony doors (Xingfa dark grey aluminum frame & blue-tinted glass)
    const glassW = ww - 10;
    box(ctx, '#0f172a', wx + 2, wy + 2, glassW, wh - 10);
    box(ctx, '#38bdf8', wx + 3, wy + 3, glassW - 2, wh - 12);
    box(ctx, '#e0f2fe', wx + 4, wy + 4, glassW - 4, wh - 14);

    // Sheer linen curtain inside
    box(ctx, 'rgba(255, 255, 255, 0.9)', wx + 4, wy + 4, 4, wh - 14);

    // Signature Bcons Detail: Lam che cục nóng điều hòa (AC Compressor Louver Grille)
    // Vertical dark charcoal aluminum louvers on right side of balcony
    const louverX = wx + ww - 9;
    box(ctx, '#0f172a', louverX, wy + 2, 7, wh - 6);
    box(ctx, '#334155', louverX + 1, wy + 3, 5, wh - 8);
    for (let ly = wy + 4; ly < wy + wh - 6; ly += 4) {
      box(ctx, '#1e293b', louverX + 1, ly, 5, 2);
      box(ctx, '#475569', louverX + 1, ly, 5, 1);
    }

    // Modern Balcony Railing (Lower section: wy + wh - 12 to wy + wh)
    box(ctx, '#0f172a', wx, wy + wh - 12, ww, 12);
    box(ctx, 'rgba(224, 242, 254, 0.85)', wx + 1, wy + wh - 11, ww - 2, 10); // Tinted safety glass
    box(ctx, '#f8fafc', wx, wy + wh - 12, ww, 2); // Stainless steel top handrail
    box(ctx, '#64748b', wx, wy + wh - 2, ww, 2); // Bottom rail base

    // Tiny apartment room number badge
    box(ctx, '#ea580c', wx + 3, wy + 3, 5, 3);
  };

  // --- TẦNG 3 (y: 52..88, 36px) ---
  for (const bx of bayXs) {
    drawBconsBalconySuite(bx, 52);
  }

  // Architectural dividing concrete horizontal molding
  box(ctx, '#cbd5e1', 6, 92, w - 12, 4);
  box(ctx, '#94a3b8', 6, 93, w - 12, 1);

  // --- TẦNG 2 (y: 98..134, 36px) ---
  for (const bx of bayXs) {
    drawBconsBalconySuite(bx, 98);
  }

  // Architectural dividing concrete horizontal molding
  box(ctx, '#cbd5e1', 6, 138, w - 12, 4);
  box(ctx, '#94a3b8', 6, 139, w - 12, 1);

  // --- TẦNG 1 (y: 144..180, 36px) ---
  for (const bx of bayXs) {
    drawBconsBalconySuite(bx, 144);
  }

  // 3. ARCHITECTURAL CANOPY & BCONS PLAZA SIGNBOARD (y: 186..206, 20px)
  // Modern steel-framed glass entrance canopy projecting forward
  box(ctx, '#0f172a', 4, 186, w - 8, 4);
  box(ctx, '#0284c7', 6, 188, w - 12, 2); // Bcons blue LED strip
  box(ctx, 'rgba(224, 242, 254, 0.75)', 8, 190, w - 16, 4); // Glass canopy overhang

  // Luxury 3D Acrylic Signboard ("BCONS PLAZA - BIÊN HÒA")
  const signW = 196;
  const signX = (w - signW) / 2;
  const signY = 192;
  const signH = 15;
  box(ctx, '#0f172a', signX - 1, signY - 1, signW + 2, signH + 2);
  box(ctx, '#0284c7', signX, signY, signW, signH); // Bcons blue frame
  box(ctx, '#0f172a', signX + 1, signY + 1, signW - 2, signH - 2);

  // Sign text with Bcons logo crest
  box(ctx, '#ea580c', signX + 6, signY + 3, 8, 8); // Orange Bcons emblem
  box(ctx, '#38bdf8', signX + 10, signY + 3, 4, 8);
  ctx.font = '900 7px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CHUNG CƯ BCONS PLAZA · BIÊN HÒA', w / 2 + 6, signY + signH / 2);

  // 4. GROUND FLOOR LOBBY & ENTRANCE (y: 208..253, 45px tall!)
  // Polished dark charcoal granite cladding
  box(ctx, '#0f172a', 6, 208, w - 12, base - 208);
  box(ctx, '#1e293b', 8, 210, w - 16, base - 210);

  // Granite vertical grooved seams
  for (let gx = 18; gx < w - 18; gx += 24) {
    box(ctx, '#334155', gx, 210, 1, base - 210);
  }

  // Flanking Commercial Shophouses
  // Left Shophouse: 24/7 Convenience Store (WinMart / GS25 style - x: 14..94, y: 212..250)
  const storeX = 14;
  const storeW = 80;
  box(ctx, '#0f172a', storeX, 212, storeW, 38);
  box(ctx, 'rgba(254, 243, 199, 0.95)', storeX + 2, 214, storeW - 4, 34); // Glowing lit interior
  // Red & Yellow store branding fascia header
  box(ctx, '#dc2626', storeX + 2, 214, storeW - 4, 6);
  box(ctx, '#facc15', storeX + 2, 219, storeW - 4, 2);
  // Merchandise display racks inside store
  for (let sx = storeX + 6; sx < storeX + storeW - 12; sx += 14) {
    box(ctx, '#475569', sx, 226, 10, 18);
    box(ctx, '#f43f5e', sx + 1, 228, 8, 3); // Snack packages
    box(ctx, '#38bdf8', sx + 1, 234, 8, 3); // Drinks
    box(ctx, '#22c55e', sx + 1, 240, 8, 3);
  }

  // Right Shophouse: Bcons Resident Coffee & Co-Working Lounge (x: 170..250, y: 212..250)
  const cafeX = 170;
  const cafeW = 80;
  box(ctx, '#0f172a', cafeX, 212, cafeW, 38);
  box(ctx, 'rgba(254, 249, 195, 0.95)', cafeX + 2, 214, cafeW - 4, 34);
  // Coffee fascia header
  box(ctx, '#451a03', cafeX + 2, 214, cafeW - 4, 6);
  box(ctx, '#ca8a04', cafeX + 2, 219, cafeW - 4, 2);
  // Coffee bar & seating
  box(ctx, '#78350f', cafeX + 16, 228, 48, 6);
  box(ctx, '#451a03', cafeX + 22, 234, 4, 12);
  box(ctx, '#451a03', cafeX + 54, 234, 4, 12);
  box(ctx, '#0284c7', cafeX + 6, 226, 8, 18); // Modern blue armchair
  box(ctx, '#f97316', cafeX + cafeW - 14, 226, 8, 18); // Orange Bcons armchair

  // Central Grand Glass Entrance Lobby (doorX = 100, doorW = 64)
  const door = 4 + b.door.x * TILE - b.rect.x; // 100
  const doorW = b.door.w * TILE; // 64
  const dy = 210;
  const dh = base - dy; // 43px

  // Door outer structural frame
  box(ctx, '#0f172a', door - 2, dy, doorW + 4, dh);
  box(ctx, '#d4af37', door - 1, dy + 1, doorW + 2, dh - 1); // Gold outer trim

  // Glowing warm interior lobby
  box(ctx, '#fef3c7', door + 2, dy + 2, doorW - 4, dh - 4);
  // Interior checkered marble floor
  for (let cy = dy + 16; cy < base - 2; cy += 8) {
    for (let cx = door + 4; cx < door + doorW - 4; cx += 8) {
      if ((Math.floor((cx - door) / 8) + Math.floor((cy - dy) / 8)) % 2 === 0) {
        box(ctx, '#fed7aa', cx, cy, 8, 8);
      }
    }
  }

  // Inside reception desk & modern chandelier
  box(ctx, '#78350f', door + 18, dy + 12, 28, 12);
  box(ctx, '#ca8a04', door + 20, dy + 14, 24, 8);
  box(ctx, '#facc15', door + doorW / 2 - 4, dy + 4, 8, 4); // Chandelier light

  // Double automatic sliding glass doors with brass handles
  const halfW = (doorW - 8) / 2;
  // Left glass door panel
  box(ctx, 'rgba(224, 242, 254, 0.75)', door + 2, dy + 2, halfW, dh - 6);
  box(ctx, '#cbd5e1', door + 2, dy + 2, halfW, 1);
  box(ctx, '#d4af37', door + 2 + halfW - 3, dy + 12, 2, 16); // Brass handle
  // Right glass door panel
  box(ctx, 'rgba(224, 242, 254, 0.75)', door + halfW + 6, dy + 2, halfW, dh - 6);
  box(ctx, '#cbd5e1', door + halfW + 6, dy + 2, halfW, 1);
  box(ctx, '#d4af37', door + halfW + 7, dy + 12, 2, 16); // Brass handle

  // Red Welcome Carpet Runner at entrance
  const matW = doorW - 12;
  box(ctx, '#991b1b', door + 6, base - 6, matW, 6);
  box(ctx, '#dc2626', door + 7, base - 5, matW - 2, 4);
  box(ctx, '#fef08a', door + 12, base - 4, matW - 12, 2);

  // Polished granite entrance threshold step
  box(ctx, '#cbd5e1', door - 4, base - 2, doorW + 8, 2);

  // 4 Brass Carriage Sconces flanking the entrance & building corners
  for (const lx of [door - 8, door + doorW + 6, 12, w - 16]) {
    box(ctx, '#0f172a', lx, 218, 4, 8);
    box(ctx, '#d4af37', lx + 1, 219, 2, 6);
    box(ctx, '#fef08a', lx, 221, 4, 4); // Glowing warm filament
  }

  return c;
}

/** Flat shop frontage for fashion and furniture stores. */
function paintModernBuilding(b: Building) {
  const fashion = b.id === 'fashion';
  const c = canvas(b.rect.w + 8, b.rect.h + BUILDING_ROOF),
    ctx = c.getContext('2d')!;
  const w = c.width,
    base = c.height - 3,
    eave = base - 90;
  const wall = fashion ? '#ead8e2' : '#dbe2c6';
  oval(ctx, 'rgba(35,54,35,0.22)', w / 2, base, w / 2 - 4, 4);
  box(ctx, '#56645b', 3, eave, w - 6, base - eave);
  box(ctx, wall, 5, eave + 2, w - 10, base - eave - 4);
  box(ctx, shade(wall, -0.14), w - 18, eave + 2, 13, base - eave - 4);

  box(ctx, '#514e54', 1, 12, w - 2, eave - 9);
  box(ctx, fashion ? '#9b799f' : '#769578', 3, 14, w - 6, eave - 14);
  for (let y = 20; y < eave - 5; y += 6) box(ctx, fashion ? '#af91b1' : '#8ba886', 4, y, w - 8, 1);
  box(ctx, fashion ? '#6b4c75' : '#3b6d55', 0, eave - 3, w, 7);
  const dx = 20,
    dw = w - 40;
  windowPane(ctx, dx, base - 55, dw, 43, fashion ? '#aa7b9a' : '#719b77');
  if (fashion) {
    dormer(ctx, w / 2 - 18, Math.max(16, eave - 47), 36, '#a28da5');
    for (const x of [dx + 12, dx + dw - 22]) {
      oval(ctx, '#d7b99c', x, base - 45, 4, 4);
      box(ctx, '#c49cac', x - 6, base - 40, 12, 18);
      box(ctx, '#69575f', x - 3, base - 22, 2, 9);
      box(ctx, '#69575f', x + 2, base - 22, 2, 9);
    }
  } else {
    box(ctx, '#b38f5e', dx + 6, base - 34, dw - 12, 19);
    box(ctx, '#d0b681', dx + 8, base - 37, dw - 16, 12);
    box(ctx, '#f0d99b', dx + 12, base - 34, 16, 8);
    // White mullions distinguish the furniture display from the entrance.
    for (let x = dx + dw / 4; x < dx + dw; x += dw / 4) box(ctx, '#eee8d1', x, base - 54, 2, 41);
    box(ctx, '#eee8d1', dx, base - 34, dw, 2);
  }

  const sign = fashion ? 'THREADBARE' : 'SOFA SO GOOD';
  box(ctx, fashion ? '#715075' : '#34684e', 12, eave + 6, w - 24, 18);
  label(ctx, sign, w / 2, eave + 15, w - 32, '#f3e7d3', 11);
  const door = 4 + b.door.x * TILE - b.rect.x;
  box(ctx, '#3e5051', door + 16, base - 42, b.door.w * TILE - 32, 40);
  box(ctx, '#a4c5c4', door + 18, base - 40, b.door.w * TILE - 36, 36);
  box(ctx, '#d8dece', door + (b.door.w * TILE) / 2 - 1, base - 40, 2, 36);
  box(ctx, '#ded3b8', door + 10, base - 3, b.door.w * TILE - 20, 4);
  return c;
}

function paintReferenceBuilding(b: Building) {
  if (b.id === 'apartments') return paintApartmentBuilding(b);
  if (['fashion', 'furniture'].includes(b.id)) return paintModernBuilding(b);
  const c = paintBuilding(b),
    ctx = c.getContext('2d')!,
    w = c.width,
    base = c.height - 2;
  if (b.id === 'cafe') {
    dormer(ctx, 20, 39, 36, '#bd7354');
    dormer(ctx, w - 60, 39, 36, '#bd7354');
    // Shaded timber columns and cream arches above the cafe windows.
    for (const x of [18, w - 55]) {
      oval(ctx, '#efe1bb', x + 12, base - 42, 13, 8);
      oval(ctx, '#889d91', x + 12, base - 40, 10, 6);
      box(ctx, '#e8ddbb', x + 10, base - 45, 2, 13);
    }
  } else if (b.id === 'delivery') {
    for (const x of [5, w - 10])
      for (let y = base - 70; y < base - 8; y += 9) box(ctx, '#f7edcc', x, y, 6, 5);
    const dx = 4 + b.door.x * TILE - b.rect.x + 18;
    box(ctx, '#68543a', dx, base - 37, 27, 35);
    box(ctx, '#a98658', dx + 2, base - 35, 23, 32);
    windowPane(ctx, dx + 6, base - 31, 14, 13, '#d3c399');
    box(ctx, '#e6c583', dx + 19, base - 14, 2, 2);
  } else if (b.id === 'fishing_shop') {
    for (const x of [21, w - 50]) {
      box(ctx, '#eee4c5', x, base - 40, 19, 2);
      box(ctx, '#eee4c5', x + 8, base - 39, 2, 18);
      box(ctx, '#eee4c5', x, base - 30, 19, 2);
    }
    box(ctx, '#68796f', w - 20, base - 40, 12, 15);
    for (let y = base - 38; y < base - 26; y += 3) box(ctx, '#c3cbb4', w - 19, y, 10, 1);
  }
  return c;
}

export function buildDetailedTown(scene: Phaser.Scene) {
  const texture = (key: string, paint: () => HTMLCanvasElement) => {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, paint());
    return key;
  };
  scene.add.image(0, 0, texture('town-ground', paintTown)).setName('town-ground').setOrigin(0).setDepth(-10);
  for (const [i, wall] of TOWN_TEMPLE_WALLS.entries()) {
    const key = texture(`temple:wall:${i}`, () => paintTempleWall(wall.w, wall.h));
    scene.add
      .image(wall.x - 4, wall.y - 16, key)
      .setName(key)
      .setOrigin(0)
      .setDepth(wall.y + wall.h);
  }
  scene.add
    .image(1398, 588, texture('temple:gate', paintTempleGate))
    .setName('temple:gate')
    .setOrigin(0.5, 1)
    .setDepth(588);
  for (const b of BUILDINGS) {
    const key = texture(`bld:${b.id}`, () => paintReferenceBuilding(b));
    scene.add
      .image(b.rect.x - 4, b.rect.y - BUILDING_ROOF, key)
      .setName(key)
      .setOrigin(0)
      .setDepth(b.rect.y + b.rect.h - 4);
  }
  for (const s of TOWN_SCENERY) {
    const key = texture(`scenery:${s.id}`, () => paintScenery(s));
    scene.add
      .image(s.rect.x + s.rect.w / 2, s.rect.y + s.rect.h, key)
      .setName(key)
      .setOrigin(0.5, 1)
      .setDepth(s.rect.y + s.rect.h);
  }
  scene.add
    .text(624, 695, 'GARA BẠC HÀ', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#fff1bd',
      resolution: 2,
    })
    .setOrigin(0.5)
    .setDepth(786);
  scene.add
    .text(624, 816, 'MUA XE · E', {
      fontFamily: 'sans-serif',
      fontSize: '10px',
      color: '#254544',
      resolution: 2,
    })
    .setOrigin(0.5)
    .setDepth(-7);
  for (const p of TOWN_PROPS) {
    const key = texture(`prop:${p.kind}`, () => paintProp(p.kind));
    scene.add
      .image(p.x * TILE, p.y * TILE, key)
      .setName(`${key}:${p.x}:${p.y}`)
      .setOrigin(0.5, 1)
      .setDepth(p.y * TILE);
  }
  const treeKey = texture('tree:fruit', () => {
    const c = canvas(76, 90),
      ctx = c.getContext('2d')!;
    drawTree(ctx, 38, 88, 1.45);
    const rng = mulberry(193);
    for (let i = 0; i < 13; i++) {
      const x = 16 + rng() * 44,
        y = 24 + rng() * 32;
      oval(ctx, '#93522c', x, y + 1, 3, 3);
      oval(ctx, '#e9a947', x, y, 2, 2);
      box(ctx, '#ffe18b', x - 1, y - 1, 1, 1);
    }
    return c;
  });
  const woodland = [0, 1, 2].map((i) =>
    texture(`tree:woodland:${i}`, () => {
      const c = canvas(82, 94),
        ctx = c.getContext('2d')!;
      drawTree(ctx, 40, 91, 1.25 + i * 0.12);
      return c;
    }),
  );
  const tree = (x: number, y: number, name: string, key = treeKey) =>
    scene.add.image(x, y, key).setName(name).setOrigin(0.5, 1).setDepth(y);
  for (const [i, p] of TOWN_TREES.entries()) tree(p.x * TILE, p.y * TILE, `tree:${i}`);
  // The pagoda garden has an irregular mango tree west of its entrance and
  // a smaller unfruited tree inside the southeast wall.
  const courtyardTree = scene.children.getByName('tree:10') as Phaser.GameObjects.Image;
  courtyardTree?.setTexture(
    texture('tree:temple-mango', () => {
      const c = canvas(78, 108),
        ctx = c.getContext('2d')!;
      drawTree(ctx, 38, 105, 1.5);
      drawTree(ctx, 29, 97, 0.85);
      const rng = mulberry(481);
      for (let i = 0; i < 12; i++) {
        const x = 16 + rng() * 45,
          y = 33 + rng() * 34;
        oval(ctx, '#c59139', x, y, 2, 3);
        box(ctx, '#f7d35b', x - 1, y - 2, 2, 3);
      }
      return c;
    }),
  );
  (scene.children.getByName('tree:13') as Phaser.GameObjects.Image).setTexture(woodland[0]!).setScale(0.62);
  // Border trees also remain editable objects and participate in depth sorting.
  const rng = mulberry(812);
  for (let x = 12; x < MAP_WIDTH; x += 35 + Math.floor(rng() * 14)) {
    const i = Math.floor(rng() * 3);
    tree(x, 46 + Math.floor(rng() * 20), `border:north:${x}`, woodland[i]!).setTint(
      [0xffffff, 0xd5e3bb, 0xb9d4a1][i]!,
    );
    if (x < 1120)
      tree(x, MAP_HEIGHT + Math.floor(rng() * 12), `border:south:${x}`, woodland[(i + 1) % 3]!).setScale(
        0.8 + rng() * 0.35,
      );
  }
  for (let y = 100; y < MAP_HEIGHT - 25; y += 38 + Math.floor(rng() * 14)) {
    const key = woodland[Math.floor(rng() * 3)]!;
    tree(8 + Math.floor(rng() * 10), y, `border:west:${y}`, key).setScale(0.85 + rng() * 0.3);
    if (y < 640) tree(MAP_WIDTH - 8, y, `border:east:${y}`, key);
  }
  const palmKey = texture('tree:border-palm', paintPalm);
  for (const [i, p] of [
    { x: 30, y: 190 },
    { x: 1497, y: 275 },
    { x: 22, y: 690 },
  ].entries())
    tree(p.x, p.y, `border:palm:${i}`, palmKey);
  for (const [i, p] of [
    { x: 1189, y: 730, color: '#d8c57d', angle: -6 },
    { x: 1310, y: 789, color: '#bb704a', angle: 5 },
    { x: 1189, y: 900, color: '#839c78', angle: 2 },
    { x: 1380, y: 925, color: '#ac9370', angle: 78 },
  ].entries()) {
    const key = texture(`boat:${i}`, () => paintBoat(p.color));
    scene.add.image(p.x, p.y, key).setName(key).setOrigin(0.5, 1).setDepth(p.y).setAngle(p.angle);
  }
}
