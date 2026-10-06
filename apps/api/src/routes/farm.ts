import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth.js';
import type { AppContext } from '../context.js';
import { badRequest } from '../errors.js';
import * as farmService from '../services/farm.js';

const idem = (headers: Record<string, unknown>) => {
  const v = headers['idempotency-key'];
  if (typeof v !== 'string' || v.length < 8 || v.length > 100)
    throw badRequest('idempotency_key_required', 'Missing or invalid Idempotency-Key header.');
  return v;
};

export function farmRoutes(app: FastifyInstance, ctx: AppContext) {
  // 1. Get farm state
  app.get('/api/farm/me', async (req) => {
    const user = requireUser(req);
    return farmService.getFarmFullState(ctx, user.id);
  });

  // 2. Settings (privacy & password)
  app.put('/api/farm/settings', async (req) => {
    const user = requireUser(req);
    const schema = z.object({
      isPublic: z.boolean().optional(),
      password: z.string().nullable().optional(),
    });
    const body = schema.parse(req.body);
    return farmService.updateFarmSettings(ctx, user.id, body.isPublic, body.password);
  });

  // 3. Visitor authentication
  app.post('/api/farm/auth', async (req) => {
    const user = requireUser(req);
    const schema = z.object({
      farmOwnerId: z.string().uuid(),
      password: z.string().optional(),
    });
    const body = schema.parse(req.body);
    return farmService.authenticateFarmVisitor(ctx, user.id, body.farmOwnerId, body.password);
  });

  // 4. Unlock plot
  app.post('/api/farm/plots/unlock', async (req) => {
    const user = requireUser(req);
    const key = idem(req.headers as Record<string, unknown>);
    const schema = z.object({
      plotIndex: z.number().int().min(0).max(35),
    });
    const body = schema.parse(req.body);
    return farmService.unlockPlot(ctx, user.id, body.plotIndex, key);
  });

  // 5. Plant seed
  app.post('/api/farm/plots/plant', async (req) => {
    const user = requireUser(req);
    const schema = z.object({
      plotIndex: z.number().int().min(0).max(35),
      seedItemId: z.string().min(1),
      useFertilizer: z.boolean().optional(),
      farmOwnerId: z.string().uuid().optional(),
    });
    const body = schema.parse(req.body);
    return farmService.plantSeed(
      ctx,
      user.id,
      body.plotIndex,
      body.seedItemId,
      body.useFertilizer,
      body.farmOwnerId,
    );
  });

  // 6. Water plot
  app.post('/api/farm/plots/water', async (req) => {
    const user = requireUser(req);
    const schema = z.object({
      plotIndex: z.number().int().min(0).max(35),
      farmOwnerId: z.string().uuid().optional(),
    });
    const body = schema.parse(req.body);
    return farmService.waterPlot(ctx, user.id, body.plotIndex, body.farmOwnerId);
  });

  // 7. Harvest plot
  app.post('/api/farm/plots/harvest', async (req) => {
    const user = requireUser(req);
    const schema = z.object({
      plotIndex: z.number().int().min(0).max(35),
      farmOwnerId: z.string().uuid().optional(),
    });
    const body = schema.parse(req.body);
    return farmService.harvestPlot(ctx, user.id, body.plotIndex, body.farmOwnerId);
  });

  // 8. Shop Buy
  app.post('/api/farm/shop/buy', async (req) => {
    const user = requireUser(req);
    const key = idem(req.headers as Record<string, unknown>);
    const schema = z.object({
      itemId: z.string().min(1),
      quantity: z.number().int().positive(),
    });
    const body = schema.parse(req.body);
    return farmService.buyShopItem(ctx, user.id, body.itemId, body.quantity, key);
  });

  // 9. Shop Sell Wholesale & Contracts
  app.post('/api/farm/shop/sell', async (req) => {
    const user = requireUser(req);
    const schema = z.object({
      itemId: z.string().min(1),
      quantity: z.number().int().positive(),
      contractId: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const key = req.headers['idempotency-key'] ? idem(req.headers as Record<string, unknown>) : undefined;
    return farmService.sellShopProduce(ctx, user.id, body.itemId, body.quantity, body.contractId, key);
  });

  // 10. Animal Feed
  app.post('/api/farm/animals/feed', async (req) => {
    const user = requireUser(req);
    const schema = z.object({
      animalId: z.string().uuid(),
      feedItemId: z.string().min(1),
    });
    const body = schema.parse(req.body);
    return farmService.feedAnimal(ctx, user.id, body.animalId, body.feedItemId);
  });

  // 11. Pond Stock Fingerling
  app.post('/api/farm/pond/stock', async (req) => {
    const user = requireUser(req);
    const schema = z.object({
      fishSpecies: z.string().min(1),
    });
    const body = schema.parse(req.body);
    return farmService.stockPondFish(ctx, user.id, body.fishSpecies);
  });

  // 12. Warehouse Upgrade
  app.post('/api/farm/warehouse/upgrade', async (req) => {
    const user = requireUser(req);
    const key = req.headers['idempotency-key'] ? idem(req.headers as Record<string, unknown>) : undefined;
    return farmService.upgradeWarehouse(ctx, user.id, key);
  });
}
