import { AuthLayout } from '../../features/auth/AuthLayout';
import { SignedOutOnly } from '../../features/auth/guards';
import { Story } from '../../features/auth/Story';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';
import { SignUpForm } from './SignUpForm';

export function SignUpPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  return (
    <SignedOutOnly>
      <AuthLayout story={<Story title={copy.storyTitle}>{copy.storyBody}</Story>}>
        <SignUpForm />
      </AuthLayout>
    </SignedOutOnly>
  );
}
