import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { useState } from 'react';
import { api, num, usd } from '../../lib/api';
import { qk } from '../../lib/queries';
import { EmptyState, ErrorState, LoadingState, Panel } from '../../ui/primitives';

interface Entry {
  id: number;
  currency: 'coin' | 'fame' | 'ai_credit';
  amount: number;
  balance_after: number;
  reason_type: string;
  created_at: string;
}

const REASONS: Record<string, string> = {
  starter_grant: 'Welcome gift',
  onboarding_bonus: 'Newcomer checklist bonus',
  fishing: 'Fishing',
  delivery: 'Delivery',
  cafe: 'Cafe shift',
  event_reward: 'Event reward',
  shop_purchase: 'Shop purchase',
  ai_mint: 'AI Credit redemption',
  ai_key_allocate: 'API key created',
  ai_key_refund: 'API key refund',
};

export function LedgerPanel({ onClose }: { onClose: () => void }) {
  const [currency, setCurrency] = useState<'' | 'coin' | 'fame' | 'ai_credit'>('');
  const ledger = useQuery({
    queryKey: qk.ledger(currency),
    queryFn: () => api<Entry[]>(`/me/ledger${currency ? `?currency=${currency}` : ''}`),
  });
  const fmt = (c: Entry['currency'], v: number) => (c === 'ai_credit' ? usd(v) : num(v));
  return (
    <Panel
      icon={<Receipt size={18} />}
      eyebrow="Account"
      title="Transaction history"
      onClose={onClose}
      actions={
        <div className="tabs" role="tablist">
          {(
            [
              ['', 'All'],
              ['coin', 'Coin'],
              ['fame', 'Fame'],
              ['ai_credit', 'AI Credit'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              className="tab"
              aria-selected={currency === id}
              onClick={() => setCurrency(id)}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {ledger.isPending ? (
        <LoadingState />
      ) : ledger.isError ? (
        <ErrorState error={ledger.error} onRetry={() => void ledger.refetch()} />
      ) : ledger.data.length === 0 ? (
        <EmptyState
          icon={<Receipt size={22} />}
          title="No transactions yet"
          body="Every Coin, Fame and AI Credit change shows up here."
        />
      ) : (
        <div className="table-wrap" style={{ maxWidth: 900, margin: '0 auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>What</th>
                <th>Currency</th>
                <th className="num">Change</th>
                <th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.data.map((e) => (
                <tr key={e.id}>
                  <td className="muted">{new Date(e.created_at).toLocaleString()}</td>
                  <td>{REASONS[e.reason_type] ?? e.reason_type}</td>
                  <td>
                    {e.currency === 'ai_credit' ? 'AI Credit' : e.currency === 'coin' ? 'Coin' : 'Fame'}
                  </td>
                  <td className={`num ${e.amount >= 0 ? 'pos' : 'neg'}`}>
                    {e.amount >= 0 ? '+' : '−'}
                    {fmt(e.currency, Math.abs(e.amount))}
                  </td>
                  <td className="num">{fmt(e.currency, e.balance_after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
