import { MartialEffects } from './martial-effects';
import type { Room } from 'colyseus.js';
import {
  MARTIAL_BLOCKERS,
  MARTIAL_HEIGHT,
  MARTIAL_WIDTH,
  MARTIAL_SKILLS,
  type MartialEffect,
  type MartialSnapshot,
} from '@cozy/game-data';
import { WorldScene } from './scenes';
import { net } from './net';
import { useUi } from '../lib/store';
import { paintMartialHall } from './martial-art';

export class MartialScene extends WorldScene {
  private exiting = false;
  private health?: Phaser.GameObjects.Graphics;
  private snapshot: MartialSnapshot | null = null;
  constructor() {
    super('martial');
  }
  protected worldSize() {
    return { width: MARTIAL_WIDTH, height: MARTIAL_HEIGHT };
  }
  protected blockers() {
    return MARTIAL_BLOCKERS;
  }
  protected matchesRoom(room: Room) {
    return room.name === 'martial';
  }
  protected buildWorld() {
    this.exiting = false;
    this.snapshot = null;
    useUi.getState().setZone(null);
    paintMartialHall(this);
    this.health = this.add.graphics().setDepth(4000);
    const effects = new MartialEffects(this, (sid) => this.layer?.avatars.get(sid));
    const off = net.onRoomMessage<MartialEffect>('martial:effect', (e) => {
      effects.emit(e);
      if (e.phase === 'windup' && e.sid)
        this.layer?.scriptedMove(e.sid, e, e, MARTIAL_SKILLS.find((s) => s.id === e.skill)!.windup);
      if (e.phase === 'dash' && e.sid && e.endX !== undefined && e.endY !== undefined)
        this.layer?.scriptedMove(e.sid, e, { x: e.endX, y: e.endY }, e.duration ?? 240);
    });
    const offState = net.onRoomMessage<MartialSnapshot>('martial:state', (s) => {
      this.snapshot = s;
    });
    this.events.once('shutdown', () => {
      off();
      offState();
    });
  }
  protected override onSelfMove(x: number, y: number) {
    if (!this.exiting && y > 654 && x > 420 && x < 540) {
      this.exiting = true;
      void net.goTown('martial');
    }
  }
  override update(time: number, dt: number) {
    super.update(time, dt);
    const g = this.health;
    if (!g) return;
    g.clear();
    const players = net.room?.state?.players;
    for (const f of this.snapshot?.fighters ?? []) {
      if (f.sid !== this.snapshot?.match?.a && f.sid !== this.snapshot?.match?.b) continue;
      const p = players?.get(f.sid);
      if (!p) continue;
      g.fillStyle(0x242332).fillRect(p.x - 23, p.y - 56, 46, 6);
      g.fillStyle(f.sid === net.room?.sessionId ? 0x86efdc : 0xf5a1c8).fillRect(
        p.x - 22,
        p.y - 55,
        (44 * f.hp) / 100,
        4,
      );
    }
  }
}
