import type { MapObject } from '../types/object.js';
import { defaultAssetRegistry, type AssetRegistry } from '@cozy/game-assets';

export interface DecorateAreaOptions {
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  tags: string[];
  density?: 'low' | 'medium' | 'high';
  existingObjects?: MapObject[];
  idPrefix?: string;
}

export class AIDecorator {
  /**
   * Generates a list of non-overlapping decoration objects within a bounding area,
   * querying ONLY assets from the AssetRegistry matching the requested tags.
   */
  public static decorateArea(
    options: DecorateAreaOptions,
    registry: AssetRegistry = defaultAssetRegistry
  ): MapObject[] {
    const { bounds, tags, density = 'medium', existingObjects = [], idPrefix = 'deco' } = options;

    // 1. Query registry for candidate assets matching any of the tags
    const candidateAssets = registry.findByAnyTag(tags);
    if (candidateAssets.length === 0) {
      console.warn(`AIDecorator: No assets found matching tags: ${tags.join(', ')}`);
      return [];
    }

    const areaWidth = bounds.maxX - bounds.minX;
    const areaHeight = bounds.maxY - bounds.minY;
    if (areaWidth <= 32 || areaHeight <= 32) return [];

    // 2. Determine target placement count based on density
    const tileCapacity = Math.floor((areaWidth / 32) * (areaHeight / 32));
    const fillRatio = density === 'high' ? 0.35 : density === 'low' ? 0.1 : 0.2;
    const targetCount = Math.max(1, Math.min(30, Math.floor(tileCapacity * fillRatio)));

    // 3. Grid occupation matrix (in 32px tile coordinates)
    const occupiedTiles = new Set<string>();

    // Mark existing objects
    for (const obj of existingObjects) {
      const asset = registry.get(obj.assetId);
      if (!asset) continue;
      const tw = asset.footprint.tileWidth;
      const th = asset.footprint.tileHeight;
      const startTileX = Math.floor(obj.x / 32) - Math.floor(tw * asset.anchor.x);
      const startTileY = Math.floor(obj.y / 32) - Math.floor(th * asset.anchor.y);
      for (let tx = startTileX; tx < startTileX + tw; tx++) {
        for (let ty = startTileY; ty < startTileY + th; ty++) {
          occupiedTiles.add(`${tx},${ty}`);
        }
      }
    }

    const minTileX = Math.floor(bounds.minX / 32);
    const maxTileX = Math.floor(bounds.maxX / 32);
    const minTileY = Math.floor(bounds.minY / 32);
    const maxTileY = Math.floor(bounds.maxY / 32);

    const generatedObjects: MapObject[] = [];
    let attempts = 0;
    const maxAttempts = targetCount * 20;

    while (generatedObjects.length < targetCount && attempts < maxAttempts) {
      attempts++;
      // Pick random asset from candidate list
      const asset = candidateAssets[Math.floor(Math.random() * candidateAssets.length)]!;
      const footW = asset.footprint.tileWidth;
      const footH = asset.footprint.tileHeight;

      if (maxTileX - minTileX < footW || maxTileY - minTileY < footH) continue;

      const randomTileX = Math.floor(Math.random() * (maxTileX - minTileX - footW + 1)) + minTileX;
      const randomTileY = Math.floor(Math.random() * (maxTileY - minTileY - footH + 1)) + minTileY;

      // Check collision with already occupied tiles
      let canPlace = true;
      for (let tx = randomTileX; tx < randomTileX + footW; tx++) {
        for (let ty = randomTileY; ty < randomTileY + footH; ty++) {
          if (occupiedTiles.has(`${tx},${ty}`)) {
            canPlace = false;
            break;
          }
        }
        if (!canPlace) break;
      }

      if (canPlace) {
        // Mark tiles as occupied
        for (let tx = randomTileX; tx < randomTileX + footW; tx++) {
          for (let ty = randomTileY; ty < randomTileY + footH; ty++) {
            occupiedTiles.add(`${tx},${ty}`);
          }
        }

        const worldX = (randomTileX + footW * asset.anchor.x) * 32;
        const worldY = (randomTileY + footH * asset.anchor.y) * 32;

        generatedObjects.push({
          id: `${idPrefix}_${Date.now()}_${generatedObjects.length + 1}`,
          assetId: asset.id,
          x: Math.round(worldX),
          y: Math.round(worldY),
          rotation: 0,
          scale: 1,
        });
      }
    }

    return generatedObjects;
  }
}
