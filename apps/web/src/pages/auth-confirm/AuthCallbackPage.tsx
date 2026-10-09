import { buttonClassName } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Link, Navigate } from '@tanstack/react-router';

import styles from '../../features/auth/AuthForm.module.css';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { useAuth } from '../../features/auth/AuthProvider';
import { Story } from '../../features/auth/Story';
import { defineMessages, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

const messages = defineMessages({
  es: {
    documentTitle: 'Entrando · Concordia',
    storyTitle: 'Un momento.',
    checking: 'Terminando de entrar con Google…',
    failedTitle: 'No pudimos entrar con Google',
    failed: 'Google no confirmó tu cuenta o cancelaste el permiso. Vuelve a intentar.',
    signIn: 'Volver a iniciar sesión',
  },
  en: {
    documentTitle: 'Signing in · Concordia',
    storyTitle: 'One moment.',
    checking: 'Finishing the Google sign-in…',
    failedTitle: 'We could not sign you in with Google',
    failed: 'Google did not confirm your account or you cancelled the permission. Try again.',
    signIn: 'Back to sign in',
  },
});

/** Google sends the player back here; the Supabase client exchanges the code on load. */
export function AuthCallbackPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const auth = useAuth();

  if (auth.status === 'signedIn') return <Navigate to="/" replace />;

  return (
    <AuthLayout story={<Story title={copy.storyTitle} />}>
      {auth.status === 'loading' ? (
        <p role="status" className="at-body-l">
          {copy.checking}
        </p>
      ) : (
        <div className={styles.form}>
          <h1 className="at-title-1">{copy.failedTitle}</h1>
          <Note tone="error">{copy.failed}</Note>
          <Link to="/sign-in" className={buttonClassName({ variant: 'secondary' })}>
            {copy.signIn}
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
