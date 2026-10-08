/**
 * Bien Hoa Real-Time Weather & Lighting Engine
 * Coordinates: 10.9574° N, 106.8427° E (Bien Hoa, Dong Nai, Vietnam)
 * Timezone: Asia/Ho_Chi_Minh (UTC+7)
 */

export type WeatherCondition =
  'clear' | 'partly_cloudy' | 'cloudy' | 'drizzle' | 'rain' | 'heavy_rain' | 'thunderstorm';

export type TimeOfDayPhase = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'night';

export interface WeatherTelemetry {
  city: string;
  timeString: string;
  secondsString: string;
  solarHour: number; // 0..24 as float
  timePhase: TimeOfDayPhase;
  phaseLabelVi: string;
  temperatureC: number;
  condition: WeatherCondition;
  conditionLabelVi: string;
  windSpeedKmh: number;
  windDirectionDeg: number;
  precipitationMm: number;
  cloudCoverPct: number;
  isOverridden: boolean;
  timeFrozen?: boolean;
  lightningTriggeredAt?: number;
  windGustTriggeredAt?: number;
}

export interface AdminWeatherOverride {
  enabled: boolean;
  solarHour?: number | null; // 0..24
  condition?: WeatherCondition | null;
  windSpeedKmh?: number | null; // 0..60
  rainIntensity?: number | null; // 0..1
  lightningAt?: number | null;
  windGustAt?: number | null;
}

export const BIEN_HOA_COORDS = {
  lat: 10.9574,
  lon: 106.8427,
  timezone: 'Asia/Ho_Chi_Minh',
  name: 'Biên Hòa, Đồng Nai',
};

const CONDITION_LABELS: Record<WeatherCondition, string> = {
  clear: 'Trời quang / Nắng đẹp',
  partly_cloudy: 'Nắng ráo có mây',
  cloudy: 'Nhiều mây râm mát',
  drizzle: 'Mưa bay lất phất',
  rain: 'Mưa rào',
  heavy_rain: 'Mưa to xối xả',
  thunderstorm: 'Giông bão sấm sét',
};

export const PHASE_LABELS: Record<TimeOfDayPhase, string> = {
  dawn: 'Sáng sớm / Bình minh',
  morning: 'Buổi sáng',
  noon: 'Buổi trưa nhiệt đới',
  afternoon: 'Buổi chiều',
  sunset: 'Hoàng hôn / Chiều tà',
  night: 'Buổi tối / Đêm',
};

/** Parses WMO weather code from Open-Meteo into WeatherCondition */
export function mapWmoCodeToCondition(code: number, rainMm = 0): WeatherCondition {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2) return 'partly_cloudy';
  if (code === 3) return 'cloudy';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 65) {
    return rainMm > 8 || code === 65 ? 'heavy_rain' : 'rain';
  }
  if (code >= 80 && code <= 82) {
    return code === 82 ? 'heavy_rain' : 'rain';
  }
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return rainMm > 2 ? 'rain' : 'clear';
}

/** Computes Bien Hoa local solar hour and time strings */
export function getBienHoaTime(
  overrideHour?: number | null,
  now = new Date(),
): {
  solarHour: number;
  timeString: string;
  secondsString: string;
  phase: TimeOfDayPhase;
} {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: BIEN_HOA_COORDS.timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  let h = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
  let m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  let s = Number(parts.find((p) => p.type === 'second')?.value ?? 0);
  let solarHour = h + m / 60 + s / 3600;

  if (overrideHour !== undefined && overrideHour !== null) {
    solarHour = Math.max(0, Math.min(24, overrideHour));
    h = Math.floor(solarHour) % 24;
    m = Math.floor((solarHour % 1) * 60);
    s = Math.floor((((solarHour % 1) * 60) % 1) * 60);
  }

  const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const secondsString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  let phase: TimeOfDayPhase;
  if (solarHour >= 5.0 && solarHour < 6.5) phase = 'dawn';
  else if (solarHour >= 6.5 && solarHour < 11.5) phase = 'morning';
  else if (solarHour >= 11.5 && solarHour < 14.5) phase = 'noon';
  else if (solarHour >= 14.5 && solarHour < 17.25) phase = 'afternoon';
  else if (solarHour >= 17.25 && solarHour < 18.5) phase = 'sunset';
  else phase = 'night';

  return { solarHour, timeString, secondsString, phase };
}

/**
 * Returns complete combined telemetry considering both live Bien Hoa weather and admin overrides.
 */
export function resolveEffectiveTelemetry(
  override: AdminWeatherOverride | null,
  liveData: {
    temperatureC: number;
    condition: WeatherCondition;
    windSpeedKmh: number;
    windDirectionDeg: number;
    precipitationMm: number;
    cloudCoverPct: number;
  } | null,
  now = new Date(),
): WeatherTelemetry {
  const isOverridden = !!override?.enabled;
  const timeInfo = getBienHoaTime(isOverridden ? override.solarHour : null, now);

  const baseLive = liveData ?? {
    temperatureC: 31.0,
    condition: 'clear' as WeatherCondition,
    windSpeedKmh: 14.0,
    windDirectionDeg: 190,
    precipitationMm: 0,
    cloudCoverPct: 20,
  };

  let condition = baseLive.condition;
  let windSpeedKmh = baseLive.windSpeedKmh;
  let precipitationMm = baseLive.precipitationMm;

  if (isOverridden) {
    if (override.windSpeedKmh !== undefined && override.windSpeedKmh !== null) {
      windSpeedKmh = override.windSpeedKmh;
    }
    if (override.rainIntensity !== undefined && override.rainIntensity !== null) {
      precipitationMm = override.rainIntensity * 25; // 0..25mm
      if (!override.condition) {
        if (override.rainIntensity > 0.6) condition = 'heavy_rain';
        else if (override.rainIntensity > 0.25) condition = 'rain';
        else if (override.rainIntensity > 0.05) condition = 'drizzle';
      }
    }
    if (override.condition) {
      condition = override.condition;
    }
  }

  // Sync rain mm with condition if condition is explicitly set
  if (condition === 'thunderstorm' && precipitationMm < 12) precipitationMm = 18;
  if (condition === 'heavy_rain' && precipitationMm < 10) precipitationMm = 15;
  if (condition === 'rain' && precipitationMm < 3) precipitationMm = 5;
  if (condition === 'drizzle' && precipitationMm === 0) precipitationMm = 1.2;
  if ((condition === 'clear' || condition === 'partly_cloudy' || condition === 'cloudy') && !isOverridden) {
    precipitationMm = 0;
  }

  // Adjust perceived temperature slightly based on rain/time
  let temp = baseLive.temperatureC;
  if (precipitationMm > 5) temp = Math.max(24, temp - 3.5);
  else if (timeInfo.phase === 'noon') temp = Math.max(temp, 33.5);

  return {
    city: BIEN_HOA_COORDS.name,
    timeString: timeInfo.timeString,
    secondsString: timeInfo.secondsString,
    solarHour: timeInfo.solarHour,
    timePhase: timeInfo.phase,
    phaseLabelVi: PHASE_LABELS[timeInfo.phase],
    temperatureC: Math.round(temp * 10) / 10,
    condition,
    conditionLabelVi: CONDITION_LABELS[condition],
    windSpeedKmh,
    windDirectionDeg: baseLive.windDirectionDeg,
    precipitationMm,
    cloudCoverPct:
      condition === 'thunderstorm' || condition === 'heavy_rain'
        ? 95
        : condition === 'cloudy'
          ? 75
          : baseLive.cloudCoverPct,
    isOverridden,
    timeFrozen: isOverridden && override.solarHour != null,
    lightningTriggeredAt: override?.lightningAt ?? undefined,
    windGustTriggeredAt: override?.windGustAt ?? undefined,
  };
}
