import { buttonClassName } from '@concordia/atlas/Button';
import { useState } from 'react';

import { useMessages } from '../../i18n';
import { env } from '../../lib/env';

import { signInWithGoogle } from './api';
import { authProblem } from './authErrors';
import type { AuthProblem } from './authErrors';
import styles from './GoogleButton.module.css';
import { GoogleMark } from './GoogleMark';
import { authMessages } from './messages';

interface GoogleSignInProps {
  label?: string;
}

/** «Continuar con Google» plus the divider before the email form. Hidden until Google is set up. */
export function GoogleSignIn({ label }: GoogleSignInProps) {
  const copy = useMessages(authMessages);
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  if (!env.VITE_GOOGLE_SIGN_IN) return null;

  const signIn = async () => {
    setProblem(null);
    const { error } = await signInWithGoogle();
    if (error) setProblem(authProblem(error));
  };

  return (
    <>
      <button
        type="button"
        className={`${buttonClassName({ variant: 'secondary', size: 'large' })} ${styles.google}`}
        onClick={() => {
          void signIn();
        }}
      >
        <GoogleMark />
        {label ?? copy.google}
      </button>
      {problem ? (
        <p role="alert" className={styles.problem}>
          {copy.problem(problem)}
        </p>
      ) : null}
      <p className={styles.divider}>{copy.orWithEmail}</p>
    </>
  );
}
