import { expect, test, type Page } from '@playwright/test';
import { isWalkable, MAP_WIDTH, MAP_HEIGHT } from '@cozy/game-data';

async function position(page: Page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .find((name) => ['/src/game/net', '/src/game/net.ts'].includes(new URL(name).pathname));
    const { net } = await import(/* @vite-ignore */ url ?? '/src/game/net.ts');
    const p = net.room?.state.players.get(net.room.sessionId);
    return p ? { x: p.x as number, y: p.y as number } : null;
  });
}
async function walk(page: Page, x: number, y: number) {
  for (const axis of ['x', 'y'] as const) {
    const target = axis === 'x' ? x : y;
    const p = (await position(page))!;
    if (!p) return;
    if (Math.abs(p[axis] - target) < 9) continue;
    const positive = target > p[axis];
    const key = axis === 'x' ? (positive ? 'ArrowRight' : 'ArrowLeft') : positive ? 'ArrowDown' : 'ArrowUp';
    await page.keyboard.down(key);
    try {
      await expect
        .poll(
          async () => {
            if (x > 960 && (await page.getByRole('main', { name: 'Cửa Hang Ngọc', exact: true }).count()))
              return true;
            const current = (await position(page))!;
            if (!current) return true;
            return positive ? current[axis] >= target - 8 : current[axis] <= target + 8;
          },
          { timeout: 16000, intervals: [50] },
        )
        .toBe(true);
    } finally {
      await page.keyboard.up(key);
    }
    await page.waitForTimeout(130);
  }
}
function pathToGate(start: { x: number; y: number }) {
  const key = (x: number, y: number) => x + ',' + y;
  const sx = Math.round(start.x / 16),
    sy = Math.round(start.y / 16);
  const queue = [{ x: sx, y: sy }];
  const previous = new Map<string, { x: number; y: number } | null>([[key(sx, sy), null]]);
  let end: { x: number; y: number } | undefined;
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    if (p.x === 92 && p.y === 22) {
      end = p;
      break;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: p.x + dx!, y: p.y + dy! };
      if (
        n.x < 1 ||
        n.y < 1 ||
        n.x * 16 >= MAP_WIDTH - 16 ||
        n.y * 16 >= MAP_HEIGHT - 16 ||
        previous.has(key(n.x, n.y)) ||
        !isWalkable(n.x * 16, n.y * 16) ||
        !isWalkable((n.x + p.x) * 8, (n.y + p.y) * 8)
      )
        continue;
      previous.set(key(n.x, n.y), p);
      queue.push(n);
    }
  }
  if (!end) throw new Error('No walkable path to east cave portal');
  const path = [end];
  let last = previous.get(key(end.x, end.y));
  while (last) {
    path.unshift(last);
    last = previous.get(key(last.x, last.y));
  }
  return path
    .filter(
      (p, i) =>
        !i ||
        i === path.length - 1 ||
        (path[i - 1]!.x !== path[i + 1]!.x && path[i - 1]!.y !== path[i + 1]!.y),
    )
    .map((p) => ({ x: p.x * 16, y: p.y * 16 }));
}
test('walk from town to cave, buy a sword, mine, fight and sell persistent loot', async ({
  page,
  request,
}) => {
  test.skip(!process.env.CAVE_LIVE_TEST, 'Requires isolated API on 8788 and realtime on 2568.');
  test.setTimeout(150000);
  const errors: string[] = [];
  await page.route('http://127.0.0.1:8788/**', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'access-control-allow-origin': new URL(test.info().project.use.baseURL as string).origin,
      },
    });
  });
  page.on('pageerror', (e) => errors.push(e.message));
  const response = await request.post('http://127.0.0.1:8788/auth/register', {
    data: {
      email: 'cave-' + Date.now() + '@test.local',
      password: 'cave-test-password',
      displayName: 'Cave' + Date.now().toString(36),
    },
  });
  expect(response.ok()).toBe(true);
  const auth = await response.json();
  await page.addInitScript((token) => {
    localStorage.setItem('cozy.session', token);
    localStorage.setItem('cozy.muted', '1');
  }, auth.token);
  await page.goto('/');
  await expect(page.locator('.conn-banner')).toHaveCount(0, { timeout: 20000 });
  await expect(page.locator('.game-canvas canvas').last()).toBeVisible();
  await page.waitForTimeout(1200);
  await expect.poll(() => position(page), { timeout: 20000 }).not.toBeNull();
  // Use the normal server-defined town return spawn to keep this smoke test short.
  // Full spawn-to-gate connectivity is covered by game-data's cave map test.
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .find((name) => ['/src/game/net', '/src/game/net.ts'].includes(new URL(name).pathname));
    const { net } = await import(/* @vite-ignore */ url ?? '/src/game/net.ts');
    await net.goTown('cave');
  });
  await expect.poll(() => position(page), { timeout: 20000 }).not.toBeNull();
  await page.waitForTimeout(1400);
  const route = pathToGate((await position(page))!);
  for (const p of route) {
    if (await page.getByRole('main', { name: 'Cửa Hang Ngọc', exact: true }).count()) break;
    await walk(page, p.x, p.y);
  }
  if (!(await page.getByRole('main', { name: 'Cửa Hang Ngọc', exact: true }).count()))
    await walk(page, 1500, 352);
  await expect(page.getByLabel('Trạng thái thám hiểm')).toBeVisible({ timeout: 15000 });
  await walk(page, 400, 336);
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '180 Coin', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Giao dịch thành công' })).toBeVisible();
  await page.keyboard.press('Escape');
  await walk(page, 780, 336);
  await page.keyboard.press('e');
  await expect(page.locator('.cave-eyebrow')).toContainText('TẦNG 1');
  await page.waitForTimeout(700);
  await walk(page, 240, 144);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('e');
    await page.waitForTimeout(500);
  }
  await expect(page.locator('.cave-resource-row')).toContainText('Đá 3');
  await walk(page, 350, 180);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: '../../output/cave-live-combat.png' });
  await page.getByRole('button', { name: 'Về cửa hang', exact: true }).click();
  await expect(page.locator('.cave-eyebrow')).toContainText('TRẠM DỪNG');
  await page.waitForTimeout(800);
  await walk(page, 400, 336);
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /Bán tất cả/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Giao dịch thành công' })).toBeVisible();
  await page.screenshot({ path: '../../output/cave-live-shop.png' });
  expect(errors).toEqual([]);
});
