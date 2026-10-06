import { APARTMENT_THEMES, ITEM_SEEDS } from '@cozy/game-data';
import { expect, test, type Page } from '@playwright/test';
import type { Game } from 'phaser';

declare global {
  interface Window {
    apartmentPreview: Game;
  }
}

async function ready(page: Page) {
  await page.waitForFunction(() => window.apartmentPreview?.scene.isActive('apartment'));
}

test('apartment keeps its entire shell visible, renders every theme and restarts without stale objects', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/e2e/fixtures/apartment.html');
  await ready(page);
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    await expect(page.locator('canvas')).toHaveAttribute('width', String(size.width));
    const view = await page.evaluate(() => {
      const scene = window.apartmentPreview.scene.getScene('apartment');
      const cam = scene.cameras.main;
      return {
        zoom: cam.zoom,
        visible: cam.worldView.contains(-12, -48) && cam.worldView.contains(396, 304),
        tweens: scene.tweens.getTweens().length,
      };
    });
    expect(Number.isInteger(view.zoom)).toBe(true);
    expect(view.visible).toBe(true);
    expect(view.tweens).toBe(0);
  }
  for (const theme of APARTMENT_THEMES) {
    await page.evaluate(
      (themeId) =>
        window.apartmentPreview.events.emit('apartment:render', { themeId, objects: [], editing: false }),
      theme.id,
    );
    expect(
      await page.evaluate((id) => window.apartmentPreview.textures.exists(`apt-floor:${id}`), theme.id),
    ).toBe(true);
  }
  const items = ITEM_SEEDS.filter((i) => i.type === 'furniture').map((i) => ({ ...i, size: i.size! }));
  for (const rotation of [0, 90, 180, 270]) {
    await page.evaluate(
      ({ items, rotation }) =>
        window.apartmentPreview.events.emit('apartment:render', {
          themeId: 'lilac',
          editing: false,
          objects: items.map((i) => ({ itemId: i.id, x: 1, y: 1, rotation, size: i.size, sprite: i.sprite })),
        }),
      { items, rotation },
    );
    expect(
      await page.evaluate(
        ({ items, rotation }) =>
          items.every((i) =>
            window.apartmentPreview.textures.exists(`furn:${i.sprite}:${i.size.w}x${i.size.h}:${rotation}`),
          ),
        { items, rotation },
      ),
    ).toBe(true);
  }
  const before = await page.evaluate(() => window.apartmentPreview.scale.listenerCount('resize'));
  await page.evaluate(() => window.apartmentPreview.scene.getScene('apartment').scene.restart());
  await expect
    .poll(() => page.evaluate(() => window.apartmentPreview.scale.listenerCount('resize')))
    .toBe(before);
  await ready(page);
  expect(errors).toEqual([]);
});

const catalog = ITEM_SEEDS.filter((i) => i.type === 'furniture').map((i) => ({
  ...i,
  price: i.coinPrice,
  owned: 1,
  wished: false,
  equipped: false,
}));
const initialObjects = ['furn_rug_checker', 'furn_sofa'].map((id) => {
  const item = ITEM_SEEDS.find((i) => i.id === id)!;
  return { itemId: id, sprite: item.sprite, size: item.size, name: item.name, x: 1, y: 4, rotation: 0 };
});

async function routeApartment(page: Page) {
  let apartment = {
    id: 'fixture-apt',
    ownerId: 'fixture-owner',
    ownerName: 'Test',
    name: 'Góc chill',
    themeId: 'lilac',
    published: true,
    isOwner: true,
    score: 20,
    visits: 0,
    grid: { cols: 12, rows: 9 },
    objects: initialObjects,
  };
  await page.route('**/shop', (route) => route.fulfill({ json: catalog }));
  await page.route('**/apartments/fixture-owner', (route) => route.fulfill({ json: apartment }));
  await page.route('**/apartments/me', async (route) => {
    apartment = { ...apartment, ...route.request().postDataJSON() };
    await route.fulfill({ json: { score: 30 } });
  });
}

test('real editor places, rotates, picks furniture above rugs, undoes and saves using keyboard', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await routeApartment(page);
  await page.goto('/e2e/fixtures/apartment-editor.html');
  await ready(page);
  await page.getByRole('button', { name: 'Trang trí', exact: true }).click();
  await page.getByRole('tab', { name: 'Góc Gen Z', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Ghế Lười Capy/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Ghế Gỗ/ })).toHaveCount(0);
  await page.getByRole('button', { name: /^Xe Snack/ }).click();
  await page.keyboard.press('r');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('e');
  await page.keyboard.press('Escape');
  // Move the placement cursor to the sofa on top of the rug and pick up only the sofa.
  await page.evaluate(() => window.apartmentPreview.events.emit('apartment:hover', { x: 1, y: 4 }));
  await page.keyboard.press('e');
  await expect(page.locator('.editor-selection[role="status"]')).toContainText('Sofa');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('e');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+Shift+z');
  await page.getByLabel('Chủ đề căn hộ').selectOption('matcha');
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size);
    const bar = page.getByRole('region', { name: 'Chỉnh sửa căn hộ' });
    await expect(bar).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const cam = window.apartmentPreview.scene.getScene('apartment').cameras.main;
          const bar = document.querySelector('.editor-bar')!.getBoundingClientRect();
          const canvas = document.querySelector('canvas')!.getBoundingClientRect();
          const top = (-48 - cam.worldView.y) * cam.zoom + canvas.top;
          const bottom = (304 - cam.worldView.y) * cam.zoom + canvas.top;
          return top >= canvas.top && bottom < bar.top;
        }),
      )
      .toBe(true);
    if (process.env.E2E_SHOTS_DIR)
      await page.screenshot({ path: `${process.env.E2E_SHOTS_DIR}/editor-${size.width}.png` });
  }
  const request = page.waitForRequest((r) => r.url().endsWith('/apartments/me') && r.method() === 'PUT');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  const body = (await request).postDataJSON();
  expect(body.themeId).toBe('matcha');
  expect(body.objects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ itemId: 'furn_snack_cart', rotation: 90 }),
      expect.objectContaining({ itemId: 'furn_rug_checker', x: 1, y: 4 }),
      expect.objectContaining({ itemId: 'furn_sofa', x: 1, y: 6 }),
    ]),
  );
  await expect(page.getByRole('button', { name: 'Trang trí', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('visitor renders saved objects and refreshes when the room layout changes', async ({ page }) => {
  await routeApartment(page);
  await page.goto('/e2e/fixtures/apartment-editor.html?guest');
  await ready(page);
  await expect(page.getByText('Góc chill · 2 món trang trí')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trang trí', exact: true })).toHaveCount(0);
  const refresh = page.waitForRequest((r) => r.url().endsWith('/apartments/fixture-owner'));
  await page.evaluate(() => window.apartmentPreview.events.emit('apartment:layout-changed'));
  await refresh;
});
