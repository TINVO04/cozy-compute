#!/usr/bin/env python3
"""
tools/asset-pipeline/build_atlas.py

Packs multiple individual PNG sprites into a unified Phaser 3 Texture Atlas.
Generates:
1. atlas.png (stitched RGBA sprite sheet)
2. atlas.json (Phaser 3 JSON Hash format)
"""

import os
import sys
import json
import glob
import math
import argparse
import cv2
import numpy as np

def pack_sprites(input_dir, output_atlas_png, output_atlas_json, padding=2):
    image_paths = sorted(glob.glob(os.path.join(input_dir, "*.png")))
    if not image_paths:
        print(f"No PNG files found in {input_dir}")
        return

    images = []
    for path in image_paths:
        img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        if img is None:
            continue
        if img.shape[2] == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        h, w = img.shape[:2]
        frame_name = os.path.splitext(os.path.basename(path))[0]
        images.append({
            'name': frame_name,
            'img': img,
            'w': w,
            'h': h,
        })

    # Sort images by height descending (Shelf-first packing algorithm)
    images.sort(key=lambda item: item['h'], reverse=True)

    # Estimate atlas size
    total_area = sum((item['w'] + padding) * (item['h'] + padding) for item in images)
    dim = 2 ** math.ceil(math.log2(math.sqrt(total_area * 1.3)))
    atlas_w = max(256, dim)
    
    # Pack rectangles into shelves
    shelves = []
    current_shelf_y = padding
    current_shelf_h = 0
    current_shelf_x = padding

    packed_frames = {}

    for item in images:
        w = item['w']
        h = item['h']

        if current_shelf_x + w + padding > atlas_w:
            # Move to next shelf
            current_shelf_y += current_shelf_h + padding
            current_shelf_x = padding
            current_shelf_h = 0

        current_shelf_h = max(current_shelf_h, h)
        item['x'] = current_shelf_x
        item['y'] = current_shelf_y

        current_shelf_x += w + padding

    total_height = current_shelf_y + current_shelf_h + padding
    atlas_h = 2 ** math.ceil(math.log2(total_height))

    # Render atlas canvas
    atlas_canvas = np.zeros((atlas_h, atlas_w, 4), dtype=np.uint8)

    for item in images:
        x = item['x']
        y = item['y']
        w = item['w']
        h = item['h']
        atlas_canvas[y:y + h, x:x + w] = item['img']

        packed_frames[item['name']] = {
            "frame": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": int(w), "h": int(h)},
            "sourceSize": {"w": int(w), "h": int(h)}
        }

    atlas_data = {
        "frames": packed_frames,
        "meta": {
            "app": "Cozy Compute Atlas Packer",
            "version": "1.0",
            "image": os.path.basename(output_atlas_png),
            "format": "RGBA8888",
            "size": {"w": int(atlas_w), "h": int(atlas_h)},
            "scale": "1"
        }
    }

    os.makedirs(os.path.dirname(os.path.abspath(output_atlas_png)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(output_atlas_json)), exist_ok=True)

    cv2.imwrite(output_atlas_png, atlas_canvas)
    with open(output_atlas_json, 'w', encoding='utf-8') as f:
        json.dump(atlas_data, f, indent=2)

    print(f"Atlas built successfully: {len(images)} sprites -> {output_atlas_png} ({atlas_w}x{atlas_h}px) and {output_atlas_json}")

def main():
    parser = argparse.ArgumentParser(description="Pack sprite directory into Phaser 3 Texture Atlas.")
    parser.add_argument("-i", "--input", required=True, help="Input directory of PNG sprites")
    parser.add_argument("--out-png", required=True, help="Output atlas PNG path")
    parser.add_argument("--out-json", required=True, help="Output atlas JSON path")
    parser.add_argument("--padding", type=int, default=2, help="Padding between sprites (pixels)")

    args = parser.parse_args()
    pack_sprites(args.input, args.out_png, args.out_json, padding=args.padding)

if __name__ == '__main__':
    main()
