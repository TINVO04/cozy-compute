import { randomBytes } from 'node:crypto';
import {
  ANIMALS,
  BAC_SAU_SHOP_ITEMS,
  computeAnimalGrowthStage,
  computeAnimalHunger,
  CROPS,
  DAILY_MARKET_CONTRACTS,
  getPlotUnlockPrice,
  POND_FISHES,
  TOTAL_FARM_PLOTS,
  WAREHOUSE_UPGRADE_TIERS,
  isPlotMoist,
  isWeatherRainy,
  FEED_TROUGHS,
  simulateTroughFeeding,
  getAnimalStarvationSeverity,
  facilityForAnimalType,
  BREEDING_HAPPINESS_COST,
  canBreedAnimals,
  getAnimalBreedingStatus,
  BASE_LIVESTOCK_CAPACITY,
  getNextLivestockCapacityTier,
  getNextTroughUpgrade,
  type LivestockFacilityKey,
  type AnimalType,
  type AnimalDef,
  type BreedingCandidate,
  type CropId,
  type CropGrowthStage,
} from '@cozy/game-data';
import { worldWeather } from './weather.js';
import { hashPassword, verifyPassword } from '../auth.js';
import type { AppContext } from '../context.js';
import { withTx, type Queryable, type Tx } from '../db.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../errors.js';
import { postLedger } from '../ledger.js';
import { gameplayAction } from './gameplay-actions.js';

export interface FarmRecord {
  id: string;
  user_id: string;
  password_hash: string | null;
  is_public: boolean;
  warehouse_capacity: number;
  livestock_capacity?: number;
  created_at: Date;
  updated_at: Date;
  access_version: string;
}

export interface FarmPlotRow {
  id: string;
  farm_id: string;
  plot_index: number;
  is_unlocked: boolean;
  unlock_price: number;
  crop_id: string | null;
  planted_at: Date | null;
  watered_at: Date | null;
  is_fertilized: boolean;
  growth_stage: string;
  is_tilled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface FarmAnimalRow {
  id: string;
  farm_id: string;
  animal_type: string;
  name: string;
  fed_at: Date | null;
  happiness: number;
  last_yield_at: Date | null;
  growth_accum_sec?: number;
  bred_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface FarmWarehouseItemRow {
  id: string;
  farm_id: string;
  item_id: string;
  category: 'crop' | 'animal_product' | 'seed' | 'supply';
  quantity: number;
}

export interface FarmPondFishRow {
  id: string;
  farm_id: string;
  fish_species: string;
  stocked_at: Date;
  current_weight_kg: string | number;
  fed_at: Date | null;
  growth_stage: string;
}

export interface FarmFeedTroughRow {
  id: string;
  farm_id: string;
  facility: LivestockFacilityKey;
  amount: number;
  capacity: number;
  upgrade_level?: number;
  updated_at: Date;
}

export function computeCropStage(
  cropId: string | null,
  plantedAt: Date | null,
  isFertilized: boolean,
  currentTimeMs: number,
): CropGrowthStage {
  if (!cropId || !plantedAt) return 'empty';
  const def = CROPS[cropId as CropId];
  if (!def) return 'empty';

  let elapsedSec = Math.max(0, (currentTimeMs - plantedAt.getTime()) / 1000);
  if (isFertilized) {
    elapsedSec *= 2; // Fertilized crops grow at 2x rate (-50% time)
  }

  if (elapsedSec >= def.stages.matureAtSec) return 'mature';
  if (elapsedSec >= def.stages.bloomingAtSec) return 'blooming';
  if (elapsedSec >= def.stages.sproutAtSec) return 'sprout';
  return 'seed';
}

export function computePondFishWeight(
  fish: FarmPondFishRow,
  currentTimeMs: number,
): { weightKg: number; stage: string } {
  const def = Object.values(POND_FISHES).find((f) => f.species === fish.fish_species);
  if (!def) return { weightKg: 0.2, stage: 'fingerling' };
  const elapsed = fish.fed_at ? Math.max(0, currentTimeMs - new Date(fish.fed_at).getTime()) / 1000 : 0;
  const weightKg = Number(
    (0.2 + Math.min(1, elapsed / def.growthDurationSec) * (def.marketWeightMaxKg - 0.2)).toFixed(2),
  );
  const stage =
    weightKg >= def.stages.specialtyWeightKg
      ? 'specialty'
      : weightKg >= def.stages.adultWeightKg
        ? 'adult'
        : weightKg >= def.stages.juvenileWeightKg
          ? 'juvenile'
          : 'fingerling';

  return { weightKg, stage };
}

export async function getOrCreateFarm(q: Queryable, userId: string): Promise<FarmRecord> {
  const existing = await q.query<FarmRecord>('SELECT * FROM farms WHERE user_id = $1', [userId]);
  if (existing.rows[0]) return existing.rows[0];

  const inserted = await q.query<FarmRecord>(
    `INSERT INTO farms (user_id, is_public, warehouse_capacity)
     VALUES ($1, true, 100)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING *`,
    [userId],
  );
  if (!inserted.rows[0]) {
    const concurrent = await q.query<FarmRecord>('SELECT * FROM farms WHERE user_id=$1', [userId]);
    return concurrent.rows[0]!;
  }
  const farm = inserted.rows[0];

  // Provision 36 plots
  await q.query(
    `INSERT INTO farm_plots (farm_id, plot_index, is_unlocked, unlock_price, growth_stage, is_tilled)
     SELECT
       $1,
       s.idx,
       CASE WHEN s.idx < 4 THEN true ELSE false END,
       CASE
         WHEN s.idx < 4 THEN 0
         WHEN s.idx BETWEEN 4 AND 7 THEN 250
         WHEN s.idx BETWEEN 8 AND 11 THEN 500
         WHEN s.idx BETWEEN 12 AND 15 THEN 1000
         WHEN s.idx BETWEEN 16 AND 19 THEN 1500
         WHEN s.idx BETWEEN 20 AND 23 THEN 2500
         WHEN s.idx BETWEEN 24 AND 27 THEN 3500
         WHEN s.idx BETWEEN 28 AND 31 THEN 5000
         ELSE 7500
       END,
       'empty',
       false
     FROM generate_series(0, 35) AS s(idx)
     ON CONFLICT (farm_id, plot_index) DO NOTHING`,
    [farm.id],
  );

  // Provision 4 feed troughs if not already existing
  await q.query(
    `INSERT INTO farm_feed_troughs (farm_id, facility, amount, capacity)
     VALUES
       ($1, 'poultry', 0, 40),
       ($1, 'cattle', 0, 30),
       ($1, 'pig', 0, 35),
       ($1, 'goat', 0, 30)
     ON CONFLICT (farm_id, facility) DO NOTHING`,
    [farm.id],
  );

  // No hardcoded starter animals: animals must be bought in shop and raised
  return farm;
}

export async function catchUpTroughsAndAnimals(q: Queryable, farmId: string, nowMs: number) {
  const troughsRes = await q.query<FarmFeedTroughRow>('SELECT * FROM farm_feed_troughs WHERE farm_id = $1', [
    farmId,
  ]);
  if (troughsRes.rows.length === 0) return;

  const animalsRes = await q.query<FarmAnimalRow>('SELECT * FROM farm_animals WHERE farm_id = $1', [farmId]);
  if (animalsRes.rows.length === 0) return;

  const troughsMap: Record<
    LivestockFacilityKey,
    { facility: LivestockFacilityKey; amount: number; capacity: number; updatedAt?: number }
  > = {
    poultry: { facility: 'poultry', amount: 0, capacity: 40 },
    cattle: { facility: 'cattle', amount: 0, capacity: 30 },
    pig: { facility: 'pig', amount: 0, capacity: 35 },
    goat: { facility: 'goat', amount: 0, capacity: 30 },
  };

  for (const r of troughsRes.rows) {
    if (r.facility in troughsMap) {
      troughsMap[r.facility] = {
        facility: r.facility,
        amount: r.amount,
        capacity: r.capacity,
        updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : undefined,
      };
    }
  }

  const catchUpAnimals = animalsRes.rows.map((a) => ({
    id: a.id,
    type: a.animal_type as AnimalType,
    createdAt: new Date(a.created_at).getTime(),
    fedAt: a.fed_at ? new Date(a.fed_at).getTime() : null,
    growthAccumSec: a.growth_accum_sec ?? 0,
    lastYieldAt: a.last_yield_at ? new Date(a.last_yield_at).getTime() : null,
    happiness: a.happiness,
  }));

  const simulation = simulateTroughFeeding(catchUpAnimals, troughsMap, nowMs);

  for (const [fac, count] of Object.entries(simulation.mealsConsumed)) {
    if (count > 0) {
      const t = simulation.updatedTroughs[fac as LivestockFacilityKey];
      await q.query(
        'UPDATE farm_feed_troughs SET amount = $1, updated_at = $2 WHERE farm_id = $3 AND facility = $4',
        [t.amount, new Date(nowMs), farmId, fac],
      );
    }
  }

  for (const a of simulation.updatedAnimals) {
    const orig = catchUpAnimals.find((o) => o.id === a.id);
    if (
      orig &&
      (orig.fedAt !== a.fedAt || orig.growthAccumSec !== a.growthAccumSec || orig.happiness !== a.happiness)
    ) {
      await q.query(
        'UPDATE farm_animals SET fed_at = $1, growth_accum_sec = $2, happiness = $3, updated_at = $4 WHERE id = $5',
        [a.fedAt ? new Date(a.fedAt) : null, a.growthAccumSec, a.happiness, new Date(nowMs), a.id],
      );
    }
  }
}

export async function getFarmFullState(ctx: AppContext, userId: string) {
  const farm = await getOrCreateFarm(ctx.db, userId);
  const now = ctx.now().getTime();
  const weather = await worldWeather(ctx);
  const isRaining = isWeatherRainy(weather);

  if (isRaining) {
    // When it rains, natural rainfall waters all outdoor crops actively planted
    await ctx.db.query(
      `UPDATE farm_plots
       SET watered_at = $1, is_tilled = true, updated_at = $1
       WHERE farm_id = $2 AND crop_id IS NOT NULL AND (watered_at IS NULL OR watered_at < $1 - INTERVAL '30 minutes')`,
      [new Date(now), farm.id],
    );
  }

  // Offline simulation catch-up for feed troughs
  await catchUpTroughsAndAnimals(ctx.db, farm.id, now);

  const plotsRes = await ctx.db.query<FarmPlotRow>(
    'SELECT * FROM farm_plots WHERE farm_id = $1 ORDER BY plot_index ASC',
    [farm.id],
  );

  const plots = plotsRes.rows.map((p) => {
    const stage = p.crop_id ? computeCropStage(p.crop_id, p.planted_at, p.is_fertilized, now) : 'empty';
    const isWatered = isPlotMoist(p.watered_at, now, isRaining);
    return {
      id: p.id,
      plotIndex: p.plot_index,
      isUnlocked: p.is_unlocked,
      unlockPrice: p.unlock_price,
      cropId: p.crop_id,
      plantedAt: p.planted_at,
      wateredAt: p.watered_at ?? (isRaining ? new Date(now).toISOString() : null),
      isWatered,
      isFertilized: p.is_fertilized,
      isTilled: p.is_tilled || isRaining,
      stage,
      growthStage: stage,
    };
  });

  const troughsRes = await ctx.db.query<FarmFeedTroughRow>(
    'SELECT * FROM farm_feed_troughs WHERE farm_id = $1',
    [farm.id],
  );
  const troughs: Record<
    LivestockFacilityKey,
    {
      facility: LivestockFacilityKey;
      label: string;
      penName: string;
      icon: string;
      feedItemId: string;
      feedName: string;
      amount: number;
      capacity: number;
      upgradeLevel: number;
      nextUpgrade: { level: number; capacity: number; costCoins: number } | null;
    }
  > = {
    poultry: {
      ...FEED_TROUGHS.poultry,
      amount: 0,
      upgradeLevel: 1,
      nextUpgrade: getNextTroughUpgrade('poultry', 1),
    },
    cattle: {
      ...FEED_TROUGHS.cattle,
      amount: 0,
      upgradeLevel: 1,
      nextUpgrade: getNextTroughUpgrade('cattle', 1),
    },
    pig: {
      ...FEED_TROUGHS.pig,
      amount: 0,
      upgradeLevel: 1,
      nextUpgrade: getNextTroughUpgrade('pig', 1),
    },
    goat: {
      ...FEED_TROUGHS.goat,
      amount: 0,
      upgradeLevel: 1,
      nextUpgrade: getNextTroughUpgrade('goat', 1),
    },
  };

  for (const r of troughsRes.rows) {
    if (r.facility in troughs) {
      troughs[r.facility].amount = r.amount;
      troughs[r.facility].capacity = r.capacity;
      const lvl = r.upgrade_level ?? 1;
      troughs[r.facility].upgradeLevel = lvl;
      troughs[r.facility].nextUpgrade = getNextTroughUpgrade(r.facility, lvl);
    }
  }

  const animalsRes = await ctx.db.query<FarmAnimalRow>(
    'SELECT * FROM farm_animals WHERE farm_id = $1 ORDER BY created_at ASC',
    [farm.id],
  );
  const animals = animalsRes.rows.map((a) => {
    const growth = computeAnimalGrowthStage(
      a.animal_type,
      a.created_at,
      now,
      a.fed_at,
      a.growth_accum_sec ?? 0,
    );
    const isAdult = growth.stage === 'adult';
    const hunger = computeAnimalHunger(a.animal_type, a.fed_at, a.last_yield_at, now, isAdult, a.created_at);
    const def = Object.values(ANIMALS).find((d) => d.type === a.animal_type);
    const severity = getAnimalStarvationSeverity(
      hunger.isDead,
      hunger.isHungry,
      hunger.starvationRemainingSec,
    );
    const facility = facilityForAnimalType(a.animal_type);

    const breedingCandidate: BreedingCandidate = {
      id: a.id,
      type: a.animal_type as AnimalType,
      displayName: growth.displayName,
      stage: growth.stage,
      happiness: hunger.isDead ? 0 : a.happiness,
      isDead: hunger.isDead,
      isHungry: hunger.isHungry,
      bredAt: a.bred_at ? new Date(a.bred_at).getTime() : null,
    };
    const breedingStatus = getAnimalBreedingStatus(breedingCandidate, now);

    return {
      id: a.id,
      type: a.animal_type,
      name: a.name,
      facility,
      createdAt: a.created_at,
      fedAt: a.fed_at,
      growthAccumSec: a.growth_accum_sec ?? 0,
      happiness: hunger.isDead ? 0 : a.happiness,
      lastYieldAt: a.last_yield_at,
      bredAt: a.bred_at ?? null,
      breedingStatus,
      stage: growth.stage,
      progressPercent: growth.progressPercent,
      remainingSec: growth.remainingSec,
      sellPrice: growth.sellPrice,
      displayName: growth.displayName,
      isHungry: hunger.isHungry,
      hungerRemainingSec: hunger.hungerRemainingSec,
      canYield: hunger.canYield,
      isDead: hunger.isDead,
      starvationRemainingSec: hunger.starvationRemainingSec,
      severity,
      feedItemId: def?.feedItemId ?? 'feed_grain',
      yieldItemId: def?.yieldItemId ?? 'yield_egg',
    };
  });

  const criticalAnimals = animals.filter((a) => a.severity === 'critical');
  const deadAnimals = animals.filter((a) => a.isDead);
  const hungryAnimals = animals.filter((a) => a.isHungry && !a.isDead);

  const starvationAlerts = {
    criticalCount: criticalAnimals.length,
    deadCount: deadAnimals.length,
    hungryCount: hungryAnimals.length,
    criticalAnimals: criticalAnimals.map((a) => ({
      id: a.id,
      name: a.displayName,
      type: a.type,
      facility: a.facility,
      starvationRemainingSec: a.starvationRemainingSec,
    })),
  };

  const warehouseRes = await ctx.db.query<FarmWarehouseItemRow>(
    'SELECT * FROM farm_warehouse_items WHERE farm_id = $1 ORDER BY created_at ASC',
    [farm.id],
  );
  const warehouseItems = warehouseRes.rows.map((w) => ({
    id: w.id,
    itemId: w.item_id,
    category: w.category,
    tab:
      w.category === 'crop'
        ? 'crops'
        : w.category === 'animal_product'
          ? 'animal_products'
          : w.category === 'seed' || w.item_id.startsWith('stock_')
            ? 'seeds_stocks'
            : 'supplies',
    quantity: w.quantity,
  }));

  const pondRes = await ctx.db.query<FarmPondFishRow>(
    'SELECT * FROM farm_pond_fishes WHERE farm_id = $1 ORDER BY stocked_at ASC',
    [farm.id],
  );
  const pondFishes = pondRes.rows.map((f) => {
    const dynamic = computePondFishWeight(f, now);
    return {
      id: f.id,
      species: f.fish_species,
      stockedAt: f.stocked_at,
      weightKg: dynamic.weightKg,
      stage: dynamic.stage,
      fedAt: f.fed_at,
    };
  });

  return {
    farm: {
      id: farm.id,
      ownerId: farm.user_id,
      isPublic: farm.is_public,
      hasPassword: Boolean(farm.password_hash),
    },
    isRaining,
    plots,
    animals,
    livestockCapacity: farm.livestock_capacity ?? BASE_LIVESTOCK_CAPACITY,
    nextCapacityUpgrade: getNextLivestockCapacityTier(farm.livestock_capacity ?? BASE_LIVESTOCK_CAPACITY),
    troughs,
    starvationAlerts,
    warehouse: {
      capacity: farm.warehouse_capacity,
      items: warehouseItems,
    },
    pondFishes,
    todayContracts: DAILY_MARKET_CONTRACTS,
    completedContracts: (
      await ctx.db.query<{ contract_id: string }>(
        'SELECT contract_id FROM farm_contract_completions WHERE farm_id=$1 AND day=$2',
        [farm.id, ctx.now().toISOString().slice(0, 10)],
      )
    ).rows.map((r) => r.contract_id),
  };
}

async function unlockPlotLocked(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  plotIndex: number,
  idempotencyKey?: string,
) {
  if (!Number.isInteger(plotIndex) || plotIndex < 0 || plotIndex >= TOTAL_FARM_PLOTS) {
    throw badRequest('invalid_plot_index', 'Plot index must be between 0 and 35.');
  }

  const ledgerKey = idempotencyKey ? `farm:unlock:${userId}:${idempotencyKey}` : undefined;

  const replay = async () => {
    if (!ledgerKey) return null;
    const existing = await tx.query<{ balance_after: number; metadata: Record<string, unknown> | null }>(
      'SELECT balance_after, metadata FROM ledger_entries WHERE idempotency_key = $1 AND user_id = $2',
      [ledgerKey, userId],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].metadata?.plotIndex !== plotIndex) {
        throw badRequest('idempotency_conflict', 'Idempotency key reused with different plot index.');
      }
      return { ok: true, plotIndex, coinBalance: existing.rows[0].balance_after };
    }
    return null;
  };

  const prior = await replay();
  if (prior) return prior;

  const farm = await getOrCreateFarm(tx, userId);
  const plotRes = await tx.query<FarmPlotRow>(
    'SELECT * FROM farm_plots WHERE farm_id = $1 AND plot_index = $2',
    [farm.id, plotIndex],
  );
  const plot = plotRes.rows[0];
  if (!plot) throw notFound('Plot not found');
  if (plot.is_unlocked) throw badRequest('already_unlocked', 'This plot is already unlocked.');

  const unlockCost = plot.unlock_price > 0 ? plot.unlock_price : getPlotUnlockPrice(plotIndex);

  try {
    return await inFarmTransaction(tx, async (tx) => {
      let newBal = 0;
      if (unlockCost > 0) {
        const b = await tx.query<{ coin: string }>('SELECT coin FROM balances WHERE user_id = $1', [userId]);
        const currentCoin = Number(b.rows[0]?.coin ?? 0);
        if (currentCoin < unlockCost) {
          throw badRequest('insufficient_funds', 'Không đủ Xu để mở ô đất.');
        }

        const ledger = await postLedger(tx, {
          userId,
          currency: 'coin',
          amount: -unlockCost,
          reason: 'farm_plot_unlock',
          referenceId: String(plotIndex),
          idempotencyKey: ledgerKey,
          metadata: { plotIndex, unlockCost },
        });
        newBal = ledger.balanceAfter;
      } else {
        const b = await tx.query<{ coin: string }>('SELECT coin FROM balances WHERE user_id = $1', [userId]);
        newBal = Number(b.rows[0]?.coin ?? 0);
      }

      await tx.query(
        'UPDATE farm_plots SET is_unlocked = true, updated_at = now() WHERE farm_id = $1 AND plot_index = $2',
        [farm.id, plotIndex],
      );

      return { ok: true, plotIndex, coinBalance: newBal };
    });
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      const again = await replay();
      if (again) return again;
    }
    throw err;
  }
}

async function plantSeedLocked(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  plotIndex: number,
  seedItemId: string,
  useFertilizer?: boolean,
  targetFarmOwnerId?: string,
) {
  if (targetFarmOwnerId && targetFarmOwnerId !== userId) {
    throw forbidden('Guests cannot plant seeds on this farm.');
  }

  const farm = await getOrCreateFarm(tx, userId);
  const plotRes = await tx.query<FarmPlotRow>(
    'SELECT * FROM farm_plots WHERE farm_id = $1 AND plot_index = $2',
    [farm.id, plotIndex],
  );
  const plot = plotRes.rows[0];
  if (!plot) throw notFound('Plot not found');
  if (!plot.is_unlocked) throw badRequest('plot_locked', 'Cannot plant on a locked plot.');
  if (plot.crop_id) throw badRequest('plot_occupied', 'This plot already has a crop growing.');

  // Find corresponding crop
  const cropEntry = Object.values(CROPS).find((c) => c.seedItemId === seedItemId);
  if (!cropEntry) throw badRequest('invalid_seed', 'Unknown seed item ID.');

  return inFarmTransaction(tx, async (tx) => {
    // Check seed inventory in warehouse
    const seedInv = await tx.query<FarmWarehouseItemRow>(
      'SELECT * FROM farm_warehouse_items WHERE farm_id = $1 AND item_id = $2',
      [farm.id, seedItemId],
    );
    if (!seedInv.rows[0] || seedInv.rows[0].quantity < 1) {
      throw badRequest('insufficient_seeds', 'You do not have this seed in your farm warehouse.');
    }

    // Deduct seed
    if (seedInv.rows[0].quantity === 1) {
      await tx.query('DELETE FROM farm_warehouse_items WHERE id = $1', [seedInv.rows[0].id]);
    } else {
      await tx.query('UPDATE farm_warehouse_items SET quantity = quantity - 1 WHERE id = $1', [
        seedInv.rows[0].id,
      ]);
    }

    // If fertilizer requested, deduct
    let fertilized = false;
    if (useFertilizer) {
      const fert = await tx.query<FarmWarehouseItemRow>(
        'SELECT * FROM farm_warehouse_items WHERE farm_id = $1 AND item_id = $2',
        [farm.id, 'fertilizer_bio'],
      );
      if (fert.rows[0] && fert.rows[0].quantity >= 1) {
        fertilized = true;
        if (fert.rows[0].quantity === 1) {
          await tx.query('DELETE FROM farm_warehouse_items WHERE id = $1', [fert.rows[0].id]);
        } else {
          await tx.query('UPDATE farm_warehouse_items SET quantity = quantity - 1 WHERE id = $1', [
            fert.rows[0].id,
          ]);
        }
      }
    }

    const now = ctx.now();
    const weather = await worldWeather(ctx);
    const isRaining = isWeatherRainy(weather);
    const isAlreadyMoist = isPlotMoist(plot.watered_at, now.getTime());
    // When it rains, planted crops naturally receive water and do not need manual watering
    const wateredAt = isRaining ? now : isAlreadyMoist ? plot.watered_at : null;

    const updated = await tx.query<FarmPlotRow>(
      `UPDATE farm_plots
       SET crop_id = $1, planted_at = $2, is_fertilized = $3, growth_stage = 'seed', is_tilled = true, watered_at = $6, updated_at = $2
       WHERE farm_id = $4 AND plot_index = $5
       RETURNING *`,
      [cropEntry.id, now, fertilized, farm.id, plotIndex, wateredAt],
    );

    const isWatered = Boolean(updated.rows[0]!.watered_at) || isRaining;

    return {
      ok: true,
      isRaining,
      isWatered,
      plot: {
        plotIndex: updated.rows[0]!.plot_index,
        cropId: updated.rows[0]!.crop_id,
        stage: 'seed',
        isFertilized: updated.rows[0]!.is_fertilized,
        wateredAt: updated.rows[0]!.watered_at,
        isWatered,
      },
    };
  });
}

async function waterPlotLocked(
  ctx: AppContext,
  tx: Tx,
  visitorId: string,
  plotIndex: number,
  farmOwnerId?: string,
) {
  const targetOwnerId = farmOwnerId ?? visitorId;
  const isGuest = targetOwnerId !== visitorId;
  const farm = await getOrCreateFarm(tx, targetOwnerId);

  const plotRes = await tx.query<FarmPlotRow>(
    'SELECT * FROM farm_plots WHERE farm_id = $1 AND plot_index = $2',
    [farm.id, plotIndex],
  );
  const plot = plotRes.rows[0];
  if (!plot) throw notFound('Plot not found');
  if (!plot.is_unlocked) throw badRequest('plot_locked', 'Cannot water locked plot');

  const now = ctx.now();
  const weather = await worldWeather(ctx);
  const isRaining = isWeatherRainy(weather);
  if (isRaining) {
    throw badRequest(
      'raining_no_water_needed',
      'Trời đang mưa tự nhiên, ô đất đã đủ ẩm không cần tưới thêm.',
    );
  }

  if (!plot.crop_id) {
    throw badRequest('water_not_needed', 'Ô đất chưa có cây để tưới.');
  }

  if (isPlotMoist(plot.watered_at, now.getTime())) {
    throw badRequest('water_not_needed', 'Ô đất đã đủ ẩm không cần tưới thêm.');
  }

  if (isGuest) await requireFarmAccess(ctx, visitorId, targetOwnerId);
  await tx.query(
    'UPDATE farm_plots SET watered_at = $1, is_tilled = true, updated_at = $1 WHERE farm_id = $2 AND plot_index = $3',
    [now, farm.id, plotIndex],
  );

  let fameAwarded = 0;
  if (isGuest) {
    fameAwarded = 15;
    await inFarmTransaction(tx, (tx) =>
      postLedger(tx, {
        userId: visitorId,
        currency: 'fame',
        amount: fameAwarded,
        reason: 'farm_help',
        idempotencyKey: `farm:help:${plot.id}:${plot.planted_at?.toISOString()}`,
      }),
    );
  }

  return {
    ok: true,
    wateredAt: now.toISOString(),
    isGuestHelper: isGuest,
    fameAwarded,
  };
}

async function harvestPlotLocked(
  ctx: AppContext,
  tx: Tx,
  callerId: string,
  plotIndex: number,
  farmOwnerId?: string,
) {
  if (farmOwnerId && farmOwnerId !== callerId) {
    throw forbidden('Guests cannot harvest crops from other players.');
  }

  const farm = await getOrCreateFarm(tx, callerId);
  const plotRes = await tx.query<FarmPlotRow>(
    'SELECT * FROM farm_plots WHERE farm_id = $1 AND plot_index = $2',
    [farm.id, plotIndex],
  );
  const plot = plotRes.rows[0];
  if (!plot) throw notFound('Plot not found');
  if (!plot.crop_id) throw badRequest('plot_empty', 'Plot is empty.');

  const stage = computeCropStage(plot.crop_id, plot.planted_at, plot.is_fertilized, ctx.now().getTime());
  if (stage !== 'mature') {
    throw badRequest('crop_not_mature', 'Crop is not mature yet.');
  }

  const cropDef = CROPS[plot.crop_id as CropId];
  const yieldQty = cropDef ? Math.max(1, cropDef.baseYieldMin) : 2;
  const harvestedItem = cropDef?.harvestItemId ?? plot.crop_id;

  return inFarmTransaction(tx, async (tx) => {
    // Check warehouse capacity
    const countRes = await tx.query<{ total: string }>(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM farm_warehouse_items WHERE farm_id = $1',
      [farm.id],
    );
    const currentTotal = Number(countRes.rows[0]?.total ?? 0);
    if (currentTotal + yieldQty > farm.warehouse_capacity) {
      throw badRequest('warehouse_full', 'Kho nông trại đã đầy sức chứa. Hãy nâng cấp kho.');
    }

    // Store in warehouse
    await tx.query(
      `INSERT INTO farm_warehouse_items (farm_id, item_id, category, quantity)
       VALUES ($1, $2, 'crop', $3)
       ON CONFLICT (farm_id, item_id) DO UPDATE SET quantity = farm_warehouse_items.quantity + EXCLUDED.quantity`,
      [farm.id, harvestedItem, yieldQty],
    );

    // Reset plot
    await tx.query(
      `UPDATE farm_plots
       SET crop_id = NULL, planted_at = NULL, watered_at = NULL, is_fertilized = false, growth_stage = 'empty', updated_at = now()
       WHERE farm_id = $1 AND plot_index = $2`,
      [farm.id, plotIndex],
    );

    return {
      ok: true,
      harvestedItem,
      quantity: yieldQty,
    };
  });
}

async function buyShopItemLocked(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  itemId: string,
  quantity: number,
  idempotencyKey?: string,
) {
  itemId = Object.values(CROPS).find((c) => c.id === itemId)?.harvestItemId ?? itemId;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw badRequest('invalid_quantity', 'Quantity must be a positive integer.');
  }

  const ledgerKey = idempotencyKey ? `farm:shop:buy:${userId}:${idempotencyKey}` : undefined;
  if (ledgerKey) {
    const existing = await tx.query<{ balance_after: number; metadata: Record<string, unknown> | null }>(
      'SELECT balance_after, metadata FROM ledger_entries WHERE idempotency_key = $1 AND user_id = $2',
      [ledgerKey, userId],
    );
    if (existing.rows[0]) {
      const meta = existing.rows[0].metadata;
      if (meta && (meta.itemId !== itemId || meta.quantity !== quantity)) {
        throw conflict('idempotency_conflict', 'Idempotency key reused with different parameters.');
      }
      return {
        ok: true,
        coinBalance: existing.rows[0].balance_after,
        purchased: { itemId, quantity },
      };
    }
  }

  // Lookup item price
  let unitPrice = 50;
  let category: 'crop' | 'animal_product' | 'seed' | 'supply' = 'supply';

  const shopItem = BAC_SAU_SHOP_ITEMS.find((i) => i.id === itemId);
  if (shopItem) {
    unitPrice = shopItem.coinPrice;
    if (shopItem.category === 'seeds') category = 'seed';
    else if (shopItem.category === 'livestock') category = 'seed';
    else category = 'supply';
  } else {
    // Check if contract or crop item
    const crop = Object.values(CROPS).find((c) => c.harvestItemId === itemId || c.id === itemId);
    if (crop) {
      unitPrice = Math.floor(crop.sellPrice * 1.5);
      category = 'crop';
    } else {
      const animal = Object.values(ANIMALS).find((a) => a.yieldItemId === itemId || a.yieldItem === itemId);
      if (animal) {
        unitPrice = Math.floor(animal.yieldPrice * 1.5);
        category = 'animal_product';
      } else {
        const pondFish = Object.values(POND_FISHES).find((p) => p.harvestItemId === itemId);
        if (pondFish) {
          unitPrice = Math.floor(pondFish.pricePerKg * pondFish.marketWeightMinKg);
          category = 'animal_product';
        }
      }
    }
  }

  if (
    !shopItem &&
    !Object.values(CROPS).some((c) => c.harvestItemId === itemId || c.id === itemId) &&
    !Object.values(ANIMALS).some((a) => a.yieldItemId === itemId) &&
    !Object.values(POND_FISHES).some((f) => f.harvestItemId === itemId)
  )
    throw badRequest('unknown_item', 'Mặt hàng không tồn tại.');
  const totalPrice = unitPrice * quantity;
  const farm = await getOrCreateFarm(tx, userId);

  return inFarmTransaction(tx, async (tx) => {
    // Capacity check
    const countRes = await tx.query<{ total: string }>(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM farm_warehouse_items WHERE farm_id = $1',
      [farm.id],
    );
    const currentTotal = Number(countRes.rows[0]?.total ?? 0);
    if (currentTotal + quantity > farm.warehouse_capacity) {
      throw badRequest('warehouse_full', 'Không đủ chỗ chứa trong nhà kho Silo.');
    }

    const ledger = await postLedger(tx, {
      userId,
      currency: 'coin',
      amount: -totalPrice,
      reason: 'farm_shop_buy',
      referenceId: itemId,
      idempotencyKey: ledgerKey,
      metadata: { itemId, quantity, unitPrice },
    });

    await tx.query(
      `INSERT INTO farm_warehouse_items (farm_id, item_id, category, quantity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (farm_id, item_id) DO UPDATE SET quantity = farm_warehouse_items.quantity + EXCLUDED.quantity`,
      [farm.id, itemId, category, quantity],
    );

    if (itemId === 'tractor_farm') {
      await tx.query(
        `INSERT INTO inventory_items (user_id, item_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = inventory_items.quantity + EXCLUDED.quantity`,
        [userId, itemId, quantity],
      );
    }

    return {
      ok: true,
      coinBalance: ledger.balanceAfter,
      purchased: { itemId, quantity },
    };
  });
}

async function sellShopProduceLocked(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  itemId: string,
  quantity: number,
  contractId?: string,
  idempotencyKey?: string,
) {
  itemId = Object.values(CROPS).find((c) => c.id === itemId)?.harvestItemId ?? itemId;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw badRequest('invalid_quantity', 'Quantity must be a positive integer.');
  }

  const farm = await getOrCreateFarm(tx, userId);

  return inFarmTransaction(tx, async (tx) => {
    const actionKey = idempotencyKey ? `farm:sell:${idempotencyKey}` : null;
    const fingerprint = JSON.stringify({ itemId, quantity, contractId });
    if (actionKey) {
      const prior = await tx.query<{
        fingerprint: string;
        result: {
          ok: boolean;
          coinEarned: number;
          bonusPercent: number;
          fameEarned: number;
          coinBalance: number;
        };
      }>('SELECT fingerprint,result FROM gameplay_actions WHERE user_id=$1 AND action_key=$2', [
        userId,
        actionKey,
      ]);
      if (prior.rows[0]) {
        if (prior.rows[0].fingerprint !== fingerprint)
          throw conflict('idempotency_conflict', 'Mã thao tác đã được sử dụng.');
        return prior.rows[0].result;
      }
    }
    // Check warehouse inventory
    const inv = await tx.query<FarmWarehouseItemRow>(
      'SELECT * FROM farm_warehouse_items WHERE farm_id = $1 AND (item_id = $2 OR item_id = $3)',
      [farm.id, itemId, itemId.replace('_harvest', '')],
    );
    const itemRow = inv.rows[0];
    if (!itemRow || itemRow.quantity < quantity) {
      throw badRequest('insufficient_inventory', 'Không đủ nông sản trong kho Silo để bán.');
    }

    // Determine unit price
    let unitPrice = 20;
    const crop = Object.values(CROPS).find((c) => c.harvestItemId === itemId || c.id === itemId);
    if (crop) unitPrice = crop.sellPrice;
    const animal = Object.values(ANIMALS).find((a) => a.yieldItemId === itemId || a.yieldItem === itemId);
    if (animal) unitPrice = animal.yieldPrice;
    const pondFish = Object.values(POND_FISHES).find((p) => p.harvestItemId === itemId);
    if (pondFish) unitPrice = Math.floor(pondFish.pricePerKg * pondFish.marketWeightMinKg);

    let bonusPercent = 0;
    let fameEarned = 0;
    let totalCoin = unitPrice * quantity;

    if (!crop && !animal && !pondFish) throw badRequest('not_produce', 'Chỉ thu mua nông sản.');
    if (contractId) {
      const contract = DAILY_MARKET_CONTRACTS.find((c) => c.id === contractId);
      if (
        !contract ||
        contract.requiredItemId !== (crop?.harvestItemId ?? itemId) ||
        quantity !== contract.requiredQuantity
      )
        throw badRequest('invalid_contract', 'Sai mặt hàng hoặc số lượng của hợp đồng.');
      const done = await tx.query(
        'INSERT INTO farm_contract_completions(farm_id,contract_id,day) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING contract_id',
        [farm.id, contractId, ctx.now().toISOString().slice(0, 10)],
      );
      if (!done.rowCount) throw conflict('contract_completed', 'Hợp đồng hôm nay đã hoàn thành.');
      bonusPercent = contract.bonusPercent;
      fameEarned = contract.rewardFame;
      totalCoin = contract.rewardCoin;
      await postLedger(tx, {
        userId,
        currency: 'fame',
        amount: fameEarned,
        reason: 'farm_contract',
        idempotencyKey: `farm:contract:${farm.id}:${contractId}:${ctx.now().toISOString().slice(0, 10)}`,
      });
    }

    // Deduct from warehouse
    if (itemRow.quantity === quantity) {
      await tx.query('DELETE FROM farm_warehouse_items WHERE id = $1', [itemRow.id]);
    } else {
      await tx.query('UPDATE farm_warehouse_items SET quantity = quantity - $1 WHERE id = $2', [
        quantity,
        itemRow.id,
      ]);
    }

    const ledger = await postLedger(tx, {
      userId,
      currency: 'coin',
      amount: totalCoin,
      reason: 'farm_produce_sell',
      referenceId: itemId,
      metadata: { itemId, quantity, contractId, bonusPercent, fameEarned },
    });

    const result = {
      ok: true,
      coinEarned: totalCoin,
      bonusPercent,
      fameEarned,
      coinBalance: ledger.balanceAfter,
    };
    if (actionKey)
      await tx.query(
        'INSERT INTO gameplay_actions(user_id,action_key,fingerprint,result) VALUES($1,$2,$3,$4)',
        [userId, actionKey, fingerprint, JSON.stringify(result)],
      );
    return result;
  });
}

async function sellAllProduceLocked(ctx: AppContext, tx: Tx, userId: string, idempotencyKey?: string) {
  const farm = await getOrCreateFarm(tx, userId);
  return inFarmTransaction(tx, async (tx) => {
    const actionKey = idempotencyKey ? `farm:sellall:${idempotencyKey}` : null;
    if (actionKey) {
      const prior = await tx.query<{
        result: {
          ok: boolean;
          totalCoinEarned: number;
          totalItemsSold: number;
          coinBalance: number;
        };
      }>('SELECT result FROM gameplay_actions WHERE user_id=$1 AND action_key=$2', [userId, actionKey]);
      if (prior.rows[0]) return prior.rows[0].result;
    }

    const rows = await tx.query<FarmWarehouseItemRow>(
      `SELECT * FROM farm_warehouse_items 
       WHERE farm_id = $1 
         AND (category IN ('crop', 'animal_product') 
              OR item_id LIKE 'crop_%' 
              OR item_id LIKE 'yield_%' 
              OR item_id LIKE 'fish_pond_%')`,
      [farm.id],
    );
    if (rows.rows.length === 0) {
      throw badRequest('no_crops_to_sell', 'Không có nông sản hay thủy sản nào trong kho Silo để bán.');
    }
    let totalCoin = 0;
    let totalItems = 0;
    const soldItemIds: string[] = [];
    for (const item of rows.rows) {
      const crop = Object.values(CROPS).find(
        (c) => c.harvestItemId === item.item_id || c.id === item.item_id,
      );
      const animal = Object.values(ANIMALS).find(
        (a) => a.yieldItemId === item.item_id || a.yieldItem === item.item_id,
      );
      const pondFish = Object.values(POND_FISHES).find((p) => p.harvestItemId === item.item_id);
      let unitPrice = 0;
      if (crop) unitPrice = crop.sellPrice;
      else if (animal) unitPrice = animal.yieldPrice;
      else if (pondFish) unitPrice = Math.floor(pondFish.pricePerKg * pondFish.marketWeightMinKg);
      else continue;

      totalCoin += unitPrice * item.quantity;
      totalItems += item.quantity;
      soldItemIds.push(item.id);
    }
    if (totalItems === 0) {
      throw badRequest('no_crops_to_sell', 'Không có nông sản hay thủy sản nào trong kho Silo để bán.');
    }
    await tx.query('DELETE FROM farm_warehouse_items WHERE id = ANY($1)', [soldItemIds]);
    const ledger = await postLedger(tx, {
      userId,
      currency: 'coin',
      amount: totalCoin,
      reason: 'farm_produce_sell_all',
      metadata: { totalItems, totalCoin },
    });
    const result = {
      ok: true,
      totalCoinEarned: totalCoin,
      totalItemsSold: totalItems,
      coinBalance: ledger.balanceAfter,
    };
    if (actionKey) {
      await tx.query(
        'INSERT INTO gameplay_actions(user_id,action_key,fingerprint,result) VALUES($1,$2,$3,$4)',
        [userId, actionKey, 'sell_all', JSON.stringify(result)],
      );
    }
    return result;
  });
}

async function feedAnimalLocked(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  animalId: string,
  feedItemId: string,
) {
  const farm = await getOrCreateFarm(tx, userId);
  const animalRes = await tx.query<FarmAnimalRow>(
    'SELECT * FROM farm_animals WHERE id = $1 AND farm_id = $2',
    [animalId, farm.id],
  );
  const animal = animalRes.rows[0];
  if (!animal) throw notFound('Animal not found on your farm.');
  const definition = Object.values(ANIMALS).find((a) => a.type === animal.animal_type);
  if (!definition || definition.feedItemId !== feedItemId)
    throw badRequest('invalid_feed', 'Thức ăn không phù hợp.');

  const nowMs = ctx.now().getTime();
  const hunger = computeAnimalHunger(
    animal.animal_type,
    animal.fed_at,
    animal.last_yield_at,
    nowMs,
    false,
    animal.created_at,
  );
  if (hunger.isDead) {
    throw badRequest('animal_dead', 'Vật nuôi đã chết vì bị bỏ đói quá lâu.');
  }

  const growth = computeAnimalGrowthStage(
    animal.animal_type,
    animal.created_at,
    nowMs,
    animal.fed_at,
    animal.growth_accum_sec ?? 0,
  );
  if (animal.fed_at) {
    const elapsedSec = (nowMs - animal.fed_at.getTime()) / 1000;
    if (elapsedSec < definition.feedIntervalSec) {
      throw badRequest('already_fed', 'Vật nuôi đang no bụng, chưa đến giờ ăn tiếp.');
    }
    if (growth.stage === 'adult' && (!animal.last_yield_at || animal.last_yield_at < animal.fed_at)) {
      throw badRequest('already_fed', 'Hãy thu hoạch sản phẩm trước khi cho ăn tiếp.');
    }
  }

  return inFarmTransaction(tx, async (tx) => {
    // Check feed item in warehouse
    const feedRes = await tx.query<FarmWarehouseItemRow>(
      'SELECT * FROM farm_warehouse_items WHERE farm_id = $1 AND item_id = $2',
      [farm.id, feedItemId],
    );
    if (!feedRes.rows[0] || feedRes.rows[0].quantity < 1) {
      throw badRequest('no_feed', 'You do not have this feed in your farm warehouse.');
    }

    if (feedRes.rows[0].quantity === 1) {
      await tx.query('DELETE FROM farm_warehouse_items WHERE id = $1', [feedRes.rows[0].id]);
    } else {
      await tx.query('UPDATE farm_warehouse_items SET quantity = quantity - 1 WHERE id = $1', [
        feedRes.rows[0].id,
      ]);
    }

    const prevElapsedSec = animal.fed_at ? Math.max(0, (nowMs - animal.fed_at.getTime()) / 1000) : 0;
    const prevDigestionSec = Math.min(definition.feedIntervalSec, prevElapsedSec);
    const prevAccum = animal.growth_accum_sec ?? 0;
    const newAccum = Math.min(definition.growthDurationSec, prevAccum + Math.round(prevDigestionSec));

    const newHappiness = Math.min(100, animal.happiness + (definition.happinessBoost || 20));
    const now = ctx.now();
    await tx.query(
      'UPDATE farm_animals SET happiness = $1, fed_at = $2, growth_accum_sec = $3, updated_at = $2 WHERE id = $4',
      [newHappiness, now, newAccum, animalId],
    );

    return {
      ok: true,
      happiness: newHappiness,
      fedAt: now.toISOString(),
      growthAccumSec: newAccum,
    };
  });
}

async function raiseAnimalLocked(ctx: AppContext, tx: Tx, userId: string, stockItemId: string) {
  const farm = await getOrCreateFarm(tx, userId);
  const def = Object.values(ANIMALS).find((a) => a.stockItemId === stockItemId);
  if (!def) throw badRequest('invalid_animal', 'Giống vật nuôi không tồn tại.');

  const count = await tx.query<{ n: number }>('SELECT count(*)::int n FROM farm_animals WHERE farm_id=$1', [
    farm.id,
  ]);
  const maxCapacity = farm.livestock_capacity ?? BASE_LIVESTOCK_CAPACITY;
  if (count.rows[0]!.n >= maxCapacity) {
    throw badRequest(
      'barn_full',
      `Chuồng trại đã đạt tối đa ${maxCapacity} con. Hãy cơi nới mở rộng chuồng trại hoặc bán bớt thú!`,
    );
  }

  await takeFarmItem(tx, farm.id, stockItemId, 1);
  const now = ctx.now();
  const inserted = await tx.query<FarmAnimalRow>(
    `INSERT INTO farm_animals(farm_id, animal_type, name, happiness, growth_accum_sec, created_at, updated_at)
     VALUES($1, $2, $3, 50, 0, $4, $4)
     RETURNING *`,
    [farm.id, def.type, def.babyName || def.name, now],
  );
  const row = inserted.rows[0]!;
  const growth = computeAnimalGrowthStage(
    row.animal_type,
    row.created_at,
    now.getTime(),
    row.fed_at,
    row.growth_accum_sec ?? 0,
  );

  return {
    ok: true,
    animal: {
      id: row.id,
      type: row.animal_type,
      name: row.name,
      createdAt: row.created_at,
      fedAt: row.fed_at,
      growthAccumSec: 0,
      happiness: row.happiness,
      lastYieldAt: row.last_yield_at,
      stage: growth.stage,
      progressPercent: growth.progressPercent,
      remainingSec: growth.remainingSec,
      sellPrice: growth.sellPrice,
      displayName: growth.displayName,
      isDead: false,
    },
  };
}

async function sellAnimalLocked(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  animalId: string,
  idempotencyKey?: string,
) {
  const farm = await getOrCreateFarm(tx, userId);
  return inFarmTransaction(tx, async (tx) => {
    const actionKey = idempotencyKey ? `farm:animal:sell:${animalId}:${idempotencyKey}` : null;
    if (actionKey) {
      const prior = await tx.query<{
        result: {
          ok: boolean;
          soldAnimal: { id: string; type: string; name: string; stage: string; sellPrice: number };
          coinEarned: number;
          coinBalance: number;
        };
      }>('SELECT result FROM gameplay_actions WHERE user_id=$1 AND action_key=$2', [userId, actionKey]);
      if (prior.rows[0]) return prior.rows[0].result;
    }

    const animalRes = await tx.query<FarmAnimalRow>(
      'SELECT * FROM farm_animals WHERE id = $1 AND farm_id = $2 FOR UPDATE',
      [animalId, farm.id],
    );
    const animal = animalRes.rows[0];
    if (!animal) throw notFound('Không tìm thấy con vật trong chuồng.');

    const now = ctx.now().getTime();
    const growth = computeAnimalGrowthStage(
      animal.animal_type,
      animal.created_at,
      now,
      animal.fed_at,
      animal.growth_accum_sec ?? 0,
    );
    const sellPrice = growth.sellPrice;

    await tx.query('DELETE FROM farm_animals WHERE id = $1', [animal.id]);

    let coinBalance = 0;
    if (sellPrice > 0) {
      const ledger = await postLedger(tx, {
        userId,
        currency: 'coin',
        amount: sellPrice,
        reason: 'farm_animal_sell',
        metadata: { animalId: animal.id, type: animal.animal_type, stage: growth.stage, sellPrice },
      });
      coinBalance = ledger.balanceAfter;
    } else {
      const balRes = await tx.query<{ coin: string | number }>(
        'SELECT coin FROM balances WHERE user_id = $1',
        [userId],
      );
      coinBalance = Number(balRes.rows[0]?.coin ?? 0);
    }

    const result = {
      ok: true,
      soldAnimal: {
        id: animal.id,
        type: animal.animal_type,
        name: animal.name,
        stage: growth.stage,
        sellPrice,
      },
      coinEarned: sellPrice,
      coinBalance,
    };

    if (actionKey) {
      await tx.query(
        'INSERT INTO gameplay_actions(user_id,action_key,fingerprint,result) VALUES($1,$2,$3,$4)',
        [userId, actionKey, 'animal_sell', JSON.stringify(result)],
      );
    }

    return result;
  });
}

async function breedAnimalsLocked(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  parentAId: string,
  parentBId: string,
) {
  if (parentAId === parentBId) {
    throw badRequest('invalid_pair', 'Không thể ghép đôi một con vật với chính nó.');
  }

  const farm = await getOrCreateFarm(tx, userId);

  // Check farm livestock capacity
  const countRes = await tx.query<{ n: number }>(
    'SELECT count(*)::int n FROM farm_animals WHERE farm_id = $1',
    [farm.id],
  );
  const currentCount = countRes.rows[0]?.n ?? 0;
  const maxCapacity = farm.livestock_capacity ?? BASE_LIVESTOCK_CAPACITY;
  if (currentCount >= maxCapacity) {
    throw badRequest(
      'farm_animals_full',
      `Trang trại đã đạt tối đa ${maxCapacity} vật nuôi. Hãy cơi nới chuồng trại hoặc xuất chuồng bớt trước khi nhân giống.`,
    );
  }

  // Fetch both animals with FOR UPDATE
  const animalsRes = await tx.query<FarmAnimalRow>(
    'SELECT * FROM farm_animals WHERE id IN ($1, $2) AND farm_id = $3 FOR UPDATE',
    [parentAId, parentBId, farm.id],
  );

  if (animalsRes.rows.length < 2) {
    throw notFound('Không tìm thấy đủ 2 con vật trong chuồng trại của bạn.');
  }

  const a = animalsRes.rows.find((x) => x.id === parentAId)!;
  const b = animalsRes.rows.find((x) => x.id === parentBId)!;

  const nowMs = ctx.now().getTime();

  const growthA = computeAnimalGrowthStage(
    a.animal_type,
    a.created_at,
    nowMs,
    a.fed_at,
    a.growth_accum_sec ?? 0,
  );
  const hungerA = computeAnimalHunger(
    a.animal_type,
    a.fed_at,
    a.last_yield_at,
    nowMs,
    growthA.stage === 'adult',
    a.created_at,
  );

  const growthB = computeAnimalGrowthStage(
    b.animal_type,
    b.created_at,
    nowMs,
    b.fed_at,
    b.growth_accum_sec ?? 0,
  );
  const hungerB = computeAnimalHunger(
    b.animal_type,
    b.fed_at,
    b.last_yield_at,
    nowMs,
    growthB.stage === 'adult',
    b.created_at,
  );

  const candA: BreedingCandidate = {
    id: a.id,
    type: a.animal_type as AnimalType,
    displayName: growthA.displayName,
    stage: growthA.stage,
    happiness: hungerA.isDead ? 0 : a.happiness,
    isDead: hungerA.isDead,
    isHungry: hungerA.isHungry,
    bredAt: a.bred_at ? new Date(a.bred_at).getTime() : null,
  };

  const candB: BreedingCandidate = {
    id: b.id,
    type: b.animal_type as AnimalType,
    displayName: growthB.displayName,
    stage: growthB.stage,
    happiness: hungerB.isDead ? 0 : b.happiness,
    isDead: hungerB.isDead,
    isHungry: hungerB.isHungry,
    bredAt: b.bred_at ? new Date(b.bred_at).getTime() : null,
  };

  const check = canBreedAnimals(candA, candB, nowMs, currentCount, maxCapacity);
  if (!check.ok) {
    throw badRequest('cannot_breed', check.reason || 'Không đủ điều kiện ghép đôi sinh sản.');
  }

  const def = (ANIMALS as Record<string, AnimalDef>)[a.animal_type];
  if (!def) throw badRequest('invalid_animal', 'Loài vật nuôi không hợp lệ.');

  const nowDate = ctx.now();

  // Deduct happiness from parents and set bred_at
  const updatedA = await tx.query<FarmAnimalRow>(
    'UPDATE farm_animals SET bred_at = $1, happiness = GREATEST(0, happiness - $2), updated_at = $1 WHERE id = $3 RETURNING *',
    [nowDate, BREEDING_HAPPINESS_COST, a.id],
  );
  const updatedB = await tx.query<FarmAnimalRow>(
    'UPDATE farm_animals SET bred_at = $1, happiness = GREATEST(0, happiness - $2), updated_at = $1 WHERE id = $3 RETURNING *',
    [nowDate, BREEDING_HAPPINESS_COST, b.id],
  );

  // Insert baby animal
  const babyRes = await tx.query<FarmAnimalRow>(
    'INSERT INTO farm_animals(farm_id, animal_type, name, happiness, growth_accum_sec, created_at, updated_at) VALUES ($1, $2, $3, 100, 0, $4, $4) RETURNING *',
    [farm.id, a.animal_type, def.babyName, nowDate],
  );
  const baby = babyRes.rows[0]!;

  return {
    ok: true,
    baby: {
      id: baby.id,
      type: baby.animal_type,
      name: baby.name,
      displayName: def.babyName,
      stage: 'baby' as const,
      happiness: baby.happiness,
      createdAt: baby.created_at,
    },
    parentA: {
      id: updatedA.rows[0]!.id,
      displayName: candA.displayName,
      happiness: updatedA.rows[0]!.happiness,
      bredAt: updatedA.rows[0]!.bred_at,
    },
    parentB: {
      id: updatedB.rows[0]!.id,
      displayName: candB.displayName,
      happiness: updatedB.rows[0]!.happiness,
      bredAt: updatedB.rows[0]!.bred_at,
    },
  };
}

async function stockPondFishLocked(ctx: AppContext, tx: Tx, userId: string, fishSpecies: string) {
  const validSpecies = ['tra', 'basa', 'loc', 'tom_cang', 'bong_tuong'];
  if (!validSpecies.includes(fishSpecies)) {
    throw badRequest('invalid_species', 'Invalid fish species.');
  }

  const farm = await getOrCreateFarm(tx, userId);
  const definition = Object.values(POND_FISHES).find((f) => f.species === fishSpecies)!;
  const count = await tx.query<{ n: number }>(
    'SELECT count(*)::int n FROM farm_pond_fishes WHERE farm_id=$1',
    [farm.id],
  );
  if (count.rows[0]!.n >= 12) throw badRequest('pond_full', 'Ao chứa tối đa 12 con.');
  await takeFarmItem(tx, farm.id, definition.fingerlingItemId, 1);
  const now = ctx.now();
  const inserted = await tx.query<FarmPondFishRow>(
    `INSERT INTO farm_pond_fishes (farm_id, fish_species, current_weight_kg, stocked_at, growth_stage)
     VALUES ($1, $2, 0.20, $3, 'fingerling')
     RETURNING *`,
    [farm.id, fishSpecies, now],
  );
  const f = inserted.rows[0]!;

  return {
    ok: true,
    fish: {
      id: f.id,
      species: f.fish_species,
      weightKg: Number(f.current_weight_kg),
      stage: f.growth_stage,
    },
  };
}

async function feedAllPondFishesLocked(ctx: AppContext, tx: Tx, userId: string) {
  const farm = await getOrCreateFarm(tx, userId);
  const fishesRes = await tx.query<FarmPondFishRow>(
    'SELECT * FROM farm_pond_fishes WHERE farm_id=$1 AND fed_at IS NULL FOR UPDATE',
    [farm.id],
  );
  const unfedFishes = fishesRes.rows;
  if (unfedFishes.length === 0) {
    return {
      ok: true,
      fedCount: 0,
      message: 'Tất cả cá trong ao đều đã được cho ăn!',
    };
  }

  // Check feed_aquatic in warehouse
  const whRes = await tx.query<FarmWarehouseItemRow>(
    'SELECT * FROM farm_warehouse_items WHERE farm_id=$1 AND item_id=$2 FOR UPDATE',
    [farm.id, 'feed_aquatic'],
  );
  const stock = whRes.rows[0]?.quantity ?? 0;
  if (stock <= 0) {
    throw badRequest('insufficient_feed', 'Kho nông trại không còn Thức Ăn Thủy Sản (Cám nổi) để cho cá ăn.');
  }

  const toFeedCount = Math.min(stock, unfedFishes.length);
  await takeFarmItem(tx, farm.id, 'feed_aquatic', toFeedCount);

  const toFeed = unfedFishes.slice(0, toFeedCount);
  const nowDate = ctx.now();
  for (const f of toFeed) {
    await tx.query('UPDATE farm_pond_fishes SET fed_at=$1 WHERE id=$2', [nowDate, f.id]);
  }

  return {
    ok: true,
    fedCount: toFeedCount,
    totalUnfed: unfedFishes.length,
    remainingStock: stock - toFeedCount,
  };
}

async function harvestAllPondFishesLocked(ctx: AppContext, tx: Tx, userId: string) {
  const farm = await getOrCreateFarm(tx, userId);
  const fishesRes = await tx.query<FarmPondFishRow>(
    'SELECT * FROM farm_pond_fishes WHERE farm_id=$1 FOR UPDATE',
    [farm.id],
  );
  const nowMs = ctx.now().getTime();
  const readyFishes = fishesRes.rows.filter((f) => {
    if (!f.fed_at) return false;
    const def = Object.values(POND_FISHES).find((def) => def.species === f.fish_species);
    if (!def) return false;
    const elapsedSec = (nowMs - new Date(f.fed_at).getTime()) / 1000;
    return elapsedSec >= def.growthDurationSec;
  });

  if (readyFishes.length === 0) {
    return {
      ok: true,
      harvestedCount: 0,
      message: 'Chưa có cá nào trong ao đạt tiêu chuẩn thu hoạch.',
    };
  }

  const harvestedItems: Record<string, number> = {};
  for (const f of readyFishes) {
    const def = Object.values(POND_FISHES).find((def) => def.species === f.fish_species)!;
    await putFarmItem(tx, farm.id, def.harvestItemId, 1);
    await tx.query('DELETE FROM farm_pond_fishes WHERE id=$1', [f.id]);
    harvestedItems[def.harvestItemId] = (harvestedItems[def.harvestItemId] || 0) + 1;
  }

  return {
    ok: true,
    harvestedCount: readyFishes.length,
    harvestedItems,
  };
}

async function upgradeWarehouseLocked(ctx: AppContext, tx: Tx, userId: string, idempotencyKey?: string) {
  const farm = await getOrCreateFarm(tx, userId);
  const currentCapacity = farm.warehouse_capacity;
  if (currentCapacity >= 500) throw badRequest('warehouse_max', 'Kho đã đạt cấp tối đa.');

  const currentTier = WAREHOUSE_UPGRADE_TIERS.find((t) => t.capacity === currentCapacity + 50);
  const upgradeCost = currentTier ? currentTier.upgradeCostCoin : 2000;
  const newCapacity = currentCapacity + 50;

  const ledgerKey = idempotencyKey ? `farm:warehouse:upgrade:${userId}:${idempotencyKey}` : undefined;

  const replay = async () => {
    if (!ledgerKey) return null;
    const existing = await tx.query<{ balance_after: number; metadata: Record<string, unknown> | null }>(
      'SELECT balance_after, metadata FROM ledger_entries WHERE idempotency_key = $1 AND user_id = $2',
      [ledgerKey, userId],
    );
    if (existing.rows[0]) {
      const recordedCapacity = (existing.rows[0].metadata?.newCapacity as number) ?? farm.warehouse_capacity;
      return { ok: true, newCapacity: recordedCapacity, coinBalance: existing.rows[0].balance_after };
    }
    return null;
  };

  const prior = await replay();
  if (prior) return prior;

  try {
    return await inFarmTransaction(tx, async (tx) => {
      const ledger = await postLedger(tx, {
        userId,
        currency: 'coin',
        amount: -upgradeCost,
        reason: 'farm_warehouse_upgrade',
        referenceId: String(newCapacity),
        idempotencyKey: ledgerKey,
        metadata: { newCapacity, upgradeCost },
      });

      await tx.query('UPDATE farms SET warehouse_capacity = $1, updated_at = now() WHERE id = $2', [
        newCapacity,
        farm.id,
      ]);

      return {
        ok: true,
        newCapacity,
        coinBalance: ledger.balanceAfter,
      };
    });
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      const again = await replay();
      if (again) return again;
    }
    throw err;
  }
}

export async function updateFarmSettings(
  ctx: AppContext,
  userId: string,
  isPublic?: boolean,
  password?: string | null,
) {
  const farm = await getOrCreateFarm(ctx.db, userId);

  let newHash: string | null = farm.password_hash;
  if (password === null || password === '') {
    newHash = null;
  } else if (typeof password === 'string') {
    newHash = await hashPassword(password);
  }

  const newPublic = isPublic !== undefined ? isPublic : farm.is_public;

  await ctx.db.query(
    'UPDATE farms SET is_public = $1, password_hash = $2, access_version = gen_random_uuid(), updated_at = now() WHERE id = $3',
    [newPublic, newHash, farm.id],
  );

  return {
    ok: true,
    isPublic: newPublic,
    hasPassword: Boolean(newHash),
  };
}

export async function authenticateFarmVisitor(
  ctx: AppContext,
  visitorId: string,
  farmOwnerId: string,
  password?: string,
) {
  const farmRes = await ctx.db.query<FarmRecord>('SELECT * FROM farms WHERE user_id = $1', [farmOwnerId]);
  const farm = farmRes.rows[0];
  if (!farm) throw notFound('Farm not found.');
  if (visitorId !== farmOwnerId && !farm.is_public && !farm.password_hash)
    throw forbidden('Trang trại này đang đóng cửa.');

  if (visitorId !== farmOwnerId && !farm.is_public && farm.password_hash) {
    if (!password) throw unauthorized('Password required.');
    const valid = await verifyPassword(farm.password_hash, password);
    if (!valid) throw unauthorized('Mật khẩu trang trại không chính xác.');
  }

  const token = `fauth_${randomBytes(24).toString('base64url')}`;
  await ctx.redis.set(
    `fauth:${token}`,
    JSON.stringify({ ownerId: farmOwnerId, visitorId, farmVersion: farm.access_version }),
    'EX',
    86400,
  );

  await ctx.redis.set(`farm:grant:${farmOwnerId}:${visitorId}`, farm.access_version, 'EX', 86400);
  return {
    ok: true,
    farmAuthToken: token,
  };
}

async function inFarmTransaction<T>(tx: Tx, action: (tx: Tx) => Promise<T>): Promise<T> {
  return action(tx);
}
async function farmMutation<T>(ctx: AppContext, ownerId: string, action: (tx: Tx) => Promise<T>): Promise<T> {
  return withTx(ctx.db, async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['farm:' + ownerId]);
    return action(tx);
  });
}
export const unlockPlot = (ctx: AppContext, userId: string, ...args: [number, string?]) =>
  farmMutation(ctx, userId, (tx) => unlockPlotLocked(ctx, tx, userId, ...args));
export const plantSeed = (ctx: AppContext, userId: string, ...args: [number, string, boolean?, string?]) =>
  farmMutation(ctx, userId, (tx) => plantSeedLocked(ctx, tx, userId, ...args));
export const waterPlot = (ctx: AppContext, userId: string, plotIndex: number, ownerId?: string) =>
  farmMutation(ctx, ownerId ?? userId, (tx) => waterPlotLocked(ctx, tx, userId, plotIndex, ownerId));
export const harvestPlot = (ctx: AppContext, userId: string, ...args: [number, string?]) =>
  farmMutation(ctx, userId, (tx) => harvestPlotLocked(ctx, tx, userId, ...args));
export const buyShopItem = (ctx: AppContext, userId: string, ...args: [string, number, string?]) =>
  farmMutation(ctx, userId, (tx) => buyShopItemLocked(ctx, tx, userId, ...args));
export const sellShopProduce = (
  ctx: AppContext,
  userId: string,
  ...args: [string, number, string?, string?]
) => farmMutation(ctx, userId, (tx) => sellShopProduceLocked(ctx, tx, userId, ...args));
export const sellAllProduce = (ctx: AppContext, userId: string, key?: string) =>
  farmMutation(ctx, userId, (tx) => sellAllProduceLocked(ctx, tx, userId, key));
export const feedAnimal = (ctx: AppContext, userId: string, ...args: [string, string]) =>
  farmMutation(ctx, userId, (tx) => feedAnimalLocked(ctx, tx, userId, ...args));
export const raiseAnimal = (ctx: AppContext, userId: string, stockItemId: string) =>
  farmMutation(ctx, userId, (tx) => raiseAnimalLocked(ctx, tx, userId, stockItemId));
export const sellAnimal = (ctx: AppContext, userId: string, animalId: string, key?: string) =>
  farmMutation(ctx, userId, (tx) => sellAnimalLocked(ctx, tx, userId, animalId, key));
export const breedAnimals = (ctx: AppContext, userId: string, parentAId: string, parentBId: string) =>
  farmMutation(ctx, userId, (tx) => breedAnimalsLocked(ctx, tx, userId, parentAId, parentBId));
async function fillFeedTroughLocked(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  facility: LivestockFacilityKey,
  quantity: number,
) {
  const farm = await getOrCreateFarm(tx, userId);
  const def = FEED_TROUGHS[facility];
  if (!def) throw badRequest('invalid_facility', 'Khu chuồng trại không hợp lệ.');
  if (quantity <= 0) throw badRequest('invalid_quantity', 'Số lượng nạp phải lớn hơn 0.');

  const nowMs = ctx.now().getTime();
  await catchUpTroughsAndAnimals(tx, farm.id, nowMs);

  const troughRes = await tx.query<FarmFeedTroughRow>(
    'SELECT * FROM farm_feed_troughs WHERE farm_id = $1 AND facility = $2 FOR UPDATE',
    [farm.id, facility],
  );
  const trough = troughRes.rows[0];
  if (!trough) throw notFound('Không tìm thấy máng ăn.');

  const availableSpace = trough.capacity - trough.amount;
  if (availableSpace <= 0) {
    throw badRequest('trough_full', `Máng ăn ${def.label} đã đầy (${trough.capacity}/${trough.capacity}).`);
  }

  const toAdd = Math.min(quantity, availableSpace);

  // Check feed in warehouse
  const whRes = await tx.query<FarmWarehouseItemRow>(
    'SELECT * FROM farm_warehouse_items WHERE farm_id = $1 AND item_id = $2 FOR UPDATE',
    [farm.id, def.feedItemId],
  );
  const whItem = whRes.rows[0];
  if (!whItem || whItem.quantity < toAdd) {
    throw badRequest('insufficient_feed', `Kho nông trại không đủ ${def.feedName} (cần ${toAdd}).`);
  }

  await takeFarmItem(tx, farm.id, def.feedItemId, toAdd);
  const updatedTrough = await tx.query<FarmFeedTroughRow>(
    'UPDATE farm_feed_troughs SET amount = amount + $1, updated_at = $2 WHERE id = $3 RETURNING *',
    [toAdd, ctx.now(), trough.id],
  );

  return {
    ok: true,
    addedQuantity: toAdd,
    trough: {
      facility,
      amount: updatedTrough.rows[0]!.amount,
      capacity: updatedTrough.rows[0]!.capacity,
      feedItemId: def.feedItemId,
      feedName: def.feedName,
      label: def.label,
    },
  };
}

async function upgradeLivestockCapacityLocked(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  idempotencyKey?: string,
) {
  const farm = await getOrCreateFarm(tx, userId);
  return inFarmTransaction(tx, async (tx) => {
    const actionKey = idempotencyKey ? `farm:facility:capacity:${idempotencyKey}` : null;
    if (actionKey) {
      const prior = await tx.query<{ result: unknown }>(
        'SELECT result FROM gameplay_actions WHERE user_id=$1 AND action_key=$2',
        [userId, actionKey],
      );
      if (prior.rows[0]) return prior.rows[0].result;
    }

    const farmRow = await tx.query<FarmRecord>('SELECT * FROM farms WHERE id = $1 FOR UPDATE', [farm.id]);
    const current = farmRow.rows[0]?.livestock_capacity ?? BASE_LIVESTOCK_CAPACITY;
    const nextTier = getNextLivestockCapacityTier(current);
    if (!nextTier) {
      throw badRequest('max_capacity', 'Chuồng trại đã đạt quy mô sức chứa tối đa.');
    }

    const balRes = await tx.query<{ coin: string | number }>('SELECT coin FROM balances WHERE user_id = $1', [
      userId,
    ]);
    const balance = Number(balRes.rows[0]?.coin ?? 0);
    if (balance < nextTier.costCoins) {
      throw badRequest(
        'insufficient_coins',
        `Không đủ Xu để nâng cấp chuồng trại (cần ${nextTier.costCoins} Xu).`,
      );
    }

    const ledger = await postLedger(tx, {
      userId,
      currency: 'coin',
      amount: -nextTier.costCoins,
      reason: 'farm_pen_upgrade',
      referenceId: String(nextTier.tier),
      idempotencyKey: actionKey ?? undefined,
      metadata: { fromCapacity: current, toCapacity: nextTier.capacity, tier: nextTier.tier },
    });

    await tx.query('UPDATE farms SET livestock_capacity = $1, updated_at = $2 WHERE id = $3', [
      nextTier.capacity,
      ctx.now(),
      farm.id,
    ]);

    const result = {
      ok: true,
      tier: nextTier.tier,
      name: nextTier.name,
      capacity: nextTier.capacity,
      nextUpgrade: getNextLivestockCapacityTier(nextTier.capacity),
      coinBalance: ledger.balanceAfter,
    };

    if (actionKey) {
      await tx.query(
        'INSERT INTO gameplay_actions(user_id,action_key,fingerprint,result) VALUES($1,$2,$3,$4)',
        [userId, actionKey, 'pen_upgrade', JSON.stringify(result)],
      );
    }

    return result;
  });
}

async function upgradeFeedTroughLocked(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  facility: LivestockFacilityKey,
  idempotencyKey?: string,
) {
  const farm = await getOrCreateFarm(tx, userId);
  const def = FEED_TROUGHS[facility];
  if (!def) throw badRequest('invalid_facility', 'Khu chuồng trại không hợp lệ.');

  return inFarmTransaction(tx, async (tx) => {
    const actionKey = idempotencyKey ? `farm:trough:upgrade:${facility}:${idempotencyKey}` : null;
    if (actionKey) {
      const prior = await tx.query<{ result: unknown }>(
        'SELECT result FROM gameplay_actions WHERE user_id=$1 AND action_key=$2',
        [userId, actionKey],
      );
      if (prior.rows[0]) return prior.rows[0].result;
    }

    const nowMs = ctx.now().getTime();
    await catchUpTroughsAndAnimals(tx, farm.id, nowMs);

    const troughRes = await tx.query<FarmFeedTroughRow>(
      'SELECT * FROM farm_feed_troughs WHERE farm_id = $1 AND facility = $2 FOR UPDATE',
      [farm.id, facility],
    );
    const trough = troughRes.rows[0];
    if (!trough) throw notFound('Không tìm thấy máng ăn.');

    const currentLevel = trough.upgrade_level ?? 1;
    const nextUpgrade = getNextTroughUpgrade(facility, currentLevel);
    if (!nextUpgrade) {
      throw badRequest('max_trough_level', `Máng ăn ${def.label} đã đạt cấp tối đa.`);
    }

    const balRes = await tx.query<{ coin: string | number }>('SELECT coin FROM balances WHERE user_id = $1', [
      userId,
    ]);
    const balance = Number(balRes.rows[0]?.coin ?? 0);
    if (balance < nextUpgrade.costCoins) {
      throw badRequest(
        'insufficient_coins',
        `Không đủ Xu để nâng cấp máng ăn (cần ${nextUpgrade.costCoins} Xu).`,
      );
    }

    const ledger = await postLedger(tx, {
      userId,
      currency: 'coin',
      amount: -nextUpgrade.costCoins,
      reason: 'farm_trough_upgrade',
      referenceId: `${facility}:${nextUpgrade.level}`,
      idempotencyKey: actionKey ?? undefined,
      metadata: {
        facility,
        fromLevel: currentLevel,
        toLevel: nextUpgrade.level,
        newCapacity: nextUpgrade.capacity,
      },
    });

    const updated = await tx.query<FarmFeedTroughRow>(
      'UPDATE farm_feed_troughs SET upgrade_level = $1, capacity = $2, updated_at = $3 WHERE id = $4 RETURNING *',
      [nextUpgrade.level, nextUpgrade.capacity, ctx.now(), trough.id],
    );

    const result = {
      ok: true,
      trough: {
        facility,
        upgradeLevel: nextUpgrade.level,
        capacity: nextUpgrade.capacity,
        amount: updated.rows[0]!.amount,
        label: def.label,
        nextUpgrade: getNextTroughUpgrade(facility, nextUpgrade.level),
      },
      coinBalance: ledger.balanceAfter,
    };

    if (actionKey) {
      await tx.query(
        'INSERT INTO gameplay_actions(user_id,action_key,fingerprint,result) VALUES($1,$2,$3,$4)',
        [userId, actionKey, 'trough_upgrade', JSON.stringify(result)],
      );
    }

    return result;
  });
}

async function feedAllFacilityAnimalsLocked(
  ctx: AppContext,
  tx: Tx,
  userId: string,
  facility: LivestockFacilityKey,
) {
  const farm = await getOrCreateFarm(tx, userId);
  const def = FEED_TROUGHS[facility];
  if (!def) throw badRequest('invalid_facility', 'Khu chuồng trại không hợp lệ.');

  const nowMs = ctx.now().getTime();
  await catchUpTroughsAndAnimals(tx, farm.id, nowMs);

  const animalsRes = await tx.query<FarmAnimalRow>(
    'SELECT * FROM farm_animals WHERE farm_id = $1 AND animal_type = ANY($2) FOR UPDATE',
    [farm.id, def.animalTypes],
  );

  const hungryAnimals = animalsRes.rows.filter((a) => {
    const growth = computeAnimalGrowthStage(
      a.animal_type,
      a.created_at,
      nowMs,
      a.fed_at,
      a.growth_accum_sec ?? 0,
    );
    const hunger = computeAnimalHunger(
      a.animal_type,
      a.fed_at,
      a.last_yield_at,
      nowMs,
      growth.stage === 'adult',
      a.created_at,
    );
    return !hunger.isDead && hunger.isHungry;
  });

  if (hungryAnimals.length === 0) {
    return {
      ok: true,
      fedCount: 0,
      totalHungry: 0,
      message: `Tất cả vật nuôi trong ${def.penName} đều đã no bụng!`,
    };
  }

  const whRes = await tx.query<FarmWarehouseItemRow>(
    'SELECT * FROM farm_warehouse_items WHERE farm_id = $1 AND item_id = $2 FOR UPDATE',
    [farm.id, def.feedItemId],
  );
  const stock = whRes.rows[0]?.quantity ?? 0;
  if (stock <= 0) {
    throw badRequest('insufficient_feed', `Kho nông trại không còn ${def.feedName} để cho đàn vật nuôi ăn.`);
  }

  const toFeedCount = Math.min(stock, hungryAnimals.length);
  await takeFarmItem(tx, farm.id, def.feedItemId, toFeedCount);

  const toFeed = hungryAnimals.slice(0, toFeedCount);
  const nowDate = ctx.now();

  for (const animal of toFeed) {
    const aDef = (ANIMALS as Record<string, AnimalDef>)[animal.animal_type];
    const prevElapsedSec = animal.fed_at ? Math.max(0, (nowMs - animal.fed_at.getTime()) / 1000) : 0;
    const prevDigestionSec = Math.min(aDef?.feedIntervalSec ?? 300, prevElapsedSec);
    const prevAccum = animal.growth_accum_sec ?? 0;
    const newAccum = Math.min(aDef?.growthDurationSec ?? 300, prevAccum + Math.round(prevDigestionSec));
    const newHappiness = Math.min(100, animal.happiness + (aDef?.happinessBoost || 20));

    await tx.query(
      'UPDATE farm_animals SET happiness = $1, fed_at = $2, growth_accum_sec = $3, updated_at = $2 WHERE id = $4',
      [newHappiness, nowDate, newAccum, animal.id],
    );
  }

  return {
    ok: true,
    fedCount: toFeedCount,
    totalHungry: hungryAnimals.length,
    remainingStock: stock - toFeedCount,
    feedItemId: def.feedItemId,
    feedName: def.feedName,
  };
}

export const fillFeedTrough = (
  ctx: AppContext,
  userId: string,
  facility: LivestockFacilityKey,
  quantity: number,
) => farmMutation(ctx, userId, (tx) => fillFeedTroughLocked(ctx, tx, userId, facility, quantity));

export const upgradeLivestockCapacity = (ctx: AppContext, userId: string, key?: string) =>
  farmMutation(ctx, userId, (tx) => upgradeLivestockCapacityLocked(ctx, tx, userId, key));

export const upgradeFeedTrough = (
  ctx: AppContext,
  userId: string,
  facility: LivestockFacilityKey,
  key?: string,
) => farmMutation(ctx, userId, (tx) => upgradeFeedTroughLocked(ctx, tx, userId, facility, key));

export const feedAllFacilityAnimals = (ctx: AppContext, userId: string, facility: LivestockFacilityKey) =>
  farmMutation(ctx, userId, (tx) => feedAllFacilityAnimalsLocked(ctx, tx, userId, facility));

export const stockPondFish = (ctx: AppContext, userId: string, species: string) =>
  farmMutation(ctx, userId, (tx) => stockPondFishLocked(ctx, tx, userId, species));
export const feedAllPondFishes = (ctx: AppContext, userId: string) =>
  farmMutation(ctx, userId, (tx) => feedAllPondFishesLocked(ctx, tx, userId));
export const harvestAllPondFishes = (ctx: AppContext, userId: string) =>
  farmMutation(ctx, userId, (tx) => harvestAllPondFishesLocked(ctx, tx, userId));
export const upgradeWarehouse = (ctx: AppContext, userId: string, key?: string) =>
  farmMutation(ctx, userId, (tx) => upgradeWarehouseLocked(ctx, tx, userId, key));

export async function requireFarmAccess(ctx: AppContext, visitorId: string, ownerId: string) {
  if (visitorId === ownerId) return;
  const farm = await ctx.db.query<FarmRecord>('SELECT * FROM farms WHERE user_id=$1', [ownerId]);
  if (!farm.rows[0]) throw notFound('Trang trại chưa mở.');
  if (
    !farm.rows[0].is_public &&
    (await ctx.redis.get(`farm:grant:${ownerId}:${visitorId}`)) !== farm.rows[0].access_version
  )
    throw forbidden('Cần mật khẩu của chủ trang trại.');
}
export async function takeFarmItem(tx: Queryable, farmId: string, itemId: string, quantity: number) {
  const r = await tx.query(
    'UPDATE farm_warehouse_items SET quantity=quantity-$3 WHERE farm_id=$1 AND item_id=$2 AND quantity >= $3 RETURNING id',
    [farmId, itemId, quantity],
  );
  if (!r.rowCount) throw badRequest('insufficient_inventory', 'Không đủ nguyên liệu trong kho.');
  await tx.query('DELETE FROM farm_warehouse_items WHERE farm_id=$1 AND item_id=$2 AND quantity=0', [
    farmId,
    itemId,
  ]);
}
export async function putFarmItem(
  tx: Queryable,
  farmId: string,
  itemId: string,
  quantity: number,
  category = 'animal_product',
) {
  const farm = await tx.query<{ warehouse_capacity: number }>(
    'SELECT warehouse_capacity FROM farms WHERE id=$1 FOR UPDATE',
    [farmId],
  );
  const total = await tx.query<{ n: number }>(
    'SELECT COALESCE(sum(quantity),0)::int n FROM farm_warehouse_items WHERE farm_id=$1',
    [farmId],
  );
  if (total.rows[0]!.n + quantity > farm.rows[0]!.warehouse_capacity)
    throw badRequest('warehouse_full', 'Kho đã đầy.');
  await tx.query(
    'INSERT INTO farm_warehouse_items(farm_id,item_id,category,quantity) VALUES($1,$2,$3,$4) ON CONFLICT(farm_id,item_id) DO UPDATE SET quantity=farm_warehouse_items.quantity+EXCLUDED.quantity',
    [farmId, itemId, category, quantity],
  );
}
export async function careFarm(
  ctx: AppContext,
  userId: string,
  key: string,
  kind: 'raise' | 'collect' | 'pond-feed' | 'pond-harvest' | 'sell',
  id: string,
) {
  if (kind === 'sell') {
    return sellAnimal(ctx, userId, id, key);
  }
  return gameplayAction(ctx, userId, key, JSON.stringify({ kind, id }), async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['farm:' + userId]);
    const farm = await getOrCreateFarm(tx, userId);
    if (kind === 'raise') {
      const def = Object.values(ANIMALS).find((a) => a.stockItemId === id);
      if (!def) throw badRequest('invalid_animal', 'Giống vật nuôi không tồn tại.');
      const count = await tx.query<{ n: number }>(
        'SELECT count(*)::int n FROM farm_animals WHERE farm_id=$1',
        [farm.id],
      );
      if (count.rows[0]!.n >= 24) throw badRequest('barn_full', 'Chuồng chứa tối đa 24 con.');
      await takeFarmItem(tx, farm.id, id, 1);
      const now = ctx.now();
      await tx.query(
        'INSERT INTO farm_animals(farm_id,animal_type,name,happiness,growth_accum_sec,created_at,updated_at) VALUES($1,$2,$3,50,0,$4,$4)',
        [farm.id, def.type, def.babyName || def.name, now],
      );
    } else if (kind === 'collect') {
      const r = await tx.query<FarmAnimalRow>(
        'SELECT * FROM farm_animals WHERE farm_id=$1 AND id=$2 FOR UPDATE',
        [farm.id, id],
      );
      const animal = r.rows[0];
      const def = Object.values(ANIMALS).find((a) => a.type === animal?.animal_type);
      if (!animal || !def) throw notFound('Không tìm thấy vật nuôi.');
      const nowMs = ctx.now().getTime();
      const growth = computeAnimalGrowthStage(
        animal.animal_type,
        animal.created_at,
        nowMs,
        animal.fed_at,
        animal.growth_accum_sec ?? 0,
      );
      const hunger = computeAnimalHunger(
        animal.animal_type,
        animal.fed_at,
        animal.last_yield_at,
        nowMs,
        growth.stage === 'adult',
        animal.created_at,
      );
      if (hunger.isDead) throw badRequest('animal_dead', 'Vật nuôi đã chết vì bị bỏ đói quá lâu.');
      if (!hunger.canYield) throw badRequest('not_ready', 'Vật nuôi chưa có sản phẩm.');
      await putFarmItem(tx, farm.id, def.yieldItemId, 1);
      await tx.query('UPDATE farm_animals SET last_yield_at=$2 WHERE id=$1', [id, ctx.now()]);
    } else {
      const r = await tx.query<FarmPondFishRow>(
        'SELECT * FROM farm_pond_fishes WHERE farm_id=$1 AND id=$2 FOR UPDATE',
        [farm.id, id],
      );
      const fish = r.rows[0];
      const def = Object.values(POND_FISHES).find((f) => f.species === fish?.fish_species);
      if (!fish || !def) throw notFound('Không tìm thấy cá trong ao.');
      if (kind === 'pond-feed') {
        if (fish.fed_at) throw badRequest('already_fed', 'Cá đã được cho ăn.');
        await takeFarmItem(tx, farm.id, def.feedItemIds[0]!, 1);
        await tx.query('UPDATE farm_pond_fishes SET fed_at=$2 WHERE id=$1', [id, ctx.now()]);
      } else {
        if (!fish.fed_at || ctx.now().getTime() - fish.fed_at.getTime() < def.growthDurationSec * 1000)
          throw badRequest('not_ready', 'Cá chưa đến kỳ thu hoạch.');
        await putFarmItem(tx, farm.id, def.harvestItemId, 1);
        await tx.query('DELETE FROM farm_pond_fishes WHERE id=$1', [id]);
      }
    }
    return { ok: true };
  });
}
