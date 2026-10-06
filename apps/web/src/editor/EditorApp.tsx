import React, { useEffect, useState } from 'react';
import { useEditorStore } from './hooks/useEditorStore.js';
import { Toolbar } from './components/Toolbar.js';
import { AssetPanel } from './components/AssetPanel.js';
import { LayerPanel } from './components/LayerPanel.js';
import { InspectorPanel } from './components/InspectorPanel.js';
import { MapCanvas } from './components/MapCanvas.js';
import { BottomStatusBar } from './components/BottomStatusBar.js';
import { MapLoader, type MapDefinition } from '@cozy/map-editor';
import { defaultAssetRegistry } from '@cozy/game-assets';
import { ArrowLeft, Compass, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';

export const EditorApp: React.FC = () => {
  const { map, setMap, setActiveTool, undo, redo, toggleGrid, toggleCollision, deleteObject, selectedObjectId } =
    useEditorStore();
  const [loading, setLoading] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'assets' | 'layers'>('assets');
  const navigate = useNavigate();

  // Load initial map
  useEffect(() => {
    let isMounted = true;

    async function loadInitialMap() {
      try {
        const res = await fetch('/maps/farm-dong-nai.json');
        if (res.ok) {
          const raw = await res.json();
          const { map: loadedMap } = MapLoader.load(raw, { registry: defaultAssetRegistry });
          if (isMounted) {
            setMap(loadedMap);
            setLoading(false);
          }
          return;
        }
      } catch (err) {
        console.warn('Could not fetch /maps/farm-dong-nai.json, generating fallback map:', err);
      }

      // Fallback empty 48x32 standard map
      const fallbackMap: MapDefinition = {
        id: 'farm-dong-nai-01',
        version: 1,
        tileSize: 32,
        width: 48,
        height: 32,
        layers: [
          {
            id: 'layer_ground',
            name: 'Ground',
            type: 'tilelayer',
            depth: -10,
            visible: true,
            data: new Array(48 * 32).fill(1),
          },
          {
            id: 'layer_roads',
            name: 'Roads',
            type: 'tilelayer',
            depth: -9,
            visible: true,
            data: new Array(48 * 32).fill(0),
          },
          {
            id: 'layer_fences',
            name: 'Fences',
            type: 'objectgroup',
            depth: -8,
            visible: true,
            objects: [],
          },
          {
            id: 'layer_structures',
            name: 'Structures',
            type: 'objectgroup',
            depth: 0,
            visible: true,
            objects: [],
          },
          {
            id: 'layer_overhang',
            name: 'Overhang',
            type: 'objectgroup',
            depth: 3000,
            visible: true,
            objects: [],
          },
        ],
        zones: [],
        farmPlots: [],
        metadata: {
          name: 'Nông Trại Đồng Nai',
          region: 'Đồng Nai',
          biome: 'tropical-farm',
          createdAt: new Date().toISOString(),
        },
      };

      if (isMounted) {
        setMap(fallbackMap);
        setLoading(false);
      }
    }

    loadInitialMap();

    return () => {
      isMounted = false;
    };
  }, [setMap]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'm' || e.key === 'M') {
        setActiveTool('move');
      } else if (e.key === 'p' || e.key === 'P') {
        setActiveTool('place');
      } else if (e.key === 'b' || e.key === 'B') {
        setActiveTool('paint');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('erase');
      } else if (e.key === 'g' || e.key === 'G') {
        toggleGrid();
      } else if (e.key === 'c' || e.key === 'C') {
        toggleCollision();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          deleteObject(selectedObjectId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, undo, redo, toggleGrid, toggleCollision, deleteObject, selectedObjectId]);

  if (loading || !map) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-300 font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải Map Editor & Asset Registry...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Quay lại Game"
          >
            <ArrowLeft size={14} />
            <span>Trở Về Game</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
              <Compass size={16} />
              <span>Cozy Map Editor</span>
            </span>
            <span className="text-slate-500">/</span>
            <span className="font-medium text-slate-300">{map.metadata.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
              32px Standard
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch sidebar view tab */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setActiveSidebarTab('assets')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                activeSidebarTab === 'assets'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Assets
            </button>
            <button
              onClick={() => setActiveSidebarTab('layers')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                activeSidebarTab === 'layers'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Layers
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        {activeSidebarTab === 'assets' ? <AssetPanel /> : <LayerPanel />}

        {/* Central Canvas Viewport */}
        <MapCanvas />

        {/* Right Inspector */}
        <InspectorPanel />
      </div>

      {/* Bottom Status Bar */}
      <BottomStatusBar />
    </div>
  );
};

export default EditorApp;
