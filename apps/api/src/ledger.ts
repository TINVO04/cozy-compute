import type { Tx } from './db.js';
import type { Pool } from 'pg';
import { AppError } from './errors.js';
import { metrics } from './metrics.js';

export type Currency = 'coin' | 'fame' | 'ai_credit';

export interface LedgerInput {
  userId: string;
  currency: Currency;
  amount: number;
  reason: string;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
}

export interface LedgerResult {
  id: number;
  balanceAfter: number;
}

const COLUMN: Record<Currency, { table: string; column: string }> = {
  coin: { table: 'balances', column: 'coin' },
  ai_credit: { table: 'balances', column: 'ai_credit_cents' },
  fame: { table: 'profiles', column: 'fame' },
};

/**
 * The only way balances change. Locks the balance row, applies the delta,
 * and writes a ledger entry in the same transaction.
 */
export async function postLedger(tx: Tx, input: LedgerInput): Promise<LedgerResult> {
  if (!Number.isInteger(input.amount)) throw new Error('ledger amount must be an integer');
  const { table, column } = COLUMN[input.currency];
  const locked = await tx.query<{ value: number }>(
    `SELECT ${column} AS value FROM ${table} WHERE user_id = $1 FOR UPDATE`,
    [input.userId],
  );
  const current = locked.rows[0];
  if (!current) throw new Error(`no ${table} row for user`);
  const next = current.value + input.amount;
  if (next < 0) {
    const label = input.currency === 'coin' ? 'Coin' : input.currency === 'ai_credit' ? 'AI Credit' : 'Fame';
    throw new AppError(409, 'insufficient_balance', `Not enough ${label}.`, {
      currency: input.currency,
      balance: current.value,
      required: -input.amount,
    });
  }
  await tx.query(`UPDATE ${table} SET ${column} = $2, updated_at = now() WHERE user_id = $1`, [
    input.userId,
    next,
  ]);
  const entry = await tx.query<{ id: number }>(
    `INSERT INTO ledger_entries (user_id, currency, amount, balance_after, reason_type, reference_id, metadata, idempotency_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      input.userId,
      input.currency,
      input.amount,
      next,
      input.reason,
      input.referenceId ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.idempotencyKey ?? null,
    ],
  );
  if (input.amount > 0 && input.currency !== 'ai_credit')
    metrics.inc('reward_issued_total', { currency: input.currency, reason: input.reason }, input.amount);
  return { id: entry.rows[0]!.id, balanceAfter: next };
}

export async function getBalances(
  tx: Tx | Pool,
  userId: string,
): Promise<{ coin: number; fame: number; aiCreditCents: number }> {
  const r = await tx.query<{ coin: number; fame: number; ai_credit_cents: number }>(
    'SELECT b.coin, p.fame, b.ai_credit_cents FROM balances b JOIN profiles p ON p.user_id = b.user_id WHERE b.user_id = $1',
    [userId],
  );
  const row = r.rows[0];
  if (!row) throw new AppError(404, 'not_found', 'Player not found.');
  return { coin: row.coin, fame: row.fame, aiCreditCents: row.ai_credit_cents };
}
