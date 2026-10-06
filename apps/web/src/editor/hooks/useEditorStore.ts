import { create } from 'zustand';
import type { MapDefinition, MapObject } from '@cozy/map-editor';
import {
  UndoRedoManager,
  AddObjectCommand,
  MoveObjectCommand,
  DeleteObjectCommand,
  PaintTileCommand,
  MapSaver,
} from '@cozy/map-editor';
import { defaultAssetRegistry } from '@cozy/game-assets';

export type EditorTool = 'select' | 'move' | 'place' | 'delete' | 'paint' | 'erase';

export interface EditorState {
  map: MapDefinition | null;
  activeTool: EditorTool;
  activeLayerId: string;
  selectedObjectId: string | null;
  selectedAssetId: string | null;
  selectedTileGid: number;
  cursorTile: { x: number; y: number };
  cursorPixel: { x: number; y: number };
  zoom: number;
  showGrid: boolean;
  showCollision: boolean;
  isDirty: boolean;
  undoManager: UndoRedoManager;

  // Actions
  setMap: (map: MapDefinition) => void;
  setActiveTool: (tool: EditorTool) => void;
  setActiveLayer: (layerId: string) => void;
  selectObject: (id: string | null) => void;
  setSelectedAsset: (assetId: string | null) => void;
  setSelectedTileGid: (gid: number) => void;
  setCursor: (pixelX: number, pixelY: number) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  toggleCollision: () => void;

  // Map manipulation commands
  addObject: (assetId: string, x: number, y: number) => void;
  moveObject: (objectId: string, newX: number, newY: number) => void;
  deleteObject: (objectId: string) => void;
  paintTile: (tileIndex: number, gid: number) => void;
  toggleLayerVisibility: (layerId: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  getExportJson: () => string;
}

export const useEditorStore = create<EditorState>((set, get) => {
  const undoManager = new UndoRedoManager();

  return {
    map: null,
    activeTool: 'select',
    activeLayerId: 'layer_structures',
    selectedObjectId: null,
    selectedAssetId: 'tree-mango-large',
    selectedTileGid: 1,
    cursorTile: { x: 0, y: 0 },
    cursorPixel: { x: 0, y: 0 },
    zoom: 1.0,
    showGrid: true,
    showCollision: true,
    isDirty: false,
    undoManager,

    setMap: (map) => {
      undoManager.clear();
      set({
        map,
        isDirty: false,
        selectedObjectId: null,
        activeLayerId: map.layers[0]?.id ?? 'layer_structures',
      });
    },

    setActiveTool: (tool) => set({ activeTool: tool }),
    setActiveLayer: (layerId) => set({ activeLayerId: layerId }),
    selectObject: (id) => set({ selectedObjectId: id }),
    setSelectedAsset: (assetId) => set({ selectedAssetId: assetId, activeTool: 'place' }),
    setSelectedTileGid: (gid) => set({ selectedTileGid: gid, activeTool: 'paint' }),

    setCursor: (pixelX, pixelY) => {
      const tileX = Math.floor(pixelX / 32);
      const tileY = Math.floor(pixelY / 32);
      set({
        cursorPixel: { x: pixelX, y: pixelY },
        cursorTile: { x: tileX, y: tileY },
      });
    },

    setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(3.0, zoom)) }),
    toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
    toggleCollision: () => set((s) => ({ showCollision: !s.showCollision })),

    addObject: (assetId, x, y) => {
      const { map, activeLayerId, undoManager } = get();
      if (!map) return;

      const objId = `obj_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const newObj: MapObject = {
        id: objId,
        assetId,
        x,
        y,
        rotation: 0,
        scale: 1,
      };

      try {
        const cmd = new AddObjectCommand(map, activeLayerId, newObj);
        undoManager.execute(cmd);
        set({ isDirty: true, selectedObjectId: objId, map: { ...map } });
      } catch (err) {
        console.warn('Could not add object:', err);
      }
    },

    moveObject: (objectId, newX, newY) => {
      const { map, activeLayerId, undoManager } = get();
      if (!map) return;

      try {
        const cmd = new MoveObjectCommand(map, activeLayerId, objectId, newX, newY);
        undoManager.execute(cmd);
        set({ isDirty: true, map: { ...map } });
      } catch (err) {
        console.warn('Could not move object:', err);
      }
    },

    deleteObject: (objectId) => {
      const { map, activeLayerId, undoManager } = get();
      if (!map) return;

      try {
        const cmd = new DeleteObjectCommand(map, activeLayerId, objectId);
        undoManager.execute(cmd);
        set({ isDirty: true, selectedObjectId: null, map: { ...map } });
      } catch (err) {
        console.warn('Could not delete object:', err);
      }
    },

    paintTile: (tileIndex, gid) => {
      const { map, activeLayerId, undoManager } = get();
      if (!map) return;

      try {
        const cmd = new PaintTileCommand(map, activeLayerId, tileIndex, gid);
        undoManager.execute(cmd);
        set({ isDirty: true, map: { ...map } });
      } catch (err) {
        console.warn('Could not paint tile:', err);
      }
    },

    toggleLayerVisibility: (layerId) => {
      const { map } = get();
      if (!map) return;
      const target = map.layers.find((l) => l.id === layerId);
      if (target) {
        target.visible = !target.visible;
        set({ map: { ...map } });
      }
    },

    undo: () => {
      const { undoManager, map } = get();
      if (!map) return;
      if (undoManager.undo()) {
        set({ isDirty: true, map: { ...map } });
      }
    },

    redo: () => {
      const { undoManager, map } = get();
      if (!map) return;
      if (undoManager.redo()) {
        set({ isDirty: true, map: { ...map } });
      }
    },

    getExportJson: () => {
      const { map } = get();
      if (!map) return '';
      return MapSaver.save(map, { registry: defaultAssetRegistry });
    },
  };
});
