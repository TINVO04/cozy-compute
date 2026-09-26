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
  ['coinPerUsd', 'Coin per $1 of AI Credit', 'Exchange rate for Coin → AI Credit.'],
  ['weeklyPoolCents', 'Weekly reward pool (cents)', 'Total AI Credit that can be minted per UTC week.'],
  ['perUserMonthlyCapCents', 'Per-player monthly cap (cents)'],
  ['minMintCents', 'Minimum redemption (cents)'],
  ['maxMintCents', 'Maximum single redemption (cents)'],
  ['maxActiveKeys', 'Max active keys per player'],
  ['keyTtlDays', 'Key lifetime (days)'],
  ['minKeyBudgetCents', 'Minimum key budget (cents)'],
  ['minAccountAgeHours', 'Eligibility: account age (hours)'],
  ['minUniqueActivities', 'Eligibility: distinct activities'],
  ['minFame', 'Eligibility: Fame'],
  ['minTrustScore', 'Eligibility: trust score (0–100)'],
  ['cooldownHours', 'Cooldown between redemptions (hours)'],
  ['keySharingIpThreshold', 'Auto-suspend key after N distinct IPs/day'],
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
      useUi
        .getState()
        .toast({ kind: 'success', title: 'Reward policy saved', body: 'Recorded in the audit log.' });
      setConfirmPause(false);
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => toastError(err, 'Could not save'),
  });
  const saveSchedule = useMutation({
    mutationFn: (p: Settings['event_schedule']) =>
      api('/admin/settings/event_schedule', { method: 'PUT', body: p }),
    onSuccess: () => {
      useUi.getState().toast({ kind: 'success', title: 'Event schedule saved' });
      void qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (err) => toastError(err, 'Could not save'),
  });
  const scheduleNow = useMutation({
    mutationFn: () => api<{ startsAt: string }>('/admin/events/schedule', { body: { startInSeconds: 60 } }),
    onSuccess: (r) =>
      useUi.getState().toast({
        kind: 'success',
        title: 'Event scheduled',
        body: `Starts at ${new Date(r.startsAt).toLocaleTimeString()}`,
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
          <h1>Rewards & quotas</h1>
          <p className="muted">Every change here applies immediately and is written to the audit log.</p>
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
          <strong>Redemptions are {paused ? 'paused' : 'open'}</strong>
          <div className="muted" style={{ fontSize: 13 }}>
            {paused
              ? 'Players cannot mint AI Credit, create or rotate keys. Existing keys keep working.'
              : 'Emergency stop for all new AI redemptions.'}
          </div>
        </div>
        <Button variant={paused ? 'primary' : 'danger'} onClick={() => setConfirmPause(true)}>
          {paused ? 'Resume redemptions' : 'Pause all redemptions'}
        </Button>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <div className="section-title">
          <h3>AI reward policy</h3>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={Boolean(policy.rolloverEnabled)}
              onChange={(e) => setPolicy({ ...policy, rolloverEnabled: e.target.checked })}
            />
            Roll unused pool into next week
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
              label="Require newcomer checklist"
            />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" disabled={!dirty} onClick={() => setPolicy(settings.data.ai_policy)}>
            Reset
          </Button>
          <Button
            variant="primary"
            disabled={!dirty}
            loading={savePolicy.isPending}
            onClick={() => savePolicy.mutate({ ...policy, redemptionsPaused: paused })}
          >
            Save policy
          </Button>
        </div>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <div className="section-title">
          <h3>Events</h3>
          <Button size="sm" loading={scheduleNow.isPending} onClick={() => scheduleNow.mutate()}>
            <CalendarPlus size={14} /> Start an event in 60s
          </Button>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {(
            [
              ['intervalMinutes', 'Minutes between events'],
              ['lobbyMinutes', 'Lobby length (minutes)'],
              ['durationSeconds', 'Event length (seconds)'],
              ['duckCount', 'Ducks per event'],
              ['minPlayers', 'Minimum players'],
              ['maxPlayers', 'Maximum players'],
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
              label="Schedule automatically"
            />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <Button
            variant="primary"
            loading={saveSchedule.isPending}
            onClick={() => saveSchedule.mutate(schedule)}
          >
            Save schedule
          </Button>
        </div>
      </section>

      <section>
        <div className="section-title">
          <h3>Activity rewards</h3>
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
          title={paused ? 'Resume AI redemptions?' : 'Pause all AI redemptions?'}
          body={
            paused ? (
              'Players will be able to mint AI Credit and create keys again.'
            ) : (
              <span className="row" style={{ alignItems: 'flex-start' }}>
                <AlertTriangle size={16} /> Players will immediately be unable to mint AI Credit or
                create/rotate keys. Existing keys keep working.
              </span>
            )
          }
          confirmLabel={paused ? 'Resume' : 'Pause redemptions'}
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
      useUi.getState().toast({ kind: 'success', title: `${row.slug} updated` });
      void qc.invalidateQueries({ queryKey: ['admin', 'activities'] });
    },
    onError: (err) => toastError(err, 'Could not save'),
  });
  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <strong style={{ fontFamily: 'var(--font-mono)' }}>{row.slug}</strong>
        <div className="row">
          <Switch checked={enabled} onChange={setEnabled} label="Enabled" />
          <Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            Save
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
