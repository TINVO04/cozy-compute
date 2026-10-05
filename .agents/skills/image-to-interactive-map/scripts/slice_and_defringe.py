#!/usr/bin/env python3
"""
Advanced Sprite Slicing, Defringing, Shadow Stripping, and Tile-Snapping Engine.
Core script of the `image-to-interactive-map` skill.

Key capabilities:
1. Outer-Connected Flood Fill: Protects internal white details (white windows, white fences, white chickens)
   from being punched out as background holes.
2. Ground Shadow Stripping: Eliminates AI's soft gray ambient occlusion shadows on the ground that cause
   dirty gray smudges when placed on game terrain.
3. Multi-Chroma Support: Handles pure white (#FFFFFF), chroma magenta (#FF00FF), and green (#00FF00).
4. Unmultiplied Color Defringing: Unmultiplies color channels to remove all halo fringes on anti-aliased edges.
5. Integer Tile-Budget Snapping: Snaps extracted sprites to integer game tile units (32x32px) using
   nearest-neighbor interpolation so pixel density matches the game world perfectly.
"""

import os
import sys
import json
import argparse
import cv2
import numpy as np

# Standard Game Tile Budgets (Width x Height in 32px tiles)
TILE_BUDGETS = {
    'small_prop': (1, 1),       # 32x32   (chest, crate, lamp, sack)
    'medium_prop': (2, 1),      # 64x32   (bench, market stall, bulletin board)
    'large_prop': (2, 2),       # 64x64   (stone well, waterwheel aerator, chicken shed)
    'tree_medium': (3, 3),      # 96x96   (fruit tree, shade pine)
    'tree_large': (4, 4),       # 128x128 (ancient oak tree)
    'small_building': (4, 3),   # 128x96  (chicken coop, tool shed)
    'medium_building': (7, 4),  # 224x128 (shop bac sau, timber cottage)
    'large_building': (7, 5),   # 224x160 (warehouse silo, 2-story barn)
    'pond_basin': (10, 8),      # 320x256 (aquaculture pond)
}

def compute_floodfill_alpha(bgr, chroma='white'):
    """
    Computes alpha matte using outer-boundary connected flood fill.
    Ensures internal white objects (windows, chickens, flowers) are NEVER erased.
    """
    h, w, _ = bgr.shape
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(float)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(float)
    sat = hsv[:, :, 1]

    if chroma == 'magenta':
        # Magenta: High Blue, Low Green, High Red
        is_bg_candidate = (bgr[:, :, 0] > 180) & (bgr[:, :, 1] < 70) & (bgr[:, :, 2] > 180)
    elif chroma == 'green':
        # Green: Low Blue, High Green, Low Red
        is_bg_candidate = (bgr[:, :, 0] < 70) & (bgr[:, :, 1] > 180) & (bgr[:, :, 2] < 70)
    else:
        # White / Light Gray:
        # High luminance (>= 225) and low saturation (< 35)
        is_bg_candidate = (gray >= 235) | ((gray >= 215) & (sat < 30))

    # Outer-boundary flood fill: only background connected to image corners is marked
    bg_seed = is_bg_candidate.astype(np.uint8)
    flood_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)

    # Flood fill from all 4 corners and along the entire perimeter
    for x in range(w):
        if bg_seed[0, x] == 1:
            cv2.floodFill(bg_seed, flood_mask, (x, 0), 2)
        if bg_seed[h - 1, x] == 1:
            cv2.floodFill(bg_seed, flood_mask, (x, h - 1), 2)
    for y in range(h):
        if bg_seed[y, 0] == 1:
            cv2.floodFill(bg_seed, flood_mask, (0, y), 2)
        if bg_seed[y, w - 1] == 1:
            cv2.floodFill(bg_seed, flood_mask, (w - 1, y), 2)

    is_outer_bg = (flood_mask[1:-1, 1:-1] == 1) | (bg_seed == 2)

    # Smooth transition for anti-aliased edge pixels
    alpha = np.ones_like(gray, dtype=float)
    alpha[is_outer_bg] = 0.0

    # Defringe transition pixels near the boundary
    # Morphological gradient to identify edge boundary
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    boundary = cv2.morphologyEx((~is_outer_bg).astype(np.uint8), cv2.MORPH_GRADIENT, kernel)
    transition = (boundary > 0) & (gray > 195) & (sat < 40)
    alpha[transition] = np.clip((230.0 - gray[transition]) / 35.0, 0.0, 1.0)

    # Unmultiply color fringe from background
    a_3d = np.dstack([alpha, alpha, alpha])
    if chroma == 'white':
        bg_col = 255.0
    elif chroma == 'magenta':
        bg_col = np.array([255.0, 0.0, 255.0])
    else:
        bg_col = np.array([0.0, 255.0, 0.0])

    unmultiplied = np.where(
        a_3d > 0.05,
        np.clip((bgr.astype(float) - (1.0 - a_3d) * bg_col) / np.maximum(a_3d, 0.05), 0, 255),
        bgr
    )

    rgba = np.dstack([unmultiplied.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    return rgba, alpha

def strip_ground_shadows(rgba):
    """
    Strips faint ground shadows (semi-transparent gray smudges beneath the sprite)
    so the building sits cleanly on game grass without dirty borders.
    """
    alpha = rgba[:, :, 3].copy()
    bgr = rgba[:, :, :3]
    h, w = alpha.shape

    # Find the main solid body (alpha > 200)
    solid = alpha > 200
    if not np.any(solid):
        return rgba

    y_solid, _ = np.where(solid)
    bottom_solid_y = y_solid.max()

    # Pixels in the bottom 15% of the sprite with low alpha (< 140) and low saturation
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    sat = hsv[:, :, 1]
    is_faint_gray_shadow = (alpha > 0) & (alpha < 130) & (sat < 45)

    # Clear faint shadow beneath the solid bottom
    for y in range(bottom_solid_y - 4, h):
        for x in range(w):
            if is_faint_gray_shadow[y, x]:
                alpha[y, x] = 0

    rgba[:, :, 3] = alpha
    return rgba

def snap_to_tile_budget(sprite_rgba, budget_name=None, tile_px=32):
    """
    Scales sprite to nearest clean integer tile units (32px) using Nearest-Neighbor
    to preserve 100% crisp pixel art without density mismatch.
    """
    h, w = sprite_rgba.shape[:2]
    if budget_name and budget_name in TILE_BUDGETS:
        tw, th = TILE_BUDGETS[budget_name]
        target_w = tw * tile_px
        target_h = th * tile_px
    else:
        # Auto-detect nearest tile budget based on aspect ratio and size
        target_w = max(tile_px, int(round(w / tile_px) * tile_px))
        target_h = max(tile_px, int(round(h / tile_px) * tile_px))

    if (w, h) == (target_w, target_h):
        return sprite_rgba

    # Nearest-neighbor resize guarantees zero pixel blur
    snapped = cv2.resize(sprite_rgba, (target_w, target_h), interpolation=cv2.INTER_NEAREST)
    return snapped

def process_isolated_asset(input_path, output_path, chroma='white', strip_shadow=True, budget_name=None, anim_type=None):
    bgr = cv2.imread(input_path)
    if bgr is None:
        raise FileNotFoundError(f"Could not read image: {input_path}")

    h, w, _ = bgr.shape
    print(f"Processing isolated asset: {w}x{h} ({input_path})")

    # 1. Outer flood-fill alpha matting
    rgba, alpha = compute_floodfill_alpha(bgr, chroma=chroma)

    # 2. Ground shadow stripping
    if strip_shadow:
        rgba = strip_ground_shadows(rgba)

    # 3. Crop tightly to visible content bounding box
    vis_mask = rgba[:, :, 3] > 20
    if np.any(vis_mask):
        y_idx, x_idx = np.where(vis_mask)
        min_y, max_y = y_idx.min(), y_idx.max()
        min_x, max_x = x_idx.min(), x_idx.max()
        rgba_cropped = rgba[min_y:max_y+1, min_x:max_x+1]
    else:
        rgba_cropped = rgba

    # 4. Snap to clean integer tile budget if specified
    if budget_name:
        rgba_final = snap_to_tile_budget(rgba_cropped, budget_name=budget_name)
    else:
        rgba_final = rgba_cropped

    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    cv2.imwrite(output_path, rgba_final)
    print(f"Clean sprite saved: {rgba_final.shape[1]}x{rgba_final.shape[0]} at {output_path}")

    # Auto-detect animation type if not specified
    detected_anim = anim_type
    if not detected_anim or detected_anim == 'auto':
        lower_name = (os.path.basename(output_path) + (budget_name or '')).lower()
        if 'tree' in lower_name:
            detected_anim = 'tree_canopy'
        elif 'pond' in lower_name or 'water' in lower_name:
            detected_anim = 'water_body'
        elif 'chimney' in lower_name or 'stove' in lower_name:
            detected_anim = 'chimney_smoke'
        elif 'lantern' in lower_name or 'sign' in lower_name:
            detected_anim = 'hanging_pendulum'
        elif 'wheel' in lower_name or 'aerator' in lower_name:
            detected_anim = 'rotating_wheel'
        elif 'chicken' in lower_name or 'cow' in lower_name or 'pig' in lower_name:
            detected_anim = 'livestock_wander'
        else:
            detected_anim = 'static'

    # Generate game engine integration metadata
    fw, fh = rgba_final.shape[1], rgba_final.shape[0]
    metadata = {
        'file': os.path.basename(output_path),
        'size': [fw, fh],
        'origin': [0.5, 1.0],  # Bottom-center origin for depth sorting
        'animation_type': detected_anim,
        'animation_config': {
            'wind_responsive': detected_anim in ['tree_canopy', 'chimney_smoke', 'hanging_pendulum'],
            'night_responsive': detected_anim in ['hanging_pendulum'],
        },
        'footprint_hitbox': {
            'offsetX': 0,
            'offsetY': int(fh * 0.65),  # Hitbox covers bottom 35% of building
            'w': fw,
            'h': int(fh * 0.35)
        },
        'door_interaction': {
            'x': fw // 2,
            'y': fh + 10
        }
    }
    meta_path = os.path.splitext(output_path)[0] + '.json'
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved game integration metadata to {meta_path}")
    return metadata

def main():
    parser = argparse.ArgumentParser(description="Clean, defringe, strip shadow, and snap isolated game sprite.")
    parser.add_argument("--input", "-i", required=True, help="Input asset image")
    parser.add_argument("--output", "-o", required=True, help="Output clean RGBA PNG")
    parser.add_argument("--chroma", "-c", choices=['white', 'magenta', 'green'], default='white', help="Background color")
    parser.add_argument("--no-strip-shadow", action="store_true", help="Do not strip ground shadows")
    parser.add_argument("--budget", "-b", choices=list(TILE_BUDGETS.keys()), default=None, help="Integer tile budget preset")
    parser.add_argument("--anim", "-a", choices=['auto', 'tree_canopy', 'water_body', 'chimney_smoke', 'hanging_pendulum', 'rotating_wheel', 'livestock_wander', 'static'], default='auto', help="Animation type")

    args = parser.parse_args()
    process_isolated_asset(args.input, args.output, args.chroma, not args.no_strip_shadow, args.budget, args.anim)

if __name__ == '__main__':
    main()
