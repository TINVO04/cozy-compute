import type Phaser from 'phaser';
import { FARM_GARDEN, FARM_POIS, FARM_WIDTH, FARM_HEIGHT, TILE, type Rect } from '@cozy/game-data';
import { drawTree, paintBuilding, paintProp } from './town';

export function farmBuilding(p: Rect, label: string, roof: number) {
  return paintBuilding({
    id: 'farm-building',
    label,
    rect: p,
    wall: 0xe9d8b2,
    roof,
    accent: 0x6d7351,
    door: { x: (p.x + p.w / 2) / TILE - 1, w: 2 },
  });
}

export function paintFarmPen(p: Rect, roof: string, pasture = false) {
  const c = document.createElement('canvas');
  c.width = p.w;
  c.height = p.h;
  const ctx = c.getContext('2d')!;
  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  box(pasture ? '#a4bd80' : '#bfa775', 0, 0, p.w, p.h);
  // Compact timber shelter; its footprint is shared with the server.
  box('#6c5540', 16, 12, 80, 48);
  box('#cfb27b', 19, 18, 74, 40);
  for (let x = 24; x < 90; x += 10) box('#b79866', x, 24, 2, 32);
  box('#544936', 12, 4, 88, 23);
  box(roof, 14, 5, 84, 18);
  for (let y = 9; y < 23; y += 5) box('#ffffff22', 14, y, 84, 1);
  box('#584b36', 39, 34, 30, 26);
  box('#d8c086', 41, 54, 26, 5);
  box('#897044', p.w - 62, 28, 44, 22);
  box('#d7bd76', p.w - 60, 30, 40, 16);
  for (let x = p.w - 57; x < p.w - 20; x += 7) box('#f0d593', x, 29, 2, 15);
  const rail = (x: number, y: number, w: number) => {
    box('#8b7150', x, y, w, 8);
    box('#ddc79b', x, y, w, 3);
    for (let px = x; px < x + w; px += 32) {
      box('#806647', px, y - 5, 6, 13);
      box('#e5d0a3', px, y - 5, 6, 3);
    }
  };
  rail(0, 5, p.w);
  rail(0, p.h - 8, p.w / 2 - TILE);
  rail(p.w / 2 + TILE, p.h - 8, p.w / 2 - TILE);
  box('#8b7150', 0, 8, 8, p.h - 16);
  box('#d3bd91', 0, 8, 3, p.h - 16);
  box('#8b7150', p.w - 8, 8, 8, p.h - 16);
  box('#d3bd91', p.w - 8, 8, 3, p.h - 16);
  return c;
}

export function decorateFarm(scene: Phaser.Scene) {
  if (!scene.textures.exists('farm:tree')) {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 112;
    drawTree(c.getContext('2d')!, 48, 108, 2);
    scene.textures.addCanvas('farm:tree', c);
  }
  const trees = FARM_GARDEN.trees.map(([x, y]) =>
    scene.add
      .sprite(x * TILE, y * TILE, 'farm:tree')
      .setOrigin(0.5, 1)
      .setDepth(y * TILE),
  );
  if (!scene.textures.exists('farm:bench')) scene.textures.addCanvas('farm:bench', paintProp('bench'));
  const b = FARM_GARDEN.bench;
  scene.add
    .image(b.x + b.w / 2, b.y + b.h, 'farm:bench')
    .setOrigin(0.5, 1)
    .setDisplaySize(b.w, b.h + 16)
    .setDepth(b.y + b.h);
  const g = scene.add.graphics().setDepth(-7);
  const box = (color: number, x: number, y: number, w: number, h: number) =>
    g.fillStyle(color).fillRect(x, y, w, h);
  // Perimeter follows the same one-tile boundary, leaving the western gate open.
  for (let x = 16; x < FARM_WIDTH; x += TILE)
    for (const y of [16, FARM_HEIGHT - 16]) {
      box(0x9c825a, x, y, TILE, 5);
      box(0xd9c49a, x, y - 5, 5, 14);
    }
  for (let y = 16; y < FARM_HEIGHT; y += TILE)
    for (const x of [16, FARM_WIDTH - 16]) {
      if (x === 16 && y >= 64 && y < 160) continue;
      box(0x9c825a, x, y, 5, TILE);
      box(0xd9c49a, x - 3, y, 11, 5);
    }
  const p = FARM_POIS.aquaculture_pond;
  // Short landing stays on dry land so its appearance agrees with collision.
  for (let y = p.y + 96; y < p.y + 160; y += 8) {
    box(0x84694d, p.x - 32, y, 32, 8);
    box(0xc9a779, p.x - 31, y, 30, 5);
  }
  for (const [dx, dy] of [
    [64, 64],
    [320, 160],
    [288, 64],
  ] as const) {
    box(0x557e60, p.x + dx, p.y + dy, 20, 8);
    box(0x8caa70, p.x + dx + 3, p.y + dy, 14, 3);
    box(0xe9c0af, p.x + dx + 8, p.y + dy - 3, 5, 5);
  }
  const well = FARM_GARDEN.well;
  const stone = scene.add.graphics().setDepth(well.y + well.h);
  stone.fillStyle(0x776e58).fillRect(well.x, well.y, 32, 32);
  stone.fillStyle(0xd5c7a5).fillRect(well.x + 2, well.y + 2, 28, 24);
  stone.fillStyle(0x527b77).fillRect(well.x + 7, well.y + 6, 18, 12);
  stone.lineStyle(3, 0x8d7251).strokeRect(well.x + 2, well.y - 8, 28, 24);
  // Small flower clusters frame the map; the usable routes remain clear.
  for (let x = 96; x < FARM_WIDTH - 64; x += 96)
    for (const y of [56, FARM_HEIGHT - 64]) {
      box(0x638851, x, y, 12, 6);
      box(0xf1daa6, x + 2, y - 3, 4, 4);
      box(0xdcaea0, x + 9, y, 4, 4);
    }
  return trees;
}
