import { DEFAULT_APPEARANCE } from '@cozy/game-data';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { drawAvatar } from '../art/avatar';
import { duckGrid } from '../art/items';
import { paintTown } from '../art/town';
import { api, ApiError, session, type Me } from '../lib/api';
import { Brand } from './Brand';
import { Button } from '../ui/primitives';

function HeroArt() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const town = paintTown();
    canvas.width = 640;
    canvas.height = 420;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(town, 15 * 32, 9 * 32, 640 / 2, 420 / 2, 0, 0, 640, 420);
    const people = [
      { x: 220, y: 250, a: { ...DEFAULT_APPEARANCE, hat: 'cone:#ef7a3a', top: 'suit:#2f3350', skin: 2 } },
      {
        x: 300,
        y: 270,
        a: {
          ...DEFAULT_APPEARANCE,
          hairStyle: 'bun' as const,
          hairColor: 5,
          top: 'hoodie:#e0735b',
          face: 'glasses:#2b2320',
          skin: 0,
        },
      },
      {
        x: 380,
        y: 240,
        a: {
          ...DEFAULT_APPEARANCE,
          hairStyle: 'spiky' as const,
          hairColor: 6,
          top: 'sweater:#3e9b7a',
          skin: 4,
        },
      },
    ];
    for (const p of people) drawAvatar(p.a, 0, 0).drawTo(ctx, p.x, p.y, 3);
    duckGrid().drawTo(ctx, 470, 300, 3);
  }, []);
  return <canvas ref={ref} aria-hidden />;
}

export function AuthScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  async function handleSendOtp() {
    if (!email || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ trước khi gửi mã OTP.');
      return;
    }
    setError(null);
    setInfoMessage(null);
    setSendingOtp(true);
    try {
      await api<{ ok: boolean; message: string }>('/auth/send-otp', {
        body: { email },
      });
      setOtpSent(true);
      setOtpCountdown(60);
      setInfoMessage('Mã OTP xác thực đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'email_taken') {
        setMode('login');
        setError('Tài khoản với email này đã tồn tại. Đã chuyển sang tab Đăng nhập.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Không thể gửi mã OTP. Vui lòng thử lại.');
      }
    } finally {
      setSendingOtp(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (mode === 'register' && !otp.trim()) {
      setError('Vui lòng bấm "Nhận mã OTP" và nhập mã xác thực gửi về email của bạn.');
      return;
    }

    setBusy(true);
    try {
      const res = await api<{ token: string; user: Me }>(
        mode === 'login' ? '/auth/login' : '/auth/register',
        {
          body: mode === 'login' ? { email, password } : { email, password, displayName, otp: otp.trim() },
        },
      );
      session.set(res.token);
      qc.setQueryData(['me'], res.user);
      onSignedIn();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'email_taken' && mode === 'register') {
        setMode('login');
        setError('Tài khoản với email này đã tồn tại. Đã chuyển sang tab Đăng nhập, vui lòng nhập mật khẩu.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth-art">
        <HeroArt />
        <div className="auth-copy">
          <Brand light />
          <h1>Xây dựng cuộc sống thú vị. Kiếm hạn mức AI thật.</h1>
          <p>
            Câu cá trên cầu tàu lắc lư, giao những kiện hàng đáng ngờ, trang hoàng căn hộ nhỏ — và biến thời
            gian trải nghiệm trong thị trấn thành hạn mức API AI để bạn sử dụng ở mọi nơi.
          </p>
          <div className="auth-points">
            <div>
              <strong>Chơi cùng nhau</strong>Thị trấn sống động với người chơi thực.
            </div>
            <div>
              <strong>Đậm chất riêng</strong>Trang phục, nội thất, căn hộ của riêng bạn.
            </div>
            <div>
              <strong>Phần thưởng thực</strong>Đổi Xu lấy hạn mức API AI chất lượng.
            </div>
          </div>
        </div>
      </section>
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="stack" style={{ gap: 6 }}>
            <h2>{mode === 'register' ? 'Gia nhập thị trấn' : 'Chào mừng trở lại'}</h2>
            <p className="muted">
              {mode === 'register'
                ? 'Tạo tài khoản để nhận ngay căn hộ khởi đầu và 300 Xu.'
                : 'Đăng nhập để tiếp tục cuộc phiêu lưu của bạn.'}
            </p>
          </div>
          <div className="tabs" role="tablist" aria-label="Tài khoản">
            <button
              type="button"
              role="tab"
              className="tab"
              style={{ flex: 1 }}
              aria-selected={mode === 'register'}
              onClick={() => setMode('register')}
            >
              Tạo tài khoản
            </button>
            <button
              type="button"
              role="tab"
              className="tab"
              style={{ flex: 1 }}
              aria-selected={mode === 'login'}
              onClick={() => setMode('login')}
            >
              Đăng nhập
            </button>
          </div>
          {mode === 'register' ? (
            <div className="field">
              <label htmlFor="name">Tên hiển thị</label>
              <input
                id="name"
                className="input"
                autoComplete="nickname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                minLength={3}
                maxLength={20}
                required
              />
              <span className="field-hint">3–20 ký tự. Mọi người trong thị trấn sẽ thấy tên này.</span>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="email">Email</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ flex: 1 }}
              />
              {mode === 'register' ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || otpCountdown > 0 || !email}
                  loading={sendingOtp}
                  style={{ whiteSpace: 'nowrap', minWidth: 110 }}
                >
                  {otpCountdown > 0 ? `${otpCountdown}s` : otpSent ? 'Gửi lại mã' : 'Nhận mã OTP'}
                </Button>
              ) : null}
            </div>
          </div>
          {mode === 'register' ? (
            <div className="field">
              <label htmlFor="otp">Mã xác thực OTP</label>
              <input
                id="otp"
                className="input"
                type="text"
                maxLength={6}
                placeholder="Nhập 6 số từ email"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <span className="field-hint">
                Bấm nút "Nhận mã OTP" ở trên. Mã sẽ được gửi vào hộp thư đến hoặc hòm thư Spam của bạn.
              </span>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {mode === 'register' ? <span className="field-hint">Tối thiểu 8 ký tự.</span> : null}
          </div>
          {infoMessage ? (
            <div className="callout callout-info" role="status">
              {infoMessage}
            </div>
          ) : null}
          {error ? (
            <div className="callout callout-danger" role="alert">
              {error}
            </div>
          ) : null}
          <Button type="submit" variant="primary" size="lg" block loading={busy}>
            {mode === 'register' ? 'Tạo tài khoản và vào thị trấn' : 'Đăng nhập'}
          </Button>
          <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
            Phần thưởng AI đến từ quỹ hạn mức hàng tuần có giới hạn và không có giá trị quy đổi tiền mặt.
          </p>
          {import.meta.env.DEV ? (
            <p className="muted" style={{ fontSize: 11, textAlign: 'center', opacity: 0.8 }}>
              💡 Lưu ý dev: Tài khoản đăng ký với <code>admin@cozy.local</code> sẽ nhận toàn quyền quản trị
              Admin.
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
