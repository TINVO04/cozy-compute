import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from 'colyseus.js';
import { Redis } from 'ioredis';
import type { MartialSnapshot } from '@cozy/game-data';
import { MartialRoom } from '../src/rooms/martial.js';
import { setDeps, type Deps } from '../src/rooms/base.js';

// Real sockets and Redis; isolated key namespace and deterministic test identities.
const prefix = 'smoke:' + randomUUID() + ':';
const url = process.env.MARTIAL_TEST_REDIS_URL ?? 'redis://127.0.0.1:6379';
const redis = new Redis(url);
const scoped = new Redis(url, { keyPrefix: prefix });
const persistence = new Proxy(scoped, {
  get(target, key) {
    if (key === 'eval')
      return (script: string, count: number, ...args: (string | number)[]) =>
        redis.eval(
          script.replaceAll("'martial:", "'" + prefix + 'martial:'),
          count,
          ...args.map((v, i) => (i < count ? prefix + v : v)),
        );
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
setDeps({
  redis: persistence,
  api: {
    session: async (token: string) => ({ userId: token, displayName: token, appearance: {}, muted: [] }),
    cave: async () => ({ weapon: 'crystal', resources: { stone: 0, iron: 0, crystal: 0 }, coin: 0 }),
  },
} as unknown as Deps);
const http = createServer();
const server = new Server({ transport: new WebSocketTransport({ server: http }), greet: false });
server.define('martial', MartialRoom);
const rooms: Room[] = [];
const snapshots = new Map<string, MartialSnapshot>();
const effects = new Map<string, number>();
const wait = async (predicate: () => boolean, timeout = 6000) => {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > end) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
};
try {
  await server.listen(0, '127.0.0.1');
  const address = http.address();
  assert(address && typeof address === 'object');
  const client = new Client('ws://127.0.0.1:' + address.port);
  await assert.rejects(client.joinOrCreate('martial', { token: 'intruder' }));
  for (const token of ['fighter-a', 'fighter-b']) {
    await scoped.set('martial:entry:' + token, '1', 'EX', 30);
    const room = await client.joinOrCreate('martial', { token });
    room.onMessage('martial:state', (s: MartialSnapshot) => snapshots.set(token, s));
    room.onMessage('martial:effect', () => effects.set(token, (effects.get(token) ?? 0) + 1));
    room.onMessage('*', () => {});
    rooms.push(room);
  }
  const [a, b] = rooms as [Room, Room];
  await wait(() => snapshots.get('fighter-a')?.fighters.length === 2);
  a.send('martial:action', { action: 'invite', target: b.sessionId });
  await wait(() => !!snapshots.get('fighter-b')?.invites.length);
  b.send('martial:action', { action: 'accept', target: a.sessionId });
  await wait(() => !!snapshots.get('fighter-a')?.match);
  await wait(() => Date.now() > snapshots.get('fighter-a')!.match!.startsAt);
  let seq = 0;
  const move = setInterval(() => a.send('input', { x: 1, y: 0, seq: ++seq }), 50);
  await new Promise((r) => setTimeout(r, 850));
  clearInterval(move);
  a.send('input', { x: 0, y: 0, seq: ++seq });
  await new Promise((r) => setTimeout(r, 200));
  a.send('martial:action', { action: 'cast', skill: 'slash' });
  await wait(() => (effects.get('fighter-a') ?? 0) >= 2 && (effects.get('fighter-b') ?? 0) >= 2);
  await wait(() => snapshots.get('fighter-a')!.fighters.some((f) => f.sid === b.sessionId && f.hp === 80));
  b.send('martial:action', { action: 'forfeit' });
  await wait(() => snapshots.get('fighter-a')?.rankings[0]?.rating === 1016);
  assert.equal(await scoped.hget('martial:wins', 'fighter-a'), '1');
  a.send('martial:action', { action: 'invite', target: b.sessionId });
  await wait(() => !!snapshots.get('fighter-b')?.invites.length);
  b.send('martial:action', { action: 'accept', target: a.sessionId });
  await wait(() => !!snapshots.get('fighter-a')?.match);
  await b.leave(true);
  rooms.splice(rooms.indexOf(b), 1);
  await wait(() => !snapshots.get('fighter-a')?.match);
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(await scoped.hget('martial:wins', 'fighter-a'), '1');
  assert.equal(await scoped.zscore('martial:ratings', 'fighter-a'), '1016');
  console.log(
    'PASS: ticket gate, two peers, authoritative hit, shared effects, Elo persistence, disconnect forfeit, repeat-pair limit.',
  );
} finally {
  for (const room of rooms) await room.leave(true).catch(() => {});
  await server.gracefullyShutdown(false);
  const keys = await redis.keys(prefix + '*');
  if (keys.length) await redis.del(...keys);
  await scoped.quit();
  await redis.quit();
}
