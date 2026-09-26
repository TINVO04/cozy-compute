export type ActivitySlug = 'fishing' | 'delivery' | 'cafe' | 'event_duck';

export interface FishSpecies {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  weight: number;
  coin: number;
  fame: number;
}

export const FISH: FishSpecies[] = [
  { id: 'soggy_boot', name: 'Soggy Boot', rarity: 'common', weight: 18, coin: 8, fame: 0 },
  { id: 'anxious_minnow', name: 'Anxious Minnow', rarity: 'common', weight: 30, coin: 14, fame: 1 },
  { id: 'office_carp', name: 'Office Carp', rarity: 'common', weight: 24, coin: 18, fame: 1 },
  { id: 'disco_trout', name: 'Disco Trout', rarity: 'rare', weight: 14, coin: 34, fame: 2 },
  { id: 'tax_salmon', name: 'Tax Return Salmon', rarity: 'rare', weight: 8, coin: 48, fame: 3 },
  { id: 'philosopher_eel', name: 'Philosopher Eel', rarity: 'epic', weight: 5, coin: 90, fame: 6 },
  { id: 'landlord_pike', name: "Landlord's Pike", rarity: 'legendary', weight: 1, coin: 260, fame: 15 },
];

export const CAFE_INGREDIENTS = [
  { id: 'espresso', label: 'Espresso' },
  { id: 'milk', label: 'Steamed milk' },
  { id: 'foam', label: 'Foam' },
  { id: 'caramel', label: 'Caramel' },
  { id: 'ice', label: 'Ice' },
  { id: 'oat', label: 'Oat milk' },
  { id: 'cinnamon', label: 'Cinnamon' },
  { id: 'regret', label: 'A pinch of regret' },
] as const;
export type CafeIngredient = (typeof CAFE_INGREDIENTS)[number]['id'];

export const CAFE_CUSTOMERS = [
  'A goose in a trench coat',
  'Your landlord, again',
  'A tired wizard',
  'Someone who says "no rush" and means rush',
  'A cat that can somehow pay',
  'The mayor (unconfirmed)',
];

export const DELIVERY_PACKAGES = [
  'A suspiciously warm box',
  'Forty rubber ducks',
  'One (1) very important sock',
  'A lamp that hums',
  'Mystery soup',
  'An apology letter',
];

/** Default admin-tunable activity configuration. Stored in the activities table. */
export const DEFAULT_ACTIVITY_CONFIG = {
  fishing: {
    biteMinMs: 2500,
    biteMaxMs: 7000,
    reactionWindowMs: 1400,
    runTtlMs: 60000,
    dailySoftCap: 40,
    overCapMultiplier: 0.25,
  },
  delivery: {
    baseCoin: 45,
    fame: 3,
    msPerTile: 650,
    minTimeMs: 20000,
    maxBonusCoin: 30,
    dailySoftCap: 30,
    overCapMultiplier: 0.25,
  },
  cafe: {
    steps: 4,
    timeLimitMs: 25000,
    baseCoin: 30,
    fame: 2,
    maxBonusCoin: 20,
    dailySoftCap: 40,
    overCapMultiplier: 0.25,
  },
  event_duck: {
    coinPerPoint: 25,
    placementCoin: [150, 90, 60],
    participationCoin: 20,
    fame: 5,
    placementFame: [20, 12, 8],
  },
} as const;

export type ActivityConfigMap = {
  fishing: {
    biteMinMs: number;
    biteMaxMs: number;
    reactionWindowMs: number;
    runTtlMs: number;
    dailySoftCap: number;
    overCapMultiplier: number;
  };
  delivery: {
    baseCoin: number;
    fame: number;
    msPerTile: number;
    minTimeMs: number;
    maxBonusCoin: number;
    dailySoftCap: number;
    overCapMultiplier: number;
  };
  cafe: {
    steps: number;
    timeLimitMs: number;
    baseCoin: number;
    fame: number;
    maxBonusCoin: number;
    dailySoftCap: number;
    overCapMultiplier: number;
  };
  event_duck: {
    coinPerPoint: number;
    placementCoin: number[];
    participationCoin: number;
    fame: number;
    placementFame: number[];
  };
};
