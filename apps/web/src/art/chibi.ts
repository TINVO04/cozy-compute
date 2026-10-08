import {
  HAIR_COLORS,
  SKIN_TONES,
  TOP_COLORS,
  normalizeRodId,
  normalizeSwordId,
  type Appearance,
} from '@cozy/game-data';
import { fishRenderDimensions, getHDFishCanvas, getSpeciesData } from './fish';
import { fishArtRevision } from './fish-assets';
import { fitChibiWithFish } from './fish-layout';

/**
 * 2026 High-Definition 2D Vector / Canvas Chibi Renderer:
 * Inspired by MapleStory, Dave the Diver, and modern cozy 2D animation.
 * Features:
 * - Ultra-crisp High-DPI vector rendering without chunky square pixels
 * - Expressive anime eyes with glossy pupils & dual catchlights
 * - Soft layered shading, blush gradients, silky hair strands with specular luster
 * - Bespoke clothing tailoring (hoodies with cords, suits with golden clips, knit sweaters)
 * - Dynamic trophy catch pose: small fish held in hands, giant fish hoisted or towering proudly!
 */

const parseSprite = (sprite?: string | null) => {
  if (!sprite) return null;
  const [kind, color] = sprite.split(':');
  return { kind: kind!, color: color ?? '#888888' };
};

interface RodVisual {
  bodyColor: string;
  accentColor: string;
  reelColor: string;
  glowColor?: string;
  hasLeaf?: boolean;
  hasGems?: boolean;
}

const ROD_VISUALS: Record<string, RodVisual> = {
  rod_twig: {
    bodyColor: '#854d0e',
    accentColor: '#a16207',
    reelColor: '#713f12',
    hasLeaf: true,
  },
  rod_wooden: {
    bodyColor: '#b45309',
    accentColor: '#d97706',
    reelColor: '#451a03',
  },
  rod_fiberglass: {
    bodyColor: '#0284c7',
    accentColor: '#38bdf8',
    reelColor: '#e2e8f0',
  },
  rod_pro_carbon: {
    bodyColor: '#1e293b',
    accentColor: '#ef4444',
    reelColor: '#f59e0b',
  },
  rod_golden_legend: {
    bodyColor: '#f59e0b',
    accentColor: '#fef08a',
    reelColor: '#fbbf24',
    glowColor: 'rgba(254, 240, 138, 0.6)',
    hasGems: true,
  },
  rod_abyssal: {
    bodyColor: '#581c87',
    accentColor: '#06b6d4',
    reelColor: '#7c3aed',
    glowColor: 'rgba(6, 182, 212, 0.7)',
  },
};

function drawChibiFishingRod(
  ctx: CanvasRenderingContext2D,
  rawRodId: string,
  isBack: boolean,
  isSide: boolean,
  headY: number,
  torsoY: number,
  heldInHand = false,
) {
  const rodId = normalizeRodId(rawRodId);
  const visual = ROD_VISUALS[rodId] ?? ROD_VISUALS.rod_twig!;
  ctx.save();

  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;

  if (heldInHand) {
    if (isSide) {
      startX = -12;
      startY = torsoY + 16;
      endX = -38;
      endY = headY - 24;
    } else if (isBack) {
      startX = 16;
      startY = torsoY + 16;
      endX = 34;
      endY = headY - 26;
    } else {
      startX = 16;
      startY = torsoY + 16;
      endX = 34;
      endY = headY - 26;
    }
  } else {
    if (isSide) {
      startX = 2;
      startY = torsoY + 22;
      endX = 26;
      endY = headY - 26;
    } else if (isBack) {
      startX = -14;
      startY = torsoY + 20;
      endX = 18;
      endY = headY - 26;
    } else {
      startX = 8;
      startY = torsoY + 12;
      endX = 24;
      endY = headY - 26;
    }
  }

  if (visual.glowColor) {
    ctx.shadowColor = visual.glowColor;
    ctx.shadowBlur = 8;
  }

  // Shaft
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = visual.bodyColor;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Accent line
  ctx.beginPath();
  ctx.moveTo(startX + (endX - startX) * 0.3, startY + (endY - startY) * 0.3);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = visual.accentColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Grip
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(startX + (endX - startX) * 0.22, startY + (endY - startY) * 0.22);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Reel
  if (isBack || isSide) {
    const reelX = startX + (endX - startX) * 0.18;
    const reelY = startY + (endY - startY) * 0.18;
    ctx.beginPath();
    ctx.arc(reelX - 3, reelY, 4, 0, Math.PI * 2);
    ctx.fillStyle = visual.reelColor;
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Feature tip
  if (visual.hasLeaf) {
    ctx.beginPath();
    ctx.ellipse(endX + 3, endY - 2, 4, 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
  } else if (visual.hasGems) {
    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Guides
  [0.45, 0.72, 0.95].forEach((t) => {
    const gx = startX + (endX - startX) * t;
    const gy = startY + (endY - startY) * t;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Line & Bobber
  const lineHangY = endY + 22;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX + 2, lineHangY);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const bobX = endX + 2;
  const bobY = lineHangY;
  ctx.beginPath();
  ctx.arc(bobX, bobY, 3.5, Math.PI, 0);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bobX, bobY, 3.5, 0, Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.restore();
}

interface ChibiSwordVisual {
  scabbardColor: string;
  scabbardTrim: string;
  hiltColor: string;
  guardColor: string;
  pommelColor: string;
  tasselColor: string;
  strapColor: string;
  glowColor?: string;
  sparkleColor?: string;
}

const CHIBI_SWORD_VISUALS: Record<string, ChibiSwordVisual> = {
  sword_training: {
    scabbardColor: '#854d0e',
    scabbardTrim: '#a16207',
    hiltColor: '#b45309',
    guardColor: '#78350f',
    pommelColor: '#92400e',
    tasselColor: '#ca8a04',
    strapColor: '#543217',
  },
  sword_iron: {
    scabbardColor: '#1e293b',
    scabbardTrim: '#475569',
    hiltColor: '#334155',
    guardColor: '#eab308',
    pommelColor: '#cbd5e1',
    tasselColor: '#dc2626',
    strapColor: '#382517',
    glowColor: 'rgba(203, 213, 225, 0.4)',
  },
  sword_crystal: {
    scabbardColor: '#0f766e',
    scabbardTrim: '#14b8a6',
    hiltColor: '#0e7490',
    guardColor: '#2dd4bf',
    pommelColor: '#67e8f9',
    tasselColor: '#06b6d4',
    strapColor: '#134e4a',
    glowColor: 'rgba(45, 212, 191, 0.6)',
    sparkleColor: '#ffffff',
  },
  sword_ancient: {
    scabbardColor: '#78350f',
    scabbardTrim: '#b45309',
    hiltColor: '#92400e',
    guardColor: '#f59e0b',
    pommelColor: '#fbbf24',
    tasselColor: '#b91c1c',
    strapColor: '#451a03',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    sparkleColor: '#fef08a',
  },
  sword_flame: {
    scabbardColor: '#450a0a',
    scabbardTrim: '#991b1b',
    hiltColor: '#7f1d1d',
    guardColor: '#dc2626',
    pommelColor: '#ef4444',
    tasselColor: '#f97316',
    strapColor: '#450a0a',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    sparkleColor: '#fbbf24',
  },
  sword_frost: {
    scabbardColor: '#0369a1',
    scabbardTrim: '#0284c7',
    hiltColor: '#075985',
    guardColor: '#38bdf8',
    pommelColor: '#bae6fd',
    tasselColor: '#7dd3fc',
    strapColor: '#0c4a6e',
    glowColor: 'rgba(56, 189, 248, 0.6)',
    sparkleColor: '#ffffff',
  },
};

export function drawChibiSlungSword(
  ctx: CanvasRenderingContext2D,
  rawSwordId: string,
  isBack: boolean,
  isSide: boolean,
  _headY: number,
  torsoY: number,
) {
  const swordId = normalizeSwordId(rawSwordId);
  const visual = CHIBI_SWORD_VISUALS[swordId] ?? CHIBI_SWORD_VISUALS.sword_training!;
  ctx.save();

  if (visual.glowColor) {
    ctx.shadowColor = visual.glowColor;
    ctx.shadowBlur = 10;
  }

  if (isBack) {
    // 1. Dây đai đeo chéo lưng
    ctx.beginPath();
    ctx.moveTo(-16, torsoY + 24);
    ctx.lineTo(16, torsoY + 4);
    ctx.strokeStyle = visual.strapColor;
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Khóa kim loại giữ bao kiếm
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-2, torsoY + 12, 5, 4);

    // 2. Thân bao kiếm vác chéo lưng góc 45 độ
    const scabbardStartX = 14;
    const scabbardStartY = torsoY + 2;
    const scabbardEndX = -18;
    const scabbardEndY = torsoY + 30;

    ctx.beginPath();
    ctx.moveTo(scabbardStartX, scabbardStartY);
    ctx.lineTo(scabbardEndX, scabbardEndY);
    ctx.strokeStyle = visual.scabbardColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Viền kim loại & hoa văn bao kiếm
    ctx.beginPath();
    ctx.moveTo(scabbardStartX, scabbardStartY);
    ctx.lineTo(scabbardEndX, scabbardEndY);
    ctx.strokeStyle = visual.scabbardTrim;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chóp bọc đáy bao kiếm
    ctx.fillStyle = visual.guardColor;
    ctx.beginPath();
    ctx.arc(scabbardEndX, scabbardEndY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 3. Đốc kiếm (Crossguard)
    ctx.save();
    ctx.translate(scabbardStartX, scabbardStartY);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = visual.guardColor;
    ctx.fillRect(-6, -2, 12, 4);
    ctx.restore();

    // 4. Chuôi kiếm vươn chéo qua vai
    const hiltEndX = scabbardStartX + 12;
    const hiltEndY = scabbardStartY - 16;
    ctx.beginPath();
    ctx.moveTo(scabbardStartX, scabbardStartY);
    ctx.lineTo(hiltEndX, hiltEndY);
    ctx.strokeStyle = visual.hiltColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Núm chuôi kiếm (Pommel)
    ctx.fillStyle = visual.pommelColor;
    ctx.beginPath();
    ctx.arc(hiltEndX, hiltEndY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Dây tua rua kiếm lụa buông lơi
    ctx.beginPath();
    ctx.moveTo(hiltEndX, hiltEndY);
    ctx.quadraticCurveTo(hiltEndX + 4, hiltEndY + 8, hiltEndX + 2, hiltEndY + 16);
    ctx.strokeStyle = visual.tasselColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else if (isSide) {
    // Nhìn nghiêng: Dây đai mạn sườn
    ctx.beginPath();
    ctx.moveTo(-4, torsoY + 8);
    ctx.lineTo(-8, torsoY + 22);
    ctx.strokeStyle = visual.strapColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Bao kiếm nghiêng sau lưng
    const startX = 6;
    const startY = torsoY + 4;
    const endX = -14;
    const endY = torsoY + 28;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = visual.scabbardColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = visual.scabbardTrim;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chuôi kiếm
    const hiltEndX = startX + 10;
    const hiltEndY = startY - 14;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(hiltEndX, hiltEndY);
    ctx.strokeStyle = visual.hiltColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = visual.pommelColor;
    ctx.beginPath();
    ctx.arc(hiltEndX, hiltEndY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Tua kiếm
    ctx.beginPath();
    ctx.moveTo(hiltEndX, hiltEndY);
    ctx.quadraticCurveTo(hiltEndX + 3, hiltEndY + 6, hiltEndX + 1, hiltEndY + 14);
    ctx.strokeStyle = visual.tasselColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    // Nhìn thẳng phía trước:
    // 1. Dây đai da vắt chéo ngực (từ vai phải xuống hông trái như trong phim)
    ctx.beginPath();
    ctx.moveTo(14, torsoY + 2);
    ctx.lineTo(-14, torsoY + 24);
    ctx.strokeStyle = visual.strapColor;
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Khóa kim loại sáng loáng giữa ngực
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-2, torsoY + 11, 6, 5);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1;
    ctx.strokeRect(-2, torsoY + 11, 6, 5);

    // 2. Chóp bao kiếm lộ nhẹ bên hông trái
    ctx.fillStyle = visual.guardColor;
    ctx.beginPath();
    ctx.arc(-16, torsoY + 26, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 3. Đốc kiếm & Chuôi kiếm vươn cao chéo qua vai phải
    const guardX = 14;
    const guardY = torsoY + 2;
    const hiltEndX = guardX + 12;
    const hiltEndY = guardY - 16;

    // Đốc kiếm
    ctx.save();
    ctx.translate(guardX, guardY);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = visual.guardColor;
    ctx.fillRect(-6, -2, 12, 4);
    ctx.restore();

    // Thân chuôi kiếm
    ctx.beginPath();
    ctx.moveTo(guardX, guardY);
    ctx.lineTo(hiltEndX, hiltEndY);
    ctx.strokeStyle = visual.hiltColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Núm chuôi
    ctx.fillStyle = visual.pommelColor;
    ctx.beginPath();
    ctx.arc(hiltEndX, hiltEndY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Tua kiếm lụa buông rủ
    ctx.beginPath();
    ctx.moveTo(hiltEndX, hiltEndY);
    ctx.quadraticCurveTo(hiltEndX + 4, hiltEndY + 8, hiltEndX + 2, hiltEndY + 18);
    ctx.strokeStyle = visual.tasselColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders an HD Chibi character on any 2D canvas context.
 */
export function drawChibiAvatar(
  ctx: CanvasRenderingContext2D,
  a: Appearance,
  options: {
    cx?: number;
    cy?: number;
    scale?: number;
    pose?: 'idle' | 'holding' | 'trophy' | 'fishing';
    dir?: 0 | 1 | 2 | 3;
    frame?: 0 | 1 | 2;
    showFish?: boolean;
  } = {},
) {
  const {
    cx = 100,
    cy = 130,
    scale = 1,
    pose = a.heldFish ? (a.heldFish.sizeCm > 120 ? 'trophy' : 'holding') : a.isFishing ? 'fishing' : 'idle',
    dir = 0,
    frame = 0,
    showFish = true,
  } = options;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const skin = SKIN_TONES[a.skin] ?? '#fce3cf';
  const hair = HAIR_COLORS[a.hairColor] ?? '#4a3224';
  const top = parseSprite(a.top);
  const topColor = top?.color ?? TOP_COLORS[a.baseTop] ?? '#4f6fd1';
  const hat = parseSprite(a.hat);
  const face = parseSprite(a.face);

  const isBack = dir === 3;
  const isSide = dir === 1 || dir === 2;
  const isMirror = dir === 2;

  if (isMirror) {
    ctx.scale(-1, 1);
  }

  // Walk cycle physics
  const bodyBob = frame === 0 ? 0 : -2;

  // --- 1. SHADOW ON GROUND ---
  ctx.beginPath();
  ctx.ellipse(0, 48, 28, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.fill();

  // --- 2. LOWER BODY (LEGS & SHOES) ---
  const pantsCol = '#252d44';
  const pantsShadow = '#181e30';
  const shoeCol = '#e2e8f0';
  const shoeSole = '#94a3b8';

  if (isSide) {
    // Profile Walk Cycle: Moving forward (-X when dir=1)
    // frame 1: lead leg steps forward (-X), trailing leg back (+X)
    // frame 2: lead leg swings back (+X), trailing leg forward (-X)
    const leadStep = frame === 1 ? -6 : frame === 2 ? 6 : 0;
    const trailStep = -leadStep;

    // Trailing Leg (towards back +X)
    ctx.beginPath();
    ctx.roundRect(-4 + trailStep, 20 + bodyBob, 10, 24, 5);
    ctx.fillStyle = pantsShadow;
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-10 + trailStep, 40 + bodyBob, 15, 9, 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();

    // Lead Leg (towards front -X)
    ctx.beginPath();
    ctx.roundRect(-6 + leadStep, 20 + bodyBob, 11, 24, 5);
    ctx.fillStyle = pantsCol;
    ctx.fill();
    ctx.strokeStyle = pantsShadow;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Lead Shoe (toe points forward towards -X)
    ctx.beginPath();
    ctx.roundRect(-12 + leadStep, 40 + bodyBob, 16, 9, 4);
    ctx.fillStyle = shoeCol;
    ctx.fill();
    ctx.fillStyle = shoeSole;
    ctx.fillRect(-12 + leadStep, 46 + bodyBob, 16, 3);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    // Front / Back View Legs
    // Left Leg
    ctx.beginPath();
    ctx.roundRect(-14, 20 + bodyBob, 11, 24 + (frame === 1 ? -1 : frame === 2 ? 1 : 0), 5);
    ctx.fillStyle = pantsCol;
    ctx.fill();
    ctx.strokeStyle = pantsShadow;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Left Shoe
    ctx.beginPath();
    ctx.roundRect(-16, 40 + bodyBob + (frame === 1 ? -2 : frame === 2 ? 2 : 0), 13, 9, 4);
    ctx.fillStyle = shoeCol;
    ctx.fill();
    ctx.fillStyle = shoeSole;
    ctx.fillRect(-16, 46 + bodyBob + (frame === 1 ? -2 : frame === 2 ? 2 : 0), 13, 3);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Right Leg
    ctx.beginPath();
    ctx.roundRect(3, 20 + bodyBob, 11, 24 + (frame === 2 ? -1 : frame === 1 ? 1 : 0), 5);
    ctx.fillStyle = pantsCol;
    ctx.fill();
    ctx.strokeStyle = pantsShadow;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Right Shoe
    ctx.beginPath();
    ctx.roundRect(3, 40 + bodyBob + (frame === 2 ? -2 : frame === 1 ? 2 : 0), 13, 9, 4);
    ctx.fillStyle = shoeCol;
    ctx.fill();
    ctx.fillStyle = shoeSole;
    ctx.fillRect(3, 46 + bodyBob + (frame === 2 ? -2 : frame === 1 ? 2 : 0), 13, 3);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // --- 3. TORSO & CLOTHING ---
  const torsoY = -4 + bodyBob;
  ctx.beginPath();
  if (isSide) {
    ctx.roundRect(-14, torsoY, 28, 28, 8);
  } else {
    ctx.roundRect(-18, torsoY, 36, 28, 8);
  }
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Clothing details
  if (!isBack) {
    if (top?.kind === 'hoodie') {
      if (isSide) {
        // Kangaroo pocket in front (-X)
        ctx.beginPath();
        ctx.roundRect(-12, torsoY + 14, 15, 12, 4);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();
        // Front drawstring
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, torsoY + 4);
        ctx.lineTo(-5, torsoY + 13);
        ctx.stroke();
        // Hood folds at the back (+X)
        ctx.beginPath();
        ctx.roundRect(4, torsoY + 2, 8, 12, 4);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.fill();
      } else {
        // Kangaroo pocket
        ctx.beginPath();
        ctx.roundRect(-12, torsoY + 14, 24, 12, 4);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();
        // Drawstrings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, torsoY + 4);
        ctx.lineTo(-5, torsoY + 13);
        ctx.moveTo(5, torsoY + 4);
        ctx.lineTo(5, torsoY + 13);
        ctx.stroke();
      }
    } else if (top?.kind === 'suit') {
      if (isSide) {
        // White shirt V-neck towards front
        ctx.beginPath();
        ctx.moveTo(-10, torsoY);
        ctx.lineTo(-3, torsoY + 12);
        ctx.lineTo(2, torsoY);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        // Red silk tie with golden bar
        ctx.beginPath();
        ctx.moveTo(-5, torsoY + 4);
        ctx.lineTo(-3, torsoY + 18);
        ctx.lineTo(-1, torsoY + 4);
        ctx.closePath();
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-6, torsoY + 8, 5, 2);
      } else {
        // White shirt V-neck
        ctx.beginPath();
        ctx.moveTo(-7, torsoY);
        ctx.lineTo(0, torsoY + 12);
        ctx.lineTo(7, torsoY);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        // Red silk tie with golden bar
        ctx.beginPath();
        ctx.moveTo(-2, torsoY + 4);
        ctx.lineTo(0, torsoY + 18);
        ctx.lineTo(2, torsoY + 4);
        ctx.closePath();
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-3, torsoY + 8, 6, 2);
      }
    } else if (top?.kind === 'raincoat') {
      if (isSide) {
        // Storm flap & buttons at front chest
        ctx.beginPath();
        ctx.moveTo(-5, torsoY);
        ctx.lineTo(-5, torsoY + 28);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();
        [torsoY + 6, torsoY + 14, torsoY + 22].forEach((ty) => {
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-8, ty - 2, 6, 4);
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(-9, ty - 1, 8, 2);
        });
      } else {
        // Yellow waterproof storm flap & toggle buttons
        ctx.beginPath();
        ctx.moveTo(0, torsoY);
        ctx.lineTo(0, torsoY + 28);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Wooden toggle buttons
        [torsoY + 6, torsoY + 14, torsoY + 22].forEach((ty) => {
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-3, ty - 2, 6, 4);
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(-4, ty - 1, 8, 2);
        });
      }
    } else if (top?.kind === 'sweater') {
      if (isSide) {
        ctx.beginPath();
        ctx.arc(-3, torsoY, 7, 0, Math.PI);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Fair Isle diamonds towards front
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        [-8, 0].forEach((dx) => {
          ctx.moveTo(dx, torsoY + 10);
          ctx.lineTo(dx + 3, torsoY + 14);
          ctx.lineTo(dx, torsoY + 18);
          ctx.lineTo(dx - 3, torsoY + 14);
          ctx.closePath();
        });
        ctx.fill();
      } else {
        // Knit collar
        ctx.beginPath();
        ctx.arc(0, torsoY, 8, 0, Math.PI);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Fair Isle diamond pattern
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        [-8, 0, 8].forEach((dx) => {
          ctx.moveTo(dx, torsoY + 10);
          ctx.lineTo(dx + 3, torsoY + 14);
          ctx.lineTo(dx, torsoY + 18);
          ctx.lineTo(dx - 3, torsoY + 14);
          ctx.closePath();
        });
        ctx.fill();
      }
    } else if (top?.kind === 'kimono') {
      if (isSide) {
        // Side view of kimono obi & collar
        ctx.beginPath();
        ctx.moveTo(-10, torsoY);
        ctx.lineTo(0, torsoY + 14);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Obi sash
        ctx.fillStyle = '#be185d';
        ctx.fillRect(-14, torsoY + 14, 26, 8);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-14, torsoY + 17, 26, 2);
        // Obi bow knot at back (+X)
        ctx.fillStyle = '#be185d';
        ctx.fillRect(8, torsoY + 12, 6, 12);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(9, torsoY + 14, 4, 3);
      } else {
        // Yukata crossed wrap collar (left over right)
        ctx.beginPath();
        ctx.moveTo(-10, torsoY);
        ctx.lineTo(4, torsoY + 14);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(10, torsoY);
        ctx.lineTo(-4, torsoY + 14);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Broad dark obi sash with gold ribbon
        ctx.fillStyle = '#be185d';
        ctx.fillRect(-17, torsoY + 14, 34, 8);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-17, torsoY + 17, 34, 2);
        // Sakura blossom petal prints
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-8, torsoY + 8, 2.5, 0, Math.PI * 2);
        ctx.arc(8, torsoY + 8, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (top?.kind === 'cyber_jacket') {
      if (isSide) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-10, torsoY - 3, 16, 6);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-8, torsoY + 6);
        ctx.lineTo(-8, torsoY + 24);
        ctx.stroke();
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-3, torsoY + 3);
        ctx.lineTo(-3, torsoY + 26);
        ctx.stroke();
      } else {
        // High techwear collar
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-10, torsoY - 3, 20, 6);
        // Glowing cyan LED light strips
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-12, torsoY + 6);
        ctx.lineTo(-12, torsoY + 24);
        ctx.moveTo(12, torsoY + 6);
        ctx.lineTo(12, torsoY + 24);
        ctx.stroke();
        // Neon zipper
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, torsoY + 3);
        ctx.lineTo(0, torsoY + 26);
        ctx.stroke();
      }
    } else if (top?.kind === 'sailor_uniform') {
      if (isSide) {
        // Sailor flap draped at back (+X)
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(2, torsoY, 10, 10);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(2, torsoY, 10, 10);
        // Red silk tie bow in front (-X)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-5, torsoY + 12);
        ctx.lineTo(-10, torsoY + 18);
        ctx.lineTo(-2, torsoY + 18);
        ctx.closePath();
        ctx.fill();
      } else {
        // Japanese school sailor fuku collar draped over shoulders
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.moveTo(-16, torsoY);
        ctx.lineTo(-16, torsoY + 10);
        ctx.lineTo(0, torsoY + 16);
        ctx.lineTo(16, torsoY + 10);
        ctx.lineTo(16, torsoY);
        ctx.closePath();
        ctx.fill();
        // Double white stripes
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Red silk tie bow
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(0, torsoY + 12);
        ctx.lineTo(-6, torsoY + 20);
        ctx.lineTo(0, torsoY + 17);
        ctx.lineTo(6, torsoY + 20);
        ctx.closePath();
        ctx.fill();
      }
    } else if (top?.kind === 'overalls') {
      if (isSide) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-12, torsoY, 24, 6);
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(-10, torsoY + 6, 18, 22);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-8, torsoY + 6, 4, 4);
        ctx.strokeStyle = '#1d4ed8';
        ctx.strokeRect(-9, torsoY + 14, 8, 10);
      } else {
        // White undershirt visible at shoulders
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-16, torsoY, 32, 6);
        // Denim overalls bib
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(-12, torsoY + 6, 24, 22);
        // Brass suspender buckles
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-10, torsoY + 6, 4, 4);
        ctx.fillRect(6, torsoY + 6, 4, 4);
        // Front utility pocket
        ctx.strokeStyle = '#1d4ed8';
        ctx.strokeRect(-6, torsoY + 14, 12, 10);
      }
    } else {
      if (isSide) {
        ctx.beginPath();
        ctx.arc(-3, torsoY, 7, 0, Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(-5, torsoY + 10, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Default Collar trim & star emblem
        ctx.beginPath();
        ctx.arc(0, torsoY, 8, 0, Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Subtle chest star emblem
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, torsoY + 10, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // Back of clothing
    if (top?.kind === 'hoodie') {
      // Draped hood on back
      ctx.beginPath();
      ctx.roundRect(-10, torsoY, 20, 14, 6);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fill();
    } else if (top?.kind === 'sailor_uniform') {
      // Square sailor flap on back
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-14, torsoY, 28, 14);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-14, torsoY, 28, 14);
    }
  }

  // --- 3.5. SLUNG SWORD (Vác chéo lưng kiếm hiệp) ---
  if (a.sword && !a.heldFish && !a.isFishing) {
    const swordHeadY = -44 + bodyBob;
    drawChibiSlungSword(ctx, a.sword, isBack, isSide, swordHeadY, torsoY);
  }

  // --- 4. BACK HAIR (for long / bun styles) ---
  if (a.hairStyle === 'long') {
    ctx.beginPath();
    if (isSide) {
      // Long hair flows down the back (+X)
      ctx.roundRect(-16, -32 + bodyBob, 46, 56, 18);
    } else {
      ctx.roundRect(-30, -32 + bodyBob, 60, 56, 18);
    }
    ctx.fillStyle = hair;
    ctx.fill();
    ctx.strokeStyle = '#1e1b2e';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else if (a.hairStyle === 'bun') {
    ctx.beginPath();
    const bunX = isSide ? 10 : 0;
    ctx.arc(bunX, -46 + bodyBob, 15, 0, Math.PI * 2);
    ctx.fillStyle = hair;
    ctx.fill();
    ctx.strokeStyle = '#1e1b2e';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Cute red ribbon on bun
    ctx.beginPath();
    ctx.roundRect(bunX - 8, -39 + bodyBob, 16, 6, 3);
    ctx.fillStyle = '#f43f5e';
    ctx.fill();
  }

  // --- 5. HEAD & FACE ---
  const headY = -44 + bodyBob;

  ctx.beginPath();
  if (isSide) {
    ctx.roundRect(-22, headY, 44, 42, 18);
  } else {
    ctx.roundRect(-24, headY, 48, 42, 18);
  }
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.strokeStyle = '#2d2238';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  if (isSide) {
    // Cute ear on side of head towards the back (+X)
    ctx.beginPath();
    ctx.arc(8, headY + 22, 5.5, -Math.PI / 2, Math.PI / 2);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.strokeStyle = '#2d2238';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Inner ear notch
    ctx.beginPath();
    ctx.arc(7, headY + 22, 2.5, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = 'rgba(225, 29, 72, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cute anime nose profile bump at the front (-X)
    ctx.beginPath();
    ctx.moveTo(-22, headY + 20);
    ctx.quadraticCurveTo(-24.5, headY + 22.5, -22, headY + 24);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.strokeStyle = '#2d2238';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (!isBack) {
    if (!isSide) {
      // Airbrushed cute rosy blush (Left & Right)
      const gradL = ctx.createRadialGradient(-14, headY + 24, 2, -14, headY + 24, 9);
      gradL.addColorStop(0, 'rgba(244, 63, 94, 0.38)');
      gradL.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = gradL;
      ctx.beginPath();
      ctx.arc(-14, headY + 24, 9, 0, Math.PI * 2);
      ctx.fill();

      const gradR = ctx.createRadialGradient(14, headY + 24, 2, 14, headY + 24, 9);
      gradR.addColorStop(0, 'rgba(244, 63, 94, 0.38)');
      gradR.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = gradR;
      ctx.beginPath();
      ctx.arc(14, headY + 24, 9, 0, Math.PI * 2);
      ctx.fill();

      // Large Anime Eyes (Front View)
      const drawEye = (x: number) => {
        // Upper thick lash line
        ctx.beginPath();
        ctx.arc(x, headY + 19, 6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.strokeStyle = '#1e1b2e';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Deep shiny pupil
        ctx.beginPath();
        ctx.ellipse(x, headY + 22, 4.5, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        // Dual sparkling catchlights (twinkle)
        ctx.beginPath();
        ctx.arc(x - 1.5, headY + 20, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 1.5, headY + 24, 1, 0, Math.PI * 2);
        ctx.fill();
      };

      drawEye(-12);
      drawEye(12);

      // Soft smile
      ctx.beginPath();
      ctx.arc(0, headY + 28, 5, 0.2, Math.PI - 0.2);
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // --- SIDE PROFILE FACE (Looking forward to -X) ---
      // Rosy cheek at front cheek (-X)
      const gradSide = ctx.createRadialGradient(-10, headY + 26, 1, -10, headY + 26, 8);
      gradSide.addColorStop(0, 'rgba(244, 63, 94, 0.42)');
      gradSide.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = gradSide;
      ctx.beginPath();
      ctx.arc(-10, headY + 26, 8, 0, Math.PI * 2);
      ctx.fill();

      // Large Anime Profile Eye at front (-X)
      const eyeX = -9;
      // Upper thick lash line curved forward
      ctx.beginPath();
      ctx.arc(eyeX, headY + 19, 5.5, Math.PI * 1.1, Math.PI * 1.95);
      ctx.strokeStyle = '#1e1b2e';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Deep shiny pupil looking forward (-X)
      ctx.beginPath();
      ctx.ellipse(eyeX - 1, headY + 22, 4, 5.5, -0.1, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();

      // Dual sparkling catchlights (twinkle) looking forward
      ctx.beginPath();
      ctx.arc(eyeX - 2.5, headY + 20.5, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeX - 0.5, headY + 23.5, 1, 0, Math.PI * 2);
      ctx.fill();

      // Eyebrow
      ctx.beginPath();
      ctx.arc(eyeX - 0.5, headY + 13, 5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.strokeStyle = hair;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cute anime mouth smile at profile edge (-X)
      ctx.beginPath();
      ctx.arc(-14, headY + 28, 3.5, -0.2, Math.PI * 0.55);
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // --- 6. FRONT HAIR & BANGS ---
  if (a.hairStyle !== 'bald') {
    ctx.beginPath();
    ctx.roundRect(-26, headY - 4, 52, 22, [18, 18, 8, 8]);
    ctx.fillStyle = hair;
    ctx.fill();
    ctx.strokeStyle = '#1e1b2e';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Bang tufts
    if (!isBack) {
      if (!isSide) {
        ctx.beginPath();
        ctx.moveTo(-20, headY + 12);
        ctx.quadraticCurveTo(-10, headY + 22, 0, headY + 12);
        ctx.quadraticCurveTo(10, headY + 22, 20, headY + 12);
        ctx.lineTo(24, headY + 4);
        ctx.lineTo(-24, headY + 4);
        ctx.closePath();
        ctx.fillStyle = hair;
        ctx.fill();

        // Glossy shine highlight band
        ctx.beginPath();
        ctx.ellipse(0, headY + 2, 16, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fill();
      } else {
        // Profile bangs sweeping forward over forehead (-X)
        ctx.beginPath();
        ctx.moveTo(-24, headY + 14);
        ctx.quadraticCurveTo(-15, headY + 21, -6, headY + 12);
        ctx.quadraticCurveTo(0, headY + 15, 6, headY + 10);
        ctx.lineTo(10, headY + 4);
        ctx.lineTo(-24, headY + 4);
        ctx.closePath();
        ctx.fillStyle = hair;
        ctx.fill();

        // Glossy shine highlight band towards front
        ctx.beginPath();
        ctx.ellipse(-6, headY + 2, 12, 3, -0.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fill();
      }
    }
  } else {
    // Scalp shine
    ctx.beginPath();
    ctx.ellipse(isSide ? -10 : -6, headY + 6, 7, 3, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();
  }

  // --- 7. FACE ACCESSORIES ---
  if (face && !isBack) {
    if (face.kind === 'glasses') {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = face.color;
      if (isSide) {
        // Single rim at front eye (-X)
        ctx.beginPath();
        ctx.roundRect(-16, headY + 16, 13, 11, 3);
        ctx.stroke();
        // Temple arm stretching back to ear (+X)
        ctx.beginPath();
        ctx.moveTo(-3, headY + 20);
        ctx.lineTo(8, headY + 20);
        ctx.stroke();
        // Glass sheen glare
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(-13, headY + 18, 3, 3);
      } else {
        ctx.beginPath();
        ctx.roundRect(-17, headY + 17, 12, 10, 3);
        ctx.roundRect(5, headY + 17, 12, 10, 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-5, headY + 22);
        ctx.lineTo(5, headY + 22);
        ctx.stroke();
        // Glass sheen glare
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(-14, headY + 19, 3, 3);
        ctx.fillRect(8, headY + 19, 3, 3);
      }
    } else if (face.kind === 'shades') {
      if (isSide) {
        const grad = ctx.createLinearGradient(-18, headY + 15, 0, headY + 27);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.5, '#a855f7');
        grad.addColorStop(1, '#ec4899');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(-18, headY + 15, 17, 13, 4);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Temple arm to ear
        ctx.beginPath();
        ctx.moveTo(-1, headY + 19);
        ctx.lineTo(8, headY + 19);
        ctx.stroke();
      } else {
        // Polarized rainbow gradient shades
        const grad = ctx.createLinearGradient(-18, headY + 16, 18, headY + 28);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.5, '#a855f7');
        grad.addColorStop(1, '#ec4899');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(-18, headY + 16, 36, 12, 4);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (face.kind === 'mustache') {
      ctx.fillStyle = face.color;
      ctx.beginPath();
      if (isSide) {
        ctx.moveTo(-18, headY + 29);
        ctx.quadraticCurveTo(-14, headY + 25, -7, headY + 29);
        ctx.quadraticCurveTo(-5, headY + 33, -11, headY + 33);
        ctx.quadraticCurveTo(-17, headY + 33, -18, headY + 29);
      } else {
        ctx.moveTo(-10, headY + 30);
        ctx.quadraticCurveTo(-5, headY + 26, 0, headY + 29);
        ctx.quadraticCurveTo(5, headY + 26, 10, headY + 30);
        ctx.quadraticCurveTo(14, headY + 27, 12, headY + 33);
        ctx.quadraticCurveTo(0, headY + 33, -12, headY + 33);
        ctx.quadraticCurveTo(-14, headY + 27, -10, headY + 30);
      }
      ctx.closePath();
      ctx.fill();
    } else if (face.kind === 'blush_anime') {
      ctx.fillStyle = '#f43f5e';
      const cheeks = isSide ? [-10] : [-14, 14];
      cheeks.forEach((bx) => {
        ctx.beginPath();
        ctx.arc(bx - 2, headY + 24, 2.5, 0, Math.PI * 2);
        ctx.arc(bx + 2, headY + 24, 2.5, 0, Math.PI * 2);
        ctx.lineTo(bx, headY + 29);
        ctx.closePath();
        ctx.fill();
        // Sparkle
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx - 1, headY + 23, 2, 2);
      });
    } else if (face.kind === 'bandage') {
      ctx.save();
      const bX = isSide ? -15 : 0;
      ctx.translate(bX, headY + 24);
      ctx.rotate(0.2);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(-7, -2.5, 14, 5);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.strokeRect(-7, -2.5, 14, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -1.5, 4, 3);
      ctx.restore();
    } else if (face.kind === 'eyepatch') {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      if (isSide) {
        ctx.roundRect(-15, headY + 16, 11, 12, 3);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-18, headY + 14);
        ctx.lineTo(8, headY + 22);
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-11, headY + 21, 3, 3);
      } else {
        ctx.roundRect(-16, headY + 16, 11, 12, 3);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-24, headY + 14);
        ctx.lineTo(14, headY + 30);
        ctx.stroke();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-12, headY + 21, 3, 3);
      }
    } else if (face.kind === 'mask_kawaii') {
      ctx.beginPath();
      if (isSide) {
        ctx.roundRect(-22, headY + 22, 20, 16, [6, 2, 2, 6]);
        ctx.fillStyle = face.color ?? '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Ear strap
        ctx.beginPath();
        ctx.moveTo(-3, headY + 28);
        ctx.lineTo(8, headY + 23);
        ctx.stroke();
        // Small bear nose on profile
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-16, headY + 29, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-17, headY + 28.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.roundRect(-16, headY + 22, 32, 16, 6);
        ctx.fillStyle = face.color ?? '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, headY + 29, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, headY + 28, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- 8. HATS ---
  if (hat) {
    if (hat.kind === 'crown') {
      // Regal 5-peak golden crown
      ctx.beginPath();
      ctx.moveTo(-16, headY);
      ctx.lineTo(-20, headY - 12);
      ctx.lineTo(-10, headY - 6);
      ctx.lineTo(0, headY - 16);
      ctx.lineTo(10, headY - 6);
      ctx.lineTo(20, headY - 12);
      ctx.lineTo(16, headY);
      ctx.closePath();
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Gemstones
      ctx.fillStyle = '#ef4444'; // ruby
      ctx.fillRect(-2, headY - 6, 4, 4);
      ctx.fillStyle = '#38bdf8'; // sapphire
      ctx.fillRect(-12, headY - 4, 3, 3);
      ctx.fillStyle = '#10b981'; // emerald
      ctx.fillRect(9, headY - 4, 3, 3);
    } else if (hat.kind === 'beanie') {
      ctx.beginPath();
      ctx.arc(0, headY, 22, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = hat.color;
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Pompom
      ctx.beginPath();
      ctx.arc(0, headY - 20, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (hat.kind === 'cap') {
      ctx.beginPath();
      ctx.arc(0, headY, 20, Math.PI, Math.PI * 2);
      ctx.fillStyle = hat.color;
      ctx.fill();
      // Bill
      if (!isBack) {
        ctx.beginPath();
        ctx.roundRect(isSide ? -24 : -14, headY, isSide ? 18 : 28, 5, 2);
        ctx.fillStyle = hat.color;
        ctx.fill();
        if (isSide) {
          // Rear adjustment strap / snapback buckle at back (+X)
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(10, headY - 4, 6, 4);
        }
      } else {
        // Rear adjustment strap
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, headY - 4, 12, 4);
      }
    } else if (hat.kind === 'chef') {
      // Tall billowing chef hat
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-16, headY - 6, 32, 10, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-8, headY - 16, 12, 0, Math.PI * 2);
      ctx.arc(8, headY - 16, 12, 0, Math.PI * 2);
      ctx.arc(0, headY - 22, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (hat.kind === 'cone') {
      // Traffic safety cone
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(-18, headY, 36, 4);
      ctx.beginPath();
      ctx.moveTo(-14, headY);
      ctx.lineTo(0, headY - 28);
      ctx.lineTo(14, headY);
      ctx.closePath();
      ctx.fillStyle = hat.color ?? '#ea580c';
      ctx.fill();
      // Reflective white safety band
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-8, headY - 16, 16, 6);
    } else if (hat.kind === 'cat_ears') {
      // Cute anime neon cat ears
      const earCol = hat.color ?? '#ec4899';
      // Left ear
      ctx.beginPath();
      ctx.moveTo(-20, headY);
      ctx.lineTo(-24, headY - 18);
      ctx.lineTo(-10, headY - 6);
      ctx.closePath();
      ctx.fillStyle = earCol;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Left inner ear fluff
      ctx.beginPath();
      ctx.moveTo(-18, headY - 1);
      ctx.lineTo(-21, headY - 14);
      ctx.lineTo(-12, headY - 5);
      ctx.closePath();
      ctx.fillStyle = '#fce7f3';
      ctx.fill();

      // Right ear
      ctx.beginPath();
      ctx.moveTo(20, headY);
      ctx.lineTo(24, headY - 18);
      ctx.lineTo(10, headY - 6);
      ctx.closePath();
      ctx.fillStyle = earCol;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Right inner ear fluff
      ctx.beginPath();
      ctx.moveTo(18, headY - 1);
      ctx.lineTo(21, headY - 14);
      ctx.lineTo(12, headY - 5);
      ctx.closePath();
      ctx.fillStyle = '#fce7f3';
      ctx.fill();
    } else if (hat.kind === 'straw_summer') {
      // Straw summer boater hat with scarlet ribbon
      ctx.fillStyle = '#f59e0b';
      // Wide circular brim
      ctx.beginPath();
      ctx.ellipse(0, headY + 2, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Flat crown
      ctx.beginPath();
      ctx.roundRect(-16, headY - 14, 32, 14, [6, 6, 0, 0]);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.stroke();
      // Scarlet red ribbon band
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-16, headY - 4, 32, 4);
    } else if (hat.kind === 'witch_cosmic') {
      // Cosmic witch hat with crooked cone & stars
      ctx.fillStyle = '#6d28d9';
      // Wide swooping brim
      ctx.beginPath();
      ctx.ellipse(0, headY + 2, 30, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Tall crooked cone
      ctx.beginPath();
      ctx.moveTo(-16, headY);
      ctx.quadraticCurveTo(-10, headY - 20, 10, headY - 32);
      ctx.lineTo(8, headY - 30);
      ctx.quadraticCurveTo(4, headY - 15, 16, headY);
      ctx.closePath();
      ctx.fillStyle = '#7c3aed';
      ctx.fill();
      // Gold cosmic star buckle
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-4, headY - 5, 8, 5);
      ctx.beginPath();
      ctx.arc(8, headY - 26, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (hat.kind === 'beret_artist') {
      // French artist beret
      ctx.save();
      ctx.translate(2, headY - 4);
      ctx.rotate(-0.15);
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = hat.color ?? '#e11d48';
      ctx.fill();
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Center stalk
      ctx.fillStyle = '#881337';
      ctx.fillRect(-1.5, -13, 3, 5);
      ctx.restore();
    } else if (hat.kind === 'halo_angel') {
      // Radiant golden angel halo hovering above head
      ctx.beginPath();
      ctx.ellipse(0, headY - 18, 22, 6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#fef08a';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // --- 9. ARMS & HANDHELD TROPHY FISH ---
  const held = a.heldFish;
  const armSwing = frame === 0 ? 0 : frame === 1 ? 4 : -4;

  if (held) {
    const cm = held.sizeCm;
    const isGiant = cm > 120;
    const isColossal = cm > 450;

    if (pose === 'trophy' || (pose !== 'holding' && isGiant)) {
      // Two arms raised high hoisting the trophy fish over head
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(-14, torsoY + 8);
      ctx.lineTo(-24, headY + 12);
      ctx.moveTo(14, torsoY + 8);
      ctx.lineTo(24, headY + 12);
      ctx.stroke();

      // Hands
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-24, headY + 12, 5, 0, Math.PI * 2);
      ctx.arc(24, headY + 12, 5, 0, Math.PI * 2);
      ctx.fill();

      if (showFish) {
        // Render the hoisted fish image above character (HD Illustration)
        const fishCanvas = getHDFishCanvas(held.speciesId, isColossal ? 720 : 480, isColossal ? 480 : 320);
        const { baseWidth, baseHeight } = fishRenderDimensions(held.speciesId);
        const aspect = baseHeight / baseWidth;

        // Dimensions based on cm - scales smoothly across entire size spectrum up to colossal whales
        const fishW = Math.max(60, Math.round(48 + Math.pow(cm, 0.72) * 2.2));
        const fishH = Math.round(fishW * aspect);
        const fishX = -Math.round(fishW / 2);
        const fishY = headY - 8 - fishH;

        ctx.save();
        // Drop shadow for hoisted fish
        const rarity = getSpeciesData(held.speciesId)?.rarity;
        ctx.shadowColor =
          rarity === 'sovereign'
            ? 'rgba(103, 232, 249, 0.7)'
            : rarity === 'defiant'
              ? 'rgba(251, 113, 133, 0.6)'
              : 'rgba(56, 189, 248, 0.5)';
        ctx.shadowBlur = 16;
        ctx.drawImage(fishCanvas, fishX, fishY, fishW, fishH);
        ctx.restore();

        // Sparkles around hoisted trophy
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(fishX - 4, fishY + 8, 3, 3);
        ctx.fillRect(fishX + fishW + 2, fishY + 12, 3, 3);
        ctx.fillRect(0, fishY - 6, 4, 4);
      }
    } else if (isSide) {
      // Side Profile Handheld Fish (held horizontally forward towards -X)
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(4, torsoY + 8);
      ctx.lineTo(-12, torsoY + 14);
      ctx.stroke();

      // Hands
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-12, torsoY + 14, 4.5, 0, Math.PI * 2);
      ctx.fill();

      if (showFish) {
        // Fish projecting out front (-X)
        const fishCanvas = getHDFishCanvas(held.speciesId, 480, 320);
        const { baseWidth, baseHeight } = fishRenderDimensions(held.speciesId);
        const aspect = baseHeight / baseWidth;
        const fishW = Math.max(28, Math.round(22 + Math.pow(cm, 0.65) * 1.8));
        const fishH = Math.round(fishW * aspect);
        const fishX = -12 - Math.round(fishW * 0.72);
        const fishY = torsoY + 14 - Math.round(fishH * 0.55);

        // Flip fish horizontally so head faces forward towards -X
        ctx.save();
        ctx.translate(fishX + fishW, fishY);
        ctx.scale(-1, 1);
        ctx.drawImage(fishCanvas, 0, 0, fishW, fishH);
        ctx.restore();
      }
    } else if (isBack) {
      // Back View: Hands at waist gripping fish in front
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(-16, torsoY + 8);
      ctx.lineTo(-20, torsoY + 18);
      ctx.moveTo(16, torsoY + 8);
      ctx.lineTo(20, torsoY + 18);
      ctx.stroke();

      if (showFish) {
        // Show fish sticking out on sides if wide
        const fishCanvas = getHDFishCanvas(held.speciesId, 480, 320);
        const { baseWidth, baseHeight } = fishRenderDimensions(held.speciesId);
        const aspect = baseHeight / baseWidth;
        const fishW = Math.max(28, Math.round(22 + Math.pow(cm, 0.65) * 1.8));
        const fishH = Math.round(fishW * aspect);
        if (fishW > 34) {
          // Draw left side of fish
          ctx.save();
          ctx.beginPath();
          ctx.rect(-fishW / 2, torsoY + 8, fishW / 2 - 14, fishH);
          ctx.clip();
          ctx.drawImage(fishCanvas, -Math.round(fishW / 2), torsoY + 8, fishW, fishH);
          ctx.restore();
          // Draw right side of fish
          ctx.save();
          ctx.beginPath();
          ctx.rect(14, torsoY + 8, fishW / 2 - 14, fishH);
          ctx.clip();
          ctx.drawImage(fishCanvas, -Math.round(fishW / 2), torsoY + 8, fishW, fishH);
          ctx.restore();
        }
      }
    } else {
      // Normal holding in front of chest (Front view)
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(-14, torsoY + 8);
      ctx.lineTo(-6, torsoY + 16);
      ctx.moveTo(14, torsoY + 8);
      ctx.lineTo(6, torsoY + 16);
      ctx.stroke();

      // Hands holding fish
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-6, torsoY + 16, 4.5, 0, Math.PI * 2);
      ctx.arc(6, torsoY + 16, 4.5, 0, Math.PI * 2);
      ctx.fill();

      if (showFish) {
        // Fish in arms
        const fishCanvas = getHDFishCanvas(held.speciesId, 480, 320);
        const { baseWidth, baseHeight } = fishRenderDimensions(held.speciesId);
        const aspect = baseHeight / baseWidth;
        const fishW = Math.max(28, Math.round(22 + Math.pow(cm, 0.65) * 1.8));
        const fishH = Math.round(fishW * aspect);
        ctx.drawImage(fishCanvas, -Math.round(fishW / 2), torsoY + 8, fishW, fishH);
      }
    }
  } else if (pose === 'fishing') {
    // Fishing posture: arms reaching forward ready to hold fishing rod
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = topColor;

    if (isSide) {
      ctx.beginPath();
      ctx.moveTo(2, torsoY + 6);
      ctx.lineTo(-12, torsoY + 14);
      ctx.moveTo(6, torsoY + 8);
      ctx.lineTo(-8, torsoY + 16);
      ctx.stroke();

      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-12, torsoY + 14, 4.5, 0, Math.PI * 2);
      ctx.arc(-8, torsoY + 16, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-12, torsoY + 6);
      ctx.lineTo(-4, torsoY + 18);
      ctx.moveTo(12, torsoY + 6);
      ctx.lineTo(4, torsoY + 18);
      ctx.stroke();

      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-4, torsoY + 18, 4.5, 0, Math.PI * 2);
      ctx.arc(4, torsoY + 18, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (a.rod && !a.heldFish && !a.isFishing) {
    // Character holding fishing rod in hand while standing/walking around town
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    if (isSide) {
      // Rear arm swings slightly with walk cycle
      ctx.strokeStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(4, torsoY + 6);
      ctx.lineTo(4 + armSwing * 1.2, torsoY + 19);
      ctx.stroke();

      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(4 + armSwing * 1.2, torsoY + 21, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Front arm reaches forward to hold the rod
      ctx.strokeStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(0, torsoY + 6);
      ctx.lineTo(-12, torsoY + 16 + bodyBob);
      ctx.stroke();

      // Draw fishing rod held in hand
      drawChibiFishingRod(ctx, a.rod, false, true, headY, torsoY, true);

      // Hand wrapping rod grip
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-12, torsoY + 16 + bodyBob, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (isBack) {
      // Back view
      ctx.strokeStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(-14, torsoY + 6);
      ctx.lineTo(-18 - armSwing * 0.5, torsoY + 20 + armSwing);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-18 - armSwing * 0.5, torsoY + 22 + armSwing, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(14, torsoY + 6);
      ctx.lineTo(16, torsoY + 16 + bodyBob);
      ctx.stroke();

      drawChibiFishingRod(ctx, a.rod, true, false, headY, torsoY, true);

      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(16, torsoY + 16 + bodyBob, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Front view (dir 0)
      ctx.strokeStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(-14, torsoY + 6);
      ctx.lineTo(-18 - armSwing * 0.5, torsoY + 20 + armSwing);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-18 - armSwing * 0.5, torsoY + 22 + armSwing, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(14, torsoY + 6);
      ctx.lineTo(16, torsoY + 16 + bodyBob);
      ctx.stroke();

      drawChibiFishingRod(ctx, a.rod, false, false, headY, torsoY, true);

      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(16, torsoY + 16 + bodyBob, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Idle relaxed arms by sides with walk swing
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = topColor;

    if (isSide) {
      ctx.beginPath();
      ctx.moveTo(0, torsoY + 6);
      ctx.lineTo(armSwing * 1.5, torsoY + 20);
      ctx.stroke();

      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(armSwing * 1.5, torsoY + 22, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-14, torsoY + 6);
      ctx.lineTo(-18 - armSwing * 0.5, torsoY + 20 + armSwing);
      ctx.moveTo(14, torsoY + 6);
      ctx.lineTo(18 + armSwing * 0.5, torsoY + 20 - armSwing);
      ctx.stroke();

      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-18 - armSwing * 0.5, torsoY + 22 + armSwing, 4.5, 0, Math.PI * 2);
      ctx.arc(18 + armSwing * 0.5, torsoY + 22 - armSwing, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

const chibiCache = new Map<string, string>();

/**
 * Returns a high-definition 2D Chibi avatar data URL.
 */
export function chibiAvatarPortrait(a: Appearance, size = 160): string {
  const heldKey = a.heldFish
    ? `${a.heldFish.speciesId}:${a.heldFish.sizeCm}:${fishArtRevision(a.heldFish.speciesId)}`
    : 'none';
  const key = `chibi:${a.skin}:${a.hairStyle}:${a.hairColor}:${a.baseTop}:${a.hat}:${a.top}:${a.face}:${a.rod ?? ''}:${a.sword ?? ''}:${heldKey}:${size}`;
  const hit = chibiCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size * 0.58;
  const scale = size / 160;

  drawChibiAvatar(ctx, a, { cx, cy, scale });
  const url = canvas.toDataURL();
  chibiCache.set(key, url);
  return url;
}

/**
 * Returns a high-definition 2D Chibi full-body avatar data URL.
 */
export function chibiAvatarFull(
  a: Appearance,
  width = 180,
  height = 220,
  options: {
    pose?: 'idle' | 'holding' | 'trophy';
    dir?: 0 | 1 | 2 | 3;
    showFish?: boolean;
    scale?: number;
  } = {},
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const heldCm = a.heldFish && options.showFish !== false ? a.heldFish.sizeCm : 0;
  const baseScale = (width / 180) * 1.25;
  const dimensions = fishRenderDimensions(a.heldFish?.speciesId ?? '');
  const trophy = options.pose === 'trophy' || (options.pose !== 'holding' && heldCm > 120);
  const { scale, cy } = fitChibiWithFish(
    width,
    height,
    heldCm,
    dimensions.baseHeight / dimensions.baseWidth,
    trophy,
    options.scale ?? baseScale,
  );
  const cx = width / 2;

  drawChibiAvatar(ctx, a, {
    cx,
    cy,
    scale,
    pose: options.pose,
    dir: options.dir,
    showFish: options.showFish,
  });

  return canvas.toDataURL();
}

/**
 * Generates an HD Trophy Catch Scene (MapleStory / Dave the Diver Style):
 * Features the crisp Chibi character hoisting / presenting the fish with radiant background burst,
 * water droplets, and high-impact trophy presentation!
 */
export function chibiTrophyScene(
  a: Appearance,
  speciesId: string,
  sizeCm: number,
  width = 360,
  height = 260,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const isGiant = sizeCm > 120;

  // Radiant ocean backdrop
  const grad = ctx.createRadialGradient(width / 2, height * 0.45, 10, width / 2, height * 0.45, width * 0.7);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.5, '#0284c7');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Radiant Sunburst Rays
  ctx.save();
  ctx.translate(width / 2, height * 0.45);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  for (let i = 0; i < 16; i++) {
    ctx.rotate((Math.PI * 2) / 16);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-15, width);
    ctx.lineTo(15, width);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Draw HD Chibi Character
  const appearanceWithFish: Appearance = {
    ...a,
    heldFish: { speciesId, sizeCm },
  };

  const dimensions = fishRenderDimensions(speciesId);
  const { scale: charScale, cy: charY } = fitChibiWithFish(
    width,
    height,
    sizeCm,
    dimensions.baseHeight / dimensions.baseWidth,
    isGiant,
    isGiant ? 1.3 : 1.5,
  );

  drawChibiAvatar(ctx, appearanceWithFish, {
    cx: width / 2,
    cy: charY,
    scale: charScale,
    pose: isGiant ? 'trophy' : 'holding',
  });

  // Sparkles & Celebration Confetti
  const sparkles = [
    { x: 30, y: 40, r: 4, c: '#fef08a' },
    { x: width - 40, y: 50, r: 5, c: '#fde047' },
    { x: 50, y: 120, r: 3, c: '#38bdf8' },
    { x: width - 60, y: 140, r: 3, c: '#ec4899' },
    { x: width / 2 - 70, y: 30, r: 4, c: '#ffffff' },
    { x: width / 2 + 70, y: 25, r: 5, c: '#ffffff' },
  ];
  sparkles.forEach((s) => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = s.c;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  return canvas.toDataURL();
}

const itemIconCache = new Map<string, string>();

/**
 * Renders a crisp 2D Chibi fashion item icon (Hat on mannequin head, Top on tailor bust, Face on stylized face).
 */
export function chibiItemIcon(sprite: string, slot: 'hat' | 'top' | 'face', size = 64): string {
  const key = `chibi-item:${sprite}:${slot}:${size}`;
  const hit = itemIconCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const mannequinSkin = 1;
  const baseTop = 0;

  if (slot === 'hat') {
    // Mannequin head focused on hat
    const dummyAppearance: Appearance = {
      skin: mannequinSkin,
      hairStyle: 'bald',
      hairColor: 0,
      baseTop,
      hat: sprite,
    };
    drawChibiAvatar(ctx, dummyAppearance, {
      cx: size / 2,
      cy: size * 0.82,
      scale: (size / 100) * 1.15,
      showFish: false,
    });
  } else if (slot === 'top') {
    // Mannequin torso focused on outfit
    const dummyAppearance: Appearance = {
      skin: mannequinSkin,
      hairStyle: 'bald',
      hairColor: 0,
      baseTop,
      top: sprite,
    };
    drawChibiAvatar(ctx, dummyAppearance, {
      cx: size / 2,
      cy: size * 0.48,
      scale: (size / 100) * 1.25,
      showFish: false,
    });
  } else {
    // Face accessory
    const dummyAppearance: Appearance = {
      skin: mannequinSkin,
      hairStyle: 'short',
      hairColor: 0,
      baseTop,
      face: sprite,
    };
    drawChibiAvatar(ctx, dummyAppearance, {
      cx: size / 2,
      cy: size * 0.72,
      scale: (size / 100) * 1.2,
      showFish: false,
    });
  }

  const url = canvas.toDataURL();
  itemIconCache.set(key, url);
  return url;
}
