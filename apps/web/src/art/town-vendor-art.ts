import type Phaser from 'phaser';

/**
 * 🎨 Neo-Retro 16-Bit Deluxe (Style B) Street Food Vendor Graphics
 * Inspired by Octopath Traveler, Sea of Stars, and classic 16-bit JRPGs:
 * - 1 : 3.5 Realistic Semi-Chibi Proportions (Sleek ~40px stature)
 * - 5-Tier Shading: Specular Highlight -> Midtone -> Core Shadow -> Occlusion -> Rim Light
 * - Dynamic Underlighting & Charcoal Embers (Under-chin glow from brazier, floating ember sparks)
 * - 16-Bit Metallic Specular Sheen (Brushed stainless steel, brass rivets, chrome spokes)
 * - Authentic Vietnamese Cultural Street Food Crafting:
 *   * Variant 0: Cô Lan · Bánh mì nóng giòn (Crispy scored baguettes, pickled veggies, pate, chili sauce)
 *   * Variant 1: Chú Tư · Cà phê phin dạo (Dual aluminum dripping phins, condensed milk layers, ice chest, tweed flat cap)
 *   * Variant 2: Dì Sáu · Trái cây miền Tây (Tiered woven bamboo trays, mangoes, dragonfruit, guavas, Tây Ninh chili salt)
 *   * Variant 3: Anh Bình · Kem que dạo (Cyan metallic insulated icebox, chrome padlock latch, multi-flavor popsicles)
 *   * Variant 4: Cô Hạnh · Hoa tươi Đồng Nai (Wicker flower baskets, blooming lotus, marigolds, red velvet roses)
 *   * Variant 5: Bác Năm · Bắp luộc & khoai nướng (Stainless vat with specular streak, glowing brazier with embers & underlighting, golden cobs, purple yams, scallion oil jar)
 */

interface VendorColorTheme {
  frame: number;
  frameLight: number;
  frameShadow: number;
  outfit: number;
  outfitLight: number;
  outfitShadow: number;
  outfitDeep: number;
  pants: number;
  pantsLight: number;
  hatKind: 'non_la' | 'flat_cap' | 'sun_cap';
  skin: number;
  skinLight: number;
  skinShadow: number;
  underlight: number;
}

const THEMES: VendorColorTheme[] = [
  // 0: Cô Lan · Bánh mì (Terracotta coral Áo bà ba, emerald bike)
  {
    frame: 0x15803d,
    frameLight: 0x4ade80,
    frameShadow: 0x14532d,
    outfit: 0xea580c,
    outfitLight: 0xfb923c,
    outfitShadow: 0x9a3412,
    outfitDeep: 0x431407,
    pants: 0x1e293b,
    pantsLight: 0x334155,
    hatKind: 'non_la',
    skin: 0xfed7aa,
    skinLight: 0xffedd5,
    skinShadow: 0xfba76c,
    underlight: 0xfde047,
  },
  // 1: Chú Tư · Cà phê (Cream vintage vest & rolled-sleeve shirt, navy bike)
  {
    frame: 0x1e3a8a,
    frameLight: 0x60a5fa,
    frameShadow: 0x172554,
    outfit: 0xfef3c7,
    outfitLight: 0xfffbeb,
    outfitShadow: 0xd97706,
    outfitDeep: 0x78350f,
    pants: 0x334155,
    pantsLight: 0x475569,
    hatKind: 'flat_cap',
    skin: 0xfcd34d,
    skinLight: 0xfef08a,
    skinShadow: 0xd97706,
    underlight: 0xfbbf24,
  },
  // 2: Dì Sáu · Trái cây (Warm amber-gold Áo bà ba, bronze bike)
  {
    frame: 0x78350f,
    frameLight: 0xb45309,
    frameShadow: 0x451a03,
    outfit: 0xf59e0b,
    outfitLight: 0xfde047,
    outfitShadow: 0xb45309,
    outfitDeep: 0x78350f,
    pants: 0x0f172a,
    pantsLight: 0x1e293b,
    hatKind: 'non_la',
    skin: 0xfed7aa,
    skinLight: 0xffedd5,
    skinShadow: 0xfba76c,
    underlight: 0xfde047,
  },
  // 3: Anh Bình · Kem (Pastel cyan metallic polo, sky blue bike)
  {
    frame: 0x0284c7,
    frameLight: 0x38bdf8,
    frameShadow: 0x075985,
    outfit: 0x0284c7,
    outfitLight: 0x38bdf8,
    outfitShadow: 0x0369a1,
    outfitDeep: 0x0c4a6e,
    pants: 0x1e293b,
    pantsLight: 0x334155,
    hatKind: 'sun_cap',
    skin: 0xfed7aa,
    skinLight: 0xffedd5,
    skinShadow: 0xfba76c,
    underlight: 0xbae6fd,
  },
  // 4: Cô Hạnh · Hoa tươi (Lotus magenta Áo bà ba, forest green bike)
  {
    frame: 0x047857,
    frameLight: 0x34d399,
    frameShadow: 0x064e3b,
    outfit: 0xdb2777,
    outfitLight: 0xf472b6,
    outfitShadow: 0x9d174d,
    outfitDeep: 0x500724,
    pants: 0x1e293b,
    pantsLight: 0x334155,
    hatKind: 'non_la',
    skin: 0xfef08a,
    skinLight: 0xfffbeb,
    skinShadow: 0xf59e0b,
    underlight: 0xfbcfe8,
  },
  // 5: Bác Năm · Bắp (Earth olive work tunic, vintage roadster charcoal bike)
  {
    frame: 0x374151,
    frameLight: 0x9ca3af,
    frameShadow: 0x1f2937,
    outfit: 0x4d7c0f,
    outfitLight: 0x84cc16,
    outfitShadow: 0x365314,
    outfitDeep: 0x1a2e05,
    pants: 0x1e293b,
    pantsLight: 0x334155,
    hatKind: 'non_la',
    skin: 0xfcd34d,
    skinLight: 0xfef08a,
    skinShadow: 0xd97706,
    underlight: 0xf97316, // Rich ember underlight from charcoal fire!
  },
];

export function paintDetailedVendor(
  g: Phaser.GameObjects.Graphics,
  variant: number,
  moving: boolean,
  dir: number,
  time: number,
  phase: number,
) {
  g.clear();
  // Face orientation: East (facing right) as base coordinate, mirror for West
  g.setScale(dir === 1 ? -1 : 1, 1);

  const t = THEMES[variant % THEMES.length]!;

  const rect = (col: number, x: number, y: number, w: number, h: number) => {
    g.fillStyle(col).fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // =========================================================================
  // 1. BICYCLE HARDWARE: 16-BIT CHROME RIMS, SPOKES & TIRES
  // =========================================================================
  const wheelAngle = moving ? (phase * Math.PI) / 2 : 0;
  for (const wx of [-21, 19]) {
    // Outer tire rubber (deep slate rim with tire tread occlusion)
    g.lineStyle(2, 0x090d16).strokeCircle(wx, -8, 8.5);
    // Inner metallic rim highlight (dual-tone chrome)
    g.lineStyle(1, 0xcbd5e1).strokeCircle(wx, -8, 7.5);
    g.lineStyle(1, 0x64748b).strokeCircle(wx, -8, 6.5);

    // Chrome center axle hub with brass locknut
    rect(0x0f172a, wx - 2, -10, 4, 4);
    rect(0xf8fafc, wx - 1, -9, 2, 2);
    rect(0xd97706, wx, -9, 1, 1);

    // 8 finely detailed 16-bit rotating chrome spokes
    g.lineStyle(1, 0xf1f5f9, 0.85);
    for (let s = 0; s < 4; s++) {
      const a = wheelAngle + (s * Math.PI) / 4;
      const cos = Math.cos(a) * 6.5;
      const sin = Math.sin(a) * 6.5;
      g.lineBetween(wx - cos, -8 - sin, wx + cos, -8 + sin);
    }

    // Curved steel mudguard with chrome rim highlight
    g.lineStyle(2, 0x334155).strokeCircle(wx, -8, 10);
    g.lineStyle(1, 0xf8fafc, 0.9).lineBetween(wx - 7, -16, wx + 7, -16);
  }

  // =========================================================================
  // 2. VINTAGE ROADSTER TWIN-TUBE FRAME & RUNNING GEAR
  // =========================================================================
  // Deep shadow under tubes
  g.lineStyle(3, t.frameShadow);
  g.lineBetween(-21, -8, -2, -8); // Chain stay
  g.lineBetween(-21, -8, 0, -23); // Seat stay
  g.lineBetween(-2, -8, 0, -23); // Seat tube
  g.lineBetween(-2, -8, 15, -23); // Down tube
  g.lineBetween(0, -21, 15, -23); // Top tube
  g.lineBetween(15, -23, 19, -8); // Front fork

  // Enamel metallic main coat
  g.lineStyle(2, t.frame);
  g.lineBetween(-21, -8, -2, -8);
  g.lineBetween(-21, -8, 0, -23);
  g.lineBetween(-2, -8, 0, -23);
  g.lineBetween(-2, -8, 15, -23);
  g.lineBetween(0, -21, 15, -23);
  g.lineBetween(15, -23, 19, -8);

  // Specular rim-light along top tube & seat stays
  g.lineStyle(1, t.frameLight).lineBetween(1, -21, 14, -23);
  g.lineStyle(1, t.frameLight).lineBetween(-19, -9, 0, -22);

  // Brass frame lug joints (classic roadster luxury touch)
  rect(0xd97706, 14, -24, 2, 2);
  rect(0xfde047, 15, -24, 1, 1);
  rect(0xd97706, -1, -22, 2, 2);

  // Chrome handlebar stem & curved handlebar with leather grips & bell
  g.lineStyle(2, 0x94a3b8).lineBetween(15, -23, 15, -29);
  g.lineStyle(1, 0xf8fafc).lineBetween(15, -29, 18, -31);
  rect(0x451a03, 16, -32, 5, 2); // Hand-stitched leather handlebar grip
  rect(0xd97706, 14, -30, 2, 2); // Vintage brass bell
  rect(0xfef08a, 14, -31, 1, 1); // Bell chime reflection
  // Chrome headlight lantern on front fork stem
  rect(0x475569, 17, -24, 3, 3);
  rect(0xfef08a, 19, -24, 2, 3); // Yellow lens glow

  // Sprung leather saddle with dual copper coil suspension
  rect(0x27170a, -5, -26, 9, 4);
  rect(0x572608, -4, -25, 8, 3);
  rect(0x9a3412, -3, -25, 6, 1); // Saddle leather sheen
  rect(0xd97706, -3, -22, 2, 2); // Left copper coil spring
  rect(0xd97706, 1, -22, 2, 2); // Right copper coil spring

  // 16-bit pedal crankset with 5-arm spider ring & pedaling animation
  const pedalPhase = moving ? phase : 0;
  const crankOffsets = [
    { px: 2, py: 5, ox: -2, oy: -5 },
    { px: 5, py: 0, ox: -5, oy: 0 },
    { px: -2, py: -5, ox: 2, oy: 5 },
    { px: -5, py: 0, ox: 5, oy: 0 },
  ][pedalPhase]!;

  g.lineStyle(1, 0x94a3b8).lineBetween(-2, -8, -2 + crankOffsets.px, -8 + crankOffsets.py);
  rect(0x0f172a, -3 + crankOffsets.px, -9 + crankOffsets.py, 4, 2);
  rect(0xf97316, -2 + crankOffsets.px, -9 + crankOffsets.py, 2, 1); // Amber pedal reflector!

  // =========================================================================
  // 3. REAR DELUXE CARGO RACK & WOODEN/GLASS ARTISAN CABINET
  // =========================================================================
  // Heavy-duty tubular chrome cargo rack struts
  g.lineStyle(2, 0x1e293b);
  g.lineBetween(-21, -8, -36, -18);
  g.lineBetween(-2, -8, -9, -18);
  rect(0x0f172a, -38, -19, 32, 3);
  rect(0x475569, -37, -18, 30, 2); // Chrome cargo rail

  // Solid Teak / Mahogany Wood Food Cabinet (Rich 5-tier wood gradient)
  rect(0x1c120c, -38, -36, 30, 18); // Core occlusion border
  rect(0x451a03, -37, -35, 28, 16); // Teak base
  rect(0x78350f, -36, -34, 26, 14); // Midtone warm wood
  rect(0xa16207, -36, -34, 26, 2); // Polished top bevel
  rect(0x27170a, -36, -26, 26, 1); // Drawer partition seam
  rect(0xd97706, -25, -25, 4, 1); // Brass drawer pull handle

  // Brass protective corner brackets
  rect(0xd97706, -37, -35, 3, 3);
  rect(0xfde047, -37, -35, 1, 1);
  rect(0xd97706, -12, -35, 3, 3);
  rect(0xfde047, -11, -35, 1, 1);
  rect(0xd97706, -37, -21, 3, 3);
  rect(0xd97706, -12, -21, 3, 3);

  // Beveled Glass Display Case (Upper tier y: -36..-21)
  rect(0x090d16, -37, -36, 28, 1); // Glass frame top
  rect(0x090d16, -37, -21, 28, 1); // Glass frame bottom
  rect(0x090d16, -37, -36, 1, 16); // Left edge
  rect(0x090d16, -10, -36, 1, 16); // Right edge

  // Multi-tier diagonal glass specular reflections
  g.fillStyle(0xffffff, 0.35);
  g.fillTriangle(-36, -35, -31, -35, -36, -24);
  g.fillStyle(0xffffff, 0.18);
  g.fillTriangle(-28, -35, -23, -35, -36, -20);
  g.fillStyle(0x38bdf8, 0.22); // Sky reflection hint
  g.fillTriangle(-20, -35, -16, -35, -26, -21);

  // Scalloped Cloth Canopy with brass eyelets
  rect(0x0f172a, -40, -38, 34, 4);
  const canopyCols = [0xb91c1c, 0xfef08a, 0xb91c1c, 0xfef08a, 0xb91c1c, 0xfef08a, 0xb91c1c, 0xfef08a];
  for (let c = 0; c < 8; c++) {
    rect(canopyCols[c]!, -39 + c * 4, -38, 4, 3);
    rect(canopyCols[c]!, -39 + c * 4 + 1, -35, 2, 2); // Scalloped fringe
    rect(0xd97706, -39 + c * 4 + 1, -38, 1, 1); // Brass eyelet
  }

  // =========================================================================
  // 4. ARTISAN WARES & DELUXE VIETNAMESE CULINARY PROPS (16-BIT DETAIL)
  // =========================================================================
  if (variant === 5) {
    // =======================================================================
    // 🌽 BÁC NĂM · BẮP LUỘC & KHOAI NƯỚNG (NEO-RETRO DELUXE 16-BIT)
    // =======================================================================
    // Stainless Steel Steaming Corn Vat with Multi-Shade Specular Gradient
    rect(0x0f172a, -35, -34, 18, 14); // Vat silhouette
    rect(0x334155, -34, -33, 16, 12); // Base metal shadow
    rect(0x64748b, -33, -33, 14, 12); // Brushed metal midtone
    rect(0x94a3b8, -32, -33, 4, 12); // Light streak
    rect(0xf8fafc, -30, -33, 2, 12); // Specular reflection streak
    rect(0xcbd5e1, -29, -33, 2, 12);

    // Chrome pot rim and brass handles
    rect(0xe2e8f0, -35, -34, 18, 2);
    rect(0xd97706, -36, -29, 2, 3); // Left brass handle
    rect(0xfde047, -36, -28, 1, 1);
    rect(0xd97706, -17, -29, 2, 3); // Right brass handle
    rect(0xfde047, -17, -28, 1, 1);

    // Glowing Charcoal Brazier with Pulsating Embers & Underlighting
    const emberPulse = Math.sin(time / 140) * 0.3 + 0.7;
    rect(0x18181b, -32, -21, 12, 4); // Brazier iron base
    rect(0x7f1d1d, -31, -20, 10, 3);
    rect(0xd97706, -30, -20, 8, 2);
    rect(0xf97316, -29, -20, Math.round(6 * emberPulse), 2); // Dynamic pulse
    rect(0xfef08a, -28, -20, 2, 1); // White-hot core

    // DYNAMIC UNDERLIGHTING GLOW OVER BASKET & TIRES
    g.fillStyle(0xf97316, 0.25 * emberPulse).fillEllipse(-26, -20, 20, 8);

    // FLOATING 16-BIT EMBER SPARK PARTICLES (Octopath Traveler style)
    for (let sp = 0; sp < 4; sp++) {
      const sparkPhase = ((time / 280 + sp * 0.85) % 3) / 3;
      const sparkY = Math.round(-21 - sparkPhase * 22);
      const sparkX = Math.round(-26 + (sp - 1.5) * 5 + Math.sin(time / 200 + sp * 3) * 3);
      const sparkCols = [0xfef08a, 0xfba76c, 0xf97316, 0xef4444];
      const sparkCol = sparkCols[sp % 4]!;
      g.fillStyle(sparkCol, Math.max(0, 0.9 * (1 - sparkPhase))).fillRect(sparkX, sparkY, 1, 1);
    }

    // Plump Golden Sweet Corn Cobs in Steamer (with roasted caramel marks)
    // Left corn cob
    rect(0x15803d, -33, -32, 2, 8); // Fresh green husk leaf
    rect(0x84cc16, -32, -32, 1, 7);
    rect(0xfacc15, -31, -32, 4, 7); // Plump golden kernels
    rect(0xfef08a, -30, -32, 2, 2); // Highlight
    rect(0x78350f, -31, -28, 3, 1); // Toasted char mark
    rect(0x78350f, -30, -26, 2, 1);

    // Right corn cob
    rect(0x15803d, -26, -32, 2, 8);
    rect(0x84cc16, -25, -32, 1, 7);
    rect(0xfacc15, -24, -32, 4, 7);
    rect(0xfef08a, -23, -32, 2, 2);
    rect(0x78350f, -24, -29, 3, 1);

    // Roasted Purple Sweet Potatoes on Warming Tray
    rect(0x3b0764, -16, -28, 5, 7);
    rect(0x7e22ce, -15, -27, 4, 5);
    rect(0xc084fc, -15, -26, 2, 2); // Purple yam highlight
    rect(0xfbbf24, -14, -24, 2, 2); // Golden sweet center peeking through cracked skin

    // Seasoning Station: Glistening Scallion Oil Jar, Chili & Tongs
    rect(0x0f172a, -16, -35, 4, 6); // Glass jar
    rect(0x15803d, -15, -34, 3, 4); // Green scallion oil
    rect(0x4ade80, -15, -33, 1, 2); // Oil gloss reflection
    rect(0xdc2626, -11, -33, 3, 4); // Chili bowl
    rect(0xfef08a, -10, -32, 1, 1);
    rect(0x94a3b8, -13, -36, 1, 5); // Stainless tongs

    // MULTI-TIER 16-BIT TRANSLUCENT BILLOWING STEAM
    for (let s = 0; s < 4; s++) {
      const steamPhase = ((time / 360 + s * 1.1) % 4) / 4;
      const steamY = Math.round(-34 - steamPhase * 18);
      const steamX = Math.round(-25 + s * 4 + Math.sin(time / 220 + s * 2.5) * 3);
      const steamAlpha = Math.max(0, 0.75 * (1 - steamPhase));
      const steamRadius = Math.max(1, Math.round(1.5 + steamPhase * 2.5));
      g.fillStyle(0xf8fafc, steamAlpha).fillCircle(steamX, steamY, steamRadius);
      g.fillStyle(0xe2e8f0, steamAlpha * 0.5).fillCircle(steamX + 1, steamY, steamRadius + 1);
    }
  } else if (variant === 0) {
    // =======================================================================
    // 🥖 CÔ LAN · BÁNH MÌ NÓNG GIÒN (NEO-RETRO DELUXE 16-BIT)
    // =======================================================================
    // 3 Golden Crust Baguettes with Crisp Diagonal Cuts
    for (let b = 0; b < 3; b++) {
      const bx = -33 + b * 6;
      rect(0x451a03, bx - 1, -32, 6, 10);
      rect(0xb45309, bx, -31, 5, 8);
      rect(0xf59e0b, bx + 1, -30, 3, 6);
      rect(0xfef08a, bx + 2, -29, 1, 4); // Golden crisp crust highlight
      // Diagonal score cuts
      rect(0x451a03, bx + 1, -29, 3, 1);
      rect(0x451a03, bx + 1, -26, 3, 1);
    }
    // Condiment jars: pickled daikon & carrot, liver pate, chili sauce
    rect(0x78350f, -15, -27, 4, 4); // Rich brown pate tray
    rect(0xfb923c, -15, -33, 3, 5); // Pickled carrot jar
    rect(0xffedd5, -14, -32, 1, 3); // Pickled daikon slice
    rect(0x16a34a, -11, -32, 2, 5); // Fresh cucumber spears & cilantro
    rect(0xdc2626, -14, -37, 2, 4); // Red chili sauce bottle
    rect(0xfacc15, -14, -38, 2, 1); // Yellow twist cap
  } else if (variant === 1) {
    // =======================================================================
    // ☕ CHÚ TƯ · CÀ PHÊ PHIN DẠO (NEO-RETRO DELUXE 16-BIT)
    // =======================================================================
    // Dual Traditional Stainless Phins with dripping coffee animation
    for (let p = 0; p < 2; p++) {
      const px = -33 + p * 9;
      // Phin filter body with metallic gradient
      rect(0x1e293b, px - 1, -35, 7, 8);
      rect(0x64748b, px, -34, 5, 6);
      rect(0xcbd5e1, px + 1, -34, 2, 6); // Chrome specular streak
      rect(0xf8fafc, px + 2, -35, 1, 1); // Lid knob
      // Glass faceted cup below
      rect(0x0f172a, px, -27, 5, 6);
      rect(0x38bdf8, px, -27, 1, 5); // Glass edge reflection
      rect(0x18181b, px + 1, -26, 3, 3); // Dark roasted coffee
      rect(0xfef08a, px + 1, -23, 3, 2); // Sweet condensed milk bottom layer
      // Coffee drip drop
      const dripPhase = (time / 190 + p * 1.5) % 3;
      if (dripPhase < 1.5) {
        rect(0x18181b, px + 2, -28 + Math.round(dripPhase * 2), 1, 1);
      }
    }
    // Condensed milk can (Lon Ông Thọ)
    rect(0xb91c1c, -15, -30, 5, 7);
    rect(0xfef08a, -15, -29, 5, 1); // Gold rim
    rect(0xf8fafc, -15, -27, 5, 2); // White label banner
    // Blue insulated ice chest with chrome latch
    rect(0x0369a1, -16, -36, 6, 5);
    rect(0x38bdf8, -15, -35, 4, 3);
    rect(0xf8fafc, -13, -33, 1, 1);
  } else if (variant === 2) {
    // =======================================================================
    // 🥭 DÌ SÁU · TRÁI CÂY MIỀN TÂY (NEO-RETRO DELUXE 16-BIT)
    // =======================================================================
    // Woven bamboo fruit trays with rattan rim
    rect(0x451a03, -35, -26, 24, 3);
    rect(0xb45309, -34, -25, 22, 2);
    // Cat Chu Mangoes with golden-red blush
    rect(0xca8a04, -34, -32, 7, 6);
    rect(0xfacc15, -33, -31, 5, 4);
    rect(0xfb923c, -31, -30, 2, 2); // Sunset blush
    rect(0x15803d, -34, -33, 2, 1); // Stem leaf
    // Crisp Guavas
    rect(0x14532d, -26, -31, 6, 5);
    rect(0x22c55e, -25, -30, 4, 3);
    rect(0x86efac, -24, -29, 1, 1);
    // Dragonfruit with magenta scales & green tips
    rect(0x831843, -19, -32, 6, 6);
    rect(0xdb2777, -18, -31, 4, 4);
    rect(0x22c55e, -19, -33, 2, 2); // Scale green tip
    rect(0x22c55e, -14, -31, 2, 2);
    // Chili shrimp salt bowl
    rect(0xdc2626, -13, -28, 4, 4);
    rect(0xffedd5, -12, -27, 2, 2); // Salt crystals
  } else if (variant === 3) {
    // =======================================================================
    // 🍦 ANH BÌNH · KEM QUE DẠO (NEO-RETRO DELUXE 16-BIT)
    // =======================================================================
    // Brushed metallic cyan insulated ice chest
    rect(0x0c4a6e, -35, -35, 24, 15);
    rect(0x0284c7, -34, -34, 22, 13);
    rect(0x38bdf8, -34, -34, 22, 3); // Metal lid highlight
    rect(0xf8fafc, -34, -32, 22, 1); // Specular reflection
    rect(0xe2e8f0, -24, -30, 3, 4); // Chrome heavy padlock latch
    rect(0x0f172a, -23, -29, 1, 2); // Keyhole
    // Multi-flavor popsicles
    rect(0x15803d, -31, -38, 2, 6); // Matcha green tea
    rect(0xdc2626, -27, -38, 2, 6); // Sweet strawberry
    rect(0x451a03, -23, -38, 2, 6); // Rich chocolate fudge
    rect(0xfacc15, -19, -38, 2, 6); // Tropical durian/banana
    rect(0xb45309, -15, -37, 4, 6); // Waffle cone
    rect(0xfef08a, -14, -39, 2, 3); // Vanilla scoop
  } else if (variant === 4) {
    // =======================================================================
    // 🌸 CÔ HẠNH · HOA TƯƠI ĐỒNG NAI (NEO-RETRO DELUXE 16-BIT)
    // =======================================================================
    // Wicker basket with delicate woven reed crosshatch
    rect(0x451a03, -36, -28, 26, 8);
    rect(0x78350f, -35, -27, 24, 6);
    rect(0xb45309, -34, -26, 22, 4);
    // Lotus Blossoms (Hoa sen hồng & nhụy vàng)
    rect(0x9d174d, -34, -35, 6, 7);
    rect(0xf472b6, -33, -34, 4, 5);
    rect(0xfef08a, -32, -32, 2, 2); // Golden stamen
    // Golden Marigolds (Cúc vạn thọ)
    rect(0xb45309, -27, -36, 7, 7);
    rect(0xf59e0b, -26, -35, 5, 5);
    rect(0xfef08a, -25, -34, 2, 2);
    // Velvet Red Roses (Hoa hồng nhung)
    rect(0x7f1d1d, -19, -34, 6, 6);
    rect(0xef4444, -18, -33, 4, 4);
    rect(0xf8fafc, -17, -32, 1, 1); // Dew drop twinkle!
    // Fern greenery & baby's breath
    rect(0x14532d, -35, -31, 3, 4);
    rect(0xf8fafc, -21, -36, 1, 1);
  }

  // =========================================================================
  // 5. THE STREET VENDOR: NEO-RETRO 1:3.5 DELUXE PROPORTIONS
  // =========================================================================
  const bob = moving ? phase % 2 : 0;

  // Legs & Dynamic Pedaling Cadence (16-bit multi-shade trousers)
  const legRightY = crankOffsets.py;
  const legLeftY = -crankOffsets.py;

  // Right leg (front/visible)
  rect(0x0f172a, -3, -20, 5, 9 + legRightY);
  rect(t.pants, -2, -19, 4, 8 + legRightY);
  rect(t.pantsLight, -1, -19, 2, 4); // Thigh highlight
  rect(0x0f172a, -4 + crankOffsets.px, -11 + legRightY, 5, 3); // Black rubber sandal
  rect(t.skinShadow, -3 + crankOffsets.px, -13 + legRightY, 3, 2); // Ankle

  // Left leg (behind bicycle frame)
  rect(0x090d16, -5, -19, 4, 8 + legLeftY);
  rect(t.pants, -4, -18, 3, 7 + legLeftY);
  rect(0x090d16, -6 + crankOffsets.ox, -11 + legLeftY, 4, 2);

  // Torso / Áo bà ba / Shirt (1:3.5 Sleek Height y: -35..-20)
  const torsoY = -35 - bob;
  rect(0x090d16, -1, torsoY - 1, 12, 16); // Deep silhouette outline
  rect(t.outfitDeep, 0, torsoY, 10, 14); // Deep crease shadow
  rect(t.outfitShadow, 1, torsoY, 9, 13);
  rect(t.outfit, 2, torsoY, 7, 12); // Rich midtone
  rect(t.outfitLight, 3, torsoY, 4, 3); // Shoulder highlight

  // Traditional checkered scarf (Khăn rằn Nam Bộ)
  rect(0x0f172a, 3, torsoY + 1, 7, 3);
  rect(0xf8fafc, 4, torsoY + 1, 2, 2);
  rect(0x1e293b, 6, torsoY + 1, 2, 2);
  rect(0xf8fafc, 7, torsoY + 3, 2, 4);

  // Arms gripping handlebars (16-bit muscle definition & rolled sleeves)
  rect(t.outfit, 6, torsoY + 2, 4, 5); // Rolled sleeve
  rect(t.skinShadow, 8, torsoY + 6, 4, 4); // Forearm shadow
  rect(t.skin, 9, torsoY + 6, 3, 3);
  rect(t.skinLight, 9, torsoY + 6, 2, 1); // Muscle specular
  rect(0x090d16, 12, torsoY + 7, 2, 2); // Fingers around grip

  // Head & Face (Octopath 16-bit styling y: -45..-36)
  const headY = -45 - bob;
  rect(0x090d16, 2, headY - 1, 10, 11);
  rect(t.skinShadow, 3, headY, 8, 9);
  rect(t.skin, 4, headY, 7, 8);
  rect(t.skinLight, 5, headY, 4, 3); // Forehead highlight

  // DYNAMIC UNDERLIGHTING ON FACE (Reflecting fire/warm ambient light from below)
  if (variant === 5) {
    rect(0xf97316, 4, headY + 7, 6, 1); // Amber-orange chin reflection
    rect(0xfb923c, 5, headY + 6, 4, 1);
  } else {
    rect(t.skinShadow, 4, headY + 7, 5, 1);
  }

  // Facial features: Expressive 16-bit eyes with iris, eyebrow & gentle blush
  rect(0x090d16, 7, headY + 1, 3, 1); // Eyebrow
  rect(0x090d16, 7, headY + 3, 2, 2); // Eye iris
  rect(0xf8fafc, 8, headY + 3, 1, 1); // Specular eye twinkle
  rect(0xf43f5e, 7, headY + 5, 2, 1); // Rosy blush
  rect(0x991b1b, 7, headY + 7, 2, 1); // Cheerful mouth

  // Bác Năm's distinctive refined silver mustache & beard
  if (variant === 5) {
    rect(0x94a3b8, 6, headY + 6, 4, 1);
    rect(0xf8fafc, 7, headY + 6, 2, 1);
    rect(0x64748b, 7, headY + 7, 2, 1); // Beard tuft
  }

  // Hair strands & hairline
  rect(0x18181b, 2, headY + 1, 3, 7);
  rect(0x18181b, 4, headY, 5, 2);

  // =========================================================================
  // 6. HEADGEAR: AUTHENTIC NÓN LÁ & HATS WITH 16-BIT CONICAL PROJECTION
  // =========================================================================
  if (t.hatKind === 'non_la') {
    // Elegant Vietnamese Nón Lá with bamboo ribs & underlighting on brim
    rect(0x090d16, 0, -45 - bob, 15, 2); // Base silhouette
    rect(0x78350f, 1, -46 - bob, 13, 2); // Bamboo weave rim
    rect(0xca8a04, 2, -48 - bob, 11, 2);
    rect(0xfacc15, 3, -50 - bob, 9, 2);
    rect(0xfde047, 4, -52 - bob, 7, 2);
    rect(0xfef08a, 5, -54 - bob, 5, 2); // Conical peak
    rect(0xffffff, 6, -55 - bob, 3, 1); // Apex tip

    // Fine bamboo rib lines
    rect(0x92400e, 7, -54 - bob, 1, 9);

    // Dynamic fire underlighting on underside of brim!
    if (variant === 5) {
      rect(0xf97316, 1, -45 - bob, 13, 1);
      rect(0xfde047, 4, -46 - bob, 7, 1);
    }

    // Crimson silk chinstrap (Quai nón lụa đỏ thắm)
    rect(0xdc2626, 4, headY + 6, 1, 4);
    rect(0xef4444, 5, headY + 9, 2, 1);
    rect(0xf8fafc, 5, headY + 9, 1, 1);
  } else if (t.hatKind === 'flat_cap') {
    // Tailored Tweed Flat Cap (Chú Tư)
    rect(0x090d16, 1, headY - 4, 11, 5);
    rect(0x334155, 2, headY - 3, 9, 3);
    rect(0x64748b, 3, headY - 3, 6, 1); // Wool texture highlight
    rect(0x1e293b, 9, headY - 1, 4, 2); // Front visor brim
    // Horn-rimmed glasses for Chú Tư
    rect(0x0f172a, 6, headY + 2, 4, 3);
    rect(0x38bdf8, 7, headY + 3, 2, 1); // Lens glass glare
  } else if (t.hatKind === 'sun_cap') {
    // Sporty Sun Cap (Anh Bình)
    rect(0x090d16, 1, headY - 4, 11, 5);
    rect(0xf8fafc, 2, headY - 3, 9, 3);
    rect(0x0284c7, 3, headY - 2, 7, 1); // Cyan athletic stripe
    rect(0xcbd5e1, 9, headY - 1, 4, 2); // Curved front visor
  }
}
