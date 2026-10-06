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

const redis = new Redis(process.env.REDIS_URL);
async function pos() { return JSON.parse(await redis.hget('positions', user.id)); }
async function walkAxis(axis, target) {
  for (let i=0;i<80;i++) {
    const p = await pos();
    if (!p) { await page.waitForTimeout(300); continue; }
    const diff = target-p[axis];
    if (Math.abs(diff)<9) return;
    const key = axis==='x' ? (diff>0?'d':'a') : (diff>0?'s':'w');
    await page.keyboard.down(key);
    await page.waitForTimeout(Math.min(200,Math.max(45,Math.abs(diff)/150*1000)));
    await page.keyboard.up(key);
    await page.waitForTimeout(1100);
  }
  throw Error('Cannot walk to '+axis+' '+target+' from '+JSON.stringify(await pos()));
}
try {
 await page.goto('http://127.0.0.1:5173');
 await page.getByRole('button',{name:'Cửa hàng xe & gara',exact:true}).waitFor();
 await page.waitForTimeout(1600);
 await walkAxis('x',730); await walkAxis('y',824); await walkAxis('x',624); await walkAxis('y',816);
 console.log('At door', await pos());
 await page.keyboard.press('e');
 await expect(page.getByText('Chào mừng đến Gara Bạc Hà',{exact:true})).toBeVisible({timeout:15000});
 await page.waitForTimeout(1200);
 await page.screenshot({path:'output/showroom-interior.png'});
 await walkAxis('y',220); await walkAxis('x',model==='bicycle_sky'?168:472);
 await page.keyboard.press('e');
 await page.getByRole('button',{name:'Xoay xe',exact:true}).click();
 await page.getByRole('button',{name:'Mua · '+price+' Coin',exact:true}).click();
 await page.getByRole('button',{name:'Chọn xe',exact:true}).click();
 await expect(page.getByRole('button',{name:'Đang chọn',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Ra sân gara · Nhấn V để lên xe',exact:true}).click();
 await expect(page.getByRole('button',{name:'V · Lên xe',exact:true})).toBeEnabled({timeout:15000});
 await page.keyboard.press('v');
 await expect(page.getByRole('button',{name:'V · Xuống xe',exact:true})).toBeVisible();
 await page.waitForTimeout(600);
 await page.screenshot({path:'output/'+model+'-night-lights.png'});
 await page.keyboard.press('v');
 await expect(page.getByRole('button',{name:'V · Lên xe',exact:true})).toBeVisible();
 if(errors.length) throw Error(errors.join(String.fromCharCode(10)));
 console.log('PASS: physical entry, showroom walking, rotate, buy, equip, exit, mount hint and mount/dismount');
} catch(e) {
 console.log('Errors',errors);
 console.log((await page.locator('body').innerText()).slice(-3200));
 await page.screenshot({path:'output/showroom-error.png'});
 throw e;
} finally {redis.disconnect(); await browser.close();}
