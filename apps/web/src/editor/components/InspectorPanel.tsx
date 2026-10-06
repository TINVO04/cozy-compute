import React from 'react';
import { useEditorStore } from '../hooks/useEditorStore.js';
import { defaultAssetRegistry } from '@cozy/game-assets';
import type { MapObjectLayer } from '@cozy/map-editor';
import { Sliders, Trash2, ShieldAlert, Footprints, Info } from 'lucide-react';

export const InspectorPanel: React.FC = () => {
  const { map, selectedObjectId, moveObject, deleteObject } = useEditorStore();

  if (!map) return null;

  // Find the selected object across all object layers
  let selectedObject = null;

  if (selectedObjectId) {
    for (const layer of map.layers) {
      if (layer.type === 'objectgroup') {
        const obj = (layer as MapObjectLayer).objects.find((o) => o.id === selectedObjectId);
        if (obj) {
          selectedObject = obj;
          break;
        }
      }
    }
  }

  const asset = selectedObject ? defaultAssetRegistry.get(selectedObject.assetId) : null;

  return (
    <div className="flex flex-col w-72 h-full bg-slate-900 border-l border-slate-700 text-slate-200">
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-1.5">
          <Sliders size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Inspector Thuộc Tính
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {selectedObject && asset ? (
          <>
            {/* Object Header */}
            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">{asset.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">{selectedObject.id}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                  {asset.category}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-700/60 text-xs text-slate-400">
                <span className="font-mono text-slate-300">{asset.id}</span>
              </div>
            </div>

            {/* Transform / Coordinates */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tọa Độ Thế Giới (Pixel & Tile)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                  <label className="text-[10px] text-slate-400 block mb-1">X (Pixel / Tile)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={selectedObject.x}
                      onChange={(e) =>
                        moveObject(selectedObject.id, parseInt(e.target.value) || 0, selectedObject.y)
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      t:{Math.floor(selectedObject.x / 32)}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                  <label className="text-[10px] text-slate-400 block mb-1">Y (Pixel / Tile)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={selectedObject.y}
                      onChange={(e) =>
                        moveObject(selectedObject.id, selectedObject.x, parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      t:{Math.floor(selectedObject.y / 32)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Snap Nudge Buttons */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => moveObject(selectedObject.id, selectedObject.x - 32, selectedObject.y)}
                  className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
                >
                  ← 32px
                </button>
                <button
                  type="button"
                  onClick={() => moveObject(selectedObject.id, selectedObject.x + 32, selectedObject.y)}
                  className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
                >
                  32px →
                </button>
                <button
                  type="button"
                  onClick={() => moveObject(selectedObject.id, selectedObject.x, selectedObject.y - 32)}
                  className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
                >
                  ↑ 32px
                </button>
                <button
                  type="button"
                  onClick={() => moveObject(selectedObject.id, selectedObject.x, selectedObject.y + 32)}
                  className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
                >
                  ↓ 32px
                </button>
              </div>
            </div>

            {/* Footprint & Collision */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Footprint & Collision
              </span>

              <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Footprints size={13} />
                    <span>Footprint Tiles:</span>
                  </span>
                  <span className="font-mono text-slate-200">
                    {asset.footprint.tileWidth} x {asset.footprint.tileHeight} tiles
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-400">
                    <ShieldAlert size={13} />
                    <span>Colyseus Blocker:</span>
                  </span>
                  <span
                    className={`font-semibold text-[11px] px-1.5 py-0.5 rounded ${
                      asset.collision.solid
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {asset.collision.solid ? 'Solid (Chặn)' : 'Walkable (Đi qua)'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Anchor Origin:</span>
                  <span className="font-mono text-slate-300">
                    ({asset.anchor.x}, {asset.anchor.y})
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => deleteObject(selectedObject.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-medium transition-colors"
              >
                <Trash2 size={14} />
                <span>Xóa đối tượng khỏi map</span>
              </button>
            </div>
          </>
        ) : (
          /* General Map Info when no object is selected */
          <div className="space-y-4">
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <Info size={14} />
                <span>Thông Tin Bản Đồ</span>
              </div>
              <h3 className="text-sm font-bold text-white">{map.metadata.name}</h3>
              <p className="text-xs text-slate-400">{map.metadata.description}</p>
            </div>

            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Kích thước map:</span>
                <span className="font-mono text-emerald-400">
                  {map.width} x {map.height} tiles
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Độ phân giải thế giới:</span>
                <span className="font-mono text-slate-200">
                  {map.width * map.tileSize} x {map.height * map.tileSize} px
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Chuẩn lưới:</span>
                <span className="font-mono text-emerald-400 font-semibold">32 x 32 px</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Khu vực tương tác (Zones):</span>
                <span className="font-mono text-slate-200">{map.zones.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Ô đất nông trại (FarmPlots):</span>
                <span className="font-mono text-slate-200">{map.farmPlots.length}</span>
              </div>
            </div>

            <div className="text-center py-4 text-xs text-slate-500">
              Nhấp chọn một vật thể trên canvas để chỉnh sửa thuộc tính.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
