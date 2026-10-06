import type { Command } from './command.js';
import type { MapDefinition } from '../types/map.js';
import type { MapObject } from '../types/object.js';
import type { MapObjectLayer, MapTileLayer } from '../types/layer.js';

export class AddObjectCommand implements Command {
  public readonly name: string;

  constructor(
    private map: MapDefinition,
    private layerId: string,
    private object: MapObject,
  ) {
    this.name = `Add Object ${object.id} (${object.assetId})`;
  }

  public execute(): void {
    const layer = this.map.layers.find((l) => l.id === this.layerId);
    if (!layer || layer.type !== 'objectgroup') {
      throw new Error(`Target object layer "${this.layerId}" not found.`);
    }
    (layer as MapObjectLayer).objects.push({ ...this.object });
  }

  public undo(): void {
    const layer = this.map.layers.find((l) => l.id === this.layerId);
    if (layer && layer.type === 'objectgroup') {
      const objLayer = layer as MapObjectLayer;
      const idx = objLayer.objects.findIndex((o) => o.id === this.object.id);
      if (idx !== -1) {
        objLayer.objects.splice(idx, 1);
      }
    }
  }
}

export class MoveObjectCommand implements Command {
  public readonly name: string;
  private prevX = 0;
  private prevY = 0;

  constructor(
    private map: MapDefinition,
    private layerId: string,
    private objectId: string,
    private newX: number,
    private newY: number,
  ) {
    this.name = `Move Object ${objectId}`;
  }

  public execute(): void {
    const layer = this.map.layers.find((l) => l.id === this.layerId);
    if (!layer || layer.type !== 'objectgroup') {
      throw new Error(`Target object layer "${this.layerId}" not found.`);
    }
    const obj = (layer as MapObjectLayer).objects.find((o) => o.id === this.objectId);
    if (!obj) {
      throw new Error(`Object "${this.objectId}" not found in layer "${this.layerId}".`);
    }
    this.prevX = obj.x;
    this.prevY = obj.y;
    obj.x = this.newX;
    obj.y = this.newY;
  }

  public undo(): void {
    const layer = this.map.layers.find((l) => l.id === this.layerId);
    if (layer && layer.type === 'objectgroup') {
      const obj = (layer as MapObjectLayer).objects.find((o) => o.id === this.objectId);
      if (obj) {
        obj.x = this.prevX;
        obj.y = this.prevY;
      }
    }
  }
}

export class DeleteObjectCommand implements Command {
  public readonly name: string;
  private deletedObject: MapObject | null = null;
  private deletedIndex = -1;

  constructor(
    private map: MapDefinition,
    private layerId: string,
    private objectId: string,
  ) {
    this.name = `Delete Object ${objectId}`;
  }

  public execute(): void {
    const layer = this.map.layers.find((l) => l.id === this.layerId);
    if (!layer || layer.type !== 'objectgroup') {
      throw new Error(`Target object layer "${this.layerId}" not found.`);
    }
    const objLayer = layer as MapObjectLayer;
    const idx = objLayer.objects.findIndex((o) => o.id === this.objectId);
    if (idx === -1) {
      throw new Error(`Object "${this.objectId}" not found in layer "${this.layerId}".`);
    }
    this.deletedIndex = idx;
    this.deletedObject = { ...objLayer.objects[idx]! };
    objLayer.objects.splice(idx, 1);
  }

  public undo(): void {
    if (!this.deletedObject || this.deletedIndex === -1) return;
    const layer = this.map.layers.find((l) => l.id === this.layerId);
    if (layer && layer.type === 'objectgroup') {
      (layer as MapObjectLayer).objects.splice(this.deletedIndex, 0, { ...this.deletedObject });
    }
  }
}

export class PaintTileCommand implements Command {
  public readonly name: string;
  private prevGid = 0;

  constructor(
    private map: MapDefinition,
    private layerId: string,
    private tileIndex: number,
    private newGid: number,
  ) {
    this.name = `Paint Tile [${tileIndex}] to ${newGid}`;
  }

  public execute(): void {
    const layer = this.map.layers.find((l) => l.id === this.layerId);
    if (!layer || layer.type !== 'tilelayer') {
      throw new Error(`Target tile layer "${this.layerId}" not found.`);
    }
    const tileLayer = layer as MapTileLayer;
    if (this.tileIndex < 0 || this.tileIndex >= tileLayer.data.length) {
      throw new Error(`Tile index ${this.tileIndex} out of bounds.`);
    }
    this.prevGid = tileLayer.data[this.tileIndex] ?? 0;
    tileLayer.data[this.tileIndex] = this.newGid;
  }

  public undo(): void {
    const layer = this.map.layers.find((l) => l.id === this.layerId);
    if (layer && layer.type === 'tilelayer') {
      (layer as MapTileLayer).data[this.tileIndex] = this.prevGid;
    }
  }
}
