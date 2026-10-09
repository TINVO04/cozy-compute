"""Validate geometry, animation and exact PNG/fallback/mirror parity.

This audit does NOT certify visual quality: inspect the generated boards and
runtime screenshots against docs/plans/MASTER_VEHICLE_ART_DIRECTION_PLAN.docx.
"""
import base64
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/vehicles'
PUBLIC = ROOT / 'apps/web/public/vehicles'
OUTPUT = ROOT / 'output/vehicles'
MODELS = [
    'bicycles/trek-marlin-7', 'motorcycles/vespa-primavera-150',
    'motorcycles/ducati-panigale-v4', 'motorcycles/honda-super-cub',
    'motorcycles/harley-davidson-fat-boy', 'motorcycles/kawasaki-ninja-h2',
    'motorcycles/yamaha-yzf-r1', 'motorcycles/bmw-r1250-gs',
    'cars/mercedes-benz-g63', 'cars/lamborghini-aventador', 'cars/porsche-911',
    'cars/toyota-supra-mk4', 'cars/ferrari-f40', 'cars/ford-mustang',
    'cars/rolls-royce-phantom', 'cars/tesla-model-s',
]


def decode_frame(pack, index):
    palette = [tuple(bytes.fromhex(color[1:])) for color in pack['palette']]
    runs = base64.b64decode(pack['frames'][index], validate=True)
    assert len(runs) % 2 == 0, 'truncated fallback run'
    pixels = []
    for offset in range(0, len(runs), 2):
        length, color = runs[offset:offset+2]
        assert 0 < length <= 48 - len(pixels) % 48, 'run crosses row'
        pixels.extend([palette[color]] * length)
    assert len(pixels) == 1920, 'fallback pixel count'
    result = Image.new('RGBA', (48, 40))
    result.putdata(pixels)
    return result


def audit_model(model, fallback):
    base = ASSETS / model
    for name, size in [('spritesheet.png', (192,160)), ('preview.png', (144,120)), ('icon.png', (48,40))]:
        with Image.open(base/name) as image:
            image.load()  # verify the payload, not only the IHDR dimensions
            assert image.mode == 'RGBA' and image.size == size, f'{name}: size/alpha'
        assert (base/name).read_bytes() == (PUBLIC/model/name).read_bytes(), f'{name}: public mirror drift'
    assert (base/'meta.json').read_bytes() == (PUBLIC/model/'meta.json').read_bytes(), 'metadata mirror drift'
    meta = json.loads((base/'meta.json').read_text(encoding='utf-8'))
    assert meta['anchorPoints']['contactY'] == 37
    sheet = Image.open(base/'spritesheet.png')
    frames = [[sheet.crop((f*48,d*40,(f+1)*48,(d+1)*40)) for f in range(4)] for d in range(4)]
    for direction in range(4):
        assert len({im.tobytes() for im in frames[direction]}) == 4, f'dir {direction}: duplicate animation frames'
        for frame, image in enumerate(frames[direction]):
            mask = image.getchannel('A').point(lambda a: 255 if a > 128 else 0)
            box = mask.getbbox()
            assert box is not None, f'{direction}/{frame}: empty'
            assert box[2]-box[0] <= 40, f'{direction}/{frame}: width over 40'
            assert box[0] > 0 and box[2] < 48 and box[1] > 0, 'clipped silhouette'
            assert box[3]-1 == 37, f'{direction}/{frame}: ground contact != 37'
            assert image.tobytes() == decode_frame(fallback[model], direction*4+frame).tobytes(), f'{direction}/{frame}: fallback drift'
            if not model.startswith('cars/') and direction in (1,2):
                assert mask.crop((22,16,27,21)).getbbox(), 'missing seat region'
    assert frames[0][0].tobytes() != frames[3][0].tobytes(), 'front/rear must differ'
    if not model.startswith('cars/') or model.endswith('tesla-model-s'):
        assert frames[1][0].tobytes() != frames[2][0].transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes(), 'asymmetric details blindly mirrored'
    icon = Image.open(base/'icon.png')
    assert icon.tobytes() == frames[2][0].tobytes(), 'icon is not idle/right'
    assert Image.open(base/'preview.png').tobytes() == icon.resize((144,120), Image.Resampling.NEAREST).tobytes(), 'preview interpolation'
    # Four directions at native size and 8x; separate silhouette-only board.
    board = Image.new('RGB', (1536, 400), '#29333f')
    silhouette = Image.new('RGB', (1536, 320), '#d7ded9')
    draw = ImageDraw.Draw(board)
    for d, label in enumerate(('Down', 'Left', 'Right', 'Up')):
        im = frames[d][0]
        draw.text((d*384+8, 6), f'{model} / {label}', fill='white')
        board.paste(im, (d*384+8,28), im)
        large = im.resize((384,320), Image.Resampling.NEAREST)
        board.paste(large, (d*384,80), large)
        mask = large.getchannel('A').point(lambda a: 255 if a > 128 else 0)
        silhouette.paste('#17212d', (d*384,0,d*384+384,320), mask)
    board.save(OUTPUT / f'{base.name}-directions.png')
    silhouette.save(OUTPUT / f'{base.name}-silhouette.png')
    return {'model': model, 'frames': 16, 'geometry': 'pass', 'animation': 'pass', 'fallbackParity': 'pass', 'mirror': 'pass'}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    fallback = json.loads((ROOT/'apps/web/src/art/vehicle-pixels.json').read_text(encoding='utf-8'))
    assert set(fallback) == set(MODELS), 'model roster mismatch'
    results, failures = [], []
    for model in MODELS:
        try:
            results.append(audit_model(model, fallback))
            print(f'[OK] {model}: 16 frames, geometry, animation, PNG/fallback/public parity')
        except (AssertionError, OSError, KeyError, ValueError) as error:
            failures.append({'model': model, 'error': str(error)})
            print(f'[FAIL] {model}: {error}')
    (OUTPUT/'audit.json').write_text(json.dumps({'models': results, 'failures': failures, 'visualApproval': 'Requires human/agent inspection of boards and runtime screenshots'}, indent=2)+'\n', encoding='utf-8')
    print(f'{len(results)}/16 technical audits passed. Visual QA is a separate gate.')
    raise SystemExit(bool(failures))


if __name__ == '__main__':
    main()
