import Phaser from 'phaser';
import { farmTiledData, paintFarmTileset } from '../art/farm-landscape';

export function loadTiledFarmMap(scene: Phaser.Scene) {
  const tilesKey = 'farm:town-tiles';
  const mapKey = 'farm:town-layout';
  if (!scene.textures.exists(tilesKey)) scene.textures.addCanvas(tilesKey, paintFarmTileset());
  scene.cache.tilemap.add(mapKey, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: farmTiledData() });
  const map = scene.make.tilemap({ key: mapKey });
  const tileset = map.addTilesetImage('farm-town', tilesKey)!;
  const groundLayer = map.createLayer('Ground', tileset, 0, 0)!.setDepth(-10);
  return { map, groundLayer };
}
