import { FISH, RESIDENT_QUESTS, RESIDENT_RECIPES } from '@cozy/game-data';
import type { AppContext } from '../context.js';
import type { Queryable } from '../db.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { postLedger } from '../ledger.js';
import { getOrCreateFarm, putFarmItem, takeFarmItem } from './farm.js';
import { gameplayAction } from './gameplay-actions.js';

async function stats(q: Queryable, userId: string) {
  const r = await q.query<{ jobs: number; species: number; contracts: number; orders: number; wins: number }>(
    `SELECT
    (SELECT count(*)::int FROM activity_runs WHERE user_id=$1 AND status='completed') jobs,
    (SELECT count(*)::int FROM fish_journal WHERE user_id=$1) species,
    (SELECT count(*)::int FROM farm_contract_completions c JOIN farms f ON f.id=c.farm_id WHERE f.user_id=$1) contracts,
    (SELECT count(*)::int FROM resident_orders WHERE user_id=$1 AND status='completed') orders,
    (SELECT count(*)::int FROM bida_matches WHERE winner_id=$1) wins`,
    [userId],
  );
  return r.rows[0]!;
}
export async function residentState(ctx: AppContext, userId: string) {
  const progress = await stats(ctx.db, userId);
  const claims = await ctx.db.query<{ quest_id: string }>(
    'SELECT quest_id FROM resident_claims WHERE user_id=$1',
    [userId],
  );
  const order = await ctx.db.query(
    `SELECT id,recipe_id,destination,started_at FROM resident_orders WHERE user_id=$1 AND status='active'`,
    [userId],
  );
  return {
    progress,
    quests: RESIDENT_QUESTS.map((q) => ({
      ...q,
      progress: Math.min(q.target, progress[q.metric]),
      claimed: claims.rows.some((c) => c.quest_id === q.id),
    })),
    recipes: RESIDENT_RECIPES.map((r) => ({ ...r, unlocked: progress.orders >= r.unlockOrders })),
    order: order.rows[0] ?? null,
  };
}
export function claimQuest(ctx: AppContext, userId: string, key: string, questId: string) {
  return gameplayAction(ctx, userId, key, 'quest:' + questId, async (tx) => {
    const quest = RESIDENT_QUESTS.find((q) => q.id === questId);
    if (!quest) throw notFound('Không tìm thấy nhiệm vụ.');
    if ((await stats(tx, userId))[quest.metric] < quest.target)
      throw badRequest('quest_incomplete', 'Chưa đủ tiến trình.');
    const claim = await tx.query(
      'INSERT INTO resident_claims(user_id,quest_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING quest_id',
      [userId, questId],
    );
    if (claim.rowCount)
      await postLedger(tx, {
        userId,
        currency: 'coin',
        amount: quest.coin,
        reason: 'resident_quest',
        idempotencyKey: `quest:${userId}:${questId}`,
      });
    return { ok: true, title: quest.title };
  });
}
async function requireRoom(ctx: AppContext, userId: string, room: string) {
  const pos = await ctx.positionOf(userId);
  if (!pos || (pos.room !== room && !pos.room.startsWith(room + ':')) || ctx.now().getTime() - pos.at > 15000)
    throw badRequest('not_at_location', 'Hãy vào đúng địa điểm để thực hiện.');
}
export function kitchenAction(
  ctx: AppContext,
  userId: string,
  key: string,
  kind: 'cook' | 'order' | 'deliver' | 'cancel',
  id: string,
) {
  return gameplayAction(ctx, userId, key, JSON.stringify({ kind, id }), async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['farm:' + userId]);
    const farm = await getOrCreateFarm(tx, userId);
    if (kind === 'cook' || kind === 'order') {
      await requireRoom(ctx, userId, 'comga');
      const recipe = RESIDENT_RECIPES.find((r) => r.id === id);
      if (!recipe) throw notFound('Không có công thức này.');
      if ((await stats(tx, userId)).orders < recipe.unlockOrders)
        throw badRequest('recipe_locked', 'Hoàn thành thêm đơn hàng để mở công thức.');
      if (kind === 'cook') {
        for (const ingredient of recipe.ingredients)
          await takeFarmItem(tx, farm.id, ingredient.id, ingredient.quantity);
        await putFarmItem(tx, farm.id, recipe.output, 1);
      } else {
        const active = await tx.query(`SELECT id FROM resident_orders WHERE user_id=$1 AND status='active'`, [
          userId,
        ]);
        if (active.rowCount) throw badRequest('order_active', 'Hãy hoàn thành đơn đang giao.');
        await takeFarmItem(tx, farm.id, recipe.output, 1);
        await tx.query(
          'INSERT INTO resident_orders(user_id,recipe_id,destination,started_at) VALUES($1,$2,$3,$4)',
          [userId, id, recipe.destination, ctx.now()],
        );
      }
    } else {
      const r = await tx.query<{ id: string; recipe_id: string; destination: string; started_at: Date }>(
        `SELECT * FROM resident_orders WHERE id=$1 AND user_id=$2 AND status='active' FOR UPDATE`,
        [id, userId],
      );
      const order = r.rows[0];
      if (!order) throw notFound('Không tìm thấy đơn đang giao.');
      const recipe = RESIDENT_RECIPES.find((r) => r.id === order.recipe_id)!;
      if (kind === 'cancel') {
        await putFarmItem(tx, farm.id, recipe.output, 1);
        await tx.query(`UPDATE resident_orders SET status='cancelled' WHERE id=$1`, [id]);
      } else {
        await requireRoom(ctx, userId, order.destination);
        if (ctx.now().getTime() - order.started_at.getTime() < 20000)
          throw badRequest('too_fast', 'Đơn hàng chưa đến thời gian giao.');
        await postLedger(tx, {
          userId,
          currency: 'coin',
          amount: recipe.reward,
          reason: 'meal_delivery',
          referenceId: id,
          idempotencyKey: 'meal:' + id,
        });
        await tx.query(`UPDATE resident_orders SET status='completed',completed_at=$2 WHERE id=$1`, [
          id,
          ctx.now(),
        ]);
      }
    }
    return { ok: true };
  });
}
export async function aquariumState(ctx: AppContext, viewerId: string, ownerId: string) {
  const apt = await ctx.db.query<{ published: boolean }>(
    'SELECT published FROM apartments WHERE user_id=$1',
    [ownerId],
  );
  if (viewerId !== ownerId && !apt.rows[0]?.published) throw forbidden('Nhà này chưa mở cửa.');
  const fish = await ctx.db.query<{
    id: string;
    species_id: string;
    weight_kg: number;
    size_cm: number;
    caught_at: Date;
    aquarium_slot: number;
    is_favorite: boolean;
  }>(
    `SELECT * FROM user_fish_inventory WHERE user_id=$1 AND ($2 OR aquarium_slot IS NOT NULL) ORDER BY aquarium_slot NULLS LAST,caught_at DESC`,
    [ownerId, viewerId === ownerId],
  );
  const claims = await ctx.db.query<{ quest_id: string }>(
    'SELECT quest_id FROM resident_claims WHERE user_id=$1',
    [ownerId],
  );
  return {
    fish: fish.rows.map((f) => ({
      id: f.id,
      speciesId: f.species_id,
      name: FISH.find((s) => s.id === f.species_id)?.name ?? f.species_id,
      weightKg: Number(f.weight_kg),
      sizeCm: Number(f.size_cm),
      caughtAt: f.caught_at,
      slot: f.aquarium_slot,
      favorite: f.is_favorite,
    })),
    trophies: RESIDENT_QUESTS.filter((q) => claims.rows.some((c) => c.quest_id === q.id)).map((q) => q.title),
  };
}
export function aquariumAction(
  ctx: AppContext,
  userId: string,
  key: string,
  id: string,
  slot: number | null,
  favorite: boolean,
) {
  return gameplayAction(ctx, userId, key, JSON.stringify({ id, slot, favorite }), async (tx) => {
    if (slot !== null) {
      const furniture = await tx.query(
        `SELECT 1 FROM apartment_objects o JOIN apartments a ON a.id=o.apartment_id WHERE a.user_id=$1 AND o.item_id='furn_aquarium'`,
        [userId],
      );
      if (!furniture.rowCount)
        throw badRequest('aquarium_required', 'Đặt bể cá trong nhà trước khi trưng bày.');
      await tx.query(
        'UPDATE user_fish_inventory SET aquarium_slot=NULL WHERE user_id=$1 AND aquarium_slot=$2',
        [userId, slot],
      );
    }
    const r = await tx.query(
      'UPDATE user_fish_inventory SET aquarium_slot=$3,is_favorite=$4 WHERE user_id=$1 AND id=$2 RETURNING id',
      [userId, id, slot, favorite],
    );
    if (!r.rowCount) throw notFound('Cá không còn trong túi.');
    return { ok: true };
  });
}
export async function bidaRecords(ctx: AppContext, userId: string) {
  const leaderboard = await ctx.db.query(
    `SELECT p.user_id AS id,p.display_name AS name,count(*)::int wins FROM bida_matches m JOIN profiles p ON p.user_id=m.winner_id WHERE finished_at >= date_trunc('week',now()) GROUP BY p.user_id,p.display_name ORDER BY wins DESC,p.display_name LIMIT 20`,
  );
  const history = await ctx.db.query(
    `SELECT m.id,m.mode,m.winner_id,m.finished_at,h.display_name AS host,g.display_name AS guest FROM bida_matches m JOIN profiles h ON h.user_id=m.host_id JOIN profiles g ON g.user_id=m.guest_id WHERE $1 IN(m.host_id,m.guest_id) ORDER BY finished_at DESC LIMIT 20`,
    [userId],
  );
  return { leaderboard: leaderboard.rows, history: history.rows };
}
export async function communityState(ctx: AppContext, userId: string) {
  const fishing = await ctx.db.query(
    `SELECT p.user_id id,p.display_name name,max(c.weight_kg)::float weight FROM fishing_catches c JOIN profiles p ON p.user_id=c.user_id WHERE c.caught_at>=date_trunc('week',now()) GROUP BY p.user_id,p.display_name ORDER BY weight DESC,p.display_name LIMIT 20`,
  );
  const homes = await ctx.db.query(
    `SELECT a.user_id id,p.display_name name,a.score,count(v.voter_id)::int votes FROM apartments a JOIN profiles p ON p.user_id=a.user_id LEFT JOIN community_votes v ON v.owner_id=a.user_id AND v.week=date_trunc('week',now())::date WHERE a.published GROUP BY a.user_id,p.display_name,a.score ORDER BY votes DESC,a.score DESC LIMIT 20`,
  );
  const vote = await ctx.db.query<{ owner_id: string }>(
    `SELECT owner_id FROM community_votes WHERE voter_id=$1 AND week=date_trunc('week',now())::date`,
    [userId],
  );
  return { fishing: fishing.rows, homes: homes.rows, votedFor: vote.rows[0]?.owner_id ?? null };
}
export function voteHome(ctx: AppContext, userId: string, key: string, ownerId: string) {
  return gameplayAction(ctx, userId, key, 'vote:' + ownerId, async (tx) => {
    if (ownerId === userId) throw badRequest('self_vote', 'Hãy bình chọn cho một người hàng xóm.');
    const apt = await tx.query('SELECT id FROM apartments WHERE user_id=$1 AND published', [ownerId]);
    if (!apt.rowCount) throw notFound('Nhà chưa mở cửa.');
    const vote = await tx.query(
      `INSERT INTO community_votes(voter_id,owner_id,week) VALUES($1,$2,date_trunc('week',now())::date) ON CONFLICT DO NOTHING RETURNING owner_id`,
      [userId, ownerId],
    );
    if (!vote.rowCount) throw badRequest('already_voted', 'Bạn đã bình chọn tuần này.');
    return { ok: true };
  });
}
