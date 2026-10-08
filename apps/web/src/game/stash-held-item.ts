import type { Appearance } from '@cozy/game-data';

export interface StashResult {
  action: 'unhold_fish' | 'unequip_rod' | 'idle';
  speciesId?: string;
  rodId?: string;
  nextAppearance: Appearance;
}

/**
 * Pure helper to compute what item gets put away into the backpack
 * when shortcut F is pressed.
 * - Priority 1: Stash held fish currently in character's hands.
 * - Priority 2: Stash equipped fishing rod into backpack/wardrobe.
 * - Fallback: Idle if character is not holding anything in hands.
 */
export function computeStashHeldItem(appearance: Appearance): StashResult {
  if (appearance.heldFish) {
    return {
      action: 'unhold_fish',
      speciesId: appearance.heldFish.speciesId,
      nextAppearance: {
        ...appearance,
        heldFish: null,
      },
    };
  }

  if (appearance.rod) {
    return {
      action: 'unequip_rod',
      rodId: appearance.rod,
      nextAppearance: {
        ...appearance,
        rod: null,
      },
    };
  }

  return {
    action: 'idle',
    nextAppearance: appearance,
  };
}
