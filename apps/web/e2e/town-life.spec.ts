import { expect, test } from '@playwright/test';
import type Phaser from 'phaser';
import type { TownLifeSimulation } from '@cozy/game-data';

type Preview = Phaser.Scene & { sim: TownLifeSimulation; player: { x: number; y: number } };
declare global {
  interface Window {
    lifePreview: Preview;
  }
}

test('vendors converse, kittens move, pigeons flee and settle, scene cleans up', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/e2e/fixtures/town-life.html');
  await page.waitForFunction(() => window.lifePreview?.sim.actors.length >= 15);
  const start = await page.evaluate(() =>
    window.lifePreview.sim.actors.filter((a) => a.kind === 'cat').map((a) => [a.x, a.y]),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.lifePreview.sim.actors.filter((a) => a.kind === 'cat').map((a) => [a.x, a.y]),
      ),
    )
    .not.toEqual(start);
  await page.evaluate(() => {
    const scene = window.lifePreview;
    for (let i = 0; i < 200; i++) scene.sim.update(50, i * 50, []);
    const vendor = scene.sim.actors.find((a) => a.kind === 'vendor')!;
    scene.player.x = vendor.x;
    scene.player.y = vendor.y + 45;
    scene.cameras.main.centerOn(vendor.x, vendor.y);
  });
  await expect(page.getByRole('button', { name: /Trò chuyện với/ })).toBeVisible();
  await page.keyboard.press('e');
  await expect(page.getByRole('status')).not.toBeEmpty();
  await expect
    .poll(() => page.evaluate(() => window.lifePreview.sim.actors.find((a) => a.kind === 'vendor')!.mode))
    .toBe('talking');
  await page.screenshot({ path: '../../output/town-life-vendor.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('status')).toBeEmpty();
  await page.evaluate(() => {
    const scene = window.lifePreview;
    const bird = scene.sim.actors.find((a) => a.kind === 'pigeon')!;
    scene.player.x = bird.x;
    scene.player.y = bird.y;
    scene.cameras.main.centerOn(768, 550);
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.lifePreview.sim.actors
          .filter((a) => a.kind === 'pigeon' && a.variant === 0)
          .every((a) => a.mode === 'flying' && a.altitude > 10),
      ),
    )
    .toBe(true);
  await page.screenshot({ path: '../../output/town-life-flock.png' });
  await page.evaluate(() => {
    window.lifePreview.player.x = 1200;
    window.lifePreview.player.y = 400;
  });
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          window.lifePreview.sim.actors
            .filter((a) => a.kind === 'pigeon')
            .every((a) => a.mode === 'feeding' && a.altitude === 0),
        ),
      { timeout: 10000 },
    )
    .toBe(true);
  const before = await page.evaluate(
    () => window.lifePreview.children.list.filter((o) => o.name.startsWith('town-life:')).length,
  );
  expect(before).toBe(await page.evaluate(() => window.lifePreview.sim.actors.length));
  await page.evaluate(() => window.lifePreview.scene.restart());
  await expect.poll(() => page.locator('button').count()).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.lifePreview.children.list.filter((o) => o.name.startsWith('town-life:')).length,
      ),
    )
    .toBe(15);
  expect(errors).toEqual([]);
});

test('passing vendors enter at a gate and disappear from rendering after leaving town', async ({ page }) => {
  await page.goto('/e2e/fixtures/town-life.html');
  await page.waitForFunction(() => window.lifePreview?.sim.actors.some((a) => a.kind === 'vendor'));
  const visit = await page.evaluate(() => {
    const a = window.lifePreview.sim.actors.find((a) => a.kind === 'vendor')!;
    return { id: a.id, x: a.x };
  });
  expect(visit.x < 0 || visit.x > 1536).toBe(true);
  await page.evaluate(() => {
    const s = window.lifePreview;
    for (let i = 0; i < 400; i++) s.sim.update(50, i * 50, []);
  });
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const a = window.lifePreview.children.getByName(`town-life:${id}`) as Phaser.GameObjects.Container;
        return a && a.x > 32 && a.x < 1504;
      }, visit.id),
    )
    .toBe(true);
  await page.evaluate(() => {
    const s = window.lifePreview;
    for (let i = 0; i < 2400; i++) s.sim.update(50, 20000 + i * 50, []);
  });
  await expect
    .poll(() => page.evaluate((id) => !!window.lifePreview.children.getByName(`town-life:${id}`), visit.id))
    .toBe(false);
  const remaining = await page.evaluate(() => {
    const s = window.lifePreview;
    return {
      actors: s.sim.actors.length,
      views: s.children.list.filter((o) => o.name.startsWith('town-life:')).length,
      vendors: s.sim.actors.filter((a) => a.kind === 'vendor').map((a) => a.id),
    };
  });
  expect(remaining.views).toBe(remaining.actors);
  expect(remaining.vendors).not.toContain(visit.id);
  expect(remaining.vendors.length).toBeGreaterThan(0);
});
