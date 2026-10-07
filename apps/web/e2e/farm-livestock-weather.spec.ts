import type { Game, GameObjects } from 'phaser';
import { expect, test } from '@playwright/test';

interface FarmSceneInspection {
  livestock?: { animals?: GameObjects.Sprite[] };
  farmLanternGlows?: GameObjects.Image[];
  precipSystem?: unknown;
  ambientOverlay?: { alpha?: number; fillColor?: number };
}

interface UiStoreInspection {
  farmUi: {
    getState(): {
      setWeatherOverride(override: {
        condition: string;
        precipitationMm: number;
        solarHour: number;
        windSpeedKmh: number;
        windDirectionDeg: number;
        temperatureC: number;
      }): void;
    };
  };
}

test.describe('Farm Livestock, Weather & Details E2E', () => {
  test('livestock remain present in all pens, wander without disappearing, and respond to weather', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/e2e/fixtures/farm.html');

    // Wait until farm scene is fully active and livestock loaded
    await page.waitForFunction(() => {
      const g = (window as unknown as { farmPreview: Game }).farmPreview;
      return g?.scene.isActive('farm');
    });

    // Wait 1.5s for livestock async assets & spawning
    await page.waitForTimeout(1500);

    // 1. Verify all animals exist across all 4 pens
    const animalStats = await page.evaluate(() => {
      const g = (window as unknown as { farmPreview: Game }).farmPreview;
      const scene = g.scene.getScene('farm') as unknown as FarmSceneInspection;
      const livestock = scene.livestock;
      const animals = (livestock?.animals ?? []) as GameObjects.Sprite[];

      return {
        totalAnimals: animals.length,
        aliveCount: animals.filter((a) => a.active && a.visible).length,
        kinds: animals.map((a) => a.getData('kind') as string),
        positions: animals.map((a) => ({
          kind: a.getData('kind'),
          x: a.x,
          y: a.y,
          depth: a.depth,
        })),
      };
    });

    expect(animalStats.totalAnimals).toBeGreaterThanOrEqual(10);
    expect(animalStats.aliveCount).toBe(animalStats.totalAnimals);

    // Verify all animal kinds are present
    expect(animalStats.kinds).toContain('chicken');
    expect(animalStats.kinds).toContain('cow');
    expect(animalStats.kinds).toContain('pig');
    expect(animalStats.kinds).toContain('goat');
    expect(animalStats.kinds).toContain('sheep');

    // 2. Verify hand-drawn decorative farm props exist
    const decorStats = await page.evaluate(() => {
      const g = (window as unknown as { farmPreview: Game }).farmPreview;
      const scene = g.scene.getScene('farm') as unknown as FarmSceneInspection & {
        children: { list: GameObjects.GameObject[] };
      };
      const images = scene.children.list.filter((o) => o.type === 'Image') as GameObjects.Image[];

      return {
        hasProduceCrates: images.some((o) => o.texture.key === 'farm:produce_crates'),
        hasRiceSacks: images.some((o) => o.texture.key === 'farm:rice_sacks'),
        hasFarmTools: images.some((o) => o.texture.key === 'farm:farm_tools'),
        hasHayBales: images.some((o) => o.texture.key === 'farm:hay_bales'),
        hasWaterLilies: images.some((o) => o.texture.key === 'farm:water_lilies'),
        hasPondReeds: images.some((o) => o.texture.key === 'farm:pond_reeds'),
        hasAncientWell: images.some((o) => o.texture.key === 'farm:ancient_well'),
        lanternGlowsCount: scene.farmLanternGlows?.length ?? 0,
      };
    });

    expect(decorStats.hasProduceCrates).toBe(true);
    expect(decorStats.hasRiceSacks).toBe(true);
    expect(decorStats.hasFarmTools).toBe(true);
    expect(decorStats.hasHayBales).toBe(true);
    expect(decorStats.hasWaterLilies).toBe(true);
    expect(decorStats.hasPondReeds).toBe(true);
    expect(decorStats.hasAncientWell).toBe(true);
    expect(decorStats.lanternGlowsCount).toBeGreaterThanOrEqual(6);

    // 3. Test that animals do NOT disappear over time (simulate 4 seconds)
    await page.waitForTimeout(4000);

    const postWanderStats = await page.evaluate(() => {
      const g = (window as unknown as { farmPreview: Game }).farmPreview;
      const scene = g.scene.getScene('farm') as unknown as FarmSceneInspection;
      const animals = (scene.livestock?.animals ?? []) as GameObjects.Sprite[];

      return {
        totalAnimals: animals.length,
        aliveCount: animals.filter((a) => a.active && a.visible).length,
      };
    });

    // Zero animals disappeared!
    expect(postWanderStats.aliveCount).toBe(animalStats.totalAnimals);

    // 4. Test Weather System applied to Farm Scene
    // Set weather to thunderstorm with rain & night
    await page.evaluate(() => {
      const ui = (window as unknown as UiStoreInspection).farmUi;
      ui.getState().setWeatherOverride({
        condition: 'thunderstorm',
        precipitationMm: 18,
        solarHour: 22, // Night 10 PM
        windSpeedKmh: 28,
        windDirectionDeg: 210,
        temperatureC: 24,
      });
    });

    // Wait a brief moment for update loop
    await page.waitForTimeout(500);

    const weatherEffects = await page.evaluate(() => {
      const g = (window as unknown as { farmPreview: Game }).farmPreview;
      const scene = g.scene.getScene('farm') as unknown as FarmSceneInspection;

      return {
        hasPrecipSystem: !!scene.precipSystem,
        ambientAlpha: scene.ambientOverlay?.alpha ?? 0,
        ambientColor: scene.ambientOverlay?.fillColor ?? 0,
        lanternGlowAlpha: scene.farmLanternGlows?.[0]?.alpha ?? 0,
      };
    });

    expect(weatherEffects.hasPrecipSystem).toBe(true);
    // Night lighting must be active (ambient overlay has alpha > 0.3)
    expect(weatherEffects.ambientAlpha).toBeGreaterThan(0.3);
    // Lanterns must brighten up during night/storm!
    expect(weatherEffects.lanternGlowAlpha).toBeGreaterThan(0.4);

    // Take screenshot of detailed farm under night storm with lanterns and animals
    await page.screenshot({ path: '../../output/live-farm-weather-verified.png' });

    expect(errors).toEqual([]);
  });
});
