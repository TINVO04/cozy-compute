import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { game, GameCanvas } from '../../src/game/GameCanvas';
import { qk } from '../../src/lib/queries';
import { useUi } from '../../src/lib/store';
import { FishingActivity } from '../../src/screens/activities';
import { drawOrganicFishShadow } from '../../src/game/fish-shadow';
import { SHADOW_TIER_CONFIG } from '@cozy/game-data';
import '../../src/styles.css';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
qc.setQueryData(qk.me, {
  id: 'fishing-fixture',
  appearance: { skin: 1, hairStyle: 'short', hairColor: 1, baseTop: 0, rod: 'rod_twig' },
});
useUi.setState({ activity: 'fishing', muted: true });
Object.defineProperty(window, 'fishingPreview', { get: () => game });

function Preview() {
  const [ready, setReady] = useState(false);
  const activity = useUi((s) => s.activity);
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!game?.scene.isActive('town')) return;
      game.scene.getScene('town').cameras.main.centerOn(1216, 864);
      if (new URLSearchParams(location.search).has('shadows')) {
        const scene = game.scene.getScene('town');
        const camera = scene.cameras.main;
        camera.setZoom(1);
        const water = scene.add.graphics().setScrollFactor(0).setDepth(10000);
        water.fillStyle(0x6aaac1);
        water.fillRect(0, 0, 1280, 720);
        water.lineStyle(1, 0xa9d8df, 0.25);
        for (let row = 0; row < 18; row++) {
          for (let col = 0; col < 20; col++) {
            const x = col * 64 + (row % 2) * 24;
            water.lineBetween(x, row * 40, x + 16, row * 40);
          }
        }
        const shadows = scene.add.graphics().setScrollFactor(0).setDepth(10001);
        Object.values(SHADOW_TIER_CONFIG).forEach((tier, index) => {
          const x = 220 + (index % 3) * 400;
          const y = 220 + Math.floor(index / 3) * 280;
          drawOrganicFishShadow(shadows, x, y, -0.25, 1200, tier, 1, false, false);
          scene.add
            .text(x, y + 80, tier.label, { fontFamily: 'sans-serif', fontSize: '18px', color: '#123446' })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(10002);
        });
      }
      setReady(true);
      clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="world" style={{ width: '100vw', height: '100dvh', position: 'relative' }}>
      <GameCanvas />
      {ready && activity === 'fishing' && !new URLSearchParams(location.search).has('shadows') && (
        <FishingActivity />
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}>
    <Preview />
  </QueryClientProvider>,
);
