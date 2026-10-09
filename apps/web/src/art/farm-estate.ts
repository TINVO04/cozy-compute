import type Phaser from 'phaser';
import { FARM_GARDEN } from '@cozy/game-data';
import { useUi } from '../lib/store';
import { box, ellipse, tiledRoof } from './farm-detail';
import { mulberry } from './pixel';

function canvas(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  paint(ctx);
  return c;
}

function polygon(ctx: CanvasRenderingContext2D, color: string, points: number[][]) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x!, y!) : ctx.moveTo(x!, y!)));
  ctx.closePath();
  ctx.fill();
}

/** Organic foliage clusters also serve as native-scale pots and flowering vines. */
export function foliage(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  seed: number,
  bloom = false,
) {
  const rng = mulberry(seed);
  ellipse(ctx, '#355c3d40', x + 3, y + 5, size + 3, size * 0.45);
  for (let i = 0; i < 13; i++) {
    const px = x + (rng() - 0.5) * size * 1.6;
    const py = y + (rng() - 0.5) * size * 0.7;
    const r = size * (0.24 + rng() * 0.25);
    ellipse(ctx, '#3f704a', px, py, r, r * 0.68);
    ellipse(ctx, '#659650', px - 1, py - 2, r - 1, r * 0.55);
    ellipse(ctx, '#93b66a', px - 2, py - 3, r * 0.5, r * 0.28);
    if (bloom && i % 2 === 0) {
      const col = ['#e69893', '#f6d88a', '#d1b1cc', '#fff0c7'][seed % 4]!;
      ellipse(ctx, col, px - 1, py - 4, 3, 2);
      box(ctx, '#fff3c8', px - 1, py - 5, 1, 2);
    }
  }
}

function pot(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number) {
  box(ctx, '#77553f', x - 6, y - 9, 12, 10);
  box(ctx, '#ba8260', x - 5, y - 8, 10, 8);
  box(ctx, '#e1aa78', x - 6, y - 10, 12, 3);
  foliage(ctx, x, y - 15, 9, seed, true);
}

function greenhouse() {
  return canvas(224, 128, (ctx) => {
    ellipse(ctx, '#37543740', 115, 120, 106, 7);
    box(ctx, '#727c62', 7, 113, 210, 10);
    box(ctx, '#bcbea0', 8, 113, 208, 7);
    for (let x = 9; x < 216; x += 17) box(ctx, '#eee0b9', x, 114, 15, 4);
    box(ctx, '#436f64', 10, 61, 204, 52);
    box(ctx, '#90bba6', 13, 65, 198, 46);
    // Visible nursery benches behind translucent panes.
    for (const y of [83, 108]) {
      box(ctx, '#866b4c', 18, y, 186, 4);
      for (let x = 26; x < 208; x += 22) pot(ctx, x, y - 1, x + y);
    }
    polygon(ctx, '#41655a', [
      [5, 66],
      [31, 15],
      [191, 15],
      [219, 66],
    ]);
    polygon(ctx, '#aacbb0', [
      [10, 63],
      [34, 19],
      [189, 19],
      [214, 63],
    ]);
    for (let i = 0; i < 7; i++) {
      const x = 35 + i * 25;
      polygon(ctx, i % 2 ? '#89b7a1' : '#b6d5be', [
        [x, 21],
        [x + 21, 21],
        [x + 26, 60],
        [x - 6, 60],
      ]);
      polygon(ctx, '#dae7c9', [
        [x + 3, 23],
        [x + 9, 23],
        [x + 4, 58],
        [x - 2, 58],
      ]);
    }
    for (let x = 31; x <= 192; x += 27) {
      polygon(ctx, '#537a65', [
        [x, 18],
        [x + 3, 18],
        [x + (x - 112) * 0.17 + 3, 64],
        [x + (x - 112) * 0.17, 64],
      ]);
    }
    box(ctx, '#e4ddbb', 29, 14, 165, 4);
    box(ctx, '#e6dfbb', 6, 63, 212, 4);
    box(ctx, '#76997f', 9, 85, 206, 3);
    for (let x = 12; x < 216; x += 25) {
      box(ctx, '#486e5a', x, 66, 4, 47);
      box(ctx, '#d7d7b4', x, 66, 2, 47);
    }
    box(ctx, '#435f50', 94, 68, 35, 45);
    box(ctx, '#c7d6b5', 97, 71, 29, 41);
    box(ctx, '#72a899', 99, 74, 25, 30);
    polygon(ctx, '#b7d7bb', [
      [100, 75],
      [109, 75],
      [122, 101],
      [113, 101],
    ]);
    box(ctx, '#5b7b64', 110, 73, 2, 31);
    box(ctx, '#f3cf84', 119, 98, 3, 3);
    box(ctx, '#e2cd9c', 88, 113, 48, 5);
    for (const x of [11, 208]) foliage(ctx, x, 107, 16, x, true);
    box(ctx, '#6e6248', 67, 51, 91, 14);
    box(ctx, '#f0e0b8', 69, 52, 87, 11);
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#45634b';
    ctx.fillText('VƯỜN ƯƠM BỐN MÙA', 112, 60);
  });
}

function windmill() {
  return canvas(144, 216, (ctx) => {
    ellipse(ctx, '#38553c45', 76, 207, 57, 8);
    polygon(ctx, '#655b47', [
      [50, 80],
      [94, 80],
      [108, 206],
      [35, 206],
    ]);
    polygon(ctx, '#d5c699', [
      [52, 83],
      [91, 83],
      [103, 203],
      [39, 203],
    ]);
    polygon(ctx, '#ece0b5', [
      [52, 84],
      [66, 84],
      [59, 203],
      [40, 203],
    ]);
    polygon(ctx, '#b5a37a', [
      [85, 84],
      [91, 84],
      [103, 203],
      [85, 203],
    ]);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(52, 84);
    ctx.lineTo(91, 84);
    ctx.lineTo(103, 203);
    ctx.lineTo(39, 203);
    ctx.clip();
    for (let y = 97; y < 204; y += 10) {
      box(ctx, '#baa87f', 38, y, 68, 1);
      for (let x = 39 + (y % 20 ? 0 : 8); x < 108; x += 17) box(ctx, '#baa87f', x, y - 8, 1, 8);
    }
    ctx.restore();
    for (let y = 0; y < 34; y++) {
      box(ctx, '#684d3d', 72 - y, 48 + y, y * 2 + 1, 2);
      if (y > 2) box(ctx, y % 6 < 2 ? '#d08c65' : '#ab614b', 74 - y, 48 + y, y * 2 - 3, 1);
    }
    box(ctx, '#efc394', 36, 82, 73, 3);
    for (const y of [106, 138]) {
      box(ctx, '#5d654d', 64, y, 16, 20);
      box(ctx, '#a9c5af', 67, y + 3, 10, 14);
      box(ctx, '#f8e2a7', 67, y + 3, 4, 6);
      box(ctx, '#5d654d', 71, y + 3, 2, 14);
      box(ctx, '#d4b47e', 62, y + 20, 20, 3);
    }
    box(ctx, '#6e533b', 61, 175, 24, 30);
    box(ctx, '#9b754f', 64, 177, 18, 26);
    for (let x = 65; x < 83; x += 5) box(ctx, '#c49b69', x, 179, 1, 22);
    box(ctx, '#edcf8c', 77, 190, 2, 3);
    box(ctx, '#e0cca4', 55, 204, 36, 4);
    foliage(ctx, 33, 204, 18, 50, true);
    foliage(ctx, 111, 205, 16, 51, true);
    box(ctx, '#655b47', 70, 34, 3, 18);
    box(ctx, '#af7750', 62, 36, 22, 2);
    polygon(ctx, '#e5bc75', [
      [83, 32],
      [89, 37],
      [83, 42],
    ]);
  });
}

function windmillSails() {
  return canvas(140, 140, (ctx) => {
    ctx.translate(70, 70);
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2);
      box(ctx, '#5c5140', -3, -66, 6, 68);
      box(ctx, '#b99665', -1, -64, 2, 64);
      box(ctx, '#765e45', 2, -63, 18, 42);
      box(ctx, '#f0dfb3', 4, -61, 14, 38);
      box(ctx, '#fff0cd', 4, -61, 4, 38);
      for (let y = -60; y < -22; y += 7) box(ctx, '#bda473', 4, y, 14, 2);
      box(ctx, '#d1b98b', 11, -61, 2, 38);
      ctx.restore();
    }
    ellipse(ctx, '#4b513e', 0, 0, 9, 9);
    ellipse(ctx, '#c19d62', -1, -1, 6, 6);
    ellipse(ctx, '#f2d493', -2, -2, 3, 3);
  });
}

function flowerCart() {
  return canvas(112, 104, (ctx) => {
    ellipse(ctx, '#37533745', 57, 97, 51, 6);
    for (const x of [24, 85]) {
      ellipse(ctx, '#594936', x, 91, 11, 11);
      ellipse(ctx, '#a58152', x, 91, 8, 8);
      ellipse(ctx, '#e5c08b', x, 91, 5, 5);
      box(ctx, '#6b543d', x - 1, 83, 2, 16);
      box(ctx, '#6b543d', x - 8, 90, 16, 2);
    }
    box(ctx, '#6d543e', 9, 61, 93, 26);
    box(ctx, '#b68856', 11, 64, 89, 20);
    for (let y = 65; y < 84; y += 5) box(ctx, '#dfb780', 12, y, 87, 2);
    for (let x = 17; x < 98; x += 17) pot(ctx, x, 65, x);
    for (const x of [11, 99]) {
      box(ctx, '#795c42', x, 21, 4, 44);
      box(ctx, '#cba273', x, 21, 1, 43);
    }
    polygon(ctx, '#765944', [
      [4, 29],
      [18, 7],
      [95, 7],
      [108, 29],
    ]);
    for (let i = 0; i < 8; i++) {
      const x = 18 + i * 9.5;
      polygon(ctx, i % 2 ? '#f5e2b8' : '#bd766c', [
        [x, 9],
        [x + 9, 9],
        [x + 9 + (i - 3) * 1.9, 28],
        [x + (i - 4) * 1.9, 28],
      ]);
    }
    box(ctx, '#f3d8ac', 5, 29, 103, 4);
    for (let x = 6; x < 108; x += 12) ellipse(ctx, '#f3d8ac', x + 5, 33, 5, 3);
    box(ctx, '#68543d', 35, 70, 45, 12);
    box(ctx, '#f0deb4', 37, 71, 41, 9);
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#655a43';
    ctx.fillText('HOA VƯỜN', 57, 78);
  });
}

function pergola() {
  return canvas(152, 100, (ctx) => {
    for (const x of [15, 129]) {
      box(ctx, '#68513b', x, 35, 6, 60);
      box(ctx, '#c6a476', x, 35, 3, 58);
      box(ctx, '#e8cfa2', x - 2, 91, 10, 5);
    }
    for (let x = 8; x < 149; x += 17) {
      box(ctx, '#7a5a3d', x, 18, 5, 30);
      box(ctx, '#c8a779', x, 18, 3, 29);
    }
    for (const y of [22, 41]) {
      box(ctx, '#75573e', 2, y, 147, 7);
      box(ctx, '#dab888', 2, y, 147, 2);
    }
    for (let x = 7; x < 150; x += 18) foliage(ctx, x, 22 + Math.sin(x) * 6, 18, x + 11, true);
    for (const x of [19, 129]) for (let y = 39; y < 82; y += 13) foliage(ctx, x, y, 10, x + y, true);
    for (const x of [41, 105]) {
      box(ctx, '#66583e', x, 41, 1, 13);
      box(ctx, '#956b44', x - 4, 52, 9, 12);
      box(ctx, '#f5d99a', x - 2, 54, 5, 8);
    }
  });
}

function apiary() {
  return canvas(78, 62, (ctx) => {
    ellipse(ctx, '#3c563840', 39, 56, 36, 5);
    for (const x of [9, 43]) {
      box(ctx, '#795c40', x + 2, 42, 4, 14);
      box(ctx, '#795c40', x + 22, 42, 4, 14);
      box(ctx, '#956d40', x, 19, 29, 27);
      box(ctx, '#e0b56e', x + 2, 20, 25, 24);
      for (let y = 23; y < 44; y += 6) box(ctx, '#b18c53', x + 2, y, 25, 1);
      tiledRoof(ctx, { x: x - 1, y: 11, w: 31, h: 8 }, '#96724b');
      box(ctx, '#70573c', x + 8, 38, 13, 3);
      box(ctx, '#f1d397', x + 5, 42, 20, 3);
    }
  });
}

function duckHouse() {
  return canvas(86, 70, (ctx) => {
    ellipse(ctx, '#356c6145', 44, 64, 41, 5);
    box(ctx, '#72553d', 7, 45, 71, 18);
    for (let y = 46; y < 62; y += 5) box(ctx, '#c39e6f', 7, y, 71, 3);
    box(ctx, '#98734e', 20, 23, 48, 29);
    box(ctx, '#e3d0a5', 22, 24, 44, 25);
    tiledRoof(ctx, { x: 15, y: 10, w: 57, h: 19 }, '#7f9a79');
    box(ctx, '#65543b', 37, 34, 17, 18);
    box(ctx, '#d0ad77', 33, 52, 25, 5);
    for (let x = 26; x < 65; x += 9) box(ctx, '#bba079', x, 32, 1, 16);
    foliage(ctx, 12, 52, 10, 7, true);
  });
}

/** Each substantial decoration is placed against its shared authoritative footprint. */
export function decorateFarmEstate(scene: Phaser.Scene) {
  const add = (key: string, painter: () => HTMLCanvasElement, x: number, bottom: number) => {
    const texture = `farm:estate:${key}`;
    if (!scene.textures.exists(texture)) scene.textures.addCanvas(texture, painter());
    return scene.add.image(x, bottom, texture).setOrigin(0.5, 1).setDepth(bottom).setName(texture);
  };
  const g = FARM_GARDEN.greenhouse;
  add('greenhouse', greenhouse, g.x + g.w / 2, g.y + g.h);
  const w = FARM_GARDEN.windmill;
  add('windmill', windmill, w.x + w.w / 2, w.y + w.h);
  const sails = add('sails', windmillSails, w.x + w.w / 2, w.y + w.h - 142);
  sails
    .setOrigin(0.5)
    .setDepth(w.y + w.h + 1)
    .setAngle(24);
  if (!scene.textures.exists('farm:estate:butterfly')) {
    scene.textures.addCanvas(
      'farm:estate:butterfly',
      canvas(12, 10, (ctx) => {
        ellipse(ctx, '#b97a66', 3, 4, 3, 3);
        ellipse(ctx, '#b97a66', 9, 4, 3, 3);
        ellipse(ctx, '#f8d99a', 3, 3, 2, 2);
        ellipse(ctx, '#f8d99a', 9, 3, 2, 2);
        box(ctx, '#5e5741', 6, 3, 1, 6);
      }),
    );
  }
  const butterflies = [
    [357, 429],
    [668, 488],
    [1123, 500],
    [665, 714],
    [192, 726],
    [1260, 942],
  ].map(([x, y]) => ({
    x: x!,
    y: y!,
    sprite: scene.add.image(x!, y!, 'farm:estate:butterfly').setDepth(y! + 20),
  }));
  let flightTime = 0;
  const rotate = (_time: number, delta: number) => {
    const { reducedMotion, weather } = useUi.getState();
    const daylight = weather.solarHour >= 6 && weather.solarHour < 18 && weather.precipitationMm < 1;
    for (const { sprite } of butterflies) sprite.setVisible(daylight);
    if (reducedMotion) return;
    const step = Math.min(delta, 50);
    sails.angle += step * 0.005;
    flightTime += step * 0.001;
    butterflies.forEach(({ x, y, sprite }, i) => {
      const phase = flightTime + i * 1.9;
      sprite.setPosition(x + Math.sin(phase * 0.8) * 22, y + Math.cos(phase * 1.3) * 9);
      sprite.setScale(0.55 + Math.abs(Math.sin(phase * 9)) * 0.45, 1);
    });
  };
  scene.events.on('update', rotate);
  scene.events.once('shutdown', () => scene.events.off('update', rotate));
  const cart = FARM_GARDEN.flowerCart;
  add('flower-cart', flowerCart, cart.x + cart.w / 2, cart.y + cart.h);
  add('pergola', pergola, 756, 524);
  // Low apiary stands are tucked within the greenhouse's existing footprint.
  add('apiary', apiary, 422, 151);
  // Floating duck shelter is wholly inside the blocked aquaculture pond.
  add('duck-house', duckHouse, 1245, 231);
}
