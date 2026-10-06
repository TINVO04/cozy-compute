import type Phaser from 'phaser';

/**
 * 2026 HD-2D Wind Animated Props for Bien Hoa Map
 * Generates crisp procedural animated pixel textures for:
 * 1. Vietnam National Flag (Cờ đỏ sao vàng) waving in 6 wave phases
 * 2. Dong Nai Technology University (DNTU) flag waving in 6 wave phases
 * 3. Bougainvillea red petals (cánh hoa giấy đỏ Biên Hòa) & golden leaves
 * 4. Fluttering sheer window curtains
 */

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return c;
}

/**
 * Generates 6 frames of Vietnam National Flag (18x12 px)
 * displaying smooth organic sinusoidal cloth ripples.
 */
export function ensureFlagVietnamTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('flag:vn:0')) return;

  const W = 18;
  const H = 12;

  for (let frame = 0; frame < 6; frame++) {
    const c = createCanvas(W, H + 4);
    const ctx = c.getContext('2d')!;
    const phase = (frame / 6) * Math.PI * 2;

    for (let x = 0; x < W; x++) {
      // Cloth ripple wave equation
      const wave = Math.sin((x / W) * Math.PI * 2.2 - phase);
      const dy = Math.round(wave * 1.8 * (x / W)); // Amplitude grows toward free end

      // Top highlight or bottom shadow
      const col = wave > 0.4 ? '#ef4444' : wave < -0.4 ? '#991b1b' : '#dc2626';
      ctx.fillStyle = col;
      ctx.fillRect(x, 2 + dy, 1, H);

      // Top edge highlight
      ctx.fillStyle = wave > 0 ? '#f87171' : '#b91c1c';
      ctx.fillRect(x, 2 + dy, 1, 1);

      // Bottom edge shadow
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(x, 2 + dy + H - 1, 1, 1);
    }

    // Yellow Star in Center (warped by wave)
    const starMidX = 8;
    const waveAtCenter = Math.sin((starMidX / W) * Math.PI * 2.2 - phase);
    const starY = 2 + Math.round(waveAtCenter * 1.8 * (starMidX / W)) + 3;

    // Star pixels (sharp 5x5 pixel star)
    ctx.fillStyle = '#facc15';
    // Center 3x3
    ctx.fillRect(starMidX - 1, starY, 3, 3);
    // Top point
    ctx.fillRect(starMidX, starY - 2, 1, 2);
    // Left & right arms
    ctx.fillRect(starMidX - 3, starY + 1, 2, 1);
    ctx.fillRect(starMidX + 2, starY + 1, 2, 1);
    // Bottom legs
    ctx.fillRect(starMidX - 2, starY + 3, 1, 2);
    ctx.fillRect(starMidX + 2, starY + 3, 1, 2);

    // Star highlight center
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(starMidX, starY + 1, 1, 1);

    scene.textures.addCanvas(`flag:vn:${frame}`, c);
  }

  // Create Phaser Animation
  if (!scene.anims.exists('anim:flag:vn')) {
    scene.anims.create({
      key: 'anim:flag:vn',
      frames: [0, 1, 2, 3, 4, 5].map((i) => ({ key: `flag:vn:${i}` })),
      frameRate: 10,
      repeat: -1,
    });
  }
}

/**
 * Generates 6 frames of DNTU Flag (16x11 px)
 * White cloth with crimson crest
 */
export function ensureFlagDntuTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('flag:dntu:0')) return;

  const W = 16;
  const H = 11;

  for (let frame = 0; frame < 6; frame++) {
    const c = createCanvas(W, H + 4);
    const ctx = c.getContext('2d')!;
    const phase = (frame / 6) * Math.PI * 2;

    for (let x = 0; x < W; x++) {
      const wave = Math.sin((x / W) * Math.PI * 2.2 - phase);
      const dy = Math.round(wave * 1.6 * (x / W));

      ctx.fillStyle = wave > 0.4 ? '#ffffff' : wave < -0.4 ? '#cbd5e1' : '#f1f5f9';
      ctx.fillRect(x, 2 + dy, 1, H);

      ctx.fillStyle = wave > 0 ? '#ffffff' : '#94a3b8';
      ctx.fillRect(x, 2 + dy, 1, 1);

      ctx.fillStyle = '#64748b';
      ctx.fillRect(x, 2 + dy + H - 1, 1, 1);
    }

    // DNTU Emblem (Red Crest) in center
    const crestX = 7;
    const waveAtCenter = Math.sin((crestX / W) * Math.PI * 2.2 - phase);
    const crestY = 2 + Math.round(waveAtCenter * 1.6 * (crestX / W)) + 3;

    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(crestX - 2, crestY - 1, 5, 5);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(crestX - 1, crestY, 3, 3);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(crestX, crestY + 1, 1, 1);

    scene.textures.addCanvas(`flag:dntu:${frame}`, c);
  }

  if (!scene.anims.exists('anim:flag:dntu')) {
    scene.anims.create({
      key: 'anim:flag:dntu',
      frames: [0, 1, 2, 3, 4, 5].map((i) => ({ key: `flag:dntu:${i}` })),
      frameRate: 10,
      repeat: -1,
    });
  }
}

/**
 * Generates delicate bougainvillea petal & leaf particle textures
 */
export function ensureWindParticleTextures(scene: Phaser.Scene) {
  // Bougainvillea Red Petal (4x3 px)
  if (!scene.textures.exists('particle:petal:red')) {
    const c = createCanvas(5, 4);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(1, 0, 3, 1);
    ctx.fillRect(0, 1, 5, 2);
    ctx.fillRect(1, 3, 3, 1);
    ctx.fillStyle = '#fda4af';
    ctx.fillRect(2, 1, 2, 1);
    scene.textures.addCanvas('particle:petal:red', c);
  }

  // Bougainvillea Magenta Petal (4x3 px)
  if (!scene.textures.exists('particle:petal:magenta')) {
    const c = createCanvas(5, 4);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(1, 0, 3, 1);
    ctx.fillRect(0, 1, 5, 2);
    ctx.fillRect(1, 3, 3, 1);
    ctx.fillStyle = '#fbcfe8';
    ctx.fillRect(2, 1, 2, 1);
    scene.textures.addCanvas('particle:petal:magenta', c);
  }

  // Golden / Amber Deciduous Leaf (5x4 px)
  if (!scene.textures.exists('particle:leaf:gold')) {
    const c = createCanvas(6, 5);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#d97706';
    ctx.fillRect(2, 0, 2, 1);
    ctx.fillRect(1, 1, 4, 2);
    ctx.fillRect(0, 2, 6, 1);
    ctx.fillRect(2, 3, 3, 1);
    ctx.fillRect(3, 4, 1, 1);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(2, 1, 2, 2);
    scene.textures.addCanvas('particle:leaf:gold', c);
  }

  // Window Fluttering Curtain Texture (8x16 px)
  if (!scene.textures.exists('prop:curtain:sheer')) {
    const c = createCanvas(10, 18);
    const ctx = c.getContext('2d')!;
    // Sheer linen curtain with soft pleats
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(1, 0, 8, 16);
    ctx.fillStyle = 'rgba(241, 245, 249, 0.95)';
    ctx.fillRect(3, 0, 2, 16);
    ctx.fillRect(7, 0, 2, 16);
    ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
    ctx.fillRect(2, 1, 1, 16);
    ctx.fillRect(6, 1, 1, 16);
    scene.textures.addCanvas('prop:curtain:sheer', c);
  }
}

/**
 * Generates colorful 4-blade pinwheel (chong chóng xe hàng rong) & bamboo stick
 */
export function ensurePinwheelTextures(scene: Phaser.Scene) {
  // Pinwheel head (16x16 px)
  if (!scene.textures.exists('prop:pinwheel')) {
    const c = createCanvas(16, 16);
    const ctx = c.getContext('2d')!;

    // Blade 1: Top (Red)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(8, 1);
    ctx.lineTo(4, 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.fillRect(7, 3, 2, 4);

    // Blade 2: Right (Yellow)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(15, 8);
    ctx.lineTo(13, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(9, 7, 4, 2);

    // Blade 3: Bottom (Green)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(8, 15);
    ctx.lineTo(12, 13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#86efac';
    ctx.fillRect(7, 9, 2, 4);

    // Blade 4: Left (Blue)
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(1, 8);
    ctx.lineTo(3, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(3, 7, 4, 2);

    // Center brass pin
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(8, 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(8, 8, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 7, 1, 1);

    scene.textures.addCanvas('prop:pinwheel', c);
  }

  // Bamboo mounting stick (3x22 px)
  if (!scene.textures.exists('prop:pinwheel:stick')) {
    const c = createCanvas(4, 22);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(1, 0, 2, 22);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(1, 0, 1, 22);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 6, 4, 1);
    ctx.fillRect(0, 14, 4, 1);
    scene.textures.addCanvas('prop:pinwheel:stick', c);
  }
}

/**
 * Generates hanging swinging cafe signboard for "Tiệm Cà Phê Bean There"
 */
export function ensureCafeSignTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists('prop:sign:cafe')) {
    const c = createCanvas(32, 20);
    const ctx = c.getContext('2d')!;

    // Hanging iron chains at top
    ctx.fillStyle = '#475569';
    ctx.fillRect(5, 0, 2, 4);
    ctx.fillRect(25, 0, 2, 4);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(5, 1, 1, 2);
    ctx.fillRect(25, 1, 1, 2);

    // Mahogany wooden board
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(1, 4, 30, 15);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(2, 5, 28, 13);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(3, 6, 26, 11);

    // Gold trim
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(3, 6, 26, 1);
    ctx.fillRect(3, 16, 26, 1);
    ctx.fillRect(3, 6, 1, 11);
    ctx.fillRect(28, 6, 1, 11);

    // "CAFE" lettering + coffee steam
    ctx.font = '800 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('☕ CAFE', 16, 14);

    scene.textures.addCanvas('prop:sign:cafe', c);
  }
}

/**
 * Generates 4-frame animated realistic water streams & geyser spray for Plaza Fountain
 */
export function ensureFountainWaterTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('fountain:spout:0')) return;

  // 1. Spouting geyser spray at top finial (16x18 px, 4 frames)
  for (let f = 0; f < 4; f++) {
    const c = createCanvas(16, 18);
    const ctx = c.getContext('2d')!;

    const pulse = Math.sin((f / 4) * Math.PI * 2);
    const h = 10 + pulse * 2.5;

    // Upward bubbling water column
    ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
    ctx.fillRect(7, 18 - h, 2, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 18 - h, 1, h);

    // Crest bursting spray droplets
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(5, 18 - h + 2, 2, 2);
    ctx.fillRect(9, 18 - h + 2, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 18 - h + 5 + (f % 2), 1, 2);
    ctx.fillRect(11, 18 - h + 5 + ((f + 1) % 2), 1, 2);

    scene.textures.addCanvas(`fountain:spout:${f}`, c);
  }

  if (!scene.anims.exists('anim:fountain:spout')) {
    scene.anims.create({
      key: 'anim:fountain:spout',
      frames: [0, 1, 2, 3].map((i) => ({ key: `fountain:spout:${i}` })),
      frameRate: 8,
      repeat: -1,
    });
  }

  // 2. Cascading waterfall streams falling into lower basin (36x24 px, 4 frames)
  for (let f = 0; f < 4; f++) {
    const c = createCanvas(36, 24);
    const ctx = c.getContext('2d')!;

    const streams = [6, 14, 22, 30];
    streams.forEach((sx, idx) => {
      const offset = (f * 4 + idx * 3) % 16;

      // Cascading water ribbon
      ctx.fillStyle = 'rgba(147, 197, 253, 0.75)';
      ctx.fillRect(sx, 0, 2, 20);

      // Bright flowing shimmer dash
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(sx, offset, 1, 4);

      // Splash foam bubble at basin contact
      ctx.fillStyle = '#ffffff';
      const foamOffset = (f + idx) % 3;
      ctx.fillRect(sx - 1, 19 + (foamOffset === 0 ? 0 : 1), 4, 2);
    });

    scene.textures.addCanvas(`fountain:cascades:${f}`, c);
  }

  if (!scene.anims.exists('anim:fountain:cascades')) {
    scene.anims.create({
      key: 'anim:fountain:cascades',
      frames: [0, 1, 2, 3].map((i) => ({ key: `fountain:cascades:${i}` })),
      frameRate: 8,
      repeat: -1,
    });
  }
}
