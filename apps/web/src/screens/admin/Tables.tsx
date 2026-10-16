import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { api, num, usd, type AiKey } from '../../lib/api';
import { useUi } from '../../lib/store';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  toastError,
} from '../../ui/primitives';

function Page({
  title,
  sub,
  actions,
  children,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="stack-lg">
      <header className="admin-head">
        <div>
          <h1>{title}</h1>
          {sub ? <p className="muted">{sub}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ position: 'relative', width: 320 }}>
      <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
      <input
        className="input"
        style={{ paddingLeft: 36 }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
    </div>
  );
}

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Table<T>({
  q,
  cols,
  empty,
}: {
  q: { isPending: boolean; isError: boolean; error: unknown; data?: T[]; refetch: () => unknown };
  cols: [string, (r: T) => ReactNode, string?][];
  empty: string;
}) {
  if (q.isPending) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data?.length)
    return (
      <div className="card">
        <EmptyState icon={<Search size={22} />} title={empty} />
      </div>
    );
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {cols.map(([h, , cls]) => (
              <th key={h} className={cls}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.data.map((row, i) => (
            <tr key={i}>
              {cols.map(([h, render, cls]) => (
                <td key={h} className={cls}>
                  {render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const when = (iso: string) => new Date(iso).toLocaleString('vi-VN');

// ---------------------------------------------------------------- keys
type AdminKey = AiKey & { userId: string; displayName: string; email: string; requests: number };

export function KeysPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const q = useDebounced(search);
  const keys = useQuery({
    queryKey: ['admin', 'keys', q, status],
    queryFn: () => api<AdminKey[]>(`/admin/keys?q=${encodeURIComponent(q)}&status=${status}`),
  });
  const [action, setAction] = useState<null | { kind: 'suspend' | 'unsuspend' | 'revoke'; key: AdminKey }>(
    null,
  );
  const [reason, setReason] = useState('');
  const run = useMutation({
    mutationFn: () =>
      action!.kind === 'revoke'
        ? api(`/admin/keys/${action!.key.id}/revoke`, { body: {} })
        : api(`/admin/keys/${action!.key.id}/suspend`, {
            body: { suspended: action!.kind === 'suspend', reason },
          }),
    onSuccess: () => {
      useUi.getState().toast({ kind: 'success', title: 'Đã cập nhật khóa' });
      setAction(null);
      setReason('');
      void qc.invalidateQueries({ queryKey: ['admin', 'keys'] });
    },
    onError: (err) => toastError(err),
  });
  const sync = useMutation({
    mutationFn: () => api<{ synced: number; expired: number }>('/admin/usage/sync', { body: {} }),
    onSuccess: (r) => {
      useUi.getState().toast({
        kind: 'success',
        title: `Đã đồng bộ ${r.synced} khóa`,
        body: `${r.expired} khóa đã hết hạn`,
      });
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => toastError(err),
  });
  return (
    <Page
      title="Khóa API người chơi"
      sub="Các khóa ảo được cấp qua cổng Gateway. Khóa bí mật không bao giờ được lưu trữ."
      actions={
        <div className="row">
          <select
            className="select"
            style={{ width: 150 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Lọc trạng thái"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="suspended">Bị tạm dừng</option>
            <option value="revoked">Đã thu hồi</option>
            <option value="expired">Đã hết hạn</option>
          </select>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Người chơi, email, ID khóa hoặc 4 số cuối"
          />
          <Button loading={sync.isPending} onClick={() => sync.mutate()}>
            Đồng bộ sử dụng ngay
          </Button>
        </div>
      }
    >
      <Table
        q={keys}
        empty="Không tìm thấy khóa nào phù hợp"
        cols={[
          [
            'Người chơi',
            (k) => (
              <>
                <div style={{ fontWeight: 600 }}>{k.displayName}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {k.email}
                </div>
              </>
            ),
          ],
          [
            'Khóa',
            (k) => (
              <>
                <div>{k.label}</div>
                <div className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {k.keyPreview}
                </div>
              </>
            ),
          ],
          [
            'Trạng thái',
            (k) => (
              <span
                className={`pill ${k.status === 'active' ? 'pill-success' : k.status === 'suspended' ? 'pill-danger' : ''}`}
              >
                {k.status === 'active'
                  ? 'Hoạt động'
                  : k.status === 'suspended'
                    ? 'Tạm dừng'
                    : k.status === 'revoked'
                      ? 'Đã thu hồi'
                      : k.status === 'expired'
                        ? 'Đã hết hạn'
                        : k.status}
              </span>
            ),
          ],
          [
            'Mô hình',
            (k) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{k.models.join(', ')}</span>
            ),
          ],
          ['Đã dùng / Ngân sách', (k) => `${usd(Math.round(k.spendCents))} / ${usd(k.budgetCents)}`, 'num'],
          ['Số yêu cầu', (k) => num(k.requests), 'num'],
          ['Hết hạn', (k) => new Date(k.expiresAt).toLocaleDateString('vi-VN')],
          [
            '',
            (k) =>
              k.status === 'active' || k.status === 'suspended' || k.status === 'exhausted' ? (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Button
                    size="sm"
                    onClick={() =>
                      setAction({ kind: k.status === 'suspended' ? 'unsuspend' : 'suspend', key: k })
                    }
                  >
                    {k.status === 'suspended' ? 'Mở khóa' : 'Tạm dừng'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setAction({ kind: 'revoke', key: k })}>
                    Thu hồi
                  </Button>
                </div>
              ) : null,
          ],
        ]}
      />
      {action?.kind === 'suspend' ? (
        <Modal
          title={`Tạm dừng ${action.key.keyPreview}?`}
          description="Khóa này sẽ ngừng hoạt động tại cổng Gateway cho đến khi được mở lại."
          onClose={() => setAction(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setAction(null)}>
                Hủy
              </Button>
              <Button variant="danger" loading={run.isPending} onClick={() => run.mutate()}>
                Tạm dừng khóa
              </Button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="reason">Lý do (hiển thị trong nhật ký kiểm toán)</label>
            <input id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </Modal>
      ) : action ? (
        <ConfirmDialog
          danger={action.kind === 'revoke'}
          title={action.kind === 'revoke' ? 'Thu hồi vĩnh viễn khóa này?' : 'Mở lại khóa này?'}
          body={
            action.kind === 'revoke'
              ? `Khóa ${action.key.keyPreview} của ${action.key.displayName} sẽ bị xóa khỏi cổng Gateway. Hành động này không thể hoàn tác.`
              : 'Khóa sẽ hoạt động trở lại ngay lập tức.'
          }
          confirmLabel={action.kind === 'revoke' ? 'Thu hồi' : 'Mở khóa'}
          loading={run.isPending}
          onConfirm={() => run.mutate()}
          onClose={() => setAction(null)}
        />
      ) : null}
    </Page>
  );
}

// ---------------------------------------------------------------- usage
export function UsagePage() {
  const usage = useQuery({
    queryKey: ['admin', 'usage'],
    queryFn: () =>
      api<
        {
          day: string;
          model_id: string;
          requests: number;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
        }[]
      >('/admin/usage'),
  });
  const redemptions = useQuery({
    queryKey: ['admin', 'redemptions'],
    queryFn: () =>
      api<
        {
          id: string;
          kind: string;
          status: string;
          source_coin: number;
          ai_credit_cents: number;
          quota_cents: number;
          failure_reason: string | null;
          display_name: string;
          created_at: string;
        }[]
      >('/admin/redemptions'),
  });
  return (
    <Page title="Mức sử dụng" sub="Chi phí Gateway được đối soát vào sổ cái sử dụng trong 30 ngày qua.">
      <Table
        q={usage}
        empty="Chưa ghi nhận mức sử dụng Gateway nào"
        cols={[
          ['Ngày', (u) => u.day],
          ['Mô hình', (u) => <span style={{ fontFamily: 'var(--font-mono)' }}>{u.model_id}</span>],
          ['Số yêu cầu', (u) => num(u.requests), 'num'],
          ['Token đầu vào', (u) => num(u.input_tokens), 'num'],
          ['Token đầu ra', (u) => num(u.output_tokens), 'num'],
          ['Chi phí', (u) => `$${u.cost_usd.toFixed(4)}`, 'num'],
        ]}
      />
      <div className="section-title">
        <h3>Lịch sử đổi thưởng gần đây</h3>
      </div>
      <Table
        q={redemptions}
        empty="Chưa có lượt đổi thưởng nào"
        cols={[
          ['Thời gian', (r) => when(r.created_at)],
          ['Người chơi', (r) => r.display_name],
          ['Loại giao dịch', (r) => (r.kind === 'mint' ? 'Xu → AI Credit' : 'AI Credit → khóa')],
          ['Xu', (r) => (r.source_coin ? num(r.source_coin) : '—'), 'num'],
          ['AI Credit', (r) => usd(r.ai_credit_cents), 'num'],
          ['Hạn mức', (r) => (r.quota_cents ? usd(r.quota_cents) : '—'), 'num'],
          [
            'Trạng thái',
            (r) => (
              <span
                className={`pill ${r.status === 'completed' ? 'pill-success' : r.status === 'failed' ? 'pill-danger' : 'pill-warn'}`}
                title={r.failure_reason ?? undefined}
              >
                {r.status === 'completed' ? 'Hoàn tất' : r.status === 'failed' ? 'Thất bại' : 'Đang xử lý'}
              </span>
            ),
          ],
        ]}
      />
    </Page>
  );
}

// ---------------------------------------------------------------- ledger
export function LedgerPage() {
  const [user, setUser] = useState('');
  const [reason, setReason] = useState('');
  const [currency, setCurrency] = useState('');
  const u = useDebounced(user);
  const r = useDebounced(reason);
  const ledger = useQuery({
    queryKey: ['admin', 'ledger', u, r, currency],
    queryFn: () =>
      api<
        {
          id: number;
          display_name: string;
          currency: string;
          amount: number;
          balance_after: number;
          reason_type: string;
          reference_id: string | null;
          created_at: string;
        }[]
      >(`/admin/ledger?user=${encodeURIComponent(u)}&reason=${encodeURIComponent(r)}&currency=${currency}`),
  });
  return (
    <Page
      title="Sổ cái tài chính"
      sub="Mọi biến động số dư trong trò chơi. Số dư không bao giờ thay đổi mà không có bản ghi tại đây."
      actions={
        <div className="row">
          <select
            className="select"
            style={{ width: 140 }}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Loại tiền tệ"
          >
            <option value="">Tất cả đơn vị</option>
            <option value="coin">Xu</option>
            <option value="fame">Danh tiếng</option>
            <option value="ai_credit">AI Credit</option>
          </select>
          <input
            className="input"
            style={{ width: 180 }}
            placeholder="Lý do (vd: ai_mint)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Lý do"
          />
          <SearchBox value={user} onChange={setUser} placeholder="Tên người chơi, email hoặc ID" />
        </div>
      }
    >
      <Table
        q={ledger}
        empty="Không tìm thấy giao dịch nào trong sổ cái"
        cols={[
          ['#', (e) => e.id],
          ['Thời gian', (e) => when(e.created_at)],
          ['Người chơi', (e) => e.display_name],
          [
            'Lý do',
            (e) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{e.reason_type}</span>,
          ],
          [
            'Loại tiền',
            (e) => (e.currency === 'coin' ? 'Xu' : e.currency === 'fame' ? 'Danh tiếng' : 'AI Credit'),
          ],
          [
            'Số tiền',
            (e) => (
              <span className={e.amount >= 0 ? 'pos' : 'neg'}>
                {e.currency === 'ai_credit' ? usd(e.amount) : num(e.amount)}
              </span>
            ),
            'num',
          ],
          [
            'Số dư sau',
            (e) => (e.currency === 'ai_credit' ? usd(e.balance_after) : num(e.balance_after)),
            'num',
          ],
          [
            'Mã tham chiếu',
            (e) => (
              <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {e.reference_id?.slice(0, 8) ?? ''}
              </span>
            ),
          ],
        ]}
      />
    </Page>
  );
}

// ---------------------------------------------------------------- players
export function PlayersPage() {
  const qc = useQueryClient();
  const toast = useUi((s) => s.toast);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'suspended' | 'unverified'>('all');
  const q = useDebounced(search);
  const players = useQuery({
    queryKey: ['admin', 'players', q],
    queryFn: () =>
      api<
        {
          id: string;
          email: string;
          display_name: string;
          role: string;
          status: string;
          trust_score: number;
          coin: number;
          fame: number;
          ai_credit_cents: number;
          created_at: string;
          last_login_at?: string | null;
          email_verified: boolean;
          email_verified_at?: string | null;
          online?: boolean;
          room?: string | null;
        }[]
      >(`/admin/players?q=${encodeURIComponent(q)}`),
    refetchInterval: 10000,
  });

  const [target, setTarget] = useState<null | { id: string; name: string; status: string }>(null);
  const [targetDelete, setTargetDelete] = useState<null | { id: string; name: string; email: string }>(null);
  const [targetVerify, setTargetVerify] = useState<null | { id: string; name: string; verified: boolean }>(
    null,
  );
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [targetCoin, setTargetCoin] = useState<null | { id: string; name: string; currentCoin: number }>(
    null,
  );
  const [coinAction, setCoinAction] = useState<'add' | 'subtract' | 'set'>('add');
  const [coinAmount, setCoinAmount] = useState<string>('1000');
  const [coinReason, setCoinReason] = useState<string>('Thưởng sự kiện');

  const actCoin = useMutation({
    mutationFn: () => {
      const parsedAmount = parseInt(coinAmount.replace(/,/g, ''), 10);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        throw new Error('Số lượng xu không hợp lệ.');
      }
      return api<{ ok: boolean; previousCoin: number; newCoin: number; delta: number }>(
        `/admin/players/${targetCoin!.id}/coin`,
        {
          body: {
            action: coinAction,
            amount: parsedAmount,
            reason: coinReason.trim() || 'Admin điều chỉnh số dư',
          },
        },
      );
    },
    onSuccess: (res) => {
      toast({
        kind: 'success',
        title: 'Đã điều chỉnh số dư Xu',
        body: `Người chơi ${targetCoin?.name}: số dư mới là ${num(res.newCoin)} xu (${res.delta >= 0 ? '+' : ''}${num(res.delta)} xu).`,
      });
      setTargetCoin(null);
      setCoinAmount('1000');
      setCoinReason('Thưởng sự kiện');
      void qc.invalidateQueries({ queryKey: ['admin', 'players'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'ledger'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
    onError: (err) => toastError(err),
  });

  const actStatus = useMutation({
    mutationFn: () =>
      api(`/admin/players/${target!.id}/status`, {
        body: { status: target!.status === 'suspended' ? 'active' : 'suspended' },
      }),
    onSuccess: () => {
      const isSuspended = target?.status === 'suspended';
      toast({
        kind: 'success',
        title: isSuspended ? 'Đã mở khóa tài khoản' : 'Đã tạm khóa tài khoản',
      });
      setTarget(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'players'] });
    },
    onError: (err) => toastError(err),
  });

  const actDelete = useMutation({
    mutationFn: () => api(`/admin/players/${targetDelete!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        kind: 'success',
        title: 'Đã xóa tài khoản vĩnh viễn',
        body: `Tài khoản ${targetDelete?.name} đã được xóa khỏi hệ thống.`,
      });
      setTargetDelete(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'players'] });
    },
    onError: (err) => toastError(err),
  });

  const actVerify = useMutation({
    mutationFn: () =>
      api(`/admin/players/${targetVerify!.id}/verify-email`, {
        body: { verified: !targetVerify!.verified },
      }),
    onSuccess: () => {
      const willBeVerified = !targetVerify?.verified;
      toast({
        kind: 'success',
        title: willBeVerified ? 'Đã xác thực email người chơi' : 'Đã hủy xác thực email người chơi',
        body: willBeVerified
          ? 'Người chơi đã được đánh dấu xác thực thành công.'
          : 'Người chơi đã bị ngắt kết nối và phải xác thực lại email để vào game.',
      });
      setTargetVerify(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'players'] });
    },
    onError: (err) => toastError(err),
  });

  const actSendReverify = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean; message: string }>(`/admin/players/${id}/send-verification-email`, {
        method: 'POST',
      }),
    onSuccess: (res) => {
      toast({
        kind: 'success',
        title: 'Đã gửi mã xác thực',
        body: res.message || 'Mã OTP xác thực đã được gửi về email của người chơi.',
      });
    },
    onError: (err) => toastError(err),
    onSettled: () => setSendingId(null),
  });

  function handleSendOtp(id: string) {
    setSendingId(id);
    actSendReverify.mutate(id);
  }

  const onlineCount = players.data?.filter((p) => p.status === 'active' && p.online).length ?? 0;
  const unverifiedCount = players.data?.filter((p) => !p.email_verified).length ?? 0;
  const filteredData = (players.data ?? []).filter((p) => {
    if (filter === 'online') return p.status === 'active' && p.online;
    if (filter === 'offline') return p.status === 'active' && !p.online;
    if (filter === 'suspended') return p.status === 'suspended';
    if (filter === 'unverified') return !p.email_verified;
    return true;
  });
  const filteredPlayers = {
    ...players,
    data: players.data ? filteredData : undefined,
  };

  return (
    <Page
      title="Người chơi"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="tabs" role="tablist">
            {(
              [
                ['all', 'Tất cả'],
                ['online', `Trực tuyến (${onlineCount})`],
                ['offline', 'Ngoại tuyến'],
                ['suspended', 'Tạm khóa'],
                ['unverified', `Chưa xác thực mail (${unverifiedCount})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                className="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <SearchBox value={search} onChange={setSearch} placeholder="Tên, email hoặc ID" />
          <Button
            variant="secondary"
            disabled={players.isFetching}
            onClick={async () => {
              await players.refetch();
              toast({
                kind: 'info',
                title: 'Đã làm mới',
                body: 'Danh sách người chơi đã được cập nhật mới nhất.',
              });
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Làm mới danh sách người chơi"
          >
            <RefreshCw
              size={14}
              style={players.isFetching ? { animation: 'spin .7s linear infinite' } : undefined}
            />
            Làm mới
          </Button>
        </div>
      }
    >
      <Table
        q={filteredPlayers}
        empty="Không tìm thấy người chơi nào"
        cols={[
          [
            'Người chơi',
            (p) => (
              <>
                <div style={{ fontWeight: 600 }}>
                  {p.display_name}{' '}
                  {p.role === 'admin' ? <span className="pill pill-primary">admin</span> : null}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {p.email}
                </div>
              </>
            ),
          ],
          [
            'Trạng thái',
            (p) => {
              if (p.status === 'suspended') {
                return (
                  <span className="pill pill-danger" title="Tài khoản bị tạm khóa">
                    Tạm khóa
                  </span>
                );
              }
              if (p.online) {
                return (
                  <div
                    style={{
                      display: 'inline-flex',
                      flexDirection: 'column',
                      gap: 2,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span className="pill pill-success" title="Đang trực tuyến trong game">
                      <span className="presence on" style={{ width: 7, height: 7 }} />
                      Trực tuyến
                    </span>
                    {p.room ? (
                      <span className="muted" style={{ fontSize: 11, paddingLeft: 4 }}>
                        {p.room}
                      </span>
                    ) : null}
                  </div>
                );
              }
              return (
                <span className="pill" title="Ngoại tuyến" style={{ opacity: 0.85 }}>
                  <span className="presence" style={{ width: 7, height: 7 }} />
                  Ngoại tuyến
                </span>
              );
            },
          ],
          [
            'Xác thực Email',
            (p) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.email_verified ? (
                    <span className="pill pill-success" title="Email đã được xác thực">
                      Đã xác thực
                    </span>
                  ) : (
                    <span className="pill pill-danger" title="Email chưa được xác thực">
                      Chưa xác thực
                    </span>
                  )}
                  {p.role !== 'admin' && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '2px 6px', height: 'auto', minHeight: 0 }}
                      title={
                        p.email_verified
                          ? 'Hủy xác thực để yêu cầu người chơi xác thực lại'
                          : 'Xác thực thủ công'
                      }
                      onClick={() =>
                        setTargetVerify({
                          id: p.id,
                          name: p.display_name,
                          verified: p.email_verified,
                        })
                      }
                    >
                      {p.email_verified ? 'Hủy xác thực' : 'Xác thực ngay'}
                    </button>
                  )}
                </div>
                {!p.email_verified && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px', height: 'auto', minHeight: 0 }}
                    disabled={sendingId === p.id}
                    onClick={() => handleSendOtp(p.id)}
                    title="Gửi mã OTP xác thực lại tới email này"
                  >
                    {sendingId === p.id ? 'Đang gửi...' : 'Gửi lại OTP mail'}
                  </button>
                )}
              </div>
            ),
          ],
          ['Tin cậy', (p) => p.trust_score, 'num'],
          [
            'Xu',
            (p) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <span style={{ fontWeight: 600, color: '#facc15' }}>{num(p.coin)}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 6px', height: 'auto', minHeight: 0, fontSize: 11 }}
                  title="Điều chỉnh số dư Xu của người chơi này"
                  onClick={() => {
                    setTargetCoin({ id: p.id, name: p.display_name, currentCoin: p.coin });
                    setCoinAction('add');
                    setCoinAmount('1000');
                    setCoinReason('Thưởng sự kiện');
                  }}
                >
                  <Coins size={12} style={{ color: '#facc15' }} /> Sửa
                </button>
              </div>
            ),
            'num',
          ],
          ['Danh tiếng', (p) => num(p.fame), 'num'],
          ['AI Credit', (p) => usd(p.ai_credit_cents), 'num'],
          ['Tham gia', (p) => new Date(p.created_at).toLocaleDateString('vi-VN')],
          [
            'Hành động',
            (p) => (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setTargetCoin({ id: p.id, name: p.display_name, currentCoin: p.coin });
                    setCoinAction('add');
                    setCoinAmount('1000');
                    setCoinReason('Thưởng sự kiện');
                  }}
                  title="Cộng, trừ hoặc đặt số dư Xu"
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Coins size={13} style={{ color: '#facc15' }} />
                  Xu
                </Button>
                {p.role !== 'admin' && (
                  <>
                    <Button
                      size="sm"
                      variant={p.status === 'active' ? 'secondary' : 'primary'}
                      onClick={() => setTarget({ id: p.id, name: p.display_name, status: p.status })}
                    >
                      {p.status === 'active' ? 'Tạm khóa' : 'Mở khóa'}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setTargetDelete({ id: p.id, name: p.display_name, email: p.email })}
                      title="Xóa vĩnh viễn tài khoản người chơi này"
                    >
                      Xóa
                    </Button>
                  </>
                )}
              </div>
            ),
          ],
        ]}
      />
      {targetCoin ? (
        <Modal
          title={`Quản lý Xu: ${targetCoin.name}`}
          description={`Số dư hiện tại: ${num(targetCoin.currentCoin)} Xu`}
          onClose={() => setTargetCoin(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setTargetCoin(null)}>
                Hủy
              </Button>
              <Button
                variant={coinAction === 'subtract' ? 'danger' : 'primary'}
                loading={actCoin.isPending}
                disabled={
                  isNaN(parseInt(coinAmount.replace(/,/g, ''), 10)) ||
                  parseInt(coinAmount.replace(/,/g, ''), 10) < 0 ||
                  (coinAction === 'subtract' &&
                    parseInt(coinAmount.replace(/,/g, ''), 10) > targetCoin.currentCoin)
                }
                onClick={() => actCoin.mutate()}
              >
                {coinAction === 'add'
                  ? 'Cộng thêm Xu'
                  : coinAction === 'subtract'
                    ? 'Xác nhận trừ Xu'
                    : 'Đặt lại số dư'}
              </Button>
            </>
          }
        >
          <div className="stack" style={{ gap: 14 }}>
            <div className="field">
              <label>Hành động</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background:
                      coinAction === 'add' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    borderColor: coinAction === 'add' ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                    color: coinAction === 'add' ? '#34d399' : '#94a3b8',
                    fontWeight: 600,
                  }}
                  onClick={() => setCoinAction('add')}
                >
                  + Cộng Xu
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background:
                      coinAction === 'subtract' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    borderColor: coinAction === 'subtract' ? '#f43f5e' : 'rgba(255, 255, 255, 0.1)',
                    color: coinAction === 'subtract' ? '#fb7185' : '#94a3b8',
                    fontWeight: 600,
                  }}
                  onClick={() => setCoinAction('subtract')}
                >
                  - Trừ Xu
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background:
                      coinAction === 'set' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    borderColor: coinAction === 'set' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                    color: coinAction === 'set' ? '#38bdf8' : '#94a3b8',
                    fontWeight: 600,
                  }}
                  onClick={() => setCoinAction('set')}
                >
                  Đặt số dư
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="coinAmount">
                {coinAction === 'add'
                  ? 'Số lượng Xu muốn cộng'
                  : coinAction === 'subtract'
                    ? 'Số lượng Xu muốn trừ'
                    : 'Số dư Xu mới'}
              </label>
              <input
                id="coinAmount"
                type="number"
                min="0"
                className="input"
                value={coinAmount}
                onChange={(e) => setCoinAmount(e.target.value)}
                placeholder="Nhập số xu..."
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {[1000, 5000, 10000, 50000, 100000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '2px 6px' }}
                    onClick={() => setCoinAmount(String(val))}
                  >
                    +{num(val)}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="coinReason">Lý do điều chỉnh (lưu vào Sổ cái & Kiểm toán)</label>
              <input
                id="coinReason"
                type="text"
                className="input"
                value={coinReason}
                onChange={(e) => setCoinReason(e.target.value)}
                placeholder="Lý do điều chỉnh..."
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {['Thưởng sự kiện', 'Bồi thường lỗi', 'Admin hỗ trợ', 'Xử lý gian lận'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '2px 6px' }}
                    onClick={() => setCoinReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Box */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: 13,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span className="muted">Số dư sau khi lưu:</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#facc15' }}>
                {(() => {
                  const amt = parseInt(coinAmount.replace(/,/g, ''), 10) || 0;
                  const next =
                    coinAction === 'add'
                      ? targetCoin.currentCoin + amt
                      : coinAction === 'subtract'
                        ? targetCoin.currentCoin - amt
                        : amt;
                  return `${num(Math.max(0, next))} Xu`;
                })()}
              </span>
            </div>

            {coinAction === 'subtract' &&
              (parseInt(coinAmount.replace(/,/g, ''), 10) || 0) > targetCoin.currentCoin && (
                <div style={{ color: '#f87171', fontSize: 12 }}>
                  ⚠️ Số xu muốn trừ vượt quá số dư hiện có ({num(targetCoin.currentCoin)} xu).
                </div>
              )}
          </div>
        </Modal>
      ) : null}
      {target ? (
        <ConfirmDialog
          danger={target.status === 'active'}
          title={target.status === 'active' ? `Tạm khóa ${target.name}?` : `Mở khóa cho ${target.name}?`}
          body={
            target.status === 'active'
              ? 'Họ sẽ bị đăng xuất khỏi mọi thiết bị và đưa ra khỏi game ngay lập tức. Khóa API của họ sẽ không tự động bị thu hồi.'
              : 'Họ sẽ có thể đăng nhập lại vào game.'
          }
          confirmLabel={target.status === 'active' ? 'Tạm khóa' : 'Mở khóa'}
          loading={actStatus.isPending}
          onConfirm={() => actStatus.mutate()}
          onClose={() => setTarget(null)}
        />
      ) : null}
      {targetDelete ? (
        <ConfirmDialog
          danger
          title={`Xóa vĩnh viễn tài khoản ${targetDelete.name}?`}
          body={`CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn người chơi (${targetDelete.email}), toàn bộ căn hộ, cá đã câu, vật phẩm và tài sản. Dữ liệu KHÔNG THỂ phục hồi.`}
          confirmLabel="Xóa tài khoản"
          loading={actDelete.isPending}
          onConfirm={() => actDelete.mutate()}
          onClose={() => setTargetDelete(null)}
        />
      ) : null}
      {targetVerify ? (
        <ConfirmDialog
          danger={targetVerify.verified}
          title={
            targetVerify.verified
              ? `Hủy xác thực email của ${targetVerify.name}?`
              : `Xác thực email cho ${targetVerify.name}?`
          }
          body={
            targetVerify.verified
              ? 'Tài khoản người chơi sẽ bị ngắt kết nối ngay lập tức và chuyển về trạng thái Chưa xác thực. Người chơi sẽ phải tự xác thực lại email bằng mã OTP để tiếp tục vào game.'
              : 'Tài khoản người chơi sẽ được đánh dấu là Đã xác thực email thành công.'
          }
          confirmLabel={targetVerify.verified ? 'Hủy xác thực' : 'Xác thực ngay'}
          loading={actVerify.isPending}
          onConfirm={() => actVerify.mutate()}
          onClose={() => setTargetVerify(null)}
        />
      ) : null}
    </Page>
  );
}

// ---------------------------------------------------------------- flags & reports
export function FlagsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'open' | 'confirmed' | 'dismissed'>('open');
  const flags = useQuery({
    queryKey: ['admin', 'flags', status],
    queryFn: () =>
      api<
        {
          id: string;
          display_name: string;
          type: string;
          severity: string;
          score: number;
          metadata: unknown;
          created_at: string;
          trust_score: number;
        }[]
      >(`/admin/flags?status=${status}`),
  });
  const resolve = useMutation({
    mutationFn: (v: { id: string; status: 'confirmed' | 'dismissed' }) =>
      api(`/admin/flags/${v.id}/resolve`, {
        body: { status: v.status, restoreTrust: v.status === 'dismissed' },
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'flags'] }),
    onError: (err) => toastError(err),
  });
  const statusLabels = {
    open: 'Chờ duyệt',
    confirmed: 'Đã xác nhận',
    dismissed: 'Đã bỏ qua',
  };
  return (
    <Page
      title="Cảnh báo vi phạm"
      sub="Các tín hiệu phát hiện tự động. Không tự động cấm mà chỉ giảm độ tin cậy và chờ quản trị viên xem xét."
      actions={
        <div className="tabs" role="tablist">
          {(['open', 'confirmed', 'dismissed'] as const).map((s) => (
            <button
              key={s}
              role="tab"
              className="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
      }
    >
      <Table
        q={flags}
        empty={`Không có cảnh báo nào (${statusLabels[status].toLowerCase()})`}
        cols={[
          ['Thời gian', (f) => when(f.created_at)],
          [
            'Người chơi',
            (f) => (
              <>
                <div style={{ fontWeight: 600 }}>{f.display_name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  tin cậy {f.trust_score}
                </div>
              </>
            ),
          ],
          ['Tín hiệu', (f) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{f.type}</span>],
          [
            'Mức độ',
            (f) => (
              <span
                className={`pill ${f.severity === 'high' ? 'pill-danger' : f.severity === 'medium' ? 'pill-warn' : ''}`}
              >
                {f.severity === 'high' ? 'Nghiêm trọng' : f.severity === 'medium' ? 'Trung bình' : 'Thấp'}
              </span>
            ),
          ],
          ['Chi tiết', (f) => <code style={{ fontSize: 11 }}>{JSON.stringify(f.metadata)}</code>],
          [
            '',
            (f) =>
              status === 'open' ? (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Button size="sm" onClick={() => resolve.mutate({ id: f.id, status: 'dismissed' })}>
                    Bỏ qua
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => resolve.mutate({ id: f.id, status: 'confirmed' })}
                  >
                    Xác nhận
                  </Button>
                </div>
              ) : null,
          ],
        ]}
      />
    </Page>
  );
}

export function ReportsPage() {
  const qc = useQueryClient();
  const reports = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () =>
      api<
        {
          id: string;
          reason: string;
          details: string;
          status: string;
          created_at: string;
          reporter: string;
          target: string;
          context: { recentChat?: { text: string }[] };
        }[]
      >('/admin/reports'),
  });
  const update = useMutation({
    mutationFn: (v: { id: string; status: 'reviewed' | 'dismissed' }) =>
      api(`/admin/reports/${v.id}`, { body: { status: v.status } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
    onError: (err) => toastError(err),
  });
  return (
    <Page title="Báo cáo người chơi">
      <Table
        q={reports}
        empty="Không có báo cáo nào"
        cols={[
          ['Thời gian', (r) => when(r.created_at)],
          ['Bị báo cáo', (r) => <strong>{r.target}</strong>],
          ['Người báo', (r) => r.reporter],
          ['Lý do', (r) => r.reason.replace('_', ' ')],
          [
            'Chi tiết',
            (r) => (
              <>
                <div>{r.details}</div>
                {r.context.recentChat?.length ? (
                  <div className="muted" style={{ fontSize: 12 }}>
                    Trò chuyện: “{r.context.recentChat.map((c) => c.text).join('” “')}”
                  </div>
                ) : null}
              </>
            ),
          ],
          [
            'Trạng thái',
            (r) => (
              <span className={`pill ${r.status === 'open' ? 'pill-warn' : ''}`}>
                {r.status === 'open' ? 'Chờ xử lý' : r.status === 'reviewed' ? 'Đã xem xét' : 'Đã bỏ qua'}
              </span>
            ),
          ],
          [
            '',
            (r) =>
              r.status === 'open' ? (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Button size="sm" onClick={() => update.mutate({ id: r.id, status: 'dismissed' })}>
                    Bỏ qua
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => update.mutate({ id: r.id, status: 'reviewed' })}
                  >
                    Đã xử lý
                  </Button>
                </div>
              ) : null,
          ],
        ]}
      />
    </Page>
  );
}

// ---------------------------------------------------------------- audit
export function AuditPage() {
  const audit = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () =>
      api<
        {
          id: number;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before_json: unknown;
          after_json: unknown;
          created_at: string;
          admin: string | null;
        }[]
      >('/admin/audit'),
  });
  const [open, setOpen] = useState<null | { before: unknown; after: unknown; action: string }>(null);
  return (
    <Page
      title="Nhật ký kiểm toán"
      sub="Mọi thay đổi của quản trị viên đối với mô hình, bảng giá, quỹ thưởng, khóa API và người chơi."
    >
      <Table
        q={audit}
        empty="Chưa có hành động quản trị nào"
        cols={[
          ['Thời gian', (a) => when(a.created_at)],
          ['Quản trị viên', (a) => a.admin ?? 'hệ thống'],
          [
            'Hành động',
            (a) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.action}</span>,
          ],
          [
            'Đối tượng',
            (a) => (
              <span className="muted">
                {a.entity_type} {a.entity_id?.slice(0, 8)}
              </span>
            ),
          ],
          [
            '',
            (a) => (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOpen({ before: a.before_json, after: a.after_json, action: a.action })}
              >
                Xem diff
              </Button>
            ),
          ],
        ]}
      />
      {open ? (
        <Modal title={open.action} onClose={() => setOpen(null)} width={820}>
          <div className="form-grid">
            <div>
              <div className="label">Trước khi đổi</div>
              <pre className="code" style={{ maxHeight: 400 }}>
                {JSON.stringify(open.before, null, 2) ?? '—'}
              </pre>
            </div>
            <div>
              <div className="label">Sau khi đổi</div>
              <pre className="code" style={{ maxHeight: 400 }}>
                {JSON.stringify(open.after, null, 2) ?? '—'}
              </pre>
            </div>
          </div>
        </Modal>
      ) : null}
    </Page>
  );
}
