import { expect, it } from 'vitest';
import {
  BOAT_WORLD_SCALE,
  STEAMBOAT_WORLD_SCALE,
  boatArtFor,
  boatFrameForDirection,
  boatIcon,
  boatPassengerCenterY,
  boatWorldScaleFor,
} from './boat';

it('enlarges only the steamboat and keeps passengers centered on each boat deck', () => {
  expect(BOAT_WORLD_SCALE).toBe(2.8);
  expect(STEAMBOAT_WORLD_SCALE).toBe(4.3);
  expect(['boat_coracle', 'boat_sampan', 'boat_cutter'].map(boatWorldScaleFor)).toEqual([2.8, 2.8, 2.8]);
  expect(boatWorldScaleFor('boat_trawler')).toBe(4.3);
  expect(boatPassengerCenterY()).toBeCloseTo(-39.84);
  expect(boatPassengerCenterY('boat_trawler')).toBeCloseTo(-59.04);
});

it.each([
  ['boat_coracle', 'kayak'],
  ['boat_sampan', 'boat'],
  ['boat_cutter', 'speedboat'],
  ['boat_trawler', 'steamboat'],
])('maps %s to its supplied %s art without changing the catalog item', (boatId, model) => {
  expect(boatArtFor(boatId).model).toBe(model);
  expect(boatArtFor(boatId).icon).toBe(`/boats/icons/${boatId}.png`);
});

it('resolves legacy boat sprites to the same art and keeps four cardinal hull directions', () => {
  expect(boatArtFor('boat:coracle:#8b5a2b').model).toBe('kayak');
  expect(boatArtFor('boat:sampan:#b47547').model).toBe('boat');
  expect([0, 1, 2, 3].map(boatFrameForDirection)).toEqual([24, 36, 12, 0]);
  expect(boatFrameForDirection(9)).toBe(24);
});

it('uses the matching new hull artwork in item icons', () => {
  expect(boatIcon('boat_cutter')).toBe('/boats/icons/boat_cutter.png');
});

it('correctly categorizes boats that have oars vs motorized boats', async () => {
  const { boatOarType, boatHasOars } = await import('./boat');
  expect(boatOarType('boat_coracle')).toBe('kayak_double');
  expect(boatHasOars('boat_coracle')).toBe(true);

  expect(boatOarType('boat_sampan')).toBe('sampan_oars');
  expect(boatHasOars('boat_sampan')).toBe(true);

  expect(boatOarType('boat_cutter')).toBe('none');
  expect(boatHasOars('boat_cutter')).toBe(false);

  expect(boatOarType('boat_trawler')).toBe('none');
  expect(boatHasOars('boat_trawler')).toBe(false);

  expect(boatOarType(null)).toBe('none');
  expect(boatHasOars(undefined)).toBe(false);
});
