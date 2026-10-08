import type Phaser from 'phaser';
import {
  STREET_VENDORS,
  VENDOR_RADIUS,
  PIGEON_FEEDING_SPOTS,
  lifeGroundClear,
  shouldHideTownLife,
  type TownActor,
  type LifePoint,
  type TownEnvironment,
} from '@cozy/game-data';
import { play } from '../lib/sound';
import { useUi } from '../lib/store';
import { paintDetailedVendor } from '../art/town-vendor-art';

export const CAT_NAMES = [
  'Mèo Vàng Mướp',
  'Mèo Mướp Trắng',
  'Mèo Xám Tro',
  'Mèo Tam Thể',
  'Mèo Xiêm Cát',
] as const;

export interface TownLifeHandlers {
  talk?: (id: string) => void;
  pickUpCat?: (id: string) => void;
  putDownCat?: (id: string, pos: LifePoint) => void;
}

interface ActorView {
  root: Phaser.GameObjects.Container;
  art: Phaser.GameObjects.Graphics;
  shadow: Phaser.GameObjects.Ellipse;
  bubble: Phaser.GameObjects.Text;
}

/** Server snapshots supply behavior; the client animates and interpolates artwork. */
export class TownLifeLayer {
  private views = new Map<string, ActorView>();
  private actors: TownActor[] = [];
  private nearest: TownActor | undefined;
  private nearestCat: TownActor | undefined;
  private carriedCat: TownActor | null = null;
  private carriedCatView: { root: Phaser.GameObjects.Container; art: Phaser.GameObjects.Graphics } | null =
    null;
  private dismissed = '';
  private live: HTMLElement;
  private button: HTMLButtonElement;
  private grain: Phaser.GameObjects.Graphics;
  private talkHandler?: (id: string) => void;
  private pickUpCatHandler?: (id: string) => void;
  private putDownCatHandler?: (id: string, pos: LifePoint) => void;
  private keyHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (this.carriedCat) {
        this.putDownCat();
        return;
      }
      this.dismissed = this.nearest?.id ?? '';
      this.live.textContent = '';
      return;
    }
    if (event.repeat || event.key.toLowerCase() !== 'e' || !this.canInteract()) return;
    if (this.carriedCat) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.putDownCat();
      return;
    }
    const pos = this.self();
    const distCat =
      this.nearestCat && pos ? Math.hypot(this.nearestCat.x - pos.x, this.nearestCat.y - pos.y) : Infinity;
    const distVendor =
      this.nearest && pos ? Math.hypot(this.nearest.x - pos.x, this.nearest.y - pos.y) : Infinity;

    if (this.nearest && distVendor <= 52) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.talk(this.nearest.id);
    } else if (this.nearestCat && distCat <= 34) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.pickUpCat(this.nearestCat);
    }
  };

  constructor(
    private scene: Phaser.Scene,
    private self: () => LifePoint | null,
    sendOrHandlers: ((id: string) => void) | TownLifeHandlers,
    handlers?: TownLifeHandlers,
  ) {
    if (typeof sendOrHandlers === 'function') {
      this.talkHandler = sendOrHandlers;
      this.pickUpCatHandler = handlers?.pickUpCat;
      this.putDownCatHandler = handlers?.putDownCat;
    } else {
      this.talkHandler = sendOrHandlers.talk;
      this.pickUpCatHandler = sendOrHandlers.pickUpCat;
      this.putDownCatHandler = sendOrHandlers.putDownCat;
    }
    this.grain = scene.add.graphics().setDepth(-5);
    for (const spot of PIGEON_FEEDING_SPOTS) {
      for (let i = 0; i < 26; i++) {
        const x = Math.round(spot.x + Math.cos(i * 2.4) * (5 + i));
        const y = Math.round(spot.y + Math.sin(i * 2.4) * (4 + i * 0.7));
        if (lifeGroundClear(x, y)) this.grain.fillStyle(i % 2 ? 0xc49a5a : 0xefcf86).fillRect(x, y, 2, 1);
      }
    }
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.hidden = true;
    this.button.style.cssText =
      'position:fixed;bottom:116px;left:50%;transform:translateX(-50%);z-index:25;padding:10px 16px;border:2px solid #e4be73;border-radius:12px;background:#252f32;color:#fff3d8;font:600 14px sans-serif;cursor:pointer;max-width:90vw';
    this.button.onclick = () => {
      if (this.carriedCat) this.putDownCat();
      else if (this.nearestCat) this.pickUpCat(this.nearestCat);
      else if (this.nearest) this.talk(this.nearest.id);
    };
    this.live = document.createElement('div');
    this.live.setAttribute('role', 'status');
    this.live.setAttribute('aria-live', 'polite');
    this.live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
    document.body.append(this.button, this.live);
    window.addEventListener('keydown', this.keyHandler, true);
  }

  dialogue(reply: { name: string; text: string }) {
    this.live.textContent = `${reply.name}: ${reply.text}. Nhấn E để trò chuyện tiếp, Escape để ẩn lời thoại.`;
  }

  private canInteract() {
    const el = document.activeElement as HTMLElement | null;
    const ui = useUi.getState();
    return (
      (!ui.room.kind || ui.room.kind === 'town') &&
      !ui.panel &&
      !ui.activity &&
      !document.querySelector('.backdrop') &&
      !el?.matches('input, textarea, select, [contenteditable]')
    );
  }

  pickUpCat(cat: TownActor) {
    if (!this.canInteract()) return;
    this.carriedCat = cat;
    cat.mode = 'carried';
    play('pop');
    const catName = CAT_NAMES[cat.variant] ?? 'chú mèo';
    useUi.getState().toast({
      kind: 'reward',
      title: 'Bế Mèo Cưng',
      body: `Bạn đang bế ${catName} ngoan ngoãn trong lòng! Nhấn E hoặc click để đặt mèo xuống.`,
    });
    const pos = this.self();
    if (pos) {
      this.showHeart(pos.x, pos.y - 36);
      const v = this.views.get(cat.id);
      if (v) v.root.setPosition(pos.x, pos.y);
    }
    cat.speech = 'Meo meo~ ❤️';
    this.pickUpCatHandler?.(cat.id);
  }

  putDownCat() {
    if (!this.carriedCat) return;
    const cat = this.carriedCat;
    this.carriedCat = null;
    cat.mode = 'roaming';
    const pos = this.self();
    if (pos) {
      cat.x = pos.x;
      cat.y = pos.y + 4;
      this.showHeart(pos.x, pos.y - 36);
      const v = this.views.get(cat.id);
      if (v) {
        v.root.setPosition(pos.x, pos.y + 4);
        v.root.setVisible(true);
      }
      this.putDownCatHandler?.(cat.id, { x: pos.x, y: pos.y + 4 });
    } else {
      this.putDownCatHandler?.(cat.id, { x: cat.x, y: cat.y });
    }
    play('pop');
    const catName = CAT_NAMES[cat.variant] ?? 'chú mèo';
    useUi.getState().toast({
      kind: 'info',
      title: 'Thả Mèo',
      body: `Bạn đã đặt ${catName} xuống đất an toàn.`,
    });
    cat.speech = 'Meo~';
  }

  private showHeart(x: number, y: number) {
    const heart = this.scene.add.text(x, y, '❤️', { fontSize: '18px' }).setOrigin(0.5).setDepth(9999);
    this.scene.tweens.add({
      targets: heart,
      y: y - 24,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => heart.destroy(),
    });
  }

  private drawCarriedCat(g: Phaser.GameObjects.Graphics, cat: TownActor, time: number) {
    g.clear();
    const fur = [0xd9995a, 0xe3d3b4, 0x747d88, 0xca9778, 0xeee4ce][cat.variant]!;
    const ink = 0x354342;
    const cream = 0xf5dfad;
    const breathe = Math.sin(time / 380) * 1;
    const tailWag = Math.sin(time / 280) * 2;

    const box = (color: number, x: number, y: number, w: number, h: number) => {
      g.fillStyle(color).fillRect(x, y, w, h);
    };

    // Body cuddled in arms
    box(ink, -8, -10 + breathe, 16, 12);
    box(fur, -7, -9 + breathe, 14, 10);

    // Cute paws resting over arms
    box(cream, -6, 1 + breathe, 4, 3);
    box(cream, 2, 1 + breathe, 4, 3);

    // Rounded head nestled forward
    box(ink, -7, -18 + breathe, 14, 10);
    box(fur, -6, -17 + breathe, 12, 8);

    // Pointed cat ears
    box(fur, -6, -21 + breathe, 4, 4);
    box(fur, 2, -21 + breathe, 4, 4);
    box(0xce9a91, -5, -20 + breathe, 2, 2); // pink inner ears
    box(0xce9a91, 3, -20 + breathe, 2, 2);

    // Cute anime eyes (blinking occasionally)
    const blink = Math.sin(time / 1600) > 0.95;
    if (blink) {
      box(ink, -4, -13 + breathe, 3, 1);
      box(ink, 1, -13 + breathe, 3, 1);
    } else {
      box(ink, -4, -14 + breathe, 3, 3);
      box(ink, 1, -14 + breathe, 3, 3);
      box(0xffffff, -4, -14 + breathe, 1, 1); // sparkle twinkle
      box(0xffffff, 1, -14 + breathe, 1, 1);
    }

    // Cute muzzle & pink nose
    box(cream, -2, -11 + breathe, 4, 2);
    box(0xce9a91, -1, -11 + breathe, 2, 1);

    // Curled tail gently swaying at the side
    box(ink, 7, -6 + tailWag, 4, 8);
    box(fur, 8, -5 + tailWag, 2, 6);
  }

  private talk(id: string) {
    if (!this.canInteract()) return;
    const actor = this.actors.find((a) => a.id === id);
    const pos = this.self();
    if (!actor || !pos || Math.hypot(pos.x - actor.x, pos.y - actor.y) > VENDOR_RADIUS) return;
    this.dismissed = '';
    this.talkHandler?.(id);
  }

  update(actors: TownActor[], time: number, delta: number, env?: TownEnvironment) {
    const weather = env ?? useUi.getState().weather;
    const shouldHide = shouldHideTownLife(weather);
    this.grain.setVisible(!shouldHide);
    if (shouldHide) {
      this.actors = [];
      this.nearest = undefined;
      this.nearestCat = undefined;

      const pos = this.self();
      if (this.carriedCat && pos) {
        if (!this.carriedCatView) {
          const art = this.scene.add.graphics();
          const root = this.scene.add.container(pos.x, pos.y - 18, [art]).setDepth(pos.y + 2);
          this.carriedCatView = { root, art };
        }
        this.carriedCatView.root.setPosition(pos.x, pos.y - 18);
        this.carriedCatView.root.setDepth(pos.y + 2);
        this.drawCarriedCat(this.carriedCatView.art, this.carriedCat, time);

        const catName = CAT_NAMES[this.carriedCat.variant] ?? 'chú mèo';
        this.button.hidden = !this.canInteract();
        this.button.textContent = `E · Đặt ${catName} xuống đất`;
        this.button.onclick = () => this.putDownCat();
      } else {
        if (this.carriedCatView) {
          this.carriedCatView.root.destroy(true);
          this.carriedCatView = null;
        }
        this.button.hidden = true;
      }

      for (const [id, v] of this.views) {
        v.root.destroy(true);
        this.views.delete(id);
      }
      return;
    }
    this.actors = actors;
    const pos = this.self();

    // 1. Carried cat handling
    if (this.carriedCat && pos) {
      if (!this.carriedCatView) {
        const art = this.scene.add.graphics();
        const root = this.scene.add.container(pos.x, pos.y - 18, [art]).setDepth(pos.y + 2);
        this.carriedCatView = { root, art };
      }
      this.carriedCatView.root.setPosition(pos.x, pos.y - 18);
      this.carriedCatView.root.setDepth(pos.y + 2);
      this.drawCarriedCat(this.carriedCatView.art, this.carriedCat, time);

      const catName = CAT_NAMES[this.carriedCat.variant] ?? 'chú mèo';
      this.button.hidden = !this.canInteract();
      this.button.textContent = `E · Đặt ${catName} xuống đất`;
      this.button.onclick = () => this.putDownCat();
      this.nearest = undefined;
      this.nearestCat = undefined;
    } else {
      if (this.carriedCatView) {
        this.carriedCatView.root.destroy(true);
        this.carriedCatView = null;
      }

      this.nearestCat = pos
        ? actors
            .filter((a) => a.kind === 'cat' && Math.hypot(a.x - pos.x, a.y - pos.y) <= 34)
            .sort((a, b) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(b.x - pos.x, b.y - pos.y))[0]
        : undefined;

      this.nearest = pos
        ? actors
            .filter((a) => a.kind === 'vendor' && Math.hypot(a.x - pos.x, a.y - pos.y) <= VENDOR_RADIUS)
            .sort((a, b) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(b.x - pos.x, b.y - pos.y))[0]
        : undefined;

      const distCat =
        this.nearestCat && pos ? Math.hypot(this.nearestCat.x - pos.x, this.nearestCat.y - pos.y) : Infinity;
      const distVendor =
        this.nearest && pos ? Math.hypot(this.nearest.x - pos.x, this.nearest.y - pos.y) : Infinity;

      this.button.hidden = (!this.nearestCat && !this.nearest) || !this.canInteract();
      if (this.nearest && distVendor <= 52) {
        this.button.textContent = `E · Trò chuyện với ${STREET_VENDORS[this.nearest.variant]!.name}`;
        this.button.onclick = () => {
          if (this.nearest) this.talk(this.nearest.id);
        };
      } else if (this.nearestCat && distCat <= 34) {
        const catName = CAT_NAMES[this.nearestCat.variant] ?? 'mèo';
        this.button.textContent = `E · Bế ${catName}`;
        this.button.onclick = () => {
          if (this.nearestCat) this.pickUpCat(this.nearestCat);
        };
      } else if (this.nearest) {
        this.button.textContent = `E · Trò chuyện với ${STREET_VENDORS[this.nearest.variant]!.name}`;
        this.button.onclick = () => {
          if (this.nearest) this.talk(this.nearest.id);
        };
      }
    }

    const ids = new Set(actors.map((a) => a.id));
    for (const [id, v] of this.views)
      if (!ids.has(id)) {
        v.root.destroy(true);
        this.views.delete(id);
      }
    for (const a of actors) {
      let v = this.views.get(a.id);
      if (!v) {
        const shadow = this.scene.add.ellipse(0, 0, a.kind === 'vendor' ? 52 : 14, 7, 0x1e293b, 0.25);
        const art = this.scene.add.graphics();
        const bubble = this.scene.add
          .text(0, -54, '', {
            fontFamily: 'sans-serif',
            fontSize: '11px',
            color: '#fff3d8',
            backgroundColor: '#293638',
            padding: { x: 8, y: 5 },
            wordWrap: { width: 195 },
            align: 'center',
            resolution: 2,
          })
          .setOrigin(0.5, 1);
        const root = this.scene.add.container(a.x, a.y, [shadow, art, bubble]).setName(`town-life:${a.id}`);
        if (a.kind === 'vendor') {
          root.setSize(60, 65).setInteractive({ useHandCursor: true });
          root.on('pointerdown', () => this.talk(a.id));
        } else if (a.kind === 'cat') {
          root.setSize(32, 28).setInteractive({ useHandCursor: true });
          root.on('pointerdown', () => {
            if (this.carriedCat) this.putDownCat();
            else this.pickUpCat(a);
          });
        }
        v = { root, shadow, art, bubble };
        this.views.set(a.id, v);
      }

      // Hide ground cat view while being carried
      if (this.carriedCat && a.id === this.carriedCat.id) {
        v.root.setVisible(false);
        if (pos) {
          v.root.setPosition(pos.x, pos.y + 4);
        }
      } else if (a.mode === 'carried') {
        v.root.setVisible(false);
      } else {
        v.root.setVisible(true);
        const alpha = 1 - Math.exp(-Math.min(delta, 100) / 55);
        v.root.x += (a.x - v.root.x) * alpha;
        v.root.y += (a.y - v.root.y) * alpha;
      }
      v.root.setDepth(v.root.y + (a.altitude > 0 ? 90 : 1));
      v.art.setY(-a.altitude);
      v.shadow.setSize(
        a.kind === 'vendor' ? 52 : a.mode === 'sleeping' ? 22 : 14,
        a.kind === 'vendor' ? 7 : 6,
      );
      v.shadow.setAlpha(a.altitude > 0 ? 0.1 : 0.22);
      v.bubble.setText(a.speech).setVisible(!!a.speech && this.dismissed !== a.id);
      this.paint(v.art, a, time);
    }
  }

  private paint(g: Phaser.GameObjects.Graphics, a: TownActor, time: number) {
    g.clear();
    const phase = Math.floor(time / (a.kind === 'pigeon' ? 95 : 150) + Number(a.id.split('-')[1])) % 4;
    g.setScale(a.dir === 1 ? -1 : 1, 1);
    const box = (color: number, x: number, y: number, w: number, h: number) => {
      g.fillStyle(color).fillRect(x, y, w, h);
    };
    const ink = 0x354342,
      cream = 0xf5dfad;
    if (a.kind === 'vendor') {
      paintDetailedVendor(g, a.variant, a.moving, a.dir, time, phase);
    } else if (a.kind === 'cat') {
      const fur = [0xd9995a, 0xe3d3b4, 0x747d88, 0xca9778, 0xeee4ce][a.variant]!;
      if (a.mode === 'sleeping') {
        const catIdx = Number(a.id.split('-')[1] || 0);
        const breathe = Math.sin(time / 420 + catIdx * 1.5) > 0.2 ? 1 : 0;
        // Body loaf resting flat on ground
        box(ink, -12, -9 - breathe, 22, 8);
        box(fur, -11, -8 - breathe, 20, 6);
        // Low sleeping head resting forward
        box(fur, 4, -9 - breathe, 8, 7);
        // Folded cozy ears
        box(fur, 4, -12 - breathe, 3, 3);
        box(fur, 9, -12 - breathe, 3, 3);
        box(0xce9a91, 5, -11 - breathe, 1, 2);
        // Closed sleeping eyes slit
        box(ink, 8, -6 - breathe, 3, 1);
        // Cute muzzle & pink nose
        box(cream, 10, -5 - breathe, 3, 2);
        box(0xce9a91, 12, -5 - breathe, 1, 1);
        // Paws tucked under
        box(cream, 4, -2, 4, 2);
        box(cream, -4, -2, 4, 2);
        // Curled sleeping tail
        box(fur, -14, -6, 3, 4);
        box(fur, -13, -3, 4, 2);
        // Coat stripes
        box(0xa47758, -7, -8 - breathe, 2, 4);
        box(0xa47758, -2, -8 - breathe, 2, 4);
        // Floating gentle "z" sleeping symbol drifting upwards
        const zPhase = (time / 700 + catIdx * 0.8) % 3;
        const zY = Math.round(-13 - zPhase * 4);
        const zX = Math.round(7 + zPhase * 3);
        const zAlpha = Math.max(0.15, 1 - zPhase / 3);
        g.fillStyle(0xfff3d8, zAlpha);
        g.fillRect(zX, zY, 3, 1);
        g.fillRect(zX + 1, zY + 1, 1, 1);
        g.fillRect(zX, zY + 2, 3, 1);
      } else {
        const bob = a.moving ? phase % 2 : 0;
        box(ink, -10, -12 - bob, 19, 9);
        box(fur, -9, -11 - bob, 17, 7);
        box(fur, 4, -17 - bob, 9, 10);
        box(fur, 4, -20 - bob, 3, 4);
        box(fur, 10, -20 - bob, 3, 4);
        box(0xce9a91, 5, -19 - bob, 1, 3);
        box(ink, 10, -14 - bob, 2, 2);
        box(cream, 10, -10 - bob, 4, 2);
        box(fur, -14, -16 + (phase % 2), 3, 9);
        box(fur, -12, -9, 4, 3);
        if (a.mode === 'grooming') box(cream, 8, -8 - (phase % 2) * 3, 3, 5);
        else {
          box(fur, -7, -5, 3, 4 - bob);
          box(fur, 4, -5, 3, 3 + bob);
        }
        box(0xa47758, -5, -11 - bob, 2, 4);
        box(0xa47758, 0, -11 - bob, 2, 4);
      }
    } else {
      const peck = a.mode === 'feeding' && !a.moving && phase < 2;
      box(0x5c6e82, -6, -8, 11, 6);
      box(0x9ba9b8, -5, -9, 8, 4);
      box(0x769b96, 3, peck ? -5 : -12, 4, 5);
      box(0x657788, 4, peck ? -5 : -14, 5, 4);
      box(cream, 8, peck ? -2 : -11, 3, 2);
      box(ink, 7, peck ? -4 : -13, 1, 1);
      box(0x48586b, -10, -7, 5, 3);
      if (a.mode === 'flying') {
        const wing = [13, 5, -3, 5][phase]!;
        g.fillStyle(0xb2bdc9)
          .fillTriangle(-3, -6, -15, -8 - wing, 2, -10)
          .fillTriangle(0, -6, 13, -6 - wing, 3, -10);
        g.lineStyle(1, 0x5c6e82).lineBetween(-14, -8 - wing, -4, -8);
      } else {
        box(0xb57865, -3, -2, 1, 3);
        box(0xb57865, 3, -2, 1, 3);
      }
    }
  }

  destroy() {
    this.grain.destroy();
    window.removeEventListener('keydown', this.keyHandler, true);
    this.button.remove();
    this.live.remove();
    if (this.carriedCatView) {
      this.carriedCatView.root.destroy(true);
      this.carriedCatView = null;
    }
    this.carriedCat = null;
    this.views.forEach((v) => v.root.destroy(true));
    this.views.clear();
  }
}
