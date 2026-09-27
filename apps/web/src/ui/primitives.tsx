import { AlertTriangle, Check, CircleAlert, Info, Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../lib/api';
import { useUi } from '../lib/store';

export function Spinner({ label = 'Đang tải' }: { label?: string }) {
  return <span className="spinner" role="status" aria-label={label} />;
}

export function Button({
  variant = 'secondary',
  size,
  loading,
  block,
  children,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'reward';
  size?: 'sm' | 'lg';
  loading?: boolean;
  block?: boolean;
}) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${block ? 'btn-block' : ''} ${className}`}
    >
      {loading ? (
        <Loader2 size={16} className="spin-icon" style={{ animation: 'spin .7s linear infinite' }} />
      ) : null}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  width,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(
      'input, select, textarea, button:not([data-close])',
    );
    (first ?? ref.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && ref.current) {
        const nodes = [
          ...ref.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ].filter((n) => !n.hasAttribute('disabled'));
        if (!nodes.length) return;
        const firstN = nodes[0]!;
        const lastN = nodes[nodes.length - 1]!;
        if (e.shiftKey && document.activeElement === firstN) {
          e.preventDefault();
          lastN.focus();
        } else if (!e.shiftKey && document.activeElement === lastN) {
          e.preventDefault();
          firstN.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [onClose]);
  return createPortal(
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        ref={ref}
        tabIndex={-1}
        style={width ? { width: `min(${width}px, 100%)` } : undefined}
      >
        <div className="modal-head">
          <div className="stack" style={{ gap: 4 }}>
            <h2 id={id}>{title}</h2>
            {description ? <p className="muted">{description}</p> : null}
          </div>
          <IconButton label="Đóng" onClick={onClose} data-close>
            <X size={18} />
          </IconButton>
        </div>
        {children ? <div className="modal-body">{children}</div> : null}
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  loading,
  onConfirm,
  onClose,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="muted">{body}</div>
    </Modal>
  );
}

export function Panel({
  icon,
  eyebrow,
  title,
  actions,
  onClose,
  children,
}: {
  icon: ReactNode;
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.backdrop')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <section className="panel" role="dialog" aria-labelledby={id}>
      <header className="panel-head">
        <div className="panel-title">
          <div className="panel-icon">{icon}</div>
          <div>
            {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
            <h2 id={id}>{title}</h2>
          </div>
        </div>
        <div className="row" style={{ marginLeft: 'auto' }}>
          {actions}
          <IconButton label="Đóng bảng (Esc)" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="state">
      <div className="state-icon">{icon}</div>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : 'Đã xảy ra sự cố không mong muốn.';
  const forbidden = error instanceof ApiError && error.status === 403;
  return (
    <div className="state state-error" role="alert">
      <div className="state-icon">
        <CircleAlert size={22} />
      </div>
      <h3>{forbidden ? 'Bạn không có quyền truy cập' : 'Không thể tải nội dung này'}</h3>
      <p>{message}</p>
      {onRetry && !forbidden ? (
        <Button onClick={onRetry} size="sm">
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: i === 0 ? 96 : 56 }} />
      ))}
    </div>
  );
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismissToast);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <div className="toast-icon">
            {t.kind === 'success' ? (
              <Check size={14} />
            ) : t.kind === 'error' ? (
              <AlertTriangle size={14} />
            ) : t.kind === 'reward' ? (
              <Sparkles size={14} />
            ) : (
              <Info size={14} />
            )}
          </div>
          <div>
            <strong>{t.title}</strong>
            {t.body ? <span>{t.body}</span> : null}
          </div>
          <button aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Progress({ value, max, tone }: { value: number; max: number; tone?: 'success' | 'reward' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={`progress ${tone ? `progress-${tone}` : ''}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function CoinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
      <rect x="2" y="0" width="4" height="8" fill="#c99a2e" />
      <rect x="0" y="2" width="8" height="4" fill="#c99a2e" />
      <rect x="1" y="1" width="6" height="6" fill="#c99a2e" />
      <rect x="2" y="1" width="4" height="6" fill="#f2c94c" />
      <rect x="1" y="2" width="6" height="4" fill="#f2c94c" />
      <rect x="3" y="2" width="1" height="4" fill="#fff3c4" />
    </svg>
  );
}

export function toastError(err: unknown, title = 'Đã có lỗi xảy ra') {
  useUi.getState().toast({ kind: 'error', title, body: err instanceof Error ? err.message : undefined });
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' });
}
