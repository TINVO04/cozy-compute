import type { Game, GameObjects } from 'phaser';
import { expect, test } from '@playwright/test';
import { FARM_GARDEN, FARM_POIS, getFarmPlotRect } from '@cozy/game-data';

for (const [width, height] of [
  [1280, 720],
  [1920, 1080],
  [1440, 900],
  [1536, 1024],
] as const) {
  test(`farm live scene ${width}x${height}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height });
    await page.goto('/e2e/fixtures/farm.html');
    await page.waitForFunction(() =>
      (window as unknown as { farmPreview: Game }).farmPreview?.scene.isActive('farm'),
    );
    const result = await page.evaluate(
      ({ plots, pois }) => {
        const game = (window as unknown as { farmPreview: Game }).farmPreview;
        const scene = game.scene.getScene('farm');
        scene.cameras.main.setZoom(Math.min(innerWidth / 1536, innerHeight / 1024)).centerOn(768, 512);
        const images = scene.children.list.filter((o) => o.type === 'Image') as GameObjects.Image[];
        return {
          terrainLayers: scene.children.list.filter((o) => o.type === 'TilemapLayer').length,
          oldBackground: images.some((o) => o.texture.key === 'farm:landscape'),
          plots: plots.every((r, i) =>
            images.some(
              (o) =>
                o.texture.key === `farm:plot:${i}` &&
                o.x === r.x + r.w / 2 &&
                o.y === r.y + r.h / 2 &&
                o.width === r.w &&
                o.height === r.h,
            ),
          ),
          structures: Object.keys(pois)
            .filter((id) => !['aquaculture_pond', 'crops_field'].includes(id))
            .every((id) => images.some((o) => o.texture.key === `farm:${id}`)),
        };
      },
      { plots: Array.from({ length: 36 }, (_, i) => getFarmPlotRect(i)), pois: FARM_POIS },
    );
    expect(result).toEqual({ terrainLayers: 1, oldBackground: false, plots: true, structures: true });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `../../output/farm-restored-${width}.png` });
    if (width === 1536) {
      await page.screenshot({ path: `../../output/farm-for-tester.png` });
    }
    for (const [p, panel] of [
      [FARM_POIS.shop_bac_sau, 'farm-shop'],
      [FARM_POIS.silo_warehouse, 'farm-silo'],
      [FARM_GARDEN.greenhouse, 'farm-shop'],
    ] as const) {
      const screen = await page.evaluate((p) => {
        const game = (window as unknown as { farmPreview: Game }).farmPreview;
        const camera = game.scene.getScene('farm').cameras.main;
        const origin = camera.getWorldPoint(0, 0);
        return {
          x: (p.x + p.w / 2 - origin.x) * camera.zoom,
          y: (p.y + p.h - 40 - origin.y) * camera.zoom,
        };
      }, p);
      await page.mouse.click(screen.x, screen.y);
      const active = await page.evaluate(
        () => (window as unknown as { farmUi: { getState(): { panel: string } } }).farmUi.getState().panel,
      );
      expect(active).toBe(panel);
    }
    // Both starter beds and unopened meadow beds retain their exact hit areas.
    for (const index of [0, 4, 35]) {
      const r = getFarmPlotRect(index);
      const screen = await page.evaluate((r) => {
        const game = (window as unknown as { farmPreview: Game }).farmPreview;
        const camera = game.scene.getScene('farm').cameras.main;
        const origin = camera.getWorldPoint(0, 0);
        return {
          x: (r.x + r.w / 2 - origin.x) * camera.zoom,
          y: (r.y + r.h / 2 - origin.y) * camera.zoom,
        };
      }, r);
      await page.mouse.click(screen.x, screen.y);
      const active = await page.evaluate(() => {
        const state = (
          window as unknown as {
            farmUi: { getState(): { panel: string; activePlotIndex: number } };
          }
        ).farmUi.getState();
        return { panel: state.panel, index: state.activePlotIndex };
      });
      expect(active).toEqual({ panel: 'farm-plot', index });
    }
    expect(errors).toEqual([]);
  });
}

test('farm estate motion respects accessibility and cleans up when the scene restarts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/e2e/fixtures/farm.html');
  await page.waitForFunction(() =>
    (window as unknown as { farmPreview: Game }).farmPreview?.scene
      .getScene('farm')
      ?.children.getByName('farm:estate:sails'),
  );
  const inspect = () =>
    page.evaluate(() => {
      const scene = (window as unknown as { farmPreview: Game }).farmPreview.scene.getScene('farm');
      const sails = scene.children.getByName('farm:estate:sails') as GameObjects.Image;
      return {
        angle: sails.angle,
        updateListeners: scene.events.listenerCount('update'),
        landmarks: scene.children.list
          .filter((o) => o.name.startsWith('farm:estate:'))
          .map((o) => o.name)
          .sort(),
      };
    });
  const before = await inspect();
  await page.waitForTimeout(300);
  expect((await inspect()).angle).not.toBe(before.angle);
  await page.evaluate(() => {
    (window as unknown as { farmPreview: Game }).farmPreview.scene.getScene('farm').scene.restart();
  });
  await page.waitForTimeout(400);
  const restarted = await inspect();
  expect(restarted.updateListeners).toBe(before.updateListeners);
  expect(restarted.landmarks).toEqual(before.landmarks);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.waitForFunction(() =>
    (window as unknown as { farmPreview: Game }).farmPreview?.scene
      .getScene('farm')
      ?.children.getByName('farm:estate:sails'),
  );
  const still = await inspect();
  await page.waitForTimeout(300);
  expect((await inspect()).angle).toBe(still.angle);
  expect(errors).toEqual([]);
});
