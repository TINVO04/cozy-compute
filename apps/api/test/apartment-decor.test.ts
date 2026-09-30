import { GEN_Z_FURNITURE } from '@cozy/game-data';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, createHarness, makeEligible, register, type Harness } from './harness.js';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h.close();
});

describe('Gen Z furniture in the real economy and apartment API', () => {
  it('seeds every new piece, charges server prices, saves rugs and rotated furniture for visitors', async () => {
    const owner = await register(h);
    await makeEligible(h, owner.id, 10_000);
    const catalog = await api<
      Array<{ id: string; price: number; sprite: string; size: { w: number; h: number } }>
    >(h, 'GET', '/shop', { token: owner.token });
    for (const item of GEN_Z_FURNITURE) {
      expect(catalog.body.find((i) => i.id === item.id)).toMatchObject({
        price: item.coinPrice,
        sprite: item.sprite,
        size: item.size,
      });
      const buy = () =>
        api(h, 'POST', '/shop/buy', {
          token: owner.token,
          headers: { 'idempotency-key': `decor-${item.id}-once` },
          body: { itemId: item.id, price: 0 },
        });
      expect((await buy()).status).toBe(200);
      expect((await buy()).body.replayed).toBe(true);
    }
    const me = await api(h, 'GET', '/me', { token: owner.token });
    expect(me.body.balances.coin).toBe(10_300 - GEN_Z_FURNITURE.reduce((sum, i) => sum + i.coinPrice, 0));
    const objects = [
      { itemId: 'furn_capybara', x: 0, y: 1, rotation: 0 },
      { itemId: 'furn_rug_smile', x: 0, y: 1, rotation: 0 },
      { itemId: 'furn_mushroom', x: 2, y: 1, rotation: 0 },
      { itemId: 'furn_boba', x: 3, y: 1, rotation: 0 },
      { itemId: 'furn_mirror', x: 4, y: 1, rotation: 0 },
      { itemId: 'furn_duck_plush', x: 5, y: 1, rotation: 0 },
      { itemId: 'furn_cloud', x: 6, y: 1, rotation: 0 },
      { itemId: 'furn_desk', x: 8, y: 1, rotation: 0 },
      { itemId: 'furn_snack_cart', x: 10, y: 1, rotation: 90 },
      { itemId: 'furn_touch_grass', x: 6, y: 3, rotation: 0 },
      { itemId: 'furn_rug_checker', x: 0, y: 4, rotation: 0 },
    ];
    for (const themeId of ['lilac', 'matcha']) {
      const save = await api(h, 'PUT', '/apartments/me', {
        token: owner.token,
        body: { name: 'Soft life studio', themeId, published: true, objects },
      });
      expect(save.status).toBe(200);
      expect(save.body.score).toBeGreaterThan(0);
    }
    const visitor = await register(h);
    const view = await api(h, 'GET', `/apartments/${owner.id}`, { token: visitor.token });
    expect(view.status).toBe(200);
    expect(view.body.themeId).toBe('matcha');
    expect(view.body.objects).toHaveLength(11);
    expect(view.body.objects.find((o: { itemId: string }) => o.itemId === 'furn_snack_cart')).toMatchObject({
      rotation: 90,
      sprite: 'snackcart:#9db9ab',
      size: { w: 1, h: 2 },
    });
  });

  it('rejects unowned, duplicate, overlapping and out-of-bounds decorations using server footprints', async () => {
    const owner = await register(h);
    const save = (objects: object[]) =>
      api(h, 'PUT', '/apartments/me', {
        token: owner.token,
        body: { name: 'My room', themeId: 'lilac', published: true, objects },
      });
    expect((await save([{ itemId: 'furn_capybara', x: 1, y: 1, rotation: 0 }])).body.error.code).toBe(
      'not_owned',
    );
    await makeEligible(h, owner.id, 2000);
    for (const id of ['furn_snack_cart', 'furn_boba']) {
      await api(h, 'POST', '/shop/buy', {
        token: owner.token,
        body: { itemId: id },
        headers: { 'idempotency-key': `validate-${id}` },
      });
    }
    const snack = { itemId: 'furn_snack_cart', x: 1, y: 2, rotation: 90 };
    expect((await save([snack, { ...snack, x: 4 }])).body.error.code).toBe('not_enough');
    expect((await save([snack, { itemId: 'furn_boba', x: 2, y: 2, rotation: 0 }])).body.error.code).toBe(
      'overlap',
    );
    expect((await save([{ ...snack, x: 11, size: { w: 1, h: 1 } }])).body.error.code).toBe('out_of_bounds');
    expect((await save([snack])).status).toBe(200);
  });
});
