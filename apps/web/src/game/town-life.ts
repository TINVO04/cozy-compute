import type Phaser from 'phaser';
import {
  STREET_VENDORS,
  VENDOR_RADIUS,
  PIGEON_FEEDING_SPOTS,
  lifeGroundClear,
  type TownActor,
  type LifePoint,
} from '@cozy/game-data';
import { useUi } from '../lib/store';

const COLORS = [0xcb7750, 0x628f83, 0xdaa547, 0x95b8bd, 0xc9899d, 0xb29663];
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
  private dismissed = '';
  private live: HTMLElement;
  private button: HTMLButtonElement;
  private grain: Phaser.GameObjects.Graphics;
  private keyHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.dismissed = this.nearest?.id ?? '';
      this.live.textContent = '';
      return;
    }
    if (event.repeat || event.key.toLowerCase() !== 'e' || !this.canInteract() || !this.nearest) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.talk(this.nearest.id);
  };

  constructor(
    private scene: Phaser.Scene,
    private self: () => LifePoint | null,
    private send: (id: string) => void,
  ) {
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
      if (this.nearest) this.talk(this.nearest.id);
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
      !ui.panel &&
      !ui.activity &&
      !document.querySelector('.backdrop') &&
      !el?.matches('input, textarea, select, [contenteditable]')
    );
  }
  private talk(id: string) {
    if (!this.canInteract()) return;
    const actor = this.actors.find((a) => a.id === id);
    const pos = this.self();
    if (!actor || !pos || Math.hypot(pos.x - actor.x, pos.y - actor.y) > VENDOR_RADIUS) return;
    this.dismissed = '';
    this.send(id);
  }
  update(actors: TownActor[], time: number, delta: number) {
    this.actors = actors;
    const pos = this.self();
    this.nearest = pos
      ? actors
          .filter((a) => a.kind === 'vendor' && Math.hypot(a.x - pos.x, a.y - pos.y) <= VENDOR_RADIUS)
          .sort((a, b) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(b.x - pos.x, b.y - pos.y))[0]
      : undefined;
    this.button.hidden = !this.nearest || !this.canInteract();
    if (this.nearest)
      this.button.textContent = `E · Trò chuyện với ${STREET_VENDORS[this.nearest.variant]!.name}`;
    const ids = new Set(actors.map((a) => a.id));
    for (const [id, v] of this.views)
      if (!ids.has(id)) {
        v.root.destroy(true);
        this.views.delete(id);
      }
    for (const a of actors) {
      let v = this.views.get(a.id);
      if (!v) {
        const shadow = this.scene.add.ellipse(0, 0, a.kind === 'vendor' ? 46 : 14, 6, 0x263e39, 0.2);
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
        }
        v = { root, shadow, art, bubble };
        this.views.set(a.id, v);
      }
      const alpha = 1 - Math.exp(-Math.min(delta, 100) / 55);
      v.root.x += (a.x - v.root.x) * alpha;
      v.root.y += (a.y - v.root.y) * alpha;
      v.root.setDepth(v.root.y + (a.altitude > 0 ? 90 : 1));
      v.art.setY(-a.altitude);
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
      for (const x of [-20, 17]) {
        g.lineStyle(3, ink).strokeCircle(x, -5, 7);
        g.lineStyle(1, cream);
        const angle = a.moving ? (phase * Math.PI) / 4 : 0;
        g.lineBetween(
          x - Math.cos(angle) * 5,
          -5 - Math.sin(angle) * 5,
          x + Math.cos(angle) * 5,
          -5 + Math.sin(angle) * 5,
        );
      }
      g.lineStyle(2, 0x819b99)
        .strokeTriangle(-20, -5, 1, -5, -9, -19)
        .lineBetween(1, -5, 17, -5)
        .lineBetween(17, -5, 12, -25)
        .lineBetween(9, -25, 18, -25);
      box(ink, -31, -31, 28, 24);
      box(COLORS[a.variant]!, -29, -29, 24, 18);
      box(cream, -28, -26, 22, 3);
      box(0x946246, -30, -12, 26, 4);
      for (let i = 0; i < 3; i++) {
        const x = -27 + i * 7;
        if (a.variant === 4) {
          box(0x71955b, x + 2, -38, 2, 10);
          box(i % 2 ? 0xe9b45d : 0xd68c9b, x, -40 - (i % 2) * 3, 6, 6);
        } else
          box(
            [0xe8b75e, 0xa8c8c4, 0x99b951, 0xf3dbc3, 0xd28b9f, 0xe7c463][a.variant]!,
            x,
            -35,
            a.variant === 1 ? 6 : 5,
            7,
          );
      }
      box(ink, -3, -29, 11, 15);
      box(COLORS[(a.variant + 2) % 6]!, -2, -29, 9, 13);
      box(0xe8b689, -1, -40, 9, 10);
      box(ink, 6, -37, 2, 2);
      box(0xd3ac71, -5, -42, 17, 3);
      box(cream, -1, -46, 10, 4);
      box(0xe8b689, 6, -28, 7, 3);
      box(ink, 1, -15, 4, 7 + (a.moving ? (phase % 2) * 3 : 0));
      box(ink, -5, -13, 4, 7 - (a.moving ? (phase % 2) * 2 : 0));
    } else if (a.kind === 'cat') {
      const fur = [0xd9995a, 0xe3d3b4, 0x747d88, 0xca9778, 0xeee4ce][a.variant]!;
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
    this.views.forEach((v) => v.root.destroy(true));
    this.views.clear();
  }
}
