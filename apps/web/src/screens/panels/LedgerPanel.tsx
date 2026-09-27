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
  starter_grant: 'Quà tân thủ',
  onboarding_bonus: 'Thưởng danh sách tân thủ',
  fishing: 'Câu cá',
  delivery: 'Giao hàng',
  cafe: 'Làm thêm quán cafe',
  event_reward: 'Thưởng sự kiện',
  shop_purchase: 'Mua sắm tại cửa hàng',
  ai_mint: 'Đổi thưởng AI Credit',
  ai_key_allocate: 'Tạo khóa API',
  ai_key_refund: 'Hoàn trả khóa API',
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
      eyebrow="Tài Khoản"
      title="Lịch sử giao dịch"
      onClose={onClose}
      actions={
        <div className="tabs" role="tablist">
          {(
            [
              ['', 'Tất cả'],
              ['coin', 'Xu'],
              ['fame', 'Danh tiếng'],
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
          title="Chưa có giao dịch nào"
          body="Mọi biến động Xu, Danh tiếng và AI Credit sẽ được ghi nhận tại đây."
        />
      ) : (
        <div className="table-wrap" style={{ maxWidth: 900, margin: '0 auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Nội dung</th>
                <th>Loại tiền</th>
                <th className="num">Biến động</th>
                <th className="num">Số dư sau GD</th>
              </tr>
            </thead>
            <tbody>
              {ledger.data.map((e) => (
                <tr key={e.id}>
                  <td className="muted">{new Date(e.created_at).toLocaleString('vi-VN')}</td>
                  <td>{REASONS[e.reason_type] ?? e.reason_type}</td>
                  <td>
                    {e.currency === 'ai_credit' ? 'AI Credit' : e.currency === 'coin' ? 'Xu' : 'Danh tiếng'}
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
