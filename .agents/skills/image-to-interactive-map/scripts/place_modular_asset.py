#!/usr/bin/env python3
"""
Slot-Based Modular Asset Placement and Map Compositor.
Part of the `image-to-interactive-map` skill.

Composites an isolated sprite onto a designated map slot coordinate,
updates the master background, and exports the collision blocker coordinates.
"""

import os
import json
import argparse
import cv2
import numpy as np

# Authoritative Farm Landmarks Grid Slots (X, Y)
FARM_SLOTS = {
    'shop_bac_sau': {'x': 188, 'y': 348, 'slot_w': 264, 'slot_h': 112, 'desc': 'Tiệm Nông Nghiệp Bác Sáu'},
    'silo_warehouse': {'x': 741, 'y': 192, 'slot_w': 134, 'slot_h': 137, 'desc': 'Nhà Kho Nông Sản Silo'},
    'farm_barn_main': {'x': 417, 'y': 177, 'slot_w': 257, 'slot_h': 195, 'desc': 'Nhà Chính Trang Trại'},
    'aquaculture_pond': {'x': 138, 'y': 649, 'slot_w': 309, 'slot_h': 247, 'desc': 'Ao Thủy Sản'},
    'poultry_coop': {'x': 217, 'y': 615, 'slot_w': 144, 'slot_h': 126, 'desc': 'Chuồng Gia Cầm'},
    'cattle_pasture': {'x': 363, 'y': 648, 'slot_w': 111, 'slot_h': 127, 'desc': 'Đồng Cỏ Bò Sữa'},
    'stone_well': {'x': 567, 'y': 416, 'slot_w': 68, 'slot_h': 55, 'desc': 'Giếng Nước Cổ'},
    'oak_tree': {'x': 1097, 'y': 463, 'slot_w': 225, 'slot_h': 200, 'desc': 'Cây Sồi Cổ Thụ'},
}

def place_sprite_on_map(map_path, sprite_path, slot_name, out_map_path=None):
    if slot_name not in FARM_SLOTS:
        raise ValueError(f"Unknown slot '{slot_name}'. Available slots: {list(FARM_SLOTS.keys())}")

    map_bgr = cv2.imread(map_path)
    if map_bgr is None:
        raise FileNotFoundError(f"Could not load map image: {map_path}")

    sprite_rgba = cv2.imread(sprite_path, cv2.IMREAD_UNCHANGED)
    if sprite_rgba is None:
        raise FileNotFoundError(f"Could not load sprite image: {sprite_path}")

    slot = FARM_SLOTS[slot_name]
    target_x, target_y = slot['x'], slot['y']
    sw, sh = sprite_rgba.shape[1], sprite_rgba.shape[0]

    print(f"Placing '{sprite_path}' ({sw}x{sh}) onto slot '{slot_name}' at ({target_x}, {target_y})")

    # Alpha composite
    composite = map_bgr.copy()
    patch = composite[target_y:target_y+sh, target_x:target_x+sw]
    if patch.shape[:2] != (sh, sw):
        raise ValueError(f"Sprite dimensions ({sw}x{sh}) exceed map bounds at ({target_x}, {target_y})")

    s_bgr = sprite_rgba[:, :, :3]
    s_alpha = sprite_rgba[:, :, 3].astype(float) / 255.0
    s_alpha_3d = np.dstack([s_alpha, s_alpha, s_alpha])

    blended = (s_bgr.astype(float) * s_alpha_3d + patch.astype(float) * (1.0 - s_alpha_3d)).astype(np.uint8)
    composite[target_y:target_y+sh, target_x:target_x+sw] = blended

    if out_map_path:
        os.makedirs(os.path.dirname(out_map_path) or '.', exist_ok=True)
        cv2.imwrite(out_map_path, composite)
        print(f"Updated composite map saved to {out_map_path}")

    # Generate game data blocker footprint
    footprint = {
        'slot': slot_name,
        'description': slot['desc'],
        'position': [target_x, target_y],
        'size': [sw, sh],
        'blocker_rect': {
            'x': target_x,
            'y': target_y + int(sh * 0.65),
            'w': sw,
            'h': int(sh * 0.35)
        },
        'door_interaction': {
            'x': target_x + sw // 2,
            'y': target_y + sh + 10
        },
        'depth': target_y + sh
    }
    print(f"\n--- Authoritative Game-Data Blocker ---")
    print(json.dumps(footprint, indent=2))
    return footprint

def main():
    parser = argparse.ArgumentParser(description="Place isolated sprite onto map slot.")
    parser.add_argument("--map", "-m", required=True, help="Base map image path")
    parser.add_argument("--sprite", "-s", required=True, help="Clean RGBA sprite PNG path")
    parser.add_argument("--slot", required=True, choices=list(FARM_SLOTS.keys()), help="Target slot name")
    parser.add_argument("--output", "-o", default=None, help="Output map path")

    args = parser.parse_args()
    place_sprite_on_map(args.map, args.sprite, args.slot, args.output)

if __name__ == '__main__':
    main()
