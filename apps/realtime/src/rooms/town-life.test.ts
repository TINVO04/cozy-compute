import type { Client } from '@colyseus/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BaseRoom } from './base.js';
import { TownRoom } from './town.js';
import { PlayerState, RoomState } from '../schema.js';
import { STREET_VENDORS } from '@cozy/game-data';

describe('authoritative town life wiring', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  it('publishes actors to room state, rejects remote claims, and uses every connected player to startle birds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00+07:00'));
    vi.spyOn(BaseRoom.prototype as unknown as { setup(): void }, 'setup').mockImplementation(() => undefined);
    vi.spyOn(BaseRoom.prototype as unknown as { tick(dt: number): void }, 'tick').mockImplementation(
      () => undefined,
    );
    vi.spyOn(TownRoom.prototype, 'syncEvent').mockResolvedValue(undefined);
    const handlers = new Map<string, (client: Client, message: unknown) => void>();
    const room = new TownRoom();
    room.setState(new RoomState());
    vi.spyOn(room, 'onMessage').mockImplementation((type, callback) => {
      handlers.set(String(type), callback);
      return room;
    });
    room.onCreate();
    try {
      expect(room.state.townActors.size).toBe(15);
      const client = { sessionId: 'visitor', send: vi.fn() } as unknown as Client;
      const player = new PlayerState();
      room.state.players.set(client.sessionId, player);
      const vendor = room.state.townActors.get('vendor-0')!;
      const talk = handlers.get('town:talk')!;
      talk(client, { id: vendor.id, x: vendor.x, y: vendor.y });
      talk(client, null);
      talk(client, { id: {} });
      expect(client.send).not.toHaveBeenCalled();
      player.x = vendor.x;
      player.y = vendor.y + 40;
      talk(client, { id: vendor.id });
      expect(client.send).toHaveBeenCalledWith(
        'town:dialogue',
        expect.objectContaining({ name: STREET_VENDORS[vendor.variant]!.name }),
      );
      expect(vendor.mode).toBe('talking');
      const second = new PlayerState();
      const bird = [...room.state.townActors.values()].find((a) => a.kind === 'pigeon')!;
      second.x = bird.x;
      second.y = bird.y;
      room.state.players.set('second-player', second);
      (room as unknown as { tick(dt: number): void }).tick(50);
      expect(
        [...room.state.townActors.values()]
          .filter((a) => a.kind === 'pigeon' && a.variant === bird.variant)
          .every((a) => a.mode === 'flying' && a.altitude > 0),
      ).toBe(true);
      room.state.players.clear();
      for (let i = 0; i < 2400; i++) {
        vi.advanceTimersByTime(50);
        (room as unknown as { tick(dt: number): void }).tick(50);
      }
      expect(room.state.townActors.has(vendor.id)).toBe(false);
      expect([...room.state.townActors.values()].some((a) => a.kind === 'vendor')).toBe(true);
      expect(room.state.townActors.size).toBeLessThanOrEqual(18);
    } finally {
      room.onDispose();
    }
  }, 15000);

  it('handles server-authoritative cat pickup and putdown without resetting position', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00+07:00'));
    vi.spyOn(BaseRoom.prototype as unknown as { setup(): void }, 'setup').mockImplementation(() => undefined);
    vi.spyOn(BaseRoom.prototype as unknown as { tick(dt: number): void }, 'tick').mockImplementation(
      () => undefined,
    );
    vi.spyOn(TownRoom.prototype, 'syncEvent').mockResolvedValue(undefined);
    const handlers = new Map<string, (client: Client, message: unknown) => void>();
    const room = new TownRoom();
    room.setState(new RoomState());
    vi.spyOn(room, 'onMessage').mockImplementation((type, callback) => {
      handlers.set(String(type), callback);
      return room;
    });
    room.onCreate();
    try {
      const client = { sessionId: 'cat-lover', send: vi.fn() } as unknown as Client;
      const player = new PlayerState();
      room.state.players.set(client.sessionId, player);

      const cat = [...room.state.townActors.values()].find((a) => a.kind === 'cat')!;
      const originalX = cat.x;
      const originalY = cat.y;

      // Position player next to the cat
      player.x = cat.x + 10;
      player.y = cat.y + 10;

      const pickup = handlers.get('town:cat:pickup')!;
      const putdown = handlers.get('town:cat:putdown')!;

      // 1. Pick up cat
      pickup(client, { id: cat.id });
      expect(cat.mode).toBe('carried');

      // 2. Player moves across town
      player.x = 800;
      player.y = 600;

      // Tick should update cat position to follow player
      (room as unknown as { tick(dt: number): void }).tick(50);
      expect(cat.x).toBe(800);
      expect(cat.y).toBe(600);

      // 3. Put down cat
      putdown(client, {});
      expect(cat.mode).toBe('roaming');
      expect(cat.x).toBe(800);
      expect(cat.y).toBe(604);

      // 4. Tick several times - cat must NOT jump back to original coordinates!
      for (let i = 0; i < 20; i++) {
        (room as unknown as { tick(dt: number): void }).tick(50);
      }
      expect(Math.hypot(cat.x - 800, cat.y - 604)).toBeLessThan(60);
      expect(Math.hypot(cat.x - originalX, cat.y - originalY)).toBeGreaterThan(100);

      // 5. Test player leave with carried cat
      player.x = cat.x + 5;
      player.y = cat.y + 5;
      pickup(client, { id: cat.id });
      expect(cat.mode).toBe('carried');

      await room.onLeave(client, true);
      // Cat should be dropped safely and back to roaming
      expect(cat.mode).toBe('roaming');
      expect(cat.x).toBe(player.x);
    } finally {
      room.onDispose();
    }
  });
});
