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
  description: 'Mô hình AI tương thích OpenAI',
  publicModelName: '',
  upstreamProvider: 'openai',
  upstreamModelName: '',
  upstreamBaseUrl: 'http://host.docker.internal:3001/v1',
  secretRef: 'UPSTREAM_KEY_NEWAPI',
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
            Kết nối các mô hình AI từ New-API tương thích chuẩn OpenAI Compatible để cấp cho người dùng.
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
            body="Thêm một mô hình từ New-API để cấp quyền sử dụng cho người chơi."
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
                <th>Tên model hiển thị</th>
                <th>Base URL</th>
                <th>Key để giao cho người dùng</th>
                <th>Chuẩn API</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {models.data.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.displayName || m.publicModelName}</div>
                    <div className="muted" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                      {m.publicModelName}
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>{m.upstreamBaseUrl}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    <span className="pill">{m.secretRef}</span>
                  </td>
                  <td>
                    <span className="pill">OpenAI Compatible</span>
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
      const rawName = (f.displayName || f.publicModelName).trim();
      if (!rawName) throw new Error('Vui lòng nhập tên model hiển thị');
      const publicName = rawName
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '-')
        .slice(0, 60);
      let slug = rawName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .slice(0, 40);
      if (slug.length < 2) slug = `${slug || 'm'}-model`;
      const displayName = f.displayName.trim() || rawName;
      const upstreamModel = rawName;

      let upstreamBaseUrl = f.upstreamBaseUrl.trim();
      if (!upstreamBaseUrl) throw new Error('Vui lòng nhập Base URL');
      if (!/^https?:\/\//i.test(upstreamBaseUrl)) {
        upstreamBaseUrl = `http://${upstreamBaseUrl}`;
      }

      const secretRef = (f.secretRef || '').trim() || 'UPSTREAM_KEY_NEWAPI';
      if (!/^UPSTREAM_KEY_[A-Z0-9_]{1,40}$/.test(secretRef)) {
        throw new Error(
          'Key phải là tên biến môi trường máy chủ (ví dụ: UPSTREAM_KEY_NEWAPI hoặc UPSTREAM_KEY_1). API Key thực tế (sk-...) cần được lưu trong file .env trên máy chủ.',
        );
      }

      const body = {
        slug,
        displayName,
        description: f.description.trim() || `Mô hình AI ${displayName}`,
        publicModelName: publicName,
        upstreamProvider: 'openai',
        upstreamModelName: upstreamModel,
        upstreamBaseUrl,
        secretRef,
        enabled: f.enabled,
        allowExternalUse: true,
        creditMultiplier: 1,
        inputCostPerMtok: 0,
        outputCostPerMtok: 0,
        rpm: 60,
        tpm: 100000,
        contextLimit: null,
        userMonthlyBudgetCents: null,
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
        body: 'Mô hình tương thích OpenAI đã sẵn sàng cấp cho người dùng.',
      });
      onClose();
    },
    onError: (e) => {
      setErr(e instanceof Error ? e.message : 'Lưu thất bại');
      void qc.invalidateQueries({ queryKey: ['admin', 'models'] });
    },
  });

  return (
    <Modal
      title={isNew ? 'Thêm mô hình AI' : `Chỉnh sửa ${f.displayName || (model as Model).publicModelName}`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            {isNew ? 'Thêm mô hình' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field full">
          <label htmlFor="m-displayName">Tên model hiển thị</label>
          <input
            id="m-displayName"
            className="input"
            value={f.displayName}
            onChange={(e) => {
              set('displayName', e.target.value);
              set('publicModelName', e.target.value);
            }}
            placeholder="vd: gpt-4o, claude-3-5-sonnet, gemini-2.5-flash"
            autoFocus
          />
          <span className="field-hint">
            Tên định danh mô hình hiển thị cho người chơi trong game (vd: gpt-4o).
          </span>
        </div>

        <div className="field full">
          <label htmlFor="m-baseUrl">Base URL</label>
          <input
            id="m-baseUrl"
            className="input"
            style={{ fontFamily: 'var(--font-mono)' }}
            value={f.upstreamBaseUrl}
            onChange={(e) => set('upstreamBaseUrl', e.target.value)}
            placeholder="http://host.docker.internal:3001/v1"
          />
          <span className="field-hint">
            Địa chỉ Base URL cổng API New-API hoặc nhà cung cấp tương thích OpenAI.
          </span>
        </div>

        <div className="field full">
          <label htmlFor="m-secret">Key để giao cho người dùng</label>
          <input
            id="m-secret"
            className="input"
            list="key-options"
            style={{ fontFamily: 'var(--font-mono)' }}
            value={f.secretRef}
            onChange={(e) => set('secretRef', e.target.value)}
            placeholder="UPSTREAM_KEY_NEWAPI"
          />
          <datalist id="key-options">
            <option value="UPSTREAM_KEY_NEWAPI">UPSTREAM_KEY_NEWAPI (Khóa New-API)</option>
            <option value="UPSTREAM_KEY_1">UPSTREAM_KEY_1 (Khóa mặc định)</option>
            <option value="UPSTREAM_KEY_2">UPSTREAM_KEY_2</option>
            <option value="UPSTREAM_KEY_3">UPSTREAM_KEY_3</option>
          </datalist>
          <span className="field-hint">
            Tên biến môi trường API Key trong file .env trên máy chủ (mặc định: UPSTREAM_KEY_NEWAPI).
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--surface-2)',
            borderRadius: 8,
            border: '1px solid var(--line-1)',
          }}
        >
          <Zap size={16} style={{ color: 'var(--accent)' }} />
          <div style={{ fontSize: 13, lineHeight: 1.4 }}>
            <div>
              Chuẩn kết nối: <strong>OpenAI Compatible</strong>
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              Tự động tương thích hoàn toàn với New-API, chi phí và token do New-API quản lý.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 4 }}>
          <Switch checked={f.enabled} onChange={(v) => set('enabled', v)} label="Kích hoạt mô hình ngay" />
        </div>
      </div>

      {err ? (
        <div className="callout callout-danger" role="alert" style={{ marginTop: 14 }}>
          {err}
        </div>
      ) : null}
    </Modal>
  );
}
