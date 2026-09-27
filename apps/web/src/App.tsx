import { useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { AuthScreen } from './screens/Auth';
import { GameScreen } from './screens/Game';
import { session, setUnauthorizedHandler } from './lib/api';
import { useMe } from './lib/queries';
import { Spinner, Toasts } from './ui/primitives';

const AdminScreen = lazy(() => import('./screens/admin/Admin'));

function FullLoader() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--primary)' }}>
      <Spinner />
    </div>
  );
}

export function App() {
  const [hasSession, setHasSession] = useState(() => Boolean(session.get()));
  const qc = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => {
    setUnauthorizedHandler(() => {
      session.clear();
      qc.clear();
      setHasSession(false);
      navigate('/');
    });
  }, [qc, navigate]);

  return (
    <>
      {hasSession ? (
        <Authed onSignedOut={() => setHasSession(false)} />
      ) : (
        <AuthScreen onSignedIn={() => setHasSession(true)} />
      )}
      <Toasts />
    </>
  );
}

function Authed({ onSignedOut }: { onSignedOut: () => void }) {
  const me = useMe();
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
