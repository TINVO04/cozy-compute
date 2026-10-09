import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  SHOWROOM,
  SHOWROOM_BLOCKERS,
  SHOWROOM_PEDESTALS,
  VEHICLE_DISPLAYS,
  VEHICLES,
  vehicleById,
  showroomDisplayAt,
} from '@cozy/game-data';
import {
  buildShowroomTexture,
  populateShowroomElements,
  SHOWROOM_TEXTURE_KEY,
  SHOWROOM_PEDESTAL_WIDTH,
  SHOWROOM_PEDESTAL_HEIGHT,
  SHOWROOM_VEHICLE_SCALE,
} from './showroom-art';
import { useUi } from '../lib/store';
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

  it('confirms showroom pedestals are 136x66 px with scale factor 2x', () => {
    expect(SHOWROOM_PEDESTAL_WIDTH).toBe(136);
    expect(SHOWROOM_PEDESTAL_HEIGHT).toBe(66);
    expect(SHOWROOM_VEHICLE_SCALE).toBe(2);
  });

  it('populates display vehicles on pedestals at scale 2x with pixel-perfect nearest filtering', () => {
    const createdImages: Array<{
      x: number;
      y: number;
      key: string;
      scale: number;
      depth: number;
      filter: number | null;
    }> = [];

    const mockContainer = {
      setDepth: vi.fn().mockReturnThis(),
      add: vi.fn().mockReturnThis(),
    };

    const mockGraphics = {
      fillStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis(),
    };

    const mockText = {
      setOrigin: vi.fn().mockReturnThis(),
    };

    const mockScene = {
      textures: {
        exists: vi.fn(() => true),
        addCanvas: vi.fn(() => ({
          setFilter: vi.fn(),
        })),
      },
      add: {
        image: vi.fn((x: number, y: number, key: string) => {
          const imgRecord = {
            x,
            y,
            key,
            scale: 1,
            depth: 0,
            filter: null as number | null,
          };
          createdImages.push(imgRecord);
          const imgObj = {
            setOrigin: vi.fn().mockReturnThis(),
            setDepth: vi.fn((d: number) => {
              imgRecord.depth = d;
              return imgObj;
            }),
            setScale: vi.fn((s: number) => {
              imgRecord.scale = s;
              return imgObj;
            }),
            texture: {
              setFilter: vi.fn((f: number) => {
                imgRecord.filter = f;
              }),
            },
          };
          return imgObj;
        }),
        container: vi.fn(() => mockContainer),
        graphics: vi.fn(() => mockGraphics),
        text: vi.fn(() => mockText),
      },
      tweens: {
        add: vi.fn(),
      },
    } as unknown as Phaser.Scene;

    populateShowroomElements(mockScene);

    // Verify exactly 4 featured vehicles from VEHICLE_DISPLAYS are populated
    const vehicleImages = createdImages.filter((img) => img.key.startsWith('vehicle:'));
    expect(vehicleImages).toHaveLength(VEICLE_DISPLAYS_COUNT);
    expect(vehicleImages).toHaveLength(4);

    for (const vImg of vehicleImages) {
      expect(vImg.scale).toBe(SHOWROOM_VEHICLE_SCALE);
      expect(vImg.scale).toBe(2);
      expect(vImg.filter).toBe(0); // 0 = Nearest neighbor filter in Phaser
    }

    // Verify positions match VEHICLE_DISPLAYS at (display.x, display.y - 6)
    for (let i = 0; i < VEHICLE_DISPLAYS.length; i++) {
      const display = VEHICLE_DISPLAYS[i]!;
      expect(vehicleImages[i]?.x).toBe(display.x);
      expect(vehicleImages[i]?.y).toBe(display.y - 6);
    }
  });

  it('allocates all 16 unique vehicles across 4 distinct categorized pedestals', () => {
    expect(SHOWROOM_PEDESTALS).toHaveLength(4);

    const allVehicles: string[] = [];
    for (const p of SHOWROOM_PEDESTALS) {
      expect(p.vehicles).toHaveLength(4);
      for (const vId of p.vehicles) {
        expect(VEHICLES[vId]).toBeDefined();
        allVehicles.push(vId);
      }
    }

    // Exactly 16 vehicles with zero duplicates across pedestals
    expect(allVehicles).toHaveLength(16);
    const uniqueVehicles = new Set(allVehicles);
    expect(uniqueVehicles.size).toBe(16);

    // Categories are correctly defined
    expect(SHOWROOM_PEDESTALS[0]?.category).toBe('Siêu xe');
    expect(SHOWROOM_PEDESTALS[1]?.category).toBe('Xe sang & Cơ bắp');
    expect(SHOWROOM_PEDESTALS[2]?.category).toBe('Mô tô PKL');
    expect(SHOWROOM_PEDESTALS[3]?.category).toBe('Xe phố & Xe đạp');
  });

  it('interactively cycles pedestal vehicles via useUi store actions', () => {
    useUi.setState({
      showroomPedestalIndex: 0,
      showroomVehicle: 'car_ferrari_f40',
      showroomPedestalOverrides: {},
    });

    // Initial vehicle on pedestal 0
    expect(useUi.getState().showroomVehicle).toBe('car_ferrari_f40');

    // Cycle forward on pedestal 0 (Ferrari F40 -> Lamborghini SVJ -> Porsche GT3 RS -> Supra MK4)
    useUi.getState().cycleShowroomPedestal(1);
    expect(useUi.getState().showroomPedestalOverrides[0]).toBe('car_lamborghini');
    expect(useUi.getState().showroomVehicle).toBe('car_lamborghini');

    useUi.getState().cycleShowroomPedestal(1);
    expect(useUi.getState().showroomPedestalOverrides[0]).toBe('car_porsche');
    expect(useUi.getState().showroomVehicle).toBe('car_porsche');

    useUi.getState().cycleShowroomPedestal(1);
    expect(useUi.getState().showroomPedestalOverrides[0]).toBe('car_toyota_supra_mk4');
    expect(useUi.getState().showroomVehicle).toBe('car_toyota_supra_mk4');

    // Wrap around
    useUi.getState().cycleShowroomPedestal(1);
    expect(useUi.getState().showroomPedestalOverrides[0]).toBe('car_ferrari_f40');
    expect(useUi.getState().showroomVehicle).toBe('car_ferrari_f40');

    // Cycle backwards
    useUi.getState().cycleShowroomPedestal(-1);
    expect(useUi.getState().showroomPedestalOverrides[0]).toBe('car_toyota_supra_mk4');
    expect(useUi.getState().showroomVehicle).toBe('car_toyota_supra_mk4');
  });
});
const VEICLE_DISPLAYS_COUNT = 4;
