import type Phaser from 'phaser';
import { getHDFishCanvas } from '../art/fish';
import { loadFishArt } from '../art/fish-assets';

/** Own a mutable Phaser canvas; shared art-cache canvases must remain untouched. */
export function ensureFishTexture(scene: Phaser.Scene, speciesId: string): string {
  const key = 'fish_tx_hd:' + speciesId;
  if (scene.textures.exists(key)) return key;
  const source = getHDFishCanvas(speciesId, 360, 240);
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  const texture = scene.textures.addCanvas(key, canvas);
  texture?.setFilter(1); // Linear sampling for illustrated fish within the pixel world.
  void loadFishArt(speciesId).then(() => {
    if (!scene.sys.isActive() || !scene.textures.exists(key)) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(getHDFishCanvas(speciesId, canvas.width, canvas.height), 0, 0);
    texture?.refresh();
  });
  return key;
}
