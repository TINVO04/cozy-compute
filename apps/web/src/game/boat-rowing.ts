import { SKIN_TONES, TOP_COLORS } from '@cozy/game-data';
import Phaser from 'phaser';
import { boatOarType, type BoatOarType } from '../art/boat';
import { useUi } from '../lib/store';
import type { Avatar } from './players';

const PADDLE_TEX_KEY = 'tex:boat-paddle-double';
const OAR_TEX_KEY = 'tex:boat-oar-wood';

/** Ensures pixel-art double kayak paddle texture */
function ensurePaddleTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(PADDLE_TEX_KEY)) return PADDLE_TEX_KEY;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return PADDLE_TEX_KEY;
  ctx.imageSmoothingEnabled = false;

  const len = 50;
  const cx = 32;
  const cy = 8;
  const half = len / 2;

  // Central carbon shaft
  ctx.fillStyle = '#18181b';
  ctx.fillRect(cx - half, cy - 1, len, 3);
  ctx.fillStyle = '#52525b';
  ctx.fillRect(cx - half, cy - 1, len, 1);
  ctx.fillStyle = '#09090b';
  ctx.fillRect(cx - half, cy + 1, len, 1);

  // Left blade
  const bladeW = 10;
  ctx.fillStyle = '#09090b';
  ctx.fillRect(cx - half - bladeW, cy - 3, bladeW, 7);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(cx - half - bladeW + 1, cy - 2, bladeW - 2, 5);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(cx - half - bladeW + 2, cy - 1, bladeW - 4, 3);
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(cx - half - bladeW + 3, cy, bladeW - 5, 1);

  // Right blade
  ctx.fillStyle = '#09090b';
  ctx.fillRect(cx + half, cy - 3, bladeW, 7);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(cx + half + 1, cy - 2, bladeW - 2, 5);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(cx + half + 2, cy - 1, bladeW - 4, 3);
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(cx + half + 3, cy, bladeW - 5, 1);

  scene.textures.addCanvas(PADDLE_TEX_KEY, canvas);
  return PADDLE_TEX_KEY;
}

/** Ensures pixel-art wooden oar texture for sampan */
function ensureOarTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(OAR_TEX_KEY)) return OAR_TEX_KEY;
  const canvas = document.createElement('canvas');
  canvas.width = 44;
  canvas.height = 12;
  const ctx = canvas.getContext('2d');
  if (!ctx) return OAR_TEX_KEY;
  ctx.imageSmoothingEnabled = false;

  const cy = 6;
  // Handle (grip)
  ctx.fillStyle = '#451a03';
  ctx.fillRect(2, cy - 1, 6, 3);

  // Wooden loom & shaft
  ctx.fillStyle = '#78350f';
  ctx.fillRect(8, cy - 1, 24, 3);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(8, cy - 1, 24, 1);

  // Brass oarlock collar
  ctx.fillStyle = '#facc15';
  ctx.fillRect(16, cy - 2, 3, 5);
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(17, cy - 2, 1, 5);

  // Flared spoon blade
  ctx.fillStyle = '#451a03';
  ctx.fillRect(32, cy - 3, 11, 7);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(33, cy - 2, 9, 5);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(34, cy - 1, 7, 3);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(36, cy, 4, 1);

  scene.textures.addCanvas(OAR_TEX_KEY, canvas);
  return OAR_TEX_KEY;
}

export class BoatRowingController {
  private container: Phaser.GameObjects.Container;
  private paddleSprite: Phaser.GameObjects.Image | null = null;
  private leftOarSprite: Phaser.GameObjects.Image | null = null;
  private rightOarSprite: Phaser.GameObjects.Image | null = null;
  private armsGraphics: Phaser.GameObjects.Graphics;
  private splashTimer = 0;
  private currentOarType: BoatOarType = 'none';
  private strokePhase = 0;

  constructor(
    private scene: Phaser.Scene,
    private avatar: Avatar,
  ) {
    this.container = scene.add.container(0, 0);
    this.armsGraphics = scene.add.graphics();
    this.container.add(this.armsGraphics);
    // Add above avatar sprite so hands and paddle are held naturally in front of body
    this.avatar.container.add(this.container);
  }

  private initVisuals(type: BoatOarType) {
    if (this.currentOarType === type) return;
    this.currentOarType = type;

    this.paddleSprite?.destroy();
    this.leftOarSprite?.destroy();
    this.rightOarSprite?.destroy();
    this.paddleSprite = null;
    this.leftOarSprite = null;
    this.rightOarSprite = null;
    this.armsGraphics.clear();

    if (type === 'kayak_double') {
      const tex = ensurePaddleTexture(this.scene);
      this.paddleSprite = this.scene.add.image(0, 0, tex).setOrigin(0.5, 0.5);
      this.container.add(this.paddleSprite);
    } else if (type === 'sampan_oars') {
      const tex = ensureOarTexture(this.scene);
      this.leftOarSprite = this.scene.add.image(0, 0, tex).setOrigin(0.35, 0.5);
      this.rightOarSprite = this.scene.add.image(0, 0, tex).setOrigin(0.35, 0.5);
      this.container.add([this.leftOarSprite, this.rightOarSprite]);
    }
  }

  update(
    time: number,
    dtMs: number,
    isMoving: boolean,
    dir: number,
    boatId: string,
    seatY: number,
    pose: { heave: number; roll: number },
  ) {
    const oarType = boatOarType(boatId);
    if (oarType === 'none') {
      this.hide();
      return;
    }

    this.container.setVisible(true);
    this.initVisuals(oarType);

    const reducedMotion = useUi.getState().reducedMotion;
    const skinColor = Phaser.Display.Color.HexStringToColor(
      SKIN_TONES[this.avatar.appearance.skin] ?? SKIN_TONES[1]!,
    ).color;
    const shirtHex =
      this.avatar.appearance.top?.split(':')[1] ??
      TOP_COLORS[this.avatar.appearance.baseTop] ??
      TOP_COLORS[0]!;
    const shirtColor = Phaser.Display.Color.HexStringToColor(shirtHex).color;

    const side = dir === 1 || dir === 2;
    const isLeft = dir === 1;

    // Anchor the rowing gear right in front of the avatar's chest/lap
    const torsoX = this.avatar.sprite.x;
    const torsoY = this.avatar.sprite.y;
    this.container.setPosition(torsoX, torsoY);
    this.container.setRotation(this.avatar.sprite.rotation);

    if (oarType === 'kayak_double' && this.paddleSprite) {
      this.updateKayakPaddle(
        time,
        dtMs,
        isMoving,
        dir,
        side,
        isLeft,
        skinColor,
        shirtColor,
        reducedMotion,
        pose,
      );
    } else if (oarType === 'sampan_oars' && this.leftOarSprite && this.rightOarSprite) {
      this.updateSampanOars(
        time,
        dtMs,
        isMoving,
        dir,
        side,
        isLeft,
        skinColor,
        shirtColor,
        reducedMotion,
        pose,
      );
    }
  }

  private updateKayakPaddle(
    time: number,
    dtMs: number,
    isMoving: boolean,
    dir: number,
    side: boolean,
    isLeft: boolean,
    skinColor: number,
    shirtColor: number,
    reducedMotion: boolean,
    pose: { heave: number; roll: number },
  ) {
    const paddle = this.paddleSprite!;
    this.armsGraphics.clear();

    if (!isMoving || reducedMotion) {
      // Idle resting pose across lap
      const idleAngle = side ? (isLeft ? -0.22 : 0.22) : 0.05;
      const idleBob = Math.sin(time * 0.003) * 0.8;
      const py = -2 + idleBob;
      const px = side ? (isLeft ? -2 : 2) : 0;
      paddle.setPosition(px, py).setRotation(idleAngle).setScale(1.1);

      // Render relaxed arms holding shaft
      this.drawRowerHands(paddle.x, paddle.y, idleAngle, skinColor, shirtColor);
      return;
    }

    // Active Kayak Paddling Cycle (720ms per cycle)
    const cycleMs = 720;
    this.strokePhase = (time % cycleMs) / cycleMs; // 0..1
    const p = this.strokePhase;
    const isFirstStroke = p < 0.5;
    const strokeP = isFirstStroke ? p / 0.5 : (p - 0.5) / 0.5; // 0..1 within current stroke

    // Alternating left and right paddle blade strokes
    // Blade reaches forward, dips into water, pulls back with power
    const sweep = Math.sin(strokeP * Math.PI);
    const tiltDirection = isFirstStroke ? -1 : 1;
    const baseAngle = side ? (isLeft ? -0.15 : 0.15) : 0;
    const strokeAngle = baseAngle + tiltDirection * (0.38 * sweep);
    const strokeForeAft = Math.cos(strokeP * Math.PI) * (side ? 4 : 2);
    const strokeDip = Math.sin(strokeP * Math.PI) * 2.8;

    const px = side ? (isLeft ? -2 - strokeForeAft : 2 + strokeForeAft) : 0;
    const py = -2 + strokeDip;
    paddle.setPosition(px, py).setRotation(strokeAngle).setScale(1.15);

    // Dynamic body lean into the stroke
    const bodyLean = tiltDirection * sweep * 0.07;
    this.avatar.sprite.setRotation(pose.roll + bodyLean);

    // Alternate character reach frames (1 and 2) during rowing strokes
    const frameIndex = isFirstStroke ? 1 : 2;
    this.avatar.sprite.setFrame(dir * 3 + frameIndex);

    // Draw active rower arms pulling the paddle
    this.drawRowerHands(paddle.x, paddle.y, strokeAngle, skinColor, shirtColor);

    // Spawn water droplet splash and foam ripples when blade enters water
    this.splashTimer += dtMs;
    if (sweep > 0.65 && this.splashTimer >= 140) {
      this.splashTimer = 0;
      const tipDistance = 26;
      const dipDir = isFirstStroke ? -1 : 1;
      const bladeWorldX = this.avatar.container.x + paddle.x + Math.cos(strokeAngle) * (tipDistance * dipDir);
      const bladeWorldY =
        this.avatar.container.y + paddle.y + Math.sin(strokeAngle) * (tipDistance * dipDir) + 8;
      this.spawnOarSplash(bladeWorldX, bladeWorldY);
    }
  }

  private updateSampanOars(
    time: number,
    dtMs: number,
    isMoving: boolean,
    dir: number,
    side: boolean,
    isLeft: boolean,
    skinColor: number,
    shirtColor: number,
    reducedMotion: boolean,
    pose: { heave: number; roll: number },
  ) {
    const oarL = this.leftOarSprite!;
    const oarR = this.rightOarSprite!;
    this.armsGraphics.clear();

    if (!isMoving || reducedMotion) {
      // Resting oars flat along oarlocks
      if (side) {
        oarL.setPosition(isLeft ? -4 : 4, -4).setRotation(isLeft ? 0.35 : -0.35);
        oarR.setPosition(isLeft ? -2 : 2, 2).setRotation(isLeft ? 0.25 : -0.25);
      } else {
        oarL.setPosition(-16, -2).setRotation(-0.25);
        oarR.setPosition(16, -2).setRotation(0.25);
      }
      return;
    }

    // Classic Sculling / Dual-Oar Row Cycle (800ms per cycle)
    const cycleMs = 800;
    const p = (time % cycleMs) / cycleMs;
    const isDrive = p < 0.65; // Power stroke (drive) vs recovery
    const strokeP = isDrive ? p / 0.65 : (p - 0.65) / 0.35;

    // Power drive: oars pivot backward firmly; Recovery: lift and swing forward
    const driveAngle = isDrive
      ? Phaser.Math.Linear(-0.45, 0.45, strokeP)
      : Phaser.Math.Linear(0.45, -0.45, strokeP);

    if (side) {
      const flip = isLeft ? -1 : 1;
      oarL.setPosition(flip * -2, -3).setRotation(flip * driveAngle);
      oarR.setPosition(flip * 2, 3).setRotation(flip * (driveAngle + 0.1));
    } else {
      oarL.setPosition(-16, -2).setRotation(-driveAngle);
      oarR.setPosition(16, -2).setRotation(driveAngle);
    }

    // Rower leans back during drive, leans forward during recovery
    const leanAngle = isDrive ? 0.08 : -0.06;
    this.avatar.sprite.setRotation(pose.roll + leanAngle);
    this.avatar.sprite.setFrame(dir * 3 + (isDrive ? 1 : 0));

    // Water splashes when oars catch water during drive
    this.splashTimer += dtMs;
    if (isDrive && strokeP > 0.2 && strokeP < 0.7 && this.splashTimer >= 180) {
      this.splashTimer = 0;
      this.spawnOarSplash(this.avatar.container.x - 20, this.avatar.container.y + 6);
      this.spawnOarSplash(this.avatar.container.x + 20, this.avatar.container.y + 6);
    }
  }

  private drawRowerHands(px: number, py: number, angle: number, skinColor: number, shirtColor: number) {
    const g = this.armsGraphics;
    const shoulderL = { x: -6, y: -9 };
    const shoulderR = { x: 6, y: -9 };

    // Grip offsets along paddle shaft
    const gripL = {
      x: px - Math.cos(angle) * 7,
      y: py - Math.sin(angle) * 7,
    };
    const gripR = {
      x: px + Math.cos(angle) * 7,
      y: py + Math.sin(angle) * 7,
    };

    // Draw Sleeves
    g.lineStyle(3, shirtColor, 0.95);
    g.lineBetween(shoulderL.x, shoulderL.y, gripL.x, gripL.y);
    g.lineBetween(shoulderR.x, shoulderR.y, gripR.x, gripR.y);

    // Draw Skin-toned hands gripping the shaft
    g.fillStyle(skinColor, 1);
    g.fillCircle(gripL.x, gripL.y, 2.2);
    g.fillCircle(gripR.x, gripR.y, 2.2);
  }

  private spawnOarSplash(x: number, y: number) {
    // Elegant expanding water ripple ring
    const ripple = this.scene.add.ellipse(x, y, 6, 3, 0xffffff, 0.6);
    ripple.setDepth(y - 1);
    this.scene.tweens.add({
      targets: ripple,
      scaleX: 2.5,
      scaleY: 2.2,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => ripple.destroy(),
    });

    // Upward translucent water droplets
    for (let i = 0; i < 2; i++) {
      const drop = this.scene.add.circle(x + (Math.random() * 8 - 4), y - 2, 1.2, 0xbae6fd, 0.8);
      drop.setDepth(y);
      this.scene.tweens.add({
        targets: drop,
        y: drop.y - 6 - Math.random() * 4,
        x: drop.x + (Math.random() * 6 - 3),
        alpha: 0,
        duration: 280,
        ease: 'Cubic.easeOut',
        onComplete: () => drop.destroy(),
      });
    }
  }

  hide() {
    this.container.setVisible(false);
    this.paddleSprite?.destroy();
    this.leftOarSprite?.destroy();
    this.rightOarSprite?.destroy();
    this.paddleSprite = null;
    this.leftOarSprite = null;
    this.rightOarSprite = null;
    this.armsGraphics.clear();
    this.currentOarType = 'none';
  }

  destroy() {
    this.hide();
    this.container.destroy();
  }
}
