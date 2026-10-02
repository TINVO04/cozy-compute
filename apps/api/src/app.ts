import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { authHook } from './auth.js';
import type { AppContext } from './context.js';
import { AppError } from './errors.js';
import { metrics } from './metrics.js';
import { adminRoutes } from './routes/admin.js';
import { farmRoutes } from './routes/farm.js';
import { internalRoutes } from './routes/internal.js';
import { playerRoutes } from './routes/player.js';

export async function buildApp(
  ctx: Omit<AppContext, 'log'>,
  opts: { logger?: boolean } = {},
): Promise<{ app: FastifyInstance; ctx: AppContext }> {
  const app = Fastify({
    logger:
      opts.logger === false
        ? false
        : {
            level: ctx.config.LOG_LEVEL,
            redact: ['req.headers.authorization', 'req.headers["x-internal-secret"]'],
          },
    genReqId: (req) =>
      typeof req.headers['x-request-id'] === 'string'
        ? req.headers['x-request-id'].slice(0, 64)
        : crypto.randomUUID(),
    trustProxy: true,
    bodyLimit: 256 * 1024,
  });
  const full: AppContext = { ...ctx, log: app.log };

  const isOriginAllowed = (origin?: string): boolean => {
    if (!origin) return true;
    if (ctx.config.corsOrigins.includes(origin)) return true;
    if (ctx.config.NODE_ENV !== 'production') {
      try {
        const u = new URL(origin);
        const host = u.hostname;
        return (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host.startsWith('192.168.') ||
          host.startsWith('10.') ||
          host.startsWith('172.') ||
          host.endsWith('.local')
        );
      } catch {
        return false;
      }
    }
    return false;
  };

  await app.register(cors, {
    origin: (origin, cb) => cb(null, isOriginAllowed(origin)),
    credentials: false,
    allowedHeaders: ['content-type', 'authorization', 'idempotency-key', 'x-request-id'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    redis: ctx.redis,
    nameSpace: 'rl:api:',
    keyGenerator: (req) => req.user?.id ?? req.ip,
    errorResponseBuilder: (_req, context) =>
      new AppError(
        429,
        'rate_limited',
        `Slow down a little — try again in ${Math.ceil(context.ttl / 1000)}s.`,
      ),
  });

  app.addHook('onRequest', authHook(ctx.db));
  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
    reply.header('x-content-type-options', 'nosniff');
    reply.header('cache-control', 'no-store');
  });
  app.addHook('onResponse', async (req, reply) => {
    metrics.inc('http_requests_total', {
      route: req.routeOptions.url ?? 'unknown',
      status: String(reply.statusCode),
    });
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply
        .status(err.status)
        .send({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err instanceof ZodError) {
      const first = err.issues[0];
      const field = first?.path.join('.') ?? '';
      return reply.status(400).send({
        error: {
          code: 'validation',
          message: first ? `${field ? field + ': ' : ''}${first.message}` : 'Invalid request.',
          details: err.issues,
        },
      });
    }
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode && e.statusCode < 500) {
      return reply
        .status(e.statusCode)
        .send({ error: { code: 'bad_request', message: e.message ?? 'Bad request.' } });
    }
    req.log.error({ err }, 'unhandled error');
    return reply
      .status(500)
      .send({ error: { code: 'internal', message: 'Something went wrong on our side. Please try again.' } });
  });

  app.get('/healthz', async () => ({ ok: true }));
  app.get('/readyz', async (_req, reply) => {
    const checks = { db: false, redis: false, gateway: false };
    try {
      await ctx.db.query('SELECT 1');
      checks.db = true;
    } catch {
      /* reported below */
    }
    try {
      checks.redis = (await ctx.redis.ping()) === 'PONG';
    } catch {
      /* reported below */
    }
    checks.gateway = await ctx.gateway.health();
    // The gateway is not required for gameplay; report it without failing readiness.
    const ready = checks.db && checks.redis;
    return reply.status(ready ? 200 : 503).send({ ready, checks });
  });
  app.get('/metrics', async (req, reply) => {
    const ip = req.ip;
    const allowed =
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('172.') ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.');
    if (!allowed) return reply.status(404).send();
    reply.header('content-type', 'text/plain; version=0.0.4');
    return metrics.render();
  });

  playerRoutes(app, full);
  adminRoutes(app, full);
  internalRoutes(app, full);
  farmRoutes(app, full);
  return { app, ctx: full };
}
