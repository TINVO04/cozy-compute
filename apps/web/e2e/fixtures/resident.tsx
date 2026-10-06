import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResidentPanel } from '../../src/screens/panels/ResidentPanel';
import { useUi } from '../../src/lib/store';
import type { Me } from '../../src/lib/api';
import '../../src/styles.css';
const params = new URLSearchParams(location.search);
const me = { id: '11111111-1111-4111-8111-111111111111', displayName: 'Cư dân thử nghiệm' } as Me;
useUi.setState({ myUserId: me.id, room: { kind: 'comga', label: 'Cơm Gà 68' } });
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ResidentPanel
        me={me}
        initialTab={params.has('kitchen') ? 'kitchen' : 'quests'}
        onClose={() => {
          document.body.dataset.closed = 'true';
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
);
