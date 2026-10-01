import {
  APARTMENT_COLS,
  APARTMENT_ROWS,
  BLOCKERS,
  BUILDINGS,
  COMPANY_BLOCKERS,
  COMPANY_COLS,
  COMPANY_ROWS,
  DNTU_BLOCKERS,
  DNTU_COLS,
  DNTU_ROWS,
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
  drawSleepingEmployee,
  drawZzzBubble,
  paintCompanyOffice,
  SLEEPING_EMPLOYEES,
  type SleepingEmployee,
} from '../art/company';
import { DNTU_PEOPLE, drawDntuPerson, paintDntuCampus, type DntuPerson } from '../art/dntu';
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
        nibbleOffsetsMs?: number[];
        nibbleOrbitTurns?: number[];
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
          nibbleTimes: msg.nibbleOffsetsMs?.map((offsetMs) => Date.now() + offsetMs) ?? msg.nibbleTimes ?? [],
          nibbleOrbitTurns: msg.nibbleOrbitTurns,
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

abstract class InteriorScene extends WorldScene {
  protected activeBubble: Phaser.GameObjects.Container | null = null;
  protected exiting = false;
  private interactions: { x: number; y: number; run: () => void; label: string }[] = [];
  private interactionHint: Phaser.GameObjects.Text | null = null;

  protected override fitCamera() {
    super.fitCamera();
    const { width, height } = this.worldSize();
    // Fit the complete room at integer scale, rather than rounding up and cropping it.
    const zoom = Math.max(
      1,
      Math.min(3, Math.floor(Math.min(this.scale.width / width, this.scale.height / height))),
    );
    const vw = this.scale.width / zoom;
    const vh = this.scale.height / zoom;
    this.cameras.main
      .setZoom(zoom)
      .setBounds(
        Math.min(0, (width - vw) / 2),
        Math.min(0, (height - vh) / 2),
        Math.max(width, vw),
        Math.max(height, vh),
      )
      .centerOn(width / 2, height / 2);
  }

  private nearestInteraction(x: number, y: number) {
    const nearest = this.interactions.reduce<(typeof this.interactions)[number] | undefined>(
      (best, action) =>
        !best || Math.hypot(action.x - x, action.y - y) < Math.hypot(best.x - x, best.y - y) ? action : best,
      undefined,
    );
    return nearest && Math.hypot(nearest.x - x, nearest.y - y) <= 2 * TILE ? nearest : undefined;
  }

  override update(time: number, delta: number) {
    super.update(time, delta);
    const ui = useUi.getState();
    const self = this.layer?.self?.container;
    const action =
      self && !this.exiting && !typing() && !ui.panel && !ui.activity && !document.querySelector('.backdrop')
        ? this.nearestInteraction(self.x, self.y)
        : undefined;
    this.interactionHint?.setVisible(!!action);
    if (action && self && this.interactionHint) {
      const { width, height } = this.worldSize();
      this.interactionHint.setText('E · ' + action.label);
      this.interactionHint.setPosition(
        Phaser.Math.Clamp(
          self.x,
          this.interactionHint.width / 2 + TILE,
          width - this.interactionHint.width / 2 - TILE,
        ),
        Math.min(self.y + 44, height - TILE - 12),
      );
    }
  }

  override create() {
    this.exiting = false;
    this.activeBubble = null;
    this.interactions = [];
    super.create();
    this.cameras.main.setBackgroundColor('#242c2b');
    this.interactionHint = this.add
      .text(0, 0, '', {
        fontFamily: 'Inter, sans-serif',
        fontSize: '10px',
        color: '#f3f0e4',
        backgroundColor: '#263b34',
        padding: { x: 6, y: 4 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(9000)
      .setVisible(false);
    const onKey = (event: KeyboardEvent) => {
      const ui = useUi.getState();
      if (event.repeat || typing() || ui.panel || ui.activity || document.querySelector('.backdrop')) return;
      if (event.key === 'Escape') {
        this.activeBubble?.destroy();
        this.activeBubble = null;
      }
      if (event.key.toLowerCase() !== 'e' || this.exiting || !this.layer?.self) return;
      const { x, y } = this.layer.self.container;
      this.nearestInteraction(x, y)?.run();
    };
    window.addEventListener('keydown', onKey);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKey);
      this.activeBubble?.destroy();
      this.activeBubble = null;
      this.interactions = [];
      this.interactionHint = null;
    });
  }

  protected interactAt(x: number, y: number, label: string, run: () => void) {
    this.interactions.push({ x, y, label, run });
  }

  protected expireBubble(bubble: Phaser.GameObjects.Container) {
    this.time.delayedCall(4500, () => {
      if (this.activeBubble !== bubble) return;
      if (useUi.getState().reducedMotion) {
        bubble.destroy();
        this.activeBubble = null;
        return;
      }
      this.tweens.add({
        targets: bubble,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          bubble.destroy();
          if (this.activeBubble === bubble) this.activeBubble = null;
        },
      });
    });
  }

  protected override onSelfMove(x: number, y: number) {
    if (!this.exiting && y >= 9.8 * TILE && x >= 6.5 * TILE && x <= 9.5 * TILE) {
      this.exiting = true;
      void net.goTown();
    }
  }

  protected containBubble(bubble: Phaser.GameObjects.Container, text: Phaser.GameObjects.Text) {
    const { width, height } = this.worldSize();
    bubble.setPosition(
      Phaser.Math.Clamp(bubble.x, TILE + text.width / 2, width - TILE - text.width / 2),
      Phaser.Math.Clamp(bubble.y, 72 + text.height / 2, height - TILE - text.height / 2),
    );
  }
}

export class CompanyScene extends InteriorScene {
  constructor() {
    super('company');
  }

  protected worldSize() {
    return { width: COMPANY_COLS * TILE, height: COMPANY_ROWS * TILE };
  }

  protected blockers() {
    return COMPANY_BLOCKERS;
  }

  protected matchesRoom(room: Room) {
    return room.name === 'company';
  }

  protected buildWorld() {
    // 1. Office background texture
    const officeKey = 'vietprodev:office';
    if (!this.textures.exists(officeKey)) {
      this.textures.addCanvas(officeKey, paintCompanyOffice());
    }
    this.add.image(0, 0, officeKey).setOrigin(0).setDepth(-10);

    // 2. Sleeping Employees with floating Zzz animations & click dialogues
    const zzzKey = 'vietprodev:zzz';
    if (!this.textures.exists(zzzKey)) {
      this.textures.addCanvas(zzzKey, drawZzzBubble());
    }

    for (const emp of SLEEPING_EMPLOYEES) {
      const empTexKey = `emp:${emp.id}`;
      if (!this.textures.exists(empTexKey)) {
        this.textures.addCanvas(empTexKey, drawSleepingEmployee(emp));
      }

      const container = this.add.container(emp.x, emp.y);
      container.setDepth(emp.y + 12);

      // Character sprite
      const sprite = this.add.image(0, 0, empTexKey).setOrigin(0.5, 0.7);
      container.add(sprite);

      // Floating Zzz bubble
      const zzz = this.add.image(20, -14, zzzKey).setOrigin(0.5, 0.5).setScale(0.55);
      container.add(zzz);

      // Gentle snoring / floating animation
      if (!useUi.getState().reducedMotion) {
        this.tweens.add({
          targets: zzz,
          y: '-=4',
          alpha: { from: 1, to: 0.25 },
          duration: 1800 + Math.random() * 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // Subtle breathing motion
        this.tweens.add({
          targets: sprite,
          scaleY: 0.96,
          duration: 1200 + Math.random() * 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      const badgeText = this.add
        .text(0, 30, emp.name.replace(' ', '\n'), {
          fontFamily: 'Inter, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#d9efdf',
          align: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: { x: 5, y: 2 },
          resolution: 2,
        })
        .setOrigin(0.5, 0.5);
      container.add(badgeText);

      // Interactive on click / tap
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.showEmployeeDialogue(emp, container));
      this.interactAt(emp.x, 6.5 * TILE, emp.name, () => this.showEmployeeDialogue(emp, container));
    }

    // 4. Interactive Whiteboard Zone
    const wbHit = this.add
      .zone(4.5 * TILE, 1.2 * TILE, 70, 44)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    wbHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: '📋 Sprint Backlog VietProDev',
        body: 'Sprint 99: Fix 1 bug -> sinh ra 5 bug mới. Deadline: Hôm qua. Đang giải quyết bằng 42 ly cà phê!',
      });
    });
    this.interactAt(4.5 * TILE, 2.8 * TILE, 'Sprint backlog', () => wbHit.emit('pointerdown'));

    // 5. Interactive Coffee Machine Zone
    const coffeeHit = this.add
      .zone(14 * TILE, 47, 60, 70)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    coffeeHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'reward',
        title: '☕ Cà Phê VietProDev Đậm Đặc',
        body: 'Bạn đã nhấp một ngụm cà phê phin đậm đặc. Hồi phục 100% năng lượng lập trình viên!',
      });
    });
    this.interactAt(14 * TILE, 3.6 * TILE, 'Cà phê', () => coffeeHit.emit('pointerdown'));

    // 6. Interactive Server Rack Zone
    const srvHit = this.add.zone(60, 48, 52, 68).setOrigin(0.5).setInteractive({ useHandCursor: true });
    srvHit.on('pointerdown', () => {
      play('click');
      useUi.getState().toast({
        kind: 'info',
        title: '🖥️ VietProDev Server Rack',
        body: 'CPU: 99.8% | RAM: 63.9/64GB | Kubernetes: 14 Pods CrashLoopBackOff. Đang chờ dev thức dậy!',
      });
    });
    this.interactAt(1.8 * TILE, 3.6 * TILE, 'Server rack', () => srvHit.emit('pointerdown'));
  }

  private showEmployeeDialogue(emp: SleepingEmployee, container: Phaser.GameObjects.Container) {
    play('pop');
    useUi.getState().toast({ kind: 'info', title: emp.name, body: emp.role + ' — ' + emp.dialogue });
    this.activeBubble?.destroy();

    const bubble = this.add.container(container.x, container.y - 56);
    bubble.setDepth(9999);

    const txt = this.add
      .text(0, 0, `"${emp.dialogue}"`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        color: '#f8fafc',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        padding: { x: 8, y: 5 },
        wordWrap: { width: 180 },
        align: 'center',
        resolution: 2,
      })
      .setOrigin(0.5, 0.5);

    bubble.add(txt);
    this.containBubble(bubble, txt);
    this.activeBubble = bubble;

    this.expireBubble(bubble);
  }
}

export class UniversityScene extends InteriorScene {
  private welcomeShown = false;
  private personContainers = new Map<string, Phaser.GameObjects.Container>();

  constructor() {
    super('university');
  }

  protected worldSize() {
    return { width: DNTU_COLS * TILE, height: DNTU_ROWS * TILE };
  }

  protected blockers() {
    return DNTU_BLOCKERS;
  }

  protected matchesRoom(room: Room) {
    return room.name === 'university';
  }

  protected buildWorld() {
    // 1. DNTU Grand Campus Interior Background
    const campusKey = 'dntu:campus';
    if (!this.textures.exists(campusKey)) {
      this.textures.addCanvas(campusKey, paintDntuCampus());
    }
    this.add.image(0, 0, campusKey).setOrigin(0).setDepth(-10);

    // 2. Interactive Lecturers, Students, and AI Bot
    this.personContainers.clear();
    for (const person of DNTU_PEOPLE) {
      const personTexKey = `dntu:${person.id}`;
      if (!this.textures.exists(personTexKey)) {
        this.textures.addCanvas(personTexKey, drawDntuPerson(person));
      }

      const container = this.add.container(person.x, person.y);
      container.setDepth(person.y + 12);
      this.personContainers.set(person.id, container);

      // Character sprite
      const sprite = this.add.image(0, 0, personTexKey).setOrigin(0.5, 0.7);
      container.add(sprite);

      // Subtle breathing / idle motion
      if (!useUi.getState().reducedMotion) {
        this.tweens.add({
          targets: sprite,
          scaleY: 0.96,
          duration: 1200 + Math.random() * 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      const badgeText = this.add
        .text(0, 22, person.name, {
          fontFamily: 'Inter, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fae9c9',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: { x: 5, y: 2 },
          resolution: 2,
        })
        .setOrigin(0.5, 0.5);
      container.add(badgeText);

      // Interactive on click / tap
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.showPersonDialogue(person, container));
      this.interactAt(person.x, person.y, person.name, () => this.showPersonDialogue(person, container));
    }

    // 2b. Auto-welcome quote when entering university: Thầy Tân welcomes player!
    const thayTan = DNTU_PEOPLE.find((p) => p.id === 'thay_tan');
    const thayTanContainer = this.personContainers.get('thay_tan');
    if (thayTan && thayTanContainer && !this.welcomeShown) {
      this.time.delayedCall(500, () => {
        if (this.activeBubble || this.exiting) return;
        this.welcomeShown = true;
        this.showPersonDialogue(thayTan, thayTanContainer);
      });
    }

    // 4. Interactive Smart Board Zone (center top)
    const smartBoardHit = this.add
      .zone(8 * TILE, 30, 232, 44)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    smartBoardHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: '🖥️ Màn Hình Cảm Ứng Thông Minh DNTU',
        body: 'Đang trình chiếu: "Ứng dụng AI & IoT trong chuyển đổi số doanh nghiệp". Sinh viên DNTU thực hành trực tiếp trên hệ thống Lab hiện đại!',
      });
    });
    this.interactAt(8 * TILE, 3.2 * TILE, 'Màn hình DNTU', () => smartBoardHit.emit('pointerdown'));

    // 5. Interactive Digital Library Zone (left top)
    const libHit = this.add.zone(64, 69, 64, 106).setOrigin(0.5).setInteractive({ useHandCursor: true });
    libHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: '📚 Thư Viện Số & Tài Nguyên Học Liệu DNTU',
        body: 'Truy cập hơn 100,000+ tài liệu, giáo trình điện tử, đề án tốt nghiệp xuất sắc và cơ sở dữ liệu NCKH quốc tế IEEE/Scopus.',
      });
    });
    this.interactAt(2.2 * TILE, 4.5 * TILE, 'Thư viện', () => libHit.emit('pointerdown'));

    // 6. Interactive Awards & Accreditation Showcase (right top)
    const trophyHit = this.add.zone(448, 69, 64, 106).setOrigin(0.5).setInteractive({ useHandCursor: true });
    trophyHit.on('pointerdown', () => {
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: '🏆 Tủ Huy Chương & Kiểm Định Chất Lượng',
        body: 'Trường ĐH Công nghệ Đồng Nai đạt chuẩn Kiểm định Quốc gia MOET, Top trường đào tạo ứng dụng hàng đầu vùng kinh tế trọng điểm phía Nam!',
      });
    });
    this.interactAt(13.8 * TILE, 4.5 * TILE, 'Thành tựu DNTU', () => trophyHit.emit('pointerdown'));
  }

  private showPersonDialogue(person: DntuPerson, container: Phaser.GameObjects.Container) {
    play('pop');
    useUi.getState().toast({ kind: 'info', title: person.name, body: person.role + ' — ' + person.dialogue });
    this.activeBubble?.destroy();

    const bubble = this.add.container(container.x, container.y - 56);
    bubble.setDepth(9999);

    const txt = this.add
      .text(0, 0, `"${person.dialogue}"`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        color: '#f8fafc',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        padding: { x: 8, y: 5 },
        wordWrap: { width: 200 },
        align: 'center',
        resolution: 2,
      })
      .setOrigin(0.5, 0.5);

    bubble.add(txt);
    this.containBubble(bubble, txt);
    this.activeBubble = bubble;

    this.expireBubble(bubble);
  }
}
