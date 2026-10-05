import { FARM_GARDEN, FARM_POIS, TILE } from '@cozy/game-data';
import type Phaser from 'phaser';
import { useUi } from '../lib/store';

export interface AnimatedTreeConfig {
  x: number;
  y: number;
  w: number;
  h: number;
  sprite?: Phaser.GameObjects.GameObject;
}

export interface WaterPondConfig {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ChimneyConfig {
  x: number;
  y: number;
}

export class FarmLivingPropsSystem {
  private scene: Phaser.Scene;
  private waterGraphics: Phaser.GameObjects.Graphics | null = null;
  private smokeTimer: Phaser.Time.TimerEvent | null = null;
  private leafTimer: Phaser.Time.TimerEvent | null = null;
  private sparkleTimer: Phaser.Time.TimerEvent | null = null;
  private swimmingFish: Phaser.GameObjects.Graphics | null = null;
  private fishProgress = 0;
  private trees: Phaser.GameObjects.Sprite[] = [];
  private lanterns: Phaser.GameObjects.Arc[] = [];
  private hangingSigns: Phaser.GameObjects.GameObject[] = [];
  private pond: WaterPondConfig = FARM_POIS.aquaculture_pond;
  private chimneys: ChimneyConfig[] = [FARM_POIS.shop_bac_sau, FARM_POIS.silo_warehouse].map((p) => ({
    x: p.x + p.w - 13,
    y: p.y - 30,
  }));

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(pondConfig?: WaterPondConfig) {
    if (pondConfig) {
      this.pond = pondConfig;
    }

    this.initWaterSurface();
    this.initChimneySmoke();
    this.initTreeCanopySway();
    this.initHangingProps();
  }

  // =========================================================================
  // 1. WATER SURFACE RIPPLES, CAUSTIC SHIMMER & SWIMMING FISH
  // =========================================================================
  private initWaterSurface() {
    this.waterGraphics = this.scene.add.graphics();
    this.waterGraphics.setDepth(-8); // Just above base ground water basin

    // Swimming fish shadow under water surface
    this.swimmingFish = this.scene.add.graphics();
    this.swimmingFish.setDepth(-8);

    // Glistening water sparkles
    this.sparkleTimer = this.scene.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => this.spawnWaterSparkle(),
    });
  }

  private spawnWaterSparkle() {
    if (!this.scene.sys.isActive() || useUi.getState().reducedMotion) return;

    // Pick random spot inside pond basin away from borders
    const px = this.pond.x + 35 + Math.random() * (this.pond.w - 70);
    const py = this.pond.y + 35 + Math.random() * (this.pond.h - 70);

    const sparkle = this.scene.add
      .text(px, py, '✦', {
        fontSize: '11px',
        color: '#e0f2fe',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(py);

    this.scene.tweens.add({
      targets: sparkle,
      alpha: { from: 0, to: 0.85 },
      scale: { from: 0.5, to: 1.2 },
      duration: 600,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => sparkle.destroy(),
    });
  }

  // =========================================================================
  // 2. CHIMNEY SMOKE PARTICLES
  // =========================================================================
  private initChimneySmoke() {
    this.smokeTimer = this.scene.time.addEvent({
      delay: 1100,
      loop: true,
      callback: () => {
        for (const ch of this.chimneys) {
          this.spawnSmokePuff(ch.x, ch.y);
        }
      },
    });
  }

  private spawnSmokePuff(x: number, y: number) {
    if (!this.scene.sys.isActive() || useUi.getState().reducedMotion) return;

    const weather = useUi.getState().weather;
    const windKmh = weather?.windSpeedKmh ?? 14;
    const windDir = ((weather?.windDirectionDeg ?? 190) * Math.PI) / 180;

    const driftX = Math.cos(windDir) * (windKmh * 1.5);
    const puff = this.scene.add.circle(x, y, 4, 0xf1f5f9, 0.45);
    puff.setDepth(y + 200);

    this.scene.tweens.add({
      targets: puff,
      x: x + driftX,
      y: y - (36 + Math.random() * 16),
      scale: { from: 0.8, to: 2.8 },
      alpha: { from: 0.5, to: 0 },
      duration: 2200 + Math.random() * 400,
      ease: 'Quad.easeOut',
      onComplete: () => puff.destroy(),
    });
  }

  // =========================================================================
  // 3. TREE CANOPY WIND SWAY & DRIFTING LEAVES
  // =========================================================================
  private initTreeCanopySway() {
    // Drifting leaf particles from orchard and oak trees
    this.leafTimer = this.scene.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => this.spawnDriftingLeaf(),
    });
  }

  private spawnDriftingLeaf() {
    if (!this.scene.sys.isActive() || useUi.getState().reducedMotion) return;

    // Spawn near ancient oak tree or orchard
    const tree = FARM_GARDEN.trees[Math.floor(Math.random() * FARM_GARDEN.trees.length)]!;
    const startX = tree[0] * TILE;
    const startY = tree[1] * TILE - 60;

    const weather = useUi.getState().weather;
    const windKmh = weather?.windSpeedKmh ?? 14;
    const leafColors = [0x84cc16, 0x65a30d, 0xfacc15, 0xca8a04];
    const color = leafColors[Math.floor(Math.random() * leafColors.length)];

    const leaf = this.scene.add.ellipse(startX, startY, 4, 2, color, 0.85);
    leaf.setDepth(startY + 30);

    this.scene.tweens.add({
      targets: leaf,
      x: startX + windKmh * 4.5,
      y: startY + 45 + Math.random() * 25,
      angle: 360,
      alpha: { from: 0.85, to: 0 },
      duration: 3200,
      ease: 'Sine.easeInOut',
      onComplete: () => leaf.destroy(),
    });
  }

  registerTree(treeSprite: Phaser.GameObjects.Sprite) {
    this.trees.push(treeSprite);
    if (useUi.getState().reducedMotion) return;

    // Subtle sinusoidal canopy sway tween
    treeSprite.setOrigin(0.5, 1.0); // bottom-anchored
    this.scene.tweens.add({
      targets: treeSprite,
      angle: { from: -1.2, to: 1.2 },
      duration: 2600 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // =========================================================================
  // 4. HANGING LANTERN & SIGN PENDULUM SWAY
  // =========================================================================
  private initHangingProps() {
    // Warm lantern glow over Shop Bac Sau and Silo
    const lanternSpots = [FARM_POIS.shop_bac_sau, FARM_POIS.silo_warehouse].map((p) => ({
      x: p.x + p.w / 2 - 42,
      y: p.y + p.h - 36,
    }));

    for (const spot of lanternSpots) {
      const glow = this.scene.add.circle(spot.x, spot.y, 14, 0xfde047, 0.25);
      glow.setDepth(spot.y + 1);

      // Warm breathing pulse
      this.scene.tweens.add({
        targets: glow,
        scale: { from: 0.85, to: 1.2 },
        alpha: { from: 0.15, to: 0.35 },
        duration: 1600 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.lanterns.push(glow);
    }
  }

  // =========================================================================
  // FRAME UPDATE LOOP (Water sine waves & fish patrol)
  // =========================================================================
  update(time: number, delta: number) {
    if (!this.waterGraphics || !this.scene.sys.isActive() || useUi.getState().reducedMotion) return;

    this.waterGraphics.clear();

    const t = time * 0.002;
    const { x, y, w, h } = this.pond;

    // Draw 3 layers of soft gushing water ripples across the pond surface
    for (let row = 0; row < 4; row++) {
      const lineY = y + 40 + row * 45;
      this.waterGraphics.lineStyle(1, 0xe0f2fe, 0.25);
      this.waterGraphics.beginPath();

      const startX = x + 30;
      const endX = x + w - 30;

      for (let px = startX; px <= endX; px += 8) {
        const offset = Math.sin(t * 1.5 + px * 0.04 + row) * 2.5;
        if (px === startX || Math.floor((px - startX) / 8) % 8 === 0) {
          this.waterGraphics.moveTo(px, lineY + offset);
        } else if (Math.floor((px - startX) / 8) % 8 < 4) {
          this.waterGraphics.lineTo(px, lineY + offset);
        } else {
          this.waterGraphics.moveTo(px, lineY + offset);
        }
      }
      this.waterGraphics.strokePath();
    }

    // Swimming fish cruise animation
    if (this.swimmingFish) {
      this.swimmingFish.clear();
      this.fishProgress += Math.min(delta, 50) * 0.000048;
      const fx = x + w / 2 + Math.cos(this.fishProgress * 2.5) * (w * 0.3);
      const fy = y + h / 2 + Math.sin(this.fishProgress * 1.8) * (h * 0.25);

      // Dark translucent fish silhouette below water
      this.swimmingFish.fillStyle(0x0c4a6e, 0.35);
      this.swimmingFish.fillEllipse(fx, fy, 9, 3.5);
      // Small tail
      const tailX = fx - Math.cos(this.fishProgress * 2.5) * 5;
      const tailY = fy - Math.sin(this.fishProgress * 1.8) * 3;
      this.swimmingFish.fillTriangle(tailX, tailY, tailX - 4, tailY - 3, tailX - 4, tailY + 3);
    }
  }

  cleanup() {
    this.waterGraphics?.destroy();
    this.waterGraphics = null;
    this.swimmingFish?.destroy();
    this.swimmingFish = null;
    this.smokeTimer?.destroy();
    this.smokeTimer = null;
    this.leafTimer?.destroy();
    this.leafTimer = null;
    this.sparkleTimer?.destroy();
    this.sparkleTimer = null;
    this.lanterns.forEach((l) => l.destroy());
    this.lanterns = [];
  }
}
