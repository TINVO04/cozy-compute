import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

(async () => {
  console.log('Starting Playwright headless verification for Sprout Lands Farm...');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });

  // 1. Verify all required Sprout Lands asset files exist on disk
  const assets = [
    'public/farm/farm_background_crisp.png',
    'public/farm/sprout/Characters/Free Chicken Sprites.png',
    'public/farm/sprout/Characters/Free Cow Sprites.png',
    'public/farm/sprout/Objects/Basic Plants.png',
    'public/farm/sprout/Tilesets/Grass.png',
    'public/farm/sprout/Tilesets/Water.png',
    'public/farm/sprout/Tilesets/Fences.png',
    'public/farm/sprout/Tilesets/Tilled_Dirt.png',
  ];

  console.log('Checking asset files:');
  for (const rel of assets) {
    const fullPath = path.resolve('apps/web', rel);
    const exists = fs.existsSync(fullPath);
    const size = exists ? fs.statSync(fullPath).size : 0;
    console.log(`  ${rel}: ${exists ? 'EXISTS (' + size + ' bytes)' : 'MISSING'}`);
    if (!exists) throw new Error(`Missing required asset: ${rel}`);
  }

  // 2. Load the background image in browser and verify resolution and rendering
  const bgUrl =
    'file:///' + path.resolve('apps/web/public/farm/farm_background_crisp.png').replace(/\\/g, '/');
  await page.goto(bgUrl);
  const info = await page.evaluate(() => {
    const img = document.querySelector('img');
    return {
      w: img.naturalWidth,
      h: img.naturalHeight,
      complete: img.complete,
    };
  });

  console.log(`Verified Background Canvas: ${info.w}x${info.h}, loaded=${info.complete}`);
  if (info.w !== 1536 || info.h !== 1024) {
    throw new Error(`Background resolution mismatch! Expected 1536x1024, got ${info.w}x${info.h}`);
  }

  // 3. Take a verification screenshot
  const outScreenshot = path.resolve('output/sprout-farm-verified.png');
  await page.screenshot({ path: outScreenshot });
  console.log(`Saved verification screenshot to ${outScreenshot}`);

  await browser.close();
  console.log('All Sprout Lands verification checks PASSED successfully!');
})();
