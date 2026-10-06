import type { MapLayer } from './layer.js';

export interface MapZone {
  id: string;
  label: string;
  prompt: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapFarmPlot {
  id: string;
  tileX: number;
  tileY: number;
  tileWidth: number;
  tileHeight: number;
  soilType: string;
  purchasable: boolean;
  price?: number;
  ownerId?: string | null;
  cropState?: {
    cropId: string;
    stage: number;
    plantedAt: number;
    watered: boolean;
  } | null;
}

export interface MapMetadata {
  name: string;
  region: string;
  biome: string;
  createdAt: string;
  updatedAt?: string;
  author?: string;
  description?: string;
}

export interface MapDefinition {
  /** Unique map identifier (e.g. 'farm-dong-nai-01') */
  id: string;
  /** Schema version */
  version: number;
  /** Standard grid tile size in pixels (strictly 32) */
  tileSize: 32;
  /** Map width in tiles (e.g. 48) */
  width: number;
  /** Map height in tiles (e.g. 32) */
  height: number;
  /** Ordered list of graphical and logical layers */
  layers: MapLayer[];
  /** Gameplay interaction and trigger zones */
  zones: MapZone[];
  /** Agricultural plots for MMO farming gameplay */
  farmPlots: MapFarmPlot[];
  /** Map metadata */
  metadata: MapMetadata;
}

export function getMapPixelWidth(map: MapDefinition): number {
  return map.width * map.tileSize;
}

export function getMapPixelHeight(map: MapDefinition): number {
  return map.height * map.tileSize;
}
