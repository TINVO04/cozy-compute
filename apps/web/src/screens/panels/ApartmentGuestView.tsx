import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { game } from '../../game/GameCanvas';
import { api, type Apartment } from '../../lib/api';
import { qk } from '../../lib/queries';
import { Button, ErrorState, LoadingState } from '../../ui/primitives';
import { Guestbook } from './Guestbook';

/** Visitors see the same saved theme and objects as the owner, without editing rights. */
export function ApartmentGuestView({ ownerId }: { ownerId: string }) {
  const [guestbook, setGuestbook] = useState(false);
  const apt = useQuery({
    queryKey: qk.apartment(ownerId),
    queryFn: () => api<Apartment>(`/apartments/${ownerId}`),
  });
  const { refetch } = apt;
  useEffect(() => {
    const refresh = () => void refetch();
    game?.events.on('apartment:layout-changed', refresh);
    return () => {
      game?.events.off('apartment:layout-changed', refresh);
    };
  }, [refetch]);
  useEffect(() => {
    if (!apt.data || !game) return;
    const render = () =>
      game?.events.emit('apartment:render', {
        themeId: apt.data!.themeId,
        objects: apt.data!.objects,
        editing: false,
      });
    render();
    game.events.on('apartment:ready', render);
    return () => {
      game?.events.off('apartment:ready', render);
    };
  }, [apt.data]);
  if (apt.isPending)
    return (
      <div className="hud-bottom">
        <LoadingState rows={1} />
      </div>
    );
  if (apt.isError)
    return (
      <div className="hud-bottom">
        <ErrorState error={apt.error} onRetry={() => void apt.refetch()} />
      </div>
    );
  return (
    <>
      <div className="hud-bottom">
        <Button onClick={() => setGuestbook(true)}>
          <BookOpen size={16} /> Lưu bút
        </Button>
        <span className="pill">
          {apt.data.name} · {apt.data.objects.length} món trang trí
        </span>
      </div>
      {guestbook ? <Guestbook apartment={apt.data} onClose={() => setGuestbook(false)} /> : null}
    </>
  );
}
