import { Navigate, Outlet, useLocation } from 'react-router';
import { LoadingState } from '@/components/ui/StateViews';
import { useAuth } from './useAuth';

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') return <LoadingState />;
  if (auth.status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
