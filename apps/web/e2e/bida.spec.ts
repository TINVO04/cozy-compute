import { expect, test } from '@playwright/test';
type Fixture = {
  sent: { type: string; data: unknown }[];
  emit(type: string, data: unknown): void;
  match: { status: string; balls: unknown[]; turn: string; score1: number; score2: number };
  net: { room: unknown; onRoomMessage(type: string, handler: (data: unknown) => void): () => void };
  fakeRoom: unknown;
  callbacks: Map<string, Set<(data: unknown) => void>>;
};

test('online waiting table disables shots, server settles and closing leaves exactly once', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/e2e/fixtures/bida.html');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => {
    const f = (window as unknown as { bidaFixture: Fixture }).bidaFixture;
    f.emit('bida:table_joined', f.match);
  });
  await expect(page.getByRole('status')).toContainText('Đang chờ');
  await page.keyboard.press('Space');
  expect(
    await page.evaluate(() =>
      (window as unknown as { bidaFixture: Fixture }).bidaFixture.sent.filter((s) => s.type === 'bida:shot'),
    ),
  ).toHaveLength(0);
  await page.evaluate(() => {
    const f = (window as unknown as { bidaFixture: Fixture }).bidaFixture;
    f.emit('bida:table_start', { ...f.match, status: 'playing' });
  });
  await expect(page.getByRole('button', { name: 'Đánh Cơ (Space)' })).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  expect(
    await page.evaluate(() =>
      (window as unknown as { bidaFixture: Fixture }).bidaFixture.sent.filter((s) => s.type === 'bida:shot'),
    ),
  ).toHaveLength(1);
  await page.evaluate(() => {
    const f = (window as unknown as { bidaFixture: Fixture }).bidaFixture;
    f.emit('bida:shot_executed', { shooterId: 'host', angle: Math.PI, power: 10 });
    f.emit('bida:turn_changed', {
      turn: 'host',
      scores: { score1: 0, score2: 0 },
      scratch: false,
      balls: f.match.balls,
    });
  });
  await expect(page.getByRole('button', { name: 'Đánh Cơ (Space)' })).toBeVisible();
  await page.keyboard.press('Space');
  expect(
    await page.evaluate(() =>
      (window as unknown as { bidaFixture: Fixture }).bidaFixture.sent.filter((s) => s.type === 'bida:shot'),
    ),
  ).toHaveLength(2);
  await page.getByRole('button', { name: 'Đóng (Esc)' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      (window as unknown as { bidaFixture: Fixture }).bidaFixture.sent.filter(
        (s) => s.type === 'bida:leave_table',
      ),
    ),
  ).toHaveLength(1);
  expect(
    await page.evaluate(() =>
      (window as unknown as { bidaFixture: Fixture }).bidaFixture.sent.filter(
        (s) => s.type === 'bida:shot_settled',
      ),
    ),
  ).toHaveLength(0);
  expect(errors).toEqual([]);
});

test('local solo remains playable while connected and Escape cleans up', async ({ page }) => {
  await page.goto('/e2e/fixtures/bida.html');
  await page.getByRole('button', { name: /Luyện Tập Solo/i }).click();
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() =>
      (window as unknown as { bidaFixture: Fixture }).bidaFixture.sent.filter(
        (s) => s.type === 'bida:shot' || s.type === 'bida:shot_settled',
      ),
    ),
  ).toHaveLength(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      (window as unknown as { bidaFixture: Fixture }).bidaFixture.sent.filter(
        (s) => s.type === 'bida:leave_table',
      ),
    ),
  ).toHaveLength(0);
});

test('message handler registered before room attach unsubscribes after attach', async ({ page }) => {
  await page.goto('/e2e/fixtures/bida.html');
  const counts = await page.evaluate(() => {
    const f = (window as unknown as { bidaFixture: Fixture }).bidaFixture;
    const net = f.net as typeof f.net & { attach(room: unknown): void };
    net.room = null;
    let count = 0;
    const unsub = net.onRoomMessage('fixture:test', () => count++);
    net.attach(f.fakeRoom);
    f.emit('fixture:test', {});
    const before = count;
    unsub();
    f.emit('fixture:test', {});
    return [before, count];
  });
  expect(counts).toEqual([1, 1]);
});
