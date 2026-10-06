import type { MapDefinition } from '../types/map.js';
import type { MapObjectLayer } from '../types/layer.js';
import { defaultAssetRegistry, type AssetRegistry } from '@cozy/game-assets';

export interface ServerRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ServerZone {
  id: string;
  label: string;
  prompt: string;
  rect: ServerRect;
}

export interface ServerMapData {
  mapId: string;
  tileSize: number;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  blockers: ServerRect[];
  zones: ServerZone[];
  farmPlots: Array<{
    id: string;
    rect: ServerRect;
    soilType: string;
    purchasable: boolean;
    price?: number;
  }>;
}

export class ServerCollisionExporter {
  /**
   * Extracts collision rects (BLOCKERS), interaction zones, and farm plots
   * directly from a MapDefinition for use by the Colyseus server-authoritative room.
   */
  public static exportForServer(
    map: MapDefinition,
    registry: AssetRegistry = defaultAssetRegistry,
  ): ServerMapData {
    const blockers: ServerRect[] = [];

    // Map object layers to collision blockers
    for (const layer of map.layers) {
      if (layer.type === 'objectgroup') {
        const objLayer = layer as MapObjectLayer;
        for (const obj of objLayer.objects) {
          const asset = registry.get(obj.assetId);
          if (!asset) continue;

          if (asset.collision.solid) {
            const footW = asset.footprint.tileWidth * map.tileSize;
            const footH = asset.footprint.tileHeight * map.tileSize;
            const offsetY = (asset.footprint.offsetY ?? 0) * map.tileSize;

            // Compute footprint bounding box in world space
            // Structure anchor is bottom-center (0.5, 1.0)
            const originX = obj.x - footW * asset.anchor.x;
            const originY = obj.y - footH * asset.anchor.y + offsetY;

            blockers.push({
              x: Math.round(originX),
              y: Math.round(originY),
              w: Math.round(footW),
              h: Math.round(footH),
            });
          }
        }
      }
    }

    const zones: ServerZone[] = map.zones.map((z) => ({
      id: z.id,
      label: z.label,
      prompt: z.prompt,
      rect: {
        x: z.x,
        y: z.y,
        w: z.width,
        h: z.height,
      },
    }));

    const farmPlots = map.farmPlots.map((p) => ({
      id: p.id,
      rect: {
        x: p.tileX * map.tileSize,
        y: p.tileY * map.tileSize,
        w: p.tileWidth * map.tileSize,
        h: p.tileHeight * map.tileSize,
      },
      soilType: p.soilType,
      purchasable: p.purchasable,
      price: p.price,
    }));

    return {
      mapId: map.id,
      tileSize: map.tileSize,
      width: map.width,
      height: map.height,
      pixelWidth: map.width * map.tileSize,
      pixelHeight: map.height * map.tileSize,
      blockers,
      zones,
      farmPlots,
    };
  }
}
