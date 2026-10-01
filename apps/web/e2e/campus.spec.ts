import { expect, test } from '@playwright/test';
import type { Game, GameObjects, Scene } from 'phaser';

type Campus = Scene & {
  activeBubble: GameObjects.Container | null;
  onSelfMove: (x: number, y: number) => void;
};
type Preview = {
  interiorPreview: Game;
  exitRequests: number;
  interiorUi: { getState: () => { toasts: { title: string }[] } };
};

test('full campus renders buildings, outdoor grounds and six NPCs at every viewport', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/e2e/fixtures/interiors.html?room=university');
  await page.waitForFunction(() =>
    (window as unknown as Preview).interiorPreview?.scene.isActive('university'),
  );
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.keyboard.press('Escape');
    const result = await page.evaluate(() => {
      const scene = (window as unknown as Preview).interiorPreview.scene.getScene('university');
      const ground = scene.textures.get('dntu:ground').getSourceImage() as HTMLCanvasElement;
      return {
        width: ground.width,
        height: ground.height,
        buildings: scene.children.list.filter(
          (o) => o.type === 'Image' && (o as GameObjects.Image).texture.key.startsWith('dntu:bldg-'),
        ).length,
        people: scene.children.list.filter((o) => o.type === 'Container').length,
        tweens: scene.tweens.getTweens().length,
      };
    });
    expect(result).toEqual({ width: 1536, height: 1024, buildings: 15, people: 6, tweens: 0 });
  }
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.evaluate(() => {
    const scene = (window as unknown as Preview).interiorPreview.scene.getScene('university');
    scene.cameras.main.setZoom(1).centerOn(768, 512);
  });
  await page.keyboard.press('Escape');
  await page.screenshot({
    path: process.env.E2E_SHOTS_DIR
      ? process.env.E2E_SHOTS_DIR + '/dntu-campus.png'
      : info.outputPath('dntu-campus.png'),
  });
  expect(errors).toEqual([]);
});

test('campus keyboard interactions work at reachable entrances and dialogue closes with Escape', async ({
  page,
}) => {
  await page.goto('/e2e/fixtures/interiors.html?room=university');
  await page.waitForFunction(() =>
    (window as unknown as Preview).interiorPreview?.scene.isActive('university'),
  );
  for (const action of [
    { x: 29.5, y: 17.5, title: 'Thầy Tân' },
    { x: 18.5, y: 16.5, title: 'Minh Khang' },
    { x: 18.5, y: 15.5, title: 'Thư Viện' },
    { x: 7.2, y: 16, title: 'Bóng Đá' },
    { x: 10, y: 24, title: 'Bóng Rổ' },
    { x: 31, y: 22.5, title: 'Trường Quay' },
    { x: 29, y: 6.5, title: 'Khởi Nghiệp' },
    { x: 7, y: 27.5, title: 'Căng Tin' },
    { x: 8, y: 4.6, title: 'Điều Hành' },
    { x: 4.5, y: 4.6, title: 'Fitness' },
    { x: 4.5, y: 9.5, title: 'Ô Tô' },
    { x: 9.5, y: 9.5, title: 'CNC' },
  ]) {
    await page.evaluate(({ x, y }) => {
      const scene = (window as unknown as Preview).interiorPreview.scene.getScene('university');
      Object.assign(scene, {
        layer: { self: { container: { x: x * 32, y: y * 32 } }, setInput() {}, update() {}, destroy() {} },
      });
    }, action);
    await page.keyboard.press('e');
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as Preview).interiorUi.getState().toasts.at(-1)?.title),
      )
      .toContain(action.title);
    await page.keyboard.press('Escape');
    expect(
      await page.evaluate(
        () =>
          ((window as unknown as Preview).interiorPreview.scene.getScene('university') as Campus)
            .activeBubble,
      ),
    ).toBeNull();
  }
});

test('campus exits through both real gates once and never exits from the old classroom coordinate', async ({
  page,
}) => {
  await page.goto('/e2e/fixtures/interiors.html?room=university');
  await page.waitForFunction(() =>
    (window as unknown as Preview).interiorPreview?.scene.isActive('university'),
  );
  for (const y of [20, 13.5]) {
    const exits = await page.evaluate((y) => {
      const preview = window as unknown as Preview;
      const scene = preview.interiorPreview.scene.getScene('university') as Campus;
      scene.onSelfMove(8 * 32, 10 * 32);
      const before = preview.exitRequests;
      for (let i = 0; i < 10; i++) scene.onSelfMove(47 * 32, y * 32);
      return { before, after: preview.exitRequests };
    }, y);
    expect(exits.after).toBe(exits.before + 1);
    expect(exits.before).toBe(y === 20 ? 0 : 1);
    await page.evaluate(() =>
      (window as unknown as Preview).interiorPreview.scene.getScene('university').scene.restart(),
    );
  }
});
