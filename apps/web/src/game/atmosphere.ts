import { BUILDINGS, MAP_HEIGHT, MAP_WIDTH, TILE, TOWN_LAMPS, TOWN_PROPS } from '@cozy/game-data';
import Phaser from 'phaser';
import { BUILDING_ROOF } from '../art/town';
import { useUi } from '../lib/store';
import { calculateBienHoaLighting } from './weather-engine';

export { calculateBienHoaLighting };

/**
 * 2026 HD-2D Atmospheric & Day/Night Rendering System
 * Implements:
 * 1. 24-Hour dynamic ambient daylight/dusk/night color grading tailored to Bien Hoa
 * 2. Weather overcast modulation (clouds, drizzle, torrential rain, storm)
 * 3. Volumetric additive point-light bloom with automatic day/night dimming
 * 4. Environmental micro-particles (fireflies, chimney smoke puffs, ripples, footsteps)
 */

interface LightingRefs {
  ambientOverlay: Phaser.GameObjects.Image;
  lampGlows: Phaser.GameObjects.Image[];
  lampPuddles: Phaser.GameObjects.Image[];
  lanternGlows: Phaser.GameObjects.Image[];
  kioskGlow: Phaser.GameObjects.Image | null;
  fountainGlow: Phaser.GameObjects.Image | null;
}

let activeLighting: LightingRefs | null = null;

/**
 * Creates dynamic ambient darkness mask with illuminated light cutouts:
 * Streetlamps, building lanterns, and kiosks carve holes directly through the dark overlay!
 * This reveals the road pavement, curbs, and avatars underneath in clear daylight sharpness,
 * preventing streetlights from looking like a flat blurry color tint!
 */
export function ensureDarknessMaskTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('atmosphere:darkness_mask')) return;

  const canvas = document.createElement('canvas');
  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 1. Fill base night darkness mask (100% solid, will be tinted by ambient color & alpha in Phaser)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // 2. Carve out illumination holes directly through the darkness mask
  ctx.globalCompositeOperation = 'destination-out';

  // 2.1 Cut out downward light cones & road pavement pools for all 8 streetlamps
  TOWN_LAMPS.forEach(({ x: tx, y: ty }) => {
    const lx = tx * TILE;
    const ly = ty * TILE - 54;
    const groundY = ty * TILE - 4;

    // Downward conical light beam cutout
    const beam = ctx.createLinearGradient(lx, ly, lx, groundY);
    beam.addColorStop(0, 'rgba(0, 0, 0, 0.40)');
    beam.addColorStop(0.3, 'rgba(0, 0, 0, 0.70)');
    beam.addColorStop(1, 'rgba(0, 0, 0, 0.94)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(lx - 9, ly);
    ctx.lineTo(lx + 9, ly);
    ctx.lineTo(lx + 34, groundY + 12);
    ctx.lineTo(lx - 34, groundY + 12);
    ctx.closePath();
    ctx.fill();

    // Broad illuminated ground light pool cutout directly on road pavement (reveals road & players!)
    const pool = ctx.createRadialGradient(lx, groundY, 0, lx, groundY, 48);
    pool.addColorStop(0, 'rgba(0, 0, 0, 0.96)');
    pool.addColorStop(0.35, 'rgba(0, 0, 0, 0.88)');
    pool.addColorStop(0.75, 'rgba(0, 0, 0, 0.45)');
    pool.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(lx, groundY, 44, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2.2 Cut out building door carriage lanterns
  BUILDINGS.forEach((b) => {
    const doorMid = (b.door.x + b.door.w / 2) * TILE;
    const doorY = b.rect.y + b.rect.h - 18;
    const pool = ctx.createRadialGradient(doorMid, doorY, 0, doorMid, doorY, 36);
    pool.addColorStop(0, 'rgba(0, 0, 0, 0.90)');
    pool.addColorStop(0.55, 'rgba(0, 0, 0, 0.50)');
    pool.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(doorMid, doorY, 36, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2.3 Cut out AI Kiosk neon glow
  const kioskProp = TOWN_PROPS.find((p) => p.kind === 'kiosk');
  const kioskX = (kioskProp?.x ?? 20) * TILE;
  const kioskY = (kioskProp?.y ?? 16) * TILE - 42;
  const kioskCut = ctx.createRadialGradient(kioskX, kioskY, 0, kioskX, kioskY, 46);
  kioskCut.addColorStop(0, 'rgba(0, 0, 0, 0.90)');
  kioskCut.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
  kioskCut.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = kioskCut;
  ctx.beginPath();
  ctx.arc(kioskX, kioskY, 46, 0, Math.PI * 2);
  ctx.fill();

  // 2.4 Cut out Fountain water shimmer pool
  const fountainX = 24 * TILE;
  const fountainY = 17 * TILE - 24;
  const fountainCut = ctx.createRadialGradient(fountainX, fountainY, 0, fountainX, fountainY, 58);
  fountainCut.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  fountainCut.addColorStop(0.7, 'rgba(0, 0, 0, 0.35)');
  fountainCut.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fountainCut;
  ctx.beginPath();
  ctx.arc(fountainX, fountainY, 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
  scene.textures.addCanvas('atmosphere:darkness_mask', canvas);
}

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
  // 1. Streetlamp luminous filament & glass lantern (Crisp 28px pixel-art glowing bulb)
  if (!scene.textures.exists('glow:streetlamp')) {
    const c = document.createElement('canvas');
    c.width = 28;
    c.height = 28;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Outer soft golden rim (24x24)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.beginPath();
    ctx.arc(14, 14, 13, 0, Math.PI * 2);
    ctx.fill();

    // Warm amber lantern glass (18x18)
    ctx.fillStyle = 'rgba(250, 204, 21, 0.75)';
    ctx.beginPath();
    ctx.arc(14, 14, 9, 0, Math.PI * 2);
    ctx.fill();

    // Brilliant sunny yellow mantle (10x10)
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(14, 14, 5, 0, Math.PI * 2);
    ctx.fill();

    // Pure white incandescent core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 12, 4, 4);

    scene.textures.addCanvas('glow:streetlamp', c);
  }

  // 1.1 Streetlamp downward light cone & pavement illumination pool (Crisp, non-blurry)
  if (!scene.textures.exists('glow:streetlamp_puddle')) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 70;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Downward trapezoidal light beam from lantern fixture to ground
    const beamGrad = ctx.createLinearGradient(32, 0, 32, 52);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
    beamGrad.addColorStop(0.3, 'rgba(250, 204, 21, 0.30)');
    beamGrad.addColorStop(1, 'rgba(245, 158, 11, 0.10)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(27, 0);
    ctx.lineTo(37, 0);
    ctx.lineTo(58, 52);
    ctx.lineTo(6, 52);
    ctx.closePath();
    ctx.fill();

    // Crisp illuminated oval pool directly on the road pavement
    const poolGrad = ctx.createRadialGradient(32, 52, 0, 32, 52, 28);
    poolGrad.addColorStop(0, 'rgba(254, 240, 138, 0.70)');
    poolGrad.addColorStop(0.4, 'rgba(250, 204, 21, 0.40)');
    poolGrad.addColorStop(0.8, 'rgba(245, 158, 11, 0.15)');
    poolGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.ellipse(32, 52, 28, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas('glow:streetlamp_puddle', c);
  }

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
  ensureDarknessMaskTexture(scene);
  const reducedMotion = useUi.getState().reducedMotion;

  // 0. Ambient Day/Night & Weather Color Filter Overlay with True Streetlight Cutouts
  // Uses dynamic darkness mask with holes carved out at all lamps, kiosks & entrances!
  const ambientOverlay = scene.add
    .image(0, 0, 'atmosphere:darkness_mask')
    .setOrigin(0, 0)
    .setDepth(2600)
    .setAlpha(0);

  const lampGlows: Phaser.GameObjects.Image[] = [];
  const lampPuddles: Phaser.GameObjects.Image[] = [];
  const lanternGlows: Phaser.GameObjects.Image[] = [];

  // 1. Streetlamp Halos & Ground Puddles (6 lamps)
  TOWN_LAMPS.forEach(({ x: tx, y: ty }) => {
    const lx = tx * TILE;
    const ly = ty * TILE - 54;

    // Overhead warm radiant lantern bloom
    const glow = scene.add
      .image(lx, ly, 'glow:streetlamp')
      .setOrigin(0.5, 0.5)
      .setDepth(ty! * TILE + 20)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.8);

    lampGlows.push(glow);

    // Downward golden light cone casting from lamp fixture onto road surface
    const puddle = scene.add
      .image(lx, ly + 2, 'glow:streetlamp_puddle')
      .setOrigin(0.5, 0)
      .setDepth(-3) // Just above ground tiles, below players and props
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.75);

    lampPuddles.push(puddle);

    if (!reducedMotion) {
      const dur = 1600 + Math.random() * 800;
      scene.tweens.add({
        targets: glow,
        scale: { from: 0.96, to: 1.05 },
        duration: dur,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 600,
      });
      scene.tweens.add({
        targets: puddle,
        scaleX: { from: 0.95, to: 1.05 },
        scaleY: { from: 0.95, to: 1.05 },
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
      .setAlpha(0.4);

    lanternGlows.push(glow);

    if (!reducedMotion) {
      scene.tweens.add({
        targets: glow,
        duration: 1800 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 500,
      });
    }
  });

  // 3. AI Kiosk Neon Hologram Glow
  const kioskProp = TOWN_PROPS.find((p) => p.kind === 'kiosk');
  const kioskX = (kioskProp?.x ?? 20) * TILE;
  const kioskY = (kioskProp?.y ?? 16) * TILE - 42;
  const kioskGlow = scene.add
    .image(kioskX, kioskY, 'glow:kiosk')
    .setOrigin(0.5, 0.5)
    .setDepth((kioskProp?.y ?? 16) * TILE + 20)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0.82);

  if (!reducedMotion) {
    scene.tweens.add({
      targets: kioskGlow,
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
      scale: { from: 0.96, to: 1.06 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  activeLighting = {
    ambientOverlay,
    lampGlows,
    lampPuddles,
    lanternGlows,
    kioskGlow,
    fountainGlow,
  };
}

/**
 * Updates dynamic ambient lighting filter and streetlamp intensity each frame.
 */
export function updateAtmosphere(_scene: Phaser.Scene, _time: number, _delta: number) {
  if (!activeLighting) return;
  const weather = useUi.getState().weather;
  const target = calculateBienHoaLighting(weather.solarHour, weather);

  // Smoothly blend ambient filter alpha and color
  activeLighting.ambientOverlay.setTint(target.color);
  activeLighting.ambientOverlay.alpha = Phaser.Math.Linear(
    activeLighting.ambientOverlay.alpha,
    target.alpha,
    0.05,
  );

  // Modulate streetlamp halos based on ambient night darkness (bright warm golden bloom)
  const lampAlpha = 0.82 * target.lampBrightness;
  for (const lamp of activeLighting.lampGlows) {
    lamp.alpha = lampAlpha;
  }

  // Modulate warm pavement light pool on road tiles
  const puddleAlpha = 0.72 * target.lampBrightness;
  for (const puddle of activeLighting.lampPuddles) {
    puddle.alpha = puddleAlpha;
  }

  // Modulate carriage lanterns beside doors
  const lanternAlpha = 0.45 * target.lampBrightness;
  for (const lantern of activeLighting.lanternGlows) {
    lantern.alpha = lanternAlpha;
  }

  // CyberNet and Fountain bloom slightly boost in darkness
  if (activeLighting.kioskGlow) {
    activeLighting.kioskGlow.alpha = 0.55 + 0.35 * target.lampBrightness;
  }
  if (activeLighting.fountainGlow) {
    activeLighting.fountainGlow.alpha = 0.5 + 0.32 * target.lampBrightness;
  }
}

export function cleanupAtmosphere() {
  activeLighting = null;
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
  const FIREFLY_COUNT = 12;
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

/**
 * Spawns a soft water wake ripple / foam bubble behind a moving boat.
 */
const wakePools = new WeakMap<Phaser.Scene, Phaser.GameObjects.Graphics[]>();

export function spawnWaterWake(scene: Phaser.Scene, x: number, y: number, dir = 0) {
  if (!scene.sys || !scene.sys.displayList || !scene.scene.isActive()) return;
  let pool = wakePools.get(scene);
  if (!pool) {
    pool = [];
    wakePools.set(scene, pool);
    scene.events.once('shutdown', () => wakePools.delete(scene));
  }
  let wake = pool.find((item) => !item.active);
  if (!wake) {
    if (pool.length >= 96) return;
    wake = scene.add.graphics();
    pool.push(wake);
  }
  const dx = dir === 1 ? -1 : dir === 2 ? 1 : 0;
  const dy = dir === 0 ? 1 : dir === 3 ? -1 : 0;
  wake.clear().lineStyle(1.5, 0xcce7de, 0.48);
  wake.beginPath().moveTo(-10, -7).lineTo(-5, 0).lineTo(5, 0).lineTo(10, -7).strokePath();
  wake.setActive(true).setVisible(true).setAlpha(1).setScale(1);
  wake
    .setPosition(x - dx * 20, y - dy * 20 + 4)
    .setRotation(Math.atan2(-dx, dy))
    .setDepth(y - 2);
  const ripple = wake;

  scene.tweens.add({
    targets: wake,
    x: wake.x - dx * 18,
    y: wake.y - dy * 18 + 6,
    scaleX: 2.5,
    scaleY: 1.8,
    alpha: 0,
    duration: 1100,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      ripple.setActive(false).setVisible(false);
    },
  });
}
