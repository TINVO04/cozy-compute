import { FARM_POIS, getFarmPlotRect } from '@cozy/game-data';
import { farmBuilding, paintFarmPen } from './farm-scenery';
import { mulberry } from './pixel';

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function oval(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number) {
  for (let dy = -Math.floor(ry); dy <= ry; dy++) {
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    rect(ctx, color, x - dx, y + dy, dx * 2 + 1, 1);
  }
}

/**
 * 1. Quầy Bán Hàng (Tiệm Nông Nghiệp Bác Sáu).
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintShopBacSau(): HTMLCanvasElement {
  const p = FARM_POIS.shop_bac_sau;
  return farmBuilding(p, 'TIỆM BÁC SÁU', 0xaf7057);
}

/**
 * 2. Nhà Kho Nông Sản Silo.
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintSiloWarehouse(): HTMLCanvasElement {
  const p = FARM_POIS.silo_warehouse;
  return farmBuilding(p, 'KHO NÔNG SẢN', 0x778767, true);
}

/**
 * 3. Chuồng Gà (Poultry Coop).
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintPoultryCoop(): HTMLCanvasElement {
  const p = FARM_POIS.poultry_coop;
  return paintFarmPen(p, '#ad7659', 'poultry');
}

/**
 * 4. Chuồng Heo (Pig Pen).
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintPigPen(): HTMLCanvasElement {
  const p = FARM_POIS.pig_pen;
  return paintFarmPen(p, '#b48069', 'pig');
}

/**
 * 5. Chuồng Cừu (Sheep & Goat Pen).
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintGoatPen(): HTMLCanvasElement {
  const p = FARM_POIS.goat_pen;
  return paintFarmPen(p, '#82916b', 'goat');
}

/**
 * 6. Chuồng Bò (Cattle Pasture).
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintCattlePasture(): HTMLCanvasElement {
  const p = FARM_POIS.cattle_pasture;
  return paintFarmPen(p, '#a47658', 'cattle');
}

/**
 * 7. Guồng Nước Sục Khí Ao Cá (Waterwheel Aerator).
 * Authentic rotating 4-paddle waterwheel aerator with water foam spray:
 * - Floating pontoons and drive shaft motor
 * - 4 aeration paddle blades throwing crystalline water droplets
 */
export function paintWaterwheelAerator(angle = 0): HTMLCanvasElement {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const cx = size / 2;
  const cy = size / 2;

  // 1. Water foam circle
  ctx.fillStyle = 'rgba(224, 242, 254, 0.7)';
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 16, 0, Math.PI * 2);
  ctx.fill();

  // 2. Rotating Wheel Hub & Paddles
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angle * Math.PI) / 180);

  // 4 Paddle blades
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    // Paddle spoke
    rect(ctx, '#0284c7', -2, -18, 4, 18);
    rect(ctx, '#38bdf8', -1, -18, 2, 18);
    // Perforated aeration paddle blade
    rect(ctx, '#f8fafc', -7, -22, 14, 6);
    rect(ctx, '#38bdf8', -6, -21, 12, 4);
    rect(ctx, '#ffffff', -4, -20, 2, 2);
    rect(ctx, '#ffffff', 2, -20, 2, 2);
  }

  // Center brass axis hub
  oval(ctx, '#0f172a', 0, 0, 6, 6);
  oval(ctx, '#ca8a04', 0, 0, 4, 4);
  oval(ctx, '#eed58c', 0, 0, 2, 2);
  ctx.restore();

  // 3. Spray droplets flung into air
  for (let d = 0; d < 8; d++) {
    const da = ((angle + d * 45) * Math.PI) / 180;
    const dr = 18 + ((d * 7) % 8);
    rect(ctx, '#ffffff', Math.round(cx + Math.cos(da) * dr), Math.round(cy + Math.sin(da) * dr), 2, 2);
  }

  return c;
}

/**
 * 7. Entrance Welcome Mat / Footstep Mat.
 * Woven rustic mat marking the doorway of farm buildings for clear navigation.
 */
export function paintWelcomeMat(width = 40, height = 18): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Outer drop shadow
  rect(ctx, 'rgba(15, 23, 42, 0.45)', 1, 2, width - 2, height - 2);

  // Wooden / woven rim
  rect(ctx, '#78350f', 0, 0, width, height - 1);
  rect(ctx, '#92400e', 1, 1, width - 2, height - 3);

  // Woven mat fabric interior (warm amber/golden-straw)
  rect(ctx, '#d97706', 2, 2, width - 4, height - 5);
  rect(ctx, '#f59e0b', 3, 3, width - 6, height - 7);

  // Diagonal woven texture
  for (let x = 4; x < width - 4; x += 4) {
    rect(ctx, '#b45309', x, 4, 1, height - 9);
    rect(ctx, '#fef08a', x + 1, 4, 1, 2);
  }

  // Welcoming border stitching
  rect(ctx, '#fef3c7', 3, 3, width - 6, 1);
  rect(ctx, '#78350f', 3, height - 5, width - 6, 1);

  // Footstep chevron / entry indicator in center
  const mx = Math.floor(width / 2);
  rect(ctx, '#451a03', mx - 2, 6, 4, 1);
  rect(ctx, '#451a03', mx - 4, 8, 8, 1);
  rect(ctx, '#fef3c7', mx - 1, 5, 2, 1);

  return c;
}

/**
 * 8. Dynamic Plot Crop Renderer.
 * Renders an individual 36-plot state with clean wooden borders, loamy soil and crops.
 */
export function paintPlotTile(
  isUnlocked: boolean,
  isWatered: boolean,
  cropId?: string,
  stage?: 'seed' | 'sprout' | 'blooming' | 'mature',
  _price?: number,
  variant = 0,
): HTMLCanvasElement {
  const { w, h } = getFarmPlotRect(0);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (!isUnlocked) {
    // Untilled meadow: grasses, daisies and stones, never fake harvestable crops.
    const rng = mulberry(variant * 91 + 412);
    rect(ctx, '#929466', 1, 2, w - 2, h - 3);
    rect(ctx, '#9faa70', 2, 3, w - 4, h - 5);
    for (let i = 0; i < 48; i++) {
      const x = 4 + rng() * (w - 9),
        y = 8 + rng() * (h - 13);
      const height = 3 + rng() * 5;
      rect(ctx, '#79935c', x, y - height, 1, height);
      rect(ctx, '#bcc887', x + 2, y - height - 1, 1, height);
      rect(ctx, '#d0d396', x - 1, y, 3, 1);
      if (i % 7 === 0) {
        rect(ctx, variant % 3 ? '#eee5c1' : '#c4b4d1', x - 1, y - height - 2, 3, 3);
        rect(ctx, '#e9c477', x, y - height - 1, 1, 1);
      }
    }
    for (let i = 0; i < 3; i++) {
      const x = 10 + rng() * 32,
        y = 12 + rng() * 22;
      oval(ctx, '#668455', x, y + 2, 7, 4);
      oval(ctx, '#91ae64', x - 1, y, 6, 4);
      oval(ctx, '#b6c97e', x - 3, y - 2, 3, 2);
    }
    if (variant % 3 === 0) {
      oval(ctx, '#92947a', 12, h - 9, 6, 3);
      oval(ctx, '#d5c9a7', 11, h - 11, 5, 3);
      rect(ctx, '#eee0ba', 8, h - 13, 5, 1);
    }

    // A quiet corner marker keeps unopened plots legible without 32 large signs.
    rect(ctx, '#b39a70', w - 12, h - 12, 7, 7);
    rect(ctx, '#6c5b40', w - 10, h - 15, 3, 4);
    return c;
  }

  // Raised wooden bed frame
  rect(ctx, '#73573f', 0, 0, w, h);
  rect(ctx, '#b19369', 1, 1, w - 2, h - 2);
  rect(ctx, '#e2c497', 2, 2, w - 4, 2); // top highlight

  for (const x of [2, w - 5])
    for (const y of [2, h - 5]) {
      rect(ctx, '#e5ce9d', x, y, 3, 3);
      rect(ctx, '#806348', x + 1, y + 1, 1, 1);
    }

  // Soil
  const soilColor = isWatered ? '#523d2e' : '#927354';
  const ridgeColor = isWatered ? '#6b503e' : '#ac8a60';
  rect(ctx, soilColor, 3, 3, w - 6, h - 6);

  // Furrows with rich loamy texture
  for (let y = 8; y < h - 8; y += 8) {
    rect(ctx, ridgeColor, 6, y, w - 12, 3);
    if (isWatered) {
      // Shimmering moist gleam & reflections
      rect(ctx, '#8bbcb0', 12 + ((y * 7) % (w - 24)), y + 1, 8, 1);
      rect(ctx, '#cffafe', 14 + ((y * 7) % (w - 24)), y + 1, 3, 1);
    }
  }

  // Crop stage rendering
  if (cropId && stage) {
    const cx = w / 2;
    const cy = h / 2 + 2;

    // ------------------------------------------------------------------------
    // STAGE 1: SEED & GERMINATING SEEDLINGS (Species-specific seedbeds)
    // ------------------------------------------------------------------------
    if (stage === 'seed') {
      if (cropId.includes('rice') || cropId.includes('lua')) {
        // Wet paddy flooded furrow with submerged seed and tender lime-green coleoptile
        rect(ctx, '#365314', cx - 5, cy + 2, 10, 2);
        for (let i = -1; i <= 1; i++) {
          const px = cx + i * 4;
          rect(ctx, '#14532d', px, cy - 2, 1, 4);
          rect(ctx, '#84cc16', px, cy - 4, 1, 3);
          rect(ctx, '#bef264', px - (i === 1 ? -1 : 1), cy - 5, 2, 1);
          rect(ctx, '#ffffff', px, cy - 5, 1, 1); // water drop sparkle
        }
      } else if (cropId.includes('watermelon') || cropId.includes('pumpkin')) {
        // Raised round mound with fat dual cotyledon leaves spread open
        oval(ctx, '#3e2723', cx, cy + 2, 10, 4);
        rect(ctx, '#4d7c0f', cx - 1, cy - 2, 2, 4);
        oval(ctx, '#65a30d', cx - 5, cy - 3, 5, 3); // wide left cotyledon
        oval(ctx, '#84cc16', cx + 5, cy - 3, 5, 3); // wide right cotyledon
        rect(ctx, '#a3e635', cx - 1, cy - 5, 2, 2); // tiny emerging true leaf
        rect(ctx, '#ffffff', cx - 3, cy - 4, 1, 1);
      } else if (cropId.includes('corn') || cropId.includes('sugarcane')) {
        // Sturdy upright spear shoot emerging from soil mound
        rect(ctx, '#3e2723', cx - 4, cy + 1, 8, 2);
        rect(ctx, '#166534', cx - 1, cy - 6, 2, 8);
        rect(ctx, '#4ade80', cx, cy - 7, 1, 6);
        rect(ctx, '#bef264', cx - 1, cy - 8, 2, 2);
        rect(ctx, '#ffffff', cx + 1, cy - 7, 1, 1);
      } else if (cropId.includes('carrot')) {
        // Fine delicate twin feathery thread sprouts in furrow
        rect(ctx, '#3e2723', cx - 3, cy + 1, 6, 2);
        rect(ctx, '#15803d', cx - 2, cy - 3, 1, 4);
        rect(ctx, '#15803d', cx + 2, cy - 4, 1, 5);
        rect(ctx, '#4ade80', cx - 3, cy - 4, 2, 1);
        rect(ctx, '#4ade80', cx + 2, cy - 5, 2, 1);
      } else if (cropId.includes('grape')) {
        // Wooden marker peg with delicate climber sprout
        rect(ctx, '#78350f', cx - 3, cy - 5, 2, 8);
        rect(ctx, '#15803d', cx - 1, cy - 3, 2, 4);
        oval(ctx, '#84cc16', cx + 3, cy - 4, 3, 2);
        rect(ctx, '#bef264', cx, cy - 5, 1, 2);
      } else if (cropId.includes('dragonfruit') || cropId.includes('pineapple')) {
        // Spiky succulent seedling rosette
        rect(ctx, '#3e2723', cx - 3, cy + 1, 6, 2);
        rect(ctx, '#166534', cx - 1, cy - 4, 2, 5);
        rect(ctx, '#22c55e', cx - 3, cy - 3, 2, 2);
        rect(ctx, '#4ade80', cx + 2, cy - 3, 2, 2);
        rect(ctx, '#86efac', cx, cy - 6, 1, 2);
      } else {
        // Standard Solanaceae / Flora / Rosette cotyledon seedling
        rect(ctx, '#3e2723', cx - 4, cy + 1, 8, 2);
        rect(ctx, '#4d7c0f', cx - 1, cy - 3, 2, 5);
        oval(ctx, '#84cc16', cx - 4, cy - 4, 4, 2);
        oval(ctx, '#a3e635', cx + 4, cy - 4, 4, 2);
        rect(ctx, '#bef264', cx - 1, cy - 5, 2, 2);
        rect(ctx, '#ffffff', cx - 3, cy - 5, 1, 1);
      }
    }

    // ------------------------------------------------------------------------
    // STAGE 2: SPROUT & VEGETATIVE GROWTH (Species-specific plant shapes)
    // ------------------------------------------------------------------------
    else if (stage === 'sprout') {
      if (cropId.includes('rice') || cropId.includes('lua')) {
        // Dense emerald rice tiller clump (5 arched blades with water sheen)
        rect(ctx, '#365314', cx - 6, cy + 1, 12, 2);
        for (let b = -2; b <= 2; b++) {
          const bx = cx + b * 3;
          ctx.beginPath();
          ctx.moveTo(bx, cy + 2);
          ctx.quadraticCurveTo(bx + b * 2, cy - 8, bx + b * 4, cy - 11);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#22c55e';
          ctx.stroke();
          oval(ctx, '#4ade80', bx + b * 4, cy - 11, 2, 1);
        }
      } else if (cropId.includes('corn')) {
        // Thick segmented stalk with alternating broad arching leaves
        rect(ctx, '#14532d', cx - 2, cy - 12, 4, 14);
        rect(ctx, '#22c55e', cx - 1, cy - 11, 2, 13);
        // Left arching broad leaf
        oval(ctx, '#15803d', cx - 8, cy - 6, 7, 3);
        oval(ctx, '#4ade80', cx - 8, cy - 7, 6, 2);
        // Right arching broad leaf
        oval(ctx, '#16a34a', cx + 8, cy - 9, 7, 3);
        oval(ctx, '#86efac', cx + 7, cy - 10, 6, 2);
        // Central shoot
        oval(ctx, '#a3e635', cx, cy - 13, 4, 3);
      } else if (cropId.includes('sugarcane')) {
        // Clump of 3 jointed canes with upright arching leaves
        for (const so of [-4, 0, 4]) {
          rect(ctx, '#581c87', cx + so - 1, cy - 12, 3, 14);
          rect(ctx, '#a855f7', cx + so, cy - 11, 1, 13);
          rect(ctx, '#fef08a', cx + so - 1, cy - 6, 3, 1); // early joint ring
        }
        oval(ctx, '#15803d', cx - 6, cy - 13, 6, 2);
        oval(ctx, '#22c55e', cx + 6, cy - 14, 6, 2);
      } else if (cropId.includes('watermelon') || cropId.includes('pumpkin')) {
        // Sprawling vine runners creeping across the furrow with curly tendrils
        oval(ctx, '#14532d', cx, cy - 3, 14, 6);
        oval(ctx, '#16a34a', cx - 8, cy - 4, 6, 4);
        oval(ctx, '#22c55e', cx + 8, cy - 3, 6, 4);
        oval(ctx, '#4ade80', cx, cy - 6, 7, 4);
        // Curly green runner tendrils
        rect(ctx, '#15803d', cx - 12, cy - 2, 3, 1);
        rect(ctx, '#22c55e', cx - 13, cy - 4, 2, 2);
        rect(ctx, '#15803d', cx + 11, cy - 1, 3, 1);
        rect(ctx, '#22c55e', cx + 13, cy - 3, 2, 2);
      } else if (cropId.includes('strawberry')) {
        // Low bushy rosette of serrated trifoliate leaves
        oval(ctx, '#14532d', cx, cy - 3, 12, 6);
        oval(ctx, '#15803d', cx - 6, cy - 5, 5, 4);
        oval(ctx, '#16a34a', cx + 6, cy - 5, 5, 4);
        oval(ctx, '#22c55e', cx, cy - 7, 6, 4);
        rect(ctx, '#4ade80', cx - 1, cy - 8, 2, 2);
      } else if (cropId.includes('carrot')) {
        // Dense cluster of feathery fern-like fronds
        rect(ctx, '#14532d', cx - 1, cy - 5, 3, 7);
        for (const fo of [-6, -2, 2, 6]) {
          rect(ctx, '#15803d', cx + fo, cy - 10, 1, 8);
          rect(ctx, '#22c55e', cx + fo - 1, cy - 11, 3, 2);
          rect(ctx, '#4ade80', cx + fo, cy - 13, 2, 2);
        }
      } else if (cropId.includes('sunflower')) {
        // Sturdy thick stalk with large cordate (heart-shaped) leaves
        rect(ctx, '#14532d', cx - 2, cy - 13, 4, 15);
        rect(ctx, '#22c55e', cx - 1, cy - 12, 2, 14);
        oval(ctx, '#15803d', cx - 7, cy - 6, 6, 4);
        oval(ctx, '#4ade80', cx - 6, cy - 7, 5, 3);
        oval(ctx, '#16a34a', cx + 7, cy - 8, 6, 4);
        oval(ctx, '#86efac', cx + 6, cy - 9, 5, 3);
        oval(ctx, '#a3e635', cx, cy - 14, 5, 4);
      } else if (cropId.includes('grape')) {
        // Wooden trellis post with wrapping young vine and lobed leaves
        rect(ctx, '#78350f', cx - 1, cy - 14, 3, 16);
        rect(ctx, '#92400e', cx, cy - 13, 1, 14);
        oval(ctx, '#15803d', cx - 5, cy - 8, 5, 4);
        oval(ctx, '#22c55e', cx + 5, cy - 10, 5, 4);
        rect(ctx, '#4ade80', cx + 6, cy - 12, 2, 2); // tendril
      } else if (cropId.includes('cabbage')) {
        // Expanding rosette of crinkly jade leaves forming a miniature cup
        oval(ctx, '#14532d', cx, cy - 4, 14, 8);
        oval(ctx, '#16a34a', cx, cy - 4, 12, 7);
        oval(ctx, '#22c55e', cx, cy - 5, 9, 5);
        rect(ctx, '#86efac', cx - 1, cy - 5, 3, 2);
      } else if (cropId.includes('pineapple')) {
        // Radiating sword-shaped spiky leaves with red-tinted edges
        rect(ctx, '#14532d', cx - 1, cy - 4, 3, 6);
        oval(ctx, '#15803d', cx - 7, cy - 5, 6, 2);
        oval(ctx, '#16a34a', cx + 7, cy - 5, 6, 2);
        oval(ctx, '#22c55e', cx - 4, cy - 9, 4, 2);
        oval(ctx, '#4ade80', cx + 4, cy - 9, 4, 2);
        rect(ctx, '#b91c1c', cx - 8, cy - 6, 2, 1); // red spine tip
        rect(ctx, '#b91c1c', cx + 7, cy - 6, 2, 1);
        rect(ctx, '#86efac', cx, cy - 11, 2, 3);
      } else if (cropId.includes('dragonfruit')) {
        // Fleshy 3-winged cactus joint climbing on short post
        rect(ctx, '#78350f', cx - 2, cy - 10, 4, 12);
        rect(ctx, '#15803d', cx - 3, cy - 9, 6, 8);
        rect(ctx, '#22c55e', cx - 2, cy - 8, 4, 7);
        rect(ctx, '#4ade80', cx - 1, cy - 11, 3, 3);
        rect(ctx, '#ffffff', cx - 3, cy - 6, 1, 1); // spine dots
        rect(ctx, '#ffffff', cx + 3, cy - 7, 1, 1);
      } else {
        // General bushy Solanaceae sprout (Tomato, Chili, Eggplant)
        rect(ctx, '#14532d', cx - 2, cy - 10, 4, 12);
        rect(ctx, '#22c55e', cx - 1, cy - 9, 2, 10);
        oval(ctx, '#15803d', cx - 6, cy - 6, 6, 3);
        oval(ctx, '#4ade80', cx - 5, cy - 7, 5, 2);
        oval(ctx, '#16a34a', cx + 6, cy - 5, 6, 3);
        oval(ctx, '#86efac', cx + 5, cy - 6, 5, 2);
        oval(ctx, '#a3e635', cx, cy - 12, 5, 3);
      }
    }

    // ------------------------------------------------------------------------
    // STAGE 3: BLOOMING & EARLY FRUIT SET (Species-authentic blossoms)
    // ------------------------------------------------------------------------
    else if (stage === 'blooming') {
      if (cropId.includes('rice') || cropId.includes('lua')) {
        // Pale green flowering panicles with lime-white spikelets & pollen glints
        rect(ctx, '#365314', cx - 7, cy + 2, 14, 2);
        for (let p = -2; p <= 2; p++) {
          const px = cx + p * 5;
          ctx.beginPath();
          ctx.moveTo(px, cy + 2);
          ctx.quadraticCurveTo(px + p * 2, cy - 10, px + p * 3, cy - 14);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#65a30d';
          ctx.stroke();
          // Flowering spikelets
          for (let k = 0; k < 3; k++) {
            oval(ctx, '#fef08a', px + p * 2 + k * 1.5, cy - 12 + k * 2, 1.5, 2);
            rect(ctx, '#ffffff', px + p * 2 + k * 1.5, cy - 12 + k * 2, 1, 1);
          }
        }
      } else if (cropId.includes('corn')) {
        // Tall corn stalk with top silk tassel & swelling ear shoots
        rect(ctx, '#14532d', cx - 2, cy - 16, 4, 18);
        rect(ctx, '#22c55e', cx - 1, cy - 15, 2, 17);
        oval(ctx, '#15803d', cx - 9, cy - 8, 8, 3);
        oval(ctx, '#16a34a', cx + 9, cy - 10, 8, 3);
        // Developing ear shoot at leaf axil
        oval(ctx, '#15803d', cx + 4, cy - 6, 4, 7);
        rect(ctx, '#d97706', cx + 4, cy - 10, 2, 3); // silk threads
        rect(ctx, '#fef08a', cx + 5, cy - 11, 1, 2);
        // Top tassel
        rect(ctx, '#ca8a04', cx - 2, cy - 18, 4, 3);
        rect(ctx, '#fef08a', cx - 3, cy - 20, 6, 2);
      } else if (cropId.includes('sugarcane')) {
        // Sturdy purple canes with emerging arrow plume bud
        for (const so of [-5, 0, 5]) {
          rect(ctx, '#4a044e', cx + so - 1, cy - 16, 3, 18);
          rect(ctx, '#9333ea', cx + so, cy - 15, 1, 17);
          rect(ctx, '#fef08a', cx + so - 1, cy - 10, 3, 1);
          rect(ctx, '#fef08a', cx + so - 1, cy - 4, 3, 1);
        }
        oval(ctx, '#e9d5ff', cx, cy - 18, 5, 3); // arrow plume bud
      } else if (cropId.includes('watermelon')) {
        // Creeping vine with golden yellow star blossoms & miniature green melon bead
        oval(ctx, '#14532d', cx, cy - 4, 16, 8);
        oval(ctx, '#22c55e', cx, cy - 5, 14, 6);
        // Miniature green watermelon bead
        oval(ctx, '#166534', cx - 6, cy - 2, 4, 3);
        oval(ctx, '#22c55e', cx - 6, cy - 2, 3, 2);
        // Bright yellow blossoms
        const blossoms: [number, number][] = [
          [cx - 5, cy - 8],
          [cx + 5, cy - 6],
        ];
        for (const [bx, by] of blossoms) {
          oval(ctx, '#eab308', bx, by, 4, 4);
          rect(ctx, '#fef08a', bx, by, 2, 2);
          rect(ctx, '#b45309', bx, by, 1, 1);
        }
      } else if (cropId.includes('pumpkin')) {
        // Large vine with huge golden-orange trumpet blossom & tiny ribbed green baby pumpkin
        oval(ctx, '#14532d', cx, cy - 4, 16, 8);
        oval(ctx, '#16a34a', cx, cy - 5, 14, 6);
        // Tiny baby green pumpkin
        oval(ctx, '#166534', cx - 5, cy - 3, 5, 4);
        rect(ctx, '#22c55e', cx - 5, cy - 3, 2, 2);
        // Big trumpet blossom
        oval(ctx, '#ea580c', cx + 4, cy - 8, 6, 5);
        oval(ctx, '#f59e0b', cx + 4, cy - 8, 5, 4);
        rect(ctx, '#fef08a', cx + 4, cy - 8, 2, 2);
      } else if (cropId.includes('strawberry')) {
        // Dainty white 5-petal blossoms with golden centers & miniature green unripe berries
        oval(ctx, '#14532d', cx, cy - 4, 15, 8);
        oval(ctx, '#16a34a', cx, cy - 5, 13, 6);
        // Tiny green immature berries
        oval(ctx, '#4ade80', cx - 7, cy - 2, 3, 3);
        oval(ctx, '#4ade80', cx + 7, cy - 2, 3, 3);
        // White flowers with golden pistil
        const flowers: [number, number][] = [
          [cx - 4, cy - 9],
          [cx + 3, cy - 8],
          [cx, cy - 11],
        ];
        for (const [fx, fy] of flowers) {
          oval(ctx, '#ffffff', fx, fy, 4, 4);
          rect(ctx, '#facc15', fx, fy, 2, 2);
        }
      } else if (cropId.includes('tomato')) {
        // Yellow star blossoms in drooping clusters & tiny green cherry tomato beads
        oval(ctx, '#14532d', cx, cy - 7, 14, 10);
        oval(ctx, '#16a34a', cx, cy - 8, 12, 8);
        // Baby green tomatoes
        oval(ctx, '#4ade80', cx - 6, cy - 3, 3, 3);
        oval(ctx, '#4ade80', cx + 6, cy - 4, 3, 3);
        // Yellow star blossoms
        const flowers: [number, number][] = [
          [cx - 4, cy - 10],
          [cx + 3, cy - 11],
          [cx, cy - 7],
        ];
        for (const [fx, fy] of flowers) {
          oval(ctx, '#eab308', fx, fy, 3, 3);
          rect(ctx, '#fef08a', fx, fy, 1, 1);
        }
      } else if (cropId.includes('chili')) {
        // Dainty white star flowers & tiny upright green peppers
        oval(ctx, '#14532d', cx, cy - 6, 14, 9);
        oval(ctx, '#16a34a', cx, cy - 7, 12, 7);
        // Tiny upright green chilies
        rect(ctx, '#166534', cx - 5, cy - 5, 2, 4);
        rect(ctx, '#22c55e', cx + 5, cy - 6, 2, 4);
        // White star blossoms
        oval(ctx, '#ffffff', cx - 2, cy - 10, 3, 3);
        rect(ctx, '#fef08a', cx - 2, cy - 10, 1, 1);
        oval(ctx, '#ffffff', cx + 4, cy - 9, 3, 3);
        rect(ctx, '#fef08a', cx + 4, cy - 9, 1, 1);
      } else if (cropId.includes('eggplant')) {
        // Violet star blossoms with bright yellow anthers
        oval(ctx, '#14532d', cx, cy - 7, 15, 10);
        oval(ctx, '#16a34a', cx, cy - 8, 13, 8);
        // Violet bell blossoms
        oval(ctx, '#7e22ce', cx - 5, cy - 9, 5, 4);
        oval(ctx, '#c084fc', cx - 5, cy - 9, 4, 3);
        rect(ctx, '#fef08a', cx - 5, cy - 9, 2, 2);
        oval(ctx, '#7e22ce', cx + 4, cy - 7, 5, 4);
        oval(ctx, '#c084fc', cx + 4, cy - 7, 4, 3);
        rect(ctx, '#fef08a', cx + 4, cy - 7, 2, 2);
      } else if (cropId.includes('carrot')) {
        // Lush feathery tops with white lacy umbrella umbel blossoms
        for (const co of [-7, -2, 3, 8]) {
          rect(ctx, '#15803d', cx + co, cy - 11, 1, 10);
          rect(ctx, '#22c55e', cx + co - 1, cy - 12, 3, 2);
        }
        // White lacy umbrella umbels
        oval(ctx, '#ffffff', cx - 4, cy - 14, 5, 3);
        rect(ctx, '#fef08a', cx - 4, cy - 14, 1, 1);
        oval(ctx, '#ffffff', cx + 4, cy - 15, 5, 3);
        rect(ctx, '#fef08a', cx + 4, cy - 15, 1, 1);
      } else if (cropId.includes('sunflower')) {
        // Upright tall stalk with large swelling disk bud bursting with golden petals
        rect(ctx, '#15803d', cx - 2, cy - 8, 4, 13);
        oval(ctx, '#166534', cx - 7, cy - 2, 6, 3);
        oval(ctx, '#16a34a', cx + 7, cy - 2, 6, 3);
        // Large flower bud with green bracts opening
        oval(ctx, '#15803d', cx, cy - 11, 9, 9);
        oval(ctx, '#ca8a04', cx, cy - 11, 7, 7);
        oval(ctx, '#eab308', cx, cy - 11, 5, 5);
        rect(ctx, '#fef08a', cx - 1, cy - 12, 2, 2);
      } else if (cropId.includes('grape')) {
        // Vine trellis with tiny green grape flower clusters & bead berries
        rect(ctx, '#78350f', cx - 1, cy - 15, 3, 17);
        oval(ctx, '#166534', cx, cy - 12, 14, 7);
        oval(ctx, '#22c55e', cx - 4, cy - 10, 6, 4);
        oval(ctx, '#22c55e', cx + 4, cy - 10, 6, 4);
        // Chartreuse flower clusters & tiny beads
        oval(ctx, '#bef264', cx - 4, cy - 7, 4, 4);
        oval(ctx, '#bef264', cx + 4, cy - 6, 4, 4);
        rect(ctx, '#ffffff', cx - 4, cy - 7, 1, 1);
        rect(ctx, '#ffffff', cx + 4, cy - 6, 1, 1);
      } else if (cropId.includes('cabbage')) {
        // Thick ruffled outer leaves wrapping around a swelling pale green heart
        oval(ctx, '#14532d', cx, cy - 4, 16, 10);
        oval(ctx, '#16a34a', cx, cy - 4, 14, 9);
        oval(ctx, '#22c55e', cx, cy - 5, 11, 7);
        oval(ctx, '#86efac', cx, cy - 5, 7, 5);
        rect(ctx, '#dcfce7', cx - 1, cy - 5, 3, 2);
      } else if (cropId.includes('pineapple')) {
        // Central crimson cone bud with miniature purple florets
        oval(ctx, '#14532d', cx, cy - 4, 16, 8);
        oval(ctx, '#16a34a', cx, cy - 5, 14, 6);
        // Red flower cone
        oval(ctx, '#991b1b', cx, cy - 7, 7, 10);
        oval(ctx, '#dc2626', cx, cy - 7, 6, 9);
        rect(ctx, '#c084fc', cx - 2, cy - 8, 2, 2); // purple floret tips
        rect(ctx, '#c084fc', cx + 1, cy - 6, 2, 2);
        rect(ctx, '#4ade80', cx - 1, cy - 14, 3, 3);
      } else if (cropId.includes('dragonfruit')) {
        // Large creamy white night-blooming flower bud on fleshy cactus limb
        rect(ctx, '#78350f', cx - 2, cy - 11, 4, 13);
        rect(ctx, '#15803d', cx - 4, cy - 8, 8, 9);
        rect(ctx, '#22c55e', cx - 3, cy - 7, 6, 8);
        // Creamy flower bud
        oval(ctx, '#fef08a', cx + 3, cy - 9, 6, 5);
        oval(ctx, '#ffffff', cx + 3, cy - 9, 5, 4);
        rect(ctx, '#ca8a04', cx + 3, cy - 9, 2, 2);
      } else {
        // Generic cheerful flowers
        oval(ctx, '#14532d', cx, cy - 7, 16, 11);
        oval(ctx, '#16a34a', cx, cy - 8, 14, 9);
        oval(ctx, '#fef08a', cx - 5, cy - 10, 3, 3);
        rect(ctx, '#f59e0b', cx - 5, cy - 10, 1, 1);
        oval(ctx, '#fbcfe8', cx + 5, cy - 8, 3, 3);
        rect(ctx, '#db2777', cx + 5, cy - 8, 1, 1);
      }
    } else if (stage === 'mature') {
      // ----------------------------------------------------
      // HIGH-FIDELITY CROP ARTWORK (ALL 11 CROPS)
      // ----------------------------------------------------
      if (cropId.includes('rice') || cropId.includes('lua')) {
        // LÚA NƯỚC NÀNG THƠM: Arched golden stalks with heavy grains
        for (let s = -2; s <= 2; s++) {
          const sx = cx + s * 6;
          ctx.beginPath();
          ctx.moveTo(sx, cy + 4);
          ctx.quadraticCurveTo(sx + 5, cy - 14, sx + 9, cy - 9);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#b45309';
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(sx, cy + 4);
          ctx.quadraticCurveTo(sx + 4, cy - 13, sx + 8, cy - 9);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#f59e0b';
          ctx.stroke();
          for (let g = 0; g < 4; g++) {
            oval(ctx, '#fef08a', sx + 3 + g * 2, cy - 11 + g * 2, 2, 3);
            rect(ctx, '#ffffff', sx + 3 + g * 2, cy - 11 + g * 2, 1, 1);
          }
        }
      } else if (cropId.includes('corn') || cropId.includes('bap')) {
        // BẮP NGÔ NGỌT SỮA: Plump sweet corn with green husks & silky tassel
        oval(ctx, '#15803d', cx - 7, cy - 5, 6, 12);
        oval(ctx, '#16a34a', cx + 7, cy - 5, 6, 12);
        // Golden cob
        oval(ctx, '#ca8a04', cx, cy - 7, 7, 13);
        oval(ctx, '#eab308', cx, cy - 7, 6, 12);
        // Kernel grid
        for (let kx = -3; kx <= 3; kx += 2) {
          for (let ky = -10; ky <= -3; ky += 2) {
            rect(ctx, '#fef08a', cx + kx, cy + ky, 1, 1);
          }
        }
        // Silk tassel
        rect(ctx, '#d97706', cx - 2, cy - 15, 4, 3);
        rect(ctx, '#fef08a', cx - 1, cy - 16, 2, 2);
      } else if (cropId.includes('watermelon') || cropId.includes('dua')) {
        // DƯA HẤU RUỘT ĐỎ: Plump Long An watermelon with rich dark stripes & curly vine
        oval(ctx, '#14532d', cx, cy - 4, 16, 11);
        oval(ctx, '#16a34a', cx, cy - 4, 14, 10);
        oval(ctx, '#22c55e', cx - 2, cy - 5, 12, 8);
        // Dark wavy stripes
        for (const sx of [-9, -4, 2, 7]) {
          rect(ctx, '#052e16', cx + sx, cy - 8, 2, 9);
          rect(ctx, '#052e16', cx + sx + 1, cy - 7, 1, 7);
        }
        // Pale yellow ground spot & highlight
        oval(ctx, '#fef08a', cx - 6, cy - 1, 3, 2);
        rect(ctx, '#86efac', cx + 2, cy - 7, 4, 1);
        // Curly vine tendril
        rect(ctx, '#15803d', cx + 8, cy - 11, 2, 3);
        rect(ctx, '#4ade80', cx + 10, cy - 12, 2, 2);
      } else if (cropId.includes('tomato') || cropId.includes('ca_chua')) {
        // CÀ CHUA BI CHÙM MỘNG: Clusters of glossy red tomatoes with green calyx
        oval(ctx, '#166534', cx, cy - 6, 13, 9);
        const tomatoes: [number, number, number][] = [
          [cx - 7, cy - 4, 5],
          [cx + 7, cy - 4, 5],
          [cx, cy - 7, 6],
          [cx - 3, cy - 1, 4],
          [cx + 4, cy - 1, 4],
        ];
        for (const [tx, ty, r] of tomatoes) {
          oval(ctx, '#991b1b', tx, ty, r, r);
          oval(ctx, '#dc2626', tx, ty, r - 1, r - 1);
          oval(ctx, '#ef4444', tx - 1, ty - 1, r - 2, r - 2);
          rect(ctx, '#ffffff', tx - 1, ty - 2, 1, 1); // glint
          // Green star calyx
          rect(ctx, '#15803d', tx - 1, ty - r + 1, 3, 1);
          rect(ctx, '#22c55e', tx, ty - r, 1, 2);
        }
      } else if (cropId.includes('chili') || cropId.includes('ot')) {
        // ỚT HIỂM CHỈ THIÊN: Pointed upright fiery red peppers
        oval(ctx, '#166534', cx, cy - 6, 13, 8);
        for (let ch = -2; ch <= 2; ch++) {
          const px = cx + ch * 5;
          const py = cy - 4 + (Math.abs(ch) % 2) * 2;
          rect(ctx, '#991b1b', px, py, 3, 8);
          rect(ctx, '#ef4444', px + 1, py, 2, 7);
          rect(ctx, '#f87171', px + 1, py + 1, 1, 4);
          rect(ctx, '#15803d', px, py - 2, 3, 2);
          rect(ctx, '#22c55e', px + 1, py - 3, 1, 2);
        }
      } else if (cropId.includes('strawberry')) {
        // DÂU TÂY ĐÀ LẠT: Ruby-red heart strawberries with seed dots & leafy crown
        oval(ctx, '#166534', cx, cy - 4, 15, 8);
        const berries: [number, number][] = [
          [cx - 6, cy - 3],
          [cx + 6, cy - 3],
          [cx, cy - 6],
        ];
        for (const [bx, by] of berries) {
          oval(ctx, '#991b1b', bx, by, 5, 6);
          oval(ctx, '#e11d48', bx, by, 4, 5);
          oval(ctx, '#fb7185', bx - 1, by - 1, 2, 3);
          // Seed specks
          rect(ctx, '#fef08a', bx - 2, by + 1, 1, 1);
          rect(ctx, '#fef08a', bx + 2, by + 1, 1, 1);
          rect(ctx, '#fef08a', bx, by - 1, 1, 1);
          rect(ctx, '#fef08a', bx, by + 3, 1, 1);
          // Crown calyx
          rect(ctx, '#15803d', bx - 3, by - 4, 6, 2);
          rect(ctx, '#4ade80', bx - 1, by - 5, 2, 2);
        }
      } else if (cropId.includes('pumpkin')) {
        // BÍ NGÔ KHỔNG LỒ: Plump ribbed orange pumpkin with thick woody stem
        oval(ctx, '#7c2d12', cx, cy - 4, 16, 12);
        oval(ctx, '#ea580c', cx, cy - 4, 15, 11);
        oval(ctx, '#f97316', cx, cy - 5, 13, 9);
        // Vertical ribs
        for (const rx of [-9, -4, 4, 9]) {
          rect(ctx, '#c2410c', cx + rx, cy - 9, 2, 10);
        }
        oval(ctx, '#fb923c', cx, cy - 6, 6, 7);
        // Sturdy brown stem & curling green vine
        rect(ctx, '#78350f', cx - 1, cy - 13, 3, 4);
        rect(ctx, '#92400e', cx, cy - 14, 2, 2);
        rect(ctx, '#22c55e', cx + 3, cy - 13, 2, 1);
        rect(ctx, '#4ade80', cx + 4, cy - 14, 2, 2);
      } else if (cropId.includes('eggplant')) {
        // CÀ TÍM DÀI: Deep royal violet sheen with green spiny cap
        oval(ctx, '#166534', cx, cy - 5, 12, 7);
        // Two long glossy eggplants
        const eggplants: [number, number, number][] = [
          [cx - 4, cy - 3, -1],
          [cx + 4, cy - 4, 1],
        ];
        for (const [ex, ey, flip] of eggplants) {
          oval(ctx, '#3b0764', ex, ey, 5, 9);
          oval(ctx, '#6b21a8', ex, ey, 4, 8);
          oval(ctx, '#9333ea', ex, ey, 3, 7);
          // Glossy reflection streak
          rect(ctx, '#e9d5ff', ex + (flip > 0 ? 1 : -1), ey - 3, 1, 5);
          // Green cap
          rect(ctx, '#15803d', ex - 2, ey - 7, 5, 3);
          rect(ctx, '#4ade80', ex - 1, ey - 8, 2, 2);
        }
      } else if (cropId.includes('carrot')) {
        // CÀ RỐT CỦ CAM: Feather greens with fat orange carrot tops in soil
        const carrots: [number, number][] = [
          [cx - 6, cy - 2],
          [cx, cy - 3],
          [cx + 6, cy - 2],
        ];
        for (const [rx, ry] of carrots) {
          // Lush feathery greens
          rect(ctx, '#166534', rx - 1, ry - 11, 2, 9);
          rect(ctx, '#22c55e', rx - 3, ry - 12, 6, 2);
          rect(ctx, '#4ade80', rx - 2, ry - 14, 4, 3);
          // Bright orange carrot shoulder poking out
          oval(ctx, '#c2410c', rx, ry, 4, 4);
          oval(ctx, '#f97316', rx, ry, 3, 3);
          rect(ctx, '#fdba74', rx - 1, ry - 1, 2, 2);
        }
      } else if (cropId.includes('sunflower')) {
        // HOA HƯỚNG DƯƠNG: Giant radiating yellow petals & textured seed core
        rect(ctx, '#15803d', cx - 2, cy - 4, 4, 10); // thick stem
        oval(ctx, '#166534', cx - 6, cy + 1, 5, 3);
        oval(ctx, '#166534', cx + 6, cy + 1, 5, 3);
        // Petal disc
        oval(ctx, '#ca8a04', cx, cy - 9, 12, 12);
        oval(ctx, '#eab308', cx, cy - 9, 11, 11);
        oval(ctx, '#fde047', cx, cy - 9, 9, 9);
        // Dark rich seeded center
        oval(ctx, '#451a03', cx, cy - 9, 5, 5);
        oval(ctx, '#78350f', cx, cy - 9, 4, 4);
        rect(ctx, '#fbbf24', cx - 1, cy - 10, 2, 2);
      } else if (cropId.includes('grape')) {
        // NHO TÍM NINH THUẬN: Heavy hanging bunch of purple-violet grapes
        oval(ctx, '#166534', cx, cy - 11, 12, 6); // vine leaves
        rect(ctx, '#78350f', cx - 1, cy - 13, 2, 3); // vine stalk
        // Bunch of spherical grapes
        const grapePoints: [number, number][] = [
          [cx - 4, cy - 8],
          [cx, cy - 8],
          [cx + 4, cy - 8],
          [cx - 3, cy - 5],
          [cx + 2, cy - 5],
          [cx - 1, cy - 2],
        ];
        for (const [gx, gy] of grapePoints) {
          oval(ctx, '#2e1065', gx, gy, 3, 3);
          oval(ctx, '#581c87', gx, gy, 2.5, 2.5);
          oval(ctx, '#7e22ce', gx, gy, 2, 2);
          rect(ctx, '#d8b4fe', gx - 1, gy - 1, 1, 1); // frosty bloom
        }
      } else if (cropId.includes('cabbage')) {
        // BẮP CẢI TRẮNG ĐÀ LẠT: Large round leafy head with layered curled leaves
        oval(ctx, '#14532d', cx, cy - 4, 16, 12);
        oval(ctx, '#16a34a', cx, cy - 4, 14, 11);
        oval(ctx, '#22c55e', cx, cy - 5, 11, 9);
        oval(ctx, '#86efac', cx, cy - 6, 8, 7);
        rect(ctx, '#dcfce7', cx - 2, cy - 7, 4, 3);
      } else if (cropId.includes('pineapple')) {
        // KHÓM MẬT BẾN LỨC: Golden pineapples with diamond eyes & spiky crown
        oval(ctx, '#713f12', cx, cy - 4, 9, 13);
        oval(ctx, '#ca8a04', cx, cy - 4, 8, 12);
        oval(ctx, '#eab308', cx, cy - 5, 7, 10);
        for (let ix = -4; ix <= 4; ix += 3) {
          for (let iy = -8; iy <= 0; iy += 3) {
            rect(ctx, '#713f12', cx + ix, cy + iy, 1, 1);
            rect(ctx, '#fef08a', cx + ix, cy + iy - 1, 1, 1);
          }
        }
        // Spiky green top crown
        rect(ctx, '#15803d', cx - 5, cy - 16, 10, 5);
        rect(ctx, '#22c55e', cx - 3, cy - 18, 6, 4);
        rect(ctx, '#4ade80', cx - 1, cy - 20, 2, 3);
      } else if (cropId.includes('dragonfruit')) {
        // THANH LONG RUỘT ĐỎ: Magenta fruit with lime scale tips on cactus limb
        rect(ctx, '#15803d', cx - 2, cy - 2, 4, 8); // cactus stalk
        oval(ctx, '#831843', cx, cy - 6, 11, 13);
        oval(ctx, '#be185d', cx, cy - 6, 10, 12);
        oval(ctx, '#db2777', cx, cy - 6, 8, 10);
        rect(ctx, '#f472b6', cx - 2, cy - 9, 3, 4);
        // Scale fins
        rect(ctx, '#16a34a', cx - 8, cy - 9, 3, 3);
        rect(ctx, '#22c55e', cx - 7, cy - 8, 2, 2);
        rect(ctx, '#16a34a', cx + 6, cy - 9, 3, 3);
        rect(ctx, '#22c55e', cx + 6, cy - 8, 2, 2);
        rect(ctx, '#4ade80', cx - 1, cy - 17, 3, 3);
      } else if (cropId.includes('sugarcane')) {
        // MÍA TÍM HÒA BÌNH: Tall purple jointed stalks with fan of blade leaves
        for (const so of [-5, 0, 5]) {
          rect(ctx, '#3b0764', cx + so - 2, cy - 18, 4, 22);
          rect(ctx, '#7e22ce', cx + so - 1, cy - 17, 2, 20);
          rect(ctx, '#fef08a', cx + so - 2, cy - 12, 4, 1); // joint node
          rect(ctx, '#fef08a', cx + so - 2, cy - 6, 4, 1);
        }
        // Fan blades on top
        rect(ctx, '#15803d', cx - 9, cy - 21, 18, 3);
        rect(ctx, '#22c55e', cx - 7, cy - 23, 14, 2);
      } else {
        // Default harvest
        oval(ctx, '#166534', cx, cy - 8, 14, 10);
        oval(ctx, '#f59e0b', cx, cy - 6, 10, 8);
        oval(ctx, '#fef08a', cx, cy - 8, 6, 5);
      }

      // Harvest sparkles with glowing radiance
      const sparkles: [number, number][] = [
        [cx - 14, cy - 16],
        [cx + 14, cy - 14],
        [cx, cy - 20],
      ];
      for (const [sx, sy] of sparkles) {
        rect(ctx, '#ffffff', sx, sy, 2, 2);
        rect(ctx, '#fef08a', sx - 1, sy, 1, 1);
        rect(ctx, '#fef08a', sx + 2, sy, 1, 1);
        rect(ctx, '#fef08a', sx, sy - 1, 1, 1);
        rect(ctx, '#fef08a', sx, sy + 2, 1, 1);
      }
    }
  }

  return c;
}
