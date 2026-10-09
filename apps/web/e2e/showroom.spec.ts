import type { Game } from 'phaser';
import { expect, test } from '@playwright/test';
import { CANONICAL_VEHICLE_IDS, SHOWROOM_PEDESTALS, VEHICLE_DISPLAYS, vehicleById } from '@cozy/game-data';

test.describe('Showroom & Luxury Vehicles E2E', () => {
  test('renders and cycles all 16 vehicles across the four showroom categories', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/e2e/fixtures/showroom.html');

    // Wait until showroom scene is active and canvas is visible
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForFunction(() => {
      const g = (window as unknown as { showroomPreview: Game }).showroomPreview;
      return g?.scene.isActive('showroom');
    });

    // Wait a brief moment for assets and tween animations
    await page.waitForTimeout(1000);

    // Verify all 4 spotlight vehicles are present and have valid real-world data
    const vehicleInfo = await page.evaluate(() => {
      const g = (window as unknown as { showroomPreview: Game }).showroomPreview;
      const scene = g.scene.getScene('showroom');
      return {
        hasSpotlights: !!(scene as unknown as { spotlights: unknown }).spotlights,
        hasParticles: !!(scene as unknown as { particles: unknown }).particles,
        imagesCount: scene.children.list.filter((o) => o.type === 'Image').length,
        containersCount: scene.children.list.filter((o) => o.type === 'Container').length,
      };
    });

    expect(vehicleInfo.hasSpotlights).toBe(true);
    expect(vehicleInfo.hasParticles).toBe(true);
    expect(vehicleInfo.imagesCount).toBeGreaterThanOrEqual(4);

    // Verify the 4 premier vehicles on display have real-world brands
    for (const d of VEHICLE_DISPLAYS) {
      const v = vehicleById(d.id);
      expect(v).toBeDefined();
      expect(['Ferrari', 'Rolls-Royce', 'Ducati', 'Vespa']).toContain(v?.brand);
    }

    // Capture visual screenshot of the luxury showroom and real-world vehicles
    const visited: string[] = [];
    for (let selection = 0; selection < 4; selection++) {
      const expected = SHOWROOM_PEDESTALS.map((pedestal) => pedestal.vehicles[selection]!);
      await expect.poll(() => page.evaluate(() => {
        const g = (window as unknown as { showroomPreview: Game }).showroomPreview;
        return g.scene.getScene('showroom').children.list
          .filter((object) => object.type === 'Image')
          .map((object) => (object as unknown as { texture: { key: string } }).texture.key)
          .filter((key) => key.startsWith('vehicle:')).sort();
      })).toEqual(expected.map((id) => `vehicle:${id}:2:0`).sort());
      visited.push(...expected);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `../../output/vehicles/showroom-selection-${selection}.png` });
      await page.evaluate(() => {
        const ui = (window as unknown as { showroomUi: { getState: () => { cycleShowroomPedestal: (direction: 1, index: number) => void } } }).showroomUi;
        for (let index = 0; index < 4; index++) ui.getState().cycleShowroomPedestal(1, index);
      });
    }
    expect(visited.sort()).toEqual([...CANONICAL_VEHICLE_IDS].sort());
    expect(errors).toEqual([]);
  });
});
