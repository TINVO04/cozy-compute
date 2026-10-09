import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  clearVehicleAssetCache,
  ensureVehicleTexture,
  getCachedVehicleSpritesheet,
  getVehicleIconUrl,
  getVehicleMetaUrl,
  getVehiclePreviewUrl,
  getVehicleSpritesheetUrl,
  isVehicleSpritesheetLoaded,
  loadVehicleMetadata,
  loadVehicleSpritesheet,
  preloadVehicleAssets,
  resolveVehicleAssetPath,
  setCachedVehicleSpritesheet,
} from './vehicle-loader';
import type Phaser from 'phaser';

describe('Vehicle Loader — Adversarial Memory, Cache & Invariant Tests (Tier 5)', () => {
  let mockCreatedImages: Array<{
    src: string;
    crossOrigin: string;
    onload: (() => void) | null;
    onerror: (() => void) | null;
  }>;

  beforeEach(() => {
    clearVehicleAssetCache();
    mockCreatedImages = [];

    // Mock HTMLImageElement / Image constructor
    class MockImage {
      src = '';
      crossOrigin = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 192;
      height = 160;

      constructor() {
        mockCreatedImages.push(this);
      }
    }

    vi.stubGlobal('Image', MockImage);

    // Mock canvas
    const mockCtx = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: '',
      fillRect: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
    };
    const mockCanvas = {
      width: 48,
      height: 40,
      getContext: vi.fn(() => mockCtx),
    };
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => (tag === 'canvas' ? mockCanvas : {})),
    });
  });

  afterEach(() => {
    clearVehicleAssetCache();
    vi.unstubAllGlobals();
  });

  describe('Path Resolution & Security Sanitization', () => {
    it('resolves canonical IDs, aliases, and directory slugs to canonical paths', () => {
      expect(resolveVehicleAssetPath('car_lamborghini')).toBe('cars/lamborghini-aventador');
      expect(resolveVehicleAssetPath('car_sunset')).toBe('cars/lamborghini-aventador');
      expect(resolveVehicleAssetPath('cars/lamborghini-aventador')).toBe('cars/lamborghini-aventador');
      expect(resolveVehicleAssetPath('lamborghini-aventador')).toBe('cars/lamborghini-aventador');

      expect(resolveVehicleAssetPath('bicycle_sky')).toBe('bicycles/trek-marlin-7');
      expect(resolveVehicleAssetPath('bicycles/trek-marlin-7')).toBe('bicycles/trek-marlin-7');
      expect(resolveVehicleAssetPath('trek-marlin-7')).toBe('bicycles/trek-marlin-7');

      expect(resolveVehicleAssetPath('motorcycle_ducati')).toBe('motorcycles/ducati-panigale-v4');
      expect(resolveVehicleAssetPath('ducati-panigale-v4')).toBe('motorcycles/ducati-panigale-v4');
    });

    it('rejects path traversal attacks and illegal URL patterns', () => {
      const malicious = [
        '../evil',
        '../../etc/passwd',
        '..\\windows\\system32',
        '/absolute/path',
        'cars/../../secret',
        '',
        '   ',
        null,
        undefined,
      ];

      for (const m of malicious) {
        expect(resolveVehicleAssetPath(m)).toBeNull();
        expect(getVehicleSpritesheetUrl(m as string)).toBeNull();
        expect(getVehiclePreviewUrl(m as string)).toBeNull();
        expect(getVehicleIconUrl(m as string)).toBeNull();
        expect(getVehicleMetaUrl(m as string)).toBeNull();
      }
    });

    it('constructs correct public asset URLs', () => {
      expect(getVehicleSpritesheetUrl('car_mint')).toBe('/vehicles/cars/mercedes-benz-g63/spritesheet.png');
      expect(getVehiclePreviewUrl('car_mint')).toBe('/vehicles/cars/mercedes-benz-g63/preview.png');
      expect(getVehicleIconUrl('car_mint')).toBe('/vehicles/cars/mercedes-benz-g63/icon.png');
      expect(getVehicleMetaUrl('car_mint')).toBe('/vehicles/cars/mercedes-benz-g63/meta.json');
    });
  });

  describe('Cache Deduplication & In-Flight Coalescing', () => {
    it('coalesces 50 concurrent requests into a single in-flight network request and Promise', async () => {
      const promises = Array.from({ length: 50 }, () => loadVehicleSpritesheet('car_lamborghini'));

      // All 50 calls should share the exact same in-flight Promise instance
      expect(promises.every((p) => p === promises[0])).toBe(true);
      // Exactly 1 underlying Image instance was constructed
      expect(mockCreatedImages.length).toBe(1);

      const created = mockCreatedImages[0]!;
      expect(created.src).toBe('/vehicles/cars/lamborghini-aventador/spritesheet.png');
      expect(created.crossOrigin).toBe('anonymous');

      // Trigger image onload
      created.onload?.();
      const results = await Promise.all(promises);

      // All 50 resolved to the same loaded image
      expect(results.length).toBe(50);
      expect(results.every((img) => img === created)).toBe(true);
      expect(isVehicleSpritesheetLoaded('car_lamborghini')).toBe(true);
      expect(getCachedVehicleSpritesheet('car_lamborghini')).toBe(created);
    });

    it('shares cached image across canonical IDs, legacy aliases, and path slugs without re-requesting', async () => {
      const loadPromise = loadVehicleSpritesheet('car_sunset'); // Legacy alias
      expect(mockCreatedImages.length).toBe(1);
      mockCreatedImages[0]?.onload?.();
      await loadPromise;

      // Accessing via canonical ID, category path, or directory slug now returns cached image synchronously
      const viaCanonical = await loadVehicleSpritesheet('car_lamborghini');
      const viaPath = await loadVehicleSpritesheet('cars/lamborghini-aventador');
      const viaSlug = await loadVehicleSpritesheet('lamborghini-aventador');

      expect(viaCanonical).toBe(mockCreatedImages[0]);
      expect(viaPath).toBe(mockCreatedImages[0]);
      expect(viaSlug).toBe(mockCreatedImages[0]);
      // Zero additional Image instances created
      expect(mockCreatedImages.length).toBe(1);
    });

    it('cleans up in-flight promise on image error and allows subsequent retries', async () => {
      const failingPromise = loadVehicleSpritesheet('motorcycle_ducati');
      expect(mockCreatedImages.length).toBe(1);

      // Trigger onerror
      mockCreatedImages[0]?.onerror?.();
      const result = await failingPromise;
      expect(result).toBeNull();
      expect(isVehicleSpritesheetLoaded('motorcycle_ducati')).toBe(false);

      // A retry should create a fresh in-flight request, not permanently fail
      const retryPromise = loadVehicleSpritesheet('motorcycle_ducati');
      expect(mockCreatedImages.length).toBe(2);
      mockCreatedImages[1]?.onload?.();
      const retryResult = await retryPromise;
      expect(retryResult).toBe(mockCreatedImages[1]);
      expect(isVehicleSpritesheetLoaded('motorcycle_ducati')).toBe(true);
    });

    it('preloads multiple vehicles in parallel', async () => {
      const ids = ['bicycle_sky', 'motorcycle_coral', 'car_porsche'];
      const preloadPromise = preloadVehicleAssets(ids);

      expect(mockCreatedImages.length).toBe(3);
      for (const img of mockCreatedImages) {
        img.onload?.();
      }
      await preloadPromise;

      for (const id of ids) {
        expect(isVehicleSpritesheetLoaded(id)).toBe(true);
      }
    });
  });

  describe('Garbage Collection & Cache Reset', () => {
    it('empties all caches and frees references on clearVehicleAssetCache', async () => {
      const loadPromise = loadVehicleSpritesheet('car_rolls_royce_phantom');
      mockCreatedImages[0]?.onload?.();
      await loadPromise;

      expect(isVehicleSpritesheetLoaded('car_rolls_royce_phantom')).toBe(true);
      expect(getCachedVehicleSpritesheet('car_rolls_royce_phantom')).not.toBeNull();

      // Clear cache
      clearVehicleAssetCache();

      expect(isVehicleSpritesheetLoaded('car_rolls_royce_phantom')).toBe(false);
      expect(getCachedVehicleSpritesheet('car_rolls_royce_phantom')).toBeNull();

      // Next load must create a fresh Image instance
      const nextPromise = loadVehicleSpritesheet('car_rolls_royce_phantom');
      expect(mockCreatedImages.length).toBe(2);
      mockCreatedImages[1]?.onload?.();
      await nextPromise;
      expect(isVehicleSpritesheetLoaded('car_rolls_royce_phantom')).toBe(true);
    });

    it('allows explicit test image injection via setCachedVehicleSpritesheet', () => {
      const dummyImg = { width: 192, height: 160 } as unknown as HTMLImageElement;
      setCachedVehicleSpritesheet('car_ferrari_f40', dummyImg);

      expect(isVehicleSpritesheetLoaded('car_ferrari_f40')).toBe(true);
      expect(getCachedVehicleSpritesheet('car_ferrari_f40')).toBe(dummyImg);
    });
  });

  describe('Metadata Loading & Failure Resilience', () => {
    it('loads and caches vehicle metadata from JSON endpoint', async () => {
      const fakeMeta = {
        name: 'Tesla Model S Plaid',
        brand: 'Tesla',
        dimensions: { frameWidth: 48, frameHeight: 40 },
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(fakeMeta),
        }),
      );

      const meta = await loadVehicleMetadata('car_tesla_model_s');
      expect(meta).toEqual(fakeMeta);

      // Second call uses cached metadata without re-fetching
      const cached = await loadVehicleMetadata('car_tesla_model_s');
      expect(cached).toBe(meta);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('returns null and does not throw on 404 or network fetch failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
        }),
      );

      const meta = await loadVehicleMetadata('nonexistent_vehicle');
      expect(meta).toBeNull();

      // Network exception
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));
      const errMeta = await loadVehicleMetadata('car_ford_mustang');
      expect(errMeta).toBeNull();
    });
  });

  describe('ensureVehicleTexture — In-Place Lifecycle & Destruction Resilience', () => {
    it('provides synchronous procedural fallback and refreshes in-place upon image load', async () => {
      const textures = new Map<
        string,
        { key: string; refresh: ReturnType<typeof vi.fn>; getContext: ReturnType<typeof vi.fn> }
      >();
      const mockCtx = {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
      };

      const mockScene = {
        textures: {
          exists: vi.fn((k: string) => textures.has(k)),
          addCanvas: vi.fn((k: string, _canvas: HTMLCanvasElement) => {
            const texObj = {
              key: k,
              refresh: vi.fn(),
              getContext: vi.fn(() => mockCtx as unknown as CanvasRenderingContext2D),
            };
            textures.set(k, texObj);
            return texObj;
          }),
          get: vi.fn((k: string) => textures.get(k)),
        },
      } as unknown as Phaser.Scene;

      // 1. Initial call returns synchronous key immediately with fallback canvas
      const key = ensureVehicleTexture(mockScene, 'car_toyota_supra_mk4', 2, 0);
      expect(key).toBe('vehicle:car_toyota_supra_mk4:2:0');
      expect(mockScene.textures.addCanvas).toHaveBeenCalledWith(key, expect.anything());

      // Exactly 1 background load started
      expect(mockCreatedImages.length).toBe(1);
      const img = mockCreatedImages[0]!;

      // 2. Subsequent call while loading immediately returns the existing key without re-adding canvas
      const sameKey = ensureVehicleTexture(mockScene, 'car_toyota_supra_mk4', 2, 0);
      expect(sameKey).toBe(key);
      expect(mockScene.textures.addCanvas).toHaveBeenCalledTimes(1);

      // 3. Asset finishes loading asynchronously
      img.onload?.();
      // Allow promise microtasks to run
      await Promise.resolve();

      // Verified in-place blitFrame and texture.refresh() were called
      const registeredTex = textures.get(key)!;
      expect(registeredTex.refresh).toHaveBeenCalled();
      expect(mockCtx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
      expect(mockCtx.resetTransform).toHaveBeenCalled();
      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        img,
        0, // frame 0 -> sx: 0
        80, // dir 2 -> sy: 80
        48,
        40,
        0,
        0,
        48,
        40,
      );
    });

    it('resets transform matrix before clearRect and drawImage when blitting dir = 1 (left)', async () => {
      const textures = new Map<
        string,
        { key: string; refresh: ReturnType<typeof vi.fn>; getContext: ReturnType<typeof vi.fn> }
      >();
      const callOrder: string[] = [];
      const mockCtx = {
        setTransform: vi.fn((..._args: unknown[]) => {
          callOrder.push('setTransform');
        }),
        resetTransform: vi.fn(() => {
          callOrder.push('resetTransform');
        }),
        clearRect: vi.fn((..._args: unknown[]) => {
          callOrder.push('clearRect');
        }),
        drawImage: vi.fn((..._args: unknown[]) => {
          callOrder.push('drawImage');
        }),
        save: vi.fn(),
        restore: vi.fn(),
      };

      const mockScene = {
        textures: {
          exists: vi.fn((k: string) => textures.has(k)),
          addCanvas: vi.fn((k: string, _canvas: HTMLCanvasElement) => {
            const texObj = {
              key: k,
              refresh: vi.fn(),
              getContext: vi.fn(() => mockCtx as unknown as CanvasRenderingContext2D),
            };
            textures.set(k, texObj);
            return texObj;
          }),
          get: vi.fn((k: string) => textures.get(k)),
        },
      } as unknown as Phaser.Scene;

      const key = ensureVehicleTexture(mockScene, 'cars/mercedes-benz-g63', 1, 0);
      expect(key).toBe('vehicle:cars/mercedes-benz-g63:1:0');
      const img = mockCreatedImages[0]!;

      img.onload?.();
      await Promise.resolve();

      expect(mockCtx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
      expect(mockCtx.resetTransform).toHaveBeenCalled();
      expect(callOrder.indexOf('setTransform')).toBeLessThan(callOrder.indexOf('clearRect'));
      expect(callOrder.indexOf('setTransform')).toBeLessThan(callOrder.indexOf('drawImage'));
      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        img,
        0, // frame 0 -> sx: 0
        40, // dir 1 (left) -> sy: 40
        48,
        40,
        0,
        0,
        48,
        40,
      );
    });

    it('does not crash or resurrect texture if scene or texture was destroyed before load finished', async () => {
      let textureExists = false;
      const registeredTex = {
        refresh: vi.fn(),
        getContext: vi.fn(),
      };

      const mockScene = {
        textures: {
          exists: vi.fn(() => textureExists),
          addCanvas: vi.fn(() => {
            textureExists = true;
          }),
          get: vi.fn(() => (textureExists ? registeredTex : null)),
        },
      } as unknown as Phaser.Scene;

      ensureVehicleTexture(mockScene, 'motorcycle_kawasaki_ninja_h2', 1, 1);
      expect(mockCreatedImages.length).toBe(1);
      const img = mockCreatedImages[0]!;

      // Simulate scene destruction before network returns
      textureExists = false;

      // Finish image load
      img.onload?.();
      await Promise.resolve();

      // Refresh was NOT called because texture no longer exists in scene
      expect(registeredTex.refresh).not.toHaveBeenCalled();
    });
  });
});
