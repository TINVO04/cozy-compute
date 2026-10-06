import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { ANIMALS, POND_FISHES, RESIDENT_RECIPES } from '@cozy/game-data';
import { api, createHarness, makeEligible, register, type Harness } from './harness.js';
let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h?.close();
});
const post = (token: string, url: string, body: unknown, key = randomUUID()) =>
  api(h, 'POST', url, { token, body, headers: { 'Idempotency-Key': key } });
async function supply(userId: string, items: { id: string; quantity: number }[]) {
  const farm = await h.ctx.db.query<{ id: string }>('SELECT id FROM farms WHERE user_id=$1', [userId]);
  for (const i of items)
    await h.ctx.db.query(
      `INSERT INTO farm_warehouse_items(farm_id,item_id,category,quantity) VALUES($1,$2,'supply',$3) ON CONFLICT(farm_id,item_id) DO UPDATE SET quantity=farm_warehouse_items.quantity+EXCLUDED.quantity`,
      [farm.rows[0]!.id, i.id, i.quantity],
    );
}
it('uses the same growth and harvest IDs as the UI; concurrent harvest cannot duplicate produce', async () => {
  const p = await register(h);
  await api(h, 'GET', '/api/farm/me', { token: p.token });
  await supply(p.id, [{ id: 'seed_rice', quantity: 1 }]);
  expect(
    (await post(p.token, '/api/farm/plots/plant', { plotIndex: 0, seedItemId: 'seed_rice' })).status,
  ).toBe(200);
  h.clock.now += 181000;
  const state = await api(h, 'GET', '/api/farm/me', { token: p.token });
  expect(state.body.plots[0].growthStage).toBe('mature');
  const responses = await Promise.all([
    post(p.token, '/api/farm/plots/harvest', { plotIndex: 0 }),
    post(p.token, '/api/farm/plots/harvest', { plotIndex: 0 }),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 400]);
  const after = await api(h, 'GET', '/api/farm/me', { token: p.token });
  expect(after.body.warehouse.items).toEqual([
    expect.objectContaining({ itemId: 'crop_rice_harvest', quantity: 2 }),
  ]);
});
it('requires actual seed stock and correct feed, and awards one animal/pond yield per cycle', async () => {
  const p = await register(h);
  await api(h, 'GET', '/api/farm/me', { token: p.token });
  await supply(p.id, [
    { id: 'stock_chicken', quantity: 1 },
    { id: 'feed_grain', quantity: 2 },
    { id: 'stock_fingerling_tra', quantity: 1 },
    { id: 'feed_aquatic', quantity: 1 },
  ]);
  const raiseKey = randomUUID();
  await post(p.token, '/api/farm/care', { kind: 'raise', id: 'stock_chicken' }, raiseKey);
  await post(p.token, '/api/farm/care', { kind: 'raise', id: 'stock_chicken' }, raiseKey);
  const state = await api(h, 'GET', '/api/farm/me', { token: p.token });
  expect(state.body.animals).toHaveLength(5);
  const id = state.body.animals[0].id;
  expect(
    (await post(p.token, '/api/farm/animals/feed', { animalId: id, feedItemId: 'seed_rice' })).status,
  ).toBe(400);
  expect(
    (await post(p.token, '/api/farm/animals/feed', { animalId: id, feedItemId: 'feed_grain' })).status,
  ).toBe(200);
  expect((await post(p.token, '/api/farm/care', { kind: 'collect', id })).status).toBe(400);
  h.clock.now += ANIMALS.chicken.feedIntervalSec * 1000;
  const collectKey = randomUUID();
  expect((await post(p.token, '/api/farm/care', { kind: 'collect', id }, collectKey)).status).toBe(200);
  expect((await post(p.token, '/api/farm/care', { kind: 'collect', id }, collectKey)).status).toBe(200);
  expect((await post(p.token, '/api/farm/care', { kind: 'collect', id })).status).toBe(400);
  const fish = await post(p.token, '/api/farm/pond/stock', { fishSpecies: 'tra' });
  expect(fish.status).toBe(200);
  expect((await post(p.token, '/api/farm/pond/stock', { fishSpecies: 'tra' })).status).toBe(400);
  await post(p.token, '/api/farm/care', { kind: 'pond-feed', id: fish.body.fish.id });
  h.clock.now += POND_FISHES.tra.growthDurationSec * 1000;
  expect(
    (await post(p.token, '/api/farm/care', { kind: 'pond-harvest', id: fish.body.fish.id })).status,
  ).toBe(200);
  const after = await api(h, 'GET', '/api/farm/me', { token: p.token });
  expect(after.body.warehouse.items).toContainEqual(
    expect.objectContaining({ itemId: 'yield_egg', quantity: 1 }),
  );
  expect(after.body.warehouse.items).toContainEqual(
    expect.objectContaining({ itemId: 'fish_pond_tra_harvest', quantity: 1 }),
  );
});
it('verifies ingredients, location, time, ownership and replay on meal deliveries', async () => {
  const p = await register(h);
  await api(h, 'GET', '/api/farm/me', { token: p.token });
  const recipe = RESIDENT_RECIPES[0];
  await supply(p.id, [...recipe.ingredients]);
  expect((await post(p.token, '/api/kitchen', { kind: 'cook', id: recipe.id })).status).toBe(400);
  h.positions.set(p.id, { room: 'comga:bienhoa', x: 0, y: 0, at: h.clock.now });
  const cookKey = randomUUID();
  expect((await post(p.token, '/api/kitchen', { kind: 'cook', id: recipe.id }, cookKey)).status).toBe(200);
  expect((await post(p.token, '/api/kitchen', { kind: 'cook', id: recipe.id }, cookKey)).status).toBe(200);
  expect((await post(p.token, '/api/kitchen', { kind: 'cook', id: recipe.id })).status).toBe(400);
  await post(p.token, '/api/kitchen', { kind: 'order', id: recipe.id });
  const state = await api(h, 'GET', '/api/resident', { token: p.token });
  const id = state.body.order.id;
  expect((await post(p.token, '/api/kitchen', { kind: 'deliver', id })).status).toBe(400);
  h.positions.set(p.id, { room: 'cybernet:bienhoa', x: 0, y: 0, at: h.clock.now });
  expect((await post(p.token, '/api/kitchen', { kind: 'deliver', id })).status).toBe(400);
  h.clock.now += 21000;
  h.positions.set(p.id, { room: 'cybernet:bienhoa', x: 0, y: 0, at: h.clock.now });
  const key = randomUUID();
  expect((await post(p.token, '/api/kitchen', { kind: 'deliver', id }, key)).status).toBe(200);
  expect((await post(p.token, '/api/kitchen', { kind: 'deliver', id }, key)).status).toBe(200);
  const ledger = await h.ctx.db.query(
    `SELECT * FROM ledger_entries WHERE user_id=$1 AND reason_type='meal_delivery'`,
    [p.id],
  );
  expect(ledger.rowCount).toBe(1);
  expect((await api(h, 'GET', '/api/resident', { token: p.token })).body.recipes[1].unlocked).toBe(true);
});
it('does not trust quest progress supplied by clients and issues each reward only once', async () => {
  const p = await register(h);
  expect((await post(p.token, '/api/resident/claim', { questId: 'welcome', progress: 999 })).status).toBe(
    400,
  );
  await makeEligible(h, p.id);
  const results = await Promise.all([
    post(p.token, '/api/resident/claim', { questId: 'welcome' }),
    post(p.token, '/api/resident/claim', { questId: 'welcome' }),
  ]);
  expect(results.every((r) => r.status === 200)).toBe(true);
  const ledger = await h.ctx.db.query(
    `SELECT * FROM ledger_entries WHERE user_id=$1 AND reason_type='resident_quest'`,
    [p.id],
  );
  expect(ledger.rowCount).toBe(1);
});
it('protects favorites and displayed fish from individual and bulk sales', async () => {
  const p = await register(h);
  const fish = await h.ctx.db.query<{ id: string }>(
    `INSERT INTO user_fish_inventory(user_id,species_id,size_cm,weight_kg) VALUES($1,'common_carp',20,1) RETURNING id`,
    [p.id],
  );
  const id = fish.rows[0]!.id;
  expect((await post(p.token, '/api/aquarium', { id, slot: 1, favorite: true })).status).toBe(400);
  expect((await post(p.token, '/api/aquarium', { id, slot: null, favorite: true })).status).toBe(200);
  const { sellFish, sellAllFish } = await import('../src/services/backpack.js');
  await expect(sellFish(h.ctx, p.id, id)).rejects.toThrow();
  expect((await sellAllFish(h.ctx, p.id)).count).toBe(0);
  expect((await h.ctx.db.query('SELECT 1 FROM user_fish_inventory WHERE id=$1', [id])).rowCount).toBe(1);
});
it('prevents watering spam and private farm reads', async () => {
  const p = await register(h),
    v = await register(h);
  await api(h, 'GET', '/api/farm/me', { token: p.token });
  await supply(p.id, [{ id: 'seed_rice', quantity: 1 }]);
  await post(p.token, '/api/farm/plots/plant', { plotIndex: 0, seedItemId: 'seed_rice' });
  expect((await post(v.token, '/api/farm/plots/water', { plotIndex: 0, farmOwnerId: p.id })).status).toBe(
    200,
  );
  expect((await post(v.token, '/api/farm/plots/water', { plotIndex: 0, farmOwnerId: p.id })).status).toBe(
    400,
  );
  await api(h, 'PUT', '/api/farm/settings', { token: p.token, body: { isPublic: false, password: null } });
  expect((await api(h, 'GET', `/api/farm/visit/${p.id}`, { token: v.token })).status).toBe(403);
  expect((await post(v.token, '/api/farm/auth', { farmOwnerId: p.id })).status).toBe(403);
});
it('revokes private farm tickets when settings change', async () => {
  const owner = await register(h);
  const guest = await register(h);
  await api(h, 'GET', '/api/farm/me', { token: owner.token });
  await api(h, 'PUT', '/api/farm/settings', {
    token: owner.token,
    body: { isPublic: false, password: 'old-secret' },
  });
  const ticket = await post(guest.token, '/api/farm/auth', {
    farmOwnerId: owner.id,
    password: 'old-secret',
  });
  expect(ticket.status).toBe(200);
  const headers = { 'x-internal-secret': h.ctx.config.INTERNAL_SECRET };
  const access = () =>
    api(h, 'POST', '/internal/farm-access', {
      headers,
      body: { ownerId: owner.id, visitorId: guest.id, farmToken: ticket.body.farmAuthToken },
    });
  expect((await access()).body.allowed).toBe(true);
  await api(h, 'PUT', '/api/farm/settings', {
    token: owner.token,
    body: { isPublic: false, password: 'new-secret' },
  });
  expect((await access()).body.allowed).toBe(false);
  expect((await api(h, 'GET', '/api/farm/visit/' + owner.id, { token: guest.token })).status).toBe(403);
});
it('validates contract goods, enforces daily completion, and replays a sale without consuming twice', async () => {
  const p = await register(h);
  const state = await api(h, 'GET', '/api/farm/me', { token: p.token });
  const contract = state.body.todayContracts[0];
  await supply(p.id, [
    { id: contract.requiredItemId, quantity: contract.requiredQuantity * 2 },
    { id: 'crop_corn_harvest', quantity: contract.requiredQuantity },
  ]);
  expect(
    (
      await post(p.token, '/api/farm/shop/sell', {
        itemId: 'crop_corn_harvest',
        quantity: contract.requiredQuantity,
        contractId: contract.id,
      })
    ).status,
  ).toBe(400);
  const body = {
    itemId: contract.requiredItemId,
    quantity: contract.requiredQuantity,
    contractId: contract.id,
  };
  const key = randomUUID();
  const first = await post(p.token, '/api/farm/shop/sell', body, key);
  expect(first.status).toBe(200);
  const replay = await post(p.token, '/api/farm/shop/sell', body, key);
  expect(replay.body).toEqual(first.body);
  expect((await post(p.token, '/api/farm/shop/sell', body)).status).toBe(409);
  const after = await api(h, 'GET', '/api/farm/me', { token: p.token });
  expect(after.body.completedContracts).toContain(contract.id);
  expect(after.body.warehouse.items).toContainEqual(
    expect.objectContaining({ itemId: contract.requiredItemId, quantity: contract.requiredQuantity }),
  );
});
it('restricts party membership and messages to accepted invitations', async () => {
  const host = await register(h),
    guest = await register(h),
    outsider = await register(h);
  await post(host.token, '/api/party', { kind: 'create' });
  const state = await api(h, 'GET', '/api/party', { token: host.token });
  const id = state.body.id;
  expect((await post(guest.token, '/api/party', { kind: 'accept', value: id })).status).toBe(400);
  await h.ctx.db.query('INSERT INTO friends(user_id,friend_id) VALUES($1,$2)', [host.id, guest.id]);
  expect((await post(host.token, '/api/party', { kind: 'invite', value: guest.id })).status).toBe(200);
  expect((await post(guest.token, '/api/party', { kind: 'accept', value: id })).status).toBe(200);
  expect((await post(outsider.token, '/api/party', { kind: 'chat', value: 'spoof' })).status).toBe(400);
  expect((await post(guest.token, '/api/party', { kind: 'chat', value: 'Hẹn nhau ở bến sông' })).status).toBe(
    200,
  );
  expect((await api(h, 'GET', '/api/party', { token: host.token })).body.messages).toHaveLength(1);
  expect((await api(h, 'GET', '/api/party', { token: outsider.token })).body.messages).toHaveLength(0);
  await post(host.token, '/api/party', { kind: 'leave' });
  expect((await api(h, 'GET', '/api/party', { token: guest.token })).body.id).toBeNull();
});
it('accepts billiards results only from the realtime service and deduplicates matches', async () => {
  const a = await register(h),
    b = await register(h);
  const body = { id: randomUUID(), hostId: a.id, guestId: b.id, winnerId: a.id, mode: '8ball' };
  expect((await post(a.token, '/internal/bida/result', body)).status).toBe(403);
  for (let n = 0; n < 2; n++)
    expect(
      (
        await api(h, 'POST', '/internal/bida/result', {
          body,
          headers: { 'x-internal-secret': h.ctx.config.INTERNAL_SECRET },
        })
      ).status,
    ).toBe(200);
  const records = await api(h, 'GET', '/api/bida/records', { token: a.token });
  expect(records.body.history).toHaveLength(1);
});
