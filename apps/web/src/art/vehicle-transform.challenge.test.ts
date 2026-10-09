import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CANONICAL_VEHICLE_IDS } from '@cozy/game-data';
import { vehicleCanvas } from './vehicle';
import { clearVehicleAssetCache, ensureVehicleTexture, setCachedVehicleSpritesheet } from './vehicle-loader';
import type Phaser from 'phaser';

/**
 * Mathematical 2D Affine Transform Matrix Oracle.
 * Tracks [a, b, c, d, e, f] where:
 * [ x' ]   [ a  c  e ] [ x ]
 * [ y' ] = [ b  d  f ] [ y ]
 * [ 1  ]   [ 0  0  1 ] [ 1 ]
 */
class TransformMatrixOracle {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  private stack: Array<[number, number, number, number, number, number]> = [];
  public callLog: string[] = [];
  public saveCount = 0;
  public restoreCount = 0;
  public setTransformCount = 0;
  public resetTransformCount = 0;

  get stackDepth(): number {
    return this.stack.length;
  }

  isIdentity(): boolean {
    const eps = 1e-6;
    return (
      Math.abs(this.a - 1) < eps &&
      Math.abs(this.b - 0) < eps &&
      Math.abs(this.c - 0) < eps &&
      Math.abs(this.d - 1) < eps &&
      Math.abs(this.e - 0) < eps &&
      Math.abs(this.f - 0) < eps
    );
  }

  getMatrix(): [number, number, number, number, number, number] {
    const norm = (v: number) => (Object.is(v, -0) ? 0 : v);
    return [norm(this.a), norm(this.b), norm(this.c), norm(this.d), norm(this.e), norm(this.f)];
  }

  save(): void {
    this.saveCount++;
    this.callLog.push('save');
    this.stack.push([this.a, this.b, this.c, this.d, this.e, this.f]);
  }

  restore(): void {
    this.restoreCount++;
    this.callLog.push('restore');
    const popped = this.stack.pop();
    if (popped) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = popped;
    }
  }

  translate(tx: number, ty: number): void {
    this.callLog.push(`translate(${tx},${ty})`);
    this.e += this.a * tx + this.c * ty;
    this.f += this.b * tx + this.d * ty;
  }

  scale(sx: number, sy: number): void {
    this.callLog.push(`scale(${sx},${sy})`);
    this.a *= sx;
    this.b *= sx;
    this.c *= sy;
    this.d *= sy;
  }

  rotate(angleRad: number): void {
    this.callLog.push(`rotate(${angleRad})`);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const newA = this.a * cos + this.c * sin;
    const newB = this.b * cos + this.d * sin;
    const newC = -this.a * sin + this.c * cos;
    const newD = -this.b * sin + this.d * cos;
    this.a = newA;
    this.b = newB;
    this.c = newC;
    this.d = newD;
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.callLog.push(`transform(${a},${b},${c},${d},${e},${f})`);
    const newA = this.a * a + this.c * b;
    const newB = this.b * a + this.d * b;
    const newC = this.a * c + this.c * d;
    const newD = this.b * c + this.d * d;
    const newE = this.a * e + this.c * f + this.e;
    const newF = this.b * e + this.d * f + this.f;
    this.a = newA;
    this.b = newB;
    this.c = newC;
    this.d = newD;
    this.e = newE;
    this.f = newF;
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.setTransformCount++;
    this.callLog.push(`setTransform(${a},${b},${c},${d},${e},${f})`);
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }

  resetTransform(): void {
    this.resetTransformCount++;
    this.callLog.push('resetTransform');
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
  }
}

/**
 * Builds a mock Canvas 2D context wired to a TransformMatrixOracle.
 */
function createMockCanvasContext(oracle: TransformMatrixOracle) {
  return {
    save: vi.fn(() => oracle.save()),
    restore: vi.fn(() => oracle.restore()),
    translate: vi.fn((x: number, y: number) => oracle.translate(x, y)),
    scale: vi.fn((x: number, y: number) => oracle.scale(x, y)),
    rotate: vi.fn((angle: number) => oracle.rotate(angle)),
    transform: vi.fn((a: number, b: number, c: number, d: number, e: number, f: number) =>
      oracle.transform(a, b, c, d, e, f),
    ),
    setTransform: vi.fn((a: number, b: number, c: number, d: number, e: number, f: number) =>
      oracle.setTransform(a, b, c, d, e, f),
    ),
    resetTransform: vi.fn(() => oracle.resetTransform()),
    clearRect: vi.fn((...args: unknown[]) => oracle.callLog.push(`clearRect(${args.join(',')})`)),
    drawImage: vi.fn((...args: unknown[]) => oracle.callLog.push(`drawImage(${args.slice(1).join(',')})`)),
    fillRect: vi.fn(),
    fillStyle: '',
  };
}

describe('Adversarial Stress Test: Transform Matrix Isolation & BlitFrame Hardening (M1 Challenger)', () => {
  const ALL_18_MODELS = [...CANONICAL_VEHICLE_IDS, 'car_sunset', 'car_mercedes'];

  beforeEach(() => {
    clearVehicleAssetCache();
  });

  afterEach(() => {
    clearVehicleAssetCache();
    vi.unstubAllGlobals();
  });

  describe('1. Empirical Stress Test: vehicleCanvas(id, 1, frame) Across All 18 Models', () => {
    it('verifies exact inventory of 18 vehicle models under test', () => {
      expect(ALL_18_MODELS.length).toBe(18);
      const unique = new Set(ALL_18_MODELS);
      expect(unique.size).toBe(18);
    });

    it('empirically verifies equal save/restore counts and identity matrix across all 18 models x 4 frames', () => {
      for (const modelId of ALL_18_MODELS) {
        for (let frame = 0; frame < 4; frame++) {
          const oracle = new TransformMatrixOracle();
          const mockCtx = createMockCanvasContext(oracle);
          const mockCanvas = {
            width: 48,
            height: 40,
            getContext: vi.fn(() => mockCtx),
          };

          vi.stubGlobal('document', {
            createElement: vi.fn((tag: string) => (tag === 'canvas' ? mockCanvas : {})),
          });

          vehicleCanvas(modelId, 1, frame);

          // 1. Equal save and restore counts
          expect(oracle.saveCount).toBe(0);
          expect(oracle.restoreCount).toBe(0);
          expect(oracle.saveCount).toBe(oracle.restoreCount);

          // 2. Stack depth returned to 0
          expect(oracle.stackDepth).toBe(0);

          // 3. Matrix strictly restored to identity
          expect(oracle.isIdentity()).toBe(true);
          expect(oracle.getMatrix()).toEqual([1, 0, 0, 1, 0, 0]);

          // Authored left pixels must never receive another runtime mirror.
          expect(oracle.callLog).not.toContain('translate(48,0)');
          expect(oracle.callLog).not.toContain('scale(-1,1)');
          expect(mockCtx.fillRect).toHaveBeenCalled();
        }
      }
    });

    it('stress-tests repeated calls (50 iterations per model) on a reused canvas context with zero matrix drift', () => {
      // Reusing a single canvas context across repeated calls to detect any transform accumulation
      for (const modelId of ALL_18_MODELS) {
        const oracle = new TransformMatrixOracle();
        const mockCtx = createMockCanvasContext(oracle);
        const mockCanvas = {
          width: 48,
          height: 40,
          getContext: vi.fn(() => mockCtx),
        };

        vi.stubGlobal('document', {
          createElement: vi.fn((tag: string) => (tag === 'canvas' ? mockCanvas : {})),
        });

        const ITERATIONS = 50;
        for (let i = 0; i < ITERATIONS; i++) {
          const frame = i % 4;
          vehicleCanvas(modelId, 1, frame);

          // At every single step, transform must be strictly identity
          expect(oracle.isIdentity()).toBe(true);
          expect(oracle.stackDepth).toBe(0);
        }

        expect(oracle.saveCount).toBe(0);
        expect(oracle.restoreCount).toBe(0);
        expect(oracle.getMatrix()).toEqual([1, 0, 0, 1, 0, 0]);
      }
    });

    it('verifies non-inverted directions (dir = 0, 2, 3) perform 0 saves/restores and leave identity matrix', () => {
      for (const modelId of ALL_18_MODELS) {
        for (const dir of [0, 2, 3]) {
          const oracle = new TransformMatrixOracle();
          const mockCtx = createMockCanvasContext(oracle);
          const mockCanvas = {
            width: 48,
            height: 40,
            getContext: vi.fn(() => mockCtx),
          };

          vi.stubGlobal('document', {
            createElement: vi.fn((tag: string) => (tag === 'canvas' ? mockCanvas : {})),
          });

          vehicleCanvas(modelId, dir, 0);

          expect(oracle.saveCount).toBe(0);
          expect(oracle.restoreCount).toBe(0);
          expect(oracle.stackDepth).toBe(0);
          expect(oracle.isIdentity()).toBe(true);
        }
      }
    });

    it('handles out-of-range frames and directions without throwing or leaking transforms', () => {
      const boundaryCases = [
        { dir: 1, frame: -1 },
        { dir: 1, frame: 99 },
        { dir: 1, frame: 1000 },
        { dir: -1, frame: 0 },
        { dir: 4, frame: 2 },
        { dir: 10, frame: 3 },
      ];

      for (const { dir, frame } of boundaryCases) {
        const oracle = new TransformMatrixOracle();
        const mockCtx = createMockCanvasContext(oracle);
        const mockCanvas = {
          width: 48,
          height: 40,
          getContext: vi.fn(() => mockCtx),
        };

        vi.stubGlobal('document', {
          createElement: vi.fn((tag: string) => (tag === 'canvas' ? mockCanvas : {})),
        });

        expect(() => vehicleCanvas('car_porsche', dir, frame)).not.toThrow();
        expect(oracle.isIdentity()).toBe(true);
        expect(oracle.stackDepth).toBe(0);
      }
    });

    it('does not mutate transform for an unknown vehicle ID at dir = 1', () => {
      const oracle = new TransformMatrixOracle();
      const mockCtx = createMockCanvasContext(oracle);
      const mockCanvas = {
        width: 48,
        height: 40,
        getContext: vi.fn(() => mockCtx),
      };

      vi.stubGlobal('document', {
        createElement: vi.fn((tag: string) => (tag === 'canvas' ? mockCanvas : {})),
      });

      vehicleCanvas('non_existent_vehicle_999', 1, 0);

      expect(oracle.saveCount).toBe(0);
      expect(oracle.restoreCount).toBe(0);
      expect(oracle.isIdentity()).toBe(true);
      expect(oracle.stackDepth).toBe(0);
    });
  });

  describe('2. Empirical Stress Test: blitFrame With Simulated Pre-Existing Tainted Transforms', () => {
    function setupPhaserScene(mockCtx: unknown) {
      const textures = new Map<
        string,
        { key: string; refresh: ReturnType<typeof vi.fn>; getContext: ReturnType<typeof vi.fn> }
      >();

      const mockScene = {
        textures: {
          exists: vi.fn((k: string) => textures.has(k)),
          addCanvas: vi.fn((k: string, _canvas: HTMLCanvasElement) => {
            const texObj = {
              key: k,
              refresh: vi.fn(),
              getContext: vi.fn(() => mockCtx as CanvasRenderingContext2D),
            };
            textures.set(k, texObj);
            return texObj;
          }),
          get: vi.fn((k: string) => textures.get(k)),
        },
      } as unknown as Phaser.Scene;

      return { mockScene, textures };
    }

    const mockImg = {
      width: 192,
      height: 160,
    } as unknown as HTMLImageElement;

    it('resets horizontally flipped tainted context (scaleX = -1) back to identity before drawing', () => {
      const oracle = new TransformMatrixOracle();
      // Pre-taint context with horizontal flip and offset
      oracle.translate(48, 0);
      oracle.scale(-1, 1);
      expect(oracle.isIdentity()).toBe(false);
      expect(oracle.getMatrix()).toEqual([-1, 0, 0, 1, 48, 0]);

      const mockCtx = createMockCanvasContext(oracle);
      const mockCanvas = {
        width: 48,
        height: 40,
        getContext: vi.fn(() => mockCtx),
      };
      vi.stubGlobal('document', {
        createElement: vi.fn(() => mockCanvas),
      });

      setCachedVehicleSpritesheet('car_lamborghini', mockImg);
      const { mockScene } = setupPhaserScene(mockCtx);

      ensureVehicleTexture(mockScene, 'car_lamborghini', 1, 0);

      // Verify that setTransform was called with identity
      expect(oracle.setTransformCount).toBeGreaterThanOrEqual(1);
      expect(oracle.isIdentity()).toBe(true);
      expect(oracle.getMatrix()).toEqual([1, 0, 0, 1, 0, 0]);

      // Verify execution order: setTransform MUST happen before clearRect and drawImage
      const setTransformIdx = oracle.callLog.indexOf('setTransform(1,0,0,1,0,0)');
      const clearRectIdx = oracle.callLog.findIndex((entry) => entry.startsWith('clearRect'));
      const drawImageIdx = oracle.callLog.findIndex((entry) => entry.startsWith('drawImage'));

      expect(setTransformIdx).toBeGreaterThanOrEqual(0);
      expect(clearRectIdx).toBeGreaterThan(setTransformIdx);
      expect(drawImageIdx).toBeGreaterThan(clearRectIdx);

      // Verified drawImage args: dir 1 -> sy = 40; frame 0 -> sx = 0
      expect(oracle.callLog).toContain('clearRect(0,0,48,40)');
      expect(oracle.callLog).toContain('drawImage(0,40,48,40,0,0,48,40)');
    });

    it('resets complex affine taint (rotation, scale, shear, translation) back to identity', () => {
      const oracle = new TransformMatrixOracle();
      // Apply extreme arbitrary distortions
      oracle.translate(250, -180);
      oracle.rotate(Math.PI / 3);
      oracle.scale(3.5, -2.1);
      oracle.transform(1.5, 0.4, -0.6, 2.0, 50, 75);
      expect(oracle.isIdentity()).toBe(false);

      const mockCtx = createMockCanvasContext(oracle);
      const mockCanvas = {
        width: 48,
        height: 40,
        getContext: vi.fn(() => mockCtx),
      };
      vi.stubGlobal('document', {
        createElement: vi.fn(() => mockCanvas),
      });

      setCachedVehicleSpritesheet('cars/mercedes-benz-g63', mockImg);
      const { mockScene } = setupPhaserScene(mockCtx);

      ensureVehicleTexture(mockScene, 'cars/mercedes-benz-g63', 1, 2);

      expect(oracle.isIdentity()).toBe(true);
      expect(oracle.getMatrix()).toEqual([1, 0, 0, 1, 0, 0]);
      // dir 1 -> sy = 40; frame 2 -> sx = 96
      expect(oracle.callLog).toContain('drawImage(96,40,48,40,0,0,48,40)');
    });

    it('reliably forces identity matrix even when ctx.resetTransform is undefined (legacy browser fallback)', () => {
      const oracle = new TransformMatrixOracle();
      oracle.scale(-1, 1);
      expect(oracle.isIdentity()).toBe(false);

      const mockCtx = createMockCanvasContext(oracle);
      // Explicitly delete / undefine resetTransform to test optional chaining ctx.resetTransform?.()
      (mockCtx as Record<string, unknown>).resetTransform = undefined;

      const mockCanvas = {
        width: 48,
        height: 40,
        getContext: vi.fn(() => mockCtx),
      };
      vi.stubGlobal('document', {
        createElement: vi.fn(() => mockCanvas),
      });

      setCachedVehicleSpritesheet('motorcycle_ducati', mockImg);
      const { mockScene } = setupPhaserScene(mockCtx);

      expect(() => ensureVehicleTexture(mockScene, 'motorcycle_ducati', 1, 1)).not.toThrow();

      // Even without resetTransform, setTransform(1, 0, 0, 1, 0, 0) forced identity!
      expect(oracle.isIdentity()).toBe(true);
      expect(oracle.getMatrix()).toEqual([1, 0, 0, 1, 0, 0]);
      // dir 1 -> sy = 40; frame 1 -> sx = 48
      expect(oracle.callLog).toContain('drawImage(48,40,48,40,0,0,48,40)');
    });

    it('survives rapid succession of 50 blit operations with randomly tainted transforms', () => {
      setCachedVehicleSpritesheet('car_ferrari_f40', mockImg);

      for (let i = 0; i < 50; i++) {
        const oracle = new TransformMatrixOracle();
        // Inject pseudo-random hostile transforms
        oracle.translate((i * 17) % 100, -(i * 23) % 80);
        if (i % 2 === 0) oracle.scale(-1, 1);
        if (i % 3 === 0) oracle.rotate((i * Math.PI) / 6);

        const mockCtx = createMockCanvasContext(oracle);
        const mockCanvas = {
          width: 48,
          height: 40,
          getContext: vi.fn(() => mockCtx),
        };
        vi.stubGlobal('document', {
          createElement: vi.fn(() => mockCanvas),
        });

        const { mockScene } = setupPhaserScene(mockCtx);
        const dir = i % 4;
        const frame = (i * 3) % 4;

        ensureVehicleTexture(mockScene, 'car_ferrari_f40', dir, frame);

        expect(oracle.isIdentity()).toBe(true);
        expect(oracle.getMatrix()).toEqual([1, 0, 0, 1, 0, 0]);

        const expectedSx = frame * 48;
        const expectedSy = dir * 40;
        expect(oracle.callLog).toContain(`drawImage(${expectedSx},${expectedSy},48,40,0,0,48,40)`);
      }
    });

    it('verifies safe modulo wrapping for negative or out-of-range dir and frame values', () => {
      setCachedVehicleSpritesheet('bicycle_sky', mockImg);

      const edgeCases = [
        { dir: -1, frame: 0, expectedDir: 3, expectedFrame: 0 },
        { dir: -4, frame: -4, expectedDir: 0, expectedFrame: 0 },
        { dir: 5, frame: 7, expectedDir: 1, expectedFrame: 3 },
        { dir: 14, frame: 10, expectedDir: 2, expectedFrame: 2 },
      ];

      for (const { dir, frame, expectedDir, expectedFrame } of edgeCases) {
        const oracle = new TransformMatrixOracle();
        oracle.scale(-1, 1);

        const mockCtx = createMockCanvasContext(oracle);
        const mockCanvas = {
          width: 48,
          height: 40,
          getContext: vi.fn(() => mockCtx),
        };
        vi.stubGlobal('document', {
          createElement: vi.fn(() => mockCanvas),
        });

        const { mockScene } = setupPhaserScene(mockCtx);

        ensureVehicleTexture(mockScene, 'bicycle_sky', dir, frame);

        expect(oracle.isIdentity()).toBe(true);
        const expectedSx = expectedFrame * 48;
        const expectedSy = expectedDir * 40;
        expect(oracle.callLog).toContain(`drawImage(${expectedSx},${expectedSy},48,40,0,0,48,40)`);
      }
    });
  });
});
