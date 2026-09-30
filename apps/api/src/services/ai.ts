import {
  checkEligibility,
  coinCostForCents,
  creditCostForBudget,
  startOfUtcMonth,
  startOfUtcWeek,
} from '@cozy/economy';
import type { AppContext } from '../context.js';
import { withTx, type Queryable } from '../db.js';
import { AppError, badRequest, conflict, notFound } from '../errors.js';
import { GatewayError } from '../gateway.js';
import { postLedger } from '../ledger.js';
import { metrics } from '../metrics.js';
import { getSetting, type AiPolicy } from '../settings.js';
import { raiseFlag } from './abuse.js';

export interface ModelRow {
  id: string;
  slug: string;
  display_name: string;
  description: string;
  public_model_name: string;
  upstream_provider: string;
  upstream_model_name: string;
  upstream_base_url: string;
  secret_ref: string;
  enabled: boolean;
  allow_external_use: boolean;
  credit_multiplier: number;
  input_cost_per_mtok: number;
  output_cost_per_mtok: number;
  rpm: number;
  tpm: number;
  context_limit: number | null;
  user_monthly_budget_cents: number | null;
  gateway_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface KeyRow {
  id: string;
  user_id: string;
  gateway_key_id: string | null;
  key_alias: string;
  key_hint: string | null;
  label: string;
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired' | 'failed';
  allowed_models: string[];
  budget_cents: number;
  spend_cents: number;
  rpm: number;
  tpm: number;
  expires_at: Date;
  rotated_from: string | null;
  suspended_reason: string | null;
  last_synced_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
}

export function publicKey(k: KeyRow, models: Map<string, ModelRow>) {
  const remainingCents = Math.max(0, k.budget_cents - k.spend_cents);
  return {
    id: k.id,
    label: k.label,
    status: k.status === 'active' && remainingCents <= 0 ? ('exhausted' as const) : k.status,
    keyPreview: k.key_hint ? `sk-…${k.key_hint}` : null,
    models: k.allowed_models.map((id) => models.get(id)?.public_model_name ?? 'removed-model'),
    modelIds: k.allowed_models,
    budgetCents: k.budget_cents,
    spendCents: Math.round(k.spend_cents * 100) / 100,
    remainingCents: Math.round(remainingCents * 100) / 100,
    rpm: k.rpm,
    tpm: k.tpm,
    expiresAt: k.expires_at.toISOString(),
    createdAt: k.created_at.toISOString(),
    revokedAt: k.revoked_at?.toISOString() ?? null,
    suspendedReason: k.suspended_reason,
    lastSyncedAt: k.last_synced_at?.toISOString() ?? null,
  };
}

export async function modelMap(q: Queryable): Promise<Map<string, ModelRow>> {
  const r = await q.query<ModelRow>('SELECT * FROM model_deployments');
  return new Map(r.rows.map((m) => [m.id, m]));
}

async function eligibilityFor(q: Queryable, userId: string, policy: AiPolicy, now: Date) {
  const r = await q.query<{
    created_at: Date;
    onboarding_completed_at: Date | null;
    trust_score: number;
    fame: number;
    unique_activities: number;
    last_mint: Date | null;
  }>(
    `SELECT u.created_at, u.onboarding_completed_at, u.trust_score, p.fame,
            (SELECT count(DISTINCT activity_slug)::int FROM activity_runs WHERE user_id = u.id AND status = 'completed')
              + (SELECT CASE WHEN EXISTS (SELECT 1 FROM event_entries e JOIN events ev ON ev.id = e.event_id
                                          WHERE e.user_id = u.id AND ev.status = 'finished') THEN 1 ELSE 0 END) AS unique_activities,
            (SELECT max(created_at) FROM ai_redemptions WHERE user_id = u.id AND kind = 'mint' AND status = 'completed') AS last_mint
       FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [userId],
  );
  const row = r.rows[0];
  if (!row) throw notFound('Player not found.');
  return checkEligibility(policy, {
    accountCreatedAt: row.created_at,
    onboardingComplete: Boolean(row.onboarding_completed_at),
    uniqueActivities: row.unique_activities,
    fame: row.fame,
    trustScore: row.trust_score,
    lastRedemptionAt: row.last_mint,
    now,
  });
}

/** Pool usage for the current week, including optional rollover from last week. */
export async function poolStatus(q: Queryable, policy: AiPolicy, now: Date) {
  const weekStart = startOfUtcWeek(now);
  const prevStart = new Date(weekStart.getTime() - 7 * 86_400_000);
  const r = await q.query<{ this_week: number; last_week: number }>(
    `SELECT coalesce(sum(ai_credit_cents) FILTER (WHERE created_at >= $1), 0)::bigint AS this_week,
            coalesce(sum(ai_credit_cents) FILTER (WHERE created_at >= $2 AND created_at < $1), 0)::bigint AS last_week
       FROM ai_redemptions WHERE kind = 'mint' AND status IN ('completed', 'pending')`,
    [weekStart, prevStart],
  );
  const usedCents = r.rows[0]?.this_week ?? 0;
  const rollover = policy.rolloverEnabled
    ? Math.max(0, policy.weeklyPoolCents - (r.rows[0]?.last_week ?? 0))
    : 0;
  const totalCents = policy.weeklyPoolCents + rollover;
  return {
    weekStart: weekStart.toISOString(),
    resetsAt: new Date(weekStart.getTime() + 7 * 86_400_000).toISOString(),
    totalCents,
    rolloverCents: rollover,
    usedCents,
    remainingCents: Math.max(0, totalCents - usedCents),
  };
}

async function mintedThisMonth(q: Queryable, userId: string, now: Date): Promise<number> {
  const r = await q.query<{ n: number }>(
    `SELECT coalesce(sum(ai_credit_cents), 0)::bigint AS n FROM ai_redemptions
      WHERE user_id = $1 AND kind = 'mint' AND status IN ('completed', 'pending') AND created_at >= $2`,
    [userId, startOfUtcMonth(now)],
  );
  return r.rows[0]?.n ?? 0;
}

export async function aiOverview(ctx: AppContext, userId: string) {
  const now = ctx.now();
  const policy = await getSetting(ctx.db, 'ai_policy');
  const [eligibility, pool, monthUsed, models, keys, balances] = await Promise.all([
    eligibilityFor(ctx.db, userId, policy, now),
    poolStatus(ctx.db, policy, now),
    mintedThisMonth(ctx.db, userId, now),
    modelMap(ctx.db),
    ctx.db.query<KeyRow>(
      `SELECT * FROM player_ai_keys WHERE user_id = $1 AND status <> 'failed' ORDER BY created_at DESC LIMIT 50`,
      [userId],
    ),
    ctx.db.query<{ coin: number; ai_credit_cents: number }>(
      'SELECT coin, ai_credit_cents FROM balances WHERE user_id = $1',
      [userId],
    ),
  ]);
  const bal = balances.rows[0]!;
  const activeKeys = keys.rows.filter((k) => k.status === 'active' || k.status === 'suspended');
  return {
    gatewayBaseUrl: ctx.config.PUBLIC_GATEWAY_URL,
    paused: policy.redemptionsPaused,
    balances: { coin: bal.coin, aiCreditCents: bal.ai_credit_cents },
    rate: {
      coinPerUsd: policy.coinPerUsd,
      minMintCents: policy.minMintCents,
      maxMintCents: policy.maxMintCents,
    },
    eligibility,
    monthly: {
      capCents: policy.perUserMonthlyCapCents,
      usedCents: monthUsed,
      remainingCents: Math.max(0, policy.perUserMonthlyCapCents - monthUsed),
      resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
    },
    pool: { remainingCents: pool.remainingCents, totalCents: pool.totalCents, resetsAt: pool.resetsAt },
    keyPolicy: {
      maxActiveKeys: policy.maxActiveKeys,
      activeKeys: activeKeys.length,
      ttlDays: policy.keyTtlDays,
      minBudgetCents: policy.minKeyBudgetCents,
    },
    models: [...models.values()]
      .filter((m) => m.enabled && m.allow_external_use)
      .sort((a, b) => a.credit_multiplier - b.credit_multiplier)
      .map((m) => ({
        id: m.id,
        name: m.public_model_name,
        displayName: m.display_name,
        description: m.description,
        creditMultiplier: m.credit_multiplier,
        rpm: m.rpm,
        tpm: m.tpm,
        contextLimit: m.context_limit,
      })),
    keys: keys.rows.map((k) => publicKey(k, models)),
  };
}

async function replayRedemption(q: Queryable, userId: string, idempotencyKey: string) {
  const r = await q.query<{ status: string; response: unknown; failure_reason: string | null; kind: string }>(
    'SELECT status, response, failure_reason, kind FROM ai_redemptions WHERE user_id = $1 AND idempotency_key = $2',
    [userId, idempotencyKey],
  );
  const row = r.rows[0];
  if (!row) return null;
  metrics.inc('redemption_replay_total', { kind: row.kind });
  if (row.status === 'completed') return { replayed: true, ...(row.response as object) };
  if (row.status === 'pending')
    throw conflict(
      'redemption_in_progress',
      'This redemption is still being processed. Refresh in a moment.',
    );
  throw conflict(
    'redemption_failed',
    row.failure_reason ?? 'This redemption failed. Your balance was not charged.',
  );
}

function assertOpen(policy: AiPolicy) {
  if (policy.redemptionsPaused) {
    throw new AppError(
      503,
      'redemptions_paused',
      'AI redemptions are paused right now. Your balances are safe — please check back soon.',
    );
  }
}

/** Coin -> AI Credit. Pure database operation guarded by eligibility, monthly cap and the weekly pool. */
export async function mintCredit(ctx: AppContext, userId: string, cents: number, idempotencyKey: string) {
  const replay = await replayRedemption(ctx.db, userId, idempotencyKey);
  if (replay) return replay;
  const now = ctx.now();
  const policy = await getSetting(ctx.db, 'ai_policy');
  assertOpen(policy);
  if (!Number.isInteger(cents) || cents < policy.minMintCents || cents > policy.maxMintCents) {
    throw badRequest(
      'invalid_amount',
      `Choose between $${(policy.minMintCents / 100).toFixed(2)} and $${(policy.maxMintCents / 100).toFixed(2)}.`,
    );
  }
  const coinCost = coinCostForCents(cents, policy.coinPerUsd);
  try {
    return await withTx(ctx.db, async (tx) => {
      // Serialize pool accounting across all players.
      await tx.query(`SELECT pg_advisory_xact_lock(hashtext('ai_reward_pool'))`);
      // A waiting request must see the winner before checking cooldown or caps.
      const replay = await replayRedemption(tx, userId, idempotencyKey);
      if (replay) return replay;
      const eligibility = await eligibilityFor(tx, userId, policy, now);
      if (!eligibility.eligible)
        throw new AppError(403, 'not_eligible', 'You are not eligible to redeem yet.', eligibility);
      const monthUsed = await mintedThisMonth(tx, userId, now);
      if (monthUsed + cents > policy.perUserMonthlyCapCents) {
        throw conflict(
          'monthly_cap',
          `That would exceed your monthly limit. You can mint $${(Math.max(0, policy.perUserMonthlyCapCents - monthUsed) / 100).toFixed(2)} more this month.`,
        );
      }
      const pool = await poolStatus(tx, policy, now);
      if (cents > pool.remainingCents) {
        throw conflict(
          'pool_exhausted',
          `This week's AI reward pool has $${(pool.remainingCents / 100).toFixed(2)} left. It refills on ${pool.resetsAt.slice(0, 10)}.`,
        );
      }
      const ins = await tx.query<{ id: string }>(
        `INSERT INTO ai_redemptions (user_id, kind, idempotency_key, source_coin, ai_credit_cents, status, created_at)
         VALUES ($1, 'mint', $2, $3, $4, 'pending', $5) RETURNING id`,
        [userId, idempotencyKey, coinCost, cents, now],
      );
      const id = ins.rows[0]!.id;
      const coin = await postLedger(tx, {
        userId,
        currency: 'coin',
        amount: -coinCost,
        reason: 'ai_mint',
        referenceId: id,
        idempotencyKey: `redeem:${id}:coin`,
        metadata: { cents },
      });
      const credit = await postLedger(tx, {
        userId,
        currency: 'ai_credit',
        amount: cents,
        reason: 'ai_mint',
        referenceId: id,
        idempotencyKey: `redeem:${id}:credit`,
        metadata: { coinCost },
      });
      const response = {
        redemptionId: id,
        coinSpent: coinCost,
        creditCents: cents,
        balances: { coin: coin.balanceAfter, aiCreditCents: credit.balanceAfter },
      };
      await tx.query(
        `UPDATE ai_redemptions SET status = 'completed', completed_at = now(), response = $2 WHERE id = $1`,
        [id, JSON.stringify(response)],
      );
      metrics.inc('redemption_total', { kind: 'mint', status: 'completed' });
      await velocityCheck(tx, userId, now);
      return response;
    });
  } catch (err) {
    // Concurrent request with the same idempotency key: return the winner's result.
    if ((err as { code?: string }).code === '23505') {
      const again = await replayRedemption(ctx.db, userId, idempotencyKey);
      if (again) return again;
    }
    if (err instanceof AppError) metrics.inc('redemption_total', { kind: 'mint', status: err.code });
    throw err;
  }
}

async function velocityCheck(q: Queryable, userId: string, now: Date) {
  const r = await q.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM ai_redemptions WHERE user_id = $1 AND created_at > $2`,
    [userId, new Date(now.getTime() - 3_600_000)],
  );
  if ((r.rows[0]?.n ?? 0) >= 6)
    await raiseFlag(q, userId, 'redemption_velocity', 'low', r.rows[0]!.n, { windowMinutes: 60 });
}

interface AllocateInput {
  modelIds: string[];
  budgetCents: number;
  label: string;
}

/**
 * AI Credit -> virtual API key with budget. The response with the secret is only returned
 * after the gateway confirms the key; on gateway failure the credit is refunded.
 */
export async function createKey(
  ctx: AppContext,
  userId: string,
  input: AllocateInput,
  idempotencyKey: string,
) {
  const replay = await replayRedemption(ctx.db, userId, idempotencyKey);
  if (replay) return replay;
  const now = ctx.now();
  const policy = await getSetting(ctx.db, 'ai_policy');
  assertOpen(policy);
  const modelIds = [...new Set(input.modelIds)];
  if (!modelIds.length) throw badRequest('no_models', 'Pick at least one model.');
  if (!Number.isInteger(input.budgetCents) || input.budgetCents < policy.minKeyBudgetCents) {
    throw badRequest(
      'invalid_budget',
      `Minimum key budget is $${(policy.minKeyBudgetCents / 100).toFixed(2)}.`,
    );
  }
  const all = await modelMap(ctx.db);
  const models = modelIds.map((id) => all.get(id));
  if (models.some((m) => !m || !m.enabled || !m.allow_external_use)) {
    throw badRequest('model_unavailable', 'One of the selected models is not available right now.');
  }
  const chosen = models as ModelRow[];
  const creditCost = creditCostForBudget(
    input.budgetCents,
    chosen.map((m) => m.credit_multiplier),
  );
  const expiresAt = new Date(now.getTime() + policy.keyTtlDays * 86_400_000);
  const rpm = Math.min(...chosen.map((m) => m.rpm));
  const tpm = Math.min(...chosen.map((m) => m.tpm));

  let prepared: { redemptionId: string; keyId: string; alias: string };
  try {
    prepared = await withTx(ctx.db, async (tx) => {
      await tx.query('SELECT 1 FROM balances WHERE user_id = $1 FOR UPDATE', [userId]);
      const active = await tx.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM player_ai_keys WHERE user_id = $1 AND status IN ('pending', 'active', 'suspended')`,
        [userId],
      );
      if ((active.rows[0]?.n ?? 0) >= policy.maxActiveKeys) {
        throw conflict(
          'too_many_keys',
          `You can have ${policy.maxActiveKeys} active keys. Revoke one to create another.`,
        );
      }
      for (const m of chosen) {
        if (m.user_monthly_budget_cents == null) continue;
        const used = await tx.query<{ n: number }>(
          `SELECT coalesce(sum(budget_cents), 0)::bigint AS n FROM player_ai_keys
            WHERE user_id = $1 AND allowed_models ? $2 AND rotated_from IS NULL AND status <> 'failed' AND created_at >= $3`,
          [userId, m.id, startOfUtcMonth(now)],
        );
        if ((used.rows[0]?.n ?? 0) + input.budgetCents > m.user_monthly_budget_cents) {
          throw conflict(
            'model_monthly_cap',
            `${m.display_name} allows $${(m.user_monthly_budget_cents / 100).toFixed(2)} per player per month.`,
          );
        }
      }
      const red = await tx.query<{ id: string }>(
        `INSERT INTO ai_redemptions (user_id, kind, idempotency_key, ai_credit_cents, quota_cents, model_ids, status, created_at)
         VALUES ($1, 'allocate', $2, $3, $4, $5, 'pending', $6) RETURNING id`,
        [userId, idempotencyKey, creditCost, input.budgetCents, JSON.stringify(modelIds), now],
      );
      const redemptionId = red.rows[0]!.id;
      await postLedger(tx, {
        userId,
        currency: 'ai_credit',
        amount: -creditCost,
        reason: 'ai_key_allocate',
        referenceId: redemptionId,
        idempotencyKey: `redeem:${redemptionId}:credit`,
        metadata: { budgetCents: input.budgetCents, models: chosen.map((m) => m.public_model_name) },
      });
      const key = await tx.query<{ id: string }>(
        `INSERT INTO player_ai_keys (user_id, key_alias, label, status, allowed_models, budget_cents, rpm, tpm, expires_at, created_at)
         VALUES ($1, 'pending-' || gen_random_uuid(), $2, 'pending', $3, $4, $5, $6, $7, $8) RETURNING id`,
        [userId, input.label, JSON.stringify(modelIds), input.budgetCents, rpm, tpm, expiresAt, now],
      );
      const keyId = key.rows[0]!.id;
      const alias = `cozy-${keyId}`;
      await tx.query('UPDATE player_ai_keys SET key_alias = $2 WHERE id = $1', [keyId, alias]);
      await tx.query('UPDATE ai_redemptions SET key_id = $2 WHERE id = $1', [redemptionId, keyId]);
      return { redemptionId, keyId, alias };
    });
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      const again = await replayRedemption(ctx.db, userId, idempotencyKey);
      if (again) return again;
    }
    throw err;
  }

  let secret: { key: string; token: string };
  try {
    secret = await ctx.gateway.generateKey({
      alias: prepared.alias,
      models: chosen.map((m) => m.public_model_name),
      maxBudgetUsd: input.budgetCents / 100,
      rpm,
      tpm,
      expiresAt,
      metadata: { game_user_id: userId, game_key_id: prepared.keyId },
    });
  } catch (err) {
    await failAllocation(ctx, userId, prepared, creditCost, err);
    throw new AppError(
      502,
      'gateway_unavailable',
      'The AI gateway did not respond. Your AI Credit was refunded — please try again.',
    );
  }

  const hint = secret.key.slice(-4);
  const modelNames = chosen.map((m) => m.public_model_name);
  const response = {
    redemptionId: prepared.redemptionId,
    keyId: prepared.keyId,
    baseUrl: ctx.config.PUBLIC_GATEWAY_URL,
    models: modelNames,
    budgetUsd: input.budgetCents / 100,
    creditSpentCents: creditCost,
    rpm,
    tpm,
    expiresAt: expiresAt.toISOString(),
    keyPreview: `sk-…${hint}`,
  };
  try {
    await withTx(ctx.db, async (tx) => {
      await tx.query(
        `UPDATE player_ai_keys SET status = 'active', gateway_key_id = $2, key_hint = $3, last_synced_at = now() WHERE id = $1`,
        [prepared.keyId, secret.token, hint],
      );
      await tx.query(
        `UPDATE ai_redemptions SET status = 'completed', completed_at = now(), gateway_operation_id = $2, response = $3 WHERE id = $1`,
        [prepared.redemptionId, secret.token, JSON.stringify(response)],
      );
    });
  } catch (err) {
    await ctx.gateway.deleteKey(secret.token).catch(() => undefined);
    await failAllocation(ctx, userId, prepared, creditCost, err);
    throw new AppError(
      500,
      'allocation_failed',
      'Something went wrong saving your key. Your AI Credit was refunded.',
    );
  }
  metrics.inc('redemption_total', { kind: 'allocate', status: 'completed' });
  ctx.log.info(
    { userId, keyId: prepared.keyId, budgetCents: input.budgetCents, models: modelNames },
    'ai key created',
  );
  // The secret is returned exactly once and never stored.
  return { ...response, apiKey: secret.key };
}

async function failAllocation(
  ctx: AppContext,
  userId: string,
  prepared: { redemptionId: string; keyId: string; alias: string },
  creditCost: number,
  err: unknown,
) {
  const reason = err instanceof Error ? err.message.slice(0, 500) : 'unknown';
  ctx.log.error({ err, userId, redemptionId: prepared.redemptionId }, 'ai key allocation failed, refunding');
  metrics.inc('redemption_total', { kind: 'allocate', status: 'failed' });
  // If the gateway created the key but the response was lost, make sure it cannot be used.
  await ctx.gateway.deleteKeyByAlias(prepared.alias).catch(() => undefined);
  await withTx(ctx.db, async (tx) => {
    await postLedger(tx, {
      userId,
      currency: 'ai_credit',
      amount: creditCost,
      reason: 'ai_key_refund',
      referenceId: prepared.redemptionId,
      idempotencyKey: `redeem:${prepared.redemptionId}:refund`,
      metadata: { reason },
    });
    await tx.query(`UPDATE player_ai_keys SET status = 'failed' WHERE id = $1`, [prepared.keyId]);
    await tx.query(
      `UPDATE ai_redemptions SET status = 'failed', failure_reason = $2, completed_at = now() WHERE id = $1`,
      [prepared.redemptionId, 'The AI gateway did not respond. Your AI Credit was refunded.'],
    );
  });
}

async function ownedKey(ctx: AppContext, userId: string, keyId: string): Promise<KeyRow> {
  const r = await ctx.db.query<KeyRow>('SELECT * FROM player_ai_keys WHERE id = $1', [keyId]);
  const key = r.rows[0];
  // Do not reveal whether another player's key exists.
  if (!key || key.user_id !== userId) throw notFound('Key not found.');
  return key;
}

export async function revokeKey(
  ctx: AppContext,
  userId: string,
  keyId: string,
  actor: 'player' | 'admin' = 'player',
) {
  const key = actor === 'admin' ? await anyKey(ctx, keyId) : await ownedKey(ctx, userId, keyId);
  if (key.status === 'revoked' || key.status === 'expired' || key.status === 'failed') return key;
  if (key.gateway_key_id) {
    try {
      await ctx.gateway.deleteKey(key.gateway_key_id);
    } catch (err) {
      ctx.log.error({ err, keyId }, 'gateway revoke failed');
      throw new AppError(
        502,
        'gateway_unavailable',
        'Could not reach the AI gateway to revoke this key. Please try again.',
      );
    }
  }
  const r = await ctx.db.query<KeyRow>(
    `UPDATE player_ai_keys SET status = 'revoked', revoked_at = now() WHERE id = $1 RETURNING *`,
    [keyId],
  );
  ctx.log.info({ keyId, actor }, 'ai key revoked');
  return r.rows[0]!;
}

async function anyKey(ctx: AppContext, keyId: string): Promise<KeyRow> {
  const r = await ctx.db.query<KeyRow>('SELECT * FROM player_ai_keys WHERE id = $1', [keyId]);
  if (!r.rows[0]) throw notFound('Key not found.');
  return r.rows[0];
}

/** Issues a new secret carrying the remaining budget; the old secret stops working immediately. */
export async function rotateKey(ctx: AppContext, userId: string, keyId: string) {
  const policy = await getSetting(ctx.db, 'ai_policy');
  assertOpen(policy);
  const old = await ownedKey(ctx, userId, keyId);
  if (old.status !== 'active' || !old.gateway_key_id)
    throw conflict('not_rotatable', 'Only active keys can be rotated.');
  const info = await ctx.gateway.keyInfo(old.gateway_key_id).catch(() => null);
  const spendCents = info ? info.spendUsd * 100 : old.spend_cents;
  const remaining = Math.floor(old.budget_cents - spendCents);
  if (remaining <= 0) throw conflict('key_exhausted', 'This key has no quota left to move to a new key.');
  const models = await modelMap(ctx.db);
  const modelNames = old.allowed_models
    .map((id) => models.get(id))
    .filter((m): m is ModelRow => Boolean(m?.enabled))
    .map((m) => m.public_model_name);
  if (!modelNames.length)
    throw conflict('model_unavailable', 'The models on this key are no longer available.');

  const created = await ctx.db.query<{ id: string }>(
    `INSERT INTO player_ai_keys (user_id, key_alias, label, status, allowed_models, budget_cents, rpm, tpm, expires_at, rotated_from)
     VALUES ($1, 'pending-' || gen_random_uuid(), $2, 'pending', $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      userId,
      old.label,
      JSON.stringify(old.allowed_models),
      remaining,
      old.rpm,
      old.tpm,
      old.expires_at,
      old.id,
    ],
  );
  const newId = created.rows[0]!.id;
  const alias = `cozy-${newId}`;
  await ctx.db.query('UPDATE player_ai_keys SET key_alias = $2 WHERE id = $1', [newId, alias]);
  let secret: { key: string; token: string };
  try {
    secret = await ctx.gateway.generateKey({
      alias,
      models: modelNames,
      maxBudgetUsd: remaining / 100,
      rpm: old.rpm,
      tpm: old.tpm,
      expiresAt: old.expires_at,
      metadata: { game_user_id: userId, game_key_id: newId, rotated_from: old.id },
    });
    await ctx.gateway.deleteKey(old.gateway_key_id);
  } catch (err) {
    ctx.log.error({ err, keyId }, 'rotation failed');
    await ctx.gateway.deleteKeyByAlias(alias).catch(() => undefined);
    await ctx.db.query(`UPDATE player_ai_keys SET status = 'failed' WHERE id = $1`, [newId]);
    throw new AppError(
      502,
      'gateway_unavailable',
      'Could not rotate the key. Your existing key still works.',
    );
  }
  await withTx(ctx.db, async (tx) => {
    await tx.query(
      `UPDATE player_ai_keys SET status = 'revoked', revoked_at = now(), spend_cents = $2 WHERE id = $1`,
      [old.id, spendCents],
    );
    await tx.query(
      `UPDATE player_ai_keys SET status = 'active', gateway_key_id = $2, key_hint = $3, last_synced_at = now() WHERE id = $1`,
      [newId, secret.token, secret.key.slice(-4)],
    );
  });
  ctx.log.info({ oldKeyId: old.id, newKeyId: newId }, 'ai key rotated');
  return {
    keyId: newId,
    baseUrl: ctx.config.PUBLIC_GATEWAY_URL,
    models: modelNames,
    budgetUsd: remaining / 100,
    expiresAt: old.expires_at.toISOString(),
    apiKey: secret.key,
    keyPreview: `sk-…${secret.key.slice(-4)}`,
  };
}

export async function setKeySuspended(
  ctx: AppContext,
  keyId: string,
  suspended: boolean,
  reason: string | null,
) {
  const key = await anyKey(ctx, keyId);
  if (!key.gateway_key_id || (key.status !== 'active' && key.status !== 'suspended'))
    throw conflict('invalid_state', 'Key is not active.');
  if (suspended) await ctx.gateway.blockKey(key.gateway_key_id);
  else await ctx.gateway.unblockKey(key.gateway_key_id);
  const r = await ctx.db.query<KeyRow>(
    `UPDATE player_ai_keys SET status = $2, suspended_reason = $3 WHERE id = $1 RETURNING *`,
    [keyId, suspended ? 'suspended' : 'active', suspended ? reason : null],
  );
  return { before: key, after: r.rows[0]! };
}

export async function keyUsage(ctx: AppContext, userId: string, keyId: string) {
  await ownedKey(ctx, userId, keyId);
  const r = await ctx.db.query<{
    usage_window: Date;
    model_id: string;
    request_count: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  }>(
    `SELECT usage_window, model_id, request_count, input_tokens, output_tokens, cost_usd FROM ai_usage_ledger
      WHERE player_ai_key_id = $1 ORDER BY usage_window DESC, model_id LIMIT 90`,
    [keyId],
  );
  return r.rows.map((u) => ({
    day: u.usage_window.toISOString().slice(0, 10),
    model: u.model_id,
    requests: u.request_count,
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    costUsd: u.cost_usd,
  }));
}

/** Pulls spend from the gateway. Runs periodically; the gateway remains the enforcement point. */
export async function syncUsage(ctx: AppContext): Promise<{ synced: number; expired: number }> {
  const expired = await ctx.db.query<KeyRow>(
    `UPDATE player_ai_keys SET status = 'expired' WHERE status IN ('active', 'suspended') AND expires_at < now() RETURNING *`,
  );
  for (const k of expired.rows)
    if (k.gateway_key_id) await ctx.gateway.deleteKey(k.gateway_key_id).catch(() => undefined);
  const policy = await getSetting(ctx.db, 'ai_policy');
  const keys = await ctx.db.query<KeyRow>(
    `SELECT * FROM player_ai_keys WHERE status IN ('active', 'suspended') AND gateway_key_id IS NOT NULL
      ORDER BY last_synced_at NULLS FIRST LIMIT 200`,
  );
  let synced = 0;
  for (const key of keys.rows) {
    try {
      const info = await ctx.gateway.keyInfo(key.gateway_key_id!);
      if (!info) {
        await ctx.db.query(`UPDATE player_ai_keys SET status = 'revoked', revoked_at = now() WHERE id = $1`, [
          key.id,
        ]);
        continue;
      }
      await ctx.db.query(`UPDATE player_ai_keys SET spend_cents = $2, last_synced_at = now() WHERE id = $1`, [
        key.id,
        info.spendUsd * 100,
      ]);
      const logs = await ctx.gateway.spendLogs(key.gateway_key_id!, key.created_at);
      const buckets = new Map<
        string,
        { model: string; day: string; n: number; inTok: number; outTok: number; cost: number }
      >();
      for (const log of logs) {
        const day = (log.startTime || new Date().toISOString()).slice(0, 10);
        const b = buckets.get(`${log.model}|${day}`) ?? {
          model: log.model,
          day,
          n: 0,
          inTok: 0,
          outTok: 0,
          cost: 0,
        };
        b.n += 1;
        b.inTok += log.promptTokens;
        b.outTok += log.completionTokens;
        b.cost += log.spendUsd;
        buckets.set(`${log.model}|${day}`, b);
      }
      for (const b of buckets.values()) {
        await ctx.db.query(
          `INSERT INTO ai_usage_ledger (user_id, player_ai_key_id, model_id, request_count, input_tokens, output_tokens, cost_usd, usage_window, gateway_reference)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (player_ai_key_id, model_id, usage_window) DO UPDATE
             SET request_count = EXCLUDED.request_count, input_tokens = EXCLUDED.input_tokens,
                 output_tokens = EXCLUDED.output_tokens, cost_usd = EXCLUDED.cost_usd, updated_at = now()`,
          [key.user_id, key.id, b.model, b.n, b.inTok, b.outTok, b.cost, b.day, key.key_alias],
        );
      }
      // Key-sharing heuristic: many distinct client IPs within a day.
      const dayAgo = Date.now() - 86_400_000;
      const ips = new Set(logs.filter((l) => l.ip && Date.parse(l.startTime) > dayAgo).map((l) => l.ip));
      if (key.status === 'active' && ips.size >= policy.keySharingIpThreshold) {
        await ctx.gateway.blockKey(key.gateway_key_id!);
        await ctx.db.query(
          `UPDATE player_ai_keys SET status = 'suspended', suspended_reason = 'auto:key_sharing' WHERE id = $1`,
          [key.id],
        );
        await raiseFlag(ctx.db, key.user_id, 'key_sharing', 'medium', ips.size, {
          keyId: key.id,
          distinctIps: ips.size,
        });
      }
      synced++;
    } catch (err) {
      if (err instanceof GatewayError)
        ctx.log.warn({ err: err.message, keyId: key.id }, 'usage sync failed for key');
      else throw err;
    }
  }
  return { synced, expired: expired.rowCount ?? 0 };
}
