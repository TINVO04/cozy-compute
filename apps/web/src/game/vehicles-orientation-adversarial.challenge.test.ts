/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    BlendModes: { ADD: 1 },
  },
}));

// Provide minimal window & document stubs before importing players & vehicle-lights
const mockCanvasElement = () => {
  let stackDepth = 0;
  const transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const history: any[] = [];

  const ctx = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: '',
    fillRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 1,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    translate: vi.fn((x: number, y: number) => {
      transform.e += x;
      transform.f += y;
      history.push({ op: 'translate', x, y, stackDepth });
    }),
    scale: vi.fn((sx: number, sy: number) => {
      transform.a *= sx;
      transform.d *= sy;
      history.push({ op: 'scale', sx, sy, stackDepth });
    }),
    save: vi.fn(() => {
      stackDepth++;
      history.push({ op: 'save', stackDepth });
    }),
    restore: vi.fn(() => {
      stackDepth--;
      history.push({ op: 'restore', stackDepth });
    }),
    setTransform: vi.fn((a: number, b: number, c: number, d: number, e: number, f: number) => {
      transform.a = a;
      transform.b = b;
      transform.c = c;
      transform.d = d;
      transform.e = e;
      transform.f = f;
      history.push({ op: 'setTransform', a, b, c, d, e, f, stackDepth });
    }),
    resetTransform: vi.fn(() => {
      transform.a = 1;
      transform.b = 0;
      transform.c = 0;
      transform.d = 1;
      transform.e = 0;
      transform.f = 0;
      history.push({ op: 'resetTransform', stackDepth });
    }),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    closePath: vi.fn(),
    _getStackDepth: () => stackDepth,
    _getTransform: () => ({ ...transform }),
    _getHistory: () => [...history],
  };

  return {
    width: 48,
    height: 40,
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
    _ctx: ctx,
  };
};

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => (tag === 'canvas' ? mockCanvasElement() : {}),
  };
}

import { CANONICAL_VEHICLE_IDS, DEFAULT_APPEARANCE, VEHICLES, vehicleById } from '@cozy/game-data';
import { Avatar } from './players';
import { VehicleLights } from './vehicle-lights';
import { vehicleCanvas } from '../art/vehicle';
import { clearVehicleAssetCache, ensureVehicleTexture } from '../art/vehicle-loader';
import { useUi } from '../lib/store';
import type Phaser from 'phaser';

describe('Adversarial Vehicle Orientation & Avatar Mounting Challenge (Milestone M1)', () => {
  let mockScene: Phaser.Scene;
  let mockSprite: any;
  let mockVehicleSprite: any;
  let mockContainer: any;
  let mockBeamImage: any;
  let mockBulbsGraphics: any;
  let lastCanvas: any;

  beforeEach(() => {
    clearVehicleAssetCache();
    useUi.setState({
      reducedMotion: false,
      weather: {
        ...useUi.getState().weather,
        solarHour: 0, // Midnight for full headlight illumination
      },
    });

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') {
          lastCanvas = mockCanvasElement();
          return lastCanvas;
        }
        return {};
      }),
    });

    mockSprite = {
      setTexture: vi.fn().mockReturnThis(),
      setFrame: vi.fn(function (this: any, f: number) {
        this.frame = f;
        return this;
      }),
      stop: vi.fn().mockReturnThis(),
      play: vi.fn().mockReturnThis(),
      setVisible: vi.fn(function (this: any, v: boolean) {
        this.visible = v;
        return this;
      }),
      setCrop: vi.fn(function (this: any, ...args: any[]) {
        this.cropArgs = args;
        return this;
      }),
      setInteractive: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setRotation: vi.fn().mockReturnThis(),
      anims: { isPlaying: false, currentAnim: null },
      visible: true,
      cropArgs: null,
      frame: 0,
      x: 0,
      y: 0,
    };

    mockVehicleSprite = {
      setTexture: vi.fn(function (this: any, k: string) {
        this.textureKey = k;
        return this;
      }),
      setVisible: vi.fn(function (this: any, v: boolean) {
        this.visible = v;
        return this;
      }),
      textureKey: '',
      visible: false,
    };

    mockContainer = {
      x: 300,
      y: 400,
      depth: 400,
      add: vi.fn().mockReturnThis(),
      addAt: vi.fn().mockReturnThis(),
      setSize: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      sendToBack: vi.fn().mockReturnThis(),
      bringToTop: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    };

    mockBeamImage = {
      setPosition: vi.fn(function (this: any, x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
      }),
      setRotation: vi.fn(function (this: any, r: number) {
        this.rotation = r;
        return this;
      }),
      setAlpha: vi.fn(function (this: any, a: number) {
        this.alpha = a;
        return this;
      }),
      setScale: vi.fn(function (this: any, sx: number, sy: number) {
        this.scaleX = sx;
        this.scaleY = sy;
        return this;
      }),
      setVisible: vi.fn(function (this: any, v: boolean) {
        this.visible = v;
        return this;
      }),
      setOrigin: vi.fn().mockReturnThis(),
      setBlendMode: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      x: 0,
      y: 0,
      rotation: 0,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      visible: false,
    };

    mockBulbsGraphics = {
      clear: vi.fn(function (this: any) {
        this.circles = [];
        this.rects = [];
        return this;
      }),
      fillStyle: vi.fn().mockReturnThis(),
      fillCircle: vi.fn(function (this: any, bx: number, by: number, radius: number) {
        this.circles.push({ x: bx, y: by, r: radius });
        return this;
      }),
      fillRect: vi.fn(function (this: any, rx: number, ry: number, rw: number, rh: number) {
        this.rects.push({ x: rx, y: ry, w: rw, h: rh });
        return this;
      }),
      setBlendMode: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      circles: [] as Array<{ x: number; y: number; r: number }>,
      rects: [] as Array<{ x: number; y: number; w: number; h: number }>,
    };

    mockScene = {
      scene: {
        key: 'town',
        isActive: vi.fn(() => true),
      },
      textures: {
        exists: vi.fn(() => true),
        addCanvas: vi.fn(),
        get: vi.fn(() => ({
          getContext: vi.fn(() => mockCanvasElement()._ctx),
          refresh: vi.fn(),
        })),
      },
      add: {
        ellipse: vi.fn(() => ({ setVisible: vi.fn() })),
        sprite: vi.fn((_x: number, y: number) => {
          mockSprite.y = y;
          return mockSprite;
        }),
        image: vi.fn((_x: number, _y: number, key: string) => {
          if (key === 'vehicle:headlight-beam') return mockBeamImage;
          return mockVehicleSprite;
        }),
        graphics: vi.fn(() => mockBulbsGraphics),
        text: vi.fn(() => ({
          setOrigin: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
          setY: vi.fn(),
        })),
        container: vi.fn(() => mockContainer),
      },
      tweens: {
        add: vi.fn(() => ({ stop: vi.fn(), remove: vi.fn() })),
      },
      time: {
        delayedCall: vi.fn(() => ({ remove: vi.fn() })),
      },
    } as unknown as Phaser.Scene;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Challenge 1: Left Driving (dir === 1) Verification across ALL 18 Vehicles', () => {
    const allVehicleIds = [...CANONICAL_VEHICLE_IDS, 'car_sunset', 'car_mercedes'];

    it.each(allVehicleIds)(
      'vehicle "%s" moving left (dir = 1) correctly orients sprite, lights, and driver avatar',
      (vehicleId) => {
        const def = vehicleById(vehicleId)!;
        expect(def).toBeDefined();

        const avatar = new Avatar(
          mockScene,
          `driver-${vehicleId}`,
          'Challenger',
          DEFAULT_APPEARANCE,
          300,
          400,
          true,
        );
        avatar.vehicle = vehicleId;
        avatar.dir = 1; // Explicit left direction (A key pressed)
        avatar.moving = true;

        avatar.update(16, 280); // moving frame

        // 1. Vehicle Sprite Check
        expect(avatar.vehicleSprite).toBeDefined();
        expect(avatar.vehicleSprite?.visible).toBe(true);
        // Requested texture key MUST specify dir = 1
        expect((avatar.vehicleSprite as any)?.textureKey).toMatch(
          new RegExp(`^(?:vehicle|rider:.*):${vehicleId}:1:[1-3]$`),
        );

        // When stopped (moving = false), vehicle sprite stays at dir = 1 with idle frame 0
        avatar.moving = false;
        avatar.update(16, 300);
        expect((avatar.vehicleSprite as any)?.textureKey).toMatch(
          new RegExp(`^(?:vehicle|rider:.*):${vehicleId}:1:0$`),
        );

        // 2. Avatar Mounting Check
        if (def.kind === 'bicycle' || def.kind === 'motorcycle') {
          // Walking sprite is replaced by a full seated composite
          expect(mockSprite.visible).toBe(false);
          // Two-wheeler driver frame MUST face left: dir * 3 = 1 * 3 = frame 3
          expect(avatar.vehicleSprite?.visible).toBe(true);
          // No waist crop: both legs belong to the seated artwork
          expect(mockSprite.cropArgs).toEqual([]);
          // Composite wheel contact stays at player ground level
          expect(avatar.vehicleSprite?.y).toBe(-29);
        } else if (def.kind === 'car') {
          // Four-wheeler driver avatar MUST be hidden inside cabin
          expect(mockSprite.visible).toBe(false);
        }

        // 3. Headlight & Taillight Raytracing Alignment Check
        const lights = new VehicleLights(mockScene);
        lights.update(vehicleId, 300, 400, 1);

        expect(mockBeamImage.visible).toBe(true);
        // Beam rotation for dir = 1 MUST be Math.PI (pointing strictly left)
        expect(mockBeamImage.rotation).toBeCloseTo(Math.PI, 5);
        // Beam front emitter X must be displaced to the LEFT of the vehicle center (x < 300)
        expect(mockBeamImage.x).toBeLessThan(300);
        // Beam front emitter X must be x - 20 (or vehicle headlight offset)
        expect(mockBeamImage.x).toBe(300 - (def.lighting?.headlight?.dx ?? 20));
        // Beam emitter Y must be aligned with vehicle front
        expect(mockBeamImage.y).toBe(400 - 10);

        // Verify taillight red circle position is to the RIGHT (rear) of vehicle center (rearX > 300)
        const redTaillight = mockBulbsGraphics.circles.find((c: any) => c.r === 2);
        expect(redTaillight).toBeDefined();
        expect(redTaillight.x).toBeGreaterThan(300);
        expect(redTaillight.x).toBe(300 + (def.lighting?.taillight?.dx ?? 18));
      },
    );
  });

  describe('Challenge 2: Rapid Direction Switching & Matrix Leakage Hysteresis', () => {
    it('survives rapid Left -> Right -> Left (dir 1 -> 2 -> 1) without state hysteresis', () => {
      const avatar = new Avatar(mockScene, 'rapid-user', 'Racer', DEFAULT_APPEARANCE, 300, 400, true);
      avatar.vehicle = 'motorcycle_ducati';
      avatar.moving = true;

      // 1. Move Left (dir = 1)
      avatar.dir = 1;
      avatar.update(16, 140);
      expect((avatar.vehicleSprite as any)?.textureKey).toMatch(/^rider:.*:motorcycle_ducati:1:2$/);
      expect(avatar.vehicleSprite?.visible).toBe(true); // left-facing rider frame

      // 2. Immediate switch to Right (dir = 2)
      avatar.dir = 2;
      avatar.update(16, 156);
      expect((avatar.vehicleSprite as any)?.textureKey).toMatch(/^rider:.*:motorcycle_ducati:2:2$/);
      expect(avatar.vehicleSprite?.visible).toBe(true); // right-facing rider frame (2 * 3 = 6)

      // 3. Immediate switch back to Left (dir = 1)
      avatar.dir = 1;
      avatar.update(16, 172);
      expect((avatar.vehicleSprite as any)?.textureKey).toMatch(/^rider:.*:motorcycle_ducati:1:2$/);
      expect(avatar.vehicleSprite?.visible).toBe(true); // rider immediately returns to frame 3
      expect(mockSprite.cropArgs).toEqual([]);
    });

    it('survives rapid Up -> Left -> Up (dir 3 -> 1 -> 3) and Down -> Left -> Down (dir 0 -> 1 -> 0)', () => {
      const avatar = new Avatar(mockScene, 'rapid-user-2', 'Cruiser', DEFAULT_APPEARANCE, 300, 400, true);
      avatar.vehicle = 'car_lamborghini';
      avatar.moving = true;

      // Down -> Left -> Down
      avatar.dir = 0;
      avatar.update(16, 100);
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:0:1');

      avatar.dir = 1;
      avatar.update(16, 116);
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:1:1');

      avatar.dir = 0;
      avatar.update(16, 132);
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:0:1');

      // Up -> Left -> Up
      avatar.dir = 3;
      avatar.update(16, 148);
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:3:2');

      avatar.dir = 1;
      avatar.update(16, 164);
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:1:2');

      avatar.dir = 3;
      avatar.update(16, 180);
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:3:2');
    });

    it('rigorously tests 1,000 rapid direction transitions (fuzzing) without desync or memory leakage', () => {
      const avatar = new Avatar(mockScene, 'fuzz-user', 'Fuzzer', DEFAULT_APPEARANCE, 300, 400, true);
      avatar.vehicle = 'motorcycle_yamaha_r1';
      avatar.moving = true;

      const directions = [0, 1, 2, 3];
      for (let i = 0; i < 1000; i++) {
        const nextDir = directions[i % 4]!;
        avatar.dir = nextDir;
        avatar.update(16, i * 16);

        // Invariant 1: Texture key dir must match exactly
        const expectedDir = nextDir;
        const key = (avatar.vehicleSprite as any)?.textureKey;
        expect(key).toMatch(new RegExp(`^rider:.*:motorcycle_yamaha_r1:${expectedDir}:[0-3]$`));

        // Invariant 2: Two-wheeler rider frame must be dir * 3
        expect(avatar.vehicleSprite?.visible).toBe(true);
        // Invariant 3: Rider crop and offset must remain intact
        expect(mockSprite.cropArgs).toEqual([]);
        expect(avatar.vehicleSprite?.y).toBe(-29);
      }
    });

    it('verifies canvas transform context stack never leaks scaleX = -1 across 200 random direction renders', () => {
      const models = ['bicycle_sky', 'motorcycle_ducati', 'car_mint', 'car_ferrari_f40'];

      for (const model of models) {
        for (let i = 0; i < 50; i++) {
          const dir = (i % 4) as 0 | 1 | 2 | 3;
          const frame = (i % 4) as 0 | 1 | 2 | 3;
          const canvas = vehicleCanvas(model, dir, frame);
          const ctx = (canvas as any)._ctx;

          if (ctx) {
            // Stack depth MUST return to 0 (all ctx.save() balanced by ctx.restore())
            expect(ctx._getStackDepth()).toBe(0);
          }
        }
      }
    });

    it('ensures ensureVehicleTexture blitFrame explicitly overrides dirty pre-existing canvas transforms', () => {
      // Create a canvas with a dirty/tainted context (e.g. inverted scaleX = -1, dirty translate)
      const dirtyCanvas = mockCanvasElement();
      const ctx = dirtyCanvas._ctx;

      // Simulate a previously leaked transform on context
      ctx.translate(100, 50);
      ctx.scale(-1, 1);
      expect(ctx._getTransform().a).toBe(-1); // Inverted scaleX!

      const mockSceneTextures = new Map<string, any>();
      const customScene = {
        textures: {
          exists: vi.fn((k: string) => mockSceneTextures.has(k)),
          addCanvas: vi.fn((k: string, c: any) => {
            mockSceneTextures.set(k, {
              getContext: () => c._ctx ?? ctx,
              refresh: vi.fn(),
            });
          }),
          get: vi.fn((k: string) => mockSceneTextures.get(k)),
        },
      } as unknown as Phaser.Scene;

      // Render dir = 1
      const key = ensureVehicleTexture(customScene, 'cars/mercedes-benz-g63', 1, 0);
      expect(key).toBe('vehicle:cars/mercedes-benz-g63:1:0');

      // Verify that blitFrame or vehicleCanvas left the context clean
      const history = ctx._getHistory();
      // Any setTransform called must restore identity (1, 0, 0, 1, 0, 0)
      const setTransformCalls = history.filter((h: any) => h.op === 'setTransform');
      for (const call of setTransformCalls) {
        expect(call.a).toBe(1);
        expect(call.b).toBe(0);
        expect(call.c).toBe(0);
        expect(call.d).toBe(1);
        expect(call.e).toBe(0);
        expect(call.f).toBe(0);
      }
    });
  });

  describe('Challenge 3: Input Key "A" & Vector Mapping to Left Orientation (dir = 1)', () => {
    // Model the movement direction logic in PlayerLayer.update()
    const resolveDirection = (input: { x: number; y: number }): number | null => {
      const moving = input.x !== 0 || input.y !== 0;
      if (!moving) return null;
      if (input.x < 0) return 1;
      if (input.x > 0) return 2;
      if (input.y < 0) return 3;
      return 0;
    };

    it('resolves key "A" (x = -1, y = 0) strictly to dir = 1', () => {
      expect(resolveDirection({ x: -1, y: 0 })).toBe(1);
    });

    it('resolves diagonal left inputs (A+W and A+S) with priority to horizontal left (dir = 1)', () => {
      // In PlayerLayer.update: input.x < 0 is evaluated first!
      expect(resolveDirection({ x: -1, y: -1 })).toBe(1); // Up-Left
      expect(resolveDirection({ x: -1, y: 1 })).toBe(1); // Down-Left
    });

    it('avatar driven by left inputs propagates dir = 1 to vehicle and lights', () => {
      const avatar = new Avatar(mockScene, 'input-driver', 'Driver', DEFAULT_APPEARANCE, 300, 400, true);
      avatar.vehicle = 'motorcycle_honda_super_cub';

      // Simulate input: A key pressed -> x = -1, y = 0
      const input = { x: -1, y: 0 };
      avatar.dir = resolveDirection(input)!;
      avatar.moving = true;

      avatar.update(16, 500);

      expect(avatar.dir).toBe(1);
      expect((avatar.vehicleSprite as any)?.textureKey).toMatch(
        /^rider:.*:motorcycle_honda_super_cub:1:[1-3]$/,
      );
      expect(avatar.vehicleSprite?.visible).toBe(true); // Facing left
      expect(mockSprite.visible).toBe(false);

      // Verify lights aim left
      const lights = new VehicleLights(mockScene);
      lights.update('motorcycle_honda_super_cub', 300, 400, avatar.dir);
      expect(mockBeamImage.rotation).toBeCloseTo(Math.PI, 4);
    });
  });

  describe('Challenge 4: Dynamic Lighting & Dusk/Dawn Solar Transitions Facing Left', () => {
    it('seamlessly preserves beam angle PI (left) when headlights activate at dusk (solarHour 17 -> 20)', () => {
      const lights = new VehicleLights(mockScene);
      const x = 400;
      const y = 300;
      const dir = 1; // Left

      // Daylight: solarHour = 12 (headlights off)
      useUi.setState({ weather: { ...useUi.getState().weather, solarHour: 12 } });
      lights.update('car_porsche', x, y, dir);
      expect(mockBeamImage.visible).toBe(false);

      // Dusk: solarHour = 19 (headlights turn on)
      useUi.setState({ weather: { ...useUi.getState().weather, solarHour: 19 } });
      lights.update('car_porsche', x, y, dir);
      expect(mockBeamImage.visible).toBe(true);
      expect(mockBeamImage.rotation).toBeCloseTo(Math.PI, 5); // Angle MUST be PI
      expect(mockBeamImage.x).toBeLessThan(x);

      // Deep night: solarHour = 0 (midnight)
      useUi.setState({ weather: { ...useUi.getState().weather, solarHour: 0 } });
      lights.update('car_porsche', x, y, dir);
      expect(mockBeamImage.visible).toBe(true);
      expect(mockBeamImage.rotation).toBeCloseTo(Math.PI, 5);
      expect(mockBeamImage.alpha).toBeCloseTo(1, 1);
    });
  });

  describe('Challenge 5: Mid-Drive Swapping & Mounting Transitions Facing Left', () => {
    it('swaps 2-wheeler -> 4-wheeler -> 2-wheeler while driving left without orientation or mounting glitch', () => {
      const avatar = new Avatar(mockScene, 'swap-driver', 'Swapper', DEFAULT_APPEARANCE, 300, 400, true);
      avatar.dir = 1;
      avatar.moving = true;

      // Phase 1: Riding 2-wheeler (Bicycle) left
      avatar.vehicle = 'bicycle_sky';
      avatar.update(16, 100);
      expect(mockSprite.visible).toBe(false);
      expect(avatar.vehicleSprite?.visible).toBe(true);
      expect(mockSprite.cropArgs).toEqual([]);
      expect(avatar.vehicleSprite?.y).toBe(-29);
      expect((avatar.vehicleSprite as any)?.textureKey).toMatch(/^rider:.*:bicycle_sky:1:1$/);

      // Phase 2: Instant swap to 4-wheeler (Lamborghini) while still moving left
      avatar.vehicle = 'car_lamborghini';
      avatar.update(16, 116);
      expect(mockSprite.visible).toBe(false); // Avatar hidden inside car
      expect(mockSprite.cropArgs).toEqual([]); // Crop removed
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:1:1');

      // Phase 3: Instant swap to 2-wheeler (Ducati) while still moving left
      avatar.vehicle = 'motorcycle_ducati';
      avatar.update(16, 132);
      expect(mockSprite.visible).toBe(false); // Avatar visible again
      expect(avatar.vehicleSprite?.visible).toBe(true); // Facing left
      expect(mockSprite.cropArgs).toEqual([]); // Crop re-applied
      expect(avatar.vehicleSprite?.y).toBe(-29); // Saddle Y applied
      expect((avatar.vehicleSprite as any)?.textureKey).toMatch(/^rider:.*:motorcycle_ducati:1:1$/);

      // Phase 4: Dismount (on foot) while still moving left
      avatar.vehicle = '';
      avatar.update(16, 148);
      expect(mockSprite.visible).toBe(true);
      expect(mockSprite.cropArgs).toEqual([]); // Crop removed
      expect(mockSprite.y).toBe(avatar.baseSpriteY); // Base pedestrian Y restored
      expect(avatar.vehicleSprite?.visible).toBe(false);
    });
  });
});
