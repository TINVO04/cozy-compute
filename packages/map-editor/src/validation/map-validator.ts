import type { MapDefinition } from '../types/map.js';
import type { MapObjectLayer, MapTileLayer } from '../types/layer.js';
import { defaultAssetRegistry, type AssetRegistry } from '@cozy/game-assets';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class MapValidator {
  /**
   * Validate MapDefinition against system constraints and AssetRegistry.
   */
  public static validate(
    map: MapDefinition,
    registry: AssetRegistry = defaultAssetRegistry
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Grid Tile Size Check
    if (map.tileSize !== 32) {
      errors.push(`Invalid tileSize: ${map.tileSize}. Must be strictly 32.`);
    }

    // 2. Map Dimensions
    if (map.width <= 0 || map.height <= 0) {
      errors.push(`Invalid map dimensions: ${map.width}x${map.height} tiles.`);
    }

    const mapPixelWidth = map.width * map.tileSize;
    const mapPixelHeight = map.height * map.tileSize;

    // 3. Object ID uniqueness & Asset existence
    const objectIds = new Set<string>();

    for (const layer of map.layers) {
      if (layer.type === 'tilelayer') {
        const tileLayer = layer as MapTileLayer;
        const expectedLength = map.width * map.height;
        if (tileLayer.data.length !== expectedLength) {
          errors.push(
            `TileLayer "${layer.name}" has ${tileLayer.data.length} tiles, expected ${expectedLength} (${map.width}x${map.height}).`
          );
        }
      } else if (layer.type === 'objectgroup') {
        const objectLayer = layer as MapObjectLayer;
        for (const obj of objectLayer.objects) {
          if (!obj.id) {
            errors.push(`Object in layer "${layer.name}" has no ID.`);
            continue;
          }
          if (objectIds.has(obj.id)) {
            errors.push(`Duplicate object ID found: "${obj.id}".`);
          }
          objectIds.add(obj.id);

          // Check if asset exists in Registry
          const asset = registry.get(obj.assetId);
          if (!asset) {
            errors.push(
              `Object "${obj.id}" references unregistered assetId: "${obj.assetId}".`
            );
          } else {
            // Position bounds check
            if (obj.x < 0 || obj.x > mapPixelWidth) {
              warnings.push(
                `Object "${obj.id}" X position (${obj.x}px) is outside map width (${mapPixelWidth}px).`
              );
            }
            if (obj.y < 0 || obj.y > mapPixelHeight) {
              warnings.push(
                `Object "${obj.id}" Y position (${obj.y}px) is outside map height (${mapPixelHeight}px).`
              );
            }
          }
        }
      }
    }

    // 4. Farm plots validation
    for (const plot of map.farmPlots) {
      if (
        plot.tileX < 0 ||
        plot.tileX + plot.tileWidth > map.width ||
        plot.tileY < 0 ||
        plot.tileY + plot.tileHeight > map.height
      ) {
        errors.push(
          `FarmPlot "${plot.id}" bounds (${plot.tileX}, ${plot.tileY}, ${plot.tileWidth}, ${plot.tileHeight}) exceed map bounds.`
        );
      }
    }

    // 5. Zones validation
    for (const zone of map.zones) {
      if (zone.width <= 0 || zone.height <= 0) {
        errors.push(`Zone "${zone.id}" has invalid dimensions: ${zone.width}x${zone.height}.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
