import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarPlus,
  Coins,
  Gift,
  Info,
  Key,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useUi } from '../../lib/store';
import { Button, ConfirmDialog, ErrorState, LoadingState, Switch, toastError } from '../../ui/primitives';

type AiPolicy = {
  redemptionsPaused: boolean;
  coinPerUsd: number;
  weeklyPoolCents: number;
  rolloverEnabled: boolean;
  perUserMonthlyCapCents: number;
  minMintCents: number;
  maxMintCents: number;
  maxActiveKeys: number;
  keyTtlDays: number;
  minKeyBudgetCents: number;
  minAccountAgeHours: number;
  requireOnboarding: boolean;
  minUniqueActivities: number;
  minFame: number;
  minTrustScore: number;
  cooldownHours: number;
  keySharingIpThreshold: number;
  [key: string]: number | boolean;
};

interface Settings {
  ai_policy: AiPolicy;
  event_schedule: Record<string, number | boolean>;
}

interface ActivityRow {
  slug: string;
  enabled: boolean;
  config: Record<string, number | number[]>;
}

export function PolicyPage() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api<Settings>('/admin/settings'),
  });
  const activities = useQuery({
    queryKey: ['admin', 'activities'],
    queryFn: () => api<ActivityRow[]>('/admin/activities'),
  });
  const [policy, setPolicy] = useState<AiPolicy | null>(null);
  const [schedule, setSchedule] = useState<Settings['event_schedule'] | null>(null);
  const [confirmPause, setConfirmPause] = useState(false);

  useEffect(() => {
    if (settings.data) {
      setPolicy(settings.data.ai_policy);
      setSchedule(settings.data.event_schedule);
    }
  }, [settings.data]);

  const savePolicy = useMutation({
    mutationFn: (p: AiPolicy) => api('/admin/settings/ai_policy', { method: 'PUT', body: p }),
    onSuccess: () => {
      useUi.getState().toast({
        kind: 'success',
        title: 'Đã lưu quy tắc đổi thưởng',
        body: 'Các thiết lập mới đã áp dụng ngay vào game.',
      });
      setConfirmPause(false);
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => toastError(err, 'Không thể lưu chính sách'),
  });

  const saveSchedule = useMutation({
    mutationFn: (p: Settings['event_schedule']) =>
      api('/admin/settings/event_schedule', { method: 'PUT', body: p }),
    onSuccess: () => {
      useUi.getState().toast({ kind: 'success', title: 'Đã lưu lịch sự kiện' });
      void qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (err) => toastError(err, 'Không thể lưu lịch'),
  });

  const scheduleNow = useMutation({
    mutationFn: () => api<{ startsAt: string }>('/admin/events/schedule', { body: { startInSeconds: 60 } }),
    onSuccess: (r) =>
      useUi.getState().toast({
        kind: 'success',
        title: 'Đã lên lịch sự kiện',
        body: `Bắt đầu lúc ${new Date(r.startsAt).toLocaleTimeString('vi-VN')}`,
      }),
    onError: (err) => toastError(err),
  });

  if (settings.isPending || !policy || !schedule) return <LoadingState rows={4} />;
  if (settings.isError) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;

  const paused = Boolean(settings.data.ai_policy.redemptionsPaused);
  const dirty = JSON.stringify(policy) !== JSON.stringify(settings.data.ai_policy);
  const coinRate = Number(policy.coinPerUsd) || 12000;

  const centsToUsd = (c: number) => `$${(c / 100).toFixed(2)} USD`;
  const centsToCoins = (c: number) => Math.round((c / 100) * coinRate).toLocaleString('vi-VN');

  return (
    <div className="stack-lg">
      <header className="admin-head">
        <div>
          <h1>Quy tắc & Hạn mức Đổi thưởng AI</h1>
          <p className="muted">
            Trong game, người chơi cày <strong>Xu</strong> qua các hoạt động để đổi lấy phần thưởng hạn mức
            AI. Tại đây bạn cấu hình tỷ giá quy đổi, quỹ thưởng tuần của server và các điều kiện nhận thưởng.
          </p>
        </div>
      </header>

      {/* Thông báo bối cảnh New-API */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          background: 'var(--surface-2)',
          borderLeft: '4px solid var(--accent)',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <Info size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <strong>Lưu ý về cơ chế vận hành:</strong> Dự án game này chỉ quản lý tính năng{' '}
          <strong>đổi thưởng Xu lấy hạn mức API</strong> cho người chơi. Mọi việc trừ tiền token, bảng giá
          model, RPM/TPM và phân phối kênh đều do hệ thống <strong>New-API</strong> bên ngoài của bạn tự động
          đảm nhận.
        </div>
      </div>

      {/* Tạm dừng khẩn cấp */}
      <section
        className={`card ${paused ? '' : 'danger-zone'}`}
        style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}
      >
        {paused ? (
          <PauseCircle size={32} color="var(--danger)" />
        ) : (
          <PlayCircle size={32} color="var(--success)" />
        )}
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 16 }}>
            Hệ thống đổi thưởng đang {paused ? 'TẠM DỪNG' : 'HOẠT ĐỘNG'}
          </strong>
          <div className="muted" style={{ fontSize: 13 }}>
            {paused
              ? 'Người chơi trong game hiện không thể dùng Xu để đổi AI Credit hoặc tạo khóa mới. Các khóa đã cấp trước đó vẫn hoạt động.'
              : 'Người chơi có thể tích lũy Xu và đổi thưởng bình thường. Bấm nút bên cạnh nếu cần dừng khẩn cấp.'}
          </div>
        </div>
        <Button variant={paused ? 'primary' : 'danger'} onClick={() => setConfirmPause(true)}>
          {paused ? 'Mở lại đổi thưởng' : 'Tạm dừng tất cả đổi thưởng'}
        </Button>
      </section>

      {/* Nhóm 1: Tỷ giá quy đổi & Ngân sách thưởng */}
      <section className="card" style={{ padding: 20 }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Coins size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h3 style={{ margin: 0 }}>1. Tỷ giá quy đổi & Quỹ thưởng tuần</h3>
            <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>
              Quy định người chơi cần cày bao nhiêu Xu để đổi $1.00 USD AI, và giới hạn chi phí tối đa của cả
              server mỗi tuần.
            </p>
          </div>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 16 }}>
          <div className="field">
            <label htmlFor="p-coinPerUsd">Tỷ giá Xu đổi lấy $1.00 USD AI Credit</label>
            <input
              id="p-coinPerUsd"
              className="input"
              type="number"
              min={1}
              value={Number(policy.coinPerUsd)}
              onChange={(e) => setPolicy({ ...policy, coinPerUsd: Number(e.target.value) })}
            />
            <span className="field-hint">
              Số Xu cày trong game để đổi được $1.00 USD. Vd: <code>12000</code> nghĩa là 12,000 Xu = $1.00
              USD API.
            </span>
          </div>

          <div className="field">
            <label htmlFor="p-weeklyPoolCents">
              Tổng quỹ thưởng tuần của cả Server ({centsToUsd(Number(policy.weeklyPoolCents))})
            </label>
            <input
              id="p-weeklyPoolCents"
              className="input"
              type="number"
              min={0}
              value={Number(policy.weeklyPoolCents)}
              onChange={(e) => setPolicy({ ...policy, weeklyPoolCents: Number(e.target.value) })}
            />
            <span className="field-hint">
              Tính bằng cent (100 cent = $1 USD). Vd: <code>50000</code> = $500.00 USD/tuần. Giúp admin không
              bị thâm hụt ví New-API.
            </span>
          </div>

          <div className="field">
            <label htmlFor="p-perUserMonthlyCapCents">
              Hạn mức tối đa 1 người chơi / tháng ({centsToUsd(Number(policy.perUserMonthlyCapCents))})
            </label>
            <input
              id="p-perUserMonthlyCapCents"
              className="input"
              type="number"
              min={0}
              value={Number(policy.perUserMonthlyCapCents)}
              onChange={(e) => setPolicy({ ...policy, perUserMonthlyCapCents: Number(e.target.value) })}
            />
            <span className="field-hint">
              Giới hạn tối đa 1 tài khoản được đổi mỗi tháng (vd: <code>500</code> = $5.00 USD, tương đương ~
              {centsToCoins(Number(policy.perUserMonthlyCapCents))} Xu). Tránh 1 người cày hết sạch quỹ của cả
              làng.
            </span>
          </div>

          <div className="field" style={{ alignContent: 'center', paddingTop: 10 }}>
            <Switch
              checked={Boolean(policy.rolloverEnabled)}
              onChange={(v) => setPolicy({ ...policy, rolloverEnabled: v })}
              label="Cộng dồn quỹ thừa sang tuần sau nếu tuần này chưa dùng hết"
            />
          </div>
        </div>
      </section>

      {/* Nhóm 2: Hạn mức cho mỗi lần đổi */}
      <section className="card" style={{ padding: 20 }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Gift size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h3 style={{ margin: 0 }}>2. Hạn mức mỗi lần bấm Đổi thưởng</h3>
            <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>
              Quy định số tiền đổi tối thiểu, tối đa trong một lần giao dịch và thời gian giãn cách giữa các
              lần đổi.
            </p>
          </div>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 16 }}>
          <div className="field">
            <label htmlFor="p-minMintCents">
              Mức đổi tối thiểu 1 lần ({centsToUsd(Number(policy.minMintCents))})
            </label>
            <input
              id="p-minMintCents"
              className="input"
              type="number"
              min={1}
              value={Number(policy.minMintCents)}
              onChange={(e) => setPolicy({ ...policy, minMintCents: Number(e.target.value) })}
            />
            <span className="field-hint">
              Tính bằng cent. Vd: <code>25</code> = $0.25 USD (~{centsToCoins(Number(policy.minMintCents))}{' '}
              Xu).
            </span>
          </div>

          <div className="field">
            <label htmlFor="p-maxMintCents">
              Mức đổi tối đa 1 lần ({centsToUsd(Number(policy.maxMintCents))})
            </label>
            <input
              id="p-maxMintCents"
              className="input"
              type="number"
              min={1}
              value={Number(policy.maxMintCents)}
              onChange={(e) => setPolicy({ ...policy, maxMintCents: Number(e.target.value) })}
            />
            <span className="field-hint">
              Tính bằng cent. Vd: <code>500</code> = $5.00 USD (~{centsToCoins(Number(policy.maxMintCents))}{' '}
              Xu).
            </span>
          </div>

          <div className="field">
            <label htmlFor="p-cooldownHours">Thời gian chờ giữa 2 lần đổi (giờ)</label>
            <input
              id="p-cooldownHours"
              className="input"
              type="number"
              min={0}
              value={Number(policy.cooldownHours)}
              onChange={(e) => setPolicy({ ...policy, cooldownHours: Number(e.target.value) })}
            />
            <span className="field-hint">
              Sau khi đổi xong, người chơi phải chờ bấy nhiêu giờ mới được đổi tiếp (vd: <code>12</code> hoặc{' '}
              <code>24</code> giờ).
            </span>
          </div>
        </div>
      </section>

      {/* Nhóm 3: Điều kiện nhận thưởng (Chống Bot & Clone) */}
      <section className="card" style={{ padding: 20 }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h3 style={{ margin: 0 }}>3. Điều kiện nhận thưởng (Chống Bot & Tạo tài khoản rác)</h3>
            <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>
              Đảm bảo chỉ người chơi thực sự tham gia các hoạt động trong game mới được nhận key AI.
            </p>
          </div>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 16 }}>
          <div className="field">
            <label htmlFor="p-minAccountAgeHours">Tuổi tài khoản tối thiểu (giờ)</label>
            <input
              id="p-minAccountAgeHours"
              className="input"
              type="number"
              min={0}
              value={Number(policy.minAccountAgeHours)}
              onChange={(e) => setPolicy({ ...policy, minAccountAgeHours: Number(e.target.value) })}
            />
            <span className="field-hint">
              Tài khoản phải tạo đủ thời gian mới được đổi thưởng (vd: <code>24</code> giờ) để chặn clone tạo
              xong đổi ngay.
            </span>
          </div>

          <div className="field">
            <label htmlFor="p-minUniqueActivities">Số hoạt động minigame đã tham gia</label>
            <input
              id="p-minUniqueActivities"
              className="input"
              type="number"
              min={0}
              value={Number(policy.minUniqueActivities)}
              onChange={(e) => setPolicy({ ...policy, minUniqueActivities: Number(e.target.value) })}
            />
            <span className="field-hint">
              Người chơi phải chơi ít nhất N hoạt động (câu cá, giao hàng, làm cafe, đố vui...) để chứng minh
              là người thật.
            </span>
          </div>

          <div className="field">
            <label htmlFor="p-minFame">Điểm danh tiếng tối thiểu (Fame)</label>
            <input
              id="p-minFame"
              className="input"
              type="number"
              min={0}
              value={Number(policy.minFame)}
              onChange={(e) => setPolicy({ ...policy, minFame: Number(e.target.value) })}
            />
            <span className="field-hint">
              Điểm danh tiếng tích lũy từ các sự kiện trong thị trấn (mặc định: <code>50</code>).
            </span>
          </div>

          <div className="field">
            <label htmlFor="p-minTrustScore">Điểm tin cậy tối thiểu (Trust Score 0 - 100)</label>
            <input
              id="p-minTrustScore"
              className="input"
              type="number"
              min={0}
              max={100}
              value={Number(policy.minTrustScore)}
              onChange={(e) => setPolicy({ ...policy, minTrustScore: Number(e.target.value) })}
            />
            <span className="field-hint">
              Hệ thống chống hack tốc độ và chống báo cáo. Người chơi gian lận bị trừ điểm và không thể đổi
              thưởng (vd: <code>50</code>).
            </span>
          </div>

          <div className="field full" style={{ paddingTop: 6 }}>
            <Switch
              checked={Boolean(policy.requireOnboarding)}
              onChange={(v) => setPolicy({ ...policy, requireOnboarding: v })}
              label="Bắt buộc người chơi phải hoàn thành chuỗi nhiệm vụ tân thủ trước khi mở khóa đổi thưởng"
            />
          </div>
        </div>
      </section>

      {/* Nhóm 4: Quy định về Key cấp cho người chơi */}
      <section className="card" style={{ padding: 20 }}>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Key size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h3 style={{ margin: 0 }}>4. Quy định về Khóa (API Key) cấp cho người chơi</h3>
            <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>
              Quy định số lượng khóa, hạn sử dụng và chống chia sẻ/bán lại key ra bên ngoài.
            </p>
          </div>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 16 }}>
          <div className="field">
            <label htmlFor="p-maxActiveKeys">Số khóa hoạt động tối đa mỗi người chơi</label>
            <input
              id="p-maxActiveKeys"
              className="input"
              type="number"
              min={1}
              max={20}
              value={Number(policy.maxActiveKeys)}
              onChange={(e) => setPolicy({ ...policy, maxActiveKeys: Number(e.target.value) })}
            />
            <span className="field-hint">
              Mỗi người chơi chỉ được tạo cùng lúc tối đa bao nhiêu khóa (mặc định: <code>2</code> khóa).
            </span>
          </div>

          <div className="field">
            <label htmlFor="p-keyTtlDays">Thời hạn hiệu lực của khóa (ngày)</label>
            <input
              id="p-keyTtlDays"
              className="input"
              type="number"
              min={1}
              max={365}
              value={Number(policy.keyTtlDays)}
              onChange={(e) => setPolicy({ ...policy, keyTtlDays: Number(e.target.value) })}
            />
            <span className="field-hint">
              Sau số ngày này khóa tự động hết hạn và thu hồi (vd: <code>30</code> ngày). Người chơi cần cày
              tiếp để tạo khóa mới.
            </span>
          </div>

          <div className="field">
            <label htmlFor="p-minKeyBudgetCents">
              Hạn mức nạp tối thiểu khi tạo khóa ({centsToUsd(Number(policy.minKeyBudgetCents))})
            </label>
            <input
              id="p-minKeyBudgetCents"
              className="input"
              type="number"
              min={1}
              value={Number(policy.minKeyBudgetCents)}
              onChange={(e) => setPolicy({ ...policy, minKeyBudgetCents: Number(e.target.value) })}
            />
            <span className="field-hint">
              Số tiền tối thiểu nạp vào một khóa mới khi người chơi bấm tạo (vd: <code>25</code> cent = $0.25
              USD).
            </span>
          </div>

          <div className="field">
            <label htmlFor="p-keySharingIpThreshold">Cảnh báo chia sẻ IP (Số IP khác nhau / ngày)</label>
            <input
              id="p-keySharingIpThreshold"
              className="input"
              type="number"
              min={1}
              value={Number(policy.keySharingIpThreshold)}
              onChange={(e) => setPolicy({ ...policy, keySharingIpThreshold: Number(e.target.value) })}
            />
            <span className="field-hint">
              Nếu 1 khóa bị dùng từ quá N địa chỉ IP khác nhau trong ngày (vd: <code>8</code> IP), hệ thống sẽ
              tạm dừng khóa để chống bán key ra ngoài.
            </span>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 24, gap: 12 }}>
          <Button variant="ghost" disabled={!dirty} onClick={() => setPolicy(settings.data.ai_policy)}>
            Khôi phục mặc định
          </Button>
          <Button
            variant="primary"
            disabled={!dirty}
            loading={savePolicy.isPending}
            onClick={() => savePolicy.mutate({ ...policy, redemptionsPaused: paused })}
          >
            Lưu thay đổi chính sách đổi thưởng
          </Button>
        </div>
      </section>

      {/* Sự kiện thị trấn */}
      <section className="card" style={{ padding: 20 }}>
        <div className="section-title">
          <h3>Sự kiện thị trấn định kỳ</h3>
          <Button size="sm" loading={scheduleNow.isPending} onClick={() => scheduleNow.mutate()}>
            <CalendarPlus size={14} /> Bắt đầu sự kiện sau 60s
          </Button>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {(
            [
              ['intervalMinutes', 'Thời gian giữa các sự kiện (phút)'],
              ['lobbyMinutes', 'Thời gian phòng chờ (phút)'],
              ['durationSeconds', 'Thời lượng sự kiện (giây)'],
              ['duckCount', 'Số lượng vịt mỗi sự kiện'],
              ['minPlayers', 'Số người chơi tối thiểu'],
              ['maxPlayers', 'Số người chơi tối đa'],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="field">
              <label htmlFor={`e-${k}`}>{label}</label>
              <input
                id={`e-${k}`}
                className="input"
                type="number"
                value={Number(schedule[k])}
                onChange={(e) => setSchedule({ ...schedule, [k]: Number(e.target.value) })}
              />
            </div>
          ))}
          <div className="field" style={{ alignContent: 'end' }}>
            <Switch
              checked={Boolean(schedule.autoSchedule)}
              onChange={(v) => setSchedule({ ...schedule, autoSchedule: v })}
              label="Tự động lên lịch sự kiện"
            />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <Button
            variant="primary"
            loading={saveSchedule.isPending}
            onClick={() => saveSchedule.mutate(schedule)}
          >
            Lưu lịch sự kiện
          </Button>
        </div>
      </section>

      {/* Phần thưởng từng hoạt động cày xu */}
      <section>
        <div className="section-title">
          <h3>Cấu hình Xu thưởng cho từng Minigame</h3>
        </div>
        {activities.isPending ? (
          <LoadingState rows={2} />
        ) : activities.isError ? (
          <ErrorState error={activities.error} />
        ) : (
          activities.data.map((a) => <ActivityEditor key={a.slug} row={a} />)
        )}
      </section>

      {confirmPause ? (
        <ConfirmDialog
          danger={!paused}
          title={paused ? 'Mở lại hệ thống đổi thưởng AI?' : 'Tạm dừng tất cả đổi thưởng AI?'}
          body={
            paused ? (
              'Người chơi sẽ có thể dùng Xu đổi AI Credit và tạo khóa trở lại.'
            ) : (
              <span className="row" style={{ alignItems: 'flex-start' }}>
                <AlertTriangle size={16} /> Người chơi sẽ ngay lập tức không thể đổi Xu lấy AI Credit hoặc tạo
                khóa. Các khóa hiện tại vẫn hoạt động bình thường.
              </span>
            )
          }
          confirmLabel={paused ? 'Mở lại' : 'Tạm dừng đổi thưởng'}
          loading={savePolicy.isPending}
          onConfirm={() => savePolicy.mutate({ ...settings.data.ai_policy, redemptionsPaused: !paused })}
          onClose={() => setConfirmPause(false)}
        />
      ) : null}
    </div>
  );
}

function ActivityEditor({ row }: { row: ActivityRow }) {
  const qc = useQueryClient();
  const [cfg, setCfg] = useState(row.config);
  const [enabled, setEnabled] = useState(row.enabled);
  const save = useMutation({
    mutationFn: () => api(`/admin/activities/${row.slug}`, { method: 'PUT', body: { enabled, config: cfg } }),
    onSuccess: () => {
      useUi.getState().toast({ kind: 'success', title: `Đã cập nhật ${row.slug}` });
      void qc.invalidateQueries({ queryKey: ['admin', 'activities'] });
    },
    onError: (err) => toastError(err, 'Không thể lưu'),
  });
  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <strong style={{ fontFamily: 'var(--font-mono)' }}>{row.slug}</strong>
        <div className="row">
          <Switch checked={enabled} onChange={setEnabled} label="Kích hoạt" />
          <Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            Lưu
          </Button>
        </div>
      </div>
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {Object.entries(cfg).map(([k, v]) => (
          <div key={k} className="field">
            <label htmlFor={`${row.slug}-${k}`}>{k}</label>
            <input
              id={`${row.slug}-${k}`}
              className="input"
              value={Array.isArray(v) ? v.join(', ') : String(v)}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  [k]: Array.isArray(v)
                    ? e.target.value.split(',').map((s) => Number(s.trim()) || 0)
                    : Number(e.target.value),
                })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
