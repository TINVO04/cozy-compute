import { describe, expect, it, vi } from 'vitest';
import { createWeatherFeed, worldWeather, weatherOverrideSchema } from '../src/services/weather.js';
import type { AppContext } from '../src/context.js';
import Fastify from 'fastify';
import { weatherRoutes } from '../src/routes/weather.js';

describe('authoritative weather', () => {
  it('allows only admins to persist global weather, with validation and audit', async () => {
    let value: unknown;
    const query = vi.fn(async (sql: string, args: unknown[] = []) => {
      if (sql.includes('INSERT INTO settings')) value = JSON.parse(args[0] as string);
      return { rows: value ? [{ value }] : [] };
    });
    const ctx = {
      config: { NODE_ENV: 'test' },
      now: () => new Date(),
      db: { query, connect: async () => ({ query, release: vi.fn() }) },
    } as unknown as AppContext;
    const app = Fastify();
    app.addHook('onRequest', async (req) => {
      const role = req.headers['x-test-role'];
      if (role === 'admin' || role === 'player')
        req.user = { id: 'user', email: 'test@local', status: 'active', sessionId: 'session', role };
    });
    app.setErrorHandler((error, _req, reply) => {
      const e = error as { status?: number; name?: string };
      reply.status(e.status ?? (e.name === 'ZodError' ? 400 : 500)).send({ error: true });
    });
    weatherRoutes(app, ctx);
    try {
      const payload = { enabled: true, solarHour: 6, condition: 'rain' };
      for (const role of [undefined, 'player']) {
        const response = await app.inject({
          method: 'PUT',
          url: '/admin/weather',
          payload,
          headers: role ? { 'x-test-role': role } : {},
        });
        expect(response.statusCode).toBe(role ? 403 : 401);
      }
      expect(value).toBeUndefined();
      expect(
        (
          await app.inject({
            method: 'PUT',
            url: '/admin/weather',
            payload: { enabled: true, solarHour: 99 },
            headers: { 'x-test-role': 'admin' },
          })
        ).statusCode,
      ).toBe(400);
      const saved = await app.inject({
        method: 'PUT',
        url: '/admin/weather',
        payload,
        headers: { 'x-test-role': 'admin' },
      });
      expect(saved.statusCode).toBe(200);
      expect(saved.json().timeFrozen).toBe(true);
      expect((await app.inject('/activities/fishing/conditions')).json().weather.condition).toBe('rain');
      expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO admin_audit_log'))).toBe(true);
    } finally {
      await app.close();
    }
  });
  it('deduplicates provider requests and keeps the last good rain observation during outages', async () => {
    let time = 0;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            current: {
              temperature_2m: 29,
              weather_code: 61,
              precipitation: 4,
              wind_speed_10m: 18,
              wind_direction_10m: 190,
              cloud_cover: 80,
            },
          }),
        ),
      )
      .mockRejectedValue(new Error('offline'));
    const feed = createWeatherFeed(fetcher, () => time);
    const [a, b] = await Promise.all([feed(), feed()]);
    expect(a.condition).toBe('rain');
    expect(b).toEqual(a);
    expect(fetcher).toHaveBeenCalledTimes(1);
    time = 601000;
    expect(await feed()).toEqual(a);
    await feed();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid overrides and falls back on malformed provider data', async () => {
    expect(weatherOverrideSchema.safeParse({ enabled: true, solarHour: 500 }).success).toBe(false);
    expect(weatherOverrideSchema.safeParse({ enabled: true, rareBonus: 999 }).success).toBe(false);
    const feed = createWeatherFeed(vi.fn<typeof fetch>().mockResolvedValue(new Response('{}')));
    expect((await feed()).condition).toBe('clear');
  });
  it('reads persisted admin settings and uses the server clock when realtime is restored', async () => {
    let override = { enabled: true, solarHour: 6, condition: 'rain' };
    const ctx = {
      config: { NODE_ENV: 'test' },
      now: () => new Date('2026-10-05T15:00:00Z'),
      db: { query: async () => ({ rows: [{ value: override }] }) },
    } as unknown as AppContext;
    expect((await worldWeather(ctx)).timePhase).toBe('dawn');
    expect((await worldWeather(ctx)).condition).toBe('rain');
    override = { ...override, enabled: false };
    expect((await worldWeather(ctx)).timePhase).toBe('night');
  });
});
