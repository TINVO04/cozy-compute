import type { FastifyBaseLogger } from 'fastify';
import type { Config } from './config.js';
import type { Db } from './db.js';
import type { Gateway } from './gateway.js';
import type { Redis } from './redis.js';

export interface PlayerPosition {
  room: string;
  x: number;
  y: number;
  at: number;
}

/** Authoritative position as last published by the realtime server. */
export type PositionLookup = (userId: string) => Promise<PlayerPosition | null>;

export interface AppContext {
  config: Config;
  db: Db;
  redis: Redis;
  gateway: Gateway;
  log: FastifyBaseLogger;
  positionOf: PositionLookup;
  now: () => Date;
  rng: () => number;
}
