import type Phaser from 'phaser';
import { vehicleById } from '@cozy/game-data';

/** Original canvas pixel art, shared by showroom previews and world sprites. */
export function vehicleCanvas(id: string, dir = 2, frame = 0): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 40;
  const ctx = c.getContext('2d')!;
  const color = vehicleById(id)?.color ?? '#69bfa8';
  const r = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const kind = vehicleById(id)?.kind;
  if (kind === 'bicycle' || kind === 'motorcycle') {
    const bicycle = kind === 'bicycle';
    const isDucati = id === 'motorcycle_ducati';
    const line = (shade: string, x1: number, y1: number, x2: number, y2: number, width = 2) => {
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
      for (let i = 0; i <= steps; i++)
        r(
          shade,
          Math.round(x1 + ((x2 - x1) * i) / steps),
          Math.round(y1 + ((y2 - y1) * i) / steps),
          width,
          width,
        );
    };
    if (dir === 1 || dir === 2) {
      if (dir === 1) {
        ctx.translate(48, 0);
        ctx.scale(-1, 1);
      }
      for (const x of [10, 37]) {
        // Hollow rims and angular tires stay crisp at native scale.
        r('#263c41', x - 4, 25, 8, 2);
        r('#263c41', x - 6, 27, 2, 7);
        r('#263c41', x + 4, 27, 2, 7);
        r('#263c41', x - 4, 34, 8, 2);
        r(isDucati ? '#d97706' : '#bdcbc5', x - 3, 27, 6, 1);
        r(isDucati ? '#d97706' : '#bdcbc5', x - 3, 33, 6, 1);
        if (frame % 2) {
          line('#9cadab', x - 3, 28, x + 2, 32, 1);
          line('#9cadab', x + 2, 28, x - 3, 32, 1);
        } else {
          r('#9cadab', x, 27, 1, 7);
          r('#9cadab', x - 4, 30, 8, 1);
        }
      }
      if (bicycle) {
        line(color, 10, 30, 18, 18);
        line(color, 18, 18, 24, 30);
        line(color, 10, 30, 24, 30);
        line(color, 18, 19, 31, 19);
        line(color, 24, 30, 31, 19);
        line('#405758', 31, 14, 37, 30);
        r('#263c41', 14, 16, 9, 3);
        r('#263c41', 30, 12, 8, 2);
        r('#f2ddb2', 36, 15, 5, 5);
        line('#647d78', 24, 30, frame % 2 ? 21 : 27, 33, 1);
      } else if (isDucati) {
        // Ducati Panigale V4 S: Aggressive aerodynamic superbike
        r('#1e293b', 7, 22, 24, 6);
        r(color, 7, 18, 16, 8); // Red body fairing
        r('#ef4444', 8, 17, 14, 2); // Highlight
        r('#0f172a', 10, 15, 14, 3); // Black seat
        r('#334155', 18, 26, 14, 5); // Engine block
        r(color, 30, 14, 7, 15); // Nose cone fairing
        line(color, 35, 23, 40, 29);
        // Golden inverted Öhlins front forks
        r('#f59e0b', 34, 18, 2, 12);
        // Dual razor LED headlights
        r('#ffffff', 37, 16, 4, 3);
        r('#67e8f9', 39, 16, 2, 2);
        // Aerodynamic carbon winglet
        r('#0f172a', 32, 21, 6, 2);
        r('#0f172a', 28, 11, 9, 2); // Clip-on handlebars
        r('#94a3b8', 6, 28, 12, 3); // Exhaust pipe
        r('#ef4444', 5, 18, 4, 3); // Tail LED
      } else {
        // Vespa Primavera: classic curvy scooter styling
        r('#405758', 7, 23, 23, 5);
        r(color, 7, 20, 14, 6);
        r('#f5c4a2', 8, 20, 11, 2);
        r('#263c41', 10, 17, 14, 3);
        r('#526d6b', 19, 27, 13, 4);
        r(color, 31, 16, 5, 13);
        line(color, 35, 24, 39, 30);
        r('#fff0b5', 34, 15, 5, 4);
        r('#263c41', 28, 12, 9, 2);
        r('#b8ceca', 6, 30, 12, 2);
        r('#d75555', 5, 22, 3, 3);
      }
    } else {
      r('#263c41', 22, 8, 4, 29);
      r('#a2b8b3', 23, 9, 2, 27);
      r(color, bicycle ? 22 : 18, 16, bicycle ? 4 : 12, 15);
      r('#263c41', 20, dir === 0 ? 16 : 23, 8, 5);
      r('#405758', 13, dir === 0 ? 25 : 12, 22, 2);
      r('#263c41', 12, dir === 0 ? 24 : 11, 4, 4);
      r('#263c41', 32, dir === 0 ? 24 : 11, 4, 4);
      if (isDucati) {
        // Golden forks on sides
        r('#f59e0b', 17, 16, 2, 12);
        r('#f59e0b', 29, 16, 2, 12);
        r(dir === 0 ? '#ffffff' : '#ef4444', 20, dir === 0 ? 29 : 30, 8, 3);
      } else {
        r(dir === 0 ? '#fff0b5' : '#d75555', 21, dir === 0 ? 29 : 30, 6, 3);
      }
      if (bicycle) {
        r('#647d78', frame % 2 ? 17 : 26, 24, 5, 2);
      } else {
        r('#f5c4a2', 20, 17, 2, 12);
        r('#b8ceca', 29, 25, 2, 9);
      }
    }
    return c;
  }
  const isGWagon = id === 'car_mint';
  const isLamborghini = id === 'car_sunset' || id === 'car_lamborghini';
  const isAventador = id === 'car_lamborghini';
  const isPorsche = id === 'car_porsche';
  const isMercedesGT = id === 'car_mercedes';

  if (dir === 1 || dir === 2) {
    if (dir === 1) {
      ctx.translate(48, 0);
      ctx.scale(-1, 1);
    }
    if (isGWagon) {
      // Mercedes-Benz G63 AMG: Boxy tall upright SUV profile
      r('#1f2937', 5, 14, 38, 17); // Dark chassis outline
      r(color, 6, 13, 36, 17); // Emerald body
      r('#111827', 10, 6, 27, 14); // Tall upright cabin outline
      r(color, 11, 5, 25, 3); // Flat roof
      r('#93c5fd', 12, 8, 7, 7); // Rear window
      r('#93c5fd', 21, 8, 7, 7); // Side window
      r('#93c5fd', 30, 8, 5, 7); // Front A-pillar window
      r('#ffffff', 41, 18, 4, 4); // Round LED headlight
      r('#ef4444', 5, 22, 2, 4); // Rear taillight
      // Rear mounted spare tire
      r('#111827', 2, 14, 4, 11);
      r('#cbd5e1', 3, 16, 2, 7); // Chrome Mercedes ring
      for (const x of [10, 32]) {
        r('#0f172a', x, 25, 9, 10); // Heavy AMG offroad wheels
        r('#94a3b8', x + 2, 27, 5, 5); // AMG wheel center
      }
    } else {
      // Sports cars & Supercars (Lamborghini, Porsche, AMG GT)
      const roofY = isLamborghini ? 12 : isPorsche ? 10 : 10;
      const roofH = isLamborghini ? 10 : isPorsche ? 12 : 12;
      r('#1e293b', 4, 20, 40, 11);
      r(color, 5, 19, 38, 10);
      r('#0f172a', 13, roofY, 21, roofH);
      r(color, 15, roofY - 1, 17, 3);
      r('#93c5fd', 16, roofY + 2, 6, 6);
      r('#93c5fd', 24, roofY + 2, 7, 6);
      // Headlight / Taillight
      r('#ffffff', 41, 20, 4, 3);
      r('#ef4444', 4, 20, 3, 3);
      r('#334155', 7, 28, 34, 2);

      // Distinctive real-world rear wings & spoilers:
      if (isAventador) {
        // High carbon-fiber ALA rear wing for Lamborghini Aventador SVJ
        r('#0f172a', 3, 11, 10, 2); // Wing blade
        r('#0f172a', 6, 13, 2, 7); // Wing upright support
        r('#0f172a', 9, 13, 2, 7);
      } else if (isPorsche) {
        // Massive swan-neck rear wing for Porsche 911 GT3 RS
        r('#0f172a', 3, 10, 9, 2);
        r('#0f172a', 5, 12, 2, 8);
      } else if (isMercedesGT) {
        // AMG GT aerodynamic lip spoiler
        r('#0f172a', 3, 17, 4, 2);
      }

      for (const x of [10, 33]) {
        r('#18181b', x, 26, 8, 9);
        r(isAventador ? '#eab308' : isMercedesGT ? '#e2e8f0' : '#cbd5e1', x + 2, 28, 4, 4);
      }
    }
  } else {
    // Vertical directions (dir === 0 facing forward, dir === 3 facing away)
    r('#18181b', 8, 10, 5, 10);
    r('#18181b', 35, 10, 5, 10);
    r('#18181b', 8, 28, 5, 9);
    r('#18181b', 35, 28, 5, 9);

    if (isGWagon) {
      // Mercedes G63 AMG: Boxy front/rear
      r('#1f2937', 11, 3, 26, 35);
      r(color, 13, 4, 22, 33);
      r('#93c5fd', 15, dir === 0 ? 12 : 6, 18, 9);
      if (dir === 0) {
        // Chrome vertical Panamericana grille
        r('#0f172a', 16, 26, 16, 6);
        for (let gx = 18; gx < 31; gx += 3) r('#e2e8f0', gx, 27, 1, 4);
        r('#ffffff', 13, 26, 3, 4); // Left circular LED
        r('#ffffff', 32, 26, 3, 4); // Right circular LED
      } else {
        // Spare tire on rear door
        r('#111827', 17, 20, 14, 14);
        r('#e2e8f0', 20, 23, 8, 8);
        r(color, 22, 25, 4, 4);
        r('#ef4444', 13, 31, 4, 3);
        r('#ef4444', 31, 31, 4, 3);
      }
    } else {
      // Supercars / Sports cars (Lamborghini, Porsche, Mercedes-AMG)
      r('#1e293b', 11, 4, 26, 34);
      r(color, 13, 5, 22, 31);
      r('#93c5fd', 15, dir === 0 ? 13 : 8, 18, 8);
      r('#334155', 14, 33, 20, 2);

      // Wing spanning the rear
      if (isAventador || isPorsche) {
        r('#0f172a', 10, dir === 0 ? 4 : 33, 28, 2);
      }

      for (const x of [14, 30]) {
        r(dir === 0 ? '#ffffff' : '#ef4444', x, 29, 4, 4);
      }
    }
  }
  return c;
}
export function ensureVehicleTexture(scene: Phaser.Scene, id: string, dir: number, frame = 0) {
  const key = `vehicle:${id}:${dir}:${frame}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, vehicleCanvas(id, dir, frame));
  return key;
}

export function paintVehicleDealer() {
  const c = document.createElement('canvas');
  c.width = 162;
  c.height = 142;
  const ctx = c.getContext('2d')!;
  const r = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  r('#617773', 8, 131, 146, 9);
  r('#d8d3b8', 4, 126, 154, 8);
  r('#344d4d', 13, 32, 136, 96);
  r('#ede0b7', 16, 35, 130, 89);
  r('#42665e', 9, 23, 144, 13);
  r('#83b5a2', 12, 22, 138, 4);
  r('#af9871', 20, 42, 122, 24);
  r('#254d4b', 22, 43, 118, 21);
  for (const x of [21, 94]) {
    r('#416363', x, 75, 46, 47);
    r('#8ec1bd', x + 2, 77, 42, 42);
    r('#c6e0cd', x + 4, 79, 38, 2);
    r('#b5d5c7', x + 5, 82, 2, 20);
  }
  r('#254544', 70, 74, 21, 50);
  r('#a0c9bb', 73, 77, 15, 42);
  r('#e8c77c', 85, 99, 2, 4);
  ctx.drawImage(vehicleCanvas('car_mint'), 20, 84);
  ctx.drawImage(vehicleCanvas('car_sunset', 1), 94, 84);
  for (let x = 15; x < 147; x += 12) r(x % 24 === 15 ? '#ece0bd' : '#69a78e', x, 67, 12, 8);
  r('#f4d999', 22, 126, 116, 2);
  return c;
}
