import { buttonClassName } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import { Link } from '@tanstack/react-router';

import styles from '../../features/auth/AuthForm.module.css';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { useAuth } from '../../features/auth/AuthProvider';
import { Story } from '../../features/auth/Story';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';
import { NewPasswordForm } from './NewPasswordForm';

export function NewPasswordPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const auth = useAuth();

  return (
    <AuthLayout story={<Story title={copy.storyTitle}>{copy.storyBody}</Story>}>
      {auth.status === 'signedIn' ? (
        <NewPasswordForm email={auth.session.user.email ?? ''} />
      ) : auth.status === 'signedOut' ? (
        <div className={styles.form}>
          <h1 className="at-title-1">{copy.title}</h1>
          <Note tone="info">{copy.noSession}</Note>
          <Link to="/recover-password" className={buttonClassName({ variant: 'secondary' })}>
            {copy.askAgain}
          </Link>
        </div>
      ) : null}
    </AuthLayout>
  );
}
