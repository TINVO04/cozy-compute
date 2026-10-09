import { FARM_POIS } from '@cozy/game-data';
import Phaser from 'phaser';
import {
  paintChickenSpritesheet,
  paintCowSpritesheet,
  paintDuckSpritesheet,
  paintGoatSpritesheet,
  paintPigSpritesheet,
  paintSheepSpritesheet,
} from '../art/farm-animals';
import { play } from '../lib/sound';
import { useUi } from '../lib/store';

export interface LivestockConfig {
  id: string;
  kind: 'chicken' | 'duck' | 'cow' | 'pig' | 'goat' | 'sheep';
  x: number;
  y: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export class FarmLivestockManager {
  private scene: Phaser.Scene;
  private animals: Phaser.GameObjects.Sprite[] = [];
  private wanderTimer: Phaser.Time.TimerEvent | null = null;
  private loaded = false;
  private spawned = false;
  private destroyed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async loadAssets(): Promise<void> {
    if (this.loaded || this.destroyed) return;

    // Procedural spritesheets for Duck, Pig, Goat, Sheep
    if (!this.scene.textures.exists('farm:duck')) {
      this.scene.textures.addSpriteSheet('farm:duck', paintDuckSpritesheet() as unknown as HTMLImageElement, {
        frameWidth: 16,
        frameHeight: 16,
      });
    }
    if (!this.scene.textures.exists('farm:pig')) {
      this.scene.textures.addSpriteSheet('farm:pig', paintPigSpritesheet() as unknown as HTMLImageElement, {
        frameWidth: 24,
        frameHeight: 20,
      });
    }
    if (!this.scene.textures.exists('farm:goat')) {
      this.scene.textures.addSpriteSheet('farm:goat', paintGoatSpritesheet() as unknown as HTMLImageElement, {
        frameWidth: 24,
        frameHeight: 24,
      });
    }
    if (!this.scene.textures.exists('farm:sheep')) {
      this.scene.textures.addSpriteSheet(
        'farm:sheep',
        paintSheepSpritesheet() as unknown as HTMLImageElement,
        {
          frameWidth: 24,
          frameHeight: 24,
        },
      );
    }

    // Load chicken and cow with procedural fallbacks
    await Promise.all([
      this.loadImageAsSpritesheet(
        'sprout:chicken',
        '/farm/sprout/Characters/Free Chicken Sprites.png',
        16,
        16,
        () => paintChickenSpritesheet(),
      ),
      this.loadImageAsSpritesheet('sprout:cow', '/farm/sprout/Characters/Free Cow Sprites.png', 32, 32, () =>
        paintCowSpritesheet(),
      ),
    ]);

    if (this.destroyed) return;
    this.registerAnimations();
    this.loaded = true;
  }

  private loadImageAsSpritesheet(
    key: string,
    src: string,
    frameWidth: number,
    frameHeight: number,
    fallbackPainter?: () => HTMLCanvasElement,
  ): Promise<void> {
    if (this.scene.textures.exists(key)) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (!this.destroyed && !this.scene.textures.exists(key)) {
          this.scene.textures.addSpriteSheet(key, img, { frameWidth, frameHeight });
        }
        resolve();
      };
      img.onerror = () => {
        if (!this.destroyed && !this.scene.textures.exists(key) && fallbackPainter) {
          this.scene.textures.addSpriteSheet(key, fallbackPainter() as unknown as HTMLImageElement, {
            frameWidth,
            frameHeight,
          });
        }
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
        frames: this.scene.anims.generateFrameNumbers('sprout:chicken', { frames: [0, 1, 0, 1] }),
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

    // Ducks: 4 frames total (0-1 idle, 2-3 walk)
    if (this.scene.textures.exists('farm:duck') && !this.scene.anims.exists('farm:duck:idle')) {
      this.scene.anims.create({
        key: 'farm:duck:idle',
        frames: this.scene.anims.generateFrameNumbers('farm:duck', { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      });
    }
    if (this.scene.textures.exists('farm:duck') && !this.scene.anims.exists('farm:duck:walk')) {
      this.scene.anims.create({
        key: 'farm:duck:walk',
        frames: this.scene.anims.generateFrameNumbers('farm:duck', { start: 2, end: 3 }),
        frameRate: 5,
        repeat: -1,
      });
    }

    // Cows: 3 frames per row, 2 rows (Row 0: 0-2 idle/chew, Row 1: 3-4 walk, frame 5 is blank!)
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
        frames: this.scene.anims.generateFrameNumbers('sprout:cow', { start: 3, end: 4 }),
        frameRate: 4,
        repeat: -1,
      });
    }

    // Pigs: 4 frames total (0-1 idle, 2-3 walk)
    if (this.scene.textures.exists('farm:pig') && !this.scene.anims.exists('farm:pig:idle')) {
      this.scene.anims.create({
        key: 'farm:pig:idle',
        frames: this.scene.anims.generateFrameNumbers('farm:pig', { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      });
    }
    if (this.scene.textures.exists('farm:pig') && !this.scene.anims.exists('farm:pig:walk')) {
      this.scene.anims.create({
        key: 'farm:pig:walk',
        frames: this.scene.anims.generateFrameNumbers('farm:pig', { start: 2, end: 3 }),
        frameRate: 5,
        repeat: -1,
      });
    }

    // Goats: 4 frames total (0-1 idle, 2-3 walk)
    if (this.scene.textures.exists('farm:goat') && !this.scene.anims.exists('farm:goat:idle')) {
      this.scene.anims.create({
        key: 'farm:goat:idle',
        frames: this.scene.anims.generateFrameNumbers('farm:goat', { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      });
    }
    if (this.scene.textures.exists('farm:goat') && !this.scene.anims.exists('farm:goat:walk')) {
      this.scene.anims.create({
        key: 'farm:goat:walk',
        frames: this.scene.anims.generateFrameNumbers('farm:goat', { start: 2, end: 3 }),
        frameRate: 5,
        repeat: -1,
      });
    }

    // Sheep: 4 frames total (0-1 idle, 2-3 walk)
    if (this.scene.textures.exists('farm:sheep') && !this.scene.anims.exists('farm:sheep:idle')) {
      this.scene.anims.create({
        key: 'farm:sheep:idle',
        frames: this.scene.anims.generateFrameNumbers('farm:sheep', { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      });
    }
    if (this.scene.textures.exists('farm:sheep') && !this.scene.anims.exists('farm:sheep:walk')) {
      this.scene.anims.create({
        key: 'farm:sheep:walk',
        frames: this.scene.anims.generateFrameNumbers('farm:sheep', { start: 2, end: 3 }),
        frameRate: 4,
        repeat: -1,
      });
    }
  }

  spawnLivestock() {
    if (this.spawned || this.destroyed || !this.scene.sys) return;
    this.spawned = true;

    // 1. Poultry Coop (Chuồng Gia Cầm): Đàn Gà Ri Thả Vườn Đồng Nhất Phong Cách Pixel Art
    const coop = FARM_POIS.poultry_coop;
    const chickenBounds = {
      minX: coop.x + 28,
      maxX: coop.x + coop.w - 28,
      minY: coop.y + 76,
      maxY: coop.y + coop.h - 18,
    };

    // Đàn Gà Ri: Gà Trống, Gà Mái & Đàn Gà Con (tỷ lệ cân đối chuẩn nông trại cozy)
    const chickenFamily = [
      {
        role: 'rooster',
        label: 'Gà trống gáy vang ó o o đón bình minh! 🐓',
        x: coop.x + 80,
        y: coop.y + 92,
        scale: 1.4,
        speed: 48,
      },
      {
        role: 'hen',
        label: 'Gà mái nhảy ổ cục ta cục tác đẻ trứng! 🐔',
        x: coop.x + 160,
        y: coop.y + 115,
        scale: 1.2,
        speed: 42,
      },
      {
        role: 'hen',
        label: 'Gà mái chăm chỉ bới rơm tìm mồi! 🐔',
        x: coop.x + 240,
        y: coop.y + 95,
        scale: 1.2,
        speed: 40,
      },
      {
        role: 'chick',
        label: 'Gà con lông vàng lon ton mổ thóc! 🐥',
        x: coop.x + 120,
        y: coop.y + 122,
        scale: 0.85,
        speed: 36,
      },
      {
        role: 'chick',
        label: 'Gà con chíp chíp ríu rít quanh mẹ! 🐥',
        x: coop.x + 200,
        y: coop.y + 110,
        scale: 0.85,
        speed: 38,
      },
    ];

    for (const member of chickenFamily) {
      if (!this.scene.textures.exists('sprout:chicken')) break;
      const c = this.scene.add.sprite(member.x, member.y, 'sprout:chicken', 0);
      c.setScale(member.scale);
      c.setDepth(member.y);
      if (this.scene.anims.exists('sprout:chicken:idle')) c.play('sprout:chicken:idle');
      c.setData('kind', 'chicken');
      c.setData('role', member.role);
      c.setData('bounds', chickenBounds);
      c.setData('isWalking', false);
      c.setData('walkAnim', 'sprout:chicken:walk');
      c.setData('idleAnim', 'sprout:chicken:idle');
      c.setData('peckAnim', 'sprout:chicken:peck');
      c.setData('speed', member.speed);
      c.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.interactWithAnimal(c, member.label);
      });
      this.animals.push(c);
    }

    // 2. Cattle Pasture (Đồng Cỏ Bò Sữa): 2 Bò Sữa (tỷ lệ lớn 2.2x)
    const pasture = FARM_POIS.cattle_pasture;
    const cowBounds = {
      minX: pasture.x + 36,
      maxX: pasture.x + pasture.w - 36,
      minY: pasture.y + 80,
      maxY: pasture.y + pasture.h - 22,
    };
    const cowSpawns = [
      { x: pasture.x + 75, y: pasture.y + 98 },
      { x: pasture.x + 180, y: pasture.y + 115 },
    ];
    for (const pos of cowSpawns) {
      if (!this.scene.textures.exists('sprout:cow')) break;
      const cow = this.scene.add.sprite(pos.x, pos.y, 'sprout:cow', 0);
      cow.setScale(2.2);
      cow.setDepth(pos.y);
      if (this.scene.anims.exists('sprout:cow:idle')) cow.play('sprout:cow:idle');
      cow.setData('kind', 'cow');
      cow.setData('bounds', cowBounds);
      cow.setData('isWalking', false);
      cow.setData('walkAnim', 'sprout:cow:walk');
      cow.setData('idleAnim', 'sprout:cow:idle');
      cow.setData('speed', 30);
      cow.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.interactWithAnimal(cow, 'Bò sữa thong thả nhai cỏ mật! 🐄');
      });
      this.animals.push(cow);
    }

    // 3. Pig Pen (Chuồng Heo): 3 Heo Mọi Tắm Bùn (tỷ lệ vừa 1.8x)
    const pigPen = FARM_POIS.pig_pen;
    const pigBounds = {
      minX: pigPen.x + 32,
      maxX: pigPen.x + pigPen.w - 32,
      minY: pigPen.y + 74,
      maxY: pigPen.y + pigPen.h - 20,
    };
    const pigSpawns = [
      { x: pigPen.x + 65, y: pigPen.y + 95 },
      { x: pigPen.x + 160, y: pigPen.y + 118 },
      { x: pigPen.x + 245, y: pigPen.y + 102 },
    ];
    for (const pos of pigSpawns) {
      if (!this.scene.textures.exists('farm:pig')) break;
      const pig = this.scene.add.sprite(pos.x, pos.y, 'farm:pig', 0);
      pig.setScale(1.8);
      pig.setDepth(pos.y);
      if (this.scene.anims.exists('farm:pig:idle')) pig.play('farm:pig:idle');
      pig.setData('kind', 'pig');
      pig.setData('bounds', pigBounds);
      pig.setData('isWalking', false);
      pig.setData('walkAnim', 'farm:pig:walk');
      pig.setData('idleAnim', 'farm:pig:idle');
      pig.setData('speed', 32);
      pig.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.interactWithAnimal(pig, 'Heo mọi ủi bùn vui vẻ! 🐷');
      });
      this.animals.push(pig);
    }

    // 4. Goat Pen (Chuồng Dê & Cừu): 2 Dê Bách Thảo và 1 Cừu Phan Rang (tỷ lệ 1.8x)
    const goatPen = FARM_POIS.goat_pen;
    const goatBounds = {
      minX: goatPen.x + 30,
      maxX: goatPen.x + goatPen.w - 30,
      minY: goatPen.y + 68,
      maxY: goatPen.y + goatPen.h - 18,
    };
    const goatSpawns = [
      { x: goatPen.x + 55, y: goatPen.y + 88 },
      { x: goatPen.x + 120, y: goatPen.y + 104 },
    ];
    for (const pos of goatSpawns) {
      if (!this.scene.textures.exists('farm:goat')) break;
      const goat = this.scene.add.sprite(pos.x, pos.y, 'farm:goat', 0);
      goat.setScale(1.8);
      goat.setDepth(pos.y);
      if (this.scene.anims.exists('farm:goat:idle')) goat.play('farm:goat:idle');
      goat.setData('kind', 'goat');
      goat.setData('bounds', goatBounds);
      goat.setData('isWalking', false);
      goat.setData('walkAnim', 'farm:goat:walk');
      goat.setData('idleAnim', 'farm:goat:idle');
      goat.setData('speed', 36);
      goat.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.interactWithAnimal(goat, 'Dê bách thảo nhai rơm ngon lành! 🐐');
      });
      this.animals.push(goat);
    }

    // 1 Cừu
    if (this.scene.textures.exists('farm:sheep')) {
      const sheepPos = { x: goatPen.x + 175, y: goatPen.y + 92 };
      const sheep = this.scene.add.sprite(sheepPos.x, sheepPos.y, 'farm:sheep', 0);
      sheep.setScale(1.8);
      sheep.setDepth(sheepPos.y);
      if (this.scene.anims.exists('farm:sheep:idle')) sheep.play('farm:sheep:idle');
      sheep.setData('kind', 'sheep');
      sheep.setData('bounds', goatBounds);
      sheep.setData('isWalking', false);
      sheep.setData('walkAnim', 'farm:sheep:walk');
      sheep.setData('idleAnim', 'farm:sheep:idle');
      sheep.setData('speed', 28);
      sheep.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.interactWithAnimal(sheep, 'Cừu Phan Rang bông xù đáng yêu! 🐑');
      });
      this.animals.push(sheep);
    }

    // A small ambient duck family swims inside the safe inner pond basin.
    const pond = FARM_POIS.aquaculture_pond;
    for (let i = 0; i < 3; i++) {
      const duck = this.scene.add.sprite(pond.x + 143 + i * 31, pond.y + 110 + i * 14, 'farm:duck', 0);
      duck.setScale(i === 0 ? 1.5 : 1.1).setDepth(duck.y);
      duck.setData('kind', 'duck');
      duck.setData('bounds', {
        minX: pond.x + 112,
        maxX: pond.x + 278,
        minY: pond.y + 98,
        maxY: pond.y + 178,
      });
      duck.setData('isWalking', false);
      duck.setData('walkAnim', 'farm:duck:idle');
      duck.setData('idleAnim', 'farm:duck:idle');
      duck.setData('speed', 14);
      if (!useUi.getState().reducedMotion) duck.play('farm:duck:idle');
      duck.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.interactWithAnimal(duck, 'Đàn vịt nối đuôi nhau bơi giữa những bông sen. 🦆');
      });
      this.animals.push(duck);
    }

    // Start Wander Loop
    this.wanderTimer = this.scene.time.addEvent({
      delay: 3200,
      callback: () => this.wanderStep(),
      loop: true,
    });
  }

  private wanderStep() {
    if (this.destroyed || useUi.getState().reducedMotion) return;

    for (const sprite of this.animals) {
      if (!sprite || !sprite.active || sprite.getData('isWalking')) continue;
      const idleAnim = sprite.getData('idleAnim') as string;
      const walkAnim = sprite.getData('walkAnim') as string;
      const peckAnim = sprite.getData('peckAnim') as string | undefined;
      const speed = (sprite.getData('speed') as number) || 35;

      const roll = Math.random();
      if (peckAnim && roll < 0.35) {
        sprite.play(peckAnim, true);
      } else if (roll < 0.6) {
        sprite.play(idleAnim, true);
      } else {
        this.walkToRandomSpot(sprite, walkAnim, idleAnim, speed);
      }
    }
  }

  private walkToRandomSpot(
    sprite: Phaser.GameObjects.Sprite,
    walkAnim: string,
    idleAnim: string,
    speed: number,
  ) {
    if (this.destroyed || !sprite.active) return;
    const b = sprite.getData('bounds') as { minX: number; maxX: number; minY: number; maxY: number };
    if (!b) return;

    // Pick random target in bounds
    const targetX = Phaser.Math.Clamp(sprite.x + (Math.random() - 0.5) * 80, b.minX, b.maxX);
    const targetY = Phaser.Math.Clamp(sprite.y + (Math.random() - 0.5) * 60, b.minY, b.maxY);
    const dist = Math.hypot(targetX - sprite.x, targetY - sprite.y);
    if (dist < 8) return;

    // Stop existing walk tween if any
    const prevTween = sprite.getData('walkTween') as Phaser.Tweens.Tween | undefined;
    if (prevTween && prevTween.isPlaying()) {
      prevTween.stop();
    }

    sprite.setData('isWalking', true);
    sprite.setFlipX(targetX < sprite.x);
    if (this.scene.anims.exists(walkAnim)) {
      sprite.play(walkAnim, true);
    }

    const duration = (dist / speed) * 1000;
    const tween = this.scene.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      duration,
      onUpdate: () => {
        if (sprite.active) {
          sprite.setDepth(sprite.y);
        }
      },
      onComplete: () => {
        if (sprite.active) {
          sprite.setData('isWalking', false);
          sprite.setData('walkTween', null);
          if (this.scene.anims.exists(idleAnim)) {
            sprite.play(idleAnim, true);
          }
        }
      },
    });
    sprite.setData('walkTween', tween);
  }

  interactWithAnimal(sprite: Phaser.GameObjects.Sprite, message: string) {
    if (this.destroyed || !sprite.active) return;
    play('pop');
    useUi.getState().toast({ kind: 'reward', title: 'Thân Thiện', body: message });

    // Stop walking if in motion
    const prevTween = sprite.getData('walkTween') as Phaser.Tweens.Tween | undefined;
    if (prevTween && prevTween.isPlaying()) {
      prevTween.stop();
      sprite.setData('walkTween', null);
    }
    sprite.setData('isWalking', false);

    // Little happy hop animation
    const originY = sprite.y;
    this.scene.tweens.add({
      targets: sprite,
      y: originY - 10,
      duration: 160,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (sprite.active) {
          sprite.y = originY;
          const idleAnim = sprite.getData('idleAnim') as string;
          if (idleAnim && this.scene.anims.exists(idleAnim)) {
            sprite.play(idleAnim, true);
          }
        }
      },
    });

    // Floating heart emote
    const heart = this.scene.add
      .text(sprite.x, sprite.y - 24, '❤️', { fontSize: '18px' })
      .setOrigin(0.5)
      .setDepth(9999);

    this.scene.tweens.add({
      targets: heart,
      y: heart.y - 22,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => heart.destroy(),
    });
  }

  getNearestAnimal(x: number, y: number, radius = 50): Phaser.GameObjects.Sprite | null {
    let nearest: Phaser.GameObjects.Sprite | null = null;
    let minDist = radius;

    for (const a of this.animals) {
      if (!a.active) continue;
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = a;
      }
    }
    return nearest;
  }

  destroy() {
    this.destroyed = true;
    if (this.wanderTimer) {
      this.wanderTimer.destroy();
      this.wanderTimer = null;
    }
    for (const sprite of this.animals) {
      const tween = sprite.getData('walkTween') as Phaser.Tweens.Tween | undefined;
      if (tween) tween.stop();
      sprite.destroy();
    }
    this.animals = [];
    this.spawned = false;
  }
}
