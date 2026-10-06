#!/usr/bin/env python3
"""
tools/asset-pipeline/snap_tile_budget.py

Snaps sprite dimensions to strict integer multiples of 32px.
Supports two modes:
1. 'pad': Centers sprite horizontally and aligns it to the bottom with transparent padding to fit the tile budget.
2. 'scale': Resizes using Nearest-Neighbor interpolation to preserve pixel art crispness.
"""

import os
import sys
import argparse
import cv2
import numpy as np

def snap_to_budget(input_path, output_path, tile_w, tile_h, mode='pad'):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"Could not decode image at {input_path}")

    # Ensure RGBA
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    target_w = tile_w * 32
    target_h = tile_h * 32

    src_h, src_w, _ = img.shape

    if mode == 'scale':
        result = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_NEAREST)
    else:
        # 'pad' mode: Place sprite aligned bottom-center
        result = np.zeros((target_h, target_w, 4), dtype=np.uint8)

        # Scale down if sprite exceeds budget
        if src_w > target_w or src_h > target_h:
            scale = min(target_w / src_w, target_h / src_h)
            new_w = max(1, int(src_w * scale))
            new_h = max(1, int(src_h * scale))
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_NEAREST)
            src_h, src_w, _ = img.shape

        offset_x = (target_w - src_w) // 2
        offset_y = target_h - src_h  # align to bottom

        result[offset_y:offset_y + src_h, offset_x:offset_x + src_w] = img

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    cv2.imwrite(output_path, result)
    print(f"Snapped {input_path} -> {output_path} ({target_w}x{target_h}px, {tile_w}x{tile_h} tiles, mode={mode})")

def main():
    parser = argparse.ArgumentParser(description="Snap sprite into exact 32px tile budget.")
    parser.add_argument("-i", "--input", required=True, help="Input PNG image")
    parser.add_argument("-o", "--output", required=True, help="Output PNG destination")
    parser.add_argument("--tile-w", type=int, required=True, help="Width in 32px tiles")
    parser.add_argument("--tile-h", type=int, required=True, help="Height in 32px tiles")
    parser.add_argument("--mode", choices=['pad', 'scale'], default='pad', help="Snapping mode ('pad' or 'scale')")

    args = parser.parse_args()
    snap_to_budget(args.input, args.output, args.tile_w, args.tile_h, mode=args.mode)

if __name__ == '__main__':
    main()
