import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { AppContext, PlayerPosition } from '../src/context.js';
import { createPool } from '../src/db.js';
import type { Gateway, GatewayKeyInfo, GatewayKeySpec, GatewayModelSpec } from '../src/gateway.js';
import { GatewayError } from '../src/gateway.js';
import { migrate } from '../src/migrate.js';
import { createRedis } from '../src/redis.js';
import { FakeMailer } from '../src/services/mailer.js';

export class FakeGateway implements Gateway {
  models = new Map<string, GatewayModelSpec>();
  keys = new Map<string, { spec: GatewayKeySpec; key: string; blocked: boolean; spendUsd: number }>();
  failNextGenerate = false;
  generateCalls = 0;

  async upsertModel(spec: GatewayModelSpec) {
    this.models.set(spec.id, spec);
  }
  async deleteModel(id: string) {
    this.models.delete(id);
  }
  async generateKey(spec: GatewayKeySpec) {
    this.generateCalls++;
    if (this.failNextGenerate) {
      this.failNextGenerate = false;
      throw new GatewayError('simulated outage', 503);
    }
    const token = randomUUID();
    const key = `sk-fake-${randomUUID().slice(0, 8)}`;
    this.keys.set(token, { spec, key, blocked: false, spendUsd: 0 });
    return { key, token };
  }
  async keyInfo(token: string): Promise<GatewayKeyInfo | null> {
    const k = this.keys.get(token);
    return k
      ? {
          spendUsd: k.spendUsd,
          maxBudgetUsd: k.spec.maxBudgetUsd,
          blocked: k.blocked,
          expires: k.spec.expiresAt.toISOString(),
        }
      : null;
  }
  async blockKey(token: string) {
    const k = this.keys.get(token);
    if (k) k.blocked = true;
  }
  async unblockKey(token: string) {
    const k = this.keys.get(token);
    if (k) k.blocked = false;
  }
  async deleteKey(token: string) {
    this.keys.delete(token);
  }
  async deleteKeyByAlias(alias: string) {
    for (const [t, k] of this.keys) if (k.spec.alias === alias) this.keys.delete(t);
  }
  async spendLogs() {
    return [];
  }
  async testModel() {
    return { ok: true, latencyMs: 1, message: 'ok' };
  }
  async health() {
    return true;
  }
}

export interface Harness {
  app: FastifyInstance;
  ctx: AppContext;
  gateway: FakeGateway;
  clock: { now: number };
  positions: Map<string, PlayerPosition>;
  rngQueue: number[];
  close: () => Promise<void>;
}

export async function createHarness(): Promise<Harness> {
  const env = { ...process.env };
  env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ?? 'postgres://cozy:cozy_dev_password@127.0.0.1:55432/cozy_test';
  env.REDIS_URL = (process.env.REDIS_URL ?? 'redis://127.0.0.1:56379') + '/5';
  env.INTERNAL_SECRET = 'test-internal-secret-123';
  env.LITELLM_MASTER_KEY = 'unused';
  env.ADMIN_EMAILS = 'admin@test.local';
  env.NODE_ENV = 'test';
  env.AUTH_RATE_LIMIT_PER_MIN = '10000';
  const config = loadConfig(env);
  const db = createPool(config.DATABASE_URL, 10);
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(db);
  const redis = createRedis(config.REDIS_URL);
  await redis.flushdb();
  const gateway = new FakeGateway();
  const mailer = new FakeMailer();
  const clock = { now: Date.now() };
  const positions = new Map<string, PlayerPosition>();
  const rngQueue: number[] = [];
  const { app, ctx } = await buildApp(
    {
      config,
      db,
      redis,
      gateway,
      mailer,
      now: () => new Date(clock.now),
      rng: () => (rngQueue.length ? rngQueue.shift()! : 0.5),
      positionOf: async (id) => positions.get(id) ?? null,
    },
    { logger: false },
  );
  await app.ready();
  return {
    app,
    ctx,
    gateway,
    clock,
    positions,
    rngQueue,
    close: async () => {
      await app.close();
      await db.end();
      redis.disconnect();
    },
  };
}

// The harness intentionally leaves response payloads structurally untyped so tests can exercise
// the same JSON shapes as the HTTP boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(
  h: Harness,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: T }> {
  const res = await h.app.inject({
    method,
    url,
    payload: opts.body as object | undefined,
    headers: { ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}), ...(opts.headers ?? {}) },
  });
  return { status: res.statusCode, body: res.body ? (JSON.parse(res.body) as T) : (undefined as T) };
}

let counter = 0;
export async function register(h: Harness, email?: string) {
  counter++;
  const e = email ?? `player${counter}-${Date.now()}@test.local`;
  const res = await api<{ token: string; user: { id: string } }>(h, 'POST', '/auth/register', {
    body: {
      email: e,
      password: 'correct horse battery',
      displayName: `Player${counter}x${Math.floor(Math.random() * 1e4)}`,
    },
  });
  if (res.status !== 200) throw new Error(`register failed ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, id: res.body.user.id, email: e };
}

/** Makes a player eligible for AI redemption and gives them Coin, bypassing gameplay for test setup. */
export async function makeEligible(h: Harness, userId: string, coin = 100_000) {
  const db = h.ctx.db;
  await db.query(
    `UPDATE users SET created_at = now() - interval '10 days', onboarding_completed_at = now() WHERE id = $1`,
    [userId],
  );
  await db.query(`UPDATE profiles SET fame = 500 WHERE user_id = $1`, [userId]);
  for (const slug of ['fishing', 'delivery', 'cafe']) {
    await db.query(
      `INSERT INTO activity_runs (user_id, activity_slug, nonce, state, status, expires_at, completed_at) VALUES ($1, $2, 'x', '{}', 'completed', now(), now() - interval '5 days')`,
      [userId, slug],
    );
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { postLedger } = await import('../src/ledger.js');
    await postLedger(client, { userId, currency: 'coin', amount: coin, reason: 'test_grant' });
    await client.query('COMMIT');
  } finally {
    client.release();
  }
}

export async function createModel(h: Harness, adminToken: string, overrides: Record<string, unknown> = {}) {
  const res = await api(h, 'POST', '/admin/models', {
    token: adminToken,
    body: {
      slug: 'creator-pro',
      displayName: 'Creator Pro',
      publicModelName: 'creator-pro',
      upstreamModelName: 'my-model',
      upstreamBaseUrl: 'https://upstream.example/v1',
      secretRef: 'UPSTREAM_KEY_1',
      enabled: true,
      creditMultiplier: 1,
      inputCostPerMtok: 1,
      outputCostPerMtok: 2,
      rpm: 20,
      tpm: 60000,
      ...overrides,
    },
  });
  if (res.status !== 200) throw new Error(`model create failed ${JSON.stringify(res.body)}`);
  return res.body as { id: string; publicModelName: string };
}
