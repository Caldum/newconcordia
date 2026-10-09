import { buttonClassName } from '@concordia/atlas/Button';
import { Note } from '@concordia/atlas/Note';
import type { EmailOtpType } from '@supabase/auth-js';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { authProblem } from '../../features/auth/authErrors';
import type { AuthProblem } from '../../features/auth/authErrors';
import styles from '../../features/auth/AuthForm.module.css';
import { AuthLayout } from '../../features/auth/AuthLayout';
import { authMessages } from '../../features/auth/messages';
import { clearSignupDraft } from '../../features/auth/signupDraft';
import { Story } from '../../features/auth/Story';
import { defineMessages, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

/** What an email link carries: a single-use token hash and what it confirms. */
const confirmSearchSchema = z.object({
  token_hash: z.string().min(1).max(512).optional().catch(undefined),
  type: z.enum(['email', 'recovery', 'email_change']).optional().catch(undefined),
});

const messages = defineMessages({
  es: {
    documentTitle: 'Confirmando · Concordia',
    storyTitle: 'Un momento.',
    checking: 'Revisando el enlace…',
    failedTitle: 'No pudimos usar el enlace',
    signIn: 'Iniciar sesión',
    recover: 'Pedir otro enlace',
  },
  en: {
    documentTitle: 'Confirming · Concordia',
    storyTitle: 'One moment.',
    checking: 'Checking the link…',
    failedTitle: 'We could not use the link',
    signIn: 'Sign in',
    recover: 'Ask for another link',
  },
});

// A link works once. React runs effects twice in development, so each token is verified only once.
const verifiedTokens = new Map<string, Promise<{ error: unknown }>>();

function verifyOnce(tokenHash: string, type: EmailOtpType) {
  let pending = verifiedTokens.get(tokenHash);
  if (!pending) {
    pending = supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    verifiedTokens.set(tokenHash, pending);
  }
  return pending;
}

/** Where email links land: confirms the sign-up, the recovery or the new address. */
export function AuthConfirmPage() {
  const copy = useMessages(messages);
  const search = confirmSearchSchema.parse(useSearch({ strict: false }));
  const shared = useMessages(authMessages);
  useDocumentTitle(copy.documentTitle);
  const navigate = useNavigate();
  const { token_hash: tokenHash, type } = search;
  const [problem, setProblem] = useState<AuthProblem | null>(
    tokenHash && type ? null : 'linkExpired',
  );

  useEffect(() => {
    if (!tokenHash || !type) return;
    let cancelled = false;
    void verifyOnce(tokenHash, type).then(async ({ error }) => {
      if (cancelled) return;
      if (error) {
        setProblem(authProblem(error));
        return;
      }
      if (type === 'recovery') {
        await navigate({ to: '/new-password', replace: true });
        return;
      }
      clearSignupDraft();
      await navigate(
        type === 'email'
          ? { to: '/citizenship', search: { welcome: true }, replace: true }
          : { to: '/', replace: true },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [tokenHash, type, navigate]);

  return (
    <AuthLayout story={<Story title={copy.storyTitle} />}>
      {problem ? (
        <div className={styles.form}>
          <h1 className="at-title-1">{copy.failedTitle}</h1>
          <Note tone="error">{shared.problem(problem)}</Note>
          <Link
            to={type === 'recovery' ? '/recover-password' : '/sign-in'}
            className={buttonClassName({ variant: 'secondary' })}
          >
            {type === 'recovery' ? copy.recover : copy.signIn}
          </Link>
        </div>
      ) : (
        <p role="status" className="at-body-l">
          {copy.checking}
        </p>
      )}
    </AuthLayout>
  );
}
