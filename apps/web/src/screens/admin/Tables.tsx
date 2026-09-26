import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
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

const when = (iso: string) => new Date(iso).toLocaleString();

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
      useUi.getState().toast({ kind: 'success', title: 'Key updated' });
      setAction(null);
      setReason('');
      void qc.invalidateQueries({ queryKey: ['admin', 'keys'] });
    },
    onError: (err) => toastError(err),
  });
  const sync = useMutation({
    mutationFn: () => api<{ synced: number; expired: number }>('/admin/usage/sync', { body: {} }),
    onSuccess: (r) => {
      useUi
        .getState()
        .toast({ kind: 'success', title: `Synced ${r.synced} keys`, body: `${r.expired} expired` });
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => toastError(err),
  });
  return (
    <Page
      title="Player keys"
      sub="Virtual keys issued through the gateway. Secrets are never stored."
      actions={
        <div className="row">
          <select
            className="select"
            style={{ width: 150 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Status filter"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
          <SearchBox value={search} onChange={setSearch} placeholder="Player, email, key id or last 4" />
          <Button loading={sync.isPending} onClick={() => sync.mutate()}>
            Sync usage now
          </Button>
        </div>
      }
    >
      <Table
        q={keys}
        empty="No keys match"
        cols={[
          [
            'Player',
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
            'Key',
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
            'Status',
            (k) => (
              <span
                className={`pill ${k.status === 'active' ? 'pill-success' : k.status === 'suspended' ? 'pill-danger' : ''}`}
              >
                {k.status}
              </span>
            ),
          ],
          [
            'Models',
            (k) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{k.models.join(', ')}</span>
            ),
          ],
          ['Spend / budget', (k) => `${usd(Math.round(k.spendCents))} / ${usd(k.budgetCents)}`, 'num'],
          ['Requests', (k) => num(k.requests), 'num'],
          ['Expires', (k) => new Date(k.expiresAt).toLocaleDateString()],
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
                    {k.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setAction({ kind: 'revoke', key: k })}>
                    Revoke
                  </Button>
                </div>
              ) : null,
          ],
        ]}
      />
      {action?.kind === 'suspend' ? (
        <Modal
          title={`Suspend ${action.key.keyPreview}?`}
          description="The key stops working at the gateway until unsuspended."
          onClose={() => setAction(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setAction(null)}>
                Cancel
              </Button>
              <Button variant="danger" loading={run.isPending} onClick={() => run.mutate()}>
                Suspend key
              </Button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="reason">Reason (visible in audit log)</label>
            <input id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </Modal>
      ) : action ? (
        <ConfirmDialog
          danger={action.kind === 'revoke'}
          title={action.kind === 'revoke' ? 'Revoke this key permanently?' : 'Unsuspend this key?'}
          body={
            action.kind === 'revoke'
              ? `${action.key.displayName}'s key ${action.key.keyPreview} will be deleted from the gateway. This cannot be undone.`
              : 'The key will work again immediately.'
          }
          confirmLabel={action.kind === 'revoke' ? 'Revoke' : 'Unsuspend'}
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
    <Page title="Usage" sub="Gateway spend reconciled into the usage ledger, last 30 days.">
      <Table
        q={usage}
        empty="No gateway usage recorded yet"
        cols={[
          ['Day', (u) => u.day],
          ['Model', (u) => <span style={{ fontFamily: 'var(--font-mono)' }}>{u.model_id}</span>],
          ['Requests', (u) => num(u.requests), 'num'],
          ['Input tokens', (u) => num(u.input_tokens), 'num'],
          ['Output tokens', (u) => num(u.output_tokens), 'num'],
          ['Cost', (u) => `$${u.cost_usd.toFixed(4)}`, 'num'],
        ]}
      />
      <div className="section-title">
        <h3>Recent redemptions</h3>
      </div>
      <Table
        q={redemptions}
        empty="No redemptions yet"
        cols={[
          ['When', (r) => when(r.created_at)],
          ['Player', (r) => r.display_name],
          ['Type', (r) => (r.kind === 'mint' ? 'Coin → AI Credit' : 'AI Credit → key')],
          ['Coin', (r) => (r.source_coin ? num(r.source_coin) : '—'), 'num'],
          ['AI Credit', (r) => usd(r.ai_credit_cents), 'num'],
          ['Quota', (r) => (r.quota_cents ? usd(r.quota_cents) : '—'), 'num'],
          [
            'Status',
            (r) => (
              <span
                className={`pill ${r.status === 'completed' ? 'pill-success' : r.status === 'failed' ? 'pill-danger' : 'pill-warn'}`}
                title={r.failure_reason ?? undefined}
              >
                {r.status}
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
      title="Ledger"
      sub="Every balance change in the game. Balances never change without an entry here."
      actions={
        <div className="row">
          <select
            className="select"
            style={{ width: 140 }}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Currency"
          >
            <option value="">All currencies</option>
            <option value="coin">Coin</option>
            <option value="fame">Fame</option>
            <option value="ai_credit">AI Credit</option>
          </select>
          <input
            className="input"
            style={{ width: 180 }}
            placeholder="Reason (e.g. ai_mint)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Reason"
          />
          <SearchBox value={user} onChange={setUser} placeholder="Player name, email or id" />
        </div>
      }
    >
      <Table
        q={ledger}
        empty="No ledger entries match"
        cols={[
          ['#', (e) => e.id],
          ['When', (e) => when(e.created_at)],
          ['Player', (e) => e.display_name],
          [
            'Reason',
            (e) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{e.reason_type}</span>,
          ],
          ['Currency', (e) => e.currency],
          [
            'Amount',
            (e) => (
              <span className={e.amount >= 0 ? 'pos' : 'neg'}>
                {e.currency === 'ai_credit' ? usd(e.amount) : num(e.amount)}
              </span>
            ),
            'num',
          ],
          [
            'Balance after',
            (e) => (e.currency === 'ai_credit' ? usd(e.balance_after) : num(e.balance_after)),
            'num',
          ],
          [
            'Reference',
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
  const [search, setSearch] = useState('');
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
        }[]
      >(`/admin/players?q=${encodeURIComponent(q)}`),
  });
  const [target, setTarget] = useState<null | { id: string; name: string; status: string }>(null);
  const act = useMutation({
    mutationFn: () =>
      api(`/admin/players/${target!.id}/status`, {
        body: { status: target!.status === 'suspended' ? 'active' : 'suspended' },
      }),
    onSuccess: () => {
      setTarget(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'players'] });
    },
    onError: (err) => toastError(err),
  });
  return (
    <Page
      title="Players"
      actions={<SearchBox value={search} onChange={setSearch} placeholder="Name, email or id" />}
    >
      <Table
        q={players}
        empty="No players match"
        cols={[
          [
            'Player',
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
            'Status',
            (p) => (
              <span className={`pill ${p.status === 'active' ? 'pill-success' : 'pill-danger'}`}>
                {p.status}
              </span>
            ),
          ],
          ['Trust', (p) => p.trust_score, 'num'],
          ['Coin', (p) => num(p.coin), 'num'],
          ['Fame', (p) => num(p.fame), 'num'],
          ['AI Credit', (p) => usd(p.ai_credit_cents), 'num'],
          ['Joined', (p) => new Date(p.created_at).toLocaleDateString()],
          [
            '',
            (p) =>
              p.role === 'admin' ? null : (
                <Button
                  size="sm"
                  variant={p.status === 'active' ? 'danger' : 'secondary'}
                  onClick={() => setTarget({ id: p.id, name: p.display_name, status: p.status })}
                >
                  {p.status === 'active' ? 'Suspend' : 'Reinstate'}
                </Button>
              ),
          ],
        ]}
      />
      {target ? (
        <ConfirmDialog
          danger={target.status === 'active'}
          title={target.status === 'active' ? `Suspend ${target.name}?` : `Reinstate ${target.name}?`}
          body={
            target.status === 'active'
              ? 'They are signed out everywhere and removed from the game immediately. Their keys are not revoked automatically.'
              : 'They will be able to sign in again.'
          }
          confirmLabel={target.status === 'active' ? 'Suspend' : 'Reinstate'}
          loading={act.isPending}
          onConfirm={() => act.mutate()}
          onClose={() => setTarget(null)}
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
  return (
    <Page
      title="Abuse flags"
      sub="Automatic signals. None of them ban on their own; they lower trust and wait for review."
      actions={
        <div className="tabs" role="tablist">
          {(['open', 'confirmed', 'dismissed'] as const).map((s) => (
            <button
              key={s}
              role="tab"
              className="tab"
              aria-selected={status === s}
              onClick={() => setStatus(s)}
              style={{ textTransform: 'capitalize' }}
            >
              {s}
            </button>
          ))}
        </div>
      }
    >
      <Table
        q={flags}
        empty={`No ${status} flags`}
        cols={[
          ['When', (f) => when(f.created_at)],
          [
            'Player',
            (f) => (
              <>
                <div style={{ fontWeight: 600 }}>{f.display_name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  trust {f.trust_score}
                </div>
              </>
            ),
          ],
          ['Signal', (f) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{f.type}</span>],
          [
            'Severity',
            (f) => (
              <span
                className={`pill ${f.severity === 'high' ? 'pill-danger' : f.severity === 'medium' ? 'pill-warn' : ''}`}
              >
                {f.severity}
              </span>
            ),
          ],
          ['Details', (f) => <code style={{ fontSize: 11 }}>{JSON.stringify(f.metadata)}</code>],
          [
            '',
            (f) =>
              status === 'open' ? (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Button size="sm" onClick={() => resolve.mutate({ id: f.id, status: 'dismissed' })}>
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => resolve.mutate({ id: f.id, status: 'confirmed' })}
                  >
                    Confirm
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
    <Page title="Player reports">
      <Table
        q={reports}
        empty="No reports"
        cols={[
          ['When', (r) => when(r.created_at)],
          ['Reported', (r) => <strong>{r.target}</strong>],
          ['By', (r) => r.reporter],
          ['Reason', (r) => r.reason.replace('_', ' ')],
          [
            'Details',
            (r) => (
              <>
                <div>{r.details}</div>
                {r.context.recentChat?.length ? (
                  <div className="muted" style={{ fontSize: 12 }}>
                    Chat: “{r.context.recentChat.map((c) => c.text).join('” “')}”
                  </div>
                ) : null}
              </>
            ),
          ],
          [
            'Status',
            (r) => <span className={`pill ${r.status === 'open' ? 'pill-warn' : ''}`}>{r.status}</span>,
          ],
          [
            '',
            (r) =>
              r.status === 'open' ? (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Button size="sm" onClick={() => update.mutate({ id: r.id, status: 'dismissed' })}>
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => update.mutate({ id: r.id, status: 'reviewed' })}
                  >
                    Mark reviewed
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
    <Page title="Audit log" sub="Every admin change to models, pricing, pools, keys and players.">
      <Table
        q={audit}
        empty="No admin actions yet"
        cols={[
          ['When', (a) => when(a.created_at)],
          ['Admin', (a) => a.admin ?? 'system'],
          ['Action', (a) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.action}</span>],
          [
            'Entity',
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
                View diff
              </Button>
            ),
          ],
        ]}
      />
      {open ? (
        <Modal title={open.action} onClose={() => setOpen(null)} width={820}>
          <div className="form-grid">
            <div>
              <div className="label">Before</div>
              <pre className="code" style={{ maxHeight: 400 }}>
                {JSON.stringify(open.before, null, 2) ?? '—'}
              </pre>
            </div>
            <div>
              <div className="label">After</div>
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
