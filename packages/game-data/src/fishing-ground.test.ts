import { describe, expect, it } from 'vitest';
import { fishingGround } from './fishing.js';
import { oceanZoneAt, OCEAN_SPAWN } from './map.js';

describe('fishing grounds', () => {
  it('keeps town catches common and freshwater', () => {
    const { fish } = fishingGround('town_pond');
    expect(fish.length).toBeGreaterThan(0);
    expect(fish.every((f) => f.rarity === 'common' && f.habitat === 'freshwater')).toBe(true);
  });
  it('makes river catches more valuable and reserves top tiers for deep water', () => {
    const pond = fishingGround('town_pond').fish;
    for (const zone of ['angler_dock', 'coral_reef', 'open_sea', 'return_channel'] as const) {
      const { fish } = fishingGround(zone);
      expect(fish.length).toBeGreaterThan(0);
      expect(fish.every((f) => f.habitat === 'freshwater' && ['rare', 'epic'].includes(f.rarity))).toBe(true);
      expect(Math.min(...fish.map((f) => f.coin))).toBeGreaterThan(Math.max(...pond.map((f) => f.coin)));
    }
    expect(fishingGround('abyssal_trench').fish.some((f) => f.rarity === 'sovereign')).toBe(true);
  });
  it('resolves nested deep and return zones before the broad river', () => {
    expect(oceanZoneAt(1100, 800)).toBe('abyssal_trench');
    expect(oceanZoneAt(140, 720)).toBe('return_channel');
    expect(oceanZoneAt(600, 800)).toBe('open_sea');
    expect(oceanZoneAt(760, 360)).toBe('coral_reef');
    expect(oceanZoneAt(OCEAN_SPAWN.x, OCEAN_SPAWN.y)).toBe('return_channel');
  });
});
