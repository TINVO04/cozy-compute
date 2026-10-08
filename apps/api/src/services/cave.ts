import {
  CAVE_RESOURCES,
  CAVE_WEAPONS,
  caveSaleValue,
  type CaveAccount,
  type CaveResource,
  type CaveWeapon,
} from '@cozy/game-data';
import type { AppContext } from '../context.js';
import { withTx } from '../db.js';
import { badRequest } from '../errors.js';
import { postLedger } from '../ledger.js';

export interface CaveTransaction {
  userId: string;
  action: 'load' | 'buy' | 'sell' | 'loot';
  requestId: string;
  item?: string;
  quantity?: number;
}
/** Called only by the trusted simulation, never by a browser. Inventory and ledger commit together. */
export async function caveTransaction(ctx: AppContext, b: CaveTransaction): Promise<CaveAccount> {
  return withTx(ctx.db, async (tx) => {
    await tx.query('SELECT user_id FROM balances WHERE user_id = $1 FOR UPDATE', [b.userId]);
    await tx.query('INSERT INTO cave_accounts (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [b.userId]);
    const result = await tx.query<{ weapon: CaveWeapon; stone: number; iron: number; crystal: number }>(
      'SELECT * FROM cave_accounts WHERE user_id = $1 FOR UPDATE',
      [b.userId],
    );
    const row = result.rows[0]!;
    const account = {
      weapon: row.weapon,
      resources: { stone: row.stone, iron: row.iron, crystal: row.crystal },
      coin: 0,
    };
    const previous = await tx.query(
      'SELECT 1 FROM cave_transactions WHERE user_id = $1 AND request_id = $2',
      [b.userId, b.requestId],
    );
    if (b.action !== 'load' && !previous.rowCount) {
      let amount = 0;
      if (b.action === 'buy') {
        const index = CAVE_WEAPONS.findIndex((w) => w.id === b.item);
        if (index <= CAVE_WEAPONS.findIndex((w) => w.id === account.weapon))
          throw badRequest('weapon_owned', 'Bạn đã sở hữu vũ khí này hoặc vũ khí mạnh hơn.');
        const weapon = CAVE_WEAPONS[index];
        if (!weapon) throw badRequest('weapon_invalid', 'Vũ khí không hợp lệ.');
        amount = -weapon.price;
        account.weapon = weapon.id;
        const swordItemId = `sword_${weapon.id}`;
        await tx.query(
          `INSERT INTO inventory_items (user_id, item_id, quantity, equipped_slot)
           VALUES ($1, $2, 1, 'sword')
           ON CONFLICT (user_id, item_id) DO UPDATE SET equipped_slot = 'sword'`,
          [b.userId, swordItemId],
        );
      } else if (b.action === 'sell') {
        amount = caveSaleValue(account.resources);
        if (!amount) throw badRequest('empty_bag', 'Bạn chưa có tài nguyên để bán.');
        account.resources = { stone: 0, iron: 0, crystal: 0 };
      } else {
        if (
          !CAVE_RESOURCES.some((r) => r.id === b.item) ||
          !Number.isInteger(b.quantity) ||
          b.quantity! < 1 ||
          b.quantity! > 20
        )
          throw badRequest('loot_invalid', 'Vật phẩm không hợp lệ.');
        account.resources[b.item as CaveResource] += b.quantity!;
      }
      if (amount)
        await postLedger(tx, {
          userId: b.userId,
          currency: 'coin',
          amount,
          reason: `cave_${b.action}`,
          idempotencyKey: `cave:${b.userId}:${b.requestId}`,
        });
      await tx.query('UPDATE cave_accounts SET weapon=$2, stone=$3, iron=$4, crystal=$5 WHERE user_id=$1', [
        b.userId,
        account.weapon,
        account.resources.stone,
        account.resources.iron,
        account.resources.crystal,
      ]);
      await tx.query('INSERT INTO cave_transactions (user_id, request_id) VALUES ($1,$2)', [
        b.userId,
        b.requestId,
      ]);
    }
    const balance = await tx.query<{ coin: number }>('SELECT coin FROM balances WHERE user_id=$1', [
      b.userId,
    ]);
    account.coin = balance.rows[0]!.coin;
    return account;
  });
}
