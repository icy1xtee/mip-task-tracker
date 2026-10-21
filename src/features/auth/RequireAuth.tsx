import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './useAuth';

export function BootScreen() {
  return (
    <div className="mip">
      <div className="boot" role="status" aria-label="Загружаем">
        <span className="spinner is-dark" aria-hidden="true" />
      </div>
    </div>
  );
}

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') return <BootScreen />;
  if (auth.status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
