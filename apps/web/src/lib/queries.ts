import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Me } from './api';

export const qk = {
  me: ['me'] as const,
  shop: ['shop'] as const,
  ai: ['ai'] as const,
  events: ['events'] as const,
  friends: ['friends'] as const,
  apartment: (id: string) => ['apartment', id] as const,
  apartments: (sort: string) => ['apartments', sort] as const,
  guestbook: (id: string) => ['guestbook', id] as const,
  player: (id: string) => ['player', id] as const,
  ledger: (c: string) => ['ledger', c] as const,
  activities: ['activities'] as const,
};

export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: () => api<Me>('/me'), staleTime: 10_000 });
}

/** Refresh balances after any server-side economy change. */
export function useRefreshEconomy() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qk.me });
    void qc.invalidateQueries({ queryKey: qk.shop });
    void qc.invalidateQueries({ queryKey: qk.ai });
  };
}

export { useMutation, useQuery, useQueryClient };
