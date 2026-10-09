import {
  TOWN_ROADS,
  INTERSECTIONS,
  DEALER_DRIVEWAY,
  MAP_HEIGHT,
  MAP_WIDTH,
  PATHS,
  PIER,
  PLAZA,
  TILE,
  TOWN_FENCES,
  WATER,
  pointInRect,
  type Building,
  type Rect,
} from '@cozy/game-data';
import { hex, mulberry, shade } from './pixel';

export const BUILDING_ROOF = 30;
export const TOWN_PALETTE = {
  grass: '#85b876',
  grassLight: '#a2c58a',
  grassDark: '#7da266',
  ink: '#3d4b3c',
  stone: '#d6d6cd',
  mortar: '#b9bcb1',
  wood: '#79533b',
  water: '#4bc0d2',
  waterDark: '#369fb5',
};
const C = TOWN_PALETTE;

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Raster scanlines keep organic shapes on the same pixel grid as roofs and avatars. */
function oval(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number) {
  for (let dy = -Math.floor(ry); dy <= ry; dy++) {
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    rect(ctx, color, x - dx, y + dy, dx * 2 + 1, 1);
  }
}

function flowers(ctx: CanvasRenderingContext2D, area: Rect, seed: number) {
  const rng = mulberry(seed);
  rect(ctx, '#728e5c', area.x - 3, area.y - 3, area.w + 6, area.h + 6);
  rect(ctx, '#b5bb86', area.x - 2, area.y - 2, area.w + 4, area.h + 4);
  rect(ctx, '#678851', area.x, area.y, area.w, area.h);
  for (let y = area.y + 4; y < area.y + area.h - 2; y += 8) {
    for (let x = area.x + 4; x < area.x + area.w - 2; x += 9) {
      rect(ctx, '#a2bc79', x - 2, y + 2, 5, 3);
      const color = ['#f4deb2', '#dd9b99', '#e8bd6c', '#b4a4c9'][Math.floor(rng() * 4)]!;
      rect(ctx, color, x - 2, y, 5, 2);
      rect(ctx, color, x, y - 2, 2, 5);
      rect(ctx, '#f9efcd', x, y, 1, 1);
    }
  }
}

export function paintTown(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const rng = mulberry(42);
  rect(ctx, C.grass, 0, 0, MAP_WIDTH, MAP_HEIGHT);
  // Broad tonal patches, with sparse tufts: ground stays quieter than landmarks.
  for (let i = 0; i < 100; i++) {
    oval(
      ctx,
      i % 2 ? '#96bc7c' : '#8bb173',
      rng() * MAP_WIDTH,
      rng() * MAP_HEIGHT,
      28 + rng() * 55,
      14 + rng() * 30,
    );
  }
  for (let i = 0; i < 6400; i++) {
    const x = Math.floor(rng() * MAP_WIDTH),
      y = Math.floor(rng() * MAP_HEIGHT);
    rect(ctx, rng() > 0.5 ? C.grassLight : C.grassDark, x, y, 1, 2);
    if (i % 4 === 0) rect(ctx, C.grassLight, x + 2, y + 1, 1, 2);
  }

  // =========================================================================
  // MODERN URBAN INFRASTRUCTURE (Option 2: Modern Cozy Urban Indie)
  // High-grade terrazzo sidewalks, tactile accessibility paving, deep slate asphalt,
  // double center medians, dashed dividing lines, zebra crossings & stop lines.
  // =========================================================================

  // 1. Granite Terrazzo Sidewalks with Modular Joints & Tactile Paving (Bớt trắng, dịu mắt tự nhiên)
  for (const path of PATHS) {
    // Base warm stone pavement slab
    rect(ctx, '#d8d8cf', path.x, path.y, path.w, path.h);

    // Subtle 16px geometric tile grid joints
    for (let px = path.x + 16; px < path.x + path.w; px += 16) {
      rect(ctx, '#c4c8bc', px, path.y, 1, path.h);
    }
    for (let py = path.y + 16; py < path.y + path.h; py += 16) {
      rect(ctx, '#c4c8bc', path.x, py, path.w, 1);
    }

    // Outer kerbstone bevel border where sidewalk borders lawns or roads
    rect(ctx, '#8c918a', path.x, path.y, path.w, 1);
    rect(ctx, '#8c918a', path.x, path.y + path.h - 1, path.w, 1);
    rect(ctx, '#8c918a', path.x, path.y, 1, path.h);
    rect(ctx, '#8c918a', path.x + path.w - 1, path.y, 1, path.h);
    rect(ctx, '#b0b5ae', path.x + 1, path.y + 1, path.w - 2, 1);
  }

  // 2. Asphalt Road Network (Màu nhựa đường nhạt dịu như cũ)
  const streets = TOWN_ROADS;
  const onStreet = (x: number, y: number) => streets.some((r) => pointInRect(x, y, r));

  for (let y = 320; y < 896; y += 2) {
    for (let x = 32; x < 1504; x += 2) {
      if (!onStreet(x, y)) continue;
      // Soft natural asphalt base (màu nhạt tự nhiên như cũ)
      rect(ctx, '#999e9b', x, y, 2, 2);

      // Curb gutter along road perimeter
      const isPerimeter =
        !onStreet(x - 2, y) || !onStreet(x + 2, y) || !onStreet(x, y - 2) || !onStreet(x, y + 2);
      if (isPerimeter) {
        rect(ctx, '#7c8580', x, y, 2, 2);
      }
    }
  }

  // Fine aggregate asphalt micro-speckles
  for (let i = 0; i < 4200; i++) {
    const x = 32 + Math.floor(rng() * 1472),
      y = 320 + Math.floor(rng() * 576);
    if (onStreet(x, y)) {
      rect(ctx, i % 2 ? '#a5aaa5' : '#8f9691', x, y, 1, 1);
    }
  }

  // Periodic storm sewer drainage grates along road gutters (Nắp cống thoát nước kim loại)
  for (const r of streets) {
    if (r.w > r.h) {
      // Horizontal road: place drainage grates on top and bottom gutter edges
      for (let gx = r.x + 24; gx < r.x + r.w - 24; gx += 80) {
        if (INTERSECTIONS.some((j) => Math.abs(gx - j.x) < j.halfW + 30)) continue;
        // Top gutter grate
        rect(ctx, '#525854', gx, r.y + 1, 8, 3);
        rect(ctx, '#6e7570', gx + 1, r.y + 1, 6, 2);
        rect(ctx, '#525854', gx + 3, r.y + 1, 2, 2);
        // Bottom gutter grate
        rect(ctx, '#525854', gx, r.y + r.h - 4, 8, 3);
        rect(ctx, '#6e7570', gx + 1, r.y + r.h - 3, 6, 2);
        rect(ctx, '#525854', gx + 3, r.y + r.h - 3, 2, 2);
      }
    } else {
      // Vertical road: place drainage grates on left and right gutter edges
      for (let gy = r.y + 24; gy < r.y + r.h - 24; gy += 80) {
        if (INTERSECTIONS.some((j) => Math.abs(gy - j.y) < j.halfH + 30)) continue;
        // Left gutter grate
        rect(ctx, '#525854', r.x + 1, gy, 3, 8);
        rect(ctx, '#6e7570', r.x + 1, gy + 1, 2, 6);
        // Right gutter grate
        rect(ctx, '#525854', r.x + r.w - 4, gy, 3, 8);
        rect(ctx, '#6e7570', r.x + r.w - 3, gy + 1, 2, 6);
      }
    }
  }

  // 3. Crisp Thermoplastic Road Edge Boundary Lines (Vạch liền mép đường)
  for (const r of streets) {
    if (r.w > r.h) {
      for (let x = r.x + 2; x < r.x + r.w - 2; x++) {
        if (INTERSECTIONS.some((j) => Math.abs(x - j.x) < j.halfW + 12)) continue;
        rect(ctx, '#f4f0e6', x, r.y + 3, 1, 1);
        rect(ctx, '#f4f0e6', x, r.y + r.h - 4, 1, 1);
      }
    } else {
      for (let y = r.y + 2; y < r.y + r.h - 2; y++) {
        if (INTERSECTIONS.some((j) => Math.abs(y - j.y) < j.halfH + 12)) continue;
        rect(ctx, '#f4f0e6', r.x + 3, y, 1, 1);
        rect(ctx, '#f4f0e6', r.x + r.w - 4, y, 1, 1);
      }
    }
  }

  // 4. Center Dividing Lines (Vạch tim đường sơn màu vàng nghệ tự nhiên dịu mắt)
  const ROAD_YELLOW = '#caa055';
  // Avenue 0 (Main horizontal avenue: y = 332..372, center y = 352):
  for (let x = 36; x < 1500; x += 24) {
    if (INTERSECTIONS.some((j) => Math.abs(x - j.x) < j.halfW + 18)) continue;
    rect(ctx, ROAD_YELLOW, x, 351, 12, 1);
  }

  // Avenue 3 (South horizontal avenue: y = 844..884, center y = 864):
  for (let x = 100; x < 1116; x += 24) {
    if (INTERSECTIONS.some((j) => Math.abs(x - j.x) < j.halfW + 18)) continue;
    rect(ctx, ROAD_YELLOW, x, 863, 12, 1);
  }

  // Avenue 1 (West vertical avenue: x = 332..372, center x = 352):
  for (let y = 324; y < 892; y += 24) {
    if (INTERSECTIONS.some((j) => Math.abs(y - j.y) < j.halfH + 18)) continue;
    rect(ctx, ROAD_YELLOW, 351, y, 1, 12);
  }

  // Avenue 2 (East 4-Lane Grand Boulevard: x = 1036..1108, w = 72, center x = 1072):
  // Double solid yellow center median line (Vạch đôi liền màu vàng nghệ chuẩn đô thị)
  for (let y = 322; y < 894; y++) {
    if (INTERSECTIONS.some((j) => Math.abs(y - j.y) < j.halfH + 16)) continue;
    rect(ctx, ROAD_YELLOW, 1070, y, 1, 1);
    rect(ctx, ROAD_YELLOW, 1073, y, 1, 1);
  }
  // Dashed white lane markers dividing the dual lanes (x = 1054 and x = 1090):
  for (let y = 324; y < 892; y += 20) {
    if (INTERSECTIONS.some((j) => Math.abs(y - j.y) < j.halfH + 18)) continue;
    rect(ctx, '#f4f0e6', 1054, y, 1, 10);
    rect(ctx, '#f4f0e6', 1090, y, 1, 10);
  }

  // 5. Pedestrian Zebra Crossings & Stop Lines at all 4 Intersections
  const drawZebraStripes = (zx: number, zy: number, zw: number, zh: number, isHoriz: boolean) => {
    // Backdrop shadow
    rect(ctx, '#68706b', zx, zy, zw, zh);
    if (isHoriz) {
      // Horizontal crossing: zebra bars run vertically (bx)
      for (let bx = zx + 1; bx < zx + zw - 2; bx += 6) {
        rect(ctx, '#f4f0e6', bx, zy + 1, 3, zh - 2);
      }
    } else {
      // Vertical crossing: zebra bars run horizontally (by)
      for (let by = zy + 1; by < zy + zh - 2; by += 6) {
        rect(ctx, '#f4f0e6', zx + 1, by, zw - 2, 3);
      }
    }
  };

  for (const j of INTERSECTIONS) {
    // Stop lines (Vạch dừng xe dày 3px màu trắng ngà trước vạch đi bộ)
    // Horizontal stops
    rect(ctx, '#f4f0e6', j.x - j.halfW - 8, j.y - j.halfH + 2, 2, j.halfH * 2 - 4);
    rect(ctx, '#f4f0e6', j.x + j.halfW + 7, j.y - j.halfH + 2, 2, j.halfH * 2 - 4);
    // Vertical stops
    rect(ctx, '#f4f0e6', j.x - j.halfW + 2, j.y - j.halfH - 8, j.halfW * 2 - 4, 2);
    rect(ctx, '#f4f0e6', j.x - j.halfW + 2, j.y + j.halfH + 7, j.halfW * 2 - 4, 2);

    // Zebra crosswalks flanking the 4 arms of the intersection
    // West & East arms (across horizontal road)
    drawZebraStripes(j.x - j.halfW - 6, j.y - j.halfH + 3, 5, j.halfH * 2 - 6, false);
    drawZebraStripes(j.x + j.halfW + 2, j.y - j.halfH + 3, 5, j.halfH * 2 - 6, false);

    // North & South arms (across vertical road)
    drawZebraStripes(j.x - j.halfW + 3, j.y - j.halfH - 6, j.halfW * 2 - 6, 5, true);
    drawZebraStripes(j.x - j.halfW + 3, j.y + j.halfH + 2, j.halfW * 2 - 6, 5, true);
  }

  // Mid-block pedestrian zebra crossings at the Plaza Promenade entrance (x = 618 and x = 810)
  for (const x of [618, 810]) {
    drawZebraStripes(x, 334, 18, 36, false);
    rect(ctx, '#f4f0e6', x - 4, 335, 2, 34);
    rect(ctx, '#f4f0e6', x + 20, 335, 2, 34);
  }

  // 6. Directional Lane Arrows Stenciled into Asphalt (Mũi tên chỉ hướng làn xe)
  const drawStraightArrow = (ax: number, ay: number) => {
    rect(ctx, '#f4f0e6', ax - 1, ay, 2, 8); // stem
    rect(ctx, '#f4f0e6', ax - 2, ay + 1, 4, 1);
    rect(ctx, '#f4f0e6', ax - 1, ay - 1, 2, 2); // point
  };
  const drawHorizArrow = (ax: number, ay: number, toRight: boolean) => {
    rect(ctx, '#f4f0e6', ax - 4, ay - 1, 8, 2); // stem
    const hx = toRight ? ax + 3 : ax - 4;
    rect(ctx, '#f4f0e6', hx, ay - 2, 1, 4);
  };
  // Stencil arrows approaching West Intersection
  drawHorizArrow(280, 342, true);
  drawHorizArrow(424, 362, false);
  drawStraightArrow(342, 420);
  drawStraightArrow(362, 280);
  // Stencil arrows approaching East 4-Lane Boulevard Intersection
  drawStraightArrow(1054, 420);
  drawStraightArrow(1054, 280);
  drawStraightArrow(1090, 420);
  drawStraightArrow(1090, 280);

  // DNTU front courtyard paving with warm architectural stone slabs and driveway
  rect(ctx, '#dcd8cc', 21 * TILE, 8 * TILE, 11 * TILE, 2 * TILE + 8);
  for (let y = 8 * TILE; y <= 10 * TILE + 8; y += 16) {
    rect(ctx, '#c4c0b4', 21 * TILE, y, 11 * TILE, 1);
  }
  for (let x = 21 * TILE; x <= 32 * TILE; x += 16) {
    rect(ctx, '#c4c0b4', x, 8 * TILE, 1, 2 * TILE + 8);
  }
  // Central driveway connecting the main street directly to DNTU grand entrance
  rect(ctx, '#7c8580', 25 * TILE - 2, 8 * TILE, 3 * TILE + 4, 2 * TILE + 12);
  rect(ctx, '#999e9b', 25 * TILE, 8 * TILE, 3 * TILE, 2 * TILE + 12);
  for (let i = 0; i < 60; i++) {
    const sx = 25 * TILE + Math.floor(rng() * (3 * TILE));
    const sy = 8 * TILE + Math.floor(rng() * (2 * TILE + 12));
    rect(ctx, i % 2 ? '#a5aaa5' : '#8f9691', sx, sy, 1, 1);
  }
  // Soft off-white entrance curb lines
  rect(ctx, '#f4f0e6', 25 * TILE, 8 * TILE, 1, 2 * TILE + 12);
  rect(ctx, '#f4f0e6', 28 * TILE - 1, 8 * TILE, 1, 2 * TILE + 12);

  // =========================================================================
  // MODERN CIVIC PLAZA & ILLUMINATED TURQUOISE FOUNTAIN
  // Geometric Terrazzo modular paving, warm limestone basin, underwater cyan LEDs
  // =========================================================================
  ctx.save();
  ctx.beginPath();
  ctx.rect(PLAZA.x, PLAZA.y, PLAZA.w, PLAZA.h);
  ctx.clip();
  // Modular 32x32 polished limestone and warm terracotta tiles
  for (let y = PLAZA.y; y < PLAZA.y + PLAZA.h; y += 16) {
    for (let x = PLAZA.x; x < PLAZA.x + PLAZA.w; x += 32) {
      const offset = ((y - PLAZA.y) / 16) % 2 ? 16 : 0;
      rect(ctx, '#c7b99a', x - offset, y, 32, 16);
      rect(ctx, '#eee3ca', x - offset + 1, y + 1, 30, 14);
      rect(ctx, '#f7eedb', x - offset + 2, y + 2, 28, 1);
    }
  }
  // Warm architectural feature bands framing the central plaza
  rect(ctx, '#b5a588', PLAZA.x, PLAZA.y + 4, PLAZA.w, 3);
  rect(ctx, '#b5a588', PLAZA.x, PLAZA.y + PLAZA.h - 7, PLAZA.w, 3);
  rect(ctx, '#b5a588', PLAZA.x + 4, PLAZA.y, 3, PLAZA.h);
  rect(ctx, '#b5a588', PLAZA.x + PLAZA.w - 7, PLAZA.y, 3, PLAZA.h);

  // Modern Circular/Oval Illuminated Fountain Feature
  // Warm architectural stone outer rim
  oval(ctx, '#c39a77', 24 * TILE, 16 * TILE, 84, 68);
  oval(ctx, '#d1bea0', 24 * TILE, 16 * TILE, 82, 66);
  oval(ctx, '#e9dbbd', 24 * TILE, 16 * TILE, 79, 63);
  oval(ctx, '#f2e5c9', 24 * TILE, 16 * TILE, 76, 60);

  // Sunken basin pool with luminous tropical turquoise/cyan water
  oval(ctx, '#0284c7', 24 * TILE, 16 * TILE, 64, 50);
  oval(ctx, '#06b6d4', 24 * TILE, 16 * TILE, 60, 46);
  oval(ctx, '#22d3ee', 24 * TILE, 16 * TILE, 56, 42);

  // Underwater LED illumination rings (Đèn LED âm nước đổi màu rực rỡ)
  oval(ctx, 'rgba(103, 232, 249, 0.75)', 24 * TILE, 16 * TILE, 46, 34);
  oval(ctx, 'rgba(224, 242, 254, 0.9)', 24 * TILE, 16 * TILE, 38, 28);
  oval(ctx, '#ffffff', 24 * TILE, 16 * TILE, 12, 8); // Central spouting jet core

  // Radial bench seating & warm stone planters surrounding the fountain
  for (const [dx, dy] of [
    [0, -56],
    [0, 56],
    [-72, 0],
    [72, 0],
  ]) {
    rect(ctx, '#8a674f', 24 * TILE + dx! - 5, 16 * TILE + dy! - 5, 10, 10);
    rect(ctx, '#b78666', 24 * TILE + dx! - 4, 16 * TILE + dy! - 4, 8, 8);
    rect(ctx, '#22c55e', 24 * TILE + dx! - 2, 16 * TILE + dy! - 2, 4, 4); // Evergreen shrub
  }
  ctx.restore();
  // Small eastern temple garden and its stone approach. Walls and gate are
  // independent depth-sorted objects rendered by the town component builder.
  rect(ctx, '#c4bea4', 1312, 400, 182, 182);
  rect(ctx, '#92b77b', 1316, 404, 174, 174);
  rect(ctx, '#d9ceb1', 1378, 510, 38, 72);
  for (let y = 514; y < 580; y += 12) rect(ctx, '#b8af93', 1378, y, 38, 1);

  flowers(ctx, { x: 17 * TILE + 8, y: 14 * TILE, w: 18, h: 54 }, 2);
  flowers(ctx, { x: 30 * TILE - 26, y: 14 * TILE, w: 18, h: 54 }, 3);
  flowers(ctx, { x: 18 * TILE, y: 20 * TILE + 12, w: 92, h: 20 }, 4);
  flowers(ctx, { x: 26 * TILE, y: 20 * TILE + 12, w: 92, h: 20 }, 5);
  flowers(ctx, { x: 39 * TILE, y: 12 * TILE + 12, w: 126, h: 24 }, 6);
  flowers(ctx, { x: 4 * TILE, y: 23 * TILE, w: 94, h: 24 }, 7);
  flowers(ctx, { x: 25 * TILE + 2, y: 23 * TILE, w: 56, h: 13 }, 8);
  // Southern lanes, small fenced gardens and individual hedges connect the houses.
  for (let i = 0; i < 7; i++) {
    const x = (3 + i * 3.4) * TILE;
    rect(ctx, '#c0bba3', x + 38, 28 * TILE, 18, 30);
    for (let y = 28 * TILE; y < 28 * TILE + 30; y += 6) rect(ctx, '#e1dbc1', x + 39, y + 1, 16, 4);
    for (let j = 0; j < 4; j++) {
      oval(ctx, '#376c36', x + 5 + j * 6, 28 * TILE + 10, 5, 5);
      oval(ctx, '#78a85a', x + 4 + j * 6, 28 * TILE + 8, 4, 3);
    }
  }
  // A planted stone plinth beneath the little temple in the southwestern garden.
  rect(ctx, '#998d70', 17.5 * TILE - 10, 24.5 * TILE - 14, 4 * TILE + 20, 36);
  rect(ctx, '#d8ceb0', 17.5 * TILE - 8, 24.5 * TILE - 12, 4 * TILE + 16, 32);

  rect(ctx, '#b6b6a8', DEALER_DRIVEWAY.x, DEALER_DRIVEWAY.y, DEALER_DRIVEWAY.w, DEALER_DRIVEWAY.h);
  for (const x of [588, 636]) {
    rect(ctx, '#f7ecc9', x, 796, 2, 34);
    rect(ctx, '#f7ecc9', x, 828, 28, 2);
  }
  // Modern Café outdoor wooden terrace deck & patio
  rect(ctx, '#1e293b', 4 * TILE - 1, 8 * TILE - 1, 7 * TILE + 2, 2 * TILE + 2);
  rect(ctx, '#78350f', 4 * TILE, 8 * TILE, 7 * TILE, 2 * TILE);
  for (let y = 8 * TILE; y < 10 * TILE; y += 6) {
    rect(ctx, '#b45309', 4 * TILE + 1, y + 1, 7 * TILE - 2, 4);
    rect(ctx, '#d97706', 4 * TILE + 1, y + 1, 7 * TILE - 2, 1);
  }
  // Short fence segments frame lawns, leaving all paths open.
  for (const fence of TOWN_FENCES) {
    for (let i = 0; i < fence.segments; i++) {
      const x = fence.x * TILE + i * 16,
        y = fence.y * TILE;
      rect(ctx, '#775e43', x, y - 8, 4, 14);
      rect(ctx, '#c6ae7b', x, y - 8, 3, 12);
      if (i < fence.segments - 1) {
        rect(ctx, '#b89c70', x + 4, y - 5, 12, 3);
        rect(ctx, '#9d805b', x + 4, y + 1, 12, 3);
      }
    }
  }

  // =========================================================================
  // MODERN WATERFRONT RETAINING WALL & MARINA SLIPWAY
  // Precast concrete sea walls, stainless steel railings, composite pontoon slipway
  // =========================================================================
  for (const w of WATER) {
    // 1. Reinforced Precast Concrete Seawall with Granite Coping
    rect(ctx, '#1e293b', w.x - 8, w.y - 8, w.w + 8, w.h + 8); // foundation
    rect(ctx, '#334155', w.x - 6, w.y - 6, w.w + 6, w.h + 6); // sea wall face
    rect(ctx, '#64748b', w.x - 4, w.y - 4, w.w + 4, w.h + 4); // upper batter
    rect(ctx, '#cbd5e1', w.x - 2, w.y - 2, w.w + 2, w.h + 2); // polished granite coping

    // Modern Stainless Steel Waterfront Promenade Railing along the shoreline
    for (let rx = w.x + 8; rx < w.x + w.w - 16; rx += 16) {
      if (rx >= PIER.x - 12 && rx <= PIER.x + PIER.w + 12) continue; // skip bridge
      rect(ctx, '#94a3b8', rx, w.y - 8, 2, 7); // vertical post
      rect(ctx, '#e2e8f0', rx - 8, w.y - 7, 16, 2); // top rail
      rect(ctx, '#cbd5e1', rx - 8, w.y - 4, 16, 1); // intermediate cable
    }

    // 2. Crystal Clear Flowing River Water with Tropical Depth Gradient
    rect(ctx, '#0369a1', w.x, w.y, w.w, w.h);
    const riverDepth = ctx.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h);
    riverDepth.addColorStop(0, '#0284c7');
    riverDepth.addColorStop(0.35, '#0891b2');
    riverDepth.addColorStop(0.7, '#0e7490');
    riverDepth.addColorStop(1, '#042f2e');
    ctx.fillStyle = riverDepth;
    ctx.fillRect(w.x + 4, w.y + 4, w.w - 4, w.h - 4);

    // Water surface wavelets & sunlight glint
    rect(ctx, '#67e8f9', w.x + 4, w.y + 4, w.w - 4, 3);
    rect(ctx, '#67e8f9', w.x + 4, w.y + 4, 3, w.h - 4);
    for (let i = 0; i < 240; i++) {
      const x = w.x + 12 + rng() * (w.w - 24),
        y = w.y + 12 + rng() * (w.h - 24);
      rect(
        ctx,
        i % 3 === 0 ? 'rgba(224, 242, 254, 0.45)' : 'rgba(8, 145, 178, 0.35)',
        x,
        y,
        4 + rng() * 12,
        1,
      );
    }

    // 3. Modern Marina Pontoon Slipway Docking Platform (x ~ 1280..1320, y ~ 860..900)
    // Dock ramp leading from shore
    const slipX = 40.5 * TILE; // 1296
    const slipY = 27.5 * TILE; // 880
    // Concrete slipway ramp
    rect(ctx, '#334155', slipX - 28, slipY - 36, 44, 48);
    rect(ctx, '#64748b', slipX - 26, slipY - 34, 40, 44);
    for (let sy = slipY - 30; sy < slipY + 8; sy += 6) {
      rect(ctx, '#475569', slipX - 24, sy, 36, 2); // anti-slip ridges
    }
    // High-visibility yellow/black safety edge
    for (let hx = slipX - 26; hx < slipX + 14; hx += 8) {
      rect(ctx, '#facc15', hx, slipY + 10, 4, 3);
      rect(ctx, '#0f172a', hx + 4, slipY + 10, 4, 3);
    }
    // Mooring bollards in stainless steel
    rect(ctx, '#0f172a', slipX - 22, slipY + 8, 4, 5);
    rect(ctx, '#f8fafc', slipX - 21, slipY + 7, 2, 4);
    rect(ctx, '#0f172a', slipX + 8, slipY + 8, 4, 5);
    rect(ctx, '#f8fafc', slipX + 9, slipY + 7, 2, 4);
    for (const [dx, dy] of [
      [22, 40],
      [42, 128],
      [300, 66],
      [340, 246],
      [86, 278],
    ]) {
      const x = w.x + dx!,
        y = w.y + dy!;
      oval(ctx, '#447e59', x, y, 7, 4);
      oval(ctx, '#75a16a', x - 1, y - 1, 5, 3);
      rect(ctx, C.water, x + 1, y, 6, 1);
      rect(ctx, '#e4b0b0', x - 2, y - 3, 3, 3);
      rect(ctx, '#f8ddce', x - 1, y - 3, 1, 1);
    }
    // Reeds stay entirely inside blocked water.
    for (let i = 0; i < 12; i++) {
      const x = w.x + 12 + i * 30;
      if (x > PIER.x - 8 && x < PIER.x + PIER.w + 8) continue;
      rect(ctx, '#52734d', x, w.y + 10, 2, 12);
      rect(ctx, '#7e9259', x + 3, w.y + 14, 2, 9);
      rect(ctx, '#9c7950', x, w.y + 9, 2, 5);
    }
  }
  // =========================================================================
  // CẦU HÓA AN — CHIẾC CẦU BÊ TÔNG DỰ ỨNG LỰC HIỆN ĐẠI VẮT QUA SÔNG ĐỒNG NAI
  // Thiết kế chuẩn 3D cầu vượt sông: Mố cầu vững chãi, trụ cầu mũi rẽ sóng,
  // dầm hộp vươn ra lòng sông, khe co giãn nhịp và lan can kim loại 3 chiều.
  // =========================================================================

  // 1. ELEVATED BRIDGE DECK SHADOW OVER FLOWING RIVER WATER
  // Bóng đổ dầm cầu in đậm xuống dòng nước Sông Đồng Nai phía dưới
  // Phía Đông (bóng đổ theo hướng nắng ban ngày)
  rect(ctx, 'rgba(4, 47, 46, 0.72)', PIER.x + PIER.w + 1, PIER.y + 6, 16, PIER.h - 6);
  rect(ctx, 'rgba(6, 78, 59, 0.42)', PIER.x + PIER.w + 17, PIER.y + 10, 10, PIER.h - 10);
  // Phía Tây (bóng đổ dưới dầm hộp biên vươn ra)
  rect(ctx, 'rgba(4, 47, 46, 0.65)', PIER.x - 12, PIER.y + 4, 10, PIER.h - 4);
  rect(ctx, 'rgba(6, 78, 59, 0.32)', PIER.x - 18, PIER.y + 8, 6, PIER.h - 8);

  // 2. SUBMERGED REINFORCED CONCRETE PIERS & CUTWATERS (Trụ cầu bê tông & Mũi rẽ sóng)
  // Các trụ cầu bê tông cốt thép cắm sâu dưới lòng sông Đồng Nai tại 3 nhịp cầu chính
  const pierSpans = [PIER.y + 64, PIER.y + 152, PIER.y + 240];
  for (const py of pierSpans) {
    // Đế móng ngầm dưới lòng sông
    rect(ctx, '#022c22', PIER.x - 14, py - 4, PIER.w + 28, 28);

    // Trụ cầu phía Tây (vươn ra ngoài mép dầm cầu)
    rect(ctx, '#0f172a', PIER.x - 13, py - 2, 11, 24);
    rect(ctx, '#334155', PIER.x - 12, py - 1, 9, 22);
    rect(ctx, '#64748b', PIER.x - 11, py, 7, 20);
    rect(ctx, '#94a3b8', PIER.x - 10, py + 1, 3, 18); // Vệt sáng bê tông đúc

    // Trụ cầu phía Đông
    rect(ctx, '#0f172a', PIER.x + PIER.w + 2, py - 2, 11, 24);
    rect(ctx, '#334155', PIER.x + PIER.w + 3, py - 1, 9, 22);
    rect(ctx, '#64748b', PIER.x + PIER.w + 4, py, 7, 20);
    rect(ctx, '#94a3b8', PIER.x + PIER.w + 5, py + 1, 3, 18);

    // Dầm ngang liên kết trụ cầu (Cross-diaphragm beam under deck)
    rect(ctx, '#1e293b', PIER.x - 4, py + 2, PIER.w + 8, 16);
    rect(ctx, '#475569', PIER.x - 2, py + 4, PIER.w + 4, 12);

    // Mũi rẽ sóng nhọn (Cutwater noses) quay về hướng thượng lưu chống xói lở
    // Mũi rẽ sóng trụ Tây
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(PIER.x - 8, py - 7);
    ctx.lineTo(PIER.x - 13, py - 1);
    ctx.lineTo(PIER.x - 3, py - 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(PIER.x - 9, py - 5, 2, 4);

    // Mũi rẽ sóng trụ Đông
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(PIER.x + PIER.w + 7, py - 7);
    ctx.lineTo(PIER.x + PIER.w + 2, py - 1);
    ctx.lineTo(PIER.x + PIER.w + 12, py - 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(PIER.x + PIER.w + 6, py - 5, 2, 4);

    // Bọt nước trắng xóa & gợn sóng rẽ quanh chân trụ cầu
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(PIER.x - 15, py - 3, 3, 2);
    ctx.fillRect(PIER.x - 17, py + 4, 3, 1);
    ctx.fillRect(PIER.x - 16, py + 18, 3, 2);
    ctx.fillRect(PIER.x + PIER.w + 13, py - 3, 3, 2);
    ctx.fillRect(PIER.x + PIER.w + 15, py + 4, 3, 1);
    ctx.fillRect(PIER.x + PIER.w + 14, py + 18, 3, 2);
  }

  // 3. SHORE ABUTMENT WING-WALLS & BRIDGEHEAD PYLONS (Mố cầu bê tông trên bờ)
  // Kết cấu mố cầu bằng đá granite và bê tông neo chặt vào bờ sông
  for (let y = PIER.y - 18; y < PIER.y; y += 6) {
    rect(ctx, '#0f172a', PIER.x - 36, y, PIER.w + 72, 6);
    rect(ctx, '#334155', PIER.x - 35, y, PIER.w + 70, 4);
    rect(ctx, '#64748b', PIER.x - 34, y, PIER.w + 68, 1);
  }
  // Mố cầu bê tông trắng vát chéo dẫn lối lên cầu
  rect(ctx, '#cbd5e1', PIER.x - 18, PIER.y - 12, 14, 14);
  rect(ctx, '#94a3b8', PIER.x - 17, PIER.y - 10, 12, 12);
  rect(ctx, '#cbd5e1', PIER.x + PIER.w + 4, PIER.y - 12, 14, 14);
  rect(ctx, '#94a3b8', PIER.x + PIER.w + 5, PIER.y - 10, 12, 12);

  // Hai trụ tháp cổng cầu (Bridgehead Architectural Pylons) uy nghi đầu cầu
  // Trụ tháp Tây
  rect(ctx, '#0f172a', PIER.x - 13, PIER.y - 24, 10, 26);
  rect(ctx, '#f8fafc', PIER.x - 12, PIER.y - 23, 8, 24);
  rect(ctx, '#cbd5e1', PIER.x - 12, PIER.y - 23, 3, 24);
  rect(ctx, '#b45309', PIER.x - 13, PIER.y - 27, 10, 4); // Chóp đồng viền vàng
  rect(ctx, '#facc15', PIER.x - 9, PIER.y - 29, 2, 3);
  rect(ctx, '#0284c7', PIER.x - 10, PIER.y - 16, 4, 6); // Huy hiệu cầu Hóa An xanh

  // Trụ tháp Đông
  rect(ctx, '#0f172a', PIER.x + PIER.w + 3, PIER.y - 24, 10, 26);
  rect(ctx, '#f8fafc', PIER.x + PIER.w + 4, PIER.y - 23, 8, 24);
  rect(ctx, '#cbd5e1', PIER.x + PIER.w + 4, PIER.y - 23, 3, 24);
  rect(ctx, '#b45309', PIER.x + PIER.w + 3, PIER.y - 27, 10, 4);
  rect(ctx, '#facc15', PIER.x + PIER.w + 7, PIER.y - 29, 2, 3);
  rect(ctx, '#0284c7', PIER.x + PIER.w + 6, PIER.y - 16, 4, 6);

  // 4. MAIN BRIDGE DECK GIRDERS & ASPHALT ROADWAY
  // Dầm hộp biên bê tông dày dặn (Thấy rõ chiều dày kết cấu dầm cầu 3D)
  rect(ctx, '#0f172a', PIER.x - 5, PIER.y, PIER.w + 10, PIER.h);
  rect(ctx, '#334155', PIER.x - 4, PIER.y, PIER.w + 8, PIER.h);

  // Dầm hộp bê tông chịu lực màu xám lộ ra ngoài mép lan can
  rect(ctx, '#64748b', PIER.x - 4, PIER.y, 2, PIER.h);
  rect(ctx, '#94a3b8', PIER.x - 3, PIER.y, 1, PIER.h);
  rect(ctx, '#64748b', PIER.x + PIER.w + 2, PIER.y, 2, PIER.h);
  rect(ctx, '#cbd5e1', PIER.x + PIER.w + 3, PIER.y, 1, PIER.h);

  // Mặt đường nhựa cầu (Asphalt roadway surface)
  rect(ctx, '#7c8580', PIER.x + 2, PIER.y, PIER.w - 4, PIER.h);
  rect(ctx, '#999e9b', PIER.x + 4, PIER.y, PIER.w - 8, PIER.h);

  // 5. RAISED PEDESTRIAN SIDEWALK CURBS (Vỉa hè người đi bộ hai bên mép cầu)
  // Vỉa hè đi bộ bên Tây
  rect(ctx, '#8c918a', PIER.x - 2, PIER.y, 6, PIER.h);
  rect(ctx, '#d8d8cf', PIER.x - 1, PIER.y, 4, PIER.h);
  rect(ctx, '#b0b5ae', PIER.x + 3, PIER.y, 1, PIER.h); // Gờ bó vỉa granite
  // Vỉa hè đi bộ bên Đông
  rect(ctx, '#8c918a', PIER.x + PIER.w - 4, PIER.y, 6, PIER.h);
  rect(ctx, '#d8d8cf', PIER.x + PIER.w - 3, PIER.y, 4, PIER.h);
  rect(ctx, '#b0b5ae', PIER.x + PIER.w - 4, PIER.y, 1, PIER.h);

  // Vạch kẻ trắng biên an toàn xe chạy (Solid white edge lines)
  rect(ctx, '#f4f0e6', PIER.x + 5, PIER.y, 1, PIER.h);
  rect(ctx, '#f4f0e6', PIER.x + PIER.w - 6, PIER.y, 1, PIER.h);

  // Vạch vàng đứt nét phân làn đường cao tốc (Yellow dashed centerline)
  for (let my = PIER.y + 4; my < PIER.y + PIER.h - 26; my += 16) {
    rect(ctx, ROAD_YELLOW, PIER.x + Math.floor(PIER.w / 2), my, 1, 8);
  }

  // 6. TRANSVERSE STEEL FINGER EXPANSION JOINTS (Khe co giãn cầu tại các nhịp)
  for (const py of pierSpans) {
    // Rãnh khe co giãn cao su & thép
    rect(ctx, '#525854', PIER.x + 4, py, PIER.w - 8, 3);
    // Bản thép răng lược đan xen (Steel finger joint plates)
    for (let jx = PIER.x + 5; jx < PIER.x + PIER.w - 6; jx += 4) {
      rect(ctx, '#b0b5ae', jx, py, 2, 1);
      rect(ctx, '#8c918a', jx + 1, py + 1, 2, 1);
      rect(ctx, '#b0b5ae', jx, py + 2, 2, 1);
    }
  }

  // 7. 3D STRUCTURAL STEEL BRIDGE RAILINGS & STREETLIGHTS (Lan can cầu 3 chiều)
  // Tay vịn trên cùng (Top safety handrail)
  rect(ctx, '#0369a1', PIER.x - 3, PIER.y, 2, PIER.h);
  rect(ctx, '#38bdf8', PIER.x - 2, PIER.y, 1, PIER.h);
  rect(ctx, '#0369a1', PIER.x + PIER.w + 1, PIER.y, 2, PIER.h);
  rect(ctx, '#38bdf8', PIER.x + PIER.w + 2, PIER.y, 1, PIER.h);

  // Các con tiện và cột trụ lan can (Railing posts every 20px)
  for (let ry = PIER.y + 4; ry < PIER.y + PIER.h - 10; ry += 20) {
    // Trụ lan can Tây
    rect(ctx, '#0c4a6e', PIER.x - 4, ry, 3, 5);
    rect(ctx, '#0284c7', PIER.x - 3, ry + 1, 2, 4);
    rect(ctx, '#e0f2fe', PIER.x - 3, ry + 1, 1, 2);
    // Trụ lan can Đông
    rect(ctx, '#0c4a6e', PIER.x + PIER.w + 1, ry, 3, 5);
    rect(ctx, '#0284c7', PIER.x + PIER.w + 1, ry + 1, 2, 4);
    rect(ctx, '#e0f2fe', PIER.x + PIER.w + 2, ry + 1, 1, 2);
  }

  // Đèn chiếu sáng cao áp gắn cần thép vươn ra lòng đường (Bridge streetlamps)
  for (let py = PIER.y + 24; py < PIER.y + PIER.h - 20; py += 56) {
    // Đèn bên Tây
    rect(ctx, '#475569', PIER.x - 6, py, 3, 8);
    rect(ctx, '#94a3b8', PIER.x - 8, py - 5, 3, 6);
    rect(ctx, '#fef08a', PIER.x - 9, py - 6, 4, 3);

    // Đèn bên Đông
    rect(ctx, '#475569', PIER.x + PIER.w + 3, py, 3, 8);
    rect(ctx, '#94a3b8', PIER.x + PIER.w + 5, py - 5, 3, 6);
    rect(ctx, '#fef08a', PIER.x + PIER.w + 5, py - 6, 4, 3);
  }

  // 8. SOUTHERN END: CONSTRUCTION BARRICADE TOWARDS BÌNH DƯƠNG (Rào chắn thi công)
  const barY = PIER.y + PIER.h - 22;
  // Khung rào chắn thép
  rect(ctx, '#0f172a', PIER.x + 2, barY, PIER.w - 4, 11);
  rect(ctx, '#1e293b', PIER.x + 3, barY + 1, PIER.w - 6, 9);
  // Dải phản quang sọc đỏ - trắng chuẩn công trình giao thông
  for (let bx = PIER.x + 3; bx < PIER.x + PIER.w - 6; bx += 8) {
    rect(ctx, '#dc2626', bx, barY + 1, 4, 9);
    rect(ctx, '#ffffff', bx + 4, barY + 1, 4, 9);
  }
  // Cọc tiêu giao thông chóp nón phản quang (Traffic safety cones)
  for (const cx of [PIER.x + 5, PIER.x + PIER.w - 13]) {
    rect(ctx, '#ea580c', cx, barY - 6, 8, 6);
    rect(ctx, '#f97316', cx + 1, barY - 10, 6, 4);
    rect(ctx, '#ffffff', cx + 1, barY - 8, 6, 2);
  }

  // Biển cảnh báo công trường màu vàng phản quang
  rect(ctx, '#78350f', PIER.x + Math.floor(PIER.w / 2) - 1, barY - 18, 2, 8);
  rect(ctx, '#000000', PIER.x + 5, barY - 26, PIER.w - 10, 9);
  rect(ctx, '#fbbf24', PIER.x + 6, barY - 25, PIER.w - 12, 7);
  rect(ctx, '#000000', PIER.x + 9, barY - 23, PIER.w - 18, 3);

  return canvas;
}

export function drawTree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  by: number,
  s = 1,
  canopy: readonly [string, string, string, string, string, string] = [
    '#2d5a2b',
    '#4a9347',
    '#6eaa55',
    '#96bd6c',
    '#a7c180',
    '#557e4b',
  ],
) {
  const rng = mulberry(Math.floor(cx + by * 7));
  oval(ctx, 'rgba(48,64,43,0.2)', cx + 2, by - 1, 18 * s, 5 * s);
  rect(ctx, '#694c38', cx - 4 * s, by - 18 * s, 8 * s, 18 * s);
  rect(ctx, '#a18054', cx - 3 * s, by - 16 * s, 3 * s, 14 * s);
  rect(ctx, '#5b4432', cx - 6 * s, by - 2 * s, 12 * s, 3 * s);
  const clusters = [
    [-9, -24, 12, 11],
    [9, -24, 12, 11],
    [-6, -34, 13, 12],
    [7, -34, 12, 11],
    [0, -42, 11, 10],
  ];
  for (const [dx, dy, rx, ry] of clusters) {
    const x = cx + dx! * s,
      y = by + dy! * s;
    oval(ctx, canopy[0], x, y, rx! * s + 1, ry! * s + 1);
    oval(ctx, canopy[1], x, y - 1, rx! * s, ry! * s - 1);
    oval(ctx, canopy[2], x - 2 * s, y - 3 * s, rx! * s * 0.78, ry! * s * 0.65);
    oval(ctx, canopy[3], x - 3 * s, y - 5 * s, rx! * s * 0.5, ry! * s * 0.35);
    for (let i = 0; i < 7; i++) {
      rect(
        ctx,
        i % 2 ? canopy[4] : canopy[5],
        x - 7 * s + rng() * 14 * s,
        y - 6 * s + rng() * 10 * s,
        2 * s,
        s,
      );
    }
  }
}

const SIGNS: Record<string, string> = {
  cafe: 'CÀ PHÊ BEAN THERE',
  fashion: 'THREADBARE',
  furniture: 'NỘI THẤT SOFA',
  apartments: 'CHUNG CƯ BCONS',
  delivery: 'BƯU CỤC 24/7',
  fishing_shop: 'NGƯ CỤ BÁC BA',
  comga: 'CƠM GÀ 68',
  bida: 'BIDA H2S',
  cybernet: 'CYBER GAME HNT',
};

/**
 * Paints the authentic VietProDev modern 3-story townhouse headquarters,
 * matching real-world architectural facade:
 * - Warm sand-beige / cream columns & walls
 * - 3rd floor / attic horizontal slate louvers & rooftop greens
 * - 2nd floor modern glass window, chrome/glass balcony railing
 * - Characteristic terracotta / warm wood louvers directly under the 2nd floor balcony
 * - Vietnamese national red flag with yellow star mounted on balcony
 * - Large white signboard: "CÔNG TY TNHH PHẦN MỀM" + tree logo + "Viet" (charcoal) "Pro" (green) "Dev" (blue)
 * - 3 service pillars: "DỰ ÁN PHẦN MỀM · ĐÀO TẠO · CLOUD & AI"
 * - Deep navy blue info strip at the bottom of the sign
 * - Dark scalloped / ripple awning canopy over the entrance
 * - Ground floor modern glass sliding doors with chrome handles and entrance step
 */
function paintVietProDevTownhouse(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 168
  canvas.height = b.rect.h + BUILDING_ROOF; // 192
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const w = b.rect.w; // 160
  const bottom = canvas.height - 2; // 190

  // 0. Base ground shadow
  rect(ctx, 'rgba(54, 48, 36, 0.25)', 4, bottom - 6, w + 4, 8);

  // 1. Structural Townhouse Backdrop (Beige cream center with slate grey flanking columns)
  rect(ctx, '#64748b', 4, 12, 18, bottom - 12);
  rect(ctx, '#475569', 20, 12, 2, bottom - 12);
  rect(ctx, '#64748b', w - 14, 12, 18, bottom - 12);
  rect(ctx, '#334155', w - 16, 12, 2, bottom - 12);

  // Main townhouse body (Warm beige / sand cream)
  rect(ctx, '#f5efe6', 22, 10, w - 38, bottom - 10);
  rect(ctx, '#ede5d8', 22, 10, 4, bottom - 10);
  rect(ctx, '#e4dcd0', w - 26, 10, 4, bottom - 10);

  // 2. FLOOR 3 / ATTIC & ROOF TERRACE (y: 10 to 60)
  for (let px = 28; px < w - 24; px += 14) {
    oval(ctx, '#15803d', px + 2, 8, 5, 5);
    oval(ctx, '#22c55e', px + 5, 6, 4, 4);
    rect(ctx, '#a15238', px + 1, 10, 7, 4);
  }

  // Attic center block with modern horizontal slate louvers
  const atticX = 46;
  const atticW = w - 84; // 76px
  const atticY = 14;
  const atticH = 46;
  rect(ctx, '#e8dfd5', atticX - 3, atticY - 2, atticW + 6, atticH + 4);
  rect(ctx, '#334155', atticX, atticY, atticW, atticH);
  for (let ly = atticY + 4; ly < atticY + atticH - 2; ly += 5) {
    rect(ctx, '#1e293b', atticX + 2, ly, atticW - 4, 2);
    rect(ctx, '#475569', atticX + 2, ly + 2, atticW - 4, 1);
  }
  rect(ctx, '#d6cbbe', atticX - 4, atticY - 3, atticW + 8, 3);

  // Side balconies / window cutouts on Floor 3
  rect(ctx, '#94a3b8', 26, 26, 16, 28);
  rect(ctx, '#ffffff', 28, 28, 12, 24);
  rect(ctx, '#e2e8f0', 29, 29, 10, 22);
  rect(ctx, '#cbd5e1', 26, 48, 16, 6);

  rect(ctx, '#94a3b8', w - 42, 26, 16, 28);
  rect(ctx, '#ffffff', w - 40, 28, 12, 24);
  rect(ctx, '#e2e8f0', w - 39, 29, 10, 22);
  rect(ctx, '#cbd5e1', w - 42, 48, 16, 6);

  // 3. FLOOR 2 (y: 60 to 118)
  rect(ctx, '#dfd5c6', 22, 60, w - 38, 4);

  const f2WinX = 38;
  const f2WinW = w - 68; // 92px
  const f2WinY = 64;
  const f2WinH = 34;

  rect(ctx, '#cbd5e1', f2WinX, f2WinY, f2WinW, f2WinH);
  rect(ctx, '#ffffff', f2WinX + 2, f2WinY + 2, f2WinW - 4, f2WinH - 4);
  rect(ctx, '#f1f5f9', f2WinX + 4, f2WinY + 4, f2WinW - 8, f2WinH - 8);
  for (let bx = f2WinX + 8; bx < f2WinX + f2WinW - 8; bx += 14) {
    rect(ctx, '#e2e8f0', bx, f2WinY + 4, 10, f2WinH - 8);
    rect(ctx, '#ffffff', bx + 2, f2WinY + 5, 6, 4);
  }
  rect(ctx, '#cbd5e1', f2WinX + Math.floor(f2WinW / 3), f2WinY + 2, 2, f2WinH - 4);
  rect(ctx, '#cbd5e1', f2WinX + Math.floor((f2WinW * 2) / 3), f2WinY + 2, 2, f2WinH - 4);

  // Modern glass & stainless steel balcony railing
  const railX = f2WinX - 2;
  const railW = f2WinW + 4;
  const railY = f2WinY + 22;
  const railH = 14;
  rect(ctx, 'rgba(224, 242, 254, 0.75)', railX, railY, railW, railH);
  rect(ctx, '#e2e8f0', railX - 1, railY, railW + 2, 2);
  rect(ctx, '#94a3b8', railX, railY + railH - 2, railW, 2);
  for (let rx = railX + 4; rx <= railX + railW - 4; rx += 20) {
    rect(ctx, '#cbd5e1', rx, railY, 2, railH);
  }

  // --- KEY ARCHITECTURAL FEATURE: TERRACOTTA / WOODEN SLATS (Lam gỗ đỏ) ---
  const slatX = f2WinX - 1;
  const slatW = f2WinW + 2;
  const slatY = railY + railH + 2;
  const slatH = 16;
  rect(ctx, '#7c2d12', slatX - 1, slatY - 1, slatW + 2, slatH + 2);
  rect(ctx, '#431407', slatX, slatY, slatW, slatH);
  for (let lx = slatX + 2; lx < slatX + slatW - 2; lx += 4) {
    rect(ctx, '#b45309', lx, slatY, 2, slatH);
    rect(ctx, '#d97706', lx, slatY, 1, slatH);
  }

  // 4. SIGNBOARD (Biển hiệu VietProDev Nền Trắng Sáng Chuẩn 100% Theo Ảnh Thực Tế)
  const signX = 8;
  const signW = w - 8; // 152px
  const signY = 118;
  const signH = 34;

  rect(ctx, 'rgba(0, 0, 0, 0.25)', signX - 1, signY - 1, signW + 2, signH + 4);
  rect(ctx, '#cbd5e1', signX - 1, signY - 1, signW + 2, signH + 2);
  rect(ctx, '#ffffff', signX, signY, signW, signH);

  // 4.1 Top line: "CÔNG TY TNHH PHẦN MỀM"
  ctx.font = '700 6px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#1e3a8a';
  ctx.fillText('CÔNG TY TNHH PHẦN MỀM', signX + signW / 2 + 10, signY + 3);

  // 4.2 Tree logo on the left of "VietProDev"
  const logoPx = signX + 12;
  const logoPy = signY + 14;
  rect(ctx, '#16a34a', logoPx + 4, logoPy + 2, 2, 8);
  rect(ctx, '#22c55e', logoPx + 2, logoPy + 1, 6, 2);
  rect(ctx, '#16a34a', logoPx, logoPy + 3, 10, 2);
  rect(ctx, '#15803d', logoPx + 2, logoPy + 5, 6, 2);

  // 4.3 MAIN LOGO: "Viet" (Charcoal), "Pro" (Green), "Dev" (Blue)
  const brandY = signY + 11;
  const centerX = signX + signW / 2 + 8;
  ctx.font = '800 13px "Inter", "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Viet', centerX - 8, brandY);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#16a34a';
  ctx.fillText('Pro', centerX + 4, brandY);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1d4ed8';
  ctx.fillText('Dev', centerX + 16, brandY);

  // 4.4 3 Pillars underneath
  ctx.font = '600 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.fillText('DỰ ÁN PHẦN MỀM  ·  ĐÀO TẠO  ·  CLOUD & AI', signX + signW / 2, signY + 23);

  // 4.5 Bottom blue band: info & website
  rect(ctx, '#1e40af', signX, signY + signH - 5, signW, 5);
  ctx.font = '700 4px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BIÊN HÒA, ĐỒNG NAI  ·  VIETPRODEV.VN', signX + signW / 2, signY + signH - 4.5);

  // 5. GROUND FLOOR AWNING (Mái hiên di động lượn sóng màu than đen)
  const awnX = signX - 2;
  const awnW = signW + 4;
  const awnY = signY + signH;
  const awnH = 12;

  // 6. GROUND FLOOR ENTRANCE & GLASS DOORS (y: 160 to bottom)
  const gy = awnY + awnH - 2;
  const gh = bottom - gy;
  rect(ctx, '#f1ede4', 22, gy, w - 38, gh);
  rect(ctx, '#e4dcd0', 22, gy, 4, gh);
  rect(ctx, '#e4dcd0', w - 26, gy, 4, gh);

  const doorX = 4 + b.door.x * TILE - b.rect.x; // 36
  const doorW = b.door.w * TILE; // 64
  const dy = bottom - 34;

  rect(ctx, '#cbd5e1', doorX + 4, dy - 2, doorW - 8, 36);
  rect(ctx, '#94a3b8', doorX + 6, dy, doorW - 12, 34);

  const halfW = (doorW - 16) / 2;
  rect(ctx, '#e0f2fe', doorX + 7, dy + 1, halfW, 32);
  rect(ctx, '#bae6fd', doorX + 9, dy + 3, halfW - 4, 16);
  rect(ctx, 'rgba(255, 255, 255, 0.7)', doorX + 11, dy + 4, 4, 26);
  rect(ctx, '#e2e8f0', doorX + 7 + halfW - 3, dy + 10, 2, 14);

  rect(ctx, '#e0f2fe', doorX + 9 + halfW, dy + 1, halfW, 32);
  rect(ctx, '#bae6fd', doorX + 11 + halfW, dy + 3, halfW - 4, 16);
  rect(ctx, 'rgba(255, 255, 255, 0.7)', doorX + 13 + halfW, dy + 4, 4, 26);
  rect(ctx, '#e2e8f0', doorX + 9 + halfW + 1, dy + 10, 2, 14);

  rect(ctx, '#cbd5e1', doorX + 2, bottom - 4, doorW - 4, 4);
  rect(ctx, '#f8fafc', doorX + 4, bottom - 4, doorW - 8, 1);

  // The canopy sits in front of the glass doors, not behind them.
  rect(ctx, '#0f172a', awnX, awnY, awnW, 3);
  rect(ctx, '#1e293b', awnX, awnY + 2, awnW, awnH - 4);
  for (let wx = awnX; wx < awnX + awnW; wx += 6) {
    rect(ctx, '#334155', wx, awnY + 2, 4, awnH - 4);
    rect(ctx, '#0f172a', wx + 4, awnY + 2, 2, awnH - 4);
    rect(ctx, '#1e293b', wx, awnY + awnH - 2, 5, 2);
  }
  rect(ctx, 'rgba(0, 0, 0, 0.35)', awnX, awnY + awnH, awnW, 3);

  return canvas;
}

/**
 * Paints Dong Nai Technology University (DNTU) grand Indochine campus building,
 * matching real-world architectural facade:
 * - Traditional Vietnamese multi-tiered terracotta red tile roof with central triangular dormer pediment
 * - Flanking roof gables with round attic arched windows
 * - Upper floors in warm French Indochine cream yellow with dark brown multi-pane windows and white balustrades
 * - Ground floor in bold terracotta-red with 5 monumental Roman/Indochine arched entrance gates
 * - 3 Flagpoles in front of central arch: Vietnam National Flag flanked by DNTU flags
 * - Grand polished granite campus monument engraved: "ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI"
 * - Manicured conical topiaries and palm greenery flanking the colonnade
 */
function paintDntuBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 200
  canvas.height = b.rect.h + BUILDING_ROOF; // 192
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const w = b.rect.w; // 192
  const bottom = canvas.height - 2; // 190

  // 0. Base ground shadow
  rect(ctx, 'rgba(54, 48, 36, 0.28)', 4, bottom - 6, w + 4, 8);

  // 1. Structural Backdrop & Wall Base (French Indochine Cream Yellow upper body)
  rect(ctx, '#fef3c7', 6, 44, w - 8, bottom - 44);
  rect(ctx, '#fde68a', 6, 44, 6, bottom - 44);
  rect(ctx, '#fde68a', w - 12, 44, 6, bottom - 44);

  // 2. ROOF (Terracotta Red Multi-tiered Hip & Gable Roof - y: 8..54)
  rect(ctx, '#7f1d1d', 2, 28, w, 24);
  rect(ctx, '#c2410c', 4, 30, w - 4, 20);
  for (let ry = 32; ry < 50; ry += 4) {
    rect(ctx, '#9a3412', 4, ry, w - 4, 2);
    rect(ctx, '#ea580c', 4, ry + 2, w - 4, 1);
  }
  rect(ctx, '#431407', 0, 50, w + 4, 4);
  rect(ctx, '#fffbeb', 2, 53, w, 2);

  // Dormers with round attic windows across the wide roof
  function drawDormer(dx: number) {
    rect(ctx, '#7f1d1d', dx, 20, 24, 28);
    rect(ctx, '#c2410c', dx + 2, 22, 20, 24);
    rect(ctx, '#fef3c7', dx + 4, 32, 16, 14);
    oval(ctx, '#1c1917', dx + 12, 38, 5, 5);
    oval(ctx, '#e0f2fe', dx + 12, 38, 4, 4);
    rect(ctx, '#1c1917', dx + 11, 34, 2, 8);
    rect(ctx, '#1c1917', dx + 8, 37, 8, 2);
  }
  // Symmetrical dormers on left and right wings
  drawDormer(28);
  drawDormer(92);
  drawDormer(w - 116);
  drawDormer(w - 52);

  // Central Grand Triangular Pediment Dormer (Mái dốc tam giác trung tâm - y: 8..36)
  const pedX = w / 2; // 176
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(pedX, 6);
  ctx.lineTo(pedX - 44, 38);
  ctx.lineTo(pedX + 44, 38);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#c2410c';
  ctx.beginPath();
  ctx.moveTo(pedX, 9);
  ctx.lineTo(pedX - 40, 36);
  ctx.lineTo(pedX + 40, 36);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.moveTo(pedX, 16);
  ctx.lineTo(pedX - 26, 35);
  ctx.lineTo(pedX + 26, 35);
  ctx.closePath();
  ctx.fill();

  rect(ctx, '#7c2d12', pedX - 16, 26, 32, 8);
  for (let vx = pedX - 14; vx <= pedX + 14; vx += 4) {
    rect(ctx, '#fef3c7', vx, 27, 2, 6);
  }

  // 3. UPPER FLOORS: TẦNG 2 & 3 (y: 54..112)
  const colXs = [12, 44, 76, 108, 140, 172, 204, 236, 268, 300, w - 12];
  for (const cx of colXs) {
    rect(ctx, '#b91c1c', cx - 2, 54, 4, 58);
    rect(ctx, '#991b1b', cx - 2, 54, 1, 58);
  }

  for (let bay = 0; bay < colXs.length - 1; bay++) {
    const c1 = colXs[bay] ?? 12;
    const c2 = colXs[bay + 1] ?? 44;
    const wx = c1 + 5;
    const ww = c2 - c1 - 10;

    // Floor 3 Window
    rect(ctx, '#1c1917', wx, 58, ww, 18);
    rect(ctx, '#e0f2fe', wx + 1, 59, ww - 2, 16);
    for (let wy = 61; wy < 74; wy += 4) {
      rect(ctx, '#1c1917', wx + 1, wy, ww - 2, 1);
    }

    // Floor 2 Window with white balustrade
    rect(ctx, '#1c1917', wx, 82, ww, 22);
    rect(ctx, '#e0f2fe', wx + 1, 83, ww - 2, 20);
    for (let wy = 85; wy < 100; wy += 4) {
      rect(ctx, '#1c1917', wx + 1, wy, ww - 2, 1);
    }
    rect(ctx, '#ffffff', wx - 1, 98, ww + 2, 6);
    for (let bx = wx + 1; bx < wx + ww; bx += 3) {
      rect(ctx, '#cbd5e1', bx, 99, 1, 5);
    }
  }

  rect(ctx, '#ffffff', 6, 110, w - 8, 4);
  rect(ctx, '#fef3c7', 6, 113, w - 8, 2);

  // 4. GROUND FLOOR: MONUMENTAL RED ARCHED COLONNADE (y: 114..186)
  rect(ctx, '#b91c1c', 6, 114, w - 8, bottom - 116);
  rect(ctx, '#991b1b', 6, 114, 4, bottom - 116);
  rect(ctx, '#7f1d1d', w - 10, 114, 4, bottom - 116);

  const arches = [
    { x: pedX - 150, w: 32, h: 48, topH: 12 },
    { x: pedX - 110, w: 32, h: 48, topH: 12 },
    { x: pedX - 70, w: 32, h: 48, topH: 12 },
    { x: pedX - 30, w: 60, h: 58, topH: 16 }, // Grand central entrance
    { x: pedX + 38, w: 32, h: 48, topH: 12 },
    { x: pedX + 78, w: 32, h: 48, topH: 12 },
    { x: pedX + 118, w: 32, h: 48, topH: 12 },
  ];

  for (const a of arches) {
    const ay = bottom - a.h - 6;

    rect(ctx, '#450a0a', a.x, ay, a.w, a.h);

    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(a.x + a.w / 2, ay + a.topH, a.w / 2, Math.PI, 0);
    ctx.fill();

    rect(ctx, 'rgba(254, 240, 138, 0.45)', a.x + 3, ay + a.topH, a.w - 6, a.h - a.topH - 4);
    rect(ctx, '#e0f2fe', a.x + 4, ay + a.topH + 4, a.w - 8, a.h - a.topH - 12);
    rect(ctx, 'rgba(255, 255, 255, 0.6)', a.x + 6, ay + a.topH + 6, 3, a.h - a.topH - 16);

    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x + a.w / 2, ay + a.topH, a.w / 2, Math.PI, 0);
    ctx.stroke();
    rect(ctx, '#fef3c7', a.x - 1, ay + a.topH, 2, a.h - a.topH);
    rect(ctx, '#fef3c7', a.x + a.w - 1, ay + a.topH, 2, a.h - a.topH);
    rect(ctx, '#ffffff', a.x + a.w / 2 - 2, ay - 2, 4, 4);
  }

  // Central Entrance Double Doors inside Central Arch
  const cDoorX = pedX - 16;
  const cDoorW = 32;
  const cDoorY = bottom - 36;
  rect(ctx, '#1c1917', cDoorX, cDoorY, cDoorW, 30);
  rect(ctx, '#e0f2fe', cDoorX + 2, cDoorY + 2, cDoorW / 2 - 3, 26);
  rect(ctx, '#e0f2fe', cDoorX + cDoorW / 2 + 1, cDoorY + 2, cDoorW / 2 - 3, 26);
  rect(ctx, '#e2e8f0', cDoorX + cDoorW / 2 - 2, cDoorY + 10, 1, 10);
  rect(ctx, '#e2e8f0', cDoorX + cDoorW / 2 + 1, cDoorY + 10, 1, 10);

  // Grand Entrance Steps (Polished stone stairs)
  rect(ctx, '#d4af37', pedX - 38, bottom - 6, 76, 4);
  rect(ctx, '#fef08a', pedX - 36, bottom - 4, 72, 2);

  // 5. 3 STAINLESS STEEL FLAGPOLES IN FRONT OF MAIN ARCH (y: 90..126)
  // Left Flagpole (DNTU)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pedX - 16, 126);
  ctx.lineTo(pedX - 16, 96);
  ctx.stroke();
  rect(ctx, '#facc15', pedX - 17, 95, 3, 2); // Gold pole finial

  // Center Flagpole (Vietnam National Flag)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pedX, 126);
  ctx.lineTo(pedX, 90);
  ctx.stroke();
  rect(ctx, '#facc15', pedX - 1, 89, 3, 2); // Gold pole finial

  // Right Flagpole (DNTU)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pedX + 16, 126);
  ctx.lineTo(pedX + 16, 96);
  ctx.stroke();
  rect(ctx, '#facc15', pedX + 15, 95, 3, 2); // Gold pole finial

  // 6. TOP UNIVERSITY TITLE ON ARCH LEVEL
  const signW = 160;
  const signX = pedX - signW / 2;
  rect(ctx, '#991b1b', signX, 118, signW, 14);
  rect(ctx, '#7f1d1d', signX, 118, signW, 1);
  rect(ctx, '#fef08a', signX + 1, 119, signW - 2, 12);
  ctx.font = '800 7px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b91c1c';
  ctx.fillText('TRƯỜNG ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI', pedX, 125, signW - 8);

  // 7. GOLD ARCH ENTRANCE TRANSOM (y: 136..144)
  rect(ctx, '#7f1d1d', pedX - 28, bottom - 46, 56, 10);
  rect(ctx, '#fef08a', pedX - 26, bottom - 45, 52, 8);
  ctx.font = '800 5.5px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#991b1b';
  ctx.fillText('ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI', pedX, bottom - 41, 48);

  // 8. MANICURED CONICAL TOPIARIES & PALM GREENERY
  function drawCampusTopiary(tx: number, ty: number) {
    rect(ctx, '#7f1d1d', tx + 2, ty + 10, 8, 8);
    rect(ctx, '#b91c1c', tx + 3, ty + 11, 6, 6);
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.moveTo(tx + 6, ty);
    ctx.lineTo(tx, ty + 11);
    ctx.lineTo(tx + 12, ty + 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(tx + 6, ty + 2);
    ctx.lineTo(tx + 2, ty + 10);
    ctx.lineTo(tx + 10, ty + 10);
    ctx.closePath();
    ctx.fill();
  }
  drawCampusTopiary(pedX - 52, bottom - 24);
  drawCampusTopiary(pedX + 42, bottom - 24);
  drawCampusTopiary(50, bottom - 24);
  drawCampusTopiary(w - 60, bottom - 24);

  return canvas;
}

/**
 * Paints authentic Cơm Gà Xối Mỡ 68 Biên Hòa restaurant facade:
 * - Proportional 2-story Vietnamese shophouse (canvas: 160x156):
 * - Roof (y: 4..24, sleek 20px): Terracotta tiled hip roof, stainless kitchen exhaust chimney venting steam
 * - Floor 2 (y: 26..68, 42px): Indochine yellow stucco, 3 green louver shutter windows with cascading bougainvillea, outdoor AC compressor
 * - Signboard (y: 68..94, 26px): Full-width red Alu panel with 3D embossed gold letters ("CƠM GÀ 68", "ĐẶC SẢN BIÊN HÒA", "XỐI MỠ DA GIÒN")
 * - Awning (y: 93..104, 11px): Red & yellow scalloped retractable awning ("mái hiên di động")
 * - Ground Floor (y: 104..156, 52px):
 *   - Left: Tall stainless & glass chicken cart with hanging crispy whole fried chicken, drumsticks, chopping block, cleaver, cucumbers & bubbling xối mỡ station
 *   - Center: Open dining entrance (doorX=36, doorW=64), checkered floor, golden fried rice warmer, bone broth cauldron & red "XIN CHÀO" mat
 *   - Right: Stainless dining table, red & blue stools, Chinsu chili sauce, iced tea with green straw & customer Honda Wave parked on sidewalk
 */
function paintComGaBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 168
  canvas.height = b.rect.h + BUILDING_ROOF; // 158
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const w = b.rect.w; // 160
  const bottom = canvas.height - 2; // 156
  const doorX = 4 + b.door.x * TILE - b.rect.x; // 36
  const doorW = b.door.w * TILE; // 64

  // 0. Base ground shadow
  rect(ctx, 'rgba(54, 48, 36, 0.35)', 4, bottom - 4, w + 4, 6);

  // 1. Solid Building Structure (Warm Saigon/Biên Hòa shophouse wall)
  rect(ctx, '#78350f', 4, 16, w, bottom - 16); // Structural dark timber framing
  rect(ctx, '#fef08a', 6, 18, w - 4, bottom - 18); // Indochine warm cream-yellow stucco
  rect(ctx, '#fef9c3', 6, 26, w - 4, 42); // Stucco highlight on Floor 2

  // Corner wood pillars
  rect(ctx, '#78350f', 4, 16, 4, bottom - 16);
  rect(ctx, '#92400e', 5, 17, 2, bottom - 17);
  rect(ctx, '#78350f', w, 16, 4, bottom - 16);
  rect(ctx, '#92400e', w + 1, 17, 2, bottom - 17);

  // 2. Terracotta Tiled Roof (y: 4..24) - Compact, sleek, proportional!
  rect(ctx, '#7f1d1d', 4, 20, w, 4); // Roof overhang shadow
  rect(ctx, '#991b1b', 2, 6, w + 4, 16);
  rect(ctx, '#b91c1c', 3, 7, w + 2, 14);
  // Slanted clay roof tile ridges (ngói móc đỏ cam)
  for (let rx = 5; rx < w + 4; rx += 4) {
    rect(ctx, '#ea580c', rx, 7, 2, 13);
    rect(ctx, '#7f1d1d', rx + 2, 7, 1, 13);
  }
  // Roof ridge cap & decorative golden finials
  rect(ctx, '#7c2d12', 1, 4, w + 6, 3);
  rect(ctx, '#c2410c', 2, 3, w + 4, 2);
  rect(ctx, '#fbbf24', 2, 2, 3, 3); // Left finial
  rect(ctx, '#fbbf24', w + 3, 2, 3, 3); // Right finial

  // Stainless kitchen exhaust chimney duct on right side of roof
  const chimX = w - 24;
  rect(ctx, '#475569', chimX - 1, 0, 11, 18);
  rect(ctx, '#cbd5e1', chimX, 0, 9, 17);
  rect(ctx, '#f8fafc', chimX + 1, 0, 3, 17); // Chrome reflection
  rect(ctx, '#64748b', chimX - 2, 0, 15, 4); // Rain cap
  rect(ctx, '#94a3b8', chimX - 1, 0, 13, 2);
  // Billowing fragrant steam puffs wafting out
  rect(ctx, 'rgba(255, 255, 255, 0.75)', chimX + 3, -4, 4, 3);
  rect(ctx, 'rgba(255, 255, 255, 0.55)', chimX + 6, -7, 5, 3);
  rect(ctx, 'rgba(255, 255, 255, 0.35)', chimX + 9, -10, 6, 3);

  // 3. Second Floor Windows & Shophouse Architecture (y: 26..68, height = 42px)
  // Horizontal dividing beam
  rect(ctx, '#78350f', 4, 24, w, 2);

  // Window helper
  const drawWindow = (wx: number, wy: number, ww: number, wh: number) => {
    rect(ctx, '#14532d', wx - 1, wy - 1, ww + 2, wh + 2);
    rect(ctx, '#166534', wx, wy, ww, wh);
    // Green wooden louver slats (cửa chớp lá sách)
    const mid = wx + Math.floor(ww / 2);
    for (let ly = wy + 3; ly < wy + wh - 4; ly += 4) {
      rect(ctx, '#15803d', wx + 2, ly, mid - wx - 3, 2);
      rect(ctx, '#15803d', mid + 1, ly, wx + ww - mid - 3, 2);
    }
    rect(ctx, '#14532d', mid - 1, wy, 2, wh); // Center frame

    // Planter box with blooming red/magenta bougainvillea (hoa giấy nở rộ)
    rect(ctx, '#78350f', wx - 2, wy + wh - 2, ww + 4, 6);
    rect(ctx, '#92400e', wx - 1, wy + wh - 1, ww + 2, 4);
    for (let fx = wx - 1; fx < wx + ww + 1; fx += 3) {
      rect(ctx, '#16a34a', fx, wy + wh - 4, 3, 4);
      rect(ctx, fx % 2 === 0 ? '#e11d48' : '#f43f5e', fx + 1, wy + wh - 5, 2, 3);
    }
  };

  // 3 Green Shutter Windows across 2nd floor:
  drawWindow(14, 28, 28, 30); // Window 1 (left)
  drawWindow(92, 28, 26, 30); // Window 2 (center-right)
  drawWindow(124, 28, 26, 30); // Window 3 (far-right)

  // Angled Flagpole on Floor 2 balcony beside Window 1 (Cột cờ ban công Cơm Gà 68)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(14, 52);
  ctx.lineTo(3, 38);
  ctx.stroke();
  rect(ctx, '#facc15', 2, 37, 2, 2); // Gold pole finial

  // Wall-mounted outdoor AC compressor unit (cục nóng máy lạnh)
  const acX = 50;
  const acY = 34;
  rect(ctx, '#64748b', acX - 1, acY - 1, 32, 22);
  rect(ctx, '#f1f5f9', acX, acY, 30, 20);
  rect(ctx, '#334155', acX + 16, acY + 4, 10, 10); // Fan circular grille
  rect(ctx, '#94a3b8', acX + 18, acY + 6, 6, 6);
  rect(ctx, '#0284c7', acX + 4, acY + 5, 8, 3); // Panasonic blue logo badge
  rect(ctx, '#cbd5e1', acX + 4, acY + 11, 8, 4); // Vent slats

  // Wall sconce lanterns
  for (const lx of [8, 46, 88, 154]) {
    rect(ctx, '#475569', lx, 32, 2, 6);
    rect(ctx, '#fef08a', lx - 1, 30, 4, 3);
  }

  // 4. Grand Red & Gold Signboard ("CƠM GÀ 68 - BIÊN HÒA") (y: 68..94, height = 26px)
  const signX = 6;
  const signW = w - 4; // 156
  const signY = 68;
  const signH = 26;

  // Drop shadow & golden frame
  rect(ctx, 'rgba(0, 0, 0, 0.45)', signX - 1, signY - 1, signW + 2, signH + 3);
  rect(ctx, '#ca8a04', signX - 1, signY - 1, signW + 2, signH + 2);
  rect(ctx, '#facc15', signX, signY, signW, signH);
  rect(ctx, '#991b1b', signX + 1, signY + 1, signW - 2, signH - 2);
  rect(ctx, '#b91c1c', signX + 2, signY + 2, signW - 4, signH - 4);
  rect(ctx, '#dc2626', signX + 2, signY + 2, signW - 4, 4); // Gloss highlight

  // Golden inner border
  rect(ctx, '#fef08a', signX + 3, signY + 2, signW - 6, 1);
  rect(ctx, '#fef08a', signX + 3, signY + signH - 3, signW - 6, 1);
  rect(ctx, '#fef08a', signX + 3, signY + 2, 1, signH - 4);
  rect(ctx, '#fef08a', signX + signW - 4, signY + 2, 1, signH - 4);

  // Spotlights above sign
  for (const lx of [signX + 16, signX + signW / 2 - 30, signX + signW / 2 + 30, signX + signW - 16]) {
    rect(ctx, '#334155', lx - 2, signY - 3, 5, 3);
    rect(ctx, '#fef08a', lx - 1, signY - 1, 3, 1);
  }

  // Text
  ctx.font = '700 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('⭐ ĐẶC SẢN BIÊN HÒA · GIA TRUYỀN ⭐', signX + signW / 2, signY + 3);

  // Main 3D Bold Title
  ctx.font = '900 12.5px "Inter", sans-serif';
  ctx.fillStyle = '#450a0a';
  ctx.fillText('CƠM GÀ 68', signX + signW / 2 + 1, signY + 9);
  ctx.fillStyle = '#fef08a';
  ctx.fillText('CƠM GÀ 68', signX + signW / 2, signY + 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CƠM GÀ 68', signX + signW / 2 - 0.5, signY + 7.6);

  ctx.font = '700 4.5px sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('XỐI MỠ DA GIÒN · GÀ TA THẢ VƯỜN · GỎI GÀ XÉ PHAY', signX + signW / 2, signY + 19);

  // 5. Scalloped Red-Yellow Retractable Awning ("Mái hiên di động") (y: 92..104, height = 12px)
  const awnY = 93;
  const awnH = 11;
  rect(ctx, 'rgba(0, 0, 0, 0.3)', 4, awnY + awnH, w, 4); // Shadow under awning
  for (let ax = 4; ax < 4 + w; ax += 10) {
    const isYellow = Math.floor((ax - 4) / 10) % 2 === 0;
    rect(ctx, isYellow ? '#facc15' : '#dc2626', ax, awnY, 10, awnH);
    rect(ctx, isYellow ? '#ca8a04' : '#991b1b', ax, awnY + awnH - 2, 10, 2);
  }
  // Scalloped bottom wavy fringe
  for (let ax = 4; ax < 4 + w; ax += 5) {
    rect(ctx, '#ffffff', ax + 1, awnY + awnH, 3, 2);
  }

  // 6. Ground Floor Restaurant Facade (y: 104..156, height = 52px!) - NO GAPS!
  // Stainless / granite kickplate at ground
  rect(ctx, '#94a3b8', 4, bottom - 8, w, 8);
  rect(ctx, '#cbd5e1', 5, bottom - 8, w - 2, 2);

  // Left: Stainless Steel Chicken Showcase (Tủ cơm gà kính inox xối mỡ cao ráo)
  const cartX = 6;
  const cartW = 28;
  const cartY = 106;
  const cartH = 46;
  // Glass cabinet frame
  rect(ctx, '#475569', cartX - 1, cartY - 1, cartW + 2, cartH + 2);
  rect(ctx, '#cbd5e1', cartX, cartY, cartW, cartH);
  rect(ctx, 'rgba(254, 243, 199, 0.92)', cartX + 2, cartY + 2, cartW - 4, cartH - 16); // Lit glass showcase
  // Hanging golden fried chicken thighs & whole crispy chickens
  for (const cx of [cartX + 4, cartX + 11, cartX + 18]) {
    rect(ctx, '#78350f', cx + 2, cartY + 3, 1, 3); // Hanging hook
    rect(ctx, '#b45309', cx, cartY + 5, 5, 12);
    rect(ctx, '#f59e0b', cx + 1, cartY + 6, 4, 9);
    rect(ctx, '#d97706', cx + 1, cartY + 12, 3, 4);
  }
  // Wooden chopping block (thớt gỗ me tròn) & cleaver (dao chặt gà inox)
  rect(ctx, '#78350f', cartX + 3, cartY + 20, 10, 6);
  rect(ctx, '#92400e', cartX + 4, cartY + 20, 8, 2);
  rect(ctx, '#cbd5e1', cartX + 7, cartY + 17, 5, 4); // Inox cleaver
  // Trays of sliced cucumber, red tomatoes, shredded pickled carrots
  rect(ctx, '#cbd5e1', cartX + 15, cartY + 21, 10, 5);
  rect(ctx, '#22c55e', cartX + 16, cartY + 21, 4, 3); // Cucumber
  rect(ctx, '#ef4444', cartX + 20, cartY + 21, 4, 3); // Tomato
  // Stainless lower cart with hot oil xối mỡ station
  rect(ctx, '#64748b', cartX, cartY + cartH - 14, cartW, 14);
  rect(ctx, '#cbd5e1', cartX + 2, cartY + cartH - 13, cartW - 4, 4);
  rect(ctx, '#f59e0b', cartX + 4, cartY + cartH - 11, 8, 3); // Bubbling hot oil
  // Rising aroma steam puff
  rect(ctx, 'rgba(255, 255, 255, 0.75)', cartX + 6, cartY - 4, 3, 3);
  rect(ctx, 'rgba(255, 255, 255, 0.5)', cartX + 9, cartY - 7, 4, 3);

  // Center: Entrance Doorway (Lối vào quán rộng rãi)
  const dy = 106;
  const doorH = 48;
  rect(ctx, '#78350f', doorX - 1, dy - 1, doorW + 2, doorH + 2);
  rect(ctx, '#fef3c7', doorX, dy, doorW, doorH); // Warm glowing interior
  // Inside checkered floor tiles
  for (let iy = dy + 10; iy < bottom - 4; iy += 8) {
    for (let ix = doorX; ix < doorX + doorW; ix += 8) {
      if ((Math.floor((ix - doorX) / 8) + Math.floor((iy - dy) / 8)) % 2 === 0) {
        rect(ctx, '#fed7aa', ix, iy, 8, 8);
      }
    }
  }
  // Inside: Fragrant yellow chicken rice warmer & bone broth cauldron
  rect(ctx, '#cbd5e1', doorX + 4, dy + 12, 12, 12);
  rect(ctx, '#facc15', doorX + 6, dy + 14, 8, 6); // Golden fried rice
  rect(ctx, '#64748b', doorX + 20, dy + 10, 14, 14); // Large cauldron
  rect(ctx, '#f59e0b', doorX + 22, dy + 12, 10, 4); // Broth surface
  rect(ctx, 'rgba(255, 255, 255, 0.6)', doorX + 24, dy + 6, 6, 4); // Steam
  // Cashier counter
  rect(ctx, '#78350f', doorX + 40, dy + 12, 18, 14);
  rect(ctx, '#94a3b8', doorX + 44, dy + 8, 6, 5); // POS monitor
  // Open glass folding door panels at sides
  rect(ctx, 'rgba(224, 242, 254, 0.8)', doorX, dy, 6, doorH - 4);
  rect(ctx, '#94a3b8', doorX + 5, dy, 1, doorH - 4);
  rect(ctx, 'rgba(224, 242, 254, 0.8)', doorX + doorW - 6, dy, 6, doorH - 4);
  rect(ctx, '#94a3b8', doorX + doorW - 6, dy, 1, doorH - 4);

  // "XIN CHÀO" Red Welcome Mat
  const matX = doorX + 8;
  const matW = doorW - 16;
  const matY = bottom - 8;
  rect(ctx, '#991b1b', matX, matY, matW, 7);
  rect(ctx, '#dc2626', matX + 1, matY + 1, matW - 2, 5);
  rect(ctx, '#fef08a', matX + 4, matY + 2, matW - 8, 2);

  // Right: Stainless Dining Table, Stools & Parked Honda Wave
  const winX = doorX + doorW + 2;
  const winW = w - winX - 2; // 56px
  const winY = 106;
  const winH = 46;

  // Window showing dining room
  rect(ctx, '#78350f', winX - 1, winY - 1, winW + 2, winH + 2);
  rect(ctx, 'rgba(254, 249, 195, 0.9)', winX, winY, winW, winH);

  // Stainless dining table inside
  rect(ctx, '#cbd5e1', winX + 4, winY + 10, winW - 16, 6);
  rect(ctx, '#f8fafc', winX + 5, winY + 10, winW - 18, 2);
  rect(ctx, '#64748b', winX + 8, winY + 16, 3, 14);
  rect(ctx, '#64748b', winX + winW - 18, winY + 16, 3, 14);
  // Red & blue plastic dining stools
  rect(ctx, '#dc2626', winX + 2, winY + 18, 6, 12);
  rect(ctx, '#2563eb', winX + winW - 15, winY + 18, 6, 12);
  // Table condiments: Red Chinsu bottle, soy sauce, iced tea (Trà đá) with green straw
  rect(ctx, '#dc2626', winX + 8, winY + 4, 3, 6); // Chinsu tương ớt
  rect(ctx, '#1e293b', winX + 13, winY + 4, 3, 6); // Xì dầu Maggi
  rect(ctx, '#d97706', winX + 18, winY + 5, 4, 5); // Ly trà đá
  rect(ctx, '#22c55e', winX + 20, winY + 2, 1, 5); // Ống hút xanh

  // Customer Motorbike (Honda Wave đỏ đen) parked on sidewalk in front
  const bikeX = winX + 12;
  const bikeY = bottom - 18;
  // Wheels
  rect(ctx, '#0f172a', bikeX, bikeY + 7, 7, 9);
  rect(ctx, '#0f172a', bikeX + 22, bikeY + 7, 7, 9);
  rect(ctx, '#94a3b8', bikeX + 2, bikeY + 9, 3, 5);
  rect(ctx, '#94a3b8', bikeX + 24, bikeY + 9, 3, 5);
  // Red Wave body frame & black seat
  rect(ctx, '#dc2626', bikeX + 6, bikeY + 4, 12, 6);
  rect(ctx, '#b91c1c', bikeX + 3, bikeY + 5, 5, 5);
  rect(ctx, '#1e293b', bikeX + 10, bikeY + 1, 10, 5); // Black seat
  rect(ctx, '#cbd5e1', bikeX + 16, bikeY + 9, 7, 3); // Exhaust pipe (ống pô)
  rect(ctx, '#64748b', bikeX + 3, bikeY - 2, 2, 5); // Handlebar mirror

  // Sidewalk standing A-frame menu sign (Biển hiệu chữ A)
  rect(ctx, '#ca8a04', winX - 2, bottom - 18, 5, 17);
  rect(ctx, '#fef08a', winX - 1, bottom - 17, 3, 15);
  rect(ctx, '#dc2626', winX - 1, bottom - 14, 3, 4); // "68"

  return canvas;
}

/**
 * Paints authentic CLB Bida H2S Trảng Dài (Biên Hòa) building facade:
 * - Solid 2-story building filling full 160x156 canvas with zero gaps.
 * - Roof & Parapet (y: 4..24): Charcoal parapet with gold / emerald LED crown rim, HVAC chillers & illuminated 8-ball + crossed cues crest.
 * - 2nd Floor (y: 26..68): Panoramic tinted observation glass showing 3 illuminated tournament billiard tables with emerald and royal blue felt, suspended LED canopies, and players aiming shots.
 * - Grand Bida Neon Signboard (y: 68..94): Full-width composite panel with gold & emerald borders, "CLB BIDA H2S", "TRẢNG DÀI · BIÊN HÒA", "BÀN THI ĐẤU QUỐC TẾ · MỞ 24/7".
 * - Ground Floor (y: 92..156):
 *   - Left: Showcase glass cabinet displaying Predator carbon cues & Bien Hoa Open trophy.
 *   - Center: Automatic sliding glass doors with brass trim, welcoming red carpet runner.
 *   - Right: Sidewalk parking with cuesmith's Honda SH scooter & standing illuminated totem sign.
 */
function paintBidaBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 168
  canvas.height = b.rect.h + BUILDING_ROOF; // 158
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const w = b.rect.w; // 160
  const bottom = canvas.height - 2; // 156
  const doorX = 4 + b.door.x * TILE - b.rect.x; // 36
  const doorW = b.door.w * TILE; // 64

  // 0. Base ground shadow
  rect(ctx, 'rgba(15, 23, 42, 0.45)', 4, bottom - 4, w + 4, 6);

  // 1. FULL SOLID 2-STORY BUILDING STRUCTURE (y: 4..156)
  rect(ctx, '#030712', 4, 4, w, bottom - 4); // Dark foundation
  rect(ctx, '#0f172a', 5, 5, w - 2, bottom - 5); // Charcoal paneling
  // Architectural horizontal grooved seams
  for (let y = 18; y < bottom - 4; y += 10) {
    rect(ctx, '#090d16', 5, y, w - 2, 1);
    rect(ctx, '#1e293b', 5, y + 1, w - 2, 1);
  }

  // Emerald & Gold vertical channel pilasters flanking the building
  rect(ctx, '#047857', 4, 4, 3, bottom - 4);
  rect(ctx, '#10b981', 5, 4, 1.5, bottom - 4); // Bright emerald tube
  rect(ctx, '#b45309', w + 1, 4, 3, bottom - 4);
  rect(ctx, '#facc15', w + 2, 4, 1.5, bottom - 4); // Gold tube

  // 2. Rooftop & Parapet with Industrial AC Chillers (y: 4..24)
  rect(ctx, '#090d16', 2, 4, w + 4, 8);
  rect(ctx, '#1e293b', 3, 5, w + 2, 6);
  rect(ctx, '#10b981', 4, 11, w, 2); // Glowing emerald crown rim
  rect(ctx, '#facc15', 6, 11, w - 4, 1);

  // Dual industrial rooftop cooling units (Hệ thống điều hòa phòng lạnh 100% cho CLB Bida)
  for (const cx of [14, w - 38]) {
    rect(ctx, '#090d16', cx - 1, 6, 22, 16);
    rect(ctx, '#1e293b', cx, 7, 20, 14);
    rect(ctx, '#334155', cx + 2, 8, 16, 12);
    oval(ctx, '#0f172a', cx + 10, 14, 6, 4);
    rect(ctx, '#94a3b8', cx + 7, 14, 7, 1);
    rect(ctx, '#94a3b8', cx + 10, 11, 1, 7);
  }

  // Central 8-Ball & Crossed Cues Crest on Roof Parapet
  const crestX = w / 2 + 4;
  rect(ctx, '#090d16', crestX - 12, 5, 24, 18);
  rect(ctx, '#d4af37', crestX - 10, 6, 20, 16);
  rect(ctx, '#0f172a', crestX - 8, 7, 16, 14);
  // Gold 8-ball
  oval(ctx, '#facc15', crestX, 14, 6, 6);
  oval(ctx, '#09090b', crestX, 14, 5, 5);
  oval(ctx, '#ffffff', crestX, 14, 2.5, 2.5);
  ctx.font = '800 4.5px sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText('8', crestX, 15.5);

  // 3. Second Floor Billiards Arena Panoramic Window (y: 26..68)
  const f2X = 8;
  const f2W = w - 8; // 152
  const f2Y = 26;
  const f2H = 40;

  rect(ctx, '#090d16', f2X - 1, f2Y - 1, f2W + 2, f2H + 2);
  rect(ctx, '#030712', f2X, f2Y, f2W, f2H); // Dark interior
  rect(ctx, 'rgba(16, 185, 129, 0.08)', f2X, f2Y, f2W, f2H); // Emerald sheen

  // Draw 3 mini tournament tables visible through the glass on 2nd floor
  const drawMiniTable = (tx: number, feltColor: string, _label: string) => {
    // Overhead light
    rect(ctx, '#09090b', tx + 2, f2Y + 4, 38, 3);
    rect(ctx, '#facc15', tx + 4, f2Y + 7, 34, 1);
    // Table frame
    rect(ctx, '#451a03', tx, f2Y + 12, 42, 22);
    rect(ctx, '#78350f', tx + 1, f2Y + 13, 40, 2);
    // Felt surface
    rect(ctx, feltColor, tx + 3, f2Y + 15, 36, 16);
    // Balls on felt
    oval(ctx, '#ffffff', tx + 8, f2Y + 23, 1.5, 1.5);
    oval(ctx, '#facc15', tx + 26, f2Y + 23, 1.5, 1.5);
    oval(ctx, '#ef4444', tx + 30, f2Y + 21, 1.5, 1.5);
    oval(ctx, '#09090b', tx + 32, f2Y + 23, 1.5, 1.5);
    // Player silhouette holding cue stick
    rect(ctx, '#090d16', tx + 2, f2Y + 20, 4, 10);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx + 4, f2Y + 22);
    ctx.lineTo(tx + 7, f2Y + 23);
    ctx.stroke();
  };

  drawMiniTable(f2X + 6, '#047857', 'B1'); // Table 1: Pool Emerald Green
  drawMiniTable(f2X + 54, '#1d4ed8', 'B2'); // Table 2: Carom Royal Blue
  drawMiniTable(f2X + 102, '#065f46', 'B3'); // Table 3: VIP Tournament

  // 4. Grand Bida Signboard ("CLB BIDA H2S · BIÊN HÒA") (y: 68..94)
  const signX = 6;
  const signW = w - 4; // 156
  const signY = 68;
  const signH = 26;

  rect(ctx, 'rgba(0, 0, 0, 0.65)', signX - 1, signY - 1, signW + 2, signH + 3);
  rect(ctx, '#d4af37', signX - 1, signY - 1, signW + 2, 2); // Gold neon top border
  rect(ctx, '#10b981', signX - 1, signY + signH - 1, signW + 2, 2); // Emerald neon bottom border
  rect(ctx, '#09090b', signX, signY, signW, signH);

  // Corner accents
  rect(ctx, '#facc15', signX, signY, 6, 3);
  rect(ctx, '#facc15', signX, signY, 3, 6);
  rect(ctx, '#34d399', signX + signW - 6, signY + signH - 3, 6, 3);
  rect(ctx, '#34d399', signX + signW - 3, signY + signH - 6, 3, 6);

  // Left 8-Ball badge
  oval(ctx, '#facc15', signX + 13, signY + 13, 7, 7);
  oval(ctx, '#09090b', signX + 13, signY + 13, 5.5, 5.5);
  oval(ctx, '#ffffff', signX + 13, signY + 13, 3, 3);
  ctx.font = '800 4.5px sans-serif';
  ctx.fillStyle = '#09090b';
  ctx.textAlign = 'center';
  ctx.fillText('8', signX + 13, signY + 14.5);

  // Sign text
  ctx.font = '700 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#34d399';
  ctx.fillText('⚡ TRẢNG DÀI · BIÊN HÒA ⚡', signX + signW / 2 + 4, signY + 3);

  // Main bold typography
  ctx.font = '900 13px "Inter", sans-serif';
  ctx.fillStyle = '#b45309';
  ctx.fillText('CLB BIDA H2S', signX + signW / 2 + 5, signY + 9);
  ctx.fillStyle = '#facc15';
  ctx.fillText('CLB BIDA H2S', signX + signW / 2 + 4, signY + 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CLB BIDA H2S', signX + signW / 2 + 3.5, signY + 7.6);

  ctx.font = '700 4.5px sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.fillText('BÀN THI ĐẤU QUỐC TẾ · GIAO LƯU 1V1 · MỞ 24/7', signX + signW / 2 + 4, signY + 19);

  // 5. Ground Floor Entrance & Lobby (y: 92..156, height = 64px)
  // Left: Showcase Cue Cabinet & Trophy Showcase
  const cartX = 6;
  const cartW = 28;
  const cartY = 104;
  const cartH = 48;
  rect(ctx, '#78350f', cartX - 1, cartY - 1, cartW + 2, cartH + 2);
  rect(ctx, '#451a03', cartX, cartY, cartW, cartH);
  rect(ctx, 'rgba(254, 240, 138, 0.2)', cartX + 2, cartY + 2, cartW - 4, cartH - 4); // Illuminated glass
  // Cues inside cabinet
  for (let cx = cartX + 5; cx < cartX + cartW - 4; cx += 4) {
    rect(ctx, '#0f172a', cx, cartY + 6, 2, 34); // Carbon cue
    rect(ctx, '#38bdf8', cx, cartY + 6, 2, 3); // Chalk tip
    rect(ctx, '#facc15', cx, cartY + 28, 2, 8); // Gold wrap
  }
  // Gold Trophy cup on bottom shelf
  rect(ctx, '#facc15', cartX + 8, cartY + cartH - 10, 12, 6);
  rect(ctx, '#eab308', cartX + 11, cartY + cartH - 4, 6, 3);

  // Center: Automatic Glass Entrance with Red Carpet Runner
  const dy = 104;
  const doorH = 48;
  rect(ctx, '#030712', doorX - 1, dy - 1, doorW + 2, doorH + 2);
  rect(ctx, '#020617', doorX, dy, doorW, doorH); // Dark lobby
  // Gold LED sensor bar above doors
  rect(ctx, '#facc15', doorX + 6, dy + 2, doorW - 12, 3);
  rect(ctx, '#fef08a', doorX + 8, dy + 2, doorW - 16, 1);

  // Inside view: Reception desk & drink cooler
  rect(ctx, '#1e293b', doorX + 8, dy + 14, 24, 14); // Reception counter
  rect(ctx, '#10b981', doorX + 12, dy + 16, 8, 6); // POS billing screen
  rect(ctx, '#0284c7', doorX + 36, dy + 10, 20, 24); // Cooler
  rect(ctx, '#ef4444', doorX + 38, dy + 12, 4, 6); // Redbull / Sting

  // Automatic glass sliding doors with gold handles
  rect(ctx, 'rgba(16, 185, 129, 0.2)', doorX, dy + 6, 8, doorH - 10);
  rect(ctx, '#d4af37', doorX + 7, dy + 6, 1, doorH - 10);
  rect(ctx, 'rgba(16, 185, 129, 0.2)', doorX + doorW - 8, dy + 6, 8, doorH - 10);
  rect(ctx, '#d4af37', doorX + doorW - 8, dy + 6, 1, doorH - 10);

  // Red Welcome Carpet Runner
  const matX = doorX + 4;
  const matW = doorW - 8;
  const matY = bottom - 6;
  rect(ctx, '#dc2626', matX, matY, matW, 5);
  rect(ctx, '#facc15', matX + 1, matY + 1, matW - 2, 2);

  // Right: Sidewalk Parking with Customer's Honda SH Scooter & Standing LED Totem
  const winX = doorX + doorW + 2;
  const winW = w - winX - 2; // 56px
  const winY = 104;
  const winH = 48;

  rect(ctx, '#090d16', winX - 1, winY - 1, winW + 2, winH + 2);
  rect(ctx, '#020617', winX, winY, winW, winH);
  rect(ctx, 'rgba(15, 23, 42, 0.85)', winX, winY, winW, winH);
  // Interior warm LED strips visible through glass
  rect(ctx, '#facc15', winX + 4, winY + 8, winW - 14, 2);
  rect(ctx, '#10b981', winX + 8, winY + 16, winW - 20, 2);

  // Premium Honda SH 160i parked on sidewalk
  const bikeX = winX + 6;
  const bikeY = bottom - 19;
  // Wheels
  rect(ctx, '#020617', bikeX, bikeY + 7, 7, 10);
  rect(ctx, '#020617', bikeX + 22, bikeY + 7, 7, 10);
  rect(ctx, '#cbd5e1', bikeX + 2, bikeY + 9, 3, 6);
  rect(ctx, '#cbd5e1', bikeX + 24, bikeY + 9, 3, 6);
  // White & Chrome luxury SH body
  rect(ctx, '#f8fafc', bikeX + 5, bikeY + 2, 16, 9);
  rect(ctx, '#94a3b8', bikeX + 8, bikeY + 4, 8, 3);
  rect(ctx, '#451a03', bikeX + 10, bikeY - 1, 12, 5); // Brown leather seat
  rect(ctx, '#38bdf8', bikeX + 4, bikeY + 1, 4, 3); // LED Headlight
  rect(ctx, '#64748b', bikeX + 18, bikeY + 8, 7, 3); // Exhaust

  // Standing LED Totem ("BIDA 1V1 · TẠO PHÒNG")
  rect(ctx, '#d4af37', winX + winW - 6, bottom - 30, 5, 28);
  rect(ctx, '#030712', winX + winW - 5, bottom - 29, 3, 26);
  rect(ctx, '#10b981', winX + winW - 5, bottom - 27, 3, 6);
  rect(ctx, '#facc15', winX + winW - 5, bottom - 18, 3, 6);

  return canvas;
}

function paintCyberNetBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8;
  canvas.height = b.rect.h + BUILDING_ROOF;
  const ctx = canvas.getContext('2d')!;
  const w = b.rect.w;
  const bottom = canvas.height - 2;
  rect(ctx, '#020617', 0, 8, w + 8, bottom - 8);
  rect(ctx, '#1e293b', 4, 12, w, bottom - 12);
  for (let y = 16; y < bottom - 80; y += 9) rect(ctx, '#334155', 7, y, w - 6, 2);
  rect(ctx, '#38bdf8', 4, bottom - 78, w, 3);
  rect(ctx, '#0f172a', 8, bottom - 74, w - 8, 22);
  ctx.font = '800 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('CYBER GAME HNT', canvas.width / 2, bottom - 58);
  rect(ctx, '#a855f7', 4, bottom - 49, w, 2);
  const dx = 4 + b.door.x * TILE - b.rect.x;
  rect(ctx, '#0284c7', dx + 8, bottom - 43, b.door.w * TILE - 16, 43);
  rect(ctx, '#0c4a6e', dx + 11, bottom - 40, b.door.w * TILE - 22, 39);
  rect(ctx, '#38bdf8', dx + (b.door.w * TILE) / 2, bottom - 40, 2, 39);
  for (const x of [12, w - 28]) {
    rect(ctx, '#020617', x, bottom - 40, 24, 24);
    rect(ctx, '#2563eb', x + 3, bottom - 37, 18, 15);
    rect(ctx, '#ec4899', x + 3, bottom - 21, 18, 2);
  }
  return canvas;
}

/**
 * Real-world Bcons Apartment Building ("Chung Cư Bcons Plaza / Bcons City Biên Hòa"):
 * - Signature Bcons Contemporary Architecture:
 *   - Rooftop: Modern flat architectural parapet, sky garden pergola & blue "BCONS" skyline sign (y: 6..42)
 *   - Facade: Pearl-white base stucco accented with Bcons signature vertical terracotta-orange (#ea580c)
 *     and deep navy (#1e3a8a) architectural color blocks running up the building (y: 42..196)
 *   - Individual Residential Balconies with glass balustrades & charcoal AC compressor louver grilles
 *   - Ground Floor Commercial Shophouse Podium: Grand glass lobby, Bcons Plaza 3D acrylic sign,
 *     24/7 convenience store (WinMart/GS25 style) & resident cafe lounge (y: 196..253)
 * - Zero window collision with entrance doors!
 */
export function paintBconsApartment(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 264
  canvas.height = b.rect.h + BUILDING_ROOF; // 256
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const w = canvas.width; // 264
  const bottom = canvas.height - 3; // 253
  const eave = 42;

  // 0. Base ground shadow
  oval(ctx, 'rgba(15, 23, 42, 0.35)', w / 2, bottom + 1, w / 2 - 4, 5);

  // 1. ROOFTOP PARAPET & SKYLINE CROWN (y: 6..42, 36px)
  rect(ctx, '#0f172a', 4, 10, w - 8, eave - 10);
  rect(ctx, '#1e293b', 6, 12, w - 12, eave - 12);
  rect(ctx, '#0284c7', 4, 10, w - 8, 2); // Bcons blue neon top rim

  // Rooftop Sky Garden Pergola (left side: x: 18..88)
  rect(ctx, '#78350f', 18, 14, 70, 3);
  for (let px = 22; px < 86; px += 8) {
    rect(ctx, '#92400e', px, 14, 2, 16);
    rect(ctx, '#15803d', px - 1, 12, 4, 3); // Rooftop climbing vines
  }

  // Rooftop Telecom Antennas & Solar Panels (right side: x: 174..246)
  rect(ctx, '#1e293b', 178, 16, 56, 14);
  rect(ctx, '#0284c7', 180, 18, 52, 10); // Blue solar panels
  rect(ctx, '#475569', 242, 8, 2, 22); // Lightning rod / antenna spire
  rect(ctx, '#ef4444', 241, 6, 4, 2); // Red aviation warning beacon

  // BCONS Rooftop Skyline Logo Sign (center: x = 96..168, y: 12..36)
  const logoBoxW = 72;
  const logoBoxX = (w - logoBoxW) / 2;
  rect(ctx, '#0f172a', logoBoxX, 14, logoBoxW, 20);
  rect(ctx, '#0284c7', logoBoxX + 1, 15, logoBoxW - 2, 18);
  rect(ctx, '#0369a1', logoBoxX + 2, 16, logoBoxW - 4, 16);

  // Bcons Logo: Orange & Blue diamond crest + "BCONS"
  rect(ctx, '#ea580c', logoBoxX + 6, 20, 8, 8); // Orange diamond
  rect(ctx, '#38bdf8', logoBoxX + 10, 20, 4, 8);
  ctx.font = '900 9px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BCONS', logoBoxX + 44, 25);

  // 2. MAIN RESIDENTIAL FACADE (y: 42..196, 154px tall)
  rect(ctx, '#1e293b', 4, eave, w - 8, 154);
  rect(ctx, '#f8fafc', 6, eave + 1, w - 12, 152);

  // Signature Bcons Vertical Terracotta-Orange & Navy Accent Bands running up the facade
  rect(ctx, '#ea580c', 54, eave + 1, 12, 150);
  rect(ctx, '#f97316', 56, eave + 1, 8, 150);
  rect(ctx, '#ea580c', 198, eave + 1, 12, 150);
  rect(ctx, '#f97316', 200, eave + 1, 8, 150);
  rect(ctx, '#1e3a8a', 104, eave + 1, 8, 150);
  rect(ctx, '#0f172a', 152, eave + 1, 8, 150);

  // 5 Residential Apartment Balcony Suites (Bay Xs)
  const bayXs = [14, 68, 114, 162, 214];

  const drawBconsBalconySuite = (wx: number, wy: number) => {
    const ww = 38;
    const wh = 36;

    // Outer structural window recess
    rect(ctx, '#334155', wx - 1, wy - 1, ww + 2, wh + 2);
    rect(ctx, '#ffffff', wx, wy, ww, wh);

    // Sliding glass balcony doors (Xingfa dark grey aluminum frame & blue-tinted glass)
    const glassW = ww - 10;
    rect(ctx, '#0f172a', wx + 2, wy + 2, glassW, wh - 10);
    rect(ctx, '#38bdf8', wx + 3, wy + 3, glassW - 2, wh - 12);
    rect(ctx, '#e0f2fe', wx + 4, wy + 4, glassW - 4, wh - 14);

    // Sheer linen curtain inside
    rect(ctx, 'rgba(255, 255, 255, 0.9)', wx + 4, wy + 4, 4, wh - 14);

    // Signature Bcons Detail: Lam che cục nóng điều hòa (AC Compressor Louver Grille)
    const louverX = wx + ww - 9;
    rect(ctx, '#0f172a', louverX, wy + 2, 7, wh - 6);
    rect(ctx, '#334155', louverX + 1, wy + 3, 5, wh - 8);
    for (let ly = wy + 4; ly < wy + wh - 6; ly += 4) {
      rect(ctx, '#1e293b', louverX + 1, ly, 5, 2);
      rect(ctx, '#475569', louverX + 1, ly, 5, 1);
    }

    // Modern Balcony Railing
    rect(ctx, '#0f172a', wx, wy + wh - 12, ww, 12);
    rect(ctx, 'rgba(224, 242, 254, 0.85)', wx + 1, wy + wh - 11, ww - 2, 10); // Tinted safety glass
    rect(ctx, '#f8fafc', wx, wy + wh - 12, ww, 2); // Stainless steel top handrail
    rect(ctx, '#64748b', wx, wy + wh - 2, ww, 2); // Bottom rail base

    // Tiny apartment room number badge
    rect(ctx, '#ea580c', wx + 3, wy + 3, 5, 3);
  };

  // --- TẦNG 3 (y: 52..88, 36px) ---
  for (const bx of bayXs) {
    drawBconsBalconySuite(bx, 52);
  }

  // Architectural dividing concrete horizontal molding
  rect(ctx, '#cbd5e1', 6, 92, w - 12, 4);
  rect(ctx, '#94a3b8', 6, 93, w - 12, 1);

  // --- TẦNG 2 (y: 98..134, 36px) ---
  for (const bx of bayXs) {
    drawBconsBalconySuite(bx, 98);
  }

  // Architectural dividing concrete horizontal molding
  rect(ctx, '#cbd5e1', 6, 138, w - 12, 4);
  rect(ctx, '#94a3b8', 6, 139, w - 12, 1);

  // --- TẦNG 1 (y: 144..180, 36px) ---
  for (const bx of bayXs) {
    drawBconsBalconySuite(bx, 144);
  }

  // 3. ARCHITECTURAL CANOPY & BCONS PLAZA SIGNBOARD (y: 186..206, 20px)
  rect(ctx, '#0f172a', 4, 186, w - 8, 4);
  rect(ctx, '#0284c7', 6, 188, w - 12, 2); // Bcons blue LED strip
  rect(ctx, 'rgba(224, 242, 254, 0.75)', 8, 190, w - 16, 4); // Glass canopy overhang

  // Luxury 3D Acrylic Signboard ("BCONS PLAZA - BIÊN HÒA")
  const signW = 196;
  const signX = (w - signW) / 2;
  const signY = 192;
  const signH = 15;
  rect(ctx, '#0f172a', signX - 1, signY - 1, signW + 2, signH + 2);
  rect(ctx, '#0284c7', signX, signY, signW, signH); // Bcons blue frame
  rect(ctx, '#0f172a', signX + 1, signY + 1, signW - 2, signH - 2);

  // Sign text with Bcons logo crest
  rect(ctx, '#ea580c', signX + 6, signY + 3, 8, 8); // Orange Bcons emblem
  rect(ctx, '#38bdf8', signX + 10, signY + 3, 4, 8);
  ctx.font = '900 7px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CHUNG CƯ BCONS PLAZA · BIÊN HÒA', w / 2 + 6, signY + signH / 2);

  // 4. GROUND FLOOR COMMERCIAL SHOPHOUSE PODIUM (y: 206..253, 47px tall!)
  rect(ctx, '#0f172a', 6, 206, w - 12, bottom - 206);
  rect(ctx, '#1e293b', 8, 208, w - 16, bottom - 208);

  // Left Shophouse: 24/7 Convenience Store (WinMart / GS25 style - x: 14..94, y: 212..250)
  const storeX = 14;
  const storeW = 80;
  rect(ctx, '#0f172a', storeX, 212, storeW, 38);
  rect(ctx, 'rgba(254, 243, 199, 0.95)', storeX + 2, 214, storeW - 4, 34); // Glowing lit interior
  rect(ctx, '#dc2626', storeX + 2, 214, storeW - 4, 6);
  rect(ctx, '#facc15', storeX + 2, 219, storeW - 4, 2);
  for (let sx = storeX + 6; sx < storeX + storeW - 12; sx += 14) {
    rect(ctx, '#475569', sx, 226, 10, 18);
    rect(ctx, '#f43f5e', sx + 1, 228, 8, 3); // Snack packages
    rect(ctx, '#38bdf8', sx + 1, 234, 8, 3); // Drinks
    rect(ctx, '#22c55e', sx + 1, 240, 8, 3);
  }

  // Right Shophouse: Bcons Resident Coffee & Co-Working Lounge (x: 170..250, y: 212..250)
  const cafeX = 170;
  const cafeW = 80;
  rect(ctx, '#0f172a', cafeX, 212, cafeW, 38);
  rect(ctx, 'rgba(254, 249, 195, 0.95)', cafeX + 2, 214, cafeW - 4, 34);
  rect(ctx, '#451a03', cafeX + 2, 214, cafeW - 4, 6);
  rect(ctx, '#ca8a04', cafeX + 2, 219, cafeW - 4, 2);
  rect(ctx, '#78350f', cafeX + 16, 228, 48, 6);
  rect(ctx, '#451a03', cafeX + 22, 234, 4, 12);
  rect(ctx, '#451a03', cafeX + 54, 234, 4, 12);
  rect(ctx, '#0284c7', cafeX + 6, 226, 8, 18); // Modern blue armchair
  rect(ctx, '#f97316', cafeX + cafeW - 14, 226, 8, 18); // Orange Bcons armchair

  // Central Grand Glass Entrance Lobby (doorX = 100, doorW = 64, y: 208..252)
  const doorX = 4 + b.door.x * TILE - b.rect.x; // 100
  const doorW = b.door.w * TILE; // 64
  const dy = 208;
  const dh = bottom - dy; // 45px

  rect(ctx, '#0f172a', doorX - 2, dy, doorW + 4, dh);
  rect(ctx, '#0284c7', doorX - 1, dy + 1, doorW + 2, dh - 1); // Bcons blue outer trim
  rect(ctx, '#fef3c7', doorX + 2, dy + 2, doorW - 4, dh - 4);

  // Checkered granite marble floor
  for (let cy = dy + 16; cy < bottom - 2; cy += 8) {
    for (let cx = doorX + 4; cx < doorX + doorW - 4; cx += 8) {
      if ((Math.floor((cx - doorX) / 8) + Math.floor((cy - dy) / 8)) % 2 === 0) {
        rect(ctx, '#fed7aa', cx, cy, 8, 8);
      }
    }
  }

  // Reception desk with Bcons Gold Logo
  rect(ctx, '#1e293b', doorX + 16, dy + 14, 32, 12);
  rect(ctx, '#ca8a04', doorX + 18, dy + 16, 28, 8);
  rect(ctx, '#ea580c', doorX + doorW / 2 - 4, dy + 18, 8, 4); // Bcons emblem
  rect(ctx, '#facc15', doorX + doorW / 2 - 5, dy + 4, 10, 4); // Chandelier light

  // Double automatic sliding glass doors with stainless handles
  const halfW = (doorW - 8) / 2;
  rect(ctx, 'rgba(224, 242, 254, 0.75)', doorX + 2, dy + 2, halfW, dh - 6);
  rect(ctx, '#cbd5e1', doorX + 2, dy + 2, halfW, 1);
  rect(ctx, '#38bdf8', doorX + 2 + halfW - 3, dy + 12, 2, 16);
  rect(ctx, 'rgba(224, 242, 254, 0.75)', doorX + halfW + 6, dy + 2, halfW, dh - 6);
  rect(ctx, '#cbd5e1', doorX + halfW + 6, dy + 2, halfW, 1);
  rect(ctx, '#38bdf8', doorX + halfW + 7, dy + 12, 2, 16);

  // Red Welcome Carpet Runner
  const matW = doorW - 12;
  rect(ctx, '#991b1b', doorX + 6, bottom - 6, matW, 6);
  rect(ctx, '#dc2626', doorX + 7, bottom - 5, matW - 2, 4);
  rect(ctx, '#fef08a', doorX + 12, bottom - 4, matW - 12, 2);

  // Granite entrance step
  rect(ctx, '#cbd5e1', doorX - 4, bottom - 2, doorW + 8, 2);

  // 4 Modern LED Pillar Lights
  for (const lx of [doorX - 6, doorX + doorW + 4, 10, w - 14]) {
    rect(ctx, '#0f172a', lx, 214, 4, 12);
    rect(ctx, '#0284c7', lx + 1, 215, 2, 10);
    rect(ctx, '#fef08a', lx, 218, 4, 4); // Bright white-yellow LED
  }

  return canvas;
}

/**
 * 1. BEAN THERE · SPECIALTY COFFEE & ROASTERY
 * Modern Industrial Chic Glasshouse Cafe with warm Scandinavian timber louvers,
 * illuminated 3D signboard, La Marzocco espresso bar, hanging Edison bulbs,
 * and double frameless glass pivot doors.
 */
function paintModernCafeBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 232
  canvas.height = b.rect.h + BUILDING_ROOF; // 190
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const w = b.rect.w; // 224
  const bottom = canvas.height - 2; // 188
  const dx = 4 + b.door.x * TILE - b.rect.x; // 68
  const doorW = b.door.w * TILE; // 64

  // Ground contact shadow
  oval(ctx, 'rgba(15, 23, 42, 0.35)', w / 2 + 4, bottom + 1, w / 2 - 4, 4);

  // Modern Matte Black & Industrial Steel Building Frame (y: 10..bottom)
  rect(ctx, '#0f172a', 3, 10, w + 2, bottom - 10);
  rect(ctx, '#1e293b', 4, 12, w, bottom - 12);

  // Rooftop flat architectural parapet with vertical standing seams (y: 10..36)
  rect(ctx, '#020617', 2, 10, w + 4, 6);
  rect(ctx, '#334155', 4, 16, w, 20);
  for (let sx = 12; sx < w; sx += 20) {
    rect(ctx, '#1e293b', sx, 16, 2, 20);
    rect(ctx, '#475569', sx + 2, 16, 1, 20);
  }
  rect(ctx, '#0f172a', 3, 36, w + 2, 3); // Parapet base shadow

  // Second Floor Facade: Warm Scandinavian Teak Wood Louvers (y: 39..92)
  rect(ctx, '#78350f', 5, 39, w - 2, 53);
  rect(ctx, '#b45309', 6, 40, w - 4, 51);
  for (let ly = 41; ly < 90; ly += 5) {
    rect(ctx, '#d97706', 7, ly, w - 6, 3);
    rect(ctx, '#fde68a', 8, ly, w - 8, 1); // warm wood grain sheen
  }
  // Architectural Ribbon Windows on Second Floor
  for (const wx of [16, w - 68]) {
    rect(ctx, '#0f172a', wx, 48, 52, 28);
    rect(ctx, '#0284c7', wx + 2, 50, 48, 24);
    rect(ctx, '#38bdf8', wx + 4, 52, 44, 12);
    rect(ctx, 'rgba(254, 240, 138, 0.65)', wx + 6, 54, 20, 18); // cozy interior light
    rect(ctx, '#0f172a', wx + 26, 50, 2, 24); // window frame mullion
  }

  // Modern Backlit 3D Acrylic Signboard (y: 92..112)
  rect(ctx, '#0f172a', 14, 92, w - 20, 22);
  rect(ctx, '#1e293b', 16, 94, w - 24, 18);
  // Warm LED backlight halo
  rect(ctx, 'rgba(254, 240, 138, 0.4)', 18, 95, w - 28, 16);
  ctx.font = '800 10.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('CÀ PHÊ BEAN THERE', canvas.width / 2, 104, w - 36);
  ctx.font = '600 7px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('CÀ PHÊ ĐẶC SẢN & RANG XAY MỘC', canvas.width / 2, 111, w - 36);

  // Modern Industrial Steel Canopy projecting over ground floor (y: 114..119)
  rect(ctx, '#020617', 6, 114, w - 4, 5);
  rect(ctx, '#475569', 8, 115, w - 8, 2);
  for (let cx = 12; cx < w; cx += 28) {
    rect(ctx, '#fef08a', cx, 118, 3, 2); // Downlight LED spots
  }

  // Ground Floor: Expansive Floor-to-Ceiling Panoramic Glass Showroom (y: 119..bottom)
  rect(ctx, '#0f172a', 6, 119, w - 4, bottom - 119);
  rect(ctx, '#0284c7', 8, 121, w - 8, bottom - 123);
  rect(ctx, '#38bdf8', 10, 123, w - 12, bottom - 127);

  // Visible Interior Roastery & Espresso Bar (Left Wing: x = 12..dx - 6)
  // Polished terrazzo counter
  rect(ctx, '#cbd5e1', 14, bottom - 38, dx - 22, 28);
  rect(ctx, '#e2e8f0', 14, bottom - 40, dx - 22, 3);
  // Chrome Espresso Machine (La Marzocco Style)
  rect(ctx, '#0f172a', 22, bottom - 54, 26, 15);
  rect(ctx, '#f8fafc', 23, bottom - 53, 24, 13);
  rect(ctx, '#94a3b8', 25, bottom - 47, 8, 6); // portafilter groups
  rect(ctx, '#ef4444', 33, bottom - 52, 4, 3); // red brand badge
  // Professional grinder & coffee bags
  rect(ctx, '#1e293b', 50, bottom - 56, 8, 17);
  rect(ctx, '#d97706', 14, bottom - 50, 6, 10); // coffee bean bag

  // Hanging warm Edison bulb pendants with ambient glow
  for (const px of [28, 54]) {
    rect(ctx, '#0f172a', px, 121, 1, 12); // cord
    rect(ctx, '#facc15', px - 2, 133, 5, 5); // bulb
    rect(ctx, 'rgba(254, 240, 138, 0.5)', px - 4, 131, 9, 9); // glow
  }

  // Right Wing Interior (x = dx + doorW + 6..w - 12):
  const rx = dx + doorW + 8;
  const rw = w - 12 - rx;
  // Modern bookshelf & pourover coffee station
  rect(ctx, '#b45309', rx, bottom - 56, rw, 46);
  for (let by = bottom - 52; by < bottom - 14; by += 14) {
    rect(ctx, '#fde68a', rx + 2, by, rw - 4, 2);
    // Display items: books, brass cups
    rect(ctx, '#f8fafc', rx + 4, by - 8, 6, 8);
    rect(ctx, '#eab308', rx + 14, by - 6, 8, 6);
  }

  // Entrance Double Glass Doors at dx = 68, doorW = 64
  rect(ctx, '#0f172a', dx, bottom - 62, doorW, 62);
  rect(ctx, '#38bdf8', dx + 2, bottom - 60, doorW - 4, 58);
  rect(ctx, '#e0f2fe', dx + 4, bottom - 58, doorW - 8, 54);
  // Center door split mullion & full-height brushed chrome pull handles
  rect(ctx, '#0f172a', dx + doorW / 2 - 1, bottom - 60, 2, 58);
  rect(ctx, '#f8fafc', dx + doorW / 2 - 6, bottom - 46, 2, 30);
  rect(ctx, '#f8fafc', dx + doorW / 2 + 4, bottom - 46, 2, 30);
  // Modern charcoal entrance doormat
  rect(ctx, '#1e293b', dx + 6, bottom - 4, doorW - 12, 4);

  // Modern Geometric Planters flanking entrance
  for (const plx of [dx - 14, dx + doorW + 4]) {
    rect(ctx, '#0f172a', plx - 1, bottom - 24, 12, 24);
    rect(ctx, '#f8fafc', plx, bottom - 23, 10, 22); // white planter
    rect(ctx, '#15803d', plx + 2, bottom - 32, 6, 10); // lush ficus plant
    rect(ctx, '#22c55e', plx + 1, bottom - 30, 8, 5);
  }

  return canvas;
}

/**
 * 2. THREADBARE BOUTIQUE · GEN-Z STREETWEAR
 * Contemporary Minimalist Pearl White Terrazzo facade with champagne brass reveals,
 * neon script lightbox, lighted vitrine showcase with stylish mannequin,
 * and frameless automatic glass sliding doors.
 */
function paintModernFashionBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 168
  canvas.height = b.rect.h + BUILDING_ROOF; // 190
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const w = b.rect.w; // 160
  const bottom = canvas.height - 2; // 188
  const dx = 4 + b.door.x * TILE - b.rect.x; // 36
  const doorW = b.door.w * TILE; // 64

  oval(ctx, 'rgba(15, 23, 42, 0.35)', w / 2 + 4, bottom + 1, w / 2 - 4, 4);

  // Contemporary Pearl White Terrazzo & Brass Luxury Architecture (y: 8..bottom)
  rect(ctx, '#0f172a', 3, 8, w + 2, bottom - 8);
  rect(ctx, '#f8fafc', 4, 10, w, bottom - 10);
  rect(ctx, '#e2e8f0', 6, 12, w - 4, bottom - 12);

  // Rooftop architectural coping in brushed champagne brass (y: 8..24)
  rect(ctx, '#d97706', 2, 8, w + 4, 5);
  rect(ctx, '#f59e0b', 3, 9, w + 2, 2);
  rect(ctx, '#f1f5f9', 4, 14, w, 20);

  // Upper Facade: Monolithic Minimalist White Terrazzo with Vertical Feature Slit
  rect(ctx, '#ffffff', 8, 34, w - 8, 48);
  // Brass brand reveal groove lines
  rect(ctx, '#d97706', 12, 40, w - 16, 1);
  rect(ctx, '#f59e0b', 12, 78, w - 16, 1);
  // Recessed architectural vertical window with soft warm glow
  rect(ctx, '#0f172a', w / 2 - 8, 44, 16, 32);
  rect(ctx, '#fef08a', w / 2 - 6, 46, 12, 28);
  rect(ctx, '#f59e0b', w / 2 - 1, 44, 2, 32);

  // Glowing Neon Signboard: "THREADBARE BOUTIQUE" (y: 84..108)
  rect(ctx, '#0f172a', 10, 84, w - 12, 24);
  rect(ctx, '#701a75', 12, 86, w - 16, 20); // deep royal magenta/plum
  rect(ctx, '#a21caf', 14, 88, w - 20, 16);
  // Neon script lettering
  ctx.font = '800 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fdf4ff';
  ctx.fillText('THREADBARE', canvas.width / 2, 97, w - 28);
  ctx.font = '700 7px sans-serif';
  ctx.fillStyle = '#f472b6';
  ctx.fillText('THỜI TRANG GEN-Z & STREETWEAR', canvas.width / 2, 104, w - 28);

  // Ground Floor Showcase Vitrine & Entrance (y: 110..bottom)
  rect(ctx, '#0f172a', 6, 110, w - 4, bottom - 110);
  rect(ctx, '#fdf4ff', 8, 112, w - 8, bottom - 114);

  // Left Showcase Vitrine (x = 8..dx - 4):
  const leftW = dx - 12;
  rect(ctx, '#0f172a', 8, 112, leftW, bottom - 114);
  rect(ctx, '#0284c7', 10, 114, leftW - 4, bottom - 118);
  rect(ctx, '#38bdf8', 12, 116, leftW - 8, bottom - 122);
  // Showcase podium & stylish mannequin silhouette
  rect(ctx, '#f59e0b', 14, bottom - 26, leftW - 12, 6);
  rect(ctx, '#ffffff', 14, bottom - 20, leftW - 12, 18);
  // Mannequin wearing streetwear hoodie & sneakers
  rect(ctx, '#fbcfe8', 18, bottom - 60, 8, 8); // head
  rect(ctx, '#9333ea', 16, bottom - 52, 12, 20); // purple hoodie
  rect(ctx, '#1e293b', 17, bottom - 32, 10, 14); // cargo pants
  rect(ctx, '#ffffff', 16, bottom - 18, 12, 4); // chunky white sneakers
  // Directional gallery spotlights shining down on mannequin
  rect(ctx, '#ffffff', 20, 116, 4, 3);
  rect(ctx, 'rgba(255, 255, 255, 0.45)', 16, 119, 12, 30);

  // Entrance Automatic Sliding Glass Doors at dx = 36, doorW = 64
  rect(ctx, '#0f172a', dx, bottom - 66, doorW, 66);
  rect(ctx, '#d97706', dx + 2, bottom - 64, doorW - 4, 62); // brass portal frame
  rect(ctx, '#38bdf8', dx + 4, bottom - 62, doorW - 8, 58);
  rect(ctx, '#e0f2fe', dx + 6, bottom - 60, doorW - 12, 54);
  // Glass sliding seams & brass horizontal push bars
  rect(ctx, '#d97706', dx + doorW / 2 - 1, bottom - 62, 2, 58);
  rect(ctx, '#f59e0b', dx + 10, bottom - 38, doorW - 20, 3);
  // Luxury entrance runner carpet
  rect(ctx, '#831843', dx + 8, bottom - 4, doorW - 16, 4);

  // Right Showcase Vitrine (x = dx + doorW + 4..w - 8):
  const rightX = dx + doorW + 4;
  const rightW = w - 8 - rightX;
  rect(ctx, '#0f172a', rightX, 112, rightW, bottom - 114);
  rect(ctx, '#0284c7', rightX + 2, 114, rightW - 4, bottom - 118);
  rect(ctx, '#38bdf8', rightX + 4, 116, rightW - 8, bottom - 122);
  // Designer bags & caps display shelves
  for (let sy = bottom - 50; sy < bottom - 16; sy += 18) {
    rect(ctx, '#f59e0b', rightX + 4, sy, rightW - 8, 2);
    rect(ctx, '#ec4899', rightX + 8, sy - 8, 8, 8); // designer bag
    rect(ctx, '#3b82f6', rightX + 20, sy - 6, 8, 6); // cap
  }

  return canvas;
}

/**
 * 3. SOFA SO GOOD · SCANDINAVIAN INTERIOR STUDIO
 * Nordic Architecture featuring light oak vertical timber louvers over architectural concrete,
 * 3D channel letter signage, panoramic showroom displaying designer curved lounge chair,
 * marble coffee table, tripod floor lamp, and oak pivot door.
 */
function paintModernFurnitureBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 168
  canvas.height = b.rect.h + BUILDING_ROOF; // 190
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const w = b.rect.w; // 160
  const bottom = canvas.height - 2; // 188
  const dx = 4 + b.door.x * TILE - b.rect.x; // 36
  const doorW = b.door.w * TILE; // 64

  oval(ctx, 'rgba(15, 23, 42, 0.35)', w / 2 + 4, bottom + 1, w / 2 - 4, 4);

  // Scandinavian Architectural Oak Wood Louvers & Smooth Concrete (y: 8..bottom)
  rect(ctx, '#0f172a', 3, 8, w + 2, bottom - 8);
  rect(ctx, '#475569', 4, 10, w, bottom - 10);
  rect(ctx, '#64748b', 6, 12, w - 4, bottom - 12);

  // Cantilevered Flat Roofline with architectural basalt fascia (y: 8..24)
  rect(ctx, '#020617', 2, 8, w + 4, 6);
  rect(ctx, '#1e293b', 4, 14, w, 14);
  rect(ctx, '#334155', 4, 14, w, 2);

  // Upper Facade: Vertical Scandinavian Light Oak Battens (y: 28..84)
  rect(ctx, '#78350f', 6, 28, w - 4, 56);
  rect(ctx, '#b45309', 7, 29, w - 6, 54);
  for (let bx = 10; bx < w - 6; bx += 6) {
    rect(ctx, '#d97706', bx, 29, 3, 54);
    rect(ctx, '#fde68a', bx + 1, 29, 1, 54); // bright oak grain highlight
    rect(ctx, '#78350f', bx + 3, 29, 3, 54); // deep shadow between slats
  }

  // Integrated Minimalist Signboard: "SOFA SO GOOD" (y: 84..108)
  rect(ctx, '#0f172a', 10, 84, w - 12, 24);
  rect(ctx, '#1e293b', 12, 86, w - 16, 20);
  rect(ctx, '#334155', 13, 87, w - 18, 1);
  ctx.font = '800 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde68a';
  ctx.fillText('SOFA SO GOOD', canvas.width / 2, 97, w - 28);
  ctx.font = '700 7px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('NỘI THẤT BẮC ÂU HIỆN ĐẠI', canvas.width / 2, 104, w - 28);

  // Ground Floor Showroom: Panoramic Glazing Display (y: 110..bottom)
  rect(ctx, '#0f172a', 6, 110, w - 4, bottom - 110);
  rect(ctx, '#0284c7', 8, 112, w - 8, bottom - 114);
  rect(ctx, '#38bdf8', 10, 114, w - 12, bottom - 118);

  // Designer Living Room Showroom (Left Wing: x = 10..dx - 4):
  const leftW = dx - 14;
  // Hardwood floor inside
  rect(ctx, '#92400e', 10, bottom - 28, leftW, 26);
  rect(ctx, '#b45309', 10, bottom - 26, leftW, 24);
  // Modern terracotta curved lounge armchair
  rect(ctx, '#7c2d12', 12, bottom - 46, 16, 24);
  rect(ctx, '#ea580c', 13, bottom - 44, 14, 20);
  rect(ctx, '#fdba74', 15, bottom - 40, 10, 8); // seat cushion
  // Round marble coffee table with design book
  rect(ctx, '#f8fafc', 30, bottom - 32, 14, 10);
  rect(ctx, '#cbd5e1', 31, bottom - 31, 12, 8);
  rect(ctx, '#0284c7', 33, bottom - 30, 6, 4); // design book
  // Minimalist black tripod floor lamp emitting warm cone of light
  rect(ctx, '#0f172a', 14, bottom - 66, 1, 24);
  rect(ctx, '#facc15', 11, bottom - 70, 7, 5); // lampshade
  rect(ctx, 'rgba(254, 240, 138, 0.45)', 9, bottom - 68, 11, 28); // light cone

  // Entrance Pivot Glass Door at dx = 36, doorW = 64
  rect(ctx, '#0f172a', dx, bottom - 66, doorW, 66);
  rect(ctx, '#38bdf8', dx + 2, bottom - 64, doorW - 4, 62);
  rect(ctx, '#e0f2fe', dx + 4, bottom - 62, doorW - 8, 58);
  // Natural oak vertical pull handle
  rect(ctx, '#78350f', dx + doorW / 2 + 10, bottom - 48, 4, 32);
  rect(ctx, '#fde68a', dx + doorW / 2 + 11, bottom - 48, 2, 32);
  // Recessed porch downlights
  rect(ctx, '#fef08a', dx + 16, bottom - 64, 4, 2);
  rect(ctx, '#fef08a', dx + doorW - 20, bottom - 64, 4, 2);

  // Right Wing Showroom (x = dx + doorW + 4..w - 8):
  const rightX = dx + doorW + 4;
  const rightW = w - 8 - rightX;
  rect(ctx, '#0f172a', rightX, 112, rightW, bottom - 114);
  rect(ctx, '#0284c7', rightX + 2, 114, rightW - 4, bottom - 118);
  rect(ctx, '#38bdf8', rightX + 4, 116, rightW - 8, bottom - 122);
  // Designer wooden dining chair & pendant lamp
  rect(ctx, '#b45309', rightX + 8, bottom - 42, 14, 22);
  rect(ctx, '#fde68a', rightX + 10, bottom - 38, 10, 6);
  rect(ctx, '#0f172a', rightX + 14, 116, 1, 14); // cord
  rect(ctx, '#facc15', rightX + 11, 130, 7, 6); // brass pendant

  return canvas;
}

/**
 * 4. 24/7 SMART LOGISTICS HUB & PARCEL LOCKER STATION
 * High-tech graphite composite panels with cyan/orange branding, dynamic LED matrix sign,
 * modular Smart Locker Wall with touchscreen QR scanner & status LEDs,
 * automated sliding glass door, and parcel sorting display.
 */
function paintModernDeliveryBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 168
  canvas.height = b.rect.h + BUILDING_ROOF; // 158
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const w = b.rect.w; // 160
  const bottom = canvas.height - 2; // 156
  const dx = 4 + b.door.x * TILE - b.rect.x; // 68
  const doorW = b.door.w * TILE; // 64

  oval(ctx, 'rgba(15, 23, 42, 0.35)', w / 2 + 4, bottom + 1, w / 2 - 4, 4);

  // Modern High-Tech Smart Logistics Hub (y: 8..bottom)
  rect(ctx, '#020617', 3, 8, w + 2, bottom - 8);
  rect(ctx, '#0f172a', 4, 10, w, bottom - 10);
  rect(ctx, '#1e293b', 6, 12, w - 4, bottom - 12);

  // High-Tech Architectural Fascia with Signal Orange Accent (y: 8..24)
  rect(ctx, '#ea580c', 2, 8, w + 4, 5);
  rect(ctx, '#f97316', 3, 9, w + 2, 2);
  rect(ctx, '#0284c7', 4, 14, w, 3); // Cyan tech stripe

  // Dynamic LED Matrix Billboard Signboard (y: 26..54)
  rect(ctx, '#020617', 6, 26, w - 4, 28);
  rect(ctx, '#0f172a', 8, 28, w - 8, 24);
  // Glowing cyan / orange branding
  ctx.font = '800 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('BƯU CỤC THÔNG MINH', canvas.width / 2, 39, w - 16);
  ctx.font = '700 7px sans-serif';
  ctx.fillStyle = '#fb923c';
  ctx.fillText('GIAO NHẬN HỎA TỐC 24/7', canvas.width / 2, 47, w - 16);

  // Ground Floor: 24/7 Smart Locker Wall & Automated Hub (y: 56..bottom)
  rect(ctx, '#0f172a', 6, 56, w - 4, bottom - 56);

  // Left Wing: 24/7 Smart Parcel Locker Grid (x = 8..dx - 6):
  const lockerW = dx - 14;
  rect(ctx, '#1e293b', 8, 58, lockerW, bottom - 60);
  rect(ctx, '#334155', 10, 60, lockerW - 4, bottom - 64);
  // Grid of individual parcel lockers
  const cols = 3;
  const colW = Math.floor((lockerW - 8) / cols);
  for (let c = 0; c < cols; c++) {
    const lx = 12 + c * colW;
    for (let ly = 62; ly < bottom - 12; ly += 16) {
      rect(ctx, '#0f172a', lx, ly, colW - 2, 14);
      rect(ctx, '#475569', lx + 1, ly + 1, colW - 4, 12);
      // Status LEDs: green = available, amber = package ready
      const isGreen = (c + ly) % 2 === 0;
      rect(ctx, isGreen ? '#22c55e' : '#facc15', lx + colW - 5, ly + 3, 2, 2);
      rect(ctx, '#94a3b8', lx + 3, ly + 6, colW - 8, 2); // handle slot
    }
  }
  // Central touchscreen kiosk terminal
  rect(ctx, '#0284c7', 24, 76, 18, 16);
  rect(ctx, '#38bdf8', 25, 77, 16, 14);
  rect(ctx, '#ffffff', 28, 80, 10, 8); // QR scanner pad

  // Entrance Automated Glass Sliding Doors at dx = 68, doorW = 64
  rect(ctx, '#020617', dx, bottom - 72, doorW, 72);
  rect(ctx, '#0284c7', dx + 2, bottom - 70, doorW - 4, 68);
  rect(ctx, '#38bdf8', dx + 4, bottom - 68, doorW - 8, 64);
  rect(ctx, '#e0f2fe', dx + 6, bottom - 66, doorW - 12, 60);
  // Digital entrance header
  rect(ctx, '#0f172a', dx + 6, bottom - 66, doorW - 12, 12);
  ctx.font = '700 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('GỬI & NHẬN', dx + doorW / 2, bottom - 58, doorW - 16);
  // High-visibility cyan edge markers & door sensors
  rect(ctx, '#0284c7', dx + doorW / 2 - 1, bottom - 54, 2, 50);
  rect(ctx, '#ea580c', dx + 8, bottom - 30, 4, 20);
  rect(ctx, '#ea580c', dx + doorW - 12, bottom - 30, 4, 20);

  // Right Wing: Automated Sorting Window with Parcell Packages (x = dx + doorW + 6..w - 8):
  const sortX = dx + doorW + 6;
  const sortW = w - 8 - sortX;
  rect(ctx, '#1e293b', sortX, 58, sortW, bottom - 60);
  rect(ctx, '#0284c7', sortX + 2, 60, sortW - 4, bottom - 64);
  rect(ctx, '#38bdf8', sortX + 4, 62, sortW - 8, bottom - 68);
  // Neatly stacked courier packages with shipping labels
  rect(ctx, '#b45309', sortX + 6, bottom - 32, 14, 12);
  rect(ctx, '#d97706', sortX + 7, bottom - 31, 12, 10);
  rect(ctx, '#ffffff', sortX + 9, bottom - 28, 6, 4); // shipping label
  rect(ctx, '#92400e', sortX + 16, bottom - 22, 10, 8);
  rect(ctx, '#ffffff', sortX + 18, bottom - 20, 5, 3);

  return canvas;
}

/**
 * 5. MARINA PRO ANGLER MART · ĐỒ CÂU BIỂN BÁC BA
 * Waterfront Pro Angler Mart featuring deep ocean navy composite siding, brushed aluminum trims,
 * marine radio antenna mast, illuminated blue neon signboard, vertical carbon rod showcase,
 * orange/white safety lifebuoy ring, and boat-cleat entrance door.
 */
function paintModernFishingShopBuilding(b: Building): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8; // 168
  canvas.height = b.rect.h + BUILDING_ROOF; // 126
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const w = b.rect.w; // 160
  const bottom = canvas.height - 2; // 124
  const dx = 4 + b.door.x * TILE - b.rect.x; // 36
  const doorW = b.door.w * TILE; // 64

  oval(ctx, 'rgba(15, 23, 42, 0.35)', w / 2 + 4, bottom + 1, w / 2 - 4, 4);

  // Coastal Marine Contemporary Cladding in Ocean Navy & Carbon (y: 8..bottom)
  rect(ctx, '#020617', 3, 8, w + 2, bottom - 8);
  rect(ctx, '#0c4a6e', 4, 10, w, bottom - 10);
  rect(ctx, '#0369a1', 6, 12, w - 4, bottom - 12);

  // Architectural Coastal Parapet with Marine Antenna Mast (y: 8..24)
  rect(ctx, '#0f172a', 2, 8, w + 4, 5);
  rect(ctx, '#38bdf8', 3, 9, w + 2, 2); // Cyan marine trim
  rect(ctx, '#075985', 4, 14, w, 12);
  // Marine radio antenna & wind anemometer
  rect(ctx, '#f8fafc', w - 18, 0, 2, 14);
  rect(ctx, '#ef4444', w - 21, 0, 8, 3); // wind cup

  // Neon Marine Signboard: "MARINA PRO ANGLER MART" (y: 26..50)
  rect(ctx, '#020617', 8, 26, w - 8, 24);
  rect(ctx, '#082f49', 10, 28, w - 12, 20);
  // Neon cyan lettering
  ctx.font = '800 10.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('ĐỒ CÂU BIỂN BÁC BA', canvas.width / 2, 38, w - 28);
  ctx.font = '700 7px sans-serif';
  ctx.fillStyle = '#67e8f9';
  ctx.fillText('NGƯ CỤ & CHO THUÊ THUYỀN', canvas.width / 2, 45, w - 28);

  // Ground Floor Marine Storefront (y: 52..bottom)
  rect(ctx, '#020617', 6, 52, w - 4, bottom - 52);

  // Left Showcase Vitrine (x = 8..dx - 4):
  const leftW = dx - 12;
  rect(ctx, '#0c4a6e', 8, 54, leftW, bottom - 56);
  rect(ctx, '#0284c7', 10, 56, leftW - 4, bottom - 60);
  rect(ctx, '#38bdf8', 12, 58, leftW - 8, bottom - 64);
  // Vertical Carbon Fishing Rods on Stainless Steel Rack
  for (let rx = 14; rx < leftW + 4; rx += 5) {
    rect(ctx, '#0f172a', rx, bottom - 48, 1, 38); // carbon blank
    rect(ctx, '#f8fafc', rx - 1, bottom - 30, 3, 2); // line guide
    rect(ctx, '#eab308', rx - 1, bottom - 18, 3, 6); // metallic spinning reel
  }

  // Entrance Marine Weather-Sealed Glass Door at dx = 36, doorW = 64
  rect(ctx, '#020617', dx, bottom - 60, doorW, 60);
  rect(ctx, '#0284c7', dx + 2, bottom - 58, doorW - 4, 56);
  rect(ctx, '#38bdf8', dx + 4, bottom - 56, doorW - 8, 52);
  rect(ctx, '#e0f2fe', dx + 6, bottom - 54, doorW - 12, 48);
  // Stainless steel boat cleat door handle
  rect(ctx, '#0f172a', dx + doorW / 2 - 1, bottom - 56, 2, 52);
  rect(ctx, '#f8fafc', dx + doorW / 2 - 5, bottom - 36, 4, 12);
  // Marine Safety Lifebuoy Ring on facade
  const buoyX = dx - 10;
  oval(ctx, '#ea580c', buoyX, bottom - 32, 7, 7);
  oval(ctx, '#ffffff', buoyX, bottom - 32, 5, 5);
  oval(ctx, '#0c4a6e', buoyX, bottom - 32, 3, 3);

  // Right Showcase Vitrine (x = dx + doorW + 4..w - 8):
  const rightX = dx + doorW + 4;
  const rightW = w - 8 - rightX;
  rect(ctx, '#0c4a6e', rightX, 54, rightW, bottom - 56);
  rect(ctx, '#0284c7', rightX + 2, 56, rightW - 4, bottom - 60);
  rect(ctx, '#38bdf8', rightX + 4, 58, rightW - 8, bottom - 64);
  // Marine Fishfinder / GPS Console Screen
  rect(ctx, '#0f172a', rightX + 6, bottom - 42, 18, 16);
  rect(ctx, '#15803d', rightX + 8, bottom - 40, 14, 12);
  rect(ctx, '#22c55e', rightX + 10, bottom - 36, 8, 2); // sonar echo pulse
  // Lure tackle boxes on shelf
  rect(ctx, '#f97316', rightX + 6, bottom - 20, 16, 6);
  rect(ctx, '#3b82f6', rightX + 8, bottom - 14, 18, 6);

  return canvas;
}

export function paintBuilding(b: Building): HTMLCanvasElement {
  if (b.id === 'apartments') {
    return paintBconsApartment(b);
  }
  if (b.id === 'vietprodev') {
    return paintVietProDevTownhouse(b);
  }
  if (b.id === 'dntu') {
    return paintDntuBuilding(b);
  }
  if (b.id === 'comga') {
    return paintComGaBuilding(b);
  }
  if (b.id === 'cybernet') return paintCyberNetBuilding(b);
  if (b.id === 'bida') {
    return paintBidaBuilding(b);
  }
  if (b.id === 'cafe') {
    return paintModernCafeBuilding(b);
  }
  if (b.id === 'fashion') {
    return paintModernFashionBuilding(b);
  }
  if (b.id === 'furniture') {
    return paintModernFurnitureBuilding(b);
  }
  if (b.id === 'delivery') {
    return paintModernDeliveryBuilding(b);
  }
  if (b.id === 'fishing_shop') {
    return paintModernFishingShopBuilding(b);
  }
  const canvas = document.createElement('canvas');
  canvas.width = b.rect.w + 8;
  canvas.height = b.rect.h + BUILDING_ROOF;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const w = b.rect.w,
    bottom = canvas.height - 2;
  const facadeH = b.id === 'apartments' ? 106 : 76;
  const eave = bottom - facadeH;
  const wall = hex(b.wall),
    roof = hex(b.roof),
    accent = hex(b.accent);
  const doorX = 4 + b.door.x * TILE - b.rect.x,
    doorW = b.door.w * TILE;
  rect(ctx, 'rgba(54,48,36,0.22)', 6, bottom - 8, w, 10);
  rect(ctx, '#514b3b', 3, eave, w + 2, facadeH);
  rect(ctx, wall, 4, eave + 1, w, facadeH - 1);
  rect(ctx, shade(wall, -0.1), w - 10, eave + 1, 14, facadeH - 1);
  for (let y = eave + 5; y < bottom - 8; y += 9) {
    rect(ctx, shade(wall, -0.06), 5, y, w - 2, 1);
  }
  rect(ctx, '#99917a', 4, bottom - 8, w, 8);
  for (let x = 5; x < w; x += 12) rect(ctx, '#c1b69a', x, bottom - 7, 10, 4);
  rect(ctx, accent, 4, eave + 1, 4, facadeH - 8);
  rect(ctx, accent, w, eave + 1, 4, facadeH - 8);

  // A tall tiled roof reads from above; the compact façade reads from the front.
  rect(ctx, '#51483b', 0, 8, w + 8, eave - 5);
  rect(ctx, roof, 1, 9, w + 6, eave - 10);
  for (let y = 12; y < eave - 1; y += 8) {
    const offset = ((y - 12) / 8) % 2 ? 8 : 0;
    rect(ctx, shade(roof, -0.19), 1, y + 6, w + 6, 2);
    rect(ctx, shade(roof, 0.2), 2, y, w + 4, 1);
    for (let x = 2 + offset; x < w + 5; x += 16) {
      rect(ctx, shade(roof, -0.24), x, y + 1, 1, 5);
      rect(ctx, shade(roof, 0.1), x + 2, y + 5, Math.min(10, w + 5 - x), 1);
    }
  }
  rect(ctx, shade(roof, 0.3), 1, 8, w + 6, 3);
  rect(ctx, shade(roof, -0.35), 0, eave - 1, w + 8, 5);
  rect(ctx, '#bca184', 3, eave + 4, w + 2, 2);

  // Dormer, with a stepped gable silhouette rather than another flat rectangle.
  const dormerX = Math.floor(w / 2) - 17,
    dormerY = Math.max(18, eave - 47);
  for (let row = 0; row < 17; row++) {
    rect(ctx, '#51483b', dormerX + 17 - row, dormerY + row, row * 2 + 2, 1);
    if (row > 2) rect(ctx, shade(roof, 0.18), dormerX + 19 - row, dormerY + row, row * 2 - 2, 1);
  }
  rect(ctx, shade(wall, -0.08), dormerX + 3, dormerY + 17, 29, 22);
  rect(ctx, accent, dormerX + 10, dormerY + 19, 16, 17);
  rect(ctx, '#d5e7dc', dormerX + 12, dormerY + 21, 12, 12);
  rect(ctx, '#fbefd0', dormerX + 12, dormerY + 21, 5, 5);
  rect(ctx, accent, dormerX + 17, dormerY + 21, 2, 13);
  rect(ctx, accent, dormerX + 12, dormerY + 26, 12, 2);
  rect(ctx, shade(roof, -0.3), dormerX, dormerY + 38, 35, 3);

  const chimX = w - 15;
  rect(ctx, '#655346', chimX - 1, 0, 13, 22);
  rect(ctx, '#b67d62', chimX, 2, 11, 18);
  for (let y = 5; y < 20; y += 5) rect(ctx, '#d6a185', chimX + (y % 2 ? 1 : 5), y, 5, 2);
  rect(ctx, '#e0ccb0', chimX - 2, 0, 15, 4);

  const window = (x: number, y: number) => {
    rect(ctx, accent, x - 2, y - 2, 26, 25);
    rect(ctx, '#a1beb3', x, y, 22, 20);
    rect(ctx, '#ecdfb2', x + 1, y + 1, 9, 8);
    rect(ctx, '#d4e1cf', x + 12, y + 1, 9, 8);
    rect(ctx, accent, x + 10, y, 2, 20);
    rect(ctx, accent, x, y + 9, 22, 2);
    rect(ctx, shade(accent, 0.2), x - 6, y - 1, 3, 23);
    rect(ctx, shade(accent, 0.2), x + 25, y - 1, 3, 23);
    rect(ctx, '#8b6647', x - 3, y + 23, 28, 5);
    for (let i = 0; i < 5; i++) {
      rect(ctx, '#678153', x + i * 5, y + 21, 4, 3);
      rect(ctx, i % 2 ? '#e6b39b' : '#f4deac', x + i * 5 + 1, y + 20, 2, 2);
    }
  };
  for (let x = 18; x < w - 26; x += 42) {
    if (x + 26 > doorX && x < doorX + doorW) continue;
    window(x, bottom - 43);
  }
  if (b.id === 'apartments') {
    for (let x = 18; x < w - 26; x += 42) window(x, eave + 13);
    rect(ctx, '#7d7183', 8, eave + 49, w - 8, 4);
  }
  const dy = bottom - 42;
  rect(ctx, '#4a4336', doorX + 10, dy - 2, doorW - 20, 42);
  rect(ctx, shade(accent, 0.16), doorX + 12, dy, doorW - 24, 40);
  rect(ctx, '#d5e2cd', doorX + 16, dy + 4, doorW - 32, 12);
  rect(ctx, accent, doorX + doorW / 2 - 1, dy + 4, 2, 12);
  rect(ctx, '#dab87a', doorX + doorW - 20, dy + 24, 3, 3);
  rect(ctx, '#cfc1a3', doorX + 7, bottom - 3, doorW - 14, 3);

  // Different silhouettes and awning treatments make each business recognizable.
  const awning =
    b.id === 'cafe'
      ? '#a8664b'
      : b.id === 'fashion'
        ? '#a17f9a'
        : b.id === 'delivery'
          ? '#ba9454'
          : '#648578';
  if (b.id !== 'apartments') {
    const aw = Math.min(w - 20, doorW + 36),
      ax = doorX + doorW / 2 - aw / 2;
    rect(ctx, '#635441', ax - 1, dy - 12, aw + 2, 13);
    for (let x = 0; x < aw; x += 9) {
      rect(ctx, (x / 9) % 2 ? '#f0dfbd' : awning, ax + x, dy - 11, Math.min(9, aw - x), 12);
    }
    rect(ctx, shade(awning, -0.2), ax, dy + 1, aw, 2);
  }
  const sign = SIGNS[b.id] ?? b.label;
  const sw = Math.min(w - 20, sign.length * 7 + 20),
    sx = 4 + (w - sw) / 2,
    sy = eave + 5;
  rect(ctx, '#6e5842', sx - 1, sy - 1, sw + 2, 18);
  rect(ctx, '#f2e5c5', sx, sy, sw, 16);
  ctx.font = '700 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4d5140';
  ctx.fillText(sign, sx + sw / 2, sy + 8);
  rect(ctx, '#4c5142', doorX + 2, dy + 7, 4, 9);
  rect(ctx, '#edcb87', doorX + 3, dy + 8, 2, 6);
  if (b.id === 'delivery') {
    rect(ctx, '#667b76', 15, bottom - 22, 18, 15);
    rect(ctx, '#d7c49b', 17, bottom - 20, 14, 3);
    rect(ctx, '#435953', 20, bottom - 17, 8, 2);
  }
  if (b.id === 'fishing_shop') {
    oval(ctx, '#eee1bb', 17, bottom - 33, 8, 8);
    oval(ctx, '#b86d59', 17, bottom - 33, 6, 6);
    oval(ctx, wall, 17, bottom - 33, 3, 3);
    rect(ctx, '#eee1bb', 16, bottom - 41, 2, 5);
    rect(ctx, '#eee1bb', 16, bottom - 29, 2, 5);
    for (let i = 0; i < 2; i++) rect(ctx, '#8b6647', w - 16 + i * 5, bottom - 38, 2, 32);
  }
  return canvas;
}
