"""Build a review board from installed assets, never from raw chroma-key sources."""
import json
import math
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
jobs = json.loads((ROOT / 'docs/fish-render-prompts.json').read_text(encoding='utf-8'))['jobs']
species = ['betta_fighting', 'piranha', 'snakehead', 'lionfish', 'barracuda',
           'anglerfish', 'moray_eel', 'pink_dolphin', 'dolphin_playful',
           'hammerhead_shark', 'tuna_giant', 'philosopher_eel', 'electric_catfish']
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--variants', action='store_true')
args = parser.parse_args()
if args.variants:
    species = [job['id'] for job in jobs if job.get('variantOf')]
else:
    progress = json.loads((ROOT / 'output/imagegen/agy-session/generation-progress.json').read_text(encoding='utf-8'))
    species = [entry['id'] for entry in progress['completed']]
species = [fish for fish in species if (ROOT / 'apps/web/public/fish' / (fish + '-render.webp')).exists()]
labels = {job['id']: job['name'] for job in jobs}
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
title_font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 30)
columns, cell_width, cell_height, header = 4, 380, 300, 104
board = Image.new('RGB', (columns * cell_width, math.ceil(len(species) / columns) * cell_height + header), '#111827')
draw = ImageDraw.Draw(board)
title = 'Higher-tier variants' if args.variants else 'AGY / Gemini 3.1 Flash Image'
draw.text((24, 20), title + ' - ' + str(len(species)) + ' installed species', fill='#f4f1e8', font=title_font)
draw.text((24, 64), 'Final transparent WebP assets / shared by admin, inventory and held previews', fill='#a7b4c8', font=font)
for index, fish in enumerate(species):
    x, y = index % columns * cell_width, header + index // columns * cell_height
    draw.rounded_rectangle((x + 12, y + 10, x + cell_width - 12, y + cell_height - 10), radius=12, fill='#1b2536')
    image = Image.open(ROOT / 'apps/web/public/fish' / (fish + '-render.webp')).convert('RGBA')
    image.thumbnail((cell_width - 48, cell_height - 70), Image.Resampling.LANCZOS)
    board.paste(image, (x + (cell_width - image.width) // 2, y + 20 + (cell_height - 70 - image.height) // 2), image)
    draw.text((x + cell_width // 2, y + cell_height - 38), labels[fish], anchor='mm', fill='#f4f1e8', font=font)
target = ROOT / 'output/fish-art' / ('higher-tiers.png' if args.variants else 'agy-collection.png')
board.save(target)
print(target)
