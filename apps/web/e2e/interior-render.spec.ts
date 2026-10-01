import type { Game, GameObjects, Scene } from 'phaser';
import { expect, test } from '@playwright/test';

type Interior = Scene & {
  activeBubble: GameObjects.Container | null;
  interactionHint: GameObjects.Text | null;
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
    await expect
      .poll(() =>
        page.evaluate((kind) => {
          const scene = (window as unknown as Preview).interiorPreview.scene.getScene(kind) as Interior;
          return scene.interactionHint?.visible && scene.interactionHint.text;
        }, kind),
      )
      .toContain(kind === 'company' ? 'Sprint backlog' : 'Màn hình DNTU');
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

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 800, height: 600 },
]) {
  test(
    'interior layouts fit ' + viewport.width + '×' + viewport.height + ' without overlapping labels',
    async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/e2e/fixtures/interiors.html');
      await page.waitForFunction(() =>
        (window as unknown as Preview).interiorPreview?.scene.isActive('company'),
      );
      for (const kind of ['company', 'university']) {
        if (kind === 'university')
          await page.evaluate(() => {
            const game = (window as unknown as Preview).interiorPreview;
            game.scene.stop('company');
            game.scene.start('university');
          });
        await page.waitForTimeout(650);
        await page.keyboard.press('Escape');
        const layout = await page.evaluate((kind) => {
          const scene = (window as unknown as Preview).interiorPreview.scene.getScene(kind);
          const cam = scene.cameras.main;
          const labels: { x: number; y: number; width: number; height: number }[] = [];
          for (const object of scene.children.list) {
            if (object.type !== 'Container') continue;
            const container = object as GameObjects.Container;
            for (const child of container.list) {
              if (child.type !== 'Text') continue;
              const text = child as GameObjects.Text;
              const bounds = text.getBounds();
              labels.push({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
            }
          }
          return {
            zoom: cam.zoom,
            x: cam.worldView.x,
            y: cam.worldView.y,
            width: cam.worldView.width,
            height: cam.worldView.height,
            labels,
          };
        }, kind);
        expect(Number.isInteger(layout.zoom)).toBe(true);
        expect(layout.x).toBeLessThanOrEqual(0);
        expect(layout.y).toBeLessThanOrEqual(0);
        expect(layout.x + layout.width).toBeGreaterThanOrEqual(512);
        expect(layout.y + layout.height).toBeGreaterThanOrEqual(352);
        expect(layout.labels).toHaveLength(4);
        for (let i = 0; i < layout.labels.length; i++) {
          const a = layout.labels[i]!;
          expect(a.x).toBeGreaterThanOrEqual(32);
          expect(a.x + a.width).toBeLessThanOrEqual(480);
          for (const b of layout.labels.slice(i + 1)) {
            expect(
              a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y,
            ).toBe(false);
          }
        }
        await page.screenshot({ path: testInfo.outputPath(kind + '.png') });
      }
    },
  );
}

for (const kind of ['company', 'university']) {
  test(kind + ' fixtures respond to clicks and dialogue stays within the room', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/e2e/fixtures/interiors.html');
    await page.waitForFunction(() =>
      (window as unknown as Preview).interiorPreview?.scene.isActive('company'),
    );
    if (kind === 'university')
      await page.evaluate(() => {
        const game = (window as unknown as Preview).interiorPreview;
        game.scene.stop('company');
        game.scene.start('university');
      });
    await page.waitForTimeout(600);
    await page.keyboard.press('Escape');
    const fixtures =
      kind === 'company'
        ? [
            { x: 144, y: 32, title: 'Sprint Backlog' },
            { x: 448, y: 55, title: 'Cà Phê' },
            { x: 60, y: 60, title: 'Server Rack' },
          ]
        : [
            { x: 256, y: 28, title: 'Màn Hình' },
            { x: 64, y: 96, title: 'Thư Viện' },
            { x: 448, y: 96, title: 'Huy Chương' },
          ];
    const clickWorld = async (x: number, y: number) => {
      const point = await page.evaluate(
        ({ kind, x, y }) => {
          const scene = (window as unknown as Preview).interiorPreview.scene.getScene(kind);
          const cam = scene.cameras.main;
          const canvas = scene.game.canvas.getBoundingClientRect();
          return {
            x: canvas.left + (x - cam.worldView.x) * cam.zoom,
            y: canvas.top + (y - cam.worldView.y) * cam.zoom,
          };
        },
        { kind, x, y },
      );
      await page.mouse.click(point.x, point.y);
    };
    for (const fixture of fixtures) {
      await clickWorld(fixture.x, fixture.y);
      expect(
        await page.evaluate(() => (window as unknown as Preview).interiorUi.getState().toasts.at(-1)?.title),
      ).toContain(fixture.title);
    }
    const npc =
      kind === 'company' ? { x: 128, y: 186, title: 'Mr. Hải' } : { x: 256, y: 79, title: 'Thầy Tân' };
    await clickWorld(npc.x, npc.y);
    expect(
      await page.evaluate(() => (window as unknown as Preview).interiorUi.getState().toasts.at(-1)?.title),
    ).toBe(npc.title);
    const bounds = await page.evaluate((kind) => {
      const scene = (window as unknown as Preview).interiorPreview.scene.getScene(kind) as Interior;
      const r = scene.activeBubble?.getBounds();
      return r && { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
    }, kind);
    expect(bounds).toBeTruthy();
    expect(bounds!.x).toBeGreaterThanOrEqual(32);
    expect(bounds!.y).toBeGreaterThanOrEqual(72);
    expect(bounds!.right).toBeLessThanOrEqual(480);
    expect(bounds!.bottom).toBeLessThanOrEqual(320);
  });
}
