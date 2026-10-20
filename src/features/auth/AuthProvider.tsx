import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState, type ReactNode } from 'react';
import { getFirebase } from '@/lib/firebase/client';
import { AuthContext, type AuthState } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(
    () =>
      onAuthStateChanged(getFirebase().auth, (user) => {
        setState(user ? { status: 'signedIn', user } : { status: 'signedOut' });
      }),
    [],
  );

  return <AuthContext value={state}>{children}</AuthContext>;
}
