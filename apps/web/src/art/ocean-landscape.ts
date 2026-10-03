import { TILE } from '@cozy/game-data';

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
 * 2026 Masterpiece River & Estuary Landscape: Sông Đồng Nai, Cù Lao Phố & Làng Bè Tân Mai (Biên Hòa)
 * Recreates the authentic historical waterways of Biên Hòa:
 * - Flowing alluvial waters of Sông Đồng Nai with floating purple water hyacinths (hoa lục bình)
 * - Làng Bè Cá Tân Mai (famous connected floating wooden fish rafts, net cages, and fisherman raft huts)
 * - Central Cù Lao Phố (Hiệp Hòa) with sandy alluvium riverbanks, dừa nước, and ancient Chùa Ông shrine
 * - Cù Lao Ba Xê sandbanks and bamboo shoals
 * - Vực Xoáy Vàm Sông Sâu in the southeast (deep tidal whirlpool confluence leading to the sea)
 * - Navigation buoys leading back to Biên Hòa Town Pier
 */
export function paintOceanLandscape(): HTMLCanvasElement {
  const c = canvas(OCEAN_WIDTH, OCEAN_HEIGHT);
  const ctx = c.getContext('2d')!;

  // =========================================================================
  // 1. ALLUVIAL RIVER WATER BASE (SÔNG ĐỒNG NAI)
  // =========================================================================
  const baseGrad = ctx.createLinearGradient(0, 0, OCEAN_WIDTH, OCEAN_HEIGHT);
  baseGrad.addColorStop(0, '#064e3b'); // Upstream NW: rich emerald river water
  baseGrad.addColorStop(0.35, '#042f2e'); // Mid-river: deep alluvial waterway
  baseGrad.addColorStop(0.7, '#022c22'); // South/East: deep river channel
  baseGrad.addColorStop(1, '#020617'); // SE corner: Vực Xoáy Vàm Sông Sâu (deepest tidal abyss)
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, OCEAN_WIDTH, OCEAN_HEIGHT);

  // Flowing river current streaks & alluvial silt ribbons
  ctx.fillStyle = 'rgba(52, 211, 153, 0.08)';
  for (let y = 12; y < OCEAN_HEIGHT; y += 20) {
    const offset = Math.sin(y * 0.04) * 28;
    for (let x = 0; x < OCEAN_WIDTH; x += 56) {
      ctx.fillRect(x + offset, y, 28, 2);
      ctx.fillRect(x + offset + 6, y + 2, 14, 1);
    }
  }

  // Soft silt mud riverbank gradient along edges
  ctx.fillStyle = 'rgba(120, 53, 15, 0.05)';
  for (let y = 0; y < OCEAN_HEIGHT; y += 32) {
    ctx.fillRect(0, y, 40, 28);
    ctx.fillRect(OCEAN_WIDTH - 40, y, 40, 28);
  }

  // =========================================================================
  // 2. FLOATING WATER HYACINTHS (LỤC BÌNH SÔNG ĐỒNG NAI)
  // =========================================================================
  const hyacinthClusters = [
    { x: 260, y: 180, count: 9 },
    { x: 340, y: 240, count: 12 },
    { x: 180, y: 560, count: 14 },
    { x: 240, y: 720, count: 10 },
    { x: 520, y: 780, count: 16 },
    { x: 620, y: 220, count: 11 },
    { x: 920, y: 280, count: 15 },
    { x: 1020, y: 460, count: 12 },
    { x: 940, y: 740, count: 14 },
    { x: 420, y: 920, count: 10 },
  ];

  for (const cl of hyacinthClusters) {
    for (let i = 0; i < cl.count; i++) {
      const hx = cl.x + ((i * 19) % 52) - 26;
      const hy = cl.y + ((i * 13) % 40) - 20;

      // Green bulbous leaf pad
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.ellipse(hx, hy, 7, 5, (i * 0.4) % Math.PI, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(hx - 1, hy - 1, 5, 3.5, (i * 0.4) % Math.PI, 0, Math.PI * 2);
      ctx.fill();

      // Delicate purple blossom on select leaves
      if (i % 3 === 0) {
        ctx.fillStyle = '#c084fc'; // purple hyacinth petal
        ctx.beginPath();
        ctx.arc(hx, hy - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047'; // golden yellow blossom center
        ctx.fillRect(hx - 0.5, hy - 3.5, 1.5, 1.5);
      }
    }
  }

  // =========================================================================
  // 3. LÀNG BÈ CÁ TÂN MAI (BIÊN HÒA FLOATING FISH FARMING RAFTS)
  // Northwest to North-Center: cols 10..22, rows 3..11 (x: 320..704, y: 96..352)
  // =========================================================================
  const raftBases = [
    { x: 360, y: 120, w: 100, h: 70, type: 'house' },
    { x: 480, y: 120, w: 110, h: 70, type: 'cage' },
    { x: 610, y: 120, w: 90, h: 70, type: 'cage' },
    { x: 390, y: 210, w: 105, h: 75, type: 'cage' },
    { x: 515, y: 210, w: 120, h: 75, type: 'house' },
    { x: 440, y: 300, w: 110, h: 65, type: 'cage' },
    { x: 570, y: 300, w: 95, h: 65, type: 'cage' },
  ];

  // Connecting floating gangways (Cầu ván gỗ nối bè)
  ctx.fillStyle = '#78350f';
  ctx.fillRect(350, 150, 360, 10);
  ctx.fillRect(380, 240, 270, 10);
  ctx.fillRect(430, 150, 12, 180);
  ctx.fillRect(560, 150, 12, 180);

  ctx.fillStyle = '#a16207';
  for (let gx = 352; gx < 710; gx += 6) {
    ctx.fillRect(gx, 151, 4, 8);
    ctx.fillRect(gx, 241, 4, 8);
  }

  for (const raft of raftBases) {
    // Water shadow beneath raft
    ctx.fillStyle = 'rgba(2, 44, 34, 0.6)';
    ctx.fillRect(raft.x - 4, raft.y - 2, raft.w + 8, raft.h + 8);

    // Blue & orange flotation barrels (phuy nổi giữ bè)
    ctx.fillStyle = '#0284c7';
    for (let bx = raft.x + 4; bx < raft.x + raft.w - 12; bx += 22) {
      ctx.fillRect(bx, raft.y - 4, 16, 6);
      ctx.fillRect(bx, raft.y + raft.h - 2, 16, 6);
    }

    // Wooden raft deck frame
    ctx.fillStyle = '#451a03';
    ctx.fillRect(raft.x, raft.y, raft.w, raft.h);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(raft.x + 3, raft.y + 3, raft.w - 6, raft.h - 6);

    // Wooden planks
    ctx.fillStyle = '#92400e';
    for (let py = raft.y + 5; py < raft.y + raft.h - 5; py += 7) {
      ctx.fillRect(raft.x + 4, py, raft.w - 8, 5);
    }

    if (raft.type === 'cage') {
      // Submerged fish net pen opening in center
      const pw = raft.w - 24;
      const ph = raft.h - 24;
      const px = raft.x + 12;
      const py = raft.y + 12;

      ctx.fillStyle = '#0f766e'; // underwater net reflection
      ctx.fillRect(px, py, pw, ph);

      // Fish net grid lines
      ctx.strokeStyle = '#14b8a6';
      ctx.lineWidth = 1;
      for (let nx = px; nx < px + pw; nx += 8) {
        ctx.beginPath();
        ctx.moveTo(nx, py);
        ctx.lineTo(nx, py + ph);
        ctx.stroke();
      }
      for (let ny = py; ny < py + ph; ny += 8) {
        ctx.beginPath();
        ctx.moveTo(px, ny);
        ctx.lineTo(px + pw, ny);
        ctx.stroke();
      }

      // Small fish silhouettes swimming in the pen
      ctx.fillStyle = '#115e59';
      ctx.fillRect(px + 10, py + 8, 6, 2);
      ctx.fillRect(px + pw - 18, py + 14, 5, 2);
      ctx.fillRect(px + 22, py + ph - 12, 7, 2);
    } else {
      // Fisherman raft hut (Nhà sàn gỗ trên bè)
      const hx = raft.x + 10;
      const hy = raft.y + 8;
      const hw = raft.w - 20;
      const hh = raft.h - 16;

      ctx.fillStyle = '#3e2723';
      ctx.fillRect(hx, hy, hw, hh);

      // Corrugated blue/green tin roof
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(hx - 2, hy - 4, hw + 4, hh * 0.7);
      ctx.fillStyle = '#38bdf8';
      for (let rx = hx; rx < hx + hw; rx += 5) {
        ctx.fillRect(rx, hy - 4, 2, hh * 0.7);
      }

      // Hut door & warm window lantern
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(hx + hw / 2 - 6, hy + hh * 0.5, 12, hh * 0.45);
      ctx.fillStyle = '#fef08a'; // glowing lantern in window
      ctx.fillRect(hx + 6, hy + hh * 0.55, 6, 6);

      // Life preserver ring on wall
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(hx + hw - 10, hy + hh * 0.6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx + hw - 10, hy + hh * 0.6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Raft village wooden nameboard signpost
  ctx.fillStyle = '#451a03';
  ctx.fillRect(342, 110, 4, 30);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(324, 110, 40, 16);
  ctx.fillStyle = '#fef08a';
  ctx.font = '700 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LÀNG BÈ', 344, 122);

  // =========================================================================
  // 4. CÙ LAO PHỐ (HIỆP HÒA) & CHÙA ÔNG CỔ TỰ
  // Center: cols 20..30, rows 12..20 (x: 640..960, y: 384..640)
  // =========================================================================
  // Island shadow in alluvial river
  ctx.fillStyle = 'rgba(2, 44, 34, 0.7)';
  ctx.beginPath();
  ctx.ellipse(780, 520, 185, 115, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sandy alluvium riverbank (Bờ cát phù sa sông Đồng Nai)
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.ellipse(780, 510, 175, 105, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.ellipse(780, 506, 168, 98, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lush green orchard plateau (Đất cù lao trù phú)
  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  ctx.ellipse(780, 498, 148, 80, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.ellipse(780, 490, 136, 70, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stone embankment & riverside steps (Bờ kè đá Cù Lao)
  ctx.fillStyle = '#475569';
  ctx.fillRect(700, 560, 160, 12);
  ctx.fillStyle = '#64748b';
  for (let sx = 704; sx < 856; sx += 14) {
    ctx.fillRect(sx, 562, 10, 8);
  }

  // Historic Wharf (Bến Đá Cù Lao Phố) extending out to river
  // cols 22..25, rows 18..21 -> x: 704..800, y: 576..672
  ctx.fillStyle = '#3e2723'; // piles
  ctx.fillRect(720, 572, 8, 85);
  ctx.fillRect(772, 572, 8, 85);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(714, 572, 72, 88);
  ctx.fillStyle = '#a16207';
  for (let wy = 576; wy < 656; wy += 8) {
    ctx.fillRect(716, wy, 68, 6);
  }
  // Iron mooring bollards
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(716, 650, 6, 10);
  ctx.fillRect(778, 650, 6, 10);

  // --- Chùa Ông Cù Lao (Thất Phủ Cổ Miếu) trên cù lao ---
  const templeX = 740;
  const templeY = 430;

  // Temple courtyard paving
  ctx.fillStyle = '#78350f';
  ctx.fillRect(templeX - 35, templeY + 10, 70, 24);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(templeX - 32, templeY + 12, 64, 20);

  // Red brick temple main hall
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(templeX - 28, templeY - 18, 56, 30);
  // Red lacquered wooden pillars
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(templeX - 25, templeY - 18, 5, 30);
  ctx.fillRect(templeX - 5, templeY - 18, 5, 30);
  ctx.fillRect(templeX + 20, templeY - 18, 5, 30);

  // Temple arched golden door
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(templeX - 12, templeY - 6, 14, 18);
  ctx.fillStyle = '#451a03';
  ctx.fillRect(templeX - 10, templeY - 4, 10, 16);

  // Sweeping double curved terracotta roof (Mái ngói cong cổ kính)
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(templeX - 38, templeY - 16);
  ctx.lineTo(templeX + 38, templeY - 16);
  ctx.lineTo(templeX + 32, templeY - 32);
  ctx.lineTo(templeX - 32, templeY - 32);
  ctx.closePath();
  ctx.fill();

  // Roof ridge & golden dragon finials
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(templeX - 30, templeY - 34, 60, 3);
  ctx.fillRect(templeX - 32, templeY - 37, 4, 5); // left finial
  ctx.fillRect(templeX + 28, templeY - 37, 4, 5); // right finial
  ctx.beginPath();
  ctx.arc(templeX, templeY - 35, 3.5, 0, Math.PI * 2); // central fiery pearl
  ctx.fill();

  // Hanging red lanterns under temple eaves
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.ellipse(templeX - 22, templeY - 12, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(templeX + 22, templeY - 12, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Beacon Light on Cù Lao (Tháp đèn báo luồng sông)
  ctx.fillStyle = '#334155';
  ctx.fillRect(templeX + 44, templeY - 36, 12, 48);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(templeX + 45, templeY - 44, 10, 8);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(templeX + 47, templeY - 42, 6, 4);

  // Water coconut palms (Dừa Nước ven sông) along Cù Lao shores
  const cuaLaoTrees = [
    { x: 670, y: 480 },
    { x: 690, y: 530 },
    { x: 860, y: 470 },
    { x: 880, y: 520 },
    { x: 830, y: 430 },
  ];
  for (const t of cuaLaoTrees) {
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.quadraticCurveTo(t.x - 6, t.y - 18, t.x + 3, t.y - 36);
    ctx.stroke();

    // Palm fronds
    ctx.fillStyle = '#15803d';
    for (let f = 0; f < 5; f++) {
      const ang = (f / 5) * Math.PI * 2;
      const fx = t.x + 3 + Math.cos(ang) * 20;
      const fy = t.y - 36 + Math.sin(ang) * 14;
      ctx.beginPath();
      ctx.moveTo(t.x + 3, t.y - 36);
      ctx.lineTo(fx, fy);
      ctx.lineTo(fx - 3, fy + 4);
      ctx.fill();
    }
  }

  // =========================================================================
  // 5. CÙ LAO BA XÊ & BÃI BỒI PHÙ SA (NORTHEAST: cols 32..42, rows 4..10)
  // =========================================================================
  // Sandy shoal sandbar
  ctx.fillStyle = 'rgba(217, 119, 6, 0.4)';
  ctx.beginPath();
  ctx.ellipse(1160, 200, 160, 70, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.ellipse(1160, 195, 145, 58, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Green reed beds & bamboo clumps
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.ellipse(1160, 190, 120, 42, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Bamboo stalks
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 1.5;
  for (let bx = 1080; bx < 1240; bx += 14) {
    ctx.beginPath();
    ctx.moveTo(bx, 190);
    ctx.lineTo(bx + 4, 165);
    ctx.stroke();
  }

  // =========================================================================
  // 6. VỰC XOÁY VÀM SÔNG SÂU (SOUTHEAST - CONFLUENCE TO ESTUARY & SEA)
  // cols 34..46, rows 20..30 (x: 1088..1472, y: 640..960)
  // =========================================================================
  const vortexX = 1280;
  const vortexY = 800;

  const vortexGrad = ctx.createRadialGradient(vortexX, vortexY, 20, vortexX, vortexY, 230);
  vortexGrad.addColorStop(0, '#000000'); // Bottomless river vortex abyss
  vortexGrad.addColorStop(0.4, 'rgba(6, 78, 59, 0.9)'); // deep emerald torrent
  vortexGrad.addColorStop(0.7, 'rgba(2, 44, 34, 0.85)');
  vortexGrad.addColorStop(1, 'rgba(2, 44, 34, 0)');
  ctx.fillStyle = vortexGrad;
  ctx.beginPath();
  ctx.ellipse(vortexX, vortexY, 220, 140, 0, 0, Math.PI * 2);
  ctx.fill();

  // Swirling water spiral lines (Xoáy nước sông sâu)
  ctx.strokeStyle = 'rgba(110, 231, 183, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 8; a += 0.2) {
    const r = a * 15;
    const sx = vortexX + Math.cos(a) * r;
    const sy = vortexY + Math.sin(a) * (r * 0.6);
    if (a === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  // Bioluminescent river spirits / bubbles rising from the deep
  const bubbleColors = ['#6ee7b7', '#34d399', '#fde047'];
  for (let s = 0; s < 26; s++) {
    const sx = 1140 + ((s * 47) % 280);
    const sy = 700 + ((s * 39) % 200);
    ctx.fillStyle = bubbleColors[s % bubbleColors.length]!;
    ctx.fillRect(sx, sy, 3, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(sx + 1, sy + 1, 1, 1);
  }

  // =========================================================================
  // 7. PHAO TIÊU BÁO LUỒNG ĐƯỜNG THỦY NỘI ĐỊA SÔNG ĐỒNG NAI
  // =========================================================================
  const buoys = [
    { x: 140, y: 140, color: '#10b981', label: 'VỀ BẾN BIÊN HÒA' },
    { x: 420, y: 440, color: '#38bdf8', label: 'LÀNG BÈ TÂN MAI' },
    { x: 1060, y: 640, color: '#ef4444', label: 'CẢNH BÁO: VÀM SÔNG SÂU' },
  ];

  for (const b of buoys) {
    // Water ripple ring
    ctx.fillStyle = 'rgba(2, 44, 34, 0.5)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 12, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red & white Vietnamese waterway navigation buoy float
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(b.x - 9, b.y + 10);
    ctx.lineTo(b.x + 9, b.y + 10);
    ctx.lineTo(b.x + 4, b.y);
    ctx.lineTo(b.x - 4, b.y);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(b.x - 7, b.y + 3, 14, 4);

    // Mast & blinking lantern
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(b.x - 1, b.y - 12, 2, 12);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - 3, b.y - 16, 6, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(b.x - 1, b.y - 15, 2, 2);

    // Buoy sign label
    ctx.font = '700 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(b.x - 50, b.y + 16, 100, 15);
    ctx.fillStyle = b.color;
    ctx.fillText(b.label, b.x, b.y + 27);
  }

  return c;
}
