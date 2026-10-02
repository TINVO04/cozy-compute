import { expect, test } from '@playwright/test';
import type { Game } from 'phaser';

test('component town attaches the already-connected player and permits keyboard movement', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const id = Date.now().toString(36);
  await page.locator('#name').fill('TownQA' + id);
  await page.locator('#email').fill('town-art-' + id + '@test.local');
  await page.locator('#password').fill('local-art-test-password');
  await page.locator('form button[type=submit]').click();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
  const position = () =>
    page.evaluate(async () => {
      // Reuse the exact module URL (including Vite's version) loaded by the app.
      const url = performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .find((name) => name.includes('/src/game/GameCanvas.tsx'))!;
      const { game } = (await import(url)) as { game: Game };
      return (
        game.scene.getScene('town') as unknown as { getSelfPos: () => { x: number; y: number } | null }
      ).getSelfPos();
    });
  await expect.poll(position).not.toBeNull();
  const before = (await position())!;
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => (await position())!.y - before.y).toBeGreaterThan(40);
  await page.keyboard.up('ArrowDown');
  if (process.env.E2E_SHOTS_DIR)
    await page.screenshot({ path: `${process.env.E2E_SHOTS_DIR}/town-live-game.png` });
  await page.keyboard.press('b');
  await expect(page.locator('.panel')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
