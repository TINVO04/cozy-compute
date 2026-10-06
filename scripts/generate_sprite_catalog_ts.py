import json
import os

def generate():
    json_path = 'docs/design/sprites_catalog.json'
    ts_path = 'packages/game-data/src/farm-sprites.ts'
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    scale_x = 1536.0 / 1264.0
    scale_y = 1024.0 / 848.0

    lines = []
    lines.append('/**')
    lines.append(' * Auto-generated Farm Sprite Assets & Placement Catalog.')
    lines.append(' * Extracted and calibrated from Gemini breakdown and screen target.')
    lines.append(' */')
    lines.append('')
    lines.append('export interface FarmSpriteMetadata {')
    lines.append('  id: number;')
    lines.append('  cid: number;')
    lines.append('  name: string;')
    lines.append('  category: string;')
    lines.append('  file: string;')
    lines.append('  sourceBox: [number, number, number, number];')
    lines.append('  screenPos: [number, number];')
    lines.append('  screenSize: [number, number];')
    lines.append('  gamePos: [number, number];')
    lines.append('  gameSize: [number, number];')
    lines.append('  matchScore: number;')
    lines.append('  depth: number;')
    lines.append('}')
    lines.append('')
    lines.append('export const FARM_SPRITES_CATALOG: FarmSpriteMetadata[] = [')

    for s in data['sprites']:
        sx, sy = s['target_pos']
        w, h = s['size']
        gx = int(round(sx * scale_x))
        gy = int(round(sy * scale_y))
        gw = int(round(w * scale_x))
        gh = int(round(h * scale_y))
        depth = int(round((sy + h) * scale_y))

        lines.append('  {')
        lines.append(f"    id: {s['id']},")
        lines.append(f"    cid: {s['cid']},")
        lines.append(f"    name: {json.dumps(s['name'])},")
        lines.append(f"    category: {json.dumps(s['category'])},")
        lines.append(f"    file: {json.dumps(s['file'])},")
        lines.append(f"    sourceBox: [{s['source_box'][0]}, {s['source_box'][1]}, {s['source_box'][2]}, {s['source_box'][3]}],")
        lines.append(f"    screenPos: [{sx}, {sy}],")
        lines.append(f"    screenSize: [{w}, {h}],")
        lines.append(f"    gamePos: [{gx}, {gy}],")
        lines.append(f"    gameSize: [{gw}, {gh}],")
        lines.append(f"    matchScore: {s['match_score']},")
        lines.append(f"    depth: {depth},")
        lines.append('  },')

    lines.append('];')
    lines.append('')
    lines.append('export const FARM_KEY_BUILDINGS = {')
    
    # Map key buildings
    key_map = {}
    for s in data['sprites']:
        name = s['name']
        if name in ['farm_barn_main', 'silo_grain_warehouse', 'aquaculture_pond', 'crop_field_beds', 'chicken_coop', 'pig_mud_pen', 'shop_bac_sau_stall', 'ancient_oak_tree', 'stone_water_well']:
            sx, sy = s['target_pos']
            w, h = s['size']
            gx = int(round(sx * scale_x))
            gy = int(round(sy * scale_y))
            gw = int(round(w * scale_x))
            gh = int(round(h * scale_y))
            key_map[name] = {
                'file': s['file'],
                'x': gx,
                'y': gy,
                'w': gw,
                'h': gh,
                'depth': int(round((sy + h) * scale_y))
            }

    for k, v in key_map.items():
        lines.append(f'  {k}: {json.dumps(v)},')
    lines.append('} as const;')
    lines.append('')

    with open(ts_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'Generated {ts_path} with {len(data["sprites"])} sprite definitions.')

if __name__ == '__main__':
    generate()
