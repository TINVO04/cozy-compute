import { randomUUID } from 'node:crypto';
import { Client, type Room } from 'colyseus.js';
import { expect, test } from '@playwright/test';

type MovementWindow = {
  movementInput: { x: number; y: number };
  movementFrames: { x: number; y: number; direction: number }[];
  movementLayer: { self: { container: { x: number; y: number } } | null };
  movementRoom: Room<{ players: Map<string, { x: number; y: number }> }>;
  movementGame: { destroy: (removeCanvas: boolean) => void };
};

test('real peers stay smooth with delayed movement packets and converge after stopping', async ({ page }) => {
  const origin = process.env.PROXY_SMOKE_URL;
  const api = origin ? origin + '/api' : 'http://127.0.0.1:8787';
  const ws = origin ? origin.replace(/^http/, 'ws') + '/realtime' : 'ws://127.0.0.1:2567';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const register = async () => {
    const response = await page.request.post(api + '/auth/register', {
      data: {
        email: 'movement-' + randomUUID() + '@test.local',
        password: 'movement-test-password',
        displayName: 'Move' + randomUUID().slice(0, 8),
      },
    });
    expect(response.ok()).toBe(true);
    return ((await response.json()) as { token: string }).token;
  };
  const token = await register();
  const peer = await new Client(ws).joinOrCreate('company', { token: await register() });
  peer.onMessage('*', () => undefined);
  try {
    await page.addInitScript((config) => Object.assign(window, { movementConfig: config }), { ws, token });
    await page.goto('/e2e/fixtures/movement.html');
    await page.waitForFunction(() => (window as unknown as MovementWindow).movementLayer?.self);
    await expect.poll(() => (peer.state as { players: { size: number } }).players.size).toBe(2);
    await page.evaluate(() => {
      (window as unknown as MovementWindow).movementInput = { x: 1, y: 0 };
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      (window as unknown as MovementWindow).movementInput = { x: 0, y: 0 };
    });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      (window as unknown as MovementWindow).movementInput = { x: -1, y: 0 };
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      (window as unknown as MovementWindow).movementInput = { x: 0, y: 0 };
    });
    await page.waitForTimeout(1800);
    const result = await page.evaluate(() => {
      const preview = window as unknown as MovementWindow;
      const frames = preview.movementFrames;
      let worstBackward = 0;
      for (let i = 2; i < frames.length; i++) {
        const previous = frames[i - 1]!,
          current = frames[i]!;
        if (
          current.direction &&
          previous.direction === current.direction &&
          frames[i - 2]!.direction === current.direction
        ) {
          worstBackward = Math.max(worstBackward, -(current.x - previous.x) * current.direction);
        }
      }
      const player = preview.movementRoom.state.players.get(preview.movementRoom.sessionId)!;
      const avatar = preview.movementLayer.self!.container;
      return {
        worstBackward,
        error: Math.hypot(player.x - avatar.x, player.y - avatar.y),
        frameCount: frames.length,
        range: Math.max(...frames.map((frame) => frame.x)) - Math.min(...frames.map((frame) => frame.x)),
      };
    });
    expect(result.frameCount).toBeGreaterThan(100);
    expect(result.range).toBeGreaterThan(100);
    expect(result.worstBackward).toBeLessThan(3);
    expect(result.error).toBeLessThan(1);
    expect(errors).toEqual([]);
  } finally {
    await page
      .evaluate(() => {
        const preview = window as unknown as MovementWindow;
        preview.movementGame?.destroy(true);
        void preview.movementRoom?.leave();
      })
      .catch(() => undefined);
    await peer.leave();
  }
});
