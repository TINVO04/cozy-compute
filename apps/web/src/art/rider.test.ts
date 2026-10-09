import { describe, expect, it } from 'vitest';
import { CANONICAL_VEHICLE_IDS, DEFAULT_APPEARANCE, vehicleById } from '@cozy/game-data';
import { riderLayers, ridingStyle } from './rider';
import type { Dir } from './avatar';

describe('seated rider anatomy', () => {
  const bikes = CANONICAL_VEHICLE_IDS.filter((id) => vehicleById(id)!.kind !== 'car');
  it.each(bikes)('%s keeps boots and bent legs below the saddle in every direction and phase', (id) => {
    for (let d = 0; d < 4; d++) {
      for (let frame = 0; frame < 4; frame++) {
        const { near, hip } = riderLayers(DEFAULT_APPEARANCE, id, d as Dir, frame);
        const boots = near.px.flatMap((color, index) =>
          color === '#e8e3d6' ? [{ x: index % 48, y: Math.floor(index / 48) }] : [],
        );
        expect(boots.length).toBeGreaterThanOrEqual(6);
        expect(boots.every((point) => point.y > hip.y && point.y < 63)).toBe(true);
        if (d === 0 || d === 3) {
          expect(boots.some((point) => point.x < hip.x)).toBe(true);
          expect(boots.some((point) => point.x > hip.x)).toBe(true);
        }
      }
    }
  });
  it('assigns posture by vehicle ergonomics and animates pedalling through four phases', () => {
    expect(ridingStyle('bicycle_sky')).toBe('pedal');
    expect(ridingStyle('motorcycle_coral')).toBe('scooter');
    expect(ridingStyle('motorcycle_harley_fat_boy')).toBe('cruiser');
    expect(ridingStyle('motorcycle_bmw_r1250_gs')).toBe('touring');
    expect(ridingStyle('motorcycle_ducati')).toBe('sport');
    const legs = [0, 1, 2, 3].map((frame) =>
      riderLayers(DEFAULT_APPEARANCE, 'bicycle_sky', 2, frame)
        .near.px.slice(48 * 44)
        .join(),
    );
    expect(new Set(legs).size).toBe(4);
  });
  it('preserves appearance changes instead of baking in a generic rider', () => {
    const first = riderLayers(DEFAULT_APPEARANCE, 'motorcycle_ducati', 2, 0).near.px;
    const second = riderLayers(
      { ...DEFAULT_APPEARANCE, skin: 3, hairColor: 4, top: 'hoodie:#da548a' },
      'motorcycle_ducati',
      2,
      0,
    ).near.px;
    expect(first).not.toEqual(second);
    expect(second).toContain('#da548a');
  });
});
