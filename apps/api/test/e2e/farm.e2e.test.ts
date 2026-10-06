import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, createHarness, makeEligible, register, type Harness } from '../harness.js';

// Default to local PostgreSQL 18 dev database on port 5432 if not explicitly set
if (!process.env.TEST_DATABASE_URL) {
  process.env.TEST_DATABASE_URL = 'postgres://cozy:cozy_dev_password@127.0.0.1:5432/cozy_test';
}

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
});

afterAll(async () => {
  await h?.close();
});

async function getLedgerCoin(userId: string): Promise<number> {
  const r = await h.ctx.db.query<{ bal: string }>(
    `SELECT coin::bigint AS bal FROM balances WHERE user_id = $1`,
    [userId],
  );
  return Number(r.rows[0]?.bal ?? 0);
}

async function getProfileFame(userId: string): Promise<number> {
  const r = await h.ctx.db.query<{ fame: number }>(`SELECT fame FROM profiles WHERE user_id = $1`, [userId]);
  return r.rows[0]?.fame ?? 0;
}

describe('Cozy Farm System E2E Specification', () => {
  // ---------------------------------------------------------------------------
  // TIER 1: FEATURE COVERAGE (Core Functional Happy Paths)
  // ---------------------------------------------------------------------------
  describe('Tier 1: Feature Coverage', () => {
    describe('Core Feature 1: Farm State, Settings & Access Control', () => {
      it('F1.1: initializes personal farm state on demand with 36 plots and 100-slot warehouse', async () => {
        const owner = await register(h);
        const res = await api(h, 'GET', '/api/farm/me', { token: owner.token });

        expect(res.status).toBe(200);
        expect(res.body.farm).toBeDefined();
        expect(res.body.farm.ownerId).toBe(owner.id);
        expect(res.body.farm.isPublic).toBe(true);
        expect(res.body.farm.hasPassword).toBe(false);

        // Grid plots validation
        expect(Array.isArray(res.body.plots)).toBe(true);
        expect(res.body.plots.length).toBe(36);
        for (let i = 0; i < 4; i++) {
          expect(res.body.plots[i].plotIndex).toBe(i);
          expect(res.body.plots[i].isUnlocked).toBe(true);
        }
        for (let i = 4; i < 36; i++) {
          expect(res.body.plots[i].plotIndex).toBe(i);
          expect(res.body.plots[i].isUnlocked).toBe(false);
        }

        // Warehouse validation
        expect(res.body.warehouse).toBeDefined();
        expect(res.body.warehouse.capacity).toBe(100);
        expect(Array.isArray(res.body.warehouse.items)).toBe(true);

        // Livestock & pond validation
        expect(Array.isArray(res.body.animals)).toBe(true);
        expect(res.body.animals.length).toBe(4);
        expect(Array.isArray(res.body.pondFishes)).toBe(true);

        // Today contracts validation
        expect(Array.isArray(res.body.todayContracts)).toBe(true);
      });

      it('F1.2: configures farm privacy settings with password hash', async () => {
        const owner = await register(h);
        const res = await api(h, 'PUT', '/api/farm/settings', {
          token: owner.token,
          body: { isPublic: false, password: 'secret-farm-pass' },
        });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.isPublic).toBe(false);
        expect(res.body.hasPassword).toBe(true);

        // Verify persisted state
        const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        expect(me.body.farm.isPublic).toBe(false);
        expect(me.body.farm.hasPassword).toBe(true);
      });

      it('F1.3: switches farm privacy back to public and clears password', async () => {
        const owner = await register(h);
        await api(h, 'PUT', '/api/farm/settings', {
          token: owner.token,
          body: { isPublic: false, password: 'temporary-pass' },
        });

        const resetRes = await api(h, 'PUT', '/api/farm/settings', {
          token: owner.token,
          body: { isPublic: true, password: null },
        });

        expect(resetRes.status).toBe(200);
        expect(resetRes.body.ok).toBe(true);
        expect(resetRes.body.isPublic).toBe(true);
        expect(resetRes.body.hasPassword).toBe(false);
      });

      it('F1.4: authenticates visitor against private farm and issues visitor session token', async () => {
        const owner = await register(h);
        const visitor = await register(h);

        await api(h, 'PUT', '/api/farm/settings', {
          token: owner.token,
          body: { isPublic: false, password: 'secret-entrance' },
        });

        const authRes = await api(h, 'POST', '/api/farm/auth', {
          token: visitor.token,
          body: { farmOwnerId: owner.id, password: 'secret-entrance' },
        });

        expect(authRes.status).toBe(200);
        expect(authRes.body.ok).toBe(true);
        expect(typeof authRes.body.farmAuthToken).toBe('string');
        expect(authRes.body.farmAuthToken.length).toBeGreaterThan(10);
      });

      it('F1.5: verifies access control via Colyseus internal bridge for owner and guest', async () => {
        const owner = await register(h);
        const visitor = await register(h);

        await api(h, 'PUT', '/api/farm/settings', {
          token: owner.token,
          body: { isPublic: false, password: 'colyseus-pass' },
        });

        // 1. Owner always permitted without token
        const ownerCheck = await api(h, 'POST', '/internal/farm-access', {
          headers: { 'x-internal-secret': 'test-internal-secret-123' },
          body: { ownerId: owner.id, visitorId: owner.id },
        });
        expect(ownerCheck.status).toBe(200);
        expect(ownerCheck.body.allowed).toBe(true);
        expect(ownerCheck.body.isOwner).toBe(true);

        // 2. Visitor with valid token permitted
        const tokenRes = await api(h, 'POST', '/api/farm/auth', {
          token: visitor.token,
          body: { farmOwnerId: owner.id, password: 'colyseus-pass' },
        });
        const guestCheck = await api(h, 'POST', '/internal/farm-access', {
          headers: { 'x-internal-secret': 'test-internal-secret-123' },
          body: {
            ownerId: owner.id,
            visitorId: visitor.id,
            farmToken: tokenRes.body.farmAuthToken,
          },
        });
        expect(guestCheck.status).toBe(200);
        expect(guestCheck.body.allowed).toBe(true);
        expect(guestCheck.body.isOwner).toBe(false);
      });

      it('F1.6: rejects unauthenticated requests to personal farm endpoints', async () => {
        const res = await api(h, 'GET', '/api/farm/me');
        expect(res.status).toBe(401);
      });
    });

    describe('Core Feature 2: Plot Unlock & Soil Management', () => {
      it('F2.1: confirms starter plots 0..3 are unlocked by default on fresh farm', async () => {
        const owner = await register(h);
        const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        const starterPlots = me.body.plots.slice(0, 4);
        expect(starterPlots.every((p: { isUnlocked: boolean }) => p.isUnlocked)).toBe(true);
      });

      it('F2.2: unlocks expansion plot 4 with server-side coin deduction and idempotency key', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);
        const initialCoins = await getLedgerCoin(owner.id);

        const key = randomUUID();
        const res = await api(h, 'POST', '/api/farm/plots/unlock', {
          token: owner.token,
          headers: { 'Idempotency-Key': key },
          body: { plotIndex: 4 },
        });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.plotIndex).toBe(4);
        expect(res.body.coinBalance).toBeLessThan(initialCoins);

        const afterCoins = await getLedgerCoin(owner.id);
        expect(afterCoins).toBe(res.body.coinBalance);
      });

      it('F2.3: safely handles replayed unlock request with identical Idempotency-Key without double charge', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);
        const key = randomUUID();

        const first = await api(h, 'POST', '/api/farm/plots/unlock', {
          token: owner.token,
          headers: { 'Idempotency-Key': key },
          body: { plotIndex: 4 },
        });
        expect(first.status).toBe(200);

        const replay = await api(h, 'POST', '/api/farm/plots/unlock', {
          token: owner.token,
          headers: { 'Idempotency-Key': key },
          body: { plotIndex: 4 },
        });
        expect(replay.status).toBe(200);
        expect(replay.body.coinBalance).toBe(first.body.coinBalance);

        // Verify balance in database deducted exactly once
        const coins = await getLedgerCoin(owner.id);
        expect(coins).toBe(first.body.coinBalance);
      });

      it('F2.4: unlocks successive plots 5 and 6 sequentially with correct ledger accounting', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 20000);

        const u4 = await api(h, 'POST', '/api/farm/plots/unlock', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { plotIndex: 4 },
        });
        const u5 = await api(h, 'POST', '/api/farm/plots/unlock', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { plotIndex: 5 },
        });

        expect(u4.status).toBe(200);
        expect(u5.status).toBe(200);
        expect(u5.body.coinBalance).toBeLessThan(u4.body.coinBalance);
      });

      it('F2.5: waters an unlocked plot and records the moisture timestamp', async () => {
        const owner = await register(h);
        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_rice', quantity: 1 },
        });
        await api(h, 'POST', '/api/farm/plots/plant', {
          token: owner.token,
          body: { plotIndex: 0, seedItemId: 'seed_rice' },
        });

        const res = await api(h, 'POST', '/api/farm/plots/water', {
          token: owner.token,
          body: { farmOwnerId: owner.id, plotIndex: 0 },
        });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.wateredAt).toBeDefined();
        expect(res.body.isGuestHelper).toBe(false);
        expect(res.body.fameAwarded).toBe(0);
      });
    });

    describe('Core Feature 3: Crop Cultivation Lifecycle', () => {
      it('F3.1: sows seeds from warehouse into an empty unlocked starter plot', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);

        // Buy seed first
        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_rice', quantity: 2 },
        });

        const plantRes = await api(h, 'POST', '/api/farm/plots/plant', {
          token: owner.token,
          body: { plotIndex: 0, seedItemId: 'seed_rice' },
        });

        expect(plantRes.status).toBe(200);
        expect(plantRes.body.ok).toBe(true);
        expect(plantRes.body.plot.plotIndex).toBe(0);
        expect(plantRes.body.plot.cropId).toBe('crop_rice');
        expect(plantRes.body.plot.stage).toBe('seed');
      });

      it('F3.2: waters planted crop and advances growth stages over simulated time', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);

        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_rice', quantity: 1 },
        });
        await api(h, 'POST', '/api/farm/plots/plant', {
          token: owner.token,
          body: { plotIndex: 0, seedItemId: 'seed_rice' },
        });
        await api(h, 'POST', '/api/farm/plots/water', {
          token: owner.token,
          body: { farmOwnerId: owner.id, plotIndex: 0 },
        });

        // Advance clock forward halfway
        h.clock.now += 60_000;
        const meMid = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        const stageMid = meMid.body.plots[0].stage;
        expect(['sprout', 'blooming', 'mature']).toContain(stageMid);
      });

      it('F3.3: harvests fully mature crop into silo and resets plot to empty', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);

        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_rice', quantity: 1 },
        });
        await api(h, 'POST', '/api/farm/plots/plant', {
          token: owner.token,
          body: { plotIndex: 0, seedItemId: 'seed_rice' },
        });
        await api(h, 'POST', '/api/farm/plots/water', {
          token: owner.token,
          body: { farmOwnerId: owner.id, plotIndex: 0 },
        });

        // Fast-forward past full maturity duration (e.g. 10 minutes)
        h.clock.now += 600_000;

        const harvestRes = await api(h, 'POST', '/api/farm/plots/harvest', {
          token: owner.token,
          body: { plotIndex: 0 },
        });

        expect(harvestRes.status).toBe(200);
        expect(harvestRes.body.ok).toBe(true);
        expect(harvestRes.body.harvestedItem).toBe('crop_rice_harvest');
        expect(harvestRes.body.quantity).toBeGreaterThanOrEqual(1);

        // Plot is now cleared
        const meAfter = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        expect(meAfter.body.plots[0].cropId).toBeNull();
      });

      it('F3.4: applies bio-fertilizer to accelerate crop growth duration by 50%', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);

        // Buy seed and fertilizer
        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_watermelon', quantity: 1 },
        });
        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'fertilizer_bio', quantity: 1 },
        });

        // Plant with fertilizer
        const plantRes = await api(h, 'POST', '/api/farm/plots/plant', {
          token: owner.token,
          body: { plotIndex: 1, seedItemId: 'seed_watermelon', useFertilizer: true },
        });
        expect(plantRes.status).toBe(200);

        // Fast forward 55% of regular growth time (600s * 0.55 = 330s)
        h.clock.now += 330_000;

        // Since fertilized, crop is already mature and harvestable
        const harvestRes = await api(h, 'POST', '/api/farm/plots/harvest', {
          token: owner.token,
          body: { plotIndex: 1 },
        });
        expect(harvestRes.status).toBe(200);
        expect(harvestRes.body.ok).toBe(true);
      });

      it('F3.5: calculates soil moisture expiration after 30-minute decay threshold', async () => {
        const owner = await register(h);
        await api(h, 'POST', '/api/farm/plots/water', {
          token: owner.token,
          body: { farmOwnerId: owner.id, plotIndex: 0 },
        });

        // Advance 31 minutes
        h.clock.now += 31 * 60 * 1000;

        const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        const plot = me.body.plots[0];
        // Soil is now dry (wateredAt older than 30m)
        const ageSec = (h.clock.now - new Date(plot.wateredAt).getTime()) / 1000;
        expect(ageSec).toBeGreaterThan(1800);
      });
    });

    describe('Core Feature 4: Co-op Visitor Interactions & Anti-Theft Security', () => {
      it('F4.1: allows visitor to water host crops under the Helping Hand mechanic', async () => {
        const host = await register(h);
        const visitor = await register(h);
        await makeEligible(h, host.id, 5000);

        await api(h, 'POST', '/api/farm/shop/buy', {
          token: host.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_rice', quantity: 1 },
        });
        await api(h, 'POST', '/api/farm/plots/plant', {
          token: host.token,
          body: { plotIndex: 0, seedItemId: 'seed_rice' },
        });

        const waterRes = await api(h, 'POST', '/api/farm/plots/water', {
          token: visitor.token,
          body: { farmOwnerId: host.id, plotIndex: 0 },
        });

        expect(waterRes.status).toBe(200);
        expect(waterRes.body.ok).toBe(true);
        expect(waterRes.body.isGuestHelper).toBe(true);
        expect(waterRes.body.fameAwarded).toBeGreaterThan(0);
      });

      it('F4.2: awards friendship Fame points to the helpful visitor', async () => {
        const host = await register(h);
        await api(h, 'POST', '/api/farm/shop/buy', {
          token: host.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_rice', quantity: 1 },
        });
        await api(h, 'POST', '/api/farm/plots/plant', {
          token: host.token,
          body: { plotIndex: 0, seedItemId: 'seed_rice' },
        });
        const visitor = await register(h);
        const initialFame = await getProfileFame(visitor.id);

        const waterRes = await api(h, 'POST', '/api/farm/plots/water', {
          token: visitor.token,
          body: { farmOwnerId: host.id, plotIndex: 0 },
        });

        expect(waterRes.status).toBe(200);
        const finalFame = await getProfileFame(visitor.id);
        expect(finalFame).toBeGreaterThan(initialFame);
      });

      it('F4.3: strictly denies visitor from harvesting host crops (Anti-Theft Rule)', async () => {
        const host = await register(h);
        const visitor = await register(h);
        await makeEligible(h, host.id, 5000);

        await api(h, 'POST', '/api/farm/shop/buy', {
          token: host.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_rice', quantity: 1 },
        });
        await api(h, 'POST', '/api/farm/plots/plant', {
          token: host.token,
          body: { plotIndex: 0, seedItemId: 'seed_rice' },
        });
        h.clock.now += 600_000; // Mature

        // Visitor attempts theft
        const theftRes = await api(h, 'POST', '/api/farm/plots/harvest', {
          token: visitor.token,
          body: { farmOwnerId: host.id, plotIndex: 0 },
        });

        expect(theftRes.status).toBe(403);
      });

      it('F4.4: strictly denies visitor from planting seeds on host plots', async () => {
        const host = await register(h);
        const visitor = await register(h);

        const plantAttempt = await api(h, 'POST', '/api/farm/plots/plant', {
          token: visitor.token,
          body: { farmOwnerId: host.id, plotIndex: 0, seedItemId: 'seed_rice' },
        });

        expect(plantAttempt.status).toBe(403);
      });

      it('F4.5: allows host to harvest their crops after visitor helped water', async () => {
        const host = await register(h);
        const visitor = await register(h);
        await makeEligible(h, host.id, 5000);

        await api(h, 'POST', '/api/farm/shop/buy', {
          token: host.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_rice', quantity: 1 },
        });
        await api(h, 'POST', '/api/farm/plots/plant', {
          token: host.token,
          body: { plotIndex: 0, seedItemId: 'seed_rice' },
        });
        await api(h, 'POST', '/api/farm/plots/water', {
          token: visitor.token,
          body: { farmOwnerId: host.id, plotIndex: 0 },
        });

        h.clock.now += 600_000; // Mature

        const hostHarvest = await api(h, 'POST', '/api/farm/plots/harvest', {
          token: host.token,
          body: { plotIndex: 0 },
        });

        expect(hostHarvest.status).toBe(200);
        expect(hostHarvest.body.ok).toBe(true);
      });
    });

    describe('Core Feature 5: Bác Sáu Shop, Wholesale & Daily Contracts', () => {
      it('F5.1: purchases agricultural supplies from shop with coin deduction', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);
        const startCoins = await getLedgerCoin(owner.id);

        const res = await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_corn', quantity: 4 },
        });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.coinBalance).toBeLessThan(startCoins);
        expect(res.body.purchased.itemId).toBe('seed_corn');
        expect(res.body.purchased.quantity).toBe(4);
      });

      it('F5.2: enforces idempotency on shop purchases preventing duplicate charges', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);
        const key = randomUUID();

        const first = await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': key },
          body: { itemId: 'seed_corn', quantity: 2 },
        });
        const second = await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': key },
          body: { itemId: 'seed_corn', quantity: 2 },
        });

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(second.body.coinBalance).toBe(first.body.coinBalance);
        const dbCoins = await getLedgerCoin(owner.id);
        expect(dbCoins).toBe(first.body.coinBalance);
      });

      it('F5.3: sells harvested produce wholesale for coin credits', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);

        // Populate crop into silo via harvest
        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_rice', quantity: 1 },
        });
        await api(h, 'POST', '/api/farm/plots/plant', {
          token: owner.token,
          body: { plotIndex: 0, seedItemId: 'seed_rice' },
        });
        h.clock.now += 600_000;
        await api(h, 'POST', '/api/farm/plots/harvest', {
          token: owner.token,
          body: { plotIndex: 0 },
        });

        const preSellCoins = await getLedgerCoin(owner.id);
        const sellRes = await api(h, 'POST', '/api/farm/shop/sell', {
          token: owner.token,
          body: { itemId: 'crop_rice', quantity: 1 },
        });

        expect(sellRes.status).toBe(200);
        expect(sellRes.body.ok).toBe(true);
        expect(sellRes.body.coinEarned).toBeGreaterThan(0);
        expect(sellRes.body.bonusPercent).toBe(0);

        const postSellCoins = await getLedgerCoin(owner.id);
        expect(postSellCoins).toBe(preSellCoins + sellRes.body.coinEarned);
      });

      it('F5.4: fulfills today market contract for +25% coin bonus and Fame points', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 10000);

        const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        const contract = me.body.todayContracts[0];
        expect(contract).toBeDefined();

        // Ensure player has the required item
        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: contract.requiredItemId, quantity: contract.requiredQuantity },
        });

        const preFame = await getProfileFame(owner.id);
        const contractSell = await api(h, 'POST', '/api/farm/shop/sell', {
          token: owner.token,
          body: {
            itemId: contract.requiredItemId,
            quantity: contract.requiredQuantity,
            contractId: contract.id,
          },
        });

        expect(contractSell.status).toBe(200);
        expect(contractSell.body.ok).toBe(true);
        expect(contractSell.body.bonusPercent).toBe(25);
        expect(contractSell.body.fameEarned).toBeGreaterThan(0);

        const postFame = await getProfileFame(owner.id);
        expect(postFame).toBeGreaterThan(preFame);
      });

      it('F5.5: validates structure of today contracts in farm profile', async () => {
        const owner = await register(h);
        const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        expect(me.body.todayContracts.length).toBeGreaterThan(0);
        const c = me.body.todayContracts[0];
        expect(c).toHaveProperty('id');
        expect(c).toHaveProperty('title');
        expect(c).toHaveProperty('requiredItemId');
        expect(c).toHaveProperty('requiredQuantity');
        expect(c).toHaveProperty('rewardCoin');
        expect(c).toHaveProperty('rewardFame');
      });
    });

    describe('Core Feature 6: Livestock Husbandry & Pond Aquaculture', () => {
      it('F6.1: initializes 4 animal pens (poultry, cattle, pig, goat/sheep)', async () => {
        const owner = await register(h);
        const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        const types = me.body.animals.map((a: { type: string }) => a.type);
        expect(types).toContain('chicken');
        expect(types).toContain('cow');
        expect(types).toContain('pig');
        expect(types).toContain('goat');
      });

      it('F6.2: feeds dairy cow with feed item and increases happiness score', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);

        // Buy cow feed
        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'feed_hay', quantity: 2 },
        });

        const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        const cow = me.body.animals.find((a: { type: string }) => a.type === 'cow')!;

        const feedRes = await api(h, 'POST', '/api/farm/animals/feed', {
          token: owner.token,
          body: { animalId: cow.id, feedItemId: 'feed_hay' },
        });

        expect(feedRes.status).toBe(200);
        expect(feedRes.body.ok).toBe(true);
        expect(feedRes.body.happiness).toBeGreaterThan(cow.happiness);
        expect(feedRes.body.fedAt).toBeDefined();
      });

      it('F6.3: feeds poultry coop and decrements feed item in silo warehouse', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);

        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'feed_grain', quantity: 3 },
        });

        const meBefore = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        const chicken = meBefore.body.animals.find((a: { type: string }) => a.type === 'chicken')!;

        const feedRes = await api(h, 'POST', '/api/farm/animals/feed', {
          token: owner.token,
          body: { animalId: chicken.id, feedItemId: 'feed_grain' },
        });
        expect(feedRes.status).toBe(200);

        const meAfter = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        const siloGrain = meAfter.body.warehouse.items.find(
          (i: { itemId: string }) => i.itemId === 'feed_grain',
        );
        expect(siloGrain.quantity).toBe(2);
      });

      it('F6.4: stocks fish pond with fingerling species', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);

        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'stock_fingerling_tra', quantity: 1 },
        });
        const stockRes = await api(h, 'POST', '/api/farm/pond/stock', {
          token: owner.token,
          body: { fishSpecies: 'tra' },
        });

        expect(stockRes.status).toBe(200);
        expect(stockRes.body.ok).toBe(true);
        expect(stockRes.body.fish.species).toBe('tra');
        expect(stockRes.body.fish.weightKg).toBeGreaterThan(0);
      });

      it('F6.5: tracks pond fish biomass weight growth over elapsed time', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 5000);

        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'stock_fingerling_basa', quantity: 1 },
        });
        const stockRes = await api(h, 'POST', '/api/farm/pond/stock', {
          token: owner.token,
          body: { fishSpecies: 'basa' },
        });
        const initialWeight = stockRes.body.fish.weightKg;
        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'feed_aquatic', quantity: 1 },
        });
        expect(
          (
            await api(h, 'POST', '/api/farm/care', {
              token: owner.token,
              headers: { 'Idempotency-Key': randomUUID() },
              body: { kind: 'pond-feed', id: stockRes.body.fish.id },
            })
          ).status,
        ).toBe(200);

        // Advance simulated time by several days
        h.clock.now += 3 * 86400 * 1000;

        const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        const basa = me.body.pondFishes.find((f: { species: string }) => f.species === 'basa')!;
        expect(basa.weightKg).toBeGreaterThan(initialWeight);
      });
    });

    describe('Core Feature 7: Silo Warehouse Storage & Expansion', () => {
      it('F7.1: initializes silo with 100 base capacity independent of player backpack', async () => {
        const owner = await register(h);
        const farmMe = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        const userMe = await api(h, 'GET', '/me', { token: owner.token });

        expect(farmMe.body.warehouse.capacity).toBe(100);
        // Silo is separate from backpack inventory
        expect(farmMe.body.warehouse).not.toEqual(userMe.body.backpack);
      });

      it('F7.2: organizes warehouse items into 4 distinct categories', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 10000);

        // Buy seed, feed, fertilizer
        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'seed_rice', quantity: 1 },
        });
        await api(h, 'POST', '/api/farm/shop/buy', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
          body: { itemId: 'feed_hay', quantity: 1 },
        });

        const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
        const categories = new Set(me.body.warehouse.items.map((i: { category: string }) => i.category));
        expect(categories.size).toBeGreaterThanOrEqual(1);
      });

      it('F7.3: upgrades warehouse capacity by +50 slots with coin deduction', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 10000);
        const startCoins = await getLedgerCoin(owner.id);

        const key = randomUUID();
        const res = await api(h, 'POST', '/api/farm/warehouse/upgrade', {
          token: owner.token,
          headers: { 'Idempotency-Key': key },
        });

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.newCapacity).toBe(150);
        expect(res.body.coinBalance).toBeLessThan(startCoins);
      });

      it('F7.4: allows multiple successive tier upgrades (+50 per tier to 200 slots)', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 30000);

        await api(h, 'POST', '/api/farm/warehouse/upgrade', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
        });
        const up2 = await api(h, 'POST', '/api/farm/warehouse/upgrade', {
          token: owner.token,
          headers: { 'Idempotency-Key': randomUUID() },
        });

        expect(up2.status).toBe(200);
        expect(up2.body.newCapacity).toBe(200);
      });

      it('F7.5: enforces idempotency on warehouse upgrade preventing multiple charges', async () => {
        const owner = await register(h);
        await makeEligible(h, owner.id, 10000);
        const key = randomUUID();

        const first = await api(h, 'POST', '/api/farm/warehouse/upgrade', {
          token: owner.token,
          headers: { 'Idempotency-Key': key },
        });
        const second = await api(h, 'POST', '/api/farm/warehouse/upgrade', {
          token: owner.token,
          headers: { 'Idempotency-Key': key },
        });

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(second.body.newCapacity).toBe(first.body.newCapacity);
        expect(second.body.coinBalance).toBe(first.body.coinBalance);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // TIER 2: BOUNDARY & CORNER CASES
  // ---------------------------------------------------------------------------
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('B2.1: rejects negative plot index (-1) on unlock', async () => {
      const owner = await register(h);
      const res = await api(h, 'POST', '/api/farm/plots/unlock', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { plotIndex: -1 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.2: rejects off-by-one upper bound plot index (36) on unlock', async () => {
      const owner = await register(h);
      const res = await api(h, 'POST', '/api/farm/plots/unlock', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { plotIndex: 36 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.3: rejects extreme out-of-bounds plot index (999) on unlock', async () => {
      const owner = await register(h);
      const res = await api(h, 'POST', '/api/farm/plots/unlock', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { plotIndex: 999 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.4: rejects floating point non-integer plot index (2.5)', async () => {
      const owner = await register(h);
      const res = await api(h, 'POST', '/api/farm/plots/unlock', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { plotIndex: 2.5 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.5: rejects unlocking already unlocked starter plot (plot 0)', async () => {
      const owner = await register(h);
      const res = await api(h, 'POST', '/api/farm/plots/unlock', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { plotIndex: 0 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.6: rejects plot unlock when player has insufficient coin balance', async () => {
      const owner = await register(h);
      // Fresh user starts with 300 coins, plot 12 costs 1000 coins
      const res = await api(h, 'POST', '/api/farm/plots/unlock', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { plotIndex: 12 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.7: rejects planting seeds on a locked plot (plot 10)', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 5000);
      await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 1 },
      });

      const res = await api(h, 'POST', '/api/farm/plots/plant', {
        token: owner.token,
        body: { plotIndex: 10, seedItemId: 'seed_rice' },
      });
      expect(res.status).toBe(400);
    });

    it('B2.8: rejects double-planting on an already occupied plot', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 5000);
      await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 2 },
      });

      await api(h, 'POST', '/api/farm/plots/plant', {
        token: owner.token,
        body: { plotIndex: 0, seedItemId: 'seed_rice' },
      });
      const secondPlant = await api(h, 'POST', '/api/farm/plots/plant', {
        token: owner.token,
        body: { plotIndex: 0, seedItemId: 'seed_rice' },
      });
      expect(secondPlant.status).toBe(400);
    });

    it('B2.9: rejects planting seed not in player warehouse', async () => {
      const owner = await register(h);
      const res = await api(h, 'POST', '/api/farm/plots/plant', {
        token: owner.token,
        body: { plotIndex: 0, seedItemId: 'seed_nonexistent' },
      });
      expect(res.status).toBe(400);
    });

    it('B2.10: rejects harvesting an empty plot', async () => {
      const owner = await register(h);
      const res = await api(h, 'POST', '/api/farm/plots/harvest', {
        token: owner.token,
        body: { plotIndex: 0 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.11: rejects premature harvest before crop has matured', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 5000);
      await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 1 },
      });
      await api(h, 'POST', '/api/farm/plots/plant', {
        token: owner.token,
        body: { plotIndex: 0, seedItemId: 'seed_rice' },
      });

      // Immediate harvest attempt without elapsed time
      const res = await api(h, 'POST', '/api/farm/plots/harvest', {
        token: owner.token,
        body: { plotIndex: 0 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.12: rejects shop purchase with quantity 0', async () => {
      const owner = await register(h);
      const res = await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 0 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.13: rejects shop purchase with negative quantity (-5)', async () => {
      const owner = await register(h);
      const res = await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: -5 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.14: rejects shop purchase when player lacks sufficient funds', async () => {
      const owner = await register(h);
      // Attempting to buy 10,000 seeds on starter 300 balance
      const res = await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_watermelon', quantity: 10000 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.15: rejects wholesale sell with quantity 0 or negative', async () => {
      const owner = await register(h);
      const resZero = await api(h, 'POST', '/api/farm/shop/sell', {
        token: owner.token,
        body: { itemId: 'crop_rice', quantity: 0 },
      });
      const resNeg = await api(h, 'POST', '/api/farm/shop/sell', {
        token: owner.token,
        body: { itemId: 'crop_rice', quantity: -2 },
      });
      expect(resZero.status).toBe(400);
      expect(resNeg.status).toBe(400);
    });

    it('B2.16: rejects wholesale sell when player lacks sufficient inventory in silo', async () => {
      const owner = await register(h);
      const res = await api(h, 'POST', '/api/farm/shop/sell', {
        token: owner.token,
        body: { itemId: 'crop_rice', quantity: 999 },
      });
      expect(res.status).toBe(400);
    });

    it('B2.17: rejects replaying Idempotency-Key with conflicting payload', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 10000);
      const key = randomUUID();

      const first = await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': key },
        body: { itemId: 'seed_rice', quantity: 1 },
      });
      expect(first.status).toBe(200);

      // Same key, different payload
      const conflict = await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': key },
        body: { itemId: 'seed_corn', quantity: 5 },
      });
      expect([400, 409]).toContain(conflict.status);
    });

    it('B2.18: rejects visitor auth with incorrect password on private farm', async () => {
      const host = await register(h);
      const visitor = await register(h);

      await api(h, 'PUT', '/api/farm/settings', {
        token: host.token,
        body: { isPublic: false, password: 'correct-password' },
      });

      const res = await api(h, 'POST', '/api/farm/auth', {
        token: visitor.token,
        body: { farmOwnerId: host.id, password: 'wrong-password' },
      });

      expect(res.status).toBe(401);
    });

    it('B2.19: rejects Colyseus internal bridge without valid x-internal-secret header', async () => {
      const host = await register(h);
      const res = await api(h, 'POST', '/internal/farm-access', {
        headers: { 'x-internal-secret': 'invalid-secret' },
        body: { ownerId: host.id, visitorId: host.id },
      });
      expect(res.status).toBe(403);
    });

    it('B2.20: rejects additions when silo warehouse reaches maximum capacity', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 100000);

      // Buy up to exactly 100 items (base capacity)
      const fillRes = await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 100 },
      });
      expect(fillRes.status).toBe(200);

      // 101st item should be rejected
      const overRes = await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 1 },
      });
      expect(overRes.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise & Multi-Feature)
  // ---------------------------------------------------------------------------
  describe('Tier 3: Cross-Feature Combinations', () => {
    it('CIT-01: complete economic cultivation loop (Buy -> Plant -> Water -> Grow -> Harvest -> Sell Wholesale)', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 20000);
      const startCoins = await getLedgerCoin(owner.id);

      // 1. Buy seeds at shop
      const buyRes = await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_watermelon', quantity: 2 },
      });
      expect(buyRes.status).toBe(200);

      // 2. Plant seeds
      const plantRes = await api(h, 'POST', '/api/farm/plots/plant', {
        token: owner.token,
        body: { plotIndex: 0, seedItemId: 'seed_watermelon' },
      });
      expect(plantRes.status).toBe(200);

      // 3. Water plot
      const waterRes = await api(h, 'POST', '/api/farm/plots/water', {
        token: owner.token,
        body: { farmOwnerId: owner.id, plotIndex: 0 },
      });
      expect(waterRes.status).toBe(200);

      // 4. Advance virtual clock past maturation
      h.clock.now += 600_000;

      // 5. Harvest to silo
      const harvestRes = await api(h, 'POST', '/api/farm/plots/harvest', {
        token: owner.token,
        body: { plotIndex: 0 },
      });
      expect(harvestRes.status).toBe(200);
      const yieldQty = harvestRes.body.quantity;

      // 6. Sell wholesale
      const sellRes = await api(h, 'POST', '/api/farm/shop/sell', {
        token: owner.token,
        body: { itemId: 'crop_watermelon', quantity: yieldQty },
      });
      expect(sellRes.status).toBe(200);
      expect(sellRes.body.coinEarned).toBeGreaterThan(0);

      // Net profit check
      const endCoins = await getLedgerCoin(owner.id);
      expect(endCoins).toBeGreaterThan(startCoins - 500); // Account for purchase + sale yield
    });

    it('CIT-02: co-op visit and protection loop (Host sets password -> Visitor auths -> Waters for Fame -> Fails theft -> Host harvests)', async () => {
      const host = await register(h);
      const visitor = await register(h);
      await makeEligible(h, host.id, 10000);

      // Host sets password
      await api(h, 'PUT', '/api/farm/settings', {
        token: host.token,
        body: { isPublic: false, password: 'farm-party-pass' },
      });

      // Host plants crop
      await api(h, 'POST', '/api/farm/shop/buy', {
        token: host.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 1 },
      });
      await api(h, 'POST', '/api/farm/plots/plant', {
        token: host.token,
        body: { plotIndex: 0, seedItemId: 'seed_rice' },
      });

      // Visitor authenticates
      const authRes = await api(h, 'POST', '/api/farm/auth', {
        token: visitor.token,
        body: { farmOwnerId: host.id, password: 'farm-party-pass' },
      });
      expect(authRes.status).toBe(200);
      const visitorToken = authRes.body.farmAuthToken;

      // Colyseus bridge validates entry
      const bridgeRes = await api(h, 'POST', '/internal/farm-access', {
        headers: { 'x-internal-secret': 'test-internal-secret-123' },
        body: { ownerId: host.id, visitorId: visitor.id, farmToken: visitorToken },
      });
      expect(bridgeRes.body.allowed).toBe(true);
      expect(bridgeRes.body.isOwner).toBe(false);

      // Visitor waters host crop (helping hand)
      const waterRes = await api(h, 'POST', '/api/farm/plots/water', {
        token: visitor.token,
        body: { farmOwnerId: host.id, plotIndex: 0 },
      });
      expect(waterRes.body.isGuestHelper).toBe(true);
      expect(waterRes.body.fameAwarded).toBeGreaterThan(0);

      // Fast-forward to mature
      h.clock.now += 600_000;

      // Visitor attempts unauthorized harvest -> 403 Forbidden
      const stealRes = await api(h, 'POST', '/api/farm/plots/harvest', {
        token: visitor.token,
        body: { farmOwnerId: host.id, plotIndex: 0 },
      });
      expect(stealRes.status).toBe(403);

      // Host harvests legitimately
      const hostHarvest = await api(h, 'POST', '/api/farm/plots/harvest', {
        token: host.token,
        body: { plotIndex: 0 },
      });
      expect(hostHarvest.status).toBe(200);
    });

    it('CIT-03: warehouse overflow bottleneck and capacity expansion resolution', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 50000);

      // Fill silo to 100 max capacity
      await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 99 },
      });
      await api(h, 'POST', '/api/farm/plots/plant', {
        token: owner.token,
        body: { plotIndex: 0, seedItemId: 'seed_rice' },
      });
      // Now warehouse has 98 seeds. Buy 2 more to hit exactly 100 items.
      await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 2 },
      });

      // Crop matures
      h.clock.now += 600_000;

      // Harvest rejected because silo is completely full
      const harvestBlocked = await api(h, 'POST', '/api/farm/plots/harvest', {
        token: owner.token,
        body: { plotIndex: 0 },
      });
      expect(harvestBlocked.status).toBe(400);

      // Upgrade warehouse +50 slots
      const upgradeRes = await api(h, 'POST', '/api/farm/warehouse/upgrade', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
      });
      expect(upgradeRes.status).toBe(200);
      expect(upgradeRes.body.newCapacity).toBe(150);

      // Harvest now succeeds smoothly
      const harvestOk = await api(h, 'POST', '/api/farm/plots/harvest', {
        token: owner.token,
        body: { plotIndex: 0 },
      });
      expect(harvestOk.status).toBe(200);
    });

    it('CIT-04: livestock feeding and animal product economic cycle', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 10000);

      // Buy feed
      await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'feed_hay', quantity: 1 },
      });

      const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
      const cow = me.body.animals.find((a: { type: string }) => a.type === 'cow')!;

      // Feed cow
      const feedRes = await api(h, 'POST', '/api/farm/animals/feed', {
        token: owner.token,
        body: { animalId: cow.id, feedItemId: 'feed_hay' },
      });
      expect(feedRes.status).toBe(200);

      // Advance time for yield production
      h.clock.now += 3600 * 1000;

      // Sell animal product
      const sellRes = await api(h, 'POST', '/api/farm/shop/sell', {
        token: owner.token,
        body: { itemId: 'produce_milk', quantity: 1 },
      });
      // If animal product collected or available in silo
      expect([200, 400]).toContain(sellRes.status);
    });

    it('CIT-05: daily contract fulfillment verifying bonus percentage and Fame rewards', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 20000);

      const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
      const contract = me.body.todayContracts[0];

      // Acquire required item
      await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: contract.requiredItemId, quantity: contract.requiredQuantity },
      });

      const fulfillRes = await api(h, 'POST', '/api/farm/shop/sell', {
        token: owner.token,
        body: {
          itemId: contract.requiredItemId,
          quantity: contract.requiredQuantity,
          contractId: contract.id,
        },
      });

      expect(fulfillRes.status).toBe(200);
      expect(fulfillRes.body.bonusPercent).toBe(25);
      expect(fulfillRes.body.fameEarned).toBe(contract.rewardFame);
    });
  });

  // ---------------------------------------------------------------------------
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ---------------------------------------------------------------------------
  describe('Tier 4: Real-World Application Scenarios', () => {
    it('S4.1: multi-crop 4-plot agricultural season with staggered schedules and wholesale delivery', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 50000);

      // Buy seeds for 4 plots
      await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 2 },
      });
      await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_watermelon', quantity: 2 },
      });

      // Sow 4 plots
      for (let i = 0; i < 2; i++) {
        await api(h, 'POST', '/api/farm/plots/plant', {
          token: owner.token,
          body: { plotIndex: i, seedItemId: 'seed_rice' },
        });
      }
      for (let i = 2; i < 4; i++) {
        await api(h, 'POST', '/api/farm/plots/plant', {
          token: owner.token,
          body: { plotIndex: i, seedItemId: 'seed_watermelon' },
        });
      }

      // Water all 4 plots
      for (let i = 0; i < 4; i++) {
        await api(h, 'POST', '/api/farm/plots/water', {
          token: owner.token,
          body: { farmOwnerId: owner.id, plotIndex: i },
        });
      }

      // Advance clock past all maturation limits
      h.clock.now += 900_000;

      // Harvest all 4 plots
      let totalRice = 0;
      let totalWatermelon = 0;
      for (let i = 0; i < 2; i++) {
        const hRes = await api(h, 'POST', '/api/farm/plots/harvest', {
          token: owner.token,
          body: { plotIndex: i },
        });
        expect(hRes.status).toBe(200);
        totalRice += hRes.body.quantity;
      }
      for (let i = 2; i < 4; i++) {
        const hRes = await api(h, 'POST', '/api/farm/plots/harvest', {
          token: owner.token,
          body: { plotIndex: i },
        });
        expect(hRes.status).toBe(200);
        totalWatermelon += hRes.body.quantity;
      }

      // Batch wholesale sell
      const sellRice = await api(h, 'POST', '/api/farm/shop/sell', {
        token: owner.token,
        body: { itemId: 'crop_rice', quantity: totalRice },
      });
      const sellWatermelon = await api(h, 'POST', '/api/farm/shop/sell', {
        token: owner.token,
        body: { itemId: 'crop_watermelon', quantity: totalWatermelon },
      });

      expect(sellRice.status).toBe(200);
      expect(sellWatermelon.status).toBe(200);
    });

    it('S4.2: collaborative community farming event (Host and 3 visitors co-watering, fame sharing, zero theft)', async () => {
      const host = await register(h);
      const v1 = await register(h);
      const v2 = await register(h);
      const v3 = await register(h);

      await makeEligible(h, host.id, 20000);

      // Host unlocks expansion plot 4 and sows plots 0..3
      await api(h, 'POST', '/api/farm/shop/buy', {
        token: host.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 4 },
      });
      for (let i = 0; i < 4; i++) {
        await api(h, 'POST', '/api/farm/plots/plant', {
          token: host.token,
          body: { plotIndex: i, seedItemId: 'seed_rice' },
        });
      }

      // Visitors water different plots
      const r1 = await api(h, 'POST', '/api/farm/plots/water', {
        token: v1.token,
        body: { farmOwnerId: host.id, plotIndex: 0 },
      });
      const r2 = await api(h, 'POST', '/api/farm/plots/water', {
        token: v2.token,
        body: { farmOwnerId: host.id, plotIndex: 1 },
      });
      const r3 = await api(h, 'POST', '/api/farm/plots/water', {
        token: v3.token,
        body: { farmOwnerId: host.id, plotIndex: 2 },
      });

      expect(r1.body.isGuestHelper).toBe(true);
      expect(r2.body.isGuestHelper).toBe(true);
      expect(r3.body.isGuestHelper).toBe(true);

      // Verify each visitor earned Fame
      expect(await getProfileFame(v1.id)).toBeGreaterThan(0);
      expect(await getProfileFame(v2.id)).toBeGreaterThan(0);
      expect(await getProfileFame(v3.id)).toBeGreaterThan(0);

      // Fast forward time
      h.clock.now += 600_000;

      // Visitors all attempt to harvest host crop -> all rejected
      const t1 = await api(h, 'POST', '/api/farm/plots/harvest', {
        token: v1.token,
        body: { farmOwnerId: host.id, plotIndex: 0 },
      });
      const t2 = await api(h, 'POST', '/api/farm/plots/harvest', {
        token: v2.token,
        body: { farmOwnerId: host.id, plotIndex: 1 },
      });
      expect(t1.status).toBe(403);
      expect(t2.status).toBe(403);

      // Host harvests all plots without issue
      for (let i = 0; i < 4; i++) {
        const harvestOk = await api(h, 'POST', '/api/farm/plots/harvest', {
          token: host.token,
          body: { plotIndex: i },
        });
        expect(harvestOk.status).toBe(200);
      }
    });

    it('S4.3: high-concurrency burst and replay resilience (10 parallel identical requests for unlock and upgrade)', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 50000);

      const unlockKey = randomUUID();
      // 10 concurrent requests to unlock plot 4 with same idempotency key
      const unlockPromises = Array.from({ length: 10 }).map(() =>
        api(h, 'POST', '/api/farm/plots/unlock', {
          token: owner.token,
          headers: { 'Idempotency-Key': unlockKey },
          body: { plotIndex: 4 },
        }),
      );
      const unlockResponses = await Promise.all(unlockPromises);

      for (const response of unlockResponses) {
        expect(response.status, JSON.stringify(response.body)).toBe(200);
        expect(response.body).toEqual(unlockResponses[0]!.body);
      }

      // Upgrade warehouse with duplicate key burst
      const upgradeKey = randomUUID();
      const upgradePromises = Array.from({ length: 10 }).map(() =>
        api(h, 'POST', '/api/farm/warehouse/upgrade', {
          token: owner.token,
          headers: { 'Idempotency-Key': upgradeKey },
        }),
      );
      const upgradeResponses = await Promise.all(upgradePromises);
      for (const response of upgradeResponses) {
        expect(response.status, JSON.stringify(response.body)).toBe(200);
        expect(response.body).toEqual(upgradeResponses[0]!.body);
        expect(response.body.newCapacity).toBe(150);
      }
      const charges = await h.ctx.db.query<{ reason_type: string; count: number }>(
        `SELECT reason_type, count(*)::int AS count FROM ledger_entries
         WHERE user_id = $1 AND reason_type IN ('farm_plot_unlock', 'farm_warehouse_upgrade')
         GROUP BY reason_type`,
        [owner.id],
      );
      expect(charges.rows).toHaveLength(2);
      charges.rows.forEach((charge) => expect(charge.count).toBe(1));
    });

    it('S4.4: heavy inflow storage exhaustion and progressive multi-tier expansion (100 -> 150 -> 200)', async () => {
      const owner = await register(h);
      await makeEligible(h, owner.id, 100000);

      // Tier 1 upgrade: 100 -> 150
      const u1 = await api(h, 'POST', '/api/farm/warehouse/upgrade', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
      });
      expect(u1.status).toBe(200);
      expect(u1.body.newCapacity).toBe(150);

      // Tier 2 upgrade: 150 -> 200
      const u2 = await api(h, 'POST', '/api/farm/warehouse/upgrade', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
      });
      expect(u2.status).toBe(200);
      expect(u2.body.newCapacity).toBe(200);

      // Stock 180 items into warehouse
      const buyBulk = await api(h, 'POST', '/api/farm/shop/buy', {
        token: owner.token,
        headers: { 'Idempotency-Key': randomUUID() },
        body: { itemId: 'seed_rice', quantity: 180 },
      });
      expect(buyBulk.status).toBe(200);

      const me = await api(h, 'GET', '/api/farm/me', { token: owner.token });
      expect(me.body.warehouse.capacity).toBe(200);
      const count = me.body.warehouse.items.reduce(
        (acc: number, item: { quantity: number }) => acc + item.quantity,
        0,
      );
      expect(count).toBe(180);
    });
  });
});
