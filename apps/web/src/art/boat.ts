import { INK, PixelGrid } from './pixel';

export const BOAT_W = 36;
export const BOAT_H = 32;

/**
 * 2026 Masterpiece Pixel Art Boats:
 * Procedural rendering for all 4 expedition boats in 4 directions (down, left, right, up).
 * - boat_coracle: Bamboo basket boat with woven texture, pitch rim, bamboo oar.
 * - boat_sampan: Traditional wooden three-plank sampan with thatched leaf canopy & pennant.
 * - boat_cutter: High-speed fiberglass speedboat with aerodynamic hull & twin outboards.
 * - boat_trawler: Armored deep-sea trawler with brass trim, wheelhouse cabin & radar mast.
 */
export function drawBoat(boatId: string, dir: 0 | 1 | 2 | 3, frame = 0): PixelGrid {
  if (dir === 2) {
    // Starboard (right) is a mirror of Portside (left)
    return drawBoat(boatId, 1, frame).mirror();
  }

  const g = new PixelGrid(BOAT_W, BOAT_H);
  const side = dir === 1;
  const up = dir === 3;
  const bob = frame % 2 === 1 ? 1 : 0;

  // Normalized boat identifier
  const id = boatId.startsWith('boat:') ? boatId.split(':')[1] : boatId;

  // Water ripples & contact shadows beneath boat
  g.rect(4, 25 + bob, 28, 4, 'rgba(15, 23, 42, 0.45)');
  g.rect(6, 26 + bob, 24, 2, 'rgba(30, 58, 138, 0.35)');

  switch (id) {
    case 'boat_coracle':
    default: {
      // --- THUYỀN THÚNG NAN TRE (Bamboo Coracle) ---
      const bambooLight = '#eab308';
      const bambooMid = '#ca8a04';
      const bambooDark = '#854d0e';
      const tarRim = '#1c1917';
      const oarWood = '#78350f';

      if (side) {
        // Profile view of circular basket boat
        g.rect(8, 15 + bob, 20, 10, bambooMid);
        g.rect(10, 14 + bob, 16, 2, tarRim);
        // Woven cross-weave pattern
        for (let x = 9; x <= 26; x += 3) {
          g.rect(x, 16 + bob, 1, 8, bambooDark);
        }
        for (let y = 17; y <= 23; y += 3) {
          g.rect(9, y + bob, 18, 1, bambooLight);
        }
        // Bottom curve
        g.rect(11, 25 + bob, 14, 2, bambooDark);
        g.rect(13, 26 + bob, 10, 1, tarRim);

        // Wooden paddle leaning at the side
        g.set(6, 12 + bob, oarWood);
        g.set(7, 14 + bob, oarWood);
        g.set(8, 16 + bob, oarWood);
        g.rect(5, 10 + bob, 2, 4, bambooLight);
      } else if (up) {
        // Stern / Back view
        g.rect(7, 14 + bob, 22, 11, bambooMid);
        g.rect(8, 13 + bob, 20, 2, tarRim);
        // Horizontal weave bands
        g.rect(9, 16 + bob, 18, 2, bambooLight);
        g.rect(8, 19 + bob, 20, 2, bambooDark);
        g.rect(10, 22 + bob, 16, 2, bambooLight);
        g.rect(11, 24 + bob, 14, 2, tarRim);
      } else {
        // Down / Front view
        g.rect(7, 13 + bob, 22, 12, bambooMid);
        g.rect(8, 12 + bob, 20, 2, tarRim);
        // Interior floor visible
        g.rect(10, 14 + bob, 16, 4, '#a16207');
        // Outer weave highlights
        g.rect(9, 18 + bob, 18, 2, bambooLight);
        g.rect(8, 21 + bob, 20, 2, bambooDark);
        g.rect(11, 24 + bob, 14, 2, tarRim);

        // Two bamboo cross-braces
        g.rect(17, 14 + bob, 2, 8, tarRim);
      }
      break;
    }

    case 'boat_sampan': {
      // --- THUYỀN GỖ TAM BẢN (Wooden Sampan) ---
      const woodLight = '#d97706';
      const woodMid = '#b45309';
      const woodDark = '#78350f';
      const leafRoof = '#15803d';
      const leafRoofLight = '#4ade80';
      const leafRoofDark = '#14532d';
      const flagRed = '#ef4444';

      if (side) {
        // Sleek elongated sampan profile with peaked bow and thatched leaf mui
        // Hull
        g.rect(4, 18 + bob, 28, 7, woodMid);
        // Bow rise (left)
        g.rect(2, 16 + bob, 4, 4, woodLight);
        g.rect(1, 14 + bob, 2, 3, woodDark);
        // Stern rise (right)
        g.rect(30, 16 + bob, 4, 4, woodMid);
        g.rect(32, 15 + bob, 2, 3, woodDark);
        // Planks
        g.rect(4, 21 + bob, 28, 1, woodDark);
        g.rect(5, 23 + bob, 26, 1, woodLight);
        g.rect(6, 25 + bob, 24, 2, woodDark);

        // Thatched leaf canopy (Mui thuyền) in center
        g.rect(13, 11 + bob, 12, 7, leafRoof);
        g.rect(14, 10 + bob, 10, 2, leafRoofLight);
        g.rect(13, 13 + bob, 12, 1, leafRoofDark);
        // Roof support pillars
        g.rect(13, 18 + bob, 1, 3, woodDark);
        g.rect(24, 18 + bob, 1, 3, woodDark);

        // Triangular pennant flag at bow
        g.rect(2, 9 + bob, 1, 6, '#cbd5e1'); // pole
        g.rect(3, 9 + bob, 4, 3, flagRed);
        g.set(7, 10 + bob, flagRed);
      } else if (up) {
        // Stern view (narrower beam)
        g.rect(10, 14 + bob, 16, 11, woodMid);
        g.rect(11, 23 + bob, 14, 3, woodDark);
        // Canopy arch
        g.rect(11, 7 + bob, 14, 7, leafRoof);
        g.rect(12, 6 + bob, 12, 2, leafRoofLight);
        g.rect(11, 9 + bob, 14, 1, leafRoofDark);
        // Stern rudder post
        g.rect(17, 20 + bob, 2, 6, woodDark);
      } else {
        // Front view (bow facing down)
        g.rect(10, 13 + bob, 16, 12, woodMid);
        // Pointed bow tip
        g.rect(14, 24 + bob, 8, 3, woodLight);
        g.rect(16, 26 + bob, 4, 2, woodDark);
        // Interior floor
        g.rect(12, 14 + bob, 12, 5, '#92400e');
        // Canopy arch above
        g.rect(11, 6 + bob, 14, 7, leafRoof);
        g.rect(12, 5 + bob, 12, 2, leafRoofLight);
        g.rect(13, 8 + bob, 10, 1, leafRoofDark);
        // Red flag tip peek
        g.rect(17, 2 + bob, 3, 3, flagRed);
      }
      break;
    }

    case 'boat_cutter': {
      // --- CA NÔ COMPOSITE CAO TỐC (Speedboat Cutter) ---
      const hullWhite = '#f8fafc';
      const hullShadow = '#cbd5e1';
      const stripeCyan = '#06b6d4';
      const windshield = '#38bdf8';
      const chrome = '#94a3b8';
      const motorDark = '#0f172a';

      if (side) {
        // Dynamic wedge profile with curved windshield and dual outboard motors
        // Hull
        g.rect(5, 17 + bob, 27, 8, hullWhite);
        // Swept bow
        g.rect(2, 16 + bob, 4, 4, hullWhite);
        g.set(1, 16 + bob, hullShadow);
        // Cyan speed racing stripe
        g.rect(3, 20 + bob, 28, 2, stripeCyan);
        // Hull bottom chine
        g.rect(5, 23 + bob, 25, 2, hullShadow);
        g.rect(6, 24 + bob, 22, 2, motorDark);

        // Cockpit tinted windshield
        g.rect(10, 13 + bob, 8, 4, windshield);
        g.rect(11, 12 + bob, 6, 2, '#e0f2fe'); // glass reflection
        g.rect(9, 14 + bob, 1, 4, chrome);

        // Chrome safety rail
        g.rect(18, 15 + bob, 8, 1, chrome);
        g.rect(22, 16 + bob, 1, 2, chrome);

        // Outboard Motor at stern
        g.rect(30, 16 + bob, 4, 8, motorDark);
        g.rect(31, 17 + bob, 2, 2, stripeCyan);
        g.rect(32, 24 + bob, 2, 3, chrome); // propeller shaft
      } else if (up) {
        // Stern view showing twin outboard motors & racing stripes
        g.rect(9, 14 + bob, 18, 11, hullWhite);
        g.rect(10, 18 + bob, 16, 2, stripeCyan);
        g.rect(10, 22 + bob, 16, 3, hullShadow);
        // Cockpit rollbar
        g.rect(11, 10 + bob, 14, 2, chrome);
        g.rect(11, 12 + bob, 2, 4, chrome);
        g.rect(23, 12 + bob, 2, 4, chrome);
        // Twin motors
        g.rect(11, 20 + bob, 4, 6, motorDark);
        g.rect(21, 20 + bob, 4, 6, motorDark);
        g.rect(12, 21 + bob, 2, 2, stripeCyan);
        g.rect(22, 21 + bob, 2, 2, stripeCyan);
      } else {
        // Down / Front view - aggressive sleek V-hull
        g.rect(9, 12 + bob, 18, 12, hullWhite);
        // Sharp bow wedge
        g.rect(13, 23 + bob, 10, 3, hullWhite);
        g.rect(15, 25 + bob, 6, 2, stripeCyan);
        g.rect(17, 26 + bob, 2, 2, hullShadow);
        // Windshield curve
        g.rect(11, 13 + bob, 14, 4, windshield);
        g.rect(13, 12 + bob, 10, 2, '#e0f2fe');
        // Cockpit interior
        g.rect(12, 17 + bob, 12, 4, '#1e293b');
        g.rect(14, 18 + bob, 3, 2, '#38bdf8'); // captain seat
      }
      break;
    }

    case 'boat_trawler': {
      // --- TÀU VIỄN DƯƠNG HOÀNG KIM (Abyssal Trawler) ---
      const hullNavy = '#0f172a';
      const hullBrass = '#f59e0b';
      const hullGold = '#fbbf24';
      const deckWood = '#78350f';
      const wheelhouse = '#334155';
      const radarColor = '#38bdf8';
      const lightBeam = '#fef08a';

      if (side) {
        // Heavy oceanic trawler profile with wheelhouse, beacon light & gold plating
        // Heavy Hull
        g.rect(3, 16 + bob, 30, 9, hullNavy);
        // High flared bow
        g.rect(1, 14 + bob, 4, 4, hullNavy);
        g.rect(0, 12 + bob, 2, 3, hullBrass);
        // Solid 24K Gold decorative water line
        g.rect(2, 19 + bob, 31, 2, hullGold);
        g.rect(3, 21 + bob, 29, 2, hullBrass);
        g.rect(5, 24 + bob, 26, 2, '#020617');

        // Wheelhouse Cabin (Center-Left)
        g.rect(9, 8 + bob, 12, 8, wheelhouse);
        g.rect(8, 7 + bob, 14, 2, hullBrass);
        // Porthole / Bridge windows
        g.rect(10, 10 + bob, 3, 3, '#93c5fd');
        g.rect(15, 10 + bob, 3, 3, '#93c5fd');

        // Golden Searchlight / Radar Mast on cabin roof
        g.rect(14, 3 + bob, 2, 5, hullGold);
        g.rect(13, 2 + bob, 4, 2, lightBeam); // Searchlight dome
        // Rotating radar bar
        g.rect(11, 4 + bob, 8, 1, radarColor);

        // Aft Gantry Rigging & Deep Sea Winch (Rear)
        g.rect(26, 11 + bob, 2, 6, hullBrass);
        g.rect(23, 11 + bob, 6, 1, hullGold);
        g.rect(28, 14 + bob, 3, 3, deckWood); // cable drum
      } else if (up) {
        // Stern view: wide beam, heavy gantry frame, glowing portholes
        g.rect(7, 13 + bob, 22, 12, hullNavy);
        g.rect(8, 18 + bob, 20, 2, hullGold);
        g.rect(9, 22 + bob, 18, 3, hullBrass);
        // Wheelhouse rear
        g.rect(11, 7 + bob, 14, 7, wheelhouse);
        g.rect(10, 6 + bob, 16, 2, hullGold);
        g.rect(13, 9 + bob, 3, 3, '#93c5fd');
        g.rect(19, 9 + bob, 3, 3, '#93c5fd');
        // Searchlight beacon
        g.rect(17, 3 + bob, 2, 4, lightBeam);
        // Stern gantry frame
        g.rect(9, 10 + bob, 2, 6, hullBrass);
        g.rect(25, 10 + bob, 2, 6, hullBrass);
        g.rect(9, 10 + bob, 18, 1, hullGold);
      } else {
        // Front / Down view: imposing wave-piercing bow, searchlight shining forward
        g.rect(7, 12 + bob, 22, 12, hullNavy);
        // Heavy bow wedge
        g.rect(11, 23 + bob, 14, 3, hullNavy);
        g.rect(13, 25 + bob, 10, 2, hullGold);
        g.rect(16, 26 + bob, 4, 2, hullBrass);
        // Wheelhouse bridge
        g.rect(10, 8 + bob, 16, 6, wheelhouse);
        g.rect(9, 7 + bob, 18, 2, hullGold);
        g.rect(12, 9 + bob, 4, 3, '#93c5fd');
        g.rect(19, 9 + bob, 4, 3, '#93c5fd');
        // Brilliant front searchlight beam
        g.rect(16, 4 + bob, 4, 3, lightBeam);
        g.rect(15, 27 + bob, 6, 3, 'rgba(254, 240, 138, 0.45)');
      }
      break;
    }
  }

  g.outline(INK);
  return g;
}

const boatIconCache = new Map<string, string>();

/**
 * Returns a crisp 64x64 data URL icon of the boat for catalog, shop, and inventory cards.
 */
export function boatIcon(boatId: string, scale = 2): string {
  const key = `${boatId}@${scale}`;
  const hit = boatIconCache.get(key);
  if (hit) return hit;

  // Render profile view (dir 1: left or right) for handsome showcase angle
  const grid = drawBoat(boatId, 1, 0);
  const canvas = grid.toCanvas(scale);
  const url = canvas.toDataURL();
  boatIconCache.set(key, url);
  return url;
}

/**
 * Registers (once per boat/dir/frame) a canvas texture in the Phaser scene for runtime rendering.
 */
export function ensureBoatTexture(
  scene: Phaser.Scene,
  boatId: string,
  dir: 0 | 1 | 2 | 3,
  frame = 0,
): string {
  const normId = boatId.startsWith('boat:') ? boatId.split(':')[1]! : boatId;
  const key = `boat-tex:${normId}:${dir}:${frame}`;
  if (scene.textures.exists(key)) return key;
  const grid = drawBoat(normId, dir, frame);
  const canvas = grid.toCanvas(2);
  scene.textures.addCanvas(key, canvas);
  return key;
}
