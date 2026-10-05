import type { Client } from '@colyseus/core';
import {
  CAVE_GATE,
  CAVE_SHOP,
  CAVE_STAIRS,
  DEFAULT_APPEARANCE,
  type CaveAccount,
  type CaveEnemy,
  type CaveOre,
} from '@cozy/game-data';
import type { Redis } from 'ioredis';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../api.js';
import { PlayerState, RoomState } from '../schema.js';
import { BaseRoom, setDeps } from './base.js';
import { CaveRoom } from './cave.js';
import type { CaveCombat } from './cave-combat.js';

interface Internals {
  combat: CaveCombat;
  floor: number;
  hp: number;
  nextAction: number;
  busy: boolean;
  account: CaveAccount;
  enemies: CaveEnemy[];
  ores: CaveOre[];
  tick(dt: number): void;
  flushLoot(): Promise<void>;
  pendingLoot: { requestId: string; quantity: number }[];
}
describe('authoritative cave expedition', () => {
  let room: CaveRoom, internal: Internals, player: PlayerState, client: Client;
  let handlers: Map<string, (client: Client, data: unknown) => void>;
  let api: ReturnType<typeof vi.fn>, ticket: ReturnType<typeof vi.fn>;
  const account: CaveAccount = {
    weapon: 'training',
    resources: { stone: 0, iron: 0, crystal: 0 },
    coin: 1000,
  };
  const send = (action: string, extra = {}) => handlers.get('cave:action')!(client, { action, ...extra });
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(10000);
    vi.spyOn(BaseRoom.prototype as unknown as { setup(): void }, 'setup').mockImplementation(() => undefined);
    vi.spyOn(BaseRoom.prototype as unknown as { tick(dt: number): void }, 'tick').mockImplementation(
      () => undefined,
    );
    vi.spyOn(BaseRoom.prototype, 'onAuth').mockResolvedValue({
      userId: 'owner',
      role: 'player',
      displayName: 'Explorer',
      statusText: '',
      fame: 0,
      appearance: DEFAULT_APPEARANCE,
      muted: [],
    });
    api = vi.fn().mockResolvedValue(structuredClone(account));
    ticket = vi.fn().mockResolvedValue('1');
    setDeps({
      api: { cave: api } as unknown as ApiClient,
      redis: {
        get: ticket,
        smembers: vi.fn().mockResolvedValue(['spin', 'guard', 'heal', 'invalid']),
      } as unknown as Redis,
    });
    room = new CaveRoom();
    room.setState(new RoomState());
    handlers = new Map();
    vi.spyOn(room, 'onMessage').mockImplementation((type, callback) => {
      handlers.set(String(type), callback);
      return room;
    });
    vi.spyOn(room, 'broadcast').mockImplementation(() => true);
    client = { sessionId: 'session', send: vi.fn() } as unknown as Client;
    room.clients.push(client);
    player = new PlayerState();
    player.userId = 'owner';
    player.x = 120;
    player.y = 336;
    room.state.players.set(client.sessionId, player);
    room.onCreate({ ownerId: 'owner' });
    internal = room as unknown as Internals;
    internal.account = structuredClone(account);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  const enter = () => {
    Object.assign(player, CAVE_GATE);
    send('interact');
    vi.advanceTimersByTime(700);
  };
  it('requires the town server entry ticket', async () => {
    ticket.mockResolvedValue(null);
    await expect(room.onAuth(client, {})).rejects.toThrow('cuối đường');
    ticket.mockResolvedValue('1');
    await expect(room.onAuth(client, {})).resolves.toMatchObject({ userId: 'owner' });
  });
  it('does not enter remotely or accept client floor/damage/loot claims', () => {
    send('interact', { floor: 5 });
    expect(internal.floor).toBe(0);
    vi.advanceTimersByTime(500);
    enter();
    expect(internal.floor).toBe(1);
    const enemy = internal.enemies[0]!;
    const hp = enemy.hp;
    send('attack', { damage: 999999, quantity: 999999 });
    expect(enemy.hp).toBe(hp);
    expect(api).not.toHaveBeenCalled();
  });
  it('loads dojo ownership and applies skill kills through the durable loot path', async () => {
    await room.onAuth(client, {});
    expect(internal.combat.learned).toEqual(['slash', 'spin', 'guard', 'heal']);
    api.mockClear();
    enter();
    const enemy = internal.enemies[0]!;
    Object.assign(player, { x: enemy.x - 30, y: enemy.y, dir: 2 });
    enemy.hp = 1;
    send('cast', { skill: 'rain', learned: true, damage: 99999 });
    expect(internal.combat.busy).toBe(false);
    send('cast', { skill: 'spin' });
    send('attack');
    expect(enemy.hp).toBe(1);
    vi.advanceTimersByTime(500);
    internal.tick(50);
    await Promise.resolve();
    expect(enemy.hp).toBe(0);
    expect(api).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ action: 'loot', quantity: 2 }));
    internal.tick(50);
    expect(api).toHaveBeenCalledTimes(1);
  });
  it('reduces monster damage with guard and caps healing at full health', async () => {
    await room.onAuth(client, {});
    enter();
    const enemy = internal.enemies[0]!;
    Object.assign(player, { x: enemy.x, y: enemy.y });
    internal.hp = 90;
    enemy.windup = Date.now();
    send('cast', { skill: 'guard' });
    internal.tick(50);
    expect(internal.hp).toBe(88);
    player.x = 120;
    vi.advanceTimersByTime(500);
    send('cast', { skill: 'heal' });
    vi.advanceTimersByTime(800);
    internal.tick(50);
    expect(internal.hp).toBe(100);
  });
  it('limits attack cadence and grants each kill once with a server id', async () => {
    enter();
    const enemy = internal.enemies[0]!;
    Object.assign(player, { x: enemy.x - 50, y: enemy.y });
    send('attack');
    expect(enemy.hp).toBe(enemy.maxHp - 12);
    send('attack');
    expect(enemy.hp).toBe(enemy.maxHp - 12);
    vi.advanceTimersByTime(500);
    send('attack');
    vi.advanceTimersByTime(500);
    send('attack');
    await Promise.resolve();
    expect(enemy.hp).toBe(0);
    expect(api).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'loot',
        item: 'iron',
        quantity: 2,
        requestId: expect.stringContaining('enemy-0'),
      }),
    );
    vi.advanceTimersByTime(500);
    send('attack');
    expect(api).toHaveBeenCalledTimes(1);
  });
  it('requires proximity and three swings to mine; cannot repeat a depleted node', async () => {
    enter();
    const ore = internal.ores[0]!;
    Object.assign(player, { x: 320, y: 320 });
    send('interact');
    expect(ore.hp).toBe(3);
    Object.assign(player, { x: ore.x, y: ore.y + 40 });
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(500);
      send('interact');
    }
    await Promise.resolve();
    expect(ore.hp).toBe(0);
    expect(api).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    send('interact');
    expect(api).toHaveBeenCalledTimes(1);
  });
  it('opens stairs only after clearing the floor', () => {
    enter();
    Object.assign(player, CAVE_STAIRS);
    send('interact');
    expect(internal.floor).toBe(1);
    internal.enemies.forEach((e) => {
      e.hp = 0;
    });
    vi.advanceTimersByTime(500);
    send('interact');
    expect(internal.floor).toBe(2);
  });
  it('telegraphs attacks, permits dodging and rescues defeated players', () => {
    enter();
    const enemy = internal.enemies[0]!;
    Object.assign(player, { x: enemy.x, y: enemy.y });
    internal.tick(50);
    expect(internal.hp).toBe(100);
    expect(enemy.windup).toBeGreaterThan(0);
    player.x = 100;
    vi.advanceTimersByTime(700);
    internal.tick(50);
    expect(internal.hp).toBe(100);
    Object.assign(player, { x: enemy.x, y: enemy.y });
    internal.hp = 1;
    vi.advanceTimersByTime(1300);
    internal.tick(50);
    vi.advanceTimersByTime(700);
    internal.tick(50);
    expect(internal.floor).toBe(0);
    expect(internal.hp).toBe(100);
  });
  it('rejects remote shop transactions and serializes concurrent purchases', async () => {
    send('buy', { requestId: 'purchase-123', item: 'iron' });
    expect(api).not.toHaveBeenCalled();
    Object.assign(player, CAVE_SHOP);
    send('buy', { requestId: 'purchase-123', item: 'iron' });
    send('buy', { requestId: 'purchase-456', item: 'crystal' });
    expect(api).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });
  it('retries failed loot with the same id and prevents floor changes until saved', async () => {
    api.mockRejectedValueOnce(new Error('temporary outage'));
    enter();
    const enemy = internal.enemies[0]!;
    enemy.hp = 1;
    Object.assign(player, { x: enemy.x, y: enemy.y });
    send('attack');
    await Promise.resolve();
    expect(internal.pendingLoot).toHaveLength(1);
    vi.advanceTimersByTime(600);
    send('retreat');
    expect(internal.floor).toBe(1);
    vi.advanceTimersByTime(2200);
    await internal.flushLoot();
    expect(api.mock.calls[0]![0].requestId).toBe(api.mock.calls[1]![0].requestId);
    expect(internal.pendingLoot).toHaveLength(0);
  });
});
