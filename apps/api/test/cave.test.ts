import { afterAll, beforeAll, expect, it } from 'vitest';
import { api, createHarness, register, type Harness } from './harness.js';
let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h?.close();
});
const headers = { 'x-internal-secret': 'test-internal-secret-123' };
it('rejects public loot claims; persists inventory and atomic idempotent shop transactions', async () => {
  const p = await register(h);
  const transaction = (body: object) =>
    api(h, 'POST', '/internal/cave', { headers, body: { userId: p.id, ...body } });
  const forbidden = await api(h, 'POST', '/internal/cave', {
    token: p.token,
    body: { userId: p.id, action: 'loot', item: 'crystal', quantity: 20, requestId: 'fake' },
  });
  expect(forbidden.status).toBe(403);
  const loot = { action: 'loot', item: 'crystal', quantity: 4, requestId: 'kill-one' };
  const results = await Promise.all([transaction(loot), transaction(loot)]);
  expect(results.every((r) => r.status === 200 && r.body.resources.crystal === 4)).toBe(true);
  const purchase = { action: 'buy', item: 'iron', requestId: 'buy-one' };
  const buy = await transaction(purchase);
  expect(buy.body.coin).toBe(120);
  expect(buy.body.weapon).toBe('iron');
  expect((await transaction(purchase)).body.coin).toBe(120);
  const fail = await transaction({ action: 'buy', item: 'crystal', requestId: 'buy-two' });
  expect(fail.status).toBe(409);
  const sell = { action: 'sell', requestId: 'sell-one' };
  expect((await transaction(sell)).body.coin).toBe(216);
  const replay = await transaction(sell);
  expect(replay.body.coin).toBe(216);
  expect(replay.body.resources.crystal).toBe(0);
  const load = await transaction({ action: 'load', requestId: 'load' });
  expect(load.body.weapon).toBe('iron');
  expect(load.body.coin).toBe(216);
});
