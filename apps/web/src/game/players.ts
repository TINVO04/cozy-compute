import {
  DEFAULT_APPEARANCE,
  stepMovement,
  type Appearance,
  type MoveInput,
  type Rect,
} from '@cozy/game-data';
import { getStateCallbacks, type Room } from 'colyseus.js';
import type Phaser from 'phaser';
import { AVATAR_FEET_OFFSET, ensureAvatarTexture } from './avatars';
import { net } from './net';
import { useUi } from '../lib/store';

interface PlayerSnapshot {
  userId: string;
  name: string;
  status: string;
  appearance: string;
  x: number;
  y: number;
  dir: number;
  moving: boolean;
  seq: number;
  emote: string;
  connected: boolean;
  inEvent: boolean;
}

type Callbacks = {
  onChange: (cb: () => void) => () => void;
  listen: (prop: string, cb: (v: unknown) => void) => () => void;
};

const EMOTE_ICON: Record<string, string> = {
  wave: '👋',
  laugh: '😂',
  heart: '❤️',
  shock: '😱',
  dance: '💃',
  sleep: '💤',
  angry: '💢',
  thumbs: '👍',
};

class Avatar {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text | null = null;
  bubble: Phaser.GameObjects.Container | null = null;
  bubbleTimer: Phaser.Time.TimerEvent | null = null;
  emote: Phaser.GameObjects.Text | null = null;
  texKey = '';
  target = { x: 0, y: 0 };
  dir = 0;
  moving = false;

  constructor(
    private scene: Phaser.Scene,
    public userId: string,
    name: string,
    appearance: Appearance,
    x: number,
    y: number,
    isSelf: boolean,
  ) {
    this.shadow = scene.add.ellipse(0, 0, 22, 8, 0x2a2438, 0.25);
    this.texKey = ensureAvatarTexture(scene, appearance);
    this.sprite = scene.add.sprite(0, -AVATAR_FEET_OFFSET / 2 - 3, this.texKey, 0);
    this.label = scene.add
      .text(0, -AVATAR_FEET_OFFSET - 8, name, {
        fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: '600',
        color: isSelf ? '#fff7d6' : '#ffffff',
        backgroundColor: isSelf ? 'rgba(75,63,143,0.92)' : 'rgba(42,36,56,0.72)',
        padding: { x: 5, y: 2 },
        resolution: 2,
      })
      .setOrigin(0.5, 1);
    this.container = scene.add.container(x, y, [this.shadow, this.sprite, this.label]);
    this.container.setSize(28, 56);
    this.sprite.setInteractive({ useHandCursor: !isSelf, pixelPerfect: false });
    if (!isSelf) this.sprite.on('pointerdown', () => useUi.getState().inspect(userId));
    this.target = { x, y };
  }

  setAppearance(a: Appearance) {
    const key = ensureAvatarTexture(this.scene, a);
    if (key === this.texKey) return;
    this.texKey = key;
    this.sprite.setTexture(key, this.dir * 3);
    this.updateAnim(true);
  }

  setStatus(text: string) {
    this.status?.destroy();
    this.status = null;
    if (!text) return;
    this.status = this.scene.add
      .text(0, -AVATAR_FEET_OFFSET - 26, text, {
        fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
        fontSize: '10px',
        color: '#2a2438',
        backgroundColor: 'rgba(255,255,255,0.85)',
        padding: { x: 4, y: 1 },
        resolution: 2,
      })
      .setOrigin(0.5, 1);
    this.container.add(this.status);
  }

  say(text: string) {
    this.bubble?.destroy();
    this.bubbleTimer?.remove();
    const t = this.scene.add
      .text(0, 0, text, {
        fontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
        fontSize: '12px',
        color: '#2a2438',
        wordWrap: { width: 170 },
        resolution: 2,
        align: 'center',
      })
      .setOrigin(0.5, 1);
    const w = t.width + 16;
    const h = t.height + 10;
    const g = this.scene.add.graphics();
    g.fillStyle(0x2a2438, 1).fillRoundedRect(-w / 2 - 1, -h - 7, w + 2, h + 2, 8);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h - 6, w, h, 7);
    g.fillStyle(0xffffff, 1).fillTriangle(-5, -7, 5, -7, 0, -1);
    t.setPosition(0, -11);
    const offset = this.status ? -AVATAR_FEET_OFFSET - 44 : -AVATAR_FEET_OFFSET - 26;
    this.bubble = this.scene.add.container(0, offset, [g, t]);
    this.container.add(this.bubble);
    this.bubbleTimer = this.scene.time.delayedCall(Math.min(8000, 3000 + text.length * 60), () => {
      this.bubble?.destroy();
      this.bubble = null;
    });
  }

  showEmote(emote: string) {
    this.emote?.destroy();
    this.emote = null;
    if (!emote) return;
    this.emote = this.scene.add
      .text(14, -AVATAR_FEET_OFFSET + 4, EMOTE_ICON[emote] ?? '', { fontSize: '20px', resolution: 2 })
      .setOrigin(0.5);
    this.container.add(this.emote);
    if (!useUi.getState().reducedMotion) {
      this.scene.tweens.add({
        targets: this.emote,
        y: this.emote.y - 10,
        duration: 400,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
      });
    }
  }

  updateAnim(force = false) {
    const key = `${this.texKey}:walk${this.dir}`;
    if (this.moving) {
      if (force || this.sprite.anims.currentAnim?.key !== key || !this.sprite.anims.isPlaying)
        this.sprite.play(key, true);
    } else {
      this.sprite.stop();
      this.sprite.setFrame(this.dir * 3);
    }
  }

  destroy() {
    this.bubbleTimer?.remove();
    this.container.destroy();
  }
}

const parseAppearance = (raw: string): Appearance => {
  try {
    return { ...DEFAULT_APPEARANCE, ...(JSON.parse(raw) as Appearance) };
  } catch {
    return DEFAULT_APPEARANCE;
  }
};

/**
 * Renders all players in the current room. The local player is predicted with the same movement
 * function the server uses and reconciled against authoritative state; others are interpolated.
 */
export class PlayerLayer {
  avatars = new Map<string, Avatar>();
  self: Avatar | null = null;
  selfSessionId = '';
  private input: MoveInput = { x: 0, y: 0 };
  private seq = 0;
  private pending: { seq: number; input: MoveInput; dt: number }[] = [];
  private sendAcc = 0;
  private lastSent: MoveInput = { x: 0, y: 0 };
  private cleanup: (() => void)[] = [];
  private world: { width: number; height: number; blockers: Rect[] };
  private $: ReturnType<typeof getStateCallbacks>;

  constructor(
    private scene: Phaser.Scene,
    private room: Room,
    world: { width: number; height: number; blockers: Rect[] },
    private onSelfMove?: (x: number, y: number) => void,
  ) {
    this.world = world;
    this.selfSessionId = room.sessionId;
    this.$ = getStateCallbacks(room);
    const players = (
      this.$(room.state as never) as unknown as {
        players: {
          onAdd: (cb: (p: PlayerSnapshot, k: string) => void, immediate?: boolean) => () => void;
          onRemove: (cb: (p: PlayerSnapshot, k: string) => void) => () => void;
        };
      }
    ).players;
    this.cleanup.push(players.onAdd((p, sid) => this.add(p, sid), true));
    this.cleanup.push(
      players.onRemove((_p, sid) => {
        this.avatars.get(sid)?.destroy();
        this.avatars.delete(sid);
      }),
    );
    room.onMessage('chat', (m: { from: string; text: string }) => this.avatars.get(m.from)?.say(m.text));

    // Fallback sync: also inspect current room state directly if players already exist
    const rawState = room.state as unknown as { players?: Map<string, PlayerSnapshot> };
    if (rawState?.players && typeof rawState.players.forEach === 'function') {
      rawState.players.forEach((p, sid) => {
        if (!this.avatars.has(sid)) {
          this.add(p, sid);
        }
      });
    }

    // Also listen to state updates in case initial snapshot was delayed
    const onState = (state: unknown) => {
      const s = state as { players?: Map<string, PlayerSnapshot> };
      if (s?.players && typeof s.players.forEach === 'function') {
        s.players.forEach((p, sid) => {
          if (!this.avatars.has(sid)) {
            this.add(p, sid);
          }
        });
      }
    };
    room.onStateChange(onState as never);
    this.cleanup.push(() => {
      room.onStateChange.remove(onState as never);
    });
  }

  setWorldBlockers(blockers: Rect[]) {
    this.world = { ...this.world, blockers };
  }

  private add(p: PlayerSnapshot, sid: string) {
    if (this.avatars.has(sid)) return;
    const myId = useUi.getState().myUserId;
    const isSelf = sid === this.selfSessionId || (Boolean(myId) && p.userId === myId);
    const av = new Avatar(this.scene, p.userId, p.name, parseAppearance(p.appearance), p.x, p.y, isSelf);
    av.setStatus(p.status);
    av.container.setAlpha(p.connected ? 1 : 0.45);
    this.avatars.set(sid, av);
    if (isSelf) {
      this.self = av;
      this.scene.cameras.main.startFollow(av.container, true, 0.12, 0.12);
    }
    const $p = this.$(p as never) as unknown as Callbacks;
    this.cleanup.push(
      $p.onChange(() => {
        if (isSelf) {
          // Reconcile: start from the server position and replay unacknowledged inputs.
          this.pending = this.pending.filter((i) => i.seq > p.seq);
          let pos = { x: p.x, y: p.y };
          for (const i of this.pending) pos = stepMovement(pos, i.input, i.dt, this.world);
          const dx = pos.x - av.container.x;
          const dy = pos.y - av.container.y;
          if (Math.hypot(dx, dy) > 48) av.container.setPosition(pos.x, pos.y);
          else av.target = pos;
        } else {
          av.target = { x: p.x, y: p.y };
          av.dir = p.dir;
          av.moving = p.moving;
          av.updateAnim();
        }
        av.container.setAlpha(p.connected ? 1 : 0.45);
      }),
      $p.listen('appearance', (v) => av.setAppearance(parseAppearance(String(v)))),
      $p.listen('status', (v) => av.setStatus(String(v ?? ''))),
      $p.listen('emote', (v) => av.showEmote(String(v ?? ''))),
    );
  }

  setInput(input: MoveInput) {
    this.input = input;
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;
    // local prediction
    if (this.self) {
      const av = this.self;
      const moving = this.input.x !== 0 || this.input.y !== 0;
      if (moving) {
        const next = stepMovement({ x: av.container.x, y: av.container.y }, this.input, dt, this.world);
        av.container.setPosition(next.x, next.y);
        av.target = next;
        if (this.input.x < 0) av.dir = 1;
        else if (this.input.x > 0) av.dir = 2;
        else if (this.input.y < 0) av.dir = 3;
        else av.dir = 0;
      } else {
        // settle toward reconciled position
        av.container.x += (av.target.x - av.container.x) * Math.min(1, dt * 12);
        av.container.y += (av.target.y - av.container.y) * Math.min(1, dt * 12);
      }
      if (av.moving !== moving) {
        av.moving = moving;
        av.updateAnim();
      } else if (moving) av.updateAnim();
      this.pending.push({ seq: this.seq + 1, input: this.input, dt });
      if (this.pending.length > 120) this.pending.shift();
      this.onSelfMove?.(av.container.x, av.container.y);
    }
    // send input at 20 Hz, immediately on change
    this.sendAcc += dtMs;
    const changed = this.input.x !== this.lastSent.x || this.input.y !== this.lastSent.y;
    if (changed || this.sendAcc >= 50) {
      this.sendAcc = 0;
      this.seq++;
      this.lastSent = this.input;
      if (changed || this.input.x || this.input.y)
        net.send('input', { x: this.input.x, y: this.input.y, seq: this.seq });
    }
    // interpolate remote players and depth-sort everyone by feet position
    for (const [sid, av] of this.avatars) {
      if (sid !== this.selfSessionId) {
        const k = Math.min(1, dt * 10);
        av.container.x += (av.target.x - av.container.x) * k;
        av.container.y += (av.target.y - av.container.y) * k;
      }
      av.container.setDepth(av.container.y);
    }
  }

  destroy() {
    this.cleanup.forEach((fn) => fn());
    this.avatars.forEach((a) => a.destroy());
    this.avatars.clear();
  }
}
