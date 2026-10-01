import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDir = resolve(process.env.E2E_SHOTS_DIR ?? 'test-results');
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto((process.env.E2E_BASE_URL ?? 'http://localhost:5173') + '/e2e/fixtures/interiors.html');
await page.waitForFunction(() => window.interiorPreview?.scene.isActive('company'));
await page.waitForTimeout(700);
await page.screenshot({ path: resolve(outputDir, 'company-preview.png') });
await page.evaluate(() => {
  window.interiorPreview.scene.stop('company');
  window.interiorPreview.scene.start('university');
});
await page.waitForTimeout(700);
await page.keyboard.press('Escape');
await page.screenshot({ path: resolve(outputDir, 'university-preview.png') });
await browser.close();
