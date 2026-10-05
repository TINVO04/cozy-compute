import type { MapDefinition } from '../types/map.js';
import { MapValidator, type ValidationResult } from '../validation/map-validator.js';
import type { AssetRegistry } from '@cozy/game-assets';

export interface LoadMapOptions {
  validate?: boolean;
  registry?: AssetRegistry;
}

export interface LoadMapResult {
  map: MapDefinition;
  validation: ValidationResult;
}

export class MapLoader {
  /**
   * Parse and validate a MapDefinition from JSON string or raw object.
   */
  public static load(
    input: string | Record<string, unknown>,
    options: LoadMapOptions = {}
  ): LoadMapResult {
    let parsed: unknown;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch (err) {
        throw new Error(`Failed to parse Map JSON: ${(err as Error).message}`);
      }
    } else {
      parsed = input;
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid Map JSON: root must be an object.');
    }

    const map = parsed as MapDefinition;

    // Basic structure checks
    if (!map.id || typeof map.id !== 'string') {
      throw new Error('Map must have a valid string "id".');
    }
    if (map.tileSize !== 32) {
      throw new Error(`Map tileSize must be 32, received: ${map.tileSize}`);
    }
    if (!Array.isArray(map.layers)) {
      map.layers = [];
    }
    if (!Array.isArray(map.zones)) {
      map.zones = [];
    }
    if (!Array.isArray(map.farmPlots)) {
      map.farmPlots = [];
    }

    const shouldValidate = options.validate ?? true;
    const validation = shouldValidate
      ? MapValidator.validate(map, options.registry)
      : { valid: true, errors: [], warnings: [] };

    return { map, validation };
  }
}
