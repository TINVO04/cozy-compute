import type Phaser from 'phaser';
import { useUi } from '../lib/store';

/** Original code-authored pixel scenery. Fixed seed, integer pixels, nearest filtering. */
export function buildMartialHall(scene: Phaser.Scene) {
  const key = 'martial:hall:v2';
  if (!scene.textures.exists(key)) {
    const c = document.createElement('canvas');
    c.width = 960;
    c.height = 720;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const box = (color: string, x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    };
    const ellipse = (color: string, x: number, y: number, rx: number, ry: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    box('#253e3c', 0, 0, 960, 720);
    for (let y = 112; y < 690; y += 24)
      for (let x = 40; x < 920; x += 32) {
        const v = (x * 13 + y * 17) % 7;
        box(v < 3 ? '#8d9280' : '#959986', x + 1, y + 1, 30, 22);
        box('#a8ad98', x + 2, y + 2, 28, 1);
        box('#737e72', x + 3, y + 21, 27, 1);
        if (v === 0) {
          box('#687f60', x + 2, y + 19, 5, 2);
          box('#b3b39c', x + 19, y + 8, 4, 1);
        }
      }
    // Side verandas with alternating wood grain; main fighting floor stays quiet.
    for (const x of [52, 716]) {
      box('#403d38', x - 5, 140, 192, 452);
      for (let y = 144; y < 590; y += 14) {
        box('#695449', x, y, 182, 12);
        box('#957659', x + 2, y, 178, 2);
        for (let n = 0; n < 4; n++) box('#58483f', x + 10 + n * 43 + (y % 7), y + 7, 26, 1);
      }
    }
    ellipse('#535c55', 480, 372, 214, 205);
    ellipse('#d5c5a1', 480, 357, 209, 199);
    ellipse('#766a5c', 480, 355, 201, 191);
    ellipse('#bcb39a', 480, 355, 197, 187);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(480, 355, 191, 181, 0, 0, Math.PI * 2);
    ctx.clip();
    for (let y = 176; y < 540; y += 30)
      for (let x = 284; x < 684; x += 48) {
        box('#a59f8b', x, y, 47, 1);
        box('#cec5ab', x + 1, y + 1, 46, 1);
        box('#a59f8b', x, y, 1, 29);
      }
    ctx.restore();
    for (let i = 0; i < 32; i++) {
      const a = (i * Math.PI) / 16;
      box(i % 4 ? '#897454' : '#635853', 480 + Math.cos(a) * 201 - 2, 355 + Math.sin(a) * 191 - 2, 4, 4);
    }
    ellipse('#5c6560', 480, 355, 54, 54);
    ctx.fillStyle = '#e6dabb';
    ctx.beginPath();
    ctx.arc(480, 355, 54, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ellipse('#5c6560', 480, 328, 27, 27);
    ellipse('#e6dabb', 480, 382, 27, 27);
    ellipse('#e6dabb', 480, 328, 8, 8);
    ellipse('#5c6560', 480, 382, 8, 8);
    // Northern ancestral hall: stepped roof tiles, carved beams and lattice screens.
    box('#302c35', 36, 18, 888, 106);
    box('#523b37', 48, 36, 864, 78);
    for (let x = 68; x < 912; x += 72) {
      box('#322e32', x, 45, 52, 51);
      for (let n = 0; n < 5; n++) box('#967354', x + 4 + n * 10, 47, 2, 46);
      for (let y = 51; y < 95; y += 10) box('#967354', x + 2, y, 48, 2);
    }
    for (let row = 0; row < 4; row++) {
      const y = 18 + row * 7;
      box('#344f50', 28 - row * 6, y, 904 + row * 12, 8);
      for (let x = 30 - row * 6; x < 930 + row * 6; x += 14) {
        box('#54716a', x, y, 12, 2);
        box('#203d43', x + 11, y + 2, 2, 5);
      }
    }
    box('#d6af70', 36, 44, 888, 3);
    box('#412c31', 314, 46, 332, 51);
    box('#ab8256', 318, 49, 324, 45);
    box('#452f35', 321, 52, 318, 39);
    for (const x of [56, 242, 706, 892]) {
      box('#342c32', x - 8, 46, 18, 96);
      box('#814b41', x - 5, 48, 12, 82);
      box('#af7055', x - 3, 48, 3, 80);
      box('#a8a58d', x - 12, 129, 26, 9);
      box('#d0c4a5', x - 12, 129, 26, 2);
    }
    // Weapon stands, rolled mats and tea station on the verandas.
    for (const x of [96, 790]) {
      box('#352f33', x - 4, 449, 102, 7);
      box('#865c45', x, 407, 6, 45);
      box('#865c45', x + 84, 407, 6, 45);
      box('#b49063', x, 416, 90, 6);
      for (let i = 0; i < 5; i++) {
        box('#dce7d9', x + 13 + i * 14, 388 + (i % 2) * 4, 3, 39);
        box('#e2b66b', x + 8 + i * 14, 422, 12, 3);
        box('#423f45', x + 13 + i * 14, 426, 3, 11);
      }
    }
    for (const x of [102, 774]) {
      box('#443535', x, 511, 100, 8);
      box('#906745', x + 2, 500, 96, 12);
      box('#bb945e', x + 2, 500, 96, 2);
      for (let i = 0; i < 4; i++) {
        box('#cab487', x + 8 + i * 21, 488, 16, 10);
        box('#8d765c', x + 10 + i * 21, 492, 12, 2);
      }
      box('#473a35', x + 6, 519, 7, 15);
      box('#473a35', x + 88, 519, 7, 15);
    }
    // Bamboo beds and stone lanterns frame the southern route.
    for (const x of [76, 244, 704, 872]) {
      box('#526454', x - 18, 601, 36, 30);
      box('#9c9b81', x - 21, 625, 42, 9);
      for (let n = 0; n < 4; n++) {
        const bx = x - 12 + n * 8;
        box('#9ba77a', bx, 553 + (n % 2) * 8, 3, 70);
        for (let y = 559; y < 614; y += 15) {
          box('#465f50', bx, y, 4, 2);
          box('#618b67', bx - 12, y - 7, 12, 3);
          box('#7ba17a', bx + 3, y - 11, 12, 3);
        }
      }
    }
    for (const x of [342, 618]) {
      box('#647875', x - 13, 607, 26, 14);
      box('#b3b7a0', x - 7, 574, 14, 36);
      box('#5f6a65', x - 13, 561, 26, 19);
      box('#e5bf78', x - 8, 565, 16, 12);
      box('#81918a', x - 18, 556, 36, 6);
      box('#b6bba4', x - 12, 552, 24, 4);
    }
    for (let i = 0; i < 4; i++) {
      box('#58635f', 418 - i * 6, 649 + i * 8, 124 + i * 12, 8);
      box('#c6c0a5', 418 - i * 6, 649 + i * 8, 124 + i * 12, 2);
    }
    scene.textures.addCanvas(key, c);
  }
  scene.add.image(0, 0, key).setOrigin(0).setDepth(-10);
  const label = (x: number, y: number, text: string, size = 12) =>
    scene.add
      .text(x, y, text, {
        fontFamily: 'Inter, sans-serif',
        fontSize: size + 'px',
        color: '#ffebbd',
        stroke: '#293b3b',
        strokeThickness: 3,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(600);
  label(480, 73, 'ĐẠI HỘI VÕ THUẬT', 22);
  label(480, 116, 'Võ đường Bửu Long · Kiếm đạo giao duyên', 11);
  label(168, 220, 'Võ sư Thanh Sơn', 12);
  label(168, 240, 'E · Học tám thức kiếm', 10);
  label(784, 267, 'Mộc nhân luyện kiếm', 12);
  label(784, 397, '1–8 · Thử chiêu', 10);
  label(480, 678, '↓ Về thị trấn', 12);
  for (const x of [94, 216, 744, 866]) {
    const lantern = scene.add.container(x, 154).setDepth(150);
    const g = scene.add.graphics();
    g.fillStyle(0xf5c578, 0.07).fillCircle(0, 6, 27);
    g.lineStyle(1, 0xdac190).lineBetween(0, -25, 0, -12);
    g.fillStyle(0x9e454b).fillRoundedRect(-9, -11, 18, 23, 5);
    g.fillStyle(0xe38a65).fillRect(-5, -9, 3, 18);
    g.fillStyle(0xf0c17f).fillRect(-8, -12, 16, 3).fillRect(-8, 10, 16, 3);
    g.lineStyle(2, 0xd4a061).lineBetween(0, 13, 0, 24);
    lantern.add(g);
    if (!useUi.getState().reducedMotion)
      scene.tweens.add({ targets: lantern, angle: 4, duration: 1800 + x, yoyo: true, repeat: -1 });
  }
  npc(scene, 168, 300, 'master');
  npc(scene, 118, 558, 'disciple');
  npc(scene, 828, 558, 'disciple');
  const dummy = scene.add.graphics().setDepth(360);
  dummy.fillStyle(0x263333, 0.25).fillEllipse(784, 362, 48, 10);
  dummy.fillStyle(0x574333).fillRect(775, 315, 18, 44);
  dummy.fillStyle(0xb28a56).fillRect(778, 310, 12, 48).fillRect(755, 326, 58, 7);
  dummy.fillStyle(0xddbd83).fillRect(781, 313, 3, 43);
  dummy.fillStyle(0x9b5949).fillRect(775, 331, 18, 11);
  dummy.lineStyle(1, 0xdfac78).strokeCircle(784, 336, 5);
  dummy.fillStyle(0xae946b).fillRect(778, 297, 13, 15);
}

function npc(scene: Phaser.Scene, x: number, y: number, kind: 'master' | 'disciple') {
  const key = 'martial:npc:' + kind;
  if (!scene.textures.exists(key)) {
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 64;
    const p = c.getContext('2d')!;
    const b = (color: string, x: number, y: number, w: number, h: number) => {
      p.fillStyle = color;
      p.fillRect(x, y, w, h);
    };
    b('#243a3d', 13, 55, 10, 6);
    b('#243a3d', 27, 55, 10, 6);
    b('#28494f', 12, 30, 25, 27);
    b('#46817e', 15, 30, 19, 24);
    b('#72a89b', 15, 30, 4, 24);
    b('#b6cbb1', 21, 29, 4, 23);
    b('#243a3d', 6, 32, 8, 18);
    b('#578e84', 8, 32, 7, 14);
    b('#243a3d', 36, 31, 7, 19);
    b('#69a297', 34, 31, 7, 14);
    b('#e4b68a', 8, 45, 6, 5);
    b('#e4b68a', 35, 44, 6, 5);
    b('#cfb37b', 13, 44, 23, 4);
    b('#79633e', 24, 46, 4, 8);
    b('#4c4946', 15, 12, 19, 19);
    b('#e7bc90', 17, 14, 15, 14);
    b('#f3d4a7', 18, 14, 6, 8);
    b('#384349', 18, 20, 3, 2);
    b('#384349', 28, 20, 3, 2);
    const hair = kind === 'master' ? '#dce7d2' : '#343a43';
    b(hair, 15, 9, 19, 7);
    b(hair, 20, 4, 10, 6);
    b('#a4b8a7', 22, 4, 3, 4);
    b('#dfb670', 16, 8, 21, 2);
    if (kind === 'master') {
      b('#f2edd5', 20, 25, 11, 5);
      b('#d9e0cb', 22, 30, 7, 5);
      b('#becfc0', 24, 35, 3, 6);
      b(hair, 15, 15, 3, 8);
      b(hair, 32, 15, 3, 8);
    }
    b('#59595b', 39, 16, 3, 43);
    b('#e0c18c', 35, 35, 10, 3);
    b('#d4e4dc', 40, 17, 2, 17);
    b('#8db8b8', 40, 16, 1, 16);
    scene.textures.addCanvas(key, c);
  }
  scene.add.ellipse(x, y, 36, 9, 0x233536, 0.3).setDepth(y - 1);
  const sprite = scene.add
    .image(x, y, key)
    .setOrigin(0.5, 1)
    .setDepth(y)
    .setName('martial-npc-' + kind);
  if (!useUi.getState().reducedMotion)
    scene.tweens.add({ targets: sprite, scaleY: 1.018, duration: 1700, yoyo: true, repeat: -1 });
}
