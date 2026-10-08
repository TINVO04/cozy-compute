import {
  BIEN_HOA_COORDS,
  mapWmoCodeToCondition,
  resolveEffectiveTelemetry,
  type AdminWeatherOverride,
  type WeatherTelemetry,
} from '@cozy/game-data';
import { z } from 'zod';
import type { AppContext } from '../context.js';

export const weatherOverrideSchema = z
  .object({
    enabled: z.boolean(),
    solarHour: z.number().min(0).max(24).nullable().optional(),
    condition: z
      .enum(['clear', 'partly_cloudy', 'cloudy', 'drizzle', 'rain', 'heavy_rain', 'thunderstorm'])
      .nullable()
      .optional(),
    windSpeedKmh: z.number().min(0).max(60).nullable().optional(),
    rainIntensity: z.number().min(0).max(1).nullable().optional(),
    lightningAt: z.number().nullable().optional(),
    windGustAt: z.number().nullable().optional(),
  })
  .strict();

const currentSchema = z.object({
  temperature_2m: z.number().min(-30).max(60),
  weather_code: z.number().int().min(0).max(99),
  wind_speed_10m: z.number().min(0).max(250),
  wind_direction_10m: z.number().min(0).max(360),
  precipitation: z.number().min(0).max(500),
  cloud_cover: z.number().min(0).max(100),
});
type LiveWeather = Pick<
  WeatherTelemetry,
  'temperatureC' | 'condition' | 'windSpeedKmh' | 'windDirectionDeg' | 'precipitationMm' | 'cloudCoverPct'
>;
const fallback: LiveWeather = {
  temperatureC: 30,
  condition: 'clear',
  windSpeedKmh: 14,
  windDirectionDeg: 190,
  precipitationMm: 0,
  cloudCoverPct: 20,
};

/** Cached server feed; one request in flight, bounded timeout and retry after outages. */
export function createWeatherFeed(fetcher: typeof fetch = fetch, clock: () => number = Date.now) {
  let live = fallback;
  let expiresAt = 0;
  let pending: Promise<LiveWeather> | null = null;
  return async (): Promise<LiveWeather> => {
    if (clock() < expiresAt) return live;
    if (pending) return pending;
    pending = (async () => {
      try {
        const fields =
          'temperature_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m';
        const res = await fetcher(
          `https://api.open-meteo.com/v1/forecast?latitude=${BIEN_HOA_COORDS.lat}&longitude=${BIEN_HOA_COORDS.lon}&current=${fields}&timezone=Asia%2FHo_Chi_Minh`,
          { signal: AbortSignal.timeout(2500) },
        );
        if (!res.ok) throw new Error('Weather unavailable');
        const data = z.object({ current: currentSchema }).parse(await res.json()).current;
        live = {
          temperatureC: data.temperature_2m,
          condition: mapWmoCodeToCondition(data.weather_code, data.precipitation),
          windSpeedKmh: data.wind_speed_10m,
          windDirectionDeg: data.wind_direction_10m,
          precipitationMm: data.precipitation,
          cloudCoverPct: data.cloud_cover,
        };
        expiresAt = clock() + 10 * 60_000;
      } catch {
        expiresAt = clock() + 60_000;
      }
      return live;
    })();
    try {
      return await pending;
    } finally {
      pending = null;
    }
  };
}

const liveWeather = createWeatherFeed();

export async function worldWeather(ctx: AppContext) {
  const result = await ctx.db.query<{ value: unknown }>(
    `SELECT value FROM settings WHERE key = 'world_weather'`,
  );
  const parsed = weatherOverrideSchema.safeParse(result.rows[0]?.value);
  const override: AdminWeatherOverride | null = parsed.success ? parsed.data : null;
  const live = ctx.config?.NODE_ENV === 'test' ? fallback : await liveWeather();
  return resolveEffectiveTelemetry(override, live, ctx.now());
}
