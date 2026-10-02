import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { resolveSession } from '../auth.js';
import type { AppContext } from '../context.js';
import { forbidden, unauthorized } from '../errors.js';
import { resolvedAppearance } from '../services/players.js';

function requireInternal(req: FastifyRequest, secret: string) {
  const given = Buffer.from(String(req.headers['x-internal-secret'] ?? ''));
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw forbidden();
}

/** Endpoints used only by the realtime server. Protected by a shared secret and never routed publicly. */
export function internalRoutes(app: FastifyInstance, ctx: AppContext) {
  app.post('/internal/session', async (req) => {
    requireInternal(req, ctx.config.INTERNAL_SECRET);
    const { token } = z.object({ token: z.string().max(200) }).parse(req.body);
    const user = await resolveSession(ctx.db, token);
    if (!user || user.status !== 'active') throw unauthorized('Session expired. Please sign in again.');
    const p = await ctx.db.query<{ display_name: string; status_text: string; fame: number }>(
      'SELECT display_name, status_text, fame FROM profiles WHERE user_id = $1',
      [user.id],
    );
    const muted = await ctx.db.query<{ muted_id: string }>('SELECT muted_id FROM mutes WHERE user_id = $1', [
      user.id,
    ]);
    return {
      userId: user.id,
      role: user.role,
      displayName: p.rows[0]!.display_name,
      statusText: p.rows[0]!.status_text,
      fame: p.rows[0]!.fame,
      appearance: await resolvedAppearance(ctx.db, user.id),
      muted: muted.rows.map((m) => m.muted_id),
    };
  });

  app.post('/internal/apartment', async (req) => {
    requireInternal(req, ctx.config.INTERNAL_SECRET);
    const b = z
      .object({ ownerId: z.string().uuid(), viewerId: z.string().uuid().nullable() })
      .parse(req.body);
    const r = await ctx.db.query<{ id: string; published: boolean; display_name: string }>(
      'SELECT a.id, a.published, p.display_name FROM apartments a JOIN profiles p ON p.user_id = a.user_id WHERE a.user_id = $1',
      [b.ownerId],
    );
    const apt = r.rows[0];
    if (!apt) return { allowed: false, ownerName: '', objects: [] };
    const objects = await ctx.db.query<{
      item_id: string;
      x: number;
      y: number;
      rotation: number;
      size_w: number;
      size_h: number;
    }>(
      'SELECT o.item_id, o.x, o.y, o.rotation, d.size_w, d.size_h FROM apartment_objects o JOIN item_definitions d ON d.id = o.item_id WHERE o.apartment_id = $1',
      [apt.id],
    );
    return {
      allowed: b.viewerId === null || apt.published || b.ownerId === b.viewerId,
      ownerName: apt.display_name,
      objects: objects.rows.map((o) => ({
        itemId: o.item_id,
        x: o.x,
        y: o.y,
        rotation: o.rotation,
        size: { w: o.size_w, h: o.size_h },
      })),
    };
  });

  app.post('/internal/farm-access', async (req) => {
    requireInternal(req, ctx.config.INTERNAL_SECRET);
    const b = z
      .object({
        ownerId: z.string().uuid(),
        visitorId: z.string().uuid(),
        farmToken: z.string().optional(),
      })
      .parse(req.body);

    if (b.ownerId === b.visitorId) {
      return { allowed: true, isOwner: true };
    }

    const farmRes = await ctx.db.query<{ is_public: boolean; password_hash: string | null }>(
      'SELECT is_public, password_hash FROM farms WHERE user_id = $1',
      [b.ownerId],
    );
    const farm = farmRes.rows[0];
    if (!farm) return { allowed: false, isOwner: false };

    if (farm.is_public) {
      return { allowed: true, isOwner: false };
    }

    if (b.farmToken) {
      const stored = await ctx.redis.get(`fauth:${b.farmToken}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { ownerId: string; visitorId: string };
          if (parsed.ownerId === b.ownerId && parsed.visitorId === b.visitorId) {
            return { allowed: true, isOwner: false };
          }
        } catch {
          // ignore
        }
      }
    }

    return { allowed: false, isOwner: false };
  });
}
