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
  return days ? `${days} ngày ${hours} giờ` : hours ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;
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
          <h1>Vận hành máy chủ</h1>
          <p className="muted">
            Tình trạng hoạt động trực tiếp và thông số runtime của các dịch vụ trò chơi.
          </p>
        </div>
        <div className="row">
          <span className={`pill ${d.status === 'healthy' ? 'pill-success' : 'pill-danger'}`}>
            <Activity size={13} />{' '}
            {d.status === 'healthy' ? 'Tất cả hệ thống hoạt động tốt' : 'Đang suy giảm'}
          </span>
          <Button size="sm" variant="ghost" onClick={() => void q.refetch()}>
            <RefreshCw size={14} /> Làm mới
          </Button>
        </div>
      </header>
      <section className="kpis">
        <Kpi
          icon={<Database size={18} />}
          label="PostgreSQL"
          ok={d.services.database}
          detail="Lưu trữ dữ liệu chính"
        />
        <Kpi
          icon={<HardDrive size={18} />}
          label="Redis"
          ok={d.services.redis}
          detail="Trạng thái online, hàng đợi và giới hạn tốc độ"
        />
        <Kpi
          icon={<Gauge size={18} />}
          label="Cổng AI Gateway"
          ok={d.services.gateway}
          detail="Tình trạng LiteLLM"
        />
        <Kpi
          icon={<ServerIcon size={18} />}
          label="Tiến trình API"
          ok
          detail={`PID ${d.process.pid} · chạy ${duration(d.process.uptimeSeconds)}`}
        />
      </section>
      <section className="split" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <article className="card" style={{ padding: 20 }}>
          <div className="section-title">
            <h3>Môi trường thực thi</h3>
            <span className="muted">{d.process.environment}</span>
          </div>
          <dl className="detail-list">
            <Row label="Phiên bản Node" value={d.process.node} mono />
            <Row label="Cổng API" value={String(d.runtime.apiPort)} mono />
            <Row label="Tác vụ nền" value={d.runtime.jobsEnabled ? 'Đang bật' : 'Đã tắt'} />
            <Row label="Kiểm tra lần cuối" value={new Date(d.checkedAt).toLocaleString('vi-VN')} />
          </dl>
        </article>
        <article className="card" style={{ padding: 20 }}>
          <div className="section-title">
            <h3>Cổng truy cập công khai</h3>
            <ExternalLink size={16} />
          </div>
          <dl className="detail-list">
            <Row label="URL gốc AI" value={d.runtime.publicGatewayUrl} mono />
            <Row label="Tên miền CORS được phép" value={d.runtime.corsOrigins.join(', ')} />
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
        {ok ? 'Trực tuyến' : 'Ngoại tuyến'}
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
