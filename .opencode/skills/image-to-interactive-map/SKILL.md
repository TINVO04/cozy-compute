---
name: image-to-interactive-map
description: Unified Master Game Crafting Skill. Combines Tiled/LDtk native tilemaps, automated Playwright visual verification, and professional 2D asset extraction into a seamless, living, zero-artifact multiplayer game world.
---

# Unified Master 2D Game Crafting & Tilemap Skill

This skill guides the agent in autonomously transforming static concept images, AI scene renders, or modular building sprites into production-ready, living 2D multiplayer game worlds using industry-standard Tiled/LDtk tilemaps, server-authoritative physics, and automated visual verification.

---

## 1. Architectural Foundations (The 3 Core Pillars)

### 1.1 Pillar 1: Tiled / LDtk Grid Standard (No Float Guessing)
- **Zero Coordinate Guessing**: Game worlds must **never** rely on arbitrary, hard-coded float coordinates or raw multi-hundred-line canvas `fillRect` primitives that overlap and clash.
- **The $32\text{px}$ Integer Matrix ($48 \times 32$ Grid)**:
  All maps are structured as standard 2D integer GID matrices compatible with Tiled Map Editor (`.tmx` / `.json`) and Phaser 3's native tilemap loader (`this.load.tilemapTiledJSON(...)`).
- **Layered 2.5D Hierarchy**:
  1. `Ground` (`depth: -10`): Meadow grass, tilled loam, cobblestone paths, deep water basins.
  2. `Fences` (`depth: -8`): Enclosure fences and post-and-rail borders.
  3. `Structures` (`depth = Y + Height`): Stalls, cottages, barns with bottom-center anchor origin `(0.5, 1.0)`.
  4. `Overhang` (`depth: 3000`): Roof eaves and treetops that occlude avatars walking behind them.
  5. `Collisions` (`objectgroup`): Footprint rectangles mapping 1:1 to server-authoritative `BLOCKERS`.
  6. `POIs` (`objectgroup`): Interaction zones mapping 1:1 to server `POIS` and `ZONES`.

### 1.2 Pillar 2: Professional Asset Extraction & Zero-Halo Matting
- **The "Divide & Conquer" Rule**: Never ask AI to draw an entire map with baked ground and buildings blended together. Request **isolated modular architecture and props** on solid background.
- **Optimal Prompt Formula**:
  ```text
  Isolated 2D RPG pixel art asset of a [PRODUCE STALL / TIMBER BARN / POND / FENCE],
  Stardew Valley / Pokemon Gen 3 style,
  flat orthographic 3/4 top-down perspective, strictly NO 3D vanishing points, NO camera tilt,
  clean sharp pixel clusters, 32-bit pixel art aesthetic,
  solid magenta background (#FF00FF) OR solid pure white background (#FFFFFF),
  STRICTLY NO soft ground shadows, NO ambient occlusion, NO terrain blending.
  ```
- **Outer Flood-Fill**: Only outer boundary whitespace is removed; internal white details (white curtains, chickens, window glass) are preserved $100\%$.
- **Shadow Stripping**: Automatically removes faint gray ambient occlusion ground shadows beneath buildings to eliminate dirty gray smudges on game grass.
- **Integer Tile Budget Snapping**: Snaps all assets to clean $32\text{px}$ tile budgets using Nearest-Neighbor decimation so pixel density is uniform across all objects.

### 1.3 Pillar 3: Automated Visual Verification (Playwright MCP)
- The agent does not blindly guess visual results.
- Using Playwright and the Playwright MCP server, the agent autonomously launches a headless browser, renders the live game scene, checks console errors, verifies camera bounds, and inspects visual screenshots to guarantee zero overlaps, zero ghost duplicates, and flawless aesthetics.

---

## 2. Living World Animation Pipelines

Every map generated under this skill must incorporate dynamic living animations:

1. **Livestock & Fauna (`livestock_wander`)**:
   - Chickens and cows with Wander AI: walking, pecking, grazing within fence bounds.
   - Interactive: clicking or pressing `E` plays hop tween, floating heart emote ❤️, and sound cue.
2. **Water Bodies (`water_body`)**:
   - Multi-frequency continuous sine-wave ripple lines on surface graphics.
   - Sparkling glistening highlights (`✦`) fading in/out across water.
   - Swimming fish shadows cruising beneath the surface.
   - Rotating waterwheel aerator ($360^\circ$ continuous tween).
3. **Wind & Foliage (`tree_canopy`)**:
   - Sinusoidal canopy rotation oscillation modulated by live wind speed (`WindSystem`).
   - Drifting falling leaf particles emitted from tree canopies.
4. **Atmosphere & Diurnal Props (`chimney_smoke`, `hanging_pendulum`)**:
   - Chimney smoke particles rising, expanding, and drifting with wind vector.
   - Hanging lanterns and shop signs swinging like pendulums with warm breathing night glow.
5. **Agricultural Plots (`dynamic_crops`)**:
   - 4-stage lifecycle binding: `seed` $\to$ `sprout` $\to$ `blooming` $\to$ `mature`.

---

## 3. Bundled CLI Tools

The skill provides production Python and Node.js utilities in `scripts/`:

### 3.1 `build_tiled_farm_pipeline.py`
Builds standard Tiled 32x32 Tileset Atlas and official `farm_map.json`:
```bash
python scripts/build_tiled_farm_pipeline.py
```

### 3.2 `slice_and_defringe.py`
Cleans, defringes, strips ground shadows, and snaps an isolated AI sprite to integer tile budgets:
```bash
python scripts/slice_and_defringe.py -i assets/ai_shop.png -o public/farm/shop_bac_sau.png --budget medium_building --chroma white
```

### 3.3 `place_modular_asset.py`
Composites an isolated sprite onto a designated map slot and outputs the collision blocker coordinates:
```bash
python scripts/place_modular_asset.py -m public/farm/farm_background_crisp.png -s public/farm/shop_bac_sau.png --slot shop_bac_sau -o public/farm/farm_background_crisp.png
```

### 3.4 `outpaint_canvas.py`
Extends a 1:1 pixel art map to the standard $1536 \times 1024$ viewport without stretching or blurring:
```bash
python scripts/outpaint_canvas.py -s docs/design/screen.png -o public/farm/farm_background_crisp.png --target-width 1536 --target-height 1024 --offset-x 96 --offset-y 88
```

---

## 4. Standard 6-Step Execution Sequence

Whenever the user invokes `/skill` or `/map`:

```
Step 1: Input Analysis & Mode Detection
   │ ➔ Mode A: Isolated Modular Sprite (Shop, Barn, Pond)
   │ ➔ Mode B: Full Scene Concept (Whole Map)
   ▼
Step 2: Tile-Grid Alignment & Asset Cleaning
   │ ➔ Clean background, strip ground shadows, snap to integer 32px tile budget.
   ▼
Step 3: Tiled / LDtk Map Synthesis
   │ ➔ Update Tiled JSON layers (Ground, Fences, Structures, Overhang).
   ▼
Step 4: Living Dynamics & Animation Injection
   │ ➔ Spawn wandering livestock, water ripples, aerator, chimney smoke, lanterns.
   ▼
Step 5: Authoritative Game-Data Synchronization
   │ ➔ Synchronize BLOCKERS, POIS, and ZONES in map.ts.
   ▼
Step 6: Automated Quality Gate & Visual Self-Verification
     ➔ Run typecheck, unit tests, eslint, build, and capture Playwright screenshot.
```
