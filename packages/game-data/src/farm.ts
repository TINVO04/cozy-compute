// ============================================================================
// File: packages/game-data/src/farm.ts
// Cozy Farm System (Hệ Thống Trang Trại Cá Nhân) Authoritative Game Data
// Server-authoritative specifications, growth curves, prices, and catalogs.
// ============================================================================

// ==========================================
// 1. CROPS & SOIL TYPES & CATALOG
// ==========================================

export type CropId =
  | 'crop_rice'
  | 'crop_corn'
  | 'crop_watermelon'
  | 'crop_tomato'
  | 'crop_chili'
  | 'crop_strawberry'
  | 'crop_pumpkin'
  | 'crop_eggplant'
  | 'crop_carrot'
  | 'crop_sunflower'
  | 'crop_grape'
  | 'crop_cabbage'
  | 'crop_pineapple'
  | 'crop_dragonfruit'
  | 'crop_sugarcane';

export type CropGrowthStage = 'empty' | 'seed' | 'sprout' | 'blooming' | 'mature' | 'withered';

export interface CropGrowthStageTiming {
  sproutAtSec: number;
  bloomingAtSec: number;
  matureAtSec: number;
}

export interface CropDef {
  id: CropId;
  name: string;
  description: string;
  seedItemId: string;
  harvestItemId: string;
  seedPrice: number;
  sellPrice: number;
  growthDurationSec: number;
  baseYieldMin: number;
  baseYieldMax: number;
  stages: CropGrowthStageTiming;
  sprite: string;
}

export type PlotState = 'locked' | 'untilled' | 'tilled_dry' | 'tilled_wet' | 'growing' | 'mature';

export interface FarmPlotConfig {
  index: number; // 0..35
  unlockPrice: number;
  isStarterUnlocked: boolean;
}

export const TOTAL_FARM_PLOTS = 36;
export const STARTER_UNLOCKED_PLOT_INDICES = [0, 1, 2, 3] as const;
export const SOIL_MOISTURE_DURATION_SEC = 1800; // 30 minutes
export const FERTILIZER_GROWTH_MULTIPLIER = 0.5; // -50% required growth duration

export const CROPS: Record<CropId, CropDef> = {
  crop_rice: {
    id: 'crop_rice',
    name: 'Lúa Nước Nàng Thơm',
    description: 'Bông lúa vàng óng trĩu hạt, giống Nàng Thơm Chợ Đào hương phù sa ngọt ngào.',
    seedItemId: 'seed_rice',
    harvestItemId: 'crop_rice_harvest',
    seedPrice: 30,
    sellPrice: 22,
    growthDurationSec: 180, // 3 minutes base (90s fertilized)
    baseYieldMin: 2,
    baseYieldMax: 4,
    stages: {
      sproutAtSec: 45,
      bloomingAtSec: 108,
      matureAtSec: 180,
    },
    sprite: 'farm:crop_rice',
  },
  crop_corn: {
    id: 'crop_corn',
    name: 'Bắp Ngô Ngọt Sữa',
    description: 'Giống bắp ngô nếp ngọt sữa, bắp to hạt đều, vỏ bẹ xanh mướt.',
    seedItemId: 'seed_corn',
    harvestItemId: 'crop_corn_harvest',
    seedPrice: 50,
    sellPrice: 28,
    growthDurationSec: 360, // 6 minutes base (180s fertilized)
    baseYieldMin: 2,
    baseYieldMax: 5,
    stages: {
      sproutAtSec: 90,
      bloomingAtSec: 216,
      matureAtSec: 360,
    },
    sprite: 'farm:crop_corn',
  },
  crop_watermelon: {
    id: 'crop_watermelon',
    name: 'Dưa Hấu Ruột Đỏ Long An',
    description: 'Dưa hấu vỏ xanh sọc đen, ruột đỏ au mọng nước ngọt lịm ngày nắng hạ.',
    seedItemId: 'seed_watermelon',
    harvestItemId: 'crop_watermelon_harvest',
    seedPrice: 120,
    sellPrice: 75,
    growthDurationSec: 600, // 10 minutes base (300s fertilized)
    baseYieldMin: 2,
    baseYieldMax: 4,
    stages: {
      sproutAtSec: 150,
      bloomingAtSec: 360,
      matureAtSec: 600,
    },
    sprite: 'farm:crop_watermelon',
  },
  crop_tomato: {
    id: 'crop_tomato',
    name: 'Cà Chua Bi Chùm Mộng',
    description: 'Cà chua bi quả tròn căng bóng, đỏ mọng sai chùm thanh mát.',
    seedItemId: 'seed_tomato',
    harvestItemId: 'crop_tomato_harvest',
    seedPrice: 45,
    sellPrice: 20,
    growthDurationSec: 240, // 4 minutes base (120s fertilized)
    baseYieldMin: 3,
    baseYieldMax: 6,
    stages: {
      sproutAtSec: 60,
      bloomingAtSec: 144,
      matureAtSec: 240,
    },
    sprite: 'farm:crop_tomato',
  },
  crop_chili: {
    id: 'crop_chili',
    name: 'Ớt Hiểm Chỉ Thiên',
    description: 'Ớt hiểm cay nồng đậm đà, quả chỉ thiên đỏ rực đặc trưng đồng bằng Nam Bộ.',
    seedItemId: 'seed_chili',
    harvestItemId: 'crop_chili_harvest',
    seedPrice: 60,
    sellPrice: 22,
    growthDurationSec: 300, // 5 minutes base (150s fertilized)
    baseYieldMin: 3,
    baseYieldMax: 7,
    stages: {
      sproutAtSec: 75,
      bloomingAtSec: 180,
      matureAtSec: 300,
    },
    sprite: 'farm:crop_chili',
  },
  crop_strawberry: {
    id: 'crop_strawberry',
    name: 'Dâu Tây Đỏ Đà Lạt',
    description: 'Trái dâu tây đỏ mọng căng tròn, hương thơm dịu mát đặc sản cao nguyên Đà Lạt.',
    seedItemId: 'seed_strawberry',
    harvestItemId: 'crop_strawberry_harvest',
    seedPrice: 80,
    sellPrice: 48,
    growthDurationSec: 180, // 3 minutes base (90s fertilized)
    baseYieldMin: 3,
    baseYieldMax: 5,
    stages: {
      sproutAtSec: 45,
      bloomingAtSec: 108,
      matureAtSec: 180,
    },
    sprite: 'farm:crop_strawberry',
  },
  crop_pumpkin: {
    id: 'crop_pumpkin',
    name: 'Bí Ngô Khổng Lồ',
    description: 'Bí ngô vỏ cam vàng dày dặn no tròn, vị béo bùi thơm lừng mùa vụ.',
    seedItemId: 'seed_pumpkin',
    harvestItemId: 'crop_pumpkin_harvest',
    seedPrice: 150,
    sellPrice: 105,
    growthDurationSec: 420, // 7 minutes base (210s fertilized)
    baseYieldMin: 2,
    baseYieldMax: 3,
    stages: {
      sproutAtSec: 105,
      bloomingAtSec: 252,
      matureAtSec: 420,
    },
    sprite: 'farm:crop_pumpkin',
  },
  crop_eggplant: {
    id: 'crop_eggplant',
    name: 'Cà Tím Dài Nam Bộ',
    description: 'Cà tím thon dài vỏ tím bóng mượt, nướng mỡ hành thơm nức mũi.',
    seedItemId: 'seed_eggplant',
    harvestItemId: 'crop_eggplant_harvest',
    seedPrice: 55,
    sellPrice: 26,
    growthDurationSec: 240, // 4 minutes base (120s fertilized)
    baseYieldMin: 3,
    baseYieldMax: 6,
    stages: {
      sproutAtSec: 60,
      bloomingAtSec: 144,
      matureAtSec: 240,
    },
    sprite: 'farm:crop_eggplant',
  },
  crop_carrot: {
    id: 'crop_carrot',
    name: 'Cà Rốt Củ Cam Giòn',
    description: 'Cà rốt củ cam tươi giòn ngọt đậm, giàu dưỡng chất mát lành.',
    seedItemId: 'seed_carrot',
    harvestItemId: 'crop_carrot_harvest',
    seedPrice: 40,
    sellPrice: 22,
    growthDurationSec: 120, // 2 minutes base (60s fertilized)
    baseYieldMin: 4,
    baseYieldMax: 7,
    stages: {
      sproutAtSec: 30,
      bloomingAtSec: 72,
      matureAtSec: 120,
    },
    sprite: 'farm:crop_carrot',
  },
  crop_sunflower: {
    id: 'crop_sunflower',
    name: 'Hoa Hướng Dương Rực Rỡ',
    description: 'Bông hướng dương vàng rực quay về phía mặt trời, hạt hướng dương béo ngậy.',
    seedItemId: 'seed_sunflower',
    harvestItemId: 'crop_sunflower_harvest',
    seedPrice: 90,
    sellPrice: 58,
    growthDurationSec: 300, // 5 minutes base (150s fertilized)
    baseYieldMin: 2,
    baseYieldMax: 4,
    stages: {
      sproutAtSec: 75,
      bloomingAtSec: 180,
      matureAtSec: 300,
    },
    sprite: 'farm:crop_sunflower',
  },
  crop_grape: {
    id: 'crop_grape',
    name: 'Nho Tím Ninh Thuận',
    description: 'Chùm nho tím mọng giòn ngọt trĩu giàn, đặc sản miền nắng gió Ninh Thuận.',
    seedItemId: 'seed_grape',
    harvestItemId: 'crop_grape_harvest',
    seedPrice: 160,
    sellPrice: 115,
    growthDurationSec: 600, // 10 minutes base (300s fertilized)
    baseYieldMin: 3,
    baseYieldMax: 5,
    stages: {
      sproutAtSec: 150,
      bloomingAtSec: 360,
      matureAtSec: 600,
    },
    sprite: 'farm:crop_grape',
  },
  crop_cabbage: {
    id: 'crop_cabbage',
    name: 'Bắp Cải Trắng Đà Lạt',
    description: 'Búp bắp cải cuộn chặt tròn xoe, giòn ngọt thanh mát đặc sản nông trại xứ ngàn hoa.',
    seedItemId: 'seed_cabbage',
    harvestItemId: 'crop_cabbage_harvest',
    seedPrice: 45,
    sellPrice: 26,
    growthDurationSec: 160, // ~2.6 minutes base (80s fertilized)
    baseYieldMin: 3,
    baseYieldMax: 6,
    stages: {
      sproutAtSec: 40,
      bloomingAtSec: 96,
      matureAtSec: 160,
    },
    sprite: 'farm:crop_cabbage',
  },
  crop_pineapple: {
    id: 'crop_pineapple',
    name: 'Khóm Mật Bến Lức',
    description: 'Khóm mật chín vàng óng ả thơm lừng, vị ngọt sắc đậm đà miền sông nước Tiền Giang.',
    seedItemId: 'seed_pineapple',
    harvestItemId: 'crop_pineapple_harvest',
    seedPrice: 110,
    sellPrice: 75,
    growthDurationSec: 360, // 6 minutes base (180s fertilized)
    baseYieldMin: 2,
    baseYieldMax: 4,
    stages: {
      sproutAtSec: 90,
      bloomingAtSec: 216,
      matureAtSec: 360,
    },
    sprite: 'farm:crop_pineapple',
  },
  crop_dragonfruit: {
    id: 'crop_dragonfruit',
    name: 'Thanh Long Ruột Đỏ Chợ Gạo',
    description: 'Trái thanh long vỏ hồng tai xanh biếc, ruột đỏ thẩm mọng nước thanh mát giải nhiệt.',
    seedItemId: 'seed_dragonfruit',
    harvestItemId: 'crop_dragonfruit_harvest',
    seedPrice: 140,
    sellPrice: 95,
    growthDurationSec: 480, // 8 minutes base (240s fertilized)
    baseYieldMin: 2,
    baseYieldMax: 5,
    stages: {
      sproutAtSec: 120,
      bloomingAtSec: 288,
      matureAtSec: 480,
    },
    sprite: 'farm:crop_dragonfruit',
  },
  crop_sugarcane: {
    id: 'crop_sugarcane',
    name: 'Mía Tím Hòa Bình',
    description: 'Cây mía tím gióng dài vỏ mỏng, thân mọng nước ngọt lịm thơm ngon nức tiếng.',
    seedItemId: 'seed_sugarcane',
    harvestItemId: 'crop_sugarcane_harvest',
    seedPrice: 70,
    sellPrice: 42,
    growthDurationSec: 240, // 4 minutes base (120s fertilized)
    baseYieldMin: 3,
    baseYieldMax: 6,
    stages: {
      sproutAtSec: 60,
      bloomingAtSec: 144,
      matureAtSec: 240,
    },
    sprite: 'farm:crop_sugarcane',
  },
};

/** Authoritative plot unlock pricing matching database migration */
export function getPlotUnlockPrice(index: number): number {
  if (index < 4) return 0;
  if (index < 8) return 250;
  if (index < 12) return 500;
  if (index < 16) return 1000;
  if (index < 20) return 1500;
  if (index < 24) return 2500;
  if (index < 28) return 3500;
  if (index < 32) return 5000;
  return 7500;
}

export const FARM_PLOT_CONFIGS: FarmPlotConfig[] = Array.from({ length: TOTAL_FARM_PLOTS }, (_, i) => ({
  index: i,
  unlockPrice: getPlotUnlockPrice(i),
  isStarterUnlocked: i < 4,
}));

// ==========================================
// 2. LIVESTOCK TYPES & CATALOG
// ==========================================

export type AnimalType = 'chicken' | 'duck' | 'cow' | 'pig' | 'goat' | 'sheep';

export interface AnimalDef {
  type: AnimalType;
  name: string;
  babyName: string;
  facility: 'poultry_coop' | 'cattle_pasture' | 'pig_pen' | 'goat_pen';
  description: string;
  stockItemId: string;
  stockPrice: number;
  growthDurationSec: number;
  matureSellPrice: number;
  yieldItemId: string;
  yieldItem: string; // Interface contract compatibility
  yieldName: string;
  yieldPrice: number;
  feedItemId: string;
  feedName: string;
  feedIntervalSec: number;
  happinessBoost: number;
  hungerDecaySec: number;
  breedingCooldownSec: number;
  soundBubble: string;
  sprite: string;
}

export const ANIMALS: Record<AnimalType, AnimalDef> = {
  chicken: {
    type: 'chicken',
    name: 'Gà Ri Thả Vườn',
    babyName: 'Gà Con Lông Vàng',
    facility: 'poultry_coop',
    description: 'Gà ri lông vàng óng, mổ thóc lắt nhắt quanh ổ rơm, đẻ trứng rất đều.',
    stockItemId: 'stock_chicken',
    stockPrice: 200,
    growthDurationSec: 180, // 3 minutes
    matureSellPrice: 500,
    yieldItemId: 'yield_egg',
    yieldItem: 'yield_egg',
    yieldName: 'Trứng Gà Ta Tươi',
    yieldPrice: 50,
    feedItemId: 'feed_grain',
    feedName: 'Thóc Bồ Thơm',
    feedIntervalSec: 300, // 5 minutes
    happinessBoost: 25,
    hungerDecaySec: 600, // 10 minutes
    breedingCooldownSec: 300, // 5 minutes
    soundBubble: 'Cục tác! Cục ta cục tác!',
    sprite: 'farm:animal_chicken',
  },
  duck: {
    type: 'duck',
    name: 'Vịt Xiêm Bờ Ao',
    babyName: 'Vịt Con Lạch Bạch',
    facility: 'poultry_coop',
    description: 'Vịt xiêm lông xám trắng, thích lạch bạch bơi lội và tắm mát dưới mương.',
    stockItemId: 'stock_duck',
    stockPrice: 220,
    growthDurationSec: 240, // 4 minutes
    matureSellPrice: 580,
    yieldItemId: 'yield_duck_egg',
    yieldItem: 'yield_duck_egg',
    yieldName: 'Trứng Vịt Xiêm',
    yieldPrice: 55,
    feedItemId: 'feed_grain',
    feedName: 'Thóc Bồ Thơm',
    feedIntervalSec: 360, // 6 minutes
    happinessBoost: 25,
    hungerDecaySec: 720,
    breedingCooldownSec: 360, // 6 minutes
    soundBubble: 'Cạp cạp cạp!',
    sprite: 'farm:animal_duck',
  },
  cow: {
    type: 'cow',
    name: 'Bò Sữa Đồng Nai',
    babyName: 'Bê Sữa Đáng Yêu',
    facility: 'cattle_pasture',
    description: 'Bò sữa Hà Lan thuần hóa, nhai cỏ chậm rãi bên máng gỗ, cho dòng sữa thơm béo.',
    stockItemId: 'stock_cow',
    stockPrice: 1800,
    growthDurationSec: 600, // 10 minutes
    matureSellPrice: 4200,
    yieldItemId: 'yield_milk',
    yieldItem: 'yield_milk',
    yieldName: 'Bình Sữa Bò Tươi',
    yieldPrice: 260,
    feedItemId: 'feed_hay',
    feedName: 'Rơm Khô Thượng Hạng',
    feedIntervalSec: 600, // 10 minutes
    happinessBoost: 15,
    hungerDecaySec: 1200,
    breedingCooldownSec: 600, // 10 minutes
    soundBubble: 'Ùm bòoooo!',
    sprite: 'farm:animal_cow',
  },
  pig: {
    type: 'pig',
    name: 'Heo Mọi Sọc Dưa',
    babyName: 'Heo Con Sọc Dưa',
    facility: 'pig_pen',
    description: 'Heo sọc dưa háu ăn, thích đầm mình trong bãi sình ẩm ướt và ủi tìm nấm quý.',
    stockItemId: 'stock_pig',
    stockPrice: 800,
    growthDurationSec: 360, // 6 minutes
    matureSellPrice: 1850,
    yieldItemId: 'yield_truffle',
    yieldItem: 'yield_truffle',
    yieldName: 'Nấm Tràm Đầm Lầy',
    yieldPrice: 180,
    feedItemId: 'feed_corn_mash',
    feedName: 'Cám Bắp Lên Men',
    feedIntervalSec: 450, // 7.5 minutes
    happinessBoost: 20,
    hungerDecaySec: 900,
    breedingCooldownSec: 480, // 8 minutes
    soundBubble: 'Ủn ỉn... zzz!',
    sprite: 'farm:animal_pig',
  },
  goat: {
    type: 'goat',
    name: 'Dê Núi Bách Thảo',
    babyName: 'Dê Con Tinh Nghịch',
    facility: 'goat_pen',
    description: 'Dê Bách Thảo tinh nghịch, thích leo bục gỗ dốc đứng và gặm rơm trên cao.',
    stockItemId: 'stock_goat',
    stockPrice: 1200,
    growthDurationSec: 420, // 7 minutes
    matureSellPrice: 2700,
    yieldItemId: 'yield_goat_milk',
    yieldItem: 'yield_goat_milk',
    yieldName: 'Bình Sữa Dê Thanh Mát',
    yieldPrice: 210,
    feedItemId: 'feed_hay',
    feedName: 'Rơm Khô Thượng Hạng',
    feedIntervalSec: 500, // 8.3 minutes
    happinessBoost: 20,
    hungerDecaySec: 1000,
    breedingCooldownSec: 480, // 8 minutes
    soundBubble: 'Be he he!',
    sprite: 'farm:animal_goat',
  },
  sheep: {
    type: 'sheep',
    name: 'Cừu Phan Rang',
    babyName: 'Cừu Con Lông Xù',
    facility: 'goat_pen',
    description: 'Cừu Phan Rang chịu nắng gió tốt, cho lông cừu ấm áp mềm mại.',
    stockItemId: 'stock_sheep',
    stockPrice: 1400,
    growthDurationSec: 480, // 8 minutes
    matureSellPrice: 3200,
    yieldItemId: 'yield_wool',
    yieldItem: 'yield_wool',
    yieldName: 'Cuộn Len Cừu Trắng',
    yieldPrice: 240,
    feedItemId: 'feed_hay',
    feedName: 'Rơm Khô Thượng Hạng',
    feedIntervalSec: 540, // 9 minutes
    happinessBoost: 20,
    hungerDecaySec: 1080,
    breedingCooldownSec: 480, // 8 minutes
    soundBubble: 'Beee beee!',
    sprite: 'farm:animal_sheep',
  },
};

export type AnimalGrowthStage = 'baby' | 'growing' | 'adult' | 'dead';

export interface AnimalGrowthInfo {
  stage: AnimalGrowthStage;
  progressPercent: number;
  remainingSec: number;
  canSell: boolean;
  sellPrice: number;
  displayName: string;
  isDead: boolean;
  deathReason?: string;
}

export interface AnimalHungerInfo {
  isHungry: boolean;
  hungerRemainingSec: number;
  canYield: boolean;
  feedIntervalSec: number;
  isDead: boolean;
  starvationRemainingSec: number;
}

export function computeAnimalHunger(
  animalType: string,
  fedAt: Date | string | null,
  lastYieldAt: Date | string | null,
  currentTimeMs: number,
  isAdult = false,
  createdAt?: Date | string | null,
): AnimalHungerInfo {
  const def = Object.values(ANIMALS).find((a) => a.type === animalType);
  const feedIntervalSec = def?.feedIntervalSec ?? 300;
  const hungerDecaySec = def?.hungerDecaySec ?? 600;

  if (!fedAt) {
    // Never fed since birth (or creation)
    const birthMs = createdAt ? new Date(createdAt).getTime() : currentTimeMs;
    const elapsedSec = Math.max(0, (currentTimeMs - birthMs) / 1000);
    const starvationRemainingSec = Math.max(0, Math.round(hungerDecaySec - elapsedSec));
    const isDead = starvationRemainingSec <= 0;

    return {
      isHungry: !isDead,
      hungerRemainingSec: 0,
      canYield: false,
      feedIntervalSec,
      isDead,
      starvationRemainingSec,
    };
  }

  const fedMs = new Date(fedAt).getTime();
  const elapsedSec = Math.max(0, (currentTimeMs - fedMs) / 1000);
  const hungerRemainingSec = Math.max(0, Math.round(feedIntervalSec - elapsedSec));
  const isHungry = hungerRemainingSec <= 0;

  let isDead = false;
  let starvationRemainingSec = hungerDecaySec;

  if (isHungry) {
    const starvedSec = elapsedSec - feedIntervalSec;
    starvationRemainingSec = Math.max(0, Math.round(hungerDecaySec - starvedSec));
    if (starvationRemainingSec <= 0) {
      isDead = true;
    }
  }

  const yieldMs = lastYieldAt ? new Date(lastYieldAt).getTime() : 0;
  const canYield = !isDead && isAdult && fedMs > 0 && yieldMs < fedMs && elapsedSec >= feedIntervalSec;

  return {
    isHungry: !isDead && isHungry,
    hungerRemainingSec,
    canYield,
    feedIntervalSec,
    isDead,
    starvationRemainingSec,
  };
}

export function computeAnimalGrowthStage(
  animalType: string,
  createdAt: Date | string | null,
  currentTimeMs: number,
  fedAt?: Date | string | null,
  growthAccumSec = 0,
): AnimalGrowthInfo {
  const def = Object.values(ANIMALS).find((a) => a.type === animalType);
  if (!def || !createdAt) {
    return {
      stage: 'adult',
      progressPercent: 100,
      remainingSec: 0,
      canSell: true,
      sellPrice: def?.matureSellPrice ?? 300,
      displayName: def?.name ?? animalType,
      isDead: false,
    };
  }

  // 1. Check if animal has starved to death
  const hunger = computeAnimalHunger(animalType, fedAt ?? null, null, currentTimeMs, false, createdAt);

  if (hunger.isDead) {
    return {
      stage: 'dead',
      progressPercent: 0,
      remainingSec: 0,
      canSell: true,
      sellPrice: 0,
      displayName: `${def.babyName || def.name} (Đã chết vì đói)`,
      isDead: true,
      deathReason: 'starvation',
    };
  }

  // 2. Growth calculation: Animals ONLY grow when fed!
  // If the animal has never been fed and has no accumulated growth, growth is 0%.
  const hasEaten = !!fedAt || growthAccumSec > 0;
  if (!hasEaten) {
    return {
      stage: 'baby',
      progressPercent: 0,
      remainingSec: def.growthDurationSec,
      canSell: true,
      sellPrice: Math.floor(def.stockPrice * 0.7),
      displayName: def.babyName,
      isDead: false,
    };
  }

  // Calculate elapsed digesting time from the current feeding
  const currentFedElapsedSec = fedAt ? Math.max(0, (currentTimeMs - new Date(fedAt).getTime()) / 1000) : 0;
  // Food only promotes growth during its active digestion window (up to feedIntervalSec)
  const currentDigestSec = Math.min(def.feedIntervalSec, currentFedElapsedSec);
  const totalGrowthSec = Math.min(def.growthDurationSec, (growthAccumSec || 0) + currentDigestSec);

  const totalSec = def.growthDurationSec;
  const progressPercent = Math.min(100, Math.round((totalGrowthSec / totalSec) * 100));
  const remainingSec = Math.max(0, Math.round(totalSec - totalGrowthSec));

  let stage: AnimalGrowthStage = 'baby';
  let displayName = def.babyName;
  let sellPrice = Math.floor(def.stockPrice * 0.7);

  if (totalGrowthSec >= totalSec) {
    stage = 'adult';
    displayName = def.name;
    sellPrice = def.matureSellPrice;
  } else if (totalGrowthSec >= totalSec * 0.4) {
    stage = 'growing';
    displayName = `${def.name} (Đang Lớn)`;
    sellPrice = Math.floor(def.stockPrice + (def.matureSellPrice - def.stockPrice) * (progressPercent / 100));
  }

  return {
    stage,
    progressPercent,
    remainingSec,
    canSell: true,
    sellPrice,
    displayName,
    isDead: false,
  };
}

// ==========================================
// 2b. LIVESTOCK FACILITIES & FEED TROUGHS
// ==========================================

export type LivestockFacilityKey = 'poultry' | 'cattle' | 'pig' | 'goat';

export interface FeedTroughDef {
  facility: LivestockFacilityKey;
  label: string;
  penName: string;
  icon: string;
  feedItemId: string;
  feedName: string;
  capacity: number;
  animalTypes: AnimalType[];
}

export const FEED_TROUGHS: Record<LivestockFacilityKey, FeedTroughDef> = {
  poultry: {
    facility: 'poultry',
    label: 'Máng Chuồng Gia Cầm',
    penName: 'Chuồng Gia Cầm',
    icon: '🐓',
    feedItemId: 'feed_grain',
    feedName: 'Thóc Bồ Thơm',
    capacity: 40,
    animalTypes: ['chicken', 'duck'],
  },
  cattle: {
    facility: 'cattle',
    label: 'Máng Đồng Cỏ Bò Sữa',
    penName: 'Đồng Cỏ Bò Sữa',
    icon: '🐄',
    feedItemId: 'feed_hay',
    feedName: 'Rơm Khô Thượng Hạng',
    capacity: 30,
    animalTypes: ['cow'],
  },
  pig: {
    facility: 'pig',
    label: 'Máng Chuồng Heo Mọi',
    penName: 'Chuồng Heo Mọi',
    icon: '🐖',
    feedItemId: 'feed_corn_mash',
    feedName: 'Cám Bắp Lên Men',
    capacity: 35,
    animalTypes: ['pig'],
  },
  goat: {
    facility: 'goat',
    label: 'Máng Đồi Dê & Cừu',
    penName: 'Đồi Dê & Cừu',
    icon: '🐐',
    feedItemId: 'feed_hay',
    feedName: 'Rơm Khô Thượng Hạng',
    capacity: 30,
    animalTypes: ['goat', 'sheep'],
  },
};

export interface LivestockCapacityTier {
  capacity: number;
  tier: number;
  name: string;
  costCoins: number;
}

export const BASE_LIVESTOCK_CAPACITY = 24;

export const LIVESTOCK_CAPACITY_TIERS: LivestockCapacityTier[] = [
  { tier: 0, capacity: 24, name: 'Chuồng Cơ Bản (Cấp 0)', costCoins: 0 },
  { tier: 1, capacity: 32, name: 'Chuồng Mở Rộng (Cấp 1)', costCoins: 15_000 },
  { tier: 2, capacity: 40, name: 'Trang Trại Quy Mô Lớn (Cấp 2)', costCoins: 35_000 },
  { tier: 3, capacity: 50, name: 'Khu Phức Hợp Chăn Nuôi (Cấp 3)', costCoins: 75_000 },
];

export function getNextLivestockCapacityTier(currentCapacity: number): LivestockCapacityTier | null {
  const currentIdx = LIVESTOCK_CAPACITY_TIERS.findIndex((t) => t.capacity === currentCapacity);
  if (currentIdx === -1) {
    return LIVESTOCK_CAPACITY_TIERS.find((t) => t.capacity > currentCapacity) ?? null;
  }
  return LIVESTOCK_CAPACITY_TIERS[currentIdx + 1] ?? null;
}

export interface TroughUpgradeTier {
  level: number;
  capacityMultiplier: number;
  costCoins: number;
}

export const TROUGH_UPGRADE_TIERS: TroughUpgradeTier[] = [
  { level: 1, capacityMultiplier: 1.0, costCoins: 0 },
  { level: 2, capacityMultiplier: 1.75, costCoins: 5_000 },
  { level: 3, capacityMultiplier: 2.5, costCoins: 12_000 },
];

export function getTroughCapacityForLevel(facility: LivestockFacilityKey, level: number): number {
  const def = FEED_TROUGHS[facility];
  const tier = TROUGH_UPGRADE_TIERS.find((t) => t.level === level) ?? TROUGH_UPGRADE_TIERS[0]!;
  return Math.round(def.capacity * tier.capacityMultiplier);
}

export function getNextTroughUpgrade(
  facility: LivestockFacilityKey,
  currentLevel: number,
): { level: number; capacity: number; costCoins: number } | null {
  const nextTier = TROUGH_UPGRADE_TIERS.find((t) => t.level === currentLevel + 1);
  if (!nextTier) return null;
  return {
    level: nextTier.level,
    capacity: getTroughCapacityForLevel(facility, nextTier.level),
    costCoins: nextTier.costCoins,
  };
}

export const STARVATION_WARNING_THRESHOLD_SEC = 900; // 15 minutes

export type StarvationSeverity = 'healthy' | 'hungry' | 'critical' | 'dead';

export function getAnimalStarvationSeverity(
  isDead: boolean,
  isHungry: boolean,
  starvationRemainingSec: number,
): StarvationSeverity {
  if (isDead) return 'dead';
  if (!isHungry) return 'healthy';
  if (starvationRemainingSec <= STARVATION_WARNING_THRESHOLD_SEC) return 'critical';
  return 'hungry';
}

export function facilityForAnimalType(type: string): LivestockFacilityKey {
  if (type === 'chicken' || type === 'duck') return 'poultry';
  if (type === 'cow') return 'cattle';
  if (type === 'pig') return 'pig';
  return 'goat';
}

export interface AnimalCatchUpState {
  id: string;
  type: AnimalType;
  createdAt: number;
  fedAt: number | null;
  growthAccumSec: number;
  lastYieldAt: number | null;
  happiness: number;
}

export interface TroughCatchUpState {
  facility: LivestockFacilityKey;
  amount: number;
  capacity: number;
  updatedAt?: number;
}

export function simulateTroughFeeding(
  animals: AnimalCatchUpState[],
  troughs: Record<LivestockFacilityKey, TroughCatchUpState>,
  nowMs: number,
): {
  updatedAnimals: AnimalCatchUpState[];
  updatedTroughs: Record<LivestockFacilityKey, TroughCatchUpState>;
  mealsConsumed: Record<LivestockFacilityKey, number>;
} {
  const updatedAnimals = animals.map((a) => ({ ...a }));
  const updatedTroughs: Record<LivestockFacilityKey, TroughCatchUpState> = {
    poultry: { ...troughs.poultry },
    cattle: { ...troughs.cattle },
    pig: { ...troughs.pig },
    goat: { ...troughs.goat },
  };
  const mealsConsumed: Record<LivestockFacilityKey, number> = {
    poultry: 0,
    cattle: 0,
    pig: 0,
    goat: 0,
  };

  const facilities: LivestockFacilityKey[] = ['poultry', 'cattle', 'pig', 'goat'];

  for (const fac of facilities) {
    const trough = updatedTroughs[fac];
    if (!trough || trough.amount <= 0) continue;

    const facAnimals = updatedAnimals.filter((a) => facilityForAnimalType(a.type) === fac);
    if (facAnimals.length === 0) continue;

    // Simulation loop: progressively feed the animal whose next feed time is earliest
    // until trough is empty or all animals are no longer hungry before nowMs.
    const maxIterations = 1000;
    let iteration = 0;

    while (trough.amount > 0 && iteration++ < maxIterations) {
      let earliestAnimal: AnimalCatchUpState | null = null;
      let earliestTime = Infinity;

      for (const a of facAnimals) {
        const def = (ANIMALS as Record<string, AnimalDef>)[a.type];
        if (!def) continue;

        const deadAt = a.fedAt
          ? a.fedAt + (def.feedIntervalSec + def.hungerDecaySec) * 1000
          : a.createdAt + def.hungerDecaySec * 1000;

        let nextMealTime = a.fedAt ? a.fedAt + def.feedIntervalSec * 1000 : a.createdAt;
        if (trough.updatedAt && nextMealTime < trough.updatedAt) {
          nextMealTime = trough.updatedAt;
        }

        if (nextMealTime >= deadAt) {
          // Animal starved before it could eat
          continue;
        }

        if (nextMealTime <= nowMs && nextMealTime < earliestTime) {
          earliestTime = nextMealTime;
          earliestAnimal = a;
        }
      }

      if (!earliestAnimal || earliestTime > nowMs) {
        break; // No animals currently need food before nowMs
      }

      const def = (ANIMALS as Record<string, AnimalDef>)[earliestAnimal.type];
      if (!def) break;
      trough.amount -= 1;
      mealsConsumed[fac] += 1;

      // Digest elapsed during feeding window
      const prevElapsed = earliestAnimal.fedAt
        ? Math.max(0, (earliestTime - earliestAnimal.fedAt) / 1000)
        : 0;
      const digestSec = Math.min(def.feedIntervalSec, prevElapsed);
      earliestAnimal.growthAccumSec = Math.min(
        def.growthDurationSec,
        earliestAnimal.growthAccumSec + Math.round(digestSec),
      );
      earliestAnimal.fedAt = earliestTime;
      earliestAnimal.happiness = Math.min(100, earliestAnimal.happiness + (def.happinessBoost || 20));
    }
  }

  return { updatedAnimals, updatedTroughs, mealsConsumed };
}

// ==========================================
// 2c. LIVESTOCK BREEDING SYSTEM (NHÂN GIỐNG)
// ==========================================

export const BREEDING_MIN_HAPPINESS = 80;
export const BREEDING_HAPPINESS_COST = 20;
export const BREEDING_MAX_FARM_ANIMALS = 24;

export interface AnimalBreedingStatus {
  canBreed: boolean;
  cooldownRemainingSec: number;
  reason?: string;
}

export interface BreedingCandidate {
  id: string;
  type: AnimalType;
  displayName: string;
  stage: AnimalGrowthStage;
  happiness: number;
  isDead: boolean;
  isHungry?: boolean;
  bredAt: number | null;
}

export function getAnimalBreedingStatus(animal: BreedingCandidate, nowMs: number): AnimalBreedingStatus {
  if (animal.isDead) {
    return { canBreed: false, cooldownRemainingSec: 0, reason: 'Vật nuôi đã chết.' };
  }
  if (animal.stage !== 'adult') {
    return {
      canBreed: false,
      cooldownRemainingSec: 0,
      reason: 'Chỉ vật nuôi trưởng thành mới có thể ghép đôi sinh sản.',
    };
  }
  if (animal.isHungry) {
    return {
      canBreed: false,
      cooldownRemainingSec: 0,
      reason: 'Vật nuôi đang đói, cần được cho ăn no trước khi ghép đôi.',
    };
  }
  if (animal.happiness < BREEDING_MIN_HAPPINESS) {
    return {
      canBreed: false,
      cooldownRemainingSec: 0,
      reason: `Độ hạnh phúc phải đạt tối thiểu ${BREEDING_MIN_HAPPINESS}% (hiện tại: ${animal.happiness}%).`,
    };
  }

  const def = (ANIMALS as Record<string, AnimalDef>)[animal.type];
  const cooldownSec = def?.breedingCooldownSec ?? 600;

  if (animal.bredAt) {
    const elapsedSec = (nowMs - animal.bredAt) / 1000;
    if (elapsedSec < cooldownSec) {
      const remainingSec = Math.ceil(cooldownSec - elapsedSec);
      return {
        canBreed: false,
        cooldownRemainingSec: remainingSec,
        reason: `Đang trong thời gian nghỉ sinh sản (còn ${Math.ceil(remainingSec / 60)} phút).`,
      };
    }
  }

  return { canBreed: true, cooldownRemainingSec: 0 };
}

export function canBreedAnimals(
  parentA: BreedingCandidate,
  parentB: BreedingCandidate,
  nowMs: number,
  currentFarmAnimalCount: number,
  maxFarmAnimals: number = BREEDING_MAX_FARM_ANIMALS,
): { ok: boolean; reason?: string } {
  if (parentA.id === parentB.id) {
    return { ok: false, reason: 'Không thể ghép đôi một con vật với chính nó.' };
  }
  if (parentA.type !== parentB.type) {
    return { ok: false, reason: 'Hai vật nuôi phải cùng loài để có thể nhân giống.' };
  }
  if (currentFarmAnimalCount >= maxFarmAnimals) {
    return {
      ok: false,
      reason: `Trang trại đã đạt giới hạn tối đa (${maxFarmAnimals}/${maxFarmAnimals} con). Hãy xuất chuồng bớt trước khi nhân giống.`,
    };
  }

  const statusA = getAnimalBreedingStatus(parentA, nowMs);
  if (!statusA.canBreed) {
    return { ok: false, reason: `${parentA.displayName}: ${statusA.reason}` };
  }

  const statusB = getAnimalBreedingStatus(parentB, nowMs);
  if (!statusB.canBreed) {
    return { ok: false, reason: `${parentB.displayName}: ${statusB.reason}` };
  }

  return { ok: true };
}

// ==========================================
// 3. AQUACULTURE POND FISH TYPES & CATALOG
// ==========================================

export type PondFishSpecies = 'tra' | 'basa' | 'loc' | 'tom_cang' | 'bong_tuong';

export type PondFishStage = 'fingerling' | 'juvenile' | 'adult' | 'specialty';

export interface PondFishDef {
  species: PondFishSpecies;
  name: string;
  description: string;
  fingerlingItemId: string;
  fingerlingPrice: number;
  harvestItemId: string;
  marketWeightMinKg: number;
  marketWeightMaxKg: number;
  pricePerKg: number;
  growthDurationSec: number;
  feedItemIds: string[];
  stages: {
    juvenileWeightKg: number;
    adultWeightKg: number;
    specialtyWeightKg: number;
  };
  sprite: string;
}

export const POND_FISHES: Record<PondFishSpecies, PondFishDef> = {
  tra: {
    species: 'tra',
    name: 'Cá Tra Sông Tiền',
    description: 'Cá tra da trơn sông Tiền, vỗ béo bằng cám nổi thịt trắng phau béo ngậy.',
    fingerlingItemId: 'stock_fingerling_tra',
    fingerlingPrice: 150,
    harvestItemId: 'fish_pond_tra_harvest',
    marketWeightMinKg: 1.5,
    marketWeightMaxKg: 4.5,
    pricePerKg: 50,
    growthDurationSec: 900, // 15 mins to reach market size
    feedItemIds: ['feed_aquatic'],
    stages: {
      juvenileWeightKg: 0.8,
      adultWeightKg: 2.2,
      specialtyWeightKg: 3.8,
    },
    sprite: 'farm:pond_fish_tra',
  },
  basa: {
    species: 'basa',
    name: 'Cá Basa Bến Tre',
    description: 'Cá basa Bến Tre thớ thịt dày mọng, mình tròn vảy mỏng xuất khẩu trứ danh.',
    fingerlingItemId: 'stock_fingerling_basa',
    fingerlingPrice: 180,
    harvestItemId: 'fish_pond_basa_harvest',
    marketWeightMinKg: 1.2,
    marketWeightMaxKg: 3.8,
    pricePerKg: 60,
    growthDurationSec: 1200, // 20 mins
    feedItemIds: ['feed_aquatic'],
    stages: {
      juvenileWeightKg: 0.6,
      adultWeightKg: 1.8,
      specialtyWeightKg: 3.0,
    },
    sprite: 'farm:pond_fish_basa',
  },
  loc: {
    species: 'loc',
    name: 'Cá Lóc Bông Đồng Tháp',
    description: 'Cá lóc bông đồng thịt săn chắc, săn mồi nhanh như chớp, đặc sản sông nước.',
    fingerlingItemId: 'stock_fingerling_loc',
    fingerlingPrice: 220,
    harvestItemId: 'fish_pond_loc_harvest',
    marketWeightMinKg: 0.8,
    marketWeightMaxKg: 2.5,
    pricePerKg: 100,
    growthDurationSec: 1500, // 25 mins
    feedItemIds: ['feed_aquatic'],
    stages: {
      juvenileWeightKg: 0.4,
      adultWeightKg: 1.2,
      specialtyWeightKg: 2.0,
    },
    sprite: 'farm:pond_fish_loc',
  },
  tom_cang: {
    species: 'tom_cang',
    name: 'Tôm Càng Xanh Nam Bộ',
    description: 'Tôm càng xanh loại một, gạch son đầy đầu, thịt giòn sần sật ngọt lịm.',
    fingerlingItemId: 'stock_fingerling_tom_cang',
    fingerlingPrice: 260,
    harvestItemId: 'fish_pond_tom_cang_harvest',
    marketWeightMinKg: 0.2,
    marketWeightMaxKg: 0.65,
    pricePerKg: 420,
    growthDurationSec: 1800, // 30 mins
    feedItemIds: ['feed_aquatic'],
    stages: {
      juvenileWeightKg: 0.1,
      adultWeightKg: 0.35,
      specialtyWeightKg: 0.55,
    },
    sprite: 'farm:pond_fish_tom_cang',
  },
  bong_tuong: {
    species: 'bong_tuong',
    name: 'Cá Bống Tượng Sông Cửu Long',
    description: 'Cá bống tượng thịt thơm ngọt như thịt gà, loài cá nước ngọt cao cấp xuất khẩu.',
    fingerlingItemId: 'stock_fingerling_bong_tuong',
    fingerlingPrice: 300,
    harvestItemId: 'fish_pond_bong_tuong_harvest',
    marketWeightMinKg: 0.5,
    marketWeightMaxKg: 1.8,
    pricePerKg: 280,
    growthDurationSec: 2100, // 35 mins
    feedItemIds: ['feed_aquatic'],
    stages: {
      juvenileWeightKg: 0.3,
      adultWeightKg: 0.9,
      specialtyWeightKg: 1.5,
    },
    sprite: 'farm:pond_fish_bong_tuong',
  },
};

// ==========================================
// 4. WAREHOUSE SILO TYPES & TIERS
// ==========================================

export type WarehouseTab = 'crops' | 'animal_products' | 'seeds_stocks' | 'supplies';

export interface WarehouseUpgradeTier {
  tier: number;
  capacity: number;
  upgradeCostCoin: number;
}

export const BASE_WAREHOUSE_CAPACITY = 100;
export const MAX_WAREHOUSE_CAPACITY = 500;
export const WAREHOUSE_UPGRADE_STEP = 50;

export const WAREHOUSE_UPGRADE_TIERS: WarehouseUpgradeTier[] = [
  { tier: 1, capacity: 150, upgradeCostCoin: 1000 },
  { tier: 2, capacity: 200, upgradeCostCoin: 2500 },
  { tier: 3, capacity: 250, upgradeCostCoin: 5000 },
  { tier: 4, capacity: 300, upgradeCostCoin: 10000 },
  { tier: 5, capacity: 350, upgradeCostCoin: 18000 },
  { tier: 6, capacity: 400, upgradeCostCoin: 28000 },
  { tier: 7, capacity: 450, upgradeCostCoin: 40000 },
  { tier: 8, capacity: 500, upgradeCostCoin: 55000 },
];

export function getWarehouseTabForItem(itemId: string): WarehouseTab {
  if (itemId.startsWith('crop_') && itemId.endsWith('_harvest')) {
    return 'crops';
  }
  if (itemId.startsWith('yield_') || itemId.startsWith('fish_pond_')) {
    return 'animal_products';
  }
  if (itemId.startsWith('seed_') || itemId.startsWith('stock_')) {
    return 'seeds_stocks';
  }
  return 'supplies';
}

// ==========================================
// 5. BÁC SÁU SHOP & CONTRACT TYPES & CATALOG
// ==========================================

export type FarmShopCategory = 'seeds' | 'livestock' | 'feed' | 'supplies';

export interface FarmShopItemDef {
  id: string;
  name: string;
  category: FarmShopCategory;
  coinPrice: number;
  description: string;
  unit: string;
  sprite: string;
}

/** Interface contract alias for shop item */
export type ShopItemDef = FarmShopItemDef;

export interface MarketContractDef {
  id: string;
  title: string;
  clientName: string;
  description: string;
  requiredItemId: string;
  requiredQuantity: number;
  rewardCoin: number;
  rewardFame: number;
  bonusPercent: number; // e.g. 25 for +25%
}

export const BAC_SAU_SHOP_ITEMS: FarmShopItemDef[] = [
  // SEEDS
  {
    id: 'seed_rice',
    name: 'Hạt Giống Lúa Nước Nàng Thơm',
    category: 'seeds',
    coinPrice: 30,
    unit: 'túi giống',
    description: 'Lúa Nàng Thơm Chợ Đào trĩu hạt, thích hợp đất phù sa màu mỡ.',
    sprite: 'farm:seed_rice',
  },
  {
    id: 'seed_corn',
    name: 'Hạt Giống Bắp Ngô Ngọt Sữa',
    category: 'seeds',
    coinPrice: 50,
    unit: 'túi giống',
    description: 'Ngô nếp ngọt sữa hạt đều bắp to, chống chịu sâu bệnh tốt.',
    sprite: 'farm:seed_corn',
  },
  {
    id: 'seed_watermelon',
    name: 'Hạt Giống Dưa Hấu Ruột Đỏ',
    category: 'seeds',
    coinPrice: 120,
    unit: 'túi giống',
    description: 'Dưa hấu Long An vỏ sọc mỏng ruột đỏ ngọt lịm mọng nước.',
    sprite: 'farm:seed_watermelon',
  },
  {
    id: 'seed_tomato',
    name: 'Hạt Giống Cà Chua Bi',
    category: 'seeds',
    coinPrice: 45,
    unit: 'túi giống',
    description: 'Cà chua bi trái tròn sai chùm, thu hoạch nhanh chóng.',
    sprite: 'farm:seed_tomato',
  },
  {
    id: 'seed_chili',
    name: 'Hạt Giống Ớt Hiểm Chỉ Thiên',
    category: 'seeds',
    coinPrice: 60,
    unit: 'túi giống',
    description: 'Ớt hiểm cay nồng đặc sản sông nước Nam Bộ.',
    sprite: 'farm:seed_chili',
  },
  {
    id: 'seed_strawberry',
    name: 'Hạt Giống Dâu Tây Đà Lạt',
    category: 'seeds',
    coinPrice: 80,
    unit: 'túi giống',
    description: 'Dâu tây đỏ mọng căng tròn ngọt thanh, giống trứ danh xứ sở ngàn hoa.',
    sprite: 'farm:seed_strawberry',
  },
  {
    id: 'seed_pumpkin',
    name: 'Hạt Giống Bí Ngô Khổng Lồ',
    category: 'seeds',
    coinPrice: 150,
    unit: 'túi giống',
    description: 'Bí ngô vỏ cam vàng dày dặn no tròn, béo bùi thơm lừng vụ mùa thu hoạch.',
    sprite: 'farm:seed_pumpkin',
  },
  {
    id: 'seed_eggplant',
    name: 'Hạt Giống Cà Tím Dài',
    category: 'seeds',
    coinPrice: 55,
    unit: 'túi giống',
    description: 'Cà tím thon dài vỏ tím bóng mượt, nướng mỡ hành thơm phức.',
    sprite: 'farm:seed_eggplant',
  },
  {
    id: 'seed_carrot',
    name: 'Hạt Giống Cà Rốt Củ Cam',
    category: 'seeds',
    coinPrice: 40,
    unit: 'túi giống',
    description: 'Cà rốt củ cam tươi giòn ngọt đậm vị, sinh trưởng nhanh chóng.',
    sprite: 'farm:seed_carrot',
  },
  {
    id: 'seed_sunflower',
    name: 'Hạt Giống Hoa Hướng Dương',
    category: 'seeds',
    coinPrice: 90,
    unit: 'túi giống',
    description: 'Hoa hướng dương bông to vàng rực rỡ, thu hoạch hạt thơm bùi.',
    sprite: 'farm:seed_sunflower',
  },
  {
    id: 'seed_grape',
    name: 'Cành Giống Nho Tím Ninh Thuận',
    category: 'seeds',
    coinPrice: 160,
    unit: 'cành giống',
    description: 'Nho tím trĩu giàn ngọt thanh mọng nước, giống nho cao cấp.',
    sprite: 'farm:seed_grape',
  },
  {
    id: 'seed_cabbage',
    name: 'Hạt Giống Bắp Cải Trắng Đà Lạt',
    category: 'seeds',
    coinPrice: 45,
    unit: 'túi giống',
    description: 'Bắp cải tròn búp cuộn chặt giòn ngọt thanh mát, dễ chăm sóc.',
    sprite: 'farm:seed_cabbage',
  },
  {
    id: 'seed_pineapple',
    name: 'Chồi Giống Khóm Mật Bến Lức',
    category: 'seeds',
    coinPrice: 110,
    unit: 'chồi giống',
    description: 'Khóm mật ruột vàng óng thơm lừng ngọt sắc đặc sản Tiền Giang.',
    sprite: 'farm:seed_pineapple',
  },
  {
    id: 'seed_dragonfruit',
    name: 'Cành Giống Thanh Long Ruột Đỏ',
    category: 'seeds',
    coinPrice: 140,
    unit: 'cành giống',
    description: 'Thanh long ruột đỏ vỏ hồng tai xanh mọng nước ngọt mát.',
    sprite: 'farm:seed_dragonfruit',
  },
  {
    id: 'seed_sugarcane',
    name: 'Hom Giống Mía Tím Hòa Bình',
    category: 'seeds',
    coinPrice: 70,
    unit: 'hom giống',
    description: 'Mía tím gióng dài vỏ mỏng ngọt lịm thơm ngon nức tiếng.',
    sprite: 'farm:seed_sugarcane',
  },

  // LIVESTOCK CON GIỐNG
  {
    id: 'stock_chicken',
    name: 'Gà Ri Con Lông Vàng',
    category: 'livestock',
    coinPrice: 200,
    unit: 'con giống',
    description: 'Gà ri giống nhanh nhẹn, thích mổ thóc quanh ổ rơm.',
    sprite: 'farm:stock_chicken',
  },
  {
    id: 'stock_duck',
    name: 'Vịt Xiêm Con Bờ Ao',
    category: 'livestock',
    coinPrice: 220,
    unit: 'con giống',
    description: 'Vịt xiêm con lạch bạch dễ thương, thích tắm mát dưới mương.',
    sprite: 'farm:stock_duck',
  },
  {
    id: 'stock_pig',
    name: 'Heo Mọi Con Sọc Dưa',
    category: 'livestock',
    coinPrice: 800,
    unit: 'con giống',
    description: 'Heo sọc dưa háu ăn, thích ủi bùn tắm mát trong bãi sình.',
    sprite: 'farm:stock_pig',
  },
  {
    id: 'stock_goat',
    name: 'Dê Con Bách Thảo',
    category: 'livestock',
    coinPrice: 1200,
    unit: 'con giống',
    description: 'Dê Bách Thảo leo dốc khỏe khoắn, cho sữa thơm thanh ngọt.',
    sprite: 'farm:stock_goat',
  },
  {
    id: 'stock_sheep',
    name: 'Cừu Con Phan Rang',
    category: 'livestock',
    coinPrice: 1400,
    unit: 'con giống',
    description: 'Cừu con lông xoăn tít thích ăn cỏ khô và leo dốc.',
    sprite: 'farm:stock_sheep',
  },
  {
    id: 'stock_cow',
    name: 'Bê Con Sữa Hà Lan',
    category: 'livestock',
    coinPrice: 1800,
    unit: 'con giống',
    description: 'Bê con đốm trắng đen giống tốt, cho lượng sữa dồi dào.',
    sprite: 'farm:stock_cow',
  },

  // AQUACULTURE FINGERLINGS
  {
    id: 'stock_fingerling_tra',
    name: 'Cá Tra Bột Sông Tiền',
    category: 'livestock',
    coinPrice: 150,
    unit: 'bọc giống',
    description: 'Cá tra giống khỏe quẫy nước mạnh mẽ thả nuôi đầm sâu.',
    sprite: 'farm:stock_fingerling_tra',
  },
  {
    id: 'stock_fingerling_basa',
    name: 'Cá Basa Giống Bến Tre',
    category: 'livestock',
    coinPrice: 180,
    unit: 'bọc giống',
    description: 'Cá basa giống béo tròn lớn nhanh khi nuôi ao nước ngọt.',
    sprite: 'farm:stock_fingerling_basa',
  },
  {
    id: 'stock_fingerling_loc',
    name: 'Cá Lóc Bông Giống Đồng Tháp',
    category: 'livestock',
    coinPrice: 220,
    unit: 'bọc giống',
    description: 'Cá lóc bông con háu ăn, thịt chắc nịch đậm đà.',
    sprite: 'farm:stock_fingerling_loc',
  },
  {
    id: 'stock_fingerling_tom_cang',
    name: 'Tôm Càng Xanh Giống Nam Bộ',
    category: 'livestock',
    coinPrice: 260,
    unit: 'bọc giống',
    description: 'Ấu trùng tôm càng xanh trong suốt, cặp càng xanh dương đặc trưng.',
    sprite: 'farm:stock_fingerling_tom_cang',
  },
  {
    id: 'stock_fingerling_bong_tuong',
    name: 'Cá Bống Tượng Giống Sông Cửu Long',
    category: 'livestock',
    coinPrice: 300,
    unit: 'bọc giống',
    description: 'Cá bống tượng giống háu ăn, thích râm mát dưới bè nổi ao nhà.',
    sprite: 'farm:stock_fingerling_bong_tuong',
  },

  // FEED
  {
    id: 'feed_grain',
    name: 'Thóc Bồ Thơm',
    category: 'feed',
    coinPrice: 35,
    unit: 'bao tải',
    description: 'Hạt thóc chắc mẩy phơi ráo nắng, thức ăn cho gà và vịt.',
    sprite: 'farm:feed_grain',
  },
  {
    id: 'feed_corn_mash',
    name: 'Cám Bắp Lên Men',
    category: 'feed',
    coinPrice: 50,
    unit: 'thùng cám',
    description: 'Cám bắp ủ men thơm nồng kích thích tiêu hóa của heo mọi.',
    sprite: 'farm:feed_corn_mash',
  },
  {
    id: 'feed_hay',
    name: 'Rơm Khô Thượng Hạng',
    category: 'feed',
    coinPrice: 60,
    unit: 'bó rơm',
    description: 'Rơm cuộn vàng óng thơm mùi cỏ mật cho bò, dê và cừu.',
    sprite: 'farm:feed_hay',
  },
  {
    id: 'feed_aquatic',
    name: 'Cám Thủy Sản Viên Nổi',
    category: 'feed',
    coinPrice: 40,
    unit: 'bao 5kg',
    description: 'Viên cám nổi giàu đạm giúp cá ao tranh mồi lớn nhanh vù vù.',
    sprite: 'farm:feed_aquatic',
  },

  // SUPPLIES & EQUIPMENT
  {
    id: 'fertilizer_bio',
    name: 'Phân Vi Sinh Thúc Mầm',
    category: 'supplies',
    coinPrice: 75,
    unit: 'bọc men',
    description: 'Men vi sinh hữu cơ giảm 50% thời gian lớn của cây trồng.',
    sprite: 'farm:fertilizer_bio',
  },
  {
    id: 'fertilizer_worm',
    name: 'Phân Trùn Quế Hữu Cơ',
    category: 'supplies',
    coinPrice: 90,
    unit: 'bao 10kg',
    description: 'Bón lót đất tơi xốp giúp tăng năng suất nông sản khi thu hoạch.',
    sprite: 'farm:fertilizer_worm',
  },
  {
    id: 'tool_watering_can',
    name: 'Bình Tưới Gáo Dừa',
    category: 'supplies',
    coinPrice: 150,
    unit: 'cái',
    description: 'Bình tưới gáo dừa duy trì độ ẩm cho đất trong 30 phút.',
    sprite: 'farm:tool_watering_can',
  },
  {
    id: 'tool_hoe',
    name: 'Cuốc Khai Hoang Cán Tre',
    category: 'supplies',
    coinPrice: 120,
    unit: 'cây',
    description: 'Lưỡi cuốc rèn sắc bén làm tơi xốp các mẫu đất hoang nhanh chóng.',
    sprite: 'farm:tool_hoe',
  },
  {
    id: 'waterwheel_aerator',
    name: 'Guồng Nước Sục Khí Oxy',
    category: 'supplies',
    coinPrice: 1500,
    unit: 'bộ guồng',
    description: 'Guồng quay sủi bọt trắng xóa tăng dưỡng khí oxy, giảm 15% thời gian nuôi cá ao.',
    sprite: 'farm:waterwheel_aerator',
  },
  {
    id: 'tractor_farm',
    name: 'Máy Cày Nông Nghiệp Farm Trac',
    category: 'supplies',
    coinPrice: 1500,
    unit: 'chiếc xe',
    description:
      'Xe máy cày chuyên dụng cho nhà nông. Lái qua các ô đất để tự động thu hoạch vụ mùa và gieo hạt giống cực kỳ nhanh chóng!',
    sprite: 'vehicle:tractor_farm',
  },
];

export const DAILY_MARKET_CONTRACTS: MarketContractDef[] = [
  {
    id: 'contract_rice_50',
    title: 'Hợp Đồng Cung Ứng Lúa Nàng Thơm',
    clientName: 'Vựa Gạo Miền Tây - Chợ Bình Điền',
    description: 'Giao 50 bó lúa vàng Nàng Thơm đạt chuẩn xuất khẩu.',
    requiredItemId: 'crop_rice_harvest',
    requiredQuantity: 50,
    rewardCoin: 1375, // 50 * 22c = 1100c base + 25% bonus (275c)
    rewardFame: 30,
    bonusPercent: 25,
  },
  {
    id: 'contract_strawberry_30',
    title: 'Đơn Đặt Dâu Tây Làm Mứt Tết',
    clientName: 'Tiệm Bánh Mứt Cao Nguyên',
    description: 'Cần 30 quả dâu tây Đà Lạt mọng nước làm mứt dâu thượng hạng.',
    requiredItemId: 'crop_strawberry_harvest',
    requiredQuantity: 30,
    rewardCoin: 1800, // 30 * 48c = 1440c + 25% (360c)
    rewardFame: 40,
    bonusPercent: 25,
  },
  {
    id: 'contract_pumpkin_20',
    title: 'Hợp Đồng Bí Ngô Lễ Hội Đêm Rằm',
    clientName: 'Nhà Hàng Chay Thanh Lương',
    description: 'Giao 20 trái bí ngô khổng lồ nấu súp bí đỏ hạt sen.',
    requiredItemId: 'crop_pumpkin_harvest',
    requiredQuantity: 20,
    rewardCoin: 2625, // 20 * 105c = 2100c + 25% (525c)
    rewardFame: 45,
    bonusPercent: 25,
  },
  {
    id: 'contract_grape_25',
    title: 'Hợp Đồng Cung Ứng Nho Ninh Thuận',
    clientName: 'Hầm Rượu Vang Sông Dinh',
    description: 'Cung cấp 25 chùm nho tím mọng nước chuẩn bị ủ mẻ vang mới.',
    requiredItemId: 'crop_grape_harvest',
    requiredQuantity: 25,
    rewardCoin: 3590, // 25 * 115c = 2875c + 25% (718c)
    rewardFame: 50,
    bonusPercent: 25,
  },
  {
    id: 'contract_egg_50',
    title: 'Đơn Đặt Trứng Gà Ta Bánh Mì',
    clientName: 'Tiệm Bánh Mì Ba Béo',
    description: 'Cần gấp 50 quả trứng gà ta tươi làm sốt trứng thơm béo.',
    requiredItemId: 'yield_egg',
    requiredQuantity: 50,
    rewardCoin: 3125, // 50 * 50c = 2500c + 25% (625c)
    rewardFame: 40,
    bonusPercent: 25,
  },
  {
    id: 'contract_corn_40',
    title: 'Hợp Đồng Ngô Ngọt Lễ Hội Đêm Rằm',
    clientName: 'Quán Chè Bắp Phố Cổ',
    description: 'Cần 40 bắp ngô ngọt căng sữa nấu chè phục vụ khách du lịch.',
    requiredItemId: 'crop_corn_harvest',
    requiredQuantity: 40,
    rewardCoin: 1400, // 40 * 28c = 1120c + 25% (280c)
    rewardFame: 25,
    bonusPercent: 25,
  },
  {
    id: 'contract_watermelon_20',
    title: 'Đơn Dưa Hấu Ruột Đỏ Tiệc Cưới',
    clientName: 'Nhà Hàng Ven Sông Đồng Nai',
    description: 'Giao 20 trái dưa hấu Long An vỏ sọc ngọt lịm tráng miệng bàn tiệc.',
    requiredItemId: 'crop_watermelon_harvest',
    requiredQuantity: 20,
    rewardCoin: 1875, // 20 * 75c = 1500c + 25% (375c)
    rewardFame: 35,
    bonusPercent: 25,
  },
  {
    id: 'contract_milk_15',
    title: 'Hợp Đồng Sữa Bò Tươi Bến Tre',
    clientName: 'Xưởng Bánh Flan Sữa Cô Chín',
    description: '15 bình sữa bò tươi mới vắt làm mẻ bánh flan mềm mịn.',
    requiredItemId: 'yield_milk',
    requiredQuantity: 15,
    rewardCoin: 4875, // 15 * 260c = 3900c + 25% (975c)
    rewardFame: 50,
    bonusPercent: 25,
  },
  {
    id: 'contract_tra_fish_10',
    title: 'Đơn Thu Mua Cá Tra Xuất Khẩu',
    clientName: 'Công Ty Thủy Sản Sông Tiền',
    description: 'Giao 10 cá tra nuôi ao đạt chuẩn thịt trắng thương phẩm.',
    requiredItemId: 'fish_pond_tra_harvest',
    requiredQuantity: 10,
    rewardCoin: 1600,
    rewardFame: 45,
    bonusPercent: 25,
  },
  {
    id: 'contract_basa_fish_8',
    title: 'Đơn Cung Ứng Cá Basa Bến Tre',
    clientName: 'Nhà Hàng Thủy Sản Bến Tre',
    description: 'Cung cấp 8 cá basa béo tròn chất lượng cao chuẩn bị bàn tiệc hải sản.',
    requiredItemId: 'fish_pond_basa_harvest',
    requiredQuantity: 8,
    rewardCoin: 780,
    rewardFame: 45,
    bonusPercent: 25,
  },
  {
    id: 'contract_tom_cang_6',
    title: 'Đơn Thu Mua Tôm Càng Xanh Nam Bộ',
    clientName: 'Quán Ẩm Thực Đồng Quê',
    description: 'Giao 6 tôm càng xanh tươi sống nấu lẩu tôm chua cay miền Tây.',
    requiredItemId: 'fish_pond_tom_cang_harvest',
    requiredQuantity: 6,
    rewardCoin: 630,
    rewardFame: 50,
    bonusPercent: 25,
  },
  {
    id: 'contract_loc_fish_8',
    title: 'Hợp Đồng Cá Lóc Bông Nấu Canh Chua',
    clientName: 'Quán Cơm Niêu Sông Nước',
    description: 'Cần 8 cá lóc bông tươi ngon kho tộ và nấu canh chua lá giang.',
    requiredItemId: 'fish_pond_loc_harvest',
    requiredQuantity: 8,
    rewardCoin: 880,
    rewardFame: 45,
    bonusPercent: 25,
  },
  {
    id: 'contract_bong_tuong_5',
    title: 'Đơn Hàng Cá Bống Tượng Thượng Hạng',
    clientName: 'Khách Sạn Nổi Cửu Long',
    description: 'Giao 5 cá bống tượng tươi ngon phục vụ món cá bống tượng chưng tương.',
    requiredItemId: 'fish_pond_bong_tuong_harvest',
    requiredQuantity: 5,
    rewardCoin: 875,
    rewardFame: 55,
    bonusPercent: 25,
  },
  {
    id: 'contract_pineapple_20',
    title: 'Đơn Cung Ứng Khóm Mật Tiền Giang',
    clientName: 'Xưởng Nước Ép & Mứt Hoa Quả',
    description: 'Giao 20 trái khóm mật ngọt lịm ép nước hoa quả mùa hè.',
    requiredItemId: 'crop_pineapple_harvest',
    requiredQuantity: 20,
    rewardCoin: 1625,
    rewardFame: 35,
    bonusPercent: 25,
  },
  {
    id: 'contract_dragonfruit_15',
    title: 'Hợp Đồng Thanh Long Ruột Đỏ Xuất Khẩu',
    clientName: 'Công Ty Nông Sản Bình Thuận',
    description: '15 trái thanh long ruột đỏ ngọt mát đạt chuẩn xuất khẩu.',
    requiredItemId: 'crop_dragonfruit_harvest',
    requiredQuantity: 15,
    rewardCoin: 1595,
    rewardFame: 40,
    bonusPercent: 25,
  },
  {
    id: 'contract_sugarcane_30',
    title: 'Đơn Mía Tím Ép Nước Mía Cốt Dừa',
    clientName: 'Tiệm Giải Khát Bờ Kè',
    description: 'Giao 30 bó mía tím giòn ngọt làm nước mía ép cốt dừa.',
    requiredItemId: 'crop_sugarcane_harvest',
    requiredQuantity: 30,
    rewardCoin: 1425,
    rewardFame: 30,
    bonusPercent: 25,
  },
  {
    id: 'contract_wool_12',
    title: 'Hợp Đồng Lông Cừu Phan Rang',
    clientName: 'Hợp Tác Xã Dệt Len Cao Nguyên',
    description: '12 cuộn lông cừu mềm mại dệt chăn len và áo ấm xuất khẩu.',
    requiredItemId: 'yield_wool',
    requiredQuantity: 12,
    rewardCoin: 3300,
    rewardFame: 50,
    bonusPercent: 25,
  },
  {
    id: 'contract_pork_15',
    title: 'Đơn Thịt Heo Mọi Nướng Than Hoa',
    clientName: 'Quán Nướng Thôn Trang',
    description: 'Cần 15 phần thịt heo sọc dưa bì giòn thơm nức đãi tiệc làng.',
    requiredItemId: 'yield_pork',
    requiredQuantity: 15,
    rewardCoin: 2250,
    rewardFame: 45,
    bonusPercent: 25,
  },
];

// ==========================================
// 6. PURE AUTHORITATIVE GAMEPLAY CALCULATION HELPERS
// ==========================================

/**
 * Calculates current growth stage of a crop given planted time and elapsed duration.
 */
export function getCropGrowthStage(
  plantedAt: Date | string | number,
  cropDef: CropDef,
  isFertilized = false,
  now = Date.now(),
): CropGrowthStage {
  const plantedMs = typeof plantedAt === 'number' ? plantedAt : new Date(plantedAt).getTime();
  const elapsedSec = Math.max(0, (now - plantedMs) / 1000);
  const totalDuration = isFertilized
    ? cropDef.growthDurationSec * FERTILIZER_GROWTH_MULTIPLIER
    : cropDef.growthDurationSec;

  if (elapsedSec >= totalDuration) return 'mature';
  const progressRatio = elapsedSec / totalDuration;
  if (progressRatio >= 0.6) return 'blooming';
  if (progressRatio >= 0.25) return 'sprout';
  return 'seed';
}

/**
 * Checks if current weather condition is rainy (rain, heavy_rain, thunderstorm, drizzle).
 */
export function isWeatherRainy(weatherOrCondition?: string | { condition?: string } | null): boolean {
  if (!weatherOrCondition) return false;
  const cond = typeof weatherOrCondition === 'string' ? weatherOrCondition : weatherOrCondition.condition;
  return cond === 'rain' || cond === 'heavy_rain' || cond === 'thunderstorm' || cond === 'drizzle';
}

/**
 * Checks if soil is currently moist based on last watered timestamp or active rainfall.
 * When it rains, crops receive natural moisture and do not need manual watering!
 */
export function isPlotMoist(
  wateredAt: Date | string | number | null,
  now = Date.now(),
  isRaining = false,
): boolean {
  if (isRaining) return true;
  if (!wateredAt) return false;
  const timeMs = typeof wateredAt === 'number' ? wateredAt : new Date(wateredAt).getTime();
  return now - timeMs < SOIL_MOISTURE_DURATION_SEC * 1000;
}

export const FINGERLING_INITIAL_WEIGHT_KG = 0.1;

/**
 * Calculates pond fish weight based on stocking time, species growth duration, and aerator.
 */
export function calculatePondFishWeight(
  stockedAt: Date | string | number,
  speciesDef: PondFishDef,
  hasAerator = false,
  now = Date.now(),
  initialWeightKg = FINGERLING_INITIAL_WEIGHT_KG,
): number {
  const stockedMs = typeof stockedAt === 'number' ? stockedAt : new Date(stockedAt).getTime();
  const elapsedSec = Math.max(0, (now - stockedMs) / 1000);
  // Aerator accelerates rearing time by 15%
  const effectiveSec = hasAerator ? elapsedSec * 1.15 : elapsedSec;
  const progress = Math.min(1.0, effectiveSec / speciesDef.growthDurationSec);
  const weight = initialWeightKg + progress * (speciesDef.marketWeightMaxKg - initialWeightKg);
  return Math.round(weight * 100) / 100;
}

/**
 * Determines stage of pond fish based on weight milestones.
 */
export function getPondFishStage(weightKg: number, speciesDef: PondFishDef): PondFishStage {
  if (weightKg >= speciesDef.stages.specialtyWeightKg) return 'specialty';
  if (weightKg >= speciesDef.stages.adultWeightKg) return 'adult';
  if (weightKg >= speciesDef.stages.juvenileWeightKg) return 'juvenile';
  return 'fingerling';
}

/**
 * Determines composite UI display state of a farm plot.
 * When it rains, the plot is naturally moist and tilled.
 */
export function getPlotState(
  plot: {
    isUnlocked: boolean;
    isTilled: boolean;
    wateredAt: Date | string | number | null;
    cropId: CropId | null;
    plantedAt: Date | string | number | null;
    isFertilized?: boolean;
  },
  now = Date.now(),
  isRaining = false,
): PlotState {
  if (!plot.isUnlocked) return 'locked';
  if (!plot.isTilled && !isRaining) return 'untilled';
  const moist = isPlotMoist(plot.wateredAt, now, isRaining);
  if (!plot.cropId || !plot.plantedAt) {
    return moist ? 'tilled_wet' : 'tilled_dry';
  }
  const cropDef = CROPS[plot.cropId];
  if (!cropDef) return moist ? 'tilled_wet' : 'tilled_dry';
  const stage = getCropGrowthStage(plot.plantedAt, cropDef, plot.isFertilized, now);
  if (stage === 'mature') return 'mature';
  return 'growing';
}
