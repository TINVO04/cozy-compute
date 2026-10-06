import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import { Button, ErrorState } from '../../ui/primitives';
interface Party {
  id: string | null;
  members: { id: string; name: string; leader: boolean }[];
  messages: { id: number; name: string; body: string }[];
  invites: { party_id: string; name: string }[];
}
export function PartyPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const party = useQuery({
    queryKey: ['party'],
    queryFn: () => api<Party>('/api/party'),
    refetchInterval: 3000,
  });
  async function act(kind: string, value = '') {
    setBusy(true);
    setError(null);
    try {
      await api('/api/party', { body: { kind, value }, idempotencyKey: crypto.randomUUID() });
      await qc.invalidateQueries({ queryKey: ['party'] });
      if (kind === 'chat') setText('');
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Không thể cập nhật tổ đội.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <h3>Tổ đội của bạn</h3>
      <p>Tối đa 4 người. Đội trưởng mời bạn bè qua bảng thông tin nhân vật. Lời mời có hiệu lực 10 phút.</p>
      {error || party.error ? <ErrorState error={error ?? party.error} /> : null}
      {party.data?.invites.map((i) => (
        <article className="resident-card" key={i.party_id}>
          <p>{i.name} mời bạn vào tổ đội.</p>
          <div className="resident-tabs">
            <Button disabled={busy || !!party.data?.id} onClick={() => void act('accept', i.party_id)}>
              Tham gia
            </Button>
            <Button disabled={busy} onClick={() => void act('decline', i.party_id)}>
              Từ chối
            </Button>
          </div>
        </article>
      ))}
      {party.data?.id ? (
        <>
          <ul>
            {party.data.members.map((m) => (
              <li key={m.id}>
                {m.name}
                {m.leader ? ' · Đội trưởng' : ''}
              </li>
            ))}
          </ul>
          <Button disabled={busy} onClick={() => void act('leave')}>
            {party.data.members.some((m) => m.id === userId && m.leader) ? 'Giải tán tổ đội' : 'Rời tổ đội'}
          </Button>
          <div role="log" aria-label="Chat tổ đội" className="resident-chat">
            {party.data.messages.map((m) => (
              <p key={m.id}>
                <strong>{m.name}: </strong>
                {m.body}
              </p>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim() && !busy) void act('chat', text.trim());
            }}
          >
            <label>
              Tin nhắn tổ đội
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
            </label>
            <Button type="submit" disabled={busy || !text.trim()}>
              Gửi
            </Button>
          </form>
        </>
      ) : (
        <Button disabled={busy || party.isLoading} onClick={() => void act('create')}>
          Tạo tổ đội
        </Button>
      )}
    </div>
  );
}
