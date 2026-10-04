import type { TownPropKind } from '@cozy/game-data';
import { INK } from './pixel';
export { BUILDING_ROOF, drawTree, paintBuilding, paintTown } from './town-landscape';

/**
 * High-detail town props:
 * - Fountain: Multi-tiered circular limestone fountain with glistening waterfalls and rippling basin
 * - Event Board: Gabled roof canopy with corkboard, pinned notices, wax seals
 * - Kiosk: Retro-futuristic brass & mahogany arcade terminal with glowing AI core
 * - Bench: Ornate cast-iron scrollwork with curved polished oak slats
 * - Lamp: Victorian wrought-iron carriage streetlamp with warm ambient filament
 */
export function paintProp(kind: TownPropKind): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;

  if (['planter', 'crate', 'table', 'sign'].includes(kind)) {
    c.width = kind === 'sign' ? 72 : kind === 'table' ? 52 : 40;
    c.height = kind === 'sign' ? 54 : kind === 'table' ? 42 : 34;
    ctx.imageSmoothingEnabled = false;
    const box = (color: string, x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    box('rgba(54,64,43,0.2)', 4, c.height - 4, c.width - 8, 4);
    if (kind === 'planter') {
      box('#8b6148', 7, 20, 26, 12);
      box('#bd8965', 9, 21, 22, 9);
      box('#d0a37b', 6, 18, 28, 4);
      box('#557b4c', 8, 11, 24, 8);
      box('#84a568', 12, 8, 16, 6);
      for (let i = 0; i < 5; i++) {
        box(i % 2 ? '#e4b3a2' : '#f3dfae', 9 + i * 5, 7 + (i % 2) * 4, 4, 4);
      }
    } else if (kind === 'crate') {
      box('#79563c', 4, 10, 29, 22);
      box('#b99463', 5, 11, 27, 19);
      for (let y = 14; y < 30; y += 6) box('#8a684a', 5, y, 27, 1);
      box('#d1b282', 6, 12, 3, 18);
      box('#d1b282', 28, 12, 3, 18);
      box('#e8d7ae', 13, 15, 12, 8);
      box('#967c59', 15, 17, 8, 1);
    } else if (kind === 'table') {
      box('#6c5140', 12, 20, 3, 19);
      box('#6c5140', 37, 20, 3, 19);
      box('#7c5f45', 3, 12, 46, 14);
      box('#ccac7b', 4, 11, 44, 11);
      box('#e6cba0', 5, 11, 42, 2);
      box('#ab875b', 25, 13, 1, 9);
      box('#fbedd4', 17, 8, 8, 5);
      box('#6c5140', 19, 8, 4, 2);
      box('#ecce94', 29, 9, 7, 3);
    } else {
      box('#785d42', 34, 17, 5, 35);
      box('#b59a6c', 35, 17, 2, 32);
      box('#725b44', 3, 8, 66, 14);
      box('#e2cf9e', 4, 9, 64, 11);
      box('#725b44', 3, 25, 66, 14);
      box('#c5b985', 4, 26, 64, 11);
      ctx.font = '700 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#4d5140';
      ctx.fillText('CẦU HÓA AN →', 36, 18);
      ctx.fillText('← PHỐ CHỢ', 36, 35);
    }
  } else if (kind === 'fountain') {
    c.width = 76;
    c.height = 76;

    // Soft circular shadow
    ctx.fillStyle = 'rgba(28, 24, 38, 0.28)';
    ctx.beginPath();
    ctx.ellipse(38, 52, 34, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outer carved limestone basin rim
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(38, 48, 33, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b5ada0';
    ctx.beginPath();
    ctx.ellipse(38, 48, 32, 19, 0, 0, Math.PI * 2);
    ctx.fill();

    // Top carved rim highlight
    ctx.fillStyle = '#dfd8cc';
    ctx.beginPath();
    ctx.ellipse(38, 46, 31, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deep water pool
    ctx.fillStyle = '#4c9ec2';
    ctx.beginPath();
    ctx.ellipse(38, 48, 27, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water ripple rings
    ctx.strokeStyle = '#8ee0f8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(38, 48, 20, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(38, 48, 12, 6, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Center stone pillar pedestal
    ctx.fillStyle = INK;
    ctx.fillRect(32, 20, 12, 28);
    ctx.fillStyle = '#9e968a';
    ctx.fillRect(33, 21, 10, 26);
    ctx.fillStyle = '#ded7cb';
    ctx.fillRect(33, 21, 3, 26);

    // Upper bowl tier
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(38, 22, 17, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cfc7ba';
    ctx.beginPath();
    ctx.ellipse(38, 21, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6ab8d9';
    ctx.beginPath();
    ctx.ellipse(38, 21, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spouting finial & crystal water streams
    ctx.fillStyle = '#ebe6dc';
    ctx.fillRect(36, 12, 4, 10);
    ctx.fillStyle = '#9fe8ff';
    ctx.fillRect(37, 6, 2, 8); // water jet
    ctx.fillRect(35, 8, 6, 2);
    // Waterfalls falling from upper bowl to basin
    ctx.fillStyle = 'rgba(180, 240, 255, 0.85)';
    ctx.fillRect(24, 24, 2, 22);
    ctx.fillRect(50, 24, 2, 22);
    ctx.fillRect(37, 26, 2, 20);
  } else if (kind === 'board') {
    c.width = 76;
    c.height = 70;

    // Ground shadow
    ctx.fillStyle = 'rgba(28, 24, 38, 0.22)';
    ctx.fillRect(8, 62, 12, 4);
    ctx.fillRect(56, 62, 12, 4);

    // Sturdy wooden support posts
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(11, 28, 7, 38);
    ctx.fillRect(58, 28, 7, 38);
    ctx.fillStyle = '#7a4e2d';
    ctx.fillRect(12, 28, 3, 38);
    ctx.fillRect(59, 28, 3, 38);

    // Main notice board frame
    ctx.fillStyle = INK;
    ctx.fillRect(3, 10, 70, 46);
    ctx.fillStyle = '#855633';
    ctx.fillRect(4, 11, 68, 44);

    // Warm textured corkboard backing
    ctx.fillStyle = '#e8d4a9';
    ctx.fillRect(7, 14, 62, 38);
    ctx.fillStyle = '#ddc594';
    for (let x = 8; x < 68; x += 4) {
      for (let y = 15; y < 51; y += 4) {
        if ((x + y) % 3 === 0) ctx.fillRect(x, y, 1, 1);
      }
    }

    // Gabled shingle canopy roof over the board!
    ctx.fillStyle = INK;
    ctx.fillRect(0, 5, 76, 8);
    ctx.fillStyle = '#9e432d'; // terracotta rooflet
    ctx.fillRect(1, 6, 74, 6);
    ctx.fillStyle = '#d4654b';
    ctx.fillRect(1, 6, 74, 2);

    // Colorful pinned flyers and notices
    // 1. Parchment quest flyer (left)
    ctx.fillStyle = '#fdfaf0';
    ctx.fillRect(9, 17, 24, 18);
    ctx.fillStyle = '#5c4d3c';
    ctx.fillRect(11, 20, 16, 2);
    ctx.fillRect(11, 24, 20, 1);
    ctx.fillRect(11, 27, 18, 1);
    ctx.fillRect(11, 30, 12, 1);
    // Red wax seal
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(25, 28, 5, 5);

    // 2. Event poster (right)
    ctx.fillStyle = '#fce5cd';
    ctx.fillRect(37, 16, 28, 16);
    ctx.fillStyle = '#e06666';
    ctx.fillRect(39, 19, 12, 2);
    ctx.fillRect(39, 23, 24, 2);
    // Yellow star pin
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(49, 15, 4, 3);

    // 3. Mini note & photo (bottom)
    ctx.fillStyle = '#d9ead3';
    ctx.fillRect(14, 38, 20, 12);
    ctx.fillStyle = '#fff2cc';
    ctx.fillRect(38, 35, 14, 14);
    ctx.fillStyle = '#6fa8dc';
    ctx.fillRect(40, 37, 10, 8); // photo of town

    // Push pins (brass & red)
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(20, 16, 2, 2);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(23, 37, 2, 2);
  } else if (kind === 'kiosk') {
    c.width = 80;
    c.height = 76;

    // Contact shadow
    ctx.fillStyle = 'rgba(28, 24, 38, 0.28)';
    ctx.fillRect(6, 68, 68, 8);

    // Steampunk / retro-futuristic arcade housing
    ctx.fillStyle = INK;
    ctx.fillRect(6, 10, 68, 62);
    ctx.fillStyle = '#48356b'; // deep cosmic purple
    ctx.fillRect(7, 11, 66, 60);

    // Polished mahogany wooden side pillars
    ctx.fillStyle = '#6b3318';
    ctx.fillRect(7, 11, 6, 60);
    ctx.fillRect(67, 11, 6, 60);
    ctx.fillStyle = '#8f4a27';
    ctx.fillRect(8, 11, 2, 60);

    // Glowing CRT Display Screen
    ctx.fillStyle = '#0f1826';
    ctx.fillRect(15, 18, 50, 32);
    ctx.fillStyle = '#17363f';
    ctx.fillRect(16, 19, 48, 30);

    // Cyan glowing neural AI waves & readouts
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(20, 23, 14, 2);
    ctx.fillRect(20, 28, 38, 2);
    ctx.fillRect(20, 33, 26, 2);
    ctx.fillRect(20, 38, 40, 3);
    // Golden reward spark icon
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(48, 22, 6, 6);

    // Lower control panel with glowing buttons & brass coin slot
    ctx.fillStyle = '#261b3d';
    ctx.fillRect(13, 53, 54, 18);
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(18, 59, 8, 3); // coin slot
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(36, 58, 4, 4); // green button
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(44, 58, 4, 4); // red button
    ctx.fillStyle = '#3498db';
    ctx.fillRect(52, 58, 4, 4); // blue button

    // Marquee top header
    ctx.fillStyle = INK;
    ctx.fillRect(2, 2, 76, 13);
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(3, 3, 74, 11);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 3, 74, 1); // gold sheen
    ctx.fillStyle = INK;
    ctx.font = '700 9px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ AI REWARDS ⚡', 40, 11.5);
  } else if (kind === 'bench') {
    c.width = 52;
    c.height = 26;

    // Contact shadow
    ctx.fillStyle = 'rgba(28, 24, 38, 0.22)';
    ctx.fillRect(4, 21, 44, 4);

    // Ornate cast-iron curved legs & armrests
    ctx.fillStyle = INK;
    ctx.fillRect(5, 10, 3, 13);
    ctx.fillRect(44, 10, 3, 13);
    ctx.fillRect(3, 8, 7, 3); // left armrest
    ctx.fillRect(42, 8, 7, 3); // right armrest

    // Polished warm oak wood slats (backrest)
    ctx.fillStyle = '#9e6236';
    ctx.fillRect(4, 2, 44, 5);
    ctx.fillStyle = '#ba7846';
    ctx.fillRect(4, 2, 44, 2); // wood sheen
    ctx.fillStyle = '#693c1b';
    ctx.fillRect(4, 6, 44, 1);

    ctx.fillStyle = '#9e6236';
    ctx.fillRect(4, 8, 44, 5);
    ctx.fillStyle = '#ba7846';
    ctx.fillRect(4, 8, 44, 2);
    ctx.fillStyle = '#693c1b';
    ctx.fillRect(4, 12, 44, 1);

    // Bench seat slats
    ctx.fillStyle = '#9e6236';
    ctx.fillRect(4, 14, 44, 5);
    ctx.fillStyle = '#ba7846';
    ctx.fillRect(4, 14, 44, 2);
    ctx.fillStyle = '#542f13';
    ctx.fillRect(4, 18, 44, 1);
  } else {
    // Victorian Street Gaslamp
    c.width = 24;
    c.height = 62;

    // Base contact shadow
    ctx.fillStyle = 'rgba(28, 24, 38, 0.22)';
    ctx.fillRect(6, 58, 12, 3);

    // Fluted cast-iron lamp pole
    ctx.fillStyle = INK;
    ctx.fillRect(10, 14, 4, 46);
    ctx.fillStyle = '#3a4454';
    ctx.fillRect(11, 14, 2, 46);

    // Decorative stepped pedestal base
    ctx.fillStyle = INK;
    ctx.fillRect(8, 54, 8, 6);
    ctx.fillStyle = '#4c586c';
    ctx.fillRect(9, 55, 6, 4);

    // Warm radial light aura
    ctx.fillStyle = 'rgba(255, 230, 130, 0.22)';
    ctx.beginPath();
    ctx.arc(12, 8, 11, 0, Math.PI * 2);
    ctx.fill();

    // Carriage glass lantern housing
    ctx.fillStyle = INK;
    ctx.fillRect(5, 1, 14, 14);

    // Warm incandescent glowing filament
    ctx.fillStyle = '#ffef9f';
    ctx.fillRect(6, 2, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9, 5, 6, 6); // intense center glow

    // Iron corner ribs and roof peak
    ctx.fillStyle = INK;
    ctx.fillRect(5, 0, 14, 2);
    ctx.fillRect(11, -2, 2, 3); // finial spike
    ctx.fillStyle = '#3a4454';
    ctx.fillRect(5, 1, 14, 1);
  }

  return c;
}

export { APT_TILE, paintApartment } from './apartment';
