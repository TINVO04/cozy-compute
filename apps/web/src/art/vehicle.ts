import type Phaser from 'phaser';
import { vehicleById } from '@cozy/game-data';

/** Original canvas pixel art, shared by showroom previews and world sprites. */
export function vehicleCanvas(id: string, dir = 2, frame = 0): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 40;
  const ctx = c.getContext('2d')!;
  const color = vehicleById(id)?.color ?? '#69bfa8';
  const r = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const kind = vehicleById(id)?.kind;
  if (kind === 'bicycle' || kind === 'motorcycle') {
    const bicycle = kind === 'bicycle';
    const line = (shade: string, x1: number, y1: number, x2: number, y2: number, width = 2) => {
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
      for (let i = 0; i <= steps; i++)
        r(
          shade,
          Math.round(x1 + ((x2 - x1) * i) / steps),
          Math.round(y1 + ((y2 - y1) * i) / steps),
          width,
          width,
        );
    };
    if (dir === 1 || dir === 2) {
      if (dir === 1) {
        ctx.translate(48, 0);
        ctx.scale(-1, 1);
      }
      for (const x of [10, 37]) {
        // Hollow rims and angular tires stay crisp at native scale.
        r('#263c41', x - 4, 25, 8, 2);
        r('#263c41', x - 6, 27, 2, 7);
        r('#263c41', x + 4, 27, 2, 7);
        r('#263c41', x - 4, 34, 8, 2);
        r('#bdcbc5', x - 3, 27, 6, 1);
        r('#bdcbc5', x - 3, 33, 6, 1);
        if (frame % 2) {
          line('#9cadab', x - 3, 28, x + 2, 32, 1);
          line('#9cadab', x + 2, 28, x - 3, 32, 1);
        } else {
          r('#9cadab', x, 27, 1, 7);
          r('#9cadab', x - 4, 30, 8, 1);
        }
      }
      if (bicycle) {
        line(color, 10, 30, 18, 18);
        line(color, 18, 18, 24, 30);
        line(color, 10, 30, 24, 30);
        line(color, 18, 19, 31, 19);
        line(color, 24, 30, 31, 19);
        line('#405758', 31, 14, 37, 30);
        r('#263c41', 14, 16, 9, 3);
        r('#263c41', 30, 12, 8, 2);
        r('#f2ddb2', 36, 15, 5, 5);
        line('#647d78', 24, 30, frame % 2 ? 21 : 27, 33, 1);
      } else {
        r('#405758', 7, 23, 23, 5);
        r(color, 7, 20, 14, 6);
        r('#f5c4a2', 8, 20, 11, 2);
        r('#263c41', 10, 17, 14, 3);
        r('#526d6b', 19, 27, 13, 4);
        r(color, 31, 16, 5, 13);
        line(color, 35, 24, 39, 30);
        r('#fff0b5', 34, 15, 5, 4);
        r('#263c41', 28, 12, 9, 2);
        r('#b8ceca', 6, 30, 12, 2);
        r('#d75555', 5, 22, 3, 3);
      }
    } else {
      r('#263c41', 22, 8, 4, 29);
      r('#a2b8b3', 23, 9, 2, 27);
      r(color, bicycle ? 22 : 18, 16, bicycle ? 4 : 12, 15);
      r('#263c41', 20, dir === 0 ? 16 : 23, 8, 5);
      r('#405758', 13, dir === 0 ? 25 : 12, 22, 2);
      r('#263c41', 12, dir === 0 ? 24 : 11, 4, 4);
      r('#263c41', 32, dir === 0 ? 24 : 11, 4, 4);
      r(dir === 0 ? '#fff0b5' : '#d75555', 21, dir === 0 ? 29 : 30, 6, 3);
      if (bicycle) {
        r('#647d78', frame % 2 ? 17 : 26, 24, 5, 2);
      } else {
        r('#f5c4a2', 20, 17, 2, 12);
        r('#b8ceca', 29, 25, 2, 9);
      }
    }
    return c;
  }
  if (dir === 1 || dir === 2) {
    if (dir === 1) {
      ctx.translate(48, 0);
      ctx.scale(-1, 1);
    }
    r('#263c41', 4, 21, 40, 12);
    r(color, 5, 20, 38, 10);
    r('#263c41', 12, 10, 23, 13);
    r(color, 14, 9, 18, 3);
    r('#b6e4e2', 15, 13, 7, 8);
    r('#b6e4e2', 25, 13, 7, 8);
    r('#fff1b4', 40, 22, 4, 4);
    r('#d65e58', 4, 22, 3, 4);
    r('#e4efda', 7, 29, 34, 2);
    for (const x of [10, 33]) {
      r('#24343b', x, 28, 8, 9);
      r('#c2cbd0', x + 2, 31, 4, 4);
    }
    r('#344b4e', 23, 24, 4, 1);
  } else {
    r('#24343b', 9, 12, 5, 9);
    r('#24343b', 34, 12, 5, 9);
    r('#24343b', 9, 29, 5, 7);
    r('#24343b', 34, 29, 5, 7);
    r('#263c41', 12, 4, 24, 34);
    r(color, 14, 5, 20, 31);
    r('#b6e4e2', 16, dir === 0 ? 14 : 8, 16, 8);
    r('#d8eee0', 16, 5, 16, 2);
    r('#344b4e', 15, 33, 18, 2);
    for (const x of [14, 30]) r(dir === 0 ? '#fff1b4' : '#d65e58', x, 29, 4, 4);
  }
  return c;
}
export function ensureVehicleTexture(scene: Phaser.Scene, id: string, dir: number, frame = 0) {
  const key = `vehicle:${id}:${dir}:${frame}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, vehicleCanvas(id, dir, frame));
  return key;
}

export function paintVehicleDealer() {
  const c = document.createElement('canvas');
  c.width = 162;
  c.height = 142;
  const ctx = c.getContext('2d')!;
  const r = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  r('#617773', 8, 131, 146, 9);
  r('#d8d3b8', 4, 126, 154, 8);
  r('#344d4d', 13, 32, 136, 96);
  r('#ede0b7', 16, 35, 130, 89);
  r('#42665e', 9, 23, 144, 13);
  r('#83b5a2', 12, 22, 138, 4);
  r('#af9871', 20, 42, 122, 24);
  r('#254d4b', 22, 43, 118, 21);
  for (const x of [21, 94]) {
    r('#416363', x, 75, 46, 47);
    r('#8ec1bd', x + 2, 77, 42, 42);
    r('#c6e0cd', x + 4, 79, 38, 2);
    r('#b5d5c7', x + 5, 82, 2, 20);
  }
  r('#254544', 70, 74, 21, 50);
  r('#a0c9bb', 73, 77, 15, 42);
  r('#e8c77c', 85, 99, 2, 4);
  ctx.drawImage(vehicleCanvas('car_mint'), 20, 84);
  ctx.drawImage(vehicleCanvas('car_sunset', 1), 94, 84);
  for (let x = 15; x < 147; x += 12) r(x % 24 === 15 ? '#ece0bd' : '#69a78e', x, 67, 12, 8);
  r('#f4d999', 22, 126, 116, 2);
  return c;
}
