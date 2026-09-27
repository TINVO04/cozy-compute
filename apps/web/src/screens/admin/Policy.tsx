import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarPlus, PauseCircle, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useUi } from '../../lib/store';
import { Button, ConfirmDialog, ErrorState, LoadingState, Switch, toastError } from '../../ui/primitives';

type AiPolicy = Record<string, number | boolean>;
interface Settings {
  ai_policy: AiPolicy;
  event_schedule: Record<string, number | boolean>;
}
interface ActivityRow {
  slug: string;
  enabled: boolean;
  config: Record<string, number | number[]>;
}

const AI_FIELDS: [string, string, string?][] = [
  ['coinPerUsd', 'Xu đổi lấy $1 AI Credit', 'Tỷ giá quy đổi Xu → AI Credit.'],
  ['weeklyPoolCents', 'Quỹ thưởng tuần (cent)', 'Tổng AI Credit tối đa được tạo mỗi tuần (UTC).'],
  ['perUserMonthlyCapCents', 'Hạn mức tháng mỗi người chơi (cent)'],
  ['minMintCents', 'Mức đổi tối thiểu (cent)'],
  ['maxMintCents', 'Mức đổi tối đa một lần (cent)'],
  ['maxActiveKeys', 'Số khóa hoạt động tối đa mỗi người'],
  ['keyTtlDays', 'Thời hạn khóa (ngày)'],
  ['minKeyBudgetCents', 'Ngân sách khóa tối thiểu (cent)'],
  ['minAccountAgeHours', 'Điều kiện: Tuổi tài khoản (giờ)'],
  ['minUniqueActivities', 'Điều kiện: Hoạt động khác nhau đã tham gia'],
  ['minFame', 'Điều kiện: Danh tiếng'],
  ['minTrustScore', 'Điều kiện: Điểm tin cậy (0–100)'],
  ['cooldownHours', 'Thời gian chờ giữa các lần đổi (giờ)'],
  ['keySharingIpThreshold', 'Tự động tạm khóa nếu vượt quá N IP khác nhau/ngày'],
];

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
        title: 'Đã lưu chính sách phần thưởng',
        body: 'Đã ghi lại vào nhật ký kiểm toán.',
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

  return (
    <div className="stack-lg">
      <header className="admin-head">
        <div>
          <h1>Phần thưởng & Hạn mức</h1>
          <p className="muted">
            Mọi thay đổi tại đây áp dụng ngay lập tức và được ghi vào nhật ký kiểm toán.
          </p>
        </div>
      </header>

      <section
        className={`card ${paused ? '' : 'danger-zone'}`}
        style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}
      >
        {paused ? (
          <PauseCircle size={28} color="var(--danger)" />
        ) : (
          <PlayCircle size={28} color="var(--success)" />
        )}
        <div style={{ flex: 1 }}>
          <strong>Hệ thống đổi thưởng đang {paused ? 'tạm dừng' : 'mở'}</strong>
          <div className="muted" style={{ fontSize: 13 }}>
            {paused
              ? 'Người chơi không thể đúc AI Credit, tạo hoặc xoay khóa. Các khóa hiện tại vẫn hoạt động.'
              : 'Dừng khẩn cấp toàn bộ hoạt động đổi thưởng AI mới.'}
          </div>
        </div>
        <Button variant={paused ? 'primary' : 'danger'} onClick={() => setConfirmPause(true)}>
          {paused ? 'Mở lại đổi thưởng' : 'Tạm dừng tất cả đổi thưởng'}
        </Button>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <div className="section-title">
          <h3>Chính sách thưởng AI</h3>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={Boolean(policy.rolloverEnabled)}
              onChange={(e) => setPolicy({ ...policy, rolloverEnabled: e.target.checked })}
            />
            Chuyển quỹ chưa dùng sang tuần sau
          </label>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {AI_FIELDS.map(([k, label, hint]) => (
            <div key={k} className="field">
              <label htmlFor={`p-${k}`}>{label}</label>
              <input
                id={`p-${k}`}
                className="input"
                type="number"
                min={0}
                value={Number(policy[k])}
                onChange={(e) => setPolicy({ ...policy, [k]: Number(e.target.value) })}
              />
              {hint ? <span className="field-hint">{hint}</span> : null}
            </div>
          ))}
          <div className="field" style={{ alignContent: 'end' }}>
            <Switch
              checked={Boolean(policy.requireOnboarding)}
              onChange={(v) => setPolicy({ ...policy, requireOnboarding: v })}
              label="Yêu cầu hoàn thành danh sách tân thủ"
            />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" disabled={!dirty} onClick={() => setPolicy(settings.data.ai_policy)}>
            Khôi phục
          </Button>
          <Button
            variant="primary"
            disabled={!dirty}
            loading={savePolicy.isPending}
            onClick={() => savePolicy.mutate({ ...policy, redemptionsPaused: paused })}
          >
            Lưu chính sách
          </Button>
        </div>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <div className="section-title">
          <h3>Sự kiện</h3>
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

      <section>
        <div className="section-title">
          <h3>Phần thưởng hoạt động</h3>
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
              'Người chơi sẽ có thể đúc AI Credit và tạo khóa trở lại.'
            ) : (
              <span className="row" style={{ alignItems: 'flex-start' }}>
                <AlertTriangle size={16} /> Người chơi sẽ ngay lập tức không thể đúc AI Credit hoặc tạo/xoay
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
