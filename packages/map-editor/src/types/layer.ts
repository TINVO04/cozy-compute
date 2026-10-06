import type { MapObject } from './object.js';

export type LayerType = 'tilelayer' | 'objectgroup';

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  depth: number;
  visible: boolean;
  opacity?: number;
}

export interface MapTileLayer extends BaseLayer {
  type: 'tilelayer';
  /** Array of tile IDs (length = width * height) */
  data: number[];
}

export interface MapObjectLayer extends BaseLayer {
  type: 'objectgroup';
  objects: MapObject[];
}

export type MapLayer = MapTileLayer | MapObjectLayer;
