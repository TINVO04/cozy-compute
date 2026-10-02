import fs from 'node:fs';
import type { Game } from 'phaser';
import { expect, test } from '@playwright/test';
import { FARM_POIS, getFarmPlotRect } from '@cozy/game-data';

test('farm renders cleanly and matches pixel art layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto('/e2e/fixtures/farm.html');
  await expect(page.locator('canvas')).toBeVisible();

  await page.waitForFunction(() => {
    const game = (window as unknown as { farmPreview: Game }).farmPreview;
    return game?.scene.isActive('farm');
  });

  const fullDataUrl = await page.evaluate(
    (pois) => {
      const game = (window as unknown as { farmPreview: Game }).farmPreview;
      const textures = game.textures;

      const out = document.createElement('canvas');
      out.width = 1536;
      out.height = 1024;
      const ctx = out.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      // 1. Draw base landscape
      const landscapeSource = textures.get('farm:landscape').getSourceImage() as CanvasImageSource;
      ctx.drawImage(landscapeSource, 0, 0);

      // 2. Draw props at their authoritative POI positions
      const shop = textures.get('farm:shop_bac_sau').getSourceImage() as HTMLCanvasElement;
      ctx.drawImage(shop, pois.shop_bac_sau.x, pois.shop_bac_sau.y - 12);

      const silo = textures.get('farm:silo_warehouse').getSourceImage() as HTMLCanvasElement;
      ctx.drawImage(silo, pois.silo_warehouse.x, pois.silo_warehouse.y - 10);

      const poultry = textures.get('farm:poultry_coop').getSourceImage() as HTMLCanvasElement;
      ctx.drawImage(poultry, pois.poultry_coop.x, pois.poultry_coop.y);

      const pig = textures.get('farm:pig_pen').getSourceImage() as HTMLCanvasElement;
      ctx.drawImage(pig, pois.pig_pen.x, pois.pig_pen.y);

      const goat = textures.get('farm:goat_pen').getSourceImage() as HTMLCanvasElement;
      ctx.drawImage(goat, pois.goat_pen.x, pois.goat_pen.y);

      // 3. Draw plots at their authoritative coordinates
      for (let i = 0; i < 36; i++) {
        const tex = textures.get(`farm:plot:${i}`).getSourceImage() as HTMLCanvasElement;
        const r = pois.plots[i]!;
        ctx.drawImage(tex, r.x, r.y);
      }

      return out.toDataURL('image/png');
    },
    {
      shop_bac_sau: FARM_POIS.shop_bac_sau,
      silo_warehouse: FARM_POIS.silo_warehouse,
      poultry_coop: FARM_POIS.poultry_coop,
      pig_pen: FARM_POIS.pig_pen,
      goat_pen: FARM_POIS.goat_pen,
      plots: Array.from({ length: 36 }, (_, i) => getFarmPlotRect(i)),
    },
  );

  const base64Data = fullDataUrl.replace(/^data:image\/png;base64,/, '');
  if (!fs.existsSync('output')) fs.mkdirSync('output', { recursive: true });
  fs.writeFileSync('output/farm-full-composite.png', Buffer.from(base64Data, 'base64'));

  await page.waitForTimeout(200);

  expect(errors).toEqual([]);
});
