import {
  ANIMALS,
  FARM_POIS,
  type AnimalGrowthStage,
  type AnimalType,
  computeAnimalGrowthStage,
  computeAnimalHunger,
  STARVATION_WARNING_THRESHOLD_SEC,
} from '@cozy/game-data';
import Phaser from 'phaser';
import {
  paintChickenSpritesheet,
  paintCowSpritesheet,
  paintDuckSpritesheet,
  paintGoatSpritesheet,
  paintPigSpritesheet,
  paintSheepSpritesheet,
} from '../art/farm-animals';
import { api, ApiError } from '../lib/api';
import { play } from '../lib/sound';
import { useUi } from '../lib/store';

export interface ServerLivestockData {
  id: string;
  type: AnimalType;
  name: string;
  createdAt: string;
  fedAt: string | null;
  growthAccumSec?: number;
  happiness: number;
  lastYieldAt: string | null;
  stage: AnimalGrowthStage;
  progressPercent: number;
  remainingSec: number;
  sellPrice: number;
  displayName: string;
  isHungry?: boolean;
  hungerRemainingSec?: number;
  canYield?: boolean;
  isDead?: boolean;
  starvationRemainingSec?: number;
  feedItemId?: string;
  yieldItemId?: string;
}

export interface WarehouseItemLike {
  id?: string;
  itemId: string;
  quantity: number;
}

interface LivestockEntity {
  id: string;
  type: AnimalType;
  data: ServerLivestockData;
  sprite: Phaser.GameObjects.Sprite;
  overhead: Phaser.GameObjects.Container;
  bgCard: Phaser.GameObjects.Graphics;
  growthText: Phaser.GameObjects.Text;
  hungerText: Phaser.GameObjects.Text;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  idleAnim: string;
  walkAnim: string;
  peckAnim?: string;
  speed: number;
  isWalking: boolean;
  walkTween?: Phaser.Tweens.Tween | null;
}

function formatTimer(sec: number): string {
  if (sec <= 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export class FarmLivestockManager {
  private scene: Phaser.Scene;
  private entities = new Map<string, LivestockEntity>();
  private wanderTimer: Phaser.Time.TimerEvent | null = null;
  private secondTimer: Phaser.Time.TimerEvent | null = null;
  private loaded = false;
  private destroyed = false;
  private warehouseItems: WarehouseItemLike[] = [];
  private cachedServerAnimals: ServerLivestockData[] = [];
  private onRefreshCallback?: () => void;

  constructor(scene: Phaser.Scene, onRefresh?: () => void) {
    this.scene = scene;
    this.onRefreshCallback = onRefresh;
  }

  setRefreshCallback(cb: () => void) {
    this.onRefreshCallback = cb;
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

    // Start 1-second countdown ticker
    this.secondTimer = this.scene.time.addEvent({
      delay: 1000,
      callback: () => this.tickTimers(),
      loop: true,
    });

    // Start Wander Loop
    this.wanderTimer = this.scene.time.addEvent({
      delay: 3000,
      callback: () => this.wanderStep(),
      loop: true,
    });

    // If animals were cached before assets loaded, spawn them now
    if (this.cachedServerAnimals.length > 0) {
      this.syncAnimals(this.cachedServerAnimals, this.warehouseItems);
    }
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

  /**
   * Synchronizes the roaming farm livestock strictly with the player's real farm database.
   * If the player owns 0 animals, 0 animals will roam.
   * If animals are raised or sold, they appear or disappear in real-time.
   */
  syncAnimals(serverAnimals: ServerLivestockData[], warehouseItems?: WarehouseItemLike[]) {
    this.cachedServerAnimals = serverAnimals;
    if (warehouseItems) {
      this.warehouseItems = warehouseItems;
    }

    if (!this.loaded || this.destroyed || !this.scene.sys) return;

    const serverIdSet = new Set(serverAnimals.map((a) => a.id));

    // 1. Remove animals that no longer exist (sold or deleted)
    for (const [id, entity] of this.entities.entries()) {
      if (!serverIdSet.has(id)) {
        if (entity.walkTween) entity.walkTween.stop();
        entity.overhead.destroy();
        entity.sprite.destroy();
        this.entities.delete(id);
      }
    }

    // 2. Update existing or spawn new animals
    for (const data of serverAnimals) {
      const existing = this.entities.get(data.id);
      if (existing) {
        // Update data state
        existing.data = { ...existing.data, ...data };
        this.updateScaleByStage(existing);
        this.updateOverheadVisual(existing);
      } else {
        this.spawnSingleAnimal(data);
      }
    }
  }

  private getBoundsForFacility(facility: string) {
    if (facility === 'poultry_coop') {
      const coop = FARM_POIS.poultry_coop;
      return {
        minX: coop.x + 28,
        maxX: coop.x + coop.w - 28,
        minY: coop.y + 76,
        maxY: coop.y + coop.h - 18,
      };
    }
    if (facility === 'cattle_pasture') {
      const pasture = FARM_POIS.cattle_pasture;
      return {
        minX: pasture.x + 36,
        maxX: pasture.x + pasture.w - 36,
        minY: pasture.y + 80,
        maxY: pasture.y + pasture.h - 22,
      };
    }
    if (facility === 'pig_pen') {
      const pigPen = FARM_POIS.pig_pen;
      return {
        minX: pigPen.x + 32,
        maxX: pigPen.x + pigPen.w - 32,
        minY: pigPen.y + 74,
        maxY: pigPen.y + pigPen.h - 20,
      };
    }
    // goat_pen (goat & sheep)
    const goatPen = FARM_POIS.goat_pen;
    return {
      minX: goatPen.x + 30,
      maxX: goatPen.x + goatPen.w - 30,
      minY: goatPen.y + 68,
      maxY: goatPen.y + goatPen.h - 18,
    };
  }

  private getScaleForAnimal(type: AnimalType, stage: AnimalGrowthStage): number {
    switch (type) {
      case 'chicken':
        return stage === 'baby' ? 0.95 : stage === 'growing' ? 1.2 : 1.45;
      case 'duck':
        return stage === 'baby' ? 1.0 : stage === 'growing' ? 1.3 : 1.6;
      case 'cow':
        return stage === 'baby' ? 1.4 : stage === 'growing' ? 1.8 : 2.2;
      case 'pig':
        return stage === 'baby' ? 1.15 : stage === 'growing' ? 1.5 : 1.85;
      case 'goat':
        return stage === 'baby' ? 1.15 : stage === 'growing' ? 1.5 : 1.8;
      case 'sheep':
        return stage === 'baby' ? 1.15 : stage === 'growing' ? 1.5 : 1.8;
      default:
        return 1.5;
    }
  }

  private updateScaleByStage(entity: LivestockEntity) {
    const scale = this.getScaleForAnimal(entity.type, entity.data.stage);
    entity.sprite.setScale(scale);
    this.positionOverhead(entity);
  }

  private spawnSingleAnimal(data: ServerLivestockData) {
    const def = Object.values(ANIMALS).find((a) => a.type === data.type);
    if (!def) return;

    const bounds = this.getBoundsForFacility(def.facility);
    const spawnX = Phaser.Math.Between(bounds.minX, bounds.maxX);
    const spawnY = Phaser.Math.Between(bounds.minY, bounds.maxY);

    let textureKey = 'sprout:chicken';
    let idleAnim = 'sprout:chicken:idle';
    let walkAnim = 'sprout:chicken:walk';
    let peckAnim: string | undefined = 'sprout:chicken:peck';
    let speed = 40;

    switch (data.type) {
      case 'chicken':
        textureKey = 'sprout:chicken';
        idleAnim = 'sprout:chicken:idle';
        walkAnim = 'sprout:chicken:walk';
        peckAnim = 'sprout:chicken:peck';
        speed = 42;
        break;
      case 'duck':
        textureKey = 'farm:duck';
        idleAnim = 'farm:duck:idle';
        walkAnim = 'farm:duck:walk';
        peckAnim = undefined;
        speed = 32;
        break;
      case 'cow':
        textureKey = 'sprout:cow';
        idleAnim = 'sprout:cow:idle';
        walkAnim = 'sprout:cow:walk';
        peckAnim = undefined;
        speed = 28;
        break;
      case 'pig':
        textureKey = 'farm:pig';
        idleAnim = 'farm:pig:idle';
        walkAnim = 'farm:pig:walk';
        peckAnim = undefined;
        speed = 32;
        break;
      case 'goat':
        textureKey = 'farm:goat';
        idleAnim = 'farm:goat:idle';
        walkAnim = 'farm:goat:walk';
        peckAnim = undefined;
        speed = 34;
        break;
      case 'sheep':
        textureKey = 'farm:sheep';
        idleAnim = 'farm:sheep:idle';
        walkAnim = 'farm:sheep:walk';
        peckAnim = undefined;
        speed = 28;
        break;
    }

    if (!this.scene.textures.exists(textureKey)) return;

    const sprite = this.scene.add.sprite(spawnX, spawnY, textureKey, 0);
    sprite.setDepth(spawnY);
    if (this.scene.anims.exists(idleAnim)) {
      sprite.play(idleAnim);
    }

    // Overhead HUD container (Card with Growth countdown & Hunger countdown)
    const overhead = this.scene.add.container(spawnX, spawnY - 32);
    overhead.setDepth(spawnY + 500);

    const bgCard = this.scene.add.graphics();
    const growthText = this.scene.add
      .text(0, -9, '', {
        fontSize: '10px',
        fontFamily: 'monospace, sans-serif',
        fontStyle: 'bold',
        color: '#fef08a',
      })
      .setOrigin(0.5);

    const hungerText = this.scene.add
      .text(0, 5, '', {
        fontSize: '10px',
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    overhead.add([bgCard, growthText, hungerText]);

    const entity: LivestockEntity = {
      id: data.id,
      type: data.type,
      data,
      sprite,
      overhead,
      bgCard,
      growthText,
      hungerText,
      bounds,
      idleAnim,
      walkAnim,
      peckAnim,
      speed,
      isWalking: false,
    };

    this.updateScaleByStage(entity);
    this.updateOverheadVisual(entity);

    // Interactive pointer clicks on animal sprite or its overhead badge
    sprite.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      void this.handleAnimalClick(entity);
    });
    const cardW = 96;
    const cardH = 32;
    overhead.setSize(cardW, cardH);
    overhead
      .setInteractive(
        new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
        Phaser.Geom.Rectangle.Contains,
      )
      .on('pointerdown', () => {
        void this.handleAnimalClick(entity);
      });

    this.entities.set(data.id, entity);
  }

  private positionOverhead(entity: LivestockEntity) {
    const offsetY = entity.sprite.displayHeight * 0.5 + 16;
    entity.overhead.setPosition(entity.sprite.x, entity.sprite.y - offsetY);
    entity.overhead.setDepth(entity.sprite.y + 500);
  }

  private updateOverheadVisual(entity: LivestockEntity) {
    const { data } = entity;
    const now = Date.now();

    // Recompute client-side dynamic values for smoothness
    const hunger = computeAnimalHunger(
      data.type,
      data.fedAt,
      data.lastYieldAt,
      now,
      data.stage === 'adult',
      data.createdAt,
    );
    const growth = computeAnimalGrowthStage(
      data.type,
      data.createdAt,
      now,
      data.fedAt,
      data.growthAccumSec ?? 0,
    );

    const isDead = hunger.isDead || growth.isDead;
    const isHungry = hunger.isHungry;
    const hungerRemainingSec = hunger.hungerRemainingSec;
    const canYield = !isDead && hunger.canYield && growth.stage === 'adult';

    const cardW = 96;
    const cardH = 30;
    const g = entity.bgCard;
    g.clear();

    if (isDead) {
      if (entity.walkTween && entity.walkTween.isPlaying()) {
        entity.walkTween.stop();
      }
      entity.isWalking = false;
      entity.sprite.setAngle(-90);
      entity.sprite.setTint(0x777777);
      entity.sprite.setAlpha(0.65);

      entity.growthText.setText('💀 Đã chết vì đói').setColor('#ef4444');
      entity.hungerText.setText('Bấm dọn dẹp xác').setColor('#cbd5e1');

      g.fillStyle(0x450a0a, 0.92);
      g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
      g.lineStyle(1.5, 0xef4444, 0.95);
      g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);

      this.positionOverhead(entity);
      return;
    }

    // Restore living animal visuals
    entity.sprite.setAngle(0);
    entity.sprite.clearTint();
    entity.sprite.setAlpha(1);

    // Line 1: Growth Text
    if (growth.stage === 'adult') {
      entity.growthText.setText('👑 Trưởng thành').setColor('#4ade80');
    } else if (growth.stage === 'growing') {
      entity.growthText.setText(`🌿 Lớn: ${formatTimer(growth.remainingSec)}`).setColor('#86efac');
    } else if (!data.fedAt && !data.growthAccumSec) {
      entity.growthText.setText('🌱 Cần ăn để lớn').setColor('#fef08a');
    } else {
      entity.growthText.setText(`🌱 Lớn: ${formatTimer(growth.remainingSec)}`).setColor('#fef08a');
    }

    // Line 2: Hunger & Action Text
    const isCriticalStarvation =
      !isDead && isHungry && hunger.starvationRemainingSec <= STARVATION_WARNING_THRESHOLD_SEC;

    if (canYield) {
      entity.hungerText.setText('✨ Thu hoạch! (Bấm)').setColor('#fde047');
    } else if (isCriticalStarvation) {
      entity.hungerText
        .setText(`🚨 NGUY CẤP (${formatTimer(hunger.starvationRemainingSec)})`)
        .setColor('#ff8787');
    } else if (isHungry) {
      entity.hungerText
        .setText(`🌾 ĐÓI (Chết: ${formatTimer(hunger.starvationRemainingSec)})`)
        .setColor('#f87171');
    } else {
      entity.hungerText.setText(`🥣 Đói sau: ${formatTimer(hungerRemainingSec)}`).setColor('#cbd5e1');
    }

    if (canYield) {
      // Sparkling harvest state
      g.fillStyle(0x064e3b, 0.88);
      g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
      g.lineStyle(1.5, 0x22c55e, 0.9);
      g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
    } else if (isCriticalStarvation) {
      // Critical emergency starvation state (< 15 mins to death)
      g.fillStyle(0x581c1c, 0.95);
      g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
      g.lineStyle(2, 0xef4444, 1.0);
      g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
    } else if (isHungry) {
      // Attention hunger state
      g.fillStyle(0x451a03, 0.92);
      g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
      g.lineStyle(1.5, 0xf59e0b, 0.95);
      g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
    } else {
      // Normal well-fed state
      g.fillStyle(0x0f172a, 0.85);
      g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
      g.lineStyle(1, 0x334155, 0.8);
      g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 6);
    }

    this.positionOverhead(entity);
  }

  /**
   * Ticks growth and hunger countdowns every second for ultra-smooth UI
   */
  private tickTimers() {
    if (this.destroyed || this.entities.size === 0) return;
    const now = Date.now();

    for (const entity of this.entities.values()) {
      const growth = computeAnimalGrowthStage(
        entity.data.type,
        entity.data.createdAt,
        now,
        entity.data.fedAt,
        entity.data.growthAccumSec ?? 0,
      );
      if (growth.stage !== entity.data.stage) {
        entity.data.stage = growth.stage;
        this.updateScaleByStage(entity);
      }
      entity.data.remainingSec = growth.remainingSec;
      entity.data.progressPercent = growth.progressPercent;
      entity.data.isDead = growth.isDead;

      // Re-render overhead text with current countdowns
      this.updateOverheadVisual(entity);
    }
  }

  private wanderStep() {
    if (this.destroyed || useUi.getState().reducedMotion || this.entities.size === 0) return;

    for (const entity of this.entities.values()) {
      if (entity.data.isDead || entity.data.stage === 'dead') continue;
      const sprite = entity.sprite;
      if (!sprite || !sprite.active || entity.isWalking) continue;

      const roll = Math.random();
      if (entity.peckAnim && roll < 0.3) {
        sprite.play(entity.peckAnim, true);
      } else if (roll < 0.6) {
        sprite.play(entity.idleAnim, true);
      } else {
        this.walkToRandomSpot(entity);
      }
    }
  }

  private walkToRandomSpot(entity: LivestockEntity) {
    if (this.destroyed || !entity.sprite.active) return;
    const b = entity.bounds;
    const sprite = entity.sprite;

    const targetX = Phaser.Math.Clamp(sprite.x + (Math.random() - 0.5) * 80, b.minX, b.maxX);
    const targetY = Phaser.Math.Clamp(sprite.y + (Math.random() - 0.5) * 60, b.minY, b.maxY);
    const dist = Math.hypot(targetX - sprite.x, targetY - sprite.y);
    if (dist < 8) return;

    if (entity.walkTween && entity.walkTween.isPlaying()) {
      entity.walkTween.stop();
    }

    entity.isWalking = true;
    sprite.setFlipX(targetX < sprite.x);
    if (this.scene.anims.exists(entity.walkAnim)) {
      sprite.play(entity.walkAnim, true);
    }

    const duration = (dist / entity.speed) * 1000;
    const tween = this.scene.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      duration,
      onUpdate: () => {
        if (sprite.active) {
          sprite.setDepth(sprite.y);
          this.positionOverhead(entity);
        }
      },
      onComplete: () => {
        if (sprite.active) {
          entity.isWalking = false;
          entity.walkTween = null;
          if (this.scene.anims.exists(entity.idleAnim)) {
            sprite.play(entity.idleAnim, true);
          }
          this.positionOverhead(entity);
        }
      },
    });
    entity.walkTween = tween;
  }

  /**
   * Directly feeds or harvests an animal when the user clicks on it
   */
  async handleAnimalClick(entity: LivestockEntity) {
    if (this.destroyed || !entity.sprite.active) return;
    const { data } = entity;
    const def = Object.values(ANIMALS).find((a) => a.type === data.type);
    if (!def) return;

    const now = Date.now();
    const hunger = computeAnimalHunger(
      data.type,
      data.fedAt,
      data.lastYieldAt,
      now,
      data.stage === 'adult',
      data.createdAt,
    );
    const growth = computeAnimalGrowthStage(
      data.type,
      data.createdAt,
      now,
      data.fedAt,
      data.growthAccumSec ?? 0,
    );

    // 0. Check if animal has died of starvation -> Clean up carcass
    if (hunger.isDead || growth.isDead) {
      try {
        await api('/api/farm/animals/sell', {
          method: 'POST',
          body: { animalId: data.id },
        });
        play('pop');
        this.spawnFloatingEffect(entity.sprite.x, entity.sprite.y - 28, '💀 Đã dọn xác!', '#ef4444');
        useUi.getState().toast({
          kind: 'info',
          title: 'Dọn Dẹp Chuồng Trại',
          body: `Đã dọn dẹp xác ${def.name} để giải phóng vị trí trong chuồng.`,
        });
        if (entity.walkTween && entity.walkTween.isPlaying()) {
          entity.walkTween.stop();
        }
        this.entities.delete(data.id);
        entity.sprite.destroy();
        entity.overhead.destroy();
        this.onRefreshCallback?.();
        window.dispatchEvent(new CustomEvent('farm:refresh'));
      } catch (err) {
        play('error');
        const msg = err instanceof ApiError ? err.message : 'Không thể dọn dẹp';
        useUi.getState().toast({ kind: 'error', title: 'Dọn dẹp thất bại', body: msg });
      }
      return;
    }

    // 1. Check if adult & ready to harvest product
    if (hunger.canYield && growth.stage === 'adult') {
      play('farm_harvest');
      this.spawnFloatingEffect(
        entity.sprite.x,
        entity.sprite.y - 28,
        `✨ Thu hoạch ${def.yieldName}!`,
        '#facc15',
      );
      this.bounceAnimal(entity.sprite);
      try {
        await api('/api/farm/care', {
          method: 'POST',
          body: { kind: 'collect', id: data.id },
        });
        useUi.getState().toast({
          kind: 'reward',
          title: 'Thu Hoạch Thành Công! ✨',
          body: `Đã thu hoạch 1x ${def.yieldName} từ ${data.displayName} vào kho Silo!`,
        });
        data.lastYieldAt = new Date().toISOString();
        this.updateOverheadVisual(entity);
        this.onRefreshCallback?.();
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Chưa thể thu hoạch';
        useUi.getState().toast({ kind: 'error', title: 'Thu hoạch thất bại', body: msg });
      }
      return;
    }

    // 2. Check if hungry -> Direct Feed
    if (hunger.isHungry) {
      const feedItem = this.warehouseItems.find((w) => w.itemId === def.feedItemId && w.quantity > 0);
      if (!feedItem) {
        play('error');
        this.spawnFloatingEffect(entity.sprite.x, entity.sprite.y - 28, `❌ Hết ${def.feedName}!`, '#ef4444');
        useUi.getState().toast({
          kind: 'error',
          title: 'Hết Thức Ăn Trong Kho Silo',
          body: `Cần ${def.feedName} để cho ${data.displayName} ăn. Hãy mua thêm tại Tiệm Bác Sáu!`,
        });
        return;
      }

      // Optimistically feed
      play('farm_plant');
      feedItem.quantity -= 1;
      data.fedAt = new Date().toISOString();
      data.happiness = Math.min(100, data.happiness + 20);
      this.updateOverheadVisual(entity);
      this.spawnFloatingEffect(entity.sprite.x, entity.sprite.y - 28, '❤️ +No bụng! (+20 vui vẻ)', '#f43f5e');
      this.bounceAnimal(entity.sprite);

      try {
        await api('/api/farm/animals/feed', {
          method: 'POST',
          body: { animalId: data.id, feedItemId: def.feedItemId },
        });
        useUi.getState().toast({
          kind: 'reward',
          title: 'Cho Ăn Thành Công! 🌾',
          body: `Đã cho ${data.displayName} ăn ${def.feedName}. Vật nuôi rất no và vui vẻ!`,
        });
        this.onRefreshCallback?.();
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Không thể cho ăn';
        useUi.getState().toast({ kind: 'error', title: 'Cho ăn thất bại', body: msg });
      }
      return;
    }

    // 3. Animal is full & digesting
    play('pop');
    this.bounceAnimal(entity.sprite);
    const remainingMins = Math.ceil(hunger.hungerRemainingSec / 60);
    this.spawnFloatingEffect(entity.sprite.x, entity.sprite.y - 28, '😋 No bụng rồi!', '#38bdf8');
    useUi.getState().toast({
      kind: 'info',
      title: data.displayName,
      body: `Vật nuôi đang no bụng! Còn khoảng ${remainingMins} phút nữa mới đói lại.`,
    });
  }

  private bounceAnimal(sprite: Phaser.GameObjects.Sprite) {
    if (!sprite.active) return;
    const baseScaleX = Math.abs(sprite.scaleX);
    const baseScaleY = sprite.scaleY;
    const sign = sprite.flipX ? -1 : 1;

    this.scene.tweens.add({
      targets: sprite,
      scaleY: baseScaleY * 1.2,
      scaleX: sign * baseScaleX * 0.9,
      duration: 120,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private spawnFloatingEffect(x: number, y: number, text: string, color: string) {
    const floatText = this.scene.add
      .text(x, y, text, {
        fontSize: '11px',
        fontFamily: 'system-ui, sans-serif',
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(10000);

    this.scene.tweens.add({
      targets: floatText,
      y: y - 26,
      alpha: 0,
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => floatText.destroy(),
    });
  }

  getNearestEntity(x: number, y: number, radius = 50): LivestockEntity | null {
    let nearest: LivestockEntity | null = null;
    let minDist = radius;

    for (const entity of this.entities.values()) {
      if (!entity.sprite.active) continue;
      const d = Math.hypot(entity.sprite.x - x, entity.sprite.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = entity;
      }
    }
    return nearest;
  }

  getNearestAnimal(x: number, y: number, radius = 50): Phaser.GameObjects.Sprite | null {
    let nearest: Phaser.GameObjects.Sprite | null = null;
    let minDist = radius;

    for (const entity of this.entities.values()) {
      if (!entity.sprite.active) continue;
      const d = Math.hypot(entity.sprite.x - x, entity.sprite.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = entity.sprite;
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
    if (this.secondTimer) {
      this.secondTimer.destroy();
      this.secondTimer = null;
    }
    for (const entity of this.entities.values()) {
      if (entity.walkTween) entity.walkTween.stop();
      entity.overhead.destroy();
      entity.sprite.destroy();
    }
    this.entities.clear();
  }
}
