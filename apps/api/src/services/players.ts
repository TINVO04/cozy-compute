import { fameTitle } from '@cozy/economy';
import { sanitizeAppearance, STARTER_ITEMS, type Appearance } from '@cozy/game-data';
import type { Queryable, Tx } from '../db.js';
import { postLedger } from '../ledger.js';

export const ONBOARDING_STEPS = [
  { id: 'avatar', label: 'Style your avatar' },
  { id: 'fishing', label: 'Catch something at the Wobbly Pier' },
  { id: 'delivery', label: 'Finish a Parcel Panic delivery' },
  { id: 'cafe', label: 'Serve a drink at Bean There Cafe' },
  { id: 'purchase', label: 'Buy something from a shop' },
  { id: 'apartment', label: 'Place furniture in your apartment' },
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]['id'];
export const ONBOARDING_REWARD = { coin: 250, fame: 10 };
export const STARTING_COIN = 300;

export async function createPlayerRecords(tx: Tx, userId: string, displayName: string): Promise<void> {
  await tx.query(`INSERT INTO profiles (user_id, display_name, appearance) VALUES ($1, $2, $3)`, [
    userId,
    displayName,
    JSON.stringify(sanitizeAppearance({})),
  ]);
  await tx.query(`INSERT INTO balances (user_id) VALUES ($1)`, [userId]);
  await postLedger(tx, {
    userId,
    currency: 'coin',
    amount: STARTING_COIN,
    reason: 'starter_grant',
    idempotencyKey: `starter:${userId}`,
  });
  for (const item of STARTER_ITEMS) {
    await tx.query(`INSERT INTO inventory_items (user_id, item_id, quantity) VALUES ($1, $2, $3)`, [
      userId,
      item.itemId,
      item.quantity,
    ]);
  }
  await tx.query(`INSERT INTO apartments (user_id, name) VALUES ($1, $2)`, [
    userId,
    `${displayName}'s Place`,
  ]);
}

/** Marks an onboarding step done and pays the completion bonus exactly once. */
export async function completeOnboardingStep(tx: Tx, userId: string, step: OnboardingStep): Promise<void> {
  const r = await tx.query<{ onboarding: Record<string, boolean>; onboarding_completed_at: Date | null }>(
    `UPDATE users SET onboarding = onboarding || jsonb_build_object($2::text, true) WHERE id = $1
     RETURNING onboarding, onboarding_completed_at`,
    [userId, step],
  );
  const row = r.rows[0];
  if (!row || row.onboarding_completed_at) return;
  if (ONBOARDING_STEPS.every((s) => row.onboarding[s.id])) {
    await tx.query(`UPDATE users SET onboarding_completed_at = now() WHERE id = $1`, [userId]);
    await postLedger(tx, {
      userId,
      currency: 'coin',
      amount: ONBOARDING_REWARD.coin,
      reason: 'onboarding_bonus',
      idempotencyKey: `onboarding:coin:${userId}`,
    });
    await postLedger(tx, {
      userId,
      currency: 'fame',
      amount: ONBOARDING_REWARD.fame,
      reason: 'onboarding_bonus',
      idempotencyKey: `onboarding:fame:${userId}`,
    });
  }
}

/** Appearance with equipped clothing resolved from inventory. Clients never supply equipped sprites. */
export async function resolvedAppearance(q: Queryable, userId: string): Promise<Appearance> {
  const r = await q.query<{ appearance: unknown; slot: string | null; sprite: string | null }>(
    `SELECT p.appearance, i.equipped_slot AS slot, d.sprite
       FROM profiles p
       LEFT JOIN inventory_items i ON i.user_id = p.user_id AND i.equipped_slot IS NOT NULL
       LEFT JOIN item_definitions d ON d.id = i.item_id
      WHERE p.user_id = $1`,
    [userId],
  );
  const base = sanitizeAppearance(r.rows[0]?.appearance);
  const out: Appearance = { ...base, hat: null, top: null, face: null };
  for (const row of r.rows) {
    if (row.slot === 'hat' || row.slot === 'top' || row.slot === 'face') out[row.slot] = row.sprite;
  }
  return out;
}

export async function playerSummary(q: Queryable, userId: string) {
  const r = await q.query<{
    id: string;
    email: string;
    role: string;
    display_name: string;
    status_text: string;
    fame: number;
    coin: number;
    ai_credit_cents: number;
    onboarding: Record<string, boolean>;
    onboarding_completed_at: Date | null;
    created_at: Date;
    trust_score: number;
  }>(
    `SELECT u.id, u.email, u.role, p.display_name, p.status_text, p.fame, b.coin, b.ai_credit_cents,
            u.onboarding, u.onboarding_completed_at, u.created_at, u.trust_score
       FROM users u JOIN profiles p ON p.user_id = u.id JOIN balances b ON b.user_id = u.id
      WHERE u.id = $1`,
    [userId],
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    statusText: row.status_text,
    title: fameTitle(row.fame),
    createdAt: row.created_at.toISOString(),
    balances: { coin: row.coin, fame: row.fame, aiCreditCents: row.ai_credit_cents },
    appearance: await resolvedAppearance(q, userId),
    onboarding: {
      completed: Boolean(row.onboarding_completed_at),
      reward: ONBOARDING_REWARD,
      steps: ONBOARDING_STEPS.map((s) => ({ ...s, done: Boolean(row.onboarding[s.id]) })),
    },
  };
}
