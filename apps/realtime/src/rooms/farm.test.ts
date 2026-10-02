import type { Client } from '@colyseus/core';
import { DEFAULT_APPEARANCE } from '@cozy/game-data';
import type { Redis } from 'ioredis';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { BaseRoom, setDeps, type WorldSpec } from './base.js';
import { FarmRoom } from './farm.js';
import { PlayerState, RoomState } from '../schema.js';
import type { ApiClient } from '../api.js';

type Handler = (client: Client, payload: unknown) => void;

interface FarmRoomInternal {
  world(): WorldSpec;
  presenceKey(): string;
  userPermissions: Map<string, { isOwner: boolean }>;
}

describe('authoritative FarmRoom', () => {
  let room: FarmRoom;
  let handlers: Map<string, Handler>;
  let ownerClient: Client;
  let guestClient: Client;
  let mockApi: { farmAccess: ReturnType<typeof vi.fn>; session: ReturnType<typeof vi.fn> };

  const send = (type: string, client: Client, data: unknown = {}) => {
    const handler = handlers.get(type);
    if (handler) handler(client, data);
  };

  beforeEach(() => {
    handlers = new Map();
    vi.spyOn(BaseRoom.prototype as unknown as { setup(): void }, 'setup').mockImplementation(() => undefined);
    vi.spyOn(BaseRoom.prototype as unknown as { tick(dt: number): void }, 'tick').mockImplementation(
      () => undefined,
    );

    mockApi = {
      farmAccess: vi.fn(),
      session: vi.fn(),
    };
    setDeps({
      api: mockApi as unknown as ApiClient,
      redis: { hset: vi.fn(), hdel: vi.fn() } as unknown as Redis,
    });

    room = new FarmRoom();
    room.setState(new RoomState());
    vi.spyOn(room, 'onMessage').mockImplementation((type, callback) => {
      handlers.set(String(type), callback as Handler);
      return room;
    });

    const createMockClient = (sessionId: string) =>
      ({
        sessionId,
        send: vi.fn(),
        enqueueRaw: vi.fn(),
      }) as unknown as Client;

    ownerClient = createMockClient('sess_owner');
    guestClient = createMockClient('sess_guest');
    room.clients.push(ownerClient, guestClient);

    vi.spyOn(room, 'broadcast').mockImplementation(() => true);

    const pOwner = new PlayerState();
    pOwner.userId = 'user_owner';
    pOwner.name = 'Chủ Trại';
    room.state.players.set('sess_owner', pOwner);

    const pGuest = new PlayerState();
    pGuest.userId = 'user_guest';
    pGuest.name = 'Khách Viếng Thăm';
    room.state.players.set('sess_guest', pGuest);

    room.onCreate({ ownerId: 'user_owner' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('configures world spec matching FARM specifications', () => {
    const world = (room as unknown as FarmRoomInternal).world();
    expect(world.width).toBe(48 * 32);
    expect(world.height).toBe(32 * 32);
    expect(world.blockers.length).toBeGreaterThan(0);
    expect(world.spawn).toBeDefined();
    expect((room as unknown as FarmRoomInternal).presenceKey()).toBe('farm:user_owner');
    expect(room.state.kind).toBe('farm');
  });

  it('allows owner access and grants owner privileges', async () => {
    vi.spyOn(BaseRoom.prototype, 'onAuth').mockResolvedValue({
      userId: 'user_owner',
      role: 'player',
      displayName: 'Chủ Trại',
      statusText: '',
      fame: 10,
      appearance: DEFAULT_APPEARANCE,
      muted: [],
    });
    mockApi.farmAccess.mockResolvedValue({ allowed: true, isOwner: true });

    const session = await room.onAuth(ownerClient, { ownerId: 'user_owner' });
    expect(session.userId).toBe('user_owner');
    expect(room.isClientOwner('sess_owner')).toBe(true);
  });

  it('verifies visitor access with token and sets guest permissions', async () => {
    vi.spyOn(BaseRoom.prototype, 'onAuth').mockResolvedValue({
      userId: 'user_guest',
      role: 'player',
      displayName: 'Khách Viếng Thăm',
      statusText: '',
      fame: 0,
      appearance: DEFAULT_APPEARANCE,
      muted: [],
    });
    mockApi.farmAccess.mockResolvedValue({ allowed: true, isOwner: false });

    const session = await room.onAuth(guestClient, { ownerId: 'user_owner', farmToken: 'valid-token' });
    expect(session.userId).toBe('user_guest');
    expect(room.isClientOwner('sess_guest')).toBe(false);
  });

  it('rejects visitor if access is denied by api', async () => {
    vi.spyOn(BaseRoom.prototype, 'onAuth').mockResolvedValue({
      userId: 'user_stranger',
      role: 'player',
      displayName: 'Kẻ Lạ',
      statusText: '',
      fame: 0,
      appearance: DEFAULT_APPEARANCE,
      muted: [],
    });
    mockApi.farmAccess.mockResolvedValue({ allowed: false, isOwner: false });

    await expect(room.onAuth(guestClient, { ownerId: 'user_owner', farmToken: 'bad-token' })).rejects.toThrow(
      'Mật khẩu trang trại không chính xác hoặc trang trại đang riêng tư.',
    );
  });

  it('allows both owner and guest to water crops (collaborative co-op)', () => {
    const broadcastSpy = vi.spyOn(room, 'broadcast');

    send('farm:water', guestClient, { plotIndex: 2 });
    expect(broadcastSpy).toHaveBeenCalledWith(
      'farm:plot_watered',
      expect.objectContaining({
        plotIndex: 2,
        wateredBy: 'sess_guest',
        userId: 'user_guest',
      }),
    );

    send('farm:water', ownerClient, { plotIndex: 0 });
    expect(broadcastSpy).toHaveBeenCalledWith(
      'farm:plot_watered',
      expect.objectContaining({
        plotIndex: 0,
        wateredBy: 'sess_owner',
        userId: 'user_owner',
      }),
    );
  });

  it('allows owner to harvest but forbids guest from harvesting (anti-theft)', () => {
    const broadcastSpy = vi.spyOn(room, 'broadcast');
    // Set permissions
    (room as unknown as FarmRoomInternal).userPermissions.set('user_owner', { isOwner: true });
    (room as unknown as FarmRoomInternal).userPermissions.set('user_guest', { isOwner: false });

    // Guest attempts harvest -> denied with error notice
    send('farm:harvest', guestClient, { plotIndex: 1 });
    expect(guestClient.send).toHaveBeenCalledWith('notice', {
      kind: 'error',
      text: 'Khách không được phép thu hoạch nông sản của chủ trại!',
    });
    expect(broadcastSpy).not.toHaveBeenCalledWith('farm:plot_harvested', expect.anything());

    // Owner attempts harvest -> permitted
    send('farm:harvest', ownerClient, { plotIndex: 1 });
    expect(broadcastSpy).toHaveBeenCalledWith(
      'farm:plot_harvested',
      expect.objectContaining({
        plotIndex: 1,
        harvestedBy: 'user_owner',
      }),
    );
  });
});
