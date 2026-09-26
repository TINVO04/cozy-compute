import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  PauseCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  api,
  ApiError,
  newIdempotencyKey,
  num,
  usd,
  type AiKey,
  type AiOverview,
  type NewKeyResult,
} from '../../lib/api';
import { qk, useRefreshEconomy } from '../../lib/queries';
import { useUi } from '../../lib/store';
import {
  Button,
  CoinIcon,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Panel,
  Progress,
  formatDate,
  toastError,
} from '../../ui/primitives';

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    useUi.getState().toast({ kind: 'success', title: `${what} copied` });
  } catch {
    useUi
      .getState()
      .toast({ kind: 'error', title: 'Could not copy', body: 'Select the text and copy it manually.' });
  }
}

export function AiPanel({ onClose }: { onClose: () => void }) {
  const ai = useQuery({ queryKey: qk.ai, queryFn: () => api<AiOverview>('/ai'), refetchInterval: 30_000 });
  const [secret, setSecret] = useState<NewKeyResult | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  return (
    <Panel icon={<Bot size={18} />} eyebrow="AI Rewards Kiosk" title="AI Rewards" onClose={onClose}>
      {ai.isPending ? (
        <LoadingState rows={4} />
      ) : ai.isError ? (
        <ErrorState error={ai.error} onRetry={() => void ai.refetch()} />
      ) : (
        <div className="stack-lg" style={{ maxWidth: 1080, margin: '0 auto' }}>
          {ai.data.paused ? (
            <div className="callout callout-warn" role="status">
              <PauseCircle size={18} />
              <div>
                <strong>Redemptions are paused.</strong> Your balances and existing keys are safe. New
                redemptions will reopen soon.
              </div>
            </div>
          ) : null}
          <Summary data={ai.data} />
          <Eligibility data={ai.data} />
          <div className="split" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <MintCard data={ai.data} />
            <CreateKeyCard data={ai.data} onCreated={setSecret} />
          </div>
          <KeysTable data={ai.data} onSelect={setSelectedKey} />
        </div>
      )}
      {secret ? <SecretModal result={secret} onClose={() => setSecret(null)} /> : null}
      {selectedKey && ai.data ? (
        <KeyDetail
          keyId={selectedKey}
          data={ai.data}
          onClose={() => setSelectedKey(null)}
          onRotated={(r) => {
            setSelectedKey(null);
            setSecret(r);
          }}
        />
      ) : null}
    </Panel>
  );
}

function Summary({ data }: { data: AiOverview }) {
  const activeQuota = data.keys
    .filter((k) => k.status === 'active')
    .reduce((s, k) => s + k.remainingCents, 0);
  return (
    <div className="ai-hero">
      <div className="card stat">
        <div className="stat-label">AI Credit balance</div>
        <div className="stat-value">{usd(data.balances.aiCreditCents)}</div>
        <div className="stat-sub">Ready to allocate to an API key</div>
      </div>
      <div className="card stat">
        <div className="stat-label">Active key quota</div>
        <div className="stat-value">{usd(Math.floor(activeQuota))}</div>
        <div className="stat-sub">Remaining across your active keys</div>
      </div>
      <div className="card stat">
        <div className="stat-label">Monthly redemption limit</div>
        <div className="stat-value">
          {usd(data.monthly.remainingCents)}
          <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>
            {' '}
            / {usd(data.monthly.capCents)}
          </span>
        </div>
        <div style={{ margin: '8px 0 4px' }}>
          <Progress value={data.monthly.usedCents} max={data.monthly.capCents} tone="success" />
        </div>
        <div className="stat-sub">Resets {formatDate(data.monthly.resetsAt)}</div>
      </div>
    </div>
  );
}

function Eligibility({ data }: { data: AiOverview }) {
  const { eligible, checks } = data.eligibility;
  return (
    <section>
      <div className="section-title">
        <h3>Redemption eligibility</h3>
        {eligible ? (
          <span className="pill pill-success">Eligible</span>
        ) : (
          <span className="pill pill-warn">{checks.filter((c) => !c.met).length} requirements left</span>
        )}
      </div>
      <div className="eligibility">
        {checks.map((c) => (
          <div key={c.id} className={`elig ${c.met ? 'done' : ''}`}>
            <span className="check">{c.met ? <Check size={13} strokeWidth={3} /> : null}</span>
            <div>
              <strong>{c.label}</strong>
              <span>{c.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MintCard({ data }: { data: AiOverview }) {
  const refresh = useRefreshEconomy();
  const { minMintCents, maxMintCents, coinPerUsd } = data.rate;
  const affordableCents = Math.floor((data.balances.coin * 100) / coinPerUsd);
  const cap = Math.min(maxMintCents, data.monthly.remainingCents, data.pool.remainingCents, affordableCents);
  const step = 25;
  const [cents, setCents] = useState(Math.max(minMintCents, Math.min(100, cap)));
  const [confirm, setConfirm] = useState(false);
  const [idem, setIdem] = useState(newIdempotencyKey);
  const coinCost = Math.ceil((cents * coinPerUsd) / 100);
  const blockedReason = data.paused
    ? 'Redemptions are paused.'
    : !data.eligibility.eligible
      ? 'Complete the eligibility requirements above first.'
      : cap < minMintCents
        ? affordableCents < minMintCents
          ? `You need at least ${num(Math.ceil((minMintCents * coinPerUsd) / 100))} Coin.`
          : data.monthly.remainingCents < minMintCents
            ? 'Monthly limit reached.'
            : "This week's reward pool is used up."
        : null;

  const mint = useMutation({
    mutationFn: () =>
      api<{ creditCents: number; coinSpent: number }>('/ai/mint', { body: { cents }, idempotencyKey: idem }),
    onSuccess: (r) => {
      useUi.getState().toast({
        kind: 'reward',
        title: `${usd(r.creditCents)} AI Credit added`,
        body: `${num(r.coinSpent)} Coin redeemed.`,
      });
      setConfirm(false);
      setIdem(newIdempotencyKey());
      refresh();
    },
    onError: (err) => {
      setConfirm(false);
      // A genuine failure means a new attempt should get a new key.
      if (err instanceof ApiError && err.code !== 'redemption_in_progress') setIdem(newIdempotencyKey());
      toastError(err, 'Redemption failed');
      refresh();
    },
  });

  return (
    <section className="card" style={{ padding: 20, display: 'grid', gap: 14, alignContent: 'start' }}>
      <div>
        <h3 style={{ fontSize: 15 }}>1 · Redeem Coin for AI Credit</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          {num(coinPerUsd)} Coin = $1.00 of AI quota. AI Credit cannot be transferred or cashed out.
        </p>
      </div>
      <div className="conversion">
        <div>
          <div className="stat-label">You spend</div>
          <div className="amt row" style={{ gap: 6 }}>
            <CoinIcon size={18} /> {num(coinCost)}
          </div>
        </div>
        <span className="muted">→</span>
        <div style={{ textAlign: 'right' }}>
          <div className="stat-label">You get</div>
          <div className="amt">{usd(cents)}</div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="mint-amt">Amount</label>
        <input
          id="mint-amt"
          className="slider"
          type="range"
          min={minMintCents}
          max={Math.max(minMintCents, cap - (cap % step))}
          step={step}
          value={cents}
          disabled={Boolean(blockedReason)}
          onChange={(e) => setCents(Number(e.target.value))}
        />
        <div className="row between muted" style={{ fontSize: 12 }}>
          <span>{usd(minMintCents)}</span>
          <span>
            Balance: {num(data.balances.coin)} Coin · Pool left this week: {usd(data.pool.remainingCents)}
          </span>
        </div>
      </div>
      {blockedReason ? (
        <div className="callout callout-info">
          <Lock size={16} />
          {blockedReason}
        </div>
      ) : null}
      <Button variant="primary" disabled={Boolean(blockedReason)} onClick={() => setConfirm(true)}>
        Redeem {usd(cents)}
      </Button>
      {confirm ? (
        <ConfirmDialog
          title={`Redeem ${num(coinCost)} Coin?`}
          body={
            <>
              You will receive <strong>{usd(cents)} AI Credit</strong>. This cannot be undone, and AI Credit
              cannot be converted back into Coin.
            </>
          }
          confirmLabel="Redeem"
          loading={mint.isPending}
          onConfirm={() => mint.mutate()}
          onClose={() => setConfirm(false)}
        />
      ) : null}
    </section>
  );
}

function CreateKeyCard({ data, onCreated }: { data: AiOverview; onCreated: (r: NewKeyResult) => void }) {
  const refresh = useRefreshEconomy();
  const [models, setModels] = useState<string[]>(() => (data.models[0] ? [data.models[0].id] : []));
  const [label, setLabel] = useState('My key');
  const maxMult = Math.max(
    1,
    ...data.models.filter((m) => models.includes(m.id)).map((m) => m.creditMultiplier),
  );
  const maxBudget = Math.floor(data.balances.aiCreditCents / maxMult);
  const [budget, setBudget] = useState(Math.max(data.keyPolicy.minBudgetCents, Math.min(100, maxBudget)));
  const [idem, setIdem] = useState(newIdempotencyKey);
  const cost = Math.ceil(budget * maxMult);
  const atLimit = data.keyPolicy.activeKeys >= data.keyPolicy.maxActiveKeys;
  const blocked = data.paused
    ? 'Redemptions are paused.'
    : !data.models.length
      ? 'No models are available right now.'
      : atLimit
        ? `You already have ${data.keyPolicy.maxActiveKeys} active keys. Revoke one to create another.`
        : maxBudget < data.keyPolicy.minBudgetCents
          ? `You need at least ${usd(Math.ceil(data.keyPolicy.minBudgetCents * maxMult))} AI Credit.`
          : !models.length
            ? 'Pick at least one model.'
            : null;

  const create = useMutation({
    mutationFn: () =>
      api<NewKeyResult>('/ai/keys', {
        body: { modelIds: models, budgetCents: budget, label },
        idempotencyKey: idem,
      }),
    onSuccess: (r) => {
      setIdem(newIdempotencyKey());
      onCreated(r);
      refresh();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code !== 'redemption_in_progress') setIdem(newIdempotencyKey());
      toastError(err, 'Could not create key');
      refresh();
    },
  });

  return (
    <section className="card" style={{ padding: 20, display: 'grid', gap: 14, alignContent: 'start' }}>
      <div>
        <h3 style={{ fontSize: 15 }}>2 · Create an API key</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Allocate AI Credit to a key restricted to the models you pick. Keys expire after{' '}
          {data.keyPolicy.ttlDays} days.
        </p>
      </div>
      {data.models.length ? (
        <div className="stack" style={{ gap: 8 }} role="group" aria-label="Models">
          {data.models.map((m) => {
            const on = models.includes(m.id);
            return (
              <button
                key={m.id}
                className="model-pass"
                aria-pressed={on}
                onClick={() => setModels(on ? models.filter((x) => x !== m.id) : [...models, m.id])}
              >
                <div className="row between">
                  <span className="model-name">{m.name}</span>
                  {m.creditMultiplier !== 1 ? (
                    <span className="pill">×{m.creditMultiplier} credit</span>
                  ) : (
                    <span className="pill pill-success">Standard rate</span>
                  )}
                </div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{m.displayName}</span>
                {m.description ? (
                  <span className="muted" style={{ fontSize: 12 }}>
                    {m.description}
                  </span>
                ) : null}
                <span className="muted" style={{ fontSize: 12 }}>
                  {m.rpm} req/min · {num(m.tpm)} tokens/min
                  {m.contextLimit ? ` · ${num(m.contextLimit)} max tokens` : ''}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Bot size={22} />}
          title="No models yet"
          body="The admins have not enabled any models. Check back soon."
        />
      )}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="key-label">Key name</label>
          <input
            id="key-label"
            className="input"
            maxLength={40}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="key-budget">Budget (USD)</label>
          <input
            id="key-budget"
            className="input"
            type="number"
            min={data.keyPolicy.minBudgetCents / 100}
            max={maxBudget / 100}
            step={0.25}
            value={(budget / 100).toFixed(2)}
            onChange={(e) => setBudget(Math.round(Number(e.target.value) * 100))}
            aria-invalid={budget > maxBudget || budget < data.keyPolicy.minBudgetCents}
          />
        </div>
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        Uses {usd(cost)} of your {usd(data.balances.aiCreditCents)} AI Credit · {data.keyPolicy.activeKeys}/
        {data.keyPolicy.maxActiveKeys} active keys
      </div>
      {blocked ? (
        <div className="callout callout-info">
          <Lock size={16} />
          {blocked}
        </div>
      ) : null}
      <Button
        variant="primary"
        disabled={
          Boolean(blocked) || budget > maxBudget || budget < data.keyPolicy.minBudgetCents || !label.trim()
        }
        loading={create.isPending}
        onClick={() => create.mutate()}
      >
        <KeyRound size={16} /> Create key with {usd(budget)} quota
      </Button>
    </section>
  );
}

const STATUS_PILL: Record<AiKey['status'], string> = {
  active: 'pill-success',
  exhausted: 'pill-warn',
  suspended: 'pill-danger',
  revoked: '',
  expired: '',
  pending: 'pill-primary',
  failed: 'pill-danger',
};

function KeysTable({ data, onSelect }: { data: AiOverview; onSelect: (id: string) => void }) {
  return (
    <section>
      <div className="section-title">
        <h3>Your keys</h3>
        <span className="muted" style={{ fontSize: 12 }}>
          Usage syncs from the gateway about once a minute.
        </span>
      </div>
      {data.keys.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<KeyRound size={22} />}
            title="No keys yet"
            body="Create a key above to get a Base URL and API key you can use in any OpenAI-compatible app."
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Status</th>
                <th>Models</th>
                <th className="num">Remaining</th>
                <th style={{ width: 160 }}>Usage</th>
                <th>Expires</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.keys.map((k) => (
                <tr key={k.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{k.label}</div>
                    <div className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {k.keyPreview ?? '—'}
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${STATUS_PILL[k.status]}`} style={{ textTransform: 'uppercase' }}>
                      {k.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{k.models.join(', ')}</td>
                  <td className="num">
                    {usd(Math.floor(k.remainingCents))} <span className="muted">/ {usd(k.budgetCents)}</span>
                  </td>
                  <td>
                    <Progress value={k.spendCents} max={k.budgetCents} tone="reward" />
                  </td>
                  <td className="muted">{formatDate(k.expiresAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Button size="sm" onClick={() => onSelect(k.id)}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function sdkExamples(baseUrl: string, apiKey: string, model: string) {
  return {
    python: `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}",
    api_key="${apiKey}",
)

reply = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Hello from Cozy Compute!"}],
)
print(reply.choices[0].message.content)`,
    node: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${baseUrl}",
  apiKey: "${apiKey}",
});

const reply = await client.chat.completions.create({
  model: "${model}",
  messages: [{ role: "user", content: "Hello from Cozy Compute!" }],
});
console.log(reply.choices[0].message.content);`,
    curl: `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${model}", "messages": [{"role": "user", "content": "Hello!"}]}'`,
  };
}

function CodeTabs({ baseUrl, apiKey, model }: { baseUrl: string; apiKey: string; model: string }) {
  const [tab, setTab] = useState<'python' | 'node' | 'curl'>('python');
  const ex = sdkExamples(baseUrl, apiKey, model);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row between">
        <div className="tabs" role="tablist" aria-label="Code example">
          {(['python', 'node', 'curl'] as const).map((t) => (
            <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {t === 'python' ? 'Python' : t === 'node' ? 'Node.js' : 'cURL'}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => void copy(ex[tab], 'Example')}>
          <Copy size={14} /> Copy example
        </Button>
      </div>
      <pre className="code">{ex[tab]}</pre>
    </div>
  );
}

function SecretModal({ result, onClose }: { result: NewKeyResult; onClose: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const masked = result.apiKey.slice(0, 6) + '•'.repeat(18) + result.apiKey.slice(-4);
  return (
    <Modal
      title="Your new API key"
      description="Copy it now. For your security we only show the full key once."
      onClose={onClose}
      width={680}
      footer={
        <Button variant="primary" onClick={onClose}>
          {copied ? 'Done' : 'I saved my key'}
        </Button>
      }
    >
      <div className="callout callout-warn">
        <AlertTriangle size={18} />
        <div>
          Treat this key like a password. Anyone with it can spend your quota. If it leaks, revoke or rotate
          it from AI Rewards.
        </div>
      </div>
      <div className="console">
        <div className="console-row">
          <span className="k">Base URL</span>
          <span className="v">{result.baseUrl}</span>
          <Button size="sm" variant="ghost" onClick={() => void copy(result.baseUrl, 'Base URL')}>
            <Copy size={14} />
          </Button>
        </div>
        <div className="console-row">
          <span className="k">API key</span>
          <span className="v">{revealed ? result.apiKey : masked}</span>
          <div className="row" style={{ gap: 4 }}>
            <Button
              size="sm"
              variant="ghost"
              aria-label={revealed ? 'Hide key' : 'Show key'}
              onClick={() => setRevealed(!revealed)}
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                void copy(result.apiKey, 'API key');
                setCopied(true);
              }}
            >
              <Copy size={14} /> Copy key
            </Button>
          </div>
        </div>
        <div className="console-row">
          <span className="k">Models</span>
          <span className="v">{result.models.join(', ')}</span>
          <span />
        </div>
        <div className="console-row">
          <span className="k">Quota</span>
          <span className="v">
            ${result.budgetUsd.toFixed(2)} · expires {formatDate(result.expiresAt)}
          </span>
          <span />
        </div>
      </div>
      <CodeTabs baseUrl={result.baseUrl} apiKey={result.apiKey} model={result.models[0] ?? ''} />
    </Modal>
  );
}

interface UsageRow {
  day: string;
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

function KeyDetail({
  keyId,
  data,
  onClose,
  onRotated,
}: {
  keyId: string;
  data: AiOverview;
  onClose: () => void;
  onRotated: (r: NewKeyResult) => void;
}) {
  const key = data.keys.find((k) => k.id === keyId);
  const qc = useQueryClient();
  const refresh = useRefreshEconomy();
  const usage = useQuery({
    queryKey: ['usage', keyId],
    queryFn: () => api<UsageRow[]>(`/ai/keys/${keyId}/usage`),
  });
  const [confirm, setConfirm] = useState<null | 'revoke' | 'rotate'>(null);
  const totals = useMemo(
    () =>
      (usage.data ?? []).reduce(
        (a, u) => ({ req: a.req + u.requests, tok: a.tok + u.inputTokens + u.outputTokens }),
        { req: 0, tok: 0 },
      ),
    [usage.data],
  );
  const revoke = useMutation({
    mutationFn: () => api(`/ai/keys/${keyId}/revoke`, { body: {} }),
    onSuccess: () => {
      useUi
        .getState()
        .toast({ kind: 'success', title: 'Key revoked', body: 'It stopped working immediately.' });
      void qc.invalidateQueries({ queryKey: qk.ai });
      onClose();
    },
    onError: (err) => toastError(err, 'Could not revoke'),
  });
  const rotate = useMutation({
    mutationFn: () => api<NewKeyResult>(`/ai/keys/${keyId}/rotate`, { body: {} }),
    onSuccess: (r) => {
      refresh();
      onRotated(r);
    },
    onError: (err) => toastError(err, 'Could not rotate'),
  });
  if (!key) return null;
  const usable = key.status === 'active';
  return (
    <Modal
      title={key.label}
      description={`${key.keyPreview ?? ''} · created ${formatDate(key.createdAt)}`}
      onClose={onClose}
      width={720}
    >
      {key.status === 'suspended' ? (
        <div className="callout callout-danger">
          <AlertTriangle size={18} />
          <div>
            This key is suspended
            {key.suspendedReason?.startsWith('auto:')
              ? ' because it was used from many different places at once'
              : ''}
            . Contact support or rotate to a new key.
          </div>
        </div>
      ) : null}
      <div className="console">
        <div className="console-row">
          <span className="k">Base URL</span>
          <span className="v">{data.gatewayBaseUrl}</span>
          <Button size="sm" variant="ghost" onClick={() => void copy(data.gatewayBaseUrl, 'Base URL')}>
            <Copy size={14} />
          </Button>
        </div>
        <div className="console-row">
          <span className="k">API key</span>
          <span className="v">{key.keyPreview} (hidden — shown only once at creation)</span>
          <span />
        </div>
        <div className="console-row">
          <span className="k">Models</span>
          <span className="v">{key.models.join(', ')}</span>
          <Button size="sm" variant="ghost" onClick={() => void copy(key.models[0] ?? '', 'Model name')}>
            <Copy size={14} />
          </Button>
        </div>
        <div className="console-row">
          <span className="k">Quota</span>
          <span className="v">
            {usd(Math.floor(key.remainingCents))} remaining of {usd(key.budgetCents)}
          </span>
          <span />
        </div>
        <div className="console-row">
          <span className="k">Limits</span>
          <span className="v">
            {key.rpm} requests/min · {num(key.tpm)} tokens/min
          </span>
          <span />
        </div>
        <div className="console-row">
          <span className="k">Expires</span>
          <span className="v">{formatDate(key.expiresAt)}</span>
          <span />
        </div>
      </div>
      <section>
        <div className="section-title">
          <h3>Usage</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            {num(totals.req)} requests · {num(totals.tok)} tokens
          </span>
        </div>
        {usage.isPending ? (
          <div className="skeleton" style={{ height: 80 }} />
        ) : usage.isError ? (
          <ErrorState error={usage.error} onRetry={() => void usage.refetch()} />
        ) : usage.data.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            No requests recorded yet. Usage can take a minute or two to appear after you call the API.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Model</th>
                  <th className="num">Requests</th>
                  <th className="num">Tokens in / out</th>
                  <th className="num">Cost</th>
                </tr>
              </thead>
              <tbody>
                {usage.data.map((u) => (
                  <tr key={u.day + u.model}>
                    <td>{u.day}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.model}</td>
                    <td className="num">{num(u.requests)}</td>
                    <td className="num">
                      {num(u.inputTokens)} / {num(u.outputTokens)}
                    </td>
                    <td className="num">${u.costUsd.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {usable ? (
        <CodeTabs baseUrl={data.gatewayBaseUrl} apiKey="YOUR_API_KEY" model={key.models[0] ?? ''} />
      ) : null}
      {key.status === 'active' || key.status === 'suspended' || key.status === 'exhausted' ? (
        <div className="card danger-zone" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <strong>Key controls</strong>
          <div className="row wrap">
            <Button
              onClick={() => setConfirm('rotate')}
              disabled={key.status !== 'active'}
              title={key.status !== 'active' ? 'Only active keys with quota can be rotated' : undefined}
            >
              <RefreshCw size={15} /> Rotate key
            </Button>
            <Button variant="danger" onClick={() => setConfirm('revoke')}>
              <Trash2 size={15} /> Revoke key
            </Button>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            Rotating issues a new secret with the remaining quota and disables the old one immediately.
            Revoking disables the key permanently; unused quota is not refunded.
          </span>
        </div>
      ) : null}
      {confirm === 'revoke' ? (
        <ConfirmDialog
          danger
          title="Revoke this key?"
          body={`Apps using ${key.keyPreview} will stop working immediately. The remaining ${usd(Math.floor(key.remainingCents))} of quota on this key will be lost.`}
          confirmLabel="Revoke key"
          loading={revoke.isPending}
          onConfirm={() => revoke.mutate()}
          onClose={() => setConfirm(null)}
        />
      ) : null}
      {confirm === 'rotate' ? (
        <ConfirmDialog
          title="Rotate this key?"
          body="You will get a new secret with the same models and remaining quota. The current key stops working right away, so update your apps afterwards."
          confirmLabel="Rotate key"
          loading={rotate.isPending}
          onConfirm={() => rotate.mutate()}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </Modal>
  );
}
