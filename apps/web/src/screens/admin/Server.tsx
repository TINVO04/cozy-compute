import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Database,
  ExternalLink,
  Gauge,
  HardDrive,
  RefreshCw,
  Server as ServerIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Button, ErrorState, LoadingState } from '../../ui/primitives';

interface ServerStatus {
  status: 'healthy' | 'degraded';
  checkedAt: string;
  process: { pid: number; node: string; uptimeSeconds: number; environment: string };
  services: { database: boolean; redis: boolean; gateway: boolean };
  runtime: { apiPort: number; jobsEnabled: boolean; publicGatewayUrl: string; corsOrigins: string[] };
}

const duration = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export function ServerPage() {
  const q = useQuery({
    queryKey: ['admin', 'server'],
    queryFn: () => api<ServerStatus>('/admin/server'),
    refetchInterval: 10000,
  });
  if (q.isPending) return <LoadingState rows={5} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  return (
    <div className="stack-lg">
      <header className="admin-head">
        <div>
          <h1>Server operations</h1>
          <p className="muted">Live health and runtime details for the game services.</p>
        </div>
        <div className="row">
          <span className={`pill ${d.status === 'healthy' ? 'pill-success' : 'pill-danger'}`}>
            <Activity size={13} /> {d.status === 'healthy' ? 'All systems healthy' : 'Degraded'}
          </span>
          <Button size="sm" variant="ghost" onClick={() => void q.refetch()}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </header>
      <section className="kpis">
        <Kpi
          icon={<Database size={18} />}
          label="PostgreSQL"
          ok={d.services.database}
          detail="Primary persistence"
        />
        <Kpi
          icon={<HardDrive size={18} />}
          label="Redis"
          ok={d.services.redis}
          detail="Presence, jobs and rate limits"
        />
        <Kpi icon={<Gauge size={18} />} label="AI gateway" ok={d.services.gateway} detail="LiteLLM health" />
        <Kpi
          icon={<ServerIcon size={18} />}
          label="API process"
          ok
          detail={`PID ${d.process.pid} · up ${duration(d.process.uptimeSeconds)}`}
        />
      </section>
      <section className="split" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <article className="card" style={{ padding: 20 }}>
          <div className="section-title">
            <h3>Runtime</h3>
            <span className="muted">{d.process.environment}</span>
          </div>
          <dl className="detail-list">
            <Row label="Node" value={d.process.node} mono />
            <Row label="API port" value={String(d.runtime.apiPort)} mono />
            <Row label="Background jobs" value={d.runtime.jobsEnabled ? 'Enabled' : 'Disabled'} />
            <Row label="Last check" value={new Date(d.checkedAt).toLocaleString()} />
          </dl>
        </article>
        <article className="card" style={{ padding: 20 }}>
          <div className="section-title">
            <h3>Public endpoints</h3>
            <ExternalLink size={16} />
          </div>
          <dl className="detail-list">
            <Row label="AI base URL" value={d.runtime.publicGatewayUrl} mono />
            <Row label="Allowed origins" value={d.runtime.corsOrigins.join(', ')} />
          </dl>
        </article>
      </section>
    </div>
  );
}

function Kpi({
  icon,
  label,
  ok,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="card stat">
      <div className="row">
        <span className={ok ? 'status-dot online' : 'status-dot'} />
        {icon}
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value" style={{ fontSize: 18 }}>
        {ok ? 'Online' : 'Offline'}
      </div>
      <div className="stat-sub">{detail}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd style={mono ? { fontFamily: 'var(--font-mono)', fontSize: 12 } : undefined}>{value}</dd>
    </div>
  );
}
