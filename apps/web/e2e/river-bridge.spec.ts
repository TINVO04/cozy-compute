import { expect, test } from '@playwright/test';

test('wide river bridge has moving traffic and pedestrians, rain, night lights and a live clock', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/world/weather', async (route) => {
    await route.fulfill({
      json: {
        city: 'Biên Hòa',
        timeString: '21:15',
        secondsString: '21:15:00',
        solarHour: 21.25,
        timePhase: 'night',
        phaseLabelVi: 'Đêm',
        temperatureC: 27,
        condition: 'rain',
        conditionLabelVi: 'Mưa',
        windSpeedKmh: 22,
        windDirectionDeg: 190,
        precipitationMm: 5,
        cloudCoverPct: 80,
        isOverridden: false,
      },
    });
  });
  await page.goto('/e2e/fixtures/river.html');
  await page.waitForFunction(() => Reflect.get(window, 'riverScene')?.children.getByName('river:traffic'));
  const sample = () =>
    page.evaluate(() => {
      const s = Reflect.get(window, 'riverScene');
      return s.children.getByName('river:traffic').getData('travellers') as {
        id: string;
        x: number;
        kind: string;
      }[];
    });
  const before = await sample();
  expect(before.some((a) => a.kind === 'person')).toBe(true);
  await expect
    .poll(async () => {
      const after = await sample();
      return after.some((a) => before.some((b) => b.id === a.id && Math.abs(b.x - a.x) > 10));
    })
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, 'riverScene').children.getByName('river:ambient').alpha),
    )
    .toBeGreaterThan(0.5);
  await expect
    .poll(() =>
      page.evaluate(
        () => Reflect.get(window, 'riverScene').children.getByName('weather:rain').commandBuffer.length,
      ),
    )
    .toBeGreaterThan(20);
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'riverWeatherState')().solarHour))
    .toBeGreaterThan(21.25);
  const size = await page.evaluate(
    () => Reflect.get(window, 'riverScene').children.getByName('river:bridge-deck')._crop.height,
  );
  expect(size).toBeGreaterThan(200);
  await page.screenshot({ path: '../../output/river-bridge-night-rain.png' });
  await page.evaluate(() => {
    Reflect.get(
      window,
      'setRiverWeather',
    )({ enabled: true, solarHour: 12, condition: 'clear', rainIntensity: 0 });
  });
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, 'riverScene').children.getByName('river:ambient').alpha),
    )
    .toBeLessThan(0.05);
  await page.screenshot({ path: '../../output/river-bridge-day.png' });
  await page.evaluate(() => Reflect.get(window, 'riverScene').scene.restart());
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Reflect.get(window, 'riverScene').children.list.filter(
            (o: { name: string }) => o.name === 'river:traffic',
          ).length,
      ),
    )
    .toBe(1);
  expect(errors).toEqual([]);
});
