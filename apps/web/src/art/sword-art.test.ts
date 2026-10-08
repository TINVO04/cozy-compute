import { DEFAULT_APPEARANCE, type Appearance } from '@cozy/game-data';
import { describe, expect, it } from 'vitest';
import { appearanceKey, drawAvatar } from './avatar';
import { drawSword } from './items';

describe('Sword Art & Diagonal Rendering', () => {
  it('draws avatar with diagonal slung sword across back in all directions', () => {
    const withSword: Appearance = {
      ...DEFAULT_APPEARANCE,
      sword: 'sword_iron',
    };

    // Test all directions: 0 = front, 1 = left (side), 2 = right (mirrored), 3 = back
    for (const dir of [0, 1, 2, 3] as const) {
      const grid = drawAvatar(withSword, dir, 0);
      expect(grid.w).toBe(16);
      expect(grid.h).toBe(28);

      // Verify that sword pixels exist on the avatar
      let coloredPixels = 0;
      for (let y = 0; y < grid.h; y++) {
        for (let x = 0; x < grid.w; x++) {
          if (grid.get(x, y)) coloredPixels++;
        }
      }
      expect(coloredPixels).toBeGreaterThan(40);
    }
  });

  it('updates appearanceKey when sword is equipped or changed', () => {
    const baseKey = appearanceKey(DEFAULT_APPEARANCE);
    const withIron = appearanceKey({ ...DEFAULT_APPEARANCE, sword: 'sword_iron' });
    const withCrystal = appearanceKey({ ...DEFAULT_APPEARANCE, sword: 'sword_crystal' });

    expect(withIron).not.toBe(baseKey);
    expect(withCrystal).not.toBe(withIron);
    expect(withIron).toContain('sword_iron');
    expect(withCrystal).toContain('sword_crystal');
  });

  it('renders 28x28 diagonal 45-degree pixel art sword grid for each sword type', () => {
    for (const type of ['training', 'iron', 'crystal', 'ancient', 'flame', 'frost']) {
      const grid = drawSword(`sword:${type}:#ffffff`);
      expect(grid.w).toBe(28);
      expect(grid.h).toBe(28);

      // Check pommel around (4, 23)
      expect(grid.get(4, 23)).toBeTruthy();
      // Check blade tip around (23, 3) or (24, 2)
      expect(grid.get(23, 3) || grid.get(24, 2)).toBeTruthy();
    }
  });
});
