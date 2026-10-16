import { Note } from '@concordia/atlas/Note';
import { Navigate } from '@tanstack/react-router';

import { useStaff } from '../../features/admin/queries';
import { useAuth } from '../../features/auth/AuthProvider';
import { useCitizen } from '../../features/auth/useCitizen';
import { useMessages } from '../../i18n';
import { LandingPage } from '../landing/LandingPage';

import { HomePage } from './HomePage';
import { messages } from './messages';

/** `/`: the landing for visitors, the game for signed-in players. */
export function IndexPage() {
  const auth = useAuth();
  const citizen = useCitizen();
  const staff = useStaff(citizen.isSuccess && !citizen.data);
  const copy = useMessages(messages);

  if (auth.status === 'loading') return null;
  if (auth.status === 'signedOut') return <LandingPage />;
  if (citizen.isPending) return null;
  if (citizen.isError) {
    return (
      <main style={{ padding: 'var(--space-7)' }}>
        <Note tone="error">{copy.loadFailed}</Note>
      </main>
    );
  }
  if (!citizen.data) {
    // Staff accounts have no citizen: they go to the console (ADR 0049).
    if (staff.isPending) return null;
    return <Navigate to={staff.data ? '/admin' : '/citizen'} replace />;
  }
  return <HomePage citizen={citizen.data} />;
}
