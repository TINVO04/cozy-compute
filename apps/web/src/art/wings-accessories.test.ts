import { describe, expect, it, vi } from 'vitest';
import { ITEM_SEEDS, type Appearance } from '@cozy/game-data';
import { appearanceKey, AV_FRAME_H, AV_FRAME_W, avatarSheet, drawAvatar } from './avatar';

describe('Wings and Sparkly Accessories Art & Data', () => {
  it('seeds all 8 requested wings and luxury accessories in ITEM_SEEDS', () => {
    const ids = [
      'face_starlight_pin',
      'hat_diamond_crown',
      'back_wings_angel',
      'back_wings_fairy',
      'back_wings_cyber',
      'back_wings_demon',
      'back_sparkle_aura',
      'back_magic_orb',
    ];

    for (const id of ids) {
      const item = ITEM_SEEDS.find((it) => it.id === id);
      expect(item, `Item ${id} should exist in ITEM_SEEDS`).toBeDefined();
      expect(item?.type).toBe('clothing');
      expect(item?.coinPrice).toBeGreaterThan(0);
    }

    const angel = ITEM_SEEDS.find((it) => it.id === 'back_wings_angel');
    expect(angel?.slot).toBe('back');
    expect(angel?.rarity).toBe('legendary');
    expect(angel?.coinPrice).toBe(6800);

    const fairy = ITEM_SEEDS.find((it) => it.id === 'back_wings_fairy');
    expect(fairy?.slot).toBe('back');
    expect(fairy?.rarity).toBe('epic');

    const cyber = ITEM_SEEDS.find((it) => it.id === 'back_wings_cyber');
    expect(cyber?.slot).toBe('back');
    expect(cyber?.rarity).toBe('epic');

    const demon = ITEM_SEEDS.find((it) => it.id === 'back_wings_demon');
    expect(demon?.slot).toBe('back');
    expect(demon?.rarity).toBe('legendary');

    const aura = ITEM_SEEDS.find((it) => it.id === 'back_sparkle_aura');
    expect(aura?.slot).toBe('back');
    expect(aura?.rarity).toBe('legendary');

    const orb = ITEM_SEEDS.find((it) => it.id === 'back_magic_orb');
    expect(orb?.slot).toBe('back');
    expect(orb?.rarity).toBe('epic');

    const crown = ITEM_SEEDS.find((it) => it.id === 'hat_diamond_crown');
    expect(crown?.slot).toBe('hat');
    expect(crown?.rarity).toBe('sovereign');
    expect(crown?.coinPrice).toBe(9999);

    const pin = ITEM_SEEDS.find((it) => it.id === 'face_starlight_pin');
    expect(pin?.slot).toBe('face');
    expect(pin?.rarity).toBe('rare');
    expect(pin?.coinPrice).toBe(880);
  });

  it('appearanceKey includes back slot and distinguishes appearances', () => {
    const base: Appearance = {
      skin: 0,
      hairStyle: 'short',
      hairColor: 0,
      baseTop: 0,
    };
    const withAngel: Appearance = {
      ...base,
      back: 'wings_angel:#facc15',
    };
    const withFairy: Appearance = {
      ...base,
      back: 'wings_fairy:#67e8f9',
    };

    expect(appearanceKey(base)).not.toBe(appearanceKey(withAngel));
    expect(appearanceKey(withAngel)).not.toBe(appearanceKey(withFairy));
    expect(appearanceKey(withAngel)).toContain('wings_angel:#facc15');
  });

  it('drawAvatar renders with all 4 mythical wings and back auras across all 4 directions', () => {
    const base: Appearance = {
      skin: 1,
      hairStyle: 'short',
      hairColor: 2,
      baseTop: 0,
    };

    const backItems = [
      'wings_angel:#facc15',
      'wings_fairy:#67e8f9',
      'wings_cyber:#06b6d4',
      'wings_demon:#9333ea',
      'sparkle_aura:#fef08a',
      'magic_orb:#c084fc',
    ];

    for (const back of backItems) {
      for (const dir of [0, 1, 2, 3] as const) {
        const app: Appearance = { ...base, back };
        const grid = drawAvatar(app, dir, 0);
        expect(grid.w).toBe(16);
        expect(grid.h).toBe(28);

        // Verify pixels exist
        let colored = 0;
        for (let y = 0; y < grid.h; y++) {
          for (let x = 0; x < grid.w; x++) {
            if (grid.get(x, y)) colored++;
          }
        }
        expect(colored).toBeGreaterThan(40);
      }
    }
  });

  it('drawAvatar renders diamond crown and starlight pin correctly across all directions', () => {
    for (const dir of [0, 1, 2, 3] as const) {
      const app: Appearance = {
        skin: 1,
        hairStyle: 'short',
        hairColor: 1,
        baseTop: 0,
        hat: 'diamond_crown:#67e8f9',
        face: 'starlight_pin:#ffd700',
      };

      const grid = drawAvatar(app, dir, 0);
      expect(grid.w).toBe(16);
      expect(grid.h).toBe(28);

      let colored = 0;
      for (let y = 0; y < grid.h; y++) {
        for (let x = 0; x < grid.w; x++) {
          if (grid.get(x, y)) colored++;
        }
      }
      expect(colored).toBeGreaterThan(40);
    }
  });

  it('avatarSheet creates properly dimensioned spritesheet with expanded 48x56 frames for all wings', () => {
    expect(AV_FRAME_W).toBe(48);
    expect(AV_FRAME_H).toBe(56);

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      bezierCurveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      ellipse: vi.fn(),
      roundRect: vi.fn(),
      rotate: vi.fn(),
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
    };

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => (tag === 'canvas' ? { ...mockCanvas } : {})),
    });

    const wings = [
      'wings_angel:#facc15',
      'wings_fairy:#67e8f9',
      'wings_cyber:#06b6d4',
      'wings_demon:#9333ea',
    ];

    for (const back of wings) {
      const app: Appearance = {
        skin: 0,
        hairStyle: 'short',
        hairColor: 0,
        baseTop: 0,
        back,
      };
      const sheet = avatarSheet(app);
      expect(sheet.width).toBe(48 * 3);
      expect(sheet.height).toBe(56 * 4);
    }

    vi.unstubAllGlobals();
  });

  it('riddenVehicleCanvas renders two-wheelers with showWings: false so wings do not bake at 0.42x scale', async () => {
    const chibiModule = await import('./chibi');
    const { riddenVehicleCanvas } = await import('./rider');
    const drawSpy = vi.spyOn(chibiModule, 'drawChibiAvatar');

    const mockCtx = new Proxy({} as unknown as CanvasRenderingContext2D, {
      get: (_target, prop) => {
        if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
          return vi.fn(() => ({ addColorStop: vi.fn() }));
        }
        return vi.fn();
      },
      set: () => true,
    });
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
    };
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => (tag === 'canvas' ? { ...mockCanvas } : {})),
    });

    const app: Appearance = {
      skin: 0,
      hairStyle: 'short',
      hairColor: 0,
      baseTop: 0,
      back: 'wings_angel:#facc15',
    };

    drawSpy.mockClear();
    riddenVehicleCanvas(app, 'motorcycle_ducati', 1, 0);

    expect(drawSpy).toHaveBeenCalled();
    for (const call of drawSpy.mock.calls) {
      expect(call[2]?.showWings).toBe(false);
    }

    drawSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
