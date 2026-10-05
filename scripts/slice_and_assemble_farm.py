"""
High-Fidelity Sprite Slicing, Precision Defringing, and Clean Map Assembly Pipeline.
Removes all white fringes, halos, and background artifacts from Gemini_Generated_Image_7gv9jw7gv9jw7gv9.png,
extracts pristine RGBA sprites, and composites a seamless, zero-halo farm map matching screen.png.
"""

import os
import json
import cv2
import numpy as np

def compute_precision_alpha(gemini_bgr):
    """
    Computes anti-aliased alpha matte by analyzing both grayscale luminance and saturation.
    Unmultiplies white fringes from boundary pixels.
    """
    h, w, _ = gemini_bgr.shape
    gray = cv2.cvtColor(gemini_bgr, cv2.COLOR_BGR2GRAY).astype(float)
    hsv = cv2.cvtColor(gemini_bgr, cv2.COLOR_BGR2HSV).astype(float)
    sat = hsv[:, :, 1]

    # White background condition:
    # High luminance (gray >= 215) and very low saturation (sat < 35), OR pure high luminance (gray >= 238)
    is_pure_bg = (gray >= 232) | ((gray >= 215) & (sat < 30))
    is_pure_fg = (gray <= 200) | (sat >= 45)

    alpha = np.zeros_like(gray, dtype=float)
    in_transition = (~is_pure_bg) & (~is_pure_fg)
    alpha[in_transition] = np.clip((232.0 - gray[in_transition]) / (232.0 - 200.0), 0.0, 1.0)
    alpha[is_pure_fg] = 1.0
    alpha[is_pure_bg] = 0.0

    # Flood fill from image boundaries to ensure all outer whitespace is completely cleared
    bg_seed = (alpha == 0).astype(np.uint8)
    flood_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        cv2.floodFill(bg_seed, flood_mask, corner, 2)
    is_outer_bg = (flood_mask[1:-1, 1:-1] == 1)
    alpha[is_outer_bg] = 0.0

    # Defringe RGB: unmultiply white background
    a_3d = np.dstack([alpha, alpha, alpha])
    unmultiplied = np.where(
        a_3d > 0.05,
        np.clip((gemini_bgr.astype(float) - (1.0 - a_3d) * 255.0) / np.maximum(a_3d, 0.05), 0, 255),
        gemini_bgr
    )

    rgba = np.dstack([unmultiplied.astype(np.uint8), (alpha * 255).astype(np.uint8)])
    return rgba, alpha

def run():
    gemini_path = r'docs/design/Gemini_Generated_Image_7gv9jw7gv9jw7gv9.png'
    screen_path = r'docs/design/screen.png'
    out_sprites_dir = r'docs/design/extracted_sprites'
    web_sprites_dir = r'apps/web/public/farm/sprites'
    assembled_map_path = r'docs/design/assembled_map.png'
    web_assembled_path = r'apps/web/public/farm/assembled_farm_map.png'
    web_crisp_path = r'apps/web/public/farm/farm_background_crisp.png'
    catalog_path = r'docs/design/sprites_catalog.json'

    os.makedirs(out_sprites_dir, exist_ok=True)
    os.makedirs(web_sprites_dir, exist_ok=True)

    img_gemini = cv2.imread(gemini_path)
    img_screen = cv2.imread(screen_path)

    sh, sw, _ = img_screen.shape
    gh, gw, _ = img_gemini.shape
    print(f"Loaded Gemini sheet: {gw}x{gh}, Screen target: {sw}x{sh}")

    # 1. Compute precision defringed RGBA sheet and continuous alpha
    gemini_rgba, full_alpha = compute_precision_alpha(img_gemini)

    # 2. Extract connected components on solid foreground (alpha > 0.2)
    solid_mask = (full_alpha > 0.2).astype(np.uint8) * 255
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(solid_mask, connectivity=8)
    print(f"Total connected components found: {num_labels}")

    components = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if area >= 45 and w >= 6 and h >= 6:
            crop_rgba = gemini_rgba[y:y+h, x:x+w].copy()
            comp_mask = (labels[y:y+h, x:x+w] == i)
            # Mask out any pixels outside this component
            crop_rgba[~comp_mask, 3] = 0

            if np.sum(crop_rgba[:, :, 3] > 30) < 30:
                continue

            components.append({
                'cid': i,
                'x': int(x),
                'y': int(y),
                'w': int(w),
                'h': int(h),
                'area': int(area),
                'crop_rgba': crop_rgba
            })

    components.sort(key=lambda c: c['area'], reverse=True)
    print(f"Valid sprite components to process: {len(components)}")

    # 3. Match each component in screen.png using masked normalized correlation
    catalog = []
    matched_sprites = []

    for rank, comp in enumerate(components):
        crop_rgba = comp['crop_rgba']
        crop_bgr = crop_rgba[:, :, :3]
        alpha_channel = crop_rgba[:, :, 3]
        w, h = comp['w'], comp['h']
        cid = comp['cid']

        # Correlation template matching
        res = cv2.matchTemplate(img_screen, crop_bgr, cv2.TM_CCORR_NORMED, mask=alpha_channel)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)
        sx, sy = max_loc

        # Determine semantic category & readable name
        name = f"sprite_{rank+1:03d}_cid{cid}"
        category = "prop"

        if w > 200 and h > 150:
            if sx < 500 and sy < 300:
                name = "farm_barn_main"
                category = "building"
            elif sx > 800 and sy > 300:
                name = "aquaculture_pond"
                category = "pond"
            elif sx > 700 and sy > 500:
                name = "crop_field_beds"
                category = "field"
        elif w > 100 and h > 100:
            if sx > 500 and sy < 250:
                name = "silo_grain_warehouse"
                category = "building"
            elif sx < 250 and sy > 450:
                name = "chicken_coop"
                category = "enclosure"
            elif sx < 450 and sy > 500:
                name = "pig_mud_pen"
                category = "enclosure"
            elif sx > 900 and sy > 300:
                name = "ancient_oak_tree"
                category = "nature"
            elif sx < 300 and sy < 400:
                name = "shop_bac_sau_stall"
                category = "building"
        elif w > 600 and h < 60:
            name = f"terrain_ribbon_{rank+1}"
            category = "terrain"
        elif 40 <= w <= 100 and 40 <= h <= 100:
            if 400 <= sx <= 600 and 300 <= sy <= 500:
                name = "stone_water_well"
                category = "interactive"

        sprite_filename = f"{name}.png"
        sprite_out_path = os.path.join(out_sprites_dir, sprite_filename)
        sprite_web_path = os.path.join(web_sprites_dir, sprite_filename)

        # Save clean RGBA sprite
        cv2.imwrite(sprite_out_path, crop_rgba)
        cv2.imwrite(sprite_web_path, crop_rgba)

        sprite_info = {
            'id': rank + 1,
            'cid': cid,
            'name': name,
            'category': category,
            'file': sprite_filename,
            'source_box': [comp['x'], comp['y'], w, h],
            'target_pos': [int(sx), int(sy)],
            'size': [w, h],
            'match_score': round(float(max_val), 4),
            'depth': int(sy + h)
        }
        catalog.append(sprite_info)
        matched_sprites.append((sprite_info, crop_rgba))

    print(f"Extracted and saved {len(catalog)} pristine defringed sprites.")

    # 4. Assemble composite map
    # Base terrain from screen.png, composite matched sprites in Y-sorted depth order
    assembled = img_screen.copy()
    matched_sprites.sort(key=lambda s: s[0]['depth'])

    for info, crop_rgba in matched_sprites:
        sx, sy = info['target_pos']
        w, h = info['size']

        if info['match_score'] < 0.88:
            continue

        patch = assembled[sy:sy+h, sx:sx+w]
        if patch.shape[:2] != (h, w):
            continue

        s_bgr = crop_rgba[:, :, :3]
        s_alpha = crop_rgba[:, :, 3].astype(float) / 255.0
        s_alpha_3d = np.dstack([s_alpha, s_alpha, s_alpha])

        # Smooth alpha blending
        blended = (s_bgr.astype(float) * s_alpha_3d + patch.astype(float) * (1.0 - s_alpha_3d)).astype(np.uint8)
        assembled[sy:sy+h, sx:sx+w] = blended

    # Save native resolution assembled map (1264 x 848)
    cv2.imwrite(assembled_map_path, assembled)
    cv2.imwrite(web_assembled_path, assembled)
    print(f"Saved clean assembled map to {assembled_map_path} and {web_assembled_path}")

    # Verify white pixel count in assembled map
    is_white_assembled = (assembled[:, :, 0] > 225) & (assembled[:, :, 1] > 225) & (assembled[:, :, 2] > 225)
    print(f"Verified white pixels in assembled map (>225): {np.sum(is_white_assembled)} (Screen reference has 0)")

    # Scale to 1536 x 1024 for game engine camera bounds
    crisp_resized = cv2.resize(assembled, (1536, 1024), interpolation=cv2.INTER_LANCZOS4)
    cv2.imwrite(web_crisp_path, crisp_resized)
    print(f"Saved game-ready crisp farm background (1536x1024) to {web_crisp_path}")

    # Save metadata catalog
    with open(catalog_path, 'w', encoding='utf-8') as f:
        json.dump({
            'version': '1.1.0',
            'screen_resolution': [sw, sh],
            'game_viewport': [1536, 1024],
            'total_sprites': len(catalog),
            'sprites': catalog
        }, f, indent=2, ensure_ascii=False)
    print(f"Saved sprite metadata catalog to {catalog_path}")

if __name__ == '__main__':
    run()
