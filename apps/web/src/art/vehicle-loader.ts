import type Phaser from 'phaser';
import { vehicleById, VEHICLE_ALIASES } from '@cozy/game-data';
import { vehicleCanvas } from './vehicle';

export interface VehicleAssetMetadata {
  id?: string;
  name?: string;
  brand?: string;
  category?: string;
  price?: number;
  speed?: number;
  description?: string;
  dimensions?: {
    frameWidth?: number;
    frameHeight?: number;
    spritesheetWidth?: number;
    spritesheetHeight?: number;
    previewWidth?: number;
    previewHeight?: number;
    iconWidth?: number;
    iconHeight?: number;
  };
  anchorPoints?: {
    contactY?: number;
    seat?: { x: number; y: number };
    center?: { x: number; y: number };
  };
  lights?: {
    headlight?: { frontOffsetX?: number; frontOffsetY?: number; color?: string };
    taillight?: { rearOffsetX?: number; rearOffsetY?: number; color?: string };
  };
  colors?: Record<string, string>;
}

// In-memory cache for loaded spritesheet images and promises
const spritesheetCache = new Map<string, HTMLImageElement>();
const inFlightSpritesheets = new Map<string, Promise<HTMLImageElement | null>>();
const metadataCache = new Map<string, VehicleAssetMetadata>();

/**
 * Resolves a vehicle ID, alias, or slug to its canonical static asset directory path.
 * Example: 'car_lamborghini' -> 'cars/lamborghini-aventador'
 * Returns null if input is invalid or contains path traversal characters.
 */
export function resolveVehicleAssetPath(id: string | null | undefined): string | null {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (!trimmed) return null;

  // Security: reject path traversal and illegal characters
  if (trimmed.includes('..') || trimmed.includes('\\') || trimmed.startsWith('/')) {
    return null;
  }

  // 1. Check if vehicle definition has assetPath
  const def = vehicleById(trimmed);
  if (def?.assetPath) {
    return def.assetPath.replace(/^\/+/, '');
  }

  // 2. Check VEHICLE_ALIASES mapping
  if (Object.hasOwn(VEHICLE_ALIASES, trimmed)) {
    const aliasTarget = VEHICLE_ALIASES[trimmed];
    if (aliasTarget) {
      const targetDef = vehicleById(aliasTarget);
      if (targetDef?.assetPath) {
        return targetDef.assetPath.replace(/^\/+/, '');
      }
      if (/^[a-z0-9_-]+\/[a-z0-9_-]+$/i.test(aliasTarget)) {
        return aliasTarget;
      }
    }
  }

  // 3. If trimmed is already formatted as category/model slug
  if (/^[a-z0-9_-]+\/[a-z0-9_-]+$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Returns public URL for spritesheet.png.
 */
export function getVehicleSpritesheetUrl(idOrPath: string): string | null {
  const assetPath = resolveVehicleAssetPath(idOrPath);
  return assetPath ? `/vehicles/${assetPath}/spritesheet.png` : null;
}

/**
 * Returns public URL for preview.png.
 */
export function getVehiclePreviewUrl(idOrPath: string): string | null {
  const assetPath = resolveVehicleAssetPath(idOrPath);
  return assetPath ? `/vehicles/${assetPath}/preview.png` : null;
}

/**
 * Returns public URL for icon.png.
 */
export function getVehicleIconUrl(idOrPath: string): string | null {
  const assetPath = resolveVehicleAssetPath(idOrPath);
  return assetPath ? `/vehicles/${assetPath}/icon.png` : null;
}

/**
 * Returns public URL for meta.json.
 */
export function getVehicleMetaUrl(idOrPath: string): string | null {
  const assetPath = resolveVehicleAssetPath(idOrPath);
  return assetPath ? `/vehicles/${assetPath}/meta.json` : null;
}

/**
 * Asynchronously loads a vehicle spritesheet Image.
 * Deduplicates in-flight requests and caches loaded images.
 */
export function loadVehicleSpritesheet(idOrPath: string): Promise<HTMLImageElement | null> {
  const assetPath = resolveVehicleAssetPath(idOrPath);
  if (!assetPath) return Promise.resolve(null);

  const cached = spritesheetCache.get(assetPath);
  if (cached) return Promise.resolve(cached);

  const inFlight = inFlightSpritesheets.get(assetPath);
  if (inFlight) return inFlight;

  const url = getVehicleSpritesheetUrl(assetPath);
  if (!url) return Promise.resolve(null);

  const loadPromise = new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        spritesheetCache.set(assetPath, img);
        inFlightSpritesheets.delete(assetPath);
        resolve(img);
      };
      img.onerror = () => {
        inFlightSpritesheets.delete(assetPath);
        resolve(null);
      };
      img.src = url;
    } catch {
      inFlightSpritesheets.delete(assetPath);
      resolve(null);
    }
  });

  inFlightSpritesheets.set(assetPath, loadPromise);
  return loadPromise;
}

/**
 * Asynchronously loads vehicle meta.json.
 */
export async function loadVehicleMetadata(idOrPath: string): Promise<VehicleAssetMetadata | null> {
  const assetPath = resolveVehicleAssetPath(idOrPath);
  if (!assetPath) return null;

  const cached = metadataCache.get(assetPath);
  if (cached) return cached;

  const url = getVehicleMetaUrl(assetPath);
  if (!url || typeof fetch === 'undefined') return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as VehicleAssetMetadata;
    metadataCache.set(assetPath, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Checks whether a vehicle's spritesheet is already cached in memory.
 */
export function isVehicleSpritesheetLoaded(idOrPath: string): boolean {
  const assetPath = resolveVehicleAssetPath(idOrPath);
  return Boolean(assetPath && spritesheetCache.has(assetPath));
}

/**
 * Returns cached spritesheet Image if available.
 */
export function getCachedVehicleSpritesheet(idOrPath: string): HTMLImageElement | null {
  const assetPath = resolveVehicleAssetPath(idOrPath);
  return assetPath ? (spritesheetCache.get(assetPath) ?? null) : null;
}

/**
 * Explicitly caches an image for testing or preloading.
 */
export function setCachedVehicleSpritesheet(idOrPath: string, img: HTMLImageElement): void {
  const assetPath = resolveVehicleAssetPath(idOrPath);
  if (assetPath) {
    spritesheetCache.set(assetPath, img);
  }
}

/**
 * Clears in-memory vehicle asset cache.
 */
export function clearVehicleAssetCache(): void {
  spritesheetCache.clear();
  inFlightSpritesheets.clear();
  metadataCache.clear();
}

/**
 * Preloads a list of vehicle spritesheets.
 */
export async function preloadVehicleAssets(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => loadVehicleSpritesheet(id)));
}

/**
 * Helper to blit a 48x40 frame from 192x160 spritesheet into canvas context.
 */
function blitFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | CanvasImageSource,
  dir: number,
  frame: number,
): void {
  const safeDir = ((dir % 4) + 4) % 4;
  const safeFrame = ((frame % 4) + 4) % 4;
  const sx = safeFrame * 48;
  const sy = safeDir * 40;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.resetTransform?.();
  if (typeof ctx.clearRect === 'function') {
    ctx.clearRect(0, 0, 48, 40);
  }
  ctx.drawImage(img, sx, sy, 48, 40, 0, 0, 48, 40);
}

/**
 * Ensures a vehicle texture exists in the Phaser scene texture manager.
 *
 * Seamless zero-downtime lifecycle:
 * 1. If key already exists in scene.textures, returns key immediately.
 * 2. If not, synchronously registers a CanvasTexture with vehicleCanvas fallback.
 * 3. Kicks off async load of static PNG spritesheet.
 * 4. When PNG finishes loading, in-place overwrites the CanvasTexture context
 *    with frame (dir, frame) from the 192x160 spritesheet and calls texture.refresh().
 */
export function ensureVehicleTexture(scene: Phaser.Scene, id: string, dir: number, frame = 0): string {
  const key = `vehicle:${id}:${dir}:${frame}`;
  if (scene.textures.exists(key)) return key;

  // Fallback canvas generated synchronously (zero downtime, no white screen)
  const canvas = vehicleCanvas(id, dir, frame);

  // Check if spritesheet is already cached in memory
  const assetPath = resolveVehicleAssetPath(id);
  const cachedImg = assetPath ? getCachedVehicleSpritesheet(assetPath) : null;

  if (cachedImg) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      blitFrame(ctx, cachedImg, dir, frame);
    }
    scene.textures.addCanvas(key, canvas);
    return key;
  }

  // Register canvas texture with fallback pixels
  scene.textures.addCanvas(key, canvas);

  // If asset path exists, initiate async background upgrade
  if (assetPath) {
    loadVehicleSpritesheet(assetPath)
      .then((img) => {
        if (!img) return;
        if (!scene.textures?.exists(key)) return;

        const currentTex = scene.textures.get(key) as unknown as
          | {
              getContext?: () => CanvasRenderingContext2D;
              refresh?: () => void;
            }
          | null
          | undefined;
        const ctx: CanvasRenderingContext2D | null =
          typeof currentTex?.getContext === 'function' ? currentTex.getContext() : canvas.getContext('2d');

        if (ctx) {
          blitFrame(ctx, img, dir, frame);
        }

        if (typeof currentTex?.refresh === 'function') {
          currentTex.refresh();
        }
      })
      .catch(() => {
        // Retain procedural fallback on error
      });
  }

  return key;
}
