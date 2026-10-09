import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../auth.js';
import type { AppContext } from '../context.js';
import { withTx } from '../db.js';
import { postLedger } from '../ledger.js';
import { AppError, badRequest, forbidden, notFound } from '../errors.js';
import * as ai from '../services/ai.js';
import { audit } from '../services/audit.js';
import { scheduleNext, finishEvent } from '../services/events.js';
import { getSetting, settingSchema, type SettingKey } from '../settings.js';
import { getPresence } from '../redis.js';
import { FISH } from '@cozy/game-data';

const SECRET_REF = /^UPSTREAM_KEY_[A-Z0-9_]{1,40}$/;

const modelInput = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,40}$/, 'Lowercase letters, numbers and dashes.'),
  displayName: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).default(''),
  publicModelName: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9._-]{1,60}$/, 'Lowercase model alias, e.g. creator-pro.'),
  upstreamProvider: z
    .enum(['openai', 'hosted_vllm', 'azure', 'anthropic', 'gemini', 'ollama'])
    .default('openai'),
  upstreamModelName: z.string().trim().min(1).max(200),
  upstreamBaseUrl: z.string().trim().url().max(300),
  secretRef: z
    .string()
    .trim()
    .regex(SECRET_REF, 'Must be the name of an UPSTREAM_KEY_* variable configured on the gateway.'),
  enabled: z.boolean(),
  allowExternalUse: z.boolean().default(true),
  creditMultiplier: z.number().positive().max(1000),
  inputCostPerMtok: z.number().min(0).max(100000),
  outputCostPerMtok: z.number().min(0).max(100000),
  rpm: z.number().int().positive().max(100000),
  tpm: z.number().int().positive().max(100_000_000),
  contextLimit: z.number().int().positive().nullable().default(null),
  userMonthlyBudgetCents: z.number().int().nonnegative().nullable().default(null),
});

function adminModel(m: ai.ModelRow) {
  return {
    id: m.id,
    slug: m.slug,
    displayName: m.display_name,
    description: m.description,
    publicModelName: m.public_model_name,
    upstreamProvider: m.upstream_provider,
    upstreamModelName: m.upstream_model_name,
    upstreamBaseUrl: m.upstream_base_url,
    secretRef: m.secret_ref,
    enabled: m.enabled,
    allowExternalUse: m.allow_external_use,
    creditMultiplier: m.credit_multiplier,
    inputCostPerMtok: m.input_cost_per_mtok,
    outputCostPerMtok: m.output_cost_per_mtok,
    rpm: m.rpm,
    tpm: m.tpm,
    contextLimit: m.context_limit,
    userMonthlyBudgetCents: m.user_monthly_budget_cents,
    gatewaySyncedAt: m.gateway_synced_at?.toISOString() ?? null,
    updatedAt: m.updated_at.toISOString(),
  };
}

async function syncModelToGateway(ctx: AppContext, m: ai.ModelRow) {
  try {
    if (m.enabled) {
      await ctx.gateway.upsertModel({
        id: m.id,
        publicName: m.public_model_name,
        provider: m.upstream_provider,
        upstreamModel: m.upstream_model_name,
        upstreamBaseUrl: m.upstream_base_url,
        secretRef: m.secret_ref,
        rpm: m.rpm,
        tpm: m.tpm,
        inputCostPerMtok: m.input_cost_per_mtok,
        outputCostPerMtok: m.output_cost_per_mtok,
        contextLimit: m.context_limit,
      });
    } else {
      // Disabled models are removed from the gateway so no key can reach them.
      await ctx.gateway.deleteModel(m.id);
    }
    await ctx.db.query('UPDATE model_deployments SET gateway_synced_at = now() WHERE id = $1', [m.id]);
  } catch (err) {
    ctx.log.error({ err, modelId: m.id }, 'model gateway sync failed');
    await ctx.db.query('UPDATE model_deployments SET gateway_synced_at = NULL WHERE id = $1', [m.id]);
    throw new AppError(
      502,
      'gateway_sync_failed',
      'Saved, but the AI gateway could not be updated. Use "Retry sync" once the gateway is reachable.',
    );
  }
}

export function adminRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get('/admin/server', async (req) => {
    requireAdmin(req);
    const checks = await Promise.allSettled([
      ctx.db.query('SELECT 1'),
      ctx.redis.ping(),
      ctx.gateway.health(),
    ]);
    const database = checks[0].status === 'fulfilled';
    const redis = checks[1].status === 'fulfilled';
    const gateway = checks[2].status === 'fulfilled' && checks[2].value === true;
    return {
      status: database && redis && gateway ? 'healthy' : 'degraded',
      checkedAt: ctx.now().toISOString(),
      process: {
        pid: process.pid,
        node: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        environment: ctx.config.NODE_ENV,
      },
      services: { database, redis, gateway },
      runtime: {
        apiPort: ctx.config.API_PORT,
        jobsEnabled: ctx.config.JOBS_ENABLED,
        publicGatewayUrl: ctx.config.PUBLIC_GATEWAY_URL,
        corsOrigins: ctx.config.corsOrigins,
      },
    };
  });

  app.get('/admin/overview', async (req) => {
    requireAdmin(req);
    const policy = await getSetting(ctx.db, 'ai_policy');
    const pool = await ai.poolStatus(ctx.db, policy, ctx.now());
    const stats = await ctx.db.query<{
      players: number;
      new_today: number;
      active_keys: number;
      open_flags: number;
      open_reports: number;
      coin_issued_today: number;
      coin_burned_today: number;
      spend_cents: number;
    }>(
      `SELECT (SELECT count(*)::int FROM users) AS players,
              (SELECT count(*)::int FROM users WHERE created_at > now() - interval '1 day') AS new_today,
              (SELECT count(*)::int FROM player_ai_keys WHERE status = 'active') AS active_keys,
              (SELECT count(*)::int FROM abuse_flags WHERE status = 'open') AS open_flags,
              (SELECT count(*)::int FROM reports WHERE status = 'open') AS open_reports,
              (SELECT coalesce(sum(amount), 0)::bigint FROM ledger_entries WHERE currency = 'coin' AND amount > 0 AND created_at > now() - interval '1 day') AS coin_issued_today,
              (SELECT coalesce(-sum(amount), 0)::bigint FROM ledger_entries WHERE currency = 'coin' AND amount < 0 AND created_at > now() - interval '1 day') AS coin_burned_today,
              (SELECT coalesce(sum(spend_cents), 0)::float FROM player_ai_keys) AS spend_cents`,
    );
    const redemptions = await ctx.db.query<{ kind: string; status: string; n: number }>(
      `SELECT kind, status, count(*)::int AS n FROM ai_redemptions WHERE created_at > now() - interval '7 days' GROUP BY kind, status`,
    );
    const online = await ctx.redis.hlen('presence:online');
    return {
      policy,
      pool,
      stats: stats.rows[0],
      redemptions: redemptions.rows,
      online,
      gatewayHealthy: await ctx.gateway.health(),
    };
  });

  // ---------------------------------------------------------------- models
  app.get('/admin/models', async (req) => {
    requireAdmin(req);
    const r = await ctx.db.query<ai.ModelRow>('SELECT * FROM model_deployments ORDER BY created_at');
    return r.rows.map(adminModel);
  });

  app.post('/admin/models', async (req) => {
    const admin = requireAdmin(req);
    const b = modelInput.parse(req.body);
    const created = await withTx(ctx.db, async (tx) => {
      const r = await tx
        .query<ai.ModelRow>(
          `INSERT INTO model_deployments (slug, display_name, description, public_model_name, upstream_provider, upstream_model_name,
           upstream_base_url, secret_ref, enabled, allow_external_use, credit_multiplier, input_cost_per_mtok, output_cost_per_mtok,
           rpm, tpm, context_limit, user_monthly_budget_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
          [
            b.slug,
            b.displayName,
            b.description,
            b.publicModelName,
            b.upstreamProvider,
            b.upstreamModelName,
            b.upstreamBaseUrl,
            b.secretRef,
            b.enabled,
            b.allowExternalUse,
            b.creditMultiplier,
            b.inputCostPerMtok,
            b.outputCostPerMtok,
            b.rpm,
            b.tpm,
            b.contextLimit,
            b.userMonthlyBudgetCents,
          ],
        )
        .catch((err: { code?: string }) => {
          if (err.code === '23505')
            throw badRequest('duplicate', 'A model with that slug or public name already exists.');
          throw err;
        });
      await audit(
        tx,
        admin.id,
        'model.create',
        'model_deployment',
        r.rows[0]!.id,
        null,
        adminModel(r.rows[0]!),
      );
      return r.rows[0]!;
    });
    await syncModelToGateway(ctx, created);
    return adminModel(created);
  });

  app.put('/admin/models/:id', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const b = modelInput.parse(req.body);
    const after = await withTx(ctx.db, async (tx) => {
      const prev = await tx.query<ai.ModelRow>('SELECT * FROM model_deployments WHERE id = $1 FOR UPDATE', [
        id,
      ]);
      if (!prev.rows[0]) throw notFound('Model not found.');
      const r = await tx.query<ai.ModelRow>(
        `UPDATE model_deployments SET slug=$2, display_name=$3, description=$4, public_model_name=$5, upstream_provider=$6,
           upstream_model_name=$7, upstream_base_url=$8, secret_ref=$9, enabled=$10, allow_external_use=$11, credit_multiplier=$12,
           input_cost_per_mtok=$13, output_cost_per_mtok=$14, rpm=$15, tpm=$16, context_limit=$17, user_monthly_budget_cents=$18,
           updated_at = now()
         WHERE id = $1 RETURNING *`,
        [
          id,
          b.slug,
          b.displayName,
          b.description,
          b.publicModelName,
          b.upstreamProvider,
          b.upstreamModelName,
          b.upstreamBaseUrl,
          b.secretRef,
          b.enabled,
          b.allowExternalUse,
          b.creditMultiplier,
          b.inputCostPerMtok,
          b.outputCostPerMtok,
          b.rpm,
          b.tpm,
          b.contextLimit,
          b.userMonthlyBudgetCents,
        ],
      );
      if (prev.rows[0].public_model_name !== b.publicModelName) {
        const keys = await tx.query(
          "SELECT 1 FROM player_ai_keys WHERE allowed_models ? $1 AND status IN ('active', 'suspended') LIMIT 1",
          [id],
        );
        if (keys.rowCount)
          throw badRequest(
            'alias_in_use',
            'Players hold active keys for this alias. Create a new model instead of renaming.',
          );
      }
      await audit(
        tx,
        admin.id,
        'model.update',
        'model_deployment',
        id,
        adminModel(prev.rows[0]),
        adminModel(r.rows[0]!),
      );
      return r.rows[0]!;
    });
    await syncModelToGateway(ctx, after);
    return adminModel(after);
  });

  app.post('/admin/models/:id/sync', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const r = await ctx.db.query<ai.ModelRow>('SELECT * FROM model_deployments WHERE id = $1', [id]);
    if (!r.rows[0]) throw notFound('Model not found.');
    await syncModelToGateway(ctx, r.rows[0]);
    await audit(ctx.db, admin.id, 'model.sync', 'model_deployment', id, null, null);
    return { ok: true };
  });

  app.post('/admin/models/:id/test', async (req) => {
    requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const r = await ctx.db.query<ai.ModelRow>('SELECT * FROM model_deployments WHERE id = $1', [id]);
    const m = r.rows[0];
    if (!m) throw notFound('Model not found.');
    if (!m.enabled)
      return { ok: false, latencyMs: 0, message: 'Enable the model to test it through the gateway.' };
    return ctx.gateway.testModel(m.public_model_name);
  });

  // ---------------------------------------------------------------- settings
  app.get('/admin/settings', async (req) => {
    requireAdmin(req);
    return {
      ai_policy: await getSetting(ctx.db, 'ai_policy'),
      event_schedule: await getSetting(ctx.db, 'event_schedule'),
    };
  });

  app.put('/admin/settings/:key', async (req) => {
    const admin = requireAdmin(req);
    const { key } = z.object({ key: z.enum(['ai_policy', 'event_schedule']) }).parse(req.params);
    const value = settingSchema(key as SettingKey).parse(req.body);
    await withTx(ctx.db, async (tx) => {
      const before = await getSetting(tx, key);
      await tx.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
        [key, JSON.stringify(value)],
      );
      const b = before as Record<string, unknown>;
      const a = value as Record<string, unknown>;
      const action =
        key === 'ai_policy' && b.redemptionsPaused !== a.redemptionsPaused
          ? a.redemptionsPaused
            ? 'redemptions.pause'
            : 'redemptions.resume'
          : `settings.${key}.update`;
      await audit(tx, admin.id, action, 'settings', key, before, value);
    });
    return value;
  });

  app.get('/admin/activities', async (req) => {
    requireAdmin(req);
    const r = await ctx.db.query<{ slug: string; type: string; config: unknown; enabled: boolean }>(
      'SELECT slug, type, config, enabled FROM activities ORDER BY slug',
    );
    return r.rows;
  });

  app.put('/admin/activities/:slug', async (req) => {
    const admin = requireAdmin(req);
    const { slug } = z.object({ slug: z.string().max(40) }).parse(req.params);
    const b = z
      .object({
        enabled: z.boolean(),
        config: z.record(z.string(), z.union([z.number().min(0), z.array(z.number().min(0))])),
      })
      .parse(req.body);
    await withTx(ctx.db, async (tx) => {
      const prev = await tx.query<{ config: Record<string, unknown>; enabled: boolean }>(
        'SELECT config, enabled FROM activities WHERE slug = $1 FOR UPDATE',
        [slug],
      );
      const p = prev.rows[0];
      if (!p) throw notFound('Activity not found.');
      const unknownKeys = Object.keys(b.config).filter((k) => !(k in p.config));
      if (unknownKeys.length)
        throw badRequest('unknown_keys', `Unknown config keys: ${unknownKeys.join(', ')}`);
      const config = { ...p.config, ...b.config };
      await tx.query('UPDATE activities SET config = $2, enabled = $3 WHERE slug = $1', [
        slug,
        JSON.stringify(config),
        b.enabled,
      ]);
      await audit(tx, admin.id, 'activity.update', 'activity', slug, p, { config, enabled: b.enabled });
    });
    return { ok: true };
  });

  function parseFishOverrides(raw: unknown): Record<string, { minSizeCm: number; maxSizeCm: number }> {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
      } catch {
        return {};
      }
    }
    return typeof raw === 'object' && raw !== null
      ? (raw as Record<string, { minSizeCm: number; maxSizeCm: number }>)
      : {};
  }

  app.get('/admin/fish', async (req) => {
    requireAdmin(req);
    const r = await ctx.db.query<{ value: unknown }>(`SELECT value FROM settings WHERE key = 'fish_sizes'`);
    const overrides = parseFishOverrides(r.rows[0]?.value);
    return FISH.map((f) => {
      const o = overrides[f.id];
      return {
        ...f,
        minSizeCm: o?.minSizeCm ?? f.minSizeCm,
        maxSizeCm: o?.maxSizeCm ?? f.maxSizeCm,
        defaultMinSizeCm: f.minSizeCm,
        defaultMaxSizeCm: f.maxSizeCm,
        isOverridden: Boolean(o),
      };
    });
  });

  app.put('/admin/fish/:id/size', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().max(60) }).parse(req.params);
    const b = z
      .object({
        minSizeCm: z.number().positive().max(10000),
        maxSizeCm: z.number().positive().max(10000),
      })
      .refine((data) => data.maxSizeCm >= data.minSizeCm, {
        message: 'maxSizeCm must be greater than or equal to minSizeCm',
      })
      .parse(req.body);

    const baseFish = FISH.find((f) => f.id === id);
    if (!baseFish) throw notFound('Fish species not found.');

    return withTx(ctx.db, async (tx) => {
      const r = await tx.query<{ value: unknown }>(
        `SELECT value FROM settings WHERE key = 'fish_sizes' FOR UPDATE`,
      );
      const current = parseFishOverrides(r.rows[0]?.value);
      const updated = {
        ...current,
        [id]: { minSizeCm: b.minSizeCm, maxSizeCm: b.maxSizeCm },
      };

      await tx.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ('fish_sizes', $1, now())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
        [JSON.stringify(updated)],
      );

      await audit(tx, admin.id, 'fish_size.update', 'fish_species', id, current[id] ?? null, b);

      return {
        ...baseFish,
        minSizeCm: b.minSizeCm,
        maxSizeCm: b.maxSizeCm,
        defaultMinSizeCm: baseFish.minSizeCm,
        defaultMaxSizeCm: baseFish.maxSizeCm,
        isOverridden: true,
      };
    });
  });

  app.delete('/admin/fish/:id/size', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().max(60) }).parse(req.params);
    const baseFish = FISH.find((f) => f.id === id);
    if (!baseFish) throw notFound('Fish species not found.');

    return withTx(ctx.db, async (tx) => {
      const r = await tx.query<{ value: unknown }>(
        `SELECT value FROM settings WHERE key = 'fish_sizes' FOR UPDATE`,
      );
      const current = parseFishOverrides(r.rows[0]?.value);
      const prev = current[id];
      const updated = { ...current };
      delete updated[id];

      await tx.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ('fish_sizes', $1, now())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
        [JSON.stringify(updated)],
      );

      await audit(tx, admin.id, 'fish_size.reset', 'fish_species', id, prev ?? null, null);

      return {
        ...baseFish,
        minSizeCm: baseFish.minSizeCm,
        maxSizeCm: baseFish.maxSizeCm,
        defaultMinSizeCm: baseFish.minSizeCm,
        defaultMaxSizeCm: baseFish.maxSizeCm,
        isOverridden: false,
      };
    });
  });

  app.put('/admin/fish/batch-size', async (req) => {
    const admin = requireAdmin(req);
    const b = z
      .object({
        updates: z
          .array(
            z
              .object({
                id: z.string().max(60),
                minSizeCm: z.number().positive().max(10000),
                maxSizeCm: z.number().positive().max(10000),
              })
              .refine((data) => data.maxSizeCm >= data.minSizeCm, {
                message: 'maxSizeCm must be greater than or equal to minSizeCm',
              }),
          )
          .min(1)
          .max(200),
      })
      .parse(req.body);

    for (const u of b.updates) {
      if (!FISH.some((f) => f.id === u.id)) {
        throw badRequest('invalid_species', `Unknown fish species ID: ${u.id}`);
      }
    }

    return withTx(ctx.db, async (tx) => {
      const r = await tx.query<{ value: unknown }>(
        `SELECT value FROM settings WHERE key = 'fish_sizes' FOR UPDATE`,
      );
      const current = parseFishOverrides(r.rows[0]?.value);
      const updated = { ...current };
      for (const u of b.updates) {
        updated[u.id] = { minSizeCm: u.minSizeCm, maxSizeCm: u.maxSizeCm };
      }

      await tx.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ('fish_sizes', $1, now())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
        [JSON.stringify(updated)],
      );

      await audit(tx, admin.id, 'fish_size.batch_update', 'fish_species', 'batch', null, {
        count: b.updates.length,
        speciesIds: b.updates.map((u) => u.id),
      });

      return FISH.map((f) => {
        const o = updated[f.id];
        return {
          ...f,
          minSizeCm: o?.minSizeCm ?? f.minSizeCm,
          maxSizeCm: o?.maxSizeCm ?? f.maxSizeCm,
          defaultMinSizeCm: f.minSizeCm,
          defaultMaxSizeCm: f.maxSizeCm,
          isOverridden: Boolean(o),
        };
      });
    });
  });

  app.post('/admin/fish/batch-reset', async (req) => {
    const admin = requireAdmin(req);
    const b = z
      .object({
        ids: z.array(z.string().max(60)).min(1).max(200),
      })
      .parse(req.body);

    return withTx(ctx.db, async (tx) => {
      const r = await tx.query<{ value: unknown }>(
        `SELECT value FROM settings WHERE key = 'fish_sizes' FOR UPDATE`,
      );
      const current = parseFishOverrides(r.rows[0]?.value);
      const updated = { ...current };
      for (const id of b.ids) {
        delete updated[id];
      }

      await tx.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ('fish_sizes', $1, now())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
        [JSON.stringify(updated)],
      );

      await audit(tx, admin.id, 'fish_size.batch_reset', 'fish_species', 'batch', null, {
        count: b.ids.length,
        speciesIds: b.ids,
      });

      return FISH.map((f) => {
        const o = updated[f.id];
        return {
          ...f,
          minSizeCm: o?.minSizeCm ?? f.minSizeCm,
          maxSizeCm: o?.maxSizeCm ?? f.maxSizeCm,
          defaultMinSizeCm: f.minSizeCm,
          defaultMaxSizeCm: f.maxSizeCm,
          isOverridden: Boolean(o),
        };
      });
    });
  });

  app.post('/admin/events/schedule', async (req) => {
    const admin = requireAdmin(req);
    const b = z.object({ startInSeconds: z.number().int().min(10).max(3600) }).parse(req.body);
    const ev = await scheduleNext(ctx, b.startInSeconds * 1000);
    if (!ev) throw badRequest('event_open', 'An event is already scheduled or running.');
    await audit(ctx.db, admin.id, 'event.schedule', 'event', ev.id, null, { startsAt: ev.starts_at });
    return { id: ev.id, startsAt: ev.starts_at.toISOString() };
  });

  app.post('/admin/events/:id/finish', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await finishEvent(ctx, id);
    await audit(ctx.db, admin.id, 'event.finish', 'event', id, null, null);
    return { ok: true };
  });

  // ---------------------------------------------------------------- players, keys, ledger
  app.get('/admin/players', async (req) => {
    requireAdmin(req);
    const q = z.object({ q: z.string().trim().max(100).default('') }).parse(req.query);
    const r = await ctx.db.query<{
      id: string;
      email: string;
      display_name: string;
      role: string;
      status: string;
      trust_score: number;
      coin: number;
      fame: number;
      ai_credit_cents: number;
      created_at: Date;
      last_login_at: Date | null;
      email_verified: boolean;
      email_verified_at: Date | null;
    }>(
      `SELECT u.id, u.email, p.display_name, u.role, u.status, u.trust_score, b.coin, p.fame, b.ai_credit_cents, u.created_at, u.last_login_at,
              coalesce(u.email_verified, true) AS email_verified, u.email_verified_at
         FROM users u JOIN profiles p ON p.user_id = u.id JOIN balances b ON b.user_id = u.id
        WHERE $1 = '' OR u.email ILIKE '%' || $1 || '%' OR p.display_name ILIKE '%' || $1 || '%' OR u.id::text = $1
        ORDER BY u.created_at DESC LIMIT 50`,
      [q.q],
    );
    const presence = await getPresence(
      ctx.redis,
      r.rows.map((u) => u.id),
    );
    return r.rows.map((u) => {
      const pres = presence.get(u.id);
      return {
        ...u,
        created_at: u.created_at.toISOString(),
        last_login_at: u.last_login_at?.toISOString() ?? null,
        email_verified: u.email_verified,
        email_verified_at: u.email_verified_at?.toISOString() ?? null,
        online: presence.has(u.id),
        room: pres?.roomLabel ?? null,
      };
    });
  });

  app.post('/admin/players/:id/coin', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const b = z
      .object({
        action: z.enum(['add', 'subtract', 'set']),
        amount: z.number().int().min(0).max(1_000_000_000),
        reason: z.string().trim().max(200).default('admin_adjust'),
      })
      .parse(req.body);

    const result = await withTx(ctx.db, async (tx) => {
      const current = await tx.query<{ coin: number }>(
        'SELECT coin FROM balances WHERE user_id = $1 FOR UPDATE',
        [id],
      );
      if (!current.rows[0]) throw notFound('Player not found.');
      const curCoin = current.rows[0].coin;

      let delta = 0;
      if (b.action === 'add') {
        delta = b.amount;
      } else if (b.action === 'subtract') {
        if (b.amount > curCoin) {
          throw badRequest(
            'insufficient_coin',
            `Không thể trừ ${b.amount} xu vì người chơi hiện chỉ có ${curCoin} xu.`,
          );
        }
        delta = -b.amount;
      } else if (b.action === 'set') {
        delta = b.amount - curCoin;
      }

      if (delta === 0) {
        return { previousCoin: curCoin, newCoin: curCoin, delta: 0 };
      }

      const leg = await postLedger(tx, {
        userId: id,
        currency: 'coin',
        amount: delta,
        reason: 'admin_adjust',
        metadata: {
          adminId: admin.id,
          adminEmail: admin.email,
          action: b.action,
          requestedAmount: b.amount,
          note: b.reason || 'Admin điều chỉnh số dư',
        },
      });

      await audit(
        tx,
        admin.id,
        'player.coin_adjust',
        'user',
        id,
        { coin: curCoin },
        { coin: leg.balanceAfter, delta, action: b.action, note: b.reason },
      );

      return {
        previousCoin: curCoin,
        newCoin: leg.balanceAfter,
        delta,
      };
    });

    return {
      ok: true,
      ...result,
    };
  });

  app.post('/admin/players/:id/status', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const b = z
      .object({
        status: z.enum(['active', 'suspended']),
        trustScore: z.number().int().min(0).max(100).optional(),
      })
      .parse(req.body);
    if (id === admin.id) throw badRequest('self', 'You cannot change your own status.');
    await withTx(ctx.db, async (tx) => {
      const prev = await tx.query<{ status: string; trust_score: number }>(
        'SELECT status, trust_score FROM users WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!prev.rows[0]) throw notFound('Player not found.');
      await tx.query('UPDATE users SET status = $2, trust_score = coalesce($3, trust_score) WHERE id = $1', [
        id,
        b.status,
        b.trustScore ?? null,
      ]);
      if (b.status === 'suspended') await tx.query('DELETE FROM sessions WHERE user_id = $1', [id]);
      await audit(
        tx,
        admin.id,
        b.status === 'suspended' ? 'player.suspend' : 'player.update',
        'user',
        id,
        prev.rows[0],
        b,
      );
    });
    if (b.status === 'suspended') await ctx.redis.publish('player:kick', JSON.stringify({ userId: id }));
    return { ok: true };
  });

  app.delete('/admin/players/:id', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

    if (id === admin.id) {
      throw badRequest('self', 'Bạn không thể tự xóa tài khoản của chính mình.');
    }

    return withTx(ctx.db, async (tx) => {
      const prev = await tx.query<{ id: string; email: string; role: string }>(
        'SELECT id, email, role FROM users WHERE id = $1 FOR UPDATE',
        [id],
      );
      const user = prev.rows[0];
      if (!user) throw notFound('Không tìm thấy người chơi.');
      if (user.role === 'admin') {
        throw forbidden('Không thể xóa tài khoản Quản trị viên (Admin).');
      }

      await ctx.redis.publish('player:kick', JSON.stringify({ userId: id }));
      await ctx.redis.hdel('presence:online', id);
      await ctx.redis.hdel('positions', id);

      await tx.query('UPDATE admin_audit_log SET admin_user_id = NULL WHERE admin_user_id = $1', [id]);
      await tx.query('UPDATE abuse_flags SET resolved_by = NULL WHERE resolved_by = $1', [id]);
      await tx.query('DELETE FROM users WHERE id = $1', [id]);

      await audit(tx, admin.id, 'player.delete', 'user', id, user, null);

      return { ok: true, id };
    });
  });

  app.post('/admin/players/:id/verify-email', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({ verified: z.boolean() }).parse(req.body);

    return withTx(ctx.db, async (tx) => {
      const prev = await tx.query<{ id: string; email: string; email_verified: boolean }>(
        'SELECT id, email, coalesce(email_verified, true) AS email_verified FROM users WHERE id = $1 FOR UPDATE',
        [id],
      );
      const user = prev.rows[0];
      if (!user) throw notFound('Không tìm thấy người chơi.');

      await tx.query(
        'UPDATE users SET email_verified = $2, email_verified_at = (CASE WHEN $2 THEN now() ELSE NULL END) WHERE id = $1',
        [id, body.verified],
      );

      if (!body.verified) {
        // Hủy xác thực: Văng người chơi ra khỏi game ngay lập tức và xóa phiên đăng nhập
        await tx.query('DELETE FROM sessions WHERE user_id = $1', [id]);
        await ctx.redis.publish(
          'player:kick',
          JSON.stringify({ userId: id, reason: 'email_unverified', email: user.email }),
        );
        await ctx.redis.hdel('presence:online', id);
        await ctx.redis.hdel('positions', id);

        // Tự động tạo và gửi mã OTP mới về email của người chơi để họ xác thực lại ngay lập tức
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpKey = `otp:register:${user.email.toLowerCase()}`;
        await ctx.redis.set(otpKey, otpCode, 'EX', 600);
        try {
          await ctx.mailer.sendOtpEmail(user.email, otpCode);
        } catch (err) {
          ctx.log.warn({ err, email: user.email }, 'Auto OTP send failed on admin unverify');
        }
      }

      await audit(
        tx,
        admin.id,
        body.verified ? 'player.email_verified' : 'player.email_unverified',
        'user',
        id,
        { email_verified: user.email_verified },
        { email_verified: body.verified },
      );

      return { ok: true, email_verified: body.verified };
    });
  });

  app.post('/admin/players/:id/send-verification-email', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

    const r = await ctx.db.query<{ id: string; email: string }>('SELECT id, email FROM users WHERE id = $1', [
      id,
    ]);
    const user = r.rows[0];
    if (!user) throw notFound('Không tìm thấy người chơi.');

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:register:${user.email.toLowerCase()}`;
    await ctx.redis.set(otpKey, otpCode, 'EX', 600);

    try {
      const sent = await ctx.mailer.sendOtpEmail(user.email, otpCode);
      if (!sent) throw new Error('Mailer returned false (SMTP unconfigured or failed)');
    } catch (err) {
      ctx.log.error({ err, email: user.email }, 'Failed to deliver re-verification OTP email');
      throw new AppError(
        500,
        'email_delivery_failed',
        'Không thể gửi email OTP. Vui lòng kiểm tra lại cấu hình SMTP.',
      );
    }

    await audit(ctx.db, admin.id, 'player.reverification_email_sent', 'user', id, null, {
      email: user.email,
    });

    return { ok: true, message: `Đã gửi mã xác thực lại tới email ${user.email}.` };
  });

  app.get('/admin/keys', async (req) => {
    requireAdmin(req);
    const q = z
      .object({ q: z.string().trim().max(100).default(''), status: z.string().max(20).default('') })
      .parse(req.query);
    const r = await ctx.db.query<ai.KeyRow & { display_name: string; email: string; requests: number }>(
      `SELECT k.*, p.display_name, u.email,
              (SELECT coalesce(sum(request_count), 0)::int FROM ai_usage_ledger l WHERE l.player_ai_key_id = k.id) AS requests
         FROM player_ai_keys k JOIN profiles p ON p.user_id = k.user_id JOIN users u ON u.id = k.user_id
        WHERE k.status <> 'failed'
          AND ($1 = '' OR u.email ILIKE '%' || $1 || '%' OR p.display_name ILIKE '%' || $1 || '%' OR k.id::text = $1 OR k.key_hint = $1)
          AND ($2 = '' OR k.status = $2)
        ORDER BY k.created_at DESC LIMIT 100`,
      [q.q, q.status],
    );
    const models = await ai.modelMap(ctx.db);
    return r.rows.map((k) => ({
      ...ai.publicKey(k, models),
      userId: k.user_id,
      displayName: k.display_name,
      email: k.email,
      requests: k.requests,
    }));
  });

  app.post('/admin/keys/:id/suspend', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const b = z
      .object({ suspended: z.boolean(), reason: z.string().trim().max(200).default('') })
      .parse(req.body);
    const { before, after } = await ai.setKeySuspended(ctx, id, b.suspended, b.reason || null);
    await audit(
      ctx.db,
      admin.id,
      b.suspended ? 'key.suspend' : 'key.unsuspend',
      'player_ai_key',
      id,
      { status: before.status },
      { status: after.status, reason: b.reason },
    );
    return { ok: true };
  });

  app.post('/admin/keys/:id/revoke', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const key = await ai.revokeKey(ctx, admin.id, id, 'admin');
    await audit(ctx.db, admin.id, 'key.revoke', 'player_ai_key', id, null, { status: key.status });
    return { ok: true };
  });

  app.post('/admin/usage/sync', async (req) => {
    requireAdmin(req);
    return ai.syncUsage(ctx);
  });

  app.get('/admin/ledger', async (req) => {
    requireAdmin(req);
    const q = z
      .object({
        user: z.string().trim().max(100).default(''),
        reason: z.string().trim().max(60).default(''),
        currency: z.enum(['', 'coin', 'fame', 'ai_credit']).default(''),
        before: z.coerce.number().int().optional(),
      })
      .parse(req.query);
    const r = await ctx.db.query<{
      id: number;
      user_id: string;
      display_name: string;
      currency: string;
      amount: number;
      balance_after: number;
      reason_type: string;
      reference_id: string | null;
      metadata: unknown;
      created_at: Date;
    }>(
      `SELECT l.id, l.user_id, p.display_name, l.currency, l.amount, l.balance_after, l.reason_type, l.reference_id, l.metadata, l.created_at
         FROM ledger_entries l JOIN profiles p ON p.user_id = l.user_id JOIN users u ON u.id = l.user_id
        WHERE ($1 = '' OR u.email ILIKE '%' || $1 || '%' OR p.display_name ILIKE '%' || $1 || '%' OR l.user_id::text = $1)
          AND ($2 = '' OR l.reason_type = $2) AND ($3 = '' OR l.currency = $3) AND ($4::bigint IS NULL OR l.id < $4)
        ORDER BY l.id DESC LIMIT 100`,
      [q.user, q.reason, q.currency, q.before ?? null],
    );
    return r.rows.map((e) => ({ ...e, created_at: e.created_at.toISOString() }));
  });

  app.get('/admin/redemptions', async (req) => {
    requireAdmin(req);
    const r = await ctx.db.query<{
      id: string;
      kind: string;
      status: string;
      source_coin: number;
      ai_credit_cents: number;
      quota_cents: number;
      failure_reason: string | null;
      display_name: string;
      created_at: Date;
    }>(
      `SELECT r.id, r.kind, r.status, r.source_coin, r.ai_credit_cents, r.quota_cents, r.failure_reason, p.display_name, r.created_at
         FROM ai_redemptions r JOIN profiles p ON p.user_id = r.user_id ORDER BY r.created_at DESC LIMIT 100`,
    );
    return r.rows.map((x) => ({ ...x, created_at: x.created_at.toISOString() }));
  });

  app.get('/admin/usage', async (req) => {
    requireAdmin(req);
    const r = await ctx.db.query<{
      day: Date;
      model_id: string;
      requests: number;
      input_tokens: number;
      output_tokens: number;
      cost_usd: number;
    }>(
      `SELECT usage_window AS day, model_id, sum(request_count)::int AS requests, sum(input_tokens)::bigint AS input_tokens,
              sum(output_tokens)::bigint AS output_tokens, sum(cost_usd)::float AS cost_usd
         FROM ai_usage_ledger WHERE usage_window > now() - interval '30 days'
        GROUP BY usage_window, model_id ORDER BY usage_window DESC, model_id`,
    );
    return r.rows.map((u) => ({ ...u, day: u.day.toISOString().slice(0, 10) }));
  });

  app.get('/admin/audit', async (req) => {
    requireAdmin(req);
    const r = await ctx.db.query<{
      id: number;
      action: string;
      entity_type: string;
      entity_id: string | null;
      before_json: unknown;
      after_json: unknown;
      created_at: Date;
      admin: string | null;
    }>(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.before_json, a.after_json, a.created_at, p.display_name AS admin
         FROM admin_audit_log a LEFT JOIN profiles p ON p.user_id = a.admin_user_id ORDER BY a.id DESC LIMIT 200`,
    );
    return r.rows.map((x) => ({ ...x, created_at: x.created_at.toISOString() }));
  });

  app.get('/admin/flags', async (req) => {
    requireAdmin(req);
    const q = z
      .object({ status: z.enum(['open', 'confirmed', 'dismissed']).default('open') })
      .parse(req.query);
    const r = await ctx.db.query<{
      id: string;
      user_id: string;
      display_name: string;
      type: string;
      severity: string;
      score: number;
      status: string;
      metadata: unknown;
      created_at: Date;
      trust_score: number;
    }>(
      `SELECT f.id, f.user_id, p.display_name, f.type, f.severity, f.score, f.status, f.metadata, f.created_at, u.trust_score
         FROM abuse_flags f JOIN profiles p ON p.user_id = f.user_id JOIN users u ON u.id = f.user_id
        WHERE f.status = $1 ORDER BY f.created_at DESC LIMIT 100`,
      [q.status],
    );
    return r.rows.map((x) => ({ ...x, created_at: x.created_at.toISOString() }));
  });

  app.post('/admin/flags/:id/resolve', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const b = z
      .object({ status: z.enum(['confirmed', 'dismissed']), restoreTrust: z.boolean().default(false) })
      .parse(req.body);
    await withTx(ctx.db, async (tx) => {
      const f = await tx.query<{ user_id: string; status: string; severity: string }>(
        'SELECT user_id, status, severity FROM abuse_flags WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!f.rows[0]) throw notFound('Flag not found.');
      await tx.query(
        'UPDATE abuse_flags SET status = $2, resolved_at = now(), resolved_by = $3 WHERE id = $1',
        [id, b.status, admin.id],
      );
      if (b.status === 'dismissed' && b.restoreTrust) {
        const restore = f.rows[0].severity === 'high' ? 30 : f.rows[0].severity === 'medium' ? 10 : 0;
        await tx.query('UPDATE users SET trust_score = LEAST(100, trust_score + $2) WHERE id = $1', [
          f.rows[0].user_id,
          restore,
        ]);
      }
      await audit(tx, admin.id, `flag.${b.status}`, 'abuse_flag', id, { status: f.rows[0].status }, b);
    });
    return { ok: true };
  });

  app.get('/admin/reports', async (req) => {
    requireAdmin(req);
    const r = await ctx.db.query<{
      id: string;
      reason: string;
      details: string;
      status: string;
      created_at: Date;
      reporter: string;
      target: string;
      target_id: string;
      context: unknown;
    }>(
      `SELECT r.id, r.reason, r.details, r.status, r.created_at, a.display_name AS reporter, b.display_name AS target, r.target_id, r.context
         FROM reports r JOIN profiles a ON a.user_id = r.reporter_id JOIN profiles b ON b.user_id = r.target_id
        ORDER BY (r.status = 'open') DESC, r.created_at DESC LIMIT 100`,
    );
    return r.rows.map((x) => ({ ...x, created_at: x.created_at.toISOString() }));
  });

  app.post('/admin/reports/:id', async (req) => {
    const admin = requireAdmin(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const b = z.object({ status: z.enum(['reviewed', 'dismissed']) }).parse(req.body);
    await ctx.db.query('UPDATE reports SET status = $2 WHERE id = $1', [id, b.status]);
    await audit(ctx.db, admin.id, `report.${b.status}`, 'report', id, null, b);
    return { ok: true };
  });
}
