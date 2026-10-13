import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';

import { AuthLayout } from '../../features/auth/AuthLayout';
import { useAuth } from '../../features/auth/AuthProvider';
import { Story } from '../../features/auth/Story';
import { useCitizen } from '../../features/auth/useCitizen';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { CreateCitizenForm } from './CreateCitizenForm';
import { messages } from './messages';

/** Accounts created with Google choose their citizen here once. */
export function CreateCitizenPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  const auth = useAuth();
  const citizen = useCitizen();
  const [created, setCreated] = useState(false);

  if (auth.status === 'signedOut') return <Navigate to="/sign-in" replace />;
  if (auth.status === 'loading' || citizen.isPending) return null;
  if (citizen.data && !created) return <Navigate to="/" replace />;

  return (
    <AuthLayout story={<Story title={copy.storyTitle}>{copy.storyBody}</Story>}>
      <CreateCitizenForm
        email={auth.session.user.email ?? ''}
        onCreated={() => {
          setCreated(true);
        }}
      />
    </AuthLayout>
  );
}
