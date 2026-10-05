#!/usr/bin/env python3
"""
Seamless 1:1 Native Pixel Master Map Outpainter.
Part of the `image-to-interactive-map` skill.

Places a source pixel art map onto a target viewport canvas (e.g. 1264x848 -> 1536x1024)
at 100% 1:1 native scale without any fractional stretching, blurring, or distortion.
Seamlessly synthesizes edge terrain and boundary structures into the margins.
"""

import os
import argparse
import cv2
import numpy as np

def outpaint_map(src_path, out_path, target_w=1536, target_h=1024, off_x=None, off_y=None, gate_road=True):
    src = cv2.imread(src_path)
    if src is None:
        raise FileNotFoundError(f"Could not load source image: {src_path}")

    sh, sw, _ = src.shape
    print(f"Loaded source image: {sw}x{sh} from {src_path}")
    print(f"Target canvas size: {target_w}x{target_h}")

    if sw > target_w or sh > target_h:
        raise ValueError(f"Source image ({sw}x{sh}) is larger than target canvas ({target_w}x{target_h})!")

    # Calculate offsets
    if off_x is None:
        off_x = (target_w - sw) // 2
    if off_y is None:
        off_y = (target_h - sh) // 2

    print(f"Placement offset: off_x={off_x}, off_y={off_y}")

    canvas = np.zeros((target_h, target_w, 3), dtype=np.uint8)

    # 1. Sample border terrain colors
    top_patch = src[0:min(20, sh), :]
    bot_patch = src[-min(20, sh):, :]
    left_patch = src[:, 0:min(20, sw)]
    right_patch = src[:, -min(20, sw):]

    mean_color = np.mean([
        top_patch.mean(axis=(0,1)),
        bot_patch.mean(axis=(0,1)),
        left_patch.mean(axis=(0,1)),
        right_patch.mean(axis=(0,1))
    ], axis=0)

    # Base gradient fill
    for y in range(target_h):
        factor = 0.95 + 0.1 * (y / target_h)
        col = np.clip(mean_color * factor, 0, 255).astype(np.uint8)
        canvas[y, :] = col

    # Procedural pixel art noise
    rng = np.random.RandomState(42)
    noise = rng.normal(0, 6, (target_h // 2, target_w // 2, 3))
    noise_full = cv2.resize(noise, (target_w, target_h), interpolation=cv2.INTER_NEAREST)
    canvas = np.clip(canvas.astype(float) + noise_full, 0, 255).astype(np.uint8)

    # 2. Edge continuation
    # Top margin
    for y in range(off_y):
        canvas[y, off_x:off_x + sw] = src[min(y % 16, sh - 1), :]
    # Bottom margin
    for y in range(off_y + sh, target_h):
        dy = y - (off_y + sh)
        canvas[y, off_x:off_x + sw] = src[sh - 1 - (dy % 16), :]
    # Left margin
    for x in range(off_x):
        canvas[:, x] = canvas[:, off_x + (x % 16)]
    # Right margin
    for x in range(off_x + sw, target_w):
        dx = x - (off_x + sw)
        canvas[:, x] = canvas[:, off_x + sw - 1 - (dx % 16)]

    # 3. Paste 1:1 pristine source artwork
    canvas[off_y:off_y + sh, off_x:off_x + sw] = src

    # 4. Optional Gate Road extension to West border (x: 0..off_x)
    if gate_road and off_x > 0:
        # Sample road near west gate entrance
        path_sample = src[max(0, min(sh - 1, 40)):min(sh, 90), 0:min(sw, 30)]
        path_color = path_sample.mean(axis=(0,1))
        road_y_start = off_y + int(sh * 0.05)
        road_y_end = road_y_start + 50

        for y in range(road_y_start, min(target_h, road_y_end)):
            for x in range(0, off_x):
                noise_v = rng.uniform(-8, 8)
                canvas[y, x] = np.clip(path_color + noise_v, 0, 255).astype(np.uint8)

        # Stone curb edges
        canvas[road_y_start - 1, 0:off_x] = [40, 50, 60]
        canvas[road_y_start, 0:off_x] = [60, 75, 90]
        canvas[road_y_end - 1, 0:off_x] = [60, 75, 90]
        canvas[road_y_end, 0:off_x] = [40, 50, 60]

    # 5. Boundary country wooden fence posts
    for x in range(16, target_w - 16, 24):
        # Top fence
        canvas[16:28, x:x+4] = [35, 45, 65]
        canvas[20:23, x-12:x+12] = [45, 60, 85]
        # Bottom fence
        canvas[target_h-28:target_h-16, x:x+4] = [35, 45, 65]
        canvas[target_h-24:target_h-21, x-12:x+12] = [45, 60, 85]

    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    cv2.imwrite(out_path, canvas)
    print(f"Successfully generated master outpainted canvas ({target_w}x{target_h}) at {out_path}")
    print("\n--- Game Coordinate Synchronization Formula ---")
    print(f"game_x = source_x + {off_x}")
    print(f"game_y = source_y + {off_y}")
    print(f"game_w = source_w (1:1 native scale)")
    print(f"game_h = source_h (1:1 native scale)")

def main():
    parser = argparse.ArgumentParser(description="Outpaint pixel art map to target resolution.")
    parser.add_argument("--source", "-s", required=True, help="Source map image path")
    parser.add_argument("--output", "-o", required=True, help="Output outpainted canvas path")
    parser.add_argument("--target-width", type=int, default=1536, help="Target viewport width")
    parser.add_argument("--target-height", type=int, default=1024, help="Target viewport height")
    parser.add_argument("--offset-x", type=int, default=None, help="X placement offset")
    parser.add_argument("--offset-y", type=int, default=None, help="Y placement offset")
    parser.add_argument("--no-gate", action="store_true", help="Disable road extension to west gate")

    args = parser.parse_args()
    outpaint_map(args.source, args.output, args.target_width, args.target_height, args.offset_x, args.offset_y, not args.no_gate)

if __name__ == '__main__':
    main()
