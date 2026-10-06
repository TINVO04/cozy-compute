import type { AssetCategory, AssetDefinition, AssetFilterCriteria } from '../types/asset.js';

export class AssetRegistry {
  private static instance: AssetRegistry | null = null;
  private assets = new Map<string, AssetDefinition>();

  public static getInstance(): AssetRegistry {
    if (!AssetRegistry.instance) {
      AssetRegistry.instance = new AssetRegistry();
    }
    return AssetRegistry.instance;
  }

  /**
   * Resets registry state (useful in test suites)
   */
  public static resetInstance(): void {
    AssetRegistry.instance = null;
  }

  /**
   * Register a new asset definition.
   * Throws if an asset with the same ID already exists.
   */
  public register(asset: AssetDefinition): void {
    if (this.assets.has(asset.id)) {
      throw new Error(`Asset with ID "${asset.id}" is already registered.`);
    }
    this.validate(asset);
    this.assets.set(asset.id, asset);
  }

  /**
   * Batch register multiple assets.
   */
  public registerAll(assets: AssetDefinition[]): void {
    for (const asset of assets) {
      this.register(asset);
    }
  }

  /**
   * Get an asset by ID or return undefined if not found.
   */
  public get(id: string): AssetDefinition | undefined {
    return this.assets.get(id);
  }

  /**
   * Get an asset by ID or throw if not found.
   */
  public require(id: string): AssetDefinition {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new Error(`Required asset "${id}" was not found in AssetRegistry.`);
    }
    return asset;
  }

  /**
   * Check if an asset ID exists.
   */
  public has(id: string): boolean {
    return this.assets.has(id);
  }

  /**
   * List all registered assets.
   */
  public getAll(): AssetDefinition[] {
    return Array.from(this.assets.values());
  }

  /**
   * List assets by category.
   */
  public getByCategory(category: AssetCategory): AssetDefinition[] {
    return this.getAll().filter((a) => a.category === category);
  }

  /**
   * Search assets matching filter criteria (used by AI Map Generator).
   */
  public find(criteria: AssetFilterCriteria): AssetDefinition[] {
    return this.getAll().filter((asset) => {
      if (criteria.category && asset.category !== criteria.category) {
        return false;
      }
      if (criteria.styleVersion !== undefined && asset.styleVersion !== criteria.styleVersion) {
        return false;
      }
      if (criteria.solidOnly && !asset.collision.solid) {
        return false;
      }
      if (criteria.maxTileWidth !== undefined && asset.footprint.tileWidth > criteria.maxTileWidth) {
        return false;
      }
      if (criteria.maxTileHeight !== undefined && asset.footprint.tileHeight > criteria.maxTileHeight) {
        return false;
      }
      if (criteria.tags && criteria.tags.length > 0) {
        const hasAllTags = criteria.tags.every((tag) => asset.tags.includes(tag.toLowerCase()));
        if (!hasAllTags) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Find any asset that matches at least one of the provided tags.
   */
  public findByAnyTag(tags: string[], category?: AssetCategory): AssetDefinition[] {
    const lowerTags = tags.map((t) => t.toLowerCase());
    return this.getAll().filter((asset) => {
      if (category && asset.category !== category) return false;
      return asset.tags.some((tag) => lowerTags.includes(tag.toLowerCase()));
    });
  }

  /**
   * Validate asset against 32px grid and style standards.
   */
  private validate(asset: AssetDefinition): void {
    if (!asset.id || typeof asset.id !== 'string') {
      throw new Error('Asset ID must be a non-empty string.');
    }
    if (!asset.name || typeof asset.name !== 'string') {
      throw new Error(`Asset "${asset.id}" must have a valid display name.`);
    }
    if (asset.visualBounds.width <= 0 || asset.visualBounds.height <= 0) {
      throw new Error(`Asset "${asset.id}" visual bounds must be greater than 0.`);
    }
    if (asset.footprint.tileWidth <= 0 || asset.footprint.tileHeight <= 0) {
      throw new Error(`Asset "${asset.id}" footprint must be at least 1x1 tile.`);
    }
  }
}

export const defaultAssetRegistry = AssetRegistry.getInstance();
