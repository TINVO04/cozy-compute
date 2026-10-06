import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FISH, zoneCenter } from '@cozy/game-data';
import { api, createHarness, register, type Harness } from './harness.js';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.close();
});

const at = (userId: string, zone: Parameters<typeof zoneCenter>[0]) => {
  const c = zoneCenter(zone);
  h.positions.set(userId, { room: 'town', x: c.x, y: c.y, at: h.clock.now });
};

async function ledgerSum(userId: string, currency: string) {
  const r = await h.ctx.db.query<{ s: number; bal: number }>(
    `SELECT coalesce(sum(amount),0)::bigint AS s,
            (SELECT CASE WHEN $2 = 'fame' THEN (SELECT fame FROM profiles WHERE user_id = $1)
                         WHEN $2 = 'coin' THEN (SELECT coin FROM balances WHERE user_id = $1)
                         ELSE (SELECT ai_credit_cents FROM balances WHERE user_id = $1) END)::bigint AS bal
       FROM ledger_entries WHERE user_id = $1 AND currency = $2`,
    [userId, currency],
  );
  return r.rows[0]!;
}

describe('auth', () => {
  it('registers with starter balance and ledger entry, logs in, rejects bad password', async () => {
    const p = await register(h, 'auth-test@test.local');
    const me = await api(h, 'GET', '/me', { token: p.token });
    expect(me.status).toBe(200);
    expect(me.body.balances.coin).toBe(300);
    const sum = await ledgerSum(p.id, 'coin');
    expect(sum.s).toBe(sum.bal);
    expect(
      (
        await api(h, 'POST', '/auth/login', {
          body: { email: 'auth-test@test.local', password: 'correct horse battery' },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api(h, 'POST', '/auth/login', {
          body: { email: 'auth-test@test.local', password: 'wrong password!' },
        })
      ).status,
    ).toBe(401);
    expect((await api(h, 'GET', '/me')).status).toBe(401);
    const dup = await api(h, 'POST', '/auth/register', {
      body: { email: 'AUTH-test@test.local', password: 'correct horse battery', displayName: 'Another' },
    });
    expect(dup.status).toBe(409);
  });

  it('blocks non-admins from admin routes', async () => {
    const p = await register(h);
    expect((await api(h, 'GET', '/admin/models', { token: p.token })).status).toBe(403);
    expect((await api(h, 'PUT', '/admin/settings/ai_policy', { token: p.token, body: {} })).status).toBe(403);
  });

  it('rejects internal routes without the shared secret', async () => {
    expect((await api(h, 'POST', '/internal/session', { body: { token: 'x' } })).status).toBe(403);
  });
});

describe('fishing', () => {
  it('catches a Chí Tôn variant with server-owned rewards, inventory and journal identity', async () => {
    const player = await register(h);
    h.positions.set(player.id, { room: 'ocean', x: 1100, y: 800, at: h.clock.now });
    await h.ctx.db.query(
      `INSERT INTO inventory_items (user_id, item_id, quantity, equipped_slot) VALUES ($1, 'boat_trawler', 1, 'boat')`,
      [player.id],
    );
    // The highest RNG roll selects the final species; completion uses the stored server candidate.
    h.rngQueue.push(0.999999);
    const start = await api(h, 'POST', '/activities/fishing/start', { token: player.token });
    expect(start.status).toBe(200);
    h.clock.now += start.body.biteInMs + 300;
    h.rngQueue.push(0); // Avoid the server's independent escape roll.
    const result = await api(h, 'POST', '/activities/fishing/complete', {
      token: player.token,
      body: { runId: start.body.runId, nonce: start.body.nonce },
    });
    const expected = FISH.find((fish) => fish.id === 'kraken_eclipse')!;
    expect(result.status).toBe(200);
    expect(result.body.outcome).toBe('caught');
    expect(result.body.fish.id).toBe(expected.id);
    expect(result.body.fish.rarity).toBe('sovereign');
    expect(result.body.coin).toBe(expected.coin);
    const inventory = await h.ctx.db.query<{ species_id: string }>(
      'SELECT species_id FROM user_fish_inventory WHERE user_id = $1',
      [player.id],
    );
    const journal = await h.ctx.db.query<{ species_id: string; count: number }>(
      'SELECT species_id, count FROM fish_journal WHERE user_id = $1',
      [player.id],
    );
    expect(inventory.rows.map((row) => row.species_id)).toEqual([expected.id]);
    expect(journal.rows).toEqual([{ species_id: expected.id, count: 1 }]);
    expect((await ledgerSum(player.id, 'coin')).bal).toBe(300 + expected.coin);
  });
  it('keeps the longest nibble sequence valid through the catch window', async () => {
    const p = await register(h);
    at(p.id, 'pier');
    const originalRng = h.ctx.rng;
    h.ctx.rng = () => 0.999999;
    let start;
    try {
      start = await api(h, 'POST', '/activities/fishing/start', { token: p.token });
    } finally {
      h.ctx.rng = originalRng;
    }
    expect(start.status).toBe(200);
    expect(start.body.nibbleCount).toBe(8);
    expect(start.body.nibbleOffsetsMs).toHaveLength(8);
    expect(start.body.nibbleOrbitTurns).toHaveLength(8);
    expect(start.body.biteInMs).toBe(45560 + start.body.shadowDelayMs);
    const latestReactionMs = start.body.reactionWindowMs + 2000 + 400;
    expect(Date.parse(start.body.expiresAt) - Date.parse(start.body.startedAt)).toBeGreaterThan(
      start.body.biteInMs + latestReactionMs,
    );
    h.clock.now += start.body.biteInMs + latestReactionMs;
    const done = await api(h, 'POST', '/activities/fishing/complete', {
      token: p.token,
      body: { runId: start.body.runId, nonce: start.body.nonce },
    });
    expect(done.status).toBe(200);
    expect(done.body.outcome).toBe('caught');
  });

  it('requires being at the pier', async () => {
    const p = await register(h);
    expect((await api(h, 'POST', '/activities/fishing/start', { token: p.token })).body.error.code).toBe(
      'not_at_location',
    );
    at(p.id, 'plaza');
    expect((await api(h, 'POST', '/activities/fishing/start', { token: p.token })).body.error.code).toBe(
      'not_at_location',
    );
  });

  it('pays a server-rolled reward once and rejects replay', async () => {
    const p = await register(h);
    at(p.id, 'pier');
    h.rngQueue.push(0); // bite at biteMinMs
    const start = await api(h, 'POST', '/activities/fishing/start', { token: p.token });
    expect(start.status).toBe(200);
    h.clock.now += start.body.biteInMs + 300;
    h.rngQueue.push(0); // lowest fish roll
    const done = await api(h, 'POST', '/activities/fishing/complete', {
      token: p.token,
      body: { runId: start.body.runId, nonce: start.body.nonce },
    });
    expect(done.body.outcome).toBe('caught');
    expect(done.body.coin).toBeGreaterThan(0);
    const replay = await api(h, 'POST', '/activities/fishing/complete', {
      token: p.token,
      body: { runId: start.body.runId, nonce: start.body.nonce },
    });
    expect(replay.status).toBe(409);
    const sum = await ledgerSum(p.id, 'coin');
    expect(sum.bal).toBe(300 + done.body.coin);
    expect(sum.s).toBe(sum.bal);
  });

  it('rejects early and late reactions without reward', async () => {
    const p = await register(h);
    at(p.id, 'pier');
    const s1 = await api(h, 'POST', '/activities/fishing/start', { token: p.token });
    const early = await api(h, 'POST', '/activities/fishing/complete', {
      token: p.token,
      body: { runId: s1.body.runId, nonce: s1.body.nonce },
    });
    expect(early.body.outcome).toBe('too_early');
    const s2 = await api(h, 'POST', '/activities/fishing/start', { token: p.token });
    h.clock.now += s2.body.biteInMs + 5000;
    const late = await api(h, 'POST', '/activities/fishing/complete', {
      token: p.token,
      body: { runId: s2.body.runId, nonce: s2.body.nonce },
    });
    expect(late.body.outcome).toBe('got_away');
    expect((await ledgerSum(p.id, 'coin')).bal).toBe(300);
  });

  it('flags forged completions and does not allow completing another player run', async () => {
    const a = await register(h);
    const b = await register(h);
    at(a.id, 'pier');
    const s = await api(h, 'POST', '/activities/fishing/start', { token: a.token });
    h.clock.now += s.body.biteInMs + 200;
    const forged = await api(h, 'POST', '/activities/fishing/complete', {
      token: a.token,
      body: { runId: s.body.runId, nonce: 'forged-nonce-value' },
    });
    expect(forged.status).toBe(400);
    const flags = await h.ctx.db.query(`SELECT type FROM abuse_flags WHERE user_id = $1`, [a.id]);
    expect(flags.rows.map((r) => r.type)).toContain('forged_completion');
    const stolen = await api(h, 'POST', '/activities/fishing/complete', {
      token: b.token,
      body: { runId: s.body.runId, nonce: s.body.nonce },
    });
    expect(stolen.status).toBe(404);
  });
});

describe('delivery', () => {
  it('rejects impossibly fast deliveries and pays legit ones', async () => {
    const p = await register(h);
    at(p.id, 'delivery');
    h.rngQueue.push(0, 0); // destination = cafe, package 0
    const s = await api(h, 'POST', '/activities/delivery/start', { token: p.token });
    expect(s.body.destination).toBe('cafe');
    at(p.id, 'cafe');
    h.clock.now += 200;
    const fast = await api(h, 'POST', '/activities/delivery/complete', {
      token: p.token,
      body: { runId: s.body.runId, nonce: s.body.nonce },
    });
    expect(fast.body.outcome).toBe('rejected');
    const flags = await h.ctx.db.query(`SELECT type FROM abuse_flags WHERE user_id = $1`, [p.id]);
    expect(flags.rows.map((r) => r.type)).toContain('impossible_travel');

    at(p.id, 'delivery');
    h.rngQueue.push(0, 0);
    const s2 = await api(h, 'POST', '/activities/delivery/start', { token: p.token });
    h.clock.now += 6000;
    at(p.id, 'plaza');
    const wrongPlace = await api(h, 'POST', '/activities/delivery/complete', {
      token: p.token,
      body: { runId: s2.body.runId, nonce: s2.body.nonce },
    });
    expect(wrongPlace.body.error.code).toBe('not_at_location');
    at(p.id, 'cafe');
    const ok = await api(h, 'POST', '/activities/delivery/complete', {
      token: p.token,
      body: { runId: s2.body.runId, nonce: s2.body.nonce },
    });
    expect(ok.body.outcome).toBe('delivered');
    expect(ok.body.coin).toBeGreaterThanOrEqual(45);
  });
});

describe('cafe', () => {
  it('pays for the correct order and nothing for a wrong one', async () => {
    const p = await register(h);
    at(p.id, 'cafe');
    const s = await api(h, 'POST', '/activities/cafe/start', { token: p.token });
    h.clock.now += 4000;
    const ok = await api(h, 'POST', '/activities/cafe/complete', {
      token: p.token,
      body: { runId: s.body.runId, nonce: s.body.nonce, sequence: s.body.order },
    });
    expect(ok.body.outcome).toBe('served');
    const s2 = await api(h, 'POST', '/activities/cafe/start', { token: p.token });
    h.clock.now += 4000;
    const bad = await api(h, 'POST', '/activities/cafe/complete', {
      token: p.token,
      body: { runId: s2.body.runId, nonce: s2.body.nonce, sequence: ['regret'] },
    });
    expect(bad.body.outcome).toBe('wrong_order');
    const sum = await ledgerSum(p.id, 'coin');
    expect(sum.bal).toBe(300 + ok.body.coin);
  });
});

describe('shop, inventory, apartment', () => {
  it('buys once per idempotency key, rejects when broke, equips, and saves a valid room', async () => {
    const p = await register(h);
    const buy = () =>
      api(h, 'POST', '/shop/buy', {
        token: p.token,
        body: { itemId: 'furn_lamp' },
        headers: { 'idempotency-key': 'buy-lamp-0001' },
      });
    const [a, b] = await Promise.all([buy(), buy()]);
    expect([a.status, b.status].sort()).toEqual([200, 200]);
    const me = await api(h, 'GET', '/me', { token: p.token });
    expect(me.body.balances.coin).toBe(300 - 130);
    const broke = await api(h, 'POST', '/shop/buy', {
      token: p.token,
      body: { itemId: 'hat_crown' },
      headers: { 'idempotency-key': 'buy-crown-0001' },
    });
    expect(broke.body.error.code).toBe('insufficient_balance');

    const equip = await api(h, 'POST', '/inventory/equip', {
      token: p.token,
      body: { itemId: 'top_tee_sky', slot: 'top' },
    });
    expect(equip.body.appearance.top).toBe('tee:#6f9fe0');
    const notOwned = await api(h, 'POST', '/inventory/equip', {
      token: p.token,
      body: { itemId: 'hat_crown', slot: 'hat' },
    });
    expect(notOwned.status).toBe(404);

    const save = await api(h, 'PUT', '/apartments/me', {
      token: p.token,
      body: {
        name: 'Test Pad',
        themeId: 'mint',
        published: true,
        objects: [
          { itemId: 'furn_chair', x: 1, y: 2, rotation: 0 },
          { itemId: 'furn_lamp', x: 3, y: 2, rotation: 0 },
        ],
      },
    });
    expect(save.status).toBe(200);
    expect(save.body.score).toBeGreaterThan(0);
    const overlap = await api(h, 'PUT', '/apartments/me', {
      token: p.token,
      body: {
        name: 'x',
        themeId: 'mint',
        published: true,
        objects: [
          { itemId: 'furn_chair', x: 1, y: 2, rotation: 0 },
          { itemId: 'furn_chair', x: 1, y: 2, rotation: 0 },
        ],
      },
    });
    expect(overlap.body.error.code).toBe('overlap');
    const notMine = await api(h, 'PUT', '/apartments/me', {
      token: p.token,
      body: {
        name: 'x',
        themeId: 'mint',
        published: true,
        objects: [{ itemId: 'furn_duck_statue', x: 1, y: 2, rotation: 0 }],
      },
    });
    expect(notMine.body.error.code).toBe('not_owned');

    const visitor = await register(h);
    const view = await api(h, 'GET', `/apartments/${p.id}`, { token: visitor.token });
    expect(view.body.objects).toHaveLength(2);
    expect(
      (
        await api(h, 'POST', `/apartments/${p.id}/guestbook`, {
          token: visitor.token,
          body: { message: 'Nice lamp' },
        })
      ).status,
    ).toBe(200);
    const gb = await api(h, 'GET', `/apartments/${p.id}/guestbook`, { token: p.token });
    expect(gb.body[0].message).toBe('Nice lamp');
  });
});

describe('events', () => {
  it('ranks participants and pays each exactly once', async () => {
    const { tickEvents, joinEvent, finishEvent, scheduleNext } = await import('../src/services/events.js');
    const a = await register(h);
    const b = await register(h);
    const ev = await scheduleNext(h.ctx, 1000);
    expect(ev).not.toBeNull();
    await joinEvent(h.ctx, a.id, ev!.id);
    await joinEvent(h.ctx, b.id, ev!.id);
    h.clock.now += 1500;
    await tickEvents(h.ctx);
    const active = JSON.parse((await h.ctx.redis.get('event:active'))!);
    expect(active.ducks.length).toBeGreaterThan(0);
    await h.ctx.redis.hset(`event:${ev!.id}:scores`, a.id, 3, b.id, 1);
    await finishEvent(h.ctx, ev!.id);
    await finishEvent(h.ctx, ev!.id);
    const rows = await h.ctx.db.query<{ user_id: string; placement: number }>(
      'SELECT user_id, placement FROM event_entries WHERE event_id = $1',
      [ev!.id],
    );
    expect(rows.rows.find((r) => r.user_id === a.id)!.placement).toBe(1);
    const ledger = await h.ctx.db.query(
      `SELECT count(*)::int AS n FROM ledger_entries WHERE reference_id = $1 AND currency = 'coin'`,
      [ev!.id],
    );
    expect(ledger.rows[0].n).toBe(2);
    expect((await ledgerSum(a.id, 'coin')).bal).toBe(300 + 20 + 75 + 150);
  });
});

describe('backpack & fish', () => {
  it('stores caught fish in backpack, holds on avatar, and sells for coin', async () => {
    const p = await register(h);
    at(p.id, 'pier');
    h.rngQueue.push(0);
    const start = await api(h, 'POST', '/activities/fishing/start', { token: p.token });
    h.clock.now += start.body.biteInMs + 300;
    h.rngQueue.push(0);
    const caught = await api(h, 'POST', '/activities/fishing/complete', {
      token: p.token,
      body: { runId: start.body.runId, nonce: start.body.nonce },
    });
    expect(caught.body.outcome).toBe('caught');
    const backpackId = caught.body.backpackFishId;
    expect(backpackId).toBeDefined();

    // Check backpack list (caught fish is automatically held on avatar)
    const list1 = await api(h, 'GET', '/backpack/fish', { token: p.token });
    expect(list1.status).toBe(200);
    expect(list1.body.length).toBe(1);
    expect(list1.body[0].id).toBe(backpackId);
    expect(list1.body[0].isHeld).toBe(true);

    // Check /me appearance shows held fish
    const me1 = await api(h, 'GET', '/me', { token: p.token });
    expect(me1.body.appearance.heldFish?.speciesId).toBe(caught.body.fish.id);

    // Unhold fish
    const unhold = await api(h, 'POST', '/backpack/fish/unhold', { token: p.token });
    expect(unhold.status).toBe(200);
    expect(unhold.body.appearance.heldFish).toBeNull();

    // Hold fish again from backpack
    const hold = await api(h, 'POST', `/backpack/fish/${backpackId}/hold`, { token: p.token });
    expect(hold.status).toBe(200);
    expect(hold.body.appearance.heldFish?.speciesId).toBe(caught.body.fish.id);

    // Check /me appearance shows held fish again
    const me2 = await api(h, 'GET', '/me', { token: p.token });
    expect(me2.body.appearance.heldFish?.speciesId).toBe(caught.body.fish.id);

    // Sell fish
    const balBefore = (await ledgerSum(p.id, 'coin')).bal;
    const sell = await api(h, 'POST', `/backpack/fish/${backpackId}/sell`, { token: p.token });
    expect(sell.status).toBe(200);
    expect(sell.body.coinEarned).toBeGreaterThan(0);
    const balAfter = (await ledgerSum(p.id, 'coin')).bal;
    expect(balAfter).toBe(balBefore + sell.body.coinEarned);

    // Backpack is now empty
    const list2 = await api(h, 'GET', '/backpack/fish', { token: p.token });
    expect(list2.body.length).toBe(0);
  });

  it('allows admin to view full fish dictionary and tune fish size', async () => {
    const admin = await register(h, 'admin@test.local');
    const list = await api(h, 'GET', '/admin/fish', { token: admin.token });
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThan(50);

    const update = await api(h, 'PUT', '/admin/fish/blue_whale/size', {
      token: admin.token,
      body: { minSizeCm: 2200, maxSizeCm: 3500 },
    });
    expect(update.status).toBe(200);
    expect(update.body.minSizeCm).toBe(2200);
    expect(update.body.maxSizeCm).toBe(3500);
    expect(update.body.isOverridden).toBe(true);

    const listAfter = await api(h, 'GET', '/admin/fish', { token: admin.token });
    const bw = listAfter.body.find((f: { id: string }) => f.id === 'blue_whale');
    expect(bw.minSizeCm).toBe(2200);
    expect(bw.maxSizeCm).toBe(3500);
    expect(bw.isOverridden).toBe(true);

    // Batch update multiple fish sizes
    const batchUpdate = await api(h, 'PUT', '/admin/fish/batch-size', {
      token: admin.token,
      body: {
        updates: [
          { id: 'clownfish', minSizeCm: 15, maxSizeCm: 30 },
          { id: 'guppy_rainbow', minSizeCm: 8, maxSizeCm: 16 },
        ],
      },
    });
    expect(batchUpdate.status).toBe(200);
    const cf = batchUpdate.body.find((f: { id: string }) => f.id === 'clownfish');
    const gp = batchUpdate.body.find((f: { id: string }) => f.id === 'guppy_rainbow');
    expect(cf.minSizeCm).toBe(15);
    expect(cf.maxSizeCm).toBe(30);
    expect(cf.isOverridden).toBe(true);
    expect(gp.minSizeCm).toBe(8);
    expect(gp.maxSizeCm).toBe(16);
    expect(gp.isOverridden).toBe(true);

    // Public /activities/fishing/species returns overridden sizes
    const pubList = await api(h, 'GET', '/activities/fishing/species');
    expect(pubList.status).toBe(200);
    const pubCf = pubList.body.find((f: { id: string }) => f.id === 'clownfish');
    expect(pubCf.minSizeCm).toBe(15);
    expect(pubCf.maxSizeCm).toBe(30);

    // Batch reset clownfish and guppy_rainbow back to default
    const batchReset = await api(h, 'POST', '/admin/fish/batch-reset', {
      token: admin.token,
      body: { ids: ['clownfish', 'guppy_rainbow'] },
    });
    expect(batchReset.status).toBe(200);
    const cfReset = batchReset.body.find((f: { id: string }) => f.id === 'clownfish');
    expect(cfReset.isOverridden).toBe(false);
    expect(cfReset.minSizeCm).toBe(cfReset.defaultMinSizeCm);

    // Delete single fish override
    const del = await api(h, 'DELETE', '/admin/fish/blue_whale/size', { token: admin.token });
    expect(del.status).toBe(200);
    expect(del.body.isOverridden).toBe(false);
    expect(del.body.minSizeCm).toBe(del.body.defaultMinSizeCm);
  });
});
