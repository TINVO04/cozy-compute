import type Phaser from 'phaser';

/**
 * Sparkling celestial star helper for wing texture generation.
 */
function drawSparkleStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color = '#ffffff',
  glowColor?: string,
) {
  ctx.save();
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = size * 2.5;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x, y, x + size, y);
  ctx.quadraticCurveTo(x, y, x, y + size);
  ctx.quadraticCurveTo(x, y, x - size, y);
  ctx.quadraticCurveTo(x, y, x, y - size);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.8, size * 0.28), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGlintCross(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color = 'rgba(255, 255, 255, 0.85)',
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - radius, y);
  ctx.lineTo(x + radius, y);
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x, y + radius);
  ctx.stroke();

  const d = radius * 0.5;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - d, y - d);
  ctx.lineTo(x + d, y + d);
  ctx.moveTo(x - d, y + d);
  ctx.lineTo(x + d, y - d);
  ctx.stroke();
  ctx.restore();
}

/** 🪽 Angel Wing (Front View, anchored at root x = 56, y = 30) */
function drawAngelWingFront(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.shadowColor = 'rgba(250, 204, 21, 0.75)';
  ctx.shadowBlur = 12;

  const grad = ctx.createLinearGradient(56, 8, 12, 54);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, '#fffbeb');
  grad.addColorStop(0.7, '#fef08a');
  grad.addColorStop(1, '#facc15');

  // Primary feather arc
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(56, 30);
  ctx.bezierCurveTo(46, 12, 34, 4, 14, 8);
  ctx.quadraticCurveTo(22, 16, 16, 22);
  ctx.quadraticCurveTo(24, 28, 18, 36);
  ctx.quadraticCurveTo(28, 42, 24, 48);
  ctx.quadraticCurveTo(34, 48, 36, 56);
  ctx.quadraticCurveTo(46, 50, 56, 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Secondary feather layer
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(54, 28);
  ctx.bezierCurveTo(46, 16, 38, 12, 24, 14);
  ctx.quadraticCurveTo(32, 22, 26, 28);
  ctx.quadraticCurveTo(34, 34, 30, 40);
  ctx.quadraticCurveTo(40, 42, 42, 48);
  ctx.quadraticCurveTo(48, 44, 54, 32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fluffy covert base roots
  ctx.fillStyle = '#fffdf5';
  ctx.beginPath();
  ctx.arc(52, 29, 5, 0, Math.PI * 2);
  ctx.arc(48, 34, 4, 0, Math.PI * 2);
  ctx.fill();

  // Golden rib quills
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.75)';
  ctx.lineWidth = 1;
  [
    { sx: 52, sy: 28, ex: 16, ey: 10 },
    { sx: 52, sy: 30, ex: 18, ey: 23 },
    { sx: 52, sy: 32, ex: 20, ey: 37 },
    { sx: 52, sy: 34, ex: 26, ey: 49 },
  ].forEach((rib) => {
    ctx.beginPath();
    ctx.moveTo(rib.sx, rib.sy);
    ctx.quadraticCurveTo((rib.sx + rib.ex) / 2 + 2, (rib.sy + rib.ey) / 2 - 2, rib.ex, rib.ey);
    ctx.stroke();
  });

  drawSparkleStar(ctx, 14, 8, 5, '#ffffff', '#facc15');
  drawGlintCross(ctx, 14, 8, 7, 'rgba(254, 240, 138, 0.95)');
  drawSparkleStar(ctx, 18, 36, 3.5, '#fef08a', '#facc15');
  drawSparkleStar(ctx, 36, 56, 3, '#ffffff', '#fde047');
  ctx.restore();
}

/** 🪽 Angel Wing (Profile View, anchored at root x = 8, y = 30) */
function drawAngelWingProfile(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.shadowColor = 'rgba(250, 204, 21, 0.75)';
  ctx.shadowBlur = 12;

  const grad = ctx.createLinearGradient(8, 8, 54, 52);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, '#fffbeb');
  grad.addColorStop(0.7, '#fef08a');
  grad.addColorStop(1, '#facc15');

  ctx.fillStyle = grad;
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(8, 30);
  ctx.bezierCurveTo(14, 16, 26, 6, 48, 4);
  ctx.quadraticCurveTo(40, 14, 52, 22);
  ctx.quadraticCurveTo(42, 30, 48, 38);
  ctx.quadraticCurveTo(36, 44, 40, 52);
  ctx.quadraticCurveTo(24, 46, 8, 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Mid covert layer
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(8, 29);
  ctx.bezierCurveTo(14, 18, 24, 14, 38, 12);
  ctx.quadraticCurveTo(32, 20, 38, 28);
  ctx.quadraticCurveTo(28, 36, 32, 42);
  ctx.quadraticCurveTo(20, 38, 8, 32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Quills
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.75)';
  ctx.lineWidth = 0.9;
  [
    { sx: 10, sy: 29, ex: 46, ey: 6 },
    { sx: 10, sy: 30, ex: 50, ey: 23 },
    { sx: 10, sy: 31, ex: 46, ey: 39 },
    { sx: 10, sy: 32, ex: 38, ey: 51 },
  ].forEach((rib) => {
    ctx.beginPath();
    ctx.moveTo(rib.sx, rib.sy);
    ctx.quadraticCurveTo((rib.sx + rib.ex) / 2, (rib.sy + rib.ey) / 2 - 2, rib.ex, rib.ey);
    ctx.stroke();
  });

  drawSparkleStar(ctx, 48, 4, 4.5, '#ffffff', '#facc15');
  drawGlintCross(ctx, 48, 4, 6, 'rgba(254, 240, 138, 0.95)');
  drawSparkleStar(ctx, 48, 38, 3.2, '#fef08a', '#facc15');
  ctx.restore();
}

/** 🧚 Fairy Wing (Front View, anchored at root x = 56, y = 30) */
function drawFairyWingFront(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.shadowColor = 'rgba(244, 114, 182, 0.65)';
  ctx.shadowBlur = 12;

  // Forewing
  const gradUpper = ctx.createLinearGradient(56, 8, 14, 40);
  gradUpper.addColorStop(0, 'rgba(103, 232, 249, 0.9)');
  gradUpper.addColorStop(0.35, 'rgba(192, 132, 252, 0.85)');
  gradUpper.addColorStop(0.7, 'rgba(244, 114, 182, 0.9)');
  gradUpper.addColorStop(1, 'rgba(254, 240, 138, 0.8)');

  ctx.fillStyle = gradUpper;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(56, 28);
  ctx.bezierCurveTo(46, 12, 34, 4, 16, 8);
  ctx.bezierCurveTo(14, 20, 20, 32, 34, 38);
  ctx.quadraticCurveTo(46, 40, 56, 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hindwing
  const gradLower = ctx.createLinearGradient(54, 32, 24, 56);
  gradLower.addColorStop(0, 'rgba(244, 114, 182, 0.88)');
  gradLower.addColorStop(0.5, 'rgba(192, 132, 252, 0.85)');
  gradLower.addColorStop(1, 'rgba(103, 232, 249, 0.88)');
  ctx.fillStyle = gradLower;
  ctx.beginPath();
  ctx.moveTo(56, 32);
  ctx.quadraticCurveTo(38, 36, 26, 48);
  ctx.quadraticCurveTo(34, 56, 42, 50);
  ctx.quadraticCurveTo(50, 44, 56, 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Veins
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(52, 26);
  ctx.quadraticCurveTo(36, 16, 20, 14);
  ctx.moveTo(44, 20);
  ctx.quadraticCurveTo(32, 24, 22, 24);
  ctx.moveTo(54, 34);
  ctx.quadraticCurveTo(42, 42, 32, 46);
  ctx.stroke();

  drawSparkleStar(ctx, 16, 8, 4.5, '#ffffff', '#67e8f9');
  drawSparkleStar(ctx, 26, 48, 3, '#c084fc', '#67e8f9');
  ctx.restore();
}

/** 🧚 Fairy Wing (Profile View, anchored at root x = 8, y = 30) */
function drawFairyWingProfile(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.shadowColor = 'rgba(244, 114, 182, 0.65)';
  ctx.shadowBlur = 12;

  const gradUpper = ctx.createLinearGradient(8, 8, 52, 42);
  gradUpper.addColorStop(0, 'rgba(103, 232, 249, 0.9)');
  gradUpper.addColorStop(0.35, 'rgba(192, 132, 252, 0.85)');
  gradUpper.addColorStop(0.7, 'rgba(244, 114, 182, 0.9)');
  gradUpper.addColorStop(1, 'rgba(254, 240, 138, 0.8)');

  ctx.fillStyle = gradUpper;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(8, 30);
  ctx.bezierCurveTo(14, 16, 26, 6, 48, 6);
  ctx.bezierCurveTo(50, 18, 44, 28, 32, 34);
  ctx.quadraticCurveTo(20, 36, 8, 31);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const gradLower = ctx.createLinearGradient(8, 32, 40, 54);
  gradLower.addColorStop(0, 'rgba(244, 114, 182, 0.88)');
  gradLower.addColorStop(0.5, 'rgba(192, 132, 252, 0.85)');
  gradLower.addColorStop(1, 'rgba(103, 232, 249, 0.88)');
  ctx.fillStyle = gradLower;
  ctx.beginPath();
  ctx.moveTo(8, 32);
  ctx.quadraticCurveTo(24, 34, 38, 44);
  ctx.quadraticCurveTo(30, 52, 22, 48);
  ctx.quadraticCurveTo(14, 42, 8, 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawSparkleStar(ctx, 48, 6, 4, '#ffffff', '#67e8f9');
  drawSparkleStar(ctx, 38, 44, 3, '#c084fc', '#f472b6');
  ctx.restore();
}

/** ⚡ Cyber Wing (Front View, anchored at root x = 56, y = 30) */
function drawCyberWingFront(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 14;

  // Carbon pylon
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(56, 26);
  ctx.lineTo(46, 22);
  ctx.lineTo(42, 32);
  ctx.lineTo(50, 42);
  ctx.lineTo(56, 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f97316';
  ctx.fillRect(45, 28, 4, 2);
  ctx.fillStyle = '#22d3ee';
  ctx.beginPath();
  ctx.arc(45, 34, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Laser blade 1
  const blade1 = ctx.createLinearGradient(46, 24, 12, 10);
  blade1.addColorStop(0, '#0284c7');
  blade1.addColorStop(0.3, '#06b6d4');
  blade1.addColorStop(0.7, '#67e8f9');
  blade1.addColorStop(1, '#ffffff');
  ctx.fillStyle = blade1;
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(46, 24);
  ctx.lineTo(12, 8);
  ctx.lineTo(22, 20);
  ctx.lineTo(44, 28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Laser blade 2
  const blade2 = ctx.createLinearGradient(44, 29, 14, 32);
  blade2.addColorStop(0, '#0891b2');
  blade2.addColorStop(0.4, '#06b6d4');
  blade2.addColorStop(0.8, '#a5f3fc');
  blade2.addColorStop(1, '#ffffff');
  ctx.fillStyle = blade2;
  ctx.beginPath();
  ctx.moveTo(44, 29);
  ctx.lineTo(14, 30);
  ctx.lineTo(26, 38);
  ctx.lineTo(46, 35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Laser blade 3
  const blade3 = ctx.createLinearGradient(48, 36, 24, 52);
  blade3.addColorStop(0, '#0e7490');
  blade3.addColorStop(0.5, '#22d3ee');
  blade3.addColorStop(1, '#f97316');
  ctx.fillStyle = blade3;
  ctx.beginPath();
  ctx.moveTo(48, 36);
  ctx.lineTo(24, 50);
  ctx.lineTo(34, 52);
  ctx.lineTo(52, 38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawSparkleStar(ctx, 12, 8, 4.5, '#ffffff', '#22d3ee');
  drawSparkleStar(ctx, 14, 30, 4, '#a5f3fc', '#06b6d4');
  drawSparkleStar(ctx, 24, 50, 3.5, '#f97316', '#fb923c');
  ctx.restore();
}

/** ⚡ Cyber Wing (Profile View, anchored at root x = 8, y = 30) */
function drawCyberWingProfile(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 14;

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(8, 26);
  ctx.lineTo(14, 22);
  ctx.lineTo(18, 30);
  ctx.lineTo(14, 40);
  ctx.lineTo(8, 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f97316';
  ctx.fillRect(11, 28, 4, 2);

  // Blade 1
  const b1 = ctx.createLinearGradient(16, 24, 52, 8);
  b1.addColorStop(0, '#0284c7');
  b1.addColorStop(0.3, '#06b6d4');
  b1.addColorStop(0.7, '#67e8f9');
  b1.addColorStop(1, '#ffffff');
  ctx.fillStyle = b1;
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(16, 24);
  ctx.lineTo(52, 8);
  ctx.lineTo(44, 18);
  ctx.lineTo(18, 28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Blade 2
  const b2 = ctx.createLinearGradient(18, 30, 54, 28);
  b2.addColorStop(0, '#0891b2');
  b2.addColorStop(0.4, '#06b6d4');
  b2.addColorStop(0.8, '#a5f3fc');
  b2.addColorStop(1, '#ffffff');
  ctx.fillStyle = b2;
  ctx.beginPath();
  ctx.moveTo(18, 30);
  ctx.lineTo(54, 28);
  ctx.lineTo(44, 36);
  ctx.lineTo(18, 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Blade 3
  const b3 = ctx.createLinearGradient(14, 36, 44, 48);
  b3.addColorStop(0, '#0e7490');
  b3.addColorStop(0.5, '#22d3ee');
  b3.addColorStop(1, '#f97316');
  ctx.fillStyle = b3;
  ctx.beginPath();
  ctx.moveTo(14, 36);
  ctx.lineTo(44, 48);
  ctx.lineTo(36, 50);
  ctx.lineTo(12, 38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawSparkleStar(ctx, 52, 8, 4, '#ffffff', '#22d3ee');
  drawSparkleStar(ctx, 54, 28, 3.5, '#a5f3fc', '#06b6d4');
  ctx.restore();
}

/** 🦇 Demon Wing (Front View, anchored at root x = 56, y = 30) */
function drawDemonWingFront(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.shadowColor = '#9333ea';
  ctx.shadowBlur = 14;

  const grad = ctx.createLinearGradient(56, 12, 14, 52);
  grad.addColorStop(0, '#180828');
  grad.addColorStop(0.4, '#3b0764');
  grad.addColorStop(0.8, '#581c87');
  grad.addColorStop(1, '#831843');

  ctx.fillStyle = grad;
  ctx.strokeStyle = '#701a75';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(56, 30);
  ctx.lineTo(36, 12);
  ctx.lineTo(14, 18);
  ctx.quadraticCurveTo(24, 28, 12, 36);
  ctx.quadraticCurveTo(26, 44, 22, 54);
  ctx.quadraticCurveTo(40, 48, 56, 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hellfire veins
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(36, 12);
  ctx.quadraticCurveTo(26, 26, 20, 32);
  ctx.moveTo(36, 12);
  ctx.quadraticCurveTo(30, 36, 28, 48);
  ctx.stroke();

  // Obsidian bone arm
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(56, 30);
  ctx.lineTo(36, 12);
  ctx.stroke();

  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(36, 12);
  ctx.lineTo(14, 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(36, 12);
  ctx.lineTo(12, 36);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(36, 12);
  ctx.lineTo(22, 54);
  ctx.stroke();

  // Claws
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(36, 12);
  ctx.lineTo(34, 6);
  ctx.lineTo(38, 10);
  ctx.closePath();
  ctx.fill();

  [
    { x: 14, y: 18 },
    { x: 12, y: 36 },
    { x: 22, y: 54 },
  ].forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  drawSparkleStar(ctx, 34, 6, 4.5, '#c084fc', '#9333ea');
  drawSparkleStar(ctx, 12, 36, 3.5, '#f87171', '#dc2626');
  ctx.restore();
}

/** 🦇 Demon Wing (Profile View, anchored at root x = 8, y = 30) */
function drawDemonWingProfile(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.shadowColor = '#9333ea';
  ctx.shadowBlur = 14;

  const grad = ctx.createLinearGradient(8, 12, 52, 50);
  grad.addColorStop(0, '#180828');
  grad.addColorStop(0.4, '#3b0764');
  grad.addColorStop(0.8, '#581c87');
  grad.addColorStop(1, '#831843');

  ctx.fillStyle = grad;
  ctx.strokeStyle = '#701a75';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(8, 30);
  ctx.lineTo(22, 12);
  ctx.lineTo(50, 16);
  ctx.quadraticCurveTo(40, 26, 52, 34);
  ctx.quadraticCurveTo(38, 42, 42, 52);
  ctx.quadraticCurveTo(24, 44, 8, 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bone
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(8, 30);
  ctx.lineTo(22, 12);
  ctx.stroke();

  ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.moveTo(22, 12);
  ctx.lineTo(50, 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22, 12);
  ctx.lineTo(52, 34);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22, 12);
  ctx.lineTo(42, 52);
  ctx.stroke();

  // Claw
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(22, 12);
  ctx.lineTo(20, 7);
  ctx.lineTo(24, 10);
  ctx.closePath();
  ctx.fill();

  drawSparkleStar(ctx, 20, 7, 4, '#c084fc', '#9333ea');
  drawSparkleStar(ctx, 52, 34, 3, '#f87171', '#dc2626');
  ctx.restore();
}

/**
 * Registers wing canvas textures into Phaser texture manager.
 */
export function ensureWingTexture(scene: Phaser.Scene, kind: string, view: 'front' | 'profile'): string {
  const key = `wing_tx:${kind}:${view}`;
  if (scene.textures.exists(key)) return key;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  if (kind === 'wings_angel') {
    if (view === 'front') drawAngelWingFront(ctx);
    else drawAngelWingProfile(ctx);
  } else if (kind === 'wings_fairy') {
    if (view === 'front') drawFairyWingFront(ctx);
    else drawFairyWingProfile(ctx);
  } else if (kind === 'wings_cyber') {
    if (view === 'front') drawCyberWingFront(ctx);
    else drawCyberWingProfile(ctx);
  } else if (kind === 'wings_demon') {
    if (view === 'front') drawDemonWingFront(ctx);
    else drawDemonWingProfile(ctx);
  }

  const tex = scene.textures.addCanvas(key, canvas);
  tex?.setFilter(1);
  return key;
}

export interface WingFlapConfig {
  duration: number;
  maxAngle: number;
  scaleXCompress: number;
  scaleYStretch: number;
  ease: string;
}

export const WING_FLAP_CONFIG: Record<string, WingFlapConfig> = {
  wings_angel: {
    duration: 680,
    maxAngle: 22,
    scaleXCompress: 0.86,
    scaleYStretch: 1.14,
    ease: 'Sine.easeInOut',
  },
  wings_fairy: {
    duration: 280,
    maxAngle: 16,
    scaleXCompress: 0.72,
    scaleYStretch: 1.1,
    ease: 'Sine.easeInOut',
  },
  wings_cyber: {
    duration: 450,
    maxAngle: 18,
    scaleXCompress: 0.9,
    scaleYStretch: 1.12,
    ease: 'Cubic.easeInOut',
  },
  wings_demon: {
    duration: 850,
    maxAngle: 26,
    scaleXCompress: 0.82,
    scaleYStretch: 1.18,
    ease: 'Sine.easeInOut',
  },
};
