import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import type { PlayerPosition } from './context.js';
import { createPool } from './db.js';
import { LiteLLMGateway } from './gateway.js';
import { startJobs } from './jobs.js';
import { migrate } from './migrate.js';
import { createRedis } from './redis.js';
import { NodemailerService } from './services/mailer.js';

const config = loadConfig();
const db = createPool(config.DATABASE_URL, 20);
const redis = createRedis(config.REDIS_URL);
const gateway = new LiteLLMGateway(config.LITELLM_URL, config.LITELLM_MASTER_KEY);
const mailer = new NodemailerService(config);

const { app, ctx } = await buildApp({
  config,
  db,
  redis,
  gateway,
  mailer,
  now: () => new Date(),
  rng: Math.random,
  positionOf: async (userId) => {
    const raw = await redis.hget('positions', userId);
    return raw ? (JSON.parse(raw) as PlayerPosition) : null;
  },
});

await migrate(db, (m) => app.log.info(m));
const stopJobs = config.JOBS_ENABLED ? startJobs(ctx) : () => undefined;

await app.listen({ port: config.API_PORT, host: config.API_HOST });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  stopJobs();
  await app.close();
  await db.end();
  redis.disconnect();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
