import { useEffect } from 'react';

import { AuthLayout } from '../../features/auth/AuthLayout';
import { SignedOutOnly } from '../../features/auth/guards';
import { Story } from '../../features/auth/Story';
import { BetaNotice } from '../../features/moderation/BetaNotice';
import { referrerFromSearch, rememberReferrer } from '../../features/profile/referral';
import { useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';
import { SignUpForm } from './SignUpForm';

export function SignUpPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.documentTitle);
  // An invitation link (?ref=Name) is kept until the citizen exists, then recorded once (ADR 0041).
  useEffect(() => {
    const referrer = referrerFromSearch(window.location.search);
    if (referrer) rememberReferrer(referrer);
  }, []);
  return (
    <SignedOutOnly>
      <AuthLayout story={<Story title={copy.storyTitle}>{copy.storyBody}</Story>}>
        <BetaNotice />
        <SignUpForm />
      </AuthLayout>
    </SignedOutOnly>
  );
}
