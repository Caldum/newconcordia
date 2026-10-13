import { AuthLayout } from '../../features/auth/AuthLayout';
import { SignedOutOnly } from '../../features/auth/guards';
import { Story } from '../../features/auth/Story';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';
import { SignInForm } from './SignInForm';

export function SignInPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  return (
    <SignedOutOnly>
      <AuthLayout story={<Story title={copy.storyTitle}>{copy.storyBody}</Story>}>
        <SignInForm />
      </AuthLayout>
    </SignedOutOnly>
  );
}
