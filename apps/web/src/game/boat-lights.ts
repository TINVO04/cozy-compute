import Phaser from 'phaser';
import { BOAT_DISPLAY_FRAME_SIZE, BOAT_SPRITE_Y, STEAMBOAT_WORLD_SCALE } from '../art/boat';
import { useUi } from '../lib/store';
import { calculateBienHoaLighting } from './weather-engine';

const GLOW_TEXTURE = 'boat:steamboat-lantern-glow';
const FORWARD_VECTOR = [
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
] as const;

/** A soft warm lantern halo and water reflection rendered above the ocean night tint. */
export class SteamboatLights {
  private glow: Phaser.GameObjects.Image;
  private reflection: Phaser.GameObjects.Image;
  private lantern: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    if (!scene.textures.exists(GLOW_TEXTURE)) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not create the steamboat lantern glow texture.');

      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255, 237, 179, 0.5)');
      gradient.addColorStop(0.16, 'rgba(255, 211, 138, 0.32)');
      gradient.addColorStop(0.42, 'rgba(255, 177, 98, 0.14)');
      gradient.addColorStop(0.76, 'rgba(255, 166, 87, 0.04)');
      gradient.addColorStop(1, 'rgba(255, 166, 87, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      scene.textures.addCanvas(GLOW_TEXTURE, canvas);
    }

    this.glow = scene.add
      .image(0, 0, GLOW_TEXTURE)
      .setName('boat:steamboat-lantern-halo')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(3.2)
      .setDepth(2601)
      .setVisible(false);
    this.reflection = scene.add
      .image(0, 0, GLOW_TEXTURE)
      .setName('boat:steamboat-water-reflection')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.6, 0.7)
      .setDepth(2602)
      .setVisible(false);
    this.lantern = scene.add
      .graphics()
      .setName('boat:steamboat-lantern-core')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2603);
  }

  update(
    enabled: boolean,
    x: number,
    y: number,
    dir: number,
    seatY: number,
    heave: number,
    roll: number,
    time: number,
  ) {
    if (!enabled) {
      this.hide();
      return;
    }

    const { weather, reducedMotion } = useUi.getState();
    const hour = weather.solarHour;
    const fallsIntoTwilightOrNight = hour >= 16.75 || hour < 8;
    const brightness = calculateBienHoaLighting(hour, weather).lampBrightness;
    const intensity = fallsIntoTwilightOrNight ? Phaser.Math.Clamp(brightness, 0, 1) : 0;
    if (intensity < 0.035) {
      this.hide();
      return;
    }

    const forward = FORWARD_VECTOR[dir] ?? FORWARD_VECTOR[0];
    const lampDistance = BOAT_DISPLAY_FRAME_SIZE * STEAMBOAT_WORLD_SCALE * 0.36;
    const localX = forward.x * lampDistance;
    const localY = seatY + forward.y * lampDistance;
    const sin = Math.sin(roll);
    const cos = Math.cos(roll);
    const relativeY = localY - BOAT_SPRITE_Y;
    const lampX = x + localX * cos - relativeY * sin;
    const lampY = y + BOAT_SPRITE_Y + localX * sin + relativeY * cos + heave;
    const flicker = reducedMotion ? 1 : 0.96 + Math.sin(time / 340) * 0.025 + Math.sin(time / 173) * 0.012;

    this.glow
      .setPosition(lampX, lampY)
      .setAlpha(0.72 * intensity * flicker)
      .setVisible(true);
    this.reflection
      .setPosition(lampX, lampY + 12)
      .setAlpha(0.28 * intensity * flicker)
      .setVisible(true);

    this.lantern.clear();
    this.lantern.fillStyle(0xffc85d, 0.55 * intensity).fillCircle(lampX, lampY, 5);
    this.lantern.fillStyle(0xfff2c0, 0.95 * intensity).fillCircle(lampX, lampY, 2.5);
  }

  hide() {
    this.glow.setVisible(false);
    this.reflection.setVisible(false);
    this.lantern.clear();
  }

  destroy() {
    this.glow.destroy();
    this.reflection.destroy();
    this.lantern.destroy();
  }
}
