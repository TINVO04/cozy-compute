import { BUILDINGS, MAP_HEIGHT, MAP_WIDTH, TILE } from '@cozy/game-data';
import Phaser from 'phaser';
import { BUILDING_ROOF } from '../art/town';
import { useUi } from '../lib/store';

/**
 * 2026 HD-2D Atmospheric Rendering System
 * Implements:
 * 1. Volumetric additive point-light bloom (warm streetlamps, cozy lanterns, cyan kiosk, azure fountain)
 * 2. Environmental micro-particles (gentle drifting fireflies/golden pollen, rising chimney smoke puffs)
 * 3. Dynamic water ripples around aquatic bodies
 * 4. Micro-dust puffs on character footsteps
 */

function createRadialTexture(scene: Phaser.Scene, key: string, radius: number, stops: [number, string][]) {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = radius * 2;
  canvas.height = radius * 2;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  for (const [stop, color] of stops) {
    grad.addColorStop(stop, color);
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, Math.PI * 2);
  ctx.fill();
  scene.textures.addCanvas(key, canvas);
}

export function ensureAtmosphereTextures(scene: Phaser.Scene) {
  // 1. Streetlamp warm golden bloom
  createRadialTexture(scene, 'glow:streetlamp', 54, [
    [0.0, 'rgba(255, 222, 130, 0.45)'],
    [0.25, 'rgba(255, 195, 80, 0.28)'],
    [0.55, 'rgba(255, 160, 50, 0.12)'],
    [1.0, 'rgba(255, 140, 30, 0)'],
  ]);

  // 2. Building carriage lantern amber glow
  createRadialTexture(scene, 'glow:lantern', 34, [
    [0.0, 'rgba(255, 215, 110, 0.50)'],
    [0.35, 'rgba(255, 175, 60, 0.24)'],
    [0.7, 'rgba(255, 140, 40, 0.08)'],
    [1.0, 'rgba(255, 120, 30, 0)'],
  ]);

  // 3. AI Kiosk neon cybernetic cyan glow
  createRadialTexture(scene, 'glow:kiosk', 48, [
    [0.0, 'rgba(80, 240, 255, 0.42)'],
    [0.35, 'rgba(30, 190, 240, 0.20)'],
    [0.7, 'rgba(10, 130, 210, 0.07)'],
    [1.0, 'rgba(5, 80, 160, 0)'],
  ]);

  // 4. Fountain crystalline water shimmer glow
  createRadialTexture(scene, 'glow:fountain', 64, [
    [0.0, 'rgba(140, 235, 255, 0.32)'],
    [0.4, 'rgba(80, 190, 240, 0.16)'],
    [0.75, 'rgba(40, 150, 210, 0.05)'],
    [1.0, 'rgba(20, 100, 180, 0)'],
  ]);

  // 5. Chimney smoke puff
  if (!scene.textures.exists('particle:smoke')) {
    const c = document.createElement('canvas');
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(12, 12, 0, 12, 12, 11);
    grad.addColorStop(0, 'rgba(240, 236, 230, 0.65)');
    grad.addColorStop(0.5, 'rgba(215, 210, 205, 0.35)');
    grad.addColorStop(1, 'rgba(190, 185, 180, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(12, 12, 11, 0, Math.PI * 2);
    ctx.fill();
    scene.textures.addCanvas('particle:smoke', c);
  }

  // 6. Walking footstep dust puff
  if (!scene.textures.exists('particle:dust')) {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 8;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(4, 4, 0, 4, 4, 3.5);
    grad.addColorStop(0, 'rgba(195, 180, 160, 0.55)');
    grad.addColorStop(0.7, 'rgba(175, 160, 140, 0.25)');
    grad.addColorStop(1, 'rgba(160, 145, 125, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(4, 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    scene.textures.addCanvas('particle:dust', c);
  }

  // 7. Ambient golden firefly / pollen spore
  if (!scene.textures.exists('particle:firefly')) {
    const c = document.createElement('canvas');
    c.width = 10;
    c.height = 10;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(5, 5, 0, 5, 5, 4.5);
    grad.addColorStop(0, 'rgba(255, 255, 230, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 220, 100, 0.65)');
    grad.addColorStop(0.8, 'rgba(255, 180, 50, 0.20)');
    grad.addColorStop(1, 'rgba(255, 160, 20, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(5, 5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    scene.textures.addCanvas('particle:firefly', c);
  }

  // 8. Water expanding ripple ring
  if (!scene.textures.exists('particle:ripple')) {
    const c = document.createElement('canvas');
    c.width = 36;
    c.height = 20;
    const ctx = c.getContext('2d')!;
    ctx.strokeStyle = 'rgba(200, 240, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(18, 10, 15, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    scene.textures.addCanvas('particle:ripple', c);
  }

  // 9. Indoor warm lamp glow (for apartments)
  createRadialTexture(scene, 'glow:indoor', 50, [
    [0.0, 'rgba(255, 235, 175, 0.45)'],
    [0.35, 'rgba(255, 200, 120, 0.22)'],
    [0.7, 'rgba(255, 170, 80, 0.08)'],
    [1.0, 'rgba(255, 140, 40, 0)'],
  ]);
}

/**
 * Sets up the dynamic HD-2D lighting layers in TownScene:
 * - Streetlamps with warm breathing halos
 * - Building entrance carriage lanterns
 * - Cybernetic glow on AI Kiosk
 * - Crystalline water shimmer on Plaza Fountain
 */
export function setupTownLighting(scene: Phaser.Scene) {
  ensureAtmosphereTextures(scene);
  const reducedMotion = useUi.getState().reducedMotion;

  // 1. Streetlamp Halos (6 lamps)
  const lampPositions = [
    [12, 10],
    [23, 10],
    [33, 10],
    [17, 19],
    [31, 19],
    [9, 21],
  ];

  lampPositions.forEach(([tx, ty]) => {
    const lx = tx! * TILE;
    const ly = ty! * TILE - 54; // Lamp lantern center
    const glow = scene.add
      .image(lx, ly, 'glow:streetlamp')
      .setOrigin(0.5, 0.5)
      .setDepth(ty! * TILE + 20)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.85);

    if (!reducedMotion) {
      const dur = 1600 + Math.random() * 800;
      scene.tweens.add({
        targets: glow,
        alpha: { from: 0.72, to: 0.98 },
        scale: { from: 0.96, to: 1.05 },
        duration: dur,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 600,
      });
    }
  });

  // 2. Building Carriage Lanterns beside doors
  BUILDINGS.forEach((b) => {
    const doorMid = (b.door.x + b.door.w / 2) * TILE;
    const doorY = b.rect.y + b.rect.h - 18;
    const glow = scene.add
      .image(doorMid, doorY, 'glow:lantern')
      .setOrigin(0.5, 0.5)
      .setDepth(b.rect.y + b.rect.h + 2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.78);

    if (!reducedMotion) {
      scene.tweens.add({
        targets: glow,
        alpha: { from: 0.65, to: 0.88 },
        duration: 1800 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 500,
      });
    }
  });

  // 3. AI Kiosk Neon Hologram Glow
  const kioskX = 14 * TILE;
  const kioskY = 24 * TILE - 42;
  const kioskGlow = scene.add
    .image(kioskX, kioskY, 'glow:kiosk')
    .setOrigin(0.5, 0.5)
    .setDepth(24 * TILE + 20)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0.82);

  if (!reducedMotion) {
    scene.tweens.add({
      targets: kioskGlow,
      alpha: { from: 0.65, to: 0.95 },
      scale: { from: 0.95, to: 1.08 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // 4. Central Fountain Crystalline Shimmer Glow
  const fountainX = 24 * TILE;
  const fountainY = 17 * TILE - 24;
  const fountainGlow = scene.add
    .image(fountainX, fountainY, 'glow:fountain')
    .setOrigin(0.5, 0.5)
    .setDepth(17 * TILE + 10)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0.68);

  if (!reducedMotion) {
    scene.tweens.add({
      targets: fountainGlow,
      alpha: { from: 0.55, to: 0.82 },
      scale: { from: 0.96, to: 1.06 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}

/**
 * Sets up living environmental micro-particles:
 * - Chimney smoke puffs rising from cottages
 * - Golden pollen / fireflies floating gently in the breeze
 * - Concentric water ripples around the pier and fountain
 */
export function setupTownParticles(scene: Phaser.Scene) {
  ensureAtmosphereTextures(scene);
  const reducedMotion = useUi.getState().reducedMotion;
  if (reducedMotion) return;

  // 1. Chimney Smoke Emitters for each building
  BUILDINGS.forEach((b) => {
    const chimX = b.rect.x + b.rect.w - 14;
    const chimY = b.rect.y - BUILDING_ROOF + 2;
    const depth = b.rect.y + b.rect.h + 10;

    const spawnPuff = () => {
      if (!scene.sys || !scene.sys.displayList || !scene.scene.isActive()) return;
      const puff = scene.add
        .image(chimX + (Math.random() * 4 - 2), chimY, 'particle:smoke')
        .setOrigin(0.5, 0.5)
        .setScale(0.5)
        .setAlpha(0.48)
        .setDepth(depth);

      scene.tweens.add({
        targets: puff,
        y: chimY - 32 - Math.random() * 12,
        x: chimX + 8 + Math.random() * 10,
        scale: 1.35 + Math.random() * 0.3,
        alpha: 0,
        duration: 2400 + Math.random() * 400,
        ease: 'Quad.easeOut',
        onComplete: () => puff.destroy(),
      });
    };

    // Staggered interval per building chimney
    scene.time.addEvent({
      delay: 1500 + Math.random() * 800,
      loop: true,
      callback: spawnPuff,
    });
  });

  // 2. Ambient Floating Golden Fireflies / Pollen
  const FIREFLY_COUNT = 22;
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    const startX = Math.random() * (MAP_WIDTH - 200) + 100;
    const startY = Math.random() * (MAP_HEIGHT - 180) + 90;
    const firefly = scene.add
      .image(startX, startY, 'particle:firefly')
      .setOrigin(0.5, 0.5)
      .setScale(0.7 + Math.random() * 0.5)
      .setAlpha(0.25 + Math.random() * 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3000); // float above players and props

    const driftDuration = 4000 + Math.random() * 3000;
    const targetX = startX + (Math.random() * 60 - 30);
    const targetY = startY + (Math.random() * 40 - 20);

    scene.tweens.add({
      targets: firefly,
      x: targetX,
      y: targetY,
      alpha: { from: 0.2, to: 0.85 },
      duration: driftDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 2000,
    });
  }

  // 3. Water Ripple Wavelets (around fountain and pier)
  const ripplePoints = [
    { x: 24 * TILE, y: 17 * TILE - 20 },
    { x: 24 * TILE - 14, y: 17 * TILE - 16 },
    { x: 24 * TILE + 14, y: 17 * TILE - 16 },
    { x: 38 * TILE, y: 22 * TILE },
    { x: 42 * TILE, y: 24 * TILE },
    { x: 44 * TILE, y: 28 * TILE },
  ];

  ripplePoints.forEach((pt, idx) => {
    scene.time.addEvent({
      delay: 2400 + idx * 700,
      loop: true,
      callback: () => {
        if (!scene.sys || !scene.sys.displayList || !scene.scene.isActive()) return;
        const ripple = scene.add
          .image(pt.x + (Math.random() * 12 - 6), pt.y + (Math.random() * 8 - 4), 'particle:ripple')
          .setOrigin(0.5, 0.5)
          .setScale(0.35)
          .setAlpha(0.65)
          .setDepth(-8);

        scene.tweens.add({
          targets: ripple,
          scaleX: 1.25,
          scaleY: 1.1,
          alpha: 0,
          duration: 1800,
          ease: 'Cubic.easeOut',
          onComplete: () => ripple.destroy(),
        });
      },
    });
  });
}

/**
 * Spawns a soft footstep dust puff when a player moves.
 */
export function spawnFootstepDust(scene: Phaser.Scene, x: number, y: number) {
  if (!scene.sys || !scene.sys.displayList || !scene.scene.isActive()) return;
  ensureAtmosphereTextures(scene);
  const dust = scene.add
    .image(x + (Math.random() * 6 - 3), y + 1, 'particle:dust')
    .setOrigin(0.5, 0.5)
    .setScale(0.6)
    .setAlpha(0.5)
    .setDepth(y - 1);

  scene.tweens.add({
    targets: dust,
    y: y - 4,
    scale: 1.2,
    alpha: 0,
    duration: 260,
    ease: 'Quad.easeOut',
    onComplete: () => dust.destroy(),
  });
}
