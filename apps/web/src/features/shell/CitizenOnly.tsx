import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useMessages } from '../../i18n';
import { useStaff } from '../admin/queries';
import { useAuth } from '../auth/AuthProvider';
import { useCitizen } from '../auth/useCitizen';

import { CurrentCitizenContext } from './CurrentCitizen';
import styles from './GameShell.module.css';
import { messages } from './messages';

/** Renders its children only for a signed-in player with a citizen; sends everyone else on. */
export function CitizenOnly({ children }: { children: ReactNode }) {
  const copy = useMessages(messages);
  const auth = useAuth();
  const citizen = useCitizen();
  // An account without a citizen may be a staff account: it belongs in the console, not in the game.
  const staff = useStaff(citizen.isSuccess && !citizen.data);
  if (auth.status === 'loading') return null;
  if (auth.status === 'signedOut') return <Navigate to="/sign-in" replace />;
  if (citizen.isPending) return null;
  if (!citizen.data && staff.isPending) return null;
  if (!citizen.data && staff.data) return <Navigate to="/admin" replace />;
  if (citizen.isError) {
    return (
      <main className={styles.problem}>
        <p role="alert">{copy.loadFailed}</p>
      </main>
    );
  }
  if (!citizen.data) return <Navigate to="/citizen" replace />;
  return <CurrentCitizenContext value={citizen.data}>{children}</CurrentCitizenContext>;
}
