import {
  FISHING_NIBBLE_DURATION_MS,
  FISHING_RODS,
  SHADOW_TIER_CONFIG,
  type FishShadowTier,
  type RodConfig,
} from '@cozy/game-data';
import type Phaser from 'phaser';
import { play } from '../lib/sound';
import { fishNibblePose } from './fishing-motion';

export interface FishingSessionParams {
  selfX: number;
  selfY: number;
  shadowTier: FishShadowTier;
  nibbleCount: number;
  nibbleTimes: number[];
  nibbleOrbitTurns?: number[];
  biteInMs: number;
  shadowDelayMs?: number;
  equippedRod?: RodConfig;
  onNibble?: (index: number) => void;
  onBite?: () => void;
}

export class InWorldFishingController {
  private scene: Phaser.Scene;
  private active = false;
  public isRemote = false;
  private params: FishingSessionParams | null = null;
  private startTime = 0;
  private biteAt = 0;
  private shadowAppearAt = 0;
  private shadowSpawnedRipple = false;

  // Visual game objects in Phaser world
  private lineGraphics: Phaser.GameObjects.Graphics | null = null;
  private rodGraphics: Phaser.GameObjects.Graphics | null = null;
  private shadowGraphics: Phaser.GameObjects.Graphics | null = null;
  private bobberContainer: Phaser.GameObjects.Container | null = null;
  private bobberSprite: Phaser.GameObjects.Graphics | null = null;
  private exclamation: Phaser.GameObjects.Container | null = null;
  private ripples: { circle: Phaser.GameObjects.Arc; alpha: number; scale: number }[] = [];
  private splashes: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    p: Phaser.GameObjects.Arc;
    alpha: number;
  }[] = [];
  private flyingFish: Phaser.GameObjects.Image | null = null;

  // Coordinates
  private rodTipX = 0;
  private rodTipY = 0;
  private bobberBaseX = 0;
  private bobberBaseY = 0;
  private bobberCurrentX = 0;
  private bobberCurrentY = 0;
  private fishStartX = 0;
  private fishStartY = 0;
  private fishCurrentX = 0;
  private fishCurrentY = 0;
  private fishAngle = 0;
  private approachAngle = 0;
  private nibbleApproachAngles: number[] = [];

  private isBite = false;
  private isReeling = false;
  private playedNibbles = new Set<number>();
  private bobberJitter = 0;
  private rodFlex = 0;
  private facingDir = 1;
  private isReadyOnly = false;
  private readyRod: RodConfig | null = null;
  private readySelfX = 0;
  private readySelfY = 0;

  constructor(scene: Phaser.Scene, options?: { isRemote?: boolean }) {
    this.scene = scene;
    if (options?.isRemote) {
      this.isRemote = true;
    }
  }

  getScene(): Phaser.Scene {
    return this.scene;
  }

  getFacingDir(): number {
    return this.facingDir;
  }

  triggerRemoteNibble(index: number) {
    if (!this.active || this.playedNibbles.has(index)) return;
    this.bobberJitter = (Math.random() - 0.5) * 8;
    this.spawnRipple(this.bobberCurrentX, this.bobberCurrentY, 1.15);
    if (!this.playedNibbles.has(index)) {
      this.playedNibbles.add(index);
    }
  }

  triggerRemoteBite() {
    this.triggerBite();
  }

  /** Puts character into fishing stance facing the water, holding their fishing rod in hand ready to cast */
  holdRodReady(params: { selfX: number; selfY: number; equippedRod?: RodConfig }) {
    this.cleanupVisuals();
    this.active = true;
    this.isReadyOnly = true;
    this.readyRod = params.equippedRod ?? FISHING_RODS['rod_twig']!;
    this.readySelfX = params.selfX;
    this.readySelfY = params.selfY;

    const { selfX, selfY } = params;
    let facingDir = 1;
    if (selfY >= 910) {
      facingDir = 0;
    } else if (selfX > 1248) {
      facingDir = 2;
    }
    this.facingDir = facingDir;

    if (!this.isRemote) {
      (
        this.scene as unknown as { setSelfFishing?: (isFishing: boolean, dir?: number) => void }
      ).setSelfFishing?.(true, facingDir);
    }

    if (!this.rodGraphics) {
      this.rodGraphics = this.scene.add.graphics().setDepth(selfY + 4);
    }
  }

  /** Starts in-world casting animation, places bobber on town lake, and spawns real water fish shadow */
  startCast(params: FishingSessionParams) {
    this.cleanup();
    this.isReadyOnly = false;
    this.params = params;
    this.active = true;
    this.startTime = Date.now();
    this.biteAt = this.startTime + params.biteInMs;
    const shadowWait = params.shadowDelayMs ?? 7000 + Math.floor(Math.random() * 5001);
    this.shadowAppearAt = this.startTime + shadowWait;
    this.shadowSpawnedRipple = false;
    this.isBite = false;
    this.isReeling = false;
    this.playedNibbles.clear();
    this.bobberJitter = 0;
    this.rodFlex = 0;

    const { selfX, selfY } = params;

    // Determine water target adjacent to pier walkway (x: 1216..1280, y: 640..960)
    let waterX = selfX - 48;
    let waterY = selfY + 12;
    let approachDx = -100;
    let approachDy = 50;
    let facingDir = 1; // 1 = facing left

    if (selfY >= 910) {
      // End of pier: cast southward into open lake
      waterX = selfX;
      waterY = selfY + 56;
      approachDx = 30;
      approachDy = 90;
      facingDir = 0; // 0 = facing down
    } else if (selfX > 1248) {
      // Right side of pier
      waterX = selfX + 48;
      waterY = selfY + 12;
      approachDx = 100;
      approachDy = 50;
      facingDir = 2; // 2 = facing right
    }

    this.facingDir = facingDir;
    this.approachAngle = Math.atan2(approachDy, approachDx);
    let nibbleAngle = this.approachAngle;
    this.nibbleApproachAngles = params.nibbleTimes.map((_, index) => {
      const startAngle = nibbleAngle;
      nibbleAngle += (params.nibbleOrbitTurns?.[index] ?? 1.5) * Math.PI * 2;
      return startAngle;
    });

    // Make character face the water and adopt the fishing stance with rod in hand
    if (!this.isRemote) {
      (
        this.scene as unknown as { setSelfFishing?: (isFishing: boolean, dir?: number) => void }
      ).setSelfFishing?.(true, facingDir);
    }

    this.bobberBaseX = waterX;
    this.bobberBaseY = waterY;
    this.bobberCurrentX = waterX;
    this.bobberCurrentY = waterY;

    // Initial rod tip position extending from hands towards water
    if (facingDir === 1) {
      this.rodTipX = selfX - 46;
      this.rodTipY = selfY - 36;
    } else if (facingDir === 2) {
      this.rodTipX = selfX + 46;
      this.rodTipY = selfY - 36;
    } else {
      this.rodTipX = selfX + 22;
      this.rodTipY = selfY - 2;
    }

    // Fish starting position in deep lake water
    this.fishStartX = waterX + approachDx;
    this.fishStartY = waterY + approachDy;
    this.fishCurrentX = this.fishStartX;
    this.fishCurrentY = this.fishStartY;
    this.fishAngle = Math.atan2(waterY - this.fishStartY, waterX - this.fishStartX);

    // 1. Line & Rod Graphics
    this.rodGraphics = this.scene.add.graphics().setDepth(selfY + 4);
    this.lineGraphics = this.scene.add.graphics().setDepth(selfY + 2);

    // 2. Bobber in water
    this.bobberContainer = this.scene.add.container(waterX, waterY).setDepth(-7);
    this.bobberSprite = this.scene.add.graphics();
    // Draw red/white bobber
    this.bobberSprite.fillStyle(0x0a1928, 0.35);
    this.bobberSprite.fillEllipse(0, 3, 10, 5); // water shadow
    this.bobberSprite.fillStyle(0xef4444, 1);
    this.bobberSprite.slice(0, 0, 5, Math.PI, 0, false); // red top half
    this.bobberSprite.fillPath();
    this.bobberSprite.fillStyle(0xffffff, 1);
    this.bobberSprite.slice(0, 0, 5, 0, Math.PI, false); // white bottom half
    this.bobberSprite.fillPath();
    this.bobberSprite.lineStyle(1, 0x0f172a, 0.8);
    this.bobberSprite.strokeCircle(0, 0, 5);
    this.bobberSprite.fillStyle(0xfbbf24, 1);
    this.bobberSprite.fillRect(-1, -9, 2, 5); // antenna
    this.bobberSprite.fillStyle(0xef4444, 1);
    this.bobberSprite.fillRect(-1.5, -10, 3, 2);
    this.bobberContainer.add(this.bobberSprite);

    // Initial cast splash
    if (!this.isRemote) play('splash');
    this.spawnRipple(waterX, waterY, 1.2);

    // 3. Fish shadow under water
    this.shadowGraphics = this.scene.add.graphics().setDepth(-8);

    // 4. BITE Exclamation Mark container
    this.exclamation = this.scene.add
      .container(waterX, waterY - 26)
      .setDepth(waterY + 10)
      .setVisible(false);
    const exG = this.scene.add.graphics();
    // Red glow
    exG.fillStyle(0xef4444, 0.4);
    exG.fillCircle(0, -4, 14);
    // Red mark
    exG.fillStyle(0xdc2626, 1);
    exG.lineStyle(2, 0xffffff, 1);
    exG.fillRoundedRect(-3, -16, 6, 13, 2);
    exG.strokeRoundedRect(-3, -16, 6, 13, 2);
    exG.fillCircle(0, 2, 3);
    exG.strokeCircle(0, 2, 3);
    this.exclamation.add(exG);
  }

  /** Triggers when BITE happens */
  triggerBite() {
    if (!this.active || this.isBite) return;
    this.isBite = true;
    this.isReeling = true;
    if (!this.isRemote) {
      play('bite');
      play('splash');
    }
    this.exclamation?.setVisible(true);
    this.spawnRipple(this.bobberCurrentX, this.bobberCurrentY, 1.6);
    this.spawnSplashes(this.bobberCurrentX, this.bobberCurrentY, 8);
    this.params?.onBite?.();
  }

  /** Player mashing space bar / tapping to reel */
  onMashReel(progressPercent: number) {
    if (!this.active) return;
    this.isReeling = true;
    this.rodFlex = Math.min(22, 10 + progressPercent * 0.12);
    this.bobberJitter = (Math.random() - 0.5) * 8;
    this.spawnRipple(this.bobberCurrentX, this.bobberCurrentY, 0.9);
    if (Math.random() > 0.4) {
      this.spawnSplashes(this.bobberCurrentX, this.bobberCurrentY, 3);
    }
  }

  /** Catch success animation: fish vaults from water into player hands */
  catchSuccess(fishSpeciesId: string, onComplete?: () => void) {
    this.isBite = false;
    this.isReeling = false;
    this.exclamation?.setVisible(false);
    play('pop');
    play('coin');

    if (!this.params) {
      this.cleanup();
      onComplete?.();
      return;
    }

    const startX = this.bobberCurrentX;
    const startY = this.bobberCurrentY;
    const endX = this.params.selfX;
    const endY = this.params.selfY - 20;

    // Big splash at catch location
    this.spawnSplashes(startX, startY, 14);
    this.spawnRipple(startX, startY, 2.2);

    // Remove in-water visuals
    this.shadowGraphics?.clear();
    this.lineGraphics?.clear();
    this.bobberContainer?.setVisible(false);

    // Parabolic vault arc for flying fish
    const fishGraphic = this.scene.add.graphics().setDepth(endY + 20);
    let t = 0;
    const arcTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 650,
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        t = arcTween.getValue() ?? 0;
        fishGraphic.clear();
        const curX = startX + (endX - startX) * t;
        const curY = startY + (endY - startY) * t - Math.sin(t * Math.PI) * 55;

        // Draw animated flying fish silhouette
        fishGraphic.fillStyle(0x38bdf8, 1);
        fishGraphic.lineStyle(1.5, 0xffffff, 1);
        fishGraphic.fillEllipse(curX, curY, 18, 9);
        fishGraphic.strokeEllipse(curX, curY, 18, 9);

        // Water droplets trailing behind
        if (Math.random() > 0.3) {
          fishGraphic.fillStyle(0xffffff, 0.8);
          fishGraphic.fillCircle(curX - 4 + (Math.random() - 0.5) * 6, curY + 6, 1.5);
        }
      },
      onComplete: () => {
        fishGraphic.destroy();
        this.cleanup();
        onComplete?.();
      },
    });
  }

  /** Called every frame in TownScene update */
  update(time: number, _delta: number) {
    if (!this.active) return;
    if (this.isReadyOnly) {
      this.drawRodOnly(time);
      return;
    }
    if (!this.params) return;

    const now = Date.now();
    const { selfX, selfY, nibbleTimes, shadowTier } = this.params;
    const rod = this.params.equippedRod ?? FISHING_RODS['rod_twig']!;
    const tierCfg = SHADOW_TIER_CONFIG[shadowTier] ?? SHADOW_TIER_CONFIG[1];

    // Compute Hand, Butt and Rod Coordinates based on character's facing direction
    let handX = selfX;
    let handY = selfY - 22;
    let buttX = selfX;
    let buttY = selfY - 16;
    let tipTargetX = selfX;
    let tipTargetY = selfY - 36;

    if (this.facingDir === 1) {
      // Facing LEFT towards water
      handX = selfX - 8;
      handY = selfY - 22;
      buttX = handX + 11;
      buttY = handY + 6;
      tipTargetX = selfX - 46;
      tipTargetY = selfY - 36;
    } else if (this.facingDir === 2) {
      // Facing RIGHT towards water
      handX = selfX + 8;
      handY = selfY - 22;
      buttX = handX - 11;
      buttY = handY + 6;
      tipTargetX = selfX + 46;
      tipTargetY = selfY - 36;
    } else {
      // Facing DOWN (south) into open lake
      handX = selfX + 3;
      handY = selfY - 20;
      buttX = handX - 4;
      buttY = handY - 10;
      tipTargetX = selfX + 22;
      tipTargetY = selfY - 2;
    }

    // Dynamic tip movement based on fishing phase
    let tipDipY = 0;
    let tipJitterX = 0;

    if (this.isReeling) {
      // Tug-of-war space mashing flex
      tipDipY = 14 + this.rodFlex * 0.75;
      tipJitterX = (Math.random() - 0.5) * 3;
    } else if (this.isBite) {
      // BITE bend
      tipDipY = 15 + Math.sin(time * 0.04) * 4;
      tipJitterX = Math.cos(time * 0.05) * 2;
    } else {
      // Idle breathing and nibble jolt
      const breathe = Math.sin(time * 0.003) * 1.5;
      tipDipY = breathe + Math.abs(this.bobberJitter) * 1.4;
    }

    this.rodTipX = tipTargetX + tipJitterX;
    this.rodTipY = tipTargetY + tipDipY;

    // Check Bite trigger
    if (now >= this.biteAt && !this.isBite) {
      this.triggerBite();
    }

    // 1. Update Bobber Physics
    const wave = Math.sin(time * 0.004) * 2;
    this.bobberCurrentX = this.bobberBaseX + this.bobberJitter;
    this.bobberCurrentY = this.bobberBaseY + wave + (this.isBite ? 4 : 0);
    this.bobberJitter *= 0.85;
    this.bobberContainer?.setPosition(this.bobberCurrentX, this.bobberCurrentY);

    if (this.isBite && this.exclamation) {
      const exBounce = Math.sin(time * 0.02) * 4;
      this.exclamation.setPosition(this.bobberCurrentX, this.bobberCurrentY - 26 + exBounce);
    }

    // 2. Draw Fishing Rod Held in Hands
    this.renderRodVisuals(selfY, handX, handY, buttX, buttY, rod);

    // 3. Draw Fishing Line from tip to bobber
    if (this.lineGraphics) {
      this.lineGraphics.clear();
      const sag = this.isBite || this.isReeling ? (Math.random() - 0.5) * 4 : 8;
      const midX = (this.rodTipX + this.bobberCurrentX) / 2;
      const midY = (this.rodTipY + this.bobberCurrentY) / 2 + sag;

      this.lineGraphics.lineStyle(1, 0xffffff, this.isReeling ? 0.95 : 0.7);
      this.lineGraphics.beginPath();
      this.lineGraphics.moveTo(this.rodTipX, this.rodTipY);
      for (let s = 1; s <= 8; s++) {
        const p = s / 8;
        const inv = 1 - p;
        const px = inv * inv * this.rodTipX + 2 * inv * p * midX + p * p * this.bobberCurrentX;
        const py = inv * inv * this.rodTipY + 2 * inv * p * midY + p * p * (this.bobberCurrentY - 6);
        this.lineGraphics.lineTo(px, py);
      }
      this.lineGraphics.strokePath();
    }

    // 4. In-World Fish Shadow Movement & Nibble Logic
    const firstNibble = nibbleTimes[0] ?? this.shadowAppearAt + 2000;
    let isRecoil = false;

    if (!this.isBite && !this.isReeling) {
      if (now < this.shadowAppearAt) {
        // Shadow has not appeared yet: calm water, waiting period (7-12s)
        this.shadowGraphics?.clear();
        if (Math.random() < 0.008) {
          this.spawnRipple(this.bobberCurrentX, this.bobberCurrentY, 0.7);
        }
      } else {
        if (!this.shadowSpawnedRipple) {
          this.shadowSpawnedRipple = true;
          // Water ripple where fish shadow emerges from depths
          this.spawnRipple(this.fishStartX, this.fishStartY, 1.4);
        }

        // Base idle hover point ~22px from bobber along the approach line
        const hoverDist = 22;
        const hoverTargetX = this.bobberBaseX + Math.cos(this.approachAngle) * hoverDist;
        const hoverTargetY = this.bobberBaseY + Math.sin(this.approachAngle) * hoverDist;

        if (now < firstNibble) {
          // Approaching phase: fish swims smoothly from lake depths to bobber hover point
          const approachDuration = Math.max(1, firstNibble - this.shadowAppearAt);
          const t = Math.min(1, Math.max(0, (now - this.shadowAppearAt) / approachDuration));
          const ease = 1 - Math.pow(1 - t, 3);
          this.fishCurrentX = this.fishStartX + (hoverTargetX - this.fishStartX) * ease;
          this.fishCurrentY = this.fishStartY + (hoverTargetY - this.fishStartY) * ease;
          this.fishAngle = Math.atan2(
            this.bobberBaseY - this.fishCurrentY,
            this.bobberBaseX - this.fishCurrentX,
          );
        } else {
          // Nibbling phase (4 to 8 distinct, lifelike nibbles)
          let activeNibbleIdx = -1;
          for (let i = 0; i < nibbleTimes.length; i++) {
            const nt = nibbleTimes[i]!;
            if (now >= nt) {
              activeNibbleIdx = i;
              if (now < nt + FISHING_NIBBLE_DURATION_MS && !this.playedNibbles.has(i)) {
                this.playedNibbles.add(i);
                if (!this.isRemote) {
                  play('nibble');
                }
                this.bobberJitter = (Math.random() - 0.5) * 8;
                this.spawnRipple(this.bobberCurrentX, this.bobberCurrentY, 1.15);
                this.params.onNibble?.(i);
              }
            } else {
              break;
            }
          }

          if (activeNibbleIdx >= 0) {
            const nibbleAt = nibbleTimes[activeNibbleIdx]!;
            const nextStrikeAt = nibbleTimes[activeNibbleIdx + 1] ?? this.biteAt;
            const pose = fishNibblePose(
              now - nibbleAt,
              nextStrikeAt - nibbleAt - FISHING_NIBBLE_DURATION_MS,
              this.nibbleApproachAngles[activeNibbleIdx] ?? this.approachAngle,
              this.params.nibbleOrbitTurns?.[activeNibbleIdx] ?? 1.5,
            );
            this.fishCurrentX = this.bobberBaseX + pose.x;
            this.fishCurrentY = this.bobberBaseY + pose.y;
            this.fishAngle = pose.angle;
            isRecoil = pose.isRecoil;
          } else {
            // Hovering between nibbles: attentive hovering facing bobber with gentle water drift
            const sway = Math.sin(time * 0.003 * tierCfg.swimSpeed) * 2.5;
            const breathe = Math.cos(time * 0.004) * 1.5;
            this.fishCurrentX = hoverTargetX + Math.cos(this.approachAngle + Math.PI / 2) * sway;
            this.fishCurrentY = hoverTargetY + Math.sin(this.approachAngle + Math.PI / 2) * sway + breathe;
            this.fishAngle = Math.atan2(
              this.bobberBaseY - this.fishCurrentY,
              this.bobberBaseX - this.fishCurrentX,
            );
          }
        }
      }
    } else {
      // BITE / Reeling: fish attached to bobber thrashing violently in water
      const thrash = Math.sin(time * 0.035 * tierCfg.wiggleSpeed) * 10;
      this.fishCurrentX = this.bobberCurrentX + Math.cos(time * 0.015) * 8;
      this.fishCurrentY = this.bobberCurrentY + 6 + thrash;
      this.fishAngle = Math.atan2(
        this.bobberCurrentY - this.fishCurrentY,
        this.bobberCurrentX - this.fishCurrentX,
      );
    }

    // 5. Render Real Water Fish Shadow
    if (this.shadowGraphics && (now >= this.shadowAppearAt || this.isBite || this.isReeling)) {
      this.shadowGraphics.clear();
      const fadeProgress = Math.min(1, Math.max(0.1, (now - this.shadowAppearAt) / 600));
      drawOrganicFishShadow(
        this.shadowGraphics,
        this.fishCurrentX,
        this.fishCurrentY,
        this.fishAngle,
        time,
        tierCfg,
        fadeProgress,
        this.isBite,
        isRecoil,
      );
    }

    // 6. Update Ripples
    this.ripples = this.ripples.filter((r) => {
      r.scale += 0.025;
      r.alpha -= 0.02;
      r.circle.setScale(r.scale);
      r.circle.setAlpha(r.alpha);
      if (r.alpha <= 0) {
        r.circle.destroy();
        return false;
      }
      return true;
    });

    // 7. Update Splashes
    this.splashes = this.splashes.filter((s) => {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.2;
      s.alpha -= 0.04;
      s.p.setPosition(s.x, s.y);
      s.p.setAlpha(s.alpha);
      if (s.alpha <= 0) {
        s.p.destroy();
        return false;
      }
      return true;
    });
  }

  private spawnRipple(x: number, y: number, initialScale = 1) {
    const c = this.scene.add.circle(x, y, 12, 0xffffff, 0).setDepth(-9);
    c.setStrokeStyle(1.2, 0xd6f1fa, 0.7);
    c.setScale(initialScale);
    this.ripples.push({ circle: c, alpha: 0.75, scale: initialScale });
  }

  private spawnSplashes(x: number, y: number, count = 6) {
    for (let i = 0; i < count; i++) {
      const p = this.scene.add.circle(x, y, 2, 0xffffff, 0.9).setDepth(y + 2);
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 1.2 + Math.random() * 2;
      this.splashes.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        p,
        alpha: 0.9,
      });
    }
  }

  private drawRodOnly(time: number) {
    const selfX = this.readySelfX;
    const selfY = this.readySelfY;
    const rod = this.readyRod ?? FISHING_RODS['rod_twig']!;

    let handX = selfX;
    let handY = selfY - 22;
    let buttX = selfX;
    let buttY = selfY - 16;
    let tipTargetX = selfX;
    let tipTargetY = selfY - 36;

    if (this.facingDir === 1) {
      handX = selfX - 8;
      handY = selfY - 22;
      buttX = handX + 11;
      buttY = handY + 6;
      tipTargetX = selfX - 46;
      tipTargetY = selfY - 36;
    } else if (this.facingDir === 2) {
      handX = selfX + 8;
      handY = selfY - 22;
      buttX = handX - 11;
      buttY = handY + 6;
      tipTargetX = selfX + 46;
      tipTargetY = selfY - 36;
    } else {
      handX = selfX + 3;
      handY = selfY - 20;
      buttX = handX - 4;
      buttY = handY - 10;
      tipTargetX = selfX + 22;
      tipTargetY = selfY - 2;
    }

    const breathe = Math.sin(time * 0.003) * 1.5;
    this.rodTipX = tipTargetX;
    this.rodTipY = tipTargetY + breathe;

    this.renderRodVisuals(selfY, handX, handY, buttX, buttY, rod);
  }

  private renderRodVisuals(
    selfY: number,
    handX: number,
    handY: number,
    buttX: number,
    buttY: number,
    rod: RodConfig,
  ) {
    if (!this.rodGraphics) return;
    const rg = this.rodGraphics;
    rg.clear();
    rg.setDepth(selfY + 6);

    let rodCol = 0x854d0e; // twig
    let rodLight = 0xa16207;
    let reelCol = 0x713f12;

    if (rod.id === 'rod_wooden') {
      rodCol = 0xb45309;
      rodLight = 0xd97706;
      reelCol = 0x451a03;
    } else if (rod.id === 'rod_fiberglass') {
      rodCol = 0x0284c7;
      rodLight = 0x38bdf8;
      reelCol = 0xe2e8f0;
    } else if (rod.id === 'rod_pro_carbon') {
      rodCol = 0x1e293b;
      rodLight = 0x475569;
      reelCol = 0xf59e0b;
    } else if (rod.id === 'rod_golden_legend') {
      rodCol = 0xf59e0b;
      rodLight = 0xfef08a;
      reelCol = 0xfbbf24;
    } else if (rod.id === 'rod_abyssal') {
      rodCol = 0x581c87;
      rodLight = 0xc084fc;
      reelCol = 0x06b6d4;
    }

    // Aura glow for legendary / abyssal rods
    if (rod.id === 'rod_golden_legend') {
      rg.fillStyle(0xfef08a, 0.22);
      rg.fillCircle((handX + this.rodTipX) / 2, (handY + this.rodTipY) / 2, 24);
    } else if (rod.id === 'rod_abyssal') {
      rg.fillStyle(0x06b6d4, 0.22);
      rg.fillCircle((handX + this.rodTipX) / 2, (handY + this.rodTipY) / 2, 22);
    }

    // A. Rod Grip / Handle (from butt to hand)
    rg.lineStyle(4.5, 0x1e293b, 1);
    rg.beginPath();
    rg.moveTo(buttX, buttY);
    rg.lineTo(handX, handY);
    rg.strokePath();

    // Butt cap (metallic trim)
    rg.fillStyle(rodLight, 1);
    rg.fillCircle(buttX, buttY, 2.5);

    // B. Spinning Reel
    const reelX = handX;
    const reelY = handY + 4;
    rg.fillStyle(0x0f172a, 1);
    rg.fillCircle(reelX, reelY, 4);
    rg.fillStyle(reelCol, 1);
    rg.fillCircle(reelX, reelY, 3);
    // Spool line band
    rg.fillStyle(0xffffff, 0.85);
    rg.fillRect(reelX - 2, reelY - 1.5, 4, 3);
    // Reel crank
    rg.lineStyle(1.5, 0x0f172a, 1);
    rg.lineBetween(reelX - 2, reelY + 2, reelX - 4, reelY + 5);

    // C. Curved Tapered Blank (Thân Cần Câu uốn cong)
    const midCtrlX = (handX + this.rodTipX) / 2;
    const midCtrlY = (handY + this.rodTipY) / 2 + (this.isReeling || this.isBite ? 8 : 2);

    const segments = 10;
    let prevX = handX;
    let prevY = handY;

    for (let s = 1; s <= segments; s++) {
      const p = s / segments;
      const inv = 1 - p;
      const curX = inv * inv * handX + 2 * inv * p * midCtrlX + p * p * this.rodTipX;
      const curY = inv * inv * handY + 2 * inv * p * midCtrlY + p * p * this.rodTipY;

      // Taper width from 3.5px down to 1.2px
      const w = 3.5 * (1 - p * 0.65);
      rg.lineStyle(w, rodCol, 1);
      rg.lineBetween(prevX, prevY, curX, curY);

      // Highlight stripe along top of blank
      rg.lineStyle(Math.max(1, w * 0.4), rodLight, 0.7);
      rg.lineBetween(prevX, prevY - 0.5, curX, curY - 0.5);

      prevX = curX;
      prevY = curY;
    }

    // D. Guides (Khoen cần) along the blank
    [0.32, 0.62, 0.88].forEach((gp) => {
      const inv = 1 - gp;
      const gx = inv * inv * handX + 2 * inv * gp * midCtrlX + gp * gp * this.rodTipX;
      const gy = inv * inv * handY + 2 * inv * gp * midCtrlY + gp * gp * this.rodTipY;
      rg.fillStyle(0xffffff, 0.9);
      rg.fillCircle(gx, gy - 1.5, 1.5);
    });

    // E. Special rod flourishes
    if (rod.id === 'rod_twig') {
      const leafP = 0.38;
      const lx =
        (1 - leafP) * (1 - leafP) * handX + 2 * (1 - leafP) * leafP * midCtrlX + leafP * leafP * this.rodTipX;
      const ly =
        (1 - leafP) * (1 - leafP) * handY + 2 * (1 - leafP) * leafP * midCtrlY + leafP * leafP * this.rodTipY;
      rg.fillStyle(0x22c55e, 1);
      rg.fillEllipse(lx - 2, ly - 3, 5, 2.5);
    } else if (rod.id === 'rod_pro_carbon') {
      [0.32, 0.62].forEach((gp) => {
        const inv = 1 - gp;
        const gx = inv * inv * handX + 2 * inv * gp * midCtrlX + gp * gp * this.rodTipX;
        const gy = inv * inv * handY + 2 * inv * gp * midCtrlY + gp * gp * this.rodTipY;
        rg.fillStyle(0xef4444, 1);
        rg.fillRect(gx - 1.5, gy - 2, 3, 4);
      });
    } else if (rod.id === 'rod_golden_legend') {
      rg.fillStyle(0xef4444, 1);
      rg.fillCircle(this.rodTipX, this.rodTipY, 2.5);
    }

    // F. Character's Hands Gripping Handle (Đôi bàn tay ôm chặt cán cần)
    const skinColor = 0xf6d3b3;
    rg.fillStyle(skinColor, 1);
    rg.lineStyle(1, 0x1e293b, 0.8);
    rg.fillCircle(handX, handY, 3.5);
    rg.strokeCircle(handX, handY, 3.5);

    const backHandX = buttX + (handX - buttX) * 0.45;
    const backHandY = buttY + (handY - buttY) * 0.45;
    rg.fillCircle(backHandX, backHandY, 3.2);
    rg.strokeCircle(backHandX, backHandY, 3.2);
  }

  cleanupVisuals() {
    this.lineGraphics?.destroy();
    this.lineGraphics = null;
    this.shadowGraphics?.destroy();
    this.shadowGraphics = null;
    this.bobberContainer?.destroy();
    this.bobberContainer = null;
    this.bobberSprite = null;
    this.exclamation?.destroy();
    this.exclamation = null;
    this.flyingFish?.destroy();
    this.flyingFish = null;
    this.ripples.forEach((r) => r.circle.destroy());
    this.ripples = [];
    this.splashes.forEach((s) => s.p.destroy());
    this.splashes = [];
  }

  cleanup() {
    this.active = false;
    this.isReadyOnly = false;
    this.readyRod = null;
    this.params = null;
    if (!this.isRemote) {
      (this.scene as unknown as { setSelfFishing?: (isFishing: boolean) => void }).setSelfFishing?.(false);
    }
    this.rodGraphics?.destroy();
    this.rodGraphics = null;
    this.cleanupVisuals();
  }
}

/**
 * Renders an organic, biologically contoured aquatic fish shadow with traveling spine wave,
 * flared pectoral fins, forked caudal fin, and realistic underwater lighting/depth shading.
 */
function drawOrganicFishShadow(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  angle: number,
  time: number,
  tierCfg: (typeof SHADOW_TIER_CONFIG)[FishShadowTier],
  fadeAlpha: number,
  isBite: boolean,
  isRecoil: boolean,
) {
  const len = tierCfg.lengthPx;
  const wid = tierCfg.widthPx;
  const wiggleSpeed = tierCfg.wiggleSpeed;

  g.save();
  g.translateCanvas(cx, cy);
  g.rotateCanvas(angle);

  // 1. Soft underwater depth blur / shadow beneath the fish
  g.fillStyle(0x041320, 0.28 * fadeAlpha);
  g.fillEllipse(-len * 0.05, 3.5, len * 1.05, wid * 0.95);

  // 2. High Tier Radiant Aura (Apex / Mythic / Crown)
  if (tierCfg.hasGlow || tierCfg.hasCrown) {
    const auraColor = tierCfg.hasCrown ? 0xfef08a : 0x38bdf8;
    const pulse = 1 + Math.sin(time * 0.005) * 0.12;
    g.fillStyle(auraColor, 0.18 * fadeAlpha);
    g.fillCircle(0, 0, len * 0.65 * pulse);
    g.fillStyle(auraColor, 0.08 * fadeAlpha);
    g.fillCircle(0, 0, len * 0.95 * pulse);
  }

  // Calculate animated spine wave along the fish body
  const spineWave1 = Math.sin(time * 0.007 * wiggleSpeed) * (isBite ? 7 : 2.5);
  const spineWave2 = Math.sin(time * 0.007 * wiggleSpeed - 1.2) * (isBite ? 11 : 4.5);
  const spineWave3 = Math.sin(time * 0.007 * wiggleSpeed - 2.4) * (isBite ? 16 : 7.5);

  // Primary Silhouette Color (deep underwater aquatic silhouette)
  const bodyColor = 0x0f273d;
  g.fillStyle(bodyColor, 0.88 * fadeAlpha);

  // A. Pectoral Fins (Left & Right)
  const finFlutter = Math.sin(time * 0.008 * wiggleSpeed) * 3;
  const finLen = wid * 0.9;
  const finBaseX = len * 0.12;
  const finSpreadY = wid * 0.42;

  // Upper fin
  g.beginPath();
  g.moveTo(finBaseX, -finSpreadY);
  g.lineTo(finBaseX - finLen * 0.8, -finSpreadY - finLen - (isRecoil ? 4 : finFlutter));
  g.lineTo(finBaseX - finLen * 0.3, -finSpreadY - finLen * 0.4);
  g.closePath();
  g.fillPath();

  // Lower fin
  g.beginPath();
  g.moveTo(finBaseX, finSpreadY);
  g.lineTo(finBaseX - finLen * 0.8, finSpreadY + finLen + (isRecoil ? 4 : finFlutter));
  g.lineTo(finBaseX - finLen * 0.3, finSpreadY + finLen * 0.4);
  g.closePath();
  g.fillPath();

  // B. Caudal (Tail) Fin (Forked / Crescent Tail)
  const tailBaseX = -len * 0.48;
  const tailBaseY = spineWave2;
  const tailTipX = -len * 0.74;
  const tailSpread = wid * (isBite ? 1.1 : 0.85);

  g.beginPath();
  g.moveTo(tailBaseX, tailBaseY);
  // Upper lobe
  g.lineTo(tailTipX, tailBaseY - tailSpread + spineWave3);
  // Middle notch of tail fork
  g.lineTo(tailTipX + len * 0.12, tailBaseY + spineWave3 * 0.7);
  // Lower lobe
  g.lineTo(tailTipX, tailBaseY + tailSpread + spineWave3);
  g.closePath();
  g.fillPath();

  // C. Main Streamlined Body (smooth organic fish silhouette using curved path)
  const snoutX = len * 0.5;
  const snoutY = 0;
  const gillsX = len * 0.18;
  const gillsHalfW = wid * 0.5;
  const midX = -len * 0.12;
  const midHalfW = wid * 0.38;
  const peduncleX = -len * 0.42;
  const peduncleHalfW = wid * 0.14;

  g.beginPath();
  g.moveTo(snoutX, snoutY);
  g.lineTo(gillsX, -gillsHalfW + spineWave1 * 0.2);
  g.lineTo(midX, -midHalfW + spineWave1);
  g.lineTo(peduncleX, -peduncleHalfW + spineWave2);
  g.lineTo(tailBaseX, tailBaseY);
  g.lineTo(peduncleX, peduncleHalfW + spineWave2);
  g.lineTo(midX, midHalfW + spineWave1);
  g.lineTo(gillsX, gillsHalfW + spineWave1 * 0.2);
  g.closePath();
  g.fillPath();

  // D. Subtle Translucent Dorsal Ridge Highlight (gives realistic 3D volume in water)
  g.lineStyle(Math.max(1, wid * 0.18), 0x2dd4bf, 0.25 * fadeAlpha);
  g.beginPath();
  g.moveTo(gillsX, spineWave1 * 0.2);
  g.lineTo(midX, spineWave1);
  g.lineTo(peduncleX, spineWave2);
  g.strokePath();

  // E. Golden Royal Crown on Head (Crown Tier - Tier 6)
  if (tierCfg.hasCrown) {
    const crownX = snoutX - 6;
    g.fillStyle(0xfbbf24, fadeAlpha);
    g.lineStyle(1, 0xffffff, fadeAlpha);
    g.fillTriangle(crownX - 10, -5, crownX - 6, -14, crownX - 2, -5);
    g.fillTriangle(crownX - 4, -5, crownX + 2, -18, crownX + 8, -5);
    g.fillTriangle(crownX + 6, -5, crownX + 10, -14, crownX + 14, -5);
    g.fillRect(crownX - 10, -5, 24, 3);
    g.fillStyle(0xef4444, fadeAlpha);
    g.fillCircle(crownX + 2, -17, 2.5);
  }

  g.restore();
}
