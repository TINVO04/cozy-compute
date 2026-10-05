import type Phaser from 'phaser';
import { OCEAN_HEIGHT, OCEAN_WIDTH, RIVER_BRIDGE } from '@cozy/game-data';
import { useUi } from '../lib/store';
import { riverWave } from './river-motion';

/** One reusable draw buffer for coherent ripples, current and pier eddies. */
export class RiverSurface {
  private graphics: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(-8);
  }
  update(time: number) {
    const g = this.graphics;
    const ui = useUi.getState();
    const t = ui.reducedMotion ? 0 : time;
    g.clear();
    for (let i = 0; i < 160; i++) {
      const x = 42 + ((i * 137.3) % (OCEAN_WIDTH - 84));
      const y = 52 + ((i * 83.7 + t * 0.006) % (OCEAN_HEIGHT - 104));
      if (y > RIVER_BRIDGE.top - 10 && y < RIVER_BRIDGE.bottom + 20) continue;
      const wave = riverWave(t, x, y, ui.weather.windSpeedKmh);
      g.lineStyle(1, 0xb4d6ba, 0.07 + Math.max(0, wave) * 0.045);
      g.beginPath();
      g.moveTo(x - 12, y + wave);
      g.lineTo(x - 4, y - 1 + wave);
      g.lineTo(x + 9, y + wave);
      g.lineTo(x + 18, y + 2 + wave);
      g.strokePath();
    }
    for (const x of [256, 596, 936, 1276]) {
      for (let i = 0; i < 4; i++) {
        const phase = (t * 0.00022 + i / 4) % 1;
        g.lineStyle(1, 0xc8e0c6, (1 - phase) * 0.22);
        g.strokeEllipse(x, RIVER_BRIDGE.bottom + 14 + phase * 46, 24 + phase * 40, 5 + phase * 12);
      }
    }
  }
  destroy() {
    this.graphics.destroy();
  }
}
