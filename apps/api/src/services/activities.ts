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
  BOATS,
  FISH,
  FISHING_RODS,
  PLAYER_SPEED,
  TILE,
  ZONES,
  zoneCenter,
  calculateFishSize,
  getFishShadowTier,
  oceanZoneAt,
  rollFishingSequence,
  fishingGround,
  fishingConditions,
  fishForConditions,
  type ActivityConfigMap,
  type FishShadowTier,
  type RodConfig,
  type ZoneId,
} from '@cozy/game-data';
import type { AppContext } from '../context.js';
import { withTx, type Queryable, type Tx } from '../db.js';
import { AppError, badRequest, conflict, notFound } from '../errors.js';
import { postLedger } from '../ledger.js';
import { metrics } from '../metrics.js';
import { worldWeather } from './weather.js';
import { checkTimingPatterns, raiseFlag } from './abuse.js';
import { completeOnboardingStep, resolvedAppearance } from './players.js';

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

  const pos = await ctx.positionOf(userId);
  const isOcean = Boolean(pos && pos.room === 'ocean');

  if (!isOcean) {
    await requireAt(ctx, userId, 'pier');
  } else {
    // In ocean, player must have an equipped boat
    if (!pos || ctx.now().getTime() - pos.at >= 15_000) {
      throw new AppError(409, 'not_at_location', 'Hãy trở lại thuyền trước khi thả câu.');
    }
    const equippedBoatRes = await ctx.db.query<{ item_id: string }>(
      `SELECT item_id FROM inventory_items WHERE user_id = $1 AND equipped_slot = 'boat'`,
      [userId],
    );
    const boatId = equippedBoatRes.rows[0]?.item_id;
    if (!boatId || !BOATS[boatId]) {
      throw new AppError(409, 'no_boat_equipped', 'Bạn cần trang bị thuyền trước khi câu cá ngoài khơi.');
    }
    const boat = BOATS[boatId];
    // Check if in abyssal trench without tier 4 boat
    const oceanZone = pos ? oceanZoneAt(pos.x, pos.y) : null;
    if (oceanZone === 'abyssal_trench' && boat?.seaZoneAccess !== 'abyss') {
      throw new AppError(
        409,
        'abyss_access_denied',
        'Vùng nước sâu hạ lưu có dòng chảy mạnh. Bạn cần Tàu Viễn Dương Hoàng Kim để câu cá tại đây.',
      );
    }
  }

  // Authoritative check on equipped rod
  const equippedRodRes = await ctx.db.query<{ item_id: string }>(
    `SELECT item_id FROM inventory_items WHERE user_id = $1 AND equipped_slot = 'rod'`,
    [userId],
  );
  const equippedRodId = equippedRodRes.rows[0]?.item_id ?? 'rod_twig';
  const rod: RodConfig = FISHING_RODS[equippedRodId] ?? FISHING_RODS['rod_twig']!;

  // Reaction window adjusted by rod quality
  const conditions = fishingConditions(await worldWeather(ctx));
  const reactionWindowMs = Math.max(
    700,
    Math.round((cfg.reactionWindowMs + (rod.reactionBonusMs ?? 0)) * conditions.reactionMultiplier),
  );

  // Pre-roll fish candidate for authoritative shadow tier
  const oceanZone = isOcean && pos ? oceanZoneAt(pos.x, pos.y) : null;
  const { fish: fishTable, bonus: seaZoneBonus } = fishingGround(
    isOcean ? (oceanZone ?? 'angler_dock') : 'town_pond',
  );
  const pendingFish = rollFish(
    ctx.rng,
    0,
    reactionWindowMs,
    fishForConditions(fishTable, conditions),
    rod.shadowBonus + seaZoneBonus,
  );

  // Read current size overrides from settings
  const fishSizesRes = await ctx.db.query<{ value: unknown }>(
    `SELECT value FROM settings WHERE key = 'fish_sizes'`,
  );
  const rawSizes = fishSizesRes.rows[0]?.value;
  const sizeOverrides = (typeof rawSizes === 'string' ? JSON.parse(rawSizes) : rawSizes) as
    Record<string, { minSizeCm: number; maxSizeCm: number }> | undefined;
  const fishOverride = sizeOverrides?.[pendingFish.id];
  const effectiveFish = fishOverride
    ? { ...pendingFish, minSizeCm: fishOverride.minSizeCm, maxSizeCm: fishOverride.maxSizeCm }
    : pendingFish;
  const calculatedSize = calculateFishSize(ctx.rng, effectiveFish);
  const shadowTier = getFishShadowTier(calculatedSize.sizeCm, pendingFish.rarity, pendingFish.habitat);

  // Play Together bite sequence: random 7-12s wait before shadow appears, then 4 to 8 nibbles before BITE!
  const nibbleCount = 4 + Math.floor(ctx.rng() * 5); // 4, 5, 6, 7, or 8 nibbles
  const rawShadowDelayMs = 7000 + Math.floor(ctx.rng() * 5001); // 7000 to 12000 ms (7-12s)
  const speedFactor = 1 - (rod.biteSpeedBonus ?? 0);
  const shadowDelayMs = Math.round(rawShadowDelayMs * speedFactor * conditions.waitMultiplier);
  const { nibbleOffsetsMs, nibbleOrbitTurns, biteInMs } = rollFishingSequence(
    ctx.rng,
    shadowDelayMs,
    nibbleCount,
  );
  const biteAt = ctx.now().getTime() + biteInMs;

  const runTtlMs = Math.max(
    cfg.runTtlMs,
    biteInMs + reactionWindowMs + REELING_MASH_ALLOWANCE_MS + LATENCY_GRACE_MS + 1000,
  );
  const run = await startRun(ctx, userId, 'fishing', runTtlMs, {
    biteAt,
    pendingFishId: pendingFish.id,
    shadowTier,
    nibbleCount,
    nibbleOffsetsMs,
    nibbleOrbitTurns,
    equippedRodId,
    reactionWindowMs,
    isOcean,
    oceanZone,
    conditions,
  });

  return {
    ...run,
    biteInMs,
    reactionWindowMs,
    shadowTier,
    nibbleCount,
    shadowDelayMs,
    nibbleOffsetsMs,
    nibbleOrbitTurns,
    equippedRod: rod,
    conditions,
  };
}

/** Network grace added to the reaction window so real players with latency are not punished. */
const LATENCY_GRACE_MS = 400;
/** Extra allowance for active tug-of-war space mash minigame. */
const REELING_MASH_ALLOWANCE_MS = 2000;

export async function completeFishing(ctx: AppContext, userId: string, runId: string, nonce: string) {
  const cfg = await activityConfig(ctx.db, 'fishing');
  return withTx(ctx.db, async (tx) => {
    const now = ctx.now();
    const run = await lockRun(ctx, tx, userId, 'fishing', runId, nonce, now);
    const biteAt = Number(run.state.biteAt);
    const stateWindowMs = Number(run.state.reactionWindowMs) || cfg.reactionWindowMs;
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
        message: 'Bạn đã giật cần quá sớm khi cá mới chỉ rỉa mồi! Lũ cá đang cười khúc khích.',
      };
    }
    if (reactionMs > stateWindowMs + REELING_MASH_ALLOWANCE_MS + LATENCY_GRACE_MS) {
      await finishRun(tx, run, now, {
        status: 'failed',
        result: { outcome: 'got_away', reactionMs },
        coin: 0,
        fame: 0,
        reason: 'fishing',
      });
      return {
        outcome: 'got_away' as const,
        message:
          'Cá đã giằng co giật đứt dây trốn thoát! Lần sau hãy ấn Space liên tục nhanh và đều tay hơn nhé.',
      };
    }

    const pendingId = (run.state.pendingFishId as string | undefined) ?? null;
    const fish =
      (pendingId ? FISH.find((f) => f.id === pendingId) : null) ??
      rollFish(ctx.rng, Math.max(0, reactionMs - LATENCY_GRACE_MS / 2), stateWindowMs);

    const fishSizesRes = await tx.query<{ value: unknown }>(
      `SELECT value FROM settings WHERE key = 'fish_sizes'`,
    );
    const rawSizes = fishSizesRes.rows[0]?.value;
    const sizeOverrides = (typeof rawSizes === 'string' ? JSON.parse(rawSizes) : rawSizes) as
      Record<string, { minSizeCm: number; maxSizeCm: number }> | undefined;
    const fishOverride = sizeOverrides?.[fish.id];
    const effectiveFish = fishOverride
      ? { ...fish, minSizeCm: fishOverride.minSizeCm, maxSizeCm: fishOverride.maxSizeCm }
      : fish;
    const size = calculateFishSize(ctx.rng, effectiveFish);
    const shadowTier =
      (run.state.shadowTier as FishShadowTier | undefined) ??
      getFishShadowTier(size.sizeCm, fish.rarity, fish.habitat);

    // Dynamic catch chance: spamming space to 100% does not guarantee catch (can miss/escape)
    const equippedRodId = (run.state.equippedRodId as string | undefined) ?? 'rod_twig';
    const BASE_CATCH_RATES: Record<string, number> = {
      rod_twig: 0.7, // 30% xịt
      rod_wooden: 0.78, // 22% xịt
      rod_fiberglass: 0.85, // 15% xịt
      rod_pro_carbon: 0.92, // 8% xịt
      rod_golden_legend: 0.96, // 4% xịt
      rod_abyssal: 0.98, // 2% xịt
    };
    let catchRate = BASE_CATCH_RATES[equippedRodId] ?? 0.75;
    if (shadowTier >= 5) catchRate -= 0.08;
    else if (shadowTier >= 3) catchRate -= 0.04;
    catchRate = Math.max(0.5, Math.min(0.98, catchRate));

    if (ctx.rng() > catchRate) {
      await finishRun(tx, run, now, {
        status: 'failed',
        result: { outcome: 'escaped', reactionMs },
        coin: 0,
        fame: 0,
        reason: 'fishing',
      });
      return {
        outcome: 'escaped' as const,
        message: 'Câu xịt rồi! Dù đã cố gắng giật cần nhưng cá đã giãy mạnh và sẩy mất!',
      };
    }

    // Track compendium entry and personal size records
    const existing = await tx.query<{ max_size_cm: string }>(
      `SELECT max_size_cm FROM fish_journal WHERE user_id = $1 AND species_id = $2`,
      [userId, fish.id],
    );
    const isFirstCatch = existing.rows.length === 0;
    const currentMax = isFirstCatch ? 0 : parseFloat(existing.rows[0]!.max_size_cm);
    const isRecord = isFirstCatch || size.sizeCm > currentMax;

    await tx.query(
      `INSERT INTO fish_journal (user_id, species_id, count, max_size_cm, max_weight_kg, first_caught_at, last_caught_at)
       VALUES ($1, $2, 1, $3, $4, $5, $5)
       ON CONFLICT (user_id, species_id) DO UPDATE SET
         count = fish_journal.count + 1,
         max_size_cm = GREATEST(fish_journal.max_size_cm, EXCLUDED.max_size_cm),
         max_weight_kg = GREATEST(fish_journal.max_weight_kg, EXCLUDED.max_weight_kg),
         last_caught_at = EXCLUDED.last_caught_at`,
      [userId, fish.id, size.sizeCm, size.weightKg, now],
    );

    // Unhold any other fish currently in backpack
    await tx.query(`UPDATE user_fish_inventory SET is_held = false WHERE user_id = $1`, [userId]);

    // Add caught fish to user's backpack and mark it as held on hands
    const invRes = await tx.query<{ id: string }>(
      `INSERT INTO user_fish_inventory (user_id, species_id, size_cm, weight_kg, size_category, is_held, caught_at)
       VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING id`,
      [userId, fish.id, size.sizeCm, size.weightKg, size.sizeCategory, now],
    );
    const backpackFishId = invRes.rows[0]?.id;
    await tx.query(
      'INSERT INTO fishing_catches(id,user_id,species_id,weight_kg,caught_at) VALUES($1,$2,$3,$4,$5)',
      [backpackFishId, userId, fish.id, size.weightKg, now],
    );

    // Set held fish on profile and publish appearance
    const held = {
      speciesId: fish.id,
      sizeCm: size.sizeCm,
    };
    await tx.query(`UPDATE profiles SET held_fish = $2, updated_at = now() WHERE user_id = $1`, [
      userId,
      JSON.stringify(held),
    ]);

    const appearance = await resolvedAppearance(tx, userId);
    await ctx.redis.publish('player:appearance', JSON.stringify({ userId, appearance, statusText: '' }));

    const mult = softCapMultiplier(
      await rewardedToday(tx, userId, 'fishing', now),
      cfg.dailySoftCap,
      cfg.overCapMultiplier,
    );
    const coin = applyMultiplier(fish.coin, mult);
    const fame = mult < 1 ? 0 : fish.fame;
    await finishRun(tx, run, now, {
      status: 'completed',
      result: {
        outcome: 'caught',
        fish: fish.id,
        reactionMs,
        coin,
        fame,
        tired: mult < 1,
        sizeCm: size.sizeCm,
        weightKg: size.weightKg,
        sizeCategory: size.sizeCategory,
        shadowTier,
        isFirstCatch,
        isRecord,
        backpackFishId,
      },
      coin,
      fame,
      reason: 'fishing',
    });
    return {
      outcome: 'caught' as const,
      fish,
      reactionMs,
      coin,
      fame,
      tired: mult < 1,
      sizeCm: size.sizeCm,
      weightKg: size.weightKg,
      sizeCategory: size.sizeCategory,
      shadowTier,
      isFirstCatch,
      isRecord,
      backpackFishId,
      appearance,
      heldFish: held,
    };
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

export interface FishJournalEntry {
  speciesId: string;
  count: number;
  maxSizeCm: number;
  maxWeightKg: number;
  firstCaughtAt: string;
  lastCaughtAt: string;
}

export async function getFishJournal(ctx: AppContext, userId: string): Promise<FishJournalEntry[]> {
  const r = await ctx.db.query<{
    species_id: string;
    count: number;
    max_size_cm: string;
    max_weight_kg: string;
    first_caught_at: Date;
    last_caught_at: Date;
  }>(
    `SELECT species_id, count, max_size_cm, max_weight_kg, first_caught_at, last_caught_at
       FROM fish_journal
      WHERE user_id = $1
      ORDER BY last_caught_at DESC`,
    [userId],
  );
  return r.rows.map((row) => ({
    speciesId: row.species_id,
    count: row.count,
    maxSizeCm: parseFloat(row.max_size_cm),
    maxWeightKg: parseFloat(row.max_weight_kg),
    firstCaughtAt: row.first_caught_at.toISOString(),
    lastCaughtAt: row.last_caught_at.toISOString(),
  }));
}
