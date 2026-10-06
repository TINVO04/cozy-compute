import { expect, test } from '@playwright/test';

test('martial hall renders, accepts hotkeys, traps dialog focus and scales', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/e2e/fixtures/martial.html');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByText('Thể lực 84/100')).toBeVisible();
    await page.keyboard.press('2');
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { martialActions: unknown[] }).martialActions))
      .toContainEqual({ type: 'martial:action', msg: { action: 'cast', skill: 'wave' } });
    await page.getByRole('button', { name: 'Võ đường [E]', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đóng võ đường' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Mời tỷ thí' })).toBeFocused();
    await page.getByRole('button', { name: 'Mời tỷ thí' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Võ đường [E]', exact: true })).toBeFocused();
    if (viewport.width === 1440) {
      await page.evaluate(() => (window as unknown as { martialEffect(): void }).martialEffect());
      await page.screenshot({ path: '../../output/martial-hall-verified.png' });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('eight sword animations finish cleanly with a bounded effect pool', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/e2e/fixtures/martial.html');
  await expect(page.getByText('Thể lực 84/100')).toBeVisible();
  await expect(page.locator('.martial-skills button')).toHaveCount(8);
  for (const skill of ['slash', 'wave', 'spin', 'guard', 'bolt', 'rain', 'step', 'heal']) {
    await page.evaluate(
      (skill) => (window as unknown as { martialEffect(id: string): void }).martialEffect(skill),
      skill,
    );
    // Capture the actual time-dependent summon stage, then the release stage.
    if (skill === 'rain' || skill === 'spin') {
      await page.waitForTimeout(skill === 'rain' ? 650 : 280);
      await page.screenshot({ path: '../../output/martial-' + skill + '-summon.png' });
    }
    await page.waitForTimeout(1600);
  }
  const live = await page.evaluate(() => {
    const scene = (
      window as unknown as { martialScene: { children: { list: { type: string; visible: boolean }[] } } }
    ).martialScene;
    return scene.children.list.filter((o) => o.type === 'Graphics' && o.visible).length;
  });
  expect(live).toBeLessThan(12);
  expect(errors).toEqual([]);
  await page.screenshot({ path: '../../output/martial-hall-v2.png' });
});
