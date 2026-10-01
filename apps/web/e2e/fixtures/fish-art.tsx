import { FISH, DEFAULT_APPEARANCE, RARITY_LABELS } from '@cozy/game-data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { FishAdminPage } from '../../src/screens/admin/FishAdmin';
import { fishIcon, getHDFishCanvas, FISH_EFFECT_CLASS } from '../../src/art/fish';
import { chibiAvatarFull, chibiTrophyScene } from '../../src/art/chibi';
import { useFishArt } from '../../src/lib/use-fish-art';
import { qk } from '../../src/lib/queries';
import { FISH_3D_ASSETS, preloadFishArt } from '../../src/art/fish-assets';
import '../../src/styles.css';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
qc.setQueryData(qk.me, { id: 'art-fixture', appearance: DEFAULT_APPEARANCE });
qc.setQueryData(
  ['admin-fish'],
  FISH.map((fish) => ({
    ...fish,
    defaultMinSizeCm: fish.minSizeCm,
    defaultMaxSizeCm: fish.maxSizeCm,
    isOverridden: false,
  })),
);
Object.assign(window, {
  fishArtTest: {
    FISH,
    FISH_3D_ASSETS,
    getHDFishCanvas,
    preloadFishArt,
    chibiAvatarFull,
    chibiTrophyScene,
    DEFAULT_APPEARANCE,
  },
});

function Gallery() {
  const revision = useFishArt();
  const params = new URLSearchParams(location.search);
  const fishList = params.has('variants')
    ? FISH.filter((f) => f.variantOf)
    : params.has('legendary')
      ? FISH.filter((f) => f.rarity === 'legendary')
      : params.has('selected')
        ? FISH.filter((f) =>
            [
              'swordfish',
              'office_carp',
              'clownfish',
              'seahorse',
              'betta_fighting',
              'lionfish',
              'great_white_shark',
              'axolotl',
              'manta_ray',
              'electric_eel',
              'giant_squid',
              'killer_whale',
            ].includes(f.id),
          )
        : FISH;
  return (
    <main style={{ background: '#142532', padding: 24, color: '#e8efe7' }} data-revision={revision}>
      <h1>Minh họa cá · Bộ sưu tập</h1>
      <p style={{ color: '#b9c9cd' }}>Đường nét mượt · Ánh sáng theo khối · Dáng riêng cho từng loài</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 16 }}>
        {fishList.map((fish) => (
          <article
            key={fish.id}
            data-species={fish.id}
            className={FISH_EFFECT_CLASS[fish.id]}
            style={{ background: '#213946', borderRadius: 12, padding: 16 }}
          >
            <img
              src={fishIcon(fish.id, 16)}
              alt={fish.name}
              style={{ width: '100%', height: 180, objectFit: 'contain' }}
            />
            <div style={{ fontWeight: 700, fontSize: 14 }}>{fish.name}</div>
            <div>{RARITY_LABELS[fish.rarity]}</div>
            {fish.variantOf && !FISH_3D_ASSETS[fish.id] ? (
              <div>Chờ ảnh biến thể · tạm dùng ảnh gốc</div>
            ) : null}
            <div style={{ fontSize: 12, color: '#b9c9cd' }}>
              {fish.minSizeCm}–{fish.maxSizeCm} cm
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}>
    {new URLSearchParams(location.search).has('admin') ? (
      <div style={{ padding: 24 }}>
        <FishAdminPage />
      </div>
    ) : (
      <Gallery />
    )}
  </QueryClientProvider>,
);
