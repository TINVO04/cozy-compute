# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cave.spec.ts >> cave entrance, five floors and effects render at supported resolutions
- Location: e2e\cave.spec.ts:2:1

# Error details

```
Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | test('cave entrance, five floors and effects render at supported resolutions', async ({ page }) => {
  3  |   const errors: string[] = [];
  4  |   page.on('pageerror', (e) => errors.push(e.message));
  5  |   await page.goto('/e2e/fixtures/cave.html');
  6  |   await page.waitForFunction(() =>
  7  |     (
  8  |       window as unknown as { cavePreview: { scene: { isActive(key: string): boolean } } }
  9  |     ).cavePreview?.scene.isActive('cave'),
  10 |   );
  11 |   for (const size of [
  12 |     { width: 1280, height: 720 },
  13 |     { width: 1440, height: 900 },
  14 |     { width: 1920, height: 1080 },
  15 |   ]) {
  16 |     await page.setViewportSize(size);
  17 |     for (const floor of [0, 1, 5]) {
> 18 |       await page.evaluate((f) => (window as unknown as { showFloor(f: number): void }).showFloor(f), floor);
     |                  ^ Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
  19 |       await expect(page.locator('canvas')).toHaveAttribute('width', String(size.width));
  20 |       await page.waitForTimeout(120);
  21 |       if (size.width === 1280) await page.screenshot({ path: '../../output/cave-floor-' + floor + '.png' });
  22 |     }
  23 |   }
  24 |   await page.evaluate(() => {
  25 |     const preview = window as unknown as { showEffect(e: object): void };
  26 |     for (const kind of ['slash', 'hit', 'hurt', 'defeat', 'mine', 'loot'])
  27 |       preview.showEffect({ kind, x: 480, y: 320, amount: 12, label: 'Tinh thể' });
  28 |   });
  29 |   await page.waitForTimeout(1500);
  30 |   expect(errors).toEqual([]);
  31 | });
  32 | 
```