import { vehicleById } from '@cozy/game-data';
import pixels from './vehicle-pixels.json';

export { ensureVehicleTexture } from './vehicle-loader';

type PixelPack = { palette: string[]; frames: string[] };
const packs: Readonly<Record<string, PixelPack>> = pixels;
const decoded = new Map<string, Uint8Array>();

/** Generated from the same artwork as the PNGs; requires no network or image decode. */
export function vehicleCanvas(id: string, dir = 2, frame = 0): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  const path = vehicleById(id)?.assetPath ?? id;
  const pack = Object.hasOwn(packs, path) ? packs[path] : undefined;
  if (!pack) return canvas;
  const wrap = (value: number) => (Number.isFinite(value) ? ((Math.trunc(value) % 4) + 4) % 4 : 0);
  const index = wrap(dir) * 4 + wrap(frame);
  const key = `${path}:${index}`;
  let runs = decoded.get(key);
  if (!runs) {
    runs = Uint8Array.from(atob(pack.frames[index]!), (character) => character.charCodeAt(0));
    decoded.set(key, runs);
  }
  // Frames are authored in their final orientation. No canvas transform is applied,
  // so a subsequent async PNG upgrade cannot inherit a reflection.
  let position = 0;
  for (let i = 0; i < runs.length; i += 2) {
    const length = runs[i]!;
    const color = runs[i + 1]!;
    if (color !== 0) {
      ctx.fillStyle = pack.palette[color]!;
      ctx.fillRect(position % 48, Math.floor(position / 48), length, 1);
    }
    position += length;
  }
  return canvas;
}

export function paintVehicleDealer(displayIds: readonly string[] = ['car_ferrari_f40', 'motorcycle_ducati']) {
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
  ctx.drawImage(vehicleCanvas(displayIds[0]!), 20, 84);
  ctx.drawImage(vehicleCanvas(displayIds[1]!, 1), 94, 84);
  for (let x = 15; x < 147; x += 12) r(x % 24 === 15 ? '#ece0bd' : '#69a78e', x, 67, 12, 8);
  r('#f4d999', 22, 126, 116, 2);
  return c;
}
