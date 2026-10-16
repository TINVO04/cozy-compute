import { PixelGrid } from './pixel';
import type Phaser from 'phaser';

export type Kind = 'slime' | 'bat' | 'scorpion' | 'serpent' | 'golem' | 'colossus';

/**
 * 🎨 16-Bit Neo-Retro Pixel Art Studio Creature Generator
 * Crafts 8-frame animated spritesheets for the 6 Cave monster archetypes:
 * 1. slime: Crystal Slime (Jelly core, floating crystal nucleus, leaf crown)
 * 2. bat: Amethyst Shadow Bat (Translucent purple membrane, amber eyes, flapping cycle)
 * 3. scorpion: Quartz Crystal Scorpion (Segmented gold chitin, snapping claws, glowing stinger)
 * 4. serpent: Jade Serpent (Sinuous coiling scales, flared cobra hood, glowing slit eyes)
 * 5. golem: Obsidian Rock Golem (Basalt stone blocks, cyan crystal shoulder spires, rune chest)
 * 6. colossus: Ancient Void Colossus (Grand Titan Boss with floating crystal fists and void reactor core)
 */
export function caveCreatureFrame(kind: Kind, frame: number): HTMLCanvasElement {
  const g = new PixelGrid(48, 56);
  const phase = (frame * Math.PI) / 4;

  if (kind === 'slime') {
    // =========================================================================
    // 1. CRYSTAL SLIME (8-Frame Bouncing Squash & Stretch)
    // =========================================================================
    const lift = [0, 0, 1, 3, 4, 3, 1, 0][frame]!;
    const rx = [16, 17, 16, 14, 13, 14, 15, 16][frame]!;
    const ry = [11, 10, 12, 14, 15, 14, 12, 11][frame]!;
    const y = 40 - lift;

    // Outer crystal jelly mantle (5-tier emerald-teal gradient)
    g.ellipse(24, y, rx, ry, '#0d2825'); // Deep silhouette outline
    g.ellipse(24, y - 1, rx - 1, ry - 1, '#1b5448');
    g.ellipse(22, y - 3, rx - 3, ry - 3, '#2d7d65');
    g.ellipse(20, y - 6, rx - 6, ry - 6, '#4ade80'); // Bioluminescent core
    g.ellipse(19, y - 8, rx - 8, 3, '#86efac'); // Specular rim

    // Floating crystal gemstone nucleus inside jelly
    g.rect(22, y - 2, 4, 6, '#042f2e');
    g.rect(23, y - 3, 2, 8, '#14b8a6');
    g.set(24, y - 1, '#ccfbf1'); // Glistening sparkle

    // Expressive glossy chibi eyes
    for (const x of [19, 28]) {
      g.rect(x, y - 2, 3, 5, '#022c22');
      g.set(x + 1, y - 3, '#f0fdf4'); // Twinkle
    }
    // Rosy cheek glow
    g.rect(16, y + 2, 2, 1, '#22c55e');
    g.rect(30, y + 2, 2, 1, '#22c55e');

    // Crystal leaf sprout on head bobbing with spring physics
    const crownSway = Math.round(Math.sin(phase) * 1.5);
    g.line(24, y - ry + 2, 24 + crownSway, y - ry - 4, '#15803d');
    g.ellipse(21 + crownSway, y - ry - 3, 4, 2, '#4ade80');
    g.ellipse(27 + crownSway, y - ry - 5, 4, 2, '#86efac');
  } else if (kind === 'bat') {
    // =========================================================================
    // 2. AMETHYST SHADOW BAT (8-Frame Flapping Flight Cycle)
    // =========================================================================
    const wing = [-8, -5, 0, 7, 10, 6, 0, -6][frame]!;
    const y = 29 + Math.round(Math.sin(phase) * 2);

    // Dual translucent amethyst wings
    for (const side of [-1, 1]) {
      const root = 24 + side * 5;
      const tip = 24 + side * 22;
      for (let i = 0; i < 19; i++) {
        const x = root + side * i;
        const top = y - 4 + (wing * i) / 19;
        const bottom = y + 9 - Math.abs(Math.sin(i / 6)) * 6;
        for (let yy = Math.min(top, bottom); yy <= Math.max(top, bottom); yy++) g.set(x, yy, '#2e1065');
        g.line(x, top + 1, x, Math.max(top + 1, bottom - 1), '#6b21a8');
      }
      g.line(root, y - 4, tip, y - 4 + wing, '#c084fc');
      for (let i = 1; i <= 3; i++)
        g.line(root, y - 3, root + side * (i * 6), y + 9 - Math.abs(Math.sin(i)) * 6, '#3b0764');
      g.line(tip, y - 4 + wing, tip - side * 2, y - 7 + wing, '#f3e8ff');
    }

    // Fuzzy bat torso & pointed ears
    g.ellipse(24, y + 1, 8, 11, '#1e1b4b');
    g.ellipse(24, y, 7, 9, '#581c87');
    g.ellipse(23, y + 4, 5, 5, '#9333ea');
    for (const x of [17, 28]) {
      g.rect(x, y - 13, 4, 10, '#312e81');
      g.rect(x + 1, y - 11, 2, 7, '#f43f5e'); // Pink inner ear
    }

    // Glowing ruby eyes & white fangs
    for (const x of [19, 27]) {
      g.rect(x, y - 1, 3, 3, '#0f172a');
      g.set(x, y - 1, '#f43f5e');
      g.set(x + 1, y - 1, '#ffffff'); // Glint
    }
    g.rect(22, y + 5, 5, 2, '#4c1d95');
    g.set(22, y + 6, '#ffffff'); // Left fang
    g.set(26, y + 6, '#ffffff'); // Right fang
    g.rect(19, y + 11, 3, 2, '#a855f7');
    g.rect(27, y + 11, 3, 2, '#a855f7');
  } else if (kind === 'scorpion') {
    // =========================================================================
    // 3. QUARTZ CRYSTAL SCORPION (Articulated Legs, Snapping Claws & Stinger)
    // =========================================================================
    const legPhase = Math.round(Math.sin(phase) * 2);
    const snap = frame % 2 === 0 ? 1 : 0;
    const bodyY = 36;

    // Articulated amber walking legs (4 on each side)
    for (const side of [-1, 1]) {
      for (let l = 0; l < 4; l++) {
        const lx = 24 + side * (7 + l * 2);
        const ly = bodyY - 2 + l * 3 + (l % 2 === 0 ? legPhase : -legPhase);
        g.line(lx, ly, lx + side * 6, ly - 3, '#78350f');
        g.line(lx + side * 6, ly - 3, lx + side * 9, ly + 4, '#b45309');
        g.set(lx + side * 9, ly + 4, '#f59e0b'); // Foot tip
      }
    }

    // Segmented Quartz Chitin Carapace (Amber & Gold)
    g.ellipse(24, bodyY, 11, 8, '#27170a');
    g.ellipse(24, bodyY - 1, 10, 7, '#78350f');
    g.ellipse(23, bodyY - 2, 8, 5, '#b45309');
    g.ellipse(22, bodyY - 4, 6, 3, '#f59e0b');
    g.line(17, bodyY - 1, 31, bodyY - 1, '#451a03'); // Segment ridge
    g.line(19, bodyY - 3, 29, bodyY - 3, '#451a03');

    // Dual front snapping pincers
    for (const side of [-1, 1]) {
      const armX = 24 + side * 8;
      g.line(armX, bodyY - 4, armX + side * 6, bodyY - 10, '#b45309');
      // Pincer claw
      g.rect(armX + side * 6 - 2, bodyY - 14, 5, 5, '#78350f');
      g.rect(armX + side * 6 - 1, bodyY - 13, 3, 3, '#f59e0b');
      // Inner snapping tooth
      g.set(armX + side * (6 + snap * 2), bodyY - 12, '#fef08a');
    }

    // Multiple glowing amber eyes
    g.set(22, bodyY - 6, '#fef08a');
    g.set(26, bodyY - 6, '#fef08a');
    g.set(21, bodyY - 5, '#f59e0b');
    g.set(27, bodyY - 5, '#f59e0b');

    // Arched Crystal Stinger Tail (Rising up and curving over)
    const tailSway = Math.round(Math.sin(phase * 1.5) * 2);
    g.rect(22, bodyY + 5, 4, 4, '#78350f');
    g.rect(21 + tailSway, bodyY + 2, 4, 4, '#b45309');
    g.rect(20 + tailSway, bodyY - 3, 4, 4, '#d97706');
    g.rect(19 + tailSway, bodyY - 8, 4, 4, '#f59e0b');
    g.rect(20 + tailSway, bodyY - 13, 5, 5, '#d97706');
    g.rect(22 + tailSway, bodyY - 17, 5, 5, '#b45309');
    // Glowing crystal venom barb (Red/Amber)
    g.line(26 + tailSway, bodyY - 16, 30 + tailSway, bodyY - 12, '#ef4444');
    g.line(27 + tailSway, bodyY - 15, 31 + tailSway, bodyY - 13, '#fef08a');
    g.set(31 + tailSway, bodyY - 12, '#ffffff'); // Venom glint
  } else if (kind === 'serpent') {
    // =========================================================================
    // 4. JADE SERPENT (Sinuous Wave Coils, Cobra Hood & Fangs)
    // =========================================================================
    const wave1 = Math.round(Math.sin(phase) * 3);
    const wave2 = Math.round(Math.sin(phase + 1) * 3);
    const wave3 = Math.round(Math.sin(phase + 2) * 3);

    // Coiled lower tail (Resting base)
    g.ellipse(24 + wave3, 44, 16, 5, '#022c22');
    g.ellipse(24 + wave3, 43, 14, 4, '#064e3b');
    g.ellipse(24 + wave3, 42, 11, 3, '#059669');

    // Rising serpentine body column (Wave segments)
    g.ellipse(23 + wave2, 35, 10, 6, '#064e3b');
    g.ellipse(23 + wave2, 34, 8, 5, '#10b981');
    g.ellipse(24 + wave1, 26, 9, 6, '#064e3b');
    g.ellipse(24 + wave1, 25, 7, 5, '#34d399');

    // Flared Cobra-style Jade Crystal Hood
    const headX = 24 + wave1;
    const headY = 16;
    g.ellipse(headX, headY, 13, 8, '#022c22'); // Hood outline
    g.ellipse(headX, headY - 1, 12, 7, '#047857');
    g.ellipse(headX, headY - 2, 9, 5, '#10b981');

    // Cyan glowing runic chevron on hood
    g.line(headX - 6, headY - 2, headX, headY + 3, '#67e8f9');
    g.line(headX + 6, headY - 2, headX, headY + 3, '#67e8f9');
    g.set(headX, headY - 1, '#cffafe');

    // Head crest & snout
    g.ellipse(headX, headY - 5, 8, 5, '#064e3b');
    g.ellipse(headX, headY - 6, 7, 4, '#34d399');

    // Glowing golden serpent slit eyes
    g.rect(headX - 4, headY - 7, 2, 3, '#022c22');
    g.set(headX - 3, headY - 6, '#facc15');
    g.rect(headX + 3, headY - 7, 2, 3, '#022c22');
    g.set(headX + 4, headY - 6, '#facc15');

    // Menacing dripping fangs
    g.set(headX - 2, headY - 2, '#ffffff');
    g.set(headX + 2, headY - 2, '#ffffff');
    g.set(headX, headY - 1, '#f43f5e'); // Forked tongue tip
    g.set(headX, headY, '#f43f5e');
  } else if (kind === 'golem') {
    // =========================================================================
    // 5. OBSIDIAN ROCK GOLEM (Basalt Boulders, Cyan Shoulder Crystals)
    // =========================================================================
    const step = Math.round(Math.sin(phase) * 2);
    const stone = (x: number, y: number, w: number, h: number) => {
      g.rect(x, y, w, h, '#090d16');
      g.rect(x + 1, y + 1, w - 2, h - 2, '#334155');
      g.rect(x + 2, y + 1, w - 4, 3, '#64748b');
      g.rect(x + w - 4, y + 4, 3, h - 5, '#1e293b');
      g.line(x + 2, y + h - 3, x + w - 5, y + h - 3, '#475569');
    };

    // Stomping feet
    stone(12, 41 + step, 10, 10);
    stone(27, 41 - step, 10, 10);

    // Massive torso block
    stone(11, 18, 27, 26);
    // Heavy boulder fists
    stone(4, 23 - step, 10, 18);
    stone(35, 23 + step, 10, 18);
    // Head stone
    stone(15, 8, 20, 16);

    // Cyan glowing visor eyes
    g.rect(17, 16, 16, 5, '#0f172a');
    g.rect(18, 17, 4, 2, '#22d3ee');
    g.rect(27, 17, 4, 2, '#22d3ee');
    g.set(19, 17, '#ffffff');
    g.set(28, 17, '#ffffff');

    // Ancient rune chest core (Glowing Turquoise)
    g.ellipse(25, 32, 6, 7, '#0f172a');
    g.ellipse(25, 31, 4, 5, '#0891b2');
    g.ellipse(24, 30, 2, 3, '#67e8f9');
    g.set(24, 30, '#ffffff');

    // Sharp cyan crystal spires growing from shoulders
    for (const [x, y] of [
      [11, 16],
      [34, 12],
      [23, 7],
    ]) {
      g.line(x!, y!, x! + 2, y! - 8, '#06b6d4');
      g.line(x! + 2, y! - 8, x! + 4, y!, '#a5f3fc');
    }
    // Mossy weathering patches on stone
    g.rect(12, 23, 4, 2, '#15803d');
    g.rect(28, 9, 5, 2, '#22c55e');
    g.rect(5, 26 - step, 4, 2, '#16a34a');
  } else {
    // =========================================================================
    // 6. ANCIENT VOID COLOSSUS (Grand Tier-18 Titan Boss with Floating Fists)
    // =========================================================================
    const hover = Math.round(Math.sin(phase) * 2.5);
    const fistHoverL = Math.round(Math.sin(phase + 1) * 3);
    const fistHoverR = Math.round(Math.sin(phase - 1) * 3);

    // Deep void ground shadow (Expands and contracts)
    g.ellipse(24, 50, 18 + hover, 6, '#0f0728');

    // Massive Void-Infused Obsidian Torso
    const torsoY = 22 + hover;
    g.rect(11, torsoY, 26, 25, '#090514'); // Dark silhouette
    g.rect(12, torsoY + 1, 24, 23, '#1e1b4b');
    g.rect(14, torsoY + 2, 20, 20, '#312e81');

    // Massive Void Crystal Chest Reactor (Throbbing with power)
    const corePulse = frame % 4 === 0 ? 1 : 0;
    g.ellipse(24, torsoY + 12, 7 + corePulse, 8 + corePulse, '#020617');
    g.ellipse(24, torsoY + 11, 6, 7, '#4c1d95');
    g.ellipse(24, torsoY + 10, 4, 5, '#7c3aed');
    g.ellipse(24, torsoY + 9, 2, 3, '#c084fc');
    g.set(24, torsoY + 8, '#ffffff'); // Blinding reactor core

    // Broad horned head & Void Crown
    const headY = 9 + hover;
    g.rect(14, headY, 20, 16, '#090514');
    g.rect(15, headY + 1, 18, 14, '#1e1b4b');
    g.rect(16, headY + 2, 16, 11, '#4338ca');

    // Colossal Horned Void Crystal Spikes
    g.line(14, headY + 4, 8, headY - 8, '#6366f1');
    g.line(8, headY - 8, 6, headY - 14, '#a5b4fc');
    g.line(33, headY + 4, 39, headY - 8, '#6366f1');
    g.line(39, headY - 8, 41, headY - 14, '#a5b4fc');

    // Menacing glowing dual-slit Visor
    g.rect(17, headY + 7, 14, 4, '#020617');
    g.rect(18, headY + 8, 4, 2, '#06b6d4');
    g.set(19, headY + 8, '#ffffff');
    g.rect(25, headY + 8, 4, 2, '#06b6d4');
    g.set(26, headY + 8, '#ffffff');

    // TWO GIANT DETACHED FLOATING FISTS HOVERING AT SIDES
    // Left floating gauntlet
    const fistLY = torsoY + 4 + fistHoverL;
    g.rect(2, fistLY, 9, 14, '#090514');
    g.rect(3, fistLY + 1, 7, 12, '#312e81');
    g.rect(4, fistLY + 2, 5, 4, '#6366f1');
    g.rect(3, fistLY + 7, 7, 5, '#4338ca');
    // Electric arc to torso
    g.set(9, fistLY + 5, '#38bdf8');
    g.set(11, fistLY + 7, '#c084fc');

    // Right floating gauntlet
    const fistRY = torsoY + 4 + fistHoverR;
    g.rect(37, fistRY, 9, 14, '#090514');
    g.rect(38, fistRY + 1, 7, 12, '#312e81');
    g.rect(39, fistRY + 2, 5, 4, '#6366f1');
    g.rect(38, fistRY + 7, 7, 5, '#4338ca');
    // Electric arc to torso
    g.set(37, fistRY + 5, '#38bdf8');
    g.set(35, fistRY + 7, '#c084fc');
  }

  return g.toCanvas(2);
}

export function ensureCaveCreatures(scene: Phaser.Scene) {
  const kinds: Kind[] = ['slime', 'bat', 'scorpion', 'serpent', 'golem', 'colossus'];
  for (const kind of kinds) {
    const key = 'cave:creature:' + kind;
    if (scene.textures.exists(key)) continue;
    const sheet = document.createElement('canvas');
    sheet.width = 96 * 8;
    sheet.height = 112;
    const c = sheet.getContext('2d')!;
    for (let i = 0; i < 8; i++) c.drawImage(caveCreatureFrame(kind, i), i * 96, 0);
    const texture = scene.textures.addCanvas(key, sheet)!;
    for (let i = 0; i < 8; i++) texture.add(i, 0, i * 96, 0, 96, 112);
  }
}
