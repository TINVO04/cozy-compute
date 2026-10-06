import type { WeatherTelemetry } from '@cozy/game-data';
export {
  BIEN_HOA_COORDS,
  getBienHoaTime,
  mapWmoCodeToCondition,
  resolveEffectiveTelemetry,
} from '@cozy/game-data';
export type {
  WeatherTelemetry,
  WeatherCondition,
  AdminWeatherOverride,
  TimeOfDayPhase,
} from '@cozy/game-data';

/**
 * Pure math color interpolation between two 24-bit RGB hex colors.
 */
export function interpolateColor(color1: number, color2: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;
  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * clampedT);
  const g = Math.round(g1 + (g2 - g1) * clampedT);
  const b = Math.round(b1 + (b2 - b1) * clampedT);
  return (r << 16) | (g << 8) | b;
}

/**
 * Calculates Bien Hoa 24h dynamic ambient lighting color, alpha, and streetlight brightness.
 * Pure math implementation without DOM or Phaser dependencies.
 */
export function calculateBienHoaLighting(
  solarHour: number,
  weather: WeatherTelemetry,
): { color: number; alpha: number; lampBrightness: number } {
  let color = 0x070a24;
  let alpha = 0.68;
  let lampBrightness = 1.0;

  if (solarHour >= 0 && solarHour < 4.5) {
    // 00:00 - 04:30 Midnight / Nocturnal navy
    color = 0x070a24;
    alpha = 0.68;
    lampBrightness = 1.0;
  } else if (solarHour >= 4.5 && solarHour < 5.5) {
    // 04:30 - 05:30 Pre-dawn twilight
    const t = (solarHour - 4.5) / 1.0;
    color = interpolateColor(0x070a24, 0x382846, t);
    alpha = 0.68 + (0.45 - 0.68) * t;
    lampBrightness = 1.0 + (0.8 - 1.0) * t;
  } else if (solarHour >= 5.5 && solarHour < 6.5) {
    // 05:30 - 06:30 Sunrise / Bình minh rạng đông Biên Hòa
    const t = (solarHour - 5.5) / 1.0;
    color = interpolateColor(0x382846, 0xfb923c, t);
    alpha = 0.45 + (0.12 - 0.45) * t;
    lampBrightness = 0.8 + (0.12 - 0.8) * t;
  } else if (solarHour >= 6.5 && solarHour < 8.0) {
    // 06:30 - 08:00 Early morning golden rays
    const t = (solarHour - 6.5) / 1.5;
    color = 0xfef08a;
    alpha = 0.12 + (0.0 - 0.12) * t;
    lampBrightness = 0.12 + (0.0 - 0.12) * t;
  } else if (solarHour >= 8.0 && solarHour < 11.5) {
    // 08:00 - 11:30 Fresh morning tropical daylight
    color = 0xffffff;
    alpha = 0.0;
    lampBrightness = 0.0;
  } else if (solarHour >= 11.5 && solarHour < 14.5) {
    // 11:30 - 14:30 Intense midday sun
    color = 0xfffef5;
    alpha = 0.0;
    lampBrightness = 0.0;
  } else if (solarHour >= 14.5 && solarHour < 16.75) {
    // 14:30 - 16:45 Warm afternoon rays
    const t = (solarHour - 14.5) / 2.25;
    color = 0xf59e0b;
    alpha = 0.0 + (0.08 - 0.0) * t;
    lampBrightness = 0.0 + (0.1 - 0.0) * t;
  } else if (solarHour >= 16.75 && solarHour < 17.5) {
    // 16:45 - 17:30 Late afternoon golden hour
    const t = (solarHour - 16.75) / 0.75;
    color = 0xf59e0b;
    alpha = 0.08 + (0.22 - 0.08) * t;
    lampBrightness = 0.1 + (0.45 - 0.1) * t;
  } else if (solarHour >= 17.5 && solarHour < 18.5) {
    // 17:30 - 18:30 Sunset / Hoàng hôn rực rỡ vàng cam pha tím
    const t = (solarHour - 17.5) / 1.0;
    color = interpolateColor(0xc2410c, 0x4a1d96, t);
    alpha = 0.22 + (0.52 - 0.22) * t;
    lampBrightness = 0.45 + (0.95 - 0.45) * t;
  } else if (solarHour >= 18.5 && solarHour < 20.0) {
    // 18:30 - 20:00 Dusk transitioning into deep night
    const t = (solarHour - 18.5) / 1.5;
    color = interpolateColor(0x4a1d96, 0x070a24, t);
    alpha = 0.52 + (0.68 - 0.52) * t;
    lampBrightness = 1.0;
  } else {
    // 20:00 - 24:00 Deep night
    color = 0x070a24;
    alpha = 0.68;
    lampBrightness = 1.0;
  }

  // Weather overcast adjustments
  if (weather.condition === 'cloudy') {
    alpha = Math.min(0.8, alpha + 0.12);
  } else if (weather.condition === 'drizzle' || weather.condition === 'rain') {
    color = interpolateColor(color, 0x1e293b, 0.6);
    alpha = Math.min(0.85, alpha + 0.2);
    lampBrightness = Math.max(lampBrightness, 0.5);
  } else if (weather.condition === 'heavy_rain' || weather.condition === 'thunderstorm') {
    color = interpolateColor(color, 0x090d16, 0.75);
    alpha = Math.min(0.92, alpha + 0.32);
    lampBrightness = Math.max(lampBrightness, 0.75);
  }

  return { color, alpha, lampBrightness };
}
