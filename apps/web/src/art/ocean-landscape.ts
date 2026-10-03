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
 * 2026 Masterpiece Ocean Realm Landscape:
 * Renders the 1536x1024 offshore oceanic world:
 * - Bioluminescent coral reefs in the shallows (turquoise & jade lagoon)
 * - Central Angler's Isle (Đảo Thần Ngư) with stone dock, ancient lighthouse, cliffs & palms
 * - Deep open ocean swells with wave foams and sun caustics
 * - Abyssal Trench in the southeast (midnight void waters with glowing runes & vortex)
 * - Northwest return channel buoy heading back to town pier
 */
export function paintOceanLandscape(): HTMLCanvasElement {
  const c = canvas(OCEAN_WIDTH, OCEAN_HEIGHT);
  const ctx = c.getContext('2d')!;

  // 1. Deep Ocean Base Gradient
  const baseGrad = ctx.createLinearGradient(0, 0, OCEAN_WIDTH, OCEAN_HEIGHT);
  baseGrad.addColorStop(0, '#0c4a6e'); // NW: coastal deep blue
  baseGrad.addColorStop(0.35, '#075985'); // Mid-west: open water
  baseGrad.addColorStop(0.7, '#0f172a'); // East / SE: deep dropoff
  baseGrad.addColorStop(1, '#020617'); // SE corner: Abyssal Trench void
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, OCEAN_WIDTH, OCEAN_HEIGHT);

  // 2. Open Ocean Wave Ribs & Swell Patterns
  ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
  for (let y = 16; y < OCEAN_HEIGHT; y += 24) {
    const offset = Math.sin(y * 0.05) * 20;
    for (let x = 0; x < OCEAN_WIDTH; x += 64) {
      ctx.fillRect(x + offset, y, 32, 2);
      ctx.fillRect(x + offset + 8, y + 2, 16, 1);
    }
  }

  // 3. Coral Reef Shelf (North-West to North-East Lagoon: rows 2..9, cols 14..34)
  const coralGrad = ctx.createRadialGradient(720, 240, 40, 720, 240, 280);
  coralGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)'); // glowing turquoise
  coralGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.28)');
  coralGrad.addColorStop(1, 'rgba(12, 74, 110, 0)');
  ctx.fillStyle = coralGrad;
  ctx.beginPath();
  ctx.ellipse(720, 240, 320, 160, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw colorful coral heads & sea anemones on the shelf
  const coralColors = ['#f43f5e', '#ec4899', '#a855f7', '#fbbf24', '#2dd4bf'];
  for (let i = 0; i < 48; i++) {
    const cx = 520 + ((i * 47) % 400);
    const cy = 120 + ((i * 31) % 200);
    const rad = 6 + (i % 8);
    const col = coralColors[i % coralColors.length]!;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy + 3, rad + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();

    // Coral highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 2, 2, 2);
  }

  // 4. Central Angler's Isle (Đảo Thần Ngư) - cols 18..28, rows 12..20
  // (x: 576..896, y: 384..640)
  // Island drop shadow on water
  ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
  ctx.beginPath();
  ctx.ellipse(736, 520, 170, 105, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sandy beach shoreline
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.ellipse(736, 510, 160, 95, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rocky grass interior plateau
  ctx.fillStyle = '#15803d'; // lush coastal grass
  ctx.beginPath();
  ctx.ellipse(736, 500, 135, 75, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.ellipse(736, 490, 115, 60, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stone cliffs & rock outcroppings
  ctx.fillStyle = '#475569';
  ctx.fillRect(660, 470, 36, 24);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(662, 468, 32, 4);
  ctx.fillStyle = '#334155';
  ctx.fillRect(660, 490, 36, 4);

  ctx.fillStyle = '#475569';
  ctx.fillRect(780, 480, 42, 20);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(782, 478, 38, 3);

  // 5. Ancient Stone Dock (Cầu Tàu Đảo Thần Ngư) on south shore of island
  // (cols 22..24, rows 19..22 -> x: 704..768, y: 608..704)
  // Wooden pilings in water
  ctx.fillStyle = '#3e2723';
  ctx.fillRect(710, 630, 8, 70);
  ctx.fillRect(754, 630, 8, 70);
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(712, 630, 4, 70);
  ctx.fillRect(756, 630, 4, 70);

  // Pier stone/timber deck
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(704, 620, 64, 74);
  ctx.fillStyle = '#a1887f';
  for (let py = 624; py < 690; py += 8) {
    ctx.fillRect(706, py, 60, 6);
  }
  // Dock bollards / mooring posts
  ctx.fillStyle = '#263238';
  ctx.fillRect(706, 680, 6, 12);
  ctx.fillRect(760, 680, 6, 12);
  ctx.fillStyle = '#90a4ae';
  ctx.fillRect(707, 680, 4, 3);
  ctx.fillRect(761, 680, 4, 3);

  // 6. Historic Grand Lighthouse (Hải Đăng Cổ) on island peak (x: 736, y: 440)
  // Tower base shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
  ctx.beginPath();
  ctx.ellipse(736, 460, 26, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Granite base
  ctx.fillStyle = '#334155';
  ctx.fillRect(722, 426, 28, 30);
  // Red & White iconic bands
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(724, 396, 24, 30);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(725, 368, 22, 28);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(726, 342, 20, 26);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(727, 318, 18, 24);

  // Lantern room balcony & brass housing
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(720, 314, 32, 4);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(725, 298, 22, 16);
  // Glowing lighthouse beacon glass
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(728, 301, 16, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(732, 303, 8, 6);
  // Domed copper roof & lightning finial
  ctx.fillStyle = '#0d9488'; // aged verdigris copper
  ctx.beginPath();
  ctx.arc(736, 298, 14, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(735, 276, 2, 8); // finial spike

  // Lighthouse light beam cone (gentle radiant aura)
  const beamGrad = ctx.createRadialGradient(736, 306, 5, 736, 306, 380);
  beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
  beamGrad.addColorStop(0.4, 'rgba(254, 240, 138, 0.12)');
  beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.arc(736, 306, 380, 0, Math.PI * 2);
  ctx.fill();

  // 7. Coastal Palms on the island
  const palmCoords = [
    { x: 640, y: 510 },
    { x: 820, y: 520 },
    { x: 790, y: 460 },
  ];
  for (const p of palmCoords) {
    // Curved trunk
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x - 8, p.y - 25, p.x + 4, p.y - 45);
    ctx.stroke();

    // Fronds
    ctx.fillStyle = '#15803d';
    for (let f = 0; f < 5; f++) {
      const angle = (f / 5) * Math.PI * 2;
      const fx = p.x + 4 + Math.cos(angle) * 24;
      const fy = p.y - 45 + Math.sin(angle) * 16;
      ctx.beginPath();
      ctx.moveTo(p.x + 4, p.y - 45);
      ctx.lineTo(fx, fy);
      ctx.lineTo(fx - 4, fy + 6);
      ctx.fill();
    }
  }

  // 8. Abyssal Trench (Rãnh Biển Sâu) in Southeast (cols 34..46, rows 20..30)
  // (x: 1088..1472, y: 640..960)
  const trenchGrad = ctx.createRadialGradient(1280, 800, 30, 1280, 800, 240);
  trenchGrad.addColorStop(0, '#000000'); // bottomless void
  trenchGrad.addColorStop(0.5, 'rgba(46, 16, 101, 0.85)'); // eldritch violet
  trenchGrad.addColorStop(0.85, 'rgba(15, 23, 42, 0.9)');
  trenchGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = trenchGrad;
  ctx.beginPath();
  ctx.ellipse(1280, 800, 220, 140, 0, 0, Math.PI * 2);
  ctx.fill();

  // Abyssal whirlpool swirl spiral lines
  ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 8; a += 0.2) {
    const r = a * 16;
    const sx = 1280 + Math.cos(a) * r;
    const sy = 800 + Math.sin(a) * (r * 0.6);
    if (a === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  // Luminescent Abyssal Spores / Runes
  const sporeColors = ['#c084fc', '#38bdf8', '#e879f9'];
  for (let s = 0; s < 24; s++) {
    const sx = 1140 + ((s * 53) % 280);
    const sy = 700 + ((s * 37) % 200);
    ctx.fillStyle = sporeColors[s % sporeColors.length]!;
    ctx.fillRect(sx, sy, 3, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(sx + 1, sy + 1, 1, 1);
  }

  // 9. Floating Navigation Buoys with blinking lanterns
  // Buoy 1: NW return channel to Town (col 4, row 4 -> x: 128, y: 128)
  // Buoy 2: Coral shelf marker (col 12, row 14 -> x: 384, y: 448)
  // Buoy 3: Abyssal warning buoy (col 33, row 20 -> x: 1056, y: 640)
  const buoys = [
    { x: 140, y: 140, color: '#10b981', label: 'VỀ THỊ TRẤN' },
    { x: 384, y: 448, color: '#38bdf8', label: 'RẠN SAN HÔ' },
    { x: 1056, y: 640, color: '#ef4444', label: 'CẢNH BÁO: RÃNH VỰC' },
  ];

  for (const b of buoys) {
    // Water ripple around buoy
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 12, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red/White painted conical buoy float
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(b.x - 8, b.y + 10);
    ctx.lineTo(b.x + 8, b.y + 10);
    ctx.lineTo(b.x + 4, b.y);
    ctx.lineTo(b.x - 4, b.y);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(b.x - 6, b.y + 3, 12, 4);

    // Mast and blinking light cage
    ctx.fillStyle = '#334155';
    ctx.fillRect(b.x - 1, b.y - 12, 2, 12);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - 3, b.y - 16, 6, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(b.x - 1, b.y - 15, 2, 2);

    // Floating text tag
    ctx.font = '700 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(b.x - 44, b.y + 16, 88, 14);
    ctx.fillStyle = b.color;
    ctx.fillText(b.label, b.x, b.y + 26);
  }

  return c;
}
