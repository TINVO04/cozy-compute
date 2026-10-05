import type { Game, GameObjects } from 'phaser';
import { expect, test } from '@playwright/test';
import { FARM_POIS, getFarmPlotRect } from '@cozy/game-data';

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
    for (const [id, panel] of [
      ['shop_bac_sau', 'farm-shop'],
      ['silo_warehouse', 'farm-silo'],
    ] as const) {
      const p = FARM_POIS[id];
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
    expect(errors).toEqual([]);
  });
}
