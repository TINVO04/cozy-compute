import type { AppContext } from '../context.js';
import { withTx, type Tx } from '../db.js';
import { conflict } from '../errors.js';

/** Serialize a player's mutations and store the result atomically with their effects. */
export function gameplayAction<T>(
  ctx: AppContext,
  userId: string,
  key: string,
  fingerprint: string,
  action: (tx: Tx) => Promise<T>,
): Promise<T> {
  return withTx(ctx.db, async (tx) => {
    await tx.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const prior = await tx.query<{ fingerprint: string; result: T }>(
      'SELECT fingerprint, result FROM gameplay_actions WHERE user_id=$1 AND action_key=$2',
      [userId, key],
    );
    if (prior.rows[0]) {
      if (prior.rows[0].fingerprint !== fingerprint)
        throw conflict('idempotency_conflict', 'Yêu cầu đã được dùng cho thao tác khác.');
      return prior.rows[0].result;
    }
    const result = await action(tx);
    await tx.query(
      'INSERT INTO gameplay_actions(user_id,action_key,fingerprint,result) VALUES($1,$2,$3,$4)',
      [userId, key, fingerprint, JSON.stringify(result)],
    );
    return result;
  });
}
