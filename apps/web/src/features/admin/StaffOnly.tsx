import { Note } from '@concordia/atlas/Note';
import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useMessages } from '../../i18n';
import { useAuth } from '../auth/AuthProvider';

import styles from './AdminShell.module.css';
import { CurrentStaffContext } from './CurrentStaff';
import { consoleMessages } from './messages';
import { NotStaff } from './NotStaff';
import { useStaff } from './queries';

/** Renders the console only for a signed-in staff account; visitors go to the staff sign-in. */
export function StaffOnly({ children }: { children: ReactNode }) {
  const copy = useMessages(consoleMessages);
  const auth = useAuth();
  const staff = useStaff();
  if (auth.status === 'loading') return null;
  if (auth.status === 'signedOut') return <Navigate to="/admin/sign-in" replace />;
  if (staff.isPending) return null;
  if (staff.isError) {
    return (
      <main className={styles.alone}>
        <Note tone="error">{copy.loadFailed}</Note>
      </main>
    );
  }
  if (!staff.data) return <NotStaff />;
  return <CurrentStaffContext value={staff.data}>{children}</CurrentStaffContext>;
}
