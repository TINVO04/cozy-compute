import { FISH } from '@cozy/game-data';
import type { AppContext } from '../context.js';
import { withTx, type Queryable } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { postLedger } from '../ledger.js';
import { resolvedAppearance } from './players.js';

export interface BackpackFishItem {
  id: string;
  speciesId: string;
  sizeCm: number;
  weightKg: number;
  sizeCategory: 'small' | 'standard' | 'large' | 'giant';
  isHeld: boolean;
  favorite: boolean;
  aquariumSlot: number | null;
  caughtAt: string;
  name: string;
  rarity: string;
  habitat: string;
  coinValue: number;
}

const FISH_MAP = new Map(FISH.map((f) => [f.id, f]));

export function calculateFishCoinValue(
  speciesId: string,
  sizeCategory: 'small' | 'standard' | 'large' | 'giant',
): number {
  const species = FISH_MAP.get(speciesId);
  const base = species?.coin ?? 20;
  if (sizeCategory === 'giant') return Math.round(base * 1.85);
  if (sizeCategory === 'large') return Math.round(base * 1.35);
  if (sizeCategory === 'small') return Math.max(1, Math.round(base * 0.85));
  return base;
}

export async function getBackpackFish(q: Queryable, userId: string): Promise<BackpackFishItem[]> {
  const r = await q.query<{
    id: string;
    species_id: string;
    size_cm: string;
    weight_kg: string;
    size_category: 'small' | 'standard' | 'large' | 'giant';
    is_held: boolean;
    is_favorite: boolean;
    aquarium_slot: number | null;
    caught_at: Date;
  }>(
    `SELECT id, species_id, size_cm, weight_kg, size_category, is_held, is_favorite, aquarium_slot, caught_at
       FROM user_fish_inventory
      WHERE user_id = $1
      ORDER BY caught_at DESC`,
    [userId],
  );

  return r.rows.map((row) => {
    const species = FISH_MAP.get(row.species_id);
    const sizeCm = parseFloat(row.size_cm);
    const weightKg = parseFloat(row.weight_kg);
    const coinValue = calculateFishCoinValue(row.species_id, row.size_category);
    return {
      id: row.id,
      speciesId: row.species_id,
      sizeCm,
      weightKg,
      sizeCategory: row.size_category,
      isHeld: row.is_held,
      favorite: row.is_favorite,
      aquariumSlot: row.aquarium_slot,
      caughtAt: row.caught_at.toISOString(),
      name: species?.name ?? row.species_id,
      rarity: species?.rarity ?? 'common',
      habitat: species?.habitat ?? 'ocean',
      coinValue,
    };
  });
}

export async function holdFish(ctx: AppContext, userId: string, inventoryId: string) {
  return withTx(ctx.db, async (tx) => {
    const r = await tx.query<{ species_id: string; size_cm: string }>(
      `SELECT species_id, size_cm FROM user_fish_inventory WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [inventoryId, userId],
    );
    const target = r.rows[0];
    if (!target) throw notFound('Fish not found in backpack.');

    // Unhold any other fish
    await tx.query(`UPDATE user_fish_inventory SET is_held = false WHERE user_id = $1`, [userId]);
    // Set this one as held
    await tx.query(`UPDATE user_fish_inventory SET is_held = true WHERE id = $1 AND user_id = $2`, [
      inventoryId,
      userId,
    ]);

    const held = {
      speciesId: target.species_id,
      sizeCm: parseFloat(target.size_cm),
    };

    await tx.query(`UPDATE profiles SET held_fish = $2, updated_at = now() WHERE user_id = $1`, [
      userId,
      JSON.stringify(held),
    ]);

    const appearance = await resolvedAppearance(tx, userId);
    await ctx.redis.publish('player:appearance', JSON.stringify({ userId, appearance, statusText: '' }));

    return { ok: true, appearance, heldFish: held };
  });
}

export async function unholdFish(ctx: AppContext, userId: string) {
  return withTx(ctx.db, async (tx) => {
    await tx.query(`UPDATE user_fish_inventory SET is_held = false WHERE user_id = $1`, [userId]);
    await tx.query(`UPDATE profiles SET held_fish = NULL, updated_at = now() WHERE user_id = $1`, [userId]);

    const appearance = await resolvedAppearance(tx, userId);
    await ctx.redis.publish('player:appearance', JSON.stringify({ userId, appearance, statusText: '' }));

    return { ok: true, appearance, heldFish: null };
  });
}

export async function sellFish(ctx: AppContext, userId: string, inventoryId: string) {
  return withTx(ctx.db, async (tx) => {
    const r = await tx.query<{
      species_id: string;
      size_cm: string;
      size_category: 'small' | 'standard' | 'large' | 'giant';
      is_held: boolean;
      is_favorite: boolean;
      aquarium_slot: number | null;
    }>(
      `SELECT species_id, size_cm, size_category, is_held, is_favorite, aquarium_slot
         FROM user_fish_inventory
        WHERE id = $1 AND user_id = $2
        FOR UPDATE`,
      [inventoryId, userId],
    );
    const fish = r.rows[0];
    if (!fish) throw notFound('Fish not found in backpack.');
    if (fish.is_favorite || fish.aquarium_slot !== null)
      throw badRequest('fish_protected', 'Hãy bỏ yêu thích và đưa cá ra khỏi bể trước khi bán.');

    const coin = calculateFishCoinValue(fish.species_id, fish.size_category);

    await tx.query(`DELETE FROM user_fish_inventory WHERE id = $1`, [inventoryId]);

    let appearance = null;
    if (fish.is_held) {
      await tx.query(`UPDATE profiles SET held_fish = NULL, updated_at = now() WHERE user_id = $1`, [userId]);
      appearance = await resolvedAppearance(tx, userId);
      await ctx.redis.publish('player:appearance', JSON.stringify({ userId, appearance, statusText: '' }));
    }

    if (coin > 0) {
      await postLedger(tx, {
        userId,
        currency: 'coin',
        amount: coin,
        reason: 'fish_sale',
        referenceId: inventoryId,
        idempotencyKey: `sell:fish:${inventoryId}`,
        metadata: { speciesId: fish.species_id, sizeCm: parseFloat(fish.size_cm) },
      });
    }

    return { ok: true, coinEarned: coin, soldFishId: inventoryId, appearance };
  });
}

export async function sellAllFish(ctx: AppContext, userId: string) {
  return withTx(ctx.db, async (tx) => {
    const r = await tx.query<{
      id: string;
      species_id: string;
      size_cm: string;
      size_category: 'small' | 'standard' | 'large' | 'giant';
      is_held: boolean;
      is_favorite: boolean;
      aquarium_slot: number | null;
    }>(
      `SELECT id, species_id, size_cm, size_category, is_held FROM user_fish_inventory WHERE user_id = $1 AND NOT is_favorite AND aquarium_slot IS NULL AND NOT is_held FOR UPDATE`,
      [userId],
    );

    if (r.rows.length === 0) {
      return { ok: true, totalCoin: 0, count: 0 };
    }

    let totalCoin = 0;
    let hadHeld = false;
    for (const fish of r.rows) {
      totalCoin += calculateFishCoinValue(fish.species_id, fish.size_category);
      if (fish.is_held) hadHeld = true;
    }

    await tx.query(
      `DELETE FROM user_fish_inventory WHERE user_id = $1 AND NOT is_favorite AND aquarium_slot IS NULL AND NOT is_held`,
      [userId],
    );

    let appearance = null;
    if (hadHeld) {
      await tx.query(`UPDATE profiles SET held_fish = NULL, updated_at = now() WHERE user_id = $1`, [userId]);
      appearance = await resolvedAppearance(tx, userId);
      await ctx.redis.publish('player:appearance', JSON.stringify({ userId, appearance, statusText: '' }));
    }

    if (totalCoin > 0) {
      const sellId = crypto.randomUUID();
      await postLedger(tx, {
        userId,
        currency: 'coin',
        amount: totalCoin,
        reason: 'fish_sale',
        referenceId: sellId,
        idempotencyKey: `sell:all_fish:${sellId}`,
        metadata: { count: r.rows.length },
      });
    }

    return { ok: true, totalCoin, count: r.rows.length, appearance };
  });
}
