import { Delete, KeyRound, Lock, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { net } from '../../game/net';
import { api, ApiError } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button } from '../../ui/primitives';

export function FarmPasswordModal({ onClose }: { onClose: () => void }) {
  const farmOwnerId = useUi((s) => s.farmOwnerId);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!farmOwnerId) {
      setError('Thiếu mã trang trại của chủ nhà.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; farmAuthToken: string }>('/api/farm/auth', {
        method: 'POST',
        body: { farmOwnerId, password },
      });
      play('coin');
      useUi
        .getState()
        .toast({ kind: 'success', title: 'Xác thực thành công!', body: 'Đang vào trang trại...' });
      onClose();
      void net.goFarm(farmOwnerId, 'Trang Trại Bạn Bè', res.farmAuthToken);
    } catch (err) {
      play('error');
      if (err instanceof ApiError) {
        setError(err.message || 'Mật khẩu trang trại không chính xác.');
      } else {
        setError('Không thể kết nối đến máy chủ.');
      }
    } finally {
      setLoading(false);
    }
  }, [farmOwnerId, password, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSubmit, onClose]);

  const pressNum = (num: string) => {
    play('click');
    if (password.length < 16) {
      setPassword((p) => p + num);
      setError(null);
    }
  };

  const pressBack = () => {
    play('click');
    setPassword((p) => p.slice(0, -1));
    setError(null);
  };

  const pressClear = () => {
    play('click');
    setPassword('');
    setError(null);
  };

  return (
    <div
      className="backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Mật Khẩu Trang Trại"
    >
      <div
        className="panel"
        style={{
          maxWidth: 420,
          background: 'linear-gradient(180deg, #2e1c10 0%, #1c1008 100%)',
          borderColor: '#b45309',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(245, 158, 11, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header" style={{ borderBottomColor: '#78350f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={20} color="#f59e0b" />
            <span style={{ color: '#fef3c7', fontWeight: 700, fontSize: 16 }}>Trang Trại Riêng Tư</span>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Đóng (Esc)">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: '#d4b996', fontSize: 13, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>
            Trang trại này đã được chủ nhà cài đặt bảo mật mật khẩu. Vui lòng nhập mật khẩu để vào tham quan.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#0c0704',
              border: '2px solid #78350f',
              borderRadius: 8,
              padding: '10px 14px',
              gap: 10,
            }}
          >
            <KeyRound size={18} color="#d97706" />
            <input
              type="password"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoFocus
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fef08a',
                fontSize: 16,
                letterSpacing: 4,
                outline: 'none',
              }}
            />
          </div>

          {error ? (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          ) : null}

          {/* Virtual Numeric Keypad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pressNum(n)}
                style={{
                  background: '#3d2414',
                  border: '1px solid #92400e',
                  color: '#fef08a',
                  padding: '12px 0',
                  borderRadius: 6,
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={pressClear}
              style={{
                background: '#451a03',
                border: '1px solid #78350f',
                color: '#fca5a5',
                padding: '12px 0',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Xóa hết
            </button>
            <button
              type="button"
              onClick={() => pressNum('0')}
              style={{
                background: '#3d2414',
                border: '1px solid #92400e',
                color: '#fef08a',
                padding: '12px 0',
                borderRadius: 6,
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              0
            </button>
            <button
              type="button"
              onClick={pressBack}
              style={{
                background: '#451a03',
                border: '1px solid #78350f',
                color: '#fde047',
                padding: '12px 0',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Delete size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Button
              variant="ghost"
              onClick={onClose}
              style={{ flex: 1, borderColor: '#78350f', color: '#d4b996' }}
            >
              Quay lại thị trấn
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSubmit()}
              disabled={loading || password.length === 0}
              style={{
                flex: 1,
                background: '#d97706',
                borderColor: '#b45309',
                color: '#1c1917',
                fontWeight: 700,
              }}
            >
              {loading ? 'Đang kiểm tra...' : 'Vào Trang Trại'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
