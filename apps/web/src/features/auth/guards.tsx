import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useAuth } from './AuthProvider';

/** Account screens for visitors: a signed-in player goes straight to the game. */
export function SignedOutOnly({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.status === 'loading') return null;
  if (auth.status === 'signedIn') return <Navigate to="/" replace />;
  return children;
}
