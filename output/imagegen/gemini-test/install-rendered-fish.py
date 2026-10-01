"""Extract authorized generated images, optimize them and update the shared manifest."""
import concurrent.futures
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
HELPER = Path('C:/Users/tinvo/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py')
MANIFEST = json.loads((ROOT / 'docs/fish-render-prompts.json').read_text(encoding='utf-8'))
PUBLIC = ROOT / 'apps/web/public/fish'
REPORT = ROOT / 'output/imagegen/asset-report.json'

def refine_chroma_regions(image, species):
    """Remove backdrop light from known translucent regions without eroding anatomy."""
    if species not in {'anglerfish', 'lionfish', 'barracuda', 'kraken_eclipse'}:
        return image
    pixels = np.asarray(image).copy()
    rgb = pixels[:, :, :3].astype(np.float32)
    y, x = np.indices(pixels.shape[:2])
    # Coordinates are normalized from the reviewed padded output, not the raw JPEG.
    if species == 'kraken_eclipse':
        # Reviewed enclosed backdrop triangle between the left tentacle arches.
        # Limit alpha cleanup to this gap; the green-black jade mantle is intact.
        nx, ny = x * 768 / image.width, y * 763 / image.height
        gap = (nx >= 180) & (nx <= 216) & (ny >= 320) & (ny <= 345)
        gap &= (rgb[:, :, 1] >= rgb[:, :, 0] * 0.85) & (rgb[:, :, 1] > rgb[:, :, 2] * 1.2)
        pixels[gap, 3] = 0
    elif species == 'anglerfish':
        distance = np.hypot(x - 95 * image.width / 768, y - 215 * image.height / 573)
        radius = distance * 768 / image.width
        region = radius < 82
        # Retain the incandescent core; smoothstep the polluted outer glow to alpha zero.
        t = np.clip((radius - 34) / 34, 0, 1)
        feather = 1 - t * t * (3 - 2 * t)
        pixels[region, 3] = np.rint(pixels[region, 3] * feather[region]).astype(np.uint8)
        rgb[region, 1] = np.minimum(rgb[region, 1], rgb[region, 0] * 0.88 + rgb[region, 2] * 0.12)
    else:
        if species == 'lionfish':
            nx, ny = x * 768 / image.width, y * 733 / image.height
            region = ((nx >= 470) & (nx <= 590) & (ny >= 170) & (ny <= 330)) | (
                (nx >= 530) & (nx <= 755) & (ny >= 260) & (ny <= 510)) | (
                (nx >= 440) & (nx <= 610) & (ny >= 470) & (ny <= 660))
        else:
            nx, ny = x * 768 / image.width, y * 392 / image.height
            region = ((nx >= 55) & (nx <= 75) & (ny >= 206) & (ny <= 222)) | (
                (nx >= 40) & (nx <= 53) & (ny >= 242) & (ny <= 255))
        # Neutralize green spill only; leave warm red rays, cool blue skin and alpha intact.
        region &= rgb[:, :, 1] > np.maximum(rgb[:, :, 0], rgb[:, :, 2])
        rgb[region, 1] = (rgb[region, 0] + rgb[region, 2]) / 2
    pixels[:, :, :3] = np.rint(rgb).clip(0, 255).astype(np.uint8)
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels)

def process(job):
    species = job['id']
    candidates = [ROOT / 'output/imagegen' / folder / (species + '-reference-1' + extension)
                  for folder in ['agy-session', 'legendary', 'collection', 'gemini-test']
                  for extension in ['.png', '.jpg', '.webp']]
    source = next((candidate for candidate in candidates if candidate.exists()), None)
    if source is None:
        return {'species': species, 'error': 'Generation output missing'}
    cutout = source.parent / (species + '-cutout.png')
    original_image = Image.open(source).convert('RGBA')
    has_alpha = original_image.getchannel('A').getextrema()[0] < 255
    if has_alpha:
        original_image.save(cutout)
    elif not cutout.exists() or cutout.stat().st_mtime < source.stat().st_mtime:
        result = subprocess.run([sys.executable, str(HELPER), '--input', str(source), '--out', str(cutout),
                                 '--auto-key', 'corners', '--soft-matte', '--transparent-threshold', '35',
                                 '--opaque-threshold', '150', '--spill-cleanup'], capture_output=True, text=True)
        if result.returncode:
            return {'species': species, 'error': result.stderr}
    im = Image.open(cutout).convert('RGBA')
    rgba = np.asarray(im).copy()
    alpha = rgba[:, :, 3]
    # Clear matte noise but retain fine fin edges and attached ornamental details.
    alpha[alpha <= 12] = 0
    count, components, stats, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), 8)
    for component in range(1, count):
        if stats[component, cv2.CC_STAT_AREA] < 12:
            alpha[components == component] = 0
    # Muted olive/emerald skin is part of the subject, even when green dominates
    # its RGB values. Preserve interior colors; key removal/despill belongs at edges.
    interior = cv2.erode((alpha > 12).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    original = np.asarray(original_image)
    rgb = original[:, :, :3].astype(np.int16)
    # Only restore muted green skin, never the saturated chroma background or
    # green reflections trapped in fin membranes and glow gradients.
    green_dominance = rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])
    interior &= green_dominance < 65
    rgba[interior, :3] = original[interior, :3]
    alpha[interior] = original[interior, 3] if has_alpha else 255
    rgba[:, :, 3] = alpha
    im = Image.fromarray(rgba)
    bbox = im.getchannel('A').getbbox()
    if not bbox:
        return {'species': species, 'error': 'Empty silhouette'}
    raw_margin = min(bbox[0], bbox[1], im.width - bbox[2], im.height - bbox[3])
    if raw_margin < 3:
        return {'species': species, 'error': 'Source silhouette touches edge', 'raw_bbox': list(bbox)}
    original_size = list(im.size)
    im = im.crop(bbox)
    im.thumbnail((720, 720), Image.Resampling.LANCZOS)
    final = Image.new('RGBA', (im.width + 48, im.height + 48))
    final.paste(im, (24, 24))
    final = refine_chroma_regions(final, species)
    target = PUBLIC / (species + '-render.webp')
    final.save(target, format='WEBP', quality=91, method=6)
    return {'species': species, 'source': str(source.relative_to(ROOT)).replace(chr(92), '/'),
            'asset': str(target.relative_to(ROOT)).replace(chr(92), '/'),
            'raw_size': original_size, 'raw_bbox': list(bbox), 'raw_margin': raw_margin,
            'width': final.width, 'height': final.height, 'bytes': target.stat().st_size}

if __name__ == '__main__':
    requested = set(sys.argv[1:])
    jobs = [job for job in MANIFEST['jobs'] if not requested or job['id'] in requested]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        reports = list(pool.map(process, jobs))
    for report in reports:
        print(json.dumps(report), flush=True)
    existing = json.loads(REPORT.read_text()) if REPORT.exists() else []
    merged = {r['species']: r for r in existing}
    merged.update({r['species']: r for r in reports})
    REPORT.write_text(json.dumps(list(merged.values()), indent=2) + chr(10), encoding='utf-8')
    if any('error' in r for r in reports):
        sys.exit(1)
    assets = {'swordfish': '/fish/swordfish-illustration.webp',
              'guppy_rainbow': '/fish/guppy_rainbow-illustration.webp',
              'golden_dragon_fish': '/fish/golden_dragon_fish-illustration.webp'}
    aspects = {'swordfish': '693 / 808', 'guppy_rainbow': '764 / 808', 'golden_dragon_fish': '691 / 808'}
    for report in merged.values():
        if 'error' not in report:
            assets[report['species']] = '/fish/' + report['species'] + '-render.webp'
            aspects[report['species']] = str(report['height']) + ' / ' + str(report['width'])
    module = ROOT / 'apps/web/src/art/fish-assets.ts'
    text = module.read_text(encoding='utf-8')
    start = text.index('export const FISH_3D_ASSETS')
    end = text.index('const images =')
    declarations = 'export const FISH_3D_ASSETS: Record<string, string> = {' + chr(10)
    declarations += ''.join('  ' + k + ': ' + repr(v) + ',' + chr(10) for k, v in assets.items())
    declarations += '};' + chr(10) + 'export const FISH_ASSET_ASPECTS: Record<string, number> = {' + chr(10)
    declarations += ''.join('  ' + k + ': ' + v + ',' + chr(10) for k, v in aspects.items())
    declarations += '};' + chr(10) + chr(10)
    module.write_text(text[:start] + declarations + text[end:], encoding='utf-8')
    print('Registered ' + str(len(assets)) + ' rendered fish assets.')
