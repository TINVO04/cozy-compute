import { SKIN_TONES, TOP_COLORS, vehicleById, type Appearance } from '@cozy/game-data';
import type Phaser from 'phaser';
import { appearanceKey, drawAvatar, type Dir } from './avatar';
import { drawChibiAvatar, type RidingStyle } from './chibi';
import { PixelGrid, shade } from './pixel';
import { vehicleCanvas } from './vehicle';

export type { RidingStyle };

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
        grid.rect(
          Math.round(a.x + ((b.x - a.x) * i) / steps) - Math.floor(size / 2),
          Math.round(a.y + ((b.y - a.y) * i) / steps) - Math.floor(size / 2),
          size,
          size,
          fill,
        );
      }
    }
  };
  stroke(shade(color, -0.38), width + 2);
  stroke(color, width);
  const knee = joints[1]!;
  grid.rect(knee.x - 1, knee.y - 1, 2, 1, shade(color, 0.2));
}

/** Seated anatomy uses the vehicle's seat, bar and footrest coordinates.
 * Far limbs are behind the vehicle, near knees/boots in front of the side panel.
 * Used for headless / test inspections and logical layer bounds.
 */
export function riderLayers(a: Appearance, id: string, dir: Dir, frame: number) {
  const far = new PixelGrid(48, 64);
  const near = new PixelGrid(48, 64);
  const style = ridingStyle(id);
  const side = dir === 1 || dir === 2;
  const sign = dir === 1 ? -1 : 1;
  const seat = vehicleById(id)?.mounting.seat ?? { x: 24, y: 18 };
  const bounce = side ? [0, 1, 0, -1][frame % 4]! : 0;
  // Center hip symmetrically at vehicle center
  const hip = { x: 24, y: seat.y + 24 + bounce };
  const lean = style === 'sport' ? 4 : style === 'pedal' ? 3 : style === 'touring' ? 2 : 0;
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
    const knee = { x: hip.x + sign * (style === 'cruiser' ? 8 : 6), y: hip.y + 5 };
    let ankle = { x: hip.x + sign * (style === 'cruiser' ? 6 : style === 'scooter' ? 3 : 2), y: hip.y + 12 };
    let farAnkle = { x: ankle.x - sign * 3, y: ankle.y - 2 };
    if (style === 'pedal') {
      const crank = [
        { x: 3, y: 0 },
        { x: 0, y: 3 },
        { x: -3, y: 0 },
        { x: 0, y: -3 },
      ][frame % 4]!;
      const crankX = dir === 1 ? 22 : 26;
      ankle = { x: crankX + sign * crank.x, y: 54 + crank.y + bounce };
      farAnkle = { x: crankX - sign * crank.x, y: 54 - crank.y + bounce };
      knee.y = hip.y + (frame === 3 ? 3 : 6);
    }
    const farKnee = { x: hip.x + sign * 4, y: hip.y + 4 };
    limb(far, [hip, farKnee, farAnkle], shade(PANTS, -0.24), 3);
    foot(far, farAnkle.x, farAnkle.y, false);
    limb(near, [hip, knee, ankle], PANTS, 4);
    foot(near, ankle.x, ankle.y);
  } else {
    // Both knees straddle the vehicle symmetrically
    for (const direction of [-1, 1]) {
      const pedalY = style === 'pedal' ? (direction === 1 ? [0, 3, 0, -3] : [0, -3, 0, 3])[frame % 4]! : 0;
      const knee = { x: 24 + direction * 7, y: hip.y + 4 };
      const ankle = { x: 24 + direction * 7, y: hip.y + 12 + pedalY };
      limb(near, [{ x: 24 + direction * 3, y: hip.y }, knee, ankle], PANTS, 3);
      foot(near, ankle.x - 1, ankle.y);
    }
  }

  // Torso
  const sourceCenter = 7.5;
  const bodyLeft = side ? 5 : 4;
  const bodyRight = side ? 11 : 12;
  for (let y = 14; y <= 20; y++) {
    const shift = side ? sign * Math.round(((20 - y) / 6) * lean) : 0;
    const torsoY =
      !side && style === 'sport' ? hip.y - 10 + Math.round(((y - 14) * 10) / 7) : hip.y + (y - 21) * 2;
    for (let x = bodyLeft; x < bodyRight; x++) {
      const color = source.get(x, y);
      if (color) near.rect(Math.round(hip.x + (x - sourceCenter) * 2) + shift, torsoY, 2, 2, color);
    }
  }

  // Natural arm geometry reaching towards handlebars
  if (side) {
    const shoulder = { x: hip.x + sign * lean, y: hip.y - 11 };
    const hand = { x: dir === 1 ? 15 : 32, y: 37 + bounce };
    const elbow = {
      x: Math.round((shoulder.x + hand.x) / 2) - sign * 1,
      y: Math.round((shoulder.y + hand.y) / 2) + 2,
    };
    limb(near, [shoulder, elbow], shirt, 4);
    limb(near, [elbow, hand], skin, 3);
    near.rect(hand.x - 1, hand.y - 1, 3, 3, skin);
  } else {
    const handY = dir === 0 ? 46 : 37;
    for (const direction of [-1, 1]) {
      const shoulder = { x: 24 + direction * 6, y: hip.y - (style === 'sport' ? 7 : 11) };
      const hand = { x: 24 + direction * 8, y: handY };
      const elbow = {
        x: 24 + direction * 10,
        y: Math.round((shoulder.y + handY) / 2) + 1,
      };
      limb(near, [shoulder, elbow], shirt, 3);
      limb(near, [elbow, hand], skin, 3);
    }
  }

  // Head aligned with torso
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < 16; x++) {
      const color = source.get(x, y);
      if (color) {
        near.rect(
          Math.round(hip.x + (x - sourceCenter) * 2) + (side ? sign * lean : 0),
          hip.y + (y - 21) * 2,
          2,
          2,
          color,
        );
      }
    }
  }

  return { far, near, hip, style };
}

/**
 * Creates the high-fidelity ridden vehicle composite canvas.
 * Renders the authentic Chibi character (anime eyes, rosy blush, proper face, hair, and posture)
 * with the vehicle sandwiched between the far and near rider layers.
 */
export function riddenVehicleCanvas(a: Appearance, id: string, dir: Dir, frame = 0): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  const style = ridingStyle(id);
  const side = dir === 1 || dir === 2;
  const bounce = side ? [0, 1, 0, -1][frame % 4]! : 0;
  // Center rider properly over vehicle saddle:
  // Down (0) / Up (3): symmetric at x=24
  // Profile: saddle sits towards the rear (+X when dir=1, -X when dir=2)
  let cx = 24;
  if (dir === 1) {
    cx = style === 'sport' ? 28 : style === 'cruiser' ? 27.5 : 27;
  } else if (dir === 2) {
    cx = style === 'sport' ? 20 : style === 'cruiser' ? 20.5 : 21;
  }

  let cy = 34 + bounce;
  if (style === 'cruiser') {
    cy = 36 + bounce;
  } else if (style === 'sport') {
    cy = 33.5 + bounce;
  }
  const scale = 0.42;

  // 1. Far rider layer (behind vehicle chassis in profile)
  drawChibiAvatar(ctx, a, {
    cx,
    cy,
    scale,
    dir,
    frame: (frame % 4) as 0 | 1 | 2,
    pose: 'riding',
    ridingStyle: style,
    ridingLayer: 'far',
    vehicleId: id,
    showWings: false,
  });

  // 2. Vehicle body (48x40 drawn at y=24)
  ctx.drawImage(vehicleCanvas(id, dir, frame), 0, 24);

  // 3. Near rider layer (in front of vehicle: near leg, torso, head, face, near arm)
  drawChibiAvatar(ctx, a, {
    cx,
    cy,
    scale,
    dir,
    frame: (frame % 4) as 0 | 1 | 2,
    pose: 'riding',
    ridingStyle: style,
    ridingLayer: 'near',
    vehicleId: id,
    showWings: false,
  });

  return canvas;
}

export function ensureRiddenVehicleTexture(
  scene: Phaser.Scene,
  a: Appearance,
  id: string,
  dir: Dir,
  frame: number,
) {
  const key = `rider:${appearanceKey(a)}:${id}:${dir}:${frame}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, riddenVehicleCanvas(a, id, dir, frame));
  return key;
}
