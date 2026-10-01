import { INK, PixelGrid } from './pixel';
import { FISH, type FishSpecies } from '@cozy/game-data';
import {
  FISH_3D_ASSETS,
  FISH_ASSET_ASPECTS,
  fishArtRevision,
  loadedFishArt,
  loadFishArt,
} from './fish-assets';
import { paintFishIllustration } from './fish-illustration';
export { FISH_3D_ASSETS } from './fish-assets';

/**
 * Shared fish rendering for the collection, character previews and world textures.
 * Rendered bitmap assets are primary; the PixelGrid renderer remains available
 * for the explicit legacy avatar view and Canvas art handles missing assets.
 */

// Lookup map for species metadata
const SPECIES_MAP = new Map<string, FishSpecies>(FISH.map((f) => [f.id, f]));

export function getSpeciesData(speciesId: string): FishSpecies | undefined {
  return SPECIES_MAP.get(speciesId);
}

/**
 * Returns dynamic canvas display dimensions and pixel scale based on actual caught size (cm).
 */
export function fishRenderDimensions(
  speciesId: string,
  sizeCm?: number,
): {
  baseWidth: number;
  baseHeight: number;
  displayScale: number;
} {
  const species = SPECIES_MAP.get(speciesId);
  // Variant silhouettes inherit the parent's proportions until a dedicated bitmap is installed.
  if (species?.variantOf && !FISH_ASSET_ASPECTS[speciesId]) {
    return fishRenderDimensions(species.variantOf, sizeCm);
  }
  const minCm = species?.minSizeCm ?? 20;
  const maxCm = species?.maxSizeCm ?? 100;
  const actualCm = sizeCm ?? (minCm + maxCm) / 2;

  // Base grid dimensions tailored to anatomical archetypes:
  let baseWidth = 28;
  let baseHeight = 18;

  if (
    speciesId === 'blue_whale' ||
    speciesId === 'humpback_whale' ||
    speciesId === 'killer_whale' ||
    speciesId === 'crypto_whale' ||
    speciesId === 'rubber_duck_leviathan' ||
    speciesId === 'abyssal_kraken' ||
    speciesId === 'giant_squid' ||
    speciesId === 'golden_dragon_fish'
  ) {
    // Super Colossal / Mythic Leviathans (46 x 26)
    baseWidth = 46;
    baseHeight = 26;
  } else if (
    speciesId === 'catfish_giant' ||
    speciesId === 'alligator_gar' ||
    speciesId === 'great_white_shark' ||
    speciesId === 'hammerhead_shark' ||
    speciesId === 'ghost_shark' ||
    speciesId === 'manta_ray' ||
    speciesId === 'sunfish_mola' ||
    speciesId === 'beluga_whale' ||
    speciesId === 'narwhal' ||
    speciesId === 'swordfish' ||
    speciesId === 'tuna_giant' ||
    speciesId === 'sturgeon' ||
    speciesId === 'electric_eel' ||
    speciesId === 'moray_eel' ||
    speciesId === 'pink_dolphin' ||
    speciesId === 'dolphin_playful' ||
    speciesId === 'arowana_dragon' ||
    speciesId === 'electric_catfish' ||
    speciesId === 'snakehead' ||
    speciesId === 'barracuda' ||
    speciesId === 'landlord_pike'
  ) {
    // Heavyweight / Long Serpentine / Ocean Apex (38 x 22)
    baseWidth = 38;
    baseHeight = 22;
  } else if (
    speciesId === 'anxious_minnow' ||
    speciesId === 'guppy_rainbow' ||
    speciesId === 'clownfish' ||
    speciesId === 'seahorse' ||
    speciesId === 'betta_fighting' ||
    speciesId === 'phoenix_tetra' ||
    speciesId === 'axolotl' ||
    speciesId === 'piranha' ||
    speciesId === 'crawfish' ||
    speciesId === 'flying_fish' ||
    speciesId === 'pufferfish' ||
    speciesId === 'flounder'
  ) {
    // Small / Petite / Compact (24 x 16)
    baseWidth = 24;
    baseHeight = 16;
  }

  // Integer scale calculation based on size tier
  const ratio = (actualCm - minCm) / Math.max(1, maxCm - minCm);
  let displayScale = 4;
  if (baseWidth >= 40) {
    displayScale = ratio > 0.75 ? 4 : 3;
  } else if (baseWidth <= 24) {
    displayScale = ratio > 0.75 ? 6 : 5;
  } else {
    displayScale = ratio > 0.8 ? 5 : 4;
  }

  const assetAspect = FISH_ASSET_ASPECTS[speciesId];
  if (assetAspect) baseHeight = Math.round(baseWidth * assetAspect);
  return { baseWidth, baseHeight, displayScale };
}

/**
 * Returns the unique CSS effect class for a legendary or epic fish.
 */
export const FISH_EFFECT_CLASS: Record<string, string> = {
  office_carp_ceo: 'fish-fx-defiant',
  pufferfish_gym: 'fish-fx-defiant',
  catfish_noodle: 'fish-fx-defiant',
  disco_trout_diva: 'fish-fx-defiant',
  swordfish_void: 'fish-fx-void',
  golden_dragon_astral: 'fish-fx-astral',
  koi_storm: 'fish-fx-storm',
  kraken_eclipse: 'fish-fx-eclipse',
  // Legendary species unique lavish effects (11 loài)
  golden_dragon_fish: 'fish-fx-golden-dragon',
  rubber_duck_leviathan: 'fish-fx-rubber-duck',
  crypto_whale: 'fish-fx-crypto-whale',
  abyssal_kraken: 'fish-fx-abyssal-kraken',
  blue_whale: 'fish-fx-blue-whale',
  great_white_shark: 'fish-fx-great-white',
  manta_ray: 'fish-fx-manta-ray',
  giant_squid: 'fish-fx-giant-squid',
  killer_whale: 'fish-fx-killer-whale',
  humpback_whale: 'fish-fx-humpback-whale',
  landlord_pike: 'fish-fx-landlord-pike',

  // Epic species unique effects (14 loài)
  arowana_dragon: 'fish-fx-arowana',
  axolotl: 'fish-fx-axolotl',
  sturgeon: 'fish-fx-sturgeon',
  ghost_shark: 'fish-fx-ghost-shark',
  electric_eel: 'fish-fx-electric-eel',
  electric_catfish: 'fish-fx-electric-catfish',
  phoenix_tetra: 'fish-fx-phoenix-tetra',
  cyber_koi: 'fish-fx-cyber-koi',
  beluga_whale: 'fish-fx-beluga',
  narwhal: 'fish-fx-narwhal',
  sunfish_mola: 'fish-fx-sunfish',
  catfish_giant: 'fish-fx-catfish',
  alligator_gar: 'fish-fx-gar',
  philosopher_eel: 'fish-fx-philosopher',

  // Rare species unique effects (15 loài)
  disco_trout: 'fish-fx-disco-trout',
  tax_salmon: 'fish-fx-tax-salmon',
  golden_koi: 'fish-fx-golden-koi',
  betta_fighting: 'fish-fx-betta',
  piranha: 'fish-fx-piranha',
  snakehead: 'fish-fx-snakehead',
  lionfish: 'fish-fx-lionfish',
  barracuda: 'fish-fx-barracuda',
  anglerfish: 'fish-fx-anglerfish',
  moray_eel: 'fish-fx-moray-eel',
  pink_dolphin: 'fish-fx-pink-dolphin',
  dolphin_playful: 'fish-fx-dolphin-playful',
  hammerhead_shark: 'fish-fx-hammerhead',
  swordfish: 'fish-fx-swordfish',
  tuna_giant: 'fish-fx-tuna-giant',
};

/**
 * Returns the unique CSS effect class for a fishing rod.
 */
export const ROD_EFFECT_CLASS: Record<string, string> = {
  rod_fiberglass: 'rod-fx-fiberglass',
  rod_pro_carbon: 'rod-fx-carbon',
  rod_golden_legend: 'rod-fx-golden',
  rod_abyssal: 'rod-fx-abyssal',
  // Backward compatibility aliases
  rod_golden: 'rod-fx-golden',
  rod_carbon: 'rod-fx-carbon',
};

/**
 * Draws the high-detail pixel art for each of the 55 unique fish species.
 */
export function drawFish(speciesId: string): PixelGrid {
  const parent = SPECIES_MAP.get(speciesId)?.variantOf;
  if (parent) return drawFish(parent);
  const { baseWidth: W, baseHeight: H } = fishRenderDimensions(speciesId);
  const g = new PixelGrid(W, H);

  switch (speciesId) {
    // =========================================================================
    // --- COMMON (15 LOÀI PHỔ THÔNG) ---
    // =========================================================================

    case 'soggy_boot': {
      // Chiếc Ủng Ướt Sũng: Weathered brown leather boot, rubber sole, laces, tangled green kelp & dripping water
      g.rect(7, 3, 7, 10, '#5a3d28');
      g.rect(7, 2, 7, 2, '#785338'); // collar rim
      g.ellipse(15, 11, 7, 3, '#5a3d28'); // curved toe vamp
      g.rect(5, 13, 17, 2, '#2e1e14'); // heavy rubber sole
      g.rect(5, 15, 5, 2, '#1c1917'); // heel
      g.set(20, 11, '#785338'); // toe shine
      g.set(9, 5, '#3d2618'); // eyelets
      g.set(10, 7, '#3d2618');
      g.set(9, 9, '#3d2618');
      // Tangled slimy seaweed wrapping boot
      g.line(5, 6, 8, 8, '#22c55e');
      g.line(7, 8, 9, 12, '#16a34a');
      g.set(13, 11, '#22c55e');
      g.set(14, 12, '#15803d');
      // Cyan water droplets dripping from sole
      g.set(15, 15, '#38bdf8');
      g.set(15, 16, '#7dd3fc');
      break;
    }

    case 'anxious_minnow': {
      // Cá Tuế Bồn Chồn (24x16): Cute trembling turquoise minnow with big watery sparkle eye & sweat drop
      g.ellipse(11, 8, 7, 3, '#38bdf8');
      g.line(7, 6, 15, 6, '#7dd3fc'); // dorsal shimmer
      g.line(8, 10, 15, 10, '#f0f9ff'); // silver belly
      // Quivering forked tail
      g.line(4, 8, 1, 5, '#7dd3fc');
      g.line(4, 8, 1, 11, '#7dd3fc');
      g.set(2, 8, '#bae6fd');
      // Dorsal and pelvic fins
      g.rect(10, 3, 3, 2, '#bae6fd');
      g.rect(11, 11, 2, 2, '#bae6fd');
      // Big anxious glassy eye with glint
      g.rect(14, 6, 3, 3, '#ffffff');
      g.set(15, 7, INK);
      g.set(14, 6, '#ffffff');
      g.set(18, 9, '#f43f5e'); // trembling lip
      g.set(12, 3, '#60a5fa'); // tiny blue sweat drop
      break;
    }

    case 'office_carp': {
      // Cá Chép Công Sở (28x18): Sinuous orange koi wearing a crisp white dress collar & red necktie
      g.ellipse(14, 9, 9, 4, '#f97316');
      g.line(9, 6, 20, 6, '#fb923c'); // dorsal crest
      g.line(10, 12, 19, 12, '#fed7aa'); // peach belly
      // Flared butterfly caudal fin
      g.ellipse(4, 9, 3, 5, '#fb923c');
      g.line(2, 6, 2, 12, '#f97316');
      g.rect(11, 3, 5, 2, '#fb923c'); // dorsal fin
      g.rect(12, 13, 4, 2, '#ea580c'); // pelvic fin
      // White shirt collar
      g.rect(18, 6, 2, 7, '#ffffff');
      // Sharp red necktie
      g.rect(19, 8, 2, 5, '#ef4444');
      g.set(19, 13, '#dc2626'); // tie point
      g.set(19, 7, '#991b1b'); // knot
      // Eye & mouth
      g.set(22, 8, INK);
      g.set(22, 7, '#ffffff');
      break;
    }

    case 'clownfish': {
      // Cá Hề Lạc Lối (24x16): Vibrant bright orange with 3 curved black-bordered white vertical stripes
      g.ellipse(12, 8, 7, 4, '#ea580c');
      g.line(8, 5, 16, 5, '#f97316'); // top shine
      g.line(8, 11, 16, 11, '#c2410c'); // under shadow
      // Fan tail with black border
      g.ellipse(3, 8, 2, 4, '#ea580c');
      g.line(1, 6, 1, 10, INK);
      // 3 white bars with black borders
      g.line(6, 6, 6, 10, '#ffffff');
      g.set(5, 7, INK);
      g.set(7, 7, INK);
      g.line(11, 5, 11, 11, '#ffffff');
      g.set(10, 6, INK);
      g.set(12, 6, INK);
      g.line(16, 6, 16, 10, '#ffffff');
      // Rounded fins
      g.rect(9, 3, 4, 1, '#ea580c');
      g.rect(10, 12, 4, 1, '#ea580c');
      // Eye with bright glint
      g.rect(17, 7, 2, 2, '#ffffff');
      g.set(18, 7, INK);
      break;
    }

    case 'seahorse': {
      // Cá Ngựa Đi Bộ (24x16): Vertical S-curve posture, curled tail, snout & coronet crown
      g.circle(12, 4, 3, '#f59e0b'); // head
      g.rect(10, 1, 3, 2, '#fde047'); // coronet crown
      g.set(10, 0, '#fef08a');
      g.set(12, 0, '#fef08a');
      g.rect(15, 4, 3, 2, '#fbbf24'); // tubular snout
      g.set(13, 4, INK); // eye
      g.set(12, 3, '#ffffff');
      // S-curve segmented armor body
      g.ellipse(11, 8, 3, 3, '#f59e0b');
      g.line(10, 11, 9, 13, '#d97706');
      g.line(9, 13, 12, 14, '#b45309');
      g.set(12, 13, '#b45309'); // curled tail tip
      // Fluttering dorsal fin
      g.rect(7, 7, 2, 3, '#fef08a');
      break;
    }

    case 'tilapia': {
      // Cá Rô Phi Bất Tử (28x18): Hardy olive-silver body with dark vertical tiger bars & spiky dorsal
      g.ellipse(14, 9, 9, 5, '#64748b');
      g.line(8, 5, 20, 5, '#94a3b8');
      g.line(9, 13, 19, 13, '#f1f5f9'); // silver belly
      // Dark vertical tiger bars
      g.line(10, 6, 10, 12, '#334155');
      g.line(13, 5, 13, 13, '#334155');
      g.line(16, 6, 16, 12, '#334155');
      // Fan tail
      g.ellipse(3, 9, 3, 5, '#475569');
      // Tough spiky dorsal fin with red accents
      g.rect(9, 2, 10, 3, '#94a3b8');
      g.set(10, 1, '#ef4444');
      g.set(13, 1, '#ef4444');
      g.set(16, 1, '#ef4444');
      // Eye with glint
      g.ellipse(20, 8, 1, 1, '#ffffff');
      g.set(21, 8, INK);
      g.set(20, 7, '#ffffff');
      break;
    }

    case 'chub': {
      // Cá Mương Háu Ăn (28x18): Chubby golden-olive stream fish with open hungry mouth chasing breadcrumbs
      g.ellipse(14, 9, 9, 4, '#84cc16');
      g.line(8, 6, 19, 6, '#bef264');
      g.line(9, 12, 18, 12, '#fef08a');
      g.ellipse(3, 9, 3, 5, '#65a30d');
      g.rect(10, 3, 4, 2, '#65a30d');
      // Open hungry mouth
      g.set(23, 8, '#84cc16'); // upper lip
      g.set(23, 11, '#84cc16'); // lower lip
      g.rect(21, 9, 2, 2, '#991b1b'); // red open mouth
      // Eye
      g.ellipse(19, 8, 1, 1, '#ffffff');
      g.set(19, 8, INK);
      g.set(18, 7, '#ffffff');
      // Floating golden breadcrumbs
      g.circle(25, 9, 1, '#f59e0b');
      g.set(26, 8, '#fef08a');
      break;
    }

    case 'guppy_rainbow': {
      // Cá Bảy Màu Phù Hoa (24x16): Slender pearl body with massive 5-color cascading fan tail
      g.ellipse(14, 8, 6, 3, '#e2e8f0');
      g.line(18, 8, 20, 8, '#cbd5e1');
      g.line(11, 6, 17, 6, '#ffffff');
      // Enormous cascading sunset rainbow fan tail
      g.line(8, 8, 2, 3, '#ef4444');
      g.line(8, 8, 1, 6, '#f97316');
      g.line(8, 8, 1, 8, '#eab308');
      g.line(8, 8, 1, 10, '#10b981');
      g.line(8, 8, 2, 12, '#06b6d4');
      g.line(8, 8, 3, 14, '#8b5cf6');
      g.ellipse(4, 8, 3, 4, '#f472b6');
      // Dorsal fin
      g.rect(12, 3, 3, 2, '#38bdf8');
      // Sparkle eye
      g.ellipse(17, 7, 1, 1, '#ffffff');
      g.set(17, 7, INK);
      g.set(16, 6, '#ffffff');
      break;
    }

    case 'crawfish': {
      // Tôm Hùm Đất Đỏ Cay (24x16): Segmented crimson carapace, 2 massive raised claws & long antennae
      g.ellipse(11, 8, 4, 3, '#dc2626');
      g.line(8, 6, 13, 6, '#f87171');
      g.rect(5, 7, 3, 3, '#b91c1c'); // abdomen
      g.rect(3, 8, 2, 2, '#991b1b');
      g.ellipse(1, 9, 1, 3, '#7f1d1d'); // tail fan
      // 2 Big raised pincers
      g.rect(15, 3, 3, 3, '#ef4444');
      g.set(18, 2, '#f87171');
      g.set(18, 4, '#f87171');
      g.rect(15, 11, 3, 3, '#ef4444');
      g.set(18, 11, '#f87171');
      g.set(18, 13, '#f87171');
      // Long whisker antennae
      g.line(15, 6, 21, 3, '#f87171');
      g.line(15, 10, 21, 13, '#f87171');
      // Beady eyes
      g.set(14, 6, INK);
      g.set(14, 9, INK);
      break;
    }

    case 'pufferfish': {
      // Cá Nóc Hờn Dỗi (24x16): Bloated spherical ball, sharp radiating spines, irritated side-eye & pouty beak
      g.circle(11, 8, 6, '#facc15');
      g.ellipse(11, 11, 5, 3, '#fef08a'); // pale cream belly
      g.line(8, 3, 14, 3, '#fef9c3'); // shine
      // Stubby tail
      g.rect(2, 7, 3, 3, '#ca8a04');
      // Radiating sharp needle spikes
      const pufferSpikes: [number, number][] = [
        [4, 5],
        [4, 11],
        [11, 1],
        [11, 15],
        [17, 4],
        [17, 12],
        [7, 3],
        [15, 3],
        [7, 13],
        [15, 13],
      ];
      pufferSpikes.forEach(([x, y]) => g.set(x, y, '#78350f'));
      // Grumpy irritated side-eye & furrowed brow
      g.rect(14, 6, 3, 3, '#ffffff');
      g.set(15, 7, INK);
      g.line(13, 5, 16, 5, '#78350f'); // furrowed brow
      g.rect(17, 8, 2, 2, '#ea580c'); // pouty beak
      break;
    }

    case 'flounder': {
      // Cá Bơn Hai Mắt Một Bên (24x16): Asymmetrical flat brown pancake body with both goofy eyes on top
      g.ellipse(11, 8, 8, 4, '#b45309');
      g.line(4, 4, 18, 4, '#d97706'); // dorsal rim
      g.line(4, 12, 18, 12, '#92400e'); // ventral rim
      g.ellipse(2, 8, 2, 3, '#92400e'); // caudal fin
      // Sandy camouflage speckles
      g.set(7, 7, '#fde68a');
      g.set(11, 9, '#fde68a');
      g.set(15, 6, '#fde68a');
      // BOTH eyes clustered together on the upper side!
      g.rect(14, 4, 2, 2, '#ffffff');
      g.set(15, 5, INK);
      g.rect(17, 4, 2, 2, '#ffffff');
      g.set(18, 5, INK);
      g.line(18, 8, 20, 8, '#78350f'); // crooked mouth
      break;
    }

    case 'blue_tang': {
      // Cá Đuôi Gai Hay Quên (28x18): Royal blue oval body with bold black palette loop & canary yellow tail
      g.ellipse(14, 9, 8, 5, '#1d4ed8');
      g.line(8, 5, 19, 5, '#3b82f6'); // bright blue crest
      // Bold black palette swirl
      g.line(10, 8, 16, 8, '#0f172a');
      g.line(16, 8, 16, 11, '#0f172a');
      g.line(16, 11, 12, 11, '#0f172a');
      // Vivid bright yellow tail fin
      g.ellipse(3, 9, 3, 5, '#facc15');
      g.set(9, 4, '#fde047');
      // Wide friendly eye
      g.ellipse(19, 8, 1, 1, '#ffffff');
      g.set(20, 8, INK);
      g.set(19, 7, '#ffffff');
      break;
    }

    case 'flying_fish': {
      // Cá Chuồn Trốn Nợ (24x16): Slender cobalt missile body with giant translucent dragonfly wing fins
      g.ellipse(12, 8, 8, 3, '#0284c7');
      g.line(7, 10, 17, 10, '#f1f5f9'); // silver belly
      // Scissor tail
      g.line(4, 8, 1, 4, '#0369a1');
      g.line(4, 8, 1, 12, '#0369a1');
      // Giant iridescent gliding wings
      g.line(10, 6, 15, 1, '#bae6fd');
      g.line(15, 1, 18, 2, '#e0f2fe');
      g.line(11, 6, 16, 2, '#ffffff');
      g.line(10, 10, 15, 14, '#bae6fd');
      // Eye
      g.ellipse(17, 8, 1, 1, '#ffffff');
      g.set(18, 8, INK);
      g.set(17, 7, '#ffffff');
      break;
    }

    case 'bass_largemouth': {
      // Cá Vược Miệng Rộng (28x18): Deep olive body with dark broken lateral stripe & gaping bucket mouth
      g.ellipse(13, 9, 9, 5, '#15803d');
      g.line(7, 9, 18, 9, '#14532d'); // dark stripe
      g.line(8, 13, 18, 13, '#fef08a'); // yellow-white belly
      g.ellipse(2, 9, 3, 5, '#15803d');
      g.rect(9, 3, 8, 2, '#166534'); // dorsal fin
      // Cavernous bucket mouth
      g.line(19, 6, 23, 6, '#15803d');
      g.line(18, 12, 23, 12, '#15803d');
      g.rect(20, 7, 3, 5, '#7f1d1d'); // deep red throat
      g.ellipse(18, 7, 1, 1, '#facc15');
      g.set(18, 7, INK);
      break;
    }

    case 'flying_squid': {
      // Mực Ống Phóng Tên Lửa (28x18): Crimson rocket mantle, tail fin cone & trailing tentacles with ink
      g.ellipse(16, 9, 8, 4, '#ea580c');
      g.line(10, 6, 21, 6, '#f97316');
      g.line(10, 12, 21, 12, '#c2410c');
      // Stabilizer tail fin cone
      g.line(23, 7, 26, 9, '#ea580c');
      g.line(23, 11, 26, 9, '#ea580c');
      // Undulating tentacles
      g.line(8, 7, 1, 5, '#f97316');
      g.line(8, 9, 1, 9, '#ea580c');
      g.line(8, 11, 1, 13, '#f97316');
      // Giant squid eye
      g.ellipse(11, 9, 1, 1, '#ffffff');
      g.set(11, 9, INK);
      break;
    }

    // =========================================================================
    // --- RARE (15 LOÀI HIẾM) ---
    // =========================================================================

    case 'disco_trout': {
      // Cá Hồi Vũ Trường (28x18): Sparkling rainbow trout with glittering mirror disco tiles & cool shades
      g.ellipse(14, 9, 9, 4, '#06b6d4');
      g.line(9, 6, 20, 6, '#22d3ee');
      g.line(9, 12, 19, 12, '#e0f2fe');
      g.ellipse(3, 9, 3, 5, '#0891b2');
      // Mirror disco tiles
      g.set(9, 7, '#ec4899');
      g.set(11, 7, '#facc15');
      g.set(13, 7, '#ffffff');
      g.set(10, 9, '#a855f7');
      g.set(12, 9, '#22c55e');
      g.set(14, 9, '#facc15');
      g.set(11, 11, '#ec4899');
      // Cool black shades
      g.rect(17, 7, 4, 2, '#0f172a');
      g.set(18, 7, '#ffffff'); // glint
      break;
    }

    case 'tax_salmon': {
      // Cá Hồi Hoàn Thuế (28x18): Leaping pink-silver salmon clamping tax return form with red seal
      g.ellipse(14, 9, 9, 4, '#f43f5e');
      g.line(8, 6, 19, 6, '#fb7185');
      g.line(9, 12, 19, 12, '#cbd5e1'); // silver belly
      g.ellipse(3, 9, 3, 5, '#e11d48');
      g.rect(11, 3, 4, 2, '#f43f5e');
      g.set(19, 7, INK);
      // Tax return form clamped in mouth
      g.rect(19, 9, 6, 6, '#ffffff');
      g.rect(20, 10, 4, 1, '#94a3b8');
      g.rect(20, 12, 4, 1, '#94a3b8');
      g.set(23, 13, '#ef4444'); // official red tax stamp
      break;
    }

    case 'golden_koi': {
      // Cá Chép Vàng Phong Thủy (28x18): Brilliant 24k gold scales, long dragon barbels & flowing silk fins
      g.ellipse(14, 9, 9, 4, '#f59e0b');
      g.line(8, 6, 20, 6, '#fbbf24');
      g.line(9, 12, 19, 12, '#d97706');
      // Flowing silk fins
      g.ellipse(3, 9, 4, 6, '#fef08a');
      g.rect(11, 2, 5, 3, '#fde68a');
      g.rect(12, 13, 4, 3, '#fde68a');
      // Glistening gold scale highlights
      g.set(10, 8, '#ffffff');
      g.set(13, 9, '#ffffff');
      g.set(16, 8, '#ffffff');
      // Whiskers & eye
      g.line(22, 10, 25, 12, '#fbbf24');
      g.ellipse(20, 7, 1, 1, '#ffffff');
      g.set(21, 7, INK);
      break;
    }

    case 'betta_fighting': {
      // Cá Xiêm Chiến Thần (24x16): Royal purple body with massive billowing crimson & violet veil fins
      g.ellipse(13, 8, 5, 3, '#7c3aed');
      g.line(10, 6, 16, 6, '#9333ea');
      // Spectacular crimson veil-tail drapery
      g.ellipse(4, 8, 4, 7, '#ef4444');
      g.line(4, 3, 1, 1, '#dc2626');
      g.line(4, 13, 1, 15, '#dc2626');
      g.rect(9, 2, 5, 3, '#dc2626'); // dorsal veil
      g.rect(10, 11, 5, 3, '#dc2626'); // anal veil
      // Angry glare & flared red opercular gill
      g.rect(15, 7, 2, 2, '#ffffff');
      g.set(16, 7, INK);
      g.set(14, 9, '#ef4444'); // gill flare
      break;
    }

    case 'piranha': {
      // Cá Piranha Răng Sún (24x16): Slate flank, blood-red belly, bulldog underslung jaw with chipped tooth
      g.ellipse(11, 8, 7, 4, '#475569');
      g.line(7, 5, 15, 5, '#64748b');
      g.line(7, 11, 15, 11, '#dc2626'); // blood red belly
      g.ellipse(2, 8, 2, 4, '#334155');
      // Protruding toothy jaw
      g.rect(16, 8, 4, 4, '#dc2626');
      g.set(18, 7, '#ffffff'); // top tooth
      g.set(19, 10, '#ffffff'); // bottom tooth
      g.set(17, 10, '#7f1d1d'); // chipped tooth gap!
      g.circle(15, 6, 1, '#f87171');
      g.set(15, 6, INK);
      break;
    }

    case 'snakehead': {
      // Cá Lóc Canh Chua (38x22): Muscular serpentine predator with mottled brown/black snake scales
      g.ellipse(18, 11, 13, 4, '#451a03');
      g.line(10, 8, 26, 8, '#78350f');
      g.line(10, 14, 26, 14, '#fef08a'); // pale belly
      g.ellipse(3, 11, 3, 5, '#451a03');
      g.rect(12, 6, 14, 2, '#78350f'); // long dorsal fin
      // Camouflage python blotches
      for (let x = 11; x <= 25; x += 3) {
        g.set(x, 10, '#0f172a');
        g.set(x + 1, 11, '#0f172a');
      }
      // Flat predatory head & reptilian eye
      g.ellipse(29, 11, 4, 3, '#451a03');
      g.circle(28, 9, 1, '#facc15');
      g.set(28, 9, INK);
      break;
    }

    case 'lionfish': {
      // Cá Sư Tử Điệu Đà (28x18): Radiating venomous needle spines, zebra stripes & lace pectoral fins
      g.ellipse(14, 9, 8, 4, '#b91c1c');
      g.line(9, 6, 19, 6, '#ef4444');
      g.ellipse(3, 9, 3, 5, '#dc2626');
      // Zebra stripes
      g.line(11, 6, 11, 12, '#ffffff');
      g.line(14, 6, 14, 12, '#ffffff');
      g.line(17, 6, 17, 12, '#ffffff');
      // Regal needle spines radiating upwards
      [7, 9, 11, 13, 15, 17].forEach((x) => {
        g.line(x, 5, x - 1, 1, '#ef4444');
        g.set(x - 1, 0, '#ffffff');
      });
      // Lace pectoral wing
      g.ellipse(12, 12, 4, 3, '#fca5a5');
      g.set(20, 8, INK);
      g.set(20, 7, '#ffffff');
      break;
    }

    case 'barracuda': {
      // Cá Nhồng Tốc Độ (38x22): Ultra-slender chrome missile with electric blue back & needle teeth
      g.ellipse(19, 11, 14, 2, '#94a3b8');
      g.line(10, 9, 29, 9, '#38bdf8'); // electric blue back
      g.line(10, 13, 29, 13, '#f1f5f9'); // gleaming silver belly
      // Scissor tail
      g.line(5, 11, 1, 6, '#64748b');
      g.line(5, 11, 1, 16, '#64748b');
      // Underhung toothy jaw
      g.rect(30, 11, 5, 2, '#94a3b8');
      g.set(32, 10, '#ffffff'); // razor needle fangs
      g.set(34, 10, '#ffffff');
      // Predatory eye
      g.circle(28, 10, 1, '#facc15');
      g.set(28, 10, INK);
      break;
    }

    case 'anglerfish': {
      // Cá Lồng Đèn Đèn Pin (28x18): Deep-sea abyss purple demon, underhung fangs & glowing yellow lantern
      g.ellipse(13, 10, 8, 5, '#3b0764');
      g.line(8, 6, 18, 6, '#581c87');
      g.ellipse(3, 10, 3, 5, '#3b0764');
      // Gaping underhung jaw with needle fangs
      g.rect(17, 11, 4, 4, '#2e1065');
      g.set(18, 9, '#ffffff');
      g.set(20, 9, '#ffffff');
      g.set(19, 13, '#ffffff');
      // Esca lantern stalk & glowing bulb with halo
      g.line(14, 6, 18, 2, '#581c87');
      g.circle(19, 2, 2, '#fef08a');
      g.set(19, 2, '#facc15'); // bright bulb core
      g.set(20, 1, '#ffffff'); // sparkle glint
      // Milky white blind eye
      g.circle(15, 8, 1, '#ffffff');
      break;
    }

    case 'moray_eel': {
      // Cá Lở Lợm Hang Đá (38x22): Sinuous golden-spotted moray with wide open meme mouth
      g.ellipse(17, 11, 14, 3, '#15803d');
      g.line(8, 9, 27, 9, '#16a34a'); // dorsal ribbon
      g.ellipse(2, 11, 2, 3, '#15803d');
      // Leopard yellow blotches
      for (let x = 8; x <= 26; x += 3) {
        g.set(x, 11, '#facc15');
      }
      // Gaping meme mouth
      g.rect(28, 10, 6, 5, '#15803d');
      g.rect(30, 11, 4, 3, '#7f1d1d'); // open red throat
      g.set(31, 10, '#ffffff'); // teeth
      g.set(33, 10, '#ffffff');
      // Shocked cartoon eyes
      g.rect(27, 8, 3, 3, '#ffffff');
      g.set(28, 9, INK);
      break;
    }

    case 'pink_dolphin': {
      // Cá Heo Hồng Thủy Chung (38x22): Amazon pink dolphin, bubblegum pink, bulbous melon & gentle smile
      g.ellipse(18, 11, 12, 4, '#f472b6');
      g.line(10, 8, 26, 8, '#fbcfe8'); // soft pink shine
      g.line(10, 14, 26, 14, '#f9a8d4');
      g.ellipse(3, 11, 3, 6, '#ec4899'); // flukes
      g.rect(16, 7, 4, 2, '#ec4899'); // dorsal ridge
      g.ellipse(17, 14, 3, 2, '#f472b6'); // flipper
      // Bulbous melon forehead & long gentle beak
      g.circle(28, 9, 3, '#fbcfe8');
      g.rect(30, 11, 5, 2, '#f472b6'); // long beak
      // Tender smiling eye
      g.set(27, 10, INK);
      g.set(27, 9, '#ffffff');
      break;
    }

    case 'dolphin_playful': {
      // Cá Heo Soi Bug (38x22): Arched leaping bottlenose dolphin, ocean blue with pure white belly & winking smile
      g.ellipse(18, 11, 12, 4, '#0284c7');
      g.line(10, 8, 26, 8, '#38bdf8');
      g.line(10, 14, 26, 14, '#f0f9ff'); // white belly
      g.ellipse(3, 11, 3, 6, '#0369a1'); // tail flukes
      g.line(15, 8, 17, 4, '#0369a1'); // curved dorsal fin
      g.ellipse(17, 14, 3, 2, '#0284c7');
      // Rounded melon & cute snout
      g.circle(28, 9, 3, '#0284c7');
      g.rect(30, 11, 4, 2, '#0284c7');
      // Playful winking eye
      g.line(26, 9, 28, 9, INK);
      g.set(27, 8, '#ffffff');
      break;
    }

    case 'hammerhead_shark': {
      // Cá Mập Đầu Búa Sửa Nhà (38x22): Slate apex predator with T-hammer head, eyes on outer tips & sickle fin
      g.ellipse(18, 11, 12, 4, '#475569');
      g.line(10, 8, 25, 8, '#64748b');
      g.line(10, 14, 25, 14, '#f1f5f9'); // white underbelly
      // Asymmetric shark tail
      g.line(6, 11, 1, 4, '#334155');
      g.line(6, 11, 2, 17, '#334155');
      // Tall sickle dorsal fin
      g.line(14, 8, 18, 3, '#334155');
      g.line(18, 3, 20, 8, '#334155');
      // T-shaped broad hammer head
      g.rect(28, 5, 4, 13, '#334155');
      g.rect(29, 6, 3, 11, '#475569');
      // Eyes positioned on the outer lateral tips of the hammer!
      g.set(30, 5, INK);
      g.set(30, 17, INK);
      break;
    }

    case 'swordfish': {
      // Cá Kiếm Đệ Nhất (38x22): Midnight blue swordfish with long rapier blade, sail dorsal & gladiator eye
      g.ellipse(18, 11, 12, 4, '#0f172a');
      g.line(10, 8, 25, 8, '#38bdf8'); // cyan sheen
      g.line(11, 14, 25, 14, '#f1f5f9'); // silver belly
      // Crescent moon tail flukes
      g.line(6, 11, 2, 4, '#0f172a');
      g.line(6, 11, 2, 18, '#0f172a');
      // Tall sail dorsal fin
      g.line(14, 8, 18, 2, '#0f172a');
      g.line(18, 2, 22, 8, '#1e293b');
      // Long rapier sword rostrum
      g.line(28, 11, 37, 11, '#64748b');
      g.line(30, 11, 36, 11, '#e2e8f0'); // sword shine
      g.set(37, 11, '#ffffff'); // sharp tip
      // Gladiator eye
      g.circle(25, 10, 1, '#38bdf8');
      g.set(25, 10, INK);
      break;
    }

    case 'tuna_giant': {
      // Cá Ngừ Đại Dương Thức Khuya (38x22): Muscular deep-blue torpedo with yellow finlets & tired bloodshot eyes
      g.ellipse(18, 11, 13, 5, '#1e3a8a');
      g.line(9, 7, 26, 7, '#3b82f6');
      g.line(9, 15, 26, 15, '#f1f5f9');
      // Rigid sickle tail
      g.line(5, 11, 1, 5, '#172554');
      g.line(5, 11, 1, 17, '#172554');
      // Bright yellow dorsal & ventral finlets
      [16, 18, 20, 22].forEach((x) => {
        g.set(x, 6, '#eab308');
        g.set(x, 16, '#eab308');
      });
      // Bloodshot, deadline-exhausted eye
      g.rect(25, 10, 3, 3, '#fca5a5');
      g.set(26, 11, INK);
      g.set(25, 10, '#ef4444'); // bloodshot red vein
      break;
    }

    // =========================================================================
    // --- EPIC (14 LOÀI SỬ THI) ---
    // =========================================================================

    case 'philosopher_eel': {
      // Lươn Triết Học (28x18): Sinuous indigo eel wearing gold monocle with chain
      g.ellipse(14, 9, 10, 3, '#312e81');
      g.line(7, 7, 21, 7, '#4338ca');
      g.ellipse(2, 9, 2, 3, '#312e81');
      // Gold monocle with dangling chain
      g.rect(19, 7, 3, 3, '#fbbf24');
      g.set(20, 8, '#ffffff'); // lens reflection
      g.line(19, 10, 17, 12, '#d97706'); // chain
      g.set(20, 7, INK);
      break;
    }

    case 'electric_catfish': {
      // Cá Trê Sạc Nhanh 65W (38x22): Plump slate catfish discharging high-voltage lightning sparks
      g.ellipse(18, 11, 12, 5, '#475569');
      g.line(9, 7, 26, 7, '#64748b');
      g.line(9, 15, 26, 15, '#94a3b8');
      g.ellipse(3, 11, 3, 5, '#334155');
      // Long yellow whisker barbels
      g.line(28, 9, 33, 7, '#eab308');
      g.line(28, 13, 33, 15, '#eab308');
      // 65W High-voltage electric sparks!
      g.set(34, 6, '#fef08a');
      g.set(35, 5, '#38bdf8');
      g.set(34, 16, '#fef08a');
      g.set(35, 17, '#38bdf8');
      g.set(18, 4, '#facc15');
      g.circle(25, 10, 1, '#fde047');
      g.set(25, 10, INK);
      break;
    }

    case 'electric_eel': {
      // Lươn Điện Cao Thế 220V (38x22): Extra-long sinuous neon-yellow electric eel enveloped in lightning
      g.ellipse(18, 11, 15, 3, '#ca8a04');
      g.line(6, 9, 30, 9, '#eab308');
      g.line(6, 13, 30, 13, '#a16207');
      g.ellipse(2, 11, 2, 3, '#854d0e');
      // 220V crackling lightning aura
      for (let x = 6; x <= 28; x += 4) {
        g.set(x, 7, '#fef08a');
        g.set(x + 1, 6, '#38bdf8');
        g.set(x, 15, '#fef08a');
        g.set(x + 1, 16, '#38bdf8');
      }
      // Glowing electric blue eye
      g.circle(30, 10, 1, '#38bdf8');
      g.set(31, 10, '#ffffff');
      break;
    }

    case 'arowana_dragon': {
      // Cá Rồng Hoàng Kim (38x22): Regal Asian arowana, massive 18k gold scales & upward chin barbels
      g.ellipse(18, 11, 13, 4, '#d97706');
      g.line(9, 8, 27, 8, '#fbbf24');
      g.line(9, 14, 27, 14, '#b45309');
      // Red-tipped imperial fins
      g.ellipse(3, 11, 3, 5, '#dc2626');
      g.rect(14, 5, 8, 2, '#dc2626');
      g.rect(14, 15, 8, 2, '#dc2626');
      // Large reflective 18k gold scales
      for (let x = 11; x <= 24; x += 3) {
        g.set(x, 10, '#fef08a');
        g.set(x + 1, 11, '#f59e0b');
      }
      // Upward chin barbels
      g.line(29, 12, 31, 9, '#fef08a');
      // Emperor gold eye
      g.circle(27, 10, 1, '#fef08a');
      g.set(27, 10, INK);
      break;
    }

    case 'sturgeon': {
      // Cá Tầm Trứng Muối (38x22): Prehistoric armored sturgeon, 5 rows of white bony scutes & black caviar jar
      g.ellipse(18, 11, 13, 4, '#334155');
      g.line(9, 8, 27, 8, '#475569');
      g.line(9, 14, 27, 14, '#e2e8f0');
      // Heterocercal tail
      g.line(5, 11, 1, 5, '#1e293b');
      g.line(5, 11, 2, 16, '#1e293b');
      // 5 Rows of white bony armored scutes
      for (let x = 10; x <= 25; x += 3) {
        g.set(x, 8, '#f8fafc');
        g.set(x, 11, '#f8fafc');
        g.set(x, 13, '#f8fafc');
      }
      // Upturned snout with barbels
      g.rect(29, 10, 5, 2, '#334155');
      g.set(30, 13, '#94a3b8');
      // Jar of black caviar held under belly
      g.rect(15, 15, 4, 3, '#0f172a');
      g.set(16, 16, '#facc15'); // gold label
      g.set(27, 10, INK);
      break;
    }

    case 'axolotl': {
      // Kỳ Nhông Nước Cười Trừ (24x16): Baby-pink axolotl, 6 external feathery red gills, stubby legs & sweet smile
      g.ellipse(12, 9, 6, 4, '#fbcfe8');
      g.line(8, 6, 15, 6, '#fdf2f8');
      g.line(8, 12, 15, 12, '#ffffff');
      g.ellipse(4, 9, 3, 3, '#f472b6'); // translucent tail
      // 6 Feathery branching external gills
      g.line(13, 5, 13, 1, '#f43f5e');
      g.line(15, 5, 16, 2, '#f43f5e');
      g.line(13, 13, 13, 15, '#f43f5e');
      g.line(15, 13, 16, 14, '#f43f5e');
      // Tiny stubby legs
      g.rect(8, 13, 2, 2, '#f472b6');
      g.rect(13, 13, 2, 2, '#f472b6');
      // Rosy cheeks & sweet derpy smile
      g.set(16, 10, '#fb7185');
      g.set(17, 8, INK);
      g.line(17, 10, 19, 9, '#e11d48');
      break;
    }

    case 'catfish_giant': {
      // Cá Tra Khổng Lồ Mê Bánh Mì (38x22): Colossal Mekong catfish with swollen white belly & crispy golden baguette
      g.ellipse(18, 11, 13, 5, '#334155');
      g.line(9, 7, 26, 7, '#475569');
      g.ellipse(18, 14, 10, 3, '#e2e8f0'); // huge swollen white belly
      g.ellipse(3, 11, 3, 6, '#1e293b');
      // Broad mouth holding a crispy golden French baguette!
      g.rect(28, 9, 8, 3, '#d97706');
      g.set(30, 8, '#fef08a'); // score marks
      g.set(33, 8, '#fef08a');
      g.line(27, 14, 32, 16, '#64748b'); // whiskers
      g.circle(26, 9, 1, '#ffffff');
      g.set(26, 9, INK);
      break;
    }

    case 'alligator_gar': {
      // Cá Sấu Hỏa Tiễn Mõm Dài (38x22): Armored diamond scales & long razor-toothed alligator snout
      g.ellipse(17, 11, 12, 3, '#15803d');
      g.line(9, 9, 25, 9, '#166534');
      g.line(9, 13, 25, 13, '#fef08a');
      g.ellipse(3, 11, 3, 5, '#14532d');
      // Diamond ganoid armor scales
      for (let x = 10; x <= 23; x += 3) {
        g.set(x, 10, '#86efac');
        g.set(x + 1, 11, '#166534');
      }
      // Long alligator snout with interlocking needle teeth
      g.rect(26, 10, 10, 3, '#15803d');
      g.set(28, 11, '#ffffff');
      g.set(31, 11, '#ffffff');
      g.set(34, 11, '#ffffff');
      g.circle(25, 9, 1, '#facc15');
      g.set(25, 9, INK);
      break;
    }

    case 'sunfish_mola': {
      // Cá Mặt Trăng Ngơ Ngác (38x22): Massive vertical disk shape, truncated wavy rudder tail & vacant stare
      g.ellipse(19, 11, 9, 8, '#94a3b8');
      g.line(14, 4, 24, 4, '#cbd5e1');
      g.line(14, 18, 24, 18, '#64748b');
      // Truncated wavy rudder clavus tail (no normal tail!)
      g.rect(8, 7, 3, 8, '#64748b');
      g.set(7, 8, '#94a3b8');
      g.set(7, 11, '#94a3b8');
      g.set(7, 14, '#94a3b8');
      // Tall dorsal and anal fin paddles
      g.rect(17, 0, 4, 4, '#64748b');
      g.rect(17, 18, 4, 4, '#64748b');
      // Vacant goofy stare & tiny O mouth
      g.rect(25, 9, 3, 3, '#ffffff');
      g.set(26, 10, INK);
      g.circle(28, 12, 1, '#0f172a');
      break;
    }

    case 'cyber_koi': {
      // Cá Chép Cyberpunk 2077 (28x18): Carbon fiber matte black with glowing cyan & neon magenta circuitry
      g.ellipse(14, 9, 9, 4, '#0f172a');
      g.line(8, 6, 20, 6, '#1e293b');
      g.ellipse(3, 9, 3, 5, '#0284c7');
      // Glowing neon cyber traces
      g.line(9, 8, 17, 8, '#06b6d4'); // cyan bus
      g.line(13, 9, 13, 12, '#ec4899'); // magenta trace
      g.line(13, 12, 18, 12, '#ec4899');
      // Tactical red HUD visor optic eye
      g.rect(19, 7, 3, 2, '#ef4444');
      g.set(20, 7, '#ffffff');
      break;
    }

    case 'phoenix_tetra': {
      // Cá Neon Hỏa Phụng (24x16): Flaming plumage, fiery red/orange/gold body with floating embers
      g.ellipse(12, 8, 6, 3, '#ea580c');
      g.line(8, 6, 16, 6, '#fde047');
      g.line(8, 10, 16, 10, '#b91c1c');
      // Flaming phoenix wings and tail feathers
      g.ellipse(3, 8, 3, 5, '#ef4444');
      g.ellipse(4, 8, 2, 3, '#facc15');
      g.rect(9, 2, 4, 3, '#f97316');
      g.rect(9, 11, 4, 3, '#f97316');
      // Floating fiery embers
      g.set(1, 2, '#fde047');
      g.set(3, 0, '#ef4444');
      g.set(1, 14, '#fde047');
      g.circle(16, 7, 1, '#fef08a');
      g.set(16, 7, INK);
      break;
    }

    case 'ghost_shark': {
      // Cá Mập Ma Dạ Quang (38x22): Pale translucent chimera with emerald glowing stitch lines & blind eye
      g.ellipse(18, 11, 12, 4, '#e0f2fe');
      g.line(9, 8, 26, 8, '#f0f9ff');
      g.line(9, 14, 26, 14, '#bae6fd');
      g.line(6, 11, 1, 6, '#bae6fd');
      g.line(14, 8, 17, 3, '#e0f2fe');
      // Emerald glowing mystical stitch lines
      for (let x = 10; x <= 25; x += 3) {
        g.set(x, 11, '#10b981');
        g.set(x + 1, 12, '#34d399');
      }
      // Blind milky turquoise ghost eye
      g.rect(26, 9, 3, 3, '#10b981');
      g.set(27, 10, '#ffffff');
      break;
    }

    case 'beluga_whale': {
      // Cá Voi Trắng Mỉm Cười (38x22): Pure pearl-white skin, soft round melon forehead & joyful smile
      g.ellipse(18, 11, 12, 5, '#f8fafc');
      g.line(9, 7, 26, 7, '#ffffff');
      g.line(9, 15, 26, 15, '#e2e8f0');
      g.ellipse(3, 11, 3, 6, '#e2e8f0');
      g.ellipse(17, 15, 3, 2, '#f1f5f9');
      // Soft plump melon forehead
      g.circle(28, 9, 4, '#ffffff');
      // Joyful smiling eye & warm smile
      g.set(28, 9, INK);
      g.set(28, 8, '#ffffff');
      g.line(30, 12, 32, 11, '#94a3b8');
      break;
    }

    case 'narwhal': {
      // Cá Kỳ Lân Bắt Sóng Wi-Fi (38x22): Dappled arctic whale with long spiral ivory horn emitting Wi-Fi waves
      g.ellipse(18, 11, 12, 4, '#64748b');
      g.line(9, 8, 26, 8, '#94a3b8');
      g.line(9, 14, 26, 14, '#f1f5f9');
      g.ellipse(3, 11, 3, 5, '#475569');
      // Dappled arctic speckles
      g.set(12, 10, '#ffffff');
      g.set(16, 12, '#ffffff');
      g.set(20, 10, '#ffffff');
      // Long spiral ivory horn
      g.line(29, 10, 37, 10, '#f8fafc');
      g.set(31, 10, '#cbd5e1');
      g.set(34, 10, '#cbd5e1');
      // Glowing cyan Wi-Fi wave arcs
      g.line(35, 7, 37, 5, '#38bdf8');
      g.line(36, 6, 38, 4, '#38bdf8');
      g.circle(27, 10, 1, '#ffffff');
      g.set(27, 10, INK);
      break;
    }

    // =========================================================================
    // --- LEGENDARY (11 LOÀI HUYỀN THOẠI) ---
    // =========================================================================

    case 'killer_whale': {
      // Cá Voi Sát Thủ Trầm Tính (46x26): Tuxedo black/white contrast, stark white eye patch & tall dorsal fin
      g.ellipse(23, 14, 16, 6, '#0f172a');
      g.line(12, 9, 34, 9, '#1e293b');
      // Stark white belly & chin saddle
      g.rect(14, 17, 18, 3, '#ffffff');
      g.rect(32, 15, 6, 3, '#ffffff');
      // Iconic oval white eye patch
      g.rect(32, 11, 4, 2, '#ffffff');
      g.set(35, 12, INK);
      // Tall triangular dorsal fin
      g.line(19, 9, 22, 2, '#0f172a');
      g.line(22, 2, 24, 9, '#1e293b');
      // Flukes & flipper
      g.line(7, 14, 2, 7, '#0f172a');
      g.line(7, 14, 2, 21, '#0f172a');
      g.ellipse(24, 17, 3, 2, '#0f172a');
      break;
    }

    case 'humpback_whale': {
      // Cá Voi Lưng Gù Hát Rong (46x26): Arched humped slate body, scalloped white flippers & musical notes
      g.ellipse(23, 14, 16, 6, '#1e293b');
      g.line(12, 9, 34, 9, '#334155');
      g.rect(14, 17, 18, 3, '#cbd5e1'); // throat pleats
      g.line(7, 14, 2, 7, '#0f172a');
      g.line(7, 14, 2, 21, '#0f172a');
      // Knobby head tubercles
      g.set(33, 9, '#ffffff');
      g.set(35, 10, '#ffffff');
      g.set(37, 12, '#ffffff');
      // Scalloped white pectoral flipper
      g.ellipse(22, 18, 4, 3, '#ffffff');
      // Floating musical notes
      g.rect(39, 4, 2, 2, '#38bdf8');
      g.set(40, 3, '#38bdf8');
      g.rect(43, 2, 2, 2, '#a855f7');
      g.set(44, 1, '#a855f7');
      g.circle(31, 12, 1, '#ffffff');
      g.set(31, 12, INK);
      break;
    }

    case 'blue_whale': {
      // Cá Voi Thở Oxy (46x26): Colossal deep ocean blue leviathan with towering blowhole water geyser
      g.ellipse(23, 15, 17, 6, '#1e40af');
      g.line(10, 10, 35, 10, '#3b82f6');
      // Pleated belly grooves
      for (let y = 18; y <= 21; y++) {
        g.line(14, y, 32, y, y % 2 === 0 ? '#93c5fd' : '#60a5fa');
      }
      // Tail flukes
      g.line(7, 15, 2, 7, '#172554');
      g.line(7, 15, 2, 23, '#172554');
      // Towering blowhole crystal water spout!
      g.line(30, 9, 30, 4, '#bae6fd');
      g.ellipse(30, 3, 3, 2, '#e0f2fe');
      g.ellipse(30, 1, 5, 1, '#ffffff');
      g.set(28, 2, '#bae6fd');
      g.set(32, 2, '#bae6fd');
      // Wise ancient eye
      g.circle(35, 14, 1, '#0f172a');
      g.set(35, 14, '#60a5fa');
      break;
    }

    case 'great_white_shark': {
      // Cá Mập Ăn Chay (38x22): Apex predator torpedo chewing green kelp sprig, sharp teeth, snow-white belly
      g.ellipse(18, 12, 13, 5, '#334155');
      g.line(9, 8, 26, 8, '#475569');
      g.line(10, 16, 26, 16, '#ffffff'); // pure white underbelly
      // Asymmetrical shark tail
      g.line(6, 12, 1, 4, '#1e293b');
      g.line(6, 12, 2, 17, '#1e293b');
      // Tall dorsal fin
      g.line(14, 8, 18, 3, '#1e293b');
      g.line(18, 3, 20, 8, '#1e293b');
      // 4 Gill slits
      [19, 21, 23].forEach((x) => g.line(x, 10, x, 13, '#1e293b'));
      // Toothy mouth chewing a vegetarian green kelp sprig!
      g.rect(27, 12, 5, 3, '#334155');
      g.set(29, 13, '#ffffff');
      g.set(31, 13, '#ffffff');
      g.line(31, 14, 35, 18, '#22c55e');
      g.set(34, 16, '#16a34a');
      g.set(36, 19, '#15803d');
      // Shark button eye
      g.circle(26, 10, 1, '#0f172a');
      g.set(26, 10, '#ffffff');
      break;
    }

    case 'manta_ray': {
      // Cá Đuối Tấm Thảm Bay (38x22): Diamond stealth wings with white borders, cephalic horns & whip tail
      g.ellipse(18, 11, 10, 6, '#0f172a');
      // Large diamond carpet wings
      g.line(18, 5, 23, 1, '#0f172a');
      g.line(23, 1, 28, 5, '#0f172a');
      g.line(18, 17, 23, 21, '#0f172a');
      g.line(23, 21, 28, 17, '#0f172a');
      // White contrast wing borders
      g.line(20, 1, 25, 1, '#ffffff');
      g.line(20, 21, 25, 21, '#ffffff');
      // Two cephalic horns
      g.rect(28, 9, 3, 2, '#1e293b');
      g.rect(28, 12, 3, 2, '#1e293b');
      // Slender whip tail
      g.line(8, 11, 1, 11, '#0f172a');
      g.set(28, 8, '#ffffff');
      g.set(28, 14, '#ffffff');
      break;
    }

    case 'giant_squid': {
      // Mực Khổng Lồ Chấm Sa Tế (46x26): Deep-sea satay-red colossus with arrowhead mantle & 10 suction-cup tentacles
      g.ellipse(26, 13, 11, 5, '#991b1b');
      g.line(17, 9, 35, 9, '#b91c1c');
      g.line(17, 17, 35, 17, '#7f1d1d');
      // Arrowhead stabilizer fin
      g.line(36, 13, 44, 9, '#b91c1c');
      g.line(36, 13, 44, 17, '#b91c1c');
      // 10 Giant curling tentacles with white suction cups
      g.line(16, 11, 2, 7, '#b91c1c');
      g.line(16, 13, 1, 12, '#dc2626');
      g.line(16, 15, 2, 18, '#b91c1c');
      const squidCups: [number, number][] = [
        [3, 7],
        [2, 12],
        [3, 18],
        [6, 9],
        [6, 15],
      ];
      squidCups.forEach(([x, y]) => g.set(x, y, '#ffffff'));
      // Dinner-plate yellow squid eye
      g.circle(18, 13, 2, '#fef08a');
      g.set(18, 13, INK);
      break;
    }

    case 'crypto_whale': {
      // Cá Voi Tiền Ảo HODL (46x26): Holographic emerald bull-market whale with green candlestick charts & red laser eyes
      g.ellipse(23, 14, 16, 6, '#065f46');
      g.line(12, 9, 34, 9, '#10b981');
      g.line(7, 14, 2, 7, '#047857');
      g.line(7, 14, 2, 21, '#047857');
      // Glowing green financial candlestick charts
      g.rect(14, 12, 2, 5, '#10b981');
      g.set(14, 11, '#34d399');
      g.rect(18, 10, 2, 7, '#10b981');
      g.set(18, 9, '#34d399');
      g.rect(22, 13, 2, 4, '#10b981');
      // Golden ₿ Bitcoin coin badge
      g.circle(28, 13, 2, '#f59e0b');
      g.set(28, 13, '#fef08a');
      // Red laser eyes shooting forward!
      g.rect(34, 11, 4, 2, '#ef4444');
      g.line(38, 11, 44, 11, '#f87171');
      break;
    }

    case 'abyssal_kraken': {
      // Bạch Tuộc Vực Thẳm Cực Đại (46x26): Cosmic eldritch violet octopus with glowing crimson all-seeing eye
      g.ellipse(26, 13, 11, 6, '#2e1065');
      g.line(17, 8, 35, 8, '#3b0764');
      // Writhing eldritch tentacles with magenta suckers
      g.line(16, 10, 2, 4, '#581c87');
      g.line(16, 16, 2, 22, '#581c87');
      g.line(16, 13, 1, 13, '#7e22ce');
      const krakenSuckers: [number, number][] = [
        [3, 5],
        [3, 21],
        [8, 6],
        [8, 20],
      ];
      krakenSuckers.forEach(([x, y]) => g.set(x, y, '#f43f5e'));
      // Horrifying crimson all-seeing eye in center
      g.rect(24, 10, 6, 6, '#dc2626');
      g.rect(25, 11, 4, 4, '#fef08a');
      g.set(26, 12, '#7f1d1d');
      g.set(27, 12, '#7f1d1d');
      break;
    }

    case 'golden_dragon_fish': {
      // Thần Long Hoàng Kim (46x26): Sinuous mythical Asian dragon, golden scales, flaming red mane, antlers & whiskers
      g.ellipse(22, 13, 16, 4, '#d97706');
      g.line(10, 10, 34, 10, '#fbbf24');
      // Flowing flaming dragon tail
      g.ellipse(4, 13, 4, 6, '#ef4444');
      g.line(4, 8, 1, 4, '#f87171');
      g.line(4, 18, 1, 22, '#f87171');
      // Red mane flames along spine
      for (let x = 11; x <= 32; x += 3) {
        g.set(x, 8, '#ef4444');
        g.set(x, 7, '#f87171');
      }
      // Shimmering white 24k scale glints
      g.set(15, 12, '#ffffff');
      g.set(20, 12, '#ffffff');
      g.set(25, 12, '#ffffff');
      // Dragon head with golden horns & whiskers
      g.circle(36, 12, 4, '#f59e0b');
      g.line(38, 9, 41, 5, '#fef08a');
      g.line(40, 7, 42, 6, '#fef08a');
      g.line(40, 14, 44, 12, '#fef08a'); // whiskers
      // Royal ruby eye
      g.circle(36, 11, 1, '#ef4444');
      g.set(36, 11, '#ffffff');
      break;
    }

    case 'rubber_duck_leviathan': {
      // Đại Thần Vịt Cao Su (46x26): Surreal giant yellow rubber duck with sparkling blue eye, orange beak & jeweled crown
      g.ellipse(20, 16, 13, 7, '#facc15');
      g.line(12, 10, 26, 10, '#fef08a'); // rubber shine
      g.line(11, 21, 27, 21, '#ca8a04'); // shadow
      g.ellipse(5, 13, 3, 4, '#facc15'); // perky tail
      g.set(3, 11, '#fef08a');
      // Fluffy wing
      g.ellipse(18, 16, 6, 3, '#eab308');
      g.line(15, 15, 20, 15, '#fde047');
      // Duck head
      g.circle(33, 10, 6, '#facc15');
      g.line(30, 5, 36, 5, '#fef08a');
      // Sparkling cartoon eye
      g.circle(35, 9, 2, INK);
      g.set(34, 8, '#ffffff');
      g.set(35, 9, '#38bdf8');
      // Orange beak smile
      g.ellipse(41, 12, 3, 2, '#ea580c');
      g.set(42, 12, '#c2410c');
      // Imperial golden crown with ruby, sapphire, emerald
      g.rect(31, 1, 6, 3, '#f59e0b');
      g.set(31, 0, '#ef4444'); // ruby
      g.set(33, 0, '#38bdf8'); // sapphire
      g.set(36, 0, '#10b981'); // emerald
      break;
    }

    case 'landlord_pike': {
      // Cá Măng Địa Chủ (38x22): Dapper predatory pike wearing tall black top hat with red silk band & cigar smoke
      g.ellipse(18, 11, 13, 4, '#15803d');
      g.line(9, 8, 27, 8, '#166534');
      g.line(9, 14, 27, 14, '#86efac');
      g.ellipse(3, 11, 3, 5, '#166534');
      // Fierce toothy predatory jaw
      g.rect(28, 10, 7, 3, '#15803d');
      g.set(30, 11, '#ffffff');
      g.set(32, 11, '#ffffff');
      g.set(34, 11, '#ffffff');
      // Gold monocle
      g.circle(26, 9, 1, '#facc15');
      g.set(26, 9, INK);
      // Dapper black silk top hat with red ribbon
      g.rect(23, 2, 7, 5, '#0f172a');
      g.rect(22, 6, 9, 1, '#0f172a'); // brim
      g.line(23, 5, 29, 5, '#ef4444'); // red silk ribbon
      // Smug smoking cigar
      g.rect(34, 12, 2, 1, '#78350f');
      g.set(36, 12, '#ef4444'); // burning ember
      g.set(37, 11, '#cbd5e1'); // curly smoke
      g.set(36, 10, '#94a3b8');
      break;
    }

    default: {
      // Clean fallback fusiform pixel fish
      g.ellipse(14, 9, 8, 4, '#38bdf8');
      g.line(8, 6, 19, 6, '#7dd3fc');
      g.line(8, 12, 19, 12, '#0284c7');
      g.ellipse(3, 9, 3, 5, '#0284c7');
      g.set(19, 8, INK);
      g.set(19, 7, '#ffffff');
      break;
    }
  }

  g.outline(INK);
  return g;
}

/**
 * Creates a mysterious silhouette version of a fish sprite for undiscovered compendium entries.
 */
export function drawFishSilhouette(speciesId: string): PixelGrid {
  const base = drawFish(speciesId);
  const sil = new PixelGrid(base.w, base.h);

  // Fill silhouette with dark mysterious midnight slate
  const SILHOUETTE_BODY = '#1e293b';
  const SILHOUETTE_GLOW = '#334155';

  for (let y = 0; y < base.h; y++) {
    for (let x = 0; x < base.w; x++) {
      if (base.get(x, y) !== null) {
        sil.set(x, y, SILHOUETTE_BODY);
      }
    }
  }

  // Outline with glowing slate
  sil.outline(SILHOUETTE_GLOW);

  // Put a glowing question mark in the center of the silhouette
  const cx = Math.floor(base.w / 2);
  const cy = Math.floor(base.h / 2);
  sil.set(cx, cy - 2, '#38bdf8');
  sil.set(cx + 1, cy - 2, '#38bdf8');
  sil.set(cx + 1, cy - 1, '#38bdf8');
  sil.set(cx, cy, '#38bdf8');
  sil.set(cx, cy + 2, '#38bdf8');

  return sil;
}

const fishIconCache = new Map<string, string>();

/**
 * All current UI surfaces use the same illustration as avatars and world textures.
 */
export function fishIcon(speciesId: string, scale = 4, silhouette = false): string {
  if (!silhouette && FISH_3D_ASSETS[speciesId] && loadedFishArt(speciesId)) {
    return FISH_3D_ASSETS[speciesId];
  }

  const key = `${speciesId}@scale=${scale}@${silhouette ? 'sil' : 'lit'}@${fishArtRevision(speciesId)}`;
  const hit = fishIconCache.get(key);
  if (hit) return hit;

  if (typeof document === 'undefined') return '';

  const { baseWidth, baseHeight } = fishRenderDimensions(speciesId);
  const canvas = getHDFishCanvas(
    speciesId,
    baseWidth * Math.max(scale, 16),
    baseHeight * Math.max(scale, 16),
    silhouette,
  );
  const url = canvas.toDataURL();
  fishIconCache.set(key, url);
  return url;
}

/**
 * Shared illustration canvas; PixelGrid is reserved for the explicit legacy avatar view.
 */
export function getHDFishCanvas(
  speciesId: string,
  width?: number,
  height?: number,
  silhouette = false,
): HTMLCanvasElement {
  const { baseWidth, baseHeight } = fishRenderDimensions(speciesId);
  const factor = Math.min((width ?? baseWidth * 12) / baseWidth, (height ?? baseHeight * 12) / baseHeight);
  const targetW = Math.max(1, Math.round(baseWidth * factor));
  const targetH = Math.max(1, Math.round(baseHeight * factor));
  const key = `${speciesId}:${targetW}:${targetH}:${silhouette}:${fishArtRevision(speciesId)}`;
  const hit = fishCanvasCache.get(key);
  if (hit) return hit;
  const asset = loadedFishArt(speciesId);
  if (asset) {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const fit = Math.min(canvas.width / asset.naturalWidth, canvas.height / asset.naturalHeight);
    const w = asset.naturalWidth * fit;
    const h = asset.naturalHeight * fit;
    ctx.drawImage(asset, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    if (silhouette) {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#253849';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    cacheFishCanvas(key, canvas);
    return canvas;
  }
  void loadFishArt(speciesId);
  const canvas = paintFishIllustration(speciesId, targetW, targetH, silhouette);
  cacheFishCanvas(key, canvas);
  return canvas;
}

const fishCanvasCache = new Map<string, HTMLCanvasElement>();
function cacheFishCanvas(key: string, canvas: HTMLCanvasElement) {
  if (fishCanvasCache.size >= 256) fishCanvasCache.delete(fishCanvasCache.keys().next().value!);
  fishCanvasCache.set(key, canvas);
}

/**
 * Compatibility helper returning data URL for callers expecting getHDFishDataUrl.
 */
export function getHDFishDataUrl(
  speciesId: string,
  width?: number,
  height?: number,
  silhouette = false,
): string {
  return getHDFishCanvas(speciesId, width, height, silhouette).toDataURL();
}

/**
 * Compatibility helper for direct canvas drawing.
 */
export function drawHDFish(
  ctx: CanvasRenderingContext2D,
  speciesId: string,
  width: number,
  height: number,
  isSilhouette = false,
) {
  const canvas = getHDFishCanvas(speciesId, width, height, isSilhouette);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(canvas, (width - canvas.width) / 2, (height - canvas.height) / 2);
  ctx.restore();
}
