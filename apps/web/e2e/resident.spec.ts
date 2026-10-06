import { expect, test } from '@playwright/test';
import { RESIDENT_QUESTS, RESIDENT_RECIPES } from '@cozy/game-data';
test('resident journal, kitchen and keyboard remain usable on narrow and desktop viewports', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let cooked = false;
  await page.route('**/api/resident', (route) =>
    route.fulfill({
      json: {
        quests: RESIDENT_QUESTS.map((q) => ({ ...q, progress: 0, claimed: false })),
        recipes: RESIDENT_RECIPES.map((r) => ({ ...r, unlocked: true })),
        order: null,
      },
    }),
  );
  await page.route('**/api/farm/me', (route) =>
    route.fulfill({
      json: {
        animals: [],
        pondFishes: [],
        warehouse: {
          items: [
            ...RESIDENT_RECIPES[0].ingredients.map((i) => ({ itemId: i.id, quantity: 10 })),
            { itemId: RESIDENT_RECIPES[0].output, quantity: cooked ? 1 : 0 },
          ],
        },
      },
    }),
  );
  await page.route('**/api/kitchen', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ kind: 'cook', id: 'egg_rice' });
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    cooked = true;
    await route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/aquarium/*', (route) => route.fulfill({ json: { fish: [], trophies: [] } }));
  await page.route('**/api/bida/records', (route) =>
    route.fulfill({ json: { leaderboard: [], history: [] } }),
  );
  await page.route('**/api/community', (route) =>
    route.fulfill({ json: { fishing: [], homes: [], votedFor: null } }),
  );
  await page.route('**/api/party', (route) =>
    route.fulfill({ json: { id: null, members: [], messages: [], invites: [] } }),
  );
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/e2e/fixtures/resident.html');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Một ngày tự lập')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Bếp & giao món', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cơm trứng cà chua' })).toBeVisible();
    await page.getByRole('button', { name: 'Nấu món', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Nhận giao', exact: true }).first()).toBeEnabled();
    await page.getByRole('button', { name: 'Khu phố & tổ đội', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Tạo tổ đội' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toHaveAttribute('data-closed', 'true');
  }
  expect(errors).toEqual([]);
});
