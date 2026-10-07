import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { requireAdmin } from '../auth.js';
import { withTx } from '../db.js';
import { audit } from '../services/audit.js';
import { worldWeather, weatherOverrideSchema } from '../services/weather.js';
import { fishingConditions } from '@cozy/game-data';

export function weatherRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get('/world/weather', async () => {
    const weather = await worldWeather(ctx);
    try {
      await ctx.redis.set('world:weather', JSON.stringify(weather), 'EX', 120);
    } catch {
      // Redis optional in isolated environments
    }
    return weather;
  });
  app.get('/activities/fishing/conditions', async () => fishingConditions(await worldWeather(ctx)));
  app.put('/admin/weather', async (req) => {
    const admin = requireAdmin(req);
    const override = weatherOverrideSchema.parse(req.body);
    await withTx(ctx.db, async (tx) => {
      await tx.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ('world_weather', $1, now())
        ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
        [JSON.stringify(override)],
      );
      await audit(tx, admin.id, 'weather.update', 'settings', 'world_weather', null, override);
    });
    const weather = await worldWeather(ctx);
    try {
      await ctx.redis.set('world:weather', JSON.stringify(weather));
      await ctx.redis.publish('weather:updated', JSON.stringify(weather));
    } catch {
      // Redis optional in isolated environments
    }
    return weather;
  });
}
