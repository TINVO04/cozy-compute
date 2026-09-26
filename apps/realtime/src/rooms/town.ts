import type { Client } from '@colyseus/core';
import { BLOCKERS, MAP_HEIGHT, MAP_WIDTH, SPAWN } from '@cozy/game-data';
import type { SessionInfo } from '../api.js';
import { DuckState, EventState, type PlayerState } from '../schema.js';
import { BaseRoom, getDeps, type WorldSpec } from './base.js';

interface ActiveEvent {
  eventId: string;
  title: string;
  ducks: { id: string; x: number; y: number }[];
  endsAt: string;
  participants: string[];
}

const DUCK_RADIUS = 22;

export class TownRoom extends BaseRoom {
  override maxClients = 150;
  private participants = new Set<string>();
  private eventTimer: NodeJS.Timeout | undefined;

  protected world(): WorldSpec {
    return { width: MAP_WIDTH, height: MAP_HEIGHT, blockers: BLOCKERS, spawn: SPAWN };
  }

  protected presenceKey() {
    return 'town';
  }

  override onCreate() {
    this.setup();
    this.state.kind = 'town';
    this.state.label = 'Town';
    this.eventTimer = setInterval(() => void this.syncEvent(), 1000);
    void this.syncEvent();
  }

  override onDispose() {
    if (this.eventTimer) clearInterval(this.eventTimer);
  }

  protected override spawnFor(_session: SessionInfo) {
    // Scatter slightly so a crowd does not stack on one pixel.
    return {
      x: SPAWN.x + Math.round((Math.random() - 0.5) * 96),
      y: SPAWN.y + Math.round((Math.random() - 0.5) * 32),
    };
  }

  override onJoin(client: Client, options: unknown, session: SessionInfo) {
    super.onJoin(client, options, session);
    const p = this.state.players.get(client.sessionId);
    if (p) p.inEvent = this.participants.has(session.userId);
  }

  /** Mirrors the event the API is running (stored in Redis) into room state. */
  async syncEvent() {
    const raw = await getDeps().redis.get('event:active');
    const active = raw ? (JSON.parse(raw) as ActiveEvent) : null;
    if (!active) {
      if (this.state.event) {
        this.state.event = undefined;
        this.participants.clear();
        this.state.players.forEach((p) => (p.inEvent = false));
      }
      return;
    }
    if (this.state.event?.id === active.eventId) return;
    const ev = new EventState();
    ev.id = active.eventId;
    ev.title = active.title;
    ev.endsAt = Date.parse(active.endsAt);
    const collected = await getDeps().redis.smembers(`event:${active.eventId}:collected`);
    for (const d of active.ducks) {
      if (collected.includes(d.id)) continue;
      const duck = new DuckState();
      duck.x = d.x;
      duck.y = d.y;
      ev.ducks.set(d.id, duck);
    }
    const scores = await getDeps().redis.hgetall(`event:${active.eventId}:scores`);
    for (const [uid, s] of Object.entries(scores)) ev.scores.set(uid, Number(s));
    this.participants = new Set(active.participants);
    this.state.players.forEach((p) => (p.inEvent = this.participants.has(p.userId)));
    this.state.event = ev;
    this.broadcast('notice', {
      kind: 'event',
      text: `${active.title} has started! Grab the ducks around town.`,
    });
  }

  protected override afterMove(p: PlayerState, _sessionId: string) {
    const ev = this.state.event;
    if (!ev || !p.inEvent || Date.now() > ev.endsAt) return;
    ev.ducks.forEach((duck, id) => {
      if (Math.hypot(duck.x - p.x, duck.y - p.y) > DUCK_RADIUS) return;
      ev.ducks.delete(id);
      void this.collect(ev.id, id, p);
    });
  }

  private async collect(eventId: string, duckId: string, p: PlayerState) {
    const { redis } = getDeps();
    // SADD is atomic across processes: only the first collector scores.
    const first = await redis.sadd(`event:${eventId}:collected`, duckId);
    if (!first) return;
    await redis.expire(`event:${eventId}:collected`, 3600);
    const score = await redis.hincrby(`event:${eventId}:scores`, p.userId, 1);
    this.state.event?.scores.set(p.userId, score);
    this.broadcast('notice', { kind: 'duck', text: `${p.name} found a duck!` });
  }
}
