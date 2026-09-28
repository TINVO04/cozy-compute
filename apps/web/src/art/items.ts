import { INK, PixelGrid, shade } from './pixel';

/**
 * 2026 Masterpiece Furniture & Item Rendering:
 * Ultra-high-detail pixel art with physical material rendering:
 * - Hand-hewn woods, polished brass, porcelain glazes, terracotta clay
 * - Tufted velvet, embroidered lace, quilted duvets, Persian silk carpets
 * - Glowing phosphor CRT screens, living coral marine aquariums, 24k gold statues
 * Drawn on a (w*16) x (h*16 + 8) grid so tall pieces overlap the tile above naturally.
 */
export function drawFurniture(sprite: string, size: { w: number; h: number }): PixelGrid {
  const [kind, color = '#888888'] = sprite.split(':');
  const W = size.w * 16;
  const H = size.h * 16 + 8;
  const g = new PixelGrid(W, H);
  const c = color;
  const d = shade(c, -0.3);
  const dd = shade(c, -0.45);
  const l = shade(c, 0.35);
  const ll = shade(c, 0.55);
  const wood = '#6b4226';
  const woodD = shade(wood, -0.32);
  const woodL = shade(wood, 0.28);
  const brass = '#f5c542';
  const brassL = '#ffea75';

  switch (kind) {
    case 'chair':
      // Backrest with turned wooden frame & diamond-tufted velvet cushion
      g.rect(3, 2, 10, 12, wood);
      g.rect(3, 2, 10, 1, woodL); // top finial rail
      g.rect(4, 3, 8, 10, c);
      g.rect(4, 3, 8, 2, l);
      // Deep button tufts with crease shadows
      g.set(6, 6, dd);
      g.set(7, 6, l);
      g.set(9, 6, dd);
      g.set(10, 6, l);
      g.set(7, 9, dd);
      g.set(8, 9, l);

      // Plump double-welted seat cushion
      g.rect(2, 13, 12, 5, c);
      g.rect(2, 13, 12, 1, l);
      g.set(3, 13, ll);
      g.set(12, 13, ll);
      g.rect(2, 17, 12, 1, d);

      // Turned wooden legs with golden brass caps
      g.rect(3, 18, 2, 4, woodD);
      g.rect(11, 18, 2, 4, woodD);
      g.set(3, 19, wood);
      g.set(11, 19, wood);
      g.rect(3, 21, 2, 1, brass);
      g.rect(11, 21, 2, 1, brass);
      g.set(3, 21, brassL);
      g.set(11, 21, brassL);
      break;

    case 'table':
      // Hand-hewn rustic oak tabletop with beveled edge
      g.rect(1, 9, W - 2, 7, wood);
      g.rect(1, 9, W - 2, 1, woodL);
      g.set(2, 9, '#ffffff'); // corner specular glint
      g.rect(1, 15, W - 2, 1, woodD);

      // Delicate embroidered white lace table runner
      g.rect(6, 9, W - 12, 7, '#fdfbf7');
      g.rect(6, 9, W - 12, 1, '#ffffff');
      // Lace scalloped cutouts
      for (let x = 7; x < W - 7; x += 3) {
        g.set(x, 11, '#ece7dd');
        g.set(x + 1, 13, '#ece7dd');
      }
      g.rect(6, 15, W - 12, 1, '#ded8cb');

      // Tabletop props: Ceramic tea service & flower vase
      // Porcelain teapot with steamy aroma wisp
      g.rect(7, 4, 5, 5, '#f4f0e6');
      g.rect(8, 4, 3, 1, '#ffffff');
      g.set(6, 6, '#f4f0e6'); // spout
      g.set(12, 5, '#f4f0e6'); // handle
      g.set(12, 7, '#f4f0e6');
      g.set(9, 2, 'rgba(255, 255, 255, 0.65)'); // steam curl
      g.set(10, 1, 'rgba(255, 255, 255, 0.45)');

      // Delicate teacup on saucer
      g.rect(14, 6, 4, 3, '#f4f0e6');
      g.rect(15, 6, 2, 1, '#c58a52'); // amber tea
      g.set(18, 7, '#f4f0e6'); // cup handle
      g.rect(13, 8, 6, 1, '#ded8cb'); // saucer

      // Ceramic flower vase with fresh blooming daisy
      g.rect(W - 11, 5, 4, 4, '#38bdf8');
      g.set(W - 10, 5, '#bae6fd');
      g.set(W - 9, 3, '#22c55e'); // stem
      g.rect(W - 11, 1, 4, 2, '#ffffff'); // white petals
      g.set(W - 9, 2, '#facc15'); // golden pollen center

      // Turned wooden table legs with brass ferrules
      g.rect(3, 16, 2, 6, woodD);
      g.rect(W - 5, 16, 2, 6, woodD);
      g.set(3, 17, wood);
      g.set(W - 5, 17, wood);
      g.rect(3, 21, 2, 1, brass);
      g.rect(W - 5, 21, 2, 1, brass);
      g.set(3, 21, brassL);
      g.set(W - 5, 21, brassL);
      break;

    case 'plant':
      // Terracotta ceramic pot with embossed relief rim
      g.rect(3, 15, 10, 8, '#b85438');
      g.rect(2, 14, 12, 2, '#cf6c50'); // pot rim
      g.rect(2, 14, 12, 1, '#f87171'); // rim highlight
      // Embossed geometric band
      for (let x = 4; x <= 11; x += 2) g.set(x, 17, '#991b1b');
      g.rect(3, 22, 10, 1, '#7f1d1d');
      // Saucer tray
      g.rect(1, 22, 14, 2, '#cf6c50');
      g.set(2, 22, '#f87171');

      // Moist dark soil with perlite grains
      g.rect(3, 14, 10, 1, '#33221a');
      g.set(5, 14, '#ffffff');
      g.set(9, 14, '#ffffff');

      // Lush Monstera Deliciosa foliage with cutouts & vein glints
      // Back leaves
      g.rect(2, 4, 5, 8, shade(c, -0.28));
      g.rect(9, 2, 5, 9, shade(c, -0.28));

      // Front large leaves with natural fenestration cutouts
      g.rect(4, 1, 8, 12, c);
      g.rect(5, 2, 6, 9, l);
      // Cutout fenestration holes
      g.set(6, 4, shade(c, -0.28));
      g.set(8, 6, shade(c, -0.28));
      g.set(6, 8, shade(c, -0.28));
      // Specular leaf sheen
      g.set(7, 3, '#ffffff');
      g.set(7, 7, '#ffffff');

      // Right arching leaf with highlights
      g.rect(10, 6, 5, 5, c);
      g.set(11, 7, l);
      g.set(12, 7, '#ffffff');

      // Stems & aerial root
      g.rect(7, 10, 2, 5, '#166534');
      g.set(10, 12, '#92400e'); // aerial root curling down
      g.set(10, 13, '#92400e');
      break;

    case 'rug': {
      // Masterpiece Royal Persian Silk Medallion Rug
      g.rect(1, 8, W - 2, H - 10, c);

      // Triple layered ornamental filigree borders
      g.rect(2, 9, W - 4, H - 12, dd);
      g.rect(3, 10, W - 6, H - 14, d);
      g.rect(4, 11, W - 8, H - 16, l);
      g.rect(5, 12, W - 10, H - 18, c);

      // Gold & floral motifs along the border
      for (let x = 6; x < W - 6; x += 4) {
        g.set(x, 11, '#ffd700');
        g.set(x, H - 8, '#ffd700');
      }
      for (let y = 12; y < H - 8; y += 4) {
        g.set(4, y, '#ffd700');
        g.set(W - 5, y, '#ffd700');
      }

      // Corner floral spandrels
      const corners = [
        [5, 12],
        [W - 8, 12],
        [5, H - 15],
        [W - 8, H - 15],
      ];
      for (const [cx, cy] of corners) {
        g.rect(cx!, cy!, 3, 3, '#b91c1c');
        g.set(cx! + 1, cy! + 1, '#ffd700');
      }

      // Grand central 8-pointed star medallion
      const mx = Math.floor(W / 2);
      const my = Math.floor(H / 2) + 2;
      g.rect(mx - 4, my - 4, 8, 8, '#fdfbf7');
      g.rect(mx - 3, my - 3, 6, 6, '#b91c1c');
      g.rect(mx - 2, my - 2, 4, 4, '#ffd700');
      g.set(mx - 1, my - 1, '#3b82f6'); // sapphire center gem
      g.set(mx, my - 1, '#ffffff');

      // Hand-knotted cream fringe tassels along top and bottom edges
      for (let x = 2; x < W - 2; x += 2) {
        g.set(x, 7, '#fef3c7');
        g.set(x, H - 2, '#fef3c7');
      }
      break;
    }

    case 'lamp':
      // Antique Victorian fluted brass column and weighted base
      g.rect(7, 8, 2, 13, '#b45309');
      g.set(7, 9, brassL); // metallic pillar highlight
      g.set(7, 12, brassL);
      g.set(7, 15, brassL);
      g.rect(4, 20, 8, 2, '#78350f');
      g.rect(3, 21, 10, 1, '#b45309');
      g.rect(2, 22, 12, 1, brass);
      g.set(3, 22, brassL);

      // Flared pleated silk bell lampshade
      g.rect(3, 1, 10, 7, c);
      g.rect(3, 1, 10, 1, l);
      g.set(4, 1, '#ffffff'); // silk sheen
      // Pleats
      for (let x = 4; x < 12; x += 2) {
        g.rect(x, 2, 1, 5, l);
        g.rect(x + 1, 2, 1, 5, d);
      }
      // Scalloped bottom edge with dangling crystal beads
      g.rect(2, 7, 12, 1, d);
      for (let x = 3; x <= 11; x += 2) g.set(x, 8, '#fde68a');

      // Radiant incandescent filament glow underneath
      g.rect(6, 8, 4, 1, '#fffbeb');
      g.set(7, 8, '#ffffff');
      break;

    case 'bed':
      // Four-poster heirloom canopy bed with turned spiral posts & acorn finials
      g.rect(1, 4, W - 2, 8, wood);
      g.rect(1, 4, W - 2, 1, woodL);
      // Spiral posts & finials
      g.rect(1, 1, 2, 5, woodL);
      g.set(1, 0, brass); // acorn finial gold cap
      g.rect(W - 3, 1, 2, 5, woodL);
      g.set(W - 3, 0, brass);

      // Double stacked goose-down pillows with plump indents
      g.rect(3, 8, 11, 7, '#f8f6f0');
      g.rect(4, 9, 9, 5, '#ffffff');
      g.set(8, 12, '#cbd5e1'); // left head indentation
      g.set(9, 12, '#cbd5e1');

      g.rect(W - 14, 8, 11, 7, '#f8f6f0');
      g.rect(W - 13, 9, 9, 5, '#ffffff');
      g.set(W - 9, 12, '#cbd5e1'); // right head indentation
      g.set(W - 8, 12, '#cbd5e1');

      // Quilted patchwork duvet with stitched diamond seams
      g.rect(1, 15, W - 2, H - 18, c);
      g.rect(1, 15, W - 2, 2, l);
      for (let x = 4; x < W - 4; x += 6) {
        for (let y = 18; y < H - 5; y += 4) {
          g.set(x, y, d);
          g.set(x + 1, y, l);
          g.set(x, y + 1, '#ffffff'); // stitch knot glint
        }
      }

      // Chunky knit wool throw blanket folded at the foot of the bed with tassels
      g.rect(1, H - 8, W - 2, 5, d);
      g.rect(1, H - 8, W - 2, 1, shade(d, 0.35));
      for (let x = 3; x < W - 3; x += 3) {
        g.set(x, H - 7, shade(d, 0.45));
        g.set(x, H - 4, shade(d, -0.2)); // tassel fringe
      }

      // Carved wooden footboard rail
      g.rect(1, H - 3, W - 2, 2, woodD);
      g.set(2, H - 3, woodL);
      break;

    case 'sofa':
      // Grand Chesterfield sofa with deep-set diamond button tufting
      g.rect(1, 5, W - 2, 8, d);
      // Button tufts on backrest with highlight creases
      for (let x = 5; x < W - 5; x += 6) {
        g.set(x, 8, dd);
        g.set(x + 1, 8, l);
        g.set(x, 9, dd);
      }

      // Plump dual pocket-coil seat cushions with piped welt seams
      g.rect(3, 12, W - 6, 8, c);
      g.rect(3, 12, W - 6, 1, l);
      g.set(4, 12, ll);
      g.set(W - 5, 12, ll);
      g.rect(W / 2 - 1, 12, 2, 8, d); // middle cushion seam

      // Rolled armrests with brass nailhead studs
      g.rect(0, 8, 4, 13, d);
      g.rect(1, 8, 2, 11, c);
      g.rect(1, 8, 2, 2, l);
      g.rect(W - 4, 8, 4, 13, d);
      g.rect(W - 3, 8, 2, 11, c);
      g.rect(W - 3, 8, 2, 2, l);
      // Brass upholstery nailheads
      for (let y = 9; y <= 19; y += 3) {
        g.set(0, y, brass);
        g.set(W - 1, y, brass);
      }

      // Tartan plaid wool throw blanket draped over left arm
      g.rect(4, 9, 6, 7, '#047857');
      g.rect(5, 10, 4, 5, '#10b981');
      g.set(6, 11, '#facc15'); // yellow tartan stripe
      g.set(7, 12, '#facc15');

      // Decorative coral velvet throw pillow
      g.rect(W - 9, 10, 5, 5, '#f43f5e');
      g.set(W - 7, 12, '#ffffff'); // center tuft glint

      // Turned wooden bun feet
      g.rect(2, 21, 3, 2, woodD);
      g.rect(W - 5, 21, 3, 2, woodD);
      break;

    case 'bookshelf': {
      // Classical dentil crown moulding on top pediment
      g.rect(0, 0, W, 3, woodL);
      for (let x = 1; x < W - 1; x += 3) g.set(x, 2, woodD); // dentils
      g.rect(1, 1, W - 2, H - 2, wood);
      g.rect(3, 3, W - 6, H - 6, woodD); // inner cabinet

      // 3 solid oak shelves
      [7, 15, 23].forEach((y) => {
        g.rect(2, y, W - 4, 2, woodL);
        g.rect(2, y + 1, W - 4, 1, woodD);
      });

      // Gilded leather-bound tomes, antique scrolls & ornaments
      const bookColors = ['#991b1b', '#1e40af', '#166534', '#7e22ce', '#c2410c', '#b45309'];
      let bi = 0;
      for (const shelfY of [3, 11, 19]) {
        for (let x = 4; x < W - 6; x += 3) {
          const bh = 3 + ((bi * 5) % 4);
          const col = bookColors[bi++ % bookColors.length]!;
          g.rect(x, shelfY + 4 - bh, 2, bh, col);
          g.set(x, shelfY + 4 - bh + 1, brass); // gilded spine band
          if (bh >= 5) g.set(x + 1, shelfY + 4 - bh + 3, brass);
        }
      }

      // Middle shelf: Brass celestial globe / desk clock
      g.rect(W - 9, 12, 4, 3, brass);
      g.set(W - 7, 11, brassL);
      g.rect(W - 8, 14, 2, 1, woodD);

      // Top shelf: Terracotta pot with trailing cascading English ivy
      g.rect(W - 7, 4, 4, 3, '#c2410c');
      g.set(W - 5, 3, '#22c55e');
      g.rect(W - 6, 2, 2, 2, '#4ade80');
      // Trailing ivy vine cascading down shelf side
      g.set(W - 3, 5, '#16a34a');
      g.set(W - 2, 7, '#22c55e');
      g.set(W - 3, 9, '#15803d');
      g.set(W - 2, 11, '#4ade80');
      break;
    }

    case 'tv':
      // 1980s Retro wood-veneer cathode-ray console television
      g.rect(1, 2, W - 2, 15, wood);
      g.rect(1, 2, W - 2, 1, woodL);

      // Silver rabbit-ear antennas
      g.set(Math.floor(W / 2) - 4, 0, '#e2e8f0');
      g.set(Math.floor(W / 2) - 3, 1, '#cbd5e1');
      g.set(Math.floor(W / 2) + 3, 1, '#cbd5e1');
      g.set(Math.floor(W / 2) + 4, 0, '#e2e8f0');

      // Curved CRT tube bezel & phosphorescent glass screen
      g.rect(3, 4, W - 12, 11, INK);
      g.rect(4, 5, W - 14, 9, '#1e293b');

      // Pixel game graphics on CRT screen (hill, blue sky, golden hero)
      g.rect(4, 5, W - 14, 4, '#38bdf8'); // sky
      g.rect(4, 9, W - 14, 5, '#22c55e'); // grass hill
      g.rect(10, 8, 3, 4, '#facc15'); // cute pixel hero
      g.set(11, 9, '#ffffff'); // hero eye
      g.rect(5, 6, 2, 1, '#ffffff'); // cloud
      g.rect(W - 14, 6, 2, 1, '#ef4444'); // heart HP

      // Glass screen reflection curve
      g.rect(5, 5, 5, 1, 'rgba(255, 255, 255, 0.75)');
      g.set(4, 6, 'rgba(255, 255, 255, 0.5)');

      // Speaker mesh & illuminated channel rotary dials on the right
      g.rect(W - 8, 5, 5, 2, brass); // VHF channel knob
      g.set(W - 7, 5, brassL);
      g.rect(W - 8, 8, 5, 2, brass); // UHF tuning knob
      g.set(W - 7, 8, brassL);
      // Perforated speaker grille
      for (let y = 11; y <= 14; y += 2) g.rect(W - 8, y, 5, 1, '#1e1b18');

      // Credenza table base underneath with tapered angled legs
      g.rect(2, 17, W - 4, 5, woodD);
      g.set(3, 17, woodL);
      g.rect(4, 22, 2, 2, '#181410');
      g.rect(W - 6, 22, 2, 2, '#181410');
      break;

    case 'aquarium':
      // Rimless crystal glass tank with glowing ocean-blue water
      g.rect(1, 2, W - 2, 15, '#7dd3fc');
      g.rect(2, 3, W - 4, 13, '#0284c7');
      g.rect(2, 3, W - 4, 2, '#38bdf8'); // water surface light shimmer
      // Light caustic ray streak
      g.set(6, 4, '#bae6fd');
      g.set(14, 5, '#bae6fd');

      // White aragonite sand floor with river pebbles
      g.rect(2, 13, W - 4, 3, '#fef08a');
      g.rect(2, 15, W - 4, 1, '#eab308');
      g.set(5, 14, '#78350f');
      g.set(18, 14, '#78350f');

      // Vibrant living coral reef & kelp
      g.rect(4, 9, 3, 4, '#ec4899'); // pink brain coral
      g.set(5, 8, '#f472b6');
      g.rect(W - 7, 10, 3, 3, '#a855f7'); // purple sea anemone
      g.rect(8, 6, 2, 7, '#15803d'); // green sea kelp
      g.set(9, 5, '#22c55e');

      // Swimming orange-and-white clownfish (Nemo!)
      g.rect(12, 7, 6, 3, '#f97316');
      g.rect(14, 6, 2, 5, '#ffffff'); // white stripe
      g.set(17, 8, '#0f172a'); // eye
      g.set(17, 8, '#ffffff'); // glint
      g.set(11, 7, '#fdba74'); // tail fin

      // Baby blue tang fish swimming below
      g.rect(19, 10, 4, 2, '#2563eb');
      g.set(22, 10, '#facc15'); // yellow tail

      // Translucent rising air bubbles
      g.set(10, 4, '#ffffff');
      g.set(9, 2, '#ffffff');
      g.set(16, 3, '#ffffff');

      // Sleek contemporary cabinet stand with brushed nickel handles
      g.rect(1, 17, W - 2, 7, wood);
      g.rect(1, 17, W - 2, 1, woodL);
      g.rect(W / 2 - 1, 18, 2, 6, woodD);
      g.set(W / 2 - 2, 20, '#e2e8f0'); // nickel handle
      g.set(W / 2 + 1, 20, '#e2e8f0');
      break;

    case 'duckstatue':
      // Carved white Carrara marble plinth with stepped base
      g.rect(3, 17, 10, 6, '#e2e8f0');
      g.rect(2, 16, 12, 2, '#f8fafc');
      g.rect(2, 16, 12, 1, '#ffffff');
      g.rect(1, 22, 14, 2, '#cbd5e1'); // base step
      // Inscribed golden plaque
      g.rect(5, 19, 6, 2, brass);
      g.set(6, 19, brassL);

      // Monumental 24k Solid Gold Duck sculpture
      g.rect(3, 8, 10, 8, '#f59e0b');
      g.rect(4, 9, 8, 6, '#facc15');
      g.rect(7, 3, 6, 6, '#f59e0b');
      g.rect(8, 4, 4, 4, '#facc15');

      // Chiseled wing feathers & specular star glints
      g.set(5, 9, '#ffffff'); // dazzling gold specular glint
      g.set(6, 10, '#ffffff');
      g.set(9, 4, '#ffffff');
      g.set(4, 11, '#b45309'); // wing shadow

      // Bright orange beak
      g.rect(13, 6, 3, 2, '#ea580c');
      g.set(14, 6, '#ffedd5'); // beak glint
      g.set(11, 4, INK); // eye

      // Royal imperial crown encrusted with jewels
      g.rect(8, 1, 4, 2, '#f59e0b');
      [8, 11].forEach((x) => g.set(x, 0, '#fef08a'));
      g.set(9, 1, '#ef4444'); // ruby
      g.set(10, 1, '#3b82f6'); // sapphire
      break;

    case 'gamingchair':
      // High-end Ergonomic Gaming Chair with RGB LED rim
      // 5-point caster wheel star base
      g.rect(2, 22, 12, 1, '#0f172a');
      g.set(2, 23, '#475569'); // wheels
      g.set(7, 23, '#475569');
      g.set(13, 23, '#475569');
      // Hydraulic lift piston
      g.rect(7, 18, 2, 4, '#94a3b8');
      g.set(7, 19, '#ffffff'); // chrome glint

      // Bucket seat racing backrest
      g.rect(3, 2, 10, 14, '#0f172a'); // dark carbon leather
      g.rect(4, 3, 8, 12, c); // accent color (cyan)
      // RGB LED light contour lines
      g.rect(3, 3, 1, 12, '#38bdf8');
      g.rect(12, 3, 1, 12, '#38bdf8');
      // Dual neck harness openings
      g.rect(6, 6, 4, 2, '#0f172a');
      g.set(7, 6, '#ffffff');
      g.set(8, 6, '#ffffff');
      // Ergonomic headrest pillow
      g.rect(4, 3, 8, 3, '#1e293b');
      g.set(7, 4, '#38bdf8');
      g.set(8, 4, '#38bdf8');

      // 3D adjustable armrests
      g.rect(1, 11, 2, 6, '#1e293b');
      g.rect(0, 11, 4, 1, '#334155');
      g.rect(13, 11, 2, 6, '#1e293b');
      g.rect(12, 11, 4, 1, '#334155');

      // Waterfall seat cushion
      g.rect(2, 15, 12, 4, '#0f172a');
      g.rect(3, 15, 10, 3, c);
      g.rect(2, 18, 12, 1, '#38bdf8'); // neon bottom edge
      break;

    case 'arcade':
      // Retro 1980 Arcade Cabinet (1x2 tiles -> W=16, H=40)
      // Cabinet side panels & black bevels
      g.rect(1, 2, W - 2, H - 4, '#1e1b2e');
      g.rect(2, 3, W - 4, H - 6, c); // side vinyl art color

      // Illuminated marquee banner at top
      g.rect(2, 3, W - 4, 5, '#0f172a');
      g.rect(3, 4, W - 6, 3, '#facc15'); // glowing yellow marquee
      g.set(5, 5, '#ef4444'); // retro logo lettering
      g.set(7, 5, '#3b82f6');
      g.set(9, 5, '#10b981');
      g.rect(2, 3, W - 4, 1, '#ffffff'); // marquee lamp glow

      // Angled CRT Monitor bezel & phosphorescent game screen
      g.rect(2, 9, W - 4, 12, '#09090b');
      g.rect(3, 10, W - 6, 10, '#0284c7'); // glowing game screen
      // 8-bit game pixel characters (spaceship / fish / score)
      g.rect(4, 11, 3, 1, '#fde047'); // stars
      g.rect(9, 12, 2, 1, '#fde047');
      g.rect(6, 15, 4, 3, '#ef4444'); // player space ship / fish
      g.set(7, 14, '#ffffff'); // laser blast
      g.set(8, 14, '#ffffff');
      g.set(4, 18, '#22c55e'); // score number
      // CRT glass curve glare
      g.rect(3, 10, 3, 1, 'rgba(255, 255, 255, 0.7)');

      // Slanted control panel deck with joystick & colorful pushbuttons
      g.rect(1, 22, W - 2, 5, '#0f172a');
      // Ball-top red joystick
      g.rect(4, 23, 2, 2, '#ef4444');
      g.set(4, 23, '#ffffff'); // ball glint
      g.rect(4, 25, 2, 1, '#94a3b8'); // steel shaft
      // Arcade push buttons (blue, yellow, green)
      g.set(8, 24, '#38bdf8');
      g.set(10, 23, '#facc15');
      g.set(12, 24, '#22c55e');

      // Lower coin door & dual 25-cent illuminated reject slots
      g.rect(3, 28, W - 6, 8, '#09090b');
      g.rect(4, 29, W - 8, 6, '#18181b');
      g.rect(5, 31, 2, 3, '#f97316'); // glowing coin return 1
      g.set(5, 31, '#fef08a');
      g.rect(9, 31, 2, 3, '#f97316'); // glowing coin return 2
      g.set(9, 31, '#fef08a');

      // Base kickplate
      g.rect(2, 37, W - 4, 2, '#0f172a');
      break;

    case 'cattree':
      // 3-Tier Chibi Cat Tree with Sisal Scratching Posts & Perches (1x2 tiles -> W=16, H=40)
      // Heavy carpeted base platform
      g.rect(1, 35, W - 2, 4, '#d97706');
      g.rect(1, 35, W - 2, 1, '#fef3c7'); // plush fleece rim

      // Bottom cozy cat condo cave
      g.rect(2, 24, W - 4, 11, '#b45309');
      g.rect(2, 24, W - 4, 1, '#fde68a');
      // Circular cat hideout entry hole
      g.rect(5, 27, 6, 6, '#451a03');
      g.rect(6, 26, 4, 8, '#451a03');
      // Cute cat peeking out from inside!
      g.set(7, 28, '#ffffff'); // cat eye glint
      g.set(8, 28, '#ffffff');
      g.set(7, 29, '#f472b6'); // pink nose

      // Middle sisal scratching post
      g.rect(6, 14, 4, 10, '#fef3c7');
      // Sisal rope windings
      for (let y = 14; y < 24; y += 2) g.rect(6, y, 4, 1, '#d97706');

      // Tier 2 curved perch platform
      g.rect(1, 13, 9, 3, '#f59e0b');
      g.rect(1, 13, 9, 1, '#fef3c7');
      // Dangling fuzzy plush pompom on string
      g.set(3, 16, '#94a3b8'); // string
      g.set(3, 17, '#94a3b8');
      g.rect(2, 18, 3, 3, '#ec4899'); // pink pompom
      g.set(3, 18, '#ffffff');

      // Top sisal post
      g.rect(9, 5, 4, 8, '#fef3c7');
      for (let y = 5; y < 13; y += 2) g.rect(9, y, 4, 1, '#d97706');

      // Top luxury circular watchtower crow's nest bed
      g.rect(5, 1, 10, 4, '#f59e0b');
      g.rect(5, 1, 10, 1, '#fef3c7'); // plush padded rim
      g.set(6, 2, '#fef3c7');
      g.set(13, 2, '#fef3c7');
      break;

    default:
      g.rect(2, 6, W - 4, H - 8, c);
      g.rect(2, 6, W - 4, 2, l);
      g.rect(2, H - 4, W - 4, 2, d);
  }

  g.outline(INK);
  return g;
}

import { chibiItemIcon } from './chibi';

/** Icon for any catalogue item, using HD Chibi mannequins for clothing and physical materials for furniture. */
export function itemIcon(
  sprite: string,
  type: 'clothing' | 'furniture' | 'rod',
  size = { w: 1, h: 1 },
  scale = 3,
): string {
  const key = `${sprite}|${type}|${size.w}x${size.h}|${scale}`;
  const hit = iconCache.get(key);
  if (hit) return hit;

  if (type === 'rod') {
    const url = rodIcon(sprite, 64);
    iconCache.set(key, url);
    return url;
  }

  if (type === 'clothing') {
    const [kind] = sprite.split(':');
    const hatKinds = [
      'beanie',
      'cap',
      'chef',
      'cone',
      'crown',
      'cat_ears',
      'straw_summer',
      'witch_cosmic',
      'beret_artist',
      'halo_angel',
    ];
    const faceKinds = ['glasses', 'shades', 'mustache', 'blush_anime', 'bandage', 'eyepatch', 'mask_kawaii'];
    const slot: 'hat' | 'face' | 'top' = hatKinds.includes(kind!)
      ? 'hat'
      : faceKinds.includes(kind!)
        ? 'face'
        : 'top';
    const url = chibiItemIcon(sprite, slot, 64);
    iconCache.set(key, url);
    return url;
  }

  const canvas = drawFurniture(sprite, size).toCanvas(
    size.w > 1 || size.h > 1 ? Math.max(1, scale - 1) : scale,
  );
  const url = canvas.toDataURL();
  iconCache.set(key, url);
  return url;
}
const iconCache = new Map<string, string>();

/** Adorable plump yellow rubber duck with wing shine, orange bill and glistening eye */
export function duckGrid(): PixelGrid {
  const g = new PixelGrid(14, 13);
  const y = '#f5c542';
  const yL = '#ffeaa7';
  const yD = '#d49a24';

  // Body
  g.rect(2, 6, 10, 6, y);
  g.rect(3, 6, 8, 2, yL); // top shine
  g.rect(2, 11, 10, 1, yD); // bottom shadow
  // Wing tuft
  g.rect(3, 8, 5, 3, yD);
  g.rect(4, 8, 3, 2, y);

  // Head
  g.rect(6, 1, 6, 6, y);
  g.rect(7, 1, 4, 1, yL);
  g.set(9, 2, INK); // eye
  g.set(9, 2, '#ffffff'); // eye catchlight twinkle
  g.set(10, 3, INK);

  // Beak with smile curve
  g.rect(12, 3, 2, 3, '#e67e22');
  g.set(13, 4, '#d35400');

  // Tail perk
  g.rect(0, 5, 3, 3, y);
  g.set(0, 4, yL);

  g.outline(INK);
  return g;
}

export { drawFish, fishIcon } from './fish';

/**
 * 2026 Pixel Art Coffee Cup for Bean There Cafe activity.
 * Renders an artisan ceramic mug with steamy aroma curls and ingredients.
 */
export function drawCoffeeCup(sequence: string[] = []): PixelGrid {
  const g = new PixelGrid(20, 20);

  // Ceramic mug body
  g.rect(4, 7, 12, 11, '#f1f5f9');
  g.rect(4, 7, 12, 1, '#ffffff'); // rim
  g.rect(4, 17, 12, 1, '#cbd5e1'); // base
  // Ceramic mug handle
  g.rect(16, 9, 3, 6, '#f1f5f9');
  g.rect(17, 10, 1, 4, '#ffffff');

  // Coffee beverage surface
  const hasMilk = sequence.includes('milk') || sequence.includes('oat') || sequence.includes('foam');
  const brewCol = hasMilk ? '#b48356' : '#45220c';
  g.rect(5, 8, 10, 4, brewCol);

  // Latte art foam heart
  if (hasMilk) {
    g.rect(8, 8, 4, 2, '#fffbeb');
    g.set(7, 8, '#fffbeb');
    g.set(12, 8, '#fffbeb');
    g.set(9, 10, '#fffbeb');
    g.set(10, 10, '#fffbeb');
  }

  // Caramel drizzle
  if (sequence.includes('caramel')) {
    g.set(7, 9, '#d97706');
    g.set(9, 9, '#d97706');
    g.set(11, 9, '#d97706');
  }

  // Cinnamon dust specks
  if (sequence.includes('cinnamon')) {
    g.set(8, 8, '#78350f');
    g.set(11, 8, '#78350f');
  }

  // Ice cube
  if (sequence.includes('ice')) {
    g.rect(6, 7, 3, 3, '#bae6fd');
    g.set(7, 7, '#ffffff');
  }

  // Rising aromatic steam curls
  g.set(8, 4, 'rgba(255, 255, 255, 0.7)');
  g.set(9, 3, 'rgba(255, 255, 255, 0.7)');
  g.set(8, 2, 'rgba(255, 255, 255, 0.45)');
  g.set(12, 5, 'rgba(255, 255, 255, 0.7)');
  g.set(13, 4, 'rgba(255, 255, 255, 0.7)');

  g.outline(INK);
  return g;
}

const coffeeCache = new Map<string, string>();
export function coffeeIcon(sequence: string[] = [], scale = 4): string {
  const key = sequence.join(',') + '@' + scale;
  const hit = coffeeCache.get(key);
  if (hit) return hit;
  const url = drawCoffeeCup(sequence).toCanvas(scale).toDataURL();
  coffeeCache.set(key, url);
  return url;
}

/**
 * 2026 Masterpiece Fishing Rod Pixel Art:
 * Diagonal 45-degree rods with detailed grip, reel, line guides, flex taper, and suspended bobber.
 */
export function drawFishingRod(sprite: string): PixelGrid {
  const [, subtype = 'twig'] = sprite.split(':');
  const g = new PixelGrid(28, 28);

  // Rod blank (Thân cần câu chéo từ góc dưới trái (4, 23) vút lên góc trên phải (23, 4))
  const drawBlank = (col: string, lCol: string, dCol: string) => {
    // Butt and handle
    g.rect(4, 22, 3, 3, dCol);
    g.rect(5, 21, 3, 3, col);
    g.rect(6, 20, 3, 3, lCol);

    // Main rod taper segments
    const pts = [
      [7, 19],
      [8, 18],
      [9, 17],
      [10, 16],
      [11, 15],
      [12, 14],
      [13, 13],
      [14, 12],
      [15, 11],
      [16, 10],
      [17, 9],
      [18, 8],
      [19, 7],
      [20, 6],
      [21, 5],
      [22, 4],
    ];

    pts.forEach(([x, y], idx) => {
      // Taper: thicker at bottom, thinner at tip
      if (idx < 6) {
        g.set(x!, y!, col);
        g.set(x! + 1, y!, lCol);
        g.set(x!, y! + 1, dCol);
      } else if (idx < 12) {
        g.set(x!, y!, col);
        g.set(x! + 1, y!, lCol);
      } else {
        g.set(x!, y!, lCol);
      }
    });

    // Tip guide
    g.set(23, 3, '#f8fafc');
  };

  switch (subtype) {
    case 'twig': {
      // Natural twisted branch with leafy shoot
      drawBlank('#8b5a2b', '#a3713f', '#5c3919');
      // Knots on branch
      g.set(11, 14, '#5c3919');
      g.set(16, 9, '#5c3919');
      // Small fresh green leaf sprouting
      g.set(15, 8, '#65a30d');
      g.set(14, 7, '#84cc16');
      // Simple twine string tied to handle
      g.rect(6, 21, 2, 2, '#d4a373');
      // Dangling fishing line and cork bobber
      g.set(23, 4, '#e2e8f0');
      g.set(23, 6, '#e2e8f0');
      g.set(22, 8, '#e2e8f0');
      g.set(22, 10, '#e2e8f0');
      // Tiny bobber
      g.rect(21, 11, 3, 2, '#ef4444');
      g.rect(21, 13, 3, 1, '#ffffff');
      break;
    }

    case 'wooden': {
      // Varnished pine wood rod with brass accents
      drawBlank('#b47547', '#d99b6c', '#784620');
      // Turned wood grip with leather wrap
      g.rect(4, 21, 3, 4, '#45220c');
      g.set(5, 22, '#6b3713');
      g.set(6, 23, '#6b3713');
      // Golden brass reel seat
      g.rect(8, 18, 3, 3, '#f59e0b');
      g.set(9, 19, '#fef08a');
      g.rect(7, 20, 2, 2, '#78350f'); // reel spool
      // Line guides (Khoen kim loại)
      g.set(12, 13, '#94a3b8');
      g.set(16, 9, '#94a3b8');
      g.set(20, 5, '#94a3b8');
      // Dangling line and painted wooden bobber
      g.set(23, 4, '#f8fafc');
      g.set(23, 7, '#f8fafc');
      g.set(22, 10, '#f8fafc');
      g.rect(21, 11, 3, 2, '#dc2626');
      g.rect(21, 13, 3, 2, '#f8fafc');
      break;
    }

    case 'fiberglass': {
      // Vivid cyan flexible fiberglass with neoprene handle
      drawBlank('#06b6d4', '#67e8f9', '#0e7490');
      // Black EVA foam grip
      g.rect(4, 21, 3, 4, '#1e293b');
      g.set(5, 22, '#334155');
      // Modern spinning reel
      g.rect(8, 17, 4, 3, '#38bdf8');
      g.rect(7, 19, 3, 3, '#0284c7');
      g.set(8, 20, '#bae6fd');
      // Ceramic guide rings
      g.set(12, 13, '#0284c7');
      g.set(16, 9, '#0284c7');
      g.set(20, 5, '#0284c7');
      // Fluorescent high-vis line
      g.set(23, 4, '#a7f3d0');
      g.set(23, 7, '#a7f3d0');
      g.set(22, 10, '#a7f3d0');
      g.rect(21, 11, 3, 2, '#f97316');
      g.rect(21, 13, 3, 2, '#38bdf8');
      break;
    }

    case 'pro_carbon': {
      // High-modulus carbon fiber with matte black & diamond weave
      drawBlank('#334155', '#64748b', '#0f172a');
      // Carbon weave cross pattern
      g.set(9, 17, '#94a3b8');
      g.set(13, 13, '#94a3b8');
      g.set(17, 9, '#94a3b8');
      // Split grip carbon handle
      g.rect(4, 21, 3, 4, '#020617');
      g.set(4, 21, '#475569');
      // Metallic titanium reel with purple anodized spool
      g.rect(8, 17, 4, 4, '#6366f1');
      g.set(9, 18, '#c7d2fe');
      g.rect(7, 19, 3, 3, '#1e1b4b');
      // Titanium micro-guides
      g.set(12, 13, '#818cf8');
      g.set(16, 9, '#818cf8');
      g.set(20, 5, '#818cf8');
      // Braided high-spec line
      g.set(23, 4, '#e0e7ff');
      g.set(23, 7, '#e0e7ff');
      g.set(22, 10, '#e0e7ff');
      g.rect(21, 11, 3, 2, '#ec4899');
      g.rect(21, 13, 3, 2, '#f43f5e');
      break;
    }

    case 'golden': {
      // 24K Royal Gold blank with radiant luster & ruby inlay
      drawBlank('#f59e0b', '#fef08a', '#b45309');
      // Pure gold ornamental grip
      g.rect(4, 21, 3, 4, '#b45309');
      g.rect(5, 21, 2, 3, '#fbbf24');
      g.set(5, 22, '#fef08a');
      // Royal Dragon reel with ruby core
      g.rect(8, 17, 4, 4, '#f59e0b');
      g.set(9, 18, '#fef08a');
      g.rect(7, 19, 3, 3, '#b45309');
      g.set(8, 20, '#ef4444'); // ruby gem
      // Golden dragon scale guides
      g.set(12, 13, '#fbbf24');
      g.set(16, 9, '#fbbf24');
      g.set(20, 5, '#fbbf24');
      // Golden shimmering silk line
      g.set(23, 4, '#fef08a');
      g.set(23, 7, '#fef08a');
      g.set(22, 10, '#fef08a');
      // Royal Crown bobber
      g.rect(20, 10, 4, 2, '#fbbf24');
      g.set(21, 10, '#ef4444');
      g.set(22, 10, '#fef08a');
      g.rect(21, 12, 3, 2, '#ffffff');
      // Golden aura sparkle stars
      g.set(25, 2, '#fef08a');
      g.set(26, 3, '#ffffff');
      g.set(18, 2, '#fef08a');
      g.set(14, 6, '#fef08a');
      break;
    }

    case 'abyssal': {
      // Eldritch abyssal bone with glowing violet luminescent runes
      drawBlank('#7c3aed', '#c084fc', '#4c1d95');
      // Bone grip wrapped in abyssal leather
      g.rect(4, 21, 3, 4, '#2e1065');
      g.set(5, 22, '#a855f7');
      // Abyssal Eye reel (Con mắt hư không)
      g.rect(8, 17, 4, 4, '#6b21a8');
      g.set(9, 18, '#e879f9');
      g.rect(7, 19, 3, 3, '#3b0764');
      g.set(8, 20, '#22d3ee'); // glowing cyan eldritch eye pupil
      // Void thorn guides
      g.set(12, 13, '#c084fc');
      g.set(16, 9, '#c084fc');
      g.set(20, 5, '#c084fc');
      // Tendril void line
      g.set(23, 4, '#f0abfc');
      g.set(23, 7, '#f0abfc');
      g.set(22, 10, '#f0abfc');
      // Abyssal skull/pearl bobber
      g.rect(21, 10, 3, 3, '#67e8f9');
      g.set(22, 11, '#0891b2');
      g.rect(21, 13, 3, 1, '#c084fc');
      // Violet magic sparkles
      g.set(25, 2, '#e879f9');
      g.set(24, 1, '#ffffff');
      g.set(19, 3, '#a855f7');
      g.set(10, 11, '#c084fc');
      break;
    }
  }

  g.outline(INK);
  return g;
}

const rodCache = new Map<string, string>();
export function rodIcon(spriteOrId: string, scale = 4): string {
  const key = spriteOrId + '@' + scale;
  const hit = rodCache.get(key);
  if (hit) return hit;
  // If sprite is a full key like 'rod:twig:#8b5a2b', use directly; otherwise construct
  const sprite = spriteOrId.startsWith('rod:')
    ? spriteOrId
    : spriteOrId === 'rod_wooden'
      ? 'rod:wooden:#b47547'
      : spriteOrId === 'rod_fiberglass'
        ? 'rod:fiberglass:#06b6d4'
        : spriteOrId === 'rod_pro_carbon'
          ? 'rod:carbon:#334155'
          : spriteOrId === 'rod_golden_legend'
            ? 'rod:golden:#f59e0b'
            : spriteOrId === 'rod_abyssal'
              ? 'rod:abyssal:#8b5cf6'
              : 'rod:twig:#8b5a2b';
  const url = drawFishingRod(sprite).toCanvas(scale).toDataURL();
  rodCache.set(key, url);
  return url;
}
