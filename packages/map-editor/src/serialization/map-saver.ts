import type { MapDefinition } from '../types/map.js';
import { MapValidator } from '../validation/map-validator.js';
import type { AssetRegistry } from '@cozy/game-assets';

export interface SaveMapOptions {
  validate?: boolean;
  pretty?: boolean;
  registry?: AssetRegistry;
}

export class MapSaver {
  /**
   * Serialize a MapDefinition into a JSON string.
   * Throws if validation fails and options.validate is true.
   */
  public static save(map: MapDefinition, options: SaveMapOptions = {}): string {
    const shouldValidate = options.validate ?? true;
    if (shouldValidate) {
      const validation = MapValidator.validate(map, options.registry);
      if (!validation.valid) {
        throw new Error(
          `Cannot save invalid MapDefinition:\n- ${validation.errors.join('\n- ')}`
        );
      }
    }

    // Update metadata timestamp
    map.metadata.updatedAt = new Date().toISOString();

    const indentation = options.pretty ?? true ? 2 : 0;
    return JSON.stringify(map, null, indentation);
  }
}
