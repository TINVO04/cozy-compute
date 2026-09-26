import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  Bot,
  Flag,
  Gauge,
  KeyRound,
  Receipt,
  ScrollText,
  Server,
  Settings2,
  Users,
} from 'lucide-react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router';
import { api, num, usd } from '../../lib/api';
import { Brand } from '../Brand';
import { ErrorState, LoadingState } from '../../ui/primitives';
import { ModelsPage } from './Models';
import { PolicyPage } from './Policy';
import { ServerPage } from './Server';
import { AuditPage, FlagsPage, KeysPage, LedgerPage, PlayersPage, ReportsPage, UsagePage } from './Tables';

const NAV = [
  ['', 'Overview', Gauge],
  ['models', 'Models', Bot],
  ['policy', 'Rewards & quotas', Settings2],
  ['keys', 'Player keys', KeyRound],
  ['usage', 'Usage', Activity],
  ['ledger', 'Ledger', Receipt],
  ['players', 'Players', Users],
  ['flags', 'Abuse & reports', Flag],
  ['audit', 'Audit log', ScrollText],
  ['server', 'Server', Server],
] as const;

export default function AdminScreen() {
  const navigate = useNavigate();
  const loc = useLocation();
  const section = loc.pathname.replace(/^\/admin\/?/, '').split('/')[0] ?? '';
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Admin">
        <Brand />
        {NAV.map(([id, label, Icon]) => (
          <button
            key={id}
            className="nav-btn"
            aria-current={section === id}
            onClick={() => navigate(`/admin${id ? '/' + id : ''}`)}
          >
            <Icon size={17} /> {label}
          </button>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <button className="nav-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={17} /> Back to game
          </button>
        </div>
      </nav>
      <main className="admin-main">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="models" element={<ModelsPage />} />
          <Route path="policy" element={<PolicyPage />} />
          <Route path="keys" element={<KeysPage />} />
          <Route path="usage" element={<UsagePage />} />
          <Route path="ledger" element={<LedgerPage />} />
          <Route path="players" element={<PlayersPage />} />
          <Route
            path="flags"
            element={
              <>
                <FlagsPage />
                <div style={{ height: 32 }} />
                <ReportsPage />
              </>
            }
          />
          <Route path="audit" element={<AuditPage />} />
          <Route path="server" element={<ServerPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}

interface OverviewData {
  policy: { redemptionsPaused: boolean; coinPerUsd: number };
  pool: { totalCents: number; usedCents: number; remainingCents: number; resetsAt: string };
  stats: {
    players: number;
    new_today: number;
    active_keys: number;
    open_flags: number;
    open_reports: number;
    coin_issued_today: number;
    coin_burned_today: number;
    spend_cents: number;
  };
  redemptions: { kind: string; status: string; n: number }[];
  online: number;
  gatewayHealthy: boolean;
}

function Overview() {
  const q = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api<OverviewData>('/admin/overview'),
    refetchInterval: 15000,
  });
  const navigate = useNavigate();
  if (q.isPending) return <LoadingState rows={4} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  const red = (kind: string, status: string) =>
    d.redemptions.find((r) => r.kind === kind && r.status === status)?.n ?? 0;
  return (
    <div className="stack-lg">
      <header className="admin-head">
        <div>
          <h1>Overview</h1>
          <p className="muted">Live economy and AI gateway health.</p>
        </div>
        <div className="row">
          <span className={`pill ${d.gatewayHealthy ? 'pill-success' : 'pill-danger'}`}>
            Gateway {d.gatewayHealthy ? 'healthy' : 'unreachable'}
          </span>
          <span className={`pill ${d.policy.redemptionsPaused ? 'pill-danger' : 'pill-success'}`}>
            Redemptions {d.policy.redemptionsPaused ? 'paused' : 'open'}
          </span>
        </div>
      </header>
      <div className="kpis">
        <Kpi
          label="Players online"
          value={num(d.online)}
          sub={`${num(d.stats.players)} total · ${d.stats.new_today} new today`}
        />
        <Kpi
          label="Weekly AI pool"
          value={`${usd(d.pool.remainingCents)} left`}
          sub={`${usd(d.pool.usedCents)} of ${usd(d.pool.totalCents)} minted`}
        />
        <Kpi
          label="Active player keys"
          value={num(d.stats.active_keys)}
          sub={`${usd(Math.round(d.stats.spend_cents))} gateway spend all-time`}
        />
        <Kpi
          label="Needs review"
          value={num(d.stats.open_flags + d.stats.open_reports)}
          sub={`${d.stats.open_flags} flags · ${d.stats.open_reports} reports`}
          onClick={() => navigate('/admin/flags')}
        />
      </div>
      <div className="kpis">
        <Kpi label="Coin issued (24h)" value={num(d.stats.coin_issued_today)} />
        <Kpi label="Coin burned (24h)" value={num(d.stats.coin_burned_today)} />
        <Kpi
          label="Mints (7d)"
          value={num(red('mint', 'completed'))}
          sub={`${red('mint', 'failed')} failed`}
        />
        <Kpi
          label="Keys created (7d)"
          value={num(red('allocate', 'completed'))}
          sub={`${red('allocate', 'failed')} failed & refunded`}
        />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className="card stat"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 24 }}>
        {value}
      </div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}
