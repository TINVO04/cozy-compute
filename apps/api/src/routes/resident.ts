import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth.js';
import type { AppContext } from '../context.js';
import { badRequest } from '../errors.js';
import * as resident from '../services/resident.js';
import { partyAction, partyState } from '../services/party.js';
import { careFarm, getFarmFullState, requireFarmAccess } from '../services/farm.js';

export function residentRoutes(app: FastifyInstance, ctx: AppContext) {
  const key = (headers: Record<string, unknown>) => {
    const value = headers['idempotency-key'];
    if (typeof value !== 'string' || value.length < 8 || value.length > 100)
      throw badRequest('idempotency_key_required', 'Thiếu mã thao tác.');
    return value;
  };
  app.get('/api/resident', (req) => resident.residentState(ctx, requireUser(req).id));
  app.get('/api/party', (req) => partyState(ctx, requireUser(req).id));
  app.post('/api/party', (req) => {
    const b = z
      .object({
        kind: z.enum(['create', 'invite', 'accept', 'decline', 'leave', 'chat']),
        value: z.string().trim().max(300).default(''),
      })
      .parse(req.body);
    if (['invite', 'accept', 'decline'].includes(b.kind)) z.string().uuid().parse(b.value);
    if (b.kind === 'chat') z.string().min(1).parse(b.value);
    return partyAction(ctx, requireUser(req).id, key(req.headers), b.kind, b.value);
  });
  app.post('/api/resident/claim', (req) => {
    const { questId } = z.object({ questId: z.string().max(50) }).parse(req.body);
    return resident.claimQuest(ctx, requireUser(req).id, key(req.headers), questId);
  });
  app.post('/api/kitchen', (req) => {
    const { kind, id } = z
      .object({ kind: z.enum(['cook', 'order', 'deliver', 'cancel']), id: z.string().min(1).max(60) })
      .parse(req.body);
    return resident.kitchenAction(ctx, requireUser(req).id, key(req.headers), kind, id);
  });
  app.get('/api/aquarium/:ownerId', (req) => {
    const { ownerId } = z.object({ ownerId: z.string().uuid() }).parse(req.params);
    return resident.aquariumState(ctx, requireUser(req).id, ownerId);
  });
  app.post('/api/aquarium', (req) => {
    const b = z
      .object({
        id: z.string().uuid(),
        slot: z.number().int().min(1).max(3).nullable(),
        favorite: z.boolean(),
      })
      .parse(req.body);
    return resident.aquariumAction(ctx, requireUser(req).id, key(req.headers), b.id, b.slot, b.favorite);
  });
  app.get('/api/bida/records', (req) => resident.bidaRecords(ctx, requireUser(req).id));
  app.get('/api/community', (req) => resident.communityState(ctx, requireUser(req).id));
  app.post('/api/community/vote', (req) => {
    const { ownerId } = z.object({ ownerId: z.string().uuid() }).parse(req.body);
    return resident.voteHome(ctx, requireUser(req).id, key(req.headers), ownerId);
  });
  app.get('/api/farm/visit/:ownerId', async (req) => {
    const { ownerId } = z.object({ ownerId: z.string().uuid() }).parse(req.params);
    await requireFarmAccess(ctx, requireUser(req).id, ownerId);
    const state = await getFarmFullState(ctx, ownerId);
    return { ...state, warehouse: { capacity: state.warehouse.capacity, items: [] } };
  });
  app.post('/api/farm/care', (req) => {
    const { kind, id } = z
      .object({
        kind: z.enum(['raise', 'collect', 'pond-feed', 'pond-harvest']),
        id: z.string().min(1).max(60),
      })
      .parse(req.body);
    return careFarm(ctx, requireUser(req).id, key(req.headers), kind, id);
  });
}
