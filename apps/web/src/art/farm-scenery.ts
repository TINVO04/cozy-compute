import type Phaser from 'phaser';
import { FARM_GARDEN, FARM_POIS, TILE, type Rect } from '@cozy/game-data';
import { drawTree, paintBuilding, paintProp } from './town';

export function farmBuilding(p: Rect, label: string, roof: number) {
  return paintBuilding({
    id: 'farm-building',
    label,
    rect: p,
    wall: 0xe9d8b2,
    roof,
    accent: 0x6d7351,
    door: { x: (p.x + p.w / 2) / TILE - 1, w: 2 },
  });
}

type PenKind = 'poultry' | 'pig' | 'goat' | 'cattle';

export function paintFarmPen(p: Rect, roof: string, kindOrPasture: PenKind | boolean = false) {
  const kind: PenKind =
    typeof kindOrPasture === 'string' ? kindOrPasture : kindOrPasture ? 'cattle' : 'poultry';

  const c = document.createElement('canvas');
  c.width = p.w;
  c.height = p.h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // 1. Terrain Base Flooring per Animal Type
  if (kind === 'cattle') {
    // Lush green clover pasture
    box('#8cb374', 0, 0, p.w, p.h);
    box('#7ba164', 8, 8, p.w - 16, p.h - 16);
    // Clover & wildflower specks
    for (let x = 16; x < p.w - 20; x += 28) {
      box('#5c8546', x, 40 + ((x * 3) % (p.h - 60)), 3, 3);
      box('#ffffff', x + 1, 39 + ((x * 3) % (p.h - 60)), 2, 2);
    }
  } else if (kind === 'pig') {
    // Rich earthy ground with a mud bath
    box('#96744c', 0, 0, p.w, p.h);
    box('#85623b', 8, 8, p.w - 16, p.h - 16);
    // Central mud wallow pool (ao bùn tắm heo)
    const mwX = Math.round(p.w * 0.45);
    const mwY = Math.round(p.h * 0.52);
    box('#543b22', mwX - 38, mwY - 20, 76, 40);
    box('#3d2815', mwX - 32, mwY - 16, 64, 32);
    box('#28190d', mwX - 24, mwY - 10, 48, 20);
    // Mud glint sheen
    box('rgba(96, 165, 250, 0.25)', mwX - 16, mwY - 6, 24, 6);
    box('rgba(255, 255, 255, 0.2)', mwX - 10, mwY - 4, 12, 2);
    // Mud footprints
    box('#422d1a', mwX - 44, mwY + 4, 3, 2);
    box('#422d1a', mwX + 42, mwY - 4, 3, 2);
  } else if (kind === 'goat') {
    // Rocky highland meadow
    box('#99ab76', 0, 0, p.w, p.h);
    box('#889a65', 8, 8, p.w - 16, p.h - 16);
    // Stepping stones / rocks for goats to hop on
    box('#64748b', 110, 52, 20, 14);
    box('#94a3b8', 112, 54, 16, 10);
    box('#475569', 110, 64, 20, 2);
    box('#64748b', 124, 44, 16, 12);
    box('#94a3b8', 126, 46, 12, 8);
  } else {
    // Poultry coop: warm sandy earth with scattered golden straw
    box('#c8b282', 0, 0, p.w, p.h);
    box('#b7a171', 8, 8, p.w - 16, p.h - 16);
    // Straw specks on ground
    for (let x = 12; x < p.w - 16; x += 18) {
      box('#eab308', x, 40 + ((x * 7) % (p.h - 55)), 4, 1);
      box('#ca8a04', x + 1, 41 + ((x * 7) % (p.h - 55)), 3, 1);
      // Small chicken grain seeds
      box('#fef08a', x + 8, 48 + ((x * 5) % (p.h - 60)), 1, 1);
    }
  }

  // 2. Compact Timber Animal Shelter
  box('#6c5540', 16, 12, 80, 48);
  box('#cfb27b', 19, 18, 74, 40);
  for (let x = 24; x < 90; x += 10) box('#b79866', x, 24, 2, 32);
  // Shelter Roof
  box('#544936', 12, 4, 88, 23);
  box(roof, 14, 5, 84, 18);
  for (let y = 9; y < 23; y += 5) box('#ffffff25', 14, y, 84, 1);
  box('#584b36', 39, 34, 30, 26);
  box('#d8c086', 41, 54, 26, 5);

  // 3. Pen-Specific Internal Amenities
  if (kind === 'poultry') {
    // Woven straw nesting boxes with eggs
    box('#854d0e', 18, 44, 20, 14);
    box('#eab308', 20, 46, 16, 10);
    // Small fresh white and beige eggs!
    box('#f8fafc', 23, 49, 3, 4);
    box('#fed7aa', 29, 49, 3, 4);
    box('#f8fafc', 26, 52, 4, 3);
  } else if (kind === 'pig') {
    // Feed trough with pumpkin & vegetable mash
    box('#6b4c2a', p.w - 62, 28, 44, 20);
    box('#8c6338', p.w - 60, 30, 40, 16);
    box('#f97316', p.w - 55, 33, 10, 8); // orange pumpkin chunk
    box('#84cc16', p.w - 42, 34, 12, 7); // green sweet potato leaf
    box('#eab308', p.w - 28, 33, 8, 8); // yellow corn mash
  } else if (kind === 'goat') {
    // Wooden water bucket & hay tub
    box('#78350f', p.w - 58, 28, 20, 18);
    box('#0284c7', p.w - 56, 30, 16, 14); // cool blue water
    box('#38bdf8', p.w - 54, 32, 12, 5); // water sheen
    // Hay stack
    box('#ca8a04', p.w - 34, 28, 24, 18);
    box('#fde047', p.w - 32, 30, 20, 14);
  } else if (kind === 'cattle') {
    // Long wooden hay feeder rack
    box('#897044', p.w - 64, 26, 48, 24);
    box('#d7bd76', p.w - 62, 28, 44, 20);
    for (let x = p.w - 59; x < p.w - 18; x += 6) {
      box('#fde047', x, 27, 3, 18);
      box('#eab308', x + 1, 26, 2, 20);
    }
    // Red mineral salt lick block
    box('#b91c1c', p.w - 76, 32, 8, 10);
    box('#ef4444', p.w - 75, 33, 6, 8);
  }

  // 4. Perimeter Wooden Fence Rails & Posts
  const rail = (x: number, y: number, w: number) => {
    box('#8b7150', x, y, w, 8);
    box('#ddc79b', x, y, w, 3);
    for (let px = x; px < x + w; px += 32) {
      box('#806647', px, y - 5, 6, 13);
      box('#e5d0a3', px, y - 5, 6, 3);
    }
  };
  rail(0, 5, p.w);
  rail(0, p.h - 8, p.w / 2 - TILE);
  rail(p.w / 2 + TILE, p.h - 8, p.w / 2 - TILE);
  box('#8b7150', 0, 8, 8, p.h - 16);
  box('#d3bd91', 0, 8, 3, p.h - 16);
  box('#8b7150', p.w - 8, 8, 8, p.h - 16);
  box('#d3bd91', p.w - 8, 8, 3, p.h - 16);

  // Wooden gate posts at the entrance
  const gateX1 = p.w / 2 - TILE;
  const gateX2 = p.w / 2 + TILE - 6;
  box('#785a3a', gateX1, p.h - 14, 6, 14);
  box('#cfb483', gateX1, p.h - 14, 6, 3);
  box('#785a3a', gateX2, p.h - 14, 6, 14);
  box('#cfb483', gateX2, p.h - 14, 6, 3);

  return c;
}

/**
 * Produce Crates Sprite (Tiệm Bác Sáu: ripe tomatoes, sweet corn, watermelons)
 */
export function paintProduceCrates(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 54;
  c.height = 36;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.22)', 2, 28, 50, 6);

  // Left Crate: Sweet Corn (Ngô ngọt)
  box('#78350f', 2, 14, 22, 16);
  box('#b45309', 4, 16, 18, 12);
  for (let i = 0; i < 3; i++) {
    box('#15803d', 6 + i * 5, 10, 4, 8); // green husks
    box('#fde047', 7 + i * 5, 8, 3, 7); // yellow kernels
    box('#eab308', 7 + i * 5, 9, 2, 5);
  }
  // Front crate slats
  box('#92400e', 2, 20, 22, 2);
  box('#92400e', 2, 26, 22, 2);

  // Center/Right Crate: Red Tomatoes (Cà chua bi)
  box('#78350f', 26, 12, 24, 18);
  box('#b45309', 28, 14, 20, 14);
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < 3; col++) {
      box('#dc2626', 30 + col * 6, 11 + r * 6, 5, 5);
      box('#ef4444', 31 + col * 6, 10 + r * 6, 3, 3);
      box('#16a34a', 32 + col * 6, 9 + r * 6, 2, 2); // green calyx
    }
  }
  box('#92400e', 26, 19, 24, 2);
  box('#92400e', 26, 25, 24, 2);

  return c;
}

/**
 * Burlap Rice Sacks (Bao tải gạo Nàng Thơm)
 */
export function paintRiceSacks(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 44;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.22)', 2, 24, 40, 6);

  // Bottom sack
  box('#92754d', 2, 12, 24, 16);
  box('#d4b886', 4, 13, 20, 13);
  box('#fef08a', 8, 16, 12, 4); // rice label
  box('#dc2626', 11, 17, 6, 2); // red vintage stamp

  // Right sack
  box('#92754d', 18, 10, 24, 18);
  box('#d4b886', 20, 11, 20, 15);
  box('#785d39', 30, 8, 6, 4); // tied rope neck
  box('#e2c99a', 31, 6, 4, 3);

  // Top sack resting across
  box('#806540', 8, 2, 22, 13);
  box('#e2c99a', 10, 3, 18, 10);
  box('#785d39', 8, 4, 3, 5);

  return c;
}

/**
 * Leaning Farm Tools (Cuốc, cào tre, bình tưới nước)
 */
export function paintLeaningFarmTools(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 28;
  c.height = 42;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.2)', 2, 36, 24, 4);

  // Leaning hoe (Cây cuốc cán tre)
  box('#92400e', 6, 2, 2, 34); // long handle
  box('#475569', 3, 2, 8, 3); // iron blade
  box('#64748b', 4, 1, 6, 2);

  // Bamboo rake (Cào lúa cán dài)
  box('#ca8a04', 14, 4, 2, 34);
  box('#a16207', 10, 4, 10, 2);
  for (let px = 10; px <= 20; px += 3) box('#78350f', px, 2, 1, 3);

  // Galvanized watering can (Bình tưới thiếc)
  box('#64748b', 16, 22, 10, 14);
  box('#94a3b8', 17, 23, 8, 12);
  box('#475569', 19, 18, 6, 4); // handle
  box('#64748b', 12, 26, 5, 2); // spout
  box('#cbd5e1', 11, 25, 2, 4); // rose head

  return c;
}

/**
 * Stacked Golden Hay Bales (Kiện rơm khô buộc dây thừng)
 */
export function paintHayBales(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 36;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.22)', 2, 28, 44, 6);

  const drawBale = (bx: number, by: number) => {
    box('#854d0e', bx, by, 22, 14);
    box('#ca8a04', bx + 1, by + 1, 20, 12);
    box('#fde047', bx + 2, by + 2, 18, 9);
    // Hemp twine strings
    box('#78350f', bx + 6, by + 1, 2, 12);
    box('#78350f', bx + 14, by + 1, 2, 12);
  };

  // Bottom two bales
  drawBale(2, 18);
  drawBale(24, 18);
  // Top bale
  drawBale(13, 6);

  return c;
}

/**
 * Floating Water Lilies with Lotus Bloom (Ao Thủy Sản)
 */
export function paintWaterLilies(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 36;
  c.height = 24;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Green Lily Pad 1
  box('#166534', 4, 8, 14, 10);
  box('#22c55e', 5, 9, 12, 8);
  box('#15803d', 11, 10, 2, 4); // notch

  // Green Lily Pad 2
  box('#166534', 18, 10, 16, 11);
  box('#22c55e', 19, 11, 14, 9);

  // Blooming Pink Lotus Flower on top of Pad 1
  box('#ec4899', 8, 4, 6, 6);
  box('#f472b6', 9, 3, 4, 6);
  box('#ffffff', 10, 2, 2, 4);
  box('#fde047', 10, 5, 2, 2); // yellow stamen center

  return c;
}

/**
 * Shoreline Cattails / Bulrushes (Lác lau ven ao)
 */
export function paintPondReeds(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 24;
  c.height = 36;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Green reed stems
  box('#15803d', 4, 6, 2, 28);
  box('#16a34a', 11, 2, 2, 32);
  box('#15803d', 18, 8, 2, 26);

  // Brown velvet cattail heads
  box('#78350f', 3, 8, 4, 10);
  box('#451a03', 4, 9, 2, 8);

  box('#78350f', 10, 4, 4, 12);
  box('#451a03', 11, 5, 2, 10);

  box('#78350f', 17, 10, 4, 9);
  box('#451a03', 18, 11, 2, 7);

  return c;
}

/**
 * Hand-Crafted Ancient Stone Well (Giếng Nước Cổ - Kích thước to đẹp, vững chãi)
 */
export function paintAncientWell(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 70;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Drop shadow
  box('rgba(0,0,0,0.28)', 6, 58, 52, 10);

  // Timber Canopy Gabled Roof
  box('#451a03', 4, 4, 56, 8);
  box('#78350f', 6, 6, 52, 10);
  box('#b45309', 8, 8, 48, 8);
  box('#d97706', 10, 8, 44, 4);
  for (let r = 8; r < 56; r += 6) box('#92400e', r, 6, 2, 10);

  // Sturdy Upright Wooden Support Beams
  box('#451a03', 8, 16, 6, 34);
  box('#78350f', 10, 16, 3, 34);
  box('#451a03', 50, 16, 6, 34);
  box('#78350f', 51, 16, 3, 34);

  // Cross Axle & Winding Rope Spool
  box('#78350f', 14, 22, 36, 5);
  box('#ca8a04', 26, 20, 12, 9); // thick hemp rope coil
  box('#eab308', 27, 21, 10, 7);
  box('#ca8a04', 30, 29, 2, 14); // hanging rope

  // Hanging Oak Water Bucket
  box('#451a03', 26, 40, 12, 10);
  box('#854d0e', 27, 41, 10, 8);
  box('#0284c7', 29, 43, 6, 3); // cool water glint

  // Heavy Masonry Stone Basin
  box('#1e293b', 6, 48, 52, 20);
  box('#334155', 8, 50, 48, 17);
  box('#475569', 10, 51, 44, 15);

  // Stone brick pattern with mortar
  for (let y = 52; y <= 64; y += 4) {
    box('#0f172a', 10, y, 44, 1);
    for (let x = 12; x <= 50; x += 10) {
      box('#0f172a', x + (y % 8 === 0 ? 0 : 5), y, 1, 4);
    }
  }

  // Green moss lichen on aged stone
  box('#4d7c0f', 10, 56, 8, 5);
  box('#65a30d', 11, 57, 5, 3);
  box('#4d7c0f', 44, 60, 8, 4);

  // Dark reflective deep well water inside
  box('#0f172a', 14, 48, 36, 5);
  box('#0284c7', 18, 49, 28, 3);
  box('#38bdf8', 22, 50, 16, 1);

  return c;
}

/**
 * Static Prop: Xe Máy Cày Nông Trại (Classic Red Farm Tractor)
 */
export function paintTractor(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 36;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.25)', 4, 30, 42, 6);

  // Large Rear Tread Tire (Bánh xe sau lớn)
  box('#0f172a', 4, 14, 16, 18);
  box('#334155', 6, 16, 12, 14);
  box('#ca8a04', 9, 19, 6, 8); // yellow rim
  box('#fde047', 10, 20, 4, 6);

  // Smaller Front Tire (Bánh xe trước nhỏ)
  box('#0f172a', 36, 22, 10, 11);
  box('#334155', 38, 23, 6, 9);
  box('#ca8a04', 40, 25, 3, 5);

  // Chassis & Red Engine Hood (Thân xe đỏ)
  box('#7f1d1d', 16, 18, 26, 10);
  box('#b91c1c', 17, 16, 24, 10);
  box('#dc2626', 18, 15, 22, 8);
  box('#ef4444', 20, 15, 18, 3); // hood highlight

  // Black Engine Front Grille
  box('#0f172a', 40, 18, 3, 8);
  box('#475569', 41, 19, 1, 6);

  // Vertical Exhaust Stack Pipe (Ống xả khói cao)
  box('#0f172a', 34, 4, 3, 12);
  box('#475569', 35, 4, 1, 12);
  box('#0f172a', 33, 3, 5, 2);

  // Driver Seat & Steering Wheel (Ghế ngồi & vô lăng)
  box('#1e293b', 12, 11, 7, 6); // padded seat
  box('#0f172a', 14, 9, 2, 7);
  box('#475569', 24, 10, 2, 7); // steering column
  box('#0f172a', 23, 8, 5, 2); // steering wheel

  return c;
}

/**
 * Static Prop: Kho Thóc / Vựa Ngô Gỗ (Rustic Slatted Granary / Corn Crib)
 */
export function paintGranary(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 52;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Shadow
  box('rgba(0,0,0,0.25)', 4, 42, 44, 6);

  // Elevated Stone Footing Stems (Chân cột đá nâng sàn chống ẩm)
  box('#334155', 8, 36, 6, 8);
  box('#64748b', 9, 36, 4, 7);
  box('#334155', 38, 36, 6, 8);
  box('#64748b', 39, 36, 4, 7);

  // Main Slatted Wooden Barn Body (Thân kho gỗ nan)
  box('#451a03', 6, 16, 40, 22);
  box('#78350f', 8, 17, 36, 20);

  // Slat vents showing golden grain/corn inside
  for (let y = 20; y <= 33; y += 4) {
    box('#451a03', 10, y, 32, 2);
    // Golden corn cobs visible through slats
    for (let x = 12; x <= 38; x += 6) {
      box('#fde047', x, y - 2, 4, 2);
      box('#eab308', x + 1, y - 2, 2, 2);
    }
  }

  // Timber Framework Beams
  box('#451a03', 6, 16, 3, 22);
  box('#451a03', 43, 16, 3, 22);
  box('#451a03', 24, 16, 3, 22);

  // Pitched Cedar Shingle Roof (Mái ngói gỗ dốc)
  box('#7f1d1d', 2, 6, 48, 11);
  box('#991b1b', 4, 8, 44, 8);
  box('#b91c1c', 6, 9, 40, 6);
  for (let r = 5; r <= 45; r += 6) box('#dc2626', r, 7, 2, 9);

  return c;
}

/**
 * Static Prop: Cuộn Rơm Tròn Lớn (Large Cylindrical Round Hay Roll)
 */
export function paintRoundHayRoll(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 36;
  c.height = 30;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Ground shadow
  box('rgba(0,0,0,0.22)', 3, 23, 30, 6);

  // Cylinder Hay Body
  box('#854d0e', 4, 4, 28, 22);
  box('#ca8a04', 5, 5, 26, 20);
  box('#eab308', 6, 6, 24, 18);
  box('#fde047', 8, 7, 20, 16);

  // Concentric Radial Straw Spiral & Twine Bindings
  box('#854d0e', 11, 7, 2, 16); // left twine wrap
  box('#854d0e', 23, 7, 2, 16); // right twine wrap

  // Straw fiber texture flecks
  box('#ca8a04', 14, 10, 6, 2);
  box('#fef08a', 15, 12, 5, 1);
  box('#ca8a04', 16, 17, 5, 2);

  return c;
}

export function decorateFarm(scene: Phaser.Scene) {
  // 1. Trees
  if (!scene.textures.exists('farm:tree')) {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 112;
    drawTree(c.getContext('2d')!, 48, 108, 2);
    scene.textures.addCanvas('farm:tree', c);
  }
  const trees = FARM_GARDEN.trees.map(([x, y]) =>
    scene.add
      .sprite(x * TILE, y * TILE, 'farm:tree')
      .setOrigin(0.5, 1)
      .setDepth(y * TILE),
  );

  // 2. Bench
  if (!scene.textures.exists('farm:bench')) scene.textures.addCanvas('farm:bench', paintProp('bench'));
  const b = FARM_GARDEN.bench;
  scene.add
    .image(b.x + b.w / 2, b.y + b.h, 'farm:bench')
    .setOrigin(0.5, 1)
    .setDisplaySize(b.w, b.h + 16)
    .setDepth(b.y + b.h);

  // 3. Ancient Stone Well (To Lớn, Bề Thế)
  if (!scene.textures.exists('farm:ancient_well')) {
    scene.textures.addCanvas('farm:ancient_well', paintAncientWell());
  }
  const well = FARM_GARDEN.well;
  scene.add
    .image(well.x + 16, well.y + 28, 'farm:ancient_well')
    .setOrigin(0.5, 1)
    .setDisplaySize(64, 70)
    .setDepth(well.y + well.h + 10);

  // 4. Produce Crates & Burlap Sacks at Tiệm Bác Sáu
  if (!scene.textures.exists('farm:produce_crates')) {
    scene.textures.addCanvas('farm:produce_crates', paintProduceCrates());
  }
  if (!scene.textures.exists('farm:rice_sacks')) {
    scene.textures.addCanvas('farm:rice_sacks', paintRiceSacks());
  }
  if (!scene.textures.exists('farm:farm_tools')) {
    scene.textures.addCanvas('farm:farm_tools', paintLeaningFarmTools());
  }
  const shopP = FARM_POIS.shop_bac_sau;
  scene.add
    .image(shopP.x - 14, shopP.y + shopP.h, 'farm:produce_crates')
    .setOrigin(0.5, 1)
    .setDepth(shopP.y + shopP.h);
  scene.add
    .image(shopP.x + shopP.w + 14, shopP.y + shopP.h, 'farm:rice_sacks')
    .setOrigin(0.5, 1)
    .setDepth(shopP.y + shopP.h);
  scene.add
    .image(shopP.x + 6, shopP.y + shopP.h, 'farm:farm_tools')
    .setOrigin(0.5, 1)
    .setDepth(shopP.y + shopP.h + 1);

  // 5. Static Props: Xe Máy Cày, Kho Thóc, Kiện Rơm & Cuộn Rơm Tròn
  if (!scene.textures.exists('farm:tractor')) {
    scene.textures.addCanvas('farm:tractor', paintTractor());
  }
  if (!scene.textures.exists('farm:granary')) {
    scene.textures.addCanvas('farm:granary', paintGranary());
  }
  if (!scene.textures.exists('farm:round_hay')) {
    scene.textures.addCanvas('farm:round_hay', paintRoundHayRoll());
  }
  if (!scene.textures.exists('farm:hay_bales')) {
    scene.textures.addCanvas('farm:hay_bales', paintHayBales());
  }

  const siloP = FARM_POIS.silo_warehouse;
  // Xe máy cày đậu tại sân kho Silo
  scene.add
    .image(siloP.x + siloP.w + 35, siloP.y + siloP.h - 4, 'farm:tractor')
    .setOrigin(0.5, 1)
    .setDepth(siloP.y + siloP.h);

  // Kho thóc phụ bên cạnh Silo
  scene.add
    .image(siloP.x - 48, siloP.y + siloP.h - 6, 'farm:granary')
    .setOrigin(0.5, 1)
    .setDepth(siloP.y + siloP.h);

  // Cuộn rơm tròn rải rác tạo điểm nhấn đồng quê
  const cattleP = FARM_POIS.cattle_pasture;
  scene.add
    .image(cattleP.x + cattleP.w + 28, cattleP.y + 24, 'farm:round_hay')
    .setOrigin(0.5, 1)
    .setDepth(cattleP.y + 25);
  scene.add
    .image(10 * TILE, 26 * TILE, 'farm:round_hay')
    .setOrigin(0.5, 1)
    .setDepth(26 * TILE);

  // Kiện rơm vuông xếp chồng
  scene.add
    .image(siloP.x - 18, siloP.y + siloP.h, 'farm:hay_bales')
    .setOrigin(0.5, 1)
    .setDepth(siloP.y + siloP.h);
  scene.add
    .image(siloP.x + siloP.w + 16, siloP.y + siloP.h, 'farm:hay_bales')
    .setOrigin(0.5, 1)
    .setDepth(siloP.y + siloP.h);

  // 6. Water Lilies and Reeds in Aquaculture Pond (Ao Thủy Sản Dời Lên Trên)
  if (!scene.textures.exists('farm:water_lilies')) {
    scene.textures.addCanvas('farm:water_lilies', paintWaterLilies());
  }
  if (!scene.textures.exists('farm:pond_reeds')) {
    scene.textures.addCanvas('farm:pond_reeds', paintPondReeds());
  }
  const pond = FARM_POIS.aquaculture_pond;
  // Floating lilies (shifted up to match new pond position)
  scene.add
    .image(pond.x + 85, pond.y + 36, 'farm:water_lilies')
    .setOrigin(0.5)
    .setDepth(-5);
  scene.add
    .image(pond.x + 190, pond.y + 110, 'farm:water_lilies')
    .setOrigin(0.5)
    .setDepth(-5);
  scene.add
    .image(pond.x + 325, pond.y + 46, 'farm:water_lilies')
    .setOrigin(0.5)
    .setDepth(-5);
  // Shoreline reeds
  scene.add
    .image(pond.x + 14, pond.y + 15, 'farm:pond_reeds')
    .setOrigin(0.5, 1)
    .setDepth(pond.y + 16);
  scene.add
    .image(pond.x + 22, pond.y + 175, 'farm:pond_reeds')
    .setOrigin(0.5, 1)
    .setDepth(pond.y + 176);
  scene.add
    .image(pond.x + 385, pond.y + 185, 'farm:pond_reeds')
    .setOrigin(0.5, 1)
    .setDepth(pond.y + 186);

  return trees;
}
