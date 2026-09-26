import { stddev } from '@cozy/economy';
import type { Queryable } from '../db.js';
import { metrics } from '../metrics.js';

export async function raiseFlag(
  q: Queryable,
  userId: string,
  type: string,
  severity: 'low' | 'medium' | 'high',
  score: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  // One open flag per user+type is enough; update its metadata instead of spamming the queue.
  const existing = await q.query<{ id: string }>(
    `SELECT id FROM abuse_flags WHERE user_id = $1 AND type = $2 AND status = 'open'`,
    [userId, type],
  );
  if (existing.rows[0]) {
    await q.query(
      `UPDATE abuse_flags SET metadata = $2, score = GREATEST(score, $3), severity = $4 WHERE id = $1`,
      [existing.rows[0].id, JSON.stringify(metadata), score, severity],
    );
    return;
  }
  await q.query(
    `INSERT INTO abuse_flags (user_id, type, severity, score, metadata) VALUES ($1,$2,$3,$4,$5)`,
    [userId, type, severity, score, JSON.stringify(metadata)],
  );
  metrics.inc('abuse_flags_total', { type });
  // Trust score is a soft signal. High severity flags lower it; admins restore it when dismissing.
  const penalty = severity === 'high' ? 30 : severity === 'medium' ? 10 : 0;
  if (penalty)
    await q.query(`UPDATE users SET trust_score = GREATEST(0, trust_score - $2) WHERE id = $1`, [
      userId,
      penalty,
    ]);
}

/**
 * Looks at the last completed runs of one activity. Bots show inhumanly regular gaps between
 * completions, or reaction times that are both very fast and very consistent.
 */
export async function checkTimingPatterns(q: Queryable, userId: string, activity: string): Promise<void> {
  const r = await q.query<{ completed_at: Date; result: { reactionMs?: number } | null }>(
    `SELECT completed_at, result FROM activity_runs
      WHERE user_id = $1 AND activity_slug = $2 AND status = 'completed'
      ORDER BY completed_at DESC LIMIT 12`,
    [userId, activity],
  );
  if (r.rows.length < 12) return;
  const times = r.rows.map((row) => row.completed_at.getTime());
  const gaps = times.slice(0, -1).map((t, i) => t - times[i + 1]!);
  const gapMean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const gapCv = gapMean > 0 ? stddev(gaps) / gapMean : 0;
  if (gapCv < 0.04) {
    await raiseFlag(q, userId, 'regular_timing', 'medium', Math.round((0.04 - gapCv) * 1000), {
      activity,
      gapMeanMs: Math.round(gapMean),
      gapCv,
    });
  }
  const reactions = r.rows
    .map((row) => row.result?.reactionMs)
    .filter((v): v is number => typeof v === 'number');
  if (reactions.length >= 10) {
    const mean = reactions.reduce((a, b) => a + b, 0) / reactions.length;
    if (mean < 160 && stddev(reactions) < 25) {
      await raiseFlag(q, userId, 'superhuman_reaction', 'medium', Math.round(200 - mean), {
        activity,
        meanMs: Math.round(mean),
      });
    }
  }
}
