import type Phaser from 'phaser';
import type { MartialEffect } from '@cozy/game-data';
import { buildMartialHall } from './martial-hall';
import { MartialEffects } from './martial-effects';
export const paintMartialHall = buildMartialHall;
const effects = new WeakMap<Phaser.Scene, MartialEffects>();
export function playMartialEffect(scene: Phaser.Scene, e: MartialEffect) {
  let controller = effects.get(scene);
  if (!controller) {
    controller = new MartialEffects(scene);
    effects.set(scene, controller);
    scene.events.once('shutdown', () => effects.delete(scene));
  }
  controller.emit(e);
}
