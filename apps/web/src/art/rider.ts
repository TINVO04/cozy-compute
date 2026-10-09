import { SKIN_TONES, TOP_COLORS, vehicleById, type Appearance } from '@cozy/game-data';
import type Phaser from 'phaser';
import { appearanceKey, drawAvatar, type Dir } from './avatar';
import { PixelGrid, shade } from './pixel';
import { vehicleCanvas } from './vehicle';

export type RidingStyle = 'pedal' | 'scooter' | 'cruiser' | 'touring' | 'sport';

export function ridingStyle(id: string): RidingStyle {
  const vehicle = vehicleById(id);
  if (vehicle?.kind === 'bicycle') return 'pedal';
  if (vehicle?.id === 'motorcycle_coral' || vehicle?.id === 'motorcycle_honda_super_cub') return 'scooter';
  if (vehicle?.id === 'motorcycle_harley_fat_boy') return 'cruiser';
  if (vehicle?.id === 'motorcycle_bmw_r1250_gs') return 'touring';
  return 'sport';
}

type Point = { x: number; y: number };
const PANTS = '#2d334a';
const SOLE = '#e8e3d6';

/** A bent limb, built as integer pixel clusters around its anatomical joints. */
function limb(grid: PixelGrid, joints: Point[], color: string, width: number) {
  const stroke = (fill: string, size: number) => {
    for (let j = 1; j < joints.length; j++) {
      const a = joints[j - 1]!;
      const b = joints[j]!;
      const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
      for (let i = 0; i <= steps; i++) {
        grid.rect(Math.round(a.x + ((b.x - a.x) * i) / steps) - Math.floor(size / 2),
          Math.round(a.y + ((b.y - a.y) * i) / steps) - Math.floor(size / 2), size, size, fill);
      }
    }
  };
  stroke(shade(color, -0.38), width + 2);
  stroke(color, width);
  const knee = joints[1]!;
  grid.rect(knee.x - 1, knee.y - 1, 2, 1, shade(color, 0.2));
}

/** Seated anatomy uses the vehicle's seat, bar and footrest coordinates.
 * The head/clothes come from the player's appearance; walking legs are never used.
 * Far limbs are behind the vehicle, near knees/boots in front of the side panel.
 */
export function riderLayers(a: Appearance, id: string, dir: Dir, frame: number) {
  const far = new PixelGrid(48, 64);
  const near = new PixelGrid(48, 64);
  const style = ridingStyle(id);
  const side = dir === 1 || dir === 2;
  const sign = dir === 1 ? -1 : 1;
  const seat = vehicleById(id)?.mounting.seat ?? { x: 24, y: 18 };
  const bounce = side ? [0, 1, 0, -1][frame % 4]! : 0;
  const hip = { x: side && dir === 1 ? 47 - seat.x : seat.x, y: seat.y + 24 + bounce };
  const lean = style === 'sport' ? 6 : style === 'pedal' ? 4 : style === 'touring' ? 2 : 0;
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[1]!;
  const shirt = a.top?.split(':')[1] ?? TOP_COLORS[a.baseTop] ?? TOP_COLORS[0]!;
  const source = drawAvatar(a, dir, 0);
  const foot = (grid: PixelGrid, x: number, y: number, front = true) => {
    const left = side && sign < 0 ? x - 4 : x - 1;
    grid.rect(left, y - 1, 6, 3, front ? '#382e2a' : '#25242c');
    grid.rect(left, y + 2, 6, 1, front ? SOLE : shade(SOLE, -0.35));
    grid.rect(left + 2, y - 1, 2, 1, front ? SOLE : '#6b6c78');
  };
  if (side) {
    const knee = { x: hip.x + sign * (style === 'cruiser' ? 9 : 7), y: hip.y + 5 };
    let ankle = { x: hip.x + sign * (style === 'cruiser' ? 7 : style === 'scooter' ? 4 : 2), y: hip.y + 12 };
    let farAnkle = { x: ankle.x - sign * 3, y: ankle.y - 2 };
    if (style === 'pedal') {
      const crank = [{ x: 3, y: 0 }, { x: 0, y: 3 }, { x: -3, y: 0 }, { x: 0, y: -3 }][frame % 4]!;
      const crankX = dir === 1 ? 22 : 25;
      ankle = { x: crankX + sign * crank.x, y: 54 + crank.y + bounce };
      farAnkle = { x: crankX - sign * crank.x, y: 54 - crank.y + bounce };
      knee.y = hip.y + (frame === 3 ? 3 : 6);
    }
    const farKnee = { x: hip.x + sign * 5, y: hip.y + 4 };
    limb(far, [hip, farKnee, farAnkle], shade(PANTS, -0.24), 3);
    foot(far, farAnkle.x, farAnkle.y, false);
    limb(near, [hip, knee, ankle], PANTS, 4);
    foot(near, ankle.x, ankle.y);
  } else {
    // Both knees straddle the tank; calves run down either side, not through it.
    for (const direction of [-1, 1]) {
      const pedalY = style === 'pedal' ? (direction === 1 ? [0, 3, 0, -3] : [0, -3, 0, 3])[frame % 4]! : 0;
      const knee = { x: 24 + direction * 8, y: hip.y + 4 };
      const ankle = { x: 24 + direction * 8, y: hip.y + 12 + pedalY };
      limb(near, [{ x: 24 + direction * 3, y: hip.y }, knee, ankle], PANTS, 3);
      foot(near, ankle.x - 1, ankle.y);
    }
  }
  // Copy only the tailored torso (no hanging arms) and shear toward the bar.
  const sourceCenter = 8;
  const bodyLeft = side ? 5 : 4;
  const bodyRight = side ? 11 : 12;
  for (let y = 14; y <= 20; y++) {
    const shift = side ? sign * Math.round(((20 - y) / 6) * lean) : 0;
    const torsoY = !side && style === 'sport' ? hip.y - 10 + Math.round((y - 14) * 10 / 7) : hip.y + (y - 21) * 2;
    for (let x = bodyLeft; x < bodyRight; x++) {
      const color = source.get(x, y);
      if (color) near.rect(hip.x + (x - sourceCenter) * 2 + shift, torsoY, 2, 2, color);
    }
  }
  if (side) {
    const shoulder = { x: hip.x + sign * (lean + 1), y: hip.y - 11 };
    const hand = { x: dir === 1 ? 16 : 31, y: 38 + bounce };
    const elbow = { x: shoulder.x + sign * 4, y: hip.y - 7 };
    limb(near, [shoulder, elbow], shirt, 4);
    limb(near, [elbow, hand], skin, 3);
    near.rect(hand.x - 1, hand.y - 1, 3, 3, skin);
  } else {
    const handY = dir === 0 ? 48 : 37;
    for (const direction of [-1, 1]) {
      const shoulder = { x: 24 + direction * 6, y: hip.y - (style === 'sport' ? 7 : 11) };
      const elbow = { x: 24 + direction * 12, y: hip.y - 2 };
      const hand = { x: 24 + direction * 10, y: handY };
      limb(near, [shoulder, elbow], shirt, 3);
      limb(near, [elbow, hand], skin, 3);
    }
  }
  // Hair, face, glasses and hats retain the player's chosen appearance.
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < 16; x++) {
      const color = source.get(x, y);
      if (color) near.rect(hip.x + (x - sourceCenter) * 2 + (side ? sign * lean : 0),
        hip.y + (y - 21) * 2 + (style === 'sport' ? side ? 2 : 4 : 0), 2, 2, color);
    }
  }
  return { far, near, hip, style };
}

export function riddenVehicleCanvas(a: Appearance, id: string, dir: Dir, frame = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const layers = riderLayers(a, id, dir, frame);
  layers.far.drawTo(ctx, 0, 0, 1);
  ctx.drawImage(vehicleCanvas(id, dir, frame), 0, 24);
  layers.near.drawTo(ctx, 0, 0, 1);
  return canvas;
}

export function ensureRiddenVehicleTexture(scene: Phaser.Scene, a: Appearance, id: string, dir: Dir, frame: number) {
  const key = `rider:${appearanceKey(a)}:${id}:${dir}:${frame}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, riddenVehicleCanvas(a, id, dir, frame));
  return key;
}
