import { Navigate } from '@tanstack/react-router';

import { useAuth } from '../../features/auth/AuthProvider';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { messages } from '../sign-in/messages';
import { SignInForm } from '../sign-in/SignInForm';

import styles from './AdminPage.module.css';

/** `/admin/sign-in`: the staff's own entrance, apart from the game's. */
export function AdminSignInPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.staffDocumentTitle);
  const auth = useAuth();
  if (auth.status === 'loading') return null;
  if (auth.status === 'signedIn') return <Navigate to="/admin" replace />;
  return (
    <main className={styles.signIn}>
      <SignInForm audience="staff" />
    </main>
  );
}
