export interface MapObject {
  /** Unique object instance identifier (e.g. 'obj_tree_001') */
  id: string;
  /** Reference to registered asset in AssetRegistry (e.g. 'tree-mango-large') */
  assetId: string;
  /** Position X in world pixels */
  x: number;
  /** Position Y in world pixels */
  y: number;
  /** Optional rotation in degrees (0, 90, 180, 270) */
  rotation?: number;
  /** Optional visual scale multiplier (default 1.0) */
  scale?: number;
  /** Optional custom game properties */
  properties?: Record<string, unknown>;
}
