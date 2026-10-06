import type { Client } from '@colyseus/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  martialHits,
  martialDamage,
  martialDashEnd,
  MARTIAL_SKILLS,
  type MartialFighter,
  type MartialMatch,
} from '@cozy/game-data';
import { BaseRoom, setDeps, type Deps } from './base.js';
import { MartialRoom } from './martial.js';
import { PlayerState, RoomState } from '../schema.js';

type Internals = {
  fighters: Map<string, MartialFighter>;
  match: MartialMatch | null;
  tick(dt: number): void;
  casts: unknown[];
  pendingResults: Map<string, unknown>;
};
describe('server-authoritative martial arts', () => {
  let room: MartialRoom, internal: Internals;
  let handlers: Map<string, (c: Client, msg: unknown) => void>;
  let a: Client, b: Client, spectator: Client;
  const redis = {
    zrevrange: vi.fn().mockResolvedValue([]),
    sadd: vi.fn().mockResolvedValue(1),
    eval: vi.fn().mockResolvedValue(1),
    getdel: vi.fn().mockResolvedValue(null),
  };
  const send = (c: Client, action: string, extra = {}) => {
    vi.advanceTimersByTime(110);
    handlers.get('martial:action')!(c, { action, ...extra });
  };
  const start = () => {
    send(a, 'invite', { target: 'b' });
    send(b, 'accept', { target: 'a' });
  };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(100000);
    setDeps({ redis } as unknown as Deps);
    vi.spyOn(BaseRoom.prototype as unknown as { setup(): void }, 'setup').mockImplementation(() => {});
    vi.spyOn(BaseRoom.prototype as unknown as { tick(dt: number): void }, 'tick').mockImplementation(
      () => {},
    );
    handlers = new Map();
    room = new MartialRoom();
    room.setState(new RoomState());
    vi.spyOn(room, 'onMessage').mockImplementation((type, handler) => {
      handlers.set(String(type), handler);
      return room;
    });
    vi.spyOn(room, 'broadcast').mockImplementation(() => {});
    room.onCreate();
    internal = room as unknown as Internals;
    [a, b, spectator] = ['a', 'b', 'spectator'].map((sid) => {
      const c = { sessionId: sid, send: vi.fn() } as unknown as Client;
      room.clients.push(c);
      const p = new PlayerState();
      p.userId = sid;
      p.name = sid;
      p.x = 480;
      p.y = 360;
      p.dir = 2;
      room.state.players.set(sid, p);
      internal.fighters.set(sid, {
        sid,
        userId: sid,
        name: sid,
        weapon: 'iron',
        learned: ['slash'],
        hp: 100,
        energy: 100,
        cooldowns: {},
        guardUntil: 0,
      });
      return c;
    }) as [Client, Client, Client];
  });
  afterEach(() => {
    room.clock.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  it('requires a live invitation and consent from the actual recipient', () => {
    send(b, 'accept', { target: 'a' });
    expect(internal.match).toBeNull();
    send(a, 'invite', { target: 'a' });
    expect(internal.match).toBeNull();
    send(a, 'invite', { target: 'b' });
    send(spectator, 'accept', { target: 'a' });
    expect(internal.match).toBeNull();
    vi.advanceTimersByTime(21000);
    send(b, 'accept', { target: 'a' });
    expect(internal.match).toBeNull();
    start();
    expect(internal.match).toMatchObject({ a: 'a', b: 'b' });
  });
  it('blocks countdown attacks, unknown/unlearned skills, spectator damage and cooldown spam', () => {
    start();
    send(a, 'cast', { skill: 'slash', damage: 9999 });
    expect(internal.casts).toHaveLength(0);
    vi.advanceTimersByTime(3100);
    send(a, 'cast', { skill: 'wave' });
    send(a, 'cast', { skill: '__proto__' });
    expect(internal.casts).toHaveLength(0);
    const pa = room.state.players.get('a')!,
      pb = room.state.players.get('b')!;
    pa.x = 480;
    pb.x = 535;
    send(spectator, 'cast', { skill: 'slash' });
    expect(internal.casts).toHaveLength(0);
    send(a, 'cast', { skill: 'slash', damage: 9999, target: 'spectator' });
    send(a, 'cast', { skill: 'slash' });
    expect(internal.casts).toHaveLength(1);
    vi.advanceTimersByTime(200);
    internal.tick(50);
    expect(internal.fighters.get('b')!.hp).toBe(84);
    expect(internal.fighters.get('spectator')!.hp).toBe(100);
    send(a, 'cast', { skill: 'slash' });
    expect(internal.casts).toHaveLength(0);
  });
  it('allows dodging telegraphed attacks and reduces damage while guarding', () => {
    start();
    vi.advanceTimersByTime(3100);
    const pa = room.state.players.get('a')!,
      pb = room.state.players.get('b')!;
    pa.x = 480;
    pb.x = 535;
    send(a, 'cast', { skill: 'slash' });
    pb.y = 460;
    vi.advanceTimersByTime(200);
    internal.tick(50);
    expect(internal.fighters.get('b')!.hp).toBe(100);
    vi.advanceTimersByTime(700);
    pb.y = 360;
    internal.fighters.get('b')!.guardUntil = Date.now() + 1000;
    send(a, 'cast', { skill: 'slash' });
    vi.advanceTimersByTime(200);
    internal.tick(50);
    expect(internal.fighters.get('b')!.hp).toBe(96);
  });
  it('learns only near the master and only after persistence succeeds', async () => {
    send(a, 'learn', { skill: 'wave' });
    expect(redis.sadd).not.toHaveBeenCalled();
    room.state.players.get('a')!.x = 168;
    room.state.players.get('a')!.y = 320;
    redis.sadd.mockRejectedValueOnce(new Error('offline'));
    send(a, 'learn', { skill: 'wave' });
    await Promise.resolve();
    await Promise.resolve();
    expect(internal.fighters.get('a')!.learned).not.toContain('wave');
    send(a, 'learn', { skill: 'wave' });
    await Promise.resolve();
    await Promise.resolve();
    expect(internal.fighters.get('a')!.learned).toContain('wave');
  });
  it('ends timeout draws without ranking, and forfeits only once with a retryable result', () => {
    start();
    vi.advanceTimersByTime(124000);
    internal.tick(50);
    expect(internal.match).toBeNull();
    expect(internal.pendingResults.size).toBe(0);
    start();
    send(spectator, 'forfeit');
    expect(internal.match).not.toBeNull();
    send(a, 'forfeit');
    send(a, 'forfeit');
    expect(internal.match).toBeNull();
    expect(internal.pendingResults.size).toBe(1);
    expect(internal.fighters.get('a')!.hp).toBe(100);
  });
  it('enforces range, direction and PvP weapon balance', () => {
    expect(martialHits('wave', { x: 0, y: 0 }, { x: 200, y: 0 }, 0)).toBe(true);
    expect(martialHits('wave', { x: 0, y: 0 }, { x: 200, y: 90 }, 0)).toBe(false);
    expect(martialHits('slash', { x: 0, y: 0 }, { x: -60, y: 0 }, 0)).toBe(false);
    expect(martialHits('spin', { x: 0, y: 0 }, { x: -60, y: 0 }, 0)).toBe(true);
    expect(martialDamage('crystal', 'slash', false)).toBe(20);
    expect(martialDamage('crystal', 'slash', true)).toBe(5);
  });
  it('rejects direct entry and loads weapons from the trusted API after a door ticket', async () => {
    const session = { userId: 'a', displayName: 'A' };
    vi.spyOn(BaseRoom.prototype, 'onAuth').mockResolvedValue(session as never);
    const cave = vi.fn().mockResolvedValue({ weapon: 'crystal' });
    const smembers = vi.fn().mockResolvedValue(['wave', 'fabricated']);
    setDeps({ api: { cave }, redis: { ...redis, smembers } } as unknown as Deps);
    await expect(room.onAuth(a, {})).rejects.toThrow('cổng chùa');
    expect(cave).not.toHaveBeenCalled();
    redis.getdel.mockResolvedValueOnce('1' as never);
    await expect(room.onAuth(a, {})).resolves.toMatchObject({ martial: { weapon: 'crystal' } });
    expect(cave).toHaveBeenCalledWith(expect.objectContaining({ userId: 'a', action: 'load' }));
  });
  it('limits energy and records a disconnect as a forfeit', async () => {
    start();
    vi.advanceTimersByTime(3100);
    const f = internal.fighters.get('a')!;
    f.learned.push('wave');
    f.energy = 10;
    send(a, 'cast', { skill: 'wave' });
    expect(internal.casts).toHaveLength(0);
    vi.spyOn(BaseRoom.prototype, 'onLeave').mockResolvedValue();
    await room.onLeave(a, false);
    expect(internal.match).toBeNull();
    expect(internal.pendingResults.size).toBe(1);
  });
  it('summons then dashes over simulation ticks, hits once and ignores a fabricated destination', () => {
    start();
    vi.advanceTimersByTime(3100);
    internal.fighters.get('a')!.learned.push('wave');
    const p = room.state.players.get('a')!;
    room.state.players.get('b')!.x = 500;
    send(a, 'cast', { skill: 'wave', endX: 99999, duration: 0 });
    expect(p.x).toBe(392);
    vi.advanceTimersByTime(530);
    internal.tick(50);
    expect(p.x).toBe(392);
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(50);
      internal.tick(50);
    }
    expect(p.x).toBe(524);
    expect(internal.fighters.get('b')!.hp).toBe(78);
    expect(room.broadcast).toHaveBeenCalledWith(
      'martial:effect',
      expect.objectContaining({ phase: 'dash', duration: 240, endX: 524 }),
    );
  });
  it('stops dashes at the ring edge and scenery, and supports all eight skills', () => {
    expect(MARTIAL_SKILLS).toHaveLength(8);
    expect(martialDashEnd({ x: 650, y: 360 }, 0, true).x).toBeLessThanOrEqual(676);
    expect(martialDashEnd({ x: 730, y: 336 }, 0, false).x).toBeLessThanOrEqual(762);
    expect(martialHits('rain', { x: 0, y: 0 }, { x: 116, y: 60 }, 0)).toBe(true);
    expect(martialHits('rain', { x: 0, y: 0 }, { x: 116, y: 80 }, 0)).toBe(false);
  });
  it('heals only the caster up to maximum health and shadow step does not damage', () => {
    start();
    vi.advanceTimersByTime(3100);
    const f = internal.fighters.get('a')!;
    f.learned.push('heal', 'step');
    f.hp = 90;
    send(a, 'cast', { skill: 'heal', amount: 9999 });
    vi.advanceTimersByTime(810);
    internal.tick(50);
    expect(f.hp).toBe(100);
    expect(internal.fighters.get('b')!.hp).toBe(100);
    room.state.players.get('b')!.x = 480;
    send(a, 'cast', { skill: 'step' });
    vi.advanceTimersByTime(110);
    internal.tick(50);
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(50);
      internal.tick(50);
    }
    expect(room.state.players.get('a')!.x).toBe(524);
    expect(internal.fighters.get('b')!.hp).toBe(100);
  });
});
