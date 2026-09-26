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
    void net.goApartment(l.ownerId, l.ownerId === me.id ? 'Your apartment' : `${l.ownerName}'s apartment`);
  }

  return (
    <Panel
      icon={<Home size={18} />}
      eyebrow="Mildly Haunted Apartments"
      title="Visit apartments"
      onClose={onClose}
      actions={
        <div className="tabs" role="tablist" aria-label="Sort">
          {(
            [
              ['score', 'Top rated'],
              ['visits', 'Most visited'],
              ['recent', 'Recently updated'],
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
          title="No public apartments yet"
          body="Decorate your place and switch on “Open to visitors” to be the first on the list."
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
              Go to my apartment
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
                    by {l.ownerName}
                    {l.ownerId === me.id ? ' (you)' : ''}
                  </span>
                </div>
                <div className="item-foot">
                  <span className="muted" style={{ fontSize: 12 }}>
                    Score {l.score} · {l.visits} visits · {l.objects} items
                  </span>
                  <Button size="sm" variant="primary" onClick={() => visit(l)}>
                    Visit
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
