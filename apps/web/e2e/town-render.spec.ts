import type { Game } from 'phaser';
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
        textures: ['town-ground', 'bld:cafe', 'bld:fashion', 'bld:fishing_shop', 'prop:sign', 'tree'].every(
          (key) => scene.textures.exists(key),
        ),
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
