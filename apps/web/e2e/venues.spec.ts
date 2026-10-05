import { expect, test } from '@playwright/test';
import type { Game, Scene, GameObjects } from 'phaser';

type Preview = {
  interiorPreview: Game;
  exitRequests: number;
  interiorUi: { getState(): { zoom: number; setZoom(value: number): void; toasts: { title: string }[] } };
};

for (const kind of ['comga', 'bida', 'cybernet']) {
  test(kind + ' renders its own venue, supports zoom and exits once', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/e2e/fixtures/interiors.html');
    await page.waitForFunction(() =>
      (window as unknown as Preview).interiorPreview?.scene.isActive('company'),
    );
    await page.evaluate((kind) => {
      const preview = window as unknown as Preview;
      preview.interiorPreview.scene.stop('company');
      preview.interiorPreview.scene.start(kind);
    }, kind);
    await page.waitForFunction(
      (kind) => (window as unknown as Preview).interiorPreview.scene.isActive(kind),
      kind,
    );
    const result = await page.evaluate((kind) => {
      const preview = window as unknown as Preview;
      const scene = preview.interiorPreview.scene.getScene(kind) as Scene & {
        onSelfMove(x: number, y: number): void;
      };
      const textures = scene.children.list
        .filter((o) => o.type === 'Image')
        .map((o) => (o as GameObjects.Image).texture.key);
      const before = scene.cameras.main.zoom;
      preview.interiorUi.getState().setZoom(1.3);
      const after = scene.cameras.main.zoom;
      for (let i = 0; i < 10; i++)
        scene.onSelfMove((kind === 'comga' ? 7 : 8) * 32, (kind === 'comga' ? 9.5 : 10.5) * 32);
      return { before, after, textures, exits: preview.exitRequests };
    }, kind);
    expect(result.textures).toContain(kind + ':interior');
    if (kind === 'cybernet') expect(result.textures).not.toContain('bida:interior');
    expect(result.after).toBeGreaterThan(result.before);
    expect(result.exits).toBe(1);
    expect(errors).toEqual([]);
  });
}
