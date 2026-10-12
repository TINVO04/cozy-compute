import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import type { AppContext } from '../src/context.js';
import { adminRoutes } from '../src/routes/admin.js';
import { playerRoutes } from '../src/routes/player.js';

describe('Admin Fish Shadow Tiers Management (/admin/fish/shadow-tiers)', () => {
  function createTestApp() {
    const settingsStore: Record<string, string> = {};
    const auditCalls: Array<{ sql: string; args: unknown[] }> = [];

    const query = vi.fn(async (sql: string, args: unknown[] = []) => {
      if (sql.includes(`DELETE FROM settings WHERE key = 'fish_shadow_tiers'`)) {
        delete settingsStore['fish_shadow_tiers'];
        return { rows: [] };
      }
      if (sql.includes(`DELETE FROM settings WHERE key = 'fish_species_shadows'`)) {
        delete settingsStore['fish_species_shadows'];
        return { rows: [] };
      }
      if (sql.includes(`DELETE FROM settings WHERE key = 'fishing_behavior_config'`)) {
        delete settingsStore['fishing_behavior_config'];
        return { rows: [] };
      }
      if (sql.includes(`FROM settings WHERE key = 'fish_shadow_tiers'`)) {
        const val = settingsStore['fish_shadow_tiers'];
        return { rows: val ? [{ value: val }] : [] };
      }
      if (sql.includes(`FROM settings WHERE key = 'fish_species_shadows'`)) {
        const val = settingsStore['fish_species_shadows'];
        return { rows: val ? [{ value: val }] : [] };
      }
      if (sql.includes(`FROM settings WHERE key = 'fish_sizes'`)) {
        const val = settingsStore['fish_sizes'];
        return { rows: val ? [{ value: val }] : [] };
      }
      if (sql.includes(`FROM settings WHERE key = 'fishing_behavior_config'`)) {
        const val = settingsStore['fishing_behavior_config'];
        return { rows: val ? [{ value: val }] : [] };
      }
      if (sql.includes(`INSERT INTO settings (key, value, updated_at)`)) {
        if (sql.includes(`'fish_species_shadows'`)) {
          settingsStore['fish_species_shadows'] = String(args[0]);
        } else if (sql.includes(`'fishing_behavior_config'`)) {
          settingsStore['fishing_behavior_config'] = String(args[0]);
        } else {
          settingsStore['fish_shadow_tiers'] = String(args[0]);
        }
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

  it('PUT /admin/fish/:id/shadow allows setting custom oversized shadow for a specific fish species', async () => {
    const { app, auditCalls } = createTestApp();
    const res = await app.inject({
      method: 'PUT',
      url: '/admin/fish/clownfish/shadow',
      headers: { 'x-test-role': 'admin' },
      payload: {
        lengthPx: 4500, // To bất thường!
        widthPx: 1200,
        swimSpeed: 0.5,
        wiggleSpeed: 0.8,
        hasCrown: true,
        hasGlow: true,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe('clownfish');
    expect(body.isShadowOverridden).toBe(true);
    expect(body.lengthPx).toBe(4500);
    expect(body.widthPx).toBe(1200);
    expect(body.hasCrown).toBe(true);
    expect(body.hasGlow).toBe(true);
    expect(auditCalls.some((c: { sql: string }) => c.sql.includes('admin_audit_log'))).toBe(true);

    // Verify GET /admin/fish contains customShadow
    const fishRes = await app.inject({
      method: 'GET',
      url: '/admin/fish',
      headers: { 'x-test-role': 'admin' },
    });
    expect(fishRes.statusCode).toBe(200);
    const allFish = JSON.parse(fishRes.body);
    const clown = allFish.find((f: { id: string }) => f.id === 'clownfish');
    expect(clown.isShadowOverridden).toBe(true);
    expect(clown.shadowLengthPx).toBe(4500);
    expect(clown.shadowWidthPx).toBe(1200);
    expect(clown.shadowHasCrown).toBe(true);

    // Verify public endpoint GET /activities/fishing/species-shadows
    const pubRes = await app.inject({
      method: 'GET',
      url: '/activities/fishing/species-shadows',
    });
    expect(pubRes.statusCode).toBe(200);
    const speciesOverrides = JSON.parse(pubRes.body);
    expect(speciesOverrides.clownfish.lengthPx).toBe(4500);
    expect(speciesOverrides.clownfish.hasCrown).toBe(true);
  });

  it('DELETE /admin/fish/:id/shadow resets species shadow to default tier config', async () => {
    const { app } = createTestApp();
    // First customize
    await app.inject({
      method: 'PUT',
      url: '/admin/fish/clownfish/shadow',
      headers: { 'x-test-role': 'admin' },
      payload: { lengthPx: 2000, widthPx: 600 },
    });

    // Reset
    const delRes = await app.inject({
      method: 'DELETE',
      url: '/admin/fish/clownfish/shadow',
      headers: { 'x-test-role': 'admin' },
    });
    expect(delRes.statusCode).toBe(200);
    const body = JSON.parse(delRes.body);
    expect(body.id).toBe('clownfish');
    expect(body.isShadowOverridden).toBe(false);
    expect(body.customShadow).toBeNull();

    // Verify public endpoint no longer has clownfish override
    const pubRes = await app.inject({
      method: 'GET',
      url: '/activities/fishing/species-shadows',
    });
    expect(pubRes.statusCode).toBe(200);
    const speciesOverrides = JSON.parse(pubRes.body);
    expect(speciesOverrides.clownfish).toBeUndefined();
  });

  it('GET /admin/fishing/behavior returns defaults when unconfigured', async () => {
    const { app } = createTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/admin/fishing/behavior',
      headers: { 'x-test-role': 'admin' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.isOverridden).toBe(false);
    expect(body.config.minNibbles).toBe(1);
    expect(body.config.maxNibbles).toBe(4);
    expect(body.config.retreatDistancePx).toBe(80);
    expect(body.config.dashSpeedFactor).toBe(1.4);
  });

  it('PUT /admin/fishing/behavior updates behavior configuration, including 0 nibbles', async () => {
    const { app, auditCalls } = createTestApp();
    const payload = {
      minNibbles: 0,
      maxNibbles: 2,
      nibbleIntervalMinMs: 800,
      nibbleIntervalMaxMs: 1600,
      shadowDelayMinMs: 2000,
      shadowDelayMaxMs: 4000,
      retreatDistancePx: 95,
      dashSpeedFactor: 2.2,
    };
    const res = await app.inject({
      method: 'PUT',
      url: '/admin/fishing/behavior',
      headers: { 'x-test-role': 'admin' },
      payload,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.isOverridden).toBe(true);
    expect(body.config.minNibbles).toBe(0);
    expect(body.config.retreatDistancePx).toBe(95);
    expect(body.config.dashSpeedFactor).toBe(2.2);
    expect(auditCalls.some((c: { sql: string }) => c.sql.includes('admin_audit_log'))).toBe(true);

    // Verify public player endpoint
    const pubRes = await app.inject({
      method: 'GET',
      url: '/activities/fishing/behavior',
    });
    expect(pubRes.statusCode).toBe(200);
    const pubBody = JSON.parse(pubRes.body);
    expect(pubBody.minNibbles).toBe(0);
    expect(pubBody.dashSpeedFactor).toBe(2.2);
  });

  it('DELETE /admin/fishing/behavior resets behavior to default configuration', async () => {
    const { app } = createTestApp();
    // First customize
    await app.inject({
      method: 'PUT',
      url: '/admin/fishing/behavior',
      headers: { 'x-test-role': 'admin' },
      payload: {
        minNibbles: 0,
        maxNibbles: 0,
        nibbleIntervalMinMs: 500,
        nibbleIntervalMaxMs: 1000,
        shadowDelayMinMs: 1000,
        shadowDelayMaxMs: 2000,
        retreatDistancePx: 120,
        dashSpeedFactor: 2.5,
      },
    });

    // Reset
    const delRes = await app.inject({
      method: 'DELETE',
      url: '/admin/fishing/behavior',
      headers: { 'x-test-role': 'admin' },
    });
    expect(delRes.statusCode).toBe(200);
    const body = JSON.parse(delRes.body);
    expect(body.isOverridden).toBe(false);
    expect(body.config.minNibbles).toBe(1);

    // Verify public endpoint
    const pubRes = await app.inject({
      method: 'GET',
      url: '/activities/fishing/behavior',
    });
    expect(pubRes.statusCode).toBe(200);
    const pubBody = JSON.parse(pubRes.body);
    expect(pubBody.minNibbles).toBe(1);
    expect(pubBody.maxNibbles).toBe(4);
  });
});
