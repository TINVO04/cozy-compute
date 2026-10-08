import { rankEvent } from '@cozy/economy';
import { DUCK_SPOTS, type ActivityConfigMap } from '@cozy/game-data';
import type { AppContext } from '../context.js';
import { withTx } from '../db.js';
import { AppError, conflict, notFound } from '../errors.js';
import { postLedger } from '../ledger.js';
import { metrics } from '../metrics.js';
import { getSetting } from '../settings.js';

export const EVENT_CHANNEL = 'events';
const scoreKey = (eventId: string) => `event:${eventId}:scores`;

interface EventRow {
  id: string;
  slug: string;
  title: string;
  config: { ducks?: { id: string; x: number; y: number }[]; maxPlayers?: number; durationSeconds?: number };
  starts_at: Date;
  ends_at: Date;
  status: 'scheduled' | 'running' | 'finished' | 'cancelled';
  participant_count: number;
}

export const DUCK_EVENT = {
  slug: 'find_the_duck',
  title: 'Truy tìm Vịt vàng',
  rules: [
    'Vịt cao su xuất hiện rải rác khắp thị trấn khi sự kiện bắt đầu.',
    'Chạy lại gần chạm vào vịt để nhặt. Mỗi con vịt sẽ cộng điểm thưởng.',
    'Người nhặt được nhiều vịt nhất khi hết giờ sẽ chiến thắng. Tất cả người tham gia đều nhận phần thưởng.',
  ],
};

export async function scheduleNext(ctx: AppContext, startInMs?: number): Promise<EventRow | null> {
  const sched = await getSetting(ctx.db, 'event_schedule');
  const now = ctx.now();
  const open = await ctx.db.query<EventRow>(
    `SELECT * FROM events WHERE status IN ('scheduled', 'running') LIMIT 1`,
  );
  if (open.rows[0]) return null;
  if (startInMs === undefined) {
    if (!sched.autoSchedule) return null;
    const last = await ctx.db.query<{ ends_at: Date }>(
      `SELECT ends_at FROM events ORDER BY ends_at DESC LIMIT 1`,
    );
    const nextSlot = last.rows[0]
      ? last.rows[0].ends_at.getTime() + sched.intervalMinutes * 60_000 - sched.lobbyMinutes * 60_000
      : 0;
    if (nextSlot > now.getTime()) return null;
    startInMs = sched.lobbyMinutes * 60_000;
  }
  const startsAt = new Date(now.getTime() + startInMs);
  const endsAt = new Date(startsAt.getTime() + sched.durationSeconds * 1000);
  const r = await ctx.db.query<EventRow>(
    `INSERT INTO events (slug, title, config, starts_at, ends_at) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      DUCK_EVENT.slug,
      DUCK_EVENT.title,
      JSON.stringify({
        maxPlayers: sched.maxPlayers,
        duckCount: sched.duckCount,
        minPlayers: sched.minPlayers,
      }),
      startsAt,
      endsAt,
    ],
  );
  return r.rows[0]!;
}

function pickDucks(rng: () => number, count: number) {
  const spots = [...DUCK_SPOTS];
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [spots[i], spots[j]] = [spots[j]!, spots[i]!];
  }
  return spots.slice(0, count).map((s, i) => ({ id: `d${i}`, x: s.x, y: s.y }));
}

export async function tickEvents(ctx: AppContext): Promise<void> {
  const now = ctx.now();
  const due = await ctx.db.query<EventRow & { min_players: number }>(
    `SELECT *, coalesce((config->>'minPlayers')::int, 1) AS min_players FROM events
      WHERE (status = 'scheduled' AND starts_at <= $1) OR (status = 'running' AND ends_at <= $1)`,
    [now],
  );
  for (const ev of due.rows) {
    if (ev.status === 'scheduled') await startEvent(ctx, ev, ev.min_players);
    else await finishEvent(ctx, ev.id);
  }
  await scheduleNext(ctx);
}

async function startEvent(ctx: AppContext, ev: EventRow, minPlayers: number) {
  if (ev.participant_count < minPlayers) {
    await ctx.db.query(`UPDATE events SET status = 'cancelled' WHERE id = $1 AND status = 'scheduled'`, [
      ev.id,
    ]);
    await ctx.redis.publish(EVENT_CHANNEL, JSON.stringify({ type: 'cancelled', eventId: ev.id }));
    return;
  }
  const duckCount = Number((ev.config as { duckCount?: number }).duckCount ?? 8);
  const ducks = pickDucks(ctx.rng, duckCount);
  const updated = await ctx.db.query(
    `UPDATE events SET status = 'running', config = config || $2 WHERE id = $1 AND status = 'scheduled'`,
    [ev.id, JSON.stringify({ ducks })],
  );
  if (!updated.rowCount) return;
  const participants = await ctx.db.query<{ user_id: string }>(
    'SELECT user_id FROM event_entries WHERE event_id = $1',
    [ev.id],
  );
  await ctx.redis.set(
    'event:active',
    JSON.stringify({
      eventId: ev.id,
      title: ev.title,
      ducks,
      endsAt: ev.ends_at.toISOString(),
      participants: participants.rows.map((p) => p.user_id),
    }),
    'PX',
    Math.max(1000, ev.ends_at.getTime() - now(ctx) + 60_000),
  );
  await ctx.redis.publish(EVENT_CHANNEL, JSON.stringify({ type: 'start', eventId: ev.id }));
  metrics.inc('event_started_total');
}

const now = (ctx: AppContext) => ctx.now().getTime();

export async function finishEvent(ctx: AppContext, eventId: string) {
  const cfgRow = await ctx.db.query<{ config: ActivityConfigMap['event_duck'] }>(
    `SELECT config FROM activities WHERE slug = 'event_duck'`,
  );
  const cfg = cfgRow.rows[0]!.config;
  const scores = await ctx.redis.hgetall(scoreKey(eventId));
  const results = await withTx(ctx.db, async (tx) => {
    const lock = await tx.query<EventRow>(`SELECT * FROM events WHERE id = $1 FOR UPDATE`, [eventId]);
    const ev = lock.rows[0];
    if (!ev || ev.status !== 'running') return null;
    const entries = await tx.query<{ user_id: string }>(
      'SELECT user_id FROM event_entries WHERE event_id = $1',
      [eventId],
    );
    const ranked = rankEvent(
      entries.rows.map((e) => ({ userId: e.user_id, score: Number(scores[e.user_id] ?? 0) })),
      cfg,
    );
    for (const r of ranked) {
      const ledger = await postLedger(tx, {
        userId: r.userId,
        currency: 'coin',
        amount: r.coin,
        reason: 'event_reward',
        referenceId: eventId,
        idempotencyKey: `event:${eventId}:${r.userId}:coin`,
        metadata: { placement: r.placement, score: r.score },
      });
      await postLedger(tx, {
        userId: r.userId,
        currency: 'fame',
        amount: r.fame,
        reason: 'event_reward',
        referenceId: eventId,
        idempotencyKey: `event:${eventId}:${r.userId}:fame`,
      });
      await tx.query(
        'UPDATE event_entries SET score = $3, placement = $4, reward_reference = $5 WHERE event_id = $1 AND user_id = $2',
        [eventId, r.userId, r.score, r.placement, String(ledger.id)],
      );
    }
    await tx.query(`UPDATE events SET status = 'finished' WHERE id = $1`, [eventId]);
    return ranked;
  });
  if (!results) return;
  await ctx.redis.del('event:active');
  await ctx.redis.expire(scoreKey(eventId), 3600);
  await ctx.redis.publish(EVENT_CHANNEL, JSON.stringify({ type: 'finished', eventId }));
  metrics.inc('event_finished_total');
}

export async function joinEvent(ctx: AppContext, userId: string, eventId: string) {
  return withTx(ctx.db, async (tx) => {
    const r = await tx.query<EventRow>('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    const ev = r.rows[0];
    if (!ev) throw notFound('Event not found.');
    if (ev.status !== 'scheduled') throw conflict('event_closed', 'The lobby for this event is closed.');
    const max = ev.config.maxPlayers ?? 20;
    const ins = await tx.query(
      'INSERT INTO event_entries (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [eventId, userId],
    );
    if (ins.rowCount) {
      if (ev.participant_count >= max)
        throw new AppError(409, 'event_full', 'This event is full. Catch the next one!');
      await tx.query('UPDATE events SET participant_count = participant_count + 1 WHERE id = $1', [eventId]);
    }
    return { joined: true };
  });
}

export async function leaveEvent(ctx: AppContext, userId: string, eventId: string) {
  await withTx(ctx.db, async (tx) => {
    const r = await tx.query<EventRow>('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    if (r.rows[0]?.status !== 'scheduled')
      throw conflict('event_closed', 'You can only leave before the event starts.');
    const del = await tx.query('DELETE FROM event_entries WHERE event_id = $1 AND user_id = $2', [
      eventId,
      userId,
    ]);
    if (del.rowCount)
      await tx.query('UPDATE events SET participant_count = participant_count - 1 WHERE id = $1', [eventId]);
  });
}

export async function eventHub(ctx: AppContext, userId: string) {
  const current = await ctx.db.query<EventRow & { joined: boolean }>(
    `SELECT e.*, EXISTS (SELECT 1 FROM event_entries x WHERE x.event_id = e.id AND x.user_id = $1) AS joined
       FROM events e WHERE e.status IN ('scheduled', 'running') ORDER BY e.starts_at LIMIT 1`,
    [userId],
  );
  const history = await ctx.db.query<EventRow & { my_score: number | null; my_placement: number | null }>(
    `SELECT e.*, x.score AS my_score, x.placement AS my_placement
       FROM events e LEFT JOIN event_entries x ON x.event_id = e.id AND x.user_id = $1
      WHERE e.status = 'finished' ORDER BY e.ends_at DESC LIMIT 10`,
    [userId],
  );
  const winners = await ctx.db.query<{
    event_id: string;
    display_name: string;
    score: number;
    placement: number;
  }>(
    `SELECT x.event_id, p.display_name, x.score, x.placement FROM event_entries x JOIN profiles p ON p.user_id = x.user_id
      WHERE x.event_id = ANY($1::uuid[]) AND x.placement <= 3 AND x.score > 0 ORDER BY x.placement`,
    [history.rows.map((h) => h.id)],
  );
  const cfg = await ctx.db.query<{ config: ActivityConfigMap['event_duck'] }>(
    `SELECT config FROM activities WHERE slug = 'event_duck'`,
  );
  const c = current.rows[0];
  let live: Record<string, number> = {};
  if (c?.status === 'running')
    live = Object.fromEntries(
      Object.entries(await ctx.redis.hgetall(scoreKey(c.id))).map(([k, v]) => [k, Number(v)]),
    );
  return {
    rules: DUCK_EVENT.rules,
    rewards: cfg.rows[0]?.config,
    serverTime: ctx.now().toISOString(),
    current: c
      ? {
          id: c.id,
          title: c.title,
          status: c.status,
          startsAt: c.starts_at.toISOString(),
          endsAt: c.ends_at.toISOString(),
          participants: c.participant_count,
          maxPlayers: c.config.maxPlayers ?? 20,
          joined: c.joined,
          myScore: live[userId] ?? 0,
        }
      : null,
    history: history.rows.map((h) => ({
      id: h.id,
      title: h.title,
      endedAt: h.ends_at.toISOString(),
      participants: h.participant_count,
      myScore: h.my_score,
      myPlacement: h.my_placement,
      winners: winners.rows
        .filter((w) => w.event_id === h.id)
        .map((w) => ({ name: w.display_name, score: w.score, placement: w.placement })),
    })),
  };
}
