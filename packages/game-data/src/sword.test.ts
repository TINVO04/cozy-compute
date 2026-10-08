import { describe, expect, it } from 'vitest';
import { ITEM_SEEDS, SWORDS, normalizeSwordId, sanitizeAppearance, type Appearance } from './index.js';

describe('Sword Equipment System', () => {
  it('defines all canonical swords with complete stats and visual styling', () => {
    const swords = Object.values(SWORDS);
    expect(swords.length).toBeGreaterThanOrEqual(6);

    for (const sword of swords) {
      expect(sword.id).toMatch(/^sword_/);
      expect(sword.name.length).toBeGreaterThan(0);
      expect(sword.description.length).toBeGreaterThan(0);
      expect(sword.damage).toBeGreaterThan(0);
      expect(sword.sprite).toMatch(/^sword:/);
      expect(sword.coinPrice).toBeGreaterThanOrEqual(0);
    }
  });

  it('normalizes sword aliases and fallbacks correctly', () => {
    expect(normalizeSwordId('sword_training')).toBe('sword_training');
    expect(normalizeSwordId('training')).toBe('sword_training');
    expect(normalizeSwordId('sword_iron')).toBe('sword_iron');
    expect(normalizeSwordId('iron')).toBe('sword_iron');
    expect(normalizeSwordId('sword_crystal')).toBe('sword_crystal');
    expect(normalizeSwordId('crystal')).toBe('sword_crystal');
    expect(normalizeSwordId('sword_ancient')).toBe('sword_ancient');
    expect(normalizeSwordId('ancient')).toBe('sword_ancient');
    expect(normalizeSwordId('sword_flame')).toBe('sword_flame');
    expect(normalizeSwordId('flame')).toBe('sword_flame');
    expect(normalizeSwordId('sword_frost')).toBe('sword_frost');
    expect(normalizeSwordId('frost')).toBe('sword_frost');
    expect(normalizeSwordId(null)).toBe('sword_training');
    expect(normalizeSwordId(undefined)).toBe('sword_training');
  });

  it('includes swords in ITEM_SEEDS with correct type and slot', () => {
    const swordSeeds = ITEM_SEEDS.filter((item) => item.type === 'sword');
    expect(swordSeeds.length).toBe(Object.keys(SWORDS).length);

    for (const seed of swordSeeds) {
      expect(seed.slot).toBe('sword');
      expect(seed.id in SWORDS).toBe(true);
    }
  });

  it('sanitizeAppearance handles sword properly', () => {
    const raw: Appearance = {
      skin: 0,
      hairStyle: 'short',
      hairColor: 1,
      baseTop: 2,
      sword: 'sword_iron',
    };
    const sanitized = sanitizeAppearance(raw);
    expect((sanitized as { sword?: string }).sword).toBeUndefined();
  });
});
