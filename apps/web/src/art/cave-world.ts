import { mulberry, shade } from './pixel';
import { drawTree, paintProp } from './town';

type Ctx = CanvasRenderingContext2D;
export const CAVE_THEMES = [
  { name: 'Trạm thợ rèn', floor: '#778463', rock: '#7d8177', light: '#ffca78' },
  { name: 'Đường mỏ bỏ quên', floor: '#4b4747', rock: '#77777c', light: '#e7bc80' },
  { name: 'Vườn nấm lam', floor: '#3a4d4c', rock: '#657e79', light: '#82d6b6' },
  { name: 'Mạch ngọc bích', floor: '#3e4859', rock: '#6b7b95', light: '#71e5d6' },
  { name: 'Hồ thạch anh tím', floor: '#494354', rock: '#867b99', light: '#cbb0ee' },
  { name: 'Hốc nham thạch rực', floor: '#4a3832', rock: '#7a554a', light: '#ff8a50' },
  { name: 'Hầm rêu độc', floor: '#354838', rock: '#5c735d', light: '#79ea86' },
  { name: 'Vực sâu tĩnh lặng', floor: '#32394a', rock: '#55637d', light: '#6baeff' },
  { name: 'Rạn san hô ngọc', floor: '#2a4450', rock: '#4e7587', light: '#45e3ff' },
  { name: 'Hang tinh thể hoàng kim', floor: '#484335', rock: '#7c725c', light: '#ffd166' },
  { name: 'Lăng mộ đá đen', floor: '#2c2a33', rock: '#4f4a5c', light: '#c084fc' },
  { name: 'Thung lũng lân tinh', floor: '#29433e', rock: '#4c736a', light: '#4ade80' },
  { name: 'Đền thờ lãng quên', floor: '#3e3a47', rock: '#6a6378', light: '#f472b6' },
  { name: 'Vực băng vĩnh cửu', floor: '#2f4252', rock: '#54728c', light: '#a5f3fc' },
  { name: 'Mạch huyết ngọc', floor: '#482a2f', rock: '#784650', light: '#f87171' },
  { name: 'Vườn hoa độc dược', floor: '#382a44', rock: '#624a75', light: '#d946ef' },
  { name: 'Điện thờ sấm sét', floor: '#2a3b4c', rock: '#4d6985', light: '#38bdf8' },
  { name: 'Vực hỗn mang', floor: '#262235', rock: '#473d61', light: '#a855f7' },
  { name: 'Ngai vàng Hư Vô', floor: '#1e1a2e', rock: '#3c3257', light: '#e879f9' },
];
function rect(c: Ctx, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function poly(c: Ctx, color: string, points: number[][]) {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) =>
    i ? c.lineTo(Math.round(x!), Math.round(y!)) : c.moveTo(Math.round(x!), Math.round(y!)),
  );
  c.closePath();
  c.fill();
}
function oval(c: Ctx, color: string, x: number, y: number, rx: number, ry: number) {
  for (let dy = -Math.floor(ry); dy <= ry; dy++) {
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    rect(c, color, x - dx, y + dy, dx * 2 + 1, 1);
  }
}
function stroke(c: Ctx, color: string, x: number, y: number, ex: number, ey: number, w = 1) {
  const n = Math.max(Math.abs(ex - x), Math.abs(ey - y), 1);
  for (let i = 0; i <= n; i++) rect(c, color, x + ((ex - x) * i) / n, y + ((ey - y) * i) / n, w, w);
}
function glow(c: Ctx, x: number, y: number, color: string, radius: number, alpha = 0.18) {
  const g = c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, color + '00');
  c.globalAlpha = alpha;
  c.fillStyle = g;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  c.globalAlpha = 1;
}
function rock(c: Ctx, x: number, y: number, w: number, h: number, color: string, seed: number) {
  const r = mulberry(seed);
  const top = y - h;
  oval(c, '#141c243f', x + w * 0.5, y + 3, w * 0.65, 8);
  poly(c, shade(color, -0.43), [
    [x, y - 5],
    [x - 3, top + h * 0.44],
    [x + w * 0.16, top + 8],
    [x + w * 0.6, top],
    [x + w * 0.9, top + 15],
    [x + w, y - 7],
    [x + w * 0.72, y + 4],
  ]);
  poly(c, color, [
    [x + 2, top + h * 0.42],
    [x + w * 0.2, top + 8],
    [x + w * 0.61, top + 3],
    [x + w * 0.89, top + 16],
    [x + w * 0.76, top + h * 0.54],
    [x + w * 0.29, top + h * 0.64],
  ]);
  poly(c, shade(color, -0.16), [
    [x + w * 0.29, top + h * 0.64],
    [x + w * 0.76, top + h * 0.54],
    [x + w * 0.89, top + 16],
    [x + w - 3, y - 9],
    [x + w * 0.73, y],
    [x + w * 0.4, y - 6],
  ]);
  stroke(c, shade(color, 0.3), x + w * 0.2, top + 8, x + w * 0.58, top + 4, 2);
  stroke(c, shade(color, -0.35), x + w * 0.29, top + h * 0.64, x + w * 0.2, y - 5);
  for (let i = 0; i < 9; i++) {
    const px = x + 8 + r() * (w - 16),
      py = top + 16 + r() * (h - 22);
    rect(c, shade(color, r() * 0.3 - 0.22), px, py, 3 + r() * 8, 1);
  }
}
function crystal(c: Ctx, x: number, y: number, size: number, color: string) {
  glow(c, x, y - 10, color, size * 2, 0.15);
  for (const [dx, dy, s] of [
    [-9, 0, 0.68],
    [8, 3, 0.8],
    [0, 0, 1],
  ]) {
    const h = size * s!,
      xx = x + dx!,
      yy = y + dy!;
    poly(c, shade(color, -0.4), [
      [xx - 6, yy],
      [xx - 8, yy - h * 0.6],
      [xx, yy - h],
      [xx + 6, yy - h * 0.65],
      [xx + 5, yy],
    ]);
    poly(c, color, [
      [xx, yy - h],
      [xx + 5, yy - h * 0.65],
      [xx + 4, yy - 3],
      [xx, yy],
    ]);
    poly(c, shade(color, 0.55), [
      [xx, yy - h],
      [xx - 5, yy - h * 0.61],
      [xx - 3, yy - 4],
      [xx, yy - 7],
    ]);
    rect(c, '#e2fff1', xx - 1, yy - h + 4, 2, h * 0.37);
  }
}
function mushroom(c: Ctx, x: number, y: number, color: string, s = 1) {
  rect(c, '#bbb6a2', x - 1, y - 8 * s, 3, 10 * s);
  oval(c, shade(color, -0.4), x, y - 9 * s, 8 * s, 3 * s);
  oval(c, color, x, y - 11 * s, 8 * s, 5 * s);
  rect(c, '#dffff4', x - 4 * s, y - 14 * s, 3 * s, 2 * s);
  rect(c, '#dffff4', x + 3 * s, y - 11 * s, 2, 2);
}
function barrel(c: Ctx, x: number, y: number) {
  oval(c, '#15202755', x, y + 2, 14, 5);
  rect(c, '#4d382d', x - 11, y - 25, 22, 25);
  oval(c, '#af8655', x, y - 25, 11, 4);
  for (let i = 0; i < 5; i++) rect(c, i % 2 ? '#a0784e' : '#88613e', x - 9 + i * 4, y - 23, 3, 23);
  for (const dy of [-20, -6]) {
    rect(c, '#414a4d', x - 12, y + dy, 24, 4);
    rect(c, '#89928a', x - 10, y + dy, 20, 1);
  }
}
function lantern(c: Ctx, x: number, y: number) {
  glow(c, x, y - 8, '#ffc46b', 80, 0.24);
  stroke(c, '#24272c', x, y - 29, x, y - 18, 2);
  rect(c, '#35383c', x - 7, y - 19, 14, 20);
  rect(c, '#c18740', x - 5, y - 16, 10, 14);
  rect(c, '#ffe4a2', x - 3, y - 14, 6, 10);
  rect(c, '#fff7ce', x - 1, y - 12, 2, 7);
  rect(c, '#202b31', x - 8, y, 16, 3);
}

export function paintCaveWorld(floor: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 640;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const theme = CAVE_THEMES[floor]!;
  const rand = mulberry(761 + floor * 101);
  rect(c, floor ? '#171e29' : '#3e5c4c', 0, 0, 960, 640);
  // Broad color patches and irregular stone clusters, never a visible square grid.
  rect(c, theme.floor, 48, 64, 864, 512);
  for (let i = 0; i < 850; i++) {
    const x = 50 + rand() * 858,
      y = 65 + rand() * 506,
      w = 5 + rand() * 24;
    oval(c, shade(theme.floor, rand() * 0.13 - 0.065), x, y, w, 2 + rand() * 7);
  }
  for (let i = 0; i < 125; i++) {
    const x = 70 + rand() * 820,
      y = 95 + rand() * 445;
    stroke(c, shade(theme.floor, -0.22), x, y, x + 7, y - 3);
    stroke(c, shade(theme.floor, -0.22), x + 7, y - 3, x + 18, y + 2);
    stroke(c, shade(theme.floor, 0.13), x + 2, y + 2, x + 9, y - 1);
  }
  if (!floor) paintEntrance(c, rand);
  else paintInterior(c, floor, rand);
  return canvas;
}

function paintEntrance(c: Ctx, r: () => number) {
  // The town's warm stone path winds into an inhabited mountain clearing.
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 53; col++) {
      const x = 47 + col * 16 + (row % 2) * 8,
        y = 306 + row * 15;
      poly(c, ['#a49a7d', '#b1a68a', '#9a947d'][Math.floor(r() * 3)]!, [
        [x + 2, y],
        [x + 15, y + 1],
        [x + 16, y + 12],
        [x, y + 13],
      ]);
      rect(c, '#c8bb9a', x + 3, y + 1, 11, 2);
      rect(c, '#746d5d', x + 1, y + 13, 13, 1);
    }
  // Continuous cliff behind the settlement, crags and hanging roots.
  for (let x = -20; x < 960; x += 63) rock(c, x, 140 + r() * 15, 80, 145 + r() * 55, '#737d78', x + 212);
  for (let x = 30; x < 920; x += 31) {
    const y = 104 + r() * 22;
    oval(c, '#456d4d', x, y, 23, 8);
    oval(c, '#7b9259', x - 5, y - 4, 14, 4);
    for (let j = 0; j < 3; j++) stroke(c, '#536e43', x + j * 4, y, x + j * 5, y + 14 + r() * 22);
  }
  for (const [x, y, s] of [
    [95, 218, 1.7],
    [193, 191, 1.3],
    [568, 202, 1.6],
    [884, 198, 1.5],
    [62, 485, 1.7],
    [174, 550, 1.6],
    [574, 551, 1.5],
    [900, 512, 1.9],
  ])
    drawTree(c, x!, y!, s!);
  // A timber-and-stone forge, with shingled roof, masonry chimney and open workbench.
  oval(c, '#1a252646', 392, 293, 151, 22);
  rect(c, '#443c36', 266, 177, 253, 112);
  rect(c, '#b6a384', 272, 177, 242, 103);
  for (let y = 187; y < 273; y += 15) {
    rect(c, '#95846d', 274, y, 236, 1);
    for (let x = 278 + (y % 2) * 12; x < 505; x += 32) rect(c, '#8e7d67', x, y, 1, 14);
  }
  rect(c, '#332d2c', 288, 193, 136, 79);
  rect(c, '#624838', 293, 199, 126, 70);
  for (const x of [277, 418, 504]) {
    rect(c, '#5b3e2d', x, 171, 9, 113);
    rect(c, '#b18957', x + 1, 174, 3, 104);
  }
  poly(c, '#382c2b', [
    [249, 184],
    [282, 114],
    [481, 114],
    [535, 184],
  ]);
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 14 + row; col++) {
      const x = 280 - row * 4 + col * 14,
        y = 119 + row * 8;
      if (x > 487 + row * 5) continue;
      rect(c, ['#846b55', '#93755a', '#a58461'][(row + col) % 3]!, x, y, 13, 7);
      rect(c, '#ba9970', x + 1, y, 11, 1);
      rect(c, '#4c3b32', x, y + 7, 13, 1);
    }
  stroke(c, '#d3b183', 250, 181, 534, 181, 3);
  rect(c, '#494b48', 460, 90, 35, 67);
  for (let y = 92; y < 151; y += 9)
    for (let x = 462; x < 492; x += 12) {
      rect(c, '#838881', x + (y % 2) * 3, y, 10, 7);
      rect(c, '#b5b39c', x + 1, y, 9, 1);
    }
  rect(c, '#353c3b', 455, 87, 45, 7);
  rect(c, '#989a86', 454, 85, 47, 3);
  // Open furnace, iron anvil, bellows, sword rack and supplies.
  rect(c, '#504c46', 442, 214, 54, 59);
  oval(c, '#363235', 469, 241, 23, 27);
  rect(c, '#251e26', 447, 241, 44, 27);
  glow(c, 470, 251, '#ffa957', 71, 0.3);
  oval(c, '#c76132', 470, 258, 20, 8);
  oval(c, '#ffd17b', 470, 257, 12, 5);
  for (let x = 449; x < 489; x += 7) stroke(c, '#353237', x, 262, x + 3, 247, 3);
  rect(c, '#362b26', 290, 255, 132, 28);
  rect(c, '#bf9258', 287, 253, 138, 6);
  for (let x = 296; x < 416; x += 19) rect(c, '#735235', x, 260, 1, 21);
  poly(c, '#38474e', [
    [347, 246],
    [344, 235],
    [332, 230],
    [334, 226],
    [379, 226],
    [392, 230],
    [374, 235],
    [372, 246],
  ]);
  rect(c, '#9eb4b6', 335, 225, 45, 3);
  rect(c, '#596365', 344, 246, 34, 4);
  for (let x = 304; x < 335; x += 12) {
    stroke(c, '#a7c4cb', x, 201, x, 229, 3);
    rect(c, '#f0cf84', x - 4, 226, 11, 3);
    rect(c, '#5a362b', x, 229, 3, 7);
  }
  // Keeper has the same compact proportions and outlined face as town residents.
  rect(c, '#38303b', 396, 219, 17, 24);
  rect(c, '#d1aa72', 394, 207, 19, 17);
  rect(c, '#f0d0a0', 396, 209, 14, 12);
  rect(c, '#554336', 391, 203, 25, 7);
  rect(c, '#754638', 397, 223, 18, 26);
  rect(c, '#c99760', 394, 236, 7, 5);
  rect(c, '#252a2d', 405, 213, 2, 2);
  c.drawImage(paintProp('crate'), 233, 254);
  barrel(c, 539, 282);
  barrel(c, 558, 292);
  lantern(c, 281, 216);
  // Deep cave mouth is built from overlapping rock strata, carved lintel and wooden braces.
  for (const [x, y, w, h] of [
    [658, 281, 72, 157],
    [712, 242, 87, 142],
    [784, 239, 91, 155],
    [849, 279, 71, 167],
  ])
    rock(c, x!, y!, w!, h!, '#798782', x! + 22);
  poly(c, '#111c25', [
    [741, 306],
    [741, 246],
    [750, 215],
    [772, 200],
    [809, 199],
    [840, 218],
    [852, 250],
    [854, 307],
  ]);
  poly(c, '#223239', [
    [744, 301],
    [744, 248],
    [756, 222],
    [773, 209],
    [810, 209],
    [835, 227],
    [844, 251],
    [846, 300],
  ]);
  poly(c, '#0f1923', [
    [758, 305],
    [758, 249],
    [775, 227],
    [815, 227],
    [832, 249],
    [832, 305],
  ]);
  for (const x of [740, 849]) {
    rect(c, '#43352c', x, 233, 8, 76);
    rect(c, '#a18358', x + 1, 233, 3, 74);
    rect(c, '#4a514d', x - 2, 248, 12, 5);
  }
  rect(c, '#463a2d', 736, 228, 123, 11);
  rect(c, '#b89b68', 738, 228, 118, 3);
  rect(c, '#554739', 777, 226, 41, 17);
  for (let i = 0; i < 4; i++) {
    rect(c, '#858c80', 754 - i * 4, 291 + i * 6, 84 + i * 8, 6);
    rect(c, '#b4b39b', 754 - i * 4, 291 + i * 6, 84 + i * 8, 1);
  }
  lantern(c, 720, 268);
  lantern(c, 872, 269);
  crystal(c, 697, 300, 27, '#79c8b9');
  // Camp details in the lower clearing: resting area, cart, tool storage, flowers.
  c.drawImage(paintProp('bench'), 289, 420);
  c.drawImage(paintProp('crate'), 485, 420);
  barrel(c, 533, 449);
  for (let x = 646; x < 821; x += 18) {
    rect(c, '#443f3b', x, 395, 4, 108);
    rect(c, '#9b896a', x + 1, 395, 2, 107);
  }
  stroke(c, '#747b76', 642, 400, 822, 400, 3);
  stroke(c, '#424947', 642, 498, 822, 498, 3);
  rect(c, '#4d514f', 695, 414, 54, 32);
  poly(c, '#87918b', [
    [690, 414],
    [748, 414],
    [742, 439],
    [700, 439],
  ]);
  rect(c, '#b4b6a0', 691, 412, 58, 3);
  for (const x of [703, 736]) {
    oval(c, '#252e32', x, 445, 7, 7);
    oval(c, '#838d83', x, 445, 3, 3);
  }
  rock(c, 704, 417, 20, 15, '#7e8c8a', 6);
  rock(c, 724, 419, 17, 14, '#84988e', 7);
  for (let i = 0; i < 145; i++) {
    const x = 60 + r() * 830,
      y = 390 + r() * 177;
    if ((x > 270 && x < 560 && y < 466) || (x > 630 && x < 830 && y < 510)) continue;
    stroke(c, '#4c6948', x, y, x - 2, y - 6);
    stroke(c, '#a2ad6e', x + 2, y, x + 4, y - 5);
    if (i % 8 === 0) {
      oval(c, '#f1c691', x, y - 7, 3, 2);
      rect(c, '#e8e1ab', x, y - 8, 1, 1);
    }
  }
  for (let x = -20; x < 960; x += 65) {
    rock(c, x, 638, 84, 47 + r() * 20, '#63756b', x + 14);
    drawTree(c, x + 25, 652, 1.5);
  }
}

function paintInterior(c: Ctx, floor: number, r: () => number) {
  const t = CAVE_THEMES[floor]!;
  // Strata confined to collision boundaries: the playfield stays genuinely walkable.
  for (let x = -25; x < 960; x += 52) {
    rock(c, x, 66, 76, 90 + r() * 34, t.rock, x + floor * 75);
    rock(c, x, 675, 74, 107 + r() * 23, shade(t.rock, -0.15), x + 3);
  }
  for (let y = 120; y < 575; y += 55) {
    rock(c, -22, y, 68, 80, t.rock, y);
    rock(c, 914, y, 65, 81, t.rock, y + 33);
  }
  for (let x = 74; x < 900; x += 46) {
    const y = 69 + r() * 9;
    oval(c, shade(t.rock, -0.34), x, y, 27, 5);
    if (floor === 2) {
      oval(c, '#476450', x, y, 19, 4);
      mushroom(c, x, y - 4, '#7bceba', 1.3);
    }
  }
  // Buried rails curve through the excavation; sleepers are flat and traversable.
  if (floor === 1 || floor === 3) {
    for (let x = 120; x < 800; x += 25) {
      const y = 360 + Math.sin(x / 190) * 34;
      poly(c, '#2c282c', [
        [x, y - 31],
        [x + 7, y - 30],
        [x + 7, y + 34],
        [x, y + 32],
      ]);
      stroke(c, '#706050', x + 1, y - 29, x + 1, y + 30, 2);
    }
    for (let x = 110; x < 800; x += 4) {
      const y = 360 + Math.sin(x / 190) * 34;
      for (const dy of [-23, 24]) {
        rect(c, '#242931', x, y + dy, 5, 4);
        rect(c, '#899184', x, y + dy, 5, 1);
      }
    }
  }
  // Broad mineral stains and damp pools read as shallow surface detail.
  for (let i = 0; i < 9; i++) {
    const x = 190 + r() * 610,
      y = 180 + r() * 300;
    oval(c, floor === 4 ? '#353d5545' : '#182e3235', x, y, 26 + r() * 42, 8 + r() * 17);
    if (floor === 4) {
      stroke(c, '#9b93b344', x - 14, y, x + 19, y);
      stroke(c, '#b2a1c344', x + 2, y + 7, x + 28, y + 7);
    }
  }
  for (let i = 0; i < 36; i++) {
    const x = 72 + r() * 811,
      y = i % 2 ? 562 : 81;
    if (i % 3 === 0) crystal(c, x, y, 12 + r() * 22, t.light);
    else if (floor > 1) mushroom(c, x, y, t.light, 0.6 + r() * 0.7);
    else rock(c, x, y, 12 + r() * 13, 8 + r() * 10, t.rock, i + 22);
  }
  // Mine supports and lantern niches anchor the composition.
  for (const x of [158, 480, 798]) {
    rect(c, '#211e24', x - 20, 10, 11, 58);
    rect(c, '#765c44', x - 17, 13, 7, 53);
    rect(c, '#baa075', x - 16, 14, 2, 48);
    stroke(c, '#5d4838', x - 12, 45, x + 15, 18, 6);
    rect(c, '#333e40', x - 19, 46, 12, 5);
    lantern(c, x + 9, 69);
    lantern(c, x + 9, 567);
  }
  // Recessed entrance and an engraved descent portal.
  oval(c, '#111722', 112, 322, 42, 33);
  for (let i = 0; i < 5; i++) {
    rect(c, '#686b67', 82 + i * 5, 304 + i * 7, 59 - i * 9, 6);
    rect(c, '#a4a591', 82 + i * 5, 304 + i * 7, 59 - i * 9, 1);
  }
  oval(c, '#101820', 832, 332, 53, 25);
  oval(c, '#7e8f86', 832, 332, 48, 19);
  oval(c, '#283944', 832, 329, 41, 15);
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI) / 6;
    const x = 832 + Math.cos(a) * 46,
      y = 320 - Math.sin(a) * 61;
    rock(c, x - 8, y, 17, 24, shade(t.rock, 0.1), i + floor);
    rect(c, t.light, x - 2, y - 15, 2, 7);
  }
  for (let i = 0; i < 5; i++) {
    rect(c, shade(t.rock, -i * 0.1), 803 + i * 4, 312 + i * 7, 58 - i * 8, 5);
    rect(c, shade(t.rock, 0.2 - i * 0.1), 803 + i * 4, 312 + i * 7, 58 - i * 8, 1);
  }
  glow(c, 832, 312, t.light, 80, 0.15);
  if (floor === 5) {
    for (let radius = 75; radius <= 119; radius += 22) {
      c.strokeStyle = '#a6946040';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(480, 333, radius, radius * 0.55, 0, 0, Math.PI * 2);
      c.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const x = 480 + Math.cos(a) * 98,
        y = 333 + Math.sin(a) * 53;
      stroke(c, '#c4b77b70', x, y, x + Math.sin(a) * 5, y + Math.cos(a) * 5, 2);
    }
    for (const x of [90, 869])
      for (const y of [190, 477]) {
        rock(c, x, y, 28, 47, '#9c9b86', x + y);
        crystal(c, x + 13, y - 41, 23, '#e8cd83');
      }
  } else if (floor === 18) {
    // Grand Void Arena for Tier 18 Colossus Boss
    for (let radius = 60; radius <= 160; radius += 30) {
      c.strokeStyle = radius === 120 ? '#c084fc70' : '#7c3aed40';
      c.lineWidth = radius === 120 ? 3 : 2;
      c.beginPath();
      c.ellipse(480, 333, radius, radius * 0.55, 0, 0, Math.PI * 2);
      c.stroke();
    }
    // 8-pointed Void Rune Astrological Array
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const x1 = 480 + Math.cos(a) * 60;
      const y1 = 333 + Math.sin(a) * 33;
      const x2 = 480 + Math.cos(a) * 150;
      const y2 = 333 + Math.sin(a) * 82;
      stroke(c, '#a855f760', x1, y1, x2, y2, 2);
      // Outer glyph dots
      oval(c, '#38bdf8', x2, y2, 4, 3);
      oval(c, '#ffffff', x2, y2, 2, 1);
    }
    // Grand Void Crystal Pillars at the 4 corners
    for (const x of [110, 850])
      for (const y of [180, 490]) {
        rock(c, x, y, 36, 56, '#1e1b4b', x + y);
        crystal(c, x + 16, y - 50, 38, '#c084fc');
        glow(c, x + 16, y - 30, '#818cf8', 55, 0.25);
      }
    glow(c, 480, 333, '#7c3aed', 160, 0.2);
  } else if (floor >= 13 && floor <= 15) {
    // Molten Magma Fissures
    for (let i = 0; i < 6; i++) {
      const fx = 220 + r() * 520;
      const fy = 200 + r() * 260;
      stroke(c, '#ef444460', fx, fy, fx + 40, fy - 10, 3);
      stroke(c, '#f9731690', fx + 4, fy, fx + 36, fy - 8, 1);
      glow(c, fx + 20, fy - 5, '#ff5722', 40, 0.15);
    }
  }
  // A quiet vignette separates the lit exploration space from the cavern depths.
  const v = c.createRadialGradient(490, 330, 190, 480, 320, 570);
  v.addColorStop(0, '#070e1800');
  v.addColorStop(1, '#070e1899');
  c.fillStyle = v;
  c.fillRect(0, 0, 960, 640);
}

export function paintCaveOre(resource: string, hp: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const c = canvas.getContext('2d')!;
  rock(c, 12, 54, 39, 28, '#627681', hp * 33);
  if (resource === 'crystal') crystal(c, 31, 47, 31, '#8ae0d1');
  else
    for (let i = 0; i < 6; i++) {
      const x = 18 + (i % 3) * 9,
        y = 32 + Math.floor(i / 3) * 8;
      poly(c, resource === 'iron' ? '#d1a080' : '#b5c3c4', [
        [x, y],
        [x + 7, y - 3],
        [x + 9, y + 3],
        [x + 3, y + 6],
      ]);
      rect(c, resource === 'iron' ? '#f0c6a0' : '#e0e4d5', x + 2, y, 4, 1);
    }
  if (hp < 3) {
    stroke(c, '#1a2934', 32, 27, 29, 40, 2);
    stroke(c, '#1a2934', 29, 40, 39, 48, 2);
  }
  return canvas;
}
