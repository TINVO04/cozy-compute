import { expect, test } from '@playwright/test';
import type { Appearance, FishSpecies } from '@cozy/game-data';
import type { Game, Scene } from 'phaser';

interface ArtFixture {
  FISH: FishSpecies[];
  FISH_3D_ASSETS: Record<string, string>;
  DEFAULT_APPEARANCE: Appearance;
  getHDFishCanvas: (
    speciesId: string,
    width: number,
    height: number,
    silhouette?: boolean,
  ) => HTMLCanvasElement;
  preloadFishArt: () => Promise<void[]>;
  chibiAvatarFull: (appearance: Appearance, width: number, height: number) => string;
}

test('higher tiers filter the admin catalog and retain distinct collectible identities', async ({ page }) => {
  await page.goto('/e2e/fixtures/fish-art.html?admin');
  const filter = page.getByRole('combobox', { name: 'Lọc bậc cá' });
  await filter.selectOption('defiant');
  await expect(page.getByRole('checkbox', { name: 'Cá Chép Tổng Tài Bất Ổn', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Cá Kiếm Hư Không Đế Quân', exact: true })).toHaveCount(0);
  await filter.selectOption('sovereign');
  await expect(page.getByRole('checkbox', { name: 'Cá Kiếm Hư Không Đế Quân', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Cá Chép Tổng Tài Bất Ổn', exact: true })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Kraken Nhật Thực Bá Chủ', exact: true })).toBeVisible();
});

test('sovereign art effects respect reduced motion while keeping a visible static aura', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/e2e/fixtures/fish-art.html?variants');
  await expect(page.locator('[data-species]')).toHaveCount(8);
  await expect(page.getByText('Chờ ảnh biến thể · tạm dùng ảnh gốc')).toHaveCount(0);
  const image = page.locator('[data-species="swordfish_void"] img');
  await expect(image).toBeVisible();
  const style = await image.evaluate((element) => ({
    animation: getComputedStyle(element).animationName,
    filter: getComputedStyle(element).filter,
  }));
  expect(style.animation).toBe('none');
  expect(style.filter).toContain('drop-shadow');
  if (process.env.E2E_SHOTS_DIR)
    await page.screenshot({ path: process.env.E2E_SHOTS_DIR + '/higher-tiers-gallery.png', fullPage: true });
});

test('registered fish use their rendered assets in the shared canvas and gallery', async ({ page }) => {
  await page.goto('/e2e/fixtures/fish-art.html');
  const results = await page.evaluate(async () => {
    const api = (window as unknown as { fishArtTest: ArtFixture }).fishArtTest;
    await api.preloadFishArt();
    const results = [];
    for (const fish of api.FISH.filter((f) => api.FISH_3D_ASSETS[f.id])) {
      const source = api.FISH_3D_ASSETS[fish.id];
      if (!source) throw new Error('Missing rendered artwork: ' + fish.id);
      const image = new Image();
      image.src = source;
      await image.decode();
      const actual = api.getHDFishCanvas(fish.id, 600, 360);
      const expected = document.createElement('canvas');
      expected.width = actual.width;
      expected.height = actual.height;
      const ctx = expected.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const fit = Math.min(actual.width / image.naturalWidth, actual.height / image.naturalHeight);
      const width = image.naturalWidth * fit;
      const height = image.naturalHeight * fit;
      ctx.drawImage(image, (actual.width - width) / 2, (actual.height - height) / 2, width, height);
      results.push({ id: fish.id, source, same: actual.toDataURL() === expected.toDataURL() });
    }
    return results;
  });
  const coverage = await page.evaluate(() => {
    const api = (window as unknown as { fishArtTest: ArtFixture }).fishArtTest;
    return {
      registered: Object.keys(api.FISH_3D_ASSETS).length,
      missingLegendary: api.FISH.filter((f) => f.rarity === 'legendary' && !api.FISH_3D_ASSETS[f.id]).map(
        (f) => f.id,
      ),
      missingVariants: api.FISH.filter((f) => f.variantOf && !api.FISH_3D_ASSETS[f.id]).map((f) => f.id),
    };
  });
  expect(results).toHaveLength(coverage.registered);
  expect(coverage.missingLegendary).toEqual([]);
  expect(coverage.missingVariants).toEqual([]);
  for (const result of results) {
    expect(result.same, result.id).toBe(true);
    await expect(page.locator('[data-species="' + result.id + '"] img')).toHaveAttribute(
      'src',
      result.source,
    );
  }
});

test('every collectible renders a detailed illustration with transparent edges', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/e2e/fixtures/fish-art.html');
  const result = await page.evaluate(async () => {
    const api = (window as unknown as { fishArtTest: ArtFixture }).fishArtTest;
    await api.preloadFishArt();
    return api.FISH.map((fish) => {
      const canvas = api.getHDFishCanvas(fish.id, 600, 360);
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set<string>();
      let partialAlpha = 0;
      let opaque = 0;
      let edgeAlpha = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const pixel = i / 4;
        const x = pixel % canvas.width;
        const y = Math.floor(pixel / canvas.width);
        if (x < 3 || y < 3 || x > canvas.width - 4 || y > canvas.height - 4)
          edgeAlpha = Math.max(edgeAlpha, pixels[i + 3]!);
        if (pixels[i + 3]! > 200) {
          colors.add(pixels[i] + ',' + pixels[i + 1] + ',' + pixels[i + 2]);
          opaque++;
        } else if (pixels[i + 3]! > 0) partialAlpha++;
      }
      return { id: fish.id, colors: colors.size, partialAlpha, opaque, cornerAlpha: pixels[3], edgeAlpha };
    });
  });
  for (const fish of result) {
    expect(fish.colors, fish.id).toBeGreaterThan(150);
    expect(fish.partialAlpha, fish.id).toBeGreaterThan(40);
    expect(fish.opaque, fish.id).toBeGreaterThan(1000);
    expect(fish.cornerAlpha, fish.id).toBe(0);
    expect(fish.edgeAlpha, fish.id).toBeLessThan(15);
  }
  expect(errors).toEqual([]);
  if (process.env.E2E_SHOTS_DIR)
    await page.screenshot({ path: process.env.E2E_SHOTS_DIR + '/all-fish.png', fullPage: true });
});

test('admin preview refreshes after the shared swordfish asset loads', async ({ page }) => {
  let releaseAsset!: () => void;
  const delay = new Promise<void>((resolve) => {
    releaseAsset = resolve;
  });
  await page.route('**/fish/swordfish-illustration.webp', async (route) => {
    await delay;
    await route.continue();
  });
  await page.goto('/e2e/fixtures/fish-art.html?admin');
  await page.getByPlaceholder('Tìm theo tên hoặc ID…').fill('Cá Kiếm');
  await page.getByRole('button', { name: 'Xóa', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Cá Kiếm Đệ Nhất', exact: true }).check();
  const held = page.getByAltText('HD Chibi cầm Cá Kiếm Đệ Nhất');
  await expect(held).toBeVisible();
  const initial = await held.getAttribute('src');
  releaseAsset();
  await expect(held).not.toHaveAttribute('src', initial!);
  // Compare the common canvas path with the exact illustrated source, preserving its aspect.
  const result = await page.evaluate(async () => {
    const api = (window as unknown as { fishArtTest: ArtFixture }).fishArtTest;
    await api.preloadFishArt();
    const original = new Image();
    original.src = '/fish/swordfish-illustration.webp';
    await original.decode();
    const canvas = api.getHDFishCanvas('swordfish', 600, 360);
    const reference = document.createElement('canvas');
    reference.width = canvas.width;
    reference.height = canvas.height;
    const ctx = reference.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const factor = Math.min(canvas.width / original.naturalWidth, canvas.height / original.naturalHeight);
    const w = original.naturalWidth * factor;
    const h = original.naturalHeight * factor;
    ctx.drawImage(original, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    return {
      same: canvas.toDataURL() === reference.toDataURL(),
      aspect: original.naturalHeight / original.naturalWidth,
    };
  });
  expect(result.same).toBe(true);
  const front = await held.getAttribute('src');
  await page.getByRole('button', { name: /Ôm trước ngực/ }).click();
  await expect(held).not.toHaveAttribute('src', front!);
  await page.getByRole('button', { name: /Giơ bổng qua đầu/ }).click();
  await held.scrollIntoViewIfNeeded();
  if (process.env.E2E_SHOTS_DIR)
    await page.screenshot({ path: process.env.E2E_SHOTS_DIR + '/admin-swordfish.png' });
});

test('giant trophy previews keep complete fish and character inside the canvas', async ({ page }) => {
  await page.goto('/e2e/fixtures/fish-art.html');
  const results = await page.evaluate(async () => {
    const api = (window as unknown as { fishArtTest: ArtFixture }).fishArtTest;
    await api.preloadFishArt();
    const collected = [];
    for (const fish of api.FISH) {
      const image = new Image();
      image.src = api.chibiAvatarFull(
        { ...api.DEFAULT_APPEARANCE, heldFish: { speciesId: fish.id, sizeCm: fish.maxSizeCm } },
        240,
        280,
      );
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 280;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, 240, 280).data;
      let edgeAlpha = 0;
      for (let y = 0; y < 280; y++)
        for (let x = 0; x < 240; x++)
          if (x < 3 || x > 236 || y < 3 || y > 276)
            edgeAlpha = Math.max(edgeAlpha, data[(y * 240 + x) * 4 + 3]!);
      collected.push({ id: fish.id, edgeAlpha });
    }
    return collected;
  });
  for (const result of results) expect(result.edgeAlpha, result.id).toBeLessThan(15);
});

test('world textures keep illustrated fallbacks visible and use linear sampling', async ({ page }) => {
  await page.goto('/e2e/fixtures/fishing.html');
  await page.getByRole('button', { name: /Quăng cần/ }).waitFor();
  const result = await page.evaluate(async () => {
    const fixture = window as unknown as {
      fishingPreview: Game;
      fishTextureTest: (scene: Scene, id: string) => string;
    };
    const scene = fixture.fishingPreview.scene.getScene('town');
    const key = fixture.fishTextureTest(scene, 'office_carp');
    await Promise.resolve();
    const texture = scene.textures.get(key);
    const canvas = texture.getSourceImage() as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]! > 200) opaque++;
    return { opaque, filter: texture.source[0]!.scaleMode };
  });
  expect(result.opaque).toBeGreaterThan(1000);
  expect(result.filter).toBe(1);
});

test('missing image uses an illustration without repeated requests', async ({ page }) => {
  let requests = 0;
  await page.route('**/fish/swordfish-illustration.webp', async (route) => {
    requests++;
    await route.fulfill({ status: 404, body: '' });
  });
  await page.goto('/e2e/fixtures/fish-art.html?admin');
  await page.getByPlaceholder('Tìm theo tên hoặc ID…').fill('Cá Kiếm');
  await page.getByRole('button', { name: 'Xóa', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Cá Kiếm Đệ Nhất', exact: true }).check();
  const held = page.getByAltText('HD Chibi cầm Cá Kiếm Đệ Nhất');
  await expect(held).toBeVisible();
  await page.getByRole('button', { name: /Ôm trước ngực/ }).click();
  await page.getByRole('button', { name: /Giơ bổng qua đầu/ }).click();
  const thumbnail = page
    .getByRole('checkbox', { name: 'Cá Kiếm Đệ Nhất', exact: true })
    .locator('..')
    .locator('img');
  await expect(thumbnail).toHaveAttribute('src', new RegExp('^data:image/png'));
  expect(requests).toBe(1);
});
