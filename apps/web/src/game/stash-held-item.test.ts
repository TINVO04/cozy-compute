import { describe, expect, it } from 'vitest';
import { computeStashHeldItem } from './stash-held-item';
import type { Appearance } from '@cozy/game-data';

describe('computeStashHeldItem (shortcut F)', () => {
  it('stashes held fish into backpack with priority when holding a fish', () => {
    const appearance: Appearance = {
      skin: 0,
      hairStyle: 'short',
      hairColor: 0,
      baseTop: 0,
      heldFish: {
        speciesId: 'fish_carp',
        sizeCm: 45,
      },
      rod: 'rod_twig',
    };

    const res = computeStashHeldItem(appearance);

    expect(res.action).toBe('unhold_fish');
    expect(res.speciesId).toBe('fish_carp');
    expect(res.nextAppearance.heldFish).toBeNull();
    // Fishing rod remains equipped when unholding fish
    expect(res.nextAppearance.rod).toBe('rod_twig');
  });

  it('stashes equipped fishing rod into backpack when no fish is held', () => {
    const appearance: Appearance = {
      skin: 0,
      hairStyle: 'long',
      hairColor: 1,
      baseTop: 2,
      heldFish: null,
      rod: 'rod_pro_carbon',
    };

    const res = computeStashHeldItem(appearance);

    expect(res.action).toBe('unequip_rod');
    expect(res.rodId).toBe('rod_pro_carbon');
    expect(res.nextAppearance.rod).toBeNull();
  });

  it('returns idle action when character is not holding anything', () => {
    const appearance: Appearance = {
      skin: 1,
      hairStyle: 'spiky',
      hairColor: 2,
      baseTop: 3,
      heldFish: null,
      rod: null,
    };

    const res = computeStashHeldItem(appearance);

    expect(res.action).toBe('idle');
    expect(res.nextAppearance).toEqual(appearance);
  });
});
