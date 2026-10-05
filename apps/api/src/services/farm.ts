import { randomBytes } from 'node:crypto';
import {
  ANIMALS,
  BAC_SAU_SHOP_ITEMS,
  CROPS,
  DAILY_MARKET_CONTRACTS,
  getPlotUnlockPrice,
  POND_FISHES,
  TOTAL_FARM_PLOTS,
  WAREHOUSE_UPGRADE_TIERS,
  type CropId,
  type CropGrowthStage,
} from '@cozy/game-data';
import { hashPassword, verifyPassword } from '../auth.js';
import type { AppContext } from '../context.js';
import { withTx, type Queryable } from '../db.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../errors.js';
import { postLedger } from '../ledger.js';

export interface FarmRecord {
  id: string;
  user_id: string;
  password_hash: string | null;
  is_public: boolean;
  warehouse_capacity: number;
  created_at: Date;
  updated_at: Date;
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
  const baseWeight = Number(fish.current_weight_kg) || 0.15;
  const elapsedDays = Math.max(0, (currentTimeMs - new Date(fish.stocked_at).getTime()) / (86400 * 1000));
  const weightKg = Number((baseWeight + elapsedDays * 0.45).toFixed(2));

  let stage = 'juvenile';
  if (weightKg >= 2.0) stage = 'specialty';
  else if (weightKg >= 1.0) stage = 'adult';
  else if (weightKg >= 0.3) stage = 'juvenile';
  else stage = 'fingerling';

  return { weightKg, stage };
}

export async function getOrCreateFarm(q: Queryable, userId: string): Promise<FarmRecord> {
  const existing = await q.query<FarmRecord>('SELECT * FROM farms WHERE user_id = $1', [userId]);
  if (existing.rows[0]) return existing.rows[0];

  const inserted = await q.query<FarmRecord>(
    `INSERT INTO farms (user_id, is_public, warehouse_capacity)
     VALUES ($1, true, 100)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING *`,
    [userId],
  );
  const farm = inserted.rows[0]!;

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

  // Provision starter animals
  await q.query(
    `INSERT INTO farm_animals (farm_id, animal_type, name, happiness)
     VALUES
       ($1, 'poultry', 'Gà Ri', 50),
       ($1, 'cow', 'Bò Vàng', 50),
       ($1, 'pig', 'Heo Mọi', 50),
       ($1, 'goat', 'Dê Núi', 50)
     ON CONFLICT DO NOTHING`,
    [farm.id],
  );

  return farm;
}

export async function getFarmFullState(ctx: AppContext, userId: string) {
  const farm = await getOrCreateFarm(ctx.db, userId);
  const now = ctx.now().getTime();

  const plotsRes = await ctx.db.query<FarmPlotRow>(
    'SELECT * FROM farm_plots WHERE farm_id = $1 ORDER BY plot_index ASC',
    [farm.id],
  );

  const plots = plotsRes.rows.map((p) => {
    const stage = p.crop_id ? computeCropStage(p.crop_id, p.planted_at, p.is_fertilized, now) : 'empty';
    return {
      id: p.id,
      plotIndex: p.plot_index,
      isUnlocked: p.is_unlocked,
      unlockPrice: p.unlock_price,
      cropId: p.crop_id,
      plantedAt: p.planted_at,
      wateredAt: p.watered_at,
      isFertilized: p.is_fertilized,
      isTilled: p.is_tilled,
      stage,
    };
  });

  const animalsRes = await ctx.db.query<FarmAnimalRow>(
    'SELECT * FROM farm_animals WHERE farm_id = $1 ORDER BY created_at ASC',
    [farm.id],
  );
  const animals = animalsRes.rows.map((a) => ({
    id: a.id,
    type: a.animal_type,
    name: a.name,
    fedAt: a.fed_at,
    happiness: a.happiness,
    lastYieldAt: a.last_yield_at,
  }));

  const warehouseRes = await ctx.db.query<FarmWarehouseItemRow>(
    'SELECT * FROM farm_warehouse_items WHERE farm_id = $1 ORDER BY created_at ASC',
    [farm.id],
  );
  const warehouseItems = warehouseRes.rows.map((w) => ({
    itemId: w.item_id,
    category: w.category,
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
    plots,
    animals,
    warehouse: {
      capacity: farm.warehouse_capacity,
      items: warehouseItems,
    },
    pondFishes,
    todayContracts: DAILY_MARKET_CONTRACTS,
  };
}

export async function unlockPlot(
  ctx: AppContext,
  userId: string,
  plotIndex: number,
  idempotencyKey?: string,
) {
  return withTx(ctx.db, async (tx) => {
    // Serialize provisioning, replay checks and mutation for this farm in one transaction.
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['farm:' + userId]);
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
}

export async function plantSeed(
  ctx: AppContext,
  userId: string,
  plotIndex: number,
  seedItemId: string,
  useFertilizer?: boolean,
  targetFarmOwnerId?: string,
) {
  if (targetFarmOwnerId && targetFarmOwnerId !== userId) {
    throw forbidden('Guests cannot plant seeds on this farm.');
  }

  const farm = await getOrCreateFarm(ctx.db, userId);
  const plotRes = await ctx.db.query<FarmPlotRow>(
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

  return withTx(ctx.db, async (tx) => {
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
    const updated = await tx.query<FarmPlotRow>(
      `UPDATE farm_plots
       SET crop_id = $1, planted_at = $2, is_fertilized = $3, growth_stage = 'seed', is_tilled = true, updated_at = $2
       WHERE farm_id = $4 AND plot_index = $5
       RETURNING *`,
      [cropEntry.id, now, fertilized, farm.id, plotIndex],
    );

    return {
      ok: true,
      plot: {
        plotIndex: updated.rows[0]!.plot_index,
        cropId: updated.rows[0]!.crop_id,
        stage: 'seed',
        isFertilized: updated.rows[0]!.is_fertilized,
      },
    };
  });
}

export async function waterPlot(ctx: AppContext, visitorId: string, plotIndex: number, farmOwnerId?: string) {
  const targetOwnerId = farmOwnerId ?? visitorId;
  const isGuest = targetOwnerId !== visitorId;
  const farm = await getOrCreateFarm(ctx.db, targetOwnerId);

  const plotRes = await ctx.db.query<FarmPlotRow>(
    'SELECT * FROM farm_plots WHERE farm_id = $1 AND plot_index = $2',
    [farm.id, plotIndex],
  );
  const plot = plotRes.rows[0];
  if (!plot) throw notFound('Plot not found');
  if (!plot.is_unlocked) throw badRequest('plot_locked', 'Cannot water locked plot');

  const now = ctx.now();
  await ctx.db.query(
    'UPDATE farm_plots SET watered_at = $1, is_tilled = true, updated_at = $1 WHERE farm_id = $2 AND plot_index = $3',
    [now, farm.id, plotIndex],
  );

  let fameAwarded = 0;
  if (isGuest) {
    fameAwarded = 15;
    await ctx.db.query('UPDATE profiles SET fame = fame + $1 WHERE user_id = $2', [fameAwarded, visitorId]);
  }

  return {
    ok: true,
    wateredAt: now.toISOString(),
    isGuestHelper: isGuest,
    fameAwarded,
  };
}

export async function harvestPlot(
  ctx: AppContext,
  callerId: string,
  plotIndex: number,
  farmOwnerId?: string,
) {
  if (farmOwnerId && farmOwnerId !== callerId) {
    throw forbidden('Guests cannot harvest crops from other players.');
  }

  const farm = await getOrCreateFarm(ctx.db, callerId);
  const plotRes = await ctx.db.query<FarmPlotRow>(
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
  const harvestedItem = cropDef?.id ?? plot.crop_id;

  return withTx(ctx.db, async (tx) => {
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
       SET crop_id = NULL, planted_at = NULL, is_fertilized = false, growth_stage = 'empty', updated_at = now()
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

export async function buyShopItem(
  ctx: AppContext,
  userId: string,
  itemId: string,
  quantity: number,
  idempotencyKey?: string,
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw badRequest('invalid_quantity', 'Quantity must be a positive integer.');
  }

  const ledgerKey = idempotencyKey ? `farm:shop:buy:${userId}:${idempotencyKey}` : undefined;
  if (ledgerKey) {
    const existing = await ctx.db.query<{ balance_after: number; metadata: Record<string, unknown> | null }>(
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

  const totalPrice = unitPrice * quantity;
  const farm = await getOrCreateFarm(ctx.db, userId);

  return withTx(ctx.db, async (tx) => {
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

    return {
      ok: true,
      coinBalance: ledger.balanceAfter,
      purchased: { itemId, quantity },
    };
  });
}

export async function sellShopProduce(
  ctx: AppContext,
  userId: string,
  itemId: string,
  quantity: number,
  contractId?: string,
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw badRequest('invalid_quantity', 'Quantity must be a positive integer.');
  }

  const farm = await getOrCreateFarm(ctx.db, userId);

  return withTx(ctx.db, async (tx) => {
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

    if (contractId) {
      const contract = DAILY_MARKET_CONTRACTS.find((c) => c.id === contractId);
      if (contract && quantity >= contract.requiredQuantity) {
        bonusPercent = contract.bonusPercent;
        fameEarned = contract.rewardFame;
        totalCoin = Math.floor(totalCoin * (1 + bonusPercent / 100));
        await tx.query('UPDATE profiles SET fame = fame + $1 WHERE user_id = $2', [fameEarned, userId]);
      }
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

    return {
      ok: true,
      coinEarned: totalCoin,
      bonusPercent,
      fameEarned,
      coinBalance: ledger.balanceAfter,
    };
  });
}

export async function feedAnimal(ctx: AppContext, userId: string, animalId: string, feedItemId: string) {
  const farm = await getOrCreateFarm(ctx.db, userId);
  const animalRes = await ctx.db.query<FarmAnimalRow>(
    'SELECT * FROM farm_animals WHERE id = $1 AND farm_id = $2',
    [animalId, farm.id],
  );
  const animal = animalRes.rows[0];
  if (!animal) throw notFound('Animal not found on your farm.');

  return withTx(ctx.db, async (tx) => {
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

    const newHappiness = Math.min(100, animal.happiness + 20);
    const now = ctx.now();
    await tx.query('UPDATE farm_animals SET happiness = $1, fed_at = $2, updated_at = $2 WHERE id = $3', [
      newHappiness,
      now,
      animalId,
    ]);

    return {
      ok: true,
      happiness: newHappiness,
      fedAt: now.toISOString(),
    };
  });
}

export async function stockPondFish(ctx: AppContext, userId: string, fishSpecies: string) {
  const validSpecies = ['tra', 'basa', 'loc', 'tom_cang', 'bong_tuong'];
  if (!validSpecies.includes(fishSpecies)) {
    throw badRequest('invalid_species', 'Invalid fish species.');
  }

  const farm = await getOrCreateFarm(ctx.db, userId);
  const now = ctx.now();
  const inserted = await ctx.db.query<FarmPondFishRow>(
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

export async function upgradeWarehouse(ctx: AppContext, userId: string, idempotencyKey?: string) {
  return withTx(ctx.db, async (tx) => {
    // Serialize provisioning, replay checks and mutation for this farm in one transaction.
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['farm:' + userId]);
    const farm = await getOrCreateFarm(tx, userId);
    const currentCapacity = farm.warehouse_capacity;

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
        const recordedCapacity =
          (existing.rows[0].metadata?.newCapacity as number) ?? farm.warehouse_capacity;
        return { ok: true, newCapacity: recordedCapacity, coinBalance: existing.rows[0].balance_after };
      }
      return null;
    };

    const prior = await replay();
    if (prior) return prior;

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
    'UPDATE farms SET is_public = $1, password_hash = $2, updated_at = now() WHERE id = $3',
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

  if (!farm.is_public && farm.password_hash) {
    if (!password) throw unauthorized('Password required.');
    const valid = await verifyPassword(farm.password_hash, password);
    if (!valid) throw unauthorized('Mật khẩu trang trại không chính xác.');
  }

  const token = `fauth_${randomBytes(24).toString('base64url')}`;
  await ctx.redis.set(`fauth:${token}`, JSON.stringify({ ownerId: farmOwnerId, visitorId }), 'EX', 86400);

  return {
    ok: true,
    farmAuthToken: token,
  };
}
