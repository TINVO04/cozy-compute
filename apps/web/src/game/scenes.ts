import {
  APARTMENT_COLS,
  APARTMENT_ROWS,
  BLOCKERS,
  BUILDINGS,
  FISHING_RODS,
  MAP_HEIGHT,
  MAP_WIDTH,
  t,
  TILE,
  TOWN_PROPS,
  TOWN_TREES,
  ZONES,
  zoneAt,
  type FishShadowTier,
  type Rect,
} from '@cozy/game-data';
import { getStateCallbacks, type Room } from 'colyseus.js';
import Phaser from 'phaser';
import { duckGrid } from '../art/items';
import { APT_ART_SIDE, APT_ART_TOP } from '../art/apartment';
import { drawRotatedFurniture } from '../art/furniture';
import {
  APT_TILE,
  BUILDING_ROOF,
  drawTree,
  paintApartment,
  paintBuilding,
  paintProp,
  paintTown,
} from '../art/town';
import { play } from '../lib/sound';
import { useUi } from '../lib/store';
import { ensureAtmosphereTextures, setupTownLighting, setupTownParticles } from './atmosphere';
import { net } from './net';
import { PlayerLayer } from './players';
import { InWorldFishingController } from './fishing';

/** Keyboard input is ignored while typing in React inputs. */
function typing(): boolean {
  const el = document.activeElement;
  return (
    !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)
  );
}

abstract class WorldScene extends Phaser.Scene {
  protected layer: PlayerLayer | null = null;
  protected keys!: Record<
    'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd',
    Phaser.Input.Keyboard.Key
  >;
  private offRoom: (() => void) | null = null;

  create() {
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#2a2438');
    const kb = this.input.keyboard!;
    kb.disableGlobalCapture();
    this.keys = kb.addKeys(
      { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D' },
      false,
    ) as typeof this.keys;
    this.buildWorld();
    this.offRoom = net.onRoom((room) => this.bindRoom(room));
    const onResize = () => this.fitCamera();
    const teardown = () => {
      this.scale.off('resize', onResize);
      if (this.offRoom) {
        this.offRoom();
        this.offRoom = null;
      }
      this.layer?.destroy();
      this.layer = null;
    };
    this.events.once('shutdown', teardown);
    this.events.once('destroy', teardown);
    this.scale.on('resize', onResize);
    this.fitCamera();
  }

  protected abstract buildWorld(): void;
  protected abstract worldSize(): { width: number; height: number };
  protected abstract blockers(): Rect[];
  protected abstract matchesRoom(room: Room): boolean;
  protected onSelfMove(_x: number, _y: number) {}

  protected fitCamera() {
    const { width, height } = this.worldSize();
    const cam = this.cameras.main;
    const zoom = Math.max(
      1,
      Math.min(3, Math.round(Math.min(this.scale.width / 520, this.scale.height / 360))),
    );
    cam.setZoom(zoom);
    const vw = this.scale.width / zoom;
    const vh = this.scale.height / zoom;
    // Center small worlds; clamp large ones.
    cam.setBounds(
      Math.min(0, (width - vw) / 2),
      Math.min(0, (height - vh) / 2),
      Math.max(width, vw),
      Math.max(height, vh),
    );
  }

  private bindRoom(room: Room) {
    if (!this.matchesRoom(room)) return;
    if (!this.sys || !this.sys.displayList || !this.scene.isActive()) return;
    this.layer?.destroy();
    const size = this.worldSize();
    this.layer = new PlayerLayer(this, room, { ...size, blockers: this.blockers() }, (x, y) =>
      this.onSelfMove(x, y),
    );
    this.onBind(room);
  }

  protected onBind(_room: Room) {}

  override update(time: number, delta: number) {
    if (!this.layer) return;
    const k = this.keys;
    const blocked = typing() || useUi.getState().activity !== null || useUi.getState().editingApartment;
    const x = blocked ? 0 : (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const y = blocked ? 0 : (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    this.layer.setInput({ x, y });
    this.layer.update(delta, time);
  }
}

export let townFishingController: InWorldFishingController | null = null;
let townSelfPosProvider: (() => { x: number; y: number } | null) | null = null;

export function getTownSelfPosition(): { x: number; y: number } {
  return townSelfPosProvider?.() ?? { x: 38 * 32, y: 27 * 32 };
}

export class TownScene extends WorldScene {
  private ducks = new Map<string, Phaser.GameObjects.Image>();
  private deliveryMarker: Phaser.GameObjects.Container | null = null;
  public fishingController: InWorldFishingController | null = null;
  public remoteFishingControllers = new Map<string, InWorldFishingController>();

  constructor() {
    super('town');
  }

  getSelfPos(): { x: number; y: number } | null {
    if (!this.layer?.self) return null;
    return { x: this.layer.self.container.x, y: this.layer.self.container.y };
  }

  setSelfFishing(isFishing: boolean, facingDir?: number) {
    this.layer?.setSelfFishing(isFishing, facingDir);
  }

  setSelfHeldFish(heldFish: { speciesId: string; sizeCm: number } | null) {
    this.layer?.setSelfHeldFish(heldFish);
  }

  saySelf(text: string) {
    this.layer?.saySelf(text);
  }

  override update(time: number, delta: number) {
    super.update(time, delta);
    this.fishingController?.update(time, delta);
    this.remoteFishingControllers.forEach((ctrl) => ctrl.update(time, delta));
  }

  protected worldSize() {
    return { width: MAP_WIDTH, height: MAP_HEIGHT };
  }

  protected blockers() {
    return BLOCKERS;
  }

  protected matchesRoom(room: Room) {
    return room.name === 'town';
  }

  protected buildWorld() {
    if (!this.textures.exists('town-ground')) this.textures.addCanvas('town-ground', paintTown());
    this.add.image(0, 0, 'town-ground').setOrigin(0).setDepth(-10);
    for (const b of BUILDINGS) {
      const key = `bld:${b.id}`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, paintBuilding(b));
      this.add
        .image(b.rect.x - 4, b.rect.y - BUILDING_ROOF, key)
        .setOrigin(0)
        .setDepth(b.rect.y + b.rect.h - 4);
    }
    const prop = (kind: Parameters<typeof paintProp>[0], x: number, y: number, depthY: number) => {
      const key = `prop:${kind}`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, paintProp(kind));
      return this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(depthY);
    };
    for (const p of TOWN_PROPS) prop(p.kind, p.x * TILE, p.y * TILE, p.y * TILE);
    const g = document.createElement('canvas');
    g.width = 48;
    g.height = 60;
    drawTree(g.getContext('2d')!, 24, 58);
    if (!this.textures.exists('tree')) this.textures.addCanvas('tree', g);
    for (const p of TOWN_TREES) {
      this.add
        .image(p.x * TILE, p.y * TILE, 'tree')
        .setOrigin(0.5, 1)
        .setDepth(p.y * TILE);
    }
    // zone labels on the ground
    for (const z of ZONES) {
      if (z.id === 'plaza') continue;
      this.add
        .text(z.rect.x + z.rect.w / 2, z.rect.y + z.rect.h - 2, z.label, {
          fontFamily: 'Inter, sans-serif',
          fontSize: '11px',
          color: '#2a2438',
          backgroundColor: '#f3e7cb',
          padding: { x: 3, y: 1 },
          resolution: 2,
        })
        .setOrigin(0.5, 1)
        .setDepth(-5)
        .setAlpha(
          z.id === 'pier' || z.id === 'ai_kiosk' || z.id === 'events' || z.id === 'delivery' ? 0.9 : 0,
        );
    }
    if (!this.textures.exists('duck')) this.textures.addCanvas('duck', duckGrid().toCanvas(2));
    // water shimmer
    if (!useUi.getState().reducedMotion) {
      const shimmer = this.add.graphics().setDepth(-9);
      let tt = 0;
      this.time.addEvent({
        loop: true,
        delay: 120,
        callback: () => {
          tt++;
          shimmer.clear();
          shimmer.fillStyle(0xd6f1fa, 0.7);
          for (let i = 0; i < 14; i++) {
            const x = 35 * TILE + ((i * 97 + tt * 3) % (13 * TILE));
            const y = 20 * TILE + 10 + ((i * 53) % (11 * TILE));
            if (x > 38 * TILE - 4 && x < 40 * TILE + 4) continue;
            shimmer.fillRect(x, y, 5, 1);
          }
        },
      });
    }
    setupTownLighting(this);
    setupTownParticles(this);
    this.fishingController = new InWorldFishingController(this);
    townFishingController = this.fishingController;
    townSelfPosProvider = () => this.getSelfPos();

    this.unsubscribe = useUi.subscribe((s, prev) => {
      if (s.delivery !== prev.delivery) this.drawDeliveryMarker();
    });
    this.events.once('shutdown', () => {
      this.unsubscribe?.();
      this.fishingController?.cleanup();
      this.remoteFishingControllers.forEach((ctrl) => ctrl.cleanup());
      this.remoteFishingControllers.clear();
      townFishingController = null;
      townSelfPosProvider = null;
    });
    this.drawDeliveryMarker();
  }

  private unsubscribe: (() => void) | null = null;

  private drawDeliveryMarker() {
    this.deliveryMarker?.destroy();
    this.deliveryMarker = null;
    const job = useUi.getState().delivery;
    if (!job) return;
    const z = ZONES.find((x) => x.id === job.destination)!;
    const g = this.add.graphics();
    g.lineStyle(2, 0xe0735b, 1).strokeRoundedRect(z.rect.x, z.rect.y, z.rect.w, z.rect.h, 6);
    g.fillStyle(0xe0735b, 0.15).fillRoundedRect(z.rect.x, z.rect.y, z.rect.w, z.rect.h, 6);
    const arrow = this.add
      .text(z.rect.x + z.rect.w / 2, z.rect.y - 4, '▼', { fontSize: '16px', color: '#e0735b', resolution: 2 })
      .setOrigin(0.5, 1);
    this.deliveryMarker = this.add.container(0, 0, [g, arrow]).setDepth(5000);
    if (!useUi.getState().reducedMotion)
      this.tweens.add({ targets: arrow, y: arrow.y - 6, yoyo: true, repeat: -1, duration: 500 });
  }

  protected override onBind(room: Room) {
    const $ = getStateCallbacks(room);
    type DuckMap = {
      onAdd: (cb: (d: { x: number; y: number }, k: string) => void, i?: boolean) => void;
      onRemove: (cb: (d: unknown, k: string) => void) => void;
    };
    const root = $(room.state as never) as unknown as {
      listen: (k: string, cb: (v: unknown) => void, immediate?: boolean) => () => void;
    };
    root.listen(
      'event',
      (ev) => {
        this.ducks.forEach((d) => d.destroy());
        this.ducks.clear();
        if (!ev) return;
        const ducks = ($(ev as never) as unknown as { ducks: DuckMap }).ducks;
        ducks.onAdd((d, id) => {
          const img = this.add.image(d.x, d.y, 'duck').setOrigin(0.5, 1).setDepth(d.y);
          if (!useUi.getState().reducedMotion)
            this.tweens.add({
              targets: img,
              y: d.y - 4,
              yoyo: true,
              repeat: -1,
              duration: 600,
              delay: Math.random() * 400,
            });
          this.ducks.set(id, img);
        }, true);
        ducks.onRemove((_d, id) => {
          const img = this.ducks.get(id);
          if (!img) return;
          play('duck');
          this.tweens.add({
            targets: img,
            alpha: 0,
            y: img.y - 20,
            duration: 250,
            onComplete: () => img.destroy(),
          });
          this.ducks.delete(id);
        });
      },
      true,
    );

    // Sync remote player fishing visuals across all town players
    room.onMessage(
      'fishing:remote_cast',
      (msg: {
        sessionId: string;
        selfX: number;
        selfY: number;
        facingDir?: number;
        shadowTier?: FishShadowTier;
        biteInMs?: number;
        shadowDelayMs?: number;
        equippedRodId?: string;
        nibbleCount?: number;
        nibbleTimes?: number[];
      }) => {
        if (!msg?.sessionId) return;
        this.remoteFishingControllers.get(msg.sessionId)?.cleanup();
        const ctrl = new InWorldFishingController(this, { isRemote: true });
        this.remoteFishingControllers.set(msg.sessionId, ctrl);

        const equippedRod = FISHING_RODS[msg.equippedRodId ?? 'rod_twig'] ?? FISHING_RODS['rod_twig']!;
        ctrl.startCast({
          selfX: msg.selfX,
          selfY: msg.selfY,
          shadowTier: msg.shadowTier ?? 1,
          nibbleCount: msg.nibbleCount ?? 5,
          nibbleTimes: msg.nibbleTimes ?? [],
          biteInMs: msg.biteInMs ?? 15000,
          shadowDelayMs: msg.shadowDelayMs ?? 8000,
          equippedRod,
        });
      },
    );

    room.onMessage('fishing:remote_nibble', (msg: { sessionId: string; nibbleIndex?: number }) => {
      if (!msg?.sessionId) return;
      this.remoteFishingControllers.get(msg.sessionId)?.triggerRemoteNibble(msg.nibbleIndex ?? 0);
    });

    room.onMessage('fishing:remote_bite', (msg: { sessionId: string }) => {
      if (!msg?.sessionId) return;
      this.remoteFishingControllers.get(msg.sessionId)?.triggerRemoteBite();
    });

    room.onMessage('fishing:remote_stop', (msg: { sessionId: string }) => {
      if (!msg?.sessionId) return;
      const ctrl = this.remoteFishingControllers.get(msg.sessionId);
      if (ctrl) {
        ctrl.cleanup();
        this.remoteFishingControllers.delete(msg.sessionId);
      }
    });
  }

  private lastZone: string | null = null;
  protected override onSelfMove(x: number, y: number) {
    const zone = zoneAt(x, y);
    if (zone !== this.lastZone) {
      this.lastZone = zone;
      useUi.getState().setZone(zone);
    }
  }
}

export interface EditorObject {
  itemId: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  sprite: string;
  size: { w: number; h: number };
}

export class ApartmentScene extends WorldScene {
  private floor: Phaser.GameObjects.Image | null = null;
  private furniture: Phaser.GameObjects.Image[] = [];
  private grid: Phaser.GameObjects.Graphics | null = null;
  private ghost: Phaser.GameObjects.Image | null = null;
  private furnitureBlockers: Rect[] = [];
  private roomGlow: Phaser.GameObjects.Image | null = null;
  private placementMarker: Phaser.GameObjects.Graphics | null = null;
  private editorHeight = 230;

  constructor() {
    super('apartment');
  }

  protected worldSize() {
    return { width: APARTMENT_COLS * APT_TILE, height: APARTMENT_ROWS * APT_TILE };
  }

  protected override fitCamera() {
    const cam = this.cameras.main;
    const width = APARTMENT_COLS * APT_TILE + APT_ART_SIDE * 2;
    const height = APARTMENT_ROWS * APT_TILE + APT_ART_TOP + 16;
    const editorSpace = useUi.getState().editingApartment ? this.editorHeight : 0;
    const availableHeight = Math.max(180, this.scale.height - editorSpace - (editorSpace ? 16 : 64));
    const zoom = Math.max(
      1,
      Math.min(3, Math.floor(Math.min((this.scale.width - 48) / width, availableHeight / height))),
    );
    cam.stopFollow();
    cam.setZoom(zoom);
    const vw = this.scale.width / cam.zoom,
      vh = this.scale.height / cam.zoom;
    // Fixed room view keeps all placement cells visible above the editor toolbar.
    cam.setBounds(
      -APT_ART_SIDE - Math.max(0, (vw - width) / 2),
      -APT_ART_TOP - Math.max(0, (vh - height) / 2) + editorSpace / (2 * zoom),
      Math.max(width, vw),
      Math.max(height, vh),
    );
    cam.centerOn(
      (APARTMENT_COLS * APT_TILE) / 2,
      (APARTMENT_ROWS * APT_TILE - APT_ART_TOP) / 2 + editorSpace / (2 * zoom),
    );
  }

  protected blockers() {
    return [t(0, 0, APARTMENT_COLS, 1), ...this.furnitureBlockers];
  }

  protected matchesRoom(room: Room) {
    return room.name === 'apartment';
  }

  protected buildWorld() {
    this.renderRoom('cozy', []);
    this.game.events.on('apartment:render', this.onRender, this);
    this.game.events.on('apartment:ghost', this.onGhost, this);
    this.game.events.on('apartment:cursor', this.onCursor, this);
    this.game.events.on('apartment:editor-height', this.onEditorHeight, this);
    this.events.once('shutdown', () => {
      this.game.events.off('apartment:render', this.onRender, this);
      this.game.events.off('apartment:ghost', this.onGhost, this);
      this.game.events.off('apartment:cursor', this.onCursor, this);
      this.game.events.off('apartment:editor-height', this.onEditorHeight, this);
      this.floor = null;
      this.furniture = [];
      this.grid = null;
      this.ghost = null;
      this.roomGlow = null;
      this.placementMarker = null;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!useUi.getState().editingApartment) return;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      this.game.events.emit('apartment:hover', {
        x: Math.floor(w.x / APT_TILE),
        y: Math.floor(w.y / APT_TILE),
      });
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!useUi.getState().editingApartment) return;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      this.game.events.emit('apartment:click', {
        x: Math.floor(w.x / APT_TILE),
        y: Math.floor(w.y / APT_TILE),
        right: p.rightButtonDown(),
      });
    });
    this.game.events.emit('apartment:ready');
  }

  private onRender = (payload: { themeId: string; objects: EditorObject[]; editing: boolean }) => {
    this.renderRoom(payload.themeId, payload.objects);
    this.grid?.setVisible(payload.editing);
    if (!payload.editing) this.placementMarker?.setVisible(false);
    this.fitCamera();
  };

  private onGhost = (g: null | { obj: EditorObject; valid: boolean }) => {
    this.ghost?.destroy();
    this.ghost = null;
    if (!g) return;
    this.ghost = this.furnitureImage(g.obj).setAlpha(0.65).setDepth(9000);
    this.ghost.setTint(g.valid ? 0xffffff : 0xff7a7a);
  };

  private onEditorHeight = (height: number) => {
    this.editorHeight = height;
    this.fitCamera();
  };

  private onCursor = (p: null | { x: number; y: number }) => {
    this.placementMarker?.clear();
    if (!p || !useUi.getState().editingApartment) return;
    this.placementMarker ??= this.add.graphics().setDepth(9001);
    this.placementMarker.setVisible(true).lineStyle(2, 0xffe3a6, 1);
    this.placementMarker.strokeRect(p.x * APT_TILE + 2, p.y * APT_TILE + 2, APT_TILE - 4, APT_TILE - 4);
  };

  private furnitureImage(o: EditorObject) {
    const rotated = o.rotation === 90 || o.rotation === 270;
    const size = rotated ? { w: o.size.h, h: o.size.w } : o.size;
    const key = `furn:${o.sprite}:${o.size.w}x${o.size.h}:${o.rotation}`;
    if (!this.textures.exists(key))
      this.textures.addCanvas(key, drawRotatedFurniture(o.sprite, o.size, o.rotation).toCanvas(2));
    const img = this.add.image(o.x * APT_TILE, (o.y + size.h) * APT_TILE, key).setOrigin(0, 1);
    return img;
  }

  private renderRoom(themeId: string, objects: EditorObject[]) {
    const key = `apt-floor:${themeId}`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, paintApartment(themeId));
    this.floor?.destroy();
    this.floor = this.add.image(-APT_ART_SIDE, -APT_ART_TOP, key).setOrigin(0).setDepth(-10);
    this.furniture.forEach((f) => f.destroy());
    this.furniture = objects.map((o) => {
      const img = this.furnitureImage(o);
      const rotated = o.rotation === 90 || o.rotation === 270;
      const h = rotated ? o.size.w : o.size.h;
      img.setDepth(o.itemId.includes('rug') ? -5 : (o.y + h) * APT_TILE - 4);
      return img;
    });
    this.furnitureBlockers = objects
      .filter((o) => !o.itemId.includes('rug'))
      .map((o) => {
        const rotated = o.rotation === 90 || o.rotation === 270;
        const w = rotated ? o.size.h : o.size.w;
        const h = rotated ? o.size.w : o.size.h;
        return { x: o.x * APT_TILE + 3, y: o.y * APT_TILE + 6, w: w * APT_TILE - 6, h: h * APT_TILE - 8 };
      });
    this.layer?.setWorldBlockers(this.blockers());
    ensureAtmosphereTextures(this);
    if (!this.roomGlow) {
      this.roomGlow = this.add
        .image((APARTMENT_COLS * APT_TILE) / 2, (APARTMENT_ROWS * APT_TILE) / 2 + 10, 'glow:indoor')
        .setScale(2.2)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.12)
        .setDepth(2000);
      if (!useUi.getState().reducedMotion) {
        this.tweens.add({
          targets: this.roomGlow,
          alpha: { from: 0.09, to: 0.15 },
          duration: 3200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
    if (!this.grid) {
      this.grid = this.add.graphics().setDepth(8000).setVisible(false);
      this.grid.lineStyle(1, 0xffffff, 0.35);
      for (let x = 0; x <= APARTMENT_COLS; x++)
        this.grid.lineBetween(x * APT_TILE, APT_TILE, x * APT_TILE, APARTMENT_ROWS * APT_TILE);
      for (let y = 1; y <= APARTMENT_ROWS; y++)
        this.grid.lineBetween(0, y * APT_TILE, APARTMENT_COLS * APT_TILE, y * APT_TILE);
    }
  }

  protected override onBind(room: Room) {
    this.fitCamera();
    room.onMessage('layout', () => this.game.events.emit('apartment:layout-changed'));
  }
}
