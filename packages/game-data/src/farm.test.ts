import { describe, expect, it } from 'vitest';
import type { AnimalType, CropId, PondFishSpecies } from './index.js';
import {
  ANIMALS,
  BAC_SAU_SHOP_ITEMS,
  BASE_WAREHOUSE_CAPACITY,
  calculatePondFishWeight,
  computeAnimalGrowthStage,
  computeAnimalHunger,
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
  isWeatherRainy,
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
  FEED_TROUGHS,
  getAnimalStarvationSeverity,
  facilityForAnimalType,
  simulateTroughFeeding,
  type LivestockFacilityKey,
  BREEDING_MIN_HAPPINESS,
  BREEDING_HAPPINESS_COST,
  BREEDING_MAX_FARM_ANIMALS,
  getAnimalBreedingStatus,
  canBreedAnimals,
  type BreedingCandidate,
  BASE_LIVESTOCK_CAPACITY,
  LIVESTOCK_CAPACITY_TIERS,
  getNextLivestockCapacityTier,
  TROUGH_UPGRADE_TIERS,
  getTroughCapacityForLevel,
  getNextTroughUpgrade,
} from './index.js';

describe('Cozy Farm System Game Data', () => {
  describe('Crops Catalog', () => {
    const cropIds: CropId[] = [
      'crop_rice',
      'crop_corn',
      'crop_watermelon',
      'crop_tomato',
      'crop_chili',
      'crop_strawberry',
      'crop_pumpkin',
      'crop_eggplant',
      'crop_carrot',
      'crop_sunflower',
      'crop_grape',
      'crop_cabbage',
      'crop_pineapple',
      'crop_dragonfruit',
      'crop_sugarcane',
    ];

    it('defines all 15 authoritative crop definitions', () => {
      expect(Object.keys(CROPS)).toHaveLength(15);
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
        expect(animal.growthDurationSec).toBeGreaterThan(0);
        expect(animal.matureSellPrice).toBeGreaterThan(animal.stockPrice);
        expect(animal.babyName.length).toBeGreaterThan(0);
      }
    });

    it('requires food to grow and progresses through growth stages when fed', () => {
      const now = 1_000_000;
      // 1. Newly born chicken, unfed -> baby stage, 0%
      const baby = computeAnimalGrowthStage('chicken', new Date(now), now);
      expect(baby.stage).toBe('baby');
      expect(baby.progressPercent).toBe(0);
      expect(baby.remainingSec).toBe(ANIMALS.chicken.growthDurationSec);
      expect(baby.displayName).toBe(ANIMALS.chicken.babyName);
      expect(baby.sellPrice).toBeLessThan(ANIMALS.chicken.matureSellPrice);
      expect(baby.isDead).toBe(false);

      // 2. Unfed chicken after some time has passed -> still 0% progress! (cannot grow without food)
      const unfedLater = computeAnimalGrowthStage('chicken', new Date(now - 120_000), now, null);
      expect(unfedLater.stage).toBe('baby');
      expect(unfedLater.progressPercent).toBe(0);
      expect(unfedLater.remainingSec).toBe(ANIMALS.chicken.growthDurationSec);

      // 3. Fed chicken: halfway through growth duration -> growing stage
      const fedHalfwayMs = now - ANIMALS.chicken.growthDurationSec * 0.5 * 1000;
      const growing = computeAnimalGrowthStage(
        'chicken',
        new Date(fedHalfwayMs),
        now,
        new Date(fedHalfwayMs),
      );
      expect(growing.stage).toBe('growing');
      expect(growing.progressPercent).toBe(50);
      expect(growing.sellPrice).toBeGreaterThan(baby.sellPrice);
      expect(growing.isDead).toBe(false);

      // 4. Fed chicken: fully reached mature growth duration -> adult stage
      const fedMatureMs = now - (ANIMALS.chicken.growthDurationSec + 10) * 1000;
      const adult = computeAnimalGrowthStage('chicken', new Date(fedMatureMs), now, new Date(fedMatureMs));
      expect(adult.stage).toBe('adult');
      expect(adult.progressPercent).toBe(100);
      expect(adult.remainingSec).toBe(0);
      expect(adult.displayName).toBe(ANIMALS.chicken.name);
      expect(adult.sellPrice).toBe(ANIMALS.chicken.matureSellPrice);
      expect(adult.isDead).toBe(false);
    });

    it('causes animals to die of starvation if hungry for too long', () => {
      const now = 2_000_000;
      const chicken = ANIMALS.chicken;

      // Newborn unfed past hungerDecaySec dies
      const starvedFromBirth = now - (chicken.hungerDecaySec + 5) * 1000;
      const deadNewborn = computeAnimalGrowthStage('chicken', new Date(starvedFromBirth), now, null);
      expect(deadNewborn.isDead).toBe(true);
      expect(deadNewborn.stage).toBe('dead');
      expect(deadNewborn.sellPrice).toBe(0);
      expect(deadNewborn.displayName).toContain('Đã chết vì đói');

      // Fed once, but starved past feedIntervalSec + hungerDecaySec dies
      const starvedFedMs = now - (chicken.feedIntervalSec + chicken.hungerDecaySec + 10) * 1000;
      const deadFed = computeAnimalGrowthStage(
        'chicken',
        new Date(starvedFedMs),
        now,
        new Date(starvedFedMs),
      );
      expect(deadFed.isDead).toBe(true);
      expect(deadFed.stage).toBe('dead');
      expect(deadFed.sellPrice).toBe(0);
    });

    it('computes hunger status, starvation countdown, and death accurately', () => {
      const now = 2_000_000;
      const chicken = ANIMALS.chicken;

      // 1. Never fed -> isHungry: true, starvation timer counting down
      const birthMs = now - 100_000; // 100s ago
      const unfed = computeAnimalHunger('chicken', null, null, now, false, new Date(birthMs));
      expect(unfed.isHungry).toBe(true);
      expect(unfed.hungerRemainingSec).toBe(0);
      expect(unfed.isDead).toBe(false);
      expect(unfed.starvationRemainingSec).toBe(chicken.hungerDecaySec - 100);

      // 2. Just fed -> isHungry: false, full feed interval timer
      const justFed = computeAnimalHunger('chicken', new Date(now), null, now);
      expect(justFed.isHungry).toBe(false);
      expect(justFed.hungerRemainingSec).toBe(chicken.feedIntervalSec);
      expect(justFed.isDead).toBe(false);
      expect(justFed.starvationRemainingSec).toBe(chicken.hungerDecaySec);

      // 3. Halfway through feed interval
      const halfFedMs = now - (chicken.feedIntervalSec / 2) * 1000;
      const halfFed = computeAnimalHunger('chicken', new Date(halfFedMs), null, now);
      expect(halfFed.isHungry).toBe(false);
      expect(halfFed.hungerRemainingSec).toBe(Math.round(chicken.feedIntervalSec / 2));
      expect(halfFed.isDead).toBe(false);

      // 4. Elapsed feed interval -> isHungry: true, canYield: true (if adult)
      const starvedMs = now - (chicken.feedIntervalSec + 10) * 1000;
      const hungry = computeAnimalHunger('chicken', new Date(starvedMs), null, now, true);
      expect(hungry.isHungry).toBe(true);
      expect(hungry.hungerRemainingSec).toBe(0);
      expect(hungry.canYield).toBe(true);
      expect(hungry.isDead).toBe(false);
      expect(hungry.starvationRemainingSec).toBe(chicken.hungerDecaySec - 10);

      // 5. Starvation countdown reaches 0 -> animal dies
      const fatalMs = now - (chicken.feedIntervalSec + chicken.hungerDecaySec + 1) * 1000;
      const deadHunger = computeAnimalHunger('chicken', new Date(fatalMs), null, now, true);
      expect(deadHunger.isDead).toBe(true);
      expect(deadHunger.starvationRemainingSec).toBe(0);
      expect(deadHunger.canYield).toBe(false);
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
      expect(DAILY_MARKET_CONTRACTS).toHaveLength(9);
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

      // Rain naturally keeps crops moist without manual watering
      expect(isPlotMoist(null, now, true)).toBe(true);
      expect(isPlotMoist(now - 3600 * 1000, now, true)).toBe(true);
      expect(isWeatherRainy('rain')).toBe(true);
      expect(isWeatherRainy('heavy_rain')).toBe(true);
      expect(isWeatherRainy('thunderstorm')).toBe(true);
      expect(isWeatherRainy('drizzle')).toBe(true);
      expect(isWeatherRainy('sunny')).toBe(false);
      expect(isWeatherRainy({ condition: 'rain' })).toBe(true);
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

      // Rainy weather: tilled dry becomes tilled wet even without manual watering
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
          true,
        ),
      ).toBe('tilled_wet');
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

  describe('Feed Troughs & Starvation Warning System', () => {
    it('defines feed troughs for all 4 livestock facilities', () => {
      const facilities: LivestockFacilityKey[] = ['poultry', 'cattle', 'pig', 'goat'];
      for (const fac of facilities) {
        const trough = FEED_TROUGHS[fac];
        expect(trough).toBeDefined();
        expect(trough.facility).toBe(fac);
        expect(trough.capacity).toBeGreaterThan(0);
        expect(trough.feedItemId).toBeDefined();
        expect(trough.feedName).toBeDefined();
        expect(trough.animalTypes.length).toBeGreaterThan(0);
      }
    });

    it('correctly maps animal species to their respective facility', () => {
      expect(facilityForAnimalType('chicken')).toBe('poultry');
      expect(facilityForAnimalType('duck')).toBe('poultry');
      expect(facilityForAnimalType('cow')).toBe('cattle');
      expect(facilityForAnimalType('pig')).toBe('pig');
      expect(facilityForAnimalType('goat')).toBe('goat');
      expect(facilityForAnimalType('sheep')).toBe('goat');
    });

    it('classifies starvation severity tiers accurately', () => {
      // Dead
      expect(getAnimalStarvationSeverity(true, true, 0)).toBe('dead');
      expect(getAnimalStarvationSeverity(true, false, 500)).toBe('dead');

      // Healthy (not hungry)
      expect(getAnimalStarvationSeverity(false, false, 600)).toBe('healthy');

      // Hungry but safe (> 15 mins remaining)
      expect(getAnimalStarvationSeverity(false, true, 1200)).toBe('hungry');
      expect(getAnimalStarvationSeverity(false, true, 901)).toBe('hungry');

      // Critical emergency (<= 15 mins remaining)
      expect(getAnimalStarvationSeverity(false, true, 900)).toBe('critical');
      expect(getAnimalStarvationSeverity(false, true, 300)).toBe('critical');
      expect(getAnimalStarvationSeverity(false, true, 1)).toBe('critical');
    });

    it('simulates automated trough feeding and offline growth catch-up', () => {
      const now = 20000000;
      // Chicken created 15 minutes ago, unfed initially (feedInterval: 300s, growthDuration: 180s)
      const chickenId = 'chick_1';
      const animals = [
        {
          id: chickenId,
          type: 'chicken' as const,
          createdAt: now - 900 * 1000,
          fedAt: null,
          growthAccumSec: 0,
          lastYieldAt: null,
          happiness: 50,
        },
      ];

      const troughs = {
        poultry: { facility: 'poultry' as const, amount: 5, capacity: 40 },
        cattle: { facility: 'cattle' as const, amount: 0, capacity: 30 },
        pig: { facility: 'pig' as const, amount: 0, capacity: 35 },
        goat: { facility: 'goat' as const, amount: 0, capacity: 30 },
      };

      const result = simulateTroughFeeding(animals, troughs, now);
      const updatedChicken = result.updatedAnimals.find((a) => a.id === chickenId)!;

      // Chicken should have eaten multiple times from the trough
      expect(result.mealsConsumed.poultry).toBeGreaterThan(0);
      expect(result.updatedTroughs.poultry.amount).toBeLessThan(5);
      expect(updatedChicken.growthAccumSec).toBeGreaterThan(0);
      expect(updatedChicken.fedAt).not.toBeNull();
    });

    it('stops feeding when trough is depleted', () => {
      const now = 20000000;
      const animals = [
        {
          id: 'cow_1',
          type: 'cow' as const,
          createdAt: now - 3600 * 1000, // 1 hour ago
          fedAt: null,
          growthAccumSec: 0,
          lastYieldAt: null,
          happiness: 50,
        },
      ];

      // Only 1 meal in cattle trough
      const troughs = {
        poultry: { facility: 'poultry' as const, amount: 0, capacity: 40 },
        cattle: { facility: 'cattle' as const, amount: 1, capacity: 30 },
        pig: { facility: 'pig' as const, amount: 0, capacity: 35 },
        goat: { facility: 'goat' as const, amount: 0, capacity: 30 },
      };

      const result = simulateTroughFeeding(animals, troughs, now);
      expect(result.mealsConsumed.cattle).toBe(1);
      expect(result.updatedTroughs.cattle.amount).toBe(0);
    });

    it('does not feed dead animals from troughs', () => {
      const now = 50000000;
      const animals = [
        {
          id: 'dead_pig',
          type: 'pig' as const,
          createdAt: now - 86400 * 1000, // 1 day ago (way past hungerDecaySec)
          fedAt: null,
          growthAccumSec: 0,
          lastYieldAt: null,
          happiness: 0,
        },
      ];

      const troughs = {
        poultry: { facility: 'poultry' as const, amount: 0, capacity: 40 },
        cattle: { facility: 'cattle' as const, amount: 0, capacity: 30 },
        pig: { facility: 'pig' as const, amount: 20, capacity: 35, updatedAt: now },
        goat: { facility: 'goat' as const, amount: 0, capacity: 30 },
      };

      const result = simulateTroughFeeding(animals, troughs, now);
      expect(result.mealsConsumed.pig).toBe(0);
      expect(result.updatedTroughs.pig.amount).toBe(20);
      expect(result.updatedAnimals[0]!.fedAt).toBeNull();
    });
  });

  describe('Livestock Breeding System (Ghép Đôi Sinh Sản)', () => {
    const now = 10000000;

    it('defines breeding cooldown for all animal species', () => {
      expect(BREEDING_MIN_HAPPINESS).toBe(80);
      expect(BREEDING_HAPPINESS_COST).toBe(20);
      expect(ANIMALS.chicken.breedingCooldownSec).toBeGreaterThan(0);
      expect(ANIMALS.duck.breedingCooldownSec).toBeGreaterThan(0);
      expect(ANIMALS.cow.breedingCooldownSec).toBeGreaterThan(0);
      expect(ANIMALS.pig.breedingCooldownSec).toBeGreaterThan(0);
      expect(ANIMALS.goat.breedingCooldownSec).toBeGreaterThan(0);
      expect(ANIMALS.sheep.breedingCooldownSec).toBeGreaterThan(0);
    });

    it('requires adult stage, happiness >= 80, well-fed, and cooldown elapsed', () => {
      const candidate: BreedingCandidate = {
        id: 'cow_1',
        type: 'cow',
        displayName: 'Bò Sữa Đồng Nai',
        stage: 'adult',
        happiness: 85,
        isDead: false,
        isHungry: false,
        bredAt: null,
      };

      // Fully eligible
      expect(getAnimalBreedingStatus(candidate, now).canBreed).toBe(true);

      // Ineligible: baby or growing
      expect(getAnimalBreedingStatus({ ...candidate, stage: 'baby' }, now).canBreed).toBe(false);
      expect(getAnimalBreedingStatus({ ...candidate, stage: 'growing' }, now).canBreed).toBe(false);

      // Ineligible: happiness < 80
      expect(getAnimalBreedingStatus({ ...candidate, happiness: 79 }, now).canBreed).toBe(false);

      // Ineligible: hungry
      expect(getAnimalBreedingStatus({ ...candidate, isHungry: true }, now).canBreed).toBe(false);

      // Ineligible: dead
      expect(getAnimalBreedingStatus({ ...candidate, isDead: true }, now).canBreed).toBe(false);

      // Ineligible: in cooldown (cooldown for cow is 600s)
      const inCooldown = getAnimalBreedingStatus(
        { ...candidate, bredAt: now - 300 * 1000 }, // 300s ago
        now,
      );
      expect(inCooldown.canBreed).toBe(false);
      expect(inCooldown.cooldownRemainingSec).toBe(300);

      // Eligible once cooldown passed (700s ago)
      expect(getAnimalBreedingStatus({ ...candidate, bredAt: now - 700 * 1000 }, now).canBreed).toBe(true);
    });

    it('validates pair compatibility: same species, distinct animals, farm capacity', () => {
      const parentA: BreedingCandidate = {
        id: 'cow_1',
        type: 'cow',
        displayName: 'Bò Mẹ 1',
        stage: 'adult',
        happiness: 90,
        isDead: false,
        isHungry: false,
        bredAt: null,
      };
      const parentB: BreedingCandidate = {
        id: 'cow_2',
        type: 'cow',
        displayName: 'Bò Ba 2',
        stage: 'adult',
        happiness: 85,
        isDead: false,
        isHungry: false,
        bredAt: null,
      };

      // Valid pair
      expect(canBreedAnimals(parentA, parentB, now, 10, BREEDING_MAX_FARM_ANIMALS).ok).toBe(true);

      // Cannot breed with itself
      expect(canBreedAnimals(parentA, parentA, now, 10, BREEDING_MAX_FARM_ANIMALS).ok).toBe(false);

      // Cannot breed different species
      const chickenPartner: BreedingCandidate = {
        ...parentB,
        id: 'chick_2',
        type: 'chicken',
      };
      expect(canBreedAnimals(parentA, chickenPartner, now, 10, BREEDING_MAX_FARM_ANIMALS).ok).toBe(false);

      // Farm capacity full (>= 24)
      expect(canBreedAnimals(parentA, parentB, now, 24, BREEDING_MAX_FARM_ANIMALS).ok).toBe(false);
    });
  });

  describe('Farm Facility Capacity & Trough Upgrades', () => {
    it('handles livestock pen capacity expansion tiers', () => {
      expect(BASE_LIVESTOCK_CAPACITY).toBe(24);
      expect(LIVESTOCK_CAPACITY_TIERS).toHaveLength(4);

      // Base capacity next tier is 32
      const tier1 = getNextLivestockCapacityTier(24);
      expect(tier1).not.toBeNull();
      expect(tier1?.capacity).toBe(32);
      expect(tier1?.costCoins).toBe(15000);

      // Tier 1 next is 40
      const tier2 = getNextLivestockCapacityTier(32);
      expect(tier2?.capacity).toBe(40);
      expect(tier2?.costCoins).toBe(35000);

      // Tier 2 next is 50
      const tier3 = getNextLivestockCapacityTier(40);
      expect(tier3?.capacity).toBe(50);
      expect(tier3?.costCoins).toBe(75000);

      // Max tier has no next tier
      expect(getNextLivestockCapacityTier(50)).toBeNull();
    });

    it('calculates trough capacity multipliers and next upgrade tiers', () => {
      expect(TROUGH_UPGRADE_TIERS).toHaveLength(3);

      // Level 1: base (poultry = 40)
      expect(getTroughCapacityForLevel('poultry', 1)).toBe(40);
      // Level 2: 40 * 1.75 = 70
      expect(getTroughCapacityForLevel('poultry', 2)).toBe(70);
      // Level 3: 40 * 2.5 = 100
      expect(getTroughCapacityForLevel('poultry', 3)).toBe(100);

      // Cattle base: 30
      expect(getTroughCapacityForLevel('cattle', 1)).toBe(30);
      expect(getTroughCapacityForLevel('cattle', 2)).toBe(53); // Math.round(30 * 1.75) = 53
      expect(getTroughCapacityForLevel('cattle', 3)).toBe(75); // Math.round(30 * 2.5) = 75

      // Next upgrade from level 1
      const nextPoultry = getNextTroughUpgrade('poultry', 1);
      expect(nextPoultry).not.toBeNull();
      expect(nextPoultry?.level).toBe(2);
      expect(nextPoultry?.capacity).toBe(70);
      expect(nextPoultry?.costCoins).toBe(5000);

      // Next upgrade from level 2
      const nextPoultryL3 = getNextTroughUpgrade('poultry', 2);
      expect(nextPoultryL3?.level).toBe(3);
      expect(nextPoultryL3?.capacity).toBe(100);
      expect(nextPoultryL3?.costCoins).toBe(12000);

      // Level 3 is max
      expect(getNextTroughUpgrade('poultry', 3)).toBeNull();
    });
  });
});
