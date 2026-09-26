import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import OpenAI from 'openai';
import { zoneCenter } from '@cozy/game-data';
import { api, createHarness, makeEligible, register, type Harness } from './harness.js';

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
});

afterAll(async () => {
  await h.close();
});

beforeEach(async () => {
  await h.ctx.db.query(`DELETE FROM settings WHERE key = 'ai_policy'`);
});

const at = (userId: string, zone: Parameters<typeof zoneCenter>[0]) => {
  const c = zoneCenter(zone);
  h.positions.set(userId, { room: 'town', x: c.x, y: c.y, at: h.clock.now });
};

describe('security and tamper resistance', () => {
  it('prevents non-admin players from accessing admin endpoints', async () => {
    const player = await register(h, 'tamper-player@test.local');
    const r = await api(h, 'GET', '/admin/server', { token: player.token });
    expect(r.status).toBe(403);
    expect(r.body.error.message).toContain('Admin access required');
  });

  it('rejects delivery completions with impossible transit time (speed hack / teleport)', async () => {
    const player = await register(h, 'speeder@test.local');
    at(player.id, 'delivery');

    // Start delivery at depot
    const start = await api(h, 'POST', '/activities/delivery/start', { token: player.token });
    expect(start.status).toBe(200);

    // Fast-forward only 100ms and move to destination
    h.clock.now += 100;
    at(player.id, start.body.destination);

    // Submit completion
    const fast = await api(h, 'POST', '/activities/delivery/complete', {
      token: player.token,
      body: { runId: start.body.runId, nonce: start.body.nonce },
    });
    expect(fast.body.outcome).toBe('rejected');

    // Verify security flag is raised in database
    const flags = await h.ctx.db.query(`SELECT type FROM abuse_flags WHERE user_id = $1`, [player.id]);
    expect(flags.rows.map((r) => r.type)).toContain('impossible_travel');
  });
});

describe('duplicate redemption idempotency', () => {
  it('guarantees coin is deducted exactly once when concurrent redemption requests use same idempotency key', async () => {
    const player = await register(h);
    await makeEligible(h, player.id, 50_000);

    const idempotencyKey = `idem-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const before = await h.ctx.db.query<{ coin: number }>('SELECT coin FROM balances WHERE user_id = $1', [
      player.id,
    ]);
    const beforeCoin = Number(before.rows[0]!.coin);

    // Issue concurrent redemption requests with identical idempotency key
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        api(h, 'POST', '/ai/mint', {
          token: player.token,
          headers: { 'idempotency-key': idempotencyKey },
          body: { cents: 100 },
        }),
      ),
    );

    const ok = results.filter((r) => r.status === 200);
    expect(ok.length).toBeGreaterThanOrEqual(1);

    // Balance should be exactly deducted 12,000 Coin once
    const balance = (
      await h.ctx.db.query<{ coin: number; ai_credit_cents: number }>(
        'SELECT coin, ai_credit_cents FROM balances WHERE user_id = $1',
        [player.id],
      )
    ).rows[0]!;

    expect(beforeCoin - Number(balance.coin)).toBe(12_000);
    expect(Number(balance.ai_credit_cents)).toBe(100);

    // Replay with same key succeeds as a replayed response
    const replay = await api(h, 'POST', '/ai/mint', {
      token: player.token,
      headers: { 'idempotency-key': idempotencyKey },
      body: { cents: 100 },
    });
    expect(replay.status).toBe(200);
    expect(replay.body.replayed).toBe(true);
  });
});

describe('external OpenAI SDK compatibility', () => {
  it('can initialize OpenAI SDK with mock upstream and successfully perform completions', async () => {
    const openai = new OpenAI({
      baseURL: 'http://127.0.0.1:4010/v1',
      apiKey: 'mock-upstream-secret',
    });

    const response = await openai.chat.completions.create({
      model: 'mock-gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say cozy' }],
    });

    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0]?.message.content).toContain('Mock upstream heard:');
  });
});
