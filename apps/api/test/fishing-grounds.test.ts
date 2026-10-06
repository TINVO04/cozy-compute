import { expect, it, vi } from 'vitest';
import { FISH, zoneCenter, type FishingConditions, type AdminWeatherOverride } from '@cozy/game-data';
import { startFishing } from '../src/services/activities.js';
import type { AppContext, PlayerPosition } from '../src/context.js';

function context(position: PlayerPosition, boat: string | null = null, override?: AdminWeatherOverride) {
  let stored:
    | { pendingFishId: string; oceanZone: string; conditions: FishingConditions; reactionWindowMs: number }
    | undefined;
  const query = vi.fn(async (sql: string, args: unknown[] = []) => {
    if (sql.includes('SELECT config'))
      return { rows: [{ enabled: true, config: { reactionWindowMs: 1400, runTtlMs: 60000 } }] };
    if (sql.includes("key = 'world_weather'")) return { rows: override ? [{ value: override }] : [] };
    if (sql.includes("equipped_slot = 'boat'")) return { rows: boat ? [{ item_id: boat }] : [] };
    if (sql.includes("equipped_slot = 'rod'")) return { rows: [{ item_id: 'rod_abyssal' }] };
    if (sql.includes('INSERT INTO activity_runs')) {
      stored = JSON.parse(args[3] as string);
      return { rows: [{ id: 'run', started_at: args[4], expires_at: args[5] }] };
    }
    return { rows: [] };
  });
  const ctx = {
    config: { NODE_ENV: 'test' },
    now: () => new Date(100000),
    rng: () => 0.999999,
    positionOf: async () => position,
    db: { query, connect: async () => ({ query, release: vi.fn() }) },
  } as unknown as AppContext;
  return { ctx, candidate: () => FISH.find((f) => f.id === stored?.pendingFishId), stored: () => stored };
}

it('a premium rod and highest roll cannot select a rare fish at the town pond', async () => {
  const h = context({ room: 'town', ...zoneCenter('pier'), at: 100000 });
  await startFishing(h.ctx, 'player');
  expect(h.candidate()?.rarity).toBe('common');
  expect(h.candidate()?.habitat).toBe('freshwater');
});

it('persists server conditions at cast time and applies wait and reaction modifiers', async () => {
  const override: AdminWeatherOverride = { enabled: true, solarHour: 6, condition: 'rain' };
  const dawn = context({ room: 'town', ...zoneCenter('pier'), at: 100000 }, null, override);
  const first = await startFishing(dawn.ctx, 'player');
  expect(first.conditions.weather.timePhase).toBe('dawn');
  expect(dawn.stored()?.conditions).toEqual(first.conditions);
  override.condition = 'thunderstorm';
  override.solarHour = 12;
  const storm = await startFishing(dawn.ctx, 'player');
  expect(storm.shadowDelayMs).toBeGreaterThan(first.shadowDelayMs);
  expect(storm.reactionWindowMs).toBeLessThan(first.reactionWindowMs);
  expect(first.conditions.weather.condition).toBe('rain');
  expect(dawn.stored()?.reactionWindowMs).toBe(storm.reactionWindowMs);
});

it('the server selects better fish on the river and top tiers only in deep water', async () => {
  const river = context({ room: 'ocean', x: 600, y: 800, at: 100000 }, 'boat_coracle');
  await startFishing(river.ctx, 'player');
  expect(river.candidate()?.rarity).toBe('epic');
  const deep = context({ room: 'ocean', x: 1100, y: 800, at: 100000 }, 'boat_trawler');
  await startFishing(deep.ctx, 'player');
  expect(deep.candidate()?.rarity).toBe('sovereign');
  expect(deep.stored()?.oceanZone).toBe('abyssal_trench');
});

it.each([null, 'not_a_boat'])('rejects missing or invalid equipped boats: %s', async (boat) => {
  const h = context({ room: 'ocean', x: 600, y: 800, at: 100000 }, boat);
  await expect(startFishing(h.ctx, 'player')).rejects.toMatchObject({ code: 'no_boat_equipped' });
  expect(h.stored()).toBeUndefined();
});

it('rejects underpowered boats in deep water and stale river positions', async () => {
  const deep = context({ room: 'ocean', x: 1100, y: 800, at: 100000 }, 'boat_coracle');
  await expect(startFishing(deep.ctx, 'player')).rejects.toMatchObject({ code: 'abyss_access_denied' });
  const stale = context({ room: 'ocean', x: 600, y: 800, at: 0 }, 'boat_trawler');
  await expect(startFishing(stale.ctx, 'player')).rejects.toMatchObject({ code: 'not_at_location' });
});
