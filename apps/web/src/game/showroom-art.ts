import type Phaser from 'phaser';
import { SHOWROOM_PEDESTALS, VEHICLE_DISPLAYS, vehicleById, type ShowroomPedestalDef } from '@cozy/game-data';
import { ensureVehicleTexture } from '../art/vehicle';
import { useUi } from '../lib/store';

export const SHOWROOM_TEXTURE_KEY = 'showroom:interior:v2';
export const SHOWROOM_PEDESTAL_WIDTH = 136;
export const SHOWROOM_PEDESTAL_HEIGHT = 66;
export const SHOWROOM_VEHICLE_SCALE = 2;

/**
 * Procedurally generates the authentic, luxury pixel-art showroom interior texture.
 * Features high-gloss porcelain tile reflections, acoustic timber slat walls,
 * panoramic clerestory windows, tuning garage workshop bay, VIP consultation lounge,
 * 3D multi-level vehicle turntables with neon underglow, and automatic glass doors.
 */
export function buildShowroomTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(SHOWROOM_TEXTURE_KEY)) {
    return SHOWROOM_TEXTURE_KEY;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Helper drawing functions
  const r = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  const line = (color: string, x1: number, y1: number, x2: number, y2: number, width = 1) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
    ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
    ctx.stroke();
  };

  const circle = (color: string, cx: number, cy: number, radius: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(Math.round(cx), Math.round(cy), radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const ellipse = (color: string, cx: number, cy: number, rx: number, ry: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry), 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const strokeEllipse = (color: string, cx: number, cy: number, rx: number, ry: number, width = 1) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry), 0, 0, Math.PI * 2);
    ctx.stroke();
  };

  // -------------------------------------------------------------
  // 1. BASE BACKGROUND & CEILING (y: 0 to 76)
  // -------------------------------------------------------------
  // Dark industrial structural backdrop
  r('#151e22', 0, 0, 640, 480);

  // Ceiling void & dark metallic roofing
  r('#12181b', 0, 0, 640, 24);
  // Industrial steel trusses and cross-beams
  for (let x = 16; x < 624; x += 32) {
    line('#1f2a2e', x, 0, x + 16, 18, 2);
    line('#1f2a2e', x + 16, 0, x, 18, 2);
    r('#28363b', x + 14, 16, 4, 3); // Truss junction gusset plates
  }
  r('#202c31', 0, 18, 640, 4); // Main horizontal steel I-beam
  r('#2e3e44', 0, 18, 640, 1); // Steel highlight
  r('#161f23', 0, 21, 640, 1); // Steel shadow

  // Track lighting rails across the ceiling
  r('#1b2428', 20, 22, 600, 2);
  r('#111719', 20, 24, 600, 1);
  // Track lighting fixtures & spotlight pods
  const spotlightPositions = [100, 168, 240, 320, 400, 472, 540];
  for (const sx of spotlightPositions) {
    r('#2f3e44', sx - 4, 22, 8, 4);
    r('#3b4e56', sx - 3, 26, 6, 4);
    r('#ffeaa7', sx - 2, 29, 4, 2); // Glowing lamp element
    r('#fff9db', sx - 1, 30, 2, 1);
  }

  // -------------------------------------------------------------
  // 2. PANORAMIC CLERESTORY WINDOWS (y: 12 to 38, x: 28 to 612)
  // -------------------------------------------------------------
  // Window background showing daylight sky & distant town skyline
  r('#2a373d', 26, 10, 588, 30);
  r('#7ba0b0', 28, 12, 584, 26); // Sky horizon
  r('#9ac0d0', 28, 12, 584, 14); // Upper bright daylight
  // Distant rooftop silhouettes and cozy tree canopies outside
  for (let x = 30; x < 610; x += 28) {
    const buildingH = 6 + ((x * 17) % 11);
    r('#55707d', x, 38 - buildingH, 20, buildingH);
    r('#465f6c', x + 2, 38 - buildingH, 16, 2);
    // Tree puffs
    if (x % 56 === 0) {
      ellipse('#4d6b63', x + 24, 33, 7, 5);
      ellipse('#5d8076', x + 23, 31, 5, 3);
    }
  }
  // Glass surface angled specular reflection streaks
  for (let x = 40; x < 600; x += 64) {
    line('rgba(255, 255, 255, 0.28)', x, 14, x + 24, 36, 2);
    line('rgba(255, 255, 255, 0.12)', x + 8, 14, x + 32, 36, 1);
  }
  // Architectural window mullions (black anodized steel frames)
  for (let x = 28; x <= 612; x += 44) {
    r('#182226', x - 1, 11, 3, 28);
    r('#2b3c43', x, 11, 1, 28);
  }
  r('#182226', 26, 37, 588, 3); // Bottom window sill

  // -------------------------------------------------------------
  // 3. ARCHITECTURAL FEATURE WALL: ACOUSTIC TIMBER SLATS (y: 38 to 74)
  // -------------------------------------------------------------
  // Dark charcoal acoustic felt backing
  r('#1d2427', 24, 38, 592, 36);

  // Vertical wood acoustic slats (luxury automotive showroom styling)
  for (let x = 26; x < 614; x += 4) {
    // Slat colors: warm teak & walnut
    const shade = x % 8 === 0 ? '#694833' : '#7c563e';
    r(shade, x, 39, 2, 34);
    r('#93664a', x, 39, 1, 34); // Slat edge highlight
    r('#432d20', x + 1, 39, 1, 34); // Slat drop shadow
  }

  // Brushed brass / gold horizontal divider trims
  r('#8a6f30', 24, 38, 592, 2);
  r('#d4af37', 24, 38, 592, 1); // Gold top highlight
  r('#8a6f30', 24, 71, 592, 3);
  r('#e6c35c', 24, 71, 592, 1);
  r('#524016', 24, 73, 592, 1);

  // -------------------------------------------------------------
  // 4. DEALERSHIP BRAND SIGNAGE & MARQUEE (Center: x: 196 to 444, y: 39 to 71)
  // -------------------------------------------------------------
  // High-gloss beveled sign plaque backing
  r('#0f1b1d', 194, 39, 252, 32);
  r('#172b2e', 196, 40, 248, 30);
  // Mint neon border around brand plaque
  r('#2ecc71', 196, 40, 248, 1);
  r('#2ecc71', 196, 69, 248, 1);
  r('#2ecc71', 196, 40, 1, 30);
  r('#2ecc71', 443, 40, 1, 30);
  // Neon glow soft edge
  r('rgba(46, 204, 113, 0.25)', 193, 38, 254, 34);

  // Stylized Chrome & Mint Emblem in center
  ellipse('#2ecc71', 320, 48, 9, 6);
  ellipse('#1a5c40', 320, 48, 6, 4);
  // Emblem wings / speed fin
  line('#f1c40f', 308, 48, 332, 48, 2);
  line('#ffffff', 314, 47, 326, 47, 1);

  // Text rendered with pixel styling: "GARA BẠC HÀ"
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px system-ui, sans-serif';
  // 3D Drop shadow
  ctx.fillStyle = '#102521';
  ctx.fillText('GARA BẠC HÀ', 320, 56);
  // Main lettering in luxury warm gold
  ctx.fillStyle = '#fff4cc';
  ctx.fillText('GARA BẠC HÀ', 320, 55);

  // Sub-tagline
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.fillStyle = '#6ee7b7';
  ctx.fillText('✦ MINT MOTORS · PHÒNG TRƯNG BÀY XE CHÍNH HÃNG ✦', 320, 65);
  ctx.restore();

  // -------------------------------------------------------------
  // 5. WALL TELEMETRY & DIGITAL DISPLAYS
  // -------------------------------------------------------------
  // Left: Digital Vehicle Telemetry Screen (x: 48 to 136, y: 41 to 69)
  r('#101619', 46, 40, 92, 30);
  r('#0d2830', 48, 42, 88, 26);
  r('#09414d', 49, 43, 86, 24);
  // Telemetry screen graphics: speed wave & tachometer
  line('#00e5ff', 52, 58, 68, 52, 1);
  line('#00e5ff', 68, 52, 84, 60, 1);
  line('#00e5ff', 84, 60, 102, 49, 2);
  line('#69f0ae', 102, 49, 130, 46, 2);
  // Digital mini text
  ctx.save();
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = '#80deea';
  ctx.fillText('SPEED TELEMETRY', 52, 49);
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('0-100: 2.8s', 52, 64);
  ctx.restore();
  // Screen glossy diagonal reflection
  line('rgba(255, 255, 255, 0.25)', 52, 44, 76, 66, 2);

  // Right: Price & Exchange Board (x: 504 to 592, y: 41 to 69)
  r('#101619', 502, 40, 92, 30);
  r('#211b12', 504, 42, 88, 26);
  r('#3b2d18', 505, 43, 86, 24);
  ctx.save();
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('BẢNG GIÁ NIÊM YẾT', 510, 49);
  ctx.fillStyle = '#69f0ae';
  ctx.fillText('MINT: 1,200C  SUNSET: 3.2K', 508, 57);
  ctx.fillStyle = '#ff8a80';
  ctx.fillText('SAN HO: 700C  MAY XANH: 200', 508, 64);
  ctx.restore();
  line('rgba(255, 255, 255, 0.2)', 508, 44, 532, 66, 2);

  // Framed technical blueprints (x: 146 to 186, y: 42 to 68)
  r('#0a1926', 146, 42, 40, 26);
  r('#10304a', 148, 44, 36, 22);
  // White blueprint chassis line art
  line('#80bfff', 152, 58, 180, 58, 1);
  line('#80bfff', 155, 58, 160, 50, 1);
  line('#80bfff', 160, 50, 172, 50, 1);
  line('#80bfff', 172, 50, 177, 58, 1);
  circle('#80bfff', 157, 58, 2);
  circle('#80bfff', 173, 58, 2);
  r('#d4af37', 146, 42, 40, 1); // Gold frame
  r('#d4af37', 146, 67, 40, 1);
  r('#d4af37', 146, 42, 1, 26);
  r('#d4af37', 185, 42, 1, 26);

  // Floating Trophy & Award Shelf (x: 454 to 494, y: 56)
  r('#4a5b63', 452, 56, 44, 3);
  r('#687d87', 452, 56, 44, 1);
  // Golden Championship Cups
  for (let i = 0; i < 3; i++) {
    const tx = 458 + i * 14;
    r('#d4af37', tx - 3, 51, 6, 5); // Cup bowl
    r('#ffeaa7', tx - 2, 52, 4, 3);
    r('#c59b27', tx - 1, 54, 2, 2); // Stem
    r('#997316', tx - 2, 55, 4, 1); // Base
  }

  // -------------------------------------------------------------
  // 6. HIGH-GLOSS LUXURY PORCELAIN & EPOXY FLOOR (y: 74 to 456, x: 24 to 616)
  // -------------------------------------------------------------
  // Perimeter Dark Granite Border (Circulation Threshold)
  r('#1e272a', 24, 74, 592, 382);
  r('#2d3a3e', 26, 76, 588, 378);

  // Brass Inlay Accent Line framing the showroom floor
  r('#8a7134', 30, 80, 580, 370);
  r('#e6c669', 31, 81, 578, 368);
  r('#5c491e', 32, 82, 576, 366);

  // Main Showroom Polished Tile Grid (32x32 tiles)
  for (let y = 84; y < 448; y += 32) {
    for (let x = 34; x < 606; x += 32) {
      // Subtle alternating tile shades for luxury marble effect
      const tileVariant = (Math.floor(x / 32) + Math.floor(y / 32)) % 2;
      const baseTone = tileVariant === 0 ? '#d4d9d6' : '#c8cecb';
      r(baseTone, x, y, 31, 31);

      // Fine marble veining details
      const seed = (x * 19 + y * 31) % 11;
      if (seed < 4) {
        line('#bcc3c0', x + 4, y + 6, x + 18, y + 20, 1);
        line('#e2e6e3', x + 5, y + 5, x + 19, y + 19, 1); // Highlight vein
      } else if (seed > 7) {
        line('#b8c0bd', x + 12, y + 26, x + 26, y + 8, 1);
      }

      // Tile bevel highlights (top/left bright, bottom/right grout shadow)
      r('#edf0ee', x, y, 31, 1);
      r('#edf0ee', x, y, 1, 31);
      r('#9ea6a2', x, y + 30, 31, 1);
      r('#9ea6a2', x + 30, y, 1, 31);
    }
  }

  // Polished Floor Specular Sheen Streaks (Freshly waxed showroom reflection)
  for (let y = 92; y < 440; y += 48) {
    for (const sx of [168, 320, 472]) {
      ellipse('rgba(255, 255, 255, 0.16)', sx, y, 28, 8);
      ellipse('rgba(255, 255, 255, 0.28)', sx, y, 14, 3);
    }
  }

  // Central Showroom Floor Compass Medallion (x: 320, y: 232)
  ellipse('#1a292c', 320, 232, 38, 24);
  ellipse('#263d42', 320, 232, 34, 21);
  ellipse('#d4af37', 320, 232, 30, 18);
  ellipse('#182528', 320, 232, 28, 16);
  // 8-point gold compass star in center
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    line('#e6c669', 320, 232, 320 + cos * 24, 232 + sin * 13, 2);
  }
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    line('#8a7134', 320, 232, 320 + cos * 16, 232 + sin * 9, 1);
  }
  circle('#e6c669', 320, 232, 4);
  circle('#2ecc71', 320, 232, 2); // Mint emerald center

  // -------------------------------------------------------------
  // 7. TUNING & ACCESSORIES WORKSHOP BAY (Top-Left: x: 28 to 110, y: 78 to 126)
  // -------------------------------------------------------------
  // Perforated Tool Pegboard (wall-mounted)
  r('#2f3e44', 32, 78, 48, 22);
  for (let py = 80; py < 98; py += 4) {
    for (let px = 34; px < 78; px += 4) {
      r('#192327', px, py, 1, 1); // Pegboard holes
    }
  }
  // Hanging tools: wrenches and torque drivers
  line('#bdc3c7', 38, 82, 38, 94, 2);
  line('#bdc3c7', 46, 82, 46, 92, 2);
  line('#bdc3c7', 54, 84, 54, 95, 2);
  // Red & Mint Racing Helmets on shelf
  ellipse('#e74c3c', 65, 85, 5, 4);
  r('#2c3e50', 64, 84, 6, 2); // Visor
  ellipse('#2ecc71', 74, 85, 5, 4);
  r('#2c3e50', 73, 84, 6, 2);

  // Rolling Mechanic Tool Chest (Snap-on Red Style)
  r('#161f22', 32, 102, 38, 24); // Tool chest drop shadow
  r('#c0392b', 34, 100, 34, 22); // Red steel cabinet
  r('#e74c3c', 34, 100, 34, 2); // Highlight
  r('#962d22', 34, 120, 34, 2); // Base
  // Chrome drawer pull handles
  for (let dy = 104; dy <= 118; dy += 3) {
    r('#2c3e50', 36, dy, 30, 2);
    r('#ecf0f1', 40, dy, 22, 1); // Chrome handle
  }
  // Cabinet side handle & wheels
  line('#bdc3c7', 68, 104, 70, 114, 2);
  circle('#2c3e50', 38, 123, 2);
  circle('#2c3e50', 64, 123, 2);

  // 3-Tier Alloy Rim Display Rack (x: 74 to 108, y: 92 to 124)
  r('#1e272a', 74, 94, 34, 30);
  r('#3b4b52', 76, 96, 30, 26);
  // 3 Display Rims with Tires
  // Rim 1: Gunmetal Concave
  circle('#1f2427', 84, 104, 7); // Tire
  circle('#7f8c8d', 84, 104, 5); // Alloy rim
  circle('#bdc3c7', 84, 104, 2);
  // Rim 2: Chrome Multi-Spoke
  circle('#1f2427', 98, 104, 7);
  circle('#ecf0f1', 98, 104, 5);
  circle('#3498db', 98, 104, 2);
  // Rim 3: Bronze Racing Spec
  circle('#1f2427', 91, 116, 7);
  circle('#d35400', 91, 116, 5);
  circle('#f39c12', 91, 116, 2);

  // Motor Oil & Fluid Shelf
  r('#7f8c8d', 34, 96, 38, 3);
  r('#27ae60', 36, 92, 5, 4); // Green oil can
  r('#e67e22', 43, 91, 6, 5); // Orange brake fluid
  r('#2980b9', 51, 92, 5, 4); // Blue coolant bottle

  // -------------------------------------------------------------
  // 8. VIP LOUNGE & CONSULTATION CORNER (Top-Right: x: 524 to 614, y: 78 to 126)
  // -------------------------------------------------------------
  // Executive Consultation Desk (Modern curved desk)
  r('#151e21', 536, 82, 54, 26); // Desk shadow
  r('#2c3e50', 538, 80, 50, 22); // Desk body
  r('#ecf0f1', 538, 80, 50, 2); // Polished white quartz top
  // Desktop computer monitor & desk lamp
  r('#192a33', 546, 76, 12, 8); // Monitor screen
  r('#00e5ff', 547, 77, 10, 6); // Screen display
  r('#7f8c8d', 551, 84, 2, 3); // Monitor stand
  // Brochure stand & catalog paperwork
  r('#bdc3c7', 562, 81, 6, 4);
  r('#e74c3c', 564, 82, 4, 3);

  // Consultation Office Swivel Chair
  ellipse('#1a252f', 563, 76, 6, 5);
  circle('#34495e', 563, 75, 4);

  // Tufted Cognac Leather Lounge Armchair
  r('#1a2124', 590, 84, 22, 22); // Chair shadow
  r('#8e44ad', 592, 82, 18, 18);
  r('#a0522d', 592, 82, 18, 18); // Leather seat
  r('#cd853f', 594, 84, 14, 14); // Cushion
  r('#6e3713', 592, 80, 18, 3); // Armrest top
  r('#6e3713', 590, 84, 3, 14); // Left armrest
  r('#6e3713', 609, 84, 3, 14); // Right armrest

  // Glass Coffee Table with Magazines & Coffee
  ellipse('#1c282c', 582, 108, 14, 8); // Shadow
  ellipse('#ecf0f1', 582, 106, 13, 7); // Tempered glass
  ellipse('#7fb3d5', 582, 106, 11, 5);
  r('#e74c3c', 578, 104, 4, 3); // Automotive magazine
  circle('#ffffff', 586, 105, 2); // Coffee cup

  // Refreshment Counter & Italian Espresso Machine
  r('#2c3e50', 534, 106, 32, 18);
  r('#bdc3c7', 534, 106, 32, 2); // Stainless top
  // Chrome Espresso Machine
  r('#7f8c8d', 536, 100, 10, 8);
  r('#bdc3c7', 537, 101, 8, 4);
  line('#e74c3c', 544, 103, 545, 106, 1); // Steam lever
  // Tall Water Dispenser with Blue Bottle
  r('#ecf0f1', 552, 104, 8, 12);
  ellipse('#3498db', 556, 100, 4, 6); // Blue bottle

  // Large Potted Fiddle Leaf Fig / Monstera Plant
  circle('#1a2528', 526, 120, 7); // Pot shadow
  r('#ecf0f1', 522, 114, 8, 8); // White ceramic planter
  r('#d5dbdb', 522, 114, 8, 2);
  r('#4a3728', 523, 115, 6, 2); // Dark soil
  // Lush stylized green foliage
  ellipse('#27ae60', 526, 109, 7, 5);
  ellipse('#2ecc71', 524, 107, 6, 4);
  ellipse('#1e8449', 528, 111, 5, 4);
  ellipse('#58d68d', 525, 105, 4, 3);

  // -------------------------------------------------------------
  // 9. THE 4 LUXURY DISPLAY PLATFORMS (PLINTHS)
  // -------------------------------------------------------------
  // Display definitions with unique theme colors
  const platformThemes: Record<string, { underglow: string; rim: string; deck: string }> = {
    bicycle_sky: { underglow: 'rgba(0, 229, 255, 0.45)', rim: '#00e5ff', deck: '#2b3b40' },
    motorcycle_coral: { underglow: 'rgba(244, 63, 94, 0.45)', rim: '#f43f5e', deck: '#2b1e22' },
    motorcycle_ducati: { underglow: 'rgba(220, 38, 38, 0.55)', rim: '#dc2626', deck: '#351919' },
    car_ferrari_f40: { underglow: 'rgba(239, 68, 68, 0.55)', rim: '#ef4444', deck: '#351919' },
    car_rolls_royce_phantom: { underglow: 'rgba(148, 163, 184, 0.5)', rim: '#94a3b8', deck: '#202938' },
    car_mint: { underglow: 'rgba(46, 204, 113, 0.45)', rim: '#2ecc71', deck: '#1b382b' },
    car_mercedes: { underglow: 'rgba(56, 189, 248, 0.5)', rim: '#38bdf8', deck: '#1e293b' },
    car_sunset: { underglow: 'rgba(234, 88, 12, 0.5)', rim: '#ea580c', deck: '#332014' },
    car_lamborghini: { underglow: 'rgba(234, 179, 8, 0.55)', rim: '#eab308', deck: '#352e18' },
    car_porsche: { underglow: 'rgba(14, 165, 233, 0.5)', rim: '#0ea5e9', deck: '#182b3a' },
  };

  for (const display of VEHICLE_DISPLAYS) {
    const theme = platformThemes[display.id] ?? {
      underglow: 'rgba(46, 204, 113, 0.4)',
      rim: '#2ecc71',
      deck: '#2e3d3b',
    };

    // Platform Dimensions (136px x 66px) centered at display.x, display.y
    const pw = SHOWROOM_PEDESTAL_WIDTH;
    const ph = SHOWROOM_PEDESTAL_HEIGHT;
    const px = display.x - pw / 2;
    const py = display.y - ph / 2;

    // 1. Soft Ambient Floor Shadow under plinth
    ellipse('rgba(20, 28, 30, 0.55)', display.x, display.y + 10, pw / 2 + 10, ph / 2 + 6);

    // 2. Neon LED Underglow radiating onto the floor
    ellipse(theme.underglow, display.x, display.y + 8, pw / 2 + 6, ph / 2 + 4);

    // 3. Lower Stepped Chamfer Base (Gunmetal Riser)
    r('#1b2629', px, py + 8, pw, ph - 6);
    r('#28383c', px + 2, py + 6, pw - 4, ph - 6);

    // 4. Main Plinth Platform Body with Rounded Bevel Edge
    r('#1f2c2f', px, py, pw, ph - 4);
    r('#33464b', px + 1, py + 1, pw - 2, ph - 6);
    r(theme.deck, px + 2, py + 2, pw - 4, ph - 8);

    // 5. LED Underglow Rim / Neon Border on Top Surface
    ctx.strokeStyle = theme.rim;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 8);
    // Neon corner bright spots
    circle('#ffffff', px + 3, py + 3, 2);
    circle('#ffffff', px + pw - 3, py + 3, 2);
    circle('#ffffff', px + 3, py + ph - 7, 2);
    circle('#ffffff', px + pw - 3, py + ph - 7, 2);

    // 6. Concentric Turntable Circular Rotating Plate
    ellipse('#223135', display.x, display.y - 2, 54, 24);
    ellipse('#2d3f44', display.x, display.y - 2, 50, 22);
    strokeEllipse('#415b62', display.x, display.y - 2, 46, 20, 1);
    strokeEllipse(theme.rim, display.x, display.y - 2, 38, 16, 1);
    ellipse('#1b282b', display.x, display.y - 2, 32, 13);
    // Radial turntable indexing notches
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      line(
        '#56737c',
        display.x + Math.cos(a) * 44,
        display.y - 2 + Math.sin(a) * 19,
        display.x + Math.cos(a) * 49,
        display.y - 2 + Math.sin(a) * 21,
        1,
      );
    }

    // 7. Polished Chrome Barrier Stanchion Bollards at the 4 corners
    const stanchions = [
      { x: px - 2, y: py - 4 },
      { x: px + pw + 2, y: py - 4 },
      { x: px - 2, y: py + ph },
      { x: px + pw + 2, y: py + ph },
    ];
    for (const st of stanchions) {
      circle('rgba(0,0,0,0.3)', st.x, st.y + 4, 4); // Shadow
      r('#bdc3c7', st.x - 2, st.y - 8, 4, 12); // Chrome post
      r('#ecf0f1', st.x - 1, st.y - 8, 2, 12); // Specular highlight
      circle('#d4af37', st.x, st.y - 8, 3); // Golden top sphere
      circle('#ffffff', st.x - 1, st.y - 9, 1);
      r('#7f8c8d', st.x - 3, st.y + 3, 6, 2); // Heavy base flange
    }

    // Red Velvet Braided Rope connecting stanchions
    line('#c0392b', px - 2, py - 10, px + pw + 2, py - 10, 2);
    line('#e74c3c', px - 2, py - 11, px + pw + 2, py - 11, 1);

    // 8. Interactive Digital Vehicle Spec Kiosk / Info Totem (Front-Left)
    const kx = px - 10;
    const ky = py + ph - 16;
    circle('rgba(0,0,0,0.4)', kx + 6, ky + 14, 7); // Shadow
    r('#2c3e50', kx + 4, ky + 4, 5, 10); // Totem stand
    r('#151e22', kx, ky - 8, 14, 14); // Tablet frame
    r('#0d252b', kx + 1, ky - 7, 12, 12); // Screen
    r(theme.rim, kx + 2, ky - 6, 10, 10); // Glowing mini vehicle spec screen
    r('#ffffff', kx + 4, ky - 4, 6, 4); // Mini car silhouette
    circle('#ffd700', kx + 7, ky + 1, 1); // Status LED

    // 9. Contact Shadow & Floor Reflection on the platform deck
    ellipse('rgba(10, 15, 18, 0.65)', display.x, display.y + 4, 36, 10);
  }

  // -------------------------------------------------------------
  // 10. GRAND ENTRANCE & AUTOMATIC GLASS DOORS (Bottom Center: x: 256 to 384, y: 412 to 478)
  // -------------------------------------------------------------
  // Heavy-duty Ribbed Floor Welcome Mat
  r('#141d1f', 262, 412, 116, 44);
  r('#202e32', 264, 414, 112, 40);
  // Traction ribs
  for (let my = 416; my < 452; my += 3) {
    line('#2b3d42', 266, my, 374, my, 1);
  }
  // Mat Gold border
  r('#d4af37', 264, 414, 112, 1);
  r('#d4af37', 264, 453, 112, 1);
  r('#d4af37', 264, 414, 1, 40);
  r('#d4af37', 375, 414, 1, 40);

  // Brushed Stainless Steel Door Threshold & Frame
  r('#4a5e64', 256, 452, 128, 6);
  r('#829ba2', 256, 452, 128, 2); // Highlight
  r('#2e3a3e', 256, 457, 128, 1); // Shadow

  // Sliding Glass Door Panels (Tinted tempered glass)
  // Left Glass Door
  r('rgba(52, 152, 219, 0.35)', 260, 456, 56, 22);
  r('#95a5a6', 260, 456, 56, 1); // Metal frame
  r('#ecf0f1', 312, 458, 2, 18); // Vertical door pull handle
  // Right Glass Door
  r('rgba(52, 152, 219, 0.35)', 324, 456, 56, 22);
  r('#95a5a6', 324, 456, 56, 1);
  r('#ecf0f1', 326, 458, 2, 18);
  // Frosted safety dot stripe across doors
  for (let gx = 264; gx < 376; gx += 6) {
    if (gx < 314 || gx > 324) circle('#ffffff', gx, 466, 1);
  }

  // Overhead Automatic Motion Sensors & LED indicators
  r('#1e272a', 308, 452, 24, 4);
  circle('#2ecc71', 314, 454, 1); // Green active sensor LED
  circle('#2ecc71', 326, 454, 1);

  // -------------------------------------------------------------
  // 11. PERIMETER WALL BASEBOARDS & CORNER ACCENTS
  // -------------------------------------------------------------
  // Baseboard trim running along all walls
  r('#192326', 24, 72, 592, 4);
  r('#2c3e44', 24, 73, 592, 2);
  // Left wall border
  r('#192326', 20, 72, 4, 386);
  r('#2c3e44', 22, 72, 2, 386);
  // Right wall border
  r('#192326', 616, 72, 4, 386);
  r('#2c3e44', 616, 72, 2, 386);
  // Bottom wall border
  r('#192326', 20, 456, 236, 4);
  r('#192326', 384, 456, 236, 4);

  // Register canvas as texture in Phaser with pixel-perfect nearest filtering
  const texture = scene.textures.addCanvas(SHOWROOM_TEXTURE_KEY, canvas);
  texture?.setFilter?.(0);
  return SHOWROOM_TEXTURE_KEY;
}

export interface ShowroomDisplayController {
  updatePedestal: (pedestalIndex: number, vehicleId: string) => void;
  destroy: () => void;
}

/**
 * Creates dynamic interactive vehicle displays, signage, specular spotlights,
 * interactive kiosks, and receptionist NPC inside the showroom scene.
 */
export function populateShowroomElements(scene: Phaser.Scene): ShowroomDisplayController {
  // 1. Add background texture
  scene.add.image(0, 0, SHOWROOM_TEXTURE_KEY).setOrigin(0, 0).setDepth(-10);

  // 2. High-End Illuminated Exit Signage (above exit doors)
  const exitContainer = scene.add.container(320, 432).setDepth(450);
  const exitGfx = scene.add.graphics();
  // Glowing green exit box
  exitGfx.fillStyle(0x0a2618, 0.9).fillRoundedRect(-66, -12, 132, 24, 6);
  exitGfx.lineStyle(2, 0x2ecc71, 1).strokeRoundedRect(-66, -12, 132, 24, 6);
  exitGfx.fillStyle(0x2ecc71, 0.2).fillRoundedRect(-66, -12, 132, 24, 6);
  exitContainer.add(exitGfx);

  const exitText = scene.add
    .text(0, 0, '🚪 LỐI RA SÂN GARA ↓', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      color: '#e8f5e9',
      fontStyle: 'bold',
      stroke: '#0d381e',
      strokeThickness: 3,
    })
    .setOrigin(0.5);
  exitContainer.add(exitText);

  // Soft breathing tween on exit sign
  scene.tweens.add({
    targets: exitContainer,
    alpha: { from: 0.9, to: 1.0 },
    duration: 1600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Track each pedestal's interactive visual components for dynamic cycling
  const pedestalSlots: Record<
    number,
    {
      pedestal: ShowroomPedestalDef;
      vehicleImg: Phaser.GameObjects.Image;
      title: Phaser.GameObjects.Text;
      priceText: Phaser.GameObjects.Text;
      categoryText: Phaser.GameObjects.Text;
    }
  > = {};

  // 3. Vehicles on Display with Enhanced Depth, Labels and Interactive Spec Badges
  for (let i = 0; i < SHOWROOM_PEDESTALS.length; i++) {
    const pedestal = SHOWROOM_PEDESTALS[i]!;
    const display = VEHICLE_DISPLAYS[i] ?? { id: pedestal.vehicles[0]!, x: pedestal.x, y: pedestal.y };
    const currentVehicleId =
      useUi.getState().showroomPedestalOverrides[pedestal.index] ?? pedestal.vehicles[0] ?? display.id;
    const vehicle = vehicleById(currentVehicleId) ?? vehicleById(display.id);
    if (!vehicle) continue;

    // Vehicle Sprite scaled crisply at native integer ratio with pixel-perfect nearest filtering
    const texKey = ensureVehicleTexture(scene, vehicle.id, 2);
    const vehicleImg = scene.add
      .image(display.x, display.y - 6, texKey)
      .setScale(SHOWROOM_VEHICLE_SCALE)
      .setDepth(display.y);
    vehicleImg.texture?.setFilter?.(0);

    // Subtle gentle idle hover/turntable sheen tween
    scene.tweens.add({
      targets: vehicleImg,
      y: display.y - 8,
      duration: 2200 + (display.x % 500),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Sleek Illuminated Nameplate & Price Tag (Floating below vehicle)
    const labelContainer = scene.add.container(display.x, display.y + 36).setDepth(display.y + 20);
    const labelGfx = scene.add.graphics();
    labelGfx.fillStyle(0x131f22, 0.9).fillRoundedRect(-112, -14, 224, 42, 6);
    labelGfx.lineStyle(1.5, 0x3d5a5e, 0.9).strokeRoundedRect(-112, -14, 224, 42, 6);
    labelContainer.add(labelGfx);

    const initialIdx = pedestal.vehicles.indexOf(vehicle.id);
    const categoryText = scene.add
      .text(
        0,
        -5,
        `${vehicle.brand} · ${pedestal.category} · ${(initialIdx >= 0 ? initialIdx : 0) + 1}/${pedestal.vehicles.length}`,
        {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '8px',
          color: '#6ee7b7',
          fontStyle: 'bold',
          stroke: '#0d2822',
          strokeThickness: 2,
        },
      )
      .setOrigin(0.5);

    const title = scene.add
      .text(0, 3, vehicle.name, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#101c1d',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    const priceText = scene.add
      .text(
        0,
        13,
        `${vehicle.price.toLocaleString('vi-VN')} Coin · ×${(vehicle.speed / 150).toFixed(1)} tốc độ`,
        {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '8.5px',
          color: '#ffd54f',
          fontStyle: 'bold',
          stroke: '#1b231a',
          strokeThickness: 2,
        },
      )
      .setOrigin(0.5);

    // Interactive [◀] and [▶] cycling buttons flanking the nameplate
    const leftBtn = scene.add
      .text(-103, 4, '◀', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
        color: '#4eedca',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    if (typeof leftBtn.setInteractive === 'function') {
      leftBtn.setInteractive({ useHandCursor: true });
      leftBtn.on?.('pointerdown', () => useUi.getState().cycleShowroomPedestal(-1, pedestal.index));
    }

    const rightBtn = scene.add
      .text(103, 4, '▶', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
        color: '#4eedca',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    if (typeof rightBtn.setInteractive === 'function') {
      rightBtn.setInteractive({ useHandCursor: true });
      rightBtn.on?.('pointerdown', () => useUi.getState().cycleShowroomPedestal(1, pedestal.index));
    }

    labelContainer.add(categoryText);
    labelContainer.add(title);
    labelContainer.add(priceText);
    labelContainer.add(leftBtn);
    labelContainer.add(rightBtn);

    // Key prompt badge floating above the interactive kiosk
    const kx = display.x - 68;
    const ky = display.y + 22;
    const badge = scene.add.container(kx, ky).setDepth(display.y + 25);
    const bg = scene.add.graphics();
    bg.fillStyle(0x0f2722, 0.9).fillRoundedRect(-14, -8, 28, 16, 4);
    bg.lineStyle(1, 0x2ecc71, 0.8).strokeRoundedRect(-14, -8, 28, 16, 4);
    badge.add(bg);
    badge.add(
      scene.add
        .text(0, 0, 'E', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#a7f3d0',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );

    pedestalSlots[pedestal.index] = {
      pedestal,
      vehicleImg,
      title,
      priceText,
      categoryText,
    };
  }

  // 4. Dealership Sales Advisor NPC ("Tư vấn viên Minh Quân") at reception desk
  createShowroomAdvisor(scene, 563, 75);

  return {
    updatePedestal(pedestalIndex: number, vehicleId: string) {
      const slot = pedestalSlots[pedestalIndex];
      if (!slot) return;
      const v = vehicleById(vehicleId);
      if (!v) return;
      const texKey = ensureVehicleTexture(scene, vehicleId, 2);
      slot.vehicleImg.setTexture?.(texKey);
      slot.vehicleImg.texture?.setFilter?.(0);
      slot.title.setText?.(v.name);
      slot.priceText.setText?.(
        `${v.price.toLocaleString('vi-VN')} Coin · ×${(v.speed / 150).toFixed(1)} tốc độ`,
      );
      const vIdx = slot.pedestal.vehicles.indexOf(vehicleId);
      slot.categoryText.setText?.(
        `${v.brand} · ${slot.pedestal.category} · ${(vIdx >= 0 ? vIdx : 0) + 1}/${slot.pedestal.vehicles.length}`,
      );
      if (scene.tweens?.add) {
        scene.tweens.add({
          targets: slot.vehicleImg,
          scaleX: { from: SHOWROOM_VEHICLE_SCALE * 0.85, to: SHOWROOM_VEHICLE_SCALE },
          scaleY: { from: SHOWROOM_VEHICLE_SCALE * 0.85, to: SHOWROOM_VEHICLE_SCALE },
          alpha: { from: 0.6, to: 1.0 },
          duration: 200,
          ease: 'Back.easeOut',
        });
      }
    },
    destroy() {},
  };
}

/**
 * Creates the showroom advisor NPC sprite and floating dialogue badge.
 */
function createShowroomAdvisor(scene: Phaser.Scene, x: number, y: number) {
  const npcKey = 'showroom:npc:advisor';
  if (!scene.textures.exists(npcKey)) {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 40;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const r = (color: string, rx: number, ry: number, rw: number, rh: number) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(rx), Math.round(ry), Math.round(rw), Math.round(rh));
    };

    // Hair & Head
    r('#1f1917', 10, 4, 12, 10);
    r('#2c221e', 11, 3, 10, 4);
    r('#eec9a3', 11, 7, 10, 9); // Skin face
    r('#1f1917', 13, 10, 2, 2); // Eyes
    r('#1f1917', 17, 10, 2, 2);
    r('#d49774', 14, 13, 4, 1); // Smile

    // Professional Navy Vest & White Collared Shirt
    r('#ffffff', 9, 16, 14, 12); // White shirt
    r('#1a293b', 9, 16, 4, 12); // Navy vest left
    r('#1a293b', 19, 16, 4, 12); // Navy vest right
    r('#c0392b', 15, 17, 2, 8); // Red tie
    r('#ffd700', 11, 20, 2, 3); // Gold dealership badge!

    // Navy trousers
    r('#141d28', 10, 28, 12, 10);
    r('#0d131a', 11, 28, 4, 10);
    r('#0d131a', 17, 28, 4, 10);
    // Shoes
    r('#000000', 10, 37, 5, 3);
    r('#000000', 17, 37, 5, 3);

    scene.textures.addCanvas(npcKey, c);
  }

  const advisor = scene.add.image(x, y, npcKey).setDepth(y + 20);

  // Floating advisor name tag & speech cue
  const tag = scene.add.container(x, y - 26).setDepth(y + 30);
  const tagGfx = scene.add.graphics();
  tagGfx.fillStyle(0x132328, 0.88).fillRoundedRect(-48, -9, 96, 18, 5);
  tagGfx.lineStyle(1, 0x4eedca, 0.7).strokeRoundedRect(-48, -9, 96, 18, 5);
  tag.add(tagGfx);
  tag.add(
    scene.add
      .text(0, 0, 'Tư vấn viên Minh Quân', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '8px',
        color: '#bbf7d0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );

  // Gentle breath tween on advisor
  scene.tweens.add({
    targets: advisor,
    y: y - 1,
    duration: 1800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}
