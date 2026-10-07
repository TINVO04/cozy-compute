import { SHOWROOM, SHOWROOM_BLOCKERS, VEHICLE_DISPLAYS, showroomDisplayAt } from '@cozy/game-data';
import type { Room } from 'colyseus.js';
import { useUi } from '../lib/store';
import { WorldScene } from './scenes';
import { net } from './net';
import { buildShowroomTexture, populateShowroomElements } from './showroom-art';

export class ShowroomScene extends WorldScene {
  private exiting = false;
  private spotlights?: Phaser.GameObjects.Graphics;
  private particles?: Phaser.GameObjects.Graphics;

  constructor() {
    super('showroom');
  }

  protected worldSize() {
    return SHOWROOM;
  }

  protected blockers() {
    return SHOWROOM_BLOCKERS;
  }

  protected matchesRoom(room: Room) {
    return room.name === 'showroom';
  }

  protected override onSelfMove(x: number, y: number) {
    useUi.getState().setShowroomVehicle(showroomDisplayAt(x, y));

    // Walk through automatic sliding glass doors to seamlessly exit back to town forecourt
    if (!this.exiting && y > 434 && x > 268 && x < 372) {
      this.exiting = true;
      void net.goTown('showroom');
    }
  }

  protected buildWorld() {
    this.exiting = false;

    // Generate and cache authentic luxury showroom pixel-art canvas texture
    buildShowroomTexture(this);

    // Populate layered interior props, vehicles, interactive kiosks and advisor NPC
    populateShowroomElements(this);

    // Dynamic visual overlay layers: atmospheric spotlights and floating light motes
    this.spotlights = this.add.graphics().setDepth(80);
    this.particles = this.add.graphics().setDepth(350);

    this.events.once('shutdown', () => {
      this.spotlights?.destroy();
      this.particles?.destroy();
      useUi.getState().setShowroomVehicle(null);
    });
  }

  override update(time: number, dt: number) {
    super.update(time, dt);

    const reduced = useUi.getState().reducedMotion;
    const activeVehicle = useUi.getState().showroomVehicle;

    // 1. Dynamic Overhead Spotlight Beams & Floor Specular Pools
    if (this.spotlights) {
      const g = this.spotlights;
      g.clear();

      for (const display of VEHICLE_DISPLAYS) {
        const isActive = activeVehicle === display.id;
        const pulse = reduced ? 0.1 : 0.09 + Math.sin(time / 800 + display.x) * 0.025;
        const beamAlpha = isActive ? 0.2 : pulse;
        const poolAlpha = isActive ? 0.16 : pulse * 0.8;

        // Overhead directional spotlight cone (ceiling track lamp down to vehicle platform)
        const topX = display.x;
        const topY = 28;
        const botY = display.y - 10;
        const topW = 6;
        const botW = isActive ? 52 : 44;

        // Conical spotlight beam
        g.fillStyle(isActive ? 0xfff3cc : 0xffffff, beamAlpha * 0.7);
        g.beginPath();
        g.moveTo(topX - topW, topY);
        g.lineTo(topX + topW, topY);
        g.lineTo(topX + botW, botY);
        g.lineTo(topX - botW, botY);
        g.closePath();
        g.fillPath();

        // Inner core bright ray
        g.fillStyle(0xffffff, beamAlpha * 0.9);
        g.beginPath();
        g.moveTo(topX - 2, topY);
        g.lineTo(topX + 2, topY);
        g.lineTo(topX + botW * 0.45, botY);
        g.lineTo(topX - botW * 0.45, botY);
        g.closePath();
        g.fillPath();

        // Specular light reflection pool on the turntable floor
        g.fillStyle(isActive ? 0xfffae6 : 0xffffff, poolAlpha);
        g.fillEllipse(display.x, display.y + 4, isActive ? 92 : 78, isActive ? 34 : 28);

        // Active selection illuminated pulsing ring
        if (isActive && !reduced) {
          const ringPulse = 0.5 + Math.sin(time / 250) * 0.4;
          g.lineStyle(2, 0x4eedca, ringPulse);
          g.strokeEllipse(display.x, display.y - 2, 98, 38);
        }
      }
    }

    // 2. Ambient Floating Showroom Dust & Light Motes
    if (this.particles) {
      const p = this.particles;
      p.clear();

      for (let i = 0; i < 20; i++) {
        const seedX = 80 + ((i * 41.7 + (reduced ? 0 : time * 0.007)) % 480);
        const seedY = 44 + ((i * 53.3 + (reduced ? 0 : Math.sin(time / 1800 + i) * 14 + time * 0.003)) % 350);
        const moteAlpha = 0.15 + (i % 4) * 0.08;

        p.fillStyle(0xfff6db, moteAlpha);
        p.fillRect(seedX, seedY, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
      }
    }
  }
}
