import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, Home, UserMinus, UserPlus, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { net } from '../../game/net';
import { api, formatDateSafe, type PlayerCard } from '../../lib/api';
import { qk } from '../../lib/queries';
import { useUi } from '../../lib/store';
import { Button, ErrorState, Modal, toastError } from '../../ui/primitives';

const REPORT_REASONS = [
  ['harassment', 'Quấy rối hoặc bắt nạt'],
  ['spam', 'Spam hoặc quảng cáo'],
  ['cheating', 'Gian lận hoặc dùng bot'],
  ['inappropriate_name', 'Tên không phù hợp'],
  ['other', 'Lý do khác'],
] as const;

export function PlayerCardModal() {
  const userId = useUi((s) => s.inspectUserId);
  const inspect = useUi((s) => s.inspect);
  if (!userId) return null;
  return <Card userId={userId} onClose={() => inspect(null)} />;
}

function Card({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const card = useQuery({
    queryKey: qk.player(userId),
    queryFn: () => api<PlayerCard>(`/players/${userId}`),
  });
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number][0]>('harassment');
  const [details, setDetails] = useState('');
  const chat = useUi((s) => s.chat);

  const toggle = useMutation({
    mutationFn: async (what: 'friend' | 'mute') => {
      const on = what === 'friend' ? card.data!.isFriend : card.data!.isMuted;
      await api(`/${what === 'friend' ? 'friends' : 'mutes'}/${userId}`, {
        method: on ? 'DELETE' : 'POST',
        body: on ? undefined : {},
      });
      if (what === 'mute') net.send('mute', { userId, muted: !on });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.player(userId) });
      void qc.invalidateQueries({ queryKey: qk.friends });
    },
    onError: (err) => toastError(err),
  });

  const report = useMutation({
    mutationFn: () =>
      api('/reports', {
        body: {
          targetId: userId,
          reason,
          details,
          context: {
            recentChat: chat
              .filter((c) => c.userId === userId)
              .slice(-10)
              .map((c) => ({ text: c.text, at: c.at })),
          },
        },
      }),
    onSuccess: () => {
      useUi.getState().toast({
        kind: 'success',
        title: 'Đã gửi báo cáo',
        body: 'Cảm ơn bạn. Điều hành viên sẽ xem xét báo cáo này.',
      });
      setReporting(false);
      onClose();
    },
    onError: (err) => toastError(err, 'Không thể gửi báo cáo'),
  });

  if (card.isError) {
    return (
      <Modal title="Người chơi" onClose={onClose}>
        <ErrorState error={card.error} onRetry={() => void card.refetch()} />
      </Modal>
    );
  }
  const p = card.data;
  if (!p) {
    return (
      <Modal title="Đang tải người chơi…" onClose={onClose}>
        <div className="skeleton" style={{ height: 120 }} />
      </Modal>
    );
  }

  if (reporting) {
    return (
      <Modal
        title={`Báo cáo ${p.displayName}`}
        description="Báo cáo được bảo mật. Người chơi này sẽ không biết ai đã gửi báo cáo."
        onClose={() => setReporting(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReporting(false)}>
              Hủy
            </Button>
            <Button variant="danger" loading={report.isPending} onClick={() => report.mutate()}>
              Gửi báo cáo
            </Button>
          </>
        }
      >
        <div className="field">
          <label htmlFor="reason">Lý do</label>
          <select
            id="reason"
            className="select"
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reason)}
          >
            {REPORT_REASONS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="details">Chi tiết (tùy chọn)</label>
          <textarea
            id="details"
            className="textarea"
            rows={3}
            maxLength={500}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <span className="field-hint">Tin nhắn chat gần đây của họ sẽ được tự động đính kèm.</span>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={p.displayName} description={p.statusText || p.title} onClose={onClose} width={440}>
      <div className="row wrap" style={{ gap: 6 }}>
        <span className="pill pill-primary">{p.title}</span>
        <span className="pill pill-reward">{p.fame} Danh tiếng</span>
        {p.apartment ? <span className="pill">Điểm căn hộ {p.apartment.score}</span> : null}
        {p.eventPodiums.map((b) => (
          <span key={b.placement} className="pill pill-warn">
            {['🥇', '🥈', '🥉'][b.placement - 1]} ×{b.count}
          </span>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Tham gia thị trấn từ {formatDateSafe(p.memberSince)}
      </p>
      {p.isSelf ? null : (
        <div className="stack" style={{ gap: 8 }}>
          <Button
            onClick={() => {
              onClose();
              useUi.getState().setFarmOwnerId(p.id);
              useUi.getState().setPanel('farm-password');
            }}
          >
            Ghé nông trại
          </Button>
          {p.isFriend ? (
            <Button
              onClick={() => {
                void api('/api/party', {
                  body: { kind: 'invite', value: p.id },
                  idempotencyKey: crypto.randomUUID(),
                })
                  .then(() => useUi.getState().toast({ kind: 'success', title: 'Đã gửi lời mời tổ đội' }))
                  .catch(toastError);
              }}
            >
              Mời vào tổ đội
            </Button>
          ) : null}
          <div className="row">
            <Button
              variant={p.isFriend ? 'secondary' : 'primary'}
              style={{ flex: 1 }}
              loading={toggle.isPending && toggle.variables === 'friend'}
              onClick={() => toggle.mutate('friend')}
            >
              {p.isFriend ? <UserMinus size={16} /> : <UserPlus size={16} />}{' '}
              {p.isFriend ? 'Hủy kết bạn' : 'Kết bạn'}
            </Button>
            {p.apartment ? (
              <Button
                style={{ flex: 1 }}
                onClick={() => {
                  onClose();
                  void api(`/apartments/${p.id}/visit`, { body: {} }).catch(() => undefined);
                  void net.goApartment(p.id, `Căn hộ của ${p.displayName}`);
                }}
              >
                <Home size={16} /> Ghé căn hộ
              </Button>
            ) : null}
          </div>
          <div className="row">
            <Button
              variant="ghost"
              style={{ flex: 1 }}
              loading={toggle.isPending && toggle.variables === 'mute'}
              onClick={() => toggle.mutate('mute')}
            >
              {p.isMuted ? <Volume2 size={16} /> : <VolumeX size={16} />}{' '}
              {p.isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
            </Button>
            <Button
              variant="ghost"
              style={{ flex: 1, color: 'var(--danger)' }}
              onClick={() => setReporting(true)}
            >
              <Flag size={16} /> Báo cáo
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
