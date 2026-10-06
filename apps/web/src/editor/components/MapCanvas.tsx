import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../hooks/useEditorStore.js';
import { defaultAssetRegistry } from '@cozy/game-assets';
import type { MapObjectLayer, MapTileLayer, MapObject } from '@cozy/map-editor';

export const MapCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    map,
    zoom,
    showGrid,
    showCollision,
    activeTool,
    selectedObjectId,
    selectedAssetId,
    cursorTile,
    setCursor,
    selectObject,
    addObject,
    moveObject,
    deleteObject,
    paintTile,
  } = useEditorStore();

  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [draggedObjectId, setDraggedObjectId] = useState<string | null>(null);

  // Preload textures for rendered objects and selected asset
  useEffect(() => {
    if (!map) return;
    const texturesToLoad = new Set<string>();

    for (const layer of map.layers) {
      if (layer.type === 'objectgroup') {
        const objLayer = layer as MapObjectLayer;
        for (const obj of objLayer.objects) {
          const asset = defaultAssetRegistry.get(obj.assetId);
          if (asset?.texture) texturesToLoad.add(asset.texture);
        }
      }
    }

    if (selectedAssetId) {
      const asset = defaultAssetRegistry.get(selectedAssetId);
      if (asset?.texture) texturesToLoad.add(asset.texture);
    }

    texturesToLoad.forEach((src) => {
      if (!loadedImages.has(src)) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          setLoadedImages((prev) => new Map(prev).set(src, img));
        };
      }
    });
  }, [map, selectedAssetId]);

  // Main Canvas Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelW = map.width * map.tileSize;
    const pixelH = map.height * map.tileSize;

    canvas.width = pixelW * zoom;
    canvas.height = pixelH * zoom;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.imageSmoothingEnabled = false;

    // 1. Clear background (meadow grass default)
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, 0, pixelW, pixelH);

    // 2. Render Tile Layers
    for (const layer of map.layers) {
      if (!layer.visible) continue;

      if (layer.type === 'tilelayer') {
        const tileLayer = layer as MapTileLayer;
        for (let r = 0; r < map.height; r++) {
          for (let c = 0; c < map.width; c++) {
            const idx = r * map.width + c;
            const gid = tileLayer.data[idx];
            if (!gid || gid === 0) continue;

            const x = c * map.tileSize;
            const y = r * map.tileSize;

            if (gid === 1) {
              // Meadow Grass
              ctx.fillStyle = '#4ade80';
              ctx.fillRect(x, y, 32, 32);
            } else if (gid === 2) {
              // Dirt Road
              ctx.fillStyle = '#d97706';
              ctx.fillRect(x, y, 32, 32);
              // subtle road border
              ctx.strokeStyle = '#b45309';
              ctx.lineWidth = 1;
              ctx.strokeRect(x + 0.5, y + 0.5, 31, 31);
            }
          }
        }
      }
    }

    // 3. Render Farm Plots
    for (const plot of map.farmPlots) {
      const px = plot.tileX * map.tileSize;
      const py = plot.tileY * map.tileSize;
      const pw = plot.tileWidth * map.tileSize;
      const ph = plot.tileHeight * map.tileSize;

      ctx.fillStyle = 'rgba(180, 83, 9, 0.35)'; // Soil tint
      ctx.fillRect(px, py, pw, ph);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      ctx.setLineDash([]);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#fef3c7';
      ctx.fillText(plot.id, px + 4, py + 12);
    }

    // 4. Render Zones
    for (const zone of map.zones) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(zone.x + 1, zone.y + 1, zone.width - 2, zone.height - 2);
      ctx.setLineDash([]);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(zone.label, zone.x + 4, zone.y + 14);
    }

    // 5. Render Object Layers (2.5D Depth Sorted)
    const objectsToDraw: Array<{ obj: MapObject; depth: number; layerId: string }> = [];

    for (const layer of map.layers) {
      if (!layer.visible || layer.type !== 'objectgroup') continue;
      const objLayer = layer as MapObjectLayer;
      for (const obj of objLayer.objects) {
        const asset = defaultAssetRegistry.get(obj.assetId);
        const depth = obj.y + (asset?.depthOffset ?? 0);
        objectsToDraw.push({ obj, depth, layerId: layer.id });
      }
    }

    // Sort by depth
    objectsToDraw.sort((a, b) => a.depth - b.depth);

    for (const { obj } of objectsToDraw) {
      const asset = defaultAssetRegistry.get(obj.assetId);
      if (!asset) continue;

      const isSelected = selectedObjectId === obj.id;
      const img = loadedImages.get(asset.texture);

      const drawW = asset.visualBounds.width * (obj.scale ?? 1);
      const drawH = asset.visualBounds.height * (obj.scale ?? 1);

      // Anchor origin (0.5, 1.0)
      const drawX = obj.x - drawW * asset.anchor.x;
      const drawY = obj.y - drawH * asset.anchor.y;

      if (img && img.complete) {
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      } else {
        // Fallback placeholder
        ctx.fillStyle = isSelected ? '#10b981' : '#334155';
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.strokeStyle = isSelected ? '#6ee7b7' : '#64748b';
        ctx.strokeRect(drawX, drawY, drawW, drawH);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '9px monospace';
        ctx.fillText(asset.name.split(' ')[0] || obj.id, drawX + 2, drawY + 12);
      }

      // Footprint & Collision Overlay
      if (showCollision && asset.collision.solid) {
        const footW = asset.footprint.tileWidth * map.tileSize;
        const footH = asset.footprint.tileHeight * map.tileSize;
        const offsetY = (asset.footprint.offsetY ?? 0) * map.tileSize;

        const footX = obj.x - footW * asset.anchor.x;
        const footY = obj.y - footH * asset.anchor.y + offsetY;

        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Red/Amber Blocker
        ctx.fillRect(footX, footY, footW, footH);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.strokeRect(footX + 0.5, footY + 0.5, footW - 1, footH - 1);
      }

      // Selection Bounding Box
      if (isSelected) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX - 2, drawY - 2, drawW + 4, drawH + 4);

        // Corner handles
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(drawX - 4, drawY - 4, 6, 6);
        ctx.fillRect(drawX + drawW - 2, drawY - 4, 6, 6);
        ctx.fillRect(drawX - 4, drawY + drawH - 2, 6, 6);
        ctx.fillRect(drawX + drawW - 2, drawY + drawH - 2, 6, 6);
      }
    }

    // 6. Placement Ghost (Hover preview when placing new asset)
    if (activeTool === 'place' && selectedAssetId) {
      const asset = defaultAssetRegistry.get(selectedAssetId);
      if (asset) {
        const ghostW = asset.visualBounds.width;
        const ghostH = asset.visualBounds.height;
        const snapX = cursorTile.x * 32 + 16;
        const snapY = cursorTile.y * 32 + 32;

        const ghostX = snapX - ghostW * asset.anchor.x;
        const ghostY = snapY - ghostH * asset.anchor.y;

        ctx.save();
        ctx.globalAlpha = 0.6;
        const ghostImg = loadedImages.get(asset.texture);
        if (ghostImg && ghostImg.complete) {
          ctx.drawImage(ghostImg, ghostX, ghostY, ghostW, ghostH);
        } else {
          ctx.fillStyle = '#10b981';
          ctx.fillRect(ghostX, ghostY, ghostW, ghostH);
        }

        // Draw preview footprint
        const footW = asset.footprint.tileWidth * 32;
        const footH = asset.footprint.tileHeight * 32;
        const footX = snapX - footW * asset.anchor.x;
        const footY = snapY - footH * asset.anchor.y + (asset.footprint.offsetY ?? 0) * 32;

        ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.fillRect(footX, footY, footW, footH);
        ctx.strokeStyle = '#10b981';
        ctx.strokeRect(footX, footY, footW, footH);
        ctx.restore();
      }
    }

    // 7. Grid Lines
    if (showGrid) {
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= pixelW; x += 32) {
        ctx.strokeStyle = x % 128 === 0 ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, pixelH);
        ctx.stroke();
      }
      for (let y = 0; y <= pixelH; y += 32) {
        ctx.strokeStyle = y % 128 === 0 ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(pixelW, y + 0.5);
        ctx.stroke();
      }

      // Highlight active cursor tile
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cursorTile.x * 32 + 0.5, cursorTile.y * 32 + 0.5, 31, 31);
    }

    ctx.restore();
  }, [map, zoom, showGrid, showCollision, activeTool, selectedObjectId, selectedAssetId, cursorTile, loadedImages]);

  useEffect(() => {
    render();
  }, [render]);

  // Coordinate Calculation Helper
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const pixelX = Math.floor((e.clientX - rect.left) / zoom);
    const pixelY = Math.floor((e.clientY - rect.top) / zoom);
    return { x: pixelX, y: pixelY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    setCursor(x, y);

    if (isDragging && draggedObjectId && activeTool === 'move') {
      moveObject(draggedObjectId, x, y);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    if (!map) return;

    if (activeTool === 'select' || activeTool === 'move') {
      // Find object under cursor (search reverse order for topmost)
      let foundId: string | null = null;
      for (let i = map.layers.length - 1; i >= 0; i--) {
        const layer = map.layers[i];
        if (layer?.visible && layer.type === 'objectgroup') {
          const objLayer = layer as MapObjectLayer;
          for (let j = objLayer.objects.length - 1; j >= 0; j--) {
            const obj = objLayer.objects[j]!;
            const asset = defaultAssetRegistry.get(obj.assetId);
            if (!asset) continue;

            const w = asset.visualBounds.width;
            const h = asset.visualBounds.height;
            const ox = obj.x - w * asset.anchor.x;
            const oy = obj.y - h * asset.anchor.y;

            if (x >= ox && x <= ox + w && y >= oy && y <= oy + h) {
              foundId = obj.id;
              break;
            }
          }
          if (foundId) break;
        }
      }

      selectObject(foundId);
      if (foundId && activeTool === 'move') {
        setIsDragging(true);
        setDraggedObjectId(foundId);
      }
    } else if (activeTool === 'place' && selectedAssetId) {
      const snapX = cursorTile.x * 32 + 16;
      const snapY = cursorTile.y * 32 + 32;
      addObject(selectedAssetId, snapX, snapY);
    } else if (activeTool === 'delete') {
      // Find and delete object under cursor
      for (const layer of map.layers) {
        if (layer.visible && layer.type === 'objectgroup') {
          const objLayer = layer as MapObjectLayer;
          const target = objLayer.objects.find((obj) => {
            const asset = defaultAssetRegistry.get(obj.assetId);
            if (!asset) return false;
            const ox = obj.x - asset.visualBounds.width * asset.anchor.x;
            const oy = obj.y - asset.visualBounds.height * asset.anchor.y;
            return (
              x >= ox &&
              x <= ox + asset.visualBounds.width &&
              y >= oy &&
              y <= oy + asset.visualBounds.height
            );
          });
          if (target) {
            deleteObject(target.id);
            break;
          }
        }
      }
    } else if (activeTool === 'paint') {
      const tileIndex = cursorTile.y * map.width + cursorTile.x;
      paintTile(tileIndex, 2); // 2 = dirt road
    } else if (activeTool === 'erase') {
      const tileIndex = cursorTile.y * map.width + cursorTile.x;
      paintTile(tileIndex, 1); // 1 = grass
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedObjectId(null);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full overflow-auto bg-slate-950 flex items-center justify-center p-8 select-none"
    >
      <div className="relative shadow-2xl rounded-sm border border-slate-700 bg-slate-900">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          className="cursor-crosshair block"
        />
      </div>
    </div>
  );
};
