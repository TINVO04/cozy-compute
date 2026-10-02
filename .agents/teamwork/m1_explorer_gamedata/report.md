# M1 GameData Implementation Blueprint: Cozy Farm System (`@cozy/game-data`)

**Author**: M1 GameData Explorer  
**Target Package**: `packages/game-data/src/farm.ts` & re-export in `packages/game-data/src/index.ts`  
**Reference Docs**: `docs/farm_system_plan.pdf`, `PROJECT.md`, `ORIGINAL_REQUEST.md`, `AGENTS.md`  
**Status**: COMPLETE SPECIFICATION & BLUEPRINT  

---

## 1. Executive Summary & Monorepo Architecture

In the **Cozy Compute Social MMO** architecture, `@cozy/game-data` is the authoritative source of truth for:
1. Numerical game balance (growth times, coin prices, yield ranges, decay rates).
2. Data identifiers and typing (crop IDs, seed IDs, animal types, pond fish species, warehouse tabs).
3. Map boundaries, spawn coordinates, interaction zones, and collision blockers.
4. Pure deterministic game calculation functions (crop growth stage resolution, soil moisture checks, fish weight growth curves).

By centralizing these definitions in `packages/game-data/src/farm.ts`, all downstream layers (`apps/api` for server-authoritative transactions, `apps/realtime` for Colyseus `FarmRoom` state synchronization, and `apps/web` for Phaser 3 `FarmScene` and React 19 UI panels) share identical interfaces and constants with zero code drift.

---

## 2. Full TypeScript Definitions & Interfaces (`packages/game-data/src/farm.ts`)

```typescript
import { Rect, t, TILE } from './map.js';

// ==========================================
// 1. CROPS & SOIL TYPES
// ==========================================

export type CropId =
  | 'crop_rice'
  | 'crop_corn'
  | 'crop_watermelon'
  | 'crop_tomato'
  | 'crop_chili';

export type CropGrowthStage = 'seed' | 'sprout' | 'blooming' | 'mature' | 'withered';

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

export type PlotState =
  | 'locked'
  | 'untilled'
  | 'tilled_dry'
  | 'tilled_wet'
  | 'growing'
  | 'mature';

export interface FarmPlotConfig {
  index: number; // 0..35
  unlockPrice: number;
  isStarterUnlocked: boolean;
}

// ==========================================
// 2. LIVESTOCK TYPES
// ==========================================

export type AnimalType = 'chicken' | 'duck' | 'cow' | 'pig' | 'goat';

export interface AnimalDef {
  type: AnimalType;
  name: string;
  facility: 'poultry_coop' | 'cattle_pasture' | 'pig_pen' | 'goat_pen';
  description: string;
  stockItemId: string;
  stockPrice: number;
  yieldItemId: string;
  yieldName: string;
  yieldPrice: number;
  feedItemId: string;
  feedName: string;
  feedIntervalSec: number;
  happinessBoost: number;
  hungerDecaySec: number;
  soundBubble: string;
  sprite: string;
}

// ==========================================
// 3. AQUACULTURE POND FISH TYPES
// ==========================================

export type PondFishSpecies = 'tra' | 'basa' | 'loc' | 'tom_cang';

export type PondFishStage = 'fingerling' | 'juvenile' | 'mature' | 'specialty';

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
    matureWeightKg: number;
    specialtyWeightKg: number;
  };
  sprite: string;
}

// ==========================================
// 4. WAREHOUSE SILO TYPES
// ==========================================

export type WarehouseTab = 'crops' | 'animal_products' | 'seeds_stocks' | 'supplies';

export interface WarehouseUpgradeTier {
  tier: number;
  capacity: number;
  upgradeCostCoin: number;
}

// ==========================================
// 5. BÁC SÁU SHOP & CONTRACT TYPES
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

export interface MarketContractDef {
  id: string;
  title: string;
  clientName: string;
  description: string;
  requiredItemId: string;
  requiredQuantity: number;
  rewardCoin: number;
  rewardFame: number;
  bonusPercent: number; // e.g., 25 for +25%
}
```

---

## 3. Crop Growth Catalog & Timing Constants

### Core Soil Constants
- `TOTAL_FARM_PLOTS = 36` (6x6 matrix, indexed 0..35)
- `STARTER_UNLOCKED_PLOT_INDICES = [0, 1, 2, 3]` (4 starter plots immediately available)
- `SOIL_MOISTURE_DURATION_SEC = 1800` (30 minutes water retention)
- `FERTILIZER_GROWTH_MULTIPLIER = 0.5` (-50% required growth time)

### Authoritative Crop Catalog (`CROPS`)
```typescript
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
};
```

---

## 4. Livestock Specifications & Facilities Catalog

The Cozy Farm features 4 specialized rustic barns, hosting 5 animal species:

```typescript
export const ANIMALS: Record<AnimalType, AnimalDef> = {
  chicken: {
    type: 'chicken',
    name: 'Gà Ri Thả Vườn',
    facility: 'poultry_coop',
    description: 'Gà ri lông vàng óng, mổ thóc lắt nhắt quanh ổ rơm, đẻ trứng rất đều.',
    stockItemId: 'stock_chicken',
    stockPrice: 200,
    yieldItemId: 'yield_egg',
    yieldName: 'Trứng Gà Ta Tươi',
    yieldPrice: 50,
    feedItemId: 'feed_grain',
    feedName: 'Thóc Bồ Thơm',
    feedIntervalSec: 300, // 5 minutes
    happinessBoost: 25,
    hungerDecaySec: 600, // 10 minutes
    soundBubble: 'Cục tác! Cục ta cục tác!',
    sprite: 'farm:animal_chicken',
  },
  duck: {
    type: 'duck',
    name: 'Vịt Xiêm Bờ Ao',
    facility: 'poultry_coop',
    description: 'Vịt xiêm lông xám trắng, thích lạch bạch bơi lội và tắm mát dưới mương.',
    stockItemId: 'stock_duck',
    stockPrice: 220,
    yieldItemId: 'yield_duck_egg',
    yieldName: 'Trứng Vịt Xiêm',
    yieldPrice: 55,
    feedItemId: 'feed_grain',
    feedName: 'Thóc Bồ Thơm',
    feedIntervalSec: 360, // 6 minutes
    happinessBoost: 25,
    hungerDecaySec: 720,
    soundBubble: 'Cạp cạp cạp!',
    sprite: 'farm:animal_duck',
  },
  cow: {
    type: 'cow',
    name: 'Bò Sữa Đồng Nai',
    facility: 'cattle_pasture',
    description: 'Bò sữa Hà Lan thuần hóa, nhai cỏ chậm rãi bên máng gỗ, cho dòng sữa thơm béo.',
    stockItemId: 'stock_cow',
    stockPrice: 1800,
    yieldItemId: 'yield_milk',
    yieldName: 'Bình Sữa Bò Tươi',
    yieldPrice: 260,
    feedItemId: 'feed_hay',
    feedName: 'Rơm Khô Thượng Hạng',
    feedIntervalSec: 600, // 10 minutes
    happinessBoost: 15,
    hungerDecaySec: 1200,
    soundBubble: 'Ùm bòoooo!',
    sprite: 'farm:animal_cow',
  },
  pig: {
    type: 'pig',
    name: 'Heo Mọi Sọc Dưa',
    facility: 'pig_pen',
    description: 'Heo sọc dưa háu ăn, thích đầm mình trong bãi sình ẩm ướt và ủi tìm nấm quý.',
    stockItemId: 'stock_pig',
    stockPrice: 800,
    yieldItemId: 'yield_truffle',
    yieldName: 'Nấm Tràm Đầm Lầy',
    yieldPrice: 180,
    feedItemId: 'feed_corn_mash',
    feedName: 'Cám Bắp Lên Men',
    feedIntervalSec: 450, // 7.5 minutes
    happinessBoost: 20,
    hungerDecaySec: 900,
    soundBubble: 'Ủn ỉn... zzz!',
    sprite: 'farm:animal_pig',
  },
  goat: {
    type: 'goat',
    name: 'Dê Núi Bách Thảo',
    facility: 'goat_pen',
    description: 'Dê Bách Thảo tinh nghịch, thích leo bục gỗ dốc đứng và gặm rơm trên cao.',
    stockItemId: 'stock_goat',
    stockPrice: 1200,
    yieldItemId: 'yield_goat_milk',
    yieldName: 'Bình Sữa Dê Thanh Mát',
    yieldPrice: 210,
    feedItemId: 'feed_hay',
    feedName: 'Rơm Khô Thượng Hạng',
    feedIntervalSec: 500, // 8.3 minutes
    happinessBoost: 20,
    hungerDecaySec: 1000,
    soundBubble: 'Be he he!',
    sprite: 'farm:animal_goat',
  },
};
```

---

## 5. Aquaculture Pond Fish Specifications & Growth Curves

Unlike wild lake fishing at Bến Lai, the farm pond is an intensive aquaculture facility with weight-based biomass valuation:

```typescript
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
    growthDurationSec: 900, // 15 mins to reach 2.5kg standard market size
    feedItemIds: ['feed_aquatic'],
    stages: {
      juvenileWeightKg: 0.8,
      matureWeightKg: 2.2,
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
      matureWeightKg: 1.8,
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
      matureWeightKg: 1.2,
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
      matureWeightKg: 0.35,
      specialtyWeightKg: 0.55,
    },
    sprite: 'farm:pond_fish_tom_cang',
  },
};
```

---

## 6. Land Plot Grid Management (36 Plots, Unlock Costs)

```typescript
export const FARM_PLOT_CONFIGS: FarmPlotConfig[] = Array.from({ length: 36 }, (_, i) => {
  let unlockPrice = 0;
  if (i < 4) unlockPrice = 0; // Starter free plots
  else if (i < 8) unlockPrice = 250;
  else if (i < 12) unlockPrice = 500;
  else if (i < 18) unlockPrice = 1000;
  else if (i < 24) unlockPrice = 2000;
  else if (i < 30) unlockPrice = 3500;
  else unlockPrice = 5000;

  return {
    index: i,
    unlockPrice,
    isStarterUnlocked: i < 4,
  };
});
```

---

## 7. Warehouse Silo Storage Specifications (Tiers & Tabs)

### Capacity Tiers
- Base: 100 slots (Tier 0)
- Upgrades: +50 slots per tier up to 500 max capacity

```typescript
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
```

### Tab Categorization Mapping Function
```typescript
export function getWarehouseTabForItem(itemId: string): WarehouseTab {
  if (itemId.startsWith('crop_') && itemId.endsWith('_harvest')) {
    return 'crops';
  }
  if (
    itemId.startsWith('yield_') ||
    itemId.startsWith('fish_pond_')
  ) {
    return 'animal_products';
  }
  if (
    itemId.startsWith('seed_') ||
    itemId.startsWith('stock_')
  ) {
    return 'seeds_stocks';
  }
  return 'supplies';
}
```

---

## 8. Tiệm Nông Nghiệp Bác Sáu & Daily Market Contracts

### 19 Authoritative Shop Items
```typescript
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
    description: 'Rơm cuộn vàng óng thơm mùi cỏ mật cho bò và dê.',
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
];
```

### 6 Daily Market Supply Contracts
```typescript
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
];
```

---

## 9. Farm Map Constants & Town Portal Integration (`packages/game-data/src/map.ts`)

### Town Map Modifications Needed:
1. **Open Town West Perimeter**:
   Currently in `BLOCKERS`:
   ```typescript
   // BEFORE:
   t(0, 0, 1, MAP_ROWS) // Blocks entirety of col 0
   
   // AFTER:
   t(0, 0, 1, 10), // Rows 0..9 blocked
   t(0, 12, 1, MAP_ROWS - 12), // Rows 12..31 blocked (rows 10 and 11 open!)
   ```
2. **Path Extension to West Edge**:
   In `PATHS`:
   Extend `t(1, 10, 46, 2)` to `t(0, 10, 47, 2)` so that path tiles span continuously from X=0 to X=46.
3. **Register `farm_gate` Zone**:
   In `ZoneId`: Add `'farm_gate'`.
   In `ZONES`:
   ```typescript
   {
     id: 'farm_gate',
     label: 'Cổng Vào Trang Trại',
     prompt: 'Đi sang Trang Trại Cá Nhân',
     rect: t(0, 10, 2, 2),
   }
   ```
   *Note: This directly satisfies `town-layout.test.ts` reachability because the prompt zone sits on a paved path continuous from `SPAWN`!*

### Farm Map Specifications (`FARM_*` in `packages/game-data/src/farm.ts`):
```typescript
export const FARM_MAP_COLS = 48;
export const FARM_MAP_ROWS = 32;
export const FARM_MAP_WIDTH = FARM_MAP_COLS * TILE;
export const FARM_MAP_HEIGHT = FARM_MAP_ROWS * TILE;

// Player spawns near the north entrance gate
export const FARM_SPAWN = { x: 24 * TILE, y: 4 * TILE };

// Return portal leading back to Town West Gate
export const FARM_GATE_PORTAL: Rect = t(23, 1, 3, 2);

// Functional POI Rectangles (for Phaser scene triggers & E interaction keys)
export const FARM_POIS = {
  shop_bac_sau: t(5, 5, 8, 5),
  silo_warehouse: t(16, 5, 7, 5),
  aquaculture_pond: t(27, 4, 18, 8),
  poultry_coop: t(4, 15, 8, 6),
  cattle_pasture: t(14, 15, 8, 6),
  pig_pen: t(4, 23, 8, 7),
  goat_pen: t(14, 23, 8, 7),
  crops_field: t(25, 15, 19, 15),
};

// Perimeter boundary blockers and building obstacle rects
export const FARM_BLOCKERS: Rect[] = [
  // Outer perimeter (leaves 3 tiles open at north gate for entrance)
  t(0, 0, 23, 1),
  t(26, 0, 22, 1),
  t(0, FARM_MAP_ROWS - 1, FARM_MAP_COLS, 1),
  t(0, 0, 1, FARM_MAP_ROWS),
  t(FARM_MAP_COLS - 1, 0, 1, FARM_MAP_ROWS),

  // Buildings & Facilities
  t(5, 5, 8, 4), // Tiệm Bác Sáu
  t(16, 5, 7, 4), // Silo Warehouse
  t(27, 4, 18, 8), // Pond water area (accessible via wooden pier)

  // Barn Fences
  t(4, 15, 8, 5), // Poultry Coop
  t(14, 15, 8, 5), // Cattle Pasture
  t(4, 23, 8, 6), // Pig Pen
  t(14, 23, 8, 6), // Goat Pen
];
```

---

## 10. Pure Authoritative Calculation Helpers

These pure functions allow server routes and tests to verify game state deterministically:

```typescript
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
 * Checks if soil is currently moist based on last watered timestamp.
 */
export function isPlotMoist(
  wateredAt: Date | string | number | null,
  now = Date.now(),
): boolean {
  if (!wateredAt) return false;
  const timeMs = typeof wateredAt === 'number' ? wateredAt : new Date(wateredAt).getTime();
  return now - timeMs < SOIL_MOISTURE_DURATION_SEC * 1000;
}

/**
 * Calculates pond fish weight based on stocking time, feedings, and aerator.
 */
export function calculatePondFishWeight(
  stockedAt: Date | string | number,
  speciesDef: PondFishDef,
  hasAerator = false,
  now = Date.now(),
): number {
  const stockedMs = typeof stockedAt === 'number' ? stockedAt : new Date(stockedAt).getTime();
  const elapsedSec = Math.max(0, (now - stockedMs) / 1000);
  const effectiveSec = hasAerator ? elapsedSec * 1.15 : elapsedSec;
  const progress = Math.min(1.0, effectiveSec / speciesDef.growthDurationSec);
  const weight =
    speciesDef.marketWeightMinKg +
    progress * (speciesDef.marketWeightMaxKg - speciesDef.marketWeightMinKg);
  return Math.round(weight * 100) / 100;
}
```

---

## 11. Verification Test Matrix (`packages/game-data/src/farm.test.ts`)

A dedicated unit test file should accompany `farm.ts` to test:
1. **Crops**: All 5 crops configured with positive prices, valid items, and `seedPrice > 0`.
2. **Livestock**: All 5 species properly configured with appropriate feed items and yields.
3. **Pond Fishes**: All 4 species configured with positive weight curves and per-kg prices.
4. **Plots**: 36 plot configurations, starter plots (0..3) have 0 price, higher plots scale to 5000c.
5. **Warehouse**: 8 upgrade tiers, monotonic increase in capacity and cost.
6. **Shop & Contracts**: 19 shop items all unique; 6 contracts with valid items and 25% bonus math.
7. **Simulation Helpers**:
   - `getCropGrowthStage` produces `seed` -> `sprout` -> `blooming` -> `mature`.
   - `isFertilized` halves growth duration.
   - `isPlotMoist` expires accurately after 1800s.
   - `calculatePondFishWeight` respects aerator bonus.

---

## 12. Monorepo Re-export Protocol

In `packages/game-data/src/index.ts`:
```typescript
export * from './map.js';
export * from './town-scenery.js';
export * from './movement.js';
export * from './items.js';
export * from './appearance.js';
export * from './activities.js';
export * from './fishing.js';
export * from './billiards.js';
export * from './farm.js'; // <--- Seamless ESM export
```

With this specification in place, Milestone M1 database migrations (`0005_cozy_farm_system.sql`), M2 API routes (`/api/farm/*`), M3 Colyseus rooms (`FarmRoom`), M4 canvas renderer, and M5 React HUD panels will plug in cleanly with zero schema discrepancies.
