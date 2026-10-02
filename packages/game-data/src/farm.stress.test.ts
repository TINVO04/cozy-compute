import { describe, expect, it } from 'vitest';
import {
  calculatePondFishWeight,
  CROPS,
  FARM_PLOT_CONFIGS,
  FERTILIZER_GROWTH_MULTIPLIER,
  FINGERLING_INITIAL_WEIGHT_KG,
  getCropGrowthStage,
  getPlotState,
  getPlotUnlockPrice,
  getPondFishStage,
  getWarehouseTabForItem,
  isPlotMoist,
  POND_FISHES,
  SOIL_MOISTURE_DURATION_SEC,
  TOTAL_FARM_PLOTS,
  type CropDef,
  type CropId,
} from './index.js';

describe('Adversarial Stress & Boundary Testing: Cozy Farm Simulation Logic', () => {
  // ==========================================================================
  // 1. getCropGrowthStage Stress Tests
  // ==========================================================================
  describe('getCropGrowthStage', () => {
    const fixedNow = 1_700_000_000_000; // Reference epoch ms

    it('handles exact boundary transitions for all 5 crops (unfertilized)', () => {
      for (const [id, crop] of Object.entries(CROPS)) {
        const totalSec = crop.growthDurationSec;
        const sproutSec = Math.floor(totalSec * 0.25);
        const bloomingSec = Math.floor(totalSec * 0.6);

        // Exactly at planting (0s) -> seed
        expect(getCropGrowthStage(fixedNow, crop, false, fixedNow), `${id} at 0s`).toBe('seed');

        // 1ms before sprout threshold
        const beforeSprout = fixedNow - (sproutSec * 1000 - 1);
        expect(getCropGrowthStage(beforeSprout, crop, false, fixedNow), `${id} before sprout`).toBe('seed');

        // Exactly at sprout threshold (25% of duration)
        const atSprout = fixedNow - sproutSec * 1000;
        expect(getCropGrowthStage(atSprout, crop, false, fixedNow), `${id} at sprout`).toBe('sprout');

        // 1ms before blooming threshold
        const beforeBlooming = fixedNow - (bloomingSec * 1000 - 1);
        expect(getCropGrowthStage(beforeBlooming, crop, false, fixedNow), `${id} before blooming`).toBe(
          'sprout',
        );

        // Exactly at blooming threshold (60% of duration)
        const atBlooming = fixedNow - bloomingSec * 1000;
        expect(getCropGrowthStage(atBlooming, crop, false, fixedNow), `${id} at blooming`).toBe('blooming');

        // 1ms before mature threshold
        const beforeMature = fixedNow - (totalSec * 1000 - 1);
        expect(getCropGrowthStage(beforeMature, crop, false, fixedNow), `${id} before mature`).toBe(
          'blooming',
        );

        // Exactly at mature threshold (100% of duration)
        const atMature = fixedNow - totalSec * 1000;
        expect(getCropGrowthStage(atMature, crop, false, fixedNow), `${id} at mature`).toBe('mature');

        // Well past mature threshold (+3600s)
        const afterMature = fixedNow - (totalSec + 3600) * 1000;
        expect(getCropGrowthStage(afterMature, crop, false, fixedNow), `${id} well past mature`).toBe(
          'mature',
        );
      }
    });

    it('halves duration when fertilized and transitions stages at halved timing', () => {
      const rice = CROPS.crop_rice; // 180s base -> 90s fertilized
      expect(FERTILIZER_GROWTH_MULTIPLIER).toBe(0.5);

      // At 45s: unfertilized is sprout (45s / 180s = 0.25), but fertilized is blooming (45s / 90s = 0.50 >= 0.25, wait: 0.5 < 0.6 so sprout)
      // At 54s: fertilized is blooming (54s / 90s = 0.60)
      const at54s = fixedNow - 54 * 1000;
      expect(getCropGrowthStage(at54s, rice, true, fixedNow)).toBe('blooming');
      expect(getCropGrowthStage(at54s, rice, false, fixedNow)).toBe('sprout');

      // At 89.999s: fertilized is blooming, unfertilized is sprout
      const at89s = fixedNow - 89_999;
      expect(getCropGrowthStage(at89s, rice, true, fixedNow)).toBe('blooming');

      // At 90.000s: fertilized is mature, unfertilized is sprout
      const at90s = fixedNow - 90 * 1000;
      expect(getCropGrowthStage(at90s, rice, true, fixedNow)).toBe('mature');
      expect(getCropGrowthStage(at90s, rice, false, fixedNow)).toBe('sprout');
    });

    it('stress tests future timestamps (clock drift/tampering)', () => {
      const rice = CROPS.crop_rice;

      // 10 seconds in future: Math.max(0, negative) yields 0 elapsed -> 'seed'
      expect(getCropGrowthStage(fixedNow + 10_000, rice, false, fixedNow)).toBe('seed');

      // 1 year in future -> 'seed'
      expect(getCropGrowthStage(fixedNow + 365 * 86400 * 1000, rice, false, fixedNow)).toBe('seed');

      // Extreme future timestamp (2^50) -> 'seed'
      expect(getCropGrowthStage(2 ** 50, rice, false, fixedNow)).toBe('seed');
    });

    it('stress tests extreme past timestamps and negative epoch numbers', () => {
      const rice = CROPS.crop_rice;

      // Negative timestamp (-100,000s before Unix epoch 1970) -> mature
      expect(getCropGrowthStage(-100_000_000, rice, false, fixedNow)).toBe('mature');

      // Exactly at epoch 0 (1970-01-01T00:00:00.000Z) -> mature
      expect(getCropGrowthStage(0, rice, false, fixedNow)).toBe('mature');

      // Date string format variations
      expect(getCropGrowthStage(new Date(fixedNow - 200_000).toISOString(), rice, false, fixedNow)).toBe(
        'mature',
      );
      expect(getCropGrowthStage(new Date(fixedNow - 10_000), rice, false, fixedNow)).toBe('seed');
    });

    it('identifies behavior with invalid dates (NaN propagation)', () => {
      const rice = CROPS.crop_rice;

      // Invalid date string: new Date("not-a-date").getTime() -> NaN
      // elapsedSec = Math.max(0, NaN) -> NaN
      // NaN comparisons return false -> falls through to 'seed'
      expect(getCropGrowthStage('invalid-date-string', rice, false, fixedNow)).toBe('seed');
    });

    it('identifies architectural assumption: getCropGrowthStage uses hardcoded ratios (0.25, 0.6) instead of cropDef.stages', () => {
      // Create a hypothetical crop with non-standard stages
      const customCrop: CropDef = {
        id: 'crop_rice',
        name: 'Custom Exotic Crop',
        description: 'Test',
        seedItemId: 'seed_exotic',
        harvestItemId: 'crop_exotic_harvest',
        seedPrice: 100,
        sellPrice: 200,
        growthDurationSec: 100,
        baseYieldMin: 1,
        baseYieldMax: 1,
        stages: {
          sproutAtSec: 10, // 10% instead of standard 25%
          bloomingAtSec: 40, // 40% instead of standard 60%
          matureAtSec: 100,
        },
        sprite: 'test',
      };

      // At 15s: according to customCrop.stages.sproutAtSec (10s), it should be sprout.
      // But getCropGrowthStage evaluates 15/100 = 0.15 < 0.25 -> returns 'seed'!
      const stageAt15s = getCropGrowthStage(fixedNow - 15 * 1000, customCrop, false, fixedNow);
      expect(stageAt15s).toBe('seed'); // Proves hardcoded 0.25 ratio is used rather than custom stages
    });
  });

  // ==========================================================================
  // 2. isPlotMoist Stress Tests
  // ==========================================================================
  describe('isPlotMoist', () => {
    const fixedNow = 1_700_000_000_000;
    const moistureMs = SOIL_MOISTURE_DURATION_SEC * 1000; // 1,800,000 ms (30 mins)

    it('verifies exact boundary condition at 1800s', () => {
      // 0ms elapsed -> true
      expect(isPlotMoist(fixedNow, fixedNow)).toBe(true);

      // 1799999ms elapsed (1ms before 30 mins) -> true
      expect(isPlotMoist(fixedNow - (moistureMs - 1), fixedNow)).toBe(true);

      // Exactly 1800000ms elapsed (30 minutes sharp) -> false (strict <)
      expect(isPlotMoist(fixedNow - moistureMs, fixedNow)).toBe(false);

      // 1800001ms elapsed (1ms after 30 mins) -> false
      expect(isPlotMoist(fixedNow - (moistureMs + 1), fixedNow)).toBe(false);
    });

    it('handles falsy / nullish values safely', () => {
      expect(isPlotMoist(null, fixedNow)).toBe(false);
      expect(isPlotMoist(undefined as unknown as null, fixedNow)).toBe(false);
      expect(isPlotMoist(0, fixedNow)).toBe(false); // 0 is falsy -> returns false
      expect(isPlotMoist('', fixedNow)).toBe(false); // empty string is falsy -> returns false
    });

    it('evaluates future timestamps as perpetually moist (adversarial vulnerability)', () => {
      // If wateredAt is set to the future (e.g. year 2099 due to client spoofing or DB glitch),
      // now - timeMs is negative, which is strictly < 1800000, returning true!
      const farFuture = fixedNow + 365 * 86400 * 1000;
      const isMoistInFuture = isPlotMoist(farFuture, fixedNow);
      expect(isMoistInFuture).toBe(true); // Confirmed: future timestamp yields true
    });

    it('handles invalid dates without throwing exceptions', () => {
      expect(isPlotMoist('not-a-date', fixedNow)).toBe(false);
      expect(isPlotMoist(NaN, fixedNow)).toBe(false);
    });
  });

  // ==========================================================================
  // 3. calculatePondFishWeight Stress Tests
  // ==========================================================================
  describe('calculatePondFishWeight', () => {
    const fixedNow = 1_700_000_000_000;

    it('calculates initial weight at stocking time (0s elapsed)', () => {
      for (const [species, def] of Object.entries(POND_FISHES)) {
        const weight = calculatePondFishWeight(fixedNow, def, false, fixedNow);
        expect(weight, `${species} initial weight`).toBe(FINGERLING_INITIAL_WEIGHT_KG);
      }
    });

    it('caps growth at species marketWeightMaxKg upon reaching duration', () => {
      for (const [species, def] of Object.entries(POND_FISHES)) {
        const atMature = fixedNow - def.growthDurationSec * 1000;
        const weightAtMature = calculatePondFishWeight(atMature, def, false, fixedNow);
        expect(weightAtMature, `${species} at mature`).toBe(def.marketWeightMaxKg);

        // Long delays (100x duration, 100 days) must NOT exceed marketWeightMaxKg
        const farPast = fixedNow - def.growthDurationSec * 1000 * 100;
        const weightFarPast = calculatePondFishWeight(farPast, def, false, fixedNow);
        expect(weightFarPast, `${species} far past mature`).toBe(def.marketWeightMaxKg);
      }
    });

    it('applies 15% acceleration with waterwheel aerator', () => {
      const tra = POND_FISHES.tra; // 900s, max 4.5kg, init 0.10kg
      const halfTime = fixedNow - 450 * 1000;

      const withoutAerator = calculatePondFishWeight(halfTime, tra, false, fixedNow);
      const withAerator = calculatePondFishWeight(halfTime, tra, true, fixedNow);

      expect(withoutAerator).toBe(2.3); // 0.10 + 0.5 * 4.40 = 2.30kg
      // With aerator: 450s * 1.15 = 517.5s -> 517.5 / 900 = 0.575 -> 0.10 + 0.575 * 4.40 = 2.63kg
      expect(withAerator).toBe(2.63);
      expect(withAerator).toBeGreaterThan(withoutAerator);

      // Reaches max weight earlier with aerator (at duration / 1.15 ~= 782.6s)
      const aeratorMatureTime = fixedNow - 783 * 1000;
      expect(calculatePondFishWeight(aeratorMatureTime, tra, true, fixedNow)).toBe(4.5);
    });

    it('stress tests future stocking timestamps and negative epoch', () => {
      const tra = POND_FISHES.tra;

      // Future stocking timestamp: elapsedSec clamped to 0 -> returns initial weight
      expect(calculatePondFishWeight(fixedNow + 10_000, tra, false, fixedNow)).toBe(0.1);
      expect(calculatePondFishWeight(fixedNow + 86400 * 1000, tra, false, fixedNow)).toBe(0.1);

      // Negative epoch stocking timestamp: caps at max weight
      expect(calculatePondFishWeight(-1000, tra, false, fixedNow)).toBe(tra.marketWeightMaxKg);
    });

    it('confirms calculatePondFishWeight does NOT take or factor feeding counts', () => {
      // The function signature is: (stockedAt, speciesDef, hasAerator, now, initialWeightKg)
      // Feeding counts/happiness do NOT influence biomass weight in this pure function.
      expect(calculatePondFishWeight.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // 4. getPondFishStage Stress Tests
  // ==========================================================================
  describe('getPondFishStage', () => {
    const tra = POND_FISHES.tra; // juvenile: 0.8kg, adult: 2.2kg, specialty: 3.8kg

    it('correctly maps milestone weights and boundaries', () => {
      expect(getPondFishStage(0.1, tra)).toBe('fingerling');
      expect(getPondFishStage(0.799, tra)).toBe('fingerling');
      expect(getPondFishStage(0.8, tra)).toBe('juvenile');
      expect(getPondFishStage(2.199, tra)).toBe('juvenile');
      expect(getPondFishStage(2.2, tra)).toBe('adult');
      expect(getPondFishStage(3.799, tra)).toBe('adult');
      expect(getPondFishStage(3.8, tra)).toBe('specialty');
      expect(getPondFishStage(4.5, tra)).toBe('specialty');
      expect(getPondFishStage(100.0, tra)).toBe('specialty');
    });

    it('handles negative or zero weight gracefully', () => {
      expect(getPondFishStage(0, tra)).toBe('fingerling');
      expect(getPondFishStage(-5, tra)).toBe('fingerling');
    });
  });

  // ==========================================================================
  // 5. getPlotUnlockPrice Stress Tests
  // ==========================================================================
  describe('getPlotUnlockPrice', () => {
    it('returns exact authoritative prices for all valid plots 0..35', () => {
      const expectedTiers: [number, number, number][] = [
        [0, 3, 0],
        [4, 7, 250],
        [8, 11, 500],
        [12, 15, 1000],
        [16, 19, 1500],
        [20, 23, 2500],
        [24, 27, 3500],
        [28, 31, 5000],
        [32, 35, 7500],
      ];

      for (const [start, end, price] of expectedTiers) {
        for (let i = start; i <= end; i++) {
          expect(getPlotUnlockPrice(i), `Plot ${i} price`).toBe(price);
        }
      }
    });

    it('confirms FARM_PLOT_CONFIGS matches getPlotUnlockPrice for all 36 plots', () => {
      expect(FARM_PLOT_CONFIGS).toHaveLength(TOTAL_FARM_PLOTS);
      for (let i = 0; i < TOTAL_FARM_PLOTS; i++) {
        expect(FARM_PLOT_CONFIGS[i]!.index).toBe(i);
        expect(FARM_PLOT_CONFIGS[i]!.unlockPrice).toBe(getPlotUnlockPrice(i));
        expect(FARM_PLOT_CONFIGS[i]!.isStarterUnlocked).toBe(i < 4);
      }
    });

    it('identifies boundary anomaly: negative indices return 0 instead of throwing or rejecting', () => {
      // if (index < 4) return 0;
      // Negative plot index evaluates to < 4, so returns 0!
      // In contrast, getFarmPlotRect(-1) throws Error.
      expect(getPlotUnlockPrice(-1)).toBe(0);
      expect(getPlotUnlockPrice(-100)).toBe(0);
    });

    it('identifies boundary anomaly: indices >= 36 return 7500 instead of throwing or rejecting', () => {
      // Any index >= 32 falls through to return 7500
      expect(getPlotUnlockPrice(36)).toBe(7500);
      expect(getPlotUnlockPrice(1000)).toBe(7500);
      expect(getPlotUnlockPrice(NaN)).toBe(7500);
    });
  });

  // ==========================================================================
  // 6. getWarehouseTabForItem Stress Tests
  // ==========================================================================
  describe('getWarehouseTabForItem', () => {
    it('classifies all valid standard farm items correctly', () => {
      // Crops
      expect(getWarehouseTabForItem('crop_rice_harvest')).toBe('crops');
      expect(getWarehouseTabForItem('crop_corn_harvest')).toBe('crops');
      expect(getWarehouseTabForItem('crop_watermelon_harvest')).toBe('crops');
      expect(getWarehouseTabForItem('crop_tomato_harvest')).toBe('crops');
      expect(getWarehouseTabForItem('crop_chili_harvest')).toBe('crops');

      // Animal Products
      expect(getWarehouseTabForItem('yield_egg')).toBe('animal_products');
      expect(getWarehouseTabForItem('yield_duck_egg')).toBe('animal_products');
      expect(getWarehouseTabForItem('yield_milk')).toBe('animal_products');
      expect(getWarehouseTabForItem('yield_truffle')).toBe('animal_products');
      expect(getWarehouseTabForItem('yield_goat_milk')).toBe('animal_products');
      expect(getWarehouseTabForItem('yield_wool')).toBe('animal_products');
      expect(getWarehouseTabForItem('fish_pond_tra_harvest')).toBe('animal_products');
      expect(getWarehouseTabForItem('fish_pond_basa_harvest')).toBe('animal_products');
      expect(getWarehouseTabForItem('fish_pond_loc_harvest')).toBe('animal_products');
      expect(getWarehouseTabForItem('fish_pond_tom_cang_harvest')).toBe('animal_products');
      expect(getWarehouseTabForItem('fish_pond_bong_tuong_harvest')).toBe('animal_products');

      // Seeds & Stocks
      expect(getWarehouseTabForItem('seed_rice')).toBe('seeds_stocks');
      expect(getWarehouseTabForItem('stock_chicken')).toBe('seeds_stocks');
      expect(getWarehouseTabForItem('stock_fingerling_tra')).toBe('seeds_stocks');

      // Supplies
      expect(getWarehouseTabForItem('feed_grain')).toBe('supplies');
      expect(getWarehouseTabForItem('fertilizer_bio')).toBe('supplies');
      expect(getWarehouseTabForItem('tool_watering_can')).toBe('supplies');
      expect(getWarehouseTabForItem('waterwheel_aerator')).toBe('supplies');
    });

    it('identifies naming discrepancy: base crop IDs without _harvest fall into supplies', () => {
      // If an API handler or client refers to 'crop_rice' instead of 'crop_rice_harvest',
      // it does not end with '_harvest', so it falls through to 'supplies'!
      expect(getWarehouseTabForItem('crop_rice')).toBe('supplies');
      expect(getWarehouseTabForItem('crop_corn')).toBe('supplies');
    });

    it('handles unexpected inputs without crashing', () => {
      expect(getWarehouseTabForItem('')).toBe('supplies');
      expect(getWarehouseTabForItem('random_unknown_item')).toBe('supplies');
      expect(getWarehouseTabForItem('SEED_RICE')).toBe('supplies'); // Case-sensitive check
    });
  });

  // ==========================================================================
  // 7. getPlotState Composite Logic Stress Tests
  // ==========================================================================
  describe('getPlotState', () => {
    const fixedNow = 1_700_000_000_000;

    it('strictly enforces lock state over all other properties', () => {
      expect(
        getPlotState(
          {
            isUnlocked: false,
            isTilled: true,
            wateredAt: fixedNow,
            cropId: 'crop_rice',
            plantedAt: fixedNow - 300_000,
          },
          fixedNow,
        ),
      ).toBe('locked');
    });

    it('evaluates untilled before moisture', () => {
      expect(
        getPlotState(
          {
            isUnlocked: true,
            isTilled: false,
            wateredAt: fixedNow,
            cropId: null,
            plantedAt: null,
          },
          fixedNow,
        ),
      ).toBe('untilled');
    });

    it('evaluates tilled dry vs wet without crops', () => {
      // Moist
      expect(
        getPlotState(
          {
            isUnlocked: true,
            isTilled: true,
            wateredAt: fixedNow - 300 * 1000,
            cropId: null,
            plantedAt: null,
          },
          fixedNow,
        ),
      ).toBe('tilled_wet');

      // Dry
      expect(
        getPlotState(
          {
            isUnlocked: true,
            isTilled: true,
            wateredAt: fixedNow - 1900 * 1000,
            cropId: null,
            plantedAt: null,
          },
          fixedNow,
        ),
      ).toBe('tilled_dry');
    });

    it('evaluates growing vs mature with crops', () => {
      // Growing (sprout at 60s for crop_rice with 180s duration)

      // Growing (sprout at 60s)
      expect(
        getPlotState(
          {
            isUnlocked: true,
            isTilled: true,
            wateredAt: fixedNow,
            cropId: 'crop_rice',
            plantedAt: fixedNow - 60 * 1000,
          },
          fixedNow,
        ),
      ).toBe('growing');

      // Mature (200s >= 180s)
      expect(
        getPlotState(
          {
            isUnlocked: true,
            isTilled: true,
            wateredAt: fixedNow,
            cropId: 'crop_rice',
            plantedAt: fixedNow - 200 * 1000,
          },
          fixedNow,
        ),
      ).toBe('mature');
    });

    it('falls back to tilled dry/wet if cropId is invalid/unknown', () => {
      expect(
        getPlotState(
          {
            isUnlocked: true,
            isTilled: true,
            wateredAt: fixedNow - 100 * 1000,
            cropId: 'unknown_crop' as unknown as CropId,
            plantedAt: fixedNow - 60 * 1000,
          },
          fixedNow,
        ),
      ).toBe('tilled_wet');
    });
  });
});
