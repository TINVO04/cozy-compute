import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api, createHarness, createModel, makeEligible, register, type Harness } from './harness.js';

let h: Harness;
let admin: { token: string; id: string };
let model: { id: string; publicModelName: string };

beforeAll(async () => {
  h = await createHarness();
  admin = await register(h, 'admin@test.local');
  model = await createModel(h, admin.token);
});
afterAll(async () => {
  await h.close();
});
beforeEach(async () => {
  await h.ctx.db.query(`DELETE FROM settings WHERE key = 'ai_policy'`);
});

const balances = async (id: string) =>
  (
    await h.ctx.db.query<{ coin: number; ai_credit_cents: number }>(
      'SELECT coin, ai_credit_cents FROM balances WHERE user_id = $1',
      [id],
    )
  ).rows[0]!;

describe('model registry', () => {
  it('exposes safe service health to admins without provider secrets', async () => {
    const r = await api(h, 'GET', '/admin/server', { token: admin.token });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('healthy');
    expect(r.body.services).toEqual({ database: true, redis: true, gateway: true });
    expect(JSON.stringify(r.body)).not.toContain('LITELLM_MASTER_KEY');
    expect(JSON.stringify(r.body)).not.toContain('UPSTREAM_KEY_1');
  });

  it('syncs enabled models to the gateway and removes disabled ones, with audit', async () => {
    expect(h.gateway.models.get(model.id)?.secretRef).toBe('UPSTREAM_KEY_1');
    const m2 = await createModel(h, admin.token, {
      slug: 'vision-lite',
      publicModelName: 'vision-lite',
      enabled: false,
    });
    expect(h.gateway.models.has(m2.id)).toBe(false);
    const bad = await api(h, 'POST', '/admin/models', {
      token: admin.token,
      body: {
        slug: 'x-bad',
        displayName: 'Bad',
        publicModelName: 'bad',
        upstreamModelName: 'm',
        upstreamBaseUrl: 'https://x.example/v1',
        secretRef: 'sk-raw-secret',
        enabled: true,
        creditMultiplier: 1,
        inputCostPerMtok: 0,
        outputCostPerMtok: 0,
        rpm: 1,
        tpm: 1,
      },
    });
    expect(bad.status).toBe(400);
    const audit = await api(h, 'GET', '/admin/audit', { token: admin.token });
    expect(audit.body.some((a: { action: string }) => a.action === 'model.create')).toBe(true);
    // Player-facing model list never exposes upstream details.
    const p = await register(h);
    const overview = await api(h, 'GET', '/ai', { token: p.token });
    const json = JSON.stringify(overview.body);
    expect(json).not.toContain('upstream.example');
    expect(json).not.toContain('UPSTREAM_KEY');
    expect(overview.body.models.map((m: { name: string }) => m.name)).toEqual(['creator-pro']);
  });
});

describe('eligibility and minting', () => {
  it('rejects ineligible players', async () => {
    const p = await register(h);
    const r = await api(h, 'POST', '/ai/mint', {
      token: p.token,
      body: { cents: 100 },
      headers: { 'idempotency-key': 'mint-inelig-1' },
    });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('not_eligible');
  });

  it('burns Coin exactly once under concurrent replays of the same idempotency key', async () => {
    const p = await register(h);
    await makeEligible(h, p.id, 50_000);
    const before = await balances(p.id);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        api(h, 'POST', '/ai/mint', {
          token: p.token,
          body: { cents: 100 },
          headers: { 'idempotency-key': 'mint-same-key-1' },
        }),
      ),
    );
    const ok = results.filter((r) => r.status === 200);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const r of results) expect([200, 409]).toContain(r.status);
    const after = await balances(p.id);
    expect(before.coin - after.coin).toBe(12000);
    expect(after.ai_credit_cents).toBe(100);
    const mints = await h.ctx.db.query(
      `SELECT count(*)::int AS n FROM ai_redemptions WHERE user_id = $1 AND kind = 'mint'`,
      [p.id],
    );
    expect(mints.rows[0].n).toBe(1);
    const replay = await api(h, 'POST', '/ai/mint', {
      token: p.token,
      body: { cents: 100 },
      headers: { 'idempotency-key': 'mint-same-key-1' },
    });
    expect(replay.body.replayed).toBe(true);
  });

  it('enforces cooldown when different mint requests are queued concurrently', async () => {
    const p = await register(h);
    await makeEligible(h, p.id, 50_000);
    const before = await balances(p.id);
    const blocker = await h.ctx.db.connect();
    await blocker.query('BEGIN');
    await blocker.query(`SELECT pg_advisory_xact_lock(hashtext('ai_reward_pool'))`);
    const pending = Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        api(h, 'POST', '/ai/mint', {
          token: p.token,
          body: { cents: 100 },
          headers: { 'idempotency-key': `mint-concurrent-${i}` },
        }),
      ),
    );
    let waiting = 0;
    try {
      const deadline = Date.now() + 5000;
      while (waiting < 3 && Date.now() < deadline) {
        const locks = await h.ctx.db.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM pg_locks
           WHERE locktype = 'advisory' AND NOT granted
             AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`,
        );
        waiting = locks.rows[0]!.n;
        if (waiting < 3) await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } finally {
      await blocker.query('COMMIT');
      blocker.release();
    }
    const results = await pending;
    expect(waiting).toBe(3);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    const rejected = results.filter((r) => r.status !== 200);
    expect(rejected).toHaveLength(2);
    for (const r of rejected) {
      expect(r.status).toBe(403);
      expect(r.body.error.code).toBe('not_eligible');
    }
    const after = await balances(p.id);
    expect(before.coin - after.coin).toBe(12000);
    expect(after.ai_credit_cents).toBe(100);
  });

  it('enforces cooldown, monthly cap, pool and pause', async () => {
    // Keep both mints in one UTC month even when this test runs on its last day.
    const today = new Date();
    h.clock.now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const p = await register(h);
    await makeEligible(h, p.id, 500_000);
    expect(
      (
        await api(h, 'POST', '/ai/mint', {
          token: p.token,
          body: { cents: 400 },
          headers: { 'idempotency-key': 'cap-1-aaaa' },
        })
      ).status,
    ).toBe(200);
    const cooldown = await api(h, 'POST', '/ai/mint', {
      token: p.token,
      body: { cents: 100 },
      headers: { 'idempotency-key': 'cap-2-aaaa' },
    });
    expect(cooldown.body.error.code).toBe('not_eligible');
    h.clock.now += 13 * 3_600_000;
    const cap = await api(h, 'POST', '/ai/mint', {
      token: p.token,
      body: { cents: 200 },
      headers: { 'idempotency-key': 'cap-3-aaaa' },
    });
    expect(cap.body.error.code).toBe('monthly_cap');

    const policy = (await api(h, 'GET', '/admin/settings', { token: admin.token })).body.ai_policy;
    await api(h, 'PUT', '/admin/settings/ai_policy', {
      token: admin.token,
      body: { ...policy, weeklyPoolCents: 0 },
    });
    const q = await register(h);
    await makeEligible(h, q.id, 50_000);
    const pool = await api(h, 'POST', '/ai/mint', {
      token: q.token,
      body: { cents: 100 },
      headers: { 'idempotency-key': 'pool-1-aaaa' },
    });
    expect(pool.body.error.code).toBe('pool_exhausted');

    await api(h, 'PUT', '/admin/settings/ai_policy', {
      token: admin.token,
      body: { ...policy, redemptionsPaused: true },
    });
    const paused = await api(h, 'POST', '/ai/mint', {
      token: q.token,
      body: { cents: 100 },
      headers: { 'idempotency-key': 'pause-1-aaaa' },
    });
    expect(paused.status).toBe(503);
    const audit = await api(h, 'GET', '/admin/audit', { token: admin.token });
    expect(audit.body.some((a: { action: string }) => a.action === 'redemptions.pause')).toBe(true);
    expect((await balances(q.id)).coin).toBe(300 + 50_000);
  });

  it('ignores client-supplied balances and rejects amounts outside policy', async () => {
    const p = await register(h);
    await makeEligible(h, p.id, 1000);
    const r = await api(h, 'POST', '/ai/mint', {
      token: p.token,
      body: { cents: 100, coin: 999999, coinCost: 1 },
      headers: { 'idempotency-key': 'tamper-1-aaaa' },
    });
    expect(r.body.error.code).toBe('insufficient_balance');
    const tiny = await api(h, 'POST', '/ai/mint', {
      token: p.token,
      body: { cents: 1 },
      headers: { 'idempotency-key': 'tamper-2-aaaa' },
    });
    expect(tiny.body.error.code).toBe('invalid_amount');
  });
});

describe('keys', () => {
  async function playerWithCredit(cents = 300) {
    const p = await register(h);
    await makeEligible(h, p.id, 100_000);
    const m = await api(h, 'POST', '/ai/mint', {
      token: p.token,
      body: { cents },
      headers: { 'idempotency-key': `mint-${p.id}` },
    });
    expect(m.status).toBe(200);
    return p;
  }

  it('creates a key with only allowed models, expected budget and rate limits; secret shown once', async () => {
    const p = await playerWithCredit();
    const r = await api(h, 'POST', '/ai/keys', {
      token: p.token,
      body: { modelIds: [model.id], budgetCents: 200, label: 'Laptop' },
      headers: { 'idempotency-key': 'key-1-aaaaaa' },
    });
    expect(r.status).toBe(200);
    expect(r.body.apiKey).toMatch(/^sk-fake-/);
    const gk = [...h.gateway.keys.values()].find((k) => k.key === r.body.apiKey)!;
    expect(gk.spec.models).toEqual(['creator-pro']);
    expect(gk.spec.maxBudgetUsd).toBe(2);
    expect(gk.spec.rpm).toBe(20);
    expect((await balances(p.id)).ai_credit_cents).toBe(100);
    const replay = await api(h, 'POST', '/ai/keys', {
      token: p.token,
      body: { modelIds: [model.id], budgetCents: 200 },
      headers: { 'idempotency-key': 'key-1-aaaaaa' },
    });
    expect(replay.body.replayed).toBe(true);
    expect(replay.body.apiKey).toBeUndefined();
    expect(h.gateway.keys.size).toBeGreaterThan(0);
    const stored = await h.ctx.db.query('SELECT * FROM player_ai_keys WHERE user_id = $1', [p.id]);
    expect(JSON.stringify(stored.rows)).not.toContain(r.body.apiKey);
  });

  it('refunds AI Credit when the gateway fails and does not duplicate quota', async () => {
    const p = await playerWithCredit();
    h.gateway.failNextGenerate = true;
    const r = await api(h, 'POST', '/ai/keys', {
      token: p.token,
      body: { modelIds: [model.id], budgetCents: 200 },
      headers: { 'idempotency-key': 'key-fail-aaaaa' },
    });
    expect(r.status).toBe(502);
    expect((await balances(p.id)).ai_credit_cents).toBe(300);
    const retry = await api(h, 'POST', '/ai/keys', {
      token: p.token,
      body: { modelIds: [model.id], budgetCents: 200 },
      headers: { 'idempotency-key': 'key-fail-aaaaa' },
    });
    expect(retry.body.error.code).toBe('redemption_failed');
    const ledger = await h.ctx.db.query(
      `SELECT reason_type, amount FROM ledger_entries WHERE user_id = $1 AND currency = 'ai_credit' ORDER BY id`,
      [p.id],
    );
    expect(ledger.rows.map((x) => x.reason_type)).toEqual(['ai_mint', 'ai_key_allocate', 'ai_key_refund']);
  });

  it('rejects disabled models, too many keys, and other players keys', async () => {
    const p = await playerWithCredit(500);
    const m2 = await createModel(h, admin.token, {
      slug: 'off-model',
      publicModelName: 'off-model',
      enabled: false,
    });
    const disabled = await api(h, 'POST', '/ai/keys', {
      token: p.token,
      body: { modelIds: [m2.id], budgetCents: 100 },
      headers: { 'idempotency-key': 'dis-aaaaaaaa' },
    });
    expect(disabled.body.error.code).toBe('model_unavailable');
    for (let i = 0; i < 2; i++) {
      expect(
        (
          await api(h, 'POST', '/ai/keys', {
            token: p.token,
            body: { modelIds: [model.id], budgetCents: 100 },
            headers: { 'idempotency-key': `many-${i}-aaaaa` },
          })
        ).status,
      ).toBe(200);
    }
    const third = await api(h, 'POST', '/ai/keys', {
      token: p.token,
      body: { modelIds: [model.id], budgetCents: 100 },
      headers: { 'idempotency-key': 'many-3-aaaaa' },
    });
    expect(third.body.error.code).toBe('too_many_keys');
    const keys = (await api(h, 'GET', '/ai', { token: p.token })).body.keys;
    const other = await register(h);
    expect((await api(h, 'POST', `/ai/keys/${keys[0].id}/revoke`, { token: other.token })).status).toBe(404);
    expect((await api(h, 'GET', `/ai/keys/${keys[0].id}/usage`, { token: other.token })).status).toBe(404);
  });

  it('revokes and rotates keys at the gateway', async () => {
    const p = await playerWithCredit();
    const k = await api(h, 'POST', '/ai/keys', {
      token: p.token,
      body: { modelIds: [model.id], budgetCents: 300 },
      headers: { 'idempotency-key': 'rot-aaaaaaaa' },
    });
    const tokenOf = (secret: string) => [...h.gateway.keys.entries()].find(([, v]) => v.key === secret)?.[0];
    const oldToken = tokenOf(k.body.apiKey)!;
    h.gateway.keys.get(oldToken)!.spendUsd = 1.25;
    const rot = await api(h, 'POST', `/ai/keys/${k.body.keyId}/rotate`, { token: p.token });
    expect(rot.status).toBe(200);
    expect(h.gateway.keys.has(oldToken)).toBe(false);
    expect(rot.body.budgetUsd).toBe(1.75);
    const newToken = tokenOf(rot.body.apiKey)!;
    const rev = await api(h, 'POST', `/ai/keys/${rot.body.keyId}/revoke`, { token: p.token });
    expect(rev.body.status).toBe('revoked');
    expect(h.gateway.keys.has(newToken)).toBe(false);
  });

  it('lets admins suspend and revoke keys with audit', async () => {
    const p = await playerWithCredit();
    const k = await api(h, 'POST', '/ai/keys', {
      token: p.token,
      body: { modelIds: [model.id], budgetCents: 100 },
      headers: { 'idempotency-key': 'adm-aaaaaaaa' },
    });
    expect(
      (
        await api(h, 'POST', `/admin/keys/${k.body.keyId}/suspend`, {
          token: admin.token,
          body: { suspended: true, reason: 'test' },
        })
      ).status,
    ).toBe(200);
    const token = [...h.gateway.keys.entries()].find(([, v]) => v.key === k.body.apiKey)![0];
    expect(h.gateway.keys.get(token)!.blocked).toBe(true);
    expect((await api(h, 'POST', `/admin/keys/${k.body.keyId}/revoke`, { token: admin.token })).status).toBe(
      200,
    );
    expect(h.gateway.keys.has(token)).toBe(false);
    const audit = (await api(h, 'GET', '/admin/audit', { token: admin.token })).body.map(
      (a: { action: string }) => a.action,
    );
    expect(audit).toEqual(expect.arrayContaining(['key.suspend', 'key.revoke']));
  });

  it('syncs spend from the gateway and expires old keys', async () => {
    const p = await playerWithCredit();
    const k = await api(h, 'POST', '/ai/keys', {
      token: p.token,
      body: { modelIds: [model.id], budgetCents: 100 },
      headers: { 'idempotency-key': 'sync-aaaaaaa' },
    });
    const token = [...h.gateway.keys.entries()].find(([, v]) => v.key === k.body.apiKey)![0];
    h.gateway.keys.get(token)!.spendUsd = 0.42;
    const { syncUsage } = await import('../src/services/ai.js');
    await syncUsage(h.ctx);
    const keys = (await api(h, 'GET', '/ai', { token: p.token })).body.keys;
    expect(keys.find((x: { id: string }) => x.id === k.body.keyId).remainingCents).toBe(58);
    await h.ctx.db.query(`UPDATE player_ai_keys SET expires_at = now() - interval '1 minute' WHERE id = $1`, [
      k.body.keyId,
    ]);
    await syncUsage(h.ctx);
    const after = (await api(h, 'GET', '/ai', { token: p.token })).body.keys;
    expect(after.find((x: { id: string }) => x.id === k.body.keyId).status).toBe('expired');
    expect(h.gateway.keys.has(token)).toBe(false);
  });
});
