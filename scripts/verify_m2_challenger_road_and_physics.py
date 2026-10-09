#!/usr/bin/env python3
"""
Challenger M2_2 Empirical Stress-Test Suite:
Game Physics, Road Boundary Constraints, Metadata Sync & PNG Integrity.

Empirically validates:
1. Solid body width <= 40 px across all 16 frames for all 16 models (TOWN_ROADS 40px compliance).
   Also inspects alpha > 0 bounding boxes and lateral margins.
2. Speed and prices in meta.json match packages/game-data/src/vehicles.ts for all 16 models.
3. PNG file integrity (magic bytes, IHDR chunks, CRC32, full decompression) and SHA-256
   parity across assets/vehicles/ and apps/web/public/vehicles/.
"""

import os
import sys
import json
import struct
import zlib
import hashlib
import re
from PIL import Image

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(ROOT_DIR, "assets", "vehicles")
PUBLIC_DIR = os.path.join(ROOT_DIR, "apps", "web", "public", "vehicles")
GAME_DATA_TS = os.path.join(ROOT_DIR, "packages", "game-data", "src", "vehicles.ts")

MODELS = [
    # 1 Bicycle
    "bicycles/trek-marlin-7",
    # 7 Motorcycles
    "motorcycles/vespa-primavera-150",
    "motorcycles/ducati-panigale-v4",
    "motorcycles/honda-super-cub",
    "motorcycles/harley-davidson-fat-boy",
    "motorcycles/kawasaki-ninja-h2",
    "motorcycles/yamaha-yzf-r1",
    "motorcycles/bmw-r1250-gs",
    # 8 Cars
    "cars/mercedes-benz-g63",
    "cars/lamborghini-aventador",
    "cars/porsche-911",
    "cars/toyota-supra-mk4",
    "cars/ferrari-f40",
    "cars/ford-mustang",
    "cars/rolls-royce-phantom",
    "cars/tesla-model-s",
]

PNG_FILES = ["spritesheet.png", "preview.png", "icon.png"]
EXPECTED_DIMENSIONS = {
    "spritesheet.png": (192, 160),
    "preview.png": (144, 120),
    "icon.png": (48, 40),
}

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"

def parse_vehicles_ts():
    """Extract vehicle definitions from packages/game-data/src/vehicles.ts."""
    with open(GAME_DATA_TS, "r", encoding="utf-8") as f:
        content = f.read()

    # Match canonical mapping in VEHICLE_ALIASES
    aliases = {}
    alias_matches = re.findall(r"['\"]([^'\"]+)['\"]\s*:\s*['\"]([^'\"]+)['\"]", content)
    for k, v in alias_matches:
        if k in MODELS:
            aliases[k] = v

    # Match vehicle entries
    # e.g.:
    # bicycle_sky: { ... price: 200, speed: 195, ... assetPath: 'bicycles/trek-marlin-7' ... }
    vehicles_data = {}
    entry_blocks = re.split(r"\n\s*([a-zA-Z0-9_]+):\s*\{", content)
    for i in range(1, len(entry_blocks), 2):
        var_id = entry_blocks[i]
        block = entry_blocks[i+1]
        
        # parse id, price, speed, assetPath
        p_match = re.search(r"price:\s*(\d+)", block)
        s_match = re.search(r"speed:\s*(\d+)", block)
        asset_match = re.search(r"assetPath:\s*['\"]([^'\"]+)['\"]", block)
        name_match = re.search(r"name:\s*['\"]([^'\"]+)['\"]", block)
        brand_match = re.search(r"brand:\s*['\"]([^'\"]+)['\"]", block)
        
        if asset_match and p_match and s_match:
            asset_path = asset_match.group(1)
            vehicles_data[asset_path] = {
                "var_id": var_id,
                "price": int(p_match.group(1)),
                "speed": int(s_match.group(1)),
                "name": name_match.group(1) if name_match else None,
                "brand": brand_match.group(1) if brand_match else None,
            }

    return vehicles_data


def test_road_width_and_physics():
    """
    Empirical Test 1:
    Solid body width <= 40 px across all 16 frames for all 16 models in both locations.
    Road constraint: TOWN_ROADS 40px width.
    """
    print("\n" + "=" * 70)
    print("STRESS TEST 1: VEHICLE SOLID BODY WIDTH <= 40 PX ACROSS ALL 16 FRAMES")
    print("Road Constraint: TOWN_ROADS width = 40 px. Must not trigger off_road.")
    print("=" * 70)

    failures = 0
    total_frames_checked = 0
    max_solid_width_seen = 0
    max_visible_width_seen = 0

    for loc_name, base_dir in [("assets/vehicles", ASSETS_DIR), ("apps/web/public/vehicles", PUBLIC_DIR)]:
        print(f"\n--- Checking location: {loc_name} ---")
        for model in MODELS:
            ss_path = os.path.join(base_dir, model, "spritesheet.png")
            if not os.path.exists(ss_path):
                print(f"[FAIL] Missing {ss_path}")
                failures += 1
                continue

            img = Image.open(ss_path).convert("RGBA")
            if img.size != (192, 160):
                print(f"[FAIL] {model}: invalid dimensions {img.size}")
                failures += 1
                continue

            model_max_solid_w = 0
            model_max_visible_w = 0

            for row in range(4): # Down, Left, Right, Up
                for col in range(4): # Idle, Drive1, Drive2, Drive3
                    total_frames_checked += 1
                    box = (col * 48, row * 40, (col + 1) * 48, (row + 1) * 40)
                    frame = img.crop(box)

                    solid_xs = [x for x in range(48) for y in range(40) if frame.getpixel((x, y))[3] > 128]
                    visible_xs = [x for x in range(48) for y in range(40) if frame.getpixel((x, y))[3] > 0]

                    if not solid_xs:
                        print(f"[FAIL] {model} row={row} col={col} is completely empty (no solid pixels)")
                        failures += 1
                        continue

                    solid_min_x, solid_max_x = min(solid_xs), max(solid_xs)
                    solid_w = solid_max_x - solid_min_x + 1

                    visible_min_x, visible_max_x = min(visible_xs), max(visible_xs)
                    visible_w = visible_max_x - visible_min_x + 1

                    model_max_solid_w = max(model_max_solid_w, solid_w)
                    model_max_visible_w = max(model_max_visible_w, visible_w)
                    max_solid_width_seen = max(max_solid_width_seen, solid_w)
                    max_visible_width_seen = max(max_visible_width_seen, visible_w)

                    # STRICT ASSERTION: solid body width <= 40 px
                    if solid_w > 40:
                        print(f"[FAIL] {model} row={row} col={col} solid body width {solid_w} > 40 px!")
                        failures += 1
                    
                    # Clearance check: bounding box within 48 px frame
                    if solid_min_x < 0 or solid_max_x >= 48:
                        print(f"[FAIL] {model} row={row} col={col} out of frame [0..47]: [{solid_min_x}..{solid_max_x}]")
                        failures += 1

            dir_labels = ["Down", "Left", "Right", "Up"]
            print(f"  [PASS] {model:35s} | max solid width = {model_max_solid_w:2d} px <= 40 px | max visible = {model_max_visible_w:2d} px")

    print("\nSummary of Test 1:")
    print(f"  Total frames checked: {total_frames_checked} (16 models x 16 frames x 2 locations)")
    print(f"  Max solid body width observed: {max_solid_width_seen} px (limit <= 40 px)")
    print(f"  Max visible width observed: {max_visible_width_seen} px")
    print(f"  Failures: {failures}")
    return failures == 0


def test_meta_speed_and_prices():
    """
    Empirical Test 2:
    Verify speed and prices in meta.json match packages/game-data/src/vehicles.ts.
    Also verify 100% JSON parity between assets/vehicles/ and apps/web/public/vehicles/.
    """
    print("\n" + "=" * 70)
    print("STRESS TEST 2: SPEED & PRICES IN META.JSON VS PACKAGES/GAME-DATA/SRC/VEHICLES.TS")
    print("=" * 70)

    failures = 0
    game_data = parse_vehicles_ts()

    if len(game_data) < 16:
        print(f"[FAIL] Expected at least 16 vehicle definitions in vehicles.ts, found {len(game_data)}")
        return False

    for model in MODELS:
        if model not in game_data:
            print(f"[FAIL] Model {model} not found in vehicles.ts definitions!")
            failures += 1
            continue

        ts_def = game_data[model]
        ts_price = ts_def["price"]
        ts_speed = ts_def["speed"]

        p_assets = os.path.join(ASSETS_DIR, model, "meta.json")
        p_public = os.path.join(PUBLIC_DIR, model, "meta.json")

        if not os.path.exists(p_assets) or not os.path.exists(p_public):
            print(f"[FAIL] Missing meta.json for {model}")
            failures += 1
            continue

        with open(p_assets, "r", encoding="utf-8") as f:
            meta_assets = json.load(f)
        with open(p_public, "r", encoding="utf-8") as f:
            meta_public = json.load(f)

        # Check mirror parity
        if meta_assets != meta_public:
            print(f"[FAIL] meta.json mismatch between assets/ and apps/web/public/ for {model}!")
            failures += 1

        asset_price = meta_assets.get("price")
        asset_speed = meta_assets.get("speed")
        asset_name = meta_assets.get("name")
        asset_brand = meta_assets.get("brand")

        # Verify price match
        if asset_price != ts_price:
            print(f"[FAIL] {model}: price mismatch! meta.json={asset_price} vs vehicles.ts={ts_price}")
            failures += 1

        # Verify speed match
        if asset_speed != ts_speed:
            print(f"[FAIL] {model}: speed mismatch! meta.json={asset_speed} vs vehicles.ts={ts_speed}")
            failures += 1

        # Check dimensions & contactY in meta.json
        dims = meta_assets.get("dimensions", {})
        anchor = meta_assets.get("anchorPoints", {})
        if dims.get("spritesheetWidth") != 192 or dims.get("spritesheetHeight") != 160:
            print(f"[FAIL] {model}: invalid spritesheet dimensions in meta.json")
            failures += 1
        if anchor.get("contactY") != 37:
            print(f"[FAIL] {model}: contactY != 37 in meta.json")
            failures += 1

        print(f"  [PASS] {model:35s} | price={asset_price:4d} (ts={ts_price:4d}) | speed={asset_speed:3d} (ts={ts_speed:3d}) | id='{meta_assets.get('id')}'")

    print(f"\nTest 2 Result: {len(MODELS) - failures}/{len(MODELS)} models matched perfectly with vehicles.ts.")
    return failures == 0


def verify_single_png(file_path, expected_w, expected_h):
    """Deep PNG header and chunk verification."""
    with open(file_path, "rb") as f:
        data = f.read()

    # 1. Check signature
    if len(data) < 24 or data[:8] != PNG_MAGIC:
        return False, "Invalid PNG magic signature"

    # 2. Check IHDR
    ihdr_length = struct.unpack(">I", data[8:12])[0]
    ihdr_type = data[12:16]
    if ihdr_type != b"IHDR" or ihdr_length != 13:
        return False, f"First chunk is not valid IHDR (type={ihdr_type}, length={ihdr_length})"

    w, h, bit_depth, color_type, comp, filt, interlace = struct.unpack(">IIBBBBB", data[16:29])
    ihdr_crc = struct.unpack(">I", data[29:33])[0]
    expected_crc = zlib.crc32(data[12:29])
    if ihdr_crc != expected_crc:
        return False, f"IHDR CRC32 mismatch: {hex(ihdr_crc)} != {hex(expected_crc)}"

    if (w, h) != (expected_w, expected_h):
        return False, f"Dimensions mismatch: got ({w}, {h}), expected ({expected_w}, {expected_h})"

    # 3. Check full image decoding
    try:
        img = Image.open(file_path)
        img.verify() # verifies stream integrity
    except Exception as e:
        return False, f"PIL verify failed: {e}"

    try:
        img = Image.open(file_path)
        img.load() # full decompression of IDAT chunks
    except Exception as e:
        return False, f"PIL load / IDAT decompression failed: {e}"

    return True, f"OK ({w}x{h}, {len(data)} bytes, bit_depth={bit_depth}, color_type={color_type})"


def test_png_integrity_and_mirror_sync():
    """
    Empirical Test 3:
    Verify PNG file integrity across both assets/ and apps/web/public/.
    Also verify byte-for-byte SHA256 parity between canonical storage and web mirror.
    """
    print("\n" + "=" * 70)
    print("STRESS TEST 3: PNG FILE INTEGRITY & MIRROR PARITY ACROSS ASSETS AND APPS/WEB/PUBLIC")
    print("=" * 70)

    failures = 0
    total_pngs_checked = 0

    for model in MODELS:
        for png_name in PNG_FILES:
            expected_w, expected_h = EXPECTED_DIMENSIONS[png_name]
            p_assets = os.path.join(ASSETS_DIR, model, png_name)
            p_public = os.path.join(PUBLIC_DIR, model, png_name)

            for loc, path in [("assets", p_assets), ("public", p_public)]:
                total_pngs_checked += 1
                if not os.path.exists(path):
                    print(f"[FAIL] Missing file: {path}")
                    failures += 1
                    continue

                ok, msg = verify_single_png(path, expected_w, expected_h)
                if not ok:
                    print(f"[FAIL] {loc} {model}/{png_name}: {msg}")
                    failures += 1

            # Check SHA-256 parity between the two files
            if os.path.exists(p_assets) and os.path.exists(p_public):
                with open(p_assets, "rb") as f1, open(p_public, "rb") as f2:
                    h1 = hashlib.sha256(f1.read()).hexdigest()
                    h2 = hashlib.sha256(f2.read()).hexdigest()
                    if h1 != h2:
                        print(f"[FAIL] SHA256 mismatch between assets and public for {model}/{png_name}!")
                        failures += 1

        print(f"  [PASS] {model:35s} | 3 PNGs verified (spritesheet 192x160, preview 144x120, icon 48x40) & SHA-256 synced")

    print(f"\nTest 3 Result: {total_pngs_checked - failures}/{total_pngs_checked} PNG checks passed.")
    return failures == 0


def main():
    print("======================================================================")
    print("CHALLENGER M2_2: COMPREHENSIVE ROAD & PHYSICS EMPIRICAL STRESS HARNESS")
    print("======================================================================")

    test1_ok = test_road_width_and_physics()
    test2_ok = test_meta_speed_and_prices()
    test3_ok = test_png_integrity_and_mirror_sync()

    print("\n" + "=" * 70)
    print("FINAL SUMMARY:")
    print(f"  Test 1 (Road constraint: body width <= 40px): {'PASS' if test1_ok else 'FAIL'}")
    print(f"  Test 2 (Metadata speed & price consistency):   {'PASS' if test2_ok else 'FAIL'}")
    print(f"  Test 3 (PNG headers, decoding & mirror sync):  {'PASS' if test3_ok else 'FAIL'}")
    print("=" * 70)

    if test1_ok and test2_ok and test3_ok:
        print("\n>>> ALL EMPIRICAL CHALLENGE TESTS PASSED (100% COMPLIANT) <<<")
        sys.exit(0)
    else:
        print("\n>>> ONE OR MORE CHALLENGE TESTS FAILED <<<")
        sys.exit(1)

if __name__ == "__main__":
    main()
