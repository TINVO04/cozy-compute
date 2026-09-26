import { expect, test, type Page } from '@playwright/test';

const shots = process.env.E2E_SHOTS_DIR;
const snap = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
};

test('register, enter town, walk, chat, open core panels', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('favicon') && errors.push(m.text()));

  const id = Date.now().toString(36);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Move into town' })).toBeVisible();
  await snap(page, '01-auth');
  await page.getByLabel('Display name').fill(`e2e_${id}`);
  await page.getByLabel('Email').fill(`e2e-${id}@test.local`);
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Create account and enter town' }).click();

  await expect(page.getByText('Newcomer checklist')).toBeVisible();
  await expect(page.locator('.conn-banner')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator('.balance-coin .balance-value')).toHaveText('300');
  await page.waitForTimeout(800);
  await snap(page, '02-town');

  // walk
  await page.locator('.game-canvas canvas').click({ position: { x: 300, y: 200 } });
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(900);
  await page.keyboard.up('ArrowUp');

  // chat
  await page.getByLabel('Chat message').fill('hello town');
  await page.getByLabel('Chat message').press('Enter');
  await expect(page.locator('.chat-line').last()).toContainText('hello town');
  await page.waitForTimeout(300);
  await snap(page, '03-chat');

  // panels
  await page.getByRole('button', { name: 'Shop' }).click();
  await expect(page.getByRole('heading', { name: 'Clothing' })).toBeVisible();
  await expect(page.locator('.item-card').first()).toBeVisible();
  await snap(page, '04-shop');
  await page.getByRole('tab', { name: 'Furniture' }).first().click();
  await snap(page, '05-furniture');
  await page.getByRole('button', { name: /Close panel/ }).click();

  await page.getByRole('button', { name: 'AI Rewards' }).click();
  await expect(page.getByText('Redemption eligibility')).toBeVisible();
  await snap(page, '06-ai');
  await page.getByRole('button', { name: /Close panel/ }).click();

  await page.getByRole('button', { name: 'Events' }).click();
  await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
  await snap(page, '07-events');
  await page.getByRole('button', { name: /Close panel/ }).click();

  await page.getByRole('button', { name: 'Wardrobe' }).click();
  await page.getByRole('button', { name: 'Hair color 6' }).click();
  await page.getByRole('button', { name: 'Save look' }).click();
  await expect(page.getByText('Look saved')).toBeVisible();
  await snap(page, '08-wardrobe');
  await page.getByRole('button', { name: /Close panel/ }).click();

  // apartment
  await page.getByRole('button', { name: 'Apartment' }).click();
  await expect(page.locator('.location-chip')).toContainText('apartment', { timeout: 15_000 });
  await expect(page.locator('.conn-banner')).toHaveCount(0, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Decorate' }).click();
  await expect(page.getByRole('region', { name: 'Apartment editor' })).toBeVisible();
  await page.locator('.inv-slot').first().click();
  const box = (await page.locator('.game-canvas canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 40);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 - 40);
  await page.waitForTimeout(300);
  await snap(page, '09-editor');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Apartment saved')).toBeVisible();
  await snap(page, '10-apartment');

  expect(errors, errors.join('\n')).toEqual([]);
});
