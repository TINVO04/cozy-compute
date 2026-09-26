import { randomBytes } from 'node:crypto';
import {
  applyMultiplier,
  deliveryTimeLimitMs,
  rollFish,
  softCapMultiplier,
  startOfUtcDay,
  timedReward,
} from '@cozy/economy';
import {
  CAFE_CUSTOMERS,
  CAFE_INGREDIENTS,
  DELIVERY_DESTINATIONS,
  DELIVERY_PACKAGES,
  PLAYER_SPEED,
  TILE,
  ZONES,
  zoneCenter,
  type ActivityConfigMap,
  type ZoneId,
} from '@cozy/game-data';
import type { AppContext } from '../context.js';
import { withTx, type Queryable, type Tx } from '../db.js';
import { AppError, badRequest, conflict, notFound } from '../errors.js';
import { postLedger } from '../ledger.js';
import { metrics } from '../metrics.js';
import { checkTimingPatterns, raiseFlag } from './abuse.js';
import { completeOnboardingStep } from './players.js';

export type JobSlug = 'fishing' | 'delivery' | 'cafe';

interface RunRow {
  id: string;
  user_id: string;
  activity_slug: JobSlug;
  nonce: string;
  state: Record<string, unknown>;
  status: string;
  started_at: Date;
  expires_at: Date;
}

export async function activityConfig<K extends keyof ActivityConfigMap>(
  q: Queryable,
  slug: K,
): Promise<ActivityConfigMap[K]> {
  const r = await q.query<{ config: ActivityConfigMap[K]; enabled: boolean }>(
    'SELECT config, enabled FROM activities WHERE slug = $1',
    [slug],
  );
  const row = r.rows[0];
  if (!row) throw notFound('Unknown activity.');
  if (!row.enabled)
    throw new AppError(409, 'activity_disabled', 'This activity is closed for maintenance. Try another one!');
  return row.config;
}

/** Validates the authoritative position the realtime server last published for this player. */
async function requireAt(ctx: AppContext, userId: string, zone: ZoneId): Promise<void> {
  const pos = await ctx.positionOf(userId);
  const z = ZONES.find((x) => x.id === zone)!;
  const pad = TILE;
  const fresh = pos && ctx.now().getTime() - pos.at < 15_000 && pos.room === 'town';
  const inside =
    pos &&
    pos.x >= z.rect.x - pad &&
    pos.x < z.rect.x + z.rect.w + pad &&
    pos.y >= z.rect.y - pad &&
    pos.y < z.rect.y + z.rect.h + pad;
  if (!fresh || !inside) {
    throw new AppError(409, 'not_at_location', `Walk over to ${z.label} first.`, { zone });
  }
}

async function rewardedToday(q: Queryable, userId: string, slug: string, now: Date): Promise<number> {
  const r = await q.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM activity_runs WHERE user_id = $1 AND activity_slug = $2 AND status = 'completed' AND completed_at >= $3`,
    [userId, slug, startOfUtcDay(now)],
  );
  return r.rows[0]?.n ?? 0;
}

async function startRun(
  ctx: AppContext,
  userId: string,
  slug: JobSlug,
  ttlMs: number,
  state: Record<string, unknown>,
) {
  return withTx(ctx.db, async (tx) => {
    // One active run per activity. Starting again abandons the old run.
    await tx.query(
      `UPDATE activity_runs SET status = 'expired' WHERE user_id = $1 AND activity_slug = $2 AND status = 'active'`,
      [userId, slug],
    );
    const nonce = randomBytes(16).toString('base64url');
    const r = await tx.query<{ id: string; started_at: Date; expires_at: Date }>(
      `INSERT INTO activity_runs (user_id, activity_slug, nonce, state, started_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, started_at, expires_at`,
      [userId, slug, nonce, JSON.stringify(state), ctx.now(), new Date(ctx.now().getTime() + ttlMs)],
    );
    metrics.inc('activity_started_total', { activity: slug });
    const row = r.rows[0]!;
    return {
      runId: row.id,
      nonce,
      startedAt: row.started_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
    };
  });
}

/** Locks and validates a run for completion. Enforces ownership, nonce and one-time use. */
async function lockRun(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  slug: JobSlug,
  runId: string,
  nonce: string,
  now: Date,
): Promise<RunRow> {
  const r = await tx.query<RunRow>(`SELECT * FROM activity_runs WHERE id = $1 FOR UPDATE`, [runId]);
  const run = r.rows[0];
  if (!run || run.user_id !== userId || run.activity_slug !== slug)
    throw notFound('That activity run does not exist.');
  if (run.nonce !== nonce) {
    // Recorded on a separate connection so the flag survives the rollback of this transaction.
    await raiseFlag(ctx.db, userId, 'forged_completion', 'high', 50, { runId, slug });
    throw badRequest('invalid_nonce', 'This activity could not be verified.');
  }
  if (run.status !== 'active') throw conflict('run_closed', 'This activity has already ended.');
  if (run.expires_at.getTime() < now.getTime()) {
    await tx.query(`UPDATE activity_runs SET status = 'expired' WHERE id = $1`, [runId]);
    throw conflict('run_expired', 'Too slow! This activity timed out.');
  }
  return run;
}

async function finishRun(
  tx: Tx,
  run: RunRow,
  now: Date,
  outcome: {
    status: 'completed' | 'failed';
    result: Record<string, unknown>;
    coin: number;
    fame: number;
    reason: string;
  },
) {
  let ledgerId: number | null = null;
  if (outcome.coin > 0) {
    ledgerId = (
      await postLedger(tx, {
        userId: run.user_id,
        currency: 'coin',
        amount: outcome.coin,
        reason: outcome.reason,
        referenceId: run.id,
        idempotencyKey: `run:${run.id}:coin`,
        metadata: outcome.result,
      })
    ).id;
  }
  if (outcome.fame > 0) {
    await postLedger(tx, {
      userId: run.user_id,
      currency: 'fame',
      amount: outcome.fame,
      reason: outcome.reason,
      referenceId: run.id,
      idempotencyKey: `run:${run.id}:fame`,
    });
  }
  await tx.query(
    `UPDATE activity_runs SET status = $2, completed_at = $3, result = $4, reward_ledger_id = $5 WHERE id = $1`,
    [run.id, outcome.status, now, JSON.stringify(outcome.result), ledgerId],
  );
  metrics.inc('activity_finished_total', { activity: run.activity_slug, status: outcome.status });
  if (outcome.status === 'completed') {
    await completeOnboardingStep(tx, run.user_id, run.activity_slug);
    await checkTimingPatterns(tx, run.user_id, run.activity_slug);
  }
}

// ---------------------------------------------------------------- fishing

export async function startFishing(ctx: AppContext, userId: string) {
  const cfg = await activityConfig(ctx.db, 'fishing');
  await requireAt(ctx, userId, 'pier');
  const biteInMs = Math.round(cfg.biteMinMs + ctx.rng() * (cfg.biteMaxMs - cfg.biteMinMs));
  const biteAt = ctx.now().getTime() + biteInMs;
  const run = await startRun(ctx, userId, 'fishing', cfg.runTtlMs, { biteAt });
  return { ...run, biteInMs, reactionWindowMs: cfg.reactionWindowMs };
}

/** Network grace added to the reaction window so real players with latency are not punished. */
const LATENCY_GRACE_MS = 400;

export async function completeFishing(ctx: AppContext, userId: string, runId: string, nonce: string) {
  const cfg = await activityConfig(ctx.db, 'fishing');
  return withTx(ctx.db, async (tx) => {
    const now = ctx.now();
    const run = await lockRun(ctx, tx, userId, 'fishing', runId, nonce, now);
    const biteAt = Number(run.state.biteAt);
    const reactionMs = now.getTime() - biteAt;
    if (reactionMs < 0) {
      await finishRun(tx, run, now, {
        status: 'failed',
        result: { outcome: 'too_early' },
        coin: 0,
        fame: 0,
        reason: 'fishing',
      });
      return {
        outcome: 'too_early' as const,
        message: 'You yanked the line before anything bit. The fish are laughing.',
      };
    }
    if (reactionMs > cfg.reactionWindowMs + LATENCY_GRACE_MS) {
      await finishRun(tx, run, now, {
        status: 'failed',
        result: { outcome: 'got_away', reactionMs },
        coin: 0,
        fame: 0,
        reason: 'fishing',
      });
      return { outcome: 'got_away' as const, message: 'It got away. It will tell its friends about you.' };
    }
    const fish = rollFish(ctx.rng, Math.max(0, reactionMs - LATENCY_GRACE_MS / 2), cfg.reactionWindowMs);
    const mult = softCapMultiplier(
      await rewardedToday(tx, userId, 'fishing', now),
      cfg.dailySoftCap,
      cfg.overCapMultiplier,
    );
    const coin = applyMultiplier(fish.coin, mult);
    const fame = mult < 1 ? 0 : fish.fame;
    await finishRun(tx, run, now, {
      status: 'completed',
      result: { outcome: 'caught', fish: fish.id, reactionMs, coin, fame, tired: mult < 1 },
      coin,
      fame,
      reason: 'fishing',
    });
    return { outcome: 'caught' as const, fish, reactionMs, coin, fame, tired: mult < 1 };
  });
}

// ---------------------------------------------------------------- delivery

export async function startDelivery(ctx: AppContext, userId: string) {
  const cfg = await activityConfig(ctx.db, 'delivery');
  await requireAt(ctx, userId, 'delivery');
  const destination = DELIVERY_DESTINATIONS[Math.floor(ctx.rng() * DELIVERY_DESTINATIONS.length)]!;
  const pkg = DELIVERY_PACKAGES[Math.floor(ctx.rng() * DELIVERY_PACKAGES.length)]!;
  const from = zoneCenter('delivery');
  const to = zoneCenter(destination);
  // Manhattan distance approximates walking around buildings.
  const distancePx = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  const limitMs = deliveryTimeLimitMs(distancePx / TILE, cfg.msPerTile, cfg.minTimeMs);
  const minPossibleMs = Math.round((Math.hypot(from.x - to.x, from.y - to.y) / PLAYER_SPEED) * 1000 * 0.8);
  const run = await startRun(ctx, userId, 'delivery', limitMs + 5000, {
    destination,
    package: pkg,
    limitMs,
    minPossibleMs,
  });
  const zone = ZONES.find((z) => z.id === destination)!;
  return { ...run, destination, destinationLabel: zone.label, package: pkg, timeLimitMs: limitMs };
}

export async function completeDelivery(ctx: AppContext, userId: string, runId: string, nonce: string) {
  const cfg = await activityConfig(ctx.db, 'delivery');
  const pre = await ctx.db.query<{ state: { destination: ZoneId } }>(
    'SELECT state FROM activity_runs WHERE id = $1 AND user_id = $2',
    [runId, userId],
  );
  if (!pre.rows[0]) throw notFound('That activity run does not exist.');
  await requireAt(ctx, userId, pre.rows[0].state.destination);
  return withTx(ctx.db, async (tx) => {
    const now = ctx.now();
    const run = await lockRun(ctx, tx, userId, 'delivery', runId, nonce, now);
    const state = run.state as { destination: ZoneId; limitMs: number; minPossibleMs: number };
    const elapsedMs = now.getTime() - run.started_at.getTime();
    if (elapsedMs < state.minPossibleMs) {
      await raiseFlag(tx, userId, 'impossible_travel', 'high', 60, {
        runId,
        elapsedMs,
        minPossibleMs: state.minPossibleMs,
      });
      await finishRun(tx, run, now, {
        status: 'failed',
        result: { outcome: 'rejected', elapsedMs },
        coin: 0,
        fame: 0,
        reason: 'delivery',
      });
      return {
        outcome: 'rejected' as const,
        elapsedMs,
        message: 'That delivery could not be verified, so no reward was paid.',
      };
    }
    const base = timedReward(cfg.baseCoin, cfg.maxBonusCoin, elapsedMs, state.limitMs);
    if (base === 0) {
      await finishRun(tx, run, now, {
        status: 'failed',
        result: { outcome: 'late', elapsedMs },
        coin: 0,
        fame: 0,
        reason: 'delivery',
      });
      return {
        outcome: 'late' as const,
        elapsedMs,
        message: 'Late! The customer has already moved on with their life.',
      };
    }
    const mult = softCapMultiplier(
      await rewardedToday(tx, userId, 'delivery', now),
      cfg.dailySoftCap,
      cfg.overCapMultiplier,
    );
    const coin = applyMultiplier(base, mult);
    const fame = mult < 1 ? 0 : cfg.fame;
    await finishRun(tx, run, now, {
      status: 'completed',
      result: { outcome: 'delivered', elapsedMs, coin, fame },
      coin,
      fame,
      reason: 'delivery',
    });
    return { outcome: 'delivered' as const, elapsedMs, coin, fame, tired: mult < 1 };
  });
}

// ---------------------------------------------------------------- cafe

export async function startCafe(ctx: AppContext, userId: string) {
  const cfg = await activityConfig(ctx.db, 'cafe');
  await requireAt(ctx, userId, 'cafe');
  const ids = CAFE_INGREDIENTS.map((i) => i.id);
  const order = Array.from({ length: cfg.steps }, () => ids[Math.floor(ctx.rng() * ids.length)]!);
  const customer = CAFE_CUSTOMERS[Math.floor(ctx.rng() * CAFE_CUSTOMERS.length)]!;
  const run = await startRun(ctx, userId, 'cafe', cfg.timeLimitMs + 3000, {
    order,
    limitMs: cfg.timeLimitMs,
  });
  return { ...run, customer, order, ingredients: CAFE_INGREDIENTS, timeLimitMs: cfg.timeLimitMs };
}

export async function completeCafe(
  ctx: AppContext,
  userId: string,
  runId: string,
  nonce: string,
  sequence: string[],
) {
  const cfg = await activityConfig(ctx.db, 'cafe');
  return withTx(ctx.db, async (tx) => {
    const now = ctx.now();
    const run = await lockRun(ctx, tx, userId, 'cafe', runId, nonce, now);
    const state = run.state as { order: string[]; limitMs: number };
    const elapsedMs = now.getTime() - run.started_at.getTime();
    // Humans need at least ~250ms per ingredient to read and click.
    if (elapsedMs < state.order.length * 250) {
      await raiseFlag(tx, userId, 'impossible_speed', 'medium', 30, { runId, elapsedMs });
    }
    const correct = sequence.length === state.order.length && sequence.every((s, i) => s === state.order[i]);
    if (!correct) {
      await finishRun(tx, run, now, {
        status: 'failed',
        result: { outcome: 'wrong_order', elapsedMs },
        coin: 0,
        fame: 0,
        reason: 'cafe',
      });
      return {
        outcome: 'wrong_order' as const,
        expected: state.order,
        message: 'The customer sips it, pauses, and slowly walks away.',
      };
    }
    const base = timedReward(cfg.baseCoin, cfg.maxBonusCoin, elapsedMs, state.limitMs);
    if (base === 0) {
      await finishRun(tx, run, now, {
        status: 'failed',
        result: { outcome: 'late', elapsedMs },
        coin: 0,
        fame: 0,
        reason: 'cafe',
      });
      return { outcome: 'late' as const, message: 'The customer fell asleep waiting. Nobody gets paid.' };
    }
    const mult = softCapMultiplier(
      await rewardedToday(tx, userId, 'cafe', now),
      cfg.dailySoftCap,
      cfg.overCapMultiplier,
    );
    const coin = applyMultiplier(base, mult);
    const fame = mult < 1 ? 0 : cfg.fame;
    await finishRun(tx, run, now, {
      status: 'completed',
      result: { outcome: 'served', elapsedMs, coin, fame },
      coin,
      fame,
      reason: 'cafe',
    });
    return { outcome: 'served' as const, elapsedMs, coin, fame, tired: mult < 1 };
  });
}

export async function cancelRun(ctx: AppContext, userId: string, runId: string) {
  await ctx.db.query(
    `UPDATE activity_runs SET status = 'expired' WHERE id = $1 AND user_id = $2 AND status = 'active'`,
    [runId, userId],
  );
}

export async function activitySummary(ctx: AppContext, userId: string) {
  const now = ctx.now();
  const rows = await ctx.db.query<{
    slug: string;
    enabled: boolean;
    config: Record<string, number>;
    today: number;
    total: number;
  }>(
    `SELECT a.slug, a.enabled, a.config,
            count(r.*) FILTER (WHERE r.completed_at >= $2)::int AS today,
            count(r.*)::int AS total
       FROM activities a
       LEFT JOIN activity_runs r ON r.activity_slug = a.slug AND r.user_id = $1 AND r.status = 'completed'
      WHERE a.type = 'job'
      GROUP BY a.slug, a.enabled, a.config
      ORDER BY a.slug`,
    [userId, startOfUtcDay(now)],
  );
  return rows.rows.map((r) => ({
    slug: r.slug,
    enabled: r.enabled,
    today: r.today,
    total: r.total,
    dailySoftCap: r.config.dailySoftCap ?? null,
  }));
}
