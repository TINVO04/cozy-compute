import { vehicleById } from '@cozy/game-data';
import pixels from './vehicle-pixels.json';

export { ensureVehicleTexture } from './vehicle-loader';

type PixelPack = { palette: string[]; frames: string[] };
const packs: Readonly<Record<string, PixelPack>> = pixels;
const decoded = new Map<string, Uint8Array>();

export function paintTractorCanvas(dir = 2, frame = 0): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  const box = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  const safeDir = ((dir % 4) + 4) % 4;
  const isMoving = frame > 0;
  const bob = isMoving && frame % 2 === 1 ? -1 : 0;

  // Helper: Perfectly circular pixel-art tractor wheel with multi-tone rubber, chevrons, steel rim and hub
  const drawRoundTire = (cx: number, cy: number, radius: number, rimRadius: number, hasChevrons = true) => {
    // 1. Outer round rubber tire silhouette (scanline circle)
    for (let dy = -radius; dy <= radius; dy++) {
      const dx = Math.round(Math.sqrt(Math.max(0, radius * radius - dy * dy)));
      ctx.fillStyle = '#0f172a'; // Deep tire black
      ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }

    // 2. Rubber tire sidewall depth (slightly inset for dimensional bevel)
    const innerR = radius - 1.5;
    for (let dy = -Math.floor(innerR); dy <= Math.floor(innerR); dy++) {
      const dx = Math.round(Math.sqrt(Math.max(0, innerR * innerR - dy * dy)));
      ctx.fillStyle = '#1e293b'; // Slate rubber sidewall
      ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }

    // 3. Agricultural Chevron tread notches around the perimeter
    if (hasChevrons) {
      const numLugs = 10;
      const angleOffset = (frame % 4) * (Math.PI / 10);
      for (let i = 0; i < numLugs; i++) {
        const a = (i * Math.PI * 2) / numLugs + angleOffset;

        // Outer protruding tread lug teeth (creates rugged agricultural serrated silhouette)
        const ox = Math.round(cx + Math.cos(a) * (radius + 0.8));
        const oy = Math.round(cy + Math.sin(a) * (radius + 0.8));
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ox, oy, 1, 1);

        // Angled chevron bar across tire face
        const r1 = radius - 0.5;
        const r2 = rimRadius + 1.2;
        const x1 = Math.round(cx + Math.cos(a) * r1);
        const y1 = Math.round(cy + Math.sin(a) * r1);
        const x2 = Math.round(cx + Math.cos(a + 0.35) * r2);
        const y2 = Math.round(cy + Math.sin(a + 0.35) * r2);

        // Tread bar ridge highlight
        ctx.fillStyle = '#334155';
        ctx.fillRect(x1, y1, 1, 1);
        ctx.fillRect(Math.round((x1 + x2) / 2), Math.round((y1 + y2) / 2), 1, 1);

        // Deep groove shadow behind lug
        const sx = Math.round(cx + Math.cos(a + 0.2) * r1);
        const sy = Math.round(cy + Math.sin(a + 0.2) * r1);
        ctx.fillStyle = '#050810';
        ctx.fillRect(sx, sy, 1, 1);
      }
    } else {
      // Front Steer Multi-Rib Tire pattern (Gân dẫn hướng 3 khía vòng tròn)
      const ribR = (radius + rimRadius) / 2;
      for (let dy = -Math.floor(ribR); dy <= Math.floor(ribR); dy++) {
        const dx = Math.round(Math.sqrt(Math.max(0, ribR * ribR - dy * dy)));
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - dx, cy + dy, 1, 1);
        ctx.fillRect(cx + dx, cy + dy, 1, 1);
      }
    }

    // 4. Circular Yellow Steel Rim Disc
    for (let dy = -Math.floor(rimRadius); dy <= Math.floor(rimRadius); dy++) {
      const dx = Math.round(Math.sqrt(Math.max(0, rimRadius * rimRadius - dy * dy)));
      ctx.fillStyle = dy < 0 ? '#facc15' : '#eab308'; // Sunlight top, warm base
      ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
    // Rim lip specular highlight and drop shadow
    const topLipDx = Math.round(Math.sqrt(Math.max(0, rimRadius * rimRadius - 1)));
    ctx.fillStyle = '#fef08a'; // Bright specular rim highlight
    ctx.fillRect(
      cx - Math.floor(topLipDx * 0.7),
      cy - Math.floor(rimRadius) + 1,
      Math.floor(topLipDx * 1.4) + 1,
      1,
    );
    ctx.fillStyle = '#ca8a04'; // Rim drop shadow
    ctx.fillRect(
      cx - Math.floor(topLipDx * 0.7),
      cy + Math.floor(rimRadius) - 1,
      Math.floor(topLipDx * 1.4) + 1,
      1,
    );

    // 5. Central Cast-Iron Axle Hub
    const hubR = Math.max(1.5, Math.floor(rimRadius * 0.45));
    for (let dy = -Math.floor(hubR); dy <= Math.floor(hubR); dy++) {
      const dx = Math.round(Math.sqrt(Math.max(0, hubR * hubR - dy * dy)));
      ctx.fillStyle = '#0f172a'; // Black steel hub
      ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
    ctx.fillStyle = '#64748b'; // Hub center axle cap
    ctx.fillRect(cx, cy, 1, 1);

    // 6. Lug nuts / wheel bolts
    if (rimRadius >= 6) {
      const boltR = rimRadius * 0.72;
      for (let i = 0; i < 5; i++) {
        const ba = (i * Math.PI * 2) / 5 + (frame % 4) * 0.1;
        const bx = Math.round(cx + Math.cos(ba) * boltR);
        const by = Math.round(cy + Math.sin(ba) * boltR);
        ctx.fillStyle = '#713f12';
        ctx.fillRect(bx, by, 1, 1);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(bx, by - 1, 1, 1);
      }
    }
  };

  // Helper: Front/Rear edge-on agricultural tire with chamfered rounded edges and chevron treads
  const drawTireFace = (x: number, y: number, w: number, h: number, isRear: boolean) => {
    // Chamfered rounded top and bottom corners
    box('#0f172a', x + 1, y, w - 2, 1);
    box('#0f172a', x, y + 1, w, h - 2);
    box('#0f172a', x + 1, y + h - 1, w - 2, 1);

    // Tire tread center line & sidewall shading
    box('#1e293b', x + 1, y + 2, w - 2, h - 4);

    // Deep V-shaped chevron lugs down the face of the agricultural tire
    const step = isRear ? 4 : 3;
    const offset = (frame * 2) % step;
    for (let ty = y + 2 + offset; ty < y + h - 2; ty += step) {
      box('#334155', x + 1, ty, Math.floor(w / 2), 1);
      box('#334155', x + Math.floor(w / 2), ty + 1, Math.ceil(w / 2) - 1, 1);
      box('#090d16', x + 1, ty + 1, Math.floor(w / 2) - 1, 1);
    }

    // Outer tire sidewall highlight
    box('#475569', x, y + 2, 1, h - 4);
  };

  // Ground contact shadow
  box('rgba(15, 23, 42, 0.32)', 6, 35, 36, 4);
  box('rgba(15, 23, 42, 0.45)', 9, 36, 30, 2);

  if (safeDir === 0) {
    // ==========================================
    // === DIR 0: FRONT / SOUTH (Facing Camera) ==
    // ==========================================
    // 1. Massive Rear Tires flanking left & right (chamfered rounded silhouettes)
    drawTireFace(3, 14 + bob, 8, 22, true);
    drawTireFace(37, 14 + bob, 8, 22, true);

    // Rear mudguard caps arching over tires
    box('#15803d', 2, 12 + bob, 10, 2);
    box('#4ade80', 3, 12 + bob, 8, 1);
    box('#15803d', 36, 12 + bob, 10, 2);
    box('#4ade80', 37, 12 + bob, 8, 1);

    // 2. ROPS (Roll-Over Protective Structure) safety frame arching overhead
    box('#1e293b', 14, 4 + bob, 20, 2); // top crossbar
    box('#334155', 14, 4 + bob, 20, 1);
    box('#1e293b', 14, 5 + bob, 2, 14); // left upright post
    box('#1e293b', 32, 5 + bob, 2, 14); // right upright post

    // 3. Driver Seat & Steering Wheel in cockpit
    box('#1e293b', 20, 11 + bob, 8, 7); // padded high-back seat
    box('#334155', 21, 12 + bob, 6, 5);
    box('#0f172a', 22, 10 + bob, 4, 1); // seat headrest
    box('#475569', 23, 13 + bob, 2, 6); // steering column
    box('#0f172a', 21, 11 + bob, 6, 2); // 3-spoke dished steering wheel
    box('#f59e0b', 26, 11 + bob, 1, 1); // steering spinner knob

    // 4. Tall Vertical Stainless Exhaust Stack (Left) & Cyclonic Air Intake (Right)
    box('#475569', 15, 3 + bob, 2, 14); // exhaust pipe
    box('#64748b', 15, 3 + bob, 1, 14);
    box('#0f172a', 14, 2 + bob, 4, 1); // rain cap flapper
    if (isMoving) {
      box('rgba(226, 232, 240, 0.75)', 13 - (frame % 3), 0 + bob, 3, 2); // diesel smoke puff
      box('rgba(226, 232, 240, 0.45)', 11 - (frame % 3), -1 + bob, 4, 2);
    }
    box('#0f172a', 31, 7 + bob, 3, 9); // air intake tube
    box('#1e293b', 30, 6 + bob, 5, 2); // cyclonic mushroom cap

    // 5. Front Steer Tires
    drawTireFace(12, 25 + bob, 5, 11, false);
    drawTireFace(31, 25 + bob, 5, 11, false);
    box('#334155', 16, 28 + bob, 16, 2); // heavy front axle beam

    // 6. Sculpted Emerald Green Engine Hood
    box('#14532d', 17, 16 + bob, 14, 15);
    box('#16a34a', 18, 16 + bob, 12, 14);
    box('#22c55e', 19, 16 + bob, 10, 4); // top hood specular bevel
    box('#4ade80', 20, 16 + bob, 8, 1);
    box('#facc15', 23, 16 + bob, 2, 13); // yellow brand center stripe
    box('#fef08a', 23, 16 + bob, 1, 13);

    // 7. Honeycomb Radiator Grille & Twin Sealed-Beam Headlights
    box('#0f172a', 19, 23 + bob, 10, 7); // dark radiator recess
    for (let gy = 24; gy <= 28; gy += 2) {
      box('#334155', 20, gy + bob, 8, 1); // horizontal grille louvers
    }
    box('#eab308', 16, 22 + bob, 3, 3); // left light housing
    box('#fef08a', 17, 23 + bob, 2, 2); // left light glowing glass
    box('#eab308', 29, 22 + bob, 3, 3); // right light housing
    box('#fef08a', 29, 23 + bob, 2, 2); // right light glowing glass

    // 8. Front Cast-Iron Counterweight Ballast Weights
    box('#1e293b', 18, 30 + bob, 12, 4);
    box('#334155', 19, 31 + bob, 10, 3);
    box('#0f172a', 23, 31 + bob, 2, 2); // hitch pin hole
  } else if (safeDir === 1) {
    // ==========================================
    // === DIR 1: LEFT / WEST (Profile Left) ====
    // ==========================================
    // 1. Rear Work Hitch & Drawbar (Right side)
    box('#334155', 43, 27 + bob, 4, 3);
    box('#64748b', 45, 26 + bob, 1, 5);

    // 2. Heavy Curved Green Rear Fender Arch (Right side)
    for (let fa = 0; fa < 18; fa++) {
      const fdx = Math.round(Math.sqrt(Math.max(0, 13 * 13 - (fa - 9) * (fa - 9))));
      box('#14532d', 34 - fdx + fa, 11 + bob, 2, 2);
    }
    box('#16a34a', 25, 12 + bob, 18, 3);
    box('#4ade80', 26, 12 + bob, 16, 1); // fender top highlight

    // 3. ROPS Roll Bar (Tubular Safety Frame)
    box('#1e293b', 34, 4 + bob, 2, 18);
    box('#334155', 35, 4 + bob, 1, 18);
    box('#1e293b', 28, 4 + bob, 7, 2);

    // 4. Ergonomic High-Back Driver Seat & Steering Column
    box('#1e293b', 29, 12 + bob, 5, 8); // seat back
    box('#334155', 30, 13 + bob, 4, 6);
    box('#0f172a', 31, 10 + bob, 3, 2); // headrest
    box('#64748b', 29, 20 + bob, 3, 3); // seat suspension coil spring
    box('#475569', 24, 13 + bob, 2, 7); // steering column
    box('#0f172a', 22, 11 + bob, 4, 2); // dished steering wheel
    box('#f59e0b', 22, 11 + bob, 1, 1); // spinner knob

    // 5. Cast Iron Engine Block & Transmission Housing
    box('#0f172a', 15, 22 + bob, 18, 8);
    box('#1e293b', 16, 23 + bob, 16, 6);
    box('#475569', 18, 24 + bob, 4, 4); // alternator
    box('#334155', 24, 23 + bob, 4, 5); // transmission casing

    // 6. Sculpted Green Engine Hood (Pointing Left)
    box('#14532d', 11, 16 + bob, 18, 11);
    box('#16a34a', 11, 15 + bob, 17, 10);
    box('#22c55e', 12, 15 + bob, 16, 3); // hood top spine highlight
    box('#4ade80', 13, 15 + bob, 14, 1);
    box('#facc15', 10, 20 + bob, 18, 2); // yellow flank racing stripe
    box('#fef08a', 11, 20 + bob, 17, 1);

    // 7. Front Grille & Headlight (Facing Left)
    box('#0f172a', 8, 17 + bob, 3, 9); // front grille nose
    box('#475569', 9, 18 + bob, 1, 7);
    box('#eab308', 7, 17 + bob, 3, 3); // headlight bezel
    box('#fef08a', 7, 18 + bob, 2, 2); // bright yellow lens

    // 8. Front Counterweight Ballast Stack
    box('#1e293b', 7, 26 + bob, 4, 5);
    box('#334155', 8, 27 + bob, 3, 4);

    // 9. Tall Stainless Exhaust Stack & Air Cleaner
    box('#475569', 18, 3 + bob, 2, 13);
    box('#64748b', 18, 3 + bob, 1, 13);
    box('#0f172a', 16, 2 + bob, 4, 1); // rain cap
    if (isMoving) {
      box('rgba(226, 232, 240, 0.75)', 15 - (frame % 3), 0 + bob, 4, 2);
      box('rgba(226, 232, 240, 0.45)', 13 - (frame % 3), -1 + bob, 4, 2);
    }
    box('#0f172a', 14, 8 + bob, 2, 8); // air intake tube
    box('#1e293b', 13, 7 + bob, 4, 2); // mushroom cap

    // 10. FRONT SMALL TIRE (Left) - Perfectly Round 13px Wheel!
    drawRoundTire(11, 30 + bob, 6.5, 3.5, false);

    // 11. REAR GIANT TIRE (Right) - Massive Round 22px Agricultural Tire with Chevrons & Yellow Rim!
    drawRoundTire(35, 25 + bob, 11, 6.5, true);
  } else if (safeDir === 2) {
    // ==========================================
    // === DIR 2: RIGHT / EAST (Profile Right) ==
    // ==========================================
    // 1. Rear Work Hitch & Drawbar (Left side)
    box('#334155', 1, 27 + bob, 4, 3);
    box('#64748b', 2, 26 + bob, 1, 5);

    // 2. Heavy Curved Green Rear Fender Arch (Left side)
    for (let fa = 0; fa < 18; fa++) {
      const fdx = Math.round(Math.sqrt(Math.max(0, 13 * 13 - (fa - 9) * (fa - 9))));
      box('#14532d', 14 - fdx + fa, 11 + bob, 2, 2);
    }
    box('#16a34a', 5, 12 + bob, 18, 3);
    box('#4ade80', 6, 12 + bob, 16, 1); // fender top highlight

    // 3. ROPS Roll Bar (Tubular Safety Frame)
    box('#1e293b', 12, 4 + bob, 2, 18);
    box('#334155', 12, 4 + bob, 1, 18);
    box('#1e293b', 13, 4 + bob, 7, 2);

    // 4. Ergonomic High-Back Driver Seat & Steering Column
    box('#1e293b', 14, 12 + bob, 5, 8); // seat back
    box('#334155', 14, 13 + bob, 4, 6);
    box('#0f172a', 14, 10 + bob, 3, 2); // headrest
    box('#64748b', 16, 20 + bob, 3, 3); // seat suspension coil spring
    box('#475569', 22, 13 + bob, 2, 7); // steering column
    box('#0f172a', 22, 11 + bob, 4, 2); // dished steering wheel
    box('#f59e0b', 25, 11 + bob, 1, 1); // spinner knob

    // 5. Cast Iron Engine Block & Transmission Housing
    box('#0f172a', 15, 22 + bob, 18, 8);
    box('#1e293b', 16, 23 + bob, 16, 6);
    box('#475569', 26, 24 + bob, 4, 4); // alternator
    box('#334155', 20, 23 + bob, 4, 5); // transmission casing

    // 6. Sculpted Green Engine Hood (Pointing Right)
    box('#14532d', 19, 16 + bob, 18, 11);
    box('#16a34a', 20, 15 + bob, 17, 10);
    box('#22c55e', 20, 15 + bob, 16, 3); // hood top spine highlight
    box('#4ade80', 21, 15 + bob, 14, 1);
    box('#facc15', 20, 20 + bob, 18, 2); // yellow flank racing stripe
    box('#fef08a', 20, 20 + bob, 17, 1);

    // 7. Front Grille & Headlight (Facing Right)
    box('#0f172a', 37, 17 + bob, 3, 9); // front grille nose
    box('#475569', 38, 18 + bob, 1, 7);
    box('#eab308', 38, 17 + bob, 3, 3); // headlight bezel
    box('#fef08a', 39, 18 + bob, 2, 2); // bright yellow lens

    // 8. Front Counterweight Ballast Stack
    box('#1e293b', 37, 26 + bob, 4, 5);
    box('#334155', 37, 27 + bob, 3, 4);

    // 9. Tall Stainless Exhaust Stack & Air Cleaner
    box('#475569', 28, 3 + bob, 2, 13);
    box('#64748b', 29, 3 + bob, 1, 13);
    box('#0f172a', 28, 2 + bob, 4, 1); // rain cap
    if (isMoving) {
      box('rgba(226, 232, 240, 0.75)', 29 + (frame % 3), 0 + bob, 4, 2);
      box('rgba(226, 232, 240, 0.45)', 31 + (frame % 3), -1 + bob, 4, 2);
    }
    box('#0f172a', 32, 8 + bob, 2, 8); // air intake tube
    box('#1e293b', 31, 7 + bob, 4, 2); // mushroom cap

    // 10. REAR GIANT TIRE (Left) - Massive Round 22px Agricultural Tire with Chevrons & Yellow Rim!
    drawRoundTire(13, 25 + bob, 11, 6.5, true);

    // 11. FRONT SMALL TIRE (Right) - Perfectly Round 13px Wheel!
    drawRoundTire(37, 30 + bob, 6.5, 3.5, false);
  } else {
    // ==========================================
    // === DIR 3: REAR / NORTH (Driving Away) ===
    // ==========================================
    // 1. Massive Rear Agricultural Tires with Inverted Chevrons
    drawTireFace(3, 14 + bob, 9, 22, true);
    drawTireFace(36, 14 + bob, 9, 22, true);

    // 2. Wide Emerald Green Rear Mudguards with Grab Handles
    box('#14532d', 11, 13 + bob, 10, 16);
    box('#16a34a', 12, 12 + bob, 8, 16);
    box('#4ade80', 13, 12 + bob, 6, 1); // fender top highlight
    box('#14532d', 27, 13 + bob, 10, 16);
    box('#16a34a', 28, 12 + bob, 8, 16);
    box('#4ade80', 29, 12 + bob, 6, 1);

    // Grab handles on rear mudguards
    box('#334155', 13, 15 + bob, 1, 5);
    box('#334155', 34, 15 + bob, 1, 5);

    // Dual Red Tail / Hazard Lamps
    box('#ef4444', 12, 20 + bob, 2, 3);
    box('#f87171', 12, 20 + bob, 2, 1);
    box('#ef4444', 34, 20 + bob, 2, 3);
    box('#f87171', 34, 20 + bob, 2, 1);

    // 3. ROPS Roll Bar (Tubular Safety Frame)
    box('#1e293b', 14, 4 + bob, 20, 2); // top crossbar
    box('#334155', 14, 4 + bob, 20, 1);
    box('#1e293b', 14, 5 + bob, 2, 15); // left post
    box('#1e293b', 32, 5 + bob, 2, 15); // right post

    // Rear Work Floodlight
    box('#334155', 29, 5 + bob, 3, 2);
    box('#fef08a', 29, 6 + bob, 3, 1);

    // 4. Ergonomic Driver Seat Back with Headrest
    box('#1e293b', 20, 9 + bob, 8, 10);
    box('#334155', 21, 10 + bob, 6, 8);
    box('#0f172a', 22, 8 + bob, 4, 2); // headrest

    // 5. Tall Exhaust Pipe (Right) & Air Cleaner (Left) from rear perspective
    box('#475569', 31, 3 + bob, 2, 14);
    box('#64748b', 31, 3 + bob, 1, 14);
    box('#0f172a', 30, 2 + bob, 4, 1);
    if (isMoving) {
      box('rgba(226, 232, 240, 0.75)', 32 + (frame % 3), 0 + bob, 4, 2);
    }
    box('#0f172a', 15, 7 + bob, 2, 9);
    box('#1e293b', 14, 6 + bob, 4, 2);

    // 6. Heavy 3-Point Hydraulic Linkage & PTO Shaft
    box('#0f172a', 20, 26 + bob, 8, 6); // differential housing
    box('#334155', 21, 27 + bob, 6, 4);
    box('#ca8a04', 23, 28 + bob, 2, 2); // yellow PTO shaft cap
    box('#64748b', 18, 28 + bob, 4, 4); // left lower lift arm
    box('#64748b', 26, 28 + bob, 4, 4); // right lower lift arm
    box('#475569', 23, 24 + bob, 2, 4); // top link turnbuckle

    // Heavy Drawbar Hitch & Tow Pin
    box('#1e293b', 22, 32 + bob, 4, 4);
    box('#64748b', 23, 31 + bob, 2, 6);
    box('#f59e0b', 23, 35 + bob, 2, 2); // yellow hitch pin
  }

  return canvas;
}

/** Generated from the same artwork as the PNGs; requires no network or image decode. */
export function vehicleCanvas(id: string, dir = 2, frame = 0): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  const path = vehicleById(id)?.assetPath ?? id;

  if (
    id === 'tractor_farm' ||
    id === 'cars/tractor-farm' ||
    id === 'tractor-farm' ||
    path.includes('tractor')
  ) {
    return paintTractorCanvas(dir, frame);
  }

  const pack = Object.hasOwn(packs, path) ? packs[path] : undefined;
  if (!pack) return canvas;
  const wrap = (value: number) => (Number.isFinite(value) ? ((Math.trunc(value) % 4) + 4) % 4 : 0);
  const index = wrap(dir) * 4 + wrap(frame);
  const key = `${path}:${index}`;
  let runs = decoded.get(key);
  if (!runs) {
    runs = Uint8Array.from(atob(pack.frames[index]!), (character) => character.charCodeAt(0));
    decoded.set(key, runs);
  }
  // Frames are authored in their final orientation. No canvas transform is applied,
  // so a subsequent async PNG upgrade cannot inherit a reflection.
  let position = 0;
  for (let i = 0; i < runs.length; i += 2) {
    const length = runs[i]!;
    const color = runs[i + 1]!;
    if (color !== 0) {
      ctx.fillStyle = pack.palette[color]!;
      ctx.fillRect(position % 48, Math.floor(position / 48), length, 1);
    }
    position += length;
  }
  return canvas;
}

export function paintVehicleDealer(displayIds: readonly string[] = ['car_ferrari_f40', 'motorcycle_ducati']) {
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
  ctx.drawImage(vehicleCanvas(displayIds[0]!), 20, 84);
  ctx.drawImage(vehicleCanvas(displayIds[1]!, 1), 94, 84);
  for (let x = 15; x < 147; x += 12) r(x % 24 === 15 ? '#ece0bd' : '#69a78e', x, 67, 12, 8);
  r('#f4d999', 22, 126, 116, 2);
  return c;
}
