import { createServer } from 'node:http';
import { matchMaker, Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Redis } from 'ioredis';
import { ApiClient } from './api.js';
import { ApartmentRoom } from './rooms/apartment.js';
import { setDeps, setLatestWeather, type BaseRoom } from './rooms/base.js';
import { CompanyRoom } from './rooms/company.js';
import { ComGaRoom } from './rooms/comga.js';
import { CyberNetRoom } from './rooms/cybernet.js';
import { FarmRoom } from './rooms/farm.js';
import { BidaRoom } from './rooms/bida.js';
import { OceanRoom } from './rooms/ocean.js';
import { TownRoom } from './rooms/town.js';
import { ShowroomRoom } from './rooms/showroom.js';
import { MartialRoom } from './rooms/martial.js';
import { CaveRoom } from './rooms/cave.js';
import { UniversityRoom } from './rooms/university.js';

const PORT = Number(process.env.REALTIME_PORT ?? 2567);
const HOST = process.env.REALTIME_HOST ?? '0.0.0.0';
const API = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8787';
const SECRET = process.env.INTERNAL_SECRET;
const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
if (!SECRET) throw new Error('INTERNAL_SECRET is required');

const log = (level: 'info' | 'warn' | 'error', msg: string, extra: Record<string, unknown> = {}) =>
  process.stdout.write(
    JSON.stringify({ level, time: new Date().toISOString(), service: 'realtime', msg, ...extra }) + '\n',
  );

const redis = new Redis(REDIS_URL);
const sub = new Redis(REDIS_URL);
setDeps({ api: new ApiClient(API, SECRET), redis });

redis
  .get('world:weather')
  .then((raw) => {
    if (raw) {
      try {
        setLatestWeather(JSON.parse(raw));
      } catch {
        // ignore malformed
      }
    }
  })
  .catch(() => undefined);

const http = createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url === '/readyz') {
    redis
      .ping()
      .then(() => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ready: true }));
      })
      .catch(() => {
        res.writeHead(503);
        res.end(JSON.stringify({ ready: false }));
      });
    return;
  }
  if (req.url === '/metrics') {
    const rooms = matchMaker.stats.local;
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(
      `# TYPE cozy_realtime_rooms gauge\ncozy_realtime_rooms ${rooms.roomCount}\n# TYPE cozy_realtime_clients gauge\ncozy_realtime_clients ${rooms.ccu}\n`,
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const gameServer = new Server({
  transport: new WebSocketTransport({ server: http, maxPayload: 4 * 1024 }),
  greet: false,
});
gameServer.define('town', TownRoom);
gameServer.define('showroom', ShowroomRoom);
gameServer.define('martial', MartialRoom);
gameServer.define('cave', CaveRoom).filterBy(['ownerId']);
gameServer.define('apartment', ApartmentRoom).filterBy(['ownerId']);
gameServer.define('company', CompanyRoom);
gameServer.define('university', UniversityRoom);
gameServer.define('comga', ComGaRoom);
gameServer.define('bida', BidaRoom);
gameServer.define('cybernet', CyberNetRoom);
gameServer.define('farm', FarmRoom).filterBy(['ownerId']);
gameServer.define('ocean', OceanRoom);

await sub.subscribe(
  'player:appearance',
  'player:kick',
  'apartment:updated',
  'events',
  'farm:updated',
  'weather:updated',
);
sub.on('message', async (channel, raw) => {
  try {
    if (channel === 'weather:updated') {
      const weather = JSON.parse(raw);
      setLatestWeather(weather);
      const rooms = await matchMaker.query({});
      for (const cached of rooms) {
        const room = matchMaker.getLocalRoomById(cached.roomId) as unknown as BaseRoom | undefined;
        if (room) {
          if (room instanceof TownRoom) room.setWeather(weather);
          room.broadcast('weather:updated', weather);
        }
      }
      return;
    }
    const msg = JSON.parse(raw) as {
      userId?: string;
      ownerId?: string;
      appearance?: unknown;
      statusText?: string;
      reason?: string;
    };
    const rooms = await matchMaker.query({});
    for (const cached of rooms) {
      const room = matchMaker.getLocalRoomById(cached.roomId) as unknown as BaseRoom | undefined;
      if (!room) continue;
      if (channel === 'player:appearance' && msg.userId)
        room.updateAppearance(msg.userId, msg.appearance, msg.statusText);
      if (channel === 'player:kick' && msg.userId) room.kick(msg.userId, msg.reason);
      if (channel === 'apartment:updated' && room instanceof ApartmentRoom && room.owner === msg.ownerId)
        await room.reloadLayout();
      if (channel === 'farm:updated' && room instanceof FarmRoom && room.owner === msg.ownerId)
        room.broadcast('farm:updated', { ownerId: msg.ownerId, updatedAt: Date.now() });
      if (channel === 'events' && room instanceof TownRoom) await room.syncEvent();
    }
  } catch (err) {
    log('error', 'pubsub handler failed', { channel, err: String(err) });
  }
});

await gameServer.listen(PORT, HOST);
log('info', 'realtime listening', { port: PORT });

const shutdown = async () => {
  log('info', 'shutting down');
  await gameServer.gracefullyShutdown(false);
  redis.disconnect();
  sub.disconnect();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
