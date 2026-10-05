import { PixelGrid } from './pixel';
import type Phaser from 'phaser';
type Kind = 'slime' | 'bat' | 'golem';

/** Eight deliberately posed frames on a stable feet anchor; all drawing stays on a 1px grid. */
export function caveCreatureFrame(kind: Kind, frame: number): HTMLCanvasElement {
  const g = new PixelGrid(48, 56);
  const phase = (frame * Math.PI) / 4;
  if (kind === 'slime') {
    const lift = [0, 0, 1, 3, 4, 3, 1, 0][frame]!;
    const rx = [16, 17, 16, 14, 13, 14, 15, 16][frame]!;
    const ry = [11, 10, 12, 14, 15, 14, 12, 11][frame]!;
    const y = 40 - lift;
    g.ellipse(24, y, rx, ry, '#174847');
    g.ellipse(24, y - 1, rx - 1, ry - 1, '#3a947b');
    g.ellipse(22, y - 3, rx - 3, ry - 3, '#75c995');
    g.ellipse(20, y - 6, rx - 6, ry - 6, '#9dddac');
    g.ellipse(26, y + 5, rx - 4, 3, '#27866f');
    g.ellipse(16, y + 6, 3, 2, '#5bb68b');
    g.ellipse(31, y + 5, 4, 2, '#4aab82');
    g.ellipse(17, y - 8, 4, 2, '#d0efbd');
    g.set(13, y - 6, '#e8ffda');
    for (const x of [19, 29]) {
      g.rect(x, y - 2, 3, 5, '#18343f');
      g.set(x, y - 2, '#f1ffeb');
    }
    g.rect(23, y + 4, 4, 1, '#235253');
    g.set(22, y + 3, '#235253');
    g.ellipse(15, y + 3, 3, 1, '#95d7a2');
    g.ellipse(33, y + 3, 3, 1, '#95d7a2');
    // Tiny leaf crown gives this creature a recognizable silhouette.
    g.line(24, y - ry + 2, 24, y - ry - 4, '#2c6850');
    g.ellipse(21, y - ry - 3, 4, 2, '#b6d989');
    g.ellipse(27, y - ry - 5, 4, 2, '#76b681');
  } else if (kind === 'bat') {
    const wing = [-8, -5, 0, 7, 10, 6, 0, -6][frame]!;
    const y = 29 + Math.round(Math.sin(phase) * 2);
    for (const side of [-1, 1]) {
      const root = 24 + side * 5,
        tip = 24 + side * 22;
      for (let i = 0; i < 19; i++) {
        const x = root + side * i;
        const top = y - 4 + (wing * i) / 19;
        const bottom = y + 9 - Math.abs(Math.sin(i / 6)) * 6;
        for (let yy = Math.min(top, bottom); yy <= Math.max(top, bottom); yy++) g.set(x, yy, '#302d49');
        g.line(x, top + 1, x, Math.max(top + 1, bottom - 1), '#755583');
      }
      g.line(root, y - 4, tip, y - 4 + wing, '#b092af');
      for (let i = 1; i <= 3; i++)
        g.line(root, y - 3, root + side * (i * 6), y + 9 - Math.abs(Math.sin(i)) * 6, '#493754');
      g.line(tip, y - 4 + wing, tip - side * 2, y - 7 + wing, '#dfcbbd');
    }
    g.ellipse(24, y + 1, 8, 11, '#322b43');
    g.ellipse(24, y, 7, 9, '#92738c');
    g.ellipse(23, y + 4, 5, 5, '#b294a4');
    for (const x of [17, 28]) {
      g.rect(x, y - 13, 4, 10, '#362d48');
      g.rect(x + 1, y - 11, 2, 7, '#ce939c');
    }
    for (const x of [19, 27]) {
      g.rect(x, y - 1, 3, 3, '#24243c');
      g.set(x, y - 1, '#f8ca87');
    }
    g.rect(22, y + 5, 5, 2, '#422d46');
    g.set(22, y + 6, '#ffedd3');
    g.set(26, y + 6, '#ffedd3');
    g.rect(19, y + 11, 3, 2, '#c5b2ae');
    g.rect(27, y + 11, 3, 2, '#c5b2ae');
  } else {
    const step = Math.round(Math.sin(phase) * 2);
    const stone = (x: number, y: number, w: number, h: number) => {
      g.rect(x, y, w, h, '#263748');
      g.rect(x + 1, y + 1, w - 2, h - 2, '#617985');
      g.rect(x + 2, y + 1, w - 4, 3, '#a0b0ae');
      g.rect(x + w - 4, y + 4, 3, h - 5, '#43596c');
      g.line(x + 2, y + h - 3, x + w - 5, y + h - 3, '#849899');
    };
    stone(12, 41 + step, 10, 10);
    stone(27, 41 - step, 10, 10);
    stone(11, 18, 27, 26);
    stone(4, 23 - step, 10, 18);
    stone(35, 23 + step, 10, 18);
    stone(15, 8, 20, 16);
    g.rect(17, 16, 16, 5, '#24394b');
    g.rect(18, 17, 4, 2, '#9aecd4');
    g.rect(27, 17, 4, 2, '#9aecd4');
    g.line(23, 25, 20, 32, '#273f50');
    g.line(20, 32, 27, 41, '#273f50');
    g.ellipse(25, 32, 6, 7, '#223d50');
    g.ellipse(25, 31, 4, 5, '#3c9c9b');
    g.ellipse(24, 30, 2, 3, '#b8ffe5');
    for (const [x, y] of [
      [12, 17],
      [33, 13],
      [23, 9],
    ]) {
      g.line(x!, y!, x! + 2, y! - 7, '#75cbb6');
      g.line(x! + 2, y! - 7, x! + 4, y!, '#b7ebd1');
    }
    g.rect(12, 23, 4, 2, '#6f9477');
    g.rect(28, 9, 5, 2, '#92a681');
    g.rect(5, 26 - step, 4, 2, '#86a085');
    g.line(18, 12, 23, 13, '#566d78');
    g.line(31, 35, 33, 40, '#233f51');
  }
  return g.toCanvas(2);
}
export function ensureCaveCreatures(scene: Phaser.Scene) {
  for (const kind of ['slime', 'bat', 'golem'] as const) {
    const key = 'cave:creature:' + kind;
    if (scene.textures.exists(key)) continue;
    const sheet = document.createElement('canvas');
    sheet.width = 96 * 8;
    sheet.height = 112;
    const c = sheet.getContext('2d')!;
    for (let i = 0; i < 8; i++) c.drawImage(caveCreatureFrame(kind, i), i * 96, 0);
    const texture = scene.textures.addCanvas(key, sheet)!;
    for (let i = 0; i < 8; i++) texture.add(i, 0, i * 96, 0, 96, 112);
  }
}
