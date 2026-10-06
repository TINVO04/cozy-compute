#!/usr/bin/env python3
"""
tools/asset-pipeline/generate_metadata.py

Auto-generates TypeScript AssetDefinition metadata from processed sprite images.
Enforces Cozy Compute Style Guide contracts.
"""

import os
import sys
import math
import json
import argparse
import cv2

CATEGORY_DEFAULTS = {
    'terrain': {
        'solid': False,
        'anchor': {'x': 0.5, 'y': 0.5},
        'default_tags': ['terrain', 'ground'],
    },
    'roads': {
        'solid': False,
        'anchor': {'x': 0.5, 'y': 0.5},
        'default_tags': ['road', 'path'],
    },
    'vegetation': {
        'solid': True,
        'anchor': {'x': 0.5, 'y': 1.0},
        'default_tags': ['vegetation', 'nature', 'tree'],
    },
    'buildings': {
        'solid': True,
        'anchor': {'x': 0.5, 'y': 1.0},
        'default_tags': ['building', 'structure'],
    },
    'farming': {
        'solid': False,
        'anchor': {'x': 0.5, 'y': 0.5},
        'default_tags': ['farming', 'crop', 'agriculture'],
    },
    'animals': {
        'solid': True,
        'anchor': {'x': 0.5, 'y': 1.0},
        'default_tags': ['animal', 'livestock', 'fauna'],
    },
    'props': {
        'solid': True,
        'anchor': {'x': 0.5, 'y': 1.0},
        'default_tags': ['prop', 'decoration'],
    },
    'characters': {
        'solid': True,
        'anchor': {'x': 0.5, 'y': 1.0},
        'default_tags': ['character', 'npc', 'avatar'],
    },
}

def inspect_image(image_path):
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    h, w = img.shape[:2]
    return w, h

def generate_asset_def(image_path, category, asset_id, name, extra_tags=None, relative_url=None):
    width, height = inspect_image(image_path)
    tile_w = max(1, math.ceil(width / 32))
    tile_h = max(1, math.ceil(height / 32))

    cfg = CATEGORY_DEFAULTS.get(category, {
        'solid': True,
        'anchor': {'x': 0.5, 'y': 1.0},
        'default_tags': [category],
    })

    tags = list(set(cfg['default_tags'] + (extra_tags or []) + ['vietnamese', 'dong-nai']))
    url = relative_url or f"/farm/{os.path.basename(image_path)}"

    # If it's a tall building/tree, footprint height is usually the bottom 1-2 tiles
    if category in ['buildings', 'vegetation'] and tile_h > 2:
        footprint_h = max(1, tile_h // 2)
        offset_y = tile_h - footprint_h
    else:
        footprint_h = tile_h
        offset_y = 0

    definition = {
        'id': asset_id,
        'category': category,
        'name': name,
        'texture': url,
        'visualBounds': {'width': width, 'height': height},
        'footprint': {
            'tileWidth': tile_w,
            'tileHeight': footprint_h,
            **({'offsetY': offset_y} if offset_y > 0 else {})
        },
        'anchor': cfg['anchor'],
        'collision': {'solid': cfg['solid']},
        'tags': tags,
        'styleVersion': 1,
    }

    if category in ['buildings', 'vegetation', 'props']:
        definition['depthOffset'] = footprint_h * 32

    return definition

def format_ts_code(asset_def):
    lines = [
        "  {",
        f"    id: '{asset_def['id']}',",
        f"    category: '{asset_def['category']}',",
        f"    name: '{asset_def['name']}',",
        f"    texture: '{asset_def['texture']}',",
        f"    visualBounds: {{ width: {asset_def['visualBounds']['width']}, height: {asset_def['visualBounds']['height']} }},",
        f"    footprint: {{ tileWidth: {asset_def['footprint']['tileWidth']}, tileHeight: {asset_def['footprint']['tileHeight']}{', offsetY: ' + str(asset_def['footprint']['offsetY']) if 'offsetY' in asset_def['footprint'] else ''} }},",
        f"    anchor: {{ x: {asset_def['anchor']['x']}, y: {asset_def['anchor']['y']} }},",
        f"    collision: {{ solid: {str(asset_def['collision']['solid']).lower()} }},",
    ]
    if 'depthOffset' in asset_def:
        lines.append(f"    depthOffset: {asset_def['depthOffset']},")
    tags_formatted = ", ".join(f"'{t}'" for t in asset_def['tags'])
    lines.append(f"    tags: [{tags_formatted}],")
    lines.append(f"    styleVersion: {asset_def['styleVersion']},")
    lines.append("  },")
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description="Generate AssetDefinition metadata from sprite image.")
    parser.add_argument("-i", "--input", required=True, help="Image file path")
    parser.add_argument("-c", "--category", required=True, choices=list(CATEGORY_DEFAULTS.keys()), help="Asset category")
    parser.add_argument("--id", required=True, help="Unique Asset ID (e.g. tree-mango-02)")
    parser.add_argument("--name", required=True, help="Human readable name")
    parser.add_argument("--tags", nargs="*", default=[], help="Additional search tags")
    parser.add_argument("--url", default=None, help="Relative web texture URL")

    args = parser.parse_args()
    asset_def = generate_asset_def(
        image_path=args.input,
        category=args.category,
        asset_id=args.id,
        name=args.name,
        extra_tags=args.tags,
        relative_url=args.url
    )

    print("\n--- GENERATED JSON ---")
    print(json.dumps(asset_def, indent=2))
    print("\n--- GENERATED TYPESCRIPT DEFINITION ---")
    print(format_ts_code(asset_def))

if __name__ == '__main__':
    main()
