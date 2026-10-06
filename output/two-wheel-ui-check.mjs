import { chromium, expect } from '../apps/web/node_modules/@playwright/test/index.mjs';
import Redis from '../apps/api/node_modules/ioredis/built/index.js';
import pg from '../apps/api/node_modules/pg/lib/index.js';
const model = process.argv[2] ?? 'bicycle_sky';
const price = model === 'bicycle_sky' ? 200 : 700;
const stamp = Date.now();
const response = await fetch('http://127.0.0.1:8787/auth/register', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    email: `vehicle-qa-${stamp}@test.local`,
    password: 'Vehicle-test-2026!',
    displayName: `XeQA${String(stamp).slice(-6)}`,
  }),
});
if (!response.ok) throw Error('register ' + response.status);
const { token, user } = await response.json();
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query('BEGIN');
await db.query('UPDATE balances SET coin=coin+5000 WHERE user_id=$1', [user.id]);
await db.query(
  "INSERT INTO ledger_entries(user_id,currency,amount,balance_after,reason_type) SELECT user_id,'coin',5000,coin,'vehicle_qa_grant' FROM balances WHERE user_id=$1",
  [user.id],
);
await db.query('COMMIT');
await db.end();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('requestfailed', (r) => console.log('FAILED', r.url(), r.failure()?.errorText));
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((token) => {
  localStorage.setItem('cozy.session', token);
  localStorage.setItem('cozy.muted', '1');
}, token);
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: 'Cửa hàng xe & gara', exact: true }).waitFor({ timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Lên xe (V)', exact: true })).toBeEnabled();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Cửa hàng xe & gara', exact: true }).click();
  await page.getByRole('button', { name: `Mua · ${price} Coin`, exact: true }).click();
  await page.getByRole('button', { name: 'Chọn xe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang chọn', exact: true })).toBeVisible();
  await page.screenshot({ path: `output/${model}-shop.png` });
  await page.keyboard.press('Escape');
  const redis = new Redis(process.env.REDIS_URL);
  await page.waitForTimeout(400);
  // Spawn positions vary; align with the unobstructed path beside the showroom.
  for (let i = 0; i < 20; i++) {
    const pos = JSON.parse(await redis.hget('positions', user.id));
    if (pos.x >= 710 && pos.x <= 750) break;
    const key = pos.x < 710 ? 'd' : 'a';
    await page.keyboard.down(key);
    await page.waitForTimeout(100);
    await page.keyboard.up(key);
    await page.waitForTimeout(350);
  }
  await page.keyboard.down('s');
  try {
    const until = Date.now() + 6000;
    while (Date.now() < until) {
      const raw = await redis.hget('positions', user.id);
      const pos = raw && JSON.parse(raw);
      if (pos?.y >= 816) break;
      await new Promise((r) => setTimeout(r, 30));
    }
  } finally {
    await page.keyboard.up('s');
  }
  await page.waitForTimeout(300);
  for (let i = 0; i < 12; i++) {
    const pos = JSON.parse(await redis.hget('positions', user.id));
    if (pos.y >= 848 && pos.y <= 880) break;
    const key = pos.y < 848 ? 's' : 'w';
    await page.keyboard.down(key);
    await page.waitForTimeout(100);
    await page.keyboard.up(key);
    await page.waitForTimeout(350);
  }
  console.log('Before mount', await redis.hget('positions', user.id));
  redis.disconnect();
  await page.keyboard.press('v');
  await expect(page.getByRole('button', { name: 'Xuống xe (V)', exact: true })).toBeVisible();
  await page.keyboard.down('d'); await page.waitForTimeout(300); await page.keyboard.up('d');
  await page.screenshot({ path: `output/${model}-riding.png` });
  await page.keyboard.press('v');
  await expect(page.getByRole('button', { name: 'Lên xe (V)', exact: true })).toBeVisible();
  console.log('Purchase, equip, walk to road, mount and dismount UI passed');
  if (errors.length) throw Error(errors.join('\n'));
} catch (e) {
  console.log('Browser errors', errors);
  console.log((await page.locator('body').innerText()).slice(0, 2200));
  await page.screenshot({ path: `output/${model}-error.png` });
  throw e;
} finally {
  await browser.close();
}
