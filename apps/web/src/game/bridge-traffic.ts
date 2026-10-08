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
        const stepPhase = ui.reducedMotion ? 0 : Math.floor(now / 120 + a.variant) % 4;
        const bob = stepPhase % 2 === 1 ? -1 : 0;
        const d = a.dir;

        // Dynamic 16-bit elliptical ground shadow (contracts slightly when jumping)
        const shadowW = 16 - Math.abs(bob) * 2;
        g.fillStyle(0x090d16, 0.32).fillEllipse(x, y + 1, shadowW, 5);

        // 4-phase athletic running stride (1:3.5 proportion, longer leg reach)
        const legOffsets = [
          { frontX: 5, frontY: 0, backX: -5, backY: -3 },
          { frontX: 0, frontY: 1, backX: -1, backY: 0 },
          { frontX: -5, frontY: -3, backX: 5, backY: 0 },
          { frontX: -1, frontY: 0, backX: 0, backY: 1 },
        ][stepPhase]!;

        // Back Leg & Running Shoe (Dark compression leggings + cushion shoe)
        rect(0x090d16, x + d * legOffsets.backX - 2, y - 8 + legOffsets.backY, 3, 8);
        rect(0x1e293b, x + d * legOffsets.backX - 2, y - 7 + legOffsets.backY, 2, 6);
        rect(0x0f172a, x + d * legOffsets.backX - 3, y - 2 + legOffsets.backY, 5, 3);
        rect(0xf8fafc, x + d * legOffsets.backX - 3, y - 1 + legOffsets.backY, 5, 2); // Sole
        rect(color, x + d * legOffsets.backX - 2, y - 3 + legOffsets.backY, 3, 2); // Shoe color

        // Torso & High-Tech Athletic Compression Top (5-tier shading)
        const torsoY = y - 20 + bob;
        rect(0x090d16, x - 4, torsoY - 1, 9, 13); // Silhouette outline
        rect(0x1e293b, x - 3, torsoY, 7, 11);
        rect(color, x - 3, torsoY, 6, 10);
        rect(0xffffff, x - 2, torsoY + 1, 4, 2); // Aerodynamic chest badge
        rect(0x0f172a, x - 3, torsoY + 7, 7, 4); // Compression waist

        // Front Leg & Sneaker
        rect(0x090d16, x + d * legOffsets.frontX - 2, y - 8 + legOffsets.frontY, 4, 8);
        rect(0x334155, x + d * legOffsets.frontX - 2, y - 7 + legOffsets.frontY, 3, 6);
        rect(0xf8fafc, x + d * legOffsets.frontX - 1, y - 6 + legOffsets.frontY, 1, 4); // Side reflective stripe
        rect(0x0f172a, x + d * legOffsets.frontX - 3, y - 2 + legOffsets.frontY, 5, 3);
        rect(0xf8fafc, x + d * legOffsets.frontX - 3, y - 1 + legOffsets.frontY, 5, 2); // Cushion sole
        rect(color, x + d * legOffsets.frontX - 2, y - 3 + legOffsets.frontY, 3, 2);

        // Arms swinging in opposition with 16-bit athletic posture
        const armFront = legOffsets.backX;
        rect(0x090d16, x + d * 3 + d * armFront - 1, torsoY + 3, 4, 6);
        rect(0xfcd34d, x + d * 3 + d * armFront, torsoY + 4, 2, 5); // Forearm
        rect(0xfef08a, x + d * 3 + d * armFront, torsoY + 4, 1, 2); // Highlight

        // 🌟 HIGH-TECH SMARTWATCH WITH PULSATING CYAN GLOW
        const watchX = x + d * 3 + d * armFront;
        const watchY = torsoY + 7;
        rect(0x0f172a, watchX, watchY, 3, 2);
        rect(0x38bdf8, watchX + 1, watchY, 1, 1); // Cyan screen
        g.fillStyle(0x38bdf8, 0.45).fillCircle(watchX + 1, watchY + 1, 2); // Pulse halo

        // Head, Hair & Expressive 16-Bit Face (Height ~38px stature)
        const headY = torsoY - 9;
        rect(0x090d16, x - 4, headY - 1, 9, 10);
        rect(0xd97706, x - 3, headY, 7, 8); // Shadow
        rect(0xfcd34d, x - 3, headY, 6, 7); // Skin
        rect(0xfef08a, x - 2, headY, 3, 3); // Forehead highlight
        rect(0x090d16, x + d * 1, headY + 2, 2, 2); // Iris
        rect(0xf8fafc, x + d * 1 + 1, headY + 2, 1, 1); // Eye shine
        rect(0xf43f5e, x + d * 1, headY + 4, 2, 1); // Healthy cheek blush
        // Wireless running earbud
        rect(0xf8fafc, x - d * 2, headY + 3, 1, 2);

        // Sporty Headgear & Hair
        const hairCols = [0x18181b, 0x451a03, 0x18181b, 0xb45309, 0x18181b, 0x334155];
        rect(hairCols[a.variant]!, x - 4, headY - 2, 8, 4);
        if (a.variant % 2 === 0) {
          rect(0xef4444, x - 4, headY - 1, 8, 2); // Athletic headband
          rect(0xf8fafc, x - 2, headY - 1, 4, 1);
        } else {
          rect(0x2563eb, x - 4, headY - 3, 8, 3); // Runner cap
          rect(0x1d4ed8, x + d * 3, headY - 2, 4, 2); // Visor
          rect(0x60a5fa, x - 3, headY - 3, 5, 1); // Cap crown highlight
        }

        // In rain: Sleek translucent curved umbrella with reflective sheen
        if (ui.weather.precipitationMm > 0.5) {
          rect(0x1e293b, x + d * 3, torsoY - 12, 2, 18); // Shaft
          rect(0x64748b, x + d * 2, torsoY + 4, 3, 3); // Curved handle
          g.fillStyle(color, 0.92).fillCircle(x + d * 3, torsoY - 14, 15);
          g.fillStyle(0x090d16, 1).fillRect(x + d * 3 - 16, torsoY - 14, 32, 2);
          g.fillStyle(0xf8fafc, 0.65).fillCircle(x + d * 3 - 4, torsoY - 19, 4);
        }
        continue;
      }

      if (a.kind === 'bike') {
        const d = a.dir;
        // Dynamic ground shadow
        g.fillStyle(0x090d16, 0.32).fillEllipse(x, y + 1, 28, 6);

        // Rotating chrome-spoked wheels with brake calipers
        const spin = (now / 35) % (Math.PI * 2);
        for (const wx of [x - d * 10, x + d * 10]) {
          g.lineStyle(2, 0x090d16).strokeCircle(wx, y - 5, 5.5);
          g.lineStyle(1, 0xcbd5e1).strokeCircle(wx, y - 5, 4.5);
          rect(0x0f172a, wx - 1, y - 6, 3, 3);
          rect(0xf8fafc, wx - 1, y - 6, 2, 2);
          g.lineStyle(1, 0xf1f5f9, 0.8);
          for (let s = 0; s < 3; s++) {
            const sp = spin + (s * Math.PI) / 3;
            g.lineBetween(
              wx - Math.cos(sp) * 3.5,
              y - 5 - Math.sin(sp) * 3.5,
              wx + Math.cos(sp) * 3.5,
              y - 5 + Math.sin(sp) * 3.5,
            );
          }
        }

        // 🛵 CLASSIC HONDA SUPER CUB / VESPA SPRINT 16-BIT DELUXE BODY
        // Underbody shadow
        rect(0x090d16, x - 12, y - 12, 24, 8);
        // Rich metallic body paint with specular top line
        rect(color, x - 11, y - 11, 22, 6);
        rect(0xf8fafc, x - 9, y - 11, 18, 1); // Specular body streak
        // Classic white porcelain legshield with chrome edge
        rect(0x090d16, x + d * 5, y - 15, 6, 8);
        rect(0xf8fafc, x + d * 6, y - 14, 4, 7);
        rect(0xcbd5e1, x + d * 6, y - 14, 1, 7); // Chrome trim
        rect(0x090d16, x + d * 8, y - 17, 2, 3); // Chrome rearview mirror
        rect(0x38bdf8, x + d * 8, y - 17, 1, 2);

        // Leather stitched seat & Swept-back chrome exhaust pipe
        rect(0x27170a, x - d * 4 - 4, y - 14, 9, 4);
        rect(0x572608, x - d * 4 - 3, y - 13, 8, 2);
        rect(0x334155, x - d * 10, y - 3, 9, 3); // Exhaust body
        rect(0x94a3b8, x - d * 10, y - 3, 8, 2); // Chrome shield
        rect(0xf8fafc, x - d * 9, y - 3, 6, 1); // Specular highlight

        // Rider (1:3.5 Stylish Youth with Bomber Jacket & Selvedge Denim)
        const driverX = x - d * 2;
        // Selvedge denim jeans & riding sneakers
        rect(0x090d16, driverX + d * 1, y - 11, 6, 6);
        rect(0x1e3a8a, driverX + d * 2, y - 10, 4, 5);
        rect(0x3b82f6, driverX + d * 2, y - 9, 2, 3); // Denim wash highlight
        rect(0x090d16, driverX + d * 3, y - 5, 5, 3);
        rect(0xf8fafc, driverX + d * 3, y - 4, 4, 2); // Sneaker sole

        // Bomber windbreaker jacket with 16-bit fold shadows
        rect(0x090d16, driverX - 4, y - 21, 9, 10);
        rect(0x1e293b, driverX - 3, y - 20, 7, 8);
        rect(0x334155, driverX - 3, y - 20, 5, 7);
        rect(0x64748b, driverX - 2, y - 19, 3, 2); // Shoulder highlight
        rect(0xfcd34d, driverX + d * 4, y - 16, 3, 3); // Hand gripping throttle

        // 3/4 Retro Open-Face Helmet with Glossy Iridescent Visor
        const helmetCols = [0xdc2626, 0x2563eb, 0xd97706, 0x059669, 0xf8fafc, 0x7c3aed];
        const helmetCol = helmetCols[a.variant % helmetCols.length]!;
        rect(0x090d16, driverX - 5, y - 29, 9, 10);
        rect(helmetCol, driverX - 4, y - 28, 7, 8);
        rect(0xf8fafc, driverX - 3, y - 28, 4, 1); // Helmet gloss crest
        // Iridescent mirror visor reflecting the sky
        rect(0x090d16, driverX + d * 1, y - 25, 5, 4);
        rect(0x0284c7, driverX + d * 1, y - 24, 4, 3);
        rect(0x38bdf8, driverX + d * 2, y - 24, 2, 2);
        rect(0xf8fafc, driverX + d * 2, y - 24, 1, 1);

        // Projector LED Headlight & Ruby LED Taillight
        const noseX = x + d * 13;
        const tailX = x - d * 13;
        rect(0x090d16, noseX - 2, y - 9, 4, 4);
        rect(0xffedd5, noseX - 1, y - 8, 3, 3);
        rect(0xffffff, noseX, y - 8, 1, 1);
        rect(0xef4444, tailX - 1, y - 8, 2, 2);

        // Volumetric Headlight Cone & Red Taillight Glow
        if (brightness > 0.05) {
          lights
            .fillStyle(0xffe6aa, brightness * 0.22)
            .fillTriangle(noseX, y - 8, noseX + d * 60, y - 8 - 16, noseX + d * 60, y - 8 + 16);
          lights.fillStyle(0xef4444, brightness * 0.15).fillCircle(tailX, y - 8, 4);
        }
        continue;
      }

      const length = a.kind === 'truck' ? 60 : a.kind === 'bus' ? 48 : 32;
      const height = 17;
      const left = x - length / 2,
        top = y - height / 2;
      rect(0x162d37, left - 1, top - 1, length + 2, height + 2);
      rect(color, left, top, length, height);
      for (const wheel of [left + 5, left + length - 10]) {
        rect(0x20323b, wheel, top - 2, 6, 3);
        rect(0x20323b, wheel, top + height - 1, 6, 3);
      }
      {
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
