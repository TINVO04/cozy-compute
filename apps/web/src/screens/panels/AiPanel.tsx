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
    useUi.getState().toast({ kind: 'success', title: `Đã sao chép ${what}` });
  } catch {
    useUi
      .getState()
      .toast({ kind: 'error', title: 'Không thể sao chép', body: 'Hãy chọn văn bản và sao chép thủ công.' });
  }
}

export function AiPanel({ onClose }: { onClose: () => void }) {
  const ai = useQuery({ queryKey: qk.ai, queryFn: () => api<AiOverview>('/ai'), refetchInterval: 30_000 });
  const [secret, setSecret] = useState<NewKeyResult | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  return (
    <Panel icon={<Bot size={18} />} eyebrow="Trạm Đổi Thưởng AI" title="Phần Thưởng AI" onClose={onClose}>
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
                <strong>Hệ thống đổi thưởng đang tạm dừng.</strong> Số dư và các khóa API hiện có của bạn vẫn
                an toàn. Đổi thưởng sẽ sớm mở lại.
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
        <div className="stat-label">Số dư AI Credit</div>
        <div className="stat-value">{usd(data.balances.aiCreditCents)}</div>
        <div className="stat-sub">Sẵn sàng cấp cho khóa API</div>
      </div>
      <div className="card stat">
        <div className="stat-label">Hạn mức khóa hoạt động</div>
        <div className="stat-value">{usd(Math.floor(activeQuota))}</div>
        <div className="stat-sub">Còn lại trên các khóa đang hoạt động</div>
      </div>
      <div className="card stat">
        <div className="stat-label">Giới hạn đổi thưởng tháng</div>
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
        <div className="stat-sub">Làm mới vào {formatDate(data.monthly.resetsAt)}</div>
      </div>
    </div>
  );
}

function Eligibility({ data }: { data: AiOverview }) {
  const { eligible, checks } = data.eligibility;
  return (
    <section>
      <div className="section-title">
        <h3>Điều kiện đổi thưởng</h3>
        {eligible ? (
          <span className="pill pill-success">Đủ điều kiện</span>
        ) : (
          <span className="pill pill-warn">Còn {checks.filter((c) => !c.met).length} điều kiện chưa đạt</span>
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
    ? 'Hệ thống đổi thưởng đang tạm dừng.'
    : !data.eligibility.eligible
      ? 'Vui lòng hoàn thành các điều kiện đổi thưởng bên trên trước.'
      : cap < minMintCents
        ? affordableCents < minMintCents
          ? `Bạn cần ít nhất ${num(Math.ceil((minMintCents * coinPerUsd) / 100))} Xu.`
          : data.monthly.remainingCents < minMintCents
            ? 'Đã đạt giới hạn đổi thưởng tháng.'
            : 'Quỹ thưởng tuần này đã hết.'
        : null;

  const mint = useMutation({
    mutationFn: () =>
      api<{ creditCents: number; coinSpent: number }>('/ai/mint', { body: { cents }, idempotencyKey: idem }),
    onSuccess: (r) => {
      useUi.getState().toast({
        kind: 'reward',
        title: `Đã cộng ${usd(r.creditCents)} AI Credit`,
        body: `Đã đổi ${num(r.coinSpent)} Xu.`,
      });
      setConfirm(false);
      setIdem(newIdempotencyKey());
      refresh();
    },
    onError: (err) => {
      setConfirm(false);
      // A genuine failure means a new attempt should get a new key.
      if (err instanceof ApiError && err.code !== 'redemption_in_progress') setIdem(newIdempotencyKey());
      toastError(err, 'Đổi thưởng thất bại');
      refresh();
    },
  });

  return (
    <section className="card" style={{ padding: 20, display: 'grid', gap: 14, alignContent: 'start' }}>
      <div>
        <h3 style={{ fontSize: 15 }}>1 · Đổi Xu lấy AI Credit</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          {num(coinPerUsd)} Xu = $1.00 hạn mức AI. AI Credit không thể chuyển nhượng hoặc rút thành tiền mặt.
        </p>
      </div>
      <div className="conversion">
        <div>
          <div className="stat-label">Bạn dùng</div>
          <div className="amt row" style={{ gap: 6 }}>
            <CoinIcon size={18} /> {num(coinCost)}
          </div>
        </div>
        <span className="muted">→</span>
        <div style={{ textAlign: 'right' }}>
          <div className="stat-label">Bạn nhận</div>
          <div className="amt">{usd(cents)}</div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="mint-amt">Số lượng</label>
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
            Số dư: {num(data.balances.coin)} Xu · Quỹ tuần này còn: {usd(data.pool.remainingCents)}
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
        Đổi {usd(cents)}
      </Button>
      {confirm ? (
        <ConfirmDialog
          title={`Đổi ${num(coinCost)} Xu?`}
          body={
            <>
              Bạn sẽ nhận được <strong>{usd(cents)} AI Credit</strong>. Thao tác này không thể hoàn tác, và AI
              Credit không thể đổi ngược lại thành Xu.
            </>
          }
          confirmLabel="Đổi thưởng"
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
    ? 'Hệ thống đổi thưởng đang tạm dừng.'
    : !data.models.length
      ? 'Hiện không có mô hình nào khả dụng.'
      : atLimit
        ? `Bạn đã có ${data.keyPolicy.maxActiveKeys} khóa đang hoạt động. Hãy thu hồi một khóa để tạo mới.`
        : maxBudget < data.keyPolicy.minBudgetCents
          ? `Bạn cần ít nhất ${usd(Math.ceil(data.keyPolicy.minBudgetCents * maxMult))} AI Credit.`
          : !models.length
            ? 'Hãy chọn ít nhất một mô hình.'
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
      toastError(err, 'Không thể tạo khóa');
      refresh();
    },
  });

  return (
    <section className="card" style={{ padding: 20, display: 'grid', gap: 14, alignContent: 'start' }}>
      <div>
        <h3 style={{ fontSize: 15 }}>2 · Tạo khóa API</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Phân bổ AI Credit vào khóa API giới hạn cho các mô hình bạn chọn. Khóa hết hạn sau{' '}
          {data.keyPolicy.ttlDays} ngày.
        </p>
      </div>
      {data.models.length ? (
        <div className="stack" style={{ gap: 8 }} role="group" aria-label="Danh sách mô hình">
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
                    <span className="pill pill-success">Tỷ lệ chuẩn</span>
                  )}
                </div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{m.displayName}</span>
                {m.description ? (
                  <span className="muted" style={{ fontSize: 12 }}>
                    {m.description}
                  </span>
                ) : null}
                <span className="muted" style={{ fontSize: 12 }}>
                  {m.rpm} yêu cầu/phút · {num(m.tpm)} token/phút
                  {m.contextLimit ? ` · tối đa ${num(m.contextLimit)} token` : ''}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Bot size={22} />}
          title="Chưa có mô hình nào"
          body="Quản trị viên chưa kích hoạt mô hình nào. Hãy quay lại sau nhé."
        />
      )}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="key-label">Tên khóa</label>
          <input
            id="key-label"
            className="input"
            maxLength={40}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="key-budget">Ngân sách (USD)</label>
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
        Dùng {usd(cost)} trong {usd(data.balances.aiCreditCents)} AI Credit · {data.keyPolicy.activeKeys}/
        {data.keyPolicy.maxActiveKeys} khóa đang hoạt động
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
        <KeyRound size={16} /> Tạo khóa với hạn mức {usd(budget)}
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
        <h3>Danh sách khóa của bạn</h3>
        <span className="muted" style={{ fontSize: 12 }}>
          Mức sử dụng đồng bộ từ cổng gateway khoảng 1 phút/lần.
        </span>
      </div>
      {data.keys.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<KeyRound size={22} />}
            title="Chưa có khóa nào"
            body="Tạo khóa ở trên để nhận Base URL và khóa API có thể dùng trong mọi ứng dụng tương thích OpenAI."
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Khóa</th>
                <th>Trạng thái</th>
                <th>Mô hình</th>
                <th className="num">Còn lại</th>
                <th style={{ width: 160 }}>Đã dùng</th>
                <th>Hết hạn</th>
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
                      Chi tiết
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
        <Button size="sm" onClick={() => void copy(ex[tab], 'Đoạn mã mẫu')}>
          <Copy size={14} /> Sao chép ví dụ
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
      title="Khóa API mới của bạn"
      description="Hãy sao chép ngay bây giờ. Vì lý do bảo mật, khóa đầy đủ chỉ hiển thị một lần duy nhất."
      onClose={onClose}
      width={680}
      footer={
        <Button variant="primary" onClick={onClose}>
          {copied ? 'Xong' : 'Tôi đã lưu khóa an toàn'}
        </Button>
      }
    >
      <div className="callout callout-warn">
        <AlertTriangle size={18} />
        <div>
          Hãy bảo mật khóa này như mật khẩu. Bất kỳ ai có khóa đều có thể sử dụng hạn mức của bạn. Nếu bị lộ,
          hãy thu hồi hoặc đổi khóa ngay.
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
          <span className="k">Khóa API</span>
          <span className="v">{revealed ? result.apiKey : masked}</span>
          <div className="row" style={{ gap: 4 }}>
            <Button
              size="sm"
              variant="ghost"
              aria-label={revealed ? 'Ẩn khóa' : 'Hiện khóa'}
              onClick={() => setRevealed(!revealed)}
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                void copy(result.apiKey, 'Khóa API');
                setCopied(true);
              }}
            >
              <Copy size={14} /> Sao chép khóa
            </Button>
          </div>
        </div>
        <div className="console-row">
          <span className="k">Mô hình</span>
          <span className="v">{result.models.join(', ')}</span>
          <span />
        </div>
        <div className="console-row">
          <span className="k">Hạn mức</span>
          <span className="v">
            ${result.budgetUsd.toFixed(2)} · hết hạn {formatDate(result.expiresAt)}
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
        .toast({ kind: 'success', title: 'Đã thu hồi khóa', body: 'Khóa đã ngừng hoạt động ngay lập tức.' });
      void qc.invalidateQueries({ queryKey: qk.ai });
      onClose();
    },
    onError: (err) => toastError(err, 'Không thể thu hồi khóa'),
  });
  const rotate = useMutation({
    mutationFn: () => api<NewKeyResult>(`/ai/keys/${keyId}/rotate`, { body: {} }),
    onSuccess: (r) => {
      refresh();
      onRotated(r);
    },
    onError: (err) => toastError(err, 'Không thể đổi khóa'),
  });
  if (!key) return null;
  const usable = key.status === 'active';
  return (
    <Modal
      title={key.label}
      description={`${key.keyPreview ?? ''} · tạo ngày ${formatDate(key.createdAt)}`}
      onClose={onClose}
      width={720}
    >
      {key.status === 'suspended' ? (
        <div className="callout callout-danger">
          <AlertTriangle size={18} />
          <div>
            Khóa này đã bị tạm đình chỉ
            {key.suspendedReason?.startsWith('auto:')
              ? ' do phát hiện được sử dụng từ nhiều vị trí khác nhau cùng lúc'
              : ''}
            . Vui lòng liên hệ hỗ trợ hoặc đổi khóa mới.
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
          <span className="k">Khóa API</span>
          <span className="v">{key.keyPreview} (đã ẩn — chỉ hiển thị một lần khi tạo)</span>
          <span />
        </div>
        <div className="console-row">
          <span className="k">Mô hình</span>
          <span className="v">{key.models.join(', ')}</span>
          <Button size="sm" variant="ghost" onClick={() => void copy(key.models[0] ?? '', 'Tên mô hình')}>
            <Copy size={14} />
          </Button>
        </div>
        <div className="console-row">
          <span className="k">Hạn mức</span>
          <span className="v">
            {usd(Math.floor(key.remainingCents))} còn lại trong {usd(key.budgetCents)}
          </span>
          <span />
        </div>
        <div className="console-row">
          <span className="k">Giới hạn</span>
          <span className="v">
            {key.rpm} yêu cầu/phút · {num(key.tpm)} token/phút
          </span>
          <span />
        </div>
        <div className="console-row">
          <span className="k">Hết hạn</span>
          <span className="v">{formatDate(key.expiresAt)}</span>
          <span />
        </div>
      </div>
      <section>
        <div className="section-title">
          <h3>Mức sử dụng</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            {num(totals.req)} yêu cầu · {num(totals.tok)} token
          </span>
        </div>
        {usage.isPending ? (
          <div className="skeleton" style={{ height: 80 }} />
        ) : usage.isError ? (
          <ErrorState error={usage.error} onRetry={() => void usage.refetch()} />
        ) : usage.data.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Chưa ghi nhận yêu cầu nào. Mức sử dụng có thể mất 1–2 phút để hiển thị sau khi bạn gọi API.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Mô hình</th>
                  <th className="num">Số yêu cầu</th>
                  <th className="num">Token vào / ra</th>
                  <th className="num">Chi phí</th>
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
          <strong>Quản lý khóa</strong>
          <div className="row wrap">
            <Button
              onClick={() => setConfirm('rotate')}
              disabled={key.status !== 'active'}
              title={key.status !== 'active' ? 'Chỉ những khóa còn hạn mức mới có thể đổi' : undefined}
            >
              <RefreshCw size={15} /> Đổi khóa mới
            </Button>
            <Button variant="danger" onClick={() => setConfirm('revoke')}>
              <Trash2 size={15} /> Thu hồi khóa
            </Button>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            Đổi khóa sẽ cấp một bí mật mới với hạn mức còn lại và vô hiệu hóa khóa cũ ngay lập tức. Thu hồi sẽ
            hủy khóa vĩnh viễn; hạn mức chưa dùng sẽ không được hoàn lại.
          </span>
        </div>
      ) : null}
      {confirm === 'revoke' ? (
        <ConfirmDialog
          danger
          title="Thu hồi khóa này?"
          body={`Các ứng dụng sử dụng ${key.keyPreview} sẽ ngừng hoạt động ngay lập tức. Hạn mức còn lại ${usd(Math.floor(key.remainingCents))} trên khóa này sẽ bị hủy.`}
          confirmLabel="Thu hồi khóa"
          loading={revoke.isPending}
          onConfirm={() => revoke.mutate()}
          onClose={() => setConfirm(null)}
        />
      ) : null}
      {confirm === 'rotate' ? (
        <ConfirmDialog
          title="Đổi khóa mới?"
          body="Bạn sẽ nhận được mã bí mật mới với cùng danh sách mô hình và hạn mức còn lại. Khóa hiện tại sẽ ngừng hoạt động ngay, hãy cập nhật lại ứng dụng sau khi đổi."
          confirmLabel="Đổi khóa"
          loading={rotate.isPending}
          onConfirm={() => rotate.mutate()}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </Modal>
  );
}
