import {
  APARTMENT_COLS,
  APARTMENT_ROWS,
  BLOCKERS,
  COMGA_BLOCKERS,
  COMGA_COLS,
  COMGA_ROWS,
  COMPANY_BLOCKERS,
  COMPANY_COLS,
  COMPANY_ROWS,
  CYBERNET_BLOCKERS,
  CYBERNET_COLS,
  CYBERNET_ROWS,
  BIDA_BLOCKERS,
  BIDA_COLS,
  BIDA_ROWS,
  DNTU_BLOCKERS,
  DNTU_COLS,
  DNTU_ROWS,
  FISHING_RODS,
  MAP_HEIGHT,
  MAP_WIDTH,
  FARM_BLOCKERS,
  FARM_HEIGHT,
  FARM_WIDTH,
  FARM_PLOT_TOTAL,
  getFarmPlotRect,
  getPlotUnlockPrice,
  FARM_POIS,
  t,
  TILE,
  ZONES,
  zoneAt,
  type FishShadowTier,
  type Rect,
} from '@cozy/game-data';
import { getStateCallbacks, type Room } from 'colyseus.js';
import Phaser from 'phaser';
import { duckGrid } from '../art/items';
import { paintFarmLandscape } from '../art/farm-landscape';
import {
  paintShopBacSau,
  paintSiloWarehouse,
  paintPoultryCoop,
  paintPigPen,
  paintGoatPen,
  paintPlotTile,
} from '../art/farm-props';
import { api } from '../lib/api';
import { APT_ART_SIDE, APT_ART_TOP } from '../art/apartment';
import { drawRotatedFurniture } from '../art/furniture';
import { COMGA_PEOPLE, drawComGaPerson, paintComGaInterior, type ComGaPerson } from '../art/comga';
import { CYBERNET_PEOPLE, drawCyberNetPerson, paintCyberNetInterior } from '../art/cybernet';
import { BIDA_PEOPLE, drawBidaPerson, paintBidaInterior, type BidaPerson } from '../art/bida';
import {
  drawSleepingEmployee,
  drawZzzBubble,
  paintCompanyOffice,
  SLEEPING_EMPLOYEES,
  type SleepingEmployee,
} from '../art/company';
import {
  DNTU_BUILDINGS,
  DNTU_PEOPLE,
  DNTU_PROPS,
  DNTU_TREES,
  drawDntuPerson,
  drawDntuTree,
  paintDntuGround,
  type DntuPerson,
} from '../art/dntu';
import { APT_TILE, paintApartment } from '../art/town';
import { buildDetailedTown } from '../art/town-detail';
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
    // Loading can finish after a room snapshot arrives. Attach once the scene
    // becomes active, when PlayerLayer can safely create existing avatars.
    this.events.once(Phaser.Scenes.Events.CREATE, () => {
      if (!this.layer && net.room) this.bindRoom(net.room);
    });
    const onResize = () => this.fitCamera();
    const unsubZoom = useUi.subscribe((state, prevState) => {
      if (state.zoom !== prevState.zoom) {
        this.fitCamera();
      }
    });
    const teardown = () => {
      this.scale.off('resize', onResize);
      unsubZoom();
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
    const zoomMultiplier = useUi.getState().zoom;
    const baseZoom = Math.max(
      1,
      Math.min(3, Math.round(Math.min(this.scale.width / 520, this.scale.height / 360))),
    );
    const zoom = Math.max(0.5, Math.min(4.0, Math.round(baseZoom * zoomMultiplier * 100) / 100));
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
    buildDetailedTown(this);
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
      if (zone === 'farm_gate') {
        const myId = useUi.getState().myUserId;
        if (myId) {
          play('pop');
          void net.goFarm(myId, 'Trang Trại Cá Nhân');
        }
      }
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
    const baseZoom = Math.max(
      1,
      Math.min(3, Math.floor(Math.min(this.scale.width / width, this.scale.height / height))),
    );
    const zoom = Math.max(0.5, Math.min(4, baseZoom * useUi.getState().zoom));
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

  protected override fitCamera() {
    const { width, height } = this.worldSize();
    const zoom = Math.max(0.5, Math.min(4, useUi.getState().zoom));
    this.cameras.main.setZoom(zoom).setBounds(0, 0, width, height);
    if (!this.layer?.self) this.cameras.main.centerOn(43 * TILE, 18.5 * TILE);
  }

  protected blockers() {
    return DNTU_BLOCKERS;
  }

  protected matchesRoom(room: Room) {
    return room.name === 'university';
  }

  protected buildWorld() {
    // 1. DNTU Grand Campus Ground Canvas (Grass, Paved Roads, Sports Pitches, Plazas)
    const groundKey = 'dntu:ground';
    if (!this.textures.exists(groundKey)) {
      this.textures.addCanvas(groundKey, paintDntuGround());
    }
    this.add.image(0, 0, groundKey).setOrigin(0).setDepth(-10);

    // 2. 2.5D Architectural Campus Buildings (Depth-sorted with realistic elevations)
    for (const bldg of DNTU_BUILDINGS) {
      const bldgKey = `dntu:bldg-${bldg.id}`;
      if (!this.textures.exists(bldgKey)) {
        this.textures.addCanvas(bldgKey, bldg.draw());
      }
      const img = this.add.image(bldg.x, bldg.y - bldg.roofHeight, bldgKey).setOrigin(0, 0);
      img.setDepth(bldg.depth ?? bldg.y + bldg.h);
    }

    // 3. 2.5D Depth-Sorted Props (Goals, Hoops, Flagpole, Lecture Podium, Fountain, Benches, Lamps)
    for (const prop of DNTU_PROPS) {
      const propKey = `dntu:prop-${prop.id}`;
      if (!this.textures.exists(propKey)) {
        this.textures.addCanvas(propKey, prop.draw());
      }
      const img = this.add.image(prop.x, prop.y, propKey).setOrigin(0.5, 1.0);
      img.setDepth(prop.y);
    }

    // 4. 2.5D Depth-Sorted Campus Trees (Red Phượng Vĩ, Royal Palms, Golden Bells, Grand Banyan)
    for (const tree of DNTU_TREES) {
      const treeKey = `dntu:tree-${tree.kind}-${tree.scale}`;
      if (!this.textures.exists(treeKey)) {
        this.textures.addCanvas(treeKey, drawDntuTree(tree.kind, tree.scale));
      }
      const img = this.add.image(tree.x, tree.y, treeKey).setOrigin(0.5, 0.95);
      img.setDepth(tree.y);
    }

    // 5. Interactive Lecturers, Students, and AI Bot
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

      // Name & role badge
      const badgeText = this.add
        .text(0, -38, `${person.name} · ${person.role}`, {
          fontFamily: 'Inter, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fbbf24',
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

    // 5b. Auto-welcome quote when entering university: Thầy Tân welcomes player!
    const thayTan = DNTU_PEOPLE.find((p) => p.id === 'thay_tan');
    const thayTanContainer = this.personContainers.get('thay_tan');
    if (thayTan && thayTanContainer && !this.welcomeShown) {
      this.time.delayedCall(500, () => {
        if (this.activeBubble || this.exiting) return;
        this.welcomeShown = true;
        this.showPersonDialogue(thayTan, thayTanContainer);
      });
    }

    // 6. Ambient soft campus illumination glow
    ensureAtmosphereTextures(this);
    this.add
      .image((DNTU_COLS * TILE) / 2, (DNTU_ROWS * TILE) / 2, 'glow:indoor')
      .setScale(4.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.18)
      .setDepth(2000);

    // 7. Interactive Library & Information Center (Khu C)
    const libraryHit = this.add
      .zone(18.5 * TILE, 11 * TILE, 160, 60)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    libraryHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: '📚 Trung Tâm Thông Tin - Thư Viện DNTU',
        body: 'Thư viện số 4 tầng với 50,000+ đầu sách, cơ sở dữ liệu quốc tế IEEE/Scopus và phòng tự học thông minh mở cửa 24/7!',
      });
    });
    this.interactAt(18.5 * TILE, 15.5 * TILE, 'Thư viện DNTU', () => libraryHit.emit('pointerdown'));

    // 8. Interactive Sân Bóng Đá Cỏ Nhân Tạo (Khu E)
    const soccerHit = this.add
      .zone(7.2 * TILE, 16 * TILE, 200, 140)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    soccerHit.on('pointerdown', () => {
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: '⚽ Sân Bóng Đá Cỏ Nhân Tạo DNTU',
        body: 'Sân bóng đá cỏ nhân tạo trong khu thể thao DNTU, nơi sinh viên tập luyện và tổ chức các giải giao lưu.',
      });
    });
    this.interactAt(7.2 * TILE, 16 * TILE, 'Sân bóng đá', () => soccerHit.emit('pointerdown'));

    // 9. Interactive Sân Bóng Rổ (Khu E)
    const basketballHit = this.add
      .zone(10 * TILE, 24 * TILE, 120, 80)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    basketballHit.on('pointerdown', () => {
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: '🏀 Sân Bóng Rổ DNTU',
        body: 'Sân bóng rổ trong khu thể thao DNTU, dành cho các buổi tập và hoạt động giao lưu của sinh viên.',
      });
    });
    this.interactAt(10 * TILE, 24 * TILE, 'Sân bóng rổ', () => basketballHit.emit('pointerdown'));

    // 10. Interactive Trường Quay Media Studio (Khu A South Wing)
    const studioHit = this.add
      .zone(31 * TILE, 24.5 * TILE, 120, 50)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    studioHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: '🎬 Trường Quay DNTU Media Studio',
        body: 'Hệ thống trường quay hiện đại phục vụ sản xuất truyền hình, podcast, livestream sự kiện và đồ án sáng tạo nội dung của sinh viên!',
      });
    });
    this.interactAt(31 * TILE, 22.5 * TILE, 'Trường quay DNTU', () => studioHit.emit('pointerdown'));

    // 11. Interactive Vườn Khởi Nghiệp & Sáng Tạo (North Park)
    const startupHit = this.add
      .zone(29 * TILE, 3.5 * TILE, 120, 50)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    startupHit.on('pointerdown', () => {
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: '💡 Vườn Ươm Sáng Tạo Khởi Nghiệp DNTU',
        body: 'Nơi chắp cánh hàng chục dự án startup sinh viên đạt giải thưởng quốc gia và kết nối quỹ đầu tư doanh nghiệp!',
      });
    });
    this.interactAt(29 * TILE, 6.5 * TILE, 'Vườn khởi nghiệp', () => startupHit.emit('pointerdown'));

    // 12. Interactive Ký Túc Xá & Căng Tin (South-West)
    const canteenHit = this.add
      .zone(7 * TILE, 29 * TILE, 140, 50)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    canteenHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: '🍱 Căng Tin & Ký Túc Xá Sinh Viên DNTU',
        body: 'Khu ẩm thực sinh viên nhộn nhịp: Cơm gà xối mỡ, bún bò, bánh mì chả lụa và trà đào cam sả thơm ngon giá hạt dẻ!',
      });
    });
    this.interactAt(7 * TILE, 27.5 * TILE, 'Căng tin DNTU', () => canteenHit.emit('pointerdown'));

    // 13. Interactive Smart Operations Center (Khu G) - required by interior-render.spec.ts!
    this.interactAt(8 * TILE, 4.6 * TILE, 'Điều hành thông minh', () => {
      play('click');
      useUi.getState().toast({
        kind: 'info',
        title: '🖥️ Màn Hình Trung Tâm Điều Hành Thông Minh DNTU',
        body: 'Bảng điều khiển giám sát năng lượng mặt trời, hệ thống phòng thực hành IoT và máy chủ trung tâm!',
      });
    });

    // 14. Interactive DNTU Fitness & Gym (Khu G West)
    this.interactAt(4.5 * TILE, 4.6 * TILE, 'Fitness & Gym', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'reward',
        title: '🏋️ DNTU Fitness & Gym Center (Khu G)',
        body: 'Phòng tập thể hình hiện đại chuẩn quốc tế dành riêng cho sinh viên và giảng viên DNTU: dàn máy tập tạ đa năng, máy chạy bộ cardio và huấn luyện viên tận tình!',
      });
    });

    // 15. Interactive Automotive Workshop (Khu F Bay 1)
    this.interactAt(4.5 * TILE, 9.5 * TILE, 'Xưởng ô tô', () => {
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: '🚗 Xưởng Thực Hành Công Nghệ Ô Tô Khu F',
        body: 'Cầu nâng thủy lực 2 trụ đang nâng chiếc xe thể thao để sinh viên thực hành chẩn đoán hệ thống phun xăng điện tử và cân chỉnh góc đặt bánh xe 3D!',
      });
    });

    // 16. Interactive Precision CNC & Mechanical Lab (Khu F Bay 3)
    this.interactAt(9.5 * TILE, 9.5 * TILE, 'Phòng CNC', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: '⚙️ Trung Tâm Gia Công Cơ Khí Chính Xác & CNC Khu F',
        body: 'Máy phay CNC 5 trục và máy tiện vạn năng công nghệ Đức, nơi sinh viên chế tạo các chi tiết cơ khí chính xác cho các cuộc thi sáng tạo robot Robocon!',
      });
    });

    // 17. Interactive Grand Triumphal Archway (Trụ Sở Chính BGH)
    this.interactAt(35 * TILE, 18.5 * TILE, 'Cổng vòm DNTU', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: '🏛️ Cổng Vòm Khải Hoàn · Trụ Sở Chính DNTU',
        body: 'Cổng vòm Neoclassical tráng lệ biểu tượng của Đại học Công nghệ Đồng Nai, kết nối cổng chính vào sân trung tâm và các khoa đào tạo!',
      });
    });
  }

  protected override onSelfMove(x: number, y: number) {
    // 1. Walk out through Gate 1 (Cổng 1) to return to town
    const nearGate1 = x >= 47 * TILE && y >= 16 * TILE && y <= 24 * TILE;
    const nearGate2 = x >= 47 * TILE && y >= 12 * TILE && y <= 15 * TILE;
    if (!this.exiting && (nearGate1 || nearGate2)) {
      this.exiting = true;
      void net.goTown();
    }
  }

  private showPersonDialogue(person: DntuPerson, container: Phaser.GameObjects.Container) {
    play('pop');
    useUi.getState().toast({ kind: 'info', title: person.name, body: person.dialogue });
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

export class ComGaScene extends InteriorScene {
  private welcomeShown = false;
  private personContainers = new Map<string, Phaser.GameObjects.Container>();

  constructor() {
    super('comga');
  }

  protected worldSize() {
    return { width: COMGA_COLS * TILE, height: COMGA_ROWS * TILE };
  }

  protected blockers() {
    return COMGA_BLOCKERS;
  }

  protected matchesRoom(room: Room) {
    return room.name === 'comga';
  }

  protected override onSelfMove(x: number, y: number) {
    if (!this.exiting && y >= 8.6 * TILE && x >= 5.5 * TILE && x <= 8.5 * TILE) {
      this.exiting = true;
      void net.goTown();
    }
  }

  protected buildWorld() {
    // 1. Cơm Gà 68 interior texture
    const texKey = 'comga:interior';
    if (!this.textures.exists(texKey)) {
      this.textures.addCanvas(texKey, paintComGaInterior());
    }
    this.add.image(0, 0, texKey).setOrigin(0).setDepth(-10);

    // 2. Interactive NPCs (Anh Sáu, Bé Vy, Chú Ba)
    this.personContainers.clear();
    for (const person of COMGA_PEOPLE) {
      const personTexKey = `comga:${person.id}`;
      if (!this.textures.exists(personTexKey)) {
        this.textures.addCanvas(personTexKey, drawComGaPerson(person));
      }

      const container = this.add.container(person.x, person.y);
      container.setDepth(person.y + 12);
      this.personContainers.set(person.id, container);

      const sprite = this.add.image(0, 0, personTexKey).setOrigin(0.5, 0.7);
      container.add(sprite);

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
        .text(0, -38, `${person.name} · ${person.role}`, {
          fontFamily: 'Inter, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fef08a',
          backgroundColor: 'rgba(153, 27, 27, 0.88)',
          padding: { x: 5, y: 2 },
          resolution: 2,
        })
        .setOrigin(0.5, 0.5);
      container.add(badgeText);

      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.showPersonDialogue(person, container));
      this.interactAt(person.x, person.y, person.name, () => this.showPersonDialogue(person, container));
    }

    // Auto-welcome when entering: Anh Sáu greets player
    const anhSau = COMGA_PEOPLE.find((p) => p.id === 'anh_sau_chu_quan');
    const anhSauContainer = this.personContainers.get('anh_sau_chu_quan');
    if (anhSau && anhSauContainer && !this.welcomeShown) {
      this.time.delayedCall(500, () => {
        if (this.activeBubble || this.exiting) return;
        this.welcomeShown = true;
        this.showPersonDialogue(anhSau, anhSauContainer);
      });
    }

    // 3. Ambient warm golden lighting
    ensureAtmosphereTextures(this);
    this.add
      .image((COMGA_COLS * TILE) / 2, (COMGA_ROWS * TILE) / 2, 'glow:indoor')
      .setScale(2.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.24)
      .setDepth(2000);

    // 4. Interactive Crispy Chicken Fryer Station
    const fryerHit = this.add
      .zone(2.5 * TILE, 1.5 * TILE, 70, 45)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    fryerHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'reward',
        title: '🍗 Chảo Xối Mỡ Da Giòn Nóng Hổi',
        body: 'Tiếng mỡ sôi xèo xèo vàng óng. Đùi gà góc tư thơm lừng giòn rụm vừa xối mỡ xong, lớp da giòn tan hấp dẫn!',
      });
    });
    this.interactAt(2.5 * TILE, 3.2 * TILE, 'Bếp chiên gà', () => fryerHit.emit('pointerdown'));

    // 5. Interactive Tomato Rice & Soup Pot Station
    const riceHit = this.add
      .zone(11.5 * TILE, 1.5 * TILE, 70, 45)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    riceHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: '🍚 Nồi Cơm Chiên Cà Chua & Tô Xúp Nóng',
        body: 'Hạt cơm chiên tỏi cà chua đỏ hồng tơi xốp, thơm mùi mỡ gà, đi kèm canh xúp súp hầm xương ngọt lịm.',
      });
    });
    this.interactAt(11.5 * TILE, 3.2 * TILE, 'Quầy cơm chiên', () => riceHit.emit('pointerdown'));

    // 6. Interactive Stainless Dining Table
    const tableHit = this.add
      .zone(8.5 * TILE, 4.5 * TILE, 70, 40)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    tableHit.on('pointerdown', () => {
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: '🥢 Bàn Ăn Inox Quán 68',
        body: 'Đầy đủ hũ dưa leo đồ chua giòn ngọt, ớt tỏi băm ngâm xì dầu và trà đá Biên Hòa mát rượi giải ngấy!',
      });
    });
    this.interactAt(8.5 * TILE, 6.2 * TILE, 'Bàn ăn inox', () => tableHit.emit('pointerdown'));
  }

  private showPersonDialogue(person: ComGaPerson, container: Phaser.GameObjects.Container) {
    play('pop');
    useUi.getState().toast({ kind: 'info', title: person.name, body: person.dialogue });
    this.activeBubble?.destroy();

    const bubble = this.add.container(container.x, container.y - 56);
    bubble.setDepth(9999);

    const txt = this.add
      .text(0, 0, `"${person.dialogue}"`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        color: '#fef08a',
        backgroundColor: 'rgba(127, 29, 29, 0.95)',
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

export class BidaScene extends InteriorScene {
  private welcomeShown = false;
  private personContainers = new Map<string, Phaser.GameObjects.Container>();

  constructor(key = 'bida') {
    super(key);
  }

  protected worldSize() {
    return { width: BIDA_COLS * TILE, height: BIDA_ROWS * TILE };
  }

  protected blockers() {
    return BIDA_BLOCKERS;
  }

  protected matchesRoom(room: Room) {
    return room.name === 'bida';
  }

  protected override onSelfMove(x: number, y: number) {
    if (!this.exiting && y >= 10.4 * TILE && x >= 6.8 * TILE && x <= 9.2 * TILE) {
      this.exiting = true;
      void net.goTown();
    }
  }

  protected buildWorld() {
    // 1. CLB Bida H2S interior texture
    const texKey = 'bida:interior';
    if (this.textures.exists(texKey)) {
      this.textures.remove(texKey);
    }
    this.textures.addCanvas(texKey, paintBidaInterior());
    this.add.image(0, 0, texKey).setOrigin(0).setDepth(-10);

    // 2. Interactive Bida NPCs (Anh Tuấn, Minh Long, Huy Trọng Tài)
    this.personContainers.clear();
    for (const person of BIDA_PEOPLE) {
      const personTexKey = `bida:${person.id}`;
      if (!this.textures.exists(personTexKey)) {
        this.textures.addCanvas(personTexKey, drawBidaPerson(person));
      }

      const container = this.add.container(person.x, person.y);
      container.setDepth(person.y + 12);
      this.personContainers.set(person.id, container);

      const sprite = this.add.image(0, 0, personTexKey).setOrigin(0.5, 0.7);
      container.add(sprite);

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
        .text(0, -38, `${person.name} · ${person.role}`, {
          fontFamily: 'Inter, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#34d399',
          backgroundColor: 'rgba(6, 78, 59, 0.92)',
          padding: { x: 5, y: 2 },
          resolution: 2,
        })
        .setOrigin(0.5, 0.5);
      container.add(badgeText);

      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.showPersonDialogue(person, container));
      this.interactAt(person.x, person.y, person.name, () => this.showPersonDialogue(person, container));
    }

    // Auto-welcome when entering: Anh Tuấn greets player
    const tuan = BIDA_PEOPLE.find((p) => p.id === 'tuan_quan_ly');
    const tuanContainer = this.personContainers.get('tuan_quan_ly');
    if (tuan && tuanContainer && !this.welcomeShown) {
      this.time.delayedCall(500, () => {
        if (this.activeBubble || this.exiting) return;
        this.welcomeShown = true;
        this.showPersonDialogue(tuan, tuanContainer);
      });
    }

    // 3. Ambient Club Lighting (Warm emerald & gold tournament arena glow)
    ensureAtmosphereTextures(this);
    this.add
      .image((BIDA_COLS * TILE) / 2, (BIDA_ROWS * TILE) / 2, 'glow:indoor')
      .setScale(2.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0x10b981)
      .setAlpha(0.18)
      .setDepth(2000);

    // 4. Interactive Bida Tables -> Opens Bida Arena Matchmaking Panel!
    const addInteractiveTable = (name: string, x: number, y: number, w: number, h: number) => {
      const hitZone = this.add.zone(x, y, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => {
        play('pop');
        useUi.getState().setPanel('bida');
        useUi.getState().toast({
          kind: 'info',
          title: `🎱 ${name}`,
          body: 'Đang mở sảnh Bida Arena! Bạn có thể tạo phòng 1v1 hoặc tập luyện solo ngay bây giờ.',
        });
      });
      this.interactAt(x, y + h / 2 + 16, name, () => hitZone.emit('pointerdown'));
    };

    // Table 1: Pool 8-Ball Tournament Table (Left Upper)
    addInteractiveTable('Bàn 1: Pool 8-Ball Thi Đấu', 4.2 * TILE, 5.05 * TILE, 120, 65);
    // Table 2: Carom 3 Băng (Right Upper)
    addInteractiveTable('Bàn 2: Carom 3 Băng Quốc Tế', 11.8 * TILE, 5.05 * TILE, 120, 65);
    // Table 3: VIP Arena Table (Left Lower)
    addInteractiveTable('Bàn 3: VIP Arena Tranh Cúp', 4.2 * TILE, 8.45 * TILE, 120, 65);

    // 5. Interactive Carbon Cue Rack & Trophy Cabinet
    const cueRackHit = this.add
      .zone(13 * TILE, 2 * TILE, 90, 45)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    cueRackHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'reward',
        title: '🏆 Tủ Cơ Predator & Cúp Vô Địch',
        body: 'Dàn cơ Predator P3 Carbon đỉnh cao, bóng Aramith Tournament TV Pro-Cup. Cơ mướt, trợ lực cực đầm tay!',
      });
    });
    this.interactAt(13 * TILE, 3.2 * TILE, 'Tủ cơ & cúp', () => cueRackHit.emit('pointerdown'));

    // 6. Interactive Reception & Refreshments Bar
    const barHit = this.add
      .zone(3 * TILE, 2 * TILE, 90, 45)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    barHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: '🍹 Quầy Pha Chế & Giải Khát H2S',
        body: 'Phục vụ Cà phê sữa đá Biên Hòa, Sinh tố bơ, Mì xào bò & Cơm chiên giòn rụm tiếp sức các cơ thủ 24/7!',
      });
    });
    this.interactAt(3 * TILE, 3.2 * TILE, 'Quầy giải khát', () => barHit.emit('pointerdown'));
  }

  private showPersonDialogue(person: BidaPerson, container: Phaser.GameObjects.Container) {
    play('pop');
    useUi.getState().toast({ kind: 'info', title: person.name, body: person.dialogue });
    this.activeBubble?.destroy();

    const bubble = this.add.container(container.x, container.y - 56);
    bubble.setDepth(9999);

    const txt = this.add
      .text(0, 0, `"${person.dialogue}"`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        color: '#e0f2fe',
        backgroundColor: 'rgba(6, 78, 59, 0.95)',
        padding: { x: 8, y: 5 },
        wordWrap: { width: 220 },
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

export class CyberNetScene extends InteriorScene {
  constructor() {
    super('cybernet');
  }
  protected worldSize() {
    return { width: CYBERNET_COLS * TILE, height: CYBERNET_ROWS * TILE };
  }
  protected blockers() {
    return CYBERNET_BLOCKERS;
  }
  protected matchesRoom(room: Room) {
    return room.name === 'cybernet';
  }
  protected override onSelfMove(x: number, y: number) {
    if (!this.exiting && y >= 10.4 * TILE && x >= 6.8 * TILE && x <= 9.2 * TILE) {
      this.exiting = true;
      void net.goTown();
    }
  }
  protected buildWorld() {
    const key = 'cybernet:interior';
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, paintCyberNetInterior());
    this.add.image(0, 0, key).setOrigin(0).setDepth(-10);

    // 1. Ambient Cyberpunk Esports Lighting (Cyan/Neon glow)
    ensureAtmosphereTextures(this);
    this.add
      .image((CYBERNET_COLS * TILE) / 2, (CYBERNET_ROWS * TILE) / 2, 'glow:indoor')
      .setScale(2.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0x06b6d4)
      .setAlpha(0.16)
      .setDepth(2000);

    // 2. Interactive Gaming PC Stations (VIP 01 - VIP 04)
    const stations = [
      { name: 'VIP 01', x: 36 + 35, y: 144 + 24 },
      { name: 'VIP 02', x: 132 + 35, y: 144 + 24 },
      { name: 'VIP 03', x: 236 + 35, y: 144 + 24 },
      { name: 'VIP 04', x: 332 + 35, y: 144 + 24 },
    ];

    for (const st of stations) {
      // Interactive rectangle for direct mouse click / tap
      const hit = this.add
        .rectangle(st.x, st.y, 74, 58, 0x38bdf8, 0.001)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      const openStation = () => {
        play('pop');
        useUi.getState().setCyberStation(st.name);
        useUi.getState().setPanel('cybernet');
        useUi.getState().toast({
          kind: 'info',
          title: `🖥️ Máy Trạm ${st.name}`,
          body: `Đã mở màn hình máy tính Windows 11 trạm ${st.name}!`,
        });
      };
      hit.on('pointerdown', openStation);
      // Keyboard 'E' proximity interaction right in front of the chair (y: 206)
      this.interactAt(st.x, 206, `Bật máy ${st.name}`, openStation);
    }

    // 3. Interactive Cashier & Top-up Counter
    const cashierHit = this.add.zone(80, 72, 120, 48).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cashierHit.on('pointerdown', () => {
      play('coin');
      useUi.getState().toast({
        kind: 'info',
        title: '💳 Quầy Thu Ngân & Nạp Tiền CSM',
        body: 'Cyber Game HNT Trảng Dài: Nạp 50k tặng 20k, miễn phí đồ uống! Máy Core i7 14700K + RTX 4070.',
      });
    });
    this.interactAt(80, 88, 'Quầy thu ngân', () => cashierHit.emit('pointerdown'));

    // 4. Interactive Pantry, Drinks Fridge & Noodle Bar
    const pantryHit = this.add.zone(360, 72, 140, 50).setOrigin(0.5).setInteractive({ useHandCursor: true });
    pantryHit.on('pointerdown', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'reward',
        title: '🍜 Bếp Mì & Tủ Sting Ướp Lạnh',
        body: 'Sting dâu lạnh buốt & mì xào bò thơm phức! Bạn có thể bấm gọi món ngay trên máy tính phòng net.',
      });
    });
    this.interactAt(360, 88, 'Bếp mì & tủ nước', () => pantryHit.emit('pointerdown'));

    // 5. Interactive NPCs
    for (const person of CYBERNET_PEOPLE) {
      const tex = 'cybernet:' + person.id;
      if (!this.textures.exists(tex)) this.textures.addCanvas(tex, drawCyberNetPerson(person));
      const sprite = this.add
        .image(person.x, person.y, tex)
        .setOrigin(0.5, 0.7)
        .setDepth(person.y + 12);
      this.add
        .text(person.x, person.y - 38, person.name, {
          fontFamily: 'Inter, sans-serif',
          fontSize: '10px',
          color: '#e0f2fe',
          backgroundColor: '#0f172a',
          padding: { x: 5, y: 2 },
          resolution: 2,
        })
        .setOrigin(0.5)
        .setDepth(person.y + 13);
      const talk = () => {
        play('pop');
        useUi.getState().toast({ kind: 'info', title: person.name, body: person.dialogue });
      };
      sprite.setInteractive({ useHandCursor: true }).on('pointerdown', talk);
      this.interactAt(person.x, person.y, person.name, talk);
    }
  }
}

export interface FarmPlotData {
  plotIndex: number;
  isUnlocked: boolean;
  unlockPrice: number;
  isTilled: boolean;
  wateredAt: string | null;
  cropId: string | null;
  plantedAt: string | null;
  growthStage: 'seed' | 'sprout' | 'blooming' | 'mature' | null;
  isFertilized: boolean;
}

export class FarmScene extends WorldScene {
  private interactions: { x: number; y: number; run: () => void; label: string }[] = [];
  private interactionHint: Phaser.GameObjects.Text | null = null;
  private keyE!: Phaser.Input.Keyboard.Key;
  private plotSprites = new Map<number, Phaser.GameObjects.Image>();
  private plotsData: FarmPlotData[] = [];
  private refreshing = false;

  constructor() {
    super('farm');
  }

  protected worldSize() {
    return { width: FARM_WIDTH, height: FARM_HEIGHT };
  }

  protected blockers() {
    return FARM_BLOCKERS;
  }

  protected matchesRoom(room: Room) {
    return room.name === 'farm';
  }

  protected override onSelfMove(x: number, y: number) {
    // Check gate exit to town
    if (x <= 1.5 * TILE && y >= 2 * TILE && y <= 5 * TILE) {
      play('pop');
      void net.goTown();
    }
  }

  interactAt(x: number, y: number, label: string, run: () => void) {
    this.interactions.push({ x, y, label, run });
  }

  private nearestInteraction(x: number, y: number) {
    const nearest = this.interactions.reduce<(typeof this.interactions)[number] | undefined>(
      (best, action) =>
        !best || Math.hypot(action.x - x, action.y - y) < Math.hypot(best.x - x, best.y - y) ? action : best,
      undefined,
    );
    return nearest && Math.hypot(nearest.x - x, nearest.y - y) <= 2.5 * TILE ? nearest : undefined;
  }

  protected buildWorld() {
    // 1. Procedural Landscape Base
    if (!this.textures.exists('farm:landscape')) {
      this.textures.addCanvas('farm:landscape', paintFarmLandscape());
    }
    this.add.image(0, 0, 'farm:landscape').setOrigin(0, 0).setDepth(-10);

    // 2. Props & Buildings
    if (!this.textures.exists('farm:shop_bac_sau')) {
      this.textures.addCanvas('farm:shop_bac_sau', paintShopBacSau());
    }
    const shopP = FARM_POIS.shop_bac_sau;
    const shopSprite = this.add
      .image(shopP.x + shopP.w / 2, shopP.y - 12, 'farm:shop_bac_sau')
      .setOrigin(0.5, 0.6)
      .setDepth(shopP.y + 12);
    const openShop = () => {
      play('pop');
      useUi.getState().setPanel('farm-shop');
    };
    shopSprite.setInteractive({ useHandCursor: true }).on('pointerdown', openShop);
    this.interactAt(shopP.x + shopP.w / 2, shopP.y + shopP.h / 2 + 16, 'Tiệm Bác Sáu', openShop);

    // Silo Warehouse
    if (!this.textures.exists('farm:silo_warehouse')) {
      this.textures.addCanvas('farm:silo_warehouse', paintSiloWarehouse());
    }
    const siloP = FARM_POIS.silo_warehouse;
    const siloSprite = this.add
      .image(siloP.x + siloP.w / 2, siloP.y - 10, 'farm:silo_warehouse')
      .setOrigin(0.5, 0.6)
      .setDepth(siloP.y + 12);
    const openSilo = () => {
      play('pop');
      useUi.getState().setPanel('farm-silo');
    };
    siloSprite.setInteractive({ useHandCursor: true }).on('pointerdown', openSilo);
    this.interactAt(siloP.x + siloP.w / 2, siloP.y + siloP.h / 2 + 16, 'Nhà kho Silo', openSilo);

    // Barns
    if (!this.textures.exists('farm:poultry_coop')) {
      this.textures.addCanvas('farm:poultry_coop', paintPoultryCoop());
    }
    const poultryP = FARM_POIS.poultry_coop;
    this.add
      .image(poultryP.x + poultryP.w / 2, poultryP.y + poultryP.h / 2, 'farm:poultry_coop')
      .setOrigin(0.5, 0.5)
      .setDepth(poultryP.y + poultryP.h - 10);
    this.interactAt(poultryP.x + poultryP.w / 2, poultryP.y + 16, 'Chuồng gia cầm', () => {
      play('pop');
      useUi
        .getState()
        .toast({ kind: 'info', title: 'Chuồng Gia Cầm', body: 'Gà ri và vịt xiêm đang mổ thóc khỏe mạnh.' });
    });

    // Center Park Bench
    this.interactAt(17 * TILE, 17 * TILE, 'Ghế nghỉ chân', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: 'Ghế Nghỉ Chân',
        body: 'Ngồi nghỉ ngơi dưới bóng cây xanh mát giữa trang trại bình yên.',
      });
    });

    if (!this.textures.exists('farm:pig_pen')) {
      this.textures.addCanvas('farm:pig_pen', paintPigPen());
    }
    const pigP = FARM_POIS.pig_pen;
    this.add
      .image(pigP.x + pigP.w / 2, pigP.y + pigP.h / 2, 'farm:pig_pen')
      .setOrigin(0.5, 0.5)
      .setDepth(pigP.y + pigP.h - 10);
    this.interactAt(pigP.x + pigP.w / 2, pigP.y + 16, 'Chuồng heo', () => {
      play('pop');
      useUi
        .getState()
        .toast({ kind: 'info', title: 'Chuồng Heo', body: 'Đàn heo sọc dưa đang lăn bùn thỏa thích.' });
    });

    if (!this.textures.exists('farm:goat_pen')) {
      this.textures.addCanvas('farm:goat_pen', paintGoatPen());
    }
    const goatP = FARM_POIS.goat_pen;
    this.add
      .image(goatP.x + goatP.w / 2, goatP.y + goatP.h / 2, 'farm:goat_pen')
      .setOrigin(0.5, 0.5)
      .setDepth(goatP.y + goatP.h - 10);
    this.interactAt(goatP.x + goatP.w / 2, goatP.y + 16, 'Chuồng dê', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: 'Chuồng Dê & Cừu',
        body: 'Dê Bách Thảo đang leo cầu dốc gỗ thoăn thoắt.',
      });
    });

    // Fishing Pond Dock
    const pondP = FARM_POIS.aquaculture_pond;
    const dockX = pondP.x + pondP.w / 2;
    const dockY = pondP.y + pondP.h - 10;
    this.interactAt(dockX, dockY, 'Hồ câu cá', () => {
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: 'Hồ Cá Nông Trại',
        body: 'Mặt hồ phẳng lặng trong vắt với hoa sen nở ngát hương và thuyền gỗ neo bên bến.',
      });
    });

    // Gate Exit to Town
    this.interactAt(1.5 * TILE, 3.5 * TILE, 'Về thị trấn', () => {
      play('pop');
      void net.goTown();
    });

    // 3. 36 Plots Grid Setup
    for (let i = 0; i < FARM_PLOT_TOTAL; i++) {
      const r = getFarmPlotRect(i);
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const price = getPlotUnlockPrice(i);
      const isStarter = i < 4;

      const texKey = `farm:plot:${i}`;
      if (!this.textures.exists(texKey)) {
        this.textures.addCanvas(texKey, paintPlotTile(isStarter, false, undefined, undefined, price));
      }
      const sprite = this.add.image(cx, cy, texKey).setOrigin(0.5, 0.5).setDepth(-5);

      const openPlot = () => {
        play('pop');
        useUi.getState().setActivePlotIndex(i);
        useUi.getState().setPanel('farm-plot');
      };
      sprite.setInteractive({ useHandCursor: true }).on('pointerdown', openPlot);
      this.interactAt(cx, cy, `Ô đất #${i + 1}`, openPlot);
      this.plotSprites.set(i, sprite);
    }

    // Interaction Hint Text
    this.interactionHint = this.add
      .text(0, 0, '', {
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        color: '#fef08a',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(9999)
      .setVisible(false);

    // Keyboard E
    this.keyE = this.input.keyboard!.addKey('E');
    this.keyE.on('down', () => {
      const self = this.layer?.self?.container;
      if (!self || typing() || useUi.getState().panel) return;
      const nearest = this.nearestInteraction(self.x, self.y);
      if (nearest) nearest.run();
    });

    void this.fetchFarmState();
  }

  async fetchFarmState() {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      const res = await api<{
        farm: { isPublic: boolean; hasPassword: boolean };
        plots: FarmPlotData[];
      }>('/api/farm/me');
      if (res?.plots) {
        this.plotsData = res.plots;
        this.updatePlotsVisuals();
      }
    } catch {
      // offline / not logged in
    } finally {
      this.refreshing = false;
    }
  }

  private updatePlotsVisuals() {
    for (const p of this.plotsData) {
      const sprite = this.plotSprites.get(p.plotIndex);
      if (!sprite) continue;
      const isWatered = !!p.wateredAt;
      const texKey = `farm:plot_dyn:${p.plotIndex}:${p.isUnlocked}:${isWatered}:${p.cropId ?? 'none'}:${p.growthStage ?? 'none'}`;
      if (!this.textures.exists(texKey)) {
        this.textures.addCanvas(
          texKey,
          paintPlotTile(
            p.isUnlocked,
            isWatered,
            p.cropId ?? undefined,
            p.growthStage ?? undefined,
            p.unlockPrice,
          ),
        );
      }
      sprite.setTexture(texKey);
    }
  }

  protected override onBind(room: Room) {
    room.onMessage('farm:plot_watered', (msg: { plotIndex: number; name?: string }) => {
      play('farm_water');
      useUi.getState().toast({
        kind: 'info',
        title: 'Tưới nước thành công',
        body: msg.name ? `${msg.name} vừa tưới nước ô đất #${msg.plotIndex + 1}!` : undefined,
      });
      void this.fetchFarmState();
    });

    room.onMessage('farm:plot_harvested', (msg: { plotIndex: number }) => {
      play('farm_harvest');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Thu hoạch thành công',
        body: `Đã thu hoạch nông sản từ ô đất #${msg.plotIndex + 1} vào kho Silo!`,
      });
      void this.fetchFarmState();
    });

    room.onMessage('farm:updated', () => {
      void this.fetchFarmState();
    });
  }

  override update(time: number, delta: number) {
    super.update(time, delta);
    const self = this.layer?.self?.container;
    const action =
      self && !typing() && !useUi.getState().panel ? this.nearestInteraction(self.x, self.y) : undefined;
    this.interactionHint?.setVisible(!!action);
    if (action && self && this.interactionHint) {
      this.interactionHint.setText('E · ' + action.label);
      this.interactionHint.setPosition(self.x, self.y - 42);
    }
  }
}
