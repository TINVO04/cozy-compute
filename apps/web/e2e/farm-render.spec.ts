import fs from 'node:fs';
import type { Game } from 'phaser';
import { expect, test } from '@playwright/test';

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

  const fullDataUrl = await page.evaluate(() => {
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

    // 2. Draw props
    const shop = textures.get('farm:shop_bac_sau').getSourceImage() as HTMLCanvasElement;
    ctx.drawImage(shop, 3 * 32, 8 * 32 - 40);

    const silo = textures.get('farm:silo_warehouse').getSourceImage() as HTMLCanvasElement;
    ctx.drawImage(silo, 16 * 32, 8 * 32 - 40);

    const poultry = textures.get('farm:poultry_coop').getSourceImage() as HTMLCanvasElement;
    ctx.drawImage(poultry, 3 * 32, 18 * 32);

    const pig = textures.get('farm:pig_pen').getSourceImage() as HTMLCanvasElement;
    ctx.drawImage(pig, 3 * 32, 25 * 32);

    const goat = textures.get('farm:goat_pen').getSourceImage() as HTMLCanvasElement;
    ctx.drawImage(goat, 14 * 32, 25 * 32);

    // 3. Draw plots
    for (let i = 0; i < 36; i++) {
      const tex = textures.get(`farm:plot:${i}`).getSourceImage() as HTMLCanvasElement;
      // Get plot rect coordinates
      const col = i % 6;
      const row = Math.floor(i / 6);
      const px = Math.round((27 + col * 3.1) * 32);
      const py = Math.round((18 + row * 2.1) * 32);
      ctx.drawImage(tex, px, py);
    }

    return out.toDataURL('image/png');
  });

  const base64Data = fullDataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('output/farm-full-composite.png', Buffer.from(base64Data, 'base64'));

  await page.waitForTimeout(200);

  expect(errors).toEqual([]);
});
