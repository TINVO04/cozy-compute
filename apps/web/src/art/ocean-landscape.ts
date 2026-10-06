import { TILE, RIVER_BRIDGE } from '@cozy/game-data';

export const OCEAN_COLS = 48;
export const OCEAN_ROWS = 32;
export const OCEAN_WIDTH = OCEAN_COLS * TILE; // 1536
export const OCEAN_HEIGHT = OCEAN_ROWS * TILE; // 1024

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  c.getContext('2d')!.imageSmoothingEnabled = false;
  return c;
}

/**
 * Grand Sông Đồng Nai & Cầu Hóa An Expedition Map:
 * Centered twin highway bridges of CẦU HÓA AN spanning across Sông Đồng Nai between Biên Hòa & Bình Dương,
 * surrounded by expansive, clear, flowing river waters for boating and fishing.
 * Free of clutter and islands, offering vast open navigation channels and authentic river ambiance.
 */
export function paintOceanLandscape(): HTMLCanvasElement {
  const c = canvas(OCEAN_WIDTH, OCEAN_HEIGHT);
  const ctx = c.getContext('2d')!;

  // =========================================================================
  // 1. ALLUVIAL RIVER WATER (SÔNG ĐỒNG NAI)
  // =========================================================================
  const baseGrad = ctx.createLinearGradient(0, 0, 0, OCEAN_HEIGHT);
  baseGrad.addColorStop(0, '#779b83');
  baseGrad.addColorStop(0.15, '#477e73');
  baseGrad.addColorStop(0.4, '#32675f');
  baseGrad.addColorStop(0.55, '#285952');
  baseGrad.addColorStop(0.8, '#3f7568');
  baseGrad.addColorStop(1, '#82977a');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, OCEAN_WIDTH, OCEAN_HEIGHT);

  // The deep downstream pool blends into the current instead of a hard zone rectangle.
  const depth = ctx.createRadialGradient(1140, 815, 30, 1140, 815, 420);
  depth.addColorStop(0, 'rgba(12, 44, 46, 0.7)');
  depth.addColorStop(0.55, 'rgba(20, 54, 53, 0.4)');
  depth.addColorStop(1, 'rgba(20, 54, 53, 0)');
  ctx.fillStyle = depth;
  ctx.fillRect(700, 600, 836, 390);
  // Mud shelves and reeds stay on the non-navigable bank margins.
  for (let x = 0; x < OCEAN_WIDTH; x += 9) {
    const edge = 3 + Math.sin(x * 0.043) * 3;
    ctx.fillStyle = '#8b9270';
    ctx.fillRect(x, 32, 10, edge);
    ctx.fillRect(x, 990 - edge, 10, edge);
  }

  // Flowing river current streaks
  ctx.fillStyle = 'rgba(52, 211, 153, 0.08)';
  for (let y = 14; y < OCEAN_HEIGHT; y += 22) {
    const offset = Math.sin(y * 0.04) * 26;
    for (let x = 0; x < OCEAN_WIDTH; x += 54) {
      ctx.fillRect(x + offset, y, 26, 2);
      ctx.fillRect(x + offset + 6, y + 2, 12, 1);
    }
  }

  // Northern Riverbank: Bờ Hóa An / Bình Dương (x: 0..1536, y: 0..38)
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, OCEAN_WIDTH, 36);
  ctx.fillStyle = '#d97706'; // sand edge
  ctx.fillRect(0, 32, OCEAN_WIDTH, 6);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(0, 34, OCEAN_WIDTH, 3);
  ctx.fillStyle = '#15803d'; // lush riverbank greenery
  ctx.fillRect(0, 0, OCEAN_WIDTH, 30);
  ctx.fillStyle = '#16a34a';
  for (let bx = 0; bx < OCEAN_WIDTH; bx += 28) {
    ctx.fillRect(bx, 10, 20, 16);
  }

  // Southern Riverbank: Bờ Nam Sông Đồng Nai (x: 0..1536, y: 986..1024)
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 986, OCEAN_WIDTH, 6);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(0, 988, OCEAN_WIDTH, 3);
  ctx.fillStyle = '#15803d';
  ctx.fillRect(0, 992, OCEAN_WIDTH, 32);
  ctx.fillStyle = '#16a34a';
  for (let bx = 0; bx < OCEAN_WIDTH; bx += 28) {
    ctx.fillRect(bx, 996, 22, 20);
  }

  // =========================================================================
  // 2. FLOATING WATER HYACINTHS (LỤC BÌNH SÔNG ĐỒNG NAI)
  // Sparse natural clusters along the riverbanks, keeping center channels wide open
  // =========================================================================
  const hyacinthClusters = [
    { x: 120, y: 80, count: 8 },
    { x: 420, y: 100, count: 10 },
    { x: 860, y: 85, count: 9 },
    { x: 1320, y: 95, count: 8 },
    { x: 180, y: 920, count: 9 },
    { x: 580, y: 930, count: 11 },
    { x: 960, y: 920, count: 10 },
    { x: 1380, y: 935, count: 8 },
  ];

  for (const cl of hyacinthClusters) {
    for (let i = 0; i < cl.count; i++) {
      const hx = cl.x + ((i * 19) % 52) - 26;
      const hy = cl.y + ((i * 13) % 40) - 20;

      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.ellipse(hx, hy, 7, 5, (i * 0.4) % Math.PI, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(hx - 1, hy - 1, 5, 3.5, (i * 0.4) % Math.PI, 0, Math.PI * 2);
      ctx.fill();

      if (i % 3 === 0) {
        ctx.fillStyle = '#c084fc'; // purple hyacinth petal
        ctx.beginPath();
        ctx.arc(hx, hy - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.fillRect(hx - 0.5, hy - 3.5, 1.5, 1.5);
      }
    }
  }

  // =========================================================================
  // 3. CẦU HÓA AN (BIÊN HÒA - BÌNH DƯƠNG) — THE GRAND TWIN HIGHWAY BRIDGES
  // Centered in the middle of the river across the entire width (x: 0..1536, y: 450..538)
  // =========================================================================
  const bridgeY1 = RIVER_BRIDGE.top;
  const bridgeH1 = RIVER_BRIDGE.deckHeight;
  const bridgeGap = RIVER_BRIDGE.gap;
  const bridgeY2 = bridgeY1 + bridgeH1 + bridgeGap;
  const bridgeH2 = RIVER_BRIDGE.deckHeight;
  const bridgeTotalH = RIVER_BRIDGE.bottom - bridgeY1;

  // Bridge shadow cast on the emerald water
  ctx.fillStyle = 'rgba(2, 44, 34, 0.72)';
  ctx.fillRect(0, bridgeY1 + 10, OCEAN_WIDTH, bridgeTotalH + 26);

  // --- Concrete Bridge Piers (Trụ cầu bê tông cắm xuống lòng sông Đồng Nai) ---
  const pierXs = RIVER_BRIDGE.pierXs;
  for (const px of pierXs) {
    // Underwater pier footing shadow & water cutwater
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.ellipse(px + 16, bridgeY2 + bridgeH2 + 10, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Massive reinforced concrete pier column
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px, bridgeY1 - 6, 32, bridgeTotalH + 18);
    ctx.fillStyle = '#334155';
    ctx.fillRect(px + 2, bridgeY1 - 4, 28, bridgeTotalH + 14);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(px + 5, bridgeY1 - 2, 22, bridgeTotalH + 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(px + 7, bridgeY1, 10, bridgeTotalH + 8);

    // River navigation clearance markers on piers (Đèn báo luồng tàu dưới gầm cầu)
    ctx.fillStyle = '#ef4444'; // Red port marker
    ctx.fillRect(px - 5, bridgeY2 + 8, 5, 8);
    ctx.fillStyle = '#22c55e'; // Green starboard marker
    ctx.fillRect(px + 32, bridgeY2 + 8, 5, 8);
  }

  // --- Navigation Clearance Arches / Water Spans under Cầu Hóa An ---
  // The water between piers is completely open for boats to pass!
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(700, bridgeY2 + bridgeH2, 136, 16);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(702, bridgeY2 + bridgeH2 + 2, 132, 12);
  ctx.fillStyle = '#fde047';
  ctx.font = '700 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LUỒNG THÔNG THUYỀN (TĨNH KHÔNG 7M)', 768, bridgeY2 + bridgeH2 + 11);

  // --- Intermediate concrete structural crossbeams in the median gap ---
  for (let bx = 0; bx < OCEAN_WIDTH; bx += 48) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx, bridgeY1 + bridgeH1, 14, bridgeGap);
    ctx.fillStyle = '#475569';
    ctx.fillRect(bx + 2, bridgeY1 + bridgeH1, 10, bridgeGap);
  }

  // --- Deck 1: Cầu Hóa An Mới (Bắc - hướng đi Bình Dương) ---
  // Base concrete girder
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, bridgeY1, OCEAN_WIDTH, bridgeH1);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, bridgeY1 + 2, OCEAN_WIDTH, bridgeH1 - 4);
  // Asphalt road surface
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, bridgeY1 + 5, OCEAN_WIDTH, bridgeH1 - 10);

  // White lane lines
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, bridgeY1 + 5, OCEAN_WIDTH, 2);
  ctx.fillRect(0, bridgeY1 + bridgeH1 - 6, OCEAN_WIDTH, 2);

  // Yellow dashed highway road centerline (Deck 1)
  ctx.fillStyle = '#fde047';
  for (let mx = 0; mx < OCEAN_WIDTH; mx += 28) {
    ctx.fillRect(mx, bridgeY1 + Math.floor(bridgeH1 / 2) - 1, 16, 2);
  }

  // Steel safety railings (Deck 1 - xanh dương Cầu Hóa An)
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, bridgeY1, OCEAN_WIDTH, 3);
  ctx.fillRect(0, bridgeY1 + bridgeH1 - 3, OCEAN_WIDTH, 3);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, bridgeY1 + 1, OCEAN_WIDTH, 1);
  ctx.fillRect(0, bridgeY1 + bridgeH1 - 2, OCEAN_WIDTH, 1);

  // --- Deck 2: Cầu Hóa An Cũ (Nam - hướng về Biên Hòa) ---
  // Base concrete girder
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, bridgeY2, OCEAN_WIDTH, bridgeH2);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, bridgeY2 + 2, OCEAN_WIDTH, bridgeH2 - 4);
  // Asphalt road surface
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, bridgeY2 + 5, OCEAN_WIDTH, bridgeH2 - 10);

  // White lane lines
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, bridgeY2 + 5, OCEAN_WIDTH, 2);
  ctx.fillRect(0, bridgeY2 + bridgeH2 - 6, OCEAN_WIDTH, 2);

  // Yellow dashed highway road centerline (Deck 2)
  ctx.fillStyle = '#fde047';
  for (let mx = 0; mx < OCEAN_WIDTH; mx += 28) {
    ctx.fillRect(mx, bridgeY2 + Math.floor(bridgeH2 / 2) - 1, 16, 2);
  }

  // Steel safety railings (Deck 2 - xanh dương Cầu Hóa An)
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, bridgeY2, OCEAN_WIDTH, 3);
  ctx.fillRect(0, bridgeY2 + bridgeH2 - 3, OCEAN_WIDTH, 3);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, bridgeY2 + 1, OCEAN_WIDTH, 1);
  ctx.fillRect(0, bridgeY2 + bridgeH2 - 2, OCEAN_WIDTH, 1);

  // Broad raised pedestrian paths, stone joints and crisp guardrail uprights.
  for (const deckY of [bridgeY1, bridgeY2]) {
    ctx.fillStyle = '#a8b3ac';
    ctx.fillRect(0, deckY + 4, OCEAN_WIDTH, 12);
    ctx.fillRect(0, deckY + 66, OCEAN_WIDTH, 8);
    ctx.fillStyle = '#d9dfce';
    ctx.fillRect(0, deckY + 16, OCEAN_WIDTH, 2);
    ctx.fillRect(0, deckY + 64, OCEAN_WIDTH, 2);
    for (let x = 0; x < OCEAN_WIDTH; x += 20) {
      ctx.fillStyle = '#7d918e';
      ctx.fillRect(x, deckY + 5, 1, 10);
      ctx.fillStyle = '#15516b';
      ctx.fillRect(x, deckY - 2, 3, 6);
      ctx.fillRect(x, deckY + 74, 3, 6);
      ctx.fillStyle = '#a6e4e5';
      ctx.fillRect(x, deckY - 2, 2, 1);
    }
  }

  // --- Streetlamps along Cầu Hóa An ---
  for (let lx = 16; lx < OCEAN_WIDTH; lx += 64) {
    // Lamp post on Deck 1
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(lx, bridgeY1 - 8, 2, 9);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(lx - 2, bridgeY1 - 10, 6, 3);

    // Lamp post on Deck 2
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(lx, bridgeY2 + bridgeH2 - 1, 2, 9);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(lx - 2, bridgeY2 + bridgeH2 + 7, 6, 3);
  }

  // Highway Gantry Sign at entrance of Cầu Hóa An (x: 480, y: bridgeY1 - 22)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(390, bridgeY1 - 30, 280, 22);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(392, bridgeY1 - 28, 276, 18);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(393, bridgeY1 - 27, 274, 1);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CẦU HÓA AN (BIÊN HÒA ⇄ BÌNH DƯƠNG)', 530, bridgeY1 - 14);

  // =========================================================================
  // 4. PHAO TIÊU BÁO LUỒNG ĐƯỜNG THỦY & TRỞ VỀ THỊ TRẤN
  // Situating return buoy at South water reach near spawn (x: 140, y: 720)
  // =========================================================================
  const buoys = [
    { x: 140, y: 720, color: '#10b981', label: 'VỀ BẾN BIÊN HÒA' },
    { x: 1380, y: 720, color: '#f6cf84', label: 'NƯỚC SÂU · CÁ QUÝ' },
    { x: 760, y: 360, color: '#bde1c4', label: 'THƯỢNG NGUỒN · CÁ HIẾM' },
  ];

  for (const b of buoys) {
    ctx.fillStyle = 'rgba(2, 44, 34, 0.5)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 12, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(b.x - 9, b.y + 10);
    ctx.lineTo(b.x + 9, b.y + 10);
    ctx.lineTo(b.x + 4, b.y);
    ctx.lineTo(b.x - 4, b.y);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(b.x - 7, b.y + 3, 14, 4);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(b.x - 1, b.y - 12, 2, 12);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - 3, b.y - 16, 6, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(b.x - 1, b.y - 15, 2, 2);

    ctx.font = '700 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    const labelWidth = ctx.measureText(b.label).width + 16;
    ctx.fillRect(b.x - labelWidth / 2, b.y + 16, labelWidth, 15);
    ctx.fillStyle = b.color;
    ctx.fillText(b.label, b.x, b.y + 27);
  }

  return c;
}
