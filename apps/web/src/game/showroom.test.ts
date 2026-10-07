import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  SHOWROOM,
  SHOWROOM_BLOCKERS,
  VEHICLE_DISPLAYS,
  VEHICLES,
  vehicleById,
  showroomDisplayAt,
} from '@cozy/game-data';
import { buildShowroomTexture, SHOWROOM_TEXTURE_KEY } from './showroom-art';
import type Phaser from 'phaser';

describe('Showroom Interior Design & Vehicle Displays', () => {
  beforeEach(() => {
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      imageSmoothingEnabled: false,
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      strokeRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      textAlign: '',
      textBaseline: '',
      font: '',
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
    };
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => (tag === 'canvas' ? mockCanvas : {})),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defines the 640x480 showroom bounds and valid vehicle displays', () => {
    expect(SHOWROOM.width).toBe(640);
    expect(SHOWROOM.height).toBe(480);
    expect(SHOWROOM.spawn).toEqual({ x: 320, y: 416 });

    expect(VEHICLE_DISPLAYS.length).toBe(4);
    for (const d of VEHICLE_DISPLAYS) {
      expect(VEHICLES[d.id]).toBeDefined();
      expect(vehicleById(d.id)).toBeDefined();

      // Displays are cleanly inside the walkable showroom
      expect(d.x).toBeGreaterThan(24);
      expect(d.x).toBeLessThan(616);
      expect(d.y).toBeGreaterThan(72);
      expect(d.y).toBeLessThan(456);

      // Verify interaction radius detects vehicle at its display center
      expect(showroomDisplayAt(d.x, d.y)).toBe(d.id);
    }
  });

  it('keeps the central entrance corridor clear of display blockers', () => {
    for (const d of VEHICLE_DISPLAYS) {
      // Displays are placed in the left and right showroom bays, leaving x=230..410 open
      const inCenterCorridor = d.x > 230 && d.x < 410;
      expect(inCenterCorridor).toBe(false);
    }

    // Verify spawn point is not inside any blocker
    for (const b of SHOWROOM_BLOCKERS) {
      const inside =
        SHOWROOM.spawn.x >= b.x &&
        SHOWROOM.spawn.x <= b.x + b.w &&
        SHOWROOM.spawn.y >= b.y &&
        SHOWROOM.spawn.y <= b.y + b.h;
      expect(inside).toBe(false);
    }
  });

  it('generates the luxury showroom canvas texture without errors', () => {
    let cachedKey = '';
    let registeredCanvas: unknown = null;

    const mockCanvas = {
      width: 640,
      height: 480,
      getContext: vi.fn(() => ({
        fillStyle: '',
        fillRect: vi.fn(),
        strokeStyle: '',
        lineWidth: 1,
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        save: vi.fn(),
        restore: vi.fn(),
      })),
    };
    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockCanvas),
    });

    const mockScene = {
      textures: {
        exists: vi.fn((key: string) => key === cachedKey),
        addCanvas: vi.fn((key: string, canvas: HTMLCanvasElement) => {
          cachedKey = key;
          registeredCanvas = canvas;
          return {} as Phaser.Textures.CanvasTexture;
        }),
      },
    } as unknown as Phaser.Scene;

    const textureKey = buildShowroomTexture(mockScene);
    expect(textureKey).toBe(SHOWROOM_TEXTURE_KEY);
    expect(mockScene.textures.exists).toHaveBeenCalledWith(SHOWROOM_TEXTURE_KEY);
    expect(mockScene.textures.addCanvas).toHaveBeenCalledWith(SHOWROOM_TEXTURE_KEY, expect.anything());
    expect(registeredCanvas).not.toBeNull();

    // Subsequent calls return the cached texture
    const secondCall = buildShowroomTexture(mockScene);
    expect(secondCall).toBe(SHOWROOM_TEXTURE_KEY);
    expect(mockScene.textures.addCanvas).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
