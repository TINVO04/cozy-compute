import { expect, test } from '@playwright/test';
import { fishingConditions, resolveEffectiveTelemetry } from '@cozy/game-data';

test('fishing shows server conditions and locks them for the current cast', async ({ page }) => {
  const dawn = fishingConditions(
    resolveEffectiveTelemetry({ enabled: true, solarHour: 6, condition: 'rain' }, null),
  );
  const night = fishingConditions(
    resolveEffectiveTelemetry({ enabled: true, solarHour: 22, condition: 'clear' }, null),
  );
  await page.route('**/world/weather', (route) => route.fulfill({ json: dawn.weather }));
  await page.route('**/activities/fishing/conditions', (route) => route.fulfill({ json: dawn }));
  await page.route('**/activities/fishing/start', (route) =>
    route.fulfill({
      json: {
        runId: 'weather-run',
        nonce: 'nonce',
        biteInMs: 60000,
        reactionWindowMs: 1400,
        shadowTier: 1,
        nibbleCount: 0,
        nibbleOffsetsMs: [],
        nibbleOrbitTurns: [],
        shadowDelayMs: 5000,
        conditions: night,
      },
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/e2e/fixtures/fishing.html');
  const conditions = page.getByLabel('Điều kiện câu cá');
  await expect(conditions).toContainText('06:00');
  await expect(conditions).toContainText('Mưa nhẹ/vừa');
  await page.getByRole('button', { name: /Quăng cần/ }).click();
  await expect(conditions).toContainText('22:00');
  await expect(conditions).toContainText('Ban đêm');
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 375, height: 667 },
  ]) {
    await page.setViewportSize(viewport);
    const bounds = await conditions.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  }
  await page.keyboard.press('Escape');
  await expect(conditions).not.toBeVisible();
  expect(errors).toEqual([]);
});
