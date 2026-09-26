import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarDays, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { duckGrid } from '../../art/items';
import { api, type EventHub } from '../../lib/api';
import { qk } from '../../lib/queries';
import { useUi } from '../../lib/store';
import {
  Button,
  CoinIcon,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  timeAgo,
  toastError,
} from '../../ui/primitives';

const duckUrl = (() => {
  let url = '';
  return () => (url ||= duckGrid().toCanvas(6).toDataURL());
})();

export function EventsPanel({ onClose }: { onClose: () => void }) {
  const hub = useQuery({
    queryKey: qk.events,
    queryFn: () => api<EventHub>('/events'),
    refetchInterval: 5000,
  });
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const join = useMutation({
    mutationFn: (v: { id: string; leave: boolean }) =>
      api(`/events/${v.id}/${v.leave ? 'leave' : 'join'}`, { body: {} }),
    onSuccess: (_r, v) => {
      void hub.refetch();
      if (!v.leave)
        useUi.getState().toast({
          kind: 'success',
          title: 'You are in!',
          body: 'Stay in town when the event starts — ducks will appear around the map.',
        });
    },
    onError: (err) => toastError(err, 'Could not update entry'),
  });

  return (
    <Panel icon={<CalendarDays size={18} />} eyebrow="Event Board" title="Events" onClose={onClose}>
      {hub.isPending ? (
        <LoadingState />
      ) : hub.isError ? (
        <ErrorState error={hub.error} onRetry={() => void hub.refetch()} />
      ) : (
        <div className="split" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
          <div className="stack">
            <CurrentEvent
              hub={hub.data}
              onJoin={(id, leave) => join.mutate({ id, leave })}
              busy={join.isPending}
            />
            <section className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>How Find the Duck works</h3>
              <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, color: 'var(--ink-2)' }}>
                {hub.data.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </section>
          </div>
          <section>
            <div className="section-title">
              <h3>Recent events</h3>
            </div>
            {hub.data.history.length === 0 ? (
              <EmptyState
                icon={<Trophy size={22} />}
                title="No finished events yet"
                body="Winners and your past results will show up here."
              />
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {hub.data.history.map((h) => (
                  <article key={h.id} className="card" style={{ padding: 14 }}>
                    <div className="row between">
                      <strong>{h.title}</strong>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {timeAgo(h.endedAt)} · {h.participants} players
                      </span>
                    </div>
                    <div className="row wrap" style={{ marginTop: 8, gap: 6 }}>
                      {h.winners.length ? (
                        h.winners.map((w) => (
                          <span key={w.name} className={`pill ${w.placement === 1 ? 'pill-warn' : ''}`}>
                            {['🥇', '🥈', '🥉'][w.placement - 1]} {w.name} · {w.score}
                          </span>
                        ))
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>
                          Nobody found a duck. The ducks win this round.
                        </span>
                      )}
                    </div>
                    {h.myPlacement ? (
                      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                        You placed #{h.myPlacement} with {h.myScore} duck{h.myScore === 1 ? '' : 's'}.
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Panel>
  );
}

function CurrentEvent({
  hub,
  onJoin,
  busy,
}: {
  hub: EventHub;
  onJoin: (id: string, leave: boolean) => void;
  busy: boolean;
}) {
  const ev = hub.current;
  if (!ev) {
    return (
      <section className="card">
        <EmptyState
          icon={<CalendarDays size={22} />}
          title="No event scheduled right now"
          body="The next event is posted automatically every few minutes. Check back soon."
        />
      </section>
    );
  }
  const skew = Date.parse(hub.serverTime) - Date.now();
  const target = Date.parse(ev.status === 'running' ? ev.endsAt : ev.startsAt);
  const left = Math.max(0, target - (Date.now() + skew));
  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor(left / 1000) % 60).padStart(2, '0');
  const r = hub.rewards;
  const full = ev.participants >= ev.maxPlayers && !ev.joined;
  return (
    <section className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 160px',
          background: 'linear-gradient(135deg, #fcebe5, #fbf1d8)',
        }}
      >
        <div style={{ padding: 24, display: 'grid', gap: 8 }}>
          <span
            className={`pill ${ev.status === 'running' ? 'pill-reward' : 'pill-primary'}`}
            style={{ justifySelf: 'start' }}
          >
            {ev.status === 'running' ? 'Live now' : 'Lobby open'}
          </span>
          <h3 style={{ fontSize: 24, fontFamily: 'var(--font-pixel)' }}>{ev.title}</h3>
          <div className="row" style={{ gap: 16 }}>
            <div>
              <div className="stat-label">{ev.status === 'running' ? 'Ends in' : 'Starts in'}</div>
              <div className="tabular" style={{ fontSize: 28, fontWeight: 700 }}>
                {mm}:{ss}
              </div>
            </div>
            <div>
              <div className="stat-label">Players</div>
              <div className="row" style={{ fontSize: 20, fontWeight: 700 }}>
                <Users size={18} /> {ev.participants}/{ev.maxPlayers}
              </div>
            </div>
            {ev.status === 'running' && ev.joined ? (
              <div>
                <div className="stat-label">Your ducks</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{ev.myScore}</div>
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <img src={duckUrl()} alt="" className="pixel" style={{ width: 96 }} />
        </div>
      </div>
      <div style={{ padding: 20, display: 'grid', gap: 14 }}>
        {r ? (
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="pill pill-warn">
              🥇 <CoinIcon size={11} /> {r.placementCoin[0]} + {r.placementFame[0]} Fame
            </span>
            <span className="pill">
              🥈 <CoinIcon size={11} /> {r.placementCoin[1]}
            </span>
            <span className="pill">
              🥉 <CoinIcon size={11} /> {r.placementCoin[2]}
            </span>
            <span className="pill">
              <CoinIcon size={11} /> {r.coinPerPoint} per duck
            </span>
            <span className="pill pill-success">
              Everyone: <CoinIcon size={11} /> {r.participationCoin} + {r.fame} Fame
            </span>
          </div>
        ) : null}
        {ev.status === 'scheduled' ? (
          ev.joined ? (
            <div className="row between">
              <span className="muted">You are registered. Be in town when it starts.</span>
              <Button variant="ghost" loading={busy} onClick={() => onJoin(ev.id, true)}>
                Leave lobby
              </Button>
            </div>
          ) : (
            <Button
              variant="reward"
              size="lg"
              disabled={full}
              loading={busy}
              onClick={() => onJoin(ev.id, false)}
            >
              {full ? 'Event is full' : 'Join event'}
            </Button>
          )
        ) : ev.joined ? (
          <div className="callout callout-success">Go! Walk into ducks around town to collect them.</div>
        ) : (
          <div className="callout callout-info">This round has started. Join the lobby for the next one.</div>
        )}
      </div>
    </section>
  );
}
