import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { useUi } from '../lib/store';
import {
  ApartmentScene,
  BidaScene,
  ComGaScene,
  CompanyScene,
  CyberNetScene,
  FarmScene,
  OceanScene,
  TownScene,
  UniversityScene,
} from './scenes';

export let game: Phaser.Game | null = null;

export function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const roomKind = useUi((s) => s.room.kind);

  useEffect(() => {
    if (!ref.current) return;
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current,
      backgroundColor: '#2a2438',
      pixelArt: true,
      roundPixels: true,
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      input: { keyboard: true, mouse: { preventDefaultWheel: false } },
      audio: { noAudio: true },
      banner: false,
      scene: [
        TownScene,
        ApartmentScene,
        CompanyScene,
        UniversityScene,
        ComGaScene,
        BidaScene,
        CyberNetScene,
        FarmScene,
        OceanScene,
      ],
    });
    game.canvas?.setAttribute(
      'aria-label',
      'Thế giới trò chơi. Dùng các phím mũi tên hoặc WASD để di chuyển.',
    );
    return () => {
      game?.destroy(true);
      game = null;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }
      if (document.querySelector('.backdrop') || document.querySelector('.panel')) {
        return;
      }

      e.preventDefault();
      const step = 0.1;
      const dir = e.deltaY < 0 ? 1 : -1;
      useUi.getState().setZoom((z) => z + dir * step);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => {
    if (!game) return;
    const switchScene = () => {
      if (!game) return;
      const target = roomKind;
      const activeScenes = game.scene.getScenes(true);
      const isTargetActive = activeScenes.some((s) => s.scene.key === target);
      if (isTargetActive) return;

      for (const s of activeScenes) {
        if (s.scene.key !== target) game.scene.stop(s.scene.key);
      }
      game.scene.start(target);
    };

    if (game.isBooted) {
      if (roomKind !== 'town' || !game.scene.isActive('town')) {
        switchScene();
      }
    } else {
      game.events.once('ready', () => {
        if (roomKind !== 'town') {
          switchScene();
        }
      });
    }
  }, [roomKind]);

  return <div ref={ref} className="game-canvas" onContextMenu={(e) => e.preventDefault()} />;
}
