# Hang Ngọc artwork

The entrance reuses the town's trees and props alongside warm stone paths, a shingled blacksmith forge, tool racks, ore cart, layered cliff mouth and lanterns. Interior palettes progress through abandoned mine, mushroom garden, jade vein, amethyst pools and an ancient shrine. Warm lamps establish landmarks against restrained cool ground textures. Low contrast ground keeps ore, monsters and attack warnings readable.

All cave artwork is authored in repository Canvas/PixelGrid code. No downloaded art or generated bitmap assets are shipped. Town trees, crates and benches retain their existing repository provenance. Source files: apps/web/src/art/cave-world.ts and apps/web/src/art/cave-creatures.ts. Authored 2026-10-05 under repository terms in response to the user's cave art request.

World backgrounds are cached at 960 × 640. Slime, bat and golem each use eight 96 × 112 frames in a 768 × 112 strip, nearest filtering and a shared feet anchor at 0.5,0.89. Slime squash, articulated bat wings and alternating golem steps distinguish silhouettes. Ore textures show resource facets and progressive cracks.

Combat includes sword anticipation, swing and recovery, hit flashes, recoil, attack warnings, defeat motion, loot pickup and synthesized sound. Dojo techniques reuse the existing bounded spell effect pool. Reduced motion removes ambient drift, creature animation, camera shake, sword rotation and burst particles.

Browser automation rendered all six areas at 1280 × 720, 1440 × 900 and 1920 × 1080, exercised spell effects with reduced motion on/off, and checked the hotbar at 390px width. Screenshots: output/cave-v2-floor-0.png through cave-v2-floor-5.png. Human visual approval remains pending; successful rendering does not establish aesthetic quality.
