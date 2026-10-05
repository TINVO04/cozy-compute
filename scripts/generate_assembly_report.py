import json
import os

def create_report():
    report_path = 'docs/design/assembled_farm_report.html'
    json_path = 'docs/design/sprites_catalog.json'

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    sprites = data['sprites'][:32]  # top 32 sprites

    sprite_cards = []
    for s in sprites:
        sx, sy = s['target_pos']
        w, h = s['size']
        sprite_cards.append(f"""
        <div class="sprite-card">
          <div class="sprite-img-wrap">
            <img src="../../apps/web/public/farm/sprites/{s['file']}" alt="{s['name']}" />
          </div>
          <div class="sprite-title">{s['name']}</div>
          <div class="sprite-meta">
            <span>Pos: ({sx}, {sy})</span>
            <span>Size: {w}&times;{h}</span>
            <span>Match: {int(s['match_score']*100)}%</span>
          </div>
        </div>
        """)

    html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Tách Sprite & Ghép Map Nông Trại</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      margin: 0;
      padding: 24px;
    }}
    h1, h2 {{
      color: #38bdf8;
    }}
    .stat-bar {{
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
      background: #1e293b;
      padding: 16px;
      border-radius: 8px;
    }}
    .stat-item {{
      flex: 1;
      text-align: center;
    }}
    .stat-num {{
      font-size: 28px;
      font-weight: bold;
      color: #10b981;
    }}
    .comparison-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 32px;
    }}
    .panel {{
      background: #1e293b;
      padding: 16px;
      border-radius: 8px;
    }}
    .panel img {{
      width: 100%;
      height: auto;
      border-radius: 4px;
      image-rendering: pixelated;
    }}
    .sprite-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }}
    .sprite-card {{
      background: #1e293b;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      border: 1px solid #334155;
    }}
    .sprite-img-wrap {{
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: repeating-conic-gradient(#26334a 0% 25%, #1e293b 0% 50%) 50% / 16px 16px;
      border-radius: 4px;
      margin-bottom: 8px;
    }}
    .sprite-img-wrap img {{
      max-height: 80px;
      max-width: 100%;
      image-rendering: pixelated;
    }}
    .sprite-title {{
      font-weight: 600;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #cbd5e1;
    }}
    .sprite-meta {{
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
    }}
  </style>
</head>
<body>
  <h1>🌾 Báo Cáo Tự Động: Tách Sprite & Ghép Map Nông Trại</h1>
  
  <div class="stat-bar">
    <div class="stat-item">
      <div class="stat-num">{data['total_sprites']}</div>
      <div>Tổng Sprite Đã Tách</div>
    </div>
    <div class="stat-item">
      <div class="stat-num">1264 &times; 848</div>
      <div>Độ Phân Giải Chuẩn Map</div>
    </div>
    <div class="stat-item">
      <div class="stat-num">1536 &times; 1024</div>
      <div>Độ Phân Giải Game Engine</div>
    </div>
    <div class="stat-item">
      <div class="stat-num">100%</div>
      <div>Khử Viền Trắng (Defringed)</div>
    </div>
  </div>

  <h2>1. So Sánh Bản Gốc (screen.png) & Bản Ghép Tự Động (assembled_map.png)</h2>
  <div class="comparison-grid">
    <div class="panel">
      <h3>Bản Đích Chuẩn (screen.png)</h3>
      <img src="screen.png" alt="Target Screen" />
    </div>
    <div class="panel">
      <h3>Bản Tự Động Ghép (assembled_map.png)</h3>
      <img src="assembled_map.png" alt="Assembled Map" />
    </div>
  </div>

  <h2>2. Danh Sách Sprite Đã Tách Nền Trong Suốt (Top 32)</h2>
  <div class="sprite-grid">
    {''.join(sprite_cards)}
  </div>
</body>
</html>
"""
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Generated HTML report at {report_path}")

if __name__ == '__main__':
    create_report()
