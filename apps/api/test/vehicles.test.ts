import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { api, createHarness, register, makeEligible, type Harness } from './harness.js';
let h: Harness;
async function enterShowroom(userId: string) {
  await h.ctx.redis.hset(
    'positions',
    userId,
    JSON.stringify({ room: 'showroom', x: 320, y: 416, at: Date.now() }),
  );
}
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h?.close();
});
it('persists purchases, serializes duplicates, resolves owned equipment and rejects forged ownership', async () => {
  const p = await register(h);
  const unowned = await api(h, 'POST', '/inventory/equip', {
    token: p.token,
    body: { itemId: 'car_mint', slot: 'vehicle' },
  });
  expect(unowned.status).toBe(404);
  await enterShowroom(p.id);
  const poor = await api(h, 'POST', '/shop/buy', {
    token: p.token,
    headers: { 'idempotency-key': randomUUID() },
    body: { itemId: 'car_mint', quantity: 1 },
  });
  expect(poor.status).toBe(409);
  await makeEligible(h, p.id);
  const key = randomUUID();
  const buy = (id: string) =>
    api(h, 'POST', '/shop/buy', {
      token: p.token,
      headers: { 'idempotency-key': id },
      body: { itemId: 'car_mint', quantity: 1 },
    });
  expect((await buy(key)).status).toBe(200);
  expect((await buy(key)).body.replayed).toBe(true);
  expect((await buy(randomUUID())).status).toBe(409);
  expect(
    (
      await api(h, 'POST', '/inventory/equip', {
        token: p.token,
        body: { itemId: 'car_mint', slot: 'vehicle' },
      })
    ).status,
  ).toBe(200);
  expect((await api(h, 'GET', '/me', { token: p.token })).body.appearance.vehicle).toBe('car_mint');
  const racer = await register(h);
  await makeEligible(h, racer.id);
  await enterShowroom(racer.id);
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      api(h, 'POST', '/shop/buy', {
        token: racer.token,
        headers: { 'idempotency-key': randomUUID() },
        body: { itemId: 'car_sunset', quantity: 1 },
      }),
    ),
  );
  expect(concurrent.map((r) => r.status).sort()).toEqual([200, 409]);
  const retryPlayer = await register(h);
  await makeEligible(h, retryPlayer.id);
  await enterShowroom(retryPlayer.id);
  const retryKey = randomUUID();
  const repeated = await Promise.all(
    [1, 2].map(() =>
      api(h, 'POST', '/shop/buy', {
        token: retryPlayer.token,
        headers: { 'idempotency-key': retryKey },
        body: { itemId: 'car_mint', quantity: 1 },
      }),
    ),
  );
  expect(repeated.map((r) => r.status)).toEqual([200, 200]);
  expect(repeated.filter((r) => r.body.replayed)).toHaveLength(1);
});
it.each(['bicycle_sky', 'motorcycle_coral'])(
  'buys and equips %s with persistent ownership',
  async (itemId) => {
    const p = await register(h);
    await makeEligible(h, p.id);
    await enterShowroom(p.id);
    const before = (await api(h, 'GET', '/me', { token: p.token })).body.balances.coin;
    const catalog = await api(h, 'GET', '/shop', { token: p.token });
    const item = catalog.body.find((i: { id: string }) => i.id === itemId);
    expect(item?.type).toBe('vehicle');
    expect(
      (
        await api(h, 'POST', '/shop/buy', {
          token: p.token,
          headers: { 'idempotency-key': randomUUID() },
          body: { itemId, quantity: 1 },
        })
      ).status,
    ).toBe(200);
    expect(
      (await api(h, 'POST', '/inventory/equip', { token: p.token, body: { itemId, slot: 'vehicle' } }))
        .status,
    ).toBe(200);
    const me = (await api(h, 'GET', '/me', { token: p.token })).body;
    expect(me.appearance.vehicle).toBe(itemId);
    expect(me.balances.coin).toBe(before - item.price);
  },
);
it('only realtime can fine; concurrent replays debit once and balances never go negative', async () => {
  const p = await register(h);
  const body = { userId: p.id, ticketId: randomUUID(), violation: 'red_light' };
  expect((await api(h, 'POST', '/internal/traffic-fine', { token: p.token, body })).status).toBe(403);
  const send = (data: typeof body) =>
    api(h, 'POST', '/internal/traffic-fine', {
      headers: { 'x-internal-secret': h.ctx.config.INTERNAL_SECRET },
      body: data,
    });
  const replies = await Promise.all([send(body), send(body)]);
  expect(replies.map((r) => r.body.charged)).toEqual([80, 80]);
  expect((await api(h, 'GET', '/me', { token: p.token })).body.balances.coin).toBe(220);
  await send({ ...body, ticketId: randomUUID() });
  await send({ ...body, ticketId: randomUUID() });
  expect((await send({ ...body, ticketId: randomUUID() })).body.charged).toBe(60);
  expect((await send({ ...body, ticketId: randomUUID() })).body.charged).toBe(0);
});
it('requires fresh server presence inside the showroom to buy a vehicle', async () => {
  const p = await register(h);
  const buy = () =>
    api(h, 'POST', '/shop/buy', {
      token: p.token,
      headers: { 'idempotency-key': randomUUID() },
      body: { itemId: 'bicycle_sky', quantity: 1 },
    });
  expect((await buy()).status).toBe(400);
  await h.ctx.redis.hset('positions', p.id, JSON.stringify({ room: 'showroom', at: Date.now() - 16000 }));
  expect((await buy()).status).toBe(400);
  await enterShowroom(p.id);
  expect((await buy()).status).toBe(200);
});
