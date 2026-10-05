import { Room, type Client } from '@colyseus/core';
import { AuthoritativeMovement, PLAYER_SPEED, TICK_RATE, type Rect } from '@cozy/game-data';
import type { Redis } from 'ioredis';
import type { ApiClient, SessionInfo } from '../api.js';
import { cleanChat, EMOTES, type Emote } from '../chat.js';
import { PlayerState, RoomState } from '../schema.js';

export interface Deps {
  api: ApiClient;
  redis: Redis;
}

let deps: Deps;
export function setDeps(d: Deps) {
  deps = d;
}
export function getDeps(): Deps {
  return deps;
}

interface ClientData {
  session: SessionInfo;
  movement: AuthoritativeMovement;
  lastChatAt: number[];
  lastMoveAt: number;
  inputCount: number;
  inputWindowStart: number;
}

export interface WorldSpec {
  width: number;
  height: number;
  blockers: Rect[];
  spawn: { x: number; y: number };
}

/** Shared authoritative movement, chat and presence for town and apartment rooms. */
export abstract class BaseRoom extends Room<RoomState> {
  protected abstract world(): WorldSpec;
  protected abstract presenceKey(): string;
  protected positionsPublished = new Map<string, number>();
  private data = new Map<string, ClientData>();
  /** userId -> sessionId, so reconnecting from a new tab replaces the old one. */
  private byUser = new Map<string, string>();

  protected setup() {
    this.setState(new RoomState());
    this.setPatchRate(1000 / TICK_RATE);
    this.setSimulationInterval((dt) => this.tick(dt), 1000 / TICK_RATE);

    this.onMessage('input', (client, msg: { x?: number; y?: number; seq?: number }) => {
      const d = this.data.get(client.sessionId);
      if (!d) return;
      const now = Date.now();
      if (now - d.inputWindowStart > 1000) {
        d.inputWindowStart = now;
        d.inputCount = 0;
      }
      if (++d.inputCount > 60) return; // flood protection
      d.movement.accept(msg);
    });

    this.onMessage('chat', (client, msg: { text?: string }) => {
      const d = this.data.get(client.sessionId);
      const p = this.state.players.get(client.sessionId);
      if (!d || !p || typeof msg?.text !== 'string') return;
      const now = Date.now();
      d.lastChatAt = d.lastChatAt.filter((t) => now - t < 10_000);
      if (d.lastChatAt.length >= 5) {
        client.send('notice', { kind: 'warning', text: 'You are chatting too fast. Take a breath.' });
        return;
      }
      const text = cleanChat(msg.text);
      if (!text) return;
      d.lastChatAt.push(now);
      const payload = { from: client.sessionId, userId: p.userId, name: p.name, text, at: now };
      // Deliver individually so each recipient's mute list is respected server-side.
      for (const c of this.clients) {
        const other = this.data.get(c.sessionId);
        if (other?.session.muted.includes(p.userId)) continue;
        c.send('chat', payload);
      }
    });

    this.onMessage('emote', (client, msg: { emote?: string }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !EMOTES.includes(msg?.emote as Emote)) return;
      p.emote = msg.emote!;
      p.emoteAt = Date.now();
    });

    this.onMessage('mute', (client, msg: { userId?: string; muted?: boolean }) => {
      const d = this.data.get(client.sessionId);
      if (!d || typeof msg?.userId !== 'string') return;
      d.session.muted = d.session.muted.filter((id) => id !== msg.userId);
      if (msg.muted) d.session.muted.push(msg.userId);
    });

    this.onMessage('ping', (client, msg: { t?: number }) => client.send('pong', { t: msg?.t ?? 0 }));
  }

  override async onAuth(_client: Client, options: { token?: string }) {
    if (typeof options?.token !== 'string') throw new Error('Missing session token');
    return getDeps().api.session(options.token);
  }

  override onJoin(client: Client, options: unknown, session: SessionInfo) {
    const previous = this.byUser.get(session.userId);
    if (previous && previous !== client.sessionId) {
      const old = this.clients.find((c) => c.sessionId === previous);
      old?.leave(4001, 'Opened in another tab');
      this.removePlayer(previous);
    }
    this.byUser.set(session.userId, client.sessionId);
    const spawn = this.spawnFor(session, options);
    const p = new PlayerState();
    p.userId = session.userId;
    p.name = session.displayName;
    p.status = session.statusText;
    p.appearance = JSON.stringify(session.appearance);
    p.x = spawn.x;
    p.y = spawn.y;
    this.state.players.set(client.sessionId, p);
    this.data.set(client.sessionId, {
      session,
      movement: new AuthoritativeMovement(),
      lastChatAt: [],
      lastMoveAt: 0,
      inputCount: 0,
      inputWindowStart: 0,
    });
    p.speed = this.playerSpeedFor(this.data.get(client.sessionId)!, p);
    void this.publishPresence(session.userId);
  }

  protected spawnFor(_session: SessionInfo, _options?: unknown): { x: number; y: number } {
    return this.world().spawn;
  }

  override async onLeave(client: Client, consented: boolean) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    if (!consented) {
      p.connected = false;
      const d = this.data.get(client.sessionId);
      d?.movement.stop();
      try {
        await this.allowReconnection(client, 20);
        p.connected = true;
        return;
      } catch {
        // fall through to removal
      }
    }
    this.removePlayer(client.sessionId);
  }

  private removePlayer(sessionId: string) {
    const p = this.state.players.get(sessionId);
    if (!p) return;
    this.state.players.delete(sessionId);
    this.data.delete(sessionId);
    if (this.byUser.get(p.userId) === sessionId) {
      this.byUser.delete(p.userId);
      void getDeps().redis.hdel('presence:online', p.userId);
      void getDeps().redis.hdel('positions', p.userId);
    }
  }

  protected sessionFor(sessionId: string): SessionInfo | undefined {
    return this.data.get(sessionId)?.session;
  }

  protected clientForUser(userId: string): Client | undefined {
    const sid = this.byUser.get(userId);
    return sid ? this.clients.find((c) => c.sessionId === sid) : undefined;
  }

  protected playerForUser(userId: string): PlayerState | undefined {
    const sid = this.byUser.get(userId);
    return sid ? this.state.players.get(sid) : undefined;
  }

  private async publishPresence(userId: string) {
    await getDeps().redis.hset(
      'presence:online',
      userId,
      JSON.stringify({ room: this.presenceKey(), roomLabel: this.state.label, at: Date.now() }),
    );
  }

  protected playerSpeedFor(_d: ClientData, _p: PlayerState): number {
    return PLAYER_SPEED;
  }

  protected tick(dtMs: number) {
    this.state.simulationTime += dtMs;
    const w = this.world();
    const now = Date.now();
    const positions: Record<string, string> = {};
    const presence: Record<string, string> = {};
    this.state.players.forEach((p, sid) => {
      const d = this.data.get(sid);
      if (!d) return;
      p.speed = this.playerSpeedFor(d, p);
      const next = d.movement.advance({ x: p.x, y: p.y }, dtMs, {
        blockers: w.blockers,
        width: w.width,
        height: w.height,
        speed: p.speed,
      });
      p.seq = next.seq;
      p.inputElapsedMs = next.inputElapsedMs;
      const moved = next.x !== p.x || next.y !== p.y;
      if (moved) {
        if (d.movement.input.x < 0) p.dir = 1;
        else if (d.movement.input.x > 0) p.dir = 2;
        else if (d.movement.input.y < 0) p.dir = 3;
        else if (d.movement.input.y > 0) p.dir = 0;
        p.x = Math.round(next.x * 10) / 10;
        p.y = Math.round(next.y * 10) / 10;
      }
      p.moving = moved;
      if (p.emote && now - p.emoteAt > 3000) p.emote = '';
      // Publish authoritative positions for server-side activity validation (throttled to 4 Hz, 1 Hz when idle).
      const last = this.positionsPublished.get(p.userId) ?? 0;
      if (now - last > (moved ? 250 : 1000)) {
        this.positionsPublished.set(p.userId, now);
        positions[p.userId] = JSON.stringify({ room: this.presenceKey(), x: p.x, y: p.y, at: now });
        if (now - last > 1000)
          presence[p.userId] = JSON.stringify({
            room: this.presenceKey(),
            roomLabel: this.state.label,
            at: now,
          });
      }
      this.afterMove(p, sid);
    });
    if (Object.keys(positions).length) void getDeps().redis.hset('positions', positions);
    if (Object.keys(presence).length) void getDeps().redis.hset('presence:online', presence);
  }

  protected afterMove(_p: PlayerState, _sessionId: string) {}

  updateAppearance(userId: string, appearance: unknown, statusText?: string) {
    const p = this.playerForUser(userId);
    if (!p) return;
    p.appearance = JSON.stringify(appearance);
    const sid = this.byUser.get(userId);
    const d = sid ? this.data.get(sid) : undefined;
    if (d && typeof appearance === 'object' && appearance !== null) {
      d.session.appearance = appearance as SessionInfo['appearance'];
      p.speed = this.playerSpeedFor(d, p);
    }
    if (typeof statusText === 'string') p.status = statusText;
  }

  kick(userId: string) {
    this.clientForUser(userId)?.leave(4003, 'Account suspended');
  }
}
