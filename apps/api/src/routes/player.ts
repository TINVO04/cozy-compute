import { fameTitle } from '@cozy/economy';
import { sanitizeAppearance } from '@cozy/game-data';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createSession, hashPassword, requireUser, verifyPassword } from '../auth.js';
import type { AppContext } from '../context.js';
import { withTx } from '../db.js';
import { AppError, badRequest, conflict, notFound } from '../errors.js';
import { getPresence } from '../redis.js';
import * as activities from '../services/activities.js';
import * as ai from '../services/ai.js';
import * as events from '../services/events.js';
import { completeOnboardingStep, createPlayerRecords, playerSummary } from '../services/players.js';
import * as shop from '../services/shop.js';

const idem = (headers: Record<string, unknown>) => {
  const v = headers['idempotency-key'];
  if (typeof v !== 'string' || v.length < 8 || v.length > 100)
    throw badRequest('idempotency_key_required', 'Missing Idempotency-Key header.');
  return v;
};

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
});
const registration = credentials.extend({
  displayName: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[A-Za-z0-9_ .-]+$/, 'Use letters, numbers, spaces, dots, dashes or underscores.'),
});
const run = z.object({ runId: z.string().uuid(), nonce: z.string().min(10).max(64) });

export function playerRoutes(app: FastifyInstance, ctx: AppContext) {
  const authLimit = {
    config: { rateLimit: { max: ctx.config.AUTH_RATE_LIMIT_PER_MIN, timeWindow: '1 minute' } },
  };

  app.post('/auth/register', authLimit, async (req) => {
    const body = registration.parse(req.body);
    const passwordHash = await hashPassword(body.password);
    const role = ctx.config.adminEmails.has(body.email) ? 'admin' : 'player';
    const userId = await withTx(ctx.db, async (tx) => {
      const taken = await tx.query<{ email_taken: boolean; name_taken: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM users WHERE lower(email) = $1) AS email_taken,
                EXISTS (SELECT 1 FROM profiles WHERE lower(display_name) = lower($2)) AS name_taken`,
        [body.email, body.displayName],
      );
      if (taken.rows[0]?.email_taken)
        throw conflict('email_taken', 'An account with this email already exists. Try signing in.');
      if (taken.rows[0]?.name_taken) throw conflict('name_taken', 'That name is taken. Try adding a twist.');
      const u = await tx.query<{ id: string }>(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
        [body.email, passwordHash, role],
      );
      const id = u.rows[0]!.id;
      await createPlayerRecords(tx, id, body.displayName);
      return id;
    });
    const token = await createSession(ctx.db, userId, ctx.config.SESSION_TTL_DAYS, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { token, user: await playerSummary(ctx.db, userId) };
  });

  app.post('/auth/login', authLimit, async (req) => {
    const body = credentials.parse(req.body);
    const r = await ctx.db.query<{ id: string; password_hash: string; status: string }>(
      'SELECT id, password_hash, status FROM users WHERE lower(email) = $1',
      [body.email],
    );
    const u = r.rows[0];
    // Always verify to keep timing similar for unknown emails.
    const ok = await verifyPassword(
      u?.password_hash ?? '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$ZmFrZWhhc2hmYWtlaGFzaA',
      body.password,
    );
    if (!u || !ok) throw new AppError(401, 'invalid_credentials', 'Email or password is incorrect.');
    if (u.status === 'suspended') throw new AppError(403, 'suspended', 'This account is suspended.');
    await ctx.db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [u.id]);
    const token = await createSession(ctx.db, u.id, ctx.config.SESSION_TTL_DAYS, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { token, user: await playerSummary(ctx.db, u.id) };
  });

  app.post('/auth/logout', async (req) => {
    if (req.user) await ctx.db.query('DELETE FROM sessions WHERE id = $1', [req.user.sessionId]);
    return { ok: true };
  });

  app.get('/me', async (req) => {
    const user = requireUser(req);
    return playerSummary(ctx.db, user.id);
  });

  app.get('/me/ledger', async (req) => {
    const user = requireUser(req);
    const q = z
      .object({
        currency: z.enum(['coin', 'fame', 'ai_credit']).optional(),
        before: z.coerce.number().int().optional(),
      })
      .parse(req.query);
    const r = await ctx.db.query<{
      id: number;
      currency: string;
      amount: number;
      balance_after: number;
      reason_type: string;
      created_at: Date;
      metadata: unknown;
    }>(
      `SELECT id, currency, amount, balance_after, reason_type, created_at, metadata FROM ledger_entries
        WHERE user_id = $1 AND ($2::text IS NULL OR currency = $2) AND ($3::bigint IS NULL OR id < $3)
        ORDER BY id DESC LIMIT 50`,
      [user.id, q.currency ?? null, q.before ?? null],
    );
    return r.rows.map((e) => ({ ...e, created_at: e.created_at.toISOString() }));
  });

  app.put('/me/profile', async (req) => {
    const user = requireUser(req);
    const body = z
      .object({ appearance: z.unknown(), statusText: z.string().trim().max(60).default('') })
      .parse(req.body);
    const appearance = sanitizeAppearance(body.appearance);
    await withTx(ctx.db, async (tx) => {
      await tx.query(
        'UPDATE profiles SET appearance = $2, status_text = $3, updated_at = now() WHERE user_id = $1',
        [user.id, JSON.stringify(appearance), body.statusText],
      );
      await completeOnboardingStep(tx, user.id, 'avatar');
    });
    const summary = await playerSummary(ctx.db, user.id);
    await ctx.redis.publish(
      'player:appearance',
      JSON.stringify({ userId: user.id, appearance: summary!.appearance, statusText: body.statusText }),
    );
    return summary;
  });

  // ---------------------------------------------------------------- activities
  app.get('/activities', async (req) => activities.activitySummary(ctx, requireUser(req).id));
  app.post('/activities/fishing/start', async (req) => activities.startFishing(ctx, requireUser(req).id));
  app.post('/activities/fishing/complete', async (req) => {
    const b = run.parse(req.body);
    return activities.completeFishing(ctx, requireUser(req).id, b.runId, b.nonce);
  });
  app.post('/activities/delivery/start', async (req) => activities.startDelivery(ctx, requireUser(req).id));
  app.post('/activities/delivery/complete', async (req) => {
    const b = run.parse(req.body);
    return activities.completeDelivery(ctx, requireUser(req).id, b.runId, b.nonce);
  });
  app.post('/activities/cafe/start', async (req) => activities.startCafe(ctx, requireUser(req).id));
  app.post('/activities/cafe/complete', async (req) => {
    const b = run.extend({ sequence: z.array(z.string().max(20)).max(10) }).parse(req.body);
    return activities.completeCafe(ctx, requireUser(req).id, b.runId, b.nonce, b.sequence);
  });
  app.post('/activities/cancel', async (req) => {
    const b = z.object({ runId: z.string().uuid() }).parse(req.body);
    await activities.cancelRun(ctx, requireUser(req).id, b.runId);
    return { ok: true };
  });

  // ---------------------------------------------------------------- events
  app.get('/events', async (req) => events.eventHub(ctx, requireUser(req).id));
  app.post('/events/:id/join', async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return events.joinEvent(ctx, requireUser(req).id, id);
  });
  app.post('/events/:id/leave', async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await events.leaveEvent(ctx, requireUser(req).id, id);
    return { ok: true };
  });

  // ---------------------------------------------------------------- shop + inventory
  app.get('/shop', async (req) => shop.catalog(ctx.db, requireUser(req).id));
  app.post('/shop/buy', async (req) => {
    const user = requireUser(req);
    const b = z.object({ itemId: z.string().max(60), quantity: z.number().int().default(1) }).parse(req.body);
    return shop.buyItem(ctx, user.id, b.itemId, b.quantity, idem(req.headers));
  });
  app.post('/shop/wishlist', async (req) => {
    const user = requireUser(req);
    const b = z.object({ itemId: z.string().max(60), wished: z.boolean() }).parse(req.body);
    await shop.toggleWishlist(ctx.db, user.id, b.itemId, b.wished);
    return { ok: true };
  });
  app.post('/inventory/equip', async (req) => {
    const user = requireUser(req);
    const b = z
      .object({ itemId: z.string().max(60).nullable(), slot: z.enum(['hat', 'top', 'face']) })
      .parse(req.body);
    return { appearance: await shop.equip(ctx, user.id, b.itemId, b.slot) };
  });

  // ---------------------------------------------------------------- apartments
  app.get('/apartments', async (req) => {
    requireUser(req);
    const q = z.object({ sort: z.enum(['score', 'recent', 'visits']).default('score') }).parse(req.query);
    return shop.publishedApartments(ctx.db, q.sort);
  });
  app.get('/apartments/:ownerId', async (req) => {
    const user = requireUser(req);
    const { ownerId } = z.object({ ownerId: z.string().uuid() }).parse(req.params);
    return shop.apartmentFor(ctx.db, ownerId, user.id);
  });
  app.post('/apartments/:ownerId/visit', async (req) => {
    const user = requireUser(req);
    const { ownerId } = z.object({ ownerId: z.string().uuid() }).parse(req.params);
    if (ownerId !== user.id) {
      // Count at most one visit per visitor per apartment per day.
      const first = await ctx.redis.set(`visit:${ownerId}:${user.id}`, '1', 'EX', 86400, 'NX');
      if (first)
        await ctx.db.query('UPDATE apartments SET visits = visits + 1 WHERE user_id = $1 AND published', [
          ownerId,
        ]);
    }
    return { ok: true };
  });
  app.put('/apartments/me', async (req) => {
    const user = requireUser(req);
    const b = z
      .object({
        name: z.string().trim().min(1).max(40),
        themeId: z.string().max(20),
        published: z.boolean(),
        objects: z.array(
          z.object({
            itemId: z.string().max(60),
            x: z.number().int(),
            y: z.number().int(),
            rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
          }),
        ),
      })
      .parse(req.body);
    return shop.saveApartment(ctx, user.id, b);
  });
  app.get('/apartments/:ownerId/guestbook', async (req) => {
    const user = requireUser(req);
    const { ownerId } = z.object({ ownerId: z.string().uuid() }).parse(req.params);
    await shop.apartmentFor(ctx.db, ownerId, user.id);
    const r = await ctx.db.query<{
      id: string;
      message: string;
      created_at: Date;
      author_id: string;
      display_name: string;
    }>(
      `SELECT g.id, g.message, g.created_at, g.author_id, p.display_name FROM guestbook_entries g
         JOIN apartments a ON a.id = g.apartment_id JOIN profiles p ON p.user_id = g.author_id
        WHERE a.user_id = $1 ORDER BY g.created_at DESC LIMIT 50`,
      [ownerId],
    );
    return r.rows.map((g) => ({
      id: g.id,
      message: g.message,
      createdAt: g.created_at.toISOString(),
      authorId: g.author_id,
      authorName: g.display_name,
    }));
  });
  app.post(
    '/apartments/:ownerId/guestbook',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req) => {
      const user = requireUser(req);
      const { ownerId } = z.object({ ownerId: z.string().uuid() }).parse(req.params);
      const b = z.object({ message: z.string().trim().min(1).max(200) }).parse(req.body);
      const apt = await shop.apartmentFor(ctx.db, ownerId, user.id);
      await ctx.db.query(
        'INSERT INTO guestbook_entries (apartment_id, author_id, message) VALUES ($1, $2, $3)',
        [apt.id, user.id, b.message],
      );
      return { ok: true };
    },
  );
  app.delete('/apartments/me/guestbook/:entryId', async (req) => {
    const user = requireUser(req);
    const { entryId } = z.object({ entryId: z.string().uuid() }).parse(req.params);
    await ctx.db.query(
      'DELETE FROM guestbook_entries g USING apartments a WHERE g.id = $1 AND a.id = g.apartment_id AND a.user_id = $2',
      [entryId, user.id],
    );
    return { ok: true };
  });

  // ---------------------------------------------------------------- social
  app.get('/players/:id', async (req) => {
    const user = requireUser(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const r = await ctx.db.query<{
      display_name: string;
      status_text: string;
      fame: number;
      created_at: Date;
      score: number | null;
      published: boolean | null;
    }>(
      `SELECT p.display_name, p.status_text, p.fame, u.created_at, a.score, a.published
         FROM profiles p JOIN users u ON u.id = p.user_id LEFT JOIN apartments a ON a.user_id = p.user_id WHERE p.user_id = $1`,
      [id],
    );
    const p = r.rows[0];
    if (!p) throw notFound('Player not found.');
    const rel = await ctx.db.query<{ friend: boolean; muted: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2) AS friend,
              EXISTS (SELECT 1 FROM mutes WHERE user_id = $1 AND muted_id = $2) AS muted`,
      [user.id, id],
    );
    const badges = await ctx.db.query<{ placement: number; n: number }>(
      `SELECT placement, count(*)::int AS n FROM event_entries WHERE user_id = $1 AND placement <= 3 AND score > 0 GROUP BY placement`,
      [id],
    );
    return {
      id,
      displayName: p.display_name,
      statusText: p.status_text,
      fame: p.fame,
      title: fameTitle(p.fame),
      memberSince: p.created_at.toISOString(),
      apartment: p.published ? { score: p.score } : null,
      eventPodiums: badges.rows.map((b) => ({ placement: b.placement, count: b.n })),
      isFriend: rel.rows[0]!.friend,
      isMuted: rel.rows[0]!.muted,
      isSelf: id === user.id,
    };
  });
  app.get('/friends', async (req) => {
    const user = requireUser(req);
    const r = await ctx.db.query<{ friend_id: string; display_name: string; fame: number; mutual: boolean }>(
      `SELECT f.friend_id, p.display_name, p.fame,
              EXISTS (SELECT 1 FROM friends b WHERE b.user_id = f.friend_id AND b.friend_id = f.user_id) AS mutual
         FROM friends f JOIN profiles p ON p.user_id = f.friend_id WHERE f.user_id = $1 ORDER BY p.display_name`,
      [user.id],
    );
    const presence = await getPresence(
      ctx.redis,
      r.rows.map((f) => f.friend_id),
    );
    return r.rows.map((f) => ({
      id: f.friend_id,
      displayName: f.display_name,
      fame: f.fame,
      mutual: f.mutual,
      online: presence.has(f.friend_id),
      location: presence.get(f.friend_id)?.roomLabel ?? null,
    }));
  });
  app.post('/friends/:id', async (req) => {
    const user = requireUser(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (id === user.id) throw badRequest('self', 'You are already your own best friend.');
    await ctx.db.query(
      'INSERT INTO friends (user_id, friend_id) SELECT $1, user_id FROM profiles WHERE user_id = $2 ON CONFLICT DO NOTHING',
      [user.id, id],
    );
    return { ok: true };
  });
  app.delete('/friends/:id', async (req) => {
    const user = requireUser(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await ctx.db.query('DELETE FROM friends WHERE user_id = $1 AND friend_id = $2', [user.id, id]);
    return { ok: true };
  });
  app.get('/mutes', async (req) => {
    const user = requireUser(req);
    const r = await ctx.db.query<{ muted_id: string; display_name: string }>(
      'SELECT m.muted_id, p.display_name FROM mutes m JOIN profiles p ON p.user_id = m.muted_id WHERE m.user_id = $1',
      [user.id],
    );
    return r.rows.map((m) => ({ id: m.muted_id, displayName: m.display_name }));
  });
  app.post('/mutes/:id', async (req) => {
    const user = requireUser(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    if (id === user.id) throw badRequest('self', 'You cannot mute yourself.');
    await ctx.db.query(
      'INSERT INTO mutes (user_id, muted_id) SELECT $1, user_id FROM profiles WHERE user_id = $2 ON CONFLICT DO NOTHING',
      [user.id, id],
    );
    return { ok: true };
  });
  app.delete('/mutes/:id', async (req) => {
    const user = requireUser(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await ctx.db.query('DELETE FROM mutes WHERE user_id = $1 AND muted_id = $2', [user.id, id]);
    return { ok: true };
  });
  app.post('/reports', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (req) => {
    const user = requireUser(req);
    const b = z
      .object({
        targetId: z.string().uuid(),
        reason: z.enum(['harassment', 'spam', 'cheating', 'inappropriate_name', 'other']),
        details: z.string().trim().max(500).default(''),
        context: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(req.body);
    if (b.targetId === user.id) throw badRequest('self', 'You cannot report yourself.');
    await ctx.db.query(
      'INSERT INTO reports (reporter_id, target_id, reason, details, context) VALUES ($1,$2,$3,$4,$5)',
      [user.id, b.targetId, b.reason, b.details, JSON.stringify(b.context)],
    );
    return { ok: true };
  });

  // ---------------------------------------------------------------- AI rewards
  app.get('/ai', async (req) => ai.aiOverview(ctx, requireUser(req).id));
  app.post('/ai/mint', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req) => {
    const user = requireUser(req);
    const b = z.object({ cents: z.number().int() }).parse(req.body);
    return ai.mintCredit(ctx, user.id, b.cents, idem(req.headers));
  });
  app.post('/ai/keys', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req) => {
    const user = requireUser(req);
    const b = z
      .object({
        modelIds: z.array(z.string().uuid()).min(1).max(10),
        budgetCents: z.number().int(),
        label: z.string().trim().min(1).max(40).default('My key'),
      })
      .parse(req.body);
    return ai.createKey(ctx, user.id, b, idem(req.headers));
  });
  app.post(
    '/ai/keys/:id/rotate',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (req) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
      return ai.rotateKey(ctx, requireUser(req).id, id);
    },
  );
  app.post('/ai/keys/:id/revoke', async (req) => {
    const user = requireUser(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const key = await ai.revokeKey(ctx, user.id, id);
    return ai.publicKey(key, await ai.modelMap(ctx.db));
  });
  app.get('/ai/keys/:id/usage', async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    return ai.keyUsage(ctx, requireUser(req).id, id);
  });
}
