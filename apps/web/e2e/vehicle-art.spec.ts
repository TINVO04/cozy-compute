import { expect, test } from '@playwright/test';
import { CANONICAL_VEHICLE_IDS, vehicleById } from '@cozy/game-data';

test('every canvas fallback frame matches its decoded PNG in a real browser', async ({ page }) => {
  await page.goto('/e2e/fixtures/showroom.html');
  const models = CANONICAL_VEHICLE_IDS.map((id) => ({ id, path: vehicleById(id)!.assetPath! }));
  const results = await page.evaluate(async (models) => {
    const modulePath = '/src/art/vehicle.ts';
    const { vehicleCanvas } = (await import(modulePath)) as typeof import('../src/art/vehicle');
    const differences: string[] = [];
    for (const { id, path } of models) {
      const image = new Image();
      image.src = `/vehicles/${path}/spritesheet.png`;
      await image.decode();
      for (let direction = 0; direction < 4; direction++) {
        for (let frame = 0; frame < 4; frame++) {
          const png = document.createElement('canvas');
          png.width = 48;
          png.height = 40;
          const ctx = png.getContext('2d')!;
          ctx.drawImage(image, frame * 48, direction * 40, 48, 40, 0, 0, 48, 40);
          const expected = ctx.getImageData(0, 0, 48, 40).data;
          const canvas = vehicleCanvas(id, direction, frame);
          const actual = canvas.getContext('2d')!.getImageData(0, 0, 48, 40).data;
          if (actual.some((value, i) => value !== expected[i])) differences.push(`${id}/${direction}/${frame}`);
          const transform = canvas.getContext('2d')!.getTransform();
          if (!transform.isIdentity) differences.push(`${id}: transform leak`);
        }
      }
    }
    return { frames: models.length * 16, differences };
  }, models);
  expect(results).toEqual({ frames: 256, differences: [] });
});

test('showroom retains all four detailed vehicle textures when PNG requests fail', async ({ page }) => {
  await page.route('**/vehicles/**/spritesheet.png', (route) => route.abort());
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/e2e/fixtures/showroom.html');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '../../output/vehicles/showroom-png-offline.png' });
  const textures = await page.evaluate(() => {
    const game = (window as unknown as { showroomPreview: import('phaser').Game }).showroomPreview;
    const scene = game.scene.getScene('showroom');
    return scene.children.list.filter((object) => object.type === 'Image')
      .map((object) => (object as import('phaser').GameObjects.Image).texture)
      .filter((texture) => texture.key.startsWith('vehicle:'))
      .map((texture) => {
        const canvas = texture.getSourceImage() as HTMLCanvasElement;
        return [...canvas.getContext('2d')!.getImageData(0, 0, 48, 40).data].filter((value, i) => i % 4 === 3 && value > 128).length;
      });
  });
  expect(textures).toHaveLength(4);
  expect(textures.every((pixels) => pixels > 180)).toBe(true);
  expect(errors).toEqual([]);
});
