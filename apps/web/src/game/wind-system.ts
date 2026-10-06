import Phaser from 'phaser';
import { TILE } from '@cozy/game-data';
import {
  ensureFlagDntuTextures,
  ensureFlagVietnamTextures,
  ensureFountainWaterTextures,
  ensurePinwheelTextures,
  ensureWindParticleTextures,
} from '../art/town-wind-props';
import { useUi } from '../lib/store';

interface SwayingTree {
  image: Phaser.GameObjects.Image;
  baseScaleX: number;
  baseScaleY: number;
  phase: number;
  flexibility: number;
}

interface SwayingFlag {
  sprite: Phaser.GameObjects.Sprite;
  baseAngle: number;
}

interface SwayingCurtain {
  image: Phaser.GameObjects.Image;
  baseX: number;
  phase: number;
}

interface SpinningPinwheel {
  sprite: Phaser.GameObjects.Image;
  baseSpeed: number;
}

export class WindSystem {
  private scene: Phaser.Scene;
  private trees: SwayingTree[] = [];
  private flags: SwayingFlag[] = [];
  private curtains: SwayingCurtain[] = [];
  private pinwheels: SpinningPinwheel[] = [];
  private pinwheelSticks: Phaser.GameObjects.Image[] = [];
  private fountainSpout: Phaser.GameObjects.Sprite | null = null;
  private fountainCascades: Phaser.GameObjects.Sprite | null = null;
  private awningFringe: Phaser.GameObjects.Graphics | null = null;
  private particleTimer: Phaser.Time.TimerEvent | null = null;
  private lastGustTriggerAt = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init() {
    ensureFlagVietnamTextures(this.scene);
    ensureFlagDntuTextures(this.scene);
    ensureWindParticleTextures(this.scene);
    ensurePinwheelTextures(this.scene);
    ensureFountainWaterTextures(this.scene);

    this.registerTrees();
    this.setupFlags();
    this.setupCurtains();
    this.setupAwningFringe();
    this.setupPinwheels();
    this.setupFountainAnimation();
    this.setupPetalParticles();
  }

  /**
   * Discovers all trees in the scene (TOWN_TREES, border trees, palms)
   * and stores their baseline transform for wind sway physics.
   */
  private registerTrees() {
    this.trees = [];
    const allChildren = this.scene.children.getAll();

    for (const obj of allChildren) {
      if (!(obj instanceof Phaser.GameObjects.Image)) continue;
      const name = obj.name || '';
      if (
        name.startsWith('tree:') ||
        name.startsWith('border:north') ||
        name.startsWith('border:south') ||
        name.startsWith('border:west') ||
        name.startsWith('border:east') ||
        name.startsWith('border:palm') ||
        name === 'scenery:garden-palm' ||
        name === 'scenery:garden-palm-east' ||
        name === 'scenery:west-palm'
      ) {
        const isPalm = name.includes('palm');
        // Ensure origin is firmly rooted at bottom center
        obj.setOrigin(0.5, 1.0);
        this.trees.push({
          image: obj,
          baseScaleX: obj.scaleX,
          baseScaleY: obj.scaleY,
          phase: (obj.x * 0.05 + obj.y * 0.02) % (Math.PI * 2),
          flexibility: isPalm ? 1.3 : 1.0,
        });
      }
    }
  }

  /**
   * Sets up dynamic fluttering flag sprites (6-frame procedural ripple wave):
   * 1. Vietnam National Flag on Quán Cơm Gà 68 Floor 2 balcony
   * 2. 3 Flagpoles in front of DNTU Grand Entrance (Center Vietnam, flanking DNTU flags)
   */
  private setupFlags() {
    this.flags = [];

    // 1. Quán Cơm Gà 68 (Cờ Tổ Quốc trên ban công tầng 2)
    // Com Ga 68 building: x = 12 * 32 = 384, y = 12 * 32 = 384. Top-left: x = 380, y = 352.
    // Flagpole mount on Floor 2 left railing: pole tip at x = 383, y = 390.
    // Building depth: 384 + 128 - 4 = 508. Flag depth: 515 (renders in front of building).
    const comGaFlag = this.scene.add
      .sprite(383, 390, 'flag:vn:0')
      .setOrigin(0.05, 0.25)
      .setDepth(515)
      .setScale(1.15)
      .play('anim:flag:vn');
    this.flags.push({ sprite: comGaFlag, baseAngle: -6 });

    // 2. DNTU Grand Entrance 3 Flagpoles
    // DNTU building: x = 21 * 32 = 672, w = 352. Center pedX = 668 + 176 = 844.
    // Building depth: 252. Flag depth: 260.
    const pedX = 844;
    const depth = 260;

    // Left Flag: DNTU Flag (waving eastward with the wind)
    const dntuLeft = this.scene.add
      .sprite(pedX - 16, 160, 'flag:dntu:0')
      .setOrigin(0.05, 0.25)
      .setDepth(depth)
      .setScale(1.05)
      .play('anim:flag:dntu');
    this.flags.push({ sprite: dntuLeft, baseAngle: -2 });

    // Center Flag: Vietnam National Flag
    const dntuCenter = this.scene.add
      .sprite(pedX + 1, 154, 'flag:vn:0')
      .setOrigin(0.05, 0.25)
      .setDepth(depth + 2)
      .setScale(1.2)
      .play('anim:flag:vn');
    this.flags.push({ sprite: dntuCenter, baseAngle: -3 });

    // Right Flag: DNTU Flag
    const dntuRight = this.scene.add
      .sprite(pedX + 16, 160, 'flag:dntu:0')
      .setOrigin(0.05, 0.25)
      .setDepth(depth)
      .setScale(1.05)
      .play('anim:flag:dntu');
    this.flags.push({ sprite: dntuRight, baseAngle: -2 });
  }

  /**
   * Sets up fluttering sheer window curtains inside apartment balcony windows.
   * Apartment building world top-left: x = 1180, y = 64. Building depth: 316.
   * Floor 3 windows: y = 118. Floor 2 windows: y = 164.
   * Curtain depth: 330 (renders clearly in front of window glass).
   */
  private setupCurtains() {
    this.curtains = [];

    const windowCoords = [
      // Floor 3 open balcony doors
      { x: 1199, y: 118 }, // Bay 1 left
      { x: 1347, y: 118 }, // Bay 4 left
      // Floor 2 open balcony doors
      { x: 1253, y: 164 }, // Bay 2 left
      { x: 1399, y: 164 }, // Bay 5 left
    ];

    windowCoords.forEach((pt, i) => {
      const c = this.scene.add
        .image(pt.x, pt.y, 'prop:curtain:sheer')
        .setOrigin(0.5, 0.0) // Anchored firmly to top curtain rod
        .setDepth(330)
        .setScale(0.75);
      this.curtains.push({ image: c, baseX: pt.x, phase: i * 1.1 });
    });
  }

  /**
   * Sets up colorful spinning pinwheels on street food vendor carts:
   * Depth: 580 (strictly GREATER than cart depth 563.2 so pinwheels are 100% IN FRONT of cart & signboard!)
   * - Xe Bún Riêu: x = 550, y = 502
   * - Xe Nước Mía: x = 822, y = 502
   */
  private setupPinwheels() {
    this.pinwheels = [];
    this.pinwheelSticks = [];

    // 1. Xe Bún Riêu (x: 576, y: 563, depth: 580)
    const stick1 = this.scene.add.image(550, 520, 'prop:pinwheel:stick').setOrigin(0.5, 1).setDepth(580);
    const pinwheel1 = this.scene.add
      .image(550, 502, 'prop:pinwheel')
      .setOrigin(0.5, 0.5)
      .setDepth(581)
      .setScale(0.95);
    this.pinwheelSticks.push(stick1);
    this.pinwheels.push({ sprite: pinwheel1, baseSpeed: 1.0 });

    // 2. Xe Nước Mía (x: 848, y: 563, depth: 580)
    const stick2 = this.scene.add.image(822, 520, 'prop:pinwheel:stick').setOrigin(0.5, 1).setDepth(580);
    const pinwheel2 = this.scene.add
      .image(822, 502, 'prop:pinwheel')
      .setOrigin(0.5, 0.5)
      .setDepth(581)
      .setScale(0.95);
    this.pinwheelSticks.push(stick2);
    this.pinwheels.push({ sprite: pinwheel2, baseSpeed: 1.15 });
  }

  /**
   * Sets up dynamic animated geyser spray and cascading waterfalls on the Plaza Fountain
   * Fountain center: x = 24 * TILE = 768, y = 17 * TILE = 544
   */
  private setupFountainAnimation() {
    const fx = 24 * TILE; // 768
    const fy = 17 * TILE; // 544

    // 1. Spouting geyser water jet at top finial
    this.fountainSpout = this.scene.add
      .sprite(fx, fy - 66, 'fountain:spout:0')
      .setOrigin(0.5, 1)
      .setDepth(fy + 12)
      .setScale(1.1)
      .play('anim:fountain:spout');

    // 2. Cascading waterfall streams falling into lower basin
    this.fountainCascades = this.scene.add
      .sprite(fx, fy - 36, 'fountain:cascades:0')
      .setOrigin(0.5, 0.5)
      .setDepth(fy + 11)
      .setScale(1.05)
      .play('anim:fountain:cascades');
  }

  /**
   * Creates animated wavy scalloped fringe for Com Ga 68 awning.
   * Com Ga 68: x = 11 * 32 = 352, y = 16 * 32 = 512
   */
  private setupAwningFringe() {
    const comGaX = 352;
    const comGaY = 512;
    const awnW = 160;
    const awnBottomY = comGaY + 74; // bottom edge of awning

    const g = this.scene.add.graphics();
    g.setDepth(comGaY + 160 + 8);
    this.awningFringe = g;

    // Draw initial wavy fringe
    this.drawAwningFringe(comGaX, awnBottomY, awnW, 0);
  }

  private drawAwningFringe(x: number, y: number, w: number, offset: number) {
    if (!this.awningFringe) return;
    this.awningFringe.clear();

    const scallopW = 10;
    for (let bx = 0; bx < w; bx += scallopW) {
      const isYellow = Math.floor(bx / scallopW) % 2 === 0;
      const sway = Math.sin(offset + (bx / w) * Math.PI * 4) * 1.5;

      this.awningFringe.fillStyle(isYellow ? 0xfacc15 : 0xdc2626, 0.95);
      this.awningFringe.fillRect(x + bx + sway, y, scallopW, 3);

      this.awningFringe.fillStyle(0xffffff, 0.9);
      this.awningFringe.fillRect(x + bx + 3 + sway, y + 2, 4, 2);
    }
  }

  /**
   * Environmental wind particles: Bougainvillea red petals and golden leaves.
   */
  private setupPetalParticles() {
    if (useUi.getState().reducedMotion) return;

    this.particleTimer = this.scene.time.addEvent({
      delay: 750,
      loop: true,
      callback: () => {
        if (!this.scene.sys || !this.scene.scene.isActive()) return;
        const weather = useUi.getState().weather;
        const windKmh = weather.windSpeedKmh;

        // Higher wind -> spawn more particles
        const spawnCount = windKmh > 30 ? 3 : windKmh > 15 ? 2 : 1;

        for (let i = 0; i < spawnCount; i++) {
          this.spawnWindPetal(windKmh);
        }
      },
    });
  }

  private spawnWindPetal(windKmh: number) {
    const isLeaf = Math.random() < 0.25;
    const isMagenta = Math.random() < 0.35;
    const tex = isLeaf ? 'particle:leaf:gold' : isMagenta ? 'particle:petal:magenta' : 'particle:petal:red';

    const cam = this.scene.cameras.main;
    const startX = cam.worldView.x - 20 + Math.random() * (cam.worldView.width * 0.7);
    const startY = cam.worldView.y + Math.random() * cam.worldView.height;

    const p = this.scene.add
      .image(startX, startY, tex)
      .setOrigin(0.5, 0.5)
      .setScale(0.8 + Math.random() * 0.4)
      .setAlpha(0.85)
      .setDepth(3000);

    const speedMultiplier = Math.max(0.6, windKmh / 15);
    const duration = (2600 + Math.random() * 1400) / speedMultiplier;
    const driftX = (180 + Math.random() * 160) * speedMultiplier;
    const driftY = 40 + Math.random() * 80;

    this.scene.tweens.add({
      targets: p,
      x: startX + driftX,
      y: startY + driftY,
      angle: 180 + Math.random() * 360,
      alpha: 0,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => p.destroy(),
    });
  }

  update(time: number, _delta: number) {
    const ui = useUi.getState();
    const weather = ui.weather;
    const reducedMotion = ui.reducedMotion;

    const windKmh = weather.windSpeedKmh;
    const gustTriggered = weather.windGustTriggeredAt ?? 0;

    // Check if admin triggered a sudden wind gust
    let gustBoost = 0;
    if (gustTriggered > this.lastGustTriggerAt) {
      this.lastGustTriggerAt = gustTriggered;
    }
    const elapsedSinceGust = Date.now() - this.lastGustTriggerAt;
    if (elapsedSinceGust < 5000) {
      gustBoost = (1 - elapsedSinceGust / 5000) * 2.2;
    }

    // Natural oscillating gust wave
    const naturalGust = 1.0 + Math.sin(time * 0.001) * 0.25 + gustBoost;

    // 1. Update Trees
    // Root stays completely anchored at (0.5, 1.0); calm weather is peaceful (max 0.35 deg).
    // Strong sway ONLY occurs during thunderstorm, heavy rain, or storm gusts (>26 km/h).
    if (!reducedMotion) {
      const isStormOrRain =
        weather.condition === 'thunderstorm' ||
        weather.condition === 'heavy_rain' ||
        weather.condition === 'rain';
      const isHighWind = windKmh > 26 || gustBoost > 0;

      let maxAngle = 0.3; // Default calm weather: resting/breathing
      if (isStormOrRain || isHighWind) {
        maxAngle = Math.min(2.4, 0.4 + (windKmh / 22) * 1.0 * naturalGust);
      }

      for (const t of this.trees) {
        const sway = Math.sin(time * 0.0018 + t.phase) * maxAngle * t.flexibility;
        t.image.angle = sway;
      }
    }

    // 2. Update Fluttering Flags (Frame rate & angle sway proportional to wind speed)
    const flagFps = Math.min(20, Math.max(6, Math.round(windKmh * 0.65 * naturalGust)));
    for (const f of this.flags) {
      const anim = f.sprite.anims.currentAnim;
      if (anim) {
        f.sprite.anims.timeScale = flagFps / 10;
      }
      // Flag lift tilt in strong wind
      const lift = Math.min(6, (windKmh / 24) * 3 * naturalGust);
      f.sprite.angle = f.baseAngle + (Math.sin(time * 0.004) * 1.5 - lift);
    }

    // 3. Update Swaying Apartment Curtains (Top anchored, bottom hem flutters)
    if (!reducedMotion) {
      for (const c of this.curtains) {
        const sway = Math.sin(time * 0.0025 + c.phase) * (1.2 + windKmh * 0.04);
        c.image.x = c.baseX + sway;
        c.image.angle = sway * 1.0;
      }
    }

    // 4. Update Com Ga 68 Awning Fringe
    if (!reducedMotion && this.awningFringe) {
      const comGaX = 11 * TILE;
      const awnBottomY = 16 * TILE + 74;
      this.drawAwningFringe(comGaX, awnBottomY, 160, time * 0.0035);
    }

    // 5. Update Spinning Pinwheels on Vendor Carts (Rotates continuously in front of carts)
    if (!reducedMotion && this.pinwheels.length > 0) {
      const dtScale = _delta / 16.6;
      const spinSpeed = (windKmh * 0.45 + 3.0) * dtScale;
      for (const p of this.pinwheels) {
        p.sprite.angle += spinSpeed * p.baseSpeed;
      }
    }
  }

  cleanup() {
    this.particleTimer?.destroy();
    this.particleTimer = null;
    this.awningFringe?.destroy();
    this.awningFringe = null;
    this.flags.forEach((f) => f.sprite.destroy());
    this.flags = [];
    this.curtains.forEach((c) => c.image.destroy());
    this.curtains = [];
    this.pinwheels.forEach((p) => p.sprite.destroy());
    this.pinwheels = [];
    this.pinwheelSticks.forEach((s) => s.destroy());
    this.pinwheelSticks = [];
    this.fountainSpout?.destroy();
    this.fountainSpout = null;
    this.fountainCascades?.destroy();
    this.fountainCascades = null;
    this.trees = [];
  }
}
