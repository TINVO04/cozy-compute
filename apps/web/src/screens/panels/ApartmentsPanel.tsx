import { APARTMENT_THEMES } from '@cozy/game-data';
import { useQuery } from '@tanstack/react-query';
import { DoorOpen, Home, Trophy } from 'lucide-react';
import { useState } from 'react';
import { net } from '../../game/net';
import { api, type Me } from '../../lib/api';
import { qk } from '../../lib/queries';
import { hex } from '../../art/pixel';
import { useUi } from '../../lib/store';
import { Button, EmptyState, ErrorState, LoadingState, Panel } from '../../ui/primitives';

interface Listing {
  ownerId: string;
  ownerName: string;
  name: string;
  themeId: string;
  score: number;
  visits: number;
  objects: number;
}

export function ApartmentsPanel({ me, onClose }: { me: Me; onClose: () => void }) {
  const [sort, setSort] = useState<'score' | 'recent' | 'visits'>('score');
  const list = useQuery({
    queryKey: qk.apartments(sort),
    queryFn: () => api<Listing[]>(`/apartments?sort=${sort}`),
  });
  const setPanel = useUi((s) => s.setPanel);

  function visit(l: Listing) {
    setPanel(null);
    if (l.ownerId !== me.id) void api(`/apartments/${l.ownerId}/visit`, { body: {} }).catch(() => undefined);
    void net.goApartment(l.ownerId, l.ownerId === me.id ? 'Căn hộ của bạn' : `Căn hộ của ${l.ownerName}`);
  }

  return (
    <Panel
      icon={<Home size={18} />}
      eyebrow="Chung Cư Hơi Bị Ám"
      title="Tham quan căn hộ"
      onClose={onClose}
      actions={
        <div className="tabs" role="tablist" aria-label="Sắp xếp">
          {(
            [
              ['score', 'Điểm cao nhất'],
              ['visits', 'Nhiều khách nhất'],
              ['recent', 'Mới cập nhật'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              className="tab"
              aria-selected={sort === id}
              onClick={() => setSort(id)}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {list.isPending ? (
        <LoadingState rows={4} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState
          icon={<DoorOpen size={22} />}
          title="Chưa có căn hộ công khai nào"
          body="Hãy trang trí phòng của bạn và bật 'Mở cửa đón khách' để trở thành người đầu tiên xuất hiện trong danh sách."
          action={
            <Button
              variant="primary"
              onClick={() =>
                visit({
                  ownerId: me.id,
                  ownerName: me.displayName,
                  name: '',
                  themeId: 'cozy',
                  score: 0,
                  visits: 0,
                  objects: 0,
                })
              }
            >
              Về căn hộ của tôi
            </Button>
          }
        />
      ) : (
        <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {list.data.map((l, i) => {
            const theme = APARTMENT_THEMES.find((t) => t.id === l.themeId) ?? APARTMENT_THEMES[0];
            return (
              <article key={l.ownerId} className="card item-card">
                <div
                  className="item-art"
                  style={{
                    height: 110,
                    background: `linear-gradient(${hex(theme.wall)} 0 32%, ${hex(theme.trim)} 32% 38%, ${hex(theme.floor)} 38%)`,
                  }}
                >
                  {sort === 'score' && i < 3 ? (
                    <span className="pill pill-warn" style={{ position: 'absolute', top: 8, left: 8 }}>
                      <Trophy size={12} /> #{i + 1}
                    </span>
                  ) : null}
                </div>
                <div className="item-info">
                  <span className="item-name">{l.name}</span>
                  <span className="muted" style={{ fontSize: 13 }}>
                    bởi {l.ownerName}
                    {l.ownerId === me.id ? ' (bạn)' : ''}
                  </span>
                </div>
                <div className="item-foot">
                  <span className="muted" style={{ fontSize: 12 }}>
                    Điểm {l.score} · {l.visits} lượt ghé · {l.objects} vật dụng
                  </span>
                  <Button size="sm" variant="primary" onClick={() => visit(l)}>
                    Ghé thăm
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
