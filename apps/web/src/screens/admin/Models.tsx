import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus, RefreshCw, Zap } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';
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
  upstreamBaseUrl: 'http://host.docker.internal:3001/v1',
  secretRef: 'UPSTREAM_KEY_1',
  enabled: true,
  allowExternalUse: true,
  creditMultiplier: 1,
  inputCostPerMtok: 0,
  outputCostPerMtok: 0,
  rpm: 60,
  tpm: 100000,
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
        title: r.ok ? `Cổng Gateway OK (${r.latencyMs} ms)` : 'Kiểm tra upstream thất bại',
        body: r.message,
      }),
    onError: (err) => toastError(err),
  });
  const sync = useMutation({
    mutationFn: (id: string) => api(`/admin/models/${id}/sync`, { body: {} }),
    onSuccess: () => {
      useUi.getState().toast({ kind: 'success', title: 'Đã đồng bộ Gateway' });
      void qc.invalidateQueries({ queryKey: ['admin', 'models'] });
    },
    onError: (err) => toastError(err, 'Đồng bộ thất bại'),
  });
  return (
    <div className="stack-lg">
      <header className="admin-head">
        <div>
          <h1>Mô hình AI</h1>
          <p className="muted">
            Kết nối các mô hình AI từ New-API hoặc nhà cung cấp tương thích OpenAI. Chi phí token và hạn mức
            đã do New-API tự động quản lý.
          </p>
        </div>
        <Button variant="primary" onClick={() => setEditing(BLANK)}>
          <Plus size={16} /> Thêm mô hình
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
            title="Chưa cấu hình mô hình nào"
            body="Thêm một mô hình từ New-API để cho phép người chơi tạo khóa API."
            action={
              <Button variant="primary" onClick={() => setEditing(BLANK)}>
                Thêm mô hình
              </Button>
            }
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mô hình</th>
                <th>Base URL (New-API / Upstream)</th>
                <th>Khóa (Key)</th>
                <th>Trạng thái</th>
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
                    <div style={{ fontFamily: 'var(--font-mono)' }}>{m.upstreamBaseUrl}</div>
                    <div className="muted">
                      {m.upstreamProvider}/{m.upstreamModelName}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    <span className="pill">{m.secretRef}</span>
                  </td>
                  <td>
                    <div className="row wrap" style={{ gap: 4 }}>
                      <span className={`pill ${m.enabled ? 'pill-success' : ''}`}>
                        {m.enabled ? 'Đang bật' : 'Đã tắt'}
                      </span>
                      {!m.gatewaySyncedAt ? <span className="pill pill-danger">Chưa đồng bộ</span> : null}
                    </div>
                  </td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={test.isPending && test.variables === m.id}
                        onClick={() => test.mutate(m.id)}
                        title="Gửi một yêu cầu kiểm tra nhỏ qua cổng Gateway"
                      >
                        <Zap size={14} /> Kiểm tra
                      </Button>
                      {!m.gatewaySyncedAt ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={sync.isPending}
                          onClick={() => sync.mutate(m.id)}
                        >
                          <RefreshCw size={14} /> Thử lại đồng bộ
                        </Button>
                      ) : null}
                      <Button size="sm" onClick={() => setEditing(m)}>
                        Chỉnh sửa
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
      const publicName = f.publicModelName.trim().toLowerCase();
      const slug = (f.slug.trim() || publicName).replace(/[^a-z0-9-]/g, '-').slice(0, 40);
      const displayName = f.displayName.trim() || f.publicModelName.trim();
      const upstreamModel = f.upstreamModelName.trim() || f.publicModelName.trim();
      const body = {
        slug,
        displayName,
        description: f.description.trim(),
        publicModelName: publicName,
        upstreamProvider: f.upstreamProvider || 'openai',
        upstreamModelName: upstreamModel,
        upstreamBaseUrl: f.upstreamBaseUrl.trim(),
        secretRef: f.secretRef.trim() || 'UPSTREAM_KEY_1',
        enabled: f.enabled,
        allowExternalUse: f.allowExternalUse,
        creditMultiplier: Number(f.creditMultiplier) || 1,
        inputCostPerMtok: Number(f.inputCostPerMtok) || 0,
        outputCostPerMtok: Number(f.outputCostPerMtok) || 0,
        rpm: Number(f.rpm) || 60,
        tpm: Number(f.tpm) || 100000,
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
        title: isNew ? 'Đã tạo mô hình' : 'Đã cập nhật mô hình',
        body: 'Thay đổi đã được ghi vào nhật ký kiểm toán.',
      });
      onClose();
    },
    onError: (e) => {
      setErr(e instanceof Error ? e.message : 'Lưu thất bại');
      void qc.invalidateQueries({ queryKey: ['admin', 'models'] });
    },
  });
  const input = (
    k: keyof typeof f,
    label: string,
    opts: {
      type?: string;
      hint?: string;
      mono?: boolean;
      full?: boolean;
      step?: string;
      placeholder?: string;
    } = {},
  ) => (
    <div className={`field ${opts.full ? 'full' : ''}`}>
      <label htmlFor={`m-${String(k)}`}>{label}</label>
      <input
        id={`m-${String(k)}`}
        className="input"
        type={opts.type ?? 'text'}
        step={opts.step}
        placeholder={opts.placeholder}
        style={opts.mono ? { fontFamily: 'var(--font-mono)' } : undefined}
        value={(f[k] as string | number | null) ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          set(k, (opts.type === 'number' ? (val === '' ? null : val) : val) as never);
          if (k === 'publicModelName' && isNew) {
            if (!f.displayName || f.displayName === f.publicModelName) {
              set('displayName', val as never);
            }
          }
        }}
      />
      {opts.hint ? <span className="field-hint">{opts.hint}</span> : null}
    </div>
  );

  return (
    <Modal
      title={isNew ? 'Thêm mô hình AI' : `Chỉnh sửa ${(model as Model).publicModelName}`}
      onClose={onClose}
      width={680}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            {isNew ? 'Tạo mô hình' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {input('publicModelName', 'Tên mô hình (Model ID)', {
          mono: true,
          placeholder: 'vd: gpt-4o, claude-3-5-sonnet, gemini-2.5-flash',
          hint: 'Tên mô hình được New-API hỗ trợ mà người chơi gọi trong API.',
        })}
        {input('displayName', 'Tên hiển thị (Tùy chọn)', {
          placeholder: 'vd: GPT-4o Omni',
          hint: 'Tên thân thiện hiển thị trên giao diện trò chơi. Mặc định giống Tên mô hình.',
        })}
        {input('upstreamBaseUrl', 'Base URL (New-API / Upstream)', {
          mono: true,
          full: true,
          placeholder: 'http://host.docker.internal:3001/v1 hoặc http://localhost:3001/v1',
          hint: 'Địa chỉ cổng New-API hoặc nhà cung cấp API tương thích OpenAI.',
        })}
        <div className="field">
          <label htmlFor="m-secret">Khóa API (Key Reference)</label>
          <input
            id="m-secret"
            className="input"
            list="key-options"
            style={{ fontFamily: 'var(--font-mono)' }}
            value={f.secretRef}
            onChange={(e) => set('secretRef', e.target.value)}
            placeholder="UPSTREAM_KEY_1"
          />
          <datalist id="key-options">
            <option value="UPSTREAM_KEY_1">UPSTREAM_KEY_1 (Khóa mặc định)</option>
            <option value="UPSTREAM_KEY_NEWAPI">UPSTREAM_KEY_NEWAPI (Khóa New-API)</option>
            <option value="UPSTREAM_KEY_2">UPSTREAM_KEY_2</option>
            <option value="UPSTREAM_KEY_3">UPSTREAM_KEY_3</option>
            <option value="UPSTREAM_KEY_MOCK">UPSTREAM_KEY_MOCK (Mock Dev)</option>
          </datalist>
          <span className="field-hint">
            Tên biến môi trường chứa API Key trong file .env trên máy chủ (mặc định: UPSTREAM_KEY_1 hoặc
            UPSTREAM_KEY_NEWAPI).
          </span>
        </div>
        <div className="field">
          <label htmlFor="m-prov">Giao thức API</label>
          <select
            id="m-prov"
            className="select"
            value={f.upstreamProvider}
            onChange={(e) => set('upstreamProvider', e.target.value)}
          >
            <option value="openai">Tương thích OpenAI (New-API / One-API)</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
            <option value="azure">Azure OpenAI</option>
            <option value="ollama">Ollama</option>
            <option value="hosted_vllm">vLLM</option>
          </select>
        </div>
        {input('description', 'Mô tả mô hình cho người chơi', {
          full: true,
          placeholder: 'vd: Mô hình AI thông minh tốc độ cao kết nối qua New-API',
        })}
        <div
          className="field full"
          style={{ display: 'flex', flexDirection: 'row', gap: 24, padding: '4px 0' }}
        >
          <Switch checked={f.enabled} onChange={(v) => set('enabled', v)} label="Kích hoạt mô hình" />
          <Switch
            checked={f.allowExternalUse}
            onChange={(v) => set('allowExternalUse', v)}
            label="Cho phép người chơi tạo khóa"
          />
        </div>

        <details
          style={{
            gridColumn: '1 / -1',
            border: '1px solid var(--line-2)',
            borderRadius: 9,
            padding: '12px 16px',
            background: 'var(--surface-2)',
            marginTop: 8,
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              userSelect: 'none',
              color: 'var(--ink-2)',
            }}
          >
            ⚙️ Cài đặt chi phí & giới hạn nâng cao (Tùy chọn - mặc định do New-API lo)
          </summary>
          <div className="form-grid" style={{ marginTop: 14 }}>
            {input('slug', 'Mã slug nội bộ', {
              mono: true,
              hint: 'Để trống sẽ tự động lấy theo tên mô hình.',
            })}
            {input('upstreamModelName', 'Tên mô hình Upstream riêng', {
              mono: true,
              hint: 'Nếu khác tên mô hình công khai.',
            })}
            {input('creditMultiplier', 'Hệ số AI Credit', {
              type: 'number',
              step: '0.1',
              hint: '1 = $1 AI Credit mua $1 hạn mức.',
            })}
            {input('userMonthlyBudgetCents', 'Hạn mức tháng mỗi người chơi (cent)', {
              type: 'number',
              hint: 'Để trống = áp dụng hạn mức chung.',
            })}
            {input('inputCostPerMtok', 'Chi phí đầu vào $ / 1M token', { type: 'number', step: '0.01' })}
            {input('outputCostPerMtok', 'Chi phí đầu ra $ / 1M token', { type: 'number', step: '0.01' })}
            {input('rpm', 'Số yêu cầu / phút mỗi khóa (RPM)', { type: 'number' })}
            {input('tpm', 'Số token / phút mỗi khóa (TPM)', { type: 'number' })}
            {input('contextLimit', 'Số token đầu ra tối đa', { type: 'number', hint: 'Không bắt buộc.' })}
          </div>
        </details>
      </div>
      {err ? (
        <div className="callout callout-danger" role="alert" style={{ marginTop: 14 }}>
          {err}
        </div>
      ) : null}
    </Modal>
  );
}
