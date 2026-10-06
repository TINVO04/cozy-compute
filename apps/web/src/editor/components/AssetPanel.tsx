import React, { useState, useMemo } from 'react';
import { useEditorStore } from '../hooks/useEditorStore.js';
import {
  defaultAssetRegistry,
  type AssetCategory,
  type AssetDefinition,
} from '@cozy/game-assets';
import { Search, Trees, Home, Flower2, Dog, Fence, User, Mountain, Route } from 'lucide-react';

const CATEGORIES: Array<{ id: AssetCategory; label: string; icon: React.ReactNode }> = [
  { id: 'buildings', label: 'Công trình', icon: <Home size={14} /> },
  { id: 'vegetation', label: 'Cây cối', icon: <Trees size={14} /> },
  { id: 'farming', label: 'Nông nghiệp', icon: <Flower2 size={14} /> },
  { id: 'props', label: 'Vật dụng', icon: <Fence size={14} /> },
  { id: 'animals', label: 'Gia súc', icon: <Dog size={14} /> },
  { id: 'characters', label: 'Nhân vật', icon: <User size={14} /> },
  { id: 'terrain', label: 'Nền đất', icon: <Mountain size={14} /> },
  { id: 'roads', label: 'Đường đi', icon: <Route size={14} /> },
];

export const AssetPanel: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('buildings');
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedAssetId, setSelectedAsset } = useEditorStore();

  const allAssets = useMemo(() => defaultAssetRegistry.getAll(), []);

  const filteredAssets = useMemo(() => {
    return allAssets.filter((asset) => {
      if (asset.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchName = asset.name.toLowerCase().includes(q);
      const matchId = asset.id.toLowerCase().includes(q);
      const matchTags = asset.tags.some((t) => t.toLowerCase().includes(q));
      return matchName || matchId || matchTags;
    });
  }, [allAssets, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col w-72 h-full bg-slate-900 border-r border-slate-700 text-slate-200">
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Kho Asset Chuẩn 32px
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            {allAssets.length} Assets
          </span>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo tên, tag (xoài, nhà...)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto p-1.5 gap-1 border-b border-slate-800 bg-slate-950/40 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-slate-700 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Asset Cards Grid */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Không tìm thấy asset nào phù hợp.
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const isSelected = selectedAssetId === asset.id;
            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                    : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-slate-200 truncate">
                      {asset.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      {asset.id}
                    </p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono shrink-0">
                    {asset.footprint.tileWidth}x{asset.footprint.tileHeight}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {asset.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900/60 text-slate-400 border border-slate-700/50"
                    >
                      #{tag}
                    </span>
                  ))}
                  {asset.collision.solid && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">
                      Solid
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
