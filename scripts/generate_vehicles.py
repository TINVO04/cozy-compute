#!/usr/bin/env python3
"""
Cozy Compute MMO - vehicle asset pack compiler
Implements 8 WOW 2.5D Quality Layers:
  1. Sculpted Silhouette & Proportions per model
  2. Multi-tier Structure (chassis subframe, wheel cavities, aero splitters, pillars)
  3. 4-Tier Color Depth Shading (deep occlusion shadow, mid-tone, reflection contour, specular catchlights)
  4. 2.5D Reflective Glass (interior base, roof overhang shadow, 45° animated sliding reflection streak)
  5. 3D Rubber Tires & 8 Animated Rim Types with Brembo Calipers (contact strictly at y=37)
  6. Micro-detail (drilled rotors, headlights with reflector cores, seams, exhausts)
  7. Iconic Signature Styling Passes for all 16 canonical vehicles
  8. Active 4-Frame Animation in all 4 directions (rolling treads, suspension bounce, spoke rotation, glimmer)

Generates pixel-perfect 192x160 spritesheets, 144x120 showroom previews,
48x40 inventory icons, and meta.json for all 16 vehicle models.
Mirrors all assets to apps/web/public/vehicles/.
"""

import os
import sys
import json
import shutil
import base64
from vehicle_art import render

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from PIL import Image

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(ROOT_DIR, "assets", "vehicles")
PUBLIC_DIR = os.path.join(ROOT_DIR, "apps", "web", "public", "vehicles")

# ==============================================================================
# CANONICAL 16 VEHICLE SPECIFICATIONS (Synchronized with @cozy/game-data)
# ==============================================================================
VEHICLE_SPECS = [
    # 1 Bicycle
    {
        "category": "bicycles",
        "model": "trek-marlin-7",
        "id": "bicycles/trek-marlin-7",
        "name": "Trek Marlin 7 Gen 3",
        "brand": "Trek",
        "kind": "bicycle",
        "price": 200,
        "speed": 195,
        "colors": {
            "primary": "#0284c7",     # Alpine Blue
            "secondary": "#0f172a",   # Matte Black
            "accent": "#38bdf8",      # Sky highlight
            "trim": "#64748b",        # Silver alloy
            "glass": "transparent",
            "saddle": "#18181b",
        },
        "description": "Xe đạp địa hình thể thao Trek chính hãng, khung nhôm Alpha Silver nhẹ bền.",
        "seat": {"x": 24, "y": 18},
    },
    # 7 Motorcycles
    {
        "category": "motorcycles",
        "model": "vespa-primavera-150",
        "id": "motorcycles/vespa-primavera-150",
        "name": "Vespa Primavera 150",
        "brand": "Vespa",
        "kind": "motorcycle",
        "price": 700,
        "speed": 270,
        "colors": {
            "primary": "#f43f5e",     # Coral Pink/Red
            "secondary": "#fef3c7",   # Cream saddle
            "accent": "#fb7185",      # Body highlight
            "trim": "#e2e8f0",        # Chrome trim
            "glass": "#bae6fd",
            "saddle": "#fef3c7",
        },
        "description": "Xe tay ga thời trang Ý Vespa Primavera, thanh lịch và quyến rũ trên phố.",
        "seat": {"x": 24, "y": 18},
    },
    {
        "category": "motorcycles",
        "model": "ducati-panigale-v4",
        "id": "motorcycles/ducati-panigale-v4",
        "name": "Ducati Panigale V4 S",
        "brand": "Ducati",
        "kind": "motorcycle",
        "price": 2400,
        "speed": 310,
        "colors": {
            "primary": "#dc2626",     # Rosso Corsa Red
            "secondary": "#0f172a",   # Carbon black
            "accent": "#f59e0b",      # Gold Öhlins forks
            "trim": "#334155",        # Frame slate
            "glass": "#67e8f9",
            "saddle": "#0f172a",
        },
        "description": "Siêu mô tô phân khối lớn Ducati động cơ Desmosedici Stradale, sắc đỏ Rosso Corsa.",
        "seat": {"x": 24, "y": 17},
    },
    {
        "category": "motorcycles",
        "model": "honda-super-cub",
        "id": "motorcycles/honda-super-cub",
        "name": "Honda Super Cub C125",
        "brand": "Honda",
        "kind": "motorcycle",
        "price": 500,
        "speed": 220,
        "colors": {
            "primary": "#0ea5e9",     # Pearl Niltava Blue
            "secondary": "#f8fafc",   # Classic White legshields
            "accent": "#7f1d1d",      # Vintage red saddle
            "trim": "#cbd5e1",        # Chrome luggage rack
            "glass": "#e0f2fe",
            "saddle": "#7f1d1d",
        },
        "description": "Huyền thoại đô thị Honda Super Cub C125 cổ điển, tiết kiệm nhiên liệu và bền bỉ.",
        "seat": {"x": 24, "y": 18},
    },
    {
        "category": "motorcycles",
        "model": "harley-davidson-fat-boy",
        "id": "motorcycles/harley-davidson-fat-boy",
        "name": "Harley-Davidson Fat Boy 114",
        "brand": "Harley-Davidson",
        "kind": "motorcycle",
        "price": 1600,
        "speed": 250,
        "colors": {
            "primary": "#18181b",     # Vivid Gloss Black
            "secondary": "#f1f5f9",   # Heavy chrome engine
            "accent": "#94a3b8",      # Solid disc wheels
            "trim": "#e2e8f0",        # Shotgun exhaust
            "glass": "#f8fafc",
            "saddle": "#09090b",
        },
        "description": "Biểu tượng cơ bắp cruiser Harley-Davidson Fat Boy 114, động cơ Milwaukee-Eight uy lực.",
        "seat": {"x": 24, "y": 19},
    },
    {
        "category": "motorcycles",
        "model": "kawasaki-ninja-h2",
        "id": "motorcycles/kawasaki-ninja-h2",
        "name": "Kawasaki Ninja H2 Carbon",
        "brand": "Kawasaki",
        "kind": "motorcycle",
        "price": 3000,
        "speed": 330,
        "colors": {
            "primary": "#0f172a",     # Mirror-coated dark spark
            "secondary": "#22c55e",   # Kawasaki Lime Green trellis
            "accent": "#4ade80",      # Green highlights
            "trim": "#1e293b",        # Carbon winglets
            "glass": "#86efac",
            "saddle": "#020617",
        },
        "description": "Siêu phẩm siêu nạp Kawasaki Ninja H2 Carbon, tốc độ xé gió đỉnh cao công nghệ.",
        "seat": {"x": 24, "y": 17},
    },
    {
        "category": "motorcycles",
        "model": "yamaha-yzf-r1",
        "id": "motorcycles/yamaha-yzf-r1",
        "name": "Yamaha YZF-R1M",
        "brand": "Yamaha",
        "kind": "motorcycle",
        "price": 2600,
        "speed": 315,
        "colors": {
            "primary": "#1d4ed8",     # Racing Icon Blue
            "secondary": "#1e293b",   # Matte dark bellypan
            "accent": "#60a5fa",      # Blue highlight
            "trim": "#94a3b8",        # Titanium exhaust
            "glass": "#93c5fd",
            "saddle": "#0f172a",
        },
        "description": "Chiến mã đua Yamaha YZF-R1M công nghệ MotoGP, động cơ Crossplane âm thanh phấn khích.",
        "seat": {"x": 24, "y": 17},
    },
    {
        "category": "motorcycles",
        "model": "bmw-r1250-gs",
        "id": "motorcycles/bmw-r1250-gs",
        "name": "BMW R 1250 GS Adventure",
        "brand": "BMW",
        "kind": "motorcycle",
        "price": 2200,
        "speed": 260,
        "colors": {
            "primary": "#f8fafc",     # Light White
            "secondary": "#2563eb",   # BMW M Racing Blue
            "accent": "#dc2626",      # BMW M Red
            "trim": "#475569",        # Steel crash bars & boxer head
            "glass": "#e2e8f0",
            "saddle": "#1e293b",
        },
        "description": "Vua phượt địa hình BMW R 1250 GS Adventure động cơ Boxer ShiftCam, chinh phục mọi cung đường.",
        "seat": {"x": 24, "y": 18},
    },
    # 8 Cars
    {
        "category": "cars",
        "model": "mercedes-benz-g63",
        "id": "cars/mercedes-benz-g63",
        "name": "Mercedes-Benz G63 AMG",
        "brand": "Mercedes-Benz",
        "kind": "car",
        "price": 1800,
        "speed": 240,
        "colors": {
            "primary": "#1b4332",     # Deep Emerald Green
            "secondary": "#0f172a",   # Obsidian Black trim
            "accent": "#2d6a4f",      # Emerald highlight
            "trim": "#cbd5e1",        # Panamericana chrome
            "glass": "#93c5fd",       # Blue reflective windshield
            "saddle": None,
        },
        "description": "Vua địa hình SUV Mercedes-AMG G63 hầm hố, động cơ V8 Biturbo mạnh mẽ uy lực.",
        "seat": None,
    },
    {
        "category": "cars",
        "model": "lamborghini-aventador",
        "id": "cars/lamborghini-aventador",
        "name": "Lamborghini Aventador SVJ",
        "brand": "Lamborghini",
        "kind": "car",
        "price": 4500,
        "speed": 340,
        "colors": {
            "primary": "#eab308",     # Giallo Orion Yellow
            "secondary": "#0f172a",   # Forged carbon trim
            "accent": "#facc15",      # Yellow highlight
            "trim": "#18181b",        # ALA carbon wing
            "glass": "#67e8f9",       # Tinted windshield
            "saddle": None,
        },
        "description": "Siêu phẩm đỉnh cao Lamborghini Aventador SVJ V12 khí động học ALA, màu vàng Giallo rực rỡ.",
        "seat": None,
    },
    {
        "category": "cars",
        "model": "porsche-911",
        "id": "cars/porsche-911",
        "name": "Porsche 911 GT3 RS",
        "brand": "Porsche",
        "kind": "car",
        "price": 3600,
        "speed": 320,
        "colors": {
            "primary": "#0284c7",     # Shark Blue
            "secondary": "#0f172a",   # Carbon aerodynamic elements
            "accent": "#38bdf8",      # Blue highlight
            "trim": "#1e293b",        # Swan-neck rear wing
            "glass": "#93c5fd",
            "saddle": None,
        },
        "description": "Chiến mã đường đua Porsche 911 GT3 RS cánh gió swan-neck khổng lồ, hiệu năng thuần chất.",
        "seat": None,
    },
    {
        "category": "cars",
        "model": "toyota-supra-mk4",
        "id": "cars/toyota-supra-mk4",
        "name": "Toyota Supra MK4 1994",
        "brand": "Toyota",
        "kind": "car",
        "price": 2500,
        "speed": 290,
        "colors": {
            "primary": "#ea580c",     # Super Orange
            "secondary": "#18181b",   # Black 4-pod rear panel
            "accent": "#fb923c",      # Orange highlight
            "trim": "#cbd5e1",        # Polished cannon exhaust
            "glass": "#93c5fd",
            "saddle": None,
        },
        "description": "Huyền thoại đường phố Nhật Bản Toyota Supra MK4 động cơ 2JZ-GTE trứ danh.",
        "seat": None,
    },
    {
        "category": "cars",
        "model": "ferrari-f40",
        "id": "cars/ferrari-f40",
        "name": "Ferrari F40 1987",
        "brand": "Ferrari",
        "kind": "car",
        "price": 4200,
        "speed": 335,
        "colors": {
            "primary": "#dc2626",     # Rosso Corsa Red
            "secondary": "#0f172a",   # NACA duct vents
            "accent": "#ef4444",      # Highlight red
            "trim": "#94a3b8",        # Triple center exhaust
            "glass": "#93c5fd",       # Louvered Lexan engine cover
            "saddle": None,
        },
        "description": "Kiệt tác siêu xe kỷ niệm Ferrari F40 V8 Twin-Turbo thuần cơ khí cổ điển sắc đỏ Ý.",
        "seat": None,
    },
    {
        "category": "cars",
        "model": "ford-mustang",
        "id": "cars/ford-mustang",
        "name": "Ford Mustang Shelby GT500",
        "brand": "Ford",
        "kind": "car",
        "price": 2000,
        "speed": 275,
        "colors": {
            "primary": "#1d4ed8",     # Performance Blue
            "secondary": "#ffffff",   # Dual white racing stripes
            "accent": "#3b82f6",      # Blue highlight
            "trim": "#0f172a",        # Cobra honeycomb grille
            "glass": "#93c5fd",
            "saddle": None,
        },
        "description": "Cơ bắp Mỹ đích thực Ford Mustang Shelby GT500 siêu nạp V8 gầm rú uy lực.",
        "seat": None,
    },
    {
        "category": "cars",
        "model": "rolls-royce-phantom",
        "id": "cars/rolls-royce-phantom",
        "name": "Rolls-Royce Phantom VIII",
        "brand": "Rolls-Royce",
        "kind": "car",
        "price": 5000,
        "speed": 250,
        "colors": {
            "primary": "#0f172a",     # Midnight Sapphire
            "secondary": "#cbd5e1",   # Satin silver bonnet
            "accent": "#1e293b",      # Deep navy gloss
            "trim": "#f8fafc",        # Chrome Pantheon grille
            "glass": "#60a5fa",       # Tinted executive glass
            "saddle": None,
        },
        "description": "Đỉnh cao xa xỉ quý tộc Rolls-Royce Phantom VIII êm ái cách âm tuyệt đối như thảm bay.",
        "seat": None,
    },
    {
        "category": "cars",
        "model": "tesla-model-s",
        "id": "cars/tesla-model-s",
        "name": "Tesla Model S Plaid",
        "brand": "Tesla",
        "kind": "car",
        "price": 3100,
        "speed": 325,
        "colors": {
            "primary": "#b91c1c",     # Ultra Red
            "secondary": "#0f172a",   # Panoramic tinted glass roof
            "accent": "#ef4444",      # Red highlight
            "trim": "#cbd5e1",        # Flush chrome handles
            "glass": "#38bdf8",       # Glass canopy
            "saddle": None,
        },
        "description": "Quái vật tăng tốc thuần điện Tesla Model S Plaid 3 mô-tơ điện bứt phá ngoạn mục.",
        "seat": None,
    },
]


# ==============================================================================
# COLOR & SHADING UTILITIES (4-Tier Color Depth Engine)
# ==============================================================================
def render_vehicle_frame(spec, dir_idx, frame_idx):
    return render(spec, dir_idx, frame_idx)


def generate_fallback():
    """Row runs preserve exactly the PNG pixels, including contact-shadow alpha.

    This is synchronous bundled data: it works even when every PNG request fails.
    Each byte pair is (run length, palette index); runs never cross a row.
    """
    output = {}
    for spec in VEHICLE_SPECS:
        palette = [(0, 0, 0, 0)]
        frames = []
        for direction in range(4):
            for frame in range(4):
                image = render_vehicle_frame(spec, direction, frame)
                runs = bytearray()
                for y in range(40):
                    x = 0
                    while x < 48:
                        color = image.getpixel((x, y))
                        if color not in palette:
                            palette.append(color)
                        end = x+1
                        while end < 48 and image.getpixel((end, y)) == color:
                            end += 1
                        runs.extend((end-x, palette.index(color)))
                        x = end
                frames.append(base64.b64encode(runs).decode('ascii'))
        output[spec['id']] = {'palette': ['#' + ''.join(f'{c:02x}' for c in rgba) for rgba in palette], 'frames': frames}
    target = os.path.join(ROOT_DIR, 'apps', 'web', 'src', 'art', 'vehicle-pixels.json')
    with open(target, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
        f.write('\n')


# ==============================================================================
# SPRITESHEET, PREVIEW, ICON & META COMPILATION & MIRRORING
# ==============================================================================
def generate_asset_pack(spec):
    category = spec["category"]
    model = spec["model"]
    dest_dir = os.path.join(ASSETS_DIR, category, model)
    mirror_dir = os.path.join(PUBLIC_DIR, category, model)
    
    os.makedirs(dest_dir, exist_ok=True)
    os.makedirs(mirror_dir, exist_ok=True)

    # 1. Spritesheet (192 x 160 px): 4 cols x 4 rows
    spritesheet = Image.new("RGBA", (192, 160), (0, 0, 0, 0))
    for row in range(4):      # 0=Down, 1=Left, 2=Right, 3=Up
        for col in range(4):  # 0=Idle, 1=Drive 1, 2=Drive 2, 3=Drive 3
            frame_img = render_vehicle_frame(spec, row, col)
            spritesheet.paste(frame_img, (col * 48, row * 40))

    spritesheet_path = os.path.join(dest_dir, "spritesheet.png")
    spritesheet.save(spritesheet_path, "PNG")

    # 2. Icon (48 x 40 px): Clean side profile facing Right (dir=2, frame=0)
    icon = render_vehicle_frame(spec, 2, 0)
    icon_path = os.path.join(dest_dir, "icon.png")
    icon.save(icon_path, "PNG")

    # 3. Showroom Preview (144 x 120 px): 3x nearest-neighbor integer upscale
    preview = Image.new("RGBA", (144, 120), (0, 0, 0, 0))
    upscaled = icon.resize((144, 120), Image.NEAREST)
    preview.paste(upscaled, (0, 0))
    preview_path = os.path.join(dest_dir, "preview.png")
    preview.save(preview_path, "PNG")

    # 4. Meta JSON (Synchronized with @cozy/game-data)
    seat = spec["seat"] or {"x": 24, "y": 18}
    meta_data = {
        "id": spec["id"],
        "name": spec["name"],
        "brand": spec["brand"],
        "category": spec["kind"],
        "price": spec["price"],
        "speed": spec["speed"],
        "description": spec["description"],
        "dimensions": {
            "frameWidth": 48,
            "frameHeight": 40,
            "spritesheetWidth": 192,
            "spritesheetHeight": 160,
            "previewWidth": 144,
            "previewHeight": 120,
            "iconWidth": 48,
            "iconHeight": 40
        },
        "anchorPoints": {
            "contactY": 37,
            "seat": seat,
            "center": {"x": 24, "y": 20}
        },
        "lights": {
            "headlight": {
                "frontOffsetX": 20,
                "frontOffsetY": 18,
                "color": "#ffffff"
            },
            "taillight": {
                "rearOffsetX": 18,
                "rearOffsetY": 18,
                "color": "#ef4444"
            }
        },
        "colors": spec["colors"]
    }
    meta_path = os.path.join(dest_dir, "meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta_data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    # Mirror all 4 files to apps/web/public/vehicles/
    for filename in ["spritesheet.png", "icon.png", "preview.png", "meta.json"]:
        src_file = os.path.join(dest_dir, filename)
        dst_file = os.path.join(mirror_dir, filename)
        shutil.copy2(src_file, dst_file)

    print(f"[OK] Generated {spec['id']} (4 files mirrored)")


def main():
    print(f"Generating 16 WOW 2.5D Pixel Art vehicle asset packs into {ASSETS_DIR} & {PUBLIC_DIR}...")
    for spec in VEHICLE_SPECS:
        generate_asset_pack(spec)
    generate_fallback()
    print("All 16 WOW 2.5D vehicle asset packs successfully generated!")

if __name__ == "__main__":
    main()
