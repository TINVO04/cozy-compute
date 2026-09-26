import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, type Apartment } from '../../lib/api';
import { qk } from '../../lib/queries';
import { useUi } from '../../lib/store';
import { Button, EmptyState, ErrorState, IconButton, Modal, timeAgo, toastError } from '../../ui/primitives';

export function Guestbook({ apartment, onClose }: { apartment: Apartment; onClose: () => void }) {
  const qc = useQueryClient();
  const inspect = useUi((s) => s.inspect);
  const entries = useQuery({
    queryKey: qk.guestbook(apartment.ownerId),
    queryFn: () =>
      api<{ id: string; message: string; createdAt: string; authorId: string; authorName: string }[]>(
        `/apartments/${apartment.ownerId}/guestbook`,
      ),
  });
  const [message, setMessage] = useState('');
  const sign = useMutation({
    mutationFn: () => api(`/apartments/${apartment.ownerId}/guestbook`, { body: { message } }),
    onSuccess: () => {
      setMessage('');
      void qc.invalidateQueries({ queryKey: qk.guestbook(apartment.ownerId) });
    },
    onError: (err) => toastError(err, 'Could not sign'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/apartments/me/guestbook/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.guestbook(apartment.ownerId) }),
    onError: (err) => toastError(err),
  });
  return (
    <Modal
      title={`${apartment.name} — Guestbook`}
      description={
        apartment.isOwner ? 'Messages visitors left for you.' : `Leave a note for ${apartment.ownerName}.`
      }
      onClose={onClose}
      width={560}
    >
      {!apartment.isOwner ? (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim()) sign.mutate();
          }}
        >
          <input
            className="input"
            placeholder="Say something nice (or weird)…"
            maxLength={200}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-label="Guestbook message"
          />
          <Button type="submit" variant="primary" loading={sign.isPending} disabled={!message.trim()}>
            Sign
          </Button>
        </form>
      ) : null}
      {entries.isPending ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : entries.isError ? (
        <ErrorState error={entries.error} onRetry={() => void entries.refetch()} />
      ) : entries.data.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="No entries yet"
          body={
            apartment.isOwner ? 'Publish your apartment so visitors can find it.' : 'Be the first to sign.'
          }
        />
      ) : (
        <div className="stack" style={{ gap: 8, maxHeight: 360, overflow: 'auto' }}>
          {entries.data.map((g) => (
            <div key={g.id} className="card" style={{ padding: 12, display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 6 }}>
                  <button
                    className="btn-ghost"
                    style={{
                      border: 0,
                      background: 'none',
                      padding: 0,
                      fontWeight: 700,
                      color: 'var(--primary)',
                      cursor: 'pointer',
                    }}
                    onClick={() => inspect(g.authorId)}
                  >
                    {g.authorName}
                  </button>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {timeAgo(g.createdAt)}
                  </span>
                </div>
                <p style={{ fontSize: 14 }}>{g.message}</p>
              </div>
              {apartment.isOwner ? (
                <IconButton label="Delete entry" onClick={() => remove.mutate(g.id)}>
                  <Trash2 size={15} />
                </IconButton>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
