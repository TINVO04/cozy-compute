import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from 'colyseus.js';
import { DEFAULT_APPEARANCE, BOATS } from '@cozy/game-data';
import type { Redis } from 'ioredis';
import { expect, it, vi } from 'vitest';
import type { ApiClient } from './api.js';
import { setDeps } from './rooms/base.js';
import { CompanyRoom } from './rooms/company.js';
import { OceanRoom } from './rooms/ocean.js';
import type { RoomState } from './schema.js';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

it('synchronizes ten simultaneous WebSocket peers and server-owned boat speed', async () => {
  setDeps({
    api: {
      session: async (token: string) => ({
        userId: token,
        displayName: token,
        role: 'player',
        statusText: '',
        fame: 0,
        appearance: { ...DEFAULT_APPEARANCE },
        muted: [],
      }),
    } as unknown as ApiClient,
    redis: { hset: vi.fn().mockResolvedValue(1), hdel: vi.fn().mockResolvedValue(1) } as unknown as Redis,
  });
  const http = createServer();
  const server = new Server({
    transport: new WebSocketTransport({ server: http }),
    greet: false,
    gracefullyShutdown: false,
  });
  server.define('company', CompanyRoom);
  server.define('ocean', OceanRoom);
  const rooms: Room<RoomState>[] = [];
  try {
    await server.listen(0, '127.0.0.1');
    const ws = `ws://127.0.0.1:${(http.address() as AddressInfo).port}`;
    // Create the room once, then join the remaining clients concurrently.
    const first = await new Client(ws).joinOrCreate<RoomState>('company', { token: 'peer0' });
    rooms.push(first);
    await Promise.all(
      Array.from({ length: 9 }, async (_, i) => {
        const room = await new Client(ws).joinById<RoomState>(first.roomId, { token: `peer${i + 1}` });
        rooms.push(room);
      }),
    );
    await expect.poll(() => rooms.every((room) => room.state?.players.size === 10)).toBe(true);
    const initial = rooms.map((room) => room.state.players.get(room.sessionId)!.x);
    const chat = vi.fn();
    rooms.forEach((room) => room.onMessage('chat', chat));
    rooms.forEach((room) => room.send('input', { x: 1, y: 0, seq: 1 }));
    rooms[0]!.send('chat', { text: 'Moving together' });
    await wait(700);
    rooms.forEach((room) => room.send('input', { x: 0, y: 0, seq: 2 }));
    await expect
      .poll(() =>
        rooms.every((room) => [...room.state.players.values()].every((p) => p.seq === 2 && !p.moving)),
      )
      .toBe(true);
    expect(chat).toHaveBeenCalledTimes(10);
    rooms.forEach((room, i) => {
      expect(room.state.players.get(room.sessionId)!.x - initial[i]!).toBeGreaterThan(30);
      first.state.players.forEach((player, sid) => {
        expect(room.state.players.get(sid)?.x).toBe(player.x);
        expect(room.state.players.get(sid)?.y).toBe(player.y);
      });
    });
    const ocean = await new Client(ws).joinOrCreate<RoomState>('ocean', { token: 'sailor' });
    rooms.push(ocean);
    await expect.poll(() => ocean.state?.players.get(ocean.sessionId)?.speed).toBe(BOATS.boat_coracle!.speed);
    // Authoritative appearance updates must affect both speed calculation and replication.
    const { matchMaker } = await import('@colyseus/core');
    const authoritative = matchMaker.getLocalRoomById(ocean.roomId) as OceanRoom;
    const boat = Object.values(BOATS).find((boat) => boat.speed !== BOATS.boat_coracle!.speed)!;
    authoritative.updateAppearance('sailor', { ...DEFAULT_APPEARANCE, boat: boat.id });
    await expect.poll(() => ocean.state.players.get(ocean.sessionId)?.speed).toBe(boat.speed);
  } finally {
    await Promise.all(rooms.map((room) => room.leave()));
    await server.gracefullyShutdown(false);
  }
}, 15000);
