import { randomUUID } from 'node:crypto';
import { Client } from 'colyseus.js';
import { expect, test } from '@playwright/test';

test('production proxy serves the SPA, authenticated API and multiplayer over the same origin', async ({
  page,
}) => {
  const base = process.env.PROXY_SMOKE_URL;
  test.skip(!base, 'Start the isolated Docker smoke stack and set PROXY_SMOKE_URL.');
  const origin = base!;
  const ws = origin.replace(/^http/, 'ws');
  for (const path of ['/api/readyz', '/realtime/readyz']) {
    const response = await page.request.get(`${origin}${path}`);
    expect(response.ok()).toBe(true);
  }
  const version = await page.request.get(`${origin}/version.txt`);
  expect((await version.text()).trim()).toBe('ci-smoke');
  for (const path of ['/internal/session', '/api/internal/session', '/api/metrics', '/realtime/metrics']) {
    expect((await page.request.get(`${origin}${path}`)).status()).toBe(404);
  }
  const adminPage = await page.request.get(`${origin}/admin/models`, { headers: { accept: 'text/html' } });
  expect(adminPage.ok()).toBe(true);
  expect(adminPage.headers()['content-type']).toContain('text/html');
  expect((await page.request.get(`${origin}/api/admin/models`)).status()).toBe(401);

  const register = async () => {
    const response = await page.request.post(`${origin}/api/auth/register`, {
      data: {
        email: `proxy-${randomUUID()}@test.local`,
        password: 'correct horse battery',
        displayName: `Proxy${randomUUID().slice(0, 8)}`,
      },
    });
    expect(response.ok()).toBe(true);
    return (await response.json()) as { token: string };
  };
  const owner = await register(),
    visitor = await register();
  const peer = await new Client(`${ws}/realtime`).joinOrCreate<{ players: { size: number } }>('town', {
    token: visitor.token,
  });
  peer.onMessage('*', () => undefined);
  try {
    await page.addInitScript((token) => localStorage.setItem('cozy.session', token), owner.token);
    const socket = page.waitForEvent('websocket', (socket) => socket.url().startsWith(`${ws}/realtime/`));
    await page.goto(origin);
    await socket;
    await expect(page.locator('canvas')).toBeVisible();
    await expect.poll(() => peer.state.players?.size ?? 0, { timeout: 20_000 }).toBe(2);
    const me = await page.request.get(`${origin}/api/me`, {
      headers: { authorization: `Bearer ${owner.token}` },
    });
    expect(me.ok()).toBe(true);
    expect((await me.json()).balances.coin).toBe(300);
    await page.reload();
    await expect.poll(() => peer.state.players?.size ?? 0, { timeout: 20_000 }).toBe(2);
  } finally {
    await peer.leave();
  }
});
