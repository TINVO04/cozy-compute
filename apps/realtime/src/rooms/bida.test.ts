import type { Client } from '@colyseus/core';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { BaseRoom, setDeps } from './base.js';
import type { ApiClient } from '../api.js';
import type { Redis } from 'ioredis';
import { BidaRoom, type BidaTable } from './bida.js';
import { PlayerState, RoomState } from '../schema.js';

type Handler = (client: Client, payload: unknown) => void;
type RoomInternals = { tables: Map<string, BidaTable>; tick(dt: number): void };

describe('authoritative billiards room', () => {
  let room: BidaRoom;
  let internals: RoomInternals;
  let handlers: Map<string, Handler>;
  let host: Client;
  let guest: Client;
  let outsider: Client;
  const send = (type: string, client: Client, data: unknown = {}) => handlers.get(type)!(client, data);
  const table = () => [...internals.tables.values()][0]!;
  const start = (mode = '8ball') => {
    send('bida:create_table', host, { mode });
    if (mode !== 'practice') send('bida:join_table', guest, { tableId: table().id });
    return table();
  };

  beforeEach(() => {
    setDeps({
      api: { bidaResult: vi.fn().mockResolvedValue({ ok: true }) } as unknown as ApiClient,
      redis: {} as Redis,
    });
    handlers = new Map();
    vi.spyOn(BaseRoom.prototype as unknown as { setup(): void }, 'setup').mockImplementation(() => undefined);
    vi.spyOn(BaseRoom.prototype as unknown as { tick(dt: number): void }, 'tick').mockImplementation(
      () => undefined,
    );
    room = new BidaRoom();
    room.setState(new RoomState());
    vi.spyOn(room, 'onMessage').mockImplementation((type, callback) => {
      handlers.set(String(type), callback as Handler);
      return room;
    });
    const client = (sessionId: string) => ({ sessionId, send: vi.fn() }) as unknown as Client;
    host = client('host');
    guest = client('guest');
    outsider = client('outsider');
    room.clients.push(host, guest, outsider);
    for (const client of room.clients) {
      const player = new PlayerState();
      player.name = client.sessionId;
      player.userId = client.sessionId;
      room.state.players.set(client.sessionId, player);
    }
    room.onCreate();
    internals = room as unknown as RoomInternals;
  });
  afterEach(() => vi.restoreAllMocks());

  it('lets spectators watch but rejects their shots and rematches', () => {
    const t = start();
    send('bida:watch', outsider, { tableId: t.id });
    expect(outsider.send).toHaveBeenCalledWith(
      'bida:table_start',
      expect.objectContaining({ spectating: true }),
    );
    const before = structuredClone(t);
    send('bida:shot', outsider, { tableId: t.id, angle: 0, power: 80 });
    send('bida:rematch', outsider, { tableId: t.id });
    expect(t).toEqual(before);
    send('bida:shot', host, { tableId: t.id, angle: 0, power: 80 });
    expect(outsider.send).toHaveBeenCalledWith('bida:shot_executed', expect.anything());
    send('bida:unwatch', outsider);
  });

  it('ignores fabricated settled balls and wins, including outsider practice claims', () => {
    const t = start('practice');
    const before = structuredClone(t);
    for (const c of [host, guest, outsider])
      send('bida:shot_settled', c, {
        tableId: t.id,
        balls: [],
        scratch: false,
        eightBallPocketed: true,
        pocketedBallIds: [1, 2, 3, 4, 5, 6, 7],
      });
    expect(t).toEqual(before);
    expect(host.send).not.toHaveBeenCalledWith('bida:game_over', expect.anything());
  });

  it('validates malformed payloads, one active table, membership and finite shot input', () => {
    for (const payload of [null, { name: 123 }, { mode: 'bogus' }]) send('bida:create_table', host, payload);
    expect(internals.tables.size).toBe(0);
    const t = start();
    send('bida:create_table', host, {});
    expect(internals.tables.size).toBe(1);
    for (const c of [guest, outsider]) send('bida:shot', c, { tableId: t.id, angle: 0, power: 100 });
    send('bida:shot', host, { tableId: t.id, angle: Number.NaN, power: 100 });
    send('bida:shot', host, { tableId: t.id, angle: 0, power: Number.POSITIVE_INFINITY });
    expect(t.balls.every((b) => b.vx === 0 && b.vy === 0)).toBe(true);
    send('bida:aim', outsider, { tableId: t.id, angle: 1 });
    expect(host.send).not.toHaveBeenCalledWith('bida:opponent_aim', expect.anything());
  });

  it('settles on server ticks without any client settlement and rejects duplicate shots', () => {
    const t = start();
    send('bida:shot', host, { tableId: t.id, angle: Math.PI, power: 10 });
    send('bida:shot', host, { tableId: t.id, angle: 0, power: 100 });
    expect(
      (vi.mocked(host.send).mock.calls as unknown as [string, unknown][]).filter(
        (c) => c[0] === 'bida:shot_executed',
      ),
    ).toHaveLength(1);
    for (let i = 0; i < 500; i++) internals.tick(50);
    expect(t.balls.every((b) => b.vx === 0 && b.vy === 0)).toBe(true);
    expect(t.turn).toBe('guest');
    expect(host.send).toHaveBeenCalledWith(
      'bida:turn_changed',
      expect.objectContaining({ balls: t.balls, turn: 'guest' }),
    );
    expect(t.score1).toBe(0);
  });

  it('requires membership and a finished match for rematch; waiting host cannot shoot', () => {
    send('bida:create_table', host, {});
    const t = table();
    send('bida:shot', host, { tableId: t.id, angle: 0, power: 100 });
    send('bida:rematch', host, { tableId: t.id });
    expect(t.status).toBe('waiting');
    send('bida:join_table', guest, { tableId: t.id });
    t.status = 'finished';
    t.score1 = 9;
    send('bida:rematch', outsider, { tableId: t.id });
    expect(t.score1).toBe(9);
    send('bida:rematch', guest, { tableId: t.id });
    expect(t.status).toBe('playing');
    expect(t.score1).toBe(0);
  });

  it('keeps carom targets on a pocketless table', () => {
    const t = start('carom');
    send('bida:shot', host, { tableId: t.id, angle: (-Math.PI * 3) / 4, power: 100 });
    for (let i = 0; i < 600; i++) internals.tick(50);
    expect(t.balls).toHaveLength(3);
    expect(t.balls.every((b) => !b.pocketed)).toBe(true);
    expect(t.score1).toBeLessThanOrEqual(1);
  });

  it('preserves tables after successful reconnect and removes them on final departure', async () => {
    const t = start();
    const leave = vi.spyOn(BaseRoom.prototype, 'onLeave').mockResolvedValue(undefined);
    await room.onLeave(host, false);
    expect(internals.tables.get(t.id)).toBe(t);
    leave.mockImplementation(async (client) => {
      room.state.players.delete(client.sessionId);
    });
    await room.onLeave(host, true);
    expect(internals.tables.has(t.id)).toBe(false);
  });
});
