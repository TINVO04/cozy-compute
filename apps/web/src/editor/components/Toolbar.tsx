import React from 'react';
import { useEditorStore, type EditorTool } from '../hooks/useEditorStore.js';
import {
  MousePointer,
  Move,
  PlusSquare,
  Trash2,
  Paintbrush,
  Eraser,
  Grid,
  ShieldAlert,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Download,
  Server,
} from 'lucide-react';
import { ServerCollisionExporter } from '@cozy/map-editor';
import { defaultAssetRegistry } from '@cozy/game-assets';

export const Toolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    showGrid,
    toggleGrid,
    showCollision,
    toggleCollision,
    zoom,
    setZoom,
    undo,
    redo,
    undoManager,
    map,
    getExportJson,
  } = useEditorStore();

  const handleExportJson = () => {
    try {
      const json = getExportJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${map?.id || 'map'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Lỗi xuất map: ${(err as Error).message}`);
    }
  };

  const handleExportServerBlockers = () => {
    if (!map) return;
    try {
      const serverData = ServerCollisionExporter.exportForServer(map, defaultAssetRegistry);
      const json = JSON.stringify(serverData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${map.id}_server_collision.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Lỗi xuất server collision: ${(err as Error).message}`);
    }
  };

  const tools: Array<{ id: EditorTool; label: string; icon: React.ReactNode }> = [
    { id: 'select', label: 'Chọn (V)', icon: <MousePointer size={16} /> },
    { id: 'move', label: 'Di chuyển (M)', icon: <Move size={16} /> },
    { id: 'place', label: 'Đặt Asset (P)', icon: <PlusSquare size={16} /> },
    { id: 'paint', label: 'Vẽ Tile (B)', icon: <Paintbrush size={16} /> },
    { id: 'erase', label: 'Tẩy Tile (E)', icon: <Eraser size={16} /> },
    { id: 'delete', label: 'Xóa (Del)', icon: <Trash2 size={16} /> },
  ];

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 text-slate-200 select-none">
      {/* Left: Tools */}
      <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            title={t.label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTool === t.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {t.icon}
            <span>{t.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Center: View & Overlays */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleGrid}
          title="Bật/Tắt Lưới 32px"
          className={`p-2 rounded border transition-colors ${
            showGrid
              ? 'bg-slate-700 text-emerald-400 border-emerald-500/50'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <Grid size={16} />
        </button>

        <button
          onClick={toggleCollision}
          title="Bật/Tắt Vùng Va Chạm Server (BLOCKERS)"
          className={`p-2 rounded border transition-colors ${
            showCollision
              ? 'bg-slate-700 text-amber-400 border-amber-500/50'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <ShieldAlert size={16} />
        </button>

        <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded border border-slate-700 text-xs">
          <button
            onClick={() => setZoom(zoom - 0.25)}
            className="p-1 text-slate-400 hover:text-white"
            title="Thu nhỏ"
          >
            <ZoomOut size={14} />
          </button>
          <span className="w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(zoom + 0.25)}
            className="p-1 text-slate-400 hover:text-white"
            title="Phóng to"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* Right: History & Export */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded border border-slate-700">
          <button
            onClick={undo}
            disabled={!undoManager.canUndo}
            title="Hoàn tác (Ctrl+Z)"
            className="p-1.5 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!undoManager.canRedo}
            title="Làm lại (Ctrl+Y)"
            className="p-1.5 rounded text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <button
          onClick={handleExportServerBlockers}
          title="Xuất Mask Va Chạm cho Colyseus Server Room"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded text-xs font-medium border border-amber-500/50 transition-colors"
        >
          <Server size={14} />
          <span>Server Physics</span>
        </button>

        <button
          onClick={handleExportJson}
          title="Xuất file Map JSON chuẩn 32px"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium border border-blue-500/50 shadow transition-colors"
        >
          <Download size={14} />
          <span>Lưu Map JSON</span>
        </button>
      </div>
    </div>
  );
};
