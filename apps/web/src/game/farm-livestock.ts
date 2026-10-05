import { FARM_POIS } from '@cozy/game-data';
import Phaser from 'phaser';
import { play } from '../lib/sound';
import { useUi } from '../lib/store';

export interface LivestockConfig {
  id: string;
  kind: 'chicken' | 'cow';
  x: number;
  y: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export class FarmLivestockManager {
  private scene: Phaser.Scene;
  private chickens: Phaser.GameObjects.Sprite[] = [];
  private cows: Phaser.GameObjects.Sprite[] = [];
  private wanderTimer: Phaser.Time.TimerEvent | null = null;
  private loaded = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async loadAssets(): Promise<void> {
    if (this.loaded) return;

    await Promise.all([
      this.loadImageAsSpritesheet(
        'sprout:chicken',
        '/farm/sprout/Characters/Free Chicken Sprites.png',
        16,
        16,
      ),
      this.loadImageAsSpritesheet('sprout:cow', '/farm/sprout/Characters/Free Cow Sprites.png', 32, 32),
    ]);

    this.registerAnimations();
    this.loaded = true;
  }

  private loadImageAsSpritesheet(
    key: string,
    src: string,
    frameWidth: number,
    frameHeight: number,
  ): Promise<void> {
    if (this.scene.textures.exists(key)) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.scene.textures.addSpriteSheet(key, img, { frameWidth, frameHeight });
        resolve();
      };
      img.onerror = () => {
        resolve();
      };
      img.src = src;
    });
  }

  private registerAnimations() {
    // Chickens: 4 frames per row, 2 rows
    if (this.scene.textures.exists('sprout:chicken') && !this.scene.anims.exists('sprout:chicken:idle')) {
      this.scene.anims.create({
        key: 'sprout:chicken:idle',
        frames: this.scene.anims.generateFrameNumbers('sprout:chicken', { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      });
    }
    if (this.scene.textures.exists('sprout:chicken') && !this.scene.anims.exists('sprout:chicken:peck')) {
      this.scene.anims.create({
        key: 'sprout:chicken:peck',
        frames: this.scene.anims.generateFrameNumbers('sprout:chicken', { start: 2, end: 3 }),
        frameRate: 3,
        repeat: -1,
      });
    }
    if (this.scene.textures.exists('sprout:chicken') && !this.scene.anims.exists('sprout:chicken:walk')) {
      this.scene.anims.create({
        key: 'sprout:chicken:walk',
        frames: this.scene.anims.generateFrameNumbers('sprout:chicken', { start: 4, end: 7 }),
        frameRate: 6,
        repeat: -1,
      });
    }

    // Cows: 3 frames per row, 2 rows
    if (this.scene.textures.exists('sprout:cow') && !this.scene.anims.exists('sprout:cow:idle')) {
      this.scene.anims.create({
        key: 'sprout:cow:idle',
        frames: this.scene.anims.generateFrameNumbers('sprout:cow', { start: 0, end: 2 }),
        frameRate: 2,
        repeat: -1,
      });
    }
    if (this.scene.textures.exists('sprout:cow') && !this.scene.anims.exists('sprout:cow:walk')) {
      this.scene.anims.create({
        key: 'sprout:cow:walk',
        frames: this.scene.anims.generateFrameNumbers('sprout:cow', { start: 3, end: 5 }),
        frameRate: 4,
        repeat: -1,
      });
    }
  }

  spawnLivestock() {
    const p = FARM_POIS.poultry_coop;
    const chickenSpawns = [0, 1, 2, 3].map((i) => ({ x: p.x + 64 + i * 60, y: p.y + 88 + (i % 2) * 24 }));
    const chickenBounds = { minX: p.x + 24, maxX: p.x + p.w - 24, minY: p.y + 80, maxY: p.y + p.h - 24 };
    for (const pos of chickenSpawns) {
      if (!this.scene.textures.exists('sprout:chicken')) break;
      const chicken = this.scene.add.sprite(pos.x, pos.y, 'sprout:chicken', 0);
      chicken.setScale(2.0); // 16x16 -> 32x32 integer scale
      chicken.setDepth(pos.y);
      chicken.play('sprout:chicken:idle');
      chicken.setData('bounds', chickenBounds);
      chicken.setData('isWalking', false);

      chicken.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.interactWithAnimal(chicken, 'Gà ri mổ thóc vui vẻ! 🐔');
      });

      this.chickens.push(chicken);
    }

    const pasture = FARM_POIS.cattle_pasture;
    const cowSpawns = [0, 1].map((i) => ({ x: pasture.x + 72 + i * 100, y: pasture.y + 100 }));
    const cowBounds = {
      minX: pasture.x + 40,
      maxX: pasture.x + pasture.w - 40,
      minY: pasture.y + 92,
      maxY: pasture.y + pasture.h - 36,
    };
    for (const pos of cowSpawns) {
      if (!this.scene.textures.exists('sprout:cow')) break;
      const cow = this.scene.add.sprite(pos.x, pos.y, 'sprout:cow', 0);
      cow.setScale(2.0); // 32x32 -> 64x64 integer scale
      cow.setDepth(pos.y);
      cow.play('sprout:cow:idle');
      cow.setData('bounds', cowBounds);
      cow.setData('isWalking', false);

      cow.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.interactWithAnimal(cow, 'Bò sữa thong thả nhai cỏ! 🐄');
      });

      this.cows.push(cow);
    }

    // Start Wander Loop
    this.wanderTimer = this.scene.time.addEvent({
      delay: 3500,
      callback: () => this.wanderStep(),
      loop: true,
    });
  }

  private wanderStep() {
    if (useUi.getState().reducedMotion) return;
    // Chickens wander
    for (const c of this.chickens) {
      if (c.getData('isWalking')) continue;
      const roll = Math.random();
      if (roll < 0.4) {
        c.play('sprout:chicken:peck', true);
      } else if (roll < 0.7) {
        c.play('sprout:chicken:idle', true);
      } else {
        this.walkToRandomSpot(c, 'sprout:chicken:walk', 'sprout:chicken:idle', 45);
      }
    }

    // Cows wander
    for (const cow of this.cows) {
      if (cow.getData('isWalking')) continue;
      const roll = Math.random();
      if (roll < 0.6) {
        cow.play('sprout:cow:idle', true);
      } else {
        this.walkToRandomSpot(cow, 'sprout:cow:walk', 'sprout:cow:idle', 30);
      }
    }
  }

  private walkToRandomSpot(
    sprite: Phaser.GameObjects.Sprite,
    walkAnim: string,
    idleAnim: string,
    speed: number,
  ) {
    const b = sprite.getData('bounds') as { minX: number; maxX: number; minY: number; maxY: number };
    if (!b) return;

    // Pick random target in bounds within 60px
    const targetX = Phaser.Math.Clamp(sprite.x + (Math.random() - 0.5) * 120, b.minX, b.maxX);
    const targetY = Phaser.Math.Clamp(sprite.y + (Math.random() - 0.5) * 100, b.minY, b.maxY);
    const dist = Math.hypot(targetX - sprite.x, targetY - sprite.y);
    if (dist < 10) return;

    sprite.setData('isWalking', true);
    sprite.setFlipX(targetX < sprite.x);
    sprite.play(walkAnim, true);

    const duration = (dist / speed) * 1000;
    this.scene.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      duration,
      onUpdate: () => {
        sprite.setDepth(sprite.y);
      },
      onComplete: () => {
        sprite.setData('isWalking', false);
        sprite.play(idleAnim, true);
      },
    });
  }

  interactWithAnimal(sprite: Phaser.GameObjects.Sprite, message: string) {
    play('pop');
    useUi.getState().toast({ kind: 'reward', title: 'Thân Thiện', body: message });

    // Little happy hop animation
    this.scene.tweens.add({
      targets: sprite,
      y: sprite.y - 8,
      duration: 150,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Floating heart emote
    const heart = this.scene.add
      .text(sprite.x, sprite.y - 24, '❤️', { fontSize: '18px' })
      .setOrigin(0.5)
      .setDepth(9999);

    this.scene.tweens.add({
      targets: heart,
      y: heart.y - 20,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => heart.destroy(),
    });
  }

  getNearestAnimal(x: number, y: number, radius = 50): Phaser.GameObjects.Sprite | null {
    let nearest: Phaser.GameObjects.Sprite | null = null;
    let minDist = radius;

    const all = [...this.chickens, ...this.cows];
    for (const a of all) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = a;
      }
    }
    return nearest;
  }

  destroy() {
    if (this.wanderTimer) {
      this.wanderTimer.destroy();
      this.wanderTimer = null;
    }
    this.chickens.forEach((c) => c.destroy());
    this.cows.forEach((c) => c.destroy());
    this.chickens = [];
    this.cows = [];
  }
}
