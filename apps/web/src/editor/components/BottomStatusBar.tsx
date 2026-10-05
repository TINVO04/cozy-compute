import React from 'react';
import { useEditorStore } from '../hooks/useEditorStore.js';
import { CheckCircle2, Crosshair, ZoomIn, Layers } from 'lucide-react';

export const BottomStatusBar: React.FC = () => {
  const { cursorTile, cursorPixel, activeTool, activeLayerId, zoom, map, isDirty } = useEditorStore();

  if (!map) return null;

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 select-none">
      {/* Left: Coordinates */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Crosshair size={13} className="text-emerald-400" />
          <span>Tile:</span>
          <span className="font-mono text-emerald-400 font-semibold">
            [{cursorTile.x}, {cursorTile.y}]
          </span>
          <span className="text-slate-600">|</span>
          <span>Pixel:</span>
          <span className="font-mono text-slate-300">
            ({cursorPixel.x}, {cursorPixel.y})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Layers size={12} className="text-slate-500" />
          <span>Layer:</span>
          <span className="font-medium text-slate-300">{activeLayerId}</span>
        </div>
      </div>

      {/* Center: Status & Validation */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-emerald-400">
          <CheckCircle2 size={13} />
          <span>32px Grid Matrix Validated</span>
        </div>
        {isDirty && (
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
            Có thay đổi chưa lưu
          </span>
        )}
      </div>

      {/* Right: Map Spec & Zoom */}
      <div className="flex items-center gap-4">
        <div>
          <span>Bản đồ: </span>
          <span className="font-mono text-slate-300">
            {map.width}x{map.height} ({map.width * map.tileSize}x{map.height * map.tileSize}px)
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ZoomIn size={12} className="text-slate-500" />
          <span className="font-mono text-slate-300">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
};
