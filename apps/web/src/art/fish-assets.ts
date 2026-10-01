import { FISH } from '@cozy/game-data';

/** One source of truth for the illustrated fish used by UI, avatars and Phaser. */
export const FISH_3D_ASSETS: Record<string, string> = {
  swordfish: '/fish/swordfish-illustration.webp',
  guppy_rainbow: '/fish/guppy_rainbow-illustration.webp',
  golden_dragon_fish: '/fish/golden_dragon_fish-illustration.webp',
  killer_whale: '/fish/killer_whale-render.webp',
  humpback_whale: '/fish/humpback_whale-render.webp',
  blue_whale: '/fish/blue_whale-render.webp',
  great_white_shark: '/fish/great_white_shark-render.webp',
  manta_ray: '/fish/manta_ray-render.webp',
  giant_squid: '/fish/giant_squid-render.webp',
  crypto_whale: '/fish/crypto_whale-render.webp',
  abyssal_kraken: '/fish/abyssal_kraken-render.webp',
  rubber_duck_leviathan: '/fish/rubber_duck_leviathan-render.webp',
  landlord_pike: '/fish/landlord_pike-render.webp',
  soggy_boot: '/fish/soggy_boot-render.webp',
  anxious_minnow: '/fish/anxious_minnow-render.webp',
  office_carp: '/fish/office_carp-render.webp',
  clownfish: '/fish/clownfish-render.webp',
  seahorse: '/fish/seahorse-render.webp',
  tilapia: '/fish/tilapia-render.webp',
  chub: '/fish/chub-render.webp',
  crawfish: '/fish/crawfish-render.webp',
  pufferfish: '/fish/pufferfish-render.webp',
  flounder: '/fish/flounder-render.webp',
  blue_tang: '/fish/blue_tang-render.webp',
  flying_fish: '/fish/flying_fish-render.webp',
  bass_largemouth: '/fish/bass_largemouth-render.webp',
  flying_squid: '/fish/flying_squid-render.webp',
  disco_trout: '/fish/disco_trout-render.webp',
  axolotl: '/fish/axolotl-render.webp',
  tax_salmon: '/fish/tax_salmon-render.webp',
  golden_koi: '/fish/golden_koi-render.webp',
  betta_fighting: '/fish/betta_fighting-render.webp',
  piranha: '/fish/piranha-render.webp',
  snakehead: '/fish/snakehead-render.webp',
  lionfish: '/fish/lionfish-render.webp',
  barracuda: '/fish/barracuda-render.webp',
  anglerfish: '/fish/anglerfish-render.webp',
  moray_eel: '/fish/moray_eel-render.webp',
  pink_dolphin: '/fish/pink_dolphin-render.webp',
  dolphin_playful: '/fish/dolphin_playful-render.webp',
  hammerhead_shark: '/fish/hammerhead_shark-render.webp',
  tuna_giant: '/fish/tuna_giant-render.webp',
  philosopher_eel: '/fish/philosopher_eel-render.webp',
  electric_catfish: '/fish/electric_catfish-render.webp',
  office_carp_ceo: '/fish/office_carp_ceo-render.webp',
  pufferfish_gym: '/fish/pufferfish_gym-render.webp',
  catfish_noodle: '/fish/catfish_noodle-render.webp',
  disco_trout_diva: '/fish/disco_trout_diva-render.webp',
  swordfish_void: '/fish/swordfish_void-render.webp',
  golden_dragon_astral: '/fish/golden_dragon_astral-render.webp',
  koi_storm: '/fish/koi_storm-render.webp',
  electric_eel: '/fish/electric_eel-render.webp',
  kraken_eclipse: '/fish/kraken_eclipse-render.webp',
  arowana_dragon: '/fish/arowana_dragon-render.webp',
  sturgeon: '/fish/sturgeon-render.webp',
  catfish_giant: '/fish/catfish_giant-render.webp',
  alligator_gar: '/fish/alligator_gar-render.webp',
  sunfish_mola: '/fish/sunfish_mola-render.webp',
  cyber_koi: '/fish/cyber_koi-render.webp',
  phoenix_tetra: '/fish/phoenix_tetra-render.webp',
};
export const FISH_ASSET_ASPECTS: Record<string, number> = {
  swordfish: 693 / 808,
  guppy_rainbow: 764 / 808,
  golden_dragon_fish: 691 / 808,
  killer_whale: 587 / 768,
  humpback_whale: 440 / 768,
  blue_whale: 454 / 768,
  great_white_shark: 408 / 768,
  manta_ray: 599 / 768,
  giant_squid: 580 / 768,
  crypto_whale: 416 / 768,
  abyssal_kraken: 476 / 768,
  rubber_duck_leviathan: 768 / 655,
  landlord_pike: 402 / 768,
  soggy_boot: 721 / 768,
  anxious_minnow: 407 / 768,
  office_carp: 652 / 768,
  clownfish: 464 / 768,
  seahorse: 742 / 365,
  tilapia: 609 / 768,
  chub: 449 / 768,
  crawfish: 640 / 768,
  pufferfish: 583 / 768,
  flounder: 624 / 768,
  blue_tang: 561 / 768,
  flying_fish: 491 / 768,
  bass_largemouth: 471 / 768,
  flying_squid: 691 / 768,
  disco_trout: 386 / 768,
  axolotl: 421 / 768,
  tax_salmon: 387 / 768,
  golden_koi: 517 / 768,
  betta_fighting: 712 / 768,
  piranha: 659 / 768,
  snakehead: 323 / 768,
  lionfish: 733 / 768,
  barracuda: 392 / 768,
  anglerfish: 573 / 768,
  moray_eel: 435 / 768,
  pink_dolphin: 446 / 768,
  dolphin_playful: 599 / 768,
  hammerhead_shark: 476 / 768,
  tuna_giant: 497 / 768,
  philosopher_eel: 691 / 768,
  electric_catfish: 499 / 768,
  office_carp_ceo: 768 / 754,
  pufferfish_gym: 693 / 768,
  catfish_noodle: 626 / 768,
  disco_trout_diva: 673 / 768,
  swordfish_void: 576 / 768,
  golden_dragon_astral: 768 / 727,
  koi_storm: 697 / 768,
  electric_eel: 568 / 768,
  kraken_eclipse: 763 / 768,
  arowana_dragon: 381 / 768,
  sturgeon: 338 / 768,
  catfish_giant: 536 / 768,
  alligator_gar: 350 / 768,
  sunfish_mola: 768 / 690,
  cyber_koi: 536 / 768,
  phoenix_tetra: 688 / 768,
};

const images = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<void>>();
const revisions = new Map<string, number>();
const listeners = new Set<() => void>();
let revision = 0;
const parents = new Map(FISH.filter((f) => f.variantOf).map((f) => [f.id, f.variantOf!]));

function artSpecies(speciesId: string): string {
  return FISH_3D_ASSETS[speciesId] ? speciesId : (parents.get(speciesId) ?? speciesId);
}

export function fishArtRevision(speciesId?: string): number {
  return speciesId ? (revisions.get(artSpecies(speciesId)) ?? 0) : revision;
}

export function subscribeFishArt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadFishArt(speciesId: string): Promise<void> {
  speciesId = artSpecies(speciesId);
  const url = FISH_3D_ASSETS[speciesId];
  if (!url || images.has(speciesId) || typeof Image === 'undefined') return Promise.resolve();
  const existing = pending.get(speciesId);
  if (existing) return existing;
  const promise = new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => {
      images.set(speciesId, image);
      revisions.set(speciesId, (revisions.get(speciesId) ?? 0) + 1);
      revision++;
      listeners.forEach((listener) => listener());
      resolve();
    };
    // A failed asset keeps its illustration fallback without a render/retry loop.
    image.onerror = () => {
      resolve();
    };
    image.src = url;
  });
  pending.set(speciesId, promise);
  return promise;
}

export function loadedFishArt(speciesId: string): HTMLImageElement | undefined {
  return images.get(artSpecies(speciesId));
}

export function preloadFishArt(): Promise<void[]> {
  return Promise.all(Object.keys(FISH_3D_ASSETS).map(loadFishArt));
}
