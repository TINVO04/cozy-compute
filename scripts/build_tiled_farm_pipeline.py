#!/usr/bin/env python3
"""
Tiled Map Pipeline & Atlas Generator for Sprout Lands.
Part of the `image-to-interactive-map` and `game-crafting` unified architecture.

1. Assembles an official 32x32 integer-scaled Tileset Atlas (`sprout_tileset.png`).
2. Generates an official Tiled Map Editor compatible JSON (`farm_map.json`).
3. Supports 2.5D layer hierarchy: Ground, Structures, Overhang, Collisions, and POIs.
"""

import os
import json
from PIL import Image
import numpy as np

def run():
    sprout_dir = r'apps/web/public/farm/sprout'
    out_dir = r'apps/web/public/farm/tiled'
    os.makedirs(out_dir, exist_ok=True)

    out_atlas_png = os.path.join(out_dir, 'sprout_tileset.png')
    out_tiled_json = os.path.join(out_dir, 'farm_map.json')

    TILE_SIZE = 32 # 16x16 scaled 2x integer scale
    COLS = 48
    ROWS = 32
    MAP_W = COLS * TILE_SIZE
    MAP_H = ROWS * TILE_SIZE

    # Load source sheets
    img_grass = Image.open(os.path.join(sprout_dir, 'Tilesets/Grass.png')).convert('RGBA')
    img_paths = Image.open(os.path.join(sprout_dir, 'Objects/Paths.png')).convert('RGBA')
    img_fences = Image.open(os.path.join(sprout_dir, 'Tilesets/Fences.png')).convert('RGBA')
    img_water = Image.open(os.path.join(sprout_dir, 'Tilesets/Water.png')).convert('RGBA')
    img_tilled = Image.open(os.path.join(sprout_dir, 'Tilesets/Tilled_Dirt.png')).convert('RGBA')
    img_house = Image.open(os.path.join(sprout_dir, 'Tilesets/Wooden House.png')).convert('RGBA')
    img_roof = Image.open(os.path.join(sprout_dir, 'Tilesets/Wooden_House_Roof_Tilset.png')).convert('RGBA')
    img_walls = Image.open(os.path.join(sprout_dir, 'Tilesets/Wooden_House_Walls_Tilset.png')).convert('RGBA')
    img_bridge = Image.open(os.path.join(sprout_dir, 'Objects/Wood_Bridge.png')).convert('RGBA')
    img_coop = Image.open(os.path.join(sprout_dir, 'Objects/Free_Chicken_House.png')).convert('RGBA')
    img_biom = Image.open(os.path.join(sprout_dir, 'Objects/Basic_Grass_Biom_things.png')).convert('RGBA')
    img_furn = Image.open(os.path.join(sprout_dir, 'Objects/Basic_Furniture.png')).convert('RGBA')

    # Build Atlas: 16 columns of 32x32 tiles
    ATLAS_COLS = 16
    tiles_collected = []

    def add_tile_16(sheet, tx, ty):
        crop = sheet.crop((tx * 16, ty * 16, (tx + 1) * 16, (ty + 1) * 16))
        tile_32 = crop.resize((TILE_SIZE, TILE_SIZE), Image.NEAREST)
        tiles_collected.append(tile_32)
        return len(tiles_collected) # 1-based GID

    # 1. Base grass tiles (GID 1..3)
    GID_GRASS_SOLID = add_tile_16(img_grass, 1, 1)
    GID_GRASS_TUFT = add_tile_16(img_grass, 6, 0)
    GID_GRASS_FLOWER = add_tile_16(img_grass, 7, 0)

    # 2. Paths (GID 4..8)
    GID_PATH_CENTER = add_tile_16(img_paths, 1, 1)
    GID_PATH_TOP = add_tile_16(img_paths, 1, 0)
    GID_PATH_BOT = add_tile_16(img_paths, 1, 2)
    GID_PATH_LEFT = add_tile_16(img_paths, 0, 1)
    GID_PATH_RIGHT = add_tile_16(img_paths, 2, 1)

    # 3. Water (GID 9)
    GID_WATER = add_tile_16(img_water, 0, 0)

    # 4. Tilled Dirt (GID 10)
    GID_TILLED = add_tile_16(img_tilled, 1, 1)

    # 5. Fences (GID 11..16)
    GID_FENCE_H = add_tile_16(img_fences, 1, 0)
    GID_FENCE_V = add_tile_16(img_fences, 0, 1)
    GID_FENCE_TL = add_tile_16(img_fences, 0, 0)
    GID_FENCE_TR = add_tile_16(img_fences, 3, 0)
    GID_FENCE_BL = add_tile_16(img_fences, 0, 3)
    GID_FENCE_BR = add_tile_16(img_fences, 3, 3)

    # Pad atlas to full rows
    num_tiles = len(tiles_collected)
    atlas_rows = int(np.ceil(num_tiles / ATLAS_COLS))
    atlas_img = Image.new('RGBA', (ATLAS_COLS * TILE_SIZE, atlas_rows * TILE_SIZE), (0, 0, 0, 0))

    for idx, t in enumerate(tiles_collected):
        col = idx % ATLAS_COLS
        row = idx // ATLAS_COLS
        atlas_img.paste(t, (col * TILE_SIZE, row * TILE_SIZE))

    atlas_img.save(out_atlas_png, 'PNG')
    print(f"Saved Tiled Atlas ({atlas_img.size[0]}x{atlas_img.size[1]}) with {num_tiles} tiles to {out_atlas_png}")

    # Build Tile Layers
    # Ground layer: 48 * 32
    ground_data = [GID_GRASS_SOLID] * (COLS * ROWS)
    fences_data = [0] * (COLS * ROWS)

    def set_ground(c, r, gid):
        if 0 <= c < COLS and 0 <= r < ROWS:
            ground_data[r * COLS + c] = gid

    def set_fence(c, r, gid):
        if 0 <= c < COLS and 0 <= r < ROWS:
            fences_data[r * COLS + c] = gid

    # Subtle grass variations
    rng = np.random.RandomState(42)
    for r in range(ROWS):
        for c in range(COLS):
            val = rng.rand()
            if val > 0.92:
                set_ground(c, r, GID_GRASS_FLOWER)
            elif val > 0.84:
                set_ground(c, r, GID_GRASS_TUFT)

    # Paths: Gateway road
    for c in range(0, 8):
        set_ground(c, 3, GID_PATH_CENTER)
        set_ground(c, 4, GID_PATH_CENTER)

    # Main promenade
    for c in range(6, 28):
        set_ground(c, 8, GID_PATH_CENTER)
        set_ground(c, 9, GID_PATH_CENTER)
    for r in range(3, 9):
        set_ground(6, r, GID_PATH_CENTER)
        set_ground(7, r, GID_PATH_CENTER)

    # Center north-south road
    for r in range(8, 30):
        set_ground(20, r, GID_PATH_CENTER)
        set_ground(21, r, GID_PATH_CENTER)

    # Aquaculture pond water
    for r in range(5, 14):
        for c in range(33, 46):
            if (r == 5 or r == 13) and (c == 33 or c == 45):
                continue
            set_ground(c, r, GID_WATER)

    # 36 Tilled crop beds (6x6 grid in cols 26..43, rows 16..27)
    for prow in range(6):
        for pcol in range(6):
            sc = 26 + pcol * 3
            sr = 16 + prow * 2
            set_ground(sc, sr, GID_TILLED)
            set_ground(sc + 1, sr, GID_TILLED)
            set_ground(sc, sr + 1, GID_TILLED)
            set_ground(sc + 1, sr + 1, GID_TILLED)

    # Fences for poultry coop (cols 3..14, rows 14..20)
    for c in range(4, 14):
        set_fence(c, 14, GID_FENCE_H)
        set_fence(c, 20, GID_FENCE_H)
    for r in range(15, 20):
        set_fence(3, r, GID_FENCE_V)
        set_fence(14, r, GID_FENCE_V)
    set_fence(3, 14, GID_FENCE_TL)
    set_fence(14, 14, GID_FENCE_TR)
    set_fence(3, 20, GID_FENCE_BL)
    set_fence(14, 20, GID_FENCE_BR)

    # Fences for cattle pasture (cols 3..15, rows 23..30)
    for c in range(4, 15):
        set_fence(c, 23, GID_FENCE_H)
        set_fence(c, 30, GID_FENCE_H)
    for r in range(24, 30):
        set_fence(3, r, GID_FENCE_V)
        set_fence(15, r, GID_FENCE_V)
    set_fence(3, 23, GID_FENCE_TL)
    set_fence(15, 23, GID_FENCE_TR)
    set_fence(3, 30, GID_FENCE_BL)
    set_fence(15, 30, GID_FENCE_BR)

    # Collision objects & POIs
    collision_objects = [
        {'id': 1, 'name': 'shop_bac_sau', 'x': 250, 'y': 210, 'width': 250, 'height': 130},
        {'id': 2, 'name': 'silo_warehouse', 'x': 645, 'y': 155, 'width': 270, 'height': 195},
        {'id': 3, 'name': 'aquaculture_pond', 'x': 1055, 'y': 175, 'width': 430, 'height': 225},
        {'id': 4, 'name': 'poultry_coop', 'x': 90, 'y': 460, 'width': 455, 'height': 203},
        {'id': 5, 'name': 'cattle_pasture', 'x': 640, 'y': 725, 'width': 300, 'height': 208},
    ]

    poi_objects = [
        {'id': 101, 'name': 'gate_portal', 'x': 32, 'y': 96, 'width': 64, 'height': 96},
        {'id': 102, 'name': 'shop_counter', 'x': 375, 'y': 360, 'width': 32, 'height': 32},
        {'id': 103, 'name': 'silo_door', 'x': 780, 'y': 365, 'width': 32, 'height': 32},
        {'id': 104, 'name': 'pond_dock', 'x': 1080, 'y': 310, 'width': 32, 'height': 32},
    ]

    tiled_map = {
        'compressionlevel': -1,
        'height': ROWS,
        'width': COLS,
        'infinite': False,
        'layers': [
            {
                'data': ground_data,
                'height': ROWS,
                'width': COLS,
                'id': 1,
                'name': 'Ground',
                'opacity': 1,
                'type': 'tilelayer',
                'visible': True,
                'x': 0,
                'y': 0
            },
            {
                'data': fences_data,
                'height': ROWS,
                'width': COLS,
                'id': 2,
                'name': 'Fences',
                'opacity': 1,
                'type': 'tilelayer',
                'visible': True,
                'x': 0,
                'y': 0
            },
            {
                'draworder': 'topdown',
                'id': 3,
                'name': 'Collisions',
                'objects': collision_objects,
                'opacity': 1,
                'type': 'objectgroup',
                'visible': True,
                'x': 0,
                'y': 0
            },
            {
                'draworder': 'topdown',
                'id': 4,
                'name': 'POIs',
                'objects': poi_objects,
                'opacity': 1,
                'type': 'objectgroup',
                'visible': True,
                'x': 0,
                'y': 0
            }
        ],
        'nextlayerid': 5,
        'nextobjectid': 200,
        'orientation': 'orthogonal',
        'renderorder': 'right-down',
        'tiledversion': '1.10.2',
        'tileheight': TILE_SIZE,
        'tilewidth': TILE_SIZE,
        'tilesets': [
            {
                'columns': ATLAS_COLS,
                'firstgid': 1,
                'image': 'sprout_tileset.png',
                'imageheight': atlas_rows * TILE_SIZE,
                'imagewidth': ATLAS_COLS * TILE_SIZE,
                'margin': 0,
                'name': 'sprout_tiles',
                'spacing': 0,
                'tilecount': num_tiles,
                'tileheight': TILE_SIZE,
                'tilewidth': TILE_SIZE
            }
        ],
        'type': 'map',
        'version': '1.10'
    }

    with open(out_tiled_json, 'w', encoding='utf-8') as f:
        json.dump(tiled_map, f, indent=2)

    print(f"Generated official Tiled Map JSON at {out_tiled_json}")

if __name__ == '__main__':
    run()
