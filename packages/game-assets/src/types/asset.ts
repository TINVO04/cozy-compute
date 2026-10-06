export type AssetCategory =
  | 'terrain'
  | 'roads'
  | 'buildings'
  | 'vegetation'
  | 'farming'
  | 'animals'
  | 'props'
  | 'characters'
  | 'effects';

export interface PixelDimension {
  width: number;
  height: number;
}

export interface TileFootprint {
  tileWidth: number;
  tileHeight: number;
  offsetX?: number;
  offsetY?: number;
}

export interface AnchorPoint {
  x: number;
  y: number;
}

export interface CollisionDefinition {
  solid: boolean;
  isTrigger?: boolean;
  shape?: 'rect' | 'polygon';
  /** Bounding box of collision relative to anchor/footprint (in pixels) */
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AnimationDefinition {
  type: 'static' | 'spritesheet' | 'growth_stages';
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
  frameRate?: number;
  stages?: string[];
  directions?: Array<'down' | 'up' | 'left' | 'right'>;
}

export interface AssetDefinition {
  /** Stable unique identifier (e.g. 'tree-mango-01', 'crop-rice-01') */
  id: string;
  /** Primary category */
  category: AssetCategory;
  /** Human-readable display label */
  name: string;
  /** Texture URL/path or Phaser Atlas frame name */
  texture: string;
  /** Visual bounding box in pixels */
  visualBounds: PixelDimension;
  /** Tile footprint on the 32x32 ground matrix */
  footprint: TileFootprint;
  /** Anchor point (0.5, 1.0 for bottom-center structures, 0.5, 0.5 for terrain tiles) */
  anchor: AnchorPoint;
  /** Server-authoritative collision mapping */
  collision: CollisionDefinition;
  /** Offset for 2.5D depth sorting (depth = Y + depthOffset) */
  depthOffset?: number;
  /** Search tags for AI generator (e.g. ['vietnamese', 'rural', 'farm', 'tropical']) */
  tags: string[];
  /** Optional variant IDs of this asset */
  variants?: string[];
  /** Style Guide specification version */
  styleVersion: number;
  /** Optional animation or growth configuration */
  animation?: AnimationDefinition;
  /** Optional extra metadata */
  meta?: Record<string, unknown>;
}

export interface AssetFilterCriteria {
  category?: AssetCategory;
  tags?: string[];
  styleVersion?: number;
  solidOnly?: boolean;
  maxTileWidth?: number;
  maxTileHeight?: number;
}
