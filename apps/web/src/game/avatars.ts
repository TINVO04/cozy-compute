import type { Appearance } from '@cozy/game-data';
import type Phaser from 'phaser';
import { appearanceKey, AV_FRAME_H, AV_FRAME_W, AV_H, AV_SCALE, avatarSheet } from '../art/avatar';

/** Registers (once) a spritesheet texture for an appearance and its walk animations. */
export function ensureAvatarTexture(scene: Phaser.Scene, a: Appearance): string {
  const key = 'av:' + appearanceKey(a);
  if (scene.textures.exists(key)) return key;
  const canvas = avatarSheet(a, AV_SCALE);
  const tex = scene.textures.addCanvas(key, canvas)!;
  const fw = AV_FRAME_W;
  const fh = AV_FRAME_H;
  for (let d = 0; d < 4; d++) for (let f = 0; f < 3; f++) tex.add(d * 3 + f, 0, f * fw, d * fh, fw, fh);
  for (let d = 0; d < 4; d++) {
    scene.anims.create({
      key: `${key}:walk${d}`,
      frames: [1, 0, 2, 0].map((f) => ({ key, frame: d * 3 + f })),
      frameRate: 8,
      repeat: -1,
    });
  }
  return key;
}

export const AVATAR_FEET_OFFSET = AV_H * AV_SCALE - 6;
