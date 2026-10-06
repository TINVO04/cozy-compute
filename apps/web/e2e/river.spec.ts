import { test, expect } from '@playwright/test';

test('river hulls and passengers follow the waves, including reduced motion', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/e2e/fixtures/river.html');
  await page.waitForFunction(() => Boolean(Reflect.get(window, 'riverScene')?.previewBoats?.[0]?.boatSprite));
  const sample = () =>
    page.evaluate(() =>
      Reflect.get(window, 'riverScene').previewBoats.map(
        (boat: {
          boatSprite: { y: number; rotation: number };
          sprite: { rotation: number };
          container: { x: number; y: number };
        }) => ({
          y: boat.boatSprite.y,
          rotation: boat.boatSprite.rotation,
          rider: boat.sprite.rotation,
          worldX: boat.container.x,
          worldY: boat.container.y,
        }),
      ),
    );
  const before = await sample();
  await page.waitForTimeout(800);
  const after = await sample();
  expect(after[0].y).not.toBe(before[0].y);
  for (let i = 0; i < after.length; i++) {
    expect(after[i].rotation).toBe(after[i].rider);
    expect(after[i].worldX).toBe(before[i].worldX);
    expect(after[i].worldY).toBe(before[i].worldY);
  }
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.screenshot({ path: `../../output/river-fishing-${viewport.width}.png` });
  }
  await page.evaluate(() => Reflect.get(window, 'setReducedRiverMotion')(true));
  await expect.poll(async () => (await sample())[0].rotation).toBe(0);
  expect((await sample()).every((boat: { y: number }) => boat.y === -4)).toBe(true);
  expect(errors).toEqual([]);
});
