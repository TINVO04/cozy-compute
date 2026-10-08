import { describe, expect, it } from 'vitest';
import {
  BIEN_HOA_COORDS,
  calculateBienHoaLighting,
  getBienHoaTime,
  mapWmoCodeToCondition,
  resolveEffectiveTelemetry,
} from './weather-engine';

describe('weather-engine', () => {
  it('correctly maps WMO weather codes to game weather conditions', () => {
    expect(mapWmoCodeToCondition(0)).toBe('clear');
    expect(mapWmoCodeToCondition(1)).toBe('clear');
    expect(mapWmoCodeToCondition(2)).toBe('partly_cloudy');
    expect(mapWmoCodeToCondition(3)).toBe('cloudy');
    expect(mapWmoCodeToCondition(51)).toBe('drizzle');
    expect(mapWmoCodeToCondition(61)).toBe('rain');
    expect(mapWmoCodeToCondition(65, 12)).toBe('heavy_rain');
    expect(mapWmoCodeToCondition(82)).toBe('heavy_rain');
    expect(mapWmoCodeToCondition(95)).toBe('thunderstorm');
    expect(mapWmoCodeToCondition(99)).toBe('thunderstorm');
  });

  it('computes Bien Hoa solar hours and daylight phases accurately', () => {
    expect(BIEN_HOA_COORDS.timezone).toBe('Asia/Ho_Chi_Minh');

    // 06:00 -> dawn
    const dawn = getBienHoaTime(6.0);
    expect(dawn.phase).toBe('dawn');
    expect(dawn.timeString).toBe('06:00');

    // 09:30 -> morning
    const morning = getBienHoaTime(9.5);
    expect(morning.phase).toBe('morning');
    expect(morning.timeString).toBe('09:30');

    // 12:00 -> noon
    const noon = getBienHoaTime(12.0);
    expect(noon.phase).toBe('noon');
    expect(noon.timeString).toBe('12:00');

    // 16:00 -> afternoon
    const afternoon = getBienHoaTime(16.0);
    expect(afternoon.phase).toBe('afternoon');
    expect(afternoon.timeString).toBe('16:00');

    // 17:45 -> sunset
    const sunset = getBienHoaTime(17.75);
    expect(sunset.phase).toBe('sunset');
    expect(sunset.timeString).toBe('17:45');

    // 21:30 -> night
    const night = getBienHoaTime(21.5);
    expect(night.phase).toBe('night');
    expect(night.timeString).toBe('21:30');
  });

  it('resolves live telemetry and handles admin test overrides correctly', () => {
    const liveSample = {
      temperatureC: 32.4,
      condition: 'clear' as const,
      windSpeedKmh: 14.5,
      windDirectionDeg: 195,
      precipitationMm: 0,
      cloudCoverPct: 20,
    };

    // Live mode
    const defaultTelemetry = resolveEffectiveTelemetry(null, liveSample);
    expect(defaultTelemetry.isOverridden).toBe(false);
    expect(defaultTelemetry.temperatureC).toBeGreaterThanOrEqual(32.4);
    expect(defaultTelemetry.condition).toBe('clear');
    expect(defaultTelemetry.windSpeedKmh).toBe(14.5);

    // Admin test override mode
    const override = {
      enabled: true,
      solarHour: 17.75, // sunset
      condition: 'thunderstorm' as const,
      windSpeedKmh: 38.0,
      rainIntensity: 0.9,
    };
    const overridden = resolveEffectiveTelemetry(override, liveSample);
    expect(overridden.isOverridden).toBe(true);
    expect(overridden.timePhase).toBe('sunset');
    expect(overridden.timeString).toBe('17:45');
    expect(overridden.condition).toBe('thunderstorm');
    expect(overridden.windSpeedKmh).toBe(38.0);
    expect(overridden.precipitationMm).toBeGreaterThan(15);
  });

  it('calculates dynamic Bien Hoa lighting color, alpha, and streetlight brightness', () => {
    const baseWeather = resolveEffectiveTelemetry(null, null);

    // Midday (12:00) with clear weather should have transparent overlay and zero streetlamp brightness
    const noonLighting = calculateBienHoaLighting(12.0, { ...baseWeather, condition: 'clear' });
    expect(noonLighting.alpha).toBe(0);
    expect(noonLighting.lampBrightness).toBe(0);

    // Midnight (01:00) should have dark navy tint, high alpha, and full streetlamp brightness
    const nightLighting = calculateBienHoaLighting(1.0, { ...baseWeather, condition: 'clear' });
    expect(nightLighting.alpha).toBeGreaterThanOrEqual(0.65);
    expect(nightLighting.lampBrightness).toBe(1.0);

    // Sunset (18:00) should have warm amber/coral tone and transition streetlamps ON
    const sunsetLighting = calculateBienHoaLighting(18.0, { ...baseWeather, condition: 'clear' });
    expect(sunsetLighting.alpha).toBeGreaterThan(0.2);
    expect(sunsetLighting.lampBrightness).toBeGreaterThan(0.4);

    // Thunderstorm increases overcast darkness and turns on streetlights
    const stormLighting = calculateBienHoaLighting(12.0, {
      ...baseWeather,
      condition: 'thunderstorm',
    });
    expect(stormLighting.alpha).toBeGreaterThan(0.2);
    expect(stormLighting.lampBrightness).toBeGreaterThan(0.5);
  });

  it('synchronizes whole-server authoritative weather telemetry to ui store', async () => {
    const { acceptWorldWeather } = await import('./weather-sync');
    const { useUi } = await import('../lib/store');

    const serverTelemetry = resolveEffectiveTelemetry(
      {
        enabled: true,
        solarHour: 21.5,
        condition: 'thunderstorm',
        windSpeedKmh: 42,
        rainIntensity: 0.8,
        lightningAt: 1728345678900,
      },
      null,
    );

    acceptWorldWeather(serverTelemetry);

    const currentUi = useUi.getState();
    expect(currentUi.weather.condition).toBe('thunderstorm');
    expect(currentUi.weather.isOverridden).toBe(true);
    expect(currentUi.weather.solarHour).toBe(21.5);
    expect(currentUi.weather.windSpeedKmh).toBe(42);
    expect(currentUi.weather.lightningTriggeredAt).toBe(1728345678900);
    expect(currentUi.weatherOverride?.enabled).toBe(true);
    expect(currentUi.weatherOverride?.condition).toBe('thunderstorm');
  });
});
