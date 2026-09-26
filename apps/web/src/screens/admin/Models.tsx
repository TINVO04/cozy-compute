import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus, RefreshCw, Zap } from 'lucide-react';
import { useState } from 'react';
import { api, usd } from '../../lib/api';
import { useUi } from '../../lib/store';
import { Button, EmptyState, ErrorState, LoadingState, Modal, Switch, toastError } from '../../ui/primitives';

interface Model {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  publicModelName: string;
  upstreamProvider: string;
  upstreamModelName: string;
  upstreamBaseUrl: string;
  secretRef: string;
  enabled: boolean;
  allowExternalUse: boolean;
  creditMultiplier: number;
  inputCostPerMtok: number;
  outputCostPerMtok: number;
  rpm: number;
  tpm: number;
  contextLimit: number | null;
  userMonthlyBudgetCents: number | null;
  gatewaySyncedAt: string | null;
}

const BLANK: Omit<Model, 'id' | 'gatewaySyncedAt'> = {
  slug: '',
  displayName: '',
  description: '',
  publicModelName: '',
  upstreamProvider: 'openai',
  upstreamModelName: '',
  upstreamBaseUrl: 'https://',
  secretRef: 'UPSTREAM_KEY_1',
  enabled: false,
  allowExternalUse: true,
  creditMultiplier: 1,
  inputCostPerMtok: 0.5,
  outputCostPerMtok: 1.5,
  rpm: 20,
  tpm: 60000,
  contextLimit: null,
  userMonthlyBudgetCents: null,
};

export function ModelsPage() {
  const qc = useQueryClient();
  const models = useQuery({ queryKey: ['admin', 'models'], queryFn: () => api<Model[]>('/admin/models') });
  const [editing, setEditing] = useState<Model | typeof BLANK | null>(null);
  const test = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean; latencyMs: number; message: string }>(`/admin/models/${id}/test`, { body: {} }),
    onSuccess: (r) =>
      useUi.getState().toast({
        kind: r.ok ? 'success' : 'error',
        title: r.ok ? `Upstream OK (${r.latencyMs} ms)` : 'Upstream test failed',
        body: r.message,
      }),
    onError: (err) => toastError(err),
  });
  const sync = useMutation({
    mutationFn: (id: string) => api(`/admin/models/${id}/sync`, { body: {} }),
    onSuccess: () => {
      useUi.getState().toast({ kind: 'success', title: 'Gateway synced' });
      void qc.invalidateQueries({ queryKey: ['admin', 'models'] });
    },
    onError: (err) => toastError(err, 'Sync failed'),
  });
  return (
    <div className="stack-lg">
      <header className="admin-head">
        <div>
          <h1>Models</h1>
          <p className="muted">
            OpenAI-compatible upstreams players can reach through the gateway. Secrets stay on the gateway
            host.
          </p>
        </div>
        <Button variant="primary" onClick={() => setEditing(BLANK)}>
          <Plus size={16} /> Add model
        </Button>
      </header>
      {models.isPending ? (
        <LoadingState />
      ) : models.isError ? (
        <ErrorState error={models.error} onRetry={() => void models.refetch()} />
      ) : models.data.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Bot size={22} />}
            title="No models configured"
            body="Add a model deployment to let players create API keys."
            action={
              <Button variant="primary" onClick={() => setEditing(BLANK)}>
                Add model
              </Button>
            }
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Public alias</th>
                <th>Upstream</th>
                <th>Secret ref</th>
                <th className="num">Credit ×</th>
                <th className="num">$/Mtok in·out</th>
                <th className="num">RPM · TPM</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {models.data.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{m.publicModelName}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {m.displayName}
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>
                      {m.upstreamProvider}/{m.upstreamModelName}
                    </div>
                    <div className="muted">{m.upstreamBaseUrl}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{m.secretRef}</td>
                  <td className="num">{m.creditMultiplier}</td>
                  <td className="num">
                    {m.inputCostPerMtok} · {m.outputCostPerMtok}
                  </td>
                  <td className="num">
                    {m.rpm} · {m.tpm.toLocaleString()}
                  </td>
                  <td>
                    <div className="row wrap" style={{ gap: 4 }}>
                      <span className={`pill ${m.enabled ? 'pill-success' : ''}`}>
                        {m.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {!m.gatewaySyncedAt ? <span className="pill pill-danger">Not synced</span> : null}
                    </div>
                  </td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={test.isPending && test.variables === m.id}
                        onClick={() => test.mutate(m.id)}
                        title="Send a tiny test request through the gateway"
                      >
                        <Zap size={14} /> Test
                      </Button>
                      {!m.gatewaySyncedAt ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={sync.isPending}
                          onClick={() => sync.mutate(m.id)}
                        >
                          <RefreshCw size={14} /> Retry sync
                        </Button>
                      ) : null}
                      <Button size="sm" onClick={() => setEditing(m)}>
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing ? <ModelForm model={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function ModelForm({ model, onClose }: { model: Model | typeof BLANK; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = !('id' in model);
  const [f, setF] = useState({ ...model });
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = useMutation({
    mutationFn: () => {
      const body = {
        slug: f.slug,
        displayName: f.displayName,
        description: f.description,
        publicModelName: f.publicModelName,
        upstreamProvider: f.upstreamProvider,
        upstreamModelName: f.upstreamModelName,
        upstreamBaseUrl: f.upstreamBaseUrl,
        secretRef: f.secretRef,
        enabled: f.enabled,
        allowExternalUse: f.allowExternalUse,
        creditMultiplier: Number(f.creditMultiplier),
        inputCostPerMtok: Number(f.inputCostPerMtok),
        outputCostPerMtok: Number(f.outputCostPerMtok),
        rpm: Number(f.rpm),
        tpm: Number(f.tpm),
        contextLimit: f.contextLimit ? Number(f.contextLimit) : null,
        userMonthlyBudgetCents:
          f.userMonthlyBudgetCents === null || (f.userMonthlyBudgetCents as unknown) === ''
            ? null
            : Number(f.userMonthlyBudgetCents),
      };
      return isNew
        ? api('/admin/models', { body })
        : api(`/admin/models/${(model as Model).id}`, { method: 'PUT', body });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'models'] });
      useUi.getState().toast({
        kind: 'success',
        title: isNew ? 'Model created' : 'Model updated',
        body: 'Change recorded in the audit log.',
      });
      onClose();
    },
    onError: (e) => {
      setErr(e instanceof Error ? e.message : 'Save failed');
      void qc.invalidateQueries({ queryKey: ['admin', 'models'] });
    },
  });
  const input = (
    k: keyof typeof f,
    label: string,
    opts: { type?: string; hint?: string; mono?: boolean; full?: boolean; step?: string } = {},
  ) => (
    <div className={`field ${opts.full ? 'full' : ''}`}>
      <label htmlFor={`m-${String(k)}`}>{label}</label>
      <input
        id={`m-${String(k)}`}
        className="input"
        type={opts.type ?? 'text'}
        step={opts.step}
        style={opts.mono ? { fontFamily: 'var(--font-mono)' } : undefined}
        value={(f[k] as string | number | null) ?? ''}
        onChange={(e) =>
          set(
            k,
            (opts.type === 'number'
              ? e.target.value === ''
                ? null
                : e.target.value
              : e.target.value) as never,
          )
        }
      />
      {opts.hint ? <span className="field-hint">{opts.hint}</span> : null}
    </div>
  );
  return (
    <Modal
      title={isNew ? 'Add model deployment' : `Edit ${(model as Model).publicModelName}`}
      onClose={onClose}
      width={760}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            {isNew ? 'Create model' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {input('displayName', 'Display name')}
        {input('slug', 'Slug', { mono: true, hint: 'Internal id, e.g. creator-pro' })}
        {input('publicModelName', 'Public model alias', {
          mono: true,
          hint: 'What players pass as "model".',
        })}
        <div className="field">
          <label htmlFor="m-prov">Upstream API style</label>
          <select
            id="m-prov"
            className="select"
            value={f.upstreamProvider}
            onChange={(e) => set('upstreamProvider', e.target.value)}
          >
            <option value="openai">OpenAI-compatible</option>
            <option value="hosted_vllm">vLLM</option>
            <option value="ollama">Ollama</option>
            <option value="azure">Azure OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        {input('upstreamBaseUrl', 'Upstream base URL', {
          mono: true,
          full: true,
          hint: 'e.g. https://my-provider.example/v1',
        })}
        {input('upstreamModelName', 'Upstream model name', { mono: true })}
        {input('secretRef', 'Credential reference', {
          mono: true,
          hint: 'Name of an UPSTREAM_KEY_* env var on the gateway host. Never paste the key itself.',
        })}
        {input('description', 'Description for players', { full: true })}
        {input('creditMultiplier', 'AI Credit multiplier', {
          type: 'number',
          step: '0.1',
          hint: '1 = $1 AI Credit buys $1 quota.',
        })}
        {input('userMonthlyBudgetCents', 'Per-player monthly cap (cents)', {
          type: 'number',
          hint: 'Blank = only the global cap applies.',
        })}
        {input('inputCostPerMtok', 'Input cost $ / 1M tokens', { type: 'number', step: '0.01' })}
        {input('outputCostPerMtok', 'Output cost $ / 1M tokens', { type: 'number', step: '0.01' })}
        {input('rpm', 'Requests / minute per key', { type: 'number' })}
        {input('tpm', 'Tokens / minute per key', { type: 'number' })}
        {input('contextLimit', 'Max output tokens', { type: 'number', hint: 'Optional.' })}
        <div className="field" style={{ alignContent: 'end', gap: 12 }}>
          <Switch checked={f.enabled} onChange={(v) => set('enabled', v)} label="Enabled" />
          <Switch
            checked={f.allowExternalUse}
            onChange={(v) => set('allowExternalUse', v)}
            label="Players can create keys"
          />
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        Estimated player cost: {usd(Math.round(Number(f.creditMultiplier) * 100))} AI Credit per $1.00 of
        quota.
      </p>
      {err ? (
        <div className="callout callout-danger" role="alert">
          {err}
        </div>
      ) : null}
    </Modal>
  );
}
