import { describe, expect, it } from 'vitest';
import { fishingConditions, fishForConditions } from './fishing-conditions.js';
import { fishingGround } from './fishing.js';
import { resolveEffectiveTelemetry } from './weather.js';

const conditions = (hour: number, condition: 'clear' | 'rain' | 'thunderstorm' = 'clear', wind = 14) =>
  fishingConditions(
    resolveEffectiveTelemetry({ enabled: true, solarHour: hour, condition, windSpeedKmh: wind }, null),
  );

describe('weather and time fishing rules', () => {
  it('dawn rain attracts fish sooner and favors valuable river fish compared with midday', () => {
    const dawn = conditions(6, 'rain');
    const noon = conditions(12);
    expect(dawn.waitMultiplier).toBeLessThan(noon.waitMultiplier);
    const river = fishingGround('open_sea').fish;
    const ratio = (c: ReturnType<typeof conditions>) => {
      const fish = fishForConditions(river, c);
      return (
        fish.filter((f) => f.rarity === 'epic').reduce((sum, f) => sum + f.weight, 0) /
        fish.reduce((sum, f) => sum + f.weight, 0)
      );
    };
    expect(ratio(dawn)).toBeGreaterThan(ratio(noon));
  });
  it('night changes species weights without moving fish between grounds or changing rewards', () => {
    const table = fishingGround('open_sea').fish;
    const day = fishForConditions(table, conditions(9));
    const night = fishForConditions(table, conditions(22));
    expect(night.find((f) => f.id === 'catfish_giant')!.weight).toBeGreaterThan(
      day.find((f) => f.id === 'catfish_giant')!.weight,
    );
    for (let hour = 0; hour < 24; hour++) {
      const pond = fishingGround('town_pond').fish;
      const adjusted = fishForConditions(pond, conditions(hour, 'rain'));
      expect(adjusted.map((f) => f.id)).toEqual(pond.map((f) => f.id));
      expect(adjusted.every((f, i) => f.rarity === 'common' && f.coin === pond[i]!.coin)).toBe(true);
    }
  });
  it('storms and wind shorten reaction time while remaining playable', () => {
    const storm = conditions(12, 'thunderstorm', 60);
    expect(storm.waitMultiplier).toBeGreaterThan(1);
    expect(storm.waitMultiplier).toBeLessThanOrEqual(1.6);
    expect(storm.reactionMultiplier).toBeGreaterThanOrEqual(0.75);
    expect(storm.reactionMultiplier).toBeLessThan(1);
  });
  it('uses server time in Vietnam and handles day phase boundaries', () => {
    expect(resolveEffectiveTelemetry(null, null, new Date('2026-10-05T23:00:00Z')).timePhase).toBe('dawn');
    expect(resolveEffectiveTelemetry(null, null, new Date('2026-10-05T15:00:00Z')).timePhase).toBe('night');
    expect(conditions(6.5).weather.timePhase).toBe('morning');
    expect(conditions(18.5).weather.timePhase).toBe('night');
  });
});
