import { apartmentScore } from '@cozy/economy';
import { APARTMENT_COLS, APARTMENT_ROWS, APARTMENT_THEMES, RARITY_LABELS } from '@cozy/game-data';
import type { AppContext } from '../context.js';
import { withTx, type Queryable } from '../db.js';
import { badRequest, conflict, notFound } from '../errors.js';
import { postLedger } from '../ledger.js';
import { completeOnboardingStep, resolvedAppearance } from './players.js';

interface ItemRow {
  id: string;
  type: 'clothing' | 'furniture' | 'rod';
  slot: string | null;
  name: string;
  description: string;
  rarity: keyof typeof RARITY_LABELS;
  coin_price: number;
  sprite: string;
  size_w: number;
  size_h: number;
  decor: number;
  enabled: boolean;
}

const toItem = (i: ItemRow) => ({
  id: i.id,
  type: i.type,
  slot: i.slot,
  name: i.name,
  description: i.description,
  rarity: i.rarity,
  rarityLabel: RARITY_LABELS[i.rarity],
  price: i.coin_price,
  sprite: i.sprite,
  size: { w: i.size_w, h: i.size_h },
  decor: i.decor,
  enabled: i.enabled,
});

export async function catalog(q: Queryable, userId: string) {
  const r = await q.query<ItemRow & { owned: number | null; equipped_slot: string | null; wished: boolean }>(
    `SELECT d.*, i.quantity AS owned, i.equipped_slot, (w.item_id IS NOT NULL) AS wished
       FROM item_definitions d
       LEFT JOIN inventory_items i ON i.item_id = d.id AND i.user_id = $1
       LEFT JOIN wishlist w ON w.item_id = d.id AND w.user_id = $1
      WHERE d.enabled OR i.quantity > 0
      ORDER BY d.type, d.coin_price`,
    [userId],
  );
  return r.rows.map((row) => ({
    ...toItem(row),
    owned: row.owned ?? 0,
    equipped: Boolean(row.equipped_slot),
    wished: row.wished,
  }));
}

export async function buyItem(
  ctx: AppContext,
  userId: string,
  itemId: string,
  quantity: number,
  idempotencyKey: string,
) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10)
    throw badRequest('invalid_quantity', 'You can buy 1 to 10 at a time.');
  const ledgerKey = `buy:${userId}:${idempotencyKey}`;
  const replay = async () => {
    const existing = await ctx.db.query<{ balance_after: number }>(
      `SELECT balance_after FROM ledger_entries WHERE idempotency_key = $1 AND user_id = $2`,
      [ledgerKey, userId],
    );
    return existing.rows[0] ? { replayed: true, coin: existing.rows[0].balance_after } : null;
  };
  const prior = await replay();
  if (prior) return prior;
  try {
    return await purchase(ctx, userId, itemId, quantity, ledgerKey);
  } catch (err) {
    // A concurrent request with the same key won the race.
    if ((err as { code?: string }).code === '23505') {
      const again = await replay();
      if (again) return again;
    }
    throw err;
  }
}

async function purchase(
  ctx: AppContext,
  userId: string,
  itemId: string,
  quantity: number,
  ledgerKey: string,
) {
  return withTx(ctx.db, async (tx) => {
    const item = await tx.query<ItemRow>('SELECT * FROM item_definitions WHERE id = $1', [itemId]);
    const def = item.rows[0];
    if (!def || !def.enabled) throw notFound('That item is not for sale.');
    if ((def.type === 'clothing' || def.type === 'rod') && quantity !== 1)
      throw badRequest('invalid_quantity', 'Trang phục và cần câu chỉ mua từng cái một.');
    const owned = await tx.query<{ quantity: number }>(
      'SELECT quantity FROM inventory_items WHERE user_id = $1 AND item_id = $2',
      [userId, itemId],
    );
    if ((def.type === 'clothing' || def.type === 'rod') && (owned.rows[0]?.quantity ?? 0) > 0)
      throw conflict('already_owned', 'Bạn đã sở hữu vật phẩm này rồi.');
    const total = def.coin_price * quantity;
    const ledger = await postLedger(tx, {
      userId,
      currency: 'coin',
      amount: -total,
      reason: 'shop_purchase',
      referenceId: itemId,
      idempotencyKey: ledgerKey,
      metadata: { itemId, quantity, unitPrice: def.coin_price },
    });
    await tx.query(
      `INSERT INTO inventory_items (user_id, item_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = inventory_items.quantity + EXCLUDED.quantity`,
      [userId, itemId, quantity],
    );
    await tx.query('DELETE FROM wishlist WHERE user_id = $1 AND item_id = $2', [userId, itemId]);
    await completeOnboardingStep(tx, userId, 'purchase');
    return { replayed: false, coin: ledger.balanceAfter, item: toItem(def), quantity };
  });
}

export async function toggleWishlist(q: Queryable, userId: string, itemId: string, wished: boolean) {
  if (wished) {
    await q.query(
      'INSERT INTO wishlist (user_id, item_id) SELECT $1, id FROM item_definitions WHERE id = $2 ON CONFLICT DO NOTHING',
      [userId, itemId],
    );
  } else {
    await q.query('DELETE FROM wishlist WHERE user_id = $1 AND item_id = $2', [userId, itemId]);
  }
}

export async function equip(
  ctx: AppContext,
  userId: string,
  itemId: string | null,
  slot: 'hat' | 'top' | 'face' | 'rod' | 'boat',
) {
  await withTx(ctx.db, async (tx) => {
    await tx.query(
      'UPDATE inventory_items SET equipped_slot = NULL WHERE user_id = $1 AND equipped_slot = $2',
      [userId, slot],
    );
    if (itemId) {
      if (itemId === 'rod_twig') {
        await tx.query(
          `INSERT INTO inventory_items (user_id, item_id, quantity)
           VALUES ($1, 'rod_twig', 1)
           ON CONFLICT (user_id, item_id) DO NOTHING`,
          [userId],
        );
      }
      const r = await tx.query(
        `UPDATE inventory_items i SET equipped_slot = $3
           FROM item_definitions d
          WHERE i.user_id = $1 AND i.item_id = $2 AND d.id = i.item_id AND (d.type = 'clothing' OR d.type = 'rod' OR d.type = 'boat') AND d.slot = $3 AND i.quantity > 0`,
        [userId, itemId, slot],
      );
      if (!r.rowCount) throw notFound('You do not own that item.');
    }
  });
  const appearance = await resolvedAppearance(ctx.db, userId);
  await ctx.redis.publish('player:appearance', JSON.stringify({ userId, appearance }));
  return appearance;
}

// ---------------------------------------------------------------- apartments

export interface PlacedObject {
  itemId: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
}

export async function apartmentFor(q: Queryable, ownerId: string, viewerId: string) {
  const a = await q.query<{
    id: string;
    user_id: string;
    name: string;
    theme_id: string;
    score: number;
    published: boolean;
    visits: number;
    display_name: string;
    updated_at: Date;
  }>(
    `SELECT a.*, p.display_name FROM apartments a JOIN profiles p ON p.user_id = a.user_id WHERE a.user_id = $1`,
    [ownerId],
  );
  const apt = a.rows[0];
  if (!apt) throw notFound('Apartment not found.');
  if (apt.user_id !== viewerId && !apt.published) throw notFound('This apartment is private.');
  const objects = await q.query<{
    id: string;
    item_id: string;
    x: number;
    y: number;
    rotation: number;
    sprite: string;
    size_w: number;
    size_h: number;
    name: string;
  }>(
    `SELECT o.id, o.item_id, o.x, o.y, o.rotation, d.sprite, d.size_w, d.size_h, d.name
       FROM apartment_objects o JOIN item_definitions d ON d.id = o.item_id WHERE o.apartment_id = $1 ORDER BY o.y, o.x`,
    [apt.id],
  );
  return {
    id: apt.id,
    ownerId: apt.user_id,
    ownerName: apt.display_name,
    name: apt.name,
    themeId: apt.theme_id,
    score: apt.score,
    published: apt.published,
    visits: apt.visits,
    isOwner: apt.user_id === viewerId,
    updatedAt: apt.updated_at.toISOString(),
    grid: { cols: APARTMENT_COLS, rows: APARTMENT_ROWS },
    objects: objects.rows.map((o) => ({
      id: o.id,
      itemId: o.item_id,
      x: o.x,
      y: o.y,
      rotation: o.rotation,
      sprite: o.sprite,
      size: { w: o.size_w, h: o.size_h },
      name: o.name,
    })),
  };
}

function footprint(o: PlacedObject, size: { w: number; h: number }) {
  const rotated = o.rotation === 90 || o.rotation === 270;
  return { w: rotated ? size.h : size.w, h: rotated ? size.w : size.h };
}

export async function saveApartment(
  ctx: AppContext,
  userId: string,
  input: { name: string; themeId: string; published: boolean; objects: PlacedObject[] },
) {
  if (!APARTMENT_THEMES.some((t) => t.id === input.themeId))
    throw badRequest('invalid_theme', 'Unknown room theme.');
  if (input.objects.length > 60) throw badRequest('too_many_objects', 'A room can hold up to 60 objects.');
  const result = await withTx(ctx.db, async (tx) => {
    const apt = await tx.query<{ id: string }>('SELECT id FROM apartments WHERE user_id = $1 FOR UPDATE', [
      userId,
    ]);
    const aptId = apt.rows[0]?.id;
    if (!aptId) throw notFound('Apartment not found.');
    const inv = await tx.query<{
      item_id: string;
      quantity: number;
      size_w: number;
      size_h: number;
      decor: number;
    }>(
      `SELECT i.item_id, i.quantity, d.size_w, d.size_h, d.decor FROM inventory_items i
         JOIN item_definitions d ON d.id = i.item_id WHERE i.user_id = $1 AND d.type = 'furniture'`,
      [userId],
    );
    const owned = new Map(inv.rows.map((r) => [r.item_id, r]));
    const counts = new Map<string, number>();
    const occupied = new Set<string>();
    for (const o of input.objects) {
      const def = owned.get(o.itemId);
      if (!def) throw badRequest('not_owned', 'You can only place furniture you own.');
      counts.set(o.itemId, (counts.get(o.itemId) ?? 0) + 1);
      if (counts.get(o.itemId)! > def.quantity)
        throw badRequest('not_enough', 'You placed more copies than you own.');
      const fp = footprint(o, { w: def.size_w, h: def.size_h });
      if (o.x < 0 || o.y < 1 || o.x + fp.w > APARTMENT_COLS || o.y + fp.h > APARTMENT_ROWS) {
        throw badRequest('out_of_bounds', 'Some furniture is outside the room.');
      }
      // Rugs sit under other furniture; everything else cannot overlap.
      if (o.itemId.includes('rug')) continue;
      for (let dx = 0; dx < fp.w; dx++)
        for (let dy = 0; dy < fp.h; dy++) {
          const cell = `${o.x + dx},${o.y + dy}`;
          if (occupied.has(cell)) throw badRequest('overlap', 'Two pieces of furniture overlap.');
          occupied.add(cell);
        }
    }
    const score = apartmentScore(
      input.objects,
      Object.fromEntries(inv.rows.map((r) => [r.item_id, r.decor])),
    );
    await tx.query('DELETE FROM apartment_objects WHERE apartment_id = $1', [aptId]);
    for (const o of input.objects) {
      await tx.query(
        `INSERT INTO apartment_objects (apartment_id, item_id, x, y, rotation, layer) VALUES ($1,$2,$3,$4,$5,$6)`,
        [aptId, o.itemId, o.x, o.y, o.rotation, o.itemId.includes('rug') ? 0 : 1],
      );
    }
    await tx.query(
      `UPDATE apartments SET name = $2, theme_id = $3, published = $4, score = $5, updated_at = now() WHERE id = $1`,
      [aptId, input.name, input.themeId, input.published, score],
    );
    if (input.objects.length > 0) await completeOnboardingStep(tx, userId, 'apartment');
    return { score };
  });
  await ctx.redis.publish('apartment:updated', JSON.stringify({ ownerId: userId }));
  return result;
}

export async function publishedApartments(q: Queryable, sort: 'score' | 'recent' | 'visits') {
  const order =
    sort === 'recent' ? 'a.updated_at DESC' : sort === 'visits' ? 'a.visits DESC' : 'a.score DESC';
  const r = await q.query<{
    user_id: string;
    name: string;
    theme_id: string;
    score: number;
    visits: number;
    display_name: string;
    objects: number;
  }>(
    `SELECT a.user_id, a.name, a.theme_id, a.score, a.visits, p.display_name,
            (SELECT count(*)::int FROM apartment_objects o WHERE o.apartment_id = a.id) AS objects
       FROM apartments a JOIN profiles p ON p.user_id = a.user_id
      WHERE a.published ORDER BY ${order} LIMIT 50`,
  );
  return r.rows.map((a) => ({
    ownerId: a.user_id,
    ownerName: a.display_name,
    name: a.name,
    themeId: a.theme_id,
    score: a.score,
    visits: a.visits,
    objects: a.objects,
  }));
}
