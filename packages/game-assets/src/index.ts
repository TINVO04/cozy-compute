import { TERRAIN_ASSETS } from './assets/terrain.js';
import { ROAD_ASSETS } from './assets/roads.js';
import { VEGETATION_ASSETS } from './assets/vegetation.js';
import { BUILDING_ASSETS } from './assets/buildings.js';
import { FARMING_ASSETS } from './assets/farming.js';
import { ANIMAL_ASSETS } from './assets/animals.js';
import { PROP_ASSETS } from './assets/props.js';
import { CHARACTER_ASSETS } from './assets/characters.js';
import { defaultAssetRegistry } from './registry/asset-registry.js';
import type { AssetRegistry } from './registry/asset-registry.js';
import type { AssetDefinition } from './types/asset.js';

export * from './types/asset.js';
export * from './registry/asset-registry.js';
export * from './assets/terrain.js';
export * from './assets/roads.js';
export * from './assets/vegetation.js';
export * from './assets/buildings.js';
export * from './assets/farming.js';
export * from './assets/animals.js';
export * from './assets/props.js';
export * from './assets/characters.js';

export const ALL_BUILTIN_ASSETS: AssetDefinition[] = [
  ...TERRAIN_ASSETS,
  ...ROAD_ASSETS,
  ...VEGETATION_ASSETS,
  ...BUILDING_ASSETS,
  ...FARMING_ASSETS,
  ...ANIMAL_ASSETS,
  ...PROP_ASSETS,
  ...CHARACTER_ASSETS,
];

/**
 * Bootstrap an AssetRegistry instance with all built-in game assets.
 */
export function populateRegistryWithBuiltins(registry: AssetRegistry = defaultAssetRegistry): void {
  for (const asset of ALL_BUILTIN_ASSETS) {
    if (!registry.has(asset.id)) {
      registry.register(asset);
    }
  }
}

// Auto-populate the singleton default registry
populateRegistryWithBuiltins(defaultAssetRegistry);
