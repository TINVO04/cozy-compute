import { describe, expect, it } from 'vitest';
import type { AnimalType, CropId, PondFishSpecies } from './index.js';
import {
  ANIMALS,
  BAC_SAU_SHOP_ITEMS,
  BASE_WAREHOUSE_CAPACITY,
  calculatePondFishWeight,
  CROPS,
  DAILY_MARKET_CONTRACTS,
  FARM_BLOCKERS,
  FARM_COLS,
  FARM_GATE_EXIT,
  FARM_GATE_PORTAL,
  FARM_HEIGHT,
  FARM_MAP,
  FARM_PLOT_CONFIGS,
  FARM_PLOT_TOTAL,
  FARM_POIS,
  FARM_ROWS,
  FARM_SPAWN,
  FARM_STARTER_PLOTS,
  FARM_WIDTH,
  FARM_ZONES,
  FERTILIZER_GROWTH_MULTIPLIER,
  getCropGrowthStage,
  getFarmPlotRect,
  getPlotState,
  getPlotUnlockPrice,
  getPondFishStage,
  getWarehouseTabForItem,
  isPlotMoist,
  MAX_WAREHOUSE_CAPACITY,
  PATHS,
  POND_FISHES,
  SOIL_MOISTURE_DURATION_SEC,
  STARTER_UNLOCKED_PLOT_INDICES,
  TILE,
  TOTAL_FARM_PLOTS,
  TOWN_FARM_PORTAL_SPAWN,
  WAREHOUSE_UPGRADE_TIERS,
  ZONES,
} from './index.js';

describe('Cozy Farm System Game Data', () => {
  describe('Crops Catalog', () => {
    const cropIds: CropId[] = ['crop_rice', 'crop_corn', 'crop_watermelon', 'crop_tomato', 'crop_chili'];

    it('defines all 5 authoritative crop definitions', () => {
      expect(Object.keys(CROPS)).toHaveLength(5);
      for (const id of cropIds) {
        const crop = CROPS[id];
        expect(crop).toBeDefined();
        expect(crop.id).toBe(id);
        expect(crop.name.length).toBeGreaterThan(0);
        expect(crop.seedItemId.startsWith('seed_')).toBe(true);
        expect(crop.harvestItemId.endsWith('_harvest')).toBe(true);
        expect(crop.seedPrice).toBeGreaterThan(0);
        expect(crop.sellPrice).toBeGreaterThan(0);
        expect(crop.growthDurationSec).toBeGreaterThan(0);
        expect(crop.baseYieldMin).toBeGreaterThanOrEqual(1);
        expect(crop.baseYieldMax).toBeGreaterThanOrEqual(crop.baseYieldMin);
        expect(crop.stages.sproutAtSec).toBeGreaterThan(0);
        expect(crop.stages.bloomingAtSec).toBeGreaterThan(crop.stages.sproutAtSec);
        expect(crop.stages.matureAtSec).toBe(crop.growthDurationSec);
        expect(crop.sprite.startsWith('farm:')).toBe(true);
      }
    });

    it('has expected growth durations and economic balance', () => {
      // Rice: 180s (3m), Corn: 360s (6m), Watermelon: 600s (10m)
      expect(CROPS.crop_rice.growthDurationSec).toBe(180);
      expect(CROPS.crop_corn.growthDurationSec).toBe(360);
      expect(CROPS.crop_watermelon.growthDurationSec).toBe(600);
      expect(CROPS.crop_tomato.growthDurationSec).toBe(240);
      expect(CROPS.crop_chili.growthDurationSec).toBe(300);

      // Selling average yield covers seed cost with profit
      for (const crop of Object.values(CROPS)) {
        const avgYield = (crop.baseYieldMin + crop.baseYieldMax) / 2;
        const revenue = avgYield * crop.sellPrice;
        expect(revenue).toBeGreaterThan(crop.seedPrice);
      }
    });
  });

  describe('Livestock Catalog', () => {
    const animalTypes: AnimalType[] = ['chicken', 'duck', 'cow', 'pig', 'goat', 'sheep'];

    it('defines all 6 livestock definitions', () => {
      expect(Object.keys(ANIMALS)).toHaveLength(6);
      for (const type of animalTypes) {
        const animal = ANIMALS[type];
        expect(animal).toBeDefined();
        expect(animal.type).toBe(type);
        expect(animal.name.length).toBeGreaterThan(0);
        expect(animal.stockPrice).toBeGreaterThan(0);
        expect(animal.yieldPrice).toBeGreaterThan(0);
        expect(animal.yieldItemId).toBe(animal.yieldItem);
        expect(animal.feedIntervalSec).toBeGreaterThan(0);
        expect(animal.hungerDecaySec).toBeGreaterThan(animal.feedIntervalSec);
        expect(animal.happinessBoost).toBeGreaterThan(0);
        expect(['poultry_coop', 'cattle_pasture', 'pig_pen', 'goat_pen']).toContain(animal.facility);
        expect(animal.sprite.startsWith('farm:animal_')).toBe(true);
      }
    });
  });

  describe('Aquaculture Pond Fish Catalog', () => {
    const speciesList: PondFishSpecies[] = ['tra', 'basa', 'loc', 'tom_cang', 'bong_tuong'];

    it('defines all 5 aquaculture freshwater species', () => {
      expect(Object.keys(POND_FISHES)).toHaveLength(5);
      for (const species of speciesList) {
        const fish = POND_FISHES[species];
        expect(fish).toBeDefined();
        expect(fish.species).toBe(species);
        expect(fish.fingerlingPrice).toBeGreaterThan(0);
        expect(fish.pricePerKg).toBeGreaterThan(0);
        expect(fish.growthDurationSec).toBeGreaterThan(0);
        expect(fish.marketWeightMinKg).toBeGreaterThan(0);
        expect(fish.marketWeightMaxKg).toBeGreaterThan(fish.marketWeightMinKg);
        expect(fish.stages.juvenileWeightKg).toBeLessThan(fish.stages.adultWeightKg);
        expect(fish.stages.adultWeightKg).toBeLessThan(fish.stages.specialtyWeightKg);
        expect(fish.feedItemIds.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Farm Plots & Pricing', () => {
    it('defines 36 plots with 4 starter unlocked plots', () => {
      expect(TOTAL_FARM_PLOTS).toBe(36);
      expect(FARM_PLOT_TOTAL).toBe(36);
      expect(STARTER_UNLOCKED_PLOT_INDICES).toEqual([0, 1, 2, 3]);
      expect(FARM_STARTER_PLOTS).toEqual([0, 1, 2, 3]);
      expect(FARM_PLOT_CONFIGS).toHaveLength(36);

      // Verify starter plots have 0 unlock price and unlocked flag
      for (let i = 0; i < 4; i++) {
        expect(FARM_PLOT_CONFIGS[i]!.isStarterUnlocked).toBe(true);
        expect(FARM_PLOT_CONFIGS[i]!.unlockPrice).toBe(0);
        expect(getPlotUnlockPrice(i)).toBe(0);
      }

      // Verify subsequent tiers
      expect(getPlotUnlockPrice(4)).toBe(250);
      expect(getPlotUnlockPrice(8)).toBe(500);
      expect(getPlotUnlockPrice(12)).toBe(1000);
      expect(getPlotUnlockPrice(16)).toBe(1500);
      expect(getPlotUnlockPrice(20)).toBe(2500);
      expect(getPlotUnlockPrice(24)).toBe(3500);
      expect(getPlotUnlockPrice(28)).toBe(5000);
      expect(getPlotUnlockPrice(32)).toBe(7500);
    });

    it('computes valid plot bounding rectangles within farm map bounds', () => {
      for (let i = 0; i < 36; i++) {
        const rect = getFarmPlotRect(i);
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.w).toBeLessThanOrEqual(FARM_WIDTH);
        expect(rect.y + rect.h).toBeLessThanOrEqual(FARM_HEIGHT);
      }
      expect(() => getFarmPlotRect(-1)).toThrow();
      expect(() => getFarmPlotRect(36)).toThrow();
    });
  });

  describe('Warehouse Silo Storage', () => {
    it('defines warehouse capacity and upgrade tiers up to 500', () => {
      expect(BASE_WAREHOUSE_CAPACITY).toBe(100);
      expect(MAX_WAREHOUSE_CAPACITY).toBe(500);
      expect(WAREHOUSE_UPGRADE_TIERS).toHaveLength(8);

      let prevCap = BASE_WAREHOUSE_CAPACITY;
      let prevCost = 0;
      for (const tier of WAREHOUSE_UPGRADE_TIERS) {
        expect(tier.capacity).toBe(prevCap + 50);
        expect(tier.upgradeCostCoin).toBeGreaterThan(prevCost);
        prevCap = tier.capacity;
        prevCost = tier.upgradeCostCoin;
      }
      expect(prevCap).toBe(500);
    });

    it('correctly maps items to the 4 silo warehouse tabs', () => {
      expect(getWarehouseTabForItem('crop_rice_harvest')).toBe('crops');
      expect(getWarehouseTabForItem('crop_watermelon_harvest')).toBe('crops');
      expect(getWarehouseTabForItem('yield_egg')).toBe('animal_products');
      expect(getWarehouseTabForItem('yield_milk')).toBe('animal_products');
      expect(getWarehouseTabForItem('fish_pond_tra_harvest')).toBe('animal_products');
      expect(getWarehouseTabForItem('seed_rice')).toBe('seeds_stocks');
      expect(getWarehouseTabForItem('stock_chicken')).toBe('seeds_stocks');
      expect(getWarehouseTabForItem('stock_fingerling_tra')).toBe('seeds_stocks');
      expect(getWarehouseTabForItem('feed_grain')).toBe('supplies');
      expect(getWarehouseTabForItem('tool_watering_can')).toBe('supplies');
      expect(getWarehouseTabForItem('fertilizer_bio')).toBe('supplies');
    });
  });

  describe('Tiệm Nông Nghiệp Bác Sáu & Contracts', () => {
    it('defines authoritative shop items with unique IDs', () => {
      expect(BAC_SAU_SHOP_ITEMS.length).toBeGreaterThanOrEqual(19);
      const seenIds = new Set<string>();
      for (const item of BAC_SAU_SHOP_ITEMS) {
        expect(seenIds.has(item.id)).toBe(false);
        seenIds.add(item.id);
        expect(item.coinPrice).toBeGreaterThan(0);
        expect(['seeds', 'livestock', 'feed', 'supplies']).toContain(item.category);
      }
    });

    it('defines daily market contracts with +25% bonus math', () => {
      expect(DAILY_MARKET_CONTRACTS).toHaveLength(6);
      for (const contract of DAILY_MARKET_CONTRACTS) {
        expect(contract.requiredQuantity).toBeGreaterThan(0);
        expect(contract.rewardCoin).toBeGreaterThan(0);
        expect(contract.rewardFame).toBeGreaterThan(0);
        expect(contract.bonusPercent).toBe(25);
      }
    });
  });

  describe('Pure Game Simulation Calculations', () => {
    it('calculates crop growth stages across time', () => {
      const rice = CROPS.crop_rice; // 180s total: sprout at 45s (25%), blooming at 108s (60%), mature at 180s
      const now = 1000000;

      // Seed stage (0..44s)
      expect(getCropGrowthStage(now - 20 * 1000, rice, false, now)).toBe('seed');
      // Sprout stage (45..107s)
      expect(getCropGrowthStage(now - 60 * 1000, rice, false, now)).toBe('sprout');
      // Blooming stage (108..179s)
      expect(getCropGrowthStage(now - 120 * 1000, rice, false, now)).toBe('blooming');
      // Mature stage (>=180s)
      expect(getCropGrowthStage(now - 180 * 1000, rice, false, now)).toBe('mature');
      expect(getCropGrowthStage(now - 200 * 1000, rice, false, now)).toBe('mature');
    });

    it('fertilizer reduces growth duration by 50%', () => {
      const rice = CROPS.crop_rice; // 180s base -> 90s fertilized
      expect(FERTILIZER_GROWTH_MULTIPLIER).toBe(0.5);
      const now = 1000000;

      // At 90s: unfertilized is still blooming (90 / 180 = 50% -> sprout), fertilized is mature!
      expect(getCropGrowthStage(now - 90 * 1000, rice, false, now)).toBe('sprout');
      expect(getCropGrowthStage(now - 90 * 1000, rice, true, now)).toBe('mature');
    });

    it('determines soil moisture decay at 30 minutes', () => {
      expect(SOIL_MOISTURE_DURATION_SEC).toBe(1800);
      const now = 2000000;

      // Watered 15 mins ago -> moist
      expect(isPlotMoist(now - 900 * 1000, now)).toBe(true);
      // Watered 29 mins ago -> moist
      expect(isPlotMoist(now - 1740 * 1000, now)).toBe(true);
      // Watered 31 mins ago -> dry
      expect(isPlotMoist(now - 1860 * 1000, now)).toBe(false);
      // Null wateredAt -> dry
      expect(isPlotMoist(null, now)).toBe(false);
    });

    it('calculates pond fish weight and stage progression', () => {
      const tra = POND_FISHES.tra; // min 1.5kg, max 4.5kg, duration 900s
      const now = 5000000;

      // At stocked time: initial weight (0.10kg) -> fingerling
      const initialWeight = calculatePondFishWeight(now, tra, false, now);
      expect(initialWeight).toBe(0.1);
      expect(getPondFishStage(initialWeight, tra)).toBe('fingerling');

      // Half duration (450s): 0.10 + 0.5 * 4.40 = 2.30kg -> adult
      const midWeight = calculatePondFishWeight(now - 450 * 1000, tra, false, now);
      expect(midWeight).toBe(2.3);
      expect(getPondFishStage(midWeight, tra)).toBe('adult');

      // Full duration (900s): max weight (4.5kg) -> specialty
      const matureWeight = calculatePondFishWeight(now - 900 * 1000, tra, false, now);
      expect(matureWeight).toBe(4.5);
      expect(getPondFishStage(matureWeight, tra)).toBe('specialty');

      // Aerator boosts growth rate by +15%
      const weightWithAerator = calculatePondFishWeight(now - 450 * 1000, tra, true, now);
      expect(weightWithAerator).toBeGreaterThan(midWeight);
    });

    it('evaluates plot composite state', () => {
      const now = 1000000;
      // Locked plot
      expect(
        getPlotState(
          {
            isUnlocked: false,
            isTilled: false,
            wateredAt: null,
            cropId: null,
            plantedAt: null,
          },
          now,
        ),
      ).toBe('locked');

      // Untilled plot
      expect(
        getPlotState(
          {
            isUnlocked: true,
            isTilled: false,
            wateredAt: null,
            cropId: null,
            plantedAt: null,
          },
          now,
        ),
      ).toBe('untilled');

      // Tilled dry
      expect(
        getPlotState(
          {
            isUnlocked: true,
            isTilled: true,
            wateredAt: null,
            cropId: null,
            plantedAt: null,
          },
          now,
        ),
      ).toBe('tilled_dry');

      // Tilled wet
      expect(
        getPlotState(
          {
            isUnlocked: true,
            isTilled: true,
            wateredAt: now - 300 * 1000,
            cropId: null,
            plantedAt: null,
          },
          now,
        ),
      ).toBe('tilled_wet');

      // Growing crop
      expect(
        getPlotState(
          {
            isUnlocked: true,
            isTilled: true,
            wateredAt: now - 300 * 1000,
            cropId: 'crop_rice',
            plantedAt: now - 60 * 1000,
          },
          now,
        ),
      ).toBe('growing');

      // Mature crop
      expect(
        getPlotState(
          {
            isUnlocked: true,
            isTilled: true,
            wateredAt: now - 300 * 1000,
            cropId: 'crop_rice',
            plantedAt: now - 200 * 1000,
          },
          now,
        ),
      ).toBe('mature');
    });
  });

  describe('Farm Map & Town Portal Layout', () => {
    it('verifies farm map dimensions and coordinates', () => {
      expect(FARM_COLS).toBe(48);
      expect(FARM_ROWS).toBe(32);
      expect(FARM_WIDTH).toBe(48 * TILE);
      expect(FARM_HEIGHT).toBe(32 * TILE);
      expect(FARM_SPAWN.x).toBeLessThan(FARM_WIDTH);
      expect(FARM_SPAWN.y).toBeLessThan(FARM_HEIGHT);
      expect(FARM_GATE_EXIT.x).toBeLessThan(FARM_WIDTH);
      expect(TOWN_FARM_PORTAL_SPAWN.x).toBe(2 * TILE);
      expect(TOWN_FARM_PORTAL_SPAWN.y).toBe(11 * TILE);
      expect(FARM_GATE_PORTAL).toBeDefined();
    });

    it('verifies farm zones and pois are within map bounds', () => {
      expect(FARM_ZONES).toHaveLength(9);
      for (const zone of FARM_ZONES) {
        expect(zone.rect.x).toBeGreaterThanOrEqual(0);
        expect(zone.rect.y).toBeGreaterThanOrEqual(0);
        expect(zone.rect.x + zone.rect.w).toBeLessThanOrEqual(FARM_WIDTH);
        expect(zone.rect.y + zone.rect.h).toBeLessThanOrEqual(FARM_HEIGHT);
      }

      for (const poi of Object.values(FARM_POIS)) {
        expect(poi.x).toBeGreaterThanOrEqual(0);
        expect(poi.y).toBeGreaterThanOrEqual(0);
        expect(poi.x + poi.w).toBeLessThanOrEqual(FARM_WIDTH);
        expect(poi.y + poi.h).toBeLessThanOrEqual(FARM_HEIGHT);
      }

      expect(FARM_BLOCKERS.length).toBeGreaterThan(0);
      expect(FARM_MAP.cols).toBe(48);
      expect(FARM_MAP.rows).toBe(32);
    });

    it('verifies town map has farm_gate zone and paved path connecting to it', () => {
      const farmGateZone = ZONES.find((z) => z.id === 'farm_gate');
      expect(farmGateZone).toBeDefined();
      expect(farmGateZone?.rect.x).toBe(0);
      expect(farmGateZone?.rect.y).toBe(10 * TILE);

      const pathAtGate = PATHS.find((p) => p.x === 0 && p.y === 10 * TILE);
      expect(pathAtGate).toBeDefined();
    });
  });
});
