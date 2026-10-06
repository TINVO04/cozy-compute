import { TRAFFIC_FINES, type TrafficViolation } from '@cozy/game-data';
import type { AppContext } from '../context.js';
import { withTx } from '../db.js';
import { postLedger } from '../ledger.js';

/** Only called by the authenticated realtime server; prices never come from a client. */
export async function issueTrafficFine(
  ctx: AppContext,
  userId: string,
  ticketId: string,
  violation: TrafficViolation,
) {
  return withTx(ctx.db, async (tx) => {
    const balance = await tx.query<{ coin: number }>(
      'SELECT coin FROM balances WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    const key = `traffic:${userId}:${ticketId}`;
    const prior = await tx.query<{ amount: number; balance_after: number }>(
      'SELECT amount, balance_after FROM ledger_entries WHERE idempotency_key = $1',
      [key],
    );
    if (prior.rows[0]) return { charged: -prior.rows[0].amount, coin: prior.rows[0].balance_after };
    const charged = Math.min(balance.rows[0]!.coin, TRAFFIC_FINES[violation]);
    const entry = await postLedger(tx, {
      userId,
      currency: 'coin',
      amount: -charged,
      reason: 'traffic_fine',
      referenceId: ticketId,
      idempotencyKey: key,
      metadata: { violation, scheduledFine: TRAFFIC_FINES[violation] },
    });
    return { charged, coin: entry.balanceAfter };
  });
}
