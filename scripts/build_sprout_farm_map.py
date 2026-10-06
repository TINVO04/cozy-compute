"""
Native Procedural Sprout Lands Farm Map Generator.
Generates an authoritative, integer-scaled (2x), zero-fringe farm map canvas (1536x1024)
using the official Sprout Lands 16x16 tileset assets from apps/web/public/farm/sprout/.
"""

import os
from PIL import Image
import numpy as np

def run():
    sprout_dir = r'apps/web/public/farm/sprout'
    out_path = r'apps/web/public/farm/farm_background_crisp.png'
    out_map_design = r'docs/design/sprout_farm_overview.png'

    # Map specs
    COLS = 48
    ROWS = 32
    TILE_SIZE = 32 # 16x16 scaled 2x
    MAP_W = COLS * TILE_SIZE # 1536
    MAP_H = ROWS * TILE_SIZE # 1024

    # Load source sheets (native 16x16 tiles)
    img_grass = Image.open(os.path.join(sprout_dir, 'Tilesets/Grass.png')).convert('RGBA')
    img_fences = Image.open(os.path.join(sprout_dir, 'Tilesets/Fences.png')).convert('RGBA')
    img_water = Image.open(os.path.join(sprout_dir, 'Tilesets/Water.png')).convert('RGBA')
    img_tilled = Image.open(os.path.join(sprout_dir, 'Tilesets/Tilled_Dirt.png')).convert('RGBA')
    img_house = Image.open(os.path.join(sprout_dir, 'Tilesets/Wooden House.png')).convert('RGBA')
    img_roof = Image.open(os.path.join(sprout_dir, 'Tilesets/Wooden_House_Roof_Tilset.png')).convert('RGBA')
    img_walls = Image.open(os.path.join(sprout_dir, 'Tilesets/Wooden_House_Walls_Tilset.png')).convert('RGBA')
    img_paths = Image.open(os.path.join(sprout_dir, 'Objects/Paths.png')).convert('RGBA')
    img_bridge = Image.open(os.path.join(sprout_dir, 'Objects/Wood_Bridge.png')).convert('RGBA')
    img_coop_shed = Image.open(os.path.join(sprout_dir, 'Objects/Free_Chicken_House.png')).convert('RGBA')
    img_biom = Image.open(os.path.join(sprout_dir, 'Objects/Basic_Grass_Biom_things.png')).convert('RGBA')
    img_furn = Image.open(os.path.join(sprout_dir, 'Objects/Basic_Furniture.png')).convert('RGBA')
    img_items = Image.open(os.path.join(sprout_dir, 'Objects/Basic_tools_and_meterials.png')).convert('RGBA')
    img_milk = Image.open(os.path.join(sprout_dir, 'Objects/Simple_Milk_and_grass_item.png')).convert('RGBA')
    img_nests = Image.open(os.path.join(sprout_dir, 'Characters/Egg_And_Nest.png')).convert('RGBA')

    # Base canvas
    canvas = Image.new('RGBA', (MAP_W, MAP_H), (192, 212, 112, 255)) # Warm Sprout grass color

    def get_tile(sheet, tx, ty, tw=1, th=1):
        crop = sheet.crop((tx * 16, ty * 16, (tx + tw) * 16, (ty + th) * 16))
        return crop.resize((tw * TILE_SIZE, th * TILE_SIZE), Image.NEAREST)

    def draw_tile(tx, ty, tile_img, off_x=0, off_y=0):
        canvas.paste(tile_img, (tx * TILE_SIZE + off_x, ty * TILE_SIZE + off_y), tile_img)

    # 1. Base Meadow Grass
    base_grass_1 = get_tile(img_grass, 1, 1) # Standard solid grass
    base_grass_2 = get_tile(img_grass, 6, 0) # Subtle grass tuft
    base_grass_3 = get_tile(img_grass, 7, 0) # Small flower tuft

    rng = np.random.RandomState(42)
    for r in range(ROWS):
        for c in range(COLS):
            val = rng.rand()
            if val < 0.85:
                draw_tile(c, r, base_grass_1)
            elif val < 0.94:
                draw_tile(c, r, base_grass_2)
            else:
                draw_tile(c, r, base_grass_3)

    # 2. Dirt Footpaths (Paths.png)
    # Center path tile is at (1, 1) in Paths.png
    path_center = get_tile(img_paths, 1, 1)
    path_edge_top = get_tile(img_paths, 1, 0)
    path_edge_bot = get_tile(img_paths, 1, 2)
    path_edge_left = get_tile(img_paths, 0, 1)
    path_edge_right = get_tile(img_paths, 2, 1)

    # Layout promenade:
    # A. Gateway trail: cols 0..6, rows 3..4
    for c in range(0, 6):
        draw_tile(c, 3, path_center)
        draw_tile(c, 4, path_center)

    # B. Main East-West Promenade: row 8..9 from col 5 to 26
    for c in range(5, 27):
        draw_tile(c, 8, path_center)
        draw_tile(c, 9, path_center)

    # C. North-South Connector to gate: cols 5..6, rows 3..8
    for r in range(3, 9):
        draw_tile(5, r, path_center)
        draw_tile(6, r, path_center)

    # D. Central Crossroads & South Path: cols 20..22, rows 9..30
    for r in range(9, 31):
        draw_tile(20, r, path_center)
        draw_tile(21, r, path_center)

    # E. Trail to Fishing Pond: rows 8..9 from col 26 to 30
    for c in range(26, 31):
        draw_tile(c, 8, path_center)
        draw_tile(c, 9, path_center)

    # F. Spur into Chicken Coop: col 13..15, row 15
    for c in range(13, 16):
        draw_tile(c, 15, path_center)

    # G. Spur into Cow Pasture: col 14..16, row 24
    for c in range(14, 17):
        draw_tile(c, 24, path_center)

    # 3. Aquaculture Pond (Water.png and shoreline)
    # Deep water basin in cols 30..45, rows 4..13
    water_tile_1 = get_tile(img_water, 0, 0)
    # Shoreline grass bitmasks
    water_edge_top = get_tile(img_grass, 1, 2)
    water_edge_bot = get_tile(img_grass, 1, 0)
    water_edge_left = get_tile(img_grass, 2, 1)
    water_edge_right = get_tile(img_grass, 0, 1)
    water_corner_tl = get_tile(img_grass, 2, 2)
    water_corner_tr = get_tile(img_grass, 0, 2)
    water_corner_bl = get_tile(img_grass, 2, 0)
    water_corner_br = get_tile(img_grass, 0, 0)

    for r in range(4, 14):
        for c in range(30, 46):
            if (r == 4 or r == 13) and (c == 30 or c == 45):
                continue # soften corners
            draw_tile(c, r, water_tile_1)

    # Wooden Fishing Pier Dock (Wood_Bridge.png: 5 cols, 3 rows of 16x16)
    # Bridge vertical pier spanning into water: cols 29..32, row 9
    pier_tile = get_tile(img_bridge, 0, 0, 3, 2)
    draw_tile(28, 8, pier_tile)

    # 4. Fences (Fences.png: 4x4 tiles)
    fence_h = get_tile(img_fences, 1, 0) # horizontal fence
    fence_v = get_tile(img_fences, 0, 1) # vertical fence
    fence_tl = get_tile(img_fences, 0, 0) # top-left post
    fence_tr = get_tile(img_fences, 3, 0) # top-right post
    fence_bl = get_tile(img_fences, 0, 3) # bottom-left post
    fence_br = get_tile(img_fences, 3, 3) # bottom-right post

    # A. Chuồng Gia Cầm (Gà & Vịt): cols 4..14, rows 13..20
    # Top fence
    for c in range(5, 14):
        draw_tile(c, 13, fence_h)
    # Bottom fence (leave opening at col 13 for gate)
    for c in range(5, 13):
        draw_tile(c, 20, fence_h)
    # Left fence
    for r in range(14, 20):
        draw_tile(4, r, fence_v)
    # Right fence
    for r in range(14, 20):
        draw_tile(14, r, fence_v)
    # Corners
    draw_tile(4, 13, fence_tl)
    draw_tile(14, 13, fence_tr)
    draw_tile(4, 20, fence_bl)
    draw_tile(14, 20, fence_br)

    # B. Đồng Cỏ Bò Sữa: cols 4..15, rows 22..30
    for c in range(5, 15):
        draw_tile(c, 22, fence_h)
    for c in range(5, 15):
        draw_tile(c, 30, fence_h)
    for r in range(23, 30):
        draw_tile(4, r, fence_v)
    for r in range(23, 30):
        draw_tile(15, r, fence_v)
    draw_tile(4, 22, fence_tl)
    draw_tile(15, 22, fence_tr)
    draw_tile(4, 30, fence_bl)
    draw_tile(15, 30, fence_br)

    # 5. Buildings
    # A. Tiệm Nông Nghiệp Bác Sáu: cols 7..12, rows 3..7
    # Wooden House prefab is 7x5 tiles of 16x16 -> 7x5 tiles of 32x32
    house_shop = get_tile(img_house, 0, 0, 7, 5)
    draw_tile(7, 3, house_shop)

    # Produce tables & merchant props in front of shop
    chest_prop = get_tile(img_furn, 0, 2, 2, 2)
    draw_tile(6, 6, chest_prop)
    tools_prop = get_tile(img_items, 0, 0, 2, 1)
    draw_tile(12, 6, tools_prop)

    # B. Nhà Kho Nông Sản Silo: cols 16..22, rows 3..7
    # 2-story country barn with tiled roof
    barn_roof = get_tile(img_roof, 0, 0, 7, 3)
    barn_wall = get_tile(img_walls, 0, 0, 5, 2)
    draw_tile(16, 2, barn_roof)
    draw_tile(17, 5, barn_wall)

    # Grain silo / hay bales & crates near barn
    hay_bale = get_tile(img_biom, 6, 2, 2, 2)
    draw_tile(23, 5, hay_bale)

    # C. Chicken coop little house inside poultry yard
    # Free_Chicken_House.png is 3x3 tiles of 16x16 (48x48) -> 3x3 tiles of 32x32 (96x96)
    chicken_shed = get_tile(img_coop_shed, 0, 0, 3, 3)
    draw_tile(5, 14, chicken_shed)

    # Egg nests inside chicken yard
    egg_nest = get_tile(img_nests, 0, 0, 2, 1)
    draw_tile(9, 14, egg_nest)
    draw_tile(12, 14, egg_nest)

    # D. Dairy cow feeder & milk cans inside cow pasture
    milk_can = get_tile(img_milk, 0, 0, 2, 1)
    draw_tile(6, 23, milk_can)
    feed_trough = get_tile(img_biom, 6, 0, 3, 2)
    draw_tile(9, 23, feed_trough)

    # 6. Central Heart (Trái Tim Nông Trại: cols 18..25, rows 12..17)
    # Shady oak tree (from Basic_Grass_Biom_things.png: 3x3 tiles of 16x16)
    oak_tree = get_tile(img_biom, 0, 0, 3, 3)
    draw_tile(17, 11, oak_tree)

    # Resting bench & well
    bench = get_tile(img_furn, 4, 3, 2, 1)
    draw_tile(22, 12, bench)
    stone_well = get_tile(img_biom, 3, 0, 2, 2)
    draw_tile(20, 13, stone_well)

    # 7. Agricultural 36 Plots Field (Tilled Dirt 6x6 grid)
    # Layout 36 plots in cols 26..44, rows 16..29
    # Each plot is 2x2 tiles (64x64 px) with 1 tile spacing (32 px)
    # 6 cols * 3 tiles = 18 tiles (cols 26..43)
    # 6 rows * 2 tiles = 12 tiles (rows 16..27)
    tilled_center = get_tile(img_tilled, 1, 1)

    for prow in range(6):
        for pcol in range(6):
            start_c = 26 + pcol * 3
            start_r = 16 + prow * 2
            # 2x2 tilled bed
            draw_tile(start_c, start_r, tilled_center)
            draw_tile(start_c + 1, start_r, tilled_center)
            draw_tile(start_c, start_r + 1, tilled_center)
            draw_tile(start_c + 1, start_r + 1, tilled_center)

    # Save outputs
    canvas.save(out_path, format='PNG', optimize=True)
    canvas.save(out_map_design, format='PNG')
    print(f"Generated clean native Sprout Lands farm map (1536x1024) at {out_path} and {out_map_design}")

if __name__ == '__main__':
    run()
