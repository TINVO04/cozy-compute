import type { Client } from '@colyseus/core';
import { DEFAULT_APPEARANCE } from '@cozy/game-data';
import type { Redis } from 'ioredis';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ApiClient } from '../api.js';
import { RoomState } from '../schema.js';
import { BaseRoom, setDeps, getDeps } from './base.js';
import { ShowroomRoom } from './showroom.js';
import { TownRoom } from './town.js';

let room: TownRoom;
let client: Client;
let fine: ReturnType<typeof vi.fn>;
let handlers: Map<string, (client: Client, payload: unknown) => void>;
const tick = () => (room as unknown as { tick(dt: number): void }).tick(50);
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(15000);
  fine = vi.fn().mockResolvedValue({ charged: 80, coin: 220 });
  setDeps({
    api: {
      trafficFine: fine,
      session: vi.fn().mockResolvedValue({ userId: 'player' }),
    } as unknown as ApiClient,
    redis: {
      get: vi.fn().mockResolvedValue(null),
      getdel: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      hset: vi.fn(),
      hdel: vi.fn(),
    } as unknown as Redis,
  });
  vi.spyOn(BaseRoom.prototype as unknown as { setup(): void }, 'setup').mockImplementation(() => undefined);
  room = new TownRoom();
  room.setState(new RoomState());
  handlers = new Map();
  vi.spyOn(room, 'onMessage').mockImplementation((type, handler) => {
    handlers.set(String(type), handler);
    return room;
  });
  room.onCreate();
  client = { sessionId: 'driver', send: vi.fn(), enqueueRaw: vi.fn() } as unknown as Client;
  room.clients.push(client);
  room.onJoin(
    client,
    {},
    {
      userId: 'player',
      role: 'player',
      displayName: 'Driver',
      statusText: '',
      fame: 0,
      appearance: { ...DEFAULT_APPEARANCE, vehicle: 'car_mint' },
      muted: [],
    },
  );
  const p = room.state.players.get(client.sessionId)!;
  p.x = 320;
  p.y = 352;
});
afterEach(() => {
  room.onDispose();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it('mounts only server-owned cars on roads and clears driving when equipment changes', () => {
  const p = room.state.players.get('driver')!;
  handlers.get('vehicle:toggle')!(client, { vehicle: 'car_sunset', speed: 99999 });
  expect(p.vehicle).toBe('car_mint');
  room.updateAppearance('player', DEFAULT_APPEARANCE);
  expect(p.vehicle).toBe('');
  handlers.get('vehicle:toggle')!(client, { vehicle: 'car_sunset' });
  expect(p.vehicle).toBe('');
  room.updateAppearance('player', { ...DEFAULT_APPEARANCE, vehicle: 'car_sunset' });
  p.x = 700;
  p.y = 600;
  handlers.get('vehicle:toggle')!(client, {});
  expect(p.vehicle).toBe('');
});
it('issues one red-light ticket, dismounts and retries the same ticket after API failure', async () => {
  const p = room.state.players.get('driver')!;
  handlers.get('vehicle:toggle')!(client, {});
  fine.mockRejectedValueOnce(new Error('offline'));
  p.x = 330;
  tick();
  await Promise.resolve();
  expect(p.vehicle).toBe('');
  expect(fine).toHaveBeenCalledTimes(1);
  handlers.get('vehicle:toggle')!(client, {});
  expect(p.vehicle).toBe('');
  const first = fine.mock.calls[0];
  vi.setSystemTime(18000);
  tick();
  await Promise.resolve();
  expect(fine).toHaveBeenCalledTimes(2);
  expect(fine.mock.calls[1]).toEqual(first);
  expect(client.send).toHaveBeenCalledWith(
    'traffic:fine',
    expect.objectContaining({ violation: 'red_light', charged: 80 }),
  );
  tick();
  expect(fine).toHaveBeenCalledTimes(2);
});
it('pedestrians cross red lights without a fine', () => {
  const p = room.state.players.get('driver')!;
  p.x = 330;
  tick();
  expect(fine).not.toHaveBeenCalled();
});
it('only grants showroom entry at the physical garage door and dismounts the driver', async () => {
  await handlers.get('showroom:enter')!(client, {});
  expect(getDeps().redis.set).not.toHaveBeenCalled();
  const p = room.state.players.get('driver')!;
  p.x = 624;
  p.y = 824;
  p.vehicle = 'car_mint';
  await handlers.get('showroom:enter')!(client, {});
  expect(getDeps().redis.set).toHaveBeenCalledWith('showroom:entry:player', '1', 'EX', 30);
  expect(p.vehicle).toBe('');
  expect(client.send).toHaveBeenCalledWith('showroom:travel', {});
});
it('rejects direct showroom joins without a server entry pass', async () => {
  const showroom = new ShowroomRoom();
  await expect(showroom.onAuth(client, { token: 'test' })).rejects.toThrow('Gara Bạc Hà');
  vi.mocked(getDeps().redis.getdel).mockResolvedValueOnce('1');
  await expect(showroom.onAuth(client, { token: 'test' })).resolves.toMatchObject({ userId: 'player' });
  await expect(showroom.onAuth(client, { token: 'test' })).rejects.toThrow();
});
it.each([
  ['bicycle_sky', 195],
  ['motorcycle_coral', 270],
] as const)('%s mounts at its server speed and obeys traffic lights', async (id, speed) => {
  const p = room.state.players.get('driver')!;
  room.updateAppearance('player', { ...DEFAULT_APPEARANCE, vehicle: id });
  handlers.get('vehicle:toggle')!(client, { speed: 99999 });
  expect(p.vehicle).toBe(id);
  expect(
    (
      room as unknown as {
        playerSpeedFor(d: object, player: { vehicle: string; x: number; y: number }): number;
      }
    ).playerSpeedFor({}, p),
  ).toBe(speed);
  p.x = 330;
  tick();
  await Promise.resolve();
  expect(p.vehicle).toBe('');
  expect(fine).toHaveBeenCalledWith('player', expect.any(String), 'red_light');
});
