import { randomUUID } from 'node:crypto';
import type { Client } from '@colyseus/core';
import {
  MARTIAL_BLOCKERS,
  MARTIAL_DASH_MS,
  martialDashEnd,
  martialDashHits,
  MARTIAL_DUMMY,
  MARTIAL_HEIGHT,
  MARTIAL_MASTER,
  MARTIAL_RING,
  MARTIAL_SKILLS,
  MARTIAL_SPAWN,
  MARTIAL_WIDTH,
  caveNear,
  martialDamage,
  martialHits,
  type MartialEffect,
  type MartialFighter,
  type MartialInvite,
  type MartialMatch,
  type MartialRank,
  type MartialSnapshot,
} from '@cozy/game-data';
import type { SessionInfo } from '../api.js';
import type { PlayerState } from '../schema.js';
import { BaseRoom, getDeps, type ClientData } from './base.js';

type Cast = MartialEffect & { sid: string; at: number; matchId?: string };
type Dash = {
  cast: Cast;
  from: { x: number; y: number };
  to: { x: number; y: number };
  elapsed: number;
  hit: boolean;
};
/** Inputs only: ownership, aiming, hit tests, timers and results all originate here. */
export class MartialRoom extends BaseRoom {
  override maxClients = 100;
  private fighters = new Map<string, MartialFighter>();
  private invites: MartialInvite[] = [];
  private match: MartialMatch | null = null;
  private casts: Cast[] = [];
  private dashes = new Map<string, Dash>();
  private rankings: MartialRank[] = [];
  private result = '';
  private lastSnapshot = 0;
  private lastRankRefresh = 0;
  private nextRequest = new Map<string, number>();
  private pendingResults = new Map<
    string,
    { winner: MartialFighter; loser: MartialFighter; retryAt: number; busy: boolean }
  >();

  protected world() {
    return { width: MARTIAL_WIDTH, height: MARTIAL_HEIGHT, blockers: MARTIAL_BLOCKERS, spawn: MARTIAL_SPAWN };
  }
  protected presenceKey() {
    return 'martial';
  }
  protected override playerSpeedFor(d: ClientData, p: PlayerState) {
    const sid = this.clientForUser(p.userId)?.sessionId ?? '';
    return this.dashes.has(sid) || this.casts.some((c) => c.sid === sid) ? 0 : super.playerSpeedFor(d, p);
  }
  override onCreate() {
    this.autoDispose = false;
    this.setup();
    this.state.kind = 'martial';
    this.state.label = 'Đại hội Võ thuật';
    this.onMessage('martial:action', (client, raw: unknown) => {
      if (!this.state.players.get(client.sessionId)?.connected) return;
      if (!raw || typeof raw !== 'object') return;
      const msg = raw as { action?: unknown; target?: unknown; skill?: unknown };
      const now = Date.now();
      if (now < (this.nextRequest.get(client.sessionId) ?? 0)) return;
      this.nextRequest.set(client.sessionId, now + 100);
      if (msg.action === 'cast' && typeof msg.skill === 'string') this.cast(client, msg.skill);
      else if (msg.action === 'learn' && typeof msg.skill === 'string') void this.learn(client, msg.skill);
      else if (msg.action === 'invite' && typeof msg.target === 'string') this.invite(client, msg.target);
      else if (msg.action === 'accept' && typeof msg.target === 'string') this.accept(client, msg.target);
      else if (msg.action === 'decline')
        this.invites = this.invites.filter((i) => i.to !== client.sessionId && i.from !== client.sessionId);
      else if (msg.action === 'forfeit') this.forfeit(client.sessionId);
      else if (msg.action === 'sync') this.snapshot(client);
    });
    void this.refreshRanks();
  }

  override async onAuth(client: Client, options: { token?: string }) {
    const session = (await super.onAuth(client, options)) as SessionInfo;
    if (!(await getDeps().redis.getdel('martial:entry:' + session.userId)))
      throw new Error('Hãy đến cổng chùa để vào Đại hội Võ thuật.');
    const [account, learned] = await Promise.all([
      getDeps().api.cave({ userId: session.userId, action: 'load', requestId: randomUUID() }),
      getDeps().redis.smembers(`martial:skills:${session.userId}`),
    ]);
    return { ...session, martial: { weapon: account.weapon, learned } };
  }
  override onJoin(
    client: Client,
    options: unknown,
    session: SessionInfo & { martial: { weapon: MartialFighter['weapon']; learned: string[] } },
  ) {
    for (const f of this.fighters.values())
      if (f.userId === session.userId) {
        this.forfeit(f.sid);
        this.fighters.delete(f.sid);
      }
    super.onJoin(client, options, session);
    this.fighters.set(client.sessionId, {
      sid: client.sessionId,
      userId: session.userId,
      name: session.displayName,
      weapon: session.martial.weapon,
      learned: MARTIAL_SKILLS.filter((s) => s.id === 'slash' || session.martial.learned.includes(s.id)).map(
        (s) => s.id,
      ),
      hp: 100,
      energy: 100,
      cooldowns: {},
      guardUntil: 0,
    });
    this.snapshot();
  }
  override async onLeave(client: Client, consented: boolean) {
    this.dashes.delete(client.sessionId);
    this.forfeit(client.sessionId);
    this.invites = this.invites.filter((i) => i.from !== client.sessionId && i.to !== client.sessionId);
    await super.onLeave(client, consented);
    if (!this.state.players.has(client.sessionId)) {
      this.fighters.delete(client.sessionId);
      this.nextRequest.delete(client.sessionId);
    }
  }
  private notice(client: Client, text: string) {
    client.send('notice', { kind: 'info', text });
  }
  private busy(sid: string) {
    return this.match?.a === sid || this.match?.b === sid;
  }
  private invite(client: Client, target: string) {
    const sid = client.sessionId;
    const a = this.fighters.get(sid),
      b = this.fighters.get(target);
    if (!a || !b || a.userId === b.userId || !this.state.players.get(target)?.connected) return;
    if (this.match) {
      this.notice(client, 'Võ đài đang có trận. Hãy cổ vũ rồi mời lại.');
      return;
    }
    if (this.invites.some((i) => i.from === sid && i.expiresAt > Date.now())) return;
    this.invites.push({ from: sid, to: target, expiresAt: Date.now() + 20000 });
    this.snapshot();
  }
  private accept(client: Client, from: string) {
    const now = Date.now(),
      sid = client.sessionId;
    if (this.match || !this.invites.some((i) => i.from === from && i.to === sid && i.expiresAt > now)) return;
    const a = this.fighters.get(from),
      b = this.fighters.get(sid);
    const pa = this.state.players.get(from),
      pb = this.state.players.get(sid);
    if (!a || !b || !pa?.connected || !pb?.connected) return;
    this.match = { id: randomUUID(), a: from, b: sid, startsAt: now + 3000, endsAt: now + 123000 };
    this.result = '';
    this.invites = [];
    this.casts = [];
    this.dashes.clear();
    for (const f of [a, b]) {
      f.hp = 100;
      f.energy = 100;
      f.cooldowns = {};
      f.guardUntil = 0;
    }
    pa.x = 392;
    pa.y = 360;
    pa.dir = 2;
    pb.x = 568;
    pb.y = 360;
    pb.dir = 1;
    this.snapshot();
  }
  private async learn(client: Client, id: string) {
    const f = this.fighters.get(client.sessionId),
      p = this.state.players.get(client.sessionId);
    const skill = MARTIAL_SKILLS.find((s) => s.id === id);
    if (!skill || !f || !p?.connected || this.busy(client.sessionId)) return;
    if (!caveNear(p, MARTIAL_MASTER, 100)) {
      this.notice(client, 'Đến gần võ sư bên trái sân để học chiêu miễn phí.');
      return;
    }
    if (f.learned.includes(skill.id)) return;
    try {
      await getDeps().redis.sadd(`martial:skills:${f.userId}`, skill.id);
      if (!f.learned.includes(skill.id)) f.learned.push(skill.id);
      this.notice(client, `Đã học ${skill.name}! Dùng phím ${skill.key} để thi triển.`);
      this.snapshot();
    } catch {
      this.notice(client, 'Chưa lưu được chiêu thức. Hãy thử học lại.');
    }
  }
  private cast(client: Client, id: string) {
    const sid = client.sessionId,
      now = Date.now();
    const f = this.fighters.get(sid),
      p = this.state.players.get(sid);
    const skill = MARTIAL_SKILLS.find((s) => s.id === id);
    if (
      !f ||
      !p?.connected ||
      !skill ||
      !f.learned.includes(skill.id) ||
      f.energy < skill.energy ||
      now < (f.cooldowns[skill.id] ?? 0) ||
      this.dashes.has(sid) ||
      this.casts.some((c) => c.sid === sid)
    )
      return;
    const fighting = this.busy(sid);
    if (fighting && (now < this.match!.startsAt || now >= this.match!.endsAt)) return;
    if (!fighting && !caveNear(p, MARTIAL_DUMMY, 250)) {
      this.notice(client, 'Đến mộc nhân bên phải để luyện chiêu, hoặc mời người chơi tỷ thí.');
      return;
    }
    f.energy -= skill.energy;
    f.cooldowns[skill.id] = now + skill.cooldown;
    const angle = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][p.dir] ?? 0;
    const effect: MartialEffect = { skill: skill.id, sid, phase: 'windup', x: p.x, y: p.y, angle };
    if (skill.id === 'guard') {
      f.guardUntil = now + 1000;
      this.broadcast('martial:effect', { ...effect, phase: 'cast' });
    } else {
      this.casts.push({
        ...effect,
        sid,
        at: now + skill.windup,
        matchId: fighting ? this.match!.id : undefined,
      });
      this.broadcast('martial:effect', effect);
    }
  }
  private resolve(c: Cast, now: number) {
    const f = this.fighters.get(c.sid);
    if (!f || !this.state.players.get(c.sid)?.connected) return;
    if (c.matchId && (c.matchId !== this.match?.id || now >= this.match.endsAt)) return;
    if (c.skill === 'wave' || c.skill === 'step') {
      if (c.matchId && now >= this.match!.endsAt) return;
      const player = this.state.players.get(c.sid)!;
      const from = { x: player.x, y: player.y };
      const to = martialDashEnd(from, c.angle, !!c.matchId);
      this.dashes.set(c.sid, { cast: c, from, to, elapsed: 0, hit: false });
      this.broadcast('martial:effect', {
        ...c,
        ...from,
        phase: 'dash',
        endX: to.x,
        endY: to.y,
        duration: MARTIAL_DASH_MS,
      });
      return;
    }
    if (c.skill === 'heal') {
      const amount = Math.min(24, 100 - f.hp);
      f.hp += amount;
      this.broadcast('martial:effect', { ...c, phase: 'cast', amount });
      return;
    }
    this.broadcast('martial:effect', { ...c, phase: 'cast' });
    if (!c.matchId) {
      if (martialHits(c.skill, c, MARTIAL_DUMMY, c.angle))
        this.broadcast('martial:effect', {
          ...c,
          ...MARTIAL_DUMMY,
          phase: 'hit',
          amount: martialDamage(f.weapon, c.skill, false),
        });
      return;
    }
    const target = this.match!.a === c.sid ? this.match!.b : this.match!.a;
    const p = this.state.players.get(target),
      other = this.fighters.get(target);
    if (!p || !other || !martialHits(c.skill, c, p, c.angle)) return;
    const damage = martialDamage(f.weapon, c.skill, other.guardUntil > now);
    other.hp = Math.max(0, other.hp - damage);
    this.broadcast('martial:effect', {
      ...c,
      targetSid: target,
      x: p.x,
      y: p.y,
      phase: 'hit',
      amount: damage,
    });
    if (!other.hp) this.finish(c.sid);
  }
  private forfeit(sid: string) {
    if (this.busy(sid)) this.finish(this.match!.a === sid ? this.match!.b : this.match!.a);
  }
  private finish(winnerSid?: string) {
    const match = this.match;
    if (!match) return;
    this.match = null;
    this.casts = [];
    this.dashes.clear();
    const winner = winnerSid ? this.fighters.get(winnerSid) : undefined;
    const loser = winner ? this.fighters.get(match.a === winnerSid ? match.b : match.a) : undefined;
    this.result = winner ? `${winner.name} thắng trận!` : 'Hết giờ — hai võ sĩ hòa nhau.';
    if (winner && loser)
      this.pendingResults.set(match.id, {
        winner: { ...winner },
        loser: { ...loser },
        retryAt: 0,
        busy: false,
      });
    for (const sid of [match.a, match.b]) {
      const f = this.fighters.get(sid);
      if (f) {
        f.hp = 100;
        f.energy = 100;
        f.guardUntil = 0;
        f.cooldowns = {};
      }
    }
    this.broadcast('notice', { kind: 'info', text: this.result });
    this.snapshot();
  }
  private async saveResult(
    id: string,
    item: { winner: MartialFighter; loser: MartialFighter; retryAt: number; busy: boolean },
  ) {
    item.busy = true;
    try {
      // Atomic, idempotent Elo update across all arena rooms. Same pair earns rating once per 10 minutes.
      await getDeps().redis.eval(
        `
        if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
        redis.call('SET', KEYS[1], '1', 'EX', 604800)
        redis.call('HSET', 'martial:names', ARGV[1], ARGV[3], ARGV[2], ARGV[4])
        if redis.call('EXISTS', KEYS[2]) == 1 then return 0 end
        redis.call('SET', KEYS[2], '1', 'EX', 600)
        local a = tonumber(redis.call('ZSCORE', 'martial:ratings', ARGV[1])) or 1000
        local b = tonumber(redis.call('ZSCORE', 'martial:ratings', ARGV[2])) or 1000
        local d = math.floor(32 * (1 - 1 / (1 + 10 ^ ((b-a)/400))) + 0.5)
        redis.call('ZADD', 'martial:ratings', a+d, ARGV[1], math.max(0,b-d), ARGV[2])
        redis.call('HINCRBY', 'martial:wins', ARGV[1], 1)
        return 1`,
        2,
        `martial:result:${id}`,
        `martial:pair:${[item.winner.userId, item.loser.userId].sort().join(':')}`,
        item.winner.userId,
        item.loser.userId,
        item.winner.name,
        item.loser.name,
      );
      this.pendingResults.delete(id);
      await this.refreshRanks();
    } catch {
      item.retryAt = Date.now() + 3000;
    } finally {
      item.busy = false;
    }
  }
  private async refreshRanks() {
    try {
      const raw = await getDeps().redis.zrevrange('martial:ratings', 0, 9, 'WITHSCORES');
      this.rankings = await Promise.all(
        Array.from({ length: raw.length / 2 }, async (_, i) => {
          const userId = raw[i * 2]!;
          const [name, wins] = await Promise.all([
            getDeps().redis.hget('martial:names', userId),
            getDeps().redis.hget('martial:wins', userId),
          ]);
          return { userId, name: name ?? 'Võ sĩ', rating: Number(raw[i * 2 + 1]), wins: Number(wins ?? 0) };
        }),
      );
    } catch {
      /* Keep the last successful ranking until the next refresh. */
    }
  }
  private snapshot(client?: Client) {
    const data: MartialSnapshot = {
      now: Date.now(),
      fighters: [...this.fighters.values()].filter((f) => this.state.players.get(f.sid)?.connected),
      match: this.match,
      invites: this.invites,
      rankings: this.rankings,
      result: this.result,
    };
    if (client) client.send('martial:state', data);
    else this.broadcast('martial:state', data);
  }
  protected override tick(dt: number) {
    super.tick(dt);
    const now = Date.now();
    this.state.serverTime = now;
    if (now - this.lastRankRefresh > 10000) {
      this.lastRankRefresh = now;
      void this.refreshRanks();
    }
    this.invites = this.invites.filter((i) => i.expiresAt > now);
    for (const [sid, dash] of this.dashes) {
      const p = this.state.players.get(sid),
        f = this.fighters.get(sid);
      if (
        !p?.connected ||
        !f ||
        (dash.cast.matchId && (dash.cast.matchId !== this.match?.id || now >= this.match.endsAt))
      ) {
        this.dashes.delete(sid);
        continue;
      }
      const previous = { x: p.x, y: p.y };
      dash.elapsed = Math.min(MARTIAL_DASH_MS, dash.elapsed + Math.max(0, Math.min(dt, 100)));
      const t = dash.elapsed / MARTIAL_DASH_MS;
      p.x = dash.from.x + (dash.to.x - dash.from.x) * t;
      p.y = dash.from.y + (dash.to.y - dash.from.y) * t;
      const targetSid = dash.cast.matchId
        ? this.match!.a === sid
          ? this.match!.b
          : this.match!.a
        : undefined;
      const target = targetSid ? this.state.players.get(targetSid) : MARTIAL_DUMMY;
      const other = targetSid ? this.fighters.get(targetSid) : undefined;
      if (dash.cast.skill !== 'step' && !dash.hit && target && martialDashHits(previous, p, target)) {
        dash.hit = true;
        const damage = martialDamage(f.weapon, 'wave', !!other && other.guardUntil > now);
        if (other) other.hp = Math.max(0, other.hp - damage);
        this.broadcast('martial:effect', {
          ...dash.cast,
          targetSid,
          x: target.x,
          y: target.y,
          phase: 'hit',
          amount: damage,
        });
        if (other?.hp === 0) this.finish(sid);
      }
      if (t >= 1) {
        this.dashes.delete(sid);
        this.broadcast('martial:effect', { ...dash.cast, x: p.x, y: p.y, phase: 'cast' });
      }
    }
    for (const f of this.fighters.values()) {
      f.energy = Math.min(100, f.energy + (12 * Math.min(dt, 100)) / 1000);
      const p = this.state.players.get(f.sid);
      if (!p || !this.busy(f.sid)) continue;
      const d = Math.hypot(p.x - MARTIAL_RING.x, p.y - MARTIAL_RING.y);
      if (d > MARTIAL_RING.radius) {
        p.x = MARTIAL_RING.x + ((p.x - MARTIAL_RING.x) / d) * MARTIAL_RING.radius;
        p.y = MARTIAL_RING.y + ((p.y - MARTIAL_RING.y) / d) * MARTIAL_RING.radius;
      }
    }
    const ready = this.casts.filter((c) => c.at <= now);
    this.casts = this.casts.filter((c) => c.at > now);
    for (const c of ready) this.resolve(c, now);
    if (this.match && now >= this.match.endsAt) {
      const a = this.fighters.get(this.match.a)!,
        b = this.fighters.get(this.match.b)!;
      this.finish(a.hp === b.hp ? undefined : a.hp > b.hp ? a.sid : b.sid);
    }
    for (const [id, item] of this.pendingResults)
      if (!item.busy && now >= item.retryAt) void this.saveResult(id, item);
    if (now - this.lastSnapshot >= 200) {
      this.lastSnapshot = now;
      this.snapshot();
    }
  }
}
