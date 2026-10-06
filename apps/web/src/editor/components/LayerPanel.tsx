import React from 'react';
import { useEditorStore } from '../hooks/useEditorStore.js';
import { Layers, Eye, EyeOff, Box, Image as ImageIcon } from 'lucide-react';

export const LayerPanel: React.FC = () => {
  const { map, activeLayerId, setActiveLayer, toggleLayerVisibility } = useEditorStore();

  if (!map) return null;

  return (
    <div className="flex flex-col w-64 bg-slate-900 border-r border-slate-700 text-slate-200">
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-1.5">
          <Layers size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quản lý Layer</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">{map.layers.length} layers</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {map.layers.map((layer) => {
          const isActive = activeLayerId === layer.id;
          const isObjectLayer = layer.type === 'objectgroup';
          const objectCount = isObjectLayer ? ((layer as { objects?: unknown[] }).objects?.length ?? 0) : 0;

          return (
            <div
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer border transition-colors ${
                isActive
                  ? 'bg-slate-800 border-emerald-500/80 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                  title={layer.visible ? 'Ẩn layer' : 'Hiện layer'}
                >
                  {layer.visible ? (
                    <Eye size={14} className="text-emerald-400" />
                  ) : (
                    <EyeOff size={14} className="text-slate-500" />
                  )}
                </button>

                <div className="flex items-center gap-1.5 min-w-0">
                  {isObjectLayer ? (
                    <Box size={13} className="text-amber-400 shrink-0" />
                  ) : (
                    <ImageIcon size={13} className="text-blue-400 shrink-0" />
                  )}
                  <span className="text-xs font-medium truncate">{layer.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                {isObjectLayer ? (
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {objectCount} objs
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">tile</span>
                )}
                <span>z:{layer.depth}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
