import { Steps } from '@concordia/atlas/Steps';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import styles from '../../features/auth/AuthForm.module.css';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { emailRedirectTo } from '../../features/auth/emailRedirect';
import { SignedOutOnly } from '../../features/auth/guards';
import { readRecoverEmail } from '../../features/auth/recoverEmail';
import { ResendEmail } from '../../features/auth/ResendEmail';
import { Story } from '../../features/auth/Story';
import { useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';

export function RecoverPasswordSentPage() {
  const copy = useMessages(messages);
  useDocumentTitle(copy.sentDocumentTitle);
  const [email] = useState(readRecoverEmail);

  return (
    <SignedOutOnly>
      <AuthLayout story={<Story title={copy.storyTitle}>{copy.storyBody}</Story>}>
        <div className={styles.form}>
          <Steps label={copy.steps} steps={[copy.stepEmail, copy.stepPassword]} current={0} />
          <div className={styles.heading}>
            <h1 className="at-title-1">{copy.sentTitle}</h1>
            {email ? (
              <p>
                {copy.sentIf} <span className={styles.address}>{email}</span> {copy.sentIfEnd}
              </p>
            ) : (
              <p>{copy.sentGeneric}</p>
            )}
          </div>
          {email ? (
            <ResendEmail
              send={(captchaToken) =>
                supabase.auth.resetPasswordForEmail(email, {
                  captchaToken,
                  redirectTo: emailRedirectTo(),
                })
              }
            />
          ) : null}
          <p className={styles.aside}>
            {copy.notThere} <Link to="/recover-password">{copy.fix}</Link>.
          </p>
        </div>
      </AuthLayout>
    </SignedOutOnly>
  );
}
