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
            Các upstream tương thích OpenAI mà người chơi có thể truy cập qua cổng Gateway. Khóa bí mật được
            lưu an toàn trên máy chủ Gateway.
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
            body="Thêm một mô hình triển khai để cho phép người chơi tạo khóa API."
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
                <th>Bí danh công khai</th>
                <th>Upstream</th>
                <th>Biến khóa bí mật</th>
                <th className="num">Hệ số AI Credit</th>
                <th className="num">$/Mtok vào·ra</th>
                <th className="num">RPM · TPM</th>
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
      title={isNew ? 'Thêm mô hình triển khai' : `Chỉnh sửa ${(model as Model).publicModelName}`}
      onClose={onClose}
      width={760}
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
        {input('displayName', 'Tên hiển thị')}
        {input('slug', 'Mã slug nội bộ', { mono: true, hint: 'Mã định danh nội bộ, vd: creator-pro' })}
        {input('publicModelName', 'Bí danh mô hình công khai', {
          mono: true,
          hint: 'Tên người chơi truyền vào trường "model".',
        })}
        <div className="field">
          <label htmlFor="m-prov">Giao thức API Upstream</label>
          <select
            id="m-prov"
            className="select"
            value={f.upstreamProvider}
            onChange={(e) => set('upstreamProvider', e.target.value)}
          >
            <option value="openai">Tương thích OpenAI</option>
            <option value="hosted_vllm">vLLM</option>
            <option value="ollama">Ollama</option>
            <option value="azure">Azure OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        {input('upstreamBaseUrl', 'URL gốc Upstream', {
          mono: true,
          full: true,
          hint: 'vd: https://my-provider.example/v1',
        })}
        {input('upstreamModelName', 'Tên mô hình Upstream', { mono: true })}
        {input('secretRef', 'Biến môi trường khóa bí mật', {
          mono: true,
          hint: 'Tên biến môi trường UPSTREAM_KEY_* trên máy chủ Gateway. Tuyệt đối không dán khóa trực tiếp.',
        })}
        {input('description', 'Mô tả cho người chơi', { full: true })}
        {input('creditMultiplier', 'Hệ số AI Credit', {
          type: 'number',
          step: '0.1',
          hint: '1 = $1 AI Credit mua $1 hạn mức.',
        })}
        {input('userMonthlyBudgetCents', 'Hạn mức tháng mỗi người chơi (cent)', {
          type: 'number',
          hint: 'Để trống = chỉ áp dụng hạn mức chung.',
        })}
        {input('inputCostPerMtok', 'Chi phí đầu vào $ / 1M token', { type: 'number', step: '0.01' })}
        {input('outputCostPerMtok', 'Chi phí đầu ra $ / 1M token', { type: 'number', step: '0.01' })}
        {input('rpm', 'Số yêu cầu / phút mỗi khóa (RPM)', { type: 'number' })}
        {input('tpm', 'Số token / phút mỗi khóa (TPM)', { type: 'number' })}
        {input('contextLimit', 'Số token đầu ra tối đa', { type: 'number', hint: 'Không bắt buộc.' })}
        <div className="field" style={{ alignContent: 'end', gap: 12 }}>
          <Switch checked={f.enabled} onChange={(v) => set('enabled', v)} label="Kích hoạt" />
          <Switch
            checked={f.allowExternalUse}
            onChange={(v) => set('allowExternalUse', v)}
            label="Cho phép người chơi tạo khóa"
          />
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        Chi phí người chơi ước tính: {usd(Math.round(Number(f.creditMultiplier) * 100))} AI Credit cho mỗi
        $1.00 hạn mức.
      </p>
      {err ? (
        <div className="callout callout-danger" role="alert">
          {err}
        </div>
      ) : null}
    </Modal>
  );
}
