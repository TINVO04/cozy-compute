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
          title: 'Đã tham gia!',
          body: 'Hãy ở trong thị trấn khi sự kiện bắt đầu — những chú vịt sẽ xuất hiện khắp bản đồ.',
        });
    },
    onError: (err) => toastError(err, 'Không thể cập nhật đăng ký'),
  });

  return (
    <Panel icon={<CalendarDays size={18} />} eyebrow="Bảng Sự Kiện" title="Sự kiện" onClose={onClose}>
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
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Cách chơi Săn Vịt Vàng</h3>
              <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, color: 'var(--ink-2)' }}>
                {hub.data.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </section>
          </div>
          <section>
            <div className="section-title">
              <h3>Sự kiện gần đây</h3>
            </div>
            {hub.data.history.length === 0 ? (
              <EmptyState
                icon={<Trophy size={22} />}
                title="Chưa có sự kiện nào kết thúc"
                body="Người chiến thắng và kết quả các vòng trước sẽ hiển thị ở đây."
              />
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {hub.data.history.map((h) => (
                  <article key={h.id} className="card" style={{ padding: 14 }}>
                    <div className="row between">
                      <strong>{h.title}</strong>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {timeAgo(h.endedAt)} · {h.participants} người chơi
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
                          Không ai tìm thấy chú vịt nào. Đội vịt đã chiến thắng vòng này!
                        </span>
                      )}
                    </div>
                    {h.myPlacement ? (
                      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                        Bạn xếp hạng #{h.myPlacement} với {h.myScore} chú vịt.
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
          title="Hiện không có sự kiện nào diễn ra"
          body="Sự kiện tiếp theo sẽ được tạo tự động sau vài phút. Hãy quay lại sớm nhé."
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
            {ev.status === 'running' ? 'Đang diễn ra' : 'Đang mở đăng ký'}
          </span>
          <h3 style={{ fontSize: 24, fontFamily: 'var(--font-pixel)' }}>
            {ev.title === 'Find the Duck' ? 'Truy tìm Vịt vàng' : ev.title}
          </h3>
          <div className="row" style={{ gap: 16 }}>
            <div>
              <div className="stat-label">{ev.status === 'running' ? 'Kết thúc sau' : 'Bắt đầu sau'}</div>
              <div className="tabular" style={{ fontSize: 28, fontWeight: 700 }}>
                {mm}:{ss}
              </div>
            </div>
            <div>
              <div className="stat-label">Người chơi</div>
              <div className="row" style={{ fontSize: 20, fontWeight: 700 }}>
                <Users size={18} /> {ev.participants}/{ev.maxPlayers}
              </div>
            </div>
            {ev.status === 'running' && ev.joined ? (
              <div>
                <div className="stat-label">Vịt của bạn</div>
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
              🥇 <CoinIcon size={11} /> {r.placementCoin[0]} + {r.placementFame[0]} Danh tiếng
            </span>
            <span className="pill">
              🥈 <CoinIcon size={11} /> {r.placementCoin[1]}
            </span>
            <span className="pill">
              🥉 <CoinIcon size={11} /> {r.placementCoin[2]}
            </span>
            <span className="pill">
              <CoinIcon size={11} /> {r.coinPerPoint} Xu mỗi chú vịt
            </span>
            <span className="pill pill-success">
              Tất cả: <CoinIcon size={11} /> {r.participationCoin} + {r.fame} Danh tiếng
            </span>
          </div>
        ) : null}
        {ev.status === 'scheduled' ? (
          ev.joined ? (
            <div className="row between">
              <span className="muted">Bạn đã đăng ký. Hãy ở lại thị trấn khi trận đấu bắt đầu.</span>
              <Button variant="ghost" loading={busy} onClick={() => onJoin(ev.id, true)}>
                Hủy đăng ký
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
              {full ? 'Phòng đã đầy' : 'Tham gia sự kiện'}
            </Button>
          )
        ) : ev.joined ? (
          <div className="callout callout-success">
            Nhanh lên! Chạy lại gần các chú vịt xuất hiện trong thị trấn để nhặt!
          </div>
        ) : (
          <div className="callout callout-info">
            Vòng này đã bắt đầu. Hãy chờ và đăng ký ở vòng tiếp theo nhé.
          </div>
        )}
      </div>
    </section>
  );
}
