#!/usr/bin/env python3
"""
tools/asset-pipeline/slice_and_defringe.py

Production Sprite Slicing, Defringing, Shadow Stripping, and Tile-Snapping Engine.
Conforms strictly to Cozy Compute Style Guide (32x32px integer grid, Magenta/Green Chroma Key).
"""

import os
import sys
import json
import argparse
import cv2
import numpy as np

# Standard Game Tile Budgets (Width x Height in 32px tiles)
TILE_BUDGETS = {
    '1x1': (1, 1),       # 32x32   (small props, avatars, crops, chickens)
    '1x2': (1, 2),       # 32x64   (bamboo, lamp posts, fences)
    '2x1': (2, 1),       # 64x32   (market counters, benches)
    '2x2': (2, 2),       # 64x64   (medium trees, wells, small sheds)
    '2x3': (2, 3),       # 64x96   (fruit trees, mango trees, grain silos)
    '3x3': (3, 3),       # 96x96   (large trees, produce stalls, gazebos)
    '4x3': (4, 3),       # 128x96  (chicken coops, small cottages)
    '4x4': (4, 4),       # 128x128 (rural farmhouses, residential houses)
    '5x4': (5, 4),       # 160x128 (large barns, warehouses)
}

def compute_floodfill_alpha(bgr, chroma='magenta'):
    """
    Computes alpha matte using outer-boundary connected flood fill.
    Protects internal details with the same color from being punched out.
    """
    h, w, _ = bgr.shape
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(float)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(float)
    sat = hsv[:, :, 1]

    if chroma == 'magenta':
        # Magenta: High Blue, Low Green, High Red
        is_bg_candidate = (bgr[:, :, 0] > 160) & (bgr[:, :, 1] < 80) & (bgr[:, :, 2] > 160)
    elif chroma == 'green':
        # Green: Low Blue, High Green, Low Red
        is_bg_candidate = (bgr[:, :, 0] < 80) & (bgr[:, :, 1] > 160) & (bgr[:, :, 2] < 80)
    else:
        # White / Light Gray
        is_bg_candidate = (gray >= 235) | ((gray >= 215) & (sat < 30))

    bg_seed = is_bg_candidate.astype(np.uint8)
    flood_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)

    # Flood fill from image borders
    for x in range(0, w, max(1, w // 20)):
        if bg_seed[0, x]:
            cv2.floodFill(bg_seed, flood_mask, (x, 0), 2)
        if bg_seed[h - 1, x]:
            cv2.floodFill(bg_seed, flood_mask, (x, h - 1), 2)
    for y in range(0, h, max(1, h // 20)):
        if bg_seed[y, 0]:
            cv2.floodFill(bg_seed, flood_mask, (0, y), 2)
        if bg_seed[y, w - 1]:
            cv2.floodFill(bg_seed, flood_mask, (w - 1, y), 2)

    is_bg = (bg_seed == 2)
    alpha = np.where(is_bg, 0.0, 1.0)
    return alpha

def strip_ground_shadows(bgr, alpha):
    """
    Removes faint gray ambient occlusion ground shadows.
    """
    h, w, _ = bgr.shape
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(float)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(float)
    sat = hsv[:, :, 1]

    # Neutral gray shadow on bottom 35% of image
    is_shadow = (
        (gray > 100) & (gray < 225) &
        (sat < 25) &
        (alpha > 0.0)
    )

    bottom_zone = int(h * 0.65)
    shadow_mask = np.zeros((h, w), dtype=bool)
    shadow_mask[bottom_zone:, :] = is_shadow[bottom_zone:, :]

    alpha_clean = alpha.copy()
    alpha_clean[shadow_mask] = 0.0
    return alpha_clean

def defringe_color(bgr, alpha, chroma='magenta'):
    """
    Unmultiplies and cleans fringe halos on anti-aliased edges.
    """
    alpha_3d = np.repeat(alpha[:, :, np.newaxis], 3, axis=2)
    bgr_clean = bgr.astype(float).copy()

    if chroma == 'magenta':
        chroma_bgr = np.array([255.0, 0.0, 255.0])
    elif chroma == 'green':
        chroma_bgr = np.array([0.0, 255.0, 0.0])
    else:
        chroma_bgr = np.array([255.0, 255.0, 255.0])

    fringe_mask = (alpha > 0.05) & (alpha < 0.95)
    for c in range(3):
        bgr_clean[:, :, c] = np.where(
            fringe_mask,
            np.clip((bgr[:, :, c] - (1.0 - alpha) * chroma_bgr[c]) / np.maximum(alpha, 0.05), 0, 255),
            bgr[:, :, c]
        )

    rgba = np.dstack([
        bgr_clean.astype(np.uint8),
        (alpha * 255).astype(np.uint8)
    ])
    return rgba

def process_sprite(input_path, output_path, chroma='magenta', budget=None, strip_shadows=True, tight_crop=True):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    bgr = cv2.imread(input_path)
    if bgr is None:
        raise ValueError(f"Could not decode image at {input_path}")

    h, w, _ = bgr.shape
    alpha = compute_floodfill_alpha(bgr, chroma=chroma)

    if strip_shadows:
        alpha = strip_ground_shadows(bgr, alpha)

    rgba = defringe_color(bgr, alpha, chroma=chroma)

    # Tight crop to alpha bounding box
    opaque_indices = np.where(rgba[:, :, 3] > 10)
    if len(opaque_indices[0]) > 0:
        ymin, ymax = np.min(opaque_indices[0]), np.max(opaque_indices[0]) + 1
        xmin, xmax = np.min(opaque_indices[1]), np.max(opaque_indices[1]) + 1
        cropped = rgba[ymin:ymax, xmin:xmax]
    else:
        cropped = rgba

    if budget and budget in TILE_BUDGETS:
        tb_w, tb_h = TILE_BUDGETS[budget]
        target_w = tb_w * 32
        target_h = tb_h * 32
        # Resize nearest neighbor to preserve crisp pixel clusters
        final_img = cv2.resize(cropped, (target_w, target_h), interpolation=cv2.INTER_NEAREST)
    else:
        final_img = cropped

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    cv2.imwrite(output_path, final_img)
    print(f"Successfully processed {input_path} -> {output_path} ({final_img.shape[1]}x{final_img.shape[0]}px)")
    return final_img

def main():
    parser = argparse.ArgumentParser(description="Clean, defringe, and snap AI-generated sprite.")
    parser.add_argument("-i", "--input", required=True, help="Path to raw AI generation PNG")
    parser.add_argument("-o", "--output", required=True, help="Destination PNG path")
    parser.add_argument("--chroma", choices=['magenta', 'green', 'white'], default='magenta', help="Chroma key background color")
    parser.add_argument("--budget", choices=list(TILE_BUDGETS.keys()), default=None, help="Integer 32px tile budget")
    parser.add_argument("--no-strip-shadows", action="store_true", help="Do not strip ground ambient shadow")

    args = parser.parse_args()
    process_sprite(
        input_path=args.input,
        output_path=args.output,
        chroma=args.chroma,
        budget=args.budget,
        strip_shadows=not args.no_strip_shadows
    )

if __name__ == '__main__':
    main()
