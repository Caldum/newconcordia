import type { Session } from '@supabase/auth-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { supabase } from '../../lib/supabase';

export type AuthState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; session: Session };

const AuthContext = createContext<AuthState | null>(null);

/** Follows the Supabase session: who is signed in on this browser, if anyone. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    // The listener gets the stored session first (INITIAL_SESSION) and every change after it. It must
    // not call Supabase itself: the client holds a lock while it runs.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState(session ? { status: 'signedIn', session } : { status: 'signedOut' });
      if (event === 'SIGNED_OUT') queryClient.removeQueries({ queryKey: ['me'] });
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const state = use(AuthContext);
  if (!state) throw new Error('useAuth must be used inside <AuthProvider>');
  return state;
}
