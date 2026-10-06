import {
  DEFAULT_APPEARANCE,
  drivingSpeed,
  vehicleById,
  PLAYER_SPEED,
  normalizeBoatId,
  type Appearance,
  type MoveInput,
  type Rect,
} from '@cozy/game-data';
import { getStateCallbacks, type Room } from 'colyseus.js';
import type Phaser from 'phaser';
import { AVATAR_FEET_OFFSET, ensureAvatarTexture } from './avatars';
import { spawnFootstepDust, spawnWaterWake } from './atmosphere';
import { ensureVehicleTexture } from '../art/vehicle';
import { ensureBoatTexture } from '../art/boat';
import { useUi } from '../lib/store';
import { fishRenderDimensions, getSpeciesData } from '../art/fish';
import { ensureFishTexture } from './fish-texture';
import { MovementPrediction, smoothMovement } from './movement-prediction';
import { MovementInterpolation } from './movement-interpolation';
import { boatPose } from './river-motion';
import { VehicleLights } from './vehicle-lights';

interface PlayerSnapshot {
  userId: string;
  name: string;
  status: string;
  appearance: string;
  vehicle: string;
  x: number;
  y: number;
  dir: number;
  moving: boolean;
  seq: number;
  inputElapsedMs: number;
  speed?: number;
  emote: string;
  connected: boolean;
  inEvent: boolean;
}

type Callbacks = {
  onChange: (cb: () => void) => () => void;
  listen: (prop: string, cb: (v: unknown) => void) => () => void;
};

const EMOTE_ICON: Record<string, string> = {
  wave: '👋',
  laugh: '😂',
  heart: '❤️',
  shock: '😱',
  dance: '💃',
  sleep: '💤',
  angry: '💢',
  thumbs: '👍',
};

export class Avatar {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text | null = null;
  bubble: Phaser.GameObjects.Container | null = null;
  bubbleTimer: Phaser.Time.TimerEvent | null = null;
  emote: Phaser.GameObjects.Text | null = null;
  texKey = '';
  target = { x: 0, y: 0 };
  dir = 0;
  moving = false;
  appearance: Appearance;
  baseSpriteY = 0;
  breathSeed = 0;
  dustTimer = 0;
  heldFishContainer: Phaser.GameObjects.Container | null = null;
  heldFishSprite: Phaser.GameObjects.Image | null = null;
  heldFishBaseY = 0;
  heldFishKey: string | null = null;
  heldFishTweens: Phaser.Tweens.Tween[] = [];
  facingDependentEffects: { obj: { x: number }; baseRelX: number }[] = [];
  rodGlowContainer: Phaser.GameObjects.Container | null = null;
  rodTweens: Phaser.Tweens.Tween[] = [];
  boatSprite: Phaser.GameObjects.Image | null = null;
  interpolation = new MovementInterpolation();
  private animationState = '';
  vehicle = '';
  vehicleSprite: Phaser.GameObjects.Image | null = null;
  private ridingTwoWheeler = false;
  private vehicleLights: VehicleLights | null = null;

  constructor(
    private scene: Phaser.Scene,
    public userId: string,
    name: string,
    appearance: Appearance,
    x: number,
    y: number,
    isSelf: boolean,
  ) {
    this.appearance = appearance;
    this.shadow = scene.add.ellipse(0, 0, 22, 8, 0x2a2438, 0.25);
    this.texKey = ensureAvatarTexture(scene, appearance);
    this.baseSpriteY = -AVATAR_FEET_OFFSET / 2 - 3;
    this.breathSeed = Math.random() * 100;
    this.sprite = scene.add.sprite(0, this.baseSpriteY, this.texKey, 0);
    this.label = scene.add
      .text(0, -AVATAR_FEET_OFFSET - 8, name, {
        fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: '600',
        color: isSelf ? '#fff7d6' : '#ffffff',
        backgroundColor: isSelf ? 'rgba(75,63,143,0.92)' : 'rgba(42,36,56,0.72)',
        padding: { x: 5, y: 2 },
        resolution: 2,
      })
      .setOrigin(0.5, 1);
    this.container = scene.add.container(x, y, [this.shadow, this.sprite, this.label]);
    this.container.setSize(28, 56);
    this.container.setDepth(y);
    this.sprite.setInteractive({ useHandCursor: !isSelf, pixelPerfect: false });
    if (!isSelf) this.sprite.on('pointerdown', () => useUi.getState().inspect(userId));
    this.target = { x, y };
    this.updateHeldFish();
    this.updateEquippedRodEffect();
  }

  clearHeldFishEffects() {
    for (const t of this.heldFishTweens) {
      t.stop();
      t.remove();
    }
    this.heldFishTweens = [];
    this.facingDependentEffects = [];
  }

  clearRodEffects() {
    for (const t of this.rodTweens) {
      t.stop();
      t.remove();
    }
    this.rodTweens = [];
    if (this.rodGlowContainer) {
      this.rodGlowContainer.destroy();
      this.rodGlowContainer = null;
    }
  }

  updateHeldFish() {
    const held = this.appearance.heldFish;
    const currentKey = held ? `${held.speciesId}:${held.sizeCm}` : null;
    if (this.heldFishKey === currentKey) return;
    this.heldFishKey = currentKey;

    this.clearHeldFishEffects();

    if (!held) {
      if (this.heldFishContainer) {
        this.heldFishContainer.destroy();
        this.heldFishContainer = null;
        this.heldFishSprite = null;
      }
      this.label.setY(-AVATAR_FEET_OFFSET - 8);
      return;
    }

    const { speciesId, sizeCm } = held;
    const texKey = ensureFishTexture(this.scene, speciesId);
    const { baseWidth, baseHeight } = fishRenderDimensions(speciesId);
    const aspect = baseHeight / baseWidth;

    // Display width: smoothly scaled based on sizeCm so small fish is ~32px and colossal whale is ~128px
    const targetW = Math.max(32, Math.min(128, Math.round(24 + Math.pow(sizeCm, 0.64) * 1.45)));
    const targetH = Math.round(targetW * aspect);

    const isGiant = sizeCm > 120;

    if (!this.heldFishContainer) {
      this.heldFishContainer = this.scene.add.container(0, 0);
      this.container.add(this.heldFishContainer);
    }
    this.heldFishContainer.removeAll(true);

    const sp = getSpeciesData(speciesId);
    const rarity = sp?.rarity ?? 'common';
    const reducedMotion = useUi.getState().reducedMotion;

    // --- 1. BACKDROP AURA (Rendered BEHIND the fish sprite) ---
    if (rarity === 'sovereign' || rarity === 'defiant') {
      const color = rarity === 'sovereign' ? 0x67e8f9 : 0xfb7185;
      const accent = rarity === 'sovereign' ? 0xc4b5fd : 0xfde68a;
      const halo = this.scene.add.graphics();
      halo.lineStyle(2, color, 0.65);
      halo.strokeEllipse(0, 0, targetW * 1.36, targetH * 1.5);
      halo.lineStyle(1, accent, 0.5);
      halo.strokeEllipse(0, 0, targetW * 1.56, targetH * 1.18);
      this.heldFishContainer.add(halo);
      if (!reducedMotion) {
        this.heldFishTweens.push(
          this.scene.tweens.add({
            targets: halo,
            alpha: 0.5,
            yoyo: true,
            repeat: -1,
            duration: 1400,
            ease: 'Sine.easeInOut',
          }),
        );
      }
    } else if (rarity === 'legendary') {
      // Golden Celestial Sunburst Corona
      const aura = this.scene.add.graphics();
      aura.fillStyle(0xd97706, 0.32);
      aura.fillEllipse(0, 0, targetW * 1.6, targetH * 1.7);
      aura.fillStyle(0xf59e0b, 0.48);
      aura.fillEllipse(0, 0, targetW * 1.3, targetH * 1.4);
      aura.fillStyle(0xfde047, 0.62);
      aura.fillEllipse(0, 0, targetW * 1.05, targetH * 1.15);
      this.heldFishContainer.add(aura);

      const sunburst = this.scene.add.graphics();
      const rays = 8;
      const rayLen = Math.max(targetW, targetH) * 0.72;
      sunburst.lineStyle(2, 0xfef08a, 0.65);
      for (let i = 0; i < rays; i++) {
        const ang = (i / rays) * Math.PI * 2;
        sunburst.lineBetween(0, 0, Math.cos(ang) * rayLen, Math.sin(ang) * rayLen * (targetH / targetW));
      }
      this.heldFishContainer.add(sunburst);

      if (!reducedMotion) {
        this.heldFishTweens.push(
          this.scene.tweens.add({
            targets: aura,
            scaleX: 1.12,
            scaleY: 1.12,
            alpha: 0.82,
            yoyo: true,
            repeat: -1,
            duration: 1000,
            ease: 'Sine.easeInOut',
          }),
          this.scene.tweens.add({
            targets: sunburst,
            angle: 360,
            repeat: -1,
            duration: 8000,
            ease: 'Linear',
          }),
        );
      }
    } else if (rarity === 'epic') {
      // Cosmic Nebula Amethyst / Cyan Aura
      const aura = this.scene.add.graphics();
      aura.fillStyle(0x6b21a8, 0.3);
      aura.fillEllipse(0, 0, targetW * 1.5, targetH * 1.6);
      aura.fillStyle(0xa855f7, 0.45);
      aura.fillEllipse(0, 0, targetW * 1.25, targetH * 1.35);
      aura.fillStyle(0xe879f9, 0.55);
      aura.fillEllipse(0, 0, targetW * 1.05, targetH * 1.15);
      this.heldFishContainer.add(aura);

      const ring = this.scene.add.graphics();
      ring.lineStyle(1.8, 0x38bdf8, 0.6);
      ring.strokeEllipse(0, 0, targetW * 1.22, targetH * 1.28);
      this.heldFishContainer.add(ring);

      if (!reducedMotion) {
        this.heldFishTweens.push(
          this.scene.tweens.add({
            targets: aura,
            scaleX: 1.14,
            scaleY: 1.14,
            alpha: 0.8,
            yoyo: true,
            repeat: -1,
            duration: 1100,
            ease: 'Sine.easeInOut',
          }),
          this.scene.tweens.add({
            targets: ring,
            angle: 360,
            repeat: -1,
            duration: 6500,
            ease: 'Linear',
          }),
        );
      }
    } else if (rarity === 'rare') {
      // Shimmering Sapphire Aqua Aura
      const aura = this.scene.add.graphics();
      aura.fillStyle(0x0369a1, 0.28);
      aura.fillEllipse(0, 0, targetW * 1.38, targetH * 1.48);
      aura.fillStyle(0x0284c7, 0.42);
      aura.fillEllipse(0, 0, targetW * 1.15, targetH * 1.25);
      aura.fillStyle(0x38bdf8, 0.55);
      aura.fillEllipse(0, 0, targetW * 0.95, targetH * 1.05);
      this.heldFishContainer.add(aura);

      if (!reducedMotion) {
        this.heldFishTweens.push(
          this.scene.tweens.add({
            targets: aura,
            scaleX: 1.1,
            scaleY: 1.1,
            alpha: 0.72,
            yoyo: true,
            repeat: -1,
            duration: 1200,
            ease: 'Sine.easeInOut',
          }),
        );
      }
    }

    // --- 2. HELD FISH SPRITE ---
    this.heldFishSprite = this.scene.add.image(0, 0, texKey);
    this.heldFishSprite.setDisplaySize(targetW, targetH);
    this.heldFishContainer.add(this.heldFishSprite);

    // --- 3. FOREGROUND PARTICLES & SPARKLING STARS ---
    const addSparkleStar = (relX: number, relY: number, color: number, size: number, delayMs: number) => {
      const spk = this.scene.add.graphics();
      const initialX = this.dir === 1 ? -relX : relX;
      spk.x = initialX;
      spk.y = relY;
      spk.fillStyle(color, 1);
      spk.beginPath();
      spk.moveTo(0, -size);
      spk.lineTo(size * 0.35, -size * 0.35);
      spk.lineTo(size, 0);
      spk.lineTo(size * 0.35, size * 0.35);
      spk.lineTo(0, size);
      spk.lineTo(-size * 0.35, size * 0.35);
      spk.lineTo(-size, 0);
      spk.lineTo(-size * 0.35, -size * 0.35);
      spk.closePath();
      spk.fillPath();
      spk.fillStyle(0xffffff, 0.95);
      spk.fillRect(-0.75, -0.75, 1.5, 1.5);

      this.heldFishContainer!.add(spk);
      this.facingDependentEffects.push({ obj: spk, baseRelX: relX });

      if (!reducedMotion) {
        spk.setScale(0.2);
        spk.setAlpha(0);
        const tw = this.scene.tweens.add({
          targets: spk,
          scaleX: 1.25,
          scaleY: 1.25,
          alpha: 1,
          y: relY - 4,
          yoyo: true,
          repeat: -1,
          duration: 650 + (delayMs % 400),
          delay: delayMs,
          ease: 'Sine.easeInOut',
        });
        this.heldFishTweens.push(tw);
      }
    };

    if (rarity === 'sovereign' || rarity === 'defiant') {
      const color = rarity === 'sovereign' ? 0x67e8f9 : 0xfb7185;
      const count = rarity === 'sovereign' ? 12 : 6;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        addSparkleStar(
          Math.cos(angle) * targetW * 0.53,
          Math.sin(angle) * targetH * 0.57,
          i % 3 === 0 ? 0xffffff : color,
          rarity === 'sovereign' ? 4.5 : 3.5,
          i * 160,
        );
      }
    } else if (rarity === 'legendary') {
      // 10 Golden Starlight Particles
      addSparkleStar(-targetW * 0.4, -targetH * 0.32, 0xfde047, 4.5, 0);
      addSparkleStar(targetW * 0.38, -targetH * 0.3, 0xffffff, 5, 150);
      addSparkleStar(0, -targetH * 0.44, 0xfbbf24, 4.5, 300);
      addSparkleStar(-targetW * 0.22, targetH * 0.32, 0xfef08a, 3.5, 450);
      addSparkleStar(targetW * 0.28, targetH * 0.3, 0xffffff, 4, 600);
      addSparkleStar(targetW * 0.44, 0, 0xfde047, 4, 750);
      addSparkleStar(-targetW * 0.44, 0, 0xfbbf24, 4, 900);
      addSparkleStar(targetW * 0.15, -targetH * 0.36, 0xffffff, 3.5, 1050);
      addSparkleStar(-targetW * 0.15, targetH * 0.36, 0xfef08a, 3.5, 1200);
      addSparkleStar(0, targetH * 0.4, 0xfde047, 4, 1350);
    } else if (rarity === 'epic') {
      // 7 Prismatic Diamond Stars
      addSparkleStar(-targetW * 0.38, -targetH * 0.3, 0xc084fc, 4, 0);
      addSparkleStar(targetW * 0.38, -targetH * 0.28, 0x38bdf8, 4.5, 180);
      addSparkleStar(0, -targetH * 0.42, 0xffffff, 4.5, 360);
      addSparkleStar(targetW * 0.24, targetH * 0.32, 0xe879f9, 3.5, 540);
      addSparkleStar(-targetW * 0.28, targetH * 0.28, 0x38bdf8, 3.5, 720);
      addSparkleStar(targetW * 0.42, 0, 0xf472b6, 3.5, 900);
      addSparkleStar(-targetW * 0.15, -targetH * 0.36, 0xffffff, 3, 1080);
    } else if (rarity === 'rare') {
      // 4 Shimmering Aqua Stars
      addSparkleStar(-targetW * 0.32, -targetH * 0.3, 0x38bdf8, 3.5, 0);
      addSparkleStar(targetW * 0.35, -targetH * 0.25, 0xffffff, 4, 250);
      addSparkleStar(targetW * 0.1, targetH * 0.32, 0x7dd3fc, 3, 500);
      addSparkleStar(-targetW * 0.25, targetH * 0.28, 0x38bdf8, 3.5, 750);
    } else {
      // Fresh water droplets for common/uncommon
      addSparkleStar(-targetW * 0.25, -targetH * 0.2, 0x38bdf8, 2, 0);
      addSparkleStar(targetW * 0.25, targetH * 0.2, 0xffffff, 2, 400);
    }

    // --- 4. SPECIES-SPECIFIC UNIQUE EFFECTS ---
    if (speciesId === 'narwhal') {
      // Cá Kỳ Lân Bắt Sóng Wi-Fi: Expanding concentric Wi-Fi wave pulses from horn!
      const hornBaseX = targetW * 0.44;
      const hornBaseY = -targetH * 0.08;

      for (let w = 0; w < 3; w++) {
        const wave = this.scene.add.graphics();
        const startX = this.dir === 1 ? -hornBaseX : hornBaseX;
        wave.x = startX;
        wave.y = hornBaseY;
        wave.lineStyle(2.5, 0x38bdf8, 0.95);
        wave.strokeCircle(0, 0, 7);
        this.heldFishContainer.add(wave);
        this.facingDependentEffects.push({ obj: wave, baseRelX: hornBaseX });

        if (!reducedMotion) {
          wave.setScale(0.25);
          wave.setAlpha(0.95);
          const tw = this.scene.tweens.add({
            targets: wave,
            scaleX: 2.8,
            scaleY: 2.8,
            alpha: 0,
            repeat: -1,
            duration: 1500,
            delay: w * 480,
            ease: 'Cubic.easeOut',
          });
          this.heldFishTweens.push(tw);
        }
      }

      // Horn tip glowing beacon
      const beacon = this.scene.add.graphics();
      const beaconX = this.dir === 1 ? -hornBaseX : hornBaseX;
      beacon.x = beaconX;
      beacon.y = hornBaseY;
      beacon.fillStyle(0x38bdf8, 0.95);
      beacon.fillCircle(0, 0, 4);
      beacon.fillStyle(0xffffff, 1);
      beacon.fillCircle(0, 0, 2);
      this.heldFishContainer.add(beacon);
      this.facingDependentEffects.push({ obj: beacon, baseRelX: hornBaseX });

      if (!reducedMotion) {
        const beaconTw = this.scene.tweens.add({
          targets: beacon,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0.5,
          yoyo: true,
          repeat: -1,
          duration: 400,
          ease: 'Sine.easeInOut',
        });
        this.heldFishTweens.push(beaconTw);
      }
    } else if (speciesId === 'anglerfish') {
      // Cá Lồng Đèn: Glowing pulsing deep-sea lantern beacon
      const bulbBaseX = targetW * 0.28;
      const bulbBaseY = -targetH * 0.44;

      const lantern = this.scene.add.graphics();
      const lanternX = this.dir === 1 ? -bulbBaseX : bulbBaseX;
      lantern.x = lanternX;
      lantern.y = bulbBaseY;
      lantern.fillStyle(0xfde047, 0.45);
      lantern.fillCircle(0, 0, 10);
      lantern.fillStyle(0xfacc15, 0.85);
      lantern.fillCircle(0, 0, 5);
      lantern.fillStyle(0xffffff, 1);
      lantern.fillCircle(0, 0, 2.5);
      this.heldFishContainer.add(lantern);
      this.facingDependentEffects.push({ obj: lantern, baseRelX: bulbBaseX });

      if (!reducedMotion) {
        const lanternTw = this.scene.tweens.add({
          targets: lantern,
          scaleX: 1.6,
          scaleY: 1.6,
          alpha: 0.6,
          yoyo: true,
          repeat: -1,
          duration: 600,
          ease: 'Sine.easeInOut',
        });
        this.heldFishTweens.push(lanternTw);
      }
    } else if (speciesId === 'electric_catfish' || speciesId === 'electric_eel') {
      // Crackling high-voltage lightning sparks
      const sparks = this.scene.add.graphics();
      sparks.lineStyle(1.5, 0xfef08a, 0.9);
      sparks.lineBetween(-targetW * 0.25, -targetH * 0.2, targetW * 0.2, -targetH * 0.15);
      sparks.lineStyle(1.5, 0x38bdf8, 0.9);
      sparks.lineBetween(-targetW * 0.2, targetH * 0.2, targetW * 0.25, targetH * 0.15);
      this.heldFishContainer.add(sparks);

      if (!reducedMotion) {
        this.heldFishTweens.push(
          this.scene.tweens.add({
            targets: sparks,
            alpha: 0.2,
            yoyo: true,
            repeat: -1,
            duration: 120,
            ease: 'Stepped',
          }),
        );
      }
    } else if (speciesId === 'rubber_duck_leviathan') {
      // Crown jewels sparkles atop giant duck head
      const crownX = targetW * 0.32;
      const crownY = -targetH * 0.42;
      const crownGlow = this.scene.add.graphics();
      const startX = this.dir === 1 ? -crownX : crownX;
      crownGlow.x = startX;
      crownGlow.y = crownY;
      crownGlow.fillStyle(0xf59e0b, 0.85);
      crownGlow.fillCircle(0, 0, 5);
      crownGlow.fillStyle(0xffffff, 1);
      crownGlow.fillCircle(0, 0, 2);
      this.heldFishContainer.add(crownGlow);
      this.facingDependentEffects.push({ obj: crownGlow, baseRelX: crownX });

      if (!reducedMotion) {
        this.heldFishTweens.push(
          this.scene.tweens.add({
            targets: crownGlow,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0.5,
            yoyo: true,
            repeat: -1,
            duration: 500,
            ease: 'Sine.easeInOut',
          }),
        );
      }
    }

    if (isGiant) {
      // Hoisted proudly above the player's head
      this.heldFishBaseY = -AVATAR_FEET_OFFSET - Math.max(12, Math.round(targetH * 0.45)) - 4;
      this.heldFishContainer.setY(this.heldFishBaseY);
      // Place player name neatly above hoisted fish
      const labelY = this.heldFishBaseY - targetH / 2 - 8;
      this.label.setY(labelY);
    } else {
      // Held at chest level in front
      this.heldFishBaseY = -22;
      this.heldFishContainer.setY(this.heldFishBaseY);
      this.label.setY(-AVATAR_FEET_OFFSET - 8);
    }

    this.updateHeldFishFacing();
  }

  updateHeldFishFacing() {
    if (!this.heldFishSprite) return;
    const isFlipped = this.dir === 1;
    this.heldFishSprite.setFlipX(isFlipped);

    for (const fx of this.facingDependentEffects) {
      fx.obj.x = isFlipped ? -fx.baseRelX : fx.baseRelX;
    }

    if (this.heldFishContainer) {
      const isGiant = (this.appearance.heldFish?.sizeCm ?? 0) > 120;
      if (this.dir === 3 && !isGiant) {
        this.container.sendToBack(this.heldFishContainer);
        this.container.sendToBack(this.shadow);
      } else {
        this.container.bringToTop(this.heldFishContainer);
        this.container.bringToTop(this.label);
      }
    }
  }

  updateEquippedRodEffect() {
    this.clearRodEffects();
    const rodId = this.appearance.rod;
    if (!rodId || this.appearance.heldFish || this.appearance.isFishing) return;

    let glowColor: number | null = null;
    if (rodId === 'rod_golden_legend') glowColor = 0xf59e0b;
    else if (rodId === 'rod_abyssal') glowColor = 0x8b5cf6;
    else if (rodId === 'rod_pro_carbon') glowColor = 0xa855f7;
    else if (rodId === 'rod_fiberglass') glowColor = 0x38bdf8;

    if (glowColor === null) return;

    this.rodGlowContainer = this.scene.add.container(0, 0);
    this.container.add(this.rodGlowContainer);

    // Rod tip sparkles on player's back
    const tip = this.scene.add.graphics();
    tip.x = 8;
    tip.y = -AVATAR_FEET_OFFSET + 8;
    tip.fillStyle(glowColor, 0.9);
    tip.fillCircle(0, 0, 3);
    tip.fillStyle(0xffffff, 1);
    tip.fillCircle(0, 0, 1.2);
    this.rodGlowContainer.add(tip);

    if (!useUi.getState().reducedMotion) {
      const tw = this.scene.tweens.add({
        targets: tip,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0.4,
        yoyo: true,
        repeat: -1,
        duration: 700,
        ease: 'Sine.easeInOut',
      });
      this.rodTweens.push(tw);
    }
  }

  setAppearance(a: Appearance) {
    this.appearance = a;
    this.updateHeldFish();
    this.updateEquippedRodEffect();
    const key = ensureAvatarTexture(this.scene, a);
    this.updateHeldFishFacing();
    if (key === this.texKey) return;
    this.texKey = key;
    this.sprite.setTexture(key, this.dir * 3);
    this.updateAnim(true);
  }

  setFacing(d: number) {
    this.animationState = '';
    this.dir = d;
    this.moving = false;
    this.sprite.stop();
    this.sprite.setFrame(d * 3);
    this.updateHeldFishFacing();
  }

  setStatus(text: string) {
    this.status?.destroy();
    this.status = null;
    if (!text) return;
    this.status = this.scene.add
      .text(0, -AVATAR_FEET_OFFSET - 26, text, {
        fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
        fontSize: '10px',
        color: '#2a2438',
        backgroundColor: 'rgba(255,255,255,0.85)',
        padding: { x: 4, y: 1 },
        resolution: 2,
      })
      .setOrigin(0.5, 1);
    this.container.add(this.status);
  }

  say(text: string) {
    this.bubble?.destroy();
    this.bubbleTimer?.remove();
    const t = this.scene.add
      .text(0, 0, text, {
        fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
        fontSize: '12px',
        color: '#2a2438',
        wordWrap: { width: 170 },
        resolution: 2,
        align: 'center',
      })
      .setOrigin(0.5, 1);
    const w = t.width + 16;
    const h = t.height + 10;
    const g = this.scene.add.graphics();
    g.fillStyle(0x2a2438, 1).fillRoundedRect(-w / 2 - 1, -h - 7, w + 2, h + 2, 8);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h - 6, w, h, 7);
    g.fillStyle(0xffffff, 1).fillTriangle(-5, -7, 5, -7, 0, -1);
    t.setPosition(0, -11);
    const offset = this.status ? -AVATAR_FEET_OFFSET - 44 : -AVATAR_FEET_OFFSET - 26;
    this.bubble = this.scene.add.container(0, offset, [g, t]);
    this.container.add(this.bubble);
    this.bubbleTimer = this.scene.time.delayedCall(Math.min(8000, 3000 + text.length * 60), () => {
      this.bubble?.destroy();
      this.bubble = null;
    });
  }

  showEmote(emote: string) {
    this.emote?.destroy();
    this.emote = null;
    if (!emote) return;
    this.emote = this.scene.add
      .text(14, -AVATAR_FEET_OFFSET + 4, EMOTE_ICON[emote] ?? '', { fontSize: '20px', resolution: 2 })
      .setOrigin(0.5);
    this.container.add(this.emote);
    if (!useUi.getState().reducedMotion) {
      this.scene.tweens.add({
        targets: this.emote,
        y: this.emote.y - 10,
        duration: 400,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
      });
    }
  }

  updateAnim(force = false) {
    const state = `${this.texKey}:${this.dir}:${this.moving}`;
    if (!force && this.animationState === state) return;
    this.animationState = state;
    const key = `${this.texKey}:walk${this.dir}`;
    if (this.moving && this.scene.scene.key !== 'ocean') {
      if (force || this.sprite.anims.currentAnim?.key !== key || !this.sprite.anims.isPlaying)
        this.sprite.play(key, true);
    } else {
      this.sprite.stop();
      this.sprite.setFrame(this.dir * 3);
    }
    this.updateHeldFishFacing();
  }

  updateBoat(time: number) {
    if (this.scene.scene.key !== 'ocean') {
      if (this.boatSprite) {
        this.boatSprite.destroy();
        this.boatSprite = null;
        this.shadow.setVisible(true);
      }
      return;
    }

    this.shadow.setVisible(false);
    const boatId = normalizeBoatId(this.appearance.boat) ?? 'boat_coracle';
    const frame = this.moving ? Math.floor(time / 250) % 2 : 0;
    const dir = (this.dir >= 0 && this.dir <= 3 ? this.dir : 0) as 0 | 1 | 2 | 3;
    const tex = ensureBoatTexture(this.scene, boatId, dir, frame);

    if (!this.boatSprite) {
      this.boatSprite = this.scene.add.image(0, -4, tex).setOrigin(0.5, 0.7);
      this.container.add(this.boatSprite);
      this.container.sendToBack(this.boatSprite);
    } else if (this.boatSprite.texture.key !== tex) {
      this.boatSprite.setTexture(tex);
    }

    const ui = useUi.getState();
    const pose = boatPose(
      time,
      this.container.x,
      this.container.y,
      boatId,
      dir,
      this.moving,
      ui.weather.windSpeedKmh,
      ui.reducedMotion,
    );
    this.boatSprite.setY(-4 + pose.heave).setRotation(pose.roll);
    // The passenger shares the hull's pivot, while name tags stay level.
    const seatY = this.baseSpriteY - 2;
    this.sprite.setPosition(-Math.sin(pose.roll) * seatY, Math.cos(pose.roll) * seatY + pose.heave);
    this.sprite.setRotation(pose.roll);
  }

  update(dtMs: number, time: number) {
    const driving = Boolean(this.vehicle) && this.scene.scene.key === 'town';
    if (driving && !this.vehicleLights) this.vehicleLights = new VehicleLights(this.scene);
    this.vehicleLights?.update(driving ? this.vehicle : '', this.container.x, this.container.y, this.dir);
    const kind = vehicleById(this.vehicle)?.kind;
    const riding = driving && (kind === 'bicycle' || kind === 'motorcycle');
    if (riding !== this.ridingTwoWheeler) {
      this.ridingTwoWheeler = riding;
      if (riding) this.sprite.setCrop(0, 0, 32, 40);
      else this.sprite.setCrop();
    }
    this.sprite.setVisible(!driving || riding);
    this.heldFishContainer?.setVisible(!driving);
    this.rodGlowContainer?.setVisible(!driving);
    if (driving) {
      const frame = riding && this.moving && !useUi.getState().reducedMotion ? Math.floor(time / 160) % 2 : 0;
      const key = ensureVehicleTexture(this.scene, this.vehicle, this.dir, frame);
      if (!this.vehicleSprite) {
        this.vehicleSprite = this.scene.add.image(0, -14, key);
        this.container.addAt(this.vehicleSprite, 1);
      }
      this.vehicleSprite.setTexture(key).setVisible(true);
    } else this.vehicleSprite?.setVisible(false);
    if (this.scene.scene.key === 'ocean') {
      this.updateBoat(time);
      if (this.moving && !useUi.getState().reducedMotion) {
        this.dustTimer += dtMs;
        if (this.dustTimer >= 180) {
          this.dustTimer = 0;
          spawnWaterWake(this.scene, this.container.x, this.container.y, this.dir);
        }
      }
    } else if (this.moving) {
      this.sprite.y = this.baseSpriteY;
      if (!useUi.getState().reducedMotion) {
        this.dustTimer += dtMs;
        if (this.dustTimer >= 220) {
          this.dustTimer = 0;
          spawnFootstepDust(this.scene, this.container.x, this.container.y);
        }
      }
    } else {
      this.dustTimer = 0;
      if (!useUi.getState().reducedMotion) {
        this.sprite.y = this.baseSpriteY + Math.sin(time * 0.0035 + this.breathSeed) * 0.75;
      }
    }

    if (riding) {
      this.sprite.stop();
      this.sprite.setFrame(this.dir * 3);
      this.sprite.y = this.baseSpriteY - 4;
    }
    if (this.heldFishContainer && !useUi.getState().reducedMotion) {
      const bob = Math.sin(time * 0.0035 + this.breathSeed) * 1.5;
      this.heldFishContainer.setY(this.heldFishBaseY + bob);
    }
  }

  destroy() {
    this.vehicleLights?.destroy();
    this.bubbleTimer?.remove();
    this.clearHeldFishEffects();
    this.clearRodEffects();
    this.heldFishContainer?.destroy();
    this.rodGlowContainer?.destroy();
    this.boatSprite?.destroy();
    this.boatSprite = null;
    this.container.destroy();
  }
}

const parseAppearance = (raw: string): Appearance => {
  try {
    return { ...DEFAULT_APPEARANCE, ...(JSON.parse(raw) as Appearance) };
  } catch {
    return DEFAULT_APPEARANCE;
  }
};

/**
 * Renders all players in the current room. The local player is predicted with the same movement
 * function the server uses and reconciled against authoritative state; others are interpolated.
 */
export class PlayerLayer {
  private scripted = new Map<
    string,
    { from: { x: number; y: number }; to: { x: number; y: number }; elapsed: number; duration: number }
  >();
  scriptedMove(sid: string, from: { x: number; y: number }, to: { x: number; y: number }, duration: number) {
    this.scripted.set(sid, { from: { x: from.x, y: from.y }, to, elapsed: 0, duration });
  }
  avatars = new Map<string, Avatar>();
  self: Avatar | null = null;
  selfSessionId = '';
  private input: MoveInput = { x: 0, y: 0 };
  private seq = 0;
  private prediction: MovementPrediction | null = null;
  private sendAcc = 0;
  private lastSent: MoveInput | null = null;
  private cleanup: (() => void)[] = [];
  private playerCleanup = new Map<string, (() => void)[]>();
  private world: { width: number; height: number; blockers: Rect[]; speed?: number };
  private $: ReturnType<typeof getStateCallbacks>;

  constructor(
    private scene: Phaser.Scene,
    private room: Room,
    world: { width: number; height: number; blockers: Rect[]; speed?: number },
    private onSelfMove?: (x: number, y: number) => void,
  ) {
    this.world = world;
    this.selfSessionId = room.sessionId;
    this.$ = getStateCallbacks(room);
    const players = (
      this.$(room.state as never) as unknown as {
        players: {
          onAdd: (cb: (p: PlayerSnapshot, k: string) => void, immediate?: boolean) => () => void;
          onRemove: (cb: (p: PlayerSnapshot, k: string) => void) => () => void;
        };
      }
    ).players;
    this.cleanup.push(players.onAdd((p, sid) => this.add(p, sid), true));
    this.cleanup.push(
      players.onRemove((_p, sid) => {
        this.playerCleanup.get(sid)?.forEach((fn) => fn());
        this.playerCleanup.delete(sid);
        if (this.avatars.get(sid) === this.self) {
          this.self = null;
          this.prediction = null;
        }
        this.avatars.get(sid)?.destroy();
        this.avatars.delete(sid);
      }),
    );
    this.cleanup.push(
      room.onMessage('chat', (m: { from: string; text: string }) => this.avatars.get(m.from)?.say(m.text)),
    );

    // Fallback sync: also inspect current room state directly if players already exist
    const rawState = room.state as unknown as { players?: Map<string, PlayerSnapshot> };
    if (rawState?.players && typeof rawState.players.forEach === 'function') {
      rawState.players.forEach((p, sid) => {
        if (!this.avatars.has(sid)) {
          this.add(p, sid);
        }
      });
    }

    // Also listen to state updates in case initial snapshot was delayed
    const onState = (state: unknown) => {
      const s = state as { players?: Map<string, PlayerSnapshot>; simulationTime?: number };
      const receivedAt = performance.now();
      if (s?.players && typeof s.players.forEach === 'function') {
        s.players.forEach((p, sid) => {
          if (!this.avatars.has(sid)) {
            this.add(p, sid);
          }
          const avatar = this.avatars.get(sid);
          if (avatar && avatar !== this.self && s.simulationTime !== undefined) {
            avatar.interpolation.push(
              { x: p.x, y: p.y, dir: p.dir, moving: p.moving, time: s.simulationTime },
              receivedAt,
            );
          }
        });
      }
    };
    room.onStateChange(onState as never);
    this.cleanup.push(() => {
      room.onStateChange.remove(onState as never);
    });
  }

  setWorldBlockers(blockers: Rect[]) {
    this.world = { ...this.world, blockers };
  }

  setWorldSpeed(speed: number) {
    this.world = { ...this.world, speed };
  }

  saySelf(text: string) {
    this.self?.say(text);
  }

  setSelfHeldFish(heldFish: { speciesId: string; sizeCm: number } | null) {
    if (!this.self) return;
    const a = this.self.appearance;
    this.self.setAppearance({ ...a, heldFish });
  }

  setSelfFishing(isFishing: boolean, facingDir?: number) {
    if (!this.self) return;
    if (facingDir !== undefined) {
      this.self.setFacing(facingDir);
    }
    const a = this.self.appearance;
    this.self.setAppearance({ ...a, isFishing });
  }

  private add(p: PlayerSnapshot, sid: string) {
    if (!this.scene.sys || !this.scene.sys.displayList || !this.scene.scene.isActive()) return;
    if (this.avatars.has(sid)) return;
    try {
      const myId = useUi.getState().myUserId;
      const isSelf = sid === this.selfSessionId || (Boolean(myId) && p.userId === myId);
      const av = new Avatar(this.scene, p.userId, p.name, parseAppearance(p.appearance), p.x, p.y, isSelf);
      av.vehicle = p.vehicle || '';
      av.setStatus(p.status);
      av.container.setAlpha(p.connected ? 1 : 0.45);
      this.avatars.set(sid, av);
      if (isSelf) {
        if (p.speed !== undefined) this.setWorldSpeed(p.speed);
        this.self = av;
        this.prediction = new MovementPrediction({ x: p.x, y: p.y });
        this.seq = p.seq;
        this.lastSent = null;
        this.sendAcc = 50;
        this.scene.cameras.main.startFollow(av.container, true, 0.12, 0.12);
      }
      const $p = this.$(p as never) as unknown as Callbacks;
      this.playerCleanup.set(sid, [
        $p.onChange(() => {
          av.vehicle = p.vehicle || '';
          if (isSelf && !this.scripted.has(sid)) {
            if (this.scene.scene.key === 'town')
              this.world.speed = av.vehicle ? drivingSpeed(av.vehicle, p.x, p.y) : PLAYER_SPEED;
            if (p.speed !== undefined) this.setWorldSpeed(p.speed);
            this.prediction?.reconcile(p, this.world);
          } else {
            av.target = { x: p.x, y: p.y };
            if (!(this.room.state as { simulationTime?: number }).simulationTime) {
              av.dir = p.dir;
              av.moving = p.moving;
              av.updateAnim();
            }
          }
          av.container.setAlpha(p.connected ? 1 : 0.45);
        }),
        $p.listen('appearance', (v) => av.setAppearance(parseAppearance(String(v)))),
        $p.listen('status', (v) => av.setStatus(String(v ?? ''))),
        $p.listen('emote', (v) => av.showEmote(String(v ?? ''))),
      ]);
    } catch (err) {
      console.warn('[PlayerLayer] error adding avatar:', err);
    }
  }

  setInput(input: MoveInput) {
    this.input = input;
  }

  update(dtMs: number, time = 0) {
    if (!this.room.connection.isOpen) return;
    const dt = dtMs / 1000;
    // A sequence identifies a direction change, not a redundant repeat of a held key.
    // WebSockets are reliable: send changes immediately, with a 1 Hz keepalive.
    this.sendAcc += dtMs;
    const changed = !this.lastSent || this.input.x !== this.lastSent.x || this.input.y !== this.lastSent.y;
    const sendInterval = 1000;
    if (this.self && (this.seq === 0 || changed || this.sendAcc >= sendInterval)) {
      this.sendAcc = 0;
      if (this.seq === 0 || changed) this.seq++;
      this.lastSent = { ...this.input };
      this.room.send('input', { ...this.input, seq: this.seq });
    }
    // local prediction
    if (this.self && this.prediction && !this.scripted.has(this.selfSessionId)) {
      const av = this.self;
      const moving = this.input.x !== 0 || this.input.y !== 0;
      const before = this.prediction.position;
      if (this.scene.scene.key === 'town')
        this.world.speed = av.vehicle ? drivingSpeed(av.vehicle, before.x, before.y) : PLAYER_SPEED;
      const next = this.prediction.predict(this.seq, this.input, dtMs, this.world);
      const display = smoothMovement(av.container, before, next, dtMs);
      av.container.setPosition(display.x, display.y);
      if (moving) {
        if (this.input.x < 0) av.dir = 1;
        else if (this.input.x > 0) av.dir = 2;
        else if (this.input.y < 0) av.dir = 3;
        else av.dir = 0;
      }
      if (av.moving !== moving) {
        av.moving = moving;
        av.updateAnim();
      } else if (moving) av.updateAnim();
      this.onSelfMove?.(next.x, next.y);
    }
    // interpolate remote players, run micro-animations, and depth-sort everyone by feet position
    const now = performance.now();
    for (const [sid, av] of this.avatars) {
      const motion = this.scripted.get(sid);
      if (motion) {
        motion.elapsed = Math.min(motion.duration, motion.elapsed + dtMs);
        const t = motion.elapsed / motion.duration;
        av.container.setPosition(
          motion.from.x + (motion.to.x - motion.from.x) * t,
          motion.from.y + (motion.to.y - motion.from.y) * t,
        );
        if (t >= 1) {
          this.scripted.delete(sid);
          if (sid === this.selfSessionId) this.prediction = new MovementPrediction(motion.to);
          else av.target = { ...motion.to };
        }
      } else if (sid !== this.selfSessionId) {
        const sample = av.interpolation.sample(now);
        if (sample) {
          av.container.setPosition(sample.x, sample.y);
          av.dir = sample.dir;
          av.moving = sample.moving;
          av.updateAnim();
        } else {
          const k = 1 - Math.exp(-dt * 10);
          av.container.x += (av.target.x - av.container.x) * k;
          av.container.y += (av.target.y - av.container.y) * k;
        }
      }
      av.update(dtMs, time);
      if (av.container.depth !== av.container.y) av.container.setDepth(av.container.y);
    }
  }

  destroy() {
    this.scripted.clear();
    this.cleanup.forEach((fn) => fn());
    this.playerCleanup.forEach((callbacks) => callbacks.forEach((fn) => fn()));
    this.playerCleanup.clear();
    this.avatars.forEach((a) => a.destroy());
    this.avatars.clear();
  }
}
