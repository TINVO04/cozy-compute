import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { game, GameCanvas } from '../../src/game/GameCanvas';
import { qk } from '../../src/lib/queries';
import { useUi } from '../../src/lib/store';
import { ApartmentEditor } from '../../src/screens/panels/ApartmentEditor';
import { ApartmentGuestView } from '../../src/screens/panels/ApartmentGuestView';
import '../../src/styles.css';

const guest = new URLSearchParams(location.search).has('guest');
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
qc.setQueryData(qk.me, { id: 'fixture-owner' });
useUi.setState({ room: { kind: 'apartment', ownerId: 'fixture-owner', label: 'Studio' }, muted: true });
Object.defineProperty(window, 'apartmentPreview', { get: () => game });
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}>
    <div
      className="world"
      style={{ width: 'calc(100vw - 300px)', height: 'calc(100vh - 64px)', marginTop: 64 }}
    >
      <GameCanvas />
      {guest ? <ApartmentGuestView ownerId="fixture-owner" /> : <ApartmentEditor />}
    </div>
  </QueryClientProvider>,
);
