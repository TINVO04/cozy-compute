import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
page.on('websocket', (ws) => {
  logs.push('ws open ' + ws.url());
  ws.on('close', () => logs.push('ws close'));
  ws.on('socketerror', (e) => logs.push('ws err ' + e));
});
page.on('requestfailed', (r) => logs.push('reqfail ' + r.url() + ' ' + r.failure()?.errorText));
page.on('response', (r) => {
  if (r.url().includes('2567')) logs.push('resp ' + r.status() + ' ' + r.url());
});
await page.goto('http://localhost:5173/');
const id = Date.now().toString(36);
await page.getByLabel('Display name').fill('dbg_' + id);
await page.getByLabel('Email').fill('dbg-' + id + '@t.local');
await page.getByLabel('Password').fill('correct horse battery');
await page.getByRole('button', { name: 'Create account and enter town' }).click();
await page.waitForTimeout(6000);
console.log(logs.join('\n'));
await browser.close();
