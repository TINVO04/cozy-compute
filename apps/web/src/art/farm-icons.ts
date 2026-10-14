// ============================================================================
// File: apps/web/src/art/farm-icons.ts
// Crisp, pixel-perfect procedural icons for all farm seeds, crops, livestock,
// and equipment. Renders onto offscreen canvas and caches data URLs.
// ============================================================================

const iconCache = new Map<string, string>();

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

export function farmItemIcon(itemId: string, size = 48): string {
  const cacheKey = `${itemId}:${size}`;
  const hit = iconCache.get(cacheKey);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const cx = size / 2;
  const cy = size / 2;

  // Background subtle glow
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.46);
  grad.addColorStop(0, 'rgba(254, 240, 138, 0.12)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // 1. SEED POUCHES (seed_*)
  if (itemId.startsWith('seed_')) {
    // Burlap seed pouch
    rect(ctx, '#78350f', cx - 11, cy - 8, 22, 20); // main sack
    rect(ctx, '#92400e', cx - 10, cy - 7, 20, 18);
    rect(ctx, '#b45309', cx - 9, cy - 6, 18, 16);
    // Tied neck
    rect(ctx, '#451a03', cx - 7, cy - 11, 14, 4);
    rect(ctx, '#fef08a', cx - 5, cy - 10, 10, 2); // twine tie
    // Pouch ruffled lip
    rect(ctx, '#92400e', cx - 8, cy - 15, 16, 4);
    rect(ctx, '#b45309', cx - 7, cy - 14, 14, 2);

    // Front label badge with crop emblem
    rect(ctx, '#fef3c7', cx - 7, cy - 3, 14, 12);
    rect(ctx, '#ffffff', cx - 6, cy - 2, 12, 10);

    if (itemId.includes('rice')) {
      oval(ctx, '#eab308', cx, cy + 3, 3, 4);
    } else if (itemId.includes('corn')) {
      oval(ctx, '#eab308', cx, cy + 3, 4, 3);
      rect(ctx, '#16a34a', cx - 4, cy + 4, 3, 2);
    } else if (itemId.includes('watermelon')) {
      oval(ctx, '#16a34a', cx, cy + 3, 4, 3);
      rect(ctx, '#ef4444', cx - 2, cy + 2, 4, 2);
    } else if (itemId.includes('tomato')) {
      oval(ctx, '#dc2626', cx, cy + 3, 4, 4);
      rect(ctx, '#15803d', cx - 1, cy - 1, 2, 2);
    } else if (itemId.includes('chili')) {
      rect(ctx, '#dc2626', cx - 1, cy, 3, 6);
      rect(ctx, '#15803d', cx - 1, cy - 2, 2, 2);
    } else if (itemId.includes('strawberry')) {
      oval(ctx, '#e11d48', cx, cy + 3, 4, 4);
      rect(ctx, '#15803d', cx - 2, cy - 1, 4, 2);
    } else if (itemId.includes('pumpkin')) {
      oval(ctx, '#ea580c', cx, cy + 3, 5, 4);
      rect(ctx, '#78350f', cx - 1, cy - 1, 2, 2);
    } else if (itemId.includes('eggplant')) {
      oval(ctx, '#7e22ce', cx, cy + 3, 3, 5);
      rect(ctx, '#15803d', cx - 2, cy - 1, 4, 2);
    } else if (itemId.includes('carrot')) {
      rect(ctx, '#ea580c', cx - 2, cy + 1, 4, 5);
      rect(ctx, '#22c55e', cx - 2, cy - 2, 4, 3);
    } else if (itemId.includes('sunflower')) {
      oval(ctx, '#eab308', cx, cy + 3, 4, 4);
      rect(ctx, '#78350f', cx - 1, cy + 2, 2, 2);
    } else if (itemId.includes('grape')) {
      oval(ctx, '#6b21a8', cx - 2, cy + 2, 3, 3);
      oval(ctx, '#6b21a8', cx + 2, cy + 2, 3, 3);
      oval(ctx, '#581c87', cx, cy + 4, 3, 3);
    } else {
      oval(ctx, '#22c55e', cx, cy + 3, 3, 3);
    }
  }

  // 2. HARVESTED CROPS (crop_*_harvest)
  else if (itemId.startsWith('crop_') && itemId.endsWith('_harvest')) {
    if (itemId.includes('rice')) {
      // Golden bundle of rice ears tied with straw
      rect(ctx, '#b45309', cx - 8, cy - 8, 16, 18);
      rect(ctx, '#d97706', cx - 7, cy - 7, 14, 16);
      rect(ctx, '#f59e0b', cx - 5, cy - 5, 10, 12);
      // Grains
      for (let i = -6; i <= 6; i += 3) {
        oval(ctx, '#fef08a', cx + i, cy - 11, 2, 4);
        rect(ctx, '#ffffff', cx + i, cy - 11, 1, 1);
      }
      rect(ctx, '#78350f', cx - 7, cy + 1, 14, 3); // red/brown tie
    } else if (itemId.includes('corn')) {
      // Plump sweet corn with husk
      oval(ctx, '#15803d', cx - 8, cy, 6, 12);
      oval(ctx, '#16a34a', cx + 8, cy, 6, 12);
      oval(ctx, '#ca8a04', cx, cy - 1, 8, 14);
      oval(ctx, '#eab308', cx, cy - 1, 7, 13);
      for (let kx = -3; kx <= 3; kx += 3) {
        for (let ky = -6; ky <= 4; ky += 3) {
          rect(ctx, '#fef08a', cx + kx, cy + ky, 2, 2);
        }
      }
      rect(ctx, '#d97706', cx - 2, cy - 11, 4, 3);
    } else if (itemId.includes('watermelon')) {
      // Half watermelon slice showing ruby flesh & seeds
      oval(ctx, '#166534', cx, cy + 2, 16, 12);
      oval(ctx, '#22c55e', cx, cy + 2, 14, 10);
      oval(ctx, '#ef4444', cx, cy + 1, 12, 8);
      oval(ctx, '#dc2626', cx, cy + 2, 10, 6);
      // Black seeds
      rect(ctx, '#000000', cx - 5, cy, 2, 2);
      rect(ctx, '#000000', cx + 4, cy, 2, 2);
      rect(ctx, '#000000', cx, cy + 3, 2, 2);
      rect(ctx, '#ffffff', cx - 5, cy - 2, 3, 1); // glint
    } else if (itemId.includes('tomato')) {
      // Two glossy red tomatoes
      oval(ctx, '#991b1b', cx - 4, cy + 2, 9, 9);
      oval(ctx, '#dc2626', cx - 4, cy + 2, 8, 8);
      oval(ctx, '#ef4444', cx - 5, cy + 1, 6, 6);
      rect(ctx, '#ffffff', cx - 6, cy - 1, 2, 2);
      // Star calyx
      rect(ctx, '#15803d', cx - 6, cy - 6, 5, 2);
      rect(ctx, '#22c55e', cx - 4, cy - 7, 2, 2);

      oval(ctx, '#991b1b', cx + 7, cy - 2, 7, 7);
      oval(ctx, '#dc2626', cx + 7, cy - 2, 6, 6);
      rect(ctx, '#15803d', cx + 6, cy - 8, 4, 2);
    } else if (itemId.includes('chili')) {
      // Two fiery red curved chili peppers
      rect(ctx, '#991b1b', cx - 6, cy - 8, 5, 16);
      rect(ctx, '#dc2626', cx - 5, cy - 7, 3, 14);
      rect(ctx, '#f87171', cx - 5, cy - 5, 1, 8);
      rect(ctx, '#15803d', cx - 6, cy - 11, 4, 3);

      rect(ctx, '#991b1b', cx + 3, cy - 5, 5, 14);
      rect(ctx, '#dc2626', cx + 4, cy - 4, 3, 12);
      rect(ctx, '#15803d', cx + 3, cy - 8, 4, 3);
    } else if (itemId.includes('strawberry')) {
      // Ruby red strawberry with seeds & leaves
      oval(ctx, '#991b1b', cx, cy + 1, 12, 13);
      oval(ctx, '#e11d48', cx, cy + 1, 10, 11);
      oval(ctx, '#fb7185', cx - 2, cy - 1, 6, 6);
      // Seeds
      rect(ctx, '#fef08a', cx - 4, cy, 1, 1);
      rect(ctx, '#fef08a', cx + 4, cy, 1, 1);
      rect(ctx, '#fef08a', cx, cy + 4, 1, 1);
      rect(ctx, '#fef08a', cx - 2, cy + 7, 1, 1);
      rect(ctx, '#fef08a', cx + 2, cy + 7, 1, 1);
      // Green cap
      rect(ctx, '#15803d', cx - 8, cy - 9, 16, 4);
      rect(ctx, '#22c55e', cx - 6, cy - 10, 12, 2);
      rect(ctx, '#15803d', cx - 1, cy - 12, 2, 3);
    } else if (itemId.includes('pumpkin')) {
      // Plump ribbed orange pumpkin
      oval(ctx, '#7c2d12', cx, cy + 2, 15, 12);
      oval(ctx, '#ea580c', cx, cy + 2, 14, 11);
      oval(ctx, '#f97316', cx, cy + 1, 12, 9);
      rect(ctx, '#c2410c', cx - 7, cy - 6, 2, 12);
      rect(ctx, '#c2410c', cx + 5, cy - 6, 2, 12);
      oval(ctx, '#fb923c', cx, cy, 5, 7);
      rect(ctx, '#78350f', cx - 1, cy - 10, 3, 5);
      rect(ctx, '#22c55e', cx + 2, cy - 11, 3, 2);
    } else if (itemId.includes('eggplant')) {
      // Long glossy purple eggplant
      oval(ctx, '#3b0764', cx, cy + 1, 8, 14);
      oval(ctx, '#6b21a8', cx, cy + 1, 7, 13);
      oval(ctx, '#9333ea', cx, cy + 1, 5, 11);
      rect(ctx, '#e9d5ff', cx - 2, cy - 4, 2, 8); // sheen
      rect(ctx, '#15803d', cx - 4, cy - 11, 8, 4);
      rect(ctx, '#22c55e', cx - 1, cy - 13, 2, 3);
    } else if (itemId.includes('carrot')) {
      // Bright orange tapered carrot with green tuft
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy - 6);
      ctx.lineTo(cx + 7, cy - 6);
      ctx.lineTo(cx, cy + 13);
      ctx.closePath();
      ctx.fillStyle = '#ea580c';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 5);
      ctx.lineTo(cx + 5, cy - 5);
      ctx.lineTo(cx, cy + 11);
      ctx.closePath();
      ctx.fillStyle = '#f97316';
      ctx.fill();
      rect(ctx, '#fdba74', cx - 2, cy - 4, 2, 4);
      rect(ctx, '#22c55e', cx - 5, cy - 13, 10, 6);
      rect(ctx, '#4ade80', cx - 3, cy - 14, 6, 2);
    } else if (itemId.includes('sunflower')) {
      // Brilliant sunflower head
      oval(ctx, '#ca8a04', cx, cy, 14, 14);
      oval(ctx, '#eab308', cx, cy, 13, 13);
      oval(ctx, '#fde047', cx, cy, 11, 11);
      oval(ctx, '#451a03', cx, cy, 6, 6);
      oval(ctx, '#78350f', cx, cy, 5, 5);
      rect(ctx, '#fbbf24', cx - 1, cy - 1, 2, 2);
    } else if (itemId.includes('grape')) {
      // Hanging cluster of purple grapes
      oval(ctx, '#166534', cx, cy - 10, 10, 5);
      rect(ctx, '#78350f', cx - 1, cy - 12, 2, 3);
      const grapes: [number, number][] = [
        [cx - 5, cy - 5],
        [cx, cy - 5],
        [cx + 5, cy - 5],
        [cx - 3, cy],
        [cx + 3, cy],
        [cx, cy + 5],
      ];
      for (const [gx, gy] of grapes) {
        oval(ctx, '#2e1065', gx, gy, 4, 4);
        oval(ctx, '#581c87', gx, gy, 3, 3);
        oval(ctx, '#7e22ce', gx, gy, 2, 2);
        rect(ctx, '#d8b4fe', gx - 1, gy - 1, 1, 1);
      }
    } else {
      oval(ctx, '#16a34a', cx, cy, 10, 10);
      oval(ctx, '#22c55e', cx, cy, 8, 8);
    }
  }

  // 3. LIVESTOCK PRODUCTS (yield_*)
  else if (itemId.startsWith('yield_')) {
    if (itemId.includes('egg')) {
      // Warm brown or white chicken/duck egg
      const isDuck = itemId.includes('duck');
      oval(ctx, isDuck ? '#94a3b8' : '#78350f', cx, cy + 1, 10, 13);
      oval(ctx, isDuck ? '#cbd5e1' : '#b45309', cx, cy + 1, 9, 12);
      oval(ctx, isDuck ? '#f1f5f9' : '#fed7aa', cx, cy + 1, 7, 10);
      rect(ctx, '#ffffff', cx - 2, cy - 4, 3, 3);
    } else if (itemId.includes('milk')) {
      // Traditional glass bottle or metal pail of farm fresh milk
      rect(ctx, '#475569', cx - 7, cy - 11, 14, 22);
      rect(ctx, '#94a3b8', cx - 6, cy - 10, 12, 20);
      rect(ctx, '#ffffff', cx - 5, cy - 5, 10, 14); // white milk
      rect(ctx, '#38bdf8', cx - 4, cy - 1, 8, 4); // blue label
      rect(ctx, '#475569', cx - 3, cy - 14, 6, 3); // cap
    } else if (itemId.includes('pork')) {
      // Marbled fresh pork cut
      oval(ctx, '#991b1b', cx, cy, 13, 10);
      oval(ctx, '#f43f5e', cx, cy, 12, 9);
      oval(ctx, '#fb7185', cx, cy, 10, 7);
      rect(ctx, '#fecdd3', cx - 6, cy - 2, 8, 3); // marbling
      oval(ctx, '#ffffff', cx + 3, cy, 3, 3); // bone
    } else if (itemId.includes('wool')) {
      // Fluffy white cloud of fresh wool
      oval(ctx, '#cbd5e1', cx, cy + 2, 13, 9);
      oval(ctx, '#f1f5f9', cx, cy + 2, 12, 8);
      oval(ctx, '#ffffff', cx - 4, cy, 6, 6);
      oval(ctx, '#ffffff', cx + 4, cy, 6, 6);
      oval(ctx, '#ffffff', cx, cy - 3, 6, 6);
    }
  }

  // 4. LIVESTOCK CON GIỐNG (stock_*)
  else if (itemId.startsWith('stock_')) {
    if (itemId.includes('chicken')) {
      // Cheerful yellow baby chick
      oval(ctx, '#ca8a04', cx, cy + 3, 8, 7);
      oval(ctx, '#eab308', cx, cy + 3, 7, 6);
      oval(ctx, '#ca8a04', cx + 2, cy - 4, 6, 6);
      oval(ctx, '#facc15', cx + 2, cy - 4, 5, 5);
      rect(ctx, '#ea580c', cx + 6, cy - 4, 3, 2); // beak
      rect(ctx, '#000000', cx + 3, cy - 5, 1, 1); // eye
      rect(ctx, '#ea580c', cx - 2, cy + 9, 2, 3); // feet
      rect(ctx, '#ea580c', cx + 2, cy + 9, 2, 3);
    } else if (itemId.includes('duck')) {
      // Adorable white duckling
      oval(ctx, '#94a3b8', cx, cy + 3, 9, 7);
      oval(ctx, '#f8fafc', cx, cy + 3, 8, 6);
      oval(ctx, '#f8fafc', cx + 3, cy - 3, 6, 6);
      rect(ctx, '#f97316', cx + 7, cy - 3, 4, 2); // flat orange bill
      rect(ctx, '#000000', cx + 4, cy - 4, 1, 1);
    } else if (itemId.includes('cow')) {
      // Black and white Holstein dairy cow face
      oval(ctx, '#000000', cx, cy, 11, 10);
      oval(ctx, '#ffffff', cx, cy, 10, 9);
      rect(ctx, '#000000', cx - 8, cy - 6, 6, 6); // left patch
      oval(ctx, '#fbcfe8', cx, cy + 5, 6, 4); // pink snout
      rect(ctx, '#be185d', cx - 2, cy + 5, 1, 1);
      rect(ctx, '#be185d', cx + 2, cy + 5, 1, 1);
      rect(ctx, '#000000', cx - 4, cy - 2, 2, 2); // eyes
      rect(ctx, '#000000', cx + 3, cy - 2, 2, 2);
      // Small horns
      rect(ctx, '#d97706', cx - 7, cy - 8, 2, 3);
      rect(ctx, '#d97706', cx + 5, cy - 8, 2, 3);
    } else if (itemId.includes('pig')) {
      // Pink piglet snout & ears
      oval(ctx, '#db2777', cx, cy, 11, 10);
      oval(ctx, '#f472b6', cx, cy, 10, 9);
      oval(ctx, '#fbcfe8', cx, cy + 2, 6, 4);
      rect(ctx, '#db2777', cx - 2, cy + 2, 1, 2);
      rect(ctx, '#db2777', cx + 1, cy + 2, 1, 2);
      rect(ctx, '#000000', cx - 4, cy - 3, 2, 2);
      rect(ctx, '#000000', cx + 2, cy - 3, 2, 2);
      // Ears
      rect(ctx, '#db2777', cx - 8, cy - 8, 4, 4);
      rect(ctx, '#db2777', cx + 5, cy - 8, 4, 4);
    } else if (itemId.includes('fingerling') || itemId.includes('tom')) {
      // Fish / fingerling swimming in clear water bag
      oval(ctx, '#0284c7', cx, cy, 13, 14);
      oval(ctx, '#38bdf8', cx, cy, 12, 13);
      oval(ctx, '#bae6fd', cx, cy + 1, 10, 11);
      // Small fish inside
      rect(ctx, '#f97316', cx - 4, cy, 7, 3);
      rect(ctx, '#ea580c', cx - 6, cy - 1, 3, 5); // tail
      rect(ctx, '#ffffff', cx - 2, cy - 8, 4, 2); // tie
    } else {
      oval(ctx, '#ca8a04', cx, cy, 10, 10);
      oval(ctx, '#fde047', cx, cy, 8, 8);
    }
  }

  // 5. TRACTOR VEHICLE (tractor_farm)
  else if (itemId.includes('tractor')) {
    // Sturdy green farm tractor with giant back wheel and yellow accents
    rect(ctx, '#14532d', cx - 12, cy - 8, 22, 12); // main body green
    rect(ctx, '#16a34a', cx - 11, cy - 7, 20, 10);
    rect(ctx, '#22c55e', cx - 10, cy - 6, 18, 3); // hood highlight
    // Cabin windshield & roof
    rect(ctx, '#0f172a', cx - 10, cy - 15, 10, 8);
    rect(ctx, '#38bdf8', cx - 9, cy - 14, 8, 6);
    rect(ctx, '#fef08a', cx - 11, cy - 16, 12, 2); // yellow roof
    // Exhaust pipe
    rect(ctx, '#334155', cx + 6, cy - 14, 2, 7);
    rect(ctx, '#64748b', cx + 6, cy - 15, 3, 2);
    // Huge rear wheel
    oval(ctx, '#0f172a', cx - 8, cy + 4, 7, 7);
    oval(ctx, '#334155', cx - 8, cy + 4, 5, 5);
    oval(ctx, '#eab308', cx - 8, cy + 4, 3, 3); // yellow hub
    // Smaller front wheel
    oval(ctx, '#0f172a', cx + 7, cy + 6, 5, 5);
    oval(ctx, '#334155', cx + 7, cy + 6, 3, 3);
    oval(ctx, '#eab308', cx + 7, cy + 6, 2, 2);
  }

  // 6. TOOLS & SUPPLIES
  else if (itemId.includes('watering_can')) {
    // Traditional coconut shell / green metal watering can with spout
    rect(ctx, '#0369a1', cx - 7, cy - 3, 14, 12);
    rect(ctx, '#0284c7', cx - 6, cy - 2, 12, 10);
    rect(ctx, '#38bdf8', cx - 4, cy, 4, 5);
    // Spout & rose
    rect(ctx, '#0284c7', cx + 5, cy - 5, 6, 3);
    rect(ctx, '#0369a1', cx + 10, cy - 8, 3, 6);
    // Top handle
    rect(ctx, '#0369a1', cx - 6, cy - 8, 12, 3);
    // Water droplets
    rect(ctx, '#38bdf8', cx + 13, cy - 5, 2, 2);
    rect(ctx, '#7dd3fc', cx + 14, cy - 1, 2, 2);
  } else if (itemId.includes('hoe')) {
    // Bamboo handle with iron hoe head
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy + 11);
    ctx.lineTo(cx + 8, cy - 8);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#92400e';
    ctx.stroke();
    // Iron blade
    rect(ctx, '#334155', cx + 4, cy - 13, 8, 4);
    rect(ctx, '#64748b', cx + 5, cy - 12, 6, 3);
    rect(ctx, '#cbd5e1', cx + 6, cy - 10, 4, 1); // sharp edge
  } else if (itemId.includes('fertilizer')) {
    // Organic vermicompost sack
    rect(ctx, '#3f220d', cx - 9, cy - 8, 18, 18);
    rect(ctx, '#65a30d', cx - 8, cy - 7, 16, 16);
    rect(ctx, '#84cc16', cx - 7, cy - 6, 14, 14);
    // Leaf / earth emblem
    oval(ctx, '#365314', cx, cy, 4, 5);
    rect(ctx, '#bef264', cx - 1, cy - 1, 2, 3);
  } else if (itemId.includes('feed')) {
    // Burlap feed sack
    rect(ctx, '#78350f', cx - 9, cy - 8, 18, 18);
    rect(ctx, '#b45309', cx - 8, cy - 7, 16, 16);
    rect(ctx, '#fef08a', cx - 6, cy - 2, 12, 6);
    rect(ctx, '#d97706', cx - 3, cy, 6, 2);
  } else if (itemId.includes('aerator')) {
    // Paddle wheel aerator with water splashes
    oval(ctx, '#0284c7', cx, cy + 2, 9, 9);
    rect(ctx, '#f59e0b', cx - 11, cy - 1, 22, 4); // axle
    rect(ctx, '#0f172a', cx - 2, cy - 8, 4, 18); // paddles
    // Bubbles
    oval(ctx, '#ffffff', cx - 7, cy - 4, 2, 2);
    oval(ctx, '#ffffff', cx + 7, cy - 4, 2, 2);
    oval(ctx, '#38bdf8', cx, cy - 7, 2, 2);
  } else {
    // Generic farm crate fallback
    rect(ctx, '#78350f', cx - 10, cy - 8, 20, 16);
    rect(ctx, '#92400e', cx - 9, cy - 7, 18, 14);
    rect(ctx, '#b45309', cx - 8, cy - 6, 16, 12);
    rect(ctx, '#fef08a', cx - 2, cy - 2, 4, 4);
  }

  const url = canvas.toDataURL();
  iconCache.set(cacheKey, url);
  return url;
}
