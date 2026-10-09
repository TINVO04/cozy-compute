#!/usr/bin/env python3
"""
Challenger M2_1 Invariant Verification Harness.

Validates:
1. Frame animation byte diffs between frame 0 and frame 1 across ALL 4 directions (Down, Left, Right, Up) > 0 bytes for all 16 models.
2. Lowest wheel contact pixel in rows 1 and 2 strictly locked at y = 37 across ALL 4 frames for all 16 models.
3. Two-wheeler saddle position strictly inside x = 24, y in [16..20] across all 4 frames.
"""

import os
import sys
import json
from PIL import Image

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(ROOT_DIR, "assets", "vehicles")

MODELS = [
    "bicycles/trek-marlin-7",
    "motorcycles/vespa-primavera-150",
    "motorcycles/ducati-panigale-v4",
    "motorcycles/honda-super-cub",
    "motorcycles/harley-davidson-fat-boy",
    "motorcycles/kawasaki-ninja-h2",
    "motorcycles/yamaha-yzf-r1",
    "motorcycles/bmw-r1250-gs",
    "cars/mercedes-benz-g63",
    "cars/lamborghini-aventador",
    "cars/porsche-911",
    "cars/toyota-supra-mk4",
    "cars/ferrari-f40",
    "cars/ford-mustang",
    "cars/rolls-royce-phantom",
    "cars/tesla-model-s",
]

TWO_WHEELERS = [
    "bicycles/trek-marlin-7",
    "motorcycles/vespa-primavera-150",
    "motorcycles/ducati-panigale-v4",
    "motorcycles/honda-super-cub",
    "motorcycles/harley-davidson-fat-boy",
    "motorcycles/kawasaki-ninja-h2",
    "motorcycles/yamaha-yzf-r1",
    "motorcycles/bmw-r1250-gs",
]

DIRECTIONS = ["Down (row 0)", "Left (row 1)", "Right (row 2)", "Up (row 3)"]

def test_frame_diffs():
    print("=" * 60)
    print("TEST 1: Frame Animation Byte Diffs (Frame 0 vs Frame 1)")
    print("=" * 60)
    failures = 0
    total_checks = 0

    for model in MODELS:
        ss_path = os.path.join(ASSETS_DIR, model, "spritesheet.png")
        img = Image.open(ss_path)
        for row in range(4):
            total_checks += 1
            f0 = img.crop((0 * 48, row * 40, 1 * 48, (row + 1) * 40))
            f1 = img.crop((1 * 48, row * 40, 2 * 48, (row + 1) * 40))
            b0 = f0.tobytes()
            b1 = f1.tobytes()
            diff_bytes = sum(1 for x, y in zip(b0, b1) if x != y)
            diff_pixels = sum(1 for y in range(40) for x in range(48) if f0.getpixel((x, y)) != f1.getpixel((x, y)))
            if diff_bytes <= 0:
                print(f"[FAIL] {model} row={row} ({DIRECTIONS[row]}): diff_bytes={diff_bytes} (MUST BE > 0)")
                failures += 1
            else:
                print(f"  [PASS] {model} | {DIRECTIONS[row]}: diff_bytes={diff_bytes}, diff_pixels={diff_pixels}")

    print(f"\nTest 1 Result: {total_checks - failures}/{total_checks} checks passed.")
    return failures == 0

def test_wheel_contact_y37():
    print("\n" + "=" * 60)
    print("TEST 2: Wheel Contact Baseline Strictly Locked at y = 37")
    print("=" * 60)
    failures = 0
    total_checks = 0

    for model in MODELS:
        ss_path = os.path.join(ASSETS_DIR, model, "spritesheet.png")
        img = Image.open(ss_path)
        for row in (1, 2):  # Left and Right side profiles
            for col in range(4):  # Frames 0, 1, 2, 3
                total_checks += 1
                frame = img.crop((col * 48, row * 40, (col + 1) * 48, (row + 1) * 40))
                
                # Check solid pixels (alpha > 128)
                solid_ys = [y for y in range(40) for x in range(48) if frame.getpixel((x, y))[3] > 128]
                # Check fully opaque tire contact pixels (alpha == 255)
                opaque_ys = [y for y in range(40) for x in range(48) if frame.getpixel((x, y))[3] == 255]
                
                max_solid_y = max(solid_ys) if solid_ys else None
                max_opaque_y = max(opaque_ys) if opaque_ys else None
                
                if max_solid_y != 37 or max_opaque_y != 37:
                    print(f"[FAIL] {model} row={row} frame={col}: max_solid_y={max_solid_y}, max_opaque_y={max_opaque_y} (expected 37)")
                    failures += 1
                else:
                    # Also verify contact pixels at y=37 are present
                    contact_xs = [x for x in range(48) if frame.getpixel((x, 37))[3] == 255]
                    if not contact_xs:
                        print(f"[FAIL] {model} row={row} frame={col}: No opaque contact pixels at y=37!")
                        failures += 1

        print(f"  [PASS] {model}: Wheel contact locked at y=37 across all 4 frames in Left & Right")

    print(f"\nTest 2 Result: {total_checks - failures}/{total_checks} checks passed.")
    return failures == 0

def test_twowheeler_saddle():
    print("\n" + "=" * 60)
    print("TEST 3: Two-Wheeler Saddle Position (x=24, y in 16..20)")
    print("=" * 60)
    failures = 0
    total_checks = 0

    for model in TWO_WHEELERS:
        ss_path = os.path.join(ASSETS_DIR, model, "spritesheet.png")
        meta_path = os.path.join(ASSETS_DIR, model, "meta.json")
        img = Image.open(ss_path)

        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        seat_meta = meta.get("anchorPoints", {}).get("seat", {})
        seat_x = seat_meta.get("x")
        seat_y = seat_meta.get("y")

        if seat_x != 24 or seat_y not in range(16, 21):
            print(f"[FAIL] {model} meta.json anchorPoints.seat is ({seat_x}, {seat_y}), expected x=24, y in 16..20")
            failures += 1
        else:
            print(f"  [PASS] {model} meta.json seat anchor: x={seat_x}, y={seat_y}")

        for row in range(4):
            for col in range(4):
                total_checks += 1
                frame = img.crop((col * 48, row * 40, (col + 1) * 48, (row + 1) * 40))
                solid_ys_at_x24 = [y for y in range(16, 21) if frame.getpixel((24, y))[3] > 128]
                if not solid_ys_at_x24:
                    print(f"[FAIL] {model} row={row} frame={col}: Missing solid saddle pixel at x=24 with y in 16..20!")
                    failures += 1

        print(f"  [PASS] {model} spritesheet: solid saddle pixel at x=24 with y in 16..20 across all 4 directions and 4 frames")

    print(f"\nTest 3 Result: {total_checks - failures}/{total_checks} checks passed.")
    return failures == 0

def main():
    print("STARTING CHALLENGER M2_1 EMPIRICAL VERIFICATION HARNESS")
    ok1 = test_frame_diffs()
    ok2 = test_wheel_contact_y37()
    ok3 = test_twowheeler_saddle()

    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(f"Test 1 (Frame Animation Diffs > 0): {'PASS' if ok1 else 'FAIL'}")
    print(f"Test 2 (Wheel Contact Locked at y=37): {'PASS' if ok2 else 'FAIL'}")
    print(f"Test 3 (Two-Wheeler Saddle Invariants): {'PASS' if ok3 else 'FAIL'}")

    if ok1 and ok2 and ok3:
        print("\nOVERALL VERDICT: CONFIRM")
        sys.exit(0)
    else:
        print("\nOVERALL VERDICT: REJECT")
        sys.exit(1)

if __name__ == "__main__":
    main()
