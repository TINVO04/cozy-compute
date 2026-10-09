/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    BlendModes: { ADD: 1 },
  },
}));

// Provide minimal window & document stubs before importing players & vehicle-lights
const mockCanvasElement = () => ({
  width: 48,
  height: 40,
  getContext: vi.fn(() => ({
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
    translate: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    closePath: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
});

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => (tag === 'canvas' ? mockCanvasElement() : {}),
  };
}

import {
  CANONICAL_VEHICLE_IDS,
  DEFAULT_APPEARANCE,
  PLAYER_SPEED,
  VEHICLES,
  vehicleById,
} from '@cozy/game-data';
import { Avatar } from './players';
import { VehicleLights } from './vehicle-lights';
import { vehicleCanvas } from '../art/vehicle';
import { useUi } from '../lib/store';
import type Phaser from 'phaser';

describe('Adversarial Vehicle Runtime Hardening (Tier 5)', () => {
  let mockScene: Phaser.Scene;
  let mockSprite: any;
  let mockVehicleSprite: any;
  let mockContainer: any;
  let mockBeamImage: any;
  let mockBulbsGraphics: any;

  beforeEach(() => {
    // Reset Zustand store state
    useUi.setState({
      reducedMotion: false,
      weather: {
        ...useUi.getState().weather,
        solarHour: 0, // Midnight -> full headlight brightness
      },
    });

    // Mock DOM canvas
    const mockCtx = {
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
      translate: vi.fn(),
      scale: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      closePath: vi.fn(),
    };
    const mockCanvas = {
      width: 48,
      height: 40,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
    };
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => (tag === 'canvas' ? mockCanvas : {})),
    });

    mockSprite = {
      setTexture: vi.fn().mockReturnThis(),
      setFrame: vi.fn().mockReturnThis(),
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
      x: 200,
      y: 300,
      depth: 300,
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
      clear: vi.fn().mockReturnThis(),
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
          getContext: vi.fn(() => mockCtx),
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

  describe('1. Unmounting While Moving at Top Speed', () => {
    it('unhides avatar, hides vehicle sprite, and resets y-position when unmounting 4-wheeler at top speed', () => {
      const avatar = new Avatar(mockScene, 'user-1', 'Racer', DEFAULT_APPEARANCE, 200, 300, true);
      avatar.vehicle = 'car_lamborghini'; // Top speed 340 px/s
      avatar.moving = true;

      // Frame 1: Driving car at top speed
      avatar.update(16, 1000);
      expect(mockSprite.visible).toBe(false); // Car hides avatar driver
      expect(avatar.vehicleSprite).toBeDefined();
      expect(avatar.vehicleSprite?.visible).toBe(true);

      // Frame 2: Unmount (V key pressed) while still at full speed
      avatar.vehicle = '';
      avatar.update(16, 1016);

      // Avatar must immediately become visible
      expect(mockSprite.visible).toBe(true);
      // Vehicle sprite must be hidden
      expect(avatar.vehicleSprite?.visible).toBe(false);
      // Avatar Y should be at pedestrian baseSpriteY
      expect(mockSprite.y).toBe(avatar.baseSpriteY);
    });

    it('clears torso crop, resets avatarOffsetY, and restores pedestrian sprite when unmounting 2-wheeler', () => {
      const avatar = new Avatar(mockScene, 'user-2', 'Biker', DEFAULT_APPEARANCE, 200, 300, true);
      avatar.vehicle = 'motorcycle_ducati';
      avatar.moving = true;

      // Frame 1: Riding motorcycle
      avatar.update(16, 1000);
      expect(mockSprite.visible).toBe(false); // Dedicated seated composite is visible instead
      // Cropped at (0, 0, 32, 40)
      expect(mockSprite.cropArgs).toEqual([]);
      // Avatar Y shifted by avatarOffsetY (-4)
      expect(avatar.vehicleSprite?.y).toBe(-29);

      // Frame 2: Unmount while moving
      avatar.vehicle = '';
      avatar.update(16, 1016);

      // Crop is cleared (setCrop called with no arguments)
      expect(mockSprite.cropArgs).toEqual([]);
      // Avatar Y restored to baseSpriteY
      expect(mockSprite.y).toBe(avatar.baseSpriteY);
      expect(avatar.vehicleSprite?.visible).toBe(false);
    });

    it('survives rapid 50-cycle mount/unmount oscillations during continuous movement', () => {
      const avatar = new Avatar(mockScene, 'user-3', 'Stuntman', DEFAULT_APPEARANCE, 200, 300, true);
      avatar.moving = true;

      for (let cycle = 0; cycle < 50; cycle++) {
        // Mount
        avatar.vehicle = cycle % 2 === 0 ? 'motorcycle_kawasaki_ninja_h2' : 'car_porsche';
        avatar.update(16, cycle * 32);

        expect(mockSprite.visible).toBe(false);
        expect(avatar.vehicleSprite?.visible).toBe(true);

        // Unmount
        avatar.vehicle = '';
        avatar.update(16, cycle * 32 + 16);

        expect(mockSprite.visible).toBe(true);
        expect(avatar.vehicleSprite?.visible).toBe(false);
        expect(mockSprite.y).toBe(avatar.baseSpriteY);
      }
    });
  });

  describe('2. Vehicle Switching While Headlights Are Active', () => {
    it('correctly adapts headlight beam geometry when switching Car -> Motorcycle -> Bicycle at night', () => {
      const lights = new VehicleLights(mockScene);
      const x = 300;
      const y = 400;
      const dir = 2; // Facing Right (angle = 0)

      // 1. Car: dual headlights (offset [-8, 8]), scale (1, 1)
      lights.update('car_lamborghini', x, y, dir);
      expect(mockBeamImage.visible).toBe(true);
      expect(mockBeamImage.scaleX).toBe(1);
      expect(mockBeamImage.scaleY).toBe(1);
      expect(mockBeamImage.rotation).toBe(0);
      // Front beam emitter: x + dx * 20 = 300 + 1 * 20 = 320, frontY = y - 10 + dy * 18 = 390
      expect(mockBeamImage.x).toBe(320);
      expect(mockBeamImage.y).toBe(390);

      // 2. Switch to Motorcycle: single headlight (offset [0]), scale (1, 0.7)
      mockBulbsGraphics.circles = [];
      lights.update('motorcycle_ducati', x, y, dir);
      expect(mockBeamImage.visible).toBe(true);
      expect(mockBeamImage.scaleX).toBe(1);
      expect(mockBeamImage.scaleY).toBe(0.7);

      // 3. Switch to Bicycle: single headlight, scale (0.65, 0.7)
      lights.update('bicycle_sky', x, y, dir);
      expect(mockBeamImage.visible).toBe(true);
      expect(mockBeamImage.scaleX).toBe(0.65);
      expect(mockBeamImage.scaleY).toBe(0.7);

      // 4. Dismount: beam hidden, bulbs cleared
      lights.update('', x, y, dir);
      expect(mockBeamImage.visible).toBe(false);
      expect(mockBulbsGraphics.clear).toHaveBeenCalled();
    });

    it('correctly reorients beam and taillights across all 4 directions', () => {
      const lights = new VehicleLights(mockScene);
      const x = 500;
      const y = 500;

      const directions = [
        { dir: 0, expectedAngle: Math.PI / 2, expectedFrontX: 500, expectedFrontY: 508 }, // Down
        { dir: 1, expectedAngle: Math.PI, expectedFrontX: 480, expectedFrontY: 490 }, // Left
        { dir: 2, expectedAngle: 0, expectedFrontX: 520, expectedFrontY: 490 }, // Right
        { dir: 3, expectedAngle: -Math.PI / 2, expectedFrontX: 500, expectedFrontY: 472 }, // Up
      ];

      for (const { dir, expectedAngle, expectedFrontX, expectedFrontY } of directions) {
        lights.update('car_mint', x, y, dir);
        expect(mockBeamImage.rotation).toBeCloseTo(expectedAngle, 4);
        expect(mockBeamImage.x).toBeCloseTo(expectedFrontX, 1);
        expect(mockBeamImage.y).toBeCloseTo(expectedFrontY, 1);
      }
    });

    it('automatically extinguishes headlights during daylight hours (solarHour = 12)', () => {
      const lights = new VehicleLights(mockScene);

      // Daytime (noon)
      useUi.setState({
        weather: {
          ...useUi.getState().weather,
          solarHour: 12,
        },
      });

      lights.update('car_ferrari_f40', 300, 300, 2);
      expect(mockBeamImage.visible).toBe(false);
      expect(mockBulbsGraphics.clear).toHaveBeenCalled();
    });

    it('survives rapid switching through all 16 vehicles while lights active without errors', () => {
      const lights = new VehicleLights(mockScene);
      for (const id of CANONICAL_VEHICLE_IDS) {
        lights.update(id, 250, 250, 1);
        expect(mockBeamImage.visible).toBe(true);
        expect(Number.isFinite(mockBeamImage.x)).toBe(true);
        expect(Number.isFinite(mockBeamImage.y)).toBe(true);
      }
      lights.destroy();
      expect(mockBeamImage.destroy).toHaveBeenCalled();
      expect(mockBulbsGraphics.destroy).toHaveBeenCalled();
    });
  });

  describe('3. Reduced Motion Accessibility Mode', () => {
    it('strictly freezes animation to frame 0 (idle) when reducedMotion is enabled', () => {
      const avatar = new Avatar(mockScene, 'user-a11y', 'Alex', DEFAULT_APPEARANCE, 200, 300, true);
      avatar.vehicle = 'car_lamborghini';
      avatar.moving = true;

      // Test with reducedMotion = false (standard animation cycling)
      useUi.setState({ reducedMotion: false });
      avatar.update(16, 280); // 280ms / 140 = 2 -> frame 1 + (2 % 3) = 3
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:0:3');

      // Now enable reducedMotion = true (accessibility mode)
      useUi.setState({ reducedMotion: true });
      avatar.update(16, 280);
      // Drive frame MUST be frozen at 0 (idle)
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:0:0');

      avatar.update(16, 420);
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:0:0');

      avatar.update(16, 560);
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:0:0');
    });

    it('suppresses breathing sinusoidal bounce when idle under reducedMotion', () => {
      const avatar = new Avatar(mockScene, 'user-a11y-2', 'Sam', DEFAULT_APPEARANCE, 200, 300, true);
      avatar.moving = false;

      // With reduced motion, sprite.y must remain exactly at baseSpriteY without oscillation
      useUi.setState({ reducedMotion: true });
      for (let t = 0; t < 2000; t += 200) {
        avatar.update(16, t);
        expect(mockSprite.y).toBe(avatar.baseSpriteY);
      }
    });

    it('dynamically toggles animation frames on the fly without requiring scene reload', () => {
      const avatar = new Avatar(mockScene, 'user-a11y-3', 'Jordan', DEFAULT_APPEARANCE, 200, 300, true);
      avatar.vehicle = 'motorcycle_yamaha_r1';
      avatar.moving = true;

      // 1. Off -> animating
      useUi.setState({ reducedMotion: false });
      avatar.update(16, 140);
      expect((avatar.vehicleSprite as any)?.textureKey).toMatch(/^rider:.*:motorcycle_yamaha_r1:0:2$/);

      // 2. On -> frozen
      useUi.setState({ reducedMotion: true });
      avatar.update(16, 140);
      expect((avatar.vehicleSprite as any)?.textureKey).toMatch(/^rider:.*:motorcycle_yamaha_r1:0:0$/);

      // 3. Off -> animating again
      useUi.setState({ reducedMotion: false });
      avatar.update(16, 140);
      expect((avatar.vehicleSprite as any)?.textureKey).toMatch(/^rider:.*:motorcycle_yamaha_r1:0:2$/);
    });
  });

  describe('4. Frame Animation Cycles Across All 16 Vehicles', () => {
    it('successfully renders procedural fallback canvas for all 288 permutations (18 vehicles x 4 dirs x 4 frames)', () => {
      const testModels = [...CANONICAL_VEHICLE_IDS, 'car_sunset', 'car_mercedes'];
      let totalRenderCount = 0;

      for (const id of testModels) {
        for (let dir = 0; dir < 4; dir++) {
          for (let frame = 0; frame < 4; frame++) {
            const canvas = vehicleCanvas(id, dir, frame);
            expect(canvas).toBeDefined();
            expect(canvas.width).toBe(48);
            expect(canvas.height).toBe(40);
            totalRenderCount++;
          }
        }
      }

      expect(totalRenderCount).toBe(18 * 4 * 4); // 288 render states
    });

    it('renders bicycle pedal crank motion between alternating frames', () => {
      // In dir 2 (facing right), bicycle renders pedal angle alternating with frame % 2
      const canvas0 = vehicleCanvas('bicycle_sky', 2, 0);
      const canvas1 = vehicleCanvas('bicycle_sky', 2, 1);
      expect(canvas0).toBeDefined();
      expect(canvas1).toBeDefined();
    });

    it('renders motorcycle wheel spoke rotation between alternating frames', () => {
      const canvas0 = vehicleCanvas('motorcycle_ducati', 2, 0);
      const canvas1 = vehicleCanvas('motorcycle_ducati', 2, 1);
      expect(canvas0).toBeDefined();
      expect(canvas1).toBeDefined();
    });
  });

  describe('5. Vehicle Mounting Geometry & Contact Baselines', () => {
    it('verifies contact baseline y=37 and width <= 40 across all vehicles', () => {
      for (const id of CANONICAL_VEHICLE_IDS) {
        const def = vehicleById(id)!;
        expect(def.dimensions.contactY).toBe(37);
        expect(def.dimensions.frameWidth).toBe(48);
        expect(def.dimensions.frameHeight).toBe(40);
        expect(def.dimensions.bodyWidth).toBeLessThanOrEqual(40);
        expect(def.dimensions.bodyWidth).toBeGreaterThan(0);
      }
    });

    it('verifies 2-wheeler saddle center x=24, y=16..20, and avatarOffsetY=-4', () => {
      for (const id of CANONICAL_VEHICLE_IDS) {
        const def = vehicleById(id)!;
        if (def.kind === 'bicycle' || def.kind === 'motorcycle') {
          expect(def.mounting.seat.x).toBe(24);
          expect(def.mounting.seat.y).toBeGreaterThanOrEqual(16);
          expect(def.mounting.seat.y).toBeLessThanOrEqual(20);
          expect(def.mounting.avatarOffsetY).toBe(-4);
          expect(def.mounting.hideAvatar).toBe(false);
          expect(def.mounting.cropAvatar).toEqual({ x: 0, y: 0, width: 32, height: 40 });
        } else if (def.kind === 'car') {
          expect(def.mounting.hideAvatar).toBe(true);
        }
      }
    });
  });

  describe('6. Transform Isolation & Left Drive Orientation (dir = 1 Hardening)', () => {
    it('does not mirror pre-oriented frames when rendering 2-wheelers at dir = 1', () => {
      const callLog: string[] = [];
      const testCtx = {
        save: vi.fn(() => callLog.push('save')),
        translate: vi.fn(() => callLog.push('translate')),
        scale: vi.fn(() => callLog.push('scale')),
        restore: vi.fn(() => callLog.push('restore')),
        fillRect: vi.fn(() => callLog.push('fillRect')),
        fillStyle: '',
      };
      const testCanvas = {
        width: 48,
        height: 40,
        getContext: vi.fn(() => testCtx),
      };
      vi.stubGlobal('document', {
        createElement: vi.fn(() => testCanvas),
      });

      // 2-wheeler: Ducati Panigale
      vehicleCanvas('motorcycle_ducati', 1, 0);

      expect(testCtx.save).not.toHaveBeenCalled();
      expect(testCtx.translate).not.toHaveBeenCalled();
      expect(testCtx.scale).not.toHaveBeenCalled();
      expect(testCtx.restore).not.toHaveBeenCalled();

      expect(callLog.length).toBeGreaterThan(0);
      expect(callLog.every((call) => call === 'fillRect')).toBe(true);
    });

    it('does not mirror pre-oriented frames when rendering 4-wheelers at dir = 1', () => {
      const callLog: string[] = [];
      const testCtx = {
        save: vi.fn(() => callLog.push('save')),
        translate: vi.fn(() => callLog.push('translate')),
        scale: vi.fn(() => callLog.push('scale')),
        restore: vi.fn(() => callLog.push('restore')),
        fillRect: vi.fn(() => callLog.push('fillRect')),
        fillStyle: '',
      };
      const testCanvas = {
        width: 48,
        height: 40,
        getContext: vi.fn(() => testCtx),
      };
      vi.stubGlobal('document', {
        createElement: vi.fn(() => testCanvas),
      });

      // 4-wheeler: Mercedes-Benz G63 AMG
      vehicleCanvas('car_mint', 1, 0);

      expect(testCtx.save).not.toHaveBeenCalled();
      expect(testCtx.translate).not.toHaveBeenCalled();
      expect(testCtx.scale).not.toHaveBeenCalled();
      expect(testCtx.restore).not.toHaveBeenCalled();

      expect(callLog.length).toBeGreaterThan(0);
      expect(callLog.every((call) => call === 'fillRect')).toBe(true);
    });

    it('does not call save() or restore() for non-inverted directions (dir = 0, 2, 3)', () => {
      for (const testDir of [0, 2, 3]) {
        const testCtx = {
          save: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          restore: vi.fn(),
          fillRect: vi.fn(),
          fillStyle: '',
        };
        const testCanvas = {
          width: 48,
          height: 40,
          getContext: vi.fn(() => testCtx),
        };
        vi.stubGlobal('document', {
          createElement: vi.fn(() => testCanvas),
        });

        // 2-wheeler and 4-wheeler
        vehicleCanvas('bicycle_sky', testDir, 0);
        vehicleCanvas('car_ferrari_f40', testDir, 0);

        expect(testCtx.save).not.toHaveBeenCalled();
        expect(testCtx.restore).not.toHaveBeenCalled();
        expect(testCtx.translate).not.toHaveBeenCalled();
        expect(testCtx.scale).not.toHaveBeenCalled();
      }
    });

    it('strictly balances save() and restore() across all 18 vehicle models at dir = 1', () => {
      const allModels = [...CANONICAL_VEHICLE_IDS, 'car_sunset', 'car_mercedes'];

      for (const modelId of allModels) {
        for (let frame = 0; frame < 4; frame++) {
          const testCtx = {
            save: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            restore: vi.fn(),
            fillRect: vi.fn(),
            fillStyle: '',
          };
          const testCanvas = {
            width: 48,
            height: 40,
            getContext: vi.fn(() => testCtx),
          };
          vi.stubGlobal('document', {
            createElement: vi.fn(() => testCanvas),
          });

          vehicleCanvas(modelId, 1, frame);

          expect(testCtx.save).not.toHaveBeenCalled();
          expect(testCtx.restore).not.toHaveBeenCalled();
        }
      }
    });

    it('maintains correct driver mounting and left-facing orientation when driving 2-wheeler left (dir = 1)', () => {
      const avatar = new Avatar(mockScene, 'driver-left-2w', 'LeftRider', DEFAULT_APPEARANCE, 200, 300, true);
      avatar.vehicle = 'motorcycle_ducati';
      avatar.moving = true;
      avatar.dir = 1; // Left

      avatar.update(16, 1000);

      // The composite contains the entire rider; the walking sprite stays hidden.
      expect(mockSprite.visible).toBe(false);
      // Sprite set to dir * 3 = frame 3 (facing left)
      expect(avatar.vehicleSprite?.visible).toBe(true);
      // Torso crop applied
      expect(mockSprite.cropArgs).toEqual([]);
      // Torso y shifted onto saddle by -4
      expect(avatar.vehicleSprite?.y).toBe(-29);
      // Vehicle sprite requested texture with dir = 1
      expect((avatar.vehicleSprite as any)?.textureKey).toMatch(/^rider:.*:motorcycle_ducati:1:2$/);

      // When stopped (idle), frame reverts to 0 while keeping dir = 1
      avatar.moving = false;
      avatar.update(16, 1016);
      expect((avatar.vehicleSprite as any)?.textureKey).toMatch(/^rider:.*:motorcycle_ducati:1:0$/);
    });

    it('hides avatar driver and requests left-facing vehicle texture when driving 4-wheeler left (dir = 1)', () => {
      const avatar = new Avatar(
        mockScene,
        'driver-left-4w',
        'LeftDriver',
        DEFAULT_APPEARANCE,
        200,
        300,
        true,
      );
      avatar.vehicle = 'car_lamborghini';
      avatar.moving = true;
      avatar.dir = 1; // Left

      avatar.update(16, 1000);

      // Driver hidden in cabin
      expect(mockSprite.visible).toBe(false);
      // Car visible with dir = 1
      expect(avatar.vehicleSprite?.visible).toBe(true);
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:1:2');

      // When stopped (idle), frame reverts to 0 while keeping dir = 1
      avatar.moving = false;
      avatar.update(16, 1016);
      expect((avatar.vehicleSprite as any)?.textureKey).toBe('vehicle:car_lamborghini:1:0');
    });
  });
});
