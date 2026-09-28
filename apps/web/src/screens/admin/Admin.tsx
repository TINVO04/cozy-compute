import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  Bot,
  Fish,
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
import { FishAdminPage } from './FishAdmin';

const NAV = [
  ['', 'Tổng quan', Gauge],
  ['fish', 'Từ điển cá & Size', Fish],
  ['models', 'Mô hình AI', Bot],
  ['policy', 'Quy tắc & Hạn mức', Settings2],
  ['keys', 'Khóa người chơi', KeyRound],
  ['usage', 'Mức sử dụng', Activity],
  ['ledger', 'Sổ cái GD', Receipt],
  ['players', 'Người chơi', Users],
  ['flags', 'Cảnh báo & Báo cáo', Flag],
  ['audit', 'Nhật ký kiểm toán', ScrollText],
  ['server', 'Máy chủ', Server],
] as const;

export default function AdminScreen() {
  const navigate = useNavigate();
  const loc = useLocation();
  const section = loc.pathname.replace(/^\/admin\/?/, '').split('/')[0] ?? '';
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Quản trị">
        <Brand />
        <div style={{ padding: '0 0 12px', borderBottom: '1px solid var(--line)', marginBottom: 8 }}>
          <button
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              gap: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={16} /> Quay lại Game
          </button>
        </div>
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
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <button
            className="nav-btn"
            style={{ fontWeight: 600, color: 'var(--accent)' }}
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={17} /> Quay lại Game
          </button>
        </div>
      </nav>
      <main className="admin-main">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: 16,
            marginBottom: 20,
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Khu vực Quản trị Hệ thống</span>
            <span>/</span>
            <strong style={{ color: 'var(--ink)' }}>
              {NAV.find(([id]) => id === section)?.[1] ?? 'Trang quản trị'}
            </strong>
          </div>
          <button
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={16} /> Quay lại Game
          </button>
        </div>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="fish" element={<FishAdminPage />} />
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
          <h1>Tổng quan</h1>
          <p className="muted">Trạng thái kinh tế thời gian thực và cổng kết nối AI.</p>
        </div>
        <div className="row">
          <span className={`pill ${d.gatewayHealthy ? 'pill-success' : 'pill-danger'}`}>
            Cổng AI: {d.gatewayHealthy ? 'Hoạt động tốt' : 'Mất kết nối'}
          </span>
          <span className={`pill ${d.policy.redemptionsPaused ? 'pill-danger' : 'pill-success'}`}>
            Đổi thưởng: {d.policy.redemptionsPaused ? 'Tạm dừng' : 'Đang mở'}
          </span>
        </div>
      </header>
      <div className="kpis">
        <Kpi
          label="Người chơi trực tuyến"
          value={num(d.online)}
          sub={`${num(d.stats.players)} tổng cộng · ${d.stats.new_today} mới hôm nay`}
        />
        <Kpi
          label="Quỹ AI tuần"
          value={`${usd(d.pool.remainingCents)} còn lại`}
          sub={`Đã đổi ${usd(d.pool.usedCents)} / ${usd(d.pool.totalCents)}`}
        />
        <Kpi
          label="Khóa đang hoạt động"
          value={num(d.stats.active_keys)}
          sub={`Tổng chi phí gateway: ${usd(Math.round(d.stats.spend_cents))}`}
        />
        <Kpi
          label="Cần xét duyệt"
          value={num(d.stats.open_flags + d.stats.open_reports)}
          sub={`${d.stats.open_flags} cảnh báo · ${d.stats.open_reports} báo cáo`}
          onClick={() => navigate('/admin/flags')}
        />
      </div>
      <div className="kpis">
        <Kpi label="Xu phát hành (24h)" value={num(d.stats.coin_issued_today)} />
        <Kpi label="Xu tiêu thụ (24h)" value={num(d.stats.coin_burned_today)} />
        <Kpi
          label="Lượt đổi thưởng (7 ngày)"
          value={num(red('mint', 'completed'))}
          sub={`${red('mint', 'failed')} thất bại`}
        />
        <Kpi
          label="Khóa đã tạo (7 ngày)"
          value={num(red('allocate', 'completed'))}
          sub={`${red('allocate', 'failed')} lỗi & đã hoàn tiền`}
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
