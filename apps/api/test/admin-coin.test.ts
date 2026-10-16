import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import type { AppContext } from '../src/context.js';
import { adminRoutes } from '../src/routes/admin.js';

describe('Admin Coin Management (/admin/players/:id/coin)', () => {
  function createTestApp(initialCoin = 5000) {
    let playerCoin = initialCoin;
    const ledgerCalls: unknown[] = [];
    const auditCalls: unknown[] = [];

    const query = vi.fn(async (sql: string, args: unknown[] = []) => {
      if (sql.includes('FROM balances WHERE user_id = $1 FOR UPDATE')) {
        return { rows: [{ coin: playerCoin, value: playerCoin }] };
      }
      if (sql.includes('UPDATE balances SET coin = $2')) {
        playerCoin = Number(args[1]);
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO ledger_entries')) {
        ledgerCalls.push({ sql, args });
        return { rows: [{ id: 101 }] };
      }
      if (sql.includes('INSERT INTO admin_audit_log')) {
        auditCalls.push({ sql, args });
        return { rows: [{ id: 202 }] };
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
      gateway: {
        upsertModel: vi.fn(),
        deleteModel: vi.fn(),
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
    return { app, getCoin: () => playerCoin, ledgerCalls, auditCalls };
  }

  const targetPlayerId = '11111111-2222-4333-8444-555555555555';

  it('rejects unauthenticated requests with 401', async () => {
    const { app } = createTestApp();
    const res = await app.inject({
      method: 'POST',
      url: `/admin/players/${targetPlayerId}/coin`,
      payload: { action: 'add', amount: 1000 },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects regular player role with 403', async () => {
    const { app } = createTestApp();
    const res = await app.inject({
      method: 'POST',
      url: `/admin/players/${targetPlayerId}/coin`,
      headers: { 'x-test-role': 'player' },
      payload: { action: 'add', amount: 1000 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('allows admin to add coins to player balance', async () => {
    const { app, getCoin, ledgerCalls, auditCalls } = createTestApp(5000);
    const res = await app.inject({
      method: 'POST',
      url: `/admin/players/${targetPlayerId}/coin`,
      headers: { 'x-test-role': 'admin' },
      payload: { action: 'add', amount: 2500, reason: 'Thưởng sự kiện câu cá' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.previousCoin).toBe(5000);
    expect(body.newCoin).toBe(7500);
    expect(body.delta).toBe(2500);
    expect(getCoin()).toBe(7500);
    expect(ledgerCalls.length).toBe(1);
    expect(auditCalls.length).toBe(1);
  });

  it('allows admin to subtract coins from player balance', async () => {
    const { app, getCoin, ledgerCalls } = createTestApp(5000);
    const res = await app.inject({
      method: 'POST',
      url: `/admin/players/${targetPlayerId}/coin`,
      headers: { 'x-test-role': 'admin' },
      payload: { action: 'subtract', amount: 1500, reason: 'Điều chỉnh số dư' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.newCoin).toBe(3500);
    expect(body.delta).toBe(-1500);
    expect(getCoin()).toBe(3500);
    expect(ledgerCalls.length).toBe(1);
  });

  it('blocks subtracting more coins than the player has (prevents negative balance)', async () => {
    const { app, getCoin } = createTestApp(1000);
    const res = await app.inject({
      method: 'POST',
      url: `/admin/players/${targetPlayerId}/coin`,
      headers: { 'x-test-role': 'admin' },
      payload: { action: 'subtract', amount: 9999, reason: 'Phạt vượt mức' },
    });
    expect(res.statusCode).toBe(400);
    expect(getCoin()).toBe(1000);
  });

  it('allows admin to set explicit coin balance', async () => {
    const { app, getCoin } = createTestApp(3200);
    const res = await app.inject({
      method: 'POST',
      url: `/admin/players/${targetPlayerId}/coin`,
      headers: { 'x-test-role': 'admin' },
      payload: { action: 'set', amount: 10000, reason: 'Cân bằng tài khoản' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.previousCoin).toBe(3200);
    expect(body.newCoin).toBe(10000);
    expect(body.delta).toBe(6800);
    expect(getCoin()).toBe(10000);
  });
});
