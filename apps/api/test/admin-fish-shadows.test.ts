import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import type { AppContext } from '../src/context.js';
import { adminRoutes } from '../src/routes/admin.js';
import { playerRoutes } from '../src/routes/player.js';

describe('Admin Fish Shadow Tiers Management (/admin/fish/shadow-tiers)', () => {
  function createTestApp() {
    const settingsStore: Record<string, string> = {};
    const auditCalls: unknown[] = [];

    const query = vi.fn(async (sql: string, args: unknown[] = []) => {
      if (sql.includes(`FROM settings WHERE key = 'fish_shadow_tiers'`)) {
        const val = settingsStore['fish_shadow_tiers'];
        return { rows: val ? [{ value: val }] : [] };
      }
      if (sql.includes(`INSERT INTO settings (key, value, updated_at)`)) {
        settingsStore['fish_shadow_tiers'] = String(args[0]);
        return { rows: [] };
      }
      if (sql.includes(`DELETE FROM settings WHERE key = 'fish_shadow_tiers'`)) {
        delete settingsStore['fish_shadow_tiers'];
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO admin_audit_log')) {
        auditCalls.push({ sql, args });
        return { rows: [{ id: 1 }] };
      }
      return { rows: [] };
    });

    const ctx = {
      config: { NODE_ENV: 'test' },
      now: () => new Date(),
      db: {
        query,
        connect: async () => ({ query, release: vi.fn() }),
      },
      redis: {
        mget: vi.fn(async () => []),
      },
    } as unknown as AppContext;

    const app = Fastify();
    app.addHook('onRequest', async (req) => {
      const role = req.headers['x-test-role'] as string | undefined;
      if (role === 'admin' || role === 'player') {
        req.user = {
          id: 'admin-uuid',
          email: 'admin@cozy.vn',
          status: 'active',
          sessionId: 'sess-1',
          role,
        };
      }
    });

    app.setErrorHandler((error, _req, reply) => {
      const e = error as { status?: number; statusCode?: number; code?: string; message?: string };
      reply.status(e.status ?? e.statusCode ?? 500).send({
        error: true,
        code: e.code,
        message: e.message,
      });
    });

    adminRoutes(app, ctx);
    playerRoutes(app, ctx);

    return { app, auditCalls, settingsStore };
  }

  it('GET /admin/fish/shadow-tiers returns all 6 shadow tiers with defaults', async () => {
    const { app } = createTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/admin/fish/shadow-tiers',
      headers: { 'x-test-role': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveLength(6);
    expect(body[0].tier).toBe(1);
    expect(body[5].tier).toBe(6);
    expect(body[5].hasCrown).toBe(true);
    expect(body.every((t: { isOverridden: boolean }) => !t.isOverridden)).toBe(true);
  });

  it('PUT /admin/fish/shadow-tiers/6 allows setting unusually large (oversized) shadow dimensions', async () => {
    const { app, auditCalls } = createTestApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/admin/fish/shadow-tiers/6',
      headers: { 'x-test-role': 'admin' },
      payload: {
        lengthPx: 2500, // To bất thường!
        widthPx: 800,
        swimSpeed: 0.4,
        wiggleSpeed: 0.5,
        hasCrown: true,
        hasGlow: true,
      },
    });
    expect(res.statusCode).toBe(200);
    const updated = JSON.parse(res.body);
    expect(updated.tier).toBe(6);
    expect(updated.lengthPx).toBe(2500);
    expect(updated.widthPx).toBe(800);
    expect(updated.isOverridden).toBe(true);
    expect(auditCalls.length).toBeGreaterThan(0);

    // Verify public endpoint also sees the oversized shadow
    const pubRes = await app.inject({
      method: 'GET',
      url: '/activities/fishing/shadow-tiers',
    });
    expect(pubRes.statusCode).toBe(200);
    const pubBody = JSON.parse(pubRes.body);
    expect(pubBody['6'].lengthPx).toBe(2500);
    expect(pubBody['6'].widthPx).toBe(800);
  });

  it('PUT /admin/fish/shadow-tiers batch updates multiple tiers at once', async () => {
    const { app } = createTestApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/admin/fish/shadow-tiers',
      headers: { 'x-test-role': 'admin' },
      payload: {
        tiers: {
          1: { lengthPx: 60, widthPx: 20 },
          5: { lengthPx: 900, widthPx: 300, hasGlow: true },
        },
      },
    });
    expect(res.statusCode).toBe(200);
    const list = JSON.parse(res.body);
    const t1 = list.find((t: { tier: number }) => t.tier === 1);
    const t5 = list.find((t: { tier: number }) => t.tier === 5);
    expect(t1.lengthPx).toBe(60);
    expect(t1.isOverridden).toBe(true);
    expect(t5.lengthPx).toBe(900);
    expect(t5.isOverridden).toBe(true);
  });

  it('DELETE /admin/fish/shadow-tiers/:tier resets tier to standard defaults', async () => {
    const { app } = createTestApp();
    // First override tier 6
    await app.inject({
      method: 'PUT',
      url: '/admin/fish/shadow-tiers/6',
      headers: { 'x-test-role': 'admin' },
      payload: { lengthPx: 1200, widthPx: 400 },
    });

    // Then delete override
    const delRes = await app.inject({
      method: 'DELETE',
      url: '/admin/fish/shadow-tiers/6',
      headers: { 'x-test-role': 'admin' },
    });
    expect(delRes.statusCode).toBe(200);
    const reset = JSON.parse(delRes.body);
    expect(reset.isOverridden).toBe(false);
    expect(reset.lengthPx).toBe(reset.defaultLengthPx);
  });
});
