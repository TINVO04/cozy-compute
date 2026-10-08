import { useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { AuthScreen } from './screens/Auth';
import { GameScreen } from './screens/Game';
import { session, setUnauthorizedHandler } from './lib/api';
import { useMe } from './lib/queries';
import { Spinner, Toasts } from './ui/primitives';

const AdminScreen = lazy(() => import('./screens/admin/Admin'));
const EditorApp = lazy(() => import('./editor/EditorApp'));

function FullLoader() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--primary)' }}>
      <Spinner />
    </div>
  );
}

export function App() {
  const [authState, setAuthState] = useState<{
    mode?: 'login' | 'register' | 'reverify';
    email?: string;
    message?: string;
  } | null>(() => {
    const raw = sessionStorage.getItem('cozy.auth_state');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    const lastEmail = localStorage.getItem('cozy.last_email');
    return lastEmail ? { mode: 'login', email: lastEmail } : null;
  });
  const [hasSession, setHasSession] = useState(() => Boolean(session.get()));
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler((hint) => {
      session.clear();
      qc.clear();
      setHasSession(false);
      const lastEmail = localStorage.getItem('cozy.last_email') || '';
      const state = hint ?? { mode: 'login' as const, email: lastEmail };
      setAuthState(state);
      sessionStorage.setItem('cozy.auth_state', JSON.stringify(state));
      navigate('/');
    });
  }, [qc, navigate]);

  return (
    <>
      {hasSession ? (
        <Authed
          onSignedOut={(hint) => {
            session.clear();
            qc.clear();
            setHasSession(false);
            if (hint) {
              setAuthState(hint);
              sessionStorage.setItem('cozy.auth_state', JSON.stringify(hint));
            } else {
              const lastEmail = localStorage.getItem('cozy.last_email') || '';
              setAuthState({ mode: 'login', email: lastEmail });
              sessionStorage.removeItem('cozy.auth_state');
            }
          }}
        />
      ) : (
        <AuthScreen
          initialMode={authState?.mode}
          initialEmail={authState?.email}
          initialMessage={authState?.message}
          onSignedIn={() => {
            setHasSession(true);
            setAuthState(null);
            sessionStorage.removeItem('cozy.auth_state');
          }}
        />
      )}
      <Toasts />
    </>
  );
}

function Authed({
  onSignedOut,
}: {
  onSignedOut: (hint?: { mode: 'login' | 'register' | 'reverify'; email: string; message?: string }) => void;
}) {
  const me = useMe();

  useEffect(() => {
    if (me.data?.email) {
      localStorage.setItem('cozy.last_email', me.data.email);
    }
    if (me.data && !me.data.emailVerified) {
      onSignedOut({
        mode: 'reverify',
        email: me.data.email,
        message:
          'Tài khoản của bạn đã bị quản trị viên yêu cầu xác thực lại email. Mã OTP 6 chữ số đã được gửi tới email của bạn.',
      });
    }
  }, [me.data, onSignedOut]);

  if (me.isPending) return <FullLoader />;
  if (me.isError || !me.data) {
    return (
      <div className="state" style={{ height: '100vh' }}>
        <h3>Không thể tải thông tin tài khoản</h3>
        <p>{me.error instanceof Error ? me.error.message : ''}</p>
        <div className="row">
          <button className="btn btn-primary" onClick={() => void me.refetch()}>
            Thử lại
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              session.clear();
              onSignedOut();
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<GameScreen me={me.data} onSignedOut={onSignedOut} />} />
      <Route
        path="/editor"
        element={
          <Suspense fallback={<FullLoader />}>
            <EditorApp />
          </Suspense>
        }
      />
      <Route
        path="/admin/*"
        element={
          me.data.role === 'admin' ? (
            <Suspense fallback={<FullLoader />}>
              <AdminScreen />
            </Suspense>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
