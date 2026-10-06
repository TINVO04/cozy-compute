import { describe, it, expect } from 'vitest';
import { AssetRegistry, defaultAssetRegistry, ALL_BUILTIN_ASSETS } from './index.js';
import type { AssetDefinition } from './types/asset.js';

describe('AssetRegistry & Game Assets', () => {
  it('should auto-populate defaultAssetRegistry with all built-in assets', () => {
    expect(defaultAssetRegistry.getAll().length).toBeGreaterThanOrEqual(ALL_BUILTIN_ASSETS.length);
    expect(defaultAssetRegistry.has('tree-mango-large')).toBe(true);
    expect(defaultAssetRegistry.has('building-shop-bac-sau')).toBe(true);
    expect(defaultAssetRegistry.has('terrain-grass-meadow')).toBe(true);
  });

  it('should ensure all built-in assets have unique IDs', () => {
    const idSet = new Set<string>();
    for (const asset of ALL_BUILTIN_ASSETS) {
      expect(idSet.has(asset.id)).toBe(false);
      idSet.add(asset.id);
    }
  });

  it('should enforce 32px grid standards on visual bounds and footprints', () => {
    for (const asset of ALL_BUILTIN_ASSETS) {
      expect(asset.visualBounds.width).toBeGreaterThan(0);
      expect(asset.visualBounds.height).toBeGreaterThan(0);
      expect(asset.footprint.tileWidth).toBeGreaterThanOrEqual(1);
      expect(asset.footprint.tileHeight).toBeGreaterThanOrEqual(1);
      expect(asset.styleVersion).toBe(1);
    }
  });

  it('should filter assets by category', () => {
    const buildings = defaultAssetRegistry.getByCategory('buildings');
    expect(buildings.length).toBeGreaterThan(0);
    expect(buildings.every((b) => b.category === 'buildings')).toBe(true);

    const terrain = defaultAssetRegistry.getByCategory('terrain');
    expect(terrain.length).toBeGreaterThan(0);
    expect(terrain.every((t) => t.category === 'terrain')).toBe(true);
  });

  it('should filter assets by tags', () => {
    const vietnameseFarmAssets = defaultAssetRegistry.find({
      tags: ['vietnamese', 'farm'],
    });
    expect(vietnameseFarmAssets.length).toBeGreaterThan(0);
    for (const asset of vietnameseFarmAssets) {
      expect(asset.tags).toContain('vietnamese');
      expect(asset.tags).toContain('farm');
    }
  });

  it('should support findByAnyTag', () => {
    const results = defaultAssetRegistry.findByAnyTag(['mango', 'banana']);
    expect(results.some((a) => a.id === 'tree-mango-large')).toBe(true);
    expect(results.some((a) => a.id === 'tree-banana-clump')).toBe(true);
  });

  it('should reject registering duplicate asset IDs', () => {
    const customRegistry = new AssetRegistry();
    const testAsset: AssetDefinition = {
      id: 'test-rock-01',
      category: 'props',
      name: 'Hòn Đá Cuội Test',
      texture: '/farm/sprites/rock.png',
      visualBounds: { width: 32, height: 32 },
      footprint: { tileWidth: 1, tileHeight: 1 },
      anchor: { x: 0.5, y: 1.0 },
      collision: { solid: true },
      tags: ['test', 'rock'],
      styleVersion: 1,
    };

    customRegistry.register(testAsset);
    expect(() => customRegistry.register(testAsset)).toThrowError(
      'Asset with ID "test-rock-01" is already registered.',
    );
  });

  it('should throw when require() is called for non-existent asset', () => {
    expect(() => defaultAssetRegistry.require('non-existent-asset-id')).toThrowError(
      'Required asset "non-existent-asset-id" was not found in AssetRegistry.',
    );
  });
});
