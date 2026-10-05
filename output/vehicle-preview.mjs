import { chromium } from '../apps/web/node_modules/@playwright/test/index.mjs';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto('http://127.0.0.1:5173/e2e/fixtures/town.html');
await page.waitForFunction(() => window.townPreview?.scene.isActive('town'));
await page.evaluate(async () => {
  const scene = window.townPreview.scene.getScene('town');
  scene.cameras.main.setZoom(3).centerOn(624, 740);
  const { ensureVehicleTexture } = await import('/src/art/vehicle.ts');
  scene.add.image(625, 864, ensureVehicleTexture(scene, 'car_mint', 2)).setDepth(866);
});
await page.screenshot({ path: 'output/vehicle-showroom.png' });
await page.evaluate(() =>
  window.townPreview.scene.getScene('town').cameras.main.setZoom(3).centerOn(1072, 352),
);
await page.screenshot({ path: 'output/vehicle-intersection.png' });
await browser.close();
