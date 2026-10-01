import { expect, test } from '@playwright/test';
import type { Game, GameObjects } from 'phaser';

test('rapid reel inputs submit once and Space preserves the catch result', async ({ page }) => {
  let starts = 0;
  let completions = 0;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/activities/fishing/start', async (route) => {
    starts++;
    await route.fulfill({
      json: {
        runId: 'test-run',
        nonce: 'test-nonce',
        biteInMs: 800,
        reactionWindowMs: 3000,
        shadowTier: 3,
        nibbleCount: 0,
        nibbleOffsetsMs: [],
        nibbleOrbitTurns: [],
        shadowDelayMs: 0,
      },
    });
  });
  await page.route('**/activities/fishing/complete', async (route) => {
    completions++;
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({
      json: {
        outcome: 'caught',
        fish: { id: 'carp', name: 'Cá Chép', rarity: 'common', description: 'Một chú cá của hồ.' },
        sizeCm: 45,
        weightKg: 2,
        coin: 10,
        fame: 1,
      },
    });
  });
  await page.route('**/me', (route) =>
    route.fulfill({
      json: {
        id: 'fishing-fixture',
        appearance: {
          rod: 'rod_twig',
          skin: 1,
          hairStyle: 'short',
          hairColor: 1,
          baseTop: 0,
          heldFish: { speciesId: 'carp', sizeCm: 45 },
        },
      },
    }),
  );
  await page.goto('/e2e/fixtures/fishing.html');
  await expect(page.getByRole('button', { name: /Quăng cần/ })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: /GIẬT NGAY/ })).toBeVisible();
  // Same-frame presses reproduce the race that render-paced clicks miss.
  await page.evaluate(() => {
    for (let i = 0; i < 16; i++) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
    }
  });
  await expect(page.getByRole('status')).toContainText('Đang thu cần');
  await expect(page.getByRole('heading', { name: 'Bạn đã câu được Cá Chép!' })).toBeVisible();
  for (let i = 0; i < 8; i++) await page.keyboard.press('Space');
  await page.getByRole('button', { name: /Cầm cần câu tiếp/ }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(page.getByRole('heading', { name: 'Bạn đã câu được Cá Chép!' })).toBeVisible();
  expect(starts).toBe(1);
  expect(completions).toBe(1);
  if (process.env.E2E_SHOTS_DIR)
    await page.screenshot({ path: process.env.E2E_SHOTS_DIR + '/fishing-caught.png' });
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /Quăng cần/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('early pull explains the miss and remains readable at small sizes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/activities/fishing/start', (route) =>
    route.fulfill({
      json: {
        runId: 'early-run',
        nonce: 'nonce',
        biteInMs: 30000,
        reactionWindowMs: 3000,
        nibbleCount: 0,
        nibbleOffsetsMs: [],
        nibbleOrbitTurns: [],
        shadowDelayMs: 0,
      },
    }),
  );
  await page.route('**/activities/fishing/complete', (route) =>
    route.fulfill({ json: { outcome: 'too_early', message: 'Cá mới chỉ đang rỉa mồi.' } }),
  );
  await page.goto('/e2e/fixtures/fishing.html');
  await page.getByRole('button', { name: /Quăng cần/ }).click();
  await page.getByRole('button', { name: 'Thu cần sớm' }).click();
  await expect(page.getByRole('heading', { name: 'Thu cần khi cá chưa cắn' })).toBeVisible();
  await expect(page.getByText('Phao rung nhẹ là cá đang rỉa mồi.', { exact: false })).toBeVisible();
  await page.keyboard.press('Space');
  for (const size of [
    { width: 1280, height: 720 },
    { width: 375, height: 667 },
    { width: 667, height: 375 },
  ]) {
    await page.setViewportSize(size);
    const card = page.getByRole('region', { name: 'Kết quả câu cá' });
    await expect(card).toBeVisible();
    const bounds = await card.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(size.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height);
    if (process.env.E2E_SHOTS_DIR)
      await page.screenshot({ path: process.env.E2E_SHOTS_DIR + '/fishing-miss-' + size.width + '.png' });
  }
});

for (const scenario of ['late', 'no-reel'] as const) {
  test('miss feedback explains ' + scenario + ' and held Space cannot finish a catch', async ({ page }) => {
    await page.route('**/activities/fishing/start', (route) =>
      route.fulfill({
        json: {
          runId: 'timeout-run',
          nonce: 'nonce',
          biteInMs: 500,
          reactionWindowMs: scenario === 'late' ? 600 : 3000,
          nibbleCount: 0,
          nibbleOffsetsMs: [],
          nibbleOrbitTurns: [],
          shadowDelayMs: 0,
        },
      }),
    );
    await page.goto('/e2e/fixtures/fishing.html');
    await page.getByRole('button', { name: /Quăng cần/ }).click();
    await expect(page.getByRole('button', { name: /GIẬT NGAY/ })).toBeVisible();
    if (scenario === 'no-reel') {
      await page.keyboard.press('Space');
      await expect(page.getByRole('button', { name: /GIẬT DÂY/ })).toBeVisible();
      await page.evaluate(() => {
        for (let i = 0; i < 20; i++)
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: ' ', code: 'Space', repeat: true, bubbles: true }),
          );
      });
    }
    await expect(page.getByRole('heading', { name: 'Cá đã thoát mất!' })).toBeVisible();
    await expect(
      page.getByText(scenario === 'late' ? 'Bạn đã giật cần quá chậm' : 'Lực giật không đủ nhanh', {
        exact: false,
      }),
    ).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.getByRole('heading', { name: 'Cá đã thoát mất!' })).toBeVisible();
    await page.getByRole('button', { name: /Cầm cần câu tiếp/ }).click();
    await expect(page.getByRole('button', { name: /Quăng cần/ })).toBeVisible();
  });
}

test('all six fish shadow tiers render without graphics errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/e2e/fixtures/fishing.html?shadows');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => {
    const preview = (window as unknown as { fishingPreview: Game }).fishingPreview;
    return preview?.scene
      .getScene('town')
      .children.list.some((child) => (child as GameObjects.Text).depth === 10002);
  });
  if (process.env.E2E_SHOTS_DIR)
    await page.screenshot({ path: process.env.E2E_SHOTS_DIR + '/fish-shadows.png' });
  expect(errors).toEqual([]);
});
