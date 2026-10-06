import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { net } from '../../game/net';
import { api } from '../../lib/api';
import { Button, ErrorState } from '../../ui/primitives';
interface Board {
  fishing: { id: string; name: string; weight: number }[];
  homes: { id: string; name: string; score: number; votes: number }[];
  votedFor: string | null;
}
export function CommunityBoard({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const data = useQuery({
    queryKey: ['community'],
    queryFn: () => api<Board>('/api/community'),
    refetchInterval: 15000,
  });
  async function vote(ownerId: string) {
    setBusy(true);
    setError(null);
    try {
      await api('/api/community/vote', { body: { ownerId }, idempotencyKey: crypto.randomUUID() });
      await qc.invalidateQueries({ queryKey: ['community'] });
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Không thể bình chọn.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <h3>Ngày hội khu phố · tuần này</h3>
      <p>
        Mỗi tuần ghi nhận cá nặng nhất và những căn nhà được hàng xóm yêu thích. Mỗi cư dân có một phiếu bình
        chọn nhà.
      </p>
      {error || data.error ? <ErrorState error={error ?? data.error} /> : null}
      <h3>Kỷ lục cần thủ</h3>
      <ol>
        {data.data?.fishing.map((f) => (
          <li key={f.id}>
            {f.name} · {f.weight} kg
          </li>
        ))}
      </ol>
      {!data.data?.fishing.length ? <p>Chưa có lượt câu được ghi nhận trong tuần.</p> : null}
      <h3>Nhà mở cửa</h3>
      <div className="resident-grid">
        {data.data?.homes.map((h) => (
          <article key={h.id} className="resident-card">
            <h4>Nhà của {h.name}</h4>
            <p>
              {h.votes} phiếu · Điểm trang trí {h.score}
            </p>
            <div className="resident-tabs">
              <Button
                onClick={() => {
                  onClose();
                  void net.goApartment(h.id, `Nhà của ${h.name}`);
                }}
              >
                Ghé thăm
              </Button>
              <Button
                disabled={busy || h.id === userId || !!data.data?.votedFor}
                onClick={() => void vote(h.id)}
              >
                {data.data?.votedFor === h.id ? 'Đã bình chọn' : 'Bình chọn'}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
