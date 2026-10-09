import Phaser from 'phaser';
import { vehicleById } from '@cozy/game-data';
import { calculateBienHoaLighting } from './weather-engine';
import { useUi } from '../lib/store';

/** Reused beam texture; follows replicated vehicle position and heading for every driver. */
export class VehicleLights {
  private beam: Phaser.GameObjects.Image;
  private bulbs: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    const key = 'vehicle:headlight-beam';
    if (!scene.textures.exists(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 96;
      const ctx = canvas.getContext('2d')!;
      const fade = ctx.createLinearGradient(0, 48, 128, 48);
      fade.addColorStop(0, 'rgba(255,239,175,0.65)');
      fade.addColorStop(0.4, 'rgba(255,235,173,0.28)');
      fade.addColorStop(1, 'rgba(255,235,173,0)');
      ctx.fillStyle = fade;
      ctx.beginPath();
      ctx.moveTo(0, 44);
      ctx.lineTo(128, 4);
      ctx.lineTo(128, 92);
      ctx.lineTo(0, 52);
      ctx.closePath();
      ctx.fill();
      scene.textures.addCanvas(key, canvas);
    }
    this.beam = scene.add
      .image(0, 0, key)
      .setOrigin(0, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2601)
      .setVisible(false);
    this.bulbs = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(2602);
  }
  update(id: string, x: number, y: number, dir: number) {
    const vehicle = vehicleById(id);
    const weather = useUi.getState().weather;
    const brightness = calculateBienHoaLighting(weather.solarHour, weather).lampBrightness;
    this.bulbs.clear();
    this.beam.setVisible(Boolean(vehicle) && brightness > 0.05);
    if (!vehicle || brightness <= 0.05) return;
    // Avatar directions: down, left, right, up.
    const angle = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][dir] ?? 0;
    const dx = Math.cos(angle),
      dy = Math.sin(angle);
    const hdx = vehicle.lighting?.headlight?.dx ?? 20;
    const hdy = vehicle.lighting?.headlight?.dy ?? 18;
    const tdx = vehicle.lighting?.taillight?.dx ?? 18;
    const tdy = vehicle.lighting?.taillight?.dy ?? 18;
    const frontX = x + dx * hdx;
    const frontY = y - 10 + dy * hdy;
    const rearX = x - dx * tdx;
    const rearY = y - 10 - dy * tdy;
    const bicycle = vehicle.kind === 'bicycle';
    this.beam
      .setPosition(frontX, frontY)
      .setRotation(angle)
      .setAlpha(brightness)
      .setScale(bicycle ? 0.65 : 1, vehicle.kind === 'car' ? 1 : 0.7);
    for (const offset of vehicle.kind === 'car' ? [-8, 8] : [0]) {
      const bx = frontX - dy * offset,
        by = frontY + dx * offset;
      this.bulbs.fillStyle(0xffe8aa, 0.18 * brightness).fillCircle(bx, by, 7);
      this.bulbs.fillStyle(0xfff6d7, brightness).fillRect(bx - 2, by - 2, 4, 4);
    }
    this.bulbs.fillStyle(0xff5544, brightness * 0.8).fillCircle(rearX, rearY, 2);
  }
  destroy() {
    this.beam.destroy();
    this.bulbs.destroy();
  }
}
