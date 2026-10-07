import Phaser from 'phaser';
import {
  FARM_HEIGHT,
  FARM_POIS,
  FARM_WIDTH,
  MAP_HEIGHT,
  MAP_WIDTH,
  OCEAN_HEIGHT,
  OCEAN_WIDTH,
  RIVER_BRIDGE,
} from '@cozy/game-data';
import { play } from '../lib/sound';
import { useUi } from '../lib/store';

/**
 * Checks whether coordinates lie in water bodies:
 * - Song Dong Nai (x: 1120..1536, y: 640..1024, excluding wooden pier deck)
 * - Central Plaza Fountain pool (x: 736..800, y: 480..544)
 */
function isPointInWater(x: number, y: number): boolean {
  if (x >= 1120 && x <= 1536 && y >= 640 && y <= 1024) {
    const onPier = x >= 1216 && x <= 1280 && y >= 640 && y <= 960;
    return !onPier;
  }
  if (x >= 736 && x <= 800 && y >= 480 && y <= 544) {
    return true;
  }
  return false;
}

function isPointInFarmPond(x: number, y: number): boolean {
  const p = FARM_POIS.aquaculture_pond;
  return x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;
}

export class PrecipitationSystem {
  private scene: Phaser.Scene;
  private rainStreaks: Phaser.GameObjects.Graphics | null = null;
  private wetGroundOverlay: Phaser.GameObjects.Rectangle | null = null;
  private lightningFlash: Phaser.GameObjects.Rectangle | null = null;
  private drops: { x: number; y: number; length: number; speed: number }[] = [];
  private splashTimer: Phaser.Time.TimerEvent | null = null;
  private autoLightningTimer: Phaser.Time.TimerEvent | null = null;
  private lastLightningAt = 0;
  private isFlashing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init() {
    this.ensureTextures();

    const isOcean = this.scene.scene.key === 'ocean';
    const isFarm = this.scene.scene.key === 'farm';
    const mapW = isOcean ? OCEAN_WIDTH : isFarm ? FARM_WIDTH : MAP_WIDTH;
    const mapH = isOcean ? OCEAN_HEIGHT : isFarm ? FARM_HEIGHT : MAP_HEIGHT;

    // 1. Wet ground reflection sheen overlay (darkens and gives glistening sheen when wet)
    this.wetGroundOverlay = this.scene.add
      .rectangle(0, 0, mapW, mapH, 0x0f172a)
      .setOrigin(0, 0)
      .setDepth(-4)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);

    // 2. High-performance Canvas/Graphics Rain Streaks Batcher
    this.rainStreaks = this.scene.add.graphics();
    this.rainStreaks.setName('weather:rain');
    this.rainStreaks.setDepth(2900); // above props and players, below UI

    // 3. Lightning flash screen overlay
    this.lightningFlash = this.scene.add
      .rectangle(0, 0, mapW, mapH, 0xf0fdf4)
      .setOrigin(0, 0)
      .setDepth(3500)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Initialize drop pool
    const POOL_SIZE = 350;
    this.drops = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      this.drops.push({
        x: Math.random() * (mapW + 400) - 200,
        y: Math.random() * (mapH + 200) - 100,
        length: 12 + Math.random() * 10,
        speed: 480 + Math.random() * 220,
      });
    }

    // Splash ripples & water droplets during rain
    this.setupSplashes();

    // Occasional automatic lightning during thunderstorms
    this.setupAutoLightning();
  }

  private ensureTextures() {
    // 1. Expanding water ripple ring for raindrops striking river/fountain surface
    if (!this.scene.textures.exists('particle:water_ripple')) {
      const c = document.createElement('canvas');
      c.width = 28;
      c.height = 16;
      const ctx = c.getContext('2d')!;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(14, 8, 12, 6, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Soft inner ring
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(14, 8, 8, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      this.scene.textures.addCanvas('particle:water_ripple', c);
    }

    // 2. Water bead that splashes upward when a raindrop strikes water
    if (!this.scene.textures.exists('particle:water_bead')) {
      const c = document.createElement('canvas');
      c.width = 4;
      c.height = 4;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, 0, 2, 1);
      ctx.fillRect(0, 1, 4, 2);
      ctx.fillRect(1, 3, 2, 1);
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(1, 1, 2, 2);
      this.scene.textures.addCanvas('particle:water_bead', c);
    }

    // 3. Floating rain bubble on water ("bong bóng mưa phập phồng")
    if (!this.scene.textures.exists('particle:rain_bubble')) {
      const c = document.createElement('canvas');
      c.width = 8;
      c.height = 8;
      const ctx = c.getContext('2d')!;
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(4, 4, 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 2, 1, 1);
      this.scene.textures.addCanvas('particle:rain_bubble', c);
    }

    // 4. Ground splash on pavement/stone
    if (!this.scene.textures.exists('particle:land_splash')) {
      const c = document.createElement('canvas');
      c.width = 12;
      c.height = 8;
      const ctx = c.getContext('2d')!;
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(6, 4, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      this.scene.textures.addCanvas('particle:land_splash', c);
    }
  }

  private setupSplashes() {
    this.splashTimer = this.scene.time.addEvent({
      delay: 75,
      loop: true,
      callback: () => {
        if (!this.scene.sys || !this.scene.scene.isActive()) return;
        const weather = useUi.getState().weather;
        if (weather.precipitationMm <= 0) return;

        const isHeavy = weather.condition === 'thunderstorm' || weather.condition === 'heavy_rain';
        const isRain = weather.condition === 'rain';

        // 1. Water impacts on Song Dong Nai & Fountain
        const waterCount = isHeavy ? 14 : isRain ? 7 : 3;
        for (let i = 0; i < waterCount; i++) {
          this.spawnWaterRainImpact(isHeavy, isRain);
        }

        // 2. Land impacts on streets & sidewalks
        const landCount = isHeavy ? 5 : isRain ? 3 : 1;
        const cam = this.scene.cameras.main;
        for (let i = 0; i < landCount; i++) {
          const sx = cam.worldView.x + Math.random() * cam.worldView.width;
          const sy = cam.worldView.y + Math.random() * cam.worldView.height;
          const isFarmScene = this.scene.scene.key === 'farm';
          const land =
            this.scene.scene.key === 'ocean'
              ? sy >= RIVER_BRIDGE.top && sy <= RIVER_BRIDGE.bottom
              : isFarmScene
                ? !isPointInFarmPond(sx, sy)
                : !isPointInWater(sx, sy);
          if (land) {
            this.spawnLandSplash(sx, sy);
          }
        }
      },
    });
  }

  /**
   * Spawns realistic rain ripples, upward water droplet beads, and floating rain bubbles
   * specifically on the surface of Song Dong Nai, the farm aquaculture pond, and the central plaza fountain.
   */
  private spawnWaterRainImpact(isHeavy: boolean, isRain: boolean) {
    const cam = this.scene.cameras.main;

    // Pick random point in water: either in Song Dong Nai, Farm pond, or Plaza Fountain
    let wx: number;
    let wy: number;

    if (this.scene.scene.key === 'ocean') {
      wx = cam.worldView.x + Math.random() * cam.worldView.width;
      wy = cam.worldView.y + Math.random() * cam.worldView.height;
      if (wy >= RIVER_BRIDGE.top && wy <= RIVER_BRIDGE.bottom) return;
    } else if (this.scene.scene.key === 'farm') {
      const pond = FARM_POIS.aquaculture_pond;
      wx = pond.x + 24 + Math.random() * (pond.w - 48);
      wy = pond.y + 24 + Math.random() * (pond.h - 48);
    } else {
      const inFountain = Math.random() < 0.2;
      if (inFountain) {
        // Plaza Fountain pool: 736..800, 480..544
        wx = 740 + Math.random() * 56;
        wy = 484 + Math.random() * 54;
      } else {
        // Song Dong Nai: 1124..1530, 644..1020
        wx = 1124 + Math.random() * 406;
        wy = 644 + Math.random() * 372;
        // Skip if on pier
        if (wx >= 1216 && wx <= 1280 && wy >= 640 && wy <= 960) return;
      }
    }

    // Only spawn if near camera view
    if (
      wx < cam.worldView.x - 40 ||
      wx > cam.worldView.x + cam.worldView.width + 40 ||
      wy < cam.worldView.y - 40 ||
      wy > cam.worldView.y + cam.worldView.height + 40
    ) {
      return;
    }

    // 1. Concentric Expanding Water Wavelet Ripple
    const ripple = this.scene.add
      .image(wx, wy, 'particle:water_ripple')
      .setOrigin(0.5, 0.5)
      .setScale(0.2)
      .setAlpha(0.85)
      .setDepth(-7); // Above river ground (-10), below pier and boat

    this.scene.tweens.add({
      targets: ripple,
      scaleX: 1.25 + Math.random() * 0.35,
      scaleY: 0.75 + Math.random() * 0.25,
      alpha: 0,
      duration: 340 + Math.random() * 120,
      ease: 'Cubic.easeOut',
      onComplete: () => ripple.destroy(),
    });

    // 2. Upward Bouncing Water Droplet Bead (Raindrop Splash)
    if (isRain || isHeavy) {
      const bead = this.scene.add
        .image(wx + (Math.random() * 4 - 2), wy, 'particle:water_bead')
        .setOrigin(0.5, 0.5)
        .setScale(0.85)
        .setAlpha(0.9)
        .setDepth(-6);

      const bounceHeight = 4 + Math.random() * 6;
      this.scene.tweens.chain({
        targets: bead,
        tweens: [
          {
            y: wy - bounceHeight,
            duration: 90,
            ease: 'Quad.easeOut',
          },
          {
            y: wy + 1,
            alpha: 0,
            duration: 100,
            ease: 'Quad.easeIn',
          },
        ],
        onComplete: () => bead.destroy(),
      });
    }

    // 3. Floating Rain Bubble on Water ("bong bóng mưa phập phồng")
    if (isHeavy && Math.random() < 0.28) {
      const bubble = this.scene.add
        .image(wx + (Math.random() * 6 - 3), wy + (Math.random() * 4 - 2), 'particle:rain_bubble')
        .setOrigin(0.5, 0.5)
        .setScale(0.75 + Math.random() * 0.35)
        .setAlpha(0.8)
        .setDepth(-6);

      this.scene.tweens.add({
        targets: bubble,
        y: wy + 2,
        alpha: 0,
        duration: 400 + Math.random() * 250,
        ease: 'Sine.easeIn',
        onComplete: () => bubble.destroy(),
      });
    }
  }

  private spawnLandSplash(sx: number, sy: number) {
    const splash = this.scene.add
      .image(sx, sy, 'particle:land_splash')
      .setOrigin(0.5, 0.5)
      .setScale(0.35)
      .setAlpha(0.65)
      .setDepth(this.scene.scene.key === 'ocean' ? 1130 : sy - 1);

    this.scene.tweens.add({
      targets: splash,
      scaleX: 1.15,
      scaleY: 0.95,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => splash.destroy(),
    });
  }

  private setupAutoLightning() {
    this.autoLightningTimer = this.scene.time.addEvent({
      delay: 11000 + Math.random() * 8000,
      loop: true,
      callback: () => {
        if (!this.scene.sys || !this.scene.scene.isActive()) return;
        const weather = useUi.getState().weather;
        if (weather.condition === 'thunderstorm') {
          this.triggerLightningStrike();
        }
      },
    });
  }

  /**
   * Fires a dramatic lightning flash + rolling thunder sound.
   * Can be triggered automatically in thunderstorms or on-demand by Admin test button.
   */
  public triggerLightningStrike() {
    if (this.isFlashing || !this.lightningFlash) return;
    this.isFlashing = true;
    play('thunder');

    // Double flash sequence (classic atmospheric lightning strike)
    this.scene.tweens.chain({
      targets: this.lightningFlash,
      tweens: [
        {
          alpha: 0.95,
          duration: 40,
          ease: 'Linear',
        },
        {
          alpha: 0.15,
          duration: 50,
          ease: 'Linear',
        },
        {
          alpha: 0.85,
          duration: 35,
          ease: 'Linear',
        },
        {
          alpha: 0,
          duration: 380,
          ease: 'Quad.easeOut',
        },
      ],
      onComplete: () => {
        this.isFlashing = false;
      },
    });
  }

  update(_time: number, delta: number) {
    const weather = useUi.getState().weather;
    const reducedMotion = useUi.getState().reducedMotion;

    // 1. Check for Admin manual lightning trigger
    const adminLightningAt = weather.lightningTriggeredAt ?? 0;
    if (adminLightningAt > this.lastLightningAt) {
      this.lastLightningAt = adminLightningAt;
      this.triggerLightningStrike();
    }

    // 2. Wet Ground Overlay
    if (this.wetGroundOverlay) {
      const targetWetAlpha =
        weather.precipitationMm > 10
          ? 0.38
          : weather.precipitationMm > 2
            ? 0.22
            : weather.precipitationMm > 0
              ? 0.12
              : 0;
      this.wetGroundOverlay.alpha = Phaser.Math.Linear(this.wetGroundOverlay.alpha, targetWetAlpha, 0.04);
    }

    // 3. Rain Streaks Batch Rendering
    if (!this.rainStreaks) return;
    this.rainStreaks.clear();

    const precip = weather.precipitationMm;
    if (precip <= 0 || reducedMotion) return;

    // Active drops count
    const activeCount =
      weather.condition === 'thunderstorm'
        ? 340
        : weather.condition === 'heavy_rain'
          ? 260
          : weather.condition === 'rain'
            ? 150
            : 50;

    // Wind influence on slant angle
    const windKmh = weather.windSpeedKmh;
    const slantX = Math.min(18, Math.max(-18, (windKmh / 20) * 12));
    const dtSeconds = delta / 1000;

    this.rainStreaks.lineStyle(
      1.2,
      0xdbeafe,
      weather.condition === 'heavy_rain' || weather.condition === 'thunderstorm' ? 0.6 : 0.45,
    );

    const cam = this.scene.cameras.main;
    const viewLeft = cam.worldView.x - 100;
    const viewRight = cam.worldView.x + cam.worldView.width + 100;
    const viewTop = cam.worldView.y - 100;
    const viewBottom = cam.worldView.y + cam.worldView.height + 100;

    for (let i = 0; i < activeCount; i++) {
      const d = this.drops[i]!;
      d.y += d.speed * dtSeconds;
      d.x += slantX * 35 * dtSeconds;

      // Wrap around viewport
      if (d.y > viewBottom) {
        d.y = viewTop;
        d.x = viewLeft + Math.random() * (viewRight - viewLeft);
      }
      if (d.x > viewRight) {
        d.x = viewLeft;
      } else if (d.x < viewLeft) {
        d.x = viewRight;
      }

      // Draw line streak
      this.rainStreaks.beginPath();
      this.rainStreaks.moveTo(d.x, d.y);
      this.rainStreaks.lineTo(d.x - slantX * 0.7, d.y - d.length);
      this.rainStreaks.strokePath();
    }
  }

  cleanup() {
    this.splashTimer?.destroy();
    this.splashTimer = null;
    this.autoLightningTimer?.destroy();
    this.autoLightningTimer = null;
    this.rainStreaks?.destroy();
    this.rainStreaks = null;
    this.wetGroundOverlay?.destroy();
    this.wetGroundOverlay = null;
    this.lightningFlash?.destroy();
    this.lightningFlash = null;
    this.drops = [];
  }
}
