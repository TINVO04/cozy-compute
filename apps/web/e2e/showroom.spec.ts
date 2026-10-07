import type { Game } from 'phaser';
import { expect, test } from '@playwright/test';
import { VEHICLE_DISPLAYS, vehicleById } from '@cozy/game-data';

test.describe('Showroom & Luxury Vehicles E2E', () => {
  test('renders the luxury showroom with real-world vehicle pedestals (Ducati, Mercedes, Lamborghini)', async ({
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
      expect(['Ducati', 'Mercedes-Benz', 'Lamborghini']).toContain(v?.brand);
    }

    // Capture visual screenshot of the luxury showroom and real-world vehicles
    await page.screenshot({ path: '../../output/showroom-luxury-vehicles.png' });
    expect(errors).toEqual([]);
  });
});
