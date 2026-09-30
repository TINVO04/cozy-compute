import type { Game, GameObjects, Scene } from 'phaser';
import { expect, test } from '@playwright/test';

type Interior = Scene & {
  activeBubble: GameObjects.Container | null;
  onSelfMove: (x: number, y: number) => void;
};
type Preview = {
  interiorPreview: Game;
  exitRequests: number;
  interiorUi: { getState: () => { toasts: { title: string }[] } };
};

for (const kind of ['company', 'university']) {
  test(kind + ' supports keyboard interaction, reduced motion and one-shot exits', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/e2e/fixtures/interiors.html');
    await page.waitForFunction(() =>
      (window as unknown as Preview).interiorPreview?.scene.isActive('company'),
    );
    await page.evaluate((kind) => {
      const preview = window as unknown as Preview;
      if (kind !== 'company') {
        preview.interiorPreview.scene.stop('company');
        preview.interiorPreview.scene.start(kind);
      }
    }, kind);
    await page.waitForTimeout(600);
    const tweens = await page.evaluate(
      (kind) => (window as unknown as Preview).interiorPreview.scene.getScene(kind).tweens.getTweens().length,
      kind,
    );
    expect(tweens).toBe(0);
    await page.evaluate((kind) => {
      const scene = (window as unknown as Preview).interiorPreview.scene.getScene(kind);
      Object.assign(scene, {
        layer: {
          self: { container: { x: kind === 'company' ? 4.5 * 32 : 8 * 32, y: 3.2 * 32 } },
          setInput() {},
          update() {},
          destroy() {},
        },
      });
    }, kind);
    await page.keyboard.press('Escape');
    expect(
      await page.evaluate(
        (kind) =>
          (window as unknown as Preview).interiorPreview.scene.getScene(kind) &&
          ((window as unknown as Preview).interiorPreview.scene.getScene(kind) as Interior).activeBubble ===
            null,
        kind,
      ),
    ).toBe(true);
    await page.keyboard.press('e');
    const titles = await page.evaluate(() =>
      (window as unknown as Preview).interiorUi.getState().toasts.map((toast) => toast.title),
    );
    expect(titles.some((title) => title.includes(kind === 'company' ? 'Sprint Backlog' : 'Màn Hình'))).toBe(
      true,
    );
    const exits = await page.evaluate((kind) => {
      const preview = window as unknown as Preview;
      const scene = preview.interiorPreview.scene.getScene(kind) as Interior;
      for (let i = 0; i < 10; i++) scene.onSelfMove(8 * 32, 10 * 32);
      return preview.exitRequests;
    }, kind);
    expect(exits).toBe(1);
    await page.evaluate(
      (kind) => (window as unknown as Preview).interiorPreview.scene.getScene(kind).scene.restart(),
      kind,
    );
    await page.waitForTimeout(600);
    expect(errors).toEqual([]);
  });
}
