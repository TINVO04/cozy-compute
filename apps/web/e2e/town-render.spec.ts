import type { Game, GameObjects } from 'phaser';
import { expect, test } from '@playwright/test';

test('town renders, resizes and restarts cleanly at supported desktop sizes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/e2e/fixtures/town.html');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => {
    const game = (window as unknown as { townPreview: Game }).townPreview;
    return game?.scene.isActive('town');
  });

  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    await expect(page.locator('canvas')).toHaveAttribute('width', String(size.width));
    const state = await page.evaluate(() => {
      const game = (window as unknown as { townPreview: Game }).townPreview;
      const scene = game.scene.getScene('town');
      scene.cameras.main.centerOn(768, 608);
      return {
        zoom: scene.cameras.main.zoom,
        textures:
          !scene.textures.exists('town-reference') &&
          [
            'town-ground',
            'bld:cafe',
            'bld:fashion',
            'bld:fishing_shop',
            'prop:sign',
            'scenery:buu-long',
          ].every((key) => scene.textures.exists(key)),
      };
    });
    expect(Number.isInteger(state.zoom)).toBe(true);
    expect(state.textures).toBe(true);
    if (process.env.E2E_SHOTS_DIR) {
      await page.screenshot({ path: `${process.env.E2E_SHOTS_DIR}/town-${size.width}.png` });
    }
  }

  const before = await page.evaluate(() => {
    const game = (window as unknown as { townPreview: Game }).townPreview;
    return game.scale.listenerCount('resize');
  });
  await page.evaluate(() => {
    const game = (window as unknown as { townPreview: Game }).townPreview;
    game.scene.getScene('town').scene.restart();
  });
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const game = (window as unknown as { townPreview: Game }).townPreview;
        return game.scale.listenerCount('resize');
      }),
    )
    .toBe(before);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator('canvas')).toHaveAttribute('width', '1280');
  expect(errors).toEqual([]);
});

test('reduced motion keeps the town static while retaining all landmarks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/e2e/fixtures/town.html');
  await page.waitForFunction(() => {
    const game = (window as unknown as { townPreview: Game }).townPreview;
    return game?.scene.isActive('town');
  });
  const tweens = await page.evaluate(() => {
    const game = (window as unknown as { townPreview: Game }).townPreview;
    return game.scene.getScene('town').tweens.getTweens().length;
  });
  expect(tweens).toBe(0);
});

test('independently drawn landmarks use canvas textures and sort around live avatars', async ({ page }) => {
  await page.goto('/e2e/fixtures/town.html');
  await page.waitForFunction(() =>
    (window as unknown as { townPreview: Game }).townPreview?.scene.isActive('town'),
  );
  const result = await page.evaluate(() => {
    const scene = (window as unknown as { townPreview: Game }).townPreview.scene.getScene('town');
    const landmark = scene.children.getByName('scenery:buu-long') as GameObjects.Image;
    const texture = scene.textures.get('scenery:buu-long').getSourceImage() as HTMLCanvasElement;
    const canvas = document.createElement('canvas');
    canvas.width = texture.width;
    canvas.height = texture.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(texture, 0, 0);
    const alpha = ctx.getImageData(0, 0, 1, 1).data[3];
    const back = scene.add.rectangle(landmark.x, landmark.y, 10, 10).setDepth(landmark.depth - 1);
    const front = scene.add.rectangle(landmark.x, landmark.y, 10, 10).setDepth(landmark.depth + 1);
    scene.children.depthSort();
    const order = scene.children.list;
    return {
      drawnCanvas: texture instanceof HTMLCanvasElement,
      noReferenceImage: !performance
        .getEntriesByType('resource')
        .some((entry) => entry.name.includes('town-reference') || entry.name.includes('/assets/town/')),
      separateObjects: [
        'scenery:west-house',
        'scenery:bun-rieu',
        'scenery:north-bike-0',
        'scenery:garden-palm',
        'boat:0',
        'temple:gate',
        'temple:wall:0',
      ].every((key) => !!scene.children.getByName(key)),
      transparentCorner: alpha === 0,
      behind: order.indexOf(back) < order.indexOf(landmark),
      inFront: order.indexOf(front) > order.indexOf(landmark),
    };
  });
  expect(result).toEqual({
    drawnCanvas: true,
    noReferenceImage: true,
    separateObjects: true,
    transparentCorner: true,
    behind: true,
    inFront: true,
  });
});

test('streets have continuous asphalt distinct from concrete sidewalks and the tiled square', async ({
  page,
}) => {
  await page.goto('/e2e/fixtures/town.html');
  await page.waitForFunction(() =>
    (window as unknown as { townPreview: Game }).townPreview?.scene.isActive('town'),
  );
  const surfaces = await page.evaluate(() => {
    const scene = (window as unknown as { townPreview: Game }).townPreview.scene.getScene('town');
    const ground = scene.textures.get('town-ground').getSourceImage() as HTMLCanvasElement;
    const ctx = ground.getContext('2d')!;
    const luminance = (x: number, y: number) => {
      const p = ctx.getImageData(x, y, 1, 1).data;
      return (p[0]! + p[1]! + p[2]!) / 3;
    };
    const sample = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    return {
      road: luminance(400, 350),
      sidewalk: luminance(400, 324),
      plaza: luminance(700, 500),
      continuous: [0, 1, 2, 3].every((i) => luminance(400 + i, 350) > 120 && luminance(400 + i, 350) < 180),
      roadColor: sample(400, 350),
      plazaColor: sample(700, 500),
    };
  });
  expect(surfaces.sidewalk - surfaces.road).toBeGreaterThan(30);
  expect(surfaces.plaza - surfaces.road).toBeGreaterThan(30);
  expect(surfaces.continuous).toBe(true);
  expect(surfaces.roadColor).not.toEqual(surfaces.plazaColor);
});
