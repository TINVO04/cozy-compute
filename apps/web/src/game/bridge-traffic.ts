import type Phaser from 'phaser';
import { bridgeTravellers, RIVER_BRIDGE } from '@cozy/game-data';
import { useUi } from '../lib/store';
import { calculateBienHoaLighting } from './weather-engine';

/** A single draw buffer, with unique visits derived from the shared room clock. */
export class BridgeTraffic {
  private graphics: Phaser.GameObjects.Graphics;
  private lights: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setName('river:traffic').setDepth(1120);
    this.lights = scene.add.graphics().setName('river:bridge-lights').setDepth(2700);
  }
  update(now: number) {
    const g = this.graphics.clear();
    const lights = this.lights.clear();
    const ui = useUi.getState();
    const brightness = calculateBienHoaLighting(ui.weather.solarHour, ui.weather).lampBrightness;
    const travellers = bridgeTravellers(now);
    g.setData('travellers', travellers);
    const colors = [0xf0e7d0, 0x649fa2, 0xc46f55, 0xd4b45c, 0x779980, 0xa3b3c7];
    const rect = (c: number, x: number, y: number, w: number, h: number) =>
      g.fillStyle(c).fillRect(Math.round(x), Math.round(y), w, h);
    for (const a of travellers) {
      const x = Math.round(a.x),
        y = a.y;
      const color = colors[a.variant]!;
      if (a.kind === 'person') {
        const stride = ui.reducedMotion ? 0 : (Math.floor(now / 160 + a.variant) % 2) * 3;
        g.fillStyle(0x152b30, 0.25).fillEllipse(x, y + 1, 13, 4);
        rect(0x293e46, x - 4, y - 5, 3, 5 - stride);
        rect(0x293e46, x + 2, y - 5, 3, 2 + stride);
        rect(color, x - 5, y - 16, 11, 11);
        rect(0xe9ba8e, x - 4, y - 23, 8, 7);
        rect(0x45453e, x - 4, y - 24, 8, 3);
        rect(0xe9ba8e, x + a.dir * 6, y - 13 + stride, 3, 5);
        if (ui.weather.precipitationMm > 0.5) {
          rect(0x4d574a, x, y - 30, 1, 15);
          g.fillStyle(color).fillTriangle(x - 13, y - 25, x, y - 36, x + 13, y - 25);
          rect(0xf0debd, x - 12, y - 25, 24, 2);
        }
        continue;
      }
      const length = a.kind === 'truck' ? 60 : a.kind === 'bus' ? 48 : a.kind === 'bike' ? 19 : 32;
      const height = a.kind === 'bike' ? 9 : 17;
      const left = x - length / 2,
        top = y - height / 2;
      rect(0x162d37, left - 1, top - 1, length + 2, height + 2);
      rect(color, left, top, length, height);
      for (const wheel of [left + 5, left + length - 10]) {
        rect(0x20323b, wheel, top - 2, 6, 3);
        rect(0x20323b, wheel, top + height - 1, 6, 3);
      }
      if (a.kind === 'bike') {
        rect(0xeac39c, x - 3, y - 4, 6, 6);
        rect(0x526779, x - 5, y - 1, 9, 5);
      } else {
        rect(0x9ec8cc, a.dir > 0 ? left + length - 10 : left + 4, top + 2, 6, height - 4);
        if (a.kind === 'bus')
          for (let w = 13; w < length - 10; w += 7) rect(0x315e70, left + w, top + 2, 5, height - 4);
        else if (a.kind === 'truck') {
          const cargoX = a.dir > 0 ? left + 2 : left + 16;
          rect(0x869e9c, cargoX, top + 1, length - 18, height - 2);
          for (let w = 4; w < length - 18; w += 6) rect(0x607d7f, cargoX + w, top + 2, 1, height - 4);
        } else rect(0xe4dcc6, left + 12, top + 3, length - 23, height - 6);
      }
      const nose = x + (a.dir * length) / 2;
      for (const offset of [-height / 2 + 2, height / 2 - 4]) {
        rect(0xffecc1, nose - 1, y + offset, 3, 3);
        rect(0xca6752, x - (a.dir * length) / 2 - 1, y + offset, 2, 3);
        if (brightness > 0.05)
          lights
            .fillStyle(0xffe6aa, brightness * 0.13)
            .fillTriangle(
              nose,
              y + offset,
              nose + a.dir * 45,
              y + offset - 10,
              nose + a.dir * 45,
              y + offset + 10,
            );
      }
    }
    for (let x = 16; x < RIVER_BRIDGE.width; x += 64) {
      for (const y of [RIVER_BRIDGE.top - 9, RIVER_BRIDGE.bottom + 8]) {
        lights.fillStyle(0xffdc8c, brightness * 0.12).fillCircle(x, y, 22);
        lights.fillStyle(0xffedb8, brightness * 0.9).fillRect(x - 2, y - 1, 6, 3);
      }
    }
  }
  destroy() {
    this.graphics.destroy();
    this.lights.destroy();
  }
}
