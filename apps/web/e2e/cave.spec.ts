import { expect, test } from '@playwright/test';
test('cave entrance, five floors and effects render at supported resolutions', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/e2e/fixtures/cave.html');
  await page.waitForFunction(() =>
    (
      window as unknown as { cavePreview: { scene: { isActive(key: string): boolean } } }
    ).cavePreview?.scene.isActive('cave'),
  );
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    for (const floor of [0, 1, 2, 3, 4, 5]) {
      await page.evaluate((f) => (window as unknown as { showFloor(f: number): void }).showFloor(f), floor);
      await expect(page.locator('canvas')).toHaveAttribute('width', String(size.width));
      await page.waitForTimeout(120);
      if (size.width === 1280)
        await page.screenshot({ path: '../../output/cave-v2-floor-' + floor + '.png' });
    }
  }
  await page.evaluate(() => {
    const preview = window as unknown as { showEffect(e: object): void };
    for (const kind of ['slash', 'hit', 'hurt', 'defeat', 'mine', 'loot'])
      preview.showEffect({ kind, x: 480, y: 320, amount: 12, label: 'Tinh thể' });
  });
  await page.waitForTimeout(1500);
  await expect(page.getByRole('button', { name: /3 · Liên hoa kiếm/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /2 · Kiếm khí/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /4 · Kim chung tráo/ })).toBeDisabled();
  await page.getByRole('button', { name: /3 · Liên hoa kiếm/ }).click();
  await page.keyboard.press('8');
  expect(await page.evaluate(() => (window as unknown as { sent: object[] }).sent)).toEqual(
    expect.arrayContaining([
      { type: 'cave:action', action: 'cast', skill: 'spin' },
      { type: 'cave:action', action: 'cast', skill: 'heal' },
    ]),
  );
  for (const reduced of [false, true]) {
    await page.evaluate((r) => {
      const p = window as unknown as { setReduced(r: boolean): void; showMartial(e: object): void };
      p.setReduced(r);
      for (const [index, skill] of [
        'slash',
        'wave',
        'spin',
        'guard',
        'bolt',
        'rain',
        'step',
        'heal',
      ].entries())
        p.showMartial({ skill, phase: 'cast', x: 180 + index * 90, y: 320, angle: 0 });
    }, reduced);
    await page.waitForTimeout(120);
    await page.screenshot({ path: '../../output/cave-v2-skills-' + reduced + '.png' });
    await page.waitForTimeout(1200);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const hotbar = await page.getByRole('group', { name: 'Chiêu thức võ đường' }).boundingBox();
  expect(hotbar!.x).toBeGreaterThanOrEqual(0);
  expect(hotbar!.x + hotbar!.width).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
