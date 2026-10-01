import { describe, expect, it } from 'vitest';
import { FISH } from '@cozy/game-data';
import { FISH_DESIGNS } from './fish-illustration';
import { FISH_3D_ASSETS, FISH_ASSET_ASPECTS } from './fish-assets';
import { fitChibiWithFish, heldFishLayout } from './fish-layout';

describe('fish illustration coverage and preview bounds', () => {
  it('provides a valid aspect ratio for every registered asset and covers all legendary fish', () => {
    const ids = Object.keys(FISH_3D_ASSETS).sort();
    const speciesIds = new Set(FISH.map((fish) => fish.id));
    expect(Object.keys(FISH_ASSET_ASPECTS).sort()).toEqual(ids);
    for (const id of ids) {
      expect(speciesIds.has(id)).toBe(true);
      expect(FISH_3D_ASSETS[id]?.startsWith('/fish/')).toBe(true);
      expect(FISH_3D_ASSETS[id]?.endsWith('.webp')).toBe(true);
      expect(FISH_ASSET_ASPECTS[id]).toBeGreaterThan(0);
      expect(Number.isFinite(FISH_ASSET_ASPECTS[id])).toBe(true);
    }
    for (const fish of FISH.filter((f) => f.rarity === 'legendary'))
      expect(FISH_3D_ASSETS[fish.id], fish.id).toBeDefined();
  });
  it('defines a deliberate design for every collectible', () => {
    expect(Object.keys(FISH_DESIGNS).sort()).toEqual(FISH.map((fish) => fish.id).sort());
    expect(new Set(Object.values(FISH_DESIGNS).map((fish) => fish.shape)).size).toBeGreaterThanOrEqual(12);
  });
  it('fits entire trophy and character even for the largest fish', () => {
    for (const sizeCm of [120, 255, 1000, 5000, 10000]) {
      for (const [width, height] of [
        [240, 280],
        [440, 210],
        [460, 300],
      ]) {
        const layout = heldFishLayout(sizeCm, 26 / 46, true);
        const fitted = fitChibiWithFish(width!, height!, sizeCm, 26 / 46, true, 1.5);
        expect(fitted.cy + layout.top * fitted.scale).toBeGreaterThanOrEqual(11.9);
        expect(fitted.cy + layout.bottom * fitted.scale).toBeLessThanOrEqual(height! - 11.9);
        expect(layout.width * fitted.scale).toBeLessThanOrEqual(width! - 24);
      }
    }
  });
});
